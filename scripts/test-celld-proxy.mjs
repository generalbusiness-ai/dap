#!/usr/bin/env node
/** Actual client -> temporary TLS proxy -> pinned celld -> unchanged Room
 * Worker. Generated CA/key/session secret and CLI custody are TEST-only,
 * owner-only scratch data. No global trust change or deployed proxy claim.
 * Run only after source review, with an explicit root-supplied CELLD_BIN.
 * Output is closed public metadata; child logs remain private, never echoed. */
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
import { contextForCelldSmoke, runCelldSmoke } from "./celld-smoke.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const failureMetadata = { stage: "preflight", scratch: null, signal: null };
const digest = bytes => createHash("sha256").update(bytes).digest("hex");
const MAX_REPLY = 4 * 1024 * 1024;
const must = (condition, label) => assert.ok(condition, label);
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
  const expectedVersion = (await readFile(join(ROOT, "apps/room/celld/celld.version"), "utf8")).trim();
  must(expectedVersion === "v0.6.2", "Unexpected maintained celld version pin");
  const directory = await mkdtemp(join(tmpdir(), "artroom-celld-proxy-"));
  failureMetadata.scratch = directory;
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
  must(/(?:^|\s)v?0\.6\.2(?:\s|$)/.test(version.stdout.toString("utf8")), "CELLD_BIN does not match the reviewed pin");
  failureMetadata.stage = "certificate";
  await privateProcess(["openssl", "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "1", "-subj", "/CN=artroom TEST local proxy",
    "-addext", "subjectAltName=IP:127.0.0.1", "-keyout", join(directory, "proxy.key"), "-out", join(directory, "proxy.crt")], directory, "certificate", owned);
  await chmod(join(directory, "proxy.key"), 0o600);
  const ca = await readFile(join(directory, "proxy.crt")), key = await readFile(join(directory, "proxy.key"));
  const backendPort = await unusedPort(), counters = { requests: 0, forwarded: 0, backendErrors: 0 };
  owned.check(); failureMetadata.stage = "proxy-setup";
  const configuration = JSON.parse(await readFile(join(ROOT, "apps/room/celld/wrangler.json"), "utf8"));
  must(configuration.name === "artroom-scope", "Maintain celld script identity");
  const productionEntry = join(ROOT, "apps/room/worker.ts");
  const shim = `export * from ${JSON.stringify(productionEntry)};\nexport { default } from ${JSON.stringify(productionEntry)};\n`;
  await writeFile(join(directory, "worker.ts"), shim, { mode: 0o600, flag: "wx" });
  configuration.main = "worker.ts";
  const home = join(directory, "custody");
  const sessionSecret = randomBytes(32).toString("base64url");
  await writeFile(join(directory, ".dev.vars"), `SESSION_SECRET=${sessionSecret}\n`, { mode: 0o600, flag: "wx" });
  const proxy = createTlsServer({ key, cert: ca }, (request, response) => {
    if (interrupted || ++counters.requests > 4096 || !request.url?.startsWith("/") || request.url.startsWith("//")) { response.writeHead(503); response.end(); return; }
    // This explicit TEST proxy supplies the actual local transport address.
    // Host is deliberately different from PUBLIC_ORIGIN. Forwarded identity
    // headers travel unchanged and remain untrusted by the Worker.
    const upstream = httpRequest({ host: "127.0.0.1", port: backendPort, path: request.url, method: request.method,
      headers: { ...request.headers, host: "different-host.example", "cf-connecting-ip": "127.0.0.1" } }, incoming => {
      counters.forwarded++; response.writeHead(incoming.statusCode ?? 502, incoming.headers);
      void pipeline(incoming, response).catch(() => response.destroy());
    });
    exchanges.add(upstream); upstream.once("close", () => exchanges.delete(upstream));
    upstream.setTimeout(30_000, () => upstream.destroy());
    upstream.on("error", () => { counters.backendErrors++; if (!response.headersSent) response.writeHead(502); response.end(); });
    request.on("aborted", () => upstream.destroy()); response.on("close", () => upstream.destroy());
    void pipeline(request, upstream).catch(() => upstream.destroy());
  });
  proxy.maxConnections = 32;
  let proxyPort = 0, base = "";
  // Per-client generated trust only. Nothing changes NODE_EXTRA_CA_CERTS,
  // system trust, rejectUnauthorized, or a user's configuration.
  const transport = async (input, init) => {
    owned.check();
    const request = new Request(input, init), url = new URL(request.url);
    must(url.origin === base && !url.username && !url.password, "TEST transport refuses another origin");
    const body = request.body ? Buffer.from(await request.arrayBuffer()) : null;
    owned.check();
    must(body === null || body.length <= 1024 * 1024, "TEST request body bound exceeded");
    return new Promise((resolve, reject) => {
      const outbound = httpsRequest(url, { method: request.method, headers: Object.fromEntries(request.headers), ca, rejectUnauthorized: true }, incoming => {
        const headers = new Headers();
        for (const [name, value] of Object.entries(incoming.headers)) for (const part of Array.isArray(value) ? value : value === undefined ? [] : [value]) headers.append(name, part);
        const noBody = request.method === "HEAD" || [204, 205, 304].includes(incoming.statusCode);
        if (noBody) incoming.resume();
        resolve(new Response(noBody ? null : Readable.toWeb(incoming), { status: incoming.statusCode, headers }));
      });
      exchanges.add(outbound);
      const abort = () => outbound.destroy(new Error("TEST exchange aborted"));
      request.signal.addEventListener("abort", abort, { once: true });
      outbound.setTimeout(30_000, abort);
      outbound.once("error", reject);
      outbound.once("close", () => { exchanges.delete(outbound); request.signal.removeEventListener("abort", abort); });
      if (request.signal.aborted) abort();
      else outbound.end(body);
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
    const logs = Promise.all([child.stdout, child.stderr].map(async (stream, index) => {
      const parts = []; let bytes = 0;
      for await (const chunk of stream) { bytes += chunk.length; if (bytes <= 16 * 1024 * 1024) parts.push(chunk); else child.kill("SIGKILL"); }
      const retained = Buffer.concat(parts), path = `celld-${number}.${index ? "stderr" : "stdout"}.log`;
      await writeFile(join(directory, path), retained, { mode: 0o600, flag: "wx" });
      must(bytes <= 16 * 1024 * 1024, "celld log bound exceeded; private logs retained");
      return { path, bytes: retained.length, sha256: digest(retained) };
    }));
    void logs.catch(() => {});
    backend = { child, ended, logs, argv, started, configured, configurationSha256: digest(configBytes) };
    // Bounded startup polling observes actual readiness JSON. An absent
    // Register may honestly return503 before the planned install; success
    // later requires the smoke's actual ready200, never this startup poll.
    for (let round = 0; round < 150; round++) {
      owned.check();
      must(child.exitCode === null && child.signalCode === null, "celld exited during startup; private logs retained");
      try { const response = await transport(base + "/health"); const body = await readJson(response); if ([200, 503].includes(response.status) && ["ok", "unavailable"].includes(body.sessions)) return; } catch { /* Not accepting yet. */ }
      await delay(100);
    }
    throw Error("celld startup bound exceeded; private logs retained");
  };
  let client = null, operatorSecret = null;
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
      const result = await issueInvitation(context, { kind: "agent-key", handle: `@proxy-${label}`, hours: 1, controller: { membership, member: "@owner" } }, { privateRequests: [], mode: "new", operation: randomUUID() });
      must(result.state === "verified" && typeof result.link === "string", "Actual fresh agent invitation required");
      return JSON.stringify({ link: result.link });
    };
    const control = async (action, agent, body, service = base, headers = {}) => {
      owned.check();
      const request = { v: 1, action, service, membership, agent, actor: bytes.keyIdOfSecret(secret), body: bytes.digestBytes(bytes.utf8(body)), op: randomUUID(), notAfter: bytes.timeOf(Date.now() + 60_000) };
      const signed = bytes.signControl(request, secret);
      const path = action === "create" ? "/mcp/agents" : `/mcp/agents/${agent}${action === "bearer" ? "/bearer" : ""}`;
      const response = await transport(base + path, { method: action === "retire" ? "DELETE" : "POST", headers: { "content-type": "application/json", ...headers, authorization: `Control ${bytes.b64url(bytes.utf8(bytes.canonicalize(request)))}.${signed.sig}` }, body });
      return { status: response.status, value: await readJson(response) };
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
    const retired = await control("retire", configured.value.agent, ""); must(retired.status === 200, "Actual retirement must succeed");
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
      smoke, controls: { configuredCreate: configured.status, unsetCreate: unset.status, forwardedOnlyCreate: forwarded.status, wrongServiceCreate: wrong.status, hostDifferent: true, initializedSessions: 2, roomToolCalls: 2, rotation: rotated.status, retirement: retired.status }, proxy: counters, processReceipts };
  } finally {
    let closeFailed = false;
    for (const close of [
      async () => { if (client) await boundedJoin(client.close(), 5000, "TEST MCP client did not close"); },
      () => boundedJoin(Promise.all([...exchanges].map(exchange => new Promise(resolve => { exchange.once("close", resolve); exchange.destroy(); }))), 5000, "TEST exchanges did not close"),
      stop,
      async () => { if (!networkClosed) { await boundedJoin(closeServer(proxy), 5000, "TEST TLS proxy did not close"); networkClosed = true; } },
    ]) { try { await close(); } catch { closeFailed = true; } }
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
  const failed = () => {
    process.stderr.write(JSON.stringify({ error: "celld-proxy-witness-failed", ...failureMetadata, qualification: "Private TEST state retained; no automatic operation retry." }) + "\n");
    process.exitCode = 1;
  };
  run().then(result => { if (failureMetadata.signal !== null) failed(); else process.stdout.write(JSON.stringify(result) + "\n"); }, failed);
}
