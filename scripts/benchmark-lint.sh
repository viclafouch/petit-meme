#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_DIR"

CURRENT_BRANCH=$(git branch --show-current)
CURRENT_SHA=$(git rev-parse HEAD)
ESLINT_SHA="f70683a"

RUNS=5
WARMUP=2
RESULTS_FILE="benchmark-results.md"

echo "=== Lint & Format Benchmark ==="
echo "ESLint commit: $ESLINT_SHA"
echo "oxlint commit: $CURRENT_SHA"
echo "Runs: $RUNS | Warmup: $WARMUP"
echo ""

# --- Phase 1: ESLint + Prettier ---
echo ">>> Switching to ESLint version ($ESLINT_SHA)..."
git stash --include-untracked -q 2>/dev/null || true
git checkout "$ESLINT_SHA" -q

echo ">>> Installing dependencies..."
pnpm install --ignore-scripts -s

echo ">>> eslint (no fix)..."
hyperfine --runs "$RUNS" --warmup "$WARMUP" --export-json /tmp/bench-eslint.json 'pnpm exec eslint'

echo ">>> eslint --fix..."
hyperfine --runs "$RUNS" --warmup "$WARMUP" --export-json /tmp/bench-eslint-fix.json 'pnpm exec eslint --fix'

echo ">>> prettier --check..."
hyperfine --runs "$RUNS" --warmup "$WARMUP" --export-json /tmp/bench-prettier-check.json 'pnpm exec prettier --check "**/*.{ts,tsx,js,jsx}" --log-level silent'

echo ">>> prettier --write..."
hyperfine --runs "$RUNS" --warmup "$WARMUP" --export-json /tmp/bench-prettier-write.json 'pnpm exec prettier --write "**/*.{ts,tsx,js,jsx}" --log-level silent'

# --- Phase 2: oxlint + oxfmt ---
echo ""
echo ">>> Switching to oxlint version..."
git checkout "$CURRENT_BRANCH" -q

echo ">>> Installing dependencies..."
pnpm install --ignore-scripts -s

echo ">>> oxlint (no fix)..."
hyperfine --runs "$RUNS" --warmup "$WARMUP" --export-json /tmp/bench-oxlint.json 'pnpm exec oxlint'

echo ">>> oxlint --fix..."
hyperfine --runs "$RUNS" --warmup "$WARMUP" --export-json /tmp/bench-oxlint-fix.json 'pnpm exec oxlint --fix'

echo ">>> oxfmt --check..."
hyperfine --runs "$RUNS" --warmup "$WARMUP" --export-json /tmp/bench-oxfmt-check.json 'pnpm exec oxfmt --check .'

echo ">>> oxfmt (write)..."
hyperfine --runs "$RUNS" --warmup "$WARMUP" --export-json /tmp/bench-oxfmt-write.json 'pnpm exec oxfmt .'

# --- Phase 3: Results ---
echo ""
echo ">>> Building results..."

median_ms() {
  python3 -c "import json; d=json.load(open('$1')); print(f\"{d['results'][0]['median']*1000:.0f}\")"
}

speedup() {
  python3 -c "print(f'{$1 / $2:.1f}')"
}

ESLINT_MS=$(median_ms /tmp/bench-eslint.json)
ESLINT_FIX_MS=$(median_ms /tmp/bench-eslint-fix.json)
PRETTIER_CHECK_MS=$(median_ms /tmp/bench-prettier-check.json)
PRETTIER_WRITE_MS=$(median_ms /tmp/bench-prettier-write.json)

OXLINT_MS=$(median_ms /tmp/bench-oxlint.json)
OXLINT_FIX_MS=$(median_ms /tmp/bench-oxlint-fix.json)
OXFMT_CHECK_MS=$(median_ms /tmp/bench-oxfmt-check.json)
OXFMT_WRITE_MS=$(median_ms /tmp/bench-oxfmt-write.json)

LINT_SPEEDUP=$(speedup "$ESLINT_MS" "$OXLINT_MS")
LINT_FIX_SPEEDUP=$(speedup "$ESLINT_FIX_MS" "$OXLINT_FIX_MS")
FORMAT_CHECK_SPEEDUP=$(speedup "$PRETTIER_CHECK_MS" "$OXFMT_CHECK_MS")
FORMAT_WRITE_SPEEDUP=$(speedup "$PRETTIER_WRITE_MS" "$OXFMT_WRITE_MS")

FULL_ESLINT_MS=$((ESLINT_FIX_MS + PRETTIER_WRITE_MS))
FULL_OXLINT_MS=$((OXLINT_FIX_MS + OXFMT_WRITE_MS))
FULL_SPEEDUP=$(speedup "$FULL_ESLINT_MS" "$FULL_OXLINT_MS")

cat > "$RESULTS_FILE" <<RESULTS
# Benchmark: ESLint + Prettier vs oxlint + oxfmt

**Project:** Petit Meme — TanStack Start (React 19), ~293 files linted, ~377 files formatted
**Machine:** $(sysctl -n machdep.cpu.brand_string) ($(sysctl -n hw.ncpu) cores)
**Runs:** $RUNS (+ $WARMUP warmup)

## Results (median, ms)

| Task | ESLint + Prettier | oxlint + oxfmt | Speedup |
|------|------------------:|---------------:|--------:|
| Lint | ${ESLINT_MS}ms | ${OXLINT_MS}ms | **${LINT_SPEEDUP}x** |
| Lint + fix | ${ESLINT_FIX_MS}ms | ${OXLINT_FIX_MS}ms | **${LINT_FIX_SPEEDUP}x** |
| Format check | ${PRETTIER_CHECK_MS}ms | ${OXFMT_CHECK_MS}ms | **${FORMAT_CHECK_SPEEDUP}x** |
| Format write | ${PRETTIER_WRITE_MS}ms | ${OXFMT_WRITE_MS}ms | **${FORMAT_WRITE_SPEEDUP}x** |
| **Full pipeline** (fix + format) | **${FULL_ESLINT_MS}ms** | **${FULL_OXLINT_MS}ms** | **${FULL_SPEEDUP}x** |

## Versions

| Tool | Before | After |
|------|--------|-------|
| Linter | ESLint (via @viclafouch/eslint-config v5) | oxlint 1.57 (via @viclafouch/oxc-config v1.0.0-alpha.4) |
| Formatter | Prettier 3.8 | oxfmt 0.42 |

## Notes

- oxlint + oxfmt are written in Rust, multi-threaded
- ESLint + Prettier run in Node.js, single-threaded
RESULTS

echo ""
echo "=== Done! Results saved to $RESULTS_FILE ==="
echo ""
cat "$RESULTS_FILE"

git stash pop -q 2>/dev/null || true
