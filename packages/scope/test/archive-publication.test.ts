/** Real Native inputs, SQLite and writer confirmation; repository and
 * authority are the existing explicit test-host stand-ins. No hosted claim. */
import { env, runInDurableObject } from "cloudflare:test";
import { expect, inject, onTestFinished, test } from "vitest";
import { PROPOSED_BOUNDS, type FactRef } from "@generalbusiness/dap-contract";
import { canonicalize, intentDigest, isSeed, scopeIdOf, timeMs, timeOf, unb64url } from "@generalbusiness/artroom-bytes";
import { ARCHIVE_DEVICE_APPLICATION_COHORT } from "@generalbusiness/dap-platform";
import { growArchivePolicies } from "../../../apps/room/archive-policy.ts";
import { buildJournalPass } from "@generalbusiness/artroom-git/journal";
import { ARCHIVE_BOUNDS, ArchiveBudget } from "../src/archive-budget.ts";
import { planLegacyArchiveAnchors, planPublishedArchivePass, planRootPublishedArchivePass, rebuildArchivePass } from "../src/archive-build.ts";
import { fixtureArchiveTargetIn } from "../src/archive-target.ts";
import { archiveSourceReferences } from "../src/archive-source-window.ts";
import { FixtureArchiveSourcePins, type FixtureArchiveSourceBirth } from "../src/archive-source-pins.ts";
import { namespace } from "../src/namespace.ts";
import { readNativeBirth } from "../src/native-birth.ts";
import { archiveInput } from "../src/archive-input.ts";
import { inventoryArchive } from "../src/archive-inventory.ts";
import { ArchiveRows } from "../src/archive-row.ts";
import { SqliteStore, type Sql } from "../src/sqlite.ts";
import { at, create, reader } from "./fixtures-native.ts";
import { archiveDefinition, archivePolicies, archiveRepository, archiveSql } from "./support/archive.ts";
import { ScriptedArchiveHost } from "./support/archive-provider.ts";
import { fixtureArchiveWiring } from "./worker.ts";
import { sessionRoom } from "./support/session-room.ts";
import type {} from "./support/maintained-applications.ts";

// An old receipt cannot authorize deletion. Only a real new writer's
// whole-held-prefix publication earns coverage and enables the floor.
test("Native legacy archive receipt blocks the floor until a real backfill pass confirms", async () => {
  const lane = await create({}, {}, archiveDefinition);
  for (let n = 0; n < 8; n++) expect((await lane.submit(lane.remark(`old publication input ${n}`))).answer).toBe("accepted");
  const through = await lane.head();
  const legacy = await lane.inside(async state => {
    const sql = archiveSql(state), budget = new ArchiveBudget();
    const selected = inventoryArchive(sql, lane.at, through, lane.c.bounds, archivePolicies, budget);
    if (!selected.ok) throw Error(canonicalize(selected));
    const inventory = { ...selected.inventory, format: "artroom-local-inventory-2", after: null,
      objects: selected.inventory.objects.map(object => ({ ...object, pass: 0 })), cost: budget.admitted() };
    const manifest = canonicalize(inventory);
    // This is the actual old-format writer path: no publication callback,
    // no injected confirmation boolean or invented successful receipt.
    const built = await buildJournalPass({ format: "sha1", selection: manifest,
      input: archiveInput(sql, inventory, budget), parent: null, budget });
    if (!built.ok) throw Error(canonicalize(built));
    const rows = new ArchiveRows(sql, lane.at);
    rows.target(archiveRepository, "sha1");
    rows.mark({ commit: built.archive.commit, parent: null, through, manifest, markedAt: lane.c.clock.now, layout: 2 });
    expect(rows.confirm(built.archive.commit).confirmed).toEqual({ commit: built.archive.commit, through, layout: 2 });
    return built.archive;
  });
  const host = new ScriptedArchiveHost("sha1", () => lane.c.clock.now);
  for (const object of legacy.objects) host.data.set(object.id, object);
  host.pointer = legacy.commit;
  await lane.inside(async state => {
    const sql = archiveSql(state), row = new ArchiveRows(sql, lane.at).load()!;
    await expect(planLegacyArchiveAnchors(sql, { row, bounds: lane.c.bounds, policies: archivePolicies,
      parent: { id: legacy.commit, source: { object: async (id, limit) => {
        const object = host.data.get(id);
        return object ? { type: object.type, size: object.data.length, data: object.data.length <= limit ? object.data : null } : null;
      } } } }, new ArchiveBudget({ entries: 1 }))).rejects.toThrow("archive-limit");
    // A bounded refusal earns no partial coverage and writes no Mark.
    expect(new ArchiveRows(sql, lane.at).load()).toEqual(row);
  });
  const policies = new Map([...archivePolicies].map(([pin, policy]) => [pin, { ...policy,
    entryTypes: new Set([...policy.entryTypes, "floor" as const]), floor: { margin: 1, minimum: 1 } }]));
  fixtureArchiveWiring.set(lane.name, { policies: { fixture: "archive-policies", registry: policies },
    target: { fixture: "archive-target", resolve: async () => archiveRepository }, provider: host });
  onTestFinished(() => { fixtureArchiveWiring.delete(lane.name); });
  await lane.restart(); lane.c.clock.now = at(1000);
  await lane.inside(async state => {
    new ArchiveRows(archiveSql(state), lane.at).signal(lane.c.clock.now);
    await state.storage.setAlarm(timeMs(lane.c.clock.now)!);
  });
  expect(await lane.alarm()).toBe(true);
  expect(await lane.head()).toEqual(through);
  expect(await lane.inside(state => new SqliteStore(archiveSql(state)).floor())).toBeNull();
  expect(host.sends).toEqual([]);
  expect((await lane.submit(lane.remark("new code publishes the legacy prefix"))).answer).toBe("accepted");
  lane.c.clock.now = at(1001);
  expect(await lane.alarm()).toBe(true);
  const observed = await lane.inside(state => {
    const sql = archiveSql(state), store = new SqliteStore(sql), row = new ArchiveRows(sql, lane.at).load();
    return { confirmed: row?.confirmed, stopped: row?.stopped, floor: store.floor(),
      count: state.storage.sql.exec("SELECT COUNT(*) AS n FROM entry").one()["n"] };
  });
  expect(observed.stopped).toBeNull();
  expect(observed.confirmed).toMatchObject({ layout: 2, anchorsPublished: true });
  expect(observed.floor?.floor).toBeGreaterThan(0);
  expect(observed.count).toBeLessThan(through.seq + 1);
  const publication = [...host.data.values()].filter(object => object.type === "blob")
    .map(object => new TextDecoder().decode(object.data)).find(bytes => bytes.includes('"legacyAnchors"'));
  expect(publication).toBeDefined();
  expect(JSON.parse(publication!)).toMatchObject({ anchors: [], legacyAnchors: { from: 0, through: through.seq, anchors: [] } });
  await lane.restart();
  expect(await lane.inside(state => new ArchiveRows(archiveSql(state), lane.at).load()?.confirmed)).toEqual(observed.confirmed);
}, 30_000);

// Both expected anchors come from the genuine Register founding act and
// its Directory creation send, before archive output. No caller supplies a list.
test("Native admitted Register17 fact publishes nonempty anchors and rebuilds the exact stored Mark", async context => {
  const { life, R, D, children } = await sessionRoom(ARCHIVE_DEVICE_APPLICATION_COHORT.register, "journal");
  try {
    const [membership, rules, destination] = children;
    if (!membership || !rules || !destination) throw Error("Genuine native siblings required");
    const registerAt = await life.wait(() => R.at()), directoryAt = await life.wait(() => D.at());
    const registerHistory = await life.wait(() => R.sealed());
    const creations = registerHistory.filter(sealed => sealed.entry.sends.some(send => isSeed(send.to)
      && send.to.kind === "directory" && scopeIdOf(send.to) === D.name));
    expect(creations).toHaveLength(1);
    const creation = creations[0]!, expected: FactRef = { at: registerAt, seq: creation.entry.seq, hash: creation.hash };
    const genesis = (await life.wait(() => D.sealed())).find(sealed => sealed.entry.seq === 0)!;
    expect(genesis.entry.input).toMatchObject({ type: "genesis", source: expected });
    if (genesis.entry.input.type !== "genesis") throw Error("Actual Directory genesis required");
    const through = { seq: 0, hash: genesis.hash }, seed = genesis.entry.input.seed;
    const founding = registerHistory.filter(sealed => sealed.entry.input.type === "act"
      && sealed.entry.input.signed.intent.kind === "found"
      && intentDigest(sealed.entry.input.signed.intent) === seed.cause);
    expect(founding).toHaveLength(1);
    const found = founding[0]!, foundingFact: FactRef = { at: registerAt, seq: found.entry.seq, hash: found.hash };
    expect(found.entry.seq).toBeLessThan(creation.entry.seq);
    expect(creation.entry.input.type).toBe("outcome");
    if (creation.entry.input.type !== "outcome") throw Error("Actual creation outcome required");
    const [opening, ordinal] = creation.entry.input.operation.split(":").map(Number);
    expect(opening).toBe(found.entry.seq);
    expect(found.entry.effects.some(effect => effect.effect === "operation" && effect.k === ordinal)).toBe(true);
    expect(genesis.entry.input.message).toMatchObject({ body: { fields: { claim: foundingFact } } });
    const expectedAnchors = [foundingFact, expected];
    expect(genesis.entry.uses.map(use => use.fact)).toEqual([expected, foundingFact]);
    const publicScopes = [directoryAt, await life.wait(() => rules.at()), await life.wait(() => destination.at())];
    const packet = unb64url(inject("maintainedApplications").growDemo.bytes);
    if (!packet) throw Error("Exact deployed Grow policy packet required");
    const policies = growArchivePolicies(new TextDecoder().decode(packet));
    const target = fixtureArchiveTargetIn(env.PLATFORM, { fixture: "archive-target-reader", value: reader });
    const prepare = async (sql: Sql, budget: ArchiveBudget) => {
      const source = sql.transaction(() => archiveSourceReferences(sql, 0, PROPOSED_BOUNDS, budget));
      expect(source.position).toEqual(through); expect(source.sources).toEqual([registerAt]);
      const births: FixtureArchiveSourceBirth[] = [];
      // The Native frame above has ended before the existing birth RPC.
      for (const where of source.sources) {
        budget.spend({ nodes: 1, calls: 1, metadata: 256 * 1024, inputWork: 256 * 1024 * 8 });
        const birth = readNativeBirth(await budget.wait(() => namespace(env.PLATFORM).births.read(where,
          Math.min(10_000, budget.remaining()), 256 * 1024)), where, 256 * 1024);
        if (!birth) return budget.stop("unavailable");
        expect(birth.named).toBe("platform:register@17");
        births.push({ at: where, birth: { bytes: birth.proof.bytes, hash: birth.proof.fact.hash } });
      }
      return new FixtureArchiveSourcePins(births, PROPOSED_BOUNDS, budget, policies);
    };
    await life.wait(() => runInDurableObject(D.object, async (_instance, state) => {
      const sql = archiveSql(state), rows = new ArchiveRows(sql, directoryAt), budget = new ArchiveBudget();
      expect(() => new FixtureArchiveSourcePins([{ at: registerAt,
        birth: { bytes: canonicalize(genesis.entry), hash: genesis.hash } }], PROPOSED_BOUNDS, budget, policies)).toThrow("archive-mismatch");
      expect(rows.load()).toBeNull();
      const unavailableBudget = new ArchiveBudget(), unavailable = new FixtureArchiveSourcePins([], PROPOSED_BOUNDS, unavailableBudget, policies);
      const bodyReads: string[] = [];
      const metadataOnly: Sql = { transaction: action => state.storage.transactionSync(action), exec(query, ...args) {
        if (/^SELECT bytes FROM (?:entry|retained_input)\b/.test(query)) bodyReads.push(query);
        return sql.exec(query, ...args);
      } };
      const refused = await planRootPublishedArchivePass(metadataOnly, { at: directoryAt, through, after: null, bounds: PROPOSED_BOUNDS,
        policies, format: "sha1", parent: null, markedAt: timeOf(life.now()), fixtureSources: unavailable, replayScopes: publicScopes }, unavailableBudget);
      expect(refused).toEqual({ ok: false, reason: "foreign-source-unavailable" });
      expect(bodyReads).toEqual([]); expect(rows.load()).toBeNull();
    }));
    const planned = await life.wait(() => runInDurableObject(D.object, async (_instance, state) => {
      const sql = archiveSql(state), budget = new ArchiveBudget();
      const discovered = await target.discover(directoryAt, seed, budget);
      expect(discovered?.publicScopes).toEqual(publicScopes);
      if (!discovered) throw Error("Actual native target metadata required");
      const pins = await prepare(sql, budget);
      const result = await planRootPublishedArchivePass(sql, { at: directoryAt, through, after: null, bounds: PROPOSED_BOUNDS,
        policies, format: "sha1", parent: null, markedAt: timeOf(life.now()), fixtureSources: pins, replayScopes: discovered.publicScopes }, budget);
      if (!result.ok) throw Error(canonicalize({ result, cost: budget.admitted() }));
      expect(result.archive.manifest.anchors).toEqual(expectedAnchors);
      expect(result.mark.anchorPublication).toBe(canonicalize({ anchors: expectedAnchors }));
      expect(result.mark.replayScopes).toEqual(publicScopes);
      expect(result.archive.selection.objects.filter(object => object.key.kind === "entry").map(object => object.foreign?.fact).sort((a, b) => a!.seq - b!.seq)).toEqual(expectedAnchors);
      const rows = new ArchiveRows(sql, directoryAt);
      rows.target(discovered.repository, "sha1", budget); rows.mark(result.mark, budget);
      const pending = rows.load(budget)!.pending;
      expect(pending).toEqual(result.mark);
      return { result, pending, cost: budget.admitted() };
    }));
    expect(await life.wait(() => (D.object as unknown as { checkpoint(): Promise<unknown> }).checkpoint())).toMatchObject({ answer: "written" });
    await life.wait(() => D.restart());
    const rebuilt = await life.wait(() => runInDurableObject(D.object, async (_instance, state) => {
      const sql = archiveSql(state), budget = new ArchiveBudget(), rows = new ArchiveRows(sql, directoryAt), row = rows.load(budget)!;
      expect(row.pending).toEqual(planned.pending);
      const discovered = await target.discover(directoryAt, seed, budget);
      expect(discovered?.repository).toEqual(row.repository); expect(discovered?.publicScopes).toEqual(publicScopes);
      const pins = await prepare(sql, budget);
      const selectedOnly: Sql = { transaction: action => state.storage.transactionSync(action), exec(query, ...args) {
        if (/\bFROM entry\b/.test(query)) expect(args[0]).toBe(0);
        return sql.exec(query, ...args);
      } };
      const result = await rebuildArchivePass(selectedOnly, row, null, budget, pins);
      if (!result.ok) throw Error(canonicalize({ result, cost: budget.admitted() }));
      expect(result.archive.manifest.anchors).toEqual(expectedAnchors);
      expect(result.archive.commit).toBe(planned.result.archive.commit);
      expect(result.archive.objects).toEqual(planned.result.archive.objects);
      expect(result.archive.manifestBytes).toBe(planned.result.archive.manifestBytes);
      expect(rows.load(budget)!.pending).toEqual(planned.pending);
      expect(rows.confirm(result.archive.commit, budget).confirmed).toMatchObject({ through, anchorsPublished: true });
      return { cost: budget.admitted(), commit: result.archive.commit };
    }));
    const later = (await life.wait(() => D.summary())).at;
    expect(later.seq).toBeGreaterThan(through.seq);
    for (const cost of [planned.cost, rebuilt.cost]) for (const key of Object.keys(ARCHIVE_BOUNDS) as (keyof typeof cost)[])
      expect(cost[key]).toBeLessThanOrEqual(ARCHIVE_BOUNDS[key]);
    const report = { expectedAnchors, through, publicScopes, initialCost: planned.cost, rebuildCost: rebuilt.cost, commit: rebuilt.commit,
      qualification: "Genuine Native Register17 creation send and admitted Directory16 source copy; existing policy and original per-pass ledger. Actual source metadata/birth/pin preparation, stored nonempty publication/public identities, later checkpoint and eviction, exact rebuild. Trusted test reader and scripted repository creation; no hosted custody, production binding or full-driver acceptance claim." };
    (context.task.meta as Record<string, unknown>)["nativePrivateAnchorPublication"] = report;
    console.info("Native private anchor publication", JSON.stringify(report));
  } finally { life.release(); }
}, 30_000);

test("Native published Mark rebuilds its exact bytes after a later turn and eviction", async () => {
  const lane = await create({}, {}, archiveDefinition);
  expect((await lane.submit(lane.remark("marked publication input"))).answer).toBe("accepted");
  const through = await lane.head();
  const planned = await lane.inside(async state => {
    const sql = archiveSql(state), budget = new ArchiveBudget();
    const result = await planPublishedArchivePass(sql, { at: lane.at, through, after: null, bounds: lane.c.bounds,
      policies: archivePolicies, format: "sha1", parent: null, markedAt: lane.c.clock.now }, budget);
    if (!result.ok) throw Error(canonicalize(result));
    expect(result.archive.cost).toEqual(budget.admitted());
    expect(result.archive.manifest.anchors).toEqual([]);
    const rows = new ArchiveRows(sql, lane.at); rows.target(archiveRepository, "sha1");
    // A caller cannot set the confirmation flag on a Mark.
    expect(() => rows.mark({ ...result.mark, anchorsPublished: true } as typeof result.mark)).toThrow("archive-row-unavailable");
    expect(rows.load()?.pending).toBeNull();
    rows.mark(result.mark);
    return result;
  });
  expect((await lane.submit(lane.remark("not selected for this pending Mark"))).answer).toBe("accepted");
  await lane.restart();
  const rebuilt = await lane.inside(async state => {
    const sql = archiveSql(state), rows = new ArchiveRows(sql, lane.at), row = rows.load()!;
    const exact: Sql = { transaction: action => state.storage.transactionSync(action), exec(query, ...args) {
      if (/\bFROM entry\b/.test(query)) expect([0, 1]).toContain(args[0]);
      return sql.exec(query, ...args);
    } };
    const result = await rebuildArchivePass(exact, row, null, new ArchiveBudget());
    expect(row.pending?.anchorPublication).toBe(planned.mark.anchorPublication);
    expect(row.pending?.replayScopes).toEqual([lane.at]);
    if (result.ok) expect(rows.confirm(result.archive.commit).confirmed).toMatchObject({ anchorsPublished: true, through });
    return result;
  });
  expect(rebuilt.ok ? "accepted" : rebuilt).toBe("accepted"); if (!rebuilt.ok) return;
  expect(rebuilt.archive.commit).toBe(planned.archive.commit);
  expect(rebuilt.archive.objects).toEqual(planned.archive.objects);
  expect((await lane.head()).seq).toBe(2);
}, 30_000);
