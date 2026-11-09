# Select the scale project for review and main

Request `d0afa034`, under Hugh's order `afdebb86`, chooses PD-3 option (a)
from the [tech-debt review](../2026-10-25-codebase-techdebt-review.md).
Every scale witness keeps its real bound and deadline. A separate canonical
project lets the review gate select the ruled paths, while main runs that
project after every landing.

Planner ruling `ea2e17ab`, ratified by `f740869e`, settles the inventory:
the six cited cases occupy four whole files. The new `scope-scale` project
selects those files unchanged. The ordinary Scope project excludes the same
four paths. The ten-input measurement moves with its file and supplies no
acceptance witness.

The selection helper reads actual `HEAD`, `origin/main` and their merge
base. Main always selects scale; the ordinary `npm test` also includes it.
For a review, the helper records all changed paths and selects the runtime
families, their tests, archive support, replay verifier and configuration
owners named in the ruling and in `docs/testing.md`. It disables rename
detection so a move out of a family still names the removed scale path.
NUL separation keeps paths with spaces intact. Shared fixtures remain off
that list as the planner ruled.

The fixed test owner records the decision before its stages start, passes
it only to Native, and retains it in the native stage ledger. The summary
marks an intentional omission `omitted-by-gate` with unknown duration and
refuses contradictory observed scale modules. A main-push workflow runs
all six cases through `npm run test:scale` after each landing.

The archive fixture reads `inject("maintainedApplications")` in
`packages/scope/test/support/archive-native-authority.ts`. The separate
project must retain that setup. The preparation keeps both existing Scope
global setup entries, its Worker and wrangler configuration, `isolate: false`,
the two-worker ceiling and the 30-second default allowance. Each case keeps
its explicit deadline. Copying the smaller denial configuration would omit
an input these witnesses need.

## Validation

No compiler, owner, control, workflow or gate has run for BR-5. Its three
prepared selection cases cover the main/review decision, the ruled families,
and a real Git rename out of a scale family. They use local scratch Git
only. The RoomOpening/BR-12 gate has passed and released the executable slot.
The four complete Node owners for selection, project partition, fixed stages
and report summary need their focused check, followed by two cheap controls
and one gate. The gate must observe all six unchanged cases in `scope-scale`
and none in `scope`; no extra scale body runs before it.
