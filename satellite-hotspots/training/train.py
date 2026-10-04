"""Multilabel segmentation: overlapping annotations remain separate binary masks."""
import argparse
import hashlib
import json
import random
import time
from pathlib import Path

import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image
from torch.utils.data import DataLoader, Dataset
from transformers import SegformerForSemanticSegmentation
from hotspots.model import CLASSES, MEAN, STD, tensor_image, device_name, enable_mps_batchnorm_workaround


class Samples(Dataset):
    def __init__(self, root, split, size=256):
        self.root, self.split, self.size = Path(root), split, size
        self.ids = json.loads((self.root/'sample-manifest.json').read_text())['splits'][split]

    def __len__(self):
        return len(self.ids)

    def __getitem__(self, index):
        stem = self.ids[index]
        base = self.root/self.split
        def load(relative):
            with Image.open(base/relative) as im:
                return np.array(im)
        rgb = load(f'images/rgb/{stem}.jpg').astype(np.float32)/255
        nir = load(f'images/nir/{stem}.jpg').astype(np.float32)/255
        if nir.ndim == 3:
            nir = nir[..., 0]
        x = tensor_image(np.concatenate([rgb.transpose(2,0,1), nir[None]], axis=0), self.size)[0]
        y = torch.from_numpy(np.stack([load(f'labels/{c}/{stem}.png') > 0 for c in CLASSES])).float()
        mask = torch.from_numpy((load(f'masks/{stem}.png') > 0) &
                                (load(f'boundaries/{stem}.png') > 0)).float()[None]
        y = F.interpolate(y[None], size=(self.size,self.size), mode='nearest')[0]
        mask = F.interpolate(mask[None], size=(self.size,self.size), mode='nearest')[0]
        if self.split == 'train' and random.random() < 0.5:
            x, y, mask = (v.flip(-1) for v in (x,y,mask))
        return x,y,mask


def evaluate(model, loader, device):
    tp,fp,fn = (np.zeros(len(CLASSES), dtype=np.float64) for _ in range(3))
    positives = np.zeros(len(CLASSES), dtype=np.float64)
    losses=[]
    model.eval()
    with torch.inference_mode():
        for x,y,mask in loader:
            x,y,mask = (v.to(device) for v in (x,y,mask))
            z = F.interpolate(model(pixel_values=x).logits, size=y.shape[-2:],mode='bilinear',align_corners=False)
            losses.append(float((F.binary_cross_entropy_with_logits(z,y,reduction='none')*mask).sum() /
                                (mask.sum()*len(CLASSES)).clamp_min(1)))
            p, truth, valid = z.sigmoid() >= 0.5, y.bool(), mask.bool()
            for store, arr in ((tp,p & truth & valid),(fp,p & ~truth & valid),(fn,~p & truth & valid),
                               (positives,truth & valid)):
                store += arr.sum((0,2,3)).cpu().numpy()
    metrics={c:{'iou':float(tp[i]/(tp[i]+fp[i]+fn[i])) if tp[i]+fp[i]+fn[i] else None,
                'precision':float(tp[i]/(tp[i]+fp[i])) if tp[i]+fp[i] else None,
                'recall':float(tp[i]/(tp[i]+fn[i])) if tp[i]+fn[i] else None,
                'positive_pixels':int(positives[i]), 'predicted_positive_pixels':int(tp[i]+fp[i])}
             for i,c in enumerate(CLASSES)}
    eligible=[v['iou'] for v in metrics.values() if v['positive_pixels'] and v['iou'] is not None]
    return {'loss':float(np.mean(losses)), 'classes':metrics,
            'mean_iou_present_classes':float(np.mean(eligible)) if eligible else None,
            'score_threshold':0.5, 'threshold_calibrated':False}


def train(args):
    random.seed(args.seed); np.random.seed(args.seed); torch.manual_seed(args.seed)
    torch.set_num_threads(4)
    device=device_name()
    output=args.output; output.mkdir(parents=True,exist_ok=True)
    trainset=Samples(args.data,'train',args.size); valset=Samples(args.data,'val',args.size)
    trainloader=DataLoader(trainset,batch_size=args.batch_size,shuffle=True,num_workers=0)
    valloader=DataLoader(valset,batch_size=args.batch_size,num_workers=0)
    model=SegformerForSemanticSegmentation.from_pretrained(
        args.base_model, num_labels=len(CLASSES), ignore_mismatched_sizes=True,
        id2label=dict(enumerate(CLASSES)), label2id={c:i for i,c in enumerate(CLASSES)})
    old=model.segformer.encoder.patch_embeddings[0].proj
    new=torch.nn.Conv2d(4,old.out_channels,old.kernel_size,old.stride,old.padding,bias=old.bias is not None)
    with torch.no_grad():
        new.weight[:,:3]=old.weight*0.75
        new.weight[:,3:]=old.weight.mean(dim=1,keepdim=True)*0.75
        if old.bias is not None: new.bias.copy_(old.bias)
    model.segformer.encoder.patch_embeddings[0].proj=new
    model.config.num_channels=4
    model.to(device)
    if device=='mps': enable_mps_batchnorm_workaround(model)
    optimizer=torch.optim.AdamW(model.parameters(),lr=args.lr)
    # Estimate class weighting using training labels only, never held-out labels.
    positive=torch.zeros(len(CLASSES)); total=0
    for _,y,m in DataLoader(trainset,batch_size=args.batch_size):
        positive+=(y*m).sum((0,2,3)); total+=float(m.sum())
    weights=((total-positive)/positive.clamp_min(1)).clamp(1,20).to(device)[None,:,None,None]
    initial=evaluate(model,valloader,device)
    print(json.dumps({'device':device,'train_tiles':len(trainset),'val_tiles':len(valset),
                      'initial':initial}),flush=True)
    best=initial['loss']; history=[]; started=time.time(); steps=0
    # Save an initial checkpoint, then replace with the best trained checkpoint.
    for epoch in range(args.epochs):
        model.train(); epoch_losses=[]
        for x,y,m in trainloader:
            x,y,m=(v.to(device) for v in (x,y,m))
            optimizer.zero_grad(set_to_none=True)
            logits=F.interpolate(model(pixel_values=x).logits,size=y.shape[-2:],mode='bilinear',align_corners=False)
            loss=((F.binary_cross_entropy_with_logits(logits,y,pos_weight=weights,reduction='none')*m).sum() /
                  (m.sum()*len(CLASSES)).clamp_min(1))
            if not torch.isfinite(loss): raise RuntimeError('Non-finite training loss')
            loss.backward(); torch.nn.utils.clip_grad_norm_(model.parameters(),1.0); optimizer.step()
            steps+=1; epoch_losses.append(float(loss.detach()))
            if steps % 8 == 0: print(f'epoch={epoch+1} step={steps} loss={epoch_losses[-1]:.4f}',flush=True)
        metrics=evaluate(model,valloader,device)
        record={'epoch':epoch+1,'training_loss':float(np.mean(epoch_losses)),'validation':metrics}
        history.append(record); print(json.dumps(record),flush=True)
        # The first trained epoch is always saved; selection criterion remains explicit.
        if epoch == 0 or metrics['loss'] < best:
            best=metrics['loss']; model.save_pretrained(output,safe_serialization=True)
            (output/'best-validation.json').write_text(json.dumps(record,indent=2)+'\n')
        (output/'history.json').write_text(json.dumps(history,indent=2)+'\n')
    digest=hashlib.sha256((output/'model.safetensors').read_bytes()).hexdigest()
    summary={'model_version':digest[:16], 'checkpoint_sha256':digest,'base_model':args.base_model,
             'base_revision':getattr(model.config,'_commit_hash',None),'classes':CLASSES,
             'channels':['red','green','blue','nir'], 'normalization':{'mean':MEAN,'std':STD},
             'input_size':args.size,'seed':args.seed,'optimizer_steps':steps,'epochs':args.epochs,
             'learning_rate':args.lr,'train_tiles':len(trainset),'validation_tiles':len(valset),
             'elapsed_seconds':time.time()-started,'initial_validation':initial,
             'best_validation':json.loads((output/'best-validation.json').read_text()),
             'training_domain':'Agriculture-Vision US aerial RGB+NIR; image values scaled /255',
             'coffee_validated':False,'satellite_validated':False,'disease_or_pest_labels':False,
             'production_ready':False,'status':'pilot research checkpoint',
             'license':'NVIDIA SegFormer research/evaluation-only; Agriculture-Vision custom terms'}
    (output/'training-summary.json').write_text(json.dumps(summary,indent=2)+'\n')
    (output/'sample-manifest.json').write_text((args.data/'sample-manifest.json').read_text())
    print('TRAINING COMPLETE '+str(output.resolve()),flush=True)


if __name__ == '__main__':
    p=argparse.ArgumentParser()
    p.add_argument('--data',required=True,type=Path); p.add_argument('--output',required=True,type=Path)
    p.add_argument('--base-model',default='nvidia/mit-b0')
    p.add_argument('--epochs',type=int,default=4); p.add_argument('--size',type=int,default=256)
    p.add_argument('--batch-size',type=int,default=4); p.add_argument('--seed',type=int,default=17)
    p.add_argument('--lr',type=float,default=0.0001)
    train(p.parse_args())
