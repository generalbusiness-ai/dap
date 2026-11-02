# Local stream refusals reach the native 64-stream limit

## What changed

This record answers request `5f87ccc243e67d8793ca1570a9a51e543369eb34`, promise `830020540dad06ef9399880ad74515592e7de4bd`. It adds a note and evidence manifest. It changes no product source.

A corrected local replay retains 20 HTTP503 bodies. Every body is `{"ok":false,"reason":"unavailable"}`. Each Worker-side sample shows the directory holding 64 streams, with zero releases. The native per-scope limit explains those captured refusals.

Both diagnostic scenes open all 100 rows in 20 fresh tabs. Each scene exits 1 because its original console-error check catches stream HTTP 503s. The other 35 checks pass, including unchanged issue heads and items, and zero browser acts. This record reports those diagnostic failures. 

## The decisions and why

The source distinguishes the refusal from its HTTP status. [`Streams.open`](../../packages/scope/src/sessions.ts) first checks the reader and removes streams whose sessions no longer qualify. It then returns `unavailable` when the scope holds its limit. The default `STREAMS` value is 64. The [native stream method](../../packages/scope/src/object.ts) calls that method, and the [Worker route](../../packages/scope/src/worker.ts) maps the refusal to HTTP503. Other refusal reasons can also map to 503. The status alone cannot identify the branch.

The corrected run supplies the missing distinction. Its 20 bodies all name `unavailable`, and its samples all show 64 open streams. Serving-limit windows and waiters stay at zero. The `STREAMS` constant defines this limit in dap. The scope is the new fixture’s directory, identified independently from the scratch CLI configuration.

The first run observed 13 HTTP503 responses in 45.010 seconds. Playwright failed to retrieve all 13 bodies, and the browser reported `net::ERR_ABORTED` for those same request IDs. Thirteen native samples showed 64 open streams and zero releases. Those samples show pressure, but the missing bodies leave the first run’s refusal reasons unrecorded.

The second run corrects only the capture boundary. An out-of-tree Worker wrapper clones an already-decided HTTP503 response before it returns the unchanged original. It never reads or wraps a successful stream body. A local diagnostic endpoint exposes the captured refusal metadata and safe bodies. The recorder verifies their byte hashes before writing them. The wrapper uses the real production classes and the same indexed scope binding for native counts. It changes no stream limit, session rule, release method, or Page byte.

That run takes 44.041 seconds and retains all 20 refusals: 35 bytes each, with no cache drop or capture error. Browser status observations and Worker captures each count 20 for the same directory. Worker capture IDs and browser request IDs are separate. The record compares their counts and scope, without claiming a new per-request correlation field. Extra native reads, response cloning, and metadata writes can affect timing. The two fresh fixtures and different counts do not measure a change in availability.

The final samples after the last tab closes still show 64 open directory streams and 60 and 40 open issue streams. Every release count is zero. Those counts do not locate the missing step. A browser abort does not prove that the Worker body received cancellation or that its release RPC ran. Follow-up `01e2c4c40e1bd52f806d15e9a56d2ec8d0d91981` owns that investigation. This head makes no source repair and does not raise the cap.

The older fixed replay recorded 30 stream HTTP 503 console diagnostics without bodies. The corrected run cannot recover those missing reasons. It also cannot explain the separate deployed agent stream that had HTTP200 and ended with TypeError after 305 seconds. The follow-up keeps those limits distinct. This local record does not say that the problem occurs only locally, and it does not reopen J5’s accepted deployed scene.

## The final evidence

Source checkpoint: `fb171f70ca5377c326f91f1249f71d0a5d2e8ad5`, tree `7bccb0a9b8d90deeee7dc2cca0fd8b70a1312386`. The manifest is `evidence/2026-11-02-stream-cause.manifest.json`, SHA256 `f2151bc88f0bdf0d6635ac8e7713a9f221067c4670675013adef27c88f431449`. It covers 108 files in three sealed units under `/Users/hughpyle/play/artroom-evidence/`.

The Python drivers use a monotonic wall clock around the run block. The spans include fixture setup, Worker startup, browser work, shutdown, and report extraction. They exclude preparation and sealing. They are not individual row latency or CPU measurements. Counts come from captured status events, Worker clones, native `serving()` replies, and the scene’s assertions.

| Check | Command or observation | Actual result | Output SHA256 |
|---|---|---|---|
| First capture syntax | `node --check` on three retained diagnostic scripts | exit 0 for all three | `2026-11-02-stream-cause/syntax-checks.json`: `65d5f40e942584766ce7dfe75c45316cab1a6052af060ab2bd2ce98b87be1c7c` |
| First native replay | `python3 /private/tmp/artroom-run-stream-cause.py` | exit 1; 100 rows; 13 stream HTTP 503 console errors; zero other console errors | `2026-11-02-stream-cause/run.json`: `789a82eb0c62d66afff5ccef0d4d508b2b6fd66fdcdabb658e0bbbdbf81ad274` |
| First capture limit | `python3 /private/tmp/artroom-seal-stream-first.py` | exit 0; 13 native cap samples; no retained refusal body | `2026-11-02-stream-cause/first-run-analysis.json`: `80c5c3f3793bf5bf361f6273c6aa714b670b4993c81aad8c13a1b40d5c141400` |
| Corrected capture syntax | `node --check` on the three corrected diagnostic scripts | exit 0 for all three | `2026-11-02-stream-cause-2/syntax-checks.json`: `65d5f40e942584766ce7dfe75c45316cab1a6052af060ab2bd2ce98b87be1c7c` |
| Corrected native replay | `python3 /private/tmp/artroom-run-stream-cause2.py` | exit 1; 100 rows; 20 stream HTTP 503 console errors; zero other console errors | `2026-11-02-stream-cause-2/run.json`: `1cc300acfdafbae3d4aeee848e204ae28971a12047a4302ae76cbe09844e2813` |
| Worker capture boundary | Read the retained out-of-tree wrapper | Only a 503 response is cloned; production classes and ordinary responses stay unchanged | `2026-11-02-stream-cause-2/diagnostic-worker.ts`: `0a9715d84dfdff9ec731f633bfc7fa0d6e3efc5cfc605fc2dbe13a41180d7e87` |
| Captured refusal bodies | Worker response clone, then byte/hash verification in the recorder | 20 copies of the same 35-byte unavailable body; all 20 files appear in the manifest | `2026-11-02-stream-cause-2/row-press/worker-503-001.body`: `04fa1970ecf4853ff373c2ca1e4a1cf097c97c57205f1edc3a8109b5b9536e63` |
| Native counts and capture completeness | `python3 /private/tmp/artroom-seal-stream-second.py` | exit 0; all 20 samples show 64 open and 0 released; no dropped or failed capture | `2026-11-02-stream-cause-2/captured-refusals-analysis.json`: `6307aeaa36892225aa3b9238c25a0ebf8d2a26accd17a01723ecf5fe14ad70b6` |
| Complete event metadata | Browser request/status events and local native samples | 184 stream responses: 164 HTTP200 and 20 HTTP503; no terminal-byte claim | `2026-11-02-stream-cause-2/row-press/stream-diagnostic.events.ndjson`: `a544d274d4d98717160ca84e9aebdf8b22bdfa8fe5d0e88eb1da3cd606e993d6` |
| Fixture scope identity | `node --import tsx /private/tmp/artroom-stream-fixture-public2.mjs` | exit 0; captured scope equals the new local directory | `2026-11-02-stream-cause-2/fixture-public.json`: `0431463dd66995aa0a1380a5446f6ab0101f24b016bba46d2290212e1d761717` |
| Pinned existing tools | Read package versions, browser catalog, and Node identity | Wrangler 4.147.0; playwright-core 1.63.0; Chromium revision 1243; no install | `2026-11-02-stream-cause/tools.json`: `e08e8bfcfaab65d60e22a4acab4075b582a6058313edd00db51e1ab173a5a94b` |
| First evidence scan | Named-pattern scan and inspection of four fixture PNGs | exit 0; no pattern match or visible credential | `2026-11-02-stream-cause/evidence-scan.json`: `d2234ba6d85b6302921aaf0b95e8f8729811729ecee8175a6cdad6ccb6e78cd7` |
| Second evidence scan | Named-pattern scan and inspection of four fixture PNGs | exit 0; no pattern match or visible credential | `2026-11-02-stream-cause-2/evidence-scan.json`: `61a8be009d74f17aef4561aae6747c1f4cd48751fa554f993289449d051e531e` |
| Unchanged source and prior gate | `python3 /private/tmp/artroom-stream-source-proof.py` | exit 0; prior gate.exit reads exit 0; all 46 prior gate files verify | `2026-11-02-stream-cause-source-proof/source-equality.json`: `4b0cf8508febc65a801a4afca3f64a93d0d804b342ee98ca526d8eac34f67a75` |

Both source scenes keep the shipping probe’s original console rule. The temporary copy changes only module resolution for its external location, the private diagnostic Wrangler config path, the observer import, and capture draining before shutdown. Its `harness.patch` records those edits. `capture-boundary.patch` records the second attempt’s capture repair. The source worktree stays clean throughout.

The prior full source gate ran at `658aab954d7a017c5cbce0d7daf28bb798fa1f52`, tree `27936fcbfd752aef7a6fecf02961279f258c2628`. Only documents differ at the source checkpoint above. This record adds only this note and its manifest. The document-only follow-up rule in `docs/testing.md` permits reuse of that gate. No product test or gate repeats for the record.

Every evidence unit has verified checksums and readonly mode. Keep all three units for at least 30 days after landing. Raw command stdout and stderr stay private because an unexpected failure could expose a credential. Keys, browser profiles, session-secret argv, Worker storage, and Wrangler control/cache files also stay outside evidence. The record retains their output byte counts and hashes, safe native refusal bodies, and public scratch references. The screenshot review supports the credential scan and makes no separate visual acceptance claim.

## The open limits

- **Missing releases — `01e2c4c40e1bd52f806d15e9a56d2ec8d0d91981`.** Native release counts stay at zero after local browser aborts and page closes. The transport, route-body, release-RPC, and native-scope boundaries still need a controlled diagnosis. The existing queue keeps its order. Any verified repair gets a separate reviewed source head.
- **Historical and hosted outcomes — `01e2c4c40e1bd52f806d15e9a56d2ec8d0d91981`.** Neither the first diagnostic’s 13 bodies nor the older 30 bodies exist in evidence. Their refusal reasons remain unassigned. The distinct hosted HTTP200 stream ending after 305 seconds also remains unassigned. Current local cap evidence does not fill those gaps.
- **Shipping probe accounting — `1580f866d92efe58caff0541c982c364ec402da5`.** Its next scheduled edit owns stream-diagnostic accounting and the unused import. This record leaves the shipping script unchanged.
