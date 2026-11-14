# NF5 retained-identifier apply plan

This plan has not run. Planner signing END and root's explicit grant must
precede the next invocation. The supervisor contains the current candidate
and main fences. Root must review any changed fence before granting it.

The proposed outer command is:

```sh
python3 /tmp/artroom-nf5-apply-supervisor-20261114.py
```

It creates a fresh external `2026-11-14-nf5-identifiers-apply-attempt1`
directory. It verifies the original read-only evidence, checksums and
retention receipt, then copies exactly these seven retained files into
`comparison-copy`: `comparison.json`, and the original and candidate JSON
for Grow, Lending and Counter. It verifies every copied byte against the
sealed source. It does not regenerate any application or packet.

The only child command is:

```sh
/opt/homebrew/bin/node /tmp/artroom-nf5-execution-plan-20261114/refresh-identifiers.mjs apply \
  /Users/hughpyle/play/artroom/.builder-worktrees/nf5-browser-custody-20261113 \
  /Users/hughpyle/play/artroom-evidence/2026-11-14-nf5-identifiers-apply-attempt1/comparison-copy \
  37c1092133c2829a16688f1c595bb0983fc03b70 \
  dd944b1a3736177809d91cd3e4a8596c0d376095
```

Apply uses no `--import` loader. The existing wrapper's apply branch reads
the comparison and validates all three original and candidate hashes. It
writes only the Lending and Counter identifier files and records
`applied.json` in the fresh copy. Grow stays byte-identical.

The supervisor retains raw output, timing, process inventories, power
samples, the complete tracked-source and dependency snapshots, the seven
copy hashes, and the exact Git diff. Its successful mutation fence requires
exactly two changed tracked paths, both equal to the retained candidate
bytes. Every other tracked byte, tool, root and workspace dependency view,
main fence, and original sealed evidence hash must remain equal. No staged
or untracked file may appear. Power monitoring and the terminal sample must
pass before the verdict. Failure stops without retry or rollback.

After a successful result, review the retained two-path diff. The planned
source commands stage exactly those two files:

```sh
git add -- examples/lending/release-identifiers.json apps/counter/release-identifiers.json
git commit -m 'Refresh Lending and Counter presentation identifiers'
git push origin builder/nf5-browser-custody-20261113
```

Record the actual new head and tree. Do not infer either value here. Seal
the apply evidence with hashes, read-only modes, and at least 30 days of
retention. Leave the original comparison evidence untouched.

Normal R1 reproduction needs a separate root grant after that commit:

```sh
node node_modules/vitest/vitest.mjs run --config vitest.plain.config.ts \
  --project cli packages/cli/test/application-release-reproduction.test.ts
```

Run that whole owner once. Its single source-declared case compares all
three applications through the canonical preparation path. Do not run an
unchanged creation harness, a known-stale reproduction, or another pack
comparison. Prepare the larger focused C ledger after reproduction.

This plan grants no copying, apply, signing, compiler, test, browser,
model, control, gate, or deployment execution.
