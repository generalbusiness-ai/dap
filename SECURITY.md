# Security

## Report a vulnerability

Use [GitHub private vulnerability reporting for dap](https://github.com/generalbusiness-ai/dap/security/advisories/new).
Include the affected commit or deployment, the request or command, the
expected boundary, and a minimal reproduction. Omit signing keys, bearer
secrets and private room content. If GitHub offers no private reporting
form, contact the repository owner through GitHub to arrange a private
channel before sharing the reproduction.

## Security references

Read the references in this order. The first three explain the model.
The next two are inventories for lookup. The last row holds the normative
contracts.

1. [Threat model](docs/security/threat-model.md): what dap protects, what
   an attacker can do, the invariants and the tests that check them.
2. [Deployment trust boundaries](docs/security/trust-boundaries.md): secret
   custody, shared resources and revocation limits.
3. [Definition-author security reference](docs/security/definition-authors.md):
   validation refusals and valid permissive policy forms.
4. [Worker entry points and gates](docs/security/entry-points.md): routes,
   caller gates, pre-gate work, stored state, bounds and outside calls.
5. [Worker settings and bindings](docs/security/settings.md): setting
   readers, parsers, failure modes and health meanings.
6. The normative contracts:
   [the scope and replay contract](notes/2026-10-04-scope-and-replay-contract.md)
   and [authority, effects and publication](notes/2026-10-04-authority-effects-and-publication.md).
   Their section numbers are stable.

[Testing guidance](docs/evidence-filing.md) describes the evidence required
for a change. The inventories describe checked-in source. They establish no
current deployed setting, provider access control or completed live scene.

## Reviews

The [4 October security review](notes/reviews/2026-10-04-security-review.md)
covers the earlier model at its recorded commit. It remains historical
evidence and does not assess the current implementation. The
[5 October dispositions](notes/reviews/2026-10-05-review-dispositions.md)
record the treatment of that review period's findings.

Planner review `6dd06d03` records the 21 October attack-surface findings at
`603220b9`. Its remediation requests and later exact-head checker reviews
live in the repository's gitseq workroom. The
[delivery note for the settings, trust-boundary and definition-author pages](notes/implementation/2026-10-24-security-docs-partial.md)
and the [completion note for the threat model](notes/implementation/2026-11-09-security-docs-d6.md)
name the documentation evidence. A review of one commit proves no later
commit or deployed configuration.
