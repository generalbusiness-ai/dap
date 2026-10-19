# G3: durable application-owned presence

Request `8614ac1e0789eb5d323ad8853ee671ee3c357470`; promise
`3b26a047e49ef80a0d7b6fb22a1ec05a66a18e4c`. This is a separate head
from the published first G3 delivery. The base is actual Main
`9554919beb3581ffe1124fcb2a70fab6bf20fbd2`, including the approved members
and presence design. Checker audit `b712c8ef` independently confirms that
the note is exact and every previous G3 runtime leaf is unchanged. Its
prior-incorporation receipt is not a normal new-merge receipt; no trailer
or sealed successor map is inferred.

## Chosen existing forms

One Site has at most 32 nonfinal presence items. That is a finite application
limit, within the native many-item projection and read bounds. It is not a
limit on all platform members. Each item has a fixed full MemberRef party,
states unknown, present and away, an optional room item ref, and an optional
reportedAt fact ref under the Site definition, of kind arrive or leave.

The admin's provision-presence act opens the item under grow.configure.
A native range guard refuses duplicate members by name. Initial unknown
has neither a room nor a report fact. Only arrive and leave report a
member's location: they transition that member's item, checked against the
signer. Arrive can move A to B. Leave requires present state and the current
room; a wrong-room leave refuses by name and leaves the last report fact
unchanged. A matching leave sets away, retaining the room that was left.
Both accepted reports set reportedAt from self. Native self refs store the
actual local entry position. The declared projection supplies its full
captured Site scope and incarnation, independently of item revision. An
exact known-position read resolves the native entry and hash; a failed
lookup stays unavailable. Assertion `903895eb` and the checker's addressed
reply record that no extra full-hash materialization is needed for F3.

Task routing reads the complete bounded presence-item projection through
the existing declared Site read and maps the room item to its full scope.
Missing and unknown items remain unavailable. Away means no current room
assignment. The recent-activity log may retain a bounded journal projection,
but task routing reads no history window. No native form, signer index,
hidden scan, device location or mixed queue is added.

## Witnesses to collect

The owning witnesses must distinguish initial unknown and duplicate
provisioning; another signer's refusal; move A to B followed by a named
wrong-room leave and its unchanged report fact; matching leave to away;
present, away, unknown and missing-item task selections; persistence after
more than 100 other Site reports; and an arrival whose entry position
differs from its item's revision. The kit/browser witnesses also retain
app-only data, quiet context, receipts, stale refusals and reciprocal
phone/desktop resizing. Run focused checks during work and one final gate
before exact-head review. No validation is claimed by this preparation.

## Dependency preparation

The fresh checkout owns a private APFS copy-on-write view from the frozen
first G3 donor. Only the destination's 13 workspace links and Vite caches
were changed. All 106 maintained and four named nested manifests have
equal bytes and different inodes. Zero installs; unchanged lock SHA-256
`3546b5384c9245fb646c4f7c22cabde0f4351b05dfcec704d1bdeb170666361a`.
This is copied-version/link validation, not full tarball integrity.

Audit `/tmp/artroom-g3-durable-dependency-view-20261019.json`, SHA-256
`a7f9dee08f8b87052359a4eb14fa7018b7bd06f64425615d145f322cf00fbfe0`.
No frozen donor source, dependency or evidence file was changed or run.

## Development witnesses

Memory Site/Room tests pass seven cases in
`/tmp/artroom-g3-durable-site-room-local-fact-20261019.log`. The Site
witness proves unknown provisioning, named duplicate and signer refusals,
arrival at actual entry 111 while item revision is 2, move then wrong-room
leave with unchanged report, another 101 reports with unchanged member
state, matching leave to away, and native replay. Earlier runs caught a
missing required state guard, an incorrect test/helper assumption that
Party wrapped its MemberRef, and an incorrect expectation that a raw self
ref stores a hash. All failed logs remain. Existing Native validation was
not relaxed. The labelled Directory launcher now declares only its actual
creation row/root item, rather than clone Site self-fact declarations
under a different definition name.

The actual dap launcher, `packages/cli/bin/dap.js`, passes the 13-step Site
scenario with four projection checks and the unchanged 202-step G0 fault
scenario with three checks, both with native replay. Evidence:
`/tmp/artroom-g3-durable-dap-check-scenario-name-20261019.log`. Its eight
non-native scenario-owner outcomes remain labelled and belong to G5a.
The first main.ts command merely imported the module and ran no check;
the first actual launcher attempt refused an invalid scenario name with
spaces. These are retained attempts, not validation passes. The corrected
fixture has a bounded scenario label. CLI maintained examples pass two
cases in `/tmp/artroom-g3-durable-cli-examples-20261019.log`.

Both Core/SQLite kit cases pass in
`/tmp/artroom-g3-durable-owned-routing-first-20261019.log`. They prove the
same local report position under the exact captured Site scope, a direct
known-position read matching the actual receipt's full fact, honest failed
lookup, retained presence after 101 other reports while the activity window
contains only those other reports, and native replay. The queue case keeps
all nine role/type selections, missing and provisioned-unknown placeholders,
captured-unknown and away-before-Take refusal with zero signatures, persistent
task selection beyond the activity window, named wrong-room leave, actual
Take/Report/Approve/Decline, receipt/refresh separation and empty recovery.
Install lookup, membership, sessions and grants are explicit TEST ports.

The separate installed Worker owning case passes in
`/tmp/artroom-g3-durable-production-owning-20261019.log`. It retains actual
native install, issued session, production viewer adapter, related Site
read and public SDK parity on the existing empty-queue boundary. It is no
production nonempty-routing claim. MCP's four compiler targets and Grow's
own compiler pass in the `mcp-types-first` and `grow-types-first` logs under
the same prefix.

The browser driver passes both 320 and 592 px widths, reciprocal resize,
initial missing/provisioned-unknown read points, 101 other-member reports
without losing the task, wrong-room refusal, quiet context, app-only read
denial, five actual MCP signatures per width and all three scope replays.
Evidence: `/tmp/artroom-g3-durable-browser-points-20261019/` and its log.
Cached Playwright 1.63.0 and Chromium 153.0.8010.12 were used because the
Browser plugin was unavailable; no dependency was installed. The report
consumer is scripted typed text, not an LLM backend. Task and unavailable
phone captures were inspected: text wraps, read points fit and controls
remain visible. There is no provider, device or hosting outcome.

The first browser run failed its quiet-context count before the changed
Site point had been published. Its complete failure capture/log and driver
copy remain. The corrected witness waits for that exact Site point in both
captured reads and for the idle card before measuring two unchanged refreshes.
The kit runtime was not changed. These development observations have no
separate frozen input manifest and do not replace the final gate/head proof.
