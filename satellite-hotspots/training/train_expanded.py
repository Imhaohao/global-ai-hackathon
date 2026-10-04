"""Continue the pilot with more fields and a locked, field-separated test set.

Checkpoint selection and per-class operating thresholds use validation only.
Locked test labels are accessed once, after training and threshold selection.
"""
import argparse
import json
from pathlib import Path
import random

import numpy as np
import torch
import torch.nn.functional as F
from torch.utils.data import Dataset
from transformers import SegformerForSemanticSegmentation
from hotspots.model import CLASSES, MEAN, STD


class CachedSamples(Dataset):
    def __init__(self, root, split, augment=False):
        self.root=Path(root);self.split=split;self.augment=augment
        self.ids=json.loads((self.root/'sample-manifest.json').read_text())['splits'][split]

    def __len__(self): return len(self.ids)

    def __getitem__(self,index):
        with np.load(self.root/'cache'/self.split/f'{self.ids[index]}.npz',allow_pickle=False) as a:
            x=a['image'].astype(np.float32)/255.; y=a['labels'].astype(np.float32);m=a['valid'].astype(np.float32)[None]
        if self.augment:
            k=random.randrange(4);x,y,m=[np.rot90(v,k,axes=(-2,-1)).copy() for v in (x,y,m)]
            if random.random()<0.5:x,y,m=[np.flip(v,-1).copy() for v in (x,y,m)]
            if random.random()<0.5:x=np.clip(x*random.uniform(.9,1.1),0,1)
        x=(x-np.asarray(MEAN,dtype=np.float32)[:,None,None])/np.asarray(STD,dtype=np.float32)[:,None,None]
        return tuple(torch.from_numpy(v.copy()) for v in (x,y,m))


def metrics_at(histogram, thresholds):
    """Exact counts at thresholds that are multiples of 1/256.

    Histogram bins are floor(score*256), clipped to 255. Evaluated threshold
    values and the 1/256 sweep precision are explicitly recorded.
    """
    pos,neg=histogram['positive'],histogram['negative'];classes={}
    for i,c in enumerate(CLASSES):
        threshold=float(thresholds[c] if isinstance(thresholds,dict) else thresholds)
        cut=int(round(threshold*256))
        tp=int(pos[i,cut:].sum());fp=int(neg[i,cut:].sum());fn=int(pos[i,:cut].sum())
        total=int(pos[i].sum());den=tp+fp+fn
        classes[c]={'iou':tp/den if den else None,'precision':tp/(tp+fp) if tp+fp else None,
            'recall':tp/total if total else None,'f1':2*tp/(2*tp+fp+fn) if 2*tp+fp+fn else None,
            'true_positive_pixels':tp,'false_positive_pixels':fp,'false_negative_pixels':fn,
            'positive_pixels':total,'predicted_positive_pixels':tp+fp,'threshold':threshold}
    eligible=[v['iou'] for v in classes.values() if v['positive_pixels'] and v['iou'] is not None]
    return {'classes':classes,'mean_iou_present_classes':float(np.mean(eligible)) if eligible else None,
            'score_thresholds':thresholds,'probabilities_calibrated':False}


def evaluate(model,loader,device):
    histogram={'positive':np.zeros((len(CLASSES),256),dtype=np.int64),
               'negative':np.zeros((len(CLASSES),256),dtype=np.int64)}
    positive_tiles=np.zeros(len(CLASSES),dtype=np.int64);losses=[]
    model.eval()
    with torch.inference_mode():
        for x,y,m in loader:
            x,y,m=[v.to(device) for v in (x,y,m)]
            z=F.interpolate(model(pixel_values=x).logits,size=y.shape[-2:],mode='bilinear',align_corners=False)
            loss=(F.binary_cross_entropy_with_logits(z,y,reduction='none')*m).sum()/(m.sum()*len(CLASSES)).clamp_min(1)
            losses.append(float(loss))
            probs=z.sigmoid().cpu().numpy();truth=y.cpu().numpy()>0;valid=m.cpu().numpy()>0
            bins=np.minimum((probs*256).astype(np.int16),255)
            for i in range(len(CLASSES)):
                p=truth[:,i]&valid[:,0];n=~truth[:,i]&valid[:,0]
                histogram['positive'][i]+=np.bincount(bins[:,i][p],minlength=256)
                histogram['negative'][i]+=np.bincount(bins[:,i][n],minlength=256)
                positive_tiles[i]+=np.any(p,axis=(1,2)).sum()
    metrics=metrics_at(histogram,0.5)
    metrics['loss']=float(np.mean(losses));metrics['positive_tiles']=dict(zip(CLASSES,map(int,positive_tiles)))
    return metrics,histogram


def select_thresholds(histogram):
    grid=np.arange(32,225,8)/256 # 0.125..0.875; never selected on locked test.
    sweep=[metrics_at(histogram,float(t)) for t in grid]
    thresholds={}
    for c in CLASSES:
        supported=[r for r in sweep if r['classes'][c]['iou'] is not None and r['classes'][c]['positive_pixels']>0]
        thresholds[c]=max(supported,key=lambda r:(r['classes'][c]['iou'],r['classes'][c]['threshold']))['classes'][c]['threshold'] if supported else .5
    return thresholds,sweep


def save_json(path,data):path.write_text(json.dumps(data,indent=2,allow_nan=False)+'\n')


def train(args):
    from training.expanded_run import run
    return run(args)


if __name__=='__main__':
    p=argparse.ArgumentParser()
    for key in ('data','initial','output'):p.add_argument('--'+key,type=Path,required=True)
    p.add_argument('--epochs',type=int,default=12);p.add_argument('--min-epochs',type=int,default=6)
    p.add_argument('--patience',type=int,default=4);p.add_argument('--batch-size',type=int,default=8)
    p.add_argument('--lr',type=float,default=.00006);p.add_argument('--seed',type=int,default=20261003)
    p.add_argument('--metadata-source',type=Path)
    p.add_argument('--reference',type=Path)
    p.add_argument('--threads',type=int,default=4)
    train(p.parse_args())
