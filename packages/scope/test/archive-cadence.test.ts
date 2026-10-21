/** Actual Native inputs, alarm dispatch, archive rows and incremental send
 * code. Clock, grants/policy and HTTP/repository/token are TEST fixtures;
 * virtual-day throughput is not a deployed-provider or custody claim. */
import { expect, onTestFinished, test } from "vitest";
import { ArchiveBudget, ARCHIVE_BOUNDS, type ArchiveCost } from "../src/archive-budget.ts";
import { ArchiveRows } from "../src/archive-row.ts";
import { create, at } from "./fixtures-native.ts";
import { archiveDefinition, archivePolicies, archiveRepository, archiveSql } from "./support/archive.ts";
import { ScriptedArchiveHost } from "./support/archive-provider.ts";
import { fixtureArchiveWiring } from "./worker.ts";

// Invariant: real Native alarms clear three backlogs of4800entries within
// their eight-hour windows, using the unchanged complete pass allowance.
test("Native archive alarms clear three daily windows of4800entries without a backlog", async context => {
  const lane = await create({}, {}, archiveDefinition), host = new ScriptedArchiveHost("sha1", () => lane.c.clock.now);
  const budgets: ArchiveBudget[] = [], windows: unknown[] = [];
  fixtureArchiveWiring.set(lane.name, {
    policies: { fixture: "archive-policies", registry: archivePolicies },
    target: { fixture: "archive-target", resolve: async () => { host.targets++; return archiveRepository; } }, provider: host,
    budget: () => { const budget = new ArchiveBudget(); budgets.push(budget); return budget; },
  });
  onTestFinished(() => { fixtureArchiveWiring.delete(lane.name); });
  await lane.restart();
  const started = performance.now();
  for (let window = 0; window < 3; window++) {
    lane.c.clock.now = at(window * 8 * 3600);
    const generatedAt = performance.now(), before = await lane.head();
    for (let n = 0; n < 4800; n++) {
      const answer = await lane.submit(lane.remark(`Native window${window} input${n}`));
      expect(answer.answer).toBe("accepted");
    }
    const head = await lane.head(); expect(head.seq - before.seq).toBe(4800);
    const generationSeconds = (performance.now() - generatedAt) / 1000;
    const archiveAt = performance.now(), firstBudget = budgets.length, firstSend = host.sends.length;
    let previous = window === 0 ? -1 : before.seq, confirmed = false;
    for (let alarm = 0; alarm <= 4800; alarm++) {
      expect(await lane.alarm()).toBe(true);
      // This observes a completed archive alarm. It supplies no second
      // allowance to any phase of the writer or send/receipt transaction.
      const row = await lane.inside(state => new ArchiveRows(archiveSql(state), lane.at).load());
      expect(row?.pending).toBeNull(); expect(row?.stopped).toBeNull();
      const through = row?.confirmed?.through;
      expect(through?.seq).toBeGreaterThan(previous);
      if (!through) return expect.fail("A completed alarm must persist its Native confirmation.");
      previous = through.seq;
      if (through.seq === head.seq) { expect(through).toEqual(head); confirmed = true; break; }
    }
    expect(confirmed).toBe(true);
    const archiveSeconds = (performance.now() - archiveAt) / 1000;
    expect(generationSeconds + archiveSeconds).toBeLessThan(8 * 3600);
    expect(await lane.head()).toEqual(head);
    expect(await lane.inside(state => new ArchiveRows(archiveSql(state), lane.at).wake())).toBeNull();
    expect(await lane.alarm()).toBe(false); // The next alarm has no archive backlog.
    const maximum: ArchiveCost = { entries: 0, attempts: 0, nodes: 0, calls: 0, metadata: 0, inputWork: 0 };
    const current = budgets.slice(firstBudget);
    for (const budget of current) for (const key of Object.keys(maximum) as (keyof ArchiveCost)[]) {
      const cost = budget.admitted(); expect(cost[key]).toBeLessThanOrEqual(ARCHIVE_BOUNDS[key]); maximum[key] = Math.max(maximum[key], cost[key]);
    }
    windows.push({ window, newEntries: 4800, through: head.seq, confirmedPasses: host.sends.length - firstSend,
      originalBudgets: current.length, generationSeconds, archiveSeconds, maximum, backlog: 0 });
    console.info("TEST Native archive catch-up", JSON.stringify(windows.at(-1)));
  }
  expect(host.closureReads).toBe(0); expect(host.appendCalls).toBe(host.sends.length - 1);
  expect(host.targets).toBe(1);
  (context.task.meta as Record<string, unknown>)["nativeArchiveCadence"] = { windows, totalNewEntries: 14_400,
    elapsedSeconds: (performance.now() - started) / 1000, actualAppendCalls: host.appendCalls, exactParentReads: host.objectReads.length,
    qualification: "Actual Native signed comment inputs and actual Native alarm dispatch. Three virtual eight-hour windows each produce4800new entries then drain actual adaptive passes to Native confirmation; no journal entries are written by export and wake is empty afterwards. Each pass uses its one unchanged default30s ledger/all original caps for scout, preparation, fresh inventory, writer, copies, production incremental copy/hash/validator/pack/send and Native mark/attempt/confirmation. Post-alarm receipt/wake inspections are separate test observations, no archive phase allowance. HTTP/token/repository/grants/policy/clock are explicit TEST fixtures; no real external-provider, deployed scheduling/network throughput, Git custody or real-day duration claim." };
}, 600_000);
