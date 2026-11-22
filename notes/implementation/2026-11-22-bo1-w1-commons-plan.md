# BO1-W1: plan for dap-commons

Plan under request `30bc6c91` and promise `5087f259`. Planner ruling
`9b0585ca` decides the separate Worker, cohort, matching register pair,
private custody, Start removal, and non-destructive rollback. Ruling
`e53e0500` authorizes the timed checks below.

## Register and founding

Use the separate `dap-commons` Worker at
`https://dap-commons.inguz.workers.dev`. Leave dap-demo and its register,
rooms, J4, and S1 untouched. The checked-in cohort is Register 23,
Directory 22, Membership 9, Rules 14, Destination 16, Inbox 1, and Commons 1.
Use an owner-only, fresh CLI home and `--cohort commons`. The default cohort
is different.

The `--plan` path signs and saves locally, so it can run before the Worker
exists. The operator sets `DAP_W1_HOME` to the absolute path of the private
CLI home and makes the retained plan.

```sh
DAP_HOME="$DAP_W1_HOME" dap install --plan https://dap-commons.inguz.workers.dev --cohort commons --host artifacts --namespace dap-commons --register-policy keys
```

The plan signs the install intent, determines a new public register scope ID,
and retains the intent and key. Its deadline is 14 minutes. The deadline is
part of the intent digest used to derive the register ID. Refreshing the plan
changes that ID even when the same private key signs it. The retained plan
cannot refresh its deadline while keeping its register ID.

Prepare the deployment in two steps:

1. Review a structural change that removes `DEMO_START_CONFIG` and updates
   `demo-config.test.ts` to accept either the closed `unplanned` pair or two
   valid, exactly equal register pins. Run the usual full gate and review
   before creating a plan. Retain the existing closed pair until the plan.
2. After that review, make one plan in the dedicated private home. Check its
   full retained ID and deadline. Change only `REGISTER_SCOPE` and
   `ARTIFACTS_CONFIG.registerScope` to that exact ID. Verify equality and
   confirm that the timed config commit changes only those values. Run
   `packages/cli/test/demo-config.test.ts`,
   `scripts/security-entry-points.test.mjs`,
   `scripts/security-settings.test.mjs`, and `npm run pins`. The checker stays
   available for the timed review. Start only when review, deployment, and
   submission can proceed. If approval has not arrived eight minutes after
   the plan, stop. If deployment has not completed ten minutes after the plan,
   stop. Keep the exact plan for reconciliation. These limits do not guarantee
   completion before the printed deadline.

After the required review and deployment, submit
`DAP_HOME="$DAP_W1_HOME" dap install --planned --cohort commons` before the
printed deadline. Record the receipt and full register reference, including
its genesis hash. Verify Register 23 and the founding signer before a founder
creates one room. If an unattempted plan expires, keep its original home and
make any new plan in a separate empty home. If `ARTROOM_HOME` is set, unset it
or set it to the same new directory as `DAP_HOME`. Review both new bindings.
If any send was attempted, stop and reconcile the exact retained plan. Do not
replace it or infer non-creation from expiry. Exact attempted replay can recover
a previously accepted genesis, but cannot create a never-accepted expired one.

The config retains `SCOPE_INDEX_MODE=enforce`. The index adapter classifies
`create` as creation and does not require a pre-existing index row. The
checked-in creation policy includes Register 23. This supports bootstrap
without register mode or open creation, provided the deployed index binding,
the exact creation pin and the planned register settings match. The native
creation and registration must still succeed and be verified after deploy.

## Configuration

The two-step proposal changes three keys in `apps/room/wrangler.commons.jsonc`.
The first step removes the Start setting. The timed step changes only the two
register values.

- `vars.REGISTER_SCOPE`: `unplanned` to `<planned-register-scope>`.
- `vars.ARTIFACTS_CONFIG.registerScope`: `unplanned` to the identical scope.
- `vars.DEMO_START_CONFIG`: currently contains `register: "unplanned"`.
  Remove the key for this keys-only CLI-founded plan. The current value has
  a string `register: "unplanned"`, while `demoCreationConfig` requires a
  full `{scope, genesis}` reference. Its presence also enables the Page
  Start link, so leaving it advertises an unusable offer. A later Start setup
  needs its own reviewed full reference and open-policy decision.

All other checked-in keys remain as written, subject to the planner's review:
`name`, `main`, compatibility date and flags, `PLATFORM_CREATION_PINS`,
`SCOPE_INDEX_MODE`, `ARTIFACTS_NAMESPACE`, `APPLICATION_SCREEN_HOSTS`,
`APPLICATION_TRUST`, the four `SERVING_*` limits, `DEPLOYMENT`,
`PUBLIC_ORIGIN`, observability settings, and the v1 migration. Bindings are
`SCOPES`, `SCOPE_INDEX`, `REGISTRIES`, `AGENTS`, `ARTIFACTS`, `METRICS`,
and `VERSION_METADATA`. The hostname is the Worker URL above. The planner
sets `SESSION_SECRET` in the private secret store. Do not put secret values,
private CLI homes, tokens, or signed bodies in this note. Review the deployed
binding and secret inventory by key before applying it. No new screen trust,
GitHub key, or open-creation setting is assumed.

## Request budget

An idle, confirmed scope with no other alarm or ingress has no periodic
archive wake after its wake clears. That is a code-based floor of zero
archive alarm requests per hour, not a measured total Worker rate. Other
alarms can run a full archive pass even after confirmation. If there are M
such alarms per hour, the existing AR-1 analysis allows up to about 6M
Directory calls, in addition to those alarms. M is not measured for this
Worker.

For one happy-path room, plan one preflight, 23 ordered note invocations,
and one final verification within one hour. Each invocation has a
128-request cap and a 120-second deadline, so 25 × 128 gives at most 3,200
same-origin witness HTTP requests in that hour. This is not a DO bound.

A baseline with one membership session request per actor per invocation is:

| Work | Scoped requests | Health requests |
|---|---:|---:|
| 25 preflights: six summaries, six genesis entries, two Commons summaries, and two Membership sessions each | 400 | 25 |
| Receipt and text pairs: 253 prior-note checks, 23 immediate checks, and 23 final checks | 598 | 0 |
| One act per note | 23 | 0 |
| Final Commons view: one summary, one or two history pages, and 23 text reads | 25–26 | 0 |
| Total | 1,046–1,047 | 25 |

The 253 prior checks are `0 + 1 + ... + 22`. Each pair assumes the normal
successful receipt entry read and one text read. A refusal may make
`followReceipt` read again. The final page count assumes the 23-note history
fits in one or two pages. MCP preparation, fallback, retries, hosted browser
reads, setup, provider calls, and internal Worker-to-DO fanout are excluded.
These are scoped ingress counts, not measured DO requests. Health may itself
probe readiness. The actual fanout and elapsed time are not established.

The 23 successful notes create 23 new Commons entries. The current native
archive allowlist in `packages/git/src/archive-policy.ts` does not include
Commons 1, so the estimate assigns no Commons export pass to those entries.
None of the seven pinned cohort definitions appears in the current
`ARCHIVE_NATIVE_DATA` eligible set. The archive estimate is an upper bound.
For each other archive-bound scope whose archive cannot start, the AR-1
scenario gives at most six passes in its first hour and one per later hour,
about 42 and 7 DO requests respectively. The evidence needed for an aggregate
estimate is the actual per-turn source, provider and alarm work on this Worker.

After register founding and before Hugh begins, the planner reads a baseline
with `scripts/do-rate.mjs --worker dap-commons`. Prefer one complete 15-minute
window at no more than 25 requests. That window corresponds exactly to 100
requests per hour and falls within the approved 10–15 minute interval. If the
baseline exceeds the limit, stop before Hugh begins.

The planner reads five-minute Durable Object windows during W1 with
`scripts/do-rate.mjs --worker dap-commons`. A window above 500 requests
stops W1 traffic for reconciliation. After W1, the planner reads one idle
hour. The expected idle rate is near zero. More than 100 requests in that
hour blocks further use.

## Witness and person steps

Before provisioning, the planner schedules one 40–60 minute block with
Hugh. Hugh uses the founder key to create the room and verify the receipt,
full scope references and cohort. He authorizes one controlled agent under
Membership 9, verifies its member and controller, signs his four marks one
at a time, and confirms the final readback. Hugh holds the founder key and
his own marks. The agent signs 19 notes: three carriers, 14 rows, the list,
and the question-links note. The block is a planning estimate.

Each invocation submits at most its named note. The agent reads under its own
session, and each later step verifies the accepted earlier receipts and exact
retained text. After the final note, verify all 23 notes, authors, signers,
and citation references as described in `examples/commons-bill/README.md`.
A reference grants no authority to read its target. A check sends nothing.
A timeout or unknown outcome requires reconciliation of the original request,
not a replacement signature. Confirm the exact W1 content, agent role,
access path, and operator who runs it before starting.

## Rollback and teardown

Stop W1 traffic and disable or revoke the controlled agent through the
recorded membership procedure. Preserve the original request and any unknown
outcome until reconciled. The planner owns all deployment actions. If the
new Worker fails, return its route/configuration to the previously reviewed
closed state and keep its register identity and private custody available for
inspection. Do not point it at dap-demo or change another Worker's register.
A committed note and register are durable facts, so a rollback cannot undo
them. Namespace deletion, Worker removal, retained archive handling and
credential teardown require a separate planner decision after evidence is
secured. No automatic destructive cleanup is proposed.

## Evidence

The gate ran on clean `da69aa9f021c5932a1eee41f85fedd8790e46279`, tree
`2f9fec1f5c83d0ab2ef325865873d1436650b881`. This follow-up adds the evidence
section and changes no source or tests.

| Check | Command | Exit and wall time | Output and SHA-256 |
| --- | --- | --- | --- |
| Notes-only gate | `/usr/bin/time -p npm run gate` | 0, 35.92 s. Static checks, types and definition pins passed. The gate skipped tests for the notes-only diff. | `~/play/artroom-evidence/2026-11-22-da69aa9-bo1-w1-plan-gate/gate.txt`, `c8cd67eeff5da8b75c82076b1248c79b9cc00ddd487833d752f4050fe1df7ce7` |

## Decisions and missing evidence

The Worker, cohort, exact matching register pair, custody, Start removal, and
rollback are decided by `9b0585ca`. The timed checks and stops are authorized
by `e53e0500`. The exact W1 content, agent role and access, and operator for
each invocation remain open. Confirm the Wrangler pin at deployment and
measure the Durable Object rate. Any request to archive Commons itself needs
an explicit policy for that native definition. The existing local BO1 witness
establishes the local sequence. W1 measures the hosted path.
