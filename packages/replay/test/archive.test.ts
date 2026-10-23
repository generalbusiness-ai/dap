// Judged in-memory fixture authority and owner/host replies remain stand-ins.
// This witnesses the portable adapter; local Git parsing has separate tests.
import { expect, test, vi } from "vitest";
import type { FactRef, ScopeId } from "@generalbusiness/dap-contract";
import { utf8 } from "@generalbusiness/dap-bytes";
import { ARCHIVE_HEAD_TRUST, ARCHIVE_SOURCE_TRUST, archiveSource, verifyArchive, type ArchiveData, type ArchiveReadPort, type ArchiveSourceOptions } from "../src/archive.ts";
import { MemorySource, type MemoryScope } from "../src/source.ts";
import { TRUSTS, verify } from "../src/verify.ts";
import { declaredGenesisFixture, observingDeliveryFixture, outcomeSnapshotFixture, outcomeValueFixture, type ArchiveFixture } from "./archive-fixtures.ts";

function port(scopes: readonly MemoryScope[]): ArchiveReadPort {
  return { async open(id, work) {
    work.scope();
    const held = scopes.find(scope => scope.scope.scope === id);
    if (!held) return { ok: false, result: "not-found", reason: "absent fixture ref", location: { scope: id } };
    for (const input of [...held.entries, ...held.retained]) work.bytes(utf8(input.bytes).length);
    work.spend({ entries: held.entries.length });
    const genesis = JSON.parse(held.entries[0]!.bytes), definition = genesis.input.seed.definition;
    const declaration = held.retained.find(input => input.kind === "definition" && input.digest === definition);
    const name = definition.startsWith("platform:") ? definition.split("@")[0] : declaration ? JSON.parse(declaration.bytes).name : null;
    const last = held.entries.at(-1)!;
    const archive: ArchiveData = { ...held, name, head: { seq: last.seq, hash: last.hash }, format: "sha1", commit: "a".repeat(40) };
    return { ok: true, archive };
  } };
}
const source = (fixture: ArchiveFixture, options?: ArchiveSourceOptions) => archiveSource(port(fixture.scopes), options);
const receipt = (fixture: ArchiveFixture, seq = 0): FactRef => ({ at: fixture.scopes[0]!.scope, seq, hash: fixture.scopes[0]!.entries[seq]!.hash });

// Invariant: adaptation preserves the native result, why, coverage and anchors;
// only the location-specific trust wording changes.
test.each([
  ["declared genesis", declaredGenesisFixture], ["outcome value", outcomeValueFixture],
  ["outcome snapshot", outcomeSnapshotFixture], ["observing delivery", observingDeliveryFixture],
] as const)("preserves native verification and missing-input diagnoses for %s", async (_name, make) => {
  const fixture = make(), expected = await verify(new MemorySource(fixture.scopes), fixture.options);
  const got = await verifyArchive(source(fixture), fixture.options);
  expect(got.kind).toBe("verification"); if (got.kind !== "verification") return;
  expect({ ...got.verification, report: { ...got.verification.report, trusts: got.verification.report.trusts.map(trust => trust === ARCHIVE_SOURCE_TRUST ? TRUSTS.sources : trust) } }).toEqual(expected);
  expect(got.verification.report.anchors).toEqual([]);
  expect(got.read.scopes).toBe(fixture.scopes.length);
  const missing = { ...fixture, scopes: fixture.scopes.map(scope => ({ ...scope, retained: scope.retained.filter(input => input.digest !== fixture.required.digest) })) };
  const absent = await verifyArchive(source(missing), fixture.options);
  expect(absent.kind).toBe("verification"); if (absent.kind !== "verification") return;
  expect(absent.verification.report.result).toBe("incomplete");
  expect(JSON.stringify(absent.verification.why)).toContain(fixture.required.digest);
});

// Invariant: a receipt is checked only after integrity through the archive head.
test("checks receipt scope, incarnation, position and hash after the entire prefix", async () => {
  const fixture = outcomeValueFixture(), fact = receipt(fixture), options = { ...fixture.options, mode: "integrity" as const };
  for (const [asked, expected] of [
    [fact, "archived"],
    [{ ...fact, seq: fixture.options.head!.seq + 1 }, "behind"],
    [{ ...fact, hash: `sha256:${"0".repeat(64)}` }, "mismatch"],
    [{ ...fact, at: { ...fact.at, inc: declaredGenesisFixture().scopes[0]!.scope.inc } }, "mismatch"],
    [{ ...fact, at: { ...fact.at, scope: declaredGenesisFixture().options.scope } }, "mismatch"],
  ] as const) {
    const got = await verifyArchive(source(fixture), { ...options, receipt: { fact: asked } });
    expect(got.kind).toBe("verification"); if (got.kind !== "verification") continue;
    expect(got.receipt?.result).toBe(expected);
    expect(got.integrity?.report.coverage[0]?.through).toBe(fixture.options.head!.seq);
  }
  const broken = { ...fixture, scopes: fixture.scopes.map((scope, index) => index ? scope : { ...scope, entries: scope.entries.map(entry => entry.seq === 1 ? { ...entry, bytes: entry.bytes.replace('"seq":1', '"seq":7') } : entry) }) };
  const got = await verifyArchive(source(broken), { ...options, receipt: { fact } });
  expect(got.kind).toBe("verification"); if (got.kind !== "verification") return;
  expect(got.integrity?.report.result).toBe("mismatch");
  expect(got.receipt?.result).toBe("unverified");
});

// Invariant: unread archive failures invent no native target or coverage, and
// no internal expected-head value pretends to be an independent caller pin.
test("keeps archive failures and source-selected head trust explicit", async () => {
  const fixture = declaredGenesisFixture();
  const got = await verifyArchive(source(fixture), { ...fixture.options, head: undefined });
  expect(got.kind).toBe("verification"); if (got.kind !== "verification") return;
  expect(got.verification.report.trusts).toContain(ARCHIVE_HEAD_TRUST);
  expect(got.verification.report.trusts).not.toContain(TRUSTS.head);
  expect(got.verification.report.trusts).toContain(TRUSTS.clock);
  for (const result of ["mismatch", "refused", "unavailable", "timeout", "limit", "not-found"] as const) {
    const location = { scope: fixture.options.scope, path: "journal/v1/head.json" };
    const stopped = archiveSource({ open: async () => ({ ok: false, result, reason: "actual read failure", location }) });
    expect(await verifyArchive(stopped, fixture.options)).toMatchObject({ kind: "archive-failure", result, location });
    const failed = await verifyArchive(stopped, fixture.options);
    expect(failed).not.toHaveProperty("verification"); expect(failed).not.toHaveProperty("native"); expect(failed).not.toHaveProperty("archive");
  }
});

// Invariant: all scope reads share the original limits and a deadline outcome
// waits for already-started owned I/O to settle before returning.
test("shares traversal limits and drains an owned read after deadline", async () => {
  const fixture = observingDeliveryFixture();
  for (const limits of [{ scopes: 1 }, { entries: 1 }, { bytes: 1 }]) {
    expect(await verifyArchive(source(fixture, { limits }), fixture.options)).toMatchObject({ kind: "archive-failure", result: "limit" });
  }
  vi.useFakeTimers();
  try {
    let finish!: () => void, returned = false, settled = false;
    const running = new Promise<void>(resolve => { finish = resolve; });
    const stalled = archiveSource({ open: async (_scope: ScopeId) => { await running; return { ok: false, result: "unavailable", reason: "finished owned read", location: {} }; }, settle: async () => { await running; settled = true; } }, { seconds: 1 });
    const pending = verifyArchive(stalled, fixture.options).then(result => { returned = true; return result; });
    await vi.advanceTimersByTimeAsync(1000);
    expect(returned).toBe(false); expect(settled).toBe(false);
    finish();
    expect(await pending).toMatchObject({ kind: "archive-failure", result: "timeout" });
    expect(settled).toBe(true);
  } finally { vi.useRealTimers(); }
});

// Exact commit probes of the same history share its distinct-scope slot;
// every physical receipt read still spends from the original work budget.
test("floor commit probes share the already opened scope allowance", async () => {
  const fixture = declaredGenesisFixture(), native = port(fixture.scopes), scope = fixture.scopes[0]!;
  let reads = 0;
  native.floorReceipt = async (_scope, _commit, work) => {
    work.scope(); work.spend({ calls: 1 }); reads++;
    return { ok: true, scope: scope.scope, through: fixture.options.head! };
  };
  const archived = archiveSource(native, { limits: { scopes: 1 } });
  expect((await archived.page(scope.scope.scope, 0, { bytes: 4096, entries: 1 })).ok).toBe(true);
  for (const commit of ["b".repeat(40), "c".repeat(40)]) expect(await archived.floorReceipt(scope.scope.scope, commit, { bytes: 4096 })).toMatchObject({ ok: true, through: fixture.options.head });
  expect(reads).toBe(2);
});
