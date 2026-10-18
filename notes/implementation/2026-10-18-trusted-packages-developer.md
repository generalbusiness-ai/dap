# M1 developer half

This Source completes developer request `4735dfeed42d310099ea91521ed3998b74628c20`
and promise `8fb3e144c5ccd8dcc151d673ad89d57380a7bbca`. The parent M1 request
`eca1c7ee` remains open for the host and install half. Planner decision
`c643756e` confirms this split. This head contains audited Main
`feccbbcfef618ed560e441a7711ce80941b57c22`.

The developer can create a source project, compile its screen, pack signed
bytes, check a declared native scenario and run a local development host.
Counter and Lending now have maintained package sources and scenarios. Their
existing hosted routes still work. URI resolution, host trust and storage,
installation, production room binding and removal of hosted application
composition belong to the install half. This head claims no deployment or
completed M1 acceptance.

## Source map

| Files | Purpose |
| --- | --- |
| `packages/cli/src/application-browser.ts` | Trusted-author browser compilation into finite package assets |
| `application-files.ts`, `application-command.ts`, `line.ts`, `main.ts` in that directory | Source capture, explicit config selection and owned command dispatch |
| `application-new.ts` | Private source template with a native notes declaration and TEST scenario |
| `application-scenarios.ts`, `application-local.ts` | Checked scenario execution, retained development session and bounded native reads |
| `application-dev.ts` | Loopback HTTP, inspection, native SDK routes, rebuild and live reload |
| `packages/scope/src/runtime.ts` | Export the existing native Reads class without importing the Cloudflare object class |
| `packages/cli/test/application-{pack,new,scenarios,dev,examples}.test.ts` | Filesystem, actual-bin, native SDK, replay and maintained-package witnesses |
| `docs/mcp.md`, `packages/mcp/test/recipes.scope.test.ts` | Describe and check local commands without offering them as MCP recipes |
| `packages/cli/package.json`, `package-lock.json` | Explicit pinned esbuild runtime dependency |
| `apps/counter/{dap.application.json,scenarios/application.json,browser/application.html,APPLICATION.md}` | Current Counter package, scenario and developer instructions |
| `examples/lending/` with the same four paths | Current Lending package, scenario and instructions |
| `apps/counter/browser/view.ts`, `src/counting.ts`, `test/counting-route.test.ts` | Package-relative wordmarks and compatibility with the existing stage route |
| `apps/counter/browser-build/counting.js`, `src/counting-assets.ts` | Matching regenerated existing public Counter assets |

The portable codec, shared browser custody and meaningful-scenario requirement
landed in the [foundation](2026-10-18-trusted-packages-foundation.md), approved
by `87fed576`, receipt `b44d7c75`, audit `9211cd19`. Their signatures, domains,
limits, closure checks, storage epochs and original-request recovery remain
the basis here. Native judging, fold, identity, replay and grants are unchanged.
The historical developer checkpoint narrative remains in Git at
`9c92f9bb584a32d351cacce66122caba1258d526` under this same note path.

## Local source and compiler

`pack`, `check` and `dev` accept `[directory] [--config relative-file]`.
The default config is `dap.application.json`. The config and all source paths
inside it are relative to the explicitly selected root, not its containing
subdirectory. Config files obey the same bounded regular-file reader as other
inputs: no absolute paths, dot segments or symlink components. Config selection
and scenario files do not enter package identity. Existing output files and
symlinks are preserved; pack requires an existing publisher key.

A presentation may declare `browser: { entry, html, script }`. The HTML has
one module script for that source entry. The fixed compiler bundles TypeScript,
CSS and the shared client, then writes the HTML/JS/CSS into the in-memory
package. It creates no generated checkout directory. Other declared static
assets retain the portable codec's limits, path checks and identity rules.

Compilation runs the CLI's pinned esbuild 0.28.1, without application plugins
or build scripts. Other imports are trusted-author local inputs. This is not
hostile-filesystem isolation, an atomic source snapshot or arbitrary-package
admission. Installation must validate under the host's own bounds.

The CLI manifest now names esbuild as a runtime dependency. The lock adds that
edge and removes development-only flags from 27 existing esbuild/platform
records. No package key, version, resolution or integrity changes. The private
view has 13 correctly rebound workspace links and 106 matching installed
versions; nothing was installed. Its audited lock SHA-256 is
`68985f4a1a57919e15eed71764a49cb564b025b3f28f5404f1676a6841f8cca9`.
The shared Main dependency view remains untouched.

The confirmed release address is
`git+https://<lowercase-host>/<repository>.git/@<full-commit>/<tree-path>`.
The commit is full lowercase SHA-1 or SHA-256; paths use canonical percent
encoding. No credentials, query, fragment, dot segments, floating refs or
fallback version. The expected release id is a separate argument. Planner
report `866c7ae7`, ratified `f0f35bf7`, confirms this spelling. Its resolver,
exact regular-blob capture and operator trust check remain install work.

## New and check

`dap new <directory>` refuses an existing directory or symlink and writes
private files below an existing parent. A filesystem error may leave the new
partial directory, which the command reports. The basename supplies an
example logical name for the author to change.

The template contains a bounded native notes declaration, a browser key
starter, CSS, config, README and a five-step scenario. Public TEST actors
check author-only completion and refusal without a grant. The screen creates
or reuses a non-extractable browser key through shared locked storage; it
creates no membership and submits no native act. Forms and enrollment remain
author or host binding work.

`check` prepares the same package without reading CLI custody or publishing
output. Each declared scenario must check an act/retry answer or nonempty
native state, then replay consistently. The existing executor closes its
scope and clears TEST seed copies. `openApplicationScenario` transfers the
checked scope to dev only after both behavior and replay succeed; its caller
owns closing it. Returned seeds and actor relationships are explicitly public
TEST metadata, not production credentials or membership.

## Dev

`dap dev [directory] [--config relative-file] [--port port] [--scenario file]`
binds only loopback, default port 5173. It opens the selected listed scenario
or the first one. `/__dap/` inspects its actual in-memory SQLite scope,
public TEST actors and native replay. Preview files come from the package.
`/__dap/meta` intentionally exposes those public TEST seeds. This is a local
fixture, with open reads and scripted per-key authority.

Signed SDK requests use native Core and bounded Reads for acts, settlement,
summary, history, entries, items and retained inputs. An unknown key has no
grant; supplied grant bodies cannot enlarge authority. Host and Origin must
match the bound loopback service. Request bytes are limited before JSON parse.
External effects stay closed. There is no child transport, read-session
membership, provider integration or durable host persistence.

The logical clock starts at the scenario's final time and advances with
elapsed wall time when requests arrive. It does not schedule idle alarms.
SDK fixture callers use the reported time. Dev never rebases or re-signs an
old request. The existing Counter/Lending screens retain their real room and
device binding flows, so a disconnected preview does not enroll a TEST actor.
Native fixture interaction is available through the panel and SDK.

Requests and rebuilds share a queue. A presentation edit preserves the scope
and history. A semantic or scenario-input edit opens a new checked fixture
and closes the previous one. Build failure retains the old preview, reports
the error and pauses new acts; settlement and reads remain available.
A recursive watcher ignores Git and dependencies, debounces edits and sends
SSE reloads. Dev's preview label and reload code are outside canonical package
bytes. Closing stops the watcher, timers, SSE clients, server and scope.
SIGINT/SIGTERM close the owned host; the actual-bin process-group witness is
POSIX only.

## Maintained applications

Counter packages the current browser's `commitments.json`, native digest
`sha256:b55824346382d9b158be4cadd9d098008f8129147fba772537778e2f738d5271`.
The older `definition.json` remains historical support. The scenario activates
two participants, checks an original retry, refuses another participant's
fulfilment and a consecutive turn, and finishes a count of two. It passes
15 steps with native replay through sequence 10.

Lending packages its current native definition,
`sha256:6fff876ce1c64afedfe9b5ba2864aa31a7a7d5e7e05d7b83619c00e168786ee7`.
Its 11-step scenario replays through sequence 4: donate/retry, refusal without
membership, borrow, return, staff-only retirement and refusal outside `shelf/`.
Publication remains queued to an explicit destination reference stand-in.
No provider receives a page. Refusals do not create journal entries.

Each package includes compiled screen assets, relative font/image links,
favicons, eight font files and three font licences. Counter's wordmarks now
resolve beside its script. The existing `/counting/brand/` compatibility route
uses the shared explicit public brand list. Packaged entry HTML is separate
from the hosted entry; neither app's existing enrollment flow is reinterpreted.
Admin defaults propose control or staff actions; member/agent defaults omit
them. These declarations grant no authority. Admin selection and confirmation
belong to the install act.

## Verification and limits

Focused compiler, generated-project, native scenario, SDK HTTP, actual-bin,
MCP inventory and native recipe checks pass. Their original checkpoint
results and selected assertion controls are retained in the finite evidence.
The foundation's completed gate and review are separate from this head.
The final gate result is recorded in the Source's accompanying Gitseq assert;
this note does not predeclare its result.

New focused checks pass: config selection and root confinement (`eb176d` to
`b175ef`), actual dev bin with selected config (`c34c78` to `361808`), maintained
package closure/resources/native scenarios (`d2a35b` to `9ec4a5`), and existing
Counter route compatibility (`36d305` to `871a87`). CLI source/test and Counter
browser typechecks pass. Initial maintained checks refused missing exact
refusal reasons and a nonexistent item revision; corrected fixture inputs use
exact native reasons and the actual journal sequence. Native rules did not
change.

Browser plugin tools are absent. Cached Playwright 1.63.0 and Chromium
153.0.8010.12 use fresh temporary profiles and owned local servers. No package
or browser was installed. Three browser witnesses cover:

- The generated starter's real IndexedDB, non-extractable key and reuse after
  reload (`4f48ad`), with no native act.
- The actual dev watcher, native Node SDK act, preserved receipt/key after CSS
  reload, failed-build recovery, semantic restart and inspection panel
  (`065cb3` to `4a5a7b`). The native act is Node SDK, not browser enrollment.
- Both maintained screens under a nested package URL, all requested resources,
  no console errors, desktop 1280 by 800/light and mobile 390 by 844/dark
  (`490f39` / session `76037` to terminal `2efd9c`, exit 0). Sixteen requests stay
  within packaged paths. This is static delivery and disconnected screen
  evidence, without native acts, enrollment or speech.

Screenshots are inspected. The first Counter dark image caught its colour
transition mid-frame; the settled capture waits for the foreground colour.
No stylesheet fix or runtime failure was implied. Earlier logs and the image
are retained. All browser and fixture server processes close before return.

Source covers the complete developer half within the agreed split. It does
not complete room installation, membership or hosted birth, real devices,
provider publication, archive admission, arbitrary-package isolation, upgrade,
production operations or deployment. Historical register/directory/membership
pins and replay support remain; active host composition is removed only in
the install half.
