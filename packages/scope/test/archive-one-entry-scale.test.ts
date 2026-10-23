/** Archive fixture authority uses genuine Native Membership8 observations.
 * Its seat/key/role and source-birth preparation are external fixture setup;
 * each pass still pays its existing pin lookups and original complete ledger.
 * Inline Lane policy, clock and host/token/repository remain TEST fixtures. */
/** Real native one-entry archive scale witness. The production driver and
 * incremental send run over the fixture's scripted host and inline policy; Native Membership8 supplies authority. */
import { expect, test } from "vitest";
import { canonicalize, digestBytes, utf8 } from "@generalbusiness/dap-bytes";
import { idOf, parseCommit, parseTree } from "@generalbusiness/dap-git";
import { journalRef, journalV2PassPath, journalV2RetainedPath, journalV2SegmentPath, type JournalPassArchive } from "@generalbusiness/dap-git/journal";
import { readJournalRepositoryArchive } from "@generalbusiness/dap-git/journal-reader";
import { archiveSource, verifyArchive, TRUSTS } from "@generalbusiness/dap-replay";
import { ARCHIVE_BOUNDS, ArchiveBudget, type ArchiveCost } from "../src/archive-budget.ts";
import type { ArchivePolicyRegistry } from "../src/archive-inventory.ts";
import { ArchivePrefixStopped } from "../src/archive-prefix.ts";
import { ArchiveRows } from "../src/archive-row.ts";
import type { Sql, SqlValue } from "../src/sqlite.ts";
import { rita } from "./fixtures-native.ts";
import { createNativeArchiveApplicationLane, archiveScaleFactoryDefinition, archiveAuthorityAnchors } from "./support/archive-native-authority.ts";
import { archiveDefinition, archivePolicies, archiveRepository, archiveSql } from "./support/archive.ts";
import { driver, ScriptedHost } from "./support/archive-driver.ts";

// Actual Native signed acts/retention, original-ledger confirmed passes and
// eviction. Entry cap2 means one scout plus one fresh admitted entry; every
// other original cap and the30s per-pass deadline remains unchanged.
test("the Native driver confirms 10,001 one-entry passes and preserves retained rule inputs from pass 3700", async context => {
  const declared = archiveScaleFactoryDefinition;
  const original = archivePolicies.get(archiveDefinition.digest)!, policies: ArchivePolicyRegistry = new Map([[declared.digest,
    { ...original, support: { ...original.support, named: declared.digest, definition: declared } }]]);
  const lane = await createNativeArchiveApplicationLane(declared), host = new ScriptedHost("sha1"), started = performance.now();
  // Genuine factory genesis0 and confirmation/activation1 precede all acts.
  // The 9999 distinct signed rule inputs occupy actual positions2..10000.
  expect((await lane.head()).seq).toBe(1);
  let old!: { digest: `sha256:${string}`; bytes: string };
  const fields = (n: number) => ({ text: `actual retained rule input ${n}` });
  for (let seq = 2; seq <= 10_000; seq++) {
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
  const head = await lane.head(); expect(head.seq).toBe(10_000);
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
  for (let seq = 0; seq <= 10_000; seq++) {
    const outcome = await receipt(previous);
    expect(outcome.result, JSON.stringify({ seq, ...outcome })).toMatchObject({ state: "confirmed" });
    expect(outcome.confirmed?.through.seq).toBe(seq); expect(outcome.cost.entries).toBe(2);
    for (const key of Object.keys(maximum) as (keyof ArchiveCost)[]) maximum[key] = Math.max(maximum[key], outcome.cost[key]);
    if ([0, 999, 3699, 3700, 4999, 10_000].includes(seq)) samples.push({ seq, cost: outcome.cost });
    previous = seq;
    if (seq === 3700) await lane.restart();
    if (seq % 1000 === 999) console.info("TEST Native one-entry archive progress", JSON.stringify({ confirmed: seq + 1, elapsedSeconds: (performance.now() - started) / 1000, maximum }));
  }
  expect(host.sends).toHaveLength(10_001); expect(host.appendCalls).toBe(10_000);
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
  expect(await lane.inside(state => state.storage.sql.exec<{ digest: string }>("SELECT json_extract(bytes, '$.prepared[0].input') AS digest FROM entry WHERE seq = 10001").one().digest)).toBe(old.digest);
  const extra = await receipt(previous); expect(extra.result, JSON.stringify(extra)).toMatchObject({ state: "confirmed" });
  expect(extra.confirmed?.through.seq).toBe(10_001); expect(extra.cost.entries).toBe(2);
  expect(extraObjects).not.toContain(oldBlob);
  expect(await lane.inside(state => state.storage.sql.exec<{ pass: number }>("SELECT pass FROM retained_input WHERE kind = 'rule' AND digest = ?", old.digest).one().pass)).toBe(3700);
  expect(host.sends).toHaveLength(10_002); expect(host.appendCalls).toBe(10_001); expect(host.closureReads).toBe(0);
  const retained = await lane.inside(state => state.storage.sql.exec<{ count: number }>("SELECT count(*) AS count FROM retained_input WHERE kind = 'rule' AND pass IS NOT NULL").one().count);
  expect(retained).toBe(9999); expect(retained).toBeGreaterThan(4608);
  const later = await lane.head(), source = archiveSource({ open: (scope, work) => readJournalRepositoryArchive({
    format: async () => "sha1", resolve: async ref => ref === journalRef(lane.at.scope) ? host.pointer : null,
    object: async (id, limit) => { const object = host.data.get(id); return object ? { type: object.type, size: object.data.length, data: object.data.length <= limit ? object.data : null } : null; },
  }, scope, work) });
  // Explicit caller words from the independently checked actual Directory
  // create/confirmation facts and Membership read, never archive output.
  // This does not export either private authority journal.
  const anchors = archiveAuthorityAnchors(lane); expect(anchors.length).toBeGreaterThan(0);
  const verified = await verifyArchive(source, { mode: "replay", scope: lane.at.scope, head: later, grants: "as-recorded",
    anchors: anchors.map(fact => ({ scope: fact.at.scope, seq: fact.seq, hash: fact.hash })) });
  const reason = (verified.kind === "verification" ? verified.verification.why : verified.reason) ?? "";
  const diagnostic = { kind: verified.kind, reason: reason.slice(0, 2048), reasonTruncated: reason.length > 2048,
    ...(verified.kind === "verification" ? { result: verified.verification.report.result, at: verified.verification.report.at,
      target: verified.verification.report.target, coverage: verified.verification.report.coverage.slice(0, 4),
      coverageCount: verified.verification.report.coverage.length, anchorCount: verified.verification.report.anchors.length,
      missingCount: verified.verification.report.dependencies.missing.length }
      : { result: verified.result, scope: verified.location.scope, commit: verified.location.commit }) };
  expect(verified, JSON.stringify(diagnostic)).toMatchObject({ kind: "verification", verification: { report: { result: "consistent", anchors, trusts: expect.arrayContaining([TRUSTS.anchors, TRUSTS.observed]) } } });
  expect(await lane.head()).toEqual(later);
  (context.task.meta as Record<string, unknown>)["nativeOneEntryScale"] = { confirmedPasses: host.sends.length, retainedRuleInputs: retained, samples, maximum,
    extra: extra.cost, pass3700: { digest: old.digest, blob: oldBlob, outgoingAgain: extraObjects.includes(oldBlob), pass: 3700 },
    elapsedSeconds: (performance.now() - started) / 1000, exactParentReads: host.objectReads.length,
    qualification: "Actual Native signed acts and real rule evaluation, SQLite retention, 10001 confirmed one-entry passes (genesis, activation and9999 signed acts) plus one and eviction at3700. Each pass has one original30s ledger; trusted entry cap lowered to2 for scout1+fresh1, all other original caps unchanged. Production SHA1 incremental send copy/hash/validator/pack uses scripted HTTP/token/repository; Lane policy and source setup are TEST fixtures; authority is genuine Native Membership8 with external setup cost. Receipt inspections are separate test observations, no archive phase reset. 9999 distinct actual Native rule inputs; extra repeats the3700 rule input without resending its blob; unreferenced negative row remains unconfirmed. Offline current-tree clone/replay is separate; no real Git clone, external provider, deployed custody or cadence claim." };
  // Continue the same Native history with the unchanged default ledger. These
  // are distinct signed acts, not inserted retained rows or a lowered cap.
  const submit = async (seq: number, input = fields(seq)) => {
    const answer = await lane.stub.submit(lane.intent(rita, "remark", { on: 0, expected: { on: 1 }, fields: input }), lane.grants());
    expect(answer).toMatchObject({ answer: "accepted" });
    if (answer.answer !== "accepted") throw new Error("Native scale act refused");
    expect(answer.receipt.fact.seq).toBe(seq);
  };
  const nativeInput = (seq: number) => lane.inside(state => {
    const digest = state.storage.sql.exec<{ digest: `sha256:${string}` }>("SELECT json_extract(bytes, '$.prepared[0].input') AS digest FROM entry WHERE seq = ?", seq).one().digest;
    return { digest, ...state.storage.sql.exec<{ bytes: string; pass: number | null }>("SELECT bytes, pass FROM retained_input WHERE kind = 'rule' AND digest = ?", digest).one() };
  });
  // Direct immutable-object observations are outside archive execution and do
  // not call the provider. Provider read deltas below contain only driver I/O.
  const text = new TextDecoder();
  const object = (id: string) => { const found = host.data.get(id); expect(found, id).toBeDefined(); return found!; };
  const pathAt = (commit: string, path: string) => {
    let id = parseCommit(object(commit).data).tree;
    const trees: string[] = [], parts = path.split("/");
    for (let n = 0; n < parts.length; n++) {
      trees.push(id);
      const edge = parseTree(object(id).data).find(row => text.decode(row.name) === parts[n]);
      if (!edge) return { id: null, trees };
      if (n === parts.length - 1) return { id: edge.id as string, trees };
      expect(edge.kind).toBe("tree"); id = edge.id;
    }
    throw new Error("empty observation path");
  };
  const manifestAt = (commit: string, first: number): JournalPassArchive["manifest"] => {
    const file = pathAt(commit, journalV2PassPath(first)).id; expect(file).not.toBeNull();
    return JSON.parse(text.decode(object(file!).data));
  };
  const pathsAt = (commit: string) => {
    const paths = new Map<string, string>(), pending = [{ id: parseCommit(object(commit).data).tree, prefix: "" }];
    while (pending.length) {
      const parent = pending.pop()!;
      for (const edge of parseTree(object(parent.id).data)) {
        const path = parent.prefix + text.decode(edge.name);
        if (edge.kind === "tree") pending.push({ id: edge.id, prefix: path + "/" });
        else paths.set(path, edge.id);
      }
    }
    return paths;
  };
  type NativeRead = { query: string; args: SqlValue[]; rowsRead: number; rowsWritten: number; returned: number };
  const defaultReceipt = (after: number, observations?: NativeRead[]) => lane.inside(async state => {
    const budget = new ArchiveBudget(), refused: { quote: Partial<ArchiveCost>; used: ArchiveCost }[] = [];
    let limited = 0, blocked = 0;
    const canSpend = budget.canSpend.bind(budget), lookahead = budget.lookahead.bind(budget), lookaheadAsync = budget.lookaheadAsync.bind(budget);
    budget.canSpend = quote => { const fits = canSpend(quote); if (!fits) refused.push({ quote: { ...quote }, used: budget.admitted() }); return fits; };
    budget.lookahead = (reserve, read) => {
      try { const answer = lookahead(reserve, read); if (answer.kind === "limited") limited++; return answer; }
      catch (error) { if (error instanceof ArchivePrefixStopped) blocked++; throw error; }
    };
    budget.lookaheadAsync = async (reserve, read) => { const answer = await lookaheadAsync(reserve, read); if (answer.kind === "limited") limited++; return answer; };
    const sql: Sql = observations ? { transaction: action => state.storage.transactionSync(action), exec(query, ...args) {
      const cursor = state.storage.sql.exec(query, ...args);
      return { toArray() {
        const rows = cursor.toArray();
        observations.push({ query, args, rowsRead: cursor.rowsRead, rowsWritten: cursor.rowsWritten, returned: rows.length });
        return rows;
      } };
    } } : archiveSql(state);
    const result = await driver(lane, state, host, () => budget, after, policies, sql).run();
    const cost = budget.admitted();
    // Separate, post-pass observation; mark/attempt/confirm share `budget`.
    return { result, cost, refused, limited, blocked, stored: new ArchiveRows(archiveSql(state), lane.at).load() };
  });
  for (let seq = 10_002; seq <= 14_610; seq++) await submit(seq);
  expect((await lane.head()).seq).toBe(14_610);
  const densePasses: { first: number; last: number; inputs: number; cost: ArchiveCost; refused: number; limited: number; blocked: number }[] = [];
  const newlyExported = new Set<string>();
  let denseThrough = 10_001;
  while (denseThrough < 14_610) {
    const first = denseThrough + 1, outcome = await defaultReceipt(denseThrough);
    expect(outcome.result, JSON.stringify(outcome)).toMatchObject({ state: "confirmed" });
    const last = outcome.stored!.confirmed!.through.seq;
    expect(last).toBeGreaterThan(denseThrough); expect(last).toBeLessThanOrEqual(14_610);
    const manifest = manifestAt(host.pointer!, first), inputs = manifest.retained.filter(row => row.kind === "rule");
    expect(manifest.entries).toEqual([first, last]);
    expect(inputs).toHaveLength(last - first + 1);
    for (const input of inputs) { expect(input.pass).toBe(first); expect(newlyExported.has(input.digest)).toBe(false); newlyExported.add(input.digest); }
    for (const key of Object.keys(ARCHIVE_BOUNDS) as (keyof ArchiveCost)[]) expect(outcome.cost[key]).toBeLessThanOrEqual(ARCHIVE_BOUNDS[key]);
    // A non-tail pass stops at a whole-entry admission boundary under the
    // original ledger; the next run starts at its exact next sequence.
    if (last < 14_610) { expect(last).toBeGreaterThan(first); expect(outcome.refused.length + outcome.limited + outcome.blocked).toBeGreaterThan(0); }
    densePasses.push({ first, last, inputs: inputs.length, cost: outcome.cost, refused: outcome.refused.length, limited: outcome.limited, blocked: outcome.blocked });
    denseThrough = last;
  }
  expect(newlyExported.size).toBe(4609); expect(newlyExported.size).toBeGreaterThan(4608);
  const ruleCount = () => lane.inside(state => state.storage.sql.exec<{ count: number }>("SELECT count(*) AS count FROM retained_input WHERE kind = 'rule' AND pass IS NOT NULL").one().count);
  expect(await ruleCount()).toBe(14_608);

  // Restart only after the large default-budget history. One default pass
  // must mix the old3700 reference with a genuinely new retained input.
  await lane.restart();
  await submit(14_611, fields(3700)); await submit(14_612);
  const fresh = await nativeInput(14_612), freshBlob = idOf("blob", utf8(fresh.bytes));
  expect(fresh.digest).not.toBe(old.digest); expect(fresh.pass).toBeNull();
  expect(host.data.has(freshBlob)).toBe(false);
  expect((await nativeInput(14_611)).digest).toBe(old.digest);
  const parent = host.pointer!, oldPaths = pathsAt(parent), oldPath = journalV2RetainedPath(3700, { kind: "rule", digest: old.digest });
  expect(oldPaths.get(oldPath)).toBe(oldBlob);
  const newPath = journalV2RetainedPath(14_611, { kind: "rule", digest: fresh.digest });
  const allowedTrees = new Set(["journal/v2/head.json", journalV2PassPath(14_611), journalV2SegmentPath(14_611), newPath].flatMap(path => pathAt(parent, path).trees));
  const parentHead = pathAt(parent, "journal/v2/head.json").id!, readStart = host.objectReads.length, nativeReads: NativeRead[] = [];
  const mixed = await defaultReceipt(14_610, nativeReads);
  const providerReads = host.objectReads.slice(readStart), readTypes = providerReads.map(id => ({ id, type: object(id).type }));
  const retainedReads = nativeReads.filter(row => /\bSELECT\b/.test(row.query) && /\bFROM retained_(?:input|value)\b/.test(row.query));
  const retainedLookups = [old, fresh].map(input => {
    const reads = retainedReads.filter(row => row.args.includes(input.digest));
    return { digest: input.digest, bytes: utf8(input.bytes).length, reads,
      bodies: reads.filter(row => /^SELECT bytes FROM retained_input\b/.test(row.query)),
      passes: reads.filter(row => /^SELECT pass, typeof\(pass\) AS type FROM retained_input\b/.test(row.query)) };
  });
  // Preserve raw observations before any mixed-pass assertions, including
  // on failure. Referenced local bodies still require canonical validation;
  // reuse avoids old Git payload reads/sends and retained-table scans.
  (context.task.meta as Record<string, unknown>)["nativeDefaultRetainedScaleMixedObservation"] = {
    result: mixed.result, cost: mixed.cost, stored: mixed.stored, newlyExported: newlyExported.size, densePasses,
    old: { digest: old.digest, blob: oldBlob }, fresh: { digest: fresh.digest, blob: freshBlob },
    parent, parentHead, outgoing: [...extraObjects], providerReads: readTypes, retainedLookups, nativeReads,
  };
  expect(mixed.result, JSON.stringify(mixed)).toMatchObject({ state: "confirmed" });
  expect(mixed.stored!.confirmed!.through.seq).toBe(14_612);
  const mixedManifest = manifestAt(host.pointer!, 14_611), ruleInputs = mixedManifest.retained.filter(row => row.kind === "rule");
  expect(mixedManifest.entries).toEqual([14_611, 14_612]);
  expect(ruleInputs).toHaveLength(2);
  expect(ruleInputs).toEqual(expect.arrayContaining([{ kind: "rule", digest: old.digest, pass: 3700 }, { kind: "rule", digest: fresh.digest, pass: 14_611 }]));
  expect(extraObjects).not.toContain(oldBlob); expect(extraObjects).toContain(freshBlob);
  const afterPaths = pathsAt(host.pointer!);
  for (const [path, id] of oldPaths) if (path !== "journal/v2/head.json") expect(afterPaths.get(path), path).toBe(id);
  expect(afterPaths.get(oldPath)).toBe(oldBlob); expect(afterPaths.get(newPath)).toBe(freshBlob);
  expect(await ruleCount()).toBe(14_609);
  const mixedNativePasses = await lane.inside(state => state.storage.sql.exec<{ digest: string; pass: number }>(
    "SELECT digest, pass FROM retained_input WHERE kind = 'rule' AND digest IN (?, ?) ORDER BY digest", old.digest, fresh.digest).toArray());
  expect(mixedNativePasses).toEqual(expect.arrayContaining([{ digest: old.digest, pass: 3700 }, { digest: fresh.digest, pass: 14_611 }]));
  expect(mixedNativePasses).toHaveLength(2);
  expect(readTypes.filter(row => row.type === "blob").map(row => row.id)).toEqual([parentHead]);
  expect(readTypes.filter(row => row.type === "commit").map(row => row.id)).toEqual([parent]);
  const treeReads = readTypes.filter(row => row.type === "tree");
  expect(treeReads.length).toBeLessThanOrEqual(16);
  for (const row of treeReads) expect(allowedTrees.has(row.id), row.id).toBe(true);
  expect(host.closureReads).toBe(0);
  expect(retainedReads.length).toBeGreaterThan(0);
  for (const row of retainedReads) {
    expect(row.query).toMatch(/\bdigest = \?/);
    expect(row.query).toMatch(/\b(?:kind|domain) = (?:\?|'[^']*')/);
    expect(row.rowsRead, row.query).toBeLessThanOrEqual(1); expect(row.returned).toBeLessThanOrEqual(1);
  }
  for (const lookup of retainedLookups) {
    expect(lookup.bodies.length, lookup.digest).toBeGreaterThan(0);
    for (const read of lookup.bodies) {
      expect(read.query).toBe("SELECT bytes FROM retained_input WHERE kind = ? AND digest = ? AND typeof(bytes) = 'text' AND octet_length(bytes) = ? LIMIT 1");
      expect(read.args).toEqual(["rule", lookup.digest, lookup.bytes]);
      expect(read.rowsRead, lookup.digest).toBe(1); expect(read.returned, lookup.digest).toBe(1);
    }
    expect(lookup.passes.length, lookup.digest).toBeGreaterThan(0);
    for (const read of lookup.passes) { expect(read.rowsRead, lookup.digest).toBe(1); expect(read.returned, lookup.digest).toBe(1); }
  }

  // Two distinct boundaries: actual Native immutable-target refusal, then a
  // driver/provider ref conflict. A bound row is never re-resolved here.
  const passValues = () => lane.inside(state => ({
    input: state.storage.sql.exec("SELECT kind, digest, pass FROM retained_input ORDER BY kind, digest").toArray(),
    value: state.storage.sql.exec("SELECT domain, digest, pass FROM retained_value ORDER BY domain, digest").toArray(),
  }));
  const confirmedPasses = await passValues();
  await lane.inside(state => {
    const rows = new ArchiveRows(archiveSql(state), lane.at), before = rows.load();
    expect(() => rows.target({ ...archiveRepository, id: "other-repository" }, "sha1")).toThrow("archive-row-conflict");
    expect(rows.load()).toEqual(before);
  });
  expect(await passValues()).toEqual(confirmedPasses);
  await submit(14_613);
  const pendingInput = await nativeInput(14_613); expect(pendingInput.pass).toBeNull();
  const beforeConflict = await passValues(), foreign = new ScriptedHost("sha1"), divergent = host.sends[0]!;
  for (const [id, stored] of host.data) foreign.data.set(id, stored);
  foreign.pointer = divergent;
  let foreignSendCalls = 0;
  const foreignSend = foreign.sendArchive.bind(foreign);
  foreign.sendArchive = async request => {
    foreignSendCalls++; expect(request.old).toBe(mixed.stored!.confirmed!.commit);
    expect(request.old).not.toBe(foreign.pointer); return foreignSend(request);
  };
  const conflict = await lane.inside(async state => {
    const rows = new ArchiveRows(archiveSql(state), lane.at), before = rows.load();
    const result = await driver(lane, state, foreign, () => new ArchiveBudget(), 14_612, policies).run();
    const after = rows.load();
    expect(after!.repository).toEqual(before!.repository); expect(after!.confirmed).toEqual(before!.confirmed);
    return { result, before: before!.confirmed, after: after!.confirmed };
  });
  expect(conflict.result).toMatchObject({ state: "stopped", reason: "conflict" });
  expect(foreignSendCalls).toBe(1);
  expect(foreign.pointer).toBe(divergent); expect(foreign.sends).toHaveLength(0);
  expect(await passValues()).toEqual(beforeConflict);
  expect((await nativeInput(14_613)).pass).toBeNull();
  expect(await ruleCount()).toBe(14_609);
  (context.task.meta as Record<string, unknown>)["nativeDefaultRetainedScale"] = { newlyExported: newlyExported.size, confirmedRuleInputs: 14_609, densePasses,
    mixed: { first: 14_611, last: 14_612, cost: mixed.cost, nativePasses: mixedNativePasses, old: { digest: old.digest, pass: 3700, blob: oldBlob, outgoing: extraObjects.includes(oldBlob) },
      fresh: { digest: fresh.digest, pass: 14_611, blob: freshBlob, outgoing: extraObjects.includes(freshBlob) }, preservedPaths: oldPaths.size - 1, providerReads: readTypes, retainedLookups, nativeReads },
    conflict: { ...conflict, pending: pendingInput.digest, providerPointer: divergent, sendAttempts: foreignSendCalls, unchangedInputPassValues: beforeConflict.input.length, unchangedValuePassValues: beforeConflict.value.length },
    qualification: "Same genuine factory-born Native fixture after the 10002 lower-entry-cap passes including the repeated3700 rule: 4609 distinct actual signed rule acts exported with unchanged default ArchiveBudget, whole-entry prefix/resume receipts, then post-history restart and one default mixed old3700/new pass. All previous paths remain byte-identical; direct immutable-object and whole-table pass assertions are separate observations outside archive execution. Mixed driver I/O is exact provider object IDs plus real Native cursor keyed-read statistics. Referenced old/new local rule bodies receive charged exact-key canonical payload validation; there is no retained-table scan, old Git payload/manifest read or old retained-blob resend. Native ArchiveRows.target(otherRepository) exercises the stored identity guard. The separate scripted provider with a divergent ref exercises driver ref-conflict/no-confirmation; it does not re-resolve or change a bound repository. Original caps, debits, 30s deadline, authority and payload admission are unchanged. Scripted host/token/HTTP and fixture policy remain test boundaries." };
  console.info("TEST Native default retained scale", JSON.stringify((context.task.meta as Record<string, unknown>)["nativeDefaultRetainedScale"]));
}, 1_200_000);
