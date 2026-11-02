# J5 on the deployed roster repair

## What changed

The deployed Page completes the scripted J5 scene on main `313840592ee0f4d4c49dd617f969534998d99e50`, tree `ead96ec28b18a11e31c53a1de4f4067d9bb2e441`. The run exits 0. Its first room-wide read passes 67 checks, and its final read passes 59. The list matches the real `needs_you` rows across the scratch room. Reading a row leaves it open, and decided questions stay after reload.

Ana's Page sends one **Approve** act and one **Decide** act. Each receives HTTP 200. Approve leaves Una waiting. Decide wakes the real CLI process, which names entry 11. A fresh process reads that entry and releases the block at entry 12 with Una's key. The verifier exits 0 and reports consistency for its stated coverage and trusts.

This head answers request `ff7f7671`, promise `2678d86b`, after the [roster repair](2026-11-01-j5-row-press.md). J5 acceptance stays open until the checker reviews this record and it lands.

## Decisions and why

Planner receipt `b72f0f8b` names the deployed source and all three Worker versions. This scene uses dap-demo version `7548ed1e-d8ac-4c87-a39c-ebc9f521af00`. Both the Worker response and the browser's actual Page response match the source script, SHA256 `cc8189fb8b8b072ab3b6c73e77d276b562bb62b69b3ac19dda6c5eddb2504142`.

Scripts drive every step on one Mac. Separate homes and the retained Ana3 browser profile stand in for two devices and Ana's absence. No person or desktop AI app runs this scene. The browser types no value, including an invitation link. The enrolled device, Ana's first home, Vic and Una all pass native identity checks before new fixture acts. Fresh run-4 issues keep this scene's acts separate from the earlier scene.

The first preflight exits 1 before a browser or fixture act starts. I compared the Git commit with `/health.version`, which holds the Cloudflare version metadata UUID. The observed UUID matches the planner receipt. I sealed that attempt, corrected the guard to check the two identifiers separately, and made the deliberate second attempt in a fresh unit. The passing unit retains the failed preflight unchanged. No automatic retry occurs.

The earlier sealed [old-Page control](2026-11-01-j5-page-acceptance.md) remains the negative control. Its first-screen assertion fails because that Page has no room-wide list. This run verifies its committed checksum and referenced files. It does not rerun that control.

Planner `f3378674` requires stream statuses and bodies. CDP Network records the browser's decoded bytes without changing Page code, routing, cache rules, or breakpoints. A Node tap records CLI and server streams. It reads finite error bodies before handoff, which can add error-response latency. Both recorders can affect timing. Local HTTP controls prove their byte delivery and cancellation boundaries. They prove no native authority. The retained [Chromium protocol definition](https://chromium.googlesource.com/chromium/src/+/ab904a465bb62def710df17870c11e3bd09d6014/third_party/blink/public/devtools_protocol/browser_protocol.pdl) defines the Network methods used by the browser recorder.

The deployed capture observes seven HTTP 200 stream answers and no 503. One further request has no observed response or terminal event at the capture boundary and has received zero bytes. Its outcome remains unknown. The report keeps received prefixes separate from complete bodies and counts answers against the four recorded presses. Status counts refer to response openings, not chunks. This bounded scene does not establish that deployed 503s never occur.

`Streams.open` returns `unavailable` at 64 open streams per scope and the Worker maps that refusal to 503, but the old local traces lack bodies that identify their cause. Planner `40e66992` permits that cause to remain open. Builder owns it under `5f87ccc2`.

## Evidence

The source checkpoint is main `313840592ee0f4d4c49dd617f969534998d99e50`, tree `ead96ec28b18a11e31c53a1de4f4067d9bb2e441`. The scene runs from 21:18 to 21:25 EST on 1 November. Raw output is in `/Users/hughpyle/play/artroom-evidence/2026-11-01-j5-after-row-fix-2/`, SHA256SUMS `220fee9899d8da211983d60227ec98cf49449269c086992c51e9ea9914b07eba`. Keep it for at least 30 days after landing. The manifest records its absolute path, file count, and full cited-file hashes.

The gate ran once at `f51fbf5d`, tree `0582e116f568350728c8409e22d9c048d038565c`. Only the repair note and manifest differ through the deployed source. This head adds only this record and its manifest. Source, tests, and Page workflow inputs stay unchanged. The review request gives the final tree and the complete document-only diff. No second gate runs.

The wait duration is the difference between its logged start and exit clocks. The wake interval is the difference between the script's recorded Decide press start and the CLI wait's exit. Those observed values are 339.003 seconds and 853 milliseconds. They describe one recorded run, with capture overhead, rather than a latency guarantee.

| Check | Command or recorded invocation | Actual result | Output digest |
|---|---|---|---|
| First preflight | prior `run-scene.py`, deployment check only | exit 1, identifier comparison error before any fixture act | `12a7d932f4dd3bf3` |
| Deployment and Page bytes | `node run-step.mjs 0-check-deployment.mjs` | exit 0, expected Worker UUID and source Page bytes | `0871748d79c932d6` |
| Retained native identities | `node run-step.mjs 0-verify-identities.mjs` | exit 0, four homes name the same service, room links and actual members | `a547760faf1483ea` |
| Retained second device | `node run-step.mjs 0-browser-identity.mjs` | exit 0, Ana3, matching actual browser script bytes, no act | `bd6c3c0db1e466ac` |
| Fixture setup | the setup and room-wide fixture commands in `step-results.jsonl` | both exit 0, fresh import and export issues | `24a847691d8ffdff` |
| First-device views | `node run-step.mjs 5-first-device.mjs` | exit 0, real server over stdio, five needs_you rows, unchanged issue head and log | `1c1cf17966ab5abf` |
| First room-wide read | `node run-step.mjs 4-roomwide-read.mjs` | exit 0, 67 checks, no browser act | `42c5df64180e2afb` |
| Approve | `node run-step.mjs 8-page-press.mjs approve Approve` | exit 0, one POST 200, wait stays open | `81d7e4508fb12b78` |
| Decide | `node run-step.mjs 8-page-press.mjs decide Decide` | exit 0, one POST 200, wait wakes in the measured interval | `773575302c2d74f4` |
| Agent wait | real `dap issue wait`, argv in `wait-started.json` | exit 0 after 339.003 seconds | `7a0c50106b58a9c5` |
| New process and verification | `node run-step.mjs 9-resume.mjs` | exit 0, release entry 12, verifier reports consistency within its stated coverage and trusts | `4664a50040173d13` |
| Final first-device view | `node run-step.mjs 5-first-device.mjs 11-first-device-after` | exit 0, four remaining rows, unchanged read head and log | `0cedcffca79d005d` |
| Final room-wide read | `node run-step.mjs 4-roomwide-read.mjs --after` | exit 0, 59 checks, new decision remains after reload | `7835a5a87d175dc8` |
| Stream recorder controls | three finite local HTTP fixture runs retained in `capture-control/` | each child exits 0, including ignored refusal bodies and cancelled prefixes | `089a449296c1a436` |
| Stream report control | `stream-report.py` over recorded fixture bytes and synthetic press times | positive exit 0, changed-body control exit 1 on its digest assertion | `39f3ab174511cc52` |
| Stream report | `python3 scripts/stream-report.py` | exit 0, seven 200 answers, no observed 503, one request with no observed response or terminal event | `415cb2799dd5ab72` |
| Old Page control reference | `prepare-scene.py` verifies the earlier sealed files | old child exit 1, first-screen list absent, source hashes unchanged | `ee27235531108249` |
| Visual checks | builder inspected three actual scene screenshots | open and decided questions, receipt and comment form remain visible without clipping | `ed491b59e6c35884` |
| Whole scene | `python3 scripts/run-scene.py` | exit 0, every child and final validation passes | `2dc63365115066eb` |
| Source gate | `npm run gate` at the unchanged source checkpoint | exit 0, 3555 plain, 1028 native, 130 Node and 56 Counting tests | `7f85dad6d888693d` |
| Page workflow | [Page browser scripts 41369009582](https://github.com/generalbusiness-ai/dap/actions/runs/41369009582) at `f51fbf5d` | success, all workflow inputs unchanged | `5d3d12c256e75d25` |
| Source equivalence | complete `git diff f51fbf5d 31384059` | only the earlier note and manifest differ | `9c98d507a8964eb0` |
| Final text scan | `python3 scan-evidence.py` after the last raw evidence write | no matching credential pattern in scanned text, images outside the text scan | `e507053295226f6d` |

Keys, Worker storage, browser profiles, and secret-bearing records stay outside the unit. The three image inspections do not claim coverage of every viewport or appearance. Full CLI output, including the verifier's coverage and trusts, stays in `dap.log`. This record claims only the reported result.

## Open limits and owners

- **Local stream cause, `5f87ccc2`.** Builder retains the unidentified local 503 cause under the planner's ruling. This record makes no local-only or global absence claim. The next-edit probe accounting remains `1580f866`.
- **Recovery after a failed roster read, `1da54995`.** The checker found an existing cached-room refusal path by code read. Builder must show it with a run before repairing it. This successful scene does not exercise that injected failure.
- **Desktop host behavior, `1a44f042`.** The first-device host is a stdio script. Goose validation follows recovery. This run exercises no desktop AI app, Reply box, host timeout, or app-only tool behavior. Actor credit remains `c6ced04f`.
- **Coverage and questions, `e82c6550`.** This scene uses the existing J5 scratch room and its pinned question lanes. It does not close the default-room warning or the open-question read's dependency on decided questions.
- **Earlier hosted stop, `3b7c6b0b`.** The first hosted timeout lacks a matching draw capture. The controlled local roster gap is known, but the record cannot assign that earlier stop the same cause.
