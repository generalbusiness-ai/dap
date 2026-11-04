import { TOOL_WAIT_MS } from "../src/views/waits.ts";

type Object_ = Record<string, unknown>;
const record = (value: unknown): value is Object_ => typeof value === "object" && value !== null && !Array.isArray(value);
export interface HostContext {
  theme?: "light" | "dark";
  displayMode?: "inline" | "fullscreen" | "pip";
  styles?: { variables?: Record<string, string> };
  [key: string]: unknown;
}
/** A message the app answers itself, with no server call behind it. */
const HOST_WAIT_MS = 10_000;
// Both revisions use the same initialization, tool, host-style, size, mode and teardown envelopes.
// A version grants no tool authority. A host may still refuse an optional method.
const APP_REVISIONS = ["2026-01-26", "2025-11-21"] as const;
export class AppToolError extends Error {
  constructor(message: string, readonly reason?: string) { super(message); }
}

/** Standard MCP Apps JSON-RPC over the host's sandbox relay. No provider global is required. */
export class AppBridge {
  #next = 0;
  #closed = false;
  #negotiationError: Error | null = null;
  #pending = new Map<number, { resolve(value: Object_): void; reject(error: Error): void; timer: ReturnType<typeof setTimeout>; timedOut: boolean; onLate?: () => void }>();
  #listeners = new Set<(method: string, params: Object_) => void>();
  #input: Object_ | null = null;
  #inputWaiters = new Set<{ resolve(input: Object_): void; reject(error: Error): void; timer: ReturnType<typeof setTimeout> }>();
  context: HostContext = {};
  constructor() { window.addEventListener("message", this.#receive); }
  #send(message: Object_) {
    if (this.#negotiationError) throw this.#negotiationError;
    if (this.#closed) throw new Error("The host closed this card.");
    window.parent.postMessage({ jsonrpc: "2.0", ...message }, "*");
  }
  notify(method: string, params: Object_ = {}) { this.#send({ method, params }); }
  request(method: string, params: Object_ = {}, wait = HOST_WAIT_MS, onLate?: () => void): Promise<Object_> {
    if (this.#negotiationError) return Promise.reject(this.#negotiationError);
    if (this.#closed) return Promise.reject(new Error("The host closed this card."));
    if (this.#pending.size >= 32) return Promise.reject(new Error("The card is waiting for too many host replies."));
    const id = ++this.#next;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const pending = this.#pending.get(id);
        if (!pending) return;
        // The caller's wait ends once. An interested card can still learn
        // that this exact request replied later, without repeating it.
        if (onLate) pending.timedOut = true; else this.#pending.delete(id);
        reject(new Error(`The app did not answer ${method} in ${wait / 1000} seconds.`));
      }, wait);
      this.#pending.set(id, { resolve, reject, timer, timedOut: false, ...(onLate ? { onLate } : {}) });
      try { this.#send({ id, method, params }); }
      catch (error) { clearTimeout(timer); this.#pending.delete(id); reject(error); }
    });
  }
  #receive = (event: MessageEvent) => {
    if (event.source !== window.parent || !record(event.data) || event.data["jsonrpc"] !== "2.0") return;
    const message = event.data;
    if (typeof message["id"] === "number" && !Object.hasOwn(message, "method")) {
      const pending = this.#pending.get(message["id"]);
      if (!pending) return;
      clearTimeout(pending.timer);
      this.#pending.delete(message["id"]);
      if (pending.timedOut) { pending.onLate?.(); return; }
      if (record(message["error"])) pending.reject(new Error(String(message["error"]["message"] ?? "The host refused the request.")));
      else if (record(message["result"])) pending.resolve(message["result"]);
      else pending.reject(new Error("The host returned a malformed reply."));
      return;
    }
    const method = message["method"];
    const params = record(message["params"]) ? message["params"] : {};
    if (method === "ui/resource-teardown") {
      if (message["id"] !== undefined) this.#send({ id: message["id"], result: {} });
      for (const listener of this.#listeners) listener(method, params);
      this.close();
      return;
    }
    if (method === "ping" && message["id"] !== undefined) { this.#send({ id: message["id"], result: {} }); return; }
    if (method === "ui/notifications/host-context-changed") this.#context(params);
    if (method === "ui/notifications/tool-input" && record(params["arguments"]) && this.#input === null) {
      this.#input = params["arguments"];
      for (const waiter of this.#inputWaiters) { clearTimeout(waiter.timer); waiter.resolve(this.#input); }
      this.#inputWaiters.clear();
    }
    if (typeof method === "string") for (const listener of this.#listeners) listener(method, params);
  };
  #context(update: HostContext) {
    this.context = { ...this.context, ...update, styles: { ...this.context.styles, ...update.styles, variables: { ...this.context.styles?.variables, ...update.styles?.variables } } };
    const root = document.documentElement;
    root.dataset["theme"] = this.context.theme ?? "light";
    for (const [name, value] of Object.entries(this.context.styles?.variables ?? {})) {
      if (/^--[a-z0-9-]+$/.test(name) && typeof value === "string") root.style.setProperty(name, value);
    }
  }
  on(listener: (method: string, params: Object_) => void) { this.#listeners.add(listener); return () => this.#listeners.delete(listener); }
  async initialize() {
    const reply = await this.request("ui/initialize", { protocolVersion: APP_REVISIONS[0], appInfo: { name: "dap cards", version: "0.1.0-dev.1" }, appCapabilities: { availableDisplayModes: ["inline", "fullscreen"] } });
    const revision = reply["protocolVersion"];
    if (!APP_REVISIONS.some(supported => supported === revision)) {
      const named = typeof revision === "string" ? JSON.stringify(revision.slice(0, 128)) : revision === undefined ? "[missing]" : `[${typeof revision}]`;
      this.#negotiationError = new Error(`This host returned unsupported MCP Apps revision ${named}. Supported revisions are ${APP_REVISIONS.join(" and ")}.`);
      this.close();
      throw this.#negotiationError;
    }
    if (record(reply["hostContext"])) this.#context(reply["hostContext"] as HostContext);
    this.notify("ui/notifications/initialized");
  }
  input(): Promise<Object_> {
    if (this.#input) return Promise.resolve(this.#input);
    return new Promise((resolve, reject) => {
      const waiter = { resolve, reject, timer: setTimeout(() => { this.#inputWaiters.delete(waiter); reject(new Error("The host did not supply the opening tool input. Open this card again.")); }, 10_000) };
      this.#inputWaiters.add(waiter);
    });
  }
  async tool(name: string, args: Object_, onLate?: () => void): Promise<Object_> {
    const reply = await this.request("tools/call", { name, arguments: args }, TOOL_WAIT_MS, onLate);
    let data = reply["structuredContent"];
    if (!record(data) && Array.isArray(reply["content"])) {
      const text = reply["content"].find((part: unknown) => record(part) && part["type"] === "text");
      if (record(text) && typeof text["text"] === "string") { try { data = JSON.parse(text["text"]); } catch { /* the message below keeps the original card */ } }
    }
    if (!record(data)) throw new Error("The app tool returned no readable card data.");
    if (reply["isError"] === true) throw new AppToolError(String(data["message"] ?? "The app tool refused this request."), typeof data["reason"] === "string" ? data["reason"] : undefined);
    return data;
  }
  async displayMode(mode: "inline" | "fullscreen"): Promise<string> {
    const result = await this.request("ui/request-display-mode", { mode });
    const actual = result["mode"];
    if (!["inline", "fullscreen", "pip"].includes(String(actual))) throw new Error("The host returned no actual display mode.");
    this.context.displayMode = actual as "inline" | "fullscreen" | "pip";
    return actual as string;
  }
  close() {
    if (this.#closed) return;
    this.#closed = true;
    window.removeEventListener("message", this.#receive);
    for (const pending of this.#pending.values()) {
      clearTimeout(pending.timer);
      if (!pending.timedOut) pending.reject(new Error("The host closed this card."));
    }
    this.#pending.clear();
    this.#listeners.clear();
    for (const waiter of this.#inputWaiters) { clearTimeout(waiter.timer); waiter.reject(new Error("The host closed this card.")); }
    this.#inputWaiters.clear();
  }
}
