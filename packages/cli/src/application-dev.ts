/** Loopback-only trusted-author development. Native state is in-memory SQLite;
 * actors/read access are explicit TEST fixtures, never room enrollment. */
import type { AnyPackedApplication } from "@generalbusiness/dap-bytes/application-v2";
import { watch, type FSWatcher } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { resolve } from "node:path";
import type { Answer, Beside, Read, ReadRefusal, RetainedInput } from "@generalbusiness/dap-contract";
import { canonicalize, isDigest, isRecord, isSignedIntentShape, parseStrictBytes, timeOf } from "@generalbusiness/dap-bytes";
import { secretSigner } from "@generalbusiness/dap-client";
import { prepareApplicationDirectory, readApplicationScenario } from "./application-files.ts";
import { openApplicationScenario, type ApplicationDevelopmentSession } from "./application-scenarios.ts";
import { parse } from "./line.ts";

export const DEV_USAGE = "dap dev [<directory>] [--config <relative-file>] [--port <loopback-port>] [--scenario <listed-file>]";
/** The long-lived Node command owns its output and closes on either signal. */
export async function runApplicationDevelopment(argv: readonly string[], cwd = process.cwd()): Promise<number> {
  const args = parse(argv), portText = args?.flags.get("port")?.[0];
  if (!args || args.words[0] !== "dev" || args.words.length > 2 || [...args.flags].some(([key, values]) => !["port", "scenario", "config"].includes(key) || values.length !== 1 || (values[0] === "" || values[0]!.startsWith("--"))) || portText !== undefined && (!/^(?:0|[1-9][0-9]{0,4})$/.test(portText) || Number(portText) > 65535)) {
    process.stderr.write(DEV_USAGE + "\n"); return 2;
  }
  let server: ApplicationDevelopmentServer;
  try { server = await startApplicationDevelopment(resolve(cwd, args.words[1] ?? "."), { ...(args.flags.has("config") ? { config: args.flags.get("config")![0]! } : {}), ...(portText === undefined ? {} : { port: Number(portText) }), ...(args.flags.has("scenario") ? { scenario: args.flags.get("scenario")![0]! } : {}) }); }
  catch { process.stderr.write("The local development host could not start. Check package sources, the listed scenario and loopback port.\n"); return 1; }
  let stop = () => {};
  const stopped = new Promise<void>(resolve => { stop = resolve; });
  process.once("SIGINT", stop); process.once("SIGTERM", stop);
  process.stdout.write(`Development host: ${server.origin}/__dap/\nApplication preview: ${server.origin}/\nAuthority: explicit public TEST actors and open fixture reads. State is in memory.\nClock: starts at the scenario's final time and advances with requests.\n`);
  try { await stopped; }
  finally { process.off("SIGINT", stop); process.off("SIGTERM", stop); await server.close(); }
  process.stdout.write("Development host closed.\n"); return 0;
}

const BODY_BYTES = 1024 * 1024;
const READ_STATUS: Record<ReadRefusal, number> = { archived: 410, "not-found": 404, "wrong-incarnation": 409, forbidden: 403, "scope-provisional": 409,
  "unsupported-definition": 501, "history-unavailable": 503, "too-large": 413, unavailable: 503, "sessions-unavailable": 503, "clock-behind": 503, "rate-limited": 429 };
const RELOAD = 'const source=new EventSource("/__dap/events");const status=document.createElement("aside");status.textContent="Local TEST preview; no room installation";status.style.cssText="position:fixed;bottom:0;left:0;right:0;padding:.4rem;background:#fff5cc;color:#222;font:12px system-ui;z-index:2147483647";document.body.append(status);source.onopen=()=>{status.textContent="Local TEST preview; live reload connected";};source.onerror=()=>{status.textContent="Live reload disconnected; local TEST preview retained";};source.onmessage=event=>{const data=JSON.parse(event.data);if(data.type==="reload")location.replace(data.preview);if(data.type==="error")status.textContent="Build failed; previous preview retained. Native writes are paused.";};';
const PANEL = '<!doctype html><html lang="en"><meta charset="utf-8"><title>Local application fixture</title><style>body{font:1rem system-ui;margin:2rem}pre{white-space:pre-wrap;overflow-wrap:anywhere}iframe{width:100%;height:32rem;border:1px solid #aaa}</style><h1>Local application fixture</h1><p>Explicit public TEST actors and open fixture reads. No room enrollment, provider calls or durable host state.</p><button id="read">Read state</button> <button id="replay">Replay</button><pre id="result"></pre><iframe title="Application preview" src="/"></iframe><script type="module">const result=document.querySelector("#result");const read=async()=>{const meta=await(await fetch("/__dap/meta")).json();const state=await(await fetch("/v1/scopes/"+encodeURIComponent(meta.scope.scope))).json();result.textContent=JSON.stringify({meta,state},null,2);};document.querySelector("#read").onclick=read;document.querySelector("#replay").onclick=async()=>{result.textContent=JSON.stringify(await(await fetch("/__dap/replay")).json(),null,2);};void read();</script></html>';
const previewPath = (packet: AnyPackedApplication): string => "/" + packet.package.presentation.entry.split("/").map(encodeURIComponent).join("/");
interface Loaded { packet: AnyPackedApplication; session: ApplicationDevelopmentSession; scenario: string; scenarioBytes: string; logical: number; wall: number }
export interface ApplicationDevelopmentServer {
  readonly origin: string;
  /** A deterministic rebuild hook for tools/tests; the CLI watches by default. */
  rebuild(): Promise<void>;
  close(): Promise<void>;
}
export async function startApplicationDevelopment(directory: string, options: { config?: string; port?: number; scenario?: string; watch?: boolean } = {}): Promise<ApplicationDevelopmentServer> {
  const port = options.port ?? 5173;
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error("Choose a valid loopback port.");
  let loaded: Loaded | undefined, origin = "", closed = false, error: string | null = null, revision = 0;
  let queue: Promise<unknown> = Promise.resolve(), watcher: FSWatcher | undefined, timer: ReturnType<typeof setTimeout> | undefined;
  const clients = new Set<ServerResponse>();
  const owned = <T>(work: () => Promise<T>): Promise<T> => { const next = queue.then(work, work); queue = next.then(() => {}, () => {}); return next; };
  const announce = (type: string, reset = false) => { const data = `data: ${JSON.stringify({ type, revision, reset, preview: loaded ? previewPath(loaded.packet) : null })}\n\n`; for (const client of clients) client.write(data); };
  async function rebuild(): Promise<void> {
    if (closed) return;
    try {
      const prepared = await prepareApplicationDirectory(directory, secretSigner(new Uint8Array(32).fill(254)), options);
      const scenario = options.scenario ?? prepared.scenarios[0];
      if (!scenario || !prepared.scenarios.includes(scenario)) throw new Error("Select a listed local scenario.");
      const input = await readApplicationScenario(prepared.root, scenario), bytes = canonicalize(input);
      const reset = !loaded || loaded.packet.ids.semantic !== prepared.packet.ids.semantic || loaded.scenario !== scenario || loaded.scenarioBytes !== bytes;
      if (reset) {
        const session = await openApplicationScenario(prepared.packet, input);
        const previous = loaded;
        loaded = { packet: prepared.packet, session, scenario, scenarioBytes: bytes, logical: Date.parse(session.time), wall: Date.now() };
        previous?.session.scope.close();
      } else loaded!.packet = prepared.packet;
      error = null; revision++; announce("reload", reset);
    } catch (cause) {
      error = cause instanceof Error ? cause.message.slice(0, 500) : "The local application could not be rebuilt.";
      announce("error");
      if (!loaded) throw cause;
    }
  }
  await owned(rebuild);
  function json(response: ServerResponse, status: number, value: unknown): void {
    response.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" }); response.end(JSON.stringify(value));
  }
  function read(response: ServerResponse, value: Read<unknown>): void { json(response, value.ok ? 200 : READ_STATUS[value.reason], value); }
  function answer(response: ServerResponse, value: Answer): void {
    json(response, value.answer === "archived" ? 410 : value.answer === "accepted" ? 200 : value.answer === "unavailable" ? 503 : value.answer === "mismatch" ? 409 : value.reason === "unauthorized" ? 403 : 422, value);
  }
  async function body(request: IncomingMessage): Promise<Record<string, unknown> | null> {
    if (Number(request.headers["content-length"] ?? 0) > BODY_BYTES || request.headers["content-type"]?.split(";")[0]?.trim() !== "application/json") return null;
    const chunks: Uint8Array[] = []; let bytes = 0;
    for await (const chunk of request) { const next = new Uint8Array(chunk); bytes += next.length; if (bytes > BODY_BYTES) return null; chunks.push(next); }
    try { const value = parseStrictBytes(Buffer.concat(chunks)); return isRecord(value) ? value : null; } catch { return null; }
  }
  async function handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
    if (closed) { json(response, 503, { error: "closed" }); return; }
    const url = new URL(request.url ?? "/", origin);
    if (request.headers.host !== new URL(origin).host || url.origin !== origin || request.headers.origin !== undefined && request.headers.origin !== origin) { json(response, 403, { error: "loopback-origin-required" }); return; }
    const live = loaded!;
    if (request.method === "GET" && url.pathname === "/__dap/events") {
      response.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-store" }); response.write(`data: ${JSON.stringify({ type: error ? "error" : "ready", revision })}\n\n`);
      clients.add(response); request.on("close", () => clients.delete(response)); return;
    }
    if (request.method === "GET" && url.pathname === "/__dap/live.js") { response.writeHead(200, { "content-type": "text/javascript; charset=utf-8", "cache-control": "no-store" }); response.end(RELOAD); return; }
    if (request.method === "GET" && url.pathname === "/__dap/") { response.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }); response.end(PANEL); return; }
    const now = Math.max(live.logical, Date.parse(live.session.time) + Math.max(0, Date.now() - live.wall));
    live.logical = now; await live.session.scope.advance(timeOf(now));
    if (request.method === "GET" && url.pathname === "/__dap/meta") { json(response, 200, { authority: "scripted-test-grants", reads: "open-local-fixture", persistence: "in-memory", ids: live.packet.ids, scope: live.session.scope.at, scenario: live.scenario,
      time: timeOf(now), actors: live.session.actors, revision, error }); return; }
    if (request.method === "GET" && url.pathname === "/__dap/replay") { json(response, 200, await live.session.scope.replay()); return; }
    const api = /^\/v1\/scopes\/([^/]+)(?:\/(.*))?$/.exec(url.pathname);
    if (api) {
      if (decodeURIComponent(api[1]!) !== live.session.scope.at.scope) { read(response, { ok: false, reason: "not-found" }); return; }
      const tail = (api[2] ?? "").split("/").map(decodeURIComponent), reads = live.session.scope.developmentReads(), cursor = url.searchParams.get("cursor") ?? undefined;
      if (request.method === "POST" && (tail[0] === "acts" || tail[0] === "settle") && tail.length === 1) {
        if (error && tail[0] === "acts") { json(response, 503, { error: "source-build-failed" }); return; }
        const given = await body(request), allowed = tail[0] === "settle" ? ["signed"] : ["signed", "grants", "texts", "presented", "values"];
        if (!given || Object.keys(given).some(key => !allowed.includes(key)) || !isSignedIntentShape(given["signed"]) || given["grants"] !== undefined && (!Array.isArray(given["grants"]) || given["grants"].length !== 0) || ["texts", "presented", "values"].some(key => Object.hasOwn(given, key) && !isRecord(given[key]))) { json(response, 400, { error: "invalid-local-native-request" }); return; }
        if (tail[0] === "settle") { read(response, live.session.scope.settle(given["signed"])); return; }
        const beside = Object.fromEntries(["texts", "presented", "values"].filter(key => Object.hasOwn(given, key)).map(key => [key, given[key]])) as Beside;
        answer(response, await live.session.scope.submit(given["signed"], beside)); return;
      }
      if (request.method === "GET") {
        if (tail.length === 1 && tail[0] === "") { read(response, reads.summary(null)); return; }
        if (tail.length === 1 && tail[0] === "history") { read(response, reads.history(null, cursor)); return; }
        if (tail.length === 2 && tail[0] === "items") { read(response, reads.items(null, tail[1]!, cursor)); return; }
        if (tail.length === 2 && tail[0] === "entries") { read(response, reads.entry(null, Number(tail[1]))); return; }
        if (tail.length === 3 && tail[0] === "retained" && isDigest(tail[2])) { read(response, reads.retained(null, tail[1] as RetainedInput["kind"], tail[2], url.searchParams.get("domain") ?? undefined)); return; }
      }
      json(response, 404, { error: "unsupported-local-route" }); return;
    }
    if (request.method !== "GET") { json(response, 405, { error: "method-not-allowed" }); return; }
    if (url.pathname === "/favicon.ico") { response.writeHead(204); response.end(); return; }
    if (url.pathname === "/") { response.writeHead(302, { location: previewPath(live.packet), "cache-control": "no-store" }); response.end(); return; }
    const path = decodeURIComponent(url.pathname.slice(1));
    const asset = live.packet.package.presentation.assets.find(asset => asset.path === path);
    if (!asset) { json(response, 404, { error: "not-found" }); return; }
    let bytes = Buffer.from(asset.bytes, "base64url");
    if (path === live.packet.package.presentation.entry) { const html = bytes.toString("utf8"), script = '<script type="module" src="/__dap/live.js"></script>'; bytes = Buffer.from(html.includes("</body>") ? html.replace("</body>", script + "</body>") : html + script); }
    response.writeHead(200, { "content-type": asset.mediaType, "cache-control": "no-store" }); response.end(bytes);
  }
  const server = createServer((request, response) => { void owned(() => handle(request, response)).catch(() => { if (!response.headersSent) json(response, 500, { error: "local-development-failure" }); else response.end(); }); });
  try {
    await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(port, "127.0.0.1", resolve); });
    const address = server.address(); if (!address || typeof address === "string") throw new Error("The loopback server has no port.");
    origin = `http://127.0.0.1:${address.port}`;
    if (options.watch !== false) watcher = watch(directory, { recursive: true }, (_event, path) => {
      if (path && path.toString().split(/[\\/]/).some(part => part === "node_modules" || part === ".git")) return;
      if (timer) clearTimeout(timer); timer = setTimeout(() => { void owned(rebuild).catch(() => {}); }, 75);
    });
  } catch (cause) { server.closeAllConnections(); server.close(); loaded?.session.scope.close(); throw cause; }
  let closing: Promise<void> | undefined;
  return { origin, rebuild: () => owned(rebuild), close() {
    return closing ??= (async () => { closed = true; watcher?.close(); if (timer) clearTimeout(timer); for (const client of clients) client.end(); clients.clear();
      const stopped = new Promise<void>((resolve, reject) => server.close(cause => cause ? reject(cause) : resolve())); server.closeAllConnections();
      await stopped; await queue; loaded?.session.scope.close();
    })();
  } };
}
