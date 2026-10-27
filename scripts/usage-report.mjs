/** Read-only, qualified route-place observations against checked-in configuration.
 * Operator execution and hosted SQL acceptance are separate from TEST fixtures. */
import { constants, readFileSync } from "node:fs";
import { open, realpath } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { stripTypeScriptTypes } from "node:module";
import { parseAst } from "rolldown/parseAst";
import { isScopeId, parseStrict } from "@generalbusiness/dap-bytes";
import { servedInventory } from "./security-entry-points.mjs";
import { configOf, readSettingsDocument } from "./security-settings.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const USAGE_LIMITS = Object.freeze({ tokenBytes: 4096, inputBytes: 4098, inputMilliseconds: 10_000, mappingBytes: 64 * 1024,
  workers: 32, aliasesPerWorker: 16, labelBytes: 128, queryMilliseconds: 30_000, responseBytes: 8 * 1024 * 1024, chunks: 65_536, groups: 8192, days: 30 });
const COLUMNS = ["kind", "deployment", "place", "result", "reason", "execution", "storedRows", "weightedEvents", "maximumSampleInterval", "maximumSecond", "weightedA", "firstSeconds", "lastSeconds"];
const LABEL_COLUMNS = COLUMNS.slice(0, 6);
const MAX = Number.MAX_SAFE_INTEGER;
const QUALIFICATION = "No observed use is not proof of absence. Deployment aliases are operator-declared, not authenticated Worker identities. No retirement conclusion.";
const record = value => value !== null && typeof value === "object" && !Array.isArray(value);
const keys = (value, expected) => record(value) && Object.keys(value).sort().join(",") === [...expected].sort().join(",");
const invalid = () => { throw Error("invalid-observation"); };
const uint = value => {
  if (typeof value === "string") {
    if (!/^(?:0|[1-9][0-9]*)$/.test(value) || value.length > 16) return invalid();
    value = Number(value);
  }
  if (!Number.isSafeInteger(value) || Object.is(value, -0) || value < 0) return invalid();
  return value;
};
const sum = (a, b) => { if (a > MAX - b) return invalid(); return a + b; };
const label = value => typeof value === "string" && value.length > 0 && Buffer.byteLength(value) <= USAGE_LIMITS.labelBytes && !/[\u0000-\u001f\u007f]/u.test(value);
const read = file => readFileSync(resolve(root, file), "utf8");
let inventoryPromise;

/** Reuse the actual finite HTTP matcher for its coarse place, never infer a
 * successful route/method from it. Only bounded reviewed path templates run. */
function metricLocation() {
  const source = read("packages/scope/src/operational.ts");
  const declaration = parseAst(source, { lang: "ts" }).body.find(node => node.type === "FunctionDeclaration" && node.id?.name === "location");
  if (!declaration) return invalid();
  return Function("admittedRequestUrl", "isScopeId", `${stripTypeScriptTypes(source.slice(declaration.start, declaration.end))}; return location;`)(() => true, isScopeId);
}
function metricPlaces() {
  const source = read("packages/scope/src/metrics.ts"), tree = parseAst(source, { lang: "ts" });
  const result = [];
  for (const raw of tree.body) {
    const node = raw.declaration ?? raw;
    if (node.type !== "VariableDeclaration") continue;
    for (const part of node.declarations) if (["METRIC_PLACES", "STEPS"].includes(part.id?.name)) {
      const value = part.init?.type === "TSAsExpression" ? part.init.expression : part.init;
      if (value?.type !== "ArrayExpression") return invalid();
      for (const item of value.elements) {
        if (item.type === "Literal" && typeof item.value === "string") result.push(item.value);
        else if (item.type !== "SpreadElement" || item.argument?.name !== "STEPS") return invalid();
      }
    }
  }
  if (!result.length || result.length !== new Set(result).size) return invalid();
  return result;
}

export function loadUsageInventory() {
  return inventoryPromise ??= (async () => {
    const routes = await servedInventory(), settings = readSettingsDocument(read("docs/security/settings.md"));
    const workers = new Map(), locate = metricLocation();
    for (const item of settings.deployments) {
      const config = configOf(read(item.config), item.config);
      if (config.name !== item.name) return invalid();
      let worker = workers.get(item.name);
      if (!worker) {
        worker = { worker: item.name, configs: [], routes: routes.get(item.name) ?? [], bindings: [], routePlaces: [], metricWriter: false };
        workers.set(item.name, worker);
      }
      worker.configs.push(item.config);
      const binding = (name, kind) => {
        if (typeof name !== "string" || !/^[A-Z][A-Z0-9_]*$/.test(name)) return invalid();
        let row = worker.bindings.find(row => row.name === name);
        if (!row) { row = { name, kinds: [] }; worker.bindings.push(row); }
        if (!row.kinds.includes(kind)) row.kinds.push(kind);
      };
      for (const [kind, rows] of [["durable-object", config.durable_objects?.bindings], ["r2", config.r2_buckets], ["service", config.services], ["analytics", config.analytics_engine_datasets], ["artifacts", config.artifacts]]) {
        for (const row of rows ?? []) binding(row.binding ?? row.name, kind);
      }
      if (config.version_metadata) binding(config.version_metadata.binding, "version-metadata");
      if (config.assets?.binding) binding(config.assets.binding, "assets");
      // These exact room roots share the measured fetch closure whose routes
      // servedInventory checks. Other Workers have independent instrumentation.
      worker.metricWriter ||= item.config.startsWith("apps/room/wrangler") && ["worker.ts", "worker.grow.ts"].includes(config.main);
    }
    for (const worker of workers.values()) {
      if (worker.metricWriter) worker.routePlaces = [...new Set(worker.routes.map(row => {
        const path = row.route.slice(row.route.indexOf(" ") + 1).replace(":scope", `sc_${"a".repeat(52)}`).replace(/:[a-zA-Z][a-zA-Z0-9-]*/g, "parameter").replaceAll("*", "parameter");
        return locate({ url: `https://inventory.invalid${path}` }).place;
      }))].sort();
      worker.bindings.sort((a, b) => a.name.localeCompare(b.name));
      for (const binding of worker.bindings) binding.kinds.sort();
    }
    return { workers: [...workers.values()].sort((a, b) => a.worker.localeCompare(b.worker)), metricPlaces: metricPlaces() };
  })();
}

export function parseUsageMapping(value, inventory) {
  if (!keys(value, ["version", "workers"]) || value.version !== 1 || !Array.isArray(value.workers) || value.workers.length > USAGE_LIMITS.workers) return invalid();
  const known = new Set(inventory.workers.map(row => row.worker)), workers = new Set(), aliases = new Set();
  return { version: 1, workers: value.workers.map(row => {
    if (!keys(row, ["worker", "deployments"]) || !known.has(row.worker) || workers.has(row.worker)
      || !Array.isArray(row.deployments) || !row.deployments.length || row.deployments.length > USAGE_LIMITS.aliasesPerWorker) return invalid();
    workers.add(row.worker);
    const deployments = row.deployments.map(alias => {
      if (!label(alias) || aliases.has(alias)) return invalid();
      aliases.add(alias); return alias;
    });
    return { worker: row.worker, deployments };
  }) };
}

export function usageReportSql(window) {
  const from = uint(window.fromSeconds), through = uint(window.throughSeconds);
  if (through - from !== USAGE_LIMITS.days * 86400) return invalid();
  return `SELECT blob1 AS kind, blob2 AS deployment, blob4 AS place,
blob5 AS result, blob6 AS reason, blob9 AS execution,
COUNT() AS storedRows, SUM(_sample_interval) AS weightedEvents,
MAX(_sample_interval) AS maximumSampleInterval, MAX(double2) AS maximumSecond,
SUM(_sample_interval * double3) AS weightedA,
MIN(toUnixTimestamp(timestamp)) AS firstSeconds, MAX(toUnixTimestamp(timestamp)) AS lastSeconds
FROM artroom_metrics_v1
WHERE timestamp >= toDateTime(${from}) AND timestamp < toDateTime(${through})
AND (blob1 = 'route' OR blob1 = 'metric-dropped') AND blob9 != 'mcp-metrics-v1'
GROUP BY blob1, blob2, blob4, blob5, blob6, blob9
LIMIT ${USAGE_LIMITS.groups + 1} FORMAT JSON`;
}

/** Metadata type families allow double-valued aggregates. Integral count
 * values may arrive as JSON numbers or unsigned decimal strings; no rounding. */
export function decodeUsageResponse(value, window) {
  const envelope = ["meta", "data", "rows", "statistics", "rows_before_limit_at_least"];
  if (!record(value) || Object.keys(value).some(key => !envelope.includes(key))
    || !Array.isArray(value.meta) || value.meta.length !== COLUMNS.length || !Array.isArray(value.data)
    || value.data.length > USAGE_LIMITS.groups || uint(value.rows) !== value.data.length) return invalid();
  const names = new Set();
  for (const column of value.meta) {
    if (!keys(column, ["name", "type"]) || !COLUMNS.includes(column.name) || names.has(column.name) || typeof column.type !== "string") return invalid();
    names.add(column.name);
    if (LABEL_COLUMNS.includes(column.name) ? !/^(?:String|FixedString\([1-9][0-9]*\)|LowCardinality\(String\))$/.test(column.type)
      : !/^(?:U?Int(?:8|16|32|64)|Float(?:32|64))$/.test(column.type)) return invalid();
  }
  // The provider hint counts input rows before aggregation, not returned
  // groups. Ignore it; the query's group limit is checked above.
  const places = new Set(metricPlaces()), groups = new Set();
  return value.data.map(input => {
    if (!keys(input, COLUMNS) || !LABEL_COLUMNS.every(key => label(input[key]))) return invalid();
    const row = Object.fromEntries(COLUMNS.map(key => [key, LABEL_COLUMNS.includes(key) ? input[key] : uint(input[key])]));
    if (!places.has(row.place) || row.storedRows < 1 || row.weightedEvents < row.storedRows || row.maximumSampleInterval < 1
      || row.firstSeconds < window.fromSeconds || row.lastSeconds >= window.throughSeconds || row.firstSeconds > row.lastSeconds) return invalid();
    if (row.kind === "route") {
      if (!["ok", "refused", "error"].includes(row.result) || !["2xx", "3xx", "4xx", "5xx"].includes(row.reason)
        || !["turn", "pre-turn"].includes(row.execution) || row.maximumSecond > 0x7fffffff || row.weightedA !== 0
        || row.result === "ok" && !["2xx", "3xx"].includes(row.reason) || row.result === "refused" && row.reason !== "4xx" || row.result === "error" && row.reason !== "5xx") return invalid();
    } else if (row.kind !== "metric-dropped" || row.place !== "metrics" || row.result !== "dropped" || row.reason !== "summary" || row.execution !== "none" || row.maximumSecond > 31) return invalid();
    const identity = JSON.stringify(LABEL_COLUMNS.map(key => row[key]));
    if (groups.has(identity)) return invalid();
    groups.add(identity); return row;
  });
}

export function evaluateUsage({ inventory, mapping, workers = inventory.workers.map(row => row.worker), window, rows }) {
  const report = { version: 1, qualification: QUALIFICATION, mappingSource: "operator-declared", window,
    query: { status: Array.isArray(rows) ? "observed" : "unobservable", reason: Array.isArray(rows) ? "bounded-response" : "query-unavailable", unassignedGroups: 0 },
    workers: [], limits: USAGE_LIMITS };
  const assigned = new Set(mapping.workers.flatMap(row => row.deployments).filter(alias => alias !== "unknown"));
  if (rows) report.query.unassignedGroups = rows.filter(row => !assigned.has(row.deployment)).length;
  for (const name of workers) {
    const configured = inventory.workers.find(row => row.worker === name);
    if (!configured) return invalid();
    const mapped = mapping.workers.find(row => row.worker === name), aliases = new Set((mapped?.deployments ?? []).filter(alias => alias !== "unknown"));
    const own = rows?.filter(row => aliases.has(row.deployment)) ?? [], routes = own.filter(row => row.kind === "route"), summaries = own.filter(row => row.kind === "metric-dropped");
    const telemetry = own.length > 0, reason = !mapped ? "mapping-missing" : !aliases.size ? "mapping-unknown-label" : !rows ? "query-unavailable" : !telemetry ? "telemetry-missing" : "mapped-points";
    let events = 0, lost = 0;
    for (const row of routes) events = sum(events, row.weightedEvents);
    for (const row of summaries) lost = sum(lost, row.weightedA);
    const worker = { worker: name, status: telemetry ? "observed" : "unobservable", reason, refused: !mapped || !aliases.size,
      deploymentCount: mapped?.deployments.length ?? 0, configs: [...configured.configs],
      routes: configured.routes.map(row => ({ ...row, status: "unobservable", reason: "route-method-not-in-wire", message: "Individual route use is unobservable; place groups include other methods and refusals." })),
      bindings: configured.bindings.map(row => ({ name: row.name, kinds: [...row.kinds], status: "unobservable", reason: "binding-use-not-in-wire", message: "Configuration declares a binding; route points do not measure its use." })), groups: [],
      coverage: { mapping: "operator-declared", telemetry: telemetry ? "observed" : "unobservable", sampled: own.some(row => row.maximumSampleInterval > 1),
        recordedLoss: summaries.some(row => row.maximumSecond > 0 || row.weightedA > 0), weightedLostRows: lost, missingSummary: summaries.length === 0, weightedRouteEvents: events,
        absenceProven: false, nativePlatformVersions: "unobservable", features: "unobservable", routeInventory: configured.routes.length ? "static" : "unavailable" } };
    const places = [...new Set([...configured.routePlaces, ...routes.map(row => row.place)])].sort();
    for (const place of places) {
      const matches = routes.filter(row => row.place === place);
      let weightedEvents = 0;
      for (const row of matches) weightedEvents = sum(weightedEvents, row.weightedEvents);
      const status = matches.length ? "observed" : telemetry ? "zero-observed" : "unobservable";
      worker.groups.push({ place, status, weightedEvents,
        message: status === "observed" ? "Observed route-place points; this does not identify a successful route or native act."
          : status === "zero-observed" ? "no observed use in returned points; sampling, loss, missing summaries and operator-declared aliases do not prove absence."
            : "Use is unobservable without mapped telemetry.",
        results: matches.map(row => ({ result: row.result, reason: row.reason, execution: row.execution, weightedEvents: row.weightedEvents })) });
    }
    report.workers.push(worker);
  }
  return report;
}

function windowOf(value, now) {
  const captured = now();
  if (!(captured instanceof Date) || !Number.isFinite(captured.getTime())) return invalid();
  const nowSeconds = Math.floor(captured.getTime() / 1000);
  let throughSeconds = nowSeconds;
  if (value !== undefined) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.000)?Z$/.test(value)) return invalid();
    const date = new Date(value), normalized = date.toISOString();
    if (value !== normalized && value !== normalized.replace(".000Z", "Z")) return invalid();
    throughSeconds = date.getTime() / 1000;
  }
  uint(throughSeconds);
  if (throughSeconds > nowSeconds || throughSeconds < USAGE_LIMITS.days * 86400) return invalid();
  const fromSeconds = throughSeconds - USAGE_LIMITS.days * 86400;
  return { from: new Date(fromSeconds * 1000).toISOString(), through: new Date(throughSeconds * 1000).toISOString(), fromSeconds, throughSeconds };
}
function argumentsOf(argv) {
  if (!Array.isArray(argv) || argv.length > 2 * (USAGE_LIMITS.workers + 3)) return invalid();
  const result = { workers: [] };
  for (let at = 0; at < argv.length; at += 2) {
    const flag = argv[at], value = argv[at + 1];
    if (typeof value !== "string" || !value) return invalid();
    if (flag === "--worker") { if (result.workers.includes(value)) return invalid(); result.workers.push(value); }
    else {
      const flags = { "--account": "account", "--mapping": "mapping", "--through": "through" };
      if (!Object.hasOwn(flags, flag)) return invalid();
      const key = flags[flag];
      if (Object.hasOwn(result, key)) return invalid();
      result[key] = value;
    }
  }
  if (!/^[0-9a-f]{32}$/.test(result.account ?? "") || typeof result.mapping !== "string" || !isAbsolute(result.mapping)) return invalid();
  return result;
}
async function mappingInput(path) {
  const actual = await realpath(path), common = execFileSync("git", ["rev-parse", "--git-common-dir"], { cwd: root, encoding: "utf8", timeout: 5000, maxBuffer: 8192, stdio: ["ignore", "pipe", "ignore"] }).trim();
  const repository = dirname(await realpath(resolve(root, common))), current = await realpath(root);
  const inside = base => { const rel = relative(base, actual); return rel === "" || !rel.startsWith("../") && rel !== ".." && !isAbsolute(rel); };
  if (inside(repository) || inside(current)) return invalid();
  const file = await open(actual, constants.O_RDONLY | (constants.O_NONBLOCK ?? 0));
  try {
    const stat = await file.stat();
    if (!stat.isFile() || stat.size > USAGE_LIMITS.mappingBytes) return invalid();
    const bytes = Buffer.alloc(USAGE_LIMITS.mappingBytes + 1);
    let size = 0;
    while (size < bytes.length) {
      const part = await file.read(bytes, size, bytes.length - size, size);
      if (!part.bytesRead) break;
      size += part.bytesRead;
    }
    if (size > USAGE_LIMITS.mappingBytes) return invalid();
    const data = bytes.subarray(0, size);
    return { value: parseStrict(new TextDecoder("utf-8", { fatal: true }).decode(data)), sha256: createHash("sha256").update(data).digest("hex") };
  } finally { await file.close(); }
}
async function tokenInput(stdin) {
  if (stdin?.isTTY || typeof stdin?.[Symbol.asyncIterator] !== "function") return invalid();
  const iterator = stdin[Symbol.asyncIterator](), chunks = [];
  let timer, closed = false, ended = false, size = 0, pieces = 0;
  const work = async () => {
    for (;;) {
      const part = await iterator.next();
      if (closed) return invalid();
      if (part.done) { ended = true; break; }
      const bytes = typeof part.value === "string" ? Buffer.from(part.value) : part.value;
      if (!(bytes instanceof Uint8Array) || ++pieces > USAGE_LIMITS.chunks || bytes.byteLength > USAGE_LIMITS.inputBytes - size) return invalid();
      size += bytes.byteLength; chunks.push(Buffer.from(bytes));
    }
    let text = new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks, size));
    text = text.replace(/\r?\n$/, "");
    if (!text || Buffer.byteLength(text) > USAGE_LIMITS.tokenBytes || !/^[\x21-\x7e]+$/.test(text)) return invalid();
    return text;
  };
  try { return await Promise.race([work(), new Promise((_, reject) => { timer = setTimeout(() => reject(Error("input-deadline")), USAGE_LIMITS.inputMilliseconds); })]); }
  finally {
    closed = true; clearTimeout(timer);
    for (const chunk of chunks) chunk.fill(0);
    if (!ended) { try { stdin.destroy?.(); } catch { /* owned input cancellation */ } }
    try { void Promise.resolve(iterator.return?.()).catch(() => undefined); } catch { /* finite input failure */ }
  }
}
async function query(fetcher, account, token, window) {
  const controller = new AbortController(); let timer;
  const work = async () => {
    const response = await fetcher(`https://api.cloudflare.com/client/v4/accounts/${account}/analytics_engine/sql`, {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "text/plain;charset=UTF-8" }, body: usageReportSql(window), redirect: "error", credentials: "omit", signal: controller.signal,
    });
    if (controller.signal.aborted || response.status !== 200 || !response.body) { void response.body?.cancel().catch(() => undefined); throw Error("query-status"); }
    const reader = response.body.getReader(), chunks = []; let size = 0, pieces = 0;
    const cancel = () => { void reader.cancel().catch(() => undefined); };
    controller.signal.addEventListener("abort", cancel, { once: true });
    try {
      for (;;) {
        const part = await reader.read();
        if (controller.signal.aborted) throw Error("query-deadline");
        if (part.done) break;
        if (++pieces > USAGE_LIMITS.chunks || part.value.byteLength > USAGE_LIMITS.responseBytes - size) throw Error("query-size");
        size += part.value.byteLength; chunks.push(part.value);
      }
      return decodeUsageResponse(parseStrict(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks, size))), window);
    } finally { controller.signal.removeEventListener("abort", cancel); cancel(); reader.releaseLock(); }
  };
  try { return await Promise.race([work(), new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(Error("query-deadline")); }, USAGE_LIMITS.queryMilliseconds); })]); }
  finally { clearTimeout(timer); controller.abort(); }
}
function failure(reason) {
  return { version: 1, qualification: QUALIFICATION, mappingSource: "operator-declared", window: null,
    query: { status: "unobservable", reason, unassignedGroups: 0 }, workers: [], limits: USAGE_LIMITS };
}

/** Injection belongs to local tests only; no CLI mock/provider/token flags. */
export async function runUsageReport(argv, { stdin = process.stdin, fetch = globalThis.fetch, now = () => new Date() } = {}) {
  let args, inventory, mapping, input, window, workers;
  try {
    args = argumentsOf(argv); window = windowOf(args.through, now);
    inventory = await loadUsageInventory();
    workers = args.workers.length ? args.workers : inventory.workers.map(row => row.worker);
    if (workers.some(name => !inventory.workers.some(row => row.worker === name))) return { exitCode: 2, report: failure("worker-unknown") };
    input = await mappingInput(args.mapping); mapping = parseUsageMapping(input.value, inventory);
  } catch { return { exitCode: 2, report: failure("input-invalid") }; }
  const preliminary = evaluateUsage({ inventory, mapping, workers, window, rows: null });
  preliminary.mappingSha256 = input.sha256;
  if (preliminary.workers.every(worker => worker.refused)) {
    preliminary.query.reason = "no-mapped-worker";
    return { exitCode: 2, report: preliminary };
  }
  let token;
  try { token = await tokenInput(stdin); }
  catch { preliminary.query.reason = "token-input-invalid"; return { exitCode: 2, report: preliminary }; }
  let report;
  try {
    const rows = await query(fetch, args.account, token, window);
    report = evaluateUsage({ inventory, mapping, workers, window, rows }); report.mappingSha256 = input.sha256;
  } catch {
    preliminary.query.reason = "query-incomplete"; report = preliminary;
  }
  // Neither provider labels nor mapping aliases appear in the report. This
  // final boundary withholds an observation containing the credential text.
  if (JSON.stringify(report).includes(token)) return { exitCode: 1, report: null };
  const exitCode = report.query.status === "unobservable" ? 1 : report.workers.some(worker => worker.refused) ? 2 : 0;
  return { exitCode, report };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { exitCode, report } = await runUsageReport(process.argv.slice(2));
    if (report !== null) process.stdout.write(JSON.stringify(report) + "\n");
    process.exitCode = exitCode;
  } catch { process.exitCode = 1; }
}
