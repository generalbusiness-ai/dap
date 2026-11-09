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

At clean integrated head `e07ee76e`, tree `5a7c7773`, the four complete Node
owners passed all thirteen cases in one invocation: selection (three),
project partition (one), fixed stages (six), and report summary (three).
The actual owner and driver exits are 0. No case skips, retries or remains
unfinished. Every tracked byte stays equal, and the process group closes.
These owners use built-ins and project data, real scratch Git, and the
existing bounded process/report stand-ins. They import no workspace namespace.

Two named controls run the unchanged complete selection owner against that
saved passing baseline. Removing main's unconditional selection fails only
the assertion at line 12; enabling rename detection fails only the real-Git
removed-path assertion at line 67. Each owner exits 1 with two cases passing
and one assertion failure. Each control verifier exits 0 after restoring
every tracked byte and checking process closure. Neither baseline nor
restored source runs again.

The [focused manifest](evidence/2026-11-08-br5-focused.manifest.json), digest
`7cfef3181e3fcb7dd19c88977bf3cfbcb5cf2c617d0321a5b97e7485d5978f7b`, seals
26 public files and points to 55 focused originals and 57 files for each
control. The initial source-list freeze refused its empty terminal NUL
entry before producing a plan or starting an owner. The first control
preflight found an active esbuild service; neither control started until
the planner's deployment finished and a fresh sample found the slot clear.
Both refusals remain recorded. No validation repeats during sealing.

The worktree now has an owned APFS dependency copy, made without installing
packages. Its fourteen workspace links and forty-eight exports resolve to
this worktree, with TypeScript 7.0.2, Vitest 4.1.12 and esbuild 0.28.1 under
the unchanged lock digest. No compiler, Vitest/Workers, scale body, workflow
or full gate has run for BR-5 yet. The one final gate must observe all six
unchanged cases in `scope-scale` and none of those cases in `scope`.
No extra scale body runs before it. No elapsed cost reduction is claimed.
