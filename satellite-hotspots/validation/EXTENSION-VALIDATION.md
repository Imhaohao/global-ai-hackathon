# Training and monitoring extension validation

The original NDVI component remains available without ML dependencies. The full suite includes tracking growth, unknown/cloud gaps, stale acquisitions, grid mismatch, future dates, duplicate drafts, an accepted fake SMS request, uncertain provider timeouts, historical-live rejection, native-grid area, overlapping multilabel annotations, input channel/value validation, and offline saved-checkpoint CPU inference.

Real data: a verified 21,033,702,578-byte public HF Agriculture-Vision archive; 128 distinct training fields and 64 distinct validation fields; zero field overlap. Real training: 4 epochs, 128 optimizer updates, a saved safetensors checkpoint with recorded hash and held-out metrics. The initial GPU backward failure and the successful diagnostic are retained separately.

The synthetic model-demo goes through actual checkpoint inference, the original NDVI report, prediction files and the tracking/report path. Its synthetic RGB+NIR values are explicitly marked. A malformed synthetic input with missing values incorrectly marked usable was rejected before inference; fixing the mask resolved that input error. A historical replay is dry-run and a current-date check of those old images is stale, with no current alerts.

The separate monitor-demo uses scripted synthetic scores to show growing extent and the draft SMS. It demonstrates tracking logic rather than learned coffee disease progression. Actual held-out inference is illustrated in held-out-drydown.png; the model overpredicts drydown in that example.

No live SMS, farm account, imagery-provider integration, Windows installation or daily scheduler was activated. Provider acceptance was tested using a fake sender only. Full HTML browser layout has not been verified; the map SVG was rendered and inspected separately. Python tests and the saved checkpoint are portable, but Windows behavior remains untested.
