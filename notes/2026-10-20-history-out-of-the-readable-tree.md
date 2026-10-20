# History out of the readable tree

Design note. Proposed: nothing here is built.

dap is a repository that people and agents both read and change. An
agent that adds a feature first searches the tree for a similar one and
copies it. Josh Rosen's article "Architecting the 'No Skills'
Application" makes the general point: every implementation in a
repository is a possible example, so a superseded one becomes a pattern
that an agent finds and repeats. A person who evaluates the project
reads the same tree and meets the same noise.

dap has a constraint that most repositories do not have. A scope pins
the platform definitions it was created with, as `platform:<name>@<n>`,
and it is judged by those versions for as long as it exists. Replay of a
journal needs the same versions. So some history must stay executable.
This note separates the history that must stay executable from the
history that only needs to stay in Git, and moves both out of the paths
that a reader reads first.

Section 1 defines the terms. Section 2 gives the inventory, with a
disposition for each item. Section 3 gives the rules that keep the tree
this way, and the gate check that enforces them. Section 4 gives the
replay rule and its witness. Section 5 covers hosted rooms on earlier
versions. Section 6 says what a first reader sees afterwards, and
section 7 orders the slices.

## 1. Terms

- **Current.** The one form of each thing that new work uses: one
  definition version for each platform name, one definition for each
  application, one generation of each lane, one guide for each topic.
- **Active manifest.** A tracked file, `dap.active.json` at the root,
  that lists what is current (section 3.1).
- **History home.** A directory for code that is not current but that
  replay or a hosted room still needs to execute. Only the versions
  table imports it (section 3.2).
- **Record.** Prose about how the project got here: dated notes, plans,
  implementation notes, reports and reviews. Records stay under
  `notes/`.
- **Status line.** The first line after the title of a note or plan. It
  states whether the document is current (section 3.3).
- **Delete.** Remove from the tree. Git history keeps the file, and the
  tag `spikes-final` keeps the spikes.

## 2. Inventory and dispositions

The tree at main `7a148325`, 20 October 2026.

### 2.1 Platform definition versions

The versions table (`packages/platform/src/index.ts:160-226`) holds 62
pins: register 1 to 17 (no 4), directory 1 to 16 (no 4),
directory-partition 1, membership 1 to 8 (no 3), rules 1 to 10,
destination 1 to 12 and inbox 1. Lookup is by exact string
(`index.ts:241-243`). Twelve cohort constants name combinations of
these pins.

Three different things are called newest today:

- `NEWEST`, the default creation cohort (`index.ts:229-231`): register
  3, directory 3, membership 2, rules 2, destination 3, inbox 1. The CLI
  uses it when no cohort is given.
- `REGISTER` (register 2, `register.ts:59`) and `DESTINATION`
  (destination 2, `destination.ts:46`).
- The highest pins. Only the opt-in cohort
  `ARCHIVE_DEVICE_APPLICATION_COHORT` uses them (`archive-binding-wire.ts:11`):
  register 17, directory 16, membership 8, rules 10, destination 12,
  inbox 1. The grow demo room runs on this cohort.

More than 30 places outside the definitions branch on literal version
lists. Examples: `packages/scope/src/worker.ts:432-433`,
`authority.ts:332`, `delivery.ts:137`, `reads.ts:219`,
`packages/replay/src/verify.ts:1671`, `packages/cli/src/commands.ts:1523`,
`packages/client/src/invitation-fields.ts:7` and
`apps/room/page/src/data.ts:461`. The destination lists stop at version
8, and the replay list stops at version 7, although versions 9 to 12 run
the same rules.

| Item | Disposition |
|---|---|
| The current cohort | One constant, `CURRENT`: register 17, directory 16, membership 8, rules 10, destination 12, inbox 1. The CLI creates on it by default, but only after the version questions of 3.4 answer for every path that these pins use (slice H4 before H5). `NEWEST`, `REGISTER` and `DESTINATION` are deleted. |
| Each pin of the current cohort | Stays in `packages/platform/src`, in a file named for the definition, without a version number. |
| Every other pin | Moves to the history home, `packages/platform/history/`. It stays in the versions table, so every journal and every hosted room still resolves it. |
| The other eleven cohort constants | Move to the history home with their pins. The CLI keeps no option that creates on them. It still recognizes and recovers a saved install plan on any of them (section 3.7). |
| Version lists outside `packages/platform` | Replaced by questions to the versions table (section 3.4). |
| Tests that exercise one history pin's own rules | Move to `packages/platform/history/test/` and still run in the gate. A test that witnesses an older pin's own policy stays on that pin, even when it also uses that pin's cohort as a fixture. |
| Tests that use a history cohort only as a fixture | Move to the current cohort, package by package. About 98 test files (18,500 lines) name only history pins and no `NEWEST` pin. |

### 2.2 Parallel forms

| Item | Disposition |
|---|---|
| `packages/platform/src/application-install.ts` (314 lines) and `-wire.ts` (52), beside `application-install-v2.ts` (85) and `-v2-wire.ts` (7) | Slice H6. The current rules (rules 10 through `archive-binding.ts` and `device-application-rules.ts`) use parts of both. Those parts are shared current code and stay in `src`, in one file with no suffix. The parts that only history pins use move to the history home. |
| `packages/bytes/src/application.ts` and `application-v2.ts`, `application-package.ts` and `-package-v2.ts`, `application-types.ts` and `application-v2-types.ts` | Slice H6. Two classes. Shared current code, such as the semantic, presentation and release checks of `application-package-validation` that the v2 reader reuses (`application-package-v2.ts:6-8`, `:30-31`), stays in `src`. The superseded public codec moves to the bytes history home, and one dispatcher reads a retained packet by its own format. A stored packet is never read as a newer format. Signed release domains and canonical bytes do not change. |
| `packages/scope/test/support/legacy-lending-projection.ts`, `application-v2-fixture.ts` | Follow the forms above in H6. |

### 2.3 Lane generations

`apps/room/lanes/src/change.ts` (generation 1, 1,696 lines) and
`change3.ts` (generation 3, 106 lines) sit side by side. Generation 3 is
derived from generation 1 by `successor()`, so it imports it. The
committed canonical definitions are `definitions/change.json`,
`change-demo.json`, `change3.json` and `change-demo3.json`, with
`issue.json` and `issue-demo.json`. The host accepts both generations by
digest (`packages/platform/src/publishing-provenance.ts:7-16`).

| Item | Disposition |
|---|---|
| Generation 3 change lane | Current. `change3.ts` and its JSON lose the suffix. Its committed JSON is the source; a test compares its digest, and it no longer imports generation 1. |
| Generation 1 change lane, its demo and `DIGESTS`, `DEMO_DIGESTS` | Move to the history home while a hosted room accepts its digest. Then deleted. |
| Issue lane | Current, one generation. No change. |

The application layout note moves the room host and its lanes into the
one application layout. These dispositions apply inside that layout.

### 2.4 Applications

An application definition is data. A room that installs it keeps its
bytes as a retained input, and the archive copies retained inputs of
the kind `definition`. So replay never reads an application definition
from the tree. A superseded application definition needs no history
home. It can be deleted with no compatibility decision.

| Item | Disposition |
|---|---|
| `apps/counter/definition.json`, `definition.ts`, `definition-README.md`, `definition.test.ts`, `pin.ts` (the first definition, `counting`; no run-time reader) | Deleted. Eight test files in the CLI, MCP and scope packages read them. They move to `commitments.json` or to a test fixture named as one. `APPLICATION.md` loses the line on the earlier definition. The guides that send authors to these files move to the commitments example in the same slice: `docs/write-an-application.md:21`, `:132` and `:185-187`, `docs/what-is-dap.md:150` and `docs/roadmap.md:310`. A relative-link check of those guides runs in the slice. |
| `apps/counter/commitments*` | Current. The application layout note gives the file names. |
| `examples/grow/check/` (the data-only check fixture) | Not history. It is a fixture, and the layout note places it under the application's tests. |
| `examples/grow/demo/` (the signed release and the simulator schedule) | Current. |
| `examples/demo-repo/` (an earlier-model policy pack) | Deleted. |
| `examples/lending/` | Current. Its service configuration `apps/room/wrangler.lending.jsonc` says it is historical; it moves to the history home of `apps/room` while `dap-lending` runs (section 5). |

### 2.5 Notes, plans and guides

| Location | Count |
|---|---|
| `notes/` dated notes | 45 files |
| `notes/plans/` | 35 numbered plans (numbers 006, 016 and 025 are used twice), `README.md`, `test-invariants.md`, directory `027-artroom-usability/` |
| `notes/implementation/`, `reports/`, `reviews/` | 202, 43 and 15 files |

No index of the plans exists. `notes/plans/README.md` is a 5,346-line
log titled "Credential cleanup handoffs". Fifteen plans state no draft
or status in their first lines, among them the current 029, 032 and
033. No document says
what `notes/` is for. `docs/README.md:114-116` names three inactive
guides: `docs/release.md`, `docs/protocol.md` (4,959 lines) and
`docs/policy-pack.md`.

| Item | Disposition |
|---|---|
| Plans with live work: 029 (Room fork, until its contracts note replaces it), 031 (hosted MCP; OAuth remains), 032 (journey), 033 (grow demo) | Stay in `notes/plans/`, with status `current`. |
| Every other plan, and `027-artroom-usability/` | Move to `notes/plans/retired/`, with a status line. |
| `notes/plans/README.md` (the handoff log) | Moves to `notes/plans/retired/credential-cleanup-handoffs.md`. A new `notes/plans/README.md` is an index: one line for each plan, current ones first. |
| `notes/plans/test-invariants.md` | Its content goes to `docs/testing.md` if current, else it retires. |
| Each dated note in `notes/` | Stays in place, so links still work. It gets a status line. |
| `notes/implementation/`, `reports/`, `reviews/` | Records. No status line. One `notes/README.md` says what each directory holds. |
| `docs/release.md`, `docs/protocol.md`, `docs/policy-pack.md` | Move to `notes/retired-guides/`. `docs/` describes only the current system. |

### 2.6 Spikes and stale rules

`spikes/` has no tracked files. The tag `spikes-final` keeps them. Seven
files outside `notes/` still mention `spikes/`: `apps/jam/src/phrases.ts`,
`docs/release.md`, `docs/scopes.md`, `docs/testing.md`,
`scripts/active-source.test.mjs`, `scripts/check-doc-links.mjs` and
`scripts/test-changed.mjs`. `active-source.test.mjs:6` cites
`spikes/parked/README.md`. That file does not exist.

| Item | Disposition |
|---|---|
| The `spikes/` and `parked/` rules and mentions outside `notes/` | Deleted. The new gate check of section 3.5 replaces them. |
| `INACTIVE` in `active-source.test.mjs:22` | Replaced by the active manifest. Today it marks `apps/counter/` and `examples/` inactive, so the layering checks skip two current applications. |

## 3. Rules that keep the tree this way

### 3.1 Active manifest

`dap.active.json` lists:

```json
{
  "v": 1,
  "packages": ["packages/bytes", "packages/contract", "..."],
  "applications": ["apps/counter", "apps/jam", "apps/room", "examples/grow", "examples/lending"],
  "cohort": { "platform:register": "platform:register@17", "...": "..." },
  "guides": ["docs/README.md", "..."],
  "plans": ["notes/plans/029-...", "notes/plans/031-...", "notes/plans/032-...", "notes/plans/033-..."],
  "history": ["packages/platform/history", "apps/room/history"],
  "records": ["notes"]
}
```

Every tracked file is under exactly one of: a listed package or
application, a history home, a record path, or a root file that the
manifest lists. `CURRENT` in the platform package is read from the
manifest's `cohort`, or a test compares the two.

### 3.2 History home

- A history home is a directory named `history` inside the package or
  application that owns the code.
- Each source file in it (`.ts`, `.mjs`) starts with one marker line:
  `// History: serves <pins or digests>. Do not copy. Current: <path>.`
- Other files keep their bytes exactly. Canonical JSON, signed packets
  and service configurations take no marker. The home's `README.md`
  lists each such file, what it serves and its current replacement.
- Inside a history home, a file can import another file of the same
  home and the current shared helpers of its package. A test under
  `history/test/` can import its home.
- Outside the home, one entry module imports it, and nothing else does.
  The entry is the versions table for `packages/platform`, the packet
  dispatcher for `packages/bytes`, and the lane digest table for the
  room host's lanes. Replay and hosted rooms reach a history pin through
  that entry, never by path.
- Nothing new is added to a history home except code that leaves the
  current set.

### 3.3 Status line

The first line after the title of each dated note and each plan is one of:

```
Status: current.
Status: landed <commit>; describes work that is done.
Status: superseded by <path>.
Status: retired; no work follows from it.
```

A plan listed in the manifest has `Status: current.` A plan under
`notes/plans/retired/` has any other status.

### 3.4 Version questions

Code outside `packages/platform` does not name a version number. It
asks the versions table a question with a name, for example
`hasApplicationHost(pin)` or `destinationKind(pin)`. The table answers
for every pin, history pins included. So a new version changes one
table, not 30 files.

### 3.5 Gate check

`scripts/active-tree.test.mjs` runs in the gate. It replaces
`INACTIVE`, `REACHES` and the `spikes/` rules of
`scripts/active-source.test.mjs`, and keeps that file's layering tests.

The check puts each tracked file in one class. The first match wins:

1. **record**: under `notes/`;
2. **history**: under a `history/` directory of a package or application;
3. **fixture**: under a `test/` directory, or named `*.test.*`;
4. **listed document**: a guide that the manifest lists, the generated
   index `docs/current.md`, and the root files that the manifest lists;
5. **active source**: every other file of a listed package or
   application.

It refuses:

1. a tracked file in no class, for example a file under `docs/` that
   the manifest does not list;
2. an import of a history home from any file except the home's own files,
   its `history/test/` files and its one entry module;
3. a source file in a history home without the marker line, or a
   non-source file that the home's `README.md` does not list;
4. a dated note or plan without a status line, or a manifest plan whose
   status is not `current`;
5. in active source only, a literal `platform:<name>@<n>` outside
   `packages/platform`;
6. in active source only, a file name with a generation mark: `-v<n>`,
   a lane generation such as `change3`, or `legacy`. The rule starts in
   two parts. H6 turns it on for `packages/bytes` and
   `packages/platform`, after it renames the install and codec files.
   H7 turns it on for the lanes, after it renames `change3.ts` and
   `digests3.ts`. Each slice passes every rule that it turns on.

Examples. `notes/2026-10-05-x.md` names `platform:rules@4`: allowed, a
record. `docs/README.md` and `docs/current.md`: allowed, listed
documents; rules 5 and 6 do not apply to them. `packages/scope/test/a.test.ts` names `platform:destination@3`:
allowed, a fixture. `packages/scope/src/reads.ts` names
`platform:destination@8`: refused by rule 5.
`packages/platform/history/destination1.ts` without its marker: refused
by rule 3. `packages/bytes/src/application-v2.ts` after H6: refused by
rule 6.

Each refusal names the file and the rule.

### 3.6 Generated index

`docs/current.md` is generated from the manifest. Its first line says:
"Generated from dap.active.json. Do not edit." It lists each current
package, application, guide and plan, with one sentence each. The gate
regenerates it and refuses a difference. `AGENTS.md` tells an agent to
read it first.

### 3.7 Saved install plans

The CLI decides two things from one set today. `INSTALL_COHORTS`
supplies the creation choices, and `selectedPlan` uses the same set to
classify a saved plan (`packages/cli/src/commands.ts:397-398`). That
class sets strict custody (`:544`) and the verified save before the
first request (`:578-582`).

After the history move these are separate:

- Creation offers the current cohort only.
- Recognition covers every cohort in the versions table, current and
  history. A saved plan on a history cohort keeps strict custody,
  recovery and readback. It is recovered on its own cohort, never
  created again on another one.

## 4. Replay rule and witness

**Rule.** Every pin that a hosted room, an archive or a committed
journal fixture names resolves in the versions table, and judges as it
did before the move.

**Witness for data.** `packages/platform/test/versions.test.ts` holds a
digest of each version's data (the `DIGESTS` table at
`versions.test.ts:24`, computed at `:102` and compared at `:103`). A slice that moves code
to a history home leaves every digest unchanged.

**Witness for behavior.** The data digest does not cover the code that
each pin selects. `VERSION_DATA` also selects `rules`, `observed` and
`observedValues`, `membership` or `rulesScope`, `declaredText`,
`hostPreparationKinds`, `receiverIdentity` and
`applicationPublicationOrigin`. Two pins can share rules and differ in
one of these. A new test holds, for each of the 62 pins, the export
name and a digest of the source text of each selected function and
table. A move keeps every row. A change to a row is a change of a pin's
meaning, and it needs its own review.

The test does not reach the helpers that those functions call. So each
pin family also keeps behavior witnesses: the existing tests of each
pin's own policy, kept on that pin, and one native and one replay case
for each moved special policy, such as the archive publication origin
of destination 9 to 12. A2's committed replay fixtures pass unchanged.

**Witness for deletions.** A pin is deleted only with a list of its
users: hosted rooms from the operator's inventory, archives, and
committed fixtures. The list is empty, and the deletion changes only
that pin's digest row.

## 5. Hosted rooms on earlier versions

The repository records these founding pins:

| Deployment | Founding cohort |
|---|---|
| `dap-grow` | the current cohort |
| `dap-lending` (the 14 October rehearsal) | `APPLICATION_COHORT` (register 5, directory 5, membership 4, rules 3, destination 2) |
| `dap-library-publication-final-1014` | `FILE_PUBLICATION_COHORT` (register 9, directory 8, membership 4, rules 3, destination 4) |
| `artroom-scope` | 7 and 8 October demo rooms under register 2; the demo start on register 8 |
| `artroom-rehearsal` | register 8 |

A counting room on register 6 is recorded without its deployment
(`notes/implementation/2026-10-13-counter-target100-cli-identities.md:100`).
The repository holds no list of live rooms. The operator's inventory is
the source for section 4's deletion witness.

Moving a pin to the history home breaks no hosted room. So slices H1 to
H7 need no decision on these rooms. Deleting a pin does.

The recommendation: keep every hosted room that the home page links
running until the contest evaluation ends. Then found the library,
Counter and room demos again on the current cohort, archive their
earlier journals where the archive can hold them, and stop the other
deployments. After that, slice H8 deletes each history pin whose user
list is empty.

## 6. What a first reader sees

- The root `README.md` opens with what dap is and links `docs/current.md`.
- `docs/current.md` lists the current packages, applications, guides and
  plans, one line each.
- `docs/` describes only the current system.
- `packages/platform/src` holds one file for each platform definition,
  at the current version, with no version number in a name.
- Each application directory holds one definition set.
- `notes/README.md` says that `notes/` is the record of how the project
  got here, and that each note's status line says whether it is current.
- A search for how a destination rule is written finds one answer in
  `src` and, separately, history files that each say "Do not copy".

## 7. Slices

| Slice | Content | Who | Size | Needs |
|---|---|---|---|---|
| H1 | Notes and plans: status lines; `notes/plans/retired/` and the index; the handoff log moved; `notes/README.md`; the three inactive guides moved; `AGENTS.md` and `docs/README.md` lines; `spikes/` mentions removed from guides; a gate test for status lines (rule 4) | planner | 1 day | this note |
| H2 | Applications: the counter's first definition set deleted and its tests moved; the five guide lines moved to the commitments example, with a relative-link check; `examples/demo-repo/` deleted | builder | 1 day | this note |
| H3 | Active manifest, file classes, the gate check of 3.5 (rules 1 to 4), the generated index | builder | 2 days | H1, H2 |
| H4 | Version questions replace the literal lists outside `packages/platform`. Each question answers for all 62 pins, and the lists that stop early today (`scope/src/reads.ts:219`, `apps/room/page/src/data.ts:461`, `cli/src/commands.ts:1523`, `replay/src/verify.ts:1671`) answer for the current pins, with native, CLI, page and replay acceptance on the current cohort. The behavior witness of section 4. Gate rule 5 | builder | 3 days | H3 |
| H5 | Platform history home: every history pin, cohort and test moved; `CURRENT` and the CLI default; saved-plan recognition (3.7) with a saved-plan, restart and readback witness; current files without version numbers; data digests and behavior rows unchanged | builder | 3 days | H4 |
| H6 | Install and bytes parallel forms (2.2): shared current code kept, the superseded codec to the bytes history home behind one dispatcher; the existing exact v1 and v2 packet and retained-input tests unchanged. Gate rule 6 for `packages/bytes` and `packages/platform` | builder | 2 days | H5 |
| H7 | Lane generation 1 and the lending service configuration to their history homes; `change3.ts` and `digests3.ts` lose their suffix. Gate rule 6 for the lanes | builder | 1 day | H5, the layout note's room-host slice |
| H8 | Deletion of history pins with empty user lists | builder | 1 day | section 5's answer |

H1 and H2 go first. They need no compatibility decision, and they change
what an evaluator and an agent read most. The builder's H slices come
after the grow demo and the journey work, as filler, in this order.
