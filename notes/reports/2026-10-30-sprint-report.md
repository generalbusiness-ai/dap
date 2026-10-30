# Sprint report, 30 October 2026

Status: landed; describes work that is done.

The sprint ran from 17:00 on 29 October to 17:00 on 30 October. Seven
heads landed on `main`: the 29 October report, the page polling
fallback, the application authoring skill, the idle-alarm repair, the
fixed-slot equality counts, the room proof reuse, and the J4 workspace
holds. The three room Workers were deployed five times, once after each
head that changed Worker code, and run the 11:08 landing. The live J4
acceptance witness then started against that deployment and reached the
end of its inspection phase. The cost-of-change review is below.

## Story: a change proposed from a workspace

A member can now open an Issue, take a Change on it, and work in a
workspace that the room provisions. The hold rules have a second
version. A hold of version 2 records the workspace it opened, the
credential it issued for setup, and the revocation of that credential
when setup ends. The Artifacts adapter provisions the workspace and
reads it back. Holds of version 1 and the existing lane pins keep their
meanings, so rooms created before today behave as they did.

Review found three gaps before landing. The custody of each issued
credential had no witness, so tests now follow every credential from
issue to revocation. Three security seals name the boundaries that the
workspace adapter may not cross. The setup credential had no cleanup
obligation, so a hold now revokes it as a token record with purpose
setup, and the existing revoke path handles it. The head landed at
11:08 and was deployed to all three Workers at 11:31.

The live witness against the deployed room then began. An operator
packet runs each phase as one command with a collector that records the
process, its streams, and the source tree before and after. Three packet
versions halted before any mutation, each on a packet defect rather than
a product defect: the first rejected its own flag name, the second
required a workspace link for a directory that is not a workspace, and
the third expected the room's lineage to begin at a signed act where the
register records an outcome entry. A qualifier run against the real
register with read-only access confirmed the third cause, and the fourth
packet carried the corrected predicate. Phase 1 prepared the two agent
identities. Phase 2 inspected the deployed room, its policy, and the
source binding, and completed at 16:33 with the source unchanged. The
scratch policy for the next phase was adopted at 17:02: one approval,
and the room owner may review content that the agent under their
control authors, because the room has no other reviewer. The protected
rules extent still needs an independent review. That choice is for this
witness only and is not a recommendation for any room.

## Story: a page that keeps up when the stream drops

The room page follows the head stream for live updates. When the stream
closes without an event, the page now polls the summary every five
seconds, shows a status line that says so, and reconnects with waits of
1, 2, 4, 8, 16 and then 30 seconds. A comment posted in one browser
appears in another without a reload while the stream is down. A saved
interval outside 1 to 60 seconds is ignored rather than breaking the
connection record. Forbidden and unsupported answers stay terminal and
start no polls. The page's trust limits are unchanged: a poll reads the
same authenticated summary that the stream delivers.

## Story: write an application with a skill

A developer who uses Claude Code or Codex can install a skill that
teaches declared applications. The skill tree holds one guide, one
authoring reference, and a complete starter package with its manifest,
definition, page and scenario. It explains items, acts, handlers,
timers, guards, declared views, scenarios, and the write, check, fix
loop, and it names today's refusals so that a refused install reads as
a known case. The skill ships inside the public platform package.
Plugin manifests for the two hosts select the same tree. Installation
in a host has not yet been exercised.

## Story: a room with many members admits the next one

A fixed-slot equality guard, such as the one that keeps member handles
unique, now takes its count from an index of derived state instead of a
bounded scan. A room with more members than the scan bound admits a
fresh member and refuses a taken handle with `handle-in-use`. The index
covers every declared fixed slot and does not special-case membership.
Mutable slots, conjunctions and other predicates keep the bounded scan.
No shipped limit changed. Review asked for two repairs before landing:
readiness bound to the head that was read, and native reconstruction of
the index without parsing entry bodies.

## Story: one verification for a whole room

`dap verify --all` checks every scope of a room. It now shares the
checked membership prefixes with the later inbox proofs instead of
re-fetching them, and keeps the proof only in command-local memory.
Review found two settlement defects on the way: a later block could
mask an earlier debt, ancestry gap or incomplete byte span, and the
verifier could recover missing text from another scope without a
declared capacity or redaction. The repair records each scope's
earliest problem and applies the standalone capacity rule to rooms.
Defaults are unchanged.

## Story: idle Workers stay idle

A site request that reserved a token generation and then failed before
the mint left its expiry alarm in place, so an otherwise idle room woke
on a schedule for nothing. The scheduler now removes the reservation
and the alarm together, and a loop with no site wake deletes an alarm
that is still set. A native witness shows a quiet room with no alarm
after the failure. The parent finding on celld CPU attribution stays
open; this repair does not explain that load.

## Story: the first MVP room, in scratch

The repo-in-ai MVP's first slice creates and seeds a room for a software
team. Its scratch run began: the owner and the room exist and four
identities are enrolled, one person and three agents. The members read
stopped twice on helper defects, first a key-kind check that expected a
person key where the owner holds a device key, then three reads issued
together on one session whose serial guard refuses concurrent calls.
Both repairs are small, both passed their gates, and the members and
check phases then closed cleanly. The review of the two repairs is
filed as a bounded child; the whole slice still needs its remaining
witnesses and a full review before landing. The second and third slices
are filed: MCP Apps plumbing on the landed card kit, and questions with
requested approvers, people only.

## What landed

- `909d8a1a`, 29 October 19:44: the 29 October sprint report.
- `b98968e5`, 17:54: the page polling fallback; 13 paths, 8 commits.
- `901a7fa4`, 18:41: the application authoring skill; 24 paths, 6
  commits.
- `4c333072`, 20:22: the idle-alarm repair; 8 paths, 9 commits.
- `5c6ea9bb`, 23:26: fixed-slot equality counts; 28 paths, 13 commits.
- `31780874`, 30 October 02:12: room proof reuse and settlement
  repairs; 17 paths, 10 commits.
- `5dc9765f`, 11:08: J4 workspace holds, source; 57 paths, 17 commits.

## Deployments

All from reviewed heads, with existing settings kept; health checked
after each round.

| Main | Time | `dap-grow` | `dap-demo` | `dap-lending` |
|---|---|---|---|---|
| `b98968e5` | 29 Oct 18:08 | `d09eaf88` | `a5d0a927` | `c91ad6eb` |
| `4c333072` | 20:30 | `093a5677` | `9c374f0e` | `5dad53e1` |
| `5c6ea9bb` | 23:31 | `4ec7f806` | `cf4e31cd` | `2c1803f8` |
| `31780874` | 30 Oct 02:31 | deployed | `71cd23f2` | `4ad762d6` |
| `5dc9765f` | 11:31 | `7f21be0b` | `c18b5dde` | `c203d530` |

The grow version for the 02:31 round was not recorded in the deploy
report; the 11:31 round replaced it. First health probes after an idle
period answered `register: unavailable` and were ready on the re-probe,
as on the previous three days.

## Cost-of-change review

For each notable landing: the cost incurred, the alternative that
would have cut it, and whether to revisit.

- J4 workspace holds (`5dc9765f`). Cost: one head of 57 paths and 17
  commits; a failed full gate at F on a test teardown, and a
  single-file repair accepted under the test-file exception; three
  review items that each needed a ruling; a merge subject of 356
  characters against the 100-code-point rule. Then four operator
  packets for the live witness, three of which halted on their own
  defects before any phase ran. Alternative: a live-witness harness
  that reads the real room's lineage and binds a dedicated source
  checkout from the start, kept across slices, instead of a packet
  written per phase. Revisit: yes; the harness becomes the J5 input,
  and the subject rule needs a check in the landing path.
- Fixed-slot counts (`5c6ea9bb`). Cost: 36 captures and two production
  repairs after the first review, then a further full gate; a merge
  subject of 390 characters with three glued hashes. Alternative: the
  readiness binding stated in the request so the first head carried
  it. Revisit: no code; the subject rule, as above.
- Room proof reuse (`31780874`). Cost: two settlement defects found in
  review, one repair, one further gate. Alternative: the recovery cases
  written before the verifier change; both defects are cases a reader
  of the contract would write first. Revisit: no.
- Idle-alarm repair (`4c333072`). Cost: about 30 changed lines of
  product code carried by a 505-line note and 25 captures. Alternative:
  none;
  the captures distinguish the failure from the parent load finding.
  Revisit: the parent finding stays open.
- Page fallback (`b98968e5`). Cost: one changes-requested review for an
  invalid saved interval that nulled the settings, repaired the same
  hour. Alternative: none. Revisit: no.
- Authoring skill (`901a7fa4`). Cost: one native test failure in the
  ordinary gate with an unproved cause, and a fixture repair accepted
  on exception; the host install was not exercised. Alternative: none
  for the skill. Revisit: yes; install it in one host and record the
  result, and find the gate failure's cause.
- Evidence manifests. Cost: the six landed manifests run from 29 KB to
  58 KB; the Commons head under review carries one of 113 KB that
  cites 607 files. Alternative: cite each retained runner unit once, as
  the manifest rule allows. Revisit: yes, in the Commons recut.

## Decisions

- J4 acceptance runs in three steps: land the gated source, deploy,
  then run the live witness against the deployment (`241248a9`).
- The fork's setup credential is a hold version 2 token record with
  purpose setup, revoked by the existing path (`e7962aa7`).
- A regenerated production module takes a new full gate; the follow-up
  exception does not cover it (`1d0ffcab`).
- A J4 instance records its own lane as the task reference until a
  task definition exists (`70d1c9ab`).
- A room proof has many roots; one command-local verifier serves
  `dap verify --all` (`8e0c4ff6`).
- A read that asks for a head strictly below the journal floor is
  satisfied for ordering only; at or above the floor it waits
  (`366b3989`).
- The Commons cohort's register runs on a fourth Worker, `dap-commons`;
  the three existing registers stay as they are (`e611ae0e`).
- The Commons requirement travels in a new Rules version (`33f95e72`);
  W1 runs now, in the text domain (`d0523c9f`).
- The S1 recovery takes the narrow plan-only Continue branch with a
  plan-digest check and retained pre-root output (`ee25224c`).
- An operator packet binds a dedicated source checkout, never the
  shared one (`c2187cbd`).
- A reference field installs only where Rules version 14 or later
  governs; older Rules refuse it by name (`f4495460`).
- The J4 scratch policy sets one approval and owner review of
  controlled-agent content, for this witness only (`84be575c`).
- Builder order from 09:05: J4, then the MVP slices S1 to S6, then the
  remaining items (`a249511f`).

## Filed in this sprint

| Request | Owner | Work |
|---|---|---|
| `7c0e8181` | builder | room proof reuse; landed |
| `449c58c7` | builder | MVP S1, create and seed the room; in progress |
| `69080f12` | builder | MVP S2, MCP Apps plumbing; promised |
| `7951d998` | builder | MVP S3, questions with approvers; open |
| `4c5c41d3` | builder | BO1 source readiness; changes requested |
| `d5385b16` | builder | S1 helper repairs, bounded review; promised |
| `da5e9791` | planner | roles as viewpoints amendments; promised |
| `c31315a1` | planner | documentation review and rewrite; promised |

## In progress

- The J4 live witness: the next release is the one-phase policy
  initialization packet.
- The S1 scratch run, one closed phase at a time, then the whole-slice
  review.
- The BO1 Commons recut with the six review items and the ruled
  additions; gate 7 already passes for the six repairs.
- DX-A2, reads that wait for a head, on its own branch.
- The documentation review on `planner/docs-review-20261030`.
- Plan 032 draft 3, which files the remaining MVP slices.

## What did not happen, and why

- Plan 032 draft 3 did not start; the day went to the J4 landing, its
  deployment, and the live witness.
- The whole-scope capacity item was not filed; it waits for the
  measured ceilings.
- The release-module witness is still not in the test list; the skill
  head changed the list for another test.
- The shared checkout was dirtied twice more at 22:07 and 22:08 on 29
  October by an unreviewed package install. The cause was found at
  07:32: a helper script outside the repository installs a tool into
  the checkout. The fix belongs in that script.
- The planner fetched the workroom sequence into the shared repository
  once at 13:11; the reference did not move, and the rule against it
  is restated.
- No Room A plan pass was captured; no new entries arrived.

## Commitments for the sprint ending 31 October, 17:00

- Run the J4 policy initialization and the phases that follow it
  toward the live acceptance.
- Close the S1 scratch run and file its whole-slice review.
- Review the BO1 recut.
- Plan 032 draft 3.
- Hourly surveys; the daily report at 17:00; the worktree sweep after
  it.
