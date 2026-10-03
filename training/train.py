import json
import random
from collections import defaultdict
from pathlib import Path

import numpy as np
import pyarrow.parquet as pq
import tensorflow as tf
from huggingface_hub import snapshot_download

CLASS_NAMES = ["cercospora", "healthy", "miner", "phoma", "rust"]
SOURCE_LABEL_TO_CLASS = {
    "Cerscospora": "cercospora",
    "Healthy": "healthy",
    "Miner": "miner",
    "Phoma": "phoma",
    "Leaf_rust": "rust",
}
DATASET_REPO = "Project-AgML/arabica_coffee_leaf_disease_classification"
MAX_IMAGES_PER_CLASS = 1500
VALIDATION_FRACTION = 0.2
IMAGE_SIZE = 224
BATCH_SIZE = 32
HEAD_EPOCHS = 6
FINE_TUNE_EPOCHS = 4
FINE_TUNE_LAYERS = 30
SEED = 42

TRAINING_DIR = Path(__file__).resolve().parent
RAW_DATA_DIR = TRAINING_DIR / "data"
IMAGES_DIR = RAW_DATA_DIR / "images"
OUTPUT_PATH = TRAINING_DIR.parent / "mobile" / "assets" / "model" / "coffee-leaf.tflite"


def download_parquet_files() -> list[Path]:
    snapshot_dir = snapshot_download(
        repo_id=DATASET_REPO,
        repo_type="dataset",
        local_dir=RAW_DATA_DIR / "hf",
        allow_patterns=["data/*.parquet", "README.md"],
    )
    return sorted(Path(snapshot_dir).glob("data/*.parquet"))


def read_source_label_names(parquet_file: Path) -> list[str]:
    metadata = pq.read_schema(parquet_file).metadata[b"huggingface"]
    features = json.loads(metadata)["info"]["features"]
    return features["label"]["names"]


def collect_row_locations(parquet_files: list[Path]) -> dict[str, list[tuple[Path, int, int]]]:
    locations = defaultdict(list)
    for parquet_file in parquet_files:
        label_names = read_source_label_names(parquet_file)
        labels = pq.read_table(parquet_file, columns=["label"]).column("label").to_pylist()
        for row_index, label_index in enumerate(labels):
            class_name = SOURCE_LABEL_TO_CLASS.get(label_names[label_index])
            if class_name:
                locations[class_name].append((parquet_file, row_index, label_index))
    return locations


def choose_rows(locations: dict[str, list]) -> dict[str, list]:
    generator = random.Random(SEED)
    chosen = {}
    for class_name in CLASS_NAMES:
        rows = list(locations[class_name])
        generator.shuffle(rows)
        chosen[class_name] = rows[:MAX_IMAGES_PER_CLASS]
    return chosen


def write_images(chosen: dict[str, list]) -> None:
    wanted = defaultdict(dict)
    for class_name, rows in chosen.items():
        for position, (parquet_file, row_index, _) in enumerate(rows):
            wanted[parquet_file][row_index] = (class_name, position)
    for parquet_file, row_map in wanted.items():
        image_column = pq.read_table(parquet_file, columns=["image"]).column("image").to_pylist()
        for row_index, (class_name, position) in row_map.items():
            class_dir = IMAGES_DIR / class_name
            class_dir.mkdir(parents=True, exist_ok=True)
            (class_dir / f"{position:05d}.jpg").write_bytes(image_column[row_index]["bytes"])


def prepare_images() -> None:
    if all((IMAGES_DIR / name).is_dir() for name in CLASS_NAMES):
        return
    chosen = choose_rows(collect_row_locations(download_parquet_files()))
    write_images(chosen)


def load_split(subset: str) -> tf.data.Dataset:
    return tf.keras.utils.image_dataset_from_directory(
        IMAGES_DIR,
        class_names=CLASS_NAMES,
        label_mode="int",
        image_size=(IMAGE_SIZE, IMAGE_SIZE),
        batch_size=BATCH_SIZE,
        validation_split=VALIDATION_FRACTION,
        subset=subset,
        seed=SEED,
        shuffle=True,
    )


def build_augmenter() -> tf.keras.Sequential:
    return tf.keras.Sequential(
        [
            tf.keras.layers.RandomFlip("horizontal_and_vertical"),
            tf.keras.layers.RandomRotation(0.15),
            tf.keras.layers.RandomZoom(0.15),
            tf.keras.layers.RandomBrightness(0.15, value_range=(0, 255)),
        ]
    )


def build_model() -> tuple[tf.keras.Model, tf.keras.Model]:
    backbone = tf.keras.applications.MobileNetV3Small(
        input_shape=(IMAGE_SIZE, IMAGE_SIZE, 3),
        include_top=False,
        weights="imagenet",
        pooling="avg",
        include_preprocessing=True,
    )
    backbone.trainable = False
    inputs = tf.keras.Input(shape=(IMAGE_SIZE, IMAGE_SIZE, 3), dtype=tf.float32)
    features = backbone(inputs, training=False)
    features = tf.keras.layers.Dropout(0.3)(features)
    outputs = tf.keras.layers.Dense(len(CLASS_NAMES), activation="softmax")(features)
    return tf.keras.Model(inputs, outputs), backbone


def compile_model(model: tf.keras.Model, learning_rate: float) -> None:
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )


def unfreeze_top_layers(backbone: tf.keras.Model) -> None:
    backbone.trainable = True
    for layer in backbone.layers[:-FINE_TUNE_LAYERS]:
        layer.trainable = False
    for layer in backbone.layers:
        if isinstance(layer, tf.keras.layers.BatchNormalization):
            layer.trainable = False


def train(model, backbone, train_ds, validation_ds) -> None:
    compile_model(model, 1e-3)
    model.fit(train_ds, validation_data=validation_ds, epochs=HEAD_EPOCHS)
    unfreeze_top_layers(backbone)
    compile_model(model, 1e-4)
    model.fit(train_ds, validation_data=validation_ds, epochs=FINE_TUNE_EPOCHS)


def export_float16_tflite(model: tf.keras.Model) -> None:
    converter = tf.lite.TFLiteConverter.from_keras_model(model)
    converter.optimizations = [tf.lite.Optimize.DEFAULT]
    converter.target_spec.supported_types = [tf.float16]
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_bytes(converter.convert())


def describe_tflite_io() -> tf.lite.Interpreter:
    interpreter = tf.lite.Interpreter(model_path=str(OUTPUT_PATH))
    interpreter.allocate_tensors()
    print("input:", interpreter.get_input_details()[0])
    print("output:", interpreter.get_output_details()[0])
    print(f"file size: {OUTPUT_PATH.stat().st_size / 1e6:.2f} MB")
    return interpreter


def predict_with_tflite(interpreter: tf.lite.Interpreter, image: np.ndarray) -> np.ndarray:
    interpreter.set_tensor(interpreter.get_input_details()[0]["index"], image[None].astype(np.float32))
    interpreter.invoke()
    return interpreter.get_tensor(interpreter.get_output_details()[0]["index"])[0]


def evaluate_tflite(interpreter: tf.lite.Interpreter, validation_ds: tf.data.Dataset) -> None:
    confusion = np.zeros((len(CLASS_NAMES), len(CLASS_NAMES)), dtype=int)
    for images, labels in validation_ds.unbatch():
        predicted = int(np.argmax(predict_with_tflite(interpreter, images.numpy())))
        confusion[int(labels), predicted] += 1
    print("tflite validation accuracy:", confusion.trace() / confusion.sum())
    print("confusion matrix (rows = true, columns = predicted):", CLASS_NAMES)
    print(confusion)
    print("per-class recall:", dict(zip(CLASS_NAMES, (confusion.diagonal() / confusion.sum(axis=1)).round(3))))


def print_class_counts() -> None:
    for name in CLASS_NAMES:
        print(name, len(list((IMAGES_DIR / name).glob("*.jpg"))))


def main() -> None:
    tf.keras.utils.set_random_seed(SEED)
    prepare_images()
    print_class_counts()
    train_ds = load_split("training")
    validation_ds = load_split("validation")
    augmenter = build_augmenter()
    augmented_train_ds = train_ds.map(lambda x, y: (augmenter(x, training=True), y)).prefetch(tf.data.AUTOTUNE)
    model, backbone = build_model()
    train(model, backbone, augmented_train_ds, validation_ds.prefetch(tf.data.AUTOTUNE))
    export_float16_tflite(model)
    evaluate_tflite(describe_tflite_io(), validation_ds)


if __name__ == "__main__":
    main()
