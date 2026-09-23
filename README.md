# Macro Tracker

A nutrition and macro tracker built for gradual fat loss while preserving muscle. No backend, no dependencies, no framework — the whole app is one `index.html` you can open locally or host anywhere static, plus a small service worker so it also works offline.

Designed around a mix of Nigerian and Western foods, with honest handling of dishes whose calories genuinely vary.

## Using it

Open `index.html` in any modern browser, or visit the hosted version. First run asks for your details and calculates calorie and macro targets; everything after that is logging.

On a phone, add it to your Home Screen: it then runs full-screen, keeps its own storage, and works with no signal. Updates arrive on their own — the app tells you when a new version is ready rather than reloading under you.

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

**Copying.** Copy a whole day, or one meal from another day into any meal today — last night's dinner becomes today's lunch in two taps.

**Is the estimate right?** Progress compares what you logged against what the scale actually did, and inverts the difference into an implied maintenance figure derived from your own data rather than a population formula. It declines to answer until there is enough data to mean anything, and says plainly that under-logging is as likely an explanation as a wrong estimate.

**Recalculation prompts.** Maintenance falls as you lose weight. When your 7-day average has drifted 2.5 kg from the weight your targets were built on, the app says so and offers to recalculate from the new figure.

**Offline.** A service worker precaches the app, so the Home Screen icon opens instantly with no network — which is where a food tracker is usually needed.

**Also:** daily coach with numeric observations, "what can I still eat" scored against all remaining macros, editable history calendar, weekly and monthly trends, weight tracking with a 7-day moving average, saved meals and favourites, personal portions, nutrition-label entry, deletable foods, JSON backup (via the iOS share sheet on a phone) and CSV export, and a real dark mode with a Light / Dark / System setting.

## Accuracy

Targets are estimates from a population formula; individual metabolisms vary by roughly ±10%. Single-food values are generic reference figures. Anything badged *Estimate* varies substantially with how it is cooked — build those in the recipe builder for real numbers. Every value is editable and your corrections are stored.

Fat loss comes from a sustained calorie deficit overall. No food or exercise targets fat from a particular part of the body, and nothing here is medical advice.

## Development

`index.html` is the deliverable and is assembled from the sources in `src/`:

```
src/part1_shell.html   markup, CSS, theming
src/part2_core.js      storage, nutrition maths, target engine, food library
src/part3_ui.js        router, setup, Today, coach, suggestions
src/part4_food.js      search, portion picker, custom foods, entry editing, copying
src/part5_recipes.js   Foods screen, recipe builder
src/part6_history.js   history, progress, canvas charts, deficit-vs-actual
src/part7_settings.js  settings, theme, export/import, service worker, boot
src/part8_preview.js   meal preview, backup and recalculate reminders
src/sw.js              service worker template (VERSION is stamped at build)
src/make_icons.py      regenerates the PNG icons, no image library needed
```

Rebuild with (needs Node for the syntax check, and Python 3):

```sh
./build.sh
```

That writes `index.html` and `sw.js`, stamping the worker with a hash of what
it serves — which is what makes browsers notice an update at all.

Edit the sources rather than `index.html` directly, or your changes will be overwritten on the next build.

The deployed site is `index.html`, `sw.js`, `manifest.webmanifest` and the three
`icon-*.png` files. The service worker needs HTTPS (or localhost); opened
straight from disk the app still works, just without offline caching.

## Browser support

Any current version of Safari, Chrome, Edge or Firefox, on desktop or mobile. Layout is mobile-first and tested from 320 px upward.

## Licence

MIT — see `LICENSE`.
