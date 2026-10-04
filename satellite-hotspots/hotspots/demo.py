"""Deterministic synthetic reflectance. Values are invented for a labelled demo."""

from copy import deepcopy


def generate_demo():
    rows, cols = 20, 24
    grid = {"rows": rows, "cols": cols, "crs": "DEMO_LOCAL", "units": "demo_units",
            "transform": [1, 0, 0, 0, -1, 20], "extent": [0, 0, 24, 20],
            "native_spectral_resolution": [1, 1]}
    # Fictional coffee subset, with a gap/path and other farm areas outside it.
    target = [[2 <= r < 18 and 2 <= c < 21 and c != 12 for c in range(cols)] for r in range(rows)]
    observations = []
    for index, when in enumerate(("2026-06-01", "2026-06-15", "2026-06-29", "2026-07-13")):
        obs = {"date": when, "source": "DEMO: generated reflectance; no satellite image",
               "synthetic": True, "grid": deepcopy(grid)}
        for key in ("red", "nir", "valid", "cloud", "shadow"):
            obs[key] = [[None]*cols for _ in range(rows)]
        for r in range(rows):
            for c in range(cols):
                base = 0.70 + ((r*7+c*3) % 5)*0.006
                change = 0
                if 5 <= r < 9 and 5 <= c < 9:  # Patch A: stronger decline.
                    change = (0, -0.12, -0.24, -0.32)[index]
                if 12 <= r < 15 and 15 <= c < 19:  # Patch B: smaller decline.
                    change = (0, -0.03, -0.09, -0.19)[index]
                value = base + change
                obs["red"][r][c], obs["nir"][r][c] = (1-value)/2, (1+value)/2
                obs["valid"][r][c] = True
                obs["cloud"][r][c] = index == 2 or (index == 1 and 4 <= r < 10 and 4 <= c < 10)
                obs["shadow"][r][c] = index == 1 and r >= 15 and c >= 17
                if 2 <= r < 5 and 15 <= c < 18:  # Baseline absent; later clear is still insufficient.
                    if index == 0:
                        obs["red"][r][c] = obs["nir"][r][c] = None
                if 15 <= r < 18 and 3 <= c < 6:  # Never observed.
                    obs["valid"][r][c] = False
                    obs["red"][r][c] = obs["nir"][r][c] = None
                if (r,c) == (10,10):  # Sum zero is invalid, not NDVI=0.
                    obs["red"][r][c] = obs["nir"][r][c] = 0
        observations.append(obs)
    return {"schema_version": 1, "label": "Noor’s fictional coffee area",
            "synthetic": True, "baseline_date": observations[0]["date"], "grid": grid,
            "target_mask": target, "config": {"ndvi_drop_threshold": 0.15,
            "min_valid_observations": 2, "min_zone_cells": 4, "denominator_epsilon": 1e-9},
            "demo_context": "Noor is fictional, farms 2 hectares total with coffee on only part. "
                            "This schematic has no real coordinates, scale or measured area.",
            "observations": observations}
