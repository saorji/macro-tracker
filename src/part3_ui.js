/* ============================================================
   UI FRAMEWORK: router, nav, sheet, toast
   ============================================================ */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const APP = $('#app');
let VIEW = 'today';
let CUR = todayKey();          // date being viewed/edited on Today
let HIST = todayKey();         // date selected in History
let CAL_MONTH = null;          // month shown in history calendar

let toastT = null;
function toast(msg) {
  const el = $('#toast'); el.textContent = msg;
  // when a sheet is open a bottom toast would sit on top of its buttons
  el.classList.toggle('top', sheetStack.length > 0);
  el.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 2100);
}

/* ---------- bottom sheet / modal ---------- */
let sheetStack = [];
function openSheet(title, bodyHTML, footHTML, onMount) {
  sheetStack.push({ title, bodyHTML, footHTML, onMount });
  renderSheet();
}
function renderSheet() {
  const s = sheetStack[sheetStack.length - 1];
  if (!s) return;
  $('#sheetTitle').textContent = s.title;
  $('#sheetBody').innerHTML = s.bodyHTML;
  $('#sheetFoot').innerHTML = s.footHTML || '';
  $('#sheetFoot').style.display = s.footHTML ? 'flex' : 'none';
  $('#sheet').classList.add('open');
  $('#sheetBg').classList.add('open');
  $('#sheetBody').scrollTop = 0;
  if (s.onMount) s.onMount();
}
function closeSheet(all) {
  // a sheet may own transient state (an unsaved plan); it gets told when it is
  // dismissed, however the dismissal happened — button, backdrop or Escape
  const dropped = all ? sheetStack.slice() : sheetStack.slice(-1);
  sheetStack = all ? [] : sheetStack.slice(0, -1);
  dropped.forEach(s => { if (s && s.onDismiss) s.onDismiss(); });
  if (sheetStack.length) { renderSheet(); return; }
  $('#sheet').classList.remove('open');
  $('#sheetBg').classList.remove('open');
  setTimeout(() => { if (!sheetStack.length) { $('#sheetBody').innerHTML = ''; $('#sheetFoot').innerHTML = ''; } }, 260);
}
/* Pop sheets stacked ON TOP of the meal-preview sheet without dismissing the
   preview itself — used after staging an item, so the plan survives. */
function closeToPreview() {
  while (sheetStack.length && !sheetStack[sheetStack.length - 1].isPreview) sheetStack.pop();
}
function replaceSheet(title, bodyHTML, footHTML, onMount) {
  sheetStack.pop();
  openSheet(title, bodyHTML, footHTML, onMount);
}
document.addEventListener('click', e => {
  if (e.target.id === 'sheetBg' || e.target.id === 'sheetClose') closeSheet();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && sheetStack.length) closeSheet(); });

function confirmSheet(title, msg, confirmLabel, fn, danger, onCancel, cancelLabel) {
  openSheet(title, `<p style="margin:2px 0 4px;color:var(--text-2)">${esc(msg)}</p>`,
    `<button class="btn" data-act="cancel">${esc(cancelLabel || 'Cancel')}</button>
     <button class="btn ${danger ? 'danger' : 'primary'}" data-act="ok">${esc(confirmLabel)}</button>`,
    () => {
      $('#sheetFoot [data-act=cancel]').onclick = () => { closeSheet(); if (onCancel) onCancel(); };
      $('#sheetFoot [data-act=ok]').onclick = () => { closeSheet(); fn(); };
    });
}

/* ---------- icons ---------- */
const ICON = {
  today: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
  history: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/></svg>',
  foods: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3v8a3 3 0 0 0 6 0V3M8 11v10M16 3c-1.5 2-2 4-2 6s.5 3 2 3 2-1 2-3-.5-4-2-6z"/><path d="M16 12v9"/></svg>',
  progress: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 20h18"/><rect x="5" y="11" width="3.5" height="9" rx="1"/><rect x="10.2" y="6" width="3.5" height="14" rx="1"/><rect x="15.5" y="14" width="3.5" height="6" rx="1"/></svg>',
  settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/></svg>',
  plus: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  left: '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
  right: '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>'
};

/* ---------- progress helpers ---------- */
/* Macros are not all the same kind of number, and showing them identically is
   misleading:
     budget  — calories. Going over is the thing that actually matters.
     floor   — protein, fiber. These are minimums; exceeding them is a good
               outcome, not a failure, and must never be flagged red.
     flex    — carbs, fat. Allocations within the energy budget. Being a few
               grams over is not meaningful on its own if calories are fine. */
const MACRO_META = {
  calories: { label: 'Calories', unit: 'kcal', color: 'var(--cal)', verb: 'remaining', kind: 'budget' },
  protein: { label: 'Protein', unit: 'g', color: 'var(--pro)', verb: 'still needed', kind: 'floor' },
  carbs: { label: 'Carbs', unit: 'g', color: 'var(--carb)', verb: 'remaining', kind: 'flex' },
  fat: { label: 'Fat', unit: 'g', color: 'var(--fat)', verb: 'remaining', kind: 'flex' },
  fiber: { label: 'Fiber', unit: 'g', color: 'var(--fib)', verb: 'still needed', kind: 'floor' }
};
function ringSVG(pct, size, stroke, color, over) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const p = clamp(pct, 0, 1), dash = c * p;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform:rotate(-90deg)">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--surface-2)" stroke-width="${stroke}"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${over ? 'var(--over)' : color}"
      stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${dash} ${c}"
      style="transition:stroke-dasharray .5s cubic-bezier(.22,1,.36,1)"/>
  </svg>`;
}
function barRow(key, got, goal, ctx) {
  const m = MACRO_META[key];
  const pct = goal > 0 ? got / goal : 0;
  const past = got > goal + 0.5;
  const left = goal - got;
  let cls = '', txt, barCol = m.color, striped = false;

  if (m.kind === 'floor') {
    // a minimum: reaching or passing it is the win
    if (past) { cls = 'good'; txt = `Target met — ${fmtG(Math.abs(left))} ${m.unit} above`; }
    else if (goal > 0 && pct >= 0.95) { cls = 'good'; txt = `Target met`; }
    else txt = `${fmtG(Math.max(left, 0))} ${m.unit} ${m.verb}`;
  } else if (m.kind === 'budget') {
    // calories: the number that actually governs fat loss
    if (past) { cls = 'over'; barCol = 'var(--over)'; striped = true; txt = `${fmtG(Math.abs(left))} ${m.unit} over budget`; }
    else if (goal > 0 && pct >= 0.95) { cls = 'good'; txt = `On target — ${fmtG(Math.max(left, 0))} ${m.unit} ${m.verb}`; }
    else txt = `${fmtG(Math.max(left, 0))} ${m.unit} ${m.verb}`;
  } else {
    // carbs / fat: flexible allocation, judged against calories rather than alone
    if (past) {
      const calOk = ctx && ctx.calOk;
      cls = calOk ? '' : 'warn';
      barCol = 'var(--warn)';
      txt = calOk
        ? `${fmtG(Math.abs(left))} ${m.unit} above allocation — fine, calories are on track`
        : `${fmtG(Math.abs(left))} ${m.unit} above allocation`;
    } else txt = `${fmtG(Math.max(left, 0))} ${m.unit} ${m.verb}`;
  }
  return `<div class="bar-row">
    <div class="bar-top"><span class="bar-name">${m.label}</span>
      <span class="bar-val">${fmtG(got)} / ${fmtG(goal)} ${m.unit}</span></div>
    <div class="bar"><i class="${striped ? 'over' : ''}" style="width:${clamp(pct, 0, 1) * 100}%;background:${barCol}"></i></div>
    <div class="remain ${cls}">${txt}</div>
  </div>`;
}

/* ============================================================
   SETUP / ONBOARDING
   ============================================================ */
let setupData = {
  age: '', sex: 'male', heightCm: '', heightFt: '', heightIn: '', weightKg: '', weightLb: '',
  goalWeightKg: '', goalWeightLb: '', activity: 'light', exerciseDays: 3, rate: 0.45,
  manualCalories: '', units: 'metric'
};
const lbToKg = lb => lb * 0.453592, kgToLb = kg => kg / 0.453592;
const ftInToCm = (ft, i) => (ft * 12 + i) * 2.54;

function renderSetup() {
  document.body.classList.add('no-nav');
  const u = setupData.units, met = u === 'metric';
  APP.innerHTML = `
  <div class="wrap" style="padding-top:26px;padding-bottom:40px;max-width:560px">
    <div style="text-align:center;margin-bottom:22px">
      <div style="font-size:40px;line-height:1">🥗</div>
      <h1 style="margin-top:8px">Set up your targets</h1>
      <p style="color:var(--text-2);font-size:14.5px;margin-top:6px">
        A few details and the app works out calorie and macro targets for gradual fat loss
        while keeping protein high. Everything here is editable later.</p>
    </div>

    <div class="card">
      <div class="field"><span class="lbl">Units</span>
        <div class="seg" id="unitSeg">
          <button data-u="metric" class="${met ? 'on' : ''}">Metric (kg / cm)</button>
          <button data-u="imperial" class="${!met ? 'on' : ''}">Imperial (lb / ft)</button>
        </div>
      </div>
      <div class="grid2">
        <div class="field"><label for="sAge">Age</label>
          <input type="number" id="sAge" inputmode="numeric" min="14" max="100" placeholder="e.g. 32" value="${esc(setupData.age)}"></div>
        <div class="field"><span class="lbl">Sex</span>
          <div class="seg" id="sexSeg">
            <button data-s="male" class="${setupData.sex === 'male' ? 'on' : ''}">Male</button>
            <button data-s="female" class="${setupData.sex === 'female' ? 'on' : ''}">Female</button>
          </div>
        </div>
      </div>
      <div class="hint" style="margin:-6px 0 12px">Sex is used only because the BMR formula needs it.</div>

      <div class="field"><label>Height</label>
        ${met
      ? `<input type="number" id="sHcm" inputmode="decimal" placeholder="cm, e.g. 175" value="${esc(setupData.heightCm)}">`
      : `<div class="grid2">
               <input type="number" id="sHft" inputmode="numeric" placeholder="feet" value="${esc(setupData.heightFt)}">
               <input type="number" id="sHin" inputmode="numeric" placeholder="inches" value="${esc(setupData.heightIn)}"></div>`}
      </div>
      <div class="grid2">
        <div class="field"><label>Current weight</label>
          <input type="number" id="sW" inputmode="decimal" placeholder="${met ? 'kg' : 'lb'}" value="${esc(met ? setupData.weightKg : setupData.weightLb)}"></div>
        <div class="field"><label>Goal weight <span style="font-weight:400;color:var(--text-3)">(optional)</span></label>
          <input type="number" id="sGW" inputmode="decimal" placeholder="${met ? 'kg' : 'lb'}" value="${esc(met ? setupData.goalWeightKg : setupData.goalWeightLb)}"></div>
      </div>
    </div>

    <div class="card">
      <div class="field"><span class="lbl">Activity level (outside workouts)</span>
        <div class="choices" id="actChoices">
          ${Object.entries(ACTIVITY).map(([k, a]) => `
            <button class="choice ${setupData.activity === k ? 'on' : ''}" data-a="${k}">
              <span class="dot"></span><span><b>${a.label}</b><span>${a.desc}</span></span></button>`).join('')}
        </div>
      </div>
      <div class="field"><label for="sEx">Workouts per week: <b id="exVal">${setupData.exerciseDays}</b></label>
        <input type="range" id="sEx" min="0" max="7" step="1" value="${setupData.exerciseDays}" style="width:100%;padding:0;background:none;border:none">
        <div class="hint">Training days nudge your maintenance estimate up slightly.</div>
      </div>
    </div>

    <div class="card">
      <div class="field"><span class="lbl">Rate of fat loss</span>
        <div class="choices" id="rateChoices">
          ${RATES.map(r => `
            <button class="choice ${setupData.rate === r.v ? 'on' : ''}" data-r="${r.v}">
              <span class="dot"></span><span><b>${r.label}</b><span>${r.desc}</span></span></button>`).join('')}
        </div>
        <div class="hint">A gradual deficit protects muscle and is far easier to stick to. The app caps the
          deficit at 25% below maintenance regardless of what you pick.</div>
      </div>
      <div class="field"><label for="sMan">Manual calorie target <span style="font-weight:400;color:var(--text-3)">(optional)</span></label>
        <input type="number" id="sMan" inputmode="numeric" placeholder="Leave blank to use the calculated target" value="${esc(setupData.manualCalories)}">
      </div>
    </div>

    <div id="preview"></div>

    <button class="btn primary wide" id="sDone" style="margin-top:4px;min-height:52px;font-size:16px">Start tracking</button>
    <div class="hint" style="text-align:center;margin-top:10px">
      All values are estimates from a standard formula (Mifflin-St Jeor). Bodies vary — treat them as a
      starting point and adjust after a couple of weeks of real data.</div>
    <div class="spacer"></div>
  </div>`;

  const seg = (id, attr, key, after) => $$(`#${id} button`).forEach(b => b.onclick = () => {
    setupData[key] = b.dataset[attr]; if (after) after(); else renderSetup();
  });
  seg('unitSeg', 'u', 'units');
  seg('sexSeg', 's', 'sex');
  $$('#actChoices .choice').forEach(b => b.onclick = () => { readSetup(); setupData.activity = b.dataset.a; renderSetup(); });
  $$('#rateChoices .choice').forEach(b => b.onclick = () => { readSetup(); setupData.rate = parseFloat(b.dataset.r); renderSetup(); });
  $('#sEx').oninput = e => { setupData.exerciseDays = num(e.target.value, 3); $('#exVal').textContent = e.target.value; updatePreview(); };
  ['sAge', 'sHcm', 'sHft', 'sHin', 'sW', 'sGW', 'sMan'].forEach(id => {
    const el = $('#' + id); if (el) el.oninput = () => { readSetup(); updatePreview(); };
  });
  $('#sDone').onclick = finishSetup;
  updatePreview();

  function readSetup() {
    setupData.age = $('#sAge').value;
    setupData.manualCalories = $('#sMan').value;
    if (setupData.units === 'metric') {
      setupData.heightCm = $('#sHcm') ? $('#sHcm').value : setupData.heightCm;
      setupData.weightKg = $('#sW').value;
      setupData.goalWeightKg = $('#sGW').value;
      setupData.weightLb = setupData.weightKg ? r1(kgToLb(num(setupData.weightKg))) : '';
      setupData.goalWeightLb = setupData.goalWeightKg ? r1(kgToLb(num(setupData.goalWeightKg))) : '';
    } else {
      setupData.heightFt = $('#sHft') ? $('#sHft').value : '';
      setupData.heightIn = $('#sHin') ? $('#sHin').value : '';
      if (setupData.heightFt || setupData.heightIn)
        setupData.heightCm = r1(ftInToCm(num(setupData.heightFt), num(setupData.heightIn)));
      setupData.weightLb = $('#sW').value;
      setupData.goalWeightLb = $('#sGW').value;
      setupData.weightKg = setupData.weightLb ? r1(lbToKg(num(setupData.weightLb))) : '';
      setupData.goalWeightKg = setupData.goalWeightLb ? r1(lbToKg(num(setupData.goalWeightLb))) : '';
    }
  }
  function profileFromSetup() {
    return {
      age: num(setupData.age), sex: setupData.sex, heightCm: num(setupData.heightCm),
      weightKg: num(setupData.weightKg), goalWeightKg: num(setupData.goalWeightKg) || null,
      activity: setupData.activity, exerciseDays: num(setupData.exerciseDays, 3),
      rate: num(setupData.rate, 0.45), manualCalories: num(setupData.manualCalories) || null,
      units: setupData.units, createdAt: Date.now()
    };
  }
  function setupProblem(p) {
    if (!(p.age >= 14 && p.age <= 100)) return 'Enter an age between 14 and 100.';
    if (!(p.heightCm >= 120 && p.heightCm <= 230)) return 'Enter a height between 120 and 230 cm (about 4′0″ to 7′6″).';
    if (!(p.weightKg >= 30 && p.weightKg <= 350)) return 'Enter a current weight between 30 and 350 kg (66–770 lb).';
    if (p.goalWeightKg && p.goalWeightKg < 30) return 'That goal weight looks like a typo — check the units.';
    if (p.goalWeightKg && p.goalWeightKg > p.weightKg * 1.5) return 'That goal weight is far above your current weight — check the units.';
    return null;
  }
  function setupValid(p) { return !setupProblem(p); }
  function updatePreview() {
    const p = profileFromSetup();
    const box = $('#preview');
    const problem = setupProblem(p);
    if (problem) {
      const blank = !setupData.age && !setupData.heightCm && !setupData.weightKg;
      box.innerHTML = `<div class="card" style="text-align:center;color:var(--text-3);font-size:14px">
        ${blank ? 'Fill in age, height and current weight to see your estimated targets.' : esc(problem)}</div>`;
      $('#sDone').disabled = true; return;
    }
    const t = computeTargets(p);
    // a manual target below the calculated floor is allowed, but only deliberately
    const needsAck = t.manualBelowFloor;
    $('#sDone').disabled = needsAck && !($('#lowAck') && $('#lowAck').checked);
    const gw = num(setupData.goalWeightKg);
    const goalBmi = gw && p.heightCm ? gw / Math.pow(p.heightCm / 100, 2) : 0;
    box.innerHTML = `
    ${needsAck ? `<div class="card" style="border-color:var(--${t.manualClamped ? 'over' : 'warn'})">
      <div class="card-h"><h3 style="color:var(--${t.manualClamped ? 'over' : 'warn'})">
        ${t.manualClamped ? `${fmt(HARD_MIN_KCAL)} kcal is the lowest this app will set` : `That's below your calculated floor`}</h3></div>
      <p style="font-size:13.5px;color:var(--text-2);margin:0 0 10px">
        ${t.manualClamped
        ? `You entered ${fmt(num(setupData.manualCalories))} kcal. This app doesn't set targets below
           ${fmt(HARD_MIN_KCAL)} kcal — not as a judgement about what's safe for you, which it has no way to
           determine, but because below that it can't build a coherent set of macros and the number is more often
           a typo than an intention. It will use <b>${fmt(HARD_MIN_KCAL)} kcal</b> instead, still well under the
           ${fmt(t.floor)} kcal your own details imply. If a very low intake is something you're pursuing
           deliberately, that's worth planning with a doctor or dietitian rather than an app.`
        : `You've set ${fmt(num(setupData.manualCalories))} kcal. Based on your details the app would not go below
           <b>${fmt(t.floor)} kcal</b> — roughly 1.1× your estimated BMR. Eating well under that for long tends to
           cost muscle and make the deficit hard to sustain, which works against what you're training for.`}</p>
      <label style="display:flex;gap:10px;align-items:flex-start;font-size:13.5px;cursor:pointer">
        <input type="checkbox" id="lowAck" style="width:auto;margin-top:3px" ${$('#lowAck') && $('#lowAck').checked ? 'checked' : ''}>
        <span>I understand and want to use ${fmt(t.calories)} kcal anyway</span></label></div>` : ''}
    <div class="card">
      <div class="card-h"><h3>Your estimated targets</h3><span class="badge est">Estimate</span></div>
      <div class="kv"><span class="k">BMR (at rest)</span><span class="v">${fmt(t.bmr)} kcal</span></div>
      <div class="kv"><span class="k">Maintenance (TDEE)</span><span class="v">${fmt(t.tdee)} kcal</span></div>
      <div class="kv"><span class="k">Daily calorie target</span><span class="v" style="color:var(--cal)">${fmt(t.calories)} kcal</span></div>
      <div class="kv"><span class="k">Daily deficit</span><span class="v">${fmt(t.deficit)} kcal${t.deficit > 0 ? ` (~${r1(t.deficit * 7 / 7700)} kg/wk)` : ''}</span></div>
      <div class="kv"><span class="k">Protein</span><span class="v" style="color:var(--pro)">${t.protein} g</span></div>
      <div class="kv"><span class="k">Carbs</span><span class="v" style="color:var(--carb)">${t.carbs} g</span></div>
      <div class="kv"><span class="k">Fat</span><span class="v" style="color:var(--fat)">${t.fat} g</span></div>
      <div class="kv"><span class="k">Fiber</span><span class="v" style="color:var(--fib)">${t.fiber} g</span></div>
      <div class="note" style="margin-top:12px">These are estimates, not measurements. Protein is treated as a
        <b>minimum</b> rather than a leftover: 1.8 g per kg of ${t.proteinRefKg < p.weightKg
        ? `${t.proteinRefKg} kg` : 'your bodyweight'}, set first, with the remaining energy divided between fat and
        carbs afterwards.${t.proteinRefKg < p.weightKg ? ` Goal weight is used as the reference so excess fat mass
        doesn't inflate the number, but it's held at no less than 80% of your current weight so an ambitious goal
        can't quietly lower your protein floor.` : ''} Exceeding protein or fiber is a good outcome, not an overage.
        You can change every one of these in Settings.</div>
    </div>
    ${t.incoherent ? `<div class="card" style="border-color:var(--warn)">
      <div class="note" style="border-left-color:var(--warn)">
        <b>This calorie target is too low to carry your other targets.</b> At ${r1(t.proteinRefKg)} kg, a minimum
        of protein, essential fat and carbohydrate together need about <b>${fmt(t.minCoherentKcal)} kcal</b>. The app has
        scaled all three down so they still add up to ${fmt(t.calories)} kcal, but that means none of them is at a
        level worth aiming for. Raising the calorie target to ${fmt(t.minCoherentKcal)} or above is the fix.</div></div>`
      : t.proteinReduced ? `<div class="card"><div class="note" style="border-left-color:var(--warn)">
        Protein has been set to ${t.protein} g rather than the usual 1.8 g/kg (${r0(1.8 * t.proteinRefKg)} g),
        because at ${fmt(t.calories)} kcal there isn't room for that much protein alongside essential fat and a
        minimum of carbohydrate. A higher calorie target would let protein sit where it should.</div></div>` : ''}
    ${goalBmi && goalBmi < 18.5 ? `<div class="card"><div class="note" style="border-left-color:var(--warn)">
      For your height, a goal weight of ${r1(gw)} kg works out to a BMI of about ${r1(goalBmi)}, below the
      18.5–24.9 range generally treated as the healthy band. BMI is a crude measure and says nothing about
      your build, so take it as a flag to sanity-check the number rather than a verdict.</div></div>` : ''}`;
    const ack = $('#lowAck');
    if (ack) ack.onchange = () => { $('#sDone').disabled = !ack.checked; };
  }
  function finishSetup() {
    readSetup();
    const p = profileFromSetup();
    const problem = setupProblem(p);
    if (problem) { toast(problem); return; }
    const t0 = computeTargets(p);
    if (t0.manualBelowFloor && !($('#lowAck') && $('#lowAck').checked)) {
      toast('Confirm the low calorie target first, or clear it'); return;
    }
    DB.profile = p;
    DB.targets = t0;
    DB.settings.units = p.units;
    const k = todayKey();
    day(k).weight = p.weightKg;
    save(true);
    document.body.classList.remove('no-nav');
    VIEW = 'today'; CUR = todayKey();
    render();
    toast('Targets set — start logging');
  }
}

/* ============================================================
   APP CHROME
   ============================================================ */
function navHTML() {
  const items = [['today', 'Today'], ['history', 'History'], ['foods', 'Foods'], ['progress', 'Progress'], ['settings', 'Settings']];
  return `<nav class="nav">${items.map(([k, l]) =>
    `<button data-nav="${k}" class="${VIEW === k ? 'on' : ''}">${ICON[k]}<span>${l}</span></button>`).join('')}</nav>`;
}
function render() {
  if (!DB.profile || !DB.targets) { renderSetup(); return; }
  document.body.classList.remove('no-nav');
  const body =
    VIEW === 'today' ? viewToday() :
      VIEW === 'history' ? viewHistory() :
        VIEW === 'foods' ? viewFoods() :
          VIEW === 'progress' ? viewProgress() : viewSettings();
  APP.innerHTML = navHTML() + body;
  $$('.nav button').forEach(b => b.onclick = () => {
    PREVIEW = null;                 // leaving Today abandons an unsaved plan
    VIEW = b.dataset.nav; window.scrollTo(0, 0); render();
  });
  if (VIEW === 'today') mountToday();
  if (VIEW === 'history') mountHistory();
  if (VIEW === 'foods') mountFoods();
  if (VIEW === 'progress') mountProgress();
  if (VIEW === 'settings') mountSettings();
}

/* ============================================================
   TODAY
   ============================================================ */
function viewToday() {
  const t = targetsFor(CUR), got = dayTotals(CUR), rem = remaining(CUR);
  const pct = t.calories > 0 ? got.calories / t.calories : 0;
  const over = got.calories > t.calories;
  const ctx = { calOk: got.calories <= t.calories };
  const isToday = CUR === todayKey();
  const d = dayOrNull(CUR);
  const nEntries = d ? d.entries.length : 0;

  return `
  <div class="apphead"><div class="wrap">
    <div>
      <div class="eyebrow">${isToday ? parseKey(CUR).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) : 'Viewing'}</div>
      <h1 style="margin-top:1px">${prettyDate(CUR)}</h1>
    </div>
    <div class="date-nav">
      <button class="btn icon" data-day="-1" aria-label="Previous day">${ICON.left}</button>
      ${!isToday ? `<button class="btn sm" data-day="today">Today</button>` : ''}
      <button class="btn icon" data-day="1" aria-label="Next day" ${CUR >= todayKey() ? 'disabled' : ''}>${ICON.right}</button>
    </div>
  </div></div>

  <div class="wrap">
    ${backupBannerHTML()}
    <div class="card">
      <div class="rings">
        <div class="ring-main" style="position:relative;width:118px;height:118px">
          ${ringSVG(pct, 118, 11, 'var(--cal)', over)}
          <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center">
            <div class="kcal-num" style="${over ? 'color:var(--over)' : ''}">${fmt(got.calories)}</div>
            <div class="kcal-sub">of ${fmt(t.calories)} kcal</div>
          </div>
        </div>
        <div class="ring-side">
          <div>
            <div style="font-size:15px;font-weight:650;${over ? 'color:var(--over)' : ''}">
              ${over ? `${fmt(Math.abs(rem.calories))} kcal over` : `${fmt(rem.calories)} kcal left`}</div>
            <div style="font-size:12.5px;color:var(--text-2);margin-top:2px">
              ${over ? 'Not a problem on its own — what matters is the weekly average.'
      : nEntries === 0 ? 'Nothing logged yet today.' : `${nEntries} item${nEntries > 1 ? 's' : ''} logged`}</div>
          </div>
          ${barRow('protein', got.protein, t.protein, ctx)}
        </div>
      </div>
      <div class="macro-grid three">
        ${barRow('fiber', got.fiber, t.fiber, ctx)}
        ${barRow('carbs', got.carbs, t.carbs, ctx)}
        ${barRow('fat', got.fat, t.fat, ctx)}
      </div>
    </div>

    <div class="card tight" id="coachCard">${coachHTML(CUR)}</div>
    ${CUR !== todayKey() && dayOrNull(CUR) && dayOrNull(CUR).targets
      && dayOrNull(CUR).targets.calories !== DB.targets.calories ? `<div class="card tight">
      <div class="hint" style="margin:0">Showing ${esc(prettyDate(CUR))} against the targets that applied then
        (${fmt(t.calories)} kcal, ${t.protein} g protein). Your current target is ${fmt(DB.targets.calories)} kcal.</div>
    </div>` : ''}

    <div class="card">
      <div class="card-h"><h3>Meals</h3>
        <div class="btn-row">
          <button class="btn sm" data-act="copyday">Copy a day</button>
          ${nEntries ? `<button class="btn sm" data-act="saveday">Save as meal</button>` : ''}
        </div></div>
      ${MEALS.map(m => mealHTML(CUR, m)).join('')}
    </div>

    ${nEntries ? `<div class="card tight">
      <div class="btn-row"><button class="btn sm" data-act="resetday">Reset this day</button></div></div>` : ''}

    <div class="card">
      <div class="card-h"><h3>Weight</h3></div>
      <div style="display:flex;gap:9px;align-items:center">
        <input type="number" inputmode="decimal" id="wIn" placeholder="${DB.settings.units === 'metric' ? 'kg' : 'lb'}"
          value="${d && d.weight ? esc(dispWeight(d.weight)) : ''}" style="flex:1">
        <button class="btn" data-act="saveweight">Save</button>
      </div>
      <div class="hint">Optional. Day-to-day swings are mostly water and food volume — the trend line on
        Progress is the useful number.</div>
    </div>
    <div class="spacer"></div>
  </div>

  <button class="fab" data-act="add">${ICON.plus} Add food</button>`;
}

function mealHTML(k, meal) {
  const d = dayOrNull(k);
  const entries = d ? d.entries.filter(e => e.meal === meal) : [];
  const tot = mealTotals(k, meal);
  return `<div class="meal">
    <div class="meal-h">
      <div class="t"><h3 style="font-size:15px">${MEAL_LABEL[meal]}</h3>
        ${entries.length ? `<span class="kc">${fmt(tot.calories)} kcal · P ${fmtG(tot.protein)}g</span>` : ''}</div>
      <button class="btn sm ghost" data-addmeal="${meal}">+ Add</button>
    </div>
    <div class="items">
      ${entries.length ? entries.map(e => {
    const n = entryNutr(e);
    return `<button class="item" data-entry="${e.id}">
          <div class="info">
            <div class="nm">${esc(e.name)} ${e.estimate ? '<span class="badge est">Est</span>' : ''}${e.kind === 'recipe' ? '<span class="badge rec">Recipe</span>' : ''}</div>
            <div class="sub">${esc(describeServing(e))} · P ${fmtG(n.protein)} · C ${fmtG(n.carbs)} · F ${fmtG(n.fat)}${n.fiber ? ` · Fib ${fmtG(n.fiber)}` : ''}</div>
          </div>
          <div class="kc">${fmt(n.calories)}</div>
        </button>`;
  }).join('') : `<div class="empty">Nothing logged</div>`}
    </div>
  </div>`;
}

function dispWeight(kg) {
  return DB.settings.units === 'metric' ? r1(kg) : r1(kgToLb(kg));
}
function inputWeightToKg(v) {
  const n = num(v); if (!n) return null;
  return DB.settings.units === 'metric' ? n : lbToKg(n);
}

/* ---------- daily coach ---------- */
function coachHTML(k) {
  const t = targetsFor(k), got = dayTotals(k), rem = remaining(k);
  const d = dayOrNull(k);
  const n = d ? d.entries.length : 0;
  const lines = [];
  const hasEstimate = d && d.entries.some(e => e.estimate);

  if (n === 0) {
    lines.push(['🍽️', `Nothing logged yet. Your budget for the day is <b>${fmt(t.calories)} kcal</b> with <b>${t.protein} g protein</b>.`]);
  } else {
    lines.push(['🔥', `You're at <b>${fmt(got.calories)}</b> of ${fmt(t.calories)} calories — ${rem.calories >= 0
      ? `about <b>${fmt(rem.calories)} kcal remaining</b>.` : `<b>${fmt(Math.abs(rem.calories))} kcal over</b> today.`}`]);

    if (rem.protein > 0.5) lines.push(['💪', `You still need about <b>${fmtG(rem.protein)} g of protein</b> today (${fmtG(got.protein)} of ${t.protein} g).`]);
    else lines.push(['✅', `Protein target met — ${fmtG(got.protein)} g of ${t.protein} g.`]);

    // the classic squeeze: calories nearly gone, protein still low
    const calUsed = t.calories > 0 ? got.calories / t.calories : 0;
    const proUsed = t.protein > 0 ? got.protein / t.protein : 0;
    if (calUsed > 0.75 && proUsed < 0.7 && rem.calories > 0) {
      const dens = rem.protein > 0 ? rem.calories / rem.protein : 0;
      lines.push(['🎯', `Your calorie budget is nearly used while protein is still below target. What's left works out to
        roughly <b>${r0(dens)} kcal per gram of protein</b> — leaner, higher-protein foods (chicken breast, tilapia,
        Greek yogurt, egg whites, whey) fit that better than carb- or oil-heavy options.`]);
    }
    if (rem.calories < 0 && rem.protein <= 0) {
      lines.push(['📊', `Over on calories with protein covered. One day above target doesn't undo a week — the weekly
        average on Progress is the number worth watching.`]);
    }
    if (rem.fiber > 0 && got.calories > t.calories * 0.6) {
      lines.push(['🌿', `Fiber is at ${fmtG(got.fiber)} of ${t.fiber} g — ${fmtG(rem.fiber)} g still needed. Vegetables,
        beans and fruit are the cheapest way to close that gap.`]);
    }
    // carbs/fat are allocations: only worth mentioning when calories are also over
    if (rem.calories < 0 && (got.fat > t.fat * 1.15 || got.carbs > t.carbs * 1.15)) {
      const driver = (got.fat - t.fat) * 9 > (got.carbs - t.carbs) * 4 ? 'fat' : 'carbs';
      lines.push(['🫒', `Calories are over and ${driver} is the larger contributor. ${driver === 'fat'
        ? 'Cooking oil is usually the biggest single lever there.'
        : 'Starchy portions — rice, eba, bread — are usually the biggest lever there.'}`]);
    } else if (rem.calories >= 0 && (got.carbs > t.carbs || got.fat > t.fat)) {
      lines.push(['⚖️', `You're above your carb or fat allocation but still inside your calorie budget, which is the
        number that governs fat loss. Nothing to correct here — the split is flexible.`]);
    }
  }
  if (hasEstimate) lines.push(['ℹ️', `Some of today's items are estimates, so these numbers are approximate. Building those
    dishes in the Recipe Builder once makes every future log of them accurate.`]);

  return `<div class="card-h" style="margin-bottom:4px"><h3>Today's status</h3></div>
    ${lines.map(([ic, txt]) => `<div class="coach-line"><span class="ic">${ic}</span><span>${txt}</span></div>`).join('')}
    <div class="btn-row" style="margin-top:12px">
      <button class="btn sm primary" data-act="plan">🍽️ Plan a meal</button>
      ${n ? `<button class="btn sm" data-act="stilleat">What can I still eat?</button>` : ''}
    </div>`;
}

function mountToday() {
  $$('[data-day]').forEach(b => b.onclick = () => {
    const v = b.dataset.day;
    CUR = v === 'today' ? todayKey() : shiftKey(CUR, parseInt(v, 10));
    if (CUR > todayKey()) CUR = todayKey();
    render();
  });
  $$('[data-addmeal]').forEach(b => b.onclick = () => openAddFood(b.dataset.addmeal));
  $$('[data-entry]').forEach(b => b.onclick = () => openEntryEditor(CUR, b.dataset.entry));
  const act = (name, fn) => $$(`[data-act="${name}"]`).forEach(b => b.onclick = fn);
  act('add', () => openAddFood(guessMeal()));
  act('plan', () => openMealPreview(guessMeal()));
  act('stilleat', () => openStillEat(CUR));
  mountBackupBanner();
  act('copyday', () => openCopyDay(CUR));
  act('saveday', () => openSaveDayAsMeal(CUR));
  act('resetday', () => confirmSheet('Reset this day?',
    `This removes all ${dayOrNull(CUR).entries.length} logged items for ${prettyDate(CUR)}. Your weight entry is kept.`,
    'Reset day', () => { day(CUR).entries = []; save(); render(); toast('Day reset'); }, true));
  act('saveweight', () => {
    const kg = inputWeightToKg($('#wIn').value);
    day(CUR).weight = kg;
    if (kg && CUR === todayKey() && DB.profile) DB.profile.weightKg = r1(kg);
    save(); toast(kg ? 'Weight saved' : 'Weight cleared'); render();
  });
  const head = $('.apphead');
  if (head) {
    const onScroll = () => head.classList.toggle('scrolled', window.scrollY > 6);
    window.removeEventListener('scroll', window.__hs || (() => { }));
    window.__hs = onScroll; window.addEventListener('scroll', onScroll); onScroll();
  }
}
function guessMeal() {
  const h = new Date().getHours();
  if (h < 11) return 'breakfast';
  if (h < 16) return 'lunch';
  if (h < 21) return 'dinner';
  return 'snacks';
}

/* ---------- what can I still eat ---------- */
/* Score a candidate portion against ALL the remaining macros, not just
   calories. The weights encode the hierarchy the app works to:
   calories are the gate, protein is the thing to close, fiber is a bonus,
   and carbs/fat are soft penalties only for the part that overshoots. */
function fitScore(n, rem) {
  const proNeed = Math.max(rem.protein, 0);
  const fibNeed = Math.max(rem.fiber, 0);
  const fatLeft = Math.max(rem.fat, 0);
  const carbLeft = Math.max(rem.carbs, 0);

  const proGain = Math.min(n.protein, proNeed);        // protein that actually helps
  const proWaste = Math.max(0, n.protein - proNeed) * 0.15;
  const fibGain = Math.min(n.fiber || 0, fibNeed);
  const fatOver = Math.max(0, n.fat - fatLeft);        // only the overshoot is penalised
  const carbOver = Math.max(0, n.carbs - carbLeft);
  const calCost = n.calories / 100;

  return {
    score: proGain * 10 + proWaste + fibGain * 2 - fatOver * 4 - carbOver * 1.5 - calCost * 0.6
      + Math.min(DB.usage[n.__id] ? DB.usage[n.__id].n : 0, 6) * 0.8,
    proGain, fibGain, fatOver, carbOver
  };
}
function fitLabel(f) {
  const bits = [];
  if (f.proGain >= 1) bits.push(`+${fmtG(f.proGain)} g toward protein`);
  if (f.fibGain >= 1) bits.push(`+${fmtG(f.fibGain)} g fiber`);
  if (f.fatOver < 0.5 && f.carbOver < 0.5) bits.push('fits fat and carbs');
  else {
    if (f.fatOver >= 0.5) bits.push(`${fmtG(f.fatOver)} g past fat`);
    if (f.carbOver >= 0.5) bits.push(`${fmtG(f.carbOver)} g past carbs`);
  }
  return bits.join(' · ');
}

function openStillEat(k) {
  const rem = remaining(k), t = targetsFor(k);
  const overCal = rem.calories <= 0;
  // candidate foods that fit inside remaining calories at a sensible portion
  const cands = [];
  const consider = [...DB.foods, ...DB.recipes.map(recipeToFood)];
  consider.forEach(f => {
    // a saved personal portion is the truest "normal serving" for this person
    const mine = defaultUsablePortion(f);
    let qty, uname;
    if (mine && f.units.some(u => u.name === mine.unit)) { qty = mine.qty; uname = mine.unit; }
    else {
      const unit = f.units[0];
      const pick = f.units.find(u => /portion|serving|slice|cup|fillet|breast|egg|handful|scoop|medium|bowl|mug|plate/i.test(u.name));
      if (pick) { uname = pick.name; qty = 1; }
      else { uname = unit.name; qty = (unit.name === 'g' || unit.name === 'ml') ? 100 : 1; }
    }
    const e = makeEntry(f, qty, uname, 'snacks');
    const n = entryNutr(e);
    if (n.calories <= 5) return;
    if (n.calories > Math.max(rem.calories, 0)) return;
    n.__id = f.id;
    const fit = fitScore(n, rem);
    // drop anything whose overshoot outweighs what it contributes
    if (fit.score <= 0) return;
    cands.push({ f, e, n, fit, score: fit.score, usedMine: !!mine });
  });
  cands.sort((a, b) => b.score - a.score);
  const top = cands.slice(0, 8);

  const body = `
    <p style="color:var(--text-2);font-size:14.5px;margin-bottom:12px">
      ${overCal
      ? `You're already at or past your calorie target for ${prettyDate(k).toLowerCase()}. Anything more goes above it — which is fine occasionally, just worth doing deliberately.`
      : `Whatever you eat for the rest of ${prettyDate(k).toLowerCase()} should roughly fit inside this:`}
    </p>
    <div class="stat-grid" style="grid-template-columns:repeat(2,1fr);margin-bottom:14px">
      ${[['calories', 'kcal'], ['protein', 'g protein'], ['carbs', 'g carbs'], ['fat', 'g fat']].map(([m, lbl]) =>
        `<div class="stat"><div class="l">${MACRO_META[m].label}</div>
           <div class="n" style="color:${rem[m] < 0 ? 'var(--over)' : MACRO_META[m].color}">${rem[m] < 0 ? '−' : ''}${fmtG(Math.abs(rem[m]))}</div>
           <div class="s">${lbl} ${rem[m] < 0 ? 'over' : 'left'}</div></div>`).join('')}
    </div>
    ${rem.protein > 0 && rem.calories > 0 ? `<div class="note" style="margin-bottom:14px">
      To land on both numbers you'd want roughly <b>${r0(rem.calories / Math.max(rem.protein, 1))} kcal per gram of protein</b>
      from here. For reference: chicken breast is about 5, salmon about 9, white rice about 48, and oil is
      protein-free. That's a guide, not a rule.</div>` : ''}
    ${top.length ? `<h3 style="font-size:14px;margin-bottom:6px">From your foods, these fit what's left</h3>
      <div class="srch-res">${top.map((c, i) => `
        <button class="res" data-fit="${i}">
          <div class="info"><div class="nm">${esc(c.f.name)} ${c.f.estimate ? '<span class="badge est">Est</span>' : ''}${c.usedMine ? '<span class="badge mine">My portion</span>' : ''}</div>
            <div class="sub">${esc(describeServing(c.e))} · ${fmt(c.n.calories)} kcal</div>
            <div class="sub" style="color:${c.fit.fatOver + c.fit.carbOver > 0.5 ? 'var(--warn)' : 'var(--good)'}">${esc(fitLabel(c.fit))}</div></div>
          <span style="color:var(--accent);font-weight:700;font-size:20px">+</span>
        </button>`).join('')}</div>`
      : `<div class="empty">Nothing in your foods fits what's left at a normal portion without pushing a macro
           well past its allocation. Smaller portions of anything still work.</div>`}
    <div class="hint" style="margin-top:12px">Ranked by how much of your remaining protein gap a normal portion
      closes, minus what it pushes past your remaining fat and carbs. Where a food is marked Est its numbers are
      approximate, so this is a shortlist rather than precise optimisation.</div>`;

  openSheet('What can I still eat?', body, `<button class="btn" data-act="close">Close</button>`, () => {
    $('#sheetFoot [data-act=close]').onclick = () => closeSheet();
    $$('[data-fit]').forEach(b => b.onclick = () => {
      const c = top[parseInt(b.dataset.fit, 10)];
      closeSheet();
      openPortion(c.f, guessMeal(), null, c.e.qty, c.e.unit);
    });
  });
}
