/** Real native one-entry archive scale witness. The production driver and
 * incremental send run over the fixture's scripted host, grants and policy. */
import { expect, test } from "vitest";
import { canonicalize, digestBytes, utf8 } from "@generalbusiness/artroom-bytes";
import { idOf } from "@generalbusiness/artroom-git";
import { variant } from "@generalbusiness/dap-derive/testing";
import { readJournalRepositoryArchive } from "@generalbusiness/artroom-git/journal-reader";
import { archiveSource, verifyArchive } from "@generalbusiness/artroom-replay";
import { ArchiveBudget, type ArchiveCost } from "../src/archive-budget.ts";
import type { ArchivePolicyRegistry } from "../src/archive-inventory.ts";
import { ArchiveRows } from "../src/archive-row.ts";
import { create, rita } from "./fixtures-native.ts";
import { archiveDefinition, archivePolicies, archiveSql } from "./support/archive.ts";
import { driver, ScriptedHost } from "./support/archive-driver.ts";

// Actual Native signed acts/retention, original-ledger confirmed passes and
// eviction. Entry cap2 means one scout plus one fresh admitted entry; every
// other original cap and the30s per-pass deadline remains unchanged.
test("the Native driver confirms ten thousand one-entry passes and preserves retained rule inputs from pass3700", async context => {
  const declared = variant(archiveDefinition.declared, data => {
    data.acts.remark.step = "transition"; // No effects: the primary item stays unchanged.
    data.rules["archive-text"] = 'fields.text != ""';
    data.acts.remark.guards.push({ rule: "archive-text" });
  });
  const original = archivePolicies.get(archiveDefinition.digest)!, policies: ArchivePolicyRegistry = new Map([[declared.digest,
    { ...original, support: { ...original.support, named: declared.digest, definition: declared } }]]);
  const lane = await create({}, {}, declared), host = new ScriptedHost("sha1"), started = performance.now();
  let old!: { digest: `sha256:${string}`; bytes: string };
  const fields = (n: number) => ({ text: `actual retained rule input ${n}` });
  for (let seq = 1; seq < 10_000; seq++) {
    const answer = await lane.stub.submit(lane.intent(rita, "remark", { on: 0, expected: { on: 1 }, fields: fields(seq) }), lane.grants());
    expect(answer, `Native rule act ${seq}`).toMatchObject({ answer: "accepted" });
    if (answer.answer !== "accepted") return;
    expect(answer.receipt.fact.seq).toBe(seq);
    if (seq % 2500 === 0) console.info("TEST Native retained-input generation", JSON.stringify({ entries: seq + 1, elapsedSeconds: (performance.now() - started) / 1000 }));
    if (seq === 3700) old = await lane.inside(state => {
      const digest = state.storage.sql.exec<{ digest: `sha256:${string}` }>("SELECT json_extract(bytes, '$.prepared[0].input') AS digest FROM entry WHERE seq = ?", seq).one().digest;
      return { digest, bytes: state.storage.sql.exec<{ bytes: string }>("SELECT bytes FROM retained_input WHERE kind = 'rule' AND digest = ?", digest).one().bytes };
    });
  }
  const head = await lane.head(); expect(head.seq).toBe(9999);
  const maximum: ArchiveCost = { entries: 0, attempts: 0, nodes: 0, calls: 0, metadata: 0, inputWork: 0 };
  const samples: { seq: number; cost: ArchiveCost }[] = [];
  const receipt = async (previous: number) => lane.inside(async state => {
    let budget!: ArchiveBudget;
    const result = await driver(lane, state, host, () => budget = new ArchiveBudget({ entries: 2 }), previous < 0 ? undefined : previous, policies).run();
    const cost = budget.admitted();
    // Observation after the completed archive pass, never a second archive
    // allowance. The real mark/attempt/confirm already used `budget`.
    const stored = new ArchiveRows(archiveSql(state), lane.at).load();
    return { result, cost, confirmed: stored?.confirmed ?? null };
  });
  let previous = -1;
  for (let seq = 0; seq < 10_000; seq++) {
    const outcome = await receipt(previous);
    expect(outcome.result, JSON.stringify({ seq, ...outcome })).toMatchObject({ state: "confirmed" });
    expect(outcome.confirmed?.through.seq).toBe(seq); expect(outcome.cost.entries).toBe(2);
    for (const key of Object.keys(maximum) as (keyof ArchiveCost)[]) maximum[key] = Math.max(maximum[key], outcome.cost[key]);
    if ([0, 999, 3699, 3700, 4999, 9999].includes(seq)) samples.push({ seq, cost: outcome.cost });
    previous = seq;
    if (seq === 3700) await lane.restart();
    if (seq % 1000 === 999) console.info("TEST Native one-entry archive progress", JSON.stringify({ confirmed: seq + 1, elapsedSeconds: (performance.now() - started) / 1000, maximum }));
  }
  expect(host.sends).toHaveLength(10_000); expect(host.appendCalls).toBe(9999);
  const oldBlob = idOf("blob", utf8(old.bytes));
  expect(host.data.get(oldBlob)?.type).toBe("blob");
  expect(await lane.inside(state => state.storage.sql.exec<{ pass: number }>("SELECT pass FROM retained_input WHERE kind = 'rule' AND digest = ?", old.digest).one().pass)).toBe(3700);
  const unrelatedBytes = canonicalize({ unused: true }), unrelated = { digest: digestBytes(utf8(unrelatedBytes)), bytes: unrelatedBytes };
  // Explicit unreferenced negative fixture, not a Native business event.
  await lane.inside(state => state.storage.sql.exec("INSERT INTO retained_input (kind, digest, bytes) VALUES ('rule', ?, ?)", unrelated.digest, unrelated.bytes).toArray());
  let extraObjects: readonly string[] = [];
  const send = host.sendArchive.bind(host);
  host.sendArchive = async request => { extraObjects = request.objects.map(object => object.id); return send(request); };
  expect(await lane.stub.submit(lane.intent(rita, "remark", { on: 0, expected: { on: 1 }, fields: fields(3700) }), lane.grants())).toMatchObject({ answer: "accepted" });
  expect(await lane.inside(state => state.storage.sql.exec<{ digest: string }>("SELECT json_extract(bytes, '$.prepared[0].input') AS digest FROM entry WHERE seq = 10000").one().digest)).toBe(old.digest);
  const extra = await receipt(previous); expect(extra.result, JSON.stringify(extra)).toMatchObject({ state: "confirmed" });
  expect(extra.confirmed?.through.seq).toBe(10_000); expect(extra.cost.entries).toBe(2);
  expect(extraObjects).not.toContain(oldBlob);
  expect(await lane.inside(state => state.storage.sql.exec<{ pass: number }>("SELECT pass FROM retained_input WHERE kind = 'rule' AND digest = ?", old.digest).one().pass)).toBe(3700);
  expect(host.sends).toHaveLength(10_001); expect(host.appendCalls).toBe(10_000); expect(host.closureReads).toBe(0);
  const retained = await lane.inside(state => state.storage.sql.exec<{ count: number }>("SELECT count(*) AS count FROM retained_input WHERE kind = 'rule' AND pass IS NOT NULL").one().count);
  expect(retained).toBe(9999); expect(retained).toBeGreaterThan(4608);
  const later = await lane.head(), source = archiveSource({ open: (scope, work) => readJournalRepositoryArchive({
    format: async () => "sha1", resolve: async () => host.pointer,
    object: async (id, limit) => { const object = host.data.get(id); return object ? { type: object.type, size: object.data.length, data: object.data.length <= limit ? object.data : null } : null; },
  }, scope, work) });
  const verified = await verifyArchive(source, { mode: "replay", scope: lane.at.scope, head: later, grants: "as-recorded" });
  expect(verified).toMatchObject({ kind: "verification", verification: { report: { result: "consistent", anchors: [] } } });
  expect(await lane.head()).toEqual(later);
  (context.task.meta as Record<string, unknown>)["nativeOneEntryScale"] = { confirmedPasses: host.sends.length, retainedRuleInputs: retained, samples, maximum,
    extra: extra.cost, pass3700: { digest: old.digest, blob: oldBlob, outgoingAgain: extraObjects.includes(oldBlob), pass: 3700 },
    elapsedSeconds: (performance.now() - started) / 1000, exactParentReads: host.objectReads.length,
    qualification: "Actual Native signed acts and real rule evaluation, SQLite retention, 10000 confirmed one-entry passes plus one and eviction at3700. Each pass has one original30s ledger; trusted entry cap lowered to2 for scout1+fresh1, all other original caps unchanged. Production SHA1 incremental send copy/hash/validator/pack uses scripted HTTP/token/repository; policy/source/authority are TEST fixtures. Receipt inspections are separate test observations, no archive phase reset. 9999 distinct actual Native rule inputs; extra repeats the3700 rule input without resending its blob; unreferenced negative row remains unconfirmed. Offline current-tree clone/replay is separate; no real Git clone, external provider, deployed custody or cadence claim." };
}, 1_200_000);
