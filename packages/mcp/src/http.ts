/**
 * The HTTP layer of the MCP service, one module for the loopback server of
 * `node.ts` and for the hosted endpoint (notes/2026-10-13-hosted-mcp-endpoint.md,
 * section 3.4). It is written against the Fetch API's `Request` and
 * `Response`, so both validate the same way; each caller supplies its bearer
 * check, its body bound and, for the hosted endpoint, the persistence of a
 * session row.
 *
 * The revision is selected before the method is handled: from the
 * `MCP-Protocol-Version` header when it is present, and otherwise from the
 * request's own content (a `_meta` protocol version, or `initialize`) or from
 * the recorded version of the session the request names; the presence of
 * `Mcp-Session-Id` selects nothing by itself. Exactly `2025-11-25` and
 * `2026-07-28` are served; any other header value is refused before dispatch,
 * on every method. Then one matrix decides every method, its rows tried in
 * order:
 *
 * | Version, as selected | `POST` | `GET` | `DELETE` |
 * |---|---|---|---|
 * | header `2026-07-28` | modern rules; `_meta` must name the same version | `405`, no session consulted | `405`, nothing ended |
 * | header `2025-11-25` | legacy rules: `initialize` mints; any other request needs a session (`400` without, `404` unknown) | session required: `400` without, `404` unknown, else the stream | session required: `400` without, `404` unknown, else the session ends |
 * | header absent, `_meta` names `2026-07-28` | `400` with `-32020`: that revision requires the header | | |
 * | header absent, `initialize` | legacy, from the request's own `protocolVersion` | | |
 * | header absent, `Mcp-Session-Id` names a live session | that session's recorded version: legacy | the stream | the session ends |
 * | header absent, `Mcp-Session-Id` unknown or ended | `404` | `404` | `404` |
 * | header absent, none of the above | `400` with `-32600` | `405` | `405` |
 *
 * A `405` is decided from the header and the method alone: it opens no stream,
 * looks up no session and ends nothing, whatever `Mcp-Session-Id` carries.
 * Every error body is a JSON-RPC error with the request's `id` when one was
 * parsed and `null` otherwise; its message names a header or a rule by name,
 * never a value. Header safety is judged on the raw value as received.
 */

import type { DispatchContext } from "./results.ts";
import { isRecord } from "@generalbusiness/dap-bytes";
import type { Digest } from "@generalbusiness/dap-contract";
import { LEGACY, MODERN, PROTOCOL_META, SESSION_FULL, UNSUPPORTED_VERSION, Wire, frameOf, isFrame, isNotificationMethod, newSession, type Id, type LegacySession, type Message, type Stream } from "./wire.ts";

/** The 2026-07-28 transport's error for a header that does not match the body. */
export const HEADER_MISMATCH = -32020;
/** The most 2025-11-25 sessions one server holds; a 17th `initialize` ends the oldest. */
export const SESSIONS_MOST = 16;
/** Legacy HTTP sessions expire after 30 minutes without a client request, checked on the next authenticated legacy request. */
export const SESSION_IDLE_MS = 30 * 60 * 1000;
/** The most open streams one server holds, legacy streams and modern listens together; a 5th is refused `409`. */
export const STREAMS_MOST = 4;
/** Hosted bearer deadlines are checked with short, cancelable timers. */
export const LIFETIME_RECHECK_MS = 30_000;
export const SERVED: readonly string[] = [MODERN, LEGACY];
const TOO_MANY_STREAMS = -32001;
/** The most canonical bytes a 2025-11-25 client's declared capabilities may hold: a session row is bounded control state. */
export const CAPABILITIES_BYTES = 16 * 1024;
/** Thrown by a transport's `persist` when its store admits no more session state; the session is not issued. */
export class SessionFull extends Error { constructor() { super("No room for another session."); this.name = "SessionFull"; } }

/** A 2025-11-25 session as it is persisted: what survives eviction. Its open stream does not. */
export interface SessionRow { id: string; version: string | null; initialized: boolean; capabilities: Record<string, unknown>; listed: Digest | null; created: number; lastActive?: number }

export interface HttpPort {
  wire: Wire;
  /** Presentation metadata from exact deployment URLs; never authority. Local
   * HTTP and stdio omit it. The wire never retains it between requests. */
  resourceDomain?(request: Request): string | undefined;
  /** The most bytes of one request body. */
  bodyBytes: number;
  /** Whether the `Authorization` header is the expected bearer. Compared in constant time by the caller. */
  authorized(authorization: string | null): boolean | Promise<boolean>;
  /** A fresh session ID. */
  mintSession(): string;
  /** Hosted credential layers share the agent's four stream slots. */
  streamCount?(): number;
  /** Credential owner cancels its standing timer as the last stream ends. */
  streamsChanged?(): void;
  /** Called with a session's row after issue, initialization, a listing or client activity. Awaited before the response. */
  persist?(row: SessionRow): void | Promise<void>;
  /** Called when a session ends. */
  remove?(id: string): void | Promise<void>;
  now?(): number;
  /** Absent for local servers. One deadline belongs to this HTTP layer. */
  lifetime?: { expires: number; schedule?: (delayMs: number, run: () => Promise<void>) => () => void };
}

const rpcError = (id: Id | null, code: number, message: string, data?: unknown): Message => ({ jsonrpc: "2.0", id, error: { code, message, ...(data !== undefined ? { data } : {}) } });
const rpcJsonReply = (status: number, message: Message, headers: Record<string, string> = {}): Response => new Response(JSON.stringify(message), { status, headers: { "content-type": "application/json", ...headers } });
const bare = (status: number, headers: Record<string, string> = {}): Response => new Response(null, { status, headers });
const notAllowed = (): Response => bare(405, { allow: "POST" });
const unsupported = (id: Id | null): Message => rpcError(id, UNSUPPORTED_VERSION, "Unsupported protocol version.", { supported: SERVED });
const SSE = { "content-type": "text/event-stream", "cache-control": "no-cache" };

/** Whether a raw header value is safe: visible ASCII, space and tab only. */
export const safeHeader = (value: string): boolean => /^[\x20-\x7e\t]*$/.test(value);
const SENTINEL = /^=\?base64\?([A-Za-z0-9+/]*={0,2})\?=$/;

/** An `Mcp-Name` value: the name itself, or the UTF-8 of its `=?base64?…?=` sentinel; null when the sentinel does not decode. */
export function decodeName(value: string): string | null {
  const m = SENTINEL.exec(value);
  if (!m) return value;
  try {
    const text = atob(m[1]!);
    const bytes = Uint8Array.from(text, (c) => c.charCodeAt(0));
    return new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(bytes);
  } catch { return null; }
}

export const rowOf = (session: LegacySession): SessionRow =>
  ({ id: session.id!, version: session.version, initialized: session.initialized, capabilities: session.capabilities, listed: session.listed, created: session.created, lastActive: session.lastActive });

type Body = { status: "ok"; value: unknown } | { status: "too-large" } | { status: "parse" };

type Disposal = "graceful" | "detach" | "abrupt";
type GenerationState = { phase: "opening" | "open" }
  | { phase: "closing" | "closed"; disposition: Disposal; done: Promise<void> };
type Scheduled = { cancel: () => void };

/** One transport generation, from its held factory through its last resource.
 * Protocol parsing never mutates this owner's lifecycle or resource tables. */
export class HttpGeneration {
  #state: GenerationState = { phase: "opening" };
  #http: McpHttp | null = null;
  #port: HttpPort | null = null;
  #opening: Promise<McpHttp> | null = null;
  readonly #sessions = new Map<string, LegacySession>();
  readonly #open = new Set<object>();
  readonly #listens = new Map<object, { end: (final: boolean) => void }>();
  readonly #pending = new Map<LegacySession, number>();
  readonly #rows = new WeakMap<LegacySession, SessionRow>();
  readonly #writes = new WeakMap<LegacySession, Promise<void>>();
  readonly #issuing = new Set<LegacySession>();
  #lifetime: Scheduled | null = null;
  #standing: Scheduled | null = null;
  #deadline: number;

  constructor(deadline = Infinity) { this.#deadline = deadline; }
  get phase(): GenerationState["phase"] { return this.#state.phase; }
  get closed(): boolean { return this.#state.phase === "closing" || this.#state.phase === "closed"; }
  get retained(): boolean { return "disposition" in this.#state && this.#state.disposition !== "graceful"; }
  get http(): McpHttp | null { return this.#http; }
  get sessions(): Map<string, LegacySession> { return this.#sessions; }
  get streams(): number { return this.#open.size; }
  get deadline(): number { return this.#deadline; }
  extendDeadline(deadline: number): void { if (!this.closed) this.#deadline = Math.max(this.#deadline, deadline); }
  replaceDeadline(deadline: number): void { if (!this.closed) this.#deadline = deadline; }
  get standingScheduled(): boolean { return this.#standing !== null; }
  private get port(): HttpPort { if (!this.#port) throw new Error("Transport resources are not attached."); return this.#port; }
  due(): boolean { return this.#port?.lifetime !== undefined && (this.port.now?.() ?? Date.now()) >= this.port.lifetime!.expires; }

  attach(http: McpHttp, port: HttpPort, ready: boolean): void {
    if (this.#http) throw new Error("A generation owns one HTTP layer.");
    this.#http = http;
    this.#port = port;
    port.wire.hooks.changed = (session, next) => this.#persist(session, next);
    if (ready && !this.closed) this.#state = { phase: "open" };
  }

  /** Start synchronously, then retain the exact pending result across retirement. */
  open(create: () => Promise<McpHttp>): Promise<McpHttp> {
    if (this.#opening) return this.#opening;
    if (this.#http) return Promise.resolve(this.#http);
    if (this.closed) return Promise.reject(new Error("A retired opening cannot restart."));
    let resolve!: (http: McpHttp) => void, reject!: (error: unknown) => void;
    const pending = new Promise<McpHttp>((yes, no) => { resolve = yes; reject = no; });
    this.#opening = pending;
    const clear = () => { if (this.#opening === pending) this.#opening = null; };
    void pending.then(clear, clear);
    const failed = (error: unknown) => { this.abrupt(); reject(error); };
    try {
      void create().then(async http => {
        if (http.generation !== this) { http.abrupt(); throw new Error("The opening returned another generation's HTTP layer."); }
        if (!this.closed) this.#state = { phase: "open" };
        else if (!this.retained) await this.graceful();
        resolve(http);
      }, failed).catch(failed);
    } catch (error) { failed(error); }
    return pending;
  }

  disposed(): Promise<void> { return "done" in this.#state ? this.#state.done : this.graceful(); }

  clearStanding(expected?: Scheduled): void {
    if (expected && this.#standing !== expected) return;
    const held = this.#standing;
    this.#standing = null;
    held?.cancel();
  }
  scheduleStanding(schedule: (delay: number, run: () => Promise<void>) => () => void, delay: number, run: () => Promise<void>): Scheduled | null {
    if (this.closed) return null;
    this.clearStanding();
    const held: Scheduled = { cancel: () => {} };
    this.#standing = held;
    held.cancel = schedule(delay, async () => {
      if (this.#standing !== held || this.closed) return;
      this.#standing = null;
      await run();
    });
    if (this.#standing !== held) held.cancel();
    return held;
  }
  #cancelLifetime(): void {
    const held = this.#lifetime;
    this.#lifetime = null;
    held?.cancel();
  }
  #changed(): void {
    this.#port?.streamsChanged?.();
    if (this.closed || this.#open.size === 0) { this.#cancelLifetime(); return; }
    const lifetime = this.port.lifetime;
    if (!lifetime || this.#lifetime) return;
    const remaining = lifetime.expires - (this.port.now?.() ?? Date.now());
    if (remaining <= 0) { void this.graceful().catch(() => {}); return; }
    const schedule = lifetime.schedule ?? ((delay: number, run: () => Promise<void>) => {
      const timer = setTimeout(() => { void run().catch(() => {}); }, delay);
      return () => clearTimeout(timer);
    });
    const held: Scheduled = { cancel: () => {} };
    this.#lifetime = held;
    held.cancel = schedule(Math.min(LIFETIME_RECHECK_MS, remaining), async () => {
      if (this.#lifetime !== held || this.closed) return;
      this.#lifetime = null;
      if (this.due()) await this.graceful(); else this.#changed();
    });
    if (this.#lifetime !== held) held.cancel();
  }
  #stopTimers(): void { this.clearStanding(); this.#cancelLifetime(); }
  expireIfDue(): void { if (this.due() && !this.retained) void this.graceful().catch(() => {}); }

  #queue(session: LegacySession, work: () => void | Promise<void>): Promise<void> {
    const pending = (this.#writes.get(session) ?? Promise.resolve()).then(work);
    this.#writes.set(session, pending.catch(() => {}));
    return pending;
  }
  #persist(session: LegacySession, next: Partial<SessionRow> = {}): Promise<void> {
    this.expireIfDue();
    if (session.id === null || session.ended || this.closed || this.due()) return Promise.resolve();
    return this.#queue(session, async () => {
      this.expireIfDue();
      if (session.ended || this.closed || this.due()) return;
      const previous = this.#rows.get(session) ?? rowOf(session);
      const row = { ...previous, ...next };
      row.lastActive = Math.max(previous.lastActive ?? previous.created, row.lastActive ?? row.created);
      await this.port.persist?.(row);
      this.expireIfDue();
      this.#rows.set(session, row);
    });
  }
  async touch(session: LegacySession): Promise<boolean> {
    const lastActive = Math.max(session.lastActive, this.port.now?.() ?? Date.now());
    if (lastActive !== session.lastActive) await this.#persist(session, { lastActive });
    if (session.ended) return false;
    session.lastActive = Math.max(session.lastActive, lastActive);
    return true;
  }
  async expireIdle(): Promise<void> {
    const now = this.port.now?.() ?? Date.now();
    for (const session of [...this.#sessions.values()]) if (now - session.lastActive >= SESSION_IDLE_MS) await this.endSession(session, true);
  }
  restore(rows: readonly SessionRow[]): void {
    const removals: Promise<void>[] = [];
    for (const row of [...rows].sort((a, b) => a.created - b.created)) {
      const session = newSession(row.id);
      session.version = row.version;
      session.initialized = row.initialized;
      session.capabilities = row.capabilities;
      session.listed = row.listed;
      session.created = row.created;
      session.lastActive = row.lastActive ?? row.created;
      this.#rows.set(session, { ...row, lastActive: session.lastActive });
      this.#sessions.set(row.id, session);
      if (this.closed) {
        session.ended = true;
        if (!this.retained) removals.push(this.endSession(session, true));
      } else if (session.initialized) this.port.wire.watchLegacy(session);
    }
    if (removals.length && "done" in this.#state) {
      const done = Promise.all([this.#state.done, ...removals]).then(() => {});
      this.#state = { phase: "closed", disposition: "graceful", done };
      void done.catch(() => {});
    }
  }
  beginIssue(id: string): LegacySession {
    const session = newSession(id);
    this.#issuing.add(session);
    session.created = this.port.now?.() ?? Date.now();
    session.lastActive = session.created;
    return session;
  }
  finishedIssuing(session: LegacySession): void { this.#issuing.delete(session); }
  async acceptIssue(session: LegacySession, response: Message | null): Promise<"closed" | "refused" | "issued"> {
    if (this.closed || this.due() || session.ended) {
      session.ended = true;
      this.port.wire.endLegacy(session);
      if (!this.retained) await this.#queue(session, () => this.port.remove?.(session.id!));
      return "closed";
    }
    if (response?.error) {
      session.ended = true;
      this.port.wire.endLegacy(session);
      await this.port.remove?.(session.id!);
      return "refused";
    }
    this.#sessions.set(session.id!, session);
    while (this.#sessions.size > SESSIONS_MOST) {
      const oldest = this.#sessions.keys().next().value!;
      if (oldest === session.id) break;
      await this.endSession(this.#sessions.get(oldest)!, true);
    }
    return "issued";
  }
  canOpenLegacy(session: LegacySession): boolean {
    return session.stream !== null || this.#pending.has(session) || (this.port.streamCount?.() ?? this.streams) < STREAMS_MOST;
  }
  beginLegacyStream(session: LegacySession): () => void {
    this.#open.add(session);
    this.#changed();
    this.#pending.set(session, (this.#pending.get(session) ?? 0) + 1);
    let pending = true;
    return () => {
      if (!pending) return;
      pending = false;
      const left = (this.#pending.get(session) ?? 1) - 1;
      if (left > 0) this.#pending.set(session, left); else this.#pending.delete(session);
      if (left === 0 && session.stream === null) this.#open.delete(session);
      this.#changed();
    };
  }
  cancelLegacyStream(session: LegacySession, stream: Stream): void {
    if (session.stream !== stream) return;
    this.port.wire.endLegacy(session);
    if (!this.#pending.has(session)) this.#open.delete(session);
    this.#changed();
  }
  replaceLegacyStream(session: LegacySession, stream: Stream): void {
    const old = session.stream;
    session.stream = stream;
    if (old) old.close(false);
  }
  registerListen(owner: object, close: () => void): void {
    this.#open.add(owner);
    this.#listens.set(owner, { end: final => {
      if (final) this.port.wire.endStream(owner); else this.port.wire.dropStream(owner);
      close();
      this.completeListen(owner);
    } });
    this.#changed();
  }
  completeListen(owner: object): void { this.#open.delete(owner); this.#listens.delete(owner); this.#changed(); }
  cancelListen(owner: object): void { this.#open.delete(owner); this.#listens.delete(owner); this.port.wire.dropStream(owner); this.#changed(); }
  async endSession(session: LegacySession, final: boolean): Promise<void> {
    const stream = session.stream;
    session.ended = true;
    this.port.wire.endLegacy(session);
    if (stream) stream.close(final);
    if (!this.#pending.has(session)) this.#open.delete(session);
    this.#changed();
    if (session.id !== null) { this.#sessions.delete(session.id); await this.#queue(session, () => this.port.remove?.(session.id!)); }
  }

  abrupt(): void { this.#discard("abrupt"); }
  detach(): void { this.#discard("detach"); }
  #discard(disposition: "detach" | "abrupt"): void {
    if (this.closed) return;
    this.#state = { phase: "closed", disposition, done: Promise.resolve() };
    this.#stopTimers();
    if (!this.#port) return;
    for (const session of new Set([...this.#sessions.values(), ...this.#issuing])) {
      const stream = session.stream;
      session.ended = true;
      this.port.wire.endLegacy(session);
      if (stream) stream.close(disposition === "detach");
    }
    this.#pending.clear();
    for (const listen of [...this.#listens.values()]) listen.end(disposition === "detach");
    this.#open.clear();
  }
  /** Explicit graceful retirement may follow an earlier retaining discard. */
  graceful(): Promise<void> {
    if ("disposition" in this.#state && this.#state.disposition === "graceful") return this.#state.done;
    let resolve!: () => void, reject!: (error: unknown) => void;
    const done = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
    const closing: GenerationState = { phase: "closing", disposition: "graceful", done };
    this.#state = closing;
    this.#stopTimers();
    const removed = this.#port ? [...new Set([...this.#sessions.values(), ...this.#issuing])].map(session => this.endSession(session, true)) : [];
    for (const listen of [...this.#listens.values()]) listen.end(true);
    this.#port?.wire.closeAll();
    this.#open.clear();
    void Promise.all(removed).then(() => {
      if (this.#state === closing) this.#state = { phase: "closed", disposition: "graceful", done };
      resolve();
    }, error => {
      if (this.#state === closing) this.#state = { phase: "closed", disposition: "graceful", done };
      reject(error);
    });
    return done;
  }
}

/** The protocol layer delegates all generation state and resources to its owner. */
export class McpHttp {
  readonly generation: HttpGeneration;
  constructor(readonly port: HttpPort, generation?: HttpGeneration) {
    this.generation = generation ?? new HttpGeneration();
    this.generation.attach(this, port, generation === undefined);
  }
  get sessions(): Map<string, LegacySession> { return this.generation.sessions; }
  get streams(): number { return this.generation.streams; }
  restore(rows: readonly SessionRow[]): void { this.generation.restore(rows); }

  async handle(request: Request, dispatch?: DispatchContext): Promise<Response> {
    if (request.headers.get("origin") !== null) return bare(403);
    if (!(await this.port.authorized(request.headers.get("authorization")))) return bare(401);
    if (this.generation.closed || this.generation.due()) { if (!this.generation.retained) await this.closeAll(); return bare(this.generation.due() ? 401 : 404); }
    const method = request.method;
    const header = request.headers.get("mcp-protocol-version");
    const sessionId = request.headers.get("mcp-session-id");
    if (method === "GET" || method === "DELETE") {
      // No frame: a header that is not served is -32600 with a null id.
      if (header !== null && !SERVED.includes(header)) return rpcJsonReply(400, rpcError(null, -32600, "MCP-Protocol-Version is not a served revision."));
      if (header === MODERN) return notAllowed();
      if (sessionId === null) return header === LEGACY ? rpcJsonReply(400, rpcError(null, -32600, "Mcp-Session-Id is required.")) : notAllowed();
      await this.generation.expireIdle();
      const session = this.sessions.get(sessionId);
      if (!session) return bare(404);
      if (method === "GET" && !(await this.generation.touch(session))) return bare(404);
      return method === "GET" ? this.#stream(session, request) : this.generation.endSession(session, true).then(() => bare(200));
    }
    if (method !== "POST") return notAllowed();
    const body = await this.#body(request);
    if (body.status === "too-large") return bare(413);
    if (body.status === "parse") return rpcJsonReply(400, rpcError(null, -32700, "Parse error"));
    const message = body.value;
    if (Array.isArray(message)) return rpcJsonReply(400, rpcError(null, -32600, "Batches are not served."));
    if (!isFrame(message)) return rpcJsonReply(400, rpcError(null, -32600, "Invalid Request: a JSON-RPC 2.0 request or notification is expected."));
    const m = message;
    const id = m.id ?? null;
    const meta = isRecord(m.params) && isRecord(m.params["_meta"]) ? m.params["_meta"] : null;
    const named = meta && typeof meta[PROTOCOL_META] === "string" ? meta[PROTOCOL_META] : null;
    if (header !== null && !SERVED.includes(header)) return rpcJsonReply(400, unsupported(id));
    let revision: "modern" | "legacy";
    if (header === MODERN) revision = "modern";
    else if (header === LEGACY) revision = "legacy";
    else if (named !== null) return named === MODERN ? rpcJsonReply(400, rpcError(id, HEADER_MISMATCH, "MCP-Protocol-Version is required.")) : rpcJsonReply(400, unsupported(id));
    else if (m.method === "initialize") revision = "legacy";
    else if (sessionId !== null) { if (!this.sessions.has(sessionId)) return bare(404); revision = "legacy"; }
    else return rpcJsonReply(400, rpcError(id, -32600, `Not initialized: send initialize (${LEGACY}), or name the protocol version in _meta (${MODERN}).`));
    // Version consistency, in both directions, before anything is dispatched.
    if (revision === "modern" && named !== MODERN) return rpcJsonReply(400, rpcError(id, HEADER_MISMATCH, "MCP-Protocol-Version and _meta's protocol version differ."));
    if (revision === "legacy" && named !== null) return rpcJsonReply(400, rpcError(id, HEADER_MISMATCH, "MCP-Protocol-Version and _meta's protocol version differ."));
    const notification = frameOf(m) === "notification";
    // A notification is accepted with 202 and no body. One whose method is only a request runs nothing and issues no session.
    if (notification && !isNotificationMethod(m.method!)) { this.port.wire.ignored++; return bare(202); }
    return revision === "modern" ? this.#modern(m, notification, request, dispatch) : this.#legacy(m, notification, sessionId, request, dispatch);
  }

  async #body(request: Request): Promise<Body> {
    if (Number(request.headers.get("content-length") ?? 0) > this.port.bodyBytes) return { status: "too-large" };
    if (!request.body) return { status: "parse" };
    try {
      const reader = request.body.getReader();
      const decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: false });
      let text = "";
      let size = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > this.port.bodyBytes) { await reader.cancel(); return { status: "too-large" }; }
        text += decoder.decode(value, { stream: true });
      }
      text += decoder.decode();
      return { status: "ok", value: JSON.parse(text) };
    } catch { return { status: "parse" }; }
  }

  async #modern(m: Message, notification: boolean, request: Request, dispatch?: DispatchContext): Promise<Response> {
    const id = m.id ?? null;
    const methodHeader = request.headers.get("mcp-method");
    if (methodHeader === null || !safeHeader(methodHeader) || methodHeader !== m.method) return rpcJsonReply(400, rpcError(id, HEADER_MISMATCH, "Mcp-Method must name the request's method."));
    if (m.method === "tools/call" || m.method === "prompts/get") {
      const name = request.headers.get("mcp-name");
      const params = isRecord(m.params) ? m.params : {};
      const decoded = name !== null && safeHeader(name) ? decodeName(name) : null;
      if (decoded === null || decoded !== params["name"]) return rpcJsonReply(400, rpcError(id, HEADER_MISMATCH, `Mcp-Name must name the ${m.method === "prompts/get" ? "prompt" : "tool"}.`));
    }
    if (m.method === "subscriptions/listen" && !notification) {
      if ((this.port.streamCount?.() ?? this.generation.streams) >= STREAMS_MOST) return rpcJsonReply(409, rpcError(id, TOO_MANY_STREAMS, `At most ${STREAMS_MOST} streams are open at once.`));
      return this.#listen(m, dispatch);
    }
    const response = await this.port.wire.handle(m, null, () => {}, undefined, this.port.resourceDomain?.(request), dispatch);
    if (!response) return bare(202);
    return rpcJsonReply(response.error?.code === -32601 ? 404 : 200, response);
  }

  async #legacy(m: Message, notification: boolean, sessionId: string | null, request: Request, dispatch?: DispatchContext): Promise<Response> {
    const id = m.id ?? null;
    await this.generation.expireIdle();
    let session: LegacySession;
    let issued: string | null = null;
    if (m.method === "initialize" && !notification) {
      // The new session is admitted first (its capabilities validated and its row kept) and only then does a 17th end the
      // oldest: a refused initialize destroys nothing, and the limit holds once the newcomer is in.
      issued = this.port.mintSession();
      session = this.generation.beginIssue(issued);
    } else {
      if (sessionId === null) return rpcJsonReply(400, rpcError(id, -32600, "Mcp-Session-Id is required."));
      const matched = this.sessions.get(sessionId);
      if (!matched) return bare(404);
      session = matched;
      if (!(await this.generation.touch(session))) return bare(404);
    }
    let response: Message | null;
    try { response = await this.port.wire.handle(m, session, (out) => session.stream?.send(out), undefined, this.port.resourceDomain?.(request), dispatch); }
    finally { this.generation.finishedIssuing(session); }
    if (issued) {
      const admitted = await this.generation.acceptIssue(session, response);
      if (admitted === "closed") return bare(this.generation.due() ? 401 : 404);
      if (admitted === "refused") return rpcJsonReply(response!.error!.code === SESSION_FULL ? 507 : 200, response!);
    }
    if (!response) return bare(202);
    return rpcJsonReply(200, response, issued ? { "mcp-session-id": issued } : {});
  }

  /** One server-sent event stream. `onCancel` runs when the client goes away. */
  #sse(onCancel: () => void): { body: ReadableStream<Uint8Array>; send: (text: string) => void; close: () => void } {
    const encoder = new TextEncoder();
    let controller!: ReadableStreamDefaultController<Uint8Array>;
    let closed = false;
    const body = new ReadableStream<Uint8Array>({ start: (c) => { controller = c; }, cancel: () => { closed = true; onCancel(); } });
    return {
      body,
      send: (text) => { if (closed) return; try { controller.enqueue(encoder.encode(text)); } catch { closed = true; } },
      close: () => { if (closed) return; closed = true; try { controller.close(); } catch { /* already gone */ } },
    };
  }

  /**
   * The 2025-11-25 session's stream. A second `GET` replaces the first, which closes without detaching its replacement. The
   * session owns its one slot from the moment an opening is admitted, across every opening pending for it and the stream it
   * holds, until it has no stream and no opening pending: a fresh open takes the session's slot or is refused, a replacement
   * takes nothing new, the incumbent's cancellation during a pending opening frees nothing, and however many replacements
   * overlap and abort in whatever order, a session with a live stream is counted exactly once. It takes the whole request, not
   * its signal: on Node a request's signal follows its source only while the request is reachable, so a signal held alone can
   * miss a client's going away.
   */
  async #stream(session: LegacySession, request: Request): Promise<Response> {
    if (this.generation.closed || this.generation.due()) { if (!this.generation.retained) await this.closeAll(); return bare(this.generation.due() ? 401 : 404); }
    if (!this.generation.canOpenLegacy(session)) return rpcJsonReply(409, rpcError(null, TOO_MANY_STREAMS, `At most ${STREAMS_MOST} streams are open at once.`));
    const exit = this.generation.beginLegacyStream(session);
    // Reconciliation before the stream is attached: a change made while no stream was open, or while the object was evicted, is
    // told once now, unless the client has listed since.
    let generation: Digest | null = null;
    try { generation = (await this.port.wire.service.snapshot()).generation; } catch { generation = null; }
    // The session may have ended, the layer been discarded, or the client gone, while the snapshot was read: then no stream opens.
    if (this.generation.closed || this.generation.due()) { exit(); if (!this.generation.retained) await this.closeAll(); return bare(this.generation.due() ? 401 : 404); }
    if (session.ended || (session.id !== null && !this.sessions.has(session.id))) { exit(); return bare(404); }
    if (request.signal.aborted) { exit(); return bare(204); }
    const sse = this.#sse(() => this.generation.cancelLegacyStream(session, stream));
    const stream: Stream = {
      notified: null,
      send: (message) => sse.send(`event: message\ndata: ${JSON.stringify(message)}\n\n`),
      close: (final) => { if (final) sse.send("event: end\ndata: {}\n\n"); sse.close(); },
    };
    this.generation.replaceLegacyStream(session, stream);
    exit();
    sse.send(": stream\n\n");
    // A session that has listed is told once of a generation it has not listed; one that never listed has nothing to reconcile.
    if (generation !== null) {
      stream.notified = generation;
      if (session.listed !== null && generation !== session.listed) stream.send({ jsonrpc: "2.0", method: "notifications/tools/list_changed" });
    }
    this.port.wire.watchLegacy(session);
    return new Response(sse.body, { status: 200, headers: SSE });
  }

  /**
   * A 2026-07-28 listen: its own stream, ended by the client, by the subscription's end, or by the server. A graceful ending
   * completes the subscription (its result, as the revision defines) and closes the body; an abrupt one sends nothing.
   */
  #listen(m: Message, dispatch?: DispatchContext): Response {
    if (this.generation.closed || this.generation.due()) { if (!this.generation.retained) void this.closeAll().catch(() => {}); return bare(this.generation.due() ? 401 : 404); }
    const owner = {};
    const sse = this.#sse(() => this.generation.cancelListen(owner));
    const send = (out: Message) => {
      sse.send(`event: message\ndata: ${JSON.stringify(out)}\n\n`);
      if (out.id !== undefined && (out.result !== undefined || out.error !== undefined)) { sse.close(); this.generation.completeListen(owner); }
    };
    // Register teardown before a deadline callback can close this layer.
    this.generation.registerListen(owner, sse.close);
    if (this.generation.closed || this.generation.due()) { if (!this.generation.retained) void this.closeAll().catch(() => {}); return bare(this.generation.due() ? 401 : 404); }
    this.port.wire.handle(m, null, send, owner, undefined, dispatch).then((response) => { if (response) send(response); }, () => send(rpcError(m.id ?? null, -32603, "Internal error")));
    return new Response(sse.body, { status: 200, headers: SSE });
  }

  abrupt(): void { this.generation.abrupt(); }
  detach(): void { this.generation.detach(); }
  closeAll(): Promise<void> { return this.generation.graceful(); }
}
