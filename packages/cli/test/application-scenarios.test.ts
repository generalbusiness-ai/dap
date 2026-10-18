/** Real native Counter scenarios; only the final test's verifier reports are
 * deliberately faulted, to show the scenario cannot hide failed replay. */
import { readFile } from "node:fs/promises";
import { expect, test, vi } from "vitest";
import type { DeclaredDefinition, FactRef, FieldValue, SignedIntent } from "@generalbusiness/dap-contract";
import { canonicalize, definitionDigest } from "@generalbusiness/artroom-bytes";
import { packApplication, secretSigner } from "@generalbusiness/artroom-client";
import { LocalApplicationScope } from "../src/application-local.ts";
import { ApplicationScenarioError, runApplicationScenario, supportsLocalSqlite } from "../src/application-scenarios.ts";

async function packet(withCitation = false) {
  const declaration: DeclaredDefinition = JSON.parse(await readFile(new URL("../../../apps/counter/definition.json", import.meta.url), "utf8"));
  // This one fixture augments the real Counter with a comment that carries a
  // typed local fact; it is not a proposed Counter application change.
  if (withCitation) declaration.acts["cite"] = { step: "comment", on: null, grant: "counting.control", also: {}, fields: { source: { type: "fact", kind: ["initialize"], under: declaration.name, required: true } }, guards: [], effects: [], sends: [], attention: [] };
  const id = definitionDigest(declaration);
  return packApplication({ name: "ai.generalbusiness.counter", version: "0.1.0", semantic: {
    v: 1, entry: id, definitions: [{ id, bytes: canonicalize(declaration) }], host: { execution: "recorded-do", profiles: ["restricted@1"] }, capabilities: [], roles: {}, projections: {}, predecessor: null,
  }, presentation: { v: 1, entry: "index.html", assets: [{ path: "index.html", mediaType: "text/html", bytes: "" }], descriptions: {} } }, secretSigner(new Uint8Array(32).fill(41)));
}
function scenario(): any {
  return { v: 1, name: "counter-standard", time: "2026-10-18T12:00:00Z", actors: {
    controller: { seed: "01".repeat(32), member: "@controller", actions: ["counting.control"] },
    agent: { seed: "02".repeat(32), member: "@agent", actions: ["counting.join"] },
    outsider: { seed: "03".repeat(32), member: "@outsider", actions: [] },
  }, founding: { actor: "controller", fields: { opener: { $member: "controller" }, target: 10 } }, steps: [
    { act: { actor: "controller", kind: "initialize", expected: { configuration: { $revision: 0 } } }, expect: { answer: "accepted" }, save: "initialize" },
    { retry: "initialize", expect: { answer: "accepted" } },
    { assert: { item: 1, state: "paused", revision: 1 } },
    { act: { actor: "agent", kind: "join" }, expect: { answer: "accepted" } },
    { act: { actor: "outsider", kind: "join" }, expect: { answer: "refused", reason: "unauthorized" } },
    { assert: { item: 2, state: "joined", parties: { agent: { $member: "agent" } } } },
    { advance: "2026-10-18T12:01:00Z" },
    { assert: { item: 0, values: { target: 10 } } },
  ] };
}
const refused = (work: () => Promise<unknown>): Promise<unknown> => work().then(() => "accepted", error => error);

test("data scenarios judge explicit grants, reuse saved signatures, assert native state and require replay", async () => {
  const first = await runApplicationScenario(await packet(), scenario());
  expect(first).toMatchObject({ name: "counter-standard", steps: 8, authority: "scripted-test-grants", replay: { why: null, report: { mode: "replay", result: "consistent", target: { seq: 2 } } } });
  expect(first.replay.report.trusts.join(" ")).toContain("authority");
});

test("signing without submitting preserves old revisions and expiry for a later native judgment", async () => {
  const packed = await packet(), input = scenario(), submit = LocalApplicationScope.prototype.submit, reset: SignedIntent[] = [];
  input.steps.push(
    { sign: { actor: "controller", kind: "reset", on: 1, expected: { on: { $revision: 1 } }, fields: { generation: 1 } }, save: "old-reset" },
    { assert: { item: 1, revision: 1, values: { generation: 0 } } },
    { act: { actor: "controller", kind: "reset", on: 1, expected: { on: { $revision: 1 } }, fields: { generation: 1 } }, expect: { answer: "accepted" } },
    { advance: "2026-10-18T12:02:00Z" },
    { retry: "old-reset", expect: { answer: "refused", reason: "revision-moved" } },
    { assert: { item: 1, revision: 2, values: { generation: 1 } } },
  );
  const spy = vi.spyOn(LocalApplicationScope.prototype, "submit").mockImplementation(async function (this: LocalApplicationScope, signed, beside) {
    if (signed.intent.kind === "reset") reset.push(structuredClone(signed));
    return submit.call(this, signed, beside);
  });
  try {
    const result = await runApplicationScenario(packed, input).then(result => result, error => error);
    expect(reset).toHaveLength(2); expect(reset[1]!.intent.expected).toEqual({ on: 1 });
    expect(reset[1]!.intent.notAfter).toBe(reset[0]!.intent.notAfter);
    expect(reset[1]!.intent.idempotencyKey).not.toBe(reset[0]!.intent.idempotencyKey);
    expect(result).toMatchObject({ steps: 14, ownerRecords: [], replay: { why: null, report: { result: "consistent", target: { seq: 3 } } } });
  } finally { spy.mockRestore(); }
  const expired = scenario();
  expired.steps.push(
    { sign: { actor: "controller", kind: "reset", on: 1, expected: { on: { $revision: 1 } }, fields: { generation: 1 } }, save: "expired-reset" },
    { advance: "2026-10-18T13:00:00Z" },
    { retry: "expired-reset", expect: { answer: "refused", reason: "expired" } },
  );
  expect(await runApplicationScenario(packed, expired).then(result => result.replay.report.target.seq, error => error)).toBe(2);
});

test("a running scenario owns its expected results before signing awaits or caller edits", async () => {
  const input = scenario(), pending = runApplicationScenario(await packet(), input);
  input.steps[0].expect = { answer: "refused", reason: "unauthorized" };
  const outcome = await pending.then(() => "passed", error => error instanceof ApplicationScenarioError ? "refused" : "unexpected error");
  expect(outcome).toBe("passed");
});

test("saved facts come from accepted native receipts and owner records stay outside the journal", async () => {
  const input = scenario();
  input.steps.push({ act: { actor: "controller", kind: "cite", fields: { source: { $fact: "initialize" } } }, expect: { answer: "accepted" }, save: "citation" },
    { "owner-record": { owner: "simulator", command: { $fact: "citation" }, outcome: "unknown" } },
    { retry: "citation", expect: { answer: "accepted" } });
  const submit = LocalApplicationScope.prototype.submit;
  let initialized: FactRef | undefined, cited: FactRef | undefined, source: FieldValue | undefined;
  const spy = vi.spyOn(LocalApplicationScope.prototype, "submit").mockImplementation(async function (this: LocalApplicationScope, signed, beside) {
    const answer = await submit.call(this, signed, beside);
    if (answer.answer === "accepted" && signed.intent.kind === "initialize") initialized = answer.receipt.fact;
    if (answer.answer === "accepted" && signed.intent.kind === "cite") { cited = answer.receipt.fact; source = signed.intent.fields["source"]; }
    return answer;
  });
  try {
    const result = await runApplicationScenario(await packet(true), input);
    expect(source).toEqual(initialized); expect(cited).toBeDefined();
    expect(result.ownerRecords).toEqual([{ label: "non-native-scenario-owner", owner: "simulator", command: cited, outcome: "unknown" }]);
    expect(result.replay.report.target.seq).toBe(3); expect(result.replay.report.result).toBe("consistent");
  } finally { spy.mockRestore(); }
});

test("unaccepted or invented facts and duplicate scenario-owner outcomes cannot pass", async () => {
  const packed = await packet(true);
  const record = { "owner-record": { owner: "simulator", command: { $fact: "initialize" }, outcome: "confirmed" } };
  for (const extra of [
    [{ "owner-record": { ...record["owner-record"], command: { $fact: "missing" } } }],
    [{ "owner-record": { ...record["owner-record"], command: { at: {}, seq: 1, hash: "invented" } } }],
    [{ "owner-record": { ...record["owner-record"], outcome: "success" } }],
    [record, record],
    [{ act: { actor: "outsider", kind: "join" }, expect: { answer: "refused", reason: "unauthorized" }, save: "denied" }, { "owner-record": { ...record["owner-record"], command: { $fact: "denied" } } }],
    [{ act: { actor: "controller", kind: "cite", fields: { source: { $fact: "missing" } } }, expect: { answer: "accepted" } }],
  ]) {
    const input = scenario(); input.steps.push(...extra);
    expect(await refused(() => runApplicationScenario(packed, input))).toBeInstanceOf(ApplicationScenarioError);
  }
});

test("scenario typos, empty assertions, wrong outcomes, malformed actors and missing references cannot pass", async () => {
  const packed = await packet();
  const changes: ((value: any) => void)[] = [
    value => { value.steps[0].expect = { answer: "refused", reason: "unauthorized" }; },
    value => { value.steps[7].assert.values.target = 11; },
    value => { value.steps = [{ assert: { item: 0, values: {} } }]; },
    value => { value.steps = [{ assert: { item: 0, value: { target: 10 } } }]; },
    value => { value.steps = [{ retry: "missing", expect: { answer: "accepted" } }]; },
    value => { value.steps = [{ sign: { actor: "controller", kind: "initialize" } }]; },
    value => { value.steps = [{ sign: { actor: "controller", kind: "initialize" }, save: "later", expect: { answer: "accepted" } }]; },
    value => { value.steps.push({ sign: { actor: "controller", kind: "initialize" }, save: "initialize" }); },
    value => { value.steps.push({ sign: { actor: "controller", kind: "initialize" }, save: "unsubmitted" }, { "owner-record": { owner: "simulator", command: { $fact: "unsubmitted" }, outcome: "confirmed" } }); },
    value => { value.steps = [{ script: "return true" }]; },
    value => { value.steps[0].act.expected.configuration = { $revision: 99 }; },
    value => { value.steps[0].act.fields = null; },
    value => { value.steps[0].expect = { answer: "refused" }; },
    value => { value.actors.agent.seed = value.actors.controller.seed; },
    value => { value.actors.agent.actions = ["counting.join", "counting.join"]; },
    value => { value.founding.fields.opener = { $member: "missing" }; },
    value => { value.steps = []; },
    value => { value.steps = Array.from({ length: 257 }, () => ({ assert: { item: 0, values: { target: 10 } } })); },
  ];
  for (const change of changes) {
    const input = scenario(); change(input);
    expect(await refused(() => runApplicationScenario(packed, input))).toBeInstanceOf(ApplicationScenarioError);
  }
  expect(supportsLocalSqlite("22.0.0")).toBe(false); expect(supportsLocalSqlite("22.12.0")).toBe(false);
  expect(supportsLocalSqlite("22.13.0")).toBe(true); expect(supportsLocalSqlite("23.3.0")).toBe(false);
  expect(supportsLocalSqlite("23.4.0")).toBe(true); expect(supportsLocalSqlite("24.0.0")).toBe(true);
  expect(supportsLocalSqlite("26.12.0")).toBe(true); expect(supportsLocalSqlite("unknown")).toBe(false);
});

test("a mismatched or integrity-only verifier report cannot become a successful scenario", async () => {
  const packed = await packet(), replay = LocalApplicationScope.prototype.replay;
  for (const fault of ["mismatch", "integrity"] as const) {
    const spy = vi.spyOn(LocalApplicationScope.prototype, "replay").mockImplementation(async function (this: LocalApplicationScope) {
      const actual = await replay.call(this);
      return { ...actual, report: { ...actual.report, ...(fault === "mismatch" ? { result: "mismatch" as const } : { mode: "integrity" as const }) } };
    });
    try { expect(await refused(() => runApplicationScenario(packed, scenario()))).toBeInstanceOf(ApplicationScenarioError); }
    finally { spy.mockRestore(); }
  }
});
