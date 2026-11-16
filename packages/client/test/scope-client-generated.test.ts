/** C3's generated request steps, without C4 draft/slot operations: the judge and fold are real; network and clocks are ports. */
import { expect, test } from "vitest";
import type { SignedIntent } from "@generalbusiness/dap-contract";
import { canonicalize, timeOf } from "@generalbusiness/dap-bytes";
import { Custody, envelopeOf, memoryStore } from "../src/custody.ts";
import { memoryDrafts } from "../src/draft-store.ts";
import { draftNowOf, nowExpected } from "../src/draft-now.ts";
import { composeDraftCandidate } from "../src/draft-submit.ts";
import { requestStatus } from "../src/request-status.ts";
import { scopeClient, request, clientReplica, clientIdle, type ScopeClient } from "../src/scope-client.ts";
import { bump, definition as nowDefinition, draftAt, judge, repoint, scope as nowScope, truth, world, type ModelKind } from "./support/c4-now-model.ts";
import { REQUEST_DESCRIPTOR, checkSigningAuthorizations, requestScene } from "./request-support.ts";

const SEEDS = 400, STEPS = 80;
function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => { state = (state + 0x6d2b79f5) >>> 0; let value = Math.imul(state ^ state >>> 15, 1 | state); value ^= value + Math.imul(value ^ value >>> 7, 61 | value); return ((value ^ value >>> 14) >>> 0) / 4294967296; };
}

test(`request invariants over ${SEEDS} seeds of ${STEPS} steps with independent clocks`, { timeout: 600_000 }, async () => {
  const began = performance.now();
  let signs = 0, entries = 0;
  for (let seed = 1; seed <= SEEDS; seed++) {
    const next = random(seed), s = requestScene(), store = memoryStore(), drafts = memoryDrafts(), write = store.write.bind(store);
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
    const open = (): ScopeClient<typeof s.handle.definition> => scopeClient(s.handle, { descriptor: REQUEST_DESCRIPTOR, signer: s.signer, member, store, drafts, observe: s.feed.observe, clock: s.clock, lifetimeSeconds: 60 });
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
      await checkSigningAuthorizations(s, store); // invariant 8: no unreferenced instance signing is legacy.
      // Invariant 6: recompute the published request statuses from actual replica/store evidence and this clock.
      // Planner 6d3b979f item 3: this owner stores no draft, so every list entry is a request; one `is` check narrows it.
      expect(client.view.requests.map(entry => {
        if (entry.is !== "request") return expect.fail("this owner lists requests only");
        const { key, status, predicted } = entry;
        return { key, status, predicted, ...("why" in entry ? { why: entry.why } : {}) };
      })).toEqual(expected);
    }
    signs += s.signs(); entries += s.scope.entries.length;
    const stopped = s.feed.cancelled; client.close();
    expect([s.feed.cancelled, s.timers.size]).toEqual([stopped + 1, 0]); // invariant 7
  }
  console.log(`C3 generated: ${SEEDS} seeds, ${SEEDS * STEPS} steps, ${signs} signatures, ${entries} entries, ${((performance.now() - began) / 1000).toFixed(1)} s`);
});

// C4 general now. A row moves between each pair of steps: return to view, and view to submit (and so return to submit).
// This case runs the pure pieces against an independent oracle (support/c4-now-model.ts). The scope's judgment is the
// oracle's `judge`. The real ScopeClient.submit follows in the next case.
const NOW_SEEDS = 400, NOW_EPISODES = 20;
test(`general now over ${NOW_SEEDS} seeds: a row moves between return, view and submit`, () => {
  let episodes = 0, races = 0, signs = 0;
  for (let seed = 1; seed <= NOW_SEEDS; seed++) {
    const next = random(seed), w = world(next() < 0.2 ? null : next() < 0.6 ? 2 : 3);
    const kind: ModelKind = next() < 0.5 ? "touch" : "revise-target", on = kind === "touch" ? 0 : next() < 0.5 ? 2 : 3;
    let stored = draftAt(w, kind, on, `now-${seed}`), changedSinceView = false;
    const now = () => canonicalize(truth(w, kind, on));
    // One move of one row: a revision bump, or the anchor's pointer. It counts only when the scope's expectation changes.
    const move = (chance: number): void => {
      if (next() >= chance) return;
      const before = now(), roll = next();
      if (roll < 0.35) bump(w, [0, 2, 3][Math.floor(next() * 3)]!);
      else if (roll < 0.8) repoint(w, [2, 3, null][Math.floor(next() * 3)] as number | null);
      else bump(w, 0);
      if (now() !== before) changedSinceView = true;
    };
    const view = () => {
      const shown = draftNowOf({ definition: nowDefinition, stored, scope: nowScope, cut: { head: { seq: seed, hash: `sha256:${"4".repeat(64)}` }, rows: w.rows } });
      if (shown.is !== "now") return expect.fail(`the view must render: ${shown.is}`);
      expect(nowExpected(shown.now)).toEqual(truth(w, kind, on)); // the view matches the oracle at its own cut
      changedSinceView = false;
      return shown.now;
    };
    for (let episode = 0; episode < NOW_EPISODES; episode++) {
      move(0.7);
      if (judge(stored.act.expected, truth(w, kind, on)) === "accepted") continue; // nothing moved since the basis: nothing returned
      move(0.5); // between return and view: the view absorbs it
      let passed = view(), submits = 0, stale = 0;
      episodes++;
      move(0.5); // between view and submit
      for (;;) {
        submits++;
        const composed = composeDraftCandidate({ definition: nowDefinition, stored, now: passed });
        if (!composed.ok) return expect.fail("the passed now must compose");
        // The member never signs on a subject that no passed now named.
        expect(Object.keys(composed.candidate.expected).every(name => passed.subjects[name]?.is === "present")).toBe(true);
        expect(composed.candidate.expected).toEqual(nowExpected(passed));
        stored = composed.adopted;
        const answer = judge(composed.candidate.expected, truth(w, kind, on));
        // A race costs one submit exactly when a row moved after the passed view.
        expect(answer === "revision-moved").toBe(changedSinceView);
        if (answer === "accepted") { signs++; break; }
        stale++; races++;
        move(0.3); // between the refusal and the new view
        passed = view(); // a scope refusal after a passed exploration returns the draft with a new now
        move(0.3); // between the new view and the next submit
        expect(submits).toBeLessThan(100);
      }
      expect(submits).toBe(1 + stale);
    }
  }
  expect(races).toBeGreaterThan(0);
  console.log(`C4 general now: ${NOW_SEEDS} seeds, ${episodes} returns, ${races} races, ${signs} signatures`);
});

// C4 general now through the real submit. A row moves between return, view and submit on the real in-memory judge: another
// tab commits a `cite` to item 0, and the real client signs, is refused `revision-moved`, shows a new `now`, and submits again.
// The oracle is the count: a submit signs once, and it is refused exactly when a move came after the basis that it signed.
const REAL_SEEDS = 40, REAL_ROUNDS = 8;
test(`general now through the real ScopeClient.submit over ${REAL_SEEDS} seeds: a row moves between return, view and submit`, async () => {
  let submits = 0, races = 0;
  for (let seed = 1; seed <= REAL_SEEDS; seed++) {
    const next = random(seed), s = requestScene(), store = memoryStore(), drafts = memoryDrafts();
    const member = { service: "https://generated.test", membership: s.actor.member.membership, member: s.actor.member.member, principal: s.actor.principal };
    const client = scopeClient(s.handle, { descriptor: REQUEST_DESCRIPTOR, signer: s.signer, member, store, drafts, observe: s.feed.observe, clock: s.clock, lifetimeSeconds: 60 });
    try {
      // Each move needs its own remark: `cite` is refused when its cause equals the cause that item 0 already holds.
      let remarks = 0;
      const remark = (): number => { s.scope.did(s.actor, "remark", { on: 0, fields: { text: `cause-${seed}-${remarks++}` } }); return s.scope.head.seq; };
      const own = remark();
      s.feed.current(s.scope); await client.read();
      const basis = s.scope.item(0).revision, slot = client.slot("cite", { on: { name: 0, seen: basis, assumes: [] } });
      const edited = await client.edit(slot, { cause: s.scope.fact(own) });
      if (!edited.ok) return expect.fail("the edit creates the draft");
      await clientIdle(client); // the view shows the draft before the first submit
      let signed = s.signs(), shownRevision = basis, passed: Parameters<typeof client.submit>[1] = undefined, accepted = false;
      for (let round = 0; round < REAL_ROUNDS && !accepted; round++) {
        // Move item 0 now and then, between the view and the submit. The client's feed gives no notice of it.
        // The last round moves nothing, so every seed ends accepted.
        const moves = round < REAL_ROUNDS - 1 && next() < 0.5;
        if (moves) {
          const cause = s.scope.fact(remark());
          s.scope.did(s.actor, "cite", { on: 0, expected: { on: s.scope.item(0).revision }, fields: { cause } });
        }
        const stale = s.scope.item(0).revision !== shownRevision;
        const result = await client.submit(slot, passed);
        await clientIdle(client);
        submits++;
        expect(result).toEqual({ ok: true, value: edited.value });
        expect(s.signs()).toBe(signed + 1); // one signature per submit, never a hidden retry
        signed = s.signs();
        // The scope's judgment is the oracle: signed on a moved basis, refused; otherwise accepted.
        const entry = s.scope.entries.at(-1)!.entry;
        accepted = entry.input.type === "act" && entry.input.signed.intent.idempotencyKey === edited.value;
        expect(accepted).toBe(!stale);
        if (accepted) break;
        races++;
        const shown = client.view.drafts.get(slot);
        if (shown?.state !== "editing" || shown.returned?.by !== "request" || shown.returned.now.is !== "now") return expect.fail("a refusal returns the draft with a new now");
        // The new now shows the scope's revision at the refusal.
        expect(shown.returned.now.now.primary).toEqual({ name: 0, seen: s.scope.item(0).revision, assumes: [] });
        passed = shown.returned.now.now; shownRevision = s.scope.item(0).revision;
      }
      expect(accepted).toBe(true);
    } finally { client.close(); }
  }
  expect(races).toBeGreaterThan(0);
  console.log(`C4 general now, real submit: ${REAL_SEEDS} seeds, ${submits} submits, ${races} races`);
});
