/** Actual Grow declarations with their existing native validation. */
import { expect } from "vitest";
import { PROPOSED_BOUNDS, type DeclaredDefinition, type Digest } from "@generalbusiness/dap-contract";
import type { PackageGraphInput } from "@generalbusiness/dap-package-graph";
import { validateDefinition } from "../src/index.ts";
import { RULE_PROFILES } from "../src/rule/index.ts";
import { growData, preFailureRelationData } from "./definition-corpus/package-graph-data.ts";

export function checkedGraph(input: PackageGraphInput, options: { nativeValidation?: boolean } = {}): PackageGraphInput {
  for (const part of options.nativeValidation === false ? [] : input.definitions) {
    const native = validateDefinition(part.definition, PROPOSED_BOUNDS, RULE_PROFILES);
    expect(native.ok ? [] : native.problems).toEqual([]);
  }
  return input;
}

export function grow(change: (site: DeclaredDefinition, room: DeclaredDefinition) => void = () => {}, peerPin?: Digest, extra: readonly DeclaredDefinition[] = [], options: { nativeValidation?: boolean } = {}): PackageGraphInput {
  return checkedGraph(growData(change, peerPin, extra), options);
}

export function preFailureRelation(failedFinal: boolean, copies = 9): PackageGraphInput {
  return checkedGraph(preFailureRelationData(failedFinal, copies));
}
