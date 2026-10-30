/** The native workspace predicate, shared by validation, commit and replay.
 * Item-form holds alone create no workspace. Only a listed hold guard
 * or effect enables the instance/token steps that staging requires. */
import type { CapabilityName } from "@generalbusiness/dap-contract";
import type { ValidDefinition } from "../validate/index.ts";

type WorkspaceDefinition = Pick<ValidDefinition, "declared" | "underived">;

/** The exact listed family; an unsupported version is never workspace authority. */
export const workspaceOwner = (definition: Pick<ValidDefinition, "declared">): "hold@1" | "hold@2" | null => {
  const listed = definition.declared.capabilities.find(c => c.name === "hold");
  return listed?.version === 1 ? "hold@1" : listed?.version === 2 ? "hold@2" : null;
};

/** Default remains the original v1 predicate for its public callers. */
export const hasWorkspace = (definition: WorkspaceDefinition, owner: CapabilityName = "hold@1"): boolean =>
  workspaceOwner(definition) === owner
  && definition.underived.some(u => u.capability === owner && (u.form === "guard" || u.form === "effect"));

export const hasAnyWorkspace = (definition: WorkspaceDefinition): boolean => {
  const owner = workspaceOwner(definition);
  return owner !== null && hasWorkspace(definition, owner);
};
