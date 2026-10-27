# R14 telemetry fields and coverage proposal

Status: not adopted by ruling `7d5cbfcf` because retirement decisions use the
static inventory and v1 report, while native versions follow definition
succession and K1.

Read-only source review at Main `aecabde196c187afd731134f5ee9e0d427efe62a`.
Parent `bb763efa004820c3089716dfadfc2447ee26a3e0` remains open. Ruling
`c0832d1f6a68f8cc1fef718fd1f23302dc1fe0d9`, item 3, requires new fields and a
coverage window for the remaining inventory. The first complete operator run is
recorded by `dbf7e6bd1f2603ebc7ebe6a720ea0e8fbe5347cc`. That report explicitly
leaves native versions, features and individual bindings unobservable. No
implementation or retirement decision follows from this preparation.


Rests-On: `git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:bb763efa004820c3089716dfadfc2447ee26a3e0`
Rests-On: `git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:c0832d1f6a68f8cc1fef718fd1f23302dc1fe0d9`
Rests-On: `git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:dbf7e6bd1f2603ebc7ebe6a720ea0e8fbe5347cc`
Rests-On: `git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:244115c574a5bf8a016da310b856a6ef422e942c`
Rests-On: `git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:7d5cbfcfaf9fabe5557d74e5b1314dad6a6e7626`

## What the source can observe

- **Hosted version is already present.**
  `packages/scope/src/operational.ts:10,38–43` takes `VERSION_METADATA.id` into
  each metric context. `metrics.ts:37–44,46–72,104–107` validates a worker
  version UUID and writes it as blob3. This identifies the emitting worker
  build, not a native definition version. `scripts/usage-report.mjs:120–166`
  currently groups coarse route points without selecting that dimension. An
  operator mapping of `DEPLOYMENT` aliases is still a declaration, not an
  authenticated worker identity.
- **Native pins need a new field at the owning scope.**
  `packages/scope/src/core.ts:376–387` resolves the genesis pin and its
  native/declared definition; `object.ts:487–512` owns invocation contexts.
  Record an already resolved, recognized platform pin when actual
  execution/read work uses it. Do not call `pinned()` merely for telemetry: it
  reads genesis/retained bytes and can call `store.cover`. Do not use the
  caller's create parameter as proof of an existing pin. Emit `unknown` or
  `declared` where classification is unavailable. Use
  `packages/platform/src/native-catalog.ts:181–190` as the finite supported-pin
  catalogue; `NEWEST` alone omits older supported versions.
- **Exact routes need router selection plus method.** `operational.ts:88–112`
  maps paths into coarse places, ignoring the method.
  `apps/room/fetch.ts:16–27` composes room routes;
  `apps/room/demo-creation.ts:6–37` has a distinct demo offer and an explicit
  GET check. Record a static route ID at the actual dispatch branch, with
  separate matched/handled/refused/error outcomes. A wrong-method request must
  not count as execution of the successful route. Keep a separate bounded
  unmatched category. HTTP success is not native act acceptance.
- **`ScopeService` needs entrypoint identity.** `worker.ts:655–673` forwards
  service calls into the same API used by other paths; without a
  service-entrypoint marker, downstream observations do not identify that
  caller. `worker.ts:210–232` and `object.ts:505–512` already bridge
  operational context to the owner. The seven checked configs (room
  default/grow/demo/lending, sandbox default/rollout, jam) contain no
  `ScopeService` service target. The sandbox service targets are
  `ApplicationScreenService`. That proves only the checked static
  configuration, not absence of external bindings or hosted calls.
- **GitHub and artifact ports have separate readiness, logical operation and
  physical I/O boundaries.** `worker.ts:511–512`,
  `packages/scope/src/github-wiring.ts:70–81,84–141` and
  `packages/scope/src/artifacts-wiring.ts:57–65,98–133` gate wiring and
  owner/host admission. Record a configured/off/invalid readiness category
  separately from actual operation attempts. Instrument the provider boundaries
  in `packages/scope/src/github-host.ts:90–195` and
  `packages/scope/src/artifacts-host.ts:167–312`; include
  snapshot/read/recovery/credential paths, not just `Outside.send`. Provider
  calls can perform several underlying requests. Count an adapter operation as
  such; a claim about physical binding/network use requires the narrower I/O
  boundary. Never emit URLs, repository names, credential identities or
  exception text.
- **The bucket has an exact physical boundary and a logical cache.**
  `packages/scope/src/applications/content.ts:23–57` calls
  `APPLICATION_CONTENT.get/put`;
  `packages/scope/src/applications/route.ts:40–52,75` can satisfy a logical
  package lookup from a process cache. Record bucket get/put attempts and fixed
  result categories at the bucket calls. A cache hit is package use but not a
  bucket call. No bucket call during a window does not establish that the bound
  feature is unnecessary.
- **Metrics and console are not self-verifying.** `metrics.ts:169–191` writes
  points and a terminal loss row best effort, swallowing sink failures.
  `diag.ts:181–190` emits a diagnosis metric and calls an optional sink;
  `diag.ts:58` defines the console sink. Other direct console sites include
  `object.ts:402–405,525`, `archive-driver.ts:481`, `scope-index.ts:143` and
  `site/route.ts:119`. Instrument declared sink attempts with fixed categories
  if needed, but do not monkey-patch console, emit the log contents, or
  recursively measure each metrics write through itself. Neither an attempted
  write nor a returned call acknowledges hosted storage/delivery. Console
  enablement in configuration is not console use.

`scripts/usage-report.mjs:65–103` already reuses `servedInventory` and the
settings/config parser to enumerate static routes and binding names. Extend
that inventory; do not infer configured resources from observed labels.
Preserve both logical feature use and physical resource use as different rows.

## Proposed bounded event format

Keep the v1 metrics writer and reader meanings. Add three separately validated
record kinds on the existing METRICS binding: `usage-route-v2`,
`usage-native-v2`, and `usage-feature-v2`. Separate records prevent a request
that touches several owners from claiming one native version or feature
cross-product. None is a v1 route point.

Each point has one public worker-name index, eight blobs, and six doubles. The
index comes from a closed release profile, never from a request or
`DEPLOYMENT`. Bound it to 64 UTF-8 bytes. Bound all blobs together to 512 UTF-8
bytes and counters to the existing `METRIC_MAX`. These proposed limits fit the
provider's current 20-blob, 20-double, one-index, 16-KB blob and 96-byte index
limits: [analytics limits][analytics-limits]. Indexing only by worker can still
lose rare route or native-version dimensions to sampling; this choice supplies
no absence proof.

| Position | Proposed meaning |
| --- | --- |
| blob1 | One of the three literal v2 kinds above. |
| blob2 | Public release-profile SHA-256, or `unknown`. |
| blob3 | Existing worker version UUID, or `unknown`; never a native pin. |
| blob4 | Trusted channel: `edge-http`, `sandbox-native`, `mcp-internal`, `scope-service`, `alarm`, `dispatch`, or `other-internal`. |
| blob5 | A profile-bound code from the route, native-version, or feature-operation catalogue. Unknown and not-applicable have distinct sentinels. |
| blob6 | Kind-specific operation or completion category, defined below. |
| blob7 | Kind-specific closed outcome category, defined below. |
| blob8 | Kind-specific execution or ownership category, defined below. |
| double1 | Aggregated logical event count, with checked addition. |
| double2 | Sum of existing measured duration where available; zero otherwise. No new timing or authority work. |
| double3–double6 | Zero, reserved for a later explicit schema decision. |

For route records, blob5 identifies one exact method/template from the reviewed
matcher catalogue. Blob6 is `responded`, `threw`, or `unobserved`; blob7 is
`2xx`, `3xx`, `4xx`, `5xx`, or `none`; blob8 is `turn`, `pre-turn`,
`unobserved`, or `not-applicable`. Preserve the original return or throw. Mark
the chosen handler at its dispatch branch. Early URL or credential rejection is
`unclassified` until that identity is established; a completed no-route
decision is `unmatched`. A wrong method must not count as execution of the
successful method. Do not run the source inventory, parse another URL, inspect
a body, or read authority merely to supply telemetry.

For native records, blob5 is a recognized published platform name/version from
an already resolved owning pin. Declared definitions use a `declared` sentinel
without their digest. Blob6 names the actual operation, initially `create`,
`submit`, `prepare`, `settle`, `floor`, `alarm`, or `checkpoint`, matching
`Scope` methods. Blob7 reports an observed `accepted`, `archived`, `refused`,
`unavailable`, `mismatch`, `completed`, or `unobserved` outcome as appropriate
to that method's actual result. Blob8 is `native`, `declared`, `unobserved`, or
`not-applicable`. A generic completion is not act acceptance. Do not add a
`pinned()` read or infer ownership from a caller-presented pin, a current
default, an HTTP route, or the worker's build UUID. If a boundary does not
already resolve the pin, that dimension remains unobservable.

For feature records, blob5 names a fixed operation from the release profile.
The initial catalogue must cover the GitHub and artifact ports' methods
(`createRepository`, `deleteRepository`, credential mint/revoke, `ref`,
`objects`, `rulesTree`, `send`, `deleteRef`, and `inspect`), physical bucket
`get` and `put`, and declared console-sink attempts. Include archive, recovery,
snapshot and credential paths that bypass ordinary send. Blob6 is `attempted`,
`completed`, `refused`, `error`, or `unobserved`; blob7 is a closed `ok`,
`not-found`, `unavailable`, `not-applicable`, or `unobserved` result; blob8
distinguishes `logical` from `physical`. An adapter operation is not a count of
its underlying network requests. Cache hits are logical package use, not bucket
reads. Profile readiness states such as configured, off, or invalid are
separate from usage counts. Ordinary `ScopeService` RPC has a
service-entrypoint observation; it must not acquire an invented HTTP route.
Metrics writes are not recursively measured through the same metrics writer.

All three kinds share at most 64 exact usage groups per invocation. They use
only remaining point slots after existing native-turn, route and other priority
rows and the existing terminal reservation. The combined limit is 250, not an
extra allowance. Do not merge different named subjects into one subject when
the group cap is hit. Retain known group/budget overflow in the existing loss
counters and mask; do not claim the summary localizes every loss to a subject.
Preserve saturation semantics. No extra terminal, awaited sink, changed native
answer, or recursive metrics emission is proposed.

The v2 decoder selects these kinds separately and checks their profile,
catalogue, channel and kind-specific labels. Preserve the current bounded
30-day query, 8,192-group and 8-MiB response constraints, or obtain a separate
ruling for a successor. Added dimensions can reach those caps sooner. A
truncated result, unknown profile, unsupported kind or excess bound is
incomplete, never zero-use. Sum counts with `_sample_interval * double1`. Keep
stdin-only token handling and all existing non-disclosure controls. Historical
v1 points cannot be upgraded into exact-route/native/feature use.

The proposed public setting is `USAGE_PROFILE`: a SHA-256 selecting a bundled,
allowlisted profile containing the worker name, source/configuration inventory,
all three code catalogues and telemetry capabilities. It contains no secrets or
arbitrary runtime setting values. The operator separately binds that profile to
the uploaded worker version and rollout interval. The setting is an emitter
declaration, not provider authentication. Missing or invalid profiles supply no
attributable v2 observation; v1 and native outcomes remain unchanged. A
source-generated profile cannot certify runtime overrides. This is a proposed
setting only. Any later reviewed implementation must list its deployment
requirements and obtain the planner-owned rollout.

## Route and entrypoint coverage boundaries

The measured router also serves sandbox `native`/`nativeStream` and MCP
internal reads (`packages/scope/src/worker.ts:634–651,831`). Nested measurement
avoids duplicate route points but does not establish edge HTTP origin
(`operational.ts:105–106`). Set the channel at trusted entrypoints; never
accept a request header's claim about that channel.

The default `servedInventory` models MCP as enabled, with binding-dependent
rows (`scripts/security-entry-points.mjs:276,288–301`). Its
method/template/gate bijection is a source model, not proof that a hosted
setting enabled a route. The route table must be bound to the public profile
and to the operator's actual feature/configuration intervals. A missing route
inventory is unavailable, not an empty catalogue. Uninstrumented workers and
entrypoints remain explicit parent gaps; a first room-worker slice cannot
silently close coverage for the lending app, sandbox, simulator, static assets,
or the jam app.

## Window and evidence contract

Require an operator-supplied manifest outside the repository that binds each
selected worker to a hosted version UUID, exact reviewed source commit, a
nonsecret static configuration-inventory digest, the telemetry
schema/capability set and the rollout interval. Record the manifest digest with
the report. Do not hash secrets or emit runtime settings. A digest of
checked-in config is not evidence of current hosted settings, especially with
keep-vars deployments; the operator must attest the hosted binding/config
relationship and any change intervals separately. Deployment aliases alone
cannot make this binding.

Use a fixed half-open UTC window. Mark the interval before the reviewed
instrumentation was deployed as unobservable for the new dimensions; never
backfill it from v1 coarse places. Mixed hosted versions, missing workers,
rollout overlap, unknown config identity and uninstrumented service/background
paths produce explicit uncovered intervals or dimensions. Report first/last
observed event times only as observations, not proof of continuous coverage. A
best-effort start/heartbeat/coverage point can show that one point arrived; it
cannot certify the intervening interval or its own completeness.

The provider documents sampling at both write and query time, possible loss of
rare non-index values, and no guaranteed retrieval of an individual record:
[analytics sampling][analytics-sampling]. `writeDataPoint` returns immediately
and the runtime writes in the background: [getting started][analytics-start].
Weighted counts and a zero local loss mask cannot reverse those limits. Keep
`absenceProven:false`, including when returned sample intervals are all one.
Statuses remain observed, zero-observed (qualified no observed use), or
unobservable. A longer window does not convert sampled zero observations into
absence proof.

Retirement needs a separate planner decision. Positive usage can rule out a
proposed removal. Zero observations can nominate a review candidate only. A
native version may remain necessary for dormant scopes, replay, pending/timed
work and future receipts even with no recent calls:
`packages/platform/src/versions.ts:1–13` states that a scope keeps its genesis
version and the package serves every shipped version. Any stronger retirement
evidence needs an explicitly adopted completeness channel and an exhaustive
relevant scope/dependency inventory; this proposal adds neither durable
counters nor an implicit new retirement policy.

## Focused witnesses for a later implementation

Record actual emitter output for one exact native pin, one wrong-method refusal
versus a handled route, a `ScopeService` call versus HTTP, a cached package
lookup versus a physical bucket read, an adapter operation and a
rejected/unwired operation, and a console-sink attempt. Label scripted API
aggregates separately from actual emitter samples. Controls should detect
erased method/entrypoint/pin labels, uncatalogued/token-like labels, silent
overflow, mixed rollout windows and any absence claim. Preserve the existing
non-disclosure and bounded-query controls. None of these tests proves hosted
deployment or provider completeness.

## Decision requested before implementation

Adopt or amend the three bounded usage formats, worker index, shared point
budget, proposed `USAGE_PROFILE` setting, external version/configuration
manifest, and rollout-window rules. Assign the implementation scope separately
under R14, as item 3 of the ruling requires. The later implementation must
preserve the qualified observed, zero-observed, and unobservable statuses. It
must not present an analytics zero as absence.

Also decide whether these qualified observations are the intended R14
retirement input. If R14 requires proof of no use, assign a separate complete
coverage design; this proposal does not supply one or close that requirement.
Keep native-version replay and dormant-scope compatibility as independent
removal conditions. A telemetry window does not waive them.

The working-tree documentation correction records the completed planner rerun
in `docs/usage-report.md`. This preparation changes no production code,
setting, deployment, package, query, or archive cost. No tests or gate have run
for this proposal, and no exact-head approval or landing is claimed. The parent
request remains open. Archive exact-build mapping preempts this work when its
missing input arrives.

[analytics-limits]:
  https://developers.cloudflare.com/analytics/analytics-engine/limits/
[analytics-sampling]:
  https://developers.cloudflare.com/analytics/analytics-engine/sampling/
[analytics-start]:
  https://developers.cloudflare.com/analytics/analytics-engine/get-started/
