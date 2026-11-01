import { expect, test } from "vitest";
import { runInDurableObject } from "cloudflare:test";
import type { ScopeId, SignedIntent } from "@generalbusiness/dap-contract";
import { b64url, intentDigest, keyIdOfSecret, timeMs, timeOf } from "@generalbusiness/dap-bytes";
import { DEMO_DIGESTS } from "@generalbusiness/dap-lanes";
import { actBodyText, invitationIssueFields, invitationRedemptionFields, secretSigner, sendableAt, signedIntent, type Fetch, type Signer } from "@generalbusiness/dap-client";
import { CustodyError, McpService, identityId, memoryStore, type CallResult, type CustodyStore } from "../../../../packages/mcp/src/index.ts";
import { act, handleOf, issueDeviceKey, joinRoom, listLanes, openRoom, placeOf, prepareJoin, submitJoin, type Room, type Session } from "../src/data.ts";
import { checkOriginalRequest, openOriginals, originalLine } from "../src/original-check.ts";
import { SERVICE, demo, type Demo } from "./support/demo.ts";

// Invariant: when `dap mcp` holds a person's session, it keeps a signed original at the room's membership object before it sends the
// act, under the page's rules, and the room's page on another key of that person settles a lost reply with nothing sent twice.
// notes/2026-10-31-signed-requests-across-devices.md, section 9.
//
// The server is the real `McpService`, with its custody in the memory store and a restart as a new service over that store. The room
// is `support/demo.ts`: real scopes, the Worker's routes, real read sessions under a TEST SECRET, and the scripted clock. The network
// between each device and the routes is a STAND-IN: `wire` loses a reply, drops a request, or answers `unavailable`, as a lost
// connection does. No DOM and no process: `mcp-second-device.mjs` runs `dap mcp` and the page.

type Mode = "pass" | "reply-lost" | "never-arrived" | "unavailable";
type Down = "sessions" | "keep-reply" | "end" | "entries";
interface Wire { mode: Mode; down: Set<Down>; acts: { actor: string; body: string; arrived: boolean }[]; kept: string[]; order: string[]; sessions: number; unread: string | null }
const wireOf = (): Wire => ({ mode: "pass", down: new Set(), acts: [], kept: [], order: [], sessions: 0, unread: null });
const ACTS = /\/v1\/scopes\/[^/]+\/acts$/;
const COPIES = /\/v1\/scopes\/[^/]+\/originals(\/.*)?$/;

/** The stand-in network. It counts each act's request and each request to the copy routes. */
const wrapOf = (wire: Wire) => (inner: Fetch): Fetch => async (url, init) => {
  const method = init?.method ?? "GET", path = new URL(url).pathname;
  if (path.endsWith("/sessions")) { wire.sessions++; if (wire.down.has("sessions")) throw new Error("no reply to the session request"); }
  if (wire.down.has("entries") && /\/entries\//.test(path)) throw new Error("no reply to the entry read");
  if (wire.unread !== null && method === "GET" && `${path}/`.includes(`/${encodeURIComponent(wire.unread)}/`)) return new Response(JSON.stringify({ ok: false, reason: "unavailable" }), { status: 503 }) as never;
  if (COPIES.test(path)) {
    wire.order.push(`${method} originals`);
    if (method === "POST") {
      wire.kept.push(init?.body as string);
      if (wire.down.has("keep-reply")) { const reply = await inner(url, init); await (reply.body as unknown as ReadableStream | null)?.cancel(); throw new Error("no reply to the keep"); }
    }
    if (method === "DELETE" && wire.down.has("end")) throw new Error("no reply to the deletion");
  }
  if (method !== "POST" || !ACTS.test(path)) return inner(url, init);
  const body = init?.body as string, mode = wire.mode;
  wire.acts.push({ actor: (JSON.parse(body) as { signed: SignedIntent }).signed.intent.actor, body, arrived: mode !== "never-arrived" });
  wire.order.push("POST acts");
  if (mode === "never-arrived") throw new Error("the request never arrived");
  if (mode === "unavailable") return new Response(JSON.stringify({ answer: "unavailable", reason: "unavailable" }), { status: 503 }) as never;
  const reply = await inner(url, init);
  if (mode === "reply-lost") { await (reply.body as unknown as ReadableStream | null)?.cancel(); throw new Error("the reply never came"); }
  return reply;
};

const counted = (secret: Uint8Array) => {
  const inner = secretSigner(secret), count = { signatures: 0 };
  const signer: Signer = { key: inner.key, sign: (bytes: Uint8Array) => { count.signatures++; return inner.sign(bytes); } };
  return { signer, count };
};

interface Scene {
  d: Demo; wire: Wire; phone: Room; rita: Room; lane: ScopeId; number: number; laptopSecret: Uint8Array; laptopKey: string;
  phoneSignatures: { signatures: number };
  session(secret: Uint8Array): Session;
  /** A `dap mcp` of `secret`: the laptop's unless another is named. A new service over one store stands for a restart. */
  server(store?: CustodyStore, secret?: Uint8Array, originals?: boolean): McpService;
}

/** One person, @una, with two keys: `laptop`, on `dap mcp`, by `join`, and `phone`, on the page, by the `device-key` invitation. */
async function scene(): Promise<Scene> {
  const wire = wireOf();
  const d = await demo(wrapOf(wire));
  const place = placeOf(JSON.stringify(d.config))!;
  const laptopSecret = crypto.getRandomValues(new Uint8Array(32)), phoneSecret = crypto.getRandomValues(new Uint8Array(32));
  const session = (secret: Uint8Array): Session => d.as(secret);
  expect((await joinRoom(session(laptopSecret), d.link)).answer.answer).toBe("accepted");
  const rita = await openRoom(session(await d.secretOf(d.rita)), place);
  const filed = await act(rita, d.D.name, "open-issue", { fields: { definition: DEMO_DIGESTS.issue, title: "The handbook is empty", conditions: ["README.md says what the room is for"] } });
  expect(filed.answer.answer).toBe("accepted");
  await d.pause([d.D.name]);
  const issue = (await listLanes(rita)).issues[0]!;
  const issued = await issueDeviceKey(rita, "@una");
  if (!("link" in issued)) throw new Error(`no device link: ${JSON.stringify(issued)}`);
  const joining = session(phoneSecret);
  const prepared = await prepareJoin(joining, issued.link);
  expect((await submitJoin(joining, prepared)).answer).toBe("accepted");
  const { signer, count } = counted(phoneSecret);
  const { secret: _secret, ...rest } = session(phoneSecret);
  const phone = await openRoom({ ...rest, signer } as Session, place);
  expect(phone.me?.handle).toBe("@una");
  count.signatures = 0;
  const repository = d.config.repository!;
  const server = (store: CustodyStore = memoryStore(), secret = laptopSecret, originals = true) => {
    const of = session(secret);
    return new McpService({ service: SERVICE, fetch: of.fetch!, signer: secretSigner(secret), custody: store, now: of.now!, pause: d.pause, every: () => () => {}, mode: "generic", originals,
      config: { read: async () => ({ service: SERVICE, repository }), addRoot: async () => { throw new Error("this story adds no root"); } } });
  };
  reset(wire);
  return { d, wire, phone, rita, lane: issue.scope, number: issue.number!, laptopSecret, laptopKey: keyIdOfSecret(laptopSecret), phoneSignatures: count, session, server };
}
const reset = (wire: Wire) => { wire.acts.length = 0; wire.kept.length = 0; wire.order.length = 0; wire.sessions = 0; };

const commentArgs = (s: Scene, key: string, body: string) => ({ target: s.lane, kind: "comment", digest: DEMO_DIGESTS.issue, fields: { body }, idempotencyKey: key });
const comment = (s: Scene, mcp: McpService, key: string, body = "It is in README.md.") => mcp.call("act", commentArgs(s, key, body));
const said = (result: CallResult) => result.structuredContent as Record<string, unknown> & { error?: string; message?: string; answer?: string; phase?: string; retained?: boolean; fact?: { seq: number }; reason?: string };
const rows = async (s: Scene) => { const read = await openOriginals(s.phone); expect(read.failed).toBe(false); return read.rows; };
const entriesUnder = async (s: Scene, key: string) => {
  const read = await handleOf(s.phone, s.lane).history();
  if (!read.ok) throw new Error(read.reason);
  return read.value.filter(sealed => sealed.entry.input.type === "act" && sealed.entry.input.signed.intent.idempotencyKey === key);
};
const identityOf = async (s: Scene, key: string) => {
  const summary = await handleOf(s.phone, s.lane).summary();
  if (!summary.ok) throw new Error(summary.reason);
  return { service: SERVICE, membership: s.phone.membership, signer: s.laptopKey as never, target: summary.value.scope, key };
};
/** Fills the object as `original-copy` does: a row that only states its size and its member. */
const fill = (s: Scene, member: string, digest: string, size: number) => s.d.wait(() => runInDurableObject(s.d.M.object, (_instance, state) => {
  state.storage.sql.exec("INSERT INTO original_copy (digest, inc, member, actor, target, kind, item, not_after, drop_ms, size, bytes) VALUES (?, ?, ?, 'k', '{}', 'k', NULL, 'never', ?, ?, '')", digest, s.phone.membership.inc, member, s.phone.session.now!() + 8 * 24 * 3600 * 1000, size);
}));
const unfill = (s: Scene) => s.d.wait(() => runInDurableObject(s.d.M.object, (_instance, state) => { state.storage.sql.exec("DELETE FROM original_copy WHERE actor = 'k'"); }));
/** A store whose dispatch write fails while `failing` is set: a stop after the keep and before the send. */
const breakable = (inner = memoryStore()) => {
  const state = { failing: false, locked: false };
  const store: CustodyStore = { ...inner,
    write: (id, record, options) => (state.failing && options?.dispatch ? Promise.reject(new CustodyError({ held: "unreadable" })) : inner.write(id, record, options)),
    lock: (id, notAfter) => (state.locked ? Promise.resolve(null) : inner.lock(id, notAfter)) };
  return { store, state, inner };
};

test("a reply lost through dap mcp is settled from the page on a second key, and nothing goes twice", async () => {
  const s = await scene();
  try {
    const store = memoryStore();
    s.wire.mode = "reply-lost";
    const lost = await comment(s, s.server(store), "lost-1");
    s.wire.mode = "pass";
    expect([said(lost).error, lost.isError]).toEqual(["transport", true]);
    // The copy comes first, and it holds the bytes that went.
    expect(s.wire.order.filter(name => name !== "GET originals")).toEqual(["POST originals", "POST acts"]);
    expect(s.wire.acts).toHaveLength(1);
    expect(s.wire.kept).toEqual([s.wire.acts[0]!.body]);

    const open = await rows(s);
    expect(open).toHaveLength(1);
    expect(open[0]!.actor).toBe(s.laptopKey);
    expect(originalLine(open[0]!, s.phone, [{ scope: s.lane, number: s.number, kind: "issue" }])).toBe(`You sent a comment on issue ${s.number} from another device. It has no answer yet.`);

    // The page settles first. It signs nothing and sends nothing.
    const checked = await checkOriginalRequest(s.phone, open[0]!.digest);
    expect(checked.state).toBe("landed");
    expect(s.phoneSignatures.signatures).toBe(0);
    expect(s.wire.acts).toHaveLength(1);
    expect(await rows(s)).toEqual([]);
    const entries = await entriesUnder(s, JSON.parse(s.wire.acts[0]!.body).signed.intent.idempotencyKey);
    expect(entries).toHaveLength(1);
    if (checked.state !== "landed") throw new Error("unreachable");

    // A restart with the record `unknown`, and the row gone: the scope's receipt resolves custody at the entry that the page saw.
    const restarted = s.server(store);
    const settled = await restarted.call("settle", { target: s.lane, idempotencyKey: "lost-1" });
    expect([said(settled).answer, said(settled).phase, said(settled).fact?.seq]).toEqual(["accepted", "accepted", checked.receipt.fact.seq]);
    const repeat = await comment(s, restarted, "lost-1");
    expect([said(repeat).answer, said(repeat).retained, said(repeat).fact?.seq]).toEqual(["accepted", true, checked.receipt.fact.seq]);
    expect(s.wire.acts).toHaveLength(1);
    expect(s.wire.kept).toHaveLength(1);
    expect(await rows(s)).toEqual([]);
  } finally { s.d.done(); }
}, 120_000);

test("each answer of the scope ends the row, and no answer leaves it", async () => {
  const s = await scene();
  try {
    const mcp = s.server();
    expect(said(await comment(s, mcp, "pass-1")).answer).toBe("accepted");
    expect(s.wire.order).toEqual(["POST originals", "POST acts", "DELETE originals"]);
    expect(await rows(s)).toEqual([]);

    // `unavailable` is no answer. The next call of the key resends the same bytes, and the scope's answer ends the row.
    reset(s.wire);
    s.wire.mode = "unavailable";
    expect(said(await comment(s, mcp, "open-1", "Later.")).answer).toBe("unavailable");
    s.wire.mode = "pass";
    expect(await rows(s)).toHaveLength(1);
    expect(said(await comment(s, mcp, "open-1", "Later.")).answer).toBe("accepted");
    expect(await rows(s)).toEqual([]);
    expect(new Set(s.wire.acts.map(sent => sent.body)).size).toBe(1);

    // `settle` ends the row on the scope's receipt.
    reset(s.wire);
    s.wire.mode = "reply-lost";
    await comment(s, mcp, "settle-1", "Settled here.");
    s.wire.mode = "pass";
    expect(await rows(s)).toHaveLength(1);
    const settled = await mcp.call("settle", { target: s.lane, idempotencyKey: "settle-1" });
    expect(said(settled).answer).toBe("accepted");
    expect(await rows(s)).toEqual([]);

    // An acceptance whose entry this server cannot read back leaves the row, as the page does. A later answer ends it.
    reset(s.wire);
    s.wire.down.add("entries");
    expect(said(await comment(s, mcp, "follow-1", "Followed later.")).answer).toBe("accepted");
    s.wire.down.delete("entries");
    expect(s.wire.order).not.toContain("DELETE originals");
    expect(await rows(s)).toHaveLength(1);
    expect(said(await comment(s, mcp, "follow-1", "Followed later.")).retained).toBe(true);
    expect(s.wire.acts).toHaveLength(1);
    expect(await rows(s)).toEqual([]);
  } finally { s.d.done(); }
}, 120_000);

test("a room that keeps no copy gets no send", async () => {
  const s = await scene();
  try {
    const store = memoryStore();
    const mcp = s.server(store);
    const asked = await identityOf(s, "full-1");
    const member = s.phone.me!.ref!.member;
    // The member's cap: exact words, no send, and the record stays unsent, so a later call of the key goes.
    for (let i = 0; i < 64; i++) await fill(s, member, `filler-${i}`, 1);
    const full = await comment(s, mcp, "full-1");
    expect(said(full).error).toBe("original");
    expect(said(full).message).toBe("You have too many open requests. Nothing was sent.");
    expect(s.wire.acts).toEqual([]);
    expect((await store.read(identityId(asked)))?.phase).toBe("prepared");
    await unfill(s);
    expect(said(await comment(s, mcp, "full-1")).answer).toBe("accepted");
    expect(s.wire.acts).toHaveLength(1);

    // The object's cap.
    reset(s.wire);
    await fill(s, s.rita.me!.ref!.member, "filler-room", 1024 * 1024 * 1024);
    const roomFull = await comment(s, mcp, "room-1");
    expect(said(roomFull).message).toContain("This room has no space for more open requests.");
    expect(said(roomFull).message).toContain("Nothing was sent.");
    expect(s.wire.acts).toEqual([]);
    await unfill(s);

    // No reply to the keep: the row that it may have written ends, and no send follows.
    reset(s.wire);
    s.wire.down.add("keep-reply");
    const noReply = await comment(s, mcp, "reply-1");
    s.wire.down.delete("keep-reply");
    expect(said(noReply).message).toBe("The room gave no reply when it was asked to keep a copy of this request. Nothing was sent.");
    expect(s.wire.acts).toEqual([]);
    expect(s.wire.order).toContain("DELETE originals");
    expect(await rows(s)).toEqual([]);

    // A row with other unsigned parts keeps the first, and this server sends nothing over it.
    const record = await store.read(identityId(await identityOf(s, "reply-1")));
    const laptop = await openRoom(s.session(s.laptopSecret), placeOf(JSON.stringify(s.d.config))!);
    const other = await s.d.fetch(`${SERVICE}/v1/scopes/${encodeURIComponent(s.phone.membership.scope)}/originals`, { method: "POST", headers: { authorization: laptop.reader!.reader(), "content-type": "application/json" }, body: actBodyText(record!.envelope.signed, { texts: ["Other."] }) });
    expect(other.status).toBe(204);
    reset(s.wire);
    const conflict = await comment(s, mcp, "reply-1");
    expect(said(conflict).message).toBe("The room did not keep a copy of this request (conflict). Nothing was sent.");
    expect(s.wire.acts).toEqual([]);
  } finally { s.d.done(); }
}, 120_000);

test("a stop after the keep ends the row, and leaves the row of a send that went", async () => {
  const s = await scene();
  try {
    const { store, state } = breakable();
    const mcp = s.server(store);
    state.failing = true;
    const stopped = await comment(s, mcp, "stop-1");
    expect(said(stopped).error).toBe("custody");
    expect(s.wire.order).toEqual(["POST originals", "DELETE originals"]);
    expect(s.wire.acts).toEqual([]);
    expect(await rows(s)).toEqual([]);

    // A row that it cannot end stays, and the words say so.
    reset(s.wire);
    s.wire.down.add("end");
    const stays = await comment(s, mcp, "stop-2");
    s.wire.down.delete("end");
    expect(said(stays).error).toBe("original");
    expect(said(stays).message).toBe("The server's custody stopped this request after the room kept a copy. Nothing was sent. This server could not end the copy, so the request can show as open. Check it before you send it again.");
    expect(s.wire.acts).toEqual([]);
    expect(await rows(s)).toHaveLength(1);
    await checkOriginalRequest(s.phone, (await rows(s))[0]!.digest);
    state.failing = false;
    expect(said(await comment(s, mcp, "stop-2")).answer).toBe("accepted");
    expect(await rows(s)).toEqual([]);

    // After a send of unknown outcome, the row is that send's. A stop on the next call leaves it.
    reset(s.wire);
    s.wire.mode = "reply-lost";
    await comment(s, mcp, "stop-3");
    s.wire.mode = "pass";
    state.failing = true;
    expect(said(await comment(s, mcp, "stop-3")).error).toBe("custody");
    state.failing = false;
    expect(s.wire.order).not.toContain("DELETE originals");
    expect(s.wire.acts).toHaveLength(1);
    expect(await rows(s)).toHaveLength(1);
    expect(said(await comment(s, mcp, "stop-3")).answer).toBe("accepted");

    // A lock means that another call of the key holds the send. Its row stays.
    reset(s.wire);
    const locks: { first: boolean } = { first: true };
    const inner = store.lock;
    store.lock = (id, notAfter) => { if (locks.first) { locks.first = false; return inner(id, notAfter); } return Promise.resolve(null); };
    expect(said(await comment(s, mcp, "stop-4")).error).toBe("custody");
    store.lock = inner;
    expect(s.wire.order).toEqual(["POST originals"]);
    expect(await rows(s)).toHaveLength(1);
  } finally { s.d.done(); }
}, 120_000);

test("a restart with a custody record and an open copy sends the same bytes and ends on the scope's answer", async () => {
  const s = await scene();
  try {
    const store = memoryStore();
    // The request never arrived. The repeat after the restart matches the row, and lands once with the same bytes.
    s.wire.mode = "never-arrived";
    expect(said(await comment(s, s.server(store), "again-1")).error).toBe("transport");
    s.wire.mode = "pass";
    expect(await rows(s)).toHaveLength(1);
    const landed = await comment(s, s.server(store), "again-1");
    expect(said(landed).answer).toBe("accepted");
    expect(s.wire.acts).toHaveLength(2);
    expect(s.wire.acts[1]!.body).toBe(s.wire.acts[0]!.body);
    expect(new Set(s.wire.kept).size).toBe(1);
    expect(await entriesUnder(s, "again-1")).toHaveLength(1);
    expect(await rows(s)).toEqual([]);

    // `settle` after a restart reads the scope's answer and ends the row. The repeat of that terminal record keeps nothing and sends nothing.
    reset(s.wire);
    s.wire.mode = "reply-lost";
    expect(said(await comment(s, s.server(store), "again-3", "Third.")).error).toBe("transport");
    s.wire.mode = "pass";
    expect(await rows(s)).toHaveLength(1);
    const reader = s.server(store);
    const read = await reader.call("settle", { target: s.lane, idempotencyKey: "again-3" });
    expect([said(read).answer, said(read).phase]).toEqual(["accepted", "accepted"]);
    expect(await rows(s)).toEqual([]);
    reset(s.wire);
    expect(said(await comment(s, reader, "again-3", "Third.")).retained).toBe(true);
    expect(s.wire.order).toEqual(["DELETE originals"]);
    expect(s.wire.acts).toEqual([]);

    // The page settled first, and the record is still `unknown`: the repeat writes the row again, gets the first entry, and ends it.
    reset(s.wire);
    s.wire.mode = "reply-lost";
    expect(said(await comment(s, s.server(store), "again-2", "Second.")).error).toBe("transport");
    s.wire.mode = "pass";
    const first = await checkOriginalRequest(s.phone, (await rows(s))[0]!.digest);
    expect(first.state).toBe("landed");
    const repeated = await comment(s, s.server(store), "again-2", "Second.");
    expect(said(repeated).answer).toBe("accepted");
    if (first.state === "landed") expect(said(repeated).fact?.seq).toBe(first.receipt.fact.seq);
    expect(await entriesUnder(s, "again-2")).toHaveLength(1);
    expect(await rows(s)).toEqual([]);

    // Past `notAfter`, the row refuses a keep. The bytes still go, because only the scope's answer resolves custody, and that answer
    // ends the open row. A request that landed returns its first entry.
    reset(s.wire);
    s.wire.mode = "reply-lost";
    expect(said(await comment(s, s.server(store), "late-1", "Late, landed.")).error).toBe("transport");
    s.wire.mode = "never-arrived";
    expect(said(await comment(s, s.server(store), "late-2", "Late, never arrived.")).error).toBe("transport");
    s.wire.mode = "pass";
    const open = await rows(s);
    expect(open).toHaveLength(2);
    s.d.advanceClock(Math.max(...open.map(row => timeMs(row.notAfter)!)) + 1000 - s.phone.session.now!());
    reset(s.wire);
    const late = s.server(store);
    const lateLanded = await comment(s, late, "late-1", "Late, landed.");
    expect(said(lateLanded).answer).toBe("accepted");
    expect(said(lateLanded).retained).toBe(false);
    const lateRefused = await comment(s, late, "late-2", "Late, never arrived.");
    expect([said(lateRefused).answer, said(lateRefused).reason]).toEqual(["refused", "expired"]);
    expect(await entriesUnder(s, "late-1")).toHaveLength(1);
    expect(await entriesUnder(s, "late-2")).toEqual([]);
    expect(await rows(s)).toEqual([]);
  } finally { s.d.done(); }
}, 120_000);

test("a page that answered first leaves custody to the scope's answer", async () => {
  const s = await scene();
  try {
    const store = memoryStore();
    s.wire.mode = "never-arrived";
    expect(said(await comment(s, s.server(store), "never-1")).error).toBe("transport");
    s.wire.mode = "pass";
    const row = (await rows(s))[0]!;
    const phoneSends = s.wire.acts.length;
    s.d.advanceClock(sendableAt(row.notAfter) + 1000 - s.phone.session.now!());
    const refused = await checkOriginalRequest(s.phone, row.digest);
    expect(refused).toMatchObject({ state: "refused", reason: "expired" });
    expect(s.wire.acts).toHaveLength(phoneSends + 1);
    expect(s.wire.acts.at(-1)!.body).toBe(s.wire.acts[0]!.body);
    expect(await rows(s)).toEqual([]);

    // After a restart the scope holds no entry, so `settle` says unknown and sends nothing. The repeat sends the same bytes, and the
    // scope's refusal resolves custody. No entry exists at any step.
    const restarted = s.server(store);
    const settled = await restarted.call("settle", { target: s.lane, idempotencyKey: "never-1" });
    expect([said(settled).answer, said(settled).phase]).toEqual(["unknown", "unknown"]);
    expect(s.wire.acts).toHaveLength(phoneSends + 1);
    const repeated = await comment(s, restarted, "never-1");
    expect([said(repeated).answer, said(repeated).reason, said(repeated).phase]).toEqual(["refused", "expired", "refused"]);
    expect(await entriesUnder(s, "never-1")).toEqual([]);
    expect(await rows(s)).toEqual([]);
  } finally { s.d.done(); }
}, 120_000);

test("a resubmission keeps its row first, and a refusal ends it", async () => {
  const s = await scene();
  try {
    const mcp = s.server();
    s.wire.mode = "never-arrived";
    await comment(s, mcp, "again-1");
    s.wire.mode = "pass";
    const row = (await rows(s))[0]!;
    s.d.advanceClock(timeMs(row.notAfter)! + 1000 - s.phone.session.now!());
    expect(said(await comment(s, mcp, "again-1")).phase).toBe("refused");
    expect(await rows(s)).toEqual([]);
    reset(s.wire);
    // A retained refusal sends nothing, with no keep.
    expect(said(await comment(s, mcp, "again-1")).retained).toBe(true);
    expect(s.wire.order.filter(name => name !== "DELETE originals" && name !== "GET originals")).toEqual([]);
    // A deliberate resubmission keeps, is told `expired`, sends the same bytes, and ends on the answer.
    const again = await mcp.call("act", { ...commentArgs(s, "again-1", "It is in README.md."), resubmit: true });
    expect([said(again).answer, said(again).reason]).toEqual(["refused", "expired"]);
    expect(s.wire.order.slice(-3)).toEqual(["POST originals", "POST acts", "DELETE originals"]);
  } finally { s.d.done(); }
}, 120_000);

test("a local server with no person's session keeps no copy", async () => {
  const s = await scene();
  try {
    // The port unset, as a hosted agent's service and the command line's are.
    const none = s.server(memoryStore(), s.laptopSecret, false);
    expect(said(await comment(s, none, "plain-1")).answer).toBe("accepted");
    expect(s.wire.order).toEqual(["POST acts"]);
    // Its settlement reaches no copy route either.
    reset(s.wire);
    s.wire.mode = "reply-lost";
    expect(said(await comment(s, none, "plain-2", "Plain, lost.")).error).toBe("transport");
    s.wire.mode = "pass";
    expect(said(await none.call("settle", { target: s.lane, idempotencyKey: "plain-2" })).answer).toBe("accepted");
    expect(s.wire.order).toEqual(["POST acts"]);

    // A session that this process never held: it sends as it does today, with no copy.
    reset(s.wire);
    s.wire.down.add("sessions");
    const never = s.server();
    const sent = await comment(s, never, "signed-1", "On signed reads.");
    s.wire.down.delete("sessions");
    expect(said(sent).answer, JSON.stringify(said(sent))).toBe("accepted");
    expect(s.wire.order).toEqual(["POST acts"]);

    // An agent's own key, with the port set: an agent holds its own keys and its custody stays separate.
    reset(s.wire);
    const botSecret = crypto.getRandomValues(new Uint8Array(32)), M = s.rita.membership;
    const added = await act(s.rita, M.scope, "add-member", { fields: { handle: "@bot", kind: "agent", controller: s.rita.me!.ref! as never } });
    if (added.answer.answer !== "accepted") throw new Error(JSON.stringify(added.answer));
    const inviteSecret = b64url(crypto.getRandomValues(new Uint8Array(32)));
    const before = await handleOf(s.rita, M.scope).summary();
    if (!before.ok) throw new Error(before.reason);
    const definition = before.value.definition as string;
    const invited = await act(s.rita, M.scope, "invite-key", { fields: { member: added.answer.receipt.fact.seq, kind: "agent", ...invitationIssueFields(definition, inviteSecret), inviteEnds: timeOf(s.rita.session.now!() + 3_600_000) } });
    if (invited.answer.answer !== "accepted") throw new Error(JSON.stringify(invited.answer));
    const at = await handleOf(s.rita, M.scope).summary();
    if (!at.ok) throw new Error(at.reason);
    const roster = at.value.items.find(item => item.type === "roster")!, bot = at.value.items.find(item => item.type === "member" && item.values["handle"] === "@bot")!;
    const enrol = await signedIntent(secretSigner(botSecret), { to: M, kind: "enrol", on: 0, fields: invitationRedemptionFields(definition, M, invited.answer.receipt.fact.seq, keyIdOfSecret(botSecret), inviteSecret), expected: { on: roster.revision, member: bot.revision } }, { now: s.rita.session.now!() });
    const enrolled = await handleOf(s.rita, M.scope).submit(enrol, []);
    expect(enrolled.answer, JSON.stringify(enrolled)).toBe("accepted");
    reset(s.wire);
    const agent = s.server(memoryStore(), botSecret);
    expect(said(await comment(s, agent, "agent-1", "An agent's comment.")).answer).toBe("accepted");
    expect(s.wire.order).toEqual(["POST acts"]);
    expect(s.wire.acts).toHaveLength(1);
    // Its session ends and no new one comes: an agent's send does not stop, as it did not before this writer.
    reset(s.wire);
    s.d.advanceClock(601_000);
    s.wire.down.add("sessions");
    expect(said(await comment(s, agent, "agent-2", "Still an agent.")).answer).toBe("accepted");
    expect(s.wire.order).toEqual(["POST acts"]);
    // Its membership answers no read either, so no read states its kind. The earlier read still does.
    reset(s.wire);
    s.wire.unread = M.scope;
    const blind = await comment(s, agent, "agent-3", "Still an agent, unread.");
    s.wire.unread = null;
    s.wire.down.delete("sessions");
    expect(said(blind).answer, JSON.stringify(said(blind))).toBe("accepted");
    expect(s.wire.order).toEqual(["POST acts"]);
  } finally { s.d.done(); }
}, 120_000);

test("a server that held a session and failed to renew it stops the send", async () => {
  const s = await scene();
  try {
    const held = counted(s.laptopSecret);
    const of = s.session(s.laptopSecret), repository = s.d.config.repository!;
    const mcp = new McpService({ service: SERVICE, fetch: of.fetch!, signer: held.signer, custody: memoryStore(), now: of.now!, pause: s.d.pause, every: () => () => {}, mode: "generic", originals: true,
      config: { read: async () => ({ service: SERVICE, repository }), addRoot: async () => { throw new Error("this story adds no root"); } } });
    expect(said(await comment(s, mcp, "held-1")).answer).toBe("accepted");
    reset(s.wire);

    // The session ends, and no new one comes. Signed reads take the snapshot, so the stop is the writer's and comes before a signature on an intent.
    s.d.advanceClock(601_000);
    s.wire.down.add("sessions");
    const intents = () => s.wire.acts.length;
    const stopped = await comment(s, mcp, "held-2", "Stopped.");
    expect(said(stopped).error, JSON.stringify(said(stopped))).toBe("original");
    expect(said(stopped).message).toBe("This server could not renew its session with the room, so it cannot keep a copy of this request. Nothing was sent.");
    expect(intents()).toBe(0);
    expect(s.wire.order).toEqual([]);

    // The next send after the connection returns renews, keeps and sends.
    s.wire.down.delete("sessions");
    const asks = s.wire.sessions;
    expect(said(await comment(s, mcp, "held-2", "Stopped.")).answer).toBe("accepted");
    expect(s.wire.sessions).toBeGreaterThan(asks);
    expect(s.wire.order).toEqual(["POST originals", "POST acts", "DELETE originals"]);
  } finally { s.d.done(); }
}, 120_000);

test("the row's body is the request that custody stores", async () => {
  const s = await scene();
  try {
    const store = memoryStore();
    s.wire.mode = "reply-lost";
    await comment(s, s.server(store), "bytes-1");
    s.wire.mode = "pass";
    const record = await store.read(identityId(await identityOf(s, "bytes-1")));
    expect(record).not.toBeNull();
    expect(s.wire.kept[0]).toBe(actBodyText(record!.envelope.signed, record!.envelope.beside));
    const row = (await rows(s))[0]!;
    expect(row.digest).toBe(intentDigest(record!.envelope.signed.intent));
    expect(row.kind).toBe("comment");

    // A store can read a record back in another key order, as a presented fact's caller order does. The row holds what custody sends.
    const inner = memoryStore();
    const reorders: typeof inner = { ...inner, read: async id => {
      const held = await inner.read(id);
      return held && { ...held, envelope: { ...held.envelope, signed: { sig: held.envelope.signed.sig, intent: held.envelope.signed.intent } } };
    } };
    reset(s.wire);
    expect(said(await comment(s, s.server(reorders), "bytes-2", "Other order.")).answer).toBe("accepted");
    expect(s.wire.kept[0]).toBe(s.wire.acts[0]!.body);
  } finally { s.d.done(); }
}, 120_000);
