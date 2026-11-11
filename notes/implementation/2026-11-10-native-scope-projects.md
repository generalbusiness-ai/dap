# Split the Native Scope projects

TG-1 separates the Scope package's functional tests from the lanes,
CLI, Page, and MCP stories. The full gate passed once at
`c95bc118db07afbd87485608a95d4baf3b2c759f`, tree
`92cdd6efaa3c412d31c42b7c93d221bc4a8553d3`: 5,849 cases passed and
three skipped across 708 owners. The gate ran 45 compiler contexts,
16 typecheck scripts, and all six Scale cases. Its 111 UNKNOWN
wrapper observations remain separate from the 5,852 known cases.
The [sealed gate manifest](evidence/2026-11-10-tg1-final-gate-c95.manifest.json)
binds booking `df00b230b2457551b2ea0a306b748257968c3b5f` and END
`1f02105139d0984a88d1ad6c7d63a7983e91c722`.

## Project boundary

`vitest.projects.mjs` orders the Native projects as `scope`,
`scope-stories`, `scope-lending`, `scope-denial`, and `scope-scale`.
The first two projects each inherit two workers, the existing Scope
Worker and setup, isolate reuse, and the 30-second default. Their
file sets are disjoint. The lanes partition scale owner stays in
`scope-scale`. The summary, summary test, phase test, and
`docs/testing-reference.md` describe the five groups.

The counts follow the sealed case identities. Each cell gives
owners / cases. F adds one Scope package owner and case.

| Project | Main before F | TG-1 without F | F before TG-1 | Actual F with TG-1 |
| --- | ---: | ---: | ---: | ---: |
| `scope` | 284 / 1,127 | 189 / 795 | 285 / 1,128 | 190 / 796 |
| `scope-stories` | — | 95 / 332 | — | 95 / 332 |
| `scope-lending` | 1 / 1 | 1 / 1 | 1 / 1 | 1 / 1 |
| `scope-denial` | 1 / 1 | 1 / 1 | 1 / 1 | 1 / 1 |
| `scope-scale` | 4 / 6 | 4 / 6 | 4 / 6 | 4 / 6 |
| Total | 290 / 1,135 | 290 / 1,135 | 291 / 1,136 | 291 / 1,136 |

The actual story result was 330 passes and two planned skips: the
lanes demo recorder and Page screenshot recorder. The Plain MCP
budget suite supplied the third planned skip. All three skipped
case durations are null. The fully skipped Page recorder module
also has a null duration; its project timing remains partial.
No duration or successful case substitutes for these skips.

The post-gate metadata analyzer correction accepts that exact
planned skipped module. The original frozen analyzer remains
unchanged and unrun. The corrected analysis SHA-256 is
`dd9f6fb11c714b7860918d1369d74262425d5d1224eecc2f48d16d00cce7e16c`;
the terminal readback SHA-256 is
`e7edb009492fb5c894f3b5bfaf480741ba0c9696c17d4684f0acedeca2ff065b`.
Both remain in the gate's indexed custody.

## Story selectors and browser checks

- The Page and lanes recorders select `scope-stories` through
  `scripts/demo/recorder-output.ts`.
- `scripts/test-j3-runner.mjs` and `scripts/test/j3-runner.config.mjs`
  select `scope-stories` for the lanes manifest-tree witness.
- `packages/mcp/test/support/actor-cards.ts` selects `scope-stories`
  for the Change-view actor chip used by the Views browser workflow.
- The CLI and MCP README command examples select `scope-stories`.

The tracked-tree scan found no direct old selector in a package
script or workflow. The evidence runner and Effects control still
target Scope package files. Historical commands and the historical
reservation-record fixture retain their original text. A CLI test
comment still carries the old command; an unrelated Lending example
already named the wrong project for `scope-lending`.

Both required browser workflows passed at the exact c95 head through
`workflow_dispatch`, attempt 1. Page run **42944496863**, job
**130273928129**, completed all 12 steps successfully. Card run
**42944500401**, job **130273927963**, completed all 13 steps
successfully. The [CI manifest](evidence/2026-11-10-tg1-browser-ci-c95bc118.manifest.json)
preserves the dispatch receipts, exact head, jobs, and steps.
The earlier 92ad browser results remain historical.

## Focused and static checks

The [Node focus](evidence/2026-11-10-tg1-node4-92ad.manifest.json)
passed four cases across two whole owners at
`92ad89c47aed018cdf56dce232d85026dbbafc85`; six UNKNOWN wrapper
observations remain separate. END:
`e29ee5c673591c6e0deaec63dc9b5b7e65e7286d`.

The [static preflight](evidence/2026-11-10-tg1-static3-92ad.manifest.json)
ran `git diff --check`, the commit-message checker, and
`npm run format:check` at 92ad. All seven command and wrapper exit
receipts read zero. END: `b657d2c2bec2544bc8b2a3afae681e7e023d3b2d`.
Two initial root metadata readers requested absent fields; the
preserved correction repeated no static body.

Planner ruling `8deef67c2eecf94549124c8a22f061af96a3da14` and the
sealed C1 documentary carry preserve those 92ad results. The
ordinary merge to c95 added exactly ten C1 Markdown paths and
preserved all 4,600 other tracked rows and modes. The gate
manifest binds the carry proof. The original 92ad gate freeze
refused its changed-main context before any writes or body; its
actual exit 1 remains metadata history. The full gate and new
browser workflows ran at c95.

## Timing and memory observations

The c95 gate's gate, inner driver, outer driver, launcher, and
external command exits all read zero. Its inner duration was
1,362.115795625 seconds; its outer duration was 1,362.414667209
seconds. The outer interval ran from
`2026-11-11T02:27:18.246634+00:00` to
`2026-11-11T02:50:00.663345+00:00`. Waited-child CPU includes the
passive sampler and does not describe individual case timing.

The passive ten-second sampler recorded 137 samples. The
largest observed Node RSS was 2,510,304 KiB for PID 39628, start
`Tue Nov 10 21:27:47 2026`. The largest observed workerd RSS was
2,374,752 KiB for PID 60052, start `Tue Nov 10 21:35:11 2026`.
These are per-process sampled values, not heap sizes, instantaneous
maxima, or sums. Process lifetime upper bounds remain **UNKNOWN**.

Every observed workerd PID appears below. Starts use the exact
`ps` local start identity on 10 November 2026. Delta columns compare
each sampled RSS peak with each separate historical 43e9 process;
negative values mean a smaller observed sample. They do not compare
heap sizes or establish file-to-process placement.

| PID | Start identity | Peak sample (UTC) | RSS (KiB) | Delta vs 39509 (2,352,208) | Delta vs 39508 (3,057,488) |
| ---: | --- | --- | ---: | ---: | ---: |
| 2858 | `Tue Nov 10 21:31:16 2026` | `2026-11-11T02:34:48.451826+00:00` | 1,889,968 | -462,240 | -1,167,520 |
| 2859 | `Tue Nov 10 21:31:16 2026` | `2026-11-11T02:34:48.451826+00:00` | 1,751,920 | -600,288 | -1,305,568 |
| 60052 | `Tue Nov 10 21:35:11 2026` | `2026-11-11T02:41:38.450142+00:00` | 2,374,752 | +22,544 | -682,736 |
| 60053 | `Tue Nov 10 21:35:11 2026` | `2026-11-11T02:42:38.442333+00:00` | 1,701,600 | -650,608 | -1,355,888 |
| 69661 | `Tue Nov 10 21:42:43 2026` | `2026-11-11T02:42:48.443255+00:00` | 337,968 | -2,014,240 | -2,719,520 |
| 69856 | `Tue Nov 10 21:42:53 2026` | `2026-11-11T02:48:38.443002+00:00` | 925,952 | -1,426,256 | -2,131,536 |
| 69857 | `Tue Nov 10 21:42:53 2026` | `2026-11-11T02:49:48.447172+00:00` | 1,115,424 | -1,236,784 | -1,942,064 |

All seven process lifetime upper bounds remain **UNKNOWN**.

The failed 43e9 gate sampled 2,352,208 KiB for workerd PID 39509
and 3,057,488 KiB for PID 39508. PID 39509 aborted at 724 seconds;
BR-13 v5b reported a similar abort at 719 seconds. Those failures
remain historical evidence. One successful TG-1 gate establishes
neither a memory-growth cause nor a leak repair. The previously
named `controls()`, `metricBindings`, and `metricWiring` contributors
remain unproven.

This note records source and validation evidence. Review, landing,
deployment, and live acceptance require their own records.
