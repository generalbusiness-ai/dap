# Reserve control paths from application publication

Security request `b300dca1`; promise `d107501f`; ruling `d92b5f66`.
This source draft has not run a compiler or test. It incorporates the audited R15 main landing `c9583a00`.

## What changes

The destination host checks each application file publication before the
provider push. It reserves `.github/`, root and `docs/` CODEOWNERS, the
room's agent instruction paths, and current Rules control extents. It uses
the existing bounded Git inspection and extent classifier, including
symlinks that expose an ordinary file through a control path. It checks
the requested path even when the proposed content already matches the tree.

The current authenticated Rules observation must name the exact bounded
canonical extent value. A missing or mismatched policy permits no push.
The host rereads the exact publication source and private credential after
the asynchronous inspection and policy read, before forwarding anything.

A refusal keeps the existing Native evidence `{send: not-sent, seen: <actual
head>}`. Historical judges record `host-refused`. A separate host diagnostic
names the reserved publication path and matched control pattern or extent.
The outside driver records only result, evidence and retained inputs; it
does not write that diagnostic into historical evidence. No fabricated
absent result, Native rule or old journal meaning changes.

## Decisions

Ruling `d92b5f66` narrows R16 to reserved paths in every room. This head adds
no package declaration, publication capability, prefix mapping, setting,
pin or creation family. Applications may still publish any valid ordinary
path. Existing Lending shelf paths keep their original meaning.

Declared per-application prefixes and a judged Destination policy wait for
the next Rules and Destination revisions another change requires.
`publication-paths@1` remains the starting proposal for that future work.
A filed security fix uses [kernel section 7](../../docs/kernel.md); review
must assess that exception and the host-only boundary.

## Reserved readers

| Paths | Reader |
|---|---|
| `.github` and `.github/**` | GitHub workflow/configuration and ownership readers; `packages/platform/src/extents.ts` includes workflows and actions in `RULES_PATTERNS` |
| `CODEOWNERS`, `docs/CODEOWNERS` | GitHub ownership reader; `.github/CODEOWNERS` already falls under `.github/**` |
| Every `AGENTS.md` and `CLAUDE.md` | Room control extent minimum in `RULES_PATTERNS`; ordinary changes use `classify` and `judgeExtents` |
| Current room extents named `rules` or classified `authority` | `rulesObservedValues` supplies the canonical current extent value; Destination's existing reservation policy reads the same control policy |
| Aliases into any of these paths | Existing `inspectGit` and `classify` follow old/new Git symlinks in both directions |

The existing path grammar separately rejects `.git` and unsafe path segments.
This head changes no path grammar. It adds no setting or deploy step beyond
the planner's normal reviewed Worker deployment.

## Evidence due

No validation result follows from this draft. Required witnesses cover old
and current creation pins: workflow and Rules-control refusals, the specific
host answer and generic recorded reason, ordinary committed publication,
Lending shelf publication and unchanged replay. Alias-to-control refusal,
missing-policy refusal and an unchanged-content reserved path also need
coverage. The five-case witness draft covers pure bounded policy and aliases,
old raw and trusted-package application routes, and the current family
through its existing finite device package. Both older routes use the actual
unchanged Lending definition for shelf commits. Include every affected
Worker compiler context in the frozen
focused plan, one meaningful policy-bypass control and one final gate.

## Open limits and deployment

Exact-head review, focused checks, control and gate remain due under `b300dca1`. The planner deploys after landing;
this draft changes no live room and supplies no acceptance result.

GitHub's [workflow reader](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)
uses `.github/workflows/`. Its [ownership reader](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)
uses `.github/CODEOWNERS`, `CODEOWNERS` and `docs/CODEOWNERS`.
The final head report must list these and every repository-owned control
reader with its source location.
