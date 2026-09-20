/* ============================================================
   MEAL PREVIEW — build a meal, see its effect, then commit
   PREVIEW is null when not planning. While it is set, the add-food
   flow stages into it instead of writing to the day.
   ============================================================ */
let PREVIEW = null;   // { meal, items: [entry] }

function openMealPreview(meal) {
  PREVIEW = { meal: meal || guessMeal(), items: [] };
  drawPreview();
}
function previewTotals() {
  let t = zero();
  if (!PREVIEW) return t;
  PREVIEW.items.forEach(e => { const n = entryNutr(e); MACROS.forEach(m => t[m] += n[m]); });
  return t;
}

/* Plain-language read on whether the planned meal fits, following the
   hierarchy: calories first, then protein, then fiber, then the flexible
   carb/fat split. Never moralising, always numeric. */
function previewVerdict(now, add, tg) {
  const after = {}; MACROS.forEach(m => after[m] = now[m] + add[m]);
  const lines = [];
  const calLeftBefore = tg.calories - now.calories;
  const calLeftAfter = tg.calories - after.calories;

  if (calLeftAfter >= 0) {
    lines.push(['✅', `This fits your calorie budget with <b>${fmt(calLeftAfter)} kcal</b> still to spare.`]);
  } else if (Math.abs(calLeftAfter) <= tg.calories * 0.05) {
    lines.push(['🟡', `This puts you <b>${fmt(Math.abs(calLeftAfter))} kcal</b> over — within a rounding error of your
      budget, and well inside the day-to-day noise of portion estimates.`]);
  } else {
    const trim = Math.abs(calLeftAfter);
    const biggest = PREVIEW.items.reduce((a, b) => entryNutr(a).calories > entryNutr(b).calories ? a : b, PREVIEW.items[0]);
    const bn = biggest ? entryNutr(biggest) : null;
    lines.push(['🔴', `This would put you <b>${fmt(trim)} kcal over</b> your budget for the day.
      ${bn && bn.calories > trim ? `Cutting ${esc(biggest.name)} by about
        ${r0((trim / bn.calories) * 100)}% would bring it back in.` : ''}`]);
  }

  const proAfter = tg.protein - after.protein;
  if (proAfter <= 0) lines.push(['💪', `Protein lands at <b>${fmtG(after.protein)} g</b>, at or above your ${tg.protein} g minimum.`]);
  else if (add.protein > 0) lines.push(['💪', `Adds ${fmtG(add.protein)} g protein — you'd still be
    <b>${fmtG(proAfter)} g short</b> of your ${tg.protein} g minimum for the day.`]);
  else lines.push(['💪', `No protein in this, so you'd still need <b>${fmtG(proAfter)} g</b> today.`]);

  if (tg.fiber - after.fiber > 0 && add.fiber < 3) {
    lines.push(['🌿', `Fiber would sit at ${fmtG(after.fiber)} of ${tg.fiber} g. A vegetable side is the easy fix.`]);
  }
  const fatOver = after.fat - tg.fat, carbOver = after.carbs - tg.carbs;
  if ((fatOver > 3 || carbOver > 5) && calLeftAfter >= 0) {
    lines.push(['⚖️', `It runs ${fatOver > 3 ? `${fmtG(fatOver)} g over your fat allocation` : ''}${fatOver > 3 && carbOver > 5 ? ' and ' : ''}${carbOver > 5 ? `${fmtG(carbOver)} g over carbs` : ''},
      but calories still fit — the split between the two is flexible, so this isn't worth changing on its own.`]);
  }
  return lines;
}

function drawPreview() {
  const tg = targetsFor(CUR);
  const now = dayTotals(CUR);
  const add = previewTotals();
  const has = PREVIEW.items.length > 0;
  const after = {}; MACROS.forEach(m => after[m] = now[m] + add[m]);
  const pvCtx = { calOk: after.calories <= tg.calories };

  const body = `
    <div class="field" style="margin-bottom:12px"><span class="lbl">Planning for</span>
      <div class="seg" id="pvMeal">${MEALS.map(m =>
    `<button data-m="${m}" class="${PREVIEW.meal === m ? 'on' : ''}">${MEAL_LABEL[m]}</button>`).join('')}</div>
    </div>

    <div id="pvItems">${has ? PREVIEW.items.map((e, i) => {
      const n = entryNutr(e);
      return `<div class="ing-row">
        <div class="info"><div style="font-weight:600;font-size:14.5px">${esc(e.name)}
            ${e.estimate ? '<span class="badge est">Est</span>' : ''}</div>
          <div style="font-size:12.5px;color:var(--text-2)">${esc(describeServing(e))} · ${fmt(n.calories)} kcal ·
            P ${fmtG(n.protein)} · C ${fmtG(n.carbs)} · F ${fmtG(n.fat)}</div></div>
        <button class="btn sm" data-pvedit="${i}">Edit</button>
        <button class="btn sm danger" data-pvrm="${i}">✕</button></div>`;
    }).join('') : `<div class="empty" style="padding:16px 4px">
        Add what you're thinking of eating. Nothing is logged until you tap Log meal.</div>`}</div>

    <button class="btn wide" data-act="pvAdd" style="margin-top:10px">${ICON.plus} Add to this meal</button>

    ${has ? `
      <div class="card tight" style="margin-top:16px;box-shadow:none">
        <div class="card-h" style="margin-bottom:6px"><h3 style="font-size:14px">If you eat this</h3></div>
        <div style="display:flex;gap:14px;flex-wrap:wrap;font-size:14px">
          <span><b style="color:var(--cal)">+${fmt(add.calories)}</b> kcal</span>
          <span><b style="color:var(--pro)">+${fmtG(add.protein)} g</b> protein</span>
          <span><b style="color:var(--carb)">+${fmtG(add.carbs)} g</b> carbs</span>
          <span><b style="color:var(--fat)">+${fmtG(add.fat)} g</b> fat</span>
          <span><b style="color:var(--fib)">+${fmtG(add.fiber)} g</b> fiber</span>
        </div>
      </div>

      <h3 style="font-size:14px;margin:16px 0 8px">${esc(prettyDate(CUR))} after this meal</h3>
      ${barRow('calories', after.calories, tg.calories, pvCtx)}
      <div class="macro-grid" style="margin-top:12px">
        ${barRow('protein', after.protein, tg.protein, pvCtx)}
        ${barRow('fiber', after.fiber, tg.fiber, pvCtx)}
        ${barRow('carbs', after.carbs, tg.carbs, pvCtx)}
        ${barRow('fat', after.fat, tg.fat, pvCtx)}
      </div>

      <div class="card tight" style="margin-top:14px;box-shadow:none">
        ${previewVerdict(now, add, tg).map(([ic, txt]) =>
        `<div class="coach-line"><span class="ic">${ic}</span><span>${txt}</span></div>`).join('')}
      </div>
      ${PREVIEW.items.some(e => e.estimate) ? `<div class="hint" style="margin-top:10px">
        This plan includes estimated foods, so treat the projection as approximate rather than exact.</div>` : ''}
    ` : ''}`;

  const foot = `<button class="btn" data-act="pvCancel">Discard</button>
    <button class="btn primary" data-act="pvLog" ${has ? '' : 'disabled'}>Log meal${has ? ` · ${fmt(add.calories)} kcal` : ''}</button>`;

  const mount = () => {
    $$('#pvMeal button').forEach(b => b.onclick = () => {
      PREVIEW.meal = b.dataset.m;
      PREVIEW.items.forEach(e => e.meal = PREVIEW.meal);
      drawPreview();
    });
    $('[data-act=pvAdd]').onclick = () => openAddFood(PREVIEW.meal);
    $$('[data-pvrm]').forEach(b => b.onclick = () => {
      PREVIEW.items.splice(parseInt(b.dataset.pvrm, 10), 1); drawPreview();
    });
    $$('[data-pvedit]').forEach(b => b.onclick = () => {
      const i = parseInt(b.dataset.pvedit, 10), e = PREVIEW.items[i];
      openPreviewItemEditor(i, e);
    });
    $('#sheetFoot [data-act=pvCancel]').onclick = () => {
      if (!PREVIEW.items.length) { PREVIEW = null; closeSheet(true); return; }
      confirmSheet('Discard this plan?', `${PREVIEW.items.length} item${PREVIEW.items.length > 1 ? 's' : ''} will be thrown away. Nothing was logged.`,
        'Discard', () => { PREVIEW = null; closeSheet(true); render(); }, true);
    };
    $('#sheetFoot [data-act=pvLog]').onclick = () => {
      const d = stampDay(CUR);
      PREVIEW.items.forEach(e => { e.meal = PREVIEW.meal; d.entries.push(e); bumpUsage(e.foodId); });
      const n = PREVIEW.items.length;
      PREVIEW = null;
      save(); closeSheet(true); render();
      toast(`${n} item${n > 1 ? 's' : ''} logged`);
    };
  };

  // replace the preview sheet in place rather than stacking copies of it.
  // popped directly, not via closeSheet, so this is not treated as a dismissal.
  const top = sheetStack[sheetStack.length - 1];
  if (top && top.isPreview) sheetStack.pop();
  sheetStack.push({
    title: 'Plan a meal', bodyHTML: body, footHTML: foot, onMount: mount, isPreview: true,
    // whatever closes this sheet — Escape, backdrop, ✕ — the plan is abandoned.
    // Without this a staged plan outlives its sheet and silently swallows
    // everything logged afterwards.
    onDismiss: () => { if (PREVIEW) { PREVIEW = null; render(); } }
  });
  renderSheet();
}

function openPreviewItemEditor(index, e) {
  const body = `
    <div class="grid2">
      <div class="field"><label for="pvQty">Quantity</label>
        <input type="number" id="pvQty" inputmode="decimal" step="any" value="${e.qty}"></div>
      <div class="field"><label>Unit</label>
        <input type="text" value="${esc(e.unit)}" disabled style="opacity:.7"></div>
    </div>
    <div id="pvCalc" class="note"></div>`;
  openSheet(e.name, body, `<button class="btn" data-act="cancel">Cancel</button>
    <button class="btn primary" data-act="ok">Update</button>`, () => {
    const q = $('#pvQty');
    const calc = () => {
      const t = { ...e, qty: num(q.value, 0) };
      const n = entryNutr(t);
      $('#pvCalc').innerHTML = `<b>${fmt(n.calories)} kcal</b> · P ${fmtG(n.protein)} · C ${fmtG(n.carbs)} · F ${fmtG(n.fat)}`;
    };
    q.oninput = calc; calc();
    $('#sheetFoot [data-act=cancel]').onclick = () => closeSheet();
    $('#sheetFoot [data-act=ok]').onclick = () => {
      const v = num(q.value, 0);
      if (v <= 0) { toast('Quantity must be above zero'); return; }
      PREVIEW.items[index].qty = v;
      closeSheet(); drawPreview();
    };
  });
}

/* ============================================================
   BACKUP REMINDER
   ============================================================ */
const BACKUP_AFTER_DAYS = 14;
function backupDue() {
  if (!DB.meta) DB.meta = {};
  const now = Date.now();
  if (DB.meta.backupSnoozeUntil && now < DB.meta.backupSnoozeUntil) return false;
  const nDays = Object.keys(DB.days).filter(k => DB.days[k].entries && DB.days[k].entries.length).length;
  if (nDays < 5) return false;                       // nothing worth losing yet
  if (!DB.meta.lastExport) return true;
  return (now - DB.meta.lastExport) > BACKUP_AFTER_DAYS * 86400000;
}
function backupBannerHTML() {
  if (!backupDue()) return '';
  const last = DB.meta.lastExport;
  const nDays = Object.keys(DB.days).filter(k => DB.days[k].entries && DB.days[k].entries.length).length;
  return `<div class="card tight" id="backupBanner" style="border-color:var(--warn)">
    <div style="display:flex;gap:11px;align-items:flex-start">
      <span style="font-size:17px;line-height:1.3">💾</span>
      <div style="flex:1;min-width:0">
        <div style="font-weight:650;font-size:14.5px">Back up your data</div>
        <div style="font-size:13px;color:var(--text-2);margin-top:2px;line-height:1.45">
          ${nDays} days of tracking exist only in this browser.
          ${last ? `Last backup was ${Math.floor((Date.now() - last) / 86400000)} days ago.` : `You haven't exported one yet.`}
          Clearing website data or switching devices would lose it.</div>
        <div class="btn-row" style="margin-top:10px">
          <button class="btn sm primary" data-act="bkExport">Export backup</button>
          <button class="btn sm" data-act="bkSnooze">Remind me later</button>
        </div>
      </div>
    </div>
  </div>`;
}
function mountBackupBanner() {
  const ex = $('[data-act=bkExport]');
  if (ex) ex.onclick = () => exportJSON().then(ok => { if (ok && VIEW === 'today') render(); });
  const sn = $('[data-act=bkSnooze]');
  if (sn) sn.onclick = () => {
    if (!DB.meta) DB.meta = {};
    DB.meta.backupSnoozeUntil = Date.now() + 7 * 86400000;
    save(); render(); toast('Reminder snoozed for a week');
  };
}

/* ============================================================
   RECALCULATE REMINDER — shown on Today once the trend line has
   moved well away from the weight the targets were built on
   ============================================================ */
function recalcNudgeHTML() {
  if (CUR !== todayKey()) return '';
  if (DB.meta && DB.meta.recalcSnoozeUntil && Date.now() < DB.meta.recalcSnoozeUntil) return '';
  const d = weightDrift();
  if (!d) return '';
  const unit = DB.settings.units === 'metric' ? 'kg' : 'lb';
  const W = kg => r1(dispWeight(kg));
  const lighter = d.diffKg < 0;
  let title, text, primary;
  if (d.goal) {
    title = 'You\'ve reached your goal weight';
    text = `Your 7-day average is ${W(d.nowKg)} ${unit}, at or under the ${W(d.goalKg)} ${unit} you set as the goal.
      The current targets still include a fat-loss deficit, so it's time to decide what comes next — a new goal, or
      a slower rate — in your details.`;
    primary = `<button class="btn sm primary" data-act="nudgeGoal">Update my details</button>`;
  } else {
    // ~10 kcal of BMR per kg, times the activity multiplier: a rough size for the drift
    const kcal = r0(Math.abs(d.diffKg) * 10 * activityMultiplier(DB.profile));
    title = `You're ${W(Math.abs(d.diffKg))} ${unit} ${lighter ? 'lighter' : 'heavier'} than your targets assume`;
    text = `They were worked out at ${W(d.atKg)} ${unit}; your 7-day average is now ${W(d.nowKg)} ${unit}.
      Maintenance ${lighter ? 'falls' : 'rises'} with bodyweight, so the plan is roughly ${kcal} kcal a day
      ${lighter ? 'looser' : 'tighter'} than intended.${DB.targets.custom
        ? ' You set the current targets by hand, so recalculating replaces them.' : ''}`;
    primary = `<button class="btn sm primary" data-act="nudgeRecalc">Recalculate targets</button>`;
  }
  return `<div class="card tight" id="recalcNudge" style="border-color:var(--accent)">
    <div style="display:flex;gap:11px;align-items:flex-start">
      <span style="font-size:17px;line-height:1.3">⚖️</span>
      <div style="flex:1;min-width:0">
        <div style="font-weight:650;font-size:14.5px">${title}</div>
        <div style="font-size:13px;color:var(--text-2);margin-top:2px;line-height:1.45">${text}</div>
        <div class="btn-row" style="margin-top:10px">
          ${primary}
          <button class="btn sm" data-act="nudgeSnooze">Not now</button>
        </div>
      </div>
    </div>
  </div>`;
}
function mountRecalcNudge() {
  const rc = $('[data-act=nudgeRecalc]');
  if (rc) rc.onclick = () => { const d = weightDrift(); if (d) openRecalcConfirm(d.nowKg); };
  const gl = $('[data-act=nudgeGoal]');
  if (gl) gl.onclick = openProfileEditor;
  const sn = $('[data-act=nudgeSnooze]');
  if (sn) sn.onclick = () => {
    if (!DB.meta) DB.meta = {};
    DB.meta.recalcSnoozeUntil = Date.now() + 14 * 86400000;
    save(); render(); toast('Reminder snoozed for two weeks');
  };
}
