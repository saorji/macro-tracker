#!/bin/sh
# Assemble src/ into the single-file index.html deliverable, then stamp the
# service worker with a hash of what it serves — a build that changes the app
# must change sw.js, or the browser has no reason to look for an update.
set -e
cd "$(dirname "$0")"
cat src/part2_core.js src/part3_ui.js src/part4_food.js src/part5_recipes.js \
    src/part6_history.js src/part8_preview.js src/part7_settings.js > /tmp/mt_bundle.js
node --check /tmp/mt_bundle.js
node --check src/sw.js
python3 - <<'PY'
shell = open('src/part1_shell.html').read()
bundle = open('/tmp/mt_bundle.js').read()
marker = '/* ===== APP CODE ===== */'
assert marker in shell, 'marker missing from src/part1_shell.html'
open('index.html', 'w').write(shell.replace(marker, bundle))
PY
rm -f /tmp/mt_bundle.js

# icons are generated once and committed; regenerate only if any are missing
if [ ! -f icon-180.png ] || [ ! -f icon-192.png ] || [ ! -f icon-512.png ]; then
  python3 src/make_icons.py
fi

python3 - <<'PY'
import hashlib
parts = [open(f, 'rb').read() for f in ('index.html', 'manifest.webmanifest',
                                        'icon-180.png', 'icon-192.png', 'icon-512.png')]
version = hashlib.sha256(b''.join(parts)).hexdigest()[:12]
sw = open('src/sw.js').read()
assert '__VERSION__' in sw, 'version placeholder missing from src/sw.js'
open('sw.js', 'w').write(sw.replace('__VERSION__', version))
print('stamped sw.js with version ' + version)
PY
echo "built index.html ($(wc -c < index.html) bytes)"
