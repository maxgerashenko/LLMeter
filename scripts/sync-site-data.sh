#!/usr/bin/env bash
# Copy data files the website reads into docs/data/.
# GitHub Pages serves only docs/, so the site cannot read ../data directly.
# Run this after changing anything in data/, and commit both copies.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$root/docs/data"
cp "$root"/data/*.csv "$root/docs/data/"
echo "Copied data/*.csv to docs/data/"
