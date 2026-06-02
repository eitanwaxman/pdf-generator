#!/usr/bin/env bash
set -euo pipefail

CACHE_DIR="${PUPPETEER_CACHE_DIR:-/opt/render/project/.puppeteer}"

echo "[render-build] node=$(node -v) npm=$(npm -v)"
echo "[render-build] Using PUPPETEER_CACHE_DIR=${CACHE_DIR}"

rm -rf "${CACHE_DIR}" node_modules/.cache/puppeteer
export PUPPETEER_CACHE_DIR="${CACHE_DIR}"

RESOLVED="$(node -e "console.log(require('puppeteer').executablePath())")"
echo "[render-build] Puppeteer expects executablePath=${RESOLVED}"

# Install the exact Chrome build that this Puppeteer version resolves to, so the
# installed version always matches what executablePath() looks for at runtime.
VERSION="$(node -e 'const p=require("puppeteer").executablePath();const m=p.match(/-(\d+\.\d+\.\d+\.\d+)/);console.log(m?m[1]:"")')"

install_chrome() {
  if [ -n "${VERSION}" ]; then
    echo "[render-build] Installing chrome@${VERSION}"
    npx --yes puppeteer browsers install "chrome@${VERSION}"
  else
    echo "[render-build] Could not parse version; installing chrome (latest matching)"
    npx --yes puppeteer browsers install chrome
  fi
}

# Retry once if the extraction lands incomplete (no chrome binary at the resolved path).
for attempt in 1 2; do
  echo "[render-build] Install attempt ${attempt}"
  rm -rf "${CACHE_DIR}/chrome"
  install_chrome
  if [ -f "${RESOLVED}" ]; then
    break
  fi
  echo "[render-build] Attempt ${attempt}: ${RESOLVED} missing after install"
done

echo "[render-build] Contents of ${CACHE_DIR}:"
ls -laR "${CACHE_DIR}" || true

if [ ! -f "${RESOLVED}" ]; then
  echo "[render-build] ERROR: Chrome was not installed at ${RESOLVED}" >&2
  exit 1
fi

echo "[render-build] Chrome installed successfully at ${RESOLVED}"
