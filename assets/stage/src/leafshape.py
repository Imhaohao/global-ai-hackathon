"""Outline of an arabica coffee leaf, shared by the texture baker and the leaf meshes so lesions land on the blade."""

import numpy as np


def _smoothstep(edge0, edge1, value):
    t = np.clip((value - edge0) / (edge1 - edge0), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def leaf_half_width(u):
    """Half-width across the blade at u (0 = stalk, 1 = drip tip), as a fraction of the texture height."""
    body = np.maximum(np.sin(np.pi * np.clip(u, 0, 1) ** 0.92), 0.0) ** 0.78
    tip = 1.0 - 0.45 * _smoothstep(0.78, 1.0, u)
    return 0.47 * body * tip
