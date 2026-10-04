"""Report frozen-model results, repeat the mapped test, and check transfer.

No fitting, threshold adjustment, model selection or external messages.
"""
import argparse
import html
import json
import os
from pathlib import Path
import shutil

import numpy as np
from PIL import Image
from hotspots.model import CropModel, CLASSES
from hotspots.monitor import run_monitor


def save_json(path,data):path.write_text(json.dumps(data,indent=2,allow_nan=False)+'\n')


def ratio(tp,fp,fn):
    return {'iou':tp/(tp+fp+fn) if tp+fp+fn else None,
            'precision':tp/(tp+fp) if tp+fp else None,'recall':tp/(tp+fn) if tp+fn else None,
            'true_positive_pixels':int(tp),'false_positive_pixels':int(fp),'false_negative_pixels':int(fn)}


def transfer(args,models,thresholds):
    root=args.weedsgalore
    ids=(root/'splits/test.txt').read_text().splitlines()
    counts={k:np.zeros(3,dtype=np.int64) for k in models};records=[]
    for stem in ids:
        base=root/stem[:10]
        bands=[]
        for name in ['R','G','B','NIR']:
            a=np.array(Image.open(base/'images'/f'{stem}_{name}.png'))
            assert a.dtype==np.uint16
            bands.append(a.astype(np.float32)/65535.)
        labels=np.array(Image.open(base/'semantics'/f'{stem}.png'))
        # Authors' six semantic IDs: 0 background, 1 maize, >1 weed.
        truth=labels>1;image=np.stack(bands)
        record={'id':stem,'positive_pixels':int(truth.sum()),'models':{}}
        for name,model in models.items():
            score=model.predict(image)[CLASSES.index('weed_cluster')]
            prediction=score>=thresholds[name]
            tp=int((prediction&truth).sum());fp=int((prediction&~truth).sum());fn=int((~prediction&truth).sum())
            counts[name]+=np.array([tp,fp,fn]);record['models'][name]=ratio(tp,fp,fn)
        records.append(record)
    return {'dataset':'WeedsGalore official test partition','test_images':len(ids),
            'source':'https://github.com/GFZ/weedsgalore','training_use':False,
            'thresholds_frozen_from_agriculture_validation':thresholds,
            'scaling':'uint16 PNG /65535; R,G,B,NIR; author reference PNG scaling',
            'label_mapping':'WeedsGalore labels >1 versus Agriculture-Vision weed_cluster model output',
            'interpretation':'Exploratory transfer only: different sensor, scale and label semantics. Not a matched-task benchmark or coffee validation.',
            'metrics':{k:ratio(*map(int,v)) for k,v in counts.items()},'images':records}


def report(args):
    args.output.mkdir(parents=True,exist_ok=True)
    os.environ.setdefault('MPLCONFIGDIR',str(args.output/'.plot-cache'))
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    old_path=args.package/'models/agriculture-pilot';new_path=args.package/'models/agriculture-expanded'
    models={'original':CropModel(old_path),'updated':CropModel(new_path)}
    comparison=json.loads((new_path/'locked-test-comparison.json').read_text())
    summary=json.loads((new_path/'training-summary.json').read_text())
    thresholds=json.loads((new_path/'threshold-selection.json').read_text())['thresholds']
    old_thresholds=json.loads((new_path/'baseline-validation.json').read_text())['validation_selected_thresholds']
    if args.weedsgalore:
        external=transfer(args,models,{'original':old_thresholds['weed_cluster'],'updated':thresholds['weed_cluster']})
        save_json(args.output/'external-weed-transfer.json',external)
    else:external=None
    # Repeat exactly the old mapped crop, with the old threshold unchanged.
    if args.location:
        import rasterio
        with rasterio.open(args.location/'ames-rgbnir-2023-09-02.tif') as src: image=src.read().astype(np.float32)/255.
        prior=json.loads((args.location/'predictions.json').read_text())
        scores={name:model.predict(image) for name,model in models.items()}
        stats={name:[{'class':c,'maximum_score':float(s.max()),'fraction_above_0_65':float(np.mean(s>=.65))}
                     for c,s in zip(CLASSES,array)] for name,array in scores.items()}
        mapped=args.output/'ames-repeat';mapped.mkdir(exist_ok=True)
        shutil.copyfile(args.location/'ames-rgbnir-2023-09-02.tif',mapped/'ames-rgbnir-2023-09-02.tif')
        shutil.copyfile(args.location/'imagery-source.json',mapped/'imagery-source.json')
        np.savez_compressed(mapped/'model-scores.npz',**dict(zip(CLASSES,scores['updated'])))
        prior['model_version']=models['updated'].version
        prior['label']='Ames mapped field — expanded-model historical replay'
        prior['observations'][0]['scores_file']='model-scores.npz'
        prior['domain_validated']=False
        prior['preparation']['updated_model']='Expanded research checkpoint; same 2023 image and fixed 0.65 threshold; still unvalidated on NAIP.'
        save_json(mapped/'predictions.json',prior)
        result=run_monitor(mapped/'predictions.json',mapped/'monitor',mapped/'monitor-state.sqlite',
            as_of=__import__('datetime').date(2026,10,3))
        save_json(mapped/'comparison.json',{'acquisition_date':'2023-09-02','threshold':.65,'statistics':stats,
            'ground_truth_available':False,'status':result['status'],'growth_events':len(result['events']),
            'sms_alerts':len(result['pending_alerts']),'updated_model':models['updated'].version})
        fig,axes=plt.subplots(1,3,figsize=(14,5))
        rgb=image[:3].transpose(1,2,0)
        axes[0].imshow(rgb);axes[0].set_title('Actual Ames aerial image\n2 September 2023 · 30 cm')
        for ax,name in zip(axes[1:],['original','updated']):
            ax.imshow(rgb)
            for c,color in [('drydown','#e45756'),('nutrient_deficiency','#f2b134'),('weed_cluster','#9467bd')]:
                mask=scores[name][CLASSES.index(c)]>=.65
                rgba=np.zeros((*mask.shape,4))
                from matplotlib.colors import to_rgb
                rgba[mask]=[*to_rgb(color),.5]
                ax.imshow(rgba)
            ax.set_title(f'{name.capitalize()} model\nSame threshold: 0.65')
        for ax in axes:ax.axis('off')
        from matplotlib.patches import Patch
        fig.legend(handles=[Patch(color=color,label=c.replace('_',' ')) for c,color in
            [('drydown','#e45756'),('nutrient_deficiency','#f2b134'),('weed_cluster','#9467bd')]],loc='lower center',ncol=3)
        fig.suptitle('Mapped repeat test: any flags remain unconfirmed',fontsize=15)
        fig.tight_layout(rect=[0,.1,1,.93]);fig.savefig(args.output/'ames-repeat.png',dpi=150);plt.close(fig)
    # Predetermined example rule uses annotations, never prediction quality.
    ids=json.loads((args.data/'sample-manifest.json').read_text())['splits']['test']
    examples=[]
    for cls in ['drydown','water','weed_cluster']:
        index=CLASSES.index(cls)
        for stem in ids:
            with np.load(args.data/'cache/test'/f'{stem}.npz',allow_pickle=False) as data:
                if np.count_nonzero(data['labels'][index]&data['valid'])/max(1,data['valid'].sum())>=.05:
                    examples.append((cls,stem,data['image'].copy(),data['labels'][index].copy(),data['valid'].copy()));break
    fig,axes=plt.subplots(len(examples),4,figsize=(13,3.4*len(examples)),squeeze=False)
    for row,(cls,stem,im,truth,valid) in enumerate(examples):
        rgb=im[:3].transpose(1,2,0)/255.
        axes[row,0].imshow(rgb)
        masks=[truth&valid]+[(m.predict(im.astype(np.float32)/255.)[CLASSES.index(cls)]>=.5)&valid for m in models.values()]
        for ax,mask in zip(axes[row,1:],masks):ax.imshow(mask,cmap='gray',vmin=0,vmax=1)
        axes[row,0].set_ylabel(cls.replace('_',' '))
        for col,title in enumerate(['Actual aerial image','Published annotation','Original model ≥0.5','Updated model ≥0.5']):
            axes[row,col].set_title(title if row==0 else '');axes[row,col].set_xticks([]);axes[row,col].set_yticks([])
    fig.suptitle('Locked test fields — white pixels mark the selected pattern',fontsize=15)
    fig.text(.5,.01,'Examples: first seeded test tile per class with ≥5% labelled area. Chosen without examining prediction quality.',ha='center',fontsize=9)
    fig.tight_layout(rect=[0,.03,1,.96]);fig.savefig(args.output/'held-out-comparison.png',dpi=150);plt.close(fig)
    save_json(args.output/'example-selection.json',{'rule':'First seeded locked-test tile per selected class with ≥5% valid area labelled; independent of predictions.',
        'examples':[{'class':x[0],'sample_id':x[1]} for x in examples]})
    fixed=comparison['fixed_0_5'];old=fixed['original'];new=fixed['updated']
    fig,ax=plt.subplots(figsize=(11,5));x=np.arange(len(CLASSES));width=.38
    ax.bar(x-width/2,[old['classes'][c]['iou']*100 for c in CLASSES],width,label='Original 128-image pilot',color='#a7b4b0')
    ax.bar(x+width/2,[new['classes'][c]['iou']*100 for c in CLASSES],width,label='Updated 4,096-image model',color='#176944')
    ax.set_xticks(x,[c.replace('_','\n') for c in CLASSES]);ax.set_ylabel('Intersection-over-union (%)');ax.set_ylim(0,100)
    ax.set_title('Same 256 unseen fields · same score threshold 0.5');ax.legend();ax.grid(axis='y',alpha=.2)
    fig.tight_layout();fig.savefig(args.output/'class-comparison.png',dpi=150);plt.close(fig)
    rows=''.join('<tr><td>'+html.escape(c.replace('_',' '))+'</td>'+''.join(
        f'<td>{v:.1%}</td>' if v is not None else '<td>Not defined</td>' for v in
        [old['classes'][c]['iou'],new['classes'][c]['iou'],new['classes'][c]['precision'],new['classes'][c]['recall']])+'</tr>' for c in CLASSES)
    datasets=json.loads((args.output/'data-audit.json').read_text()) if (args.output/'data-audit.json').exists() else []
    extra=''
    if external:
        extra='<h2>Independent camera/field transfer check</h2><p>We tested all 26 official WeedsGalore test images after freezing the model and thresholds. The data use 16-bit multispectral drone bands and labels for individual weeds; the trained model detects weed clusters. This is a deliberately difficult, exploratory transfer test with different image scale and label meaning.</p>'
        extra+='<p>Weed-mask overlap: original '+f"{external['metrics']['original']['iou']:.1%}"+'; updated '+f"{external['metrics']['updated']['iou']:.1%}"+'. These values are not coffee disease accuracy or a matched-sensor benchmark.</p>'
    selected=comparison['validation_selected_thresholds']['updated']['mean_iou_present_classes']
    page=f'''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Expanded crop-model results</title><style>body{{font:17px system-ui;line-height:1.55;max-width:1100px;margin:auto;padding:30px;background:#f6f8f5;color:#172b25}}h1{{font-size:34px}}h2{{font-size:23px;margin-top:32px}}a{{color:#176944}}img{{width:100%;border-radius:10px}}table{{width:100%;border-collapse:collapse;background:white}}td,th{{padding:9px;text-align:left;border-bottom:1px solid #d8e0d8}}.result{{background:#e4ede4;padding:20px;border-radius:12px}}code{{font-size:14px}}small{{color:#526359}}</style>
    <h1>Expanded crop-model training results</h1><p class="result"><b>Damage-pattern overlap on the same unseen fields: {old['mean_iou_present_classes']:.1%} → {new['mean_iou_present_classes']:.1%}.</b><br>Both models used score threshold 0.5. This measures localisation of agricultural patterns, not overall accuracy or coffee disease recognition.</p>
    <h2>What changed</h2><p>Training grew from 128 to 4,096 images spanning 1,950 US fields. The existing four-band Hugging Face SegFormer weights were continued for {summary['epochs_completed']} epochs and {summary['optimizer_steps']:,} optimizer updates. We added rotations and gain variation, moderated the class weighting, combined boundary-masked classification loss with a region-overlap loss, and selected the checkpoint using foreground overlap rather than background-dominated loss.</p>
    <h2>A fairer evaluation</h2><p>192 separate fields were used for model selection and operating thresholds. Another 256 separate fields were reserved for final evaluation and excluded every field used in the original pilot’s validation. No field appears across training, validation and test. The official challenge test images have no public labels, so this locked labelled test was created from a separate part of the official validation partition. Each final-test field contributes one tile.</p>
    <img src="class-comparison.png" alt="Original and updated per-class overlap on the same 256 unseen fields"><table><tr><th>Pattern</th><th>Original overlap</th><th>Updated overlap</th><th>Updated precision</th><th>Updated recall</th></tr>{rows}</table>
    <p><b>Overlap:</b> intersection divided by the union of predicted and labelled areas. <b>Precision:</b> how much of the flagged area matches the annotation. <b>Recall:</b> how much annotated area is found. These are pixel-level measures at the model’s 256-pixel evaluation size, not farm-alert reliability.</p>
    <p>Separately, per-class thresholds selected using validation only produced {selected:.1%} mean overlap on the locked test. Those thresholds are recorded in the model folder. Scores remain uncalibrated; these operating points are not validated for satellite coffee imagery and have not been applied to live monitoring.</p>
    <h2>Examples with known annotations</h2><img src="held-out-comparison.png" alt="Actual held-out imagery, ground-truth annotation, original predictions and updated predictions"><p>Examples were selected by the fixed annotation-only rule recorded in <a href="example-selection.json">example-selection.json</a>, without selecting images for attractive predictions. Aggregate results above include every locked test image.</p>
    {extra}<h2>Repeat of the mapped Ames test</h2><img src="ames-repeat.png" alt="Same historical mapped field under original and updated model"><p>The same September 2023 image and unchanged 0.65 threshold were used. These maps have no field-confirmed damage labels. New flags, if present, cannot be called correct detections. Red: drydown; yellow: nutrient deficiency; purple: weed cluster. The image is stale, only one date was tested, and there were no growth alerts or SMS messages.</p><p><a href="ames-repeat/comparison.json">All eight class scores and flags</a> · <a href="ames-repeat/monitor/monitor.html">Updated checkpoint connected to the existing monitor</a></p>
    <h2>Additional data reviewed</h2><p><a href="https://huggingface.co/datasets/shi-labs/Agriculture-Vision">Agriculture-Vision</a>: additional compatible aerial anomaly labels used in training.</p><p><a href="https://github.com/GFZ/weedsgalore">WeedsGalore</a>: 156 multispectral aerial image sets, downloaded and inspected; its 26 test images used for independent exploratory transfer, not fitting.</p><p><a href="https://huggingface.co/datasets/Project-AgML/coffee_rust_multispec_classification">Coffee rust multispectral dataset</a>: 1,120 individual-leaf images, downloaded and inspected; 273 healthy and 847 rust-labelled. Kept separate because leaf close-ups cannot supply overhead disease labels, and its 8-bit/16-bit spectral scaling needs validation.</p><p><a href="https://huggingface.co/datasets/osmarluiz/coffee-segmentation-dataset">Coffee plantation satellite dataset</a>: 2,400 Sentinel-1 tiles labelled coffee/eucalyptus/background. Useful for locating coffee plantations, not disease labels; catalog reviewed, 63.6 GB imagery not downloaded.</p><p><a href="https://zenodo.org/records/7383601">Tomiño Botrytis benchmark</a>: published mapped disease points and raw drone imagery. Our earlier download contains 94 disease points. Raw bands still require alignment/calibration and grape disease is not coffee validation.</p>
    <p><a href="https://zenodo.org/records/20501979">Finca Irlanda coffee rust monitoring, 2013–2025</a>: 65,920 dated plant records downloaded and inspected; 128 nonmissing quadrat identifiers, rust counts, leaf counts and plant status. We found 57,092 records with nonmissing, positive leaf counts and internally consistent rust counts, spread over 103 distinct month/year observations. This offers real coffee disease progression supervision. It is monthly field data, not imagery; the CSV lacks quadrat coordinates and paired overhead acquisitions, so it was not used to label image pixels. Matching locations/dates and accounting for missing observations, replanting and shade are necessary before image-model training.</p>
    <h2>What this supports</h2><p>This is a stronger research detector for the eight Agriculture-Vision aerial patterns. It still has no coffee disease or pest-species labels, no target-satellite validation, and no demonstrated disease progression. Real farmer warnings require appropriate overhead coffee imagery with field diagnoses, repeated registered dates and a measured false-alert rate. Model switching changes predicted areas; do not compare old-model and new-model dates as evidence of spread.</p>
    <p><a href="locked-test-comparison.json">Full locked-test results</a> · <a href="training-summary.json">Training record</a> · <a href="data-audit.json">Data suitability and provenance</a> · <a href="external-weed-transfer.json">Independent transfer results</a></p><small>Research checkpoint; NVIDIA research/evaluation terms and Agriculture-Vision terms retained. No SMS sending, daily acquisition, live satellite connection or scheduler installation occurred. Report generated after model selection and threshold freezing.</small></html>'''
    (args.output/'report.html').write_text(page)
    for name in ['locked-test-comparison.json','training-summary.json','threshold-selection.json']:
        shutil.copyfile(new_path/name,args.output/name)
    print(json.dumps({'original_locked_test_iou':old['mean_iou_present_classes'],
        'updated_locked_test_iou':new['mean_iou_present_classes'],'report':str(args.output/'report.html'),
        'external_transfer':external['metrics'] if external else None},indent=2))


if __name__=='__main__':
    p=argparse.ArgumentParser()
    for key in ['package','data','output']:p.add_argument('--'+key,type=Path,required=True)
    p.add_argument('--location',type=Path);p.add_argument('--weedsgalore',type=Path)
    report(p.parse_args())
