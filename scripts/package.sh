#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

pnpm build:all
rm -rf artifacts
mkdir -p artifacts

for target in chromium firefox safari; do
  rm -rf "dist/$target/.vite"
  if command -v zip >/dev/null 2>&1; then
    (cd "dist/$target" && zip -qr "../../artifacts/octarine-web-clipper-$target.zip" . -x '*.map')
  else
    (cd "dist/$target" && python3 -m zipfile -c "../../artifacts/octarine-web-clipper-$target.zip" ./*)
  fi
done

git archive --format=zip --output="artifacts/octarine-web-clipper-source.zip" HEAD

printf 'Created store packages in artifacts/\n'
