#!/bin/bash
# usage: tests/lighthouse.sh URL  (needs `npm i lighthouse` in /workspace/rv and playwright chromium)
CH=$(find ~/.cache/ms-playwright -name chrome -path "*chrome-linux*" -type f | head -1); cd /workspace/rv
npx lighthouse "$1" --chrome-path="$CH" --chrome-flags="--headless --no-sandbox" --only-categories=performance,accessibility,best-practices,seo --form-factor=mobile --output=json --output-path=/workspace/rv/lh.json --quiet
python3 -c "import json;d=json.load(open('/workspace/rv/lh.json'));print({k:round(v['score']*100) for k,v in d['categories'].items()})"
