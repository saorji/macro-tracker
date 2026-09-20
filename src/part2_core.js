/* ============================================================
   MACRO TRACKER — core: storage, nutrition math, food library
   All nutrition is stored per a food's reference amount+unit.
   Entry multiplier = (qty * unitFactor) / refAmount
   ============================================================ */
'use strict';

const KEY = 'macrotracker.v1';
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const MEALS = ['breakfast', 'lunch', 'dinner', 'snacks'];
const MEAL_LABEL = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snacks: 'Snacks' };
const MACROS = ['calories', 'protein', 'carbs', 'fat', 'fiber'];

/* ---------- small helpers ---------- */
const num = (v, d = 0) => { const n = parseFloat(v); return Number.isFinite(n) ? n : d; };
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const r0 = n => Math.round(n);
const r1 = n => Math.round(n * 10) / 10;
const fmt = n => r0(n).toLocaleString();
const fmtG = n => (Math.abs(n) < 10 ? r1(n) : r0(n)).toLocaleString();
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const todayKey = () => dkey(new Date());
function dkey(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function parseKey(k) { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); }
function shiftKey(k, days) { const d = parseKey(k); d.setDate(d.getDate() + days); return dkey(d); }
function prettyDate(k) {
  const d = parseKey(k), t = todayKey();
  if (k === t) return 'Today';
  if (k === shiftKey(t, -1)) return 'Yesterday';
  if (k === shiftKey(t, 1)) return 'Tomorrow';
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: sameYear ? undefined : 'numeric' });
}
const zero = () => ({ calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
function addNutr(a, b, mult = 1) {
  const o = { ...a };
  MACROS.forEach(m => { o[m] = (o[m] || 0) + (b[m] || 0) * mult; });
  return o;
}

/* ---------- unit conversions ----------
   Every food declares units as {name, factor} where factor = how many
   reference-units one of this unit equals. For gram-based foods the
   reference is 100 g, so factor = grams per 1 unit.                     */
const G = { g: 1, oz: 28.35, lb: 453.6, kg: 1000 };

/* ============================================================
   STARTER FOOD LIBRARY
   ref: {amount, unit} + nutr per that amount.
   Values for single-ingredient foods are generic reference values
   (USDA-style averages). Composite/homemade dishes are flagged
   estimate:true with a plausible range, because they genuinely vary.
   ============================================================ */
function per100(name, kcal, p, c, f, fib, units, extra = {}) {
  return Object.assign({
    id: 'lib_' + name.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
    name, ref: { amount: 100, unit: 'g' },
    nutr: { calories: kcal, protein: p, carbs: c, fat: f, fiber: fib },
    units: units || [{ name: 'g', factor: 1 }, { name: 'oz', factor: G.oz }],
    estimate: false, lib: true, tags: []
  }, extra);
}
const U_G = () => [{ name: 'g', factor: 1 }, { name: 'oz', factor: G.oz }];

function starterFoods() {
  const F = [];
  /* --- proteins --- */
  F.push(per100('Egg, whole', 143, 12.6, 0.7, 9.5, 0,
    [{ name: 'large egg', factor: 50 }, { name: 'medium egg', factor: 44 }, { name: 'jumbo egg', factor: 63 }, ...U_G()],
    { tags: ['protein'] }));
  F.push(per100('Salmon, cooked', 206, 22.1, 0, 12.4, 0,
    [{ name: 'g', factor: 1 }, { name: 'oz', factor: G.oz }, { name: 'fillet (150 g)', factor: 150 }, { name: 'small fillet (110 g)', factor: 110 }],
    { tags: ['protein'] }));
  F.push(per100('Chicken breast, skinless, cooked', 165, 31, 0, 3.6, 0,
    [{ name: 'g', factor: 1 }, { name: 'oz', factor: G.oz }, { name: 'breast (170 g)', factor: 170 }], { tags: ['protein'] }));
  F.push(per100('Chicken thigh, skinless, cooked', 209, 26, 0, 10.9, 0,
    [{ name: 'g', factor: 1 }, { name: 'thigh (95 g)', factor: 95 }, { name: 'oz', factor: G.oz }], { tags: ['protein'] }));
  F.push(per100('Beef, lean, cooked', 250, 26, 0, 15, 0, U_G(), { tags: ['protein'] }));
  F.push(per100('Goat meat, cooked', 143, 27.1, 0, 3.0, 0, U_G(), { tags: ['protein', 'nigerian'] }));
  F.push(per100('Turkey, cooked', 189, 29, 0, 7.4, 0, U_G(), { tags: ['protein'] }));
  F.push(per100('Tilapia, cooked', 128, 26, 0, 2.7, 0,
    [{ name: 'g', factor: 1 }, { name: 'fillet (110 g)', factor: 110 }, { name: 'oz', factor: G.oz }], { tags: ['protein'] }));
  F.push(per100('Dried/smoked fish (stockfish)', 290, 62, 0, 4, 0, U_G(),
    { tags: ['protein', 'nigerian'], estimate: true, note: 'Varies a lot by fish type and how dry it is.' }));
  F.push(per100('Crayfish, ground (dried)', 315, 58, 4, 7, 0,
    [{ name: 'g', factor: 1 }, { name: 'tbsp', factor: 7 }], { tags: ['nigerian'], estimate: true }));
  F.push(per100('Greek yogurt, plain 2%', 73, 9.9, 3.9, 1.9, 0,
    [{ name: 'g', factor: 1 }, { name: 'cup (227 g)', factor: 227 }, { name: 'container (170 g)', factor: 170 }], { tags: ['protein'] }));
  F.push(per100('Whey protein powder', 400, 80, 8, 5, 1,
    [{ name: 'scoop (30 g)', factor: 30 }, { name: 'g', factor: 1 }],
    { tags: ['protein'], estimate: true, note: 'Check your tub — brands differ. Edit to match your label.' }));

  /* --- staples / carbs --- */
  F.push(per100('White rice, cooked', 130, 2.7, 28.2, 0.3, 0.4,
    [{ name: 'g', factor: 1 }, { name: 'cup (158 g)', factor: 158 }, { name: 'small plate (200 g)', factor: 200 }, { name: 'medium plate (300 g)', factor: 300 }, { name: 'large plate (400 g)', factor: 400 }], { tags: ['carb'] }));
  F.push(per100('Rice, dry/uncooked', 365, 7.1, 80, 0.7, 1.3,
    [{ name: 'g', factor: 1 }, { name: 'cup (185 g)', factor: 185 }], { tags: ['carb', 'ingredient'] }));
  F.push(per100('Spaghetti, cooked', 158, 5.8, 30.9, 0.9, 1.8,
    [{ name: 'g', factor: 1 }, { name: 'cup (140 g)', factor: 140 }, { name: 'plate (250 g)', factor: 250 }], { tags: ['carb'] }));
  F.push(per100('Spaghetti, dry', 371, 13, 74.7, 1.5, 3.2,
    [{ name: 'g', factor: 1 }, { name: 'oz', factor: G.oz }], { tags: ['carb', 'ingredient'] }));
  F.push(per100('Bread, white', 265, 9, 49, 3.2, 2.7,
    [{ name: 'slice (30 g)', factor: 30 }, { name: 'thick slice (40 g)', factor: 40 }, { name: 'g', factor: 1 }], { tags: ['carb'] }));
  F.push(per100('Bread, whole wheat', 247, 13, 41, 3.4, 7,
    [{ name: 'slice (32 g)', factor: 32 }, { name: 'g', factor: 1 }], { tags: ['carb'] }));
  F.push(per100('Sweet potato, cooked', 90, 2, 20.7, 0.2, 3.3,
    [{ name: 'g', factor: 1 }, { name: 'medium (150 g)', factor: 150 }], { tags: ['carb'] }));
  F.push(per100('Potato, boiled', 87, 1.9, 20.1, 0.1, 1.8,
    [{ name: 'g', factor: 1 }, { name: 'medium (170 g)', factor: 170 }], { tags: ['carb', 'ingredient'] }));
  F.push(per100('Plantain, fried (dodo)', 232, 1.5, 33, 11, 2.2,
    [{ name: 'g', factor: 1 }, { name: 'small serving (80 g)', factor: 80 }, { name: 'medium serving (130 g)', factor: 130 }],
    { tags: ['nigerian', 'carb'], estimate: true, range: '190–290 kcal / 100 g', note: 'Depends heavily on how much oil the plantain absorbs.' }));
  F.push(per100('Plantain, boiled', 116, 1.2, 31, 0.2, 2.3,
    [{ name: 'g', factor: 1 }, { name: 'medium serving (150 g)', factor: 150 }], { tags: ['nigerian', 'carb'] }));
  F.push(per100('Yam, boiled', 116, 1.5, 27.5, 0.1, 3.9,
    [{ name: 'g', factor: 1 }, { name: 'small serving (150 g)', factor: 150 }, { name: 'medium serving (250 g)', factor: 250 }], { tags: ['nigerian', 'carb'] }));
  F.push(per100('Beans (cooked, plain)', 127, 8.7, 22.8, 0.5, 6.4,
    [{ name: 'g', factor: 1 }, { name: 'cup (177 g)', factor: 177 }], { tags: ['nigerian', 'carb'] }));

  /* --- garri / eba : modelled on DRY GARRI, because that's the part that
         carries the calories and it's the part you can actually measure --- */
  F.push({
    id: 'lib_eba_garri', name: 'Eba (by dry garri used)',
    ref: { amount: 100, unit: 'g dry garri' },
    nutr: { calories: 357, protein: 1.5, carbs: 84.5, fat: 0.4, fiber: 2.0 },
    units: [
      { name: 'g dry garri', factor: 1 },
      { name: 'small portion (60 g garri)', factor: 60 },
      { name: 'medium portion (100 g garri)', factor: 100 },
      { name: 'large portion (150 g garri)', factor: 150 },
      { name: 'cup dry garri (130 g)', factor: 130 },
      { name: 'g cooked eba (~30% garri)', factor: 0.3 }
    ],
    estimate: true, lib: true, tags: ['nigerian', 'carb'],
    note: 'Eba is water + garri, so the calories come almost entirely from the dry garri. Measure the garri if you can — a "ball of eba" is not a fixed amount. The cooked-weight unit assumes garri roughly triples in weight with water; adjust if you mix yours thicker or looser.',
    range: 'A medium portion (100 g garri) ≈ 340–375 kcal'
  });
  F.push(per100('Garri, dry', 357, 1.5, 84.5, 0.4, 2.0,
    [{ name: 'g', factor: 1 }, { name: 'cup (130 g)', factor: 130 }], { tags: ['nigerian', 'ingredient'] }));
  F.push(per100('Pounded yam (prepared)', 130, 1.6, 31, 0.2, 2.5,
    [{ name: 'g', factor: 1 }, { name: 'small portion (150 g)', factor: 150 }, { name: 'medium portion (250 g)', factor: 250 }, { name: 'large portion (350 g)', factor: 350 }],
    { tags: ['nigerian', 'carb'], estimate: true, note: 'Depends on how much water is worked in.' }));
  F.push(per100('Fufu / semo (prepared)', 125, 1.0, 30, 0.2, 1.5,
    [{ name: 'g', factor: 1 }, { name: 'medium portion (250 g)', factor: 250 }], { tags: ['nigerian', 'carb'], estimate: true }));

  /* --- composite Nigerian dishes: estimates with ranges --- */
  F.push({
    id: 'lib_egusi', name: 'Egusi soup (generic estimate)',
    ref: { amount: 100, unit: 'g' },
    nutr: { calories: 160, protein: 7, carbs: 4, fat: 13, fiber: 1.5 },
    units: [{ name: 'g', factor: 1 }, { name: 'small ladle (120 g)', factor: 120 }, { name: 'medium serving (200 g)', factor: 200 }, { name: 'large serving (300 g)', factor: 300 }, { name: 'cup (240 g)', factor: 240 }],
    estimate: true, lib: true, tags: ['nigerian', 'soup'],
    range: '110–260 kcal / 100 g depending on oil and meat',
    note: 'Egusi varies enormously with palm oil, egusi quantity and the meat/fish in it. This generic value assumes a moderately oily pot. For anything close to accurate, build it once in the Recipe Builder — then it becomes exact for how YOU cook it.'
  });
  F.push({
    id: 'lib_stew', name: 'Nigerian stew (generic estimate)',
    ref: { amount: 100, unit: 'g' },
    nutr: { calories: 120, protein: 4, carbs: 5, fat: 9, fiber: 1.2 },
    units: [{ name: 'g', factor: 1 }, { name: 'ladle (100 g)', factor: 100 }, { name: 'generous serving (180 g)', factor: 180 }, { name: 'cup (240 g)', factor: 240 }],
    estimate: true, lib: true, tags: ['nigerian', 'soup'],
    range: '70–200 kcal / 100 g — oil is the swing factor',
    note: 'Tomato/pepper stew is mostly oil calories. If you bleach a lot of oil, the top end is realistic. Recipe Builder gives a real number.'
  });
  F.push({
    id: 'lib_jollof', name: 'Jollof rice (generic estimate)',
    ref: { amount: 100, unit: 'g' },
    nutr: { calories: 170, protein: 3.2, carbs: 26, fat: 6, fiber: 1.1 },
    units: [{ name: 'g', factor: 1 }, { name: 'cup (180 g)', factor: 180 }, { name: 'small plate (200 g)', factor: 200 }, { name: 'medium plate (300 g)', factor: 300 }, { name: 'large plate (400 g)', factor: 400 }],
    estimate: true, lib: true, tags: ['nigerian', 'carb'],
    range: '140–210 kcal / 100 g depending on oil',
    note: 'Party jollof with a heavier oil base sits at the top of this range. Build your own recipe for a real figure.'
  });
  F.push({
    id: 'lib_okra', name: 'Okra soup (generic estimate)',
    ref: { amount: 100, unit: 'g' },
    nutr: { calories: 110, protein: 6, carbs: 5, fat: 8, fiber: 2.2 },
    units: [{ name: 'g', factor: 1 }, { name: 'medium serving (200 g)', factor: 200 }, { name: 'cup (240 g)', factor: 240 }],
    estimate: true, lib: true, tags: ['nigerian', 'soup'], range: '70–180 kcal / 100 g'
  });
  F.push({
    id: 'lib_pepsoup', name: 'Pepper soup (generic estimate)',
    ref: { amount: 100, unit: 'g' },
    nutr: { calories: 65, protein: 8, carbs: 1.5, fat: 3.2, fiber: 0.3 },
    units: [{ name: 'g', factor: 1 }, { name: 'bowl (350 g)', factor: 350 }],
    estimate: true, lib: true, tags: ['nigerian', 'soup'], range: '40–110 kcal / 100 g'
  });

  /* --- dairy / drinks --- */
  F.push(per100('Whole milk (3.25%)', 61, 3.2, 4.8, 3.3, 0,
    [{ name: 'ml', factor: 1.03 }, { name: 'cup (244 ml)', factor: 244 }, { name: 'glass (250 ml)', factor: 250 }, { name: 'g', factor: 1 }], { tags: ['dairy'] }));
  F.push(per100('Semi-skimmed milk (2%)', 50, 3.3, 4.8, 2.0, 0,
    [{ name: 'ml', factor: 1.03 }, { name: 'cup (244 ml)', factor: 244 }], { tags: ['dairy'] }));
  F.push(per100('Evaporated milk (full cream)', 135, 6.8, 10, 7.6, 0,
    [{ name: 'tbsp', factor: 15 }, { name: 'ml', factor: 1.05 }, { name: 'g', factor: 1 }], { tags: ['dairy'] }));
  F.push({
    id: 'lib_hotchoc', name: 'Hot chocolate (cocoa + sugar, mixed)',
    ref: { amount: 1, unit: 'mug' },
    nutr: { calories: 150, protein: 5.5, carbs: 22, fat: 4.5, fiber: 1.5 },
    units: [{ name: 'mug (250 ml, made with milk)', factor: 1 }, { name: 'small cup (180 ml)', factor: 0.72 }],
    estimate: true, lib: true, tags: ['drink'],
    range: '90–260 kcal depending on sugar and milk',
    note: 'Assumes ~2 tsp cocoa/drink powder, 2 tsp sugar, made with whole milk. If you use water, or a sachet mix, log the sachet from its label instead.'
  });
  F.push(per100('Milo / chocolate drink powder', 400, 9, 74, 6, 4,
    [{ name: 'tbsp (15 g)', factor: 15 }, { name: 'heaped tbsp (22 g)', factor: 22 }, { name: 'g', factor: 1 }],
    { tags: ['drink'], estimate: true, note: 'Check your tin, brands differ.' }));
  F.push(per100('Sugar, granulated', 387, 0, 100, 0, 0,
    [{ name: 'tsp (4 g)', factor: 4 }, { name: 'tbsp (12.5 g)', factor: 12.5 }, { name: 'g', factor: 1 }], { tags: ['ingredient'] }));

  /* --- fats / nuts --- */
  F.push(per100('Peanuts, roasted', 587, 24.4, 21.5, 49.7, 8,
    [{ name: 'g', factor: 1 }, { name: 'small handful (20 g)', factor: 20 }, { name: 'handful (30 g)', factor: 30 }, { name: 'cup (146 g)', factor: 146 }, { name: 'oz', factor: G.oz }], { tags: ['snack'] }));
  F.push(per100('Peanut butter', 588, 25, 20, 50, 6,
    [{ name: 'tbsp (16 g)', factor: 16 }, { name: 'g', factor: 1 }], { tags: ['snack'] }));
  F.push(per100('Vegetable oil', 884, 0, 0, 100, 0,
    [{ name: 'tbsp (13.5 g)', factor: 13.5 }, { name: 'tsp (4.5 g)', factor: 4.5 }, { name: 'ml', factor: 0.92 }, { name: 'g', factor: 1 }], { tags: ['ingredient'] }));
  F.push(per100('Palm oil', 884, 0, 0, 100, 0,
    [{ name: 'tbsp (13.5 g)', factor: 13.5 }, { name: 'cooking spoon (30 g)', factor: 30 }, { name: 'ml', factor: 0.92 }, { name: 'g', factor: 1 }], { tags: ['ingredient', 'nigerian'] }));
  F.push(per100('Butter', 717, 0.85, 0.1, 81, 0,
    [{ name: 'tbsp (14 g)', factor: 14 }, { name: 'tsp (4.7 g)', factor: 4.7 }, { name: 'g', factor: 1 }], { tags: ['ingredient'] }));
  F.push(per100('Egusi (ground melon seed), dry', 590, 28, 9, 50, 4,
    [{ name: 'g', factor: 1 }, { name: 'cup (140 g)', factor: 140 }], { tags: ['ingredient', 'nigerian'], estimate: true }));
  F.push(per100('Cashew nuts', 574, 18, 30, 46, 3.3,
    [{ name: 'g', factor: 1 }, { name: 'handful (30 g)', factor: 30 }], { tags: ['snack'] }));
  F.push(per100('Avocado', 160, 2, 8.5, 14.7, 6.7,
    [{ name: 'g', factor: 1 }, { name: 'half (100 g)', factor: 100 }, { name: 'whole (200 g)', factor: 200 }], { tags: ['fat'] }));

  /* --- mashed potatoes (composite but common) --- */
  F.push({
    id: 'lib_mash', name: 'Mashed potatoes (with milk & butter)',
    ref: { amount: 100, unit: 'g' },
    nutr: { calories: 113, protein: 2.0, carbs: 16.9, fat: 4.2, fiber: 1.5 },
    units: [{ name: 'g', factor: 1 }, { name: 'cup (210 g)', factor: 210 }, { name: 'scoop (120 g)', factor: 120 }],
    estimate: true, lib: true, tags: ['carb'],
    range: '80–170 kcal / 100 g depending on butter/cream',
    note: 'Butter and milk drive this. Recipe Builder will pin it down for your version.'
  });

  /* --- vegetables --- */
  F.push(per100('Spinach, raw', 23, 2.9, 3.6, 0.4, 2.2,
    [{ name: 'g', factor: 1 }, { name: 'cup (30 g)', factor: 30 }, { name: 'handful (50 g)', factor: 50 }], { tags: ['veg', 'ingredient'] }));
  F.push(per100('Ugwu / pumpkin leaves, raw', 25, 2.9, 4, 0.4, 2.5,
    [{ name: 'g', factor: 1 }, { name: 'handful (50 g)', factor: 50 }], { tags: ['veg', 'nigerian', 'ingredient'], estimate: true }));
  F.push(per100('Tomato, raw', 18, 0.9, 3.9, 0.2, 1.2,
    [{ name: 'g', factor: 1 }, { name: 'medium (123 g)', factor: 123 }], { tags: ['veg', 'ingredient'] }));
  F.push(per100('Onion, raw', 40, 1.1, 9.3, 0.1, 1.7,
    [{ name: 'g', factor: 1 }, { name: 'medium (110 g)', factor: 110 }], { tags: ['veg', 'ingredient'] }));
  F.push(per100('Bell pepper / tatashe', 26, 1, 6, 0.2, 2.1,
    [{ name: 'g', factor: 1 }, { name: 'medium (120 g)', factor: 120 }], { tags: ['veg', 'ingredient'] }));
  F.push(per100('Broccoli, cooked', 35, 2.4, 7.2, 0.4, 3.3,
    [{ name: 'g', factor: 1 }, { name: 'cup (156 g)', factor: 156 }], { tags: ['veg'] }));
  F.push(per100('Mixed salad greens', 17, 1.4, 2.9, 0.2, 1.8,
    [{ name: 'g', factor: 1 }, { name: 'bowl (100 g)', factor: 100 }], { tags: ['veg'] }));
  F.push(per100('Banana', 89, 1.1, 22.8, 0.3, 2.6,
    [{ name: 'medium (118 g)', factor: 118 }, { name: 'large (136 g)', factor: 136 }, { name: 'g', factor: 1 }], { tags: ['fruit'] }));
  F.push(per100('Apple', 52, 0.3, 13.8, 0.2, 2.4,
    [{ name: 'medium (182 g)', factor: 182 }, { name: 'g', factor: 1 }], { tags: ['fruit'] }));
  F.push(per100('Seasoning cube (bouillon)', 240, 10, 22, 12, 0,
    [{ name: 'cube (4 g)', factor: 4 }, { name: 'g', factor: 1 }], { tags: ['ingredient'], estimate: true }));
  return F;
}

/* ============================================================
   TARGET CALCULATION  (Mifflin-St Jeor)
   ============================================================ */
const ACTIVITY = {
  sedentary: { mult: 1.2, label: 'Sedentary', desc: 'Desk job, little movement outside workouts' },
  light: { mult: 1.375, label: 'Lightly active', desc: 'Some walking, light daily activity' },
  moderate: { mult: 1.55, label: 'Moderately active', desc: 'On your feet a fair amount' },
  very: { mult: 1.725, label: 'Very active', desc: 'Physical job or lots of daily movement' }
};
const RATES = [
  { v: 0.25, label: 'Very gradual', desc: '~0.25 kg (0.5 lb) per week — easiest to sustain' },
  { v: 0.45, label: 'Steady (recommended)', desc: '~0.45 kg (1 lb) per week — good balance for keeping muscle' },
  { v: 0.7, label: 'Faster', desc: '~0.7 kg (1.5 lb) per week — harder to sustain, more muscle risk' }
];

function calcBMR(p) {
  // Mifflin-St Jeor: 10*kg + 6.25*cm - 5*age + (5 male / -161 female)
  const base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age;
  return base + (p.sex === 'male' ? 5 : -161);
}
function activityMultiplier(p) {
  const base = (ACTIVITY[p.activity] || ACTIVITY.light).mult;
  // small upward nudge for training days, capped so it can't run away
  const bump = clamp(num(p.exerciseDays, 0), 0, 7) * 0.011;
  return clamp(base + bump, 1.2, 1.95);
}
/* Absolute lower bound. Sustained intakes below this are very-low-calorie
   territory, which needs medical supervision — the app won't set one. */
const HARD_MIN_KCAL = 1200;

/* The reference weight protein is scaled from. Goal weight is used when it is
   lower than current weight, so a large amount of fat mass doesn't inflate the
   target — but it is bounded below at 80% of current weight so an aggressive
   goal weight can't quietly drag the protein floor down with it. */
function proteinRefKg(p) {
  const cur = num(p.weightKg, 0);
  const goal = num(p.goalWeightKg, 0);
  if (!goal || goal >= cur) return cur;
  return Math.max(goal, cur * 0.8);
}

function computeTargets(p) {
  const bmr = calcBMR(p);
  const tdee = bmr * activityMultiplier(p);
  const rate = num(p.rate, 0.45);                 // kg per week
  let deficit = (rate * 7700) / 7;                // ~7700 kcal per kg
  deficit = Math.min(deficit, tdee * 0.25);       // never more than 25% below maintenance
  let calories = tdee - deficit;

  // floors: don't go below ~1.1x BMR, and respect a sensible absolute floor
  const floor = Math.max(bmr * 1.1, p.sex === 'male' ? 1500 : 1200);
  calories = Math.max(calories, floor);

  // A manual target overrides the calculation, but never silently below the
  // hard minimum, and the caller is told when it sits under the computed floor.
  let manualBelowFloor = false, manualClamped = false;
  if (p.manualCalories) {
    const m = num(p.manualCalories, calories);
    if (m < HARD_MIN_KCAL) { calories = HARD_MIN_KCAL; manualClamped = true; manualBelowFloor = true; }
    else { calories = m; manualBelowFloor = m < floor * 0.95; }   // floor is an estimate, allow slack
  }

  // Protein is a floor, not a leftover: it is set from bodyweight first and the
  // remaining energy is divided between fat and carbs afterwards.
  const refKg = proteinRefKg(p);
  const a = allocateMacros(calories, refKg);
  const fiber = clamp((calories / 1000) * 14, 20, 45);
  return {
    bmr: r0(bmr), tdee: r0(tdee), deficit: r0(tdee - calories),
    calories: r0(calories), protein: a.protein, carbs: a.carbs, fat: a.fat,
    fiber: r0(fiber), custom: false,
    floor: r0(floor), proteinRefKg: r1(refKg), manualBelowFloor, manualClamped,
    proteinReduced: a.proteinReduced, incoherent: a.incoherent, minCoherentKcal: a.minCoherentKcal
  };
}

/* ------------------------------------------------------------
   MACRO ALLOCATION — a constrained budget, not a chain of clamps.

   The earlier version set protein, then fat, then took carbs as the
   remainder and finally forced carbs up to a floor of 40 g. When the
   calorie target was low relative to bodyweight that last step invented
   energy: a 120 kg reference at 1,200 kcal produced 150P/40C/72F, which
   is 1,408 kcal of macros against a 1,200 kcal budget — targets that
   cannot all be met at once.

   This allocator instead starts every macro at its floor, checks the
   floors actually fit inside the budget, and then spends the surplus in
   priority order. The result always sums to the calorie target.
   Priority: protein to 1.8 g/kg -> carbs to 50 g -> fat to its target
   -> everything left to carbs (this app's staples are carb-heavy).
   ------------------------------------------------------------ */
function allocateMacros(calories, refKg) {
  const P_WANT = 1.8 * refKg, P_MIN = 1.2 * refKg;
  const F_WANT = Math.max(0.8 * refKg, (calories * 0.2) / 9), F_MIN = 0.45 * refKg;
  const C_WANT = 50, C_MIN = 25;
  const floorE = P_MIN * 4 + F_MIN * 9 + C_MIN * 4;   // energy at all floors

  let protein, fat, carbs, incoherent = false;
  if (calories <= floorE) {
    // The target cannot cover even the minimums. Rather than manufacture
    // macros that exceed it, scale the floors down together and flag it so
    // the UI can say the calorie target is too low for this bodyweight.
    const s = calories / floorE;
    protein = P_MIN * s; fat = F_MIN * s; carbs = C_MIN * s;
    incoherent = true;
  } else {
    protein = P_MIN; fat = F_MIN; carbs = C_MIN;
    let rem = calories - floorE;
    const spend = (extraGrams, kcalPerGram) => {
      const cost = Math.max(extraGrams, 0) * kcalPerGram;
      const use = Math.min(rem, cost);
      rem -= use;
      return use / kcalPerGram;
    };
    protein += spend(P_WANT - P_MIN, 4);
    carbs += spend(C_WANT - C_MIN, 4);
    fat += spend(F_WANT - F_MIN, 9);
    carbs += rem / 4;                                  // remainder to carbs
  }

  // Round for display, then derive carbs from what is actually left so the
  // three macros still add up to the calorie target after rounding.
  const P = Math.max(0, r0(protein)), F = Math.max(0, r0(fat));
  const C = Math.max(0, r0((calories - P * 4 - F * 9) / 4));
  return {
    protein: P, fat: F, carbs: C,
    proteinReduced: protein < P_WANT - 0.5,
    incoherent, minCoherentKcal: Math.ceil(floorE)
  };
}

/* ============================================================
   STORAGE
   ============================================================ */
const defaultDB = () => ({
  version: 1,
  profile: null,
  targets: null,
  days: {},
  foods: starterFoods(),
  recipes: [],
  savedMeals: [],
  settings: { theme: 'system', units: 'metric' },
  usage: {},
  myPortions: {},               // foodId -> [{id,label,qty,unit,fav}]
  meta: { lastExport: null, backupSnoozeUntil: null }
});

/* ---------- personal portions ----------
   "My usual eba = 80 g dry garri". Keyed by food id so it follows the food,
   and kept out of the food object itself so restoring starter foods doesn't
   wipe them. */
function portionsFor(foodId) { return (DB.myPortions && DB.myPortions[foodId]) || []; }
function defaultPortion(foodId) {
  const list = portionsFor(foodId);
  return list.find(p => p.fav) || list[0] || null;
}
/* A food's units can change after a portion was saved — a recipe's servings
   were edited, or a custom food's unit list was rebuilt. makeEntry would
   silently fall back to the food's FIRST unit, which can be out by orders of
   magnitude (350 "servings" instead of 350 g). So a portion is only usable
   while the unit it was saved against still exists. */
function usablePortion(food, mp) {
  if (!food || !mp) return null;
  return (food.units || []).some(u => u.name === mp.unit) ? mp : null;
}
function defaultUsablePortion(food) {
  return food ? usablePortion(food, defaultPortion(food.id)) : null;
}
function addMyPortion(foodId, label, qty, unit) {
  if (!DB.myPortions) DB.myPortions = {};
  if (!DB.myPortions[foodId]) DB.myPortions[foodId] = [];
  const list = DB.myPortions[foodId];
  const existing = list.find(p => p.label.toLowerCase() === label.toLowerCase());
  if (existing) { existing.qty = qty; existing.unit = unit; return existing; }
  const p = { id: 'mp_' + uid(), label, qty, unit, fav: list.length === 0 };
  list.push(p);
  return p;
}
function removeMyPortion(foodId, portionId) {
  if (!DB.myPortions || !DB.myPortions[foodId]) return;
  DB.myPortions[foodId] = DB.myPortions[foodId].filter(p => p.id !== portionId);
  const left = DB.myPortions[foodId];
  if (left.length && !left.some(p => p.fav)) left[0].fav = true;
  if (!left.length) delete DB.myPortions[foodId];
}

let DB = defaultDB();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    DB = Object.assign(defaultDB(), parsed);
    DB.settings = Object.assign({ theme: 'system', units: 'metric' }, parsed.settings || {});
    // re-seed any library foods the user hasn't deleted/edited (forward compat)
    const have = new Set((DB.foods || []).map(f => f.id));
    starterFoods().forEach(f => { if (!have.has(f.id) && !(DB.deletedLib || []).includes(f.id)) DB.foods.push(f); });
    return true;
  } catch (e) { console.warn('load failed', e); return false; }
}
let saveTimer = null;
function save(immediate) {
  const doIt = () => {
    try { localStorage.setItem(KEY, JSON.stringify(DB)); }
    catch (e) { toast('Could not save — storage may be full'); console.error(e); }
  };
  if (immediate) { clearTimeout(saveTimer); doIt(); return; }
  clearTimeout(saveTimer); saveTimer = setTimeout(doIt, 120);
}

function day(k) {
  if (!DB.days[k]) DB.days[k] = { entries: [], weight: null };
  if (!DB.days[k].entries) DB.days[k].entries = [];
  return DB.days[k];
}
const dayOrNull = k => DB.days[k] || null;

/* ------------------------------------------------------------
   PER-DAY TARGET SNAPSHOTS

   Targets change as you lose weight. Without a snapshot every past day
   is re-judged against today's numbers, so recalculating in November
   could retroactively mark a compliant September day as "over target"
   and move your historical hit-rate — without a single food entry
   changing. A day therefore records the targets that applied to it.
   ------------------------------------------------------------ */
function snapshotTargets(t) {
  const o = {};
  MACROS.forEach(m => o[m] = t[m]);
  o.tdee = t.tdee;
  return o;
}
/* Called whenever a day gains its first entry. Today keeps following the
   live targets (see refreshTodayTargets) — a day is only frozen once it
   is in the past. */
function stampDay(k) {
  const d = day(k);
  if (!d.targets && DB.targets) d.targets = snapshotTargets(DB.targets);
  return d;
}
/* The targets a given date should be judged against. */
function targetsFor(k) {
  if (k === todayKey()) return DB.targets;
  const d = DB.days[k];
  return (d && d.targets) ? d.targets : DB.targets;
}
/* True when a past day predates snapshots and is being judged against
   current targets — the UI says so rather than implying false precision. */
function usesFallbackTargets(k) {
  if (k === todayKey()) return false;
  const d = DB.days[k];
  return !!(d && d.entries && d.entries.length && !d.targets);
}
/* Today's plan is whatever the targets are now, so keep its snapshot in
   step when they change. */
function refreshTodayTargets() {
  const k = todayKey();
  if (DB.days[k] && DB.days[k].targets && DB.targets) DB.days[k].targets = snapshotTargets(DB.targets);
}

/* ============================================================
   ENTRY MATH
   An entry is a self-contained snapshot so that later edits to a
   food definition never silently rewrite history.
   ============================================================ */
function makeEntry(food, qty, unitName, meal) {
  const u = (food.units || []).find(x => x.name === unitName) || food.units[0];
  return {
    id: uid(), meal,
    foodId: food.id || null,
    name: food.name,
    qty: num(qty, 1),
    unit: u.name,
    factor: num(u.factor, 1),
    refAmount: num(food.ref.amount, 100),
    refUnit: food.ref.unit,
    nutr: { ...food.nutr },
    estimate: !!food.estimate,
    kind: food.kind || 'food',
    at: Date.now()
  };
}
const entryMult = e => (num(e.qty, 0) * num(e.factor, 1)) / num(e.refAmount, 100);
function entryNutr(e) {
  const m = entryMult(e), o = zero();
  MACROS.forEach(k => { o[k] = (e.nutr[k] || 0) * m; });
  return o;
}
function dayTotals(k) {
  const d = dayOrNull(k);
  let t = zero();
  if (!d) return t;
  d.entries.forEach(e => { const n = entryNutr(e); MACROS.forEach(m => t[m] += n[m]); });
  return t;
}
function mealTotals(k, meal) {
  const d = dayOrNull(k); let t = zero();
  if (!d) return t;
  d.entries.filter(e => e.meal === meal).forEach(e => { const n = entryNutr(e); MACROS.forEach(m => t[m] += n[m]); });
  return t;
}
function remaining(k) {
  const t = dayTotals(k), g = targetsFor(k), o = {};
  MACROS.forEach(m => { o[m] = (g ? g[m] : 0) - t[m]; });
  return o;
}
function describeServing(e) {
  const q = num(e.qty, 0);
  const qs = (Math.abs(q - Math.round(q)) < 0.01 ? Math.round(q) : r1(q)).toString();
  // "100 g", "250 ml", "90 g dry garri" read naturally; "2 × large egg" needs the ×
  return /^(g|ml|oz|kg|lb)(\s|$)/.test(e.unit) ? `${qs} ${e.unit}` : `${qs} × ${e.unit}`;
}
function bumpUsage(foodId) {
  if (!foodId) return;
  DB.usage[foodId] = { n: (DB.usage[foodId]?.n || 0) + 1, last: Date.now() };
}

/* ---------- search across foods, recipes, saved meals ---------- */
function searchAll(q) {
  const s = q.trim().toLowerCase();
  const score = (name, item) => {
    const n = name.toLowerCase();
    if (!s) return (DB.usage[item.id]?.n || 0) * 2 + (item.favorite ? 50 : 0);
    if (n === s) return 1000;
    if (n.startsWith(s)) return 500 + (DB.usage[item.id]?.n || 0);
    if (n.includes(s)) return 200 + (DB.usage[item.id]?.n || 0);
    const words = n.split(/[^a-z0-9]+/);
    if (words.some(w => w.startsWith(s))) return 150;
    return -1;
  };
  const out = [];
  DB.savedMeals.forEach(m => { const sc = score(m.name, m); if (sc >= 0) out.push({ type: 'meal', item: m, sc: sc + 30 }); });
  DB.recipes.forEach(r => { const sc = score(r.name, r); if (sc >= 0) out.push({ type: 'recipe', item: r, sc: sc + 20 }); });
  DB.foods.forEach(f => {
    const sc = score(f.name, f);
    if (sc >= 0) out.push({ type: 'food', item: f, sc: sc + (f.custom ? 15 : 0) + (f.favorite ? 40 : 0) });
  });
  return out.sort((a, b) => b.sc - a.sc);
}
function recentFoods(limit = 12) {
  const ids = Object.entries(DB.usage).sort((a, b) => (b[1].last || 0) - (a[1].last || 0)).map(x => x[0]);
  const out = [];
  for (const id of ids) {
    const f = DB.foods.find(x => x.id === id) || DB.recipes.find(x => x.id === id);
    if (f) out.push(f);
    if (out.length >= limit) break;
  }
  return out;
}

/* ---------- recipes -> food-like object ---------- */
function recipeToFood(r) {
  const per = r.perServing || zero();
  const units = [{ name: 'serving', factor: 1 }];
  if (r.servingWeight) {
    units.push({ name: `g (1 serving = ${r0(r.servingWeight)} g)`, factor: 1 / r.servingWeight });
    units.push({ name: `half serving`, factor: 0.5 });
  } else {
    units.push({ name: 'half serving', factor: 0.5 });
  }
  return {
    id: r.id, name: r.name, ref: { amount: 1, unit: 'serving' }, nutr: per,
    units, estimate: !!r.estimate, kind: 'recipe', note: r.note
  };
}
function recipeTotals(r) {
  let t = zero();
  (r.ingredients || []).forEach(ing => { const n = entryNutr(ing); MACROS.forEach(m => t[m] += n[m]); });
  return t;
}
function recomputeRecipe(r) {
  const total = recipeTotals(r);
  const servings = Math.max(num(r.servings, 1), 0.01);
  r.total = total;
  r.perServing = {};
  MACROS.forEach(m => { r.perServing[m] = total[m] / servings; });
  if (r.totalWeight) r.servingWeight = num(r.totalWeight) / servings;
  r.estimate = (r.ingredients || []).some(i => i.estimate);
  return r;
}
