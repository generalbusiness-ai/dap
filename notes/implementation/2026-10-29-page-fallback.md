# Page head-stream fallback

The settings-loader repair preserves connection/custody with an invalid
optional interval. Focused checks/control and gate 3 pass. Initial compiler/
setup failures and earlier gate outcomes remain distinct. The original sealed
RAW and 40,200-byte note stay unchanged; the continuation audit passes.

## What changed

Request `5874b15de9079d93cbcbf8ac44d22778d065af33` adds one view-lifetime
observer and visible summary polling during transient head-stream outages.
Redraws reuse that owner.

The intended interval is finite 1,000–60,000 ms, default 5,000. Changing it
reconfigures owner identity. Invalid stored input now defaults without hiding
connection/custody. The default line “Live updates unavailable. Checking every
5 seconds.” disappears on a valid notice.

Fallback reports each transient outage once, with reason and optional retained
complete view. Streaming reports each connection's first validated notice
before snapshot refresh, including same-head notices, and resets
outage/backoff. Forbidden, unsupported and protocol/error remain terminal
without polls. Empty EOF raises HeadStreamUnavailable with reason
stream-ended-before-head; EOF after a notice and session expiry also report
outages. Reconnect waits are 1, 2, 4, 8, 16, 30 seconds, capped at 30 seconds
independently of per-read timeout. Cancel ends local waiting even if an
injected delay ignores abort.

Complete authenticated summaries serialize during an outage. A valid restored
notice clears the timer and aborts an active poll. Retired completions cannot
repaint. Without a list head, accepting the initial summary triggers one redraw
to close the list-read/observation-setup race. Page/client/tests/assets change;
native definitions, kernel, Worker routes, stream wire and session rules do
not. Signed mutations retain their authority.

## Decisions and limits of the owner

Owner identity includes settings context, route, interval and actual full
selected scope. Settings bind origin/place/public key/register; authenticated
initial summary fixes scope/definition. Membership, member, key and expected
deployment also bind observations. Route/context or workbench retirement
cancels ownership; post-await checks suppress stale paint.

Page trusts its serving HTTPS origin and the initial accepted native session
for deployment identity, captured once for renewals. This is same-origin
service trust, not an independent deployment pin.
Deployment/member/key/membership must match before renewal replaces
Room.reader. A mismatch can reach the observer's error path but cannot poison
the shared reader or supply a poll snapshot.

Polling interval bounds local load/poll waits; the adapter uses 10 seconds.
Existing raw frame/chunk/turn bounds remain. No whole-stream buffer/lifetime
byte quota is added. Reconnect waits stay independent. One physical load/poll
promise remains owned and joined on retirement; an ignoring transport can delay
retirement beyond timeout. Observer cancel ends local waiting and asks
fetch/body disposal to stop, without proving an uncooperative upstream drains.

Polling never submits, settles an act or changes a sending fence. Heads and
summaries only redraw. Existing owners retain original mutation custody,
unknown outcomes and exact-request recovery. Visible comments cannot settle
another pending local mutation.

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

The table retains two client compiler passes and 20 observe passes. An early
Page compiler log has three optional-property undefined assignments and one
invalid issue ScopeKind; argv/exit remain unknown. Empty later compiler logs
lack a receipt and remain unknown. Early Page owning output prints two passes
but lacks argv/exit; later receipted owning runs pass two then four cases.

The four-case owner uses actual Main render/lifecycle with scripted DOM, data,
authenticated sessions and streams: EOF→later comment within two intervals,
healthy stream/no polls, same-head abort/late-paint refusal, initial list/head
race and wrong-deployment renewal preserving the reader. It proves neither a
rendered browser nor native authority. The 10-pass/four-file regression
predates the final deployment-renewal guard and full lane-ref key refinement.
Later compiler/owning runs keep mutable-source qualifications, not frozen
gates.

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

Catalog record selects `checks.json.checks` by the exact first-column id. That
record retains argv and cwd, including nested relative cwd and temporary paths.
Null argv or cwd stays unrecorded. Command.json selects the first-column
label’s `<label>/command.json`. Neither reference supplies an absent command or
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

Formal producer: `/private/tmp/artroom-page-fallback-evidence-20261029`. Each
label's command.json retains exact argv/cwd; its six-file unit also has
process, receipt, source-index, stdout and stderr. Closed receipts prove
complete capture, owned-process closure, clean unchanged source and no output
truncation. Child/capture exit remains distinct. Mutable source means no frozen
head; nested controls keep exact catalog cwd.

Out/err means stdout/stderr. The 22 catalog rows retain all 44 leaf citations.
`EMPTY` denotes an explicitly zero-byte leaf with SHA256
`e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`. Formal
stderr is empty except explicit repair/control hashes. No empty output or label
supplies a missing command or exit. Audit/custody keep their own scope.

| Check / command record | Recorded argv and cwd | Exit / observed result | Source qualification and cost | Output SHA256 |
| --- | --- | --- | --- | --- |
| client-debug-0 | catalog record | 0 | mutable source | out `EMPTY`; err `EMPTY` |
| client-debug-1 | catalog record | 0 | mutable source | out `EMPTY`; err `EMPTY` |
| client-debug-2 | catalog record | 0; 20 passes, 0 failures; 1 test files | mutable source | out `2a0057053aaf94bce052b2bad2feb8b0dd10dcedf8f0143c6f9be5d6438396d8`; err `EMPTY` |
| page-fallback-cli-types-20261029-1 | catalog record; argv/cwd unrecorded | unknown; 4 compiler diagnostics (failed observation) | mutable source | out `d531226de63d7704017daf8ab8bb398aaff29531631cd364937a6de61e02dc39`; err `EMPTY` |
| page-fallback-cli-types-20261029-2 | catalog record; argv/cwd unrecorded | unknown | mutable source | out `EMPTY`; err `EMPTY` |
| page-fallback-final-types-20261029-1 | catalog record | 0 | mutable source | out `EMPTY`; err `EMPTY` |
| page-fallback-owning-20261029-1 | catalog record; argv/cwd unrecorded | unknown; 2 passes, failure count unrecorded; 1 test files | mutable source | out `11a4bfbdb1feff2776704734e688b48bc9fd8130fc11ab3f1864302906049418`; err `EMPTY` |
| page-fallback-owning-20261029-2 | catalog record | 0; 2 passes, 0 failures; 1 test files | mutable source | out `10045c949a5eeea2975107f7b3d822a8ddecac9c1d9fc7fb4b31c3b6ac4de17c`; err `EMPTY` |
| page-fallback-regression-20261029-1 | catalog record | 0; 10 passes, 0 failures; 4 test files | mutable source | out `b450d8db79c66955c75088b0ca1dc66f7db9a8fd73d8411a7040e5211502208e`; err `EMPTY` |
| page-fallback-review-owning-20261029-1 | catalog record | 0; 4 passes, 0 failures; 1 test files | mutable source | out `9dacd550e1face1189262c73a1aedf0cb1a129b58f43b5bf78fbbc46dfd3af04`; err `EMPTY` |
| page-fallback-review-source-types-20261029-1 | catalog record | 0 | mutable source | out `EMPTY`; err `EMPTY` |
| page-fallback-review-types-20261029-1 | catalog record | 0 | mutable source | out `EMPTY`; err `EMPTY` |
| page-stream-controls-20261029-1/control-1/helper | catalog record | 2; INCONCLUSIVE | original control base ec34748; finite clean before/after records | out `EMPTY`; err `86830ca2d215fb397197585851805e48306ec50c0f4219e4bcfa0e9d8aefdb22` |
| page-stream-controls-20261029-1/control-1/baseline | catalog record | 0; 20 passes, 0 failures; 1 test files | nested control | out `8f47fcf2efbfac58d454922a750b8bee1a8ec6e34b198724fc744da6999c570e`; err `EMPTY` |
| page-stream-controls-20261029-1/control-1/mutant | catalog record | 1; 19 passes, 1 failures; 1 test files | nested control | out `551c9c447c14b36757b370cef3e6c53a10fbf3a44d1e5edf23ebcb5e7c6bb8f9`; err `2044a03a5a547a80c96992a0dd97a9746102c51a09bc4d5133ba2569041e8076` |
| page-stream-controls-20261029-1/control-2/helper | catalog record | 0; DISTINGUISHES | original control base ec34748; finite clean before/after records | out `EMPTY`; err `c76709971e322d4d1edb489d15a8dab60e11a0ecfa8b4f4316bcd457c18d19c2` |
| page-stream-controls-20261029-1/control-2/baseline | catalog record | 0; 4 passes, 0 failures; 1 test files | nested control | out `02490e88ecbe57b6c7e4408516896abe4ed4ecbe08594253192d3754c595e34d`; err `EMPTY` |
| page-stream-controls-20261029-1/control-2/mutant | catalog record | 1; 3 passes, 1 failures; 1 test files | nested control | out `4c25ec54df090c10c374ffc18bff6bceb748b22c3b8e1be858ac71b65ee71067`; err `7df3d6f8caa109365b67509d0e76ae5edcca1d7deddaa1539a74c2c243c0b114` |
| page-stream-eof-assertion-control-20261029-1/control-1/helper | catalog record | 0; DISTINGUISHES | mutable corrected test over ec34748; finite before/after records | out `EMPTY`; err `df98d30826fac41a6635d037b93f1e4cb50ba67bb3db2f5fb0086aa5ae7827d5` |
| page-stream-eof-assertion-control-20261029-1/control-1/baseline | catalog record | 0; 20 passes, 0 failures; 1 test files | nested control | out `c2d84ca7b3712ea26624e0a43fadcdcefdd7ce87176c4f821f6da5fd57f87c17`; err `EMPTY` |
| page-stream-eof-assertion-control-20261029-1/control-1/mutant | catalog record | 1; 19 passes, 1 failures; 1 test files | nested control | out `0f5b1541058b2d4d72d386f61579de62e2987c16a5dd3bb244275d323cade71c`; err `2633dcae941dfd49339e911ee97e606f36778ccbd57930c172a35d8347b7fc0c` |
| corrected-eof-compiler | catalog record | 0 | mutable source | out `EMPTY`; err `EMPTY` |
| mac-readonly-preflight-1 | command.json | child 0; capture 0; Read-only installed pins, project hashes and 3 service lifetimes; no upload or mutation | 0de86403/831c9b3; elapsed 0.415206875 s; command CPU 0.036619 s | stdout `8997a5a07d3f378066a2f16386085f246a97f8c305f22f8be7a361c5af371828` |
| mac-public-source-payload-1 | command.json | child 0; capture 0; Public overlay payload: 3,492 files, 20 changed, 3,389,305 B | 0de86403/831c9b3; elapsed 105.514534042 s; command CPU 97.197468 s | stdout `78db4782e15c938552f2912f247c396f0b568caee2247f4f0063f94f021c3332` |
| mac-public-source-overlay-1 | command.json | child 0; capture 0; All 3,492 public-source files verified; lock/project shape unchanged | 0de86403/831c9b3; elapsed 0.903235208 s; command CPU 0.067343 s | stdout `9a20de82954e6d91ce5b93e50ea68a4e16f66a74f1fad60d3c7ba56482d57254` |
| mac-retained-project-deploy-1 | command.json | child 1; capture 1; FAILED preflight; original unknown/failure retained; no automatic retry | 0de86403/831c9b3; elapsed 0.607185834 s; command CPU 0.035443 s | stdout `ac59f492d55c7fad541df17dd0488c797d2f9702de4e089672e1236fa0fb4c3c` |
| mac-deploy-readonly-diagnostic-1 | command.json | child 0; capture 0; Read-only preflight refusal; remote attempt absent, upload false | 0de86403/831c9b3; elapsed 0.600053625 s; command CPU 0.037276 s | stdout `bbce7b214e32da31dcecaaed42e8294be4af9f18298da56b6963a4dd85c7967e` |
| mac-deploy-readonly-diagnostic-2 | command.json | child 0; capture 0; Read-only cause:weed 145,299,138 B exceeds 134,217,728 B; no upload | 0de86403/831c9b3; elapsed 0.642279208 s; command CPU 0.036580 s | stdout `31b138652c8d724109e774cc7ccb3c306703aed88eee6d8bf55b24f422667e39` |
| mac-deploy-readonly-diagnostic-3 | command.json | child 0; capture 0; Repaired preflight passes; remote attempt absent, upload false | 0de86403/831c9b3; elapsed 0.738098167 s; command CPU 0.035091 s | stdout `4e3f6351f67bea6ef10b69f00adaaac71a15de418c0aaed79f6b83ab3a5f3e3c` |
| mac-retained-project-deploy-2 | command.json | child 0; capture 0; First actual upload passes; served JS and readiness and unchanged project/session/services | 0de86403/831c9b3; elapsed 7.910952083 s; command CPU 0.035664 s | stdout `d3b68e818314594f18dc556dde406b7e4aaf9f7508ad366236e4c639a60ab1df` |
| mac-fixture-helper-stage-1 | command.json | child 0; capture 0; Four reviewed public helpers staged; no fixture act | 0de86403/831c9b3; elapsed 0.287161958 s; command CPU 0.036235 s | stdout `f0e168b991dae2f4ed649a9b3c0ee5d60b60d15b4a97b75c96affb9d3f93b743` |
| mac-test-fixture-inspect-1 | command.json | child 0; capture 0; Native inspect: demo absent, no fixture, 0 mutation POSTs | 0de86403/831c9b3; elapsed 1.210935958 s; command CPU 0.032907 s | stdout `a72ec9eebf8e7e3fc300a7b9337edd644be6b89e8b6e9f71b6c25e69771f0ee8` |
| mac-test-fixture-activate-1 | command.json | child 0; capture 0; Native activation confirmed; CLI 0, 1 mutation POST | 0de86403/831c9b3; elapsed 1.253344792 s; command CPU 0.031761 s | stdout `19d2d2ea5bbf183a1c67cc83f6bc49fa2fb89617f45166c7501a123191bf4868` |
| mac-test-fixture-open-1 | command.json | child 0; capture 0; Native TEST issue confirmed; CLI 0, 1 mutation POST | 0de86403/831c9b3; elapsed 2.414881833 s; command CPU 0.031484 s | stdout `cdb3926c1f117a6d961530163d7010314cea25cadda60672ca192a2001bd4e90` |
| mac-browser-input-preparation-1 | command.json | child 0; capture 0; Existing private CLI custody transferred 0600; no seed contents emitted | 0de86403/831c9b3; elapsed 0.537958041 s; command CPU 0.044778 s | stdout `908ba34b1f179bb24436a547664795eeec7d10a3b29dacd5b5072c18a9fa4efc` |
| mac-two-browser-polling-1 | command.json | child 1; capture 1; FAILED issue-identity before marker/comment; one owned child exited 0 | 0de86403/831c9b3; elapsed 2.307959291 s; command CPU 1.623823 s | stdout `14273ff9fdd9cbabd9e3eb64dbaca670f9acd56f63ae675ae4400ecf4d1bea08` |
| mac-browser-readonly-diagnostic-1 | command.json | child 1; capture 1; FAILED startup diagnostic; browser-step-failed, no comment path | 0de86403/831c9b3; elapsed 6.250722167 s; command CPU 1.654927 s | stdout `1df3c8601d956ceaab8dc9a79add7fbb08e132b6e3404cade03deae52f5a3630` |
| mac-browser-readonly-diagnostic-2 | command.json | child 1; capture 1; FAILED DNS diagnostic; ERR_NAME_NOT_RESOLVED, no comment path | 0de86403/831c9b3; elapsed 0.894863917 s; command CPU 1.245546 s | stdout `1df3c8601d956ceaab8dc9a79add7fbb08e132b6e3404cade03deae52f5a3630` |
| lan-resolution-and-health-1 | command.json | child 0; capture 0; System DNS 192.168.1.52; normal hostname TLS verification 0, HTTP 200 | 0de86403/831c9b3; elapsed 0.224660500 s; command CPU 0.037287 s | stdout `831216e8f6208f4622bb6834de9bf6a09c2110877a9fd10f99784ba4834baddf` |
| mac-browser-readonly-diagnostic-3 | command.json | child 1; capture 1; FAILED after exact-title recovery: strict selector sees 2 account controls | 0de86403/831c9b3; elapsed 2.056647834 s; command CPU 1.927194 s | stdout `1df3c8601d956ceaab8dc9a79add7fbb08e132b6e3404cade03deae52f5a3630` |
| mac-browser-readonly-diagnostic-4 | command.json | child 0; capture 0; Read-only startup PASS; exact title, visible account, polling, 0 POSTs | 0de86403/831c9b3; elapsed 2.125222958 s; command CPU 2.032975 s | stdout `76e8b1892cbf4b82f25ab3776c4e4a1e3a687a77c7348d972a57c446db515425` |
| mac-browser-readonly-diagnostic-5 | command.json | child 0; capture 0; Read-only startup PASS; sole failed GET is scope-summary 403, 0 POSTs | 0de86403/831c9b3; elapsed 1.520991125 s; command CPU 1.682840 s | stdout `76e8b1892cbf4b82f25ab3776c4e4a1e3a687a77c7348d972a57c446db515425` |
| mac-browser-readonly-diagnostic-6 | command.json | child 0; capture 0; Read-only startup PASS; sole failed GET is configured-register 403, 0 POSTs | 0de86403/831c9b3; elapsed 1.484992375 s; command CPU 1.672382 s | stdout `76e8b1892cbf4b82f25ab3776c4e4a1e3a687a77c7348d972a57c446db515425` |
| mac-two-browser-polling-2 | command.json | child 0; capture 0; PASS: 1 sender click and POST, receiver 0 ; 5,348.972708 ms <= 10,000 ms; no observer navigation | 0de86403/831c9b3; elapsed 8.421563791 s; command CPU 3.541912 s | stdout `65d0d01cd809b40b1cf1d4e816403f44c6efa1ae1f2101e948f9947a78230635` |
| gate-1 | command.json | child 1; capture 1; FAILED: Native Counter rejects streaming; Node 79, Counting 55, plain 3,106 passes and 1 skip, Native 835 passes, 1 failure and 2 skips | 0de86403/831c9b3; elapsed 1230.488071916 s; command CPU 2604.791569 s | stdout `9196b3d6377ee4e734b4e8c3a18b447cbbd56112c235184df05723268f547196` |
| Page generated-module equality (nested gate 1 case) | `gate-1/command.json`; operator-inputs/gate-detail-gate-1/test.log:2811 | PASS; Page test/assets.test.ts; reporter 67 ms | Same frozen source; nested within FAILED gate 1, no separate command timing | Same gate 1 stdout; case detail in test.log |
| counter-source-types-1 | command.json | child 0; capture 0; Counter source compiler PASS | ce4cec64/caa0220; elapsed 0.297144250 s; command CPU 0.543177 s | stdout `EMPTY` |
| native-test-types-1 | command.json | child 0; capture 0; Scope test compiler PASS | ce4cec64/caa0220; elapsed 0.913016208 s; command CPU 3.965144 s | stdout `EMPTY` |
| counter-owning-1 | command.json | child 0; capture 0; 56 tests PASS; scripted browser adapter/command/speech boundaries | ce4cec64/caa0220; elapsed 2.106561458 s; command CPU 3.303981 s | stdout `28ee4d9128cea43ca2a3e9c24316ec4b3a6920b309462e036f8bb6a74ef7cd69` |
| native-maintained-projections-1 | command.json | child 0; capture 0; 2 local Native projection tests PASS; unchanged Native test | ce4cec64/caa0220; elapsed 9.387027334 s; command CPU 10.936146 s | stdout `a7203fd6d038f50dd110931b8c647c42a2a6bd41f45df6a727461c023959e3d2` |
| counter-streaming-assertion-control-1 | command.json | child 0; capture 0; DISTINGUISHES; exact source/mode restoration, test unchanged | ce4cec64/caa0220; elapsed 0.713920417 s; command CPU 0.657383 s | stdout `0fa6ca5496c03cf5e4e2e6ed71f7d732014070f852385eee455277e14a6fd409` |
| Counter control baseline-build | control scratch `baseline-build/command.json` | exit 0; PASS; owning bundle built | ce4cec64 control; closed; elapsed 0.125125125 s; child CPU 0.098625 s | stdout `52e86b39b513169b35ac15d71282a55f9ad6979afe6ba65b15c0b7c5dde09e18` |
| Counter control baseline-test | control scratch `baseline-test/command.json` | exit 0; PASS; one unchanged named assertion | ce4cec64 control; closed; elapsed 0.193345333 s; child CPU 0.214731 s | stdout `ee631216334363c7cf5712c371f28634b33102e5f62772e685f32bffc1462a0e` |
| Counter control mutant-build | control scratch `mutant-build/command.json` | exit 0; PASS; wrong implementation bundle built | ce4cec64 control; closed; elapsed 0.117836500 s; child CPU 0.092104 s | stdout `52e86b39b513169b35ac15d71282a55f9ad6979afe6ba65b15c0b7c5dde09e18` |
| Counter control mutant-test | control scratch `mutant-test/command.json` | exit 1; FAIL; one ordinary AssertionError, unexpected streaming status | ce4cec64 control; closed; elapsed 0.192780542 s; child CPU 0.214807 s | stdout `020f7cb8ef3b95f57e4be41a569c6f9470308f875abd3042c03820e06affac8e` |
| gate-2 | command.json | child 0; capture 0; PASS; Node 79, Counting 56, plain 3,106 plus 1 skip, Native 836 plus 2 skips | ce4cec64/caa0220; complete/closed; elapsed 966.962653042 s; command CPU 2067.251390 s | stdout `0915e3a1d3d2a42c23a250c9315dfe96683339da860f6dfed19a20e1ba1b3d40` |
| Receipt audit (prior report) | `operator-inputs/prior-review/prior-finalization/audit-terminal.json` exact argv/cwd | exit 0; 29 formal captures closed; no integrity, incomplete, unclosed, inconclusive or timeout issues | stdlib audit only; wall 0.714624542 s; host child CPU 0.711585 s | stdout `6bd4de012ac1b8d928d3d77261487757cfd34f9c1661f2ad5cf005eb71a90d07` |
| settings-page-source-types-1 | command.json | child 0; capture 0; PASS source compiler | e438c49f; elapsed 0.313592333 s; CPU 1.109620 s | out `EMPTY`; err `EMPTY` |
| settings-page-test-types-1 | command.json | child 1; capture 1; FAIL TS2339 context | e438c49f; elapsed 0.483929333 s; CPU 1.698610 s | out `29c97cf1f657c4dd034022bbe7dad2098ec405bdfa156db25c2fda3ae1bc43c1`; err `EMPTY` |
| settings-page-owners-1 | command.json | child 1; capture 1; FAIL 3 setup TypeErrors; 4 passes | e438c49f; elapsed 1.378798709 s; CPU 2.188643 s | out `0de4d7246335c5ab7ce608b6f98a8bd5df188b8b68eaac00bb511ee5d6d86a41`; err `d5751ff6efcec54972abbd793cb6df65d5056fbb3d8339e3f2ee4a7d86564c5c` |
| settings-page-test-types-2 | command.json | child 0; capture 0; PASS test compiler | c9b11bbf; elapsed 0.427299333 s; CPU 1.594627 s | out `EMPTY`; err `EMPTY` |
| settings-page-owners-2 | command.json | child 0; capture 0; PASS 6 Page+1 asset | c9b11bbf; elapsed 1.417706292 s; CPU 2.305740 s | out `d294f38fc5f376c23baa307fa14bf18a358947897c6349d879f944cb016548d1`; err `EMPTY` |
| settings-interval-assertion-control-1 | command.json | child 0; capture 0; DISTINGUISHES; restored | a9d686b2; elapsed 2.867667917 s; CPU 3.743358 s | out `b7939158b075ae6ef06d161f60ea10cf2038f70c0d1855d2ea984b4df748a203`; err `EMPTY` |
| Settings control baseline | interval-control `baseline/command.json` | exit 0; PASS 1, skip 5; valid setup | a9d686b2; closed; elapsed 1.363170375 s; child CPU 1.814180 s | out `fa445437992b6f9cf76dc37b75d1596348a81facb353ff288fcd5ae199ddd4ce`; err `EMPTY` |
| Settings control mutant | interval-control `mutant/command.json` | exit 1; FAIL 1, skip 5; AssertionError at 74; no TypeError | a9d686b2; closed; elapsed 1.342966708 s; child CPU 1.794586 s | out `de7d1a09cb2f06042cc116b7e21438b1f5b75807b521c3f924d8a84d66ef87ca`; err `bd05931eb5d615204f4d96a2ec966bed89d03a0a49831dcba81b379371d0ca60` |
| gate-3 | command.json | child 0; capture 0; PASS; Node 79, Counting 56, plain 3108 passes/1 skip, Native 836 passes/2 skips | a9d686b2/5470ef1; complete/closed; 941.353572292 s; command CPU 2000.306773 s | out `8c7ebea16090301350e29eb7785cfd88eee3f123d31c69e645720943552ff1ca`; err `EMPTY` |
| Continuation receipt audit | `finalization/audit-terminal.json` exact argv/cwd | exit 0; 36 captures closed; no integrity/incomplete/unclosed/inconclusive/timeout issues | wall 0.904965167 s; host child CPU 0.901600 s; no project checks | out `0335ccb1be72c1988ba3637112656b9309a06f3e3051c791daa69ba80c30024f`; err `EMPTY` |

The three catalog metadata files and their digests remain in the selected
inventory and final manifest citations.

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

The overlay verifies 3,492 public files at 0de86403/831c9b3. Deploy 1 refuses
preflight before remote attempt/upload: pinned weed 145,299,138 B exceeds 128
MiB. Three read-only diagnostics retain that cause, then validate the 256 MiB
repair. Deploy 2 makes the first actual maintained upload and checks
readiness/served JS SHA256
`6007498de22a89c08666a16f19bf044737c40b35da2e4dc2730f93eaa958913e`. Project
config/session secret and observed service lifetimes remain unchanged. Deploy 1
stays failed. CLI inspect/activation/open records one supported demo activation
and one TEST issue; each mutation has one POST/native confirmation. The helper
privately retains each signed request before transport, resolving only that
original by read-only settlement/following. No unknown triggers a replacement;
public phase receipts exclude private bodies.

Witness 1 stops before marker/comment at the heading guard. Numeric review
shows sole PID 91761 exited 0. Original browsersClosed:false includes the unmet
two-browser requirement, not proof of a live child. Diagnostic 2 has
ERR_NAME_NOT_RESOLVED; separate LAN proof resolves 192.168.1.52 and validates
normal HTTPS hostname/TLS with 200. Later headed browsers use task-only DNS
mapping/direct proxy to Caddy, without HTTP mocks/system DNS changes. Explicit
endpoint-SPKI exception proves no system trust installation. Diagnostic 3 sees
Opening your room→exact TEST title, then two account controls. Correct title/
visible-account waits let diagnostics 4–6 pass startup without POST; those
results establish no comment propagation or latency.

Witness 2 uses v3 SHA256
`77b9ea231418dcea9e2be0206362c3a4abcf1344758087e97f8310c3167cb6b9`. One
click/one sender POST and zero receiver POSTs yield the unique later comment
after 5,348.972708 ms within 10,000 ms. Receiver URL/timeOrigin/navigation
count stay fixed; distinct PIDs 5859 and 5884 both exit 0. Root reviewed three
passing TEST screenshots. Healthy-stream/no-polls has scripted owning evidence
only.

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

Gate 2 closes child 0/capture 0 with clean matching ce4/caa source. Receipt
SHA256 `8a82c2d9c45c3ea20f34796f8c54256ea27cb15b4f7d9f97dcdaedb3eccf5a6b` binds
966.962653042 s and whole host child CPU 2067.400041 s; command CPU 2067.251390
s stays separate. Install skips after dependency/lock verification; load/cache
comparability is unknown. Phase counts stay separate. All four terminals
complete, scope duration profile partial, 69 unknown/suite, 0 contradictions,
no full-coverage claim. Counter/Lending projection cases pass. Stdout, not a
summary.json, carries the summary. Its 27 detail files total 44,707,488 B under
operator-inputs/gate-detail-gate-2; copy SHA256
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
counts precede its final metadata; they do not describe the continuation.

## Settings-loader review repair

Checker c130edef found invalid pollIntervalMs escaping through settings' outer
catch to null, hiding connection/custody. Original report
`33540f977a4bc5d7ef00569f2b7d9ca9e665a2c9`, tree
`4b987b444745d414ddc09ee9408d9048deb0f1fe`, keeps its ce4 source/gate 2 result.
The local catch now drops only invalid interval and defaults to 5 s;
place/publicKey/raw storage stay unchanged. Journeys cover valid 1000, invalid
60001/string "5000", key/room loading, no saveSettings/setItem, later comment
and retirement. Initial test.each misbound context: TS2339 and three setup
TypeErrors remain failed. Ordinary for-of cases fix that fixture only;
follow-up compiler and 7 owner cases pass.

Source compiler passes at `e438c49f46881ccee818239bf34125b04ad33e74`, tree
`586b50fdffbf2d28108e453830f877f6d3eea9b3`; initial failures share that source.
Follow-ups use `c9b11bbf53c92a99d59a920e159301054752dcad`, tree
`9f72c589df6e7912e4cf666812cb427d4c12ddcb`. Current
`a9d686b2461cc91aabcc61f943575cd40036318a`, tree
`5470ef1575a691d4c3977a80fccaa4ae0d199cdf`, adds only two OBSERVE.md lines.
Main `1c8c22d238fde04e5dbbb20020a5e9922061232c6fd67d2635e2171c6f4fbb3b` and
test `d6b5456531d3aece75a91bcab95985c46589a1e128018f3cc2d3e4c117f76943` SHA256
stay unchanged at that docs checkpoint.

Nested interval-control commands live at
`operator-inputs/review-repair-selection-1/interval-control`. Baseline passes
1/skips 5. Removing the local catch reaches the unchanged assertion at line 74:
loadKey was never called. Mutant 1 is an ordinary AssertionError, not setup
failure. Helper 0/DISTINGUISHES restores Main bytes, 0644 mode and clean head;
test stays unchanged. No browser/Native/gate claim.

New JS is 1,123,574 B, SHA256
`e37ad35bff9223aa4ad704698e4970304879124c2cb1c91bf8a716ac091f1987`, 13 B larger
than served input. `operator-inputs/page-asset-source-2` retains extraction. No
new deploy/browser trial exists. Checker c130edef permits retaining the 0de
valid-settings witness for this settings-only repair, not byte equality or
execution on a9d686b2.

`operator-inputs/prior-review` retains 20 files/1,246,980 B including metadata;
copy SHA256 `4afabaa445439c47900cb278edff17aeb8d2be36a7eb9376df1629fee6fefcfa`.
Prior note/manifest, renamed root index and final metadata form partial
history, not a reaudited full old RAW. The index keeps its old namespace;
original RAW stays sealed. Continuation RAW
`/Users/hughpyle/play/artroom-evidence/2026-10-29-page-fallback-review-repair`
now has a historical prepared inventory of 2,409 files/224,752,917 B. Gate 3
closes complete at a9d686b2/5470ef1 with matching clean source; its receipt
SHA256 is `d15543a65c3fb81f19043bd4f29159e80d94a1b406590c734ccfd3e573bd1edd`.
Whole host child CPU 2000.432455 s differs from command CPU 2000.306773 s.
Install skips with verified dependency view. Scope module timing remains
partial while all four terminal phases complete; 69 unknown/suite and 0
contradictions imply no full coverage. Stage walls (kernel, Node, Counting,
plain, Native) are 0.18692, 55.96374, 1.91687, 71.58025, 791.38599 s, not
concurrent duration sums or CPU. No new deployed Page or browser trial follows
from this gate.

Gate 3 detail has 27 files/44,709,276 B; copy SHA256
`3315d48dc2378b17f07a23b86da4ee7f989bdc2ea01e1339b76b485857de8405`. The
review-repair-selection-1 unit has 32 files/385,560 B including metadata, copy
SHA256 `5c9c605a99ba7d01d3ba2f1b9a68e094e088d0243d7b461d834733eed1b3d513`.
These retain the interval-control/patch/helper evidence without new execution.

Continuation audit passes for 36 formal captures, preserving failed outcomes.
Its 77,380 B JSON SHA256 is
`6e45fa4ced391e021e3b357fd9702544110c3580b214de2a345b256660829fc4`; the 4,627 B
table SHA256 is
`74c8c88c454409fa47e436341e05bc528f392eb5e86854a32fee31fa13a7cd17`. Prepared
counts precede final metadata. Finalization must bind the reviewed note hash,
write index/manifest, seal permissions and read back the whole collection
before artifact publication. Its final manifest gives actual membership/counts.
Both RAW collections retain evidence at least 30 days after landing; later
removal requires a planner act naming the relevant manifest. No new
seal/review/landing result is claimed. The forthcoming report tail changes only
the implementation note and manifest, leaving a9d source/test bytes unchanged.

## Open limits and owning requests

- Request `5874b15de9079d93cbcbf8ac44d22778d065af33` owns exact-head review, revised
  note, continuation manifest/seal and landing.
  Both earlier gate outcomes remain distinct.
  The review request must name the actual report commit and tree.
- The same request owns remaining acceptance judgments for healthy streams,
  served-byte equivalence after later changes and retained browser limits.
  The earlier Counter-only repair kept the Page input graph unchanged; the
  settings repair uses the checker's valid-settings witness disposition.
- Host installation, TLS, same-node preserve and crash evidence belong to H3
  request `cbcadd7f0ecb1a59b470dbf50f14ff1d3c374a86`. The overlay and actual
  Worker upload here bind the Page trial without rerunning H3's acceptance.
- Private inputs, seeds, signed bodies, native journals and raw Mac logs stay
  outside public evidence. Only reviewed public receipts and safe TEST images
  can enter the final retained evidence. The finalizer owns seal/readback.
- Polling supplies no independent deployment pin, physical cancellation,
  mutation settlement, archive recovery, automatic resubmission or new read
  authority. The same-origin trust and physical callback limits above remain.
