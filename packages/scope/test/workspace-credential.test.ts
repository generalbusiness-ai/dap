import { expect, test } from "vitest";
import { PROPOSED_BOUNDS, type Entry, type FieldValue, type GenesisEntry, type ScopeRef, type Seed, type SequenceEntry, type SignedIntent } from "@generalbusiness/dap-contract";
import { admitSequenceGenesis, canonicalize, digestBytes, entryHash, factRefOf, intentDigest, newGenesisNonce, platformName, scopeIdOf, signIntent, timeMs, timeOf, utf8 } from "@generalbusiness/dap-bytes";
import { MemoryState, type Item, type RecordState } from "@generalbusiness/dap-derive";
import { grantOf, keys, variant } from "@generalbusiness/dap-derive/testing";
import { WorkspaceHost } from "../src/workspace-host.ts";
import { ArtifactsProvider } from "../src/artifacts-host.ts";
import type { OutsideGiven } from "../src/given.ts";
import type { NativeBirth } from "../src/native-birth.ts";
import type { WorkspaceSources } from "../src/workspace-lineage.ts";
import type { EffectRequest } from "../src/operations.ts";
import type { Sql } from "../src/sqlite.ts";
import { START, at, create } from "./fixtures-native.ts";
import { staged } from "./hosted.ts";
import { workspaceAncestors } from "./support/workspace-ancestors.ts";

// Ancestor journals use actual Register, Directory and Destination rules in
// memory. Proof ports, lane creation, preparations, grants and folded state are
// STAND-INS, not live Membership or Directory authority. The actual
// WorkspaceHost, TokenDriver, ArtifactsProvider and Durable Object SQL run.
// The binding answers are a stand-in provider, with no Git/provider claim.
function fixture(laneNonce = 4) {
  const definition = variant(staged.declared, draft => {
    draft.capabilities.find((cap: { name: string }) => cap.name === "hold").version = 2;
    // This made-up hold lasts an hour so the actual 900-second host cap
    // can decide. The existing hold type, held state and until deadline stay.
    for (const kind of ["take-hold", "renew"]) for (const effect of draft.acts[kind].effects) {
      if ("value" in effect && effect.value.slot === "until") effect.value.from = { time: { plusSeconds: 3600 } };
    }
  });
  const time = START, hash = digestBytes(utf8("workspace custody fixture"));
  let now = time;
  const seed = (kind: Seed["kind"], named: Seed["definition"], creator: ScopeRef | null, cause = hash, ordinal = 0): Seed => ({ v: 1, kind, definition: named, creator, cause, ordinal });
  // A later entry written by hand: it names its sequence's genesis, and nothing judged it.
  const sealed = (at: ScopeRef, seq: number, input: SequenceEntry["input"], effects: SequenceEntry["effects"] = [], sends: SequenceEntry["sends"] = []): SequenceEntry => ({ v: 1, genesis: at.genesis, seq, prev: hash, time, clamped: false, epoch: 0, input, uses: [], prepared: [], effects, sends });
  const signed = (at: ScopeRef, kind: string, fields: SignedIntent["intent"]["fields"]): SignedIntent => signIntent({ v: 1, to: at, actor: keys.rita.key, kind, on: null, fields, expected: {}, idempotencyKey: kind, notAfter: timeOf(timeMs(START)! + 600_000) }, keys.rita.secret);
  const judged = workspaceAncestors(time, "actual-room-space", "workspace custody fixture");
  const { register, directory, repository } = judged;
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
  const rows: { at: ScopeRef; entry: Entry }[] = [...judged.rows, { at: directory, entry: creation }];
  const bodies = new Map(rows.map(row => [entryHash(row.entry), { fact: factRefOf(row.entry, row.at), bytes: canonicalize(row.entry) }]));
  let calls = 0;
  const sources: WorkspaceSources = {
    births: { async read(name, kind) {
      calls++;
      const entry = rows.find(row => row.at.scope === name && row.entry.input.type === "genesis" && row.entry.input.seed.kind === kind)?.entry;
      if (!entry || entry.input.type !== "genesis") return null;
      const named = entry.input.seed.definition as `platform:${string}@${number}`;
      return { v: 1, proof: bodies.get(entryHash(entry))!, named, declarationName: platformName(named as never), native: true } as NativeBirth;
    } },
    proofs: { async read(fact) { calls++; return bodies.get(fact.hash) ?? null; } },
  };
  const own = new Map<number, Entry>([[0, born]]);
  const state = new MemoryState();
  state.setScope({ held: [], at: lane, kind: "lane", status: "active", creator: directory, head: { seq: 0, hash: entryHash(born) }, time, genesis: { hash: entryHash(born), source: born.input.type === "genesis" ? born.input.source : null, n: 0 } });
  const given: OutsideGiven = { localSequence: () => local, definition: () => definition, state, scope: () => state.scope(), own: seq => { const entry = own.get(seq); return entry ? { entry, hash: entryHash(entry) } : null; },
    genesis: () => born.input.type === "genesis" ? born.input : null, retained: () => null, clock: { read: () => now }, random: { bytes: n => new Uint8Array(n) } };
  return { state, given, sources, repository, register, born, lane, own, sealed, now: () => now, clock: (value: string) => { now = value; } };
}


type Fixture = ReturnType<typeof fixture>;
const HOLD = 4, TOKEN = 9, INSTANCE = "actual-lane-instance";
const selected = { id: "selected-fork", name: "selected-fork" };
function held(f: Fixture, ends = at(3600)): Item {
  const item: Item = { id: HOLD, type: "hold", state: "held", revision: 1, opened: entryHash(f.born),
    parties: { holder: keys.una.member }, refs: { under: 2 }, attributed: [], values: { epoch: 1, until: ends } };
  f.state.putItem(item);
  f.state.putRecord({ capability: "hold@2", kind: "instance", key: [HOLD, INSTANCE], state: "current", seq: 6, values: { hold: HOLD, task: f.lane, epoch: 1 } });
  f.state.putRecord({ capability: "hold@2", kind: "fork", key: [HOLD], state: "selected", seq: 7,
    values: { ...selected, seed: { commit: "1".repeat(40) }, operation: "5:0" } });
  return item;
}

function adapter(f: Fixture, sql: Pick<Sql, "exec">) {
  const calls: Array<{ name: string; scope: string; seconds: number }> = [];
  const provider = new ArtifactsProvider({
    binding: {
      async get(name) { return {
        async info() { return { name, remote: `https://service.invalid/git/actual-room-space/${name}.git` }; },
        async createToken(scope, seconds) {
          calls.push({ name, scope, seconds });
          return { id: `provider-token-${calls.length}`, scope, plaintext: "STAND-IN-private-bearer", expiresAt: timeOf(timeMs(f.now())! + seconds * 1000) };
        },
        async revokeToken() { return true; },
      }; },
      async create() { return expect.fail("mint must not create a repository"); },
      async delete() { return expect.fail("mint must not delete a repository"); },
    }, host: "artifacts", namespace: "actual-room-space", service: "service.invalid", maxBytes: 1024,
    credentialHandle: async () => expect.fail("workspace custody must not use legacy custody"),
  });
  const host = new WorkspaceHost(f.given, sql, provider, f.sources, f.register.scope, "actual-room-space");
  return { host, calls, restart: () => new WorkspaceHost(f.given, sql, provider, f.sources, f.register.scope, "actual-room-space") };
}

async function mint(f: Fixture, host: WorkspaceHost, purpose: "workspace" | "fork-read" | "staging" = "workspace") {
  const operation = "10:0" as const;
  const values: Record<string, FieldValue | null> = { purpose, mint: operation, id: null, ends: null, revocation: null,
    ...(purpose === "workspace" ? { hold: HOLD, instance: INSTANCE } : { root: 1, operation: "6:0", attempt: 1 }) };
  const record: RecordState = { capability: "hold@2", kind: "token", key: [TOKEN], state: "minting", seq: 10, values };
  f.state.putRecord(record);
  if (purpose !== "workspace") f.state.putRecord({ capability: "hold@2", kind: "root", key: [1], state: "creating", seq: 6,
    values: { hold: HOLD, instance: INSTANCE, operation: "6:0" } });
  const signed = signIntent({ v: 1, to: f.lane, actor: keys.una.key, kind: "hold@2:token", on: null,
    fields: { hold: HOLD, instance: INSTANCE }, expected: {}, idempotencyKey: "workspace-mint", notAfter: at(3600) }, keys.una.secret);
  const input: Entry["input"] = { type: "preparation", signed, authority: [grantOf(keys.una, f.lane, ["change.work"])], capability: "hold@2", step: "token" };
  const opening = f.sealed(f.lane, 10, input, [
    { effect: "operation", owner: "hold@2", kind: "mint", k: 0, attempts: 1 },
    { effect: "record", capability: "hold@2", kind: "token", key: [TOKEN], state: "minting", values },
  ]);
  f.own.set(6, f.sealed(f.lane, 6, input)); f.own.set(10, opening);
  const request: EffectRequest = { scope: f.lane, operation, attempt: 1, owner: "hold@2", kind: "mint", origin: { entry: opening, hash: entryHash(opening) } };
  const reply = await host.send(request);
  expect(reply?.result, "healthy mint must reach the real TokenDriver").toBe("confirmed");
  if (!reply || reply.result !== "confirmed" || reply.evidence.basis !== "own-answer") return expect.fail("confirmed provider mint reply required");
  const body = reply.evidence.body as { token: string; ends: string };
  const live = { ...record, state: "live", seq: 11, values: { ...values, id: body.token, ends: body.ends } };
  f.state.putRecord(live);
  const outcome = f.sealed(f.lane, 11, { type: "outcome", owner: "hold@2", kind: "mint", operation, attempt: 1, result: "confirmed", evidence: reply.evidence }, [
    { effect: "record", capability: "hold@2", kind: "token", key: [TOKEN], state: "live", values: live.values },
  ]);
  // The outcome and fold are explicit stand-ins. These real callbacks must
  // take the plaintext into SQL; no test inserts a private custody row.
  host.judged(request, { entry: outcome, hash: entryHash(outcome) });
  return body;
}

function custody(sql: Pick<Sql, "exec">, f: Fixture) {
  return sql.exec("SELECT id,ends,repository,plaintext,actor,mint FROM private_workspace_token WHERE scope=? AND token=?", canonicalize(f.lane), TOKEN).toArray();
}

test("workspace credential refuses a wrong preparing key, preserves SQL custody and hands off exactly once", async () => {
  const storage = await create();
  await storage.inside(async native => {
    const f = fixture(); held(f);
    const { host, restart } = adapter(f, native.storage.sql), reply = await mint(f, host);
    expect(custody(native.storage.sql, f)).toEqual([{ id: reply.token, ends: reply.ends, repository: canonicalize({ ...f.repository, ...selected }), plaintext: "STAND-IN-private-bearer", actor: keys.una.key, mint: "10:0" }]);
    const current = restart();
    expect(current.credential(reply.token, keys.vic.key), "a wrong preparing key must not receive or consume the bearer").toBeNull();
    expect(custody(native.storage.sql, f)[0]?.["plaintext"]).toBe("STAND-IN-private-bearer");
    expect(current.credential(reply.token, keys.una.key)).toEqual({ token: "STAND-IN-private-bearer", ends: reply.ends, remote: "https://service.invalid/git/actual-room-space/selected-fork.git" });
    expect(custody(native.storage.sql, f)[0]?.["plaintext"]).toBeNull();
    expect(restart().credential(reply.token, keys.una.key), "one-time SQL handoff survives a fresh host instance").toBeNull();
  });
});

test("workspace credential refuses a wrong holder, ended hold, past instance and unselected or mismatched fork without consuming SQL custody", async () => {
  const storage = await create();
  await storage.inside(async native => {
    const cases = ["wrong-holder", "ended-hold", "past-instance", "not-selected", "wrong-id", "wrong-name"] as const;
    for (const [index, cause] of cases.entries()) {
      const f = fixture(index + 10), hold = held(f), { host } = adapter(f, native.storage.sql), reply = await mint(f, host);
      const originalFork = f.state.record("hold@2", "fork", [HOLD])!, originalInstance = f.state.record("hold@2", "instance", [HOLD, INSTANCE])!;
      if (cause === "wrong-holder") f.state.putItem({ ...hold, parties: { holder: keys.vic.member } });
      if (cause === "ended-hold") f.state.putItem({ ...hold, state: "ended" });
      if (cause === "past-instance") f.state.putRecord({ ...originalInstance, state: "past" });
      if (cause === "not-selected") f.state.putRecord({ ...originalFork, state: "creating" });
      if (cause === "wrong-id") f.state.putRecord({ ...originalFork, values: { ...originalFork.values, id: "another-fork" } });
      if (cause === "wrong-name") f.state.putRecord({ ...originalFork, values: { ...originalFork.values, name: "another-fork" } });
      expect(host.credential(reply.token, keys.una.key), cause).toBeNull();
      expect(custody(native.storage.sql, f)[0]?.["plaintext"], cause).toBe("STAND-IN-private-bearer");
      f.state.putItem(hold); f.state.putRecord(originalFork); f.state.putRecord(originalInstance);
      expect(host.credential(reply.token, keys.una.key)?.token, `${cause}: paired valid state still owns the unconsumed bearer`).toBe("STAND-IN-private-bearer");
    }
  });
});

test("workspace mint caps workspace at 900 seconds, internal reads and staging at 120, and every purpose at the remaining hold", async () => {
  const storage = await create();
  await storage.inside(async native => {
    const cases = [
      { remaining: 3600, purpose: "workspace", seconds: 900, repository: selected.name, scope: "write" },
      { remaining: 3600, purpose: "fork-read", seconds: 120, repository: selected.name, scope: "read" },
      { remaining: 3600, purpose: "staging", seconds: 120, repository: null, scope: "write" },
      { remaining: 37.9, purpose: "workspace", seconds: 37, repository: selected.name, scope: "write" },
      { remaining: 37.9, purpose: "fork-read", seconds: 37, repository: selected.name, scope: "read" },
      { remaining: 37.9, purpose: "staging", seconds: 37, repository: null, scope: "write" },
    ] as const;
    for (const [index, row] of cases.entries()) {
      const f = fixture(index + 30); held(f, timeOf(timeMs(START)! + row.remaining * 1000));
      const { host, calls } = adapter(f, native.storage.sql), reply = await mint(f, host, row.purpose);
      expect(calls).toEqual([{ name: row.repository ?? f.repository.name, scope: row.scope, seconds: row.seconds }]);
      expect(timeMs(reply.ends)! - timeMs(START)!).toBe(row.seconds * 1000);
      expect(custody(native.storage.sql, f)).toHaveLength(1);
      if (row.purpose !== "workspace") expect(host.credential(reply.token, keys.una.key), "internal credentials never use the public workspace handoff").toBeNull();
      f.clock(reply.ends);
      expect(host.credential(reply.token, keys.una.key), "the provider expiry itself is not a live handoff window").toBeNull();
      expect(custody(native.storage.sql, f)[0]?.["plaintext"], "expiry refusal does not claim provider revocation or erase custody").toBe("STAND-IN-private-bearer");
    }
  });
});
