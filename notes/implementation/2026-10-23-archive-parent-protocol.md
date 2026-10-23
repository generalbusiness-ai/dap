# Artifacts parent-object reads

The hosted archive retries fail before fetching the first parent commit.
The reader requires `shallow` and `filter` in the older Git advertisement,
but the server does not advertise both. This candidate adds an explicit
Git protocol v2 path for Artifacts archive parent reads. After deadline and
text-framing corrections, the affected compiler and both owning files pass.
The final gate found four failures in three test files. After fixture
corrections, all eight affected cases and the unreached downstream checks
passed. Exact-head review remains pending. Hosted v2 filtering support and a
completed archive pass remain unverified.

Request `66010f21f899a4df8ac7530e18539f05887254cd` and promise
`645d787bbd23c281e9cf92c82f8236b0a07772c7` track the work. The candidate starts
from deployed diagnostic commit `f99ccc239aa305d442e1d0e354fce86ac37d598f`
and includes accepted Main `a9c25125c4e1d1eed15af75f85fd077a6c6e35b2`.
That integration retains the reviewed registration diagnostic and all five
measured inventory updates: the two archive owners, scope index, and the
object owner in both maps.

## The observed failure

Planner observation `122cb2eb086d659fdb2fa49ffd64bb85b6bdd63b` records 35
diagnostics from Worker version `520aa54f` across three of the five objects.
All report `plan`, a loaded `confirmed` row, and `retry` with `unavailable`.
The first parent read requests a commit of at most 1,024 bytes. Its last
phase is `advertisement-response`, with refusal `isolated-capabilities`.
The other two objects still ran the previous Worker version in that sample.

The older reader sends no `Git-Protocol` header and refuses before POST when
either feature is absent. The diagnostic does not name the missing feature.

[Cloudflare's Git protocol documentation](https://developers.cloudflare.com/artifacts/api/git-protocol/)
states that Artifacts supports v2 fetch and omits `filter` from its older
protocol. It does not establish support for the exact v2 `shallow` and
`filter tree:0` exchange required here. The planner's bounded capability
probe remains necessary. A successful clone does not prove isolated-object
support. The archive's v2 journal layout is separate from the wire protocol.

## The provider selects the protocol

`SmartHttpSource` gains an opt-in protocol within `isolateObjects`.
Artifacts selects it through its trusted archive-provider construction.
GitHub and existing custom providers keep the default reader. No request
field, repository name or public configuration selects the option. Ref
discovery, closure reads and writes retain their existing protocol, including
`ref` and `refs` on an isolated source.

An uncached v2 object read makes one capability GET and one fetch POST, both
with `Git-Protocol: version=2`. It requires SHA-1 and advertised `shallow`
and `filter` features. The POST asks for the exact object ID with `deepen 1`,
`filter tree:0`, `no-progress` and `done`. [Git's v2 specification](https://git-scm.com/docs/gitprotocol-v2)
permits wants that were not advertised, avoiding a separate `ls-refs` request.
The server still authorizes the request. A denial says nothing about absence.

The response permits an optional `shallow-info` section, including an empty
one, followed by `packfile`. At most one shallow boundary may name the wanted
object, which must then be a commit. Channel-1 pack bytes are compacted within
the owned response buffer; bounded channel-2 progress is ignored. Channel-3
errors refuse without exposing their text. The HTTP body must end at its
final flush. Extra sections, acknowledgments after `done`, malformed packets
and trailing bytes refuse.

The verified pack must contain exactly one non-delta commit, tree or blob
with the requested ID; the Reader still checks its requested type. Existing
inflated-size, hash, cache and returned-copy bounds apply. A server that
ignores filtering cannot make the reader accept a closure. There is no
fallback or internal retry.

## The original bounds still apply

Each parent read reserves two Git calls before I/O, 1,024 metadata units,
and input work of 32 times its wire allowance. That allowance remains the
requested object maximum plus 8 KiB, capped by the transport allowance.
The isolated source keeps its working and returned-payload bounds.

The capability parser retains fixed flags, not a ref list or unknown
capability values. Packet counts and wire bytes stay bounded. Compaction
copies each pack byte at most once within the owned buffer. These are source
bounds on admitted work, not peak-memory, instruction or server-work measures.

One original deadline covers advertisement, fetch, framing and decoding.
Every detected expiry abandons the source before cleanup. A late response
cannot start another operation, populate the cache or change the frozen
diagnostic. Pending body cancellation cannot renew the source. Row state,
retry schedule, pass budget and credential checks are unchanged.

## Local validation and remaining work

The maintained parser passed for the two changed mapped owners; only their
existing seal values were updated. Assertion
`2c528abfc1c50eee961a78ad628e6cc30c112b39` records the exact outputs and
unchanged inputs. The first owning attempt passed the Git test compiler,
both Scope compilers and all three inventory cases, then its wrapper failed
because it expected four. Neither Vitest file ran. Original failure
`f0b5a0064cece1b996b0855b6f277bf4c0e8c9f6` remains; parser and inventory
passes are carried within their source basis.

Checker finding `9ef50640d5c72c7069cce83a85757609032a80a6` exposed a deadline
gap: synchronous expiry could precede the timer's abandonment flag, and
cleanup could then clear the timer while cancellation was pending. The fix
makes expiry terminal before cleanup and rethrows the body's deadline
refusal without waiting for cancellation. Its strengthened synchronous,
body, timer and late-result witnesses passed in the next attempt.

That continuation ran at clean `07b066ab8f850598e3ba06dcbcaad8e2d5302d52`.
The Git compiler passed; the whole Git HTTP file had 12 passes and one failure.
The real local v2 case failed `unreadable: isolated shallow boundary` at its
first `reader.commit(head)`, test line 422. The later old-commit read was not reached. Scope archive-host remained unrun. Assertion
`b797b87ac15383432248d49622ff41444599f9b3` records the natural exit 1;
audit `53f101e0cd4ddd7e0ec237f13aae29646c214a38` preserves all raw counts,
identities, costs and guards in its finite packet.

Checker finding `e80ccaaea8cb1f00669ccac602bf7f79e441fb97` then identified an
independent text-framing defect. [Git's common pkt-line rule](https://git-scm.com/docs/gitprotocol-common#_pkt_line_format)
requires accepting non-binary packets with or without a final LF. Git's
[shallow writer](https://github.com/git/git/blob/master/upload-pack.c#L739-L746)
omits LF, and its [packet writer](https://github.com/git/git/blob/master/pkt-line.c#L644-L651)
does not add one. The failure is consistent with this defect, but its local
response body was not retained. No observation run was added.

The correction removes at most one final LF before the exact version,
capability, section-header and shallow-ID checks. It does not trim other
whitespace or accept CR, embedded LF or doubled LF. Binary sidebands, bounds,
identity checks, deadlines and refusal rules are unchanged. Existing cases cover both LF spellings and malformed endings. Source handoff
`0581604764b55269876d014dfe59ffcd0e10c25d` records the correction.

The corrected owning follow-up passed the Git compiler, all 13 Git HTTP cases
and all 12 Scope archive-host cases, with no errors, signals or pending steps.
Outcome `a0b56ba50985a47a34ed76ace11624fb494fbade` records the original run
and costs. The local Git witness completed its old-commit, tree and blob reads
in two requests each without unrelated history or a large sibling. Provider
identity, credential and HTTP stand-ins passed their budget and late-result
checks. These local passes preserve the earlier failures and prove no hosted
capability or outage recovery. Integrated validation is recorded below;
exact-head review remains owed.

The single deadline control detected the intended abandonment fault at its
named assertion. Its child exited 1; the wrapper also exited 1 because JSON
labelled the failure `Error` while stderr identified `AssertionError`.
Outcome `48b214025a7ca4927cf8ecb8c2983a78daf6de3a` retains both results,
exact restoration of the reviewed source, and no rerun.

Main's accepted inventory owners and fourth case remain; only the two archive
seals changed. Lock, dependencies and Vitest configuration are unchanged; the
integrated native fixture includes the scope index. The integrated gate
recompiled its exact head. Private APFS dependency adoption, not installation, is recorded
in `265163c59a9de061ccba02a6b39823978a108e3b`. Earlier passes retain their
original source basis.

## Integrated gate and fixture corrections

The ordinary gate at `2ce0d50823b6cb98c2d6f0ee8d26d48158ec2afe` completed
with 2,226 passes, four failures and three skips across 482 files, with no
unhandled errors. All seven stages before tests passed. The Node checks and
Counting command were not reached. Outcome `c2e97064c82aca2dc94598199bd8f05753978cd0`
and frozen evidence receipt `9a15d70b957bba593cb2931750f804668c1ce867`
retain the full run, input guards and costs; no failed result is replaced.

The Grow producer stopped before admitting its next entries, with an
unavailable parent read. Its command follower then had no producer session.
The native transport witness likewise stopped before its first parent upload.
Both scripted Artifacts peers still answered with v0 advertisements and packs,
despite the reader's v2 request. Their test-only correction selects v2 by the
header and shares bounded channel-1 pack framing. V0 ref and write behavior,
production code, budgets and original assertions remain unchanged. The raw
failures are consistent with this incompatibility; they did not retain the
decoder's exact refusal.

The Lending case returned `behind` where it required a current projection with
no membership actions. Its reason was not retained, so its exact historical
cause is unproved. The fixture's separate item and history reads can straddle
the borrow's pending publication result. The correction uses its existing
bounded dispatch helper after the deliberate overlapping-read assertions and
before the failed membership read. It preserves the strict `current` and
`actions: null` assertion and adds bounded status/reason diagnostics. It makes
no production change or claim that all background work has drained.

The focused continuation at `2120449356afabc3388247217a2ce103cd70403c`
passed the helper guard, Scope test compiler, all eight cases in the three
complete affected files, the 37 Node checks and the maintained Counting
command's 55 Node cases. No errors, skips, signals or pending steps remained.
Outcome `a238f6da39b18b6d511ef42fcea9442ba06d5ee8` retains that run and its
fixed input checks. Healthy suites from the original gate were not repeated;
the original failed gate and this focused continuation are separate results.

The promise trailer was then added at
`dad3cb2b10b607e88edc6928b5a5f96a4ffc4526`, preserving the tested tree
`c76759fb87211fa66bfd11011e5426945f6b141b` and its parent. The final change
after that amendment updates only this report. The runtime evidence keeps its
original commit identity; no tests were repeated for commit metadata or prose.

The full gate took 1,173.391 seconds elapsed and 1,358.644 seconds inclusive
CPU. The continuation took 69.506 seconds elapsed and 86.901 seconds CPU.
The five earlier recorded validation attempts total 35.677 seconds elapsed
and 40.893 seconds CPU. These are separate-run totals, some overlapping other
work; nested child timings are not added again. Preparation and review time
were not measured. Dependencies were reused without a cache reset on the
shared arm64 macOS development machine (Darwin 27.0.0); background load was
not measured. These figures
describe validation cost, not application performance.

## What can resume

The sampled objects already retry every few seconds, and a failed parent read
keeps its retry wake. If the new protocol resolves that refusal, a later wake
can continue planning without an operator row reset. That does not establish
budget fit, Mark, or legacy-anchor publication. The planner owns deployment
and hosted observations: successful parent reads, a completed pass through
Mark, and the resulting archive and legacy-anchor state remain to be shown.
