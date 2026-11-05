# Keep host authority for installed registers

Status: adapter, Site and workspace corrections have focused evidence.
The repeated GitHub 403 came from a scripted fractional expiry, reproduced
and reported in `de36e7d7`. The fixture repair passes its three-case Native
owner and test compiler. The corrected final gate passed; new independent exact-head review
remains pending. Reviews and failed runs below keep their exact
original heads and limits.

Switching a Worker's current register previously stranded old rooms' Git
credentials even when `INSTALLED_REGISTER_SCOPES` retained their root.
The Artifacts and GitHub adapters now accept every root in that validated
operator list. Their exact host, namespace, pinned owner and retained
claim-to-directory birth checks still apply. GitHub keeps its repository
binding checks. A listed root supplies no credential or Native birth.

The pure `installed-registers.ts` parser serves creation and host wiring
without a cyclic import. It retains the existing limit of 32 distinct scope
IDs and 4,096 UTF-8 bytes, and requires the current root. A malformed list
closes host authority. With a list, an explicit `REGISTER_SCOPE` must agree
with the adapter's configured register. Without a list, each adapter keeps
its historical single-root behavior, including configurations without
`REGISTER_SCOPE`. New parentless creation still selects only the current
register. The Worker includes both register settings in each native host
adapter's cache key, so list changes take effect on the next call.

The workspace capability path now follows the same validated root list
while retaining its own Native lineage proof.
This change touches no Native definition, grant, wire format, dependency,
Worker configuration, or derive source. The source-seal inventory updates
nine existing values and adds the two small shared authority owners; all
route and gate assertions stay in place.

## Evidence and limits

The [focused manifest](evidence/2026-11-05-installed-host-roots-focused.manifest.json)
records 24 passing cases across six complete owners, the test compiler,
security inventory, shared-helper check and local documentation links.
Its SHA256 is `55168b9acdbaa88758b8965d8f15a5a3ddd046adcaeebf23baed25003c8bc6c4`.

`installed-host-roots.test.ts` uses real Native scopes, retained birth
proofs, pending operations, membership and credential custody. Each host
settles an old register's pending creation after a current-root switch,
then mints a read token and answers it to the member's real session.
Removing the root denies the credential read without consuming it;
restoring the root permits one read. An unlisted register stays pending.
Artifacts binding calls and GitHub HTTP are explicit scripted providers;
the GitHub signing key is fresh TEST fixture material.

Two bounded controls distinguish the required behavior on both hosts.
Forcing single-root selection leaves the old creation pending. Omitting
the installed list from the cache key incorrectly answers a credential
read after root removal. Both controls fail at their intended assertions,
and their exact source bytes are restored. The manifest retains initial
compiler, synthetic-ID and documentation-link failures with their limits.

The first full gate at `25000b56` failed with two Node settings-inventory
failures: the new helper and Worker cache read the register settings, but
the documentation had not named those readers. Its actual `gate.exit` is
`exit 1`; Counting, Plain and Native never ran. The
[failed-gate manifest](evidence/2026-11-05-installed-host-roots-failed-gate.manifest.json)
retains that result. Its SHA256 is
`d389daf38f6b154575f11c514391877e29bbe88aa2723ff94ccdf538da8f5b7e`.
The settings inventory and host/self-host references
now describe the new readers and retained-root authority. Runtime and test
bytes remain identical to `25000b56`. The three settings-owner cases and
local links pass after the repair; the
[settings manifest](evidence/2026-11-05-installed-host-roots-settings.manifest.json)
retains those checks and the initial repair attempts. Its SHA256 is
`68039058d7463c8f146ec54cb4cc7a88d75d5b348b3834c3692e90c0271cfdd6`.
The corrected gate at `ec607a83dbc712d28add245148c31938abfcf94c`, tree
`0c5e4f99158d71ea610d9a658fc5c57cabe546d3`, passed. I read its actual `gate.exit`: `exit 0`.
The terminal records contain 135 Node passes,
56 Counting passes, 3943 Plain passes
with 1 skip, and 1106 Native passes
with 2 skips. All phases are complete, with no
unhandled errors or contradictory records. All three new host-root cases
pass in the full Native stage. The source identity is unchanged and the
owned process group closed.

The [gate manifest](evidence/2026-11-05-installed-host-roots-gate.manifest.json)
retains the terminal analysis, checkout identity and complete raw originals.
Its SHA256 is `78b0f9ea55db59def75be27220c74023fd093a740cf97aa6397edc7256bceffc`. Candidate `b0d3c165` changed only this implementation note and the gate
manifest after that frozen gate. The Site correction below changes runtime
and test files and therefore needs a new complete gate. The first gate
remains failed; this later pass explains no historical Native or archive
failure. The archive scale owner passed independently, and source
`64552d40` remains open.

No builder deployment, live root switch,
room creation, provider token or real Git clone ran. The register packet
remains unlanded and needs revision and review after this source lands.
The planner then checks old-room child creation and Git access before a
new scratch room and the actual clone after its token's hour. Neither
this source nor its tests close parent `8a8902f3` or historical source
`64552d40`.

## Site correction and reader audit

`site/host.ts` now uses the same installed-root helper for Artifacts and
GitHub. Cached readers recheck membership when opening and before source
access. The fixed `SiteTokenReuse` owner receives a fresh root-settings
snapshot from `ScopeIndex`; acquisition and post-provider checks use that
same helper. The change keeps namespace, repository name, configuration
identity, expiry, generation, capacity and unknown-mint bounds.

The [Site focused manifest](evidence/2026-11-05-installed-host-roots-site-focused.manifest.json)
records 30 passing cases across four complete owners, both source and test
compilers, and 14 security inventory cases. Its SHA256 is
`d2326c926f022766097264ee1ced5033135c3c222ad0c1325fbcebb4d363f8c8`.
The native Site route witness installs genuine old and current registers,
serves the old room after the switch, refuses its new and cached readers
when unlisted, refuses the fixed owner's cached token, and restores service
without another mint when the root returns. The GitHub witness covers
public and private readers. Another witness removes the root during a
provider mint, refuses its plaintext and preserves the unknown-mint hold.
Providers and clocks remain explicit stand-ins.

Two bounded controls distinguish the Site change. Restoring a single-root
Site check makes the actual old-room route answer 503 instead of 200.
Removing the token owner's post-provider membership check admits the
removed root's minted plaintext. Both fail at the intended assertions and
restore exact source bytes.

The candidate scan uses `rg -n 'registerScope|room\.register'
packages/scope/src apps/room`, excluding generated files, followed by the
register and `hostBound` consumers and workspace lineage. The manifest
records the command, candidate working directory, source hashes and output.
An initial scan ran on main `8b063123`; it remains only a qualified baseline.
The corrected scan ran on the Site candidate after controls restored.
The Site-stage scan found these consumers. The final scan in the workspace
manifest records the corrected code and the one deferred bridge:

- `archive-host-item.ts` compares the directory creator and retained claim
  against one configured root and calls `hostBound` with that root.
  `apps/room/archive.ts` supplies it; only `worker.grow.ts` enables
  `archiveHost`. The demo packet does not switch Grow. A future Grow root
  switch needs this bridge's own review and continuity witness, as checker
  `1a71cdd7` records.
- `artifactsWorkspaceOutside` supplies one root to `WorkspaceHost`.
  `workspaceRepository` in `workspace-lineage.ts` compares the directory's
  source register to that root. This is the separate `hold@2` capability
  path. A lane with that capability and workspace sources can reach it;
  the scan establishes no absence of such lanes in old demo rooms.
  Ruling `56a48952` requires this path too. The workspace correction below
  now selects the actual listed root before its existing proof.
- `demo-creation.ts` compares the public offer to the configured current
  register. It intentionally selects the current offer; historical roots
  do not become default offers.
- `register-setting.ts` checks current-root agreement and the Artifacts
  fallback. Parentless creation still selects that current root.
- The two native adapters and `host-wiring.ts` use membership in validated
  roots. The corrected Site reader and token owner now use that helper too.

No new full-gate or acceptance claim follows from the Site focused checks.
Ruling `56a48952` resolves the workspace scope and explicitly defers the Grow
archive bridge. The deploy guide and the retained packet both state that
a Grow register switch needs that bridge fixed first. The demo packet
switches only demo. Freeze the complete correction, run its gate and obtain
a new exact-head review before landing.

## Workspace continuity

Ruling `56a48952cd65920861b07f870a43a545bc34d06e` answers scope request
`bf5b77bf`. `artifactsWorkspaceOutside` now validates the same installed
list before constructing its host. `WorkspaceHost` passes those roots to
`workspaceRepository`, which selects the actual register from the checked
directory source before reading that register's Native birth. It keeps all
six immutable reads within the existing five-second bound. Cohort pins,
selected outcome, found claim, directory/destination sends, repository and
namespace checks remain. No root-by-root network search or caller-selected
repository enters the proof. Singleton callers keep their existing route.

The workspace cache key now includes both register settings. Removing a
root replaces the cached host, so new provider work cannot retain the old
list. Native hold, lease, credential, setup-revocation and unknown-reply
semantics remain unchanged.

The [workspace focused manifest](evidence/2026-11-05-installed-host-roots-workspace-focused.manifest.json)
records the latest complete focused run: 46 passing cases across seven
owners, 14 security cases, final source/test compilers and exact runtime/test
hashes captured before the commands and checked afterwards. Its SHA256 is
`0ef78dbd8f1c8543ef855cd6e96c99e6ea813912c258e025a92049a8f368c095`.
This run includes the Site and adapter owners; earlier focused case counts
overlap and must not be added to it.

The workspace factory witness proves six reads to the old register's own
birth, refuses an unlisted old root without a provider call, restores work
when listed again and closes invalid lists. It exercises the production
factory and cache. Ancestor entries pass their actual Native judges; lane
state, operation and provider replies remain labelled stand-ins. The Native
workspace witness forks and retires its setup credential with a different
current selector and the old root retained. Its lane, operations and custody
are Native; ancestors use their real judges in memory, and current selector,
transport, clock and provider remain TEST boundaries.

Two controls distinguish the workspace change: selecting only the first
configured root loses the proven old repository, and omitting the list
from the workspace cache key lets removed-root work reach the provider.
Both fail at their intended assertions. Their exact source bytes are
restored. The preceding Site and adapter controls remain separate retained
records. The combined gate below failed. The final gate at the end covers this complete correction.

## Workroom

Source request `071b437de80f7d88b4377a3bc8286b370624cb12`, promise
`e2945d9ad8b628833457641dbb6a933642ba7ed8`, follows planner ruling
`3b239919dd4e5683d1fcfdd9b51d5c23c4b1a9d7` under parent `8a8902f3`.
The base is main `8b06312366635b7619abb2080d88a225fc063e17`, with M1–M2
already landed. Blocking packet review `bf2e724f` identified the original
single-root mismatch by source inspection; no live cutover caused it.


## Combined continuity gate failure

The combined gate at `99d3c7f619397a52c309e956030310c6c7740804`, tree
`7ed691c95b507f3f520977c0a022898b277c9e45`, failed. I read its actual
`gate.exit`: `exit 1`. Node passed 135 cases, Counting passed 56, Plain
passed 3,943 with one skip, and Native passed 1,110 with two skips and
one failure. The reconciler marks Native observations partial because
one owner failed. It found no contradictions or unhandled errors.

The GitHub retained-root credential witness returned HTTP 403 after the
root returned to the installed list. It expected HTTP 200. The unchanged
three-case owner passed in isolation. A diagnostic run with its five
neighboring gate owners passed all 31 cases. These passes do not explain
the gate failure or replace a full gate.

The [failed continuity gate manifest](evidence/2026-11-05-installed-host-roots-failed-continuity-gate.manifest.json)
has SHA256 `9ee56cfe2c2b6e23b26172f2df3f5bbb9411a4641bfec0ec90439a84e2ee16b7`
and 13 public files. The raw originals began in durable storage, retain
exact hashes, and are read-only. The source stayed unchanged, and the
owned process group closed. The archive owner passed in this run; its
historical failure remains unexplained.

The witness now checks that its first refused read reached the adapter
through the real session. Its failure diagnostic records adapter answers,
clock readings, and custody state and expiry. It excludes plaintext and
session tokens. No runtime change follows from the unexplained failure.
A diagnostic full gate must stand on its own before renewed review.

The strengthened witness and six related owners passed all 46 cases, and
the test compiler passed. The [credential diagnostic manifest](evidence/2026-11-05-installed-host-roots-credential-diagnostic.manifest.json)
has SHA256 `d3a7aad7c365db4aaa37ea68841a139d6f067a294e1c8acc1f6527ef79cca9da` and 20 files. Its exact tracked input hashes
match before and after the final focused run. Imported investigation
logs retain their separate source-identity limits.


## Diagnostic gate and fixture cause

Diagnostic gate 4 at `a7d22d7cb6f927860eb13e0379317a54f823aa5e`, tree
`a52d66dcac0f48653783104072fec12173dd2ac6`, failed the same GitHub read.
I read its actual `gate.exit`: `exit 1`. It recorded 135 Node passes,
56 Counting passes, 3,943 Plain passes with one skip, and 1,110 Native
passes with two skips and one failure. Native observations are partial;
there are no contradictory records or unhandled errors. Source identity
stayed unchanged and the owned process group closed. Both credential
accesses reached the adapter; the requested handle had no custody row.

The isolated cache trace at scratch `073800da` passed one selected Native
case and its compiler. It observed fresh construction on removal and
restoration, then a cache hit on an unchanged third read. The first two
accesses read the key setting twice, and the third once. The probe counted
property names and public root selectors; it recorded no key or token
values. The policy probe ran after each actual access, so it could not
warm that access. Planner `deee21d6` accepted that the cache key changed
as intended and scoped an exact-clock diagnostic.

The first exact-clock run at `771092e4` was invalid. My added SQL closure
crossed from the Durable Object into test context and hit Cloudflare's I/O
guard before the target assertion. Its compiler passed, but its Native
failure proves neither reproduction nor clearance. I reported that error
in `1f6714f9` and retained the failed run. The owner-safe correction at
`923d9092` keeps SQL inside the actual judged/credential callbacks.

Under ruling `6836170f`, that correction ran once at the observed clock,
`2099-01-01T09:35:03.001Z`, and reproduced the original 403. The scripted
provider emitted `2099-01-01T10:35:03.001Z`. GitHub documents REST response
timestamps as whole-second UTC in its [REST guide](https://docs.github.com/en/rest/using-the-rest-api/getting-started-with-the-rest-api#about-the-response-body).
`GitHubApp.mintInstallationToken` rejects the fractional value before
returning a token. `DestinationHost.send` catches that failure before
`custody.putRead`; `Operations` then records `unknown`. The actual outcome
has no token field, an undefined handle type, and no public expiry.

The test had required only an outcome before casting its body to a
string-handle shape. Its credential path therefore coerced an absent
handle into a string, whose lookup found no row. No successful handle row
later disappeared. The restored cache policy was true, with fresh
construction, while the read failed for lack of a credential. This is a
fixture defect; production correctly keeps the failed mint unknown.
Gate 3 lacked this boundary capture, so its original clock/handle is not
independently attested. Both earlier full gates remain failed.

Cause report `de36e7d7` preceded every candidate edit. The repair emits the
scripted GitHub expiry at whole-second precision, makes the existing
witness exercise subsecond Native time, and requires a confirmed mint
with a string handle before credential reads. All existing listed-root,
unlisted-root, cache, session and one-use assertions remain. No production
source or source-seal value changed for this repair. All three Native
cases and the test compiler pass; the final gate below covers this repair.

The additional retained manifests are:

- [Failed diagnostic gate](evidence/2026-11-05-installed-host-roots-failed-diagnostic-gate.manifest.json): 13 files;
  SHA256 `a92746d21473610c49090bfc01edcf7cc6658700af45645081c116bd0fce610c`.
- [Cache construction trace](evidence/2026-11-05-installed-host-roots-cache-accounting.manifest.json): 11 files;
  SHA256 `deca4ed01170abd9d68663e4dbad1e051273bc1a2f57fe49bf369424467f991e`.
- [Invalid cross-object diagnostic](evidence/2026-11-05-installed-host-roots-exact-clock-invalid.manifest.json): 14 files;
  SHA256 `477e091865cae0f14e16f8a8de47755c47e410cc2902c3dcd3539570022a6694`.
- [Valid reproduction and source cause](evidence/2026-11-05-installed-host-roots-mint-cause.manifest.json): 13 files;
  SHA256 `2dbb8687306a3f30f4f19dd0025fa56d7de076a980741943b74ed1b58ad6bb4f`.
- [Passing fixture repair](evidence/2026-11-05-installed-host-roots-fixture-focused.manifest.json): 13 files;
  SHA256 `a501a7846c62c835b9acd7ad3102ca1043b3d68f30e2dbc2fecf127cded7f61e`.


## Final corrected gate

The complete adapter, Site and workspace candidate at
`db7634eeb46bd4f5d96f79eaaa26e0a3de701fb3`, tree `a0a4e7367d2aaebaaf36a3d5c4f988fe84f5ac4f`,
passed its final gate. I read its actual `gate.exit`: `exit 0`.
It records 135 Node passes, 56 Counting passes,
3943 Plain passes with 1 skip, and
1111 Native passes with 2 skips. All phases are complete;
there are no unhandled errors or contradictions. All eight added adapter,
Site and workspace cases pass. Source identity stayed unchanged, and the
owned process group closed.

The [continuity gate manifest](evidence/2026-11-05-installed-host-roots-continuity-gate.manifest.json)
has 13 files and SHA256 `fc1ae77d8d150195da0085e7b4b71ffb34f2697ce809f65dc7020e6ed6bbfdca`.
Only this implementation note and that continuity manifest follow the
frozen gate; no runtime or test file changes follow it.

Planner `aa761ded` accepts the fixture cause and keeps production cache,
session and custody behavior unchanged.

The earlier inventory and two combined gates remain failed. The invalid
cross-object diagnostic stays invalid. The valid exact-clock reproduction
and immutable source trace establish the scripted-expiry cause separately
from this pass. Gate3's original boundary was not captured. Later archive
passes do not establish the historical archive-stop cause; source
`64552d40` stays open. Parent `8a8902f3` also stays open. No deployment,
live root, provider token, real Git clone or hosted acceptance follows
from these source checks. Renewed independent exact-head review gates
landing. The planner deploys only the subsequently reviewed register packet.
