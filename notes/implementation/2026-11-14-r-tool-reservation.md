# R: tool-library reservation

Request `5b5b6896fc6cb6507e4e1fab4b2639f8b0157633` and promise
`f68dd9c48d6d54874c20a7f168b59be1c1a45efb` track this work.
Planner ruling `02d4942afa12d67762bafd9d278ea6d575dac82c` sets the
day semantics below. Canonical ruling
`bdeb6c151cd25e6b13259f6d6a48070dc3719723` grants this source composition,
sets Lending to `0.3.0`, and moves packets, trust rows and the content bucket
to LC-1 request `91829f2e`. It supersedes retired ruling `b2654766`.

## Original source composition

Branch `builder/r-on-main-source-20261114` starts at actual main
`57f887ce066448133d0bd0fe611d0935cc6eb0ed`. It replays only R's own commits
`1475396522`, `9c4c722eb2`, `3ee7e5909c`, `321f09ab9e` and `c2c86bea54`,
as `10a8b173a4`, `9489c6dfc8`, `c75ebea757`, `4682a88265` and `744ca3a89e`.
The original `r-contract-preflight-20261114` worktree, refs, evidence and
f288 dependency view stay intact. The new worktree has no dependency copy.
No install or stamp change occurred.

Both overlap paths merged automatically without conflicts:
`examples/lending/README.md` keeps NF5's Custody prose, and
`packages/scope/test/lending.test.ts` keeps main's actual shared Custody
imports, adapters and recovery witnesses alongside R's reservation race.
No old Kept interface returns. This composition changes no Core or SDK
production source.

At the original composition checkpoint, the authored package and descriptor
both say `0.3.0`. Counter remains `0.2.0`. No producer, packer or identifier
calculation had run on this branch.
The carried `definition.json`, `pin.ts` and `scenarios/application.json`
remain the dated outputs of original R commit `321f09ab9e`; regeneration
and byte correspondence are **OWED** at the later executable boundary.
Current release identifiers remain main's old values. They do not claim
that the new version or reservation source reproduces those identifiers.

All validation at that original checkpoint was **UNRUN**. The table preserves
old-head results as history and names current obligations separately.
LC-1 must land and R must merge its actual main before preflight. The
canonical same-lock dependency view also remains owed. Neither the old
f288 view nor its successful checks carry to the new dependency graph.

The three prerequisite witnesses live in
`examples/lending/definition.test.ts` at `1475396522`. Actual PASS act
`6175` records their earlier execution. They check the equality-only
slot form, own-item timed effects, and a named refusal after two
same-head opens with empty expected revisions. They passed before the
production edits. The renewed whole definition owner below includes them.

## LP1: the actual publication refusal and source repair

LP1 request `fe834d8e8954718e30e61885a14a40438b5b9f92` and promise
`d9b356ed2d2501bf34dda9287cab4d1dcfe6f36a` track this repair.
On 2026-11-15, END `af78c2ecf75729070ea15899cc94ac28773ef781` records
an actual RED at clean head `4f213e9d080a12e928974e9fb76b2113384b067a`,
tree `7d0b2c6b1c4f15840a5df88fc4c4a397ee505671`.
The maintained producer left all three dated outputs unchanged. Four affected
compiler contexts passed. The whole three-case base installation owner had
two passes and one assertion failure, with no skips or setup failure.

The failing case installed the current Lending package in a real base room
and donated `shelf/lp1.md`. Destination acknowledged its deciding entry as
recorded. The exact Result for donation sequence 2, send 0 then refused
`publish-file` with `guard-failed` and `publication-path-not-declared`.
The applied-outcome assertion at `base-ordinary-install.test.ts:256–257`
failed before the page and receipt assertions. A recorded acknowledgment
alone does not establish publication.

The source repair adds `publication-paths@1` to the Lending descriptor with
one literal directory prefix, `shelf/`. The schema rejects glob syntax.
This is the fewest prefixes that covers the definition's five sends:
`donate` checks a `shelf/` page and stores it in a fixed slot; `borrow`,
`return`, `cancel`, and `publish` reuse that page. The README states what the
Library publishes and where. Every test and assertion stays unchanged, as do
Directory, Destination, grants, and receipt code. Lending stays `0.3.0`;
Counter and both immutable `0.2.0` packets stay unchanged.

The same whole base installation owner then passed all three cases at
`eb6d6a30a4f3686aa389f131abc854ea66f0a7dd`, tree
`7c0dd8a70dc6c680b8c240f1c0fd97cae5ca4d63`: exit 0 in 17.385805792 s.
The actual Destination Result, published page, and receipt assertions all
passed. This GREEN does not establish a release, signing, or deployment.

Remaining development checks stopped at the retained-package correspondence
assertion. END `c8defd372a022ead123bf49fc2fa368f54650d32` records all eight
Lending definition cases passing, then ten passes and one assertion failure
in the whole Define story/package invocation. `package.test.ts:10` showed
that authored `lendingPackage` still emitted `capabilities: []` while the
retained descriptor declared `shelf/`. All six story cases passed. The
Native Lending owner remained unreached.

The source follow-up overrides only the Lending-local `manifest(...)`
result's package capability with the exact reviewed declaration. The typed
manifest spec has no package-capability option; the shared helper and schema
stay unchanged. The descriptor bytes, equality assertion, all other tests,
versions, and Counter stay unchanged. The follow-up at `563bdadcad` passed
the Lending compiler, all five package cases, and the Native Lending
scenario. These dated results preserve the earlier manifest failure.

## Published-main integration and current identifiers, 15 November

Merge `8d7f7f8c6a4212be4665cdfecadad06904d72b29` takes published main
`17a917cd73b0528dcf8d2610707c1b3f24afbeaa` into the repaired R source.
Its other parent is `563bdadcad`; its tree is
`3fce8f35b7a0766b84a8b21cb50610edfea15699`. No conflict changed R's source.

Canonical comparison END `4b3c17fb3b687f6fef083626d9c9b6759997c128`
passed at that clean head. Grow `2.0.0` and Counter `0.3.0` identifiers
and file bytes stayed exact. Only open Lending `0.3.0` changed. Normal
apply wrote only `examples/lending/release-identifiers.json`, then committed
at `be8af0de5f908b589520ec8ddee7c5fd10d91f1b`, tree
`998187217b1ae830d5385eaa7edd0ad8d635d93f`.
The entry and sole definition retain the typed producer's digest.
The actual candidate tuple lives in `I/identifiers/lending.candidate.json`;
comparison retains all six original and candidate files. This note-only
successor changes none of the checked source or applied identifiers.

The comparison uses normal R1 preparation with a public TEST signer.
It exports no public packet and performs no operator signing. The later full
gate failed as recorded below. Review remains **UNRUN**. Neither development
passes nor identifier correspondence establish final-room acceptance.

## Isolated CLI fixture follow-up, 15 November

Full gate END `5bad3c96027b8149e64a76e6915b24ed3244ba00` records exit 1 at
`84481fb186893ed241b0652818b8ac56e47f74b6`, tree
`e8c1066fdda1904288bb2d92aed343649f442810`. Its sole failure was the old
Lending tuple in `packages/cli/test/application-examples.test.ts`.
`checkCommand` returned zero before the summary assertion failed.

The retained scenario has 25 steps. Genesis is entry 0; donation,
two reservations, borrow, return, and cancel reach entry 6. The two explicit
timed lapses reach entries 7 and 8. The repair changes only Lending's tuple
from `14, 4` to `25, 8`. Counter keeps `18, 10`. All three cases, production
assertions, deadlines, imports, fixtures, configuration and identifiers stay
unchanged. A tracked-source search found no import of this test file; the
corpus's filename string labels an origin without loading the owner.

The repair changes only that failing file and this note, under the
[isolated follow-up rule](../../docs/evidence-filing.md#follow-up-after-a-gate).
Ruling `c637f63f62997e5054e6e4fc6554291382320322` replaces item 2 of
`913b5e7d` with one compiler, the whole CLI owner, then the unreached Native
phase. It preserves gate 1 as FAIL and leaves the checker to assess the
rule's conditions or require a full gate.

START `991a24b76dc6a005c5cb2a103fab73d6c4efb558` binds clean
`53aba95f00a5f0808af8884d35386f7189e0cc2f`, tree
`c813fbde17e29c6d6cadff00b0c31fc7cfa01243`. The isolated compiler passed
in 0.540242750 s; all three CLI owner cases passed in 6.165756083 s.
The pre-START source read found application-pack.test.ts's separate
lending-standard fixture (five steps, through 1), not another stale count
of the current package scenario. Fresh natural Scale selection is omit,
`outside-scale-paths`: 19 changed paths, no matches. No Scale acceptance or
first-moved timing follows.

END `aa2c014f5cc8f773baa0d316b316c913853efe37` records the separate
follow-up FAIL, exit 1 in 515.584793499962 s. Native exited 1 in
508.723583167 s; its controller took 508.877585583 s. Native had 1134
passes, one failure and two skips across 1137 tests; files had 286 passes,
one failure and one skip across 288 files. No signal, spawn error, timeout
or unhandled error occurred. Native and its controller closed and reaped.

The sole failure was `maintained-application-projections.test.ts:54:41`,
case `maintained lending package installs and its browser adapter reads
native declared state`. Its `install_application` assertion expected
answer/phase `accepted/accepted` and received `refused/refused`. The terminal
formatter omitted six other matching properties, so this note claims no
refusal reason or cause. The later browser-adapter assertions did not run.

Gate 1 remains FAIL and this follow-up is also FAIL. Under `c637f63f` and
`841b79030689a4b6d3c9d8f4092905c790dbc7ce`, R leaves this route: no R
review, artifact filing or landing follows it. E1 takes the slot on published
main `17a917cd` without R. Diagnosis act
`2dfa33b8bcd6a8be6fd59a9ac4905a829881f015` records source-qualified analysis,
not a refusal reason exposed by the log. This note-only successor changes none of
the source or tests checked at `53aba95f`.

## Current post-E1 route: R, LP1 and BP1

The earlier gate and isolated follow-up remain FAIL at their recorded heads.
This new route does not relabel either run or infer the old omitted refusal
reason. BP1 request `dce57e0dd2c029a99cba583c4e34d560b9e32d60`, promise
`aedda13b6d272754dac9d51a11c87667db867dc5`, adds the Base projection reader
and metadata repair after a separate, actual named RED. Its distinct report is
[BP1: Base application projections](2026-11-15-bp1-base-application-projections.md).

E1 actual main `d1585bda558c2bcea13ca6cc7c162be1e47b9127` was published
under `0e5663cbeaf225097ef4284cfa688183ff53f22f`. Planner deployment END
`8debe803d4072048e96f3f41189dc77f7dd9c836` records Linux Page run
43698774419 PASS and the three Room Workers/sandbox deployed at that E1 head.
Those are E1 results, not hosted R/BP1 acceptance.

Normal merge `1b09111112549e57f62e022175f71afe6fb71374`, tree
`7db3fa847a6b8f1a65011318b579f08391a286d2`, takes that actual main into R.
The sole conflict retained the whole R Lending identifier tuple from 53aba95f,
as planner `b07d5516ea1e2712e22784f8ef3ae34b1e718680` required. The merge
body states no one had measured the combined source. Its full tree preserved
all 21 R changed entries and 56 incoming-only E1 entries; every other entry matched.

Then normal comparison/application END
`91867fca7fc1a276b1b6adbe9e7cbdec55e70edb` measured the combined source.
Comparison exited 0 in 2.210679125 s and apply exited 0 in 0.251210375 s retained Grow 2.0.0 and
Counter 0.3.0 exactly. Only Lending presentation changed to
`sha256:7217583c00c0548755faa3a83ee9fef194a354624dd29dccf62a7c79cbfd48ef`.
R entry/sole definition 25366d11 and semantic 6910aa45 stayed exact. The one-field
apply committed `f18dfbc587dc84c097135817fb657ef9e153ed27`, tree
`afb62a494628a97d63750743d9da39854302a9f7`, with no other source/version/
signature/trust change. Public TEST signer 254 is not publisher custody.

Named RED END `e7bdf3196d96c499ebc1c2bfc7dfaedeab6a5ece` then bound f18.
The exact Lending/Base/Register 28 case reached real installation/active state,
then failed first projection assertion 80:59 with public `query-not-ready`.
It was a direct contract assertion, not setup/timeout: 1 FAIL, 2 Counter rows
SKIP, case 3036 ms versus child 10.092601375 s and outer 12.660211000 s. All 7
guards passed, errors 0, all children reaped. Scope compiler and compatibility
passed first; compatibility copied=false/cd50 unchanged. Later SDK/MCP/browser
adapter/data assertions did not run in that RED. This precedes every BP1
production change.

Source `55b041a585cd80741c740d7426a24c3b50fe5b66`, tree
`f126f30e70e5df285b7f5fbf81a9dfbd073745ea`, changes only two Platform
readers and two R-owned tests. Existing proof checks now admit Base Rules 15;
metadata reports Membership 14. Definitions/pins/replay/types/IDs/seals stay
exact. The Plain matrix uses a valid completed proof, not fifteen historical
genesis/authority flows. Native keeps all three rows/assertions/deadlines;
both Base rows check real metadata 14. ONLY Lending Base adds Vic's actual
session refusal unauthorized and the same projection without session forbidden,
with Rita's issued-session positive. Counter Base has no negative control;
issued claims still retain expiry semantics, not immediate revocation.

GREEN END `0c825126862fc06986735cb055089b6067e52e24` records all 8 commands
at 55b041 passing: Platform/Scope test compilers, compatibility, whole CLI 3,
Platform 6, Page assets 1, Native 3 and Security 12. All 17 guards pass, errors 0,
all stderr empty, no failure/skip/todo/signal/interruption. Native case times
are 3689 ms Counter declared, 3642 ms Counter Base, 3735 ms Lending Base; child
wall 18.158350083 s differs from those case durations. The Page owner ran the maintained write:false producer: assets stayed
unchanged; no separate producer/write ran. Current 23 source paths match 0 Page/0 Card
workflow filters; adding these notes creates no match. A later assets repair
would owe four Page scripts. Security 12 passed with no expectation update or
separate AST calculation; independent review/Security conclusion remains owed.

Post-BP1 END `6b6c7a92e188880c5da926a6c49698349601f844` records one
whole release-reproduction PASS at 55b041. It checks all three actual source
packet tuples plus published Grow/immutable 0.2 trust, so Lending's measured
7217583c presentation remains current. The table gives child/case durations;
no compare/apply rerun, ID/signature/trust change or publisher custody followed.

Final preflight END `dd9d3184983cb42c504f068ad6f4a78e3ea8ae8e` and ONE full
gate END `1959b58db8c7a28fdb1714b5b24cde6deeeca01c` PASS at
`be552e7639696ce4d0fd23a3494ba42d90d69381`, tree
`4ed5786b76d23d4a822ae68b5076ae5e96581739`. Only two notes differ from
55b041. The BP1 report gives all stage counts, timings and retention limits.
Earlier failures stay failed. Four final documentation checks, metadata filing
and three-promise review remain owed; root binds the note-only successor in its act.
Lending signing waits the combined R/LP1/BP1 head. Counter retains 0fcc's E1
order; no statement here reopens a signed Counter version. Packet/installation/
provisioning/physical-room/provider/frontend acceptance remains outside these runs.

## Definition and witnesses

The production definition adds up to eight live reservations. Each
holds a fixed tool reference, an opaque day label of at most ten bytes,
and the member's explicit `until`. The member opens a reservation only
when no held reservation has the same tool and day. The guard reports
`tool-day-taken`. A timed lapse ends its own reservation; it changes no
tool or other reservation.

Write `day` as `YYYY-MM-DD` in pages and agent requests. This is a
convention, not a guard. Two spellings of one calendar day are two
different slots. The scope never checks that `until` falls on `day`.
It applies no calendar, timezone or interval rule.

The production plain witness checks two spellings as distinct slots,
the named refusal on an occupied slot, and availability after both
reservations lapse without changing the tool. The retained story adds
two members and both admission orders, an expiry outside one day label,
and exact local lapse effects.

The Native Lending scenario reuses its installation and real membership
grants. Both members prepare signed requests at one head with empty
expected revisions. The first succeeds; the unchanged second envelope
must fail at the named guard without another entry. A second slot
reverses the admission order. The scenario checks each stored
reservation and the unchanged tool, then retains its independent replay.
Its Git host and clock remain stand-ins.

The browser's exhaustive refusal tables include reserve. Its existing
circulation model excludes reserve until a separate screen exposes the
reservation fields. No new screen or browser interaction enters R.

## Historical generated source

The four changed compiler contexts passed before generation. The normal
typed producer then ran once and wrote the definition JSON, pin and retained
scenario after computing all three outputs. The generated definition is
`sha256:25366d110fafc4471164ca7ae8ae85ce40729032547dc107e26b3787acc4002b`.

The existing Lending pin helper now imports `lendingSource`, calls the
maintained typed compiler and shared canonical API, and awaits
`lendingStory()`. It computes and formats all three complete outputs
before writing any file. From the repository root, run:

```sh
node --import tsx examples/lending/scripts/pin.mjs
```

The output boundary is `examples/lending/definition.json`,
`examples/lending/pin.ts` and
`examples/lending/scenarios/application.json`. The pin keeps its existing
header. The source closure includes Lending's definition and roles,
story, package/view metadata and brand declarations, with the maintained
define, bytes, contract and derive APIs. Story generation signs fixture
intents using explicit public TEST actors and checks their real
in-memory judgments and folds. It uses no release or operator signer
and starts no Native scope, browser or network service.

The whole definition/pin owner and retained-story byte owner passed after
generation. No separate test mirrors the generator.

## Historical development checks

These ordinary development checks started from
`3ee7e5909c70f9911c8c4154c922e99f21e185a9`, tree
`27ad78ba12f4a45403e2ddb746cee03a6e81a687`. The producer changed only its
three expected outputs. No version, manifest, release identifier or
signature file changed. Compatibility ran once before direct Vitest,
exited zero and left the installed bundle unchanged (`copied:false`).

`N` below is `/opt/homebrew/bin/node`. Output paths resolve under
`artroom-evidence/2026-11-14-r-reservation-development-attempt1`.
Wall times come from `/usr/bin/time -p`; case counts come from actual Vitest
JSON reports. Earlier temporary raw files remain, and the retained copies
match them byte-for-byte. This table records development, not a gate.

`L` denotes the later raw directory
`artroom-evidence/2026-11-15-r-lp1-minimal-red-attempt1`.
Its JSON results retain each exact argv, working directory, exit, wall time,
and stream hashes. LP1 rows below bind the clean `4f213e9d` head, not the
unrun descriptor repair.
`G` denotes `artroom-evidence/2026-11-15-r-lp1-green-attempt1`.
`M` denotes `artroom-evidence/2026-11-15-r-remaining-development-attempt1`.
The later GREEN and remaining-owner rows bind `eb6d6a30a4`; neither validates
the authored-package follow-up.
`F` denotes `artroom-evidence/2026-11-15-r-authored-package-followup-attempt1`.
`I` denotes `artroom-evidence/2026-11-15-r-lp1-identifiers-compare-attempt1`.
`Q` denotes `artroom-evidence/2026-11-15-r-lp1-full-gate-attempt1`.
`U` denotes `artroom-evidence/2026-11-15-r-lp1-targeted-followup-attempt1`.
`IDTOOL` is `/private/tmp/artroom-c3-open-03-identifiers-20261114.mjs`.
`ROOT` is this worktree's absolute path. `H` is the full `8d7f7f8c` head above,
and `T` is its full tree. Expand these aliases in the exact commands below.

The generated outputs and development note then committed at
`321f09ab9e7f3a060812170e55b273597e487ab7`, tree
`785c9dee6e4db0694ccdb1f9c083aed2f62123de`. The Native owner and both
control attempts used that clean head. That old documentation update changed
no production source, generated outputs, tests, dependencies or configuration.

Both control commands used `examples/lending/definition.ts` as `SOURCE`,
old text `none(reservation, ["held"], held => [` as `OLD`, and new text
`none(reservation, ["lapsed"], held => [` as `NEW`. `TITLE` was exactly
`production reservation slots compare opaque day labels and lapse without changing their tool`.
The helper copies changed only the success-cleanup line to retain raw files;
classification, fault, test assertions, runner and deadlines stayed unchanged.

`C` is `Q/controls`, the byte-exact retained historical control copies.
It includes all six original child records. Command paths retain their
original dated invocation root; `C` output citations do not claim a rerun.
Originals remain unchanged. Retain the copies for at least 30 days after
landing. The unrelated Node compile cache was not copied.


`J1` is `artroom-evidence/2026-11-15-r-lp1-bp1-identifiers-compare-attempt1`.
`B1` is `artroom-evidence/2026-11-15-r-lp1-bp1-lending-base-red-attempt1`.
`G1` is `artroom-evidence/2026-11-15-r-lp1-bp1-green-owners-attempt1`.
`RR` is `artroom-evidence/2026-11-15-r-lp1-bp1-release-reproduction-attempt1`.
Current result.json files retain exact argv/cwd/exit/wall/streams; H1/T1 below
are the full 1b091111/7db3fa84 values above, not the older H/T aliases.
Named RED uses the exact anchored quoted title retained in B1/result.json.
The whole CLI, Platform and Native owners retain their configs, Native case
allowance and worker limits. Page and Security also run whole. No case-name filter runs in GREEN.
`E=artroom-evidence`,
`PF=E/2026-11-15-r-lp1-bp1-preflight-attempt1` and
`FG=E/2026-11-15-r-lp1-bp1-full-gate-attempt1`.

| Check | Command | Exit and actual result | Output and SHA-256 |
|---|---|---|---|
| Four compiler contexts | `N node_modules/typescript/bin/tsc -p CONFIG`; configs are `examples/lending/tsconfig.json`, `examples/lending/browser/tsconfig.json`, `packages/define/tsconfig.test.json` and `packages/scope/tsconfig.test.json`, sequentially once | All four 0; stdout and stderr empty | `compiler-1.stdout.log` through `compiler-4.stdout.log` and matching stderr files, each `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Typed producer | `N --import tsx examples/lending/scripts/pin.mjs` | 0; exactly three outputs; 1.00 s | `producer.stdout.log` — `af6199b1b863abf7d5955f1cdbd19453fd9d8b2adbddb3830c3efa0c5921595a` |
| Whole Lending definition owner | From `examples/lending`: `N ../../node_modules/vitest/vitest.mjs run --config vitest.config.ts definition.test.ts` | 0; eight passed, zero failed, pending or todo; 0.86 s | `lending.json` — `bbc62e17734c133408178a0687bb591dd1530ab68eb8befe77c9e1a27e1ab99e` |
| Whole Define story and package owners | From `packages/define`: `N ../../node_modules/vitest/vitest.mjs run --config vitest.config.ts test/story.test.ts test/package.test.ts` | 0; six story and five package cases passed, zero failed, pending or todo; 0.67 s | `define.json` — `42633973cc21b3f97869bc102b1b5002597338168ec266101f27b260b19ab15a` |
| Native Lending owner | From `packages/scope`: `N ../../node_modules/vitest/vitest.mjs run --config vitest.lending.config.ts test/lending.test.ts` | 0; one whole file and one scenario passed; zero failed, pending or todo; 11.46 s | `native-lending.json` — `bee66653e695d11702574f858999e4371585e518d9ee4d8f1e9fbfbe7afdedd0` |
| Guard control attempt 1 | `N controls/held-reservation/control.retained.mjs SOURCE OLD NEW --expect TITLE -- examples/lending --config vitest.config.ts definition.test.ts`, helper path under the output directory | 2, INCONCLUSIVE; package preflight stopped before any child or mutation; 0.07 s | `C/held-reservation/control.stderr.log` — `43248b73322f0fb46fb8cf3386750a4b4739981285913fbebda1516a39833e50` |
| Corrected guard control attempt 2 | `N controls/held-reservation-attempt2/control.retained.mjs SOURCE OLD NEW --expect TITLE -- . --config examples/lending/vitest.config.ts definition.test.ts`, helper path under the output directory | 0, DISTINGUISHES; baseline eight passed; mutant six passed and two assertion failures; 2.36 s | `C/held-reservation-attempt2/control.stderr.log` — `bd0e786d652ced3298fe208bdae1684fde58e287e0d6950bee686aaa28fe834d` |
| Original composition: affected compilers and owners | Not run | UNRUN; original results above bind their named old heads only | None |
| Original composition: typed outputs and normal release reproduction | Not run | Regeneration and source/identifier correspondence OWED; merge actual LC-1 main first | None |
| Original composition: guard control, full gate and review | Not run | UNRUN; queue and later execution grant required | None |
| LP1 typed producer | `N --import tsx examples/lending/scripts/pin.mjs` | 0; 1.102256667 s; all three outputs unchanged | `L/producer-result.json` — `b022c22e182dff126bae632638104413e0a8ace693f34550fd5f4325dda9f9b5` |
| LP1 four compiler contexts | `N node_modules/typescript/bin/tsc -p CONFIG`; the same four configs listed above, in that order | All 0; 0.653721667, 0.306571792, 0.318671334, and 0.860577166 s | `L/validate-result.json` — `95a568897223f546ccc1a1daa45d31a14328b8ecd148eb11ecc56bb11f61135c`; all compiler stdout and stderr empty |
| LP1 compatibility prerequisite | `N scripts/cloudflare-pool-compat.mjs` | 0; 0.086807833 s; accepted bundle unchanged, `copied:false` | `L/compat.stdout.log` — `94d712b506adaa3b784ef817d13532e78b3fc2679a33a7252aa608bb4aa1d526` |
| LP1 whole base installation owner, actual RED | From `packages/scope`: `N ../../node_modules/vitest/vitest.mjs run --config vitest.config.ts --project scope test/base-ordinary-install.test.ts --reporter=default --reporter=json --outputFile=L/lp1-whole-owner.json` (expand `L`) | 1; 18.676032917 s; two passed, one assertion failed, zero skipped; exact Destination refusal above | `L/lp1-whole-owner.json` — `1489edd416a9cc1ded882eaa2566738296851e68cf495139005d685d0cfe2937`; `L/lp1-whole-owner.stdout.log` — `95f2c49d620c6999098a26e52fdef993337a52e47289525fe47ebf97dceaa955`; `L/lp1-whole-owner.stderr.log` — `0f6ab0dc630ba969805682fb3802e262fe735504201aa3507ad3a953c067c666` |
| LP1 same whole base installation owner, GREEN | From `packages/scope`: `N ../../node_modules/vitest/vitest.mjs run --config vitest.config.ts --project scope test/base-ordinary-install.test.ts --reporter=default --reporter=json --outputFile=G/lp1-whole-owner.json` (expand `G`) | 0; 17.385805792 s; all three passed | `G/result.json` — `029cd64837dabee9e6683386e2168f40bf3e3c0a3ed51db91ce59c9356334265`; `G/lp1-whole-owner.json` — `0f9e5dde77710a4a306a203d6799a3d1728200d65af835a38cf84bfbeb148baf` |
| Remaining whole Lending definition owner | From `examples/lending`: `N ../../node_modules/vitest/vitest.mjs run --config vitest.config.ts definition.test.ts --reporter=default --reporter=json --outputFile.json=M/lending-definition.json` (expand `M`) | 0; 0.770942542 s; eight passed | `M/result.json` — `23eb955d53dcd598fc0e6a53b87c6d39c4d1d7952857fbf22bc448cb5f027789`; `M/lending-definition.stdout.log` — `30235936995bd21b8456b3b224062bb5d2e1853adf77ce9e6a7f35b0cd628365` |
| Remaining whole Define story and package owners | From `packages/define`: `N ../../node_modules/vitest/vitest.mjs run --config vitest.config.ts test/story.test.ts test/package.test.ts --reporter=default --reporter=json --outputFile.json=M/define-story-package.json` (expand `M`) | 1; 0.652760750 s; ten passed, one direct assertion failure at `package.test.ts:10`; Native Lending unreached | `M/result.json` — digest above; `M/define-story-package.stdout.log` — `014074d87e77535b47f5bf6505e696085ae51dfb266e1a854940f570474358f9`; `M/define-story-package.stderr.log` — `e15c937ac29fbbaaf40d4358993465840d416b4f4772a16ecec36b43252375f1` |
| Authored-package compiler | `N node_modules/typescript/bin/tsc -p examples/lending/tsconfig.json` | 0; 0.343764500 s, at `563bdadcad` | `F/result.json` — `e6792b79b009a7ae56e3ff7240b95a40ed22e0ceb73b0e72e99be30d98a1dc0c` |
| Whole package owner after repair | From `packages/define`: `N ../../node_modules/vitest/vitest.mjs run --config vitest.config.ts test/package.test.ts --reporter=default --reporter=json --outputFile.json=F/define-package.json` | 0; five passed; 0.616666584 s | `F/define-package.stdout.log` — `9e1913dbaf384930b10e7d3b723b780783f4e0cfd301d0b3ecf9b7d9d0340758` |
| Previously unreached Native Lending owner | From `packages/scope`: `N ../../node_modules/vitest/vitest.mjs run --config vitest.lending.config.ts test/lending.test.ts --reporter=default --reporter=json --outputFile.json=F/native-lending.json` | 0; one passed; 10.286759500 s | `F/native-lending.stdout.log` — `9836c9dce2eaf6c4a570b3c90b14b93e25101db5152cd90f9e1208c59140525d` |
| Canonical identifiers comparison | `N --import tsx IDTOOL compare ROOT I/identifiers H T` | 0; 1.824992916 s; only Lending differs | `I/result.json` — `4cc4d30869b3d5ace36915bfeb45c103d030b40708ccd8903572a154fb5c85e2`; `I/identifiers/comparison.json` — `6ccc3145ecc1dfea03ba892d34025b3cf90245a904436c6672953f2832b2596f` |
| Normal identifier apply | `N --import tsx IDTOOL apply ROOT I/identifiers H T` | 0; 0.251109500 s; only Lending's identifier file changed | `I/apply-result.json` — `dc605e2d93e9a510cdfd581e24ff0bf5d1e39bd8ead2cf1d00824388696ed606` |
| Full gate attempt 1 at `84481fb1` | `npm run gate` | 1; 333.676312082971 s; pre-test checks and Kernel passed; Node 200 passed; Counting 56 passed; Plain 4813 passed, one failed, one skipped; Native unreached, wall unknown; Scale omitted (`outside-scale-paths`) | `Q/gate.log` — `8dc04a5aa0d81ba11889e1b22dbd7cf43a83eae2e1ce39902337dddadcc9152c`; `Q/result.json` — `5fce14773681c9ea3163ef6163733bd8268849b2ce1a57573ab737a47b56cb37` |
| Isolated CLI test compiler at `53aba95f` | `N node_modules/typescript/bin/tsc -p packages/cli/tsconfig.test.json` | 0; 0.540242750 s | `U/cli-test-compiler.log` — `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Same whole CLI application examples owner | From `packages/cli`: `N ../../node_modules/vitest/vitest.mjs run --config vitest.config.ts test/application-examples.test.ts` | 0; all three passed; 6.165756083 s | `U/application-examples-owner.log` — `7dff5073b0516b86357b6328ff5840f6a24fdbf75f2700566cf8928a8063748f` |
| Previously unreached Native phase at `53aba95f` | `ARTROOM_TEST_PHASE=native ARTROOM_TEST_TIMING=U/native.jsonl ARTROOM_SCALE_MODE=omit /opt/homebrew/Cellar/node/26.13.1/bin/node ROOT/node_modules/vitest/vitest.mjs run --config ROOT/vitest.native.config.ts` | 1; Native wall 508.723583167 s, controller 508.877585583 s; 1134 passed, one failed, two skipped (1137); files 286 passed, one failed, one skipped (288); natural Scale omit/outside-scale-paths | `U/native.log` — `064450464b6c7fd922c08d26d2e0fa182003499db5ea1eedc9e691af63f45c5f`; `U/native.jsonl` — `bc04d2d9b68b178a00fb728c1ff7f34685ac4a86b94753eb490ff7c2831d9ab8`; `U/native-result.json` — `e998af1a0eaae87635fedb382a4e3511bda91d3ef047df03a50276b0f13267e6`; actual argv/env in `U/native-descriptor.json` |
| Isolated follow-up aggregate | Compiler, whole CLI owner, then maintained Native descriptor above, sequentially once | 1; outer 515.584793499962 s; END `aa2c014f5cc8f773baa0d316b316c913853efe37`; source and status unchanged | `U/result.json` — `76b03f7d7ef68f6f96ef3a493360b06badbfe08d7438dd00f7d4b2404a7f54ba` |
| Review, artifact filing and landing under this route | Not run | UNRUN; route ends on the Native failure; E1 next without R | None |
| Post-E1 normal comparison at 1b091111 | `N --import tsx IDTOOL compare ROOT J1/preparation H1 T1` | 0; 2.210679125 s; Grow/Counter exact; Lending presentation only | `J1/result.json` — `51ac040602df50459363aaa3256b5f7aa76dc1c524dae03a543c8f89300dc8f6`; `J1/preparation/comparison.json` — `b6196f16fbe3fb8de1f59c87d63f4e435461f538ab5527c5d38d8b1340d16902` |
| Post-E1 retained apply, one commit f18 | `N --import tsx IDTOOL apply ROOT J1/preparation H1 T1` | 0; 0.251210375 s; one presentation line; no packet/signing | `J1/apply-result.json` — `0847b841785acf2767bcd3f460e7d924f13f7d2cf39981307faeca9b9542ddf7`; `J1/preparation/applied.json` — `b3b5f60e6a783cc704b3d64200fa969ccebb43c00be9f17f94d0e72f3480d696` |
| BP1 named-RED preparation at f18 | Scope test compiler, then compatibility; exact argv in `B1/result.json` | Both 0; 0.947298125/0.081532542 s; no copy/cd50 unchanged | `B1/result.json` — `0fd3d284eabb8ba72450075c4ceedc452c0454846d4d657f81b4367da2f562f7` |
| BP1 named Lending Base RED | Whole file path with exact single-case pattern in `B1/result.json`; no inferred reason | 1;query-not-ready at 80:59; 1 FAIL/2Counter SKIP; child 10.092601375 s,case 3036 ms,outer 12.660211000 s; 7 guards/0 errors | `B1/lending-base-red.json` — `eae36b2f5b516f56370dc047a94421d39282c7e6ea03b28fa17903954bae8fba`; stdout `c76ad5df576141ccf3302748637b8d60223a7b7958402e47259494b23e9ca4f8`; stderr `743b15002dee6640b9d3101d7c96ccfabbf2d120438ed91889d3b7e8952b81d8` |
| GREEN compilers/compat at 55b041 | Platform test, Scope test, compatibility; exact argv in `G1/result.json` | All 0; 0.392792541/0.902403125/0.079725958 s; no copy/cd50 unchanged | `G1/result.json` — `0ac31728aa7b59154d165832e17e2d19355623c11c435241ab549c2875eda423` |
| GREEN whole CLI owner | `packages/cli/test/application-examples.test.ts`; actual argv in result | 0; 3 PASS/6.452862417 s | `G1/cli-application-examples.json` — `3deb537cf3f01ff1b4b8fc80efb971ccde6d0faadceef8ab4f365121c9d45fda` |
| GREEN whole Platform owner | `packages/platform/test/application-install-v2.test.ts`; actual argv in result | 0; 6 PASS/1.550388917 s; 15-pin matrix is one case, not 15 cases | `G1/platform-application-install-v2.json` — `077264faad670d923d87616bb9409ee200152add400d4c3d9ed57817a1127880` |
| GREEN whole Page assets owner | `apps/room/page/test/assets.test.ts`; actual argv in result | 0; 1 PASS/0.733151083 s; maintained write:false producer correspondence; assets unchanged; no separate producer/write | `G1/page-assets.json` — `b3cb3c9bf6edeecea2fc089fd7fe913aa7769c3ae829370b24bda00149e487fc` |
| GREEN whole Native owner | `packages/scope/test/maintained-application-projections.test.ts`,scope project; actual argv in result | 0; 3 PASS/18.158350083 s; both Base metadata assertions pass; negative controls ONLY Lending Base | `G1/scope-maintained-application-projections.json` — `08aef481b6793cabb9eb9700038e9f833714db0a112002e217588a80e70585cf` |
| GREEN whole Security owner/aggregate | `N --test scripts/security-entry-points.test.mjs`; eight commands sequentially once | 0; 12 PASS/3.994228458 s; outer 33.146512875s; 17 guards/0 errors; no failures/skips/todo/signal/interruption; all stderr empty | `G1/security-entry-points.stdout.log` — `f55e2a77f2ededd760e53dd52b251ea62416e3ad0fe14044647d9fdfb2fe5b9f`; aggregate result hash above |
| Post-BP1 whole release-reproduction owner at 55b041 | Whole existing CLI release-reproduction owner; exact argv in `RR/result.json` | 0; 1 PASS/2.794627542 s; case 1734.553875 ms; 0 fail/skip/todo,stderr empty; current three tuples/Grow/immutable 0.2 trust correspond | `RR/result.json` — `7705f469c12f0ca993916c2203f2a630f71ecc4f90934b03c6a9a4035aff2cdf`; `RR/reproduction.json` — `e3055aa74967446ac4a207a61982229a40b999b0cf937b52b93ce94b25620f0b` |
| Current preflight at be552e76 | Fetch, helpers, whole typecheck; exact argv in result | All 0; 0.436369208/0.642846917/16.062253500 s; outer 17.731247542 s. A prior placeholder-START argument refusal ran no fetch/project command and created no raw output | `PF/result.json` — `287575fab219960f5e69c2ede6b530010fa548b6358e221fa9190ddc51a75ada`; refusal receipt and full facts in BP1 |
| Current ONE full gate at be552e76 | `npm run gate`; actual argv in result | 0; child 832.331575125 s, outer 832.636939166 s; all stages PASS, natural Scale OMIT. Full counts/partial-timing limits in BP1 | `FG/result.json` — `6ce12b921662fb26bfc5746102f4de581cd2bb07c992cf2c498e256cf7fde581`; `FG/gate.log` — `9eb67d9ba5165d4bf4857d2aabc0e7c6752fe0556b651d33895621a330f6ef83` |
| Final documentation checks, metadata filing and independent review | Not run | UNRUN; both BP1 readers still need independent Security review; planner release disposition remains owed | None |


Both plain runs and the Native run had empty stderr. The producer's only
stderr was the Node `DEP0205` deprecation warning. The dedicated Native
configuration retained its existing one-worker, no-isolation and 30-second
test allowance. It exercised real scopes and SQLite; the Git host and clock
keep their stand-in limits described above.

Attempt 1 used the wrong package argument: `examples/lending` has no
`package.json`. Its inconclusive verdict and raw output remain unchanged;
it provides no guard evidence. Attempt 2 used the repository root as its
package boundary and the existing Lending config as its test root. Both
whole-owner reports have eight cases. The mutant failed the required
production assertion at `definition.test.ts:113`: it wrote the occupied
reservation instead of returning `guard-failed` with `tool-day-taken`.
The expected companion assertion at line 127 also detected the changed
definition bytes. That pin failure alone would not establish admission
protection; the production refusal failure supplies that distinction.
No other case failed, cancelled or skipped, and no load or runtime error
occurred. Source bytes restored exactly to SHA256
`cb17d224d6ad6518f1ad8dfe2bf15e2db0604ac0d5c52c48830be0f42bb20eee`
and mode `0644`. No third green run or generated pin rewrite occurred.

The original R results above bind their historical heads. The later LP1
rows retain the producer, four compilers, and publication RED at `4f213e9d`,
then actual GREEN and the package-correspondence failure at `eb6d6a30a4`.
The subsequent `F` rows validate the authored-package repair at `563bdadcad`.
The `I` rows establish identifier correspondence and apply at the named
published-main checkpoint. Gate 1 and the separate targeted follow-up both
remain FAIL. The compiler and whole CLI owner passed; Native's sole refusal
assertion failure ended this route. No passing gate, review or combined
acceptance follows.

## Release boundary

Signing END `196d99b7f64167effbe5e745b0d797ece5189d11` records signed
Lending and Counter `0.2.0` at main `57f887ce`. LC-1 owns their kept packet
paths, trust rows, bucket binding, formatter exclusions and version-aware
reproduction checks. R adds none of those files. It also adds no copied
`0.2.0` identifier baseline, `public.ts` or Counter `release.ts`.

R owns the reservation, scenario, `0.3.0` version raise, and new Lending
identifiers. The later producer and comparison above leave typed outputs,
Grow, and Counter unchanged. No TEST signature or TEST release digest enters
source. Ruling `bdeb6c15` originally placed signing after R lands. Later
ruling `0fcc2ec547a1ac3116abf8ebf81bb8f8bc3466c3` superseded that order:
both `0.3.0` releases stay open through E1, with normal three-way comparison
and Grow `2.0.0` unchanged. R's failed Native follow-up now sends E1 first
without R under `c637f63f`. Latest ruling
`841b79030689a4b6d3c9d8f4092905c790dbc7ce` permits Lending `0.3.0` signing
only after both E1 and R with LP1 have landed. Counter's `0fcc` rule stands.
A later packet head keeps the installed `0.2.0` row. R performs no signing,
packet copy, provisioning, installation or deployment. This source establishes
no release or passing gate result.
