# One channel

Design note, draft 1, for request `1e8ef5d5`. Proposed: nothing here is
built. It describes main `c40492ee`.

An agent in a room changes an issue's title. It signs an act, the issue's
scope judges it, and the journal keeps it. A week later a verifier replays
the journal and finds the same title. Now the same agent reads the room's
status, mints a clone token, and asks the hosted endpoint for a new bearer.
None of those three steps is an entry. This note finds every such step,
says which class it belongs to, and gives each one a disposition: a design
that brings it into the record, or a reason it stays outside, with its
limits.

## 1. Principle

Every change is an act judged in a turn. Every read is of the record at a
named position. Every effect on an outside system is a declared capability
form whose outcome is its own entry. Any other surface is named in this
audit, with its limits.

The kernel boundary page (request `2ee805c5`) carries this sentence in its
list of the kernel's promises.

## 2. Classes and test

| Class | Meaning | Test |
|---|---|---|
| A. Act | A signed intent, judged in a turn, kept as an entry. | Replay derives it again. |
| B. Read at a position | An answer from a scope's journal, items or summary, with the head it was read at. | The answer names `at` (`packages/contract/src/read.ts:18`), and the same read at the same head gives the same answer. |
| C. Capability form | An outside effect under a declared capability or operation, whose outcome is its own entry. | The attempt and its outcome are entries (`packages/scope/src/operations.ts:9-35`). |
| D. Something else | Any surface that reads or changes state outside A, B and C. | It has a disposition in section 4. |

A surface in class C can still trust what the outside system says. The
scope records the answer and cannot check it
(`packages/scope/src/operations.ts:67-71`). The table says so where it
matters.

## 3. Surfaces

The gitseq workroom is a different system and is outside this audit.

### 3.1 MCP tools

`docs/mcp-tools.json` lists 73 tools: 57 act tools and 16 generic tools.

| Surface | Class | Evidence | Note |
|---|---|---|---|
| 57 act tools (`change.*`, `issue.*`, `member.*`, `key.*`, `room.*`, `rules.*`, `repository.*`, `inbox.*`, `task.create`) | A | One tool for each act declaration (`packages/mcp/src/catalogue.ts:142-179`); each call signs one intent and submits it once (`service.ts:502`, `:524-527`); a retry resends the same bytes (`custody.ts:17-26`). | Each tool signs exactly one act. |
| `inspect`, `items`, `steps`, `step`, `record`, `sends`, `text`, `application_installation` | B | Every answer names `at` (`service.ts:702`, `:721`, `:744`, `:753`). | `sends` also shows the dispatcher's attempts. They are bookkeeping, not entries (`read.ts:80-99`). |
| `room` | B, mixed heads | Reads several summaries, each at its own head (`packages/mcp/src/inventory.ts:165-180`). | It returns a generation, not the heads (`service.ts:639`). D2. |
| `wait`, `settle` | B | `wait` polls once a second for at most 60 seconds (`service.ts:1094`, `:1132-1136`); `settle` looks up the accepted intent (`service.ts:819-876`). | `wait` writes local configuration although its description says it never writes (`service.ts:599`, `:1187-1200`). D13. |
| `create`, `join`, `prepare` | A | One creation (`service.ts:916-927`), one `join` (`:1056-1064`), one preparation entry (`packages/derive/src/prepare.ts:259`). | `create` and `join` also write local configuration. |
| `install_application` | A, then C | One `install-application` act on the rules scope (`service.ts:1004`); the host's fetch and admission are operations with outcomes (`packages/scope/src/applications/outside.ts:36-60`). | The MCP server fetches the package URI itself before the act (`service.ts:990-993`). |
| `credential` | D | Finds the `mint-read` outcome, then takes the token's plaintext once and clears it (`packages/scope/src/credential-store.ts:169-177`). | The take writes no entry. D1. |
| `repository.read-token`, `repository.resend`, `repository.resend-receipt` | C | Each opens an operation whose answer is an `outcome` entry (`packages/platform/src/destination.ts:308-337`, `:516-528`). | The outcome names the token's handle and end, never its value. |
| `repository.adopt-head` | C, with the Git host as source | The outcome sets the branch head when the host shows the named commit (`destination.ts:294-307`, `:2060-2075`). | The content between the old head and the adopted commit was never proposed or judged. D3. |
| `repository.retry-import`, the `import` field of `room.create` | D in practice | The acts open an `import` operation (`packages/platform/src/directory.ts:276-281`, `:316-327`), and no host accepts it (`packages/scope/src/github-wiring.ts:98-100`, `artifacts-wiring.ts:104`). | The operation waits with no attempt. The import note says nothing is built. D4. |
| Hosted endpoint: `/mcp`, agent enrolment, bearer and retire controls | A for enrolment; D for the rest | Enrolment is an act (`packages/mcp/src/hosted.ts:419-461`); control requests are signed and checked, and are never entries (`hosted.ts:93-117`). | The endpoint stores the agent's private seed, its sessions and its signed envelopes. `retire` clears the bearer and the sessions and leaves the agent's key active in membership (`hosted.ts:517`). D5. |

### 3.2 CLI and operations

| Surface | Class | Evidence | Note |
|---|---|---|---|
| `install`, `create`, `claim`, `invite`, `join`, `act`, `issue`, `merge`, `edit`, `propose` | A | Dispatch at `packages/cli/src/line.ts:90-137`. | `propose` reads only the local Git repository and pushes nothing. |
| `acts`, `log`, `show`, `items`, `apps`, `issues`, `application`, `verify` | B | `apps` prints its head (`packages/cli/src/application-list.ts:33`); `verify` replays locally. | `issues` reads each lane at its own head. |
| `remote` | D | Learns the service host from the credential answer. No scope records it (`docs/cli.md`, lines 512 to 513). | Configuration, not state. Stays outside. |
| `clone` | A, C, then D | `read-token` act, `mint-read` outcome, the credential take, then `git clone` from the Git host (`packages/cli/src/commands.ts:1342-1401`). | It does not compare the clone's head with the recorded branch head. D6. |
| `status` | B and D mixed | It labels itself: "Reads are separate observations; operational rows can change without a native entry" (`packages/cli/src/status-report.ts:97`). | D7. |
| `new`, `check`, `pack`, `dev`, `install --plan`, `mcp` | D: local tools | "Local package commands … do not contact a room" (`packages/cli/src/application-command.ts:1`). | No shared state. D8. |
| Deploy settings that grant authority: `GITHUB_APP_CONFIG`, `ARTIFACTS_CONFIG`, `APPLICATION_TRUST`, `GROW_ARCHIVE_CONFIG` | D | `docs/deploy.md`, lines 25 to 29, 62 and 201 to 214. | A setting decides which register, which releases and which archive the Worker trusts, and no entry records it. D9. |
| Operator "send again" | D | `packages/scope/src/operator.ts:185-213`; no route reaches it (`worker.ts:52-53`). | Writes an attempt and an operator row, never an entry. D10. |
| `scripts/deploy-check.mjs` | D | Reads the metrics API and `/health` (`docs/operations.md`, lines 139 to 151). | Observation only. D11. |

### 3.3 Views, publication and pages

| Surface | Class | Evidence | Note |
|---|---|---|---|
| Card, carousel, record and log views | B, mixed heads | Each read point is a scope, a position and a hash (`packages/mcp/src/views/declared.ts:109`). | Related reads across scopes have no atomic snapshot (`docs/application-views.md`, lines 104 to 108). D2. |
| View acts | A | Signed through the service (`packages/mcp/src/views/session.ts:249-275`). | — |
| Surface view, `window.dapSurface` | B by its API; D by placement | The API is `root`, `signal`, `onData`, `member` and `open` within the declared `opens` (`docs/application-views.md`, lines 242 to 253). | Package scripts run in the same document as the kit's tool bridge (`packages/mcp/browser/surface.ts:64-71`). Package code can then reach every listed tool. D12. |
| Publication from a fold, `publish-file` | C | The destination opens `file-publication`; its push, mint and receipt are outcomes (`destination.ts:2592-2595`). | The scope does not check the text against the item's state ([fold publication](2026-10-13-fold-publication.md), lines 147 to 151). Any application scope of the room can write any path (same note, section 6). The path check refuses only control characters, empty segments and `.git` (`packages/bytes/src/edit-path.ts:11-15`). D13. |
| Pages, `/site/*` | B | The head comes only from destination records (`docs/pages.md`, lines 235 to 242); files are read from Git by commit ID. | Each Artifacts read mints a short token and tries to revoke it, with no entry (`packages/scope/src/site/host.ts:195-202`). D14. |
| `/applications/*` | D: code delivery | Serves trusted presentation bytes when the packet matches the active installation (`packages/scope/src/applications/route.ts:61`). | Content-addressed bytes; the installation state is read with no head. D15. |

### 3.4 Git, capabilities and devices

| Surface | Class | Evidence | Note |
|---|---|---|---|
| Destination writes: first head, judge, push, mint, revoke, receipt, read | C | Each attempt is answered by an `outcome` entry and sent at most once (`operations.ts:9-35`). | Answers are trusted. Base trees and blobs live only in Git. |
| Reservation snapshot | B | Git objects are checked against the recorded ref, tree and file list (`packages/scope/src/destination-host.ts:305-325`). | Writes nothing. |
| `hold@1`, `git-read@1` | C | `packages/derive/src/capability/hold.ts`, `gitread.ts:1-30`. | Neither has a production adapter to a real Git host (`docs/scopes.md`, lines 840 and 842). `git-read@1` replay reads Git. |
| `device-command@1` | A | The answer is the owner's signed preparation, with no outside operation (`packages/derive/src/capability/device-command.ts:131-132`). | It reaches no device (`docs/roadmap.md`, lines 52 to 54). It is an attested answer, not class C. D16. |
| Grow simulator | A | It signs acts and answers device commands through `prepare` (`examples/grow/simulator-host.ts:97`, `:113`). | It checks the signed release and does not record which one it ran. D16. |
| Register host: create and delete a repository, revoke a credential | C | Outcomes carry the host's answer (`packages/scope/src/register-host.ts:1-16`). | The creation write token is kept beside the record. |
| Token gateway and checker service | A | The checker signs ordinary acts (`packages/checkers/src/service.ts:1-18`); the gateway opens a grant only for a token that a sealed outcome made live (`packages/git/src/gateway.ts:44-56`). | Not wired in production (`packages/checkers/src/sandbox.ts:85-86`). |
| Archive passes | D | "No entry, operation or public RPC" (`packages/scope/src/archive-driver.ts:1`). The binding is an act (`bind-archive`). | Passes push Git objects with a write token that no entry records. D17. |

### 3.5 Presence, files, agents and observability

| Surface | Class | Evidence | Note |
|---|---|---|---|
| Grow presence | A | `provision-presence`, `arrive` and `leave` are acts (`examples/grow/presence.ts:9-46`). | No heartbeat. |
| Live presence, designed | D, not built | Volatile acts have no durability ([volatile acts](2026-10-09-shared-language-volatile-acts.md), lines 27 to 31). | D18. |
| Retained files, designed | A for the reference; D for the upload | An entry names a file by digest ([retained files](2026-10-21-retained-files.md), lines 23 to 31). | A large upload is a request before any act (same note, lines 292 to 300), and sweeps and deletes run with no entry (lines 391 to 404). D19. |
| Capture with a stated source, designed | A | Capture acts ([capture](2026-10-21-capture-with-source.md), lines 42 to 113). | The connector's token and reads stay outside; the content is the capturer's claim. |
| Hosted agents, designed | A for team acts; D for model calls | Team policy, `commit`, `say` and `fail` are acts ([hosted Counter contracts](2026-10-15-hosted-counter-contracts.md), lines 130 to 158). | The model call, the spend ledger and the conversation stay private (same note, lines 224 to 227 and 525 to 541). D20. |
| Metric sinks | D | `packages/scope/src/metrics.ts:8-18`; `docs/operations.md`, lines 9 to 11. | Best-effort points; no dap route reads them. D11. |
| `/health` | D | `packages/scope/src/health.ts:53-65`. | Reads settings and the register's readiness with no head. D11. |
| `requests`, `incidents`, `waiting` reads | D, shaped like B | "Three reads are of what is no history … no statement about that head" (`packages/scope/src/reads.ts:23-28`). | Same URI form and an `at` field, as record reads have. Incidents include runtime rows. D7. |

### 3.6 Routes and sessions

| Surface | Class | Evidence | Note |
|---|---|---|---|
| `POST /v1/scopes`, `/acts`, `/preparations` | A | `packages/scope/src/worker.ts:348`, `:354`, `:360`. | — |
| Summary, items, history, entries, log, retained, outbox, item queries, projections, settle | B | Every answer names `at` (`worker.ts:318-371`). | — |
| `/v1/scopes/:s/stream` | B | Pushes each new head (`packages/scope/src/sessions.ts:499`). | Held in memory; a restart closes it. |
| `/v1/scopes/:s/sessions` | D: authentication | Membership answers from its head, with no entry (`sessions.ts:52-56`). | A session lasts at most 600 seconds, and one secret covers every repository of a deployment (`sessions.ts:22-25`, `:42-49`). D21. |
| `/v1/scopes/:s/credential/:handle` | D | The route behind the `credential` tool (`worker.ts:375-379`). | D1. |
| `/v1/demo/creation-offer` | B | A register projection with its head (`apps/room/demo-creation.ts:6-23`). | — |
| `/page/*`, `/brand/*`, the homepage, the jam Worker | D: static | No scope is read. | The room page keeps keys in browser storage (`apps/room/page/src/claim.ts:12-14`). The jam Worker is missing from the entry-point inventory (`docs/security/entry-points.md`, line 3). D22. |
| Internal object calls: `observe`, `nativeBirth`, `archiveItem`, `applicationRoom`, `jobState`, `readiness` | B, internal | No HTTP route (`worker.ts:55-56`). | `jobState` answers current state with no head. |
| Webhooks | — | Design only ([condition subscriptions](2026-10-09-condition-subscriptions-and-webhooks.md), line 3). | They do not exist. |

## 4. Dispositions

Each class D surface, and each class C surface whose source of truth is
outside, has one disposition here.

- **D1. Credential take.** The plaintext of a token never enters the
  record, and that stays. The take becomes an act: `take-credential` by the
  holder's key, judged in a turn, marks the handle taken. The host releases
  the plaintext only to the signer of the accepted act.
- **D2. Mixed heads.** Reads across several scopes have no common position.
  That limit stays, because no global position exists. Each answer names
  every head it read, and views and `room` flag "mixed heads" when the main
  head moved during the related reads.
- **D3. `adopt-head`.** The Git host is the source of the adopted content.
  `adopt-head` opens a manifest of the difference between the old head and
  the adopted commit, and the destination judges it under the rules extents
  as it judges a merge. Until then, `adopt-head` is a stated hole in the
  extents.
- **D4. Import.** Hide `retry-import` and the `import` field until a host
  performs imports. Then the import is class C, and its outcome records the
  imported head and a digest of its file inventory.
- **D5. Hosted endpoint custody.** The agent's seed, sessions and envelopes
  stay outside the record as device custody, as a person's keys do. Three
  changes: `retire` signs `revoke-key` for the agent's key and deletes the
  seed; a bearer is stored by digest only, never in a stored answer; and
  bearer issue is recorded by digest.
- **D6. `dap clone`.** The clone compares its head with the recorded branch
  head, and reports the entry it matches or the mismatch. The clone then
  becomes a checked read of Git content at a recorded position.
- **D7. Operational reads.** `requests`, `incidents` and `waiting` move to
  `/v1/ops/...`, or answer with the label `operational`, so they do not
  look like record reads. A runtime row that changes meaning, such as
  `outcome-conflict`, is sealed as a diagnosis entry. `dap status` labels
  each line as record or operational.
- **D8. Local tools.** They hold no shared state and stay outside. A signed
  packet from `dap pack` enters the record when a room installs it.
- **D9. Authority in deploy settings.** The register, the trusted releases
  and the archive policy become register acts, for example
  `trust-release`. The Worker accepts a setting only when it matches the
  register's head. Code and secrets stay outside.
- **D10. Operator "send again".** No route reaches it. Delete it, or make it
  an act.
- **D11. Metrics, health and deploy checks.** They stay outside by design
  ([observability](2026-10-12-observability-design.md), lines 511 to 532).
  Limits: best effort, no head, no evidence of what happened. Health stays
  a liveness probe.
- **D12. Surface scripts.** Package code runs in a sandboxed nested frame
  with only `onData` and `open`, and a per-instance nonce. Every change is
  already a signed act; this fixes whose intent it carries. Security item
  R8 (`8ced57e3`, screens on their own origin) carries the same isolation.
- **D13. Publication from a fold.** Two changes. Path grants: a package
  declares the path prefixes it writes, and the destination checks them
  against the rules extents, so an application cannot write
  `.github/workflows/` or a rules extent file. Rendered text: a send source
  renders the text from the item's slots, so the scope checks the text
  against its state. Until then, any application of a room can write any
  path, and the text is the signer's claim.
- **D14. Pages.** A read-only binding with no token minted for each read,
  and a rate limit. Pages stay class B.
- **D15. Application code delivery.** It stays outside: bytes addressed by
  their release digest. The answer names the installation's head.
- **D16. Device commands and the simulator.** `device-command@1` is named an
  attested answer: an act, not an outside effect. The simulator records the
  release digest it ran in each answer. A real device needs a host adapter
  and becomes class C then.
- **D17. Archive passes.** Recording each pass would create entries that
  the next pass must archive, so passes stay outside. Two parts enter the
  record: the binding (already an act) and the receipt. The receipt enters
  through floor entries (F2, F3), and the write token is recorded as an
  operation of the archive binding. Until F3 is deployed, the record holds
  no archive receipt.
- **D18. Live presence.** A new named class, "judged, not retained": a
  volatile act is judged and then dropped. It is never evidence.
- **D19. Retained files.** The upload becomes a recorded preparation step,
  and sweeps and deletes become timed or outcome entries. This changes
  slices RF1 to RF4 before they are built.
- **D20. Hosted agent model calls.** A `model-call@1` capability: the
  outcome records the model, the usage, the charge and a digest of the
  reply. The spend ledger becomes a fold of those entries. The conversation
  stays private, as device custody. This design comes before the hosted
  Counter slices that spend money.
- **D21. Read sessions.** They stay outside as authentication. Limits: 600
  seconds, one secret for each deployment, and revocation takes effect at
  the next session.
- **D22. Static routes and browser custody.** They stay outside. The page's
  keys move to a non-extractable store (R8). The jam Worker joins the
  entry-point inventory.

## 5. Slices

Listed and not filed. Each line names its dispositions.

1. Record the credential take as an act (D1).
2. Hosted agent `retire` revokes the key and deletes the seed; bearers by
   digest only (D5).
3. Hide import until a host performs it (D4).
4. `adopt-head` judged as a manifest under the extents (D3).
5. Publication path grants and text rendered from slots (D13).
6. Operational reads on their own path, `outcome-conflict` sealed, `dap
   status` labels (D7).
7. Authority-bearing deploy settings as register acts (D9).
8. `dap clone` checks its head against the record (D6).
9. Archive write token as a recorded operation (D17).
10. Surface scripts in a sandboxed frame, with R8 (D12).
11. Pages with no token minted for each read, and a rate limit (D14).
12. Device answers named as attested, and the simulator's release recorded
    (D16).
13. A `model-call@1` design before hosted agents spend (D20), and the
    retained-file upload as a preparation (D19).
14. Housekeeping: delete operator "send again" (D10), add the jam Worker to
    the inventory (D22), correct the `wait` description, and flag mixed
    heads (D2).

Slices 2, 5 and 10 are security fixes. Slice 2 and slice 5 have no
security request today.
