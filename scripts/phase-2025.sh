#!/usr/bin/env bash
# Accumulate the CC-MAIN-2025-08 shell survey to ~1M pages for the year-over-year
# comparison against the 2026 run. Mirrors the 2026 phase: batches of 8 WARC files,
# --accumulate (skips already-used files), Majestic ranks for tier analysis.
# Writes a SEPARATE output file so 2025 and 2026 can be compared side by side.
set -u
cd /home/paulkinlan/url-influence
OUT=results/cc-shell-survey-2025.json
CRAWL=CC-MAIN-2025-08
TARGET=1000000
batch=0
while true; do
  batch=$((batch+1))
  echo "[2025] starting batch $batch …"
  node src/cc-shell-confirm.mjs --crawl="$CRAWL" --out="$OUT" --accumulate \
    --files=8 --ranks=results/ranks.csv 2>&1 | tail -3
  pages=$(node -e "try{console.log(require('./$OUT').htmlPages||0)}catch(e){console.log(0)}")
  echo "[2025] batch $batch complete: $pages pages"
  if [ "$pages" -ge "$TARGET" ]; then
    echo "[2025] reached 1M: $pages pages"
    echo "[2025] FINAL: $pages pages"
    break
  fi
done
