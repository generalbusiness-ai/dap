/** The in-memory judge/fold is real; the transport, observation and client clock are deterministic stand-ins. */
import { afterEach, expect, test } from "vitest";
import type { Digest } from "@generalbusiness/dap-contract";
import { canonicalize, intentDigest, timeOf } from "@generalbusiness/dap-bytes";
import { Custody, identityId, memoryStore } from "../src/custody.ts";
import { secretSigner, signedIntent } from "../src/intent.ts";
import { keys } from "@generalbusiness/dap-derive/testing";
import { sendableAt } from "../src/originals.ts";
import { intentMeaning, seamOf } from "../src/replica.ts";
import { DeclaredHandle, shapeDeclaredAct } from "../src/declared.ts";
import { ScopeHandle } from "../src/handle.ts";
import { bindingTransport, type ServiceBinding } from "../src/binding.ts";
import { Feed, SESSION } from "./replica-support.ts";
import { scopeClient, request, clientReplica, clientIdle, clientDelivery } from "../src/scope-client.ts";
import { requestDescriptors, checkSigningAuthorizations, requestScene } from "./request-support.ts";
import { memoryDrafts, refineDraft, type DraftPort, type StoredDraft } from "../src/draft-store.ts";
import { prepareDraftEdit } from "../src/draft-edit.ts";

const authorizationAudits: { scene: ReturnType<typeof requestScene>; store: ReturnType<typeof memoryStore> }[] = [];
afterEach(async () => { for (const audit of authorizationAudits.splice(0)) await checkSigningAuthorizations(audit.scene, audit.store); });

function clientAt(s: ReturnType<typeof requestScene>, store = memoryStore(), drafts: DraftPort = memoryDrafts(), lifetimeSeconds = 60) {
  const member = { service: "https://requests.test", membership: s.actor.member.membership, member: s.actor.member.member, principal: s.actor.principal };
  authorizationAudits.push({ scene: s, store });
  const client = scopeClient(s.handle, { signer: s.signer, member, store, drafts, observe: s.feed.observe, clock: s.clock, lifetimeSeconds });
  const who = { service: member.service, membership: member.membership, signer: s.signer.key, target: s.handle.at };
  return { client, store, who, drafts };
}

/** Real raw waiting rows for the old C3 present-value fixtures, not Client.edit. */
function waitingRemark(s: ReturnType<typeof requestScene>, key: string, text: string): StoredDraft {
  const item = s.scope.item(0), binding = { owner: s.signer.key, scope: s.handle.at,
    definition: s.handle.digest, descriptors: requestDescriptors(s.handle.definition) };
  const prepared = prepareDraftEdit({ binding, definition: s.handle.definition, rows: [item],
    slot: { kind: "remark", on: item.id, items: {} }, namedRefs: {
      on: { name: item.id, seen: item.revision, assumes: [] }, fields: {},
    }, current: null, key, patch: { text } });
  if (!prepared.ok) throw new Error("TEST waiting remark requires the actual fixture item");
  return refineDraft({ ...prepared.draft, placement: "waiting" }, binding, s.handle.definition);
}
/** Planner 6d3b979f item 3: one switch on `is` narrows each list entry. No reader sniffs fields. */
type Listed = ReturnType<typeof clientAt>["client"]["view"];
const listed = (view: Listed, key: string) => view.requests.find(entry => entry.key === key);
const requestOf = (view: Listed, key: string) => { const entry = listed(view, key); return entry?.is === "request" ? entry : undefined; };
/** Planner 6d3b979f item 1: a stored draft in the list reads item 0 from `slot` and the text from `values`. */
const draftOf = (view: Listed, key: string) => {
  const entry = listed(view, key);
  return entry?.is === "draft" ? { on: (entry.slot as unknown as { on: { name: number } }).on.name, text: (entry.values as { text?: string }).text } : null;
};
/** Gate a real full-batch read; no key-specific or fabricated reader survives. */
function gatedDrafts(wait: () => Promise<void> | undefined): DraftPort {
  const drafts = memoryDrafts(), read = drafts.read.bind(drafts);
  drafts.read = async (owner, scope) => {
    const batch = await read(owner, scope), held = wait();
    if (held) await held;
    return batch;
  };
  return drafts;
}

// Invariant (9fa19bb3): a draft notification during publication starts another reconciliation without a third trigger.
test("a subscriber's draft edit during publication publishes the new meaning without another trigger", async () => {
  const s = requestScene(), store = memoryStore();
  let text = "first", scans = 0;
  const drafts = memoryDrafts();
  const edit = (value: string) => drafts.write(s.signer.key, s.handle.at, [waitingRemark(s, "handoff", value)]);
  await store.exclusive(() => edit(text));
  const byTarget = store.byTarget.bind(store);
  store.byTarget = who => { scans++; return byTarget(who); };
  const { client } = clientAt(s, store, drafts);
  s.feed.current(s.scope); s.mode("refused");
  await request(client, "handoff", "remark", { on: 0, fields: { text } });
  const meaning = (value: string) => canonicalize({ on: 0, text: value });
  let edited = false, notified!: () => void, published!: () => void, thirdWrite: Promise<void> | undefined;
  const notificationHandled = new Promise<void>(resolve => { notified = resolve; });
  const newMeaningPublished = new Promise<void>(resolve => { published = resolve; });
  const unsubscribe = client.subscribe(view => {
    const held = draftOf(view, "handoff");
    if (!held) return;
    if (!edited && canonicalize(held) === meaning("second")) {
      edited = true;
      // The existing fixture fence is already held; raw write/notification stays synchronous.
      thirdWrite = edit("third");
      // edit queued the background reconciliation first. This barrier follows
      // its call to byTarget, without waiting for or triggering another read.
      queueMicrotask(notified);
    }
    if (canonicalize(held) === meaning("third")) published();
  });
  try {
    // Hold one existing fence across the real writes and publication barrier.
    // The subscriber must not queue a nested exclusive or a later write.
    await store.exclusive(async () => {
      const before = scans;
      const secondWrite = edit("second");
      try {
        await notificationHandled;
        // Old separate-finally ownership joins the finished pass here: only one
        // scan ran. Fail that assertion before awaiting a view it would never emit.
        expect(scans).toBe(before + 2);
        await newMeaningPublished;
        expect(draftOf(client.view, "handoff")).toEqual({ on: 0, text: "third" });
      } finally { await secondWrite; await thirdWrite; }
    });
  } finally { unsubscribe(); client.close(); }
});

// Invariant (sections 5.5 and 7): cached state after a failed read is no proof of absence after death.
test("a failed journal read with the feed down cannot end a dead latest signing; a later complete read ends it", async () => {
  const s = requestScene(), { client, store, who } = clientAt(s);
  s.feed.current(s.scope);
  await client.read();
  const head = client.view.head;
  const signed = await signedIntent(s.signer, { to: s.handle.at, kind: "remark", on: 0, fields: { text: "signed but not sent" } },
    { now: s.now(), idempotencyKey: "prepared", lifetimeSeconds: 60 });
  const custody = new Custody(store, () => timeOf(s.now())), identity = { ...who, key: "prepared" };
  s.seedLegacy(signed);
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

// Invariant (570df0cf): the handle rejects a whole bad page before the replica can fold or reconcile any prefix.
test("a page with a later wrong hash stops the replica without folding its prefix or closing custody", async () => {
  const s = requestScene(), store = memoryStore();
  let now = s.now();
  s.clock.now = () => now;
  const identity = { service: "https://requests.test", membership: s.actor.member.membership,
    signer: s.signer.key, target: s.handle.at, key: "wrong-hash" };
  const signed = await signedIntent(s.signer, { to: s.handle.at, kind: "remark", on: 0, fields: { text: "kept before the page" } },
    { now, idempotencyKey: identity.key, lifetimeSeconds: 60 });
  const custody = new Custody(store, () => timeOf(now));
  s.seedLegacy(signed);
  await custody.keep(identity, intentMeaning(signed.intent), async () => ({
    binding: { definition: s.handle.definition.name, kind: "remark", declaration: s.handle.digest, pinned: s.handle.digest },
    envelope: { signed, beside: {} },
  }), timeOf(now + 30_000));
  const id = identityId(identity), raw = store.records.get(id), signs = s.signs(), copies = s.copies.length;
  expect(s.scope.submit(signed).result).toBe("write");
  const badAt = s.scope.head.seq, wrongHash = s.scope.entries[0]!.hash;
  expect(badAt).toBeGreaterThan(0);
  expect(s.scope.head.hash).not.toBe(wrongHash);
  const binding = {
    summary: async () => s.handle.scope.summary(),
    log: async (_scope: string, _reader: unknown, cursor?: string) => {
      const read = await s.handle.scope.log(cursor);
      if (!read.ok) return read;
      // Return the closed transport shape, then let the outer real handle check the one corrupted hash.
      const { coverage: _coverage, ...page } = read;
      return { ...page, value: { ...page.value, entries: page.value.entries.map(row => row.seq === badAt ? { ...row, hash: wrongHash } : row) } };
    },
  } as unknown as ServiceBinding;
  const handle = new DeclaredHandle(new ScopeHandle(bindingTransport(binding), s.scope.at.scope, SESSION),
    s.scope.at, s.handle.definition, s.handle.digest);
  now = sendableAt(signed.intent.notAfter);
  const { client } = clientAt({ ...s, handle }, store);
  try {
    await client.read(); await clientIdle(client);
    // This finite assertion is the stop-control boundary, before any event wait or another read trigger.
    expect(client.view.state).toEqual({ is: "stopped", cause: { by: "log" } });
    const replica = clientReplica(client);
    expect(client.view.head).toBeNull();
    expect(seamOf(replica).held.size).toBe(0);
    expect(replica.accepted(s.signer.key, identity.key)).toBeNull();
    expect(s.feed.cancelled).toBe(1);
    expect(store.records.get(id)).toBe(raw);
    const kept = (await custody.find(identity))!;
    expect(kept.phase).toBe("prepared");
    expect(kept.signings.at(-1)!.closed).not.toBe(true);
    expect(kept.outcomes).toEqual([]);
    expect((await store.unresolved()).map(row => row.id)).toEqual([id]);
    expect([s.signs(), s.copies.length]).toEqual([signs, copies]);
  } finally { client.close(); }
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
  // Custody folding is a separate reconciliation (planner 0967101f); wait for it before reading the record.
  await clientIdle(client);
  const after = (await custody.find(identity))!;
  expect(after.phase).toBe("accepted");
  expect(after.outcomes.at(-1)).toMatchObject({ signing: 0 });
  expect(client.view.requests.find(view => view.key === "alternating")).toBeUndefined();
  client.close();
});

// Invariant (78016c59): alternating values cannot bypass the kept-envelope bound; a failed submit keeps the draft values.
test("alternating values reaches eight envelopes before signing and can submit after one closes", async () => {
  const s = requestScene(), store = memoryStore(), drafts = memoryDrafts();
  let text = "A";
  const member = { service: "https://requests.test", membership: s.actor.member.membership, member: s.actor.member.member, principal: s.actor.principal };
  authorizationAudits.push({ scene: s, store });
  const client = scopeClient(s.handle, { signer: s.signer, member, store, drafts, observe: s.feed.observe, clock: s.clock, lifetimeSeconds: 60 });
  s.feed.current(s.scope); await client.read(); s.mode("refused");
  for (let n = 0; n < 8; n++) {
    text = n % 2 ? "B" : "A";
    await store.exclusive(() => drafts.write(s.signer.key, s.handle.at, [waitingRemark(s, "eight", text)]));
    await request(client, "eight", "remark", { on: 0, fields: { text } }); s.advance(1000);
  }
  const signs = s.signs(); text = "ninth values";
  await store.exclusive(() => drafts.write(s.signer.key, s.handle.at, [waitingRemark(s, "eight", text)]));
  await expect(request(client, "eight", "remark", { on: 0, fields: { text } })).rejects.toMatchObject({ why: { held: "full", reason: "signings" } });
  expect(s.signs()).toBe(signs);
  expect(draftOf(client.view, "eight")).toEqual({ on: 0, text });
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

// Invariant (ruling 83f24a4a): a newer complete post-death proof cannot join a finished absence drain.
test("a post-death proof arriving at absence handoff ends the signing without another read", async () => {
  const s = requestScene(), store = memoryStore(), ending = gate(), draft = gate();
  let now = s.now(), blockDraft = false;
  // Move the injected clock without firing death/retry timers: only the two explicit reads can supply proofs.
  s.clock.now = () => now;
  const { client, who } = clientAt(s, store, gatedDrafts(() => {
    if (blockDraft) { blockDraft = false; return draft.wait(); }
    return undefined;
  }));
  const custody = new Custody(store, () => timeOf(now));
  const prepare = async (key: string) => {
    const signed = await signedIntent(s.signer, { to: s.handle.at, kind: "remark", on: 0, fields: { text: key } },
      { now, idempotencyKey: key, lifetimeSeconds: 60 });
    s.seedLegacy(signed);
    await custody.keep({ ...who, key }, intentMeaning(signed.intent), async () => ({
      binding: { definition: s.handle.definition.name, kind: "remark", declaration: s.handle.digest, pinned: s.handle.digest },
      envelope: { signed, beside: {} },
    }), timeOf(now + 30_000));
    return signed;
  };
  s.feed.current(s.scope); await client.read(); await clientIdle(client);
  const earlier = await prepare("earlier"); now += 30_000;
  const later = await prepare("later"); await clientIdle(client);
  s.feed.down(); await clientIdle(client);
  const earlierIdentity = { ...who, key: "earlier" }, laterIdentity = { ...who, key: "later" };
  const earlierId = identityId(earlierIdentity), lock = store.lock.bind(store);
  let blockRelease = true;
  store.lock = async (id, notAfter) => {
    const release = await lock(id, notAfter);
    if (!release) return null;
    return async () => {
      await release();
      // The real absence write and actual unlock completed; only its asynchronous return is held.
      if (blockRelease && id === earlierId) { blockRelease = false; await ending.wait(); }
    };
  };
  const signs = s.signs(), copies = s.copies.length, head = client.view.head;
  const reads = s.serving.reads.length;
  let first: Promise<void> | undefined, second: Promise<void> | undefined;
  try {
    now = sendableAt(earlier.intent.notAfter);
    expect(now).toBeLessThan(sendableAt(later.intent.notAfter));
    first = client.read(); await ending.started;
    expect((await custody.find(earlierIdentity))!.phase).toBe("refused");
    expect((await custody.find(laterIdentity))!.phase).toBe("prepared");
    // Drain the write's background sync while the first absence drain still awaits its lock-release return.
    // clientIdle performs no journal read and supplies no absence proof.
    await clientIdle(client);
    now = sendableAt(later.intent.notAfter);
    blockDraft = true; second = client.read(); await draft.started;
    // These independently gated port settlements create M,Q,E,S,F in the source-derived job table.
    ending.release(); queueMicrotask(draft.release);
    await first; await second;
    // Both read promises settle even when the old owner drops the second proof. Assert before any third trigger.
    expect(s.serving.reads.slice(reads)).toHaveLength(2);
    expect([s.signs(), s.copies.length]).toEqual([signs, copies]);
    expect(client.view.head).toEqual(head);
    const ended = (await custody.find(laterIdentity))!;
    expect(ended.phase).toBe("refused");
    expect(ended.signings.at(-1)!.closed).toBe(true);
    expect(ended.outcomes.at(-1)).toMatchObject({ unsent: head });
    expect(await store.unresolved()).toEqual([]);
  } finally {
    ending.release(); draft.release(); client.close(); store.lock = lock;
  }
});

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
  const { client, who } = clientAt(s, store, gatedDrafts(() => { if (block) { block = false; return held.wait(); } return undefined; }));
  s.feed.current(s.scope); await client.read();
  const signed = await signedIntent(s.signer, { to: s.handle.at, kind: "remark", on: 0, fields: { text: "prepared" } }, { now: s.now(), idempotencyKey: "death", lifetimeSeconds: 60 });
  const custody = new Custody(store, () => timeOf(s.now())), identity = { ...who, key: "death" };
  s.seedLegacy(signed);
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

// Invariant (aa12ecdd, planner 6d3b979f item 2): a replica change during a draft await cannot publish the new entry as pending.
// Every published view that holds the entry shows the request as recorded. The stored record reaches `accepted` when the
// background fold step ends; the fold is its own reconciliation and no publication waits for it.
test("an entry that arrives during draft read publishes the request as recorded, and the background fold then accepts its record", async () => {
  const s = requestScene(), store = memoryStore(), held = gate();
  let block = false;
  const { client, who } = clientAt(s, store, gatedDrafts(() => { if (block) { block = false; return held.wait(); } return undefined; }));
  s.feed.current(s.scope); await client.read(); s.mode("unavailable");
  await request(client, "changing", "remark", { on: 0, fields: { text: "later" } });
  const custody = new Custody(store, () => timeOf(s.now())), identity = { ...who, key: "changing" };
  // The barrier is the test's own: it opens when the fold's write lands the accepted record.
  let folded!: () => void;
  const accepted = new Promise<void>(resolve => { folded = resolve; });
  const write = store.write.bind(store);
  store.write = async (id, record) => { await write(id, record); if (record.identity.key === "changing" && record.phase === "accepted") folded(); };
  const withEntry: { listed: boolean; row: { pending?: unknown } | null }[] = [];
  client.subscribe(view => {
    if (view.head!.seq < 2) return;
    const row = view.row({ key: "changing" });
    withEntry.push({ listed: listed(view, "changing") !== undefined, row });
  });
  try {
    block = true; const reading = client.read(); await held.started;
    expect(s.scope.submit(s.copies[0]!).result).toBe("write");
    s.feed.current(s.scope); await clientReplica(client).read();
    held.release(); await reading; await client.read();
    // (a) Every published view that holds the entry shows the request as recorded: the item's own row, no pending mark, no list entry.
    expect(withEntry.length).toBeGreaterThan(0);
    expect(withEntry.every(view => !view.listed && view.row !== null && view.row.pending === undefined)).toBe(true);
    // (b) The fold step ends with the accepted record in custody.
    await accepted;
    expect((await custody.find(identity))!.phase).toBe("accepted");
  } finally { store.write = write; client.close(); }
});

// Invariant (55c2133c): protocol refusal gets one head-read attempt, then stops without a barrier or further sends.
test("a protocol refusal returns while reads fail, freezes another pending request, and a new client continues it", async () => {
  const s = requestScene(), store = memoryStore();
  let at = clientAt(s, store), client = at.client;
  s.feed.current(s.scope); await client.read(); s.mode("unavailable");
  await request(client, "pending", "remark", { on: 0, fields: { text: "keep" } });
  s.serving.refuse = () => ({ ok: false, reason: "unavailable" }); s.mode("protocol");
  // The separate E4 "a second remark waits" witness covers same-subject local order.
  await request(client, "protocol", "link", { fields: { target: s.handle.at, about: 0 } });
  expect(client.view.state).toEqual({ is: "stopped", cause: { by: "protocol", reason: "unknown-act" } });
  expect(requestOf(client.view, "protocol")).toMatchObject({ is: "request", status: "refused", why: { by: "scope", reason: "unknown-act", class: "protocol" } });
  expect(requestOf(client.view, "pending")?.status).toBe("pending");
  const posts = s.copies.length; s.advance(120_000); await client.read();
  expect([s.copies.length, s.timers.size]).toEqual([posts, 0]);
  expect(requestOf(client.view, "pending")?.status).toBe("pending");
  client.close(); s.serving.refuse = null; s.mode("answer");
  at = clientAt(s, store, at.drafts); client = at.client; s.feed.current(s.scope); await client.read();
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
  await clientIdle(client);
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
  const { client } = clientAt(s, store, gatedDrafts(() => { if (blockDraft) { blockDraft = false; return draft.wait(); } return undefined; }));
  s.feed.current(s.scope); await client.read();
  blockDispatch = true;
  const call = request(client, "stopped", "remark", { on: 0, fields: { text: "no post" } });
  await dispatch.started;
  // Publication reads the draft batch on every pass, including the request's own opening read. Gate the first pass that
  // starts after the dispatch write waits.
  blockDraft = true;
  const reading = client.read().catch(() => undefined);
  await draft.started;
  clientReplica(client).protocol("unknown-act");
  dispatch.release(); draft.release(); await call; await reading;
  expect(s.copies).toHaveLength(0);
  expect(s.timers.size).toBe(0); client.close();
});

// Invariant: close paints the last reconciled head, not a newly folded head still awaiting custody closure.
test("close during a draft await preserves the reconciled view until a new client reads the entry", async () => {
  const s = requestScene(), store = memoryStore(), held = gate();
  let block = false;
  const { client } = clientAt(s, store, gatedDrafts(() => { if (block) { block = false; return held.wait(); } return undefined; }));
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
  const s = requestScene(), { client } = clientAt(s, memoryStore(), memoryDrafts(), 300);
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
  await clientIdle(client);
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

// Invariant 8 / case 4: continuing a retained step cannot turn a second key into its owner.
test("a second device cannot sign under the retained step owner", async () => {
  const s = requestScene(), { client, store, drafts } = clientAt(s);
  s.feed.current(s.scope); await client.read(); s.mode("unavailable");
  await request(client, "owned", "remark", { on: 0, fields: { text: "original" } });
  client.close();
  const original = await store.authorizations.read(s.signer.key, s.handle.at);
  const first = original.find(row => row.key === "owned")!;
  const other = secretSigner(keys.vic.secret); let signatures = 0;
  const second = scopeClient(s.handle, {
    signer: { key: other.key, sign: bytes => { signatures++; return other.sign(bytes); } },
    member: { service: "https://requests.test", membership: s.actor.member.membership,
      member: s.actor.member.member, principal: s.actor.principal },
    store, drafts, observe: s.feed.observe, clock: s.clock, lifetimeSeconds: 60 });
  try {
    s.feed.current(s.scope); await second.read();
    const result = await second.submitBoundAct({ key: first.key, owner: first.owner, scope: first.scope },
      { kind: "remark", on: 0, fields: { text: "continued" }, expected: {} }).catch((error: unknown) => error);
    // Keep this direct assertion before outcome wording: the owner control must reach it.
    expect(signatures).toBe(0);
    expect(result).toMatchObject({ reason: "owner" });
    expect(await store.authorizations.read(s.signer.key, s.handle.at)).toEqual(original);
    expect(await store.authorizations.read(other.key, s.handle.at)).toEqual([]);
  } finally { second.close(); }
});

test("a changed descriptor may copy a live original but adds no version or signing", async () => {
  const s = requestScene(), { client, store, drafts } = clientAt(s);
  s.feed.current(s.scope); await client.read(); await clientIdle(client); s.mode("unavailable");
  const input = { on: 0, fields: { text: "same original" } };
  await request(client, "descriptor", "remark", input);
  const original = canonicalize(s.copies[0]), signs = s.signs();
  client.close();
  // The instance derives its digests from its definition, so one definition cannot give two digests. The retained row
  // holds the digest of an earlier recipe, as an outside adopter's store holds it after an upgrade.
  const rows = (await store.authorizations.read(s.signer.key, s.handle.at)).map(row => ({ ...row, descriptor: TEST_HISTORICAL_DESCRIPTOR }));
  await store.exclusive(() => store.authorizations.write(s.signer.key, s.handle.at, rows));
  const changed = scopeClient(s.handle, {
    signer: s.signer, member: { service: "https://requests.test", membership: s.actor.member.membership,
      member: s.actor.member.member, principal: s.actor.principal },
    store, drafts, observe: s.feed.observe, clock: s.clock, lifetimeSeconds: 60 });
  try {
    s.feed.current(s.scope); await changed.read(); await clientIdle(changed);
    // One original member POST plus one permitted startup recovery copy. The next member request makes three.
    expect(s.copies).toHaveLength(2);
    const copies = s.copies.length;
    await request(changed, "descriptor", "remark", input);
    expect(s.copies.length).toBe(copies + 1);
    expect(canonicalize(s.copies.at(-1))).toBe(original);
    expect(s.signs()).toBe(signs);
    const result = await request(changed, "descriptor", "remark", { on: 0, fields: { text: "other fields" } }).catch((error: unknown) => error);
    expect(result).toMatchObject({ reason: "descriptor-mismatch" });
    expect(s.signs()).toBe(signs);
    expect(await store.authorizations.read(s.signer.key, s.handle.at)).toEqual(rows);
  } finally { changed.close(); }
});

// Case 6: distinct client instances share one actor and the same actual memory-store fence.
test("a second remark waits behind the pending first remark without signing", async () => {
  const s = requestScene(), { client, store, drafts } = clientAt(s), feed = new Feed();
  const second = scopeClient(s.handle, { signer: s.signer,
    member: { service: "https://requests.test", membership: s.actor.member.membership,
      member: s.actor.member.member, principal: s.actor.principal },
    store, drafts, observe: feed.observe, clock: s.clock, lifetimeSeconds: 60 });
  try {
    s.feed.current(s.scope); feed.current(s.scope); await client.read(); await second.read();
    s.mode("unavailable");
    await request(client, "first-remark", "remark", { on: 0, fields: { text: "first" } });
    const signs = s.signs(), posts = s.copies.length;
    const result = await request(second, "second-remark", "remark", { on: 0, fields: { text: "second" } }).catch((error: unknown) => error);
    expect(s.signs()).toBe(signs);
    expect(s.copies.length).toBe(posts);
    expect(result).toMatchObject({ reason: "source" });
    const rows = await store.authorizations.read(s.signer.key, s.handle.at);
    const first = rows.find(row => row.key === "first-remark")!, waiting = rows.find(row => row.key === "second-remark")!;
    expect(waiting.versions[0]!.after).toEqual([{ key: first.key, version: first.versions[0]!.id }]);
    expect(waiting.permissions).toEqual([]);
    expect(waiting.materializations).toEqual([]);
    const custody = new Custody(store, () => timeOf(s.now()));
    const identity = { service: "https://requests.test", membership: s.actor.member.membership,
      signer: s.signer.key, target: s.handle.at, key: "second-remark" };
    expect(await custody.find(identity)).toBeNull();
  } finally { second.close(); client.close(); }
});

test("two captured observed submits from stale views stop busy without a partial second authorization", async () => {
  const s = requestScene(), { client, store, drafts } = clientAt(s), feed = new Feed();
  const second = scopeClient(s.handle, { signer: s.signer,
    member: { service: "https://requests.test", membership: s.actor.member.membership,
      member: s.actor.member.member, principal: s.actor.principal },
    store, drafts, observe: feed.observe, clock: s.clock, lifetimeSeconds: 60 });
  try {
    s.feed.current(s.scope); feed.current(s.scope); await client.read(); await second.read();
    await request(client, "cause", "remark", { on: 0, fields: { text: "real source entry" } });
    const captured = { kind: "cite", on: 0, fields: { cause: s.scope.fact(s.scope.head.seq) },
      expected: { on: s.scope.item(0).revision } } as const;
    const identity = { owner: s.signer.key, scope: s.handle.at };
    s.mode("unavailable");
    await client.submitBoundAct({ ...identity, key: "first-cite" }, captured);
    const before = await store.authorizations.read(s.signer.key, s.handle.at), signs = s.signs(), posts = s.copies.length;
    const result = await second.submitBoundAct({ ...identity, key: "second-cite" }, captured).catch((error: unknown) => error);
    expect(result).toMatchObject({ reason: "busy" });
    expect(s.signs()).toBe(signs);
    expect(s.copies.length).toBe(posts);
    expect(await store.authorizations.read(s.signer.key, s.handle.at)).toEqual(before);
  } finally { second.close(); client.close(); }
});

// A public gesture owns its input before the first store read can suspend it.
test("a captured submit keeps its original input while the first store read waits", async () => {
  const s = requestScene(), { client, store } = clientAt(s), reading = gate();
  const byTarget = store.byTarget.bind(store);
  try {
    s.feed.current(s.scope); await client.read(); await clientIdle(client);
    let armed = true;
    store.byTarget = async target => {
      if (armed) { armed = false; await reading.wait(); }
      return byTarget(target);
    };
    const identity = { key: "captured-input", owner: s.signer.key, scope: s.handle.at };
    const act = { kind: "remark", on: 0, fields: { text: "the authorized words" }, expected: {} };
    const sent = client.submitBoundAct(identity, act);
    const completed = expect(sent).resolves.toMatchObject({ answer: { answer: "accepted" } });
    await reading.started;
    identity.key = "later-caller-key";
    act.fields.text = "later caller words";
    reading.release(); await completed;
    const rows = await store.authorizations.read(s.signer.key, s.handle.at);
    expect(rows.map(row => row.key)).toEqual(["captured-input"]);
    expect(rows[0]!.versions[0]!.act.fields).toEqual({ text: "the authorized words" });
    expect(s.copies).toHaveLength(1);
    expect(s.copies[0]!.intent.idempotencyKey).toBe("captured-input");
    expect(s.copies[0]!.intent.fields["text"]).toBe("the authorized words");
    expect(clientReplica(client).accepted(s.signer.key, "captured-input")).not.toBeNull();
    expect(clientReplica(client).accepted(s.signer.key, "later-caller-key")).toBeNull();
  } finally { reading.release(); store.byTarget = byTarget; client.close(); }
});

// Content digests may repeat; custody's occurrence, not equal bytes, names the third gesture.
test("same-clock A B A launches the third signing's exact authorization position", async () => {
  const s = requestScene(), { client, store, who } = clientAt(s);
  try {
    s.feed.current(s.scope); await client.read(); s.mode("refused");
    const at = s.now(), signs = s.signs(), identity = { key: "same-clock", owner: s.signer.key, scope: s.handle.at };
    for (const text of ["A", "B", "A"]) {
      await client.submitBoundAct(identity, { kind: "remark", on: 0, fields: { text }, expected: {} });
    }
    expect(s.now()).toBe(at);
    expect(s.signs()).toBe(signs + 3);
    expect(s.copies).toHaveLength(3);
    const record = await new Custody(store, () => timeOf(s.now())).find({ ...who, key: identity.key });
    if (!record) expect.fail("the three real signings must remain in custody");
    expect(record.signings).toHaveLength(3);
    expect(record.signings[0]!.intent).toBe(record.signings[2]!.intent);
    expect(intentDigest(s.copies[0]!.intent)).toBe(intentDigest(s.copies[2]!.intent));
    expect(record.signings.map(signing => signing.authorization?.position)).toEqual([0, 1, 2]);
    expect(clientDelivery(client)).toMatchObject({
      identity: { ...who, key: identity.key }, signing: 2, intent: record.signings[2]!.intent,
      authorization: { identity, position: 2 },
    });
    const [row] = await store.authorizations.read(s.signer.key, s.handle.at);
    expect(row!.versions).toHaveLength(3);
    expect(row!.versions[0]!.id).toBe(row!.versions[2]!.id);
  } finally { client.close(); }
});

test("a live legacy copy expires while its launch waits for the shared fence", async () => {
  const s = requestScene(), { client, store, who } = clientAt(s), held = gate();
  const exclusive = store.exclusive.bind(store), pending: Promise<unknown>[] = [];
  let now = s.now(); s.clock.now = () => now;
  try {
    // Drain real startup recovery while custody is empty, before keeping the original.
    s.feed.current(s.scope); await client.read(); await clientIdle(client);
    const values = { on: 0, fields: { text: "kept legacy" } };
    const shaped = shapeDeclaredAct(s.handle.definition, "remark", values);
    const signed = await signedIntent(s.signer, { to: s.handle.at, kind: "remark", on: shaped.on,
      fields: shaped.fields, expected: {} }, { now, idempotencyKey: "queued-legacy", lifetimeSeconds: 2 });
    s.seedLegacy(signed);
    const custody = new Custody(store, () => timeOf(now)), identity = { ...who, key: "queued-legacy" };
    await custody.keep(identity, intentMeaning(signed.intent), async () => ({
      binding: { definition: s.handle.definition.name, kind: "remark", declaration: s.handle.digest, pinned: s.handle.digest },
      envelope: { signed, beside: shaped.beside },
    }), timeOf(now + 30_000));
    // The keep notification only reconciles the row. Do not trigger another feed recovery.
    await clientIdle(client);
    expect((await custody.find(identity))!.phase).toBe("prepared");
    expect(clientReplica(client).accepted(s.signer.key, identity.key)).toBeNull();
    expect(s.copies).toEqual([]);
    const signs = s.signs(), bytes = canonicalize(signed);
    const blocker = exclusive(() => held.wait()); pending.push(blocker); await held.started;
    let entered!: () => void, armed = true;
    const queued = new Promise<void>(done => { entered = done; });
    store.exclusive = run => { if (armed) { armed = false; entered(); } return exclusive(run); };
    const copied = request(client, identity.key, "remark", values); pending.push(copied);
    const completed = expect(copied).resolves.toMatchObject({ lost: true });
    pending.push(completed); void completed.catch(() => {});
    await queued;
    expect(s.copies).toEqual([]);
    now = Date.parse(signed.intent.notAfter);
    held.release(); await blocker; await completed;
    expect(s.copies).toEqual([]);
    expect(s.signs()).toBe(signs);
    expect(canonicalize((await custody.find(identity))!.envelope.signed)).toBe(bytes);
    expect(await store.authorizations.read(s.signer.key, s.handle.at)).toEqual([]);
  } finally {
    held.release(); store.exclusive = exclusive; client.close();
    await Promise.allSettled(pending);
  }
});

test("cancellation or a newer position wins before a queued copy launches", async () => {
  for (const change of ["cancel", "new-position"] as const) {
    const s = requestScene(), { client, store } = clientAt(s), held = gate();
    const exclusive = store.exclusive.bind(store);
    try {
      s.feed.current(s.scope); await client.read(); s.mode("unavailable");
      const identity = { key: `launch-${change}`, owner: s.signer.key, scope: s.handle.at };
      const act = { kind: "remark", on: 0, fields: { text: "same content" }, expected: {} };
      await client.submitBoundAct(identity, act); await clientIdle(client);
      const before = await client.authorization(identity);
      if (!before) expect.fail("the first gesture must be retained");
      const reference = { identity, position: 0 }, signs = s.signs(), posts = s.copies.length;
      const launch = canonicalize(clientDelivery(client));
      const blocker = exclusive(() => held.wait()); await held.started;
      let next: (() => void) | null = null;
      store.exclusive = run => { const signal = next; next = null; signal?.(); return exclusive(run); };
      const dispatchQueued = new Promise<void>(done => { next = done; });
      const copied = client.sendAuthorization(reference);
      const completed = expect(copied).resolves.toMatchObject({ lost: true });
      await dispatchQueued;
      const mutationQueued = new Promise<void>(done => { next = done; });
      const mutation = change === "cancel" ? client.cancelAuthorization(identity)
        : client.retainAuthorizations([{ key: identity.key, act }]);
      await mutationQueued;
      held.release(); await blocker; await mutation; await completed;
      expect(s.signs()).toBe(signs);
      expect(s.copies.length).toBe(posts);
      expect(canonicalize(clientDelivery(client))).toBe(launch);
      const row = await client.authorization(identity);
      if (!row) expect.fail("the retained history must survive the race");
      expect(row.permissions).toEqual(before.permissions);
      if (change === "cancel") expect(row.cancelledAt).toBeDefined();
      else {
        expect(row.versions).toHaveLength(2);
        expect(row.versions[1]!.id).toBe(row.versions[0]!.id);
        expect(row.versions[0]).toEqual(before.versions[0]);
      }
    } finally { held.release(); store.exclusive = exclusive; client.close(); }
  }
});

// ---------------------------------------------------------------- the whole-batch loader (C4)

const TEST_HISTORICAL_DESCRIPTOR: Digest = "sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
/** A real stored row under another descriptor, built by the actual edit and refinement path. */
function historicalRemark(s: ReturnType<typeof requestScene>, key: string, text: string): StoredDraft {
  const item = s.scope.item(0), binding = { owner: s.signer.key, scope: s.handle.at,
    definition: s.handle.digest, descriptors: { remark: TEST_HISTORICAL_DESCRIPTOR } };
  const prepared = prepareDraftEdit({ binding, definition: s.handle.definition, rows: [item],
    slot: { kind: "remark", on: item.id, items: {} }, namedRefs: {
      on: { name: item.id, seen: item.revision, assumes: [] }, fields: {},
    }, current: null, key, patch: { text } });
  if (!prepared.ok) throw new Error("TEST historical remark requires the actual fixture item");
  return refineDraft({ ...prepared.draft, placement: "waiting" }, binding, s.handle.definition);
}
const remarkSlot = (client: ReturnType<typeof clientAt>["client"], s: ReturnType<typeof requestScene>) =>
  client.slot("remark", { on: { name: 0, seen: s.scope.item(0).revision, assumes: [] } });

// Invariant (81711f39, 0967101f): one publication pass reads one raw batch, one discovery, and each identity once.
test("a publication pass reads one raw draft batch and finds each custody identity once", async () => {
  const s = requestScene(), store = memoryStore(), drafts = memoryDrafts();
  await store.exclusive(() => drafts.write(s.signer.key, s.handle.at, [waitingRemark(s, "unsent", "waiting text")]));
  const { client, who } = clientAt(s, store, drafts);
  s.feed.current(s.scope); await client.read(); s.mode("unavailable");
  await request(client, "sent", "remark", { on: 0, fields: { text: "kept" } });
  await clientIdle(client);
  let batches = 0, scans = 0;
  const finds = new Map<string, number>();
  const read = drafts.read.bind(drafts), byTarget = store.byTarget.bind(store), find = store.read.bind(store);
  drafts.read = async (owner, scope) => { batches++; return read(owner, scope); };
  store.byTarget = async at => { scans++; return byTarget(at); };
  store.read = async id => { finds.set(id, (finds.get(id) ?? 0) + 1); return find(id); };
  try {
    // A foreign write is one notification; clientIdle then runs its own passes. Every pass is whole.
    await store.exclusive(() => drafts.write(s.signer.key, s.handle.at, [waitingRemark(s, "unsent", "changed text")]));
    await clientIdle(client);
    expect(batches).toBeGreaterThan(0);
    expect(scans).toBe(batches);
    for (const key of ["sent", "unsent"]) expect(finds.get(identityId({ ...who, key }))).toBe(batches);
  } finally { client.close(); }
});

// Invariant (c795, a1c5a189): a historical-descriptor row stays stored and visible without its values.
test("a historical descriptor row publishes once without values; restore stops and dismiss removes only that row", async () => {
  const s = requestScene(), store = memoryStore(), drafts = memoryDrafts();
  await store.exclusive(() => drafts.write(s.signer.key, s.handle.at,
    [waitingRemark(s, "current", "current text"), historicalRemark(s, "old", "historical text")]));
  const { client, who } = clientAt(s, store, drafts);
  s.feed.current(s.scope); await client.read(); await clientIdle(client);
  expect(client.view.requests.filter(entry => entry.key === "old")).toEqual([
    { is: "held-intention", reason: "another-descriptor", key: "old", descriptor: TEST_HISTORICAL_DESCRIPTOR }]);
  expect(client.view.requests.find(entry => entry.key === "current")).toMatchObject({ is: "draft", values: { text: "current text" } });
  expect(canonicalize(client.view.requests)).not.toContain("historical text");
  const stored = async () => canonicalize(await drafts.read(s.signer.key, s.handle.at));
  const before = await stored(), identity = identityId({ ...who, key: "old" });
  const reads: string[] = [], find = store.read.bind(store);
  store.read = async id => { reads.push(id); return find(id); };
  try {
    expect(await client.restore("old")).toEqual({ ok: false, stop: { stop: "descriptor-mismatch" } });
    expect(await stored()).toBe(before);
    expect(await client.dismiss("old")).toEqual({ ok: true, value: undefined });
    const after = await drafts.read(s.signer.key, s.handle.at);
    expect(after.map(entry => entry.key)).toEqual(["current"]);
    expect(canonicalize(after[0])).toBe(canonicalize((JSON.parse(before) as StoredDraft[]).find(entry => entry.key === "current")));
    expect(reads).not.toContain(identity);
    await clientIdle(client);
    expect(client.view.requests.some(entry => entry.key === "old")).toBe(false);
  } finally { client.close(); }
});

// Invariant (planner 6d3b979f item 4): a stored draft of another definition is a held row with the key and that digest, no values.
const OTHER_DEFINITION: Digest = `sha256:${"1".repeat(64)}`;
test("a stored draft of another definition publishes as a held row without values while the rest of the batch publishes", async () => {
  const s = requestScene(), store = memoryStore(), drafts = memoryDrafts();
  // `elsewhere` differs in the definition only. `both` differs in the definition and the descriptor: the definition is named first.
  await store.exclusive(() => drafts.write(s.signer.key, s.handle.at, [waitingRemark(s, "current", "current text"),
    { ...waitingRemark(s, "elsewhere", "other definition text"), definition: OTHER_DEFINITION },
    { ...waitingRemark(s, "both", "both text"), definition: OTHER_DEFINITION, descriptor: TEST_HISTORICAL_DESCRIPTOR }]));
  const { client } = clientAt(s, store, drafts);
  s.feed.current(s.scope); await client.read(); await clientIdle(client);
  for (const key of ["elsewhere", "both"]) {
    expect(client.view.requests.filter(entry => entry.key === key)).toEqual([
      { is: "held-intention", reason: "another-definition", key, definition: OTHER_DEFINITION }]);
  }
  // The rest of the batch publishes.
  expect(draftOf(client.view, "current")).toEqual({ on: 0, text: "current text" });
  expect(canonicalize(client.view.requests)).not.toContain("other definition text");
  expect(canonicalize(client.view.requests)).not.toContain("both text");
  const stored = async () => canonicalize(await drafts.read(s.signer.key, s.handle.at));
  const before = await stored();
  try {
    expect(await client.restore("elsewhere")).toEqual({ ok: false, stop: { stop: "definition-mismatch" } });
    expect(await client.restore("both")).toEqual({ ok: false, stop: { stop: "definition-mismatch" } });
    expect(await stored()).toBe(before);
    expect(await client.dismiss("elsewhere")).toEqual({ ok: true, value: undefined });
    expect((await drafts.read(s.signer.key, s.handle.at)).map(entry => entry.key)).toEqual(["current", "both"]);
    await clientIdle(client);
    expect(client.view.requests.some(entry => entry.key === "elsewhere")).toBe(false);
    expect(draftOf(client.view, "current")).toEqual({ on: 0, text: "current text" });
  } finally { client.close(); }
});

// Invariant (e19f27b5, 357c2195): a found standalone record is a held intention; restore and dismiss never read or write it.
test.each(["restore", "dismiss"] as const)("a standalone held intention: %s reads no custody for its key and writes none", async disposition => {
  const s = requestScene(), store = memoryStore(), drafts = memoryDrafts(), { client, who } = clientAt(s, store, drafts);
  s.feed.current(s.scope); await client.read();
  const edited = await client.edit(remarkSlot(client, s), { text: "held text" });
  if (!edited.ok) throw new Error("the first edit creates the draft");
  const key = edited.value, identity = { ...who, key }, id = identityId(identity);
  const signed = await signedIntent(s.signer, { to: s.handle.at, kind: "remark", on: 0, fields: { text: "held text" } },
    { now: s.now(), idempotencyKey: key, lifetimeSeconds: 60 });
  await new Custody(store, () => timeOf(s.now())).keep(identity, intentMeaning(signed.intent), async () => ({
    binding: { definition: s.handle.definition.name, kind: "remark", declaration: s.handle.digest, pinned: s.handle.digest },
    envelope: { signed, beside: {} } }), timeOf(s.now() + 30_000), 0, { standalone: true });
  s.seedLegacy(signed); // The seeded standalone signing carries no authorization; declare it to the audit.
  await clientIdle(client);
  expect(client.view.requests.find(entry => entry.key === key)).toMatchObject({
    is: "held-intention", reason: "nonrequest-held", key, kind: "remark", values: { text: "held text" } });
  const custodyBefore = store.records.get(id), reads: string[] = [];
  const exclusive = store.exclusive.bind(store), find = store.read.bind(store);
  let inside = false;
  store.exclusive = async work => exclusive(async () => { inside = true; try { return await work(); } finally { inside = false; } });
  store.read = async at => { if (inside) reads.push(at); return find(at); };
  // The method's own reads precede its one batch write. The write notifies the draft observer, and the publication it
  // starts reads custody while the method's fence still closes; that read belongs to the independent publication.
  const write = drafts.write.bind(drafts);
  drafts.write = async (owner, at, entries) => { inside = false; return write(owner, at, entries); };
  try {
    const called = await client[disposition](key);
    expect(called).toEqual({ ok: true, value: undefined });
    // Method-owned I/O only: a later independent publication may read the identity.
    expect(reads).not.toContain(id);
    expect(store.records.get(id)).toBe(custodyBefore);
    const raw = await drafts.read(s.signer.key, s.handle.at);
    expect(raw.find(entry => entry.key === key)).toMatchObject({ is: "dismissed" });
    if (disposition === "restore") {
      const fresh = raw.filter(entry => entry.key !== key);
      expect(fresh).toHaveLength(1);
      expect(fresh[0]).toMatchObject({ is: "draft", placement: "slot", after: key, act: { fields: { text: "held text" } } });
    } else expect(raw).toHaveLength(1);
  } finally { client.close(); }
});

// Invariant (planner 0967101f): the entry view never depends on custody folding, whether it is held, failed or done.
test.each(["held", "failed", "done"] as const)("the recorded entry publishes the same view when the custody fold is %s", async fold => {
  const s = requestScene(), store = memoryStore(), { client, who } = clientAt(s, store);
  s.feed.current(s.scope); await client.read(); s.mode("unavailable");
  await request(client, "folded", "remark", { on: 0, fields: { text: "recorded later" } });
  await clientIdle(client);
  const reached = gate(), lock = store.lock.bind(store);
  store.lock = async (id, notAfter) => {
    if (fold === "held") { await reached.wait(); }
    if (fold === "failed") { reached.wait(); throw new Error("scripted fold failure"); }
    return lock(id, notAfter);
  };
  try {
    expect(s.scope.submit(s.copies[0]!).result).toBe("write");
    s.feed.current(s.scope); await clientReplica(client).read();
    if (fold !== "done") await reached.started; else await clientIdle(client);
    const shown = { requests: canonicalize(client.view.requests), row: client.view.row({ key: "folded" })?.id };
    expect(shown.row).toBeDefined();
    expect(client.view.requests.find(entry => entry.key === "folded")).toBeUndefined();
    const phase = (await new Custody(store, () => timeOf(s.now())).find({ ...who, key: "folded" }))!.phase;
    if (fold === "done") expect(phase).toBe("accepted"); else expect(phase).not.toBe("accepted");
    expect(shown.requests).toBe(canonicalize([]));
  } finally { reached.release(); store.lock = lock; await clientIdle(client); client.close(); }
});
