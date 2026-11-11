# Split the Native Scope projects

TG-1 separates the Scope package's functional tests from the lanes,
CLI, Page, and MCP stories. Two gates lost a workerd process to a V8
heap abort after about 12 minutes. The split reduces the number of
files served by each runtime. The next gate will measure its effect.

At source head `fa1e2516`, `vitest.projects.mjs` orders the Native
projects as `scope`, `scope-stories`, `scope-lending`, `scope-denial`,
and `scope-scale`. The first two projects each inherit two workers,
the existing Scope Worker and setup, isolate reuse, and the
30-second default. Their file sets are disjoint. The lanes partition
scale owner stays in `scope-scale`. The summary and its test
(`scripts/test-summary.mjs`, `scripts/test-summary.test.mjs`),
the phase test (`scripts/test-phases.test.mjs`), and
`docs/testing-reference.md` describe the five groups.

## Expected Native counts

The counts follow the case identities in the sealed census. The F
columns use the reviewed F case inventory and require correspondence
at the eventual integration head. Each cell gives owners / cases.

| Project | Main before | TG-1 after | F before | F with TG-1 |
| --- | ---: | ---: | ---: | ---: |
| `scope` | 284 / 1,127 | 189 / 795 | 285 / 1,128 | 190 / 796 |
| `scope-stories` | — | 95 / 332 | — | 95 / 332 |
| `scope-lending` | 1 / 1 | 1 / 1 | 1 / 1 | 1 / 1 |
| `scope-denial` | 1 / 1 | 1 / 1 | 1 / 1 | 1 / 1 |
| `scope-scale` | 4 / 6 | 4 / 6 | 4 / 6 | 4 / 6 |
| Total | 290 / 1,135 | 290 / 1,135 | 291 / 1,136 | 291 / 1,136 |

The 332 story cases include two skips. The F inventory adds one
package-scope owner and case. The changed `vitest.projects.mjs`
selects Scale under the existing gate rule.

## Story selectors

- The Page and lanes recorders now select `scope-stories` through
  `scripts/demo/recorder-output.ts`. The Page browser workflow uses
  that helper through the screenshot and demo capture commands.
- `scripts/test-j3-runner.mjs` and `scripts/test/j3-runner.config.mjs`
  select `scope-stories` for the lanes manifest-tree witness.
- `packages/mcp/test/support/actor-cards.ts` selects `scope-stories`
  for the Change-view actor chip used by the Views browser workflow.
- The command examples in `packages/cli/README.md` and
  `packages/mcp/README.md` select `scope-stories`.

The tracked-tree scan found no direct old selector in a package script
or workflow. The evidence runner and Effects control still target
Scope package files. The scan retained historical commands and the
historical reservation-record fixture. It also found a CLI test comment
with the old command and an unrelated Lending example that already
named the wrong project for `scope-lending`.

## Workerd RSS observations

The failed `43e9b328` gate sampled these per-process peaks. PID 39509
aborted at 724 seconds. V8 reported about 1.4 GB of live heap after a
full collection. BR-13 v5b reported a similar abort at 719 seconds.

| Gate | PID | Observed RSS peak (KiB) |
| --- | ---: | ---: |
| `43e9b328` | 39509 | 2,352,208 |
| `43e9b328` | 39508 | 3,057,488 |
| TG-1 | Pending | Pending |

Record each TG-1 workerd PID with its start identity and peak sample.
The historical brief names three unproven contributors to heap growth.
The `controls()` map in `packages/scope/src/testing.ts` retains entries
by scope name. The test Worker sets `metricBindings` and
`metricWiring` more often than it deletes them.

TG-1 validation and the integration head remain pending. The
planner's order puts TG-1 immediately after F's gate, or first if
F's next gate ends in another heap abort.
