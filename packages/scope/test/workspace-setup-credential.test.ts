import { env } from "cloudflare:workers";
import { runInDurableObject } from "cloudflare:test";
import { expect, test } from "vitest";
import type { Entry, FactRef, OperationId, ScopeRef, Seed, SendForm, SignedIntent } from "@generalbusiness/dap-contract";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { canonicalize, digestBytes, entryHash, factRefOf, intentDigest, newIncarnation, platformName, scopeIdOf, seedDigest, signIntent, timeMs, timeOf, utf8 } from "@generalbusiness/dap-bytes";
import type { RecordState } from "@generalbusiness/dap-derive";
import { grantOf, keys, variant } from "@generalbusiness/dap-derive/testing";
import { outsideOf } from "../src/worker.ts";
import type { ArtifactsNamespace } from "../src/artifacts-host.ts";
import type { OutsideGiven } from "../src/given.ts";
import { CAPABILITY_CODE, ScopeObject, type EffectRequest, type Wiring } from "../src/index.ts";
import type { NativeBirth } from "../src/native-birth.ts";
import { production } from "../src/ports.ts";
import { controls, testPorts } from "../src/testing.ts";
import { workspaceRepository, type WorkspaceSources } from "../src/workspace-lineage.ts";
import { reader, START } from "./fixtures-native.ts";
import { staged } from "./hosted.ts";

// The lane's genesis, acts, hold@2 outcomes, operation ledger and SQL are native.
// The ancestors, authority, clock, provider binding and Git packets are explicit
// STAND-INS. No real Membership, Directory, provider or physical drain is proved.
const OWNER = "hold@2", SERVICE = "service.invalid", NAMESPACE = "setup-custody";
const COMMIT = "1".repeat(40), LIMIT = 96;
type Mode = "created" | "refused" | "late";
type Surface = Pick<ScopeObject, "deliver" | "submit" | "effect" | "operation">;
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
  const time = START;
  const hash = digestBytes(utf8(crypto.randomUUID()));
  const seed = (kind: Seed["kind"], named: Seed["definition"], creator: ScopeRef | null, cause = hash, ordinal = 0): Seed => ({ v: 1, kind, definition: named, creator, cause, ordinal });
  const ref = (value: Seed, n: number): ScopeRef => ({ scope: scopeIdOf(value), kind: value.kind, inc: newIncarnation(new Uint8Array(16).fill(n)) });
  const entry = (at: ScopeRef, seq: number, input: Entry["input"], effects: Entry["effects"] = [], sends: Entry["sends"] = []): Entry => ({ v: 1, at, seq, prev: seq === 0 ? null : hash, time, clamped: false, epoch: 0, input, uses: [], prepared: [], effects, sends });
  const genesis = (value: Seed, at: ScopeRef, source: FactRef | null = null, n: number | null = null, message: Extract<Entry["input"], { type: "genesis" }>["message"] = null, sends: Entry["sends"] = []): Entry => entry(at, 0, { type: "genesis", seed: value, inc: at.inc, kind: "establish", founding: null, source, n, message, decision: "applied" }, [], sends);
  const signed = (at: ScopeRef, kind: string, fields: SignedIntent["intent"]["fields"]): SignedIntent => signIntent({ v: 1, to: at, actor: keys.rita.key, kind, on: null, fields, expected: {}, idempotencyKey: crypto.randomUUID(), notAfter: timeOf(timeMs(time)! + 60_000) }, keys.rita.secret);
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
  const trace: Array<{ kind: string; found: boolean }> = [];
  const count = () => { if (++reads > 256) throw new Error("Scripted lineage read bound exceeded"); };
  const sources: WorkspaceSources = {
    births: { async read(name, kind) {
      count(); const value = entries.find(value => value.at.scope === name && value.at.kind === kind && value.seq === 0);
      trace.push({ kind, found: value?.input.type === "genesis" });
      if (!value || value.input.type !== "genesis") return null;
      const named = value.input.seed.definition as `platform:${string}@${number}`;
      return { v: 1, proof: bodies.get(entryHash(value))!, named, declarationName: platformName(named as never), native: true } as NativeBirth;
    } },
    proofs: { async read(fact) { count(); const body = bodies.get(fact.hash); trace.push({ kind: "proof", found: body !== undefined }); return body ?? null; } },
  };
  const confirmation = (born: Entry): Entry => {
    const result = born.sends.find(send => send.message.class === "result");
    if (!result || result.message.class !== "result") throw new Error("Native genesis has no creation result");
    const genesis = factRefOf(born), message = { class: "control", type: "confirm", genesis } as const;
    // Explicit creator STAND-IN, bound to the actual judged child's result.
    // It supplies no fork, token, revoke or other cleanup outcome.
    return entry(directory, 6, { type: "delivery", from: genesis, n: result.n, message: result.message, clause: "applied" }, [], [{ n: 0, to: born.at, message }]);
  };
  return { register, laneSeed, opening, laneMessage, sources, confirmation, readMetadata: () => ({ count: reads, last: trace.slice(-16) }) };
}

async function fixture(mode: Mode) {
  const definition = variant(staged.declared, draft => {
    draft.capabilities.find((cap: { name: string }) => cap.name === "hold").version = 2;
    // This witness creates no link child or unrelated child declaration.
    draft.acts.link.sends = draft.acts.link.sends.filter((send: SendForm) => !("create" in send));
  });
  const lineage = ancestors(definition), name = scopeIdOf(lineage.laneSeed);
  const stub = env.SCOPES.get(env.SCOPES.idFromName(name));
  const c = controls(name, START), defaults = production();
  const scheduled: Promise<unknown>[] = [];
  let factory: ScopeObject | undefined, given: OutsideGiven | null = null;
  let joinFailure: Error | null = null;
  let originalWaitUntil: DurableObjectState["waitUntil"] | null = null, closed = false;
  const inside = <T>(read: (state: DurableObjectState) => T | Promise<T>): Promise<T> => runInDurableObject(stub, (_instance, state) => read(state));
  const life = {
    async wait<T>(work: () => Promise<T>): Promise<T> {
      if (closed) throw new Error("Native setup fixture authority was released");
      const value = await work();
      if (closed) throw new Error("Native setup fixture authority was released during a call");
      return value;
    },
    advance(milliseconds: number): void {
      if (closed || !Number.isFinite(milliseconds) || milliseconds < 0) throw new Error("Invalid fixture clock advance");
      c.clock.now = timeOf(timeMs(c.clock.now)! + milliseconds);
    },
  };
  const surface: Surface = {
    deliver: envelope => inside(() => factory!.deliver(envelope)),
    submit: (signed, grants, beside, address) => inside(() => factory!.submit(signed, grants, beside, address)),
    effect: () => inside(() => factory!.effect()),
    operation: (reader, operation) => inside(() => factory!.operation(reader, operation)),
  };
  const refused = Object.assign(new Error("SCRIPTED provider refusal"), { code: "INVALID_INPUT", numericCode: 10000 });
  const lateFork = pending<unknown>(), lateRevoke = pending<boolean>();
  const calls = { forks: [] as string[], revokes: [] as string[], deletes: [] as string[] };
  const bindingCalls = { get: 0, info: 0, createToken: 0 };
  const requests: EffectRequest[] = [];
  const answers: Array<{ kind: string; operation: OperationId; attempt: number; result: string }> = [];
  let gitReads = 0;
  let firstForkName: string | null = null, lateForkReleased = false;
  const remote = (name: string) => `https://${SERVICE}/git/${NAMESPACE}/${name}.git`;
  const created = (name: string) => ({ name, remote: remote(name), token: `SETUP-${name}` });
  const binding: ArtifactsNamespace = {
    async get(name) { bindingCalls.get++; return {
      async info() { bindingCalls.info++; return { name, remote: remote(name) }; },
      async createToken(scope, _seconds) { bindingCalls.createToken++; return { id: "read-stand-in", scope, plaintext: "READ-stand-in", expiresAt: timeOf(timeMs(c.clock.now)! + 120_000) }; },
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
  // The maintained operations fixture uses a test-local ScopeObject over its
  // actual native context. Its production readonly OutsideGiven sees the live
  // SqliteStore. Test authority is explicit; deployed authority and application
  // admission are not claimed. No MemoryState or manual cleanup fold exists.
  class FactoryScope extends ScopeObject {
    protected override wiring(): Wiring {
      return {
        bounds: { ...PROPOSED_BOUNDS, dispatchSeconds: 0.01 },
        ports: { ...testPorts(c), capabilities: CAPABILITY_CODE, owners: CAPABILITY_CODE,
          definitions: { ...defaults.definitions, read: async (digest, holder) => digest === definition.digest ? { ok: true, bytes: canonicalize(definition.declared) } : defaults.definitions.read(digest, holder) } },
        outside: actual => {
          given = actual;
          const outside = outsideOf(actual, this.ctx.storage.sql, {
            ARTIFACTS_CONFIG: JSON.stringify({ registerScope: lineage.register.scope, namespace: NAMESPACE, host: SERVICE, maxBytes: 1024 * 1024, credentialIdentity: "adapter-attempt" }),
            ARTIFACTS_NAMESPACE: NAMESPACE, ARTIFACTS: binding,
          }, async request => {
            gitReads++;
            expect(request.method).toBe("GET");
            expect(request.url.endsWith("/info/refs?service=git-upload-pack")).toBe(true);
            return advertisement();
          }, undefined, lineage.sources);
          return { accepts: (owner, kind) => outside.accepts(owner, kind), ready: request => outside.ready?.(request) ?? true,
            send: async request => {
              requests.push(request); if (requests.length > 32) throw new Error("Native provider request bound exceeded");
              const answer = await outside.send(request);
              answers.push({ kind: request.kind, operation: request.operation, attempt: request.attempt, result: answer?.result ?? "none" });
              return answer;
            },
            late: deliver => outside.late?.(deliver), judged: (request, sealed) => outside.judged?.(request, sealed) };
        },
      };
    }
  }
  c.foreign.set(entryHash(lineage.opening), { entry: lineage.opening, under: "platform:directory" });
  const metadata = () => inside(() => {
    if (!given) throw new Error("Native outside factory was not constructed");
    return { scope: given.scope(), born: given.own(0)?.entry };
  });
  const snapshot = () => inside(state => {
    if (!given) throw new Error("Native outside factory was not constructed");
    const scope = given.scope(); if (!scope || scope.head.seq >= LIMIT) throw new Error("Native journal bound exceeded");
    const entries = Array.from({ length: scope.head.seq + 1 }, (_, seq) => given!.own(seq)?.entry);
    if (entries.some(value => !value)) throw new Error("Native journal entry is missing");
    const tokens = given.state.records(OWNER, "token", {}).filter(record => record.values["purpose"] === "setup");
    if (tokens.length > 8) throw new Error("Setup token discovery bound exceeded");
    const rows = state.storage.sql.exec("SELECT handle,name,plaintext FROM private_creation_credential WHERE scope=? ORDER BY handle", canonicalize(scope.at)).toArray();
    return { entries: entries as Entry[], tokens, rows };
  });
  // Failure-only metadata. Never serialize signed fields, evidence bodies,
  // bearer plaintext, repository bodies or their hashes.
  const diagnostic = () => inside(state => {
    if (!given) return { state: "outside-unavailable" };
    const scope = given.scope();
    if (!scope || scope.head.seq >= LIMIT) return { state: "journal-unavailable-or-over-bound" };
    const entries = Array.from({ length: scope.head.seq + 1 }, (_, seq) => given!.own(seq)?.entry).filter((entry): entry is Entry => entry !== undefined);
    const opened = entries.flatMap(entry => entry.effects.flatMap(effect => effect.effect === "operation" ? [`${entry.seq}:${effect.k}` as OperationId] : []));
    if (opened.length > 32) return { state: "operation-diagnostic-bound" };
    const counts = state.storage.sql.exec("SELECT COUNT(*) AS rows,SUM(CASE WHEN plaintext IS NOT NULL THEN 1 ELSE 0 END) AS held FROM private_creation_credential WHERE scope=?", canonicalize(scope.at)).toArray()[0];
    return {
      state: scope.status, head: scope.head.seq, callbacks: scheduled.length,
      clock: given.clock.read(), scopeTime: scope.time,
      holds: given.state.records(OWNER, "fork", {}).map(record => {
        const number = record.key[0], item = typeof number === "number" ? given!.state.item(number) : null;
        const definition = given!.definition?.(), type = item ? definition?.declared.items[item.type] : null;
        const timer = item ? Object.values(definition?.declared.timed ?? {}).find(rule => rule.on === item.type && rule.effects.some(effect => "hold" in effect && effect.hold.do === "end")) : null;
        const deadline = item && timer ? item.values[timer.deadline] : null;
        return { number, type: item?.type ?? null, state: item?.state ?? null, epoch: item?.values["epoch"] ?? null,
          initial: type?.initial ?? null, recognizedType: item ? definition?.holdTypes.includes(item.type) ?? false : false,
          deadlineField: timer?.deadline ?? null, deadline: typeof deadline === "string" ? deadline : null };
      }),
      workspaceForms: given.definition?.()?.underived.filter(form => form.capability === OWNER).map(form => ({ form: form.form, name: form.name })) ?? [],
      journal: entries.slice(-12).map(entry => ({ seq: entry.seq, type: entry.input.type,
        kind: "kind" in entry.input ? entry.input.kind : null, result: "result" in entry.input ? entry.input.result : null,
        effects: entry.effects.flatMap<{ type: string; kind: string; state: string | null }>(effect => effect.effect === "operation" ? [{ type: "operation", kind: effect.kind, state: null }]
          : effect.effect === "record" ? [{ type: "record", kind: effect.kind, state: effect.state }] : []) })),
      tokens: given.state.records(OWNER, "token", {}).map(record => ({ number: record.key[0], state: record.state, purpose: record.values["purpose"], attempt: record.values["attempt"] })),
      forks: given.state.records(OWNER, "fork", {}).map(record => ({ number: record.key[0], state: record.state })),
      operations: opened.map(id => { const operation = given!.state.operation(id); return { id, kind: operation?.kind ?? null, selected: operation?.selected ?? null,
        attempts: operation?.attempts.map(attempt => ({ number: attempt.attempt, results: attempt.outcomes.map(outcome => outcome.result) })) ?? [] }; }),
      requests: requests.map(request => ({ kind: request.kind, operation: request.operation, attempt: request.attempt })), answers,
      calls: { ...bindingCalls, forks: calls.forks.length, revokes: calls.revokes.length, deletes: calls.deletes.length, gitReads },
      custody: { rows: counts?.["rows"] ?? 0, held: counts?.["held"] ?? 0 }, lineageReads: lineage.readMetadata(),
    };
  });
  const until = async <T>(read: () => Promise<T>, ready: (value: T) => boolean): Promise<T> => {
    const deadline = Date.now() + 5000;
    for (let pass = 0; pass < 64 && Date.now() < deadline; pass++) {
      await life.wait(() => surface.effect()); const value = await read();
      if (ready(value)) return value;
    }
    try { console.info("workspace-setup-failure", JSON.stringify(await diagnostic())); }
    catch { console.info("workspace-setup-failure", JSON.stringify({ state: "diagnostic-unavailable" })); }
    throw new Error("Native setup witness exceeded its finite observation bound");
  };
  const releaseFork = () => { if (firstForkName && !lateForkReleased) { lateForkReleased = true; lateFork.resolve(created(firstForkName)); } };
  const joinCallbacks = () => inside(async () => {
    if (joinFailure) throw joinFailure;
    const failed = (message: string): never => { joinFailure = new Error(message); throw joinFailure; };
    let callbacks = 0;
    for (let batch = 0; batch < 64; batch++) {
      if (!scheduled.length) return callbacks;
      const current = scheduled.splice(0); callbacks += current.length;
      if (callbacks > 4096) failed("Native fixture callback bound exceeded");
      const results = await Promise.allSettled(current);
      if (results.some(result => result.status === "rejected")) failed("Native fixture callback rejected");
    }
    failed("Native fixture callback round bound exceeded");
  });
  const close = async () => {
    releaseFork(); lateRevoke.resolve(true);
    for (let pass = 0; pass < 64; pass++) {
      const before = await joinCallbacks(), work = factory ? await surface.effect() : 0, after = await joinCallbacks();
      if (before === 0 && work === 0 && after === 0) {
        await inside(state => { if (originalWaitUntil) state.waitUntil = originalWaitUntil; });
        closed = true; c.foreign.clear(); return;
      }
    }
    // A failed join retains this fixture's callback capture and authority.
    throw new Error("Native fixture cleanup round bound exceeded");
  };
  try {
    await inside(state => {
      originalWaitUntil = state.waitUntil;
      state.waitUntil = promise => { scheduled.push(promise); originalWaitUntil!.call(state, promise); };
      factory = new FactoryScope(state, {});
    });
    const genesis = await life.wait(() => surface.deliver({ to: lineage.laneSeed, from: factRefOf(lineage.opening), n: 0, message: lineage.laneMessage }));
    expect(genesis, `native fixture genesis reply: ${JSON.stringify(genesis)}`).toMatchObject({ answer: "recorded" });
    const initial = await metadata();
    expect(initial.born?.input, JSON.stringify(initial.born?.input)).toMatchObject({ type: "genesis", decision: "applied" });
    expect(initial.scope?.status).toBe("provisional");
    if (!initial.born) return expect.fail("Native genesis is unavailable");
    const confirmation = lineage.confirmation(initial.born), send = confirmation.sends[0]!;
    c.foreign.set(entryHash(confirmation), { entry: confirmation, under: "platform:directory" });
    const activated = await life.wait(() => surface.deliver({ to: send.to, from: factRefOf(confirmation), n: send.n, message: send.message }));
    expect(activated, JSON.stringify(activated)).toMatchObject({ answer: "recorded" });
    const active = await metadata();
    expect(active.scope?.status).toBe("active");
    const at = active.scope!.at, actions = Object.values(definition.declared.acts).map(act => act.grant);
    const grants = Object.values(keys).map(who => grantOf(who, at, actions));
    const submit = async (who: typeof keys.rita, kind: string, fields: SignedIntent["intent"]["fields"], on: number | null = null, expected: Record<string, number> = {}) => {
      const answer = await life.wait(() => surface.submit(awaitIntent(who, kind, fields, on, expected), grants));
      expect(answer.answer, `${kind} native reply: ${JSON.stringify(answer)}`).toBe("accepted");
      if (answer.answer !== "accepted") return expect.fail("native act was refused");
      return answer.receipt.fact.seq;
    };
    const awaitIntent = (who: typeof keys.rita, kind: string, fields: SignedIntent["intent"]["fields"], on: number | null, expected: Record<string, number>) => signIntent({ v: 1, to: at, actor: who.key, kind, on, fields, expected, idempotencyKey: crypto.randomUUID(), notAfter: timeOf(timeMs(c.clock.now)! + 60_000) }, who.secret);
    const commitment = await submit(keys.rita, "offer", { intent: 0 }, null, { intent: 1 });
    await submit(keys.rita, "assign", { performer: keys.una.member }, commitment, { on: 1 });
    // One labelled fixture check before any workspace operation: the actual
    // production parser makes at most five immutable scripted lineage reads.
    // It performs no provider request and changes no native cleanup record.
    const preflight = await inside(async () => {
      if (!given) throw new Error("Native outside factory was not constructed");
      const before = lineage.readMetadata().count;
      const repository = await workspaceRepository(given, lineage.sources, lineage.register.scope, "artifacts", NAMESPACE);
      return { recognized: repository !== null, reads: lineage.readMetadata().count - before, readCeiling: 5, trace: lineage.readMetadata().last.slice(-5) };
    });
    console.info("workspace-setup-lineage-preflight", JSON.stringify(preflight));
    expect(preflight.recognized, "scripted lineage must satisfy production workspaceRepository before take-hold").toBe(true);
    await submit(keys.una, "take-hold", { commitment }, null, { commitment: 2 });
    return { life, surface, snapshot, until, calls, requests, releaseFork, releaseRevoke: () => lateRevoke.resolve(true), close };
  } catch (error) {
    try { await close(); } catch { /* Failed cleanup retains ownership; preserve the original setup error. */ }
    throw error;
  }
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
