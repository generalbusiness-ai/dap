# RS1: release held reservations

## Source decision

Request `e3dff17f7fef7784c7b5474b01fb8600765f1349` and promise
`3e6b93a4b8d31741bcfced1e0515d76e35116142` track this change. Planner ruling
`18a5bdb1257a61b9d25b4a0a45442d545d54b9f4` answers precode question
`0a1fbb09`: use two existing-form acts and allow two live holds per member.
The isolated source branch starts at published main
`c6711b53a368d24c1fad2830ea5634c045999ce1`.

`reserve` fixes `holder` to the signer's member reference. Its existing
`tool-day-taken` guard still runs first. A second guard counts held
reservations for that holder before opening: `max: 1` permits a second
hold and refuses a third. The existing item bound permits eight live
reservations globally. Final reservations count toward neither limit.

`release` requires `lending.member`, a held reservation, and its holder as
signer. `release-by-staff` requires `lending.staff` and a held reservation.
Both write only the final state `released`. The tool, holder, day, and
until remain unchanged. No shared action grants both authorities, so the
two acts state the authority without a new grant predicate or form.
The existing timed lapse remains unchanged and still ends at `lapsed`.

Day labels remain opaque text of at most ten bytes. Authors use
`YYYY-MM-DD` and supply `until` explicitly. The definition imposes no
calendar alignment or maximum duration. The two-per-member policy does
not guarantee every member a share of the global eight or prevent repeated
reuse of a freed slot. Release changes no tool state or publication.

## Authored package and witnesses

The authored package and retained descriptor open Lending `0.4.0`.
The prior `0.3.0` release stays unchanged. Signing END
`37119ff2` closes the planner's Lending and Counter `0.3.0` signing interval;
its packet carrier is not an RS1 source baseline or a new installed release.

The optional manifest capability input follows ruling
`3991b73ba260a11a1562711d39e4950b054ff079`. `manifest` accepts an explicit
application capability declaration and otherwise keeps its existing
entry-definition defaults. Lending passes the same `publication-paths@1`
declaration with prefix `shelf/` through that input instead of overriding
the returned object. The Define package owner distinguishes replacement
from merging by supplying explicit publication metadata over an inferred
`hold@1` default. No capability schema or platform behavior changes.

The Lending definition owner adds one flow that refuses a third hold and
a nonholder release, permits holder release, lets another member take the
freed tool/day, and permits a staff-only grant to release another holder's
reservation. Further reservations show that the member bound also frees.
It checks the unchanged tool and refolded state. Existing lapse and opaque
day-label assertions remain. R's older prerequisite fixture removes the
two RS1 acts from its cloned definition before restoring its original
reservation form, so those independent form tests keep their old boundary.

The authored story keeps its original circulation, refusals, and lapse.
It records the new holder party in reservation effects, then appends a
fresh available tool and the holder/staff release flows. The member and
staff actors retain distinct existing grants. The original R notes and
all historical records remain unchanged.

## Evidence and remaining work

The whole affected owners and two guard controls passed at
`805d2fa98795d222814f19580e7d21c7b37c96da`, tree
`2146b1ea9e6c99c8d1bc33b3c43c3edeb25d822c`. Source merge `7ac3bfe9`
integrated published main `fb7877d9` while preserving the authored RS1
change. The earlier compiler and producer failures below remain FAIL.
The final whole preflight and ordinary full gate passed at the combined
head below. Independent review, landing and release remain OWED.

The gate input is `3bedd5c8604ac03836108fb73043b5cf1e2832fc`, tree
`87c399cc0178d44dc859a2afec9a864f2a1f726c`, against published main
`fb7877d90c03ef3326baef179c10e1bf59b1af40`. Gate START is
`7284ec912d9dd5c55d31a9d47441d52f9dc7a30a`; END is
`54c0f829e32f69f85815f304f7a08464b8a77ca8`. The final source act will
bind the actual documentation successor's head and tree after commit.
The note update changes no source or test bytes from the gated head.

Root composed RS1 and LS2 code at
`f9c490ec0101238e63f1322821b31e713dfe2e1a`, tree
`5909f7b83a9bc4e7972e79fa612b22bcac673986`, as an exact 17-path union;
the normal merge exited 0 in 0.116088 s. This records code composition
only. The RS1 and LS2 promises remain independent. The owner and control
results below bind the earlier RS1 source, not this joined head.

The first authoring interval stopped at missing release annotation entries
and deletion of required fixture properties. Commits `96180121` and
`ade06042` completed the existing typed maps and used a filtered fixture
acts record; they changed no production form or assertion. The first
actual producer then stopped before writes: the story expected tool 9's
revision to equal its ID. Commit `fb9b170d` corrected only the expected
revision to 1. New items start at revision 1; reservation effects do not
change their tool. No parser, judge or clock rule changed.

The repaired normal producer wrote only definition.json, pin.ts and
scenarios/application.json; `ea25bb9f` committed those actual outputs.
The normal CLI check measured 38 steps, replay through 15 and 3 projection
checks. The three-way comparison for current 0.4 kept Grow 2.0 and
Counter 0.4 exact and measured Lending's new tuple. Commit `805d2fa9`
adopted only the measured Lending identifiers and the existing CLI
Lending row 38/15. All other tuples and assertions stayed unchanged.

All wall times below measure the actual child command, rounded to six
decimals. Test/module duration sums are not elapsed wall time. SHA-256
prefixes identify the cited files; retained result records contain full
stream hashes, commands and source bindings.

| Source / check | Actual result and wall | Retained output / SHA-256 prefix |
|---|---|---|
| `7ac3bfe9`: initial authoring | FAIL. Define source: exit 0, 0.552199 s; Define test: exit 0, 0.324553 s; Lending compiler: exit 1, 0.305648 s. Browser compiler and producer UNREACHED; all three generated files unchanged. | `artroom-evidence/2026-11-15-rs1-authoring-producer-attempt1/result.json` (`2ed10440d938`) |
| `ade06042`: resumed authoring / first actual pin producer | FAIL. Lending compiler: exit 0, 0.287708 s; browser compiler: exit 0, 0.315532 s; producer: exit 1, 0.850356 s on item 9 revision mismatch, before any generated write. | `artroom-evidence/2026-11-15-rs1-authoring-producer-attempt2/result.json` (`b9ce324fc506`); `pin-producer.stderr.log` in that directory (`5d60b24f54e7`) |
| `fb9b170d`: affected compilers / repaired pin producer | PASS. Define test: exit 0, 0.398091 s; Lending: exit 0, 0.295003 s; producer: exit 0, 0.884406 s. Exactly the three normal generated outputs changed. | `artroom-evidence/2026-11-15-rs1-authoring-producer-attempt3/result.json` (`040993d38b76`) |
| `ea25bb9f`: generated checkpoint | Normal commit: exit 0, 1.853606 s; only definition.json, pin.ts and scenarios/application.json. | `artroom-evidence/2026-11-15-rs1-ls2-source-dev-safe-attempt1/rs1-generated-checkpoint/result.json` (`f54230eb0e9b`) |
| `ea25bb9f`: normal `dap check . --config examples/lending/dap.application.json` | PASS; exit 0, 2.353401 s. Actual 38 steps, native replay through 15 and 3 projection checks. Scripted TEST authority; external effects disabled. | `artroom-evidence/2026-11-15-rs1-ls2-source-dev-safe-attempt1/rs1-cli-identifiers/cli-check.stdout.log` (`3570c57a7509`) |
| `ea25bb9f`: normal three-way compare | PASS; exit 0, 1.850840 s. Grow and Counter identifier bytes exact; only Lending changed. | `artroom-evidence/2026-11-15-rs1-ls2-source-dev-safe-attempt1/rs1-cli-identifiers/comparison/comparison.json` (`ba7bfa3d0108`); execution record `artroom-evidence/2026-11-15-rs1-ls2-source-dev-safe-attempt1/rs1-cli-identifiers/result.json` (`e736a2f81cb6`) |
| `ea25bb9f` input: reviewed identifier apply | PASS; exit 0, 0.257237 s. Wrote only Lending release-identifiers.json. `805d2fa9` then committed it with the measured CLI row. | `artroom-evidence/2026-11-15-rs1-ls2-source-dev-safe-attempt1/rs1-cli-identifiers/apply-result.json` (`7a82bf28aa91`) |
| `805d2fa9`: measured checkpoint | Normal commit: exit 0, 1.210000 s. Only Lending identifiers and its existing CLI tuple changed; all other source stayed exact. | `artroom-evidence/2026-11-15-rs1-ls2-source-dev-safe-attempt1/rs1-measured-checkpoint/result.json` (`c7e616bb0203`) |
| `805d2fa9`: compatibility prerequisite | PASS; exit 0, 0.082910 s. copied:false; accepted pool bytes unchanged. | `artroom-evidence/2026-11-15-rs1-whole-owners-attempt1/compatibility.stdout.log` (`86b320bf0218`) |
| `805d2fa9`: whole Define package + story owners | PASS; exit 0, 1.380242 s; 12 tests in 2 files. | `artroom-evidence/2026-11-15-rs1-whole-owners-attempt1/define-owners.stdout.log` (`6cd43a4c1aac`) |
| `805d2fa9`: whole Lending definition + browser model owners | PASS; exit 0, 1.543117 s; 13 tests in 2 files. | `artroom-evidence/2026-11-15-rs1-whole-owners-attempt1/lending-owners.stdout.log` (`597d3fdbd6b4`) |
| `805d2fa9`: whole CLI examples + release reproduction owners | PASS; exit 0, 6.623576 s; 4 tests in 2 files. | `artroom-evidence/2026-11-15-rs1-whole-owners-attempt1/cli-owners.stdout.log` (`58fe696ab3ce`) |
| `805d2fa9`: whole Native scope-lending owner | PASS; exit 0, 11.035064 s; 1 test in 1 file, unchanged maintained Worker runtime. | `artroom-evidence/2026-11-15-rs1-whole-owners-attempt1/scope-lending-owner.stdout.log` (`5b9fcdb5b74c`) |
| `805d2fa9`: whole Node Security owner | PASS; exit 0, 3.928938 s; 12 tests. No new RS1 seal row or seal refresh. | `artroom-evidence/2026-11-15-rs1-whole-owners-attempt1/security-owner.stdout.log` (`475e8df12f27`) |
| `805d2fa9`: whole owner interval | PASS; outer wall 24.798090 s; source clean and unchanged. All six command stderr files empty. | `artroom-evidence/2026-11-15-rs1-whole-owners-attempt1/result.json` (`f1837cd4eb7e`) |
| `805d2fa9`: remove holder guard | DISTINGUISHES; helper exit 0, 2.328762 s. Whole definition owner: baseline 9 passed; mutant 7 passed, 2 failed, child exit 1. Direct nonholder assertion failed at 134:72; original bytes and mode restored. | `artroom-evidence/2026-11-15-rs1-ls2-full-gate-attempt1/controls/rs1-holder/holder.stderr.log` (SHA-256 `cc8f836a66010bf916bedf8264fcda9d04db95e248aef84d5ff77e3b6598bd8c`); child outputs in `artroom-control-9gEiYs` under that directory |
| `805d2fa9`: change member count max 1 to 2 | DISTINGUISHES; helper exit 0, 2.047780 s. Whole definition owner: baseline 9 passed; mutant 7 passed, 2 failed, child exit 1. Direct third-hold assertion failed at 132:85; original bytes and mode restored. | `artroom-evidence/2026-11-15-rs1-ls2-full-gate-attempt1/controls/rs1-live-bound/member-count.stderr.log` (SHA-256 `8692287673c0cedfe7d11dd81a59f11c0b0492241a210268cbc3014a6c20a3fd`); child outputs in `artroom-control-KikBGe` under that directory |
| `805d2fa9`: control interval | Both direct behavioral failures inspected; outer wall 4.428499 s. Source restored byte-exact, mode 0644 and clean. No third green. | `artroom-evidence/2026-11-15-rs1-guard-controls-attempt1/result.json` (`d12d17b918f6`) |
| `f9c490ec`: RS1 + LS2 code composition | Normal merge: exit 0, 0.116088 s; exact 17-path union. Code composition only; promises stay independent. | `artroom-evidence/2026-11-15-rs1-ls2-source-dev-safe-attempt1/source-join/result.json` (`7a84ccf507d8`) |
| Safe source/development retention | 40 explicitly selected files; retained bytes and hashes equal originals. No fixture, cache or private provider log copied. | `artroom-evidence/2026-11-15-rs1-ls2-source-dev-safe-attempt1/retention-index.json` (`3f87c3905e1a`) |
| `3bedd5c8`: final exact-head preflight | PASS. Fetch: exit 0, 0.387259 s; shared helpers: exit 0, 0.654108 s; whole typecheck: exit 0, 16.537624 s. Outer wall 17.769006 s; source clean, main unchanged. | `artroom-evidence/2026-11-15-rs1-ls2-source-dev-safe-attempt1/final-preflight.result.json` (SHA-256 `37ad7a08a48b4fb5c81239abb5bedbd1f3d62f71a52e2b8e65c4623d4bca066e`) |
| `3bedd5c8`: ordinary `npm run gate` | PASS; exit 0, verification exit 0. Child wall 911.406738 s; controller outer wall 911.674861 s; printed test-step duration 881.7 s. Node 204 passed; Counting 56 passed; Plain 4,860 passed, 1 skipped; Native 1,136 passed, 2 skipped. Natural Scale omitted: outside-scale-paths, 18 changed paths, all match sets empty; no Scale command or result. | `artroom-evidence/2026-11-15-rs1-ls2-full-gate-attempt1/result.json` (SHA-256 `e67a5d4bce6831deeac667084b354c6895769c6de6e02af3504b668607cf274b`); `gate.log` in that directory (SHA-256 `a8948344aa9fe2af32a7b1adb8a9395a99a019fd584a21fe9acbb9fe63952e8f`) |
| Independent review / landing / release | OWED. The final source act will bind the note-only successor after commit. | Actual future records not yet available |

The retained stage timings are kernel 222.224625 ms, Node 129896.751 ms,
Counting 491.962541 ms, Plain 173307.056875 ms and Native
577424.5431659999 ms. These stage timings differ from the gate child and
controller walls above. All four terminal case ledgers are complete.
The summary retains 129 unknown suite observations and zero
contradictions; scope-stories module timings remain partial. The raw
directory retains the gate log, stage evidence and 22 control copies.
Root confirmed session 31088 and child 28534 terminated and reaped.

Both mutants also failed canonical-byte equality at definition.test.ts:153.
That was not the sole evidence: removing holder identity admitted a
nonholder write, and raising the count admitted the third hold. Each
control used the whole existing definition owner. The external retained
helper copy changed only one cleanup line; classifier, runner, selection
and deadlines stayed exact. Actual before/after JSON and streams remain
in the two child directories above. No model or new verification claim
follows from these controls.

The gate-colocated control copies retain the original bytes and full
stderr hashes cited above. The original control interval remains at its
earlier path; moving the citations does not change the controls' source.

The staff-only positive path uses an explicit staff grant. This evidence
does not include a separate member-only denial of the staff action.
Native scope-lending covers real library scopes and roles; the CLI
story uses scripted TEST grants and local replay. Neither result proves
a hosted release, provider action or physical-device acceptance.

The successful producer/compare stderr contains the existing Node
DEP0205 module.register deprecation warning. The whole-owner interval's
stderr files are empty. Earlier FAIL records stay separate and retain
their actual pre-repair source; the later passes do not relabel them.

Root retained the selected generated-checkpoint, CLI/comparison/apply,
measured-checkpoint and source-join records under the safe directory in
the table. The original temporary files remain untouched; citations now
use the exact durable destinations. No raw fixture, cache or private
provider log entered that copy. The private provider log remains withheld.

No packets, signer, trust rows, Worker configuration, grants, Directory,
Destination, receipt path, Counter source or browser controls change.
Earlier question `a7f24240` concerned signed-presentation drift on the
separate NF head. RS1 retains the approved open 0.4.0; planner owns signing
after RS1 lands. Published-main integration, normal generated outputs,
final preflight and the ordinary full gate are complete. Review, landing
and later release remain OWED. No protected lifecycle function
or formal model changed, and no model run or coverage-pin advance is claimed.
