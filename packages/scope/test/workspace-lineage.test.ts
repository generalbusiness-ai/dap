import { expect, test } from "vitest";
import type { Entry, FactRef, ScopeId, ScopeRef, Seed, SignedIntent } from "@generalbusiness/dap-contract";
import { canonicalize, digestBytes, entryHash, factRefOf, intentDigest, newIncarnation, platformName, scopeIdOf, seedDigest, signIntent, utf8 } from "@generalbusiness/dap-bytes";
import { MemoryState } from "@generalbusiness/dap-derive";
import { keys, variant } from "@generalbusiness/dap-derive/testing";
import type { OutsideGiven } from "../src/given.ts";
import { WorkspaceHost } from "../src/workspace-host.ts";
import { ArtifactsProvider } from "../src/artifacts-host.ts";
import { create } from "./fixtures-native.ts";
import type { NativeBirth } from "../src/native-birth.ts";
import { workspaceRepository, type WorkspaceSources } from "../src/workspace-lineage.ts";
import { staged } from "./hosted.ts";

// Sealed-entry and trusted native-reader STAND-INS. These entries did not pass
// a native creation judge. This witnesses adapter lineage parsing and bounds,
// not independent proof authentication, publication, or a real Git host.
function fixture(laneIncarnation = 4) {
  const definition = variant(staged.declared, draft => { draft.capabilities.find((cap: { name: string }) => cap.name === "hold").version = 2; });
  const time = "2026-10-30T10:00:00Z", hash = digestBytes(utf8("fixture"));
  const seed = (kind: Seed["kind"], named: Seed["definition"], creator: ScopeRef | null, cause = hash, ordinal = 0): Seed => ({ v: 1, kind, definition: named, creator, cause, ordinal });
  const ref = (seed: Seed, n: number): ScopeRef => ({ scope: scopeIdOf(seed), kind: seed.kind, inc: newIncarnation(new Uint8Array(16).fill(n)) });
  const sealed = (at: ScopeRef, seq: number, input: Entry["input"], effects: Entry["effects"] = [], sends: Entry["sends"] = []): Entry => ({ v: 1, at, seq, prev: seq === 0 ? null : hash, time, clamped: false, epoch: 0, input, uses: [], prepared: [], effects, sends });
  const genesis = (s: Seed, at: ScopeRef, source: FactRef | null = null, n: number | null = null, message: Extract<Entry["input"], { type: "genesis" }>["message"] = null, sends: Entry["sends"] = []): Entry => sealed(at, 0, { type: "genesis", seed: s, inc: at.inc, kind: "establish", founding: null, source, n, message, decision: "applied" }, [], sends);
  const signed = (at: ScopeRef, kind: string, fields: SignedIntent["intent"]["fields"]): SignedIntent => signIntent({ v: 1, to: at, actor: keys.rita.key, kind, on: null, fields, expected: {}, idempotencyKey: kind, notAfter: "2026-10-30T10:10:00Z" }, keys.rita.secret);
  const registerSeed = seed("register", "platform:register@17", null), register = ref(registerSeed, 1);
  const found = signed(register, "found", { founderHandle: "@rita", branch: "main" });
  const directorySeed = seed("directory", "platform:directory@16", register, intentDigest(found.intent)), directory = ref(directorySeed, 2);
  const repository = { host: "artifacts", namespace: "actual-room-space", name: "room-1", id: "room-1" };
  const dirMessage = { class: "request", type: "create", body: { fields: { repository, claim: { self: true } } } } as const;
  const claim = sealed(register, 1, { type: "act", signed: found, authority: [], presented: {} }, [{ effect: "value", item: 1, slot: "seed", value: seedDigest(directorySeed) }], [{ n: 0, to: directorySeed, message: dirMessage }]);
  const claimFact = factRefOf(claim);
  const destinationSeed = seed("destination", "platform:destination@12", directory, hash, 2), destination = ref(destinationSeed, 3);
  const destMessage = { class: "request", type: "create", body: { fields: { repository, branch: "main", claim: claimFact, directory } } } as const;
  const dir = genesis(directorySeed, directory, claimFact, 0, dirMessage, [{ n: 2, to: destinationSeed, message: destMessage }]);
  const dest = genesis(destinationSeed, destination, factRefOf(dir), 2, destMessage);
  const open = signed(directory, "open-issue", { definition: definition.digest });
  const laneSeed = seed("lane", definition.digest, directory, intentDigest(open.intent)), lane = ref(laneSeed, laneIncarnation);
  const laneMessage = { class: "request", type: "create", body: { fields: {}, directory } } as const;
  const creation = sealed(directory, 5, { type: "act", signed: open, authority: [], presented: {} }, [], [{ n: 0, to: laneSeed, message: laneMessage }]);
  const born = genesis(laneSeed, lane, factRefOf(creation), 0, laneMessage);
  const entries = [genesis(registerSeed, register), claim, dir, dest, creation];
  const bodies = new Map(entries.map(entry => [entryHash(entry), { fact: factRefOf(entry), bytes: canonicalize(entry) }]));
  let calls = 0;
  const sources: WorkspaceSources = {
    births: { async read(name, kind) {
      calls++;
      const entry = entries.find(entry => entry.at.scope === name && entry.at.kind === kind && entry.seq === 0);
      if (!entry || entry.input.type !== "genesis") return null;
      const named = entry.input.seed.definition as `platform:${string}@${number}`;
      return { v: 1, proof: bodies.get(entryHash(entry))!, named, declarationName: platformName(named as never), native: true } as NativeBirth;
    } },
    proofs: { async read(fact) { calls++; return bodies.get(fact.hash) ?? null; } },
  };
  const state = new MemoryState();
  state.setScope({ held: [], at: lane, status: "active", creator: directory, head: { seq: 0, hash: entryHash(born) }, time, genesis: { hash: entryHash(born), source: born.input.type === "genesis" ? born.input.source : null, n: 0 } });
  const given: OutsideGiven = { definition: () => definition, state, scope: () => state.scope(), own: seq => seq === 0 ? { entry: born, hash: entryHash(born) } : null,
    genesis: () => born.input.type === "genesis" ? born.input : null, retained: () => null, clock: { read: () => time }, random: { bytes: n => new Uint8Array(n) } };
  return { state, given, sources, entries, destination, repository, register, calls: () => calls, born };
}

test("workspace lineage binds five immutable reads to the actual room namespace and refuses a wrong register or borrowed destination", async () => {
  const f = fixture();
  expect(await workspaceRepository(f.given, f.sources, f.register.scope, "artifacts", "actual-room-space")).toEqual({ destination: f.destination, repository: f.repository, branch: "main" });
  expect(f.calls()).toBe(5);
  expect(await workspaceRepository(f.given, f.sources, f.register.scope, "artifacts", "label-from-an-operator")).toBeNull();
  const other = `sc_${"z".repeat(52)}` as ScopeId;
  expect(await workspaceRepository(f.given, f.sources, other, "artifacts", "actual-room-space")).toBeNull();
  const destination = f.entries.find(entry => entry.at.kind === "destination")!;
  if (destination.input.type !== "genesis") return expect.fail("fixture destination genesis required");
  destination.input.source = { ...destination.input.source!, seq: 9 };
  expect(await workspaceRepository(f.given, f.sources, f.register.scope, "artifacts", "actual-room-space")).toBeNull();
});

test("workspace lineage refuses incomplete proof senders and child concerns without a legacy lookup or provider call", async () => {
  const f = fixture();
  expect(await workspaceRepository(f.given, { ...f.sources, births: { async read() { return null; } } }, f.register.scope, "artifacts", "actual-room-space")).toBeNull();
  if (f.born.input.type !== "genesis") return expect.fail("fixture lane genesis required");
  f.born.input.seed.creator = { ...f.born.input.seed.creator!, kind: "lane" };
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
    const entry: Entry = { ...f.born, seq: 7, effects: [{ effect: "record", capability: "hold@2", kind: "token", key: [3], state: "minting",
      values: { purpose: "staging", root: 1, operation: "7:0", attempt: 1, mint: "7:1" } }] };
    const request = { scope: entry.at, operation: "7:1" as const, attempt: 1, owner: "hold@2" as const, kind: "mint", origin: { entry, hash: entryHash(entry) } };
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
// different provider resources for two incarnations and for two attempts.
test("workspace fork attempt names include the actual incarnation and never reuse another attempt", async () => {
  const storage = await create(), names: string[] = [];
  await storage.inside(async native => {
    for (const incarnation of [4, 5]) {
      const f = fixture(incarnation), definition = f.given.definition!()!;
      const type = definition.holdTypes[0]!, shape = definition.declared.items[type]!;
      const timer = Object.values(definition.declared.timed).find(rule => rule.on === type && rule.effects.some(effect => "hold" in effect && effect.hold.do === "end"));
      f.state.putItem({ id: 4, type, state: shape.initial, revision: 0, opened: entryHash(f.born), parties: {}, refs: {}, attributed: [],
        values: { epoch: 1, ...(timer ? { [timer.deadline]: "2026-10-30T11:00:00Z" } : {}) } });
      f.state.putRecord({ capability: "hold@2", kind: "fork", key: [4], state: "creating", seq: 4, values: { operation: "4:0", seed: { commit: "1".repeat(40) } } });
      const provider = new ArtifactsProvider({ binding: { get: async () => { throw Error("no binding call"); }, create: async () => null, delete: async () => null }, host: "artifacts", namespace: "actual-room-space", service: "service.invalid", maxBytes: 1024, credentialHandle: async () => "unused" });
      provider.workspaceFork = async (_repository, name) => { names.push(name); return { id: name, name }; };
      const host = new WorkspaceHost(f.given, native.storage.sql, provider, f.sources, f.register.scope, "actual-room-space");
      const entry: Entry = { ...f.born, seq: 4, effects: [{ effect: "operation", k: 0, owner: "hold@2", kind: "fork", attempts: 3 }] };
      for (const attempt of [1, 2]) {
        const reply = await host.send({ scope: entry.at, operation: "4:0", attempt, owner: "hold@2", kind: "fork", origin: { entry, hash: entryHash(entry) } });
        expect(reply?.result).toBe("confirmed");
        expect(names.at(-1)).toContain(entry.at.inc.slice(3));
        expect(utf8(names.at(-1)!).length).toBeLessThanOrEqual(100);
      }
    }
  });
  expect(new Set(names).size).toBe(4);
});
