"""Prepare a seeded, field-separated expansion from the official archive.

The labelled official validation partition is split into model-selection and
locked test fields. The official challenge test images have no public labels.
Previously inspected pilot validation fields are excluded from the locked test.
"""
import argparse
from collections import defaultdict
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import tarfile

import numpy as np
from PIL import Image
from hotspots.model import CLASSES


def rank(value, seed=20261003):
    return hashlib.sha256(f'{seed}:{value}'.encode()).hexdigest()


def select(inventory, pilot, train_count=4096, val_count=192, test_count=256):
    by_field = {}
    for split in ('train', 'val'):
        groups = defaultdict(list)
        for stem in inventory['splits'][split]:
            groups[stem.split('_')[0]].append(stem)
        by_field[split] = {f: sorted(v, key=rank) for f,v in groups.items()}
    # Round robin over fields limits dominance by large fields.
    train_fields = sorted(by_field['train'], key=rank)
    train = []
    for tile_index in range(max(map(len, by_field['train'].values()))):
        for field in train_fields:
            ids = by_field['train'][field]
            if len(ids) > tile_index: train.append(ids[tile_index])
            if len(train) == train_count: break
        if len(train) == train_count: break
    old_val_fields = {s.split('_')[0] for s in pilot['splits']['val']}
    eligible = sorted(set(by_field['val']) - old_val_fields, key=rank)
    if len(eligible) < val_count + test_count:
        raise ValueError('Not enough previously uninspected validation fields')
    # Allocation is recorded before images or labels are opened.
    test_fields = eligible[:test_count]
    val_fields = eligible[test_count:test_count+val_count]
    selected = {'train': train,
                'val': [by_field['val'][f][0] for f in val_fields],
                'test': [by_field['val'][f][0] for f in test_fields]}
    fields = {s: {x.split('_')[0] for x in ids} for s,ids in selected.items()}
    for a,b in [('train','val'),('train','test'),('val','test')]:
        if fields[a] & fields[b]: raise ValueError('Field leakage')
    if len(train) != train_count: raise ValueError('Insufficient training tiles')
    return selected


def prepare(args):
    inventory = json.loads(args.inventory.read_text())
    pilot = json.loads(args.pilot_manifest.read_text())
    selected = select(inventory, pilot, args.train_count, args.val_count, args.test_count)
    destination = {stem:split for split,ids in selected.items() for stem in ids}
    args.output.mkdir(parents=True, exist_ok=True)
    manifest = {'dataset': 'shi-labs/Agriculture-Vision',
        'url': 'https://huggingface.co/datasets/shi-labs/Agriculture-Vision',
        'seed': 20261003, 'splits': selected, 'classes': CLASSES,
        'source_partitions': {'train':'official train', 'val':'official val', 'test':'official val'},
        'selection': 'SHA256 seeded field/tile ranking; round-robin train tiles; one tile per evaluation field.',
        'test_policy': 'Locked fields exclude all prior pilot-validation fields; test labels never select checkpoint or threshold.',
        'field_counts': {s:len({x.split('_')[0] for x in ids}) for s,ids in selected.items()},
        'train_val_test_field_overlap': 0, 'cache_size': 256,
        'archive_bytes': args.archive.stat().st_size,
        'radiometry': 'Original RGB/NIR JPEG digital numbers; /255 at model input, not calibrated reflectance.',
        'coffee_validated':False, 'satellite_validated':False}
    (args.output/'sample-manifest.json').write_text(json.dumps(manifest, indent=2))
    # Existing 512px source files are retained, preserving native-resolution labels.
    with tarfile.open(args.archive, 'r|gz') as tar:
        copied=0
        for member in tar:
            parts = PurePosixPath(member.name).parts
            if not member.isfile() or len(parts)<4 or parts[1] not in ('train','val'): continue
            stem = PurePosixPath(parts[-1]).stem
            if stem not in destination: continue
            relative = PurePosixPath(*parts[2:])
            if '..' in relative.parts or relative.is_absolute(): raise ValueError('Unsafe archive path')
            # Only the eight model classes; do not silently add storm-damage labels.
            if parts[2]=='labels' and parts[3] not in CLASSES: continue
            target = args.output/destination[stem]/relative
            target.parent.mkdir(parents=True,exist_ok=True)
            with tar.extractfile(member) as f: target.write_bytes(f.read())
            copied += 1
            if copied % 10000 == 0: print('Extracted',copied,'files',flush=True)
    stats = {}
    for split, ids in selected.items():
        valid_pixels=0; positives=np.zeros(len(CLASSES),dtype=np.int64)
        positive_tiles=np.zeros(len(CLASSES),dtype=np.int64)
        cache=args.output/'cache'/split;cache.mkdir(parents=True,exist_ok=True)
        for index, stem in enumerate(ids):
            base=args.output/split
            def load(name):
                with Image.open(base/name) as image: return np.array(image)
            def resize(array, smooth=False):
                return np.array(Image.fromarray(array).resize((256,256),
                    Image.Resampling.BILINEAR if smooth else Image.Resampling.NEAREST))
            rgb=resize(load(f'images/rgb/{stem}.jpg'),True)
            nir=resize(load(f'images/nir/{stem}.jpg'),True)
            if nir.ndim==3:nir=nir[...,0]
            image=np.concatenate([rgb.transpose(2,0,1),nir[None]],axis=0)
            labels=np.stack([resize(load(f'labels/{c}/{stem}.png'))>0 for c in CLASSES])
            mask=resize(((load(f'masks/{stem}.png')>0)&(load(f'boundaries/{stem}.png')>0)).astype('uint8'))>0
            positive=(labels&mask).sum((1,2))
            positives+=positive;positive_tiles+=positive>0;valid_pixels+=int(mask.sum())
            # Uncompressed NPZ avoids repeated expensive JPEG/PNG decode during training.
            np.savez(cache/f'{stem}.npz',image=image,labels=labels,valid=mask)
            if (index+1)%512==0:print('Cached',split,index+1,flush=True)
        stats[split]={'tiles':len(ids),'valid_pixels':valid_pixels,
            'class_positive_pixels':dict(zip(CLASSES,map(int,positives))),
            'class_positive_tiles':dict(zip(CLASSES,map(int,positive_tiles)))}
    (args.output/'dataset-statistics.json').write_text(json.dumps(stats,indent=2))
    print('PREPARATION COMPLETE',json.dumps(manifest['field_counts']),flush=True)


if __name__=='__main__':
    p=argparse.ArgumentParser()
    for key in ('archive','inventory','pilot-manifest','output'):p.add_argument('--'+key,type=Path,required=True)
    p.add_argument('--train-count',type=int,default=4096)
    p.add_argument('--val-count',type=int,default=192)
    p.add_argument('--test-count',type=int,default=256)
    prepare(p.parse_args())
