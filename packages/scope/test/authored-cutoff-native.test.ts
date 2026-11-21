/** Native SQLite, sealing, dispatcher and target. The target-proof port is
 * a stand-in for the bounded RPC, and the unanswered transport is a stand-in. */
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS, type Seed } from "@generalbusiness/dap-contract";
import { definitionDigest, intentDigest, scopeIdOf, signIntent } from "@generalbusiness/dap-bytes";
import { validateDefinition, type Delivered } from "@generalbusiness/dap-derive";
import { grantOf, valid } from "@generalbusiness/dap-derive/testing";
import { liveBase } from "../../derive/test/definition-corpus/live-data.ts";
import { Scope } from "../src/core.ts";
import { Dispatcher, Wakes } from "../src/outbox.ts";
import { production, type Delivery } from "../src/ports.ts";
import { SqliteStore } from "../src/sqlite.ts";
import { controls, testPorts } from "../src/testing.ts";
import { Lane, START, at, objectOf, reader, rita, stubOf } from "./fixtures-native.ts";
import { archiveSql } from "./support/archive.ts";
import { wired } from "./outside.ts";

type Dispatch = { dispatch(): Promise<number> };
const dispatch = (name: string) => (objectOf(name) as unknown as Dispatch).dispatch();

async function senderFixture(proof: boolean | null, unanswered = false) {
  const data = liveBase(false);
  data.items["request"] = { many: true, max: 4, initial: "waiting", states: { waiting: { final: false }, expired: { final: true }, cancelled: { final: true } }, parties: {},
    refs: { target: { fixed: true, required: true, to: { type: "scope", kind: "directory" } } },
    values: { deadline: { fixed: true, required: true, of: { type: "time" } } } };
  data.acts["ask"] = { step: "open", on: "request", grant: "ask", also: {}, fields: { target: { type: "scope", kind: "directory", required: true }, deadline: { type: "time", required: true } },
    guards: [], effects: [{ ref: { slot: "target", from: { field: "target" } } }, { value: { slot: "deadline", from: { field: "deadline" } } }],
    sends: [{ tell: { to: { slot: "target" }, message: "count", fields: {}, result: {} } }], attention: [] };
  data.acts["cancel"] = { step: "transition", on: "request", grant: "cancel", also: {}, fields: {}, guards: [{ state: ["waiting"] }], effects: [{ state: "cancelled" }], sends: [], attention: [] };
  data.timed["expire"] = { on: "request", states: ["waiting"], deadline: "deadline", effects: [{ state: "expired" }], attention: [] };
  valid(validateDefinition(data, PROPOSED_BOUNDS));
  const born = async (declared: typeof data) => {
    const signed = signIntent({ v: 1, to: null, actor: rita.key, kind: "found", on: null, expected: {}, fields: {}, idempotencyKey: crypto.randomUUID(), notAfter: at(60) }, rita.secret);
    const seed: Seed = { v: 1, kind: "directory", definition: definitionDigest(declared), creator: null, cause: intentDigest(signed.intent), ordinal: 0 };
    const name = scopeIdOf(seed), c = controls(name, START), result = await stubOf(name).create(signed, declared);
    if (result.answer !== "accepted") throw Error("The native scope must be created.");
    return new Lane(name, c, result.receipt.fact.at, result.receipt, signed);
  };
  const target = await born(liveBase()), sender = await born(data);
  let sends = 0;
  wired.set(sender.name, () => ({ transport: { send: async envelope => { sends++; return unanswered ? null : (objectOf(target.name) as unknown as { deliver(input: Delivered): Promise<Delivery> }).deliver(envelope); } }, liveTarget: { read: async at => at.scope === target.name && at.genesis === target.at.genesis ? proof : null } }));
  await sender.restart();
  const answer = await sender.stub.submit(sender.intent(rita, "ask", { fields: { target: target.at, deadline: at(10) } }), [grantOf(rita, sender.at, ["ask", "cancel"])]);
  if (answer.answer !== "accepted") throw Error("The native request must be accepted.");
  return { sender, target, seq: answer.receipt.fact.seq, sends: () => sends, cleanup: () => wired.delete(sender.name) };
}

// Timer-only turn models an interruption after its transaction and before a
// subsequent dispatcher pass. No request, attempt, receipt or entry is forged.
test("a persisted cutoff survives eviction and uses the real retry", async () => {
  const f = await senderFixture(true);
  try {
    await dispatch(f.sender.name);
    const attempts = f.sends(); expect(attempts).toBeGreaterThan(0);
    f.sender.c.clock.now = at(10);
    await f.sender.inside(async state => {
      const store = new SqliteStore(archiveSql(state));
      await new Scope(f.sender.name, store, { ...production(), ...testPorts(f.sender.c) }, f.sender.c.bounds).alarm();
      expect(store.liveCutoffReceipt(f.seq, 0)).not.toBeNull();
    });
    f.sender.c.clock.now = at(2); // A committed receipt remains decisive after a clock rollback.
    await f.sender.restart(); await dispatch(f.sender.name);
    expect(f.sends()).toBe(attempts);
    const page = await f.sender.stub.outbox(reader);
    if (!page.ok) throw Error("The outbox must be readable.");
    const row = page.value.find(item => item.outboxId === `${f.seq}.0`);
    expect(row).toMatchObject({ acknowledged: null, result: null, diagnosis: { finding: "delivery-unavailable" } });
    expect(row?.attempts.some(a => a.answer === "retry")).toBe(true);
  } finally { f.cleanup(); }
});

test.for([false, null] as const)("a non-live or inconclusive target keeps ordinary retries (%s)", async proof => {
  const f = await senderFixture(proof);
  try {
    await dispatch(f.sender.name); const before = f.sends();
    f.sender.c.clock.now = at(10); await dispatch(f.sender.name);
    expect(f.sends()).toBeGreaterThan(before);
  } finally { f.cleanup(); }
});

// An unfinished dispatch cannot establish a retry, even when its target is live.
test("an unanswered attempt does not authorize a cutoff diagnosis", async () => {
  const f = await senderFixture(true, true);
  try {
    await dispatch(f.sender.name); const before = f.sends();
    f.sender.c.clock.now = at(10); await dispatch(f.sender.name);
    expect(f.sends()).toBeGreaterThan(before);
    const page = await f.sender.stub.outbox(reader); if (!page.ok) throw Error("The outbox must be readable.");
    expect(page.value.find(item => item.outboxId === `${f.seq}.0`)?.diagnosis).toBeNull();
  } finally { f.cleanup(); }
});

test("a moved item without a timed receipt keeps ordinary dispatch", async () => {
  const f = await senderFixture(true);
  try {
    await dispatch(f.sender.name);
    expect(await f.sender.stub.submit(f.sender.intent(rita, "cancel", { on: f.seq, expected: { on: 1 } }), [grantOf(rita, f.sender.at, ["cancel"])] )).toMatchObject({ answer: "accepted" });
    const before = f.sends(); f.sender.c.clock.now = at(10); await dispatch(f.sender.name);
    expect(f.sends()).toBeGreaterThan(before);
  } finally { f.cleanup(); }
});

// The alarm port is a gate; native storage, timer and diagnosis remain real.
test("a deadline reached while arming the retry fences the unsent attempt", async () => {
  const f = await senderFixture(true);
  try {
    await dispatch(f.sender.name);
    const sent = f.sends(), before = await f.sender.stub.outbox(reader);
    if (!before.ok) throw Error("The outbox must be readable.");
    const original = before.value.find(row => row.outboxId === `${f.seq}.0`)!.attempts;
    let reached!: () => void, release!: () => void, gated = false;
    const waiting = new Promise<void>(resolve => { reached = resolve; });
    const gate = new Promise<void>(resolve => { release = resolve; });
    f.sender.c.clock.now = at(1);
    const running = f.sender.inside(async state => {
      const store = new SqliteStore(archiveSql(state));
      const scope = new Scope(f.sender.name, store, { ...production(), ...testPorts(f.sender.c) }, f.sender.c.bounds);
      const wakes = new Wakes(store, { set: async () => { if (!gated) { gated = true; reached(); await gate; } } });
      const driver = new Dispatcher(scope, store, { clock: f.sender.c.clock,
        liveTarget: { read: async () => true }, transport: { send: async envelope => {
          throw Error(`A fenced send must not leave: ${envelope.n}`);
        } } }, wakes, f.sender.c.bounds);
      return driver.run();
    });
    await waiting; f.sender.c.clock.now = at(10); release(); await running;
    expect(f.sends()).toBe(sent);
    const after = await f.sender.stub.outbox(reader); if (!after.ok) throw Error("The outbox must be readable.");
    const row = after.value.find(item => item.outboxId === `${f.seq}.0`)!;
    expect(row.attempts).toEqual(original);
    expect(row.diagnosis).toMatchObject({ finding: "delivery-unavailable" });
  } finally { f.cleanup(); }
});
