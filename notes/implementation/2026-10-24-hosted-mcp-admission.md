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
Controls and the final ordinary gate are pending. No final pass, complete
compatibility result, or hosted rollout is claimed. Root will append the
closed control and gate outcomes before review.

## Rollout and deferred policy

The user has approved pushing the reviewed change. Cloudflare configuration
and deployment remain planner-only. The planner must inventory existing
hosted agents and their tools under request `92d54432`, choose explicit
opt-in and additions per Worker, and deploy the reviewed head. Leaving
opt-in unset closes the endpoint. No live agent, custody, bearer, secret,
usage, or deployment state was read for this slice.

Parent R5 items 4–7 remain open: bearer expiry, plaintext-answer removal
and legacy migration, stream-expiry behavior, failure-map bounds, and
expiry-write authentication ordering. The live inventory and rollout are
separate obligations. This slice does not change or verify those behaviors.
