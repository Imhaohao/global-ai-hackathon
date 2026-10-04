"""Connect optional model inference to the original prepared-data skeleton."""
import json
from pathlib import Path
from .engine import analyze
from .providers import InputError, LocalJSONImporter
from .report import write_report


def infer(manifest_path, checkpoint, output):
    import numpy as np
    from .model import CropModel, CLASSES
    path=Path(manifest_path); output=Path(output); output.mkdir(parents=True,exist_ok=True)
    manifest=LocalJSONImporter().load(path)
    if not isinstance(manifest.get('field_id'),str) or not manifest['field_id']:
        raise InputError('Model inference needs a stable field_id')
    if not isinstance(manifest.get('sensor'),str) or not manifest['sensor']:
        raise InputError('Record actual sensor and product')
    model=CropModel(checkpoint); observations=[]
    rows,cols=manifest['grid']['rows'],manifest['grid']['cols']
    for obs in manifest['observations']:
        record=obs.get('model_input')
        if not isinstance(record,dict) or record.get('channels')!=['red','green','blue','nir']:
            raise InputError('Supply model_input NPZ with channels red,green,blue,nir')
        if not record.get('preparation') or record.get('scaling')!='unit_interval':
            raise InputError('Record model-input alignment and unit_interval scaling')
        source=(path.parent/record['path']).resolve()
        if not source.is_relative_to(path.parent.resolve()): raise InputError('Model input must stay inside manifest directory')
        with np.load(source,allow_pickle=False) as arrays:
            image=arrays['image']
        if image.shape!=(4,rows,cols): raise InputError('Model input must match the observation grid')
        valid=np.array(obs['valid']) & ~np.array(obs['cloud']) & ~np.array(obs['shadow'])
        if not np.isfinite(image[:,valid]).all(): raise InputError('Invalid values in usable image pixels')
        image=np.nan_to_num(image.copy(),nan=0.0,posinf=0.0,neginf=0.0)
        # Masked values must not contribute arbitrary padding to model predictions.
        image[:,~valid]=0
        scores=model.predict(image)
        filename=f"scores-{obs['date']}.npz"
        np.savez_compressed(output/filename,**{name:scores[i] for i,name in enumerate(CLASSES)})
        observations.append({'date':obs['date'],'grid':manifest['grid'],'source':obs['source'],
                             'valid':valid.tolist(),'scores_file':filename})
    predictions={'schema_version':1,'field_id':manifest['field_id'],'label':manifest['label'],
                 'sensor':manifest['sensor'],'grid':manifest['grid'],'target_mask':manifest['target_mask'],
                 'synthetic':manifest['synthetic'],'model_version':model.version,'classes':CLASSES,
                 # No target-domain validation has been performed for the pilot checkpoint.
                 'domain_validated':False,'preparation':manifest.get('preparation'),
                 'observations':observations}
    prediction_path=output/'predictions.json'
    prediction_path.write_text(json.dumps(predictions,indent=2)+'\n')
    # Retain the original spectral-change view alongside the learned anomaly view.
    write_report(analyze(manifest),output/'ndvi')
    return prediction_path
