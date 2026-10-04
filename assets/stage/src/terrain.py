"""Terrain math shared by the texture baker (system Python) and the Blender build (Blender's Python).

Coordinates are Blender's: metres, x to the right, y uphill and away from the valley, z up.
The slope rises from a valley floor at y = VALLEY_EDGE_Y and is cut into terraces that follow its contours,
so every terrace tread is one coffee row.
"""

import numpy as np

EXTENT_X = (-46.0, 46.0)
EXTENT_Y = (-36.0, 58.0)
VALLEY_EDGE_Y = -12.0
GRADE = 0.40
TERRACE_STEP = 1.2
RISER_START = 0.78
ROAD_Y = -21.0
ROAD_HALF_WIDTH = 2.2
PATH_HALF_WIDTH = 0.75
HILL_HALF_WIDTH = 30.0
ROW_FRACTION = 0.42


def smoothstep(edge0, edge1, value):
    t = np.clip((value - edge0) / (edge1 - edge0), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def ramp(y):
    """Soft-start distance up the hill from the valley edge, in metres."""
    return 4.0 * np.log1p(np.exp((y - VALLEY_EDGE_Y) / 4.0))


def undulation(x, y):
    return (
        0.55 * np.sin(x * 0.11 + y * 0.05)
        + 0.35 * np.sin(x * 0.23 - y * 0.17 + 1.3)
        + 0.18 * np.sin(x * 0.51 + y * 0.37 + 2.1)
    )


def hill_mask(x, y):
    across = 1.0 - smoothstep(HILL_HALF_WIDTH - 6.0, HILL_HALF_WIDTH + 4.0, np.abs(x))
    up = smoothstep(VALLEY_EDGE_Y - 1.0, VALLEY_EDGE_Y + 3.0, y)
    return across * up


def path_x(y):
    """The footpath Noor walks up, winding across the terraces."""
    return 6.0 + 2.6 * np.sin(y / 7.5) + 0.8 * np.sin(y / 2.9)


def base_height(x, y):
    r = ramp(y)
    shoulder = 0.0028 * x * x * np.clip(r / 26.0, 0.0, 1.4)
    return GRADE * r - shoulder + 0.35 * undulation(x, y) * np.clip(r / 8.0, 0.0, 1.0)


def terrace_coordinate(x, y):
    """Continuous terrace index: the integer part is the terrace, the fraction runs across one tread then its riser."""
    return np.maximum(base_height(x, y), 0.0) / TERRACE_STEP


def terraced_height(x, y):
    s = terrace_coordinate(x, y)
    level = np.floor(s)
    fraction = s - level
    stepped = TERRACE_STEP * (level + smoothstep(RISER_START, 1.0, fraction))
    natural = np.maximum(base_height(x, y), 0.0)
    terraced = 0.9 * stepped + 0.1 * natural
    return terraced


def height(x, y):
    mask = hill_mask(x, y)
    natural = base_height(x, y)
    valley = 0.08 * undulation(x * 1.7, y * 1.3)
    road_cut = -0.12 * (1.0 - smoothstep(ROAD_HALF_WIDTH - 0.5, ROAD_HALF_WIDTH + 0.6, np.abs(y - ROAD_Y)))
    flank = np.maximum(natural, 0.0) * (1.0 - mask)
    return mask * terraced_height(x, y) + flank + valley + road_cut


def surface_kind(x, y):
    """Per-point weights for the baked colour map: tread, riser, valley grass, road and footpath."""
    mask = hill_mask(x, y)
    s = terrace_coordinate(x, y)
    fraction = s - np.floor(s)
    riser = smoothstep(RISER_START - 0.04, RISER_START + 0.05, fraction) * mask
    road = 1.0 - smoothstep(ROAD_HALF_WIDTH - 0.6, ROAD_HALF_WIDTH + 0.4, np.abs(y - ROAD_Y))
    on_hill = smoothstep(VALLEY_EDGE_Y - 4.0, VALLEY_EDGE_Y + 2.0, y)
    path = (1.0 - smoothstep(PATH_HALF_WIDTH - 0.2, PATH_HALF_WIDTH + 0.35, np.abs(x - path_x(y)))) * on_hill
    return {"riser": riser, "hill": mask, "road": road, "path": path, "fraction": fraction}


def row_point(x, level, fraction=ROW_FRACTION):
    """The y where terrace `level` reaches `fraction` at column x, found by bisection (the slope rises with y)."""
    target = level + fraction
    low, high = VALLEY_EDGE_Y - 2.0, EXTENT_Y[1]
    if terrace_coordinate(x, high) < target:
        return None
    for _ in range(48):
        middle = 0.5 * (low + high)
        if terrace_coordinate(x, middle) < target:
            low = middle
        else:
            high = middle
    return 0.5 * (low + high)
