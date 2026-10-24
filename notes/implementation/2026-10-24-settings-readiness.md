# Shared settings and local wiring readiness

This head implements R9 items 1–3 under child request
`89cca717ebb1f3366942494d49c22d3bc029cbfd` and promise
`7c0d93f2a5b5f6f6c25fc33a048f37c87c9150dd`. It is based on the reviewed
R5B source. R5A, R5B and the separate R9 deployment-command change must land
before this head. Parent R9, R10 and R11 are not closed by this note.

## Behavior

Artifacts and GitHub factories, site readers and health share complete
local configuration validation. Readiness distinguishes absent settings
from malformed settings, namespace mismatch, missing bindings and invalid
credential settings. Health exposes only `state` and a finite `reason`.
A configured host that is off makes health return `503`; differing register
roots remain ambiguous. Existing session and register checks still apply.

The actual Artifacts service-host predicate and GitHub private-key syntax
predicate are shared with their adapters. These are syntax and local
wiring checks, not a provider request or cryptographic key import. A
`wired` response proves no remote connectivity, installation-account
authorization, token validity or hosted acceptance.

One reader accepts `DEPLOYMENT` only at 1 to 128 UTF-8 bytes. Sessions,
demo creation, health, metrics and screens use it. Invalid configured
values refuse creation admission and make screens unavailable. They never
become an absent setting that permits local creation. Truly absent local
settings retain their previous behavior. Operational labels fall back to
the fixed value `unknown`.

`APPLICATION_TRUST` already has one strict parser. Its current
release/publisher schema and admission semantics remain unchanged. R10's
trust-before-fetch/host constraint and R11's revocation behavior stay
separate.

## Verification status

Source review and static correspondence found no mandatory production
issue. Existing tests were strengthened without new registrations or
deadlines, including shared full-config fixtures, exact UTF-8 boundaries,
secret-free health failures, and invalid-present deployment rejection
before creator or child lookup. Their runtime outcomes are pending.

The maintained AST source-seal parser ran once and exited successfully for
the eight changed mapped owners. Only those existing map slots were
updated with its actual outputs. Its stderr retained the Node experimental
TypeScript warning. This parser result is a Source tripwire, not runtime
authority evidence. Affected compiler and native test results, paired-control
evidence where required, and the final gate remain pending. No deployment,
provider call, package install or runtime success is claimed here.

The first affected run at `1e18f5d0` passed the Git production, Git test and
Scope production compiler contexts. The Scope test compiler then rejected
two fixture errors: an explicitly `undefined` optional deployment property,
and a duplicate local `publicEnv` binding. No test body ran; all 47 cases
remain unrun. The absent-setting witness now passes the existing bindings
with that property genuinely absent, and the optional-credential fixture
uses a distinct local name. Assertions, registrations and deadlines are
unchanged. The failed run remains retained; the corrected Scope test
compiler and 47-case body still require validation.
