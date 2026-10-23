/** Real digest-addressed raw child declarations, without validation. */
import type { Digest } from "@generalbusiness/dap-contract";
import { definitionDigest } from "@generalbusiness/artroom-bytes";
import { notes } from "./fixture-data.ts";

export function childDeclaration(name: string, children: readonly Digest[], whole = false) {
  const d = structuredClone(notes);
  {
    d.name = name;
    if (whole) d.capacity = { name: "whole-scope", version: 1 };
    d.acts["children"] = { ...structuredClone(d.acts["vouch"]!), presents: {}, guards: [], effects: [], sends: children.map(definition => ({ create: { kind: "lane", definition, fields: {}, result: {} } })) };
  }
  return d;
}

export function childDefinitionsData(whole = true) {
  const leaf = childDeclaration("fixture-leaf", []), extra = childDeclaration("fixture-extra", []);
  const branch = childDeclaration("fixture-branch", [definitionDigest(leaf)], true);
  const root = childDeclaration("fixture-root", [definitionDigest(branch), definitionDigest(leaf), definitionDigest(branch)], whole);
  return { root, branch, leaf, extra };
}
