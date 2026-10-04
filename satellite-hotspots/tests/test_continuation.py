"""Check safe checkpoint continuation and complete offline training behavior."""
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest

AVAILABLE = all(importlib.util.find_spec(name) for name in ("torch", "transformers", "numpy"))


@unittest.skipUnless(AVAILABLE, "Optional training dependencies unavailable")
class ContinuationTests(unittest.TestCase):
    def test_rejects_existing_checkpoint_without_modifying_it(self):
        from training.expanded_run import reserve_output
        with tempfile.TemporaryDirectory() as folder:
            initial = Path(folder) / "initial"
            initial.mkdir()
            weights = initial / "model.safetensors"
            weights.write_bytes(b"unchanged")
            with self.assertRaises(ValueError):
                reserve_output(initial, initial)
            self.assertEqual(weights.read_bytes(), b"unchanged")

    def test_rejects_existing_run_and_nested_output(self):
        from training.expanded_run import reserve_output
        with tempfile.TemporaryDirectory() as folder:
            initial = Path(folder) / "initial"
            initial.mkdir()
            output = Path(folder) / "existing"
            output.mkdir()
            with self.assertRaises(FileExistsError):
                reserve_output(output, initial)
            with self.assertRaises(ValueError):
                reserve_output(initial / "nested", initial)

    def test_field_overlap_and_duplicate_samples_are_rejected(self):
        from training.expanded_run import validate_fields
        with self.assertRaises(ValueError):
            validate_fields({"splits": {"train": ["field_0"], "val": ["field_1"], "test": ["other_0"]}})
        with self.assertRaises(ValueError):
            validate_fields({"splits": {"train": ["train_0", "train_0"], "val": ["val_0"], "test": ["test_0"]}})

    def test_partial_checkpoint_needs_metadata(self):
        from training.expanded_run import checkpoint_metadata
        with tempfile.TemporaryDirectory() as folder:
            with self.assertRaisesRegex(ValueError, "metadata-source"):
                checkpoint_metadata(Path(folder))

    def test_partial_checkpoint_records_actual_initial_hash(self):
        from hotspots.model import CLASSES
        from training.expanded_run import checkpoint_metadata
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            parent, initial = root / "parent", root / "initial"
            parent.mkdir()
            initial.mkdir()
            (parent / "model.safetensors").write_bytes(b"parent")
            (initial / "model.safetensors").write_bytes(b"partial")
            metadata = {"classes": CLASSES, "channels": ["red", "green", "blue", "nir"],
                        "checkpoint_sha256": hashlib.sha256(b"parent").hexdigest()}
            source = parent / "training-summary.json"
            source.write_text(json.dumps(metadata))
            (initial / "config.json").write_text(json.dumps({
                "num_channels": 4, "id2label": {str(i): name for i, name in enumerate(CLASSES)}}))
            _, provenance = checkpoint_metadata(initial, source)
            self.assertEqual(provenance["initial_checkpoint_sha256"], hashlib.sha256(b"partial").hexdigest())
            self.assertTrue(provenance["warm_start_from_partial_checkpoint"])
            self.assertFalse(provenance["optimizer_state_restored"])
            (parent / "model.safetensors").write_bytes(b"tampered")
            with self.assertRaisesRegex(ValueError, "does not match"):
                checkpoint_metadata(initial, source)

    def test_masked_pixels_do_not_change_training_loss(self):
        import torch
        from training.expanded_run import masked_training_loss
        logits = torch.zeros((1, 8, 2, 2), requires_grad=True)
        truth = torch.zeros_like(logits)
        valid = torch.ones((1, 1, 2, 2))
        valid[:, :, 0, 0] = 0
        weights = torch.ones((1, 8, 1, 1))
        first = masked_training_loss(logits, truth, valid, weights)
        truth[:, :, 0, 0] = 1
        second = masked_training_loss(logits, truth, valid, weights)
        self.assertEqual(first.item(), second.item())
        second.backward()
        self.assertTrue(torch.all(logits.grad[:, :, 0, 0] == 0))

    def test_complete_run_writes_frozen_test_and_model_metadata(self):
        import numpy as np
        from transformers import SegformerConfig, SegformerForSemanticSegmentation
        from hotspots.model import CLASSES
        from training.expanded_run import run, file_digest
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            initial, data, output = root / "initial", root / "data", root / "output"
            config = SegformerConfig(num_channels=4, num_labels=8, depths=[1, 1, 1, 1],
                                     hidden_sizes=[8, 16, 24, 32], num_attention_heads=[1, 1, 1, 1],
                                     sr_ratios=[8, 4, 2, 1], decoder_hidden_size=16,
                                     id2label=dict(enumerate(CLASSES)),
                                     label2id={name: i for i, name in enumerate(CLASSES)})
            model = SegformerForSemanticSegmentation(config)
            model.save_pretrained(initial)
            digest = file_digest(initial / "model.safetensors")
            (initial / "training-summary.json").write_text(json.dumps({
                "classes": CLASSES, "channels": ["red", "green", "blue", "nir"],
                "checkpoint_sha256": digest, "model_version": digest[:16],
                "base_model": "synthetic-test-model", "base_revision": "synthetic",
                "license": "test fixture"}))
            manifest = {"splits": {"train": ["train0_0", "train1_0"], "val": ["val0_0"], "test": ["test0_0"]},
                        "field_counts": {"train": 2, "val": 1, "test": 1}, "test_policy": "synthetic locked fixture"}
            for split, ids in manifest["splits"].items():
                (data / "cache" / split).mkdir(parents=True)
                for name in ids:
                    labels = np.zeros((8, 64, 64), dtype=bool)
                    labels[0, 16:32, 16:32] = True
                    np.savez(data / "cache" / split / (name + ".npz"),
                             image=np.full((4, 64, 64), 128, dtype=np.uint8),
                             labels=labels, valid=np.ones((64, 64), dtype=bool))
            (data / "sample-manifest.json").write_text(json.dumps(manifest))
            (data / "dataset-statistics.json").write_text(json.dumps({
                "train": {"valid_pixels": 8192, "class_positive_pixels": {name: 512 for name in CLASSES}}}))
            args = SimpleNamespace(data=data, initial=initial, output=output, metadata_source=None,
                                   reference=None, epochs=1, min_epochs=1, patience=1, batch_size=2,
                                   lr=1e-5, seed=17, threads=2)
            run(args)
            summary = json.loads((output / "training-summary.json").read_text())
            freeze = json.loads((output / "test-freeze.json").read_text())
            self.assertFalse(summary["production_ready"])
            self.assertFalse(summary["coffee_validated"])
            self.assertEqual(summary["epochs_completed"], 1)
            self.assertEqual(freeze["checkpoint_sha256"], file_digest(output / "model.safetensors"))
            self.assertTrue((output / "latest-training-state.pt").is_file())
            self.assertEqual(file_digest(initial / "model.safetensors"), digest)


if __name__ == "__main__":
    unittest.main()
