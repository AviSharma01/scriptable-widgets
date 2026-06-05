// Pure-logic tests for workoutLogger.js and habitTrackerWidget.js.
// No Scriptable APIs, no DOM — these run in plain Node 20.
//
// Functions are copied verbatim from their source files so the scripts
// stay paste-into-Scriptable with no imports.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// ── extracted from workoutLogger.js (CONFIG block) ──────────────────────────
const MIN_DONE = 2;
const DIVISOR  = 3;

function threshold(n) {
  if (!n) return 0;
  return Math.max(MIN_DONE, Math.ceil(n / DIVISOR));
}

function isSubstantial(checkedCount, templateLen, extrasCount) {
  return extrasCount > 0 || checkedCount >= threshold(templateLen);
}

// ── extracted from both files (date helpers) ─────────────────────────────────
function noon(d){ const x = new Date(d); x.setHours(12,0,0,0); return x; }
function dayKey(d){ const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), a=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${a}`; }
function addDays(d,n){ const x=new Date(d); x.setDate(x.getDate()+n); return noon(x); }
function daysBetween(a,b){ return Math.floor((noon(b)-noon(a))/(24*3600*1000)); }

// ── threshold() ──────────────────────────────────────────────────────────────
describe('threshold()', () => {
  it('returns 0 for Rest day (0 items)', () => {
    assert.equal(threshold(0), 0);
  });

  it('returns MIN_DONE=2 for Sport/Cardio (1 item) — forces extras', () => {
    // ceil(1/3)=1, max(2,1)=2; intentional: 1 exercise alone never counts
    assert.equal(threshold(1), 2);
  });

  it('returns 2 for a 2-item template', () => {
    assert.equal(threshold(2), 2);
  });

  it('returns 2 for a 3-item template — ceil(3/3)=1, clamp to MIN_DONE', () => {
    assert.equal(threshold(3), 2);
  });

  it('returns 3 for a 7-item template (Upper/Lower Body)', () => {
    // ceil(7/3)=3, max(2,3)=3
    assert.equal(threshold(7), 3);
  });

  it('returns 4 for a 10-item template', () => {
    // ceil(10/3)=4, max(2,4)=4
    assert.equal(threshold(10), 4);
  });
});

// ── isSubstantial() ──────────────────────────────────────────────────────────
describe('isSubstantial()', () => {
  it('Rest day (0 items, 0 checked, 0 extras) always counts — 0 >= 0', () => {
    assert.equal(isSubstantial(0, 0, 0), true);
  });

  it('Upper Body A: 3/7 checked, no extras → counts (meets threshold=3)', () => {
    assert.equal(isSubstantial(3, 7, 0), true);
  });

  it('Upper Body A: 2/7 checked, no extras → does not count (below threshold=3)', () => {
    assert.equal(isSubstantial(2, 7, 0), false);
  });

  it('Sport/Cardio: 1/1 checked, no extras → does not count (threshold=2)', () => {
    // must log an extra to count a sport session
    assert.equal(isSubstantial(1, 1, 0), false);
  });

  it('Sport/Cardio: 1/1 checked, 1 extra → counts (extra overrides threshold)', () => {
    assert.equal(isSubstantial(1, 1, 1), true);
  });

  it('any extras always counts regardless of checked count', () => {
    assert.equal(isSubstantial(0, 7, 1), true);
    assert.equal(isSubstantial(0, 0, 3), true);
  });

  it('2-item template: 2/2 checked → counts', () => {
    assert.equal(isSubstantial(2, 2, 0), true);
  });

  it('2-item template: 1/2 checked, no extras → does not count', () => {
    assert.equal(isSubstantial(1, 2, 0), false);
  });
});

// ── dayKey() ─────────────────────────────────────────────────────────────────
describe('dayKey()', () => {
  it('formats a known date as YYYY-MM-DD', () => {
    assert.equal(dayKey(new Date('2026-05-28T12:00:00')), '2026-05-28');
  });

  it('zero-pads month and day', () => {
    assert.equal(dayKey(new Date('2026-01-09T12:00:00')), '2026-01-09');
  });

  it('handles December correctly', () => {
    assert.equal(dayKey(new Date('2026-12-31T12:00:00')), '2026-12-31');
  });
});

// ── noon() ───────────────────────────────────────────────────────────────────
describe('noon()', () => {
  it('normalises any time to 12:00:00.000', () => {
    const d = noon(new Date('2026-05-28T00:00:00'));
    assert.equal(d.getHours(), 12);
    assert.equal(d.getMinutes(), 0);
    assert.equal(d.getSeconds(), 0);
  });

  it('does not mutate the input date', () => {
    const orig = new Date('2026-05-28T08:30:00');
    const origTime = orig.getTime();
    noon(orig);
    assert.equal(orig.getTime(), origTime);
  });
});

// ── addDays() / daysBetween() ────────────────────────────────────────────────
describe('addDays() / daysBetween()', () => {
  it('addDays(d, 1) advances by exactly one day', () => {
    const base = noon(new Date('2026-05-28T12:00:00'));
    const next = addDays(base, 1);
    assert.equal(next.getDate(), 29);
    assert.equal(next.getMonth(), 4); // May = 4
  });

  it('addDays handles month boundary', () => {
    const may31 = noon(new Date('2026-05-31T12:00:00'));
    const jun1  = addDays(may31, 1);
    assert.equal(jun1.getMonth(), 5); // June = 5
    assert.equal(jun1.getDate(),  1);
  });

  it('daysBetween returns 0 for the same day', () => {
    const d = noon(new Date('2026-05-28T12:00:00'));
    assert.equal(daysBetween(d, d), 0);
  });

  it('daysBetween returns 7 for a week apart', () => {
    const a = noon(new Date('2026-05-21T12:00:00'));
    const b = noon(new Date('2026-05-28T12:00:00'));
    assert.equal(daysBetween(a, b), 7);
  });

  it('daysBetween is not confused by DST — uses noon anchoring', () => {
    // Spring-forward weekend (US): 2026-03-08 → 2026-03-09
    const a = noon(new Date('2026-03-08T12:00:00'));
    const b = noon(new Date('2026-03-09T12:00:00'));
    assert.equal(daysBetween(a, b), 1);
  });

  it('addDays + daysBetween round-trip for 364 days', () => {
    const start = noon(new Date('2026-01-01T12:00:00'));
    const end   = addDays(start, 363);
    assert.equal(daysBetween(start, end), 363);
  });
});
