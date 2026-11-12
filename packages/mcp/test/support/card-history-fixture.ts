/** Real AppBridge, view tools and ViewSessions. Parent messages, card data,
 * native signing/settlement ports and DOM styles are stand-ins. */
import { vi } from "vitest";
import { AppBridge, AppToolError } from "../../browser/bridge.ts";
import { TOOL_WAIT_MS } from "../../src/views/waits.ts";
import { ViewSessions } from "../../src/views/session.ts";
import { viewTools } from "../../src/views/tools.ts";
import type { Display, Projection } from "../../src/views/types.ts";
import type { CallResult } from "../../src/service.ts";
import type { CardCommand, Delay, ReadResult, VisibleCut } from "./card-history-ledger.ts";

// Node has the event types. This test context supplies only the two globals
// the bridge reads. Production browser compilation keeps its real DOM types.
declare global {
  var window: {
    parent: { postMessage(message: Record<string, unknown>, origin: string): void };
    addEventListener(type: "message", listener: (event: MessageEvent) => void): void;
    removeEventListener(type: "message", listener: (event: MessageEvent) => void): void;
  };
  var document: { documentElement: { dataset: Record<string, string>; style: { setProperty(name: string, value: string): void } } };
}

type Object_ = Record<string, unknown>;
const latch = () => { let release!: () => void; const promise = new Promise<void>(resolve => { release = resolve; }); return { promise, release }; };
type Gate = { process: 0 | 1; view: string; cut: number; delay: Delay; result: ReadResult; admitted: boolean;
  wait: "waiting" | "timeout" | "closed" | "answered" | "refused"; entered: ReturnType<typeof latch>; held: ReturnType<typeof latch> };
type Context = { process: 0 | 1; view: string; gate: Gate | null; result: ReadResult; answer: "accepted" | "unknown" };
const answer = (value: string): CallResult => ({ content: [{ type: "text", text: value }], structuredContent: { answer: value }, isError: false });
const projection = (): Projection => ({ status: "ready", position: 0, count: 1, fallback: "TEST fixture", card: {
  identity: { kind: "fixture", item: "7", revision: "1", subject: { scope: "fixture-scope", item: 7 }, at: { on: 1 } },
  title: "TEST card", summary: "TEST history", body: "TEST text", wholeText: true,
  reasons: [], projection: [], reviewIntended: [], unavailable: [], waitsOn: [], settles: [], fallback: "TEST fixture",
  diffAvailable: true, diffRead: { target: "fixture-repository", base: "a".repeat(40), integration: "b".repeat(40) },
  actions: [{ id: "apply", label: "Apply", purpose: "act", kind: "apply", args: { target: "fixture-scope", on: 7, at: { on: 1 } } }],
} });

export class CardHistoryFixture {
  process: 0 | 1 = 0;
  view = "";
  client: Display | null = null;
  closed = false;
  calls = 0;
  waiters = 0;
  late = 0;
  completed = 0;
  reads = 0;
  readonly writes: { key: unknown }[] = [];
  readonly checks: number[] = [];
  lastReason: string | null = null;
  pending: Gate | null = null;
  readonly sessions: [ViewSessions, ViewSessions];
  readonly tools: [ReturnType<typeof viewTools>, ReturnType<typeof viewTools>];
  readonly bridge: AppBridge;
  readonly #target = new EventTarget();
  readonly #known = new Map<string, { process: 0 | 1; view: string }>();
  readonly #handlers = new Set<Promise<void>>();
  readonly #contexts: [Context | null, Context | null] = [null, null];
  #armed: Gate | null = null;
  #result: ReadResult = "complete";
  #answer: "accepted" | "unknown" = "accepted";
  #pendingCall: Promise<Object_ | null> | null = null;
  #lastReply: Object_ | null = null;
  readonly #parent = { postMessage: (message: Object_) => {
    if (message["method"] === "ui/initialize") {
      queueMicrotask(() => this.#emit({ jsonrpc: "2.0", id: message["id"], result: { protocolVersion: "2026-01-26" } })); return;
    }
    if (message["method"] !== "tools/call") return;
    this.calls++;
    const params = message["params"] as Object_, args = params["arguments"] as Object_;
    const gate = params["name"] === "view_act" ? this.#armed : null;
    if (gate) this.#armed = null;
    const context: Context = { process: this.process, view: String(args["view"]), gate, result: this.#result, answer: this.#answer };
    const handler = this.#serve(message, context);
    this.#handlers.add(handler);
    void handler.then(() => this.#handlers.delete(handler), () => this.#handlers.delete(handler));
  } };

  constructor() {
    vi.stubGlobal("window", Object.assign(this.#target, { parent: this.#parent }));
    vi.stubGlobal("document", { documentElement: { dataset: {}, style: { setProperty() {} } } });
    this.sessions = [this.#session(0), this.#session(1)];
    this.tools = [viewTools(this.sessions[0]), viewTools(this.sessions[1])];
    this.bridge = new AppBridge();
  }
  initialize() { return this.bridge.initialize(); }
  #session(process: 0 | 1): ViewSessions {
    return new ViewSessions({ initialPage: () => "item", read: async () => projection() },
      () => ({ call: async () => { throw new Error("The fixture card source reads no native scope."); } }),
      async (_kind, args, admit) => {
        const context = this.#contexts[process]!;
        await admit(); this.writes.push({ key: args["idempotencyKey"] }); return answer(context.answer);
      },
      async args => { this.checks.push(this.writes.findIndex(write => write.key === args["idempotencyKey"]) + 1); return answer("accepted"); },
      () => null, { readExact: async (_read, admit) => {
        const context = this.#contexts[process]!, gate = context.gate;
        if (gate?.delay === "admission") { gate.entered.release(); await gate.held.promise; }
        await admit();
        if (gate) gate.admitted = true;
        this.reads++;
        if (gate?.delay === "result") { gate.entered.release(); await gate.held.promise; }
        return { content: [], isError: false, structuredContent: { text: `TEST ${context.result} read`, truncated: context.result === "truncated" } };
      } });
  }
  #emit(message: Object_) {
    const event = new Event("message");
    Object.defineProperties(event, { source: { value: this.#parent }, data: { value: message } });
    this.#target.dispatchEvent(event);
  }
  async #serve(message: Object_, context: Context) {
    const params = message["params"] as Object_, name = String(params["name"]), args = params["arguments"] as Object_;
    const gate = context.gate;
    if (gate?.delay === "relay") { gate.entered.release(); await gate.held.promise; }
    this.#contexts[context.process] = context;
    let frame: Object_;
    try {
      const tool = this.tools[context.process][name];
      if (!tool) throw new Error("Unknown fixture tool.");
      const result = await tool.run(args);
      if (name === "view_change" && !result.isError) this.#known.set(`${context.process}:${context.view}`, { process: context.process, view: context.view });
      frame = { jsonrpc: "2.0", id: message["id"], result };
    } catch (error) { frame = { jsonrpc: "2.0", id: message["id"], error: { code: -32603, message: String(error) } }; }
    if (gate) this.completed++;
    this.#lastReply = frame; this.#emit(frame);
  }
  #reason(error: unknown) {
    if (error instanceof AppToolError) return error.reason ?? "tool";
    const text = error instanceof Error ? error.message : String(error);
    return text.includes("did not answer tools/call") ? "timeout" : text === "The host closed this card." ? "closed" : text;
  }
  #call(name: string, args: Object_, gate?: Gate): Promise<Object_ | null> {
    const late = name === "view_act" ? () => { this.late++; } : undefined;
    return this.bridge.tool(name, args, late).then(data => {
      this.waiters++; this.lastReason = null;
      if (gate) gate.wait = "answered";
      if (data["display"]) this.client = data["display"] as Display;
      return data;
    }, error => {
      this.waiters++; this.lastReason = this.#reason(error);
      if (gate) gate.wait = this.lastReason === "timeout" ? "timeout" : this.lastReason === "closed" ? "closed" : "refused";
      return null;
    });
  }
  #act(action: string, gate?: Gate) { return this.#call("view_act", { view: this.view, cut: this.client?.cut ?? -1, action }, gate); }
  async run(command: CardCommand): Promise<void> {
    if (command.kind === "switch") { this.process = command.process; return; }
    if (command.kind === "open" || command.kind === "reopen") {
      if (command.kind === "open") this.view = command.view;
      if (await this.#call("view_change", { view: this.view })) await this.#call("view_read", { view: this.view });
    } else if (command.kind === "supersede") {
      await this.sessions[this.process].open(command.view, "change");
      this.#known.set(`${this.process}:${command.view}`, { process: this.process, view: command.view });
    } else if (command.kind === "read") await this.#call("view_read", { view: this.view });
    else if (command.kind === "refresh") await this.#call("view_read", { view: this.view, cut: this.client?.cut ?? -1, page: "item", refresh: true });
    else if (command.kind === "write") { this.#answer = command.answer; await this.#act("apply"); }
    else if (command.kind === "check") await this.#act(this.client?.card?.actions.find(action => action.purpose === "check-original")?.id ?? "missing-original");
    else if (command.kind === "exact") { this.#result = command.result; await this.#act("view-diff"); }
    else if (command.kind === "begin") {
      const gate: Gate = { process: this.process, view: this.view, cut: this.client?.cut ?? -1, delay: command.delay, result: command.result,
        admitted: false, wait: "waiting", entered: latch(), held: latch() };
      this.#result = command.result; this.pending = this.#armed = gate;
      this.#pendingCall = this.#act("view-diff", gate);
      // An unexpected early refusal becomes an ordinary snapshot mismatch,
      // rather than leaving the test stuck waiting on an unentered gate.
      await Promise.race([gate.entered.promise, this.#pendingCall]);
    } else if (command.kind === "timeout") { await vi.advanceTimersByTimeAsync(TOOL_WAIT_MS); await this.#pendingCall; }
    else if (command.kind === "release") {
      this.pending!.held.release(); await Promise.all([...this.#handlers]); await this.#pendingCall; this.pending = null;
    } else if (command.kind === "duplicate") { if (this.#lastReply) this.#emit(this.#lastReply); }
    else if (command.kind === "close") {
      this.#emit({ jsonrpc: "2.0", id: 9001, method: "ui/resource-teardown", params: {} });
      this.closed = true;
      if (this.pending?.wait === "waiting") await this.#pendingCall;
    } else if (command.kind === "probe-closed") await this.#call("view_read", { view: this.view });
  }
  #visible(display: Display): VisibleCut {
    return { view: display.view, cut: display.cut, active: display.active, page: display.query.page as "item" | "diff",
      original: display.card?.unresolvedOriginal === true, truncated: display.card?.shownRead?.truncated ?? null,
      apply: display.card?.actions.some(action => action.id === "apply") ?? false };
  }
  snapshot() {
    const mounts = [...this.#known.values()].sort((a, b) => a.process - b.process || a.view.localeCompare(b.view))
      .map(({ process, view }) => ({ process, ...this.#visible(this.sessions[process].display(view)) }));
    const active = [0, 1].map(process => mounts.find(card => card.process === process && card.active)?.view ?? null);
    return { process: this.process, view: this.view, active, client: this.client && this.#visible(this.client), closed: this.closed,
      calls: this.calls, waiters: this.waiters, late: this.late, completed: this.completed, reads: this.reads, writes: this.writes.length,
      signatures: this.reads + this.writes.length, checks: [...this.checks], lastReason: this.lastReason,
      pending: this.pending && { process: this.pending.process, view: this.pending.view, cut: this.pending.cut, delay: this.pending.delay,
        admitted: this.pending.admitted, wait: this.pending.wait }, mounts };
  }
  async finish() {
    if (this.pending) { this.pending.held.release(); await Promise.all([...this.#handlers]); await this.#pendingCall; }
    this.bridge.close();
  }
}
