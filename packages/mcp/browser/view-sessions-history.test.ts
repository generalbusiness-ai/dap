/** Scripted parent envelopes and DOM styles, with real bridge timers and
 * event dispatch. Browser histories own the visible recovery control. */
import { afterEach, expect, test, vi } from "vitest";
import { AppBridge } from "./bridge.ts";
import { TOOL_WAIT_MS } from "../src/views/waits.ts";

function heldHost() {
  const messages: Record<string, unknown>[] = [];
  const target = new EventTarget();
  const emit = (data: unknown) => {
    const event = new Event("message");
    Object.defineProperties(event, { source: { value: parent }, data: { value: data } });
    target.dispatchEvent(event);
  };
  const parent = { postMessage(message: Record<string, unknown>) {
    messages.push(message);
    if (message["method"] === "ui/initialize") queueMicrotask(() => emit({
      jsonrpc: "2.0", id: message["id"], result: { protocolVersion: "2026-01-26" },
    }));
  } };
  vi.stubGlobal("window", Object.assign(target, { parent }));
  vi.stubGlobal("document", { documentElement: { dataset: {}, style: { setProperty() {} } } });
  return { messages, emit };
}

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

test("a late reply after the card timeout settles the original without repeating its call", async () => {
  vi.useFakeTimers();
  const peer = heldHost(), bridge = new AppBridge();
  const observed = { waiterSettlements: 0, originalSettlements: 0 };
  try {
    await bridge.initialize();
    // The callback contract makes completion observable after the caller's
    // wait ends. Reflect also exercises the old two-argument implementation:
    // it accepts the call, ignores this callback, and fails the assertion.
    const pending = Reflect.apply(bridge.tool, bridge, ["view_act", { view: "original", cut: 0, action: "view-diff" },
      () => { observed.originalSettlements++; }]) as Promise<Record<string, unknown>>;
    const outcome = pending.then(() => { observed.waiterSettlements++; return "answered"; }, error => {
      observed.waiterSettlements++; return error instanceof Error ? error.message : String(error);
    });
    const request = peer.messages.find(message => message["method"] === "tools/call")!;
    await vi.advanceTimersByTimeAsync(TOOL_WAIT_MS);
    expect(await outcome).toBe("The app did not answer tools/call in 120 seconds.");
    expect(observed).toEqual({ waiterSettlements: 1, originalSettlements: 0 });
    const reply = { jsonrpc: "2.0", id: request["id"], result: { structuredContent: { retained: "complete" } } };
    peer.emit(reply);
    expect(observed, "The original receives one late completion after its caller stopped waiting.")
      .toEqual({ waiterSettlements: 1, originalSettlements: 1 });
    peer.emit(reply);
    expect(observed).toEqual({ waiterSettlements: 1, originalSettlements: 1 });
    expect(peer.messages.filter(message => message["method"] === "tools/call")).toHaveLength(1);
  } finally { bridge.close(); }
});
