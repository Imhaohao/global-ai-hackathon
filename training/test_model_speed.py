import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from model_speed import build_report, summarize_log


def timing_log(count=30):
    return '\n'.join(f'10-03 19:00:00.000 I ReactNativeJS: [leaf-model] inference_ms={value}.0 quality=true' for value in range(1, count + 1))


class ModelSpeedTests(unittest.TestCase):
    def test_summary_keeps_all_samples_and_interpolates_percentiles(self):
        result = summarize_log(timing_log() + '\nunrelated log line')
        self.assertEqual(result['sample_count'], 30)
        self.assertEqual(result['median_ms'], 15.5)
        self.assertAlmostEqual(result['p90_ms'], 27.1)
        self.assertEqual(result['slowest_ms'], 30)
        self.assertEqual(len(result['samples']), 30)

    def test_short_and_zero_time_runs_are_rejected(self):
        for log in [timing_log(29), timing_log().replace('inference_ms=1.0', 'inference_ms=0.0')]:
            with self.assertRaises(ValueError):
                summarize_log(log)

    def test_quality_failure_remains_in_timing_distribution(self):
        result = summarize_log(timing_log().replace('quality=true', 'quality=false', 1))
        self.assertFalse(result['samples'][0]['quality_passed'])
        self.assertEqual(result['sample_count'], 30)

    def test_report_refuses_wrong_model_or_missing_photo_credits(self):
        with tempfile.TemporaryDirectory() as directory:
            artifact = Path(directory) / 'test.tflite'
            artifact.write_bytes(b'test artifact')
            digest = hashlib.sha256(artifact.read_bytes()).hexdigest()
            config = {'calibration': {'artifact_sha256': digest, 'version': 'test'}}
            metadata = {
                'artifact_sha256': digest,
                'model_config_signature': hashlib.sha256(json.dumps(config, sort_keys=True).encode()).hexdigest(),
                'photos': ['photo'] * 6,
            }
            result = build_report(timing_log(), metadata, artifact, config)
            self.assertEqual(result['artifact_bytes'], len(b'test artifact'))
            for invalid in [{**metadata, 'artifact_sha256': 'wrong'}, {**metadata, 'photos': []}, {**metadata, 'model_config_signature': 'wrong'}]:
                with self.assertRaises(ValueError):
                    build_report(timing_log(), invalid, artifact, config)


if __name__ == '__main__':
    unittest.main()
