/**
 * The part of the generated suite of the client note (section 12) that
 * needs no request: 400 fixed seeds of 80 steps. A step is an act of a
 * member at the scope, a notice of the feed, the feed down, the feed up, a
 * move of the scope's clock, a reload of the replica, or a prediction.
 *
 * After each step:
 * - the replica's state equals a `MemoryState` that `applyEntry` folds from
 *   the same entries, to the replica's head;
 * - the view equals the view computed again from that state: its head and
 *   the rows of each type;
 * - the state is `current` when the feed is up and the replica holds the
 *   scope's head, and `behind` when the feed is down.
 *
 * A prediction of `cite`, which compares a fact of the scope's own journal,
 * gives the same `judgeAct` on the replica as on the scope's state (ruling
 * b1b1d492). After `close()`, no timer and no observation remain.
 */
import { expect, test, vi } from "vitest";
import { PROPOSED_BOUNDS, type Timestamp } from "@generalbusiness/dap-contract";
import { MemoryState, applyEntry, clockOf, judgeAct, predictionGrant, timeMs, timeOf, type JudgeContext, type StateView } from "@generalbusiness/dap-derive";
import { Scope, keys, type Actor } from "@generalbusiness/dap-derive/testing";
import { scopeReplica } from "../src/scope.ts";
import { seamOf } from "../src/replica.ts";
import { Feed, citing, citingDefinition, served } from "./replica-support.ts";

const SEEDS = 400, STEPS = 80;
const members = [keys.rita, keys.una, keys.vic];

/** mulberry32: a fixed sequence for each seed. */
function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const counts = { steps: 0, entries: 0, predictions: 0, reloads: 0, seconds: 0 };

test(`the replica over ${SEEDS} generated journals of ${STEPS} steps`, { timeout: 600_000 }, async () => {
  vi.useFakeTimers();
  const began = performance.now();
  try {
    for (let seed = 1; seed <= SEEDS; seed++) await journal(seed);
  } finally { vi.useRealTimers(); }
  counts.seconds = (performance.now() - began) / 1000;
  console.log(`generated suite: ${SEEDS} seeds, ${counts.steps} steps, ${counts.entries} entries, ${counts.predictions} predictions, ${counts.reloads} reloads, ${counts.seconds.toFixed(1)} s`);
  expect(counts.predictions).toBeGreaterThan(SEEDS);
});

async function journal(seed: number): Promise<void> {
  const next = random(seed), pick = <T>(list: readonly T[]): T => list[Math.floor(next() * list.length)]!;
  const s = new Scope(citingDefinition);
  const reference = new MemoryState();
  let folded = -1;
  const advance = (to: number) => {
    for (; folded < to; folded++) { const { entry, hash } = s.entries[folded + 1]!; applyEntry(reference, s.definition, entry, hash, s.foldOptions); }
  };

  let feed = new Feed(), up = false, checked: string | null = null;
  let replica = scopeReplica(served(s, citing).handle, { observe: feed.observe });
  await replica.read();

  const act = () => {
    const who = pick(members), item = (id: number) => s.state.item(id);
    const commitments = s.state.page("commitment", ["offered", "accepted", "done"], null, 100).items.map((c) => c.id);
    const remarks = s.entries.filter(({ entry }) => entry.input.type === "act" && entry.input.signed.intent.kind === "remark").map(({ entry }) => entry.seq);
    const stale = next() < 0.1 ? 7 : 0;
    switch (pick(["remark", "offer", "assign", "cite"] as const)) {
      case "remark": return s.act(who, "remark", { on: 0, fields: { text: `TEST ${seed}.${counts.steps}` } });
      case "offer": return s.act(keys.rita, "offer", { fields: { intent: 0 }, expected: { intent: item(0)!.revision + stale } });
      case "assign": {
        if (commitments.length === 0) return null;
        const id = pick(commitments);
        return s.act(keys.rita, "assign", { on: id, expected: { on: item(id)!.revision + stale }, fields: { performer: pick(members).member } });
      }
      case "cite": {
        const seq = remarks.length > 0 && next() < 0.8 ? pick(remarks) : Math.floor(next() * s.entries.length);
        return s.act(who, "cite", { on: 0, expected: { on: item(0)!.revision + stale }, fields: { cause: s.fact(seq) } });
      }
    }
  };

  const predict = () => {
    // The scope's judgment at the replica's head: the two states must be at one head.
    if (replica.view.state.is !== "current" || replica.view.head?.hash !== s.head.hash) return;
    const who = pick(members), seq = Math.floor(next() * s.entries.length);
    const cite = s.intent(who, "cite", { on: 0, expected: { on: s.state.item(0)!.revision }, fields: { cause: s.fact(seq) } });
    const { held, state } = seamOf(replica);
    const context = (view: StateView, own: JudgeContext["own"]): JudgeContext => ({
      clock: clockOf(view, s.now), bounds: PROPOSED_BOUNDS, facts: [], prepared: [], own, texts: () => undefined, grants: [predictionGrant(s.definition, actorOf(who), s.at)],
    });
    expect(judgeAct(state(), s.definition, cite, context(state(), held.own))).toEqual(judgeAct(s.state, s.definition, cite, context(s.state, s.own)));
    expect(held.take()).toEqual([]);
    const predicted = replica.judged(cite, { actor: actorOf(who), reading: s.now });
    expect(predicted.is).not.toBe("not-judged");
    counts.predictions++;
  };

  for (let step = 0; step < STEPS; step++, counts.steps++) {
    const roll = next();
    if (roll < 0.4) act();
    else if (roll < 0.6) { if (up) { feed.current(s); await replica.read(); } }
    else if (roll < 0.68) { feed.down(); up = false; }
    else if (roll < 0.76) { feed.current(s); up = true; await replica.read(); }
    else if (roll < 0.84) s.now = later(s.now, Math.floor(next() * 120));
    else if (roll < 0.9) {
      replica.close();
      expect(feed.cancelled).toBe(1);
      feed = new Feed(); up = false; checked = null; counts.reloads++;
      replica = scopeReplica(served(s, citing).handle, { observe: feed.observe });
      await replica.read();
    } else predict();

    const view = replica.view, head = view.head;
    if (head && head.hash !== checked) {
      advance(head.seq);
      expect(seamOf(replica).state().snapshot()).toBe(reference.snapshot());
      for (const [type, declared] of Object.entries(citingDefinition.declared.items)) {
        expect(view.rows(type as never)).toEqual(reference.page(type, Object.keys(declared.states), null, Number.MAX_SAFE_INTEGER).items);
      }
      checked = head.hash;
    }
    expect(head).toEqual(seamOf(replica).held.head);
    if (!up) expect(view.state.is).toBe(head ? "behind" : "starting");
    else if (head?.seq === s.head.seq) expect(view.state.is).toBe("current");
  }
  counts.entries += s.entries.length;
  replica.close();
  expect([feed.cancelled, vi.getTimerCount()]).toEqual([1, 0]);
}

const actorOf = (who: Actor) => ({ key: who.key, member: who.member, principal: who.principal });
const later = (now: Timestamp, seconds: number): Timestamp => timeOf(timeMs(now)! + seconds * 1000);
