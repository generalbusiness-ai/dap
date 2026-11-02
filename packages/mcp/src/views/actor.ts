/** Display identity from the exact membership of a signed act. Missing records never become a person. */
import { canonicalize, isMemberRef } from "@generalbusiness/dap-bytes";
import type { Item, ScopeRef } from "@generalbusiness/dap-contract";
import type { ActSigner } from "./types.ts";

export function actSigner(items: readonly Item[], membership: ScopeRef, key: string): ActSigner {
  const unknown: ActSigner = { key, actor: null };
  const keys = items.filter(item => item.type === "key" && item.state === "active" && item.values["id"] === key);
  if (keys.length !== 1) return unknown;
  const members = items.filter(item => item.type === "member" && item.state === "active" && item.id === keys[0]!.refs["member"]);
  if (members.length !== 1) return unknown;
  const member = members[0]!, ref = member.parties["member"], kind = member.values["kind"], name = member.values["handle"];
  if (!isMemberRef(ref) || canonicalize(ref.membership) !== canonicalize(membership) || typeof name !== "string" || !name.length || (kind !== "person" && kind !== "agent" && kind !== "checker")) return unknown;
  if (kind !== "agent") return { key, actor: { kind, name } };
  const controller = member.parties["controller"];
  if (!isMemberRef(controller) || canonicalize(controller.membership) !== canonicalize(membership)) return unknown;
  const people = items.filter(item => item.type === "member" && item.state === "active" && item.values["kind"] === "person" && canonicalize(item.parties["member"] ?? null) === canonicalize(controller));
  const person = people.length === 1 ? people[0]!.values["handle"] : null;
  return typeof person === "string" && person.length ? { key, actor: { kind, name, controller: person } } : unknown;
}

export function signerWords(signer: ActSigner): string {
  const actor = signer.actor;
  return actor ? `${actor.name} (${actor.kind}${actor.controller ? `, controlled by ${actor.controller}` : ""})` : `key ${signer.key} (member unavailable)`;
}
