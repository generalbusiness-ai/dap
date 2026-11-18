# Local Worker smoke transport observations (LS-3)

The smoke now records which transport boundary failed without exposing
private CLI output. The install failure's cause remains **unknown**.
No local celld run or workflow has tested this source yet.
The ordinary gate child passed. Its wrapper separately failed only the
post-run main-ref check, as qualified below; the raw result stays FAIL.

Request: `0139796f619fa8c7207477966bc6f026e4502dc7`.
Promise: `b4fe932bd8085a429c3d9b4397f914b763ba901a`.
Ruling `92d9d4ff3987fbeea77fe805e088ab69cfa13dfb` accepts three
boundary owners and the bounded backend-output exception. Source-ready
act `0c1fb96801f8f46e80c49370fdc03d8ee8362444` records the final
reviewed proposal. LS-1 and LS-2 remain closed.

## Source and diagnosis

The implementation is commit `ffea78bbf662a94c80072bf776358466a3a23c0b`,
tree `a8d1f5ab454e9ab18659bd2c0b23294a3ed3825e`, with parent
`bc147b4ce21c4cb8bfdeb8b1fa1db1529ea6cdd8`. That parent is the frozen
CE2/LW1 candidate. The isolated worktree is
`.builder-worktrees/ls3-transport-observation-20261115`.

Only three source paths change:

- `scripts/celld-smoke.mjs` classifies maintained private CLI failure
  forms into closed transport kinds and HTTP status classes.
- `scripts/test-celld-proxy.mjs` observes the actual client, proxy and
  upstream exchange, freezes its state before cleanup, and retains the
  bounded backend tails.
- `scripts/celld-smoke.test.mjs` holds the closed fields, privacy guard
  and five scripted replies through actual planned CLI creation.

The request records workflow run `43751494558` failing during install
at main `ce6f02ba` with `transport-no-answer`, about two seconds after
the step began. Planning passed. The source diagnosis follows the real
`install --planned` creation path through client `httpTransport`, the
temporary TLS proxy and the unchanged Room Worker. Offline planning
proves no served creation behavior. Several request, reply-stream,
encoding and answer-validation failures reach the same CLI message.
The short observed failure does not identify which one occurred.

The diagnosis therefore establishes no CLI, proxy, Worker or celld
product fault. LS3 changes observation at the owned script boundaries;
it changes no Worker, SDK or fetch shim. It adds no scope kind, platform
definition, capability, tool family or record model.

## Closed observations and backend output

Transport kinds are `no-reply`, `reply-not-answer`, `reply-too-large`,
`deadline`, `missing-fetch` and `unclassified`. Status classes are
`none`, `1xx` through `5xx`, and `invalid`. The classifier discards
the private CLI line after matching a maintained form. Unknown text
does not become a public message, path or diagnostic value.

The proxy records actual lifecycle, startup-health, phase, status and
directional failure fields from finite lists. Its first failure survives
the later errors caused by teardown. Startup observations describe the
last completed probe, not a new health check or a claim of current
Worker health. A proxy-generated 502 and a complete backend 5xx retain
different fields. Request/Response construction and body-adapter errors
keep their own client seam; they do not escape an asynchronous response
callback or leave its transport promise pending.

The three owners are `clientadapter`, `proxy` and `celldbackend`.
Backend ownership prints the exact sentence `backend, cause not observed`.
It identifies an investigation boundary, not Worker code or the runtime
as the cause. The classifier never interprets quoted child text.

`backendOutputFor` returns null before accessing either stream unless
the owner is `celldbackend`. That backend-only exception may quote child
paths or private text. It is not a claim that the child output is safe
for general publication. Each stdout and stderr tail keeps at most
12 lines, with at most 512 UTF-8 bytes of decoded text per line.
Truncation and actual EOF completeness have explicit flags. Full raw
streams remain in owner-only private files; success receipts and
non-backend failures receive no tail text.

The collector repair joins both stream settlements, then attempts to
save the bounded tails even when a collector failed. A collector error
stops the owned child and destroys both owned readers so a peer without
EOF cannot hold the join. The first collector error remains the failure,
even if saving the tail also fails. Existing raw-output bounds and
transport/owned-close deadlines stay unchanged. This repair has a source
review; no separate collector-failure runtime test is claimed.

## Evidence

The table separates setup, source commit and the one actual control.
The whole-owner baseline and mutant ran inside that control; no separate
green owner or third restored-green run followed it.

| Check and source | Actual result | Record and actual argv |
|---|---|---|
| Authentic owned dependency setup at parent `bc147b4c` | PASS. One `cp -cR`: exit 0, 0.790360 s; total 5.463930 s. Eighteen metadata inputs, 107 installed roots, 15 workspace bindings, 57 exports, 18 bin links and 21 owned directories checked. Source/index/donor unchanged. No install or restamp. | `/private/tmp/artroom-ls3-owned-dependency-setup-attempt1-20261115/result.json`, SHA-256 `163ff87e83a2ba9fc0998e94bab35629b015fd3384d3bb7ebaa002826fd2aa91`; actual copy argv: `copyArgv`. |
| `ffea78bb`: normal source commit | Exit 0, 0.453287 s; source clean. Three script paths, 330 insertions and 31 deletions. Normal hooks; no bypass. The commit binds the final reviewed 36,971-byte patch. | `/private/tmp/artroom-ls3-source-commit-attempt1-20261115/result.json`, SHA-256 `088846e068293819dade87da8af1edbd12d5b0b418edf51d30d0bb728827a788`; `commands[*].argv`, actual commit stdout/stderr beside it. Reviewed patch `/private/tmp/artroom-ls3-proposed-source-20261115/source-to-proposed.patch`, SHA-256 `5ee8834db60d3922774cd7eabce316908277ff58e0eeb612d86992a0ee46cac8`. |
| `ffea78bb`: whole-owner privacy control | DISTINGUISHES. Baseline: all 8 existing tests passed. Removing only `if (owner !== "celldbackend") return null;` made the child exit 1: 7 passed and 1 assertion failed. The direct non-backend bounded-object-versus-null assertion failed before the throwing-getter loop. Helper exit 0, signal null, reaped; wall 3.274342 s. Exact source bytes and mode 0644 restored; head/tree clean. | `artroom-evidence/2026-11-15-ls3-privacy-control-attempt1/result.json`, SHA-256 `d515881fd77501c802bfa064781c26afca8fef923ebb138485ae8c649fdaa56b`; exact helper argv: `argv`. Safe stderr.log beside it, SHA-256 `e3ac635acbf68ff467304d27d597a7d0d4a80104c2b4a1badd1bce68b433a919`. END `d18dd0eb6a97db7ca604863cb4a9de6a45f145bd`. |
| Local celld and workflow observation | UNRUN. No binary acquisition, local celld launch or workflow dispatch under this source/control lane. Cause and product ownership remain unknown. The next workflow must supply its actual observations at the main that carries LS3. | Request `0139796f619fa8c7207477966bc6f026e4502dc7` and ruling `92d9d4ff3987fbeea77fe805e088ab69cfa13dfb`; no future run, outcome or cause is asserted. |
| `ffea78bb`: ordinary full gate and wrapper qualification | Gate child PASS, exit 0, signal null, reaped. Child wall 935.772485 s; wrapper outer 936.115242 s. Kernel passed; Node 205, Counting 56, Plain 4,877 plus 1 skipped, Native 1,136 plus 2 skipped. Native wall 591658.458917 ms. All four case terminal ledgers complete; scope-stories module summary partial; 129 unknown/suite observations, zero contradictions/report errors; per-stage CPU unknown. Natural Scale omit, outside scale paths, no command/result/wall. Raw wrapper verification exit 2/status FAIL solely `Main moved`; that result is not relabelled. Gate includes successful typecheck and helpers. END `3a019d1678069cda57c01029cac51372877aa7cf`. | `artroom-evidence/2026-11-15-ls3-full-gate-attempt1/result.json`, SHA-256 `6e190f727041b34c19d7a33a769a48017a220b62e4e24a68829b9b6ea560df9e`, actual argv `step.argv`; released gate.log SHA-256 `8c28c3dae4d8a8905779423a299adf11f229d844fd0f88144a84a3a81779658c`. Same directory: stage-status-summary.json SHA-256 `85d91eb9e74874d9af28f66fd8f35275b0f38e3e2403e56d4cff84ddfc1575bc`; scale-selection.json SHA-256 `229aba25dfb8efe16c0bd322837e26b8d6b11c01fb7b4456491d8d01644ac751`; post-gate-source-correspondence.json SHA-256 `ecb202139261882812e41097357a1d87f6aa4f41b36089fd726bb8c5376f75b0`. |
| Final documentation and review | The exact-head artifact report binds the final documentation head/tree and its four limited check results. Review and landing follow filing. Workflow observation and cause remain open. | Ruling `9c8801bd0edcca5a0fb994c15c7ad675f2c8c707` retains the `ce6f02ba` gate base and requires the notes-only tree difference in the later review. |

The maintained helper removed its conclusive before/after scratch TAP
files as usual. Those raw children are **not retained**. The safe result
and 532-byte stderr summary above remain available; they report the
baseline, direct assertion failure, classification and restoration.

The full gate ran at `ffea78bb`, tree `a8d1f5ab`, from START
`cc19398dd6492e385f91602de1e6eb8f92a5b8bc` with base `ce6f02ba`.
During that run main and origin moved to
`9e42735a1901b54c09145841dae51439f522b1c1`, adding only
`notes/reports/2026-11-15-sprint-report.md`. The source head/tree stayed
clean and unchanged. The wrapper's immutable FAIL records that ref
change; it is separate from the actual npm gate child's PASS.

Ruling `9c8801bd0edcca5a0fb994c15c7ad675f2c8c707` explicitly keeps
the gate's original base and says the result stands, without a restart
or follow-up for the one-note difference. The private branch integrated that published main as commit
`506eb6776bfba38411a5adc755be2a395339298f`, tree
`82add442f35c4d8dcb0a4cd5cc73e6d0a33416a6`. That tree adds the LS3
implementation note and sprint report to the gated tree. Final note edits
and four limited documentation results bind through the exact-head
artifact report. Both tested and final trees belong in review.

Root inspected and released the exact gate.log. Full test/stage logs
remain private. This gate also produced eight complete closed CE2 phase
objects inherited from its parent source; they are actual observations,
not new LS3 transport or cause evidence, and no witness rerun supplied
them. Their safe index is in the same gate directory as
`ce2-phase-metrics-index.json`, SHA-256
`32763b53e4481427975bd5277f22e9674ac20c4aa64bb5f5b65bff3f7115e730`.
Concurrent case/module sums are not stage walls or CPU measurements.

The same baseline's existing owner exercised all five actual planned
CLI specimens: thrown private error, empty 502, malformed 200, oversized
reply and valid native-shaped refusal. Each preserves the attempted
founding/register and makes one attempted creation request. The valid
refusal keeps `creation-refused`. Those replies use injected transport;
they prove no actual TLS relay, celld process or Worker response.

## Remaining boundary

The next red workflow can identify the client adapter, proxy or celld
backend boundary. Backend output may show more, but its text supplies no
automatic cause classification. If a backend-owned failure and its kept
output still do not expose the cause, the planner may request a separate
reviewed Worker shim. No shim belongs to LS3 now.

The ordinary gate child passed with the explicit wrapper qualification
above. No local workflow PASS, diagnosed product repair, review, landing
or deployment follows from the control or gate. The workflow condition
remains open, and the planner sets the next order after its actual
observation. LS3 leaves CE2/LW1's frozen candidate unchanged.
