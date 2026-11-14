# NF-5 storage and context follow-up: source only

This checkpoint follows continuation promise `11ad3b377f2ff807ed5dc9be85b79c038d00acaf`
from baseline `9ea739ea9d102f3972558ec2429071a185f94e23`. No compiler,
test, control, model, browser, formatter, build or gate ran for these edits.
Every new witness below is **UNRUN**. No dependency view changed.

The full pre-code proposal remains attached as `proposal` to builder request
`2a65dcffc89bd43675bb3c07536dc30c41d6cacb`. It covers schema history,
bounded segments, malformed rows, lifecycle, notifications, async authority,
real browser witnesses and Voice correspondence. The source follows planner
rulings `14609eb8335b24ffdb794ea8a0a4e30e6ec4ed9a` and
`3505c36b38ee0e63d5438102da48cfad1879e99c`, rather than the proposal's
conditional draft conversion or lease-drain options. Request
`df42ed848bce9cdfe196d040c1df4c8025d13265` records the lifecycle question.

## First released storage layout

The planner attests that each deployed Worker came from main and no deployed
commit contained `browser-custody.ts`. The draft layout ran only in local
harness profiles. The planner checked deployed commits `64112e45`,
`5b342ee9`, `7135dc39` and `a76764a7`. This checkpoint relies on that
deployment statement; a source read alone did not prove it.

Database **version 2** is the first released layout. Its exact stores are:

| Store | Key | Value |
|---|---|---|
| `records` | Identity digest | Live canonical record and validated list projections |
| `archive` | Identity digest | Archived canonical record and validated projections |
| `outcomes` | `[identity digest, position]` | One stored outcome |
| `lengths` | Identity digest | Safe integer outcome count |

Every store uses out-of-line keys and no auto increment. Open checks the
version, exact store names and key settings before admission can reach a
signer. Only a new database with old version zero creates the layout. An
existing unknown layout stays unreadable and untouched: no reset, rename,
conversion, draft `segments` store, or fallback to absence. Browser rows
admit the current custody record version 2 only; generic Custody's existing
trusted-store version conversion stays unchanged.

Counter keeps the application-owned name `dap-counter-custody-1`; Lending
keeps `dap-lending-custody-1`. Their version changes distinguish a draft
profile. The dedicated join witness uses `custody-witness-records-v2` so
that its historical local profile cannot pass as this layout. No production
key, enrollment or private-slot database changes. Existing main consumers
use `artroom-counting-private-2`, `dap-counter-enrollment-2`,
`dap-lending-private-2` and `artroom-page-private-1`, not these custody
databases.

These schema versions differ from retired join slots. Planner request
`c288c917536b22122c22a7355ab07a639bcc12a0` permits removing a slot for a
pre-cutover retired room and telling the person why. It does not permit
removing malformed or current-room custody.

## Bounded history and malformed data

A segment append checks safe integer positions, owns its input, and changes
tail rows and length in one readwrite transaction. It rejects a gap before
`at`, deletes the native key range from `at` to the old length, then
appends contiguous rows. Repeating the append replaces an interrupted tail.
The owning record still commits separately; the note claims no atomicity
between the segment transaction and that record update.

A page reads length metadata and a cursor confined to the requested position
range. It checks contiguous keys and the exact expected count. Missing rows,
bad metadata and orphan rows with missing metadata fail closed. Missing
metadata counts as an empty segment only after a bounded existence query
finds no position row. The record reader also rejects a length shorter than
the record's accounted spill. No operation clones an entire history array
before slicing it.

For history length `n`, the draft copied O(n) outcomes for every small
page and append. A page now holds O(limit) returned outcomes; an ordinary
append holds O(k) input outcomes. Native range deletion can still touch
O(n-at) backing rows. Live record lists still scan their bounded live set;
archives remain retained without an age rule. No archive scan or unrelated
index enters this repair.

The browser boundary shares `readStoredCustodyRecord` and
`readStoredOutcome` in `custody.ts`. They reuse existing wire guards and
the client's existing answer/settlement guards. They admit storage shape,
not signature authority or receipt-history proof. The browser still requires
its trusted receipt port to verify the exact request. Generic trusted
stores retain their previous read/version behavior.

For each live or archived wrapper, the browser compares actual primary key,
wrapper id, identity digest, target projection, phase and times with its
parsed record. It uses `getKey` to distinguish a missing row from an
existing row whose value is undefined. Null wrappers, text `null`,
unknown record versions and malformed nested signed/outcome/step shapes
cannot become absence. Lists validate every live row before filtering,
sorting or archive selection. A malformed phase or target cannot disappear
from capacity or target lists.

The browser owner's fixtures now use valid sequence references and actual
signatures; generic fixtures and their golden bytes stay unchanged. Lending's
scripted browser acceptance supplies a complete receipt shape. Those fixture
repairs do not turn a scripted answer into native proof.

## Retirement and recovery

A retired instance uses the existing `CustodyError({held:"unreadable"})`
storage answer. No new storage answer, signal, lease-drain API, grace period
or timeout enters custody.

`close` and `versionchange` permanently retire the instance. New and
queued locks, admissions, reads, writes and segment work reject. Closing
also rejects a pending open; a late open success closes its connection.
A blocked open cannot later leave an orphan connection. Notifications never
reopen a retired store. An observer that closes the store stops subsequent
observer delivery.

An IndexedDB transaction already created ends by its own commit or abort.
The browser checks put/readback bytes inside that same write transaction,
then awaits completion. `IDBDatabase.close()` allows those transactions to
finish and disallows new ones. No network promise holds the database open.
Generic Custody awaits the store write and adds no separate readback.
After a committed preparation, send attempts its next sent-mark write;
retirement rejects that new transaction before delivery. Source review
`ae92803061013ff634f08e8d655802766c6369f9` corrected the earlier witness's
impossible expectation of a generic post-write read. Production gains no
read merely to satisfy that expectation.

Custody enters its existing `exclusive` port immediately before invoking
an act or capability-step delivery. The browser store checks retirement on
callback entry. Custody captures the delivery promise and returns from that
callback before awaiting the network, so a held network call owns neither
the admission lock nor the database connection. This uses an existing port;
it does not treat a committed `sent` mark as proof that the POST left.

| Held boundary | Stored result and existing recovery |
|---|---|
| After the sent mark, before delivery starts | Retirement refuses delivery. The exact sent envelope stays; Check uses the existing unresolved-record settlement path. |
| Preparation committed, before the sent-mark write | The new sent write refuses; no delivery starts. Exact prepared bytes remain. The existing prepared-record recovery checks that original. |
| Actual POST remains pending while versionchange occurs | Existing IDB transactions drain and upgrade can complete. The network does not block it. |
| Actual POST replies after retirement | No outcome/segment/readback transaction starts. Custody reports its existing unkept storage result; the exact stored sent record has no new outcome. Check settles it after a fresh load. |
| Retirement during a created result transaction | That transaction reports its real commit or abort. No later proof or slot-clear follows an expired context. |

A channel is optional. Construction, post and observer failures cannot
reject a committed write. A local notification still runs when the channel
fails. Cross-tab messages invalidate a view; they confer no authority.

## Current contexts and retained join pointers

The shared browser request wrapper checks context immediately before the
builder invocation after admission, after signing, and after awaited POST,
settlement and proof ports. A stale null settlement proves no absence.
A POST already initiated may return, but an expired context starts no later
authentication, proof or UI step. Custody can retain uncertainty; a signer
already invoked cannot be undone.

The join proof checks current context before session signing and after each
await before session POST or receipt following. Lending's authentication
and settlement ports check their internal awaits too. SignedIntent invokes
the supplied signer synchronously, so the shared pre-build guard covers the
join, Counter and Lending builders without duplicate same-turn checks.

An unreadable join find retains the pointer and reports an unknown original.
Only a successful null find under a current context can prove unsigned
absence. The JoinStore clear port receives the current capability; an
asynchronous host rechecks it after its handoff awaits. Counter's installed
enrollment and Lending's saved-seat handoff check before a later removal.
An already initiated write may finish; invalidation cannot authorize the
next operation.

## Witness source and execution owed

The existing native Chromium join witness remains first in the harness.
It must still show one unknown original after a lost reply, reload plus
Check, one signing, one POST, one journal act under that key, signed-byte
equality with custody, and pointer removal only after proof. Its historical
run remains evidence only for its historical head. The changed harness has
not run. Reload recovery is not power-loss durability.

The new `custody-store-witness.ts` runs real IndexedDB/Web Locks with
scripted Lost/settlement ports after the native join proof. It adds:

- actual Custody retry spills and a late small page, with native request
  range/count observation and one-signing/history equality;
- real abort rollback for truncate/append/length and archive moves, repeated
  append recovery, missing-position and orphan-metadata refusal;
- malformed live/archive values and projections, unknown record/layout
  versions and key settings, zero replacement signing, and retained bytes;
- native close, pending/late open, blocked-open, versionchange and the four
  held lifecycle boundaries above;
- optional channel failures with truthful committed writes;
- two actual same-origin tabs for record locks, exclusive capacity,
  notifications and retired queued work.

Deterministic client owners add held admission/signature/POST/proof/settle
and session-stage gates, unreadable join-find retention and host-clear
capability expiration. They use stand-in stores/transports where their
opening comments say so. They do not prove native IDB rollback. The browser
helper's protocol ports do not prove native membership. The original native
join retains that separate role.

### Proposed validation after root grants a slot

Run these compiler roots sequentially with the owned existing dependency
view, using `node node_modules/typescript/bin/tsc -p <path>`:

- `packages/client/tsconfig.json`, `tsconfig.node.json` and
  `tsconfig.test.json`;
- `apps/counter/browser/tsconfig.json`;
- `examples/lending/browser/tsconfig.json`;
- `apps/room/page/tsconfig.test.json`.

Before direct Vitest, run `node scripts/cloudflare-pool-compat.mjs` once.
From `packages/client`, run the whole owning files with the existing
Vitest:

```sh
node ../../node_modules/vitest/vitest.mjs run --config vitest.config.ts \
  test/browser-custody.test.ts test/browser-request.test.ts \
  test/browser-joining.test.ts test/custody.test.ts test/custody-signings.test.ts
```

The Counter owners run through `node apps/counter/scripts/test-browser.mjs`.
Lending's configured plain owners and the affected source import closure
remain owed by the final gate. The real IDB and two-tab cases run through
the existing no-argument `apps/room/page/test/custody-witness.mjs` command
with existing external Playwright/Chrome/Wrangler and a new private witness
directory. Record actual AC/mode0 and raw per-case outcomes externally.
No browser package installation or checkout install is needed.

Two targeted controls are proposed, not run: remove the pre-build current
check from `buildCurrent` and require the held-admission zero-signer
assertion to fail; map a malformed Row to absence and require the
no-replacement/pointer-retention assertion to fail. The native held-delivery
witness must distinguish bypassing the exclusive dispatch fence. Run
controls with whole owning files and retain inconclusive attempts. Do not
run a mutation sweep.

After source fixes, meaningful controls and browser acceptance, run one
`npm run gate` at the clean integrated head. Root reserves execution;
R1's full gate and C1 precede NF5. No successful suite should repeat without
a source change or unresolved failure.

## Verification scope and NF-7

The Voice skill covers `start`, `ready`, `stopAudio` and `settle`.
NF5's earlier head changed those functions. The combined review repair
also fences `start` after its synchronous speaking notice. The old coverage pin does not cover the NF5
head. The correspondence still needs review: successful audio mark/readback
before speech, restored marker/report fencing, generation before cancel,
and verified accepted report before clear/archive. Storage failure,
multi-tab behavior and speech-engine behavior remain outside that model's
assumptions. Do not refresh the hash without the reserved model/source
checks and meaningful source control. The restart witness moved since the
old line citation. The negative arm now names the stable assertion
`a retained audio start must block rearming after restart`, and the control
metadata names the same message. Neither control nor model has run here.

Observation covers `observe.ts`; Effects covers Scope operations and
SQLite sent marking. Those protected sources do not change here. Their
skills do not establish the new browser persistence or authority boundaries.
No model or statechart ran for this source checkpoint.

## Combined review repairs after the first checkpoint

This source-only follow-up preserves baseline
`3b69726315edc73f64095e0a7e889fdef17493da`. It addresses all four findings
of `ae92803061013ff634f08e8d655802766c6369f9` and Voice ruling
`3e23670676bd228f33a9cb790ba66d870aac70b0`. All compiler, Node, browser,
control, model, formatter, build, generation and gate checks remain UNRUN.
No main merge or dependency change took place.

- The prepared-write witness counts the attempted next sent write, requires
  its storage refusal, and proves zero delivery with exact prepared bytes.
  The separate late accepted-reply case still requires exact sent bytes,
  no outcome or segment, and the existing unkept answer. Its held-POST phase
  now also requires another same-prefix exclusive admission to enter before
  releasing the reply; a database upgrade alone did not prove the short
  Web Lock interval.
- Installed enrollment checks current context after its actual device-slot
  read, key generation and save before the probe signer or next operation.
  Forget checks after the join read and each removal. Restore and perform
  also recheck before a later handoff. A grouped app owner uses real
  WebCrypto and gated private-slot/lock stand-ins to prove no later signer,
  key save or slot removal. This is a narrow enrollment lifecycle witness,
  not native browser durability or a new local Counter act path.
- Joining, Counter and Lending fence the actual context-owned fetch on each
  proof, session and act dispatch. Generic Handle retains its legitimate
  unavailable fallback and API. Join and Counter owner witnesses hold the
  first entry read, then return unavailable: the current case permits the
  second GET; an expired context permits no second GET, proof or pointer
  clear and retains the unresolved original.
- Empty-history checks use an identity-prefix cursor from `[id]` inclusive
  to `[id + NUL]` exclusive. String ordering makes appended NUL the immediate
  next first-field string, so negative, textual and nested ordinal keys
  remain inside the probe. A same-id scalar key also refuses through
  `getKey`. The probe stops at its first key and runs only where absent
  metadata would otherwise authorize emptiness; valid page reads keep their
  bounded numeric ranges. Real-IDB corruption witnesses retain invalid
  orphan keys and require no absence, build or append with unchanged data.
  This prefix argument follows the specification's
  [string and array key comparison](https://w3c.github.io/IndexedDB/#compare-two-keys)
  rules; the real-IDB assertions remain UNRUN.
- A speaking subscriber may dispose or invalidate synchronously. `start`
  now rechecks current ownership, generation, active turn and usability
  after the notice before playback. The saved start remains. The new owner
  `Disposal during the speaking notice retains the start without invoking playback`
  requires zero play/sign/submit calls and a retained start that blocks Arm
  after reload. This maps to interruption after SaveStart and before Speak;
  Voice.tla, its config and view need no change.

The accepted Voice plan keeps two later intervals: controls and targeted
source owners at frozen commit C, then coverage-pin commit Q and the Voice
check. The stable restart assertion above replaces the stale line number.
The disposal and restored-accepted/unknown proof owners remain in interval C.
Statechart tooling must use preserved scratch copies with the one cleanup
line disabled; home skill files stay unchanged. Compare generated chart.mmd
bytes to the tracked chart. Equal bytes retain the existing SVG; different
bytes stop for a report, with no renderer fetch. None of that preparation
or execution ran in this source repair.

Planner ruling `119140cd017925f29bc66d3d65c6ba077b5430f1` also leaves an
owning-slot obligation after NF5 merges main holding R1: use R1's single
canonical pack path and reproduction witness, refresh changed Counter and
Lending identifier files in this same NF5 head, and report in one line
whether Grow identifiers changed. Before first signing, versions remain
unchanged. No bundle, identifier calculation, reproduction or signing ran
now. Counter/Lending signing waits for NF5 to land, and NF7 uses those new
planner-signed packets rather than an older presentation.

Planner ruling `657e4217f0273be1c746001a90ff2e082f05b80c` still governs
NF7. No local Counter adapter or replacement hosted witness enters this
head. Historical Counter Node evidence remains 52 cases at its prior head.
Installed enrollment, application screen transport and installed main
gateway browser acceptance remain owed after planner deployment/installation;
a hosted failure reopens NF5.

Modern Web Guidance: the pinned `modern-web-guidance@1.0.0` IndexedDB
lifecycle search failed DNS, and the offline retry found no cached package.
No unrelated guide applied. The proposal used the primary
[IndexedDB connection rules](https://w3c.github.io/IndexedDB/#closing-connection)
and [Web Locks specification](https://w3c.github.io/web-locks/) for the close
and callback boundaries. Complexity review supplied the history-cost
comparison above. No scanner, model or validation tool ran.
