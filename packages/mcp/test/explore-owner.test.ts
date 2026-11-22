import { expect, test, vi } from "vitest";
import { memoryStore } from "@generalbusiness/dap-client";
import { issueDemo } from "@generalbusiness/dap-lanes";
import { McpService } from "../src/service.ts";
import { fixedSigner } from "./fixtures.ts";
import { SERVICE, StandIn } from "./support/standin.ts";

const input = (target: string) => ({ target, key: "owner-test", act: { kind: "comment", on: 0, fields: {} } });

// Invariant: one owner covers configuration reads as well as the replica.
test("a parallel exploration cannot enter configuration", async () => {
  const signer = fixedSigner(67), peer = new StandIn(signer.key), target = peer.lane(issueDemo);
  let release!: () => void, started!: () => void, calls = 0;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const entered = new Promise<void>(resolve => { started = resolve; });
  const service = new McpService({ service: SERVICE, signer, custody: memoryStore(), fetch: peer.fetch,
    config: { read: async () => { calls++; started(); await gate; return peer.config(); }, addRoot: async () => {} } });
  const first = service.call("explore", input(target.scope));
  await entered;
  expect((await service.call("explore", input(target.scope))).structuredContent["is"]).toBe("unavailable");
  expect(calls).toBe(1);
  release();
  await first;
});

// Invariant: a timed-out physical fetch retains the only slot until it settles.
test("a fetch that ignores cancellation cannot accumulate exploration owners", async () => {
  vi.useFakeTimers();
  try {
    const signer = fixedSigner(68), peer = new StandIn(signer.key), target = peer.lane(issueDemo);
    let release!: () => void, cancel!: () => void, started!: () => void, calls = 0, cancelCalled = false;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const cancelled = new Promise<void>((_resolve, reject) => { cancel = () => reject(new Error("scripted cancellation failure")); });
    const entered = new Promise<void>(resolve => { started = resolve; });
    const service = new McpService({ service: SERVICE, signer, custody: memoryStore(),
      fetch: async () => { calls++; started(); await gate; return { status: 200, body: { getReader: () => ({
        read: async () => ({ done: true }), cancel: () => { cancelCalled = true; return cancelled; },
      }) } }; },
      config: { read: async () => peer.config(), addRoot: async () => {} } });
    const first = service.call("explore", input(target.scope));
    await entered;
    await vi.advanceTimersByTimeAsync(10_001);
    expect((await first).structuredContent["is"]).toBe("unavailable");
    const before = calls;
    expect((await service.call("explore", input(target.scope))).structuredContent["is"]).toBe("unavailable");
    expect(calls).toBe(before);
    release();
    await vi.advanceTimersByTimeAsync(0);
    expect(cancelCalled).toBe(true);
    expect((await service.call("explore", input(target.scope))).structuredContent["is"]).toBe("unavailable");
    expect(calls).toBe(before);
    cancel();
    await vi.advanceTimersByTimeAsync(0);
    expect((await service.call("explore", input(target.scope))).structuredContent["is"]).toBe("unavailable");
    expect(calls).toBe(before);
  } finally { vi.useRealTimers(); }
});
