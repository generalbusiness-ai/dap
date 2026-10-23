import { expect, test } from "vitest";
import { definitionDigest } from "@generalbusiness/dap-bytes";
import { created, notesDefinition } from "@generalbusiness/dap-derive/testing";
import { MemorySource, verify } from "../src/index.ts";
import { Gate } from "./staging.ts";
import { served } from "./world.ts";

const unknownFormat = "test-unsupported-definition-format";

// This synthetic journal producer intentionally bypasses validation. Its
// authority is the existing fixture stand-in, trusted explicitly as recorded.
// It proves replay refusal of retained bytes, not native genesis admission.
test("a well-hashed retained declaration names its unsupported format at genesis", async () => {
  const declared = structuredClone(notesDefinition.declared);
  Reflect.set(declared, "format", unknownFormat);
  const unchecked = { ...notesDefinition, declared, digest: definitionDigest(declared) };
  const ledger = created(unchecked, {}, "unsupported-format");
  const history = served(ledger, [ledger]);
  expect(history.retained).toContainEqual(expect.objectContaining({ kind: "definition", digest: unchecked.digest }));
  const result = await verify(new MemorySource([history]), { mode: "replay", scope: ledger.at.scope, grants: "as-recorded" });
  expect([result.report.result, result.report.at?.seq]).toEqual(["unsupported-definition", 0]);
  expect(result.why).toContain("the pinned definition does not pass validation under the bounds given: unsupported-definition at format");
  expect(result.why).toContain(unknownFormat);
  expect(result.report.coverage).toEqual([]);
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
});
