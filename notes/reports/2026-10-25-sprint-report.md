# Sprint report, 25 October 2026

Status: landed; describes work that is done.

The sprint ran from 17:00 on 24 October to 17:00 on 25 October. The 24
October report, written at 23:00, covered the two landings before it.
Since then seventeen heads landed on `main`, `dap-grow` moved through ten
versions, and the demo room's archive advanced from entry 146 to entry
4,148.

## Story: Room A's archive runs

At 17:00 on 24 October Room A's archive row stood at entry 146 and
refused entry 147 for want of metadata budget. Two archive heads landed
overnight: one reuses paid rows and records every capacity refusal with
its site, kind and shortfall (`6c0a9a4d`); one bounds the next pass by
the owned row's recorded size (`5a9aeaf5`). Deployed at 05:21, they moved
the row to entry 149 and stopped at entry 150, short by 1,106 bytes of
metadata at the finish quote (observed tail, 05:27 to 05:52).

The builder measured entries 150 to 200 and built the fallback: after a
genuine capacity deferral, the next pass plans exactly one entry, keeps a
64 KiB metadata margin and takes a fresh inventory in the same call
(`2f5d9a2f`, landed 12:19). Deployed at 12:23, it ran the cycle the design
describes: an adaptive pass refuses at the finish quote, the row defers,
the fixed pass finishes one entry, and batching resumes. Room A reached
entry 525 by 12:50, 1,435 by 13:45, 1,873 by 14:13 and 3,217 by 15:51
(observed tails; no exceptions; the scope index swept 11 of 11 each
time).

The Grow runbook gained the section that an operator needs when a row
stops: how to read the row and pass diagnostics, tell a deferral from a
stop, and build, supply, confirm and remove a restart directive
(`5248b0be`). Its first use restarted the three small rows (Directory,
Site and Destination) to generation 1 with one directive per deploy and
removed the directive afterwards (`dap-grow` versions `01fecbbf`,
`d47f3da3`, `7c040811`, `aa661f24`). Those rows then deferred every 300
seconds: each finish quote exceeds the node bound of 64 by one, and the
rows carry no published anchors, so the fixed pass does not apply. The
builder's analysis found no inherent floor and a path that saves at least
one node. Request `3e01b385` asked for that head at 14:37; it was built,
reviewed and landed by 16:38 (`d3df9249`), with the first evidence
manifest under the new PD-2 rule. Deployed at 16:40 as `dap-grow`
`7ec4d068`, it moved all three rows within ten minutes: Directory from
entry 1 to 13 and Destination from 0 to 19, both then idle at their
frontier, and Site from 0 past 198 and still running (observed tail,
16:46 to 16:57; 1,534 events, no exceptions). Site's passes show the
designed cycle: an adaptive pass refuses at the finish quote, the fixed
pass finishes one entry, and batching resumes. Room A passed entry 4,148
in the same window.

## What landed

### Archive and hosted rooms

- `6c0a9a4d`, 01:55: reuse paid archive rows and record capacity refusals.
- `5a9aeaf5`, 04:25: bound the archive context with the owned row snapshot.
- `2f5d9a2f`, 12:19: finish one archive entry after a capacity deferral.
- `5248b0be`, 13:31: the runbook section on archive stops and restarts.
- `d3df9249`, 16:38: after a capacity deferral, a row without published
  anchors plans exactly the next entry, validates and carries its legacy
  anchors, and takes one fresh inventory in the same call.
- `aff23449`, 04:57: Site reads reuse private expiring credentials (R4).
- `1f3feea2`, 00:18: destination protocol version checks consolidated.

### Codebase review and its first slices

- `c5b8e00c`, 01:22: the codebase technical-debt review, with fourteen
  builder items (BR-1 to BR-14) and eight planner decisions.
- `f5a6338c`, 06:41: BR-1, the room deployment files match the live
  Workers (enforce mode and the creation-pin families) under a config
  test; every documented deploy command carries `--keep-vars`.
- `86204d44`, 14:47: BR-2, the gate runs its cheap checks first and ends
  with the ten slowest cases and the time per project.
- `c8c96843`, 15:03: the review note records its landing and its first
  slices.
- `778fea00`, 15:37: PD-6, `artroom-scope` carries its live start setting
  under a config test; retained Start requests end on 8 November 2026.
- `2aaba5e4`, 16:07: the PD-2 rule on implementation notes and evidence
  manifests, in the testing guide.
- PD-7, slice H1 of the history note (`dfccc6a5`): 31 plans, the
  usability packet and three guides of the earlier model move under
  `notes/plans/retired/` and `notes/retired-guides/`, with an index of
  plans, a notes README, corrected status lines and the link checker in
  the gate. Approved at 16:40 and again at 16:49 after a coverage
  refile; landed as `75b2233c` at 16:50.

### Security

- `c8a3fb24`, 24 October 23:10: R6, the creation policy and versioned
  publication family; new installs use register 18, directory 17 and
  destination 13, and historical evaluation stays pinned.

### Guides

- `43786eea`, 05:25: the testing guide states the bounded follow-up after
  a failed gate.
- `d5e55530`, 05:26: the 24 October sprint report's landing ownership
  corrected.

## Deployments

All from reviewed heads, with existing settings kept, inventory read
before and after.

| Worker | Version | Time | Main | Change |
|---|---|---|---|---|
| `dap-grow` | `4cff4d57` | 24 October 23:31 | `55e4be6c` | restart directive support |
| `dap-grow` | `5e904809` | 24 October 23:44 | `55e4be6c` | Room A restart directive |
| `dap-grow` | `ef755ed7` | 02:22 | `6c0a9a4d` | paid-row reuse, refusal diagnostics |
| `dap-grow` | `aba47ebf` | 05:21 | `aff23449` | archive heads and R4 |
| `dap-demo` | `02a043a7` | 07:24 | `f5a6338c` | pins from the file |
| `dap-lending` | `95b4bd97` | 07:41 | `f5a6338c` | pins from the file |
| `dap-grow` | `68fd6b55` | 12:23 | `2f5d9a2f` | fixed next-entry pass; pins from the file |
| `dap-grow` | `01fecbbf`, `d47f3da3`, `7c040811` | 13:35 to 14:03 | `5248b0be` | one restart directive each |
| `dap-grow` | `aa661f24` | 14:17 | `5248b0be` | directive removed |
| `dap-grow` | `7ec4d068` | 16:40 | `d3df9249` | exact-next pass for unpublished rows |

## Decisions

- Implementation notes and evidence (PD-2, in force as `fcab078d` with
  the checker's amendments): one note per head of at most 40 KB in a
  fixed order; raw output in a durable read-only directory under the
  owner's home; one manifest per head with checkpoint and digests;
  secrets withheld. The first archive head after the ruling is its
  witness.
- `artroom-scope` (PD-6): retained Start requests end on 8 November 2026.
  On that date the planner deploys the file without the start setting and
  deletes the three unused GitHub secrets. No creation event reached the
  deployment in the fourteen days to 25 October.
- The three small archive rows wait for the exact-next head rather than a
  bound change (`3e01b385`).

## Filed

| Request | Owner | Work |
|---|---|---|
| `3e01b385` | builder | exact-next pass for rows without published anchors; landed |
| `28b878ed` | builder | gate warning on notes over 40 KB and stray evidence paths |
| BR-3 to BR-14 | builder | the review's remaining items, in order |
| `01a44429`, `827cde15`, `2f653384` | planner | PD-6, the status head and PD-1; all landed |
| `a22cc5b2`, `9e86b139` | planner | PD-7 and the PD-2 docs head; both landed |

## In progress

- The gate warning on notes over 40 KB and stray evidence paths
  (`28b878ed`); the builder took it after the archive landing.
- R7 Source composition for the builder's security queue, behind the
  gate warning.

## What did not happen, and why

- The first landing attempt of PD-7 was refused by the merge plan: the
  head retires other actors' live artifacts at paths the approval did not
  name, including the `docs` and `notes` directories. Three directory
  artifacts put them within reach, and the head went back for a second
  approval at the same tree. A head that moves or edits files other
  actors published should name their directories from the start.
- The `dap-demo` browser Start (`2fcb4c68`) and a cold index read did not
  run; the archive work and the review's planner decisions took the day.
- The status-line gate test of slice H1 is not built; it joins BR-7.
- A landing message of 152 code points exceeded the 100-point rule
  (`5248b0be`); the receipt binds the commit, so it stands as disclosed.

## Commitments for the sprint ending 26 October, 17:00

| Owner | Work | Request |
|---|---|---|
| Builder | The gate warning head, then BR-3 and the items after it in order | `28b878ed` |
| Checker | Review each head at its exact head, with the manifest check | — |
| Planner | Tail Site to its frontier and report under the archive request | `3e01b385` |
| Planner | `dap-demo` browser Start and a cold index read | `2fcb4c68` |
| Planner | Hourly surveys; the report at 17:00 | — |
