# O4 Scope own-entry component ledger

Request: `git:sha1:e15db5d98cd3510f3f20f06b3d0e1ec58379d2b1#git:sha1:1b6384e27d6dbfd5a22da3330378776d32ad23ab`.
Promise: `18ba74b01cbbea27e2d8c18b063ff482428c95aa`. Review: `66effd75`; ratification: `919baa74`; adoption: `739b7bf7`.

This bounded component fixes two own-property operations from the review's nonblocking finding 2. It does not implement the separately owned ordering-fault or constructor-lease repairs. The shared profile, lifecycle manifest, Club experiment, and main O4 ledger are unchanged here.

## Before repair

The starting source is exact `15b660caaf06e1ea4698e83a94e3717cfd48572b`. The [corpus](../corpus/ordering-o4/m1-own-entries/README.md) retains the unchanged checker scripts and original outputs from running each on memory and SQLite. The scripts exit 0 because they print observations, not because the observed invariants passed.

A transition source had an own object-valued `__proto__` fact. Both real releases remained effective, but the destination's facts lost that key when `Object.assign` invoked the prototype setter. The actual reproduced activation was ineffective with `source_binding_mismatch`; this component does not claim a reproduced create-time TypeError. The package probe showed `constructor`, `__proto__`, and `toString` passing the Scope shape check and then throwing generic `Error: genesis binds unknown package …`, with zero stored entries. The residual script's Club observation remains a retained limitation, not a new repair target.

## Repair and measured source

Source commit: `8e854c26b30de7a376dc71f5e0e8bf24160aaefa`.

The sole production file changed is `spike/src/scope.ts`. Destination fact merging now copies each own enumerable entry through the existing `setOwn` helper. It preserves ordinary object prototypes, own property-name data, and the existing later-source overwrite order. Scope genesis binding validation uses the existing `own` helper for the package registry; an inherited value is absent. Legitimate own entries remain valid, including names also present on `Object.prototype`. No descriptor declaration, role policy, grant rule, or accepted source-proof condition changes.

The focused run passed **11/11 tests**, with zero failures, skips, or TODOs; process exit 0. Six are new checks, three per backend. Five are the existing L1 property-name regressions. Whole-tree typecheck exited 0. [The result record](../corpus/ordering-o4/m1-own-entries/run1/result.json) gives the exact commands and durations; adjacent files retain raw output, 37 source/configuration blob hashes, identities, and eight actual observations. Corresponding memory/SQLite observation files are byte-identical.

The new tests cover:

- Two altered fact cases per store: scalar and object-valued own `__proto__`, other property-name facts, later-source duplicate-key overwrite, unchanged ordinary prototype, exact signed genesis, cold state, source-binding rejection, dormant rights, and failed activation retry.
- Five package names per store: four inherited built-ins plus an inherited actual descriptor. Every missing own entry gets `ScopeProfileError` / `invalid_genesis` before storage. Adding an own entry with the same name then permits genesis, effective right exercise, cold replay, and stable exact retry.
- The complete unchanged lifecycle on both stores: one activation, delivery and fulfilment, all four scopes cold reopened, and successful activation retried without changing the final state.

The retained L1 checks additionally exercise ordinary invalid kinds/roles/packages, positive property-name model and kind declarations, resolutions, and source transfer. No full noncampaign suite or campaign was run here; root owns the combined validation.

## Identity and limits

At this component's source:

| Identity | Value |
| --- | --- |
| Scope implementation | `sha256:99a856227a4c953826da5f56b4c276b4c0f61a0d997248c7103a912ae7892900` |
| Scope package | `sha256:58d944e9d74cb409604246d1e4dab18eaa117e4253f8ee2f0403f3a40aefbb0e` |
| Sale package, unchanged | `sha256:cd32a3f52b025b04a885280cebf3078689d505a67d2168dcf6c5f899a51e8a85` |
| Inspection package, unchanged | `sha256:18a886c149b383b8630836307195c1a89b90c463e7e32df6e0663b5d4ecc3030` |
| Public rule, unchanged | `sha256:9e9bcbdd74fe244fb63c5e339256ab508b2b3251d2e8fa642b3309cd1f1049e6` |
| Lifecycle manifest, unchanged | `sha256:92ad0023e387cd4a6305d074ab99f7a29cbcc1699cd88b8dcf439a446ef58828` |

The Scope implementation and package ids change because they pin the source change. This is not a migration of old signed genesis or evidence. Combined repair identities must be generated at the later integrated source.

The accepted facts schema is not broadened or narrowed by this repair. Keeping a claimed fact safely does not authenticate it: altered source exports still cannot activate rights. This component makes no new general merge or arbitrary-package-security claim. The trusted-capability Club standing behavior, proof-size/depth limits, fault-boundary findings, and other declared O4 limitations are not repaired here. Independent O4 approval remains pending.
