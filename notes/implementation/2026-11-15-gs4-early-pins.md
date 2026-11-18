# Early checks for pinned values (GS-4)

`npm run pins` runs the existing pinned-value owners before the gate's test
stages. A stale seal, identifier, generated module or tool inventory can
stop the gate before Kernel, Node, Counting, Plain or Native starts.
The one scratch stale-identifier witness reached the unchanged Lending
presentation assertion in pins. Root classified that witness as DISTINGUISHES.
The full combined gate passed at the frozen source below. Final note
checks, independent review, and landing remain owed.

Request: `349bdc90379454bc1558d410553bef1b9402006c`.
Promise: `f7f7040b859b7912bc41bc1497e72b049e1a3dbc`.
Amendment `67d22168d25690a379bddbd11e66d6c9e58fa872` adds the MCP document
inventory as the sixth whole owner. First act `d194809a8ccb768c474d173e48341797639b2ec9`
records the fresh pre-implementation measurement.

## Source and behavior

The original GS4 source act `225bcbcba72f0fae2b2a0c8f0d20ac08a77fca7e` binds commit
`e3e24f1b708383ca06fb971e836517e8d73121e0`, tree
`1f1bc77baf01d14e2e47e469e7ab22c6781e0f00`. GS4 changes only these four source paths:

- `scripts/pins.mjs` runs one fixed list with the existing Node executable.
- `package.json` adds `pins: node scripts/pins.mjs`.
- `scripts/gate.sh` calls that command after `def-pins`, inside the existing
  full-test branch and before `npm test`.
- `docs/testing.md` replaces the separate owner preflight paragraphs with
  the one command and its exit/time requirement.

The current combined source is `50e16a765376298f02325cb5d0166fe4eb34bc95`,
tree `c47b82f46586d98565c9e43e05b32dac0dd2e207`, on base
`9e42735a1901b54c09145841dae51439f522b1c1`. The earlier normal composition
`b389fdf2711b2eb94789dedb2078b5b08877412d`, tree
`c8cdd47fdc509a58189c8a1b4b1fd49dc2fba5b5`, merged GS4 and P1 without
conflicts. Its retained receipt records 27 LS3-retained paths, four GS4
paths, and 18 P1 paths: a 49-path union with 4,929 tracked entries.
The two normal merge commands exited 0. The later frozen `50e16a76`
includes LS4's smoke-output code context. Its known-secret redaction and
smoke observations remain LS4 work, not changes to the pins runner.

CE2/LW1, LS3, LS4, P1, and the planner's Sprint note are inherited context.
GS4 owns only the four source paths above and this implementation
note. The combined gate tests the actual shared source. No inherited gate
stands in for that run.

Compatibility runs first. The six unchanged whole owners then run in order:

1. `scripts/security-entry-points.test.mjs`.
2. `packages/cli/test/application-release-reproduction.test.ts`.
3. `apps/room/page/test/assets.test.ts`.
4. `packages/mcp/test/view-resources.test.ts`.
5. `packages/cli/test/application-examples.test.ts`.
6. `packages/mcp/test/inventory.test.ts`, covering both `docs/mcp.md` and
   `docs/mcp-tools.json`.

The runner removes `MCP_WRITE_DOCS` from every child environment, so the
inventory owner cannot rewrite its retained JSON during the check. It
changes no owner, assertion, expected seal, identifier, definition pin,
generated module, dependency or owner deadline. The reproduction owner
uses its normal scratch preparation path, without applying identifiers.

A failed or signalled child stops the runner. After each successful child,
the runner checks the stage's elapsed time. Above 60 seconds, it reports
failure and starts no later owner. A final check covers completion overhead.
The runner checks time only after a child returns and lets each child
finish under its existing deadline. It adds no kill timer or deadline
extension, so this check is not a hard 60-second process deadline. The
earlier passing runs did not exercise either failure branch. The scratch
witness below exercises a failed owner; the over-budget branch remains untested.

The gate keeps its existing failed flag and EXIT summary. A pins failure
prevents `npm test`; the five canonical stages then remain unreached.
The notes-only selection skips both pins and `npm test`. Ordinary
`npm test`, its pretest compatibility hook, Node enrollment and Plain
projects remain unchanged. The gate deliberately runs the owners again
later. Removing that repeat would need additional enrollment and
same-invocation routing. This work adds no skip flag, cache, manifest or
selector framework.

## Evidence

The historical measurement, the original authored command, and the combined
command use distinct source checkpoints. The historical measurement is not
a pass of the authored runner. Process
walls include child startup/import work. The complete outer totals below
are not sums of test-case durations.

`M` is `artroom-evidence/2026-11-15-gs4-six-owner-measure-attempt1`.
Its public `result.json` SHA-256 is `83a931fe12796b36d6dfa46a89e8a7c2bff82ccac021425de1f00ee753dce8c1`.
`N` is `artroom-evidence/2026-11-15-gs4-pins-command-attempt1`.
Its public `result.json` SHA-256 is `a99b36d339c268c9683aab070af9a8686a2a2bc1dfb9cc7243ff2a57b5a14548`.

`C` is `artroom-evidence/2026-11-15-gs4-p1-ls4-pins-attempt1`.
Its `result.json` SHA-256 is `c0f36eaae15a26706ef7c3fc3221a66436a9f4ceb0633bcddb8fdf0eaa8ba464`.
`S` is `artroom-evidence/2026-11-15-gs4-p1-ls4-stale-id-control-attempt1`.
Its immutable controller `result.json` SHA-256 is `474ee8e020b4b41d1766c12d9547b17b77b8b917d1bc23b48199461d533987ec`.
Root's separate `root-assertion-review.json` SHA-256 is
`46b995bc553178dae20614161e7c2821fe4f7c57dee7c12abe2637741a8280c9`.
`G` is `artroom-evidence/2026-11-15-gs4-p1-ls4-full-gate-attempt1`.
Its `result.json` SHA-256 is `c6314cad08bab493f56d3a602bad90d138c200a9b596aea058d483dbe45867b6`.
Its `gate.log` SHA-256 is `cb4205c5b33dc5118979c8ff1e87a17ed476a0b57d2e63f8d42d2ef5079752d8`.

| Check and source | Actual result and wall | Raw evidence and argv |
|---|---|---|
| Historical fresh measurement at `ffea78bb`: Compatibility | Exit 0, prerequisite; process wall 0.083381791 s; signal null, reaped. | `M/result.json`, `commands[0].argv`; stdout/stderr public copies beside it match their recorded hashes. |
| Historical fresh measurement at `ffea78bb`: Security | Exit 0, 12 passed; process wall 3.911163875 s; signal null, reaped. | `M/result.json`, `commands[1].argv`; stdout/stderr public copies beside it match their recorded hashes. |
| Historical fresh measurement at `ffea78bb`: Release reproduction | Exit 0, 1 passed; process wall 3.289838542 s; signal null, reaped. | `M/result.json`, `commands[2].argv`; stdout/stderr public copies beside it match their recorded hashes. |
| Historical fresh measurement at `ffea78bb`: Page assets | Exit 0, 1 passed; process wall 0.312500583 s; signal null, reaped. | `M/result.json`, `commands[3].argv`; stdout/stderr public copies beside it match their recorded hashes. |
| Historical fresh measurement at `ffea78bb`: Card resources | Exit 0, 6 passed; process wall 1.436877458 s; signal null, reaped. | `M/result.json`, `commands[4].argv`; stdout/stderr public copies beside it match their recorded hashes. |
| Historical fresh measurement at `ffea78bb`: CLI examples | Exit 0, 3 passed; process wall 6.566320875 s; signal null, reaped. | `M/result.json`, `commands[5].argv`; stdout/stderr public copies beside it match their recorded hashes. |
| Historical fresh measurement at `ffea78bb`: MCP document inventory | Exit 0, 5 passed; process wall 1.401619917 s; signal null, reaped. | `M/result.json`, `commands[6].argv`; stdout/stderr public copies beside it match their recorded hashes. |
| Historical fresh measurement: complete launch | PASS, outer 17.555069750 s. Controller 17.497306542 s; child-wall sum 17.001703041 s. All seven commands passed; all stderr files empty. The outer total is below 60 s. | `M/2026-11-15-gs4-six-owner-measure-attempt1.outer.json`, SHA-256 `06c50689d0604d8068ff49a5f2468d7ed0fbc1bcb18d74cf8a0ba17b628d33f9`; exact outer `argv` there. Source `ffea78bb`/tree `a8d1f5ab`, clean before/after. |
| `e3e24f1b`: authored `npm run pins` | PASS, exit 0, signal null, reaped; complete command wall 17.796756249968894 s, below 60 s. Security 12, release 1, Page 1, Card 6, examples 3, inventory 5 passed. The runner prints its own total as 17.531 s. Source stays clean at the exact head/tree above. END `a9c3a73917ea7aa3e832c35ee37f13a980a87537`. | `N/result.json`, exact `argv`: `/opt/homebrew/bin/npm run pins`. `N/stdout.log` SHA-256 `aa3a509b95af3d6d706d32ecdc8ff67d419a3fe339944a9ba0720fad629f5985`; `N/stderr.log` is empty, SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`. |
| Combined `50e16a76`: `npm run pins` | PASS, exit 0, signal null, reaped; complete wall 17.28622945898678 s, below 60 s. Security 12, release 1, Page 1, Card 6, examples 3, inventory 5 passed. The runner prints 17.058 s. Source guard passed. | `C/result.json`, exact argv `/opt/homebrew/bin/npm run pins`; `C/stdout.log` SHA-256 `d6058ad79be5028d09d8ffbb5e88c5c314c85d3be0c24dd21abb51cd0203508d`; `C/stderr.log` is empty, SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`. |
| One scratch stale Lending presentation at `50e16a76` | Gate child exit 1, controller exit 0, reaped; child 36.364219334 s, outer 36.613205625 s. All 13 real preliminary checks passed. Pins compatibility exited 0; all 12 Security cases passed; the one reproduction case failed its direct Lending presentation assertion at `application-release-reproduction.test.ts:32:23`. Pins stopped at release. Kernel, Node, Counting, Plain, and Native all remained UNREACHED. No `test.log` or `stages.json` was produced. Source and scratch bytes and mode were restored; both final source guards were clean. | Exact argv `/opt/homebrew/bin/npm run gate`, in `S/result.json`. The immutable controller status remains `PENDING_ROOT_ASSERTION_REVIEW`, with `machineDistinguishes: false`. Root's separate full-read assertion review records DISTINGUISHES. `S/gate.log` SHA-256 `9f0e12a12ae5155590fe98d6447d4bc0f2aaada85f8137f4e2ce5623be9ee5bf`; `S/pins.log` SHA-256 `759bd1eff3f57253d0d38a56477199a2d4da8aec5e34eaa04b2acb692e32a1f3`. |
| Combined full gate at `50e16a76` | PASS. Child exit 0, verification exit 0, signal null, reaped; child wall 1775.006830875 s, outer wall 1775.611015208 s. Kernel passed. Node 205, Counting 56, Plain 4,890 with 1 skip, and Native 1,158 with 2 skips passed. All four terminal ledgers are complete. Native stage wall is 1,410,703.286791 ms. Stage CPU remains unknown. | Exact argv `/opt/homebrew/bin/npm run gate`; `G/result.json`, `G/gate.log`, and `G/stage-status-summary.json`. START `735d73a2390de22d6f7f9198607ce513cc959bf9`; PASS END `7471c330f974c841a1c68d7d8fd0f11cab8d8530`. Source guards remained clean at the exact frozen head/tree. |
| Natural Scale selection in that gate | ALL selected because `package.json` and `scripts/gate.sh` matched Scale paths. Final Scale rows contain 22 passed cases across 13 modules, with unique case IDs and module files. These rows belong to the Native result above; they are not additional passes. Scale-only wall is unknown. | `G/scale-selection.json`, SHA-256 `4043ea4936e8767235c6eb537e4876bca3f0c3515813c0e3ed0e84d2f3ae6d87`; `G/scale-observation-summary.json`, SHA-256 `905c5dfd79a8df49c56af775ff0cf892c18d7ff3213aeb089e7cb3cc1e3ba439`. |
| Independent review and landing | UNRUN. | Future actual records remain unbound. |

The authored command's printed child walls are rounded to milliseconds:
compatibility 0.099 s, Security 4.426 s, release 3.240 s, Page 0.301 s,
Card 1.427 s, examples 6.680 s and inventory 1.357 s. Its printed internal
17.531 s excludes npm/runner startup. The external complete-command wall
17.796756249968894 s includes that launch. The separate historical
outer 17.555069750 s belongs to its earlier seven-process
measurement. Neither run guarantees that every future invocation finishes within
60 seconds. The source guard measures the runner's elapsed interval; the
complete outer duration remains a separate measurement.

The combined command's printed child walls are rounded to milliseconds:
compatibility 0.087 s, Security 4.042 s, release 3.307 s, Page 0.291 s,
Card 1.406 s, examples 6.625 s, and inventory 1.300 s. Its internal total
17.058 s and external complete-command wall 17.28622945898678 s belong to
`50e16a76`; neither replaces the dated historical totals above.

The scratch fault changed only the retained Lending presentation identifier
from `sha256:188f7b84e6b1ba29c2090265f4d7884a29884beff6ea58774a34ce8fbeef9f81`
to `sha256:088f7b84e6b1ba29c2090265f4d7884a29884beff6ea58774a34ce8fbeef9f81`.
The unchanged reproduction owner recomputed the original value and failed
that exact tuple assertion. Entry, definitions, and semantic values stayed
unchanged. Root read the full gate and pins logs before classifying the
result. The controller did not classify the assertion automatically, and
its original PENDING status remains intact. The unreached canonical stages
do not mean zero tests ran: the preliminary owners and all 12 Security
cases ran before the reproduction failure.

## Source and dependency preparation history

The normal GS4/P1 composition receipt is
`artroom-private-evidence/2026-11-15-gs4-p1-source-composition-attempt1/resume-result.json`,
SHA-256 `4100c71b0e460edabd03056ae04b6d54cb94fb219658c4a2dc8d6831992a6018`.
It records the two conflict-free merge commands and the exact 49-path union.
This source-composition record is not a test result.

Dependency setup attempt 1 stopped before copying because the newly created
worktree's physical `package.json` mode did not equal 0644. That pre-copy
failure reflects the worktree's umask-created modes, not a product failure.
The failed result remains at
`/private/tmp/artroom-gs4-p1-composition-owned-dependency-setup-attempt1-20261115/result.json`,
SHA-256 `0897c0be3899ed16fff75b8ac80fba1d75b35482f0c0063b21347bf06053b873`.
It records `copyAttempted: false` and unchanged source at failure.

The permitted physical-mode correction touched 4,912 physical modes while
preserving source bytes, index, and refs. Its record is
`/private/tmp/artroom-gs4-p1-physical-mode-repair-20261115.json`, SHA-256
`5cf2f8e149315b353fd4763a08e0207b815e1b5237d75f0050a90caa6af016d0`.
Corrected dependency setup attempt 2 then passed: one copy exited 0 in
0.658001375 s; total setup took 3.789174458 s. Its receipt is
`/private/tmp/artroom-gs4-p1-composition-owned-dependency-setup-attempt2-20261115/result.json`,
SHA-256 `c054c7c840e2e3f0f719ce9c020208b795304e5302226abcd2b999ab00d6042c`.
The receipt records the authentic 8b2 lock/stamp view: 107 installed roots,
15 relative workspace links, 57 exports, 18 bin links, and 21 owned directories.
It preserves donor/source/index state and retains copied caches before
creating empty real cache replacements. No install or restamp ran.

The postmerge check compared all 18 metadata paths and retained dependency
identities against that successful setup. The only root metadata addition
from the source merge was `scripts.pins`. Its record is
`/private/tmp/artroom-gs4-p1-postmerge-dependency-correspondence-20261115.json`,
SHA-256 `0c688b46409003fc2f3b38d2b8284e6568d617aa18fbdc51d6fcb6d4e2ce3041`.
The later stale-ID scratch has its own successful setup receipt. That
separate PASS does not replace or relabel the earlier composition setup
failure.

## Timing and coverage limits

The gate's `stage-status-summary.json`, SHA-256
`e18c0decd678dbd56a128bc7e390d0e4df589cdec66f2c3bb70f0e3645407f4c`,
records these actual stage walls: Kernel 225.814 ms, Node 133,136.329459 ms,
Counting 510.367292 ms, Plain 182,913.168208 ms, and Native
1,410,703.286791 ms. Each stage passed with exit 0 and no signal. The
stage ledger reports no errors. Its user and system CPU fields remain
unknown. The gate's rounded `test` step wall is 1,727.8 s; the child and
outer gate walls above cover different intervals.

The gate log records complete Node, Counting, Plain, and Native terminal
evidence. Timing observations for `scope-stories` remain partial. The
summary reports 129 unknown or suite observations and zero contradictory
records. Case and module duration sums overlap in concurrent execution;
those sums are neither stage wall nor CPU. The Scale summary counts only
actual final-source rows and does not count earlier result-source rows
again. Native includes other owners, so its wall is not a Scale-only wall.

## Remaining acceptance

The one stale-ID witness supplies the intended early-stop observation;
no sweep, owner rewrite, deadline change, or repeat witness supplies it.
The ordinary combined gate passed at commit
`50e16a765376298f02325cb5d0166fe4eb34bc95`, tree
`c47b82f46586d98565c9e43e05b32dac0dd2e207`, against main/base
`9e42735a1901b54c09145841dae51439f522b1c1`. PASS END is
`git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:7471c330f974c841a1c68d7d8fd0f11cab8d8530`.

The filed report and `G/final-source-correspondence.json` identify the
document-only successor's head, tree and exact changed paths. Source and
tests remain unchanged from the gated `50e16a76` tree above. Documentation
checks and independent review are recorded separately. Landing follows
the planner's order.
