# Verify citations and reject misplaced Git parents

Request: `a30f1b67`. Promise: `5a78cc01`. Parent identifiers request:
`05d618e2`.

Replay's generic citation verifier now rejects a Git `parent` header after an
`author` or another non-parent header. The old private `gitEvent` collected
parent lines anywhere in the header block. A correctly hashed malformed commit
could therefore supply a false chain edge. Review rejected head `8793316b` for
that gap. Repair `7f06529a` accepts parent headers only in the contiguous block
immediately after `tree`, validates each digest, and follows only the first
parent. It changes 13 lines of that private function, whose sole caller is
`verifyCitation`.

Current source checkpoint `3da82263837ed39bf2274fa7caf8d7c784b09d64`, tree
`e2a4a809609d99cb5d652e328b57f7c016ba8553`, adds only the two independently
produced Git vector rows after `7f06529a`. The repair has 37 current passing
cases. The old-scan control produced the two expected report failures and has
its own sealed record. The completed metadata aggregate preserves all outcomes.
The documentation follow-up changes only this note and its evidence descriptor;
source, tests, dependencies, configuration, and generated asset blobs stay
fixed at that checkpoint. Exact-head CI belongs in the external review
attachment. Nothing here turns the failed full gate or rejected review into a
pass.

## Keep integrity separate from Native authority

Bytes adds `parseSequenceIdentifier` and `parseCitation` to its existing entry.
They consume the whole string, preserve its spelling, and check digest widths
and safe decimal positions. Replay adds `verifyCitation(text, source,
options)`. It copies and hashes source bytes before it decodes fields. Its
result keeps exactly seven protocol members. Invalid caller options fail before
reads.

The generic verifier preserves explicit anchor and depth boundaries. Fetched or
cached bytes never become trusted anchors. For Git, it reads raw commit bytes,
ignores replace refs, disables lazy fetch, and follows the first parent without
a revision walk. A shallow missing object remains unavailable. SHA-1 uses Git's
literal commit hashing without writing an object. This makes no claim about a
Git build's SHA1DC selection. Git256 hashes the exact header and content with
SHA-256. Neither Git format has a signature profile here.

The CLI's `--citation` mode accepts a section-7 file source or a Git clone. Its
default is level 3 with 10,000 predecessor edges; the API defaults to level 3
with unlimited depth. The CLI exits 0 for `ok`, 1 for another protocol result,
or 2 for invalid options. A duplicate digest claim in the file source reports
`incomplete/unavailable` and exits 1. Existing Native argv, verifier bodies,
reference shapes, judgment Replay, and admission rules keep their meaning.

Native identity, admission, archive, and wire changes still belong to
identifiers (c+d) under `05d618e2`. Citation integrity alone establishes none
of current-key authority, freshness, deployment, or live acceptance.

## Bind the repair to independent expected reports

`scripts/identifier-vectors.py` uses only Python's standard library. Its public
TEST signer checks three RFC 8032 signing answers before output. Its fixed TEST
seeds are not custody keys, and the signer stays outside production. Its JSON
writer claims no general JCS implementation.

The original producer at `372f5ff5` emitted 82 expected-report rows: 30 dap1,
26 git, and 26 git256. The one repair producer at `7f06529a` emitted 84: 30,
27, and 27. All 82 prior case objects remain exact, as do all three sequence
files. The new `parent-after-author` rows live in `vectors/git/cases.json` and
`vectors/git256/cases.json`. Each places a `parent` line after `author` and
expects `mismatch`, reached 1, reason `position`, with no anchor or trusts.
These are 84 expected-report rows. The positive Replay owners compare those
reports; the rows are not 84 registered tests.

The maintained Page input graph reaches the changed Replay source through the
CLI browser exports, claim/invitations, `command-support`'s `SourceError`
import, and Replay's barrel export. Ruling `7505fa96` required the
changed-input build. One Page build at `7f06529a` exited 0 and left `assets.ts`
byte-equal: `e104ec88feef46fe5a973c256873f9dc6dfcde6f62fa1282d912093f241e0530`,
2,435,554 bytes. All four served scalars and digest comments equal their dist
files. SAME bytes establish that correspondence, not semantic equivalence.

The measured Bytes AST seal remains
`7c8c95148c4af026aa1416b4f2d9ce8e53b33343a49bf27d1875a86e2d5c07b7`. The
security inventory retains its assertions. A raw file hash cannot replace that
maintained AST value. The repair changes only the inventory comment; its
measured Bytes seal and all assertions remain unchanged.

## Preserve each historical outcome

The full fa6 gate and its same-run analyzer exited 1. It completed all 45
compiler contexts and 16 typecheck scripts, then stopped at the Page module
comparison. It reported Node 150 passes, Counting 56 passes, and Plain 4,543
passes, one failure, and one skip. All 1,130 Native obligations were unreached.
The original Page build and ruled `377b2adb` continuation stay separate: five
current compiler passes and 1,146 current cases, including 1,128 Native passes
and two planned Native skips. The old 4,735-runtime/40-compiler correspondence
remains historical at fa6.

Head `8793316b` carried that evidence and successful Page/Card workflows, but
its review still requested the late-parent repair. Those workflow outcomes do
not cover a new review head. Ruling `89d505ad` accepted the five late cheap
checks at `377b2adb` and the already-sealed evidence without repetition. The
note preserves their after-continuation order. The final 879 documentation head
also had five ordinary checks before publication.

For this repair, 19 affected compiler contexts passed as ordinary working
checks before the ruled focus. Five cheap checks at `3da82263` also exited 0.
Their raw logs stay plain and external, outside the preparation or validation
seals. No new packet or acceptance claim follows from those working checks.

At `3da82263`, the one ruled focus passed all 37 selected cases: 24 Node cases
and 13 Plain cases across the three whole Replay owners. Six Node wrappers
remain UNKNOWN. Both phase children and all enclosing commands exited 0;
cleanup closed empty and source/tool/input fences held. No compiler ran inside
that focused unit. Its actual focus seal is
`c276458b41bec234dee34d884d903c98fc5db6114c53ea5a09e0e62f16f6c7c8`.

Ruling `15d3b0bd` permits this focused continuation instead of a second whole
gate. The per-owner proof `5cdd9a81` covers 706 carried owners and 5,844
historical observations: 5,841 passed and three skipped. Of those observations,
4,710 belong to fa6 and 1,134 to `377b2adb`. The proof resolves 84 finite
readers and shows that each carried owner does not call the changed `gitEvent`
lines. Those observations and the 37 current cases form 5,881 disjoint
identities. The proof creates no current runtime pass. A caller outside the
selected scope would stop this correspondence and require a new scope ruling.

## Evidence and filing

The
[evidence manifest](evidence/2026-11-11-identifiers-vectors-b.manifest.json)
binds 86 indexed public files and 27 indexed private records to the source
checkpoint. The full sealed aggregate descriptor has SHA-256
`4c49f9bc21b100b53f2d90ce8eeabfd2f23b0702e527d6e145504972d7e2de51`. The table
preserves original exits, including the first citation-control controller's 2.
Every named aggregate artifact is indexed. Complete argv, raw exits, literal
identities, and custody maps remain in the original units.

| Check and checkpoint | Recorded command or owner | Actual outcome | Evidence |
| --- | --- | --- | --- |
| Original vectors/Bytes seal, 372f5ff5 | `identifier-vectors.py`; maintained `sourceSeal` | Producer 0; AST producer 0 | `history/377b/units/preparation/manifest.original.json`, `b5411a953860` |
| Original focus, fa6 | Node owners and maintained focused runner | Metadata V1 1 before runtime; V2 runtime 0: 24 Node + 145 Plain | `history/377b/units/focused169/manifest.original.json`, `07e7f857d5d9` |
| Original citation controls, fa6 | Whole `citation.test.ts`, two separate faults | Both children 1. First controller 2; metadata adjudication 0; anchor continuation controller 0 | `history/377b/units/citation-controls/manifest.original.json`, `663033cbc8af` |
| Full gate, fa6 | Recorded gate driver and same-run analyzer | Both 1; Native unreached | `history/377b/units/failed-full-gate/manifest.original.json`, `299ae5ebaa32` |
| Original Page repair, fa6 → 377 | `npm run build --workspace @generalbusiness/dap-page` | Build 0; only asset adopted | `history/377b/units/page-build/manifest.original.json`, `0b8ad987757d` |
| Original ruled continuation, 377 | Five compilers; Page, Node, Native phases | All commands 0; 1,144 passed, two skipped | `history/377b/units/bounded-continuation/manifest.original.json`, `8487f779efdd` |
| Rejected review head, 879 | Page/Card workflows; checker review | Both workflows succeeded; checker requested changes | Historical external review attachment; no new-head CI claim |
| Repair producer, 7f | One `identifier-vectors.py` invocation | Producer/driver/external 0; 84 expected-report rows | `units/repair-preparation/files/independent-producer.summary.json`; descriptor `f52de26e4a12` |
| Repair Page build, 7f | One maintained Page build | All exits 0; SAME asset | `units/repair-preparation/files/page-build.summary.json`; descriptor `f52de26e4a12` |
| Owned-output quarantine, 3da | Metadata-only `quarantine.SOURCE.py` | 0; three retained trees, two fresh caches | `units/repair-preparation/files/owned-output-quarantine.summary.json`; descriptor `f52de26e4a12` |
| Current focus, 3da | Node owners and `scripts/focused-check.mjs` | 37 passed; all commands 0; six UNKNOWN wrappers | `units/repair-focus/manifest.original.json`, `c276458b41be` |
| Historical correspondence, 3da source graph | Per-owner no-call proof | 706 owners; 5,844 historical observations | `no-call-proof-reference.json`, `07ddbeb2595e`; private proof `5cdd9a81015a` |
| Old-scan control, 3da | Whole citation owner, old scan restored | Child 1; controller/outer/launcher/external 0. Two expected report failures and three passes | `units/repair-control/manifest.original.json`, `11ebcac2855c` |
| Final aggregate, 3da | Metadata writer freeze and seal | Both 0; 86 public and 27 private indexed records | `raw-index.json`, `708ef5febcce`; `terminal-prerequisites.json`, `c405ca8ccb0b` |
| Exact final-head CI | Page/Card workflows | Required external review attachment | Exact commit, events, attempts, all terminal steps, and sealed CI manifest |

The control continuation in the original evidence ran only the previously unrun
anchor fault. The new old-scan control retained its own result: the git and
git256 `parent-after-author` cases failed at the full-report comparison on line
22. The other three cases passed, with no retries or positive repeat. END
`24dbe941e4b128365cf0975661edaa08cead38a4` records that distinguished fault.
Its control descriptor is
`11ebcac2855c0f123a2a8fdf82ae80ce9a14964a831c48b071d5b0cbbe3743c0`. The
metadata seal exited 0 under END `8dbaa75ec0b891f87bd31aeab27c50a39ae8a6e4`;
that END does not replace the runtime END or the negative child exit 1.

The preparation descriptor is
`f52de26e4a128cb6bb5b7b04785af4084fa9d77b11247aee78fb52f3dd64d5eb`. Its three
units retain their own heads and outcomes. The final writer copied the old 62
public metadata files under `history/377b/` and curated public metadata from
the new sealed units. It retained older private archive locators and full
hashes without reading or copying their raw payloads.

The 13,476,635-byte current no-call proof has exactly one new private copy.
`no-call-proof-reference.json` binds its full SHA-256
`5cdd9a81015a80e62dd154b86a097424bb539f4dd8cdef16e1bb452137708c83` to
`proofs/no-call/carry-proof.json` in the aggregate's private custody. The
private manifest has SHA-256
`d7bd293ba0f3376561d6e14a8996a293bb09556d90863d38a869ec76e5dba9fd`. The large
proof is absent from the public files.

Metadata freeze and seal both exited 0. END
`6f8b68479793eb73ff18c42c2b00745e4d050d5f` closes that metadata operation. Its
97 copy maps, 97 selected original files, nine source files, and 26 source
directories retained their full original facts. Original file bytes, recorded metadata, and
directory membership remain unchanged. Archive copies use files 0400 and
directories 0500, with at least 30 days' retention after landing. Ordinary
compiler and cheap-check logs stay plain and external.

RSS remains passive sampled single-process information. The repair Page build
keeps raw status `failed`, one sample, no owned Node/workerd row, and a
separate accepted UNKNOWN record. The control keeps raw status `failed`, two
samples, no owned Node/workerd row, no observer error, and its own accepted
UNKNOWN record. The current focus has three samples and two owned rows with no
observer error. These samples supply no lifetime upper bound.

## Open obligations

Request `a30f1b67` still owns exact final-head Page/Card CI and review. The
review attachments bind the exact commit containing this note and the evidence
descriptor, chosen events and attempts, every terminal step, and the sealed CI
manifest. Filing CI needs no later note commit. No second whole gate or
deployment follows from `15d3b0bd`; the checker judges the evidence together.

Parent `05d618e2` remains open for identifiers (c+d). This head performs no
Native identity or admission cutover. The planner owns deployment.
