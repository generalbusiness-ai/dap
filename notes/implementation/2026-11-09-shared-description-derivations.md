# Share the declaration descriptions

Request 260991d8, promise b1536885. This is head B of coverage report
b8b6248d under DX-T0 6f87a4e3. Placement 176190ba and A's review request
96041272 permit B to start from A's frozen source 61dc5d2f, tree
af81f18beb67c8caf894a3e076a5d6381c71355c.

## What changed

The client now owns the five description derivations: actSentence,
typeWords, fieldLines, guardSentences and actInputSchema. The complete
portable module moved with its private helpers, complete-description
composition and schema helpers. Splitting those functions would leave
the same guard, operand and field logic in two packages.

The platform mark text and refusal descriptions moved to
packages/client/src/mark-descriptions.ts. Its table, version expansion,
own-property checks and fallback text remain exact copies. The client
already depends on the bytes and platform packages. This head adds no
package dependency and imports no MCP service or Node adapter into the
client.

The existing MCP describe and marks modules forward every previous
public export from the client. The MCP service, catalogue, errors and
view consumers retain their existing imports. Their integration cases
remain at that boundary. The pure contract guard, operand and part
totality case moved to the client with its full title and every assertion
unchanged.

CLI browser helpers now forward the client's describeActLine as their
existing describe export. They also use the shared grantAction when
listing held acts. The compact line keeps the current CLI text,
including its existing article and grant wording. Common act, grant,
field and type helpers own both display formats. No generic description
algorithm remains in the CLI module.

The new compact-line case fixes the current output at the portable
boundary. The existing browser bundle case also requires the shared
client description module and excludes MCP runtime inputs. All existing
MCP integration and Native CLI story assertions remain unchanged.

## Decisions and why

MCP descriptions include caller standing, whole guard sentences and
closed schemas. CLI compact lines state only the declared requirement.
The CLI adapter keeps that distinction. It supplies no standing claim
and judges no guard. Its compact formatting uses the same step, grant
and field derivation helpers as the full text.

The full format remains the default for typeWords and fieldLines. The
compact format is an explicit adapter choice. The MCP guards, unknown
guard label, schema construction, tool-description bound and omitted
guard pointer retain their existing code. A's shared expected-revision
helper and its prototype-safe subject resolution remain unchanged.

Both description modules remain portable. The mark module reads the
existing platform version table. It derives documentation, not
authority. No kernel, definition, pin, canonical byte or scope rule
changes in this head.

Before any source edit, the builder copied the two committed document
files and recorded their byte counts and hashes:

| Document | Bytes | SHA-256 |
|---|---:|---|
| docs/lanes-reference.md | 139830 | 1b1272ba17778b79cac8e351196e206e6473594fb8da36d064ccde11a2a79b04 |
| docs/mcp-tools.json | 262660 | 4e18d71826d10cd3d8ab64f507ee59e5a69dc740185348988143488098659b64 |

The durable baseline is
/Users/hughpyle/play/artroom-evidence/2026-11-09-t0b-source-metadata/unit/baseline.
Its manifest retains both exact pre-edit files. Neither document changed. The booked document witness regenerated both
files into fresh evidence and compared their actual bytes with those
originals. Both comparisons passed without rewriting a document.

The MCP inventory case currently compares canonical JSON. That protects
the listed tools' meaning but does not establish byte equality. The
booked witness must generate the same formatted tool list into a new
scratch output and compare its actual UTF-8 bytes with the original
baseline. The lane reference witness must use its maintained generator
and the same exact comparison. A differing generated file fails the
witness. Rewriting the committed document does not repair it.

The CLI browser helper already has a whole-file source seal. Its moved
algorithm needs protection in the new shared owner as well. Root ran
the maintained sourceSeal with the pinned Rolldown parser
after checking its result against the exact landed A/main CLI blob.
The candidate table changes the CLI row and adds the two portable
owners. An independent line comparison confirms that every other
table byte and assertion remains unchanged. Commit 0ee5b70a adopts
the actual output. No guessed hash enters the table.

## Bind catalogue data below the Platform boundary

Ruling f917e28d accepts the explicit-catalogue repair. The active-source
boundary permits only exact Client application wrappers to import
Platform. The first moved mark module fell outside that boundary.
Its successful focused run did not include the active-source owner.

Client now exports descriptionsOf(catalogue) and the structural
MarkCatalogue type. Seven description helpers and the three mark
members close over that supplied metadata. Nested guard and schema
recursion retain the same binding. Client holds no native catalogue,
registration, setter, shipped-pin copy, or refusal snapshot.

The private MCP description-context.ts adapter reads actual VERSIONS
once. Object.entries/fromEntries projects only own pin/rule records and
their existing readonly refusal values. It passes no callable rule to
Client and invokes no rule callback. The two legacy MCP modules expose
the same 27 description names and three mark names through direct bound
members and independent forwards. The MCP barrel does not export the
adapter. CLI compact wording uses one empty catalogue inside Client.

The existing own-definition and own-rule checks remain. BY_NAME now
also requires an own wording row because an explicit catalogue may
contain prototype-like names. Exactly one new case binds two distinct
catalogues side by side, checks each through a nested sentence, and
requires the unknown fallback for an own constructor@1 entry and the
Object constructor's own name key. A shared last-binding variable or
an inherited BY_NAME row would change those expected answers.

The pure totality title and assertions remain unchanged, bound to an
empty catalogue. All existing MCP and CLI assertions remain unchanged.
The next booked focus must include the whole active-source owner.
The binding repair now has actual source-seal metadata and one bounded
guard control at 6869a035, tree 769324fbbaa4c6b575509776687687fcfe116a53.
Full integrated compiler, focused-test, document, Page and gate witnesses
remain due after actual BR13 main integration.

Producer END 9e7e1275625b2cd4957897c7e53046f44fcc0fed records actual exit
0. The maintained parser matched both old Client seals against immutable
374ab615 source before deriving two changed Client values and one new
private MCP adapter value. The independent audit confirms that every
other table byte and assertion stays exact.
[Binding source-seal manifest](evidence/2026-11-10-t0b-explicit-catalogue-seals.manifest.json)
records those results. Root adopted the exact proposed table in normal
commit d25554e49358cb1a399a532c512c44d20d645b80. Every other production
and test blob remains identical to 6869a035.

Control END d043dfa8bdc15f9b058aa49ae3554b42ea11ff2a records the one
maintained BY_NAME control. The whole three-case owner passed unchanged:
actual child exit 0, three passed. Replacing the single own-row condition
with true produced actual child exit 1: two passed and the named case
failed by the intended AssertionError. The inherited Object name differed
from the literal unknown-mark fallback. The maintained control, driver
and launcher each returned 0. The maintained control restored the exact
source bytes, and the outer runner rewrote nothing. All source/tool
fences passed and all owned process groups closed naturally.
[Own-row control manifest](evidence/2026-11-10-t0b-by-name-control.manifest.json)
retains every case identity, status and actual exit.

The first metadata sealer returned 1 because it compared the original
relative cwd, packages/client, with an absolute path. Its separate
metadata follow-up resolved that unchanged cwd under the frozen root
and returned 0. No test or control body reran. The audit history retains
both metadata outcomes.

The public units expose safe summaries and hashes. Private archives keep
the complete original buffers, reports, source copies and remaining
cache files through at least 2026-12-10. The curated units and private
archives are read-only. All original raw evidence remains untouched.

The earlier a52690e7 and 0ee5b70a witnesses below remain historical.
They do not establish the explicit-catalogue repair's integrated results.

Before the final gate, check the format step on every touched JSON file
and check every added package subpath against the Counter and Lending
alias maps. Integrate actual BR13 main with preserved history, refresh
the owned dependency and runtime-package inputs, and regenerate the
original document and Lending catalogue bytes without accepting rewrites.

## Final evidence

The original source preparation used an APFS dependency copy that returned
0. Its original setup returned 1 because the bin guard wrongly excluded
owned workspace commands under packages. A separate metadata follow-up
returned 0 without repeating the copy. The original dependency view had 14
workspace links, 48 export aliases, 17 bin entries, and 162 verified
copied tool files.

Root's source-seal metadata producer returned 0. The independent audit
returned 0 and preserves every setup outcome. The curated unit contains
only public-safe metadata and the original document bytes. Only that
new unit is read-only; the original temporary receipts remain untouched.

The focused compiler, test, and document results below cover exact
source a52690e7, tree a0a63c0e997d7b412fb503291dac4cb084763bec.
The source-seal parser remains a separate metadata operation. The
retained Native CLI story, Page browser workflow for the final integrated
source, and final gate remain pending.

[Source metadata manifest](evidence/2026-11-09-t0b-source-metadata.manifest.json)
records the exact receipts, sources, and hashes.

| Check | Command or boundary | Exit | Output digest |
|---|---|---|---|
| Portable descriptions | Complete client describe owner, 2 cases | 0 | See focused manifest |
| MCP integration | Complete MCP describe and inventory owners, 13 cases | 0 | See focused manifest |
| Browser API boundary | Complete CLI browser-boundary owner, 1 case | 0 | See focused manifest |
| Existing CLI wording | Retained Native CLI story assertions | Not run | Pending |
| Document generation | Actual lane reference and formatted MCP tool-list bytes against saved originals | 0 | Original hashes above |
| Source seals | Actual maintained producer; all other table and assertion bytes unchanged | 0 | See source metadata manifest |
| Security inventory | Complete Node owner, 12 cases | 0 | See focused manifest |
| Compiler closure | 26 unique affected contexts | 0 | See focused manifest |
| Page production asset | One maintained npm run build --workspace @generalbusiness/dap-page | 0 | See Page build manifest |
| Final gate | One npm run gate at the final source | Not run | Pending |

The maintained Page build ran once at bbbadc4080, tree
6d92cc072623cd7f77c84e8f3ac183b6d9d2167a, under booking ea2f6439.
The actual build, inner runner, outer driver, and launcher exits each
read 0. The independent metadata audit returned 0 and confirms that
only apps/room/page/assets.ts changed among tracked files. All other
source, tools, and lock bytes stayed fixed, the four required dist
leaves matched their receipts, and the owned process group closed.

The generated asset has 2377462 bytes and SHA-256
bf8f50411467d86d35142f36f31a9fe63ae7535bc4b636b2e9d49b66eab0f80a.
[Page build manifest](evidence/2026-11-09-t0b-page-build.manifest.json)
retains the actual exits, output hashes, guards, and source receipts.
Only the curated unit is read-only. The original raw run and its
unpublished temporary Node compile cache remain untouched. This build
provides no browser workflow or gate result.

The sequential focused body ran once under booking 6ea9884c. Its Node,
focused pipeline, document capture, inner driver, and outer launcher
exits each read 0. All 26 compiler invocations and the plain test command
returned 0. An independent audit reconciles all 12 Node titles and all
16 plain cases against the static ledger, public reporter, and built-in
JSON. Every case passed exactly once.

The document capture produced exactly 139830 lane-reference bytes and
262660 MCP tool-list bytes. Their SHA-256 values equal the original
hashes above. The witness uses the maintained lane generator and the
kept MCP catalogue fixtures with the same Prettier formatting. Those
fixtures establish document bytes, not Native authority or live
acceptance.

[Focused validation manifest](evidence/2026-11-09-t0b-focused.manifest.json)
retains the actual exits, all 27 pipeline commands, full case records,
source fences, and both generated documents. All 4463 tracked paths
stayed fixed throughout the body, and every owned process group closed.
Only the new curated unit is read-only. The original raw run and its
temporary files remain untouched. The original 9d2e5fa4 follow-up changed only the note
and evidence manifest. Its runtime source stayed at a52690e7.

## Open limits

Request 260991d8 owns validation, the byte-identity witnesses, source
seals, review and landing. Before its final gate, merge current main and
retain the shared seal table exactly as main has it. The candidate
starts from A's frozen review head and merges its
landed main commit 64be0cab in ordinary merge 9256f2de.

The moved browser dependency changed the generated Page module.
The earlier a52690e7 commit adopted the maintained output. The final
integrated source still needs its Page browser workflow and final gate.

The DX-T0 parent 6f87a4e3 stays open for its typed browser-model head.
Request d5fa31c9 later reuses these shared derivations for its typed
client methods and expressions. This head makes no deployment or live
acceptance claim.
