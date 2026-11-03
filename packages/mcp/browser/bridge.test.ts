import { afterEach, expect, test, vi } from "vitest";
import { AppBridge } from "./bridge.ts";

// Scripted parent messages and DOM styles, with the actual bridge and event dispatch.
// Live Goose and Claude scenes own rendering and native tool authority.
function host(revision: unknown) {
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
    if (method === "ui/initialize") queueMicrotask(() => emit({ jsonrpc: "2.0", id: message["id"], result: {
      protocolVersion: revision, hostContext: { theme: "dark", styles: { variables: { "--font-sans": "system-ui" } } },
    } }));
    if (method === "ui/notifications/initialized") queueMicrotask(() => emit({ jsonrpc: "2.0", method: "ui/notifications/tool-input", params: { arguments: { view: "scripted-view" } } }));
    if (method === "tools/call") queueMicrotask(() => emit({ jsonrpc: "2.0", id: message["id"], result: { structuredContent: { received: true } } }));
  } };
  const styles = vi.fn(), dataset: Record<string, string> = {};
  vi.stubGlobal("window", Object.assign(target, { parent }));
  vi.stubGlobal("document", { documentElement: { dataset, style: { setProperty: styles } } });
  return { messages, styles, dataset };
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
  } finally { bridge.close(); }
});
