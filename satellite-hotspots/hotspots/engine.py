"""NDVI, fixed-baseline changes, and deterministic four-neighbour zones."""

from .providers import validate_manifest


def ndvi(red, nir, valid, cloud, shadow, epsilon=1e-9):
    """Return None for masked/missing/near-zero sums; never substitute zero NDVI."""
    if not valid or cloud or shadow or red is None or nir is None:
        return None
    if red + nir <= epsilon:
        return None
    return (nir - red) / (nir + red)


def observation_ndvi(obs, config):
    return [[ndvi(obs["red"][r][c], obs["nir"][r][c], obs["valid"][r][c],
                  obs["cloud"][r][c], obs["shadow"][r][c], config["denominator_epsilon"])
             for c in range(obs["grid"]["cols"])] for r in range(obs["grid"]["rows"])]


def groups(cells):
    """Connected components, four-neighbour only. No smoothing of invalid cells."""
    remaining = set(cells)
    result = []
    while remaining:
        seed = min(remaining)
        remaining.remove(seed)
        component, queue = [seed], [seed]
        while queue:
            r, c = queue.pop()
            for neighbour in ((r-1, c), (r+1, c), (r, c-1), (r, c+1)):
                if neighbour in remaining:
                    remaining.remove(neighbour)
                    component.append(neighbour)
                    queue.append(neighbour)
        result.append(sorted(component))
    return result


def insufficient_reason(current, baseline, index, count, minimum):
    if current is None:
        return "Current observation masked, missing, or invalid bands"
    if baseline is None:
        return "Missing valid baseline"
    if index == 0:
        return "Baseline only; another observation is needed"
    if count < minimum:
        return "Too few valid dated observations"
    return None


def analyze(manifest):
    """Only past/current observations count; first acquisition is always the baseline."""
    validate_manifest(manifest)
    config, grid = manifest["config"], manifest["grid"]
    mask = manifest["target_mask"]
    target = [(r, c) for r in range(grid["rows"]) for c in range(grid["cols"]) if mask[r][c]]
    arrays = [observation_ndvi(obs, config) for obs in manifest["observations"]]
    baseline = arrays[0]
    counts = [[0]*grid["cols"] for _ in range(grid["rows"])]
    frames = []
    for index, (obs, current) in enumerate(zip(manifest["observations"], arrays)):
        status = [["outside_target"]*grid["cols"] for _ in range(grid["rows"])]
        delta = [[None]*grid["cols"] for _ in range(grid["rows"])]
        reasons = [[None]*grid["cols"] for _ in range(grid["rows"])]
        candidates = []
        valid_current = comparable = 0
        for r, c in target:
            if current[r][c] is not None:
                counts[r][c] += 1
                valid_current += 1
            reason = insufficient_reason(current[r][c], baseline[r][c], index,
                                         counts[r][c], config["min_valid_observations"])
            if reason:
                status[r][c], reasons[r][c] = "insufficient", reason
                continue
            comparable += 1
            change = current[r][c] - baseline[r][c]
            delta[r][c] = change
            if change <= -config["ndvi_drop_threshold"]:
                status[r][c] = "change"
                candidates.append((r, c))
            else:
                status[r][c] = "no_threshold_drop"
        zones, small = [], []
        for component in groups(candidates):
            if len(component) < config["min_zone_cells"]:
                small.extend(component)
                continue
            mean = sum(delta[r][c] for r, c in component)/len(component)
            zones.append({"cells": [list(cell) for cell in component], "cell_count": len(component),
                          "mean_ndvi_change": mean,
                          "bbox": [min(c for r,c in component), min(r for r,c in component),
                                   max(c for r,c in component)+1, max(r for r,c in component)+1],
                          "label": "Vegetation change—check this area"})
        # Largest mean decline first, then larger zones, then row/column order.
        zones.sort(key=lambda z: (z["mean_ndvi_change"], -z["cell_count"],
                                  z["bbox"][1], z["bbox"][0]))
        for rank, zone in enumerate(zones, 1):
            zone["rank"] = rank
            zone["id"] = f"{obs['date']}-Z{rank}"
        for r, c in small:
            status[r][c] = "small_change"
        if comparable == 0:
            overall = "insufficient_observations"
        elif candidates:
            overall = "vegetation_change"
        else:
            overall = "no_threshold_drop"
        frames.append({"date": obs["date"], "source": obs["source"], "synthetic": obs["synthetic"],
                       "overall_status": overall, "status": status, "reasons": reasons,
                       "ndvi": current, "ndvi_change": delta, "zones": zones,
                       "small_change_cells": len(small),
                       "valid_observation_counts": [row[:] for row in counts],
                       "coverage": {"target_cells": len(target), "valid_current_cells": valid_current,
                                    "comparable_cells": comparable, "insufficient_cells": len(target)-comparable,
                                    "valid_current_fraction": valid_current/len(target),
                                    "comparable_fraction": comparable/len(target)}})
    return {"schema_version": 1, "label": manifest["label"], "synthetic": manifest["synthetic"],
            "baseline_date": manifest["baseline_date"], "grid": grid, "config": config,
            "target_mask": mask, "preparation": manifest.get("preparation"),
            "method": "NDVI=(NIR-red)/(NIR+red). Fixed first-date baseline; four-neighbour grouping. "
                      "Rank by mean NDVI decline, then size. Thresholds are illustrative, unvalidated.",
            "frames": frames}
