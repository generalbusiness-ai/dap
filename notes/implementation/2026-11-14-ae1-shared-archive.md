# Share room archive policy and wiring

Source-only draft under AE-1 request 0c265d01 and ruling 59767cd8.
Updated promise 43fa0d74 selects one combined head: removing Grow's
production import before installed-package policy exists would lose its
answers. No compiler, test, build, generator, install or gate has run for
this head. The serialized validation slot belongs to other work.

The driver stays in `packages/scope`. `apps/room/archive.ts` supplies one
Artifacts adapter for the common room `DeployedScope`; `worker.grow.ts`
re-exports that entry. Configuration names admitted register roots and
provider authority, while each checked Directory/Destination route names
its recorded archive repository. No production setting selects one room,
repository or package release. The Grow config and its signed packet Text
rule disappear. Historical fixture call shapes delegate to that same
adapter; production imports no Grow packet or fixture policy.

Native policies come from the existing finite archive catalog and runtime
owner/capability support. Private root journals remain excluded. An
installed package policy needs its immutable creator/install chain, the
actual native Rules installation and retained signed release, and current
`APPLICATION_TRUST` publisher agreement. A digest merely present in R2,
a retained alias or the current maintained declaration establishes none
of those facts. The signature authenticates the publisher; the reviewed
closed runtime policy supplies export permission.

The namespace-only `applicationArchiveProofBytes` read and its closed
refusal list are the first item for the Security conclusion. Ruling
`12115613` requires one signed text result or a reason-only refusal. Its
sender selects an actual native pin
through bounded archive metadata, without first-ingress dispatch, cold-pin
repair or an HTTP route. It checks Rules/job record sizes against the
existing preparation metadata bound before materializing either record,
and checks each retained value's size before its body. The exact native
Rules fields select the v1 or v2 codec; there is no parser fallback.
The receiver reserves the reply and its verification before RPC, separately
charges fixed sender metadata/pin work, admits the Rules birth, checks
exact installation/root/IDs and rechecks current publisher trust before
adding policies. Missing archive-pin metadata has no dispatch fallback.

`roomArchivePackages` owns one paid policy snapshot per pass. It uses
scalar, size/hash-bound candidate queries rather than reading unbounded
item records through an uncharged state view. Native Rules/Directory
entries select their own installation proofs, with no scan of every
installation or trusted release. The declaration builder pays the original
fresh validation price before parsing each immutable signed declaration.
No policy or payload admission survives a different scope or release.
An equal declaration digest does not let another scope reuse that proof.
The owner reuses only an installation proved for the exact full reference
within the current pass. An outstanding proof RPC stays owned until its
underlying promise settles, even after its caller reaches the deadline.

Trust removal produces `application-policy-revoked`, before new package
policy or provider work for that package scope. A provider-independent
terminal record names the full scope and reason; it preserves any existing
archive row byte-for-byte, including its confirmed receipt, and stops its
wake. Policy preparation precedes a potentially large pending-row read.
The operator view overlays the terminal reason. Reconstruction returns that same
state. An authenticated package outside supported runtime policy uses
`application-policy-unavailable`. A pending installation or unreadable
namespace reply retries without selecting payload. Restoring a trust row alone does not
clear a stored terminal state. Operator diagnostics expose the fixed reason,
not packet contents, records or credentials.

The second Security item is provider scope. Artifacts keeps its existing
host-owned, expiring exact-repository/scope/ref credentials and read-back.
AE-1 adds no GitHub production mint; CB-2 owns that custody. A room page
states that another repository provider cannot archive here. A room with
no repository states that it has no archive. Existing rows retain their
repository binding; a different discovered target cannot retarget history.

The new source witnesses cover the strict signed-proof reader, a real
non-Grow Base room with an ordinary signed root/child package, and a signed
TEST Grow installation with accepted device answers. Both installed cases
use native-only initial policies, actual installation-proof RPCs, the
shared adapter, the Artifacts transport, clone and public replay flow. Their
five expected public journal identities come from actual creation before
provider refs exist. Each then removes trust and checks the terminal state,
unchanged confirmed coverage and no further provider calls. The provider,
clock and per-entry selection schedule are explicit fixture stand-ins.
The Base case creates a second real installation of the same definition:
substituting the first install's genuine proof fails the second scope's
authority check, while the second install's actual proof succeeds.
Existing Grow scenarios remain. These are witness drafts, not passed runs.
One additional native driver case starts from an actually confirmed
fixture row. A labelled TEST policy callback produces a pending result and
then a permanent metadata refusal. The witness checks row bytes, receipt,
stopped wake, reconstruction, existing diagnostic and zero provider calls.
The callback grants no signed-reader or installation-authority evidence.
A second native driver case carries an immutable count refusal through
candidate preparation and the adaptive catches. It checks the fixed
`chainReason`, exact entry position, unchanged receipt and row, stopped
wake and reconstruction. The policy disposition remains a TEST callback.
The row witness ties the prepaid terminal price to its shared function,
checks the closed record's 512-byte bound, and writes once with no work
or call allowance left. The original ledger stays valid throughout.

The shared Base fixture also runs both actual creator walks over its root
and child. Archive provenance names the signed packet's release. Admission
allows that release and revokes when only an unrelated release remains
trusted; its public API intentionally hides the release itself. A genuine
Rules birth supplied at the wrong parent address makes both walks refuse.
The witness adds no synthetic creator chain or second installation.

## Policy setup costs and remaining proof work

`apps/room/archive-setup-cost.ts` supplies shared prices for the new policy
setup. These functions describe work that the actual operations still pay.
They grant no proof, trust, source or export permission. In this table,
`M` means metadata, `W` means input work, and omitted coordinates are zero.

| Operation | Shared price |
|---|---|
| Proof sender metadata and identity/pin work | `forecastArchivePackageProofFixed`: W 5,570,560, independent of reply length |
| Signed proof RPC and both validations | `forecastArchivePackageProofReply`: 1 call, M 270,336, W 25,952,256; settle M and proportional W at actual reply bytes |
| Current trust JSON parse | `forecastArchiveTrustParse(u)`: M `3u`, W `192u + 4096`, where `u` is UTF-16 units |
| Trust setting and publisher comparisons | `forecastArchiveTrustCheck(u,r,t)`: W `3u + 512rt + 128`, for `r` releases and `t` rows |
| Clear and populate policy tables | `forecastArchivePolicyTables(d,s)`: M `512s`, W `1024(d+s)` |
| Fresh declaration validation | Existing `forecastArchiveDeclarationValidation(u)`: W `48u` for each immutable declaration |
| Terminal overlay read | `forecastArchiveTerminalRead`: 1 call, M 512, W 4608 |
| Terminal overlay and wake write | `forecastArchiveTerminalWrite(512)`: 2 calls, M 576, W 8192, prepaid once before policy work |

The proof reply price covers both sender and receiver validation. Fixed
sender metadata work cannot shrink when a small reply settles. Actual
Rules-birth admission separately reserves one node, one call, M `E` and
W `8E`, then settles at returned bytes `n` and pays W `32n` before parsing.
The original entry bound supplies `E`; this adds no allowance.

Some paid operations still lack a shared forecast: the immutable ancestor
walk and local `ProofBytes` reads, native Rules/Directory candidate scalar
queries, Rules-birth lookup, full-reference and flight bookkeeping, and
runtime capability checks. The adapter pays for its own target-birth
admission before the target pays for a second admission. Native SQL also
adds each returned metadata reservation to input work. A later total must
count these operations and every current-trust callback, including repeated
provider checks. No successful-pass multiplicity bound or sufficient
numeric ARC-1 cohort follows from this table.

The finite catalog and host configuration initialize outside the archive
pass. The table does not describe cold Worker CPU time. ARC-1 must state
that boundary when it combines policy, target, source, build and provider
costs. The call coordinates above count caller-side operations, including
one namespace RPC; they do not enumerate SQL calls inside that peer.

Ruling `25222294` keeps the two existing chain-read senders' work in their
own preparation bounds. The archive receiver pays its reserved reply,
measured decode and fixed hop work. It adds no sender-ceiling charge and
no quote. The separate new signed-install proof read keeps the fixed price
in the table above.

`APPLICATION_ACT_ADMISSION_BOUNDS` supplies 18 ancestor hops, 37 bodies,
16 MiB aggregate proof bytes and 36 RPCs. One chain walk for one full scope
reference therefore makes at most 36 sender calls in a pass. Package-proof
and target reads are separate. Each pass clears the proved-reference set
and repeats the walk; another use of a successfully proved full reference
within that pass reuses its identity. No cross-pass proof or trust cache
grants permission.

The birth sender uses `PreparationBudget` and a 10-second deadline
(`ScopeObject.nativeBirth`, `ReadPreparation.birth`): at most 16 calls,
16 candidates, 64 KiB metadata, 256 KiB declaration, and 1 MiB genesis.
The archive's existing entry bound further limits its requested body to
256 KiB. The exact proof sender limits SQL calls to five, the scope row
to 4096 bytes and its body to the requested bound before selecting it
(`ScopeObject.proofSource`, `ProofBytes.exact`).

The separate SB-1 request `836283176f960b8c886eeab41ee36ca4b83316e3`
owns the existing birth sender's earlier alarm-recovery read. Recovery can
load full scope metadata before the proof budget starts. It exists on main
and admission uses it too. SB-1 follows AE-1; this head neither changes that
recovery nor claims its missing bound. Audit `853f63cf` records the finding.

Ruling `50ce6650` distinguishes immutable admission counts from budget
shortage. `ArchiveChainLimit` carries an immutable count refusal through
the adaptive catches. The driver records `application-policy-unavailable`
with `chainReason: admission-limit`, in own or candidate preparation.
Candidate stops include the exact entry sequence and hash.

Each production pass that starts policy work prepays one terminal write in
its original ledger. Later outer lookahead starts with that price already
spent, so failure cannot consume it. The one-use writer checks the same
deadline and writes the closed terminal and wake without another debit.
It never revives a stopped ledger or adds an allowance. No second ledger,
stored marker, second walk or discovery reordering enters this head.

Every budget shortage keeps `limit`, capacity deferral and retry, including
own preparation and the first candidate. Until ARC-1 lands, a chain that
cannot fit can repeat `limit` on each pass; the existing diagnostic shows
the failing site. AE-1 makes no permanence claim from candidate position.
ARC-1 owns the fits-one-pass predicate and its permanent outside-cohort
stop. Its number act must bound these five variable pre-entry components
beside the measured creator-chain cost:

1. Target discovery and initial format/target persistence, including
   actual mutable Directory/Destination query reply sizes. A later pass
   can skip a target save that already committed.
2. Warm policy/release/prepared/owned table sizes, which determine reset
   work. A cold object starts with native tables only.
3. Current trust text length, row count and repeated provider guard
   comparisons. Unrelated valid trust rows can change their cost.
4. The retained archive row, manifests, confirmed frontier and current
   parent. Receipt progress or a layout transition changes those bytes.
5. Selection setup, including adaptive versus fixed strategy after a
   capacity deferral and snapshot versus standalone row-context work.

Ruling `12115613` resolves planner question `59c2e3cb` with this closed list.
Each refusal has one `reason` property, no sender label or payload, and a
fixed size bound. It keeps the original full read reservation. A reply that
the receiver cannot read retains its former transient behavior. The
terminal record and existing activation diagnostic expose the fixed
`proofReason` beside `application-policy-unavailable`, without a new page
or command. ARC-1 consumes this same result and adds no second proof seam.

| Proof refusal | Later event and classification |
|---|---|
| `installation-not-active` | Retry. Creator confirmation can activate a provisional Rules scope; the native job open entry can make a future job available; `application-install-result` can activate its pending installation. |
| `retained-proof-missing` | Stop. An active installation already committed its signed inputs in the native act transaction. No pending archive repair replenishes them. |
| `metadata-limit` | Stop. AE-1 provides no transition that trims or resets these existing Rules/job records under the unchanged 64 KiB bound. |
| `malformed-or-unsupported` | Stop. A fixed native pin, installation identity or signed digest cannot change through a pending installation event. |

Native retention commits `valuesOf` beside the admitted draft
(`packages/scope/src/core.ts`). The active transition follows the creation
result (`packages/platform/src/application-install.ts`). Retained values
use insert-on-conflict-do-nothing (`packages/scope/src/sqlite.ts`), so a
later use never replaces a malformed value. A separate new installation
could fill a missing key with the same immutable signed value, but AE-1
adds no repair or resume trigger for the old terminal scope. Its confirmed
receipt stays intact. No provider call follows a refusal during that
scope's policy preparation.

Ruling `ff83b78d` preserves native control-journal ordering. Rules/Directory
candidate entries discover package proof in source preparation, after the
native journal's target, format or current-parent reads. Those calls carry
no refused entry payload, label or package policy. No provider call follows
the refusal. The terminal and existing diagnostic record its fixed reason
and exact local entry position. The stored confirmed prefix stays intact;
the refused entry and every later entry of that stopped native journal
remain unarchived. AE-1 adds no prefix scan. ARC-1 separately owns the
per-entry predicate before provider work.

## Validation remains pending

| Check | Status |
|---|---|
| Read-only source review and whitespace inspection | Completed; found and repaired pre-debit materialization and stop-reason propagation issues |
| Affected compiler contexts | Not run; waiting for root's slot |
| Strict proof-reader owning file | Not run |
| Shared Base/installed-package and existing Grow owning file | Not run |
| Joint admission/archive root-child witness | Not run |
| Prepaid terminal cost, count-stop and operator owning files | Not run |
| Plain host configuration and page data witnesses | Not run |
| Relevant entry-point seals and required checks | Not run; source correspondence review precedes any seal adoption |
| Final gate on actual AC and checker review | Pending |

The protected `Operations` dispatch functions and `SqliteStore.markSent`
remain unchanged. The Effects model covers those functions, not this new
archive policy/proof lifecycle. No model result or source seal has been
invented or advanced. The checker must review the new proof boundary and
provider scope with an explicit Security conclusion after validation.

AE-1 changes no kernel or archive cap, archive format, staging contract,
restore or deployment. ARC-1 ruling b188f9e7 separately owns the exact
one-pass cohort and permanent pre-provider stop; its final cost predicate
must include the actual AE-1 policy/target preparation. That source build
follows AE-1. The planner owns deployment and post-cutover binding.
