/** The native workspace predicate, shared by validation, commit and replay.
 * Item-form holds alone create no workspace. Only a listed hold@1 guard
 * or effect enables the instance/token steps that staging requires. */
import type { ValidDefinition } from "../validate/index.ts";

export const hasWorkspace = (definition: Pick<ValidDefinition, "declared" | "underived">): boolean =>
  definition.declared.capabilities.some(c => c.name === "hold" && c.version === 1)
  && definition.underived.some(u => u.capability === "hold@1" && (u.form === "guard" || u.form === "effect"));
