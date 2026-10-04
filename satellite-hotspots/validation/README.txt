VALIDATION EVIDENCE — 2026-10-03

Built and run locally on the Mac with Python 3.14.5. The component targets
Python 3.9+ standard-library APIs; other interpreter versions and Windows
have not been executed here. No optional environment was installed.

python-tests.txt: 24 passing unittest checks. They cover stable/declining
cells, ranking, all-cloud/never-observed data, masked/absent baseline,
baseline-only dates, shadow, zero/near-zero denominators, observation counts
without future leakage, grouping without bridging gaps, small-change labels,
invalid arrays/dates/thresholds, native resolution and grid consistency,
required real-data provenance notes, placeholder adapters, CLI round-trip,
HTML escaping/self-contained markup, and SVG zone geometry/synthetic labels.
Command: python3 -m unittest discover -s tests -v

demo-run.txt: successful full synthetic demo command.
Command: python3 -m hotspots demo --output demo-output
Latest date: 2026-07-13; 2 ranked zones (16 cells, 12 cells); 278/288 cells
usable at that date; 269/288 comparable with baseline; 19 insufficient.
2026-06-29 is fully cloud-masked, with zero valid or comparable cells;
2026-06-01 is baseline only, with no eligible change comparisons.

report-controls.txt: the actual generated inline JavaScript was executed
in an isolated DOM stub using Node's standard library. Checked date-slider
selection, previous/next arrows, date/ARIA labels, disabled end buttons,
zone highlights, missing-baseline cell details and keyboard selection.
Command: node tests/test_controls.js demo-output/report.html
Node is used only for this optional development check, not to run the demo.
This is a control-logic check, not an actual browser or layout test.

latest-map.svg/.png and cloud-covered-map.svg/.png: the actual SVG field maps
embedded in the report, extracted with hotspots.report.map_svg and rendered
locally with the already-bundled Sharp renderer at density 144. Both PNGs
were visually inspected. Verified readable DEMO/no-real-coordinates labels,
ranked orange zones and outlined locators, striped insufficient cells,
and all-cloud unknown coverage without any normal target cells. No image
generation, browser navigation, network or external upload was used to
render these map images. The renderer is not a component dependency.

FULL HTML BROWSER LAYOUT NOT VERIFIED: the browser tool refused file://
navigation because it permits only http/https URLs. No alternate browser,
local HTTP server or other workaround was attempted. Full HTML layout,
real-browser events, narrow-screen layout, printing and phone file handling
remain unverified. The HTML has an embedded responsive layout and a static
all-date fallback when JavaScript is disabled.

The portable zip's extraction, checksum and repeated smoke checks are saved
beside the zip in PACKAGE-VALIDATION.txt. No real observations, scientific
performance evaluation, archive coverage checks, remote connections, or
Windows-host test were performed. This is a truthful runnable skeleton.
