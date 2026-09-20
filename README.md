# Macro Tracker

A single-file nutrition and macro tracker built for gradual fat loss while preserving muscle. No backend, no build step, no dependencies — one `index.html` you can open locally or host anywhere static.

Designed around a mix of Nigerian and Western foods, with honest handling of dishes whose calories genuinely vary.

## Using it

Open `index.html` in any modern browser, or visit the hosted version. First run asks for your details and calculates calorie and macro targets; everything after that is logging.

All data is stored in your browser's `localStorage` on that device. Nothing is sent anywhere — there is no server. Export a JSON backup from Settings periodically, because clearing site data or switching devices will lose it.

## What it does

**Targets.** Mifflin-St Jeor BMR and TDEE, with a deficit capped at 25% below maintenance. Protein is treated as a floor rather than a leftover: set from bodyweight first, with the remaining energy divided between fat and carbs. Macros are allocated as a constrained budget, so protein × 4 + carbs × 4 + fat × 9 always equals the calorie target rather than exceeding it.

**Macro semantics.** Not all macros are the same kind of number, and the UI reflects that:

| Macro | Kind | Exceeding it |
|---|---|---|
| Calories | Budget | The thing that matters — flagged |
| Protein, Fiber | Floor | A good outcome — shown as met |
| Carbs, Fat | Flexible allocation | Not meaningful on its own if calories hold |

**Nigerian foods.** Eba is modelled on the dry garri used, not on "a ball", because that is the part carrying the calories and the part you can measure. Egusi, stew, jollof, okra soup, pepper soup, dodo and pounded yam ship as generic values badged *Estimate* with a stated range and the reason they vary — never as false precision.

**Recipe builder.** Enter a pot once — ingredients, oil included — and divide by servings or by total cooked weight. After that the dish logs in one tap with real arithmetic instead of a guess.

**My portions.** Measure your usual eba once, save it as `80 g dry garri`, and it becomes a one-tap log and the assumed serving everywhere else.

**Meal preview.** Build a plate before eating it, see its effect on the day's totals and a plain verdict on whether it fits, then log it or discard it. Nothing is written until you commit.

**Per-day target snapshots.** Each day records the targets that applied to it. Recalculating in November never retroactively reclassifies a compliant September day or moves your historical hit-rate.

**Also:** daily coach with numeric observations, "what can I still eat" scored against all remaining macros, editable history calendar, weekly and monthly trends, weight tracking with a 7-day moving average, saved meals and favourites, nutrition-label entry, JSON backup and CSV export, and a real dark mode with a Light / Dark / System setting.

## Accuracy

Targets are estimates from a population formula; individual metabolisms vary by roughly ±10%. Single-food values are generic reference figures. Anything badged *Estimate* varies substantially with how it is cooked — build those in the recipe builder for real numbers. Every value is editable and your corrections are stored.

Fat loss comes from a sustained calorie deficit overall. No food or exercise targets fat from a particular part of the body, and nothing here is medical advice.

## Development

`index.html` is the deliverable and is assembled from the sources in `src/`:

```
src/part1_shell.html   markup, CSS, theming
src/part2_core.js      storage, nutrition maths, target engine, food library
src/part3_ui.js        router, setup, Today, coach, suggestions
src/part4_food.js      search, portion picker, custom foods, entry editing
src/part5_recipes.js   Foods screen, recipe builder
src/part6_history.js   history, progress, canvas charts
src/part7_settings.js  settings, theme, export/import, boot
src/part8_preview.js   meal preview, backup reminder
```

Rebuild with:

```sh
./build.sh
```

Edit the sources rather than `index.html` directly, or your changes will be overwritten on the next build.

## Browser support

Any current version of Safari, Chrome, Edge or Firefox, on desktop or mobile. Layout is mobile-first and tested from 320 px upward.

## Licence

MIT — see `LICENSE`.
