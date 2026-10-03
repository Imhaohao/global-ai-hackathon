import json
from pathlib import Path
import torch
import timm
from PIL import Image
from safetensors.torch import load_file
from torchvision import transforms

ROOT = Path(__file__).resolve().parent
LABELS = [
    "cercospora",
    "healthy",
    "miner",
    "phoma",
    "rust",
    "red_spider_mite",
    "weevil_damage",
    "unsupported",
]
SOURCE_TO_APP = {
    "Cerscospora": "cercospora",
    "Healthy": "healthy",
    "Leaf_rust": "rust",
    "Miner": "miner",
    "Phoma": "phoma",
}
SEED = 42


def initialize_runtime():
    torch.manual_seed(SEED)
    torch.set_num_threads(8)
    torch.set_num_interop_threads(1)


def load_model(checkpoint=None):
    config = json.loads((ROOT / "models/huyt/config.json").read_text())
    model = timm.create_model(
        config["architecture"], pretrained=False, num_classes=len(LABELS)
    )
    if checkpoint:
        model.load_state_dict(load_file(str(checkpoint)), strict=True)
        return model
    state = load_file(str(ROOT / "models/huyt/model.safetensors"))
    old_weight, old_bias = state.pop("classifier.weight"), state.pop("classifier.bias")
    incompatible = model.load_state_dict(state, strict=False)
    if (
        set(incompatible.missing_keys) != {"classifier.weight", "classifier.bias"}
        or incompatible.unexpected_keys
    ):
        raise ValueError(f"Unexpected pretrained model keys: {incompatible}")
    with torch.no_grad():
        for index, name in enumerate(config["label_names"]):
            new_index = LABELS.index(SOURCE_TO_APP[name])
            model.classifier.weight[new_index].copy_(old_weight[index])
            model.classifier.bias[new_index].copy_(old_bias[index])
        model.classifier.bias[5:].fill_(-6)
    return model


def image_transform(augment=False):
    cfg = json.loads((ROOT / "models/huyt/config.json").read_text())["pretrained_cfg"]
    operations = [
        transforms.Resize(
            int(224 / cfg["crop_pct"]),
            interpolation=transforms.InterpolationMode.BICUBIC,
        ),
        transforms.CenterCrop(224),
    ]
    if augment:
        operations += [
            transforms.RandomHorizontalFlip(),
            transforms.RandomVerticalFlip(),
            transforms.ColorJitter(0.15, 0.15, 0.15, 0.03),
        ]
    return transforms.Compose(
        operations
        + [transforms.ToTensor(), transforms.Normalize(cfg["mean"], cfg["std"])]
    )


class LeafDataset(torch.utils.data.Dataset):
    def __init__(self, records, augment=False):
        self.records = records
        self.transform = image_transform(augment)

    def __len__(self):
        return len(self.records)

    def __getitem__(self, index):
        record = self.records[index]
        with Image.open(ROOT / record["path"]) as image:
            tensor = self.transform(image.convert("RGB"))
        return tensor, LABELS.index(record["label"])


def read_records():
    return json.loads((ROOT / "data/manifest.json").read_text())["images"]
