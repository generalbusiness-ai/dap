/** Portable CLI views and codecs shared with the browser. */
import type { FieldValue } from "@generalbusiness/dap-contract";
import { grantAction } from "@generalbusiness/dap-client";
import type { Role } from "@generalbusiness/dap-platform";
import type { Config } from "./store.ts";


// ---------------------------------------------------------------- a definition, as this command reads it

/** The parts of an act's declaration that this command reads. A platform definition's grant, `also` name or field type may be a mark, whose rule the scope runs. */
export interface ActShape {
  step: "open" | "transition" | "comment";
  on: string | null;
  grant: string | { code: string; grant?: string };
  also: Record<string, { item: string; one?: true; by?: string; code?: string; via?: { slot: string; of: string } }>
  fields: Record<string, { type?: string; code?: string; required?: boolean }>;
}
export interface DefinitionShape { name: string; genesis: string; acts: Record<string, ActShape> }

/** The CLI keeps its compact format; the client owns all declaration wording. */
export { describeActLine as describe } from "@generalbusiness/dap-client";

export { expectedOf } from "@generalbusiness/dap-client";

/**
 * A value given as `name=value`, read by the field's declared type. A list,
 * a record and a reference are read as JSON. `@handle` for a member is that
 * member of this repository's membership.
 */
export function valueOf(config: Pick<Config, "repository">, field: { type?: string } | undefined, text: string): FieldValue {
  switch (field?.type) {
    case "text": case "digest": case "time": case "enum": case "commit": case "tree": return text;
    case "int": case "item": return /^-?\d+$/.test(text) ? Number(text) : text;
    case "bool": return text === "true" ? true : text === "false" ? false : text;
    case "member":
      if (text.startsWith("@") && config.repository) return { membership: config.repository.membership, member: text } as unknown as FieldValue;
  }
  try {
    return JSON.parse(text) as FieldValue;
  } catch {
    return text;
  }
}

/** Compatibility names for the public client's sole person-invitation parser. */
export { INVITATION_LINK as LINK, invitationOf as linkOf } from "@generalbusiness/dap-client";
export type { InvitationLink as Link } from "@generalbusiness/dap-client";

/** A caller's role in membership, the actions that role holds, and the caller's handle. */
export interface Standing { role: Role; actions: readonly string[]; handle: string }

/**
 * The acts of a definition that a caller may sign now: each whose grant
 * action the caller's role holds, and each that a rule decides, which is
 * always listed. The genesis act is no act on a scope that exists.
 * `hidden`: how many need an action the role does not hold. The scope can
 * still refuse a listed act on its guards or its state.
 */
export function heldActs(shape: DefinitionShape, held: Standing | null): { acts: [kind: string, act: ActShape][]; hidden: number } {
  const acts: [string, ActShape][] = [];
  let hidden = 0;
  for (const [kind, act] of Object.entries(shape.acts)) {
    if (kind === shape.genesis) continue;
    const action = grantAction(act);
    if (typeof act.grant !== "string" || (action !== null && held?.actions.includes(action))) acts.push([kind, act]);
    else hidden++;
  }
  return { acts, hidden };
}
