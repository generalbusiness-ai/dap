# Keep host authority for installed registers

Status: adapter, Site and workspace continuity corrections have passing
focused evidence. Review `1a71cdd7` requested the Site correction at
`b0d3c165`. Rulings `0e593489` and `56a48952` require old-room Sites and
workspace provider work to keep working. The final frozen gate and new
independent review remain pending.

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
records. The final full gate has not run yet.

## Workroom

Source request `071b437de80f7d88b4377a3bc8286b370624cb12`, promise
`e2945d9ad8b628833457641dbb6a933642ba7ed8`, follows planner ruling
`3b239919dd4e5683d1fcfdd9b51d5c23c4b1a9d7` under parent `8a8902f3`.
The base is main `8b06312366635b7619abb2080d88a225fc063e17`, with M1–M2
already landed. Blocking packet review `bf2e724f` identified the original
single-root mismatch by source inspection; no live cutover caused it.
