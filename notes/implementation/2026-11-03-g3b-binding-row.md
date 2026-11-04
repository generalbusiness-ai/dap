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
preflights. The required gate has not run yet; review follows its actual exit.
The already-landed archive instrumentation runs within that required gate;
its historical failure cause remains unresolved.

The planner must retain four actual served-bundle readings and prove H3
continuity, including a new Inbox birth. Only then can the builder bind
the new Destination once and run the parent's preservation scene.
