import { expect, test } from "vitest";
import { runDurableObjectAlarm, runInDurableObject } from "cloudflare:test";
import type { ScopeId, SignedIntent } from "@generalbusiness/dap-contract";
import { b64url, canonicalBytes, canonicalize, intentDigest, parseStrict, timeMs, timeOf, utf8, textDigest } from "@generalbusiness/dap-bytes";
import { DEMO_DIGESTS } from "@generalbusiness/dap-lanes";
import { actBodyText, originalRequest, requestSession, secretSigner, sendableAt, signedIntent, signedRead, signerSessionRequest, type Fetch, type OriginalRow, type Signer } from "@generalbusiness/dap-client";
import { applicationGatewayRoute } from "../../../../packages/client/src/application-gateway.ts";
import { CopyNotKept, act, actAssociation, sessionLost, copiesOf, handleOf, issueDeviceKey, joinRoom, keepOriginal, listLanes, loadIssue, openRoom, placeOf, prepareJoin, submitJoin, type Room, type Session } from "../src/data.ts";
import { ORIGINALS_UNREAD, checkAnswerLine, checkOriginalRequest, liftFences, lockedScopes, openOriginals, originalLine, settledAssociations } from "../src/original-check.ts";
import { ScopeSending } from "../src/shell.ts";
import { SERVICE, demo, type Demo } from "./support/demo.ts";

// Invariant: a copy of a request stays where another key of one member reaches it. That key settles the request with no signature,
// and a copy can finish only the act that its signer asked for. notes/2026-10-31-signed-requests-across-devices.md, section 8.
//
// The room is `support/demo.ts`: real scopes, the Worker's routes, real read sessions under a TEST SECRET, and the scripted clock of
// the namespaces. The network between the page and the routes is a STAND-IN: `wire` loses a reply, or drops a request, as a device
// losing its connection does. No DOM: the two-context witness (`two-devices.mjs`) runs the page.

type Mode = "pass" | "reply-lost" | "never-arrived" | "held";
/** What the stand-in network loses or refuses: session requests, copy lists, a refused list, a keep, a refused keep, and copy deletions. */
type Down = "sessions" | "list" | "list-refused" | "keep" | "keep-refused" | "end";
interface Wire { mode: Mode; down: Set<Down>; acts: { actor: string; body: string; arrived: boolean }[]; copies: { method: string; path: string }[]; order: string[]; release?: () => void; arrived?: () => void }
const wireOf = (): Wire => ({ mode: "pass", down: new Set(), acts: [], copies: [], order: [] });
const ACTS = /\/v1\/scopes\/[^/]+\/acts$/;
const COPIES = /\/v1\/scopes\/[^/]+\/originals(\/.*)?$/;

/** The stand-in network. It counts each act's request, and each request to the copy routes. */
const wrapOf = (wire: Wire) => (inner: Fetch): Fetch => async (url, init) => {
  const method = init?.method ?? "GET", path = new URL(url).pathname;
  if (COPIES.test(path)) { wire.copies.push({ method, path }); wire.order.push(`${method} originals`); }
  if (wire.down.has("sessions") && path.endsWith("/sessions")) throw new Error("no reply to the session request");
  if (wire.down.has("list") && method === "GET" && path.endsWith("/originals")) throw new Error("no reply to the list");
  if (wire.down.has("list-refused") && method === "GET" && path.endsWith("/originals")) return new Response(JSON.stringify({ ok: false, reason: "unavailable" }), { status: 503 }) as never;
  if (wire.down.has("keep") && method === "POST" && path.endsWith("/originals")) throw new Error("no reply to the keep");
  if (wire.down.has("keep-refused") && method === "POST" && path.endsWith("/originals")) return new Response(JSON.stringify({ reason: "conflict" }), { status: 409 }) as never;
  if (wire.down.has("end") && method === "DELETE" && COPIES.test(path)) throw new Error("no reply to the deletion");
  if (method !== "POST" || !ACTS.test(path)) return inner(url, init);
  const body = init?.body as string;
  const actor = (JSON.parse(body) as { signed: SignedIntent }).signed.intent.actor;
  const mode = wire.mode, arrived = mode !== "never-arrived";
  wire.acts.push({ actor, body, arrived }); wire.order.push("POST acts");
  if (mode === "never-arrived") throw new Error("the request never arrived");
  if (mode === "held") { wire.arrived?.(); await new Promise<void>(resolve => { wire.release = resolve; }); throw new Error("the reply never came"); }
  const reply = await inner(url, init);
  if (mode === "reply-lost") throw new Error("the reply never came");
  return reply;
};

/** A signer that counts each signature. */
const counted = (secret: Uint8Array) => {
  const inner = secretSigner(secret), count = { signatures: 0 };
  const signer: Signer = { ...inner, key: inner.key, sign: (bytes: Uint8Array) => { count.signatures++; return inner.sign(bytes); } };
  return { signer, count };
};

interface Scene {
  d: Demo; wire: Wire; place: NonNullable<ReturnType<typeof placeOf>>;
  laptop: Room; phone: Room; rita: Room; paul: Room; lane: ScopeId; number: number;
  secrets: { laptop: Uint8Array; phone: Uint8Array };
  phoneSignatures: { signatures: number };
  session(secret: Uint8Array, signer?: Signer): Session;
}

/** One member, @una, with two keys: `laptop` by `join`, and `phone` by the `device-key` invitation. @paul is another member. */
async function scene(wire: Wire = wireOf()): Promise<Scene> {
  const d = await demo(wrapOf(wire));
  const place = placeOf(JSON.stringify(d.config))!;
  const secrets = { laptop: crypto.getRandomValues(new Uint8Array(32)), phone: crypto.getRandomValues(new Uint8Array(32)) };
  const session = (secret: Uint8Array, signer?: Signer): Session => {
    const { secret: _given, ...rest } = d.as(secret);
    return (signer ? { ...rest, signer } : { ...rest, secret }) as Session;
  };
  expect((await joinRoom(session(secrets.laptop), d.link)).answer.answer).toBe("accepted");
  const laptop = await openRoom(session(secrets.laptop), place);
  const rita = await openRoom(session(await d.secretOf(d.rita)), place);
  const paul = await openRoom(session(await d.secretOf(d.paul)), place);
  const filed = await act(laptop, d.D.name, "open-issue", { fields: { definition: DEMO_DIGESTS.issue, title: "The handbook is empty", conditions: ["README.md says what the room is for"] } });
  expect(filed.answer.answer).toBe("accepted");
  await d.pause([d.D.name]);
  const issue = (await listLanes(laptop)).issues[0]!;

  const issued = await issueDeviceKey(rita, "@una");
  if (!("link" in issued)) throw new Error(`no device link: ${JSON.stringify(issued)}`);
  const joining = session(secrets.phone);
  const prepared = await prepareJoin(joining, issued.link);
  expect(prepared.signed.intent.kind).toBe("enrol");
  expect((await submitJoin(joining, prepared)).answer).toBe("accepted");

  const { signer, count } = counted(secrets.phone);
  const phone = await openRoom(session(secrets.phone, signer), place);
  expect(phone.me?.handle).toBe("@una");
  count.signatures = 0;
  wire.acts.length = 0; wire.copies.length = 0; wire.order.length = 0;
  return { d, wire, place, laptop, phone, rita, paul, lane: issue.scope, number: issue.number!, secrets, phoneSignatures: count, session };
}

const GIB = 1024 * 1024 * 1024;
/** A row of another key that states its size and its member, so that a case can fill an object at once. The list reads it as a row, and it locks no key of the scene. */
const FILLER_KEY = secretSigner(new Uint8Array(32).fill(7)).key;
const fill = (s: Scene, member: string, digest: string, size: number) => s.d.wait(() => runInDurableObject(s.d.M.object, (_instance, state) => {
  const now = s.laptop.session.now!();
  state.storage.sql.exec("INSERT INTO original_copy (digest, genesis, member, actor, target, kind, item, not_after, drop_ms, size, bytes) VALUES (?, ?, ?, ?, ?, 'k', NULL, ?, ?, ?, '')", `sha256:${digest.split("").map(c => c.charCodeAt(0).toString(16)).join("").padEnd(64, "0").slice(0, 64)}`, s.laptop.membership.genesis, member, FILLER_KEY, JSON.stringify(s.laptop.membership), timeOf(now + 300_000), now + 8 * 24 * 3600 * 1000, size);
}));
/** Each member's row count in the object. */
const rowsByMember = (s: Scene) => s.d.wait(() => runInDurableObject(s.d.M.object, (_instance, state) => Object.fromEntries(state.storage.sql.exec("SELECT member, COUNT(*) AS n FROM original_copy GROUP BY member").toArray().map(row => [row["member"] as string, row["n"] as number]))));
/** One signed request by `room`'s key, kept through the route. */
async function keepBy(s: Scene, room: Room, secret: Uint8Array, to: unknown, kind = "comment") {
  const signed = await signedIntent(secretSigner(secret), { to: to as never, kind, on: null, fields: {} as never, expected: {} }, { now: room.session.now!() });
  const reply = await statusOf(s.session(s.secrets.laptop).fetch!, room, "", "POST", actBodyText(signed));
  return { status: reply.status, reason: reply.text ? (JSON.parse(reply.text) as { reason?: string }).reason ?? null : null };
}
const scopeRefOf = async (room: Room, scope: ScopeId) => {
  const summary = await handleOf(room, scope).summary();
  if (!summary.ok) throw new Error(summary.reason);
  return summary.value;
};
const comment = (room: Room, lane: ScopeId, body: string) => act(room, lane, "comment", { fields: { body } });
const entriesUnder = async (room: Room, lane: ScopeId, key: string) => {
  const read = await handleOf(room, lane).history();
  if (!read.ok) throw new Error(read.reason);
  return read.value.filter(sealed => sealed.entry.input.type === "act" && sealed.entry.input.signed.intent.idempotencyKey === key);
};
const statusOf = async (fetch: Fetch, room: Room, path: string, method = "GET", body?: string, reader = room.reader!.reader()) => {
  const reply = await fetch(`${SERVICE}/v1/scopes/${encodeURIComponent(room.membership.scope)}/originals${path}`, { method, headers: { authorization: reader, ...(body === undefined ? {} : { "content-type": "application/json" }) }, ...(body === undefined ? {} : { body }) });
  const text = reply.body ? new TextDecoder().decode(await new Response(reply.body as never).arrayBuffer()) : "";
  return { status: reply.status, text, cache: reply.headers?.get("cache-control") ?? null };
};
/** The rows of a read that must succeed. */
const openRows = async (room: Room): Promise<readonly OriginalRow[]> => {
  const read = await openOriginals(room);
  expect(read.failed).toBe(false);
  return read.rows;
};
/** Sends the act with the wire in `mode`, and returns the copy's row. The page sees a lost reply. */
async function lost(s: Scene, mode: Mode, body = "It is in README.md."): Promise<OriginalRow> {
  s.wire.mode = mode;
  await expect(comment(s.laptop, s.lane, body)).rejects.toThrow();
  s.wire.mode = "pass";
  const rows = await openRows(s.phone);
  expect(rows).toHaveLength(1);
  return rows[0]!;
}

test("a second key of one member settles a lost reply", async () => {
  const s = await scene();
  try {
    const row = await lost(s, "reply-lost");
    // The page keeps the copy before it sends the act.
    expect(s.wire.order.slice(0, 3)).toEqual(["GET originals", "POST originals", "POST acts"]);
    expect(s.wire.acts).toHaveLength(1);
    const first = s.wire.acts[0]!;
    expect(row.actor).toBe(s.laptop.key);
    expect(originalLine(row, s.phone, [{ scope: s.lane, number: s.number, kind: "issue" }])).toBe(`You sent a comment on issue ${s.number} from another device. It has no answer yet.`);
    expect(originalLine(row, s.laptop, [{ scope: s.lane, number: s.number, kind: "issue" }])).toBe(`You sent a comment on issue ${s.number} from this device. It has no answer yet.`);

    const phoneActs = () => s.wire.acts.filter(sent => sent.actor === s.phone.key).length;
    const check = await checkOriginalRequest(s.phone, row.digest);
    expect(check.state).toBe("landed");
    // The column "Reply lost" of the witness table.
    expect([s.wire.acts.length, phoneActs(), s.phoneSignatures.signatures]).toEqual([1, 0, 0]);
    expect(await openRows(s.phone)).toEqual([]);
    const signed = (JSON.parse(first.body) as { signed: SignedIntent }).signed;
    const entries = await entriesUnder(s.phone, s.lane, signed.intent.idempotencyKey);
    expect(entries).toHaveLength(1);
    expect(canonicalize((entries[0]!.entry.input as { signed: SignedIntent }).signed)).toBe(canonicalize(signed));
    expect((await loadIssue(s.phone, s.lane)).comments.map(c => c.body)).toEqual(["It is in README.md."]);
    // A second press finds nothing, and sends nothing.
    expect((await checkOriginalRequest(s.phone, row.digest)).state).toBe("gone");
    expect(s.wire.acts).toHaveLength(1);
  } finally { s.d.done(); }
});

test("an act that never arrived ends refused expired", async () => {
  const s = await scene();
  try {
    const row = await lost(s, "never-arrived");
    expect(s.wire.acts.map(sent => sent.arrived)).toEqual([false]);
    const firstBody = s.wire.acts[0]!.body;
    const untilSend = sendableAt(row.notAfter) - s.phone.session.now!();
    // Before `notAfter`, and at the last second inside the margin: the button sends nothing.
    expect((await checkOriginalRequest(s.phone, row.digest)).state).toBe("waiting");
    s.d.advanceClock(untilSend - 1000);
    expect((await checkOriginalRequest(s.phone, row.digest)).state).toBe("waiting");
    expect(s.wire.acts).toHaveLength(1);
    s.d.advanceClock(1000);
    const check = await checkOriginalRequest(s.phone, row.digest);
    expect(check).toMatchObject({ state: "refused", reason: "expired" });
    // The column "Never arrived" of the witness table.
    expect(s.wire.acts.map(sent => sent.arrived)).toEqual([false, true]);
    expect(s.wire.acts[1]!.body).toBe(firstBody);
    expect(s.wire.acts.filter(sent => sent.actor === s.laptop.key)).toHaveLength(2); // Both bodies carry the first key's signature.
    expect(s.phoneSignatures.signatures).toBe(0);
    expect(await openRows(s.phone)).toEqual([]);
    const signed = (JSON.parse(firstBody) as { signed: SignedIntent }).signed;
    expect(await entriesUnder(s.phone, s.lane, signed.intent.idempotencyKey)).toEqual([]);
  } finally { s.d.done(); }
});

test("a check that stops under a lost send does not call the request unsent", async () => {
  const s = await scene();
  try {
    const row = await lost(s, "reply-lost");
    expect(s.wire.acts).toHaveLength(1);
    // The scope holds the entry, so this row settles. A second request stays in flight: the wire holds it, and the scope has no entry.
    expect((await checkOriginalRequest(s.phone, row.digest)).state).toBe("landed");
    const held = await lost(s, "never-arrived", "It is in docs/README.md.");
    const waiting = await checkOriginalRequest(s.phone, held.digest);
    expect(waiting.state).toBe("waiting");
    const said = checkAnswerLine(waiting);
    expect(said).toContain("This check sent nothing, and an earlier send of this request can still arrive. Do not send it again as a new request.");
    expect(said).not.toContain("Nothing was sent");
    // A copy that no longer verifies says nothing about the send that went before it.
    await s.d.wait(() => runInDurableObject(s.d.M.object, (_instance, state) => { state.storage.sql.exec("UPDATE original_copy SET bytes = '{}' WHERE digest = ?", held.digest); }));
    const unverified = await checkOriginalRequest(s.phone, held.digest);
    expect(unverified.state).toBe("unverified");
    expect(checkAnswerLine(unverified)).toBe("This copy does not verify as your request. This check sent nothing, and it cannot say whether an earlier send went. Read the scope before you send this request again.");
    expect(s.wire.acts).toHaveLength(2);
  } finally { s.d.done(); }
});

test("another member and a revoked key read nothing", async () => {
  const s = await scene();
  try {
    const row = await lost(s, "reply-lost");
    const fetch = s.session(s.secrets.phone).fetch!;
    for (const other of [s.paul, s.rita]) {
      expect(await copiesOf(other)!.read(row.digest)).toEqual({ ok: false, reason: "not-found" });
      expect(await copiesOf(other)!.end(row.digest)).toEqual({ ok: false, reason: "not-found" });
      expect((await openRows(other))).toEqual([]);
    }
    // Every route says `no-store`, and no route answers without a session.
    expect((await statusOf(fetch, s.phone, "")).cache).toBe("no-store");
    expect((await statusOf(fetch, s.phone, `/${encodeURIComponent(row.digest)}`)).cache).toBe("no-store");
    expect((await statusOf(fetch, s.phone, "", "GET", undefined, "no such session")).status).toBe(403);

    // The first key retires. Its session token still names it, and the routes refuse it at once. The second key keeps the copy.
    const summary = await handleOf(s.rita, s.rita.membership.scope).summary();
    if (!summary.ok) throw new Error(summary.reason);
    const key = summary.value.items.find(item => item.type === "key" && item.values["id"] === s.laptop.key)!;
    expect((await act(s.rita, s.rita.membership.scope, "revoke-key", { on: key.id, fields: { as: "retired" } })).answer.answer).toBe("accepted");
    expect(await copiesOf(s.laptop)!.list()).toEqual({ ok: false, reason: "forbidden" });
    expect(await copiesOf(s.laptop)!.read(row.digest)).toEqual({ ok: false, reason: "forbidden" });
    expect(await copiesOf(s.laptop)!.end(row.digest)).toEqual({ ok: false, reason: "forbidden" });
    expect((await openRows(s.phone)).map(open => open.digest)).toEqual([row.digest]);
    expect((await checkOriginalRequest(s.phone, row.digest)).state).toBe("landed");
  } finally { s.d.done(); }
});

test("a copy lands nowhere else", async () => {
  const s = await scene();
  try {
    const fetch = s.session(s.secrets.phone).fetch!;
    // Send it unlanded before `notAfter`: it lands once. A stolen session delivers it. That is the copy's one power.
    const row = await lost(s, "never-arrived", "First.");
    const read = await copiesOf(s.phone)!.read(row.digest);
    if (!read.ok) throw new Error(read.reason);
    const request = originalRequest(read.bytes, row.digest)!;
    const target = handleOf(s.phone, s.lane);
    const landed = await target.submit(request.signed, [], request.beside);
    if (landed.answer !== "accepted") throw new Error(JSON.stringify(landed));
    // Send it after it landed: the first entry, and no new entry.
    const again = await target.submit(request.signed, [], request.beside);
    expect(again).toMatchObject({ answer: "accepted", receipt: { fact: landed.receipt.fact } });
    expect(await entriesUnder(s.phone, s.lane, request.signed.intent.idempotencyKey)).toHaveLength(1);
    // Send it to another scope.
    expect(await handleOf(s.phone, s.d.D.name).submit(request.signed, [], request.beside)).toMatchObject({ answer: "refused", reason: "misaddressed" });
    // Change any signed member.
    const changed = { ...request.signed, intent: { ...request.signed.intent, idempotencyKey: `${request.signed.intent.idempotencyKey}x` } };
    expect(await target.submit(changed, [], request.beside)).toMatchObject({ answer: "refused", reason: "bad-intent" });
    expect((await statusOf(fetch, s.phone, "", "POST", actBodyText(changed, request.beside))).status).toBe(400);
    // A stolen session deletes the row. Only the button goes: the journal stays true.
    expect(await copiesOf(s.phone)!.end(row.digest)).toEqual({ ok: true });
    expect(await entriesUnder(s.phone, s.lane, request.signed.intent.idempotencyKey)).toHaveLength(1);

    // Change a detached text: the scope verifies each one itself.
    const second = await lost(s, "never-arrived", "Second.");
    const secondRead = await copiesOf(s.phone)!.read(second.digest);
    if (!secondRead.ok) throw new Error(secondRead.reason);
    const secondRequest = originalRequest(secondRead.bytes, second.digest)!;
    const altered = { ...secondRequest.beside, texts: ["Not what was signed."] };
    const answer = await target.submit(secondRequest.signed, [], altered);
    expect(answer.answer).toBe("refused");
    expect(await entriesUnder(s.phone, s.lane, secondRequest.signed.intent.idempotencyKey)).toEqual([]);

    // Present its signature as a session request, or as a signed read: each is another domain.
    const signer = secretSigner(s.secrets.laptop);
    const asked = await signerSessionRequest(s.laptop.membership, signer, new Date(s.laptop.session.now!() + 60_000).toISOString().replace(/\.\d+Z$/, "Z") as never, b64url(crypto.getRandomValues(new Uint8Array(16))));
    expect(await requestSession(SERVICE, s.laptop.membership.scope, { ...asked, sig: secondRequest.signed.sig }, { fetch })).toMatchObject({ ok: false });
    const reading = await signedRead(signer, s.d.D.name, "summary", "summary", { now: s.laptop.session.now! });
    const forged = `Signed ${b64url(canonicalBytes({ ...reading, sig: secondRequest.signed.sig }))}`;
    const forgedRead = await fetch(`${SERVICE}/v1/scopes/${encodeURIComponent(s.d.D.name)}`, { headers: { authorization: forged } });
    expect(forgedRead.status).toBeGreaterThanOrEqual(400);
    const genuine = await fetch(`${SERVICE}/v1/scopes/${encodeURIComponent(s.d.D.name)}`, { headers: { authorization: `Signed ${b64url(canonicalBytes(reading))}` } });
    expect(genuine.status).toBe(200); // The same read with its own signature is what the forged one failed to be.

    // A session can make a copy only of what its own key signed, and only with a good signature.
    expect((await statusOf(fetch, s.paul, "", "POST", secondRead.bytes)).status).toBe(403);
    expect((await statusOf(fetch, s.phone, "", "POST", secondRead.bytes)).status).toBe(403);
    expect((await statusOf(fetch, s.laptop, "", "POST", "{}")).status).toBe(400);
    expect((await statusOf(fetch, s.laptop, "", "POST", actBodyText(secondRequest.signed, altered))).status).toBe(409);
    expect((await copiesOf(s.phone)!.read(second.digest))).toEqual({ ok: true, bytes: secondRead.bytes });
    // A holder of the key's session can delete the row and keep it again with other unsigned parts. The scope still refuses those parts.
    expect(await copiesOf(s.laptop)!.end(second.digest)).toEqual({ ok: true });
    const otherParts = actBodyText(secondRequest.signed, altered);
    expect((await statusOf(fetch, s.laptop, "", "POST", otherParts)).status).toBe(204);
    expect(await copiesOf(s.laptop)!.read(second.digest)).toEqual({ ok: true, bytes: otherParts });
    expect((await target.submit(secondRequest.signed, [], altered)).answer).toBe("refused");
    expect(await entriesUnder(s.phone, s.lane, secondRequest.signed.intent.idempotencyKey)).toEqual([]);

    // Send it unlanded at `notAfter`: `expired`.
    s.d.advanceClock(timeMs(second.notAfter)! - s.phone.session.now!());
    const bytesAgain = await target.submit(secondRequest.signed, [], secondRequest.beside);
    expect(bytesAgain).toMatchObject({ answer: "refused", reason: "expired" });
  } finally { s.d.done(); }
});

test("a full cap sends nothing", async () => {
  const s = await scene();
  try {
    const fetch = s.session(s.secrets.laptop).fetch!;
    const signer = secretSigner(s.secrets.laptop);
    const summary = await handleOf(s.laptop, s.lane).summary();
    if (!summary.ok) throw new Error(summary.reason);
    const now = s.laptop.session.now!();
    const keepOne = async (i: number, beside: Record<string, unknown> = {}) => {
      const signed = await signedIntent(signer, { to: summary.value.scope, kind: "comment", on: null, fields: { body: `sha256:${i.toString(16).padStart(64, "0")}` } as never, expected: {} }, { now });
      return statusOf(fetch, s.laptop, "", "POST", actBodyText(signed, beside as never));
    };
    // The member's rows: the 64th passes, and the 65th returns `full`.
    for (let i = 0; i < 64; i++) expect((await keepOne(i)).status, `copy ${i + 1}`).toBe(204);
    const over = await keepOne(64);
    expect(over.status).toBe(507);
    expect(JSON.parse(over.text).reason).toBe("full");
    // The page sends nothing, and it says so. These rows lock the lane, so the press goes to another scope, where only the cap stops it.
    const stopped = await act(s.laptop, s.d.D.name, "open-issue", { fields: { definition: DEMO_DIGESTS.issue, title: "One too many", conditions: ["Nothing"] } }).then(() => null, (error: Error) => error);
    expect(stopped).toBeInstanceOf(CopyNotKept);
    expect(stopped?.message).toBe("You have too many open requests. This press sent nothing. Check the open requests in this room first.");
    expect(s.wire.acts).toEqual([]);
    expect(await openRows(s.laptop)).toHaveLength(64);
    // Another member keeps their own cap.
    expect((await comment(s.paul, s.lane, "Mine goes.")).answer.answer).toBe("accepted");
    const lots = await openRows(s.laptop);

    // The member's bytes: 16 MiB. A row states a 1 MiB body at most.
    for (const row of lots) expect((await copiesOf(s.laptop)!.end(row.digest)).ok).toBe(true);
    const text = "x".repeat(1024 * 1024 - 4096);
    for (let i = 0; i < 16; i++) expect((await keepOne(100 + i, { texts: [text] })).status, `large copy ${i + 1}`).toBe(204);
    const overBytes = await keepOne(116, { texts: [text, text.slice(0, 200 * 1024)] });
    expect(overBytes.status).toBe(400); // Over the route's own bound for one body.
    const fullBytes = await keepOne(117, { texts: [text] });
    expect(fullBytes.status).toBe(507);
    expect(JSON.parse(fullBytes.text).reason).toBe("full");
    for (const row of await openRows(s.laptop)) expect((await copiesOf(s.laptop)!.end(row.digest)).ok).toBe(true);

    // The object's bytes: 1 GiB, across members. A row of another active member fills it.
    await fill(s, "@paul", "filler", GIB);
    const overObject = await keepOne(200);
    expect(overObject.status).toBe(423);
    expect(JSON.parse(overObject.text).reason).toBe("room-full");
  } finally { s.d.done(); }
}, 120_000);

test("a repeat with other bytes keeps the first", async () => {
  const s = await scene();
  try {
    const fetch = s.session(s.secrets.laptop).fetch!;
    const row = await lost(s, "never-arrived");
    const read = await copiesOf(s.laptop)!.read(row.digest);
    if (!read.ok) throw new Error(read.reason);
    const held = async () => s.d.wait(() => runInDurableObject(s.d.M.object, (_instance, state) => state.storage.sql.exec("SELECT COUNT(*) AS n, SUM(size) AS total FROM original_copy").one()));
    const before = await held();
    expect(before["total"]).toBe(utf8(read.bytes).length);
    // The same bytes: 204, and no charge.
    expect((await statusOf(fetch, s.laptop, "", "POST", read.bytes)).status).toBe(204);
    expect(await held()).toEqual(before);
    // Other bytes under one digest: 409, and the first stays.
    const parsed = parseStrict(read.bytes) as { signed: SignedIntent };
    const other = actBodyText(parsed.signed, { texts: ["Other words."] } as never);
    const conflict = await statusOf(fetch, s.laptop, "", "POST", other);
    expect(conflict.status).toBe(409);
    expect(JSON.parse(conflict.text).reason).toBe("conflict");
    expect(await held()).toEqual(before);
    expect(await copiesOf(s.laptop)!.read(row.digest)).toEqual({ ok: true, bytes: read.bytes });
    // A lane scope has no such route, and an application screen does not reach it.
    const lane = await fetch(`${SERVICE}/v1/scopes/${encodeURIComponent(s.lane)}/originals`, { headers: { authorization: s.laptop.reader!.reader() } });
    expect(lane.status).toBe(404);
    const posted = await fetch(`${SERVICE}/v1/scopes/${encodeURIComponent(s.lane)}/originals`, { method: "POST", headers: { authorization: s.laptop.reader!.reader() }, body: read.bytes });
    expect(posted.status).toBe(404);
    // Nor does a platform scope of another kind: the directory names a definition, and it holds no copy.
    const directory = await fetch(`${SERVICE}/v1/scopes/${encodeURIComponent(s.d.D.name)}/originals`, { headers: { authorization: s.laptop.reader!.reader() } });
    expect(directory.status).toBe(404);
    const host = { roomOrigin: SERVICE, directory: s.d.D.name } as never;
    for (const method of ["GET", "POST", "DELETE"]) {
      expect(applicationGatewayRoute(host, `${SERVICE}/v1/scopes/${encodeURIComponent(s.laptop.membership.scope)}/originals`, method)).toBe(false);
      expect(applicationGatewayRoute(host, `${SERVICE}/v1/scopes/${encodeURIComponent(s.laptop.membership.scope)}/originals/${encodeURIComponent(row.digest)}`, method)).toBe(false);
    }
  } finally { s.d.done(); }
});

test("an open copy locks only its own key", async () => {
  const s = await scene();
  try {
    // A request in flight: the row exists, and the reply has not come.
    s.wire.mode = "held";
    const arrived = new Promise<void>(resolve => { s.wire.arrived = resolve; });
    const sending = comment(s.laptop, s.lane, "Held.");
    await arrived;
    s.wire.mode = "pass";
    const rows = await openRows(s.phone);
    expect(rows).toHaveLength(1);
    const row = rows[0]!;
    const now = () => s.phone.session.now!();
    // The second key sees the line and the button. It holds no lock, and its own act lands.
    expect(lockedScopes(s.phone, rows, now()).size).toBe(0);
    expect((await checkOriginalRequest(s.phone, row.digest)).state).toBe("waiting");
    expect(s.wire.acts.filter(sent => sent.actor === s.phone.key)).toEqual([]);
    expect((await comment(s.phone, s.lane, "From the phone.")).answer.answer).toBe("accepted");
    expect(await openRows(s.phone)).toHaveLength(1);

    s.wire.release!();
    await expect(sending).rejects.toThrow();
    // A reloaded page of the first key offers only the button, until the margin passes.
    const reloaded = await openRoom(s.session(s.secrets.laptop), s.place);
    const open = await openRows(reloaded);
    expect([...lockedScopes(reloaded, open, now())]).toEqual([s.lane]);
    s.d.advanceClock(sendableAt(row.notAfter) - now() - 1000);
    const later = await openRows(await openRoom(s.session(s.secrets.laptop), s.place));
    expect([...lockedScopes(reloaded, later, now())]).toEqual([s.lane]);
    s.d.advanceClock(1000);
    expect(lockedScopes(reloaded, later, now()).size).toBe(0);
    // The lock is on one scope: the first key acts elsewhere meanwhile.
    expect(lockedScopes(reloaded, open, now()).has(s.d.D.name)).toBe(false);
  } finally { s.d.done(); }
});

test("an idle object drops a row at seven days", async () => {
  const s = await scene();
  try {
    const invited = await issueDeviceKey(s.rita, "@paul"); // A live `key-invitation-end` a day out. The row's bound is a week out.
    expect("link" in invited).toBe(true);
    const row = await lost(s, "reply-lost");
    const drop = timeMs(row.notAfter)! + 7 * 24 * 3600 * 1000;
    const now = () => s.phone.session.now!();
    const inspect = () => s.d.wait(() => runInDurableObject(s.d.M.object, async (_instance, state) => ({
      rows: state.storage.sql.exec("SELECT digest FROM original_copy").toArray().length,
      alarm: await state.storage.getAlarm(),
    })));
    const invitationState = async () => {
      const read = await s.d.wait(() => s.d.M.stub.summary(s.rita.reader!.reader()));
      if (!read.ok) return read.reason;
      return read.value.items.filter(item => item.type === "key" && item.state === "invited").length;
    };
    const fire = () => s.d.wait(() => runDurableObjectAlarm(s.d.M.object));
    // One alarm, at the earliest cause: the invitation's end, a day out, ahead of the row's bound.
    const armed = (await inspect()).alarm;
    expect(armed).not.toBeNull();
    expect(armed!).toBeLessThan(drop - 5 * 24 * 3600 * 1000);
    expect(await invitationState()).toBe(1);

    // The invitation's end fires first, and the row stays. The row's cause does not clear the other cause.
    s.d.advanceClock(25 * 3600 * 1000);
    expect(await fire()).toBe(true);
    await s.d.pause([]);
    expect((await inspect()).rows).toBe(1);
    expect(await s.d.wait(async () => { const room = await openRoom(s.session(await s.d.secretOf(s.d.rita)), s.place); const read = await handleOf(room, room.membership.scope).summary(); return read.ok ? read.value.items.filter(item => item.type === "key" && item.state === "invited").length : read.reason; })).toBe(0);

    // With no request, the alarm keeps the row before the bound and drops it past the bound. The row's own cause holds the alarm now.
    expect((await inspect()).alarm).toBe(drop);
    s.d.advanceClock(drop - now() - 1000);
    await fire();
    expect((await inspect()).rows).toBe(1);
    expect((await inspect()).alarm).not.toBeNull();
    s.d.advanceClock(2000);
    expect(await fire()).toBe(true);
    expect((await inspect()).rows).toBe(0);
  } finally { s.d.done(); }
}, 120_000);

// A page with no session keeps nothing and sends no extra request, as section 9 of the note says.
test("a page on signed reads keeps no copy", async () => {
  const room = { session: { service: SERVICE, secret: new Uint8Array(32) }, membership: { scope: "m", genesis: textDigest("TEST genesis 24") }, reader: null } as unknown as Room;
  const fetch: Fetch = () => { throw new Error("no request goes out"); };
  await expect(keepOriginal({ ...room, session: { ...room.session, fetch } }, {} as SignedIntent, {})).resolves.toBeUndefined();
});

test("a long kind keeps no row, and 64 rows fit the list's reply", async () => {
  const s = await scene();
  try {
    const fetch = s.session(s.secrets.laptop).fetch!;
    const to = (await scopeRefOf(s.laptop, s.lane)).scope;
    // One byte past the bound, and a kind that alone would pass the client's bound on a list with two rows: no row.
    for (const kind of ["k".repeat(257), "k".repeat(600 * 1024)]) expect(await keepBy(s, s.laptop, s.secrets.laptop, to, kind)).toEqual({ status: 400, reason: "bad-request" });
    expect(await rowsByMember(s)).toEqual({});
    // The longest reply: 64 rows, each with a kind of 256 control bytes, which JSON writes at six bytes each.
    for (let i = 0; i < 64; i++) expect((await keepBy(s, s.laptop, s.secrets.laptop, to, "\u0001".repeat(256))).status, `copy ${i + 1}`).toBe(204);
    const reply = await statusOf(fetch, s.laptop, "");
    expect(reply.status).toBe(200);
    const size = utf8(reply.text).length;
    expect(size).toBeGreaterThan(64 * 1536);
    expect(size).toBeLessThan(121_600 + 300); // The arithmetic in `originals.ts`, with the reply's envelope.
    expect(await openRows(s.laptop)).toHaveLength(64);
  } finally { s.d.done(); }
}, 120_000);

test("a failed read keeps the last rows and the lock", async () => {
  const s = await scene();
  try {
    const row = await lost(s, "never-arrived");
    const reloaded = await openRoom(s.session(s.secrets.laptop), s.place);
    const now = () => reloaded.session.now!();
    expect((await openRows(reloaded)).map(open => open.digest)).toEqual([row.digest]);
    expect(ORIGINALS_UNREAD).toContain("could not read your open requests");
    // A lost reply, and a refused read: each says it failed, and the rows, the lock and the button's digest stay.
    for (const down of ["list", "list-refused"] as const) {
      s.wire.down.add(down);
      const read = await openOriginals(reloaded);
      s.wire.down.delete(down);
      expect(read.failed, down).toBe(true);
      expect(read.rows.map(open => open.digest), down).toEqual([row.digest]);
      expect([...lockedScopes(reloaded, read.rows, now())], down).toEqual([s.lane]);
    }
    // The next good read ends the failure. An empty list is an empty list.
    expect((await openRows(reloaded)).map(open => open.digest)).toEqual([row.digest]);
    expect(await copiesOf(reloaded)!.end(row.digest)).toEqual({ ok: true });
    expect(await openOriginals(reloaded)).toEqual({ rows: [], failed: false });
    // A page with no earlier read has no rows to keep, and it still says the read failed.
    s.wire.down.add("list");
    expect(await openOriginals(s.rita)).toEqual({ rows: [], failed: true });
  } finally { s.d.done(); }
});

test("a full object drops the rows of a member who left or holds no key", async () => {
  const s = await scene();
  try {
    const rita = await s.d.secretOf(s.d.rita);
    const to = (await scopeRefOf(s.rita, s.lane)).scope;
    const row = await lost(s, "never-arrived");
    await fill(s, "@paul", "paul-fills-it", GIB);
    const roomFull = { status: 423, reason: "room-full" };
    expect(await keepBy(s, s.rita, rita, to)).toEqual(roomFull);
    expect(await rowsByMember(s)).toEqual({ "@paul": 1, "@una": 1 });

    // A retired key of a member with another active key keeps its rows.
    const membership = await scopeRefOf(s.rita, s.rita.membership.scope);
    const keyOf = (key: string) => membership.items.find(item => item.type === "key" && item.values["id"] === key)!;
    expect((await act(s.rita, s.rita.membership.scope, "revoke-key", { on: keyOf(s.laptop.key).id, fields: { as: "retired" } })).answer.answer).toBe("accepted");
    expect(await keepBy(s, s.rita, rita, to)).toEqual(roomFull);
    expect(await rowsByMember(s)).toEqual({ "@paul": 1, "@una": 1 });
    expect((await openRows(s.phone)).map(open => open.digest)).toEqual([row.digest]);

    // An active member with no active key: the rows go, and the keep passes.
    expect((await act(s.rita, s.rita.membership.scope, "revoke-key", { on: keyOf(s.paul.key).id, fields: { as: "retired" } })).answer.answer).toBe("accepted");
    expect((await keepBy(s, s.rita, rita, to)).status).toBe(204);
    expect(await rowsByMember(s)).toEqual({ "@rita": 1, "@una": 1 });

    // A removed member who still holds an active key: the rows go too.
    await fill(s, "@una", "una-fills-it", GIB);
    expect(await keepBy(s, s.rita, rita, to)).toEqual(roomFull);
    const member = (await scopeRefOf(s.rita, s.rita.membership.scope)).items.find(item => item.type === "member" && item.values["handle"] === "@una")!;
    expect((await act(s.rita, s.rita.membership.scope, "remove-member", { on: member.id })).answer.answer).toBe("accepted");
    expect((await keepBy(s, s.rita, rita, to)).status).toBe(204);
    expect(await rowsByMember(s)).toEqual({ "@rita": 2 });
  } finally { s.d.done(); }
}, 120_000);

test("a full object still takes a request to membership, under the member's own caps", async () => {
  const s = await scene();
  try {
    const rita = await s.d.secretOf(s.d.rita);
    const membershipRef = s.rita.membership;
    await fill(s, "@paul", "paul-fills-it", GIB);
    expect(await keepBy(s, s.rita, rita, (await scopeRefOf(s.rita, s.lane)).scope)).toEqual({ status: 423, reason: "room-full" });
    // Another genesis under the scope's name is no request to this scope.
    expect(await keepBy(s, s.rita, rita, { ...membershipRef, genesis: textDigest("TEST genesis 25") })).toEqual({ status: 423, reason: "room-full" });
    expect((await keepBy(s, s.rita, rita, membershipRef)).status).toBe(204);
    // The member's own caps still apply to a request to membership.
    for (let i = 0; i < 63; i++) await fill(s, "@rita", `rita-${i}`, 1);
    expect(await keepBy(s, s.rita, rita, membershipRef)).toEqual({ status: 507, reason: "full" });
    await s.d.wait(() => runInDurableObject(s.d.M.object, (_instance, state) => { state.storage.sql.exec("DELETE FROM original_copy WHERE member = '@rita'").toArray(); }));
    // The admin removes a member through the page while the room is full. The removal frees that member's rows.
    const member = (await scopeRefOf(s.rita, membershipRef.scope)).items.find(item => item.type === "member" && item.values["handle"] === "@paul")!;
    expect((await act(s.rita, membershipRef.scope, "remove-member", { on: member.id })).answer.answer).toBe("accepted");
    expect((await comment(s.rita, s.lane, "The room has space again.")).answer.answer).toBe("accepted");
    expect(await rowsByMember(s)).toEqual({});
  } finally { s.d.done(); }
}, 120_000);

test("a full object and a full member say different things", async () => {
  const s = await scene();
  try {
    await fill(s, "@paul", "paul-fills-it", GIB);
    const roomFull = await comment(s.laptop, s.lane, "No space.").then(() => null, (error: Error) => error);
    expect(roomFull).toBeInstanceOf(CopyNotKept);
    expect(roomFull?.message).toBe("This room has no space for more open requests. This press sent nothing. Space returns as open requests end, within seven days at most. An admin can still remove a member who has left, and that frees the member's requests.");
    expect(s.wire.acts).toEqual([]);
    await s.d.wait(() => runInDurableObject(s.d.M.object, (_instance, state) => { state.storage.sql.exec("DELETE FROM original_copy").toArray(); }));
    for (let i = 0; i < 64; i++) await fill(s, "@una", `una-${i}`, 1);
    const mine = await comment(s.laptop, s.lane, "Too many.").then(() => null, (error: Error) => error);
    expect(mine).toBeInstanceOf(CopyNotKept);
    expect(mine?.message).toBe("You have too many open requests. This press sent nothing. Check the open requests in this room first.");
    expect(s.wire.acts).toEqual([]);
  } finally { s.d.done(); }
}, 120_000);

test("a full object frees a bounded quantum at each keep", async () => {
  const s = await scene();
  try {
    const rita = await s.d.secretOf(s.d.rita);
    const to = (await scopeRefOf(s.rita, s.lane)).scope;
    const keep = () => keepBy(s, s.rita, rita, to);
    const ended = async () => { for (const row of await openRows(s.rita)) await copiesOf(s.rita)!.end(row.digest); };
    // One member's rows: at most 64 at one keep.
    for (let i = 0; i < 70; i++) await fill(s, "@gone", `gone-${i}`, GIB);
    expect((await keep()).status).toBe(423);
    expect(await rowsByMember(s)).toEqual({ "@gone": 6 });
    expect((await keep()).status).toBe(204);
    expect(await rowsByMember(s)).toEqual({ "@rita": 1 });
    await ended();
    // Many members: at most 16 at one keep, and the next keep continues past them.
    for (let i = 0; i < 20; i++) await fill(s, `@gone-${String(i).padStart(2, "0")}`, `one-${i}`, GIB);
    expect((await keep()).status).toBe(423);
    expect(Object.keys(await rowsByMember(s))).toEqual(["@gone-16", "@gone-17", "@gone-18", "@gone-19"]);
    await fill(s, "@gone-00", "behind", GIB); // Behind the sweep: this keep goes on from where the last one stopped.
    expect((await keep()).status).toBe(423);
    expect(await rowsByMember(s)).toEqual({ "@gone-00": 1 });
    expect((await keep()).status).toBe(204);
    expect(await rowsByMember(s)).toEqual({ "@rita": 1 });
  } finally { s.d.done(); }
}, 120_000);

test("a stop around the keep leaves no row", async () => {
  const s = await scene();
  try {
    const changed = () => { throw new Error("The room or key changed before submission. This press sent nothing."); };
    const sendStopped = (room: Room, scope: ScopeId, kind: string, asked: Parameters<typeof act>[3], submitting?: () => void, stopping?: () => void) => expect(act(room, scope, kind, asked, undefined, submitting, stopping)).rejects.toThrow("This press sent nothing");
    const body = { fields: { body: "Stopped." } };
    // Before the keep: no request to the copy routes, and no act.
    await sendStopped(s.laptop, s.lane, "comment", body, undefined, changed);
    expect(s.wire.order).toEqual([]);
    // After the keep: the row ends, and no act goes.
    await sendStopped(s.laptop, s.lane, "comment", body, changed);
    expect(s.wire.order).toEqual(["GET originals", "POST originals", "DELETE originals"]);
    expect(await openRows(s.laptop)).toEqual([]);
    // The page's other way to send: a native act.
    s.wire.order.length = 0;
    const member = (await scopeRefOf(s.rita, s.rita.membership.scope)).items.find(item => item.type === "member" && item.values["handle"] === "@paul")!;
    await sendStopped(s.rita, s.rita.membership.scope, "remove-member", { on: member.id }, undefined, changed);
    expect(s.wire.order).toEqual([]);
    await sendStopped(s.rita, s.rita.membership.scope, "remove-member", { on: member.id }, changed);
    expect(s.wire.order).toEqual(["GET originals", "POST originals", "DELETE originals"]);
    expect(await openRows(s.rita)).toEqual([]);
    expect(s.wire.acts).toEqual([]);
    // A row that the page could not end: the words say so, and the row shows as open.
    s.wire.down.add("end");
    const unended = await act(s.laptop, s.lane, "comment", body, undefined, changed).then(() => null, (error: Error) => error);
    expect(unended?.message).toContain("This page could not end its copy");
    s.wire.down.delete("end");
    expect(await openRows(s.laptop)).toHaveLength(1);
    expect(s.wire.acts).toEqual([]);
  } finally { s.d.done(); }
});

test("a page that held a session and failed to renew it stops the send", async () => {
  const s = await scene();
  try {
    s.wire.down.add("sessions");
    s.d.advanceClock(601_000); // The laptop's session ends. Its renewal gets no reply.
    const stopped = await comment(s.laptop, s.lane, "No copy, no send.").then(() => null, (error: Error) => error);
    expect(stopped).toBeInstanceOf(CopyNotKept);
    expect(stopped?.message).toBe("This page could not renew its session with the room, so it cannot keep a copy of this request. This press sent nothing. When your connection returns, open this view again and check your open requests before you send it again.");
    expect(s.laptop.reader).toBeNull();
    expect(s.wire.acts).toEqual([]);
    // It stays stopped on the next try, and the read says that it failed.
    await expect(comment(s.laptop, s.lane, "No copy, no send.")).rejects.toBeInstanceOf(CopyNotKept);
    expect(s.wire.acts).toEqual([]);
    expect((await openOriginals(s.laptop)).failed).toBe(true);

    // A page that opens with no session keeps today's behaviour: no copy, and the act goes. This module has held a session under each
    // key of the scene, and a new page load forgets that. So a key that this module never held stands in for that page's memory.
    s.wire.order.length = 0;
    const signedReads: Room = { ...await openRoom(s.session(s.secrets.laptop), s.place), key: secretSigner(crypto.getRandomValues(new Uint8Array(32))).key };
    expect(signedReads.reader).toBeNull();
    const sentOnSignedReads = await comment(signedReads, s.lane, "On signed reads.").then(acted => acted.answer.answer, (error: Error) => error.name);
    expect(sentOnSignedReads).toBe("accepted");
    expect(s.wire.order).toEqual(["POST acts"]);
    expect(await openOriginals(signedReads)).toEqual({ rows: [], failed: false });

    // The connection comes back: the next send renews the session, keeps its copy and goes.
    s.wire.down.delete("sessions");
    s.wire.order.length = 0;
    const sentAgain = await comment(s.laptop, s.lane, "Back again.").then(acted => acted.answer.answer, (error: Error) => error.name);
    expect(sentAgain).toBe("accepted");
    expect(s.laptop.reader).not.toBeNull();
    expect(s.wire.order).toEqual(["GET originals", "POST originals", "POST acts", "DELETE originals"]);
  } finally { s.d.done(); }
});

test("a press after a reload in an outage speaks of the press, and its next step finds the earlier send", async () => {
  const s = await scene();
  try {
    // The earlier press: its reply is lost, and its row stands. No list read has run, so `lastRead` holds nothing, as after a reload.
    s.wire.mode = "reply-lost";
    await expect(comment(s.laptop, s.lane, "The earlier press.")).rejects.toThrow();
    s.wire.mode = "pass";
    expect(s.wire.acts).toHaveLength(1);
    // The reload: a working session, a failed list read, and so no lock. `send` tests the lock that this read stored.
    const reloaded = await openRoom(s.session(s.secrets.laptop), s.place);
    expect(reloaded.reader).not.toBeNull();
    s.wire.down.add("list");
    const unread = await openOriginals(reloaded);
    expect(unread).toEqual({ rows: [], failed: true });
    expect(lockedScopes(reloaded, unread.rows, reloaded.session.now!()).size).toBe(0);
    // The session is then lost, and the next press reaches the stop with an earlier send of unknown outcome.
    s.wire.down.add("sessions");
    s.d.advanceClock(601_000);
    const stopped = await comment(reloaded, s.lane, "The next press.").then(() => null, (error: Error) => error);
    expect(stopped?.message).toBe("This page could not renew its session with the room, so it cannot keep a copy of this request. This press sent nothing. When your connection returns, open this view again and check your open requests before you send it again.");
    expect(s.wire.acts).toHaveLength(1);
    // The step that those words name: the route returns, the view opens, and the read finds the row. The session outlives the earlier
    // request's margin, so no lock stands by then. The row stays, and its check finds the entry that a second press would repeat.
    s.wire.down.clear();
    const opened = await openOriginals(reloaded);
    expect(opened.failed).toBe(false);
    expect(opened.rows).toHaveLength(1);
    expect(lockedScopes(reloaded, opened.rows, reloaded.session.now!()).size).toBe(0);
    expect((await checkOriginalRequest(reloaded, opened.rows[0]!.digest)).state).toBe("landed");
  } finally { s.d.done(); }
});

// Invariant: a press reads the member's open requests before it keeps. A failed read stops the press, and a row of this key at this scope stops it.
// The earlier press signed its own request, so a second press with the same words signs another request under a new key. Only this read can stop it.
const READ_STOP = "This page could not read your open requests, so it cannot tell whether an earlier request here has an answer. This press sent nothing. Press again when your connection returns. The next press reads them first.";
const READ_REFUSED = READ_STOP.replace("your open requests,", "your open requests (unavailable),");
const LOCK_STOP = "An earlier request from this device here has no answer yet. This press sent nothing. Press Check original request for it before you send this again.";
const UNSHOWN_STOP = "An earlier request from this device here has no answer, and this page had not shown it until now. This press sent nothing. Press Check original request for it before you send this again.";
const WORDS = "It is in README.md.";
/** A press with a lost reply, then a reload whose list read fails. No list read has run in this load, so the page holds no rows and no lock. */
async function reloadInOutage(s: Scene): Promise<Room> {
  s.wire.mode = "reply-lost";
  await expect(comment(s.laptop, s.lane, WORDS)).rejects.toThrow();
  s.wire.mode = "pass";
  expect(s.wire.acts).toHaveLength(1);
  const reloaded = await openRoom(s.session(s.secrets.laptop), s.place);
  expect(reloaded.reader).not.toBeNull();
  s.wire.down.add("list");
  const read = await openOriginals(reloaded);
  expect(read).toEqual({ rows: [], failed: true });
  expect(lockedScopes(reloaded, read.rows, reloaded.session.now!()).size).toBe(0);
  s.wire.down.clear();
  s.wire.order.length = 0;
  return reloaded;
}
const stopOf = (room: Room, lane: ScopeId, body: string) => comment(room, lane, body).then(() => "no stop", (error: Error) => { expect(error).toBeInstanceOf(CopyNotKept); return error.message; });
const bodies = async (s: Scene) => (await loadIssue(s.phone, s.lane)).comments.map(c => c.body);
/** What a press came to: the scope's answer, or the words of a stop. */
const pressed = (sending: ReturnType<typeof act>) => sending.then(acted => acted.answer.answer as string, (error: Error) => error.message);

test("a press after a failed list read cannot make a second entry", async () => {
  const s = await scene();
  try {
    const reloaded = await reloadInOutage(s);
    expect(await bodies(s)).toEqual([WORDS]); // The earlier press landed, and the person cannot see that.
    // The read stays down and the keep works: a lost reply, then a refused read.
    s.wire.down.add("list");
    expect(await stopOf(reloaded, s.lane, WORDS)).toBe(READ_STOP);
    s.wire.down.clear(); s.wire.down.add("list-refused");
    expect(await stopOf(reloaded, s.lane, WORDS)).toBe(READ_REFUSED);
    expect(s.wire.order).toEqual(["GET originals", "GET originals"]); // No keep, and no act.
    expect(s.wire.acts).toHaveLength(1);
    expect((await openOriginals(reloaded)).failed).toBe(true);
    expect(ORIGINALS_UNREAD).toBe("This page could not read your open requests, so it shows the ones it read last. Check your connection. Each new request reads them first, and it goes only when that read works. The page reads them again each time a view opens.");
    // The route returns, with the view still open and no new draw. The press reads the row, and it stops.
    s.wire.down.clear(); s.wire.order.length = 0;
    expect(await stopOf(reloaded, s.lane, WORDS)).toBe(LOCK_STOP);
    expect(s.wire.order).toEqual(["GET originals"]);
    expect(s.wire.acts).toHaveLength(1);
    expect(await bodies(s)).toEqual([WORDS]);
    // The way forward: the next draw shows the row, the button finds the entry, and a press then goes.
    const shown = await openRows(reloaded);
    expect(await checkOriginalRequest(reloaded, shown[0]!.digest)).toMatchObject({ state: "landed" });
    expect(await pressed(comment(reloaded, s.lane, "A new comment."))).toBe("accepted");
    expect(await bodies(s)).toEqual([WORDS, "A new comment."]);
  } finally { s.d.done(); }
});

test("an outage that outlasts the margin shows the row before a press goes", async () => {
  const s = await scene();
  try {
    const reloaded = await reloadInOutage(s);
    const row = (await openRows(s.phone))[0]!;
    // The margin has passed, the session still holds, and no draw has shown the row to this page.
    const now = () => reloaded.session.now!();
    s.d.advanceClock(sendableAt(row.notAfter) - now());
    expect(lockedScopes(reloaded, [row], now()).size).toBe(0);
    expect(await stopOf(reloaded, s.lane, WORDS)).toBe(UNSHOWN_STOP);
    expect(s.wire.acts).toHaveLength(1);
    expect(await bodies(s)).toEqual([WORDS]);
    // A draw shows the line. A later press with the line in view is the person's choice, as section 5 of the note says.
    expect((await openRows(reloaded)).map(open => open.digest)).toEqual([row.digest]);
    expect(await pressed(comment(reloaded, s.lane, WORDS))).toBe("accepted");
    expect(await bodies(s)).toEqual([WORDS, WORDS]);
    expect((await openRows(reloaded)).map(open => open.digest)).toEqual([row.digest]);
  } finally { s.d.done(); }
});

test("a good read stops a press only at this key's own scope", async () => {
  const s = await scene();
  try {
    const reloaded = await reloadInOutage(s);
    // Another scope: this key opens an issue with the row open at the lane. Another key: the second device comments on the same lane.
    expect(await pressed(act(reloaded, s.d.D.name, "open-issue", { fields: { definition: DEMO_DIGESTS.issue, title: "Elsewhere", conditions: ["Nothing"] } }))).toBe("accepted");
    expect(await pressed(comment(s.phone, s.lane, "From the phone."))).toBe("accepted");
    expect(s.wire.order.filter(name => name === "POST acts")).toHaveLength(2);
    // A failed read stops every key at every scope: it cannot say what the list holds.
    s.wire.down.add("list");
    expect(await stopOf(s.phone, s.lane, "Also from the phone.")).toBe(READ_STOP);
  } finally { s.d.done(); }
});

test("an opening act's row stops the next opening act of that key", async () => {
  const s = await scene();
  try {
    const opening = (room: Room, title: string) => act(room, s.d.D.name, "open-issue", { fields: { definition: DEMO_DIGESTS.issue, title, conditions: ["Nothing"] } });
    s.wire.mode = "reply-lost";
    await expect(opening(s.laptop, "Lost")).rejects.toThrow();
    s.wire.mode = "pass";
    const reloaded = await openRoom(s.session(s.secrets.laptop), s.place);
    const stopped = await opening(reloaded, "Lost").then(() => "no stop", (error: Error) => error.message);
    expect(stopped).toBe(LOCK_STOP);
    expect(s.wire.acts).toHaveLength(1);
  } finally { s.d.done(); }
});

test("a device link meets the same read and the same lock", async () => {
  const s = await scene();
  try {
    const link = () => issueDeviceKey(s.rita, "@paul").then(() => "a link", (error: Error) => error.message);
    s.wire.down.add("list");
    expect(await link()).toBe(READ_STOP);
    s.wire.down.clear();
    expect(s.wire.acts).toEqual([]);
    s.wire.mode = "reply-lost";
    expect(await link()).not.toBe("a link");
    s.wire.mode = "pass";
    expect(await link()).toBe(LOCK_STOP);
    expect(s.wire.acts).toHaveLength(1);
  } finally { s.d.done(); }
});

test("a keep that stops speaks of this press", async () => {
  const s = await scene();
  try {
    const stop = (body: string) => comment(s.laptop, s.lane, body).then(() => "no stop", (error: Error) => error.message);
    s.wire.down.add("keep-refused");
    expect(await stop("Refused.")).toBe("The room did not keep a copy of this request (conflict). This press sent nothing.");
    s.wire.down.clear();
    s.wire.down.add("keep");
    expect(await stop("No reply.")).toBe("The room gave no reply when it was asked to keep a copy of this request. This press sent nothing.");
    s.wire.down.add("end");
    expect(await stop("No reply, and no end.")).toBe("The room gave no reply when it was asked to keep a copy of this request. This press sent nothing. This page could not end its copy, so the request can show as open. Press Check original request before you send it again.");
    expect(s.wire.acts).toEqual([]);
  } finally { s.d.done(); }
});

test("an answer lifts only this page's own fence", async () => {
  const s = await scene();
  try {
    const row = await lost(s, "reply-lost");
    const own = actAssociation(s.laptop, s.lane);
    const landed = await checkOriginalRequest(s.phone, row.digest);
    expect(landed.state).toBe("landed");
    expect(settledAssociations(s.phone, row, landed)).toEqual([]);
    expect(settledAssociations(s.laptop, row, landed)).toEqual([own]);
    expect(settledAssociations(s.laptop, row, { state: "refused", reason: "expired" })).toEqual([own]);
    // A missing row shows nothing, and `mismatch` and `archived` are fences on the send path too.
    for (const state of ["gone", "mismatch", "archived", "waiting", "unknown", "unverified"] as const) expect(settledAssociations(s.laptop, row, { state, reason: "x", until: 0 } as never), state).toEqual([]);
    // An opening act goes to the directory reference that the page holds, where the page's panel keeps its fence.
    const opening = { ...row, to: s.laptop.directoryIndex!.scope };
    const directory = actAssociation(s.laptop, s.laptop.directory);
    expect(settledAssociations(s.laptop, opening, landed)).toEqual([directory, directory]);
  } finally { s.d.done(); }
});

test("a page that clears its opened rooms still stops the send", async () => {
  const s = await scene();
  try {
    // The page held a session under this service, membership and key. `opened.clear()` makes a new `Session` at the next open.
    s.wire.down.add("sessions");
    const reopened = await openRoom(s.session(s.secrets.laptop), s.place);
    expect(reopened.reader).toBeNull();
    const stopped = await comment(reopened, s.lane, "No copy, no send.").then(() => null, (error: Error) => error);
    expect(stopped).toBeInstanceOf(CopyNotKept);
    expect(s.wire.acts).toEqual([]);
    expect((await openOriginals(reopened)).failed).toBe(true);
    // Another key's memory is its own: a key that this page never held a session under has lost nothing, and the phone's page still holds its session.
    expect(sessionLost({ ...reopened, key: secretSigner(crypto.getRandomValues(new Uint8Array(32))).key })).toBe(false);
    expect(s.phone.reader).not.toBeNull();
    expect((await comment(s.phone, s.lane, "From the phone.")).answer.answer).toBe("accepted");
  } finally { s.d.done(); }
});

test("an older row lifts no newer request's fence", async () => {
  const s = await scene();
  try {
    // The digest that the send hands over, and the digest of its answer, are the row's digest.
    let handed = "";
    s.wire.mode = "reply-lost";
    const lostSend = await act(s.laptop, s.lane, "comment", { fields: { body: "Older." } }, undefined, digest => { handed = digest; }).then(() => null, (error: Error) => error);
    expect(lostSend).not.toBeNull();
    s.wire.mode = "pass";
    const older = (await openRows(s.laptop))[0]!;
    expect(handed).toBe(older.digest);
    const landed = await checkOriginalRequest(s.laptop, older.digest);
    expect(landed.state).toBe("landed");
    const answered = await comment(s.laptop, s.lane, "Newer.");
    const sentBody = JSON.parse(s.wire.acts.at(-1)!.body) as { signed: SignedIntent };
    expect(answered.digest).toBe(intentDigest(sentBody.signed.intent));

    const own = actAssociation(s.laptop, s.lane);
    const fences = (digest: string) => {
      const sending = new ScopeSending();
      sending.begin(own, "comment");
      sending.submitting(own, digest);
      sending.failed(own);
      return { lastActs: new Map([[own, { ...answered, digest } as typeof answered]]), sending };
    };
    // A press on the older row, with the page's fences on a newer request: both stay.
    const newer = fences(answered.digest);
    liftFences(s.laptop, older, landed, newer.lastActs, newer.sending);
    expect(newer.lastActs.has(own)).toBe(true);
    expect(newer.sending.get(own)?.state).toBe("unknown");
    // A press on the row of the fences' own request: both lift.
    const same = fences(older.digest);
    liftFences(s.laptop, older, landed, same.lastActs, same.sending);
    expect(same.lastActs.has(own)).toBe(false);
    expect(same.sending.get(own)).toBeUndefined();
  } finally { s.d.done(); }
});
