import { expect, test } from "vitest";
import { runInDurableObject } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { PROPOSED_BOUNDS, type ScopeRef } from "@generalbusiness/dap-contract";
import { digestBytes, newIncarnation, scopeIdOf, utf8 } from "@generalbusiness/dap-bytes";
import { signedReader } from "@generalbusiness/dap-client";
import { ScopeIndexRows, type ScopeRegistration } from "../src/scope-index.ts";
import { route } from "../src/worker.ts";
import { sessionSettings } from "./session-settings.ts";
import { scopeCensusFixture } from "./support/scope-census-fixture.ts";

// Active-object snapshots exclude cold constructor migrations. No denial is
// permitted to run nativeBirth's archive recovery or write a serving counter.
const written = (stub: DurableObjectStub) => runInDurableObject(stub, async (_instance, state) => ({
  changes: state.storage.sql.exec<{ n: number }>("SELECT total_changes() AS n").one().n,
  alarm: await state.storage.getAlarm(),
}));

test("census admits the native founding install signer and denies member Signed, Session, wrong pin and missing readers without active-object writes", async () => {
  const f = await scopeCensusFixture({ members: true });
  try {
    const session = await f.memberSession();
    const admitted = await f.request(await f.reading());
    expect(admitted.status).toBe(200);
    expect(await admitted.json()).toEqual({ rows: f.rows, next: null });
    const before = await Promise.all([written(f.stub), written(f.R.object)]);
    const readers = [null, session,
      await signedReader(f.member, f.register.scope, "census", ""),
      await f.reading("", f.other.R.name)];
    for (const reader of readers) {
      const denied = await f.request(reader);
      expect(denied.status).toBe(403);
      expect(await denied.json()).toEqual({ error: "forbidden" });
    }
    expect(await f.index.list("", 100, undefined)).toEqual({ ok: false, reason: "forbidden" });
    expect(await Promise.all([written(f.stub), written(f.R.object)])).toEqual(before);

    // Age only the Native fixture clock, then sign the ordinary request on
    // that same clock. Its request is current; its recorded install/found
    // roots are old. Census independently uses the real host clock, on which
    // its own fresh signature is current. No clocks are substituted in code.
    // Signed headers use checkSignedRead directly, never the TEST readers-port
    // bypass or its session observer. Keep required mode explicit as well.
    await f.life.owner.required(async () => {
      expect(sessionSettings()).toMatchObject({ sessions: true, inspector: null });
      const current = await signedReader(f.operator, f.register.scope, "summary", "summary", { now: () => f.life.now() });
      const fresh = await f.life.wait(() => f.R.stub.summary(current));
      expect(fresh.ok).toBe(true);
      f.life.advance((PROPOSED_BOUNDS.intentLifetimeSeconds + 1) * 1000);
      const ordinary = await signedReader(f.operator, f.register.scope, "summary", "summary", { now: () => f.life.now() });
      const read = await f.life.wait(() => f.R.stub.summary(ordinary));
      expect(read).toEqual({ ok: false, reason: "forbidden" });
    });
    expect((await f.request(await f.reading())).status).toBe(200);
  } finally { f.life.release(); }
});

test("census binds trusted native row identity, preserves modes and absence, and paginates real SQLite without an empty final request", async () => {
  const f = await scopeCensusFixture();
  try {
    let after = ""; const rows: ScopeRegistration[] = [];
    for (let page = 0; page < 5; page++) {
      const response = await f.request(await f.reading(after), after, 3);
      expect(response.status).toBe(200);
      const body = await response.json() as { rows: ScopeRegistration[]; next: string | null };
      rows.push(...body.rows);
      if (body.next === null) break;
      after = body.next;
    }
    expect(rows).toEqual(f.rows);
    // A full final page still carries the explicit end marker.
    const full = await f.request(await f.reading(), "", f.rows.length);
    expect(await full.json()).toEqual({ rows: f.rows, next: null });
    const original = f.rows.find(row => row.at.scope === f.register.scope)!;
    for (const [column, wrong] of [
      ["inc", newIncarnation(crypto.getRandomValues(new Uint8Array(16)))],
      ["genesis", digestBytes(utf8("TEST wrong pinned genesis"))],
      ["kind", "directory"],
    ] as const) {
      await runInDurableObject(f.stub, (_instance, state) => { state.storage.sql.exec(`UPDATE known_scope SET ${column}=? WHERE scope=?`, wrong, f.register.scope); });
      const before = await written(f.stub);
      expect((await f.request(await f.reading())).status).toBe(403);
      expect(await written(f.stub)).toEqual(before);
      const restored = column === "genesis" ? original.genesis : original.at[column];
      await runInDurableObject(f.stub, (_instance, state) => { state.storage.sql.exec(`UPDATE known_scope SET ${column}=? WHERE scope=?`, restored, f.register.scope); });
    }
    f.settings.SCOPE_INDEX_MODE = "register";
    const unsupported = await f.request(await f.reading());
    expect(unsupported.status).toBe(501);
    expect(await unsupported.json()).toEqual({ error: "unsupported" });
    f.settings.SCOPE_INDEX_MODE = "enforce";
    const absent = await f.life.wait(async () => route(new Request(`${f.service}/v1/scope-index/census?cursor=&limit=100`,
      { headers: { authorization: await f.reading() } }), env.PLATFORM, { ARTIFACTS_CONFIG: f.settings.ARTIFACTS_CONFIG }));
    expect(absent.status).toBe(404);
    expect(await absent.json()).toEqual({ error: "absent" });
  } finally { f.life.release(); }
});

test("census returns next null on an exactly 100-row final SQLite page under native operator authority", async () => {
  const f = await scopeCensusFixture();
  try {
    // Extra rows are explicitly TEST index metadata, not claimed native births.
    // The pinned Register proof and signing authority remain genuine Native.
    const extras: ScopeRegistration[] = [];
    for (let ordinal = 0; ordinal < 100 - f.rows.length; ordinal++) {
      const hash = digestBytes(utf8(`TEST census metadata ${ordinal}`));
      const seed = { v: 1 as const, kind: "lane" as const, definition: hash, creator: null, cause: hash, ordinal };
      const at: ScopeRef = { scope: scopeIdOf(seed), inc: newIncarnation(crypto.getRandomValues(new Uint8Array(16))), kind: "lane" };
      extras.push({ at, genesis: hash });
    }
    await runInDurableObject(f.stub, (_instance, state) => {
      const rows = new ScopeIndexRows(state.storage.sql);
      for (const row of extras) if (!rows.register(row)) throw Error("TEST metadata registration failed");
    });
    const response = await f.request(await f.reading());
    expect(response.status).toBe(200);
    const expected = [...f.rows, ...extras].sort((a, b) => a.at.scope < b.at.scope ? -1 : 1);
    expect(expected).toHaveLength(100);
    expect(await response.json()).toEqual({ rows: expected, next: null });
  } finally { f.life.release(); }
});
