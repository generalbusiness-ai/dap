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
versions, and Counter stay unchanged. Validation of this authored-package
repair is **UNRUN**. Package correspondence must pass before canonical
identifier work. Native Lending, normal reproduction, current identifiers,
the full gate, and review remain owed.

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
`/Users/hughpyle/play/artroom-evidence/2026-11-14-r-reservation-development-attempt1`.
Wall times come from `/usr/bin/time -p`; case counts come from actual Vitest
JSON reports. Earlier temporary raw files remain, and the retained copies
match them byte-for-byte. This table records development, not a gate.

`L` denotes the later raw directory
`/Users/hughpyle/play/artroom-evidence/2026-11-15-r-lp1-minimal-red-attempt1`.
Its JSON results retain each exact argv, working directory, exit, wall time,
and stream hashes. LP1 rows below bind the clean `4f213e9d` head, not the
unrun descriptor repair.
`G` denotes `/Users/hughpyle/play/artroom-evidence/2026-11-15-r-lp1-green-attempt1`.
`M` denotes `/Users/hughpyle/play/artroom-evidence/2026-11-15-r-remaining-development-attempt1`.
The later GREEN and remaining-owner rows bind `eb6d6a30a4`; neither validates
the authored-package follow-up.

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

| Check | Command | Exit and actual result | Output and SHA-256 |
|---|---|---|---|
| Four compiler contexts | `N node_modules/typescript/bin/tsc -p CONFIG`; configs are `examples/lending/tsconfig.json`, `examples/lending/browser/tsconfig.json`, `packages/define/tsconfig.test.json` and `packages/scope/tsconfig.test.json`, sequentially once | All four 0; stdout and stderr empty | `compiler-1.stdout.log` through `compiler-4.stdout.log` and matching stderr files, each `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Typed producer | `N --import tsx examples/lending/scripts/pin.mjs` | 0; exactly three outputs; 1.00 s | `producer.stdout.log` — `af6199b1b863abf7d5955f1cdbd19453fd9d8b2adbddb3830c3efa0c5921595a` |
| Whole Lending definition owner | From `examples/lending`: `N ../../node_modules/vitest/vitest.mjs run --config vitest.config.ts definition.test.ts` | 0; eight passed, zero failed, pending or todo; 0.86 s | `lending.json` — `bbc62e17734c133408178a0687bb591dd1530ab68eb8befe77c9e1a27e1ab99e` |
| Whole Define story and package owners | From `packages/define`: `N ../../node_modules/vitest/vitest.mjs run --config vitest.config.ts test/story.test.ts test/package.test.ts` | 0; six story and five package cases passed, zero failed, pending or todo; 0.67 s | `define.json` — `42633973cc21b3f97869bc102b1b5002597338168ec266101f27b260b19ab15a` |
| Native Lending owner | From `packages/scope`: `N ../../node_modules/vitest/vitest.mjs run --config vitest.lending.config.ts test/lending.test.ts` | 0; one whole file and one scenario passed; zero failed, pending or todo; 11.46 s | `native-lending.json` — `bee66653e695d11702574f858999e4371585e518d9ee4d8f1e9fbfbe7afdedd0` |
| Guard control attempt 1 | `N controls/held-reservation/control.retained.mjs SOURCE OLD NEW --expect TITLE -- examples/lending --config vitest.config.ts definition.test.ts`, helper path under the output directory | 2, INCONCLUSIVE; package preflight stopped before any child or mutation; 0.07 s | `controls/held-reservation/control.stderr.log` — `43248b73322f0fb46fb8cf3386750a4b4739981285913fbebda1516a39833e50` |
| Corrected guard control attempt 2 | `N controls/held-reservation-attempt2/control.retained.mjs SOURCE OLD NEW --expect TITLE -- . --config examples/lending/vitest.config.ts definition.test.ts`, helper path under the output directory | 0, DISTINGUISHES; baseline eight passed; mutant six passed and two assertion failures; 2.36 s | `controls/held-reservation-attempt2/control.stderr.log` — `bd0e786d652ced3298fe208bdae1684fde58e287e0d6950bee686aaa28fe834d` |
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
| LP1 authored-package repair and later release checks | Not run | Compiler and package correspondence UNRUN; no canonical IDs before correspondence passes; Native Lending, reproduction, gate, and review owed | None |

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
They do not validate the authored-package follow-up. Its compiler and
correspondence check, plus the unreached Native owner, remain **UNRUN**.
Release reproduction, identifiers, full gate, and review remain owed.

## Release boundary

Signing END `196d99b7f64167effbe5e745b0d797ece5189d11` records signed
Lending and Counter `0.2.0` at main `57f887ce`. LC-1 owns their kept packet
paths, trust rows, bucket binding, formatter exclusions and version-aware
reproduction checks. R adds none of those files. It also adds no copied
`0.2.0` identifier baseline, `public.ts` or Counter `release.ts`.

R owns the reservation, scenario, `0.3.0` version raise and later new
identifiers. After merging actual LC-1 main, the maintained typed producer
must regenerate the three outputs if their inputs changed. The normal
canonical preparation path must then measure current Lending, Counter and
Grow identifiers. Any unexpected Grow or Counter identifier change returns
to the planner before application. No TEST signature or TEST release digest
belongs in source.

Stop at the computed Lending `0.3.0` identifiers for the planner's signing
decision. Ruling `bdeb6c15` places signing after R lands; a later small head
adds the signed `0.3.0` packet and row while keeping the installed `0.2.0`
row. R performs no signing, packet copy, provisioning, installation or
deployment. The current source checkpoint establishes no release or gate
result.
