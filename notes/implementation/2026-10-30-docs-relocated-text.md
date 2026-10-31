# Text moved out of the documentation pages, 30 October 2026

The documentation review of 30 October 2026 removed status reports, landing
evidence, planner rulings and measurement logs from the pages under `docs/`,
because they served the project record and not the reader of the page. This
note keeps that text. Each section names the page it came from, and the
text stands as it did at main `5dc9765f`, with no edits. The review record is
[notes/reviews/2026-10-30-docs-review.md](../reviews/2026-10-30-docs-review.md).

## From docs/architecture.md

From "Authority is an observation, not shared state":

Withdrawal returns `application-revoked` without recording an act. This is
deployment admission, outside the pure judges. Previously accepted keys keep
their receipts and mismatch behavior. Replay, deliveries, timed inputs, and
the settlement of existing work continue under their recorded definitions.
Native platform scopes and proved unpackaged creations have no installed
release to withdraw. Missing provenance makes admission unavailable.

From "Durability: storage, publication and replay":

The optional journal archive runs in bounded alarm passes. A pass reserves
the full ceiling before reading target or source birth proofs, target item
replies, pin metadata, migration reply buffers or retained parent-frontier
payloads. A completed,
checked read releases unused metadata allowance and the matching share of
byte-based input work. Failed reads keep the full reservation. Calls and
other operation counts, the original deadline and the finish forecast keep
their existing bounds; settlement grants no read or publication authority.

Members, rules, issues, retained content, installed application acts and
service replay remain available within the existing scope bounds. Package
installation can still fetch an immutable release independently of the
register's host. There is no repository receipt or journal archive under
host `none`; journal entries stay in the scope's own storage.

From "How it is deployed today":

The Worker's fixed scope index records registered full references and their
genesis hashes. Its census is a deployment observation, not native authority.
Creation, child lineage and census share the host-independent
`REGISTER_SCOPE` selector. A valid Artifacts configuration remains the
legacy fallback. When both settings are supplied, their register IDs must
agree; malformed or conflicting settings close creation before target
lookup. The register pin supplies identity, not host readiness or authority.
Only the key that signed the pinned Register's founding `install` can read
it, through a signed `census` request. The index binds that key to its own
stored Register row and the Register's checked native birth. Membership
sessions grant no census access. Existing address and key windows precede
the census owner's row and proof work, with one charge per request.
This standing predicate does not extend
ordinary signed reads' causal windows or follow later operator key changes.

Census pages have an explicit end and at most 100 rows. The CLI saves only
a complete, nonempty manifest within 4,096 rows. Registrations whose IDs
precede the current cursor can be missed during pagination; unregistered
legacy objects are also absent. The unchanged manifest verifier checks each
saved genesis and reports its actual definition pin or an explicit failure.

| Part | Owns |
|---|---|
| Register and directory | Creating the room's child scopes and, when selected, its repository |
| Membership | Members, enrolled keys, roles and the authority a scope may observe |
| Rules | The room's published configuration and review requirements |
| Lane | The application's work items, versions, reviews and declared messages |
| Destination | Holding unpublished state, or judging publication and recording its outside-operation pending work |
| Git host adapter | Bounded Git reads and authorized host requests. It reports evidence, not decisions |
| Replay | Independent checking of a recorded journal, with its stated coverage and trusts |

The outside-operation driver marks each attempt before it sends a
mutation. A missing reply leaves the outcome unknown and a cleanup task
open. The driver does not send the same mutation again. Private
credentials are kept apart from the public journal. Deleting a token's
plaintext does not prove that the provider revoked the token.
[Configure a Git host](hosts.md#cloudflare-artifacts-host-artifacts)
says how each host keeps and revokes its tokens. A Git commit does not
itself become a dap act, and a recorded act does not itself prove that a
Git write finished.

The checker package's platform-neutral entry supplies runner and signer
interfaces. Its separate Node entry supplies a real containerd runner with a
fresh container per job. Nerdctl manages its lifecycle; ctr preserves each
process's exact exit status. The untrusted job has no external network; an
immutable loopback relay passes its Git reads to the existing host-owned
read-only Gateway. The signing key, token, control records and host files
stay outside the job. Image, environment, resource enforcement and exact
checkout are checked before configured steps count. Private durable run
records recover a terminal result without starting a replacement.
The service's `recoveryGraceSeconds` defaults to 120. It passes the recovery
clock and grace to the runner. Missing or corrupt private records wait inside
that bound. After the bound, an unreadable claim or a corrupt record produces
`run-lost` and the fixed `record-corrupt` diagnostic with its private path.
If the runner cannot establish the directory's ownership and age, it still
waits. A readable claim with unavailable engine state also waits. The service
keeps its job record,
and the runner keeps its run directory. Neither recovery nor a lost decision
starts a replacement or proves physical cancellation.
The supported ctr profile launches configured steps through the immutable
helper. It combines the program's output streams and preserves its exit status. The helper leaves launch failures on its own stderr, so they cannot
supply a completed check result. Trusted Git reads keep their separate stream
and fixed environment checks.
[Run a checker in a container](../packages/checkers/README.md) states the
supported engine, image requirements and operator custody wiring. Source
code alone is not a deployment or a hosted check result.
The opt-in evidence cohort adds source and stage admission through Register
22, Directory 21, Rules 13, Destination 17, Issue 4 and Change 4. Membership
8 and Inbox 1 remain unchanged. Rules
owns the nullable room-service member/key pair and its native generation.
Only an admin can change that pair. Destination observes current Rules and
Membership when it admits and counts a result. Rotation refuses unfinished
room jobs under the earlier generation. Member jobs retain their separate
member authority.
Rules observation revision 21 carries the nullable service mark and its
scoped generation exactly when the pinned Rules data declares
`roomServiceChanged`. Earlier definitions retain their exact observation
shape. The retained extents value carries the policy and certificate;
the authenticated observation supplies the service position. Platform owns
the job binding types and codec; the kernel retains only the two types that
the observation needs. This addition follows the review rule in
[Kernel boundary, section 7](kernel.md#7-rule-for-adding-to-the-kernel).

A lane queues an evidence request before Destination decides it. A selected
`evidence-admit` outcome opens the admitted job and records its immutable
subject, exact commit, tree, base and source facts.

In Issue 4 and Change 4, a checker act records a signed result claim. The
claim leaves the job pending. Destination verifies that claim before it
selects a bound holder or draws its funded result duty. For a room job,
this check requires the frozen marked key. A second key of the same
checker member cannot spend that duty. Member-source jobs keep their
current member-key eligibility rules.

Destination checks current source authority when it counts the result.
Only its authenticated counted notice settles the lane job. The notice
names the exact result fact, binding and outcome. A claim refused before
binding leaves the funded duty and pending job available for the marked
key. No new kernel operand, field, slot or wider bound supports this flow.

Reuse uses a bounded index of admitted results. Disagreement permanently disables reuse for that key
while allowing fresh jobs. Audits run fresh for the current logical request
and name the actual member job whose result they compare.

Destination 17 keeps legacy admission: the runtime limits global entries,
not global bytes, items, records, or requests. Per-entry limits and the
definition's count guards still apply. Whole-scope capacity adoption is a
separate design item after measured deployment ceilings.

NEW WORK carriers keep the counted operations and bound decisions needed
by checks that finish after a publication becomes final. They serve the
published, audit, result, and incident paths. They make no byte-admission
guarantee. Full carrier setup does not gate Git publication. Actual written
receipt proof and exact original carrier identities govern the later plan;
count availability must be proved before opening check work.

Destination records published-check holds in the same transaction that
orders later admissions. Passes clear only the exact hold key at the same
or a later publication. Transitions and overrides have distinct recorded
causes. A failed published job asks its Change lane to create a nested
incident Issue, addressed to current active `issue.triage` holders. Unknown
creation remains pending under the original request.
A timeout changes only its job through literal timed effects. Admissions
judge that state through a bounded, pre-funded pending-job index, so the hold
is effective at the timed entry. A later entry or authorized recovery act
opens its owed notice; until then the timed-out job visibly owes an incident.

The signed job-read route can return a bounded `StageSnapshot` for this
cohort. The host reads immutable Git objects at the admitted commit, checks
their closure and exact triple, and rechecks source authority after reads.
The checker validates the recorded Native admission before handing its
object overlay to the J3 runner. The host supplies bytes; Native rules own
admission. Timeout ends waiting but does not prove that a physical run
stopped. A persisted run may finish late under current authority. A service
cannot launch a first run after its deadline.

`platform:task@1` is not supplied at this base. Real lane hold and Git-read
host adapters are not built.

## From docs/write-an-application.md

From "Validate the package connections":

### Consume the existing published Grow release

The existing signed [Grow demo](../examples/grow/demo/application.dap.json)
predates these seven places. Its exact release `71e10ca9` and publisher
are recorded in [demo-release.ts](../examples/grow/demo-release.ts).
Consumption uses `readPublishedApplicationPackage2` or
`readPublishedApplicationReleaseProof2` for verification, installation,
screens and replay. The earlier shape must have its exact nine semantic
keys and match that one full release digest and publisher. The reader
still checks canonical bytes, all hashes, signature, closure, bounds,
projections and views. It adds no fields to the signed value.

This is an explicit shape selection before validation. There is no retry
after a strict failure, publisher-only exception or caller option to admit
another earlier-shaped release. Complete composition shapes still pass
all graph checks. New authoring and `validatePackage` use the strict
reader and cannot produce or admit the earlier shape. The simulator also
keeps the published release's exact Site and Room definition pins; other
releases keep its current-source identity check.

Retire this bounded consumption path only after a separately reviewed
replacement release, its trust row and the installed-room upgrade have
been commissioned. P1 changes no existing signed packet, release identity,
private publisher key or deployed installation.

Run records from "Validate the whole definition" and "Pin the definition's bytes":

This exact checkout command ran with Node.js 26.11.1 at commit
`fdafc051ae2ddc384c5dea940fe469e677993dec` and exited 0. It uses the
materialized repository workspace packages, separately from the Counter
tutorial's public npm install. Its observed output was:

```
issue: valid, sha256:82a938c8f54ddcac7974ca688ebea7d51c35d2aa70f4e3729965e9f915bc464e
change: valid, sha256:d86c64ae0a570165660a6eb4d75153b8c2f59c9cdaec2ecc789e2c38524a17a2
```

Run on 2026-10-12 at main `d309b6b9`, both exited 0. The pin script
printed:

```
issue  sha256:325cb4f33da9deb1a31d85ba0f1456068d4d9d08009978b779aed70cb08e00ad  46160 canonical bytes
change  sha256:3f0389ba644e6d58e96a352debcc77d01661ffcf349c6db53d0645c2513eae70  59715 canonical bytes
issue-demo  sha256:82a938c8f54ddcac7974ca688ebea7d51c35d2aa70f4e3729965e9f915bc464e  23024 canonical bytes
change-demo  sha256:d86c64ae0a570165660a6eb4d75153b8c2f59c9cdaec2ecc789e2c38524a17a2  43130 canonical bytes
change3  sha256:85cec888905722a8dd051b3eb3388a1b674d82500f1df80044b298d12a285930  55174 canonical bytes
change-demo3  sha256:4945948396a0417aabc5bc66520036d39d179d131aaade1428da55ee96ed7b77  40241 canonical bytes
```

The reference check printed:

```
docs/lanes-reference.md is current
```

## From docs/cli.md

This source change does not establish
that the planner has deployed dap-demo or founded its register; follow the
[dap-demo runbook](../notes/implementation/2026-10-23-dap-demo-part1.md).

The launcher's Node 22.0 minimum is separate from the repository's test
runtime. Built-in Node checks import TypeScript directly, as Replay already
does. For those checks and `npm run gate`, use Node 22.18 or later in the
22 series, or Node 23.6 or later. This is Replay's existing engine range;
the launcher continues to use its installed loader. See
[the testing guide](testing.md) for the gate.

This open selector
stays register@17 even if a later task changes the ordinary default.

Jam must consume genuine published SDK
packages; this CLI bootstrap proves no registry, deployment, microphone,
model, playback or distributed-user acceptance.

Application bootstrap checks on 2026-10-10: the first focused attempt
stopped in the CLI source compiler before any case ran. The explicit
literal lookup repair passed CLI source, CLI test and Scope test compilers,
both existing CLI custody cases, and the existing native application
factory case. The normal Page build then refreshed its generated module;
all other tracked files and the guarded dependency view stayed unchanged.
The ordinary changed-source gate passed: 1,025 Vitest cases, two original
optional skips, and the chained Node checks (8 repository cases and 37
Counting browser cases). These checks establish bootstrap behavior, with
the witness limitations stated above.

The selected-cohort expiry correction was checked on 11 October 2026.
CLI compilation and both existing custody cases passed for application and
Counting, using labelled memory stores and a fake configured service. The
normal Page build passed and reproduced the unchanged generated module.
An initial tool-hash guard typo stopped before any build; that outcome is
retained. The native application case was unchanged and was not repeated.
The corrected Counter parent remains intact. A new ordinary gate and
an independent review of the code are still required for this follow-up.

remove another writer’s replacement ref. Expiry currently retains `cleanup-aborted`; its explicit
`resend` cleanup trigger is awaiting the owner’s disposition (`f1b87a0b`).

Binary content, deletion and rename support remain in the later R5 work.
The demonstration uses two text files.

### What it does not do yet

- There is no page. This is the command line only.
- The documented CLI story is a workerd fixture with real scope rules,
  authority, signed reads and sessions. Its Git host is a stand-in, and
  it drives dispatchers in place of deployment alarms. The deployed
  repository journey still needs its own evidence.
- `edit` carries a file as UTF-8 text of at most 65,536 bytes: no image
  or other binary file. See `notes/implementation/2026-10-07-i5-edit-page-delivery.md`,
  section 3.
- `issue open` has no flag for an issue's conditions: the title is its one
  condition. See `notes/implementation/2026-10-07-i5-issues-delivery.md`, section 5.
- A member cannot merge their own change: `merge` needs `change.merge`.
- `invite --acts` is refused: membership's `invite-member` has no list of
  acts for one member.
- The creator must reach the seat within 15 minutes of the claim: until
  the seat, the creator reads the new scopes by signed reads only, and
  those last for the intent window after the claim. A claim whose
  creation takes longer gives up, and a resumed claim cannot read the
  directory either. See `notes/implementation/2026-10-07-i5-live-ops-delivery.md`,
  section 4.
- An act definition has no description text. The line `acts` prints is
  made from the act's step, item and grant.
- An active member's session reads the destination before its first act,
  including after the creator's signed-read window. The destination checks
  the full confirmed membership reference from its recorded birth directory
  before accepting a session, even before its first retained observation. The first `remote` or `clone`
  need not occur within 15 minutes of the claim. Signed reads without a
  session retain their window. See the destination-read follow-up in
  `notes/implementation/2026-10-07-i5-clone-delivery.md`.
- `git fetch` and `git pull` in a clone have no command that gives them a
  token.

## From docs/pages.md

Plan 025 (`notes/plans/retired/025-2026-10-07-published-pages.md` on `main`) is the
design; this page describes what is built.

  and a link to the versions page. This is the name the register gave the
  repository at the Git host. It is not a human claim name. Carrying a
  signed claim display name into the directory and header remains a named
  follow-up after the demo; the current signed fields do not contain it.

- **A footer.** "Rendered from commit" and the commit's ID, and a link to
  the room's page at `<base-url>/page/`. The footer would also link to a
  verifier's result for the commit, but the Worker keeps no such result,
  so no page has that link.

The checked-in document
[`packages/scope/test/site/completeness/fixture.md`](../packages/scope/test/site/completeness/fixture.md)
puts these constructs together. The `GFM completeness fixture` test in
`packages/scope/test/site-route.test.ts` renders those exact bytes through
Site and follows its companion-page and repository-image addresses. Its
Git host is a labelled stand-in; this test does not show a deployment.
The companion page and SVG beside the fixture can be published with it
for the separate deployment observation.

| Footnotes | Unsupported: the reference and definition stay ordinary text. Footnotes are outside the GFM specification; this fixture records the limitation rather than adding another parser extension. |

- **Native proof budget.** Scope/item/entry sizes are checked in SQLite before
  their JSON is allocated. Selection allows 16 pages of 16 receipt items,
  256 item reads, 16 entry reads, a 1 MiB aggregate native payload and
  at most 4,096 journal entries and 16 MiB of stored journal before SQL JSON
  inspection. Exhaustion is `unreadable` with
  `publication-history-limit`, never absent or not published. Paths allow
  at most 64 segments and 8 KiB of UTF-8 path bytes.

## From docs/operations.md

These settings take effect only through a separately authorized deployment.

The Judge source reads Analytics Engine and public health. It requires a
bound from an observed demo run. The [delivery note](../notes/implementation/2026-10-17-observability-judge.md)
records the outstanding calibration and live API acceptance; synthetic
test rows are not that observation.

Running it still needs the applicable operational scope.

Actual
recording and review are part of delivery.

The intended source is the platform's Durable Objects analytics dataset
for SQLite storage rows written. Its exact dataset and field names are
unverified. The first operator run must confirm them by introspection
after deployment reopens. That reader is a follow-up under observability
request `f57fc4da`, delivered with the first post-freeze deploy check.
No provider query, introspection, token or schema change is part of this
local delivery.

## From docs/usage-report.md

This is the R14 script
partial. Parent request `bb763efa` remains open for individual routes, native
platform versions, and features beyond the current telemetry.

The gate performs no live query. Recorded TEST emissions exercise the actual
metric writer with a scripted sink. Separately labelled scripted SQL API
responses exercise the report parser and decisions. Neither is evidence that
hosted SQL ran or that a real account's data has the expected shape. The
planner's first SQL run exposed the limit-hint mismatch in request
`686f4ec9328d19f727e7f5e1352d0b550e6c595c`. Its observed envelope shape
informed a scripted TEST case; no private provider rows were copied. The
planner subsequently recorded a complete rerun with exit 0, a bounded response,
and no unassigned groups under R14 (`dbf7e6bd`). That run establishes
acceptance for its reported window and selected Workers. This script adds no
telemetry and does not close the parent request's coverage gaps.

## From docs/demo.md

Each shot states the exit code and the lines it expects. The isolated
GitHub rehearsal `github27-freeze-two`, run on 12 October 2026 UTC,
observed the new stale-base row at source `c8cb6c538`. All 27 shots ran;
25 matched, including fourteen consistent scopes. The front-page and
`AGENTS.md` reads returned HTTP 502. One later anonymous read of each
returned the expected HTTP 200, content type, title and page text. Those
later reads are separate evidence; the original run remains failed.
The controlled change and the
stale change name the same earlier published base. Both proposals
take effect before the controlled publication; the second merge follows it. The result's
`staleRefusal` field and transcript report runner-local elapsed milliseconds
from invoking that merge command to its expected `out-of-date` return,
using `performance.now()`. They label the date, service and Git host. This
includes CLI work and round-trip waiting, excludes the fresh proposal and
publication, and is not server-only latency or a native journal fact.
Injected test clocks are labelled separately. The freeze route uses a
new change lane; same-lane manifest replacement remains separate work
under plan 029.

Observed run, runner timer: **2,586.628125 ms**, measured with
`performance.now()` at `2026-10-12T01:40:23.340Z`, against
`https://artroom-rehearsal.inguz.workers.dev`, with Git host `github.com`.
Subsequent signed native reads confirm the shared old base, retained
out-of-date refusal, same proposer, distinct fresh lane and publication
on the winner's commit. Native timestamps corroborate the recorded CLI
sequence; they do not define a global order across scopes.

The older standalone runner delivery lacks that dependency declaration;
it needs the current CLI dependency integration before these commands
are usable from a fresh install.

The Node runner uses actual local Git in the member's `site` clone.
The real-scope rehearsal tests label preparation and branch capture as
stand-ins. Their published and refused outcomes prove the scopes' behavior
from those captured bytes; they do not prove Git capture or a deployment.
The manifest-tree scenario separately witnesses the required check on the
recorded reservation. The demo profile has no required check configured.

The deployment form requires the owner-home `capture-observations.json`
that a successful current runner writes. Before loading the key, captures
bind the service and room hints to the configured full references and
native returned creation facts. Old room files, a changed config/source,
or a home without those observations fail closed. `room.json` alone does
not establish this association. The pictures are screen observations;
they do not replace the native receipts for publication or closure.

4. After the take: `dap verify --all` on the take's room. The current
   deployment capture form supports homes with the runner's bound native
   observations; a manually created take home without them is unsupported.

## From docs/self-host.md

**Measured run:** on 13 October 2026, a fresh deployment produced an invitation
in 31.235 seconds and accepted a guest in 35.481 seconds from the start of the
clone. Login was already complete, and an operator helper entered the
configuration. The guest used an independent browser profile with its own key.
These times do not measure human typing, login, or a second physical device.
The [delivery note](../notes/implementation/2026-10-13-self-host-delivery.md) records the exact
source, commands, results, and remaining cleanup task. Run notes at each step
identify command variations and steps that were not exercised. The commands
below use the current application paths; the delivery note retains the
original run's exact source and commands.

**Run note:** `npm ci` passed. The clone used `--no-checkout`, an explicit
   destination, and a detached checkout of the recorded source commit. The
   unpinned clone above and optional asset rebuild below were not exercised.

**Run note:** login was a prerequisite and was not run in the timed sequence.
   A separate pinned `whoami --account <account-id> --json` check validated the
   existing OAuth login. The plain `whoami` command above was not exercised.

**Run note:** the helper entered this configuration for a fresh Worker and
   namespace after complete inventory checks. Manual configuration entry was
   not timed. Deployment created the new storage namespace.

**Run note:** `npm run deploy:scope` and pinned `secret bulk` passed.
   The helper generated the values in memory and sent them through stdin.
   The shell generator pipeline above was not executed verbatim.

**Run note:** the plan command passed with the deployed address and namespace.
   The helper created a private key directory. The `mktemp` line above was not
   exercised.

**Run note:** the second deployment, `install --planned`, and
   `claim first-room --handle @owner` passed on the recorded source. No recovery
   command was needed. Any later replacement of `claim` with a different command
   needs its own verification. The original timing does not cover that change.

**Run note:** the invitation command passed. Native evidence verified the
   owner's administrator role and the distinct guest key's active membership,
   including the full membership reference and incarnation. The independent
   browser-profile join was automated. A physical second-device run remains
   unrun.

**Run status:** this alternative was not exercised in this rehearsal.

The [14 October Lending runbook](../examples/lending/runbook.md) records the
earlier application-publication deployment. It is historical acceptance
evidence, not the setup procedure for the generic package route.

**Run note:** both npm commands passed for a separate disposable homepage
Worker. Ten anonymous readbacks matched the built bytes, MIME types, and cache
headers, including this guide's homepage link. Custom-domain setup and changes
to application links were not exercised. This was not the project's existing
homepage deployment.

**Run note:** a complete API inventory identified the single owned repository.
Pinned Wrangler deleted it with the added `--force` flag, and a complete API
inventory then confirmed no repositories remained. All nine observed tokens
were already revoked, with none active. The CLI list command and interactive
delete form above were not exercised. A later inventory returned HTTP 403;
its cause and the namespace's current visibility remain unknown.

**Run note:** the helper wrote `selfhost-cleanup-worker.mjs`, removed the unused
Artifacts binding and plain variables as well as the Durable Object binding,
and deployed the deletion migration with `npm run deploy:scope`. A complete
storage inventory confirmed the owned namespace was absent. The shell `printf`
line and interactive Wrangler `delete` above were not executed verbatim.
The Worker was removed through Cloudflare's nonforced service-delete API,
followed by a complete Worker inventory that confirmed its absence.

Pinned Wrangler exposes Artifacts namespace list and get commands but no
namespace deletion command. Cloudflare's published Artifacts REST reference
also lists no namespace deletion route
([Artifacts REST API](https://developers.cloudflare.com/artifacts/api/rest-api/#namespaces)). Removing the repositories leaves a
namespace that was last confirmed empty after repository deletion. Namespace
removal is **unsupported and unrun**. A later listing returned HTTP 403, so the
current namespace state is unknown. A supported Cloudflare operation is still
needed. The test deployment has not been fully cleaned up.

**Run note:** the disposable homepage Worker was also removed through the
nonforced service-delete API, and a complete inventory confirmed its absence.
The homepage CLI deletion below remains unrun. Private keys, browser state,
and original requests were retained with the evidence rather than deleted.

The synthetic macOS custom-anchor, Node TLS, and system curl checks accept
the endpoint and reject a different host's certificate signed with its key.
Real browser trust, Firefox, and iOS remain unverified.

A tunnel needs the exact public HTTPS origin in `PUBLIC_ORIGIN`. Keep the
store and runtime listeners on loopback. Verify the tunnel's client-address
handling and trust before using it; the Mac witness covers the direct
Caddy path.

## From docs/deploy.md

For a planner deployment of Grow with pinned Wrangler from scratch, use:

```sh
ARTROOM_REPO=/absolute/path/to/the-reviewed-checkout
cd "$(mktemp -d)"
npx -y wrangler@4.147.0 deploy --keep-vars --config "$ARTROOM_REPO/apps/room/wrangler.grow.jsonc"
```

Retain any reviewed `--var` overrides for that Worker on the same command;
`--keep-vars` does not establish their correct values. The planner deploys
after exact-head review. Follow
[Run dap in 10 minutes](self-host.md) to deploy it on your own account,
create a room, and invite another device. This page describes the service
settings and the GitHub setup order.

### Public demo Worker

The public room offer uses `dap-demo` at
`https://dap-demo.inguz.workers.dev`, configured by
[`apps/room/wrangler.demo.jsonc`](../apps/room/wrangler.demo.jsonc). Its
Durable Object and Artifacts namespaces are private to this Worker. Keep
the committed Start origin, register ScopeRef and Artifacts register root
exact. `DEPLOYMENT` and `SESSION_SECRET` remain separately held bindings.

For a planner deployment from the reviewed checkout:

```sh
ARTROOM_REPO=/absolute/path/to/the-reviewed-checkout
cd "$(mktemp -d)"
npx -y wrangler@4.147.0 deploy --keep-vars --config "$ARTROOM_REPO/apps/room/wrangler.demo.jsonc"
```

The file sets enforce mode and the reviewed additional creation family:
register 17, directory 16, membership 8, rules 10, destination 12 and inbox 1.
Grow carries that same allowance; Lending carries register 5, directory 5,
membership 4, rules 3, destination 2 and inbox 1. These are exact file-owned
allowances, added to the parser's implicit newest family. The generic
`artroom-scope` file retains register mode and no additional allowance;
its retained-room role is separate from this public offer. Its old
`DEMO_START_CONFIG` remains in the file as historical deployment custody.
After deployment of this retirement source, that old setting no longer
enables a retained creation offer or extra GitHub host authority. This
source change does not delete any deployed setting or secret.

The planner's cleanup remains scheduled for 8 November 2026: deploy the
file without that variable, delete `GITHUB_APP_PRIVATE_KEY`,
`GITHUB_CREATION_TOKEN` and `GITHUB_READ_TOKEN` from the Worker, and record
the versions here. That cleanup is separate from retiring the code.

`--keep-vars` preserves settings omitted from the file. Explicit file
values and reviewed `--var` values still override them and need review.
This configuration does not deploy or change an existing scope's pin. The
planner owns deployment, index verification and any later R7 root cutover;
BR-1 does not replace the fixed register 17 offer or remove its allowance.

### Grow demo Worker

The Grow demo uses Worker `dap-grow` at
`https://dap-grow.inguz.workers.dev`, configured by
[`apps/room/wrangler.grow.jsonc`](../apps/room/wrangler.grow.jsonc).
Its Durable Objects and Register17 are specific to this Worker. It shares
the `artroom-demo` Artifacts namespace and application-content bucket.
The config records `DEPLOYMENT=dap-grow-v1`, the exact register/Artifacts
settings and the single signed demo release/publisher/host trust row.
Set `SESSION_SECRET` separately from stdin.

The reviewed Grow archive entry preserves the existing `DeployedScope`
class and namespace. `GROW_ARCHIVE_CONFIG` pins its directory, repository
name and signed demo release. The room's admitted `archive: "journal"`
binding authorizes its archiver's two internal item reads; no member or
session stands for host authority. The Artifacts binding mints short-lived
archive tokens for individual passes. There is no archive Worker secret.
The room repository remains private, and its repository ID comes from the
directory item. Generic Worker configurations enable no archive.

For a reviewed deployment, use pinned Wrangler 4.147.0 from a scratch
directory and pass the absolute path to `wrangler.grow.jsonc`. The
[Grow runbook](../examples/grow/runbook.md) gives the command, the planner's
20 October provisioning status and the remaining hosted acceptance work.

### Local wiring readiness

`GET /health` reports each host under `wiring.artifacts` and `wiring.github`.
Both `GET` and `HEAD` keep their session and register readiness checks;
`HEAD` returns the same status without a body.
A host is `wired`, or `off` with a finite reason. An absent host setting
is `off` with `unconfigured`. A configured host that cannot wire makes the
response `503`, even when its register is ready. Different configured
register roots remain `ambiguous` and return `503`.

Artifacts checks its complete setting, namespace and binding shape.
GitHub checks its complete setting, PKCS#8 key syntax and required or
supplied optional credentials. The factory, site reader and health use
the same checks. Health returns no key, token, configuration contents or
cleanup map. `wired` means local settings can construct the wiring. It
proves no cryptographic key import, provider connectivity, installation
account authorization or hosted deployment acceptance.

`DEPLOYMENT` has one bound: 1 to 128 UTF-8 bytes. Sessions, demo creation,
health, metrics and screen contexts use that same reader. An invalid
configured value cannot open the local creation bypass, even with
`ALLOW_OPEN_CREATION="true"`. It makes a screen unavailable rather than
falling back to its origin. Truly absent deployment settings retain the
existing local behavior. Metrics use the bounded label `unknown` for an
invalid or absent value. Health still requires usable sessions and a ready
register before returning `200`.

`APPLICATION_TRUST` uses one strict parser for native hosting and MCP.
Its exact release/publisher/host schema and migration are described under
[Trusted application screens](#trusted-application-screens).
Release revocation for acts remains separate R11 work. [The implementation note](../notes/implementation/2026-10-24-settings-readiness.md)
records validation status.

### Operational bindings

The source configuration prepares `METRICS` for the
`artroom_metrics_v1` Analytics Engine dataset and `VERSION_METADATA` for
the Worker version. Console logs use full head sampling; platform
invocation logs are disabled. These are source settings, not a record
that an existing Worker has been changed. Preserve each deployment's
bindings and settings when preparing an authorized release. See the
[metric slot map and request correlation](operations.md).

### Creation versions

This source selects the `archive-device-publication` cohort for new
unqualified installs: register 18, directory 17, membership 8, rules 10,
destination 13 and inbox 1. These proposal versions await the planner's
versioning and rollout disposition. Existing scopes retain the exact pin
in their genesis. Advancing these defaults changes neither an installed
register nor a retained CLI plan.

`PLATFORM_CREATION_PINS` adds approved historical pins for new platform
scopes in one deployment. Supply a JSON array with at most 128 distinct,
complete pins supported by the shipped catalog, within 8,192 UTF-8 bytes.
The newest cohort remains included. Unset, explicit undefined and `[]`
select the newest cohort alone. Null, malformed input, duplicates, unknown
pins or an exceeded bound close new platform genesis.

For example, a reviewed deployment that must create application-family
children from its existing register 5 and directory 5 can add these pins:

```json
[
	"platform:register@5",
	"platform:directory@5",
	"platform:membership@4",
	"platform:rules@3",
	"platform:destination@2"
]
```

Use that example only when the deployment's retained evidence supports
those pins. Inbox 1 is already included. A recognized catalog pin does
not add a supported lineage family: deployed child admission still checks
the `archive-device-publication`, `archive-device-application` or
`application` family and its native
creator proofs. The setting grants no member, credential or host authority.
An index entry permits lookup, not creation.

Within the original routing and authority checks, an excluded pin can
repeat only an exact existing native genesis. The target checks an active
scope, its bounded canonical and hash-checked applied birth, exact scope
address, kind, incarnation, pin and seed, a null genesis predecessor, and
current native support. An invalid setting still permits that exception.
It does not block later reads, acts or replay of existing scopes. Neither
`ALLOW_OPEN_CREATION` nor a missing `DEPLOYMENT` skips the version policy
in a deployed Scope class. Raw engine fixtures without that wiring are a
separate compatibility path.

The fixed public creation offer and `--register-policy open` retain
register 17, directory 16 and destination 12. They do not follow the new
private-install default. A Worker that continues serving that public
cohort needs an explicitly reviewed allowance for those historical pins
and its original register root. Membership 8, Rules 10 and Inbox 1 are
already in the new implicit cohort. Keep the old offer and attempted
request identities exact. The new publication protocol belongs to the
new cohort; these changes preserve the old cohort's evaluator.

After the census implementation is deployed, an enforce-mode Worker also
supports **`dap scope-index census --out FILE`**. Use its pinned Register's
founding install key and the matching local service, Register and repository
Directory configuration. The command saves a manifest only after every page
completes within its bounds and the configured Directory is present. Run
**`dap scope-index versions --manifest FILE`** over that file for the
registered-scope pin report. This leaves the saved-manifest parser and each
entry's existing read authority unchanged.

The planner deploys the reviewed census source to all three hosted Workers
and records the first census and pin report for each. Source tests establish
no hosted census result. Registrations inserted below an advancing cursor
can be missed during its recorded time window, and unregistered legacy
objects remain a gap. A complete registered-scope census proves neither an
empty legacy fleet nor permission to retire a definition version.

For each planned Worker rollout:

1. Retain that deployment's saved R2 manifest and the original CLI directory.
   Confirm the service, namespace and register identity from operator records.
   Do not treat the manifest or the fixed index as a global live-scope inventory.
2. Run the version report with the reviewed CLI and that saved manifest:

   ```sh
   dap scope-index versions --manifest /absolute/path/to/deployment-scopes.json
   ```

   The report rereads the exact listed applied genesis identities and hashes.
   `observedPins` records their platform pins. `usableCreationCohorts` reports
   supported family pin coverage, including the implicit newest pins.
   Unknown pins, unsupported families, unavailable reads or mismatches make
   the report unready. The report changes no setting and emits no policy JSON.
   Register-mode reads may register the exact scopes they authenticate.
3. Review the historical pins to retain for that Worker. Keep
   `ARTIFACTS_CONFIG.registerScope` equal to the exact planned signed install
   admitted by R1. A GitHub register pin alone does not open that API.
   Preserve attempted plans and their original pins and IDs. Do not replan
   an attempted or acknowledged install to make it fit the new defaults.
   R1 admits one configured register root. Allowing both sets of version
   pins does not admit two roots. Use a separate Worker or an explicitly
   planned root cutover for the new register; retain the old root for a
   Worker serving the fixed public offer.
4. Have the planner deploy the exact reviewed source and nonsecret policy.
   Apply the review to `artroom-scope`, `dap-demo`, `dap-lending` and `dap-grow`
   separately, as applicable. Preserve their existing bindings, secrets,
   register pins and reviewed `--var` overrides with the `--keep-vars`
   procedure above. That flag preserves omitted values; it does not populate
   or validate this policy. Deployed objects capture policy at activation.
5. Verify the intended new-creation refusal and the retained existing-scope
   behavior after rollout. Keep the R2 backfill and enforce records separate.
   `/health` does not validate or expose `PLATFORM_CREATION_PINS`; a healthy
   register probe does not prove version admission or configuration completeness.

These steps describe planner work, not a completed deployment. Neither the
CLI report nor this page attests hosted policy, namespace isolation, full
live-scope coverage or readiness for every creation path. Version activation
and the separate rules-version change remain planner-owned work.

#### The earlier order, and its wait

On a Worker with `DEPLOYMENT` set, the parentless creation API now requires
the Artifacts register pin before installation. Preserve the original
planned install bytes and set `ARTIFACTS_CONFIG.registerScope` before
deploying this change; a missing or invalid setting refuses new parentless
creation. Existing scopes keep their definitions and journals. The GitHub
pin alone does not admit a new register on this deployed API. The planner
must check the Artifacts pin and leave `ALLOW_OPEN_CREATION` unset on
`artroom-scope`, `dap-grow` and `dap-lending`, then redeploy each reviewed
Worker. A local or test deployment that needs arbitrary founding may set
`ALLOW_OPEN_CREATION=true` explicitly; no builder deployment is implied.

`dap install <base-url> --host ... --namespace ...` with no plan
works only on an unconfigured local Worker or an explicitly opened local/test
deployment: it creates the register at once and prints the register ID, and the
setting is set after it. Then the register's object may have started
before the setting took effect. A claim's creation is then recorded and
not sent until the object sees the setting. Observed on 2026-10-07, that
took about two minutes each time, so the claim gave up waiting and had to
be run again.

Two things now shorten that wait. The Worker reads its host settings at
each call of its outside port, not once per object. And at each request,
an object that holds an attempt it could not send because its port
refused that kind sends it as soon as the port accepts it, once, with no
restart. A Worker whose setting changed is still a new version, and an
object running the earlier version may keep the earlier setting until it
restarts; a request that reaches it after the restart sends what it
recorded. Planning first avoids the wait.

Finish the initial bootstrap while the operator's install is within its
900-second read window. Before enrollment, the claim's causal read window
also lasts 900 seconds; this delivery does not renew an expired window.
An expired window is not permission to invent a new signed claim.

Keep `DEPLOYMENT` configured on every source deployment and secret update.
When the configuration file omits existing plain variables, Wrangler deploy
needs `--keep-vars` to preserve them. Verify session issuance rather than
assuming a stored session secret is sufficient: both bindings are required.
The recorded builder run initially returned `sessions-unavailable` and
succeeded after both bindings were restored through stdin.

### Published repository sites

The `/site/<directory>/<ref>/<path>` route serves recorded publications.
`HEAD` and the published branch name read the destination's current recorded
commit; the Git host's newer head is not substituted. A complete 40-character
lowercase commit ID can also read an eligible immutable native publication
with a written receipt. Arbitrary or unproved commits and provider-only
branches or tags answer `not-published` before acquiring provider access.
The versions page lists only room-recorded publications. The current room
model records one branch and no tag or named-version registry.

Published files are public without a session, including files published from
private repositories. Other private branches are not exposed by Site. The
existing provider access stays unchanged, and GitHub's stable repository ID
is checked against the room before Git reads. Conditional responses still
validate publication, identity, commit, path, object type and size before 304.
No additional setting or token is required. See [pages.md](pages.md).

### The page

The scope Worker serves the room's page at `/page/` from
`apps/room/page/assets.ts`, which is committed and which the
page package's build writes ([The page](../apps/room/docs/page.md)). Deploying the Worker
deploys the page; it needs no binding, setting or secret of its own.

### Trusted application screens

The host serves installed packages at
`/applications/<directory>/<install-item>/<encoded-presentation-id>/`.
Counter and Lending are maintained packages; the host contains neither
app's route or compiled assets. A new operator-trusted release needs a
committed packet and native room install, without a host redeployment.

Bind the private R2 bucket `artroom-application-content` as
`APPLICATION_CONTENT`, as `apps/room/wrangler.jsonc` declares. The operator
provisions that bucket before the reviewed host deployment and leaves its
public access disabled. The Worker owns CID-keyed immutable content. It
exposes no bucket upload, list, delete, or arbitrary-key route.

Set `APPLICATION_TRUST` to nonsecret JSON rows with exactly `release`,
`publisher`, and `host`. Use the expected release and publisher printed by
`dap pack`, and the lowercase hostname in the immutable Git URI:

```json
[{"release":"sha256:<64 lowercase hex>","publisher":"key_<publisher public key>","host":"github.com"}]
```

A missing setting admits nothing. Malformed or ambiguous rows refuse as a
whole. Rows from the previous two-field schema must gain an explicit `host`;
there is no implicit host or legacy fallback. A host contains no scheme,
port, path, credentials, or noncanonical URL spelling. One release has one
host row. Native resolution and MCP `install_application` compare release
and host before opening a transport. The existing public HTTPS transport
refuses redirects and keeps its original byte, object and deadline bounds.

Before this source is deployed, migrate every configured trust list on
`artroom-scope`, `dap-grow`, and `dap-lending`, including any operator-set
`--var` values. Omitted lists stay closed. Grow's checked-in row adds
`host: "github.com"` without changing its release or publisher. The planner
reviews the migrated nonsecret values and deploys with the existing
`--keep-vars` commands above. `--keep-vars` alone does not migrate an old
row. No builder deployment is part of this change.

Before deploying R11 source, run `dap scope-index applications --manifest
worker-scopes.json --out installed-releases.json` for `dap-grow`, `dap-demo`,
and `dap-lending`, using each Worker's
saved scope-index manifest and matching operator CLI configuration. Keep the
scope index in enforce mode where that mode applies. Retain the manifest path
and digest with the run report. Set one live `APPLICATION_TRUST` row for every
distinct reported release, publisher and host; resolve inconsistent rows before
deployment. An unreadable Rules scope, malformed record or pending installation
makes the report incomplete: investigate it and rerun until complete before
deploying. The command requests one existing operator read session from the configured
membership before reading summaries. This is the one request beyond one
summary GET per listed Rules scope. Other listed kinds receive a saved
`not-applicable` status and no summary request, because they cannot hold native
installation items. This trusts the kind in each validated manifest reference,
as it trusts the manifest for which scopes exist. Skipped kinds are not fresh
host observations. The session stays in memory. Acquisition can
write the host's bounded replay and rate bookkeeping; it creates no history
entry. A valid session refusal or absent membership selects initial signed
reads. A failed or malformed acquisition stops the command. No summary is
retried, and the command sends no registration or business mutation. Existing
server reads can still resume parked work, diagnose archives or recover
alarms. These are host maintenance, not a write-free server snapshot. Rules
summaries bind observed scope references and native pins; they do not reverify the manifest's genesis hashes or prove a
global inventory. The planner records all three runs before further R11
deployments and uses the existing `--keep-vars` deployment commands.

The manifest and report cover only the repository rooted at the operator's
configured Directory, not every repository hosted by the Worker. A complete
empty report for a newly founded operator room does not cover visitor rooms
or their installed releases. Before deploying R11 source, the planner must
record a separately authorized coverage path for any other repositories, or
an explicitly authorized decision to withdraw installations outside the chosen
trust list at deployment.
A Worker-wide listing needs its own request and read authority. This child
adds neither that read path nor authority for other repositories.

Local `dap mcp` and `dap install` also read `APPLICATION_TRUST` from their process environment.
Set the same JSON policy before starting it if package installation is
needed. Other local tools keep their existing defaults. Hosted tool opt-in
and native membership standing remain separate requirements. The host checks the complete signed packet and exact publisher before
storing it. A screen request also checks current trust and its active native
installation. Revoked trust stops screen delivery. The native host also
refuses fresh acts on that installation and its declared descendants with
`application-revoked`. It identifies the exact release through native creation
records, so another trusted release with the same definitions remains usable.
An absent or malformed trust list closes this admission too. Previously
accepted receipts, replay, and pending work retain their original behavior.
No new setting or storage migration is required. The planner deploys the
reviewed source with the existing `--keep-vars` commands and checks the
intended release list before withdrawing a release.

This same-origin route
is not isolation for arbitrary packages: only operator-listed trusted
releases enter. The current host Git transport explicitly refuses SHA-256
repositories before network; it does not fall back to another source.

`DEPLOYMENT` must be the same value used by native read sessions. The screen
context carries that deployment and exact room references; it grants no
membership authority. [The CLI guide](cli.md) covers generic room selection,
URI install, requested default grants, and progress/refusal reads.

The dated `apps/room/wrangler.lending.jsonc` and the library
[runbook](../examples/lending/runbook.md) preserve earlier service provisioning.
They are not the generic M1 deployment target. The planner publishes reviewed
Main and makes the reviewed generic host deployment under the user's current
authorization. Builder's local checks and dry runs create no Cloudflare resource.

### The homepage

The static-assets Worker `dap-home` serves the homepage and the pages for
the room, the library, the Counter, Grow and Jam from `homepage/`.
Run `npm run build:home` to copy its source and the repository brand masters
into `homepage/assets/`. Its Wrangler configuration attaches
`dap.generalbusiness.ai` as a custom domain. The room, library, Counter
and Jam applications keep their own addresses; each page links to its
origin. The homepage lists the room, the library, the Counter and Grow; the
Jam page is reachable by its address but not listed while that demo is
not ready to show.

## From docs/hosts.md

The explicit J4 lane profiles use `hold@2` on Cloudflare Artifacts.
Existing profiles keep `hold@1` and their recorded behavior; deploying the
adapter does not migrate them.

The Page imports the capability rules. After changing them, regenerate its
served module with `npm run build --workspace @generalbusiness/dap-page`;
the Page asset test checks that committed module against the maintained build.

This path supports lanes created directly by the native Directory. Child
concern workspaces, GitHub workspaces, automatic fork deletion at hold end,
and unknown-fork sweeps remain outside J4. The existing explicit `retire`
step deletes a selected fork when its guards permit it. A late confirmed
unselected fork answer opens deletion for that answer's exact ID and name.
The same outcome opens the setup credential's revoke. Setup revocation does
not delay the hold's end or the fork's deletion.
New J4 profiles grant no archive or optional evidence-host permission.

- Workspace hosting for historical `hold@1` lanes or for GitHub. The
  Artifacts successor above is opt-in through new lane pins. Plan 029
  describes the wider lifecycle; the earlier observed fork cost is in
  [the measurement note](../notes/implementation/2026-10-13-fork-cost-measurement.md).

## From docs/celld.md

This driver creates a temporary test TLS proxy, uses a per-client test CA,
and forwards to the actual local celld Worker. It owns a private runtime
configuration and CLI custody. It checks signed MCP creation, initialization,
a room tool, bearer rotation and retirement, then fresh unset and forwarded-only
origin refusals. It closes its processes and retains private test state for
inspection. It does not install trust globally or provide a production proxy,
TLS profile, supervisor, drain procedure or fleet kit. Those belong to H3 in
the [self-hosting design](../notes/2026-10-19-self-hosting-on-celld.md).

The [CI workflow](../.github/workflows/celld-smoke.yml) obtains the pinned
release, verifies its attestation and runs the same driver. A local pass does
not establish that a remote CI job has run.

## From docs/security/settings.md

This reference describes the checked-in Worker code and deployment configurations.
It does not read deployed values, attest a rollout, or test a provider. Secrets
are named here; their values do not belong in this page, a log, or a journal.

Lending's [`wrangler.lending.jsonc`](../../apps/room/wrangler.lending.jsonc)
adds the nonsecret production binding `VERSION_METADATA`, matching Grow
and Demo. Wrangler supplies its value on deployment; health reports
`unknown` when the binding or its valid version id is absent. The planner
checks the actual Lending `/health` version after deployment.

`SCOPE_INDEX_MODE=register` is a transition: an unknown target may be activated
so that its own verified applied genesis can register it. `enforce` refuses
an unknown existing target before target lookup. Checked-in mode, a health
response, and the existence of index code do not prove backfill completion or
deployed enforcement. The separate R2 continuation remains open; this page
makes no unconditional “no object before genesis” claim.

The full stored Register row and its checked founding install determine
the permitted census signing key. Neither a caller-selected root nor a
membership session supplies that authority. This attests no deployed census.

`PLATFORM_CREATION_PINS` adds deployment-approved historical pins to the
hosted publication and unpublished creation cohorts. It does not change existing scopes' pins or admit
another native lineage family. An index entry permits lookup only; the
native target must validate an exact existing birth before an excluded
pin can repeat. [Creation versions](../deploy.md#creation-versions) describes
the saved-manifest report, register pin and planner rollout steps.

This reference changes no trust schema or provider custody.
Deployment and secret-setting procedures remain in [Deploy dap](../deploy.md).

## From docs/security/trust-boundaries.md

This page describes the checked-in deployment configurations and their source owners. It does not establish which version is running, which settings an operator retained, whether secrets are unique, or which namespace IDs Cloudflare assigned. Local configuration readiness and `/health` do not prove provider connectivity or hosted authorization. [Deployment settings](../deploy.md#local-wiring-readiness) describes that distinction.

It is included because it is a checked-in deployment, although it was outside the original five-Worker entry-point inventory. Its actual deployment state is not established here.

### Shared resources and finding 3.13

The 21 October security review described room and Grow sharing as finding 3.13, marked **inferred** at the earlier source head. The current checked-in configuration directly names the following shared resources:

Secret equality, provider-side ACLs, actual namespace IDs, bucket public-access settings, effective operator variables, and deployed versions require hosted evidence. None is inferred from names or from a locally `wired` health result. Deployment and any namespace separation remain separately authorized operator work.

## From docs/mcp.md

Plan 031 is its design; the
delivery note `notes/implementation/2026-10-13-mcp-generic-delivery.md` says what was built
and what ran.

The
design is notes/2026-10-13-hosted-mcp-endpoint.md; this section is what an
operator and a controller need.

This is an admission check, not an R9 trust-schema change.
Existing code-granted,
action-null, and unknown-standing cases keep their admission rules. The
native scope remains the judge of every admitted act.

Before rollout, the planner inventories existing hosted agents and their
required tools (request `92d54432`), chooses each Worker's opt-in and additions, and deploys
only after exact-head review. Repository bindings do not establish live
usage or settings. The explicit deployment choice remains pending. Leaving
opt-in unset closes existing endpoints. The
local slice A implementation and validation, including the passing gate,
are recorded in [the admission note](../notes/implementation/2026-10-24-hosted-mcp-admission.md)
and its review record. The bounded failure window, authenticated control
cleanup and their validation, including the passing gate, are recorded in
[the failure-cleanup note](../notes/implementation/2026-10-24-hosted-mcp-failure-cleanup.md);
deployment of that follow-up is pending.
Bearer expiry and secret-free issuance receipts are recorded in
[the bearer-expiry note](../notes/implementation/2026-10-24-hosted-mcp-bearer-expiry.md).
That follow-up retains its own gate, review and deployment qualifications;
A's and B's passing gates do not establish its acceptance. R15 remains
separate unfinished work.

At cutover, an existing bearer without a valid stored expiry fails closed.
There is no grace period or deadline inferred from activation or an
unrelated update. The planner must explicitly renew live hosted-agent
tokens as a deployment step and record that step. A legacy receipt has
`bearerExpires: null`; it grants no continued token use.

The versioned answer-scrubbing migration runs when each agent or registry
object is constructed. Renewing an agent does not activate its repository's
registry. A dormant registry can therefore retain an old raw creation
answer until it is activated. Before claiming complete cleanup, the
planner must also activate the relevant repository registries through the
existing control plane, or record that dormant cleanup remains lazy and
incomplete. This adds no operator enumeration API. New-code requests cannot
return a stored answer before that object's migration runs.

The [R5C note](../notes/implementation/2026-10-24-hosted-mcp-bearer-expiry.md)
records the implementation and verification status. R15 retirement and
seed removal remain separate.

Recovery of a budget-full
agent is `retire` and a new agent; an `export` control action is owed.

The R5 whole-file validation observed four reads for `issue.comment` and
five for `issue.create`, with the exact routes checked for both cold and
warm calls. All 22 runnable cases passed; the existing Darwin reclaimer
case was skipped. Response sizes in the table remain historical.

Observed run of `packages/mcp/test/budget.test.ts`, taken in the
discovery head (request f9ca5f96). Bytes are the
canonical JSON of each `tools/list` result as sent; every page is asserted
to be at most 256 KiB. Tokens are counted by gpt-tokenizer 3.4.0 with the
`o200k_base` encoding, a proxy: an agent host's own tokenizer gives other
counts.

Journey projections, package installation and desktop-host
registration are separate work. The implementation boundary and fixture
browser command are in the [card-kit note](../notes/implementation/2026-10-18-compact-card-kit.md).

## From docs/scopes.md

### What a scope is: deployment limits and live witness history

creates membership, the rules scope and the destination. Three limits stand.
The deployed parentless API admits only the exact signed register install
pinned by `ARTIFACTS_CONFIG.registerScope`; it refuses an arbitrary install
or a direct directory founding before addressing a scope object. The exact
setting `ALLOW_OPEN_CREATION=true` opens that API for local and test
deployments only; its default is unset. A Worker with no `DEPLOYMENT` keeps
the local founding interface. Child creation still uses the verified
namespace send and genesis judgment, not a caller's claim of a creator.
The Git host in
the creation witness is a stand-in. The hosted service for new rooms is
<https://dap-demo.inguz.workers.dev>, with API routes under `/v1/scopes`.
<https://artroom-scope.inguz.workers.dev> keeps existing rooms only. The
planner must deploy the [new service and planned open register](../notes/implementation/2026-10-23-dap-demo-part1.md)
before the Source configuration becomes hosted acceptance. The destination now
carries every rule needed to answer its creation; a missing rule is still
refused for the whole pinned
version. The initial GitHub adapter checkpoint owed a live run; later
component records observe real first publications and clones on GitHub
and the hosting service. Those observations are bound to their recorded
source versions. The [expanded live witness](../notes/implementation/2026-10-07-expanded-gate1-live-witness.md)
records a separate isolated own-host run of source `6621284d7`, deployed
through notes-only successor `3c5b11791`, with final configured Worker
version `8694dade-1530-4d49-a80a-bfab114b3e08`. It records the first
head and receipt, real operator-token clones, and six authenticated replays
that reported consistent for their stated coverage and trusts, with no
anchors or missing foreign facts. This empty-tree creation run is separate
from the planner's room-issued CLI clone flow. It establishes no native
lane hold, content-change publication, fresh-person signoff or complete I3
journey. A responding URL alone establishes none of those results.

### Browser Start configuration

Browser Start accepts only `DEMO_START_CONFIG` version 3.
The configuration has exactly `v`, `origin`, `deployment`, `register`, and
`definition`. Use `v: 3`, the actual `DEPLOYMENT` value, the full installed
register reference, and `platform:register@17`. Do not substitute a scope ID
for the full reference. The explicit canonical origin is deployment
configuration, not a fixed origin in the code. The dap-demo configuration
uses `https://dap-demo.inguz.workers.dev`.
The register must be open and its recorded host must be `artifacts`.
Its namespace must match both `ARTIFACTS_CONFIG.namespace` and
`ARTIFACTS_NAMESPACE`; its scope ID must match `ARTIFACTS_CONFIG.registerScope`.
The adapter's service hostname is separate from the recorded logical host.

The wire version 3 setting becomes a checked internal version 2 context.
The route returns a version 2 offer. Register17 has no `purpose` field.
The effective request origin must equal the configured origin. An explicit
`PUBLIC_ORIGIN` supplies it behind a proxy; when unset, the URL origin
is used. Forwarded headers supply no identity. A different register,
incarnation or legacy setting produces no offer. The native namespace
still judges exact signed creation lineage; an offer grants no authority.

The artroom-scope Start page links to dap-demo for new rooms. It keeps
Check and Continue for an original creation retained on artroom-scope;
following the link transfers no saved request or browser key.

The client retains old private custody and can decode old version 1 offers.
The server no longer produces offers from legacy setting versions 1 or 2,
including exact-reference preflight for retained Register7 or Register8.
This removes no native history or retained client decoder. An already
submitted operation keeps its exact retained envelope and readback path;
a prepared old descriptor is not silently upgraded to another register.

The old demo setting no longer adds GitHub host authority roots.
Ordinary GitHub authority still uses the register explicitly pinned by
`GITHUB_APP_CONFIG` and its verified destinations. This source retirement
does not restore or remove deployed settings, credentials or native history;
the planner owns deployment and cleanup.

The planner must deploy and confirm one real browser Start, including a cold
enforced-index read. Native fixtures and scripted HTTP responses do not
establish that hosted result.

### Definition versions: the version 1 and version 2 table

The table describes this candidate's supported declarations. Every @1
declaration preserves actual main `1eed91aa`, including its definition-byte
places. It does not establish the executable or judging source of older
journals; that historical correspondence remains owed.

| Definition | Version 1 | Version 2 |
|---|---|---|
| `platform:register` | Main's declaration; creates the version 1 cohort. | The same declaration; creates the directory at version 2. |
| `platform:directory` | Main's definition-byte places on `open-issue` and `open-pr`; missing bytes are `bad-field`. | Preserves those places and creates its three scopes at version 2, carrying the creator handle for the README. |
| `platform:membership` | Main's declaration and version 1 standing. | The same declaration, with version 2 standing. |
| `platform:rules` | Main's definition-byte place on `activate.digest`. | The same declaration, with version 2 cohort and observation identity. |
| `platform:destination` | Main's declaration: no `read-token`, and a first commit with the empty tree. | The act `read-token` and its operation `mint-read`. The genesis keeps the creator's handle, and the first commit holds one file, `README.md`: the repository's name as a heading and the sentence "Founded by <handle> through the room <directory id>." |
| `platform:inbox` | Main's declaration. | None. |

### Delivery boundaries and remaining work

This table names what runs, how it is witnessed, and what remains owed.
The live observations above retain their exact source and deployment
bindings; they grant no source approval, receipt or request closure.

| Boundary | Owner | Current source, evidence and limits |
|---|---|---|
| Grants and membership: who may act, how a grant is shown to be current, revocation | The authority design, then the authority and publication delivery | The `Grant` shape and the check that a grant names the action, the key and the scope. Membership is runnable under its eleven rules. Whether a grant is current is asked of a port, `Authority`, in two phases: a read before the turn, and a decision in the commit on what was read. The production default reads no grant, so none is current. The deployed class, `DeployedScope`, has a real authority (`repositoryAuthority`, in `packages/scope/src/authority.ts`): a membership scope judges its own acts on its own head, and every other scope reads the membership scope that it records. A scope that records none reads nothing, and an act that needs a grant is answered `authority-unavailable`. `packages/scope/test/membership.test.ts` shows it on real scopes, for membership and an inbox. Most other tests use a test authority that is named as one. The expanded live witness above includes the creation of membership and authenticated replay; it establishes no complete live lane-authority journey. |
| Who may read, and sessions | The same | Read sessions bound to one repository, in `packages/scope/src/sessions.ts`, with the client's side in `packages/client/src/session.ts`. The form of a token and of a session request are source choices (I3 deltas, entries ES1 to ES9). |
| Platform definitions: register, directory, membership, rules, destination, inbox, task | The same | `packages/platform` supplies six runnable definitions: register, directory, membership, rules, destination and inbox. Each carries every rule of its marks. `platform:task@1` is not supplied, and a runtime or replay that lacks any rule of a pinned version answers `unsupported-definition` for the whole scope. The rules scope answers observations with its revision, the digest of its extents, and the separately retained canonical value. Platform data now states the subjects that acts, outcomes and result clauses observe; the runtime reads them before the turn and retains what the declared rows require. It also reads named values in declared byte domains. The destination reads its reservation evidence from the retained lane entries, observes membership and the rules, judges the touched extents, and counts its work under the branch and publication holders. Its first-head, receipt and deciding-read rules are tested with the real judges in memory (`packages/platform/test/destination-creates.test.ts`); its computed objects and public ref names are checked with real local Git in both object formats (`destination-objects.test.ts`). These witnesses use a made-up bureau or host answers where labelled. The initial GitHub adapter checkpoint owed a deployed run; the [GitHub component witness](../notes/implementation/2026-10-07-demo-git-host-live-witness.md) later recorded a real first publication and public clone at source `dfaa5395`, while its authenticated replay probes failed. The separately bound expanded own-host witness above records six consistent authenticated replays. Neither closes full I3 or supplies the task definition. |
| Hold tokens, workspaces and their export | The same | The hold item, its epoch and its timed end. `workspaceEffects` in `packages/derive` derives its workspace records when the judge has the code of `hold@1`; the production ports supply that code. The production authority reads the membership scope that a lane records. The directory now declares observations of active definitions for `open-issue` and `open-pr`, and of the worker for `open-task`; the runtime can read those subjects before a turn. Native lane hold-token minting and revocation have a driver, but no production adapter reaches a real Git host for those operations. |
| The rules of the `hold@1` and `git-read@1` capabilities in a running scope: their records, guards, effects and steps | The same | The rules are pure functions in `packages/derive` (`src/capability/`, `src/prepare.ts`), with tests on made-up definitions, and the Git reader is `packages/git`. The production ports hold them (`CAPABILITY_CODE`, in `packages/scope/src/ports.ts`). With only the production defaults no grant is read and nothing is sent outside, so every act and step is refused `unauthorized` and no attempt is sent. A verifier runs them when its caller gives them (`Options.capabilities` and `Options.owners`, in `packages/replay`). The replay command gives none, and answers `unsupported-definition` for a journal that needs them. The tests of a scope have a scripted stand-in, which is named as one, and the lane scenarios T3, T4 and T5b run on the code itself with a stand-in for the Git host. |
| Publication to a destination, and the evidence of an outside write | The same | The destination has all its outcome rules, a reader of retained change-lane entries, the five reservation observation rows, and held counts for operations, requests, items and a bound withdrawal decision. A publication keeps its receipt and pending cleanup after it becomes final, and releases the remaining reservation when that pending work settles. The operations driver reads declared subjects and records the evidence values beside their outcomes, under the pinned owner's byte domains. The first-commit and receipt object builders take the repository's object format explicitly. The production default outside port sends nothing. Explicit GitHub configuration enables register and destination adapters, private credential custody, safe read recovery and retrieval of retained mint replies. The ARTIFACTS binding and ARTIFACTS_CONFIG enable the hosting service adapter; the Worker selects the recorded host, and the demo namespace is pinned to artroom-demo ([hosts.md](hosts.md)). Host authority is pinned to one register and its destinations. Focused witnesses use scripted provider replies and real local Git or SQLite where stated. The expanded live witness records the own-host first head and receipt, their recorded token cleanup answers, and a real clone that advertised both refs. Replay accepts those outside answers as recorded; it does not independently verify provider revocation. That first publication contains an empty tree and establishes no native content-change publication. Native lane hold and Git-read operations still have no production host adapter. |
| Running the two lane definitions, `issue` and `change` | The authority and publication delivery, for the capability rules and the platform scopes that the rows read | The two definitions as data, in `apps/room/lanes`, validated whole and pinned by digest. Both use capability forms, whose code the production ports hold, so a scope can be created under either. With only the production defaults no act and no step takes effect, because no grant is read. W1 to W5 and the demo story run real lanes created by the real directory with production membership authority; their Git host and changed set are stand-ins, and W5 signs the checker answer in the test with no runner. The separate graph fixture uses a made-up directory and test authority. [lanes.md](../apps/room/docs/lanes.md) states the remaining native host and live journey limits. |
| The application: browser pages, the command line, tools for agents | The application delivery | The client handle and the command in `packages/cli`, described in [cli.md](cli.md). Its story fixture uses real authority, signed reads and sessions, a stand-in Git host and test-driven dispatchers. It establishes no complete deployed journey. |
| Deployment and live journey | Demo gate 1, request `225da894` | The recorded source used `packages/scope/wrangler.jsonc`; the current configuration is `apps/room/wrangler.jsonc`. The initial checkpoint owed live evidence; the exact isolated expanded run above now records own-host creation, an empty-tree first head and receipt, operator-token clones and six consistent authenticated replays. Its operator token is a labelled stand-in for the separate room-issued CLI credential flow, and its operator is builder rather than a fresh person. Native lane hold and content-change publication, browser obligations, fresh-person signoff and the rest of I3 remain open. These producer observations grant no source approval or request closure. |
| Budgets in bytes, items, records and pending requests; the numbers of every bound | The proof plan | The judge and replay check the budget of entries, including the reservations of holders, observations, evidence values and bound decisions. The holder amounts are computed in all five dimensions, but judging against the other four budgets is still outstanding. The numbers remain temporary examples; the capacity proof is not complete. |

The earlier model's parked source was removed from main; it remains at
the tag `spikes-final`. Its protocol and policy-pack guides are retired
under `notes/retired-guides/`.

## From docs/kernel.md

### Opening status

This page records the kernel classification from request `2ee805c5` and
its review `3cd820f3`, with the K2, K3 and K11 implementation for request
`30c7c3ec`. Tools are platform services. The host statement applies to code
that has no host (sections 1, 3 and 8). Earlier K7, K8 and K9 evidence keeps
its stated scope.

K2, K3 and K11 are implemented at `fb105fa7`. The structural check, its
paired control, SDK checks and Page build checks passed. Six maintained
source-seal results were adopted in seven map slots at `8bfdc37e`, preserving
the four archive values. All 28 affected compiler roots and all 129 cases
in 25 whole files passed. The ordinary gate at `8658d109` failed; the
whole-file and previously unreached checks subsequently passed. The
[implementation report](../notes/implementation/2026-10-24-kernel-hygiene.md)
records the outcomes and their limits. K1, K4, K5, K6 and K10 remain open;
this work does not change their status. No deployment is part of this
request.

### Section 3: the commissioning request

The request that commissioned this page proposed `packages/scope` and
`packages/replay` as kernel. The test places them outside. The runtime host
can be replaced by another host with no change to the meaning of an entry
(section 8), and the verifier is a second caller of `derive`. The
architecture page's statement that the runtime and the verifier call the
same functions is what keeps both honest, and it is promise 9 below.

### Section 5: status paragraph and the full K items

Each item says what passing takes, and names the request that covers it.
K4 has no request yet. K7 and K8 are closed. K2, K3 and K11 have the
implementation described below. The structural check and paired control
passed, as did all affected compilers and whole-file cases. The
implementation report records the failed gate at `8658d109` and its
scoped continuations as separate results.

- **K1. Platform rules are code that replay needs.** A platform scope pins
  `platform:<name>@<n>`. Replay derives it only with code that its caller
  supplies (`replay/src/verify.ts:1031-1055`), and its report says that no
  digest names those rules (`verify.ts:252-258`). The catalog pins 80
  versions (`platform/src/native-catalog.ts`, one row each): 62
  when this page landed, three more from the versioned publication family
  (`c8a3fb24`), four from the certified rules family (`6852f78d`) and four
  from its hardening (`33690b69`), and three from the unpublished cohort
  (`register@21`, `directory@20` and `destination@16`), and four from the
  opt-in evidence cohort (`register@22`, `directory@21`, `rules@13` and
  `destination@17`). Passing takes one
  of three things: pin
  each version's rules by digest and archive the code;
  move the shipped versions into a frozen part of the kernel; or replace
  the marks with declared forms. Design request `50133470` covers K1 and
  K6.
- **K2. Package graph leaves the production kernel.** The single
  field-assignability implementation lives in
  `derive/src/field-types.ts`, exposed by `dap-derive/field-types`.
  `package-graph` imports that home. Native package validation lives in
  `platform/src/validate-package.ts`, exposed by
  `dap-platform/package-validation`; its 11 existing integration cases
  now live in platform. Caller bounds, profiles, graph decisions and codec errors stay
  unchanged. The corpus harness remains in derive. Request `30c7c3ec`
  covers K2, K3 and K11. The implementation report records the affected
  checks, failed gate and scoped continuations.
- **K3. Application codecs leave `bytes`.** All 20 modules now live in `platform/src/application-codec/`, exposed by
  `dap-platform/application` and `dap-platform/application-v2`.
  The directory preserves the existing native `platform/src/application.ts`
  cohort implementation. Eight whole codec tests move to platform with
  their 32 existing cases and unchanged wire, digest, signature and refusal
  assertions in the implementation. Bytes has no compatibility re-export of the moved
  codecs. Test fixtures remain explicit test-only imports. All 32 moved
  codec cases passed; their evidence covers the registered values and
  contexts.
- **K4. Platform and app vocabulary in `contract` and `derive`.** Examples:
  the closed kind list (`contract/src/scope.ts:19`); the closed capability
  names (`contract/src/capability.ts:19`); the grow device kinds
  (`contract/src/device-command.ts:5`); membership versions 6 to 8 in
  invitations (`contract/src/invitation.ts:3`, `:7`); the rules scope's
  content in observations (`contract/src/observation.ts:81-86`); lane
  actions and a literal destination version in `derive` (section 4).
  Passing takes each name into the definition or capability that owns it,
  as data.
- **K5. The grammar exists twice.** `derive/src/validate/` (22 files)
  checks a definition before use, and the judges read the same forms again
  when an act is judged: guards (`validate/guards.ts:112-220` and
  `guards.ts:182-239`), effects (`validate/effects.ts:95-195` and
  `effects.ts:349-466`), and sends, handlers, timed rules, fields,
  operands, observations, markers, bindings and capabilities in the same
  way. Passing takes one grammar table that both read. Request `e949b0df`
  covers it.
- **K6. Replay names platform versions and lanes.** For example destination
  versions 4 to 7 (`replay/src/verify.ts:1740`, `:1817`) and membership 8
  with register 17 (`replay/src/archive.ts:157-158`). A replacement
  verifier would have to copy them. Passing takes these names into platform
  data that the verifier reads. Request `50133470` covers it with K1.
- **K7. `hold@1` numbers sit outside the capability.** Closed by request
  `7b19837c` at main `b52ca7e3`. The numbers are now `derive`'s
  `HOLD_VERSION` (`derive/src/capability/hold.ts:267`). The runtime
  re-exports them (`scope/src/ports.ts:308`), and the CLI copies no number.
  Before, the runtime chose them and the CLI copied them by hand.
- **K8. `dap verify` cannot replay `device-command@1`.** Closed by request
  `7b19837c` at main `b52ca7e3`. `derive` has one capability table, with
  `device-command@1` (`derive/src/capability/code.ts:6`). The runtime
  serves it, and the CLI gives the same table to replay
  (`cli/src/commands.ts:1186`). Before, the CLI left `device-command@1`
  out, and replay reported a grow room's scopes `unsupported-definition`.
- **K9. Bind validation to the definition format.** Replay previously
  checked each pinned definition with the current validator. A stricter
  validator could make an old history unsupported. Request `2e714fd7`
  binds the compatible check set to `artroom-definition-1` (section 7.2).
  The named corpus, owning checks and paired stricter-check control passed.
  The exact-head gate and review are still required before K9 closes.
- **K10. The platform Worker's entry lives in an application.**
  `apps/room/worker.ts` re-exports the runtime's Worker, and its
  configuration is the platform's. Passing takes the entry and its
  configuration into a platform home. Design request `1fcd6692` takes it
  into its scope.
- **K11. The dead example is removed.** The two tracked files
  below `examples/demo-repo` and the command/link in the retired policy-pack guide
  are deleted. The guide states the removal. Dated notes and reports are
  unchanged.

### Section 6: promise history

This list grows only by review. Promises 10 and 11 joined it when their
notes landed (`25e1248e` and `5cd53dcf`).

### Section 7: per-request rulings

Request `0c3091fa` adds the existing hold capability's second version under
ruling `adb1a6ed`. A confirmed head or fork outcome changes the records that
runtime and replay derive. Those rules belong beside the ledger in the
kernel: a replaceable host adapter can supply an answer, but cannot decide
what that answer means. The adapter, authenticated repository discovery and
private credential custody remain services in `scope` and `git`.

The addition declares `hold@2` in `contract` and adds four exports in
`derive`. Each belongs in the kernel because it determines how runtime and
replay interpret the same recorded definition and entries:

- `HOLD_V2` names the separate `hold@2` record and operation owner.
- `holdCapabilityV2` supplies that version's derivation rules, including
  head and fork outcomes.
- `workspaceOwner` selects the family from the declared version. A caller
  or host cannot choose another family for the same definition.
- `hasAnyWorkspace` checks that the selected family has a listed hold guard
  or effect. Declaring a version alone does not enable workspace steps.

The first hosted staging observation is `29f6d5bc`. Its preparation opened
stage and mint operations, with no outcome in the observation window.
The registered-only census did not establish the complete legacy absence
required to extend `hold@1`, so `hold@2` has separate head and fork rules.
The old version retains its rules, maxima and record meanings. Both use the
existing forms, item states and operation ledger. The bare capability name
remains `hold`. This adds no scope kind, entry form, byte domain or K item.
Existing lane pins and native evidence identities remain fixed. New J4
lane pins select version 2 explicitly and grant no archive policy permission.

Ruling `e7962aa7` adds the `setup` purpose to the existing token record for
each version 2 fork attempt. Its handle names that exact attempt; plaintext
stays in private host custody. A confirmed fork answer moves the token
directly from `minting` to `revoking` and opens the existing revoke operation
in the same outcome. A refusal ends that attempt's token; an unknown answer
leaves it `minting`. A late confirmed unselected answer owes both its fork
deletion and its setup-token revoke. These two added effects belong in the
kernel because runtime and replay must derive the same cleanup obligations.

The fork rule reserves 12 entries: six for deletion and six for revocation.
The head rule reserves 78: two possible outcomes for each of three fork
attempts, each with its outcome entry and 12 cleanup entries. Its maximum
is four effects and one operation; the fork rule's is five effects and two
operations. The creating-fork record reserves 78 for version 2. Version 1
keeps its existing reserve of 42. Setup tokens do not consume the holder's
workspace-token allowance or block the hold's end or fork retirement.

Exact-head review must check owner dispatch, closure and effect bounds,
first selection at the actual held state and epoch 1, late unselected
answers, and replay's ancestry and live-root retention. A late fork answer
owes deletion only for the ID and name in that immutable answer; it does
not change a selected or final fork record. Automatic fork deletion at hold
end and sweeping remain outside this request. This addition closes no K
item and relies on the filed J4 ruling for its kernel placement.

Request `121a8913` places the fixed-slot equality index in derive's view
and fold. A range guard's complete count determines whether an input is
judged, refused or left `guard-incomplete`. Runtime and replay must derive
that decision from the same state and equality rule. A platform service
cannot supply the count without becoming an additional authority over the
record. The index covers any declared fixed slot and names no platform
definition or application field. It adds no entry form, reference kind,
definition format, capability or K item. Its rows are derived storage and
do not change checkpoint bytes. Exact-head review must assess the complete
counts, equality through journal floors, reconstruction and transaction
ownership under this section.

Rules observation record revision 21 is permitted by ruling `1bc4f7fd`
under this section. Its nullable `roomService` and scoped
`serviceGeneration` occur exactly when the pinned Rules data declares
`roomServiceChanged`. Earlier definitions retain their exact records.
The observation is the kernel form for what a judge may know of Rules;
its native-selected position belongs to that authenticated record. A
retained policy value alone cannot establish the position. Contract keeps
only the two type-only interfaces needed by the record. The job binding
vocabulary and its codec belong to platform. This addition changes no
timed form, fold or replay rule and closes no K item. The exact-head review
must assess this reason and the definition-specific record checks.
A head that removes a kernel promise also needs this review.

Request `30c7c3ec` makes two file/export additions under this rule, while
adding no new kernel capability:

- `derive/src/field-types.ts` and the `./field-types` export give
  `fieldAssignable` its home beside the validator that already used and
  re-exported it. Field assignability is a grammar rule for derivation,
  so it belongs in the kernel rather than a replaceable platform service.
- The bytes index now exports the existing `Signer` type from
  `bytes/src/signer.ts`. That type belongs to the signature domain bytes
  already owns. It was previously exposed through `bytes/application`;
  the type-only root export lets the relocated platform codecs use it
  without keeping application codecs in the kernel.

### Section 7: resolver detail and checkpoint results

`node scripts/check-kernel-boundary.mjs` parses production imports,
exports, require calls and dynamic imports, including erased type edges.
It follows exact workspace exports and relative cross-package paths.
Only contract, bytes and derive are permitted workspace targets; the one
machine list is `KERNEL` in that script. Their production dependency,
optional-dependency and peer-dependency pins are checked as well.

The following marked table is the sole machine-readable approval list for
external production libraries. Workspace pins must match the actual
coordinated package versions; external pins must match this table, the
installed package and the lock. Unknown exports, computed module targets,
unresolved paths and unsupported package/compiler aliases are refused.
The resolver models the inherited Bundler mode with package exports. It
refuses configured `baseUrl`, `rootDirs` and `moduleSuffixes`, other
resolution modes, and disabled package-export resolution rather than
assuming those settings resolve the same production source. Loader
references must use supported direct calls; extracted aliases and computed
loader names are refused. The `module` loader object may be used only for
a supported direct `module.require` call; object aliases, destructuring
and other member chains are refused.
A new library or changed pin needs review of this page, not a broad prefix
exception in code.

Tests and tooling are outside this production boundary. Production code
cannot import an excluded test/tool file to evade it. The corpus stays in
derive as a test harness, with its explicit nonkernel fixtures. The
ordinary `npm test` path runs the structural check before Vitest and its
two compact parser/resolver Node witnesses in the existing Node check
list. The structural check and its two parser and resolver witnesses
passed at the implementation checkpoint. Three public-release module
checks also passed. The paired control added a temporary platform import
to `derive/src/index.ts`. The checker refused it and named that file, and
the original file was restored. The control is not committed.

The structural check addresses dependency placement, not byte compatibility
or native authority. The implementation report records these results,
the passed moved codec witnesses, the failed gate at `8658d109` and its
scoped continuations separately. The workroom records the exact-head
review and landing decisions.

### Section 7.1: filing date

Work filed before this rule took effect (22 October 2026, workroom assert
`1bd7dde8`) states its kernel placement when it reaches the front of the
queue. A head that adds to the kernel names the K item that it closes, or
the planner holds it. Assert `1bd7dde8` records how the rule applies to
each item filed at that time.

### Section 7.2: definition-format validation

Request `2e714fd7` places definition-format validation in the kernel.
Validation decides whether a pinned declaration can be used to derive its
history again. A replaceable service cannot change that decision without
changing the meaning of the record.

The public validator keeps its bounded preamble and dispatches by the
declaration's `format`. `artroom-definition-1` selects the compatible checks
in `derive/src/validate/format-1.ts`, including the grammar and shared pure
semantic helpers that those checks call. Moving a check to another helper
does not remove it from this compatibility rule. Unknown nonempty string
formats are refused as `unsupported-definition`, with the actual format in the
reason. The public API, caller-supplied bounds, profiles and native owner
options retain their existing roles.

A stricter check that rejects a previously admitted declaration needs a
new authorized format or a version of the optional part that owns the
check. Existing versions remain available for replay. A correction that
changes admission also needs an explicit compatibility review; calling it
a bug fix does not settle that question. This work adds no format, scope
kind, platform name, capability, tool family or record model. Pinned
declaration bytes, byte domains and digest identities remain unchanged.
The [definition contract](../notes/2026-10-04-scope-and-replay-contract.md)
section 6.1 states the binding.

The named corpus registers complete positive declarations from shipped
applications, examples, fixtures and retained histories, with their
validation contexts and existing pin witnesses. Valid declarations used
in refused actions or package graphs remain included. Raw constructors
defer validation until each named test runs, so the paired stricter-check
control can fail at a known corpus row rather than during module import.
The corrected corpus passed 1,217 named declaration rows and its registration
check. The other 66 owning Node files passed 618 checks, including the format
and replay boundaries; the full owning typecheck passed. A single paired
control added a six-character name minimum. The raw `derive/shared/small`
row passed without that change and failed by its named corpus assertion
with the change. The exact validator source was restored.

These checks support the registered declarations and contexts, not every
possible format-1 value or every history-dependent bound. The
[implementation note](../notes/implementation/2026-10-23-definition-format-validation.md)
records the original failures, exclusions and evidence limits. The ordinary
gate at the exact candidate and its review remain separate requirements.

### Section 7: the Commons addition, as it stood at main `c8c7b631`

Request `41f77a01` and rulings `7a2beda6` and `33f95e72` add the `commons`
scope kind and platform name, and the `reference` field type. A note's
text bound, media text bound, reference shapes, and list bound determine
whether runtime and replay accept the same entry. Those checks belong in
the contract. A service cannot decide what a recorded entry means. A
package cannot supply a Commons that must exist before any package is
installed. Its `note` act has no guards, effects or operations.

`ReferenceValue`, in `packages/contract/src/definition.ts`, gives the
runtime, replay, and clients a shared type for document and entry
references.
`isReference`, in `packages/bytes/src/field-value.ts`, checks that closed
shape and the fragment's UTF-8 byte bound. These exports define which
values a recorded field accepts. A host service cannot replace those
shared checks or decide their meaning after the entry exists.

`INVITATION_KEY_MEMBERSHIPS`, in `packages/contract/src/invitation.ts`, adds
the exact pin `platform:membership@9`. That version keeps the private
invitation proof protocol. Clients use this shared list to choose the
redemption fields for the exact native version. A host service or
application cannot choose a different credential form for that pin.
The addition recognizes the version; it grants no invitation authority.

A `reference` contains exactly one document digest or entry `FactRef`,
with an optional bounded fragment string. The kernel checks its shape
and byte bounds. It neither resolves its target nor interprets its
fragment. The reference creates no `FactUse`, supplies no authority and
changes no closed `FactRef` form. Typed, binding entry references remain
the `fact` field type. Media interpretation, source reads, threads and
tables belong to the host. This addition closes no K item. Review must
assess these boundaries and the versioned creation cohort at the exact
head under this section.

The fixed-slot equality index is a known structural reader of reference
values. In a fixed slot, it walks nested values and records a local
dependency when an entry `FactRef` names the same full scope reference.
That dependency lets it refresh equality keys when the local sequence and
hash metadata become available. It supplies no grant and creates no
foreign `FactUse`. A Commons note's `about` field is not a fixed slot.

Ruling `f4495460db9e28115ddde40406a2320bc4396a69` keeps reference fields
in the existing `artroom-definition-1` format. Installation requires an
explicitly supported native family at Rules 14 or a later version. Older
Rules reject the field with the named refusal
`reference-requires-rules14`. Unknown future pins remain closed until
their family explicitly opts in. The shared field type does not migrate
an older room's native installation policy.

## From docs/security/entry-points.md

### Opening provenance

This reference inventories the Worker entry points named by D1 and the local celld project in this repository.
It describes source at this revision, not a probe of deployed settings. It closes
security finding 2.5 in request `6dd06d03`.

### Workspace discovery and seal history

J4 adds internal `nativeBirthByName` discovery for Directory, Register and
Destination births. The deployment's indexed namespace checks the exact
known scope and kind before target lookup. The receiver bounds preparation
and bytes; the workspace service then verifies the full returned reference,
genesis and creation lineage. It uses no legacy source fallback and grants
no read session or caller-selected repository authority.

The existing credential route also accepts a lane whose declared definition
includes `hold@2`. Its membership gate remains in place. Private custody checks the
preparing key, actual holder, current instance, epoch, expiry and selected
fork before a one-time handoff. Historical hold profiles and the route's
gate class stay unchanged. The entry-point check seals the discovery and
wiring owners, `workspace-host.ts` for custody, `workspace-lineage.ts` for
creation lineage, and `native-birth.ts` for birth decoding. Their seal values
come from the maintained parser after source review. The first J4 gate
failed on the old seals; its targeted follow-up remains separate from that
failed run. The three workspace owner seals were added after checker review.
Fork setup credentials remain private under their exact original attempt
handles. Their token records owe revocation through the existing operation
ledger; the provider adapter makes no independent retry.

### Archive row diagnostic

The fixed `archive-row-diagnostic-v1` line reports bounded stored archive
state and the platform alarm once per object activation, through existing
ingress before recovery. It adds no RPC, HTTP, member, MCP or operator caller.
Its internal reader does no recovery or writes. Existing cold constructor
effects remain; the planner accepted this warm observation boundary. A tail
is an observation channel, not authority to restart an archive.

### Serving windows: startup measurements

The three Worker configs name the four nonsecret `SERVING_*` overrides; the
implementation note records bounds, kernel review and the original local
startup measurements: Page had 10 fixed-owner Signed admissions; hosted MCP
legacy and modern had 3 and 2. Session dispatch is counted separately. These
are attributed native fixture observations, not browser DOM, production
address or throughput measurements; union startup verification is pending.

### Union evidence

This is structural source coverage. The separate R8 branch records adopted
owner seals, scoped compilation and inventory checks, native binding checks,
nine local browser custody cases and four rendered Page cases. R12 records
its own scoped index, serving and startup checks. Those branch outcomes do not
validate this source union. The union now has its actual adopted owner seals;
four affected compiler roots and 14 cases across seven whole files passed.
Its maintained Page build, separate DATA comparison and four rendered Page
checks also passed. Its original ordinary gate passed hosted startup and
Page freshness, but failed two MCP documentation-inventory assertions.
Final review must record the narrow correction and downstream Node stages
separately. These local outcomes and their original heads are recorded in the
[union implementation note](../../notes/implementation/2026-10-22-security-union.md).
Hosted deployment and operator rollout remain separate
obligations; no hosted isolation claim follows from the local browser cases.

### Read-token custody decision

Planner decision `21a8e35b103dd0280ea711d78d167db0d355cafd` accepts partial
legacy coverage. An untagged row needs bounded retained current-incarnation
mint-read, opening and confirmed-outcome proof before enrollment. Rows with
missing, pruned, oversized, invalid or unproved old-incarnation evidence remain
retained because no safe retained discriminator separates them from write
credentials. A held legacy read confirmed after its once-through backfill scan
also remains retained; confirmation alone does not enroll it. All newly minted
explicit read tokens are queued. No complete legacy cleanup is claimed.

## From docs/security/definition-authors.md

### Existing witnesses and their limits

These are references to existing assertions, not a report of a new run for this page:

| Source | Named witness or table | What it covers |
|---|---|---|
| [Definition format tests](../../packages/derive/test/definition-format.test.ts) | `unknown formats refuse with their actual name and never invoke a profile` | Unsupported formats do not select format-1 checks. |
| [Validation tests](../../packages/derive/test/validate.test.ts) and their [table](../../packages/derive/test/definition-corpus/validate-table-data.ts) | `the definition validator` table | Declared positive examples and explicit refusal codes, including unknown forms, names, bounds, fixed slots, and nascent guards. |
| [List-guard tests](../../packages/derive/test/forms-guards.test.ts) and their [rows](../../packages/derive/test/definition-corpus/forms-guards-variants.ts) | The `anyOf`, `has`, and `each` three-result case | Empty `each` passes, empty or absent `has` fails, filters omit elements, and incomplete scans stay incomplete. |
| [Presented-fact tests](../../packages/derive/test/forms-beside.test.ts) | `a presented fact is fetched and checked like a fact field, a guard ties it to the signer, and the entry records it and uses it; one that is absent skips its guards` | The optional proof can be absent; a supplied proof is checked against the signer. |
| [Judgment tests](../../packages/derive/test/judge.test.ts) | `a report after a handover is attributed to both performers, both holders and their principals` | Authors and their principals are excluded by `notIn`; an eligible outsider is not. This does not test a missing signer. |
| [Extent tests](../../packages/platform/test/extents.test.ts) | `a list of extents is 1 to 8 records of exactly six members, inside the bounds of each: a name of lowercase letters, digits and hyphens, a pattern with no empty name and no control byte, and bounds that count bytes` | Shape validation accepts zero approvals. Extent judgments in this file use explicit input data, not native scope execution. |
| [Rules-scope tests](../../packages/platform/test/rules-scope.test.ts) | `publish keeps the extents that it states, whole, and the scope holds them; a list outside the bounds of an extent is refused bad-field; one without the fixed minimum of the rules extent, without exactly one extent that has no pattern, or with a check that the act does not hold is refused by name` | A zero-approval docs extent publishes, while the protected rules minimum and catch-all checks remain. These are pure platform judgments. |

The zero minimum, missing-signer exclusion, and empty fact-condition behavior above follow the cited validator and evaluator branches. This page does not claim a separate dedicated runtime witness for each combination or prove that any deployed definition uses it. It also does not claim that validation checks an author's intent or replaces review of a definition's effects, sends, and authority.

## From docs/use-cases.md

Written from a draft of 9 October 2026, regrouped on 13 October 2026
against main `d1b845f8`, and revised on 14 October 2026 against main
`f20df342` for plain language. On 20 October 2026, against main
`13193f31`, cases 46 to 51 were added from the design notes they cite,
and the former private-views group was split into groups 3 and 4 by one
test: whether one party holds the shared decision for the others. The
grouping is a judgement from reading the documentation and the
definitions. No case was built or run for this page, except the four
marked **Built**.

The frame of pointing and claims was added on 27 October 2026 against
main `6f47bf98`.

## From docs/testing.md

This page says what a test in this repository is for, where it belongs, how
to run tests while you work, and what to run before a review. It replaces
the earlier practice of whole-suite reruns and mutation sweeps, which cost
hours per review and proved little (request `ecbc722a`).

The existing Lending story runs only in `scope-lending`, after `scope`.
It uses the same real Worker, SQLite, read sessions, story acts, expected
assertions and deadlines. It needs neither the clone server nor maintained
application capture setup. Its repeated mixed-project projection failure
remains masked; a fresh single-file runtime bounds reuse without proving
the original cause, physical draining or universal cross-file cleanup.
Both the root and Scope package entrypoints select the story exactly once.

This isolates the observed T2-to-T19 unsafe-abort interaction in the pinned
test runtime. It does not fix that native helper bug or prove mixed-cohort
cleanup or physical draining. Captured frames locate IncomingRequest task
cancellation through the native abort, but do not identify the actor or
context. The extra Worker startup costs time and memory; the denial project
starts no clone fixture or Git server. Current full-gate cost and the approval
of the exact commit under review remain separate obligations.

The cost of the tests is judged by two figures, for the whole gate and for
one edit taken to review (request `ecbc722a`, as amended by `da68c9a9`):

The rule applies to heads filed after ruling `fcab078d` of 25 October
2026.

## From docs/public-sdk-release.md

The active eight-package plan contains contract, bytes, derive,
package-graph, git, platform, client and replay. Git’s two pure subpaths
provide platform’s checkout and tree proof types. The tools build and
inspect JavaScript and declarations. They do not publish, install application
packages, configure accounts or deploy a service. Recorded six-package outcomes below
remain historical evidence.

The six-package amendment is request `fecf7160fd4a8c4b9219d7713a11036ff48db85e`,
promise `ffae23e0f56d0a17d773264588f98940f04cd963`. It follows the public
verifier handoff reported in `008c3cfd35443d23c44ad13a64af867282aee2c8`.
Its source, capture, producer, checker, browser bundle and gate outcomes
were unrun at that delivery. Frozen four-package attempts remain separate.

The source-authoring request is `23e6d5e8e2773f11c2271f86d3c1cbf019dd5cf0`,
promise `a01fe0506ee046908c7a9d97c18df388223c02a0`, under public-release
request `7b31f843fac3bcc5f64b0b5caaad72f1f8191082`. Writing the code alone
establishes no successful build or public consumer. Those checks were
unrun at that delivery.

After the three strict contexts, the checker uses the supplied physical native
esbuild 0.28.1 binary and reviewed SHA-256 to bundle the same compiled replay
journey for the browser. Its bounded metafile must show only the owned journey,
compiled stages and copied exact dependencies, including actual replay and
platform code, with no external modules. The binary is checked before and
after use. This is a real browser closure build; it does not prove browser
execution, public installation or physical sound.

The first complete six-package stage built and packed all six packages, and
its checker reached consistent compiled replay, the exact missing-directory
control, all three strict contexts and the browser build. It then refused
JSONata's synthetic `<runtime>` input edge. The pinned esbuild 0.28.1 parser
inserts that already-resolved helper import; this edge is not a module left
in the output. The successor accepts only its exact path/kind/three-field
shape on the byte-bound copied JSONata input. Every other external input,
every external output import and every emitted module reference still
refuses. The earlier stage and refusal stay immutable; this source delivery
does not claim a successful successor checker.

The public platform catalog must match every selected target and foreign
genesis pin. Main f722 supports the explicit F1 register5/directory5/membership4
cohort, not Counting register6/directory6/membership5. If Jam selects later
versions, publish matching reviewed platform code first. Do not infer a cohort
from `NEWEST`. Supply the actual `hold@1`/`git-read@1` code as both capabilities
and owners where needed, with the deployed parameters; absent versions or
owners remain unsupported. The verifier's mode, coverage, foreign facts,
redactions, limits, incomplete outcomes and external-world trusts remain intact.

Later verification must still include the affected source/compiler checks,
one build/output check and one changed-head normal gate before independent
review. Do not repeat platform permutations. On failure retain the owned
stage and diagnostics, fix source and review the new subject; no implicit
retry, deadline widening or publication follows.

The release owner assembles and verifies source/artifacts. A separately
verified namespace administrator/publisher controls publication. A deployed
operator controls the HTTPS URL, version, bindings, migration and real
membership/definition/read provisioning. GitHub App authority does not
establish npm publishing rights. Publishing the eight packages is not atomic;
complete the set and verify all public versions/integrities before calling
it an available coordinated release.

Jam and starter consumers must install exact **published registry packages**
with a public lockfile and use a real deployed URL. Producer stages or local
tarballs cannot substitute. The later isolated public consumer must prove
Node loading, strict NodeNext/bundler declarations, browser bundling and
actual browser execution without repository aliases/private SDK. A single
provisioned external smoke must preserve independent source/log read
custody, two-actor conflict, exact durable context-qualified retry and one
actual supported Jam interaction. C1/IA and C4/I5 keep their own storage
adapter ownership. The one-singer J0 amendment is effective; no obsolete
second-singer requirement is introduced here.

N3's current-model design/adoption, publisher/operator availability, cold
outsider commands/help/cost, public verifier support, native authorization,
read custody, durable adapters, browser hosting and local-versus-hosted
fidelity remain separately owned and open. Browser cross-origin access is
not established by packaging. This producer adds no CORS, grant, hosting,
onboarding or universal durable-outbox protocol.

### Eight-package closure checks

The actual-manifest witness remains positive for every planned package. It
checks the graph dependencies, platform application subpaths, client
application subpath, coordinated graph dependencies and Replay's exact
source-only platform omission. Unknown exports or dependencies and changed
excluded paths or pins still refuse. Replay bin/git inputs and outputs remain excluded. Git admits only the five
pure implementation files listed above; both public subpaths must exist.
The owning witness checks actual source references and rejects a host module
in either JavaScript or declarations. It does not compile or pack the SDK.

The producer already compiles packages in plan order and admits only completed
predecessor stages. Its generic loop needs no alternate resolver or source
alias. The checker includes Git in its finite input set and requires package-graph
in the real compiled browser closure. Its compiled journey exercises graph
field inclusion in both directions and resolves the bytes application codecs
and client compatibility export. NodeNext and Bundler type contexts use the
same public subpaths. These updated witnesses are unrun at this source delivery.

### Module-reference repair

Request `0c3828a0ca7b50dda540dc1c9023950c03b72668` rests on dap
promise `git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:4291f1e6caa20c865f5c2c983418c408b9d65895`. The original one-run
`5e1f` producer failed before compiler/pack; its generic diagnostic did not
name the specific refusal. Static inspection and the retained lexical
reproduction locate false module references in quoted `from` capability
data. The failed attempt and its partial stage remain immutable.

The producer and output checker now share an internal token/span reader.
It recognizes literal import/export/type/dynamic module references without
reading data strings or comments as module clauses. Declaration rewriting
uses only those literal offsets, leaving other bytes unchanged. Unsupported
computed module forms refuse explicitly. No parser dependency, SDK source,
manifest, lockfile or compiler ancestry guard changed. This source-specific
reader is not a JavaScript evaluator or general code-security boundary.

One coherent own Node witness uses the actual capability data, genuine
module clauses and an owned declaration rewrite/refusal journey:

```
node --test scripts/public-release-modules.test.mjs
```

The case, syntax checks, new-head producer and output checker are all
unrun when that code was delivered. A later guarded `c4bd` attempt passed the
one reader case, then compiled and packed contract, bytes and client. Derive
emission failed with `TS2304: Cannot find name 'structuredClone'` in its
exported testing fixture. Its resolution-only pass was not semantic type
acceptance. The complete checker was never dispatched; all three packs and
derive's partial output remain unvalidated local artifacts. Neither failed
attempt may be retried or reused as a completed release.

### Fixture clone type boundary

Repair request `0da42a1126c471750cec1ccaf3adf17f4c94ee7c` rests on promise
`git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:1694fa7a6b5005d72c3085c1ca037a4a21cc49ec`.
Planner adopted the module-local boundary in
`git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:5bdb4183391917025edeb8c9b23786e625034360`.
The existing testing fixture now declares only its native one-argument clone
of `DeclaredDefinition`, privately inside the same module. It supplies no
implementation, polyfill or replacement clone semantics. It adds no global
augmentation or public clone API. Manifests, exports, lock, bytes/web and
compiler options/ancestry remain unchanged.

The complete checker now inspects actual emitted fixture JavaScript and
declarations for the existing native call, erased private declaration and
unchanged exported `variant` signature. Its existing compiled-output journey
calls the real compiled helper, changes a nested cloned value and checks
that the original small fixture retains exactly its canonical bytes.

All repaired-head imports, cases, compilers, packing and complete output
checks were unrun when that code was delivered. A later exact `7695` attempt
passed the reader case and all four packages' resolution, emission and
offline packing, and sealed its producer manifest. The checker passed its
archive and emitted fixture ABI guards, then the compiled journey failed:
the clone witness narrowed the text slot to 39 while write/edit fields
still answered 200. The actual validator refused both assignments. The
journey failed before any of the three strict consumer contexts were
dispatched.

The successor changes only the witness's nested slot maximum and expected
value to 201. This preserves assignment from the original 200-byte fields
and stays inside the declared text bound. The real clone/name mutation and
original canonical-byte preservation assertions remain. All successor
checks remain unrun; the frozen failed attempt and its output stay intact.
A future attempt needs its own exact reviewed source, fresh owned stage
and release. One changed-head gate and normal independent review are still
owed before landing; no public publication follows.

### Six-package validation outcome

The checked source is `f1a5a434f595ef37ada7a0cbde518f87d1f430ba`, tree
`44da261079aba5428721bd1be04fb12a080d3625`. Original gate handle 90198
completed with exit 0: whitespace, typecheck and tests passed; 1,005 Vitest
cases passed with the two original recorder skips, followed by eight passing
Node cases. Install was skipped under the exact existing lock. Whole time was
89.66 seconds wall and 144.59 seconds CPU on this machine. These figures are
not a global speedup, physical-drain or deployed acceptance claim.

Earlier native capture attempts remain separate: the first passed the one
Node case and Scope test compiler, then failed collection on a temporary alias;
the second refused mismatched temporary config metadata before any phase;
the third reached consistent native replay, then failed the retained input's
mistaken bare definition-name assertion without exporting a capture. The
corrected capture's handle 93455 passed the affected compiler and whole native
creation case. Its public canonical capture is 96,949 bytes, SHA-256
`f01d6a82fb57f72bceb8160b9f0bf6f3a8b32a443bbf87a112b044efbd190833`:
five complete prefixes, 18 entries, 12 retained inputs and 11 verified foreign
facts, with no anchors, missing dependencies or redactions. The complete
report retains every clock, source-head, delivery, observation, outside-host,
bounds and exact platform-code trust. It is a labeled local native fixture.

The first producer stopped at the missing platform README after four packs;
the second built all six packs but its checker refused the synthetic runtime
edge after replay, strict contexts and bundling. Both stages remain intact.
The corrected handle 12018 passed the affected existing Node case, fresh
six-package producer and complete checker. Compiled replay matches the native
report exactly; withholding the directory yields its precise missing fact.
Strict NodeNext, Bundler and opt-in ambient contexts passed. The browser bundle
contains 118 actual compiled inputs; SHA-256 is
`c66c72b8c0351396113e8a092442b639247a522c47871d9119d1d9477b8deb6a`.
The bounded public proof is
`/private/tmp/artroom-public-sdk-six-stage3-public-proof.json`, SHA-256
`f931de5d38544a16034e572a10760c5c2df3eec214accac7c43bf96b6cedf328`.

This outcome update changes only this guide; checked code, tests, settings,
lock and assets remain identical, so no gate is repeated for it. All six
`0.1.0-dev.2` artifacts remain local staged outputs. Verified npm publication
authority, six public versions and integrities, a cold public consumer and
actual Jam provisioning, browser, model, audio, recovery and Cloudflare
acceptance remain owed. The request for the code closes none of those whole-demo
obligations.

## From docs/roadmap.md

Written 13 October 2026 against main `d1b845f8` and dap-spike main
`9d738e2e`, and revised 14 October 2026 against main `f20df342` after
review. Revised in part on 15, 16, 19, 20 and 21 October; rows that
those revisions did not change still describe `f20df342`. The states come from reading the documentation, the definitions
and the spike's reports. Nothing was run for this page.
