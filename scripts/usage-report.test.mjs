import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { mkdtemp, writeFile, symlink, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { PassThrough } from "node:stream";
import { fileURLToPath } from "node:url";
import {
  runUsageReport, loadUsageInventory, usageReportSql, evaluateUsage,
  parseUsageMapping, decodeUsageResponse, USAGE_LIMITS,
} from "./usage-report.mjs";
import { aliases, row, response, window } from "./test/fixtures/usage-report/scripted-sql.mjs";

// Capture the actual current Metrics writer once, using the existing recorder.
// Keep the checked-in recording as historical expected TEST emissions: only
// its source digest may differ. SQL API responses/fetch remain scripted;
// neither recording is hosted SQL, a provider query or Native plan evidence.
const fixtureUrl = new URL("./test/fixtures/usage-report/metrics-test-emissions.json", import.meta.url);
const recorder = fileURLToPath(new URL("./test/fixtures/usage-report/record-metrics.ts", import.meta.url));
const root = fileURLToPath(new URL("../", import.meta.url));
let capturedFixture;
function fixture() {
  if (capturedFixture === undefined) {
    const historical = JSON.parse(readFileSync(fixtureUrl, "utf8"));
    const child = spawnSync(process.execPath, [recorder], {
      cwd: root, encoding: "utf8", timeout: 10_000, maxBuffer: 1024 * 1024,
    });
    assert.ifError(child.error);
    assert.equal(child.signal, null, "the existing Metrics recorder completed naturally");
    assert.equal(child.status, 0, "the existing Metrics recorder exited successfully");
    let current;
    assert.doesNotThrow(() => { current = JSON.parse(child.stdout); }, "the existing Metrics recorder emitted JSON");
    assert.ok(current && typeof current === "object" && !Array.isArray(current), "the existing Metrics recorder emitted an object");
    const { sourceSha256: historicalSource, ...expected } = historical;
    const { sourceSha256: currentSource, ...actual } = current;
    assert.match(historicalSource, /^[0-9a-f]{64}$/, "historical recording source digest");
    assert.match(currentSource, /^[0-9a-f]{64}$/, "current recording source digest");
    assert.deepEqual(actual, expected, "current TEST cases, window, source and qualification preserve the historical recording");
    capturedFixture = current;
  }
  return structuredClone(capturedFixture);
}
const token = "TEST-usage-token-DO-NOT-DISCLOSE-7e0a3c19";
const account = "a".repeat(32);
const now = () => new Date(window.through);
const encoded = value => JSON.stringify(value);
const input = value => (async function* () { yield Buffer.from(value); })();
const copy = value => structuredClone(value);
const leaves = value => value && typeof value === "object" ? Object.values(value).flatMap(leaves) : [value];
const statuses = report => leaves(report).filter(value => ["observed", "zero-observed", "unobservable"].includes(value));
const argv = path => ["--account", account, "--mapping", path, "--through", window.through];

async function externalMapping(run, change = value => value) {
  const dir = await mkdtemp(join(tmpdir(), "artroom-usage-test-"));
  try {
    const inventory = await loadUsageInventory();
    const measured = inventory.workers.find(worker => worker.metricWriter);
    assert.ok(measured, "current inventory has a room Metrics writer");
    const mapping = change({ version: 1, workers: inventory.workers.map((worker, index) => ({
      worker: worker.worker, deployments: [worker === measured ? "TEST-usage-deployment" : `TEST-usage-deployment-${index}`],
    })) });
    const path = join(dir, "operator-mapping.json");
    await writeFile(path, encoded(mapping));
    return await run({ dir, path, mapping, inventory, measured });
  } finally { await rm(dir, { recursive: true, force: true }); }
}

// A schema projection of the fixed TEST writer emissions, with one distinct
// group per emitted point. This is not an Analytics Engine aggregation.
function writerResponse(which = "balanced") {
  return response(fixture().cases[which].filter(({ point }) => ["route", "metric-dropped"].includes(point.blobs[0])).map(({ observedAt, point }) => row(point.blobs[0], {
    deployment: point.blobs[1], place: point.blobs[3], result: point.blobs[4],
    reason: point.blobs[5], execution: point.blobs[8], weightedEvents: point.doubles[0],
    maximumSecond: point.doubles[1], weightedA: point.doubles[2],
    firstSeconds: Date.parse(observedAt) / 1000, lastSeconds: Date.parse(observedAt) / 1000,
  })));
}

// Invariant: one aggregate query covers exactly the stated half-open 30 days,
// without selecting per-request, per-trace or scope identifiers.
test("usage SQL binds exactly one half-open 30-day aggregate window", () => {
  assert.equal(window.throughSeconds - window.fromSeconds, 30 * 24 * 60 * 60);
  const sql = usageReportSql(window);
  assert.match(sql, new RegExp(`timestamp >= toDateTime\\(${window.fromSeconds}\\)`));
  assert.match(sql, new RegExp(`timestamp < toDateTime\\(${window.throughSeconds}\\)`));
  assert.doesNotMatch(sql, /timestamp\s*<=|blob7|blob8|index1|SELECT\s+\*/i);
  for (const name of aliases) assert.match(sql, new RegExp(`\\b${name}\\b`));
  assert.match(sql, /\bGROUP BY\b/i);
  assert.match(sql, /\bLIMIT \d+ FORMAT JSON\b/i);
});

// Invariant: the SQL boundary accepts exact numeric observations, not a
// plausible-looking malformed or out-of-window provider response.
test("usage SQL decoding accepts recorded TEST shapes and exact numeric representations", () => {
  const recording = fixture();
  assert.match(recording.qualification, /TEST emissions.*actual Metrics writer/);
  assert.equal(recording.sourceSha256, createHash("sha256").update(readFileSync(resolve(root, recording.source))).digest("hex"));
  const plain = decodeUsageResponse(writerResponse(), window);
  assert.equal(plain.length, 2);
  const numericStrings = writerResponse();
  for (const entry of numericStrings.data) for (const key of aliases.slice(6)) entry[key] = String(entry[key]);
  // Float64 is a provider metadata type; integral values still have to be
  // finite and exactly representable before they can become report counts.
  for (const entry of numericStrings.meta) if (aliases.slice(6).includes(entry.name)) entry.type = "Float64";
  assert.deepEqual(decodeUsageResponse(numericStrings, window), plain);
  // Reconstruct only the planner-recorded envelope shape (request 686f4ec9).
  // Every value and label below is scripted TEST data, not provider rows.
  const observedShape = {
    data: Array.from({ length: 67 }, (_, index) => row("route", {
      deployment: `TEST-recorded-shape-${index}`, storedRows: "2", weightedEvents: "6",
      maximumSampleInterval: 3, maximumSecond: 2, weightedA: 0,
    })),
    meta: aliases.map(name => ({ name, type: aliases.slice(0, 6).includes(name) ? "String"
      : ["storedRows", "weightedEvents"].includes(name) ? "UInt64"
      : ["maximumSampleInterval", "firstSeconds", "lastSeconds"].includes(name) ? "UInt32" : "Float64" })),
    rows: 67,
    rows_before_limit_at_least: 350918,
  };
  let decoded;
  assert.doesNotThrow(() => { decoded = decodeUsageResponse(observedShape, window); }, "input-row hint must not reject 67 returned groups");
  assert.equal(decoded.length, 67);
  assert.equal(decoded[0].storedRows, 2);
  assert.equal(decoded[0].weightedEvents, 6);
  assert.equal(decoded[0].maximumSampleInterval, 3);
  const capped = { ...observedShape,
    data: Array.from({ length: USAGE_LIMITS.groups + 1 }, (_, index) => ({ ...observedShape.data[0], deployment: `TEST-cap-${index}` })),
    rows: USAGE_LIMITS.groups + 1 };
  assert.throws(() => decodeUsageResponse(capped, window), undefined, "cap plus one returned groups remains incomplete regardless of the provider hint");
  const invalid = [
    ["in-band failure cannot be accepted as complete data", value => { value.exception = "TEST query failure after partial data"; }],
    ["duplicate alias", value => { value.meta[1] = copy(value.meta[0]); }],
    ["missing declared column", value => { value.meta.pop(); }],
    ["noncanonical count", value => { value.data[0].weightedEvents = "01"; }],
    ["unsafe rounded count", value => { value.data[0].weightedEvents = Number.MAX_SAFE_INTEGER + 1; }],
    ["fractional count", value => { value.data[0].storedRows = 1.5; }],
    ["outside the half-open window", value => { value.data[0].lastSeconds = window.throughSeconds; }],
  ];
  for (const [label, change] of invalid) {
    const value = writerResponse(); change(value);
    assert.throws(() => decodeUsageResponse(value, window), undefined, label);
  }
});

// Invariant: the private stdin token never becomes report data, including
// provider failures whose bodies or thrown messages contain that exact token.
test("usage report never discloses the stdin token in HTTP or thrown provider failures", async t => {
  await externalMapping(async ({ path }) => {
    const outcomes = [
      ["HTTP failure", () => new Response(`TEST provider message ${token}`, { status: 403 })],
      ["malformed success", () => new Response(`TEST provider body ${token}`, { status: 200 })],
      ["thrown provider error", () => { throw Error(`TEST fetch failed with ${token}`); }],
      ["stream failure", () => new Response(new ReadableStream({ start(controller) { controller.error(Error(`TEST stream ${token}`)); } }))],
    ];
    for (const [label, answer] of outcomes) {
      let calls = 0;
      const result = await runUsageReport(argv(path), { now, stdin: input(`${token}\n`), fetch: async () => { calls++; return answer(); } });
      assert.equal(result.exitCode, 1, label);
      assert.equal(result.report.query.status, "unobservable", label);
      assert.equal(calls, 1, `${label}: no retry`);
      assert.ok(!encoded(result.report).includes(token), `${label}: token non-disclosure`);
      assert.doesNotMatch(encoded(result.report), /TEST provider|TEST fetch failed|TEST stream/, label);
    }
    for (const secret of ["", `${token}\nsecond-line`, "x".repeat(USAGE_LIMITS.tokenBytes + 1)]) {
      let calls = 0;
      const result = await runUsageReport(argv(path), { now, stdin: input(secret), fetch: async () => { calls++; throw Error("must not fetch"); } });
      assert.equal(result.exitCode, 2);
      assert.equal(result.report.query.reason, "token-input-invalid");
      assert.equal(calls, 0);
      assert.ok(!encoded(result.report).includes(token));
    }
    await t.test("accepted credentials that collide with report keys or refusal values produce no credential output", async () => {
      const disclosed = [];
      for (const credential of ["version", "unobservable"]) {
        let calls = 0;
        const result = await runUsageReport(argv(path), { now, stdin: input(credential), fetch: async () => {
          calls++; return Response.json(writerResponse());
        } });
        assert.equal(calls, 1, "the accepted TEST credential reaches the scripted provider");
        // The CLI emits the report alone. A null report means withheld output;
        // wrapper keys such as exitCode/report are not part of that output.
        const output = result.report === null ? "" : encoded(result.report);
        if (output.includes(credential)) disclosed.push(credential);
      }
      assert.deepEqual(disclosed, [], "actual CLI report output must omit every accepted TEST credential");
    });
    await t.test("an open owned Node stdin is destroyed when the input deadline expires", async deadline => {
      const stdin = new PassThrough();
      const actualIterator = stdin[Symbol.asyncIterator].bind(stdin);
      let start;
      const started = new Promise(resolve => { start = resolve; });
      // Observe iterator creation while forwarding the actual Node iterator,
      // whose pending next() owns this still-open Readable.
      stdin[Symbol.asyncIterator] = function () { start(); return actualIterator(); };
      deadline.mock.timers.enable({ apis: ["setTimeout"] });
      let calls = 0;
      try {
        const pending = runUsageReport(argv(path), { now, stdin, fetch: async () => { calls++; throw Error("must not fetch"); } });
        await started;
        deadline.mock.timers.tick(USAGE_LIMITS.inputMilliseconds + 1);
        const result = await pending;
        assert.equal(result.exitCode, 2);
        assert.equal(result.report.query.reason, "token-input-invalid");
        assert.equal(calls, 0);
        assert.equal(stdin.destroyed, true, "input deadline must destroy its owned Node Readable before returning");
      } finally {
        stdin.destroy();
        deadline.mock.timers.reset();
      }
    });
  });
});

// Invariant: a requested Worker without an operator mapping is retained as an
// explicit refusal, including a mixed report where another Worker is mapped.
test("usage report explicitly refuses an unmappable Worker", async () => {
  await externalMapping(async ({ path, inventory, measured }) => {
    const absent = inventory.workers.find(worker => worker.worker !== measured.worker);
    assert.ok(absent, "the current static inventory contains several Workers");
    const mapped = { version: 1, workers: [{ worker: measured.worker, deployments: ["TEST-usage-deployment"] }] };
    await writeFile(path, encoded(mapped));
    let calls = 0;
    const result = await runUsageReport(argv(path), { now, stdin: input(token), fetch: async () => { calls++; return Response.json(writerResponse()); } });
    assert.equal(result.exitCode, 2, "an unmappable configured Worker prevents success");
    assert.equal(calls, 1);
    assert.equal(result.report.workers.length, inventory.workers.length, "no silent Worker omission");
    const refused = result.report.workers.find(worker => worker.worker === absent.worker);
    assert.equal(refused.refused, true, "unmappable Worker is explicitly refused");
    assert.equal(refused.status, "unobservable");
    assert.equal(refused.reason, "mapping-missing");
    assert.ok(refused.routes.every(route => route.status === "unobservable"));
    assert.ok(refused.bindings.every(binding => binding.status === "unobservable"));
    let readToken = false;
    const onlyMissing = await runUsageReport([...argv(path), "--worker", absent.worker], { now,
      stdin: { async *[Symbol.asyncIterator]() { readToken = true; yield token; } },
      fetch: async () => { calls++; throw Error("must not fetch"); },
    });
    assert.equal(onlyMissing.exitCode, 2);
    assert.equal(onlyMissing.report.query.reason, "no-mapped-worker");
    assert.equal(onlyMissing.report.workers[0].worker, absent.worker);
    assert.equal(onlyMissing.report.workers[0].refused, true);
    assert.equal(readToken, false);
    assert.equal(calls, 1);
  });
});

// Invariant: incomplete observations cannot produce a zero-observed claim;
// query failure retains the configured Worker, route and binding inventory.
test("usage report refuses truncated or bounded-out observations without zero claims", async t => {
  await externalMapping(async ({ path, inventory }) => {
    let cancelled = false;
    const invalid = [
      ["cap plus one", () => Response.json(response(Array.from({ length: USAGE_LIMITS.groups + 1 }, (_, index) => row("route", { deployment: `TEST-row-${index}` }))))],
      ["row count mismatch", () => Response.json(response(undefined, { rows: 3 }))],
      ["byte limit", () => {
        const body = encoded(writerResponse());
        const bytes = Buffer.from(body + " ".repeat(USAGE_LIMITS.responseBytes + 1 - Buffer.byteLength(body)));
        let sent = false;
        return new Response(new ReadableStream({
          pull(controller) { if (sent) controller.close(); else { sent = true; controller.enqueue(bytes); } },
          cancel() { cancelled = true; },
        }, { highWaterMark: 0 }));
      }],
    ];
    for (const [label, answer] of invalid) {
      let calls = 0;
      const result = await runUsageReport(argv(path), { now, stdin: input(token), fetch: async () => { calls++; return answer(); } });
      assert.equal(result.exitCode, 1, label);
      assert.equal(result.report.query.reason, "query-incomplete", label);
      assert.equal(result.report.workers.length, inventory.workers.length, label);
      assert.ok(statuses(result.report).every(status => status === "unobservable"), `${label}: no zero claim from an incomplete response`);
      assert.equal(calls, 1, `${label}: exactly one attempt`);
    }
    assert.equal(cancelled, true, "oversized response stream is cancelled");
    t.mock.timers.enable({ apis: ["setTimeout"] });
    try {
      let started;
      const beginning = new Promise(resolve => { started = resolve; });
      let calls = 0, aborted = false;
      const pending = runUsageReport(argv(path), { now, stdin: input(token), fetch: async (_url, init) => {
        calls++; init.signal.addEventListener("abort", () => { aborted = true; }); started();
        return await new Promise(() => {});
      } });
      await beginning;
      t.mock.timers.tick(USAGE_LIMITS.queryMilliseconds + 1);
      const result = await pending;
      assert.equal(result.exitCode, 1, "deadline fails closed");
      assert.equal(result.report.query.reason, "query-incomplete");
      assert.ok(statuses(result.report).every(status => status === "unobservable"), "deadline cannot imply zero use");
      assert.equal(calls, 1); assert.equal(aborted, true);
    } finally { t.mock.timers.reset(); }
  });
});

// Invariant: route-place observations remain qualified even with an unsampled
// loss-free summary; individual routes, binding use and native pins are unknown.
test("usage report says no observed use within stated coverage, never never used", async () => {
  await externalMapping(async ({ path, inventory, mapping, measured }) => {
    const calls = [];
    const positive = await runUsageReport(argv(path), { now, stdin: input(token), fetch: async (url, init) => {
      calls.push({ url, init }); return Response.json(writerResponse());
    } });
    assert.equal(positive.exitCode, 0);
    assert.deepEqual(positive.report.window, window);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, `https://api.cloudflare.com/client/v4/accounts/${account}/analytics_engine/sql`);
    assert.equal(calls[0].init.method, "POST");
    assert.equal(calls[0].init.redirect, "error");
    assert.equal(calls[0].init.credentials, "omit");
    assert.equal(calls[0].init.headers.Authorization, `Bearer ${token}`);
    const worker = positive.report.workers.find(worker => worker.worker === measured.worker);
    assert.equal(worker.status, "observed");
    assert.equal(worker.coverage.absenceProven, false);
    assert.equal(worker.coverage.sampled, false);
    assert.equal(worker.coverage.recordedLoss, false);
    assert.equal(worker.coverage.missingSummary, false);
    assert.equal(worker.coverage.nativePlatformVersions, "unobservable");
    assert.equal(worker.coverage.features, "unobservable");
    assert.ok(worker.routes.length > 0 && worker.bindings.length > 0);
    assert.ok(worker.routes.every(route => route.status === "unobservable"));
    assert.ok(worker.bindings.every(binding => binding.status === "unobservable"));
    assert.equal(worker.groups.find(group => group.place === "health").status, "observed");
    const noUse = worker.groups.find(group => group.status === "zero-observed");
    assert.ok(noUse, "a configured place with no returned point is shown");
    assert.match(noUse.message, /no observed use/);
    assert.match(noUse.message, /sampling.*loss.*missing summaries.*operator-declared/);
    assert.doesNotMatch(encoded(positive.report), /never used|unused/i);
    assert.match(positive.report.qualification, /not proof of absence/);
    assert.ok(!encoded(positive.report).includes("TEST-usage-deployment"), "operator aliases are not echoed");
    for (const [label, data, expected] of [
      ["sampled", [row("route", { maximumSampleInterval: 4, weightedEvents: 4 }), row("metric-dropped")], { sampled: true }],
      ["recorded sidecar loss", writerResponse("sidecarLoss").data, { recordedLoss: true }],
      ["missing terminal summary", [row("route")], { missingSummary: true }],
      ["unknown alias", [row("route", { deployment: "unknown" })], { telemetry: "unobservable" }],
    ]) {
      const report = evaluateUsage({ inventory, mapping, window, rows: decodeUsageResponse(response(data), window) });
      const observed = report.workers.find(worker => worker.worker === measured.worker);
      for (const [key, value] of Object.entries(expected)) assert.equal(observed.coverage[key], value, label);
      assert.equal(observed.coverage.absenceProven, false, label);
      assert.doesNotMatch(encoded(report), /never used|unused/i, label);
      assert.ok(observed.routes.every(route => route.status === "unobservable"), label);
      if (label === "unknown alias") {
        assert.equal(report.query.unassignedGroups, 1);
        assert.ok(observed.groups.every(group => group.status === "unobservable"), "unknown aliases do not prove historical absence");
      }
    }
  });
});

// Invariant: only a bounded external operator mapping and a valid completed
// UTC window reach token reading or the single permitted network request.
test("usage inputs enforce external realpaths, mapping bounds and exact UTC windows before I/O", async () => {
  await externalMapping(async ({ path, dir, mapping, inventory }) => {
    assert.deepEqual(parseUsageMapping(mapping, inventory), mapping);
    const duplicateWorker = copy(mapping); duplicateWorker.workers.push(copy(mapping.workers[0]));
    const duplicateAlias = copy(mapping); duplicateAlias.workers[1].deployments = [...mapping.workers[0].deployments];
    const tooManyAliases = copy(mapping); tooManyAliases.workers[0].deployments = Array.from({ length: USAGE_LIMITS.aliasesPerWorker + 1 }, (_, index) => `TEST-alias-${index}`);
    for (const value of [duplicateWorker, duplicateAlias, tooManyAliases]) assert.throws(() => parseUsageMapping(value, inventory));
    const link = join(dir, "repository-file-link.json");
    await symlink(resolve(root, "scripts/usage-report-mapping.example.json"), link);
    const oversized = join(dir, "oversized.json"), duplicate = join(dir, "duplicate.json");
    const valid = encoded(mapping);
    await writeFile(oversized, valid + " ".repeat(USAGE_LIMITS.mappingBytes + 1 - Buffer.byteLength(valid)));
    await writeFile(duplicate, valid.replace('"version":1', '"version":1,"version":1'));
    const invalid = [
      ["in-repository mapping", argv(resolve(root, "scripts/usage-report-mapping.example.json"))],
      ["symlink into repository", argv(link)],
      ["oversized valid mapping", argv(oversized)],
      ["duplicate JSON keys", argv(duplicate)],
      ["future window", [...argv(path).slice(0, -2), "--through", "2026-10-27T12:00:01Z"]],
      ["normalized impossible date", [...argv(path).slice(0, -2), "--through", "2026-02-30T12:00:00Z"]],
      ["non-UTC window", [...argv(path).slice(0, -2), "--through", "2026-10-27T12:00:00+00:00"]],
      ["credential argument", [...argv(path), "--token", token]],
    ];
    for (const [label, args] of invalid) {
      let readToken = false, fetched = false;
      const result = await runUsageReport(args, { now,
        stdin: { async *[Symbol.asyncIterator]() { readToken = true; yield token; } },
        fetch: async () => { fetched = true; throw Error("must not fetch"); },
      });
      assert.equal(result.exitCode, 2, label);
      assert.equal(result.report.query.reason, "input-invalid", label);
      assert.equal(readToken, false, label); assert.equal(fetched, false, label);
      assert.ok(!encoded(result).includes(token), label);
    }
    // The executable is exercised only at a guaranteed pre-network refusal.
    const child = spawnSync(process.execPath, [resolve(root, "scripts/usage-report.mjs"), "--token", token], { cwd: dir, input: "", encoding: "utf8", timeout: 10_000 });
    assert.equal(child.error, undefined);
    assert.equal(child.status, 2);
    assert.equal(JSON.parse(child.stdout).query.reason, "input-invalid");
    assert.ok(!`${child.stdout}${child.stderr}`.includes(token), "CLI refusal does not echo a credential argument");
  });
});
