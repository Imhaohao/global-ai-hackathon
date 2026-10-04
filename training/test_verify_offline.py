from PIL import Image

from training.verify_offline import (
    evidence_signature,
    preprocess_photo,
    quality_features,
)


def test_evidence_signature_is_bound_to_all_inputs():
    first = evidence_signature("artifact", "config", "photo")
    assert first == evidence_signature("artifact", "config", "photo")
    assert first != evidence_signature("other", "config", "photo")
    assert first != evidence_signature("artifact", "other", "photo")
    assert first != evidence_signature("artifact", "config", "other")


def test_preprocess_photo_returns_raw_rgb_contract(tmp_path):
    path = tmp_path / "fixture.jpg"
    Image.new("RGB", (400, 200), (20, 100, 220)).save(path)
    tensor = preprocess_photo(path, 0.875)
    assert tensor.shape == (1, 224, 224, 3)
    assert tensor.dtype.name == "float32"
    assert tensor.min() >= 0
    assert tensor.max() <= 255


def test_quality_features_distinguishes_flat_and_textured_inputs():
    import numpy as np

    flat = np.full((224, 224, 3), 128, dtype=np.float32)
    textured = np.indices((224, 224)).sum(axis=0) % 2
    textured = np.repeat((textured * 180 + 40)[..., None], 3, axis=2).astype(np.float32)
    flat_edge, flat_light = quality_features(flat)
    textured_edge, textured_light = quality_features(textured)
    assert flat_edge == 0
    assert flat_light == 128
    assert textured_edge > flat_edge
    assert textured_light > flat_light
