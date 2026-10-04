"""Extract a bounded, field-separated pilot from the official HF tar archive."""
import argparse
import hashlib
import json
import tarfile
from pathlib import Path, PurePosixPath

LABELS = ['drydown', 'nutrient_deficiency', 'water', 'weed_cluster',
          'double_plant', 'endrow', 'planter_skip', 'waterway']


def prepare(archive, output, train_count=128, val_count=64):
    output.mkdir(parents=True, exist_ok=True)
    selected = {'train': [], 'val': []}
    fields = {'train': set(), 'val': set()}
    limits = {'train': train_count, 'val': val_count}
    # Never use extractall: archive paths cannot write outside the sample directory.
    with tarfile.open(archive, 'r|gz') as tar:
        for member in tar:
            parts = PurePosixPath(member.name).parts
            if not member.isfile() or len(parts) < 4 or parts[1] not in selected:
                continue
            split, stem = parts[1], PurePosixPath(parts[-1]).stem
            field = stem.split('_')[0]
            if parts[2] == 'masks' and stem not in selected[split]:
                if len(selected[split]) < limits[split] and field not in fields[split]:
                    selected[split].append(stem)
                    fields[split].add(field)
                    if len(selected[split]) % 32 == 0:
                        print(f'{split}: selected {len(selected[split])} distinct fields', flush=True)
            if stem not in selected[split]:
                continue
            relative = PurePosixPath(*parts[1:])
            if any(p in ('..', '.') for p in relative.parts):
                raise ValueError('Unsafe archive path')
            dest = output.joinpath(*relative.parts)
            dest.parent.mkdir(parents=True, exist_ok=True)
            with tar.extractfile(member) as source:
                dest.write_bytes(source.read())
    overlap = fields['train'] & fields['val']
    if overlap:
        raise ValueError('Train and validation share fields; refuse leakage')
    for split, ids in selected.items():
        if len(ids) != limits[split]:
            raise ValueError(f'Only found {len(ids)} distinct {split} fields')
        for stem in ids:
            required = [f'images/rgb/{stem}.jpg', f'images/nir/{stem}.jpg',
                        f'masks/{stem}.png', f'boundaries/{stem}.png']
            required += [f'labels/{label}/{stem}.png' for label in LABELS]
            missing = [p for p in required if not (output / split / p).exists()]
            if missing:
                raise ValueError(f'Incomplete sample {stem}: {missing}')
    manifest = {'dataset': 'shi-labs/Agriculture-Vision',
                'url': 'https://huggingface.co/datasets/shi-labs/Agriculture-Vision',
                'archive_bytes': archive.stat().st_size,
                'selection': 'first distinct field IDs encountered per official split; one tile per field',
                'purpose': 'integration pilot, not representative coffee/satellite validation',
                'classes': LABELS, 'splits': selected,
                'train_val_field_overlap': 0}
    (output / 'sample-manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')
    print(json.dumps({k: len(v) for k, v in selected.items()}), flush=True)


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('archive', type=Path)
    p.add_argument('--output', required=True, type=Path)
    p.add_argument('--train-count', type=int, default=128)
    p.add_argument('--val-count', type=int, default=64)
    a = p.parse_args()
    prepare(a.archive, a.output, a.train_count, a.val_count)
