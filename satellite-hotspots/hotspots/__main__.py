"""Run from satellite-hotspots/: python -m hotspots demo --output demo-output."""

import argparse
import json
import sys
from pathlib import Path

from .demo import generate_demo
from .engine import analyze
from .providers import InputError, LocalJSONImporter
from .report import write_report


def main(argv=None):
    parser = argparse.ArgumentParser(description="Local offline vegetation-change inspection prototype.")
    commands = parser.add_subparsers(dest="command", required=True)
    demo = commands.add_parser("demo", help="Generate explicitly synthetic observations and an offline report.")
    demo.add_argument("--output", type=Path, default=Path("demo-output"))
    local = commands.add_parser("analyze", help="Analyze an already prepared local JSON manifest (no download).")
    local.add_argument("manifest", type=Path)
    local.add_argument("--output", type=Path, default=Path("local-report"))
    check = commands.add_parser("validate", help="Validate prepared JSON only; no processing or remote access.")
    check.add_argument("manifest", type=Path)
    infer_parser = commands.add_parser("infer", help="Run optional local RGB+NIR model and the NDVI report.")
    infer_parser.add_argument("manifest", type=Path)
    infer_parser.add_argument("--checkpoint", type=Path, required=True)
    infer_parser.add_argument("--output", type=Path, default=Path("model-output"))
    monitor = commands.add_parser("monitor", help="Track anomaly extent and draft SMS; no imagery download.")
    monitor.add_argument("predictions", type=Path)
    monitor.add_argument("--output", type=Path, default=Path("monitor-output"))
    monitor.add_argument("--state", type=Path, default=Path("monitor-state.sqlite"))
    monitor.add_argument("--as-of", help="YYYY-MM-DD for historical replay; default today")
    monitor.add_argument("--sms-config", type=Path, help="Dry run by default; explicit live configuration required")
    monitor.add_argument("--threshold", type=float, default=0.65)
    monitor.add_argument("--min-cells", type=int, default=4)
    monitor.add_argument("--min-growth-cells", type=int, default=4)
    monitor.add_argument("--min-coverage", type=float, default=0.9)
    monitor.add_argument("--max-age-days", type=int, default=7)
    args = parser.parse_args(argv)
    try:
        if args.command == "infer":
            from .inference import infer
            path = infer(args.manifest, args.checkpoint, args.output)
            print(f"Pilot anomaly scores: {path.resolve()}. Target domain unvalidated.")
            return 0
        if args.command == "monitor":
            from datetime import date
            from .monitor import run_monitor
            from .providers import read_json
            as_of = date.fromisoformat(args.as_of) if args.as_of else None
            config = read_json(args.sms_config) if args.sms_config else None
            result = run_monitor(args.predictions, args.output, args.state, as_of=as_of,
                                 sms_config=config, threshold=args.threshold, min_cells=args.min_cells,
                                 min_growth_cells=args.min_growth_cells,
                                 min_coverage=args.min_coverage, max_age_days=args.max_age_days)
            print(f"Monitoring: {result['status']}; latest acquisition {result['latest_acquisition']}; "
                  f"{len(result['pending_alerts'])} new extent alerts. {args.output.resolve() / 'monitor.html'}")
            return 0
        if args.command == "demo":
            manifest = generate_demo()
        else:
            manifest = LocalJSONImporter().load(args.manifest)
        if args.command == "validate":
            print(f"Validated {len(manifest['observations'])} dated local observations. "
                  "This checks structure, not registration or scientific comparability.")
            return 0
        report = analyze(manifest)
        args.output.mkdir(parents=True, exist_ok=True)
        if args.command == "demo":
            (args.output / "synthetic-manifest.json").write_text(
                json.dumps(manifest, indent=2, ensure_ascii=False, allow_nan=False)+"\n", encoding="utf-8")
        path = write_report(report, args.output)
        latest = report["frames"][-1]
        print(f"{'SYNTHETIC DEMO' if report['synthetic'] else 'LOCAL PREPARED DATA'}: {path.resolve()}")
        print(f"Latest date {latest['date']}: {len(latest['zones'])} inspection zones; "
              f"{latest['coverage']['comparable_cells']}/{latest['coverage']['target_cells']} cells comparable. "
              "No disease diagnosis or calibrated confidence.")
        return 0
    except (InputError, OSError, ValueError, ImportError) as exc:
        print(f"Input/output error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
