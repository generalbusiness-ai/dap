# Keep host authority for installed registers

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

The separate workspace capability path keeps its configured register.
This change touches no Native definition, grant, wire format, dependency,
Worker configuration, or derive source. The source-seal inventory updates
four existing values and adds the two small shared authority owners; all
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

The full gate has not run yet. No builder deployment, live root switch,
room creation, provider token or real Git clone ran. The register packet
remains unlanded and needs revision and review after this source lands.
The planner then checks old-room child creation and Git access before a
new scratch room and the actual clone after its token's hour. Neither
this source nor its tests close parent `8a8902f3` or historical source
`64552d40`.

## Workroom

Source request `071b437de80f7d88b4377a3bc8286b370624cb12`, promise
`e2945d9ad8b628833457641dbb6a933642ba7ed8`, follows planner ruling
`3b239919dd4e5683d1fcfdd9b51d5c23c4b1a9d7` under parent `8a8902f3`.
The base is main `8b06312366635b7619abb2080d88a225fc063e17`, with M1–M2
already landed. Blocking packet review `bf2e724f` identified the original
single-root mismatch by source inspection; no live cutover caused it.
