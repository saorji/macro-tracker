#!/bin/sh
# Assemble src/ into the single-file index.html deliverable.
set -e
cd "$(dirname "$0")"
cat src/part2_core.js src/part3_ui.js src/part4_food.js src/part5_recipes.js \
    src/part6_history.js src/part8_preview.js src/part7_settings.js > /tmp/mt_bundle.js
node --check /tmp/mt_bundle.js
python3 - <<'PY'
shell = open('src/part1_shell.html').read()
bundle = open('/tmp/mt_bundle.js').read()
marker = '/* ===== APP CODE ===== */'
assert marker in shell, 'marker missing from src/part1_shell.html'
open('index.html', 'w').write(shell.replace(marker, bundle))
PY
rm -f /tmp/mt_bundle.js
echo "built index.html ($(wc -c < index.html) bytes)"
