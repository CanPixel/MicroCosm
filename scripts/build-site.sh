#!/usr/bin/env bash
# Builds the Firebase Hosting site:
#   /            the current game (this checkout)
#   /prototype/  the original prototype (the `prototype` branch)
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
ref="${PROTOTYPE_REF:-origin/prototype}"
work="$(mktemp -d)"
trap 'git -C "$root" worktree remove --force "$work/prototype" >/dev/null 2>&1 || true; rm -rf "$work"' EXIT

cd "$root"
bun run build

git fetch --quiet origin prototype || true
git worktree add --detach "$work/prototype" "$ref" >/dev/null
(
  cd "$work/prototype"
  bun install --frozen-lockfile
  bunx vite build --base=/prototype/ --outDir "$root/dist/prototype" --emptyOutDir
)

# The prototype references a few images by absolute URL from component code,
# which Vite does not rebase. Serve those at the root paths it expects.
mkdir -p dist/assets
cp "$work/prototype/public/assets/"*.webp dist/assets/ 2>/dev/null || true

echo "Site ready in dist/ (prototype under dist/prototype/)"
