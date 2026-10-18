# M1 trusted application installation

Source child `873c84041d9259870f42ace3dc8235a59e9c3d17`, promise
`d299657b6432ac7182563dedf27166c9c241e128`, implements the install half of
M1 `eca1c7ee`. The developer half passed review at `4928fccc`, landed as
Main `bfa02edd`, passed Main audit `10f6249c`, and was published by planner
in `864b5ae2`. This work incorporates that Main. Install review and deployment
remain separate obligations.

The governing planner decisions are `c643756e` (scope and trust), `866c7ae7`
(immutable URI), `0d973184` (host-owned Git fetch), `716ace64` (original request
and directory authority), and `9075d42e` (partial effects and fetch recovery).
Earlier preparation and diagnostic records remain in this file's Git history.
This note describes the resulting implementation and its verification limits.

## One request, visible native phases

A new room explicitly selects `TRUSTED_APPLICATION_COHORT`: register@12,
directory@11, membership@7, rules@5, destination@7 and inbox@1. Every pin has
the `platform:` prefix. Omission keeps the legacy generic cohort. The retired
Counter cohort cannot be selected for a new room; historical definitions,
judging and replay remain available.

The SDK builds one admin-signed `application.install` envelope for the room's
Rules scope. It carries the immutable URI, expected release, selected role
defaults, genesis values, two bounded retained proof values, and detached
canonical native definition text. It contains no screen bytes. The release
identity covers the publisher's signature and has no self-identity field.

Rules records pending, active, or refused state and the current phase:

1. **Fetch:** a narrowly allowlisted host preparation performs bounded public
   Git reads and an idempotent private content put. Interrupted preparation
   can resume only for this original native request.
2. **Admission:** a read-only host operation checks the retained content and
   native support. It does not fetch, write content, or create an application.
3. **Activation:** Rules activates the declared root and Directory retains
   the checked definition closure. Full catalogs produce a final refusal.
4. **Grants:** Directory forwards the exact checked additions to its own
   Membership. Membership unions selected defaults with existing grants.
5. **Creation:** Directory creates the entry scope with the original admin
   as opener and its actual destination when the genesis requires one.

Native reference checks bind each continuation to this job, release, root,
semantic identity and actual sibling scopes. Directory owns forwarding and
birth; the host does not invent membership acts or authority. Declaration
text is checked against its canonical digest and retained by native custody,
so a restart or removed R2 object does not erase a born scope's definition.

A refusal before admission produces no activation, grants, or child birth.
A later refusal retains earlier committed activation and grants. The result
names the phase and reason. There is no cross-scope rollback or compensation.
An uncertain original keeps its signature and durable recovery path. A
final refusal cannot be resumed; changed conditions need a new ordinary
admin request.

## Exact bytes and operator trust

The release address is
`git+https://<lowercase-host>/<repository>.git/@<full-commit>/<encoded-tree-path>`.
The codec accepts canonical full lowercase SHA-1 or SHA-256 commit spelling.
It refuses credentials, ports, query, fragment, floating refs, dot components,
encoded separators, and ambiguous path spelling. The expected release is an
independent input.

The shared Git reader verifies the exact commit, selected trees and regular
blob. It refuses symlinks, gitlinks and missing objects without fallback.
The host fetches the URI independently of CLI or MCP preparation. The current
bounded public smart-HTTP transport supports SHA-1 repositories only. A
SHA-256 URI produces an explicit final `unsupported-object-format` host
refusal before network access. No subprocess, authenticated repository,
redirect, branch fallback or CLI-upload substitute is used.

The host requires an exact release and publisher in `APPLICATION_TRUST` and
validates the signature and every complete native definition. It currently
accepts restricted@1 and no application-declared capability code. Missing
trust admits nothing; malformed trust refuses as a whole.

`APPLICATION_CONTENT` is a private R2 binding. Admitted canonical packets
use create-once release keys and checked readback. Corrupt content refuses
without repair. No public bucket route, upload, list, arbitrary key or delete
is exposed. The source Room config names `artroom-application-content`; the
operator must provision the bucket and configure trust before deployment.

Important implementation allowances are 4 MiB per host packet, 64 KiB per
definition, 256 KiB per semantic proof, 16 roots, 17 definitions per root,
64 install jobs, and two cached packets per bucket including pending loads.
The Git walk has separate commit, tree, depth, wire and elapsed allowances.
These are checked input and operation bounds, not measured heap quotas.

## Generic route and maintained screens

Room serves only the exact installed presentation through
`/applications/<directory>/<install-item>/<presentation>/`. Each GET or HEAD
checks the actual active native installation and current operator trust.
The entry redirects to its exact asset path. Only named packet assets are
served, with MIME, CSP, ETag, HEAD and revalidation handling. There is no SPA
fallback. Two concurrent distinct packet loads occupy the cache allowance;
a third refuses before another R2 read until an entry has settled.

`_/context` returns bounded public routing metadata, not a session, signing
key, role grant or application item. The SDK verifies that context against
the page address. Invitation reading then binds the exact Directory,
Membership7, Rules and destination. Metadata cannot authorize a device.

Counter and Lending load this context, accept a matching private invitation,
and generate a nonextractable key in the browser's IndexedDB. Private custody
is separated by native incarnation. Both retain a verified seat before
clearing join custody and restore identity after reload. Counter requires
explicit rearming after reload. Its Join path waits for a fresh snapshot
when preparation is definitely unsent; uncertain native outcomes keep the
original envelope. Lending reads the committed verified-seat handoff before
completing discovery.

The app-specific `/counting/` and `/lending/` dispatch, generated asset modules,
asset generators and checked-in browser builds are removed. Maintained
browser sources, package configs, local preview and historical native paths
remain. The old Lending service config and 14 October runbook are explicitly
historical. Same-origin serving is intended for operator-trusted authors;
it is not an arbitrary-package isolation boundary.

Destination@7 accepts installed application publication only from checked
Directory@11 birth provenance and actual sibling references. The older
Destination branches keep their exact historical behavior. A native Lending
act can queue a real destination publication request. Queueing that request
is not proof of a provider write.

## CLI and MCP custody

`dap install <uri> --release <id> --request <key> [--role <role> ...]
[--values <JSON>]` and MCP `install_application` use the same persistent
custody under `private/mcp-custody/`. Preparation, signing and sending occur
only for a new request identity. Repeating the original key and meaning
reuses its envelope; changing the meaning refuses before another fetch or
signature. Native receipts must match that envelope before acknowledgement.

Acceptance means the request was recorded. `dap application <item>` and MCP
`application_installation` read its pending, active, or refused result. Only
an active result includes the exact screen URL. Existing MCP `settle` reads
the retained original. No volatile CLI custody fallback is used. The portable CLI command surface
uses an explicit `applicationCommand` runtime port. Node supplies the MCP
adapter and file custody; browser consumers do not import MCP server metrics
or Node-only dependencies. Native CLI acceptance uses that same adapter.

Membership7 invitation, browser joining, agent joining, sessions and role
checks use the new exact cohort while preserving historical versions.
Neither package declaration nor screen metadata grants authority. Only the
explicitly selected signed defaults are added to existing role grants.

## Layer boundaries

The canonical package, bounded JSON, signature port, immutable URI and routing
wire types live in the pure `bytes/application` entry. The client keeps its
existing exported names. Native platform rules read that lower-layer codec
and still perform whole-definition validation themselves. The platform has
no client, browser or transport dependency.

MCP's service alone may import `git/application`, which exports the bounded
public immutable object reader and HTTPS transport. The architecture guard
allows that exact file and subpath. Other server modules, the broad Git
entry, Node, provider credentials and push modules remain refused. The
existing guard witnesses both the permitted read and the refused edges.

## Verification and boundaries

Focused tests exercise strict URI spelling, actual local SHA-1 and SHA-256
Git object reads, operator admission, real private R2 races and corruption,
SDK ownership, selected cohort custody, Membership7 enrollment, and shared
CLI/MCP original-envelope recovery. The public GitHub probe fetched an exact
existing repository blob through the production bounded transport and matched
local Git bytes. It proves that read path, not a native install or deployment.
Its scripts and raw records are `/tmp/artroom-m1-github-capabilities-20261018.*`
and `/tmp/artroom-m1-github-object-walk-20261018.*`.

Seven native install scenarios cover successful Counter and Lending birth,
lost fetch or admission replies, interruption before the private put, a late
child-genesis refusal after grants, and final untrusted or unsupported-format
fetch refusals. They use real native scopes, SQLite, R2, retained operations,
eviction, HTTP reads and replay. CLI accepted-reply loss is reconciled by a
fresh CLI invocation and MCP using the same custody, with no extra signature,
Git read or native install act. Git upload-pack, repository creation host,
clock and scheduler are explicit fixtures. All successful native journals
replay consistently with grants proven.

After host cleanup, these seven scenarios use Room's production entry point
for screen requests. Together with the retired-route and pending-cache cases,
all nine pass (`6041`, terminal `bba871`, exit 0), recorded in
`/tmp/artroom-m1-generic-host-retirement-20261018.log`. The focused cache
control passes before the fault, then fails by the expected 200-versus-503
assertion when pending eviction is allowed (`47829`, terminal `3a0d7a`, exit
0). Source is restored. The record is
`/tmp/artroom-m1-packet-cache-control-20261018.log`.

The full native browser witness passed at
`4a9298acc02d8dfe2b0b250abcf93b29ca84c99a` (`91059`, terminal `da87e0`, exit 0).
One real register12 room installs both complete maintained packets. Fresh
Chromium contexts sign actual Membership7 joins, complete Counter Join and
Lending donation through live Worker routes, and restore identity after
reload. Rules, Directory, Membership and both applications replay consistently
with grants proven. The bridge forwards actual browser request bodies and
native responses and streams. It substitutes no recorded admission.

The Browser plugin is unavailable. Cached Playwright 1.63.0 and Chromium
153.0.8010.12 use fresh contexts at 1280×800 and 390×844. Both titles and pages
are present, with no framework overlay, horizontal overflow, JavaScript error,
or unexpected console error. Lending's two expected unpublished-page 404s
leave an explicit unavailable read while its actual publication is queued.
The final run through Room after cleanup passes at
`4c176f88ac3230087c5fe895d0c3e9b151ef9656` (`82016`, terminal `454be0`, exit
0). Four screenshots and 75 sanitized request records are under
`/tmp/artroom-m1-live-browser-20261018/`, with log
`/tmp/artroom-m1-live-browser-final-20261018.log`. Earlier passing artifacts
are retained separately under `/tmp/artroom-m1-live-browser-4a9298acc-20261018/`.
The finite harness sources are in `/tmp/artroom-m1-browser-harness-20261018/`.
The packet manifest names the exact source head. Speech playback, external
provider writes and deployment are not proved.

The local Room build also passes with the existing locked Wrangler 4.124.0
(`51197`, terminal `2f19a5`, exit 0). Its dry-run lists the private
`APPLICATION_CONTENT` binding. All 283 bundle inputs exclude Counter and
Lending browser modules and their retired asset routes. Output and source map
are under `/tmp/artroom-m1-room-dry-run-20261018/`, with log
`/tmp/artroom-m1-room-dry-run-20261018.log`. This checks configuration and
bundling without deploying or provisioning resources.

The install dependency namespace is a private filesystem COW copy: 13 local
first-party links, 106 verified installed versions, zero package installs.
Reviewed runtime dependency edges are recorded in the finite client,
platform and MCP Git dependency audits under `/tmp/`. The platform-to-client edge was then removed with the codec move. The
read-only audit `/tmp/artroom-m1-wire-layer-dependency-view-20261018.json`
checks the same 13 local links and 106 installed versions, unchanged package
keys and resolutions, and zero installs. The current ignored install stamp
is `c6407f32d6fee42d134008f8644064c0426c435968a60c67353cf7fe7a0268bb`.
The frozen developer checkout and root dependency view are untouched.

The first gate stopped on two trailing blank lines before typechecks or
tests. The next stopped at Page's typecheck when the new CLI adapter pulled
server dependencies into browser consumers. Both corrections are retained in
Git and their raw logs. The corrected full run at `09a839ac` completed all
Vitest projects: 1,820 passed, eight failed, and three skipped. Those eight
failures identified the new pins missing from golden observations, old
Destination7 unsupported-version controls, missing MCP reference and command
table rows, and stale generated Page bytes. No other test failed. The chained
Node checks did not run because Vitest failed. Original raw logs are in
`/var/folders/2x/wylr59t17ds36l1l7ng25y7w0000gn/T/tmp.hovmUhKREC`.

The complete 41-definition catalog was separately generated and validated in
`/tmp/artroom-m1-install-complete-catalog-validation-20261018.json`. This is
an observation for golden pin literals, not a gate result. The next unknown
Destination version remains refused. The existing supersession witness now
also exercises Destination7. Generated MCP schemas and Page bytes are updated.
The package inventory rows use the actual native install witness rather than
the older room's factory recipe. Lending runs that native tool in generic
mode, while Counter covers default mode and CLI-to-MCP recovery. The metric
name allowlist includes both fixed application tools; the existing concurrent
observation witness checks their separate read counts and retained phases.

All 21 affected Node cases pass (`43196`, terminal `3d4f3b`, exit 0).
Eight selected native cases pass (`48126`, terminal `9692c4`, exit 0),
including the two older W1 recipe modes, Directory-owned install scenarios,
and Destination's exact-version host check. Seven unchanged cases in those
selected files are explicitly skipped by the focused title filter. Logs are
`/tmp/artroom-m1-install-integration-node-20261018.log` and
`/tmp/artroom-m1-install-integration-native-20261018.log`.

The next full run at `95946691` passed all 1,829 Vitest cases in 368 files,
with one file and three cases skipped. Its chained Node checks passed 28 and
failed three architecture checks: the new platform-to-client codec edge,
the MCP Git dependency, and the broad MCP Git import. The Counter Node body
was not reached. Original raw logs are retained at
`/var/folders/2x/wylr59t17ds36l1l7ng25y7w0000gn/T/tmp.juxPrOXJo1`.

The layer correction above removes the platform edge and narrows MCP to the
explicit immutable reader. All ten architecture checks pass (`79668`,
terminal `eca340`, exit 0), including the exact permitted and refused import
controls. All 22 selected codec, pin, native-rule and Page cases pass
(`63385`, terminal `188965`, exit 0), and all nine native install and transport
cases pass (`77314`, terminal `447e9f`, exit 0). The complete typecheck also
passes. Logs use the `/tmp/artroom-m1-wire-layer-` prefix. Page assets rebuild
from the corrected shared codec; no application or provider rights were
added by that move.

The import-boundary fault control passes (`23562`, terminal `1966d6`, exit
0): broadening the exact reader exception makes the existing architecture
witness fail by its intended broad-import assertion. Source is restored.
The record is `/tmp/artroom-m1-wire-layer-import-control-20261018.log`.

The shared-codec move changes compiled presentation identities. The full live
browser witness therefore runs again at
`cc9d8bf0716a810e5132dfd68e0b512fda002edf` (`13018`, terminal `cae439`, exit 0).
Both complete packets pass actual Membership7 enrollment, signed Counter
Join and Lending donation, private-key restoration and proven native replay
through Room. The 75 request records, new packet manifest and four screenshots
are under `/tmp/artroom-m1-live-browser-20261018/`, with raw log
`/tmp/artroom-m1-wire-layer-browser-20261018.log`. Fresh mobile Counter and
desktop Lending screenshots were inspected. There are no JavaScript errors
or unexpected console errors; the two unpublished-page 404s remain explicit.
The earlier Room pass remains separate under
`/tmp/artroom-m1-live-browser-4c176f88a-20261018/`.

The final production Room dry-run also passes with locked Wrangler 4.124.0.
Output is `/tmp/artroom-m1-room-wire-layer-dry-run-20261018/`, with log
`/tmp/artroom-m1-room-wire-layer-dry-run-20261018.log`. It lists the private
R2 binding and makes no deployment or provider change. The packet comparison
under `/tmp/artroom-m1-wire-layer-packets-20261018/` explicitly records the
changed bytes rather than borrowing the earlier browser identity.

The run at `459399ec` passed 1,824 cases, with three skipped, but Lending's
five-case custody suite could not load. Its string alias appended the new
`/application` subpath to `bytes/src/index.ts`. The raw result remains in
`/var/folders/2x/wylr59t17ds36l1l7ng25y7w0000gn/T/tmp.dECKl5ubPp`.
The alias now matches only the root package name; subpaths use the package's
exports. The same correction applies to Counter's test and Vite configs.
All 13 affected existing cases pass (`62810`, terminal `e2bf8a`, exit 0).
The record is `/tmp/artroom-m1-subpath-alias-tests-20261018.log`.

The actual Vite preview then exposed missing wordmarks. Preview-only links
now point to the source SVGs and import the local font stylesheet. The browser
typecheck passes. Fresh Chromium renders the existing fake preview with its
wordmarks and fonts, no overlay, horizontal overflow, failed request, or
console error. The screenshot was inspected. Scripts and raw records use
`/tmp/artroom-m1-subpath-preview-` names; the corrected result and PNG are in
`/tmp/artroom-m1-subpath-preview-browser-fixed-20261018/`. The browser and
server are closed. This is preview import/rendering evidence with fake
transport, speech and authority, separate from the successful live native
packet witness. The maintained package entry points are unchanged.

The run at `8bdda9f2` passed all 1,829 Vitest cases and all 31 chained
Node checks, with three Vitest cases skipped. The final Counter Node body
could not bundle because its root-only esbuild aliases had the same subpath
problem. It did not run any of its 55 cases. Its complete record remains at
`/var/folders/2x/wylr59t17ds36l1l7ng25y7w0000gn/T/tmp.U2ja9WpnTA`.

The Counter bundler now reads literal runtime exports from the three owned
workspace manifests and resolves them inside those workspaces before building.
Types-only exports stay out of runtime bundles. Existing pinned-tool,
dependency, metafile, current-source and output ownership checks remain.
The owning body now passes all 55 cases (`1519`, terminal `12794e`, exit 0).
The raw log is `/tmp/artroom-m1-counter-export-aliases-20261018.log`; its
metafile and compiled cases are retained in the evidence directory it names.
This is a test-tool resolution correction; maintained packet bytes and
native behavior are unchanged.

A complete gate on the corrected submitted head, finite Source evidence,
independent review, native landing, sealed receipt and Main audit remain due.
Planner owns publication and any authorized Cloudflare provisioning or
deployment after that review.
