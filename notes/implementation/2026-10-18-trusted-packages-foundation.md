# M1 package and browser foundation

This head supplies local `dap pack` and `dap check`, the portable signed
application format, and browser primitives used by Counter and Lending.
It makes the standard check path available for G0's declarative scenarios.
Foundation request `637a7d77` is a separate Source child. The broader
developer request `4735dfee` and M1 parent `eca1c7ee` remain open.

The candidate combines code checkpoint
`efdfd819ab362104f196503d872700525f1808d4` with reviewed Main
`bb3d3062abce958f03f9c9aba7335c4891880940`. That refresh adds three Main
documents without changing executable code. Both existing public asset sets
are rebuilt from the combined source. The longer
[developer checkpoint record](2026-10-18-trusted-packages-developer.md)
retains the focused checks, failed attempts, controls and source history.
Its closing statement about assets describes the earlier checkpoint.
This foundation now includes the rebuilt assets.

## Local package commands

`packages/client/src/application-package.ts` supplies the signed package
codec. Semantic, presentation and release identities have separate domains.
The codec checks exact reachable definition closure, declared requirements,
default roles, asset paths and signatures. It owns caller inputs and applies
finite byte, count and depth limits before expensive decoding or signing.
These limits describe the package format, not adopted host quotas.

`packages/cli/src/application-files.ts` reads bounded regular files below
the selected directory. It rejects symlinks and detects ordinary concurrent
edits. `dap pack [directory]` validates native declarations, uses an existing
named publisher key and creates a new output file without replacing one.
It does not generate a key or contact a room.

`dap check [directory]` reads `dap.application.json` and its listed data-only
scenarios without opening operator custody. The local runner uses native
Core, Node SQLite transactions, alarms and replay. Every scenario must have
assertions and replay consistently. Local commands require Node's unflagged
SQLite support: Node 22.13+, 23.4+, or 24+. Evidence here uses Node 26.12.
Other CLI commands retain their existing Node requirement.

`application-scenarios.ts` provides explicit TEST actors, actions and optional
principal relationships. Signing alone produces no entry or accepted fact.
Retry submits the original envelope, including its revision and expiry.
Named facts come only from accepted receipts. A scenario may select a
definition inside the verified closure as its local root.

Local authority, directory answers and cross-scope delivery remain labelled
stand-ins. Replay trusts those grants as recorded. A selected local root is
not a witnessed child creation. Scenario-owner records are separately
labelled records outside native journals and replay. Check does not admit
an installed package, audit screen code or perform external effects.

## Browser primitives and existing applications

The client exports stored-key signing, native non-extractable key generation,
IndexedDB slots with Web Locks, retained-request custody, invitation joining,
and the strict attempt journal and dispatcher. Signing owns its bytes and
checks the public-key binding. Storage owns values before awaiting a write.
Joining binds the original invitation, membership version, signed request,
accepted receipt and resulting session member.

Browsers admit stored keys through native metadata getters. Workerd lacks
those getters and exposes mutable own metadata. Its fallback admits only
the exact private key returned by this module's non-extractable generation
call, tracked privately by object identity. Restored and supplied keys still
require native getters. The fallback does not trust copied metadata.
Lending's joining adapter takes an explicit origin. Its page supplies the
browser origin, while the native scope witness supplies its TEST service.

Counter fixes its own allowed acts and preserves its version 2 journal,
epoch store, credentials, audio markers and context identity. Check and
unknown attempts only read. A committed prepared attempt can dispatch once.
Lending preserves its own retained-request format, slot names, discovery
and pinned membership version. The two applications do not reinterpret
each other's stored records or silently upgrade native cohorts.

Existing host routes, application pins and historical declarations remain.
The rebuilt assets use the extracted code on those routes. Native judging,
replay, authorization and enrollment are unchanged. M1 trusts screen authors
as operators. This head does not isolate arbitrary application code.

## Review evidence

Focused checks and one-line controls are recorded beside each checkpoint in
the developer record. They include package identities and signatures, file
bounds, real SQLite scenarios, deferred requests, accepted facts, TEST
principals, joining, browser keys, and custody. Counter's owning Node suite
passes 55 cases. Later dispatcher controls run only their selected cases.

Temporary browser fixtures use actual WebCrypto, IndexedDB and Web Locks.
They check reload, two-tab serialization, exact retained requests, read-only
Check, invitation recovery and Counter's stale epoch fence. Screenshots and
console checks cover desktop and mobile sizes. Backend answers, transport,
speech and notification counters are scripted. These are primitive witnesses,
not production-screen, provider or native-enrollment acceptance.

The Browser plugin is absent. Fixtures use cached Playwright 1.63.0 and
Chromium 153.0.8010.12 with fresh temporary profiles. No package was installed.
Retained evidence inventories are:

- `/tmp/artroom-m1-browser-slots-20261018/proof.json`
- `/tmp/artroom-m1-browser-joining-20261018/proof.json`
- `/tmp/artroom-m1-counter-epoch-20261018/proof.json`

The private dependency view has thirteen local workspace links and 106
verified installed versions. The only lock change moves the existing scope
dependency from development to runtime for the CLI. Versions, resolutions,
integrities and other package records are unchanged. The foundation audit is
`/tmp/artroom-m1-foundation-dependency-view-20261018.json`. Nothing was fetched
or installed. Both asset builders pass. Their regeneration commands are
`node apps/counter/scripts/assets.mjs` and
`node examples/lending/scripts/assets.mjs`.

The gate and review reports attach to the completed commit through Gitseq.
They identify its exact head and tree. This document does not claim an
unrun gate or approval.

Two preparation gates stopped before tests. The first found two trailing
blank lines. The next found an ambient browser `location` in Lending's
adapter during the scope's Node compilation. Explicit origin fixes that
dependency. The focused native Lending witness then exposed workerd's
metadata difference. A temporary diagnostic read public descriptors only.
The generated-key fallback above fixes that difference without trusting
own metadata. The native Lending witness, scope typechecks and all three
key cases pass. A selected control that removes the provenance guard fails
its intended assertion, then restores source. Raw records use
`/tmp/artroom-m1-foundation-`.

Fresh browser checks after these fixes pass both legacy and proof invitation
flows, with no console errors. Their new fixture and results are
`/tmp/artroom-m1-foundation-browser-20261018/` and
`/tmp/artroom-m1-foundation-browser-results-20261018/`. Earlier evidence
inventories remain unchanged. The new browser and server are closed.

## Remaining M1 work

Generic browser bundling, `new`, `dev`, real Counter and Lending package
conversion, the private content store, immutable Git URI resolver,
installation-bound route and recorded room installation remain due.
M1 acceptance still requires both packages installed by URI into a fresh
room without a host redeployment, followed by removal of active old host
composition. Planner publishes reviewed local landings and owns deployment.
This foundation does not complete either the developer half or M1.
