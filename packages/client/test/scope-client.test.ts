/** The in-memory judge/fold is real; the transport, observation and client clock are deterministic stand-ins. */
import { expect, test } from "vitest";
import { timeOf } from "@generalbusiness/dap-bytes";
import { Custody, memoryStore } from "../src/custody.ts";
import { signedIntent } from "../src/intent.ts";
import { intentMeaning } from "../src/replica.ts";
import { scopeClient, request, clientReplica, clientIdle, type DraftRead } from "../src/scope-client.ts";
import { requestScene } from "./request-support.ts";

function clientAt(s: ReturnType<typeof requestScene>, store = memoryStore(), drafts: DraftRead<typeof s.handle.definition> = { read: async () => null }, lifetimeSeconds = 60) {
  const member = { service: "https://requests.test", membership: s.actor.member.membership, member: s.actor.member.member, principal: s.actor.principal };
  const client = scopeClient(s.handle, { signer: s.signer, member, store, drafts, observe: s.feed.observe, clock: s.clock, lifetimeSeconds });
  const who = { service: member.service, membership: member.membership, signer: s.signer.key, target: s.handle.at };
  return { client, store, who };
}

// Invariant (sections 5.5 and 7): cached state after a failed read is no proof of absence after death.
test("a failed journal read with the feed down cannot end a dead latest signing; a later complete read ends it", async () => {
  const s = requestScene(), { client, store, who } = clientAt(s);
  s.feed.current(s.scope);
  await client.read();
  const head = client.view.head;
  const signed = await signedIntent(s.signer, { to: s.handle.at, kind: "remark", on: 0, fields: { text: "signed but not sent" } },
    { now: s.now(), idempotencyKey: "prepared", lifetimeSeconds: 60 });
  const custody = new Custody(store, () => timeOf(s.now())), identity = { ...who, key: "prepared" };
  await custody.keep(identity, intentMeaning(signed.intent), async () => ({ binding: { definition: s.handle.definition.name, kind: "remark", declaration: s.handle.digest, pinned: s.handle.digest }, envelope: { signed, beside: {} } }), timeOf(s.now() + 30_000));
  s.feed.down();
  s.serving.refuse = () => ({ ok: false, reason: "unavailable" });
  s.advance(120_000);
  await client.read();
  expect(client.view.head).toEqual(head);
  expect(client.view.state.is).toBe("behind");
  expect((await custody.find(identity))!.phase).toBe("prepared");
  expect(s.copies).toHaveLength(0);
  s.serving.refuse = null;
  s.feed.current(s.scope);
  await client.read();
  expect((await custody.find(identity))!.phase).toBe("refused");
  expect((await custody.find(identity))!.outcomes.at(-1)).toMatchObject({ unsent: head });
  client.close();
  expect([s.feed.cancelled, s.timers.size]).toEqual([1, 0]);
});

// Invariant: signing belongs to a request call, and a folded entry settles custody before publishing its view.
test("a request signs once, reads its acceptance head, and row by key resolves to the recorded opened item", async () => {
  const s = requestScene(), { client, store, who } = clientAt(s);
  s.feed.current(s.scope); await client.read();
  const signatures = s.signs();
  const answer = await request(client, "one", "offer", { fields: { intent: 0 } });
  expect("answer" in answer && answer.answer.answer).toBe("accepted");
  expect(s.signs()).toBe(signatures + 1);
  const custody = new Custody(store, () => timeOf(s.now()));
  expect((await custody.find({ ...who, key: "one" }))!.phase).toBe("accepted");
  expect(client.view.requests.find(row => row.key === "one")).toBeUndefined();
  expect(client.view.row({ key: "one" })?.type).toBe("commitment");
  client.close();
  expect([s.feed.cancelled, s.timers.size]).toEqual([1, 0]);
});

// Invariant (78016c59): A, B, A creates three signings; the client never selects an earlier envelope for a new submit.
test("alternating values signs the third A again; a late first A is recorded and closes custody for signing zero", async () => {
  const s = requestScene(), { client, store, who } = clientAt(s);
  s.feed.current(s.scope); await client.read();
  s.mode("refused");
  await request(client, "alternating", "remark", { on: 0, fields: { text: "A" } });
  s.advance(1000);
  await request(client, "alternating", "remark", { on: 0, fields: { text: "B" } });
  s.advance(1000);
  await request(client, "alternating", "remark", { on: 0, fields: { text: "A" } });
  const custody = new Custody(store, () => timeOf(s.now())), identity = { ...who, key: "alternating" };
  const before = (await custody.find(identity))!;
  expect(before.signings).toHaveLength(3);
  expect(before.signings[0]!.intent).not.toBe(before.signings[2]!.intent);
  expect(s.copies.map(copy => copy.intent.fields["text"])).toEqual(["A", "B", "A"]);
  expect(s.copies.slice(1).every(copy => copy.intent.notAfter !== s.copies[0]!.intent.notAfter)).toBe(true);
  expect(s.deliverHeld()?.answer).toBe("accepted");
  s.feed.current(s.scope); await client.read();
  const after = (await custody.find(identity))!;
  expect(after.phase).toBe("accepted");
  expect(after.outcomes.at(-1)).toMatchObject({ signing: 0 });
  expect(client.view.requests.find(view => view.key === "alternating")).toBeUndefined();
  client.close();
});

// Invariant (78016c59): alternating values cannot bypass the kept-envelope bound; a failed submit keeps the draft values.
test("alternating values reaches eight envelopes before signing and can submit after one closes", async () => {
  const s = requestScene(), store = memoryStore();
  let text = "A";
  const member = { service: "https://requests.test", membership: s.actor.member.membership, member: s.actor.member.member, principal: s.actor.principal };
  const client = scopeClient(s.handle, { signer: s.signer, member, store, drafts: { read: async () => ({ kind: "remark", values: { on: 0, fields: { text } } }) }, observe: s.feed.observe, clock: s.clock, lifetimeSeconds: 60 });
  s.feed.current(s.scope); await client.read(); s.mode("refused");
  for (let n = 0; n < 8; n++) { text = n % 2 ? "B" : "A"; await request(client, "eight", "remark", { on: 0, fields: { text } }); s.advance(1000); }
  const signs = s.signs(); text = "ninth values";
  await expect(request(client, "eight", "remark", { on: 0, fields: { text } })).rejects.toMatchObject({ why: { held: "full", reason: "signings" } });
  expect(s.signs()).toBe(signs);
  expect(client.view.requests.find(view => view.key === "eight")?.values).toMatchObject({ fields: { text } });
  const custody = new Custody(store, () => timeOf(s.now()));
  const identity = { service: member.service, membership: member.membership, signer: s.signer.key, target: s.handle.at, key: "eight" };
  s.advance(112_000);
  // The member call reads after the first signing died and closes that older envelope before admission.
  await client.read();
  expect((await custody.find(identity))!.signings[0]!.closed).toBe(true);
  await request(client, "eight", "remark", { on: 0, fields: { text } });
  expect(s.signs()).toBe(signs + 1);
  client.close();
});


function gate() {
  let entered!: () => void, release!: () => void;
  const started = new Promise<void>(done => { entered = done; });
  const held = new Promise<void>(done => { release = done; });
  return { started, release, wait: () => { entered(); return held; } };
}

// Invariant: close at a store await prevents both a new signature and the new custody record.
test.each(["find", "admission"] as const)("close during %s cannot resume into signing or dispatch", async boundary => {
  const s = requestScene(), store = memoryStore(), { client } = clientAt(s, store);
  s.feed.current(s.scope); await client.read();
  const stopped = gate(), read = store.read.bind(store), exclusive = store.exclusive.bind(store);
  let armed = true;
  if (boundary === "find") store.read = async id => { if (armed) { armed = false; await stopped.wait(); } return read(id); };
  else store.exclusive = async run => { if (armed) { armed = false; await stopped.wait(); } return exclusive(run); };
  const signs = s.signs();
  const call = request(client, "closed", "remark", { on: 0, fields: { text: "never signed" } });
  const rejected = expect(call).rejects.toThrow();
  await stopped.started; client.close(); stopped.release(); await rejected;
  expect([s.signs(), s.copies.length, store.records.size, s.timers.size]).toEqual([signs, 0, 0, 0]);
});

// Invariant: a complete read begun before death does not become post-death evidence while a store read waits.
test("crossing death during draft read cannot turn the preceding journal read into absence proof", async () => {
  const s = requestScene(), store = memoryStore(), held = gate();
  let block = false;
  const { client, who } = clientAt(s, store, { read: async () => { if (block) { block = false; await held.wait(); } return null; } });
  s.feed.current(s.scope); await client.read();
  const signed = await signedIntent(s.signer, { to: s.handle.at, kind: "remark", on: 0, fields: { text: "prepared" } }, { now: s.now(), idempotencyKey: "death", lifetimeSeconds: 60 });
  const custody = new Custody(store, () => timeOf(s.now())), identity = { ...who, key: "death" };
  await custody.keep(identity, intentMeaning(signed.intent), async () => ({ binding: { definition: s.handle.definition.name, kind: "remark", declaration: s.handle.digest, pinned: s.handle.digest }, envelope: { signed, beside: {} } }), timeOf(s.now() + 30_000));
  await client.read(); s.advance(110_000); s.feed.down();
  block = true;
  const early = client.read(); await held.started;
  s.serving.refuse = () => ({ ok: false, reason: "unavailable" });
  s.advance(10_000); held.release(); await early; await client.read();
  expect((await custody.find(identity))!.phase).toBe("prepared");
  s.serving.refuse = null; await client.read();
  expect((await custody.find(identity))!.phase).toBe("refused");
  client.close();
});

// Invariant: a replica change during a draft await cannot publish the new entry before its custody closure.
test("an entry that arrives during draft read closes custody in the same published view", async () => {
  const s = requestScene(), store = memoryStore(), held = gate();
  let block = false;
  const { client, who } = clientAt(s, store, { read: async () => { if (block) { block = false; await held.wait(); } return null; } });
  s.feed.current(s.scope); await client.read(); s.mode("unavailable");
  await request(client, "changing", "remark", { on: 0, fields: { text: "later" } });
  const custody = new Custody(store, () => timeOf(s.now())), identity = { ...who, key: "changing" };
  const phaseAtEntry: string[] = [];
  client.subscribe(view => {
    if (view.head!.seq < 2) return;
    const raw = [...store.records.values()].map(value => JSON.parse(value)).find(value => value.identity.key === "changing");
    phaseAtEntry.push(raw.phase);
  });
  block = true; const reading = client.read(); await held.started;
  expect(s.scope.submit(s.copies[0]!).result).toBe("write");
  s.feed.current(s.scope); await clientReplica(client).read();
  held.release(); await reading; await client.read();
  expect((await custody.find(identity))!.phase).toBe("accepted");
  expect(phaseAtEntry.length).toBeGreaterThan(0);
  expect(phaseAtEntry.every(phase => phase === "accepted")).toBe(true);
  client.close();
});

// Invariant (55c2133c): protocol refusal gets one head-read attempt, then stops without a barrier or further sends.
test("a protocol refusal returns while reads fail, freezes another pending request, and a new client continues it", async () => {
  const s = requestScene(), store = memoryStore();
  let at = clientAt(s, store), client = at.client;
  s.feed.current(s.scope); await client.read(); s.mode("unavailable");
  await request(client, "pending", "remark", { on: 0, fields: { text: "keep" } });
  s.serving.refuse = () => ({ ok: false, reason: "unavailable" }); s.mode("protocol");
  await request(client, "protocol", "remark", { on: 0, fields: { text: "fault" } });
  expect(client.view.state).toEqual({ is: "stopped", cause: { by: "protocol", reason: "unknown-act" } });
  expect(client.view.requests.find(row => row.key === "protocol")).toMatchObject({ status: "refused", why: { by: "scope", reason: "unknown-act", class: "protocol" } });
  expect(client.view.requests.find(row => row.key === "pending")?.status).toBe("pending");
  const posts = s.copies.length; s.advance(120_000); await client.read();
  expect([s.copies.length, s.timers.size]).toEqual([posts, 0]);
  expect(client.view.requests.find(row => row.key === "pending")?.status).toBe("pending");
  client.close(); s.serving.refuse = null; s.mode("answer");
  at = clientAt(s, store); client = at.client; s.feed.current(s.scope); await client.read();
  const record = await new Custody(store, () => timeOf(s.now())).find({ ...at.who, key: "pending" });
  expect(record!.phase).toBe("refused"); // the new client ends the now-dead absent signing
  client.close();
});

test("a protocol head read that holds the key publishes recorded before the protocol stop", async () => {
  const s = requestScene(), { client, store, who } = clientAt(s);
  s.feed.current(s.scope); await client.read(); s.mode("protocol-recorded");
  await request(client, "held", "remark", { on: 0, fields: { text: "written" } });
  expect(client.view.state).toMatchObject({ is: "stopped", cause: { by: "protocol" } });
  expect(client.view.requests.find(row => row.key === "held")).toBeUndefined();
  expect((await new Custody(store, () => timeOf(s.now())).find({ ...who, key: "held" }))!.phase).toBe("accepted");
  expect(s.timers.size).toBe(0); client.close();
});


// Invariant: the dispatch closure checks ownership after custody's final record write, even if view reconciliation waits.
test("a replica stop during the dispatch write prevents POST while draft reconciliation is gated", async () => {
  const s = requestScene(), store = memoryStore(), dispatch = gate(), draft = gate();
  let blockDraft = false, blockDispatch = false;
  const write = store.write.bind(store);
  store.write = async (id, record, options) => {
    if (blockDispatch && options?.dispatch && record.phase === "sent") { blockDispatch = false; await dispatch.wait(); }
    return write(id, record, options);
  };
  const { client } = clientAt(s, store, { read: async () => { if (blockDraft) { blockDraft = false; await draft.wait(); } return null; } });
  s.feed.current(s.scope); await client.read();
  blockDraft = true; blockDispatch = true;
  const call = request(client, "stopped", "remark", { on: 0, fields: { text: "no post" } });
  await dispatch.started; await draft.started;
  clientReplica(client).protocol("unknown-act");
  dispatch.release(); draft.release(); await call;
  expect(s.copies).toHaveLength(0);
  expect(s.timers.size).toBe(0); client.close();
});

// Invariant: close paints the last reconciled head, not a newly folded head still awaiting custody closure.
test("close during a draft await preserves the reconciled view until a new client reads the entry", async () => {
  const s = requestScene(), store = memoryStore(), held = gate();
  let block = false;
  const { client } = clientAt(s, store, { read: async () => { if (block) { block = false; await held.wait(); } return null; } });
  s.feed.current(s.scope); await client.read(); s.mode("unavailable");
  await request(client, "closing", "remark", { on: 0, fields: { text: "later" } });
  const before = client.view;
  block = true; const reading = client.read(); await held.started;
  expect(s.scope.submit(s.copies[0]!).result).toBe("write");
  s.feed.current(s.scope); await clientReplica(client).read();
  client.close();
  expect(client.view.head).toEqual(before.head);
  expect(client.view.requests).toEqual(before.requests);
  expect(client.view.state).toEqual({ is: "stopped", cause: { by: "close" } });
  held.release(); await reading;
  expect(client.view.head).toEqual(before.head);
  expect(s.timers.size).toBe(0);
});


// Invariant (section 7): retry intervals begin after each journal read, and a timer resends custody's exact bytes without signing.
test("unavailable replies retry after 1, 2, 4, 8, 16 and then thirty seconds with one timer", async () => {
  const s = requestScene(), { client } = clientAt(s, memoryStore(), { read: async () => null }, 300);
  s.feed.current(s.scope); await client.read(); s.mode("unavailable");
  await request(client, "schedule", "remark", { on: 0, fields: { text: "retry exact bytes" } });
  const signs = s.signs(), bytes = JSON.stringify(s.copies[0]);
  for (const delay of [1000, 2000, 4000, 8000, 16000, 30000, 30000]) {
    const copies = s.copies.length;
    s.advance(delay - 1); await clientIdle(client); expect(s.copies).toHaveLength(copies);
    s.advance(1); await clientIdle(client); expect(s.copies).toHaveLength(copies + 1);
    expect(s.timers.size).toBe(1);
  }
  expect(s.signs()).toBe(signs);
  expect(s.copies.every(copy => JSON.stringify(copy) === bytes)).toBe(true);
  // Automatic copying stops at notAfter, before the signing becomes dead by the margin.
  s.advance(Date.parse(s.copies[0]!.intent.notAfter) - s.now());
  await clientIdle(client);
  const copies = s.copies.length; s.advance(30_000); await clientIdle(client);
  expect(s.copies).toHaveLength(copies);
  client.close(); expect(s.timers.size).toBe(0);
});

// Invariant: a lost reply triggers a journal read, and an entry already there suppresses every retry.
test("a lost acceptance is settled by the immediate journal read without a second POST or signature", async () => {
  const s = requestScene(), { client, store, who } = clientAt(s);
  s.feed.current(s.scope); await client.read(); s.mode("lost");
  await request(client, "lost", "remark", { on: 0, fields: { text: "in the journal" } });
  expect((await new Custody(store, () => timeOf(s.now())).find({ ...who, key: "lost" }))!.phase).toBe("accepted");
  const counts = [s.copies.length, s.signs()]; s.advance(120_000); await clientIdle(client);
  expect([s.copies.length, s.signs()]).toEqual(counts);
  client.close();
});

// Invariant: a returning feed sends a live pending request at once; a refusal ends its attempt until another member call.
test("the returning feed resends one live pending request, while a refused attempt sends no timer copy", async () => {
  const s = requestScene(), { client } = clientAt(s);
  s.feed.current(s.scope); await client.read(); s.mode("unavailable");
  await request(client, "return", "remark", { on: 0, fields: { text: "pending" } });
  const signs = s.signs(); s.feed.down(); s.serving.refuse = () => ({ ok: false, reason: "unavailable" });
  await client.read();
  s.serving.refuse = null; s.mode("answer"); s.feed.current(s.scope); await clientIdle(client);
  expect([s.copies.length, s.signs()]).toEqual([2, signs]);
  s.mode("refused"); await request(client, "refused", "remark", { on: 0, fields: { text: "returned" } });
  const posts = s.copies.length; s.advance(120_000); await clientIdle(client);
  expect(s.copies).toHaveLength(posts); client.close();
});

// Invariant: a send has one thirty-second deadline and reads no reply after it.
test("an unanswered send ends lost at thirty seconds, then the client reads before retrying", async () => {
  const s = requestScene(), { client, store, who } = clientAt(s);
  s.feed.current(s.scope); await client.read(); s.mode("hold");
  const sent = gate(); s.inspectCopies(async () => { await sent.wait(); });
  const call = request(client, "timeout", "remark", { on: 0, fields: { text: "held" } });
  await sent.started; const reads = s.serving.reads.length;
  s.advance(30_000); sent.release(); await call;
  expect((await new Custody(store, () => timeOf(s.now())).find({ ...who, key: "timeout" }))!.phase).toBe("unknown");
  expect(s.serving.reads.length).toBeGreaterThan(reads);
  expect(s.copies).toHaveLength(1); client.close();
});

// Invariant: a key identifies its predicted opened row before dispatch and the actual opened item after a different entry moves the position.
test("row by key keeps its selection from a marked prediction to the recorded item", async () => {
  const s = requestScene(), { client } = clientAt(s), sent = gate();
  s.feed.current(s.scope); await client.read();
  s.inspectCopies(async () => { await sent.wait(); });
  const call = request(client, "selected", "offer", { fields: { intent: 0 } });
  await sent.started; await client.read();
  const predicted = client.view.row({ key: "selected" });
  expect(predicted).toMatchObject({ type: "commitment", pending: { key: "selected" } });
  expect(client.view.rows("commitment").some(row => row.pending?.key === "selected")).toBe(true);
  s.scope.did(s.actor, "remark", { on: 0, fields: { text: "another entry" } });
  sent.release(); await call;
  const recorded = client.view.row({ key: "selected" });
  expect(recorded?.type).toBe("commitment");
  expect(recorded?.pending).toBeUndefined();
  expect(recorded!.id).toBeGreaterThan(predicted!.id);
  client.close();
});
