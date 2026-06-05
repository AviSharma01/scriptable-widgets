// WORKOUT LOGGER — companion to habitTrackerWidget.js
// Opens whenever the widget is tapped (green or grey dot).
// Three modes depending on today's state:
//   plan   — fresh day, no session yet: reference card + Quick/Log buttons
//   log    — partial session exists, or user tapped "Log session": checklist
//   review — day already marked done: shows saved session + Remove done button

//////////////////// CONFIG ////////////////////
const HABIT = "workout";

// "Done" rule: need at least max(MIN_DONE, ceil(items/DIVISOR)) checked,
// OR any extra (sport / walk / etc) logged.
const MIN_DONE = 2;
const DIVISOR  = 3;

// Templates — edit freely. Order = display order in the picker.
const TEMPLATES = {
  "Upper Body A": [
    { name: "Dumbbell floor press",      meta: "4 × 8–12  ·  10–17.5 kg ea" },
    { name: "One-arm dumbbell row",      meta: "4 × 10–12 ea side  ·  15–25 kg" },
    { name: "Dumbbell shoulder press",   meta: "3 × 8–12  ·  7.5–12.5 kg ea" },
    { name: "Dumbbell lateral raise",    meta: "4 × 12–20  ·  3–7.5 kg ea" },
    { name: "Push-ups",                  meta: "3 × near failure  ·  bodyweight" },
    { name: "Dumbbell bicep curl",       meta: "3 × 10–15  ·  7.5–12.5 kg ea" },
    { name: "Overhead tricep extension", meta: "3 × 10–15  ·  10–20 kg total" },
  ],
  "Lower Body + Core": [
    { name: "Barbell deadlift",          meta: "4 × 5–8  ·  40–60 kg total" },
    { name: "Goblet squat",              meta: "4 × 10–15  ·  15–30 kg" },
    { name: "Dumbbell Romanian deadlift",meta: "3 × 8–12  ·  12.5–25 kg ea" },
    { name: "Reverse lunges",            meta: "3 × 10 ea leg  ·  BW–10 kg ea" },
    { name: "Standing calf raises",      meta: "3 × 15–25  ·  BW or 10–20 kg" },
    { name: "Plank",                     meta: "3 × 30–60 sec  ·  bodyweight" },
    { name: "Leg raises",                meta: "3 × 10–15  ·  bodyweight" },
  ],
  "Upper Body B": [
    { name: "Bent-over row (bar/DB)",    meta: "4 × 8–12  ·  bar 30–50 kg / DB 15–25 ea" },
    { name: "Feet-elevated push-ups",    meta: "4 × 8–15  ·  bodyweight" },
    { name: "Dumbbell shoulder press",   meta: "3 × 8–12  ·  7.5–12.5 kg ea" },
    { name: "Dumbbell lateral raise",    meta: "4 × 15–20  ·  3–7.5 kg ea" },
    { name: "Rear delt raise",           meta: "3 × 12–20  ·  3–7.5 kg ea" },
    { name: "Hammer curl",               meta: "3 × 10–15  ·  7.5–15 kg ea" },
    { name: "Close-grip push-ups",       meta: "3 × 8–15  ·  bodyweight" },
  ],
  "Lower + Chest/Arms": [
    { name: "Dumbbell Romanian deadlift",meta: "4 × 8–12  ·  12.5–25 kg ea" },
    { name: "Bulgarian split squat",     meta: "3 × 8–12 ea leg  ·  BW–10 kg ea" },
    { name: "Dumbbell floor press",      meta: "4 × 8–12  ·  10–17.5 kg ea" },
    { name: "Dumbbell squeeze press",    meta: "3 × 10–15  ·  7.5–15 kg ea" },
    { name: "Dumbbell bicep curl",       meta: "3 × 10–15  ·  7.5–12.5 kg ea" },
    { name: "Overhead tricep extension", meta: "3 × 10–15  ·  10–20 kg total" },
    { name: "Side plank",                meta: "3 × 30–45 sec ea side  ·  BW" },
  ],
  "Sport / Cardio": [
    { name: "Activity", meta: "log type + duration in notes" },
  ],
  "Rest day": [],
};

// Weekday → which template auto-selects. 0=Sun … 6=Sat.
const WEEKDAY_TEMPLATE = {
  1: "Upper Body A",        // Monday    — Day 1
  2: "Lower Body + Core",   // Tuesday   — Day 2
  3: "Upper Body B",        // Wednesday — Day 3
  4: "Lower + Chest/Arms",  // Thursday  — Day 4
  5: null,                  // Friday    — free choice
  6: null,                  // Saturday  — free choice
  0: null,                  // Sunday    — free choice
};

const ACCENT = "#2ecc71";
////////////////////////////////////////////////

// ---------- date + storage (mirrors widget) ----------
function noon(d){ const x=new Date(d); x.setHours(12,0,0,0); return x; }
function today(){ return noon(new Date()); }
function dayKey(d){ const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,"0"), a=String(d.getDate()).padStart(2,"0"); return `${y}-${m}-${a}`; }

const LOCAL = FileManager.local();
const localDir  = LOCAL.joinPath(LOCAL.documentsDirectory(), "Habits");
const localFile = LOCAL.joinPath(localDir, "log.json");

function getStore(){
  if (!LOCAL.fileExists(localDir))  LOCAL.createDirectory(localDir);
  if (!LOCAL.fileExists(localFile)) LOCAL.writeString(localFile, "{}");
  return JSON.parse(LOCAL.readString(localFile) || "{}");
}
function saveStore(data){
  const tmp = LOCAL.joinPath(localDir, `log.tmp.${Date.now()}.json`);
  LOCAL.writeString(tmp, JSON.stringify(data));
  if (LOCAL.fileExists(localFile)) LOCAL.remove(localFile);
  LOCAL.move(tmp, localFile);
}

const data = getStore();
data[HABIT]    ||= [];
data._sessions ||= {};
const tk       = dayKey(today());
const existing = data._sessions[tk] || null;
const isDone   = data[HABIT].includes(tk);

// ---------- HTML payload ----------
const templateNames  = Object.keys(TEMPLATES);
const weekdayPick    = WEEKDAY_TEMPLATE[today().getDay()];
const defaultTemplate =
  existing?.template ||
  (weekdayPick && TEMPLATES[weekdayPick] ? weekdayPick : templateNames[0]);

const payload = {
  templates:       TEMPLATES,
  defaultTemplate,
  existing,
  isDone,
  date:            tk,
  accent:          ACCENT,
  weekdayTemplate: weekdayPick,   // null on weekends
};

// ---------- HTML ----------
const html = `<!doctype html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
<style>
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  html, body { margin: 0; padding: 0; background: #161618; color: #ececec;
    font: 15px -apple-system, system-ui, sans-serif; }
  .wrap { padding: 18px 18px 120px; max-width: 560px; margin: 0 auto; }
  .date  { color: #8a8a8e; font-size: 13px; margin-bottom: 4px; }
  h1    { font-size: 22px; font-weight: 600; margin: 0 0 14px; }

  /* template picker */
  .pick { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 18px; }
  .pick button { background: #242426; color: #ececec; border: 1px solid #2e2e30;
    padding: 7px 12px; border-radius: 999px; font-size: 13px; }
  .pick button.on { background: ${ACCENT}; color: #0a1f12; border-color: ${ACCENT}; font-weight: 600; }

  /* shared row anatomy */
  .body { flex: 1; min-width: 0; }
  .name { font-size: 15px; }
  .meta { font-size: 12px; color: #8a8a8e; margin-top: 2px; }

  /* plan mode — numbered reference list */
  .ref-row { display: flex; align-items: flex-start; gap: 12px; padding: 10px 4px;
    border-bottom: 1px solid #242426; }
  .ref-num { flex: 0 0 18px; color: #5a5a5e; font-size: 13px; font-weight: 600;
    padding-top: 1px; text-align: right; }

  /* log mode — checklist */
  .row { display: flex; align-items: flex-start; gap: 12px; padding: 12px 4px;
    border-bottom: 1px solid #242426; }
  .box { flex: 0 0 22px; height: 22px; margin-top: 1px; border: 1.5px solid #5a5a5e;
    border-radius: 6px; display: flex; align-items: center; justify-content: center; }
  .box.on { background: ${ACCENT}; border-color: ${ACCENT}; }
  .box.on::after { content: "✓"; color: #0a1f12; font-weight: 700; font-size: 14px; }
  .note { width: 100%; margin-top: 8px; background: #1d1d1f; border: 1px solid #2e2e30;
    color: #ececec; border-radius: 6px; padding: 6px 8px; font-size: 13px;
    font-family: inherit; resize: none; display: none; }
  .row.on .note { display: block; }

  /* log mode — extras */
  .extras-wrap { margin-top: 22px; }
  .extras-wrap h2 { font-size: 13px; font-weight: 600; color: #8a8a8e;
    text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 8px; }
  .extra { display: flex; gap: 8px; margin-bottom: 6px; }
  .extra input { flex: 1; background: #1d1d1f; border: 1px solid #2e2e30;
    color: #ececec; border-radius: 6px; padding: 8px 10px; font-size: 14px;
    font-family: inherit; }
  .extra button { background: transparent; border: none; color: #8a8a8e;
    font-size: 18px; padding: 0 6px; }
  .add-extra { background: transparent; color: ${ACCENT}; border: 1px dashed #3a3a3c;
    padding: 8px 12px; border-radius: 8px; font-size: 13px; width: 100%; margin-top: 4px; }

  /* review mode */
  .card { background: #1d1d1f; border-radius: 10px; padding: 14px; margin-bottom: 12px; }
  .card-label { font-size: 11px; font-weight: 600; color: #8a8a8e;
    text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
  .rev-tmpl { font-size: 17px; font-weight: 600; margin-bottom: 2px; }
  .rev-time  { font-size: 12px; color: #8a8a8e; }
  .rev-row   { display: flex; gap: 10px; align-items: flex-start; padding: 5px 0; }
  .rev-icon  { flex: 0 0 14px; font-size: 13px; padding-top: 1px; }
  .rev-note  { font-size: 12px; color: #8a8a8e; margin-top: 2px; }

  /* action bar */
  .bar { position: fixed; left: 0; right: 0; bottom: 0; padding: 14px 18px 30px;
    background: linear-gradient(to top, #161618 70%, transparent);
    display: flex; gap: 10px; }
  .bar button { flex: 1; padding: 14px; border-radius: 12px; font-size: 15px;
    font-weight: 600; border: none; }
  .btn-cancel { background: #242426; color: #ececec; }
  .btn-quick  { background: #2a3f30; color: ${ACCENT}; flex: 0 0 auto; padding: 14px 16px; }
  .btn-save   { background: ${ACCENT}; color: #0a1f12; }
  .btn-remove { background: #2d1515; color: #ff6b6b; }

  .status { text-align: center; color: #8a8a8e; font-size: 12px; margin: 12px 0 -2px; }
  .empty  { color: #8a8a8e; padding: 20px 4px; }
</style></head><body>
<div class="wrap">
  <div class="date" id="date"></div>
  <h1 id="heading"></h1>
  <div id="content"></div>
  <div class="status" id="status"></div>
</div>
<div class="bar" id="bar"></div>
<script>
  const P = ${JSON.stringify(payload)};

  // mode: 'plan' = fresh day reference card
  //       'log'  = checklist (partial session or user chose to log)
  //       'review' = day already done, showing saved session
  let mode    = P.isDone ? 'review' : (P.existing ? 'log' : 'plan');
  let current = P.defaultTemplate;
  let state   = {};   // { templateName: { exerciseName: { done, note } } }
  let extras  = [];

  // ── init ─────────────────────────────────────────────────────────────────
  function init() {
    document.getElementById('date').textContent =
      new Date(P.date + 'T12:00:00').toDateString();
    if (P.existing) {
      current = P.existing.template;
      const map = {};
      (P.existing.exercises || []).forEach(e => {
        map[e.name] = { done: !!e.done, note: e.note || '' };
      });
      state[current] = map;
      extras = (P.existing.extras || []).slice();
    }
    render();
  }

  // ── main render ───────────────────────────────────────────────────────────
  function render() {
    document.getElementById('heading').textContent =
      mode === 'review' ? 'Workout logged' : "Today's workout";

    const content = document.getElementById('content');
    content.innerHTML = '';
    if      (mode === 'plan')   buildPlan(content);
    else if (mode === 'log')    buildLog(content);
    else                        buildReview(content);

    buildBar();
    updateStatus();
  }

  // ── plan view — read-only reference card ─────────────────────────────────
  function buildPlan(content) {
    content.appendChild(buildPicker());

    const items = P.templates[current] || [];
    if (!items.length) {
      const msg = document.createElement('div');
      msg.className = 'empty';
      msg.textContent = 'Rest day — tap Log session to record it, or Quick done.';
      content.appendChild(msg);
      return;
    }

    items.forEach((ex, i) => {
      const num = document.createElement('div');
      num.className = 'ref-num';
      num.textContent = String(i + 1);

      const nameEl = document.createElement('div');
      nameEl.className = 'name';
      nameEl.textContent = ex.name;

      const metaEl = document.createElement('div');
      metaEl.className = 'meta';
      metaEl.textContent = ex.meta || '';

      const body = document.createElement('div');
      body.className = 'body';
      body.appendChild(nameEl);
      body.appendChild(metaEl);

      const row = document.createElement('div');
      row.className = 'ref-row';
      row.appendChild(num);
      row.appendChild(body);
      content.appendChild(row);
    });
  }

  // ── log view — checklist + extras ────────────────────────────────────────
  function buildLog(content) {
    content.appendChild(buildPicker());

    const listDiv = document.createElement('div');
    listDiv.id = 'log-list';
    buildLogList(listDiv);
    content.appendChild(listDiv);

    content.appendChild(buildExtrasSection());
  }

  // Rebuilds only the exercise list so checkbox toggles don't steal focus
  // from an extras input the user might be typing in.
  function refreshLogList() {
    const el = document.getElementById('log-list');
    if (el) buildLogList(el);
    updateStatus();
  }

  function buildLogList(container) {
    container.innerHTML = '';
    const items = P.templates[current] || [];
    state[current] ||= {};

    items.forEach(ex => {
      state[current][ex.name] ||= { done: false, note: '' };
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
      ta.placeholder = 'notes (weight, reps, how it felt)';
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
        s.note = ta.value;   // flush unfired oninput before rebuild
        s.done = !s.done;
        refreshLogList();
      };

      container.appendChild(row);
    });

    if (!items.length) {
      const msg = document.createElement('div');
      msg.className = 'empty';
      msg.textContent = 'Rest day — hit Save to log it, or add an extra below.';
      container.appendChild(msg);
    }
  }

  function buildExtrasSection() {
    const wrap = document.createElement('div');
    wrap.className = 'extras-wrap';

    const h2 = document.createElement('h2');
    h2.textContent = 'Extras (sport, walk, anything)';
    wrap.appendChild(h2);

    const list = document.createElement('div');
    list.id = 'extras-list';
    buildExtrasList(list);
    wrap.appendChild(list);

    const addBtn = document.createElement('button');
    addBtn.className = 'add-extra';
    addBtn.textContent = '+ add extra';
    addBtn.onclick = () => {
      extras.push('');
      buildExtrasList(list);
      updateStatus();
    };
    wrap.appendChild(addBtn);
    return wrap;
  }

  function buildExtrasList(container) {
    container.innerHTML = '';
    extras.forEach((val, i) => {
      const input = document.createElement('input');
      input.placeholder = 'e.g. 30min badminton';
      input.value = val;
      input.oninput = (e) => { extras[i] = e.target.value; updateStatus(); };

      const del = document.createElement('button');
      del.textContent = '×';
      del.onclick = () => { extras.splice(i, 1); buildExtrasList(container); updateStatus(); };

      const row = document.createElement('div');
      row.className = 'extra';
      row.appendChild(input);
      row.appendChild(del);
      container.appendChild(row);
    });
  }

  // ── review view — saved session summary ──────────────────────────────────
  function buildReview(content) {
    const session = P.existing;

    // Header card: template name + time
    const header = document.createElement('div');
    header.className = 'card';

    const cardLabel = document.createElement('div');
    cardLabel.className = 'card-label';
    cardLabel.textContent = 'Logged session';
    header.appendChild(cardLabel);

    const tmplEl = document.createElement('div');
    tmplEl.className = 'rev-tmpl';
    tmplEl.textContent = session ? (session.template || '—') : '—';
    header.appendChild(tmplEl);

    if (session?.savedAt) {
      const timeEl = document.createElement('div');
      timeEl.className = 'rev-time';
      timeEl.textContent = new Date(session.savedAt)
        .toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      header.appendChild(timeEl);
    }
    content.appendChild(header);

    if (!session) return;

    // Exercise card
    const exercises = session.exercises || [];
    if (session.quick) {
      const qCard = document.createElement('div');
      qCard.className = 'card';
      const qLabel = document.createElement('div');
      qLabel.className = 'card-label';
      qLabel.textContent = 'Exercises';
      qCard.appendChild(qLabel);
      const qMsg = document.createElement('div');
      qMsg.style.cssText = 'color:#8a8a8e; font-size:14px;';
      qMsg.textContent = 'Quick done — no exercises logged';
      qCard.appendChild(qMsg);
      content.appendChild(qCard);
    } else if (exercises.length) {
      const exCard = document.createElement('div');
      exCard.className = 'card';
      const exLabel = document.createElement('div');
      exLabel.className = 'card-label';
      exLabel.textContent = 'Exercises';
      exCard.appendChild(exLabel);

      // done first, then missed
      const sorted = [
        ...exercises.filter(e => e.done),
        ...exercises.filter(e => !e.done),
      ];
      sorted.forEach(ex => {
        const icon = document.createElement('div');
        icon.className = 'rev-icon';
        icon.textContent = ex.done ? '✓' : '·';
        icon.style.color  = ex.done ? '${ACCENT}' : '#5a5a5e';

        const nameEl = document.createElement('div');
        nameEl.className = 'name';
        nameEl.textContent = ex.name;

        const bodyEl = document.createElement('div');
        bodyEl.className = 'body';
        bodyEl.appendChild(nameEl);
        if (ex.done && ex.note) {
          const noteEl = document.createElement('div');
          noteEl.className = 'rev-note';
          noteEl.textContent = ex.note;
          bodyEl.appendChild(noteEl);
        }

        const row = document.createElement('div');
        row.className = 'rev-row';
        row.appendChild(icon);
        row.appendChild(bodyEl);
        exCard.appendChild(row);
      });
      content.appendChild(exCard);
    }

    // Extras card (only if any)
    const filledExtras = (session.extras || []).filter(e => e.trim());
    if (filledExtras.length) {
      const extCard = document.createElement('div');
      extCard.className = 'card';
      const extLabel = document.createElement('div');
      extLabel.className = 'card-label';
      extLabel.textContent = 'Extras';
      extCard.appendChild(extLabel);
      filledExtras.forEach(ex => {
        const item = document.createElement('div');
        item.style.cssText = 'font-size:14px; padding:3px 0;';
        item.textContent = ex;
        extCard.appendChild(item);
      });
      content.appendChild(extCard);
    }
  }

  // ── shared template picker ────────────────────────────────────────────────
  function buildPicker() {
    const wrap = document.createElement('div');
    wrap.className = 'pick';
    Object.keys(P.templates).forEach(name => {
      const b = document.createElement('button');
      b.textContent = name;
      if (name === current) b.classList.add('on');
      b.onclick = () => { current = name; render(); };
      wrap.appendChild(b);
    });
    return wrap;
  }

  // ── action bar ────────────────────────────────────────────────────────────
  function buildBar() {
    const bar = document.getElementById('bar');
    bar.innerHTML = '';

    function btn(text, cls, handler) {
      const b = document.createElement('button');
      b.className = cls;
      b.textContent = text;
      b.onclick = handler;
      return b;
    }

    if (mode === 'review') {
      bar.appendChild(btn('Close',  'btn-cancel', cancel));
      bar.appendChild(btn('Edit',   'btn-save',   () => { mode = 'log'; render(); }));
      bar.appendChild(btn('Remove', 'btn-remove', removeDone));
    } else {
      bar.appendChild(btn('Cancel',  'btn-cancel', cancel));
      bar.appendChild(btn('✓ Quick', 'btn-quick',  quickDone));
      if (mode === 'plan') {
        bar.appendChild(btn('Log session →', 'btn-save', () => { mode = 'log'; render(); }));
      } else {
        bar.appendChild(btn('Save', 'btn-save', save));
      }
    }
  }

  // ── status line (log mode only) ───────────────────────────────────────────
  function countDone() {
    const m = state[current] || {};
    return Object.values(m).filter(x => x.done).length;
  }
  function threshold() {
    const n = (P.templates[current] || []).length;
    if (!n) return 0;
    return Math.max(${MIN_DONE}, Math.ceil(n / ${DIVISOR}));
  }
  function isSubstantial() {
    const filledExtras = extras.filter(e => e.trim().length).length;
    return filledExtras > 0 || (countDone() >= threshold());
  }
  function updateStatus() {
    const el = document.getElementById('status');
    if (mode !== 'log') { el.textContent = ''; return; }
    const n  = (P.templates[current] || []).length;
    const d  = countDone();
    const t  = threshold();
    const ex = extras.filter(e => e.trim().length).length;
    const ok = isSubstantial();
    el.textContent = n === 0
      ? (ex ? \`\${ex} extra logged — will count as done\` : 'Rest day — will count as done')
      : \`\${d}/\${n} checked  ·  need \${t} to count (or any extra)  ·  \${ok ? '✓ will count' : 'not yet'}\`;
  }

  // ── bridge ────────────────────────────────────────────────────────────────
  function _bridge(data) {
    window._loggerResult = JSON.stringify(data);

    // Fade out, then swap in a confirmation screen so the user knows
    // the action registered and gets a natural cue to swipe closed.
    // setTimeout is fine here — this is the WebView's JS context.
    document.body.style.transition = 'opacity 0.15s';
    document.body.style.opacity    = '0';

    setTimeout(function() {
      let icon, line1, line2, iconColor;

      if (data.action === 'cancel') {
        icon = '×'; line1 = 'Cancelled'; iconColor = '#8a8a8e';
      } else if (data.action === 'untoggle') {
        icon = '↩'; line1 = 'Removed'; iconColor = '#ff6b6b';
      } else if (data.quick) {
        icon = '✓'; line1 = 'Quick done'; iconColor = '${ACCENT}';
      } else if (data.substantial) {
        icon = '✓'; line1 = 'Logged'; iconColor = '${ACCENT}';
      } else {
        icon = '✓'; line1 = 'Saved'; line2 = 'not enough to count as done yet';
        iconColor = '#8a8a8e';
      }

      const sub = line2
        ? '<p style="margin:6px 0 0;font-size:13px;color:#5a5a5e">' + line2 + '</p>'
        : '';

      document.body.style.cssText =
        'margin:0;background:#161618;display:flex;align-items:center;' +
        'justify-content:center;height:100vh;text-align:center;';
      document.body.innerHTML =
        '<div>' +
          '<div style="font-size:52px;color:' + iconColor + '">' + icon + '</div>' +
          '<p style="margin:10px 0 0;font-size:17px;font-weight:600;color:#ececec">' + line1 + '</p>' +
          sub +
          '<p style="margin:20px 0 0;font-size:13px;color:#3a3a3c">swipe to close</p>' +
        '</div>';
      document.body.style.opacity    = '0';
      document.body.style.transition = 'opacity 0.2s';
      // Force reflow so the transition fires
      void document.body.offsetHeight;
      document.body.style.opacity = '1';
    }, 150);
  }

  function quickDone()  { _bridge({ action: 'save', template: current, exercises: [],
                            extras: [], substantial: true, quick: true }); }
  function cancel()     { _bridge({ action: 'cancel' }); }
  function removeDone() { _bridge({ action: 'untoggle' }); }
  function save() {
    const items = (P.templates[current] || []).map(ex => ({
      name: ex.name,
      done: !!(state[current]?.[ex.name]?.done),
      note:   state[current]?.[ex.name]?.note || '',
    }));
    _bridge({ action: 'save', template: current, exercises: items,
              extras: extras.filter(e => e.trim().length), substantial: isSubstantial() });
  }

  init();
</script>
</body></html>`;

// ---------- present via WebView + Promise bridge ----------
const wv = new WebView();
await wv.loadHTML(html);

// await wv.present(true) blocks until the sheet is dismissed (swipe or
// system). No polling needed — _bridge() fades the UI on button tap so
// the user's natural response is to swipe the blank sheet away.
// The JS context survives a swipe-dismiss, so evaluateJavaScript works
// immediately after present() resolves.
await wv.present(true);

const raw = await wv.evaluateJavaScript('window._loggerResult || ""');
const result = raw || JSON.stringify({ action: 'cancel' });

let parsed;
try { parsed = JSON.parse(result); } catch(e) { parsed = { action: 'cancel' }; }

if (parsed.action === 'save') {
  data._sessions[tk] = {
    template:  parsed.template,
    exercises: parsed.exercises,
    extras:    parsed.extras,
    quick:     !!parsed.quick,
    savedAt:   new Date().toISOString(),
  };
  const doneSet = new Set(data[HABIT]);
  if (parsed.substantial) doneSet.add(tk);
  else doneSet.delete(tk);
  data[HABIT] = Array.from(doneSet).sort();
  saveStore(data);
} else if (parsed.action === 'untoggle') {
  const doneSet = new Set(data[HABIT]);
  doneSet.delete(tk);
  data[HABIT] = Array.from(doneSet).sort();
  delete data._sessions[tk];
  saveStore(data);
}

Script.complete();
