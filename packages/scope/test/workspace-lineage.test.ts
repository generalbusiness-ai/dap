import { expect, test, vi } from "vitest";
import { PROPOSED_BOUNDS, type Effect, type Entry, type FactRef, type GenesisEntry, type ScopeId, type ScopeRef, type Seed, type SequenceEntry, type SignedIntent } from "@generalbusiness/dap-contract";
import { admitSequenceGenesis, canonicalize, digestBytes, entryHash, factRefOf, intentDigest, newGenesisNonce, platformName, scopeIdOf, signIntent, utf8 } from "@generalbusiness/dap-bytes";
import { MemoryState } from "@generalbusiness/dap-derive";
import { keys, variant } from "@generalbusiness/dap-derive/testing";
import type { OutsideGiven } from "../src/given.ts";
import { outsideOf } from "../src/worker.ts";
import type { ArtifactsBindings } from "../src/artifacts-wiring.ts";
import { WorkspaceHost } from "../src/workspace-host.ts";
import { ArtifactsProvider } from "../src/artifacts-host.ts";
import { create } from "./fixtures-native.ts";
import type { NativeBirth } from "../src/native-birth.ts";
import { workspaceRepository, type WorkspaceSources } from "../src/workspace-lineage.ts";
import { staged } from "./hosted.ts";
import { workspaceAncestors } from "./support/workspace-ancestors.ts";
import type { Diagnosis } from "../src/diag.ts";
import type { MetricPoint } from "../src/metrics.ts";
import { measured, operationContext } from "../src/operational.ts";

// Register, Directory and Destination entries pass their actual creation and
// outcome judges in memory. Lane creation and trusted proof readers remain
// STAND-INS. This proves parsing, not independent proof authentication or Git.
function fixture(laneNonce = 4) {
  const definition = variant(staged.declared, draft => { draft.capabilities.find((cap: { name: string }) => cap.name === "hold").version = 2; });
  const time = "2026-10-30T10:00:00Z", hash = digestBytes(utf8("fixture"));
  const seed = (kind: Seed["kind"], named: Seed["definition"], creator: ScopeRef | null, cause = hash, ordinal = 0): Seed => ({ v: 1, kind, definition: named, creator, cause, ordinal });
  // A later entry written by hand: it names its sequence's genesis, and nothing judged it.
  const sealed = (at: ScopeRef, seq: number, input: SequenceEntry["input"], effects: SequenceEntry["effects"] = [], sends: SequenceEntry["sends"] = []): SequenceEntry => ({ v: 1, genesis: at.genesis, seq, prev: hash, time, clamped: false, epoch: 0, input, uses: [], prepared: [], effects, sends });
  const signed = (at: ScopeRef, kind: string, fields: SignedIntent["intent"]["fields"]): SignedIntent => signIntent({ v: 1, to: at, actor: keys.rita.key, kind, on: null, fields, expected: {}, idempotencyKey: kind, notAfter: "2026-10-30T10:10:00Z" }, keys.rita.secret);
  const judged = workspaceAncestors(time, "actual-room-space", "workspace lineage fixture");
  const { register, directory, destination, repository } = judged;
  const open = signed(directory, "open-issue", { definition: definition.digest });
  const laneSeed = seed("lane", definition.digest, directory, intentDigest(open.intent));
  const laneMessage = { class: "request", type: "create", body: { fields: {}, directory } } as const;
  const creation = sealed(directory, 5, { type: "act", signed: open, authority: [], presented: {} }, [], [{ n: 0, to: laneSeed, message: laneMessage }]);
  // STAND-IN: the lane's genesis, made by hand from the scripted creation. Its hash is the lane's genesis.
  const born: GenesisEntry = { v: 1, seq: 0, prev: null, time, clamped: false, epoch: 0,
    input: { type: "genesis", seed: laneSeed, nonce: newGenesisNonce(new Uint8Array(16).fill(laneNonce)), kind: "establish", founding: null, source: factRefOf(creation, directory), sourceKind: "directory", n: 0, message: laneMessage, decision: "applied" },
    uses: [], prepared: [], effects: [], sends: [] };
  const local = admitSequenceGenesis(canonicalize(born), { scope: scopeIdOf(laneSeed), genesis: entryHash(born) }, PROPOSED_BOUNDS.entryBytes);
  if (!local) throw new Error("the lane's hand-made genesis must bind its address");
  const lane = local.at;
  // Each entry with the full reference of its sequence. Proofs are made at each read, so a test may change an entry first.
  const rows: { at: ScopeRef; entry: Entry }[] = [...judged.rows, { at: directory, entry: creation }];
  const entries = rows.map(row => row.entry);
  const proof = (row: { at: ScopeRef; entry: Entry }) => ({ fact: factRefOf(row.entry, row.at), bytes: canonicalize(row.entry) });
  const genesisOf = (kind: Seed["kind"]) => rows.find(row => row.entry.input.type === "genesis" && row.entry.input.seed.kind === kind)!.entry;
  let calls = 0;
  const sources: WorkspaceSources = {
    births: { async read(name, kind) {
      calls++;
      const row = rows.find(row => row.at.scope === name && row.entry.input.type === "genesis" && row.entry.input.seed.kind === kind), entry = row?.entry;
      if (!row || !entry || entry.input.type !== "genesis") return null;
      const named = entry.input.seed.definition as `platform:${string}@${number}`;
      return { v: 1, proof: proof(row), named, declarationName: platformName(named as never), native: true } as NativeBirth;
    } },
    proofs: { async read(fact) { calls++; const row = rows.find(row => entryHash(row.entry) === fact.hash); return row ? proof(row) : null; } },
  };
  const state = new MemoryState();
  state.setScope({ held: [], at: lane, kind: "lane", status: "active", creator: directory, head: { seq: 0, hash: entryHash(born) }, time, genesis: { hash: entryHash(born), source: born.input.type === "genesis" ? born.input.source : null, n: 0 } });
  const given: OutsideGiven = { localSequence: () => local, definition: () => definition, state, scope: () => state.scope(), own: seq => seq === 0 ? { entry: born, hash: entryHash(born) } : null,
    genesis: () => born.input.type === "genesis" ? born.input : null, retained: () => null, clock: { read: () => time }, random: { bytes: n => new Uint8Array(n) } };
  // A later lane entry written by hand, as an operation's origin: it names the lane's genesis, and nothing judged it.
  const later = (seq: number, effects: Effect[]): SequenceEntry => sealed(lane, seq, { type: "checkpoint", through: 0, state: entryHash(born) }, effects);
  return { state, given, sources, entries, genesisOf, destination, repository, register, calls: () => calls, born, lane, later, judged };
}

test("workspace lineage binds six immutable reads to the actual room namespace and refuses a wrong register or borrowed destination", async () => {
  const f = fixture();
  const directory = f.genesisOf("directory");
  const { claim, claimFact, selected } = f.judged;
  expect(claim.input).toMatchObject({ type: "act", signed: { intent: { kind: "found" } } });
  expect(selected.input).toMatchObject({ type: "outcome", owner: "platform:register@17", kind: "create-repository", result: "confirmed", evidence: { basis: "own-answer" } });
  expect(selected.effects).toContainEqual(expect.objectContaining({ effect: "attempt", selected: true, result: "confirmed" }));
  expect(directory.input).toMatchObject({ type: "genesis", source: factRefOf(selected, f.register), message: { body: { fields: { claim: claimFact } } } });
  expect(directory.uses.map(use => use.fact)).toEqual([factRefOf(selected, f.register), claimFact]);
  expect(selected.seq).toBeGreaterThan(claim.seq);
  expect(await workspaceRepository(f.given, f.sources, f.register.scope, "artifacts", "actual-room-space")).toEqual({ destination: f.destination, repository: f.repository, branch: "main" });
  expect(f.calls()).toBe(6);
  expect(await workspaceRepository(f.given, f.sources, f.register.scope, "artifacts", "label-from-an-operator")).toBeNull();
  const other = `sc_${"z".repeat(52)}` as ScopeId;
  expect(await workspaceRepository(f.given, f.sources, other, "artifacts", "actual-room-space")).toBeNull();
  const destination = f.genesisOf("destination");
  if (destination.input.type !== "genesis") return expect.fail("fixture destination genesis required");
  destination.input.source = { ...destination.input.source!, seq: 9 };
  expect(await workspaceRepository(f.given, f.sources, f.register.scope, "artifacts", "actual-room-space")).toBeNull();
});

// Adversarial replies below recompute their fact hashes and canonical proof
// bytes. Their forged sends are not new judgments or authenticated ancestors.
test("workspace lineage refuses a forged opening claim and an unselected repository outcome", async () => {
  const forged = fixture();
  const directory = forged.genesisOf("directory");
  if (directory.input.type !== "genesis" || !directory.input.message || directory.input.message.class !== "request") return expect.fail("actual Directory genesis required");
  const selected = forged.judged.selected;
  // Borrow a real Register fact at a different position from the operation's
  // opening. Keep the source send and message equal so the claim guard decides.
  const message = structuredClone(directory.input.message);
  const fields = message.body as { fields: { claim: FactRef } };
  fields.fields.claim = factRefOf(forged.judged.unselected, forged.register);
  const ordinal = directory.input.n;
  const send = selected.sends.find(send => send.n === ordinal)!;
  selected.sends = selected.sends.map(row => row === send ? { ...row, message } : row);
  directory.input.message = message;
  directory.input.source = factRefOf(selected, forged.register);
  expect(await workspaceRepository(forged.given, forged.sources, forged.register.scope, "artifacts", "actual-room-space")).toBeNull();
  expect(forged.calls(), "The forged claim reaches the operation-opening guard after four immutable reads").toBe(4);

  const late = fixture();
  const born = late.genesisOf("directory");
  if (born.input.type !== "genesis") return expect.fail("actual Directory genesis required");
  const unselected = late.judged.unselected;
  expect(unselected.input).toMatchObject({ type: "outcome", result: "confirmed", evidence: { basis: "own-answer" } });
  expect(unselected.effects).toContainEqual(expect.objectContaining({ effect: "attempt", selected: false, result: "confirmed" }));
  expect(unselected.sends).toEqual([]);
  // A malicious read port borrows the selected outcome's send. Hash/send checks
  // alone then hold; its actual unselected attempt effect still forbids use.
  unselected.sends = structuredClone(late.judged.selected.sends);
  born.input.source = factRefOf(unselected, late.register);
  expect(await workspaceRepository(late.given, late.sources, late.register.scope, "artifacts", "actual-room-space")).toBeNull();
  expect(late.calls(), "The unselected outcome reaches selection checking after four immutable reads").toBe(4);
});

test("workspace lineage refuses incomplete proof senders and child concerns without a legacy lookup or provider call", async () => {
  const f = fixture();
  expect(await workspaceRepository(f.given, { ...f.sources, births: { async read() { return null; } } }, f.register.scope, "artifacts", "actual-room-space")).toBeNull();
  if (f.born.input.type !== "genesis") return expect.fail("fixture lane genesis required");
  f.born.input.sourceKind = "lane";
  const before = f.calls();
  expect(await workspaceRepository(f.given, f.sources, f.register.scope, "artifacts", "actual-room-space")).toBeNull();
  expect(f.calls()).toBe(before);
});

// The state/operation are stand-ins for the existing root retirement records.
// Actual SQLite owns private custody. ready performs no peer or host call.
test("root retirement staging mint stays dispatchable after the hold ends and needs the exact retirement operation", async () => {
  const f = fixture(), storage = await create();
  await storage.inside(native => {
    const trap = async (): Promise<never> => { throw Error("unexpected provider or peer call"); };
    const provider = new ArtifactsProvider({ binding: { get: trap, create: trap, delete: trap }, host: "artifacts", namespace: "actual-room-space", service: "service.invalid", maxBytes: 1024, credentialHandle: trap });
    const sources: WorkspaceSources = { births: { read: trap }, proofs: { read: trap } };
    const host = new WorkspaceHost(f.given, native.storage.sql, provider, sources, f.register.scope, "actual-room-space");
    f.state.putRecord({ capability: "hold@2", kind: "root", key: [1], state: "retiring", seq: 7,
      values: { hold: 4, instance: "past-instance", retirement: "7:0", operation: "6:0" } });
    const entry: Entry = f.later(7, [{ effect: "record", capability: "hold@2", kind: "token", key: [3], state: "minting",
      values: { purpose: "staging", root: 1, operation: "7:0", attempt: 1, mint: "7:1" } }]);
    const request = { scope: f.lane, operation: "7:1" as const, attempt: 1, owner: "hold@2" as const, kind: "mint", origin: { entry, hash: entryHash(entry) } };
    expect(host.ready(request)).toBe(true);
    f.state.putRecord({ capability: "hold@2", kind: "root", key: [1], state: "retiring", seq: 7,
      values: { hold: 4, instance: "past-instance", retirement: "9:0", operation: "6:0" } });
    expect(host.ready(request)).toBe(false);
    f.state.putRecord({ capability: "hold@2", kind: "root", key: [1], state: "live", seq: 6,
      values: { hold: 4, instance: "past-instance", retirement: "7:0", operation: "6:0" } });
    expect(host.ready(request)).toBe(false);
  });
});

// Native state and provider replies are stand-ins. The adapter must choose
// different provider resources for two lane geneses and for two attempts.
test("workspace fork attempt names include the actual genesis and never reuse another attempt", async () => {
  const storage = await create(), names: string[] = [];
  await storage.inside(async native => {
    for (const nonce of [4, 5]) {
      const f = fixture(nonce), definition = f.given.definition!()!;
      const type = definition.holdTypes[0]!, shape = definition.declared.items[type]!;
      const timer = Object.values(definition.declared.timed).find(rule => rule.on === type && rule.effects.some(effect => "hold" in effect && effect.hold.do === "end"));
      f.state.putItem({ id: 4, type, state: shape.initial, revision: 0, opened: entryHash(f.born), parties: {}, refs: {}, attributed: [],
        values: { epoch: 1, ...(timer ? { [timer.deadline]: "2026-10-30T11:00:00Z" } : {}) } });
      f.state.putRecord({ capability: "hold@2", kind: "fork", key: [4], state: "creating", seq: 4, values: { operation: "4:0", seed: { commit: "1".repeat(40) } } });
      const provider = new ArtifactsProvider({ binding: { get: async () => { throw Error("no binding call"); }, create: async () => null, delete: async () => null }, host: "artifacts", namespace: "actual-room-space", service: "service.invalid", maxBytes: 1024, credentialHandle: async () => "unused" });
      provider.workspaceFork = async (_repository, name) => { names.push(name); return { id: name, name }; };
      const host = new WorkspaceHost(f.given, native.storage.sql, provider, f.sources, f.register.scope, "actual-room-space");
      const entry: Entry = f.later(4, [{ effect: "operation", k: 0, owner: "hold@2", kind: "fork", attempts: 3 }]);
      for (const attempt of [1, 2]) {
        const reply = await host.send({ scope: f.lane, operation: "4:0", attempt, owner: "hold@2", kind: "fork", origin: { entry, hash: entryHash(entry) } });
        expect(reply?.result).toBe("confirmed");
        expect(names.at(-1)).toContain(f.lane.genesis.slice(7, 33));
        expect(utf8(names.at(-1)!).length).toBeLessThanOrEqual(100);
      }
    }
  });
  expect(new Set(names).size).toBe(4);
});

async function observeDiagnosis<T>(scope: ScopeId, work: () => Promise<T>) {
  const diagnoses: Diagnosis[] = [], points: MetricPoint[] = [];
  const request = "0123456789abcdef";
  const log = vi.spyOn(console, "error").mockImplementation(line => { diagnoses.push(JSON.parse(String(line)) as Diagnosis); });
  try {
    const result = await measured(operationContext({ DEPLOYMENT: "head-diagnosis-test", METRICS: { writeDataPoint: point => points.push(point) } }, scope, "dispatch", { request, trace: null }), work);
    return { result, diagnoses, points };
  } finally { log.mockRestore(); }
}

test("workspace lineage diagnoses a failed immutable proof read without changing its unavailable answer", async () => {
  const f = fixture(), secret = "synthetic-private-proof-response";
  const observed = await observeDiagnosis(f.lane.scope, () => workspaceRepository(f.given,
    { ...f.sources, births: { async read() { throw new Error(secret); } } }, f.register.scope, "artifacts", "actual-room-space"));
  expect(observed.result).toBeNull();
  expect(observed.diagnoses).toEqual([{ event: "outside-call-failed", step: "workspace-lineage-read", name: "Error", request: "0123456789abcdef" }]);
  expect(observed.points.filter(point => point.blobs[0] === "diagnosis").map(point => [point.indexes, point.blobs.slice(3, 6)])).toEqual([[[f.lane.scope], ["workspace-lineage-read", "error", "outside-call-failed"]]]);
  expect(JSON.stringify(observed)).not.toContain(secret);
});

test("workspace lineage diagnoses an absorbed local read failure without reading its private error text", async () => {
  const f = fixture(), secret = "synthetic-private-local-state";
  const observed = await observeDiagnosis(f.lane.scope, () => workspaceRepository({ ...f.given, own() { throw new Error(secret); } }, f.sources, f.register.scope, "artifacts", "actual-room-space"));
  expect(observed.result).toBeNull();
  expect(observed.diagnoses).toEqual([{ event: "outside-call-failed", step: "workspace-lineage", name: "Error", request: "0123456789abcdef" }]);
  expect(observed.points.filter(point => point.blobs[0] === "diagnosis").map(point => point.blobs.slice(3, 6))).toEqual([["workspace-lineage", "error", "outside-call-failed"]]);
  expect(JSON.stringify(observed)).not.toContain(secret);
});

// The lineage/state/provider are explicit stand-ins. The real host and SQLite
// constructor diagnose the absorbed provider throw and a lineage refusal.
test("workspace head keeps an unknown answer and fixed diagnoses when its provider fails or lineage is unavailable", async () => {
  const f = fixture(), storage = await create(), definition = f.given.definition!()!;
  const type = definition.holdTypes[0]!, shape = definition.declared.items[type]!;
  const timer = Object.values(definition.declared.timed).find(rule => rule.on === type && rule.effects.some(effect => "hold" in effect && effect.hold.do === "end"));
  f.state.putItem({ id: 4, type, state: shape.initial, revision: 0, opened: entryHash(f.born), parties: {}, refs: {}, attributed: [],
    values: { epoch: 1, ...(timer ? { [timer.deadline]: "2026-10-30T11:00:00Z" } : {}) } });
  f.state.putRecord({ capability: "hold@2", kind: "fork", key: [4], state: "creating", seq: 4, values: { operation: "4:0" } });
  const entry: Entry = f.later(4, [{ effect: "operation", k: 0, owner: "hold@2", kind: "head", attempts: 3 }]);
  const request = { scope: f.lane, operation: "4:0" as const, attempt: 1, owner: "hold@2" as const, kind: "head", origin: { entry, hash: entryHash(entry) } };
  const secret = "synthetic-private-provider-answer";
  await storage.inside(async native => {
    const provider = new ArtifactsProvider({ binding: { get: async () => { throw new Error("no binding call"); }, create: async () => null, delete: async () => null }, host: "artifacts", namespace: "actual-room-space", service: "service.invalid", maxBytes: 1024, credentialHandle: async () => "unused" });
    let providerCalls = 0;
    provider.ref = async () => { providerCalls++; throw new Error(secret); };
    const host = new WorkspaceHost(f.given, native.storage.sql, provider, f.sources, f.register.scope, "actual-room-space");
    const failed = await observeDiagnosis(f.lane.scope, () => host.send(request));
    expect(failed.result).toBeNull();
    expect(failed.diagnoses, "The absorbed head failure must remain diagnosable").toEqual([{ event: "outside-call-failed", step: "workspace-head-send", name: "Error", request: "0123456789abcdef" }]);
    expect(failed.points.filter(point => point.blobs[0] === "diagnosis").map(point => point.blobs.slice(3, 6))).toEqual([["workspace-head-send", "error", "outside-call-failed"]]);
    expect(JSON.stringify(failed)).not.toContain(secret);
    expect(providerCalls).toBe(1);
    const unavailable = new WorkspaceHost(f.given, native.storage.sql, provider, { ...f.sources, births: { async read() { return null; } } }, f.register.scope, "actual-room-space");
    const refused = await observeDiagnosis(f.lane.scope, () => unavailable.send(request));
    expect(refused.result).toBeNull();
    expect(refused.diagnoses).toEqual([{ event: "workspace-lineage-unavailable", step: "workspace-lineage", name: "null", request: "0123456789abcdef" }]);
    expect(refused.points.filter(point => point.blobs[0] === "diagnosis").map(point => point.blobs.slice(3, 6))).toEqual([["workspace-lineage", "error", "workspace-lineage-unavailable"]]);
    expect(providerCalls).toBe(1);
  });
});

// Ancestor entries pass their actual Native judges; lane state/operation and
// provider answers remain explicit stand-ins. Actual SQL, factory and proofs run.
test("workspace factory retains an old proven root after a switch and invalidates cached authority when it is unlisted", async () => {
  const f = fixture(), storage = await create();
  const current = scopeIdOf({ v: 1, kind: "register", definition: "platform:register@17", creator: null,
    cause: digestBytes(utf8("TEST workspace current selector")), ordinal: 0 });
  expect(await workspaceRepository(f.given, f.sources, [current, f.register.scope], "artifacts", "actual-room-space"))
    .toEqual({ destination: f.destination, repository: f.repository, branch: "main" });
  expect(f.calls()).toBe(6); // read the old register's own birth, never probe the new selector
  await storage.inside(async native => {
    const definition = f.given.definition!()!, type = definition.holdTypes[0]!, shape = definition.declared.items[type]!;
    const timer = Object.values(definition.declared.timed).find(rule => rule.on === type && rule.effects.some(effect => "hold" in effect && effect.hold.do === "end"));
    f.state.putItem({ id: 4, type, state: shape.initial, revision: 0, opened: entryHash(f.born), parties: {}, refs: {}, attributed: [],
      values: { epoch: 1, ...(timer ? { [timer.deadline]: "2026-10-30T11:00:00Z" } : {}) } });
    f.state.putRecord({ capability: "hold@2", kind: "fork", key: [4], state: "creating", seq: 4,
      values: { operation: "4:0", seed: { commit: "1".repeat(40) } } });
    const entry: Entry = f.later(4, [{ effect: "operation", k: 0, owner: "hold@2", kind: "fork", attempts: 3 }]);
    const request = { scope: f.lane, operation: "4:0" as const, attempt: 1, owner: "hold@2" as const, kind: "fork", origin: { entry, hash: entryHash(entry) } };
    const settings: ArtifactsBindings = { REGISTER_SCOPE: current, INSTALLED_REGISTER_SCOPES: canonicalize([f.register.scope, current]),
      ARTIFACTS_NAMESPACE: "actual-room-space", ARTIFACTS_CONFIG: canonicalize({ registerScope: current, namespace: "actual-room-space", host: "service.invalid", maxBytes: 1024, credentialIdentity: "adapter-attempt" }),
      ARTIFACTS: { get: async () => { throw Error("provider boundary is scripted below"); }, create: async () => null, delete: async () => null } };
    const fork = vi.spyOn(ArtifactsProvider.prototype, "workspaceFork").mockImplementation(async (_repository, name) => ({ name, id: name }));
    try {
      const outside = outsideOf(f.given, native.storage.sql, settings, undefined, undefined, f.sources);
      expect((await outside.send(request))?.result).toBe("confirmed");
      expect(fork).toHaveBeenCalledTimes(1);
      settings.INSTALLED_REGISTER_SCOPES = canonicalize([current]);
      expect(await outside.send({ ...request, attempt: 2 })).toBeNull();
      expect(fork).toHaveBeenCalledTimes(1);
      settings.INSTALLED_REGISTER_SCOPES = canonicalize([f.register.scope, current]);
      expect((await outside.send({ ...request, attempt: 2 }))?.result).toBe("confirmed");
      expect(fork).toHaveBeenCalledTimes(2);
      settings.INSTALLED_REGISTER_SCOPES = canonicalize([current, current]);
      expect(outside.accepts("hold@2", "fork")).toBe(false);
    } finally { fork.mockRestore(); }
  });
});
