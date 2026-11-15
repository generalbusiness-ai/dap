# R: tool-library reservation

Request `5b5b6896fc6cb6507e4e1fab4b2639f8b0157633` and promise
`f68dd9c48d6d54874c20a7f168b59be1c1a45efb` track this work.
Planner ruling `02d4942afa12d67762bafd9d278ea6d575dac82c` sets the
day semantics below. Canonical ruling
`bdeb6c151cd25e6b13259f6d6a48070dc3719723` grants this source composition,
sets Lending to `0.3.0`, and moves packets, trust rows and the content bucket
to LC-1 request `91829f2e`. It supersedes retired ruling `b2654766`.

## Current source composition

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

The authored package and descriptor now both say `0.3.0`. Counter remains
`0.2.0`. No producer, packer or identifier calculation ran on this branch.
The carried `definition.json`, `pin.ts` and `scenarios/application.json`
remain the dated outputs of original R commit `321f09ab9e`; regeneration
and byte correspondence are **OWED** at the later executable boundary.
Current release identifiers remain main's old values. They do not claim
that the new version or reservation source reproduces those identifiers.

All validation in this composed worktree is **UNRUN**. The table preserves
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
| Current composed source: affected compilers and owners | Not run | UNRUN; original results above bind their named old heads only | None |
| Current typed outputs and normal release reproduction | Not run | Regeneration and source/identifier correspondence OWED; merge actual LC-1 main first | None |
| Current guard control, full gate and review | Not run | UNRUN; queue and later execution grant required | None |

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

Those historical results do not validate this composed head. Current
compilers, affected whole owners, guard control, typed regeneration,
normal reproduction and the full gate remain **UNRUN**.

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
