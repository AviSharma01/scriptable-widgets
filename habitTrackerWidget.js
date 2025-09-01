// WORKOUT JOURNEY CARD — fixed-cycle (local storage)
// Today = leftmost; grid goes forward ~1 year (7x52).
// Past done = green, past missed = white, future = grey; today has a ring.
// Tap anywhere toggles TODAY only.

//////////////////// APPEARANCE ////////////////////
const BG         = new Color("#242426");
const DOT_FUTURE = new Color("#8f9399", 0.22);
const DOT_DONE   = new Color("#2ecc71");
const DOT_MISS   = new Color("#ffffff");
const TODAY_RING = new Color("#ffffff", 0.9);
const TEXT       = new Color("#ececec");
const SUB        = new Color("#b5b5b5");

const TITLE        = "workout";
const TITLE_LOWER  = true;
const TITLE_ICON   = "dumbbell.fill";

// Grid
const ROWS = 7, COLS = 52;
const DOT = 5, GAP = 2;
const TOP_PAD = 10, TICK_H = 4;
////////////////////////////////////////////////////

// ---------- date helpers ----------
function noon(d){ const x=new Date(d); x.setHours(12,0,0,0); return x; }
function today(){ return noon(new Date()); }
function addDays(d,n){ const x=new Date(d); x.setDate(x.getDate()+n); return noon(x); }
function dayKey(d){ const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,"0"), a=String(d.getDate()).padStart(2,"0"); return `${y}-${m}-${a}`; }
function daysBetween(a,b){ return Math.floor((noon(b)-noon(a))/(24*3600*1000)); }

const HABIT = "workout";
const LOCAL = FileManager.local();
const localDir  = LOCAL.joinPath(LOCAL.documentsDirectory(),"Habits");
const localFile = LOCAL.joinPath(localDir,"log.json");

function tryImportFromICloud(){
  try {
    const IC = FileManager.iCloud();
    const icDir  = IC.joinPath(IC.documentsDirectory(),"Habits");
    const icFile = IC.joinPath(icDir,"log.json");
    if (IC.fileExists(icFile)) {
      try { IC.downloadFileFromiCloud(icFile); } catch(e){}
      const raw = IC.readString(icFile);
      if (raw) {
        if (!LOCAL.fileExists(localDir)) LOCAL.createDirectory(localDir);
        LOCAL.writeString(localFile, raw);
      }
    }
  } catch(e) { /* ignore */ }
}

function getStore(){
  if (!LOCAL.fileExists(localDir)) LOCAL.createDirectory(localDir);
  if (!LOCAL.fileExists(localFile)) {
    tryImportFromICloud();
    if (!LOCAL.fileExists(localFile)) LOCAL.writeString(localFile,"{}");
  }
  const raw = LOCAL.readString(localFile) || "{}";
  return { data: JSON.parse(raw) };
}
function saveStore(store){
  const tmp = LOCAL.joinPath(localDir, `log.tmp.${Date.now()}.json`);
  LOCAL.writeString(tmp, JSON.stringify(store.data));
  if (LOCAL.fileExists(localFile)) LOCAL.remove(localFile);
  LOCAL.move(tmp, localFile);
}

const store = getStore();
store.data[HABIT] ||= [];
store.data[HABIT] = Array.from(new Set(store.data[HABIT])).sort();
const doneSet = new Set(store.data[HABIT]);

store.data._meta ||= {};
const META_KEY = `_cycleStart_${HABIT}`;
if (!store.data._meta[META_KEY]) {
  store.data._meta[META_KEY] = dayKey(today());
  saveStore(store);
}
let cycleStart = noon(new Date(store.data._meta[META_KEY]));

const TOTAL = ROWS*COLS; // 364
const t = today();
let indexToday = daysBetween(cycleStart, t);
if (indexToday >= TOTAL) {
  cycleStart = t;
  store.data._meta[META_KEY] = dayKey(cycleStart);
  // keep only entries within new cycle
  const kept = Array.from(doneSet).filter(k => {
    const d = noon(new Date(k));
    return d >= cycleStart && daysBetween(cycleStart, d) < TOTAL;
  }).sort();
  store.data[HABIT] = kept;
  saveStore(store);
  indexToday = 0;
}

// toggle TODAY via tap
if (args.queryParameters.toggle === "1") {
  const k = dayKey(t);
  if (doneSet.has(k)) doneSet.delete(k); else doneSet.add(k);
  store.data[HABIT] = Array.from(doneSet).sort();
  saveStore(store);
}

// streak within this cycle
function currentStreak(){
  let s=0, d=t;
  while (d >= cycleStart && doneSet.has(dayKey(d))) { s++; d = addDays(d,-1); }
  return s;
}

// ---------- draw grid ----------
function drawFixedCycleGrid(){
  const gridW = COLS*DOT + (COLS-1)*GAP;
  const gridH = ROWS*DOT + (ROWS-1)*GAP;
  const width  = gridW;
  const height = TOP_PAD + TICK_H + 6 + gridH;

  const dc = new DrawContext();
  dc.size = new Size(width, height);
  dc.opaque = false;
  dc.respectScreenScale = true;

  // month ticks relative to cycleStart
  for (let i=0;i<TOTAL;i++){
    const d = addDays(cycleStart, i);
    if (d.getDate() === 1){
      const c = Math.floor(i / ROWS);
      const x = c*(DOT+GAP) + DOT/2 - 0.5;
      dc.setFillColor(SUB);
      dc.fillRect(new Rect(x, TOP_PAD, 1, TICK_H));
    }
  }

  for (let i=0;i<TOTAL;i++){
    const d = addDays(cycleStart, i);
    const r = i % ROWS;
    const c = Math.floor(i / ROWS);
    const x = c*(DOT+GAP);
    const y = TOP_PAD + TICK_H + 6 + r*(DOT+GAP);

    let fill = DOT_FUTURE; // future
    if (d.getTime() < t.getTime()) {
      fill = doneSet.has(dayKey(d)) ? DOT_DONE : DOT_MISS;
    } else if (dayKey(d) === dayKey(t)) {
      fill = doneSet.has(dayKey(d)) ? DOT_DONE : DOT_FUTURE;
    }

    dc.setFillColor(fill);
    dc.fillEllipse(new Rect(x,y,DOT,DOT));

    if (dayKey(d) === dayKey(t)){
      dc.setStrokeColor(TODAY_RING);
      dc.setLineWidth(1.25);
      dc.strokeEllipse(new Rect(x-1,y-1,DOT+2,DOT+2));
    }
  }
  return dc.getImage();
}

// ---------- widget UI ----------
const w = new ListWidget();
w.backgroundColor = BG;
w.setPadding(14,16,12,16);

const gridImg = drawFixedCycleGrid();
const grid = w.addImage(gridImg);
grid.centerAlignImage();
grid.applyFittingContentMode();

w.addSpacer(8);
const bottom = w.addStack();
bottom.layoutHorizontally();
bottom.centerAlignContent();

const left = bottom.addStack();
left.layoutHorizontally();
left.spacing = 6;
if (TITLE_ICON){
  const icon = SFSymbol.named(TITLE_ICON).image;
  const ic = left.addImage(icon); ic.tintColor = TEXT; ic.imageSize = new Size(14,14);
}
const label = left.addText(TITLE_LOWER ? TITLE : TITLE.toUpperCase());
label.textColor = TEXT;
label.font = Font.semiboldSystemFont(14);

bottom.addSpacer();
const streak = currentStreak();
const streakTxt = bottom.addText(`${streak} day streak`);
streakTxt.textColor = SUB;
streakTxt.font = Font.semiboldSystemFont(13);

// tap anywhere -> toggle TODAY
const runName = Script.name();
w.url = `scriptable:///run?scriptName=${encodeURIComponent(runName)}&toggle=1`;

if (!config.runsInWidget) await w.presentMedium();
Script.setWidget(w);
Script.complete();
