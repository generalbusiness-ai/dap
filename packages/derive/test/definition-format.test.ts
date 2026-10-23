import { expect, test } from "vitest";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { canonicalBytes, definitionDigest } from "@generalbusiness/dap-bytes";
import { PROFILES, validateDefinition, type Validation } from "../src/index.ts";
import { small, ticket } from "./definition-corpus/fixture-data.ts";

const problems = (result: Validation) => {
  expect(result.ok).toBe(false);
  return result.ok ? [] : result.problems;
};

// The binding keeps the original declaration object, bytes and digest. It
// does not add defaults or convert the declaration into a new format.
test("format 1 preserves the declaration's identity, bytes and digest", () => {
  const declaration = structuredClone(small);
  const before = canonicalBytes(declaration);
  const checked = validateDefinition(declaration, PROPOSED_BOUNDS);
  expect(checked.ok).toBe(true);
  if (!checked.ok) return;
  expect(checked.definition.declared).toBe(declaration);
  expect(checked.definition.digest).toBe(definitionDigest(declaration));
  expect(Object.hasOwn(declaration, "level")).toBe(false);
  expect(Object.hasOwn(declaration, "capacity")).toBe(false);
  expect(canonicalBytes(declaration)).toEqual(before);
});

test("unknown formats refuse with their actual name and never invoke a profile", () => {
  for (const format of ["artroom-definition-2", "future\nformat"]) {
    const checked = validateDefinition({ ...ticket, format }, PROPOSED_BOUNDS, {
      "restricted@1": { admit: () => { throw new Error("unknown format reached format-1 checks"); } },
    });
    expect(problems(checked)).toEqual([{
      code: "unsupported-definition", path: "format",
      message: `definition format ${JSON.stringify(format)} is not supported`,
    }]);
  }
});

test("missing outcome domains refuse before any input access", () => {
  const input = new Proxy({}, {
    ownKeys: () => { throw new Error("input keys were read"); },
    getPrototypeOf: () => { throw new Error("input prototype was read"); },
  });
  expect(problems(validateDefinition(input, PROPOSED_BOUNDS, undefined, { outcomeValues: null }))).toEqual([{
    code: "shape", path: "outcomes",
    message: "an owner with an evidence value reader has no static domain declaration for this pinned version and kind",
  }]);
});

test("top-shape refusal precedes canonicalization and the format accessor", () => {
  const input = { ...small, unexpected: true };
  Object.defineProperty(input, "format", { enumerable: true, get: () => { throw new Error("format was read"); } });
  expect(problems(validateDefinition(input, PROPOSED_BOUNDS))).toEqual([{
    code: "shape", path: "unexpected", message: "is not a field or form the contract defines",
  }]);
});

test("the canonical-byte ceiling precedes unsupported-format dispatch", () => {
  const format = "artroom-definition-2";
  const input = { ...small, format };
  const bytes = canonicalBytes(input).length;
  let formatReads = 0;
  Object.defineProperty(input, "format", { enumerable: true, get: () => { formatReads++; return format; } });
  expect(problems(validateDefinition(input, { ...PROPOSED_BOUNDS, definitionBytes: bytes - 1 }))).toEqual([{
    code: "bound", path: "", message: `has ${bytes} canonical bytes; at most ${bytes - 1}`,
  }]);
  expect(formatReads).toBe(1);
});

test("dispatch reuses the header instead of reading or canonicalizing it again", () => {
  for (const format of ["artroom-definition-1", "artroom-definition-2"]) {
    const input = { ...small };
    let formatReads = 0;
    Object.defineProperty(input, "format", { enumerable: true, get: () => { formatReads++; return format; } });
    const checked = validateDefinition(input, PROPOSED_BOUNDS);
    expect(checked.ok).toBe(format === "artroom-definition-1");
    // One read in the existing byte preamble, one in dispatch, and only a
    // valid definition's final digest reads it a third time.
    expect(formatReads).toBe(format === "artroom-definition-1" ? 3 : 2);
  }
});

test("missing and malformed format values retain their shape diagnostics", () => {
  const missing: Record<string, unknown> = { ...small };
  delete missing["format"];
  expect(problems(validateDefinition(missing, PROPOSED_BOUNDS))).toEqual([{
    code: "shape", path: "format", message: "is missing",
  }]);
  for (const format of [null, 1, false, {}, [], undefined, ""]) {
    expect(problems(validateDefinition({ ...small, format }, PROPOSED_BOUNDS))).toEqual([{
      code: "shape", path: "format", message: "must be artroom-definition-1",
    }]);
  }
  expect(problems(validateDefinition({ ...small, format: 1, name: "platform:unexpected" }, PROPOSED_BOUNDS))).toEqual([
    { code: "shape", path: "format", message: "must be artroom-definition-1" },
    { code: "shape", path: "name", message: "a declared definition's name does not begin with platform:" },
  ]);
});

test("profiles and options keep their existing interpretation and access counts", () => {
  const baseline = validateDefinition(ticket, PROPOSED_BOUNDS);
  const seen: string[] = [];
  const checked = validateDefinition(ticket, PROPOSED_BOUNDS, {
    "restricted@1": { ...PROFILES["restricted@1"], admit: source => { seen.push(source); return null; } },
  });
  expect(checked).toEqual(baseline);
  expect(seen).toEqual(Object.values(ticket.rules));
  expect(seen.length).toBeGreaterThan(0);

  let platformReads = 0, outcomeReads = 0;
  const withOptions = validateDefinition(small, PROPOSED_BOUNDS, undefined, {
    get platform() { platformReads++; return false; },
    get outcomeValues() { outcomeReads++; return {}; },
  });
  expect(withOptions).toEqual(validateDefinition(small, PROPOSED_BOUNDS));
  expect(platformReads).toBe(1);
  expect(outcomeReads).toBe(2);
});

test("a noncanonical format-1 declaration keeps the final canonical refusal", () => {
  expect(problems(validateDefinition({ ...small, name: "\ud800" }, PROPOSED_BOUNDS))).toEqual([{
    code: "shape", path: "", message: "has no canonical bytes",
  }]);
});
