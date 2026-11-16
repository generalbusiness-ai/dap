#!/usr/bin/env node
/** Actual client -> temporary TLS proxy -> pinned celld -> unchanged Room
 * Worker. Generated CA/key/session secret and CLI custody are TEST-only,
 * owner-only scratch data. No global trust change or deployed proxy claim.
 * Run only after source review, with an explicit root-supplied CELLD_BIN.
 * Output is closed public metadata except approved backend-only bounded tails;
 * full child logs remain private. */
import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { chmod, mkdtemp, mkdir, readFile, writeFile, stat } from "node:fs/promises";
import { createServer as createHttpServer, request as httpRequest } from "node:http";
import { createServer as createTlsServer, request as httpsRequest } from "node:https";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { celldSmokeDetail, celldSmokeOperation, celldSmokeStatusClass, celldSmokeTransport, contextForCelldSmoke, runCelldSmoke } from "./celld-smoke.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const failureMetadata = { stage: "preflight", signal: null, exchange: null };
const digest = bytes => createHash("sha256").update(bytes).digest("hex");
const MAX_REPLY = 4 * 1024 * 1024;
export const BACKEND_TAIL_LINES = 12, BACKEND_TAIL_LINE_BYTES = 512;
/** Last twelve lines, at most 512 UTF-8 bytes of text each. Full raw output stays private. */
export function backendTail() {
  const lines = []; let pending = Buffer.alloc(0), truncated = false, complete = false;
  const line = () => {
    let text = "", bytes = 0, cut = truncated;
    for (const character of pending.toString("utf8")) {
      const width = Buffer.byteLength(character);
      if (bytes + width > BACKEND_TAIL_LINE_BYTES) { cut = true; break; }
      text += character; bytes += width;
    }
    return { text, truncated: cut };
  };
  return {
    add(chunk) {
      let from = 0;
      while (from < chunk.length) {
        const newline = chunk.indexOf(10, from), end = newline < 0 ? chunk.length : newline;
        const room = BACKEND_TAIL_LINE_BYTES - pending.length, part = chunk.subarray(from, end);
        pending = Buffer.concat([pending, part.subarray(0, room)]);
        truncated ||= part.length > room;
        if (newline < 0) break;
        lines.push(line()); if (lines.length > BACKEND_TAIL_LINES) lines.shift();
        pending = Buffer.alloc(0); truncated = false; from = newline + 1;
      }
    },
    end: () => { complete = true; },
    snapshot() { return { lineLimit: BACKEND_TAIL_LINES, lineByteLimit: BACKEND_TAIL_LINE_BYTES, complete,
      lines: [...lines, ...(pending.length || truncated ? [line()] : [])].slice(-BACKEND_TAIL_LINES) }; },
  };
}
/** This explicit backend-only exception quotes bounded output and infers nothing from it. */
export function backendOutputFor(owner, output) {
  if (owner !== "celldbackend") return null;
  return { sentence: "backend, cause not observed", stdout: output.stdout.snapshot(), stderr: output.stderr.snapshot() };
}
const observationFields = {
  clientPhase: ["not-started", "request-construction", "request-buffer", "tls-request-construction", "tls-await-headers", "response-headers", "response-body-adapter", "response-construction", "response-stream", "response-complete"],
  firstFailure: ["none", "client-request", "client-tls-request", "client-tls-exchange", "client-response-headers", "client-response-body-adapter", "client-response-construction", "client-response-stream", "proxy-admission", "proxy-request-construction", "proxy-request-stream", "proxy-response-headers", "upstream-request", "upstream-response-stream", "downstream-response", "relay-unclassified"],
  errorClass: ["none", "connection-refused", "connection-reset", "broken-pipe", "timeout", "tls-certificate", "tls-protocol", "http-parser", "type", "range", "abort", "other-error", "non-error"],
  proxyDecision: ["not-seen", "forwarded", "interrupted", "request-budget", "invalid-request-target"],
  upstreamPhase: ["not-started", "request-created", "request-ended", "response-headers", "response-complete"],
  upstreamEnd: ["none", "error", "aborted", "complete"], downstreamEnd: ["none", "error", "closed-before-finish", "finished"],
  clientBodyEnd: ["not-started", "complete", "error", "cancelled"], clientStop: ["none", "deadline", "reply-byte-bound", "owned-interruption", "unclassified-abort"],
  upstreamStatus: ["none", "1xx", "2xx", "3xx", "4xx", "5xx", "invalid"], clientStatus: ["none", "1xx", "2xx", "3xx", "4xx", "5xx", "invalid"],
  startupHealth: ["not-observed", "http-200", "http-503"], startupSessions: ["not-observed", "ok", "unavailable"],
  proxy: ["not-started", "listening", "closed"], worker: ["not-started", "running", "exited"],
};
const errorCodes = new Map([
  ["ECONNREFUSED", "connection-refused"], ["ECONNRESET", "connection-reset"], ["EPIPE", "broken-pipe"], ["ETIMEDOUT", "timeout"],
  ...["ERR_TLS_CERT_ALTNAME_INVALID", "DEPTH_ZERO_SELF_SIGNED_CERT", "SELF_SIGNED_CERT_IN_CHAIN", "UNABLE_TO_VERIFY_LEAF_SIGNATURE", "CERT_HAS_EXPIRED"].map(code => [code, "tls-certificate"]),
  ["ERR_SSL_WRONG_VERSION_NUMBER", "tls-protocol"], ...["HPE_INVALID_CONSTANT", "HPE_INVALID_STATUS", "HPE_INVALID_HEADER_TOKEN", "HPE_INVALID_CONTENT_LENGTH"].map(code => [code, "http-parser"]),
]);
function errorClass(error) {
  try {
    if (error === null) return "none";
    return errorCodes.get(error?.code) ?? (error instanceof TypeError ? "type" : error instanceof RangeError ? "range"
      : error instanceof Error ? "other-error" : "non-error");
  } catch { return "non-error"; }
}

/** Closed observations only. No error object, response body or request identifier is retained. */
export function proxyFailureObservation() {
  const state = Object.fromEntries(Object.entries(observationFields).map(([key, values]) => [key, values[0]]));
  let armed = false;
  const note = (key, value) => {
    if (!Object.hasOwn(observationFields, key)) return;
    const values = observationFields[key];
    if (values?.includes(value) && (!(key === "clientPhase" || key === "upstreamPhase") || values.indexOf(value) >= values.indexOf(state[key]))) state[key] = value;
  };
  const fault = (site, error = null) => {
    if (armed && state.firstFailure === "none" && observationFields.firstFailure.includes(site)) {
      state.firstFailure = site; state.errorClass = errorClass(error);
    }
  };
  return {
    arm: () => { if (armed) return false; armed = true; return true; }, active: () => armed, note, fault,
    snapshot(proxy, worker, transport) {
      note("proxy", proxy); note("worker", worker);
      if (transport?.kind === "deadline") note("clientStop", "deadline");
      if (transport?.kind === "reply-too-large") note("clientStop", "reply-byte-bound");
      let faultBoundary = state.clientPhase === "not-started" ? "client-adapter" : state.proxyDecision === "not-seen" ? "tls-to-proxy"
        : ["request-ended", "response-headers"].includes(state.upstreamPhase) ? "backend-endpoint" : "proxy-forwarding";
      if (state.clientStop === "owned-interruption") faultBoundary = "owned-interruption";
      else if (["interrupted", "request-budget", "invalid-request-target"].includes(state.proxyDecision)) faultBoundary = "proxy-admission";
      else if (["client-request", "client-tls-request", "client-response-headers", "client-response-body-adapter", "client-response-construction", "client-response-stream"].includes(state.firstFailure)) faultBoundary = "client-adapter";
      else if (state.firstFailure === "client-tls-exchange" && state.proxyDecision === "not-seen") faultBoundary = "tls-to-proxy";
      else if (transport?.kind === "reply-too-large" && state.proxyDecision === "forwarded" && state.upstreamStatus !== "none") faultBoundary = "backend-reply";
      else if (state.clientStop === "deadline" && state.upstreamPhase === "request-ended") faultBoundary = "backend-endpoint";
      else if (["upstream-request", "upstream-response-stream"].includes(state.firstFailure)) faultBoundary = "backend-endpoint";
      else if (["proxy-request-construction", "proxy-request-stream", "proxy-response-headers", "downstream-response"].includes(state.firstFailure)) faultBoundary = "proxy-forwarding";
      else if (state.firstFailure === "relay-unclassified") faultBoundary = "proxy-forwarding";
      else if (state.upstreamEnd === "complete" && state.downstreamEnd === "finished" && ["reply-not-answer", "reply-too-large"].includes(transport?.kind)) faultBoundary = "backend-reply";
      else if (state.clientBodyEnd === "complete" && transport?.kind === "unclassified") faultBoundary = "cli-answer-validation";
      const owner = ["client-adapter", "cli-answer-validation"].includes(faultBoundary) ? "clientadapter"
        : ["backend-endpoint", "backend-reply"].includes(faultBoundary) ? "celldbackend" : "proxy";
      return { ...state, faultBoundary, owner };
    },
  };
}
const must = (condition, label) => assert.ok(condition, label);
function celldVersionOf(pin) {
  const match = typeof pin === "string" ? /^(v[0-9]+\.[0-9]+\.[0-9]+)\n$/.exec(pin) : null;
  must(match !== null && match[0] === pin, "Invalid maintained celld version pin");
  return match[1];
}

/** Exact whitespace-delimited version token; importing this module runs no driver. */
export function matchesCelldVersion(pin, reported) {
  const expected = celldVersionOf(pin);
  return typeof reported === "string" && reported.split(/\s+/).some(token => token === expected || token === expected.slice(1));
}

const boundedJoin = async (promise, milliseconds, label) => {
  let timer;
  try { return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(Error(label)), milliseconds); })]); }
  finally { clearTimeout(timer); }
};
const cleanEnv = directory => ({ PATH: join(ROOT, "node_modules/.bin") + ":" + (process.env.PATH ?? "/usr/bin:/bin"), HOME: join(directory, "home"), TMPDIR: directory });
const listen = server => new Promise((resolve, reject) => {
  server.once("error", reject); server.listen(0, "127.0.0.1", () => { server.removeListener("error", reject); resolve(server.address().port); });
});
const closeServer = server => new Promise((resolve, reject) => { server.close(error => error ? reject(error) : resolve()); server.closeAllConnections?.(); });
const unusedPort = async () => { const server = createHttpServer(); const port = await listen(server); await closeServer(server); return port; };

async function privateProcess(argv, directory, label, owned) {
  owned.check();
  const started = performance.now(), chunks = [[], []];
  const child = spawn(argv[0], argv.slice(1), { cwd: directory, env: cleanEnv(directory), stdio: ["ignore", "pipe", "pipe"] });
  owned.addChild(child);
  let bytes = 0, overflow = false;
  for (const [index, stream] of [child.stdout, child.stderr].entries()) stream.on("data", chunk => {
    bytes += chunk.length;
    if (bytes <= 1024 * 1024) chunks[index].push(chunk);
    else { overflow = true; child.kill("SIGKILL"); }
  });
  const timer = setTimeout(() => child.kill("SIGKILL"), 30_000);
  const ended = await new Promise((resolve, reject) => { child.once("error", reject); child.once("close", (code, signal) => resolve({ code, signal })); }).finally(() => clearTimeout(timer));
  const output = chunks.map(parts => Buffer.concat(parts));
  await Promise.all(output.map((data, index) => writeFile(join(directory, `${label}.${index ? "stderr" : "stdout"}.log`), data, { mode: 0o600, flag: "wx" })));
  owned.check();
  must(!overflow && ended.code === 0 && ended.signal === null, `${label} process failed; private logs retained`);
  return { stdout: output[0], receipt: { exit: ended.code, signal: ended.signal, wallSeconds: (performance.now() - started) / 1000, stdoutSha256: digest(output[0]), stderrSha256: digest(output[1]) } };
}

async function run() {
  const binary = process.env.CELLD_BIN;
  must(binary && resolve(binary) === binary && (await stat(binary)).isFile(), "CELLD_BIN must name the explicit reviewed executable");
  const versionPin = await readFile(join(ROOT, "apps/room/celld/celld.version"), "utf8");
  const expectedVersion = celldVersionOf(versionPin);
  const directory = await mkdtemp(join(tmpdir(), "artroom-celld-proxy-"));
  const observation = proxyFailureObservation();
  const note = (key, value) => { if (observation.active()) observation.note(key, value); };
  await chmod(directory, 0o700); await mkdir(join(directory, "home"), { mode: 0o700 });
  const exchanges = new Set(), children = new Set(), childClosures = new Map();
  let interrupted = false, forceTimer = null, networkClosed = true;
  const owned = {
    check: () => must(!interrupted, "TEST run interrupted; private custody retained"),
    addChild(child) {
      children.add(child);
      childClosures.set(child, new Promise(resolve => child.once("close", () => { children.delete(child); resolve(); })));
      if (interrupted) child.kill("SIGTERM");
    },
  };
  const abandon = signal => {
    if (interrupted) return;
    interrupted = true; failureMetadata.signal = signal;
    note("clientStop", "owned-interruption");
    for (const exchange of exchanges) exchange.destroy();
    for (const child of children) child.kill("SIGTERM");
    forceTimer = setTimeout(() => { for (const child of children) child.kill("SIGKILL"); }, 5000);
  };
  const interrupt = () => abandon("SIGINT"), terminate = () => abandon("SIGTERM");
  // Install each owned handler once. Keep it through closure so a second
  // cancellation cannot restore the default exit while children are live.
  process.on("SIGINT", interrupt); process.on("SIGTERM", terminate);
  try {
  failureMetadata.stage = "version";
  const version = await privateProcess([binary, "--version"], directory, "version", owned);
  must(matchesCelldVersion(versionPin, version.stdout.toString("utf8")), "CELLD_BIN does not match the reviewed pin");
  failureMetadata.stage = "certificate";
  await privateProcess(["openssl", "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "1", "-subj", "/CN=artroom TEST local proxy",
    "-addext", "subjectAltName=IP:127.0.0.1", "-keyout", join(directory, "proxy.key"), "-out", join(directory, "proxy.crt")], directory, "certificate", owned);
  await chmod(join(directory, "proxy.key"), 0o600);
  const ca = await readFile(join(directory, "proxy.crt")), key = await readFile(join(directory, "proxy.key"));
  const backendPort = await unusedPort(), counters = { requests: 0, forwarded: 0, backendErrors: 0 };
  owned.check(); failureMetadata.stage = "proxy-setup";
  const configuration = JSON.parse(await readFile(join(ROOT, "apps/room/celld/wrangler.json"), "utf8"));
  must(configuration.name === "dap-celld-local", "Maintain celld script identity");
  const productionEntry = join(ROOT, "apps/room/worker.ts");
  const shim = `export * from ${JSON.stringify(productionEntry)};\nexport { default } from ${JSON.stringify(productionEntry)};\n`;
  await writeFile(join(directory, "worker.ts"), shim, { mode: 0o600, flag: "wx" });
  configuration.main = "worker.ts";
  const home = join(directory, "custody");
  const sessionSecret = randomBytes(32).toString("base64url");
  await writeFile(join(directory, ".dev.vars"), `SESSION_SECRET=${sessionSecret}\n`, { mode: 0o600, flag: "wx" });
  const proxy = createTlsServer({ key, cert: ca }, (request, response) => {
    const rejected = interrupted ? "interrupted" : ++counters.requests > 4096 ? "request-budget"
      : !request.url?.startsWith("/") || request.url.startsWith("//") ? "invalid-request-target" : null;
    if (rejected) { note("proxyDecision", rejected); observation.fault("proxy-admission"); response.writeHead(503); response.end(); return; }
    note("proxyDecision", "forwarded");
    // This explicit TEST proxy supplies the actual local transport address.
    // Host is deliberately different from PUBLIC_ORIGIN. Forwarded identity
    // headers travel unchanged and remain untrusted by the Worker.
    let upstream;
    try { upstream = httpRequest({ host: "127.0.0.1", port: backendPort, path: request.url, method: request.method,
      headers: { ...request.headers, host: "different-host.example", "cf-connecting-ip": "127.0.0.1" } }, incoming => {
      note("upstreamPhase", "response-headers"); note("upstreamStatus", celldSmokeStatusClass(incoming.statusCode));
      incoming.once("end", () => { note("upstreamPhase", "response-complete"); note("upstreamEnd", "complete"); });
      incoming.once("error", error => { note("upstreamEnd", "error"); observation.fault("upstream-response-stream", error); });
      incoming.once("aborted", () => { note("upstreamEnd", "aborted"); observation.fault("upstream-response-stream"); });
      counters.forwarded++;
      try { response.writeHead(incoming.statusCode ?? 502, incoming.headers); }
      catch (error) { observation.fault("proxy-response-headers", error); incoming.destroy(); if (!response.headersSent) response.writeHead(502); response.end(); return; }
      void pipeline(incoming, response).catch(error => { observation.fault("relay-unclassified", error); response.destroy(); });
    }); } catch (error) {
      observation.fault("proxy-request-construction", error); response.writeHead(502); response.end(); return;
    }
    note("upstreamPhase", "request-created");
    upstream.once("finish", () => note("upstreamPhase", "request-ended"));
    exchanges.add(upstream); upstream.once("close", () => exchanges.delete(upstream));
    upstream.setTimeout(30_000, () => upstream.destroy());
    upstream.on("error", error => { observation.fault("upstream-request", error); counters.backendErrors++; if (!response.headersSent) response.writeHead(502); response.end(); });
    request.on("error", error => observation.fault("proxy-request-stream", error));
    request.on("aborted", () => { observation.fault("proxy-request-stream"); upstream.destroy(); });
    response.on("error", error => { note("downstreamEnd", "error"); observation.fault("downstream-response", error); });
    response.on("finish", () => note("downstreamEnd", "finished"));
    response.on("close", () => { if (!response.writableFinished) note("downstreamEnd", "closed-before-finish"); upstream.destroy(); });
    void pipeline(request, upstream).catch(error => { observation.fault("proxy-request-stream", error); upstream.destroy(); });
  });
  proxy.maxConnections = 32;
  let proxyPort = 0, base = "";
  // Per-client generated trust only. Nothing changes NODE_EXTRA_CA_CERTS,
  // system trust, rejectUnauthorized, or a user's configuration.
  const transport = async (input, init) => {
    const tracked = failureMetadata.stage === "smoke" && init?.method === "POST" && input === base + "/v1/scopes" && observation.arm();
    const step = value => { if (tracked) note("clientPhase", value); };
    const fault = (site, error) => { if (tracked) observation.fault(site, error); };
    step("request-construction");
    let request, url, body;
    try {
    owned.check();
    request = new Request(input, init); url = new URL(request.url);
    must(url.origin === base && !url.username && !url.password, "TEST transport refuses another origin");
    step("request-buffer");
    body = request.body ? Buffer.from(await request.arrayBuffer()) : null;
    owned.check();
    must(body === null || body.length <= 1024 * 1024, "TEST request body bound exceeded");
    } catch (error) { fault("client-request", error); throw error; }
    return new Promise((resolve, reject) => {
      let outbound;
      step("tls-request-construction");
      try { outbound = httpsRequest(url, { method: request.method, headers: Object.fromEntries(request.headers), ca, rejectUnauthorized: true }, incoming => {
        let site = "client-response-headers";
        try {
        step("response-headers");
        if (tracked) note("clientStatus", celldSmokeStatusClass(incoming.statusCode));
        const headers = new Headers();
        for (const [name, value] of Object.entries(incoming.headers)) for (const part of Array.isArray(value) ? value : value === undefined ? [] : [value]) headers.append(name, part);
        const noBody = request.method === "HEAD" || [204, 205, 304].includes(incoming.statusCode);
        if (noBody) incoming.resume();
        site = "client-response-body-adapter"; step("response-body-adapter");
        const source = noBody ? null : Readable.toWeb(incoming);
        let reader, cancelled = false;
        const stream = source && tracked ? new ReadableStream({
          async pull(controller) {
            step("response-stream");
            try {
              reader ??= source.getReader();
              const result = await reader.read();
              if (cancelled) return;
              if (result.done) { note("clientBodyEnd", "complete"); step("response-complete"); controller.close(); }
              else controller.enqueue(result.value);
            } catch (error) { if (!cancelled) { note("clientBodyEnd", "error"); fault("client-response-stream", error); controller.error(error); } }
          },
          async cancel(reason) {
            cancelled = true; note("clientBodyEnd", "cancelled");
            try { reader ??= source.getReader(); await reader.cancel(reason); }
            catch (error) { fault("client-response-stream", error); throw error; }
          },
        }) : source;
        site = "client-response-construction"; step("response-construction");
        const response = new Response(stream, { status: incoming.statusCode, headers });
        if (noBody && tracked) { note("clientBodyEnd", "complete"); step("response-complete"); }
        resolve(response);
        } catch (error) { fault(site, error); incoming.destroy(); reject(error); }
      }); } catch (error) { fault("client-tls-request", error); reject(error); return; }
      step("tls-await-headers");
      exchanges.add(outbound);
      const abort = () => { if (tracked) note("clientStop", interrupted ? "owned-interruption" : "unclassified-abort"); outbound.destroy(new Error("TEST exchange aborted")); };
      request.signal.addEventListener("abort", abort, { once: true });
      outbound.setTimeout(30_000, () => { abort(); if (tracked) note("clientStop", "deadline"); });
      outbound.once("error", error => { fault("client-tls-exchange", error); reject(error); });
      outbound.once("close", () => { exchanges.delete(outbound); request.signal.removeEventListener("abort", abort); });
      try { if (request.signal.aborted) abort(); else outbound.end(body); }
      catch (error) { fault("client-tls-request", error); outbound.destroy(); reject(error); }
    });
  };
  const readJson = async response => {
    const chunks = []; let bytes = 0;
    if (response.body) for await (const chunk of response.body) { bytes += chunk.length; must(bytes <= MAX_REPLY, "TEST reply bound exceeded"); chunks.push(chunk); }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  };
  let backend = null, serial = 0;
  const processReceipts = [];
  const stop = async () => {
    if (!backend) return;
    const current = backend; backend = null;
    current.child.kill("SIGTERM");
    let terminal;
    try { terminal = await boundedJoin(current.ended, 5000, "celld stop timeout"); }
    catch { current.child.kill("SIGKILL"); terminal = await boundedJoin(current.ended, 5000, "celld forced close timeout; ownership retained"); }
    const streams = await boundedJoin(current.logs, 5000, "celld log close timeout; ownership retained");
    children.delete(current.child);
    processReceipts.push({ argv: current.argv, cwd: directory, configurationSha256: current.configurationSha256,
      configuredPublicOrigin: current.configured, exit: terminal.exit, signal: terminal.signal,
      wallSeconds: (performance.now() - current.started) / 1000, streams });
  };
  const start = async (register, configured) => {
    owned.check(); failureMetadata.stage = configured ? "configured-server" : "unset-server";
    configuration.vars = { ...configuration.vars, REGISTER_SCOPE: register, MCP_ENABLED: "true", MCP_TOOL_ADDITIONS: "[]" };
    if (configured) configuration.vars.PUBLIC_ORIGIN = base; else delete configuration.vars.PUBLIC_ORIGIN;
    const configBytes = JSON.stringify(configuration, null, 2) + "\n";
    await writeFile(join(directory, "wrangler.json"), configBytes, { mode: 0o600 });
    owned.check();
    const argv = [binary, "dev", directory, "--port", String(backendPort), "--logs", "--no-watch"], started = performance.now();
    const child = spawn(argv[0], argv.slice(1), { cwd: directory, env: cleanEnv(directory), stdio: ["ignore", "pipe", "pipe"] });
    owned.addChild(child);
    const ended = new Promise((resolve, reject) => { child.once("error", reject); child.once("close", (exit, signal) => resolve({ exit, signal })); });
    void ended.catch(() => {});
    const number = ++serial;
    const tails = { stdout: backendTail(), stderr: backendTail() };
    const pipes = [child.stdout, child.stderr];
    let collectorFailed = false, collectorFailure;
    const logs = Promise.allSettled(pipes.map(async (stream, index) => {
      try {
      const parts = []; let bytes = 0;
      const tail = index ? tails.stderr : tails.stdout;
      for await (const chunk of stream) { tail.add(chunk); bytes += chunk.length; if (bytes <= 16 * 1024 * 1024) parts.push(chunk); else child.kill("SIGKILL"); }
      if (stream.readableEnded) tail.end();
      const retained = Buffer.concat(parts), path = `celld-${number}.${index ? "stderr" : "stdout"}.log`;
      await writeFile(join(directory, path), retained, { mode: 0o600, flag: "wx" });
      must(bytes <= 16 * 1024 * 1024, "celld log bound exceeded; private logs retained");
      return { path, bytes: retained.length, sha256: digest(retained) };
      } catch (error) {
        if (!collectorFailed) { collectorFailed = true; collectorFailure = error; }
        // Reuse the raw-overflow abort: stop the owned child and close both
        // readers so a peer without EOF cannot hold the settlement join.
        // Existing stop/forced-close deadlines still own child termination.
        child.kill("SIGKILL");
        for (const pipe of pipes) pipe.destroy();
        throw error;
      }
    })).then(async settled => {
      try {
        await writeFile(join(directory, `celld-${number}.tail.json`), JSON.stringify({ stdout: tails.stdout.snapshot(), stderr: tails.stderr.snapshot() }) + "\n", { mode: 0o600, flag: "wx" });
      } catch (error) { if (!collectorFailed) throw error; }
      // Preserve the first collector failure even if saving the tail fails.
      if (collectorFailed) throw collectorFailure;
      return settled.map(result => result.value);
    });
    void logs.catch(() => {});
    backend = { child, ended, logs, tails, argv, started, configured, configurationSha256: digest(configBytes) };
    // Bounded startup polling observes actual readiness JSON. An absent
    // Register may honestly return503 before the planned install; success
    // later requires the smoke's actual ready200, never this startup poll.
    for (let round = 0; round < 150; round++) {
      owned.check();
      must(child.exitCode === null && child.signalCode === null, "celld exited during startup; private logs retained");
      try { const response = await transport(base + "/health"); const body = await readJson(response); if ([200, 503].includes(response.status) && ["ok", "unavailable"].includes(body.sessions)) {
        observation.note("startupHealth", response.status === 200 ? "http-200" : "http-503"); observation.note("startupSessions", body.sessions); return;
      } } catch { /* Not accepting yet. */ }
      await delay(100);
    }
    throw Error("celld startup bound exceeded; private logs retained");
  };
  let client = null, operatorSecret = null, backendForFailure = null;
  try {
    owned.check(); proxyPort = await listen(proxy); networkClosed = false; base = `https://127.0.0.1:${proxyPort}`;
    owned.check(); failureMetadata.stage = "plan";
    const plan = await runCelldSmoke({ phase: "plan", base, home, fetch: transport });
    await start(plan.register, true);
    owned.check(); failureMetadata.stage = "smoke";
    const smoke = await runCelldSmoke({ phase: "run", base, home, fetch: transport });
    owned.check(); failureMetadata.stage = "hosted-setup";
    const context = await contextForCelldSmoke({ base, home, fetch: transport });
    const cliRequire = createRequire(join(ROOT, "packages/cli/package.json"));
    const { tsImport } = await import(pathToFileURL(cliRequire.resolve("tsx/esm/api")).href);
    const load = path => tsImport(pathToFileURL(join(ROOT, path)).href, import.meta.url);
    const [{ issueInvitation }, bytes, { MODERN }] = await Promise.all([load("packages/cli/src/invitations.ts"), load("packages/bytes/src/index.ts"), load("packages/mcp/src/index.ts")]);
    const mcpRequire = createRequire(join(ROOT, "packages/mcp/package.json"));
    const { Client, StreamableHTTPClientTransport } = await import(pathToFileURL(mcpRequire.resolve("@modelcontextprotocol/client")).href);
    const config = await context.store.config(), secret = await context.store.secret(config.key);
    must(secret && config.repository && config.handle === "@owner", "Actual owned smoke admin custody required");
    operatorSecret = secret;
    const membership = config.repository.membership;
    const fresh = async label => {
      owned.check();
      const operation = randomUUID(), privateRequests = [];
      // Capture the complete original opaque snapshot chain as the real
      // store publishes it. Checks use these exact names, operation and
      // input; they never prepare replacement acts or use mode:continue.
      const issuanceContext = { ...context, store: { ...context.store, keepPrivate: async (name, value) => {
        must(/^i-[0-9a-f]{30}$/.test(name) && privateRequests.length < 16 && !privateRequests.includes(name), "Unexpected owned invitation snapshot");
        await context.store.keepPrivate(name, value);
        privateRequests.push(name);
      } } };
      const input = { kind: "agent-key", handle: `@proxy-${label}`, hours: 1, controller: { membership, member: "@owner" } };
      const options = { privateRequests, mode: "new", operation, current: () => !interrupted };
      let result = await issueInvitation(issuanceContext, input, options), checks = 0;
      const describe = () => {
        const states = ["prepared", "unknown", "refused", "verified"];
        const reasons = new Map([
          ["The current native invitation could not be verified.", "invitation-not-verifiable"],
          ["The native directory and repository siblings could not be verified.", "repository-not-verifiable"],
          ["The native agent inbox creation could not be verified.", "inbox-not-verifiable"],
          ["The original agent opening is retained.", "member-outcome-unknown"],
          ["The original invitation is retained.", "invitation-outcome-unknown"],
        ]);
        failureMetadata.lastInvitation = { state: states.includes(result.state) ? result.state : "invalid-result", checks,
          reason: reasons.get(result.reason) ?? null, inboxNotVerifiable: result.reason === "The native agent inbox creation could not be verified.", snapshotCount: privateRequests.length };
      };
      describe();
      // An accepted member act does not promise that its separate Inbox
      // create/result/confirm handshake has finished. Bounded explicit
      // Checks read the original facts and child; they submit no new act.
      const until = performance.now() + 10_000;
      while (result.state === "unknown" && checks < 8 && performance.now() < until) {
        owned.check();
        await delay(100);
        owned.check(); checks++;
        result = await issueInvitation(issuanceContext, input, { ...options, mode: "check", privateRequests: [...privateRequests] });
        describe();
      }
      must(result.state === "verified" && typeof result.link === "string", "Actual fresh agent invitation required");
      const body = JSON.stringify({ link: result.link }); // Private verified handoff, never output.
      const held = await context.store.config();
      must(held?.invitationIssue?.operation === operation && held.invitationIssue.request === privateRequests.at(-1), "Owned verified invitation pointer changed");
      // Same finished-pointer release as invitePerson.finish. Every opaque
      // original snapshot stays in Store.private for exact later inspection.
      const { invitationIssue: _finished, ...released } = held;
      owned.check(); await context.store.save(released);
      must(bytes.canonicalize(await context.store.config()) === bytes.canonicalize(released), "Owned invitation release did not persist");
      return body;
    };
    const control = async (action, agent, body, service = base, headers = {}) => {
      owned.check();
      const request = { v: 1, action, service, membership, agent, actor: bytes.keyIdOfSecret(secret), body: bytes.digestBytes(bytes.utf8(body)), op: randomUUID(), notAfter: bytes.timeOf(Date.now() + 60_000) };
      const signed = bytes.signControl(request, secret);
      const path = action === "create" ? "/mcp/agents" : `/mcp/agents/${agent}${action === "bearer" ? "/bearer" : ""}`;
      const response = await transport(base + path, { method: action === "retire" ? "DELETE" : "POST", headers: { "content-type": "application/json", ...headers, authorization: `Control ${bytes.b64url(bytes.utf8(bytes.canonicalize(request)))}.${signed.sig}` }, body });
      failureMetadata.lastControl = { status: response.status, error: null, rule: null, jsonParsed: false };
      const value = await readJson(response);
      // A closed diagnostic vocabulary exposes no body, bearer or invitation.
      const known = ["agent", "archived", "control", "custody", "enrol", "enrolling", "full", "link", "op", "rate-limited", "refused", "retired", "unauthorized", "unresolved", "bad-request", "forbidden", "method-not-allowed", "not-found", "too-large", "unavailable", "agent-key-invitation", "binding", "body", "control-budget", "entry", "fingerprint", "key-not-active", "membership", "notAfter", "read-back", "service", "signature", "stale", "header"];
      failureMetadata.lastControl = { status: response.status, error: known.includes(value?.error) ? value.error : null, rule: known.includes(value?.rule) ? value.rule : null, jsonParsed: true };
      return { status: response.status, value };
    };
    failureMetadata.stage = "configured-create";
    const configured = await control("create", null, await fresh("configured"));
    must(configured.status === 201 && typeof configured.value.bearer === "string", "Actual configured public-origin create must201");
    const connect = async bearer => {
      owned.check(); failureMetadata.stage = "mcp-session";
      client = new Client({ name: "celld-public-origin", version: "1" }, { versionNegotiation: { mode: { pin: MODERN } } });
      await client.connect(new StreamableHTTPClientTransport(new URL(base + "/mcp"), { fetch: transport, requestInit: { headers: { authorization: `Bearer ${bearer}` } } }));
      must((await client.listTools()).tools.some(tool => tool.name === "room"), "Actual initialized MCP session must list room");
      must((await client.callTool({ name: "room", arguments: {} })).isError !== true, "Actual room tool must succeed");
      await client.close(); client = null;
    };
    await connect(configured.value.bearer);
    failureMetadata.stage = "wrong-service";
    const wrong = await control("create", null, await fresh("wrong-service"), "https://different-service.example");
    assert.deepEqual(wrong, { status: 403, value: { error: "control", rule: "service" } });
    failureMetadata.stage = "rotation";
    const rotated = await control("bearer", configured.value.agent, "");
    must(rotated.status === 200 && typeof rotated.value.bearer === "string", "Actual bearer rotation must succeed");
    await connect(rotated.value.bearer);
    failureMetadata.stage = "retirement";
    const retired = await control("retire", configured.value.agent, "");
    must(retired.status === 202 && retired.value.pending === true && retired.value.retired === false
      && retired.value.endpointDisabled === true && retired.value.seedErased === true && retired.value.reason === "revoke-required",
    "Empty-body retirement must disable the endpoint, erase its seed and await a recorded revoke");
    const retiredBearer = await transport(base + "/mcp", { method: "GET", headers: { authorization: `Bearer ${rotated.value.bearer}`, "mcp-protocol-version": MODERN } });
    must(retiredBearer.status === 401, "The retired endpoint must refuse its former bearer");
    await retiredBearer.body?.cancel();
    await stop(); await start(plan.register, false);
    failureMetadata.stage = "unset-control";
    const unset = await control("create", null, await fresh("unset"));
    assert.deepEqual(unset, { status: 403, value: { error: "control", rule: "service" } });
    failureMetadata.stage = "forwarded-control";
    const forwarded = await control("create", null, await fresh("forwarded"), base, { forwarded: `host="127.0.0.1:${proxyPort}";proto=https`, "x-forwarded-host": `127.0.0.1:${proxyPort}`, "x-forwarded-proto": "https" });
    assert.deepEqual(forwarded, { status: 403, value: { error: "control", rule: "service" } });
    secret.fill(0);
    owned.check();
    return { version: 1, qualification: "Actual generated-CA TLS client/proxy/celld and real Worker/Native/registry/agent; private owned TEST custody. No deployed proxy, production TLS profile, supervisor or global trust claim.",
      celld: { pin: expectedVersion, binarySha256: digest(await readFile(binary)), versionReceipt: version.receipt, shim: { sha256: digest(shim), productionEntry } },
      smoke, controls: { configuredCreate: configured.status, unsetCreate: unset.status, forwardedOnlyCreate: forwarded.status, wrongServiceCreate: wrong.status, hostDifferent: true, initializedSessions: 2, roomToolCalls: 2, rotation: rotated.status, retirement: retired.status, retirementPending: retired.value.pending, retiredBearer: retiredBearer.status }, proxy: counters, processReceipts };
  } catch (error) {
    if (celldSmokeOperation(error) === "install") {
      failureMetadata.exchange = observation.snapshot(proxy.listening ? "listening" : "closed",
        !backend ? "not-started" : backend.child.exitCode === null && backend.child.signalCode === null ? "running" : "exited", celldSmokeTransport(error));
      if (failureMetadata.exchange.owner === "celldbackend") {
        backendForFailure = backend;
        failureMetadata.backendOutput = backendOutputFor("celldbackend", backend?.tails ?? { stdout: backendTail(), stderr: backendTail() });
      }
    }
    throw error;
  } finally {
    let closeFailed = false;
    for (const close of [
      async () => { if (client) await boundedJoin(client.close(), 5000, "TEST MCP client did not close"); },
      () => boundedJoin(Promise.all([...exchanges].map(exchange => new Promise(resolve => { exchange.once("close", resolve); exchange.destroy(); }))), 5000, "TEST exchanges did not close"),
      stop,
      async () => { if (!networkClosed) { await boundedJoin(closeServer(proxy), 5000, "TEST TLS proxy did not close"); networkClosed = true; } },
    ]) { try { await close(); } catch { closeFailed = true; } }
    if (backendForFailure) failureMetadata.backendOutput = backendOutputFor(failureMetadata.exchange.owner, backendForFailure.tails);
    operatorSecret?.fill(0);
    must(!closeFailed, "Owned closure failed; private TEST state retained");
    must(children.size === 0 && exchanges.size === 0, "Owned process/transport closure incomplete; private scratch retained");
    owned.check();
    // Keep the private owned store/logs for exact failed-operation inspection;
    // this driver never copies them into public evidence or retries the smoke.
  }
  } finally {
    // Covers early version/certificate failures too. All children and sockets
    // here belong to this one driver, never a user's existing service.
    for (const exchange of exchanges) exchange.destroy();
    for (const child of children) child.kill("SIGTERM");
    try { await boundedJoin(Promise.all([...children].map(child => childClosures.get(child))), 5000, "Owned child close timeout"); }
    catch { for (const child of children) child.kill("SIGKILL"); await boundedJoin(Promise.all([...children].map(child => childClosures.get(child))), 5000, "Owned forced close timeout"); }
    if (children.size === 0 && exchanges.size === 0 && networkClosed) {
      clearTimeout(forceTimer);
      process.removeListener("SIGINT", interrupt); process.removeListener("SIGTERM", terminate);
    }
    owned.check();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const failed = error => {
    process.stderr.write(JSON.stringify({ error: "celld-proxy-witness-failed", ...failureMetadata, operation: celldSmokeOperation(error), detail: celldSmokeDetail(error), transport: celldSmokeTransport(error), qualification: "Private TEST state retained; no automatic operation retry." }) + "\n");
    process.exitCode = 1;
  };
  run().then(result => { if (failureMetadata.signal !== null) failed(); else process.stdout.write(JSON.stringify(result) + "\n"); }, failed);
}
