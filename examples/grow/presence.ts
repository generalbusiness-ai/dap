/** Projection of accepted site comments, in native journal order.
 * It reports the signing member, not the member's controller. */
import type { Digest, Entry, FactRef, MemberRef } from "@generalbusiness/dap-contract";
import { canonicalize } from "@generalbusiness/artroom-bytes";
export interface Presence { member: MemberRef; room: number; since: FactRef }
export function sitePresence(history: readonly { entry: Entry; hash: Digest }[]): Presence[] {
  const present = new Map<string, Presence>();
  for (const { entry, hash } of history) {
    const input = entry.input;
    if (input.type !== "act") continue;
    const intent = input.signed.intent;
    if (intent.kind !== "arrive" && intent.kind !== "leave") continue;
    const member = input.authority.find(grant => grant.key === intent.actor)?.subject, room = intent.fields["room"];
    if (!member || typeof room !== "number") continue;
    const key = canonicalize(member);
    if (intent.kind === "arrive") present.set(key, { member, room, since: { at: entry.at, seq: entry.seq, hash } });
    else if (present.get(key)?.room === room) present.delete(key);
  }
  return [...present].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([, row]) => row);
}
