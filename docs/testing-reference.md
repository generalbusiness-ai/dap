# Testing reference

The stand-ins that tests use, the harness time allowances, what the gate
runs, and the per-owner test inventories follow.
[Test dap](testing.md) gives the steps to write and run a test.

## Stand-ins and what they show

The scripted capability of `@generalbusiness/dap-scope/testing` is a
stand-in for the code of `hold@1` and `git-read@1`. The derive package
has that code, and the production ports hold it. A test that uses the stand-in says so in its name or its first comment.
It shows what a definition does once a capability has answered, and
nothing about a real hold, a Git read or a provider. A step that a test
scripts in it names an action and a window, and derives nothing. It
shows how a step's grant is read and judged, and nothing about the step.

Derive has two more values of made-up platform data, in
`packages/derive/test/fixtures-holds.ts`: `works` and `chain`, whose item
type `job` holds a reservation. They are the made-up data of the
contract's witnesses 18.47 and 18.49. Every count is made up, and every
rule is a stand-in that a test scripts. A test that uses one says so. It
shows where a count is taken, drawn and released, and nothing about a
count or a rule of a platform definition. The destination states
`holds` for its branch and publication types, and
`packages/platform/test/destination-creates.test.ts` checks their cleanup
and receipt pending work with the package's real rules.

A scripted membership, `Controls.membership` of the same module, is a
stand-in for the membership scope and for the reference to it that a
scope's genesis will record. The test writes each answer, and no journal
stands behind the head it names. With one, the scope's authority is the
real observation read, with the real guards and windows. A test that uses
it says so in its name or its first comment. It shows the observing
scope's side of a read, and nothing about membership.

Membership has two stand-ins of its own, in
`@generalbusiness/dap-platform/testing`. `office` is a made-up
directory that creates one membership scope. It stands for the real
directory and the register. `Roster` is a membership scope in memory
below such an office. A test that uses one says so. It shows
membership's rows and its ten rules, which are all the platform
package's, and nothing about a creation. `lacking`, of the same module,
is a control and no stand-in: membership's version less one rule, for
the rule that a version with a mark and no rule runs nothing.
`PlatformScope`, of the scope package's test Worker, is the deployed
class with the production authority and the platform package's own
rules: a test of real authority runs there, in the namespace `PLATFORM`
(`packages/scope/test/repository.ts` lists what is real in it).

The register and the directory have no stand-in rule: every mark of the
data of each has its rule in the platform package. Two fixtures are in
`packages/platform/test/support-creation.ts`. `Register` is a register in
memory, created by an install intent. `Directory` is a directory in memory
that such a register created by its own rules: the claim, the selecting
outcome with its `create`, the directory's genesis and the register's
record of the result are all judged. The genesis of each child and each
lane's entry are scripted, made by hand. A test that uses one says so. It
shows the rows and the rules of the two definitions as judgments in
memory. A creation on scope objects is
`packages/scope/test/creation-real.test.ts`, in the namespace `PLATFORM`:
the deployed class, the production authority and the package's own rules,
with a labelled stand-in for the Git host. The destination has a rule for
every mark, including `first-head` and `receipt`, so its creation needs
no substitute rules. The real-scope creation and publication witness
follows.

The rules scope has four stand-ins, in
`packages/platform/test/support-rules.ts`. `registrar` is a made-up
directory that creates one rules scope. `asker` is a made-up lane that
tells it `rules-wanted`. `Rulebook` is a rules scope in memory below such
a registrar, whose acts are judged on the test authority of derive's
fixture set. `standing` is an observation of a member that the test
writes by hand: no membership scope answered it. A test that uses one
says so. The data and the six rules of `platform:rules@2` are the
platform package's, and none of them is a stand-in. Such a test shows
the rows and the rules as judgments in memory. The rules definition states
a value place for check configurations and answers a rules observation
with its publication revision and the digest of its extents. The reading
scope retains the bytes beside that observation. The real scope witness
below reads that answer from the rules scope.
`packages/scope/test/values.test.ts` separately shows the generic match,
SQLite retention and domain read routes, with derive's made-up `gate`
data and rules. Its outcome witness also shows an owner-declared evidence
value across a restart: bad bytes write nothing, the valid journal replays
over HTTP, and missing bytes make that replay `incomplete`. Its grants and
outside system remain stand-ins.

The destination has stand-ins of its own, in
`packages/platform/test/support-destination.ts`. `bureau` is a made-up
directory that creates one destination scope. `Branch.read` supplies the
observations and copies of lane entries at hand for a reservation. The
lane's and register's entries, the observations, and each Git host answer
are written by hand. `Branch` is a destination scope in memory below that
bureau, and derive's judges write its entries. Every destination mark has its
rule in the platform package. No substitute `first-head` or `receipt` rule
is supplied. `Branch` still replaces the lane reader with a scripted
`LaneRead`, rather than reading a lane's entries. The package's production
reader is tested in `packages/platform/test/destination-reading.test.ts`
on entries written by hand: its author and deciding-key lists, and its
checks of each job and verdict's provenance. The rows of `judge`, its
changed-set value and its holder counts are the package's code. These
tests show its judgments from scripted inputs, and no live host, gateway
or push.

`packages/scope/test/creation-real.test.ts` runs the register, directory,
membership, rules and destination as real Durable Objects under the
deployed class and the platform package's rules. The directory creates
and confirms all three children. The destination records its first head
and receipt, reads the real rules and membership scopes, and uses its
production reader over retained lane bytes to reserve and publish the
first change with a required passed check. Membership accepts the checker member
and its active key. The rules scope retains the actual configuration bytes and
publishes its digest, required status and checker. The destination retains the
job opening and decision, reads the checker's current standing, and accepts their
pass against those rules. Its receipt becomes written and its tokens are cleaned up.
The publication's holder counts are read from SQLite, including its
`withdraw` decision before publication and its release on the final item.

The source change lane's manifest, job opening, passed decision and merge
entries are written by hand and anchored. No real lane accepts them, and no
checker runner runs. The decision uses the accepted checker key and a fresh
`change.check` grant built from a real membership answer. The test supplies the
source read metadata and the passed outcome. The Git host is `OutsideDouble`,
a scripted port whose replies name the package's computed target IDs.
No host runs. Reads use the test readers except for the separate real
read-session witness. All five runtime journals replay `consistent` over
HTTP, with their authority derived from the membership journal and only the
four scripted source facts anchored. Publication updates to that scripted
lane remain pending. This shows the creation and destination's first
publication through these boundaries. It proves no deployment, production
host or complete lane journey. The current judge checks the capacity of
entries, and not yet of items, records, retained bytes or pending
requests.

The bound-request tests in `packages/derive/test/forms-binding.test.ts`
use the real holder ledger: counts are taken and added, a bound deciding
entry draws one even when refused, its requests draw on the holder, and a
final item releases its decisions. Folding the journal derives the same
counts. The platform data and rules remain made up. The replay witness in
`packages/replay/test/decisions.test.ts` runs the real verifier on a judged
receiver journal, with the sender's entries written by hand and anchored.
It checks that the taking entry fits its decision reservation. These tests
show no behavior of a dap platform definition. The marker-duty tests
in `forms-settles.test.ts` also use made-up platform data and rules.

The rows of `observes` have a made-up definition and two scripted scopes.
`weigher`, in `packages/derive/test/fixtures-observes.ts`, is made-up
platform data whose acts, one kind of `outcomes` and one clause of a
result state rows, with a stand-in rule for each of its marks. It is no
definition of dap. The destination, membership and task platform data
now state their own rows, separately from these fixtures. Each
observation of that file is written by hand. A test that uses it says so.
It shows where a subject comes from, what the judges retain and what a verifier derives,
and nothing about a rule of a destination or of a rules scope.
`Controls.rulebook`, of `@generalbusiness/dap-scope/testing`, is a
scripted rules scope, beside the scripted membership: the test writes
each answer and the bytes that are said to come beside it, and where the
scope is said to record that reference. The platform rules scope has its
own observation answer, and this script replaces it in the generic tests. With either script the reads of
`packages/scope/test/observes.test.ts` are the real ones: before the
turn, numbered in the run, judged in the commit, and kept by the store.
One test of that file reads a real membership scope of the namespace
`PLATFORM`, by its own method `observe`. There the reference by which the
made-up scope records membership is still written by the test.
`Weighing`, in `packages/replay/test/weighing.ts`, is such a scope in
memory, whose entries derive's judges wrote. Each head and each entry
that was made by hand is anchored.

The token ledger has three stand-ins. `TokenHost` and `Vault`, in
`packages/git/test/support/tokens.ts`, stand for a Git host's token
interface and for the gateway's side of the handoff of a plaintext.
`TokenHost` mints and revokes in memory, with a fault for one request: a
refusal, a lost request, a lost reply, or a reply out of form. `Stager`,
in `packages/scope/test/hosted.ts`, answers the one request of an attempt
of a staging as the test wrote it. The fixture `hosted` of that file runs a
real scope on the capability's code, with the git package's real
`TokenDriver` as its port for outside effects. A test that uses one says
so. Such a test shows what the driver and a scope do with a host's
answers, and where a plaintext is. It shows nothing about a real host, a
gateway, a fork or a push. The sealed entries of
`packages/git/test/host.test.ts` are made by hand, and no scope judged
them (`notes/implementation/2026-10-05-i3-contract-deltas.md`, entry ET12).

A replay of a journal that the test authority wrote says so:
`grants: "as-recorded"`. Its grants hold no freshness proof, and the
report lists them as trusted. The replay command never takes that option.

The replay package has two journals with stand-ins of their own, in
`packages/replay/test/staging.ts`. `Lane` is a staging lane and `Gate` a
scope under made-up platform data. Derive's judges wrote every entry of
both, with the code of `hold@1` and `git-read@1` or with made-up rules.
Three things are stand-ins, and the file labels each: the two entries of
the lane's creator, each observation of membership, and every answer of
the outside system. A replay of them is given an anchor for each of the
first two. Their grants hold a freshness proof, so they are replayed as
`proven`. Such a test shows what a verifier derives from a journal. It
shows nothing about a creation, about membership or about a Git host.

`codeLost`, of the same module, supplies each platform definition with
its data and with no rule, while a test's control says so
(`platformCode`). It stands for a runtime that lacks the rules of a
version. It shows what a scope answers when its pinned definition cannot
be run, and nothing about any rule. Without it the platform definitions
are the platform package's, with their rules, as in production.

A scripted peer, `net.peers` of the same module, is a stand-in for a scope
of a platform kind that the test does not run, such as a rules scope or a
destination. The test writes the peer's entry by hand, and nothing judged
it. A test that uses one says so in the same way. It shows the receiver's
side of a delivery, and nothing about the peer.

The checker service has three stand-ins, in
`packages/checkers/test/support.ts`. `Lane` stands for the scope
namespace: one change lane and its repository's rules scope, with entries
made by hand that no scope judged, and answers to a submit from a script.
`MemoryDurable` stands for the service's durable storage. `ScriptedRunner`
stands for a runner: it returns a stated end and runs nothing. A test that
uses one says so. Such a test shows the service's own side: what it reads
before it runs, what it starts, keeps and signs. It shows nothing about a
lane's judgment, a storage's loss, a container or a real runner. The
runner's checkout is tested on a real local repository, which is not a
host. What a real change lane does with the service's signed results is
one scenario of the lanes, `apps/room/lanes/test/checks.scope.test.ts`,
which calls the service's origin read and its signer as functions.

`apps/room/lanes/test/edit.scope.test.ts` runs `dap edit` as the
command-line story runs its commands, on each host through the production
wiring of its ports (`artifacts-wiring.ts`, `github-wiring.ts`) over a
labelled stand-in of `packages/scope/test/hosts.ts`, which keeps refs and
objects in maps and decodes each pushed pack. The site route reads the
published file back over the same stand-in. The test lives with the lanes,
because it needs a lane definition and no other package may name the
lanes package. The stand-ins live in the scope package, which may name the
git package.

`apps/room/lanes/test/manifest-tree.scope.test.ts` exercises the manifest-list
successor on real platform and lane scopes, through the production wiring
of Cloudflare Artifacts over its labelled host stand-in. It
records two signed file entries and a frozen manifest, reserves the shared
tree before a required check, refuses a wrong source digest and wrong job
tree, and publishes only after a configured checker member signs a pass.
The destination replays from its retained inputs. The actual CheckerService
reads a signed, job-bound reservation read over the Worker route, validates the recorded reservation and its object closure,
and signs the result that the lane accepts. Its durable storage and runner
are stand-ins. `packages/checkers/test/runner.test.ts` separately checks
both object-overlay verification and exact reservation-ref fetching with
actual private Git checkout and a
configured step that reads both files. No container platform or deployed
checker service is established by these witnesses. A held outside answer
shows that a retry fence invalidates the old result even when the old
current-job read finished first. Other cases preserve an unresolved push
when its retry is refused, cancel a pre-push reservation, drain its recorded
deadline, and refuse a final membership read that exceeded its window.

The explicit `scripts/test-j3-runner.mjs` command supplies the production
Node container runner to that file's one-file proposal scenario. It requires
a running nerdctl engine and a pinned image containing the reviewed relay
and the test probe. It runs an actual passing check, accepts its signed result
and publishes its exact tree, then keeps a second proposal unpublished after
an actual failing check under the same configuration. It also checks the
existing wrong-tree refusals. The host, scheduler, activation and configuration
ports, and service durability remain labelled stand-ins. Separate direct jobs
exercise read-only Git access, custody and network isolation, fresh filesystems,
bounded termination and retained recovery. This command fails when its runtime
is unavailable. The ordinary gate keeps its stand-in runner. Neither mode
establishes a deployed checker service. See
[the runner guide](../packages/checkers/README.md) for the explicit command.

`apps/room/lanes/test/issues.scope.test.ts` runs `dap issue`,
`issues`, `edit --closes`, `merge --closes` and `verify --all` the same way,
on Artifacts only, for the same reason.
`apps/room/lanes/test/demo.scope.test.ts` runs the demo runner's rehearsal,
`scripts/demo/rehearse.ts`, the same way: every shot of the demo script's
middle, from the planned install to the page, with a stand-in for `git`
that reads the stand-in host. Its second test is the recorder for
`scripts/demo-captures.ts --recorded`, and runs only with `DEMO_RECORD=1`
([demo.md](demo.md)).

`apps/room/lanes/test/support/room.ts` creates a repository on the real
platform scopes, in the namespace `PLATFORM`, as `founding-real` does, and
its real directory creates lanes under the digests that its real rules
scope activated. The lane scenarios on it, `wiring.scope.test.ts` and
`story.scope.test.ts`, use no test authority, no scripted peer and no
scripted capability. A lane's grants are read from the real membership
scope, and a merge is judged and published by the real destination. Two
things are stand-ins, and the fixture labels each: the Git host, which is
`OutsideDouble` for the destination and `Host` for each lane, and the
changed set that the host's judge read answers with, which the test states.
Such a test shows what the lanes and the platform scopes decide from those
answers, and nothing about a real host, a real tree or a runner.

## Time allowances

The Native archive fixture joins owned work for at most nine seconds when it
closes. If close fails while ownership remains, the fixture keeps its clock
and resources. Later cases skip before allocating another fixture, with the
reason `Native archive fixture skipped: prior close failed; ownership retained`.
The original failure still fails the run. Late task completion does not clear
that failed owner. Ordinary overlap with a healthy owner is an error.

The `scope` and `scope-stories` projects inherit the thirty-second
framework allowance in `packages/scope/vitest.worker.config.ts` for
cases without an explicit limit. Each worker reuses its own isolate
across files in its project.
The offline public archive command uses a process limit of at least three
times its measured median on the shared machine. When only the enclosing
follower has timings, use its median as a conservative bound for each
concurrent child, and leave reporting and joined cleanup time in the outer
test allowance. State the sample and keep the failed original limit as
evidence. This harness rule does not raise a Native producer or protocol
deadline.
The dedicated `scope-lending` project preserves the same thirty-second
allowance for its unchanged story. Case-specific limits and modeled
protocol, read, clock, capacity and latency assertions keep their own bounds.
Pure Node projects and the separate `scope-denial` project keep their
existing budgets. This allowance describes the harness, not product
latency. A committed budget change needs a new gate at the exact head,
and earlier failed runs and their original limits stay as evidence.

## What the gate runs

The gate checks commit messages, shared helpers, section citations and
documentation links before typechecking. It also runs the Node tests for
the commit-message and section-citation checkers.
Run the gate with Node 22.18 or later in the 22 series, or with Node 23.6
or later. Those checks import TypeScript directly, and that range is the
`engines` field of `packages/replay/package.json`.
It uses the same `git merge-base HEAD origin/main` base as the whitespace
check, and checks every commit in `base..HEAD`, including merges and side
history.

After `doc-links`, the `notes` step runs
`node scripts/check-notes.mjs <base> HEAD` with that same base and prints its
warning lines. Findings do not fail the gate. Git, base, or decoding errors
still fail the step.

The one-time historical subject audit uses
`node scripts/check-commit-messages.mjs --subjects-since 2026-10-01T00:00:00-04:00 main`.
It visits all commits reachable from `main`, filters subjects by committer
date with `--since-as-filter`, and reports JSON. An older-dated parent does
not hide a newer-dated ancestor. It reads history without changing
it. This audit does not make historical commits part of the branch gate.

The gate runs `node scripts/check-shared-helpers.mjs` before typechecking.
For a gate that needs a durable list of started and finished cases, set
`ARTROOM_TEST_PROGRESS` to a new path in an existing evidence directory.
The test command prints separate paths for its plain and native phases.
Each Vitest process uses verbose output and writes its own JSON lines for
case callbacks, each case's final framework state and the run's end. Native incremental
callbacks can omit cases that later report passed, so a start without a
result marks a reporting gap. It does not prove that a case is still
running or identify a cause. An existing file is refused. This observes
the same cases, workers, assertions and deadlines.

The helper check parses source declarations and the bytes package's actual runtime
exports, without executing those files. A local function that redefines
an exported bytes helper must import its existing implementation. If it
has a different meaning, give it a distinct name. Imports and public
re-export aliases are allowed. The check includes new untracked source
files and excludes test fixtures. Its two Node cases run in `npm test`.

It installs only if `package-lock.json` changed since the last install,
typechecks every workspace, and runs the fixed stages of `scripts/test.mjs`
in order: the kernel boundary check, the maintained Node checks, the
Counting build and generated Node witnesses, the sixteen plain Vitest
projects, then the native Vitest projects selected below. Any failed stage stops the
later stages. The plain phase selects its project data before Vitest
resolves inherited configs, so an early failure starts no Worker project.
The two phases share the canonical declarations in `vitest.projects.mjs`.
The full `vitest.config.ts` stays available for focused commands.
The compatibility witness uses the guarded actual pool factory and private-copy
workflow. Its plain Node base class is not native authority evidence. The active-source script checks that no
active file imports from `spikes/parked/` or names a removed format, and that no
platform package depends on the lanes package or imports from it. It prints the head, the tree and
each step's elapsed and CPU time. It also fails on a whitespace error in
what the branch changed.

`scripts/test-selection.test.mjs` runs in the Node stage. It fails when a
tracked `*.test.*` or `*.spec.*` file is in no gate step. The gate steps
are the two `node --test` steps of `scripts/gate.sh`, `nodeFiles` in
`scripts/test.mjs`, the four Counting witnesses, and the files that
`vitest list` selects in the plain and native phases. When you add a test
file, add it to one of these steps. If no gate step can run it, add it to
`excludedTests` in `scripts/test.mjs` with a reason.

The sixteen plain projects share one group with at most four active file
tasks in total. The root `test.maxWorkers: 4` sets this limit in the ordinary gate.
The `scope` project follows in the workerd pool, against real Durable
Objects with SQLite storage. It runs the Scope package's functional tests
with two workers. The `scope-stories` group then runs the lanes, CLI, Page,
and MCP stories in its own two runtimes. Each worker reuses its isolate
within its project. The `scope-lending` and `scope-denial` groups follow
with one runtime each. These limits apply to active file tasks. Child
processes and teardown can overlap.
The
`git` project runs the real `git` program, as a client and as a server, on
local repositories, and one file of the `checkers` project runs it for the
runner's checkout. Nothing runs twice.

Both `npm test` and the gate print up to ten slowest observed cases and
the observed test-and-hook duration sum for each Vitest project. Node and
Counting have separate case-duration sums. These concurrent duration sums
are neither elapsed time nor CPU time. Missing durations stay unknown.
Failed or incomplete phases are labelled partial, and stages that never
started are labelled unreached. Older Node APIs can lack stable case identities.
All such terminals stay unknown and are excluded from ranking, including
typed file wrappers the API cannot distinguish. Reporter EOF plus a successful
stage exit proves stream consumption only, not complete case coverage, and
the summary invents no public test count. Counting records the generated Node file
and its validated source mapping. Its result does not show that the
browser runs it.

The test command prints its evidence directory. Timing observations stay
separate from the optional callback stream above. A failed pre-test gate
check still prints a summary with no observed cases and unreached stages.
Report failures fail an otherwise passing run while preserving an earlier
child failure. A process killed before finalization cannot print a final
summary.

The existing Lending story runs only in `scope-lending`, after `scope-stories`.
It uses the same real Worker, SQLite, read sessions, story acts, expected
assertions and deadlines. It needs neither the clone server nor maintained
application capture setup. Both the root and Scope package entrypoints
select the story exactly once.

The `scope-denial` project then runs the post-sent local-denial witness in
its own Worker runtime, with the same Worker and real SQLite storage. Both
the root and Scope package entrypoints include it exactly once. The other
Operations witnesses, including T19's native global abort, stay in `scope`.
The original denial body and all T19 assertions stay. Their operation
opening uses one shared helper, not a second fixture implementation. The
denial project starts no clone fixture or Git server.

### Scale selection in the review gate

The `scope-scale` project follows `scope-denial` in its own Worker runtime.
It keeps the original Scope Worker, wrangler configuration, both global setup
entries, `isolate: false`, two-worker ceiling and thirty-second default.
Every case keeps its real bounds and original explicit deadline locally.
Its four complete owners contain six cases:

- `packages/scope/test/floor-archive.test.ts` (three cases, including the
  ten-input measurement that supplies no acceptance witness)
- `packages/scope/test/archive-one-entry-scale.test.ts`
- `packages/scope/test/archive-cadence.test.ts`
- `apps/room/lanes/test/directory-partition-success-capacity.scope.test.ts`

`npm test` includes all four native projects. `npm run test:scale` selects
only `scope-scale`. The review gate passes `--gate` to the fixed test owner,
which reads the actual head, `origin/main`, their merge base and the complete
changed-path list. Main always includes scale. A review includes it when a
path matches one of these ruled families or files:

- `packages/scope/src/archive*` and `packages/scope/test/archive*`
- `packages/git/src/journal*` and `packages/git/test/journal*`
- `packages/derive/src/floor*`, `packages/derive/test/floor*` and
  `packages/scope/test/floor*`
- `packages/platform/src/directory-partitions*`, its corresponding test
  prefix, and `apps/room/lanes/test/directory-partition*`
- `packages/scope/test/support/archive*.ts`
- `packages/replay/src/archive.ts`
- the configuration and selection owners: `packages/scope/vitest.scale.config.ts`,
  `packages/scope/vitest.worker.config.ts`, `packages/scope/vitest.scale-files.ts`,
  `vitest.projects.mjs`,
  `vitest.native.config.ts`, `vitest.scale.config.ts`, `scripts/gate.sh`,
  `scripts/test.mjs`, `scripts/scale-selection.mjs`,
  `scripts/scale-selection.test.mjs`, `scripts/test-phases.test.mjs`,
  `package.json` and `.github/workflows/scale-tests.yml`

The diff disables rename detection and separates paths with NUL. A move out
of a scale family still selects the removed source path. Missing Git context
refuses the selection. The test owner's `scale-selection.json` and native
stage ledger retain the decision, its reason and the changed paths. A gate
outside these paths reports `scope-scale` as `omitted-by-gate`, with unknown
duration, rather than as a passed, skipped or missing test project. Observed
scale modules that contradict an omission fail the summary.

The trigger list leaves out these shared inputs:
`fixtures-native.ts`, `test/worker.ts`, `test/outside.ts`, the room test
support, `sqlite.ts` and the rest of derive. The
[main scale workflow](../.github/workflows/scale-tests.yml) runs the complete
scale project after every push to main, including each landing, and catches
changes through those shared inputs. A review outside the listed paths
therefore establishes no scale result. The unchanged witness bodies retain
their earlier acceptance meanings.

The main scale workflow gives the slower GitHub runner a deadline factor
of three. Only the main scale workflow sets
`ARTROOM_SCALE_DEADLINE_FACTOR=3`; the local and review gates leave it
unset and retain the original deadlines. The factor changes each case's
harness allowance, including the thirty-second measurement. It changes
no test body, entry count, bound, or assertion. The workflow allows ninety
minutes for the complete job.

`scripts/scale-runner.mjs` writes full stdout, stderr, and the Vitest JSON
report to `$RUNNER_TEMP/artroom-scale`. It prints each case's result and
duration and preserves the child failure. Missing, duplicate, or incomplete
results also fail the summary. An always-run artifact step retains these
files for seven days. The first main run `42570561287` remains failed;
a later runner result records a separate observation.

The command line's story, `packages/cli/test/*.scope.test.ts`, runs from
the root inside the `scope-stories` project. Its
commands go over the Worker's HTTP routes for the namespace `PLATFORM`,
called in the test's isolate. The Git host and the scheduler are labelled
stand-ins in the file. Its readers are the real read sessions and signed
reads, under a session secret that the test generates. The test's own reads
of what a scope holds go past them by `platformNet.inspector`, a reader that
the command never presents. The `cli` project is its Node test of the key files.

The separate built-in Node resolver file, `packages/cli/test/config-dir.test.mjs`,
contains three cases and is outside Vitest's `*.test.ts` selection. The root
`npm test` command runs that file once in its explicit Node test list, so
`npm run gate` runs it once. `npm test --workspace @generalbusiness/dap-cli`
runs the package's Vitest tests, then those same three resolver cases once.
The gate does not invoke the CLI package's test script separately.

To run a control of the story, give `scripts/control.mjs` the root as its
package directory with `-- . --project scope-stories story`.

The page's story, `apps/room/page/test/story.scope.test.ts`, runs from the
root inside the `scope-stories` project. Its room is `apps/room/page/test/support/demo.ts`:
created by the command line over the Worker's HTTP routes, with the real
read sessions under a TEST SECRET, and the site route for addresses under
`/site/`. The Git host (`OwnGit` under the production wiring of Artifacts)
and the scheduler are labelled stand-ins there. Its reads
and acts are the page's own data functions. The `page` project is its Node
tests: the states of a change, and that the scope Worker's page module
(`apps/room/page/assets.ts`) is the page's build of its source.
`record.scope.test.ts` is no test of a property: it runs only with
`PAGE_RECORD=1`, and `apps/room/page/test/screens.mjs` uses what it prints
to take the page's screenshots in a browser. That script needs
`playwright-core` installed outside the checkout. It is not part of the
gate, and [`page-browser.yml`](../.github/workflows/page-browser.yml) runs it.

The lane scenarios, `apps/room/lanes/test/*.scope.test.ts`, run from
the root inside the `scope-stories` project. Each runtime loads the same
Worker code.
The root `vitest.config.ts` adds them, and no file of the scope package
names the lanes package. The Site publication and clock lifetime scenarios
also live in the lanes package: they need its definition or graph. They use
the Scope package's existing host, repository and lifetime helpers, with no
copy of a fixture or change to the native Worker classes. The lanes package keeps
`vitest.scope.config.ts` and `wrangler.test.jsonc`, which run the same
files alone, in a Worker of its own with the same classes: for `npm test`
in the package, for `scripts/control.mjs` and for
`scripts/measure-tests.sh`. A scenario's client calls the scope service's
own operations, `api` of `@generalbusiness/dap-scope/worker`, in the
test's isolate. A few acts go over the Worker's HTTP routes, where the
scenario is about a route. The reason is cost: in the workerd pool a call
through the Worker's entrypoint takes longer the more of them one run has
made (an observation, recorded in
`notes/implementation/2026-10-05-i2-contract-deltas.md`, entry DK11).

The Node `lanes` project checks the definitions and the scripted CLI proposal
outcomes in `apps/room/lanes/test/cli-proposal-outcomes.test.ts`. The proposal
witness has no native judgment or authority. Its native counterparts stay in
`manifest-tree.scope.test.ts`. The four definition tests read the four byte files
under `apps/room/lanes/definitions`, and `docs/lanes-reference.md`,
without importing them. So `npm run test:changed` does not select them
when only one of those files changes, and the gate runs them.
Two sets of generated files follow the lane definitions:
`apps/room/lanes/src/digests.ts` with the byte files, written by
`apps/room/lanes/scripts/pin.mjs`, and `docs/lanes-reference.md`, written
by `apps/room/lanes/scripts/reference.mjs`. The pins test fails while
either is stale.

### The compatibility backport

`scripts/cloudflare-pool-compat.mjs` accepts only the pinned 0.22.0
pool package and complete known bundle hashes. Cache-linked views receive
a private physical copy, and the script never patches the shared cache.
The backport installs the upstream prototype Proxy once for each wrapper
class, and keeps native introspection and RPC behavior. It changes no
pool settings. An unknown package version or unknown bytes stop the
preparation.

## Entry-point inventory

The fixed Node stage includes `apps/views/test/s4.test.mjs` once. That
owner exercises the project adapter through bounded transport stand-ins
and uses real scratch files for the local reviewed-head store. The
stand-ins provide Membership, Directory and lane answers; they prove no
native authority, provider or live-room outcome. The Brief profile's
native refusal belongs in its lane Scope owner. Generic catalogue,
resource and local-action checks remain in the MCP package's owners.

`node --test scripts/security-entry-points.test.mjs` checks the route, method,
and gate-class bijection in [the Worker inventory](security/entry-points.md).
It derives names from source matchers, using boundary stand-ins for scope and
MCP dispatch. It checks binding-dependent MCP availability, the simulator's
fixed HTTP refusal, and the homepage's static-assets configuration. Source
seals require explicit review when matcher syntax, composition, or named gate
owners change. This structural test supplies no native authority evidence.
The in-memory control changes a real route matcher with the inventory fixed.
The root `npm test` command includes this Node file once.

## Local celld smoke

The fixed Node stage includes `scripts/celld-smoke.test.mjs` once. Its offline
cases check project identity, retained CLI planning and transport custody.
They do not start celld. The kept `scripts/test-celld-proxy.mjs` driver runs
separately against an explicit pinned executable and actual production Worker.
It owns its test TLS proxy, private configuration, client custody and process
closure. Its local result establishes no deployment, backup or fleet recovery.
See [Run the local Worker](celld.md). The same test checks that every
`uses:` reference in `.github/workflows/celld-smoke.yml` names a full
40-character commit hash with a trailing `# vN` major-version comment.
Pin every GitHub Actions reference that way.

The fixed Node stage also runs `scripts/mac-host-kit.test.mjs` once. Run it
alone with `node --test scripts/mac-host-kit.test.mjs`. On Darwin, its one
owner case runs the three Node files in `apps/room/celld/mac/test/` and the
Python modules `test_install`, `test_shutdown`, and `test_deploy` with system
Python. Each child has a 60-second timeout and a 2 MiB output bound. Child
Node and Python counts remain separate from that parent case. Outside
Darwin, the owner skips both children. These offline tests use scratch files,
synthetic loopback TLS, and scripted service ports. They start no host
services and prove no installed-host, shutdown, or deployment outcome.

## Card browser scripts

[`.github/workflows/views-browser.yml`](../.github/workflows/views-browser.yml)
runs three scripts in Chromium on Linux. `packages/mcp/test/views-browser.mjs`
presses through the cards on a fixture host, in two themes and three widths.
`packages/mcp/test/owned-scopes-browser.mjs` opens the Grow site, two rooms and
their benches, and checks that each room keeps its own card state.
`packages/mcp/test/grow-routing-browser.mjs` follows assignment and watering
routes through native owned scopes and checks section state across refreshes.
The workflow runs on a pull request and on a push to any branch, when the
change touches the card source, the generated module, a script, a script's
support files, the Grow check package or the workflow. Its `on:` block lists
the paths. The gate does not run the scripts, and `scripts/gate.sh` has no
browser step.

A head that touches `packages/mcp/browser/**`, `packages/mcp/src/views/**`,
`packages/mcp/src/service.ts`, `packages/mcp/test/support/actor-cards.ts`,
`packages/mcp/test/change-view.scope.test.ts`, or any of the three scripts cites
this workflow's run at the head's own commit. That citation replaces running the
scripts by hand and citing the result. A head's branch reaches `origin` only when you push it, and a run on `main` comes after the
landing. To get the run:

1. Push the branch: `git push origin <branch>`.
2. Find the run: `gh run list --workflow views-browser.yml --branch <branch>`.
3. Cite the run's URL and its conclusion in the implementation note.

To run a script on your machine, set the three paths. The output directory
must be under `/tmp`.

```
PLAYWRIGHT_CORE=<scratch directory>/node_modules/playwright-core \
CHROMIUM=<chromium executable> VIEW_CAPTURE_OUT=/tmp/<new directory> \
  node --import tsx packages/mcp/test/views-browser.mjs
```

After `npm ci`, the job has three steps of its own:

- **Tools.** The job installs `playwright-core` 1.63.0 under `RUNNER_TEMP` and
  compares its integrity value with the one in the workflow. That package then
  installs Chromium revision 1243, the revision that its `browsers.json` names.
  `package.json` and the lock file do not change. To move the version, change
  `PLAYWRIGHT_VERSION`, `PLAYWRIGHT_INTEGRITY`, `CHROMIUM_REVISION` and the
  scripts' assertions in one commit.
- **Generated module.** The browser loads card bytes from
  `packages/mcp/src/views/generated.ts`, not from `packages/mcp/browser/`. The
  job runs `packages/mcp/scripts/views.mjs` and fails if the module changes,
  because a fault in unbuilt source passes the scripts. After you change card
  source, run that command and commit the module.
- **Scripts.** The job runs each script in its own step, and any failure fails
  the job.

No step skips. A missing tool fails the job.

## Page browser scripts

[`.github/workflows/page-browser.yml`](../.github/workflows/page-browser.yml)
runs four commands in Chromium on Linux, with the tools step of the card
workflow:

- `apps/room/page/test/screens.mjs` opens the page's screens at desktop and
  phone widths. It checks the Create issue dialog, list context, a comment
  draft, the review forms, a refused review, the source preview, the editor,
  target sizes and overflow.
- `scripts/demo-captures.ts --recorded` takes the six pictures of
  [docs/demo.md](demo.md) and cancels a rule edit.
- `scripts/demo-captures.ts --recorded --claim-witness` checks the Create room
  dialog, its retries and its Web Lock across two tabs.
- `scripts/demo-captures.ts --recorded --label-witness` checks a local room
  label at 320 pixels in two themes.

The workflow runs on a pull request and on a push to any branch, when the
change touches the page, the brand files, the Worker's dispatch, the demo
recorder, the demo scripts or the workflow. Its `on:` block lists the paths.
The gate does not run these commands.

Each command first runs a recorder in the `scope-stories` project. The
recorder is `apps/room/page/test/record.scope.test.ts` or the second case in
`apps/room/lanes/test/demo.scope.test.ts`. The browser then gets the Worker's
recorded answers. A request that the recorder did not make fails the command.
A browser POST is answered by its path, so these commands admit no act.

`scripts/demo/recorder-output.ts` reads the record. It stops by name when a
line is missing or the digest on the end line differs. The record holds fixture
signing keys, so a failure message never quotes the recorder's output.

The commands write only under their output directories. `screens.mjs` needs a
clean tracked tree, because its `checks.json` names the commit it describes.
A missing tool fails each command.

To run the commands on your machine, set the same paths:

```
PLAYWRIGHT_CORE=<scratch directory>/node_modules/playwright-core \
CHROMIUM=<chromium executable> VIEW_CAPTURE_OUT=/tmp/<new directory> \
  node apps/room/page/test/screens.mjs
PLAYWRIGHT_CORE=<scratch directory>/node_modules/playwright-core \
CHROMIUM=<chromium executable> node --import tsx --no-warnings \
  scripts/demo-captures.ts --recorded --out /tmp/<new directory>
```

## Hand-run browser scripts

The other browser scripts run by hand.
`apps/counter/scripts/test-browser.mjs` is not one of them: it runs Node
witnesses, and the gate's Counting stage runs it.

| Script | Needs beyond Playwright and Chromium | The workflow's tools can run it |
|---|---|---|
| `packages/mcp/test/declared-*-browser.mjs`, `grow-*-browser.mjs` | nothing | yes |
| `apps/room/page/test/no-session-screens.mjs`, `mcp-second-device.mjs`, `issue-questions-browser.mjs`, `needs-you-browser.mjs`, `two-devices.mjs` | `WRANGLER`, `WITNESS_DIR` and a loopback port for a local Worker. `two-devices.mjs` takes about seven minutes | yes, with those two settings |
| `notes/2026-10-17-journey-views-design/render.mjs` | a static server over the checkout | no: it checks a frozen design packet |
| `notes/2026-10-17-compact-cards-design/verification/*.mjs`, `notes/plans/retired/027-artroom-usability/preview-qa.mjs` | absolute paths that no longer exist | no: they record past runs |

`packages/mcp/test/grow-routing-browser.mjs` runs in the Card workflow.
It opens **Read points**, waits for two automatic refreshes, and checks that
the section stays open. It also closes the section and checks that a refresh
keeps it closed. The card binds section state to the same view, page, item,
and scope; another card starts with its own state.

## Settings inventory

`node --test scripts/security-settings.test.mjs` checks the static inventory in
[Worker settings and bindings](security/settings.md). The checker follows
tracked relative and workspace runtime imports from each configured Worker
entry, including the separate `dap-celld-local` configuration. Each permanent
Worker name binds its literal physical entry, and re-exports do not merge
deployment identities. Its full runtime import closure remains checked. It compares
configured names and supported environment reads with the inventory, and
refuses unsupported environment syntax or forwarding rather
than silently omitting it. The tests compare the displayed lookup with the
canonical inventory rows and require undocumented source reads and configured
bindings to fail.

Parser, missing-value, invalid-value, and health descriptions still require
source review. This structural check does not execute Worker modules or prove
runtime failure behavior, deployed settings, provider connectivity, or hosted
authorization. The root `npm test` command includes this file once in its
fixed Node stage before Counting and the plain and native Vitest phases.

## Measuring the cost

`scripts/measure-tests.sh <output directory>` times each step
of the gate alone: elapsed seconds, and CPU seconds summed over every
process the step started. It also keeps each step's vitest report, from
which the summed test-file time comes. It fails if a step fails. A sum of
its steps is a sum of separate runs, not the time of one gate: for that,
time `npm run gate` itself, which also prints each of its steps.

Two figures judge the cost of the tests, for the whole gate and for one
edit taken to review:

- **elapsed**: how long the pipeline takes, which is how long a person
  waits
- **CPU**: user and system seconds over every process the pipeline
  started, which is what the machine spent

Other figures help to find where the time is. Say what each one is:

- **summed test-file time**: the test durations in vitest's reports. It
  leaves out imports and setup.
- **printed phase totals**: vitest's import and test totals over all test
  files. Parallel load inflates them.
- **single-worker suite time**: `scripts/measure-tests.sh <dir> --serial`
  runs each suite with one worker. Its figure is the elapsed time of the
  whole command in a configuration the gate does not use. Do not call it
  worker time.

A sum of separately timed steps is a sum. Say so, and do not present it
as one observed run.

State the machine, the load and the cache state with any figure.

## Read-token quota witnesses

The Scope owners `read-token-quota.test.ts` and
`read-token-quota-store.test.ts` distinguish two boundaries. The first uses
real Native scopes, membership authority, transactions, alarms, and the
Artifacts adapter over scripted provider replies. Its two scenarios cover
the eight-slot admission rule, several keys of one member, another member,
accepted-key reuse, rollback, refusal, unknown and late replies. The late
reply records confirmed metadata with no plaintext after a replacement
takes the eighth place, and the next fresh mint still refuses `limit`. The second
uses real SQLite with scripted opening entries and grants. It covers
private expiry, legacy rows, other-genesis boundaries, a 64-row cleanup quantum,
and the last representable clock; it proves no Native authority or provider
behavior. The existing read-token owner retains its one-time-read,
historical-hours, and replay witnesses.

## Source

The runner and selection rules above and in [Test dap](testing.md)
follow these sources:
[`package.json`](../package.json), [`scripts/gate.sh`](../scripts/gate.sh),
[`scripts/test.mjs`](../scripts/test.mjs),
[`vitest.projects.mjs`](../vitest.projects.mjs),
[`scripts/test-changed.mjs`](../scripts/test-changed.mjs),
[`scripts/control.mjs`](../scripts/control.mjs),
[`scripts/focused-check.mjs`](../scripts/focused-check.mjs).

Scale selection also uses [`scripts/scale-selection.mjs`](../scripts/scale-selection.mjs),
[`vitest.scale.config.ts`](../vitest.scale.config.ts) and
[the main scale workflow](../.github/workflows/scale-tests.yml).
