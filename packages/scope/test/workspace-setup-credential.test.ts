import { runInDurableObject } from "cloudflare:test";
import { expect, test } from "vitest";
import type { Answer, Entry, FactRef, Grant, OperationId, Read, ScopeRef, Seed, SignedIntent } from "@generalbusiness/dap-contract";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { canonicalize, digestBytes, entryHash, factRefOf, intentDigest, newIncarnation, platformName, scopeIdOf, seedDigest, signIntent, timeMs, timeOf, utf8 } from "@generalbusiness/dap-bytes";
import type { RecordState } from "@generalbusiness/dap-derive";
import { grantOf, keys, variant } from "@generalbusiness/dap-derive/testing";
import { artifactsWorkspaceOutside } from "../src/artifacts-wiring.ts";
import type { ArtifactsNamespace } from "../src/artifacts-host.ts";
import type { OutsideGiven } from "../src/given.ts";
import { CAPABILITY_CODE, type EffectRequest, type OperationStatus } from "../src/index.ts";
import type { NativeBirth } from "../src/native-birth.ts";
import { production } from "../src/ports.ts";
import { controls, testPorts } from "../src/testing.ts";
import type { WorkspaceSources } from "../src/workspace-lineage.ts";
import { drainScheduledFixture, nativeFixtureLifetime, reader, START } from "./fixtures-native.ts";
import { staged } from "./hosted.ts";
import { net } from "./net.ts";
import type { Platform } from "./repository.ts";
import { beginSessionFixture } from "./session-settings.ts";

// The lane's genesis, acts, hold@2 outcomes, operation ledger and SQL are native.
// The ancestors, authority, clock, provider binding and Git packets are explicit
// STAND-INS. No real Membership, Directory, provider or physical drain is proved.
const OWNER = "hold@2", SERVICE = "service.invalid", NAMESPACE = "setup-custody";
const COMMIT = "1".repeat(40), LIMIT = 96;
type Mode = "created" | "refused" | "late";
type Surface = Platform["stub"] & {
  effect(): Promise<number>;
  prepare(signed: SignedIntent, grants: readonly Grant[], owner: string, step: string): Promise<Answer>;
  operation(reader: unknown, id: OperationId): Promise<Read<OperationStatus>>;
};
const pending = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
};
const packet = (text: string) => `${(utf8(text).length + 4).toString(16).padStart(4, "0")}${text}`;
const advertisement = () => new Response(`${packet("# service=git-upload-pack\n")}0000${packet(`${COMMIT} refs/heads/main\0ofs-delta allow-reachable-sha1-in-want\n`)}0000`, { headers: { "content-type": "application/x-git-upload-pack-advertisement" } });

/** Only immutable ancestor inputs are scripted; this does not install any
 * lane state, setup token, outcome, operation or private custody row. */
function ancestors(definition: ReturnType<typeof variant>) {
  const hash = digestBytes(utf8(crypto.randomUUID()));
  const seed = (kind: Seed["kind"], named: Seed["definition"], creator: ScopeRef | null, cause = hash, ordinal = 0): Seed => ({ v: 1, kind, definition: named, creator, cause, ordinal });
  const ref = (value: Seed, n: number): ScopeRef => ({ scope: scopeIdOf(value), kind: value.kind, inc: newIncarnation(new Uint8Array(16).fill(n)) });
  const entry = (at: ScopeRef, seq: number, input: Entry["input"], effects: Entry["effects"] = [], sends: Entry["sends"] = []): Entry => ({ v: 1, at, seq, prev: seq === 0 ? null : hash, time: net.clock.now, clamped: false, epoch: 0, input, uses: [], prepared: [], effects, sends });
  const genesis = (value: Seed, at: ScopeRef, source: FactRef | null = null, n: number | null = null, message: Extract<Entry["input"], { type: "genesis" }>["message"] = null, sends: Entry["sends"] = []): Entry => entry(at, 0, { type: "genesis", seed: value, inc: at.inc, kind: "establish", founding: null, source, n, message, decision: "applied" }, [], sends);
  const signed = (at: ScopeRef, kind: string, fields: SignedIntent["intent"]["fields"]): SignedIntent => signIntent({ v: 1, to: at, actor: keys.rita.key, kind, on: null, fields, expected: {}, idempotencyKey: crypto.randomUUID(), notAfter: timeOf(timeMs(net.clock.now)! + 60_000) }, keys.rita.secret);
  const registerSeed = seed("register", "platform:register@17", null), register = ref(registerSeed, 1);
  const found = signed(register, "found", { founderHandle: "@rita", branch: "main" });
  const directorySeed = seed("directory", "platform:directory@16", register, intentDigest(found.intent)), directory = ref(directorySeed, 2);
  const repository = { host: "artifacts", namespace: NAMESPACE, name: "base", id: "base" };
  const message = { class: "request", type: "create", body: { fields: { repository, claim: { self: true } } } } as const;
  const claim = entry(register, 1, { type: "act", signed: found, authority: [], presented: {} }, [{ effect: "value", item: 1, slot: "seed", value: seedDigest(directorySeed) }], [{ n: 0, to: directorySeed, message }]);
  const claimFact = factRefOf(claim);
  const destinationSeed = seed("destination", "platform:destination@12", directory, hash, 2), destination = ref(destinationSeed, 3);
  const destinationMessage = { class: "request", type: "create", body: { fields: { repository, branch: "main", claim: claimFact, directory } } } as const;
  const bornDirectory = genesis(directorySeed, directory, claimFact, 0, message, [{ n: 2, to: destinationSeed, message: destinationMessage }]);
  const bornDestination = genesis(destinationSeed, destination, factRefOf(bornDirectory), 2, destinationMessage);
  const open = signed(directory, "open-issue", { definition: definition.digest });
  const laneSeed = seed("lane", definition.digest, directory, intentDigest(open.intent));
  const laneMessage = { class: "request", type: "create", body: { fields: { title: "Setup custody", opener: keys.rita.member } } } as const;
  const opening = entry(directory, 5, { type: "act", signed: open, authority: [], presented: {} }, [], [{ n: 0, to: laneSeed, message: laneMessage }]);
  const entries = [genesis(registerSeed, register), claim, bornDirectory, bornDestination, opening];
  const bodies = new Map(entries.map(value => [entryHash(value), { fact: factRefOf(value), bytes: canonicalize(value) }]));
  let reads = 0;
  const count = () => { if (++reads > 256) throw new Error("Scripted lineage read bound exceeded"); };
  const sources: WorkspaceSources = {
    births: { async read(name, kind) {
      count(); const value = entries.find(value => value.at.scope === name && value.at.kind === kind && value.seq === 0);
      if (!value || value.input.type !== "genesis") return null;
      const named = value.input.seed.definition as `platform:${string}@${number}`;
      return { v: 1, proof: bodies.get(entryHash(value))!, named, declarationName: platformName(named as never), native: true } as NativeBirth;
    } },
    proofs: { async read(fact) { count(); return bodies.get(fact.hash) ?? null; } },
  };
  return { register, laneSeed, opening, laneMessage, sources };
}

async function fixture(mode: Mode) {
  const owner = beginSessionFixture({ secret: null, sessions: false, inspector: null });
  const life = nativeFixtureLifetime(owner, { required: false, finish: "external" });
  const definition = variant(staged.declared, draft => { draft.capabilities.find((cap: { name: string }) => cap.name === "hold").version = 2; });
  const lineage = ancestors(definition), node = life.platform(scopeIdOf(lineage.laneSeed));
  let surface = node.object as unknown as Surface;
  const c = controls(node.name, START), defaults = production();
  const refused = Object.assign(new Error("SCRIPTED provider refusal"), { code: "INVALID_INPUT", numericCode: 10000 });
  const lateFork = pending<unknown>(), lateRevoke = pending<boolean>();
  const calls = { forks: [] as string[], revokes: [] as string[], deletes: [] as string[] };
  const requests: EffectRequest[] = [];
  let given: OutsideGiven | null = null, firstForkName: string | null = null, lateForkReleased = false;
  const remote = (name: string) => `https://${SERVICE}/git/${NAMESPACE}/${name}.git`;
  const created = (name: string) => ({ name, remote: remote(name), token: `SETUP-${name}` });
  const binding: ArtifactsNamespace = {
    async get(name) { return {
      async info() { return { name, remote: remote(name) }; },
      async createToken(scope, _seconds) { return { id: "read-stand-in", scope, plaintext: "READ-stand-in", expiresAt: timeOf(timeMs(net.clock.now)! + 120_000) }; },
      async revokeToken(token) {
        if (!token.startsWith("SETUP-")) return true;
        calls.revokes.push(name);
        return mode === "created" ? lateRevoke.promise : true;
      },
      async fork(name) {
        calls.forks.push(name);
        if (mode === "refused") throw refused;
        if (mode === "late" && calls.forks.length === 1) { firstForkName = name; return lateFork.promise; }
        return created(name);
      },
    }; },
    async create() { return expect.fail("a workspace fork must not call namespace create"); },
    async delete(name) { calls.deletes.push(name); return true; },
  };
  life.wire(node.name, () => ({ clock: net.clock, authority: testPorts(c).authority!, capabilities: CAPABILITY_CODE, owners: CAPABILITY_CODE,
    definitions: { ...defaults.definitions, read: async (digest, holder) => digest === definition.digest ? { ok: true, bytes: canonicalize(definition.declared) } : defaults.definitions.read(digest, holder) } }));
  life.peer(entryHash(lineage.opening), { entry: lineage.opening, under: "platform:directory@16" });
  life.outside(node.name, (actual, sql) => {
    given = actual;
    const outside = artifactsWorkspaceOutside(actual, sql, {
      ARTIFACTS_CONFIG: JSON.stringify({ registerScope: lineage.register.scope, namespace: NAMESPACE, host: SERVICE, maxBytes: 1024 * 1024, credentialIdentity: "adapter-attempt" }),
      ARTIFACTS_NAMESPACE: NAMESPACE, ARTIFACTS: binding,
    }, lineage.sources, async request => {
      expect(request.method).toBe("GET");
      expect(request.url.endsWith("/info/refs?service=git-upload-pack")).toBe(true);
      return advertisement();
    });
    return { accepts: (owner, kind) => outside.accepts(owner, kind), ready: request => outside.ready?.(request) ?? true,
      send: request => { requests.push(request); if (requests.length > 32) throw new Error("Native provider request bound exceeded"); return outside.send(request); },
      late: deliver => outside.late?.(deliver), judged: (request, sealed) => outside.judged?.(request, sealed) };
  });
  life.cleanup(() => { net.sized.delete(node.name); });
  net.sized.set(node.name, { ...PROPOSED_BOUNDS, dispatchSeconds: 0.01 });
  const inside = <T>(read: (given: OutsideGiven, state: DurableObjectState) => T) => life.wait(() => runInDurableObject(node.object, (_instance, state) => {
    if (!given) throw new Error("Native outside factory was not constructed");
    return read(given, state);
  }));
  const snapshot = () => inside((actual, state) => {
    const scope = actual.scope(); if (!scope || scope.head.seq >= LIMIT) throw new Error("Native journal bound exceeded");
    const entries = Array.from({ length: scope.head.seq + 1 }, (_, seq) => actual.own(seq)?.entry);
    if (entries.some(value => !value)) throw new Error("Native journal entry is missing");
    const tokens = actual.state.records(OWNER, "token", {}).filter(record => record.values["purpose"] === "setup");
    if (tokens.length > 8) throw new Error("Setup token discovery bound exceeded");
    const rows = state.storage.sql.exec("SELECT handle,name,plaintext FROM private_creation_credential WHERE scope=? ORDER BY handle", canonicalize(scope.at)).toArray();
    return { entries: entries as Entry[], tokens, rows };
  });
  const until = async <T>(read: () => Promise<T>, ready: (value: T) => boolean): Promise<T> => {
    const deadline = Date.now() + 5000;
    for (let pass = 0; pass < 64 && Date.now() < deadline; pass++) {
      await life.wait(() => surface.effect()); const value = await read();
      if (ready(value)) return value;
    }
    throw new Error("Native setup witness exceeded its finite observation bound");
  };
  const releaseFork = () => { if (firstForkName && !lateForkReleased) { lateForkReleased = true; lateFork.resolve(created(firstForkName)); } };
  const close = async () => { releaseFork(); lateRevoke.resolve(true); await drainScheduledFixture(() => life.platforms(), life.wait); life.release(); };
  try {
    expect(await life.wait(() => surface.deliver({ to: lineage.laneSeed, from: factRefOf(lineage.opening), n: 0, message: lineage.laneMessage }))).toMatchObject({ answer: "recorded" });
    await drainScheduledFixture(() => life.platforms(), life.wait);
    // The real factory chooses the workspace path after the native genesis.
    await node.restart();
    surface = node.object as unknown as Surface;
    const at = await node.at(), actions = Object.values(definition.declared.acts).map(act => act.grant);
    const grants = Object.values(keys).map(who => grantOf(who, at, actions));
    const submit = async (who: typeof keys.rita, kind: string, fields: SignedIntent["intent"]["fields"], on: number | null = null, expected: Record<string, number> = {}) => {
      const answer = await life.wait(() => surface.submit(awaitIntent(who, kind, fields, on, expected), grants));
      expect(answer.answer, `${kind} must be natively accepted`).toBe("accepted");
      if (answer.answer !== "accepted") return expect.fail("native act was refused");
      return answer.receipt.fact.seq;
    };
    const awaitIntent = (who: typeof keys.rita, kind: string, fields: SignedIntent["intent"]["fields"], on: number | null, expected: Record<string, number>) => signIntent({ v: 1, to: at, actor: who.key, kind, on, fields, expected, idempotencyKey: crypto.randomUUID(), notAfter: timeOf(timeMs(net.clock.now)! + 60_000) }, who.secret);
    const commitment = await submit(keys.rita, "offer", { intent: 0 }, null, { intent: 1 });
    await submit(keys.rita, "assign", { performer: keys.una.member }, commitment, { on: 1 });
    await submit(keys.una, "take-hold", { commitment }, null, { commitment: 2 });
    return { life, surface, snapshot, until, calls, requests, releaseFork, releaseRevoke: () => lateRevoke.resolve(true), close };
  } catch (error) { await close(); throw error; }
}

const tokenOf = (tokens: readonly RecordState[], attempt = 1) => {
  const matches = tokens.filter(token => token.values["attempt"] === attempt);
  expect(matches).toHaveLength(1); return matches[0]!;
};

test("native setup credential always has a revocation debt while its provider revoke is unanswered", async () => {
  const f = await fixture("created");
  try {
    const held = await f.until(f.snapshot, value => value.tokens.some(token => token.state === "revoking"));
    const token = tokenOf(held.tokens), handle = token.values["id"], operation = token.values["revocation"] as OperationId;
    expect(held.rows).toEqual([{ handle, name: f.calls.forks[0], plaintext: `SETUP-${f.calls.forks[0]}` }]);
    const owed = await f.life.wait(() => f.surface.operation(reader, operation));
    expect(owed.ok, "orphan setup credential must have a native revocation operation").toBe(true);
    if (!owed.ok) return expect.fail("native revocation debt is absent");
    expect(owed.value.operation).toMatchObject({ id: operation, owner: OWNER, kind: "revoke" });
    const unknown = await f.until(() => f.life.wait(() => f.surface.operation(reader, operation)), value => value.ok && value.value.operation.attempts[0]?.outcomes.some(outcome => outcome.result === "unknown") === true);
    expect(unknown).toMatchObject({ ok: true, value: { state: "pending" } });
    expect(unknown.ok && unknown.value.operation.attempts[0]?.outcomes.some(outcome => outcome.result === "unknown")).toBe(true);
    expect(tokenOf((await f.snapshot()).tokens).state).toBe("revoking");
    expect((await f.snapshot()).rows[0]?.["plaintext"]).toBe(`SETUP-${f.calls.forks[0]}`);
    expect(f.calls.revokes).toEqual([f.calls.forks[0]]);
    const original = f.requests.find(request => request.kind === "revoke")!;
    f.releaseRevoke();
    const ended = await f.until(f.snapshot, value => tokenOf(value.tokens).state === "ended");
    expect(ended.rows[0]?.["plaintext"]).toBeNull();
    expect(ended.entries.some(entry => entry.input.type === "outcome" && entry.input.operation === original.operation && entry.input.attempt === original.attempt && entry.input.result === "confirmed")).toBe(true);
    expect(f.calls.revokes).toHaveLength(1);
  } finally { await f.close(); }
}, 20_000);

test("native refused fork attempts end their setup tokens without private credentials", async () => {
  const f = await fixture("refused");
  try {
    const first = await f.until(f.snapshot, value => value.tokens.some(token => token.state === "ended"));
    expect(tokenOf(first.tokens).state).toBe("ended");
    expect(first.rows).toEqual([]);
    expect(f.calls.revokes).toEqual([]);
    expect(first.entries.some(entry => entry.input.type === "outcome" && entry.input.kind === "fork" && entry.input.result === "refused")).toBe(true);
  } finally { await f.close(); }
}, 20_000);

test("native late unselected fork confirmation owes both deletion and setup revocation", async () => {
  const f = await fixture("late");
  try {
    const unknown = await f.until(f.snapshot, value => value.entries.some(entry => entry.input.type === "outcome" && entry.input.kind === "fork" && entry.input.result === "unknown"));
    expect(tokenOf(unknown.tokens).state).toBe("minting");
    const original = f.requests.find(request => request.kind === "fork")!;
    f.life.advance((PROPOSED_BOUNDS.dispatchRetrySeconds + 1) * 1000);
    await f.until(f.snapshot, value => value.entries.some(entry => entry.effects.some(effect => effect.effect === "record" && effect.kind === "fork" && effect.state === "selected")));
    f.releaseFork();
    const late = await f.until(f.snapshot, value => value.entries.some(entry => entry.input.type === "outcome" && entry.input.operation === original.operation && entry.input.attempt === original.attempt && entry.input.result === "confirmed"));
    const outcome = late.entries.find(entry => entry.input.type === "outcome" && entry.input.operation === original.operation && entry.input.attempt === original.attempt && entry.input.result === "confirmed")!;
    expect(outcome.effects).toContainEqual(expect.objectContaining({ effect: "attempt", operation: original.operation, attempt: original.attempt, selected: false }));
    expect(outcome.effects.filter(effect => effect.effect === "operation").map(effect => effect.effect === "operation" ? [effect.k, effect.owner, effect.kind] : null)).toEqual([[0, OWNER, "deletion"], [1, OWNER, "revoke"]]);
    const setup = tokenOf(late.tokens);
    expect(setup.values["id"]).toBe(`workspace:${f.calls.forks[0]}`);
    expect(setup.values["revocation"]).toBe(`${outcome.seq}:1`);
    expect(await f.life.wait(() => f.surface.operation(reader, `${outcome.seq}:0`))).toMatchObject({ ok: true, value: { operation: { kind: "deletion" } } });
    expect(await f.life.wait(() => f.surface.operation(reader, `${outcome.seq}:1`))).toMatchObject({ ok: true, value: { operation: { kind: "revoke" } } });
  } finally { await f.close(); }
}, 20_000);
