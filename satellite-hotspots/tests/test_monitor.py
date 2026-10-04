import copy
import json
import sqlite3
import tempfile
import unittest
from datetime import date
from pathlib import Path
from unittest.mock import patch

from hotspots.monitor import track, queue_alerts, send_sms, run_monitor
from hotspots.providers import InputError


def predictions():
    grid={'rows':8,'cols':8,'crs':'DEMO_LOCAL','units':'demo_units',
          'transform':[1,0,0,0,-1,8],'extent':[0,0,8,8],'native_spectral_resolution':[1,1]}
    dates=['2026-10-01','2026-10-02','2026-10-03']
    observations=[]
    for index,d in enumerate(dates):
        scores=[[0.1]*8 for _ in range(8)]
        for r in range(2,4):
            for c in range(1,3+index): scores[r][c]=0.9
        observations.append({'date':d,'source':'synthetic test','grid':grid,
                             'valid':[[True]*8 for _ in range(8)],'scores':{'drydown':scores}})
    return {'schema_version':1,'field_id':'test-field','label':'Test plot','sensor':'synthetic',
            'model_version':'test-model','domain_validated':False,'synthetic':True,
            'grid':grid,'target_mask':[[True]*8 for _ in range(8)],'observations':observations}


class MonitoringTests(unittest.TestCase):
    def setUp(self):
        class FixedDate(date):
            @classmethod
            def today(cls): return cls(2026,10,3)
        mock=patch('hotspots.monitor.date',FixedDate)
        mock.start(); self.addCleanup(mock.stop)

    def run_track(self,data=None,**kw):
        return track(data or predictions(),as_of=date(2026,10,3),min_growth_cells=2,**kw)

    def test_progression_uses_comparable_extent_and_stable_identity(self):
        result=self.run_track()
        self.assertEqual([len(f['zones']) for f in result['frames']],[1,1,1])
        self.assertEqual(len({f['zones'][0]['track_id'] for f in result['frames']}),1)
        self.assertEqual(result['pending_alerts'][0]['net_growth_cells'],2)
        self.assertEqual(result['pending_alerts'][0]['persistent_cells'],6)
        self.assertFalse(result['pending_alerts'][0]['diagnosis_confirmed'])

    def test_first_image_cannot_claim_spread(self):
        data=predictions(); data['observations']=data['observations'][-1:]
        self.assertEqual(self.run_track(data)['pending_alerts'],[])

    def test_masked_previous_extent_suppresses_growth_claim(self):
        data=predictions(); data['observations'][-1]['valid'][2][1]=False
        self.assertEqual(self.run_track(data)['pending_alerts'],[])

    def test_cloudy_acquisition_does_not_erase_track(self):
        data=predictions(); data['observations'][1]['valid']=[[False]*8 for _ in range(8)]
        result=self.run_track(data)
        self.assertEqual(result['frames'][1]['status'],'insufficient_coverage')
        self.assertEqual(result['frames'][-1]['zones'][0]['persistent_cells'],4)
        self.assertEqual(result['frames'][-1]['gap_days'],2)

    def test_stale_images_never_queue_sms(self):
        result=track(predictions(),as_of=date(2026,11,1),min_growth_cells=2)
        self.assertEqual(result['status'],'stale_imagery')
        self.assertEqual(result['pending_alerts'],[])

    def test_grid_mismatch_is_rejected(self):
        data=predictions(); data['observations'][-1]['grid']=copy.deepcopy(data['grid'])
        data['observations'][-1]['grid']['crs']='other'
        with self.assertRaises(InputError): self.run_track(data)

    def test_nonfinite_score_rejected(self):
        data=predictions(); data['observations'][-1]['scores']['drydown'][0][0]=float('nan')
        with self.assertRaises(InputError): self.run_track(data)

    def test_future_date_rejected(self):
        with self.assertRaises(InputError): track(predictions(),as_of=date(2026,10,2))

    def test_low_coverage_latest_suppresses_sms(self):
        data=predictions(); data['observations'][-1]['valid']=[[False]*8 for _ in range(8)]
        self.assertEqual(self.run_track(data)['pending_alerts'],[])

    def test_dry_run_and_repeat_do_not_duplicate_alert(self):
        with tempfile.TemporaryDirectory() as tmp:
            state=Path(tmp)/'state.sqlite'; result=self.run_track()
            first=queue_alerts(result,state); second=queue_alerts(result,state)
            self.assertEqual(len(first),1); self.assertEqual(first,second)
            self.assertEqual(first[0]['status'],'draft')
            self.assertIn('TEST',first[0]['body']); self.assertIn('Cause unconfirmed',first[0]['body'])
            self.assertEqual(send_sms(result,state,{'mode':'dry-run'})['sent'],0)

    def test_unvalidated_live_sms_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaises(InputError): send_sms(self.run_track(),Path(tmp)/'s',{'mode':'live'})

    def live_result(self):
        result=self.run_track(); result['synthetic']=False; result['domain_validated']=True
        config={'mode':'live','field_id':'test-field','validation_record':'local-test-fixture-only',
                'recipient_consented':True,'to':'+15555550123'}
        return result,config

    def test_fake_provider_accepts_once(self):
        with tempfile.TemporaryDirectory() as tmp:
            state=Path(tmp)/'s'; result,config=self.live_result(); queue_alerts(result,state)
            calls=[]
            def sender(body): calls.append(body); return 'SM-test'
            self.assertEqual(send_sms(result,state,config,sender)['sent'],1)
            self.assertEqual(send_sms(result,state,config,sender)['sent'],0)
            self.assertEqual(len(calls),1)

    def test_provider_timeout_is_not_retried(self):
        with tempfile.TemporaryDirectory() as tmp:
            state=Path(tmp)/'s'; result,config=self.live_result(); queue_alerts(result,state)
            calls=[]
            def sender(body): calls.append(body); raise TimeoutError('uncertain')
            send_sms(result,state,config,sender); send_sms(result,state,config,sender)
            self.assertEqual(len(calls),1)
            self.assertEqual(queue_alerts(result,state)[0]['status'],'unknown')

    def test_historical_replay_cannot_send_live(self):
        with tempfile.TemporaryDirectory() as tmp:
            state=Path(tmp)/'s'; result,config=self.live_result()
            result['as_of']='2026-10-02'
            with self.assertRaises(InputError): send_sms(result,state,config,lambda b:'SM-test')

    def test_geographic_area_from_native_grid(self):
        data=predictions(); data['synthetic']=False; data['preparation']={'alignment':'test-only'}
        grid=copy.deepcopy(data['grid']); grid.update(crs='EPSG:32631',units='metres',
            transform=[2,0,100,0,-2,200],extent=[100,184,116,200],native_spectral_resolution=[2,2])
        data['grid']=grid
        for obs in data['observations']: obs['grid']=grid
        self.assertEqual(self.run_track(data)['pending_alerts'][0]['area_m2'],32)

    def test_full_replay_writes_reviewable_report(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp=Path(tmp); source=tmp/'predictions.json'; source.write_text(json.dumps(predictions()))
            result=run_monitor(source,tmp/'report',tmp/'s',as_of=date(2026,10,3),min_growth_cells=2)
            self.assertEqual(result['delivery']['mode'],'dry-run')
            self.assertTrue((tmp/'report/monitor.html').exists())


if __name__=='__main__': unittest.main()
