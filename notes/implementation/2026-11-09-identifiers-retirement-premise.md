# Record the retirement premise for identifiers

Child request `7740db3d` owns this note amendment under promise `89610f8f`.
Parent request `05d618e2`, resumed by `9ab66624`, owns the identifier
implementation.
Planner ruling `c0a795e7` authorizes head (a), the note amendment, as
phase-2 filler. Lane E of `63d906c0` keeps its validation slot after the
other active lanes.

## What changed

The identifiers design note now states the chosen deployment boundary.
Every old-format room retires at the cutover on the same four Workers.
Before that deployment, the planner records the affected rooms, their
last entries and archive states, and the last main commit that reads
their journals. Retained entries keep their original bytes and signatures.

The new code must recognize a retired old-format room and return a named
refusal that names its reader commit. The rollout uses one implementation,
with no translation, dual writes or frozen old-format deployment. After
the cutover, the planner and builder recreate the Grow, Lending and J5
Site demo rooms and rerun J5's acceptance scene for the new room.

The note also records the resumed request and the phase-3 build order.
Its old size figures now identify themselves as the original planning
count. The protocol's rules and the six difficult areas stay as written.

## Decisions and why

The original note assumed there was no deployed history. The four Workers
now hold journals, so that premise no longer describes the deployment.
Hugh chose retirement in ruling `c0a795e7`. This amendment records that
choice before any code depends on it.

Historical notes and retained evidence keep their old terms. The final
condition about old reference names applies to source, tests and current
docs. The implementation must preserve old journal bytes and signatures.
Replay at the recorded old-format commit remains their reader.

This head changes documentation only. The identifier protocol, cutover,
retired-room refusal and replacement demo rooms remain unbuilt. The
planner owns the deployment and the inventory that must precede it.

## Final evidence

The three static checks and the full gate passed at commit
`126c6c90f929eb13ec5e6dd1a725d71f75266482`, tree
`7639a53714c8d429abb96db48a3d29858aa0c271`, after the ordinary merge of
landed D main `f5d59983`. The gate's own exit, driver exit, launcher exit
and complete analyzer exit each read 0. END `cfd1640e` records the run;
`0dfeb69a` records the full reconciliation.

The [static manifest](evidence/2026-11-10-identifiers-static-preflight.manifest.json)
retains the three command receipts and their stdout digests in `steps.json`.
The [gate manifest](evidence/2026-11-10-identifiers-final-gate.manifest.json)
retains the gate log digest and the complete report custody. The table
uses the same checkpoint for every row. The first three digests cover
stdout. The gate digest covers its combined stdout and stderr log.

| Check | Command | Exit | Output or log SHA-256 |
|---|---|---|---|
| Whitespace | `git diff --check f5d59983 126c6c90` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Commit messages | `node scripts/check-commit-messages.mjs f5d59983 126c6c90` | 0 | `8b64c7a412d0921e8f3c08e1c23ecbb1ca1092bff45a46a1aeeb30d2d35a0c5a` |
| JSON formatting | `npm run format:check` | 0 | `6b858014bbe6926fbcfb41b3c9377ec28b3138bf83ce53de8790e5ed46af9d79` |
| Gate before review | `npm run gate` | 0 | `fbfb436d260055bc5ba7c283870150997ce1b2db882f671abac0e51bebd28493` |

The commit-message check read two commits and flagged none. The gate
matched all 5,841 unique case obligations: 5,838 passed and three skipped.
It ran 45 compiler contexts through 16 typecheck scripts. The reports
retained 111 unknown wrapper observations separately from the cases, with
no reconciliation issue, report error, unexpected case, failure or deadline
diagnostic. The maintained selector omitted six Scale cases because only
two notes differed from main. The skipped Page Recorder module
`apps/room/page/test/record.scope.test.ts` has no reported module duration;
that duration stays unknown.

The before and after records match for all 4,539 tracked paths, 7,534 tool
pins and 29 gate inputs. The static checks separately fixed the same
source and tools and eight inputs. Both runs left no owned process group.
Python measured 980.048029875 seconds around the inner gate pipeline and
982.358135833 seconds around its launcher, including guards and teardown.
These are separate measured boundaries. The 99 passive samples observed
maximum single-process RSS of 2,651,472 KiB for Node and 3,421,184 KiB for
workerd. These observations measure sampled resident memory, not heap,
a process sum, an instantaneous maximum or a threshold.

This evidence follow-up changes this implementation note and adds the two
manifests. Source and tests stay unchanged. The identifiers design note
keeps its gated bytes. The sealed public metadata and separate private raw
units retain their output for at least 30 days after landing. Raw logs,
generated fixtures, signing keys and private payloads stay withheld.

## Open limits

Request `05d618e2` owns the identifier implementation and its acceptance
conditions. Heads (b) through (e) wait for phase 3. This note supplies no
protocol, routing, replay, archive or HTTP-binding evidence.

The planner must inventory the old rooms and record their reader commit
before deploying the cutover. The new J5 room needs its own acceptance
scene and evidence after recreation. This head retires no room and
changes no deployed service.
