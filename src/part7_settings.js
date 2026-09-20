/* ============================================================
   SETTINGS — targets, profile, theme, export/import, CSV
   ============================================================ */
function viewSettings() {
  const t = DB.targets, p = DB.profile;
  const th = DB.settings.theme || 'system';
  const nDays = loggedDays().length;
  const nEntries = Object.values(DB.days).reduce((a, d) => a + (d.entries ? d.entries.length : 0), 0);

  return `
  <div class="apphead"><div class="wrap">
    <div><div class="eyebrow">Configuration</div><h1 style="margin-top:1px">Settings</h1></div>
  </div></div>
  <div class="wrap">
    <div class="card">
      <div class="card-h"><h3>Daily targets</h3>
        ${t.custom ? '<span class="badge">Custom</span>' : '<span class="badge est">Calculated</span>'}</div>
      <div class="grid2">
        ${MACROS.map(m => `<div class="field">
          <label for="t_${m}">${MACRO_META[m].label} (${MACRO_META[m].unit})</label>
          <input type="number" id="t_${m}" inputmode="numeric" value="${t[m]}"></div>`).join('')}
      </div>
      <div id="tCheck" class="hint"></div>
      <div class="btn-row" style="margin-top:10px">
        <button class="btn primary" data-act="saveTargets">Save targets</button>
        <button class="btn" data-act="recalcTargets">Recalculate from profile</button>
      </div>
      <div class="hint" style="margin-top:10px">Calculated targets come from Mifflin-St Jeor plus an activity
        multiplier — a decent starting estimate, not a measurement. If your weight isn't moving as expected after
        two or three weeks of consistent logging, adjust by 100–200 kcal rather than making a large jump.</div>
    </div>

    <div class="card">
      <div class="card-h"><h3>Your details</h3></div>
      <div class="kv"><span class="k">Age</span><span class="v">${p.age}</span></div>
      <div class="kv"><span class="k">Sex</span><span class="v">${p.sex === 'male' ? 'Male' : 'Female'}</span></div>
      <div class="kv"><span class="k">Height</span><span class="v">${r1(p.heightCm)} cm (${Math.floor(p.heightCm / 2.54 / 12)}′${r0(p.heightCm / 2.54 % 12)}″)</span></div>
      <div class="kv"><span class="k">Weight</span><span class="v">${r1(p.weightKg)} kg (${r1(kgToLb(p.weightKg))} lb)</span></div>
      ${p.goalWeightKg ? `<div class="kv"><span class="k">Goal weight</span><span class="v">${r1(p.goalWeightKg)} kg (${r1(kgToLb(p.goalWeightKg))} lb)</span></div>` : ''}
      <div class="kv"><span class="k">Activity</span><span class="v">${ACTIVITY[p.activity].label}</span></div>
      <div class="kv"><span class="k">Workouts / week</span><span class="v">${p.exerciseDays}</span></div>
      <div class="kv"><span class="k">BMR (estimated)</span><span class="v">${fmt(t.bmr)} kcal</span></div>
      <div class="kv"><span class="k">Maintenance (estimated)</span><span class="v">${fmt(t.tdee)} kcal</span></div>
      <div class="btn-row" style="margin-top:12px">
        <button class="btn" data-act="editProfile">Edit details</button>
      </div>
    </div>

    <div class="card">
      <div class="card-h"><h3>Display</h3></div>
      <div class="field"><span class="lbl">Appearance</span>
        <div class="seg" id="themeSeg">
          <button data-t="light" class="${th === 'light' ? 'on' : ''}">Light</button>
          <button data-t="dark" class="${th === 'dark' ? 'on' : ''}">Dark</button>
          <button data-t="system" class="${th === 'system' ? 'on' : ''}">System</button>
        </div>
        <div class="hint">${th === 'system'
      ? `Following your device, which is currently ${resolvedTheme()}. Changes as your device does.`
      : `Always ${th}, regardless of your device setting.`}</div>
      </div>
      <div class="field" style="margin-top:8px"><span class="lbl">Weight units</span>
        <div class="seg" id="unitsSeg">
          <button data-u="metric" class="${DB.settings.units === 'metric' ? 'on' : ''}">Kilograms</button>
          <button data-u="imperial" class="${DB.settings.units === 'imperial' ? 'on' : ''}">Pounds</button>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-h"><h3>Your data</h3></div>
      <div class="kv"><span class="k">Days logged</span><span class="v">${nDays}</span></div>
      <div class="kv"><span class="k">Food entries</span><span class="v">${nEntries}</span></div>
      <div class="kv"><span class="k">Custom foods</span><span class="v">${DB.foods.filter(f => f.custom).length}</span></div>
      <div class="kv"><span class="k">Recipes</span><span class="v">${DB.recipes.length}</span></div>
      <div class="kv"><span class="k">Saved meals</span><span class="v">${DB.savedMeals.length}</span></div>
      <div class="kv"><span class="k">My portions</span><span class="v">${Object.values(DB.myPortions || {}).reduce((a, l) => a + l.length, 0)}</span></div>
      <div class="kv"><span class="k">Last backup</span><span class="v" style="${backupDue() ? 'color:var(--warn)' : ''}">${DB.meta && DB.meta.lastExport
        ? prettyDate(dkey(new Date(DB.meta.lastExport))) : 'Never'}</span></div>
      <div class="btn-row" style="margin-top:12px">
        <button class="btn" data-act="export">Export backup (JSON)</button>
        <button class="btn" data-act="csv">Export history (CSV)</button>
        <button class="btn" data-act="import">Import backup</button>
      </div>
      <input type="file" id="importFile" accept="application/json,.json" style="display:none">
      <div class="hint" style="margin-top:10px">Everything lives in this browser's local storage on this device —
        nothing is sent anywhere. Clearing site data or using a different browser means starting over, so export a
        backup now and then.</div>
    </div>

    <div class="card">
      <div class="card-h"><h3>Reset</h3></div>
      <div class="btn-row">
        <button class="btn danger" data-act="resetFoods">Restore starter foods</button>
        <button class="btn danger" data-act="wipe">Erase everything</button>
      </div>
    </div>

    <div class="card">
      <div class="card-h"><h3>About the numbers</h3></div>
      <p style="font-size:13.5px;color:var(--text-2);line-height:1.55;margin:0">
        Calorie and macro targets here are estimates from a population formula; individual metabolisms vary by
        roughly ±10%. Nutrition values for single foods are generic reference figures, and anything marked
        <span class="badge est">Est</span> varies a lot by how it's cooked — build those in the Recipe Builder for
        real numbers. Fat loss comes from a sustained calorie deficit overall; no specific food or exercise
        targets fat from a particular part of the body. This app tracks what you eat — it isn't medical advice,
        and it's worth talking to a doctor or dietitian before a significant change, especially with any health
        condition or medication in the picture.</p>
    </div>
    <div class="spacer"></div>
  </div>`;
}

function mountSettings() {
  const checkTargets = () => {
    const v = {}; MACROS.forEach(m => v[m] = num($('#t_' + m).value));
    const kcal = v.protein * 4 + v.carbs * 4 + v.fat * 9;
    const diff = kcal - v.calories;
    $('#tCheck').innerHTML = Math.abs(diff) > Math.max(60, v.calories * 0.07)
      ? `<span style="color:var(--warn)">Your protein, carbs and fat add up to ${fmt(kcal)} kcal, which is
         ${fmt(Math.abs(diff))} ${diff > 0 ? 'above' : 'below'} your calorie target. That's allowed — the app tracks
         them independently — but they usually should roughly match.</span>`
      : `Macros add up to ${fmt(kcal)} kcal, in line with your calorie target.`;
  };
  MACROS.forEach(m => { $('#t_' + m).oninput = checkTargets; });
  checkTargets();

  $('[data-act=saveTargets]').onclick = () => {
    const nt = { ...DB.targets, custom: true };
    MACROS.forEach(m => { nt[m] = Math.max(0, r0(num($('#t_' + m).value))); });
    const calcFloor = DB.targets.floor || r0(Math.max(DB.targets.bmr * 1.1, DB.profile.sex === 'male' ? 1500 : 1200));

    if (nt.calories < HARD_MIN_KCAL) {
      confirmSheet('Below what this app will set',
        `This app doesn't set targets below ${fmt(HARD_MIN_KCAL)} kcal — below that it can't build a coherent ` +
        `set of macros, and the number is more often a slip than an intention. It isn't a judgement about what's ` +
        `right for you, which the app can't determine. Your own calculated floor is ${fmt(calcFloor)} kcal.`,
        `Use ${fmt(calcFloor)} kcal instead`, () => {
          nt.calories = calcFloor; nt.floor = calcFloor;
          DB.targets = nt; refreshTodayTargets(); save(); render(); toast('Target set to your floor');
        }, false, () => { render(); toast('Targets not saved'); }, 'Keep current');
      return;
    }
    const commit = () => {
      nt.floor = calcFloor; DB.targets = nt;
      refreshTodayTargets();          // today follows the current plan
      save(); render(); toast('Targets saved');
    };
    // the floor is itself an estimate, so don't nag about trivial differences
    if (nt.calories < calcFloor * 0.95) {
      confirmSheet('Below your calculated floor',
        `${fmt(nt.calories)} kcal is under the ${fmt(calcFloor)} kcal floor your details imply (about 1.1× your ` +
        `estimated BMR). Eating well below that for long tends to cost muscle and makes the deficit hard to hold, ` +
        `which works against preserving what you're training for.`,
        'Use it anyway', commit, false,
        () => { render(); toast('Targets not saved'); }, 'Keep current');
      return;
    }
    if (DB.profile && nt.protein < 1.2 * proteinRefKg(DB.profile)) {
      confirmSheet('That protein target is low',
        `${nt.protein} g is under about 1.2 g per kg of your reference weight. While losing fat, protein is the ` +
        `main thing protecting muscle, so this is usually the last number to cut.`,
        'Use it anyway', commit, false,
        () => { render(); toast('Targets not saved'); }, 'Keep current');
      return;
    }
    commit();
  };
  $('[data-act=recalcTargets]').onclick = () => confirmSheet('Recalculate targets?',
    DB.profile.manualCalories
      ? `This replaces your targets with fresh values from your details, and clears the manual calorie target of ` +
      `${fmt(DB.profile.manualCalories)} kcal you set during setup — otherwise it would just be reapplied.`
      : 'This replaces your current targets with fresh values calculated from your profile details.',
    'Recalculate', () => {
      // a manual override persisted on the profile would survive the recalc and
      // make the button a no-op, so clearing it is part of recalculating
      DB.profile = { ...DB.profile, manualCalories: null };
      DB.targets = computeTargets(DB.profile);
      refreshTodayTargets();
      save(); render(); toast('Targets recalculated');
    });
  $('[data-act=editProfile]').onclick = openProfileEditor;

  $$('#themeSeg button').forEach(b => b.onclick = () => {
    DB.settings.theme = b.dataset.t;
    applyTheme(); save(); render();
  });
  $$('#unitsSeg button').forEach(b => b.onclick = () => {
    DB.settings.units = b.dataset.u; save(); render();
  });

  $('[data-act=export]').onclick = exportJSON;
  $('[data-act=csv]').onclick = exportCSV;
  $('[data-act=import]').onclick = () => $('#importFile').click();
  $('#importFile').onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => importJSON(rd.result);
    rd.onerror = () => toast('Could not read that file');
    rd.readAsText(f);
    e.target.value = '';
  };
  $('[data-act=resetFoods]').onclick = () => confirmSheet('Restore starter foods?',
    'Re-adds any starter library foods you deleted, and resets edited starter foods to their original values. Your own foods, recipes and logs are untouched.',
    'Restore', () => {
      const keep = DB.foods.filter(f => !f.lib);
      DB.foods = [...starterFoods(), ...keep];
      DB.deletedLib = [];
      save(); render(); toast('Starter foods restored');
    });
  $('[data-act=wipe]').onclick = () => confirmSheet('Erase everything?',
    'This permanently deletes your profile, targets, every logged day, all custom foods, recipes and saved meals from this browser. Export a backup first if there is any chance you want it back.',
    'Erase everything', () => {
      localStorage.removeItem(KEY);
      DB = defaultDB();
      VIEW = 'today'; CUR = todayKey(); HIST = todayKey(); CAL_MONTH = null;
      applyTheme(); render(); toast('All data erased');
    }, true);
}

function openProfileEditor() {
  const p = DB.profile;
  const met = DB.settings.units === 'metric';
  const body = `
    <div class="grid2">
      <div class="field"><label for="pAge">Age</label><input type="number" id="pAge" value="${p.age}"></div>
      <div class="field"><span class="lbl">Sex</span>
        <div class="seg" id="pSex">
          <button data-s="male" class="${p.sex === 'male' ? 'on' : ''}">Male</button>
          <button data-s="female" class="${p.sex === 'female' ? 'on' : ''}">Female</button></div></div>
    </div>
    <div class="field"><label for="pH">Height (cm)</label><input type="number" id="pH" step="any" value="${r1(p.heightCm)}"></div>
    <div class="grid2">
      <div class="field"><label for="pW">Current weight (${met ? 'kg' : 'lb'})</label>
        <input type="number" id="pW" step="any" value="${dispWeight(p.weightKg)}"></div>
      <div class="field"><label for="pG">Goal weight (${met ? 'kg' : 'lb'})</label>
        <input type="number" id="pG" step="any" value="${p.goalWeightKg ? dispWeight(p.goalWeightKg) : ''}"></div>
    </div>
    <div class="field"><span class="lbl">Activity level</span>
      <div class="choices" id="pAct">${Object.entries(ACTIVITY).map(([k, a]) => `
        <button class="choice ${p.activity === k ? 'on' : ''}" data-a="${k}">
          <span class="dot"></span><span><b>${a.label}</b><span>${a.desc}</span></span></button>`).join('')}</div></div>
    <div class="field"><label for="pEx">Workouts per week: <b id="pExV">${p.exerciseDays}</b></label>
      <input type="range" id="pEx" min="0" max="7" value="${p.exerciseDays}" style="width:100%;padding:0;background:none;border:none"></div>
    <div class="field"><span class="lbl">Rate of fat loss</span>
      <div class="choices" id="pRate">${RATES.map(r => `
        <button class="choice ${num(p.rate, 0.45) === r.v ? 'on' : ''}" data-r="${r.v}">
          <span class="dot"></span><span><b>${r.label}</b><span>${r.desc}</span></span></button>`).join('')}</div></div>
    <div class="field"><label for="pMan">Manual calorie target <span style="font-weight:400;color:var(--text-3)">(optional)</span></label>
      <input type="number" id="pMan" inputmode="numeric" placeholder="Leave blank to use the calculated target"
        value="${p.manualCalories ? esc(p.manualCalories) : ''}">
      <div class="hint">If set, this overrides the calculated calorie target whenever targets are recalculated.
        Clear it to go back to the calculated number.</div></div>
    <div class="note">Saving here updates your details. You'll be asked whether to recalculate targets from them.</div>`;
  openSheet('Your details', body, `<button class="btn" data-act="cancel">Cancel</button>
    <button class="btn primary" data-act="save">Save details</button>`, () => {
    let sex = p.sex, act = p.activity, rate = num(p.rate, 0.45);
    $$('#pSex button').forEach(b => b.onclick = () => { sex = b.dataset.s; $$('#pSex button').forEach(x => x.classList.toggle('on', x === b)); });
    $$('#pAct .choice').forEach(b => b.onclick = () => { act = b.dataset.a; $$('#pAct .choice').forEach(x => x.classList.toggle('on', x === b)); });
    $$('#pRate .choice').forEach(b => b.onclick = () => { rate = parseFloat(b.dataset.r); $$('#pRate .choice').forEach(x => x.classList.toggle('on', x === b)); });
    $('#pEx').oninput = e => { $('#pExV').textContent = e.target.value; };
    $('#sheetFoot [data-act=cancel]').onclick = () => closeSheet();
    $('#sheetFoot [data-act=save]').onclick = () => {
      const wKg = inputWeightToKg($('#pW').value);
      const gKg = inputWeightToKg($('#pG').value);
      if (!wKg || wKg < 25) { toast('Enter a valid weight'); return; }
      DB.profile = {
        ...p, age: num($('#pAge').value, p.age), sex, heightCm: num($('#pH').value, p.heightCm),
        weightKg: wKg, goalWeightKg: gKg || null, activity: act,
        exerciseDays: num($('#pEx').value, p.exerciseDays), rate,
        manualCalories: num($('#pMan').value) || null
      };
      save(); closeSheet();
      confirmSheet('Recalculate targets?',
        'Your details changed. Recalculate calorie and macro targets from them? Choosing Keep leaves your current targets as they are.',
        'Recalculate', () => {
          DB.targets = computeTargets(DB.profile); refreshTodayTargets();
          save(); render(); toast('Targets updated');
        });
      const cancelBtn = $('#sheetFoot [data-act=cancel]');
      if (cancelBtn) cancelBtn.textContent = 'Keep current';
      render();
    };
  });
}

/* ---------- theme ---------- */
/* Theme is 'light' | 'dark' | 'system'. 'system' follows the OS setting
   live, which is what people expect from an app in 2026. */
function prefersDark() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}
function resolvedTheme() {
  const t = (DB.settings && DB.settings.theme) || 'system';
  if (t === 'system') return prefersDark() ? 'dark' : 'light';
  return t === 'dark' ? 'dark' : 'light';
}
function applyTheme() {
  const dark = resolvedTheme() === 'dark';
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  const mt = document.querySelector('meta[name=theme-color]');
  if (mt) mt.setAttribute('content', dark ? '#000000' : '#ffffff');
  const sb = document.querySelector('meta[name=apple-mobile-web-app-status-bar-style]');
  if (sb) sb.setAttribute('content', dark ? 'black-translucent' : 'default');
}
let themeWatcherBound = false;
function watchSystemTheme() {
  if (themeWatcherBound || !window.matchMedia) return;
  themeWatcherBound = true;
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const onChange = () => {
    if (((DB.settings && DB.settings.theme) || 'system') !== 'system') return;
    applyTheme();
    if (VIEW === 'progress') mountProgress();   // canvases read CSS variables
  };
  if (mq.addEventListener) mq.addEventListener('change', onChange);
  else if (mq.addListener) mq.addListener(onChange);
}

/* ---------- export / import ---------- */
function download(filename, text, mime) {
  const blob = new Blob([text], { type: mime || 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 400);
}
function exportJSON() {
  if (!DB.meta) DB.meta = {};
  DB.meta.lastExport = Date.now();
  DB.meta.backupSnoozeUntil = null;
  const payload = { ...DB, exportedAt: new Date().toISOString(), app: 'macrotracker', version: 1 };
  download(`macro-tracker-backup-${todayKey()}.json`, JSON.stringify(payload, null, 2));
  save(true);
  toast('Backup downloaded');
}
function csvCell(v) {
  const s = String(v == null ? '' : v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function exportCSV() {
  const keys = Object.keys(DB.days).sort();
  if (!keys.length) { toast('Nothing to export yet'); return; }
  const rows = [['Date', 'Calories', 'Protein (g)', 'Carbs (g)', 'Fat (g)', 'Fiber (g)',
    'Calorie target', 'Protein target', 'Within target', 'Protein target met',
    'Target source', 'Weight (kg)', 'Items logged']];
  keys.forEach(k => {
    const d = DB.days[k];
    const has = d.entries && d.entries.length;
    const n = dayTotals(k);
    if (!has && !d.weight) return;
    // each row is scored against the target that applied on that date, so the
    // CSV agrees with History and Progress rather than with today's numbers
    const t = targetsFor(k);
    rows.push([k, r1(n.calories), r1(n.protein), r1(n.carbs), r1(n.fat), r1(n.fiber),
      t.calories, t.protein,
      has ? (n.calories <= t.calories ? 'yes' : 'no') : '',
      has ? (n.protein >= t.protein * 0.95 ? 'yes' : 'no') : '',
      has ? (usesFallbackTargets(k) ? 'current (day predates snapshots)' : 'that day') : '',
      d.weight ? r1(d.weight) : '', has ? d.entries.length : 0]);
  });
  download(`macro-tracker-history-${todayKey()}.csv`,
    rows.map(r => r.map(csvCell).join(',')).join('\n'), 'text/csv');
  toast('CSV downloaded');
}
function importJSON(text) {
  let parsed;
  try { parsed = JSON.parse(text); }
  catch (e) { toast('That file is not valid JSON'); return; }
  if (!parsed || typeof parsed !== 'object' || !parsed.days || typeof parsed.days !== 'object') {
    toast('That does not look like a Macro Tracker backup'); return;
  }
  const nDays = Object.keys(parsed.days).length;
  const nEnt = Object.values(parsed.days).reduce((a, d) => a + ((d && d.entries) ? d.entries.length : 0), 0);
  confirmSheet('Import this backup?',
    `It contains ${nDays} day${nDays === 1 ? '' : 's'} (${nEnt} entries), ${(parsed.recipes || []).length} recipes and ` +
    `${(parsed.foods || []).filter(f => f.custom).length} custom foods. This replaces everything currently in the app.`,
    'Import', () => {
      DB = Object.assign(defaultDB(), parsed);
      DB.settings = Object.assign({ theme: 'system', units: 'metric' }, parsed.settings || {});
      if (!DB.foods || !DB.foods.length) DB.foods = starterFoods();
      if (!Array.isArray(DB.recipes)) DB.recipes = [];
      if (!Array.isArray(DB.savedMeals)) DB.savedMeals = [];
      if (!DB.usage || typeof DB.usage !== 'object') DB.usage = {};
      save(true);
      CUR = todayKey(); HIST = todayKey(); CAL_MONTH = null; VIEW = 'today';
      applyTheme(); render();
      toast('Backup imported');
    });
}

/* ============================================================
   BOOT
   ============================================================ */
let booted = false;
function boot() {
  if (booted) return;
  booted = true;
  load();
  applyTheme();
  watchSystemTheme();
  CUR = todayKey(); HIST = todayKey();
  render();
  // if the app is left open past midnight, roll the view to the new day
  setInterval(() => {
    const t = todayKey();
    if (VIEW === 'today' && CUR !== t && CUR === window.__lastToday) { CUR = t; render(); }
    window.__lastToday = t;
  }, 60000);
  window.__lastToday = todayKey();
  let rz = null;
  window.addEventListener('resize', () => {
    clearTimeout(rz);
    rz = setTimeout(() => { if (VIEW === 'progress') mountProgress(); }, 220);
  });
}
document.addEventListener('DOMContentLoaded', boot);
if (document.readyState !== 'loading') boot();
