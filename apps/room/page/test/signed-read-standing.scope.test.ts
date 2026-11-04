import { expect, test } from "vitest";
import { runInDurableObject } from "cloudflare:test";
import type { Entry, Item, KeyId, PlatformDefinition, Read, ScopeId, SignedIntent } from "@generalbusiness/dap-contract";
import { b64url, canonicalize, textDigest, timeMs, timeOf } from "@generalbusiness/dap-bytes";
import { DEMO_DIGESTS } from "@generalbusiness/dap-lanes";
import { platform } from "@generalbusiness/dap-platform";
import { ScopeHandle, httpTransport, requestSession, invitationIssueFields, secretSigner, signedIntent, signedReader, signedReads, signerSessionRequest, type Fetch } from "@generalbusiness/dap-client";
import { beginSessionChild } from "../../../../packages/scope/test/session-settings.ts";
import { act, fresh, handleOf, issueDeviceKey, joinRoom, listLanes, loadRules, openRoom, placeOf, prepareJoin, roomInitialization, submitJoin, type Room, type Session } from "../src/data.ts";
import { SERVICE, demo, type Demo } from "./support/demo.ts";

// Invariant: a scope answers a signed read of its summary only to a key that signed an entry of that scope within the intent window, or
// that signed the root of its genesis's cause chain within it. So time after enrolment, a settled delivery, the key's standing in
// membership and the member's other keys do not decide the read of the directory. Planner decision 61cc5e50: "A key that signed nothing
// in the scope gets forbidden as now." After the window "a session is required".
//
// The room is `support/demo.ts`: real scopes, the Worker's routes, real read sessions under a TEST SECRET, and the scripted clock of the
// namespaces. A deployment with no session secret is that fixture's own setting, `secret: null`, as the page's story has it. The wire
// between the page and the routes is a STAND-IN: it loses or refuses a session request, or loses an act's request, as stated in each case.

const WINDOW_MS = 900_000;
const ACTS = /\/v1\/scopes\/[^/]+\/acts$/;

type Line = "lost" | "rate-limited" | null;
interface Wire { sessions: Line; dropActs: boolean; dropped: string[] }
const wrapOf = (wire: Wire) => (inner: Fetch): Fetch => async (url, init) => {
  const path = new URL(url).pathname;
  if (wire.sessions === "lost" && path.endsWith("/sessions")) throw new Error("no reply to the session request");
  if (wire.sessions === "rate-limited" && path.endsWith("/sessions")) return new Response(JSON.stringify({ ok: false, reason: "rate-limited" }), { status: 429, headers: { "retry-after": "60" } }) as never;
  if (wire.dropActs && init?.method === "POST" && ACTS.test(path)) { wire.dropped.push(init.body as string); throw new Error("the request never arrived"); }
  return inner(url, init);
};

const secretOf = () => crypto.getRandomValues(new Uint8Array(32));
const placeIn = (d: Demo) => placeOf(JSON.stringify(d.config))!;

/** One signed read of a summary, by that session's key: "ok", or the scope's refusal. */
const signedSummary = async (session: Session, scope: ScopeId): Promise<string> => {
  const read = await handleOf({ session, reader: null }, scope).summary();
  return read.ok ? "ok" : read.reason;
};
/** What the page's open answers: who the room says the key is, or the words the page shows. */
const opening = (session: Session, d: Demo): Promise<string> =>
  openRoom(session, placeIn(d)).then((room) => `opened as ${room.me?.handle ?? "nobody"}, ${room.reader ? "with" : "with no"} session`, (error: Error) => error.message);
/** Work on a deployment with no session secret. Each session of `as` gets `sessions-unavailable` from membership. */
const withNoSessions = async <T>(d: Demo, work: (as: (secret: Uint8Array) => Session) => Promise<T>): Promise<T> => {
  const off = beginSessionChild(d.sessionOwner, { secret: null });
  try { return await work((secret) => d.as(secret, off)); } finally { off.close(); }
};
const sentence = (d: Demo) => `Cannot read ${d.D.name}: forbidden.`;
const fileIssue = (room: Room, d: Demo) => act(room, d.D.name, "open-issue", { fields: { definition: DEMO_DIGESTS.issue, title: "The handbook is empty", conditions: ["README.md says what the room is for"] } });
const headOf = async (room: Room, scope: ScopeId): Promise<number> => {
  const read = await handleOf(room, scope).summary();
  if (!read.ok) expect.fail(`no head: ${read.reason}`);
  return read.at.seq;
};
/** Enrols a second key of @una by the `device-key` invitation that `rita` issues. */
const secondKey = (d: Demo, rita: Room): Promise<Uint8Array> => secondKeyOf(d, rita, "@una");
const secondKeyOf = async (d: Demo, rita: Room, handle: string): Promise<Uint8Array> => {
  const issued = await issueDeviceKey(rita, handle);
  if (!("link" in issued)) expect.fail(`no device link: ${JSON.stringify(issued)}`);
  const secret = secretOf(), joining = d.as(secret);
  expect((await submitJoin(joining, await prepareJoin(joining, issued.link))).answer).toBe("accepted");
  return secret;
};
/** The key's live row of the roster. A revoked key's row is final, and a summary lists no final row. */
const liveKey = async (room: Room, key: KeyId): Promise<Item | undefined> => {
  const read = await handleOf(room, room.membership.scope).summary();
  if (!read.ok) expect.fail(`no roster: ${read.reason}`);
  return read.value.items.find((candidate) => candidate.type === "key" && candidate.values["id"] === key);
};

test("a newly enrolled key reads membership, where it signed, and not the directory: no delivery reaches the directory, and time only ends the read it has", async () => {
  const d = await demo();
  try {
    const una = secretOf(), stranger = secretOf();
    const rita = await openRoom(d.as(await d.secretOf(d.rita)), placeIn(d));
    const before = await headOf(rita, d.D.name);
    expect((await joinRoom(d.as(una), d.link)).answer.answer).toBe("accepted");
    await d.pause([d.D.name, d.M.name]);
    // The join writes at membership and tells the directory nothing, so there is no delivery to wait for.
    expect(await headOf(rita, d.D.name)).toBe(before);
    expect(await opening(d.as(una), d)).toBe("opened as @una, with session");

    const rows: string[][] = [];
    const observe = async (when: string) => {
      rows.push(await withNoSessions(d, async (as) => [when, await signedSummary(as(una), d.M.name), await signedSummary(as(una), d.D.name), await signedSummary(as(stranger), d.D.name)]));
    };
    await observe("at once");
    await d.pause([d.D.name, d.M.name]);
    await observe("after a pause");
    d.advanceClock(1_000);
    await observe("1 s");
    d.advanceClock(60_000);
    await observe("61 s");
    d.advanceClock(WINDOW_MS - 61_000 - 1_000);
    await observe("899 s");
    d.advanceClock(2_000);
    await observe("901 s");
    // Each row: when; una at membership; una at the directory; a stranger at the directory.
    expect(rows).toEqual([
      ["at once", "ok", "forbidden", "forbidden"],
      ["after a pause", "ok", "forbidden", "forbidden"],
      ["1 s", "ok", "forbidden", "forbidden"],
      ["61 s", "ok", "forbidden", "forbidden"],
      ["899 s", "ok", "forbidden", "forbidden"],
      ["901 s", "forbidden", "forbidden", "forbidden"],
    ]);
    expect(await withNoSessions(d, (as) => opening(as(una), d))).toBe(sentence(d));
  } finally { d.done(); }
});

test.each(["retired", "compromised"])("one member's two active keys differ by what each signed at the directory; a key revoked as %s keeps the read and the window ends it, for the founder too", async (how) => {
  const d = await demo();
  try {
    const laptop = secretOf(), ritas = await d.secretOf(d.rita);
    expect((await joinRoom(d.as(laptop), d.link)).answer.answer).toBe("accepted");
    const rita = await openRoom(d.as(ritas), placeIn(d));
    expect((await fileIssue(await openRoom(d.as(laptop), placeIn(d)), d)).answer.answer).toBe("accepted");
    await d.pause([d.D.name, d.M.name]);
    const phone = await secondKey(d, rita);
    await d.pause([d.D.name, d.M.name]);

    // Both keys are active keys of @una. The laptop signed `open-issue` at the directory, and the phone signed nothing there.
    const [laptopRow, phoneRow] = [await liveKey(rita, secretSigner(laptop).key), await liveKey(rita, secretSigner(phone).key)];
    expect([laptopRow?.state, phoneRow?.state]).toEqual(["active", "active"]);
    expect(laptopRow?.refs["member"]).toEqual(phoneRow?.refs["member"]);
    await withNoSessions(d, async (as) => {
      expect(await signedSummary(as(laptop), d.D.name)).toBe("ok");
      expect(await signedSummary(as(phone), d.D.name)).toBe("forbidden");
      expect(await opening(as(laptop), d)).toBe("opened as @una, with no session");
      expect(await opening(as(phone), d)).toBe(sentence(d));
      expect(await opening(as(ritas), d)).toBe("opened as @rita, with no session");
      // What the key that opens gets: the directory's index, and no rules scope, where it signed nothing.
      const opened = await openRoom(as(laptop), placeIn(d));
      expect((await listLanes(opened)).issues.map((issue) => issue.title)).toEqual(["The handbook is empty"]);
      expect(await roomInitialization(opened)).toEqual({ state: "unknown", reason: "The complete rules could not be read. Check status before editing." });
      await expect(loadRules(opened)).rejects.toThrow(`Cannot read ${d.rules.name}: forbidden.`);
    });

    // The read does not ask membership. A revoked key still reads what it signed for within the window, and gets no session.
    const revoked = await act(rita, d.M.name, "revoke-key", { on: laptopRow!.id, fields: { as: how } });
    expect(revoked.answer.answer).toBe("accepted");
    await d.pause([d.D.name, d.M.name]);
    expect(await liveKey(rita, secretSigner(laptop).key)).toBeUndefined();
    expect(await opening(d.as(laptop), d)).toBe("opened as nobody, with no session");
    await withNoSessions(d, async (as) => expect(await signedSummary(as(laptop), d.D.name)).toBe("ok"));

    // Past the window every key is refused: the revoked key, and the founder whose claim caused the directory.
    d.advanceClock(WINDOW_MS + 1_000);
    await withNoSessions(d, async (as) => {
      expect(await signedSummary(as(laptop), d.D.name)).toBe("forbidden");
      expect(await signedSummary(as(ritas), d.D.name)).toBe("forbidden");
      expect(await opening(as(ritas), d)).toBe(sentence(d));
    });
    // The same founder with a session: the session decides, with no window.
    expect(await opening(d.as(ritas), d)).toBe("opened as @rita, with session");
  } finally { d.done(); }
});

test("a key that signs at the directory then reads it for the window; the page cannot sign there first, because it reads first", async () => {
  const wire: Wire = { sessions: null, dropActs: false, dropped: [] };
  const d = await demo(wrapOf(wire));
  try {
    const una = secretOf();
    expect((await joinRoom(d.as(una), d.link)).answer.answer).toBe("accepted");
    const room = await openRoom(d.as(una), placeIn(d));

    // The page's own act on a room with no session stops at its first read, and signs nothing.
    await withNoSessions(d, async (as) => {
      const onSignedReads: Room = { ...room, session: as(una), reader: null, unsessioned: "sessions-unavailable" };
      await expect(fileIssue(onSignedReads, d)).rejects.toThrow(sentence(d));
    });
    expect(wire.dropped).toEqual([]);

    // The bytes of one act, signed while a session could read what it needs, and lost on the way.
    wire.dropActs = true;
    await expect(fileIssue(room, d)).rejects.toThrow();
    wire.dropActs = false;
    expect(wire.dropped).toHaveLength(1);

    await withNoSessions(d, async (as) => {
      expect(await signedSummary(as(una), d.D.name)).toBe("forbidden");
      // A write asks for no read: the same key sends those bytes with no session, and the directory judges them.
      const session = as(una);
      const reply = await session.fetch!(`${SERVICE}/v1/scopes/${encodeURIComponent(d.D.name)}/acts`, { method: "POST", headers: { "content-type": "application/json" }, body: wire.dropped[0]! });
      const answer = JSON.parse(new TextDecoder().decode(await new Response(reply.body as never).arrayBuffer())) as { answer: string };
      expect(answer.answer).toBe("accepted");
      expect(await signedSummary(as(una), d.D.name)).toBe("ok");
      expect(await opening(as(una), d)).toBe("opened as @una, with no session");
    });
    await d.pause([d.D.name, d.M.name]);

    d.advanceClock(WINDOW_MS + 1_000);
    await withNoSessions(d, async (as) => expect(await signedSummary(as(una), d.D.name)).toBe("forbidden"));
  } finally { d.done(); }
});

test("on a Worker with sessions on, a lost or refused session request gives an active key the same refusal, and a session ends it", async () => {
  const wire: Wire = { sessions: null, dropActs: false, dropped: [] };
  const d = await demo(wrapOf(wire));
  try {
    const una = secretOf(), ritas = await d.secretOf(d.rita);
    expect((await joinRoom(d.as(una), d.link)).answer.answer).toBe("accepted");
    await d.pause([d.D.name, d.M.name]);

    // The discarded step of `original-copy.scope.test.ts`: the session request gets no reply, and the new key's first read is the directory.
    for (const line of ["lost", "rate-limited"] as const) {
      wire.sessions = line;
      expect(await opening(d.as(una), d), line).toBe(sentence(d));
    }
    // The founder's key opens only inside the window of its claim, and the same outage then refuses that key too.
    wire.sessions = "lost";
    expect(await opening(d.as(ritas), d)).toBe("opened as @rita, with no session");
    d.advanceClock(WINDOW_MS + 1_000);
    expect(await opening(d.as(ritas), d)).toBe(sentence(d));

    // The session request answers again. Nothing else changed, and a new open succeeds for both.
    wire.sessions = null;
    expect(await opening(d.as(una), d)).toBe("opened as @una, with session");
    expect(await opening(d.as(ritas), d)).toBe("opened as @rita, with session");
  } finally { d.done(); }
});

// Invariant: a revoked key's signed read of a room's scope ends less than `DELAY_MS + WINDOW_MS` after the revocation, on the reading
// scope's clock. Each accepted entry that the key signs restarts the window, and a scope accepts such an entry only while it holds an
// observation of the key from before the revocation, whose age it judges against 300 seconds. Planner decision 6d96e044 rests on this
// bound. The cases below hold the bound and each route that tries to break it. Two routes break it, and the last two cases hold them as
// they stand: the operator key's `found` at the register, and a key that is also the room's recovery key at membership.

const DELAY_MS = 300_000;
type Body = { signed: SignedIntent; grants: unknown[]; [other: string]: unknown };

/** The bytes of one `open-issue` by that room's key, which the wire loses, so that the test can sign the same act again. */
const issueBody = async (wire: Wire, room: Room, d: Demo): Promise<Body> => {
  wire.dropActs = true;
  await expect(fileIssue(room, d)).rejects.toThrow();
  wire.dropActs = false;
  return JSON.parse(wire.dropped.pop()!) as Body;
};
/** The same act, signed by that key at that time. The key chooses its signing time and its lifetime; the scope judges both. */
const signedAgain = async (body: Body, secret: Uint8Array, now: number, lifetimeSeconds?: number, expected = body.signed.intent.expected): Promise<Body> => {
  const { to, kind, on, fields } = body.signed.intent;
  return { ...body, signed: await signedIntent(secretSigner(secret), { to, kind, on, expected, fields }, { now, ...(lifetimeSeconds === undefined ? {} : { lifetimeSeconds }) }) };
};
/** The revisions that an act needs now, read by the key itself with a signed read. A key that reads the scope can always sign a current act. */
const currentExpected = async (d: Demo, secret: Uint8Array, body: Body): Promise<Record<string, number>> => {
  const read = await handleOf({ session: d.as(secret), reader: null }, body.signed.intent.to!.scope).summary();
  if (!read.ok) expect.fail(`no summary: ${read.reason}`);
  return Object.fromEntries(Object.keys(body.signed.intent.expected).map((name) => [name, read.value.items.find((item) => item.type === name)!.revision]));
};
/** The same act signed now, against the scope's current revisions. */
const current = async (d: Demo, body: Body, secret: Uint8Array, lifetimeSeconds?: number): Promise<Body> => signedAgain(body, secret, clockOf(d), lifetimeSeconds, await currentExpected(d, secret, body));
/** One POST to a scope's route. The answer's own words. */
const post = async (d: Demo, scope: ScopeId, what: "acts" | "preparations", body: unknown): Promise<{ answer?: string; reason?: string; name?: string }> => {
  const reply = await d.fetch(`${SERVICE}/v1/scopes/${encodeURIComponent(scope)}/${what}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return JSON.parse(new TextDecoder().decode(await new Response(reply.body as never).arrayBuffer())) as { answer?: string; reason?: string; name?: string };
};
const clockOf = (d: Demo): number => d.as(new Uint8Array(32)).now!();
/** The room of a key that holds a session, for what the test itself must read. */
const sessioned = (d: Demo, secret: Uint8Array): Promise<Room> => openRoom(d.as(secret), placeIn(d));
const fieldsOfKey = async (rita: Room, key: KeyId): Promise<Item> => {
  const row = await liveKey(rita, key);
  if (!row) expect.fail(`no live row for ${key}`);
  return row;
};
const revoke = async (by: Room, key: KeyId, how: "retired" | "compromised" = "retired"): Promise<void> => {
  const answered = await act(by, by.membership.scope, "revoke-key", { on: (await fieldsOfKey(by, key)).id, fields: { as: how } });
  expect(answered.answer.answer).toBe("accepted");
};
/** The room's scope, one key's signed reads over the Worker's routes. */
const signedReader_ = (d: Demo, secret: Uint8Array) => signedReads(httpTransport(SERVICE, { fetch: d.fetch }), secretSigner(secret), { now: d.as(secret).now! });
const answerOf = <T>(read: Read<T>): string => (read.ok ? "ok" : read.reason);
/** The position of each entry of that scope's first history page that one of those keys signed after that time. */
const signedSince = async (room: Room, scope: ScopeId, keys: readonly KeyId[], since: number): Promise<number[]> => {
  const page = await handleOf(room, scope).history();
  if (!page.ok) expect.fail(page.reason);
  expect(page.complete).toBe(true);
  return page.value.flatMap(({ entry }) => {
    const signer = entry.input.type === "act" || entry.input.type === "preparation" ? entry.input.signed.intent.actor : null;
    return signer && keys.includes(signer) && timeMs(entry.time)! > since ? [entry.seq] : [];
  });
};

test("the bound: a revoked key's last read of the directory ends less than 1200 seconds after the revocation, and a refused act or a resent act adds nothing", async () => {
  const wire: Wire = { sessions: null, dropActs: false, dropped: [] };
  const d = await demo(wrapOf(wire));
  try {
    const laptop = secretOf(), key = secretSigner(laptop).key;
    expect((await joinRoom(d.as(laptop), d.link)).answer.answer).toBe("accepted");
    const rita = await sessioned(d, await d.secretOf(d.rita));
    const room = await sessioned(d, laptop);
    const shape = await issueBody(wire, room, d);

    // The directory reads the key's standing for this act, and keeps that observation. The revocation follows at the same reading.
    expect((await post(d, d.D.name, "acts", await signedAgain(shape, laptop, clockOf(d)))).answer).toBe("accepted");
    const signedBefore = await current(d, shape, laptop, 900);
    await revoke(rita, key);
    const revokedAt = clockOf(d);

    // Inside the delay the directory has no reason to read membership again. An old intent and a new one both land.
    d.advanceClock(1);
    expect((await post(d, d.D.name, "acts", signedBefore)).answer).toBe("accepted");
    d.advanceClock(DELAY_MS - 2);
    const last = await current(d, shape, laptop);
    expect((await post(d, d.D.name, "acts", last)).answer).toBe("accepted");
    const lastAt = clockOf(d);
    expect(lastAt - revokedAt).toBe(DELAY_MS - 1);

    // The observation's age reaches the window. The directory reads again, sees the revocation, and writes nothing.
    d.advanceClock(1);
    // The directory's head still moves, by deliveries that have no signer and so restart nothing.
    expect(await post(d, d.D.name, "acts", await current(d, shape, laptop))).toMatchObject({ answer: "refused", reason: "unauthorized" });
    expect(await signedSince(rita, d.D.name, [key], lastAt)).toEqual([]);
    // The session that the key held at the revocation still reads. It ends 600 seconds after it was issued.
    expect((await handleOf(room, d.D.name).summary()).ok).toBe(true);

    // Later refused acts, and a resent intent that landed, write nothing and so do not move the end.
    d.advanceClock(600_000);
    expect(await post(d, d.D.name, "acts", await current(d, shape, laptop))).toMatchObject({ answer: "refused", reason: "unauthorized" });
    expect(await post(d, d.D.name, "acts", last)).toMatchObject({ answer: "accepted" });
    expect(answerOf(await handleOf(room, d.D.name).summary())).toBe("forbidden");
    expect(await signedSince(await sessioned(d, await d.secretOf(d.rita)), d.D.name, [key], lastAt)).toEqual([]);

    // The last read, and the first refusal. The clock is the directory's.
    d.advanceClock(lastAt + WINDOW_MS - clockOf(d));
    expect(await signedSummary(d.as(laptop), d.D.name)).toBe("ok");
    expect((await listLanes({ ...room, reader: null })).issues.length).toBeGreaterThan(0);
    expect(clockOf(d) - revokedAt).toBe(1_199_999);
    d.advanceClock(1);
    expect(await signedSummary(d.as(laptop), d.D.name)).toBe("forbidden");
    await expect(listLanes({ ...room, reader: null })).rejects.toThrow("forbidden");
    expect(clockOf(d) - revokedAt).toBe(1_200_000);
  } finally { d.done(); }
});

test("a membership that does not answer gives no more time: the held observation still ends at its age, and a scope that restarts holds none", async () => {
  const wire: Wire = { sessions: null, dropActs: false, dropped: [] };
  const d = await demo(wrapOf(wire));
  try {
    const laptop = secretOf(), key = secretSigner(laptop).key;
    expect((await joinRoom(d.as(laptop), d.link)).answer.answer).toBe("accepted");
    const rita = await sessioned(d, await d.secretOf(d.rita));
    const shape = await issueBody(wire, await sessioned(d, laptop), d);
    expect((await post(d, d.D.name, "acts", await signedAgain(shape, laptop, clockOf(d)))).answer).toBe("accepted");
    await revoke(rita, key);

    // STAND-IN for a membership scope that cannot be reached: its row of `meta` is gone, so its `observe` gives no answer. Nothing tells a
    // reading scope of a revocation, so this is the only way the news fails to arrive.
    const scopeRow = await d.wait(() => runInDurableObject(d.M.object, (_instance, state) => {
      const row = state.storage.sql.exec("SELECT v FROM meta WHERE k = 'scope'").toArray()[0]!["v"] as string;
      state.storage.sql.exec("DELETE FROM meta WHERE k = 'scope'");
      return row;
    }));
    await d.M.restart();
    try {
      d.advanceClock(DELAY_MS - 1);
      const beforeAge = await post(d, d.D.name, "acts", await current(d, shape, laptop));
      expect(beforeAge.answer).toBe("accepted");
      d.advanceClock(1);
      const atAge = await post(d, d.D.name, "acts", await current(d, shape, laptop));
      expect([atAge.answer, atAge.reason]).toEqual(["unavailable", "authority-unavailable"]);
      await d.D.restart();
      const afterRestart = await post(d, d.D.name, "acts", await current(d, shape, laptop));
      expect([afterRestart.answer, afterRestart.reason]).toEqual(["unavailable", "authority-unavailable"]);
    } finally {
      await d.wait(() => runInDurableObject(d.M.object, (_instance, state) => { state.storage.sql.exec("INSERT INTO meta (k, v) VALUES ('scope', ?)", scopeRow); }));
      await d.M.restart();
    }

    // Membership answers again, and the first read shows the revocation.
    const back = await post(d, d.D.name, "acts", await current(d, shape, laptop));
    expect([back.answer, back.reason]).toEqual(["refused", "unauthorized"]);
  } finally { d.done(); }
});

test("no route stores an entry signed by a revoked key after the delay: another scope, an act signed earlier, a preparation, an old grant, a join, an enrol, the founding acts, a session request", async () => {
  const wire: Wire = { sessions: null, dropActs: false, dropped: [] };
  const d = await demo(wrapOf(wire));
  try {
    const laptop = secretOf(), ritas = await d.secretOf(d.rita), laptopKey = secretSigner(laptop).key, ritaKey = secretSigner(ritas).key;
    expect((await joinRoom(d.as(laptop), d.link)).answer.answer).toBe("accepted");
    const rita = await sessioned(d, ritas);
    const laptopRoom = await sessioned(d, laptop);
    const shape = await issueBody(wire, laptopRoom, d);
    expect((await post(d, d.D.name, "acts", await signedAgain(shape, laptop, clockOf(d)))).answer).toBe("accepted");
    await d.pause([d.D.name, d.M.name]);
    const lane = (await listLanes(laptopRoom)).issues[0]!.scope;
    wire.dropActs = true;
    await expect(act(laptopRoom, lane, "comment", { fields: { body: "Signed while active." } })).rejects.toThrow();
    wire.dropActs = false;
    const remark = JSON.parse(wire.dropped.pop()!) as Body;
    const comment = () => signedAgain(remark, laptop, clockOf(d));
    expect((await post(d, lane, "acts", await comment())).answer).toBe("accepted");
    const entry = (await handleOf(rita, lane).history() as Read<readonly { entry: Entry }[]>);
    if (!entry.ok) expect.fail(entry.reason);
    const oldGrant = entry.value.flatMap(({ entry: e }) => (e.input.type === "act" && e.input.signed.intent.actor === laptopKey ? e.input.authority : []))[0];
    expect(oldGrant).toBeDefined();

    // While the key is active, the same preparation passes the grant and fails later, on what it asks.
    const whileActive = await post(d, lane, "preparations", { signed: (await comment()).signed, grants: [], capability: "hold@1", step: "check" });
    expect(whileActive.reason).not.toBe("unauthorized");

    // The invitation of a new member. The founder signs it while active.
    const invited = await d.run(d.rita, "invite", "@vic", "--role", "member");
    expect(invited.code, invited.lines.join("\n")).toBe(0);
    const memberLink = invited.lines[1]!.split(": ")[1]!;

    // A second admin key lets the founder's own key be revoked too. Membership judges on its own head, so it refuses at once.
    const secondRita = await sessioned(d, await secondKeyOf(d, rita, "@rita"));
    // An act that the key signed while active and holds back, with the longest lifetime the scope accepts.
    const heldBack = await signedAgain(remark, laptop, clockOf(d), 900);
    const sessionAsked = await signerSessionRequest(rita.membership, secretSigner(laptop), timeOf(clockOf(d) + 890_000), "c2Vzc2lvbi1yZXF1ZXN0LW9sZA");
    await revoke(secondRita, laptopKey);
    await revoke(secondRita, ritaKey, "compromised");
    const revokedAt = clockOf(d);
    const membershipRead = await handleOf(secondRita, d.M.name).summary() as { value: { definition: string } };
    const inviting = await signedIntent(secretSigner(ritas), { to: rita.membership, kind: "invite-member", on: null, expected: {}, fields: { handle: "@wes", role: "member", ...invitationIssueFields(membershipRead.value.definition as never, b64url(secretOf())), inviteEnds: timeOf(clockOf(d) + 60_000) } }, { now: clockOf(d) });
    expect(await post(d, d.M.name, "acts", { signed: inviting, grants: [] })).toMatchObject({ answer: "refused", reason: "unauthorized" });

    d.advanceClock(DELAY_MS);
    await fresh(secondRita);

    // At a lane, where the key signed before: a new act, and an act that it signed before the revocation and sends now.
    expect(await post(d, lane, "acts", await comment())).toMatchObject({ answer: "refused", reason: "unauthorized" });
    expect(await post(d, lane, "acts", heldBack)).toMatchObject({ answer: "refused", reason: "unauthorized" });
    // A preparation is the other input with a signer. It reads standing in the same way.
    expect(await post(d, lane, "preparations", { signed: (await comment()).signed, grants: [], capability: "hold@1", step: "check" })).toMatchObject({ answer: "refused", reason: "unauthorized" });
    // A grant that an entry retains is no authority when it is presented again.
    expect(await post(d, lane, "acts", { ...await comment(), grants: [oldGrant] })).toMatchObject({ answer: "refused", reason: "unauthorized" });

    // `join` and `enrol` read no standing, so their rule refuses a key that was ever enrolled.
    const device = await issueDeviceKey(secondRita, "@paul");
    if (!("link" in device)) expect.fail(`no device link: ${JSON.stringify(device)}`);
    for (const secret of [laptop, ritas]) expect(await submitJoin(d.as(secret), await prepareJoin(d.as(secret), device.link))).toMatchObject({ answer: "refused", name: "key-in-use" });
    // The room's own separate recovery key cannot become a member's key either.
    const recovery = (await d.wait(() => d.rita.store.secret("recovery")))!;
    expect(await submitJoin(d.as(recovery), await prepareJoin(d.as(recovery), device.link))).toMatchObject({ answer: "refused" });
    const preparedJoin = await prepareJoin(d.as(laptop), memberLink);
    expect(preparedJoin.signed.intent.kind).toBe("join");
    expect(await submitJoin(d.as(laptop), preparedJoin)).toMatchObject({ answer: "refused", name: "key-in-use" });

    // The founding key's own two acts: the rule passes this key, and their guards refuse, because a member and a key already exist.
    const rows = await handleOf(secondRita, d.M.name).summary() as { value: { items: readonly Item[] } };
    const roster = rows.value.items.find((item) => item.type === "roster")!, founder = rows.value.items.find((item) => item.type === "member" && item.values["handle"] === "@rita")!;
    const seat = await signedIntent(secretSigner(ritas), { to: rita.membership, kind: "seat", on: null, expected: { roster: roster.revision }, fields: {} }, { now: clockOf(d) });
    expect((await post(d, d.M.name, "acts", { signed: seat, grants: [] })).answer).toBe("refused");
    const firstKey = await signedIntent(secretSigner(ritas), { to: rita.membership, kind: "first-key", on: null, expected: { roster: roster.revision, member: founder.revision }, fields: { member: founder.id } }, { now: clockOf(d) });
    expect((await post(d, d.M.name, "acts", { signed: firstKey, grants: [] })).answer).toBe("refused");

    // A session request signed before the revocation gets no session after it.
    expect(await requestSession(SERVICE, d.M.name, sessionAsked, { fetch: d.fetch })).toMatchObject({ ok: false, reason: "unauthorized" });
    expect(await requestSession(SERVICE, d.M.name, await signerSessionRequest(rita.membership, secretSigner(ritas), timeOf(clockOf(d) + 60_000), "c2Vzc2lvbi1yZXF1ZXN0LW5ldw"), { fetch: d.fetch })).toMatchObject({ ok: false, reason: "unauthorized" });

    // Heads move by deliveries, such as the notice of a compromised key. No scope holds an entry that either key signed after the revocation.
    await fresh(secondRita);
    for (const scope of [d.D.name, d.M.name, lane]) expect(await signedSince(secondRita, scope, [laptopKey, ritaKey], revokedAt), scope).toEqual([]);

    d.advanceClock(WINDOW_MS);
    for (const [scope, secret] of [[d.D.name, laptop], [lane, laptop], [d.M.name, laptop], [d.M.name, ritas], [d.D.name, ritas]] as const) expect(await signedSummary(d.as(secret), scope)).toBe("forbidden");
  } finally { d.done(); }
});

test("what a revoked key reads in the window: the summary, the genesis, its own entries, entries from them, inputs they carry, and live items; nothing else", async () => {
  const wire: Wire = { sessions: null, dropActs: false, dropped: [] };
  const d = await demo(wrapOf(wire));
  try {
    const laptop = secretOf(), key = secretSigner(laptop).key, ritas = await d.secretOf(d.rita), paulS = await d.secretOf(d.paul);
    expect((await joinRoom(d.as(laptop), d.link)).answer.answer).toBe("accepted");
    const rita = await sessioned(d, ritas), paul = await sessioned(d, paulS), own = await sessioned(d, laptop);
    expect((await fileIssue(own, d)).answer.answer).toBe("accepted");
    expect((await fileIssue(paul, d)).answer.answer).toBe("accepted");
    await d.pause([d.D.name, d.M.name]);
    const lanes = (await listLanes(rita)).issues;
    const ownLane = lanes[0]!.scope, otherLane = lanes[1]!.scope;
    const all = await handleOf(rita, d.D.name).history() as Read<readonly { entry: Entry }[]>;
    if (!all.ok) expect.fail(all.reason);
    const signerAt = (seq: number) => { const e = all.value[seq]!.entry; return e.input.type === "act" ? e.input.signed.intent.actor : null; };
    const ownSeq = all.value.findIndex(({ entry }) => entry.input.type === "act" && entry.input.signed.intent.actor === key);
    const otherSeq = all.value.findIndex(({ entry }) => entry.input.type === "act" && entry.input.signed.intent.actor !== key);
    await revoke(rita, key, "compromised");
    d.advanceClock(1_000);

    const reads = signedReader_(d, laptop);
    const handle = new ScopeHandle(reads, d.D.name, null);
    const history = await reads.history(d.D.name, null);
    if (!history.ok) expect.fail(history.reason);
    const seen = history.value.map(({ entry }) => entry.seq);
    // Paul's act, and the entries that follow from it, are not on the page.
    expect(seen).toContain(0);
    expect(seen).toContain(ownSeq);
    expect(seen).not.toContain(otherSeq);
    expect(seen.every((seq) => seq === 0 || signerAt(seq) === key || signerAt(seq) === null)).toBe(true);
    const log = await reads.log(d.D.name, null);
    if (!log.ok) expect.fail(log.reason);
    expect(log.value.entries.map((row) => row.seq)).toEqual(seen);
    // The summary holds every live item, also those of other members. That is the limit of decision 6d96e044.
    const summary = await handle.summary();
    if (!summary.ok) expect.fail(summary.reason);
    expect(summary.value.items.filter((item) => item.type === "lane").length).toBe(2);
    expect((await listLanes({ ...own, reader: null })).issues.map((row) => row.scope)).toEqual([ownLane, otherLane]);
    const rows = [
      ["entry 0", answerOf(await handle.entry(0))],
      ["own entry", answerOf(await handle.entry(ownSeq))],
      ["another key's entry", answerOf(await handle.entry(otherSeq))],
      ["final items", answerOf(await handle.items("lane"))],
      ["outbox", answerOf(await handle.outbox())],
      ["own lane", await signedSummary(d.as(laptop), ownLane)],
      ["another's lane", await signedSummary(d.as(laptop), otherLane)],
      ["rules", await signedSummary(d.as(laptop), d.rules.name)],
      ["destination", await signedSummary(d.as(laptop), d.G.name)],
    ];
    expect(rows).toEqual([
      ["entry 0", "ok"], ["own entry", "ok"], ["another key's entry", "forbidden"], ["final items", "forbidden"], ["outbox", "forbidden"],
      ["own lane", "ok"], ["another's lane", "forbidden"], ["rules", "forbidden"], ["destination", "forbidden"],
    ]);
    // The inputs that those entries name: the definition of the lane that the key's act caused, and no text that nothing names.
    expect(answerOf(await reads.retained(ownLane, null, "definition", DEMO_DIGESTS.issue))).toBe("ok");
    expect(answerOf(await reads.retained(d.D.name, null, "text", textDigest("Nothing names this.")))).toBe("forbidden");
  } finally { d.done(); }
});

test("a signed time gives nothing: an entry takes the scope's clock, and a read's own notAfter moves no window", async () => {
  const wire: Wire = { sessions: null, dropActs: false, dropped: [] };
  const d = await demo(wrapOf(wire));
  try {
    const laptop = secretOf();
    expect((await joinRoom(d.as(laptop), d.link)).answer.answer).toBe("accepted");
    const rita = await sessioned(d, await d.secretOf(d.rita));
    const shape = await issueBody(wire, await sessioned(d, laptop), d);
    // The key's clock runs 600 seconds ahead. Its intent says nothing of that time but `notAfter`, 899 seconds ahead of the scope's clock.
    const at = clockOf(d);
    const ahead = await signedAgain(shape, laptop, at + 600_000, 299);
    expect((await post(d, d.D.name, "acts", ahead)).answer).toBe("accepted");
    const history = await handleOf(rita, d.D.name).history() as Read<readonly { entry: Entry }[]>;
    if (!history.ok) expect.fail(history.reason);
    const entry = history.value.find(({ entry: e }) => e.input.type === "act" && e.input.signed.intent.idempotencyKey === ahead.signed.intent.idempotencyKey)!.entry;
    expect(timeMs(entry.time)).toBe(at);
    // Further ahead than an intent may live, and nothing is written.
    expect(await post(d, d.D.name, "acts", await signedAgain(shape, laptop, at + 600_000, 301, await currentExpected(d, laptop, shape)))).toMatchObject({ answer: "refused", reason: "bad-intent" });

    // A read that says it lasts past the window is refused, and one signed for a later time reads only inside the window.
    const header = (now: number, lifetimeSeconds: number) => signedReader(secretSigner(laptop), d.D.name, "summary", "summary", { now: () => now, lifetimeSeconds });
    const status = async (reader: string) => (await d.fetch(`${SERVICE}/v1/scopes/${encodeURIComponent(d.D.name)}`, { headers: { authorization: reader } })).status;
    expect(await status(await header(at + 1_000, 900))).toBe(403);
    d.advanceClock(WINDOW_MS);
    expect(await status(await header(clockOf(d), 60))).toBe(200);
    d.advanceClock(1);
    expect(await status(await header(clockOf(d), 60))).toBe(403);
  } finally { d.done(); }
});

test("a new scope: a lane that a revoked key opened in the delay ends at the same bound; the operator key's `found` restarts its read of the register and of nothing in this room", async () => {
  const wire: Wire = { sessions: null, dropActs: false, dropped: [] };
  const d = await demo(wrapOf(wire));
  try {
    const laptop = secretOf(), laptopKey = secretSigner(laptop).key, ritas = await d.secretOf(d.rita), ritaKey = secretSigner(ritas).key;
    expect((await joinRoom(d.as(laptop), d.link)).answer.answer).toBe("accepted");
    const rita = await sessioned(d, ritas), second = await secondKeyOf(d, rita, "@rita");
    const shape = await issueBody(wire, await sessioned(d, laptop), d);
    const register = d.config.register!;
    let registerPin: PlatformDefinition | null = null;
    const registerItem = async () => {
      const read = await new ScopeHandle(signedReader_(d, ritas), register.scope, null).summary();
      if (!read.ok) expect.fail(`no register: ${read.reason}`);
      registerPin = read.value.definition as PlatformDefinition;
      return read.value.items.find((item) => item.type === "register")!.revision;
    };
    let revision = await registerItem();

    expect((await post(d, d.D.name, "acts", await signedAgain(shape, laptop, clockOf(d)))).answer).toBe("accepted");
    await revoke(rita, laptopKey);
    const revokedAt = clockOf(d);
    d.advanceClock(DELAY_MS - 1);
    expect((await post(d, d.D.name, "acts", await current(d, shape, laptop))).answer).toBe("accepted");
    await d.pause([d.D.name, d.M.name]);
    const lanes = (await listLanes(await sessioned(d, second))).issues;
    const newest = lanes[lanes.length - 1]!.scope;
    expect(await signedSummary(d.as(laptop), newest)).toBe("ok");
    // The lane's root is the act at the directory. Its time, and not a later delivery's, measures the read.
    d.advanceClock(revokedAt + DELAY_MS - 1 + WINDOW_MS - clockOf(d));
    expect(await signedSummary(d.as(laptop), newest)).toBe("ok");
    d.advanceClock(1);
    expect(await signedSummary(d.as(laptop), newest)).toBe("forbidden");

    // The register is no scope of the room, and this room's membership does not speak for it. Its policy `keys` lists the operator key,
    // which is this founder's key. Revoked in the room, it still signs `found` there.
    await revoke(await sessioned(d, second), ritaKey, "compromised");
    d.advanceClock(WINDOW_MS + 1);
    expect(await signedSummary(d.as(ritas), d.D.name)).toBe("forbidden");
    expect(await signedSummary(d.as(ritas), register.scope)).toBe("forbidden");
    const found = (secret: Uint8Array, at: number) => signedIntent(secretSigner(secret), { to: register, kind: "found", on: null, expected: { register: at }, fields: { branch: "main", founderHandle: "@again", recoveryKey: secretSigner(secretOf()).key } }, { now: clockOf(d) });
    // Another revoked key is on no list, so it signs nothing here.
    expect(await post(d, register.scope, "acts", { signed: await found(laptop, revision), grants: [] })).toMatchObject({ answer: "refused", reason: "unauthorized" });
    expect(await signedSummary(d.as(laptop), register.scope)).toBe("forbidden");

    for (const round of [1, 2, 3]) {
      const answered = await post(d, register.scope, "acts", { signed: await found(ritas, revision), grants: [] });
      expect(answered.answer, `round ${round}: ${JSON.stringify(answered)}`).toBe("accepted");
      revision = await registerItem();
      expect(await signedSummary(d.as(ritas), register.scope)).toBe("ok");
      expect(await signedSummary(d.as(ritas), d.D.name)).toBe("forbidden");
      expect(await signedSummary(d.as(ritas), d.M.name)).toBe("forbidden");
      const journal = await new ScopeHandle(signedReader_(d, ritas), register.scope, null).history();
      if (!journal.ok) expect.fail(journal.reason);
      // The first claim of this register and each round's `found` open a repository's creation.
      expect(journal.value.flatMap(({ entry }) => entry.effects).filter((effect) => effect.effect === "operation" && effect.kind === "create-repository")).toHaveLength(round + 1);
      d.advanceClock(WINDOW_MS + 1);
      expect(await signedSummary(d.as(ritas), register.scope)).toBe("forbidden");
    }

    // No act removes a key from the list: `install` alone writes `founders`, and the value is fixed. Each `found` also opens a repository's creation.
    const definition = platform(registerPin!)!.data as unknown as { items: { register: { values: { founders: { fixed: boolean } } } }; acts: Record<string, { effects: readonly unknown[] }> };
    expect(definition.items.register.values.founders.fixed).toBe(true);
    expect(Object.entries(definition.acts).filter(([, row]) => JSON.stringify(row.effects).includes('"founders"')).map(([kind]) => kind)).toEqual(["install"]);
  } finally { d.done(); }
});

// STAND-IN for a creation made by hand: the demo's store names the founder's key as the recovery key. The command line and the page each
// make a separate recovery key. The signed `found` and `first-key` are real on the historical publication cohort.
// The current default and separate-recovery cohort refuse this setup, so these two witnesses explicitly retain R18.
test("a key that is also the room's recovery key keeps signing at membership after its revocation, and each act restarts its read of membership; only a rotation ends that", async () => {
  const d = await demo(undefined, null, { recoveryIsFounder: true });
  try {
    const ritas = await d.secretOf(d.rita), ritaKey = secretSigner(ritas).key, rita = await sessioned(d, ritas);
    const second = await sessioned(d, await secondKeyOf(d, rita, "@rita"));
    const rows = async (): Promise<{ definition: string; roster: Item }> => {
      const read = await handleOf(second, d.M.name).summary();
      if (!read.ok) expect.fail(read.reason);
      return { definition: read.value.definition, roster: read.value.items.find((item) => item.type === "roster")! };
    };
    const { definition, roster } = await rows();
    expect(definition).toBe("platform:membership@8");
    expect(roster.values["recoveryKey"]).toBe(ritaKey);
    await revoke(second, ritaKey, "compromised");
    expect(await liveKey(second, ritaKey)).toBeUndefined();

    const invite = async (n: number) => post(d, d.M.name, "acts", { signed: await signedIntent(secretSigner(ritas), { to: rita.membership, kind: "invite-member", on: null, expected: {}, fields: { handle: `@guest${n}`, role: "member", ...invitationIssueFields(definition as never, b64url(secretOf())), inviteEnds: timeOf(clockOf(d) + 60_000) } }, { now: clockOf(d) }), grants: [] });
    for (const round of [1, 2, 3]) {
      d.advanceClock(WINDOW_MS + 1);
      expect(await signedSummary(d.as(ritas), d.M.name), `round ${round}`).toBe("forbidden");
      expect((await invite(round)).answer, `round ${round}`).toBe("accepted");
      expect(await signedSummary(d.as(ritas), d.M.name), `round ${round}`).toBe("ok");
      // Only membership takes these acts. The directory refuses the key's act, and its read stays ended.
      expect(await signedSummary(d.as(ritas), d.D.name), `round ${round}`).toBe("forbidden");
    }

    // The rotation cannot name an enrolled key, so one key holds both places only through the founding acts, or through a rotation to the founding key before `first-key`.
    await fresh(second);
    const current = (await rows()).roster;
    const rotation = (key: KeyId) => signedIntent(secretSigner(ritas), { to: rita.membership, kind: "rotate-recovery", on: current.id, expected: { on: current.revision }, fields: { key } }, { now: clockOf(d) });
    expect(await post(d, d.M.name, "acts", { signed: await rotation(second.key), grants: [] })).toMatchObject({ answer: "refused", name: "key-in-use" });

    // The rotation is the recovery key's own act. After it the key is refused, and the window ends the read.
    // `dap act` asks for a session first, and membership gives a revoked key none. So the command cannot sign this act now, and the scope still takes the signed act.
    const byCommand = await d.run(d.rita, "act", "rotate-recovery", "--on", "membership", "--target", String(current.id), "--set", `key=${secretSigner(secretOf()).key}`);
    expect(byCommand.code).toBe(1);
    expect(byCommand.lines.join("\n")).toContain("Read session refused: unauthorized");
    const rotated = await post(d, d.M.name, "acts", { signed: await rotation(secretSigner(secretOf()).key), grants: [] });
    expect(rotated.answer, JSON.stringify(rotated)).toBe("accepted");
    expect(await invite(4)).toMatchObject({ answer: "refused", reason: "unauthorized" });
    d.advanceClock(WINDOW_MS + 1);
    expect(await signedSummary(d.as(ritas), d.M.name)).toBe("forbidden");
  } finally { d.done(); }
});

test("while the key is active, `dap act rotate-recovery` moves the recovery key, and the old key then gets no recovery act", async () => {
  const d = await demo(undefined, null, { recoveryIsFounder: true });
  try {
    const ritas = await d.secretOf(d.rita), ritaKey = secretSigner(ritas).key, next = secretSigner(secretOf()).key;
    const rita = await sessioned(d, ritas), second = await sessioned(d, await secondKeyOf(d, rita, "@rita"));
    const roster = async () => {
      const read = await handleOf(second, d.M.name).summary();
      if (!read.ok) expect.fail(read.reason);
      return read.value.items.find((item) => item.type === "roster")!;
    };
    expect((await roster()).values["recoveryKey"]).toBe(ritaKey);
    const rotated = await d.run(d.rita, "act", "rotate-recovery", "--on", "membership", "--target", String((await roster()).id), "--set", `key=${next}`);
    expect(rotated.code, rotated.lines.join("\n")).toBe(0);
    await fresh(second);
    expect((await roster()).values["recoveryKey"]).toBe(next);
    const definition = (await handleOf(second, d.M.name).summary() as { value: { definition: string } }).value.definition;
    await revoke(second, ritaKey, "compromised");
    d.advanceClock(WINDOW_MS + 1);
    const signed = await signedIntent(secretSigner(ritas), { to: rita.membership, kind: "invite-member", on: null, expected: {}, fields: { handle: "@guest", role: "member", ...invitationIssueFields(definition as never, b64url(secretOf())), inviteEnds: timeOf(clockOf(d) + 60_000) } }, { now: clockOf(d) });
    expect(await post(d, d.M.name, "acts", { signed, grants: [] })).toMatchObject({ answer: "refused", reason: "unauthorized" });
    expect(await signedSummary(d.as(ritas), d.M.name)).toBe("forbidden");
  } finally { d.done(); }
});

// The command line's own route: `dap items`, `dap act revoke-key`, `dap log`. STAND-IN: a child of the session owner holds the new secret, as a new `SESSION_SECRET` binding does.
test("a stolen key: the commands revoke it, its session ends by time or at once with a new secret, and a new secret leaves its signed read", async () => {
  const wire: Wire = { sessions: null, dropActs: false, dropped: [] };
  const d = await demo(wrapOf(wire));
  try {
    const laptop = secretOf(), key = secretSigner(laptop).key, ritas = await d.secretOf(d.rita);
    expect((await joinRoom(d.as(laptop), d.link)).answer.answer).toBe("accepted");
    const shape = await issueBody(wire, await sessioned(d, laptop), d);
    expect((await post(d, d.D.name, "acts", await signedAgain(shape, laptop, clockOf(d)))).answer).toBe("accepted");
    const issued = clockOf(d), room = await sessioned(d, laptop), rita = await sessioned(d, ritas);

    const row = await fieldsOfKey(rita, key);
    const query = canonicalize({ cursor: null, ids: null, limit: 25, scope: rita.membership, states: ["active"], type: "key", v: 1 });
    const listed = await d.run(d.rita, "items", "membership", "--query", query);
    expect(listed.code, listed.lines.join("\n")).toBe(0);
    expect(listed.lines.join("\n")).toContain(key);
    const revoked = await d.run(d.rita, "act", "revoke-key", "--on", "membership", "--target", String(row.id), "--set", "as=compromised");
    expect(revoked.code, revoked.lines.join("\n")).toBe(0);
    expect(await requestSession(SERVICE, d.M.name, await signerSessionRequest(rita.membership, secretSigner(laptop), timeOf(clockOf(d) + 60_000), "c2Vzc2lvbi1hZnRlci1yZXZva2U"), { fetch: d.fetch })).toMatchObject({ ok: false, reason: "unauthorized" });
    // The `compromised` notice reaches the directory and changes nothing that it holds of the key: the act is still accepted, until the observation's age.
    await d.pause([d.D.name, d.M.name]);
    // An entry reuses an observation only on a reading later than the last entry's time.
    d.advanceClock(1);
    const noticed = await post(d, d.D.name, "acts", await current(d, shape, laptop));
    expect(noticed.answer, JSON.stringify(noticed)).toBe("accepted");
    const logged = await d.run(d.rita, "log", "directory");
    expect(logged.code, logged.lines.join("\n")).toBe(0);
    expect(logged.lines.join("\n")).toContain("act open-issue by key_");

    // A new secret: the held session is refused at once, the signed read stays, and an active key asks for a new session.
    const replaced = beginSessionChild(d.sessionOwner, { secret: b64url(secretOf()) });
    try {
      const held = { session: d.as(laptop, replaced), reader: room.reader };
      expect(answerOf(await handleOf(held, d.D.name).summary())).toBe("forbidden");
      expect(await signedSummary(d.as(laptop, replaced), d.D.name)).toBe("ok");
      expect((await openRoom(d.as(ritas, replaced), placeIn(d))).reader).not.toBeNull();
    } finally { replaced.close(); }

    // Under the same secret the session ends at its own end, at most 600 seconds after it was issued.
    const ends = timeMs(room.reader!.claims.ends)!;
    expect(ends - issued).toBeLessThanOrEqual(600_000);
    d.advanceClock(ends - 1 - clockOf(d));
    expect(answerOf(await handleOf(room, d.D.name).summary())).toBe("ok");
    d.advanceClock(1);
    expect(answerOf(await handleOf(room, d.D.name).summary())).toBe("forbidden");
  } finally { d.done(); }
});
