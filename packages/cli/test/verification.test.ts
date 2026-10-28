import { expect, test } from "vitest";
import { Verification } from "../src/verification.ts";
import { Stop } from "../src/command-support.ts";

// Scripted byte streams and elapsed clock; no service, session or verifier runs.
test("one verification owner counts received chunks, cancels a rejected chunk and permits exact completed work", async () => {
  for (const bytes of [3, 2]) {
    let cancels = 0;
    const budget = new Verification({ limits: { bytes, entries: 2 }, monotonicNow: () => 0 });
    try {
      budget.at("replay", "TEST-scope", 7);
      const fetch = budget.fetch(async () => ({ status: 200, body: { getReader: () => ({ read: async () => ({ done: false, value: new Uint8Array(3) }), cancel: async () => { cancels++; } }) } }));
      const reader = (await fetch("https://test.invalid/v1/scopes/TEST-scope/log?cursor=7")).body!.getReader();
      if (bytes === 3) {
        expect((await reader.read()).value?.byteLength).toBe(3);
        budget.entries(2); budget.check(); // Completed work exactly at both allowances is allowed.
        budget.at("replay", "TEST-next", 0);
        expect(() => budget.historyRead()).toThrow(/Stopped at replay, scope TEST-next, input cursor 0: verification entries/);
      } else {
        const result = await reader.read().then(() => "unexpected admission", error => error);
        expect(result).toBeInstanceOf(Stop);
        expect((result as Stop).outcome.lines.join("\n")).toContain("3 received bytes");
        expect((result as Stop).outcome.lines.join("\n")).toContain("verification bytes");
        expect(cancels).toBeGreaterThan(0);
      }
    } finally { budget.close(); }
  }
});

test("a stopped verification ignores a delayed reply and starts no later HTTP read", async () => {
  let clock = 0, calls = 0, release!: (response: { status: number; body: null }) => void;
  const budget = new Verification({ limits: { milliseconds: 1000 }, monotonicNow: () => clock });
  try {
    budget.at("discovery", "TEST-scope", "next-page");
    const fetch = budget.fetch(async () => { calls++; return new Promise(resolve => { release = resolve; }); });
    const pending = fetch("https://test.invalid/v1/scopes/TEST-scope/history?cursor=next-page").then(() => "unexpected success", error => error);
    await Promise.resolve(); await Promise.resolve();
    clock = 1000;
    expect(() => budget.check()).toThrow(/input cursor "next-page": verification time/);
    release({ status: 200, body: null });
    expect(await pending).toBeInstanceOf(Stop);
    await expect(fetch("https://test.invalid/v1/scopes/TEST-next/history")).rejects.toThrow(/verification time/);
    expect(calls).toBe(1);
  } finally { budget.close(); }
  expect(() => new Verification({ limits: { milliseconds: 2_147_483_648 } })).toThrow(/2147483647/);
});
