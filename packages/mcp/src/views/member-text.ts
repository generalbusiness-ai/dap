import type { FieldValue, MemberRef } from "@generalbusiness/dap-contract";
import { canonicalize, isMemberRef } from "@generalbusiness/dap-bytes";
import type { MemberDisplay, MemberTable } from "./member-types.ts";

export function memberDescription(member: MemberDisplay, table?: MemberTable): string {
  if (!member.identity) return "eligibility unknown";
  const words: string[] = [member.identity.kind];
  if (member.identity.kind === "agent") {
    const controller = member.controller ? table?.records[canonicalize(member.controller)] : undefined;
    words.push(controller?.identity?.kind === "person" ? `controlled by ${controller.identity.handle}` : "controller unavailable");
  }
  if (!member.standing) words.push("eligibility unknown");
  else {
    if (member.standing.state !== "active") words.push(member.standing.state === "lapsed" ? "invitation lapsed" : member.standing.state);
    if (member.standing.role) words.push(`role ${member.standing.role}`);
    if (member.standing.state === "active" && member.standing.actions === null) words.push("eligibility unknown");
  }
  return words.join(" · ");
}
export function memberText(ref: MemberRef, table?: MemberTable): string {
  const member = table?.records[canonicalize(ref)];
  return member?.identity ? `${member.identity.handle} (${memberDescription(member, table)})`
    : `Member unavailable (${canonicalize(ref)}); eligibility unknown`;
}
/** Only explicit member values get a display form; other values keep their
 * existing formatter. Resolution itself remains schema-bound on the server. */
export function memberValueText(value: FieldValue | null | undefined, table?: MemberTable): string | null {
  if (isMemberRef(value)) return memberText(value, table);
  if (Array.isArray(value) && value.length && value.every(isMemberRef)) return value.map(ref => memberText(ref, table)).join(", ");
  return null;
}
