/**
 * The server under Node: the two transports and Client-owned custody on files.
 *
 * - **stdio** (`dap mcp`): one implicit connection. Each line is one
 *   JSON-RPC message. The first request says which revision the client
 *   speaks.
 * - **streamable HTTP on loopback** (`dap mcp --http 127.0.0.1:<port>`):
 *   a signing boundary, guarded as one. It binds a loopback address only;
 *   refuses any request that carries an `Origin` header, since no browser
 *   origin is a client of a signing server; requires a per-launch bearer,
 *   printed once to the launching host's standard error; and answers 401 or
 *   403 with no body detail.
 * - **custody on files** under `ARTROOM_HOME/private/mcp-custody/`, owner
 *   only: one file per record, an exclusive lock file per identity, a
 *   temporary write renamed into place and read back, a segment of outcomes
 *   per record with an index of line ends, and archive files with an index.
 *   Archival is one transaction under an archive lease: the archive file is
 *   written whole under a temporary name and renamed, then the index, and
 *   only then are the live records removed. Admission against the capacity
 *   runs under a capacity lease. A lease or a lock is broken only when the
 *   process that took it is gone.
 */

import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { join } from "node:path";
import { Readable } from "node:stream";
import type { Signer, Fetch } from "@generalbusiness/dap-client";
import { fileStore } from "@generalbusiness/dap-client/node";
// Temporary same-symbol compatibility exports; NF5 removes these after importer migration.
export { FILE_STORE_BOUNDS, releaseLock, blockedBy, takeLock, fileStore, type FileStoreBounds, type Holding } from "@generalbusiness/dap-client/node";
import type { ConfigPort } from "./inventory.ts";
import { diffWithCredential, fileWithCredential, interdiffWithCredential } from "@generalbusiness/dap-git/diff";
import { McpService } from "./service.ts";
import { MCP_METRIC_SCHEMA, type McpMetricOptions } from "./metrics.ts";
import type { Mode } from "./catalogue.ts";
import { McpHttp } from "./http.ts";
import { Wire, isFrame, newSession, type LegacySession, type Message } from "./wire.ts";

// ---------------------------------------------------------------- stdio

/** The most bytes of one line on stdio, and of one HTTP body: a whole envelope of the largest act fits with room to spare. */
const FRAME_BYTES = 4 * 1024 * 1024;

/**
 * Serve over standard input and output. Resolves when the input ends. Each line is one frame, read as bytes and decoded once as
 * UTF-8. A line longer than the bound is answered with one error and skipped to its end, never truncated into another frame. Each
 * request runs as its own task, removed when it settles; a failure in one is answered and contained.
 */
export function serveStdio(service: McpService, input: NodeJS.ReadableStream = process.stdin, output: NodeJS.WritableStream = process.stdout): Promise<void> {
  const wire = new Wire(service);
  const session: LegacySession = newSession();
  const owner = {};
  const write = (message: Message) => { try { output.write(`${JSON.stringify(message)}\n`); } catch { /* the output is gone */ } };
  session.stream = { send: write, notified: null, close: () => {} };
  let parts: Buffer[] = [];
  let held = 0;
  let skipping = false;
  const pending = new Set<Promise<void>>();
  const frame = (bytes: Buffer) => {
    let message: unknown;
    try { message = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
    catch { write({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }); return; }
    const task: Promise<void> = wire.handle(message, session, write, owner)
      .then((response) => { if (response) write(response); }, () => { write({ jsonrpc: "2.0", id: isFrame(message) ? message.id ?? null : null, error: { code: -32603, message: "Internal error" } }); })
      .finally(() => { pending.delete(task); });
    pending.add(task);
  };
  const tooLong = () => write({ jsonrpc: "2.0", id: null, error: { code: -32600, message: `A frame longer than ${FRAME_BYTES} bytes is not read.` } });
  return new Promise((resolve) => {
    input.on("data", (chunk: string | Buffer) => {
      let data = typeof chunk === "string" ? Buffer.from(chunk, "utf8") : chunk;
      for (let at = data.indexOf(10); at >= 0; at = data.indexOf(10)) {
        const tail = data.subarray(0, at);
        data = data.subarray(at + 1);
        if (skipping) { skipping = false; parts = []; held = 0; continue; }
        if (held + tail.length > FRAME_BYTES) { parts = []; held = 0; tooLong(); continue; }
        const line = Buffer.concat([...parts, tail]);
        parts = []; held = 0;
        if (line.toString("latin1").trim().length > 0) frame(line);
      }
      if (data.length === 0 || skipping) return;
      held += data.length;
      if (held > FRAME_BYTES) { skipping = true; parts = []; held = 0; tooLong(); return; }
      parts.push(Buffer.from(data));
    });
    input.on("end", () => { void Promise.allSettled([...pending]).then(() => { wire.endLegacy(session); wire.closeAll(); resolve(); }); });
  });
}

// ---------------------------------------------------------------- loopback HTTP

const LOOPBACK = /^(127\.\d{1,3}\.\d{1,3}\.\d{1,3}|::1|\[::1\])$/;

export interface HttpServing { server: Server; url: string; bearer: string; wire: Wire; http: McpHttp; close(): Promise<void> }

/** Whether an address is loopback: 127.0.0.0/8 or ::1. A name such as `localhost` is not taken: it may resolve elsewhere. */
export function isLoopback(host: string): boolean { return LOOPBACK.test(host); }

/**
 * Serve streamable HTTP at `http://<host>:<port>/mcp`. Refuses a host that is
 * not loopback before anything listens. The bearer is made here and given
 * once to `announce`, which the command writes to standard error. Every
 * request is validated by the shared HTTP layer (`http.ts`), as the hosted
 * endpoint's are: this server only binds the socket, checks the bearer and
 * carries the bytes.
 */
export async function serveHttp(service: McpService, host: string, port: number, announce: (line: string) => void = (line) => process.stderr.write(`${line}\n`)): Promise<HttpServing> {
  if (!isLoopback(host)) throw new Error(`${host} is not a loopback address; the server binds 127.0.0.1 or ::1 only.`);
  const bearer = randomBytes(32).toString("base64url");
  const expected = Buffer.from(`Bearer ${bearer}`);
  const wire = new Wire(service);
  const http = new McpHttp({
    wire, bodyBytes: FRAME_BYTES, mintSession: randomUUID,
    authorized: (authorization) => { const given = Buffer.from(authorization ?? ""); return given.length === expected.length && timingSafeEqual(given, expected); },
  });
  const bare = (res: ServerResponse, status: number) => { res.writeHead(status); res.end(); };
  const json = (res: ServerResponse, status: number, message: Message) => { res.writeHead(status, { "content-type": "application/json" }); res.end(JSON.stringify(message)); };
  // Every failure of one request is contained here: an aborted body, a parser or a handler that throws, a write to a closed
  // socket. Nothing rejects unhandled and no other request waits on it.
  const server = createServer((req, res) => {
    req.on("error", () => { /* an aborted upload: the handler sees the end of the body */ });
    res.on("error", () => { /* the client is gone */ });
    handle(req, res).catch(() => {
      try { if (!res.headersSent) json(res, 500, { jsonrpc: "2.0", id: null, error: { code: -32603, message: "Internal error" } }); else res.end(); } catch { /* gone */ }
    });
  });
  async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    // Origin and bearer first, then the path: no detail about this server leaves before the bearer is checked.
    if (req.headers["origin"] !== undefined) return bare(res, 403);
    const given = Buffer.from(String(req.headers["authorization"] ?? ""));
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) return bare(res, 401);
    if (new URL(req.url ?? "/", "http://loopback").pathname !== "/mcp") return bare(res, 404);
    // The socket's close is tracked before the handler is awaited: a client that goes away while a stream is being opened is
    // seen by the layer through the request's signal, and a body the handler returns to a closed socket is cancelled at once,
    // so it holds no stream slot and no watcher.
    const gone = new AbortController();
    let closed = false;
    res.on("close", () => { closed = true; gone.abort(); });
    let request: Request;
    try {
      const headers = new Headers();
      for (const [name, value] of Object.entries(req.headers)) if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(", ") : value);
      const withBody = req.method === "POST";
      request = new Request(`http://loopback${req.url ?? "/"}`, { method: req.method ?? "GET", headers, signal: gone.signal, ...(withBody ? { body: Readable.toWeb(req) as unknown as ReadableStream, duplex: "half" } : {}) } as RequestInit);
    } catch { return json(res, 400, { jsonrpc: "2.0", id: null, error: { code: -32020, message: "A header is not well formed." } }); }
    const response = await http.handle(request);
    if (closed) { await response.body?.cancel().catch(() => undefined); return; }
    res.writeHead(response.status, Object.fromEntries(response.headers));
    if (!response.body) { res.end(); return; }
    const reader = response.body.getReader();
    res.on("close", () => { void reader.cancel().catch(() => undefined); });
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (res.writableEnded) break;
      res.write(value);
    }
    res.end();
  }

  await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(port, host.replace(/^\[|\]$/g, ""), () => resolve()); });
  const address = server.address();
  const actual = typeof address === "object" && address ? address.port : port;
  const url = `http://${host.includes(":") && !host.startsWith("[") ? `[${host}]` : host}:${actual}/mcp`;
  announce(`dap mcp: serving ${url}; bearer (shown once): ${bearer}`);
  return {
    server, url, bearer, wire, http,
    close: async () => {
      await http.closeAll();
      server.closeAllConnections?.();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}

// ---------------------------------------------------------------- the command

export interface ServeOptions {
  service: string;
  signer: Signer;
  config: ConfigPort;
  /** `ARTROOM_HOME`: custody lives under its `private/mcp-custody/`. */
  home: string;
  mode: Mode;
  tools: readonly string[] | null;
  http: { host: string; port: number } | null;
  fetch?: Fetch;
  metrics?: McpMetricOptions;
}

/** `dap mcp`: serve over stdio, or over loopback HTTP. Resolves when stdio ends; an HTTP server serves until the process ends. */
export async function serve(options: ServeOptions): Promise<void> {
  const service = await McpService.fromInstalledApplication({
    service: options.service, signer: options.signer, config: options.config, custody: fileStore(join(options.home, "private", "mcp-custody")), originals: true,
    applicationTrust: process.env["APPLICATION_TRUST"],
    mode: options.mode, tools: options.tools, ...(options.fetch ? { fetch: options.fetch } : {}), readDiff: read => diffWithCredential(read), readInterdiff: read => interdiffWithCredential(read), readFile: read => fileWithCredential(read),
    metrics: options.metrics ?? { report: point => { console.error(`dap.metric ${JSON.stringify({ schema: MCP_METRIC_SCHEMA, ...point })}`); } },
  });
  if (options.http) {
    await serveHttp(service, options.http.host, options.http.port);
    await new Promise<void>(() => {});
  }
  await serveStdio(service);
}
