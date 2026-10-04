"""Where everything stands on the slope. Deterministic, so the baked texture and the Blender build agree."""

import numpy as np

import terrain

BUSH_SPACING = 1.55
NEAR_ROW_LIMIT_Y = 16.0
HERO_LEVEL = 2
HERO_X = 1.6
COOPERATIVE_CENTRE = (-14.0, -15.2)
COOPERATIVE_SIZE = (9.0, 5.5)
MOTORBIKE_SPOT = (-4.6, terrain.ROAD_Y + 1.1)


def _row_y(x, level, fraction=terrain.ROW_FRACTION):
    return terrain.row_point(x, level, fraction)


def hero_bush():
    y = _row_y(HERO_X, HERO_LEVEL)
    return (HERO_X, y, float(terrain.height(HERO_X, y)))


def sack_spot():
    """Noor's jute sack, on the hero tread just uphill of the footpath."""
    hero_y = hero_bush()[1]
    x = float(terrain.path_x(hero_y)) + 1.45
    y = _row_y(x, HERO_LEVEL, 0.2)
    return (x, y, float(terrain.height(x, y)))


def _is_clear_of_path(x, y):
    return abs(x - terrain.path_x(y)) > 1.25


def _is_clear_of_hero(x, y):
    hero_x, hero_y, _ = hero_bush()
    sack_x, sack_y, _ = sack_spot()
    return np.hypot(x - hero_x, y - hero_y) > 1.2 and np.hypot(x - sack_x, y - sack_y) > 1.3


def bush_positions():
    rng = np.random.default_rng(7)
    bushes = []
    for level in range(1, 26):
        offset = rng.uniform(0, BUSH_SPACING)
        for x in np.arange(-terrain.HILL_HALF_WIDTH + 3.0 + offset, terrain.HILL_HALF_WIDTH - 3.0, BUSH_SPACING):
            jitter_x = float(x + rng.uniform(-0.18, 0.18))
            y = _row_y(jitter_x, level, terrain.ROW_FRACTION + rng.uniform(-0.05, 0.05))
            if y is None or y > terrain.EXTENT_Y[1] - 6.0:
                continue
            if terrain.hill_mask(jitter_x, y) < 0.85:
                continue
            if not (_is_clear_of_path(jitter_x, y) and _is_clear_of_hero(jitter_x, y)):
                continue
            if rng.random() < 0.035:
                continue
            bushes.append(
                {
                    "x": jitter_x,
                    "y": float(y),
                    "z": float(terrain.height(jitter_x, y)),
                    "level": level,
                    "near": bool(y < NEAR_ROW_LIMIT_Y),
                    "variant": int(rng.integers(0, 3)),
                    "rotation": float(rng.uniform(0, 2 * np.pi)),
                    "scale": float(rng.uniform(0.85, 1.12)),
                }
            )
    return bushes


def shade_trees():
    """Grevillea shade trees scattered through the coffee, as on many Kenyan farms."""
    spots = [(-23.0, 15.0), (-25.0, 30.0), (29.0, 40.0), (-24.0, 44.0)]
    trees = []
    for index, (x, y) in enumerate(spots):
        trees.append({"x": x, "y": y, "z": float(terrain.height(x, y)), "height": 13.0 + 3.0 * ((index * 7) % 5) / 4.0, "seed": index})
    return trees


def banana_plants():
    spots = [(-21.5, -11.0), (-19.0, -9.5), (-7.5, -12.0), (-24.5, -16.5), (9.0, -11.0), (11.5, -13.0)]
    return [{"x": x, "y": y, "z": float(terrain.height(x, y)), "seed": index} for index, (x, y) in enumerate(spots)]


def drying_beds():
    """Raised drying tables beside the cooperative store."""
    base_x, base_y = COOPERATIVE_CENTRE
    return [{"x": base_x + 10.0, "y": base_y + 1.6 - 1.9 * index, "length": 7.0, "width": 1.2} for index in range(3)]
