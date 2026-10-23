#!/bin/bash
# Inflated commit+tree bytes (the blob:none deepen-1 reply for a commit) of a
# journal/v2 archive after P passes, each with pass.json, one segment and K
# retained entry files. Pass i starts at position i*E (E entries per pass).
set -eu
P=$1; K=$2; E=${3:-10}; R=$(mktemp -d); cd "$R"; git init -q .
mkdir -p journal/v2; echo '{}' > journal/v2/head.json
for i in $(seq 0 $((P-1))); do
  pos=$(printf '%012d' $((i*E))); g=$(echo "${pos:0:10}" | sed 's/../&\//g')
  d="journal/v2/passes/${g}${pos}"; mkdir -p "$d"; echo "$i" > "$d/pass.json"; echo "$i" > "$d/${pos}.jsonl"
  if [ "$K" -gt 0 ]; then mkdir -p "$d/entry"; for k in $(seq 1 "$K"); do echo "$i-$k" > "$d/entry/$(printf '%s' "$i-$k" | shasum -a 256 | cut -c1-64)"; done; fi
done
git add -A; GIT_AUTHOR_DATE='1700000000 +0000' GIT_COMMITTER_DATE='1700000000 +0000' git -c user.name=dap -c user.email=journal@dap.invalid commit -q -m 'journal'
c=$(git rev-parse HEAD)
inflated=$(git rev-list --objects --filter=blob:none "$c" | cut -d" " -f1 | git cat-file --batch-check="%(objecttype) %(objectsize)" | awk '{s+=$2; if ($1=="tree") t+=$2} END {print s" trees="t}')
objects=$(git rev-list --objects --filter=blob:none "$c" | wc -l | tr -d ' ')
echo "passes=$P retained/pass=$K entries/pass=$E objects=$objects inflated=$inflated"
rm -rf "$R"
