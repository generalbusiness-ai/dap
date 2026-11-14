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

The namespace-only `applicationArchiveProofBytes` read is the first item
for the Security conclusion. Its sender selects an actual native pin
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
`application-policy-unavailable`. Missing or temporarily unreadable proof
retries without selecting payload. Restoring a trust row alone does not
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
| Terminal overlay and wake write | `forecastArchiveTerminalWrite(512)`: 2 calls, M 576, W 8192, paid before serialization |

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

Planner question `ed162ad1` covers a concrete missing sender charge in the
new ancestry walk. Existing `nativeBirth` runs `ReadPreparation.birth`,
which can load and validate a declared ancestor's retained declaration
beside a small genesis reply. The existing definition bound is 256 KiB.
An exact proof read also performs sender identity and body checks. Current
ancestry charges cover bounded replies and receiver validation, not this
fixed sender preparation. The planner must choose a static precharge from
existing bounds or a bounded size quote before that protocol grows. A
complete cost proof must also state whether peer SQL calls belong in the
caller call coordinate. No completed charge or cost proof is claimed here.

Planner question `59c2e3cb` covers the proof refusal contract. The current
text-or-null namespace reply does not distinguish pending installation
from oversized sender metadata or invalid immutable proof. AE-1 treats a
missing proof as transient. ARC-1 cannot infer a permanent structural stop
from null without a further ruling. The draft keeps the wire unchanged.

## Validation remains pending

| Check | Status |
|---|---|
| Read-only source review and whitespace inspection | Completed; found and repaired pre-debit materialization and stop-reason propagation issues |
| Affected compiler contexts | Not run; waiting for root's slot |
| Strict proof-reader owning file | Not run |
| Shared Base/installed-package and existing Grow owning file | Not run |
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
