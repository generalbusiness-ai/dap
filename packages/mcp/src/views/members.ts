/** Bounded display resolution from typed projection sources. No writes or history scans. */
import type { ApplicationProjectionData, FieldValue, MemberRef } from "@generalbusiness/dap-contract";
import { canonicalize, isMemberRef, isDigest, isLocalId, utf8 } from "@generalbusiness/dap-bytes";
import { applicationViewFactField, isApplicationJournalSource, type ApplicationProjectionSource, type ApplicationReadProjection, type ApplicationViewFact } from "@generalbusiness/dap-bytes/application-v2";
import { isActions, ROLE_LISTS, type Role } from "@generalbusiness/dap-platform";
import type { MemberDisplay, MemberTable, MembershipDisplayRead, MembershipDisplaySnapshot } from "./member-types.ts";

export const VIEW_MEMBER_LIMIT = 32;

export function projectionMemberFacts(source: ApplicationProjectionSource, facts: readonly ApplicationViewFact[], values: Record<string, FieldValue | null>): Record<number, { label: string; refs: MemberRef[] }> {
  const result: Record<number, { label: string; refs: MemberRef[] }> = {};
  for (const [index, fact] of facts.entries()) {
    const field = applicationViewFactField(fact), declaration = source.fields[field];
    if (!declaration || (isApplicationJournalSource(source) ? declaration.from.kind !== "signer"
      : declaration.from.kind !== "party" && declaration.from.kind !== "fact-signer")) continue;
    const value = values[field], refs = isMemberRef(value) ? [value] : Array.isArray(value) && value.every(isMemberRef) ? value : [];
    if (refs.length) result[index] = { label: typeof fact === "string" ? fact : fact.label, refs };
  }
  return result;
}

function displayMember(ref: MemberRef, snapshot: MembershipDisplaySnapshot | null): MemberDisplay {
  const unavailable: MemberDisplay = { ref, identity: null, standing: null, controller: null, opened: null };
  if (!snapshot || canonicalize(snapshot.scope) !== canonicalize(ref.membership)) return unavailable;
  const matches = snapshot.members.filter(item => item.type === "member" && canonicalize(item.parties["member"] ?? null) === canonicalize(ref));
  if (matches.length !== 1) return unavailable;
  const item = matches[0]!, handle = item.values["handle"], kind = item.values["kind"];
  if (typeof handle !== "string" || !handle.length || utf8(handle).length > 256 || (kind !== "person" && kind !== "agent" && kind !== "checker")) return unavailable;
  const role = item.values["role"], knownRole = typeof role === "string" && Object.hasOwn(ROLE_LISTS, role) ? role as Role : null;
  const knownState = ["invited", "active", "removed", "lapsed"].includes(item.state);
  const roster = snapshot.roster;
  const actionValue = knownRole && roster?.item.type === "roster" && roster.item.state === "open"
    && canonicalize(roster.at) === canonicalize(snapshot.at) ? roster.item.values[ROLE_LISTS[knownRole]] : null;
  const controller = item.parties["controller"];
  return {
    ref, identity: { handle, kind },
    standing: knownState ? { state: item.state as NonNullable<MemberDisplay["standing"]>["state"], role: knownRole,
      actions: item.state !== "active" ? [] : isActions(actionValue) ? [...actionValue] : null } : null,
    controller: kind === "agent" && isMemberRef(controller) ? controller : null,
    opened: isLocalId(item.id) && isDigest(item.opened) ? { at: ref.membership, seq: item.id, hash: item.opened } : null,
    at: snapshot.at,
  };
}

export async function projectionMembers(declaration: ApplicationReadProjection, data: ApplicationProjectionData, read?: MembershipDisplayRead): Promise<MemberTable> {
  const distinct = new Map<string, MemberRef>();
  const collect = (value: FieldValue | null | undefined) => {
    if (isMemberRef(value)) distinct.set(canonicalize(value), value);
    else if (Array.isArray(value)) for (const element of value) collect(element);
  };
  for (const [name, source] of Object.entries(declaration.sources)) {
    const fields = Object.entries(source.fields).filter(([, field]) => isApplicationJournalSource(source)
      ? field.from.kind === "signer" : field.from.kind === "party" || field.from.kind === "fact-signer").map(([field]) => field);
    for (const row of data.sources[name] ?? []) for (const field of fields) collect(row.fields[field]);
  }
  const selected = [...distinct.values()].slice(0, VIEW_MEMBER_LIMIT);
  const snapshots = new Map<string, Promise<MembershipDisplaySnapshot | null>>();
  const snapshotOf = (ref: MemberRef) => {
    const key = canonicalize(ref.membership);
    let pending = snapshots.get(key);
    if (!pending) {
      pending = Promise.resolve().then(() => read?.(ref.membership) ?? null).catch(() => null);
      snapshots.set(key, pending);
    }
    return pending;
  };
  const records: Record<string, MemberDisplay> = {};
  // Primary references take priority. Controllers consume the same finite
  // table budget and never recursively expand controller chains.
  const primary = await Promise.all(selected.map(async ref => displayMember(ref, await snapshotOf(ref))));
  for (const member of primary) records[canonicalize(member.ref)] = member;
  const controllers: MemberRef[] = [];
  for (const member of primary) {
    if (!member.controller) continue;
    const key = canonicalize(member.controller);
    distinct.set(key, member.controller);
    if (!Object.hasOwn(records, key) && !controllers.some(ref => canonicalize(ref) === key)
      && selected.length + controllers.length < VIEW_MEMBER_LIMIT) controllers.push(member.controller);
  }
  for (const member of await Promise.all(controllers.map(async ref => displayMember(ref, await snapshotOf(ref))))) records[canonicalize(member.ref)] = member;
  return { records, overflow: distinct.size - Object.keys(records).length };
}
