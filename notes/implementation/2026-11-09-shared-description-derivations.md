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
Its manifest retains both exact pre-edit files. Neither document has
changed. No regeneration has run, so this checkpoint makes no
regeneration or byte-equality witness claim.

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

## Final evidence

Source and metadata preparation only. The APFS dependency copy returned
0. Its original setup returned 1 because the bin guard wrongly excluded
owned workspace commands under packages. A separate metadata follow-up
returned 0 without repeating the copy. The owned checkout has 14
workspace links, 48 export aliases, 17 bin entries, and 162 verified
copied tool files.

Root's source-seal metadata producer returned 0. The independent audit
returned 0 and preserves every setup outcome. The curated unit contains
only public-safe metadata and the original document bytes. Only that
new unit is read-only; the original temporary receipts remain untouched.

No application compiler, test, document regeneration, browser, build,
control or gate has run for this head. The source-seal parser is a
metadata operation, not an application validation result.

[Source metadata manifest](evidence/2026-11-09-t0b-source-metadata.manifest.json)
records the exact receipts, sources, and hashes.

| Check | Command or boundary | Exit | Output digest |
|---|---|---|---|
| Portable descriptions | Complete client describe owner | Not run | Pending |
| MCP integration | Complete MCP describe and inventory owners | Not run | Pending |
| Browser API boundary | Complete CLI browser-boundary owner | Not run | Pending |
| Existing CLI wording | Retained Native CLI story assertions | Not run | Pending |
| Document generation | Actual lane reference and formatted MCP tool-list bytes against saved originals | Not run | Pending |
| Source seals | Actual maintained producer; all other table and assertion bytes unchanged | 0 | See source metadata manifest |
| Page production asset | Maintained build if the moved dependency changes the served module | Not run | Pending |
| Final gate | One npm run gate at the final source | Not run | Pending |

## Open limits

Request 260991d8 owns validation, the byte-identity witnesses, source
seals, review and landing. Before its final gate, merge current main and
retain the shared seal table exactly as main has it. The candidate
starts from A's frozen review head and merges its
landed main commit 64be0cab in ordinary merge 9256f2de.

The moved browser dependency may change the generated Page module even
when its visible words stay the same. Root owns the booked maintained
Page build and any resulting generated-asset path. If that asset changes,
the head also needs the Page browser workflow at its own source commit.
No Page asset is rebuilt in this source checkpoint.

The DX-T0 parent 6f87a4e3 stays open for its typed browser-model head.
Request d5fa31c9 later reuses these shared derivations for its typed
client methods and expressions. This head makes no deployment or live
acceptance claim.
