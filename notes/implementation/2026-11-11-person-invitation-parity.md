# Person invitation parity

JP1 gives Start, the command line, and MCP one person-invitation parser.
Each surface requires an explicit supported Membership pin. The parser
removes terminal service slashes before the link digest and pending
comparison. Configured surfaces pass their expected service. A fresh CLI
or empty local MCP server learns the normalized service from the link.

The command line keeps `linkOf`, `LINK`, and `Link` as aliases of the Client
owner. It checks a pending join before it reads private custody or obtains
a key. Submission and settlement forward the retained signed envelope
without constructing a signed-read handle. The CLI creates that handle
only after acceptance, then checks the exact admitted entry.

A shared six-row table exercises the actual Start, pending CLI, and
configured MCP entries: valid, missing pin, terminal service slash,
another service, and malformed text. The sixth row covers fresh CLI
discovery. Scripted CLI and MCP refusals prove encoding admission and
dispatch, without proving Native membership acceptance. The Native CLI
owner keeps its three restart scenarios and names its Membership pin
explicitly.

A pending join saved by an earlier build with a terminal slash in its
service stays retained and fails comparison. JP1 changes no saved request,
historical link, or original signature. Both production person-link
writers already include the Membership pin. Existing private-request,
URL, seed, supported-version, recovery, and real-scope assertions remain.

## Evidence at the exercised checkpoints

Validation exercised source through `b614c87d`, tree `48479bcd`.
The [evidence manifest](evidence/2026-11-11-person-invitation-parity.manifest.json)
indexes 30 public metadata files in
`/Users/hughpyle/play/artroom-evidence/2026-11-12-jp1-b614-final-public-8726d6cf`.
Its SHA-256 is
`88ed2aaa7f4b76c596a85db359046197cc7922858d1fb90903ed389f776f0b20`.
The aggregation exited 0 and retained every original's bytes, identity,
mode, and timestamps. The table names each original checkpoint; it does
not relabel older runs as b614.

A sealed descriptor identifies an existing unit and its private custody.
Its digest is not a raw stdout digest. `CURATED_PROVENANCE` identifies
selected producer or working-check metadata, not the original command
output. Ordinary raw logs remain plain and external. The aggregate copies
only selected public metadata and preserves private archive locators;
it does not copy older private payloads.

| Check | Command or operation | Actual exit | Indexed metadata and SHA-256 |
| --- | --- | --- | --- |
| Ordinary checks and affected compilers at their checkpoints | `Five checks at 1b; 26 compilers at bab; five checks and 14 affected compilers at bd; five checks at b614` | 0 each | CURATED_PROVENANCE: `provenance/ordinary-working-curated.json` — `8ae42cf139643b073e24f5792806bd2873ca921a9f57ed0be80e63f2d1e933ed` |
| Initial maintained AST records at 1b974a44 | `Maintained AST producer; 41 records` | 0 | producer result metadata: `producers/ast-original41-actual.json` — `569610cb59425775a508bdaca885737c568c3578a5bf4fafb1d542abcac06d3d` |
| CLI repair AST records at bd206adc | `Maintained AST producer; five records` | 0 | producer result metadata: `producers/ast-lazy-cli5-actual.json` — `b697451d407fad83e420de09168fdcf336c8506cbebe43ff59aeb103e202b101` |
| Page build at 1b974a44 | `npm run build --workspace @generalbusiness/dap-page, once` | 0 | CURATED_PROVENANCE: `proofs/page-served-dist-custody.json` — `180c06174ead90bcc25df6fe0edb38dec4f47ea0c6029981474c915b426bf11a` |
| Card and maintained document producers at babfb07a | `Card writer, six-definition comparison, maintained-applications capture; once each` | 0 each | CURATED_PROVENANCE: `proofs/remaining-producers-reconciliation.json` — `d2826e8ab660e4b7c4a5def4fdc33a5dafcd631a45645be22f20e8a083cc21dc` |
| Initial focused owners at babfb07a | `Reviewed focus62: Node27 passed; Plain8 passed/1 failed/1 skipped/18 unfinished/3 unrun; Native4 UNRUN` | controller 1 | sealed descriptor: `units/focus62-failed/manifest.json` — `280c3521db42afed29b21867cb97f175219f604d21303d98d0788b99d530447c` |
| First continuation at cb79e7fa | `Reviewed continuation51: Node24 passed; Plain23 and Native4 UNRUN after metadata refusal` | controller 2 | sealed descriptor: `units/continuation51-refused/manifest.json` — `0d1cfa8ed9d374fdc2e726775ef2a23ff318559a9f55b09b60f307f4fa985628` |
| Remaining owners at cb79e7fa | `Reviewed continuation27: Plain23 and Native4 passed; no Node or compiler repeat` | 0 | sealed descriptor: `units/continuation27-passed/manifest.json` — `5c0719e30713c11c4630e90ce608d17a86ed8270959289e7f591cb39db8a4a89` |
| Full gate at b614c87d | `npm run gate through the reviewed driver` | 0 | sealed descriptor: `units/full-gate/manifest.json` — `1b07f1318eb6c62ae260b1022932f07069eaddc3af930086ad244dff5bafc73c` |
| First control window at b614c87d | `Reviewed controls963; Page child only, MCP UNRUN` | child 1; controller 2 | sealed descriptor: `units/page-control963-failed/manifest.json` — `7f0e01308cfd356b5753874ab6f589be9f9db118fd34e8b4ec78df7ea5bf0613` |
| MCP-only continuation at b614c87d | `One whole errors.test.ts owner: 18 cases, 17 passed, one named assertion failure` | child 1; controller 0 | sealed descriptor: `units/mcp-only/manifest.json` — `bdfc35d1f5dba0ac6e736a939868e0cbcae7f9adc06f130233356cfd924c3258`; independent custody: `proofs/mcp-only-independent-custody-readback.json` — `5c47c9c48d398ec11df0c0aacd851f6e850b25c4a66cc9f2495ccb67fde732c0` |

The full gate selected 5,900 cases in 713 owners: 5,897 passed and three
planned skips remained. It completed 45 compiler contexts and 16 typecheck
scripts. All 117 wrapper records remain UNKNOWN. The selector omitted six
Scale cases; none counts as executed or passed. The planned all-skipped
Page screenshot module retains null duration and partial timing. The gate
receipt measured 890.460447 seconds. Source and tool fences stayed exact,
cleanup closed, and the complete analyzer reconciled selected identities
and outcomes. `units/full-gate/terminal-summary.json` retains those counts
and timing qualifications.

The first focus failed on a valid pending CLI join: an unused early
signed-read handle caused a second key read before refusal. The repair
keeps the original assertion and creates that handle only after an
accepted or settled fact. The first continuation then accepted Node24 but
refused before its Plain body because its source metadata used the wrong
schema. The corrected continuation ran only Plain23 and Native4. These
partial observations stay separate from the later complete gate.

Controller `96372c4e` exited 2 because its Page classifier expected the
business-error sentence. The raw default reporter and built-in JSON
instead show the intended resolved-promise failure at
`join.test.ts:55:53`: one failed case and one passing case, with child exit
1. The failed archive preserves the reports, mutation, and restoration.
Planner ruling `cd42bc3d` retains that Page observation for checker
judgment. The original controller, outer, launcher, and external exits
remain 2; this window did not pass. No Page or positive body repeated.

The separate MCP-only continuation distinguished the expected-service
mutation: 18 cases, 17 passed, and one named assertion failure at
`errors.test.ts:442:35`. Its child exited 1; the controller, outer,
launcher, and external process exited 0. Independent custody readback
confirmed the sealed members, hashes, modes, original identities, and
literal-link metadata. This pass does not change the failed Page unit.
`units/mcp-only/terminal-summary.json` preserves raw RSS status failed,
two samples, zero Node/workerd rows, no sampling errors, and separately
accepted UNKNOWN admission. These samples supply no lifetime upper bound.

Page built once and produced the committed 2,435,761-byte asset, SHA-256
`bf797b1c6a34828ef0a8da7da79ed95d35faab1874fa4918c102e56628bd9a85`.
`proofs/page-served-dist-custody.json` records its equality with the four
served distribution scalars. Card and the maintained document producers
also ran once; `proofs/remaining-producers-reconciliation.json` records
those operations. The current-source comparison in
`proofs/integration-inputs-root-comparison.json` explains why integration
required no producer or affected-compiler repeat. The original 41 AST
records and later five CLI records remain separate observations; neither
raw source hashes nor a sum of those rows substitutes for maintained AST
values.

## Review and deployment

Request `3c9a0f81` owns the final document checks, exact-head Page and Card
CI, checker review, and landing. This documentation follow-up changes
only this note and its canonical manifest over b614. Exact-head CI
evidence belongs in external review attachments after that commit;
no later note rewrite records CI outcomes. The successful gate and MCP
continuation leave the Page evidence judgment to the checker. Passive
memory observations establish no heap or lifetime-peak guarantee.
The planner owns deployment. This evidence establishes no deployment or
live acceptance result.
