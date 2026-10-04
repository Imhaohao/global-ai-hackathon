"""Self-contained HTML/SVG and JSON reports; no web maps, fonts, or CDNs."""

import html
import json
from pathlib import Path


LABELS = {"insufficient": "Insufficient observations", "no_threshold_drop": "No threshold drop observed",
          "change": "Vegetation change—check this area", "small_change": "Change below zone size setting",
          "outside_target": "Outside the coffee inspection area"}
COLORS = {"insufficient": "url(#missing-{index})", "no_threshold_drop": "#d6e5d0",
          "change": "#edaa54", "small_change": "#b1c8ea", "outside_target": "#edf0e9"}


def number(value):
    return "unavailable" if value is None else f"{value:.3f}"


def map_svg(report, frame, index):
    grid, config = report["grid"], report["config"]
    rows, cols = grid["rows"], grid["cols"]
    cell = 24
    width, height = cols*cell, rows*cell
    demo_label = "DEMO · synthetic schematic" if report["synthetic"] else "Prepared-data inspection grid"
    bits = [f'<svg xmlns="http://www.w3.org/2000/svg" class="field-map" viewBox="-32 -32 {width+64} {height+80}" '
            f'role="group" aria-label="{html.escape(demo_label)} for {frame["date"]}">',
            f'<rect x="-32" y="-32" width="{width+64}" height="{height+80}" fill="#fafbf7" pointer-events="none"/>',
            f'<defs><pattern id="missing-{index}" width="8" height="8" patternUnits="userSpaceOnUse">'
            '<rect width="8" height="8" fill="#e4e7ed"/>'
            '<path d="M-2 2L2-2M0 8L8 0M6 10L10 6" stroke="#8f9aad" stroke-width="1.5"/>'
            '</pattern></defs>']
    for c in range(cols):
        if c % 2 == 0:
            bits.append(f'<text class="axis" fill="#657166" font-size="11" x="{c*cell+12}" y="-10" text-anchor="middle">{c+1}</text>')
    for r in range(rows):
        if r % 2 == 0:
            bits.append(f'<text class="axis" fill="#657166" font-size="11" x="-10" y="{r*cell+16}" text-anchor="end">{r+1}</text>')
        for c in range(cols):
            state = frame["status"][r][c]
            fill = COLORS[state].format(index=index)
            details = (f"Row {r+1}, column {c+1}: {LABELS[state]}. "
                       f"Baseline NDVI {number(report['frames'][0]['ndvi'][r][c])}; "
                       f"selected NDVI {number(frame['ndvi'][r][c])}; "
                       f"change {number(frame['ndvi_change'][r][c])}. "
                       f"Valid observations through this date: {frame['valid_observation_counts'][r][c]}. "
                       f"{frame['reasons'][r][c] or ''}")
            attrs = '' if state == "outside_target" else (
                f' tabindex="0" role="button" data-detail="{html.escape(details, quote=True)}" '
                f'aria-label="{html.escape(details, quote=True)}"')
            bits.append(f'<rect class="cell" x="{c*cell}" y="{r*cell}" width="24" height="24" '
                        f'fill="{fill}" stroke="#fff" stroke-width="0.7"{attrs}>'
                        f'<title>{html.escape(details)}</title></rect>')
    for zone in frame["zones"]:
        x1,y1,x2,y2 = zone["bbox"]
        # A bounding box is only a visual locator; zone cells are the actual mask.
        bits.append(f'<rect class="zone-box zone-{zone["rank"]}" x="{x1*cell-2}" y="{y1*cell-2}" '
                    f'width="{(x2-x1)*cell+4}" height="{(y2-y1)*cell+4}" fill="none" '
                    'stroke="#613413" stroke-width="2" stroke-dasharray="5 3" pointer-events="none"/>')
        bits.append(f'<circle cx="{x1*cell}" cy="{y1*cell}" r="12" fill="#613413" pointer-events="none"/>'
                    f'<text x="{x1*cell}" y="{y1*cell+4}" class="rank" fill="#fff" font-size="13" text-anchor="middle" '
                    f'pointer-events="none">{zone["rank"]}</text>')
    bits.append(f'<text x="0" y="{height+30}" class="map-caption" fill="#657166" font-size="12">{html.escape(demo_label)} · '
                f'{"no real coordinates or scale" if report["synthetic"] else "row/column locators; verify in the field"}</text></svg>')
    return ''.join(bits)


def frame_html(report, frame, index):
    cov = frame["coverage"]
    valid, comparable, total = cov["valid_current_cells"], cov["comparable_cells"], cov["target_cells"]
    if frame["overall_status"] == "insufficient_observations":
        headline = "Insufficient observations"
        summary = "There is no usable baseline-to-date comparison for this coffee area. More usable observations are needed."
    elif frame["overall_status"] == "vegetation_change":
        headline = "Vegetation change—check these areas"
        summary = "Start with the ranked areas below. The change has many possible causes; a field visit is needed."
    else:
        headline = "No threshold drop in comparable cells"
        summary = "The illustrative drop threshold was not reached in the cells we can compare. This does not establish crop health."
    zones = []
    for zone in frame["zones"]:
        x1,y1,x2,y2 = zone["bbox"]
        zones.append(f'<li><button class="zone-select" data-rank="{zone["rank"]}">'
                     f'<span class="zone-rank">{zone["rank"]}</span><span><strong>Vegetation change—check this area</strong>'
                     f'<small>Rows {y1+1}–{y2}, columns {x1+1}–{x2} · {zone["cell_count"]} cells</small>'
                     f'<small>Mean NDVI change {zone["mean_ndvi_change"]:.3f} from baseline</small></span></button></li>')
    empty = ("No inspection zones can be ranked with these observations." if comparable == 0 else
             "No grouped zones meet both illustrative settings on this date.")
    listing = '<ol class="zones">'+''.join(zones)+'</ol>' if zones else f'<p class="empty">{empty}</p>'
    small_note = (f'<p>{frame["small_change_cells"]} changed cells fall below the minimum zone size; '
                  'they remain blue on the map and are not labelled stable.</p>') if frame["small_change_cells"] else ''
    badge = "DEMO DATA" if report["synthetic"] else "PREPARED LOCAL DATA"
    return f'''<section class="frame" data-index="{index}" aria-label="Observation {frame['date']}">
      <div class="frame-heading"><div><span class="eyebrow">{badge} · OBSERVATION DATE</span>
      <h2>{frame['date']}</h2></div><span class="coverage-pill">{valid/total:.0%} valid coverage</span></div>
      <div class="result"><h3>{headline}</h3><p>{summary}</p></div>
      <div class="metrics"><div><strong>{valid}/{total}</strong><span>valid on selected date</span></div>
      <div><strong>{comparable}/{total}</strong><span>can compare with baseline</span></div>
      <div><strong>{cov['insufficient_cells']}</strong><span>insufficient for comparison</span></div></div>
      <div class="report-grid"><div class="map-panel">{map_svg(report, frame, index)}
      <div class="legend"><span><i class="key change"></i>Check this area</span>
      <span><i class="key normal"></i>No threshold drop</span><span><i class="key missing"></i>Insufficient</span>
      <span><i class="key outside"></i>Outside coffee area</span><span><i class="key small"></i>Below zone size</span></div>
      <p class="cell-detail" aria-live="polite">Select a coffee cell to see observations. Row/column labels are schematic locators.</p>
      </div><aside><h3>Inspection order</h3><p>Ranked by mean NDVI decline, then zone size. Rankings apply to this date.</p>
      {listing}{small_note}<div class="unknown"><strong>Keep the unknown areas in view</strong>
      <p>{cov['insufficient_cells']} cells have insufficient observations. Cloud, shadow, missing bands, invalid sums,
      a missing baseline, or too few dates can prevent a comparison.</p></div>
      </aside></div><p class="source">Source: {html.escape(frame['source'])}</p></section>'''


STYLE = '''
:root{color-scheme:light;--ink:#213b2c;--muted:#55675b;--line:#dbe2d8;--paper:#fafbf7}
*{box-sizing:border-box}body{margin:0;background:#eef2e9;color:var(--ink);font:16px/1.5 system-ui,-apple-system,Segoe UI,sans-serif}
main{max-width:1160px;margin:32px auto;padding:0 24px 40px}.banner{background:#eedcaf;color:#4e3d16;padding:12px 20px;border-radius:12px;margin-bottom:28px;font-weight:650}
.eyebrow{font-size:11px;letter-spacing:1.5px;font-weight:750;color:var(--muted)}h1{font-size:clamp(30px,4vw,44px);line-height:1.13;letter-spacing:-1.3px;margin:10px 0 14px}h2{font-size:27px;margin:3px 0}h3{font-size:19px;margin:0 0 8px}p{margin:0 0 12px}.intro{max-width:820px;color:var(--muted)}
.toolbar{margin:24px 0;background:#fff;border:1px solid var(--line);padding:20px;border-radius:16px}.slider-row{display:flex;gap:20px;align-items:center}.slider-row label{min-width:135px;font-weight:650}input[type=range]{flex:1;accent-color:#416747;min-width:60px}output{font-weight:700;white-space:nowrap}button{font:inherit;cursor:pointer}button:focus-visible,input:focus-visible,.cell:focus-visible{outline:3px solid #386acc;outline-offset:3px}.nav-btn{border:1px solid var(--line);border-radius:7px;background:var(--paper);padding:5px 10px}.dates{display:flex;justify-content:space-between;font-size:12px;color:var(--muted);margin:12px 0 0}
.frame{background:#fff;border:1px solid var(--line);border-radius:20px;padding:26px;margin:24px 0}.frame[hidden]{display:none}.frame-heading{display:flex;justify-content:space-between;align-items:center;gap:12px}.coverage-pill{background:#eef2e9;padding:8px 13px;border-radius:30px;font-size:13px;font-weight:650}.result{background:var(--paper);border-left:4px solid #aeb995;padding:16px 18px;margin:20px 0}.result p{color:var(--muted);margin:0}.metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-bottom:26px}.metrics div{border-bottom:1px solid var(--line);padding:0 0 14px}.metrics strong{display:block;font-size:24px;letter-spacing:-.5px}.metrics span{font-size:13px;color:var(--muted)}
.report-grid{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(260px,1fr);gap:30px}.map-panel{min-width:0}.field-map{width:100%;height:auto;background:#fafbf7;border:1px solid var(--line);border-radius:12px}.axis{font-size:11px;fill:#657166}.map-caption{font-size:12px;fill:#657166}.rank{fill:white;font-size:13px;font-weight:bold}.cell[role=button]{cursor:crosshair}.cell.selected{stroke:#234e95;stroke-width:3}.zone-box.selected{stroke:#234e95;stroke-width:4;stroke-dasharray:none}.legend{display:flex;flex-wrap:wrap;gap:8px 16px;margin:14px 0;font-size:12px}.legend span{display:flex;align-items:center;gap:6px}.key{display:inline-block;width:14px;height:14px;border:1px solid #adb6a7;border-radius:3px}.change{background:#edaa54}.normal{background:#d6e5d0}.outside{background:#edf0e9}.small{background:#b1c8ea}.missing{background:repeating-linear-gradient(135deg,#e4e7ed,#e4e7ed 3px,#8f9aad 3px,#8f9aad 4px)}
.cell-detail{background:#f0f4f9;color:#44536a;border-radius:8px;padding:12px;font-size:13px;min-height:68px}aside>p{color:var(--muted);font-size:14px}.zones{list-style:none;padding:0;margin:18px 0}.zones li{margin-bottom:12px}.zone-select{display:flex;gap:12px;text-align:left;width:100%;background:#fff9ee;border:1px solid #e2cfab;border-radius:12px;padding:15px;color:var(--ink)}.zone-select:hover{background:#fbeed8}.zone-rank{flex-shrink:0;border-radius:50%;background:#613413;color:white;width:26px;height:26px;text-align:center}.zone-select strong{font-size:15px}.zone-select small{display:block;color:var(--muted);margin-top:7px}.unknown{background:#f1f3f7;border-radius:12px;padding:16px;font-size:14px;margin-top:20px}.unknown p{color:#536174;margin:8px 0 0}.empty{padding:18px;background:var(--paper);border-radius:12px;color:var(--muted)}.source{font-size:12px;color:var(--muted);margin:22px 0 0}
details{background:#fff;border:1px solid var(--line);border-radius:12px;padding:18px;margin-top:18px}summary{cursor:pointer;font-weight:650}details p{margin:12px 0 0;font-size:14px;color:var(--muted)}footer{font-size:13px;color:var(--muted);margin-top:24px}.offline{display:inline-block;padding:5px 9px;background:#e3ecdc;border-radius:7px;font-size:12px;margin-bottom:12px}
@media(max-width:760px){main{margin:18px auto;padding:0 12px 26px}.frame{padding:18px}.report-grid{grid-template-columns:1fr}.slider-row{flex-wrap:wrap;gap:10px}.slider-row label{width:100%}.dates{font-size:10px}.metrics{gap:8px}.metrics strong{font-size:21px}.metrics span{font-size:11px}.frame-heading{align-items:flex-start}.coverage-pill{font-size:11px}.map-caption{font-size:11px}}
@media print{body{background:white}main{padding:0}.toolbar{display:none}.frame[hidden]{display:block}.frame{break-inside:avoid}.report-grid{grid-template-columns:1.3fr 1fr}.cell-detail{display:none}}
'''

SCRIPT = '''
(()=>{
  const frames=Array.from(document.querySelectorAll('.frame'));
  const slider=document.getElementById('date-slider'), date=document.getElementById('selected-date');
  const previous=document.getElementById('previous'),next=document.getElementById('next');
  function show(index){
    index=Math.max(0,Math.min(frames.length-1,index));
    frames.forEach((frame,i)=>{frame.hidden=i!==index});
    slider.value=index;date.textContent=frames[index].querySelector('h2').textContent;
    previous.disabled=index===0;next.disabled=index===frames.length-1;
    slider.setAttribute('aria-valuetext',date.textContent);
  }
  slider.addEventListener('input',()=>show(Number(slider.value)));
  previous.addEventListener('click',()=>show(Number(slider.value)-1));
  next.addEventListener('click',()=>show(Number(slider.value)+1));
  frames.forEach(frame=>{
    function selectCell(cell){
      frame.querySelectorAll('.cell.selected').forEach(el=>el.classList.remove('selected'));
      cell.classList.add('selected');frame.querySelector('.cell-detail').textContent=cell.dataset.detail;
    }
    frame.querySelectorAll('.cell[data-detail]').forEach(cell=>{
      cell.addEventListener('click',()=>selectCell(cell));
      cell.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();selectCell(cell)}});
    });
    frame.querySelectorAll('.zone-select').forEach(button=>button.addEventListener('click',()=>{
      frame.querySelectorAll('.zone-box').forEach(el=>el.classList.remove('selected'));
      const box=frame.querySelector('.zone-'+button.dataset.rank);if(box)box.classList.add('selected');
      frame.querySelector('.cell-detail').textContent='Inspection area '+button.dataset.rank+
        ': use the numbered outline to locate the changed cells. The box is a locator; orange cells define the zone.';
    }));
  });
  document.getElementById('date-controls').hidden=false;
  show(frames.length-1);
})();
'''


def render_html(report):
    config = report["config"]
    frames = ''.join(frame_html(report, frame, i) for i, frame in enumerate(report["frames"]))
    dates = ''.join(f'<span>{f["date"]}</span>' for f in report["frames"])
    if report["synthetic"]:
        banner = "DEMO · Synthetic observations and illustration · No real field or satellite imagery"
        context = ("Noor is fictional and farms 2 hectares total, with coffee on only part. "
                   "This coffee-area schematic has no real location, scale or measured area.")
    else:
        banner = "PROTOTYPE · Prepared local observations · Field verification required"
        context = "This report uses externally prepared observations. Alignment and reflectance comparability are not verified by this prototype."
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8">
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:; connect-src 'none'; base-uri 'none'; form-action 'none'">
      <title>{html.escape(report['label'])} · vegetation inspection</title><style>{STYLE}</style></head>
      <body><main><div class="banner">{banner}</div><header><span class="eyebrow">GLOBAL AI HACKATHON · SATELLITE HOTSPOTS PROTOTYPE</span>
      <h1>A few areas to check.<br>A clearer place to start.</h1><p class="intro">{html.escape(report['label'])} · {context}</p>
      <p class="intro">Use vegetation change to plan a field visit. The report does not identify a disease or recommend treatment.</p></header>
      <div class="toolbar"><span class="offline">Offline ready · no connection needed</span>
      <div id="date-controls" hidden><div class="slider-row"><label for="date-slider">Observation date</label>
      <button class="nav-btn" id="previous" aria-label="Previous observation">←</button>
      <input type="range" id="date-slider" min="0" max="{len(report['frames'])-1}" step="1" value="{len(report['frames'])-1}">
      <button class="nav-btn" id="next" aria-label="Next observation">→</button><output id="selected-date" for="date-slider"></output></div>
      <div class="dates">{dates}</div></div><noscript><p>Interactive controls need JavaScript. All dated reports are shown below.</p></noscript>
      <p class="source">Fixed baseline: {report['baseline_date']} · Valid coverage is for the coffee inspection mask. Comparison coverage can be lower.</p></div>
      {frames}<details open><summary>How these inspection areas were chosen</summary>
      <p>NDVI = (NIR − red) / (NIR + red). Only unmasked cells with both bands and a nonzero sum are usable.
      A decline of at least {config['ndvi_drop_threshold']:g} from the fixed baseline flags a cell, provided it has at least
      {config['min_valid_observations']} usable dated observations through the selected date. Four-neighbour groups of at least
      {config['min_zone_cells']} changed cells become inspection zones. No smoothing fills cloud gaps.</p>
      <p>All settings are illustrative, configurable and not agronomically validated. A rank is an inspection order, not confidence or disease probability.
      “No threshold drop” describes comparable cells only; unknown cells remain unknown. Zone numbering may change across dates.</p></details>
      <details><summary>What this prototype still needs for real fields</summary>
      <p>Suitable red/NIR archives with enough usable dates, permissions, externally verified registration and reflectance harmonization,
      reliable masks, crop boundaries, shade-canopy handling, seasonal calibration and ground observations. Fine visual products can have
      coarser native multispectral measurements. This illustration says nothing about a real archive’s coverage.</p></details>
      <footer>Save this HTML file to keep the report available offline. Refresh requires newly prepared observations and a new local report;
      nothing downloads or updates automatically. A leaf-image model cannot be used on satellite views as-is.</footer></main>
      <script>{SCRIPT}</script></body></html>'''


def write_report(report, output_dir):
    output = Path(output_dir)
    output.mkdir(parents=True, exist_ok=True)
    (output / "report.json").write_text(json.dumps(report, indent=2, ensure_ascii=False, allow_nan=False)+"\n", encoding="utf-8")
    (output / "report.html").write_text(render_html(report), encoding="utf-8")
    return output / "report.html"
