"""Sum WorldPop Kenya 2020 constrained 100 m population within 10 km of two coffee areas.

Download the raster first (34,539,612 bytes):
  curl -o ken_ppp_2020_constrained.tif https://data.worldpop.org/GIS/Population/Global_2000_2020_Constrained/2020/maxar_v1/KEN/ken_ppp_2020_constrained.tif
Run:
  uv run --no-project --with rasterio --with numpy python evals/worldpop/countPopulation.py ken_ppp_2020_constrained.tif
"""
import math
import pathlib
import sys

import numpy as np
import rasterio
from rasterio.windows import from_bounds

RASTER = pathlib.Path(sys.argv[1])
RADIUS_KM = 10.0
EARTH_RADIUS_KM = 6371.0088
POINTS = {"Ruiru": (-1.146, 36.961), "Othaya": (-0.548, 36.943)}


def haversine_km(lat1, lon1, lat2, lon2):
    lat1, lon1, lat2, lon2 = map(np.radians, (lat1, lon1, lat2, lon2))
    a = np.sin((lat2 - lat1) / 2) ** 2 + np.cos(lat1) * np.cos(lat2) * np.sin((lon2 - lon1) / 2) ** 2
    return 2 * EARTH_RADIUS_KM * np.arcsin(np.sqrt(a))


with rasterio.open(RASTER) as dataset:
    print("crs", dataset.crs, "res", dataset.res, "nodata", dataset.nodata)
    for name, (lat, lon) in POINTS.items():
        pad_lat = RADIUS_KM / 111.0 + 0.01
        pad_lon = RADIUS_KM / (111.0 * math.cos(math.radians(lat))) + 0.01
        window = from_bounds(lon - pad_lon, lat - pad_lat, lon + pad_lon, lat + pad_lat, dataset.transform)
        window = window.round_offsets().round_lengths()
        values = dataset.read(1, window=window, masked=True)
        transform = dataset.window_transform(window)
        rows, cols = np.indices(values.shape)
        xs, ys = rasterio.transform.xy(transform, rows.ravel(), cols.ravel(), offset="center")
        distances = haversine_km(lat, lon, np.array(ys), np.array(xs)).reshape(values.shape)
        inside = (distances <= RADIUS_KM) & ~np.ma.getmaskarray(values)
        total = float(values.filled(0)[inside].sum())
        print(f"{name}: {total:.0f} people within {RADIUS_KM} km ({int(inside.sum())} settled cells)")
