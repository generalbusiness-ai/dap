import { replayAnchorRemarks } from "../../derive/test/definition-corpus/replay-literals-data.ts";
/** Actual journal encoder/reader and verifier over judged in-memory
 * remarks. The task definition/code and Membership observations below
 * are explicit stand-ins; no Native factory, source read or host runs. */
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS, type FactRef, type Seed, type Timestamp } from "@generalbusiness/dap-contract";
import { canonicalize, digestBytes, intentDigest, newIncarnation, scopeIdOf, signIntent, utf8 } from "@generalbusiness/artroom-bytes";
import { clockOf, grantFrom, judgeGenesis, validateDefinition } from "@generalbusiness/dap-derive";
import { keys, Ledger, membership, on, t } from "@generalbusiness/dap-derive/testing";
import { buildJournalPass, type JournalAnchorPublication, type JournalObject } from "@generalbusiness/artroom-git/journal";
import { readJournalArchiveV2 } from "@generalbusiness/artroom-git/journal-reader";
import { ArchiveBudget } from "../../scope/src/archive-budget.ts";
import type { ArchiveSelectedObject } from "../../scope/src/archive-inventory.ts";
import { archiveSource, type ArchiveReadWork } from "../src/archive.ts";
import { main } from "../src/cli.ts";
import { proofOf, STANDING } from "./staging.ts";

const NAMED = "platform:task@1";
const signer: FactRef = { at: membership, ...STANDING };
const registerSeed: Seed = { v: 1, kind: "register", definition: "platform:register@17", creator: null, cause: STANDING.hash, ordinal: 0 };
const extra: FactRef = { at: { scope: scopeIdOf(registerSeed), inc: newIncarnation(new Uint8Array(16).fill(42)), kind: "register" }, seq: 7, hash: STANDING.hash };
const ordered = (facts: readonly FactRef[]) => [...facts].sort((a, b) => a.at.scope < b.at.scope ? -1 : a.at.scope > b.at.scope ? 1 : a.seq - b.seq);

function freshGrant(n: number, at: Timestamp) {
  const proof = proofOf(keys.rita, ["remark"], n, at).fresh!;
  return grantFrom({ ...proof, observation: { ...proof.observation, definition: "platform:membership@8" } });
}
function remarks(count: number, identity = "TEST anchor publication") {
  const data = replayAnchorRemarks();
  const checked = validateDefinition(data, PROPOSED_BOUNDS, undefined, { platform: true });
  if (!checked.ok) throw Error(JSON.stringify(checked));
  const ledger = new Ledger(checked.definition), rules = {};
  const founding = signIntent({ v: 1, to: null, actor: keys.rita.key, kind: "found", on: null, expected: {},
    fields: { source: "TEST remarks" }, idempotencyKey: identity, notAfter: t(60) }, keys.rita.secret);
  const seed: Seed = { v: 1, kind: "directory", definition: NAMED, creator: null, cause: intentDigest(founding.intent), ordinal: 0 };
  const born = judgeGenesis(ledger.state, checked.definition, { name: scopeIdOf(seed), inc: newIncarnation(new Uint8Array(16).fill(41)), seed, creation: founding },
    { clock: clockOf(ledger.state, ledger.now), bounds: PROPOSED_BOUNDS, facts: [], prepared: [], source: null, platform: { named: NAMED, rules } });
  if (born.result !== "write") throw Error(JSON.stringify(born));
  ledger.seal(born.draft);
  for (let n = 1; n <= count; n++) {
    ledger.now = t(n);
    // Membership is absent from the clone. This exact head and value are
    // deliberately caller-word trust, not a synthetic source history.
    const grant = freshGrant(n, ledger.now);
    const written = ledger.act(keys.rita, "remark", { on: 0, fields: { text: `remark ${n}` } },
      { membership, grants: [{ grant, current: true }], platform: { named: NAMED, rules } });
    if (written.result !== "write") throw Error(JSON.stringify(written));
  }
  return { ledger, rules, code: (name: string) => name === NAMED ? { data, rules, membership: () => membership } : null };
}

async function journal(fixture: ReturnType<typeof remarks>, dependencies: readonly ReturnType<typeof remarks>[] = []) {
  const { ledger } = fixture, objects = new Map<string, JournalObject>();
  let current: string | null = null;
  const source = { object: async (id: string, limit: number) => {
    const object = objects.get(id);
    return object ? { type: object.type, size: object.data.length, data: object.data.length <= limit ? object.data : null } : null;
  } };
  const open = (scope: typeof ledger.at.scope, work: ArchiveReadWork) => readJournalArchiveV2({ format: async () => "sha1", resolve: async () => current,
    object: (id, limit) => source.object(id, limit) }, scope, work);
  return {
    async append(from: number, through: number, publication?: JournalAnchorPublication) {
      const budget = new ArchiveBudget({}, () => 0), entries = ledger.entries.slice(from, through + 1);
      const retained = new Map<string, string>(), copies: ArchiveSelectedObject[] = [];
      for (const { entry } of entries) for (const use of entry.uses) {
        const owner = dependencies.find(dependency => dependency.ledger.at.scope === use.fact.at.scope);
        if (!owner) throw Error("An actual judged foreign source is required");
        const bytes = canonicalize(owner.ledger.entries[use.fact.seq]!.entry);
        expect(digestBytes(utf8(bytes))).toBe(use.content);
        retained.set(use.content, bytes);
        const key = { kind: "entry" as const, digest: use.content };
        copies.push({ key, bytes: utf8(bytes).length, pass: from, foreign: { fact: use.fact, pin: NAMED },
          consumers: [{ mode: "required", origin: { at: ledger.fact(entry.seq), input: entry.input.type }, consumer: "foreign-use", purpose: "replay-required", key }] });
      }
      budget.spend({ entries: entries.length, attempts: copies.length });
      const built = await buildJournalPass({ format: "sha1", budget,
        parent: current ? { id: current, source } : null,
        selection: canonicalize({ format: "artroom-local-inventory-2", at: ledger.at,
          through: { seq: through, hash: ledger.fact(through).hash }, after: from ? { seq: from - 1, hash: ledger.fact(from - 1).hash } : null,
          entries: entries.map(({ entry, hash }) => ({ seq: entry.seq, hash, bytes: utf8(canonicalize(entry)).length })),
          objects: copies, omittedTexts: [], ancestryUnwalked: [], replay: "unchecked", retention: "observed-local", cost: budget.admitted(),
          ...(copies.length ? { foreignSources: dependencies.map(dependency => ({ at: dependency.ledger.at, pin: NAMED })) } : {}) }),
        input: { entry: async (seq, limit) => {
          const bytes = canonicalize(ledger.entries[seq]!.entry); return utf8(bytes).length <= limit ? bytes : null;
        }, retained: async (key, limit) => { const bytes = retained.get(key.digest); return bytes !== undefined && utf8(bytes).length <= limit ? bytes : null; } },
        ...(publication ? { publication: () => publication } : {}) });
      expect(built.ok ? "accepted" : built).toBe("accepted");
      if (!built.ok) throw Error(JSON.stringify(built));
      expect(built.archive.manifest.retained.filter(row => row.kind === "entry")).toHaveLength(copies.length);
      for (const object of built.archive.objects) objects.set(object.id, object);
      current = built.archive.commit; return built.archive;
    },
    open,
    source: archiveSource({ open: async (scope, work) => scope === ledger.at.scope
      ? open(scope, work)
      : { ok: false, result: "not-found", reason: "TEST private Membership has no exported journal", location: { scope } } }),
  };
}
const options = (fixture: ReturnType<typeof remarks>, facts: readonly FactRef[] = [signer]) => ({ mode: "replay" as const,
  scope: fixture.ledger.at.scope, platform: fixture.code, grants: "proven" as const, requirePublishedAnchors: true,
  trustPublishedAnchors: true, anchors: facts.map(fact => ({ scope: fact.at.scope, seq: fact.seq, hash: fact.hash })) });

test("a zero-copy remark publishes its signer's Membership head and needs explicit caller trust", async () => {
  const fixture = remarks(1), archive = await journal(fixture);
  await archive.append(0, 0, { anchors: [] });
  const pass = await archive.append(1, 1, { anchors: [signer] });
  expect(pass.manifest).toMatchObject({ entries: [1, 1], anchors: [signer], retained: [] });
  const untrusted = await archive.source.verify({ ...options(fixture), trustPublishedAnchors: false, anchors: [] });
  expect(untrusted).toMatchObject({ kind: "verification", verification: { report: { result: "missing-dependency" } } });
  expect(await archive.source.verify(options(fixture))).toMatchObject({ kind: "verification",
    verification: { report: { result: "consistent", anchors: [signer] } } });
  const output: string[] = [];
  expect(await main(["--git", "TEST-memory-archive", "--all", "--expect-journals", "1", "--trust-published-anchors", "--json"], {
    out: line => output.push(line), err: line => output.push(line), archive: () => archive.source,
    native: { platform: fixture.code }, audit: async () => ({ journals: [{ scope: fixture.ledger.at.scope, commit: pass.commit }],
      secretCheck: { result: "no-recognized-secret", objects: 1, bytes: 1, qualification: "TEST metadata audit only; no secret scan or local Git command" } }),
  })).toBe(0);
  expect(JSON.parse(output[0]!)).toMatchObject({ publishedAnchorsTrusted: true,
    journals: [{ kind: "verification", verification: { report: { result: "consistent", anchors: [signer] } } }] });
});

test("an extra Register anchor refuses exact-list acceptance and names its full fact and pass range", async () => {
  const fixture = remarks(1), archive = await journal(fixture);
  await archive.append(0, 0, { anchors: [] });
  await archive.append(1, 1, { anchors: ordered([signer, extra]) });
  expect(await archive.source.verify(options(fixture, [signer, extra]))).toMatchObject({ kind: "archive-failure", result: "anchor-unneeded",
    location: { anchor: extra, range: { from: 1, through: 1 } } });
});

test("a remarks-only legacy prefix accepts its exact list and charges cached consultations to each range", async () => {
  const fixture = remarks(3), archive = await journal(fixture);
  await archive.append(0, 2);
  await archive.append(3, 3, { anchors: [signer], legacyAnchors: { from: 0, through: 2, anchors: [signer] } });
  expect(await archive.source.verify(options(fixture))).toMatchObject({ kind: "verification",
    verification: { report: { result: "consistent", anchors: [signer] } } });
  const extraLegacy = await journal(fixture);
  await extraLegacy.append(0, 2);
  await extraLegacy.append(3, 3, { anchors: [signer], legacyAnchors: { from: 0, through: 2, anchors: ordered([signer, extra]) } });
  expect(await extraLegacy.source.verify(options(fixture, [signer, extra]))).toMatchObject({ kind: "archive-failure", result: "anchor-unneeded",
    location: { anchor: extra, range: { from: 0, through: 2, legacy: true } } });
});

test("a cached anchored fact from another pass cannot fill an omitted anchor in this pass", async () => {
  const fixture = remarks(2), archive = await journal(fixture);
  await archive.append(0, 1, { anchors: [signer] });
  await archive.append(2, 2, { anchors: [] });
  expect(await archive.source.verify(options(fixture))).toMatchObject({ kind: "verification",
    verification: { report: { result: "missing-dependency", at: { seq: 2 }, dependencies: { missing: [signer] } } } });
});

test("nested public proofs use their own published ranges and name their own unused anchor", async () => {
  for (const needs of [[], ordered([signer, extra])]) {
    const dependency = remarks(1, "TEST dependency"), target = remarks(0, "TEST target");
    const fact = dependency.ledger.fact(1), entry = dependency.ledger.entries[1]!.entry;
    target.ledger.now = t(2);
    target.ledger.remember([{ fact, entry, under: "platform:task" }]);
    const vouched = target.ledger.act(keys.rita, "vouch", on(target.ledger, 0), { membership,
      grants: [{ grant: freshGrant(1, target.ledger.now), current: true }], platform: { named: NAMED, rules: target.rules },
      presented: { proof: fact }, facts: [{ fact, entry, under: "platform:task" }] });
    expect(vouched.result).toBe("write");
    expect(target.ledger.last.uses).toEqual([{ fact, content: digestBytes(utf8(canonicalize(entry))) }]);
    const prior = await journal(dependency), own = await journal(target, [dependency]);
    const parent = await prior.append(0, 1, { anchors: needs });
    await own.append(0, 1, { anchors: [signer] });
    const source = archiveSource({ open: async (scope, work) => scope === target.ledger.at.scope ? own.open(scope, work)
      : scope === dependency.ledger.at.scope ? prior.open(scope, work)
        : { ok: false, result: "not-found", reason: "TEST private source absent", location: { scope } } });
    const result = await source.verify(options(target, [signer, extra]));
    if (needs.length === 0) expect(result).toMatchObject({ kind: "verification", verification: { report: { result: "missing-dependency", at: { at: dependency.ledger.at, seq: 1 } } } });
    else expect(result).toMatchObject({ kind: "archive-failure", result: "anchor-unneeded",
      location: { scope: dependency.ledger.at.scope, commit: parent.commit, anchor: extra, range: { from: 0, through: 1 } } });
  }
});
