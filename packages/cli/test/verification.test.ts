import { expect, test } from "vitest";
import type { Entry, ScopeRef, Seed } from "@generalbusiness/dap-contract";
import { canonicalize, entryHash, newIncarnation, scopeIdOf, textDigest } from "@generalbusiness/dap-bytes";
import { hashOfBytes } from "@generalbusiness/dap-replay";
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

// Hand-made entry shapes stand in for discovery and log replies. No scope
// judged these entries. Accounting grants no admission or replay proof.
const seed: Seed = { v: 1, kind: "directory", definition: "platform:directory@2", creator: null, cause: textDigest("TEST accounting"), ordinal: 0 };
const at: ScopeRef = { scope: scopeIdOf(seed), inc: newIncarnation(new Uint8Array(16).fill(1)), kind: "directory" };
const entry = (seq: number): Entry => ({ v: 1, at, seq, prev: null, time: "2099-01-01T00:00:00Z", clamped: false, epoch: 0,
  input: { type: "checkpoint", through: 0, state: textDigest("TEST state") }, uses: [], prepared: [], effects: [], sends: [] });
const sealed = (value: Entry) => ({ entry: value, hash: entryHash(value) });
const stored = (value: Entry) => ({ seq: value.seq, hash: entryHash(value), bytes: canonicalize(value) });

test("discovery and log copies count once at the entry ceiling while each delivery still costs bytes and an attempt", async () => {
  const progress: string[] = [], first = entry(0);
  const budget = new Verification({ limits: { entries: 1 }, monotonicNow: () => 0, progress: line => progress.push(line) });
  try {
    budget.at("discovery", at.scope);
    const fetch = budget.fetch(async () => new Response("abc"));
    const discovery = (await fetch("https://test.invalid/history")).body!.getReader();
    expect((await discovery.read()).value?.byteLength).toBe(3);
    await discovery.cancel();
    budget.sealedEntry(at.scope, sealed(first));
    budget.at("replay", at.scope, 0);
    const log = (await fetch("https://test.invalid/log")).body!.getReader();
    expect((await log.read()).value?.byteLength).toBe(3);
    await log.cancel();
    budget.storedEntry(at.scope, at, stored(first));
    budget.sealedEntry(at.scope, sealed(first));
    expect(budget.remaining().entries).toBe(0);
    budget.progress();
    expect(progress).toEqual([expect.stringContaining("6 received bytes; 2 HTTP attempts;")]);
    expect(() => budget.sealedEntry(at.scope, sealed(entry(1)))).toThrow(/verification entries limit; .*1 history entries/);
  } finally { budget.close(); }
  const nextCommand = new Verification({ limits: { entries: 1 }, monotonicNow: () => 0 });
  try { nextCommand.storedEntry(at.scope, at, stored(first)); expect(nextCommand.remaining().entries).toBe(0); }
  finally { nextCommand.close(); }
});

test("duplicate accounting never hides malformed bytes, a conflicting hash or a different source frame", () => {
  const first = entry(0), changed = { ...first, time: "2099-01-02T00:00:00Z" };
  const noncanonical = canonicalize(first) + "\n";
  const otherIncarnation = { ...at, inc: newIncarnation(new Uint8Array(16).fill(2)) };
  const replies: ((budget: Verification) => void)[] = [
    budget => budget.sealedEntry(at.scope, { entry: changed, hash: entryHash(first) }),
    budget => budget.storedEntry(at.scope, at, { ...stored(changed), hash: entryHash(first) }),
    budget => budget.storedEntry(at.scope, at, { seq: 0, hash: hashOfBytes(noncanonical), bytes: noncanonical }),
    budget => budget.storedEntry(at.scope, at, { ...stored(first), seq: 1 }),
    budget => budget.storedEntry(at.scope, otherIncarnation, stored(first)),
    budget => budget.sealedEntry(at.scope, sealed({ ...first, at: otherIncarnation })),
    budget => budget.storedEntry(at.scope, at, stored(changed)),
  ];
  for (const reply of replies) {
    const budget = new Verification({ limits: { entries: 1 }, monotonicNow: () => 0 });
    try {
      budget.sealedEntry(at.scope, sealed(first));
      expect(() => reply(budget)).toThrow(/entry's content, hash or scope frame conflicts/);
      expect(() => budget.sealedEntry(at.scope, sealed(first))).toThrow(/verification cancelled/);
    } finally { budget.close(); }
  }
  const retired = new Verification({ monotonicNow: () => 0 });
  retired.close();
  expect(() => retired.sealedEntry(at.scope, sealed(first))).toThrow(/verification cancelled/);
});
