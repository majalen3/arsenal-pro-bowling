#!/usr/bin/env bash
# usage: tests/lighthouse.sh URL
# Needs Playwright's Chromium (python -m playwright install chromium) and Node. Lighthouse is run via npx;
# set LH_DIR to a dir with `npm i lighthouse` to reuse an install (default: a temp dir, fetched on demand).
set -euo pipefail
URL="${1:?usage: tests/lighthouse.sh URL}"
CH="${CHROME_PATH:-$(find ~/.cache/ms-playwright -name chrome -path '*chrome-linux*' -type f | head -1)}"
LH_DIR="${LH_DIR:-$(mktemp -d)}"; OUT="${LH_OUT:-$LH_DIR/lh.json}"
cd "$LH_DIR"
npx --yes lighthouse "$URL" --chrome-path="$CH" --chrome-flags="--headless=new --no-sandbox --disable-gpu" --only-categories=performance,accessibility,best-practices,seo --form-factor=mobile --output=json --output-path="$OUT" --quiet
python3 -c "import json,sys;d=json.load(open(sys.argv[1]));print({k:round(v['score']*100) for k,v in d['categories'].items()})" "$OUT"
