import { expect, test } from "vitest";
import type { Item, KeyId, ScopeId } from "@generalbusiness/dap-contract";
import { DEMO_DIGESTS } from "@generalbusiness/dap-lanes";
import { secretSigner, type Fetch } from "@generalbusiness/dap-client";
import { beginSessionChild } from "../../../../packages/scope/test/session-settings.ts";
import { act, handleOf, issueDeviceKey, joinRoom, listLanes, loadRules, openRoom, placeOf, prepareJoin, roomInitialization, submitJoin, type Room, type Session } from "../src/data.ts";
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
const secondKey = async (d: Demo, rita: Room): Promise<Uint8Array> => {
  const issued = await issueDeviceKey(rita, "@una");
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
