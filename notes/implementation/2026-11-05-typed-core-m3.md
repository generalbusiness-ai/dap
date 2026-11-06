# Replace structural clock traversals

Status: complete source gate passed; actual `gate.exit` 0 read. Source gate head `30ed3c98283559bc091e06765bdfd9467aff4c3b`,
tree `56ab5d847ce2c00197718e6363ba55a46c42ad02`. Independent review, landing, and
planner deployment remain pending. This record claims no hosted acceptance or
complete concrete migration.

Full-scope request `f012c968e9254ebf224c003961f7fd578d2f89ca` and promise
`4c857d41d38e06c8129cc24986af5486585cbc9b` own M3 under scheduling request
`e99550e9`. They renew stale request `21d8e638` and promise `287adf75` on main
`93c1600b` without narrowing the original scope. Scope addendum `907088f9`
records the later replay-fixture and generated Page changes before those edits.
O4 retains priority when browser access returns. The planner deploys after the
reviewed landing. Hugh overrides only the deletion-size criterion.

## Record the validator's actual resolutions

The existing validator records all fourteen Operand forms, eleven EntryPart
forms, Part projections, and nested `set.item` operands. Each descriptor owns
its declared, Native, or explicit unknown type, base type before projection,
subject identity, lexical binding identity, source path, and phase where its
owning form specifies one. The validator retains its existing admission choices
and problem paths. No second checker infers types or names from the declaration.

The graph contains typed guards, effects, sends, attention, value sources,
resolved reads, and opaque Native marks. It records six contexts: act, handler,
late replacement, timed body, result clause, and Native outcome clause. The
accepted `ValidDefinition` object owns its graph. Equal digests under different
validation contexts remain distinct; a copied result owns no graph. Frozen,
owned descriptor data survives later mutation of the input or validator context.
No graph node holds an executable callback.

Each future clause has its own root. A send links to that root, but the clock
visitor follows only the current body's declared child forms. Every skipped
condition and alternative contributes declared clock use. Only `before`,
`after`, and explicit commit-time value sources contribute it. Reading a retained
entry's `time` reads history. Opaque Native metadata adds no inferred actual read.

## Replace both production clock callers

`handlers.ts:derive` resolves its actual admitted body before any primitive runs.
`runClause` reconstructs the actual origin body and selects the clause by send
identity, clause name, origin root, and operation kind. Outcome clauses have no
origin body. Late replacement lookup uses the parent's preserved headers and
form arrays because runtime reconstructs the body object.

Both callers combine the selected root's declared clock use with actual
`j.ran.clock` from Native hooks that ran, including hooks before the body. Neither
caller resets that flag. This delivery deletes `readsClock`,
`conditionsReadClock`, and `timesEffect`. The recorded query returns no matches:

```sh
rg -n '\b(readsClock|conditionsReadClock|timesEffect)\b' packages/derive/src packages/derive/test
```

Concrete execution keeps its existing whole-body route. Static graph coverage
is not concrete lowering, and no opaque wrapper invokes the legacy interpreter.
The internal experimental `evaluate` loses its unused `_cause` argument; its
nine owned test calls follow that signature. No application API changes.

`judge.ts` retains SHA-256
`86222a9f4c1ff665232b470384bc82c095c0e1e175636eb8fae7859277f54959`.
Native pins, grants, wire formats, dependencies, runtime persistence, and live
Wrangler configuration stay unchanged. Scope and replay use the actual admitted
definitions returned by their loaders; no production replay code changes.

## Distinguish the public clock boundaries

Seven new cases join their existing owning forms files. The unchanged skipped
guard witness remains the eighth selected case for the controls.

| Boundary | Literal distinction |
|---|---|
| Value-time source and omitted effect if/unless | Each declared clock variant returns `clock-behind`; its nonclock pair writes. |
| Skipped tell and relate conditions | Each clock variant returns `clock-behind` even though it emits no send. |
| Omitted attention | The declared condition contributes clock use despite the omitted notice. |
| Result clause | Its value-time or omitted condition sets the clause's own `judgesTime`; the nonclock pair does not. |
| Future result clause | The sending delivery writes and does not judge time merely because its future clause reads time. |
| Native hook before the body | An absent optional field skips the stand-in hook; a present field runs it, sets the successful write's `judgesTime`, and prevents a behind-clock write. |
| Retained entry time | The delivery writes while behind and copies the source entry's historical time. |
| Existing skipped guard | A skipped clock-reading alternative still prevents a behind-clock write. |

Native hooks and histories here are explicit test stand-ins. They establish no
production provider or hosted outcome. Six graph witnesses also cover all 37
operator tags over the admitted corpus, literal clock sites, future separation,
historical time, aliased act/send contexts, replacement and Native clause
identity, and frozen callback-free ownership.

Three chosen controls show that the public witnesses distinguish plausible
mistakes. Removing declared clock use fails exactly five selected assertions.
Removing the actual Native contribution fails only the Native witness. Including
a future clause in its parent fails only the future-clause witness. All eight
selected cases pass before and after those controls; 71 unrelated cases remain
filtered. Each control restores source in `finally`; the restored hashes match
cutover checkpoint `395326e6`. No mutation sweep runs.

The first Native control survived because its witness checked only the
behind-clock refusal, which `prepareHandler` independently enforces. The
strengthened witness also checks the successful public write draft. The initial
driver stops at that unexpected survival, restores source, and never runs its
third control. That partial attempt remains sealed.

## Preserve failures and exact source evidence

Both compilers and 1512 cases in sixteen complete selected owners pass on the
first production cutover input. A preceding unit passes the seven new public
cases with the old callers, establishing their behavior before the change. The
later Native assertion strengthens the same case without changing production
source or its title.

The frozen focused pipeline at `cb614e2f` passes both compilers and all 111 cases
in eight complete derive owners. Its source/tool fences pin 2174 active files,
the actual native compiler and launcher, fourteen owned workspace bindings,
48 source aliases, and the exact file/project/pool/case selection. The same-run
structured and JSON reports agree. These checks precede the later fixture and
Page corrections; the final complete gate covers those corrections too.

The first frozen focused verification exits 1 because its declared JSON names
omit the structured reporter's ` > ` separators. Both compilers and all 111
cases pass in that attempt, but the verifier refuses its ledger. The corrected
ledger passes on unchanged source. An earlier setup names nonexistent
`typescript/lib/_tsc.js` and runs no compiler or body. The installed TypeScript 7
launcher uses `lib/tsc.js` and the pinned native binary. The custody supplement
retains the failure qualifications, configuration, corrected planning script,
actual exits, and outer timing files. The first planning-script copy is absent;
its hash remains in that first plan. No complete reconstruction claim covers it.

The first complete gate at `cb614e2f`, tree `3be83703`, ends with actual
`gate.exit` 1. Its source stays unchanged and its process group closes. Node
passes 135 cases and Counting passes 56. Plain records 3984 passes, one skip,
and three unique failures. Native remains unreached. That gate remains failed.

Two replay witnesses intentionally passed copied unsupported definitions to
`created`. The admitted-root check rejects those copies before replay reads the
unsupported bytes. The narrow `unsupportedDefinitionHistory` test helper now
creates a genuine admitted notes genesis, then changes its retained declaration,
seed pin, scope identity, and entry hash as untrusted synthetic input. The
unsupported-format and durability tests retain their literal replay refusals.
The third failure requires the generated Page module to equal its current
build. The existing command regenerates `apps/room/page/assets.ts` because the
validator's structural metadata now joins that bundle:

```sh
npm run build --workspace @generalbusiness/dap-page
```

Correction checkpoint `c4faff56` changes only the three replay test files and
the generated asset. Replay and Page test compilers and all 56 cases in the
three complete owning files pass. Their saved patch equals that checkpoint
relative to `cb614e2f`. No Page flow, dependency, admission check, or production
replay logic changes. The failed-gate analyzer first expects a Native file that
the unreached stage never creates; its retained error remains private. The
corrected analyzer records the missing stage as unreached.

The [Page browser workflow](https://github.com/generalbusiness-ai/dap/actions/runs/42179426134)
passes at `c4faff56`: page screenshots, recorded demo, create-room witness, and
local-label witness. The later gate-head commits change only the note and
evidence. The final reporting artifact and review request must cite a successful workflow
run whose head equals the exact review candidate. That citation supplements the
source-checkpoint run above after the documentation-only follow-up.

The new complete gate passes at `30ed3c98`, tree `56ab5d84`. I read actual
`gate.exit` 0 and verified all four terminal test phases. Node passes 135 cases;
Counting passes 56; Plain passes 3987 with one skip; Native passes 1111 with two
skips. Both Vitest phases report zero unhandled errors, and the summary records
no contradictory observations. The skipped Page recorder module has no duration;
that timing limit does not erase its recorded skip.

The checkout remains identical before and after the gate, and its process group
closes. The measured outer Python monotonic duration is 1572.12 seconds. Its UTC
interval, runner timings, and command CPU observations remain separate measures.
No speedup or historical archive cause follows. The 10,001-pass archive owner
passes in this run; request `64552d40` remains open for its earlier cause.

The [complete gate manifest](evidence/2026-11-06-m3-gate-2.manifest.json) seals
13 public validation files and the private-retention inventory hash. Its SHA-256
is `18a0334ca973b1772c9574db6a15ac9d0d0a3cc25dbc9953f4675b36e009cda2`.
The 2291 raw originals remain read-only in their owner-only durable directory.
Only the note, plan status, and evidence manifests change after this gate; the
post-gate record and final reporting artifact must identify and check that delta.

The manifests below seal the intermediate units. Each states its own source,
checks, and limits. Earlier failed attempts do not become passes when a later
unit succeeds. Development runs have separate totals; they are not one combined
case count or an observed throughput measurement.

| Unit | Recorded boundary |
|---|---|
| [admitted-read-binding](evidence/2026-11-06-m3-admitted-read-binding.manifest.json) | Both compilers and four admitted-result descriptor witnesses. |
| [body-frames](evidence/2026-11-06-m3-body-frames.manifest.json) | Both compilers and 82 cases across six frame/form owners. |
| [clock-before-cutover](evidence/2026-11-06-m3-clock-before-cutover.manifest.json) | Seven public cases pass with the old callers. |
| [clock-controls-revised](evidence/2026-11-06-m3-clock-controls-revised.manifest.json) | Eight selected cases pass before/after; exact 5/1/1 control failures. |
| [clock-controls](evidence/2026-11-06-m3-clock-controls.manifest.json) | Retained initial Native control survival; source restored. |
| [clock-cutover-first](evidence/2026-11-06-m3-clock-cutover-first.manifest.json) | Both compilers and 1512 cases across sixteen owners. |
| [failed-gate](evidence/2026-11-06-m3-failed-gate.manifest.json) | Actual exit 1; three Plain failures; Native unreached. |
| [final-focused-2](evidence/2026-11-06-m3-final-focused-2.manifest.json) | Frozen source/tool/selection verification; both compilers and 111 cases. |
| [final-focused-custody](evidence/2026-11-06-m3-final-focused-custody.manifest.json) | Tool/config copies, actual exits, outer timings, and setup qualifications. |
| [final-focused](evidence/2026-11-06-m3-final-focused.manifest.json) | Retained ledger-name refusal despite 111 passing body cases. |
| [foundation](evidence/2026-11-06-m3-foundation.manifest.json) | Compiler/fixture corrections retained; fourteen existing cases pass. |
| [gate-2](evidence/2026-11-06-m3-gate-2.manifest.json) | Actual complete gate exit 0; all terminal phases verified. |
| [gate-fixes-focused](evidence/2026-11-06-m3-gate-fixes-focused.manifest.json) | Replay/Page compilers and 56 cases across three complete owners. |
| [implicit-read-capture](evidence/2026-11-06-m3-implicit-read-capture.manifest.json) | Both compilers and 26 cases across five owners. |
| [owner-read-capture](evidence/2026-11-06-m3-owner-read-capture.manifest.json) | Both compilers and 22 cases across four owners. |
| [resolved-reads](evidence/2026-11-06-m3-resolved-reads.manifest.json) | Complete descriptors; retained fixture failures and corrected witnesses. |
| [structure-probe](evidence/2026-11-06-m3-structure-probe.manifest.json) | Both compilers and 1458 existing admission/form cases. |
| [structure-witnesses](evidence/2026-11-06-m3-structure-witnesses.manifest.json) | Test compiler and six complete graph witnesses. |

Earlier development failures remain recorded: a missing source `Type` import,
a direct owner fixture without identity, a record member missing `required`,
and a carried-part fixture without its `hold@1` capability owner. Their corrected
owning compilers and witnesses pass in later units. Initial untracked read-model
custody copied one extra input after compilation; later units copy extra inputs
before checks. Only the later units claim that stronger input custody.

## Estimate M4 through M8

M3 required separate owner and binder capture, admitted-result binding, six
body contexts, complete structure capture, public caller evidence, and controls.
Those checkpoints show that preserving validation and execution identities
costs more than the old traversal's size suggests. The graph supplies that
foundation; it does not implement the remaining concrete semantics.

| Migration | Revised effort | Main remaining risk |
|---|---|---|
| M4 | 4–6 working days | Guard outcome combinations, scan strategies, lexical binders, and refusal paths. |
| M5 | 4–6 working days | Missing versus clear values, before/working phases, Native effect joining, and settlement. |
| M6 | 4–6 working days | Send ordinals, fanout, creation context, and current-state clause reconstruction. |
| M7 | 5–8 working days | Seven hook places, capability argument trees, retained evidence, and whole public judgments. |
| M8 | 4–6 working days | Every runtime/replay body caller, full corpus lowering, and deletion of fallback orchestration. |

The remaining estimate is 21–32 working days of effort. It is a planning range,
not measured throughput or a delivery date. Each migration keeps its original
scope, one reviewed landing, and every semantic stop criterion. Hugh's
size override remains the only exception. Stop the affected delivery if
accepted-definition bytes, missing/null/skipped/unavailable distinctions,
execution order, resource refusal, retained evidence, or full judgments cannot
hold. Explanations must never rerun primitives or affect a judgment; graph
identity must never combine validation contexts. Arbitrary callback wrappers
and permanent duplicate interpreters remain outside the design.
