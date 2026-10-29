# Typed authoring readability

The second spike's surface expresses all five definitions without changing
their canonical data. Typed names, explicit dependencies, and input copying
make the definitions easier to read. They cost more source, especially in
Grow. Keep the helpers for clarity and checks, rather than claiming that
each helper makes a definition smaller.

This is the DX-TR design witness for request `addbe5b4`, under Hugh's
`05b20ffe` and the eight helpers in `4694a0ce`. The witness lives in
`spikes/typed-surface/`. Its immutable predecessor lives in
`spikes/typed-surface-before/`, copied byte for byte from
`f77e454a84fca21e22eec7fe6d7eed16d7cf08e1`. `baseline.json` records each
original file's size, SHA-256, and Git blob identity. The kernel stays
unchanged. No package is published. DX-T1 takes its surface from this note.

## The reading determines the helper

The rewrite was read beside the lending README, the Counter README, and
`docs/lanes-reference.md`. Grow has no README. Its references are
`notes/2026-10-17-grow-operation-application-design.md`,
`examples/grow/runbook.md`, and the pinned definitions.

An independent agent read the definitions and references without opening
`lib.ts` or the vocabulary page. Its first reading exposed implicit inputs,
implicit initial states, refusal polarity, and settlement wording. The final
definitions name all 25 static initial states. First-use comments explain
that `by(item)` adds a required field. `require(condition, reason)` states
the acceptance condition directly. Settlement comments distinguish
eligibility from the effects that write the next state. This is one expert
agent's assessment, not a human usability study or an equivalence proof.

| Definition and reference | Reading preserved by the rewrite |
|---|---|
| Lending: circulation and publication | `unique` includes final items. Any member may return a thing. Publishing remains a transition on the library, so a gone thing's page can still be refreshed. |
| Counter: commitment, fairness, fulfillment, failure | `noPledgeBy` names an absence test. `boardClear` still requires both no board link and no pledged promise. Commit records the resolved participant's ID. |
| Grow Room: configuration, observations, work, recovery | Modules receive items and vocabulary explicitly. Targets, reports, and outcomes remain separate. Omitted probe readings preserve their previous values and evidence references. |
| Grow Site: summaries and reports | The site retains the original Room pin. Base definitions do not acquire the fixed principals of the runbook's demo wrapper. |
| Change: hold, manifest, publication | Optional subjects stay explicit. Omitted inputs leave subjects unbound. Direct checks and target writes skip those subjects; an invalid supplied ID still refuses. |

The hold comment identifies the signer as holder at epoch 1. Ordinary
effects still set the commitment, extent, and deadline. `ifPresent` handles
absent top-level fields or presented facts, not malformed parts of a fact
that is present. Counter timer ordering remains runtime knowledge.

Two reference limits remain. Lending's README says a page path has a
requirement that a page contain 16 characters, while its pin checks the prefix, suffix, and absence
of `..` with a text bound of 1024. The rewrite preserves the pin. The scope
contract requires attribution fallback for an unbound base, while the
runtime skips that effect. The contract already records that I2 gap as
DG26. This design neither fixes nor promises that fallback.

## Eight helpers and their limits

| Helper | Decision and reason |
|---|---|
| Primitive and null operands | Keep. `equals` and `differs` wrap literals. Across unique authoring files, `constant` calls fall from 27 to 10 and `nothing` references from 17 to 0. Record literals still require `constant(record)` because a record may resemble an operand. |
| `on.take(f, ...names)` | Keep. It preserves argument order and selects party, value, or reference effects by slot kind. TypeScript requires each name in both fields and slots. Cross-name writes remain explicit. |
| `by`, `via`, and `siblings` | Keep. `by(item)` supplies a required same-name item field unless an explicit declaration overrides it. Optional and fact fields keep their declarations. Two-stage `siblings(seed, callback)` gives the callback real typed dependencies. The proposed self-referential single callback has circular inference and was rejected. |
| `grants`, `reasons`, and `roles` | Keep. Names have declarations and typed uses. `roles` requires coverage in TypeScript and checks it at runtime. `compile` returns per-act refusal metadata outside the canonical definition. DX-B1 owns the wire format. |
| Inline `rule(name, expression)` | Keep where a rule exists. `define` hoists expressions; conflicting expressions refuse compilation. No rule was invented just to use the helper. JSONata text remains untyped. |
| `none(item, states, callback)` | Keep for the common range. Its callback reads the scanned item's slots. Keep `range` for exclusions and count bounds. |
| `itemOf(item)` and `fact(act)` | Keep where values exist. `fact(act)` needs name metadata established by `define`. Forward references, cycles, and foreign facts retain strings. A global registry was rejected. |
| Compiler diagnostics | Keep. `compile` runs findings and the real validator on the whole definition, throwing `CompileError` with the act, form, and offending data. A slice needs its full pinned definition first. |

Operands remain plain data. Nonenumerable authoring metadata stays out of
canonical bytes. Guard traversal visits declared guard positions, including
nested and conditional guards. Literal records with `rule` or `reason`
keys remain data. Modules remain functions with explicit dependencies.
Strict index checks stay enabled. Helpers absent from these pins still need
their own witnesses when the library is cut.

## Source costs and selected name occurrences

`node spikes/typed-surface/measure.mjs` uses the pinned TypeScript 7 AST and
scanner. Code lines contain code tokens; bytes include comments and imports.
The original REPORT used a blank/comment-line grep. Its historical table
stays in the immutable predecessor and the measurement output.

| Authoring source | Before lines | After lines | Before bytes | After bytes | Imported vocabulary before → after |
|---|---:|---:|---:|---:|---:|
| Lending | 55 | 54 | 3,988 | 4,247 | 22 → 21 |
| Counter | 115 | 115 | 9,492 | 10,268 | 35 → 36 |
| Grow Room, inclusive | 338 | 480 | 31,920 | 33,591 | 49 → 51 |
| Grow Site, inclusive | 377 | 555 | 34,454 | 36,443 | 53 → 55 |
| Change slice | 193 | 200 | 16,946 | 18,121 | 62 → 64 |
| Unique authoring files | 740 | 924 | 64,880 | 69,079 | See individual rows |
| Shared `lib.ts` | 383 | 566 | 38,822 | 54,530 | Separate implementation cost |

Grow Site imports Room constants, so its reachable full-file graph includes
Room code. Room and Site rows overlap; do not add them. The unique Grow union
is the Site row. The shared library and unchanged package and story builders
together cost 72,679 bytes after, against 56,971 before. Unique authoring
files grew by 4,199 bytes. More explicit declarations and expanded layout
buy clarity, not a source-size reduction.

The historical REPORT gives original-data sizes of 501 lines and 10,409
bytes for lending, 474 and 17,963 for Counter, and 384 and 43,074 for Grow.
The script also measures those original sources afresh. The typed rewrite
remains smaller in bytes; Grow now uses more code lines.

These are selected grant, reason, subject, and item-type string occurrences,
not every string or name. Counts exclude state, field, slot, and fact names,
plus JSONata text. The script retains locations, separates declarations from
uses, and follows local helper parameters. It does not guess cross-module
forwarding.

| Definition | Grant uses | Grant declarations | Reason uses | Reason declarations | Subject uses | Item-type uses |
|---|---:|---:|---:|---:|---:|---:|
| Lending | 6 → 0 | 0 → 3 | 0 → 0 | 0 → 0 | 0 → 0 | 1 → 0 |
| Counter | 14 → 0 | 0 → 7 | 0 → 0 | 0 → 0 | 3 → 3 | 4 → 1 |
| Grow Room, inclusive | 34 → 0 | 0 → 8 | 34 → 0 | 0 → 31 | 7 → 0 | 29 → 4 |
| Grow Site, inclusive | 36 → 0 | 0 → 8 | 35 → 0 | 0 → 31 | 7 → 0 | 30 → 4 |
| Change slice | 5 → 0 | 0 → 4 | 18 → 1 | 0 → 14 | 19 → 17 | 9 → 0 |

| Longhand operands | `constant` | `nothing` | `part` | `el` |
|---|---:|---:|---:|---:|
| Lending | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 |
| Counter | 3 → 3 | 0 → 0 | 0 → 0 | 2 → 2 |
| Grow union | 13 → 4 | 4 → 0 | 7 → 7 | 0 → 0 |
| Change slice | 11 → 3 | 13 → 0 | 37 → 37 | 0 → 0 |

Keep `part` and typed list elements explicit. The retained 44 `part` calls
and two `el` calls describe structure primitive shorthand cannot remove.
Vocabulary counts describe distinct runtime imports from `lib.ts`, not
conceptual difficulty. Type imports appear separately in the script output.

## Canonical data stays fixed

Production `canonicalize` measures normalized definitions on each side.
Raw pins and normalized digests stay separate for Grow Room and Change.
The pin witnesses compare actual definitions, not source counts. All five
before/after canonical comparisons are equal.

| Definition | Canonical bytes on each side | Items | Acts | Handlers | Guards | Effects | Sends |
|---|---:|---:|---:|---:|---:|---:|---:|
| Lending | 4,603 | 2 | 6 | 0 | 5 | 13 | 5 |
| Counter | 12,691 | 4 | 14 | 0 | 53 | 54 | 0 |
| Grow Room | 38,408 | 9 | 31 | 0 | 101 | 142 | 1 |
| Grow Site | 4,198 | 3 | 5 | 1 | 8 | 10 | 1 |
| Change slice | 22,011 | 7 | 5 | 2 | 57 | 37 | 5 |

Slice metrics cover selected rows only. The witness overlays those rows
on the complete pinned Change definition, validates the whole, and compares
it with the complete normalized original. No partial fake genesis replaces
that check. K-spell owns kernel normalization and pin migration. Grow Site
continues to carry the original Room pin.

## First observed diagnostics

`diagnose.mjs` creates five isolated mistakes plus an unmodified calibration
on each side. Every case starts a fresh TypeScript CLI. A case that compiles
then runs the actual application builder, compiler, validator, and judge.
Both calibrations reach an accepted write. The derive Ledger uses labelled
in-memory test authority, not Native authority.

| Seed | Before first stage and host time | After first stage and host time |
|---|---|---|
| Undeclared state | TypeScript, 98.9 ms | TypeScript, 142.1 ms |
| Undeclared field | TypeScript, 97.7 ms | TypeScript, 139.9 ms |
| Wrong subject's slot | TypeScript, 100.8 ms | TypeScript, 140.1 ms |
| Grant no role holds | Application builder, 305.9 ms | TypeScript, 140.1 ms |
| Undeclared reason | Survives through the accepted judgment | TypeScript, 142.9 ms |

These are single host observations, not editor latency or typing speed.
Time starts before compiler launch and ends when the host observes a pipe
diagnostic. Startup and imports count. The old role time includes the
preceding compiler phase. OS caches and load are uncontrolled. The host is
an Apple M5 Max, 18 logical CPUs, 64 GiB, Darwin 27.2.0 arm64, Node 26.13.0,
TypeScript 7.0.2, and tsx 4.21.0. Metrics overlapped part of this capture
on a shared development host. The first three after timings are slower;
the useful change is earlier coverage of grants and reasons.

The runner requires the expected code and cause tokens in one isolated
file. Unexpected errors count as blocked, not detected. Launch and close
receipts identify owned child process groups. Timeout, overflow,
interruption, and load failures cannot become successful seeds. No editor
session was measured, and no child receipt proves drain outside its group.

## The teaching page and review evidence

[Typed authoring vocabulary](../spikes/typed-surface/VOCABULARY.md) is the
one-page six-pattern table for DX-A1. `vocabulary.mjs` generates it from six
builder doc comments. Read-only `--check` mode refuses drift.

[The implementation record](implementation/2026-10-29-dxtr-readability.md)
binds source checkpoints, commands, controls, gate results, and the sealed
manifest. Observations above come from its `metrics-1` and `diagnostics-1`
captures at the implementation checkpoint.
