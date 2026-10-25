#!/bin/sh
cd "$(dirname "$0")" || exit 1
if command -v node >/dev/null 2>&1; then
  echo 'MARIE LOOP STUDIO: http://localhost:4173/'
  node server.mjs
elif command -v python3 >/dev/null 2>&1; then
  echo 'MARIE LOOP STUDIO: http://localhost:4173/'
  python3 -m http.server 4173 --bind 127.0.0.1
else
  echo 'Node.js 또는 Python3가 필요합니다.' >&2
  exit 1
fi
