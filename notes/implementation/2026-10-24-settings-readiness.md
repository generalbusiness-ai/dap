# Shared settings and local wiring readiness

This head implements R9 items 1–3 under child request
`89cca717ebb1f3366942494d49c22d3bc029cbfd` and promise
`7c0d93f2a5b5f6f6c25fc33a048f37c87c9150dd`. It is based on the reviewed
R5B source and includes the R9 deployment-command change tracked by
`5179f3a13c685b7f4e78235e88398ffc6c749185`: `deploy:scope` preserves
existing Worker settings with `--keep-vars`. R5A and R5B have landed.
Parent R9, R10 and R11 are not closed by this note.

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

The first affected invocation, `66580`, passed the Git production, Git test
and Scope production compilers, then failed the Scope test compiler on two
fixture typing/name errors. No body ran. Those narrow fixture corrections
preserved assertions, registrations and deadlines; the failed run remains.

Invocation `72848` then passed the corrected Scope test compiler and all
47 affected assertions; its body exited 0 with no unhandled errors. Its
wrapper still exited 1 because two parameterized creation-lineage names
used different reporter quoting. Root reconciled the complete tuples and
accepted the semantic result. The original wrapper failure is retained;
this is not a claim that the owning wrapper passed or a whole gate passed.

Two separately allocated controls matched their intended failures. Disabling
the malformed optional creation-token refusal made the GitHub wiring case
fail at `170:41`; its other case passed. Removing the UTF-8 byte bound made
the session configuration case fail at `261:114`; its other two cases
passed. Both control children exited 1 as expected, with zero unhandled
errors, while their owners exited 0 after restoring original source bytes,
inode, mode and modification time. The target change time changed. All other
source, Main, tool, environment and preparation vectors stayed fixed.
The existing declared cache file retained its physical identity; only its contents/times and empty temporary-directory times were
allowed to change. The compact audit retains the full guard-map pins.

The eight changed mapped owners have actual maintained AST seals. These
are source tripwires, not provider or authority evidence. The final gate,
exact-head review, landing and deployment remain pending. No hosted
connectivity, token validity or provider acceptance is claimed. R10 and R11 remain separate.

The measured outer control commands took 7.23 and 7.36 seconds of wall time,
and 8.45 and 8.73 seconds of CPU time. Their nested child costs overlap and
are not added. These are local partial measurements, not total implementation
costs or a portable performance claim.

## Approved archive integration, gate pending

Approved archive restart landed in Main
`55e4be6cdc0300b0a1865c237be3097cfb232edd`, with tree
`b6ff4b88a32d7125c290672ff07c15e4467123d2`, before this normal ancestry
merge into the R9 branch. Archive approval `6fa5bec4` and root ratification
`901d16f5` are event references; the landed receipt is
`db1d03fd379146b8db81c49a6914e10f481de5fc`.

The integration preserves R9 production and test bytes and the sibling
`deploy:scope --keep-vars` change. Archive production and tests retain
their approved Main bytes. The shared tripwire map is the exact union of
R9's eight actual seals and archive's eight slots for seven owners,
including both object slots and the new directive parser. No owner source
was adapted and no new parser run was needed for this union.

The earlier 47 assertions and two controls remain the qualified historical
results above, not new results on the merged tree. Archive changes the
Scope object and shared test-worker import closure; the final ordinary R9
gate must validate this actual integrated checkpoint before review. No
extra healthy focused run, compiler, compatibility setup, provider call or
deployment has run for this merge. Gate, exact-head review and landing of
this R9 change remain pending.
