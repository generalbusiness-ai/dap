import { expect, test } from "vitest";
import { keyIdOfSecret, newIncarnation, timeOf } from "@generalbusiness/dap-bytes";
import type { ScopeRef, SessionClaims } from "@generalbusiness/dap-contract";
import { requestSession, sessionRequest, type Fetch, TransportError } from "../src/index.ts";

const NOW = Date.parse("2099-01-01T00:00:00Z"), SEED = new Uint8Array(32).fill(19);
const M: ScopeRef = { scope: `sc_${"a".repeat(52)}`, inc: newIncarnation(new Uint8Array(16).fill(1)), kind: "membership" };
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
  for (const session of [{ ...claims, membership: { ...M, inc: newIncarnation(new Uint8Array(16).fill(2)) } },
    { ...claims, membership: { ...M, kind: "register" } }, { ...claims, key: keyIdOfSecret(new Uint8Array(32).fill(20)) }])
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
