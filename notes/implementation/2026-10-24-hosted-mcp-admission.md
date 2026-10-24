# Hosted MCP admission: R5 slice A

This change covers R5 items 1–3 under request
`12fb37c9a498042cd16c10fe9bda16a276baf1df` and promise
`a42f84f6bcc5d914fc3dcd98965019cd2fd5bd62`. It does not close parent R5.
The October 22 mixed draft was read as historical Source. Its R15 retirement
work and unrelated lifecycle changes are excluded.

## Endpoint and tool policy

The Worker serves hosted MCP only when `MCP_ENABLED` is exactly `"true"`,
`REGISTRIES` and `AGENTS` are bound, and `MCP_TOOL_ADDITIONS` is absent or
valid. Otherwise it returns `404` before reading the body or addressing a
namespace. The gate covers agent connections and control routes.

`MCP_TOOL_ADDITIONS` accepts a JSON array of distinct known generic tool
names, at most 1,024 characters and 18 names. The hosted default omits
`create`, `install_application`, `credential`, `prepare`, `join`, `record`,
`step`, and `text`. Explicit additions restore selected omitted tools.
Existing service mode still controls `actions` and `act`. The copied policy
controls both listing and dispatch. Omitting `genericTools` preserves local
Node service defaults, including supported custom names `act` and `actions`
for derived tools in default mode. No live Worker settings are inferred from source.

## Fresh admission on the actual target

A named derived call takes a fresh inventory snapshot on every attempt,
including resubmission. It uses the catalogue's selection and standing
checks, then checks the actual target's membership. A grant on one scope
does not admit the same operation on an ungranted scope. The named call
passes its snapshot into dispatch rather than reading a second snapshot.
Generic `act`, `prepare` with a kind, and view actions use the same target
check. `install_application` checks the exact resolved Rules target with
fresh standing before package resolution, signing, or custody work.

Code-granted operations, operations with no action grant, and unknown
standing retain their existing admission behavior. The native scope still
judges the act. This change makes no R9 trust-schema claim.

In the fixed room budget fixture, each named act now reads Membership,
Directory, and Rules, then its target. Comment costs four GETs. Create
also reads retained definition bytes and costs five. The witness checks
those exact routes rather than raising a blanket read allowance. All 70
refused resubmissions retain their outcomes while repeating fresh admission:
four GETs, one POST, and no new session each. Other tool bounds and response
size limits remain unchanged.

## Observed validation and remaining work

The following closed runs remain part of the review record. A later success
does not replace an earlier failure.

| Run | Observed result | Follow-up |
|---|---|---|
| Initial affected run V1 | MCP production compiler passed; test compilation failed on two readonly fixture assignments. No test bodies ran. | Copied each complete fixture value record instead of mutating readonly fields. |
| Affected continuation V2 | Four compilers passed. Node policy 3, errors 7, and describe 8 passed. Budget stopped at comment's old two-read bound; Native bodies were unreached. | Updated only the two named-act read bounds and exact route checks. |
| Whole budget V1 | 21 passed, 1 failed, 1 intentional Darwin skip. The per-tool case passed; the first resubmission reached four reads against its old one-read expectation. | Updated that existing witness to require the exact four GET routes while retaining all 70 outcomes. |
| Whole budget V2 | 22 passed, 1 intentional Darwin skip. All 70 resubmissions passed. | The historical response figures remain distinguished from current read counts. |
| Native continuation V6 | 12 passed, 1 failed, 13 unfinished. | Corrected the revoked-key witness to require authenticated HTTP 200, unknown-tool, and no custody record. Restored custom act/actions aliases in local default mode and strengthened the existing witness. Their validation is pending. |

Whole-budget V2 evidence is retained at
`/private/tmp/artroom-security-r5-budget-validation-20261024-v2/`.
The next continuation, V7, passed all five affected compiler contexts and
24 cases: policy 3, native hosted 17, opt-in 1, and index 3. It closed
naturally at `1d334a7128`, with 97.740 seconds elapsed; its test process
used 94.68 seconds elapsed and 98.27 CPU seconds. Earlier healthy inventory
5, errors 7, describe 8, and budget 22 with the one Darwin skip were carried
without additional focused repeats.

The first target-guard control was inconclusive: one test reached a generic
Error trap, while another failed by assertion. The original result remains
recorded. Three existing forbidden-work traps now use `expect.fail`.
V8 validated that test-only correction at `2f6422a841`: the test compiler
and all 3 policy cases passed, with 2.215 seconds elapsed overall.

Four separate controls then used those healthy whole-file baselines:

| Removed behavior | Observed failure | Other cases |
|---|---|---|
| Shared actual-target admission | Forbidden custody was reached; an ungranted target was accepted. | 1 passed, 2 assertion failures. |
| Local default-mode alias dispatch | A valid custom alias returned an error. | 2 passed, 1 assertion failure. |
| Endpoint opt-in predicate | A disabled endpoint answered 401 instead of 404. | 1 assertion failure. |
| Hosted policy forwarding | The default tool list included `create`. | 16 passed, 1 assertion failure. |

Each control closed naturally with child exit 1 and successful runner exit 0.
The original source bytes, inode, mode, size, and modification time were
restored after each run; change time can change. Root reviewed the actual
assertion diagnostics. No healthy baseline was repeated for these controls.
Their evidence is under `/private/tmp/artroom-r5-control-*-evidence-20261024-v2/`.
The ordinary gate at `c0208a87ad` closed with exit 1: 3524 passed,
2 failed and 3 skipped tests across 496 files. Both failures exposed error
precedence regressions in the new target check. A stale tool descriptor
received `unknown-tool`; a mounted card whose grant was removed received
a nested permission error instead of `view: stale`.

The correction keeps descriptor and digest checks before target admission.
On a target-policy denial, a mounted card runs its existing stale-view
check before returning the denial. Successful calls add no read. Every
attempt still checks its actual target before custody or signing, and the
existing immediately-before-signing view check remains. Existing assertions
and deadlines are retained. The service AST seal tracks the corrected
source.

The first repair continuation at `04a4798510` passed all five compiler
contexts and 17 of 18 tests, including the stale-card case. The binding
case still failed at the cached descriptor: refreshing the catalogue
removed the old name before the descriptor check could run.

The next correction preserves a previous descriptor only when its
configuration is still current and its snapshot was not invalidated.
Fresh state supplies all authorization. After descriptor comparison, the
current catalogue must still serve the exact name and declaration before
execution. The existing binding scenario now also checks that a removed
name on its original target reaches no custody write, signs nothing and
leaves the target head unchanged.

Both failed runs remain evidence. At `909c6d1bfd`, the second repair continuation passed all five compiler
contexts and all four binding and policy cases, closing naturally in
11.000 seconds. Checker decision `24f8119c` requires a new ordinary gate
at the final commit. That gate includes the previously unreached
Node and Counting browser tail; the separate tail runner remains unused.
No hosted rollout is claimed.

## Rollout and deferred policy

The user has approved pushing the reviewed change. Cloudflare configuration
and deployment remain planner-only. Planner decision `8904bf5b` accepts the defaults for local review. Before
deployment, the planner inventories actual tool use per Worker under request
`92d54432`, chooses explicit opt-in and additions, and records those settings
in the deployment record. Leaving
opt-in unset closes the endpoint. No live agent, custody, bearer, secret,
usage, or deployment state was read for this slice.

Parent R5 items 4–7 remain open: bearer expiry, plaintext-answer removal
and legacy migration, stream-expiry behavior, failure-map bounds, and
expiry-write authentication ordering. The live inventory and rollout are
separate obligations. This slice does not change or verify those behaviors.
