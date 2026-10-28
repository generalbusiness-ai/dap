import { expect, test } from "vitest";
import type { ScopeRef, SignedSessionRequest } from "@generalbusiness/dap-contract";
import { base32, canonicalize, keyIdOfSecret, newIncarnation, signIntent, textDigest, timeOf, utf8 } from "@generalbusiness/dap-bytes";
import { secretSigner, type Fetch } from "@generalbusiness/dap-client";
import { handleOf, managedReadsOf, readerOf, requiredSessionOf, run, sessionOf, Stop } from "../src/command-support.ts";
import { memoryStore, type Config } from "../src/store.ts";

const START = Date.parse("2099-01-01T00:00:00Z"), SECRET = new Uint8Array(32).fill(17);
const M: ScopeRef = { scope: `sc_${"a".repeat(52)}`, kind: "membership", inc: newIncarnation(new Uint8Array(16).fill(1)) };
const TARGET: ScopeRef = { ...M, scope: `sc_${base32(new Uint8Array(32).fill(1))}` };
const HEAD = { seq: 0, hash: textDigest("TEST cache head") };
async function fixture() {
  const store = memoryStore(); await store.keep("device", SECRET);
  const config: Config = { v: 1, service: "https://session.test", key: "device", repository: { directory: { ...M, kind: "directory" }, membership: M, rules: TARGET.scope, destination: TARGET.scope } };
  await store.save(config);
  const state = { now: START, issued: 0, probes: 0, reads: 0, mutations: 0, denyTarget: false, denyAll: false,
    refused: null as null | { reason: "unauthorized" | "sessions-unavailable" | "rate-limited"; retry?: string },
    invalid: new Set<string>(), headerKinds: [] as string[] };
  const fetch: Fetch = async (url, init) => {
    const path = new URL(url).pathname;
    if (path.endsWith("/sessions")) {
      state.issued++;
      if (state.refused) return Response.json({ ok: false, reason: state.refused.reason }, { status: state.refused.reason === "rate-limited" ? 429 : 403,
        headers: state.refused.retry === undefined ? {} : { "retry-after": state.refused.retry } });
      const asked = JSON.parse(init!.body!) as SignedSessionRequest;
      return Response.json({ ok: true, token: `TEST-private-cache-${state.issued}`, session: { v: 1, deployment: "TEST", membership: asked.request.to,
        key: asked.request.actor, member: "@member", reads: ["summary", "entry", "history"], ends: timeOf(state.now + 600_000) } });
    }
    if (init?.method === "POST") {
      state.mutations++; return Response.json({ answer: "refused", reason: "unauthorized", judgedAt: HEAD }, { status: 403 });
    }
    const authorization = init?.headers?.["authorization"];
    state.headerKinds.push(authorization?.startsWith("Signed ") ? "signed" : authorization === "Session unrelated" ? "unrelated" : "session");
    const membership = path === `/v1/scopes/${M.scope}`;
    if (membership) state.probes++; else state.reads++;
    if (state.denyAll || state.invalid.has(authorization ?? "") || !membership && state.denyTarget) return Response.json({ ok: false, reason: "forbidden" }, { status: 403 });
    return Response.json({ ok: true, at: HEAD, complete: true, value: { scope: membership ? M : TARGET, definition: "platform:membership@2", status: "active", time: timeOf(state.now), items: [], counts: [] } });
  };
  const context = () => ({ store, fetch, now: () => state.now });
  return { store, config, state, fetch, context };
}

test("private session reuse spans fresh Contexts, shares one in-flight issuance and retains original claims until the refresh margin", async () => {
  const f = await fixture();
  const sessions = await Promise.all(Array.from({ length: 40 }, () => sessionOf(f.context(), f.config)));
  expect(f.state.issued).toBe(1);
  expect(sessions.every(s => s?.claims.key === keyIdOfSecret(SECRET) && s.claims.ends === timeOf(START + 600_000))).toBe(true);
  f.state.now = START + 569_999; await sessionOf(f.context(), f.config); expect(f.state.issued).toBe(1);
  f.state.now++; await sessionOf(f.context(), f.config); expect(f.state.issued).toBe(2);
  const output = JSON.stringify([await f.store.config(), sessions[0], await managedReadsOf(f.context(), f.config)]);
  expect(output).not.toContain("TEST-private-cache");
  const skewed = await fixture();
  const stopped = await run(async () => { await sessionOf({ ...skewed.context(), now: () => START + 600_000 }, skewed.config); return { code: 0, lines: [] }; });
  expect([stopped.code, skewed.state.issued]).toEqual([1, 1]);
  expect(stopped.lines.join(" ")).toContain("clock alignment"); expect(await skewed.store.sessionCache!.read()).toBeNull();
});

test("cache identity includes exact service, signing key and membership incarnation; rejected bytes are discarded even if issuance fails", async () => {
  const f = await fixture(); await sessionOf(f.context(), f.config);
  await sessionOf(f.context(), { ...f.config, service: "https://other.test" });
  await f.store.keep("other", new Uint8Array(32).fill(18));
  await sessionOf(f.context(), { ...f.config, key: "other" });
  await sessionOf(f.context(), { ...f.config, repository: { ...f.config.repository!, membership: { ...M, inc: newIncarnation(new Uint8Array(16).fill(2)) } } });
  expect(f.state.issued).toBe(4);
  await f.store.sessionCache!.replace(utf8("not a cache record"));
  f.state.refused = { reason: "unauthorized" };
  expect(await sessionOf(f.context(), f.config)).toBeNull();
  expect(await f.store.sessionCache!.read()).toBeNull();
  f.state.refused = null; await sessionOf(f.context(), f.config);
  f.state.now += 570_000; f.state.refused = { reason: "unauthorized" };
  await expect(sessionOf(f.context(), f.config)).rejects.toBeInstanceOf(Stop);
  expect(await f.store.sessionCache!.read()).toBeNull();
});

test("a new reader adapter reselects initial Signed authority after membership eligibility changes in the same Context, without per-page issuance", async () => {
  const f = await fixture(), ctx = f.context();
  f.state.refused = { reason: "unauthorized" };
  expect(await readerOf(ctx, f.config)).toBeNull();
  const managed = await managedReadsOf(ctx, f.config);
  expect(f.state.issued).toBe(1);
  f.state.refused = null;
  for (let page = 0; page < 3; page++) {
    expect(await managed.read(async reader => {
      expect(reader).toBeNull(); return { ok: false as const, reason: "forbidden" };
    })).toEqual({ ok: false, reason: "forbidden" });
  }
  expect(f.state.issued).toBe(1);
  const reader = await readerOf(ctx, f.config);
  expect(typeof reader).toBe("string");
  expect((await (await handleOf(ctx, f.config, TARGET.scope, reader)).summary()).ok).toBe(true);
  expect([f.state.issued, f.state.probes, f.state.reads]).toEqual([2, 0, 1]);
});

test("a credential first issued and used in this Context can renew once per read, including a rejected replacement; unrelated and Signed readers stay explicit", async () => {
  const f = await fixture(), ctx = f.context();
  const reader = await readerOf(ctx, f.config);
  const handle = await handleOf(ctx, f.config, TARGET.scope, reader);
  expect((await handle.summary()).ok).toBe(true);
  f.state.invalid.add(reader!);
  expect((await handle.summary()).ok).toBe(true);
  expect([f.state.issued, f.state.probes, f.state.reads]).toEqual([2, 1, 3]);
  f.state.denyAll = true;
  expect(await handle.summary()).toEqual({ ok: false, reason: "forbidden" });
  expect([f.state.issued, f.state.probes, f.state.reads]).toEqual([3, 2, 5]);
  expect(f.state.headerKinds).not.toContain("signed");
  f.state.denyAll = false;
  expect((await (await handleOf(ctx, f.config, TARGET.scope, "Session unrelated")).summary()).ok).toBe(true);
  expect((await (await handleOf(ctx, f.config, TARGET.scope, null)).summary()).ok).toBe(true);
  expect(f.state.headerKinds.slice(-2)).toEqual(["unrelated", "signed"]);
  let currentContextReads = 0;
  const next = { ...f.context(), fetch: (async (url, init) => { currentContextReads++; return f.fetch(url, init); }) as Fetch };
  expect((await (await handleOf(next, f.config, TARGET.scope)).summary()).ok).toBe(true);
  expect(currentContextReads).toBe(1);
  expect(f.state.issued).toBe(3);
});

test("a valid session denied another target is not renewed, and an invalid cached token gets only one replacement read without Signed fallback", async () => {
  const f = await fixture(); await sessionOf(f.context(), f.config);
  f.state.denyTarget = true;
  const denied = await managedReadsOf(f.context(), f.config);
  expect(await denied.read(async () => ({ ok: false as const, reason: "forbidden" }))).toEqual({ ok: false, reason: "forbidden" });
  expect([f.state.issued, f.state.probes]).toEqual([1, 1]);
  f.state.denyAll = true;
  const invalid = await managedReadsOf(f.context(), f.config); let attempts = 0;
  expect(await invalid.read(async () => { attempts++; return { ok: false as const, reason: "forbidden" }; })).toEqual({ ok: false, reason: "forbidden" });
  expect([attempts, f.state.issued]).toEqual([2, 2]);
  expect(f.state.headerKinds).not.toContain("signed");
});

test("session limits Stop outside the read callback with the actual advisory window; failed renewal never changes to Signed bootstrap", async () => {
  const f = await fixture(); f.state.refused = { reason: "rate-limited", retry: "75" };
  const manager = await managedReadsOf(f.context(), f.config); let reads = 0;
  const limited = await run(async () => { await manager.read(async () => { reads++; return { ok: true }; }); return { code: 0, lines: [] }; });
  expect([limited.code, reads, f.state.issued]).toEqual([1, 0, 1]);
  expect(limited.lines.join(" ")).toContain("rate-limited"); expect(limited.lines.join(" ")).toContain("75 seconds");
  const concurrent = await Promise.allSettled(Array.from({ length: 3 }, () => manager.session()));
  expect(concurrent.every(result => result.status === "rejected" && result.reason instanceof Stop)).toBe(true);
  expect(f.state.issued).toBe(2);
  f.state.refused = { reason: "rate-limited" };
  const unknown = await run(async () => { await sessionOf(f.context(), f.config); return { code: 0, lines: [] }; });
  expect(unknown.lines.join(" ")).toContain("did not report its request window");
  f.state.refused = null; const original = await sessionOf(f.context(), f.config);
  f.state.invalid.add(original!.reader()); f.state.refused = { reason: "unauthorized" };
  const renewal = await managedReadsOf(f.context(), f.config);
  await expect(renewal.read(async () => ({ ok: false, reason: "forbidden" }))).rejects.toBeInstanceOf(Stop);
  expect(await f.store.sessionCache!.read()).toBeNull();
  await expect(renewal.session()).rejects.toBeInstanceOf(Stop);
});

test("cache I/O failure is closed and token-free; mutation delegation is once-only and missing capability signers never export seeds", async () => {
  const f = await fixture();
  f.store.sessionCache!.read = async () => { throw new Error("TEST-private-cache must not be echoed"); };
  const failure = await run(async () => { await sessionOf(f.context(), f.config); return { code: 0, lines: [] }; });
  expect([failure.code, f.state.issued]).toEqual([1, 0]); expect(failure.lines.join(" ")).not.toContain("TEST-private-cache");
  const other = await fixture(), manager = await managedReadsOf(other.context(), other.config);
  const signed = signIntent({ v: 1, to: M, actor: keyIdOfSecret(SECRET), kind: "TEST", on: null, expected: {}, fields: {}, idempotencyKey: "TEST-once", notAfter: timeOf(START + 60_000) }, SECRET);
  expect((await manager.transport.submit(M.scope, signed, [])).answer).toBe("refused");
  expect([other.state.mutations, other.state.issued]).toEqual([1, 0]);
  let seeds = 0; other.store.signer = async () => null; other.store.secret = async () => { seeds++; return SECRET; };
  await expect(sessionOf(other.context(), other.config)).rejects.toBeInstanceOf(Stop); expect(seeds).toBe(0);
  expect(canonicalize(await other.store.config())).not.toContain("TEST-private-cache");
});

test("required custody sessions reuse an arbitrary supplied signer across fresh Contexts and stop every refusal before a target read", async () => {
  const f = await fixture(), signer = secretSigner(new Uint8Array(32).fill(23));
  f.store.signer = async () => { throw new Error("Config custody must not be consulted"); };
  f.store.secret = async () => { throw new Error("No seed may be exported"); };
  const sessions = await Promise.all(Array.from({ length: 3 }, () => requiredSessionOf(f.context(), f.config.service, M, signer)));
  await requiredSessionOf(f.context(), f.config.service, M, signer);
  expect(f.state.issued).toBe(1);
  expect(sessions.every(session => session.claims.key === signer.key && canonicalize(session.claims.membership) === canonicalize(M))).toBe(true);
  expect(signer.key).not.toBe(keyIdOfSecret(SECRET));
  expect((await f.store.config())?.key).toBe("device");
  f.state.now += 570_000; f.state.refused = { reason: "rate-limited", retry: "75" };
  let targetReads = 0;
  const limited = await run(async () => {
    await requiredSessionOf(f.context(), f.config.service, M, signer);
    targetReads++; return { code: 0, lines: [] };
  });
  expect([limited.code, f.state.issued, targetReads, f.state.reads]).toEqual([1, 2, 0, 0]);
  expect(limited.lines.join(" ")).toContain("rate-limited"); expect(limited.lines.join(" ")).toContain("75 seconds");
  expect(await f.store.sessionCache!.read()).toBeNull();
  f.state.refused = { reason: "unauthorized" };
  await expect(requiredSessionOf(f.context(), f.config.service, M, signer)).rejects.toBeInstanceOf(Stop);
  expect(JSON.stringify([sessions, await f.store.config(), limited])).not.toContain("TEST-private-cache");
});
