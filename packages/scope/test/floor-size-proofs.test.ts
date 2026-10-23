import { floorSizeProofsData as data } from "../../derive/test/definition-corpus/scope-capacity-floor.ts";
/** Native storage, admitted receiver inputs and restart. The platform data,
 * its invalid-value rule, authority, clock and sender are labelled fixtures.
 * This tests the cold decision-binding consumer, not a real platform rule. */
import { expect, onTestFinished, test } from "vitest";
import { PROPOSED_BOUNDS, type Beside, type Created, type Entry, type PlatformDefinition, type Seed, type SignedIntent } from "@generalbusiness/dap-contract";
import { canonicalize, factRefOf, intentDigest, scopeIdOf, signIntent, textDigest, utf8 } from "@generalbusiness/dap-bytes";
import { MemoryState, clockOf, decisionBinding, isUnprovenDecisionBinding, validateDefinition, type Delivered, type Rules, type StateSnapshot } from "@generalbusiness/dap-derive";
import { forged, otherLane, valid } from "@generalbusiness/dap-derive/testing";
import { Scope, ownOf, retainedFacts } from "../src/core.ts";
import { production } from "../src/ports.ts";
import { SqliteStore } from "../src/sqlite.ts";
import { controls, testPorts } from "../src/testing.ts";
import type { Delivery } from "../src/ports.ts";
import { Lane, START, at, objectOf, rita } from "./fixtures-native.ts";
import { wired } from "./outside.ts";
import { archiveSql } from "./support/archive.ts";

const NAMED = "platform:task@2" as PlatformDefinition;

const rules: Rules = { "invalid-value": { place: "effect", most: 1, run: ({ resolved }) => [{ effect: "value", item: resolved.subjects.get("also.job")!.id, slot: "amount", value: "wrong" }] } };
// Only this fixture's present state kinds are needed by the cold consumer;
// each value comes from the actual native pre-decision snapshot.
function before(snapshot: StateSnapshot) {
  const state = new MemoryState(); state.setScope(snapshot.scope!);
  for (const item of snapshot.items) state.putItem(item);
  for (const [type, name, n] of snapshot.counts) state.addCount(type, name, n);
  for (const holder of snapshot.holders ?? []) state.putHolder(holder.item, holder.held);
  return state;
}

test("Native archived proof200 cannot bind deciding100 while proof50 can, including after restart", async () => {
  for (const proving of [200, 50]) {
    const supplied = data(), definition = valid(validateDefinition(supplied, PROPOSED_BOUNDS, undefined, { platform: true }));
    const text = "ok", digest = textDigest(text);
    const signed = signIntent({ v: 1, to: null, actor: rita.key, kind: "found", on: null, expected: {}, fields: { memo: digest }, idempotencyKey: crypto.randomUUID(), notAfter: at(60) }, rita.secret);
    const seed: Seed = { v: 1, kind: "directory", definition: NAMED, creator: null, cause: intentDigest(signed.intent), ordinal: 0 };
    const name = scopeIdOf(seed), c = controls(name, START), ports = { ...production(), ...testPorts(c), definitions: { read: async () => ({ ok: false as const, reason: "absent" as const }), platform: (named: string) => named === NAMED ? { data: supplied, rules } : null } };
    wired.set(name, () => ({ definitions: ports.definitions })); onTestFinished(() => { wired.delete(name); });
    const api = objectOf(name) as unknown as { create(signed: SignedIntent, named: PlatformDefinition, definitions: never[], beside: Beside): Promise<Created>; deliver(input: Delivered): Promise<Delivery> };
    const created = await api.create(signed, NAMED, [], { texts: [text] });
    if (created.answer !== "accepted") throw new Error(canonicalize(created));
    const lane = new Lane(name, c, created.receipt.fact.at, created.receipt, signed);
    let ordinal = 0, pre!: StateSnapshot, deciding!: Entry;
    const deliver = async (message: string, fields: Record<string, string> = {}) => {
      const body = { class: "request" as const, type: "tell" as const, body: { message, fields } };
      const source = forged(otherLane, ++ordinal, { type: "checkpoint", through: 0, state: definition.digest }, [{ n: 0, to: lane.at, message: body }]);
      const from = factRefOf(source.entry); c.foreign.set(from.hash, { entry: source.entry, under: "lane" });
      expect(await api.deliver({ to: lane.at, from, n: 0, message: body })).toMatchObject({ answer: "recorded" });
    };
    await deliver("start");
    while ((await lane.head()).seq < 349) {
      const next = (await lane.head()).seq + 1;
      if (next === proving) {
        const board = (await lane.summary()).value.items.find(item => item.id === 0)!;
        expect((await lane.stub.submit(lane.intent(rita, "prove", { on: 0, expected: { on: board.revision }, fields: { note: digest } }), lane.grants(), { texts: [text] })).answer).toBe("accepted");
      } else if (next === 100) {
        pre = await lane.inside(state => new SqliteStore(archiveSql(state)).all());
        await deliver("stop", { note: digest });
        deciding = await lane.inside(state => JSON.parse(new SqliteStore(archiveSql(state)).stored(100)!.bytes) as Entry);
        expect(deciding.input).toMatchObject({ decision: "refused", reason: { code: "bad-field" } });
      } else expect(await lane.stub.checkpoint()).toMatchObject({ answer: "written" });
    }
    const board = (await lane.summary()).value.items.find(item => item.id === 0)!;
    expect((await lane.act(rita, "erase", { on: 0, expected: { on: board.revision } })).answer).toBe("accepted");
    c.clock.now = at(1000);
    await lane.inside(async state => {
      const store = new SqliteStore(archiveSql(state));
      expect(await new Scope(name, store, ports, c.bounds).floor({ type: "floor", floor: 250, receipt: { commit: "a".repeat(40), through: store.scope()!.head }, keep: [100] })).toMatchObject({ answer: "written" });
    });
    const check = () => lane.inside(state => {
      const store = new SqliteStore(archiveSql(state));
      expect(store.retained("text", digest)).toBeNull(); expect(store.stored(proving)).toBeNull();
      expect(store.floor()!.sizeProofs).toEqual([{ digest, seq: proving, bound: utf8(text).length }]);
      const view = before(pre), run = () => decisionBinding(view, definition, deciding, { clock: clockOf(view, deciding.time), bounds: c.bounds, own: ownOf(store), facts: retainedFacts(store, deciding), texts: () => null, prepared: [], platform: { named: NAMED, rules } });
      if (proving === 200) { let failure: unknown; try { run(); } catch (error) { failure = error; } expect(isUnprovenDecisionBinding(failure)).toBe(true); }
      else expect(run()).toEqual({ item: 1, message: "stop" });
    });
    await check(); await lane.restart(); await check();
  }
}, 60_000);
