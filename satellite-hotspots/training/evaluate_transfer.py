"""Evaluate frozen checkpoints on the independent WeedsGalore test partition."""
import argparse
import json
from pathlib import Path
from types import SimpleNamespace

import numpy as np
from PIL import Image
import torch

from hotspots.model import CropModel
from training.expanded_run import file_digest
from training.report_expanded import transfer


def verify_test_images(root):
    ids = (root / 'splits/test.txt').read_text().splitlines()
    if len(ids) != 26 or len(set(ids)) != len(ids):
        raise ValueError('Expected the 26 unique official WeedsGalore test images')
    shapes, label_ids = set(), set()
    for stem in ids:
        if '/' in stem or '\\' in stem or '..' in stem:
            raise ValueError('Unsafe test image ID')
        base = root / stem[:10]
        labels = np.array(Image.open(base / 'semantics' / f'{stem}.png'))
        label_ids.update(map(int, np.unique(labels)))
        shapes.add(labels.shape)
        for band in ('R', 'G', 'B', 'NIR'):
            image = np.array(Image.open(base / 'images' / f'{stem}_{band}.png'))
            if image.dtype != np.uint16 or image.shape != labels.shape:
                raise ValueError('Expected aligned uint16 band images')
    if not label_ids.issubset(set(range(6))):
        raise ValueError('Unexpected WeedsGalore semantic IDs')
    return {'image_shapes': sorted(shapes), 'observed_label_ids': sorted(label_ids)}


def evaluate(args):
    if args.output.exists():
        raise FileExistsError('Choose a new output file to retain prior results')
    freeze = json.loads((args.checkpoint / 'test-freeze.json').read_text())
    checkpoints = {'original': args.reference, 'updated': args.checkpoint}
    expected = {'original': freeze['reference_checkpoint_sha256'], 'updated': freeze['checkpoint_sha256']}
    for name, path in checkpoints.items():
        if file_digest(path / 'model.safetensors') != expected[name]:
            raise ValueError('Checkpoint differs from the frozen Agriculture-Vision evaluation')
    thresholds = {'original': freeze['reference_thresholds']['weed_cluster'],
                  'updated': freeze['thresholds']['weed_cluster']}
    provenance = verify_test_images(args.weedsgalore)
    torch.set_num_threads(args.threads)
    models = {name: CropModel(path) for name, path in checkpoints.items()}
    result = transfer(SimpleNamespace(weedsgalore=args.weedsgalore), models, thresholds)
    result.update({'checkpoints_sha256': expected, 'input_verification': provenance,
                   'test_split_sha256': file_digest(args.weedsgalore / 'splits/test.txt'),
                   'agriculture_test_freeze_sha256': file_digest(args.checkpoint / 'test-freeze.json'),
                   'license': 'CC BY 4.0', 'target_domain_validated': False,
                   'authors_loader': 'https://github.com/GFZ/weedsgalore/blob/main/src/datasets/weedsgalore/weedsgalore.py'})
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2, allow_nan=False) + '\n')
    print(json.dumps({'test_images': result['test_images'], 'metrics': result['metrics']}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    for key in ('checkpoint', 'reference', 'weedsgalore', 'output'):
        parser.add_argument('--' + key, type=Path, required=True)
    parser.add_argument('--threads', type=int, default=4)
    evaluate(parser.parse_args())
