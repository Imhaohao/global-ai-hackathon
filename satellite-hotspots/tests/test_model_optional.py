"""Optional ML contract checks; the standard-library demo does not need ML deps."""
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

AVAILABLE=all(importlib.util.find_spec(name) is not None for name in ('torch','transformers','numpy','PIL'))


@unittest.skipUnless(AVAILABLE,'Optional model-training dependencies not installed')
class ModelContractTests(unittest.TestCase):
    def test_saved_checkpoint_runs_offline_on_cpu(self):
        import numpy as np
        from hotspots.model import CropModel,CLASSES
        path=Path(__file__).resolve().parents[1]/'models/agriculture-pilot'
        if not (path/'training-summary.json').exists(): self.skipTest('No trained checkpoint supplied')
        with patch('hotspots.model.device_name',return_value='cpu'):
            model=CropModel(path)
            scores=model.predict(np.full((4,20,24),0.4,dtype=np.float32))
        self.assertEqual(scores.shape,(len(CLASSES),20,24))
        self.assertTrue(np.isfinite(scores).all())
        self.assertGreaterEqual(float(scores.min()),0)
        self.assertLessEqual(float(scores.max()),1)
        self.assertFalse(model.metadata['coffee_validated'])
        self.assertFalse(model.metadata['disease_or_pest_labels'])

    def test_model_rejects_three_channel_image(self):
        import numpy as np
        from hotspots.model import tensor_image
        with self.assertRaises(ValueError): tensor_image(np.zeros((3,20,20),dtype=np.float32))

    def test_model_rejects_nonfinite_pixels(self):
        import numpy as np
        from hotspots.model import tensor_image
        x=np.zeros((4,20,20),dtype=np.float32); x[0,0,0]=np.nan
        with self.assertRaises(ValueError): tensor_image(x)

    def test_model_rejects_unscaled_digital_numbers(self):
        import numpy as np
        from hotspots.model import tensor_image
        with self.assertRaises(ValueError): tensor_image(np.full((4,20,20),255,dtype=np.float32))

    def test_overlap_labels_and_quality_masks_survive_data_loader(self):
        import numpy as np
        from PIL import Image
        from training.train import Samples
        from hotspots.model import CLASSES
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp); stem='field_0-0-8-8'
            (root/'sample-manifest.json').write_text(json.dumps({'splits':{'val':[stem]}}))
            def save(name,array):
                path=root/'val'/name; path.parent.mkdir(parents=True,exist_ok=True)
                Image.fromarray(array).save(path)
            save(f'images/rgb/{stem}.jpg',np.full((8,8,3),100,dtype=np.uint8))
            save(f'images/nir/{stem}.jpg',np.full((8,8),120,dtype=np.uint8))
            valid=np.full((8,8),255,dtype=np.uint8); valid[0,0]=0
            save(f'masks/{stem}.png',valid)
            save(f'boundaries/{stem}.png',np.full((8,8),255,dtype=np.uint8))
            for cls in CLASSES:
                a=np.zeros((8,8),dtype=np.uint8)
                if cls in ('drydown','weed_cluster'): a[3,3]=255
                save(f'labels/{cls}/{stem}.png',a)
            x,y,mask=Samples(root,'val',size=8)[0]
            self.assertEqual(y[0,3,3].item(),1)
            self.assertEqual(y[3,3,3].item(),1)
            self.assertEqual(mask[0,0,0].item(),0)
            self.assertEqual(tuple(x.shape),(4,8,8))


if __name__=='__main__': unittest.main()
