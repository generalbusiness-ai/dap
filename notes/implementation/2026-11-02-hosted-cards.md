# Hosted cards from installed applications

The hosted agent serves its room's declared cards through `/mcp`. Local
`dap mcp` uses the same composition path. Native membership still decides
reads, and native scopes judge every act under the server's own key.

This head answers request `288d5988911e02eb5648ef80e580c6b612fc75a4` under
promise `086a0ccc7b33e070e28b33853b964cd547702c08`. It changes no platform
pin, default cohort, migration or deployed Worker. G3's source child has
landed; its real mini scene remains open under parent `3c6ec378`.

## Source checkpoint

| Item | Value |
| --- | --- |
| Base main | `4be4c43f8830bc1856ba2c16c3ff632c54bc0f93` |
| Frozen source | `a612368f9923b334741a5fecf8964f28e75bc2a4` |
| Source tree | `4795378606caceb8d98496f4deacf8ed301dd6d5` |
| Source paths over base | 19 |
| Record follow-up | Only `docs/mcp.md`, this note and its evidence manifest change after the source checkpoint. |

The source worktree stayed clean during the full gate. The record's
manifest names every evidence file and its bytes and digest. It includes
qualified draft failures as well as the final results.

## One native installation selects the cards

`McpService.fromInstalledApplication` supplies the shared composition in
`packages/mcp/src/service.ts`. `node.ts:serve` previously supplied neither
`views` nor `declaredViews`; the generic stdio launcher needed this wiring
as well as the hosted agent.

Without application trust, composition returns the ordinary service before
any discovery read. Otherwise, the service verifies the configured room's
full Directory and Membership references, its exact Rules and Destination
siblings, and the cohort pins. A complete active-installation query with
limit 2 must return exactly one row. An incomplete, missing or ambiguous
selection adds no card tools and fetches no package.

The service rechecks that install item and its exact references, then
compares the package's release, semantic and presentation IDs, entry
definition and trusted publisher. The Worker reads immutable bytes through
`ApplicationContentStore` and `APPLICATION_TRUST`; stdio reads the approved
immutable public Git source. The bounded codec accepts at most 4 MiB. The
interpreter runs declarations as data and executes no package code.

Stdio keeps the selection for its process lifetime. A hosted agent keeps
it for its HTTP layer; a fresh bearer rotation or an object restart rebuilds
the layer and selects again. Each card read rechecks the selected
installation's current active state. Existing explicit `views` and `declaredViews` callers keep
their exact source. Rooms without a supported declared installation retain
the ordinary model tools; this change does not supply a Repo in AI adapter
for an uninstalled room.

Planner ruling request `ff93a69135d87fead23bf50be63ece5ab98c85f7` records
the sole-installation and restart choice. The implementation states that
choice explicitly; it does not imply that the planner has ruled on it.

## Host metadata changes presentation

A host that declares `io.modelcontextprotocol/ui` receives the declared
opening tools and app-only `view_read` and `view_act`. Other hosts receive
the model's text opening tools without `_meta.ui` or app-only tools.
Resource replies also omit UI metadata for a host without that capability.
Explicit authenticated resource reads remain available; presentation
capability grants no authority.

`MCP_CARD_ORIGINS` is an optional closed JSON array with at most two rows
and 8,192 UTF-8 bytes. Each row has exactly `host`, `url` and `domain`.
Hosts and connector URLs must be distinct. A URL must be canonical HTTPS
at `/mcp`, with no credentials or fragment. Separate query strings let
Claude and ChatGPT use different metadata on the same endpoint.

- Claude's value is the first 32 SHA-256 hexadecimal digits of the exact
  connector URL plus `.claudemcpcontent.com`, without a scheme. The hash
  includes the path and query.
- ChatGPT's value is an HTTPS origin unique to the plugin.

The agent matches its verified service origin plus the request's exact
path and query, including behind an internal HTTP proxy. It uses no
client-name guess or caller-supplied origin value. Unknown URLs declare no
remote domain. Invalid rows close the whole hosted endpoint before body
reads or namespace addressing. Stdio and local loopback HTTP do not read
this setting. The wire strips old package domain labels when no remote
transport supplies a domain. Domain selection preserves the HTML bytes and the capable host's CSP.

These formats follow [Claude's domain requirements](https://claude.com/docs/connectors/building/mcp-apps/getting-started)
and [OpenAI's component metadata](https://developers.openai.com/plugins/reference).

## The agent keeps its identity and custody

`HostedAgent` constructs its card service from the same durable seed,
configuration and SQLite custody as its ordinary tools. Card tools pass
through the existing view performer, current target and standing checks,
retained request protocol and native scope judgment. The hosted generic
tool policy admits the source's card tools; it does not admit omitted
credential, preparation or install tools.

Source setup can await native reads and package storage. A bearer rotation
or retirement invalidates any setup already in flight. An older setup
cannot adopt a layer with the old bearer deadline. The endpoint rechecks
the bearer after setup and before dispatch. The native witness holds a
configuration read with a gate, rotates the bearer, resumes the old call,
and checks the renewed bearer through HTTP beyond the old expiry.

## G3 uses its existing declared protocol

The MCP room selector now recognizes the landed repository-binding cohort,
including Membership 11. Its Rules 10 admits device packages, so the G3
witness uses the existing device fixture profile; it does not pretend that
Rules 10 admits the older Counter package.

The generic projection metadata source previously required exactly
`directory,rules`. The G3 Directory also supplies `membershipDefinition`,
which made that read return `query-not-ready`. The source now accepts the
closed optional field only for the already supported Membership 10 and 11
values. It preserves the Directory's full-reference check, the Rules-kind
check, the byte and canonical-JSON bounds, and the flight fence. That field
selects no read authority. Native projection preparation still checks the
actual scope, membership, installation and recorded birth.

## What the witnesses establish

`packages/scope/test/hosted-cards.test.ts` reaches the production room
Worker's `/mcp` route inside local workerd. Registry and agent objects,
membership enrolment, private sessions, SQLite custody, native application
installation and projection, and local R2 are real. The Git package peer,
clock and scheduler are fixtures. No network listener, deployed Worker,
live Git provider or real host UI participates.

The two scenes cover the original declared cohort and the G3 cohort.
Each compares the hosted card list and resource bytes with the
stdio-composed service for the same room, checks both configured origins,
checks a host without UI, and records an accepted fixture acknowledgement
whose native entry names the hosted agent's key. The declared Counter
scene also asserts that its controller-only Pause act refuses the agent.
The separate acknowledgement leaves that guard intact. Neither fixture
issues an external device command.

The duplicate-installation control scripts only a second row in the
bounded discovery reply. Exact-item reads and the other reads remain
native. It proves the host's ambiguity refusal, not a second native
installation.

The Native card scenes use the modern MCP wire. The focused resource owner
checks UI metadata and text fallback in both supported wire revisions.
The existing hosted Native owner separately covers both transport revisions,
agent separation, revocation, admission, sessions, expiry and custody.

## Evidence

Raw output stays private under
`/Users/hughpyle/.config/generalbusiness/hosted-cards-20261102/`.
The public units contain result records, hashes, bounded count extracts and
producer scripts. They contain no raw request bodies, bearer values or
private keys. Keep the sealed units for at least 30 days after landing.

| Unit | Qualification | Files | SHA256SUMS digest |
| --- | --- | ---: | --- |
| `2026-11-02-hosted-cards-focused` | Focused boundaries, controls and retained drafts | 92 | `93660f0b4e2e76fe5a9261ac195e82d4f38559b2a365334d8fff6f489c171e25` |
| `2026-11-02-hosted-cards-card-ci` | Exact source Card workflow | 3 | `e376376afceb23ce7a1f3d100193ff3901899e8315b9bfd4fb9ad07038278401` |
| `2026-11-02-hosted-cards-gate` | Frozen source; actual exit 0; unchanged before/after guards | 7 | `c23b36a65c74bb2e4346c42a805609b51ca74dc904b44556b7c506ff88f2b6e9` |
| `2026-11-02-hosted-cards-documentation` | Documentation checks at their own checkpoint | 6 | `2e5ba8ca16b49827ac362a0fc60b18323254f870e28d8f44703604765e604806` |
| `2026-11-02-hosted-cards-documentation-final` | Documentation checks at their own checkpoint | 6 | `052088daf2af287234117f9dfcca752e04328ae2fc6e1ede2cdd3cf4a3d858c2` |

The focused unit indexes 43 attempts and 88 private files. Its summary
keeps each outcome separate; the counts below do not add overlapping runs.

| Boundary | Result | Record |
| --- | --- | --- |
| MCP and Scope source, MCP and Scope tests, MCP Native tests | Five compiler contexts exit 0 | `*-final.json` records named by `qualification.json` |
| Hosted transport, wire, resources, policy and SQLite owners | 7 files, 45 cases pass | `hosted-plain-owners-final.json` |
| Security routes, settings and source boundaries | 25 Node cases pass | `security-owners-final.json` |
| Current card owner | 2 Native cases pass | `hosted-card-binding-cohort-04.json` |
| Existing hosted owner and earlier declared card | 21 existing cases plus 1 earlier card case pass; qualified earlier composition | `hosted-native-owners-01.json` |
| Full gate at the source checkpoint | Exit 0; Node 132, counting 56, plain 3579 plus 1 skip, Native 1039 plus 2 skips; matching source guards | `gate.exit`, `result.json`, `terminal.txt` |
| Card browser workflow | Success at exact source, run [41472303998](https://github.com/generalbusiness-ai/dap/actions/runs/41472303998) | Card CI `result.json` |

### Controls and draft failures

Each named control changes one guard, runs its whole owner, observes an
assertion failure and restores matching source hashes. These controls
exit 0 as distinguishing results:

- `origin-url-control-root`: ChatGPT incorrectly receives Claude's domain
  when exact URL matching disappears.
- `source-epoch-control`: the renewed bearer receives HTTP 401 at the old
  deadline when an older setup can adopt its layer.
- `sole-install-control`: choosing the first of two installations exposes
  card tools instead of refusing the ambiguous selection.
- `projection-room-metadata-control`: rejecting G3's optional metadata
  leaves its card unavailable; the older cohort still passes.
- `no-ui-resource-control`: both wire revisions expose UI metadata to a
  host that declares no UI capability.

The first URL control used a package-local project filter that started no
tests. It remains inconclusive, with its scratch output retained privately;
the corrected root-project command supplies the distinguishing result.
Earlier lifecycle and ambiguity controls ran the original declared-card
scene, which remains in the later two-cohort owner. Their target guards
remain unchanged at the frozen source.

The unit also retains draft failures: a missing modern method header;
missing item-query `ids`; compiler corrections for test response and
optional metadata types; a non-UI assertion that confused ordinary tool
metadata with UI metadata; the real Counter controller refusal; and the
G3 package-profile, initial-page and metadata-read diagnostics. The final
fixtures keep the original native guards. `attempts-summary.json` names
each attempt, its exit and any available terminal counts. No failed or
inconclusive run becomes a pass.

## Open acceptance

This record proves a local scripted hosted-card route and the stated
boundaries. It proves no Claude, ChatGPT, Goose or Gemini UI acceptance,
OAuth, deployed hosted MCP, G3 mini deployment or G3 parent acceptance.
The planner opens one named deployed endpoint only for the later OAuth
and live-host work. The Goose revision request remains separate.
