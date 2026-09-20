/* ============================================================
   ADD FOOD — search, portion picker, manual entry, label entry
   ============================================================ */
let addCtx = { meal: 'breakfast', query: '', filter: 'all' };

function openAddFood(meal) {
  addCtx = { meal: meal || guessMeal(), query: '', filter: 'all' };
  openSheet('Add food', addFoodBody(), addFoodFoot(), mountAddFood);
}
function addFoodFoot() {
  return `<button class="btn" data-act="manual">Custom / label</button>
          <button class="btn primary" data-act="recipe">New recipe</button>`;
}
function addFoodBody() {
  return `
    <div class="field" style="margin-bottom:10px">
      <input type="text" id="q" placeholder="Search foods, recipes, saved meals…" autocomplete="off" value="${esc(addCtx.query)}">
    </div>
    <div class="field" style="margin-bottom:10px">
      <span class="lbl">Meal</span>
      <div class="seg" id="mealSeg">${MEALS.map(m =>
    `<button data-m="${m}" class="${addCtx.meal === m ? 'on' : ''}">${MEAL_LABEL[m]}</button>`).join('')}</div>
    </div>
    <div class="chips" id="filterChips">
      ${[['all', 'All'], ['recent', 'Recent'], ['fav', 'Favorites'], ['meals', 'Saved meals'], ['recipes', 'Recipes'], ['mine', 'My foods']]
      .map(([k, l]) => `<button class="chip ${addCtx.filter === k ? 'on' : ''}" data-f="${k}">${l}</button>`).join('')}
    </div>
    <div id="results"></div>`;
}
function mountAddFood() {
  const q = $('#q');
  q.oninput = () => { addCtx.query = q.value; drawResults(); };
  $$('#mealSeg button').forEach(b => b.onclick = () => {
    addCtx.meal = b.dataset.m;
    $$('#mealSeg button').forEach(x => x.classList.toggle('on', x === b));
  });
  $$('#filterChips .chip').forEach(b => b.onclick = () => {
    addCtx.filter = b.dataset.f;
    $$('#filterChips .chip').forEach(x => x.classList.toggle('on', x === b));
    drawResults();
  });
  $('#sheetFoot [data-act=manual]').onclick = () => openCustomFood(addCtx.meal, addCtx.query);
  $('#sheetFoot [data-act=recipe]').onclick = () => {
    PREVIEW = null; closeSheet(true); VIEW = 'foods'; render(); openRecipeBuilder(null);
  };
  drawResults();
  setTimeout(() => { if (window.innerWidth > 720) q.focus(); }, 280);
}

function drawResults() {
  const box = $('#results'); if (!box) return;
  const qs = addCtx.query.trim();
  let rows = [];

  if (addCtx.filter === 'recent') {
    rows = recentFoods(25).map(f => ({ type: DB.recipes.some(r => r.id === f.id) ? 'recipe' : 'food', item: f }));
    if (qs) rows = rows.filter(r => r.item.name.toLowerCase().includes(qs.toLowerCase()));
  } else if (addCtx.filter === 'fav') {
    rows = [...DB.foods.filter(f => f.favorite).map(f => ({ type: 'food', item: f })),
    ...DB.recipes.filter(f => f.favorite).map(f => ({ type: 'recipe', item: f })),
    ...DB.savedMeals.filter(f => f.favorite).map(f => ({ type: 'meal', item: f }))];
  } else if (addCtx.filter === 'meals') {
    rows = DB.savedMeals.map(m => ({ type: 'meal', item: m }));
  } else if (addCtx.filter === 'recipes') {
    rows = DB.recipes.map(r => ({ type: 'recipe', item: r }));
  } else if (addCtx.filter === 'mine') {
    rows = DB.foods.filter(f => f.custom).map(f => ({ type: 'food', item: f }));
  } else {
    rows = searchAll(qs);
    if (!qs) {
      const rec = recentFoods(8);
      const recIds = new Set(rec.map(f => f.id));
      rows = [...rec.map(f => ({ type: DB.recipes.some(r => r.id === f.id) ? 'recipe' : 'food', item: f })),
      ...rows.filter(r => !recIds.has(r.item.id))];
    }
  }
  rows = rows.slice(0, 60);

  if (!rows.length) {
    box.innerHTML = `<div class="empty" style="padding:22px 4px">
        ${qs ? `Nothing saved matching “${esc(qs)}”.` : 'Nothing here yet.'}
      </div>
      ${qs ? `<div class="note">The app won't invent numbers for a food it doesn't know. You can:
        <div style="margin-top:9px;display:flex;flex-direction:column;gap:7px">
          <button class="btn sm" data-new="label">Enter it from the nutrition label</button>
          <button class="btn sm" data-new="manual">Enter the nutrition manually</button>
          <button class="btn sm" data-new="recipe">Build it from ingredients (recipe)</button>
        </div></div>` : ''}`;
    $$('[data-new]').forEach(b => b.onclick = () => {
      const w = b.dataset.new;
      if (w === 'recipe') { PREVIEW = null; closeSheet(true); VIEW = 'foods'; render(); openRecipeBuilder(null, qs); }
      else openCustomFood(addCtx.meal, qs, w === 'label');
    });
    return;
  }

  box.innerHTML = `<div class="srch-res">${rows.map((r, i) => {
    const it = r.item;
    let sub = '';
    if (r.type === 'meal') sub = `Saved meal · ${it.items.length} item${it.items.length > 1 ? 's' : ''} · ${fmt(savedMealNutr(it).calories)} kcal`;
    else if (r.type === 'recipe') sub = `Recipe · ${fmt((it.perServing || zero()).calories)} kcal per serving`;
    else {
      const per = it.nutr;
      sub = `${fmt(per.calories)} kcal · P ${fmtG(per.protein)} per ${it.ref.amount === 1 ? '' : it.ref.amount + ' '}${it.ref.unit}`;
    }
    const mp = r.type === 'meal' ? null : defaultUsablePortion(foodOf(r));
    if (mp) sub = `${esc(mp.label)}: ${mp.qty} ${mp.unit} · ${fmt(quickPortionNutr(r, mp).calories)} kcal`;
    return `<div class="res">
      <button style="flex:1;min-width:0;background:none;border:none;text-align:left;padding:0;display:flex;gap:10px;align-items:center" data-pick="${i}">
        <span class="info"><span class="nm" style="display:block">${esc(it.name)}
          ${it.estimate ? '<span class="badge est">Est</span>' : ''}
          ${r.type === 'recipe' ? '<span class="badge rec">Recipe</span>' : ''}
          ${r.type === 'meal' ? '<span class="badge">Meal</span>' : ''}
          ${mp ? '<span class="badge mine">My portion</span>' : ''}</span>
          <span class="sub" style="display:block">${esc(sub)}</span></span>
      </button>
      <button class="star ${it.favorite ? 'on' : ''}" data-fav="${i}" aria-label="Favorite">${it.favorite ? '★' : '☆'}</button>
      ${mp ? `<button class="btn sm primary" data-quick="${i}" title="Log ${esc(mp.label)}: ${esc(mp.qty)} ${esc(mp.unit)}">+ Log</button>` : ''}
    </div>`;
  }).join('')}</div>`;

  $$('[data-pick]').forEach(b => b.onclick = () => {
    const r = rows[parseInt(b.dataset.pick, 10)];
    if (r.type === 'meal') addSavedMeal(r.item);
    else if (r.type === 'recipe') openPortion(recipeToFood(r.item), addCtx.meal);
    else openPortion(r.item, addCtx.meal);
  });
  $$('[data-fav]').forEach(b => b.onclick = () => {
    const r = rows[parseInt(b.dataset.fav, 10)];
    r.item.favorite = !r.item.favorite; save(); drawResults();
  });
  $$('[data-quick]').forEach(b => b.onclick = () => {
    const r = rows[parseInt(b.dataset.quick, 10)];
    const food = foodOf(r);
    const mp = defaultUsablePortion(food);
    // the unit was revalidated when the row rendered, but the food could have
    // changed since — fall back to the portion sheet rather than guessing
    if (!mp) { openPortion(food, addCtx.meal); return; }
    commitEntry(makeEntry(food, mp.qty, mp.unit, addCtx.meal), food.id);
  });
}
const foodOf = r => r.type === 'recipe' ? recipeToFood(r.item) : r.item;
/* nutrition of a saved portion, for the search-row subtitle */
function quickPortionNutr(r, mp) {
  return entryNutr(makeEntry(foodOf(r), mp.qty, mp.unit, 'snacks'));
}
/* single place that commits an entry, so quick-add and the portion sheet
   behave identically (including staging into Meal Preview) */
function commitEntry(entry, foodId) {
  if (PREVIEW) {
    PREVIEW.items.push(entry);
    bumpUsage(foodId);
    save(); closeToPreview(); drawPreview();
    toast('Added to the plan');
    return;
  }
  stampDay(CUR).entries.push(entry);
  bumpUsage(foodId);
  save(); closeSheet(true); render();
  toast(`Added to ${MEAL_LABEL[entry.meal]}`);
}

function savedMealNutr(m) {
  let t = zero();
  m.items.forEach(e => { const n = entryNutr(e); MACROS.forEach(k => t[k] += n[k]); });
  return t;
}
function addSavedMeal(m) {
  const target = PREVIEW ? PREVIEW.items : stampDay(CUR).entries;
  m.items.forEach(e => {
    const copy = {
      ...e, id: uid(), nutr: { ...e.nutr }, at: Date.now(),
      meal: PREVIEW ? PREVIEW.meal : (m.meal || e.meal || addCtx.meal)
    };
    target.push(copy);
    bumpUsage(copy.foodId);
  });
  DB.usage[m.id] = { n: (DB.usage[m.id]?.n || 0) + 1, last: Date.now() };
  save();
  if (PREVIEW) { closeToPreview(); drawPreview(); toast(`${m.name} added to the plan`); }
  else { closeSheet(true); render(); toast(`${m.name} added`); }
}

/* ============================================================
   PORTION PICKER
   ============================================================ */
function openPortion(food, meal, existingEntryId, presetQty, presetUnit) {
  const units = food.units && food.units.length ? food.units : [{ name: 'serving', factor: food.ref.amount }];
  let unit = presetUnit && units.some(u => u.name === presetUnit) ? presetUnit : units[0].name;
  let qty = presetQty != null ? presetQty : defaultQty(units.find(u => u.name === unit));
  let m = meal;

  const mine = portionsFor(food.id).filter(mp => units.some(u => u.name === mp.unit));
  // a saved personal portion is the most likely choice, so it wins the default
  if (presetQty == null && !presetUnit && mine.length) {
    const d = mine.find(x => x.fav) || mine[0];
    unit = d.unit; qty = d.qty;
  }
  const quick = units.slice(0, 6);
  const body = `
    <div id="portionCalc" class="card tight" style="margin-bottom:14px;box-shadow:none"></div>
    ${mine.length ? `<div class="field"><span class="lbl">My portions</span>
      <div class="portion-chips" id="pMine">${mine.map(mp =>
        `<button class="pchip mine" data-mp="${esc(mp.id)}">${mp.fav ? '★ ' : ''}${esc(mp.label)}
          <span style="opacity:.7;font-weight:500"> · ${esc(mp.qty)} ${esc(mp.unit)}</span></button>`).join('')}
      </div></div>` : ''}
    ${food.estimate ? `<div class="note" style="margin-bottom:14px;border-left-color:var(--warn)">
        <b>This is an estimate.</b>${food.range ? ` Typical range: ${esc(food.range)}.` : ''}
        ${food.note ? ' ' + esc(food.note) : ''}
        ${food.kind !== 'recipe' ? `<div style="margin-top:9px"><button class="btn sm" data-act="toRecipe">Build it from my ingredients instead</button></div>` : ''}
      </div>` : (food.note ? `<div class="note" style="margin-bottom:14px">${esc(food.note)}</div>` : '')}

    <div class="grid2">
      <div class="field"><label for="pQty">Quantity</label>
        <input type="number" id="pQty" inputmode="decimal" step="any" value="${qty}"></div>
      <div class="field"><label for="pUnit">Unit</label>
        <select id="pUnit">${units.map(u => `<option value="${esc(u.name)}" ${u.name === unit ? 'selected' : ''}>${esc(u.name)}</option>`).join('')}</select></div>
    </div>
    ${quick.length > 1 ? `<div class="field"><span class="lbl">Quick portions</span>
      <div class="portion-chips" id="pQuick">${quick.map(u =>
        `<button class="pchip" data-u="${esc(u.name)}">${esc(u.name === 'g' ? '100 g' : u.name === 'ml' ? '250 ml' : u.name)}</button>`).join('')}
      </div></div>` : ''}
    <div class="field"><span class="lbl">Meal</span>
      <div class="seg" id="pMeal">${MEALS.map(x =>
        `<button data-m="${x}" class="${m === x ? 'on' : ''}">${MEAL_LABEL[x]}</button>`).join('')}</div>
    </div>
    <div class="hint">Nutrition reference: ${food.ref.amount === 1 ? '' : fmtG(food.ref.amount) + ' '}${esc(food.ref.unit)}
      = ${fmt(food.nutr.calories)} kcal, ${fmtG(food.nutr.protein)} g protein, ${fmtG(food.nutr.carbs)} g carbs,
      ${fmtG(food.nutr.fat)} g fat${food.nutr.fiber ? `, ${fmtG(food.nutr.fiber)} g fiber` : ''}.
      ${food.lib ? ' Portion sizes in brackets are the gram amounts the app assumes — pick “g” and type your own if yours differ.' : ''}
      ${!food.lib && !food.kind ? '' : ''}</div>
    <div class="btn-row" style="margin-top:12px">
      <button class="btn sm" data-act="savePortion">Save this as my portion</button>
      ${mine.length ? `<button class="btn sm" data-act="managePortions">Manage my portions</button>` : ''}
      ${food.id && !food.kind ? `<button class="btn sm" data-act="editfood">Edit nutrition</button>` : ''}
    </div>`;

  const foot = `<button class="btn" data-act="cancel">Cancel</button>
                <button class="btn primary" data-act="add">${existingEntryId ? 'Save changes' : 'Add to ' + MEAL_LABEL[m]}</button>`;

  openSheet(food.name, body, foot, () => {
    const qEl = $('#pQty'), uEl = $('#pUnit');
    const recalc = () => {
      qty = num(qEl.value, 0); unit = uEl.value;
      const e = makeEntry(food, qty, unit, m);
      const n = entryNutr(e);
      $('#portionCalc').innerHTML = `
        <div style="display:flex;align-items:baseline;gap:9px;flex-wrap:wrap">
          <div style="font-size:31px;font-weight:750;letter-spacing:-.03em;color:var(--cal)">${fmt(n.calories)}</div>
          <div style="font-size:13.5px;color:var(--text-2)">kcal for ${esc(describeServing(e))}</div>
          ${food.estimate ? '<span class="badge est">Estimate</span>' : ''}
        </div>
        <div style="display:flex;gap:14px;flex-wrap:wrap;margin-top:9px;font-size:13.5px">
          <span><b style="color:var(--pro)">${fmtG(n.protein)} g</b> protein</span>
          <span><b style="color:var(--carb)">${fmtG(n.carbs)} g</b> carbs</span>
          <span><b style="color:var(--fat)">${fmtG(n.fat)} g</b> fat</span>
          <span><b style="color:var(--fib)">${fmtG(n.fiber)} g</b> fiber</span>
        </div>`;
      $$('#pQuick .pchip').forEach(c => c.classList.toggle('on', c.dataset.u === unit));
      const btn = $('#sheetFoot [data-act=add]');
      if (btn && !existingEntryId) btn.textContent = 'Add to ' + MEAL_LABEL[m];
    };
    qEl.oninput = recalc; uEl.onchange = () => {
      const u = units.find(x => x.name === uEl.value);
      qEl.value = defaultQty(u); recalc();
    };
    $$('#pQuick .pchip').forEach(c => c.onclick = () => {
      uEl.value = c.dataset.u;
      qEl.value = defaultQty(units.find(u => u.name === c.dataset.u));
      recalc();
    });
    $$('#pMine .pchip').forEach(c => c.onclick = () => {
      const mp = mine.find(x => x.id === c.dataset.mp);
      if (!mp) return;
      uEl.value = mp.unit; qEl.value = mp.qty; recalc();
    });
    const sp = $('[data-act=savePortion]');
    if (sp) sp.onclick = () => openSavePortion(food, num(qEl.value, 0), uEl.value, () => {
      closeSheet(); openPortion(food, m, existingEntryId, num(qEl.value, 0), uEl.value);
    });
    const mpg = $('[data-act=managePortions]');
    if (mpg) mpg.onclick = () => openManagePortions(food, () => {
      closeSheet(); openPortion(food, m, existingEntryId, num(qEl.value, 0), uEl.value);
    });
    $$('#pMeal button').forEach(b => b.onclick = () => {
      m = b.dataset.m; $$('#pMeal button').forEach(x => x.classList.toggle('on', x === b)); recalc();
    });
    const ed = $('[data-act=editfood]'); if (ed) ed.onclick = () => openCustomFood(m, '', false, food);
    const tr = $('[data-act=toRecipe]'); if (tr) tr.onclick = () => {
      PREVIEW = null; closeSheet(true); VIEW = 'foods'; render();
      openRecipeBuilder(null, food.name.replace(/\s*\(.*?\)\s*/g, '').trim());
    };
    $('#sheetFoot [data-act=cancel]').onclick = () => closeSheet();
    $('#sheetFoot [data-act=add]').onclick = () => {
      if (num(qEl.value, 0) <= 0) { toast('Enter a quantity above zero'); return; }
      const e = makeEntry(food, num(qEl.value, 0), uEl.value, m);
      if (existingEntryId) {
        const d = day(CUR);
        const i = d.entries.findIndex(x => x.id === existingEntryId);
        if (i >= 0) { e.id = existingEntryId; e.at = d.entries[i].at; d.entries[i] = e; }
        bumpUsage(food.id);
        save(); closeSheet(true); render(); toast('Updated');
        return;
      }
      commitEntry(e, food.id);
    };
    recalc();
  });
}
/* ---------- saving a personal portion ---------- */
function openSavePortion(food, qty, unit, after) {
  if (!(qty > 0)) { toast('Set a quantity first'); return; }
  const suggested = /usual/i.test(food.name) ? 'My portion' : 'My usual';
  const e = makeEntry(food, qty, unit, 'snacks');
  const n = entryNutr(e);
  const body = `
    <p style="font-size:14px;color:var(--text-2);margin-bottom:12px">
      Saves <b>${esc(describeServing(e))}</b> of ${esc(food.name)} — ${fmt(n.calories)} kcal,
      ${fmtG(n.protein)} g protein — as a one-tap portion. It'll show at the top of this screen and as a
      quick-add in search.</p>
    <div class="field"><label for="mpLabel">Call it</label>
      <input type="text" id="mpLabel" value="${esc(suggested)}" placeholder="e.g. My usual, Big bowl, Work lunch"></div>
    <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0">
      <div><div style="font-weight:600;font-size:14.5px">Make it the default</div>
        <div style="font-size:12.5px;color:var(--text-2)">Pre-selected whenever you log this food</div></div>
      <label class="switch"><input type="checkbox" id="mpFav" checked><span class="track"></span></label>
    </div>
    <div class="hint">Measuring your own portion two or three times and saving the average is the single biggest
      accuracy win available — it replaces a generic "medium serving" with your actual one.</div>`;
  openSheet('Save my portion', body, `<button class="btn" data-act="cancel">Cancel</button>
    <button class="btn primary" data-act="ok">Save portion</button>`, () => {
    $('#sheetFoot [data-act=cancel]').onclick = () => closeSheet();
    $('#sheetFoot [data-act=ok]').onclick = () => {
      const label = ($('#mpLabel').value || '').trim();
      if (!label) { toast('Give the portion a name'); return; }
      const p = addMyPortion(food.id, label, qty, unit);
      if ($('#mpFav').checked) portionsFor(food.id).forEach(x => x.fav = x.id === p.id);
      save(); toast('Portion saved');
      closeSheet();
      if (after) after();
    };
  });
}
function openManagePortions(food, after) {
  const list = portionsFor(food.id);
  const body = list.length ? `<div>${list.map(mp => {
    const n = entryNutr(makeEntry(food, mp.qty, mp.unit, 'snacks'));
    return `<div class="ing-row">
      <div class="info"><div style="font-weight:600;font-size:14.5px">${mp.fav ? '★ ' : ''}${esc(mp.label)}</div>
        <div style="font-size:12.5px;color:var(--text-2)">${esc(mp.qty)} ${esc(mp.unit)} · ${fmt(n.calories)} kcal</div></div>
      ${mp.fav ? '' : `<button class="btn sm" data-fav="${esc(mp.id)}">Default</button>`}
      <button class="btn sm danger" data-del="${esc(mp.id)}">✕</button></div>`;
  }).join('')}</div>` : `<div class="empty">No saved portions for this food yet.</div>`;
  openSheet(`My portions — ${food.name}`, body, `<button class="btn" data-act="close">Done</button>`, () => {
    $('#sheetFoot [data-act=close]').onclick = () => { closeSheet(); if (after) after(); };
    $$('[data-fav]').forEach(b => b.onclick = () => {
      portionsFor(food.id).forEach(x => x.fav = x.id === b.dataset.fav);
      save(); closeSheet(); openManagePortions(food, after);
    });
    $$('[data-del]').forEach(b => b.onclick = () => {
      removeMyPortion(food.id, b.dataset.del);
      save(); closeSheet();
      if (portionsFor(food.id).length) openManagePortions(food, after);
      else if (after) after();
      toast('Portion removed');
    });
  });
}

function defaultQty(u) {
  if (!u) return 1;
  if (u.name === 'g' || u.name.startsWith('g ')) return 100;
  if (u.name === 'ml') return 250;
  if (u.name === 'oz') return 4;
  return 1;
}

/* ============================================================
   CUSTOM FOOD / NUTRITION LABEL ENTRY
   ============================================================ */
function openCustomFood(meal, presetName, labelMode, editFood) {
  const f = editFood || null;
  const isEdit = !!f;
  const body = `
    ${!isEdit ? `<div class="seg" id="modeSeg" style="margin-bottom:14px">
      <button data-mode="label" class="${labelMode !== false ? 'on' : ''}">From a label</button>
      <button data-mode="per100" class="${labelMode === false ? 'on' : ''}">Per 100 g</button>
    </div>` : ''}
    <div class="field"><label for="cName">Food name</label>
      <input type="text" id="cName" placeholder="e.g. Mum's egusi, Chi Exotic juice" value="${esc(f ? f.name : (presetName || ''))}"></div>

    <div class="field"><label for="cServ" id="servLbl">Serving size as written on the pack</label>
      <div class="grid2">
        <input type="number" id="cServ" inputmode="decimal" step="any" placeholder="e.g. 30"
          value="${f ? f.ref.amount : 100}">
        <input type="text" id="cServU" placeholder="unit, e.g. g / ml / slice" value="${esc(f ? f.ref.unit : 'g')}">
      </div>
      <div class="hint" id="servHint">Enter the numbers exactly as the label states them for one serving. The app
        scales from there.</div>
    </div>

    <div class="grid2">
      <div class="field"><label for="cKcal">Calories (kcal)</label>
        <input type="number" id="cKcal" inputmode="decimal" step="any" value="${f ? f.nutr.calories : ''}"></div>
      <div class="field"><label for="cPro">Protein (g)</label>
        <input type="number" id="cPro" inputmode="decimal" step="any" value="${f ? f.nutr.protein : ''}"></div>
      <div class="field"><label for="cCarb">Carbs (g)</label>
        <input type="number" id="cCarb" inputmode="decimal" step="any" value="${f ? f.nutr.carbs : ''}"></div>
      <div class="field"><label for="cFat">Fat (g)</label>
        <input type="number" id="cFat" inputmode="decimal" step="any" value="${f ? f.nutr.fat : ''}"></div>
      <div class="field"><label for="cFib">Fiber (g)</label>
        <input type="number" id="cFib" inputmode="decimal" step="any" value="${f ? f.nutr.fiber : ''}"></div>
      <div class="field"><label for="cEst">Mark as estimate</label>
        <div style="display:flex;align-items:center;gap:10px;min-height:44px">
          <label class="switch"><input type="checkbox" id="cEst" ${f && f.estimate ? 'checked' : ''}><span class="track"></span></label>
          <span style="font-size:13px;color:var(--text-2)">If you're guessing</span>
        </div></div>
    </div>

    <div class="field"><label for="cUnits">Extra portion options <span style="font-weight:400;color:var(--text-3)">(optional)</span></label>
      <input type="text" id="cUnits" placeholder="e.g. slice=30, medium portion=150"
        value="${f ? esc((f.units || []).filter(u => u.name !== f.ref.unit && !/^(g|ml|oz)$/.test(u.name)).map(u => `${u.name}=${r1(u.factor)}`).join(', ')) : ''}">
      <div class="hint">Named portions and how many <b id="refUnitName">${esc(f ? f.ref.unit : 'g')}</b> each one is.
        Comma separated. These show up as quick-tap buttons when logging.</div>
    </div>

    <div id="cPreview" class="note" style="display:none"></div>
    ${isEdit ? `<div class="btn-row" style="margin-top:14px">
      <button class="btn sm danger" data-act="delfood">Delete food</button></div>` : ''}`;

  const foot = `<button class="btn" data-act="cancel">Cancel</button>
    <button class="btn primary" data-act="save">${isEdit ? 'Save food' : 'Save & add'}</button>`;

  openSheet(isEdit ? 'Edit food' : 'New food', body, foot, () => {
    let mode = labelMode !== false ? 'label' : 'per100';
    const applyMode = () => {
      if (isEdit) return;
      $('#servLbl').textContent = mode === 'label' ? 'Serving size as written on the pack' : 'Reference amount';
      $('#servHint').textContent = mode === 'label'
        ? 'Enter the numbers exactly as the label states them for one serving. The app scales from there.'
        : 'Nutrition per 100 g is the most reusable way to store a food — then any weight works.';
      if (mode === 'per100') { $('#cServ').value = 100; $('#cServU').value = 'g'; }
      $('#refUnitName').textContent = $('#cServU').value || 'g';
    };
    $$('#modeSeg button').forEach(b => b.onclick = () => {
      mode = b.dataset.mode;
      $$('#modeSeg button').forEach(x => x.classList.toggle('on', x === b));
      applyMode(); preview();
    });
    const ids = ['cName', 'cServ', 'cServU', 'cKcal', 'cPro', 'cCarb', 'cFat', 'cFib', 'cUnits'];
    ids.forEach(i => { $('#' + i).oninput = preview; });
    $('#cServU').oninput = () => { $('#refUnitName').textContent = $('#cServU').value || 'g'; preview(); };
    applyMode(); preview();

    function build() {
      const refAmt = num($('#cServ').value, 100) || 100;
      const refU = ($('#cServU').value || 'g').trim();
      const extra = ($('#cUnits').value || '').split(',').map(s => s.trim()).filter(Boolean).map(s => {
        const [n, v] = s.split('=');
        return n && v != null ? { name: n.trim(), factor: num(v, 1) } : null;
      }).filter(Boolean);
      const units = [];
      if (/^(g|ml)$/i.test(refU)) {
        units.push({ name: refU.toLowerCase(), factor: 1 });
        if (refU.toLowerCase() === 'g') units.push({ name: 'oz', factor: G.oz });
      } else {
        units.push({ name: refU, factor: 1 });
      }
      extra.forEach(u => { if (!units.some(x => x.name === u.name)) units.push(u); });
      return {
        id: f ? f.id : 'usr_' + uid(),
        name: ($('#cName').value || '').trim() || 'Unnamed food',
        ref: { amount: refAmt, unit: refU },
        nutr: {
          calories: num($('#cKcal').value), protein: num($('#cPro').value), carbs: num($('#cCarb').value),
          fat: num($('#cFat').value), fiber: num($('#cFib').value)
        },
        units, estimate: $('#cEst').checked, custom: true, favorite: f ? f.favorite : false,
        lib: f ? f.lib : false, note: f ? f.note : undefined, range: f ? f.range : undefined,
        tags: f ? f.tags : []
      };
    }
    function preview() {
      const o = build(), box = $('#cPreview');
      const kcalFromMacros = o.nutr.protein * 4 + o.nutr.carbs * 4 + o.nutr.fat * 9;
      if (!o.nutr.calories && !kcalFromMacros) { box.style.display = 'none'; return; }
      box.style.display = 'block';
      const diff = o.nutr.calories ? kcalFromMacros - o.nutr.calories : 0;
      const off = o.nutr.calories && Math.abs(diff) > Math.max(35, o.nutr.calories * 0.18);
      box.innerHTML = `Stored as <b>${fmt(o.nutr.calories)} kcal</b> per ${o.ref.amount === 1 ? '' : fmtG(o.ref.amount) + ' '}${esc(o.ref.unit)}.
        ${off ? `<br><span style="color:var(--warn)"><b>Check the numbers:</b> the protein, carbs and fat add up to about
          ${fmt(kcalFromMacros)} kcal, which is ${fmt(Math.abs(diff))} ${diff > 0 ? 'more' : 'less'} than the calories you entered.
          Labels round, but a gap this size usually means a typo.</span>` : ''}`;
    }
    const del = $('[data-act=delfood]');
    if (del) del.onclick = () => confirmSheet('Delete this food?',
      `“${f.name}” will be removed from your foods. Anything you've already logged, and any recipe or saved meal ` +
      `that uses it, keeps its numbers.${f.lib ? ' It is a starter food, so “Restore starter foods” in Settings can bring it back.' : ''}`,
      'Delete', () => {
        deleteFood(f.id);
        save();
        // the editor may be stacked on this food's portion sheet, which is now
        // meaningless — drop everything above the meal plan, or everything
        if (PREVIEW) { closeToPreview(); drawPreview(); }
        else { closeSheet(true); if (VIEW === 'foods') render(); }
        toast('Food deleted');
      }, true);
    $('#sheetFoot [data-act=cancel]').onclick = () => closeSheet();
    $('#sheetFoot [data-act=save]').onclick = () => {
      const o = build();
      if (!$('#cName').value.trim()) { toast('Give the food a name'); return; }
      if (!o.nutr.calories && !o.nutr.protein && !o.nutr.carbs && !o.nutr.fat) { toast('Enter at least the calories'); return; }
      const i = DB.foods.findIndex(x => x.id === o.id);
      if (i >= 0) DB.foods[i] = o; else DB.foods.push(o);
      save();
      if (isEdit) { closeSheet(); toast('Food saved'); if (VIEW === 'foods') render(); }
      else { closeSheet(); openPortion(o, meal || guessMeal()); }
    };
  });
}

/* ============================================================
   ENTRY EDITOR — edit / move / duplicate / delete
   ============================================================ */
function openEntryEditor(k, entryId) {
  const d = day(k);
  const e = d.entries.find(x => x.id === entryId);
  if (!e) return;
  const n = entryNutr(e);
  const body = `
    <div class="card tight" style="box-shadow:none;margin-bottom:14px">
      <div style="display:flex;align-items:baseline;gap:9px;flex-wrap:wrap">
        <div style="font-size:29px;font-weight:750;color:var(--cal);letter-spacing:-.03em">${fmt(n.calories)}</div>
        <div style="font-size:13.5px;color:var(--text-2)">kcal · ${esc(describeServing(e))}</div>
        ${e.estimate ? '<span class="badge est">Estimate</span>' : ''}
      </div>
      <div style="display:flex;gap:14px;flex-wrap:wrap;margin-top:8px;font-size:13.5px">
        <span><b style="color:var(--pro)">${fmtG(n.protein)} g</b> protein</span>
        <span><b style="color:var(--carb)">${fmtG(n.carbs)} g</b> carbs</span>
        <span><b style="color:var(--fat)">${fmtG(n.fat)} g</b> fat</span>
        <span><b style="color:var(--fib)">${fmtG(n.fiber)} g</b> fiber</span>
      </div>
    </div>

    <div class="grid2">
      <div class="field"><label for="eQty">Quantity</label>
        <input type="number" id="eQty" inputmode="decimal" step="any" value="${e.qty}"></div>
      <div class="field"><label for="eUnit">Unit</label>
        <input type="text" id="eUnit" value="${esc(e.unit)}" disabled style="opacity:.7"></div>
    </div>
    <div class="field"><span class="lbl">Move to meal</span>
      <div class="seg" id="eMeal">${MEALS.map(m =>
      `<button data-m="${m}" class="${e.meal === m ? 'on' : ''}">${MEAL_LABEL[m]}</button>`).join('')}</div>
    </div>
    <div class="btn-row" style="margin-top:6px">
      <button class="btn sm" data-act="repick">Change portion or unit</button>
      <button class="btn sm" data-act="dup">Duplicate</button>
      <button class="btn sm danger" data-act="del">Delete</button>
    </div>`;
  openSheet(e.name, body, `<button class="btn" data-act="cancel">Cancel</button>
    <button class="btn primary" data-act="save">Save</button>`, () => {
    let meal = e.meal;
    $$('#eMeal button').forEach(b => b.onclick = () => {
      meal = b.dataset.m; $$('#eMeal button').forEach(x => x.classList.toggle('on', x === b));
    });
    $('[data-act=repick]').onclick = () => {
      const food = foodForEntry(e);
      closeSheet();
      openPortion(food, e.meal, e.id, e.qty, e.unit);
    };
    $('[data-act=dup]').onclick = () => {
      stampDay(k).entries.push({ ...e, id: uid(), at: Date.now(), nutr: { ...e.nutr } });
      save(); closeSheet(); render(); toast('Duplicated');
    };
    $('[data-act=del]').onclick = () => {
      d.entries = d.entries.filter(x => x.id !== e.id);
      save(); closeSheet(); render(); toast('Removed');
    };
    $('#sheetFoot [data-act=cancel]').onclick = () => closeSheet();
    $('#sheetFoot [data-act=save]').onclick = () => {
      const q = num($('#eQty').value, 0);
      if (q <= 0) { toast('Quantity must be above zero'); return; }
      e.qty = q; e.meal = meal;
      save(); closeSheet(); render(); toast('Updated');
    };
  });
}
/* reconstruct a food-like object from a logged entry so the portion
   picker works even if the original food was deleted afterwards */
function foodForEntry(e) {
  const live = DB.foods.find(f => f.id === e.foodId);
  if (live) return live;
  const rec = DB.recipes.find(r => r.id === e.foodId);
  if (rec) return recipeToFood(rec);
  return {
    id: e.foodId, name: e.name, ref: { amount: e.refAmount, unit: e.refUnit },
    nutr: { ...e.nutr }, estimate: e.estimate, kind: e.kind,
    units: [{ name: e.unit, factor: e.factor }, ...(e.refUnit === 'g' ? [{ name: 'g', factor: 1 }] : [])]
  };
}

/* ============================================================
   SAVED MEALS + COPY DAY
   ============================================================ */
function openSaveDayAsMeal(k) {
  const d = day(k);
  if (!d.entries.length) { toast('Nothing logged to save'); return; }
  const byMeal = {};
  MEALS.forEach(m => { const it = d.entries.filter(e => e.meal === m); if (it.length) byMeal[m] = it; });
  const body = `
    <div class="field"><label for="smName">Name this meal</label>
      <input type="text" id="smName" placeholder="e.g. Standard breakfast, Eba + egusi + salmon"></div>
    <div class="field"><span class="lbl">What to save</span>
      <div class="choices" id="smPick">
        ${Object.keys(byMeal).map(m => `<button class="choice" data-pick="${m}">
          <span class="dot"></span><span><b>${MEAL_LABEL[m]} only</b>
          <span>${byMeal[m].length} item${byMeal[m].length > 1 ? 's' : ''} · ${fmt(mealTotals(k, m).calories)} kcal</span></span></button>`).join('')}
        <button class="choice on" data-pick="all"><span class="dot"></span><span><b>The whole day</b>
          <span>${d.entries.length} items · ${fmt(dayTotals(k).calories)} kcal</span></span></button>
      </div></div>
    <div class="hint">Saved meals appear in search and add every item in one tap.</div>`;
  openSheet('Save as a meal', body, `<button class="btn" data-act="cancel">Cancel</button>
    <button class="btn primary" data-act="save">Save meal</button>`, () => {
    let pick = 'all';
    $$('#smPick .choice').forEach(b => b.onclick = () => {
      pick = b.dataset.pick;
      $$('#smPick .choice').forEach(x => x.classList.toggle('on', x === b));
    });
    $('#sheetFoot [data-act=cancel]').onclick = () => closeSheet();
    $('#sheetFoot [data-act=save]').onclick = () => {
      const name = ($('#smName').value || '').trim();
      if (!name) { toast('Give it a name'); return; }
      const items = (pick === 'all' ? d.entries : byMeal[pick]).map(e => ({ ...e, id: uid(), nutr: { ...e.nutr } }));
      DB.savedMeals.push({
        id: 'meal_' + uid(), name, items, meal: pick === 'all' ? null : pick,
        favorite: false, createdAt: Date.now()
      });
      save(); closeSheet(); render(); toast('Meal saved');
    };
  });
}

function openCopyDay(target) {
  const keys = Object.keys(DB.days).filter(k => k !== target && DB.days[k].entries && DB.days[k].entries.length)
    .sort().reverse().slice(0, 30);
  if (!keys.length) { toast('No other days with food logged yet'); return; }
  const body = `
    <p style="color:var(--text-2);font-size:14px;margin-bottom:12px">Copy everything logged on another day into
      ${prettyDate(target).toLowerCase()}. Existing items stay — this adds on top.</p>
    <div class="srch-res">${keys.map(k => {
    const t = dayTotals(k);
    return `<button class="res" data-copy="${k}">
        <div class="info"><div class="nm">${esc(prettyDate(k))}</div>
          <div class="sub">${DB.days[k].entries.length} items · ${fmt(t.calories)} kcal · P ${fmtG(t.protein)} g</div></div>
        <span style="color:var(--accent);font-weight:700">Copy</span></button>`;
  }).join('')}</div>`;
  openSheet('Copy a day', body, `<button class="btn" data-act="close">Close</button>`, () => {
    $('#sheetFoot [data-act=close]').onclick = () => closeSheet();
    $$('[data-copy]').forEach(b => b.onclick = () => {
      const src = DB.days[b.dataset.copy];
      const d = stampDay(target);
      src.entries.forEach(e => d.entries.push({ ...e, id: uid(), at: Date.now(), nutr: { ...e.nutr } }));
      save(); closeSheet(); render(); toast(`Copied ${src.entries.length} items`);
    });
  });
}
