#!/bin/bash
# cache-bust app.js in index.html from its content hash; run before every commit that touches app.js
cd "$(dirname "$0")/.."; H=$(md5sum app.js | cut -c1-8)
sed -i "s#app.js?v=[A-Za-z0-9]*#app.js?v=$H#" index.html; echo "app.js?v=$H"
