import { expect, test } from "vitest";
import type { Digest, FactRef, FieldValue, PlatformDefinition, Request, Seed } from "@generalbusiness/dap-contract";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { factRefOf, intentDigest, scopeIdOf, signIntent, textDigest, newGenesisNonce } from "@generalbusiness/dap-bytes";
import { clockOf, judgeDelivery, judgeGenesis, judgeOutcome, runnable, type Fetched, type PlatformRules, type RuleGiven } from "@generalbusiness/dap-derive";
import { Ledger, T0, keys, t, fixtureSequence } from "@generalbusiness/dap-derive/testing";
import { platform, repositoryName, firstHeadCommit, UNPUBLISHED_COHORT as U, REPOSITORY_BINDING_COHORT as B } from "../src/index.ts";
import { checkedPlatformData, written } from "./fixtures.ts";

// These are the actual native data, rules and pure judges in memory. No
// Worker, provider, membership grant or independent replay runs here.
const code = (named: PlatformDefinition): PlatformRules => ({ named, rules: platform(named)!.rules });
type Cohort = typeof U | typeof B;
function register(host: string, namespace = "TEST ignored under none", family: Cohort = U) {
  const definition = checkedPlatformData(platform(family.register)!.data), ledger = new Ledger(definition, "platform:register");
  const signed = signIntent({ v: 1, to: null, actor: keys.rita.key, kind: "install", on: null, expected: {},
    fields: { host, namespace, policy: "keys", founders: [keys.rita.key] }, idempotencyKey: "TEST install", notAfter: t(60) }, keys.rita.secret);
  const seed: Seed = { v: 1, kind: "register", definition: family.register, creator: null, cause: intentDigest(signed.intent), ordinal: 0 };
  // Passive capture forwards the actual native guard, including its named
  // answer. A parentless refused genesis records no result envelope/reason.
  const native = code(family.register), guard = native.rules["host-choice"]!, hostChecks: unknown[] = [];
  if (guard.place !== "guard") throw Error("Native host choice guard required");
  const observed: PlatformRules = { ...native, rules: { ...native.rules, "host-choice": { ...guard, run: (given: RuleGiven) => {
    const checked = guard.run(given); hostChecks.push(checked); return checked;
  } } } };
  const judgment = judgeGenesis(ledger.state, definition, { name: scopeIdOf(seed), nonce: newGenesisNonce(new Uint8Array(16).fill(21)), seed, creation: signed },
    { clock: clockOf(ledger.state, T0), bounds: PROPOSED_BOUNDS, facts: [], prepared: [], source: null, platform: observed });
  if (judgment.result === "write") ledger.seal(judgment.draft);
  return { ledger, judgment, hostChecks };
}
function found(ledger: Ledger, fields: Record<string, FieldValue> = {}, family: Cohort = U) {
  return ledger.act(keys.rita, "found", { expected: { register: 1 }, fields: {
    branch: "main", founderHandle: "@rita", recoveryKey: keys.sam.key, ...fields,
  } }, { platform: code(family.register), grants: [] });
}
function child(parent: Ledger, seq: number, ordinal: number, named: PlatformDefinition, facts: readonly Fetched[]) {
  const send = parent.entries[seq]!.entry.sends.find(send => send.n === ordinal)!;
  const seed = send.to as Seed, definition = checkedPlatformData(platform(named)!.data);
  const ledger = new Ledger(definition, `platform:${seed.kind}`);
  ledger.seal(written(judgeGenesis(ledger.state, definition, { name: scopeIdOf(seed), nonce: newGenesisNonce(new Uint8Array(16).fill(seed.kind === "directory" ? 20 : 16)),
    to: seed, from: parent.fact(seq), n: send.n, message: send.message as Request }, {
    clock: clockOf(ledger.state, T0), bounds: PROPOSED_BOUNDS, facts, prepared: [], own: ledger.own,
    source: { entry: parent.entries[seq]!.entry, under: parent.under, sequence: fixtureSequence(parent) }, platform: code(named),
  })));
  return ledger;
}
function take(target: Ledger, named: PlatformDefinition, from: Ledger, seq: number, ordinal: number, facts: readonly Fetched[] = []) {
  const entry = from.entries[seq]!.entry, send = entry.sends.find(send => send.n === ordinal)!;
  const of = send.message.class === "result" ? send.message.of : null;
  const judgment = judgeDelivery(target.state, target.definition, { to: send.to, from: from.fact(seq), n: ordinal, message: send.message }, {
    clock: clockOf(target.state, target.now), bounds: target.bounds, facts, prepared: [], own: target.own,
    source: { entry, under: from.under, sequence: fixtureSequence(from) }, origin: of ? target.entries[of.from.seq]!.entry : null, platform: code(named),
  });
  target.seal(written(judgment));
}

test("new native versions are runnable under their complete validated declarations", () => {
  for (const named of [U.register, U.directory, U.destination, B.register, B.directory, B.membership, B.destination]) {
    const native = platform(named)!;
    expect(runnable(checkedPlatformData(native.data), native.rules)).toBe(true);
  }
});

test("an opt-in unpublished destination binds once, authenticates its directory update and opens the exact first publication", () => {
  // The native judges and histories are real. Ledger grants and the host's
  // mint/write answers below are scripted; no provider or deployed room runs.
  const R = register("none", "", B).ledger;
  expect(found(R, {}, B).result).toBe("write");
  const facts = [{ fact: R.fact(1), entry: R.last, under: R.under, sequence: fixtureSequence(R) }];
  const D = child(R, 1, 0, B.directory, facts);
  take(R, B.register, D, 0, D.last.sends.find(send => send.message.class === "result")!.n);
  take(D, B.directory, R, R.head.seq, 0, facts);
  const sent = D.entries[0]!.entry.sends.find(send => "kind" in send.to && send.to.kind === "destination")!;
  const Q = child(D, 0, sent.n, B.destination, facts);
  take(D, B.directory, Q, 0, Q.last.sends.find(send => send.message.class === "result")!.n, facts);
  take(Q, B.destination, D, D.head.seq, D.last.sends.find(send => send.message.class === "control")!.n, facts);
  expect(Q.state.scope()!.status).toBe("active");
  expect(Q.item(0).state).toBe("unpublished");
  const earlier = D.entries.slice(), repository = { host: "github.com", namespace: "TEST-account", name: "TEST-repo", id: "71" };
  const fields = { repository, why: "TEST attach an empty repository to this room" };
  const intent = { on: 0, expected: { on: Q.item(0).revision }, fields };
  expect(Q.act(keys.rita, "bind-repository", intent, { platform: code(B.destination), grants: [] })).toMatchObject({ result: "refused", reason: "unauthorized" });
  expect(Q.item(0).values["repository"]).toBeNull();
  expect(Q.act(keys.rita, "bind-repository", { ...intent, fields: { ...fields, repository: { ...repository, host: "another-host" } } }, { platform: code(B.destination) })).toMatchObject({ result: "refused", name: "invalid-repository-binding" });
  const binding = Q.act(keys.rita, "bind-repository", intent, { platform: code(B.destination) });
  expect(binding.result, binding.result === "write" ? undefined : JSON.stringify(binding)).toBe("write");
  const boundAt = Q.head.seq;
  expect(Q.item(0)).toMatchObject({ state: "empty", values: { repository, head: null } });
  expect(Q.state.operation(`${boundAt}:0`)).toMatchObject({ owner: B.destination, kind: "first-head", attempts: [{ attempt: 1 }] });
  expect(Q.state.operation(`${boundAt}:1`)).toMatchObject({ owner: B.destination, kind: "mint", attempts: [{ attempt: 1 }] });
  const update = Q.last.sends.find(send => send.message.class === "request" && send.message.type === "tell")!;
  expect(update.message).toMatchObject({ type: "tell", body: { message: "repository-bound", fields: { repository } } });
  take(D, B.directory, Q, boundAt, update.n);
  expect(D.item(0).values["repository"]).toEqual(repository);
  expect(D.entries.slice(0, earlier.length)).toEqual(earlier);
  expect(Q.act(keys.rita, "bind-repository", { ...intent, expected: { on: Q.item(0).revision } }, { platform: code(B.destination) })).toMatchObject({ result: "refused", reason: "guard-failed", detail: "guards.0" });
  const first = Q.state.operation(`${boundAt}:0`)!;
  const commit = firstHeadCommit(Q.state, Q.own, first, "sha1");
  const answer = (operation: `${number}:${number}`, body: FieldValue) => Q.seal(written(judgeOutcome(Q.state, Q.definition,
    { type: "outcome", operation, attempt: 1, result: "confirmed", evidence: { basis: "own-answer", body } },
    { clock: clockOf(Q.state, Q.now), bounds: Q.bounds, platform: code(B.destination), own: Q.own })));
  answer(`${boundAt}:1`, { token: "TEST-token-handle", ends: t(600) });
  answer(`${boundAt}:0`, { send: "accepted", seen: commit });
  expect(Q.item(0)).toMatchObject({ state: "ready", values: { repository, head: commit } });
  expect(Q.state.count("receipt", "owed")).toBe(1);
});

test("Register21 rejects an unknown host, normalizes none, and settles a hosted creation from a scripted outside answer", () => {
  const unknown = register("other");
  expect(unknown.judgment.result).toBe("write");
  expect(unknown.ledger.last.input).toMatchObject({ type: "genesis", decision: "refused" });
  expect(unknown.ledger.state.scope()!.status).toBe("refused");
  expect(unknown.ledger.last.effects).toEqual([]);
  expect(unknown.hostChecks).toEqual([{ holds: false, name: "host-unknown" }]);
  const none = register("none").ledger;
  expect(none.item(0).values["namespace"]).toBe("");
  expect(found(none, { archive: "journal" })).toMatchObject({ result: "refused", reason: "guard-failed", name: "no-repository" });
  expect(found(none, { import: "https://TEST.invalid/repository.git" })).toMatchObject({ result: "refused", reason: "guard-failed", name: "no-repository" });
  expect(none.entries).toHaveLength(1);
  const hosted = register("github.com", "TEST namespace").ledger;
  expect(found(hosted).result).toBe("write");
  expect(hosted.last.sends).toEqual([]);
  expect(hosted.state.operation("1:0")).toMatchObject({ kind: "create-repository", owner: U.register });
  expect(hosted.item(0).values["namespace"]).toBe("TEST namespace");
  // SCRIPTED host answer only. The outcome, Directory20 genesis and returned
  // result/confirmation below run the actual native data, rules and judges.
  const repository = { host: "github.com", namespace: "TEST namespace",
    name: repositoryName(hosted.item(1).values["seed"] as Digest, 1), id: "TEST hosted repository" };
  hosted.seal(written(judgeOutcome(hosted.state, hosted.definition, { type: "outcome", operation: "1:0", attempt: 1, result: "confirmed",
    evidence: { basis: "own-answer", body: { name: repository.name, id: repository.id } } }, {
    clock: clockOf(hosted.state, hosted.now), bounds: hosted.bounds, platform: code(U.register), own: hosted.own,
  })));
  const facts = [{ fact: hosted.fact(1), entry: hosted.entries[1]!.entry, under: hosted.under, sequence: fixtureSequence(hosted) }];
  const D = child(hosted, 2, 0, U.directory, facts);
  expect(D.last.input).toMatchObject({ type: "genesis", decision: "applied", seed: { definition: U.directory } });
  const answer = D.last.sends.find(send => send.message.class === "result")!;
  take(hosted, U.register, D, 0, answer.n);
  expect(hosted.item(1)).toMatchObject({ state: "active", refs: { directory: D.at, genesis: D.fact(0) } });
  expect(hosted.state.request(2, 0)?.result?.clause).toBe("applied");
  take(D, U.directory, hosted, hosted.head.seq, 0, facts);
  expect(D.state.scope()!.status).toBe("active");
  expect(D.item(0).values["repository"]).toEqual(repository);
});

test("a native unpublished found directly creates its directory, applies its result, and creates a destination with no first-head work", () => {
  const R = register("none").ledger;
  expect(found(R).result).toBe("write");
  expect(R.state.operation("1:0")).toBeNull();
  expect(R.last.sends).toHaveLength(1);
  expect(R.last.sends[0]!.message).toMatchObject({ class: "request", type: "create", body: { fields: { claim: { self: true } } } });
  const body = R.last.sends[0]!.message as Request;
  expect(Object.hasOwn((body.body as { fields: object }).fields, "repository")).toBe(false);
  const claim: FactRef = R.fact(1), facts = [{ fact: claim, entry: R.last, under: R.under, sequence: fixtureSequence(R) }];
  const D = child(R, 1, 0, U.directory, facts);
  expect(D.last.input).toMatchObject({ type: "genesis", decision: "applied", seed: { definition: U.directory } });
  const answer = D.last.sends.find(send => send.message.class === "result")!;
  take(R, U.register, D, 0, answer.n);
  expect(R.item(1)).toMatchObject({ state: "active", refs: { directory: D.at, genesis: D.fact(0) } });
  expect(R.state.request(1, 0)?.result?.clause).toBe("applied");
  const type = platform(U.register)!.rules["directory-genesis-result"]!;
  if (type.place !== "type") throw Error("Native directory result type required");
  const resultContext = { input: R.last.input, own: R.own, resolved: { at: R.at } } as unknown as RuleGiven;
  // Runtime facts have the closed FieldValue shape; the interface types do
  // not carry a string index signature. Use the actual claim slot location.
  const accepts = (context: RuleGiven, value: unknown) => type.run(context, value as FieldValue, { item: 1, slot: "genesis" });
  expect(accepts(resultContext, D.fact(0))).toBe(true);
  // One slot boundary: the verified result may name only its own deciding
  // directory genesis and the exact recorded native founding request.
  const resultInput = R.last.input;
  if (resultInput.type !== "delivery" || resultInput.message.class !== "result") throw Error("Native applied result required");
  const directoryGenesis = D.last.input;
  if (directoryGenesis.type !== "genesis") throw Error("Native directory genesis required");
  const wrongGenesis = { ...resultInput, from: { ...resultInput.from, at: { ...resultInput.from.at, genesis: R.at.genesis } } };
  const refusedResult = { ...resultInput, message: { ...resultInput.message, outcome: "refused" as const } };
  const original = R.own(1)!;
  const unrelated = { ...resultContext, own: Object.assign(() => ({ ...original, hash: R.fact(0).hash }), { sequence: resultContext.own.sequence }) };
  const wrongOrigin = { ...resultContext, own: Object.assign(() => ({ ...original, entry: { ...original.entry, input: directoryGenesis } }), { sequence: resultContext.own.sequence }) };
  expect([
    accepts(resultContext, { ...D.fact(0), seq: 1 }),
    accepts(resultContext, { ...D.fact(0), hash: R.fact(0).hash }),
    accepts({ ...resultContext, input: wrongGenesis }, D.fact(0)),
    accepts(unrelated, D.fact(0)),
    accepts(wrongOrigin, D.fact(0)),
    accepts({ ...resultContext, input: refusedResult }, D.fact(0)),
    accepts({ ...resultContext, input: directoryGenesis }, D.fact(0)),
  ]).toEqual([false, false, false, false, false, false, false]);
  take(D, U.directory, R, R.head.seq, 0, facts);
  expect(D.state.scope()!.status).toBe("active");
  expect(D.item(0).values["repository"]).toBeNull(); // canonical native empty slot
  const destination = D.entries[0]!.entry.sends.find(send => "kind" in send.to && send.to.kind === "destination")!;
  const Q = child(D, 0, destination.n, U.destination, facts);
  expect(Q.last.input).toMatchObject({ type: "genesis", decision: "applied", seed: { definition: U.destination } });
  expect(Q.item(0)).toMatchObject({ state: "unpublished", values: { repository: null, head: null } });
  expect(Q.state.operation("0:0")).toBeNull();
  expect(Q.last.effects.some(effect => effect.effect === "operation")).toBe(false);
});
