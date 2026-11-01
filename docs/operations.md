# Observe a deployment

The scope Worker reports its state in four ways: `dap status`, the
public `/health` route, metrics in Analytics Engine, and request
correlation. A deploy check reads the metrics and health after a
deployment.

The room Worker's [configuration](../apps/room/wrangler.jsonc) declares
the `METRICS` Analytics Engine binding and `VERSION_METADATA`. It keeps
console logs at full head sampling and turns off platform invocation
logs, which can include URLs. These settings apply when you deploy the
Worker.

Metrics and correlation are operational data. They grant no authority,
and they are absent from signed answers, sealed entries, outbox messages
and replay. A missing, failing or slow metric binding does not change a
native answer.

## Status reads

`dap status` uses a fresh room session to read the configured register,
directory, membership, rules scope, destination and the caller's inbox.
It finds other scopes from confirmed references and recorded creation
sends. `dap status membership`, or a scope ID, selects one scope.

Each scope has a summary with its status, time and the count of items in
each type and state. The outbox column counts requests without a result
and diagnosed sends. An admin session also reads both waiting lists and
operational incidents. A member sees those columns as `denied`.

Each list stops after 20 pages. Discovery stops at 1,000 scopes and reads
at most 20 history pages for each scope. A count at a page limit is
`more; partial`. A read refused as `forbidden` is `denied`. Other
refusals, transport failures, repeated cursors and a native head that
changes between pages give `unknown`. These states never become zero. A
partial summary keeps its partial label.

Each column prints the head from its own read. The columns are separate
observations, not one snapshot of the room, and operational rows can
change without a native entry. Discovery follows the caller's read
permissions and limits. The final scope count is a count of observations,
not a complete inventory of the room.

`dap status --request <16-hex-id>` also reads the retained correlation
rows for that server request ID through the admin session. The ID is
exactly 16 lowercase hexadecimal characters. This column shows the
retained window and each row's entry or outbox reference. A window that
changes between pages gives `unknown`. Without `--request`, status makes
no correlation read. Status needs a room session and never falls back to
signed entry reads.

## Health

`GET /health` returns a JSON body with five fields: `deployment`,
`version`, `sessions`, `register` and `wiring`. `HEAD /health` returns the
same status with no body. A query string or a request body is refused
with 400. Other methods return 405.

| Field | Values |
|---|---|
| `deployment` | The `DEPLOYMENT` setting, or `unknown`. |
| `version` | The Worker version UUID from `VERSION_METADATA`, or `unknown`. |
| `sessions` | `ok` when the deployment name and session secret pass the session configuration checks, otherwise `unavailable`. |
| `register` | `ready`, `absent`, `not-ready`, `unavailable`, `unconfigured` or `ambiguous`, as described below. |
| `wiring` | `artifacts` and `github`, each `{"state": "wired"}` or `{"state": "off", "reason": ...}`. |

The register comes from `REGISTER_SCOPE`, the primary register setting.
When `REGISTER_SCOPE` is set, it must be a valid scope ID, and an
`ARTIFACTS_CONFIG`, if present, must be valid and name the same register.
Otherwise `register` is `unavailable`. When `REGISTER_SCOPE` is unset, the `registerScope` of
`GITHUB_APP_CONFIG` or `ARTIFACTS_CONFIG` is the fallback. No valid
fallback gives `unconfigured`, and two different fallbacks give
`ambiguous`.

The Worker probes the selected register's metadata without a scope read
session, a provider call or a native turn. The probe gives `ready` for an
active register, `absent` for a scope that does not exist, `not-ready` for
other valid metadata, and `unavailable` for an error or malformed
metadata.

A host's wiring is `off` with the reason `unconfigured` when its setting
is absent. Other reasons name the part that is wrong: for Artifacts
`invalid-config`, `namespace-mismatch` or `missing-binding`, and for
GitHub `invalid-config`, `private-key`, `read-token`, `creation-token` or
`cleanup-tokens`.

Health returns 200 only when `sessions` is `ok`, `register` is `ready`,
and no configured host has its wiring `off`. Every other result returns
503.

Each caller waits at most two seconds for the probe. Concurrent callers
share one probe in each Worker isolate. A caller's timeout keeps that
probe reserved until it ends, so repeated timeouts start no more probes.
A finished result is cached for five seconds. Health does not measure
provider access, publication readiness or room-wide capacity.

## The metrics-v1 slot map

The dataset is `artroom_metrics_v1`. Its optional index is the scope ID.
Each point has nine blobs and six doubles. Every numeric value is a whole
number from 0 through 2,147,483,647. Durations are in milliseconds.

| Blob | Meaning |
|---|---|
| 1 | Kind from the table below |
| 2 | Deployment, at most 128 UTF-8 bytes |
| 3 | Worker version UUID, or `unknown` |
| 4 | Closed operation, route or diagnosis place |
| 5 | Native turn end, or the kind's operational result |
| 6 | Closed reason, `none`, `aggregated` or `summary` |
| 7 | Server request ID, `none` or `mixed` |
| 8 | Validated incoming trace ID, `none` or `mixed` |
| 9 | Public answer for a public native `answer` end; route execution mark; otherwise `none` |

| Kind | Doubles 1 through 6 |
|---|---|
| `turn` | Multiplicity, duration, restarts, timed attempts charged, timed entries written, wrote count |
| `route` | 1, duration, 0, 0, 0, 0 |
| `session` | 1, 0, 0, 0, 0, 0 |
| `signed-read` | 1, 0, 0, 0, 0, 0 |
| `join` | 1, 0, windows open, joins waiting, 0, 0 |
| `dispatch` | 1, 0, attempts, acknowledgments, diagnoses, 0 |
| `diagnosis` | 1, 0, 0, 0, 0, 0 |
| `incident` | 1, 0, 1, 0, 0, 0 |
| `stream` | 1, 0, open streams, released streams, 0, 0 |
| `metric-dropped` | 1, loss bitmask, lost rows, affected turns, affected critical turns, groups merged |

[metrics.ts](../packages/scope/src/metrics.ts) defines the closed places,
reasons, diagnosis steps and events. The collector drops and counts
unlisted values and invalid numbers. It never truncates caller text into
a valid row. For an opted-in whole-scope `scope-full` refusal, the turn
reason names the exhausted budget: `scopeEntries`, `scopeBytes`,
`scopeItems`, `scopeRecords` or `scopeRequests`. Older refusals keep
`scope-full`. No guard name enters the reason slot.

A native end is `answer`, `idle`, `busy`, `clock-behind` or
`unavailable`. It stays separate from the public answer. An internal
diagnosis turn can end `answer` with no public answer. HTTP public turns
use the places `create`, `acts` and `preparations`. Direct and
MCP-backed calls use their own `rpc:` places. A route mark comes from
entry into the native turn. Missing execution metadata counts as a
critical loss of coverage.

The collector keeps one of the 250 points of each invocation for its
final summary. It keeps turn rows first, then routes, then other rows.
Repeated identical turn groups add up without losing resolution. Above
64 groups, or when it must fit the write budget, the collector coarsens
the reason, then the public answer, then the place. It never merges
different native ends. Counter sums stop at the numeric bound.

The loss bits are 1 for budget, 2 for invalid fields, 4 for group
coarsening, 8 for a sidecar failure and 16 for overflow. A critical turn
has an end of `busy`, `clock-behind` or `unavailable`, an invalid end or
a saturated counter. A final summary row cannot prove its own presence,
or detect the loss of both a route and its turn. These metrics alone
cannot prove that no busy turn occurred.

## Check a deployment

`scripts/deploy-check.mjs` reads Analytics Engine and the public health
route for one deployment. It needs a route latency bound from an
observed run of the deployment.

```sh
node scripts/deploy-check.mjs \
	--deploy-output /absolute/path/wrangler.ndjson \
	--calibration /absolute/path/observed-calibration.json \
	--deployment demo-deployment \
	--health https://demo.example/health
```

Set `CLOUDFLARE_ACCOUNT_ID` and `DAP_ANALYTICS_READ_TOKEN` in the
operator's environment. The token needs Account Analytics Read. Keep it
out of repository files and command arguments. Only the SQL request
carries the token, and the health read carries no analytics credential.
The check makes reads only.

Deploy with the project's pinned Wrangler 4.147.0 and a fresh output
file. [Wrangler's structured output](https://developers.cloudflare.com/workers/wrangler/system-environment-variables/)
is NDJSON that `WRANGLER_OUTPUT_FILE_PATH` selects. The check needs one
version-1 `wrangler-session` for `deploy` and one successful version-1
`deploy` record. It takes the Worker version from that record's
`version_id`. A version upload, ambiguous output or `command-failed`
cannot stand in for a completed deployment. The health body's version
and deployment must match the ones that the check selects.

The calibration is a JSON object with exactly these fields:

| Field | Meaning |
|---|---|
| `format` | `dap-metric-calibration-1` |
| `deployment` | The same public deployment name |
| `version` | The lowercase Worker UUID of the observed calibration run |
| `from`, `through` | Canonical UTC ISO timestamps for its window, at most fifteen minutes; the window has ended |
| `routeCount` | Observed weighted route events, at least 100 |
| `p95Ms` | Observed whole-millisecond route p95 |
| `boundMs` | Chosen whole-millisecond bound, at least that p95 |
| `recordingSha256` | Lowercase SHA-256 of the retained observation |

The calibration can come from an earlier version of the same deployment.
The recording digest is the operator's declared reference. The script
does not follow it or certify that the observation happened. Each input
file is at most 256 KiB. The result reports both input-file hashes and
the calibration.

The query selects the deployed version for a fixed fifteen-minute
window. Event counts sum multiplicity times the sample interval. Counters
sum their aggregated value times the sample interval, without applying
multiplicity again. Route p95 is the weighted nearest rank of unmerged
route durations. Refused routes are reported beside errors, and only
route `error` ends count toward the one-percent error threshold.

The check fails when any of these holds:

- fewer than 100 weighted routes
- no turn
- a newest event older than five minutes
- an error rate above one percent
- a p95 above the supplied bound
- any busy turn
- a failed SQL query
- a health body that does not match the deployment

Coverage is a separate result. Recorded loss makes coverage
`incomplete`, and sampling or unresolved turn places make it `unknown`.
With no sampling and no loss, turn-marked HTTP routes must balance public
turns at each of `create`, `acts` and `preparations`. Routes before a
turn are left out. RPC, alarm, dispatch and mixed places cannot balance a
missing HTTP turn. The result always lists undetectable paired loss,
missing summaries and the limits of alarm and dispatch places. A
complete result describes observations. It does not prove that no busy
turn occurred.

The client limits the SQL result to 50,000 rows and 16 MiB, health to
4 KiB, each response to 65,536 pieces and each request to ten seconds. An
overfull, truncated or malformed reply fails the check, which never
judges a partial window. A redirect is an error. The query leaves out
scope indexes, request IDs and trace IDs, and excludes the separate
[MCP metrics](mcp.md#operational-metrics). The check prints no raw
provider response and no token.

Exit 0 means the check passed. Exit 1 means it failed. Exit 2 means an
input file was invalid.

The reported `weightedRows` is the sum of sample intervals over metric
points. The check does not measure storage rows written: `rowsWritten`
is `null`, with `rowsWrittenReason: "not-measured"`. This total does not
gate the check, and the turn wrote-count and timed-entry count cannot
stand in for it.

## Request correlation

Every HTTP response has a server-minted 16-hex `dap-request-id` header.
The Worker accepts an incoming `traceparent` only in exact lowercase
version 00 form, with nonzero trace and parent IDs. The response keeps
the trace ID, mints a new parent ID and keeps only the sampled flag. The
Worker ignores invalid trace context, and it neither keeps nor echoes
`tracestate`. A trace ID is untrusted: a client can repeat one across
unrelated requests.

An admin session can read
`GET /v1/scopes/<scope>/requests?request=<16-hex-id>`, or use
`trace=<32-hex-id>` in place of `request`. Exactly one selector is
required. The read returns at most the 100 newest rows, with the current
native head, the retained window, `complete` and an optional `next`
cursor. Pass the cursor as `cursor=<next>`. A complete read covers the
retained operational window only.

The sidecar keeps at most 4,096 rows. Each write first deletes every row
older than seven days, then evicts the oldest row only if the sidecar is
full. Every query leaves out expired rows, even when no writes occur.
Expired bytes can stay until the next write. A write follows the native
entry transaction or outbox attempt and cannot roll either back. Several
missing entry-index rows can affect one turn, which counts once as an
affected turn. An older admin token lacks the permission until a new
session is issued. Member sessions and signed entry reads cannot read
this index.

## Source

Checked against main `5dc9765f` on 30 October 2026. Sources: [health.ts](../packages/scope/src/health.ts), [metrics.ts](../packages/scope/src/metrics.ts), [request-index.ts](../packages/scope/src/request-index.ts), [status-report.ts](../packages/cli/src/status-report.ts), [deploy-check.mjs](../scripts/deploy-check.mjs), [wrangler.jsonc](../apps/room/wrangler.jsonc).
