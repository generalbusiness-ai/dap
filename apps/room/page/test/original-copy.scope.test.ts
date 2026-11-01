import { expect, test } from "vitest";
import { runDurableObjectAlarm, runInDurableObject } from "cloudflare:test";
import type { ScopeId, SignedIntent } from "@generalbusiness/dap-contract";
import { b64url, canonicalBytes, canonicalize, parseStrict, timeMs, utf8 } from "@generalbusiness/dap-bytes";
import { DEMO_DIGESTS } from "@generalbusiness/dap-lanes";
import { actBodyText, originalRequest, requestSession, secretSigner, sendableAt, signedIntent, signedRead, signerSessionRequest, type Fetch, type OriginalRow, type Signer } from "@generalbusiness/dap-client";
import { applicationGatewayRoute } from "../../../../packages/client/src/application-gateway.ts";
import { CopyNotKept, act, copiesOf, handleOf, issueDeviceKey, joinRoom, keepOriginal, listLanes, loadIssue, openRoom, placeOf, prepareJoin, submitJoin, type Room, type Session } from "../src/data.ts";
import { checkOriginalRequest, lockedScopes, openOriginals, originalLine } from "../src/original-check.ts";
import { SERVICE, demo, type Demo } from "./support/demo.ts";

// Invariant: a copy of a request stays where another key of one member reaches it. That key settles the request with no signature,
// and a copy can finish only the act that its signer asked for. notes/2026-10-31-signed-requests-across-devices.md, section 8.
//
// The room is `support/demo.ts`: real scopes, the Worker's routes, real read sessions under a TEST SECRET, and the scripted clock of
// the namespaces. The network between the page and the routes is a STAND-IN: `wire` loses a reply, or drops a request, as a device
// losing its connection does. No DOM: the two-context witness (`two-devices.mjs`) runs the page.

type Mode = "pass" | "reply-lost" | "never-arrived" | "held";
interface Wire { mode: Mode; acts: { actor: string; body: string; arrived: boolean }[]; copies: { method: string; path: string }[]; order: string[]; release?: () => void; arrived?: () => void }
const wireOf = (): Wire => ({ mode: "pass", acts: [], copies: [], order: [] });
const ACTS = /\/v1\/scopes\/[^/]+\/acts$/;
const COPIES = /\/v1\/scopes\/[^/]+\/originals(\/.*)?$/;

/** The stand-in network. It counts each act's request, and each request to the copy routes. */
const wrapOf = (wire: Wire) => (inner: Fetch): Fetch => async (url, init) => {
  const method = init?.method ?? "GET", path = new URL(url).pathname;
  if (COPIES.test(path)) { wire.copies.push({ method, path }); wire.order.push(`${method} originals`); }
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
/** Sends the act with the wire in `mode`, and returns the copy's row. The page sees a lost reply. */
async function lost(s: Scene, mode: Mode, body = "It is in README.md."): Promise<OriginalRow> {
  s.wire.mode = mode;
  await expect(comment(s.laptop, s.lane, body)).rejects.toThrow();
  s.wire.mode = "pass";
  const rows = await openOriginals(s.phone);
  expect(rows).toHaveLength(1);
  return rows[0]!;
}

test("a second key of one member settles a lost reply", async () => {
  const s = await scene();
  try {
    const row = await lost(s, "reply-lost");
    // The page keeps the copy before it sends the act.
    expect(s.wire.order.slice(0, 2)).toEqual(["POST originals", "POST acts"]);
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
    expect(await openOriginals(s.phone)).toEqual([]);
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
    expect(await openOriginals(s.phone)).toEqual([]);
    const signed = (JSON.parse(firstBody) as { signed: SignedIntent }).signed;
    expect(await entriesUnder(s.phone, s.lane, signed.intent.idempotencyKey)).toEqual([]);
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
      expect((await openOriginals(other))).toEqual([]);
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
    expect((await openOriginals(s.phone)).map(open => open.digest)).toEqual([row.digest]);
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

    // A session cannot make or change a copy: it can keep only what its own key signed, and only with a good signature.
    expect((await statusOf(fetch, s.paul, "", "POST", secondRead.bytes)).status).toBe(403);
    expect((await statusOf(fetch, s.phone, "", "POST", secondRead.bytes)).status).toBe(403);
    expect((await statusOf(fetch, s.laptop, "", "POST", "{}")).status).toBe(400);
    expect((await statusOf(fetch, s.laptop, "", "POST", actBodyText(secondRequest.signed, altered))).status).toBe(409);
    expect((await copiesOf(s.phone)!.read(second.digest))).toEqual({ ok: true, bytes: secondRead.bytes });

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
    // The page sends nothing, and it says so.
    const stopped = await comment(s.laptop, s.lane, "One too many.").then(() => null, (error: Error) => error);
    expect(stopped).toBeInstanceOf(CopyNotKept);
    expect(stopped?.message).toContain("Nothing was sent");
    expect(s.wire.acts).toEqual([]);
    expect(await openOriginals(s.laptop)).toHaveLength(64);
    // Another member keeps their own cap.
    expect((await comment(s.paul, s.lane, "Mine goes.")).answer.answer).toBe("accepted");
    const lots = await openOriginals(s.laptop);

    // The member's bytes: 16 MiB. A row states a 1 MiB body at most.
    for (const row of lots) expect((await copiesOf(s.laptop)!.end(row.digest)).ok).toBe(true);
    const text = "x".repeat(1024 * 1024 - 4096);
    for (let i = 0; i < 16; i++) expect((await keepOne(100 + i, { texts: [text] })).status, `large copy ${i + 1}`).toBe(204);
    const overBytes = await keepOne(116, { texts: [text, text.slice(0, 200 * 1024)] });
    expect(overBytes.status).toBe(400); // Over the route's own bound for one body.
    const fullBytes = await keepOne(117, { texts: [text] });
    expect(fullBytes.status).toBe(507);
    expect(JSON.parse(fullBytes.text).reason).toBe("full");
    for (const row of await openOriginals(s.laptop)) expect((await copiesOf(s.laptop)!.end(row.digest)).ok).toBe(true);

    // The object's bytes: 1 GiB, across members. A row outside this member fills it.
    await s.d.wait(() => runInDurableObject(s.d.M.object, (_instance, state) => {
      state.storage.sql.exec("INSERT INTO original_copy (digest, inc, member, actor, target, kind, item, not_after, drop_ms, size, bytes) VALUES ('filler', ?, '@other', 'k', '{}', 'k', NULL, 'never', ?, ?, '')", s.laptop.membership.inc, now + 8 * 24 * 3600 * 1000, 1024 * 1024 * 1024);
    }));
    const overObject = await keepOne(200);
    expect(overObject.status).toBe(507);
    expect(JSON.parse(overObject.text).reason).toBe("full");
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
    const rows = await openOriginals(s.phone);
    expect(rows).toHaveLength(1);
    const row = rows[0]!;
    const now = () => s.phone.session.now!();
    // The second key sees the line and the button. It holds no lock, and its own act lands.
    expect(lockedScopes(s.phone, rows, now()).size).toBe(0);
    expect((await checkOriginalRequest(s.phone, row.digest)).state).toBe("waiting");
    expect(s.wire.acts.filter(sent => sent.actor === s.phone.key)).toEqual([]);
    expect((await comment(s.phone, s.lane, "From the phone.")).answer.answer).toBe("accepted");
    expect(await openOriginals(s.phone)).toHaveLength(1);

    s.wire.release!();
    await expect(sending).rejects.toThrow();
    // A reloaded page of the first key offers only the button, until the margin passes.
    const reloaded = await openRoom(s.session(s.secrets.laptop), s.place);
    const open = await openOriginals(reloaded);
    expect([...lockedScopes(reloaded, open, now())]).toEqual([s.lane]);
    s.d.advanceClock(sendableAt(row.notAfter) - now() - 1000);
    const later = await openOriginals(await openRoom(s.session(s.secrets.laptop), s.place));
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
  const room = { session: { service: SERVICE, secret: new Uint8Array(32) }, membership: { scope: "m", inc: "i", kind: "membership" }, reader: null } as unknown as Room;
  const fetch: Fetch = () => { throw new Error("no request goes out"); };
  await expect(keepOriginal({ ...room, session: { ...room.session, fetch } }, {} as SignedIntent, {})).resolves.toBeUndefined();
});
