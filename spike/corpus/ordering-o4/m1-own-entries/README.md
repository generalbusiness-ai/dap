# Scope own-entry regression corpus

This component addresses nonblocking finding 2 in O4 review `66effd75` under the original O4 request. It covers the destination facts copy and Scope genesis package lookup only. The independent ordering-fault and constructor-lease repairs have separate sources and measurements.

The two `l1-*.mjs` scripts are unchanged copies of the checker's probes. `before.json` identifies their exact runtime source, `15b660caaf06e1ea4698e83a94e3717cfd48572b`, and the four captured outputs. Both scripts report findings and exit 0; that exit status does not mean their observed invariants passed. On both stores, the destination state lost the own `__proto__` fact, and the three inherited package names reached a generic `Error` instead of profile validation. The residual script also reports the unchanged trusted-capability Club standing limitation; no Club code was changed or claimed repaired.

Reproduce those historical observations in a checkout of the recorded source:

```sh
WT=/path/to/15b660ca-checkout node spike/corpus/ordering-o4/m1-own-entries/l1-facts-proto2.mjs memory
WT=/path/to/15b660ca-checkout node spike/corpus/ordering-o4/m1-own-entries/l1-residual.mjs sqlite
```

The scripts are present in the later repair commit, so run them by their path in that checkout while pointing `WT` at the historical checkout. Each accepts either store name.

`run1/` records source `8e854c26b30de7a376dc71f5e0e8bf24160aaefa`, its 37 source/configuration blob hashes, package identities, actual command exits, raw output, and eight observation files. The focused command passed 11 tests: six new Scope checks and five retained property-name regressions. Typecheck exited 0. These were the only validation runs for this component; no campaign or full noncampaign suite was run.

From `spike/` at the measured repair source:

```sh
DAP_O4_RECORD_DIR=/tmp/fresh-own-entry-observations node --test test/ordering-scope-own-entries.test.ts test/ordering-scope-property-names.test.ts
npm run typecheck
```

The fact tests use both scalar and object-valued own `__proto__` data, preserve later-source overwrite behavior, and assert no inherited fact or prototype mutation. Object-valued facts reproduce the existing accepted genesis surface; they are not a new schema promise. These altered exports still fail the independent source-binding check, leave rights dormant, and keep the same failed activation receipt after restart. The valid unchanged lifecycle activates once and spends both rights. Package tests reject inherited built-ins and an inherited actual descriptor before genesis is stored, then install an own entry with the same name and verify effect, cold replay, and exact retry. Names are not blacklisted.

Historical output and identities remain pinned to their sources. This component does not resolve the other findings, change the public rule or manifest, or constitute independent approval of O4.
