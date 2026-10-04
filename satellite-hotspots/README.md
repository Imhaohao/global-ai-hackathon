# Satellite hotspots · Global AI Hackathon prototype

**Model training and monitoring extension:** this component now includes an optional four-band SegFormer trainer, local model inference, anomaly extent tracking, a persistent SMS outbox, a Twilio adapter and a Windows daily-run script. Start with [Training and monitoring](docs/TRAINING_AND_MONITORING.md). The checkpoint is a research pilot on US aerial crop anomalies; it is not validated for satellite coffee disease or pest progression. Live SMS and imagery accounts remain unconfigured. The original offline NDVI demo below still needs only the standard library.

Help a farmer start with a few areas to inspect using **vegetation change**, with explicit unknown areas. This standalone component runs locally on Python **3.9+**, uses only the standard library, and produces a self-contained offline HTML/SVG report and JSON. No installation, API keys, network, web map, or geospatial libraries are needed. It is independent of the coffee-leaf EfficientNet project.

## Run the demo

From this `satellite-hotspots/` directory:

```sh
python3 -m hotspots demo --output demo-output
python3 -m unittest discover -s tests -v
```

On Windows use `py -3` in place of `python3`. Double-click `demo-output/report.html` in a browser. A ready-to-open report is included. The date slider switches between four observation dates; the ranked list highlights zone locators. Select a coffee cell for its NDVI, change, and observation count. With JavaScript disabled, all dates remain visible. The HTML alone is sufficient for offline viewing on a laptop or phone; transferring/opening a local HTML file on a phone depends on its browser/file app. No service worker, server, install, or mobile-app integration is included.

**Every demo value and map is synthetic.** Noor is fictional, farms 2 hectares total, with coffee on only part. The schematic has no real location, scale or measured area; its grid size is not a sensor resolution. No real field coordinates or satellite imagery were supplied.

The latest synthetic date has two inspection zones (16 and 12 schematic cells). It has 278/288 usable current cells and 269/288 baseline-comparable cells. The entirely cloud-covered date and the baseline-only date report **insufficient observations**, never a normal result. Missing-baseline and permanently unobserved cells remain unknown.

## Layout and method

| File | Responsibility |
| --- | --- |
| `hotspots/__main__.py` | Small CLI: `demo`, `validate`, `analyze` |
| `hotspots/providers.py` | Local JSON importer, grid/mask/metadata checks, archive interface placeholder |
| `hotspots/demo.py` | Deterministic labelled synthetic manifest and aligned red/NIR arrays |
| `hotspots/engine.py` | Mask-aware NDVI, fixed-baseline change, four-neighbour grouping |
| `hotspots/report.py` | Fully embedded HTML/SVG report and offline JSON |
| `docs/IMPORT_CONTRACT.md` | Optional prepared-data contract and provider boundary |
| `tests/test_pipeline.py` | Algorithm, validation, CLI, and report checks |
| `demo-output/` | Generated synthetic input and reports |
| `validation/` | Saved test results and visual verification evidence |

NDVI is `(NIR − red)/(NIR + red)`. Missing bands, `valid=false`, cloud, shadow, and sums at or below the epsilon produce `null`, not zero. Comparison requires a usable **fixed first-date baseline**, a usable selected-date observation, and the minimum usable observation count through that date. It never uses future dates or replaces a missing baseline with a later date.

The demo flags an NDVI decline of at least **0.15**, requires **2** usable dates, and groups at least **4** flagged cells with four-neighbour connectivity. Epsilon is `1e-9`. These are **illustrative, configurable, and not agronomically validated**. Groups rank by mean decline, then size; a rank is inspection order, not probability or confidence. Zone IDs/numbering are per date and do not track an area over time. Small flagged groups stay separately labelled; clouds are never filled or bridged. “No threshold drop” applies only to comparable cells and is not proof of crop health. NDVI is not a disease detector.

Change these values in the generated manifest's `config`, then run locally:

```sh
python3 -m hotspots validate demo-output/synthetic-manifest.json
python3 -m hotspots analyze demo-output/synthetic-manifest.json --output refreshed-report
```

Choose a fresh output directory to retain old reports; the CLI overwrites report files in an existing output directory. See the [prepared-data contract](docs/IMPORT_CONTRACT.md) before using other inputs. No GeoTIFF ingestion is implemented. The optional route is already prepared JSON arrays; no extra dependencies are needed.

## Offline refresh and satellite access

1. On a connected computer, separately obtain authorized red/NIR observations, acquisition dates, provenance and validity/cloud/shadow masks. Check whether suitable, repeated archive imagery actually exists for the field; revisit capability does not establish archive coverage. Nothing in this component searches or purchases data.
2. Externally verify registration, native spectral grid alignment and reflectance comparability; crop the small target area, identify the coffee subset, and prepare a local JSON manifest. This prototype checks structure and metadata consistency, not scientific accuracy or real registration.
3. Validate and analyze locally, review date-by-date coverage, then copy the new HTML report to the offline device. With Noor's occasional 3G, an intermediary could transfer only the report; no imagery download is needed for viewing. Refresh in this original workflow is manual. The optional daily-run extension is described in docs/TRAINING_AND_MONITORING.md.

Future adapters for Pleiades Neo, WorldView or SkySat would fit behind `ObservationImporter`, supplying the same contract. `CommercialArchiveImporter` deliberately fails with an actionable “not implemented” message. Archive rights, account access, purchases, APIs and downloads are outside this skeleton. Keep any future credentials outside source control; no credentials are accepted here.

Primary sources: [Planet SkySat imagery documentation](https://docs.planet.com/data/imagery/skysat/) describes native analytic products and pansharpened/visual products; their roles differ. [Copernicus Pléiades Neo mission specifications](https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/missions/pleiadesneo) list 30 cm panchromatic and 1.2 m multispectral GSD. Do not treat advertised 30–50 cm visual products as independent spectral detail at that spacing. These sources describe capability/products, not availability for Noor's fictional plot.

## Limits and remaining work

No diagnosis, treatment advice, calibrated confidence, yield estimate, disease probability, real imagery validation or geographic navigation. Sentinel-2's 10 m bands are generally too coarse for detailed coffee disease hotspots on this small plot. A leaf EfficientNet trained on close-up leaves cannot be applied to overhead satellite images as-is.

Real-world registration, reflectance harmonization, shade-canopy effects, seasonality, viewing geometry, mixed pixels, reliable masks and ground calibration remain external preparation/research work. Clouds and missing acquisitions can leave too little evidence. Native spectral resolution is preserved in the import contract; no upsampling, pansharpening, reprojection or image harmonization occurs here. Metadata notes are not scientific certification. The intentionally small north-up JSON importer allows up to 512 rows/columns; prepare a smaller crop for a compact report.

## Windows workspace

The transferred component is installed at `C:\Users\leeco\Desktop\global-ai-hackathon\satellite-hotspots\`. All 13 transfer archives and 59,176 extracted project/data files were checked against the source SHA-256 manifests. Prepared Agriculture-Vision data lives separately at `..\work\data\agriculture-expanded\`.

An isolated `.venv` contains the optional model dependencies; exact installed versions are recorded in `requirements-windows-lock.txt`. The original imported checkpoints remain under `models/agriculture-pilot/` and `models/agriculture-expanded/`. Windows continuation writes to `models/agriculture-windows-20261003/`. See [Training and monitoring](docs/TRAINING_AND_MONITORING.md) for the checkpoint provenance, evaluation policy, and commands.

From this component in PowerShell:

```powershell
& '.\.venv\Scripts\python.exe' -m hotspots demo --output validation/windows-demo
& '.\.venv\Scripts\python.exe' -m unittest discover -s tests -v
& '.\.venv\Scripts\python.exe' -m ruff check .
node tests/test_controls.cjs
```

Windows verification passed all 57 Python tests, the complexity limit of 15, and the JavaScript report-control checks. The generated demo is `validation/windows-demo/report.html`. Browser verification confirmed the latest-date view, inspection-area selection, and the fully cloudy date's insufficient-observations state. All demo imagery remains synthetic.

The satellite environment and data are separate from the repository's leaf training and mobile application. No shared dependency or Git branch/index changes were required.
