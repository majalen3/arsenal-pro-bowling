#!/bin/bash
# usage: tests/run_all.sh BASE_URL [API_URL] ; needs pwenv. Prints only failures + summary.
B=${1:-https://majalen3.github.io/arsenal-pro-bowling/}; A=${2:-http://127.0.0.1:1}
source /workspace/pwenv/bin/activate; cd "$(dirname "$0")/.."
python tests/review.py "$B" "$A" 2>&1 | grep -E "^FAIL|SUMMARY|Error|Traceback"
for t in test_ui test_arsenal; do python /workspace/$t.py "$B" run 2>&1 | grep -E "^FAIL|FAILS|Error"; done
