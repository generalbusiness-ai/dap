import { expect, test } from "vitest";
import { canonicalize, definitionDigest } from "@generalbusiness/dap-bytes";
import { normalizeDefinition, validateDefinition } from "@generalbusiness/dap-derive";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { created, notesDefinition, valid } from "@generalbusiness/dap-derive/testing";
import { MemorySource, verify } from "../src/index.ts";
import { Gate } from "./staging.ts";
import { served, unsupportedDefinitionHistory } from "./world.ts";

const unknownFormat = "test-unsupported-definition-format";

// This synthetic journal producer changes an admitted history's retained bytes.
// Its authority is the existing fixture stand-in, trusted explicitly as recorded.
// It proves replay refusal of retained bytes, not native genesis admission.
test("a well-hashed retained declaration names its unsupported format at genesis", async () => {
  const declared = structuredClone(notesDefinition.declared);
  Reflect.set(declared, "format", unknownFormat);
  const history = unsupportedDefinitionHistory(declared, "unsupported-format");
  expect(history.retained).toContainEqual(expect.objectContaining({ kind: "definition", digest: definitionDigest(declared) }));
  const result = await verify(new MemorySource([history]), { mode: "replay", scope: history.scope.scope, grants: "as-recorded" });
  expect([result.report.result, result.report.at?.seq]).toEqual(["unsupported-definition", 0]);
  expect(result.why).toContain("the pinned definition does not pass validation under the bounds given: unsupported-definition at format");
  expect(result.why).toContain(unknownFormat);
  expect(result.report.coverage).toEqual([]);

  // Each journal pins its own exact authored bytes and digest. The fixture
  // judge allows legacy spelling; Replay's declaration front door does not.
  const canonical = normalizeDefinition(notesDefinition.declared);
  for (const redundant of [false, true]) {
    const data = structuredClone(canonical);
    if (redundant) data.acts["write"]!.guards = data.acts["write"]!.guards.map(guard => ({ ...guard, of: "on" }));
    const definition = valid(validateDefinition(data, PROPOSED_BOUNDS));
    const ledger = created(definition, {}, `retained-canonical-${redundant}`), retained = served(ledger, [ledger]);
    const before = canonicalize(retained);
    expect(retained.retained).toContainEqual({ kind: "definition", digest: definitionDigest(data), bytes: canonicalize(data) });
    const checked = await verify(new MemorySource([retained]), { mode: "replay", scope: ledger.at.scope, grants: "as-recorded" });
    expect([checked.report.result, checked.report.at?.seq ?? null]).toEqual(redundant ? ["unsupported-definition", 0] : ["consistent", null]);
    if (redundant) expect(checked.why).toContain("does not pass validation");
    expect(canonicalize(retained)).toBe(before);
  }
});

// The existing made-up platform version and rules are supplied code. Alter
// only its format after constructing the genuine in-memory fixture history.
test("caller-supplied platform data names its unsupported format at genesis", async () => {
  const gate = new Gate(() => ({ effects: [], sends: [], opens: [] }));
  const history = gate.served();
  const options = { mode: "replay", scope: gate.at.scope, anchors: gate.anchors() } as const;
  const supported = await verify(new MemorySource([history]), { ...options, platform: gate.coded() });
  expect([supported.report.result, supported.why]).toEqual(["consistent", null]);

  const declared = structuredClone(gate.definition.declared);
  Reflect.set(declared, "format", unknownFormat);
  const result = await verify(new MemorySource([history]), { ...options, platform: gate.coded(gate.rules, undefined, undefined, declared) });
  expect([result.report.result, result.report.at?.seq]).toEqual(["unsupported-definition", 0]);
  expect(result.why).toContain("is not a platform definition of that name under the bounds given");
  expect(result.why).toContain(unknownFormat);
  expect(result.report.coverage).toEqual([]);

  const canonical = normalizeDefinition(gate.definition.declared);
  const redundant = structuredClone(canonical);
  const genesis = redundant.acts[redundant.genesis]!;
  genesis.guards = [...genesis.guards, { of: "on", equals: { a: { const: 1 }, b: { const: 1 } } }];
  const normalized = normalizeDefinition(redundant);
  const historyBytes = canonicalize(history);
  const refused = await verify(new MemorySource([history]), { ...options, platform: gate.coded(gate.rules, undefined, undefined, redundant) });
  expect([refused.report.result, refused.report.at?.seq]).toEqual(["unsupported-definition", 0]);
  const accepted = await verify(new MemorySource([history]), { ...options, platform: gate.coded(gate.rules, undefined, undefined, normalized) });
  expect([accepted.report.result, accepted.why]).toEqual(["consistent", null]);
  expect(canonicalize(history)).toBe(historyBytes);
});
