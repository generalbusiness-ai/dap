import { expect, test } from "vitest";
import { PROPOSED_BOUNDS, type Digest } from "@generalbusiness/dap-contract";
import { canonicalize, parseStrict } from "@generalbusiness/dap-bytes";
import { namedDeclarations, validateDefinition } from "../src/index.ts";
import { childDefinitions } from "./fixtures-entry.ts";

test("opt-in birth requires the bounded transitive child closure once per digest; legacy absence stays optional", async () => {
  const { root, branch, leaf } = childDefinitions(), reads: Digest[] = [];
  const available = new Map([[branch.digest, canonicalize(branch.declared)], [leaf.digest, canonicalize(leaf.declared)]]);
  const read = async (digest: Digest) => {
    reads.push(digest);
    const bytes = available.get(digest);
    return bytes === undefined ? { ok: false as const, reason: "absent" as const } : { ok: true as const, bytes };
  };
  const validate = (bytes: string) => {
    const checked = validateDefinition(parseStrict(bytes), PROPOSED_BOUNDS);
    return checked.ok ? checked.definition : null;
  };
  const full = await namedDeclarations(root, read, validate, 2);
  expect(full.ok && full.declarations.map(declared => declared.digest).sort()).toEqual([branch.digest, leaf.digest].sort());
  expect(reads.sort()).toEqual([branch.digest, leaf.digest].sort());
  const limited = await namedDeclarations(root, read, validate, 1);
  expect(limited).toMatchObject({ ok: false, reason: "unsupported-definition", problems: [{ code: "bound" }] });
  available.delete(leaf.digest);
  const missing = await namedDeclarations(root, read, validate, 2);
  expect(missing).toMatchObject({ ok: false, reason: "unsupported-definition", problems: [{ code: "name", path: `definitions.${leaf.digest}`, message: `the required child definition ${leaf.digest} is missing` }] });
  const legacy = childDefinitions(false).root;
  const old = await namedDeclarations(legacy, read, validate, 2);
  expect(old.ok && old.declarations.map(declared => declared.digest)).toEqual([branch.digest]);
  const unsupported = async () => ({ ok: false as const, reason: "unsupported-definition" as const });
  expect(await namedDeclarations(legacy, unsupported, validate, 2)).toEqual({ ok: true, declarations: [] });
  expect(await namedDeclarations(root, async () => ({ ok: false, reason: "unavailable" }), validate, 2)).toEqual({ ok: false, reason: "unavailable" });
  expect(await namedDeclarations(root, async () => ({ ok: true, bytes: canonicalize(root.declared) }), validate, 2)).toMatchObject({ ok: false, problems: [{ code: "shape" }] });
});
