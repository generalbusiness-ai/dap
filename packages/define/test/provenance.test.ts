import { expect, test } from "vitest";
import { canonicalize } from "@generalbusiness/dap-bytes";
import { applicationJson } from "../../platform/src/application-codec/application-json.ts";
import { compile, define, extend, grants, item, live, normalize, open } from "../src/index.ts";

const grant = grants({ create: "provenance.create" });
const root = item("root", { states: { ready: live } });
const base = define({ name: "base", genesis: "establish", items: [root], acts: { establish: open(root, grant.create) } });

test("compile emits additive provenance without changing definition or existing result bytes", () => {
  const parent = compile(base);
  const child = { ...parent.definition, name: "child", acts: { ...parent.definition.acts, annotate: { ...parent.definition.acts.establish, step: "comment" as const, on: null } } };
  const bytes = canonicalize(child), declared = extend(parent, child), built = compile(normalize(declared));
  expect(built.provenance).toEqual({ parent: parent.digest, added: { items: [], acts: ["annotate"], receives: [], timed: [], rules: [] } });
  expect(canonicalize(built.definition)).toBe(bytes);
  expect(applicationJson(built.definition, 256 * 1024)).toBe(bytes);
  expect(Object.getOwnPropertySymbols(declared)).toEqual([]);
  expect(canonicalize(declared)).not.toContain("parent");
  expect(Object.keys(parent)).toEqual(["definition", "digest", "findings", "validation", "refusals"]);
});
test("compile refuses a later replacement of an inherited form", () => {
  const parent = compile(base), child = { ...parent.definition, name: "child", acts: { ...parent.definition.acts } };
  extend(parent, child);
  child.acts.establish = { ...child.acts.establish, grant: grant.create, guards: [{ state: ["missing"] }] };
  expect(() => compile(child)).toThrow("cannot replace its parent's acts.establish");
});
