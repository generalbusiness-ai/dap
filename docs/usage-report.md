# Report observed Worker use

`scripts/usage-report.mjs` compares one 30-day Analytics Engine aggregate with
the current checked-in Worker configuration inventory. It reports observed
use and states what the existing telemetry cannot measure. This is the R14
script partial. Parent request `bb763efa` remains open for individual routes,
native platform versions, and features beyond the current telemetry.

Create an operator mapping outside the repository. Start from
[the TEST example](../scripts/usage-report-mapping.example.json), replace its
TEST label with your actual deployment history, and keep the operator copy
outside every checkout. The example is a fixture, not an operator mapping.
It declares no real deployment history.

Use a credential manager that writes the token to standard output. Pipe that
output directly into the script. Replace the first command below with your
credential manager's read command, and replace the account and mapping path.

```sh
your-credential-manager read analytics-token |
	node scripts/usage-report.mjs \
		--account 00000000000000000000000000000000 \
		--mapping /absolute/path/outside-artroom/usage-report-mapping.json \
		--worker dap-grow \
		--through 2026-10-27T00:00:00Z
```

The command line contains no token. Do not substitute a literal token into
the command or print the token through shell history. The script accepts the
token only from bounded, noninteractive stdin. There is no token argument,
token-file option, or environment fallback. Input must contain a nonempty
token of at most 4,096 visible ASCII bytes and one optional final LF or CRLF
line ending. Stdin must end within ten seconds. The total input limit is
4,098 bytes. The script does not return the token or raw authenticated
response in its report.

Exit 0 means the bounded response was accepted and every selected Worker was
mapped. Exit 2 refuses input or an unmappable Worker. Exit 1 marks an incomplete
query or another report failure. If report text would contain the credential,
the script emits no report and exits 1. An unexpected final output failure also
exits 1 without printing a fallback that could disclose the credential.

`--account` is a 32-character lowercase hexadecimal Cloudflare account ID.
`--mapping` is the absolute path to your mapping. Repeat `--worker` to select
several known Workers. Duplicate selections are refused. Without `--worker`,
the script selects every Worker in the current inventory, including those
your mapping omits.

`--through` is optional. It accepts a valid UTC timestamp in
`YYYY-MM-DDTHH:mm:ssZ` or `YYYY-MM-DDTHH:mm:ss.000Z` form, with no future time.
Its default is the current UTC time rounded down to a whole second, captured
once for the report. The 30-day window includes its start and excludes its
end. The command does not change a Worker setting, telemetry writer,
deployment, or dependency.

The mapping has exactly this version 1 structure:

```json
{
  "version": 1,
  "workers": [
    {
      "worker": "dap-grow",
      "deployments": ["TEST-ONLY-replace-with-operator-deployment-history"]
    }
  ]
}
```

The [JSON schema](../scripts/usage-report-mapping.schema.json) checks required
keys, version, object shape, array limits, control characters, exact duplicate
rows, and duplicate labels within a row. There are at most 32 Worker rows and
1 to 16 deployment labels per row. An empty Worker array is accepted and
leaves selected Workers unmappable. Each label is nonempty, contains no
control characters, and is at most 128 UTF-8 bytes. Unknown keys, duplicate
Workers, and labels shared by different Worker rows are refused. The parser
enforces the byte limits, cross-row uniqueness, and exact Worker membership
in the current inventory. A schema character limit alone does not enforce a
UTF-8 byte limit.

The parser also enforces a 64 KiB mapping-file limit and checks the file's
resolved real path against the actual repository. A symlink into the
repository does not make a mapping external. The repository retains the
schema and TEST example only. Keep actual deployment history in your
operator-owned external file.

`worker` names a Worker in the static configuration inventory. `deployments`
contains the metric labels that you declare belonged to that Worker during
the report window. A `DEPLOYMENT` value is a telemetry label, not a Worker
identity. The script does not infer Worker identity from that value. Current
configuration cannot recover historical labels or prove that your mapping
covers every deployment. The fallback label `unknown` cannot attribute
telemetry to a Worker. A selected Worker without a mapping, or mapped only
to `unknown`, is refused and identified in the report. A missing mapping is
not a zero-use result.

The script reads the current configurations, bindings, and
[HTTP entry-point inventory](security/entry-points.md). Those sources describe
the checked-in configuration, not a queried deployment. Consult the
[settings inventory](security/settings.md) for the distinction between
bindings, settings, and secrets. The report separates three statuses:

- **Observed:** the accepted aggregate contains matching telemetry for the
  mapped Worker and an observable category.
- **Zero-observed:** the mapped Worker has some telemetry, but the accepted
  aggregate contains no matching route-place observation for this category.
  Read this as **no observed use**, subject to the reported coverage limits.
- **Unobservable:** the existing telemetry cannot distinguish that configured
  route, binding, or feature. Absence of a distinct measurement supplies no
  use count for it.

Coarse route families do not identify individual HTTP methods or paths.
Native platform versions, individual features, and individual bindings are
unobservable with the current metric shape. Do not turn a configured route
pattern or a binding name into a claim of measured use. The report does not
claim that a Worker, route, version, feature, or binding was never used.
An empty route list with `coverage.routeInventory` set to `unavailable`
means the static catalog lacks that Worker's routes. It does not mean the
Worker has no routes.

The JSON report puts coarse route-place observations in `workers[].groups`.
Each group includes its `status`, qualified `message`, `weightedEvents`, and
result categories. `workers[].routes` and `workers[].bindings` retain the
static inventory with `unobservable` status. A Worker's top-level status
describes the presence of mapped telemetry, which can include loss summaries.
It does not certify successful routes or accepted native acts.

`workers[].coverage` states sampling, recorded loss, missing summaries, and
the unobservable version and feature dimensions. `absenceProven` is always
false. `query.unassignedGroups` counts groups without a usable mapped
deployment label.
The report includes `mappingSha256` and each Worker's `deploymentCount`;
it does not echo deployment labels or the mapping path.

Exit 0 means the query produced an accepted report with no selected Worker
refused for its mapping. That report can still contain unobservable rows.
Exit 1 means the query or report is unavailable or incomplete. Exit 2 means
invalid input or a selected Worker refused for its mapping. When some
selected Workers are mapped, the script can query once and still report
mapping refusals for others. When none is mapped, it refuses before reading
the token or making a request.

The query uses the account's
`https://api.cloudflare.com/client/v4/accounts/<account>/analytics_engine/sql`
endpoint and the existing `artroom_metrics_v1` dataset. One request covers one
bounded 30-day window. The script does not retry, paginate, or follow
redirects. The response limit is 8 MiB, the aggregate limit is 8,192 groups,
and the query and body share a 30-second deadline. A failed, oversized,
malformed response, or detected truncation does not become a zero-observed
report. See the provider's [SQL API](https://developers.cloudflare.com/analytics/analytics-engine/sql-api/)
and [response format](https://developers.cloudflare.com/analytics/analytics-engine/sql-reference/statements/).
The parser accepts the expected response envelope and optional statistics or
limit metadata. `rows_before_limit_at_least` counts source rows before
`GROUP BY`, not returned groups. The parser ignores that figure entirely and
uses the query's group cap to detect truncation. Unfamiliar fields, including
an explicit failure field, make the query unobservable.

Sampling can hide observations and makes weighted totals estimates.
`metric-dropped` summaries describe losses known to the writer; a missing
summary does not prove loss-free capture. Disabled telemetry, write failures,
missing historical aliases, and an incomplete window also limit coverage.
Read the report's coverage and sampling qualifications before comparing
Workers or deciding what to retire.

The gate performs no live query. Recorded TEST emissions exercise the actual
metric writer with a scripted sink. Separately labelled scripted SQL API
responses exercise the report parser and decisions. Neither is evidence
that hosted SQL ran or that a real account's data has the expected shape.
The planner's first SQL run exposed the limit-hint mismatch in request
`686f4ec9328d19f727e7f5e1352d0b550e6c595c`. Its observed envelope shape
informed a scripted TEST case; no private provider rows were copied.
The planner subsequently recorded a complete rerun with exit 0, a bounded
response, and no unassigned groups under R14 (`dbf7e6bd`). That run establishes
acceptance for its reported window and selected Workers. This script adds no
telemetry and does not close the parent request's coverage gaps.
