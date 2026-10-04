import copy
import json
import subprocess
import sys
import tempfile
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path

from hotspots.demo import generate_demo
from hotspots.engine import analyze, groups, ndvi
from hotspots.providers import CommercialArchiveImporter, InputError, LocalJSONImporter, validate_manifest
from hotspots.report import map_svg, render_html


class PipelineTests(unittest.TestCase):
    def setUp(self):
        self.manifest = generate_demo()
        self.report = analyze(self.manifest)

    def test_stable_cells_have_no_threshold_drop(self):
        latest = self.report["frames"][-1]
        self.assertEqual(latest["status"][7][18], "no_threshold_drop")
        self.assertAlmostEqual(latest["ndvi_change"][7][18], 0)

    def test_decline_zones_rank_by_mean_drop(self):
        zones = self.report["frames"][-1]["zones"]
        self.assertEqual([z["cell_count"] for z in zones], [16, 12])
        self.assertAlmostEqual(zones[0]["mean_ndvi_change"], -0.32)
        self.assertAlmostEqual(zones[1]["mean_ndvi_change"], -0.19)
        self.assertEqual([z["rank"] for z in zones], [1, 2])
        self.assertEqual(zones[0]["bbox"], [5, 5, 9, 9])

    def test_clouded_decline_does_not_form_zone(self):
        middle = self.report["frames"][1]
        self.assertEqual(middle["status"][6][6], "insufficient")
        self.assertIsNone(middle["ndvi"][6][6])
        self.assertEqual(middle["zones"], [])

    def test_all_clouded_date_is_insufficient(self):
        cloud = self.report["frames"][2]
        self.assertEqual(cloud["overall_status"], "insufficient_observations")
        self.assertEqual(cloud["coverage"]["valid_current_fraction"], 0)
        self.assertEqual(cloud["coverage"]["comparable_fraction"], 0)
        self.assertEqual(cloud["zones"], [])

    def test_baseline_only_is_insufficient(self):
        baseline = self.report["frames"][0]
        self.assertGreater(baseline["coverage"]["valid_current_cells"], 0)
        self.assertEqual(baseline["overall_status"], "insufficient_observations")
        self.assertEqual(baseline["coverage"]["comparable_cells"], 0)

    def test_missing_baseline_never_becomes_normal(self):
        latest = self.report["frames"][-1]
        self.assertIsNotNone(latest["ndvi"][3][16])
        self.assertIsNone(self.report["frames"][0]["ndvi"][3][16])
        self.assertEqual(latest["status"][3][16], "insufficient")
        self.assertEqual(latest["reasons"][3][16], "Missing valid baseline")
        self.assertIsNone(latest["ndvi_change"][3][16])

    def test_no_data_and_zero_denominator_stay_unknown(self):
        for frame in self.report["frames"]:
            for r,c in ((16,4), (10,10)):
                self.assertEqual(frame["status"][r][c], "insufficient")
                self.assertIsNone(frame["ndvi"][r][c])

    def test_coverage_uses_coffee_mask(self):
        coverage = self.report["frames"][-1]["coverage"]
        self.assertEqual(coverage["target_cells"], 288)
        self.assertEqual(coverage["valid_current_cells"], 278)
        self.assertEqual(coverage["comparable_cells"], 269)
        self.assertEqual(coverage["insufficient_cells"], 19)
        self.assertEqual(self.report["frames"][-1]["status"][4][12], "outside_target")

    def test_mask_and_denominator_rules(self):
        self.assertAlmostEqual(ndvi(0.1,0.9,True,False,False),0.8)
        for params in ((None,.9,True,False,False), (.1,.9,False,False,False),
                       (.1,.9,True,True,False), (.1,.9,True,False,True),
                       (0,0,True,False,False), (1e-12,1e-12,True,False,False)):
            self.assertIsNone(ndvi(*params))

    def test_no_future_dates_used_for_counts(self):
        self.manifest["config"]["min_valid_observations"] = 3
        report = analyze(self.manifest)
        self.assertEqual(report["frames"][1]["status"][7][18], "insufficient")
        self.assertEqual(report["frames"][-1]["status"][7][18], "no_threshold_drop")
        # Declining A has only a baseline and latest date because intermediate dates are cloudy.
        self.assertEqual(report["frames"][-1]["status"][6][6], "insufficient")
        self.assertEqual(report["frames"][0]["valid_observation_counts"][7][18], 1)

    def test_four_neighbour_grouping_does_not_bridge_unknown(self):
        self.assertEqual(groups([(0,0),(1,1)]), [[(0,0)],[(1,1)]])
        self.assertEqual(groups([(0,0),(0,1),(0,3)]), [[(0,0),(0,1)],[(0,3)]])

    def test_small_change_is_not_labelled_stable(self):
        self.manifest["config"]["min_zone_cells"] = 20
        frame = analyze(self.manifest)["frames"][-1]
        self.assertEqual(frame["zones"], [])
        self.assertEqual(frame["small_change_cells"], 28)
        self.assertEqual(frame["status"][6][6], "small_change")
        self.assertEqual(frame["overall_status"], "vegetation_change")

    def test_grid_mismatch_fails_actionably(self):
        for key, value in (("crs","EPSG:4326"),("units","metres"),
                           ("native_spectral_resolution",[2,2])):
            data = copy.deepcopy(self.manifest)
            data["observations"][1]["grid"][key] = value
            with self.assertRaises(InputError):
                analyze(data)
        data = copy.deepcopy(self.manifest)
        obs_grid = data["observations"][1]["grid"]
        obs_grid["transform"][2] = 1
        obs_grid["extent"][0] += 1
        obs_grid["extent"][2] += 1
        with self.assertRaisesRegex(InputError, "Align externally"):
            analyze(data)

    def test_missing_grid_metadata_is_rejected(self):
        del self.manifest["observations"][0]["grid"]["crs"]
        with self.assertRaisesRegex(InputError, "Grid metadata missing"):
            analyze(self.manifest)

    def test_pansharpened_resolution_rejected(self):
        self.manifest["grid"]["native_spectral_resolution"] = [4,4]
        with self.assertRaisesRegex(InputError, "Upsampled or pansharpened"):
            analyze(self.manifest)

    def test_invalid_arrays_and_dates_fail(self):
        for mutate in (lambda m: m["observations"][1]["red"].pop(),
                       lambda m: m["observations"][1]["valid"][0].__setitem__(0,1),
                       lambda m: m["observations"][1]["red"][0].__setitem__(0,float("nan")),
                       lambda m: m["observations"][1]["nir"][0].__setitem__(0,2500),
                       lambda m: m["observations"][1].__setitem__("date","not-a-date"),
                       lambda m: m["observations"][1].__setitem__("date","2026-06-01"),
                       lambda m: m["observations"][1].__setitem__("synthetic",False)):
            data = copy.deepcopy(self.manifest)
            mutate(data)
            with self.assertRaises(InputError):
                analyze(data)

    def test_config_and_empty_mask_fail(self):
        for key, value in (("min_valid_observations",1),("min_zone_cells",0),
                           ("ndvi_drop_threshold",-1),("denominator_epsilon",0)):
            data = copy.deepcopy(self.manifest)
            data["config"][key] = value
            with self.assertRaises(InputError):
                analyze(data)
        self.manifest["target_mask"] = [[False]*24 for _ in range(20)]
        with self.assertRaisesRegex(InputError, "no inspection cells"):
            analyze(self.manifest)

    def test_real_data_requires_preparation_notes(self):
        self.manifest["synthetic"] = False
        self.manifest["grid"]["crs"] = "EPSG:32632"
        self.manifest["grid"]["units"] = "metres"
        for obs in self.manifest["observations"]:
            obs["synthetic"] = False
            obs["grid"] = copy.deepcopy(self.manifest["grid"])
        with self.assertRaisesRegex(InputError,"preparation notes"):
            analyze(self.manifest)
        self.manifest["preparation"] = {key:"Unit-test fixture only; not real data"
                                        for key in ("alignment","reflectance_harmonization","mask_method")}
        validate_manifest(self.manifest)

    def test_archive_adapter_is_explicit_placeholder(self):
        with self.assertRaisesRegex(InputError, "not implemented"):
            CommercialArchiveImporter("SkySat").load(Path("unused"))

    def test_html_escapes_labels_and_remains_self_contained(self):
        self.report["label"] = '<script>alert("x")</script>'
        page = render_html(self.report)
        self.assertNotIn('<script>alert("x")</script>',page)
        self.assertIn('&lt;script&gt;',page)
        self.assertIn("connect-src 'none'",page)
        self.assertNotIn('<script src=',page)
        self.assertNotIn('<link ',page)
        self.assertIn('DEMO · Synthetic observations',page)
        self.assertIn('type="range"',page)
        self.assertEqual(page.count('class="frame"'),4)

    def test_svg_has_synthetic_caption_and_valid_zone_geometry(self):
        svg=ET.fromstring(map_svg(self.report,self.report["frames"][-1],3))
        self.assertEqual(svg.tag,'{http://www.w3.org/2000/svg}svg')
        ns={'svg':'http://www.w3.org/2000/svg'}
        caption=next(el for el in svg.findall('svg:text',ns) if el.get('class')=='map-caption')
        self.assertIn('DEMO',caption.text)
        self.assertIn('no real coordinates or scale',caption.text)
        self.assertEqual(caption.get('fill'),'#657166')
        boxes=[el for el in svg.findall('svg:rect',ns) if el.get('class','').startswith('zone-box')]
        self.assertEqual(len(boxes),2)
        self.assertEqual((boxes[0].get('x'),boxes[0].get('y'),boxes[0].get('width'),boxes[0].get('height')),
                         ('118','118','100','100'))

    def test_json_import_rejects_nonstandard_numbers(self):
        with tempfile.TemporaryDirectory(dir=Path(__file__).resolve().parents[1]) as directory:
            path=Path(directory)/"invalid.json"
            path.write_text('{"schema_version":NaN}',encoding="utf-8")
            with self.assertRaisesRegex(InputError, "Cannot read JSON"):
                LocalJSONImporter().load(path)

    def test_full_cli_demo_and_local_round_trip(self):
        with tempfile.TemporaryDirectory(dir=Path(__file__).resolve().parents[1]) as directory:
            generated=Path(directory)/"demo"
            result=subprocess.run([sys.executable,"-m","hotspots","demo","--output",str(generated)],
                                  capture_output=True,text=True)
            self.assertEqual(result.returncode,0,result.stderr)
            manifest_path=generated/"synthetic-manifest.json"
            imported=LocalJSONImporter().load(manifest_path)
            self.assertEqual(imported,generate_demo())
            json_report=json.loads((generated/"report.json").read_text(encoding="utf-8"))
            self.assertEqual(json_report,analyze(imported))
            self.assertTrue((generated/"report.html").exists())
            alternate=Path(directory)/"local"
            result=subprocess.run([sys.executable,"-m","hotspots","analyze",str(manifest_path),
                                   "--output",str(alternate)],capture_output=True,text=True)
            self.assertEqual(result.returncode,0,result.stderr)
            self.assertEqual((generated/"report.json").read_bytes(),(alternate/"report.json").read_bytes())

    def test_cli_invalid_input_has_nonzero_exit(self):
        result=subprocess.run([sys.executable,"-m","hotspots","validate","missing-manifest.json"],
                              capture_output=True,text=True)
        self.assertEqual(result.returncode,2)
        self.assertIn("Cannot read JSON",result.stderr)


if __name__ == "__main__":
    unittest.main()
