import { floorReceiverChange, floorSenderChange } from "./definition-corpus-data.ts";
/** Two actual native scopes, sends, ACKs, decisions, SQLite and restart.
 * Declarations/authority/readers/clock are fixtures; the receiver transport
 * deliberately withholds results. Floor receipts are test statements, not
 * evidence of archive custody. Full native journals are saved before pruning. */
import { env } from "cloudflare:workers";
import { expect, onTestFinished, test } from "vitest";
import type { FactRef, FloorInput } from "@generalbusiness/dap-contract";
import { canonicalize } from "@generalbusiness/artroom-bytes";
import { variant } from "@generalbusiness/dap-derive/testing";
import { cloneTailSource, httpSource, MemorySource, verify, type MemoryScope } from "@generalbusiness/artroom-replay";
import { Scope } from "../src/core.ts";
import { namespace } from "../src/namespace.ts";
import { production, type Delivery } from "../src/ports.ts";
import { SqliteStore } from "../src/sqlite.ts";
import { testPorts } from "../src/testing.ts";
import { fixtureRoute as route } from "./support/serving-route.ts";
import { at, create, reader, rita, type Lane } from "./fixtures-native.ts";
import { wired } from "./outside.ts";
import { archiveDefinition, archiveSql } from "./support/archive.ts";

const surface = (lane: Lane) => lane.object as unknown as { dispatch(): Promise<number>; deliver(input: import("@generalbusiness/dap-derive").Delivered): Promise<Delivery> };
const full = (lane: Lane): Promise<MemoryScope> => lane.inside(state => {
  const sql = archiveSql(state);
  return { scope: lane.at, entries: sql.exec("SELECT seq,hash,bytes FROM entry ORDER BY seq").toArray() as unknown as MemoryScope["entries"],
    retained: sql.exec("SELECT kind,digest,bytes,under FROM retained_input ORDER BY kind,digest").toArray().map(row => ({ kind: row["kind"], digest: row["digest"], bytes: row["bytes"], ...(row["under"] === null ? {} : { under: row["under"] }) })) as unknown as MemoryScope["retained"] };
});
const append = async (lane: Lane, saved: MemoryScope) => lane.inside(state => {
  const sql = archiveSql(state), previous = saved.entries.at(-1)!.seq;
  const rows = sql.exec("SELECT seq,hash,bytes FROM entry WHERE seq>? ORDER BY seq", previous).toArray() as unknown as MemoryScope["entries"];
  return { ...saved, entries: [...saved.entries, ...rows], retained: sql.exec("SELECT kind,digest,bytes,under FROM retained_input ORDER BY kind,digest").toArray().map(row => ({ kind: row["kind"], digest: row["digest"], bytes: row["bytes"], ...(row["under"] === null ? {} : { under: row["under"] }) })) as unknown as MemoryScope["retained"] };
});
const floor = (lane: Lane, input: FloorInput) => lane.inside(state => new Scope(lane.name, new SqliteStore(archiveSql(state)), { ...production(), ...testPorts(lane.c) }, lane.c.bounds).floor(input));

// Invariant: an unacknowledged decision resends after eviction; ACK releases
// it only at the next floor. Completed non-create request identity/hash and
// exact checkpoint state survive removal of both old payloads.
test("Native ACK timing, completed request100/result150, archived resolver and stale repeats survive two floors", async () => {
  const receiverDefinition = variant(archiveDefinition.declared, floorReceiverChange());
  const receiver = await create({}, {}, receiverDefinition);
  const senderDefinition = variant(archiveDefinition.declared, floorSenderChange());
  const sender = await create({}, {}, senderDefinition), net = namespace(env.SCOPES);
  let permit = false, sends = 0;
  wired.set(sender.name, () => ({ resolver: net.resolver, transport: net.transport }));
  wired.set(receiver.name, () => ({ resolver: net.resolver, transport: { send: async envelope => { sends++; return permit ? net.transport.send(envelope) : null; } } }));
  onTestFinished(() => { wired.delete(sender.name); wired.delete(receiver.name); });
  await sender.restart(); await receiver.restart();
  for (let n = 0; n < 99; n++) expect(await sender.stub.checkpoint()).toMatchObject({ answer: "written" });
  const ask = await sender.act(rita, "ask", { on: 0, expected: { on: 1 }, fields: { peer: receiver.at } });
  if (ask.answer !== "accepted") throw Error(canonicalize(ask));
  expect(ask.receipt.fact.seq).toBe(100);
  await surface(sender).dispatch(); await surface(receiver).dispatch();
  const source = await sender.stub.entry(reader, 100);
  if (!source.ok) throw Error("native sending entry must be held before floors");
  const send = source.value.entry.sends[0]!, envelope = { to: receiver.at, from: ask.receipt.fact, n: send.n, message: send.message };
  const decision = await surface(receiver).deliver(envelope);
  if (decision.answer !== "recorded") throw Error(canonicalize(decision));
  for (let n = 0; n < 49; n++) expect(await sender.stub.checkpoint()).toMatchObject({ answer: "written" });
  expect((await sender.head()).seq).toBe(149);
  for (let n = 0; n < 200; n++) expect(await receiver.stub.checkpoint()).toMatchObject({ answer: "written" });
  let receiverJournal = await full(receiver);
  receiver.c.clock.now = at(1000);
  const firstReceipt = { commit: "a".repeat(40), through: await receiver.head() };
  const unacknowledged = await receiver.inside(state => state.storage.sql.exec("SELECT DISTINCT seq FROM outbox WHERE ack IS NULL AND seq<100 ORDER BY seq").toArray().map(row => row["seq"] as number));
  expect(unacknowledged).toContain(decision.fact.seq);
  expect(await floor(receiver, { type: "floor", floor: 100, receipt: firstReceipt, keep: unacknowledged })).toMatchObject({ answer: "written" });
  receiverJournal = await append(receiver, receiverJournal);
  await receiver.restart(); sender.c.clock.now = at(1000); permit = true;
  expect(await surface(receiver).dispatch()).toBeGreaterThan(0);
  expect(sends).toBeGreaterThanOrEqual(2);
  expect((await sender.head()).seq).toBe(150);
  const before = await sender.inside(state => new SqliteStore(archiveSql(state)).all());
  expect(before.requests.find(request => request.seq === 100)).toMatchObject({ hash: ask.receipt.fact.hash, result: { seq: 150, clause: "applied" } });
  for (let n = 0; n < 200; n++) expect(await sender.stub.checkpoint()).toMatchObject({ answer: "written" });
  let senderJournal = await full(sender);
  sender.c.clock.now = at(2000); receiver.c.clock.now = at(2000);
  const receipts = new Map([[firstReceipt.commit, { scope: receiver.at, through: firstReceipt.through }]]);
  const checkpoints: FactRef[] = [];
  for (const [position, commit] of [[250, "b".repeat(40)], [251, "c".repeat(40)]] as const) {
    const receipt = { commit, through: await sender.head() }; receipts.set(commit, { scope: sender.at, through: receipt.through });
    expect(await floor(sender, { type: "floor", floor: position, receipt, keep: [] })).toMatchObject({ answer: "written" });
    expect(await sender.inside(state => {
      const store = new SqliteStore(archiveSql(state));
      expect(store.stored(100)).toBeNull(); expect(store.floor()!.kept).not.toContain(100);
      expect(store.request(100, 0)).toEqual(before.requests.find(request => request.seq === 100));
      return store.all().requests;
    })).toEqual(before.requests);
    const checkpoint = await sender.stub.checkpoint(); if (checkpoint.answer !== "written") throw Error(canonicalize(checkpoint)); checkpoints.push(checkpoint.fact);
    senderJournal = await append(sender, senderJournal);
  }
  const secondReceipt = { commit: "d".repeat(40), through: await receiver.head() }; receipts.set(secondReceipt.commit, { scope: receiver.at, through: secondReceipt.through });
  expect(await floor(receiver, { type: "floor", floor: 101, receipt: secondReceipt, keep: [] })).toMatchObject({ answer: "written" });
  expect(await receiver.inside(state => new SqliteStore(archiveSql(state)).stored(decision.fact.seq))).toBeNull();
  const checkpoint = await receiver.stub.checkpoint(); if (checkpoint.answer !== "written") throw Error(canonicalize(checkpoint));
  receiverJournal = await append(receiver, receiverJournal);
  await sender.restart(); await receiver.restart();
  expect(await net.resolver.read(ask.receipt.fact, 1)).toMatchObject({ archived: { floor: 251, commit: "c".repeat(40) } });
  expect(await surface(receiver).deliver(envelope)).toEqual({ answer: "recorded", fact: decision.fact });
  expect(await surface(receiver).deliver({ ...envelope, from: { ...envelope.from, hash: `sha256:${"0".repeat(64)}` } })).toEqual({ answer: "source-unverified" });
  const journals = [senderJournal, receiverJournal];
  const sourceClone = Object.assign(new MemorySource(journals), { floorReceipt: async (_scope: string, commit: string) => {
    const receipt = receipts.get(commit); return receipt ? { ok: true as const, ...receipt, bytes: 128 } : { ok: false as const, reason: "floor-commit-missing" as const };
  } });
  const initialClone = new MemorySource(journals.map(journal => ({ ...journal, entries: journal.entries.filter(entry => entry.seq <= 1) })));
  const service = httpSource("https://native-scope.test", { reader, fetch: async (url, init) => {
    const response = await route(new Request(url, init), env.SCOPES);
    return { status: response.status, body: response.body };
  } });
  let refreshes = 0;
  const combined = cloneTailSource(initialClone, service, async (scope, receipt) => {
    refreshes++;
    return Object.assign(new MemorySource(journals.map(journal => ({ ...journal,
      entries: journal.entries.filter(entry => entry.seq <= (journal.scope.scope === scope ? receipt.through.seq : 1)),
    }))), { floorReceipt: sourceClone.floorReceipt });
  });
  // Each native checkpoint carries the complete post-floor state digest.
  // The receipt-descriptor port is an explicit archive-read stand-in here.
  for (const head of [...checkpoints, checkpoint.fact]) {
    const replayed = await verify(combined, { mode: "replay", scope: head.at.scope, head: { seq: head.seq, hash: head.hash }, grants: "as-recorded" });
    expect([replayed.report.result, replayed.why]).toEqual(["consistent", null]);
  }
  expect(refreshes).toBeGreaterThanOrEqual(2);
}, 90_000);

test("Native delivery-unavailable request keeps its old sending entry for a legitimate late result", async () => {
  const receiverDefinition = variant(archiveDefinition.declared, floorReceiverChange());
  const receiver = await create({}, {}, receiverDefinition);
  const senderDefinition = variant(archiveDefinition.declared, floorSenderChange());
  const sender = await create({}, {}, senderDefinition), net = namespace(env.SCOPES);
  let attempts = 0;
  // One unanswered send followed by actual logged routing refusals makes a
  // genuine delivery-unavailable diagnosis. No request row is injected.
  wired.set(sender.name, () => ({ resolver: net.resolver, transport: { send: async () => ++attempts === 1 ? null : { answer: "routing" as const, reason: "wrong-incarnation" as const } } }));
  wired.set(receiver.name, () => ({ resolver: net.resolver, transport: net.transport }));
  onTestFinished(() => { wired.delete(sender.name); wired.delete(receiver.name); });
  await sender.restart(); await receiver.restart();
  for (let n = 0; n < 99; n++) expect(await sender.stub.checkpoint()).toMatchObject({ answer: "written" });
  const ask = await sender.act(rita, "ask", { on: 0, expected: { on: 1 }, fields: { peer: receiver.at } });
  if (ask.answer !== "accepted") throw Error(canonicalize(ask));
  expect(ask.receipt.fact.seq).toBe(100);
  await surface(sender).dispatch();
  for (const seconds of [1, 3, 7]) { sender.c.clock.now = at(seconds); await surface(sender).dispatch(); }
  const request = await sender.inside(state => new SqliteStore(archiveSql(state)).request(100, 0));
  expect(request).toMatchObject({ result: null, diagnosis: { finding: "delivery-unavailable" } });
  while ((await sender.head()).seq < 300) expect(await sender.stub.checkpoint()).toMatchObject({ answer: "written" });
  sender.c.clock.now = at(1000);
  expect(await floor(sender, { type: "floor", floor: 150, receipt: { commit: "e".repeat(40), through: await sender.head() }, keep: [] })).toMatchObject({ answer: "written" });
  await sender.restart();
  const sending = await sender.stub.entry(reader, 100);
  if (!sending.ok) throw Error("the pending request needs its sending payload");
  expect(await sender.inside(state => {
    const store = new SqliteStore(archiveSql(state));
    expect(store.floor()!.kept).toContain(100);
    expect(store.request(100, 0)).toEqual(request);
    // The diagnosis is state, so its numeric position survives while its
    // payload can archive. It is not a historical-reader root.
    expect(store.stored(request!.diagnosis!.seq)).toBeNull();
    return store.pendingRequests().map(row => row.seq);
  })).toContain(100);
  const send = sending.value.entry.sends[0]!;
  const delivered = await surface(receiver).deliver({ to: receiver.at, from: ask.receipt.fact, n: send.n, message: send.message });
  expect(delivered.answer).toBe("recorded");
  await surface(receiver).dispatch();
  expect(await sender.inside(state => new SqliteStore(archiveSql(state)).request(100, 0))).toMatchObject({ hash: ask.receipt.fact.hash, result: { clause: "applied" }, diagnosis: { finding: "delivery-unavailable" } });
}, 60_000);
