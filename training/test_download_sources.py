import zipfile

import pytest

from training.download_sources import extract_bracol


@pytest.mark.parametrize("separator", ["/", "\\"])
def test_bracol_extracts_dataset_with_both_archive_path_styles(tmp_path, separator):
    archive = tmp_path / "source.zip"
    with zipfile.ZipFile(archive, "w") as bundle:
        bundle.writestr(
            separator.join(
                ["revision", "classification", "dataset", "dataset-full.csv"]
            ),
            "id\n1\n",
        )
        bundle.writestr(
            separator.join(["revision", "classification", "dataset", "leaf", "1.jpg"]),
            b"photo",
        )
        bundle.writestr("revision/unrelated.py", "ignored")
    destination = tmp_path / "extracted"
    extract_bracol(archive, destination)
    assert (
        destination / "classification/dataset/dataset-full.csv"
    ).read_text() == "id\n1\n"
    assert (destination / "classification/dataset/leaf/1.jpg").read_bytes() == b"photo"
    assert not (destination / "unrelated.py").exists()


def test_bracol_rejects_archive_path_traversal(tmp_path):
    archive = tmp_path / "source.zip"
    with zipfile.ZipFile(archive, "w") as bundle:
        bundle.writestr("revision/classification/dataset/../../../escape.jpg", b"photo")
    with pytest.raises(ValueError):
        extract_bracol(archive, tmp_path / "extracted")
    assert not (tmp_path / "escape.jpg").exists()
