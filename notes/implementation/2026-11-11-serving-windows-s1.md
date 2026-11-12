# Serving windows that leave room for another sender

The seven `POST /v1/scopes/:scope/acts` rows in
[the entry-point inventory](../../docs/security/entry-points.md) now say
`self-signed` instead of `membership`. An open-register `found` already
accepts a valid signature without a membership grant. Ordinary acts still
require their native membership or grant checks. This classification
correction adds no authority admission. The serving changes below
intentionally change what happens when a counter table fills.

This document-only follow-up leaves source and tests unchanged from S1 checkpoint
`acf797a70b254f4373465b3fb07476f80d943172`, integrated with main
`d4cfae052a3d92aaeff28f8e986f59414807c233`. It addresses request
`8bd2c9d2208811e7540a64d570515394d487c83a` under builder promise
`75b128e9f86b452f70c156e9f5c00b1d5545c069`. The one full gate passed:
5900 passes and three planned skips reconcile all 5903 selected obligations.
Both separately allocated control groups distinguished their intended faults.
Root and independent readbacks checked complete owner identities, restoration,
and cleanup for both groups. At documentary head
`bfc67122c8116f736c8a2577ae0c3ce124c2d609`, the push Page and Card workflows
succeeded. The separate manual Page run failed and remains failed. Planner
ruling `b5283835846713777cd40b7ad5b9863dff16115d` selects the two push runs for
S1 review and forbids another S1 browser run. The checker judges that evidence.
This later documentary successor reports those `bfc67122` observations; it
claims no CI execution at its own new head. The external post-commit
correspondence receipt must verify that only this note and the canonical
manifest changed. Runtime source and tests remain at `acf797a7`. No deployment
claim follows.

## The five serving changes

Creation, signed reads, and register `found` now have separate caps. Each
operation keeps at most 8192 key or address identity windows and one shared
overflow window. A full table sends a new identity to that bounded window
instead of refusing it solely for lacking a row. Overflow uses the lower
key or address limit. All three operations together retain at most 24,579
windows. Only expired windows leave a table. Restart or object eviction
resets these memory counters; they create no persistent serving state.

`ServingLimits.account` charges the address before the verified key. An
exhausted address therefore allocates no key row. Invalid signatures can
charge the trusted address, but cannot charge a claimed victim's key.
Creation and `found` use hourly windows; signed reads use minute windows.

The Site window calls `addressKey` for every valid IP, including IPv6 /64
grouping. It keeps at most 4096 identities and one shared 240-read overflow
window per minute. Missing addresses share the `missing` identity. Bounded
non-IP transport labels use distinct `opaque:` identities, separate from
canonical `address:` IP identities, under the same table and overflow
limits. Empty or overlong strings, and non-string values other than null, fail
admission. No
fixture-only production switch selects this behavior.

Cloudflare supplies the public edge address. The sandbox passes that value
as the explicit third argument to `ApplicationScreenService.native` or
`nativeStream`; the room uses it for Site and serving windows. A forwarded
header alone supplies no address custody. Direct and hosted callers remain
addressless unless their trusted transport provides the argument. A public
browser cannot replace Cloudflare's edge address with a synthetic label.

For HTTP creation, `routedRequest` reserves the address through the fixed
index before `body(request)`, JSON parsing, bounded signed-value copying,
and signature verification. In-process creation reserves it before copying
its supplied signed value. A private reservation binds the charged
counter-owner incarnation and exact overflow-window incarnation. Verified
key accounting skips only that same live window's charge. Hour rollover
or owner restart makes a stale reservation charge the new window normally.
The body and public API cannot supply that reservation. `has` remains a
fresh read-only SQL lookup; S1 adds no `has` cache.

Register `found` has its own key and address windows, using the existing
creation settings as finite limits. The fixed owner verifies the original
signature for the key charge. Serving exhaustion stops ingress before
target lookup. The original founding policy, native authority checks, and
judge still decide the operation. S1 adds no contract refusal or reason;
it uses the existing `unavailable` answer with `rate-limited` for serving
exhaustion.

The gateway continues to check its trusted descriptor, room Worker origin,
path, and method. It does not add an installation-wide scope-ID allowlist.
The descriptor identifies a directory, installation item, and presentation
digest, but not every membership, rules, destination, and lane scope that
legitimate application flows call. A directory-only restriction would break
those calls. A complete restriction needs a separately reviewed context or
bounded native projection. S1 preserves the route set and repairs explicit
address propagation without granting new native authority.

The existing owners contain the five requested witnesses:

| Finding | Whole owner and observation |
| --- | --- |
| 1.1 | `serving-limits.test.ts`: 8191 fresh keys from one address leave a fresh creator and returning reader admitted. The small-cap scene also checks separate caps, bounded overflow, no live eviction, one reservation charge, rollover, and owner restart. |
| 1.2 | `site-window.test.ts`: 4096 addresses from one IPv6 /64 leave a different visitor admitted; the dedicated cap and shared overflow stay bounded. |
| 1.3 | `serving-admission.test.ts`: the real sandbox gateway, named service binding, and fixed serving owner keep visitors' Site windows separate. The edge Request and ExecutionContext are stand-ins. |
| 1.4 | `serving-admission.test.ts`: an exhausted creation address gets HTTP 429 with zero body reads and no target selection. |
| 1.6 | `serving-admission.test.ts`: one key across addresses and one address across keys exhaust their `found` windows before target work. The target's answer is a stand-in; the case proves serving admission. |

## Evidence

The canonical [S1 manifest](evidence/2026-11-12-serving-windows-s1.manifest.json)
indexes fourteen small files in
`/Users/hughpyle/play/artroom-evidence/2026-11-12-s1-final-curated-provenance`.
They carry the label **Curated provenance, not raw output**. The table hashes
those normalized metadata files. Its three CI rows instead hash the complete
job logs at their original HOME locations; the rows mark those hashes as
original logs. No stdout, report, event row, log line or source inventory was
copied into the filing. The manifest keeps all nineteen original references,
including original paths, hashes, modes, and checkpoints, in a separate list.
The manifest's `finalCI` member adds authored run/status provenance and pins
the existing API responses and complete job logs at their original HOME
locations. It does not copy those raw records into this note or manifest.

The source prerequisite and input-comparison records predate the gate. Their
original `UNRUN` fields describe that chronology. The actual gate and control
records supply the later outcomes. Historical standalone compiler, focus,
AST, and producer results retain their own heads and do not fill current gate
observations. The initial compiler context-27 failure and the earlier a22
focus failure remain failed historical units.

| Check | Command or exact invocation/provenance reference | Actual exit | Output SHA-256 (curated unless marked original) | Checkpoint |
| --- | --- | --- | --- | --- |
| Current ordinary five | Exact command records: original `results.json` locator in `prerequisites.json` | All five 0 | `d32054b6fcdf776da758dfb26bcb4bc2972edbe963e0ce9bb08f83c37668fcd4` | `acf797a7`; END `55cd000c…` |
| Historical compilers | Exact command records: initial/repaired original result locators in `prerequisites.json` | Initial unit 1 (context 27); repair 0 | `d32054b6fcdf776da758dfb26bcb4bc2972edbe963e0ce9bb08f83c37668fcd4` | Contexts 6/18/26 at `10d0cc38`; 27/31/34/41 at `df50066b` |
| Maintained AST correspondence | Original producer result/source references in `ast-adoption-correspondence.json`; no new command | No new process; historical 31-record output | `5029fa625df766991f3f1c62dcd44fbe3911466e9cb9cb9d30ea6beef802aa14` | `df50066b`; adoption `83bed7a1` |
| Input/owner correspondence | Pinned source comparison in `input-correspondence.json`; no new command | No process | `4f2d098a29cba6e246136ee6fc81aed63181eb7cd399c83a56065e65aad0aa6b` | `acf797a7`, main `d4cfae05` |
| Producer closure reliance | Original input-trace source and established comparison in `producer-input-correspondence.json`; no new command | No process | `3db2ffd66430815df6915e5288bbc271dbcd5aa01cf93747ee1f633ab9b4e304` | Original producer heads retained; current source comparison at `acf797a7` |
| Historical 52-case focus | Exact original `argv.json` locator in `historical-focus-root.json`; root readback | Node/Native and outer 0 | `f16bce1201e9461d7098a0d2ccd33d7c009cdf09ab84970382e5d452ef29508c` | `c2a9de7e`; END `e80a8de2…` |
| Historical focus independent readback | Original references in `historical-focus-independent-readback.json`; no rerun | Recorded actual exits 0 | `fd9bdd295ab210c7a1c27f8d17efed6a7738a2381b83d80988110b9535f801ad` | `c2a9de7e`; earlier failure stays separate |
| Retained Page build | Exact source/checkpoint invocation provenance in `historical-page-producer.json`; argv not reconstructed | Four recorded exits 0 | `1f3a3a7023d7f1e65bfa3a02b69a071bd9213ba765c886a38c4f21f9ab94a022` | `1b974a44` |
| Retained three producers | Exact source/checkpoint invocation provenance in `historical-remaining-producers.json`; argv not reconstructed | Three phases and outer layers 0 | `e34d95800ecb3f1e5a3f3336af02b16fc19ce9c322b2cd1a773b10937f24c19a` | `babfb07a` |
| One whole gate | `npm run gate`; same-run analyzer; no retry | Gate, inner, outer, launcher and analyzer 0 | `fc042eb4cd5e894b752675a338d751899e95432c81e59c883c22cf148d5db49a` | `acf797a7`; END `66e3dc61…` |
| Whole gate independent readback | Original invocation/stream locators in `gate-independent-readback.json`; no rerun | Recorded actual exits 0 | `bce05034a462cabfcca688ad05110b8e2f109b2c83073500a333f2112ae1d434` | `acf797a7`; 5,903 obligations |
| Control A+B, complete 5+2 owners | Exact frozen READY `/invocation` in `address-and-site-root.json`; no repeated positive | Mutant child 1; controller/outer/launcher 0 | `c11cd1dba6416287146337887c8d76012a8b9a419bcf27f4aaf9c2ec383fd013` | `acf797a7`; END `e940cc62…` |
| A+B independent readback | Original run references in `address-and-site-independent-readback.json`; no rerun | Recorded child 1; controller/outer/launcher 0 | `30f3217856e25f945c6d90ccc62c87f7eeed2cc0bf0f1d3c736483f35c55cd7e` | `acf797a7`; two intended failures, five passes |
| Control C+D+E, complete 11-case owner | Exact frozen READY `/invocation` in `ingress-boundaries-root.json`; no repeated positive | Mutant child 1; controller/outer/launcher 0 | `13d538ac09ab2e0038307beb79ea1980068ae56e5e11701a030758ec4af8f67a` | `acf797a7`; END `390b1bf3…` |
| C+D+E independent readback | Original run references in `ingress-boundaries-independent-readback.json`; no rerun | Recorded child 1; controller/outer/launcher 0 | `4f66fefe628d4f9d15a0672b954d0a7ca517377d51eca65a64ee445f6708fd3e` | `acf797a7`; three intended failures, eight passes |
| Page CI push | `.github/workflows/page-browser.yml`, job `page-browser`; [run 43201044890](https://github.com/generalbusiness-ai/dap/actions/runs/43201044890), attempt 1. Create-room command: `node --import tsx --no-warnings scripts/demo-captures.ts --recorded --claim-witness --out /tmp/claim-witness`; complete workflow commands remain in the exact Git file. | API job/all 12 steps success; complete log confirms claim and label completion; no individual child-zero receipt | Original complete job log `bc81aa8d8ff619c6ae6c3821329a64240b9d4e8a396783b6e16c6c080c0ab91d` | `bfc67122`; job `131124242674` |
| Card CI push | `.github/workflows/views-browser.yml`, job `views-browser`; [run 43201044687](https://github.com/generalbusiness-ai/dap/actions/runs/43201044687), attempt 1. Card command: `node --import tsx packages/mcp/test/views-browser.mjs`; complete workflow also runs the maintained Grow room and routing commands. | API job/all 13 steps success; complete log confirms Card and both Grow completions; no individual child-zero receipt | Original complete job log `643216dc0bf4a1575bd9cdc2e8a066ee581fc5926bb0050a99c7e1f4b9783639` | `bfc67122`; job `131124242198` |
| Page CI manual dispatch | Same exact Page workflow/create-room command; [run 43201184843](https://github.com/generalbusiness-ai/dap/actions/runs/43201184843), attempt 1, `workflow_dispatch` | Failure; explicit failed process exit 1 at focus assertion line 303; label/setup-node cleanup skipped | Original complete job log `e262952cd00a2db0831f6835413d9ab85bb4e9548c0194878ebfd08a544b8c47` | `bfc67122`; job `131124731653`; remains failed |

The gate reconciled all 5,903 obligations: 5,900 passes and three planned
skips across 713 whole owners. It ran all 45 compiler invocations and 16
typecheck scripts. Its 117 file-wrapper records remain `UNKNOWN`. The
maintained selector omitted six Scale obligations from four owners; none
counts as executed. The all-skipped screenshot module
`apps/room/page/test/record.scope.test.ts` retains a null duration and partial
timing. No duration is supplied for it. Source/closure reconciliation passed,
and both cleanup records closed with no remaining groups.

The historical focus observed 24 Node and 28 Native passes, with six UNKNOWN
Node wrappers. The separate three settings cases remained historical carry.
The maintained AST result contained 31 records from five owners: ten changed
and twenty-one unchanged. Adoption/current-source correspondence supports
those retained values; a raw hash does not substitute for a parser result.
The retained non-AST producer observations remain at `1b974a44` and `babfb07a`.
Reviewed finite input correspondence selected them without a new build.

Control A reverses address/key order. At `serving-limits.test.ts:31`, its
existing first assertion observed 8,192 key rows instead of 31. Control B
keeps raw valid IP spellings. At `site-window.test.ts:26`, the first /64
assertion observed 4,096 admissions instead of 240. These two failures mask
later fresh-address, capacity, overflow, rollover, stale-reservation, and
visitor assertions in those cases. This control independently distinguishes
only its named key-order and IP-grouping assertions.

Control C drops the gateway address. At `serving-admission.test.ts:246`, the
second visitor received HTTP 429 instead of 404. Control E bypasses the
`found` rate-limit refusal. At line 260, the first same-key assertion received
`unavailable` instead of `rate-limited`, masking later address and submission
assertions. Control D bypasses the pre-body creation refusal. At line 281,
the unchanged body reader caught the sentinel: HTTP 400 with `bad-request`
and one body read replaced HTTP 429 with `rate-limited` and zero body reads.
That is a comparison failure, not an unhandled runtime exception. It proves
body access before refusal, not parser CPU or signature work. The Request
headers, ExecutionContext, and target answer are explicit stand-ins; gateway,
service RPC, and serving owners remain real source paths.

Both separately allocated controls used the exact successful whole-owner
gate observations as positives. Neither repeated a positive body. Their
mutant children exited 1; adjudicating controllers and outer layers exited 0.
Both controls restored all 4,671 source rows and the original namespace,
passed final fences, and closed both cleanup records without groups.

RSS records report ten-second samples by PID/start. The gate collected 90
samples and 519 Node/workerd rows, with sampled maxima of 2,463,888 KiB for
Node and 2,663,776 KiB for workerd. Each control collected three samples and
two owned rows. Their sampled Node maxima were 683,152 KiB and 680,112 KiB;
workerd remained `UNKNOWN` because no owned sample appeared. These values
measure neither V8 heap nor instantaneous or lifetime peaks, aggregate
memory, or an improvement against a qualified baseline. No run repeated to
obtain telemetry. The retained Page producer's raw observer failure remains
failed with UNKNOWN admission for its short unsampled process; normalization
does not rewrite that status.

## Exact-head browser CI and the separate focus failure

The automatic push runs at `bfc67122` completed successfully:

- [Page browser scripts, run 43201044890](https://github.com/generalbusiness-ai/dap/actions/runs/43201044890),
  job `131124242674`, attempt 1: all 12 steps succeeded.
- [Card browser scripts, run 43201044687](https://github.com/generalbusiness-ai/dap/actions/runs/43201044687),
  job `131124242198`, attempt 1: all 13 steps succeeded.

Both runs started from the push at 10:30:58 UTC on 12 November. The additional
[manual Page run 43201184843](https://github.com/generalbusiness-ai/dap/actions/runs/43201184843),
job `131124731653`, attempt 1, started from `workflow_dispatch` at 10:31:54 UTC.
It failed the create-room focus witness at `scripts/demo-captures.ts:303`.
The failed process exited 1. The local-label witness and setup-node cleanup
step were skipped; checkout cleanup completed. Those skipped steps are not
passes, and the successful push run does not rewrite the manual failure.

The focus witness, Page sources and served assets match main
`d4cfae052a3d92aaeff28f8e986f59414807c233`. The retained source comparison checks
18 exact Git owners. The manifest records both full commits, all 18 paths
and the exact `git diff --quiet` comparison; root observed exit 0. The
comparison depends on no scratch inventory. Source equality does not prove
equal runtime data, browser timing or the cause of the focus failure. F-2 request
`0f327b6b207defe01cb9a4a3fab743e3d6fc89aa` owns that separate investigation and
one repair after S1. It adds no S1 retry, sleep or witness change.

Ruling `b5283835` selects the existing push runs as S1's exact-head CI. No
additional Page or Card run follows. These runs bind `bfc67122`, whose source
and tests equal runtime checkpoint `acf797a7`; they are not executions at
this later two-document successor. Review, landing and deployment remain
separate acts.

## Open limits

- Request `8bd2c9d2208811e7540a64d570515394d487c83a` owns the historical
  `namespace.actual.json` retention gap. That external original remains under
  `/private/tmp` at its unchanged locator/hash/mode and can disappear on
  restart. It is not relabeled or persisted as curated metadata. Current
  gate/control physical dependency checks are separate actual evidence.
- The same request owns the browser-CI review disposition. The manifest
  records the two successful push runs and failed manual Page run at
  `bfc67122`. The checker judges them under ruling `b5283835`. This
  documentary successor changes no runtime source and claims no new CI run.
- The same request owns the external final-document correspondence receipt.
  It records the actual final commit/tree and confirms only
  `notes/implementation/2026-11-11-serving-windows-s1.md` and
  `notes/implementation/evidence/2026-11-12-serving-windows-s1.manifest.json`
  changed from checkpoint `acf797a7` and tree
  `223e2c0b6e9bb2419acb0a8b1b5207e3a9dde8b7`. Source and tests stay unchanged;
  the document-only follow-up does not repeat the gate.
- The same request retains the tests' custody limit: header and execution
  stand-ins do not establish Cloudflare address custody or Native authority.
  Review, landing, and deployment remain separate acts. This note claims none.

All ordinary and validation raw files stay plain external originals. No raw
copy, selected-line projection, link, mode change, freeze, archive, or seal
supports this filing. The fourteen newly authored metadata files retain
original provenance without preserving complete source originals. Keep these
curated metadata files for at least 30 days after landing. Their retention
requires no raw-output operation.
