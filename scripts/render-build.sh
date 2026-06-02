#!/usr/bin/env bash
set -euo pipefail

CACHE_DIR="${PUPPETEER_CACHE_DIR:-/opt/render/project/.puppeteer}"

rm -rf "${CACHE_DIR}" node_modules/.cache/puppeteer
export PUPPETEER_CACHE_DIR="${CACHE_DIR}"

npx puppeteer browsers install chrome
