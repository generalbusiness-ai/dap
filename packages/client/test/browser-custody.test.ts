/**
 * The browser custody store (NF-5) under `Custody`, on the STAND-INs of `support/browser-idb.ts`: IndexedDB, Web Locks and
 * BroadcastChannel in memory. They show what the store reads, writes, lists and signals. The real browser path is the
 * witness of request c288c917.
 */
import { expect, test } from "vitest";
import type { Head, SignedIntent } from "@generalbusiness/dap-contract";
import { canonicalize, textDigest, timeOf } from "@generalbusiness/dap-bytes";
import { scriptedSequence } from "@generalbusiness/dap-derive/scripted";
import { BROWSER_TERMINAL_LIVE, Custody, Lost, browserCustodyStore, identityId, meaningOf, sendableAt, signedIntent, type Outcome, type StoredCustodyRecord } from "../src/index.ts";
import type { Authorization } from "../src/authorization.ts";
import { origin } from "./support/browser-idb.ts";
import { T0, build as fixtureBuild, identity as fixtureIdentity, notAfter, receiptOf as fixtureReceipt, refused, signer } from "./support/custody.ts";

// Browser storage admits wire shapes. Use real sequence references here; generic trusted-store fixtures keep their old bytes.
const reference = (ordinal: number) => scriptedSequence({ v: 1, kind: "lane", definition: "platform:inbox@1", creator: null, cause: textDigest("TEST browser custody"), ordinal }, timeOf(T0), 1).at;
const lane = reference(0), elsewhere = reference(1);
const identity = (key: string) => ({ ...fixtureIdentity(key), target: lane });
const build = (key: string) => async () => {
  const fixture = await fixtureBuild(key)(), { intent } = fixture.envelope.signed;
  return { ...fixture, envelope: { ...fixture.envelope, signed: await signedIntent(signer, { to: lane, kind: intent.kind, fields: intent.fields, expected: intent.expected }, { now: T0, idempotencyKey: key }) } };
};
const receiptOf = (signed: SignedIntent, seq: number) => ({ ...fixtureReceipt(signed, seq), fact: { ...fixtureReceipt(signed, seq).fact, at: lane } });
const accepted = (signed: SignedIntent) => ({ answer: "accepted" as const, receipt: receiptOf(signed, 3) });

const settled = () => new Promise((resolve) => { setTimeout(resolve, 5); });

async function absentInBrowser(o: ReturnType<typeof origin>) {
  const store = o.tab(), who = identity("absent"), meaning = meaningOf("absent");
  let clock = T0, builds = 0, posts = 0;
  const custody = new Custody(store, () => timeOf(clock));
  const make = async () => { builds++; return build(who.key)(); };
  const deliver = async () => { posts++; throw new Lost(); };
  await custody.send(who, meaning, make, deliver, { notAfter });
  const original = await custody.find(who);
  if (!original) throw new Error("TEST request was not kept");
  clock = sendableAt(original.signings.at(-1)!.notAfter);
  const head = { seq: 4, hash: textDigest("TEST verified browser absence") };
  const ended = await custody.absent(who, original.signings.length - 1, head);
  const outcome = ended?.outcomes.at(-1);
  if (!ended || !outcome || !("unsent" in outcome)) throw new Error("TEST request did not end absent");
  return { store, custody, who, meaning, make, deliver, original, ended, outcome, head, now: () => clock, counts: () => [builds, posts] };
}

// Invariant (72496543): browser storage keeps the exact client absence end, inline and segmented, across tabs.
test("a browser store reopens the same unsent outcome after absence", async () => {
  const o = origin(), s = await absentInBrowser(o), second = o.tab();
  try {
    const reopened = new Custody(second, () => timeOf(s.now())), record = await reopened.find(s.who);
    expect(record).toEqual(s.ended);
    expect([record!.phase, record!.envelope, record!.signings.at(-1)!.closed, record!.outcomes.at(-1)])
      .toEqual(["refused", s.original.envelope, true, { at: timeOf(s.now()), unsent: s.head, attempt: 1, signing: 0 }]);
    expect(await second.unresolved()).toEqual([]);
    const again = await reopened.send(s.who, s.meaning, s.make, s.deliver, { notAfter });
    expect("unsent" in again && again.unsent).toEqual(s.head);
    expect(s.counts()).toEqual([1, 1]);
    await second.segment("unsent-history", 0, [s.outcome]);
    expect(await second.segmented("unsent-history", 0, 1)).toEqual([s.outcome]);
  } finally { second.close(); s.store.close(); }
});

type UnsentOutcome = Extract<Outcome, { unsent: Head }>;
const malformedUnsent: { name: string; alter(outcome: UnsentOutcome): unknown }[] = [
  { name: "mixed kind", alter: outcome => ({ ...outcome, lost: true }) },
  { name: "missing signing", alter: ({ signing: _signing, ...outcome }) => outcome },
  { name: "null signing", alter: outcome => ({ ...outcome, signing: null }) },
  { name: "negative signing", alter: outcome => ({ ...outcome, signing: -1 }) },
  { name: "fractional signing", alter: outcome => ({ ...outcome, signing: 0.5 }) },
  { name: "unsafe signing", alter: outcome => ({ ...outcome, signing: Number.MAX_SAFE_INTEGER + 1 }) },
  { name: "null Head", alter: outcome => ({ ...outcome, unsent: null }) },
  { name: "missing seq", alter: outcome => ({ ...outcome, unsent: { hash: outcome.unsent.hash } }) },
  { name: "missing hash", alter: outcome => ({ ...outcome, unsent: { seq: outcome.unsent.seq } }) },
  { name: "negative seq", alter: outcome => ({ ...outcome, unsent: { ...outcome.unsent, seq: -1 } }) },
  { name: "malformed hash", alter: outcome => ({ ...outcome, unsent: { ...outcome.unsent, hash: "not a digest" } }) },
  { name: "extra Head member", alter: outcome => ({ ...outcome, unsent: { ...outcome.unsent, extra: true } }) },
];

// Invariant (72496543): malformed stored absence evidence grants neither a readable record nor a new sending.
test.each(malformedUnsent)("browser custody refuses an unsent outcome: $name", async ({ alter }) => {
  const o = origin(), s = await absentInBrowser(o), id = identityId(s.who);
  const records = o.raw("records"), key = o.key(id), original = records.get(key);
  if (!original || typeof original !== "object") throw new Error("TEST stored row is missing");
  const malformed = structuredClone(s.ended), invalid = alter(s.outcome);
  // Cross the storage trust boundary with an invalid runtime value, not a new typed record shape.
  Object.assign(malformed, { outcomes: [...malformed.outcomes.slice(0, -1), invalid] });
  try {
    await expect(s.store.write(id, malformed)).rejects.toMatchObject({ why: { held: "unreadable" } });
    expect(records.get(key)).toEqual(original);
    // Fractional and unsafe numbers fail canonicalization before segment admission. Persisted corrupt values still reach its reader.
    await expect(s.store.segment("invalid-unsent", 0, malformed.outcomes)).rejects.toThrow();
    await s.store.segment("corrupt-unsent", 0, [s.outcome]);
    o.raw("outcomes").set(o.key(["corrupt-unsent", 0]), invalid);
    await expect(s.store.segmented("corrupt-unsent", 0, 1)).rejects.toMatchObject({ why: { held: "unreadable" } });
    records.set(key, { ...original, text: JSON.stringify(malformed) });
    await expect(s.store.read(id)).rejects.toMatchObject({ why: { held: "unreadable" } });
    await expect(s.custody.find(s.who)).rejects.toMatchObject({ why: { held: "unreadable" } });
    await expect(s.custody.send(s.who, s.meaning, s.make, s.deliver, { notAfter })).rejects.toMatchObject({ why: { held: "unreadable" } });
    expect(s.counts()).toEqual([1, 1]);
  } finally { records.set(key, original); s.store.close(); }
});

// Invariant: a record that one tab kept before a lost send is read by another tab, which settles the same envelope and signs nothing.
test("a lost send kept by one tab settles in a second tab with the same envelope, and nothing is signed again", async () => {
  const o = origin(), first = o.tab(), second = o.tab();
  const sent: SignedIntent[] = [];
  let builds = 0;
  const signing = build("lost");
  const lost = await new Custody(first, () => timeOf(T0)).send(identity("lost"), meaningOf("lost"), async () => { builds++; return signing(); }, async (e) => { sent.push(e.signed); throw new Lost(); }, { notAfter });
  expect("lost" in lost).toBe(true);
  const reads: SignedIntent[] = [];
  const done = await new Custody(second, () => timeOf(T0 + 1000)).settle(identity("lost"), async (e) => { reads.push(e.signed); return receiptOf(e.signed, 3); });
  expect([done!.record.phase, builds, sent.length]).toEqual(["accepted", 1, 1]);
  expect(canonicalize(reads)).toBe(canonicalize(sent));
  // A send in the second tab gives the kept acceptance and sends nothing.
  const again = await new Custody(second, () => timeOf(T0 + 2000)).send(identity("lost"), meaningOf("lost"), async () => { throw new Error("must not sign"); }, async () => { throw new Error("must not send"); }, { notAfter });
  expect("answer" in again && again.retained && again.answer.answer).toBe("accepted");
});

// Invariant: `byTarget` lists the live records of one signer at one target. Past the bound of live terminal records, the oldest
// moves to the archive: `read` still finds it and `byTarget` no longer lists it.
test("past its bound of live terminal records the store archives the oldest, which read still finds and byTarget leaves out", async () => {
  expect(BROWSER_TERMINAL_LIVE).toBe(64);
  const store = origin().tab({ terminalLive: 2 });
  let clock = T0;
  const custody = new Custody(store, () => timeOf(clock));
  for (const key of ["a", "b", "c"]) {
    clock += 1000;
    await custody.send(identity(key), meaningOf(key), build(key), async (e) => (key === "b" ? refused : accepted(e.signed)), { notAfter });
  }
  clock += 1000;
  await custody.keep(identity("open"), meaningOf("open"), build("open"), notAfter);
  await custody.send({ ...identity("elsewhere"), target: elsewhere }, meaningOf("x"), build("elsewhere"), async (e) => accepted(e.signed), { notAfter });
  const who = { service: identity("").service, membership: null, signer: signer.key, target: lane };
  // Four terminal records were written at this target and elsewhere; the bound keeps the newest two live.
  expect((await store.byTarget(who)).map((r) => [r.key, r.phase])).toEqual([["c", "accepted"], ["open", "prepared"]]);
  expect((await store.read(identityId(identity("a"))) as StoredCustodyRecord).phase).toBe("accepted");
  expect((await store.read(identityId(identity("b"))) as StoredCustodyRecord).phase).toBe("refused");
  expect((await store.unresolved()).map((r) => r.key)).toEqual(["open"]);
  // A resubmission of the archived refusal makes it live and unresolved again.
  await custody.send(identity("b"), meaningOf("b"), build("b"), async () => { throw new Lost(); }, { notAfter, resubmit: true });
  expect((await store.byTarget(who)).map((r) => r.key).sort()).toEqual(["b", "c", "open"]);
});

// Invariant: a write in one tab reaches the observers of another tab through the channel, and a held record lock refuses a
// second tab at once.
test("a write in one tab signals the observers of another, and a record lock held in one tab refuses the other", async () => {
  const o = origin(), first = o.tab(), second = o.tab();
  let heard = 0;
  const stop = second.observe(() => { heard++; });
  await new Custody(first, () => timeOf(T0)).keep(identity("signal"), meaningOf("signal"), build("signal"), notAfter);
  await settled();
  expect(heard).toBe(1);
  stop();
  const release = await first.lock("id", notAfter);
  expect(release).not.toBeNull();
  expect(await second.lock("id", notAfter)).toBeNull();
  await release!();
  const again = await second.lock("id", notAfter);
  expect(again).not.toBeNull();
  await again!();
});

// Invariant: a browser with no Web Locks keeps no record, so nothing is signed.
test("a browser without Web Locks refuses to keep a request and signs nothing", async () => {
  const store = browserCustodyStore({ database: "TEST none", lock: "TEST none", platform: {} });
  let builds = 0;
  await expect(new Custody(store, () => timeOf(T0)).send(identity("none"), meaningOf("none"), async () => { builds++; return build("none")(); }, async () => { throw new Error("must not send"); }, { notAfter })).rejects.toThrow();
  expect(builds).toBe(0);
});

test("malformed existing rows stay unreadable in direct reads and capacity or target lists; no replacement is signed", async () => {
  const originStorage = origin(), store = originStorage.tab(), custody = new Custody(store, () => timeOf(T0));
  const who = identity("bad"), id = identityId(who);
  await custody.keep(who, meaningOf("bad"), build("bad"), notAfter);
  const records = originStorage.raw("records"), key = originStorage.key(id), original = records.get(key) as Record<string, unknown>;
  let builds = 0, posts = 0;
  for (const malformed of [undefined, { ...original, text: "null" }, { ...original, phase: "accepted", who: "hidden" }]) {
    records.set(key, malformed);
    await expect(custody.find(who)).rejects.toMatchObject({ why: { held: "unreadable" } });
    await expect(store.unresolved()).rejects.toMatchObject({ why: { held: "unreadable" } });
    await expect(store.byTarget(who)).rejects.toMatchObject({ why: { held: "unreadable" } });
    await expect(custody.send(who, meaningOf("bad"), async () => { builds++; return build("bad")(); }, async e => { posts++; return accepted(e.signed); }, { notAfter })).rejects.toMatchObject({ why: { held: "unreadable" } });
    expect(records.get(key)).toBe(malformed);
  }
  expect([builds, posts]).toEqual([0, 0]);
  records.set(key, original);
  for (const position of [-1, "bad", null] as const) {
    const orphanWho = identity(`orphan-${position}`), orphanId = identityId(orphanWho), orphanKey = originStorage.key(position === null ? orphanId : [orphanId, position]);
    const outcome = { at: timeOf(T0), lost: true, attempt: 1, signing: 0 };
    originStorage.raw("outcomes").set(orphanKey, outcome);
    await expect(custody.find(orphanWho)).rejects.toMatchObject({ why: { held: "unreadable" } });
    await expect(custody.send(orphanWho, meaningOf("orphan"), async () => { builds++; return build(orphanWho.key)(); }, async e => { posts++; return accepted(e.signed); }, { notAfter })).rejects.toMatchObject({ why: { held: "unreadable" } });
    await expect(store.segment(orphanId, 0, [])).rejects.toMatchObject({ why: { held: "unreadable" } });
    expect(originStorage.raw("outcomes").get(orphanKey)).toBe(outcome);
  }
  expect([builds, posts]).toEqual([0, 0]);
});

test("bounded position reads preserve history and a repeated append truncates its interrupted tail", async () => {
  const o = origin(), store = o.tab();
  const outcome = (n: number) => ({ at: timeOf(T0 + n), attempt: 1, signing: 0, lost: true as const });
  const all = Array.from({ length: 140 }, (_, n) => outcome(n));
  await store.segment("segment", 0, all);
  expect(await store.segmented("segment", 129, 3)).toEqual(all.slice(129, 132));
  await store.segment("segment", 130, [outcome(999)]);
  expect(await store.segmented("segment", 129, 5)).toEqual([outcome(129), outcome(999)]);
  o.raw("outcomes").delete(o.key(["segment", 129]));
  await expect(store.segmented("segment", 129, 2)).rejects.toMatchObject({ why: { held: "unreadable" } });
  o.raw("lengths").delete(o.key("segment"));
  await expect(store.segmented("segment", 0, 2)).rejects.toMatchObject({ why: { held: "unreadable" } });
  await expect(store.segment("segment", 0, [outcome(1000)])).rejects.toMatchObject({ why: { held: "unreadable" } });
  o.raw("lengths").set(o.key("bad-length"), undefined);
  await expect(store.segmented("bad-length", 0, 2)).rejects.toMatchObject({ why: { held: "unreadable" } });
  await expect(store.read("segment")).rejects.toMatchObject({ why: { held: "unreadable" } });
});

test("optional channel failures leave committed custody and local observations intact", async () => {
  for (const failure of ["construct", "post"] as const) {
    const store = origin(failure).tab(), custody = new Custody(store, () => timeOf(T0));
    let observed = 0;
    store.observe(() => { observed++; });
    const record = await custody.keep(identity(failure), meaningOf(failure), build(failure), notAfter);
    expect([record.phase, observed]).toEqual(["prepared", 1]);
    expect(await custody.find(identity(failure))).toEqual(record);
  }
});

test("close refuses new and queued work using the existing unreadable storage answer", async () => {
  const o = origin(), first = o.tab(), second = o.tab();
  let unblock!: () => void, entered!: () => void;
  const enteredPromise = new Promise<void>(resolve => { entered = resolve; });
  const blocked = first.exclusive(async () => { entered(); await new Promise<void>(resolve => { unblock = resolve; }); });
  await enteredPromise;
  let ran = false;
  const queued = second.exclusive(async () => { ran = true; });
  second.close(); second.close();
  expect(second.retired()).toBe("closed");
  const rejected = expect(queued).rejects.toMatchObject({ why: { held: "unreadable" } });
  unblock(); await blocked; await rejected;
  expect(ran).toBe(false);
  await expect(second.read("new")).rejects.toMatchObject({ why: { held: "unreadable" } });
});

// Invariant (E4-B item 4): a version 2 database opens at version 3 with an empty authorization store; its custody rows stay
// byte for byte, and each signing in them reads with no authorization reference (legacy, ruling 34791662).
test("browser store (IndexedDB stand-in): a version 2 database upgrades by adding the authorization store and keeps every custody row", async () => {
  const o = origin(), writer = o.tab();
  const kept = await new Custody(writer, () => timeOf(T0)).keep(identity("earlier"), meaningOf("earlier"), build("earlier"), notAfter);
  writer.close();
  o.released();
  expect(o.layout()).toEqual({ version: 2, stores: ["archive", "lengths", "outcomes", "records"] });
  const rows = structuredClone([...o.raw("records")]);
  const reader = o.tab();
  try {
    const record = await new Custody(reader, () => timeOf(T0)).find(identity("earlier"));
    expect(o.layout()).toEqual({ version: 3, stores: ["archive", "authorizations", "lengths", "outcomes", "records"] });
    expect([...o.raw("records")]).toEqual(rows);
    expect(record).toEqual(kept);
    expect(record!.signings.map(signing => signing.authorization ?? "legacy")).toEqual(["legacy"]);
    expect(await reader.authorizations.read(signer.key, lane)).toEqual([]);
  } finally { reader.close(); }
});

// Invariant (E4-B item 4): an earlier database that is not the exact version 2 layout stays as it was and holds nothing.
test("browser store (IndexedDB stand-in): an earlier database without the version 2 layout does not upgrade and signs nothing", async () => {
  const o = origin(), writer = o.tab();
  await new Custody(writer, () => timeOf(T0)).keep(identity("partial"), meaningOf("partial"), build("partial"), notAfter);
  writer.close();
  o.released("lengths");
  const reader = o.tab();
  let builds = 0;
  await expect(new Custody(reader, () => timeOf(T0)).send(identity("next"), meaningOf("next"), async () => { builds++; return build("next")(); }, async () => { throw new Error("must not send"); }, { notAfter }))
    .rejects.toMatchObject({ why: { held: "unreadable" } });
  await expect(reader.authorizations.read(signer.key, lane)).rejects.toMatchObject({ why: { held: "unreadable" } });
  expect(builds).toBe(0);
  expect(o.layout()).toEqual({ version: 2, stores: ["archive", "outcomes", "records"] });
});

// Invariant (E4-B item 3): the archive moves a custody record and removes none, so the authorization history of its key stays.
test("browser store (IndexedDB stand-in): archiving a terminal record leaves the authorization history of its key", async () => {
  const o = origin(), store = o.tab({ terminalLive: 1 });
  try {
    const history = (key: string) => ({ key, owner: signer.key, scope: lane, versions: [], materializations: [], permissions: [] }) as unknown as Authorization;
    await store.authorizations.write(signer.key, lane, [history("a"), history("b")]);
    const before = await store.authorizations.read(signer.key, lane), text = structuredClone([...o.raw("authorizations")]);
    let clock = T0;
    const custody = new Custody(store, () => timeOf(clock));
    for (const key of ["a", "b"]) { clock += 1000; await custody.send(identity(key), meaningOf(key), build(key), async e => accepted(e.signed), { notAfter }); }
    expect(o.raw("archive").has(o.key(identityId(identity("a"))))).toBe(true);
    expect(o.raw("records").has(o.key(identityId(identity("a"))))).toBe(false);
    expect(await store.authorizations.read(signer.key, lane)).toEqual(before);
    expect([...o.raw("authorizations")]).toEqual(text);
  } finally { store.close(); }
});

// Invariant (E4-B, ruling be902732): a newer version opened by another page retires this store at once, so the upgrade is not
// blocked. Each observer hears it once, its re-read is refused `unreadable`, and the store names the cause so the page can ask
// for a reload.
test("browser store (IndexedDB stand-in): a newer database version opened elsewhere retires the store, tells each observer once and names the version change", async () => {
  const o = origin(), store = o.tab(), who = identity("before-upgrade");
  await new Custody(store, () => timeOf(T0)).keep(who, meaningOf("before-upgrade"), build("before-upgrade"), notAfter);
  const reads: Promise<unknown>[] = [];
  let heard = 0;
  store.observe(() => { heard++; reads.push(store.read(identityId(who)).catch((error: unknown) => error)); });
  expect(store.retired()).toBeNull();
  expect(await o.upgrade(4)).toBe("upgraded");
  expect([heard, store.retired()]).toEqual([1, "version-change"]);
  expect(await Promise.all(reads)).toMatchObject([{ why: { held: "unreadable" } }]);
  await expect(store.read(identityId(who))).rejects.toMatchObject({ why: { held: "unreadable" } });
  store.close();
  await settled();
  expect([heard, store.retired()]).toEqual([1, "version-change"]);
});
