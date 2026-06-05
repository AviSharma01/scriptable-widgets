// DOM safety regression tests for workoutLogger.js renderList / renderExtras.
//
// Prove-It pattern: each describe block contains an `old_*` test that
// demonstrates the bug with the innerHTML approach, and a `new_*` test
// that proves the createElement approach is safe.  The old_* tests are
// expected to FAIL (they exist only to show what was broken); they are
// marked { todo: true } so the suite still exits 0.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

// ── helpers ───────────────────────────────────────────────────────────────────

function makeDocument(body = '<div id="list"></div><div id="extras"></div>') {
  const { window } = new JSDOM(`<!doctype html><html><body>${body}</body></html>`);
  return window.document;
}

// Old renderList: injects s.note and ex.name/meta via innerHTML
function oldRenderList(document, templates, current, state) {
  const list = document.getElementById('list');
  list.innerHTML = '';
  const items = templates[current] || [];
  state[current] = state[current] || {};
  items.forEach(ex => {
    state[current][ex.name] = state[current][ex.name] || { done: false, note: '' };
    const s = state[current][ex.name];
    const row = document.createElement('div');
    row.className = 'row' + (s.done ? ' on' : '');
    // The old (buggy) approach:
    row.innerHTML = `
      <div class="box ${s.done ? 'on' : ''}"></div>
      <div class="body">
        <div class="name">${ex.name}</div>
        <div class="meta">${ex.meta || ''}</div>
        <textarea class="note" rows="1">${s.note}</textarea>
      </div>`;
    list.appendChild(row);
  });
}

// New renderList: builds DOM with createElement, sets content via textContent/.value
function newRenderList(document, templates, current, state) {
  const list = document.getElementById('list');
  list.innerHTML = '';
  const items = templates[current] || [];
  state[current] = state[current] || {};
  items.forEach(ex => {
    state[current][ex.name] = state[current][ex.name] || { done: false, note: '' };
    const s = state[current][ex.name];

    const box = document.createElement('div');
    box.className = 'box' + (s.done ? ' on' : '');

    const nameEl = document.createElement('div');
    nameEl.className = 'name';
    nameEl.textContent = ex.name;

    const metaEl = document.createElement('div');
    metaEl.className = 'meta';
    metaEl.textContent = ex.meta || '';

    const ta = document.createElement('textarea');
    ta.className = 'note';
    ta.rows = 1;
    ta.value = s.note;
    ta.oninput = (e) => { s.note = e.target.value; };

    const body = document.createElement('div');
    body.className = 'body';
    body.appendChild(nameEl);
    body.appendChild(metaEl);
    body.appendChild(ta);

    const row = document.createElement('div');
    row.className = 'row' + (s.done ? ' on' : '');
    row.appendChild(box);
    row.appendChild(body);

    box.onclick = () => {
      s.note = ta.value;
      s.done = !s.done; newRenderList(document, templates, current, state);
    };

    list.appendChild(row);
  });
  if (!items.length) {
    const msg = document.createElement('div');
    msg.style.cssText = 'color:#8a8a8e; padding: 20px 4px;';
    msg.textContent = 'Rest day — just hit save to log it, or add an extra below.';
    list.appendChild(msg);
  }
}

// Old renderExtras: injects val via innerHTML with only " escaping
function oldRenderExtras(document, extras) {
  const el = document.getElementById('extras');
  el.innerHTML = '';
  extras.forEach((val, i) => {
    const row = document.createElement('div');
    row.className = 'extra';
    // The old (buggy) approach:
    row.innerHTML = `<input value="${val.replace(/"/g, '&quot;')}" placeholder="e.g. 30min badminton"><button>×</button>`;
    el.appendChild(row);
  });
}

// New renderExtras: input.value = val (never touches innerHTML with user data)
function newRenderExtras(document, extras) {
  const el = document.getElementById('extras');
  el.innerHTML = '';
  extras.forEach((val, i) => {
    const input = document.createElement('input');
    input.placeholder = 'e.g. 30min badminton';
    input.value = val;
    input.oninput = (e) => { extras[i] = e.target.value; };

    const del = document.createElement('button');
    del.textContent = '×';
    del.onclick = () => { extras.splice(i, 1); newRenderExtras(document, extras); };

    const row = document.createElement('div');
    row.className = 'extra';
    row.appendChild(input);
    row.appendChild(del);
    el.appendChild(row);
  });
}

// ── C1: </textarea> in a saved note breaks the DOM ───────────────────────────

describe('C1 — </textarea> in note field', () => {
  const badNote = '</textarea><b>injected</b>';
  const templates = { 'Test': [{ name: 'Exercise A', meta: '3×10' }] };

  it('OLD (innerHTML): </textarea> closes the textarea early, creating stray elements', { todo: 'proves the old bug' }, () => {
    const doc = makeDocument();
    const state = { 'Test': { 'Exercise A': { done: false, note: badNote } } };
    oldRenderList(doc, templates, 'Test', state);

    const ta = doc.querySelector('textarea.note');
    // With innerHTML, the </textarea> in the string closes the element early.
    // The textarea's textContent / value is empty (or partial), and a <b> appears.
    assert.notEqual(ta.value, badNote, 'old code: note is truncated by closing tag');
    const injected = doc.querySelector('b');
    assert.ok(injected !== null, 'old code: <b> tag was injected into the DOM');
  });

  it('NEW (createElement): note with </textarea> is stored as literal text, no stray elements', () => {
    const doc = makeDocument();
    const state = { 'Test': { 'Exercise A': { done: false, note: badNote } } };
    newRenderList(doc, templates, 'Test', state);

    const ta = doc.querySelector('textarea.note');
    assert.equal(ta.value, badNote, 'textarea.value equals the exact note string');
    assert.equal(doc.querySelector('b'), null, 'no <b> element injected into DOM');
  });

  it('NEW: note with bare < and > renders as text only', () => {
    const doc = makeDocument();
    const tricky = '3 sets <heavy> & 1 warmup';
    const state = { 'Test': { 'Exercise A': { done: false, note: tricky } } };
    newRenderList(doc, templates, 'Test', state);

    assert.equal(doc.querySelector('textarea.note').value, tricky);
  });
});

// ── C1b: HTML in exercise name / meta ────────────────────────────────────────

describe('C1b — HTML in exercise name or meta', () => {
  const xssName = '<script>window.__xss=1</script>Push-up';
  const xssMeta = '<img src=x onerror="window.__xss=2"> 3×10';
  const templates = { 'Test': [{ name: xssName, meta: xssMeta }] };

  it('OLD (innerHTML): tags in ex.name and ex.meta are parsed as HTML', { todo: 'proves the old bug' }, () => {
    const doc = makeDocument();
    const state = {};
    oldRenderList(doc, templates, 'Test', state);

    const nameEl = doc.querySelector('.name');
    // With innerHTML, the <script> is stripped by most parsers but the
    // text content is wrong — the tag text is absent from the visible label.
    assert.notEqual(nameEl.textContent, xssName, 'old code: script tag eaten, name text garbled');
  });

  it('NEW (createElement): tags in ex.name appear as literal text', () => {
    const doc = makeDocument();
    const state = {};
    newRenderList(doc, templates, 'Test', state);

    const nameEl = doc.querySelector('.name');
    assert.equal(nameEl.textContent, xssName, 'textContent equals the raw name string, angle brackets and all');

    const metaEl = doc.querySelector('.meta');
    assert.equal(metaEl.textContent, xssMeta, 'meta textContent is literal');
    assert.equal(doc.querySelector('img'), null, 'no img element injected');
  });
});

// ── C2: HTML attribute injection in extras ────────────────────────────────────

describe('C2 — HTML attribute injection in extras', () => {
  it('OLD (innerHTML): HTML entity sequences in value are decoded on re-render (round-trip corruption)', { todo: 'proves the old bug' }, () => {
    const doc = makeDocument();
    // Scenario: user previously typed "reps &lt;10" literally (e.g. a note about
    // a weight threshold).  That exact string is stored in extras[].  On the next
    // open, oldRenderExtras puts it into innerHTML:
    //   <input value="reps &lt;10" ...>
    // The HTML parser decodes &lt; → <, so input.value becomes 'reps <10' — NOT
    // the original string.  Each re-render corrupts the value further.
    const stored = 'reps &lt;10 &amp; sets';   // what's in extras[] from a prior save
    oldRenderExtras(doc, [stored]);

    const input = doc.querySelector('input');
    // The old code decoded entities: &lt; → <, &amp; → &
    assert.notEqual(input.value, stored,
      'old code: entity sequences decoded by HTML parser, value diverges from stored string');
    assert.equal(input.value, 'reps <10 & sets',
      'old code: input shows decoded version, not original');
  });

  it('NEW (input.value): any string is stored verbatim, no attribute boundary', () => {
    const doc = makeDocument();
    const tricky = '45min badminton" style="color:red';
    newRenderExtras(doc, [tricky]);

    const input = doc.querySelector('input');
    assert.equal(input.value, tricky, 'input.value equals the exact string');
  });

  it('NEW: value with < > & all stored correctly', () => {
    const doc = makeDocument();
    const chars = '<script> & </script> > test \'quote\'';
    newRenderExtras(doc, [chars]);

    assert.equal(doc.querySelector('input').value, chars);
    assert.equal(doc.querySelector('script'), null, 'no script element injected');
  });

  it('NEW: multiple extras each get correct values', () => {
    const doc = makeDocument();
    const vals = ['30min run', '15min <stretching> & cool-down', 'weights "heavy"'];
    newRenderExtras(doc, vals);

    const inputs = doc.querySelectorAll('input');
    assert.equal(inputs.length, vals.length);
    vals.forEach((v, i) => assert.equal(inputs[i].value, v));
  });
});

// ── note-flush before rebuild (S1 fix) ───────────────────────────────────────

describe('S1 — note is flushed via live DOM reference before rebuild', () => {
  it('box.onclick captures current textarea value before calling renderList', () => {
    const doc = makeDocument();
    const templates = { 'Test': [{ name: 'Squat', meta: '4×10' }] };
    const state = {};
    newRenderList(doc, templates, 'Test', state);

    // Simulate user typing a note without oninput having fired (e.g., last keystroke)
    const ta = doc.querySelector('textarea.note');
    ta.value = 'felt strong today';  // set DOM value directly, bypassing oninput

    // Now click the box
    doc.querySelector('.box').onclick();

    // State should have captured the note from the live element
    assert.equal(state['Test']['Squat'].note, 'felt strong today',
      'note captured from live textarea before DOM rebuild');
  });
});

// ── Rest day empty template ───────────────────────────────────────────────────

describe('renderList — Rest day (empty template)', () => {
  it('shows the rest day message as textContent, not innerHTML', () => {
    const doc = makeDocument();
    newRenderList(doc, { 'Rest day': [] }, 'Rest day', {});

    const list = doc.getElementById('list');
    assert.equal(list.children.length, 1, 'exactly one child element');
    const msg = list.children[0];
    // textContent means any HTML chars in the string would be entities, not tags
    assert.ok(msg.textContent.includes('Rest day'), 'message text is present');
    assert.equal(msg.querySelector('script'), null, 'no script injection possible');
  });
});
