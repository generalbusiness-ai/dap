# Keep a fitting Question detail reachable from its summary

A Question whose complete detail fit the card budget could still open as
incomplete. The adapter measured the summary with its hidden full body and
longer Open wording. The mounted session then had no ready card from which
to offer Open.

Request `18d6dc0f`, promise `24b0c627`, implements the proposal in report
`38543fe9`. Planner act `928b537a` allows this work while O4 waits for browser
access. The correction applies to every host that uses this adapter.

## Budget the detail before the navigation summary

`apps/views/src/decision.ts` constructs the complete detail from one Question
context and checks its canonical UTF-8 size against the existing 60 KiB
limit. An oversized detail still returns incomplete with no card or act.

When a fitting text exceeds 600 characters or eight lines, the summary keeps
the exact identity, revision captures, attribution, and read points. It
offers Open and carries neither the hidden body nor native actions. The
adapter checks this compact summary against the same limit. Open reads the
complete detail and offers its applicable acts with the whole text.

Short text keeps its existing whole-text first card and applicable acts.
The generic session still enforces its 64 KiB projection limit and action
guards. The correction adds no excerpt, truncation, host-specific path, or
larger allowance. It changes no browser source or generated bundle.

## The owner witnesses the boundary through the mounted session

The existing Decision owner in `apps/views/test/s4.test.mjs` now opens a
Question whose complete detail measures exactly 61,440 canonical UTF-8 bytes.
It checks a ready summary with Open, no body, and no native acts. Open must
retain the identity and read the exact whole text with both expected review
actions. The witness repeats that boundary with multibyte characters and
JSON escapes. One additional body byte must refuse both pages.

The new witness fails on unchanged production source at the ready-summary
assertion: actual incomplete, expected ready. The repaired owner and its
compiler pass. The existing 600-character and eight-line checks remain in
the same owner.

These tests use scripted context and scope answers at the actual adapter
and session boundary. They establish no Native judgment, provider behavior,
or host size limit. Goose's separate size result remains not reached.

## Validation history

The first gate launcher stopped before it started npm because the copied
workspace links pointed outside the worktree. I corrected those links and
retained the stopped launch. The preliminary focused results remain in the
evidence with their dependency-resolution qualification.

With every workspace link inside the isolated checkout, I repeated the
unchanged-source control, the complete affected owner, and its compiler.
The control failed at the required assertion; all 26 cases in the repaired
owner and its compiler passed. The exact committed source was restored
before validation.

The frozen source is `2bd1ab4b930ed586e1a447a90f988bb3ae8c03e2`, tree
`ec419dff6aedcdcd4f610a84808dada8f4276f3a`.

[Card workflow 41799181039](https://github.com/generalbusiness-ai/dap/actions/runs/41799181039)
passed at that exact source head. It ran all three browser owners and
verified generated-card equality. The card owner reported 100 cases and
no errors.

The focused manifest seals 21 files, including the runs with every
workspace dependency inside the worktree and the preliminary observations. Its SHA-256 is
`928992714e4d10f6da441b2467037111d8fb33377751c1a41c998ccc53a0cc4a`.
The Card manifest seals 11 files for source identity and the successful
workflow, with SHA-256
`63b53849d027a3a9e55697a66c3b6896b02fb18b2b4b75ae1100f3a6e908c2ed`.

The actual gate exit is `exit 0`, read before finalization. The run took
1,201.53 seconds and passed 135 Node cases, 56 Counting cases, 3,614 plain
cases with one skip, and 1,070 Native cases with two skips. All four terminal
reports are complete, with no contradictory records or unhandled errors.
The source and dependency snapshots agree, and the owned process group is
closed. The skipped Page recorder has no final module duration; the
manifest retains that qualification and the 99 suite or unknown observations.

The gate manifest seals 13 public files, with SHA-256
`cdb29cb5114d11735c96b1e18d28e0bdaf88144a26c2755acfb1d071810c07af`.
Its retention record indexes 2,276 private raw originals, including TEST
custody. The unchanged gate wrote its stage output into durable storage;
a recorded wrapper redirects only bare `mktemp -d` placement.

The archive owner passed in 233,075 ms. That pass does not establish the
historical failure's cause; request `64552d40` remains open.

The committed manifests list every retained public file and its hash:

| Manifest | Sealed files | Checkpoint |
| --- | ---: | --- |
| [Focused owner](evidence/2026-11-04-question-summary-focused.manifest.json) | 21 | `2bd1ab4b` |
| [Card workflow](evidence/2026-11-04-question-summary-card-ci.manifest.json) | 11 | `2bd1ab4b` |
| [Complete gate](evidence/2026-11-04-question-summary-gate-validation.manifest.json) | 13 | `2bd1ab4b` |

Only this note and the three manifests follow the validated source head.
The source correction needs the planner's deployment decision. This record
establishes no real-host acceptance or Goose answer-size limit.
