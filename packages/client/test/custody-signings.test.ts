/**
 * Custody record version 2 (C1, the client note sections 5.1 to 5.4), on the memory store. The scope's answers are scripted:
 * `deliver` and `read` are STAND-INs for a scope's submit and settlement read. What a real scope answers is shown in the scope
 * tests; these cases show what custody keeps, signs and sends.
 */
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import type { Answer, Head, Receipt, RefusalReason, SignedIntent } from "@generalbusiness/dap-contract";
import { canonicalize, intentDigest, timeOf } from "@generalbusiness/dap-bytes";
import { signedIntent } from "@generalbusiness/dap-client";
import { Custody, CustodyError, ENVELOPES_MOST, Lost, RECORD_BYTES, envelopeOf, envelopesOf, identityId, meaningOf, memoryStore, type CustodyRecord, type CustodyRecordV1, type Envelope, type Identity } from "../src/index.ts";
import { T0, accepted, identity, lane, notAfter, receiptOf, signer } from "./support/custody.ts";

const MINUTE = 60_000;
const head: Head = { seq: 9, hash: `sha256:${"c".repeat(64)}` };
const refusedFor = (reason: RefusalReason): Answer => ({ answer: "refused", reason, judgedAt: { seq: 2, hash: `sha256:${"b".repeat(64)}` } });
const mismatch: Answer = { answer: "mismatch", reason: "idempotency-mismatch" };

/** A memory store, a clock, and a scripted scope that keeps each envelope it is sent. Each signing lives 60 s. */
function scene() {
  let now = T0;
  const store = memoryStore();
  const custody = new Custody(store, () => timeOf(now));
  const sent: SignedIntent[] = [];
  let builds = 0;
  const build = (key: string, body: string) => async () => {
    builds++;
    return { binding: { definition: "issue", kind: "comment", declaration: null, pinned: "platform:inbox@1" as const },
      envelope: { signed: await signedIntent(signer, { to: lane, kind: "comment", fields: { body } }, { idempotencyKey: key, now, lifetimeSeconds: 60 }), beside: {} } };
  };
  const answer = (given: Answer | ((signed: SignedIntent) => Answer)) => async (e: Envelope) => { sent.push(e.signed); return typeof given === "function" ? given(e.signed) : given; };
  /** One member submit of `body` under `key`: a new signing when the record permits one. */
  const submit = (key: string, body: string, reply: Answer | ((signed: SignedIntent) => Answer), more: { read?: (e: Envelope) => Promise<Receipt | null> } = {}) =>
    custody.send(identity(key), meaningOf(body), build(key, body), answer(reply), { notAfter, resign: true, ...more });
  return { store, custody, sent, build, submit, builds: () => builds, advance: (ms: number) => { now += ms; }, at: () => now,
    record: async (key: string) => (await custody.find(identity(key)))! };
}

describe("custody record version 2 holds the signings of one request", { timeout: 30_000 }, () => {
  // Invariant: a version 1 record reads as version 2 with one signing that holds every outcome, and an unresolved one settles.
  test("a literal version 1 record reads as version 2, and an unknown one settles to accepted", async () => {
    const golden = readFileSync(new URL("./fixtures/custody-record-v1.json.txt", import.meta.url), "utf8");
    const v1 = JSON.parse(golden) as CustodyRecordV1;
    const { store, custody } = scene();
    const id = identityId(v1.identity);
    store.records.set(id, golden);
    const read = (await custody.find(v1.identity))!;
    expect([read.v, read.signings, read.outcomes.map((o) => o.signing)]).toEqual([2, [{ intent: intentDigest(v1.envelope.signed.intent), meaning: v1.meaning, notAfter: v1.envelope.signed.intent.notAfter }], [0, 0]]);
    expect(store.records.get(id)).toBe(golden);
    const final = await custody.settle(v1.identity, async () => { throw new Error("must not read"); });
    expect(final!.decided?.answer?.answer).toBe("accepted");

    // The same request as version 1 kept it before its settlement: one lost send, phase unknown, and an older outcome in the segment.
    const open: CustodyRecordV1 = { ...v1, phase: "unknown", outcomes: [v1.outcomes[0]!], count: 2 };
    store.records.set(id, canonicalize(open));
    await store.segment(id, 0, [{ at: v1.created, attempt: 1, lost: true }]);
    expect((await custody.outcomes(id, (await custody.find(v1.identity))!)).map((o) => o.signing)).toEqual([0, 0]);
    const settled = await custody.settle(v1.identity, async (e) => receiptOf(e.signed, 3));
    expect([settled!.record.phase, settled!.receipt?.fact.seq]).toEqual(["accepted", 3]);
    const stored = JSON.parse(store.records.get(id)!) as CustodyRecord;
    expect([stored.v, stored.signings.length, stored.outcomes.map((o) => [o.signing, "settled" in o])]).toEqual([2, 1, [[0, false], [0, true]]]);
  });

  // Invariant (5.1, ruling 72b1d654): a record holds at most 8 envelopes; a further signing is refused before anything is signed,
  // and a submit signs again after one signing closes.
  test("nine submits refused revision-moved: the ninth is full and signs nothing; after one signing closes the next signs", async () => {
    const s = scene();
    for (let n = 1; n <= ENVELOPES_MOST; n++) {
      const kept = await s.submit("nine", `draft ${n}`, refusedFor("revision-moved"));
      expect("answer" in kept && kept.answer.answer).toBe("refused");
      s.advance(5_000);
    }
    const eight = await s.record("nine");
    expect([eight.signings.length, envelopesOf(eight), eight.attempt, s.sent.length, s.builds()]).toEqual([8, 8, 8, 8, 8]);
    expect(eight.signings.map((g) => g.intent)).toEqual(s.sent.map((signed) => intentDigest(signed.intent)));
    // The latest envelope is the record's own, and is not written twice.
    expect([eight.signings.at(-1)!.envelope, eight.envelope.signed]).toEqual([undefined, s.sent.at(-1)]);
    expect((await s.store.unresolved()).length).toBe(0);

    const full = await s.submit("nine", "draft 9", refusedFor("revision-moved")).catch((error: unknown) => error);
    expect(full instanceof CustodyError && full.why).toEqual({ held: "full", reason: "signings", envelopes: 8, signings: 8 });
    expect([s.builds(), s.sent.length, (await s.record("nine")).signings.length]).toEqual([8, 8, 8]);

    // The first signing dies 60 s past its notAfter; the others live. A settlement read that does not hold it closes it.
    s.advance(2 * MINUTE - 8 * 5_000);
    const asked: string[] = [];
    const settled = await s.custody.settle(identity("nine"), async (e) => { asked.push(intentDigest(e.signed.intent)); return null; });
    expect(asked).toEqual([...eight.signings].reverse().map((g) => g.intent));
    expect([settled!.record.phase, settled!.record.signings.map((g) => g.closed === true), envelopeOf(settled!.record, 0), envelopesOf(settled!.record)])
      .toEqual(["refused", [true, false, false, false, false, false, false, false], null, 7]);

    const ninth = await s.submit("nine", "draft 9", refusedFor("revision-moved"));
    expect("answer" in ninth && [ninth.record.signings.length, envelopesOf(ninth.record), s.sent.length]).toEqual([9, 8, 9]);
  });

  // Invariant (5.1, ruling 0767a3f9 R1): a new signing that would not fit the record's byte bound is refused before it is signed.
  test("a signing past the byte bound is refused full, reason bytes, before it is signed", async () => {
    const s = scene();
    await s.submit("bytes", "first", refusedFor("revision-moved"));
    const second = s.custody.send(identity("bytes"), meaningOf("second"), s.build("bytes", "second"), async () => { throw new Error("must not send"); }, { notAfter, resign: true, bytes: RECORD_BYTES });
    await expect(second).rejects.toMatchObject({ why: { held: "full", reason: "bytes" } });
    expect([s.builds(), (await s.record("bytes")).signings.length]).toEqual([1, 1]);
  });

  // Invariant (6ad2e7bc): a store's budget refusal precedes a replacement build or signing and preserves the earlier record's bytes.
  test.each(["refused", "unknown"] as const)("budget refusal before %s resign builds, signs and sends nothing", async (phase) => {
    let now = T0, builds = 0, signs = 0, sends = 0, full = false;
    const store = memoryStore(), custody = new Custody(store, () => timeOf(now));
    const who = identity(`budget-${phase}`), id = identityId(who);
    store.admit = async () => { if (full) throw new CustodyError({ held: "full", reason: "budget", bytes: RECORD_BYTES }); };
    const countedSigner = { key: signer.key, sign: async (bytes: Uint8Array) => { signs++; return signer.sign(bytes); } };
    const build = (body: string) => async () => {
      builds++;
      return { binding: { definition: "issue", kind: "comment", declaration: null, pinned: "platform:inbox@1" as const },
        envelope: { signed: await signedIntent(countedSigner, { to: lane, kind: "comment", fields: { body } }, { idempotencyKey: who.key, now, lifetimeSeconds: 60 }), beside: {} } };
    };
    const deliver = async () => { sends++; if (phase === "unknown") throw new Lost(); return refusedFor("revision-moved"); };
    await custody.send(who, meaningOf("first"), build("first"), deliver, { notAfter, resign: true });
    if (phase === "unknown") now += 2 * MINUTE;
    const before = store.records.get(id), counts = [builds, signs, sends];
    full = true;
    const failure = await custody.send(who, meaningOf("next"), build("next"), deliver, { notAfter, resign: true }).catch((error: unknown) => error);
    expect([builds, signs, sends]).toEqual(counts);
    expect(failure).toMatchObject({ why: { held: "full", reason: "budget" } });
    expect(store.records.get(id)).toBe(before);
  });

  // Invariant (5.2): without `resign` a new meaning is conflicting; with it, custody signs again only for a refused record or an
  // unresolved one whose latest signing is dead, and never for a record with steps, a standalone record or a creation.
  test("resign signs again for a refused record or a dead unresolved signing, and refuses steps, standalone and creations", async () => {
    const s = scene();
    await s.custody.send(identity("r"), meaningOf("one"), s.build("r", "one"), async (e) => { s.sent.push(e.signed); return refusedFor("revision-moved"); }, { notAfter });
    await expect(s.custody.send(identity("r"), meaningOf("two"), s.build("r", "two"), async () => { throw new Error("must not send"); }, { notAfter }))
      .rejects.toMatchObject({ why: { held: "conflicting" } });
    const two = await s.submit("r", "two", (signed) => accepted(signed));
    expect("answer" in two && [two.answer.answer, two.record.phase, two.record.attempt, two.record.meaning, two.record.outcomes.map((o) => [o.signing, o.attempt])])
      .toEqual(["accepted", "accepted", 2, meaningOf("two"), [[0, 1], [1, 2]]]);
    expect(s.sent[1]!.intent.fields).toEqual({ body: "two" });

    // An unresolved record: its live signing is resent by the caller, never signed again; a dead one may be.
    await s.submit("u", "one", () => { throw new Lost(); });
    await expect(s.submit("u", "two", () => { throw new Error("must not send"); })).rejects.toMatchObject({ why: { held: "conflicting" } });
    s.advance(2 * MINUTE);
    const signed = await s.submit("u", "two", (e) => accepted(e));
    expect("answer" in signed && [signed.record.phase, signed.record.signings.length]).toEqual(["accepted", 2]);

    // A record with a preparation step.
    await s.custody.keep(identity("st"), meaningOf("one"), s.build("st", "one"), notAfter);
    await s.custody.step(identity("st"), lane, "hold@1", "instance", async () => refusedFor("revision-moved"));
    await s.custody.send(identity("st"), meaningOf("one"), s.build("st", "one"), async () => refusedFor("revision-moved"), { notAfter });
    // A standalone record.
    await s.custody.keep(identity("sa"), meaningOf("one"), s.build("sa", "one"), notAfter, 0, { standalone: true });
    s.advance(2 * MINUTE);
    // A creation, refused.
    const creation: Identity = { ...identity("cr"), target: { create: "platform:inbox@1" } };
    await s.custody.send(creation, meaningOf("one"), s.build("cr", "one"), async () => refusedFor("revision-moved"), { notAfter });
    const before = s.builds();
    for (const who of [identity("st"), identity("sa"), creation]) {
      await expect(s.custody.send(who, meaningOf("two"), s.build(who.key, "two"), async () => { throw new Error("must not send"); }, { notAfter, resign: true }))
        .rejects.toMatchObject({ why: { held: "conflicting" } });
    }
    expect(s.builds()).toBe(before);
  });

  // Invariant (5.3): a refusal settles nothing. A refused record counts in no capacity and is not resent, settle asks the scope
  // with each kept envelope while a signing is open, and a receipt for any signing makes it accepted.
  test("a refused record moves to accepted when the scope sealed an earlier signing", async () => {
    const s = scene();
    await s.submit("a", "one", refusedFor("revision-moved"));
    await s.submit("a", "two", refusedFor("revision-moved"));
    expect((await s.store.unresolved()).length).toBe(0);
    const first = canonicalize(s.sent[0]), asked: string[] = [];
    const settled = await s.custody.settle(identity("a"), async (e) => {
      asked.push(canonicalize(e.signed));
      return canonicalize(e.signed) === first ? receiptOf(e.signed, 7) : null;
    });
    expect(asked).toEqual([canonicalize(s.sent[1]), first]);
    expect([settled!.record.phase, settled!.receipt?.fact.seq, settled!.decided?.answer?.answer, settled!.record.outcomes.at(-1)?.signing]).toEqual(["accepted", 7, "accepted", 0]);
    expect(s.sent).toHaveLength(2);

    // A refusal of class `never` kills its signing at once; a not-found then closes it, and settle asks no more.
    await s.submit("n", "one", refusedFor("scope-refused"));
    expect((await s.record("n")).signings[0]!.dead).toBe("never");
    let reads = 0;
    const closed = await s.custody.settle(identity("n"), async () => { reads++; return null; });
    expect([closed!.record.phase, closed!.record.signings[0]!.closed, closed!.record.envelope.signed]).toEqual(["refused", true, s.sent.at(-1)]);
    await s.custody.settle(identity("n"), async () => { reads++; return null; });
    expect(reads).toBe(1);
    // `expired` kills its signing too, though its class is `head`.
    await s.submit("x", "one", refusedFor("expired"));
    expect((await s.record("x")).signings[0]!.dead).toBe("expired");
  });

  // Invariant (5.3): a mismatch to a record with earlier signings settles their kept envelopes in the same call: a receipt makes
  // it accepted for that signing, and not-found for each makes it mismatch. One signing: mismatch, as in version 1.
  test("a mismatch settles the earlier kept envelopes in the same call", async () => {
    const s = scene();
    await s.submit("m", "one", refusedFor("revision-moved"));
    const found = await s.submit("m", "two", mismatch, { read: async (e) => receiptOf(e.signed, 5) });
    expect("answer" in found && [found.answer.answer, found.record.phase, found.record.outcomes.map((o) => o.signing)]).toEqual(["accepted", "accepted", [0, 1, 0]]);

    await s.submit("o", "one", refusedFor("revision-moved"));
    const other = await s.submit("o", "two", mismatch, { read: async () => null });
    expect("answer" in other && [other.answer.answer, other.record.phase, other.record.signings.map((g) => g.closed), envelopesOf(other.record)]).toEqual(["mismatch", "mismatch", [true, true], 1]);
    const final = await s.custody.settle(identity("o"), async () => { throw new Error("must not read"); });
    expect(final!.record.phase).toBe("mismatch");

    const one = await s.custody.send(identity("p"), meaningOf("one"), s.build("p", "one"), async () => mismatch, { notAfter, read: async () => { throw new Error("must not read"); } });
    expect("answer" in one && [one.record.phase, one.record.signings[0]!.closed]).toEqual(["mismatch", true]);
  });

  // Invariant (5.4): the replica settles a record. Its own intent makes it accepted; another intent makes it mismatch and closes
  // each signing; a final record does not change. `absent` closes a dead signing only, and keeps the latest envelope.
  test("folded and absent settle and close from the replica, with no request", async () => {
    const s = scene();
    await s.submit("f", "one", refusedFor("revision-moved"));
    await s.submit("f", "two", refusedFor("revision-moved"));
    const fact = receiptOf(s.sent[0]!, 6).fact;
    const own = await s.custody.folded(identity("f"), { fact, intent: intentDigest(s.sent[0]!.intent) });
    expect([own!.phase, own!.outcomes.at(-1)]).toEqual(["accepted", { at: timeOf(s.at()), folded: { fact, intent: intentDigest(s.sent[0]!.intent) }, attempt: 2, signing: 0 }]);
    const kept = await s.submit("f", "two", () => { throw new Error("must not send"); });
    expect("folded" in kept && kept.folded.fact).toEqual(fact);
    const again = await s.custody.folded(identity("f"), { fact, intent: `sha256:${"e".repeat(64)}` });
    expect(again!.phase).toBe("accepted");

    await s.submit("g", "one", refusedFor("revision-moved"));
    await s.submit("g", "two", refusedFor("revision-moved"));
    const foreign = await s.custody.folded(identity("g"), { fact, intent: `sha256:${"e".repeat(64)}` });
    expect([foreign!.phase, foreign!.signings.map((g) => g.closed), foreign!.outcomes.at(-1)?.signing, envelopesOf(foreign!)]).toEqual(["mismatch", [true, true], null, 1]);

    await s.submit("h", "one", refusedFor("revision-moved"));
    s.advance(MINUTE);
    await s.submit("h", "two", refusedFor("revision-moved"));
    expect((await s.custody.absent(identity("h"), 0, head))!.signings[0]!.closed).toBeUndefined();
    s.advance(MINUTE);
    const first = await s.custody.absent(identity("h"), 0, head);
    expect([first!.signings[0], envelopesOf(first!)]).toEqual([{ intent: intentDigest(s.sent.at(-2)!.intent), meaning: meaningOf("one"), notAfter: s.sent.at(-2)!.intent.notAfter, closed: true }, 1]);
    s.advance(MINUTE);
    const latest = await s.custody.absent(identity("h"), 1, head);
    expect([latest!.signings[1]!.closed, latest!.envelope.signed, latest!.phase]).toEqual([true, s.sent.at(-1), "refused"]);
  });

  // Invariant (5.5): an absent latest dead signing ends its capacity charge, keeps its envelope, and sends nothing on retry.
  test("a dead absent latest signing ends unsent, and send returns that same end without signing or sending", async () => {
    const s = scene();
    await s.submit("ended", "one", () => { throw new Lost(); });
    const before = await s.record("ended");
    expect((await s.custody.absent(identity("ended"), 0, head))!.phase).toBe("unknown");
    s.advance(2 * MINUTE);
    const ended = (await s.custody.absent(identity("ended"), 0, head))!;
    expect([ended.phase, ended.envelope, ended.signings[0]!.envelope, ended.outcomes.at(-1)])
      .toEqual(["refused", before.envelope, undefined, { at: timeOf(s.at()), unsent: head, attempt: 1, signing: 0 }]);
    expect(await s.store.unresolved()).toEqual([]);
    const builds = s.builds(), sends = s.sent.length;
    const again = await s.custody.send(identity("ended"), meaningOf("one"), s.build("ended", "one"),
      async () => { throw new Error("must not send"); }, { notAfter });
    expect("unsent" in again && again.unsent).toEqual(head);
    expect([s.builds(), s.sent.length]).toEqual([builds, sends]);
    const fact = receiptOf(before.envelope.signed, 12).fact;
    const late = await s.custody.folded(identity("ended"), { fact, intent: before.signings[0]!.intent });
    expect(late!.phase).toBe("accepted");
  });

  // Invariant (5.5): abandonment after expiry cannot consume the 256 unresolved slots forever.
  test("257 lost requests can end after a verified absent read, including a reload before the first send", async () => {
    const s = scene();
    for (let n = 0; n < 256; n++) await s.submit(`lost-${n}`, "one", () => { throw new Lost(); });
    expect(await s.store.unresolved()).toHaveLength(256);
    s.advance(2 * MINUTE);
    // A settlement not-found names no journal head and ends no unresolved latest signing.
    expect((await s.custody.settle(identity("lost-0"), async () => null))!.record.phase).toBe("unknown");
    for (let n = 0; n < 256; n++) await s.custody.absent(identity(`lost-${n}`), 0, head);
    await s.submit("lost-256", "one", () => { throw new Lost(); });
    expect(s.builds()).toBe(257);
    const prepared = await s.custody.keep(identity("prepared"), meaningOf("one"), s.build("prepared", "one"), notAfter);
    s.advance(2 * MINUTE);
    const reload = new Custody(s.store, () => timeOf(s.at()));
    expect((await reload.absent(identity("prepared"), 0, head))!.phase).toBe("refused");
    expect((await s.record("prepared")).envelope).toEqual(prepared.envelope);
  });

  // Invariant: the memory store lists the live records of one signer at one target, whatever their phase, and signals each change.
  test("the memory store reads by target and signals each change", async () => {
    const s = scene();
    const changes: number[] = [];
    const stop = s.store.observe(() => { changes.push(s.store.records.size); });
    await s.submit("t1", "one", refusedFor("revision-moved"));
    await s.custody.keep(identity("t2"), meaningOf("one"), s.build("t2", "one"), notAfter);
    const elsewhere: Identity = { ...identity("t3"), target: { scope: "sc_else", genesis: lane.genesis } as Identity["target"] };
    await s.custody.keep(elsewhere, meaningOf("one"), s.build("t3", "one"), notAfter);
    const { key: _key, ...who } = identity("any");
    expect((await s.store.byTarget(who)).map((r) => [r.key, r.phase])).toEqual([["t1", "refused"], ["t2", "prepared"]]);
    expect(changes.length).toBeGreaterThanOrEqual(5);
    stop();
    const before = changes.length;
    await s.custody.keep(identity("t4"), meaningOf("one"), s.build("t4", "one"), notAfter);
    expect(changes.length).toBe(before);
    expect(s.store.records.size).toBe(4);
  });
});
