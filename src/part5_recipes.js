/* ============================================================
   FOODS SCREEN — library, my foods, recipes, saved meals
   ============================================================ */
let foodsTab = 'recipes';
let foodsQuery = '';

function viewFoods() {
  return `
  <div class="apphead"><div class="wrap">
    <div><div class="eyebrow">Library</div><h1 style="margin-top:1px">Foods</h1></div>
    <button class="btn sm primary" data-act="newrecipe">${ICON.plus} Recipe</button>
  </div></div>
  <div class="wrap">
    <div class="chips" id="fTabs">
      ${[['recipes', 'My recipes'], ['meals', 'Saved meals'], ['mine', 'My foods'], ['lib', 'Starter library'], ['fav', 'Favorites']]
      .map(([k, l]) => `<button class="chip ${foodsTab === k ? 'on' : ''}" data-t="${k}">${l}</button>`).join('')}
    </div>
    <div class="field"><input type="text" id="fq" placeholder="Search…" value="${esc(foodsQuery)}"></div>
    <div id="foodsList"></div>
    <div class="card tight">
      <div class="btn-row">
        <button class="btn sm" data-act="newfood">Add a food</button>
        <button class="btn sm" data-act="newrecipe2">Build a recipe</button>
      </div>
      <div class="hint" style="margin-top:9px">Recipes are the accurate way to handle anything you cook yourself —
        egusi, stew, jollof, sauces. Enter the pot once and every serving after that is real arithmetic rather
        than a guess.</div>
    </div>
    <div class="spacer"></div>
  </div>`;
}

function mountFoods() {
  $$('#fTabs .chip').forEach(b => b.onclick = () => { foodsTab = b.dataset.t; render(); });
  $('#fq').oninput = e => { foodsQuery = e.target.value; drawFoodsList(); };
  $$('[data-act=newrecipe],[data-act=newrecipe2]').forEach(b => b.onclick = () => openRecipeBuilder(null));
  $('[data-act=newfood]').onclick = () => openCustomFood(guessMeal(), '', false);
  drawFoodsList();
}

function drawFoodsList() {
  const box = $('#foodsList');
  const q = foodsQuery.trim().toLowerCase();
  const match = n => !q || n.toLowerCase().includes(q);
  let rows = [];
  if (foodsTab === 'recipes') rows = DB.recipes.filter(r => match(r.name)).map(r => ({ t: 'recipe', o: r }));
  else if (foodsTab === 'meals') rows = DB.savedMeals.filter(m => match(m.name)).map(m => ({ t: 'meal', o: m }));
  else if (foodsTab === 'mine') rows = DB.foods.filter(f => f.custom && match(f.name)).map(f => ({ t: 'food', o: f }));
  else if (foodsTab === 'lib') rows = DB.foods.filter(f => f.lib && match(f.name)).map(f => ({ t: 'food', o: f }));
  else rows = [...DB.foods.filter(f => f.favorite && match(f.name)).map(f => ({ t: 'food', o: f })),
  ...DB.recipes.filter(f => f.favorite && match(f.name)).map(f => ({ t: 'recipe', o: f })),
  ...DB.savedMeals.filter(f => f.favorite && match(f.name)).map(f => ({ t: 'meal', o: f }))];

  if (!rows.length) {
    const msg = {
      recipes: 'No recipes yet. Build one for a dish you cook often — it turns an estimate into a real number.',
      meals: 'No saved meals yet. Log a meal on Today, then use “Save as meal”.',
      mine: 'No custom foods yet. Add one from a nutrition label or by hand.',
      lib: 'Nothing matches that search.',
      fav: 'No favorites yet. Tap the star next to any food when adding it.'
    }[foodsTab];
    box.innerHTML = `<div class="card"><div class="empty" style="padding:18px 4px">${esc(msg)}</div></div>`;
    return;
  }
  box.innerHTML = `<div class="card"><div class="srch-res">${rows.map((r, i) => {
    const o = r.o;
    let sub;
    if (r.t === 'recipe') {
      const ps = o.perServing || zero();
      sub = `${fmt(ps.calories)} kcal · P ${fmtG(ps.protein)} g per serving · ${o.ingredients.length} ingredients`;
    } else if (r.t === 'meal') {
      const n = savedMealNutr(o);
      sub = `${o.items.length} items · ${fmt(n.calories)} kcal · P ${fmtG(n.protein)} g`;
    } else {
      sub = `${fmt(o.nutr.calories)} kcal per ${o.ref.amount === 1 ? '' : fmtG(o.ref.amount) + ' '}${o.ref.unit}`;
    }
    return `<div class="res">
      <button style="flex:1;min-width:0;background:none;border:none;text-align:left;padding:0" data-open="${i}">
        <span class="nm" style="display:block">${esc(o.name)}
          ${o.estimate ? '<span class="badge est">Est</span>' : ''}
          ${r.t === 'recipe' ? '<span class="badge rec">Recipe</span>' : ''}
          ${r.t === 'meal' ? '<span class="badge">Meal</span>' : ''}</span>
        <span class="sub" style="display:block">${esc(sub)}</span>
      </button>
      <button class="star ${o.favorite ? 'on' : ''}" data-fav="${i}">${o.favorite ? '★' : '☆'}</button>
      <button class="btn sm" data-log="${i}">Log</button>
    </div>`;
  }).join('')}</div></div>`;

  $$('[data-open]').forEach(b => b.onclick = () => {
    const r = rows[parseInt(b.dataset.open, 10)];
    if (r.t === 'recipe') openRecipeBuilder(r.o);
    else if (r.t === 'meal') openSavedMealEditor(r.o);
    else openCustomFood(guessMeal(), '', false, r.o);
  });
  $$('[data-fav]').forEach(b => b.onclick = () => {
    const r = rows[parseInt(b.dataset.fav, 10)];
    r.o.favorite = !r.o.favorite; save(); drawFoodsList();
  });
  $$('[data-log]').forEach(b => b.onclick = () => {
    const r = rows[parseInt(b.dataset.log, 10)];
    if (r.t === 'meal') { addCtx.meal = r.o.meal || guessMeal(); addSavedMeal(r.o); }
    else if (r.t === 'recipe') openPortion(recipeToFood(r.o), guessMeal());
    else openPortion(r.o, guessMeal());
  });
}

function openSavedMealEditor(m) {
  const n = savedMealNutr(m);
  const body = `
    <div class="card tight" style="box-shadow:none;margin-bottom:14px">
      <div style="font-size:28px;font-weight:750;color:var(--cal);letter-spacing:-.03em">${fmt(n.calories)} <span style="font-size:14px;color:var(--text-2);font-weight:600">kcal total</span></div>
      <div style="display:flex;gap:14px;flex-wrap:wrap;margin-top:7px;font-size:13.5px">
        <span><b style="color:var(--pro)">${fmtG(n.protein)} g</b> protein</span>
        <span><b style="color:var(--carb)">${fmtG(n.carbs)} g</b> carbs</span>
        <span><b style="color:var(--fat)">${fmtG(n.fat)} g</b> fat</span>
        <span><b style="color:var(--fib)">${fmtG(n.fiber)} g</b> fiber</span>
      </div>
    </div>
    <div class="field"><label for="mName">Name</label><input type="text" id="mName" value="${esc(m.name)}"></div>
    <h3 style="font-size:14px;margin:14px 0 2px">Items</h3>
    <div id="mItems">${m.items.map((e, i) => {
    const en = entryNutr(e);
    return `<div class="ing-row">
        <div class="info"><div class="nm" style="font-size:14.5px;font-weight:600">${esc(e.name)}</div>
          <div class="sub" style="font-size:12.5px;color:var(--text-2)">${esc(describeServing(e))} · ${fmt(en.calories)} kcal</div></div>
        <button class="btn sm danger" data-rm="${i}">Remove</button></div>`;
  }).join('')}</div>
    <div class="btn-row" style="margin-top:14px">
      <button class="btn sm" data-act="logit">Log this meal now</button>
      <button class="btn sm danger" data-act="delmeal">Delete meal</button>
    </div>`;
  openSheet('Saved meal', body, `<button class="btn" data-act="cancel">Close</button>
    <button class="btn primary" data-act="save">Save</button>`, () => {
    $$('[data-rm]').forEach(b => b.onclick = () => {
      m.items.splice(parseInt(b.dataset.rm, 10), 1);
      if (!m.items.length) { DB.savedMeals = DB.savedMeals.filter(x => x.id !== m.id); save(); closeSheet(); render(); toast('Meal deleted'); return; }
      save(); closeSheet(); openSavedMealEditor(m);
    });
    $('[data-act=logit]').onclick = () => { addCtx.meal = m.meal || guessMeal(); addSavedMeal(m); };
    $('[data-act=delmeal]').onclick = () => confirmSheet('Delete meal?', `“${m.name}” will be removed. Days you've already logged it on are unaffected.`,
      'Delete', () => { DB.savedMeals = DB.savedMeals.filter(x => x.id !== m.id); save(); closeSheet(true); render(); toast('Deleted'); }, true);
    $('#sheetFoot [data-act=cancel]').onclick = () => closeSheet();
    $('#sheetFoot [data-act=save]').onclick = () => {
      m.name = ($('#mName').value || '').trim() || m.name;
      save(); closeSheet(); render(); toast('Saved');
    };
  });
}

/* ============================================================
   RECIPE BUILDER
   ============================================================ */
let RB = null;   // working recipe

function openRecipeBuilder(existing, presetName) {
  RB = existing
    ? JSON.parse(JSON.stringify(existing))
    : {
      id: 'rec_' + uid(), name: presetName || '', ingredients: [], servings: 4,
      totalWeight: null, mode: 'servings', favorite: false, createdAt: Date.now()
    };
  if (!RB.mode) RB.mode = RB.totalWeight ? 'weight' : 'servings';
  drawRecipeBuilder(!!existing);
}

function drawRecipeBuilder(isEdit) {
  recomputeRecipe(RB);
  const t = RB.total, ps = RB.perServing;
  const servings = Math.max(num(RB.servings, 1), 0.01);

  const body = `
    <div class="field"><label for="rName">Recipe name</label>
      <input type="text" id="rName" placeholder="e.g. My egusi soup, Sunday stew" value="${esc(RB.name)}"></div>

    <h3 style="font-size:14px;margin:16px 0 4px">Ingredients</h3>
    ${RB.ingredients.length ? `<div id="rIngs">${RB.ingredients.map((ing, i) => {
    const n = entryNutr(ing);
    return `<div class="ing-row">
        <div class="info">
          <div style="font-size:14.5px;font-weight:600">${esc(ing.name)} ${ing.estimate ? '<span class="badge est">Est</span>' : ''}</div>
          <div style="font-size:12.5px;color:var(--text-2)">${esc(describeServing(ing))} · ${fmt(n.calories)} kcal ·
            P ${fmtG(n.protein)} · C ${fmtG(n.carbs)} · F ${fmtG(n.fat)}</div>
        </div>
        <button class="btn sm" data-edit="${i}">Edit</button>
        <button class="btn sm danger" data-rm="${i}">✕</button>
      </div>`;
  }).join('')}</div>`
      : `<div class="empty" style="padding:14px 4px">No ingredients yet. Add everything that goes into the pot,
           including the oil — oil is usually the single biggest calorie source in Nigerian cooking.</div>`}
    <button class="btn wide" data-act="addIng" style="margin-top:10px">${ICON.plus} Add ingredient</button>

    ${RB.ingredients.length ? `
    <div class="card tight" style="margin-top:16px;box-shadow:none">
      <div class="card-h" style="margin-bottom:6px"><h3 style="font-size:14px">Whole pot</h3>
        ${RB.estimate ? '<span class="badge est">Contains estimates</span>' : '<span class="badge">Calculated</span>'}</div>
      <div class="kv"><span class="k">Calories</span><span class="v">${fmt(t.calories)} kcal</span></div>
      <div class="kv"><span class="k">Protein</span><span class="v">${fmtG(t.protein)} g</span></div>
      <div class="kv"><span class="k">Carbs</span><span class="v">${fmtG(t.carbs)} g</span></div>
      <div class="kv"><span class="k">Fat</span><span class="v">${fmtG(t.fat)} g</span></div>
      <div class="kv"><span class="k">Fiber</span><span class="v">${fmtG(t.fiber)} g</span></div>
    </div>

    <div class="field" style="margin-top:16px"><span class="lbl">Divide the pot by</span>
      <div class="seg" id="rMode">
        <button data-mode="servings" class="${RB.mode === 'servings' ? 'on' : ''}">Number of servings</button>
        <button data-mode="weight" class="${RB.mode === 'weight' ? 'on' : ''}">Total cooked weight</button>
      </div>
    </div>
    ${RB.mode === 'servings'
        ? `<div class="field"><label for="rServ">How many servings does this pot make?</label>
           <input type="number" id="rServ" inputmode="decimal" step="any" min="0.5" value="${esc(RB.servings)}">
           <div class="hint">Count how many times you'll eat from it. Rough is fine — you can change it later
             and every future log updates.</div></div>
         <div class="field"><label for="rTW">Total cooked weight <span style="font-weight:400;color:var(--text-3)">(optional)</span></label>
           <input type="number" id="rTW" inputmode="decimal" step="any" placeholder="grams — lets you log by weight later"
             value="${RB.totalWeight ? esc(RB.totalWeight) : ''}"></div>`
        : `<div class="field"><label for="rTW2">Total cooked weight of the pot (g)</label>
           <input type="number" id="rTW2" inputmode="decimal" step="any" placeholder="e.g. 2400"
             value="${RB.totalWeight ? esc(RB.totalWeight) : ''}">
           <div class="hint">Weigh the finished pot (minus the pot itself). This is the most accurate option —
             you can then log any serving by weight.</div></div>
         <div class="field"><label for="rServ2">Serving size (g)</label>
           <input type="number" id="rServ2" inputmode="decimal" step="any" placeholder="e.g. 250"
             value="${RB.servingWeight ? r0(RB.servingWeight) : ''}"></div>`}

    <div class="card tight" style="box-shadow:none;border-color:var(--accent)">
      <div class="card-h" style="margin-bottom:6px"><h3 style="font-size:14px">Per serving</h3>
        <span style="font-size:12.5px;color:var(--text-2)">${RB.mode === 'weight' && RB.servingWeight
          ? `${r0(RB.servingWeight)} g each` : `pot ÷ ${r1(servings)}`}</span></div>
      <div style="display:flex;align-items:baseline;gap:9px">
        <div style="font-size:31px;font-weight:750;color:var(--cal);letter-spacing:-.03em">${fmt(ps.calories)}</div>
        <div style="font-size:13.5px;color:var(--text-2)">kcal per serving</div>
      </div>
      <div style="display:flex;gap:14px;flex-wrap:wrap;margin-top:8px;font-size:13.5px">
        <span><b style="color:var(--pro)">${fmtG(ps.protein)} g</b> protein</span>
        <span><b style="color:var(--carb)">${fmtG(ps.carbs)} g</b> carbs</span>
        <span><b style="color:var(--fat)">${fmtG(ps.fat)} g</b> fat</span>
        <span><b style="color:var(--fib)">${fmtG(ps.fiber)} g</b> fiber</span>
      </div>
      ${RB.estimate ? `<div class="hint" style="margin-top:9px">Some ingredients are themselves estimates, so this
        carries their uncertainty. It's still far closer than a generic dish value.</div>` : ''}
    </div>

    <div class="field" style="margin-top:14px"><label for="rNote">Notes <span style="font-weight:400;color:var(--text-3)">(optional)</span></label>
      <textarea id="rNote" rows="2" placeholder="e.g. used 3 cooking spoons of palm oil">${esc(RB.note || '')}</textarea></div>
    ` : ''}

    ${isEdit ? `<div class="btn-row" style="margin-top:14px">
      <button class="btn sm danger" data-act="delrec">Delete recipe</button></div>` : ''}`;

  const foot = `<button class="btn" data-act="cancel">Cancel</button>
    <button class="btn primary" data-act="save" ${RB.ingredients.length ? '' : 'disabled'}>
      ${isEdit ? 'Save recipe' : 'Save recipe'}</button>`;

  const mount = () => {
    $('#rName').oninput = e => { RB.name = e.target.value; };
    $('[data-act=addIng]').onclick = () => openIngredientPicker();
    $$('[data-edit]').forEach(b => b.onclick = () => openIngredientPicker(parseInt(b.dataset.edit, 10)));
    $$('[data-rm]').forEach(b => b.onclick = () => {
      RB.ingredients.splice(parseInt(b.dataset.rm, 10), 1);
      replaceSheetRecipe(isEdit);
    });
    const modeBtns = $$('#rMode button');
    modeBtns.forEach(b => b.onclick = () => { readRecipeInputs(); RB.mode = b.dataset.mode; replaceSheetRecipe(isEdit); });
    ['rServ', 'rTW', 'rTW2', 'rServ2'].forEach(id => {
      const el = $('#' + id); if (el) el.oninput = () => { readRecipeInputs(); refreshPerServing(); };
    });
    const nt = $('#rNote'); if (nt) nt.oninput = e => { RB.note = e.target.value; };
    const dr = $('[data-act=delrec]'); if (dr) dr.onclick = () => confirmSheet('Delete recipe?',
      `“${RB.name || 'This recipe'}” will be removed. Meals you've already logged with it keep their numbers.`,
      'Delete', () => {
        DB.recipes = DB.recipes.filter(r => r.id !== RB.id); save(); closeSheet(true); render(); toast('Recipe deleted');
      }, true);
    $('#sheetFoot [data-act=cancel]').onclick = () => closeSheet();
    $('#sheetFoot [data-act=save]').onclick = saveRecipe;
  };

  if (sheetStack.length && sheetStack[sheetStack.length - 1].isRecipe) {
    sheetStack.pop();
    sheetStack.push({ title: isEdit ? 'Edit recipe' : 'Recipe builder', bodyHTML: body, footHTML: foot, onMount: mount, isRecipe: true });
    renderSheet();
  } else {
    sheetStack.push({ title: isEdit ? 'Edit recipe' : 'Recipe builder', bodyHTML: body, footHTML: foot, onMount: mount, isRecipe: true });
    renderSheet();
  }

  function replaceSheetRecipe(ed) { drawRecipeBuilder(ed); }
  function readRecipeInputs() {
    const nm = $('#rName'); if (nm) RB.name = nm.value;
    if (RB.mode === 'servings') {
      const s = $('#rServ'); if (s) RB.servings = num(s.value, 1) || 1;
      const w = $('#rTW'); RB.totalWeight = w && w.value ? num(w.value) : null;
    } else {
      const w = $('#rTW2'); RB.totalWeight = w && w.value ? num(w.value) : null;
      const sw = $('#rServ2'); const sv = sw ? num(sw.value) : 0;
      if (RB.totalWeight && sv > 0) { RB.servings = RB.totalWeight / sv; RB.servingWeight = sv; }
    }
  }
  function refreshPerServing() { drawRecipeBuilder(isEdit); }
  function saveRecipe() {
    readRecipeInputs();
    if (!(RB.name || '').trim()) { toast('Give the recipe a name'); return; }
    if (!RB.ingredients.length) { toast('Add at least one ingredient'); return; }
    recomputeRecipe(RB);
    const i = DB.recipes.findIndex(r => r.id === RB.id);
    if (i >= 0) DB.recipes[i] = RB; else DB.recipes.push(RB);
    save(); closeSheet(true);
    VIEW = 'foods'; foodsTab = 'recipes'; render();
    toast('Recipe saved');
  }
}

/* ---------- ingredient picker (search -> amount) ---------- */
function openIngredientPicker(editIndex) {
  const editing = editIndex != null ? RB.ingredients[editIndex] : null;
  let q = '';
  const body = `
    <div class="field"><input type="text" id="iq" placeholder="Search an ingredient…" autocomplete="off"></div>
    <div id="iRes"></div>
    <div class="note" style="margin-top:12px">Can't find it? <button class="btn sm" data-act="icustom" style="margin-top:7px">Add it as a custom food</button></div>`;
  openSheet(editing ? 'Change ingredient' : 'Add ingredient', body, `<button class="btn" data-act="cancel">Cancel</button>`, () => {
    const box = $('#iRes');
    const draw = () => {
      const rows = searchAll(q).filter(r => r.type === 'food').slice(0, 40);
      box.innerHTML = rows.length ? `<div class="srch-res">${rows.map((r, i) => `
        <button class="res" data-i="${i}">
          <div class="info"><div class="nm">${esc(r.item.name)} ${r.item.estimate ? '<span class="badge est">Est</span>' : ''}</div>
            <div class="sub">${fmt(r.item.nutr.calories)} kcal per ${r.item.ref.amount === 1 ? '' : fmtG(r.item.ref.amount) + ' '}${esc(r.item.ref.unit)}</div></div>
          <span style="color:var(--accent);font-weight:700;font-size:20px">+</span></button>`).join('')}</div>`
        : `<div class="empty" style="padding:16px 4px">Nothing matching. Add it as a custom food below.</div>`;
      $$('[data-i]').forEach(b => b.onclick = () => askAmount(rows[parseInt(b.dataset.i, 10)].item));
    };
    $('#iq').oninput = e => { q = e.target.value; draw(); };
    $('[data-act=icustom]').onclick = () => {
      closeSheet();
      openCustomFoodForIngredient(q);
    };
    $('#sheetFoot [data-act=cancel]').onclick = () => closeSheet();
    draw();
    setTimeout(() => { if (window.innerWidth > 720) $('#iq').focus(); }, 280);
  });

  function askAmount(food) {
    const units = food.units && food.units.length ? food.units : [{ name: food.ref.unit, factor: 1 }];
    let unit = editing && units.some(u => u.name === editing.unit) ? editing.unit : units[0].name;
    let qty = editing ? editing.qty : defaultQty(units.find(u => u.name === unit));
    const b = `
      <div id="iCalc" class="card tight" style="box-shadow:none;margin-bottom:14px"></div>
      <div class="grid2">
        <div class="field"><label for="iQty">Amount used in the pot</label>
          <input type="number" id="iQty" inputmode="decimal" step="any" value="${qty}"></div>
        <div class="field"><label for="iUnit">Unit</label>
          <select id="iUnit">${units.map(u => `<option value="${esc(u.name)}" ${u.name === unit ? 'selected' : ''}>${esc(u.name)}</option>`).join('')}</select></div>
      </div>
      ${food.estimate ? `<div class="note" style="border-left-color:var(--warn)">This ingredient's own value is an
        estimate${food.range ? ` (${esc(food.range)})` : ''}, so the recipe inherits that uncertainty.</div>` : ''}`;
    replaceSheet(food.name, b, `<button class="btn" data-act="back">Back</button>
      <button class="btn primary" data-act="ok">${editing ? 'Update' : 'Add to recipe'}</button>`, () => {
      const qEl = $('#iQty'), uEl = $('#iUnit');
      const calc = () => {
        const e = makeEntry(food, num(qEl.value, 0), uEl.value, 'recipe');
        const n = entryNutr(e);
        $('#iCalc').innerHTML = `<div style="font-size:24px;font-weight:750;color:var(--cal)">${fmt(n.calories)}
          <span style="font-size:13px;color:var(--text-2);font-weight:600">kcal</span></div>
          <div style="font-size:13px;color:var(--text-2);margin-top:5px">P ${fmtG(n.protein)} · C ${fmtG(n.carbs)} · F ${fmtG(n.fat)} · Fib ${fmtG(n.fiber)}</div>`;
      };
      qEl.oninput = calc;
      uEl.onchange = () => { qEl.value = defaultQty(units.find(u => u.name === uEl.value)); calc(); };
      calc();
      $('#sheetFoot [data-act=back]').onclick = () => closeSheet();
      $('#sheetFoot [data-act=ok]').onclick = () => {
        if (num(qEl.value, 0) <= 0) { toast('Enter an amount'); return; }
        const ing = makeEntry(food, num(qEl.value, 0), uEl.value, 'recipe');
        if (editing) RB.ingredients[editIndex] = ing; else RB.ingredients.push(ing);
        closeSheet();          // close amount sheet -> back to recipe builder
        drawRecipeBuilder(DB.recipes.some(r => r.id === RB.id));
      };
    });
  }
}

/* a custom food created while building a recipe: save it, then go
   straight to the amount step */
function openCustomFoodForIngredient(presetName) {
  const body = `
    <div class="field"><label for="ciName">Ingredient name</label>
      <input type="text" id="ciName" value="${esc(presetName || '')}" placeholder="e.g. Ponmo, locust bean"></div>
    <div class="grid2">
      <div class="field"><label for="ciAmt">Nutrition is per</label>
        <input type="number" id="ciAmt" inputmode="decimal" step="any" value="100"></div>
      <div class="field"><label for="ciUnit">Unit</label>
        <input type="text" id="ciUnit" value="g"></div>
      <div class="field"><label for="ciKcal">Calories</label><input type="number" id="ciKcal" inputmode="decimal" step="any"></div>
      <div class="field"><label for="ciPro">Protein (g)</label><input type="number" id="ciPro" inputmode="decimal" step="any"></div>
      <div class="field"><label for="ciCarb">Carbs (g)</label><input type="number" id="ciCarb" inputmode="decimal" step="any"></div>
      <div class="field"><label for="ciFat">Fat (g)</label><input type="number" id="ciFat" inputmode="decimal" step="any"></div>
      <div class="field"><label for="ciFib">Fiber (g)</label><input type="number" id="ciFib" inputmode="decimal" step="any"></div>
      <div class="field"><label for="ciEst">Estimate?</label>
        <div style="display:flex;align-items:center;gap:10px;min-height:44px">
          <label class="switch"><input type="checkbox" id="ciEst" checked><span class="track"></span></label>
          <span style="font-size:13px;color:var(--text-2)">Mark if guessed</span></div></div>
    </div>`;
  openSheet('New ingredient', body, `<button class="btn" data-act="cancel">Cancel</button>
    <button class="btn primary" data-act="save">Save ingredient</button>`, () => {
    $('#sheetFoot [data-act=cancel]').onclick = () => { closeSheet(); openIngredientPicker(); };
    $('#sheetFoot [data-act=save]').onclick = () => {
      const name = ($('#ciName').value || '').trim();
      if (!name) { toast('Give it a name'); return; }
      const unit = ($('#ciUnit').value || 'g').trim();
      const f = {
        id: 'usr_' + uid(), name,
        ref: { amount: num($('#ciAmt').value, 100) || 100, unit },
        nutr: {
          calories: num($('#ciKcal').value), protein: num($('#ciPro').value), carbs: num($('#ciCarb').value),
          fat: num($('#ciFat').value), fiber: num($('#ciFib').value)
        },
        units: /^(g|ml)$/i.test(unit) ? [{ name: unit.toLowerCase(), factor: 1 }, { name: 'oz', factor: G.oz }]
          : [{ name: unit, factor: 1 }],
        estimate: $('#ciEst').checked, custom: true, favorite: false, tags: ['ingredient']
      };
      DB.foods.push(f); save();
      closeSheet();
      openIngredientPicker();
      toast('Ingredient saved');
    };
  });
}
