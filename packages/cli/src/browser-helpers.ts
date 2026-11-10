/** Portable CLI views and codecs shared with the browser. */
import type { FieldValue } from "@generalbusiness/dap-contract";
import { unb64url } from "@generalbusiness/dap-bytes";
import { grantAction } from "@generalbusiness/dap-client";
import type { Role } from "@generalbusiness/dap-platform";
import type { Config, Repository } from "./store.ts";


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

/** What an invitation link carries. Its secret is the invitation's, which `join` presents once; it is no signing key. */
/** `definition`: the version of membership that the invitation is in. A link made before it was carried names none. */
/** What an invitation link holds: the service, the repository's scopes, the invitation and its secret, the handle, and membership's version. */
export interface Link { v: 1; service: string; repository: Omit<Repository, "inbox">; invitation: number; secret: string; handle: string; definition?: string }
export const LINK = "artroom-invite:";

/** The invitation that a link from `dap invite` holds, or null when the text is no such link. */
export function linkOf(text: string): Link | null {
  if (!text.startsWith(LINK)) return null;
  try {
    const bytes = unb64url(text.slice(LINK.length));
    const link = bytes && (JSON.parse(new TextDecoder().decode(bytes)) as Link);
    return link && link.v === 1 && typeof link.secret === "string" && Number.isSafeInteger(link.invitation) ? link : null;
  } catch {
    return null;
  }
}

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
