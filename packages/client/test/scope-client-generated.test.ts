/** C3's generated request steps, without C4 draft/slot operations: the judge and fold are real; network and clocks are ports. */
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS, type Intent, type SignedIntent } from "@generalbusiness/dap-contract";
import { actDescriptorDigest, canonicalize, timeOf } from "@generalbusiness/dap-bytes";
import { Custody, envelopeOf, memoryStore } from "../src/custody.ts";
import { memoryDrafts } from "../src/draft-store.ts";
import { draftNowOf, nowExpected } from "../src/draft-now.ts";
import { composeDraftCandidate } from "../src/draft-submit.ts";
import { requestStatus } from "../src/request-status.ts";
import { scopeClient, request, clientReplica, clientIdle, type ScopeClient } from "../src/scope-client.ts";
import { bump, definition as nowDefinition, draftAt, judge, repoint, scope as nowScope, truth, world, type ModelKind } from "./support/c4-now-model.ts";
import { intentMeaning } from "../src/replica.ts";
import { changedDraft, valid } from "@generalbusiness/dap-derive/testing";
import { validateDefinition } from "@generalbusiness/dap-derive";
import { citing } from "./replica-support.ts";
import { checkSigningAuthorizations, requestScene } from "./request-support.ts";

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
    const failedWrites = new Set<string>(), failedSigners = new Set<string>();
    const signerSuccess = new Map<string, number>();
    store.write = async (...args) => {
      if (failedWrites.delete(args[1].identity.key)) throw new Error("scripted store failure");
      return write(...args);
    };
    const signer = { key: s.signer.key, sign: async (bytes: Uint8Array) => {
      const encoded = new TextDecoder().decode(bytes), intent = JSON.parse(encoded.slice(encoded.indexOf("\n") + 1)) as Intent;
      if (failedSigners.has(intent.idempotencyKey)) throw new Error("scripted signer failure");
      const signature = await s.signer.sign(bytes);
      signerSuccess.set(intent.idempotencyKey, (signerSuccess.get(intent.idempotencyKey) ?? 0) + 1);
      return signature;
    } };
    const member = { service: "https://generated.test", membership: s.actor.member.membership, member: s.actor.member.member, principal: s.actor.principal };
    const who = { service: member.service, membership: member.membership, signer: s.signer.key, target: s.handle.at };
    const custody = new Custody(store, () => timeOf(s.now()));
    const unheld: SignedIntent[] = [];
    s.inspectCopies(async signed => {
      const record = await custody.find({ ...who, key: signed.intent.idempotencyKey });
      if (!record || !record.signings.some((_, index) => canonicalize(envelopeOf(record, index)?.signed ?? null) === canonicalize(signed))) unheld.push(signed);
    });
    const open = (): ScopeClient<typeof s.handle.definition> => scopeClient(s.handle, { signer, member, store, drafts, observe: s.feed.observe, clock: s.clock, lifetimeSeconds: 60 });
    let client = open(), feed = true, ordinal = 0, key = `seed-${seed}-${ordinal}`;
    const intentions = new Set<string>();
    const outstanding = new Set<Promise<void>>();
    const outcomes: { key: string; result: "fulfilled" | "rejected" }[] = [];
    const schedule = async (target: ScopeClient<typeof s.handle.definition>, requestKey: string, text: string) => {
      let done = false, visible: unknown = null, wake!: () => void;
      const changed = new Promise<void>(resolve => { wake = resolve; });
      const stop = target.subscribe(view => {
        const row = view.requests.find(row => row.is === "authorization" && row.key === requestKey && row.status === "waits" && row.act.kind === "remark" && row.act.fields["text"] === text);
        if (row) { visible = structuredClone(row); wake(); }
      });
      const work = request(target, requestKey, "remark", { on: 0, fields: { text } }).then(
        () => { outcomes.push({ key: requestKey, result: "fulfilled" }); },
        () => { outcomes.push({ key: requestKey, result: "rejected" }); },
      ).finally(() => { done = true; wake(); });
      outstanding.add(work); void work.finally(() => outstanding.delete(work));
      const current = target.view.requests.find(row => row.is === "authorization" && row.key === requestKey && row.status === "waits" && row.act.kind === "remark" && row.act.fields["text"] === text);
      if (current) { visible = structuredClone(current); wake(); }
      await changed; stop();
      if (!done) {
        expect(visible).toMatchObject({ is: "authorization", key: requestKey, status: "waits" });
      }
    };
    const join = async () => { await Promise.all([...outstanding]); expect(outstanding.size).toBe(0); };
    const check = async () => {
      const published = client.view, replica = clientReplica(client), counts = new Map<string, number>();
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
      // This owner has ordinary requests and exact unsigned authorization rows.
      const authorizations = await store.authorizations.read(s.signer.key, s.handle.at);
      const expectedUnsigned: unknown[] = [];
      for (const row of authorizations) {
        const position = row.versions.length - 1, version = row.versions[position]!;
        if (row.definition !== s.handle.digest || row.descriptor !== actDescriptorDigest(s.handle.definition, version.act.kind)
          || row.cancelledAt !== undefined || row.permissions.some(permission => permission.position === position)
          || !version.after.length || replica.accepted(s.signer.key, row.key)) continue;
        let waiting = false, failed = false;
        for (const source of version.after) {
          const prior = authorizations.find(candidate => candidate.key === source.key);
          if (!prior || prior.cancelledAt !== undefined || prior.versions.at(-1)?.id !== source.version) { failed = true; break; }
          const checked = replica.authorizationSource(s.signer.key, source.key);
          if (checked) {
            const resolved = checked.entry.actor === prior.owner && checked.entry.key === prior.key
              && canonicalize(checked.entry.fact.at) === canonicalize(prior.scope)
              && prior.materializations.some(held => prior.versions[held.position]?.id === source.version && intentMeaning(held.act) === checked.entry.meaning);
            if (!resolved) { failed = true; break; }
            continue;
          }
          const record = await custody.find({ ...who, key: source.key });
          const matching = record?.signings.filter(signing => signing.authorization
            && canonicalize(signing.authorization.identity) === canonicalize({ key: prior.key, owner: prior.owner, scope: prior.scope })
            && prior.versions[signing.authorization.position]?.id === source.version) ?? [];
          const possible = record?.signings.some(signing => !signing.closed && (!signing.authorization
            || canonicalize(signing.authorization.identity) !== canonicalize({ key: prior.key, owner: prior.owner, scope: prior.scope })
            || !prior.versions[signing.authorization.position] || prior.versions[signing.authorization.position]!.id === source.version)) ?? false;
          if (!record || !["accepted", "archived", "settled"].includes(record.phase)) {
            if (!possible && ((prior.permissions.some(permission => permission.position === prior.versions.length - 1)
              && matching.length > 0 && matching.every(signing => signing.closed)) || s.now() >= Date.parse(prior.versions.at(-1)!.deadline))) { failed = true; break; }
          }
          waiting = true;
        }
        if (!failed && !waiting) continue;
        expectedUnsigned.push({ is: "authorization", key: row.key, reference: { identity: { key: row.key, owner: row.owner, scope: row.scope }, position },
          act: version.act, status: failed || s.now() >= Date.parse(version.deadline) ? "source" : "waits" });
      }
      expect(client.view).toBe(published);
      const requests = published.requests.filter(entry => entry.is === "request");
      expect(requests.map(entry => {
        const { key, status, predicted } = entry;
        return { key, status, predicted, ...("why" in entry ? { why: entry.why } : {}) };
      })).toEqual(expected);
      expect(published.requests.filter(entry => entry.is === "authorization")).toEqual(expectedUnsigned);
      expect(published.requests.map(entry => entry.is)).toEqual([...requests.map(() => "request"), ...expectedUnsigned.map(() => "authorization")]);
      for (const failed of failedSigners) expect(signerSuccess.get(failed) ?? 0).toBe(0);
    };
    s.feed.current(s.scope); await client.read();
    for (let step = 0; step < STEPS; step++) {
      const roll = next();
      if (roll < 0.48) {
        if (clientReplica(client).accepted(s.signer.key, key)) key = `seed-${seed}-${++ordinal}`;
        intentions.add(key);
        s.mode(next() < 0.2 ? "lost" : next() < 0.3 ? "unavailable" : next() < 0.4 ? "refused" : "answer");
        await schedule(client, key, `values-${seed}-${step}`);
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
        client.close(); await join(); expect([s.feed.cancelled, s.timers.size]).toEqual([stopped + 1, 0]);
        client = open(); if (feed) s.feed.current(s.scope);
      } else if (roll < 0.95) {
        const failed = `failed-${seed}-${step}`;
        failedSigners.add(failed);
        await schedule(client, failed, "not signed");
        expect(signerSuccess.get(failed) ?? 0).toBe(0);
      } else {
        const failed = `store-${seed}-${step}`; intentions.add(failed); failedWrites.add(failed);
        await schedule(client, failed, "store failure");
      }
      await clientIdle(client);
      await client.read(); await clientIdle(client);
      await check();
    }
    // A real delivery and clock advance must settle waits before final cleanup.
    s.deliverHeld(); if (feed) s.feed.current(s.scope);
    s.advance(120_000); await client.read(); await clientIdle(client);
    const unresolved = outstanding.size;
    await check();
    signs += s.signs(); entries += s.scope.entries.length;
    const stopped = s.feed.cancelled; client.close(); await join();
    expect(unresolved, `seed ${seed}: pending requests before final close; ${JSON.stringify(outcomes)}`).toBe(0);
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
    const client = scopeClient(s.handle, { signer: s.signer, member, store, drafts, observe: s.feed.observe, clock: s.clock, lifetimeSeconds: 60 });
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

// Invariant 11: generated source/version schedules check the actual signer boundary.
test("generated dependent signings require the exact recorded materialized source", async () => {
  const declaration = changedDraft(citing, d => {
    d.acts.offer.fields.label = { type: "text", max: 40, required: false };
  });
  const definition = valid(validateDefinition(declaration, PROPOSED_BOUNDS));
  let matched = 0, mismatched = 0, dependentSigns = 0;
  // The unrelated pending request appears before, between, or after the two source versions.
  for (const otherAt of [0, 1, 2] as const) for (const recorded of ["earlier", "latest"] as const) {
    const s = requestScene(definition), store = memoryStore(), drafts = memoryDrafts();
    const suffix = `${otherAt}-${recorded}`, sourceKey = `generated-source-${suffix}`;
    const dependentKey = `generated-dependent-${suffix}`, otherKey = `generated-other-${suffix}`;
    const member = { service: "https://generated-dependencies.test", membership: s.actor.member.membership,
      member: s.actor.member.member, principal: s.actor.principal };
    const who = { service: member.service, membership: member.membership, signer: s.signer.key, target: s.handle.at };
    let client!: ReturnType<typeof scopeClient<typeof s.handle.definition>>;
    let latestId: string | null = null, boundaryCalls = 0;
    const signer = { key: s.signer.key, sign: async (bytes: Uint8Array) => {
      const text = new TextDecoder().decode(bytes), newline = text.indexOf("\n");
      const intent = JSON.parse(text.slice(newline + 1)) as Intent;
      if (intent.idempotencyKey === dependentKey) {
        boundaryCalls++; dependentSigns++;
        const rows = await store.authorizations.read(s.signer.key, s.handle.at);
        const source = rows.find(row => row.key === sourceKey), dependent = rows.find(row => row.key === dependentKey);
        if (!source || !dependent || !latestId) return expect.fail("signer boundary requires retained exact source and dependent");
        const version = source.versions.at(-1)!;
        expect(version.id).toBe(latestId);
        expect(dependent.versions[0]!.after).toContainEqual({ key: sourceKey, version: latestId });
        const proof = clientReplica(client).authorizationSource(s.signer.key, sourceKey);
        if (!proof) return expect.fail("dependent signing requires a checked source entry");
        expect(proof.entry.actor).toBe(s.signer.key);
        expect(proof.entry.key).toBe(sourceKey);
        const materialized = source.materializations.find(item => source.versions[item.position]?.id === latestId
          && intentMeaning(item.act) === proof.entry.meaning);
        expect(materialized).toBeDefined();
        expect(dependent.permissions).toHaveLength(1);
      }
      return s.signer.sign(bytes);
    } };
    client = scopeClient(s.handle, { signer, member, store, drafts, observe: s.feed.observe, clock: s.clock, lifetimeSeconds: 60 });
    try {
      s.feed.current(s.scope); await client.read(); s.mode("refused");
      const identity = (key: string) => ({ key, owner: signer.key, scope: s.handle.at });
      const other = () => client.submitBoundAct(identity(otherKey), { kind: "link", on: null,
        fields: { target: s.handle.at, about: 0 }, expected: {} });
      const offer = (label: string) => ({ kind: "offer", on: null, fields: { intent: 0, label },
        expected: { intent: s.scope.item(0).revision } } as const);
      if (otherAt === 0) await other();
      await client.submitBoundAct(identity(sourceKey), offer("earlier"));
      const earlier = s.copies.find(copy => copy.intent.idempotencyKey === sourceKey)!;
      if (otherAt === 1) await other();
      await client.submitBoundAct(identity(sourceKey), offer("latest"));
      const latest = s.copies.filter(copy => copy.intent.idempotencyKey === sourceKey).at(-1)!;
      if (otherAt === 2) await other();
      const row = await client.authorization(identity(sourceKey));
      if (!row) return expect.fail("both source versions must remain retained");
      expect(row.versions).toHaveLength(2);
      expect(row.versions[0]!.id).not.toBe(row.versions[1]!.id);
      latestId = row.versions[1]!.id;
      const source = { key: sourceKey, version: row.versions[1]!.id };
      const act = { kind: "assign", on: { output: source }, fields: { performer: s.actor.member },
        expected: { on: { after: source } } } as const;
      let retained!: () => void;
      const written = new Promise<void>(resolve => { retained = resolve; });
      const write = store.authorizations.write.bind(store.authorizations);
      store.authorizations.write = async (owner, scope, rows) => {
        await write(owner, scope, rows);
        if (rows.some(value => value.key === dependentKey)) retained();
      };
      const signs = s.signs(), posts = s.copies.length;
      const pending = client.submitBoundAct(identity(dependentKey), act).then(value => ({ value }), error => ({ error }));
      await Promise.race([written, pending.then(result => { throw new Error(`dependent ended before retention: ${JSON.stringify(result)}`); })]);
      const waiting = await client.authorization(identity(dependentKey));
      expect(waiting?.versions[0]?.act).toEqual(act);
      expect(waiting?.permissions).toEqual([]); expect(waiting?.materializations).toEqual([]);
      expect(await new Custody(store, () => timeOf(s.now())).find({ ...who, key: dependentKey })).toBeNull();
      expect([s.signs(), s.copies.length, boundaryCalls]).toEqual([signs, posts, 0]);
      expect(s.scope.submit(recorded === "earlier" ? earlier : latest).result).toBe("write");
      s.mode("answer"); s.feed.current(s.scope); await client.read();
      const result = await pending;
      if (recorded === "earlier") {
        mismatched++;
        expect(result).toMatchObject({ error: { name: "AuthorizationError", reason: "source" } });
        expect((await client.authorization(identity(dependentKey)))?.versions[0]?.act).toEqual(act);
        expect((await client.authorization(identity(dependentKey)))?.permissions).toEqual([]);
        expect([s.signs(), s.copies.length, boundaryCalls]).toEqual([signs, posts, 0]);
      } else {
        matched++;
        if (!("value" in result)) return expect.fail(`matched source did not send: ${String(result.error)}`);
        expect("answer" in result.value && result.value.answer.answer).toBe("accepted");
        expect([s.signs(), s.copies.length, boundaryCalls]).toEqual([signs + 1, posts + 1, 1]);
      }
      await checkSigningAuthorizations(s, store);
    } finally { client.close(); }
  }
  expect({ matched, mismatched, dependentSigns }).toEqual({ matched: 3, mismatched: 3, dependentSigns: 3 });
});
