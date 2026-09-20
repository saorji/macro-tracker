/* ============================================================
   HISTORY — calendar + per-day detail (editable)
   ============================================================ */
function viewHistory() {
  if (!CAL_MONTH) CAL_MONTH = HIST.slice(0, 7);
  const [y, m] = CAL_MONTH.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const startDow = first.getDay();
  const daysIn = new Date(y, m, 0).getDate();
  const tk = todayKey();

  let cells = '';
  for (let i = 0; i < startDow; i++) cells += `<div class="cal-cell blank"></div>`;
  for (let d = 1; d <= daysIn; d++) {
    const k = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const rec = DB.days[k];
    const has = rec && rec.entries && rec.entries.length;
    const tot = has ? dayTotals(k) : null;
    let cls = 'cal-cell';
    if (k === tk) cls += ' today';
    if (k === HIST) cls += ' sel';
    if (!has) cls += ' none';
    else if (tot.calories <= targetsFor(k).calories) cls += ' met';
    else cls += ' overd';
    cells += `<button class="${cls}" data-d="${k}" ${k > tk ? 'disabled style="opacity:.3"' : ''}>
      <span>${d}</span>${has ? '<span class="d"></span>' : ''}</button>`;
  }

  const monthName = first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const sel = DB.days[HIST];
  const st = dayTotals(HIST);
  const ht = targetsFor(HIST);
  const selHas = sel && sel.entries && sel.entries.length;

  return `
  <div class="apphead"><div class="wrap">
    <div><div class="eyebrow">Log</div><h1 style="margin-top:1px">History</h1></div>
  </div></div>
  <div class="wrap">
    <div class="card">
      <div class="card-h">
        <button class="btn icon" data-mon="-1" aria-label="Previous month">${ICON.left}</button>
        <h3>${monthName}</h3>
        <button class="btn icon" data-mon="1" aria-label="Next month">${ICON.right}</button>
      </div>
      <div class="cal-grid" style="margin-bottom:5px">
        ${['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => `<div class="cal-dow">${d}</div>`).join('')}
      </div>
      <div class="cal-grid">${cells}</div>
      <div style="display:flex;gap:14px;justify-content:center;margin-top:12px;font-size:12px;color:var(--text-2)">
        <span><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--good);margin-right:5px"></span>Within calorie target</span>
        <span><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--over);margin-right:5px"></span>Over</span>
      </div>
    </div>

    <div class="card">
      <div class="card-h"><h3>${esc(prettyDate(HIST))}</h3>
        <button class="btn sm primary" data-act="editday">${selHas ? 'Open & edit' : 'Log food'}</button></div>
      ${selHas ? `
        <div class="stat-grid" style="grid-template-columns:repeat(2,1fr);margin-bottom:12px">
          ${[['calories', 'kcal'], ['protein', 'g'], ['carbs', 'g'], ['fat', 'g'], ['fiber', 'g']].map(([k2, u]) => `
            <div class="stat"><div class="l">${MACRO_META[k2].label}</div>
              <div class="n" style="color:${histStatColour(k2, st[k2], ht[k2], st.calories <= ht.calories)}">${fmtG(st[k2])}</div>
              <div class="s">of ${fmtG(ht[k2])} ${u}</div></div>`).join('')}
          <div class="stat"><div class="l">Calorie budget</div>
            <div class="n" style="color:${st.calories <= ht.calories ? 'var(--good)' : 'var(--over)'};font-size:17px">
              ${st.calories <= ht.calories ? 'Met' : 'Over by ' + fmt(st.calories - ht.calories)}</div>
            <div class="s">${sel.entries.length} items logged</div></div>
        </div>
        ${usesFallbackTargets(HIST) ? `<div class="hint" style="margin:-4px 0 10px">
          This day predates per-day target tracking, so it's shown against your current targets rather than
          whatever they were at the time.</div>`
        : HIST !== todayKey() ? `<div class="hint" style="margin:-4px 0 10px">
          Measured against the targets that applied on this day (${fmt(ht.calories)} kcal, ${ht.protein} g protein),
          not today's — changing your targets never rewrites past days.</div>` : ''}
        ${MEALS.map(m2 => {
        const it = sel.entries.filter(e => e.meal === m2);
        if (!it.length) return '';
        return `<div style="margin-bottom:9px">
            <div style="font-size:12.5px;font-weight:700;color:var(--text-2);text-transform:uppercase;letter-spacing:.05em">
              ${MEAL_LABEL[m2]} · ${fmt(mealTotals(HIST, m2).calories)} kcal</div>
            ${it.map(e => `<div style="font-size:13.5px;color:var(--text-2);padding:3px 0">
              ${esc(e.name)} — ${esc(describeServing(e))} · ${fmt(entryNutr(e).calories)} kcal</div>`).join('')}
          </div>`;
      }).join('')}`
      : `<div class="empty" style="padding:16px 4px">Nothing logged on this day.</div>`}
      <div class="field" style="margin-top:12px"><label for="hW">Weight on this day</label>
        <div style="display:flex;gap:9px">
          <input type="number" id="hW" inputmode="decimal" placeholder="${DB.settings.units === 'metric' ? 'kg' : 'lb'}"
            value="${sel && sel.weight ? esc(dispWeight(sel.weight)) : ''}" style="flex:1">
          <button class="btn" data-act="hsaveweight">Save</button>
        </div>
      </div>
    </div>
    <div class="spacer"></div>
  </div>`;
}
/* History uses the same semantics as Today: floors green when met, the
   calorie budget red when over, and flexible macros neutral while calories
   hold — a fat overage must not read as alarm in one screen and "fine" in
   the other. */
function histStatColour(key, got, goal, calOk) {
  const kind = MACRO_META[key].kind;
  if (kind === 'floor') return got >= goal * 0.95 ? 'var(--good)' : MACRO_META[key].color;
  if (kind === 'budget') return got > goal ? 'var(--over)' : MACRO_META[key].color;
  if (got > goal) return calOk ? MACRO_META[key].color : 'var(--warn)';
  return MACRO_META[key].color;
}
function mountHistory() {
  $$('[data-d]').forEach(b => b.onclick = () => { HIST = b.dataset.d; render(); });
  $$('[data-mon]').forEach(b => b.onclick = () => {
    const [y, m] = CAL_MONTH.split('-').map(Number);
    const d = new Date(y, m - 1 + parseInt(b.dataset.mon, 10), 1);
    CAL_MONTH = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    render();
  });
  $('[data-act=editday]').onclick = () => { CUR = HIST; VIEW = 'today'; window.scrollTo(0, 0); render(); };
  $('[data-act=hsaveweight]').onclick = () => {
    const kg = inputWeightToKg($('#hW').value);
    day(HIST).weight = kg; save(); render(); toast(kg ? 'Weight saved' : 'Weight cleared');
  };
}

/* ============================================================
   PROGRESS — weekly/monthly averages, charts, weight trend
   ============================================================ */
let progRange = 7;

function loggedDays() {
  return Object.keys(DB.days).filter(k => DB.days[k].entries && DB.days[k].entries.length).sort();
}
function rangeKeys(n) {
  const out = [], t = todayKey();
  for (let i = n - 1; i >= 0; i--) out.push(shiftKey(t, -i));
  return out;
}
function statsFor(keys) {
  const logged = keys.filter(k => DB.days[k] && DB.days[k].entries && DB.days[k].entries.length);
  const sums = zero();
  logged.forEach(k => { const d = dayTotals(k); MACROS.forEach(m => sums[m] += d[m]); });
  const n = logged.length || 1;
  const avg = {}; MACROS.forEach(m => avg[m] = sums[m] / n);
  // each day is judged against the target that applied to it, so recalculating
  // today never moves a historical hit-rate
  const calMet = logged.filter(k => dayTotals(k).calories <= targetsFor(k).calories).length;
  const proMet = logged.filter(k => dayTotals(k).protein >= targetsFor(k).protein * 0.95).length;
  // average the targets that actually applied, across every macro — and the
  // TDEE too, so the deficit figure reflects the plan of the time
  const tSum = zero(); let tdeeSum = 0;
  logged.forEach(k => {
    const tt = targetsFor(k);
    MACROS.forEach(m => tSum[m] += (tt[m] || 0));
    tdeeSum += (tt.tdee || (DB.targets ? DB.targets.tdee : 0) || 0);
  });
  const avgTarget = {};
  MACROS.forEach(m => avgTarget[m] = logged.length ? tSum[m] / logged.length
    : (DB.targets ? DB.targets[m] : 0));
  const avgTdee = logged.length ? tdeeSum / logged.length : (DB.targets ? DB.targets.tdee : 0);
  const anyFallback = logged.some(k => usesFallbackTargets(k));
  // any macro changing counts, not just calories
  const first = logged.length ? targetsFor(logged[0]) : null;
  const targetsVaried = !!first && logged.some(k => {
    const tt = targetsFor(k);
    return MACROS.some(m => tt[m] !== first[m]);
  });
  return {
    avg, loggedCount: logged.length, total: keys.length, logged,
    avgTarget, avgTdee,
    avgTargetCalories: avgTarget.calories, avgTargetProtein: avgTarget.protein,
    anyFallback, targetsVaried,
    calMetPct: logged.length ? (calMet / logged.length) * 100 : 0,
    proMetPct: logged.length ? (proMet / logged.length) * 100 : 0
  };
}
function weightSeries() {
  return Object.keys(DB.days).filter(k => DB.days[k].weight).sort()
    .map(k => ({ k, w: DB.days[k].weight }));
}
function movingAvg(series, win) {
  return series.map((pt, i) => {
    const from = parseKey(pt.k).getTime() - (win - 1) * 86400000;
    const sub = series.filter((p, j) => j <= i && parseKey(p.k).getTime() >= from);
    return { k: pt.k, w: sub.reduce((a, b) => a + b.w, 0) / sub.length };
  });
}

function viewProgress() {
  const keys = rangeKeys(progRange);
  const s = statsFor(keys);
  const t = DB.targets;
  const ws = weightSeries();
  const wma = movingAvg(ws, 7);

  let weightBlock = '';
  if (ws.length >= 2) {
    const first = wma[0], last = wma[wma.length - 1];
    const days = Math.max(1, (parseKey(last.k) - parseKey(first.k)) / 86400000);
    const perWeek = ((last.w - first.w) / days) * 7;
    const unit = DB.settings.units === 'metric' ? 'kg' : 'lb';
    const conv = v => DB.settings.units === 'metric' ? v : kgToLb(v);
    weightBlock = `
      <div class="card">
        <div class="card-h"><h3>Weight trend</h3><span class="badge">7-day average</span></div>
        <div class="stat-grid" style="margin-bottom:12px">
          <div class="stat"><div class="l">Latest weigh-in</div>
            <div class="n">${r1(conv(ws[ws.length - 1].w))} <span style="font-size:13px">${unit}</span></div>
            <div class="s">${esc(prettyDate(ws[ws.length - 1].k))}</div></div>
          <div class="stat"><div class="l">7-day average</div>
            <div class="n">${r1(conv(last.w))} <span style="font-size:13px">${unit}</span></div>
            <div class="s">smoothed</div></div>
          <div class="stat"><div class="l">Trend</div>
            <div class="n" style="color:${perWeek < -0.05 ? 'var(--good)' : perWeek > 0.05 ? 'var(--warn)' : 'var(--text)'}">
              ${perWeek > 0 ? '+' : ''}${r1(conv(perWeek))}</div>
            <div class="s">${unit} per week</div></div>
          <div class="stat"><div class="l">Since first weigh-in</div>
            <div class="n">${(last.w - first.w) > 0 ? '+' : ''}${r1(conv(last.w - first.w))}</div>
            <div class="s">${unit} over ${r0(days)} days</div></div>
        </div>
        <div class="chartbox"><canvas id="wChart" height="170"></canvas></div>
        <div class="hint">Dots are individual weigh-ins, the line is the 7-day average. Daily swings of a
          kilo or two are water, food volume and salt — the line is what actually tells you something, and it
          needs two or three weeks before it means much.</div>
      </div>`;
  } else {
    weightBlock = `<div class="card"><div class="card-h"><h3>Weight trend</h3></div>
      <div class="empty" style="padding:14px 4px">Log your weight on a few days and the trend line appears here.</div></div>`;
  }

  return `
  <div class="apphead"><div class="wrap">
    <div><div class="eyebrow">Analytics</div><h1 style="margin-top:1px">Progress</h1></div>
  </div></div>
  <div class="wrap">
    <div class="seg" id="rangeSeg" style="margin-bottom:14px">
      <button data-r="7" class="${progRange === 7 ? 'on' : ''}">Last 7 days</button>
      <button data-r="30" class="${progRange === 30 ? 'on' : ''}">Last 30 days</button>
      <button data-r="90" class="${progRange === 90 ? 'on' : ''}">Last 90 days</button>
    </div>

    <div class="card">
      <div class="card-h"><h3>Daily averages</h3>
        <span style="font-size:12.5px;color:var(--text-2)">${s.loggedCount} of ${s.total} days logged</span></div>
      ${s.loggedCount === 0 ? `<div class="empty" style="padding:14px 4px">No days logged in this window yet.</div>` : `
      <div class="stat-grid">
        <div class="stat"><div class="l">Calories / day</div>
          <div class="n" style="color:var(--cal)">${fmt(s.avg.calories)}</div>
          <div class="s">${s.targetsVaried ? 'avg target' : 'target'} ${fmt(s.avgTargetCalories)} · ${s.avg.calories <= s.avgTargetCalories ? fmt(s.avgTargetCalories - s.avg.calories) + ' under' : fmt(s.avg.calories - s.avgTargetCalories) + ' over'}</div></div>
        <div class="stat"><div class="l">Protein / day</div>
          <div class="n" style="color:var(--pro)">${fmtG(s.avg.protein)} g</div>
          <div class="s">${s.targetsVaried ? 'avg target' : 'target'} ${r0(s.avgTargetProtein)} g</div></div>
        <div class="stat"><div class="l">Carbs / day</div>
          <div class="n" style="color:var(--carb)">${fmtG(s.avg.carbs)} g</div>
          <div class="s">${s.targetsVaried ? 'avg target' : 'target'} ${r0(s.avgTarget.carbs)} g</div></div>
        <div class="stat"><div class="l">Fat / day</div>
          <div class="n" style="color:var(--fat)">${fmtG(s.avg.fat)} g</div>
          <div class="s">${s.targetsVaried ? 'avg target' : 'target'} ${r0(s.avgTarget.fat)} g</div></div>
        <div class="stat"><div class="l">Fiber / day</div>
          <div class="n" style="color:var(--fib)">${fmtG(s.avg.fiber)} g</div>
          <div class="s">${s.targetsVaried ? 'avg target' : 'target'} ${r0(s.avgTarget.fiber)} g</div></div>
        <div class="stat"><div class="l">Est. weekly deficit</div>
          <div class="n">${fmt((s.avgTdee - s.avg.calories) * 7)}</div>
          <div class="s">kcal vs maintenance</div></div>
      </div>
      <div class="note" style="margin-top:12px">Weekly averages are the number that matters. A single high day
        barely moves this line, which is exactly why it's the one to watch.${s.targetsVaried
        ? ` Your targets changed during this window, so each day is measured against the target that applied to it
           and the figures above are averages of both.` : ''}${s.anyFallback
        ? ` Some days predate per-day target tracking and fall back to your current targets.` : ''}</div>`}
    </div>

    ${s.loggedCount ? `
    <div class="card">
      <div class="card-h"><h3>Target consistency</h3></div>
      <div class="stat-grid">
        <div class="stat"><div class="l">Days within calories</div>
          <div class="n" style="color:var(--good)">${r0(s.calMetPct)}%</div>
          <div class="s">${r0(s.calMetPct * s.loggedCount / 100)} of ${s.loggedCount} logged days</div></div>
        <div class="stat"><div class="l">Days protein hit</div>
          <div class="n" style="color:var(--pro)">${r0(s.proMetPct)}%</div>
          <div class="s">within 5% of ${s.targetsVaried ? "that day's target" : t.protein + ' g'}</div></div>
      </div>
      <div class="hint" style="margin-top:10px">Each day is scored against the target that was in force on that
        day, so changing your targets never moves these percentages retroactively.</div>
    </div>

    <div class="card">
      <div class="card-h"><h3>Calories by day</h3><span style="font-size:12.5px;color:var(--text-2)">line = target</span></div>
      <div class="chartbox"><canvas id="cChart" height="180"></canvas></div>
    </div>

    <div class="card">
      <div class="card-h"><h3>Protein by day</h3><span style="font-size:12.5px;color:var(--text-2)">line = target</span></div>
      <div class="chartbox"><canvas id="pChart" height="150"></canvas></div>
    </div>` : ''}

    ${weightBlock}
    <div class="spacer"></div>
  </div>`;
}

function mountProgress() {
  $$('#rangeSeg button').forEach(b => b.onclick = () => { progRange = parseInt(b.dataset.r, 10); render(); });
  const keys = rangeKeys(progRange);
  const cc = $('#cChart');
  if (cc) drawBars(cc, keys.map(k => ({ k, v: dayTotals(k).calories, t: targetsFor(k).calories })), 'cal');
  const pc = $('#pChart');
  if (pc) drawBars(pc, keys.map(k => ({ k, v: dayTotals(k).protein, t: targetsFor(k).protein })), 'pro');
  const wc = $('#wChart');
  if (wc) drawWeight(wc);
}

/* ---------- canvas charts (no dependencies) ---------- */
function cssVar(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
function setupCanvas(cv) {
  const dpr = window.devicePixelRatio || 1;
  const w = cv.parentElement.clientWidth || 300;
  const h = parseInt(cv.getAttribute('height'), 10) || 160;
  cv.width = w * dpr; cv.height = h * dpr;
  cv.style.width = w + 'px'; cv.style.height = h + 'px';
  const ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  return { ctx, w, h };
}
function drawBars(cv, data, kind) {
  const { ctx, w, h } = setupCanvas(cv);
  const pad = { l: 38, r: 8, t: 10, b: 20 };
  const iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
  const maxTarget = Math.max(...data.map(d => d.t), 1);
  const max = Math.max(maxTarget * 1.25, ...data.map(d => d.v), 1);
  const color = kind === 'cal' ? cssVar('--cal') : cssVar('--pro');
  const over = cssVar('--over'), grid = cssVar('--border'), txt = cssVar('--text-3');

  ctx.strokeStyle = grid; ctx.lineWidth = 1; ctx.font = '10px -apple-system,system-ui,sans-serif';
  ctx.fillStyle = txt; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  for (let i = 0; i <= 2; i++) {
    const v = (max / 2) * i, y = pad.t + ih - (v / max) * ih;
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke();
    ctx.fillText(r0(v), pad.l - 6, y);
  }
  const n = data.length;
  const bw = Math.max(2, Math.min(26, (iw / n) * 0.62));
  const step = iw / n;
  data.forEach((d, i) => {
    if (d.v <= 0) return;
    const bh = (d.v / max) * ih;
    const x = pad.l + step * i + (step - bw) / 2;
    const y = pad.t + ih - bh;
    // compared against that day's own target, not today's
    ctx.fillStyle = (kind === 'cal' ? d.v > d.t : d.v < d.t * 0.95) ? over : color;
    const r = Math.min(3, bw / 2);
    ctx.beginPath();
    ctx.moveTo(x, y + bh); ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.lineTo(x + bw - r, y); ctx.quadraticCurveTo(x + bw, y, x + bw, y + r);
    ctx.lineTo(x + bw, y + bh); ctx.closePath(); ctx.fill();
  });
  // target line — stepped, because the target itself can change over time
  ctx.strokeStyle = cssVar('--text-2'); ctx.setLineDash([4, 4]); ctx.lineWidth = 1.4;
  ctx.beginPath();
  data.forEach((d, i) => {
    const ty = pad.t + ih - (d.t / max) * ih;
    const x0 = pad.l + step * i, x1 = x0 + step;
    if (i === 0) ctx.moveTo(x0, ty); else ctx.lineTo(x0, ty);
    ctx.lineTo(x1, ty);
  });
  ctx.stroke();
  ctx.setLineDash([]);
  // x labels: first / mid / last
  ctx.fillStyle = txt; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  const lab = i => { const d = parseKey(data[i].k); return `${d.getMonth() + 1}/${d.getDate()}`; };
  if (n) {
    ctx.fillText(lab(0), pad.l + step * 0.5, pad.t + ih + 5);
    if (n > 2) ctx.fillText(lab(Math.floor(n / 2)), pad.l + step * (Math.floor(n / 2) + 0.5), pad.t + ih + 5);
    if (n > 1) ctx.fillText(lab(n - 1), pad.l + step * (n - 0.5), pad.t + ih + 5);
  }
}
function drawWeight(cv) {
  const { ctx, w, h } = setupCanvas(cv);
  const ws = weightSeries(); if (ws.length < 2) return;
  const wma = movingAvg(ws, 7);
  const conv = v => DB.settings.units === 'metric' ? v : kgToLb(v);
  const pad = { l: 40, r: 10, t: 12, b: 20 };
  const iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
  const vals = ws.map(p => conv(p.w)).concat(wma.map(p => conv(p.w)));
  let lo = Math.min(...vals), hi = Math.max(...vals);
  const span = Math.max(hi - lo, DB.settings.units === 'metric' ? 1.5 : 3);
  lo -= span * 0.18; hi += span * 0.18;
  const t0 = parseKey(ws[0].k).getTime(), t1 = parseKey(ws[ws.length - 1].k).getTime();
  const X = k => pad.l + (t1 === t0 ? iw / 2 : ((parseKey(k).getTime() - t0) / (t1 - t0)) * iw);
  const Y = v => pad.t + ih - ((v - lo) / (hi - lo)) * ih;

  ctx.strokeStyle = cssVar('--border'); ctx.lineWidth = 1;
  ctx.font = '10px -apple-system,system-ui,sans-serif'; ctx.fillStyle = cssVar('--text-3');
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  for (let i = 0; i <= 2; i++) {
    const v = lo + ((hi - lo) / 2) * i, y = Y(v);
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke();
    ctx.fillText(r1(v), pad.l - 6, y);
  }
  // raw dots
  ctx.fillStyle = cssVar('--text-3');
  ws.forEach(p => { ctx.beginPath(); ctx.arc(X(p.k), Y(conv(p.w)), 2.6, 0, 7); ctx.fill(); });
  // moving average line
  ctx.strokeStyle = cssVar('--accent'); ctx.lineWidth = 2.4; ctx.lineJoin = 'round';
  ctx.beginPath();
  wma.forEach((p, i) => { const x = X(p.k), y = Y(conv(p.w)); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
  ctx.stroke();
  ctx.fillStyle = cssVar('--text-3'); ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  const f = parseKey(ws[0].k), l = parseKey(ws[ws.length - 1].k);
  ctx.fillText(`${f.getMonth() + 1}/${f.getDate()}`, pad.l + 8, pad.t + ih + 5);
  ctx.fillText(`${l.getMonth() + 1}/${l.getDate()}`, w - pad.r - 12, pad.t + ih + 5);
}
