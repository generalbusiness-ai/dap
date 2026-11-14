/** C3's generated request steps, without C4 draft/slot operations: the judge and fold are real; network and clocks are ports. */
import { expect, test } from "vitest";
import type { SignedIntent } from "@generalbusiness/dap-contract";
import { canonicalize, timeOf } from "@generalbusiness/dap-bytes";
import { Custody, envelopeOf, memoryStore } from "../src/custody.ts";
import { requestStatus } from "../src/request-status.ts";
import { scopeClient, request, clientReplica, clientIdle, type ScopeClient } from "../src/scope-client.ts";
import { requestScene } from "./request-support.ts";

const SEEDS = 400, STEPS = 80;
function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => { state = (state + 0x6d2b79f5) >>> 0; let value = Math.imul(state ^ state >>> 15, 1 | state); value ^= value + Math.imul(value ^ value >>> 7, 61 | value); return ((value ^ value >>> 14) >>> 0) / 4294967296; };
}

test(`request invariants over ${SEEDS} seeds of ${STEPS} steps with independent clocks`, { timeout: 600_000 }, async () => {
  const began = performance.now();
  let signs = 0, entries = 0;
  for (let seed = 1; seed <= SEEDS; seed++) {
    const next = random(seed), s = requestScene(), store = memoryStore(), write = store.write.bind(store);
    let failWrite = false;
    store.write = async (...args) => { if (failWrite) { failWrite = false; throw new Error("scripted store failure"); } return write(...args); };
    const member = { service: "https://generated.test", membership: s.actor.member.membership, member: s.actor.member.member, principal: s.actor.principal };
    const who = { service: member.service, membership: member.membership, signer: s.signer.key, target: s.handle.at };
    const custody = new Custody(store, () => timeOf(s.now()));
    const unheld: SignedIntent[] = [];
    s.inspectCopies(async signed => {
      const record = await custody.find({ ...who, key: signed.intent.idempotencyKey });
      if (!record || !record.signings.some((_, index) => canonicalize(envelopeOf(record, index)?.signed ?? null) === canonicalize(signed))) unheld.push(signed);
    });
    const open = (): ScopeClient<typeof s.handle.definition> => scopeClient(s.handle, { signer: s.signer, member, store, drafts: { read: async () => null }, observe: s.feed.observe, clock: s.clock, lifetimeSeconds: 60 });
    let client = open(), feed = true, ordinal = 0, key = `seed-${seed}-${ordinal}`;
    const intentions = new Set<string>();
    s.feed.current(s.scope); await client.read();
    for (let step = 0; step < STEPS; step++) {
      const roll = next();
      if (roll < 0.48) {
        if (clientReplica(client).accepted(s.signer.key, key)) key = `seed-${seed}-${++ordinal}`;
        intentions.add(key);
        s.mode(next() < 0.2 ? "lost" : next() < 0.3 ? "unavailable" : next() < 0.4 ? "refused" : "answer");
        await request(client, key, "remark", { on: 0, fields: { text: `values-${seed}-${step}` } }).catch(() => null);
      } else if (roll < 0.57) {
        s.deliverHeld(); if (feed) s.feed.current(s.scope);
      } else if (roll < 0.65) {
        feed = false; s.feed.down(); s.serving.refuse = () => ({ ok: false, reason: "unavailable" });
      } else if (roll < 0.73) {
        feed = true; s.serving.refuse = null; s.feed.current(s.scope);
      } else if (roll < 0.80) s.advance(next() < 0.5 ? 2000 : 120_000);
      else if (roll < 0.85) s.scopeAdvance(next() < 0.5 ? 2000 : 120_000);
      else if (roll < 0.90) {
        const stopped = s.feed.cancelled;
        client.close(); expect([s.feed.cancelled, s.timers.size]).toEqual([stopped + 1, 0]);
        client = open(); if (feed) s.feed.current(s.scope);
      } else if (roll < 0.95) {
        s.failSigner(true);
        const before = s.signs();
        await request(client, `failed-${seed}-${step}`, "remark", { on: 0, fields: { text: "not signed" } }).catch(() => null);
        expect(s.signs()).toBe(before); s.failSigner(false);
      } else {
        const failed = `store-${seed}-${step}`; intentions.add(failed); failWrite = true;
        await request(client, failed, "remark", { on: 0, fields: { text: "store failure" } }).catch(() => null);
        failWrite = false;
      }
      await clientIdle(client);
      await client.read(); await clientIdle(client);
      const replica = clientReplica(client), counts = new Map<string, number>();
      for (const { entry } of s.scope.entries) if (entry.input.type === "act" && entry.input.signed.intent.actor === s.signer.key) {
        const heldKey = entry.input.signed.intent.idempotencyKey;
        counts.set(heldKey, (counts.get(heldKey) ?? 0) + 1);
        expect(intentions.has(heldKey)).toBe(true);
      }
      // Invariant 1: the member's request keys, independent of outcomes, bound the entries.
      expect([...counts.values()].every(count => count === 1)).toBe(true);
      expect(unheld).toEqual([]); // invariant 5: every POST's exact bytes were in custody at dispatch.
      const expected: unknown[] = [];
      for (const row of await store.byTarget(who)) {
        const record = (await custody.find({ ...who, key: row.key }))!;
        const outcomes = await custody.outcomes(row.id, record);
        const entry = replica.accepted(s.signer.key, row.key);
        const predict = (index: number) => {
          const envelope = envelopeOf(record, index);
          return envelope ? replica.judged(envelope.signed, { actor: s.actor, reading: timeOf(s.now()), texts: envelope.beside.texts ?? [] }) : { is: "not-judged" as const };
        };
        const status = requestStatus({ entry, record, outcomes, presentMeaning: record.meaning, head: replica.view.head, now: s.now(), predict });
        if (entry) expect(["recorded", "other-recorded"]).toContain(status.status); // invariant 3
        if (status.status !== "recorded") expected.push({ key: row.key, ...status, predicted: entry ? { is: "recorded", fact: entry.fact } : predict(record.signings.length - 1) });
      }
      // Invariant 6: recompute the published request statuses from actual replica/store evidence and this clock.
      expect(client.view.requests.map(({ key, status, predicted, ...rest }) => ({ key, status, predicted, ...("why" in rest ? { why: rest.why } : {}) }))).toEqual(expected);
    }
    signs += s.signs(); entries += s.scope.entries.length;
    const stopped = s.feed.cancelled; client.close();
    expect([s.feed.cancelled, s.timers.size]).toEqual([stopped + 1, 0]); // invariant 7
  }
  console.log(`C3 generated: ${SEEDS} seeds, ${SEEDS * STEPS} steps, ${signs} signatures, ${entries} entries, ${((performance.now() - began) / 1000).toFixed(1)} s`);
});
