# S2: archive binding — development checkpoint

Request `f54185fb5b7ccacdf932248552127e4985b3f956`, promise
`7993405b993bd00d857cb0d0798b44125ebd4b74`. This is unfinished work from
audited Main `1da3f4ca79ad034286ca4d8988bed9dee022369e`. The sequenced
design draft 6 was approved by `d9d777a2` and landed before this work.
Current section 4 explicitly starts a later-bound archive at genesis,
position 0; that supersedes the original request's position 1 wording.
There is no gate, review, landing, publication or deployment for this head.

## Implemented boundary

The Directory repository has an optional `archive` value, whose only
present value is `journal`. A register claim can carry it, and the real
creation send copies it into Directory's `establish`. An admin may set it
later with `bind-archive`; no act clears it. The actual repository state
is named `open`, so that is the act's state guard. The design's sketch
called it `established`. Membership's admin table and actual initial
action list include `directory.archive`; other roles gain nothing.

The optional signed manifest form is `host.requires: ["archive"]`.
Absent requirements retain their old bytes. Unknown, empty, duplicate or
non-array requirements refuse. This does not alter the durability level.
The contract replaces the withdrawn `archived` level with `sequenced`;
execution still admits only Recorded until the sequenced runtime is built.
Replay's unsupported-level witnesses use Live and Sequenced. The receipt
result named `archived` remains: that word is a receipt answer, not a level.

The native installer records the archive requirement from the verified
signed proof. Its existing twelve-value-slot bound is unchanged: the
destination and archive flags share a typed `requirements` record in the
old destination flag's place. The Directory's `application-stage` checks
its local binding before retaining a catalog or forwarding role grants.
An unbound archive-required install reaches final `refused`, with reason
`archive-unavailable`. Its native delivery uses the existing named-guard
refusal protocol; Rules retains that reason from the authenticated result.
This is the existing asynchronous install workflow, not an immediate
refusal of the initial signed request's receipt. Binding then submitting a
new request can succeed; repeating the original request keeps its outcome.

The bounded native archive target reader requires `archive: journal`
before it resolves the room's existing Directory/Destination repository.
It retains the same birth, ancestry, incarnation, complete-page, budget and
repository checks. The binding is permission and configuration, not proof
that a prefix was exported: `archivedThrough` remains that separate read.
No migration is supplied, as instructed. Existing rooms are inoperable
where the changed declarations reach them.

## Witnesses

The small Platform check uses actual register/Directory rules, native
judges and MemoryState. Child births and per-key grants are explicit
stand-ins. It checks binding at claim or later, unauthorized refusal,
and rejection of attempts to clear or replace the binding.

`scope/test/archive-target.test.ts` uses actual native room creation and
SQLite, then native Membership `seat` and `first-key` before the admin
binds. An unbound room resolves no target; after binding the Directory and
its platform child resolve the same checked repository. A second room
binds at its original signed claim and preserves the original corruption
and budget controls. Host setup, clock and read access remain the fixture's
explicit stand-ins. Both cases pass in
`/tmp/artroom-s2-native-binding-enrolled-20261018.log`.

The signed codec requirement and pure native pre-grant install boundary
pass eleven cases across two files in
`/tmp/artroom-s2-archive-requirement-boundary-20261018.log`. The v2 proof
case now carries a real archive requirement and checks its derived record;
five v2/codec cases pass in
`/tmp/artroom-s2-v2-archive-requirements-20261018.log`.

`scope/test/archive-install.test.ts` runs the actual native room,
Membership authority, installer, local R2 custody, Directory and application
creation. The Git HTTP peer and host trust/configuration are TEST inputs;
there is no external provider. It checks final refusal before grants or
child creation, the actual later binding, unchanged exact-repeat receipt
and head, a new successful install, and the real application's genesis.
The actual Rules, Directory and application journals replay consistently
with proven native grants. This single scenario passes in
`/tmp/artroom-s2-native-install-binding-replay-20261018.log`.

Two paired controls distinguish the guards. Removing the target binding
guard makes the unbound native target assertion fail; removing the install
binding guard makes the unbound native judgment assertion fail. Both
sources were restored and original control processes ended 0. Logs:
`/tmp/artroom-s2-binding-target-control-20261018.log` and
`/tmp/artroom-s2-install-archive-control-20261018.log`. The first has two
positive cases / one changed assertion failure; the second eight positive
cases / one changed assertion failure. No mutation sweep was run.

The three A2/A3 owning workflow files pass 22 cases in
`/tmp/artroom-s2-a2-a3-regressions-20261018.log`. Their fixture-only policy,
provider, credential, foreign-copy and domain boundaries are unchanged.
Platform and Bytes owning typechecks pass. Scope's first compiler caught
the remaining old level in its admission witness; the corrected owning
Scope typecheck passes in
`/tmp/artroom-s2-scope-type-removed-level-20261018.log`.

## Recorded failed attempts

The first Platform run passed the new binding case and register cases but
failed Directory's explicit shape snapshots, which omitted the new slot,
act and zero-send row. Those expectations were updated, without changing
the existing behavioral assertions. A first native attempt could not start
because the sandbox denied loopback listening; the Workerd tests then ran
with the required local access. No test failure is inferred from that probe.

The native late-binding witness initially used the fixture's manually
minted read token as though it enrolled a signing key. Its observation
correctly said `unknown`, so the act was unauthorized. It now enrolls
the founder through the native acts; no grant stand-in was substituted.
The install scenario initially inspected the final refused job through a
live-only helper; it now uses the retained-item API. The first extra install
flag would have made thirteen value slots; whole-definition validation
refused it. The typed record keeps twelve, and owning install checks pass.
All attempts remain in the named `artroom-s2-*` logs. These are focused
checks and diagnoses, not a full gate or measured total edit cost.

## S2a and S2b split

Planner report `75060e2dfa0486ed2e8942c26035ddee8016c412`, adopted by
`cca3b5c4f6540fd78134f6e33e9a43478187d9e8`, splits this work:

- S2a is this head: the claim or later Directory binding, bind-archive,
  the signed manifest requirement, install refusal before grants in an
  unbound room, install after binding, and target resolution reading the
  binding. Archive evidence is restricted to the existing fixture engine
  and its A2/A3 qualifications. A scripted target or a fixture allowlist
  is not platform archive acceptance.
- S2b is child request `c8c6ff6b6277fd103c30f80d0b76fd40a60ca8bb`:
  foreign-source privacy metadata and the reviewed policy configuration
  path. Its witness must archive an installed application's scopes,
  including late-bound genesis 0, before plan 033 slice 9. It has not been
  implemented here. Production admission and consent remain outside both
  slices, with their existing A0b owner.

The following records the acceptance gap that led to the split.

Question `82d8576f`, corrected by `5e090acb`, asks the planner how to stage
the required platform/application export witness against A0b's outstanding
admission work. The concrete existing guard is
`archivePrivacyMetadata`: any entry with foreign `uses` is refused as
`unsupported-foreign-copy`. Real Directory and application births retain
their source/claim dependencies. The archive driver also still requires
explicit reviewed policy configuration and commissioned fixture ports.
No new export certificate, privacy exception or production wiring was
invented. The comment about legacy Membership exclusion is a policy
description, not a guard in `readArchivePin`, which is generic metadata.

Full S2 is not complete. Native archive export from genesis with its actual
foreign definition/dependency closure belongs to S2b. S2a still needs its
own final gate and exact-head review. Planner has the user's current
authorization to deploy as needed; this local work performs no deployment.

## Integration with reviewed G3 Main

Merge `e199a47d7` incorporates actual Main
`426504d89b3140e5b3f769c546e846529cf9f8c3`. The one test-file conflict is
resolved by retaining both the archive-requirement witness and the reviewed
late-child closure witness. The five focused byte/platform/native files
pass ten cases in `/tmp/artroom-s2-g3-merge-owning-20261019.log`; original
process 88200 closed with exit zero. Platform's two and bytes' two compiler
targets pass in `/tmp/artroom-s2-g3-merge-types-20261019.log` (process 7785
closed zero). That invocation named the wrong scope workspace and did not
run its targets. The corrected owning scope invocation passes all three
targets in `/tmp/artroom-s2-native-birth-types-20261019.log` (process 97023
closed zero), including the new birth-cutoff witness.

The existing native install witness now also feeds its actual installed
application's birth into archive prefix and privacy metadata classification.
The birth has genuine foreign uses. An explicit TEST pin allowlist reaches
that cutoff; it is no policy certificate and enables no export. Classification
refuses `unsupported-foreign-copy` before any entry or retained-body fetch.
The unchanged native replay assertions still pass. Evidence is
`/tmp/artroom-s2-native-birth-cutoff-20261019.log`, one case, original
process 81558 closed with exit zero. The earlier standalone archive driver
fixtures remain engine evidence for scopes without foreign sources; no
installed application export is claimed here.

The Page assets were regenerated after the native declaration changes:
`/tmp/artroom-s2-page-build-20261019.log` records the build. Its owning
asset check passes in `/tmp/artroom-s2-page-assets-20261019.log`. User docs
now distinguish the room binding from durability and describe the signed
requirement, asynchronous refusal and new request after binding. No install,
lockfile change, gate, publication or deployment is inferred from these checks.

Dependencies are another private APFS COW view from idle G1, with 106
checked versions / 13 internal relative workspace links and zero installs.
Only the clone's Vite caches were removed. Audit
`/tmp/artroom-s2-dependency-view-20261018.json`, SHA-256
`20bb7b35bd194959e52f99c7bbad51acf23453661678dda087bd7e7b09c64f2a`;
unchanged lock SHA-256
`3546b5384c9245fb646c4f7c22cabde0f4351b05dfcec704d1bdeb170666361a`.
This checks versions and links, not tarball integrity or private trees.
