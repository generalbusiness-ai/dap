/** Real digest-addressed made-up declarations; no registry or provider. */
import type { Digest } from "@generalbusiness/dap-contract";
import { notesDefinition, variant } from "./fixtures.ts";

function declaration(name: string, children: readonly Digest[], whole = false) {
  return variant(notesDefinition.declared, d => {
    d.name = name;
    if (whole) d.capacity = { name: "whole-scope", version: 1 };
    d.acts.children = { ...structuredClone(d.acts.vouch), presents: {}, guards: [], effects: [], sends: children.map(definition => ({ create: { kind: "lane", definition, fields: {}, result: {} } })) };
  });
}

export function childDefinitions(whole = true) {
  const leaf = declaration("fixture-leaf", []), extra = declaration("fixture-extra", []);
  const branch = declaration("fixture-branch", [leaf.digest], true);
  const root = declaration("fixture-root", [branch.digest, leaf.digest, branch.digest], whole);
  return { root, branch, leaf, extra };
}
