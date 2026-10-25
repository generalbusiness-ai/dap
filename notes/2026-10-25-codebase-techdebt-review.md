# Codebase technical-debt review

Status: landed `c5b8e00c`; describes work that is done. Request `72a6df7d`.
Slices landed on 25 October: PD-1 (`5248b0be`), BR-1 (`f5a6338c`), BR-2
(`86204d44`) and PD-6 (this head).

The planner deploys `dap-grow` from `apps/room/wrangler.grow.jsonc`. That file
sets the scope index to register mode. The live Worker has run in enforce mode
since 23 October, because every deploy adds the right flags by hand. A deploy
that follows the file would reopen the transition mode on a public Worker. This
review looks for debt of that kind: code, settings, tests and documents that
slow the current plan or put it at risk.

The review read Main `c8a3fb24` in a detached worktree and changed nothing
there. Five read-only inventories covered the seven lenses of the request:
half-finished transitions; size and shape, with generated files; test cost;
configuration drift, with dependencies; and documentation and status drift. Test
cost comes only from gate logs already on disk; no test or gate ran for this
review. Each kept finding was then checked against the files at `c8a3fb24`. The
reader gets 17 ranked findings and smaller items (section 4), the items that
stay (5), a question for the checker (6), decisions (7), and 14 builder requests
in plan order (8).

## 1. Terms

- **Gate.** `npm run gate` (`scripts/gate.sh`), passed at a head's exact commit
  before review and landing. A **landing** is a first-parent merge on `main`.
- **Worker test project.** The `scope` test project. It runs the scope, lane,
  CLI, page and MCP stories in one Worker runtime (`vitest.config.ts:42-46`).
  The other 15 are **plain projects**.
- **Recorded bytes.** Bytes that an entry, a genesis pin or a pinned digest
  holds, or that replay reads; a change to them, or to an entry's meaning, needs
  its own design note first.
- **Deploy hazard.** A checked-in file or documented command that breaks or
  weakens a live Worker if someone deploys as it says. A **seal** is a digest of
  one source file's syntax tree in `scripts/security-entry-points.test.mjs`. A
  **witness** is the test or check that shows an acceptance case holds.
- **How a number was taken.** "Counted by script" gives the command or script,
  "read from a log" the path, and "estimate" the method.

## 2. Ranking and sources

Deploy hazards rank first, because the planner deploys from these files. Gate
time and unrelated gate failures come next, because every head pays them. The
rest follow the plan order:

1. The archive milestone on `dap-grow`: request `1aedd35b` (Room A's next entry
   does not fit an archive pass), the restart of three other stopped rows,
   archive step 6 (clone and replay), and the archive sentence on `/grow/`. F2
   landed on 21 October (`2e228b3c`), ahead of its 4 November date; F3 deploys
   by 6 November (`notes/2026-10-20-retained-journal-floor.md:705-706`).
2. The security order of request `6dd06d03`: R7 and finding 3.4 (planner answer
   `aacfae90`: register 19, directory 18, rules 11, destination 14, on
   `dap-demo` only), then R11, R15, R16, D6 and R14.
3. Plan 032: views design `a9a3585c`, journey MVP slices S0 to S9 with J1 to J5,
   and the evidence-rules slice; hosted Counter and M1 in parallel.

Sources and method:

- **Earlier work.** The duplication survey of 19 October (a planner record, not
  a tracked note) measured literal clones at 0.3% and placed the mass in old
  platform versions, v1 forms, lane generations, the GitHub register, fixtures
  and helpers; K1 (`13193f31`), K2 (`d2088d23`) and K3 (`13da4cc6`) landed from
  it. This review does not repeat it, and builds on the history note
  (`notes/2026-10-20-history-out-of-the-readable-tree.md`, slices H1 to H8).
- **Gate logs.** 101 gate runs from 20 October 00:05 to 24 October 22:35 (96
  completed, 5 stopped), from 77 gate output folders and 128 captured gate
  outputs on this machine, under uncontrolled load. Phases come from
  `/private/tmp/artroom-security-docs-d3-gate-evidence-20261024-v1/` (head
  `56e82303`).
- **Scripts.** The five inventories and their scripts (`phases.py`,
  `verdicts.py`, `margins.py`, `perfile.py`, `sg-churn.py`, `sg-conflicts.py`,
  `outside.mjs` and others) are in `techdebt/` and `tc-work/` under
  `/private/tmp/artroom-planner-techdebt-20261025/`, 85 files listed in its
  `SHA256SUMS` (SHA-256 `e05b165e…`). Counts over Git give their command inline. "Last 7 days" means the 86 landings
  from 17 October 23:52 to `c8a3fb24` (counted by script, `sg-churn.py`).

## 3. Summary

| Rank | ID | Finding | Cost now | Action | Size | Recorded bytes |
|---|---|---|---|---|---|---|
| 1 | TD-01 | The grow and lending files set the scope index to register mode; four deploy commands lack `--keep-vars` | None today (flags passed by hand); a literal deploy reopens register mode | Write enforce into both files; fix the commands; config test | small | no |
| 2 | TD-02 | No file holds the R6 creation-pin allowances | The first deploy from `c8a3fb24` closes creation on historical cohorts | Allowances in each file; dap-demo deploy section; config test | small | no |
| 3 | TD-03 | `apps/room/worker.grow.ts` is not type checked | A type break reaches the archive host only at deploy | Add it to a checked config | small | no |
| 4 | TD-04 | One test worker runs 95% of each gate | About 23 minutes per gate and per rerun | Two or three workers, measured | small | no |
| 5 | TD-05 | Cheap checks run after the long test run | Estimate 2.9 hours over ten failed gates | Cheap checks first; print slow cases | small | no |
| 6 | TD-06 | Six scale cases at real limits | 12.1 minutes of each gate | Planner ruling; option (a) recommended | small (a) / medium (b) | no (a) / unknown (b) |
| 7 | TD-07 | One gate in six fails for a cause outside the head | 12 gates and 12,581 s in five days | Fix four recurring cases; limit rule; fixture skip | small | no |
| 8 | TD-08 | Archive stop and restart steps exist only in a delivery note | Each restart is rebuilt from a 15 KB record | Runbook section (planner) | small | no |
| 9 | TD-09 | Whole-file seals over 65 files | 27 of 86 landings edited the seal table | Seal declarations; one-line update message | small | no |
| 10 | TD-10 | Run records outweigh code in landings | 110,446 note lines against 83,712 elsewhere | Ruling: note shape and digest manifest | small + ruling | no |
| 11 | TD-11 | Version lists in 37 files outside the catalog | R7 repeats R6's hand edits | H4 after the milestone; a file checklist for R7 | large | no (exact) / yes (unify) |
| 12 | TD-12 | dap-demo is outside the entry-point check | Routes of the Worker that takes all new rooms are unchecked | Add dap-demo to the check and the document | small | no |
| 13 | TD-13 | The artroom-scope file is also the self-host template; its retired creation path is served | Self-host starts in register mode; live settings unreproducible | Split the file; commit settings; end date, then removal | small | no |
| 14 | TD-14 | No admitted family installs an ordinary package; guides name refused cohorts | Counter and Lending cannot install on a deployed Worker | Decide with R7; fix guides and CLI offer | small / medium | no (guides) / yes (rules) |
| 15 | TD-15 | The page bundle (863,307 bytes) is committed | 124 commits; 12 of 16 combining merges conflicted | Browser-safe CLI module; attributes; deploy-time build is a decision | small / medium | no |
| 16 | TD-16 | `commands.ts`, `object.ts` with `worker.ts`, `destination.ts` | Serial edits and merge conflicts | Split after the archive milestone | medium | no |
| 17 | TD-17 | Status lines and guides lag main | Readers take register 2 or 3 as current; unlisted checks fail gates | Planner H1 head; builder fixes; link check in the gate | small | no |

## 4. Findings

Brackets name the inventory items; sizes and order are in sections 3 and 8.

### TD-01: Two room files set the scope index to register mode

- Evidence (L5-01, T1-14): `apps/room/wrangler.grow.jsonc:80-81` (94 lines,
  3,482 bytes) and `apps/room/wrangler.lending.jsonc:17-18` (29 lines, 1,899
  bytes) set `"SCOPE_INDEX_MODE": "register"`, commented "Initial rollout only".
  Both Workers have run in enforce mode since 23 October
  (`notes/reports/2026-10-23-sprint-report.md:21-22`;
  `notes/reports/2026-10-24-sprint-report.md:194-196`). Of five deploy commands
  for them outside `notes/`, none passes the enforce `--var`, and four lack
  `--keep-vars`: `wrangler.grow.jsonc:3`, `wrangler.lending.jsonc:5`,
  `examples/grow/runbook.md:25,359` (counted by script: `git grep -n -E
  'wrangler(@4\.147\.0)? deploy' -- ':!notes/**'`, each line read for both
  flags). `--keep-vars` keeps only values that the file omits
  (`docs/deploy.md:3-7`).
- Who uses it and cost now: the planner, for each `dap-grow` and `dap-lending`
  deploy, and the Grow runbook. None today, because the planner passes
  `--keep-vars` and the enforce `--var` by hand. A deploy that follows the file
  or the runbook reopens register mode, where an unknown target can activate
  (`docs/security/settings.md:54-55`); without `--keep-vars` it also drops
  settings such as `MCP_ENABLED`.
- Action: enforce in both files; `--keep-vars` on the four commands;
  `packages/cli/test/demo-config.test.ts` asserts each room file's mode
  (register stays on `artroom-scope` by decision, TD-13).
- Risk and witness: a Worker still in register mode would be enforced; the
  reports and the planner's settings inventory record enforce on both. Witness:
  the config test and the enforce deploy and `scope-index verify` steps of the
  union procedure (`notes/implementation/2026-10-22-security-union.md:580-581`).
  Recorded bytes: no. Test removal: none.

### TD-02: No checked-in place holds the R6 creation-pin allowances

- Evidence (L5-02, T1-03): the default creation policy at `c8a3fb24` admits only
  the newest family, with register 18, directory 17 and destination 13
  (`packages/scope/src/creation-versions.ts:7-14`), for each new child
  (`packages/scope/src/creation-lineage.ts:37,105-108`). `dap-demo` serves the
  public offer on register 17 (`apps/room/wrangler.demo.jsonc:14`), `dap-grow`
  holds Register17 (`wrangler.grow.jsonc:5`), and `dap-lending` holds register 5
  (history note, section 5). Such a Worker "needs an explicitly reviewed
  `PLATFORM_CREATION_PINS` allowance for register 17, directory 16 and
  destination 12"
  (`notes/implementation/2026-10-25-security-r6-versioned-publication.md:17`;
  `docs/deploy.md:180-187`). No room file sets it (counted by script: `git grep
  -c PLATFORM_CREATION_PINS -- 'apps/room/*.jsonc'` finds none).
  `docs/deploy.md` has no `dap-demo` section, and the only `dap-demo` deploy
  command lacks `--keep-vars`
  (`notes/implementation/2026-10-23-dap-demo-part2.md:84`).
- Who uses it and cost now: `dap-demo` (all new rooms, the journey MVP's first
  room), `dap-grow` and `dap-lending`. Nothing breaks until the first deploy
  from `c8a3fb24`; without the allowance, that deploy refuses new
  historical-family children on all three, and `/health` does not show it
  (`docs/deploy.md:223-224`). R7 deploys to `dap-demo`.
- Action: each Worker's reviewed allowance goes in its file's `vars`, as
  `DEMO_START_CONFIG` does (lists from PD-8); `docs/deploy.md` gains a
  `dap-demo` section with its exact command; `demo-config.test.ts` asserts the
  `dap-demo` allowance of register 17, directory 16 and destination 12. The root
  cutover of `dap-demo` stays a planner item (`docs/deploy.md:211-214`).
- Risk and witness: a wrong list closes creation or admits an unreviewed family;
  the parser refuses unknown and duplicate pins (`creation-versions.ts:15-19`).
  Witness: `packages/scope/test/creation-versions.test.ts`, the config test and
  the creation check after deploy. Recorded bytes: no. Test removal: none.

### TD-03: The dap-grow Worker entry is not type checked

- Evidence (L5-05): `apps/room/wrangler.grow.jsonc:9` sets `"main":
  "worker.grow.ts"`, and `apps/room/worker.grow.ts` (28 lines) adds the archive
  driver and restart directive to the scope wiring (`:24`). None of the 41
  tracked tsconfig files includes it (counted by script: `git ls-files
  '*tsconfig*.json'`, each `include` read), and no source file imports it
  (counted by script: `git grep -n -E "worker\.grow" -- '*.ts' '*.mjs' '*.json'`
  finds text reads and a seal only).
- Who uses it and cost now: the live `dap-grow` Worker, host of the archive
  milestone. A signature change in the scope wiring or `growArchiveDriver`
  passes the gate and first meets `dap-grow` at deploy, where the bundler strips
  types unchecked.
- Action: include the file in a tsconfig that compiles `apps/room` tests, for
  example `apps/room/lanes/tsconfig.test.json`.
- Risk and witness: the first run can report type errors that exist today.
  Witness: `npm run typecheck`. Recorded bytes: no. Test removal: none.

### TD-04: One test worker runs 95% of every gate

- Evidence (TC-01): `packages/scope/vitest.worker.config.ts:12-13` sets
  `isolate: false` and `maxWorkers: 1` for the Worker test project. A passing
  gate of 24 October (head `56e82303`) took 1,373.25 s, its test step 1,355.6 s
  (read from a log: `result.json`, `stdout.log`). The Worker test project ran
  from 64.2 s to 1,321.4 s, after the plain projects: 1,257.2 s of 1,323.5 s, or
  95.0% (counted by script: `phases.py` over `progress.jsonl`). Ten files take
  79.5% of that phase, led by `packages/scope/test/floor-archive.test.ts` (313.9
  s). The median test step of passing gates rose from 517.7 s on 20 October (16
  gates) to 1,341.0 s on 24 October (11 gates) (counted by script over the
  parsed gate outputs).
- Who uses it and cost now: every gate; 101 runs in five days took 93,396 s, or
  25.9 hours, overlaps counted separately (counted by script, `verdicts.py`).
  Each review waits about 23 minutes for one gate, as does each rerun.
- Action: two or three workers, still with `isolate: false`; one measurement
  with `scripts/measure-tests.sh`; repair of any test that needs one shared
  runtime. Estimate: two balanced workers bring the phase toward 628.6 s (half
  of 1,257.2 s, computed by script), but not below the largest file, 313.9 s.
- Risk and witness: tests that share module state can collide, for example the
  archive fixture clock owner
  (`packages/scope/test/support/archive-native-authority.ts:80-146`) and the two
  global setups (`vitest.worker.config.ts:8`). Witness: one measurement run and
  one ordinary gate. Recorded bytes: no. Test removal: none.

### TD-05: Cheap checks run after the long test run

- Evidence (TC-03, TC-11): the `test` script runs the kernel-boundary check, the
  whole test runner, eleven `node --test` files and the Counting browser check,
  in that order (`package.json:14`), and the runner starts the Worker test
  project whatever the plain projects found. Seven failed gates failed only in
  plain projects (test steps of 501 s to 2,456 s), and three only in the checks
  after the runner (756.5 s, 916.3 s, 1,147.1 s) (read from the gate logs; gate
  names in the test-cost inventory). Those checks take 6.8 s median over 36
  passing gates (counted by script). The gate prints step totals only
  (`scripts/gate.sh:22`).
- Who uses it and cost now: every gate. Estimate 10,536 s, or 2.9 hours, over
  those ten gates: each test step minus 65 s for the plain phase or 10 s for the
  tail (computed by script).
- Action: the eleven files and the Counting check run before the runner
  (`package.json:14`); the plain projects run as their own gate step before the
  Worker test project (`scripts/gate.sh:43`); each gate ends by printing its ten
  slowest cases and the time per project.
- Risk and witness: one more runner start per gate (estimate: seconds); a head
  with both kinds of failure needs one more run. Witness: one ordinary gate.
  Recorded bytes: no. Test removal: none.

### TD-06: Six scale cases at real limits take 12 minutes of each gate

- Evidence (TC-02; medians of five passing gates of 24 October, counted by
  script, `perfile.py`):

  | Case at `c8a3fb24` | Median | Acceptance case | Other witnesses |
  |---|---|---|---|
  | `packages/scope/test/floor-archive.test.ts:67`, 30,000 entries | 240.1 s | Floor witness 5 (`notes/2026-10-20-retained-journal-floor.md:629-633`); `FLOOR_STEP = 4096` (`packages/derive/src/floor.ts:15`) | `packages/derive/test/floor.test.ts` |
  | `packages/scope/test/archive-one-entry-scale.test.ts:26`, 10,001 passes | 204.9 s | Archive witness 2 (same note, `:602-616`) | `packages/git/test/journal-v2-tree.test.ts:119`; `packages/replay/test/archive-git-v2-layout.test.ts:20` |
  | `apps/room/lanes/test/directory-partition-success-capacity.scope.test.ts:22`, 1,000 births | 133.1 s | Partition F4 (`notes/2026-10-15-directory-partitions.md:483`) | `directory-partition-capacity.scope.test.ts:21` |
  | `packages/scope/test/archive-cadence.test.ts:19`, three windows of 4,800 | 73.6 s | F1 cadence (`notes/implementation/2026-10-20-archive-incremental-f1.md:938`) | none at this scale |
  | `packages/scope/test/floor-archive.test.ts:145`, 2,000-entry ceiling | 63.0 s | Floor witness 8 (floor note, `:641-648`) | `packages/scope/test/floor.test.ts` |
  | `packages/scope/test/floor-archive.test.ts:37`, 4,800 inputs | 13.5 s | none; a measurement (TD-07) | the 10-input row of the same table |

  The six medians sum to 728.2 s, or 12.1 minutes (computed by script). The
  30,000-entry case took 120.8 s at `1c8a11b6` (21 October) and 237.5 s at
  `56e82303` (24 October) with no change to its file after 23 October; the step
  to about 230 s came with `e9511c43`, a head that changed nine archive source
  files (read from the gates' `test.log` files; `git diff --stat`).
- Who uses it and cost now: every gate; the archive and floor heads rely on the
  cases. About 12 of each 23 minutes, also on heads that touch no archive, floor
  or partition path: `05ca4437` changed four script and document files, paid a
  1,134 s test step, then failed in an archive case (TD-07).
- Action: a planner ruling between two options (PD-3); this review recommends
  option (a). Recorded bytes: (a) no; (b) unknown. Test removal: (a) none; (b)
  see PD-3.

### TD-07: One gate in six fails for a cause outside the head

- Evidence (TC-04, TC-05, TC-08, TC-10, TC-11): of 96 completed gates from 20 to
  24 October, 51 passed. Sixteen (16.7%) had a failure not traced to the head;
  twelve (12.5%) failed only for such causes and used 12,581 s (counted by
  script, `verdicts.py`; each verdict from the failure's first lines, the head's
  diff against its merge base, and the delivery notes). The Lending scenario
  (`packages/scope/test/lending.test.ts:31`) failed in four gates on four
  branches, two with no Lending change; the public archive command
  (`packages/scope/test/archive-installed.test.ts:1225`, limit 30 s, median 20.0
  s) failed at its limit in four gates (read from the gate logs). Eight cases
  run at 1.5 to 2.8 times their median (counted by script, `margins.py`). The
  archive fixture keeps clock ownership when a stuck case does not settle
  (`archive-native-authority.ts:80,136-137`), so later archive files fail too:
  in gate `tmp.xYGfE07S7X` one scale failure became 19 failed cases in five
  files (read from its `test.log`).
- Who uses it and cost now: builder and checker on every review. Each unrelated
  failure costs a full rerun (about 1,300 s on 24 October), an audit and a note
  section; one security landing needed three ordinary gates
  (`notes/implementation/2026-10-24-security-common-delivery.md:175-183`).
- Action: Lending records its `reason` on failure; the archive command's limit
  becomes at least three times its median, and `docs/testing.md` states that
  rule; the 4,800-input row of `floor-archive.test.ts:37` goes, since its
  delivery note calls it a measurement
  (`notes/implementation/2026-10-21-retained-journal-floor-f2.md:171-172`);
  `archive-git-v2-layout` keeps its failure detail; a stuck fixture owner makes
  later archive cases skip with one named reason, counted as a run failure.
- Risk and witness: a longer limit hides a slowdown for longer; TD-05's
  slow-case list is the control. Witness: one ordinary gate. Recorded bytes: no.
- Test removal: the 4,800-input row only, named by no acceptance case. Its
  invariant (with floor policy on, an alarm neither stops nor writes a floor
  before the target) keeps the 10-input row (`floor-archive.test.ts:37`) and the
  29,000-entry backlog alarms (`:84-101`) as witnesses; daily catch-up stays
  with `archive-cadence.test.ts:19`.

### TD-08: Archive stop and restart steps exist only in a delivery note

- Evidence (DD-02): six landings of 24 October add archive behavior that an
  operator meets: capacity deferral `920c9051`, activation diagnostic
  `1223ad1d`, retry backoff `dbaa3a2a`, alarm recovery `de590030`, restart by
  directive `55e4be6c` and settings readiness `56de7567`; only `56de7567`
  changed an operating guide (counted by script: `git diff --name-only <c>^1
  <c>`). How to compose, supply, confirm and remove an
  `ARCHIVE_RESTART_DIRECTIVE` is only in
  `notes/implementation/2026-10-24-archive-operator-restart.md` (14,961 bytes).
  The archive section of the Grow runbook (`examples/grow/runbook.md:339-403`)
  has no such step (counted by script: `grep -n -i -E
  'stopp|restart|defer|backoff'` finds none).
- Who uses it and cost now: the planner, for the restart of three stopped rows,
  and any self-hosted archive operator. Each restart is rebuilt from a 15 KB
  record, and a wrong directive is refused without clearing the stop
  (`docs/security/settings.md:799`), so a mistake costs a deploy cycle.
- Action: a planner head (PD-1) adds an "Archive stops and restarts" section to
  the runbook: the row diagnostic, deferral and backoff, and how to build,
  supply, confirm and remove the directive.
- Risk and witness: documents only; the planner follows the section for the next
  restart and records the outcome. Recorded bytes: no. Test removal: none.

### TD-09: Whole-file seals make one test file a serial point

- Evidence (T4-01, part of T2-02): `scripts/security-entry-points.test.mjs:7-83`
  holds three seal maps with 66 entries for 65 files of 16,272 lines (counted by
  script: the map keys, then `wc -l`); `packages/scope/src/object.ts` is sealed
  twice (`:26`, `:67`). `sourceSeal`
  (`scripts/security-entry-points.mjs:353-360`) digests the whole file, though
  the module has `declaration(text, name)` (`:27-34`) for one declaration. The
  test calls its seals "change tripwires, not runtime proof" (`:6`). 27 of the
  86 landings of the last 7 days changed the seal table, more than any other
  file, and 7 of 30 combining merges conflicted in it (counted by script,
  `sg-churn.py`, `sg-conflicts.py`). New values are adopted in recorded parser
  runs, for example
  `notes/implementation/2026-10-25-security-r6-versioned-publication.md:33`.
- Who uses it and cost now: every gate and every head that edits a sealed file.
  Archive slices edit sealed files such as `object.ts` and `archive-driver.ts`,
  and hosted-agents slices edit `packages/mcp/src/service.ts`; each pays a seal
  update, a parser run, and a line that conflicts easily.
- Action: for `worker.ts`, `object.ts`, `commands.ts`, `service.ts` and
  `core.ts`, seal the named matcher and gate declarations, not the whole file;
  move a gate spread through a large module into a small owner module first; a
  seal failure prints the new value and the review rule on one line.
- Risk and witness: a declaration seal misses a change in a helper it calls, so
  such helpers are sealed by name. The route and gate inventory check
  (`assertInventory`, `scripts/security-entry-points.mjs:341-348`) stays the
  witness. Recorded bytes: no; seals are test constants. Test removal: none.

### TD-10: Run records outweigh the code they describe

- Evidence (DD-01, DD-08): from 19 October 00:00 to `c8a3fb24`, 52 landings
  carried implementation notes; they added 110,446 lines under
  `notes/implementation/` and 83,712 lines outside `notes/` (counted by script:
  `git log --first-parent --since='2026-10-19 00:00 -0400' c8a3fb24`, then `git
  diff --numstat <c>^1 <c>` per landing, binary rows skipped). `e63b2a7b` has
  129 paths, 91 of them evidence, and 28,218 of its 31,249 added lines are notes
  (same commands). Images under `notes/` hold 53,287,095 bytes (counted by
  script: `find notes -type f` for png, jpg, webp and svg, then `xargs cat | wc
  -c`). "Each large filing in the workroom takes 13 to 45 minutes"
  (`notes/reports/2026-10-06-07-sprint-report.md:250`).
- Who uses it and cost now: the builder writes the records and the checker
  reviews every path. Estimate from path counts: heads past 100 paths file and
  review slowly, and every archive and security head pays it.
- Action: a ruling with the checker's agreement (PD-2). An implementation note
  states what changed, the decisions, the final evidence as a short table of
  digests and exit codes, and the open limits. Raw run output is held in the
  workroom artifact store and listed by digest in one manifest per head. The
  gate warns on a note over 40 KB or a new evidence path. New design packets
  commit sources and a few key images. No existing note changes.
- Risk and witness: the evidence rules ask for immutable evidence with digests,
  named reds and paired controls; a manifest keeps immutability, but a reviewer
  can no longer open the bytes from the head. Witness: on one archive head, the
  checker confirms that every manifest digest resolves and matches. Recorded
  bytes: no. Test removal: none.

### TD-11: Version knowledge lives in literal lists in 37 files

- Evidence (T1-01): the catalog holds 65 rows
  (`packages/platform/src/native-catalog.ts:100-166`). Outside
  `packages/platform`, 37 non-test source files hold 93 lines that name a
  literal pin, in nine packages and four other folders (counted by script: `git
  ls-files -- '*.ts' '*.tsx' '*.mjs' | grep -v '^packages/platform/' | grep -v
  '/test/\|\.test\.\|/tests/\|page/assets.ts\|generated' | xargs grep -c
  'platform:[a-z-]*@[0-9]'`). The R6 landing added 74 lines naming a new pin or
  `ARCHIVE_DEVICE_PUBLICATION_COHORT` in 35 non-test source files, 25 of them
  outside `packages/platform` (counted by script: `git diff c8a3fb24^1 c8a3fb24`
  per file, then `grep -c -E
  '^\+.*(platform:[a-z-]+@1[378]|ARCHIVE_DEVICE_PUBLICATION_COHORT)'`), and its
  first candidate failed its gate on older lists
  (`notes/implementation/2026-10-24-security-r6-creation-versions.md:39`).
  Destination lists disagree without a stated reason: file publication {4, 5, 6,
  7, 8, 13} (`packages/scope/src/delivery.ts:139`), the CLI manifest {3, 4, 5,
  6, 13} (`packages/cli/src/destination-protocol.ts:4-7`), timed opens {3, 13}
  (`packages/derive/src/judge.ts:427-429`), replay's origin check {4, 5, 6, 7}
  (`packages/replay/src/verify.ts:1792,1869`).
- Who uses it and cost now: every runtime path on every Worker. R7 adds register
  19, directory 18, rules 11 and destination 14; built the R6 way, it repeats
  about 25 hand edits outside the catalog, and each missed list costs a failed
  gate.
- Action: history-note slice H4: catalog pins get named capabilities, code
  outside `packages/platform` asks `platform(pin)`, and the first head
  reproduces every list exactly, disagreements included. H4 is large and waits
  for the archive milestone; until then the R7 head checks its edits against the
  37 files.
- Risk and witness: a capability that answers differently from today's list
  changes a judgment; a golden table of every pin against each question,
  generated from the lists at `c8a3fb24`, is the witness. Recorded bytes: no if
  each list is reproduced exactly; yes for a unified list, for example replay
  (section 6), with its own design note. Test removal: none.

### TD-12: dap-demo is outside the entry-point check

- Evidence (L5-03): `docs/security/entry-points.md:3` inventories "the six
  Worker configurations named by D1", with sections at `:172`, `:221`, `:294`,
  `:336`, `:391` and `:413` and none for `dap-demo`.
  `scripts/security-entry-points.mjs:292-296` checks three room files, and its
  parser accepts only those six headings (`:327`). `wrangler.demo.jsonc:24-29`
  binds `REGISTRIES` and `AGENTS`, so the hosted endpoint rows apply.
- Who uses it and cost now: the security remediation uses the check as the
  witness of finding 2.5. A route change on the Worker that takes all new rooms
  passes the gate without a document row. R7 deploys to `dap-demo`.
- Action: add `["apps/room/wrangler.demo.jsonc", "worker.ts"]` to the list,
  `dap-demo` to the heading pattern, a `dap-demo` table to the document, and the
  new count at `:3`.
- Risk and witness: low; the check fails closed. Witness:
  `scripts/security-entry-points.test.mjs:87`. Recorded bytes: no. Test removal:
  none.

### TD-13: The artroom-scope file is also the self-host template

- Evidence (T1-06, L5-06, L5-07): `apps/room/wrangler.jsonc` begins "Existing
  rooms only" (`:1-3`), sets register mode (`:44`), and binds a bucket named
  `artroom-application-content` (`:58`); `npm run deploy:scope` deploys it
  (`package.json:20`). The self-host guide edits this tracked file in place
  (`docs/self-host.md:56-58`, `:83`), and its step 3 names one binding and the
  `v1` migration (`:71`) where the file has four bindings and three migrations
  (read by script, `node -e`). Ten text settings that the settings inventory
  names for `artroom-scope` are absent from the file (counted by script,
  `outside.mjs`). The retired creation path still runs through four files of 328
  lines (`packages/scope/src/demo-creation.ts`, `apps/room/demo-creation.ts`,
  `packages/client/src/creation-offer.ts`,
  `apps/room/page/src/start-custody.ts`; `wc -l`), with six test files (counted
  by script: `git grep -l "legacyGitHubDemoConfig\|DEMO_START_CONFIG" --
  '*test*'`), although register 8 creation no longer meets deployed admission
  (`notes/implementation/2026-10-23-dap-demo-part1.md:11`).
- Who uses it and cost now: `artroom-scope` and self-hosters. A new self-hosted
  Worker starts in the transition index mode with a bucket name it does not own,
  and its operator changes a tracked file. The repository cannot reproduce the
  live `artroom-scope` settings.
- Action: (1) PD-6 sets an end date for retained Start requests and commits the
  live nonsecret settings. (2) A builder head splits the file: a neutral
  template in enforce mode without a bucket stays at `apps/room/wrangler.jsonc`,
  `wrangler.artroom-scope.jsonc` holds the retired Worker, `deploy:scope` names
  no retired Worker, and self-host step 3 copies the template. (3) After the end
  date, the v1 offer, `legacyGitHubDemoConfig`, the demo GitHub binding and the
  v1 client and page branches go.
- Risk and witness: the settings and entry-point checks key on file paths, so
  the split updates them; their tests and
  `apps/room/page/test/start.scope.test.ts` are the witness. Recorded bytes: no.
  Test removal: the register 7 and 8 refusal cases in `start.scope.test.ts` and
  `packages/scope/test/demo-creation.test.ts` go with the code; the `dap-demo`
  offer cases stay the witness for the current offer.

### TD-14: No admitted family installs an ordinary application package

- Evidence (T1-02): with `DEPLOYMENT` set, child creation is admitted only for
  `ARCHIVE_DEVICE_PUBLICATION_COHORT`, `ARCHIVE_DEVICE_APPLICATION_COHORT` and
  `APPLICATION_COHORT` (`packages/scope/src/creation-lineage.ts:21`). The first
  two use rules 10, whose install requires exactly one `device-command@1`
  capability (`packages/platform/src/device-application-rules.ts:39`;
  `device-application-package.ts:9-17`); rules 3 has no install act. Counter and
  Lending declare `"capabilities": []` (`apps/counter/dap.application.json:15`;
  `examples/lending/dap.application.json:15`), and `dap-demo` binds no
  application content or trust, by decision
  (`notes/implementation/2026-10-23-dap-demo-part1.md:13`). Of 11 CLI creation
  selectors, 8 name families a deployed Worker refuses
  (`packages/cli/src/line.ts:14-16`, read from the file). Five guides name
  refused cohorts: `docs/self-host.md:180`,
  `apps/counter/browser/startup.md:11`, `docs/cli.md:251-256`,
  `docs/mcp.md:421`, `docs/write-an-application.md:450`.
- Who uses it and cost now: the journey MVP's install step, hosted Counter, MCP
  `install_application`, self-hosters. No new room on a deployed Worker can
  install Counter or Lending; only device-command packages such as Grow install.
- Action: (1) A planner decision with R7 (PD-5): rules 11 accepts declared v2
  packages beside device-command packages, or a declared-application family
  joins `CREATION_COHORTS`. (2) A builder head offers only admitted families in
  the CLI, keeps saved plans on every cohort readable (history note, section
  3.7), and corrects the five guides.
- Risk and witness: a saved plan on a historical cohort keeps strict custody.
  Witness: `packages/cli/test/install.scope.test.ts`, kept on its pins.
- Recorded bytes: no for the guides and CLI offer; yes for part (1), a new pin
  with its own design note. Test removal: tests that use a historical selector
  as a fixture move to a helper.

### TD-15: The committed page bundle is the most-changed file

- Evidence (T4-02, T4-03, T4-07): `apps/room/page/assets.ts` holds 863,307 bytes
  in 6 lines; line 6 is one string of 836,191 characters (`wc -c`; `awk
  length`). It has 124 commits, more than any other file: 74 under its earlier
  path `packages/scope/src/page-assets.ts` and 50 under the current one (counted
  by script: `git log --no-merges --name-only c8a3fb24`). It changed in 18 of
  the 86 landings of the last 7 days, and 12 of 16 combining merges conflicted
  in it (counted by script, `sg-conflicts.py`). The page imports the CLI barrel
  (`packages/cli/src/index.ts:2-5`, re-exporting `commands.ts`, `store.ts`,
  `line.ts` and `invitations.ts`) at `apps/room/page/src/claim.ts:7`,
  `connection-custody.ts:5`, `data.ts:44` and `retained-editor-data.ts:6`, for
  ten functions, so a CLI change rebuilds the page.
  `packages/mcp/src/views/generated.ts` (177,661 bytes) and
  `apps/room/brand/assets.ts` (1,035,528 bytes) are generated too; no
  `.gitattributes` exists.
- Who uses it and cost now: all four room Workers serve it
  (`apps/room/page/route.ts:24`), and its check rebuilds it in memory
  (`apps/room/page/test/assets.test.ts:8-14`). Journey MVP page work, and slices
  in the packages the page imports, rebuild and recommit 863 KB per change;
  parallel page slices conflict on merge.
- Action: step 1 (builder) moves the ten CLI functions into one module without
  Node dependencies, imported through a subpath export, and adds a
  `.gitattributes` that marks the three generated bundles `-diff
  linguist-generated=true`; files that hold recorded bytes keep their diffs.
  Step 2, a deploy-time build, is a decision (PD-4).
- Risk and witness: step 1 moves exported names. Witness: `npm run typecheck`
  and the page tests. Recorded bytes: no; no entry, pin or deploy check holds
  the page bytes. Test removal: none for step 1; PD-4 for step 2.

### TD-16: Three large modules collect unrelated changes

- Evidence (T2-01, T2-02, T2-03; sizes by `wc -lc`; history counted by script,
  `sg-churn.py`, `sg-conflicts.py`): `packages/cli/src/commands.ts` has 2,074
  lines and 156,980 bytes, 77 commits, 32 landings, and conflicts in 5 of 14
  combining merges. `packages/scope/src/object.ts` has 895 lines; its
  constructor (`:179-350`) holds the archive and floor wiring (`:272-287`),
  though the file says "This file only wires" (`:4-6`).
  `packages/scope/src/worker.ts` (821 lines) holds routing, the screen service
  and the MCP route, registry and agent; the two files changed together in 33
  commits. `packages/platform/src/destination.ts` has 2,888 lines and 210,856
  bytes, with six versions in one file.
- Who uses it and cost now: the CLI, the page, all room Workers and the catalog.
  Hosted-agents CLI work, archive wiring and hosted MCP routing each edit one
  sealed file and pay a seal update (TD-09), often a page rebuild (TD-15), and
  an easily conflicting merge.
- Action: after the archive milestone and TD-09, split `commands.ts` along its
  section markers (`:128`, `:264`, `:377`, `:410`, `:1365`, `:1505`, `:1906`),
  then move the MCP parts of `worker.ts` and the archive wiring of the
  `object.ts` constructor into their own modules. If R7's destination 14 needs
  new rules, they go in a new file; the split of `destination.ts` waits for the
  milestone.
- Risk and witness: construction order matters, so each move is a pure move.
  Witness: `npm run typecheck`, the CLI story and claim tests, the archive
  restart tests, and for `destination.ts` the 65 golden digests
  (`packages/platform/test/versions.test.ts:23-103`). Recorded bytes: no, if
  each data value moves unchanged. Test removal: none.

### TD-17: Status lines and guides lag main

- Evidence, notes (DD-03, DD-04, DD-05, DD-06, T1-05, T1-13): the history note
  says "Nothing here is built" (`:3-4`), though its H1 status lines landed;
  `notes/plans/retired/` and `notes/README.md` do not exist; three inactive
  guides (`docs/protocol.md`, `docs/release.md`, `docs/policy-pack.md`, 5,433
  lines by `wc -l`) remain in `docs/`; slice H6 names `packages/bytes` files
  that K3 moved to `packages/platform/src/application-codec/`.
  `docs/roadmap.md:69` calls the floor "designed, not built" while F1 and F2 are
  built, and `:136-137` calls the archive "fixture-only" while it runs on
  `dap-grow`. Plan 033's status last changed on 21 October (`4e4d3da4`).
- Evidence, guides: `docs/testing.md:487-496` lists 15 projects and four check
  files, while `vitest.config.ts` defines 16 and `package.json:14` runs eleven;
  the guide never names the section-citation steps (`grep -c -i citation` gives
  0), and its helper `expectRefusal` (`:650`) is defined nowhere.
  `docs/cli.md:94,129` show register 2 where the story test expects 18
  (`packages/cli/test/story.scope.test.ts:84`); `docs/mcp.md:1602` and the MCP
  tool description (`packages/mcp/src/service.ts:608`) give register 3;
  `packages/platform/src/register.ts:58-61` calls register 2 "the newest
  version". `scripts/check-doc-links.mjs` runs in no gate step (`git grep -l
  check-doc-links -- ':!notes'` finds only itself); one run checked 698 links, 0
  broken, in 0.1 s.
- Who uses it and cost now: every agent reads `docs/testing.md` before testing
  and meets gate steps it does not list; readers and MCP clients take register 2
  or 3 as current during the rollout that changes the default.
- Action: a planner head (PD-7) finishes H1, corrects the roadmap and plan
  status lines, amends the history note, and adds the link checker to the gate.
  A builder head (BR-7) corrects the code-facing names, samples and the testing
  guide's gate paragraph, and regenerates `docs/mcp-tools.json`.
- Risk and witness: documents and help text only; the link checker reports 0
  broken, and the checker tests each added commit with `git merge-base
  --is-ancestor`. Recorded bytes: no. Test removal: none.

### Smaller items

One line each. None is filed now unless section 8 names it.

- D1 push-mint standing (T1-04): `isStandingDestination` holds only for destinations 5 and 6 (`packages/platform/src/versions.ts:25`); no directory creates destination 5 (`packages/platform/src/directory.ts:80-95`, read by `grep -o`); "No caller or default pin activates this cohort" (`notes/implementation/2026-10-16-push-mint-standing.md:7`). Decide with R7 (PD-5).
- Migration lists (L5-04): four tag schemes for the same durable object classes (`apps/room/wrangler.jsonc:69`, `wrangler.grow.jsonc:56`, `wrangler.lending.jsonc:14`, `wrangler.demo.jsonc:30`; read by script), each live state on its Worker, and no test pins them; hosted agents add a class (`notes/2026-10-15-hosted-agent-teams-design.md:532`). BR-9.
- Rename tooling (T1-12, L7-03, T4-04): `scripts/rename-workspaces.mjs`, `scripts/workspace-rename-preservation.json` and `docs/workspace-rename.md` hold 782,246 bytes (`wc -c`), and no other file outside `notes/` names them (`git grep -l`); the Page still says ARTROOM_HOME (`apps/room/page/src/main.ts:732`). BR-10.
- GitHub register root (T1-07): admission reads only `ARTIFACTS_CONFIG.registerScope` (`packages/scope/src/creation-admission.ts:20-28`), the GitHub order sets `GITHUB_APP_CONFIG.registerScope` (`docs/deploy.md:231-262`), and health reports `ambiguous` (`packages/scope/src/health.ts:66-68`).
- Archive layout v1 (T1-08): `planArchive` (`packages/scope/src/archive-build.ts:310`) has no production caller and six test files use it (`git grep -w planArchive`); remove after the milestone, once every live row is at layout 2.
- Partition cohort (T1-09): register 11, directory 10 and destination 6 are built but not hosted (`notes/2026-10-15-directory-partitions.md:3-7`); planner decision.
- Lane generation 1 (T1-10): `apps/room/lanes/src/change.ts` (1,696 lines) is the source of generation 3 (`change3.ts:105-106`); 20 test files (3,626 lines) import the lane support that defaults to register 2 (`git grep -l 'support/room' -- '*.test.ts'`); slice H7.
- Application package v1 (T1-11): `dap pack` still packs v1 (`packages/cli/src/application-files.ts:143`), as does the scope fixture (`packages/scope/test/support/application-fixture.ts:15`); slice H6.
- Hosted H6 case (TC-06): `packages/mcp/test/hosted.scope.test.ts:1428-1440` opens 256 records over HTTP; its median rose from 15.2 s (45 gates) to 79.5 s (16 gates) after 24 October 07:00 (counted by script); the bound is also witnessed at `packages/mcp/test/custody.test.ts:317`. BR-12.
- Sandbox wall-clock wait (TC-07): `packages/scope/test/application-sandbox.test.ts:244-258` waits the real 30 s window; 38 runs took 30,001 to 30,019 ms, 1,140 s in all (counted by script), against `docs/testing.md:325-327`. BR-12.
- Sleeps in MCP tests (TC-09): 15 in `packages/mcp/test/http.test.ts` (`git grep -c`), against `docs/testing.md:43`. BR-12.
- Outputs under `test/` (T4-05): 33 screenshot files (1,850,086 bytes) have no reader; 19 of 20 digest rows in the three mapping files under `packages/derive/test/definition-corpus/` no longer match (counted by script).
- Tool inventory written by a test (T4-06): `packages/mcp/test/inventory.test.ts:102` writes `docs/mcp-tools.json` when `MCP_WRITE_DOCS=1`; move the write into a script with `--check`.
- Large units (T2-04): `deriveEffects` (404 lines, `packages/derive/src/effects.ts:128`) and `ArchiveDriver#pass` (`packages/scope/src/archive-driver.ts:144`) with a "Temporary pass diagnostic" (`:147-150`); split `#pass` after the milestone.
- Normative notes (DD-07): the two 4 October notes cite 68 paths that no longer exist (inventory script `docpaths.py`); add a path map and leave the notes unchanged.
- Settings tables (L5-08): `docs/deploy.md:98-108` lists 9 settings against 21 in the checked inventory; `DEPLOYMENT` is plain on `dap-grow` (`wrangler.grow.jsonc:90`) and a secret elsewhere.
- Screen descriptor (L5-09): `wrangler.grow.jsonc:84` and `apps/sandbox/wrangler.rollout.jsonc:17` must stay equal, and no test compares them.
- dap-lending observability (L5-10): `wrangler.lending.jsonc` has none of the metric, version and log blocks (`grep -c`), so the deploy check cannot cover it; planner choice.
- Test pool backport (L7-01): `@cloudflare/vitest-pool-workers` `0.22.0` is patched before each run by `scripts/cloudflare-pool-compat.mjs` (229 lines with its test and data, `wc -l`); raise it after the milestone.
- Undeclared imports (L7-02): five root scripts import `rolldown/parseAst` (for example `scripts/security-settings.mjs:6`), and the root manifest declares only `typescript` and `vitest`.
- Host imports (L7-04): six `apps/room` files hold 35 relative imports of 29 private scope modules (counted by script); record them, add a host export later.
- Package metadata (L7-05): six package descriptions begin "Artroom's" (read by script), and the SDK producer copies them into public manifests (`scripts/public-release-lib.mjs:99`); fix before the first publication.
- Manifest hygiene (L7-06): `dap-git`, `dap-checkers`, `dap-scope` and `dap-lanes` lack `"private": true` (read by script).

## 5. Items that stay

These look like debt but are recorded bytes, live state or deliberate
compatibility. No finding proposes removing them.

- Historical evaluators for pins that hosted rooms use: register 17, directory 16, membership 8, rules 10, destination 12 (`dap-demo`, `dap-grow`); register 5, directory 5, membership 4, rules 3, destination 2 (`dap-lending`); register 2 and 8 rooms (`artroom-scope`); register 9 and destination 4 (`dap-library-publication-final-1014`) (history note, section 5). Replay needs them; R6 kept destination 12's evaluator unchanged.
- Domain tags such as `artroom-definition-1` (440 occurrences in `packages` and `apps`, counted by `git grep -o`), the `refs/artroom/*` prefix, the `artroom-invite:` and `artroom-agent-key:` link prefixes (`docs/cli.md:395`), and live resource names such as `artroom-application-content` and `artroom_metrics_v1`.
- The custody aliases `ARTROOM_HOME` and `~/.config/artroom` (`packages/cli/src/config-dir.ts:30-46`) and the `artroom` command alias: they need an end date, not removal now. MCP protocol `2025-11-25` beside `2026-07-28` (`packages/mcp/src/wire.ts:33-34`), for outside clients.
- Generated files that hold recorded bytes: `packages/platform/src/native-declarations.generated.ts` (500,155 bytes), the six lane definition files, and the Counter and Lending pins. They stay committed with visible diffs; a change to how they are made needs its own design note.
- The archive v1 reader (`readJournalArchive`), until an inventory shows that no retained repository ref names a v1 commit; the partition identity policy on every pin (`packages/platform/src/native-catalog.ts:169`).
- Deliberate differences: `dap-demo` binds no content bucket or trust, and the sandbox accepts three services (`apps/sandbox/worker.ts:16-27`).

## 6. Question for the checker: replay and the publish-file origin

This is a reading of the code, not an executed result. Native delivery checks
the application origin of a published file for destinations 4, 5, 6, 7, 8 and 13
(`packages/scope/src/delivery.ts:139`, with the origin policy for 7, 8 and 13 at
`:200-203`). Offline replay applies its application-origin check for
destinations 4 to 7 only (`packages/replay/src/verify.ts:1792,1869`). The
history note recorded that the replay list stops at version 7 (`:78`).
Destination 13 is now the default for new installs.

Does replay of a destination 8 or 13 journal repeat the origin check that the
runtime applied, or does it rest on the recorded outcome? If it should repeat
the check, the change alters replay verdicts, needs its own design note, and is
not a builder request from this review.

## 7. Decisions for the planner

- **PD-1, archive restart procedure (TD-08).** A planner head adds the runbook
  section before the next restart directive on `dap-grow`. Landed `5248b0be`.
  Its first use, on 25 October, restarted the Directory, Site and Destination
  rows on `dap-grow` to generation 1 and removed the directive. The three rows
  then deferred on a nodes shortfall of 1, reported to the builder in
  `89538bb9`.
- **PD-2, note shape (TD-10).** A ruling, with the checker's agreement, on
  implementation notes and a digest manifest for raw evidence.
- **PD-3, scale cases (TD-06).** Option (a): every case keeps its real limit;
  the six files move into their own test project, as `scope-denial` is
  (`packages/scope/vitest.denial.config.ts`); the review gate runs it when a
  head changes `packages/scope/src/archive*`, `packages/git/src/journal*`,
  `packages/derive/src/floor*`, `packages/platform/src/directory-partitions*` or
  their tests, and main runs it after each landing. It saves about 12 minutes
  per gate on other heads. Its cost: `docs/testing.md:486-491` changes, since
  the gate no longer runs every test, and a cost rise from a head outside the
  paths shows only on main; the 30,000-entry drift came from archive source
  (`e9511c43`), inside the paths. Option (b): archive witness 2 and floor
  witness 5 run natively at a smaller step and pass count, passed in as test
  policy, while `packages/derive/test/floor.test.ts` and
  `packages/git/test/journal-v2-tree.test.ts:119` keep the real constants. It
  also saves time on archive heads. Its cost: acceptance-case text changes, the
  meaning of a recorded floor entry is unknown if the judge reads the step as
  policy (so a design note comes first), and a defect at the real step shows
  later. Recommendation: option (a), after BR-3 measures the new timings; it
  changes no acceptance case and no recorded meaning.
- **PD-4, page bundle at deploy time (TD-15 step 2).** After the archive
  milestone. The reviewed head would hold the source and a pinned bundler, not
  the served bytes; the deploy step prints the two digests the module header
  carries today (`apps/room/page/scripts/assets.mjs:30-31`). `assets.test.ts`
  goes; its invariant, "the deployed page is never older than this checkout"
  (`apps/room/page/test/assets.test.ts:5-7`), is then witnessed by the build
  step and `apps/room/page/test/route.scope.test.ts:18,26`. The MCP card bundle
  follows it.
- **PD-5, install family and D1 with R7 (TD-14; smaller items).** Whether rules
  11 accepts declared v2 packages (or a declared-application family joins
  `CREATION_COHORTS`), and whether destination 14 adopts the D1 standing check.
  Each is a new pin with its own design note.
- **PD-6, artroom-scope (TD-13).** An end date for retained Start requests; its
  live nonsecret settings committed to its file; the GitHub secrets that the
  operator record lists as unused deleted. Ruled: retained Start requests end
  on 8 November 2026 (the deployment recorded no creation event in the 14
  days to 25 October). The live `DEMO_START_CONFIG` is in the file under a
  config test; `ARTIFACTS_CONFIG` and `DEPLOYMENT` stay operator secrets on
  that Worker. The three GitHub secrets serve retained GitHub destinations
  until the end date and are deleted with the variable on that date.
- **PD-7, status and guides (TD-17).** A planner head finishes H1, corrects the
  roadmap and the plan 032 and 033 status lines, amends the history note and its
  slice H6, and adds `node scripts/check-doc-links.mjs` to the gate.
- **PD-8, allowance lists (TD-02).** The creation-pin list for `dap-grow` and
  `dap-lending`, or a record that a Worker takes no new children on a historical
  family, before BR-1 is filed.

## 8. Builder requests, in order

No request goes ahead of `1aedd35b`. Two small requests come before R7; the rest
follow R7, sit between plan 032 slices, or wait for the archive milestone (F3
deployed by 6 November).

| Order | Request | Covers | Acceptance condition | Size | Place |
|---|---|---|---|---|---|
| 1 | BR-1, deploy files match the live Workers | TD-01, TD-02, TD-03, TD-12 | Each room file's index mode and creation-pin allowance equal the recorded live values under a config test, and every documented deploy command carries `--keep-vars`. `worker.grow.ts` is type checked, and the entry-point check covers `wrangler.demo.jsonc`. | small | First after `1aedd35b` and PD-8; before R7. Landed `f5a6338c` |
| 2 | BR-2, cheap checks first | TD-05; reporting part of TD-07 | A failure in a plain project or a post-runner check stops the gate before the Worker test project starts. Each gate ends with its ten slowest cases and time per project. | small | After BR-1; before R7 |
| 3 | BR-3, more workers for the Worker test project | TD-04 | The project runs with two or more workers; one measurement run and one ordinary gate pass, with phase times before and after. | small (medium if shared-state tests break) | After R7; before R11 |
| 4 | BR-4, recurring unrelated failures | TD-07 | Lending records its `reason`; the archive command's limit is at least three times its median; the 4,800-input row is gone with its two named witnesses kept; `archive-git-v2-layout` keeps its failure detail. A stuck fixture owner yields one named skip that fails the run. | small | After BR-3; the fixture part after the archive heads that edit it |
| 5 | BR-5, scale cases by ruling | TD-06 | For option (a): the six files run in their own project, by the gate on a listed path and by main after each landing, and every acceptance case keeps its present witness. | small | After BR-3 and PD-3 |
| 6 | BR-6, declaration seals | TD-09 | The seal table holds named matcher and gate declarations for `object.ts`, `worker.ts`, `commands.ts`, `service.ts` and `core.ts`, and the inventory check is unchanged. A seal failure prints its update on one line. | small | After the `dap-grow` restart and BR-3, with the checker's agreement, since the seals belong to the security inventory of `6dd06d03`; before the next hosted-agents slice |
| 7 | BR-7, current names and install guides | TD-14 part 2; TD-17 builder part | No active guide, CLI help or MCP tool description names a register, cohort or helper that the code refuses or lacks, and `docs/mcp-tools.json` is regenerated. The CLI offers only admitted families, and saved plans still read. | small | Between plan 032 slices, before the journey slice that installs an application |
| 8 | BR-8, browser-safe CLI module for the page | TD-15 step 1 | The page imports its ten CLI functions through one subpath export without Node dependencies, and the rebuilt bundle passes its assets test. `.gitattributes` marks the three generated bundles. | small | Between plan 032 slices, before the next page slice |
| 9 | BR-9, migration lists pinned | smaller item L5-04 | A config test fails on any change to a deployed room file's `migrations` list except an appended step. | small | Before the first hosted Counter or M1 head that adds a durable object class |
| 10 | BR-10, rename tooling removed | smaller item T1-12 | The three files are gone, a pointer names the commit that holds them, the Page names `DAP_HOME`, and `node --test scripts/active-source.test.mjs` passes. | small | Any gap after R7 |
| 11 | BR-11, artroom-scope file split and retired path | TD-13 | `apps/room/wrangler.jsonc` is a neutral self-host template in enforce mode, `artroom-scope` deploys from its own file, `deploy:scope` names no retired Worker, and the settings and entry-point checks pass. After the end date, the legacy offer branches are gone and the `dap-demo` offer cases pass. | small | After PD-6 and R14 |
| 12 | BR-12, test trims | smaller items TC-06, TC-07, TC-09 | The sandbox reply window is a parameter whose production value stays `REPLY_SECONDS`; the H6 route case runs at a small injected bound, with the real bound witnessed by `custody.test.ts:317` and a new store-level case; the 15 sleeps in `http.test.ts` become test-controlled gates. | small | After R16 |
| 13 | BR-13, version questions (slice H4) | TD-11 | Code outside `packages/platform` asks the catalog for named capabilities, and a golden table of every pin against each question, generated from the lists before the change, passes unchanged. No list is unified. | large | After the archive milestone; before the next platform version after R7 |
| 14 | BR-14, module splits | TD-16 | `commands.ts`, then the MCP parts of `worker.ts` and the archive wiring of `object.ts`, move as pure moves with the same exported names; the type check and the CLI story, claim, archive restart and object tests pass unchanged; each new owner module has one declaration seal. | medium | After the archive milestone and BR-6 |
