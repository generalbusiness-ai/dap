# Share declaration descriptions

Request 260991d8, promise b1536885. Head B moves declaration wording and
input-schema derivation into portable Client code. The integrated source
has tree c278e416. The original checkpoint remains at 90c7dd9b; the
rebuilt branch reaches 3cf87cb5 with the same tree.
This evidence adoption changes only this note and seven manifest files.
All 4,520 other prior blobs and modes match tested 3cf87cb5. Regenerate
the comparison with:

```sh
git diff --raw --no-abbrev --no-renames 3cf87cb5 HEAD
```

The workroom binds the final Git head and tree after the documentation
commit.

## Implementation

Client owns the complete declaration renderer and its shared field,
step, grant, guard and schema helpers. `descriptionsOf(catalogue)` closes
those helpers over an explicit structural `MarkCatalogue`: pin keys,
rule keys and optional readonly refusal names. The description modules
import no Platform, MCP service or Node adapter. No executable rule or
callback enters the catalogue, and no global native catalogue supplies
a hidden default.

The mark wording table remains in Client. Each binding expands it over
the supplied catalogue's own pin keys. Pin, rule, mark-code and BY_NAME
lookups require own properties. Unknown names keep the literal fallback.
Recursive guards and schemas use the same lexical binding, so two
catalogues can render different nested refusal names independently.

MCP's private `description-context.ts` reads actual `VERSIONS` once and
projects only plain pin and refusal metadata. It creates one binding.
The existing describe module retains all 27 exports, and the marks
module retains its three exports. Ten bound members use direct
member destructuring; no wrapper functions change their signatures.
The private binding does not enter the public MCP barrel. Existing
service and catalogue consumers retain their imports.

CLI browser helpers forward Client's `describeActLine` as the existing
`describe` export and use the shared grant helper. The compact renderer
binds an empty catalogue inside Client. It preserves CLI wording and
states the declared requirement without asserting caller standing.
The complete MCP description, guard labels, schema, 1,000-character
bound and pointer to omitted guards retain their behavior.

B adds two cases overall: the compact-line case and the catalogue-binding
case. The latter checks two independent nested refusal catalogues and
the `constructor@1` fallback. The existing totality case moves intact
and binds an empty catalogue. Existing MCP, CLI and Native story
assertions remain in place.

## Integration and boundaries

B merged landed BR13 main c9055184 in ordinary merge 623ae740. The seal
table keeps the exact BR13 table plus B's reviewed helper row and three
new owner rows. It preserves BR13's claim seal and A's shared expected
helper. The maintained parser produced the adopted values; no assertion
or selector weakened. The [initial source metadata], [binding seals] and
[narrowed adapter seal] retain their actual producer receipts.

The owned namespace has 15 workspace links and 50 supported export
aliases. It includes Contract's catalog-vocabulary leaf and the inherited
Counter, Lending and browser alias repairs. B adds no package or lock
dependency. Definition pins, canonical protocol packets, admission,
custody and application rules stay unchanged.

The combined Page build ran at 623ae740. The generated asset and sealed
[combined build] evidence entered 90c7dd9b. Its four served scalars match
the retained HTML and JavaScript dist leaves. The own-row control ran at
6869a035. Its Client describe, mark-descriptions and describe-test files
remain byte-identical through 90c7dd9b and 3cf87cb5. The integrated focus,
strict capture and actual browser workflows ran at 90c7dd9b. Clarification
ea70e3dd preserves these execution labels. Their existing source
correspondence and the new tree-equality proof support the rebuilt head;
no earlier witness reran.

## Actual validation

Each row records its execution source. Workflow steps are not individual
case counts. A failed gate remains failed.

| Witness | Execution head | Actual outcome | Evidence |
|---|---|---|---|
| Combined Page build | 623ae740 | Four exits 0; all four dist bindings match | [combined build] |
| Own-row control | 6869a035 | Baseline: 3 pass, exit 0. Mutant: 2 pass, one intended AssertionError, exit 1. Control and wrappers: 0 | [own-row control] |
| Integrated focus | 90c7dd9b | 26 compiler phases, 24 Node cases and 17 plain cases pass; no skips, retries or errors | [integrated focus] |
| Strict original bytes | 90c7dd9b | All three complete files match their originals; Lending includes default, generic and add | [strict capture] |
| Page and Card workflows | 90c7dd9b | First attempts succeed: Page 12 steps, Card 13 steps, including seven named browser steps | [browser CI] |
| First gate | 90c7dd9b | FAILED 1 at commit messages; all 5,841 cases, 45 compilers and 16 typecheck scripts unreached | [first gate failure] |
| Static prechecks | 3cf87cb5 | Whitespace, commit messages and format pass; all six actual exit files read 0 | [static preflight] |
| Replacement gate | 3cf87cb5 | PASS: 5,838 cases and 3 expected skips; all 5,841 obligations match; three actual exits 0 | [replacement gate] |

The replacement gate passed at 3cf87cb5. END 58a16d59 closes the slot.
All 45 compiler contexts, 16 typecheck scripts and 12 maintained gate
steps passed. The pinned analyzer found zero issues or unexpected known cases. All 111 wrapper records remain
unknown. The Scale predicate omitted six obligations; they count as
neither passed nor skipped. The skipped Page recorder module has no
reported duration. The inner time is 976.739126583 seconds; the outer
time is 979.060520417 seconds.

The unchanged passive ten-second RSS sampler recorded 98 samples,
568 Node or workerd rows, 17 explicit PID races and zero sampling errors.
Maximum sampled single-process RSS was 2,477,568 KiB for Node and
3,061,872 KiB for workerd. The prior BR13 baseline has a different scope.
These samples measure neither heap usage nor summed or instantaneous
peak memory, and they define no threshold. Flags, pools, workers and
deadlines remained unchanged.

The focus reconciles complete static, public-reporter, built-in JSON and
Node TAP identities. Its four whole plain owners cover Client describe,
MCP describe, MCP inventory and CLI browser-boundary tests. Both complete
Node owners, active-source and security-entry-points, passed. The
[historical focus] remains a separate earlier result.

The strict capture produced 139,830 lane-reference bytes, 262,660 MCP
tool-document bytes and one 298,441-byte Lending file containing all
three modes. Every byte equals its retained original. No document,
fixture or baseline changed. The retained DEP0205 warning concerns the
loader's deprecated `module.register()` API. These explicit fixtures
establish derived bytes; they establish no Native authority or live
outcome.

Page run 42784374227 and Card run 42784378544 used original attempt 1.
The Page browser steps cover screenshots, recorded demos, create room
and local label. Card covers Card, Grow room and Grow routing. Both
annotation lists are empty; no workflow retry or fallback ran.

The focus and capture kept all 4,521 source hashes and 7,525 tool pins
fixed, with six and eleven external inputs respectively. Their complete
namespace and process guards passed, and inner and outer cleanup stayed
empty. The preflight kept 4,521 source paths, 7,534 tool pins and 22 inputs
fixed. Its inner time is 11.416213459 seconds; its outer time is
12.971013792 seconds. Those times measure different boundaries.

## Failed gate and authorized history copy

The first gate passed whitespace, then rejected the inherited 9256f2de
merge subject at 101 characters. It observed no cases and ran no pass
analyzer. END 9b17bfc6 closes that failed slot. Its raw evidence stays
separate from the successful focused checks and distinguishing control.

Ruling 7fb1a2da requires the checker to remain unchanged and the old
branch to stay at 90c7dd9b. The new branch is
`builder/shared-descriptions-t0b-20261110`. Its replacement merge subject
is "Merge landed shared expected revisions into descriptions", with
56 characters. The original branch and observed remote remain at 90c7.

The first reconstruction setup returned 1 before any Git call because
its guard expected 55 rather than 56 characters. It created no new
objects, ref or receipt directory. The corrected v2 reconstruction and
independent auditor each returned 0, as root-observed process receipts
record. The [history proof] matches all 6,180 ordered commit trees and
mapped parent order, including the 15-commit branch range. Fourteen
commit objects change only mapped parent IDs and that one authorized
subject. Every other header, author, committer, message body and tree
stays exact. The final source diff is empty.

Before-and-after ref snapshots alone do not prove the absence of
transient writes. The retained process receipts bind the reconstruction
to the reviewed driver. No reset, amend or force operation formed part
of that driver. The failed original gate stays failed; tree equality
carries earlier evidence without relabeling its execution head.

The actual prechecks at 3cf87cb5 then passed. The unchanged message
checker checked 15 commits and flagged none, and format reported that
all matched files use Prettier code style. END 73a68ba5 closes that
preflight. It is separate from the replacement gate's pending result.

## Retained audit history and limits

The original dependency copy returned 0. Its first setup audit returned
1 on the owned-bin guard; a metadata follow-up returned 0 without another
copy. The control sealer first misread its relative cwd and then passed
a metadata-only follow-up. The combined-build audit retains two reader
assertions and a Python syntax refusal before its final audit returned
0. None repeated the build or control. The [initial source metadata],
[own-row control] and [combined build] retain those outcomes. The
[historical build] records an earlier asset, not the combined build.

The own-row control restored exact source bytes. Its intended mutant
failure distinguishes inherited BY_NAME data from the literal unknown
fallback; it does not establish Native authority or acceptance. Complete
raw buffers, reports, setup receipts and indexes stay in separate private
archives through at least 2026-12-10. Archives retain original output bytes and all audit outcomes.
Manifests name each sealed unit and its modes. Public manifests expose
safe summaries and hashes rather than raw payloads.

This head claims no deployment or live acceptance and accepts no altered
fixture bytes. DX-T0 parent 6f87a4e3 stays open for D's typed
browser-model item. Under placement 176190ba, E (d5fa31c9) starts source
work after B and C land.

[combined build]: evidence/2026-11-10-t0b-combined-page-build.manifest.json
[own-row control]: evidence/2026-11-10-t0b-by-name-control.manifest.json
[integrated focus]: evidence/2026-11-10-t0b-integrated-focus.manifest.json
[strict capture]: evidence/2026-11-10-t0b-integrated-capture.manifest.json
[browser CI]: evidence/2026-11-10-t0b-browser-ci.manifest.json
[first gate failure]: evidence/2026-11-10-t0b-final-gate-commit-message-failure.manifest.json
[history proof]: evidence/2026-11-10-t0b-history-proof.manifest.json
[static preflight]: evidence/2026-11-10-t0b-rebuilt-static-preflight.manifest.json
[replacement gate]: evidence/2026-11-10-t0b-final-gate-2.manifest.json
[initial source metadata]: evidence/2026-11-09-t0b-source-metadata.manifest.json
[binding seals]: evidence/2026-11-10-t0b-explicit-catalogue-seals.manifest.json
[narrowed adapter seal]: evidence/2026-11-10-t0b-rule-refusal-seal.manifest.json
[historical focus]: evidence/2026-11-09-t0b-focused.manifest.json
[historical build]: evidence/2026-11-09-t0b-page-build.manifest.json
