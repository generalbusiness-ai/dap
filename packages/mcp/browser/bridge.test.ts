import { afterEach, expect, test, vi } from "vitest";
import { AppBridge } from "./bridge.ts";
import { JSONRPCMessageSchema } from "@modelcontextprotocol/core";

const coreMessages = (messages: readonly unknown[]) => {
  for (const message of messages) expect(JSONRPCMessageSchema.safeParse(message).success).toBe(true);
};

// Scripted parent messages and DOM styles, with the actual bridge and event dispatch.
// Live Goose and Claude scenes own rendering and native tool authority.
function host(revision: unknown, options: { reply?: unknown; hold?: "initialize" | "input" | "tool" } = {}) {
  const messages: Record<string, unknown>[] = [];
  const target = new EventTarget();
  const emit = (data: unknown) => {
    const event = new Event("message");
    Object.defineProperties(event, { source: { value: parent }, data: { value: data } });
    target.dispatchEvent(event);
  };
  const parent = { postMessage(message: Record<string, unknown>, origin: string) {
    expect(origin).toBe("*"); messages.push(message);
    const method = message["method"];
    if (method === "ui/initialize" && options.hold !== "initialize") queueMicrotask(() => emit({ jsonrpc: "2.0", id: message["id"], result: Object.hasOwn(options, "reply") ? options.reply : {
      protocolVersion: revision, hostContext: { theme: "dark", styles: { variables: { "--font-sans": "system-ui" } } },
    } }));
    if (method === "ui/notifications/initialized" && options.hold !== "input") queueMicrotask(() => emit({ jsonrpc: "2.0", method: "ui/notifications/tool-input", params: { arguments: { view: "scripted-view" } } }));
    if (method === "tools/call" && options.hold !== "tool") queueMicrotask(() => emit({ jsonrpc: "2.0", id: message["id"], result: { structuredContent: { received: true } } }));
  } };
  const styles = vi.fn(), dataset: Record<string, string> = {};
  vi.stubGlobal("window", Object.assign(target, { parent }));
  vi.stubGlobal("document", { documentElement: { dataset, style: { setProperty: styles } } });
  return { messages, styles, dataset, emit };
}

afterEach(() => vi.unstubAllGlobals());

test.each(["2026-01-26", "2025-11-21"])("the bridge accepts supported %s after offering its latest revision and keeps the common read envelopes", async revision => {
  const peer = host(revision), bridge = new AppBridge();
  try {
    await bridge.initialize();
    expect(peer.messages.map(message => message["method"])).toEqual(["ui/initialize", "ui/notifications/initialized"]);
    expect((peer.messages[0]!["params"] as Record<string, unknown>)["protocolVersion"]).toBe("2026-01-26");
    expect(await bridge.input()).toEqual({ view: "scripted-view" });
    expect([peer.dataset["theme"], peer.styles.mock.calls]).toEqual(["dark", [["--font-sans", "system-ui"]]]);
    expect(await bridge.tool("view_read", { view: "scripted-view" })).toEqual({ received: true });
    expect(peer.messages.at(-1)).toMatchObject({ method: "tools/call", params: { name: "view_read", arguments: { view: "scripted-view" } } });
    coreMessages(peer.messages);
  } finally { bridge.close(); }
});

test("an unsupported revision is named and refuses initialization and every later tool request", async () => {
  const peer = host("2099-01-01"), bridge = new AppBridge();
  const error = 'This host returned unsupported MCP Apps revision "2099-01-01". Supported revisions are 2026-01-26 and 2025-11-21.';
  try {
    const failure = (work: Promise<unknown>) => work.then(() => null, reason => reason instanceof Error ? reason.message : String(reason));
    expect(await failure(bridge.initialize())).toBe(error);
    expect(await failure(bridge.tool("view_read", { view: "scripted-view" }))).toBe(error);
    expect(peer.messages.map(message => message["method"])).toEqual(["ui/initialize"]);
    expect(peer.dataset).toEqual({});
    coreMessages(peer.messages);
  } finally { bridge.close(); }
});

test.each(["2026-01-26", "2025-11-21"] as const)("a %s reply without optional capabilities still initializes and reads", async revision => {
  const peer = host(revision, { reply: { protocolVersion: revision } }), bridge = new AppBridge();
  try {
    await bridge.initialize();
    expect(await bridge.input()).toEqual({ view: "scripted-view" });
    expect(await bridge.tool("view_read", { view: "scripted-view" })).toEqual({ received: true });
    expect(peer.dataset).toEqual({});
    coreMessages(peer.messages);
  } finally { bridge.close(); }
});

test.each([
  { name: "primitive result", reply: 42, error: "The host returned a malformed reply." },
  { name: "missing revision", reply: {}, error: "This host returned unsupported MCP Apps revision [missing]. Supported revisions are 2026-01-26 and 2025-11-21." },
])("a malformed initialize $name sends no follow-up request", async ({ reply, error }) => {
  const peer = host("2026-01-26", { reply }), bridge = new AppBridge();
  try {
    await expect(bridge.initialize()).rejects.toThrow(error);
    expect(peer.messages.map(message => message["method"])).toEqual(["ui/initialize"]);
    coreMessages(peer.messages);
  } finally { bridge.close(); }
});

test.each(["initialize", "input", "tool"] as const)("teardown while %s waits settles once and replies without repeating a call", async hold => {
  const peer = host("2026-01-26", { hold }), bridge = new AppBridge();
  try {
    if (hold !== "initialize") await bridge.initialize();
    const pending = hold === "initialize" ? bridge.initialize() : hold === "input" ? bridge.input() : bridge.tool("view_read", { view: "scripted-view" });
    const outcome = pending.then(() => "unexpected success", error => error instanceof Error ? error.message : String(error));
    peer.emit({ jsonrpc: "2.0", id: 901, method: "ui/resource-teardown", params: {} });
    expect(await outcome).toBe("The host closed this card.");
    expect(peer.messages.filter(message => message["method"] === "tools/call")).toHaveLength(hold === "tool" ? 1 : 0);
    expect(peer.messages.filter(message => message["id"] === 901)).toEqual([{ jsonrpc: "2.0", id: 901, result: {} }]);
    coreMessages(peer.messages);
  } finally { bridge.close(); }
});

// Scripted native-control/event ports exercise the actual binding lifecycle, not browser default activation.
test("a held activation key keeps its first binding through repeats, cancellation and physical release", async () => {
  class ControlPort extends EventTarget { disabled = false; isConnected = true; childNodes = []; }
  const windowPort = new EventTarget(), listeners = new Map<string, Set<EventListenerOrEventListenerObject>>();
  const add = windowPort.addEventListener.bind(windowPort), remove = windowPort.removeEventListener.bind(windowPort);
  vi.spyOn(windowPort, "addEventListener").mockImplementation((type, listener, options) => {
    if (listener) { const rows = listeners.get(type) ?? new Set(); rows.add(listener); listeners.set(type, rows); }
    add(type, listener, options);
  });
  vi.spyOn(windowPort, "removeEventListener").mockImplementation((type, listener, options) => {
    if (listener) listeners.get(type)?.delete(listener);
    remove(type, listener, options);
  });
  vi.stubGlobal("window", windowPort); vi.stubGlobal("HTMLElement", ControlPort); vi.stubGlobal("HTMLButtonElement", ControlPort);
  const { bindControl, updateControlBinding, retireControls } = await import("./reconcile.ts");
  const element = new HTMLButtonElement(), activations: string[] = [], captures: string[] = [];
  const bind = (revision: string) => {
    bindControl(element, "report", () => { captures.push(revision); return () => { activations.push(revision); }; });
    updateControlBinding(element, element);
  };
  const emit = (target: EventTarget, type: string, fields: Record<string, unknown> = {}) => {
    const event = new Event(type, { cancelable: true });
    Object.defineProperties(event, Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, { value }])));
    target.dispatchEvent(event);
  };
  const down = (key: string, repeat = false) => emit(element, "keydown", { key, repeat });
  const up = (key: string) => emit(windowPort, "keyup", { key, composedPath: () => [element, windowPort] });
  const click = () => emit(element, "click", { detail: 0 }); // Explicitly scripted; this is not proof of native keyboard activation.
  try {
    bind("A"); down(" "); bind("B"); down(" ", true); down(" "); up("Shift"); up(" "); click();
    expect(activations, "Space's repeat and unrelated release must not replace A with B").toEqual(["A"]);
    expect(captures).toEqual(["A"]);
    bind("C"); down("Enter"); click(); bind("D"); down("Enter", true); click(); down("Enter"); click();
    expect(activations, "Enter's repeated native-click port must not become a fresh D activation").toEqual(["A", "C"]);
    up("Enter"); click();
    expect(activations).toEqual(["A", "C", "D"]);
    bind("E"); down("Enter"); emit(windowPort, "blur"); bind("F"); down("Enter", true); click();
    expect(activations, "A cancelled held key cannot recapture after refresh/re-enable").toEqual(["A", "C", "D"]);
    click(); // No active gesture: an assistive-style activation reads F.
    expect(activations).toEqual(["A", "C", "D", "F"]);
    bind("G"); down(" "); emit(windowPort, "blur"); bind("H"); down(" "); up(" "); click();
    expect(activations, "A fresh nonrepeat start after a missed release must not remain latched").toEqual(["A", "C", "D", "F", "H"]);
    bind("I"); down(" "); retireControls(element);
    expect(listeners.get("keyup")?.size ?? 0, "Retirement removes the last window release listener").toBe(0);
    expect(listeners.get("blur")?.size ?? 0).toBe(0);
    expect(captures).toEqual(["A", "C", "D", "E", "F", "G", "H", "I"]);
  } finally { retireControls(element); }
});
