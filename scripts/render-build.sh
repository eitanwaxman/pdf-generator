#!/usr/bin/env bash
set -euo pipefail

CACHE_DIR="${PUPPETEER_CACHE_DIR:-/opt/render/project/.puppeteer}"

echo "[render-build] Using PUPPETEER_CACHE_DIR=${CACHE_DIR}"

rm -rf "${CACHE_DIR}" node_modules/.cache/puppeteer
export PUPPETEER_CACHE_DIR="${CACHE_DIR}"

npx puppeteer browsers install chrome

# Verify the binary actually landed where Puppeteer will look at runtime.
RESOLVED="$(node -e "console.log(require('puppeteer').executablePath())")"
echo "[render-build] Puppeteer executablePath=${RESOLVED}"

if [ ! -f "${RESOLVED}" ]; then
  echo "[render-build] ERROR: Chrome was not installed at ${RESOLVED}" >&2
  exit 1
fi

echo "[render-build] Chrome installed successfully."
