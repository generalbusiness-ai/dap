# Page head-stream fallback

The deployed Page passes the two-browser polling witness. The Counter repair
passes gate 2 at its later frozen checkpoint. Gate 1 and all earlier failed or
incomplete attempts retain their original outcomes. The receipt audit passes;
finalization binds retention to the reviewed note.

## What changed

Request `5874b15de9079d93cbcbf8ac44d22778d065af33` adds one view-lifetime
observer and visible summary polling during transient head-stream outages.
Redraws reuse that owner.

The retained Page setting `pollIntervalMs` defaults to 5,000 milliseconds and
accepts finite numbers from 1,000 through 60,000. Invalid or nonnumeric values
refuse. Changing the setting changes owner identity and reconfigures it. One
short status line reads, by default, “Live updates unavailable. Checking every
5 seconds.” It disappears as soon as a valid notice restores the stream.

The client observer adds two local states. `fallback` reports the start of a
transient outage once, with its reason and optional retained complete view.
`streaming` reports the first validated notice of each connection before a new
snapshot request, including a notice equal to the retained head. A valid notice
resets outage tracking and reconnect backoff. Existing forbidden, unsupported
and protocol/error states remain terminal and do not start polls.

A successful response that ends before any notice now raises
`HeadStreamUnavailable` with reason `stream-ended-before-head`. EOF after a
notice and session-expiry renewal also make transient outages visible. The
default reconnect waits are 1, 2, 4, 8, 16 and then 30 seconds, capped at 30.
The per-read timeout no longer clips the reconnect delay. Cancellation ends the
local wait even if an injected delay callback ignores its signal.

The Page reads complete authenticated summary heads while the stream is
unavailable. Reads remain serialized and bounded. A valid restored notice, even
for the same head, clears the timer and aborts the active fallback read before
another stream snapshot completes. A stale completion cannot redraw a retired
view. A list view without a supplied head accepts its initial summary as a
reason to redraw once, so an entry arriving between the list read and
observation setup cannot remain absent under same-head polling.

The diff changes Page lifecycle, adapter, owner, tests and assets, plus client
parser, observer, tests and docs. Native definitions, kernel, Worker routes,
stream wire and session rules stay unchanged. Signed mutations and
authenticated reads keep their authority boundaries.

## Decisions and limits of the owner

The binding includes settings context, route, interval and actual selected
scope identity. Settings context includes service origin, place, public key and
register. Lane views supply their full scope reference; the authenticated
initial summary fixes the complete scope reference and definition for later
snapshots. The observer also captures exact membership, member, key and
expected deployment identity. A route, context or workbench retirement cancels
the old owner; checks after awaits suppress stale drawing.

The Page explicitly trusts its own serving HTTPS origin and its accepted native
read-session response for the initial deployment identity. It captures that
value once and requires every renewal to match. This is same-origin service
trust, not an independently pinned deployment assertion. Deployment, member,
key and membership mismatches must be checked before a renewed reader can
replace the shared Room reader. The adapter can return a mismatching session to
the observer for its existing error emission without poisoning the shared Page
reader. A later mismatching poll supplies no snapshot.

The Page owner applies its polling interval as the local load/poll deadline;
its client observation adapter uses a ten-second operation bound. The native
stream's existing raw frame/chunk/turn bounds remain in force. No whole-stream
buffer or lifetime byte quota is added. Default reconnect backoff is
independent of those per-operation waits.

There is one physical load/poll promise at a time. Retirement retains and joins
that promise. An ignoring transport may therefore delay retirement beyond its
local timeout. The client observer's cancel contract resolves its local waiting
and asks fetch/body disposal to stop; it does not prove physical drain of an
uncooperative upstream. These are lifetime and stale-result protections, not
universal resource-cancellation guarantees.

Polling never submits an act, settles a pending request or changes a sending
fence. Head notices and changed summaries only trigger ordinary redraws.
Original mutation custody, unknown outcomes and exact-request recovery stay
with their existing owners. A comment appearing through fallback does not
establish that another local pending mutation took effect.

## Source and evidence qualifications

The earlier drafting source was `525c845c1f4cfe81e8eff8f4f26240f378ffedff`,
tree `0bfa0804a365af89481aadf387c51d4b1b58e5bd`, over base
`1f57314592ebbd331967d4ee85edfaa39606ad5d`. The first 23 formal captures below
run at `0de86403f249667b47cd3608f2d25f3870b78391`, tree
`831c9b30537532ecd365c4df7ef48c78233d6b28`, after the H3 landing and rebase.
Earlier mutable debug runs keep their own source qualifications. No result on
an earlier tree becomes an execution on this later checkpoint. The five focused
Counter repair captures use `ce4cec64` / `caa0220`, as does gate 2. Each
command record retains its full checkpoint and tree.

The preparation catalog is
`operator-inputs/public-selection-1/prior-inputs/manifest`. Its
`public-inputs.json` lists 102 existing public scratch files and 192,776 bytes.
Its `checks.json` names 22 recorded command/terminal observations with exact
argv/cwd where retained, actual exits, stream hashes, test counts and source
qualifications. Null means absent; empty output alone does not supply an exit.
The two saved commit-message files give request context only, not execution
receipts or a committed checkpoint.

The client packet has two compiler passes and one 20-pass observe file. An
early Page compiler log has three optional-property undefined assignments and
one invalid issue ScopeKind. Its argv and exit remain unknown. Later empty
compiler streams lack a receipt and remain unknown, not a pass.

An early unreceipted Page owning log prints two passing tests but lacks actual
argv/exit. Later receipted owning checks pass two tests, then four tests after
review repairs. The four-case owner uses the actual Main render/lifecycle
boundary with scripted DOM, data, authenticated sessions and streams. It shows
empty EOF followed by a later comment within two configured intervals, a
working stream with no polls, same-head restoration aborting an old poll and
rejecting late paint, the initial list/head race and a wrong-deployment renewal
preserving the shared reader. It is not a rendered browser or native authority
witness.

The ten-pass/four-file Page regression run predates the final deployment-trust
renewal guard and full lane-reference key refinement. It does not validate
those later changes. Final source/test compiler records and the later four-case
owning run keep their own mutable-source qualifications. None of these focused
records supplies a frozen-head gate.

The original EOF control has baseline 0 with 20 passes and mutant 1 with 19
passes and one failure, but helper 2/INCONCLUSIVE retains its classification.
Human stderr prints AssertionError; the machine failure starts `Error: promise
resolved ... instead of rejecting`.

The corrected test retains the rejection, error type/reason and reader-release
assertions but captures the thrown value before ordinary assertions. Its
focused test compiler exits 0. Repeating only the EOF control gives baseline 0
with 20 passes, mutant 1 with 19 passes/one ordinary AssertionError at
`observe.test.ts:141`, and helper 0/DISTINGUISHES. `undefined` is not an
instance of `HeadStreamUnavailable` in that mutant. This corrected packet
contains no rerun of the poll-stop control.

The separate original poll-stop control suppresses `stopPolling()` on a
streaming notice. Its baseline exits 0 with four passes; its mutant exits 1
with three passes and one assertion failure at `page-observation.test.ts:96`,
where an old poll must have observed abort. The helper exits 0/DISTINGUISHES.
These are finite individual controls, not a mutation sweep.

The original control packet records clean before/after custody at
`ec34748bf20695e3c980ba347fff1e47e5f32511`, tree
`d80862067d25be39f02d1c09aca587c0f5c41f94`. The corrected packet records that
same base with `packages/client/test/observe.test.ts` modified before and
after; it is a mutable test-only state, not an execution on the clean tree. Its
actual test hash is
`d753731d56fa895bf7eaa7c2d8dc047c66ecda0694e671358a246c2c05511d1f`. The
stream-parser target remains
`2bacd1b4b417fab6880c171489b21f81a924645ff572f9af625b40de85dd4407`. The helper
remains `bff307713ec86853c65815f5d7911cdff03bbfcb42d75c7c0d6647bdcf30bc87`. All
three controls retain exact target/helper restoration with no external restore.
The corrected test stays unchanged during its control. These finite
before/after records do not establish continuous source isolation.

## Evidence table

Each old check row selects `checks.json.checks` by the exact `id` in its first
column. That record retains argv and cwd, including nested relative cwd and
temporary paths. Null argv or cwd stays unrecorded. Formal labels instead
select `<label>/command.json`. Neither reference supplies an absent command or
exit. Counts come from retained receipts, terminal summaries or machine reports
as named in that catalog; they are not added across attempts. The 22 earlier
preparation observations lack command elapsed and CPU fields. Printed Vitest
reporter durations do not establish whole-command wall time or CPU. Formal rows
below use actual receipt elapsedSeconds and commandHostChildCpuSeconds. Host
child CPU excludes remote Mac and browser process CPU unless those children run
under the measured local process. Machine model, concurrent load and cold or
warm cache state remain unknown. Gate 1 records an install phase that exits 0
in 2.5 s; this is not a cold-cache claim. Unknown cost remains unknown, never
zero.

The formal producer is `/private/tmp/artroom-page-fallback-evidence-20261029`.
Each formal label names its exact `<label>/command.json` with argv and cwd,
plus its receipt, stdout, stderr and source-index files. That six-file capture
unit defines the command record even when argv includes long paths. Every
closed formal receipt below records complete capture, a closed owned process,
unchanged clean source and no output truncation. Child and capture exits remain
separate from capture completeness. SHA256 identifies stdout in formal rows.
All closed formal stderr files are empty with SHA256
`e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`. Earlier
rows retain their separate stdout and stderr hashes. The audit and finalization
provenance below keep their own scope.

| Check / command record | Recorded argv and cwd | Exit / observed result | Source qualification and cost | Output SHA256 |
| --- | --- | --- | --- | --- |
| client-debug-0 | `checks.json` exact ID above | 0 | mutable source; no frozen head | stdout `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`; stderr `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| client-debug-1 | `checks.json` exact ID above | 0 | mutable source; no frozen head | stdout `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`; stderr `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| client-debug-2 | `checks.json` exact ID above | 0; 20 passes, 0 failures; 1 test files | mutable source; no frozen head | stdout `2a0057053aaf94bce052b2bad2feb8b0dd10dcedf8f0143c6f9be5d6438396d8`; stderr `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| page-fallback-cli-types-20261029-1 | `checks.json` exact ID above; argv/cwd unrecorded | unknown; 4 compiler diagnostics (failed observation) | mutable source; no frozen head | stdout `d531226de63d7704017daf8ab8bb398aaff29531631cd364937a6de61e02dc39`; stderr `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| page-fallback-cli-types-20261029-2 | `checks.json` exact ID above; argv/cwd unrecorded | unknown | mutable source; no frozen head | stdout `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`; stderr `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| page-fallback-final-types-20261029-1 | `checks.json` exact ID above | 0 | mutable source; no frozen head | stdout `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`; stderr `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| page-fallback-owning-20261029-1 | `checks.json` exact ID above; argv/cwd unrecorded | unknown; 2 passes, failure count unrecorded; 1 test files | mutable source; no frozen head | stdout `11a4bfbdb1feff2776704734e688b48bc9fd8130fc11ab3f1864302906049418`; stderr `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| page-fallback-owning-20261029-2 | `checks.json` exact ID above | 0; 2 passes, 0 failures; 1 test files | mutable source; no frozen head | stdout `10045c949a5eeea2975107f7b3d822a8ddecac9c1d9fc7fb4b31c3b6ac4de17c`; stderr `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| page-fallback-regression-20261029-1 | `checks.json` exact ID above | 0; 10 passes, 0 failures; 4 test files | mutable source; no frozen head | stdout `b450d8db79c66955c75088b0ca1dc66f7db9a8fd73d8411a7040e5211502208e`; stderr `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| page-fallback-review-owning-20261029-1 | `checks.json` exact ID above | 0; 4 passes, 0 failures; 1 test files | mutable source; no frozen head | stdout `9dacd550e1face1189262c73a1aedf0cb1a129b58f43b5bf78fbbc46dfd3af04`; stderr `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| page-fallback-review-source-types-20261029-1 | `checks.json` exact ID above | 0 | mutable source; no frozen head | stdout `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`; stderr `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| page-fallback-review-types-20261029-1 | `checks.json` exact ID above | 0 | mutable source; no frozen head | stdout `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`; stderr `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| page-stream-controls-20261029-1/control-1/helper | `checks.json` exact ID above | 2; INCONCLUSIVE | original control base ec34748; finite clean before/after records | stdout `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`; stderr `86830ca2d215fb397197585851805e48306ec50c0f4219e4bcfa0e9d8aefdb22` |
| page-stream-controls-20261029-1/control-1/baseline | `checks.json` exact ID above | 0; 20 passes, 0 failures; 1 test files | nested runner of named control; see exact catalog cwd | stdout `8f47fcf2efbfac58d454922a750b8bee1a8ec6e34b198724fc744da6999c570e`; stderr `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| page-stream-controls-20261029-1/control-1/mutant | `checks.json` exact ID above | 1; 19 passes, 1 failures; 1 test files | nested runner of named control; see exact catalog cwd | stdout `551c9c447c14b36757b370cef3e6c53a10fbf3a44d1e5edf23ebcb5e7c6bb8f9`; stderr `2044a03a5a547a80c96992a0dd97a9746102c51a09bc4d5133ba2569041e8076` |
| page-stream-controls-20261029-1/control-2/helper | `checks.json` exact ID above | 0; DISTINGUISHES | original control base ec34748; finite clean before/after records | stdout `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`; stderr `c76709971e322d4d1edb489d15a8dab60e11a0ecfa8b4f4316bcd457c18d19c2` |
| page-stream-controls-20261029-1/control-2/baseline | `checks.json` exact ID above | 0; 4 passes, 0 failures; 1 test files | nested runner of named control; see exact catalog cwd | stdout `02490e88ecbe57b6c7e4408516896abe4ed4ecbe08594253192d3754c595e34d`; stderr `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| page-stream-controls-20261029-1/control-2/mutant | `checks.json` exact ID above | 1; 3 passes, 1 failures; 1 test files | nested runner of named control; see exact catalog cwd | stdout `4c25ec54df090c10c374ffc18bff6bceb748b22c3b8e1be858ac71b65ee71067`; stderr `7df3d6f8caa109365b67509d0e76ae5edcca1d7deddaa1539a74c2c243c0b114` |
| page-stream-eof-assertion-control-20261029-1/control-1/helper | `checks.json` exact ID above | 0; DISTINGUISHES | mutable corrected test over ec34748; finite before/after records | stdout `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`; stderr `df98d30826fac41a6635d037b93f1e4cb50ba67bb3db2f5fb0086aa5ae7827d5` |
| page-stream-eof-assertion-control-20261029-1/control-1/baseline | `checks.json` exact ID above | 0; 20 passes, 0 failures; 1 test files | nested runner of named control; see exact catalog cwd | stdout `c2d84ca7b3712ea26624e0a43fadcdcefdd7ce87176c4f821f6da5fd57f87c17`; stderr `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| page-stream-eof-assertion-control-20261029-1/control-1/mutant | `checks.json` exact ID above | 1; 19 passes, 1 failures; 1 test files | nested runner of named control; see exact catalog cwd | stdout `0f5b1541058b2d4d72d386f61579de62e2987c16a5dd3bb244275d323cade71c`; stderr `2633dcae941dfd49339e911ee97e606f36778ccbd57930c172a35d8347b7fc0c` |
| corrected-eof-compiler | `checks.json` exact ID above | 0 | mutable source; no frozen head | stdout `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`; stderr `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| mac-readonly-preflight-1 | `mac-readonly-preflight-1/command.json` | child 0; capture 0; Read-only installed pins, project hashes and 3 service lifetimes; no upload or mutation | 0de86403/831c9b3; elapsed 0.415206875 s; command CPU 0.036619 s | stdout `8997a5a07d3f378066a2f16386085f246a97f8c305f22f8be7a361c5af371828` |
| mac-public-source-payload-1 | `mac-public-source-payload-1/command.json` | child 0; capture 0; Public overlay payload: 3,492 files, 20 changed, 3,389,305 B | 0de86403/831c9b3; elapsed 105.514534042 s; command CPU 97.197468 s | stdout `78db4782e15c938552f2912f247c396f0b568caee2247f4f0063f94f021c3332` |
| mac-public-source-overlay-1 | `mac-public-source-overlay-1/command.json` | child 0; capture 0; All 3,492 public-source files verified; lock/project shape unchanged | 0de86403/831c9b3; elapsed 0.903235208 s; command CPU 0.067343 s | stdout `9a20de82954e6d91ce5b93e50ea68a4e16f66a74f1fad60d3c7ba56482d57254` |
| mac-retained-project-deploy-1 | `mac-retained-project-deploy-1/command.json` | child 1; capture 1; FAILED preflight; original unknown/failure retained; no automatic retry | 0de86403/831c9b3; elapsed 0.607185834 s; command CPU 0.035443 s | stdout `ac59f492d55c7fad541df17dd0488c797d2f9702de4e089672e1236fa0fb4c3c` |
| mac-deploy-readonly-diagnostic-1 | `mac-deploy-readonly-diagnostic-1/command.json` | child 0; capture 0; Read-only preflight refusal; remote attempt absent, upload false | 0de86403/831c9b3; elapsed 0.600053625 s; command CPU 0.037276 s | stdout `bbce7b214e32da31dcecaaed42e8294be4af9f18298da56b6963a4dd85c7967e` |
| mac-deploy-readonly-diagnostic-2 | `mac-deploy-readonly-diagnostic-2/command.json` | child 0; capture 0; Read-only cause:weed 145,299,138 B exceeds 134,217,728 B; no upload | 0de86403/831c9b3; elapsed 0.642279208 s; command CPU 0.036580 s | stdout `31b138652c8d724109e774cc7ccb3c306703aed88eee6d8bf55b24f422667e39` |
| mac-deploy-readonly-diagnostic-3 | `mac-deploy-readonly-diagnostic-3/command.json` | child 0; capture 0; Repaired preflight passes; remote attempt absent, upload false | 0de86403/831c9b3; elapsed 0.738098167 s; command CPU 0.035091 s | stdout `4e3f6351f67bea6ef10b69f00adaaac71a15de418c0aaed79f6b83ab3a5f3e3c` |
| mac-retained-project-deploy-2 | `mac-retained-project-deploy-2/command.json` | child 0; capture 0; First actual upload passes; served JS and readiness and unchanged project/session/services | 0de86403/831c9b3; elapsed 7.910952083 s; command CPU 0.035664 s | stdout `d3b68e818314594f18dc556dde406b7e4aaf9f7508ad366236e4c639a60ab1df` |
| mac-fixture-helper-stage-1 | `mac-fixture-helper-stage-1/command.json` | child 0; capture 0; Four reviewed public helpers staged; no fixture act | 0de86403/831c9b3; elapsed 0.287161958 s; command CPU 0.036235 s | stdout `f0e168b991dae2f4ed649a9b3c0ee5d60b60d15b4a97b75c96affb9d3f93b743` |
| mac-test-fixture-inspect-1 | `mac-test-fixture-inspect-1/command.json` | child 0; capture 0; Native inspect: demo absent, no fixture, 0 mutation POSTs | 0de86403/831c9b3; elapsed 1.210935958 s; command CPU 0.032907 s | stdout `a72ec9eebf8e7e3fc300a7b9337edd644be6b89e8b6e9f71b6c25e69771f0ee8` |
| mac-test-fixture-activate-1 | `mac-test-fixture-activate-1/command.json` | child 0; capture 0; Native activation confirmed; CLI 0, 1 mutation POST | 0de86403/831c9b3; elapsed 1.253344792 s; command CPU 0.031761 s | stdout `19d2d2ea5bbf183a1c67cc83f6bc49fa2fb89617f45166c7501a123191bf4868` |
| mac-test-fixture-open-1 | `mac-test-fixture-open-1/command.json` | child 0; capture 0; Native TEST issue confirmed; CLI 0, 1 mutation POST | 0de86403/831c9b3; elapsed 2.414881833 s; command CPU 0.031484 s | stdout `cdb3926c1f117a6d961530163d7010314cea25cadda60672ca192a2001bd4e90` |
| mac-browser-input-preparation-1 | `mac-browser-input-preparation-1/command.json` | child 0; capture 0; Existing private CLI custody transferred 0600; no seed contents emitted | 0de86403/831c9b3; elapsed 0.537958041 s; command CPU 0.044778 s | stdout `908ba34b1f179bb24436a547664795eeec7d10a3b29dacd5b5072c18a9fa4efc` |
| mac-two-browser-polling-1 | `mac-two-browser-polling-1/command.json` | child 1; capture 1; FAILED issue-identity before marker/comment; one owned child exited 0 | 0de86403/831c9b3; elapsed 2.307959291 s; command CPU 1.623823 s | stdout `14273ff9fdd9cbabd9e3eb64dbaca670f9acd56f63ae675ae4400ecf4d1bea08` |
| mac-browser-readonly-diagnostic-1 | `mac-browser-readonly-diagnostic-1/command.json` | child 1; capture 1; FAILED startup diagnostic; browser-step-failed, no comment path | 0de86403/831c9b3; elapsed 6.250722167 s; command CPU 1.654927 s | stdout `1df3c8601d956ceaab8dc9a79add7fbb08e132b6e3404cade03deae52f5a3630` |
| mac-browser-readonly-diagnostic-2 | `mac-browser-readonly-diagnostic-2/command.json` | child 1; capture 1; FAILED DNS diagnostic; ERR_NAME_NOT_RESOLVED, no comment path | 0de86403/831c9b3; elapsed 0.894863917 s; command CPU 1.245546 s | stdout `1df3c8601d956ceaab8dc9a79add7fbb08e132b6e3404cade03deae52f5a3630` |
| lan-resolution-and-health-1 | `lan-resolution-and-health-1/command.json` | child 0; capture 0; System DNS 192.168.1.52; normal hostname TLS verification 0, HTTP 200 | 0de86403/831c9b3; elapsed 0.224660500 s; command CPU 0.037287 s | stdout `831216e8f6208f4622bb6834de9bf6a09c2110877a9fd10f99784ba4834baddf` |
| mac-browser-readonly-diagnostic-3 | `mac-browser-readonly-diagnostic-3/command.json` | child 1; capture 1; FAILED after exact-title recovery: strict selector sees 2 account controls | 0de86403/831c9b3; elapsed 2.056647834 s; command CPU 1.927194 s | stdout `1df3c8601d956ceaab8dc9a79add7fbb08e132b6e3404cade03deae52f5a3630` |
| mac-browser-readonly-diagnostic-4 | `mac-browser-readonly-diagnostic-4/command.json` | child 0; capture 0; Read-only startup PASS; exact title, visible account, polling, 0 POSTs | 0de86403/831c9b3; elapsed 2.125222958 s; command CPU 2.032975 s | stdout `76e8b1892cbf4b82f25ab3776c4e4a1e3a687a77c7348d972a57c446db515425` |
| mac-browser-readonly-diagnostic-5 | `mac-browser-readonly-diagnostic-5/command.json` | child 0; capture 0; Read-only startup PASS; sole failed GET is scope-summary 403, 0 POSTs | 0de86403/831c9b3; elapsed 1.520991125 s; command CPU 1.682840 s | stdout `76e8b1892cbf4b82f25ab3776c4e4a1e3a687a77c7348d972a57c446db515425` |
| mac-browser-readonly-diagnostic-6 | `mac-browser-readonly-diagnostic-6/command.json` | child 0; capture 0; Read-only startup PASS; sole failed GET is configured-register 403, 0 POSTs | 0de86403/831c9b3; elapsed 1.484992375 s; command CPU 1.672382 s | stdout `76e8b1892cbf4b82f25ab3776c4e4a1e3a687a77c7348d972a57c446db515425` |
| mac-two-browser-polling-2 | `mac-two-browser-polling-2/command.json` | child 0; capture 0; PASS: 1 sender click and POST, receiver 0 ; 5,348.972708 ms <= 10,000 ms; no observer navigation | 0de86403/831c9b3; elapsed 8.421563791 s; command CPU 3.541912 s | stdout `65d0d01cd809b40b1cf1d4e816403f44c6efa1ae1f2101e948f9947a78230635` |
| gate-1 | `gate-1/command.json` | child 1; capture 1; FAILED: Native Counter rejects streaming; Node 79, Counting 55, plain 3,106 passes and 1 skip, Native 835 passes, 1 failure and 2 skips | 0de86403/831c9b3; elapsed 1230.488071916 s; command CPU 2604.791569 s | stdout `9196b3d6377ee4e734b4e8c3a18b447cbbd56112c235184df05723268f547196` |
| Page generated-module equality (nested gate 1 case) | `gate-1/command.json`; operator-inputs/gate-detail-gate-1/test.log:2811 | PASS; Page test/assets.test.ts; reporter 67 ms | Same frozen source; nested within FAILED gate 1, no separate command timing | Same gate 1 stdout; case detail in test.log |
| counter-source-types-1 | `counter-source-types-1/command.json` | child 0; capture 0; Counter source compiler PASS | ce4cec64/caa0220; elapsed 0.297144250 s; command CPU 0.543177 s | stdout `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| native-test-types-1 | `native-test-types-1/command.json` | child 0; capture 0; Scope test compiler PASS | ce4cec64/caa0220; elapsed 0.913016208 s; command CPU 3.965144 s | stdout `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| counter-owning-1 | `counter-owning-1/command.json` | child 0; capture 0; 56 tests PASS; scripted browser adapter/command/speech boundaries | ce4cec64/caa0220; elapsed 2.106561458 s; command CPU 3.303981 s | stdout `28ee4d9128cea43ca2a3e9c24316ec4b3a6920b309462e036f8bb6a74ef7cd69` |
| native-maintained-projections-1 | `native-maintained-projections-1/command.json` | child 0; capture 0; 2 local Native projection tests PASS; unchanged Native test | ce4cec64/caa0220; elapsed 9.387027334 s; command CPU 10.936146 s | stdout `a7203fd6d038f50dd110931b8c647c42a2a6bd41f45df6a727461c023959e3d2` |
| counter-streaming-assertion-control-1 | `counter-streaming-assertion-control-1/command.json` | child 0; capture 0; DISTINGUISHES; exact source/mode restoration, test unchanged | ce4cec64/caa0220; elapsed 0.713920417 s; command CPU 0.657383 s | stdout `0fa6ca5496c03cf5e4e2e6ed71f7d732014070f852385eee455277e14a6fd409` |
| Counter control baseline-build | control scratch `baseline-build/command.json` | exit 0; PASS; owning bundle built | ce4cec64 control; closed; elapsed 0.125125125 s; child CPU 0.098625 s | stdout `52e86b39b513169b35ac15d71282a55f9ad6979afe6ba65b15c0b7c5dde09e18` |
| Counter control baseline-test | control scratch `baseline-test/command.json` | exit 0; PASS; one unchanged named assertion | ce4cec64 control; closed; elapsed 0.193345333 s; child CPU 0.214731 s | stdout `ee631216334363c7cf5712c371f28634b33102e5f62772e685f32bffc1462a0e` |
| Counter control mutant-build | control scratch `mutant-build/command.json` | exit 0; PASS; wrong implementation bundle built | ce4cec64 control; closed; elapsed 0.117836500 s; child CPU 0.092104 s | stdout `52e86b39b513169b35ac15d71282a55f9ad6979afe6ba65b15c0b7c5dde09e18` |
| Counter control mutant-test | control scratch `mutant-test/command.json` | exit 1; FAIL; one ordinary AssertionError, unexpected streaming status | ce4cec64 control; closed; elapsed 0.192780542 s; child CPU 0.214807 s | stdout `020f7cb8ef3b95f57e4be41a569c6f9470308f875abd3042c03820e06affac8e` |
| gate-2 | `gate-2/command.json` | child 0; capture 0; PASS; Node 79, Counting 56, plain 3,106 plus 1 skip, Native 836 plus 2 skips | ce4cec64/caa0220; complete/closed; elapsed 966.962653042 s; command CPU 2067.251390 s | stdout `0915e3a1d3d2a42c23a250c9315dfe96683339da860f6dfed19a20e1ba1b3d40` |
| Receipt audit | `finalization/audit-terminal.json` exact argv/cwd | exit 0; 29 formal captures closed; no integrity, incomplete, unclosed, inconclusive or timeout issues | stdlib audit only; wall 0.714624542 s; host child CPU 0.711585 s | stdout `6bd4de012ac1b8d928d3d77261487757cfd34f9c1661f2ad5cf005eb71a90d07` |

The catalog hashes are:

- `SYNOPSIS.md`:
  `6e68d7f43d9951729b023d50dc2bec3137c2c6a53d5a1b281f84ffd5ad38c2e7`.
- `checks.json`:
  `e03fc5fdc605ba67d4aa53b95520c2275048797d2c0df92b884374b0a1305fd5`.
- `public-inputs.json`:
  `9b05eb309c427da4e50e285c5648561e78dffb70753acd9b4e224fa902dc5498`.

The original-control inventory declares 39 files; the corrected inventory 25.
The retained catalog reports matching byte counts and hashes for every declared
file. This is preparation retention, not the later formal source capture or
evidence seal. The inventory excludes private homes, credentials, Mac
request/journal bodies and private host logs.

The earlier preparation packet has no durable asset-specific terminal. Gate 1
now supplies the maintained nested Page asset-equality pass at test.log:2811
and brand-asset pass at line 2812. These nested passes do not change gate 1's
failure.

## Actual deployment, fixture and browser evidence

The public overlay binds the Mac source to `0de86403` / `831c9b3` and verifies
all 3,492 public tracked files. The first deploy helper refuses before any
remote attempt or upload because its 128 MiB file limit rejects the pinned
145,299,138 B weed binary. Three read-only diagnostics retain that refusal and
its cause, then show the bounded 256 MiB repair passes preflight. Deploy 2
makes the first actual maintained Worker upload and verifies readiness and
served Page JS SHA256
`6007498de22a89c08666a16f19bf044737c40b35da2e4dc2730f93eaa958913e`. The project
configuration, session secret and observed service lifetimes stay unchanged.
The failed deploy 1 remains a failed capture.

Maintained CLI phases inspect the original room, activate the supported demo
definition once and open one TEST issue. Activation and opening each record one
mutation POST and native confirmation. The reviewed helper retains the exact
signed request privately before transport and resolves that original request
through read-only settlement/following. The public phase receipts record
outcomes and counts, not signing keys, request bodies or native journals. No
unknown operation triggers an automatic replacement.

The original browser witness stops at its first issue-identity guard before
marker generation or comment code. Its numeric review records one owned child,
PID 91761, exited0. Its original browsersClosed:false combines closure with the
unmet two-browser requirement; it does not show that PID remained alive.
Read-only diagnostic 2 reports browser ERR_NAME_NOT_RESOLVED. The separate LAN
capture resolves inguz.local to 192.168.1.52 and verifies normal HTTPS hostname
validation with HTTP 200. Later browser helpers use that verified address in a
browser-only resolver rule, direct proxy mode and headed Chromium. They keep
the actual HTTPS origin and Caddy path, with no HTTP route mocks or system DNS
change. The explicit endpoint-certificate SPKI exception remains a browser
trust qualification, not system trust installation.

Diagnostic 3 observes “Opening your room” followed by the exact TEST issue
title, then exposes two account controls under the strict selector. The
corrected bounded title wait and visible-account selection let diagnostics 4–6
pass their read-only startup checks. Those diagnostics make no comment POST and
prove no comment propagation or latency result.

Browser witness 2 uses the reviewed v3 helper, SHA256
`77b9ea231418dcea9e2be0206362c3a4abcf1344758087e97f8310c3167cb6b9`. It records
one scripted click and one sender comment POST, with zero receiver POSTs. The
receiver displays the unique later comment after 5,348.972708 ms, within two
default 5 s intervals. The receiver retains its URL, timeOrigin and main-frame
navigation count. Distinct browser PIDs 5859 and 5884 both exit 0. Root
reviewed the three passing screenshots as safe TEST-only images. This actual
witness establishes fallback propagation through the served Page. The
healthy-stream/no-polls behavior still has the focused scripted owning case,
not a separate healthy-stream native browser trial.

The passing witness retains configured-register GET 403 counts of 3 and 2 in
its two browsers, equal to their classified 403 resource-console counts. Page
main.ts:968–974 deliberately catches failure of the optional founding-offer
read. claim.ts:213–218 signs that configured-register summary read and throws
on denial. No Create room button appears after refusal. The helper accepts only
that exact endpoint/method/status class with matching console counts, bounded
to 8 per browser, alongside its existing stream-resource classification. Every
other console error or warning, page error and foreign request still fails. The
server's denial cause remains unknown. This is not a clean-console claim or
proof of founding authority.

## Failed ordinary gate

Gate 1 runs `npm run gate` at the frozen `0de86403` / `831c9b3` checkpoint. Its
child and capture both exit 1 after 1,230.488071916 s. The receipt records
command host child CPU 2,604.791569 s and whole-capture host child CPU
2,604.975929 s. Those measurements exclude remote Mac service CPU and do not
establish load or cache comparability. The stdout records install, whitespace,
commit, helper, citation, document, notes and root typecheck phases passing.
The test phase fails the Native maintained Counter projection case because its
browser consumer rejects the new `streaming` state. The stack reaches Counter
client line 93 from observe.ts:66 and :91. Gate 1 retains its failed result
after the later repair. Gate 2 supplies a separate later result.

The table retains each gate phase's counts separately. Native has 238 passed
files, one failure and one skipped file. Its terminal evidence is partial even
though the capture closes completely. Stage walls are kernel 0.21388 s, Node
60.86825 s, Counting 2.16815 s, plain 84.94208 s and Native 1,056.67164 s.
Concurrent test-and-hook sums are neither wall time nor CPU. The reporter
records 69 unknown or suite observations and zero contradictory records.

## Counter readiness repair and focused control

The repair checkpoint is `ce4cec648ae769de63764900e19f5773872ab448`, tree
`caa022068e284530d8e9e0798205d9f7a8807fd5`. The diff from 0de86403 changes only
`apps/counter/browser/client.ts` and its test. The adapter ignores the SDK's
streaming notification before updating freshness or forwarding state. Counter
continues to expose projection readiness, so a working transport alone cannot
make the board current. The new scripted case requires connecting, refreshing,
current in order, an actual paused/zero projection only at current, and zero
POST, settlement or custody writes. The Native test stays unchanged.

Both compiler captures exit 0. The owning Counter command passes 56 tests; the
maintained local Native projection file passes 2 tests. These are separate
focused results, not a gate pass or another deployed Page/browser run. The Room
Page input graph and all deployed browser-witness inputs remain unchanged; the
earlier Mac witness keeps its 0de86403 checkpoint.

The one control retains its source and test under
`operator-inputs/public-selection-1/counter-control`. Its nested command files
supply exact argv/cwd. Baseline and mutant builds both pass with the same
128-input owning closure. The unchanged named baseline assertion passes once.
Removing only the streaming filter compiles, then fails that assertion with an
ordinary deepStrictEqual AssertionError: streaming appears between connecting
and refreshing. No import or setup failure proves this control. The helper
restores exact source bytes and 0644 mode, leaves the test unchanged, then
exits 0/DISTINGUISHES. The formal receipt also records a clean matching source
after closure. This finite control proves neither physical descendant drain nor
a new service/browser acceptance.

## Passing gate and retention

Gate 2 closes complete with child 0/capture 0 and matching clean source at
ce4cec64/caa0220. Receipt SHA256 is
`8a82c2d9c45c3ea20f34796f8c54256ea27cb15b4f7d9f97dcdaedb3eccf5a6b`. Elapsed
time is 966.962653042 s; whole-capture host child CPU is 2067.400041 s,
distinct from command CPU 2067.251390 s. Installation skips after dependency
view verification against package-lock.json. Load and cache comparability stay
unknown. Phase counts remain separate in the table. All four terminal phases
complete; the scope module-duration profile stays partial. The stdout summary
records 69 unknown or suite observations and zero contradictions, not full
coverage. Gate detail confirms both Counter and Lending projection cases pass.
No summary.json exists: stdout carries the printed summary. The 27 retained
detail files total 44,707,488 B under `operator-inputs/gate-detail-gate-2`.
Copy record SHA256 is
`32aef14f848bacf275d9d0a6526ea95d90137f8a4b53832cbb10788bd634c050`.

The public selection has 194 files/5,395,127 B including metadata, versus its
191-file/5,285,224 B copied payload. Copy record SHA256 is
`d3e4b088cbbac730aba9d2fba022b8446ee6f24a9f5476a73c0e63e67c76ff92`. It retains
witness 1 numeric PID/exit proof and three reviewed passing TEST screenshots.
The DNS classification extracts only the exact error token from withheld
private JSON and proves no cause. `operator-inputs/control-helper-source-1`
retains control.mjs and its Git-copy receipt.
`operator-inputs/page-asset-source-1` retains page.js from the 0de Git JSON
literal, matching the Page JS digest above, plus its copy record. These copies
run no code and make no server read.

The historical prepared RAW inventory has 1,911 files and 159,280,878 B at
`/Users/hughpyle/play/artroom-evidence/2026-10-29-page-fallback`. The receipt
audit passes for all 29 formal captures and preserves failed child outcomes.
Audit JSON is 63,305 B, SHA256
`7588b2b58d50e7a328a186dd5a39f4ddf301387d12ca0419e957717645efddc5`; the 3,823 B
table has SHA256
`92eca72daebc220e331da00eadb59a97b424f4c7461e9b02109f4cc094a8639c`. These
counts precede final metadata. The finalizer must bind the reviewed note hash,
write the index and manifest, remove write permission and read back the whole
collection before artifact publication. The final manifest records its actual
membership and counts. Retention lasts at least 30 days after landing; later
removal requires a planner act naming that manifest. No seal, review or landing
result follows from the prepared inventory or audit alone.

## Open limits and owning requests

- Request `5874b15de9079d93cbcbf8ac44d22778d065af33` owns exact-head review,
  final note, manifest, seal and landing. The two gate attempts remain distinct.
  The review request must name the actual report commit and tree.
- The same request owns remaining acceptance judgments for healthy streams,
  served-byte equivalence after later changes and retained browser limits.
  The Counter-only repair leaves the Room Page input graph unchanged.
- Host installation, TLS, same-node preserve and crash evidence belong to H3
  request `cbcadd7f0ecb1a59b470dbf50f14ff1d3c374a86`. The overlay and actual
  Worker upload here bind the Page trial without rerunning H3's acceptance.
- Private inputs, seeds, signed bodies, native journals and raw Mac logs stay
  outside public evidence. Only reviewed public receipts and safe TEST images
  can enter the final retained evidence. The finalizer owns seal/readback.
- Polling supplies no independent deployment pin, physical cancellation,
  mutation settlement, archive recovery, automatic resubmission or new read
  authority. The same-origin trust and physical callback limits above remain.
