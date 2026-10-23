import { addCounterCitation, scenarioParent } from "./definition-corpus-data.ts";
import { emptyPackageComposition } from "@generalbusiness/artroom-package-graph";
/** Real native Counter scenarios; only the final test's verifier reports are
 * deliberately faulted, to show the scenario cannot hide failed replay. */
import { mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test, vi } from "vitest";
import type { DeclaredDefinition, FactRef, FieldValue, SignedIntent } from "@generalbusiness/dap-contract";
import { canonicalize, definitionDigest } from "@generalbusiness/artroom-bytes";
import { packApplication, secretSigner, signedIntent } from "@generalbusiness/artroom-client";
import { packApplication2, readApplicationProjection } from "@generalbusiness/artroom-bytes/application-v2";
import { devicePackageFixture as deviceCommandFixture } from "../../derive/test/fixtures-device-command.ts";
import { LocalApplicationScope } from "../src/application-local.ts";
import { ApplicationScenarioError, openApplicationScenario, runApplicationScenario, supportsLocalSqlite } from "../src/application-scenarios.ts";

async function packet(withCitation = false, withParent = false) {
  const declaration: DeclaredDefinition = JSON.parse(await readFile(new URL("../../../apps/counter/definition.json", import.meta.url), "utf8"));
  // This one fixture augments the real Counter with a comment that carries a
  // typed local fact; it is not a proposed Counter application change.
  if (withCitation) addCounterCitation(declaration);
  const id = definitionDigest(declaration);
  const parent = scenarioParent(id);
  const parentId = definitionDigest(parent);
  return packApplication({ name: "ai.generalbusiness.counter", version: "0.1.0", semantic: {
    v: 1, entry: withParent ? parentId : id, definitions: [{ id, bytes: canonicalize(declaration) }, ...(withParent ? [{ id: parentId, bytes: canonicalize(parent) }] : [])], host: { execution: "recorded-do", profiles: ["restricted@1"] }, capabilities: [], roles: {}, projections: {}, predecessor: null,
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

test("a checked development session retains its native scope until its owner closes it", async () => {
  const packed = await packet(), input = scenario(); input.actors.agent.principal = "controller";
  const session = await openApplicationScenario(packed, input);
  try {
    expect(session.result.replay.report).toMatchObject({ result: "consistent", target: { seq: 2 } });
    expect(session.time).toBe("2026-10-18T12:01:00Z");
    const actor = session.actors.find(actor => actor.name === "controller")!;
    expect(actor.actions).toEqual(["counting.control"]);
    expect(session.actors.find(actor => actor.name === "agent")).toMatchObject({ actions: ["counting.join"], principal: { member: "@controller" } });
    const signer = secretSigner(new Uint8Array(Buffer.from(actor.seed, "hex")));
    const signed = await signedIntent(signer, { to: session.scope.at, kind: "reset", on: 1, expected: { on: session.scope.state.item(1)!.revision }, fields: { generation: 1 } }, { now: Date.parse(session.time) });
    expect(await session.scope.submit(signed)).toMatchObject({ answer: "accepted" });
    expect((await session.scope.replay()).report).toMatchObject({ result: "consistent", target: { seq: 3 } });
  } finally { session.scope.close(); }
  expect(() => session.scope.state).toThrow("closed");
  const empty = scenario(); empty.steps = [{ advance: "2026-10-18T12:01:00Z" }];
  expect(await refused(() => openApplicationScenario(packed, empty))).toBeInstanceOf(ApplicationScenarioError);
});

// Six separately launched CLI processes share this finite functional-test budget.
test("the actual check bin refuses vacuous scenarios and preserves explicit answer and state witnesses", async () => {
  const root = await realpath(await mkdtemp(join(tmpdir(), "dap-scenario-check-")));
  const packed = await packet(), bin = fileURLToPath(new URL("../bin/dap.js", import.meta.url));
  try {
    await writeFile(join(root, "definition.json"), packed.package.semantic.definitions[0]!.bytes);
    await writeFile(join(root, "index.html"), "<!doctype html><title>TEST scenario fixture</title>");
    await writeFile(join(root, "dap.application.json"), JSON.stringify({ v: 1, name: "test.example.scenarios", version: "0.1.0", entry: "definition.json", definitions: ["definition.json"],
      host: { execution: "recorded-do", profiles: ["restricted@1"] }, capabilities: [], projections: {}, roles: {}, predecessor: null,
      presentation: { entry: "index.html", assets: [{ path: "index.html", file: "index.html", mediaType: "text/html" }], descriptions: {} }, scenarios: ["scenario.json"] }));
    const advance = { advance: "2026-10-18T12:01:00Z" }, sign = { sign: { actor: "controller", kind: "initialize" }, save: "unsent" };
    const assertion = { assert: { item: 0, values: { target: 10 } } };
    for (const [steps, meaningful] of [
      [[advance], false], [[sign], false],
      [[scenario().steps[0]], true], [[assertion], true], [[advance, assertion], true], [[sign, assertion], true],
    ] as const) {
      const input = scenario(); input.steps = steps;
      await writeFile(join(root, "scenario.json"), JSON.stringify(input));
      const run = spawnSync(process.execPath, [bin, "check", root], { cwd: tmpdir(), encoding: "utf8", timeout: 30_000, env: { ...process.env, DAP_HOME: "", ARTROOM_HOME: "" } });
      expect(run.error).toBeUndefined();
      if (meaningful) {
        expect([run.status, run.stderr]).toEqual([0, ""]);
        expect(run.stdout).toContain("native replay consistent");
      } else {
        expect([run.status, run.stdout]).toEqual([1, ""]);
        expect(run.stderr).toContain("Each scenario needs an expected act or retry answer, or a nonempty state assertion.");
      }
    }
  } finally { await rm(root, { recursive: true, force: true }); }
}, 30_000);

test("data scenarios judge explicit grants, reuse saved signatures, assert native state and require replay", async () => {
  const input = scenario(); input.actors.agent.principal = "controller"; input.actors.outsider.principal = "controller";
  const submit = LocalApplicationScope.prototype.submit; let authority: unknown;
  const spy = vi.spyOn(LocalApplicationScope.prototype, "submit").mockImplementation(async function (this: LocalApplicationScope, signed, beside) {
    const answer = await submit.call(this, signed, beside);
    if (signed.intent.kind === "join" && answer.answer === "accepted") {
      const page = await this.source.page(this.at.scope, answer.receipt.fact.seq, { entries: 1, bytes: 65536 });
      if (page.ok) authority = JSON.parse(page.page.entries[0]!.bytes).input.authority;
    }
    return answer;
  });
  try {
    const first = await runApplicationScenario(await packet(), input);
    expect(first).toMatchObject({ name: "counter-standard", steps: 8, authority: "scripted-test-grants", replay: { why: null, report: { mode: "replay", result: "consistent", target: { seq: 2 } } } });
    expect(first.replay.report.trusts.join(" ")).toContain("authority");
    expect(authority).toMatchObject([{ subject: { member: "@agent" }, principal: { member: "@controller" }, actions: ["counting.join"] }]);
  } finally { spy.mockRestore(); }
});

test("a scenario selects only a verified closure definition as its explicit local root", async () => {
  const packed = await packet(false, true), counter = packed.package.semantic.definitions.find(part => part.id !== packed.package.semantic.entry)!.id;
  const input = scenario(); input.definition = counter;
  const result = await runApplicationScenario(packed, input).then(result => result, error => error);
  expect(result).toMatchObject({ definition: counter, replay: { why: null, report: { result: "consistent", target: { seq: 2 } } } });
  expect(await refused(() => runApplicationScenario(packed, scenario()))).toBeInstanceOf(ApplicationScenarioError);
  for (const definition of [null, {}, "latest", `sha256:${"f".repeat(64)}`]) {
    const bad = scenario(); bad.definition = definition;
    expect(await refused(() => runApplicationScenario(packed, bad))).toBeInstanceOf(ApplicationScenarioError);
  }
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
    value => { value.actors.agent.principal = "missing"; },
    value => { value.actors.agent.principal = null; },
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

// Invariant: local native preparations require an explicit scripted grant;
// its anchor stays visible, while the actual child and answer are replayed.
// Genuine issuance and Membership are covered separately by the native
// Worker witness in scope/test/device-command-install.test.ts.
test("scripted-parent device scenarios keep their anchor explicit and execute native owner preparations once", async () => {
  const id = definitionDigest(deviceCommandFixture);
  const packed = await packApplication2({ name: "test.local-device", version: "1", semantic: {
    ...emptyPackageComposition(), v: 2, entry: id, definitions: [{ id, bytes: canonicalize(deviceCommandFixture) }],
    host: { execution: "recorded-do", profiles: ["restricted@1"] }, capabilities: [{ name: "device-command@1", bounds: { kinds: ["heater"], owners: 1 } }],
    roles: { operator: ["command", "start"] }, predecessor: null, projections: { root: readApplicationProjection({ v: 1, definition: id, revision: "revision",
      sources: { root: { item: "root", read: "one", states: ["ready"], limit: 1, fields: {} } } }) },
  }, presentation: { v: 2, entry: "index.html", assets: [{ path: "index.html", mediaType: "text/html", bytes: "VEVTVA" }], descriptions: {}, views: {}, resources: {} } }, secretSigner(new Uint8Array(32).fill(83)));
  const position = (name: string) => ({ $position: name }), revision = (name: string) => ({ $revision: position(name) });
  const prepare = (actor: string, command: string, name?: string) => ({ prepare: { actor, capability: "device-command@1", step: "answer",
    fields: { command: { $fact: command }, outcome: "confirmed", description: "TEST owner answer" } },
    expect: name ? { answer: "refused", reason: "capability-refused", name } : { answer: "accepted" },
  });
  const input = { v: 1, name: "device-local", time: "2026-10-19T12:00:00Z", deviceOwner: "owner", actors: {
    operator: { seed: "11".repeat(32), member: "@operator", actions: ["command", "start"] },
    owner: { seed: "22".repeat(32), member: "@device-owner", actions: [] },
  }, founding: { actor: "operator", fields: {} }, steps: [
    { act: { actor: "operator", kind: "commission", fields: { kind: "heater" } }, expect: { answer: "accepted" }, save: "heater" },
    { act: { actor: "operator", kind: "command", on: position("heater"), expected: { on: revision("heater") }, fields: { target: "on", level: 80 } }, expect: { answer: "accepted" }, save: "command" },
    { record: { capability: "device-command@1", kind: "command", key: [position("command")], state: "open", values: { decided: 0 } } },
    { act: { actor: "operator", kind: "report", on: position("heater"), expected: { on: revision("heater") }, fields: { reported: 20 } }, expect: { answer: "accepted" } },
    prepare("operator", "command", "device-command-not-owner"), prepare("owner", "heater", "device-command-unknown"),
    { ...prepare("owner", "command"), save: "answer" }, { retry: "answer", expect: { answer: "accepted" } },
    { record: { capability: "device-command@1", kind: "command", key: [position("command")], state: "confirmed", values: { decided: 1 } } },
    { assert: { item: position("heater"), values: { target: "on", reported: 20, outcome: "confirmed" }, refs: { targetAt: position("command"), outcomeAt: position("answer") } } },
    prepare("owner", "command", "device-command-closed"),
    { act: { actor: "operator", kind: "commission", fields: { kind: "fan" } }, expect: { answer: "accepted" }, save: "fan" },
    { act: { actor: "operator", kind: "command", on: position("fan"), expected: { on: revision("fan") }, fields: { target: "on", level: 50 } }, expect: { answer: "refused", reason: "capability-refused", name: "device-kind-ungranted" } },
  ] };
  const result = await runApplicationScenario(packed, input);
  expect(result).toMatchObject({ preparations: 1, ownerRecords: [], capabilityGrant: { authority: "scripted-parent-creation", nativeIssuanceWitness: "packages/scope/test/device-command-install.test.ts" } });
  expect(result.capabilityGrant!.anchors).toHaveLength(2);
  expect(result.replay.report.anchors).toHaveLength(2);
  expect(result.replay.report.result).toBe("consistent");
  const { deviceOwner: _owner, ...ungranted } = input;
  const noGrant = await runApplicationScenario(packed, { ...ungranted, steps: [input.steps[0], input.steps[1],
    { record: { capability: "device-command@1", kind: "command", key: [position("command")], absent: true } },
    prepare("owner", "command", "device-command-ungranted"),
  ] });
  expect(noGrant.capabilityGrant).toBeNull();
  expect(noGrant.preparations).toBe(0);
  expect(noGrant.replay.report.anchors).toEqual([]);
});
