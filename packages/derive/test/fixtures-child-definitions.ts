/** Real digest-addressed made-up declarations; no registry or provider. */
import { PROPOSED_BOUNDS, type Digest } from "@generalbusiness/dap-contract";
import { validateDefinition } from "../src/index.ts";
import { valid } from "./fixtures.ts";
import { childDeclaration } from "./definition-corpus/child-definitions-data.ts";

function declaration(name: string, children: readonly Digest[], whole = false) {
  return valid(validateDefinition(childDeclaration(name, children, whole), PROPOSED_BOUNDS));
}

export function childDefinitions(whole = true) {
  const leaf = declaration("fixture-leaf", []), extra = declaration("fixture-extra", []);
  const branch = declaration("fixture-branch", [leaf.digest], true);
  const root = declaration("fixture-root", [branch.digest, leaf.digest, branch.digest], whole);
  return { root, branch, leaf, extra };
}
