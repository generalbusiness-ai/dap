/** Host-only read ownership. No token or callable gateway enters a job. */
import * as http from "node:http";
import * as fs from "node:fs/promises";
import { AsyncLocalStorage } from "node:async_hooks";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { b64url, unb64url } from "@generalbusiness/dap-bytes";
import type { GatewayOptions, GrantRequest } from "@generalbusiness/dap-git";
import { runnerGateway } from "./sandbox.ts";

export interface ContainerRunnerOrigin {
  repository: string;
  /** Settles with the response owner or a refusal; cancellation must not create untracked work. */
  forward(request: Request): Promise<Response>;
  /** Stops new upstream work and retires the grant. The bridge separately joins all read/body owners. */
  close(): Promise<void>;
}
const REQUEST_BYTES = 8 * 1024 * 1024, RESPONSE_BYTES = 64 * 1024 * 1024;
export const ORIGIN_CLOSE_MS = 30_000;
const unavailable = (): Error => new Error("The checker read-only origin is unavailable or its cleanup is unconfirmed.");

/** Preserve request cancellation through the existing Gateway's rebuilt Request,
 * without changing the shared Git/Worker code. Plaintext remains in Gateway. */
export async function gatewayOrigin(options: GatewayOptions, grant: GrantRequest): Promise<ContainerRunnerOrigin> {
  if (grant.update !== null) throw unavailable();
  const abort = new AbortController(), requestSignal = new AsyncLocalStorage<AbortSignal>();
  const { gateway, record } = await runnerGateway({ ...options, upstream: request => {
    const current = requestSignal.getStore();
    return options.upstream(new Request(request, { signal: AbortSignal.any(current ? [abort.signal, current] : [abort.signal]) }));
  } }, grant);
  let closing: Promise<void> | null = null;
  return { repository: record.repository,
    forward: request => {
      if (abort.signal.aborted) return Promise.reject(unavailable());
      return requestSignal.run(request.signal, () => gateway.forward(request));
    },
    close: () => closing ??= (async () => { abort.abort(); await gateway.close(record.attempt); })(),
  };
}

async function whole(stream: AsyncIterable<Uint8Array>, bound: number): Promise<Buffer> {
  const chunks: Buffer[] = []; let bytes = 0;
  for await (const chunk of stream) {
    bytes += chunk.byteLength;
    if (bytes > bound) throw unavailable();
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks, bytes);
}
/** The physical owner does not finish until pending reads and cancel settle.
 * The enclosing HTTP handler may time out sooner; close still joins this owner. */
async function bodyOf(body: ReadableStream<Uint8Array> | null, bound: number, signal: AbortSignal, retirementFailed: () => void): Promise<Uint8Array> {
  if (!body) return new Uint8Array();
  const reader = body.getReader(), chunks: Uint8Array[] = [];
  let bytes = 0, pending: ReturnType<typeof reader.read> | null = null;
  let rejectStopped!: (error: Error) => void;
  const stopped = new Promise<never>((_, reject) => { rejectStopped = reject; });
  const stop = () => rejectStopped(unavailable());
  signal.addEventListener("abort", stop, { once: true });
  try {
    if (signal.aborted) throw unavailable();
    for (;;) {
      pending = reader.read();
      const next = await Promise.race([pending, stopped]);
      if (next.done) break;
      bytes += next.value.byteLength;
      if (bytes > bound || signal.aborted) throw unavailable();
      chunks.push(next.value);
    }
    const result = new Uint8Array(bytes); let offset = 0;
    for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
    return result;
  } finally {
    signal.removeEventListener("abort", stop);
    const cancelled = Promise.resolve().then(() => reader.cancel());
    const results = await Promise.allSettled([...(pending ? [pending] : []), cancelled]);
    if (results.at(-1)?.status === "rejected") retirementFailed();
  }
}
const headersOf = (given: unknown): [string, string][] => {
  if (!Array.isArray(given) || given.length > 32 || given.some(pair => !Array.isArray(pair) || pair.length !== 2 || pair.some(part => typeof part !== "string" || part.length > 4096))) throw unavailable();
  return given as [string, string][];
};
function bounded<T>(work: Promise<T>, milliseconds: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([work, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(unavailable()), milliseconds); })]).finally(() => clearTimeout(timer));
}

export async function serveOrigin(origin: ContainerRunnerOrigin, acknowledged: () => Promise<void>): Promise<{ socket: string; close(): Promise<void> }> {
  if (origin.repository.length > 4096 || /[\u0000-\u0020\u007f]/.test(origin.repository)) throw unavailable();
  const url = new URL(origin.repository);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw unavailable();
  const directory = await fs.mkdtemp(join(tmpdir(), "dc-")); await fs.chmod(directory, 0o700);
  const socket = join(directory, "o.sock"), requests = new Set<AbortController>(), owners = new Set<Promise<unknown>>();
  let accepting = true, retirementFailed = false, closing: Promise<void> | null = null;
  const track = <T>(promise: Promise<T>): Promise<T> => {
    owners.add(promise); void promise.finally(() => owners.delete(promise)).catch(() => undefined); return promise;
  };
  const closeWork = (): Promise<void> => closing ??= (async () => {
    accepting = false;
    for (const request of requests) request.abort();
    // close() can itself cancel the SDK/upstream owner. Join its promise and
    // all physical work even when a logical HTTP deadline already fired.
    const closed = Promise.resolve().then(() => origin.close());
    const results = await bounded(Promise.allSettled([closed, ...owners]), ORIGIN_CLOSE_MS);
    if (results[0]?.status !== "fulfilled" || retirementFailed) throw unavailable();
    await acknowledged();
  })();
  const server = http.createServer(async (request, response) => {
    if (request.method === "POST" && request.url === "/close") {
      try { await closeWork(); response.writeHead(200, { "connection": "close", "content-type": "application/json" }); response.end('{"closed":true}'); }
      catch { response.writeHead(503, { "connection": "close" }); response.end(); }
      return;
    }
    const abort = new AbortController(); requests.add(abort);
    const timer = setTimeout(() => abort.abort(), 30_000);
    const stop = () => request.destroy(); abort.signal.addEventListener("abort", stop, { once: true });
    response.on("close", () => { if (!response.writableEnded) abort.abort(); });
    try {
      if (!accepting || request.method !== "POST" || request.url !== "/forward") throw unavailable();
      const value = JSON.parse((await track(whole(request, REQUEST_BYTES * 2))).toString("utf8")) as { url: string; method: string; headers: unknown; body: string };
      if (!accepting || abort.signal.aborted || typeof value.url !== "string" || value.url.length > 4096 || !["GET", "POST"].includes(value.method)
        || typeof value.body !== "string" || value.body.length > Math.ceil(REQUEST_BYTES * 4 / 3)) throw unavailable();
      const body = unb64url(value.body); if (!body || body.length > REQUEST_BYTES) throw unavailable();
      const headers = headersOf(value.headers).filter(([name]) => ["content-type", "accept", "git-protocol"].includes(name.toLowerCase()));
      const work = track(Promise.resolve().then(async () => {
        if (abort.signal.aborted) throw unavailable();
        const got = await origin.forward(new Request(value.url, { method: value.method, headers, signal: abort.signal, ...(body.length ? { body: body as never } : {}) }));
        const bytes = await bodyOf(got.body, RESPONSE_BYTES, abort.signal, () => { retirementFailed = true; });
        return { status: got.status, headers: [...got.headers].filter(([name]) => ["content-type", "cache-control", "content-encoding"].includes(name.toLowerCase())), body: b64url(bytes) };
      }));
      const reply = await Promise.race([work, new Promise<never>((_, reject) => { abort.signal.addEventListener("abort", () => reject(unavailable()), { once: true }); })]);
      if (!response.destroyed) { response.writeHead(200, { "content-type": "application/json" }); response.end(JSON.stringify(reply)); }
    } catch { if (!response.destroyed) { response.writeHead(503); response.end(); } }
    finally { clearTimeout(timer); abort.signal.removeEventListener("abort", stop); if (!abort.signal.aborted) abort.abort(); requests.delete(abort); }
  });
  server.requestTimeout = 30_000; server.headersTimeout = 10_000;
  await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(socket, resolve); });
  await fs.chmod(socket, 0o600);
  let disposed: Promise<void> | null = null;
  return { socket, close: () => disposed ??= (async () => {
    try { await closeWork(); }
    finally {
      server.closeAllConnections();
      await new Promise<void>(resolve => { server.close(() => resolve()); });
      await fs.rm(directory, { recursive: true, force: true });
    }
  })() };
}

async function post(socket: string, path: string, payload: string, bound: number, signal: AbortSignal): Promise<unknown> {
  if (signal.aborted) throw unavailable();
  return new Promise((resolve, reject) => {
    const call = http.request({ socketPath: socket, path, method: "POST", agent: false, signal,
      headers: { "content-type": "application/json", "content-length": Buffer.byteLength(payload) } }, async response => {
      try {
        if (response.statusCode !== 200) throw unavailable();
        resolve(JSON.parse((await whole(response, bound)).toString("utf8")));
      } catch { reject(unavailable()); }
    });
    call.setTimeout(30_000, () => { call.destroy(unavailable()); });
    call.on("error", () => reject(unavailable())); call.end(payload);
  });
}
export function originClient(socket: string, signal: AbortSignal): { forward(request: Request): Promise<Response>; close(): Promise<void> } {
  return {
    forward: async request => {
      const payload = JSON.stringify({ url: request.url, method: request.method, headers: [...request.headers], body: b64url(await bodyOf(request.body, REQUEST_BYTES, signal, () => undefined)) });
      const value = await post(socket, "/forward", payload, RESPONSE_BYTES * 2, signal) as { status: number; headers: unknown; body: string };
      if (!Number.isSafeInteger(value.status) || value.status < 200 || value.status > 599 || typeof value.body !== "string" || value.body.length > Math.ceil(RESPONSE_BYTES * 4 / 3)) throw unavailable();
      const bytes = unb64url(value.body); if (!bytes || bytes.length > RESPONSE_BYTES) throw unavailable();
      return new Response([204, 205, 304].includes(value.status) ? null : bytes as never, { status: value.status, headers: headersOf(value.headers) });
    },
    close: async () => {
      const result = await post(socket, "/close", "{}", 4096, AbortSignal.timeout(ORIGIN_CLOSE_MS + 5000)) as { closed?: unknown };
      if (result.closed !== true) throw unavailable();
    },
  };
}
