/** Actual native foreign uses/retention/SQLite. Grants, reviewed policy,
 * clock and setup reader are explicit TEST fixtures. This classifies
 * metadata and local inventory only: no installed export or replay verdict. */
import { expect, onTestFinished, test } from "vitest";
import { env } from "cloudflare:test";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import type { Input, SendForm } from "@generalbusiness/dap-contract";
import { canonicalize, utf8 } from "@generalbusiness/artroom-bytes";
import { variant } from "@generalbusiness/dap-derive/testing";
import { outcomeValueDomains, validateDefinition } from "@generalbusiness/dap-derive";
import { RULE_PROFILES } from "@generalbusiness/dap-derive/rule";
import { COUNTING_COHORT, platform } from "@generalbusiness/dap-platform";
import { ArchiveBudget, type ArchiveCost } from "../src/archive-budget.ts";
import { buildJournalArchive, journalRef, JournalWork } from "@generalbusiness/artroom-git/journal";
import { JournalObjectReader, JournalObjects } from "../../git/src/journal-objects.ts";
import { readJournalArchive } from "@generalbusiness/artroom-git/journal-reader";
import { planArchive, rebuildArchive } from "../src/archive-build.ts";
import { ArchiveRows } from "../src/archive-row.ts";
import type { FixtureArchiveProvider } from "../src/archive-driver.ts";
import { archiveRepository, archiveSql } from "./support/archive.ts";
import { fixtureArchiveWiring } from "./worker.ts";
import { sessionRoom } from "./support/session-room.ts";
import { namespace } from "../src/namespace.ts";
import { ArchiveForeignMetadata } from "../src/archive-foreign.ts";
import { archiveInput } from "../src/archive-input.ts";
import { archivePrefixMetadata } from "../src/archive-prefix.ts";
import { archivePrivacyMetadata } from "../src/archive-privacy.ts";
import { FixtureArchiveSourcePins } from "../src/archive-source-pins.ts";
import { inventoryArchive, type ArchivePolicyRegistry, type ReviewedArchivePolicy } from "../src/archive-inventory.ts";
import { at, definition, create, reader, rita } from "./support.ts";
import { wired } from "./outside.ts";
const variants = new Set<Input["type"]>(["genesis", "act", "delivery", "timed", "diagnosis", "outcome", "preparation", "checkpoint"]);
const receiver = variant(definition.declared, data => {
  // Same producer name, different exact pin: the name cannot choose policy.
  data.acts.remark.fields.text.max = 127;
  data.acts.remark.fields.proof.kind = ["assign", "found"];
  data.acts.link.sends = data.acts.link.sends.filter((send: SendForm) => !("create" in send));
});
const policy = (def: typeof definition, entryTypes = variants): ReviewedArchivePolicy => ({ review: "TEST reviewed inline classes; no production certificate",
  entryTypes, support: { named: def.digest, definition: def, owners: new Map(), records: new Map(), preparations: new Map() } });
async function fixture() {
  const producer = await create(), consumer = await create({}, {}, receiver);
  const commitment = await producer.commitment(), assigned = (await producer.sealed()).find(sealed => sealed.entry.seq > commitment && sealed.entry.input.type === "act" && sealed.entry.input.signed.intent.kind === "assign")!;
  expect(assigned).toBeDefined();
  // The simple create fixture normally has a SCRIPTED foreign resolver.
  // Select the real namespace resolver for these actual peer source reads.
  wired.set(consumer.name, () => ({ resolver: namespace(env.SCOPES).resolver }));
  try {
    await consumer.restart();
    await consumer.did(rita, "remark", { on: 0, fields: { text: "actual foreign assignment", proof: { at: producer.at, seq: assigned.entry.seq, hash: assigned.hash } } });
    await consumer.did(rita, "remark", { on: 0, fields: { text: "actual foreign genesis", proof: producer.genesis.fact } });
  } finally { wired.delete(consumer.name); }
  const birth = await producer.stub.entry(reader, 0); expect(birth.ok).toBe(true); if (!birth.ok) return expect.fail("native birth read required");
  const entries = await consumer.sealed(), uses = entries.flatMap(sealed => sealed.entry.uses);
  expect(uses).toHaveLength(2);
  const sources = new FixtureArchiveSourcePins([{ at: producer.at, birth: { bytes: canonicalize(birth.value.entry), hash: birth.value.hash }, declaration: canonicalize(definition.declared) }], PROPOSED_BOUNDS, new ArchiveBudget());
  const policies: ArchivePolicyRegistry = new Map([[receiver.digest, policy(receiver)], [definition.digest, policy(definition)]]);
  const through = await consumer.head();
  const scan = (pins = sources, reviewed = policies) => consumer.inside(state => {
    const forbidden: string[] = [], queries: string[] = [], budget = new ArchiveBudget();
    const sql = { exec(query: string, ...args: (string | number | null | ArrayBuffer)[]) {
      queries.push(query);
      if (/^SELECT (?:\*|bytes)(?:\s|,)/.test(query)) { forbidden.push(query); throw Error("body tripwire"); }
      return state.storage.sql.exec(query, ...args);
    } };
    let reason = "admitted", positions: number[] = [], basis: ReturnType<ArchiveForeignMetadata["basis"]> = [], copies: unknown[] = [];
    try {
      const foreign = new ArchiveForeignMetadata(sql, pins, reviewed, PROPOSED_BOUNDS, budget);
      const prefix = archivePrefixMetadata(sql, consumer.at, through, PROPOSED_BOUNDS, budget, new Set([receiver.digest]));
      positions = archivePrivacyMetadata(sql, prefix, policy(receiver).support, budget, foreign).positions.map(position => position.seq);
      basis = foreign.basis(); copies = uses.map(use => foreign.get(use.content));
    } catch (error) { reason = (error as { reason: string }).reason; }
    expect(forbidden).toEqual([]);
    return { reason, positions, basis, copies, queries, cost: budget.admitted() };
  });
  const inventory = (pins: FixtureArchiveSourcePins | undefined = sources, reviewed = policies, damageBody = false, limits: Partial<ArchiveCost> = {}) => consumer.inside(state => {
    const calls: { query: string; key: unknown }[] = [];
    let damaged = false;
    const result = inventoryArchive({ exec(query, ...args) {
      calls.push({ query, key: args[0] });
      if (damageBody && !damaged && query.startsWith("SELECT bytes FROM retained_input") && args[0] === "entry") {
        damaged = true;
        // Change a genuine retained body after metadata admission. Neither
        // source nor consumer journal is changed; the content hash must fail.
        const seq = uses.find(use => use.content === args[1])!.fact.seq;
        state.storage.sql.exec("UPDATE retained_input SET bytes = replace(bytes, ?, ?) WHERE kind = 'entry' AND digest = ?", `"seq":${seq}`, `"seq":${seq + 1}`, args[1]!);
      }
      return state.storage.sql.exec(query, ...args);
    }, transaction: work => state.storage.transactionSync(work) }, consumer.at, through, PROPOSED_BOUNDS, reviewed, new ArchiveBudget(limits), pins);
    return { result, calls, damaged };
  });
  return { producer, consumer, birth: birth.value, uses, sources, policies, scan, inventory };
}

test("direct foreign copies classify their own full headers against fixture pins and separate reviewed policy before any payload body", async () => {
  const f = await fixture(), result = await f.scan();
  expect(result.reason).toBe("admitted"); expect(result.positions).toEqual([0, 1, 2]);
  expect(result.basis).toEqual([{ at: f.producer.at, pin: definition.digest }]);
  expect(result.copies).toEqual(f.uses.map(use => expect.objectContaining({ content: use.content, fact: use.fact, pin: definition.digest, under: definition.declared.name })));
  expect(result.queries.some(query => query.includes("json_each(entry.bytes, '$.uses')"))).toBe(true);
  expect(result.cost.attempts).toBeGreaterThan(0);
});

test("missing source or inline policy and a conflicting retained genesis pin refuse the whole prefix before payloads", async () => {
  const f = await fixture();
  const missing = await f.scan(new FixtureArchiveSourcePins([], PROPOSED_BOUNDS, new ArchiveBudget()));
  expect(missing.reason).toBe("foreign-source-unavailable"); expect(missing.positions).toEqual([]);
  const absentPolicy = await f.scan(f.sources, new Map([[receiver.digest, policy(receiver)]]));
  expect(absentPolicy.reason).toBe("unsupported-archive-cohort"); expect(absentPolicy.positions).toEqual([]);
  const incompletePolicy = await f.scan(f.sources, new Map([[receiver.digest, policy(receiver)], [definition.digest, policy(definition, new Set(["act"]))]]));
  expect(incompletePolicy.reason).toBe("unsupported-archive-cohort"); expect(incompletePolicy.positions).toEqual([]);
  const genesisUse = f.uses.find(use => use.fact.seq === 0)!;
  const damaged = structuredClone(f.birth.entry); if (damaged.input.type !== "genesis") return expect.fail("native genesis required");
  // Corrupt only the locally retained copy, never the producer/consumer journal.
  damaged.input.seed.definition = receiver.digest;
  await f.consumer.inside(state => { state.storage.sql.exec("UPDATE retained_input SET bytes = ? WHERE kind = 'entry' AND digest = ?", canonicalize(damaged), genesisUse.content); });
  const conflict = await f.scan();
  expect(conflict.reason).toBe("foreign-source-mismatch"); expect(conflict.positions).toEqual([]);
});

test("native inventory admits only classified direct copies and refuses a final uncovered class before any entry body", async () => {
  const f = await fixture();
  const incomplete = await f.inventory(f.sources, new Map([[receiver.digest, policy(receiver)], [definition.digest, policy(definition, new Set(["act"]))]]));
  expect(incomplete.result).toEqual({ ok: false, reason: "unsupported-archive-cohort" });
  const bodies = (calls: typeof incomplete.calls) => calls.filter(call => call.query.startsWith("SELECT bytes FROM entry") || call.query.startsWith("SELECT bytes FROM retained_input") && call.key !== "definition" || call.query.startsWith("SELECT bytes FROM retained_value"));
  expect(bodies(incomplete.calls)).toEqual([]);
  const missing = await f.inventory(new FixtureArchiveSourcePins([], PROPOSED_BOUNDS, new ArchiveBudget()));
  expect(missing.result).toEqual({ ok: false, reason: "foreign-source-unavailable" }); expect(bodies(missing.calls)).toEqual([]);
  const accepted = await f.inventory(f.sources, f.policies, false, { nodes: 2 });
  expect(accepted.result.ok).toBe(true);
  if (!accepted.result.ok) return;
  const short = await f.inventory(f.sources, f.policies, false, { nodes: 1 });
  expect(short.result).toEqual({ ok: false, reason: "limit" }); expect(bodies(short.calls)).toEqual([]);
  expect(accepted.result.inventory.cost.nodes).toBe(2); // root + one producer declaration, used twice
  expect(accepted.result.inventory.foreignSources).toEqual([{ at: f.producer.at, pin: definition.digest }]);
  expect(accepted.result.inventory.objects.map(object => object.key)).toEqual([{ kind: "definition", digest: receiver.digest }, ...f.uses.map(use => ({ kind: "entry", digest: use.content }))]);
  expect(accepted.result.inventory.objects.filter(object => object.key.kind === "entry").map(object => object.foreign)).toEqual(f.uses.map(use => ({ fact: use.fact, pin: definition.digest })));
  expect(bodies(accepted.calls).filter(call => call.key === "entry")).toHaveLength(2);
  expect(accepted.result.inventory.replay).toBe("unchecked");
  // Rebuild reads the immutable result after another native turn/restart.
  // The fixture supplies the same separately prepared source-pin map.
  const selection = accepted.result.inventory;
  await f.consumer.did(rita, "remark", { on: 0, fields: { text: "later unselected native act" } });
  await f.consumer.restart();
  await f.consumer.inside(async state => {
    let calls = 0;
    const sql = { exec(query: string, ...args: (string | number | null | ArrayBuffer)[]) {
      calls++; expect(query).not.toContain("json_each"); expect(query).not.toContain("FROM meta");
      return state.storage.sql.exec(query, ...args);
    }, transaction: <T>(work: () => T) => state.storage.transactionSync(work) };
    expect(() => archiveInput(sql, selection, new ArchiveBudget())).toThrow(expect.objectContaining({ reason: "foreign-source-unavailable" }));
    const wrongPair = { ...selection, foreignSources: [{ at: f.producer.at, pin: receiver.digest }] };
    expect(() => archiveInput(sql, wrongPair, new ArchiveBudget(), f.sources)).toThrow(expect.objectContaining({ reason: "foreign-source-mismatch" }));
    expect(calls).toBe(0);
    const input = archiveInput(sql, selection, new ArchiveBudget(), f.sources);
    for (const object of selection.objects.filter(object => object.key.kind === "entry")) {
      const bytes = await input.retained(object.key, object.bytes);
      expect(bytes).not.toBeNull();
      expect(JSON.parse(bytes!).at).toEqual(f.producer.at);
    }
    expect(await input.entry(3, 1)).toBeNull();
  });
  const damaged = await f.inventory(f.sources, f.policies, true);
  expect(damaged.damaged).toBe(true);
  expect(damaged.result).toEqual({ ok: false, reason: "incomplete" });
});

// Native direct-use scopes, not an installed application. This covers the
// immutable Mark/layout/structural reader boundary; no host or replay claim.
test.each(["sha1", "sha256"] as const)("foreign copies retain their source basis in %s files and rebuild after eviction", async format => {
  const f = await fixture(), through = await f.consumer.head();
  const planned = await f.consumer.inside(state => planArchive(archiveSql(state), { at: f.consumer.at, through, bounds: PROPOSED_BOUNDS, policies: f.policies, format, parent: null, markedAt: at(0), fixtureSources: f.sources }, new ArchiveBudget()));
  expect(planned.ok, JSON.stringify(planned)).toBe(true); if (!planned.ok) return;
  expect(planned.archive.manifest.foreignSources).toEqual([{ at: f.producer.at, pin: definition.digest }]);
  await f.consumer.inside(state => { const rows = new ArchiveRows(archiveSql(state), f.consumer.at); rows.target(archiveRepository, format); rows.mark(planned.mark); });
  await f.consumer.did(rita, "remark", { on: 0, fields: { text: "after immutable Mark" } });
  await f.consumer.restart();
  const rebuilt = await f.consumer.inside(async state => {
    const sql = archiveSql(state), row = new ArchiveRows(sql, f.consumer.at).load()!;
    let reads = 0;
    const exact = { ...sql, exec: (...args: Parameters<typeof sql.exec>) => { reads++; return sql.exec(...args); } };
    expect(await rebuildArchive(exact, row, null, new ArchiveBudget())).toEqual({ ok: false, reason: "foreign-source-unavailable" });
    expect(reads).toBe(0);
    return rebuildArchive(exact, row, null, new ArchiveBudget(), f.sources);
  });
  expect(rebuilt.ok, JSON.stringify(rebuilt)).toBe(true); if (!rebuilt.ok) return;
  expect(rebuilt.archive.commit).toBe(planned.archive.commit); expect(rebuilt.archive.objects).toEqual(planned.archive.objects);
  const objects = new Map(rebuilt.archive.objects.map(object => [object.id, object]));
  const object = async (id: string, limit: number) => { const object = objects.get(id); return object ? { type: object.type, size: object.data.length, data: object.data.length <= limit ? object.data : null } : null; };
  const open = (commit: string) => {
    const native = new ArchiveBudget(); let bytes = 0;
    return readJournalArchive({ format: async () => format, resolve: async ref => ref === journalRef(f.consumer.at.scope) ? commit : null, object,
    }, f.consumer.at.scope, Object.assign(native, { bytes: (size: number) => { bytes += size; if (bytes > 8 * 1024 * 1024) native.stop("limit"); }, scope: () => native.spend({ nodes: 1 }) }));
  };
  const read = await open(rebuilt.archive.commit);
  expect(read.ok, JSON.stringify(read)).toBe(true); if (!read.ok) return;
  expect(read.archive.foreignSources).toEqual(planned.archive.manifest.foreignSources);
  expect(read.archive.head).toEqual(through);
  expect(read.archive.retained.filter(input => input.kind === "entry").map(input => input.digest).sort()).toEqual(f.uses.map(use => use.content).sort());
  // A later native act introduces another real producer. The cumulative
  // archive adds its basis while the checked parent keeps only its own.
  const laterProducer = await create();
  wired.set(f.consumer.name, () => ({ resolver: namespace(env.SCOPES).resolver }));
  try {
    await f.consumer.restart();
    await f.consumer.did(rita, "remark", { on: 0, fields: { text: "later producer", proof: laterProducer.genesis.fact } });
  } finally { wired.delete(f.consumer.name); }
  const laterBirth = await laterProducer.stub.entry(reader, 0);
  expect(laterBirth.ok).toBe(true); if (!laterBirth.ok) return;
  const nextSources = new FixtureArchiveSourcePins([
    { at: f.producer.at, birth: { bytes: canonicalize(f.birth.entry), hash: f.birth.hash }, declaration: canonicalize(definition.declared) },
    { at: laterProducer.at, birth: { bytes: canonicalize(laterBirth.value.entry), hash: laterBirth.value.hash }, declaration: canonicalize(definition.declared) },
  ], PROPOSED_BOUNDS, new ArchiveBudget());
  const nextHead = await f.consumer.head();
  const extended = await f.consumer.inside(state => {
    const sql = archiveSql(state);
    // Component confirmation stands in for host custody, as in the owning
    // local build witness. It writes no journal entry.
    new ArchiveRows(sql, f.consumer.at).confirm(planned.mark.commit);
    return planArchive(sql, { at: f.consumer.at, through: nextHead, bounds: PROPOSED_BOUNDS, policies: f.policies, format, parent: { id: planned.archive.commit, source: { object } }, markedAt: at(1), fixtureSources: nextSources }, new ArchiveBudget({ nodes: 2 }));
  });
  expect(extended.ok, JSON.stringify(extended)).toBe(true); if (!extended.ok) return;
  expect(extended.archive.newInterval).toEqual([through.seq + 1, nextHead.seq]);
  expect(extended.archive.manifest.foreignSources).toHaveLength(2);
  expect(planned.archive.manifest.foreignSources).toHaveLength(1);
  // A validly shaped selection still cannot invent a different consumer
  // fact. Layout must refuse it before asking for any retained copy body.
  const altered = JSON.parse(planned.mark.manifest);
  altered.objects.find((object: { foreign?: { fact: { seq: number } } }) => object.foreign?.fact.seq !== undefined && object.foreign.fact.seq > 0).foreign.fact.seq++;
  const budget = new ArchiveBudget(); budget.spend(altered.cost);
  const wrong = await buildJournalArchive({ format, selection: canonicalize(altered), budget, parent: null, input: {
    entry: async seq => read.archive.entries.find(entry => entry.seq === seq)?.bytes ?? null,
    retained: async () => expect.fail("altered foreign binding reached a retained body"),
  } });
  expect(wrong).toMatchObject({ ok: false, reason: "input-mismatch" });
  // Mechanically alter only the archive's descriptive pin. Re-encode valid
  // Git hashes/trees/commit so the independent reader must detect the
  // retained genesis disagreement, rather than an object hash corruption.
  const work = new JournalWork(new ArchiveBudget()), maker = new JournalObjects(format, work), parser = new JournalObjectReader(format, { object }, work);
  const manifest = { ...rebuilt.archive.manifest, foreignSources: [{ at: f.producer.at, pin: receiver.digest }] };
  const blob = maker.make("blob", utf8(canonicalize(manifest)));
  const change = (tree: string, path: readonly string[]): string => maker.tree(parser.tree(objects.get(tree)!.data).map(row => row.name === path[0] ? { ...row, id: path.length === 1 ? blob.id : change(row.id, path.slice(1)) } : row)).id;
  const original = parser.commit(objects.get(rebuilt.archive.commit)!.data), tree = change(original.tree, ["journal", "v1", "manifest.json"]);
  const corrupted = maker.commit(tree, original.parent, original.seconds);
  for (const made of maker.objects()) objects.set(made.id, made);
  expect(await open(corrupted.id)).toMatchObject({ ok: false, result: "mismatch", reason: "foreign copy birth differs from its classified source pin" });
});

test("native alarm stops a marked foreign archive after source configuration disappears without another mint", async () => {
  const f = await fixture(); let mints = 0, sends = 0;
  // Explicit TEST host/credential stand-in. The native alarm and persisted
  // archive row are real; no provider adapter or outside send runs.
  const provider: FixtureArchiveProvider = { fixture: "archive-provider", format: async () => "sha1", ref: async () => null, objects: async () => [],
    mintArchive: async () => { mints++; return null; }, sendArchive: async () => { sends++; return null; }, revokeArchive: async () => {},
  };
  const wiring = { policies: { fixture: "archive-policies" as const, registry: f.policies }, target: { fixture: "archive-target" as const, resolve: async () => archiveRepository }, provider };
  fixtureArchiveWiring.set(f.consumer.name, { ...wiring, fixtureSources: f.sources });
  onTestFinished(() => { fixtureArchiveWiring.delete(f.consumer.name); });
  await f.consumer.restart();
  await f.consumer.did(rita, "remark", { on: 0, fields: { text: "schedule configured foreign archive" } });
  const before = await f.consumer.head();
  expect(await f.consumer.alarm()).toBe(true);
  const marked = await f.consumer.inside(state => new ArchiveRows(archiveSql(state), f.consumer.at).load()!);
  expect(marked.pending).not.toBeNull(); expect(marked.next).not.toBeNull(); expect(mints).toBe(1);
  // Same separate reviewed policy, but no graph source metadata on restart.
  fixtureArchiveWiring.set(f.consumer.name, wiring);
  f.consumer.c.clock.now = marked.next!; await f.consumer.restart();
  expect(await f.consumer.alarm()).toBe(true);
  const stopped = await f.consumer.inside(state => new ArchiveRows(archiveSql(state), f.consumer.at).load()!);
  expect(stopped.stopped?.reason).toBe("foreign-source-unavailable");
  expect(stopped.pending).toEqual(marked.pending); expect(mints).toBe(1); expect(sends).toBe(0);
  expect(await f.consumer.inside(state => state.storage.getAlarm())).toBeNull();
  expect(await f.consumer.head()).toEqual(before);
});

test("a genuine legacy membership copy refuses before body selection despite fixture identity and caller policy", async () => {
  const { life, children } = await sessionRoom(COUNTING_COHORT.register), membership = children[0]!;
  try {
    const seq = await life.wait(() => membership.did(rita, "seat", { expected: { roster: 1 } }));
    const sourceAt = await life.wait(() => membership.at()), source = await life.wait(() => membership.stub.entry(reader, seq)), birth = await life.wait(() => membership.stub.entry(reader, 0));
    expect(source.ok && birth.ok).toBe(true); if (!source.ok || !birth.ok) return;
    const accepting = variant(receiver.declared, data => { data.acts.remark.fields.proof.kind = ["seat"]; data.acts.remark.fields.proof.under = "platform:membership"; });
    const consumer = await create({}, {}, accepting);
    wired.set(consumer.name, () => ({ resolver: namespace(env.PLATFORM).resolver }));
    try {
      await consumer.restart();
      await consumer.did(rita, "remark", { on: 0, fields: { text: "real legacy member source", proof: { at: sourceAt, seq, hash: source.value.hash } } });
    } finally { wired.delete(consumer.name); }
    const sources = new FixtureArchiveSourcePins([{ at: sourceAt, birth: { bytes: canonicalize(birth.value.entry), hash: birth.value.hash } }], PROPOSED_BOUNDS, new ArchiveBudget());
    const native = platform(COUNTING_COHORT.membership)!;
    const checked = validateDefinition(native.data, PROPOSED_BOUNDS, RULE_PROFILES, { platform: true, outcomeValues: outcomeValueDomains(native.data, native.rules) });
    expect(checked.ok).toBe(true); if (!checked.ok) return;
    const policies: ArchivePolicyRegistry = new Map([[accepting.digest, policy(accepting)], [COUNTING_COHORT.membership, { review: "TEST caller policy cannot override excluded credential cohort", entryTypes: variants,
      support: { named: COUNTING_COHORT.membership, definition: checked.definition, owners: new Map(), records: new Map(), preparations: new Map() } }]]);
    const through = await consumer.head();
    await consumer.inside(state => {
      const bodies: string[] = [];
      const result = inventoryArchive({ exec(query, ...args) {
        if (query.startsWith("SELECT bytes FROM entry") || query.startsWith("SELECT bytes FROM retained_input") && args[0] !== "definition") bodies.push(query);
        return state.storage.sql.exec(query, ...args);
      }, transaction: work => state.storage.transactionSync(work) }, consumer.at, through, PROPOSED_BOUNDS, policies, new ArchiveBudget(), sources);
      expect(result).toEqual({ ok: false, reason: "unsupported-credential-cohort" }); expect(bodies).toEqual([]);
    });
  } finally { life.release(); }
});
