# R: tool-library reservation

Request `5b5b6896fc6cb6507e4e1fab4b2639f8b0157633` and promise
`f68dd9c48d6d54874c20a7f168b59be1c1a45efb` track this work.
Planner ruling `02d4942afa12d67762bafd9d278ea6d575dac82c` sets the
day semantics below.

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

## Generated source

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

## Development checks

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
control attempts used that clean head. This documentation update changes
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

Canonical release packaging, release signing, version raise and the full
gate remain **UNRUN**. The 19 plain development cases, one Native scenario
and guard distinction do not replace that gate or determine release IDs.

## Release boundary

Lending remains at version `0.2.0`. Its new definition pin is distinct from
the committed canonical release identifiers, which remain unchanged, as do
the manifest and release signatures. Canonical release preparation waits
for NF5's actual main inputs and the planner's signing order. Raise the
version and run the gate only after the planner signs Lending `0.2.0`, as
the request requires. No landing or deployment follows from these checks.
