#!/bin/sh
# Assemble the static site in dist/ and write the Mapbox token from the
# MAPBOX_ACCESS_TOKEN environment variable, so the token never enters the repo.
set -eu

if [ -z "${MAPBOX_ACCESS_TOKEN:-}" ]; then
  echo "MAPBOX_ACCESS_TOKEN is not set" >&2
  exit 1
fi

rm -rf dist
mkdir -p dist
cp -R index.html css js data dist/
rm -f dist/js/mapbox-token.example.js
printf 'window.MAPBOX_ACCESS_TOKEN = "%s";\n' "$MAPBOX_ACCESS_TOKEN" > dist/js/mapbox-token.js
echo "Built dist/"
