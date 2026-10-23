import { expect, test } from "vitest";
import { WorkbenchWork } from "../src/workbench-work.ts";
function held() { let resolve!: () => void; const promise = new Promise<void>(accept => { resolve = accept; }); return { promise, resolve }; }

test("workbench idle includes synchronously admitted nested work", async () => {
  const owner = new WorkbenchWork(), child = held(); let done = false;
  const outer = owner.run(async () => { void owner.run(() => child.promise); });
  const idle = owner.idle().then(() => { done = true; });
  await outer; expect(done).toBe(false);
  child.resolve(); await idle; expect(done).toBe(true);
});
test("rejected work keeps its rejection and has no orphan bookkeeping rejection", async () => {
  const owner = new WorkbenchWork(), gate = held(), failure = new Error("owned failure");
  const result = owner.run(async () => { await gate.promise; throw failure; });
  const rejected = expect(result).rejects.toBe(failure), idle = owner.idle();
  gate.resolve(); await rejected; await idle; await owner.retire();
});
test("retirement cancels future starts and waits for the already admitted action", async () => {
  const gate = held(); let cancelled = 0, completed = false, retired = false, forbidden = 0;
  const owner = new WorkbenchWork(() => { cancelled++; });
  const action = owner.run(async () => { await gate.promise; completed = true; });
  const closing = owner.retire().then(() => { retired = true; });
  expect(owner.active).toBe(false); expect(cancelled).toBe(1); expect(completed).toBe(false); expect(retired).toBe(false);
  await expect(owner.run(async () => { forbidden++; })).rejects.toThrow("retired");
  expect(forbidden).toBe(0); gate.resolve(); await action; await closing;
  expect(completed).toBe(true); expect(retired).toBe(true); await owner.retire(); expect(cancelled).toBe(1);
});
test("a retirement callback failure still joins admitted work before rejecting", async () => {
  const gate = held(), failure = new Error("retirement failed"); let finished = false;
  const owner = new WorkbenchWork(() => { throw failure; });
  const action = owner.run(async () => { await gate.promise; finished = true; });
  const closing = owner.retire(), rejected = expect(closing).rejects.toBe(failure);
  expect(finished).toBe(false); expect(owner.retire()).toBe(closing);
  gate.resolve(); await action; await rejected; expect(finished).toBe(true);
});

test("a retired fixture keeps its globals and successor blocked until physical action completion", async () => {
  const { WorkbenchFixtures } = await import("./workbench-fixture.ts");
  const fixtures = new WorkbenchFixtures(), released = held(), ack = held(), body = held(), entered = held();
  const owner = new WorkbenchWork(); let close!: () => Promise<void>, globals = false, successor = false;
  const action = owner.run(async () => { await released.promise; await ack.promise; expect(globals).toBe(true); });
  const first = fixtures.run(fn => { close = fn; }, async fixture => {
    globals = true;
    fixture.release(() => { released.resolve(); body.resolve(); });
    await fixture.load(async () => ({ workbenchLifecycle: owner })); entered.resolve();
    try { await fixture.wait(() => body.promise); }
    finally { await fixture.retire(); globals = false; }
  });
  const stopped = expect(first).rejects.toThrow("fixture has finished");
  await entered.promise;
  const closing = close();
  const next = fixtures.run(() => {}, async () => { expect(globals).toBe(false); successor = true; });
  await released.promise; expect(globals).toBe(true); expect(successor).toBe(false);
  ack.resolve(); await action; await closing; await stopped; await next;
  expect(globals).toBe(false); expect(successor).toBe(true);
});

test("retirement discovers an admitted late module owner before fixture teardown", async () => {
  const { WorkbenchFixture } = await import("./workbench-fixture.ts");
  const fixture = new WorkbenchFixture(), ack = held(), imported = held();
  const owner = new WorkbenchWork(); let finished = false, retired = false;
  const action = owner.run(async () => { await ack.promise; finished = true; });
  fixture.release(imported.resolve);
  const loading = fixture.load(async () => { await imported.promise; return { workbenchLifecycle: owner }; });
  const stopped = expect(loading).rejects.toThrow("fixture has finished");
  const closing = fixture.retire().then(() => { retired = true; });
  await imported.promise; expect(finished).toBe(false); expect(retired).toBe(false);
  ack.resolve(); await action; await closing; await stopped; expect(finished).toBe(true); expect(retired).toBe(true);
});
