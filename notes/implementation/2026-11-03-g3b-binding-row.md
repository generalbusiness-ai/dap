# Preserve G3b content before repository binding

The new G3b room contains its first TEST issue and requires one independent
review. This packet preserves that content and adds the room's actual
Destination to the reviewed repository bindings. It makes no deployment
or repository change and closes no G3 acceptance scene.

Delivery request `1bb63a2f` and promise `44730c33` carry this main-target
head. Preparation request `6478fe47` retains the Native operation and
custody record. Parent `3c6ec378` retains deployment, binding, agent
proposal, owner merge, and the GitHub comparison.

## Content retained before binding

The authorized producer used only the existing G3b client home at
`/Users/inguz/dap-host-g3b-20261103/client`. Its four commands published
Rules with `approvals=1` and `ownerMayReview=false`, activated the reviewed
issue and change profiles, and created one TEST issue. The actual producer
exit is 0. The separate verification exit is also 0.

[content-before-binding.json](2026-11-03-g3b-binding-row/content-before-binding.json)
records the complete Scope references, profile digests, Rules head, issue
text, and Destination state. The issue has two Native entries, with head
sequence 1 and hash
`sha256:05b3fd5cebbdb73bc5f6f0501db3b4f48ee3b0547f149f18fca056715515f983`.
Its canonical complete-prefix SHA-256 is
`4a97851acb226f2a51aaed92248388732e814e303ccb438b92c2630d2672a808`.
The verifier checked both entry hashes, their previous links, and the
111-byte body digest. Later binding must preserve this prefix and text.

The first two content preflights failed before any content command.
The first passed a Scope reference where `handleOf` expects a Scope ID.
The second wrongly assumed that a fresh Rules scope has head sequence 0.
A separate read established the normal two-entry birth prefix. The final
producer pinned that exact prefix and retained all four authorized command
bytes. The evidence keeps both failures and the diagnostic read.

Operator custody, recovery custody, and the retained plan stayed unchanged.
The Destination remains unpublished at sequence 1, with no repository,
head, or token. The original G3 room and uncertain Git operation remain
frozen. The builder read no App key.

## Exact reviewed configuration

[bindings.json](2026-11-03-g3b-binding-row/bindings.json) contains exactly
two rows for repository `generalbusiness-ai/dap-g3-binding-witness-20261102`,
stable repository ID `1442980126`. The first row retains the original
Destination incarnation and `main` branch. As a standalone canonical file,
that row retains SHA-256
`234755b04a7411602c42a7390e2e7146b6e91671a4260d231eec4918728bbfdc`.
The second row names the actual G3b Destination incarnation and branch
`g3-witness-2`. It grants no authority over `main`.

[github-app.json](2026-11-03-g3b-binding-row/github-app.json) names the
actual new Register. It retains the reviewed App identity and uses no
static read token.
[installed-register-scopes.json](2026-11-03-g3b-binding-row/installed-register-scopes.json)
retains H3, the first G3 root, and the new G3b root, in that order.
The production parsers must accept the exact packet and refuse a duplicate
repository/branch pair, a different Destination incarnation, and `main`
authority for the new Destination.

## Immutable runtime source

[source-export.json](2026-11-03-g3b-binding-row/source-export.json) pins
main `bf3bceb667e99876d2edc4880c3c337f944f5fbe`, tree
`0db11883ddfbc7d6435ba5d921a4fd375aab494e`. Its 65,590,391-byte archive
contains 3,987 tracked Git files. Every exported blob and executable mode
matches that commit. The archive SHA-256 is
`f4649a86b24a7726a077c8b04eab7c007c71d3d29cdc14ebe7322e04c61cf7fb`.
The external archive contains no dependency copy, client home, private
project, or key.

Package manifests and the lockfile match the prior runtime source.
The maintained celld configuration adds only `enable_request_signal`
beside `nodejs_compat`; its base variables remain unchanged. The new
private base project must adopt that setting and the selected source's
Worker shim before `prepare-github.mjs` can accept it.

The planner follows
[Deploy the G3b binding packet](2026-11-03-g3b-binding-row/deploy-binding.md)
after independent review and landing. The procedure preserves all three
roots and the current session custody. A rollback must retain the current
G3b project; the old single-root G3 project would strand installed roots.

## Verification and remaining acceptance

The exact packet passes the production parser checks (actual exit 0).
Duplicate repository/branch, other-incarnation, and unauthorized `main`
controls all refuse. The [evidence manifest](evidence/2026-11-03-g3b-binding-row.manifest.json)
covers 105 files across seven sealed public units, including both failed
preflights. Its SHA-256 is
`1f0452b183f6311bdb5a86fa9accf7897570db591f619e9913b12d34fe297c3f`.

The one full gate runs at frozen head
`74628997238b328bd70bdc040523bfc70e47e3ed`, tree
`81ac679fcc92ae16c33d2b00c17a0b58939ccd3a`. The actual `gate.exit`
reads `exit 0`. The [validation manifest](evidence/2026-11-04-g3b-binding-validation.manifest.json)
has SHA-256
`33a31032057e1501e6cb2701616836acfb5442bd9e05f265935b97673b8ecdc8`
and adds 13 public files. Together, the manifests cover 118 public files
across eight sealed units.

| Check | Actual result | Manifest unit and files |
| --- | --- | --- |
| One authorized content producer | Exit 0, all four commands succeed | `2026-11-03-g3b-content-prefix`: `actual-content.exit`, `content.json` |
| Complete-prefix verification | Exit 0, both issue entries and original text agree | `2026-11-03-g3b-content-prefix`: `verification.exit` |
| Exact production parsers and refusal controls | Exit 0, two bindings and three roots | `2026-11-03-g3b-binding-packet`: `packet-check.exit`, `packet-check-result.json` |
| Immutable source | All 3,987 blobs and executable modes match main | `2026-11-03-g3b-binding-packet`: `source-export.json`, `source-git-inventory.ndjson` |
| Full gate | Exit 0, all four reporting phases complete | `2026-11-04-g3b-binding-validation`: `gate.exit`, `result.json`, `test-summary.json` |

Terminal totals are 133 Node, 56 Counting, 3,607 plain with one skip, and
1,070 Native with two skips. The reports contain zero contradictions and
zero unhandled errors. The skipped Page recorder supplies no module
duration, so the module-timing inventory remains partial. Head, tree,
clean status, lockfile, and workspace bindings match before and after.
The owned process group has closed.

The gate takes 1,199.281 seconds on the shared Mac. The small doc-links
owner and its one control overlap this run; no performance comparison
follows. All raw output began in durable storage. Its owner-only,
read-only inventory retains 2,276 original files, including TEST custody;
the public validation unit retains no private fixture content.

The already-landed archive instrumentation records another owner pass at
215,252 ms. Its historical failure cause remains unresolved. No extra
gate ran to pursue that cause.

After the gate, only this note and its validation manifest change.
Runtime, tests, dependencies, and the exact configuration packet remain
unchanged. The review names the final record tree separately. No Card
workflow applies to these documentation and nonsecret packet paths.

The planner must retain four actual served-bundle readings and prove H3
continuity, including a new Inbox birth. Only then can the builder bind
the new Destination once and run the parent's preservation scene.
