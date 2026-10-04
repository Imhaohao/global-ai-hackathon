"""Replay observations, track anomaly extent, and queue SMS drafts idempotently.

No provider download, disease diagnosis, or scheduler installation occurs here.
"""
import hashlib
import html
import json
import math
import os
import re
import sqlite3
from datetime import date, datetime, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen
import base64
from contextlib import contextmanager

from .engine import groups
from .providers import InputError, finite_number, matrix, read_json, validate_grid


@contextmanager
def database(path):
    db=sqlite3.connect(path)
    try:
        with db:
            yield db
    finally:
        db.close()


def validate_prediction_observation(obs, grid, names):
    rows, cols = grid['rows'], grid['cols']
    try:
        d=date.fromisoformat(obs['date'])
        if d.isoformat()!=obs['date']: raise ValueError()
    except (ValueError,KeyError,TypeError) as exc:
        raise InputError('Invalid prediction acquisition date') from exc
    if obs.get('grid')!=grid:
        raise InputError('Prediction grids differ; registration must be verified externally')
    if not isinstance(obs.get('source'),str) or not obs['source']:
        raise InputError('Prediction source is required')
    matrix(obs.get('valid'),rows,cols,'valid','bool')
    scores=obs.get('scores')
    if not isinstance(scores,dict) or not scores: raise InputError('Scores are required')
    if names is None: names=set(scores)
    if set(scores)!=names: raise InputError('Classes changed across acquisitions')
    for name, values in scores.items():
        if not re.fullmatch(r'[a-z][a-z0-9_]*',name): raise InputError('Invalid class name')
        matrix(values,rows,cols,name,'band')
        if any(v is None for row in values for v in row):
            raise InputError('Scores must be finite; use validity mask for unknown cells')
    return names


def validate_predictions(data):
    if not isinstance(data, dict) or data.get('schema_version') != 1:
        raise InputError('Use prediction schema_version 1')
    validate_grid(data.get('grid'))
    grid=data['grid']; rows,cols=grid['rows'],grid['cols']
    for key in ('field_id','label','model_version','sensor'):
        if not isinstance(data.get(key),str) or not data[key].strip():
            raise InputError(f'Prediction {key} is required')
    if type(data.get('synthetic')) is not bool or type(data.get('domain_validated')) is not bool:
        raise InputError('Declare synthetic and domain_validated explicitly')
    if not data['synthetic'] and (grid['crs']=='DEMO_LOCAL' or grid['units']=='demo_units'):
        raise InputError('Real observations require real coordinates')
    if not data['synthetic'] and not data.get('preparation'):
        raise InputError('Real observations need alignment, quality and radiometry preparation notes')
    matrix(data.get('target_mask'),rows,cols,'target_mask','bool')
    if not any(any(row) for row in data['target_mask']):
        raise InputError('Empty target area')
    observations=data.get('observations')
    if not isinstance(observations,list) or not observations:
        raise InputError('Predictions require acquisition dates')
    dates=[]; names=None
    for obs in observations:
        names = validate_prediction_observation(obs, grid, names)
        dates.append(obs['date'])
    if dates != sorted(set(dates)): raise InputError('Prediction dates must be unique and ordered')
    return data


def load_predictions(path):
    path=Path(path); data=read_json(path)
    # Arrays can be external compressed NPZ files. Never deserialize pickle/object arrays.
    for obs in data.get('observations',[]):
        if 'scores_file' in obs:
            import numpy as np
            source=(path.parent/obs['scores_file']).resolve()
            if not source.is_relative_to(path.parent.resolve()):
                raise InputError('scores_file must stay inside the prediction directory')
            with np.load(source,allow_pickle=False) as arrays:
                obs['scores']={c:arrays[c].tolist() for c in data['classes']}
    return validate_predictions(data)


def track(data, as_of=None, threshold=0.65, min_cells=4, min_coverage=0.9,
          min_growth_cells=4, max_age_days=7):
    validate_predictions(data)
    if not (0<threshold<1 and 0<min_coverage<=1): raise InputError('Invalid tracking thresholds')
    if min_cells<1 or min_growth_cells<1 or max_age_days<0: raise InputError('Invalid tracking limits')
    as_of=as_of or date.today()
    grid=data['grid']; target={(r,c) for r in range(grid['rows']) for c in range(grid['cols'])
                              if data['target_mask'][r][c]}
    cell_area=grid['transform'][0]*-grid['transform'][4] if grid['units']=='metres' else None
    previous={}; previous_valid=set(); previous_date=None; counter=0; frames=[]; events=[]
    for obs in data['observations']:
        acquisition=date.fromisoformat(obs['date'])
        if acquisition>as_of: raise InputError('Future acquisition; refuse monitoring')
        valid={p for p in target if obs['valid'][p[0]][p[1]]}
        coverage=len(valid)/len(target)
        frame={'date':obs['date'],'source':obs['source'],'coverage':coverage,'zones':[],
               'valid':obs['valid'],
               'gap_days':(acquisition-date.fromisoformat(previous_date)).days if previous_date else None}
        if coverage < min_coverage:
            frame['status']='insufficient_coverage'; frames.append(frame); continue
        current={}; frame['status']='usable_observation'
        common=valid & previous_valid
        for name,scores in obs['scores'].items():
            cells={p for p in valid if scores[p[0]][p[1]]>=threshold}
            components=[set(g) for g in groups(cells) if len(g)>=min_cells]
            old=previous.get(name,[]); current[name]=[]
            for component in components:
                matches=[z for z in old if component & z['cells']]
                # All overlapping parents survive in the lineage. Split children receive fresh IDs.
                if len(matches)==1 and not any(z['track_id']==matches[0]['track_id'] for z in current[name]):
                    identity=matches[0]['track_id']
                else:
                    counter+=1; identity=f'T{counter:04d}'
                parents=[z['track_id'] for z in matches]
                old_union=set().union(*(z['cells'] for z in matches)) if matches else set()
                new_confirmed=(component & common)-old_union if previous_date else set()
                persistent=component & old_union & common
                previous_visible=bool(matches) and old_union<=valid
                zone={'track_id':identity,'class':name,'cells':component,
                      'parent_track_ids':parents,'cell_count':len(component),
                      'area_m2':len(component)*cell_area if cell_area else None,
                      'new_comparable_cells':len(new_confirmed),
                      'persistent_cells':len(persistent),
                      'extent_change_observable':previous_visible,
                      'bbox':[min(c for r,c in component),min(r for r,c in component),
                              max(c for r,c in component)+1,max(r for r,c in component)+1],
                      'mean_score':sum(scores[r][c] for r,c in component)/len(component)}
                current[name].append(zone)
                # Require matched persistence and full visibility of the previous affected extent.
                # New first sightings are logged on the map, never called progression.
                if persistent and previous_visible and len(new_confirmed)>=min_growth_cells:
                    delta=len(component & common)-len(old_union & common)
                    if delta>=min_growth_cells:
                        x=grid['transform'][2]+(zone['bbox'][0]+zone['bbox'][2])*grid['transform'][0]/2
                        y=grid['transform'][5]+(zone['bbox'][1]+zone['bbox'][3])*grid['transform'][4]/2
                        events.append({'field_id':data['field_id'],'date':obs['date'],
                            'previous_date':previous_date,'model_version':data['model_version'],
                            'track_id':identity,'class':name,'type':'anomaly_extent_increase',
                            'cell_count':len(component),'net_growth_cells':delta,
                            'new_comparable_cells':len(new_confirmed),
                            'persistent_cells':len(persistent),'area_m2':zone['area_m2'],
                            'locator':{'x':x,'y':y,'crs':grid['crs'],'bbox':zone['bbox']},
                            'diagnosis_confirmed':False})
            frame['zones'].extend([{**z,'cells':[list(p) for p in sorted(z['cells'])]} for z in current[name]])
        previous=current; previous_valid=valid; previous_date=obs['date']; frames.append(frame)
    latest=data['observations'][-1]['date']
    age=(as_of-date.fromisoformat(latest)).days
    fresh=age<=max_age_days and frames[-1]['status']=='usable_observation'
    # Only current acquisition events may queue an alert. Never text historical replay events.
    pending=[e for e in events if e['date']==latest] if fresh else []
    return {'schema_version':1,'label':data['label'],'field_id':data['field_id'],
            'grid':grid,'target_mask':data['target_mask'],'model_version':data['model_version'],'sensor':data['sensor'],
            'synthetic':data['synthetic'],'domain_validated':data['domain_validated'],
            'as_of':as_of.isoformat(),'latest_acquisition':latest,'age_days':age,
            'status':'current' if fresh else ('stale_imagery' if age>max_age_days else 'insufficient_coverage'),
            'score_threshold':threshold,'threshold_calibrated':False,'frames':frames,
            'events':events,'pending_alerts':pending,
            'interpretation':'Visible anomaly extent changed. This does not establish disease progression or pest spread.'}


def sms_body(result, event):
    name=event['class'].replace('_',' ')
    area=f"{event['area_m2']:.1f} m2" if event['area_m2'] is not None else f"{event['cell_count']} grid cells"
    box=event['locator']['bbox']; prefix='TEST - ' if result['synthetic'] or not result['domain_validated'] else ''
    return (f"{prefix}{result['label']}: suspected {name} area increased to {area} in imagery from "
            f"{event['date']}. Inspect rows {box[1]+1}-{box[3]}, columns {box[0]+1}-{box[2]}. "
            'Cause unconfirmed; inspect plants.')


def queue_alerts(result, state_path):
    path=Path(state_path); path.parent.mkdir(parents=True,exist_ok=True)
    with database(path) as db:
        db.execute('CREATE TABLE IF NOT EXISTS outbox (id TEXT PRIMARY KEY, body TEXT NOT NULL, '
                   'status TEXT NOT NULL, created TEXT NOT NULL, provider_sid TEXT, error TEXT)')
        db.execute('CREATE TABLE IF NOT EXISTS acquisitions (id TEXT PRIMARY KEY, field TEXT, date TEXT, status TEXT)')
        obskey=f"{result['field_id']}:{result['model_version']}:{result['latest_acquisition']}"
        db.execute('INSERT OR IGNORE INTO acquisitions VALUES (?,?,?,?)',
                   (obskey,result['field_id'],result['latest_acquisition'],result['status']))
        for event in result['pending_alerts']:
            key=json.dumps({k:event[k] for k in ('field_id','model_version','date','class','track_id')},sort_keys=True)
            identity=hashlib.sha256(key.encode()).hexdigest()
            db.execute('INSERT OR IGNORE INTO outbox (id,body,status,created) VALUES (?,?,?,?)',
                       (identity,sms_body(result,event),'draft',datetime.now(timezone.utc).isoformat()))
        rows=db.execute('SELECT id,body,status,provider_sid,error FROM outbox ORDER BY created,id').fetchall()
    return [dict(zip(('id','body','status','provider_sid','error'),r)) for r in rows]


def send_sms(result, state_path, config, sender=None):
    """Explicit live switch, validated domain, and registered recipient required.

    Claim before the request; uncertain sends are never retried automatically.
    This prevents a timeout/crash from producing duplicate farmer messages.
    """
    if config.get('mode')!='live': return {'sent':0,'mode':'dry-run'}
    if (result['synthetic'] or not result['domain_validated'] or
            not config.get('validation_record') or result['status']!='current'):
        raise InputError('Live SMS requires real current observations and a domain validation record')
    if result['as_of'] != date.today().isoformat():
        raise InputError('Historical replay cannot send live SMS; run with the actual current date')
    if config.get('field_id')!=result['field_id']: raise InputError('SMS recipient field mismatch')
    recipient=config.get('to','')
    if not re.fullmatch(r'\+[1-9][0-9]{7,14}',recipient): raise InputError('Supply recipient in E.164 format')
    if config.get('recipient_consented') is not True: raise InputError('Record farmer consent for alerts')
    if sender is None:
        account=os.environ.get('TWILIO_ACCOUNT_SID',''); token=os.environ.get('TWILIO_AUTH_TOKEN','')
        origin=os.environ.get('TWILIO_FROM','')
        if not re.fullmatch(r'AC[a-fA-F0-9]{32}',account) or not token or not origin:
            raise InputError('Missing Twilio environment configuration')
        def sender(body):
            auth=base64.b64encode(f'{account}:{token}'.encode()).decode()
            req=Request(f'https://api.twilio.com/2010-04-01/Accounts/{account}/Messages.json',
                        data=urlencode({'To':recipient,'From':origin,'Body':body}).encode(),
                        headers={'Authorization':'Basic '+auth},method='POST')
            with urlopen(req,timeout=20) as response:
                payload=json.loads(response.read())
            return payload['sid']
    sent=0
    # Only IDs attributable to this fresh result may be sent; never flush stale old drafts.
    eligible=set()
    for event in result['pending_alerts']:
        key=json.dumps({k:event[k] for k in ('field_id','model_version','date','class','track_id')},sort_keys=True)
        eligible.add(hashlib.sha256(key.encode()).hexdigest())
    for identity in sorted(eligible):
        with database(state_path) as db:
            db.execute('BEGIN IMMEDIATE')
            row=db.execute("SELECT body FROM outbox WHERE id=? AND status='draft'",(identity,)).fetchone()
            if row is None: continue
            db.execute("UPDATE outbox SET status='sending' WHERE id=?",(identity,))
        try:
            sid=sender(row[0])
            if not isinstance(sid,str) or not sid: raise ValueError('Missing provider receipt')
            status,error='accepted',None; sent+=1
        except Exception:
            # Do not log request details/credentials. Provider may already have accepted it.
            sid,status,error=None,'unknown','Provider outcome uncertain; reconcile manually before retry'
        with database(state_path) as db:
            db.execute('UPDATE outbox SET status=?,provider_sid=?,error=? WHERE id=?',
                       (status,sid,error,identity))
    return {'sent':sent,'mode':'live','meaning':'accepted by provider, not delivery confirmation'}


def write_monitor_report(result, outbox, output):
    output=Path(output); output.mkdir(parents=True,exist_ok=True)
    (output/'monitor.json').write_text(json.dumps(result,indent=2,allow_nan=False)+'\n')
    (output/'sms-outbox.json').write_text(json.dumps(outbox,indent=2)+'\n')
    cards=[]; width=result['grid']['cols']; height=result['grid']['rows']
    for index,frame in enumerate(result['frames']):
        pixels=[]; listings=[]
        for r in range(height):
            for c in range(width):
                if result['target_mask'][r][c] and not frame['valid'][r][c]:
                    pixels.append(f'<rect x="{c}" y="{r}" width="1" height="1" fill="url(#unknown-{index})"/>')
                elif not result['target_mask'][r][c]:
                    pixels.append(f'<rect x="{c}" y="{r}" width="1" height="1" fill="#fafbf7"/>')
        for i,z in enumerate(frame['zones']):
            color=['#c96535','#aa7828','#267e99','#5d873c'][i%4]
            for r,c in z['cells']:
                pixels.append(f'<rect x="{c}" y="{r}" width="1" height="1" fill="{color}" opacity=".65"/>')
            area=f"{z['area_m2']:.1f} m²" if z['area_m2'] is not None else f"{z['cell_count']} cells"
            listings.append(f"<li>{html.escape(z['track_id'])}: {html.escape(z['class'].replace('_',' '))} — {area}; "
                            f"{z['new_comparable_cells']} new comparable cells; "
                            f"{z['persistent_cells']} persistent cells.</li>")
        cards.append(f"<section><h2>{frame['date']}</h2><p>{html.escape(frame['status'])}; "
                     f"{frame['coverage']:.0%} usable coverage</p><svg viewBox='0 0 {width} {height}' "
                     f"aria-label='Anomaly locations on {frame['date']}'><rect width='{width}' height='{height}' "
                     f"fill='#edf0e9'/><defs><pattern id='unknown-{index}' width='1' height='1' patternUnits='userSpaceOnUse'>"
                     "<rect width='1' height='1' fill='#d4d9e1'/><path d='M0 1L1 0' stroke='#8b95a5' stroke-width='.15'/>"
                     f"</pattern></defs>{''.join(pixels)}</svg><ul>{''.join(listings)}</ul></section>")
    messages=''.join(f"<li>{html.escape(x['body'])} <small>({html.escape(x['status'])})</small></li>" for x in outbox)
    body=f'''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width">
    <title>Crop inspection monitoring</title><style>body{{font:16px system-ui;max-width:1000px;margin:32px auto;padding:20px;background:#fafbf7;color:#273b2c}}section{{padding:20px;margin:20px 0;background:white;border:1px solid #dae1d4}}svg{{width:100%;max-height:400px}}small{{color:#647368}}</style>
    <h1>{html.escape(result['label'])}</h1><p><strong>Research prototype</strong> · {html.escape(result['status'])} · latest image {result['latest_acquisition']}</p>
    <p>{html.escape(result['interpretation'])}</p><p>Scores and thresholds are uncalibrated. Missing imagery provides no evidence of health or recovery. Hatched cells are unknown; grey indicates no displayed anomaly, not confirmed health.</p>
    <h2>SMS drafts and provider receipts</h2><ul>{messages or '<li>No new alert.</li>'}</ul>{''.join(cards)}</html>'''
    (output/'monitor.html').write_text(body,encoding='utf-8')
    return output/'monitor.html'


def run_monitor(predictions, output, state_path, as_of=None, sms_config=None, **settings):
    data=load_predictions(predictions)
    result=track(data,as_of=as_of,**settings)
    outbox=queue_alerts(result,state_path)
    delivery=send_sms(result,state_path,sms_config or {'mode':'dry-run'})
    result['delivery']=delivery
    # Refresh provider receipts after any explicit live sends.
    outbox=queue_alerts(result,state_path)
    write_monitor_report(result,outbox,output)
    return result
