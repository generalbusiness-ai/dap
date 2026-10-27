# Sprint report, 27 October 2026

Status: landed; describes work that is done.

The sprint ran from 17:00 on 26 October to 17:00 on 27 October.
Nineteen heads landed on `main`: the 26 October report, the R7
hardening, the K1 count follow-up, the archive capture, measurement
and settlement heads, four security remediation heads (R11 item 6, the
installed-release listing and its recut, the usage report and its
parser), the R14 documents head, three review slices (BR6, BR7, BR8),
the demo trust row, the use-cases head, the Git host choice note and
the local object store record. The three room Workers were deployed
six times and run the 15:53 settlement landing. Room A advanced from
entry 27,219 to 34,510 at its frontier, with no deferral after the
settlement deploy. The first cost-of-change review is below.

## Story: the finish quote is measured, then settled

On 26 October both archive rows had deferred at the finish quote. The
fixed-finish path cleared them by 19:05: Room A confirmed entry 27,219
(used 2,327,369 bytes, 1,015,176 remaining) and Site had no next entry.
The capacity request was refiled as `0f0eeab7` on a live base, behind
the hardening head.

The capture head (`1b45fb0e`, 02:51) adds a `capacityObservation` field
to each pass diagnostic, so one tail line shows the numeric geometry of
a pass. Deployed at 02:56, the first reads found both rows idle at
their frontiers with the idle line whole at 13,481 bytes; a plan-pass
line of 55,250 bytes arrived whole at 03:30. At 10:32 a Room A pass was
caught with 55,244 bytes of capture (pass 33,386), sealed as evidence
for the builder's measurement.

The measurement head (`71636079`, 13:33) recorded the finding: seven
read ceilings of 262,144 bytes reserved 1,835,008 of a 2,894,539-byte
metadata budget, and one Room A pass reserved 4,673,364 against the
4,194,304 limit. The settlement request (`0052053d`) asked the archive
budget to reserve at the ceiling and settle to the bytes received at
every site; its W1 was amended to drop a historical settled total that
the rows do not retain, with a conditional bound of 1,467,917 for the
replay fixture. The settlement head (`ca7b16bc`, 15:53, 31 paths)
landed and was deployed to all three Workers at 16:00. The capture at
16:12 shows the new figures on an idle Room A pass: 1,664,604 reserved,
62,700 settled, nothing unsettled. Room A confirmed 34,510. The live
settled total of a plan pass waits for the next entries.

## Story: the remediation chain and its deploy rule

The R7 hardening head (`33690b69`, 00:06, 35 commits, 60 paths) adds
certificate reuse, certification liveness, the passes-record ceiling
and the Page wording as the next platform family (register 20,
directory 19, rules 12, destination 15). Its native follow-up had
failed on heap exhaustion from a recording clock spy in one test file;
the clock-only repair passed at 160 MB where the spy had reached
1.25 GB, and one fresh gate preceded the review.

R11 item 6 (`f9aca97f`, 04:09, 44 paths) refuses new acts under
withdrawn application releases. A Worker with no trust list admits
nothing for installed releases, so the deploy rule became: list the
installed releases on each Worker and set its trust rows before the
deploy. The grow Worker was deployed at 04:37 with its row verified;
demo and lending were held. The listing head (`d73b53c9`, 06:25) read
scope summaries without a session and every scope on grow and lending
answered `forbidden`; its recut (`6499a12b`, 08:20) reads the Rules
scopes on the session path and completed on all three Workers: grow
one install, lending none, demo none once its operator room existed.
The coverage decision (`2d1bb9a0`) accepts that a per-Worker trust list
covers only the operator's repository, with telemetry as the evidence
for the rest. All three Workers were deployed from `6499a12b` at 08:38,
and the demo Worker again at 11:31 from the trust-row head
(`bb23e50f`) with the grow row live.

The R14 usage report (`6f47bf98`, 06:59) queries Analytics Engine for a
bounded Worker usage report. Its first run was incomplete because the
parser read the source-row count as a group-truncation hint; the
parser head (`59a19054`, 09:01) interprets limits by returned groups,
and the first complete report (`dbf7e6bd`) followed. A proposal to add
telemetry for retirement decisions was not adopted (`7d5cbfcf`): the
retirement input is the static inventory and the report. The documents
head (`7b220547`, 16:50) records that decision, keeps the proposal as
the alternative, and restores the platform names in
`docs/usage-report.md` after a review that found them lowercased. The
census child (`f51f16f4`) is the builder's next slice: a scope-index
census in enforce mode and a Worker-wide installed-release inventory,
with the Worker operator defined as the install signer of the pinned
register (`c0789349`).

## Story: the self-hosting direction

The Git host choice note (`053c5595`, 13:31) settles one shape for the
three repository hosts (none, Artifacts, GitHub) behind a
`REGISTER_SCOPE` setting, with slices G1 to G4. Two further findings
arrived for the planner: a load study of the single-node runtime and a
service-manager and HTTPS study on a local machine. The ruling
(`46852be4`) makes the first local deployment the direction and sets
the builder order after the census: G1 (host none), H1 (local service
with a `PUBLIC_ORIGIN` setting and a readiness path; its earlier hold
is lifted, `8a50aa07`), LAN keys (`7ee9a63b`), CLI sessions and verify
(`14895240`), the uniqueness index (`121a8913`) and idle alarms
(`c3034274`). Four matters of the single-node runtime are recorded for
a later decision: RPC streams across isolates, drain and handoff when
the store is gone, the 60-second waker scan, and cells restored with no
request.

The local object store record (`2acac9c5`, 16:31) is the evaluation of
a local bucket on the same machine as the single-node runtime, with its
evidence manifest: the store meets every bucket requirement the runtime
states, and three findings set how it must be configured, the first
being that it does not sync a write to disk before answering unless a
storage rule asks for it. Its owners are the slices above.

## What landed

- `9efe36a3`, 26 October 19:31: the 26 October sprint report.
- `33690b69`, 00:06: R7 hardening (certificate reuse, liveness, passes
  ceiling, Page wording); platform family register 20, directory 19,
  rules 12, destination 15.
- `994a638f`, 01:36: the K1 count follow-up on `docs/kernel.md`.
- `1b45fb0e`, 02:51: numeric archive capacity capture on the pass
  diagnostic, with the BR-4 deadline repair as a named partial.
- `f9aca97f`, 04:09: refuse new acts under withdrawn releases (R11
  item 6) and isolate failed fixtures (BR-4).
- `d73b53c9`, 06:25: list installed application releases before
  deployment.
- `6f47bf98`, 06:59: a bounded Worker usage report (R14 script).
- `6499a12b`, 08:20: the listing recut through authorized Rules reads.
- `59a19054`, 09:01: usage-query limits interpreted by returned groups.
- `260a9782`, 09:32: use cases for pointing at things and claims of
  agreement.
- `aa3ae873`, 09:37: admitted creation families offered on the Page;
  saved plans preserved (BR7).
- `4419008a`, 10:43: a portable CLI package entry for the room Page
  (BR8).
- `bb23e50f`, 11:31: the grow trust row in the demo Worker's settings.
- `aecabde1`, 12:20: named declaration seals for large source owners
  (BR6).
- `053c5595`, 13:31: the Git host choice design note.
- `71636079`, 13:33: captured archive costs and attribution limits.
- `ca7b16bc`, 15:53: archive read reservations settled to bytes
  received.
- `2acac9c5`, 16:31: the local object store evaluation record.
- `7b220547`, 16:50: the R14 telemetry decision recorded; platform
  names restored in the usage report.

## Deployments

All from reviewed heads, with existing settings kept, a tail after
each grow deploy.

| Worker | Version | Time | Main | Change |
|---|---|---|---|---|
| `dap-grow` | `610a62c0` | 00:34 | `33690b69` | R7 hardening |
| `dap-demo` | `e5e64573` | 00:34 | `33690b69` | same |
| `dap-lending` | `142e19ae` | 00:34 | `33690b69` | same |
| `dap-grow` | `ffa1d021` | 02:56 | `1b45fb0e` | capacity capture |
| `dap-demo` | `ae8f3f25` | 03:00 | `1b45fb0e` | same |
| `dap-lending` | `8b3b7277` | 03:00 | `1b45fb0e` | same |
| `dap-grow` | `5ddeb01b` | 04:37 | `f9aca97f` | R11 item 6, trust row |
| `dap-demo` | `47b85715` | 08:38 | `6499a12b` | R11, listing, R14 |
| `dap-lending` | `3ba76328` | 08:38 | `6499a12b` | same |
| `dap-grow` | `abbb266c` | 08:38 | `6499a12b` | same |
| `dap-demo` | `fcaffa21` | 11:31 | `bb23e50f` | grow trust row |
| `dap-grow` | `8ac15a41` | 16:00 | `ca7b16bc` | settlement, BR6 to BR8 |
| `dap-demo` | `8ef92b84` | 16:00 | `ca7b16bc` | same |
| `dap-lending` | `a22f5316` | 16:00 | `ca7b16bc` | same |

The demo and lending Workers waited four hours on `1b45fb0e` between
the R11 landing and the listing recut, because the deploy rule needs
a complete installed-release list first. The demo Worker's operator
room was created at 07:55 so that its list could complete.

## Cost-of-change review

For each notable landing: the cost incurred, the alternative that
would have cut it, and whether to revisit.

- Installed-release listing (`d73b53c9`, recut `6499a12b`). Cost: two
  heads in two hours; the first read every scope without a session and
  was refused everywhere, the second found the one path that answers.
  Read authorization is spread over kind-specific paths, so each new
  reader rediscovers which path is allowed. Alternative: one authorized
  read entry that every scope kind shares, with the kind rules behind
  it. Revisit: yes, with the census, which reads the same scopes; make
  the census reader the shared entry and retire the listing's own.
- Trust rows per Worker (`f9aca97f`, `bb23e50f`). Cost: each deploy is
  coupled to an operator inventory: a list per Worker, a trust setting
  per Worker, a settings-only head for one row, and a four-hour hold on
  two Workers. Alternative: admission derived from the pinned
  register's install records, so the setting is a bootstrap and not an
  inventory. Revisit: yes, after the census lands with the register's
  install signer as the operator; the setting then names only the
  register.
- Usage report parser (`6f47bf98`, `59a19054`). Cost: one extra head,
  because the parser assumed the meaning of one field of the query
  envelope. Alternative: a recorded live response as the first fixture,
  before the parser. Revisit: no; the fix reads completeness from the
  returned groups, which is the stable signal, and the documents head
  records the envelope assumptions.
- Archive ceilings and settlement (`1b45fb0e`, `71636079`, `ca7b16bc`).
  Cost: three heads and a capture field of up to 110,726 bytes per
  pass line, to find that fixed read ceilings reserved most of the
  metadata budget. Alternative: budget by bytes received from the
  first design, with the archive budget as the one place a ceiling is
  charged, which the settlement head now is. Revisit: the budget no;
  the capture yes: bound or drop `capacityObservation` when the series
  ends, since every idle pass now carries 13,486 bytes of it.
- R7 hardening (`33690b69`). Cost: four new platform versions and a
  60-path head for four bounded changes, plus a test-only repair for a
  spy that recorded every clock read. Alternative: none for the
  versions, since each carries a data or rules change; for the test,
  a counting spy. Revisit: no.
- R14 documents head (`7b220547`). Cost: one recut with its evidence
  re-sealed, caused by a request condition that quoted a superseded
  naming rule. Alternative: conditions quote the rule file, not memory.
  Revisit: no code; the practice is recorded.
- Git host choice (`053c5595`). Cost: a design note with one recut.
  It collapses three hosts into one shape behind one setting, so it is
  the cost-reducing choice. Revisit: no.

## Decisions

- Hardening lands before the capacity work; the capacity capture
  boundary is numeric and its target is each row's current next entry
  (`6634c94c`).
- A test-only repair for the heap exhaustion is allowed in isolation,
  then one fresh gate, then review (`db8052fa`).
- The two BR-4 deadlines travel in the capture head as a named partial;
  one evidence artifact per request (`eb0cc06e`, `9c488459`).
- Deploy rule: list the installed releases on a Worker and set its
  trust rows before deploying `f9aca97f` or later there (`54664ffd`).
- The listing reads Rules scopes only, on the session path
  (`382923ff`); per-Worker trust coverage is accepted for demo and
  lending with telemetry as evidence (`2d1bb9a0`).
- The R14 telemetry proposal is not adopted; retirements come from the
  static inventory and the usage report (`7d5cbfcf`).
- Census: the Worker operator is the install signer of the pinned
  register; pages end explicitly; the bound is 4,096 scopes; an
  incomplete census writes no manifest (`c0789349`).
- Settlement W1 keeps no historical settled total; the replay fixture
  carries a conditional bound (`ecefed5c`).
- The first local deployment is the self-hosting direction, in one
  shape; the builder order is census, G1, H1, LAN keys, CLI sessions,
  uniqueness index, idle alarms (`46852be4`, `8a50aa07`).
- Landing merge text has a first line of at most 100 code points, then
  a blank line; two landings this sprint exceeded it and stay as they
  are.
- Public wording names GitHub, and Cloudflare with its platform parts;
  request conditions use that wording (`88cff53e`, `f373d4d3`).

## Filed

| Request | Owner | Work |
|---|---|---|
| `7e4b543c` | builder | capacity capture; landed |
| `521f57a1` | builder | installed-release listing; landed |
| `0c4a4236` | builder | listing recut, session path; landed |
| `00abd5aa` | builder | R14 usage report script; landed |
| `686f4ec9` | builder | usage parser; landed |
| `0052053d` | builder | archive settlement; landed |
| `082750e8` | builder | R14 documents; landed |
| `f51f16f4` | builder | scope-index census; promised |
| `2b5e3a07` | builder | G1: host none, `REGISTER_SCOPE` |
| `7ee9a63b` | builder | LAN keys |
| `14895240` | builder | CLI sessions and verify |
| `121a8913` | builder | uniqueness index |
| `c3034274` | builder | idle alarms |
| `bc6e9961` | planner | K1 count follow-up; landed |
| `31e35d4e` | planner | demo trust row; landed |
| `cc0bf648` | planner | Git host choice note; landed |
| `373596467` | planner | local object store record; landed |
| `3ff5c5b5` | planner | pointing and claims use cases; landed |
| `0e06e751` | planner | pointing and claims design note; held |

## In progress

- The census (`f51f16f4`), promised by the builder.
- The pointing and claims design note recut (`880d9cdf`), approved
  (`b5ef7b94`) and held before landing.
- The self-hosting note's next draft: the single-node drain case, the
  late wake of timed rules on a cold cell, and the four runtime
  matters.
- The plan-pass settled total on Room A, at the next capture that finds
  entries.

## What did not happen, and why

- Plan 032 draft 3 did not start; the research note it follows is in
  changes-requested.
- The journey (G4, J3) did not start; the self-hosting and remediation
  order holds.
- The R14 retirement requests were not filed; they follow the census.
- This report is late: it was written after the 17:00 close.

## Commitments for the sprint ending 28 October, 17:00

- Land the census; deploy; file the first census of each Worker and
  the R14 retirement requests.
- Land G1; set `REGISTER_SCOPE` on the three Workers; file the first
  host-none room.
- Capture a Room A plan pass with the live settled total.
- Draft the self-hosting note's next section.
- Hourly surveys; the daily report at 17:00.
