/* Optional development check using Node's standard library, not a demo dependency.
 * Exercises the actual generated inline script in a small DOM stub; no browser,
 * rendering, URL navigation, HTTP server or network calls occur here.
 * Run: node tests/test_controls.cjs demo-output/report.html
 */
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const page = fs.readFileSync(process.argv[2] || 'demo-output/report.html', 'utf8');
const script = page.match(/<script>([\s\S]*?)<\/script>/)[1];
const sections = [...page.matchAll(/<section class="frame"[\s\S]*?<\/section>/g)].map(m => m[0]);
function element(values={}) {
  const classes = new Set();
  return Object.assign({hidden:false, disabled:false, listeners:{}, dataset:{}, attributes:{},
    classList:{add: cls => classes.add(cls), remove: cls => classes.delete(cls), contains: cls => classes.has(cls)},
    addEventListener(event, fn){this.listeners[event] = fn},
    setAttribute(key, value){this.attributes[key] = value},
    fire(event, payload={}){this.listeners[event]?.(payload)},
  }, values);
}
const decode = s => s.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const frames = sections.map(section => {
  const cells = [...section.matchAll(/data-detail="([^"]*)"/g)]
    .map(m => element({dataset:{detail:decode(m[1])}}));
  const buttons = [...section.matchAll(/class="zone-select" data-rank="(\d+)"/g)]
    .map(m => element({dataset:{rank:m[1]}}));
  const boxes = buttons.map(b => element({rank:b.dataset.rank}));
  const detail = element({textContent:''});
  const heading = element({textContent:section.match(/<h2>(.*?)<\/h2>/)[1]});
  return element({cells,buttons,boxes,detail,heading,
    querySelectorAll(selector){
      if (selector==='.cell[data-detail]') return cells;
      if (selector==='.zone-select') return buttons;
      if (selector==='.zone-box') return boxes;
      if (selector==='.cell.selected') return cells.filter(c=>c.classList.contains('selected'));
      throw Error('Unimplemented test selector '+selector);
    },
    querySelector(selector){
      if (selector==='h2') return heading;
      if (selector==='.cell-detail') return detail;
      if (selector.startsWith('.zone-')) return boxes.find(b=>b.rank===selector.slice(6));
      throw Error('Unimplemented test selector '+selector);
    }
  });
});
const controls = Object.fromEntries(['date-slider','selected-date','previous','next','date-controls']
                                    .map(id=>[id,element()]));
controls['date-controls'].hidden=true;
const document={querySelectorAll:selector => {assert.equal(selector,'.frame');return frames},
                getElementById:id=>controls[id]};
vm.runInNewContext(script,{document},{timeout:1000});
const slider=controls['date-slider'],previous=controls.previous,next=controls.next;
assert.equal(frames.length,4);
assert.deepEqual(frames.map(f=>f.hidden),[true,true,true,false]);
assert.equal(controls['selected-date'].textContent,'2026-07-13');
assert.equal(slider.attributes['aria-valuetext'],'2026-07-13');
assert.equal(next.disabled,true);
assert.equal(controls['date-controls'].hidden,false);
previous.fire('click');
assert.deepEqual(frames.map(f=>f.hidden),[true,true,false,true]);
assert.equal(controls['selected-date'].textContent,'2026-06-29');
assert.match(sections[2],/Insufficient observations/);
previous.fire('click');previous.fire('click');
assert.equal(previous.disabled,true);
assert.equal(controls['selected-date'].textContent,'2026-06-01');
slider.value=3;slider.fire('input');
assert.equal(next.disabled,true);
assert.equal(frames[3].buttons.length,2);
frames[3].buttons[0].fire('click');
assert.equal(frames[3].boxes[0].classList.contains('selected'),true);
frames[3].buttons[1].fire('click');
assert.equal(frames[3].boxes[0].classList.contains('selected'),false);
assert.equal(frames[3].boxes[1].classList.contains('selected'),true);
const unknown=frames[3].cells.find(c=>c.dataset.detail.includes('Missing valid baseline'));
unknown.fire('click');
assert.equal(unknown.classList.contains('selected'),true);
assert.match(frames[3].detail.textContent,/Insufficient observations.*Missing valid baseline/);
let prevented=false;
frames[3].cells[0].fire('keydown',{key:'Enter',preventDefault(){prevented=true}});
assert.equal(prevented,true);
assert.equal(unknown.classList.contains('selected'),false);
assert.equal(frames[3].cells[0].classList.contains('selected'),true);
assert.match(page,/connect-src 'none'/);
assert.doesNotMatch(page,/<script\s+src=|<link\s|<img\s/);
console.log('PASS: actual report script in isolated DOM stub.');
console.log('Checked date slider, previous/next, date labels, disabled ends, rank highlights,');
console.log('cell details, missing-baseline wording, keyboard selection and self-contained markup.');
console.log('No browser rendering or real browser interaction was performed.');
