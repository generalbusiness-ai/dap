/** Portable CLI views and codecs shared with the browser. */
import type { FactRef, FieldValue, Item } from "@generalbusiness/dap-contract";
import { unb64url } from "@generalbusiness/dap-bytes";
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

const typeName = (field: { type?: string; code?: string }): string => field.type === "code" || field.type === undefined ? `${field.code ?? "code"} (rule)` : field.type;
const fieldsLine = (act: ActShape): string => Object.entries(act.fields).map(([name, field]) => `${name}${field.required ? "" : "?"}:${typeName(field)}`).join(" ") || "none";
const grantName = (act: ActShape): string | null => (typeof act.grant === "string" ? act.grant : act.grant.grant ?? null);

/**
 * One line about an act, from its declaration. The definition format has no
 * text that describes an act, so the line is made from what the declaration
 * states: its step, its item and what may sign it.
 */
export function describe(kind: string, act: ActShape): string {
  const what = act.step === "open" ? `opens a ${act.on}` : act.step === "transition" ? `moves a ${act.on}` : act.on === null ? "comments on no item" : `comments on a ${act.on}`;
  const who = typeof act.grant === "string" ? `needs ${act.grant}` : `the rule ${act.grant.code} decides who may sign${act.grant.grant ? `, with ${act.grant.grant}` : ""}`;
  return `${kind}: ${what}; ${who}. Fields: ${fieldsLine(act)}.`;
}

/**
 * The revision of each item the act names, as the scope's summary has them
 * now: the target for a transition, the one item of a type, and an item a
 * field names. A name that a rule selects has no key: the scope resolves it.
 * The scope checks every revision again and refuses one that moved.
 */
export function expectedOf(act: ActShape, items: readonly Item[], target: number | null, fields: Record<string, FieldValue>): Record<string, number> {
  const expected: Record<string, number> = {};
  const revision = (id: number | null | undefined) => items.find((item) => item.id === id)?.revision;
  if (act.step === "transition" && target !== null) {
    const at = revision(target);
    if (at !== undefined) expected["on"] = at;
  }
  const bound = new Map<string, Item | null>();
  const subject = (name: string): Item | null => {
    if (bound.has(name)) return bound.get(name)!;
    if (name === "on") return items.find((item) => item.id === target) ?? null;
    const rule = act.also[name.replace(/^also\./, "")];
    if (!rule || rule.code !== undefined) return null;
    bound.set(name, null);
    const via = rule.via ? subject(rule.via.of)?.refs[rule.via.slot] : undefined;
    const id = typeof via === "number" ? via : via && typeof via === "object" && "seq" in via ? (via as FactRef).seq : undefined;
    const item = rule.one ? items.find((item) => item.type === rule.item) : rule.by !== undefined && typeof fields[rule.by] === "number" ? items.find((item) => item.id === fields[rule.by!]) : items.find((item) => item.id === id);
    bound.set(name, item ?? null); return item ?? null;
  };
  for (const [name, rule] of Object.entries(act.also)) {
    if (rule.code !== undefined) continue;
    const item = subject(name);
    if (item) expected[name] = item.revision;
  }
  return expected;
}

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
    const action = grantName(act);
    if (typeof act.grant !== "string" || (action !== null && held?.actions.includes(action))) acts.push([kind, act]);
    else hidden++;
  }
  return { acts, hidden };
}
