# Prepared local input contract · schema version 1

`python3 -m hotspots analyze manifest.json --output report-folder` loads an embedded-array JSON file. It does not read GeoTIFFs, call providers, align grids or harmonize observations. `demo-output/synthetic-manifest.json` is a complete working example **of synthetic data only**; never relabel it as real satellite data.

## Manifest

- `schema_version`: integer `1`.
- `label`: human-readable inspection-area name.
- `synthetic`: explicit boolean, propagated to every observation/report. Real data uses `false`.
- `baseline_date`: `YYYY-MM-DD`, exactly the first observation date. A missing cell at that date never gets a substituted baseline.
- `grid`: metadata below, also repeated on each observation and required to be exactly equal across dates. This declares both red and NIR alignment.
- `target_mask`: `rows × cols` boolean matrix; `true` selects the coffee/inspection area. Keep non-coffee areas outside. At least one cell must be selected.
- `config`: positive `ndvi_drop_threshold` (≤2); integer `min_valid_observations` (≥2); integer `min_zone_cells` (≥1); positive `denominator_epsilon` (≤0.01). No defaults are silently inferred on imports.
- `observations`: one or more acquisitions with distinct dates, sorted oldest first.
- `preparation`: mandatory for real data, non-empty text for `alignment`, `reflectance_harmonization`, and `mask_method`. Record methods, limitations and external verification references. These notes are required provenance, **not evidence the code has solved these tasks**.

## Grid

`rows` and `cols` are integers in `[1,512]`. Use an externally prepared, north-up crop.

`crs` is the actual CRS identifier or WKT. `units` is `metres` or `degrees` for real inputs. `DEMO_LOCAL` and `demo_units` are reserved for synthetic input. The importer validates presence and equality, not whether a CRS identifier is authentic or its units are correctly declared.

`transform` is `[a, b, x_origin, d, e, y_origin]`, the affine transform of the upper-left **pixel edge**. The supported grid requires `a>0`, `e<0`, `b=d=0`; rotations are rejected. `extent` is `[xmin,ymin,xmax,ymax]`, equal to `[x_origin, y_origin+rows*e, x_origin+cols*a, y_origin]`. Cell centres are at `(col+0.5,row+0.5)` under that transform. The report displays 1-based row/column locators, not geographic coordinates.

`native_spectral_resolution` is `[x_spacing,y_spacing]` in the same declared units, for the independent red/NIR measurements. It must equal `[a,-e]`. Supply red/NIR on their native spectral grid; upsampled or pansharpened grids are rejected when declared metadata shows a different native spacing. Do not invent finer native spacing to pass validation. Band alignment/date/native-resolution claims remain the preparer's responsibility; metadata consistency cannot prove them.

## Each observation

- `date`: actual acquisition date, strict `YYYY-MM-DD`; not download or processing date. Only one prepared observation per date is supported; same-day compositing must be external and documented.
- `source`: product/source provenance including asset type and processing record as needed; no credentials. The demo uses `DEMO: generated reflectance; no satellite image`.
- `synthetic`: must match the manifest.
- `grid`: required complete metadata; exact match with the manifest. Both bands/masks must already use this grid. There is no separate band-grid alignment operation.
- `red`, `nir`: arrays of finite reflectance numbers in `[0,1]` or JSON `null`. Convert scale factors and no-data outside this tool. Negative, NaN, Infinity, raw digital numbers and values >1 are rejected; no silent clamping. A product with valid values outside this restricted prototype range needs a reviewed extension, not editing its measurements to fit.
- `valid`, `cloud`, `shadow`: full-size JSON boolean matrices (not 0/1). Supply all three explicitly. `valid=false`, `cloud=true` or `shadow=true` masks the cell. Clouds/shadows are not inferred from reflectance here. Either missing band or `red+nir <= epsilon` is also unusable.

Do not use visual RGB assets with no calibrated NIR, fabricate NIR, or feed the leaf model into this importer. If native red and NIR grids, CRS, extent, dates, provenance or masks are unavailable, stop and obtain/prepare them. If grids differ, the CLI exits with an actionable error; it performs no resampling. The component can only check the grids declared for embedded arrays, not a source raster hidden behind those declarations.

## Provider boundary and future GeoTIFF work

`ObservationImporter.load(manifest_path)` returns a validated manifest. `LocalJSONImporter` implements local embedded JSON. `CommercialArchiveImporter(provider)` is a named placeholder and always raises an `InputError`; it never makes a remote call. There are no provider SDKs, credentials, endpoints, purchase flows or live connectivity.

A future GeoTIFF adapter should be an isolated optional environment (`numpy`/`rasterio` if chosen) and keep this demo dependency-free. It must require actual red/NIR bands, band identities, calibration/scale, native spectral resolution, CRS, extent, transform, acquisition dates and masks; reject incompatible grids; and preserve provenance. Registration, radiometric comparability and valid crop delineation require external verification before any change analysis. Do not silently consider that work complete just because metadata matches.

## Output JSON

`report.json` includes labels, the fixed baseline, original grid/config/target mask, preparation notes, method and dated `frames`. Each frame contains raw masked `ndvi`, eligible `ndvi_change`, statuses/reasons, observation counts through that date, coverage and zones. Unavailable numbers are `null`.

Statuses are `outside_target`, `insufficient`, `no_threshold_drop`, `change`, and `small_change`. `overall_status` is `insufficient_observations` when zero target cells can be compared, `vegetation_change` if any eligible cell passes the drop threshold, otherwise `no_threshold_drop`. Always read coverage with overall status; a partially comparable area is not a whole-field normal result.

Zone cells are `[row,col]`, **0-based** in JSON. `bbox` is `[col_min,row_min,col_max_exclusive,row_max_exclusive]`; it is a display locator, not a polygon of all affected land. Orange cells define actual grouped membership. Grouping uses four-neighbour adjacency, does not fill gaps, and ranks mean NDVI change ascending, then cell count descending, then row/column order. All settings and resulting rankings are illustrative, not agronomically validated.
