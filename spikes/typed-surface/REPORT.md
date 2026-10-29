# Typed authoring readability witness

This directory is the DX-TR design witness. The five definitions keep their
canonical data. No package is published, and the kernel stays unchanged.

[The design record](../../notes/2026-10-29-typed-surface-readability.md)
explains helper choices, source costs, reference reading, diagnostics, and
limits. [The vocabulary page](VOCABULARY.md) contains the six patterns.
The immutable original spike and historical report remain in
`../typed-surface-before/`; `baseline.json` records provenance.

Run these commands from the worktree root with installed dependencies:

```sh
node node_modules/typescript/bin/tsc -p spikes/typed-surface/tsconfig.json
node node_modules/vitest/vitest.mjs run --config spikes/typed-surface/vitest.config.ts
node spikes/typed-surface/measure.mjs
node spikes/typed-surface/vocabulary.mjs --check
node spikes/typed-surface/diagnose.mjs --out /private/tmp/dxtr-new-diagnostics
```

The diagnostic output directory must be new. Keep its generated sources,
configs, process receipts, streams, and result together. Times describe
fresh CLI processes with uncontrolled OS caches, not editor behavior.
The implementation record links the frozen acceptance captures.
