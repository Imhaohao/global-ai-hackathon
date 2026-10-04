"""Checks for evaluation arithmetic and field leakage in expanded training."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

AVAILABLE=all(importlib.util.find_spec(x) for x in ('torch','transformers','numpy','PIL'))


@unittest.skipUnless(AVAILABLE,'Optional training dependencies unavailable')
class ExpandedTrainingTests(unittest.TestCase):
    def test_all_evaluation_fields_are_separate_and_pilot_validation_is_excluded(self):
        from training.prepare_expanded import select
        inventory={'splits':{'train':[f't{i}_0' for i in range(4)],
                             'val':[f'v{i}_0' for i in range(10)]}}
        pilot={'splits':{'val':['v0_0','v1_0']}}
        s=select(inventory,pilot,4,2,3)
        fields={k:{x.split('_')[0] for x in v} for k,v in s.items()}
        self.assertFalse(fields['train']&fields['val'])
        self.assertFalse(fields['train']&fields['test'])
        self.assertFalse(fields['val']&fields['test'])
        self.assertFalse(fields['test']&{'v0','v1'})
        self.assertEqual({k:len(v) for k,v in s.items()},{'train':4,'val':2,'test':3})
        inventory['splits']['train'].reverse();inventory['splits']['val'].reverse()
        self.assertEqual(s,select(inventory,pilot,4,2,3))

    def test_round_robin_limits_dominance_by_large_fields(self):
        from training.prepare_expanded import select
        inventory={'splits':{'train':['large_0','large_1','large_2','small_0'],
                             'val':['v0_0','v1_0','v2_0']}}
        s=select(inventory,{'splits':{'val':[]}},2,1,1)
        self.assertEqual({x.split('_')[0] for x in s['train']},{'large','small'})

    def test_metrics_use_foreground_and_ignore_unsupported_classes(self):
        import numpy as np
        from training.train_expanded import metrics_at
        from hotspots.model import CLASSES
        h={'positive':np.zeros((8,256),dtype=np.int64),'negative':np.zeros((8,256),dtype=np.int64)}
        h['positive'][0,128]=2;h['positive'][0,100]=3;h['negative'][0,200]=1;h['negative'][0,0]=1000
        m=metrics_at(h,.5);c=m['classes'][CLASSES[0]]
        self.assertAlmostEqual(c['iou'],2/6)
        self.assertAlmostEqual(c['precision'],2/3)
        self.assertAlmostEqual(c['recall'],2/5)
        self.assertAlmostEqual(m['mean_iou_present_classes'],2/6)

    def test_threshold_selection_uses_only_the_supplied_validation_histogram(self):
        import numpy as np
        from training.train_expanded import select_thresholds,metrics_at
        h={'positive':np.zeros((8,256),dtype=np.int64),'negative':np.zeros((8,256),dtype=np.int64)}
        h['positive'][0,180]=10;h['negative'][0,120]=10
        selected,_=select_thresholds(h)
        self.assertEqual(metrics_at(h,selected)['classes']['drydown']['iou'],1)
        self.assertEqual(selected['water'],.5)

    def test_cache_loader_preserves_overlapping_labels_and_validity(self):
        import numpy as np
        from training.train_expanded import CachedSamples
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);(root/'cache/val').mkdir(parents=True)
            (root/'sample-manifest.json').write_text(json.dumps({'splits':{'val':['field_0']}}))
            image=np.full((4,8,8),128,dtype=np.uint8);y=np.zeros((8,8,8),dtype=bool)
            y[0,3,3]=y[3,3,3]=True;m=np.ones((8,8),dtype=bool);m[0,0]=False
            np.savez(root/'cache/val/field_0.npz',image=image,labels=y,valid=m)
            x,labels,mask=CachedSamples(root,'val')[0]
            self.assertEqual(tuple(x.shape),(4,8,8))
            self.assertEqual(labels[0,3,3].item(),1)
            self.assertEqual(labels[3,3,3].item(),1)
            self.assertEqual(mask[0,0,0].item(),0)


if __name__=='__main__':unittest.main()
