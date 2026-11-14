# NF-5: the browser keeps requests in the one custody

Planner request `c288c917` moves the browser onto `Custody` and retires `Kept`
and `AttemptJournal`. It builds on C1 (`21f6d3cd`), which gave `byTarget` and
the change signal to `memoryStore`. Ruling `0767a3f9` R5 names the parts of the
browser store: IndexedDB, `navigator.locks` and `BroadcastChannel`. Ruling
`72b1d654` item 3 asks this note to state the terminal records that the browser
store keeps.

## The browser store

The [14 November source follow-up](2026-11-14-nf5-storage-follow-up.md)
replaces the draft segment layout and close behavior described below. All
follow-up compiler, browser, control, model and gate checks remain UNRUN.

`browserCustodyStore` in `packages/client/src/browser-custody.ts` implements
`CustodyStore` with `byTarget` and `observe`, so it is a `ClientCustodyStore`.

| Part | Browser API | What it does |
|---|---|---|
| Records | IndexedDB object store `records` | Holds each live record as its canonical text, with its phase and times. |
| Archive | IndexedDB object store `archive` | Holds each archived terminal record. `read` finds it there. |
| Outcomes | IndexedDB object store `outcomes` | Holds one row per spilled outcome position; `lengths` records each segment length. |
| `lock` | Web Lock `<lock>:record:<id>`, `ifAvailable` | Gives the lock of one identity, or null while another tab holds it. A closed tab releases its locks. |
| `exclusive` | Web Lock `<lock>:exclusive` | Runs the admission against the 256 unresolved records alone. |
| `observe` | `BroadcastChannel` named `<lock>` | Calls each listener after a write in this tab and after a write in another tab. |

`write` checks its put's bytes within the write transaction and waits for
completion. Generic Custody awaits that store write; it adds no separate
readback. A browser with no IndexedDB or no Web Locks keeps no record:
each call rejects, and `Custody` signs nothing. A browser with no
`BroadcastChannel` signals the writes of its own tab only.

### Terminal records the browser store keeps

The browser store keeps each unresolved record live, and the newest 64 terminal
records live. `BROWSER_TERMINAL_LIVE` holds the number.

A terminal record leaves the live records when a terminal write makes more than
64 live. The store then moves the terminal record with the oldest `updated`
time to the archive, in the transaction of that write. `read` still finds an
archived record, so `settle` still works on it. `byTarget` and `unresolved`
list live records only. A write of an archived record makes it live again, for
example a `resubmit` of an archived refusal.

No record leaves the archive. The store has no age rule, because the browser
clock is the person's clock. A record leaves the browser only when the person
clears the site data of the origin.

## One page's requests

`browserRequests` in `packages/client/src/browser-request.ts` keeps the
requests of one signer at one target in `Custody`. The page gives it three
trusted ports: `post` sends one envelope, `settle` reads the receipt of one
envelope, and `recorded` checks that the scope's own record holds the exact
signed request.

- An acceptance that `recorded` cannot confirm is a lost reply. The record stays
  `unknown`, and a later read settles it.
- A receipt from a read that `recorded` cannot confirm settles nothing.
- `send` with a new key signs, keeps the envelope and sends it. With a kept key
  it sends a `prepared` record, sends an unresolved record's same bytes again,
  or gives a terminal record's outcome and sends nothing.
- `settle` reads. It signs and sends nothing.
- `unresolved` lists the unresolved records at the target through `byTarget`.
  A reloaded page finds its requests there.

Each request key is 16 random bytes in base64url. The intent carries the key as
its `idempotencyKey`, so each signing of one request carries the same key.

## Joining

The join slot of `browserJoining` holds `{ v: 2, seat, key }`. The page writes
the slot before it signs, because the target of a join is the membership that
only the invitation names. After a reload the slot names the custody record,
and Check settles the same envelope with a read. A slot whose key has no record
says that nothing was signed, and Check removes it. `JoinStore.clear` names the
outcome, so a host keeps the seat of a join that took effect before the slot
goes. The custody identity of a join has `membership: null`: the device is not
yet a member.

## Lending

The Lending gateway finds its pending request with `unresolved`. It keeps one
request at a time, as before. A final outcome needs no clearing: `Custody`
keeps the record, and the record is no longer unresolved.

**Give up** cannot close the record. Custody has no transition for an
unresolved record whose latest signing is dead and not found: `settle` closes
an earlier signing on `not-found`, never the latest one. Such a record stays
unresolved, and it counts toward the 256 unresolved records for good. A member
who gives up 256 times fills the store, and `Custody` then refuses each new
request with `full`, reason `count`.

The page keeps the keys that the person gave up in its own slot and leaves
those records out of its pending request. The slot stays until planner request
`43de81ee` amends the client note to say how such a record ends. That request
lands before C3 (ruling `cb6e8523`).

## Counter

Counter keeps its joins, commands and voice reports in one store per origin,
`counterCustody()` in `apps/counter/browser/storage.ts`, database
`dap-counter-custody-1`.

- **Commands**: the pending command is the newest unresolved record at the
  Counter scope whose intent kind is not `fulfill`. Check settles it with a
  read. Resume sends it only while it is `prepared`.
- **Voice reports**: the voice slot holds `{ completion, key, audioStart }`.
  The page saves the slot and reads it back before it signs. A slot whose key
  has no record was never signed, so Resume can sign and send it. When the page
  loads the slot, it reads the phase, the signings and the refusal reason from
  the custody record.
- **Corrections**: a correction of a refused report signs again under the same
  key with `resign: true`. The page corrects only after `guard-failed` or
  `revision-moved`. The bounds of the record replace the eight attempts of the
  journal: after eight refused signings, `Custody` refuses the ninth with
  `full`, reason `signings`, and signs nothing.

## No stored record migrates

The cutover retired the rooms that the old records name. Each page removes an
old record that it finds and tells the person, with `RETIRED_REQUEST`:

- `browserJoining` removes a version 1 join slot on `retired()`, Check,
  Continue and Join.
- Lending removes its old `act:<scope>:<key>` slot when the gateway opens.
- Counter removes an old voice slot, which held `envelope` and `journal`, and
  its old `command` slot with `StageGateway.retired()`, before the voice
  controller starts.

## Witnesses

| Test | What it shows |
|---|---|
| `packages/client/test/browser-custody.test.ts` | A lost send in one tab settles in a second tab with the same envelope. The archive past the bound. The change signal across tabs and the record lock. A browser without Web Locks signs nothing. IndexedDB, Web Locks and `BroadcastChannel` are stand-ins in memory. |
| `packages/client/test/browser-request.test.ts` | The cases of the retired `Kept` protocol on `Custody`: the phase after each answer, a read-only Check, Continue with the exact envelope, signed text after a lost answer, and a reload that settles the same envelope. |
| `packages/client/test/browser-joining.test.ts` | A lost join settles after a reload with one signing. A retired slot is removed and nothing is sent. |

| `apps/counter/browser/*.test.ts` | The Counter cases on custody records: the key before signing, the correction under `resign`, the ninth refused signing, and a retired slot. |

`packages/client/test/request-attempts.test.ts` and
`examples/lending/browser/custody.test.ts` are removed. Their cases tested the
retired formats. `browser-request.test.ts` carries each case of the second file
that still applies. Counter loses the two cases that drove the retired
dispatcher directly and the journal race. `browser-request.test.ts` and the
custody lock now cover what those cases checked.

## The browser witness of the user path

`apps/room/page/test/custody-witness.mjs` is the witness of request
`c288c917`. It runs outside the gate, on the pattern of `two-devices.mjs`:
playwright-core and wrangler stay outside the checkout, and the script serves
the local Worker of `apps/room/celld`. The command line installs a register,
creates the room and makes an invitation. The script bundles
`custody-witness-page.ts` with esbuild and serves it at `/custody-witness/` on
the Worker's origin, so the invitation's service is the page's origin. The page
runs `browserJoining` with `browserCustodyStore` on real IndexedDB and Web
Locks.

1. The page joins. A route handler on `POST /acts` lets the request reach the
   Worker and then drops the reply.
2. The page reloads, and Check settles the join with a read.
3. The script reads the custody record from the page's IndexedDB and the
   membership's journal with the owner's session. It checks one record,
   `accepted`, with one signing; one `POST`; one journal entry under the join's
   key; and that entry's signed bytes equal to the envelope in custody.

The builder ran the witness one time on this machine, on battery power, from
21:52 to 21:53 EST on 13 November 2026, at this head's parent `6839776002`
plus the witness files. It reported no failures:

| Step | Observed |
|---|---|
| First press, reply dropped | `unknown`; 1 record, `unknown`; 1 `POST` |
| Check after the reload | `joined` |
| After Check | 1 record, `accepted`, 1 signing; 1 `POST` in all; 1 journal entry under the key; the entry equals the envelope in custody; the slot's key is the record's key; the slot is empty |

The join run above did not cover the Counter act. Ruling `657e4217`
keeps the hosted Counter witness owed after NF-5 lands and the planner
deploys its release. No local Counter half or adapter enters NF-5. This
replaces the packet, trust and local-base-room preparation of `bc826726`,
and the local preview half of `2a59af97`. None of that preparation ran.

The source read established the shared custody boundary:
`counterCustody` in `apps/counter/browser/storage.ts` calls the same
`browserCustodyStore`, with IndexedDB database `dap-counter-custody-1`
and Web Lock `dap-counter-custody`. Both Counter entry paths call that
function. The earlier Counter Node witnesses passed 52 cases, as builder
act `371b0dd8` records. That is historical evidence; this source-only
follow-up runs no tests and changes no Counter production code.

No browser run before deployment covers these installed-screen paths:

- `counterEnrollment` in `apps/counter/browser/installed.ts`: invitation
  validation, browser key creation, join custody and saved-device handoff.
- `applicationScreenTransport` in
  `packages/client/src/application-gateway.ts`: the verified sandbox
  host, physical route, request headers and response-location check.
- `main.ts` in `apps/counter/browser`: installed context loading,
  enrollment UI, `mountDevice`, and its `nativeGateway` options for the
  installed application, reads, head stream and act fetch.

`apps/room/page/test/custody-witness.mjs` now takes the deployed screen
address as its argument. Hosted mode starts no local Worker and performs
no install, pack or preview. The planner supplies an invitation in a
private file for a new member permitted to participate, after installing
Counter in a `base` room with its configured sandbox host.

The unrun hosted script opens that real Counter screen, enrolls through
its invitation UI, selects a real English (US) voice, and loses the reply
to one `participate` act after the Worker records it. It requires the
page's unknown/unresolved message and one unknown IndexedDB record. A
reload and Check command must settle it without a second Counter POST.
The script uses the browser's volatile session reader through the
verified screen gateway to read the scope journal. It requires one act
under that actor and key, with signed bytes equal to custody's envelope.
The reader token stays in process memory. The report contains counts
and equality results, and screenshots follow enrollment's removal of
the private invitation text. Detailed failures stay in the private
witness directory, outside evidence.

Hosted command, after deployment only:

```sh
PLAYWRIGHT_CORE=<existing-playwright-core-directory> CHROMIUM=<Chrome-executable> \
WITNESS_DIR=<new-private-directory> WITNESS_EVIDENCE=<new-evidence-directory> \
WITNESS_INVITATION_FILE=<private-invitation-text-file> \
node apps/room/page/test/custody-witness.mjs <deployed-Counter-screen-address>
```

Browser plugin is not available; the script extends the existing
Playwright harness with real Chrome. The `privacy` guide of
`modern-web-guidance` shaped the report: collect the minimum evidence,
not credentials or raw request bodies. No local server, browser,
compiler, build, packet or test ran in this follow-up. The hosted run
remains unvalidated. Its failure reopens NF-5; NF-7 closes only when it
passes after deployment (ruling `657e4217`).

The witness calls no export of the two `storage.browser.test.ts` files.

## Not in NF-5

- The named MCP aliases of NF-3 stay. They leave in a separate head, NF-6
  (ruling `cb6e8523`).
- The `byTarget` read scans the live records. The live records are bounded by
  the 256 unresolved and the 64 terminal records, so the store has no index.
