"""Exercise a saved checkpoint with clearly synthetic inputs and dry-run monitoring."""
import argparse
from datetime import date
import json
from pathlib import Path

import numpy as np
import torch

from hotspots.demo import generate_demo
from hotspots.inference import infer
from hotspots.monitor import run_monitor, send_sms
from hotspots.providers import InputError


def write_fixture(output):
    output.mkdir(parents=True, exist_ok=False)
    manifest = generate_demo()
    manifest.update({'field_id': 'windows-synthetic-integration',
                     'sensor': 'Synthetic RGB+NIR fixture; no actual sensor'})
    for observation in manifest['observations']:
        red = np.array(observation['red'], dtype=np.float32)
        nir = np.array(observation['nir'], dtype=np.float32)
        available = np.isfinite(red) & np.isfinite(nir)
        observation['valid'] = (np.array(observation['valid']) & available).tolist()
        red, nir = np.nan_to_num(red), np.nan_to_num(nir)
        image = np.stack([red, np.full_like(red, .4), np.full_like(red, .3), nir])
        filename = observation['date'] + '.npz'
        np.savez_compressed(output / filename, image=image)
        observation['model_input'] = {
            'path': filename, 'channels': ['red', 'green', 'blue', 'nir'],
            'scaling': 'unit_interval',
            'preparation': 'Invented aligned bands on the synthetic demo grid; software integration only.'}
    path = output / 'manifest.json'
    path.write_text(json.dumps(manifest, indent=2) + '\n')
    return path


def verify(args):
    torch.set_num_threads(args.threads)
    manifest = write_fixture(args.output / 'input')
    predictions = infer(manifest, args.checkpoint, args.output / 'inference')
    result = run_monitor(predictions, args.output / 'monitor', args.output / 'monitor.sqlite',
                         as_of=date(2026, 10, 3), sms_config={'mode': 'dry-run'})
    if not result['synthetic'] or result['domain_validated'] or result['pending_alerts']:
        raise RuntimeError('Synthetic/stale alert gating failed')
    if result['delivery'] != {'sent': 0, 'mode': 'dry-run'}:
        raise RuntimeError('Expected zero sent messages')
    if result['status'] != 'stale_imagery' or result['frames'][2]['coverage'] != 0:
        raise RuntimeError('Stale/cloudy observation status failed')
    try:
        send_sms(result, args.output / 'monitor.sqlite', {'mode': 'live'})
    except InputError:
        live_rejected = True
    else:
        raise RuntimeError('Unvalidated synthetic data must refuse live delivery')
    evidence = {'checkpoint': str(args.checkpoint), 'model_version': result['model_version'],
                'synthetic': True, 'domain_validated': False, 'accuracy_evaluation': False,
                'dates': len(result['frames']), 'status': result['status'],
                'cloudy_frame_coverage': result['frames'][2]['coverage'],
                'pending_alerts': len(result['pending_alerts']), 'delivery': result['delivery'],
                'live_mode_rejected_before_provider_access': live_rejected}
    (args.output / 'verification.json').write_text(json.dumps(evidence, indent=2) + '\n')
    print(json.dumps(evidence))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--checkpoint', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--threads', type=int, default=4)
    verify(parser.parse_args())
