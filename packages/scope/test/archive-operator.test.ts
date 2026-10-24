/** Warm Native SQLite/internal-reader and actual ingress log observations.
 * Native Membership authority prepares the archive fixture; its host,
 * credentials and policy admission remain TEST stand-ins. Constructor DDL
 * and activation happen before the observation interval. This is not a
 * cold-object, authenticated installation or hosted recovery witness. */
import { runInDurableObject } from "cloudflare:test";
import { expect, onTestFinished, test, vi } from "vitest";
import type { OperationId, ScopeId } from "@generalbusiness/dap-contract";
import { archiveOperatorState, archiveRowDiagnostic, type ArchiveOperatorView } from "../src/archive-operator.ts";
import { ArchiveDriver } from "../src/archive-driver.ts";
import { canonicalize, digestBytes, utf8 } from "@generalbusiness/dap-bytes";
import { ArchiveRows } from "../src/archive-row.ts";
import { CredentialStore } from "../src/credential-store.ts";
import { at, creation, objectOf, rita } from "./fixtures-native.ts";
import { createNativeArchiveLane, archiveAuthorityBasis, archiveAuthorityPolicies } from "./support/archive-native-authority.ts";
import { ScriptedHost } from "./support/archive-driver.ts";
import { archivePolicies, archiveRepository, archiveSql } from "./support/archive.ts";
import { fixtureArchiveWiring } from "./worker.ts";

// The old unused RPC is removed. These six cases retain the internal reader's
// exact metadata purity proof; the existing-ingress log is witnessed below.
const quote = (name: string) => `"${name.replaceAll('"', '""')}"`;
function sqlite(state: DurableObjectState) {
  const schema = state.storage.sql.exec<{ type: string; name: string; tbl_name: string; sql: string | null }>(
    "SELECT type, name, tbl_name, sql FROM sqlite_master ORDER BY type, name").toArray();
  // Cloudflare's private KV backing is not application SQLite. Include the
  // full application schema and all its table values, including blobs.
  const tables = schema.filter(row => row.type === "table" && !row.name.startsWith("_cf_")).map(({ name }) => {
    const rows = state.storage.sql.exec(`SELECT * FROM ${quote(name)}`).toArray().map(row => Object.fromEntries(
      Object.entries(row).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => [key, value instanceof ArrayBuffer
        ? { blob: [...new Uint8Array(value)].map(byte => byte.toString(16).padStart(2, "0")).join("") } : value])));
    rows.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    return { name, rows };
  });
  return { schema, tables };
}

/** Traps cover even swallowed attempts. The RPC still runs through the
 * real stored SQLite reader. The separate ingress case uses the namespace stub. */
async function observed(object: DurableObjectStub, names: readonly ScopeId[], host?: ScriptedHost, resolve?: () => Promise<typeof archiveRepository>) {
  const attempted: string[] = [], queries: string[] = [], restore: (() => void)[] = [];
  const forbidden = (where: string): never => { attempted.push(where); return expect.fail(`operator observation reached ${where}`); };
  const before = await runInDurableObject(object, async (_instance, state) => ({ sql: sqlite(state), alarm: await state.storage.getAlarm() }));
  try {
    const spies = [
      vi.spyOn(ArchiveDriver.prototype, "run").mockImplementation(() => forbidden("driver.run")),
      vi.spyOn(ArchiveDriver.prototype, "wake").mockImplementation(() => forbidden("recovery/driver.wake")),
      vi.spyOn(ArchiveDriver.prototype, "committed").mockImplementation(() => forbidden("driver.committed")),
    ];
    restore.push(...spies.map(spy => () => spy.mockRestore()));
    if (host) {
      const providers = [
        vi.spyOn(host, "format").mockImplementation(() => forbidden("provider.format")),
        vi.spyOn(host, "ref").mockImplementation(() => forbidden("provider.ref")),
        vi.spyOn(host, "objects").mockImplementation(() => forbidden("provider.objects")),
        vi.spyOn(host, "readObject").mockImplementation(() => forbidden("provider.readObject")),
        vi.spyOn(host, "mintArchive").mockImplementation(() => forbidden("provider.mintArchive")),
        vi.spyOn(host, "sendArchive").mockImplementation(() => forbidden("provider.sendArchive")),
        vi.spyOn(host, "revokeArchive").mockImplementation(() => forbidden("provider.revokeArchive")),
      ];
      restore.push(...providers.map(spy => () => spy.mockRestore()));
    }
    if (resolve) {
      const original = vi.mocked(resolve).getMockImplementation();
      vi.mocked(resolve).mockImplementation(() => forbidden("target.resolve"));
      restore.push(() => { if (original) vi.mocked(resolve).mockImplementation(original); });
    }
    await runInDurableObject(object, (_instance, state) => {
      const native = state.storage.sql, original = native.exec, descriptor = Object.getOwnPropertyDescriptor(native, "exec");
      native.exec = (function (this: SqlStorage, ...args: Parameters<SqlStorage["exec"]>) {
        queries.push(args[0]);
        // This view owns bounded metadata SELECTs only. A first-turn path,
        // schema initialization, native history scan or write is a failure.
        if (!args[0].startsWith("SELECT ") || !/\bFROM meta\b/.test(args[0])) forbidden(`SQL: ${args[0]}`);
        return original.apply(this, args);
      }) as SqlStorage["exec"];
      restore.push(() => { if (descriptor) Object.defineProperty(native, "exec", descriptor); else Reflect.deleteProperty(native, "exec"); });
      const setters = [
        vi.spyOn(state.storage, "setAlarm").mockImplementation(() => forbidden("setAlarm")),
        vi.spyOn(state.storage, "deleteAlarm").mockImplementation(() => forbidden("deleteAlarm")),
        vi.spyOn(state, "waitUntil").mockImplementation(() => forbidden("background/recovery waitUntil")),
      ];
      restore.push(...setters.map(spy => () => spy.mockRestore()));
    });
    const answers: ArchiveOperatorView[] = [];
    for (const name of names) answers.push(await runInDurableObject(object, (_instance, state) => archiveOperatorState(archiveSql(state), name, () => state.storage.getAlarm())));
    // Restore instrumentation before taking the independent full snapshot.
    for (const undo of restore.splice(0).reverse()) undo();
    const after = await runInDurableObject(object, async (_instance, state) => ({ sql: sqlite(state), alarm: await state.storage.getAlarm() }));
    expect(attempted).toEqual([]); expect(after).toEqual(before);
    return { answers, queries, alarm: before.alarm };
  } finally { for (const undo of restore.reverse()) undo(); }
}

async function fixture(phase: "absent" | "target" | "confirmed" | "stopped" | "pending") {
  const lane = await createNativeArchiveLane(), host = new ScriptedHost("sha1");
  const resolve = vi.fn(async () => { host.targets++; return archiveRepository; });
  fixtureArchiveWiring.set(lane.name, { policies: { fixture: "archive-policies", registry: archiveAuthorityPolicies(lane, archivePolicies) },
    fixtureSources: archiveAuthorityBasis(lane)!.pins, target: { fixture: "archive-target", resolve }, provider: host,
    ...(phase === "stopped" ? { maxBytes: 1 } : {}) });
  onTestFinished(() => { fixtureArchiveWiring.delete(lane.name); });
  await lane.restart();
  if (phase !== "absent" && phase !== "target") {
    host.missingMint = phase === "pending";
    await lane.did(rita, "remark", { on: 0, fields: { text: "operator archive fixture" } });
    expect(await lane.alarm()).toBe(true);
  }
  // A target-only row is valid operational bookkeeping, not proof of a
  // planning attempt or confirmed progress. Seed it with the actual store.
  if (phase === "target") await lane.inside(state => new ArchiveRows(archiveSql(state), lane.at).target(archiveRepository, "sha1"));
  // Warm the same physical object before any method-purity snapshot.
  const row = await lane.inside(state => new ArchiveRows(archiveSql(state), lane.at).load());
  return { lane, host, resolve, row };
}

test.for(["absent", "target", "confirmed", "stopped", "pending"] as const)("a warm operator archive view reports %s without changing SQLite or its alarm", async (phase, context) => {
  const { lane, host, resolve, row } = await fixture(phase);
  if (phase === "absent") expect(row).toBeNull();
  else {
    expect(row).not.toBeNull();
    expect(row!.stopped?.reason ?? null).toBe(phase === "stopped" ? "limit" : null);
    expect(row!.pending !== null).toBe(phase === "pending");
    expect(row!.confirmed !== null).toBe(phase === "confirmed");
  }
  if (phase === "pending") {
    expect(row!.next).not.toBeNull();
    // A deliberate canceled-alarm stand-in: the view must show the actual
    // missing platform alarm, without rearming the still-persisted wake.
    await lane.inside(state => state.storage.deleteAlarm());
  } else await lane.inside(state => state.storage.setAlarm(Date.parse(at(900))));
  const wake = await lane.inside(state => new ArchiveRows(archiveSql(state), lane.at).storedWake());
  const measured = await observed(lane.object, [lane.name, creation().name], host, resolve), view = measured.answers[0]!;
  expect(measured.answers[1]).toEqual({ state: "unknown", reason: "scope" });
  expect(view.state).toBe("read"); if (view.state !== "read") expect.fail("a warm valid scope must be read");
  expect(view.storedWake).toEqual(wake === null ? { state: "absent" } : { state: "present", ...wake });
  expect(view.platformAlarm).toEqual(phase === "pending" ? { state: "absent" } : { state: "present", at: Date.parse(at(900)) });
  expect(view.row).toEqual(row === null ? { state: "absent" } : { state: "present", rowDigest: row.stopped?.reason === "limit" && row.pending === null ? digestBytes(utf8(canonicalize(row))) : null, restartGeneration: 0, at: row.at, repository: row.repository, format: row.format,
    phase, reason: row.stopped?.reason ?? null, confirmed: row.confirmed,
    pendingMark: row.pending === null ? null : { commit: row.pending.commit, parent: row.pending.parent, through: row.pending.through,
      markedAt: row.pending.markedAt, ...(row.pending.layout === 2 ? { layout: 2 } : {}) }, attempts: row.attempts, next: row.next });
  (context.task.meta as Record<string, unknown>)["operatorObservation"] = { phase, queries: measured.queries, platformAlarm: measured.alarm,
    qualification: "Warm internal reader only; exact application SQLite and actual platform alarm unchanged. Constructor DDL/activation, authenticated installation, atomic SQL/alarm snapshot and hosted recovery are not established." };

  if (phase === "stopped") {
    await lane.inside(state => new ArchiveRows(archiveSql(state), lane.at).stop("TEST PRIVATE REASON", "TEST PRIVATE DETAIL"));
    const masked = (await observed(lane.object, [lane.name], host, resolve)).answers[0]!;
    expect(masked).toEqual({ ...view, row: { ...view.row, reason: "unknown", rowDigest: null } });
    expect(JSON.stringify(masked)).not.toContain("TEST PRIVATE");
  }
  if (phase === "absent") {
    // Deliberate metadata damage is not a Native transition. Unknown must
    // stay distinct from absent, without schema repair or synthesized state.
    await lane.inside(state => state.storage.sql.exec("INSERT INTO meta(k,v) VALUES ('archive-row-1','{broken')"));
    const unknownRow = (await observed(lane.object, [lane.name], host, resolve)).answers[0]!;
    expect(unknownRow).toEqual({ state: "read", row: { state: "unknown" }, storedWake: view.storedWake, platformAlarm: view.platformAlarm });
    await lane.inside(state => state.storage.sql.exec("INSERT INTO meta(k,v) VALUES ('archive-wake-1','{broken') ON CONFLICT(k) DO UPDATE SET v = excluded.v"));
    expect((await observed(lane.object, [lane.name], host, resolve)).answers).toEqual([
      { state: "read", row: { state: "unknown" }, storedWake: { state: "unknown" }, platformAlarm: view.platformAlarm },
    ]);
    await lane.inside(state => state.storage.sql.exec("UPDATE meta SET v = '{broken' WHERE k = 'scope'"));
    expect((await observed(lane.object, [lane.name], host, resolve)).answers).toEqual([{ state: "unknown", reason: "scope" }]);
  }
});

test("a warm uncreated operator target stays absent and does not initialize missing metadata", async () => {
  const { name } = creation(), object = objectOf(name);
  // This first in-object access intentionally allows constructor effects.
  await runInDurableObject(object, (_instance, state) => { expect(sqlite(state).tables.find(table => table.name === "meta")).toBeDefined(); });
  expect((await observed(object, [name])).answers).toEqual([{ state: "absent" }]);
  const absent = await runInDurableObject(object, (_instance, state) => archiveRowDiagnostic(archiveSql(state), name, () => state.storage.getAlarm()));
  expect([absent.state, absent.phase, absent.confirmed, absent.pendingMark, absent.storedWake]).toEqual(["absent", "absent", "unknown", "unknown", "unknown"]);
  await runInDurableObject(object, (_instance, state) => state.storage.sql.exec("DROP TABLE meta"));
  expect((await observed(object, [name])).answers).toEqual([{ state: "unknown", reason: "scope" }]);
});


test.for(["nativeBirth", "readiness", "queryItems", "proofSource"] as const)("existing %s ingress logs one bounded archive diagnostic before recovery per activation", async ingress => {
  const { lane, row } = await fixture("pending");
  // TEST provider-mint stand-in: real private custody/enrollment, not a
  // provider call or fabricated expiry queue. Its wake must use the same
  // diagnostic ordering as archive recovery on the next activation.
  await lane.inside(state => {
    const custody = new CredentialStore(archiveSql(state), () => lane.at);
    expect(custody.putRead({ id: "operator-expiry-fixture", mint: "900:0" as OperationId,
      attempt: 1, ends: at(900), plaintext: "TEST PRIVATE expiry credential" })).toBe("stored");
    expect(custody.expiryWake(lane.c.clock.now)).toBe(at(900));
  });
  const seen: unknown[][] = [], order: string[] = [];
  const logging = vi.spyOn(console, "info").mockImplementation((...args: unknown[]) => {
    if (args[0] === "archive-row-diagnostic-v1") { seen.push(args); order.push("diagnostic"); }
  });
  const waking = vi.spyOn(ArchiveDriver.prototype, "wake").mockImplementation(() => { order.push("recovery"); return null; });
  const originalLoad = ArchiveRows.prototype.loadSnapshot;
  const loading = vi.spyOn(ArchiveRows.prototype, "loadSnapshot").mockImplementation(function (this: ArchiveRows, ...args: Parameters<ArchiveRows["loadSnapshot"]>) {
    order.push("diagnostic-row-read");
    return originalLoad.apply(this, args);
  });
  try {
    // Install instrumentation before eviction/activation, not in a callback
    // after the constructor has already completed its synchronous reads.
    await lane.restart();
    await lane.inside(async (_state, instance) => {
      order.push("ingress");
      const object = instance as { nativeBirth(at: unknown, milliseconds: number): unknown; readiness(): unknown;
        queryItems(encoded: unknown, reader: unknown): unknown; proofSource(fact: unknown, maxBytes: number, milliseconds: number): unknown;
        observed(method: "queryItems", args: unknown[], identity: { request: null; trace: null }): Promise<unknown> };
      const enter = () => ingress === "nativeBirth" ? object.nativeBirth(null, 1) : ingress === "readiness" ? object.readiness()
        : ingress === "queryItems" ? object.queryItems(null, null) : object.proofSource(null, 1, 1);
      await Promise.all([enter(), enter()]);
      // This existing async ingress awaits the constructor's retained
      // promise, deterministically settling the log without a timer.
      await object.observed("queryItems", [null, null], { request: null, trace: null });
    });
    expect(order.indexOf("diagnostic-row-read")).toBeGreaterThanOrEqual(0);
    expect(order.indexOf("diagnostic-row-read")).toBeLessThan(order.indexOf("ingress"));
    expect(loading).toHaveBeenCalledTimes(1);
    const object = lane.object as unknown as { serving(): Promise<unknown> };
    await object.serving();
    await object.serving();
    const lines = seen.filter(args => (args[1] as { scope?: string }).scope === lane.name);
    expect(lines).toHaveLength(1);
    expect(loading).toHaveBeenCalledTimes(1);
    expect(order.indexOf("diagnostic")).toBeGreaterThanOrEqual(0);
    expect(order.indexOf("recovery")).toBeGreaterThan(order.indexOf("diagnostic"));
    const value = lines[0]![1] as Record<string, unknown>;
    expect(Object.keys(value).sort()).toEqual(["confirmed", "pendingMark", "phase", "platformAlarm", "reason", "restartGeneration", "rowDigest", "scope", "state", "storedWake"]);
    expect(value["phase"]).toBe("pending");
    expect(value["pendingMark"]).toEqual({ commit: row!.pending!.commit, through: row!.pending!.through });
    expect(JSON.stringify(value)).not.toMatch(/manifest|credential|token|secret|TEST PRIVATE/);
  } finally { loading.mockRestore(); waking.mockRestore(); logging.mockRestore(); }
});
