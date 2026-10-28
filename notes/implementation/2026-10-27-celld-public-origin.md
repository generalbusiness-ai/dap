# H1: local celld project and public service origin

This implements request `99918e60` and amendment `8a50aa07`, after G1
landed at `248edb41`. The local project reexports the production room Worker,
keeps its four Durable Object bindings and three migration tags, and pins
celld `v0.6.2`. Its smoke uses the production CLI and actual host-none scopes.

## Decisions

`readPublicOrigin` is the only reader of the new nonsecret `PUBLIC_ORIGIN`
setting. An unset value retains the original request URL origin. A supplied
value must already be an exact canonical origin, at most 2048 ASCII bytes:
HTTPS or invitation-policy loopback HTTP. Invalid configuration fails closed.
Forwarded headers supply no identity. A differing transport Host does not
override the configured public origin.

The accessor supplies hosted registry creation, application deployment
defaults and context, sandbox descriptor checks, and demo origin checks.
An explicit `DEPLOYMENT` retains precedence. The sandbox gateway first binds
the effective origin to its trusted descriptor, then checks the unchanged
transport URL through the existing finite path and method matcher. It does
not rewrite the stored descriptor, Request, path or query.

Hosted MCP already calls the scope API in process. `ScopeService` remains for
its existing binding and test callers in this head. The registry and agent
still compare the signed service identity and retain their authority,
signature, body, deadline, address, rotation and retirement checks. No native
definition, wire representation, kernel bound or historical pin changes.

The local configuration omits Cloudflare-only configuration keys, repository
providers and package content storage. Secrets and CLI custody stay private.
The smoke requires a retained plan, marks a run before sending acts and
refuses replacement runs after success or uncertainty. CI calls the same
kept proxy driver against the pinned release with an attestation check.

The settings inventory includes JSON configurations and recognizes only an
exact tracked two-export shim as sharing the permanent Worker identity.
Physical entry matching and the full runtime environment closure remain.
Source seals cover the changed gate owners and the shared origin accessor.

## Evidence

The first source checkpoint was `e44e38f0`, tree `4a2eafa4`. Scope and MCP
typechecks passed. The focused Node run had 16 passes and four inventory
failures: its extracted MCP matcher lacked the new pure helper. The extractor
now loads the actual helper and distinguishes the private gateway from public
named RPC methods. These are structural harness repairs. The first version
probe returned celld 0.6.3, so that executable was rejected. The pinned 0.6.2
release was obtained separately in scratch with a successful attestation
command. All attempts remain separate; no failed result is called a pass.
The repaired inventory run had seven passes and one overlooked type-binding
seal. Root reviewed its three-line interface change and adopted the actual
parser value. Focused Native checks had 37 passes and one invalid sandbox
host fixture, corrected to the existing permitted domain. The first proxy
smoke reached real installation, room creation and guest join, then failed.
The smoke’s six-scope expectation omitted the joined guest’s new inbox. It
now requires all seven exact identities, including distinct owner and guest
inboxes. The original private custody remains untouched and is not retried.
The focused inventory and repaired Native route file then passed. The fresh
proxy smoke passed its seven-scope phase but stopped at configured MCP
creation. Its first driver diagnostic named only the stage. The driver now
retains the actual HTTP status and a closed refusal vocabulary on failure,
without response bodies, invitations or bearers. No original custody is
reused and no runtime pass is inferred.
This section will record the final terminal results before review. The final evidence will be sealed under
`/Users/hughpyle/play/artroom-evidence/2026-10-27-celld-public-origin`.
The first draft inventory generator failed before parsing because a flat
symlink view could not resolve native dependencies. Its failed output is
retained. An independent APFS clone of the existing lock-verified cache fixed
resolution, and the same bounded generator then passed with unchanged source.
Dependencies now reuse that cache through an isolated physical view
whose fourteen workspace links point to this worktree. No package is installed
in the checkout, and neither package metadata nor the lock changes.

The added Native witness labels its rewritten Request as a Worker boundary
exercise only. Actual TLS-to-HTTP proxy, celld, registry and MCP results require
the separate kept driver. The existing `/health` route must report the real
register and session state. A constant response or scratch subclass is not
accepted as readiness evidence.

## Open limits

H3 in request `99918e60`'s self-hosting design owns the production proxy,
TLS profile, supervisor, drain and fleet kit. This local head proves no
backup, second copy, fleet failover, deployed proxy or physical device flow.
G1 runtime request `9976fbe6` separately owns its planner deployment handoff.
The R14 requests `db60a6f9` and `fe2305a2` own ScopeService and legacy demo
retirement after H1. This head keeps both surfaces intact.
