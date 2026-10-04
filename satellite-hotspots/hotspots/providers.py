"""Local, prepared-data import boundary; deliberately no provider API calls."""

import json
import math
from datetime import date
from pathlib import Path
from typing import Protocol


class InputError(ValueError):
    """An input must be corrected before analysis can run."""


class ObservationImporter(Protocol):
    def load(self, manifest_path: Path) -> dict:
        """Return a validated manifest with embedded aligned observations."""


def finite_number(value):
    return type(value) in (int, float) and math.isfinite(value)


def read_json(path):
    try:
        # Reject NaN/Infinity instead of silently emitting non-standard JSON.
        return json.loads(Path(path).read_text(encoding="utf-8"),
                          parse_constant=lambda s: (_ for _ in ()).throw(ValueError(s)))
    except (OSError, ValueError) as exc:
        raise InputError(f"Cannot read JSON {path}: {exc}") from exc


def matrix(value, rows, cols, name, kind):
    if not isinstance(value, list) or len(value) != rows:
        raise InputError(f"{name}: expected {rows} rows on the declared grid.")
    for row in value:
        if not isinstance(row, list) or len(row) != cols:
            raise InputError(f"{name}: each row must have {cols} cells; do not resample here.")
        for cell in row:
            if kind == "bool" and type(cell) is not bool:
                raise InputError(f"{name}: masks must contain JSON true/false values.")
            if kind == "band" and cell is not None and (
                    not finite_number(cell) or not 0 <= cell <= 1):
                raise InputError(f"{name}: use reflectance in [0,1] or null, not raw digital numbers.")


def validate_grid(grid):
    if not isinstance(grid, dict):
        raise InputError("grid is required on the manifest and every observation.")
    required = ("rows", "cols", "crs", "units", "transform", "extent",
                "native_spectral_resolution")
    if any(key not in grid for key in required):
        raise InputError("Grid metadata missing: supply rows, cols, CRS, units, transform, "
                         "extent and native_spectral_resolution; see docs/IMPORT_CONTRACT.md.")
    rows, cols = grid["rows"], grid["cols"]
    if type(rows) is not int or type(cols) is not int or not (1 <= rows <= 512 and 1 <= cols <= 512):
        raise InputError("Grid dimensions must be integers from 1 to 512; crop offline first.")
    if not isinstance(grid["crs"], str) or not grid["crs"].strip():
        raise InputError("Supply the actual CRS, or DEMO_LOCAL for synthetic observations.")
    if grid["units"] not in ("metres", "degrees", "demo_units"):
        raise InputError("grid.units must be metres, degrees, or demo_units.")
    for key, size in (("transform", 6), ("extent", 4), ("native_spectral_resolution", 2)):
        values = grid[key]
        if not isinstance(values, list) or len(values) != size or not all(map(finite_number, values)):
            raise InputError(f"grid.{key} must be a list of {size} finite numbers.")
    a, b, x, d, e, y = grid["transform"]
    if a <= 0 or e >= 0 or b != 0 or d != 0:
        raise InputError("Only north-up, unrotated grids are supported. Prepare alignment offline.")
    expected = [x, y + rows * e, x + cols * a, y]
    if any(not math.isclose(actual, wanted, rel_tol=1e-9, abs_tol=1e-9)
           for actual, wanted in zip(grid["extent"], expected)):
        raise InputError("Grid extent disagrees with transform and dimensions; correct metadata.")
    native = grid["native_spectral_resolution"]
    if native[0] <= 0 or native[1] <= 0 or not (
            math.isclose(native[0], a) and math.isclose(native[1], -e)):
        raise InputError("Use the native red/NIR grid. Upsampled or pansharpened grids are rejected.")


def validate_config(config):
    if not isinstance(config, dict):
        raise InputError("config is required; copy the illustrative demo config and review it.")
    drop = config.get("ndvi_drop_threshold")
    if not finite_number(drop) or not 0 < drop <= 2:
        raise InputError("ndvi_drop_threshold must be positive and at most 2.")
    for key in ("min_valid_observations", "min_zone_cells"):
        if type(config.get(key)) is not int or config[key] < (2 if key == "min_valid_observations" else 1):
            raise InputError(f"{key} must be an integer >= {'2' if key == 'min_valid_observations' else '1'}.")
    eps = config.get("denominator_epsilon")
    if not finite_number(eps) or not 0 < eps <= 0.01:
        raise InputError("denominator_epsilon must be positive and <= 0.01.")


def validate_observation(obs, grid, synthetic):
    rows, cols = grid["rows"], grid["cols"]
    if not isinstance(obs, dict):
        raise InputError("Each observation must be an object.")
    validate_grid(obs.get("grid"))
    if obs["grid"] != grid:
        raise InputError("Observation grids differ in CRS, extent, resolution or metadata. "
                         "Align externally at native spectral resolution before importing.")
    try:
        parsed = date.fromisoformat(obs["date"])
        if parsed.isoformat() != obs["date"]:
            raise ValueError("Use YYYY-MM-DD.")
    except (ValueError, TypeError, KeyError) as exc:
        raise InputError("Each observation needs an acquisition date in YYYY-MM-DD format.") from exc
    if obs.get("synthetic") is not synthetic:
        raise InputError("Observation synthetic labels must match the manifest.")
    if not isinstance(obs.get("source"), str) or not obs["source"].strip():
        raise InputError("Each observation needs a source/product provenance label.")
    for band in ("red", "nir"):
        matrix(obs.get(band), rows, cols, band, "band")
    for mask in ("valid", "cloud", "shadow"):
        matrix(obs.get(mask), rows, cols, mask, "bool")
    return obs["date"]


def validate_manifest(data):
    if not isinstance(data, dict) or type(data.get("schema_version")) is not int or data["schema_version"] != 1:
        raise InputError("Use manifest schema_version 1; see docs/IMPORT_CONTRACT.md.")
    if type(data.get("synthetic")) is not bool:
        raise InputError("Declare synthetic as true or false explicitly.")
    if not isinstance(data.get("label"), str) or not data["label"].strip():
        raise InputError("A field/report label is required.")
    grid = data.get("grid")
    validate_grid(grid)
    if not data["synthetic"] and (grid["crs"] == "DEMO_LOCAL" or grid["units"] == "demo_units"):
        raise InputError("Real inputs require actual CRS and units, not demo coordinates.")
    rows, cols = grid["rows"], grid["cols"]
    matrix(data.get("target_mask"), rows, cols, "target_mask (coffee/inspection area)", "bool")
    if not any(any(row) for row in data["target_mask"]):
        raise InputError("target_mask selects no inspection cells; supply the coffee area.")
    validate_config(data.get("config"))
    observations = data.get("observations")
    if not isinstance(observations, list) or not observations:
        raise InputError("Supply at least one dated observation, including the baseline.")
    dates = []
    for obs in observations:
        dates.append(validate_observation(obs, grid, data["synthetic"]))
    if dates != sorted(dates) or len(dates) != len(set(dates)):
        raise InputError("Observation dates must be unique and sorted oldest first.")
    if data.get("baseline_date") != dates[0]:
        raise InputError("baseline_date must name the first observation; no baseline is inferred.")
    if not data["synthetic"]:
        prep = data.get("preparation")
        if not isinstance(prep, dict) or any(not isinstance(prep.get(k), str) or not prep[k].strip()
                                            for k in ("alignment", "reflectance_harmonization", "mask_method")):
            raise InputError("Real inputs need preparation notes for alignment, "
                             "reflectance_harmonization and mask_method. These are externally verified, "
                             "not performed or certified by this prototype.")
    return data


class LocalJSONImporter:
    """Loads already prepared, embedded arrays; no GeoTIFF reading or registration."""

    def load(self, manifest_path):
        return validate_manifest(read_json(manifest_path))


class CommercialArchiveImporter:
    """Explicit boundary for a future, separately authorized archive adapter."""

    def __init__(self, provider):
        self.provider = provider

    def load(self, manifest_path):
        raise InputError(f"{self.provider}: archive connectivity is not implemented. "
                         "Prepare authorized red/NIR data and masks offline, then use LocalJSONImporter.")
