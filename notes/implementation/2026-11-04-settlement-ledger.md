# Compare settlement obligations with a literal ledger

Request `e13960b4` asks for an expected ledger that shares no accounting
logic with the fold. Source `d059b8df7f` adds that ledger and 100 distinct,
deterministic legal histories over the existing marker and Works fixtures.
After every command, the owner compares jobs, item duties, remaining held
counts, operation outcomes, pending requests, and reservation totals.

The expected module imports no production code. It records obligations by
item, duty, originating send, and identified settlement. A marker job owes
one state entry, one `b` entry, and an `a` act plus a two-entry result
allowance. A one-attempt operation owes its first and possible late outcome.
Works supplies two step counts, one tidy count and one held request count.
A short request owes two entries. A long request adds one unheld,
one-attempt audit operation and owes four. These fixture constants establish
the expected entries and pending-request counts. This head models no byte
allowance.

The actual adapter runs the real judges, fold, reservation projection and
fixture admission. It reads current revisions only to construct legal
optimistic acts. The generator chooses commands from the expected ledger.
No observed amount changes its choices or expectations. The definitions,
grants, peers, and platform callbacks remain made-up test stand-ins.

## Histories preserve the named distinctions

The 50 marker and 50 Works histories contain 1,185 commands. Each keeps two
or three jobs and has at most 20 commands. Stable seeds vary legal order,
results, ordinary final transitions, actual settlements, requests, and
follow-up work. Every history has a unique command fingerprint and full
case title. The minimized histories also establish these distinctions:

- A points at B. One entry sets B's mark and retargets A to C. Only B's
  identified duty disappears.
- Ordinary marks and final transitions retain their duties. An identified
  settlement releases its own duty.
- An opening at capacity 21 keeps enough entries to settle three jobs and
  checkpoint. Capacity 20 refuses the third opening and retains two jobs.
- An ordinary final Works holder retains its remaining counts after an
  unknown outcome, late confirmation, and accounted result. An identified
  state settlement waits for its outstanding original step before release.
- Each pending request keeps its originating two-entry or four-entry
  allowance. Exact duplicate results and outcomes write no second entry.

The expected model deliberately covers a small Works shape. Settled-holder
histories finish original step operations without spawning more work or
sending an accounted request after settlement. Other histories exercise
step and tidy spawning, accounted requests, and unheld audit operations.
The model does not rebuild the production graph-reachability calculation.

## SQLite preserves the same expected obligations

Eight minimized histories persist the judged fixture journals through real
SQLite transactions. They compare stored obligations after every command,
evict the actual Durable Object at a prefix, continue on its next life,
and evict again at the end. Each comparison also reads the actual stored
journal, checks its hashes and folds it into a fresh `MemoryState`.
Both stored state and replay must match the independent ledger.

These new storage witnesses bypass native admission and dispatch. They
establish persistence across eviction and journal-fold agreement with the
literal ledger. The existing native turn and compose witnesses ran beside
them. They do not establish production authority, provider behavior or a
hosted acceptance scene.

## Validation

The derive and scope test compilers passed. The first focused run passed
156 plain cases, including the 100 histories and existing settlement,
final-holder and held-count owners. The native owner run passed 44, including the
eight new storage cases and existing turn and compose owners.
The final affected run passed the 100 shortened histories and eight SQLite
histories, plus both compiler contexts. The named control and storage
histories kept their exact command arrays, so their earlier control
evidence still applies.

Three explicit controls each passed one selected witness before the
change, then failed that witness at its accounting assertion:

- Move settlement binding after item effects: B retains three entries and
  one request that its pre-entry settlement must release (`1cb86204dd`).
- Remove the settled-holder guard: late confirmation drops four held
  entries after ordinary finality (`8608356175`).
- Use the largest request allowance for every originating send: the short
  request reserves four entries instead of two (`d76ad703a2`).

The helper restored all production source bytes. Its retained copy changes
only conclusive-output cleanup. It changes no assertion, classification,
deadline or restoration rule. These are three named controls, with no
mutation sweep.

The first native development launch stopped before tests because the
sandbox blocked its loopback listener. The permitted launch passed all
eight. The evidence retains both outcomes and the initial 100-case pass.

On Darwin 27.2.0 arm64 with Node 26.13.0, the first plain owner command took
1.8155 seconds and the native owner command took 6.1837 seconds. Their summed
case times were 1090.7334 ms and 2054 ms. Those case sums exclude setup,
imports and transforms. Repeated development runs warmed the transforms.
The observed load averages were 1.32, 1.09, 1.07. This measurement makes no
cold-cache or dedicated-machine claim.

The final 100-history command took 1.7585 seconds, with 870.0405 ms of
summed case time. Its eight-case native command took 5.2107 seconds, with
289 ms of summed case time. These are separate owner commands.

The focused [validation manifest](evidence/2026-11-04-settlement-ledger-validation.manifest.json)
names 22 sealed public files across the initial focused unit, the final
affected unit and the interrupted gate. Their private inventories name
816, 243, and 2,275 retained raw files respectively. The first inventory
includes copies of preliminary development logs from `/private/tmp`.
The later focused owners, controls, final affected checks and both gates
wrote directly to durable evidence directories. The preliminary copies
do not establish durable custody from the start.
Its SHA256 is `a95aad8f02d207e98853a0eddd977bd55ba112a0ba243f5b5e79ca8096e1a7a7`.

The builder interrupted the first gate at `b8102c9ae8` to remove 328
redundant trailing checkpoint commands. It recorded `exit -15`, never a
pass. The closure receipt initially caught processes during shutdown. A
later check found none before source changed. Every signal named one
verified owned PID. The evidence preserves that interrupted run separately.

The revised gate ran once at frozen commit `d059b8df7f`, tree
`ba7805ae96b5e5499b4eae37671f72a128265e94`. Its actual `gate.exit`
reads `exit 0`. It took 1,209.88 seconds and passed 135 Node cases,
56 Counting cases, 3,811 plain cases with one skip, and 1,078 native cases
with two skips. All four terminal phases are complete. The report has
zero contradictory records and unhandled errors. Source and dependency
snapshots match, and the owned process group closed.

The report retains 99 suite or unknown observations and the skipped Page
recorder's absent module duration. The archive owner passed in 215,928 ms.
Request `64552d40` still owns the unproved historical archive failure cause.
The gate's recorded wrapper changes only bare `mktemp -d` placement so
raw stage outputs begin in durable storage. The gate retention record
indexes 2,276 owner-only raw originals.

The first focused checks ran on working-tree edits over `da94f450`; the
shortened follow-up ran over `b8102c9ae8` before the `d059b8df7f` commit.
The source-identity records state those bases and exact input hashes.
The complete revised gate ran at the actual frozen commit.

The two manifests verify 35 read-only public files:

| Manifest | Files | Scope |
| --- | ---: | --- |
| [Focused owners, controls and interrupted run](evidence/2026-11-04-settlement-ledger-validation.manifest.json) | 22 | Initial and final checks, unchanged named histories, explicit custody limits |
| [Complete revised gate](evidence/2026-11-04-settlement-ledger-gate-validation.manifest.json) | 13 | Actual frozen commit and all terminal phases |

The gate manifest SHA-256 is `d8a9eeba81c668022ebf5af1cb8568491d6d8ebdf9a0ce2a384018a5243bd539`.
Only this note and its two manifests follow the validated source. The
source and tests stay unchanged. The review request supplies both tree
hashes. These derive and scope test paths trigger no Card workflow.
This head needs no deployment.

To run the owners from the repository root, prepare compatibility once,
then run the selected files:

```sh
node scripts/cloudflare-pool-compat.mjs
node node_modules/vitest/vitest.mjs run --project derive settlement-ledger forms-settles forms-final-holder forms-holds
node node_modules/vitest/vitest.mjs run --project scope packages/scope/test/settlement-ledger.test.ts packages/scope/test/turn.test.ts packages/scope/test/compose.test.ts
```
