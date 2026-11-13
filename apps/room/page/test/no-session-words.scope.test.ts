import { expect, test } from "vitest";
import { textDigest } from "@generalbusiness/dap-bytes";
import type { ScopeId } from "@generalbusiness/dap-contract";
import type { Fetch } from "@generalbusiness/dap-client";
import { DEMO_DIGESTS } from "@generalbusiness/dap-lanes";
import { beginSessionChild } from "../../../../packages/scope/test/session-settings.ts";
import { act, joinRoom, openRoom, placeOf, roomInitialization, type Place, type Session } from "../src/data.ts";
import { failureText, initializationMessage, noSessionOf } from "../src/shell.ts";
import { demo, type Demo } from "./support/demo.ts";

// Invariant: when the directory refuses a signed read on open, the page says why it holds no session and what to do next. It says
// something about the key's standing only where membership's answer does. A refusal with a session held, and a read that fails for
// another reason, keep the words they had.
//
// The room is `support/demo.ts`: real scopes, the Worker's routes, real read sessions under a TEST SECRET. A deployment with no session
// secret is that fixture's own setting, `secret: null`. The tests marked STAND-IN replace one reply on the wire between the page and the
// routes, so those replies are written here and no scope gave them: a lost session request, a rate-limited one, `clock-behind`, `replayed`
// and an `unavailable` read. Every other reason in this file is the real scope's answer to the page's real request.

const NO_REPLY = "The service did not give a usable answer to this page's request for a read session. Reload this page to try again.";
const NO_SESSIONS_AT_ALL = "This service is not giving read sessions to any key, so it did not check whether this key belongs to the room. Without a session, the room opens only for a key that signed there recently. Ask whoever runs this service to turn on read sessions, then reload this page.";
const NOT_A_MEMBER = "This key is not an active key of a member of this room, so the service gave it no read session. Ask someone in the room for a new invitation link, then join with it.";
const NO_SUCH_ROOM = "This connection does not match an active room on this service, so the service gave this key no read session. Ask someone in the room for a new invitation link, then join with it.";
const DEVICE_CLOCK = "The service refused this page's request for a read session. This device's clock may be wrong. Check its date and time, then reload this page.";

type Reply = "lost" | { status: number; reason: string; retryAfter?: string } | null;
interface Wire { sessions: Reply; reads: { scope: ScopeId; reason: string } | null }
const wrapOf = (wire: Wire) => (inner: Fetch): Fetch => async (url, init) => {
  const path = new URL(url).pathname;
  const reply = path.endsWith("/sessions") ? wire.sessions : null;
  if (reply === "lost") throw new Error("STAND-IN: no reply to the session request");
  if (reply) return new Response(JSON.stringify({ ok: false, reason: reply.reason }), { status: reply.status, headers: reply.retryAfter ? { "retry-after": reply.retryAfter } : {} }) as never;
  if (wire.reads && path.endsWith(`/scopes/${encodeURIComponent(wire.reads.scope)}`)) return new Response(JSON.stringify({ ok: false, reason: wire.reads.reason }), { status: 503 }) as never;
  return inner(url, init);
};

const secretOf = () => crypto.getRandomValues(new Uint8Array(32));
const placeIn = (d: Demo): Place => placeOf(JSON.stringify(d.config))!;
/** A key enrolled at membership that has signed nothing at the directory. */
const member = async (d: Demo): Promise<Uint8Array> => {
  const secret = secretOf();
  expect((await joinRoom(d.as(secret), d.link)).answer.answer).toBe("accepted");
  await d.pause([d.D.name, d.M.name]);
  return secret;
};
/** What a person is shown for a refused open, and what stays for diagnostics. */
const refused = async (session: Session, place: Place): Promise<{ shown: string; message: string; why: string | null; wait: number | undefined }> => {
  const error = await openRoom(session, place).then(() => expect.fail("the room opened"), (thrown: Error) => thrown);
  return { shown: failureText(error, "SCRIPTED"), message: error.message, why: noSessionOf(error)?.why ?? null, wait: noSessionOf(error)?.retryAfterSeconds };
};
const withNoSessions = async <T>(d: Demo, work: (as: (secret: Uint8Array) => Session) => Promise<T>): Promise<T> => {
  const off = beginSessionChild(d.sessionOwner, { secret: null });
  try { return await work((secret) => d.as(secret, off)); } finally { off.close(); }
};

test("STAND-IN wire: a lost or refused session request gives an active key its cause and its next step, and keeps the refusal for diagnostics", async () => {
  const wire: Wire = { sessions: null, reads: null };
  const d = await demo(wrapOf(wire));
  try {
    const una = await member(d);
    const cases: [Exclude<Reply, null>, string, string, number | undefined][] = [
      ["lost", "no-reply", NO_REPLY, undefined],
      [{ status: 429, reason: "rate-limited", retryAfter: "60" }, "rate-limited", "This key has asked for too many read sessions. Wait 60 seconds, then reload this page.", 60],
      [{ status: 429, reason: "rate-limited", retryAfter: "1" }, "rate-limited", "This key has asked for too many read sessions. Wait 1 second, then reload this page.", 1],
      [{ status: 429, reason: "rate-limited", retryAfter: "900" }, "rate-limited", "This key has asked for too many read sessions. Wait 15 minutes, then reload this page.", 900],
      [{ status: 429, reason: "rate-limited" }, "rate-limited", "This key has asked for too many read sessions. Wait a few minutes, then reload this page.", undefined],
      [{ status: 503, reason: "clock-behind" }, "clock-behind", "The service's clock is behind, so it gave no read session. Reload this page later to try again.", undefined],
      [{ status: 409, reason: "replayed" }, "replayed", "The service refused this page's request for a read session (replayed). Reload this page to try again.", undefined],
    ];
    for (const [reply, why, shown, wait] of cases) {
      wire.sessions = reply;
      const label = `${why} ${JSON.stringify(reply)}`;
      expect(await refused(d.as(una), placeIn(d)), label).toEqual({ shown, message: `Cannot read ${d.D.name}: forbidden.`, why, wait });
      expect(shown, label).not.toContain(d.D.name);
    }
    // A reload asks again, and the same key opens.
    wire.sessions = null;
    expect((await openRoom(d.as(una), placeIn(d))).me?.handle).toBe("@una");
  } finally { d.done(); }
});

test("where the service gives sessions, a member's key opens and a stranger's key hears that it is no member's; with no session secret both hear the same words", async () => {
  const d = await demo();
  try {
    const una = await member(d), stranger = secretOf();
    expect((await openRoom(d.as(una), placeIn(d))).me?.handle).toBe("@una");
    expect(await refused(d.as(stranger), placeIn(d))).toEqual({ shown: NOT_A_MEMBER, message: `Cannot read ${d.D.name}: forbidden.`, why: "unauthorized", wait: undefined });
    await withNoSessions(d, async (as) => {
      const [memberSees, strangerSees] = [await refused(as(una), placeIn(d)), await refused(as(stranger), placeIn(d))];
      expect(memberSees).toEqual({ shown: NO_SESSIONS_AT_ALL, message: `Cannot read ${d.D.name}: forbidden.`, why: "sessions-unavailable", wait: undefined });
      expect(strangerSees).toEqual(memberSees);
    });
  } finally { d.done(); }
});

test("a connection that names no active membership, and a device clock the service refuses, each say so", async () => {
  const d = await demo();
  try {
    const una = await member(d), place = placeIn(d);
    const directoryAsMembership: Place = { directory: place.directory, membership: { ...place.membership, scope: d.D.name } };
    const otherGenesis: Place = { directory: place.directory, membership: { ...place.membership, genesis: textDigest("TEST genesis 23") } };
    expect(await refused(d.as(una), directoryAsMembership)).toMatchObject({ shown: NO_SUCH_ROOM, why: "not-found" });
    expect(await refused(d.as(una), otherGenesis)).toMatchObject({ shown: NO_SUCH_ROOM, why: "misaddressed" });
    const session = d.as(una), now = session.now!;
    expect(await refused({ ...session, now: () => now() - 120_000 }, place)).toMatchObject({ shown: DEVICE_CLOCK, why: "expired" });
    expect(await refused({ ...session, now: () => now() + 1_000_000 }, place)).toMatchObject({ shown: DEVICE_CLOCK, why: "bad-request" });
  } finally { d.done(); }
});

test("a read refused with a session held keeps its words, and a STAND-IN unavailable read with no session keeps its own", async () => {
  const wire: Wire = { sessions: null, reads: null };
  const d = await demo(wrapOf(wire));
  try {
    const una = await member(d), place = placeIn(d);
    // The register records no membership, so it refuses this room's real session.
    const held = await refused(d.as(una), { ...place, directory: d.config.register!.scope });
    expect(held).toEqual({ shown: `Cannot read ${d.config.register!.scope}: forbidden.`, message: `Cannot read ${d.config.register!.scope}: forbidden.`, why: null, wait: undefined });
    wire.sessions = "lost"; wire.reads = { scope: d.D.name, reason: "unavailable" };
    expect(await refused(d.as(una), place)).toEqual({ shown: `Cannot read ${d.D.name}: unavailable.`, message: `Cannot read ${d.D.name}: unavailable.`, why: null, wait: undefined });
  } finally { d.done(); }
});

test("a key that opens on signed reads hears why the rules are out of reach; a session holder's unknown state stays silent (STAND-IN unavailable rules read)", async () => {
  const wire: Wire = { sessions: null, reads: null };
  const d = await demo(wrapOf(wire));
  try {
    const una = await member(d);
    const room = await openRoom(d.as(una), placeIn(d));
    const filed = await act(room, d.D.name, "open-issue", { fields: { definition: DEMO_DIGESTS.issue, title: "The handbook is empty", conditions: ["README.md says what the room is for"] } });
    expect(filed.answer.answer).toBe("accepted");
    await d.pause([d.D.name, d.M.name]);
    await withNoSessions(d, async (as) => {
      const opened = await openRoom(as(una), placeIn(d));
      expect(opened.reader).toBeNull();
      expect((await roomInitialization(opened)).state).toBe("unknown");
      expect(initializationMessage("unknown", opened.unsessioned)).toBe(`The complete rules could not be read. ${NO_SESSIONS_AT_ALL}`);
    });
    wire.reads = { scope: d.rules.name, reason: "unavailable" };
    expect((await roomInitialization(room)).state).toBe("unknown");
    expect(initializationMessage("unknown", room.unsessioned)).toBeNull();
  } finally { d.done(); }
});

test("a founder whose session request fails in the room's first moments is not told to ask for an invitation", async () => {
  const wire: Wire = { sessions: null, reads: null };
  const d = await demo(wrapOf(wire));
  try {
    // The founder's key: membership holds it as soon as the creation returns, so the real scope gives it a session at once.
    const founder = await d.secretOf(d.rita);
    const held = await openRoom(d.as(founder), placeIn(d));
    expect([held.reader !== null, held.unsessioned]).toEqual([true, null]);

    // STAND-IN: the first session request gets no reply, a rate limit, a slow clock or no sessions at all. These are the reasons an active key can get.
    for (const reply of ["lost", { status: 429, reason: "rate-limited", retryAfter: "30" }, { status: 503, reason: "clock-behind" }, { status: 501, reason: "sessions-unavailable" }] satisfies Reply[]) {
      wire.sessions = reply;
      const opened = await openRoom(d.as(founder), placeIn(d));
      wire.sessions = null;
      expect(opened.reader).toBeNull();
      expect(opened.me?.handle).toBe(held.me?.handle);
      const notice = initializationMessage("unknown", opened.unsessioned);
      expect(notice).toContain("The complete rules could not be read.");
      expect(notice).not.toContain("invitation link");
    }
  } finally { d.done(); }
});
