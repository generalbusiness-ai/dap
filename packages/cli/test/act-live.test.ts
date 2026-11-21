import { afterEach, expect, test, vi } from "vitest";
import { definitionDigest, textDigest, timeOf } from "@generalbusiness/dap-bytes";
import { ScopeHandle } from "@generalbusiness/dap-client";
import { liveBase } from "../../derive/test/definition-corpus/live-data.ts";
import { act } from "../src/command-scope.ts";
import { memoryStore } from "../src/store.ts";

const scope = { scope: `sc_${"a".repeat(52)}` as const, genesis: textDigest("act-live genesis") };
const head = { seq: 1, hash: textDigest("act-live head") };
const now = Date.parse("2099-01-01T00:00:00Z");
afterEach(() => vi.restoreAllMocks());

// The handle stand-in exposes dispatch and the live state used to sign.
async function fixture(live: boolean) {
  const definition = liveBase(live), digest = definitionDigest(definition);
  const item = { id: 1, type: "tally", state: "open", revision: 7, parties: {}, refs: {}, values: { count: 1 } };
  const summary = { scope, definition: digest, status: "active", time: timeOf(now), items: [item], counts: [] };
  vi.spyOn(ScopeHandle.prototype, "summary").mockResolvedValue({ ok: true, at: head, complete: true, value: summary } as never);
  vi.spyOn(ScopeHandle.prototype, "definition").mockResolvedValue({ ok: true, at: head, complete: true, value: definition } as never);
  const liveRead = vi.spyOn(ScopeHandle.prototype, "liveSummary").mockResolvedValue({ ok: true, generation: "generation-a", tick: 9, complete: true, value: { scope, definition: digest, items: [{ ...item, revision: 12 }], counts: [] } } as never);
  const liveAct = vi.spyOn(ScopeHandle.prototype, "liveAct").mockResolvedValue({ answer: "reset", generation: "generation-b" });
  const submit = vi.spyOn(ScopeHandle.prototype, "submit").mockResolvedValue({ answer: "refused", reason: "unauthorized", judgedAt: head } as never);
  const store = memoryStore(); await store.keep("device", new Uint8Array(32).fill(17));
  await store.save({ v: 2, service: "https://session.test", key: "device", repository: { directory: scope, membership: scope, rules: scope.scope, destination: scope.scope } });
  const fetch = async (_url: string, init?: { body?: string }) => {
    const asked = JSON.parse(init!.body!);
    return Response.json({ ok: true, token: "test-session", session: { v: 1, deployment: "TEST", membership: scope, key: asked.request.actor, member: "@member", reads: ["summary"], ends: timeOf(now + 600_000) } });
  };
  return { ctx: { store, fetch, now: () => now }, liveRead, liveAct, submit };
}

test("a live declaration sends once through liveAct and reports a reset without resubmitting", async () => {
  const f = await fixture(true);
  const result = await act(f.ctx, "count", { target: 1, set: ["next=2"] });
  expect(result.code).toBe(1);
  expect(result.lines.join(" ")).toContain("generation-b");
  expect(f.liveRead).toHaveBeenCalledOnce();
  expect(f.liveAct).toHaveBeenCalledOnce();
  expect(f.liveAct.mock.calls[0]![1]).toBe("generation-a");
  expect(f.liveAct.mock.calls[0]![0].intent.expected).toEqual({ on: 12 });
  expect(f.submit).not.toHaveBeenCalled();
});

test("a recorded declaration keeps the recorded submit path", async () => {
  const f = await fixture(false);
  const result = await act(f.ctx, "count", { target: 1, set: ["next=2"] });
  expect(result.lines.join(" ")).toContain("Refused: unauthorized");
  expect(f.submit).toHaveBeenCalledOnce();
  expect(f.liveRead).not.toHaveBeenCalled();
  expect(f.liveAct).not.toHaveBeenCalled();
});
