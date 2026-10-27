import { expect, test } from "vitest";
import type { FactRef, FieldValue, PlatformDefinition, Request, Seed } from "@generalbusiness/dap-contract";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { factRefOf, intentDigest, newIncarnation, scopeIdOf, signIntent } from "@generalbusiness/dap-bytes";
import { clockOf, judgeDelivery, judgeGenesis, runnable, type Fetched, type PlatformRules } from "@generalbusiness/dap-derive";
import { Ledger, T0, keys, t } from "@generalbusiness/dap-derive/testing";
import { platform, UNPUBLISHED_COHORT as U } from "../src/index.ts";
import { checkedPlatformData, written } from "./fixtures.ts";

// These are the actual native data, rules and pure judges in memory. No
// Worker, provider, membership grant or independent replay runs here.
const code = (named: PlatformDefinition): PlatformRules => ({ named, rules: platform(named)!.rules });
function register(host: string, namespace = "TEST ignored under none") {
  const definition = checkedPlatformData(platform(U.register)!.data), ledger = new Ledger(definition, "platform:register");
  const signed = signIntent({ v: 1, to: null, actor: keys.rita.key, kind: "install", on: null, expected: {},
    fields: { host, namespace, policy: "keys", founders: [keys.rita.key] }, idempotencyKey: "TEST install", notAfter: t(60) }, keys.rita.secret);
  const seed: Seed = { v: 1, kind: "register", definition: U.register, creator: null, cause: intentDigest(signed.intent), ordinal: 0 };
  const judgment = judgeGenesis(ledger.state, definition, { name: scopeIdOf(seed), inc: newIncarnation(new Uint8Array(16).fill(21)), seed, creation: signed },
    { clock: clockOf(ledger.state, T0), bounds: PROPOSED_BOUNDS, facts: [], prepared: [], source: null, platform: code(U.register) });
  if (judgment.result === "write") ledger.seal(judgment.draft);
  return { ledger, judgment };
}
function found(ledger: Ledger, fields: Record<string, FieldValue> = {}) {
  return ledger.act(keys.rita, "found", { expected: { register: 1 }, fields: {
    branch: "main", founderHandle: "@rita", recoveryKey: keys.sam.key, ...fields,
  } }, { platform: code(U.register), grants: [] });
}
function child(parent: Ledger, seq: number, ordinal: number, named: PlatformDefinition, facts: readonly Fetched[]) {
  const send = parent.entries[seq]!.entry.sends.find(send => send.n === ordinal)!;
  const seed = send.to as Seed, definition = checkedPlatformData(platform(named)!.data);
  const ledger = new Ledger(definition, `platform:${seed.kind}`);
  ledger.seal(written(judgeGenesis(ledger.state, definition, { name: scopeIdOf(seed), inc: newIncarnation(new Uint8Array(16).fill(seed.kind === "directory" ? 20 : 16)),
    to: seed, from: parent.fact(seq), n: send.n, message: send.message as Request }, {
    clock: clockOf(ledger.state, T0), bounds: PROPOSED_BOUNDS, facts, prepared: [], own: ledger.own,
    source: { entry: parent.entries[seq]!.entry, under: parent.under }, platform: code(named),
  })));
  return ledger;
}
function take(target: Ledger, named: PlatformDefinition, from: Ledger, seq: number, ordinal: number, facts: readonly Fetched[] = []) {
  const entry = from.entries[seq]!.entry, send = entry.sends.find(send => send.n === ordinal)!;
  const of = send.message.class === "result" ? send.message.of : null;
  const judgment = judgeDelivery(target.state, target.definition, { to: send.to, from: factRefOf(entry), n: ordinal, message: send.message }, {
    clock: clockOf(target.state, target.now), bounds: target.bounds, facts, prepared: [], own: target.own,
    source: { entry, under: from.under }, origin: of ? target.entries[of.from.seq]!.entry : null, platform: code(named),
  });
  target.seal(written(judgment));
}

test("unpublished native versions validate with complete rules and keep every named repository refusal surface", () => {
  for (const named of [U.register, U.directory, U.destination]) {
    const native = platform(named)!;
    expect(runnable(checkedPlatformData(native.data), native.rules)).toBe(true);
  }
  const destination = platform(U.destination)!.data, directory = platform(U.directory)!.data;
  expect(destination.items["branch"]!.states["unpublished"]).toEqual({ final: false });
  expect(destination.items["branch"]!.values["repository"]!.required).toBe(false);
  expect(directory.items["repository"]!.values["repository"]!.required).toBe(false);
  for (const name of ["read-token", "certify-rules-tree"]) expect(destination.acts[name]!.guards[0]).toEqual({ code: "has-repository", row: "G1" });
  for (const name of ["reserve", "publish-file"]) expect(destination.receives[name]!.guards[0]).toEqual({ code: "has-repository", row: "G1" });
  expect(directory.acts["bind-archive"]!.guards[0]).toEqual({ code: "has-repository", row: "G1" });
});

test("Register21 rejects an unknown host, normalizes none, and preserves the hosted creation opening", () => {
  expect(register("other").judgment).toMatchObject({ result: "refused", reason: "guard-failed", name: "host-unknown" });
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
});

test("a native unpublished found directly creates its directory, applies its result, and creates a destination with no first-head work", () => {
  const R = register("none").ledger;
  expect(found(R).result).toBe("write");
  expect(R.state.operation("1:0")).toBeNull();
  expect(R.last.sends).toHaveLength(1);
  expect(R.last.sends[0]!.message).toMatchObject({ class: "request", type: "create", body: { fields: { claim: { self: true } } } });
  const body = R.last.sends[0]!.message as Request;
  expect(Object.hasOwn((body.body as { fields: object }).fields, "repository")).toBe(false);
  const claim: FactRef = R.fact(1), facts = [{ fact: claim, entry: R.last, under: R.under }];
  const D = child(R, 1, 0, U.directory, facts);
  expect(D.last.input).toMatchObject({ type: "genesis", decision: "applied", seed: { definition: U.directory } });
  const answer = D.last.sends.find(send => send.message.class === "result")!;
  take(R, U.register, D, 0, answer.n);
  expect(R.item(1)).toMatchObject({ state: "active", refs: { directory: D.at, genesis: D.fact(0) } });
  expect(R.state.request(1, 0)?.result?.clause).toBe("applied");
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
