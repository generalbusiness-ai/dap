import { expect, test } from "vitest";
import { ArchiveBudget, ArchiveStopped, ARCHIVE_BOUNDS } from "../src/archive-budget.ts";
import { admitArchiveMigration } from "../src/archive-bootstrap-cost.ts";

test("one pass admits exact cumulative limits, refuses the next unit atomically and never resets after failure", () => {
  const budget = new ArchiveBudget({}, () => 0);
  budget.spend(ARCHIVE_BOUNDS);
  expect(budget.admitted()).toEqual(ARCHIVE_BOUNDS);
  expect(() => budget.spend({ attempts: 1 })).toThrow(ArchiveStopped);
  expect(() => budget.spend({})).toThrow(ArchiveStopped);
  expect(budget.admitted()).toEqual(ARCHIVE_BOUNDS);
  const refused = new ArchiveBudget({ nodes: 2, metadata: 3 }, () => 0);
  try { refused.spend({ nodes: 3, metadata: 5 }); expect.fail("The actual debit must refuse."); }
  catch (error) {
    expect(error).toBeInstanceOf(ArchiveStopped);
    expect((error as ArchiveStopped).capacityRefusal).toEqual({ kind: "debit",
      requested: { entries: 0, attempts: 0, nodes: 3, calls: 0, metadata: 5, inputWork: 0 },
      reserved: { entries: 0, attempts: 0, nodes: 0, calls: 0, metadata: 0, inputWork: 0 },
      used: { entries: 0, attempts: 0, nodes: 0, calls: 0, metadata: 0, inputWork: 0 },
      limit: { ...ARCHIVE_BOUNDS, nodes: 2, metadata: 3 },
      shortfall: { entries: 0, attempts: 0, nodes: 1, calls: 0, metadata: 2, inputWork: 0 } });
  }
  expect(refused.admitted()).toEqual({ entries: 0, attempts: 0, nodes: 0, calls: 0, metadata: 0, inputWork: 0 });
  const unsafe = new ArchiveBudget({ metadata: 2 }, () => 0);
  // Each operand is safe, but their sum rounds above MAX_SAFE_INTEGER.
  // The refusal still happens; it must not report a rounded shortfall.
  expect(unsafe.lookahead({ metadata: 2 }, () => unsafe.spend({ metadata: Number.MAX_SAFE_INTEGER })))
    .toEqual({ kind: "limited", refusal: null });
  expect(unsafe.admitted().metadata).toBe(0);
  for (const key of Object.keys(ARCHIVE_BOUNDS) as (keyof typeof ARCHIVE_BOUNDS)[]) {
    const one = new ArchiveBudget({}, () => 0);
    expect(() => one.spend({ [key]: ARCHIVE_BOUNDS[key] + 1 })).toThrow(ArchiveStopped);
    expect(one.admitted()[key]).toBe(0);
  }
});

test("bad costs, unknown fields, unsafe arithmetic and raised limits fail closed before native work", () => {
  for (const inputWork of [-1, -0, 0.5, Infinity, NaN, Number.MAX_SAFE_INTEGER]) {
    const budget = new ArchiveBudget({}, () => 0); let calls = 0;
    const sql = budget.native({ exec() { calls++; return { toArray: () => [] }; } }, () => ({ inputWork, metadata: 2 }));
    expect(() => sql.exec("SELECT 1")).toThrow(ArchiveStopped); expect(calls).toBe(0);
  }
  expect(() => new ArchiveBudget({ calls: ARCHIVE_BOUNDS.calls + 1 })).toThrow(ArchiveStopped);
  expect(() => new ArchiveBudget({ extra: 1 } as never)).toThrow(ArchiveStopped);
  expect(() => new ArchiveBudget({}, () => 0).spend({ extra: 1 } as never)).toThrow(ArchiveStopped);
  // Generic/malformed limit is not evidence of a particular budget axis.
  for (const bad of [{ extra: 1 }, { nodes: -1 }]) {
    try { new ArchiveBudget({}, () => 0).spend(bad as never); expect.fail("Bad cost must refuse."); }
    catch (error) { expect(error).toMatchObject({ reason: "limit", capacityRefusal: null }); }
  }
  const generic = new ArchiveBudget({}, () => 0);
  expect(() => generic.stop("limit")).toThrow(expect.objectContaining({ capacityRefusal: null }));
  const migration = new ArchiveBudget({ calls: 0 }, () => 0), refusals: unknown[] = [];
  expect(admitArchiveMigration(8 * 1024 * 1024, migration, {}, 146, refusal => refusals.push(refusal))).toBe(false);
  expect(refusals).toMatchObject([{ kind: "migration-quote", shortfall: { calls: expect.any(Number) } }]);
  const snapshot = refusals[0] as { shortfall: { calls: number } };
  expect(snapshot.shortfall.calls).toBeGreaterThan(0);
  refusals.length = 0;
  // A too-small transport maximum is a hard shape refusal, not this quote.
  expect(admitArchiveMigration(1, migration, {}, 146, refusal => refusals.push(refusal))).toBe(false);
  expect(refusals).toEqual([]);
});

test("native reservations include returned metadata and input work before SQL, and a terminal failure makes no further calls", () => {
  const budget = new ArchiveBudget({ calls: 1, metadata: 3, inputWork: 5 }, () => 0); let calls = 0;
  const sql = budget.native({ exec() { calls++; return { toArray: () => [{ n: 1 }] }; } }, () => ({ metadata: 3, inputWork: 2 }));
  expect(sql.exec("SELECT 1").toArray()).toEqual([{ n: 1 }]);
  expect(budget.admitted()).toMatchObject({ calls: 1, metadata: 3, inputWork: 5 });
  expect(() => sql.exec("SELECT 1")).toThrow(ArchiveStopped); expect(calls).toBe(1);
  const failing = new ArchiveBudget({}, () => 0), native = failing.native({ exec() { throw new Error("native unavailable"); } }, () => ({ metadata: 0, inputWork: 0 }));
  expect(() => native.exec("SELECT 1")).toThrow("archive-unavailable");
  expect(() => failing.spend({})).toThrow("archive-unavailable");
});

test("metadata lookahead keeps completed debits and refuses before SQL would consume the selected prefix's finish allowance", () => {
  // A counted SQL port, not a SQLite/privacy witness: the invariant is the
  // budget's before-call debit and the unchanged final cumulative limit.
  let clockReads = 0;
  const budget = new ArchiveBudget({ calls: 3, metadata: 12, inputWork: 30 }, () => { clockReads++; return 0; });
  const reserve = { calls: 1, metadata: 8, inputWork: 20 }; let calls = 0;
  const sql = budget.native({ exec() { calls++; return { toArray: () => [{ n: 1 }] }; } }, () => ({ metadata: 3, inputWork: 2 }));
  const limited = budget.lookahead(reserve, () => {
    sql.exec("SELECT 1");
    sql.exec("SELECT 2"); // This would take metadata needed by the finish.
    return "must not finish lookahead";
  });
  expect(limited).toEqual({ kind: "limited", refusal: { kind: "debit",
    requested: { entries: 0, attempts: 0, nodes: 0, calls: 1, metadata: 3, inputWork: 5 },
    reserved: { entries: 0, attempts: 0, nodes: 0, calls: 1, metadata: 8, inputWork: 20 },
    used: { entries: 0, attempts: 0, nodes: 0, calls: 1, metadata: 3, inputWork: 5 },
    limit: { ...ARCHIVE_BOUNDS, calls: 3, metadata: 12, inputWork: 30 },
    shortfall: { entries: 0, attempts: 0, nodes: 0, calls: 0, metadata: 2, inputWork: 0 } } });
  expect(calls).toBe(1);
  expect(budget.admitted()).toMatchObject({ calls: 1, metadata: 3, inputWork: 5 });
  const beforeObservation = { clockReads, spent: budget.admitted() };
  expect(budget.capacityRefusal({ metadata: 10 }, "finish-quote")).toMatchObject({ kind: "finish-quote", shortfall: { metadata: 1 } });
  expect({ clockReads, spent: budget.admitted() }).toEqual(beforeObservation);
  // The forecast is a copied value; changing the caller's object during a
  // later attempt cannot release the protected allowance.
  const second = budget.lookahead(reserve, () => {
    reserve.metadata = 0;
    // Native metadata helpers may translate a caught SQL error to missing.
    // That cannot turn this refused request into a usable candidate result.
    try { sql.exec("SELECT 3"); } catch { /* Simulate that boundary. */ }
    return "must not escape the pending shortage";
  });
  expect(second).toEqual(limited); // Copied reserve and first refused debit survive the caught exception.
  expect(calls).toBe(1);
  expect(budget.lookahead({ metadata: 10 }, () => "unreachable")).toMatchObject({ kind: "limited",
    refusal: { kind: "lookahead-reserve", requested: { metadata: 10 }, reserved: { metadata: 0 }, used: { metadata: 3 }, shortfall: { metadata: 1 } } });
  expect(budget.lookahead({ inputWork: 20 }, () => 7)).toEqual({ kind: "read", value: 7 });
  budget.spend({ calls: 2, metadata: 9, inputWork: 25 });
  expect(budget.admitted()).toMatchObject({ calls: 3, metadata: 12, inputWork: 30 });
  expect(() => budget.spend({ metadata: 1 })).toThrow("archive-limit");
  expect(() => budget.spend({})).toThrow("archive-limit");
});

test("structured asynchronous metadata lookahead keeps the finish reserve across an awaited gate and returns only after caught shortage settles", async () => {
  // An explicit metadata-provider gate, not a Git/network/frame witness.
  const budget = new ArchiveBudget({ calls: 3, metadata: 12, inputWork: 30 }, () => 0);
  const reserve = { calls: 1, metadata: 8, inputWork: 20 }; let calls = 0, release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const pending = budget.lookaheadAsync(reserve, async () => {
    budget.spend({ calls: 1, metadata: 3, inputWork: 5 }); calls++;
    await budget.wait(() => gate);
    try { budget.spend({ calls: 1, metadata: 3, inputWork: 5 }); calls++; }
    catch { return "missing after caught shortage"; }
    return "metadata";
  });
  expect(calls).toBe(1);
  reserve.metadata = 0; // The guard owns its original copied forecast.
  release();
  expect(await pending).toMatchObject({ kind: "limited", refusal: { kind: "debit",
    reserved: { metadata: 8 }, used: { metadata: 3 }, shortfall: { metadata: 2 } } });
  expect(calls).toBe(1);
  expect(budget.admitted()).toMatchObject({ calls: 1, metadata: 3, inputWork: 5 });
  budget.spend({ calls: 2, metadata: 9, inputWork: 25 });
  expect(budget.admitted()).toMatchObject({ calls: 3, metadata: 12, inputWork: 30 });
  expect(() => budget.spend({ inputWork: 1 })).toThrow("archive-limit");
});

test("original deadline and monotone clock fence asynchronous lookahead and reject a delayed value before cache or SQL continuation", async () => {
  let now = 0, resolve!: (value: number) => void, calls = 0, cached = false;
  const budget = new ArchiveBudget({}, () => now, 10);
  const sql = budget.native({ exec() { calls++; return { toArray: () => [] }; } }, () => ({ metadata: 0, inputWork: 0 }));
  const pending = budget.lookaheadAsync({}, () => new Promise<number>(done => { resolve = done; })).then(() => { sql.exec("SELECT 1"); cached = true; });
  now = 10;
  await expect(pending).rejects.toThrow("archive-timeout");
  resolve(1); await Promise.resolve(); await Promise.resolve();
  expect(cached).toBe(false); expect(calls).toBe(0);
  expect(() => budget.spend({})).toThrow("archive-timeout");
  let clock = 2; const backwards = new ArchiveBudget({}, () => clock); clock = 1;
  expect(() => backwards.check()).toThrow("archive-unavailable");
});

test("a completed read releases only its unused byte charge and preserves every operation count", () => {
  const budget = new ArchiveBudget({ metadata: 12, inputWork: 37 }, () => 0);
  const ceiling = { entries: 1, attempts: 4, nodes: 3, calls: 2, metadata: 10, inputWork: 31 };
  const handle = budget.reserve(ceiling);
  expect(budget.admitted()).toEqual(ceiling);
  expect(budget.reservationCosts()).toMatchObject({ metadataReserved: 10, metadataSettled: 10, unsettledMetadata: 10, settlementRefusal: "none" });
  expect(budget.canSpend({ metadata: 3 })).toBe(false);
  // The handle owns the admitted ceiling, not this caller's later mutation.
  ceiling.metadata = 0; ceiling.inputWork = 0;
  budget.settle(handle, 3);
  expect(budget.admitted()).toEqual({ entries: 1, attempts: 4, nodes: 3, calls: 2, metadata: 3, inputWork: 10 });
  expect(budget.reservationCosts()).toMatchObject({ metadataReserved: 10, metadataSettled: 3, unsettledMetadata: 0, settlementRefusal: "none" });
  expect(budget.canSpend({ metadata: 9, inputWork: 27 })).toBe(true);
  budget.spend({ metadata: 9, inputWork: 27 });
  expect(budget.admitted()).toMatchObject({ metadata: 12, inputWork: 37, calls: 2, nodes: 3, attempts: 4, entries: 1 });
  expect(budget.reservationCosts()).toMatchObject({ metadataReserved: 19, metadataSettled: 12, unsettledMetadata: 0 });

  const pureWork = new ArchiveBudget({}, () => 0);
  const work = pureWork.reserve({ calls: 1, inputWork: 9 });
  pureWork.settle(work, 0);
  expect(pureWork.admitted()).toMatchObject({ calls: 1, metadata: 0, inputWork: 9 });
});

test("W2 a throwing SQL read keeps its full reservation and cannot start another read", () => {
  // Counted synchronous SQL stand-in: this witnesses the budget boundary only.
  const budget = new ArchiveBudget({ metadata: 10, inputWork: 40 }, () => 0);
  let calls = 0, measured = 0;
  const sql = budget.native({ exec() { calls++; throw new Error("scripted read failure"); } },
    () => ({ metadata: 10, inputWork: 30 }), () => { measured++; return 0; });
  expect(() => sql.exec("SELECT 1")).toThrow("archive-unavailable");
  expect(calls).toBe(1); expect(measured).toBe(0);
  expect(budget.admitted()).toMatchObject({ calls: 1, metadata: 10, inputWork: 40 });
  expect(budget.reservationCosts()).toMatchObject({ metadataReserved: 10, metadataSettled: 10, unsettledMetadata: 10, settlementRefusal: "none" });
  expect(() => sql.exec("SELECT 2")).toThrow("archive-unavailable");
  expect(calls).toBe(1);

  // A still-outstanding read also consumes capacity before any terminal error.
  const held = new ArchiveBudget({ metadata: 10, inputWork: 40 }, () => 0);
  held.reserve({ calls: 1, metadata: 10, inputWork: 40 });
  const next = held.native({ exec() { calls++; return { toArray: () => [] }; } }, () => ({ metadata: 1, inputWork: 0 }));
  expect(() => next.exec("SELECT 3")).toThrow("archive-limit");
  expect(calls).toBe(1);
  expect(held.admitted()).toMatchObject({ calls: 1, metadata: 10, inputWork: 40 });
  expect(held.reservationCosts()).toMatchObject({ metadataReserved: 10, metadataSettled: 10, unsettledMetadata: 10 });
});

test("a measured SQL receipt settles its bytes once while the default SQL charge stays unchanged", () => {
  // Scripted rows and byte measurement, not a physical SQLite sizing witness.
  const budget = new ArchiveBudget({}, () => 0); let calls = 0, measurements = 0;
  const source = { exec() { calls++; return { toArray: () => [{ value: "ok" }] }; } };
  const measured = budget.native(source, () => ({ metadata: 8, inputWork: 0 }), rows => {
    measurements++; expect(rows).toEqual([{ value: "ok" }]);
    expect(budget.admitted()).toMatchObject({ calls: 1, metadata: 8, inputWork: 8 });
    return 2;
  });
  expect(measured.exec("SELECT value").toArray()).toEqual([{ value: "ok" }]);
  expect(budget.admitted()).toMatchObject({ calls: 1, metadata: 2, inputWork: 2 });
  const unchanged = budget.native(source, () => ({ metadata: 3, inputWork: 2 }));
  expect(unchanged.exec("SELECT value").toArray()).toEqual([{ value: "ok" }]);
  expect(calls).toBe(2); expect(measurements).toBe(1);
  expect(budget.admitted()).toMatchObject({ calls: 2, metadata: 5, inputWork: 7 });
  expect(budget.reservationCosts()).toMatchObject({ metadataReserved: 11, metadataSettled: 5, unsettledMetadata: 0 });
});

test("W3 invalid received sizes are recorded without releasing a reservation or reviving the pass", () => {
  for (const received of [-1, -0, 0.5, NaN, Infinity, 11]) {
    const budget = new ArchiveBudget({}, () => 0), handle = budget.reserve({ calls: 1, metadata: 10, inputWork: 40 });
    expect(() => budget.settle(handle, received)).toThrow("archive-limit");
    expect(budget.admitted()).toMatchObject({ calls: 1, metadata: 10, inputWork: 40 });
    expect(budget.reservationCosts()).toMatchObject({ metadataReserved: 10, metadataSettled: 10,
      unsettledMetadata: 10, settlementRefusal: "invalid-received" });
    expect(() => budget.settle(handle, 0)).toThrow("archive-limit");
    expect(() => budget.spend({})).toThrow("archive-limit");
    expect(budget.admitted()).toMatchObject({ metadata: 10, inputWork: 40 });
  }
});

test("W3 unknown, foreign and reused reservation handles cannot create credit", () => {
  const unknown = new ArchiveBudget({}, () => 0);
  expect(() => unknown.settle({}, 0)).toThrow("archive-limit");
  expect(unknown.reservationCosts()).toMatchObject({ metadataReserved: 0, metadataSettled: 0,
    unsettledMetadata: 0, settlementRefusal: "unknown-reservation" });

  const owner = new ArchiveBudget({}, () => 0), other = new ArchiveBudget({}, () => 0);
  const handle = owner.reserve({ calls: 1, metadata: 10, inputWork: 40 });
  other.reserve({ calls: 1, metadata: 10, inputWork: 40 });
  expect(() => other.settle(handle, 0)).toThrow("archive-limit");
  expect(other.reservationCosts()).toMatchObject({ metadataSettled: 10, unsettledMetadata: 10, settlementRefusal: "unknown-reservation" });
  expect(owner.reservationCosts()).toMatchObject({ metadataSettled: 10, unsettledMetadata: 10, settlementRefusal: "none" });
  owner.settle(handle, 3);
  expect(() => owner.settle(handle, 0)).toThrow("archive-limit");
  expect(owner.admitted()).toMatchObject({ calls: 1, metadata: 3, inputWork: 12 });
  expect(owner.reservationCosts()).toMatchObject({ metadataReserved: 10, metadataSettled: 3,
    unsettledMetadata: 0, settlementRefusal: "unknown-reservation" });
});

test("an outstanding asynchronous read stays charged while lookahead protects the selected finish", async () => {
  const budget = new ArchiveBudget({ calls: 3, metadata: 12, inputWork: 40 }, () => 0);
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const pending = budget.lookaheadAsync({ calls: 1, metadata: 8, inputWork: 24 }, async () => {
    const first = budget.reserve({ calls: 1, metadata: 3, inputWork: 6 });
    await budget.wait(() => gate);
    budget.settle(first, 1);
    const second = budget.reserve({ calls: 1, metadata: 2, inputWork: 4 });
    budget.settle(second, 2);
    return "received";
  });
  expect(budget.admitted()).toMatchObject({ calls: 1, metadata: 3, inputWork: 6 });
  expect(budget.reservationCosts()).toMatchObject({ metadataSettled: 3, unsettledMetadata: 3 });
  release();
  expect(await pending).toEqual({ kind: "read", value: "received" });
  budget.spend({ calls: 1, metadata: 8, inputWork: 24 });
  expect(budget.admitted()).toMatchObject({ calls: 3, metadata: 11, inputWork: 30 });
  expect(budget.reservationCosts()).toMatchObject({ metadataReserved: 13, metadataSettled: 11, unsettledMetadata: 0 });

  const limited = new ArchiveBudget({ metadata: 12 }, () => 0);
  expect(limited.lookahead({ metadata: 8 }, () => {
    limited.reserve({ metadata: 3 });
    limited.reserve({ metadata: 2 });
  })).toMatchObject({ kind: "limited", refusal: { reserved: { metadata: 8 }, shortfall: { metadata: 1 } } });
  expect(limited.admitted().metadata).toBe(3);
  expect(limited.reservationCosts()).toMatchObject({ metadataReserved: 3, metadataSettled: 3, unsettledMetadata: 3 });
});

test("late receipts and a backwards clock cannot settle away charges after the original deadline", async () => {
  let now = 0, release!: (bytes: number) => void, installed = false;
  const budget = new ArchiveBudget({}, () => now, 10);
  const handle = budget.reserve({ calls: 1, metadata: 10, inputWork: 40 });
  const gate = new Promise<number>(resolve => { release = resolve; });
  const pending = budget.wait(() => gate).then(bytes => { budget.settle(handle, bytes); installed = true; });
  now = 10;
  expect(() => budget.check()).toThrow("archive-timeout");
  release(2);
  await expect(pending).rejects.toThrow("archive-timeout");
  expect(installed).toBe(false);
  expect(() => budget.settle(handle, 0)).toThrow("archive-timeout");
  expect(budget.admitted()).toMatchObject({ calls: 1, metadata: 10, inputWork: 40 });
  expect(budget.reservationCosts()).toMatchObject({ metadataReserved: 10, metadataSettled: 10, unsettledMetadata: 10 });

  let clock = 2;
  const backwards = new ArchiveBudget({}, () => clock), outstanding = backwards.reserve({ metadata: 4, inputWork: 8 });
  clock = 1;
  expect(() => backwards.settle(outstanding, 0)).toThrow("archive-unavailable");
  expect(backwards.admitted()).toMatchObject({ metadata: 4, inputWork: 8 });
  expect(backwards.reservationCosts().unsettledMetadata).toBe(4);
});
