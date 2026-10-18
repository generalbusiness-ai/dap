# Compact-card kit: implementation

This implements runtime child `6098b756`, promise `402ac9d4`, of parent
`a9551a6d`, with clarification `f89c614b` and captured-revision disposition
`c3079e3c`. The design child `bc635338` is landed on Main
`df806354`; its approval does not establish runtime behavior. Reviewed
capacity and the bounded Counting witness are now incorporated locally
through Main `6ce62bd2`. This branch carries both.

The current reference is
[the compact-card design](../2026-10-17-compact-cards-design.md).
The prototype is a behavior reference, not an implementation to copy.
The generic resources, browser bridge, screens and server instance guards
are implemented. The browser's card projection and remote scope answers
are labelled fixtures. Native tests separately use real scopes. No actual
journey-lane adapter, package installation, provider operation or desktop
AI-app acceptance is claimed. The parent remains open for its acceptance.

## Boundaries

The kit composes a generic card from its kind, exact displayed revision,
actor, reasons for attention, at most two acts, narrow model context and
useful text fallback. Needs you, Work, Decision and Change supply the
application data. Lane names and state transitions do not enter the kit.

The MCP service owns reads, signing and custody. The view holds no keys.
An opening tool returns identity, screen kind, revision, counts and a
short text fallback. Titles, bodies, actors and histories come from a
separate app-only call. Neither initial structured content nor result
metadata is assumed to be hidden from the model.

App-only visibility is enforced by the MCP Apps host. It is not proof
that a raw MCP client cannot call a tool by name. The basic-host witness
must filter the model's tool list and enforce same-server app calls;
server authorization still applies to every read and act.

Package resources provide HTML, an expected byte digest and resource
metadata. Check the bytes before serving them. Preserve declared CSP and
permissions rather than replacing them with an empty policy. The journey
resources declare no external domains. Host aliases and the dedicated
origin belong only in `views/hosts.ts`; the basic host must work without
that adapter. M1's package installation remains separate work.

## Service and bridge

`ServerPort.views` supplies an application's trusted projection adapter;
omission adds no view tools. `ViewSource` reads through the service's
normal authenticated calls. The kit contains no lane projection or state
machine. Four opening tools expose only screen, identity, exact revision,
counts and useful text. `view_read` and `view_act` are app-only tools.
That visibility is a host rule, not native authority.

Both wire revisions negotiate the host's MCP Apps capability. Without it,
the tool list omits app-only tools and UI resource links; opening tools
still return useful text. Paging cursors bind the capability profile.
Legacy notification accounting retains the underlying catalogue generation.
Resource bytes and metadata participate in the list generation.

`ViewResources` takes an immutable package snapshot. A read compares actual
UTF-8 bytes with the declared digest before serving them. It preserves
the package's CSP, permissions and border preference. `views/hosts.ts`
alone maps a declared DNS label or base32 presentation digest to its
`inguz.space` origin. The four built-in resources declare no external
domains or permissions. M1 package installation remains separate.

Both wire revisions serve `resources/list` and `resources/read` with their
existing discovery and result conventions. The modern result wrapper adds
its server metadata outside each resource's retained policy metadata.

The browser entry has its own DOM TypeScript configuration. The server
keeps Node and Workers globals. `scripts/views.mjs` builds four single-file
HTML resources from the production entry, bridge, stylesheet and template.
`view-resources.test.ts` rebuilds them and compares the served module and
byte digests. The fixture host and histories are not production inputs.

The bridge uses the standard MCP Apps handshake and accepts messages only
from its parent. It bounds outstanding requests at 32, with a 10-second
reply deadline, and clears requests and input waiters on teardown. It
boots from the standard complete tool-input notification, then reads the
card through `view_read`. It ignores the opening tool result for bootstrap;
the test host deliberately supplies neither initial structured data nor
result metadata. This is not a privacy claim about those host fields.

Navigation reads through the server and updates model context quietly.
Keep projection read points, actual entry bodies read, presented ranges,
intended review cutoffs and unavailable ranges distinct. Summary cards
claim no entry bodies. Back refreshes the parent while preserving the
selected item and return point; a failed refresh is not an empty queue.

Inline is the summary; detail requests full screen. Back requests inline
again. Respect the mode the host actually accepts. Measure the dedicated
content root after render, width and font changes, and report smaller as
well as larger heights. Use host style variables and no custom font load.

## Acts and the captured-revision prerequisite

The server must bind an act to the exact displayed revision and its
subject. It must also reject a superseded view instance and duplicate
dispatch. A disabled button alone establishes none of these properties.
Lost replies use existing custody and settlement, retaining the original
envelope; a view refresh or context retry must never sign a successor.

Previously, `McpService.#perform` always derived `expectedOf` from a fresh
summary. Planner report `c3079e3c`, answering routing request `c5a9acd0`,
brings forward only optional `at` input from S6 for the S2 model-act
witness. Omission keeps the existing fresh-summary behavior. A present
`at` names exactly the expected subjects with their displayed revisions;
missing, extra or malformed subjects refuse before signing with a named
reason. The signed `expected` set keeps those captured numbers. The
scope's own check refuses a stale revision; the service adds no second
judgment and substitutes no fresh revision.

Include explicit `at` in custody's meaning while preserving the meaning
bytes of omitted-input requests. Reusing a key with another captured set
must conflict. Re-reporting a kept request must retain its original
envelope, even after the current state moves; check new-envelope coverage
inside the existing custody build path. The witness must distinguish
native stale refusal from a service that silently refreshes or rejects
the revision before signing. Full S6 views and J1 remain separate work.

The optional `at` input is now in the declared, generic and preparation
act paths. It is copied and checked before custody computes the meaning.
Subject coverage is checked only when custody builds a new envelope.
Explicit revisions are part of the meaning and carried-byte accounting;
omission preserves the previous meaning bytes. The native scope remains
the only judge of whether the revision has moved.

Focused evidence on this development branch:

- `captured-revisions.scope.test.ts` passes against real native scopes:
  stale captured input is signed unchanged and refused `revision-moved`;
  fresh input succeeds; duplicate and settlement calls sign and submit
  nothing; a changed revision under the same key conflicts. Seven malformed
  or incorrectly covered sets sign nothing. The room helper labels its
  external host, scheduler and clock fixtures.
- Shape, description and budget checks pass: 32 cases, one skipped.
  The subject witness covers `on`, `one`, `by`, `via`, an unresolved
  subject, a rule-selected subject and a prototype-like alias.
- All three MCP TypeScript configurations pass.

The first two native runs failed because the new test assumed error
fields that this service does not return. Correcting the assertions to
its existing `message` field produced the passing run. Logs are
`/tmp/artroom-card-at-native-focused{,2,3}-20261018.log` and
`/tmp/artroom-card-at-shape-describe-focused-20261018.log`.
These checks do not yet prove that browser context matches the display.
The full gate and review remain due after the kit implementation.

After acceptance, keep a one-line receipt while loading the next card.
Record it in model context. If reporting fails, retry the notification,
not the act. Ordinary acts start no chat turn. Only explicit handoff uses
`ui/message`; free text goes to the host composer. Older instances keep
readable receipts and lose their write controls.

## Runtime state and evidence

The service retains at most 128 view instances, 32 write outcomes per
instance and 32 unresolved original requests per instance. A new opening
supersedes the previous instance for that screen.
The browser submits only its view key, display cut and action ID. The
server retains the native kind, fields, captured revisions and custody key.
It checks instance and display cut both before dispatch and again at
signing admission, after asynchronous reads. It re-reports duplicate acts.
A lost reply offers only settlement of its original request. An old view's
cached receipt stays readable; a server read or refusal marks its controls
inactive. Restarted or unknown instances refuse dispatch. This mounted-view
state is bounded memory, not durable custody or additional authority.

The displayed receipt is a short item/version/outcome line, with a native
entry position when available. It omits the opaque scope and custody keys.
The full native response and envelope remain under the existing custody.
An unavailable outcome also retains its original check. A full view refuses
another write before dispatch but still admits checks of its retained
originals. A focused interface test fills all 32 slots, refuses the next
write and settles an existing original without a new dispatch. The test
failed before the cache repair and passes after it; its scope and custody
answers are explicit doubles, not a native or provider witness.

The native card witness passes stale model and app actions through real
scopes, counts actual intent-domain signing calls, and checks duplicate,
lost-reply and superseded-instance behavior. A gate holds the native summary
read while a newer view opens; releasing it makes the older action refuse
before signing. This uses no timing sleeps. Its first gate match used an
incorrect `/summary` suffix and timed out; the corrected match uses the
actual summary route. The retained log is
`/tmp/artroom-card-native-race-focused-20261018.log`. The independent
captured-revision witness also asserts a nonzero native submission count
before checking that retries submit nothing.

The browser flow is: opening tool, sandboxed app-only read, carousel,
title, detail, diff, Back, act, retained receipt and refreshed next card.
The test host uses two loopback origins, a trusted cross-origin relay and
an opaque inner iframe. Its CSP is built from resource metadata. It filters
model and app tool lists and routes only to its own MCP service. It labels
both its projection and remote scope answers as fixtures. This does not
turn host visibility into server authority.

The first browser matrix completed 20 assertions but required owned-process
termination because the fixture omitted legacy subscription cleanup. The
host now ends its legacy sessions and subscriptions. Two later matrix
attempts timed out waiting for a next card; isolated loss and context-report
cases passed. Successful context acknowledgements no longer rebuild the
DOM. The reusable script waits for the host's actual iframe resize before
hit-testing controls, rather than treating visible inner DOM as proof that
the host has resized. These observations do not establish the cause of the
earlier intermittent timeouts or cure broader harness request `1d3a13e3`.

A 20-scenario run then exited normally with no browser or protocol errors.
It covered 592, 390 and 320 px cards in light and dark, 200% text, keyboard
focus, Back position, diff controls, complete and partial updates, failed
checks, unknown outcomes, denied full screen, failed context reporting,
superseded instances, model-context revision binding and host tool filtering.
A later pointer probe explicitly waits for iframe resize, verifies the
actual pointer-down and checks that a theme update keeps the pressed control
mounted. It signs once and advances. Earlier raw-pointer attempts used
coordinates before resize or checked connectivity after successful navigation;
those were incorrect probe assertions, not proof of lost native writes.

The receipt rehearsal uses the same fixture flow twice. The in-place mode
posts zero chat messages and starts zero model turns. The explicitly labelled
prototype-policy shim posts one message and starts one model turn. It does
not run the old prototype or a real model. The chosen in-place flow preserves
the receipt, context and next card without the extra turn, as `f89c614b`
requires. Only an explicit Ask in chat control sends `ui/message`. No card
has a free-text input; text stays in the host composer.

Run the reproducible browser checks with pinned Playwright 1.63.0 installed
outside the checkout:

```sh
PLAYWRIGHT_CORE=/path/to/scratch/node_modules \
CHROMIUM=/path/to/chrome \
VIEW_CAPTURE_OUT=/tmp/card-kit-proof \
node --import tsx packages/mcp/test/views-browser.mjs
```

The Browser plugin is not available in this session, so the frontend-testing
skill's Playwright fallback is used. No browser dependency is installed in
the checkout. The capture script writes screenshots and its report only to
the selected scratch directory. Its report names the actual Chrome version.
The final frozen-head capture and gate are recorded separately as Gitseq
evidence after this note is committed. This is a pre-freeze statement, not
a claim that either pending run has passed.

### First gate and repair

The first frozen head, `21296fda`, completed its 24-case browser capture.
Its gate failed: two tests failed, 1,674 passed and three were skipped.
The failures were the derived MCP reference and the unfamiliar application's
exact schema property list, both stale after adding optional `at`. Node
and generated Counting stages were not reached. Evidence `8726870b`
retains that failed gate; it is not a pass for this repair.

The repair regenerates the generic Markdown schema blocks and complete
admin tool JSON from the existing derivation, documents captured revisions,
and updates the exact property witness. Focused reference/resource checks
pass eight cases, and unfamiliar-application/card checks pass two native
cases. The phone receipt is shortened and the cache settlement boundary
is repaired as described above. The repaired-head browser capture and
single gate remain due when this note is committed; their later terminal
evidence names the exact repaired head. No unchanged whole suite was rerun.

The parent remains open. Actual journey-lane projections, package installation,
provider operations and desktop AI-app acceptance are separate obligations.
Builder performs no deployment. Planner publishes reviewed Main and workroom
state and may deploy under the user's authorization. npm publication remains
held.

### Source-boundary check repair

The repaired head `eaa6e67a` passed all 334 Vitest files and 1,677 cases;
one file and three cases were skipped. Its Node stage passed 28 cases and
failed one source-boundary check. Generated Counting was not reached.
The failing rule accepted only flat `./file` imports and rejected every
`../` spelling, including valid imports within the new server subdirectory.

The check now uses the existing module-specifier parser and resolves each
relative import to a tracked file within `packages/mcp/src`. Its allowed
package list remains the same. Focused Node checks pass nine cases,
including internal nested imports and refusal of test, browser, other
package and package-parent escapes. This changes the check, not the MCP
runtime. Runtime, browser, fixture and native-witness files remain byte
identical to `eaa6e67a`; the 24-case browser evidence carries by that exact
identity. The final-head gate remains due when this note is committed.
Both earlier failed gates remain failed evidence, not reconstructed passes.

Protocol reference: [MCP Apps, stable 2026-01-26](https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/2026-01-26/apps.mdx).

### Actor identity repair after review

Checker report `312f8b21` requested one change at `e787dce7`: the agent
and checker marks were reversed from the approved design. The generic
renderer now uses a circle for a person, a square for an agent and an
outlined diamond for a checker. Names, role text and the agent's
controller remain beside their decorative, aria-hidden marks.

The browser matrix now checks all three rendered identities in each of
its six light/dark and 592/390/320 px cases. It retains the exact marks,
names, roles and controller text in the report. All 24 browser cases
passed with the rebuilt four HTML resources, including those 18 actor
projections, with no page, console or host protocol errors. The resource
checks passed three cases. The retained agent and checker captures show
the repaired shapes; these remain fixture-host witnesses, not desktop
AI-app acceptance.

The first restricted browser invocation exited 13 at host startup with
an unsettled top-level await and ran no assertions. The separately
authorized loopback/Chrome invocation exited 0. Its launch log retains
the DEP0205 warning. No general startup or harness cure is inferred.

The prior `e787dce7` gate subsequently passed under evidence `823af770`:
334 Vitest files and 1,677 cases passed, one file and three cases were
skipped, and 30 Node plus 55 Counting cases passed. That closes only
that head's earlier pending gate language. A new final-head gate remains
due for this repair; earlier failed gates, browser attempts and checker
findings remain their recorded outcomes.
