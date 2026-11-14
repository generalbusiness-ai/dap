# NF-5: the browser keeps requests in the one custody

Planner request `c288c917` moves the browser onto `Custody` and retires `Kept`
and `AttemptJournal`. It builds on C1 (`21f6d3cd`), which gave `byTarget` and
the change signal to `memoryStore`. Ruling `0767a3f9` R5 names the parts of the
browser store: IndexedDB, `navigator.locks` and `BroadcastChannel`. Ruling
`72b1d654` item 3 asks this note to state the terminal records that the browser
store keeps.

## The browser store

`browserCustodyStore` in `packages/client/src/browser-custody.ts` implements
`CustodyStore` with `byTarget` and `observe`, so it is a `ClientCustodyStore`.

| Part | Browser API | What it does |
|---|---|---|
| Records | IndexedDB object store `records` | Holds each live record as its canonical text, with its phase and times. |
| Archive | IndexedDB object store `archive` | Holds each archived terminal record. `read` finds it there. |
| Segments | IndexedDB object store `segments` | Holds the outcomes that left a record's inline list. |
| `lock` | Web Lock `<lock>:record:<id>`, `ifAvailable` | Gives the lock of one identity, or null while another tab holds it. A closed tab releases its locks. |
| `exclusive` | Web Lock `<lock>:exclusive` | Runs the admission against the 256 unresolved records alone. |
| `observe` | `BroadcastChannel` named `<lock>` | Calls each listener after a write in this tab and after a write in another tab. |

`write` puts the record and reads it back in a second transaction. A text that
differs throws. A browser with no IndexedDB or no Web Locks keeps no record:
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
an earlier signing on `not-found`, never the latest one. The page therefore
keeps the keys that the person gave up in its own slot and leaves those records
out of its pending request. Each such record stays unresolved in custody and
counts toward the 256 unresolved records. The returned status of client note
section 6 is the place for this case.

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

## What the browser witness needs

The witness of the user path runs in a real browser against a real room. It
needs these steps:

1. Join with an invitation while the reply of the join is lost, for example
   with the act route blocked after the request leaves.
2. Reload the page. Check settles the join. The scope's journal holds one join
   signed by the device key, and the custody record holds that same envelope.
3. Repeat for one Counter act.

The witness reads the custody record from IndexedDB database
`dap-counter-custody-1` or `dap-lending-custody-1`, and compares the envelope
with the entry in the journal.

## Not in NF-5

- The named MCP aliases of NF-3 stay. The NF-3 note says NF5 removes them, and
  request `c288c917` does not name them.
- The `byTarget` read scans the live records. The live records are bounded by
  the 256 unresolved and the 64 terminal records, so the store has no index.
