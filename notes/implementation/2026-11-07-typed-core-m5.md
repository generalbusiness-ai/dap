# Typed effects, attention and settlement

M5 remains in progress under request `053c4f4b1c42b41ca7152d60e19051bd43195d28`
and promise `3a9595b1`. This branch includes the approved M4 and S2 landings.
The condition checkpoint passes its two owning files, 16 cases. The eight-form
effect dispatcher, attribution and attention instructions, item settlement,
trusted Native joining bridge, final analysis updates, full focused validation,
gate, independent review, and landing remain pending.

## Conditions retain admitted groups and the existing skip rule

Admission now captures each effect and attention condition's actual guard nodes,
body, owner, and semantic `if` or `unless` place. `conditionPlan` checks the
owning validation and body before returning that occurrence's groups. The guard
nodes retain their existing source and lexical binder identities.

`judgeCondition` evaluates these groups on the before-entry view. It evaluates
`if` before `unless`, including when one group might already decide the result.
A false `if` or true `unless` skips the form. Otherwise, an incomplete group
leaves the input not judged, as before.

The existing skip walker reads any nested `of` or `item` string beginning with
`also.`, including inside constant payloads. Admission captures those names for
`if`. If one remains unbound at execution, the effect or notice skips before
judging either group. A shared traversal in `program/condition-plan.ts` serves
both capture and the remaining `readsUnbound` callers. The narrow `guards.ts`
adapter preserves that leaf while the rest of M5 moves to typed instructions.

The remaining dispatcher still uses its existing raw-form presence check for
unconditional forms. Its complete replacement must bind every effect and
attention occurrence to the admitted body. The trusted outcome caller also
still needs its explicit joining bridge; fabricated syntax must supply no
admission evidence.

## A characterization protects nested constant subject reads

No existing effects case pinned this skip inside a constant. The new case uses
an admitted `probe` act with the same condition on its value effect and notice.
It compares the complete `Ran` output with the optional parent unbound and
bound. The fixture supplies resolved subjects and authority; production
admission and body execution perform the checks.

The case passes on unchanged production source. A control that stops the
original walker at `const` fails the literal `Ran` assertion. The captured
condition path then passes all 16 cases in `forms-effects.test.ts` and
`forms-handlers.test.ts`, with every existing assertion and deadline intact.
A second control that omits the typed condition's subject-skip check fails the
same assertion. Both controls restore exact source bytes.

The test compiler passes before the characterization and at both capture and
execution checkpoints. The earlier one-case and 11-case runs remain separate
checkpoints. They do not add to the final 16 cases.

The [condition manifest](evidence/2026-11-07-m5-conditions.manifest.json),
SHA-256 `20ac8778d7a88e59c27c720069b596e9227981e728b4629a2b37b1ce162f7534`,
seals 67 read-only files with the original-source characterization, both
controls, compiler outputs, final focused report, and exact draft.

## The remaining migration keeps its boundaries

`judge.ts` retains SHA-256
`86222a9f4c1ff665232b470384bc82c095c0e1e175636eb8fae7859277f54959`.
The current checkpoint changes no accepted declaration bytes, digests, profiles,
bounds, wire, dependency manifest, persistence, authority, Native implementation,
or application API. The branch uses an owned copy of existing-lock dependencies
with all 14 workspace aliases inside this worktree.

M5 must still preserve ordered effects, working and opened items, required,
fixed, final and author decisions, absence versus explicit null, unavailable
reads, list ordering, joined-rule conflicts, resource refusals, Native fault
identity, retained observations, and actual `ran.clock`. Native interiors remain
M7, sends and clause routes remain M6, and orchestration remains M8. Parent 035
stays open through M8. The M4 note already links its six missing manifests in
this branch's earlier documentation commit.

These runtime inputs affect the generated Page dependency closure. A concrete
Page scope addendum must precede regeneration. Page assets, security baselines,
live rooms, custody, and deployments remain unchanged at this checkpoint.
The planner owns deployment.
