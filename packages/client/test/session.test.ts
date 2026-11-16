import { expect, test } from "vitest";
import { keyIdOfSecret, timeOf, textDigest } from "@generalbusiness/dap-bytes";
import type { Answer, ScopeRef, SessionClaims } from "@generalbusiness/dap-contract";
import { AUTHORITY_REFUSALS, authorityRefusal, requestSession, sessionRequest, type Fetch, TransportError } from "../src/index.ts";

const NOW = Date.parse("2099-01-01T00:00:00Z"), SEED = new Uint8Array(32).fill(19);
const M: ScopeRef = { scope: `sc_${"a".repeat(52)}`, genesis: textDigest("TEST genesis 1") };
const claims: SessionClaims = { v: 1, deployment: "TEST", membership: M, member: "@member", key: keyIdOfSecret(SEED), reads: ["summary"], ends: timeOf(NOW + 600_000) };
const ask = (fetch: Fetch, seconds?: number) => requestSession("https://scope.test", M.scope, sessionRequest(M, SEED, timeOf(NOW + 60_000), "TEST-operation"), { fetch, ...(seconds === undefined ? {} : { seconds }) });

test("session request preserves exact claims and server lifetime without exposing its credential in JSON, text or a URL", async () => {
  let url = "";
  const answer = await ask(async address => { url = address; return Response.json({ ok: true, token: "TEST-session-credential", session: claims }); });
  expect(answer.ok).toBe(true);
  if (!answer.ok) return;
  expect(answer.session.claims).toEqual(claims);
  expect(answer.session.claims.ends).toBe(timeOf(NOW + 600_000));
  expect(JSON.stringify(answer) + String(answer.session) + url).not.toContain("TEST-session-credential");
  const extra = await ask(async () => Response.json({ ok: true, token: "TEST-session-credential", session: { ...claims,
    private: "TEST-session-credential", membership: { ...M, private: "TEST-session-credential" } } }));
  expect(JSON.stringify(extra)).not.toContain("TEST-session-credential");
  for (const session of [{ ...claims, membership: { ...M, genesis: textDigest("TEST genesis 2") } },
    { ...claims, key: keyIdOfSecret(new Uint8Array(32).fill(20)) }])
    await expect(ask(async () => Response.json({ ok: true, token: "TEST-session-credential", session }))).rejects.toThrow(/another repository or key/);
});

test("rate-limit metadata is an advisory canonical positive safe integer only on a matching 429 refusal", async () => {
  const reply = (status: number, reason: string, header?: string): Fetch => async () => ({ status, body: new Response(JSON.stringify({ ok: false, reason })).body,
    ...(header === undefined ? {} : { headers: { get: () => header } }) });
  expect(await ask(reply(429, "rate-limited", "75"))).toEqual({ ok: false, reason: "rate-limited", retryAfterSeconds: 75 });
  expect(await ask(reply(429, "rate-limited", "9007199254740991"))).toEqual({ ok: false, reason: "rate-limited", retryAfterSeconds: Number.MAX_SAFE_INTEGER });
  for (const header of [undefined, "", "0", "01", " 75", "75 ", "1.5", "-1", "9007199254740992", "9".repeat(17), "Wed, 01 Jan 2099 00:00:00 GMT"])
    expect(await ask(reply(429, "rate-limited", header))).toEqual({ ok: false, reason: "rate-limited" });
  expect(await ask(reply(403, "unauthorized", "75"))).toEqual({ ok: false, reason: "unauthorized" });
  expect(await ask(reply(200, "rate-limited", "75"))).toEqual({ ok: false, reason: "rate-limited" });
  await expect(ask(reply(429, "unauthorized", "75"))).rejects.toThrow(/429 reply/);
});

test("session replies retain raw byte and whole-reply time bounds and never echo untrusted transport text", async () => {
  let cancelled = 0;
  const oversized = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new Uint8Array(16 * 1024 + 1)); }, cancel() { cancelled++; } });
  await expect(ask(async () => ({ status: 200, body: oversized }))).rejects.toThrow(/too long/); expect(cancelled).toBe(1);
  await expect(ask(async () => { throw new Error("TEST-session-credential must stay private"); })).rejects.toThrow("no reply. No session was taken");
  let aborted = false;
  const stopped = ask(async (_url, init) => new Promise<never>((_resolve, reject) => {
    const signal = init!.signal as unknown as AbortSignal;
    signal.addEventListener("abort", () => { aborted = true; reject(new Error("TEST-session-credential")); }, { once: true });
  }), 0.001);
  await expect(stopped).rejects.toBeInstanceOf(TransportError); expect(aborted).toBe(true);
});

// ES-1. A reader that passes `standing: true` asks with `?standing=1` and keeps the value that membership states, only when the value passes
// every check. A reader that does not pass it sends the request it sent before, with no query, and keeps no value.
const askStanding = (fetch: Fetch) => requestSession("https://scope.test", M.scope, sessionRequest(M, SEED, timeOf(NOW + 60_000), "TEST-operation"), { fetch, standing: true });
const STANDING = { of: M, head: { seq: 14, hash: textDigest("TEST membership head") }, key: claims.key, keyState: "active", member: "@member", memberState: "active", role: "member",
  actions: ["issue.open"], within: { membership: M }, controller: null, controllerActive: null, notAfter: null, definition: "platform:membership@14" };
const withStanding = (standing: unknown): Fetch => async () => Response.json({ ok: true, token: "TEST-session-credential", session: claims, standing });

test("a session request with no option has no query and keeps no value, also from an answer that carries one", async () => {
  let url = "";
  const answer = await ask(async address => { url = address; return Response.json({ ok: true, token: "TEST-session-credential", session: claims, standing: STANDING }); });
  expect(url).toBe(`https://scope.test/v1/scopes/${M.scope}/sessions`);
  expect(answer.ok && answer.session.standing).toBeNull();
});

test("a session request asks with standing=1 and keeps the value with the session, and the value is no part of its text", async () => {
  let url = "";
  const answer = await askStanding(async address => { url = address; return Response.json({ ok: true, token: "TEST-session-credential", session: claims, standing: STANDING }); });
  expect(url).toBe(`https://scope.test/v1/scopes/${M.scope}/sessions?standing=1`);
  expect(answer.ok && answer.session.standing).toEqual(STANDING);
  expect(answer.ok && JSON.stringify(answer.session)).toBe(JSON.stringify({ claims }));
});

// Stand-in: the reply is scripted as an older Worker sends it, with the three members. The rolling pair on the real route is in the scope tests.
test("an answer of three members, as a Worker without the option sends it, is a session with no standing", async () => {
  const answer = await askStanding(async () => Response.json({ ok: true, token: "TEST-session-credential", session: claims }));
  expect(answer.ok && answer.session.standing).toBeNull();
  expect(answer.ok && answer.session.claims).toEqual(claims);
  await expect(askStanding(async () => Response.json({ ok: true, token: "TEST-session-credential", session: claims, other: STANDING }))).rejects.toThrow(/not an answer/);
});

// Invariant: a value that fails one check gives no standing and keeps the session. Each case changes one thing, and is named.
const OTHER_KEY = keyIdOfSecret(new Uint8Array(32).fill(20));
const REFUSED: readonly (readonly [string, (value: Record<string, unknown>) => unknown])[] = [
  ["fields: a member is missing", value => Object.fromEntries(Object.entries(value).filter(([name]) => name !== "role"))],
  ["fields: a member is added", value => ({ ...value, at: "2099-01-01T00:00:00Z" })],
  ["fields: the key state is none of the four", value => ({ ...value, keyState: "pending" })],
  ["fields: the member state is none of the two", value => ({ ...value, memberState: "unknown" })],
  ["fields: the actions are not texts", value => ({ ...value, actions: [1] })],
  ["fields: the head is not a head", value => ({ ...value, head: { seq: -1, hash: "x" } })],
  ["fields: a controller has no state", value => ({ ...value, controller: "@owner", controllerActive: null })],
  ["fields: a grant end time is present", value => ({ ...value, notAfter: "2099-01-01T00:00:00Z" })],
  ["pin: the definition is no platform name", value => ({ ...value, definition: "sha256:" + "a".repeat(64) })],
  ["pin: a membership version that does not answer the session question", value => ({ ...value, definition: "platform:membership@3" })],
  ["key: it is another key than the request's and the claims'", value => ({ ...value, key: OTHER_KEY })],
  ["member: it is another member than the claims'", value => ({ ...value, member: "@other" })],
  ["membership: it is another scope", value => ({ ...value, of: { ...M, scope: `sc_${"b".repeat(52)}` }, within: { membership: { ...M, scope: `sc_${"b".repeat(52)}` } } })],
  ["incarnation: it is another genesis", value => ({ ...value, of: { ...M, genesis: textDigest("TEST genesis 2") } })],
  ["filter: it names another membership than its own", value => ({ ...value, within: { membership: { ...M, genesis: textDigest("TEST genesis 2") } } })],
];
test.each(REFUSED)("a standing that fails the check %s gives no standing and keeps the session", async (name, change) => {
  const answer = await askStanding(withStanding(change({ ...STANDING })));
  expect(answer.ok, name).toBe(true);
  if (!answer.ok) return;
  expect(answer.session.standing, name).toBeNull();
  expect(answer.session.claims, name).toEqual(claims);
  expect(answer.session.reader(), name).toBe("Session TEST-session-credential");
});

// Invariant: the value states a controller state, and the reader keeps it. Eligibility is for the caller of the session to judge.
test("a standing that states an inactive controller is kept as stated", async () => {
  const stated = { ...STANDING, controller: "@owner", controllerActive: false };
  const answer = await askStanding(withStanding(stated));
  expect(answer.ok && answer.session.standing).toEqual(stated);
});

// ES-1. Invariant: a refusal that the scope's grant check makes ends the held session, and no other answer does. The grant check has one
// refusal reason on the wire: its seven failed conditions all answer `refused` with `unauthorized` (see `AUTHORITY_REFUSALS`).
test("the authority refusals are the grant check's one reason; a guard, a limit and an unavailable answer end nothing", () => {
  const judgedAt = { seq: 1, hash: textDigest("TEST head") };
  expect(AUTHORITY_REFUSALS).toEqual(["unauthorized"]);
  const answers: readonly (readonly [Answer, boolean])[] = [
    [{ answer: "refused", reason: "unauthorized", judgedAt }, true],
    [{ answer: "refused", reason: "guard-failed", name: "nope", judgedAt }, false],
    [{ answer: "refused", reason: "limit", judgedAt }, false],
    [{ answer: "unavailable", reason: "authority-unavailable" }, false],
    [{ answer: "unavailable", reason: "unavailable" }, false],
  ];
  expect(answers.map(([answer]) => authorityRefusal(answer))).toEqual(answers.map(([, ends]) => ends));
});
