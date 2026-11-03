# OAuth consent keeps one Native agent and one original operation

Request `6909704e`, under promise `bfe65c9e`, composes the hosted resource
server and the own-agent membership into public-client OAuth. A person
uses the selected room's existing browser key to consent. The host receives
one client's grant to one hosted agent at one exact connector URL. The
agent's Native key signs its acts, and Native membership still judges them.
This head opens no deployed endpoint.

## Consent and retained work

The page shows the client name, client-ID host and full ID, callback host,
room ID, agent handle, controller, and expiry. On the own-agent cohort,
`issueOwnAgentInvitation` retains the ordinary member's original add and
invite requests and asks for a one-hour invitation. Earlier memberships
use an admin-prepared agent invitation. Its handle and controller appear
before Allow; the page requires Check invitation first. An admin can
connect an agent controlled by another person.

Consent reads only the selected public settings slot and the existing
nonextractable signing key at the current origin. It creates no browser
key and adopts no saved service address. The complete selected settings
value fences reads, signing, custody writes, and sends. The real browser
witnesses verify IndexedDB custody and refusal to export the private key.
The Native consent witness uses real WebCrypto with explicit storage and
lock stand-ins; it does not prove browser durability.

The origin-private journal retains up to sixteen operations per selected key and room within 512
KiB. It holds invitation custody and signed grant originals, including
unknown work; it removes no original to make room. Check reads invitation
status without sending a new grant. Continue preserves the Native
requests, operation and grant meaning, and can renew only the control
permission's deadline. If the server already disclosed the code, replay
returns a codeShown receipt. A fresh Allow then reuses the known agent.
No authorization code or OAuth token enters that journal.

The registry reserves one controller/client mapping before first handoff.
It enrolls the agent through Native membership and creates no static
bearer for an OAuth connection. A fresh connection for that same pair
reuses the agent. Signed connection lists and revocation check current
admin or controller authority. An ordinary member cannot list another
controller's mappings, and role widening does not prevent revocation.

## Issuer and client boundaries

The server supports discovery, dynamic public-client registration, exact
redirect validation, code exchange with PKCE S256, rotating refresh tokens,
and revocation. The code lives sixty seconds; access lasts one hour; the
grant ends within thirty days. Only digests of codes and tokens enter the
issuer records. Reusing a spent code within its validity window or reusing
an old refresh token ends that grant. The agent admits eight pending or
live grants; a ninth ends the oldest.

Fresh standing bounds code exchange and refresh. Proven inactive standing
ends the grant. Unavailable standing returns a temporary refusal without
permanently revoking it or charging a bad-token failure. Refresh closes
the old token's streams and preserves that grant's sessions. Revocation
ends its sessions and streams without disturbing another grant. Closing
a held package-opening layer does not wait for that package to open.

The planner's metadata ruling `4fd73a3f` admits exact HTTPS origins through
`OAUTH_CLIENT_METADATA_ORIGINS`, with Claude and ChatGPT defaults. A custom
list replaces those defaults. The policy trusts the listed origins and
their DNS; it inspects no socket address. Unlisted origins refuse before
fetch. Fetch follows no redirect, sends no credentials, and limits the
complete operation to five seconds and 5 KiB. A valid document lasts in
the cache for at most one hour and must name the exact requested client
ID. Consent displays that ID's host even when the document calls itself
Claude. A separate exact redirect policy and the registered redirect list
must both admit the callback.

The security inventory runs the actual wire and consent matchers with
object boundary stand-ins. It distinguishes public routes, code or token
proof, and signed controls. It enumerates each finite agent-route suffix
and both token forms. An undocumented method change fails the inventory
bijection. Reviewed source-owner seals cover the new policy, issuer,
signing, wire and browser consent owners. These are structural tripwires,
not Native authorization evidence.

## Browser evidence and its limits

The first sealed browser unit records local HTTPS Workers at `42a76281`.
An ordinary Membership 13 person and a controller on Membership 8 each
complete Allow, matching state and issuer, wrong-verifier refusal followed
by the correct PKCE exchange, MCP initialize and tools/list, then browser
Revoke and immediate 401. Each room records one agent add and one
enrollment. The consent journal contains neither the code nor the tokens.
A document named Claude shows its actual localhost client host and full
ID; an unlisted redirect refuses; Chrome blocks a framed consent page.

The second unit records the invitation UI at `eb43ac23`. It verifies exact
handle/controller display, disabled Allow before invitation checking, and
invalidation of that check when the input changes. The controller connects
the prepared agent; an admin later reuses that same agent for the same
client and actual controller. Both flows exchange with PKCE, initialize
MCP, and revoke to an immediate 401. The enrollment count rises from one
existing agent to two, then stays at two through the admin flow. Both
keys refuse export. Both phases fit 1280- and 320-pixel widths and report no
console warnings, page errors or failed HTTP responses. I inspected the masked
screenshots.

Those OAuth clients are explicit scripted hosts. The runs establish local
composition with real browser custody and Native scopes; they establish
no Claude or ChatGPT acceptance. The initial full flows each report one
404 console message. A later controlled host serves its favicon and the
invitation flows report no such errors. The record retains that distinction.
The first framing script also fails on its own message formatter; its
corrected read-only run passes, and both remain in the evidence.

One failed local setup stays intact: I changed its creation register
between cohorts. Two earlier-room Inbox sends then reached undelivered
not-found diagnoses. Its unknown original remains saved and received no
hosted enrollment or code. Separate fixed-register Workers provide the
successful witnesses. The [register-switch finding](2026-11-03-register-switch-finding.md)
records the source-derived reach to H3. Ruling `a555fc77`, corrected by
`8678baf0`, accepts the loss for retired H3 and keeps live Workers on their
registers. O4 uses a new dedicated Worker that the planner names and
deploys after O3. Multi-register request `579489e0` follows O3 before any
cohort move on a Worker with live rooms.

## Checks and failed gates

Every focused record names its actual checkpoint and dirty paths. Earlier
scope-only compiler runs do not compile the MCP Native test files; later
runs use the actual MCP and Page owning compiler configurations. The
focused unit preserves failed fixture, compiler, startup and control
attempts as well as passing checks. It is not one frozen aggregate pass.

Four full gates remain failures. The first finds duplicate shared helpers;
the repair imports their existing owners. The second finds an undeclared
structuredClone Web API; the narrow declaration repairs all owning
compiler contexts. The third finds the stale security inventory and a
source-control anchor; the actual route and usage owners now pass twenty
cases. The fourth, at `07af767b`, passes prechecks, all compilers, kernel,
133 Node cases and 56 counting cases. Its plain phase passes 3593 cases,
skips one and fails only the old ten-export browser boundary list. Native
is unreached.

The isolated repair at `9bcb91f9` changes only that unimported test file.
It adds the intended issueOwnAgentInvitation API to the closed list and
changes the title to eleven exports. Every original case, identity check,
command-graph exclusion, external-import assertion and deadline remains.
Reversing those two edits reproduces the original file exactly. Production,
configuration, dependencies, helpers and all other tests match `07af767b`.
The owning compiler and whole file pass at the repaired bytes. The
follow-up runs only the unreached Native stage under the isolated-test
rule in docs/testing.md. Its actual native.exit and followup.exit each say exit 0: 1060 cases
pass and two skip. The clean source check retains that exact head and
tree through completion. No follow-up
turns the failed gate into a pass.

| Check | Result | Evidence file and SHA-256 |
|---|---|---|
| Focused process ledger | Actual incremental records; failed and invalid attempts retained | `run-ledger-through-110.json` in [manifest](evidence/2026-11-02-oauth-authorization-focused.manifest.json), `62e73a4d0450794b36287ee1653d44db6bf58c8e61cb2cf7a0987dfee097748b` |
| Ordinary own-agent browser | Full scripted-host code flow and browser Revoke; one add and enrollment | `own/own-flow-result.json` in [manifest](evidence/2026-11-03-oauth-browser-42a.manifest.json), `caefe286cacbf34fdea31d71c2257c7bd048af0420f2d3bb301a781158999027` |
| Earlier controller browser | Membership 8 code flow and Revoke; one add and enrollment | `earlier-and-failed-mixed/older-flow-result.json` in [manifest](evidence/2026-11-03-oauth-browser-42a.manifest.json), `e28c73ce40383c27e7f4fd1a7d73a1310abf3c3e9a3c720533c235639907dc23` |
| Foreign name and framing | Actual host and full ID visible; framing blocked; unlisted redirect refused | `own/browser-controls-2-result.json` in [manifest](evidence/2026-11-03-oauth-browser-42a.manifest.json), `02ddf8183a774c3db721f4b47af41551ab087e662ed33ac79ddc2e05e22ac9ac` |
| Invitation and admin reuse | Both browser phases pass; no second enrollment for admin | `invitation-ui-flow-result.json` in [manifest](evidence/2026-11-03-oauth-invitation-browser.manifest.json), `2da9b08012e7c00cf47aeb9e724bc091d8cd7339626a0926b6bf786ac4b32304` |
| Failed gate 1 at eb43ac23 | Exit 1: Shared-helper failure before suites | `failure-record.json` in [manifest](evidence/2026-11-03-oauth-authorization-gate.manifest.json), `450420dab9bb7a71a00190598219460a730c76c25218851d942f5ee4e1dd5ea1` |
| Failed gate 2 at 1c617e0c | Exit 1: Compiler failure before suites | `failure-record.json` in [manifest](evidence/2026-11-03-oauth-authorization-gate-2.manifest.json), `9382de5ded6bab9109ed3b67dc2d770c0bd3294056741d128c088912c9e30337` |
| Failed gate 3 at 9c421ede | Exit 1: Node inventory failure; later stages unreached | `failure-record.json` in [manifest](evidence/2026-11-03-oauth-authorization-gate-3.manifest.json), `e7993476e491725c698ff32c552eed6b215e88675150ee343807acb90104fbe2` |
| Failed gate 4 at 07af767b | Exit 1: One plain API-list failure; Native unreached | `failure-record.json` in [manifest](evidence/2026-11-03-oauth-authorization-gate-4.manifest.json), `cbe4587364cfc301648bb7c33f1d6d47e0b602522259ad145dffa58c3b227685` |
| Isolated repair scope | Exact two-edit reversal; all other code and tests unchanged | `scope-proof.json` in [manifest](evidence/2026-11-03-oauth-authorization-isolated-followup.manifest.json), `64da97d5e2cd3bf42c8abe211410a54e8034daccb3afc2ffe643e026fec6ef49` |
| Native follow-up | Exit 0; 1060 pass, two skip; zero unhandled errors | `native-result.json` in [manifest](evidence/2026-11-03-oauth-authorization-isolated-followup.manifest.json), `5a69088076a2acfe90a45d545565dcdaacb72d658645b9515f4454ba0085064f` |
| Card and Page CI | Both successful at 9bcb91f9 | `final-results.json` in [manifest](evidence/2026-11-03-oauth-browser-ci.manifest.json), `12d4f0cae9054eb9c4cfd7a960df1f89c39ec8fa400804f44fefdb5d5e2b5382` |

The [Card workflow 41596818010](https://github.com/generalbusiness-ai/dap/actions/runs/41596818010)
and [Page workflow 41596824812](https://github.com/generalbusiness-ai/dap/actions/runs/41596824812)
succeed at `9bcb91f9`. The later record commit changes only documentation
and evidence; source and tests retain that CI and Native checkpoint. The planner deploys; O4 and fresh G3 acceptance remain separate
work.
