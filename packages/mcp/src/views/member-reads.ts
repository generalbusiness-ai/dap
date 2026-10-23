import type { ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize } from "@generalbusiness/dap-bytes";
import { ScopeHandle } from "@generalbusiness/dap-client";
import type { Reads } from "../reads.ts";
import type { MembershipDisplaySnapshot } from "./member-types.ts";

/** One bounded membership window, including final states. No cursor follow,
 * wider lookup, signed fallback or retry. Missing identities stay unknown. */
export async function readMembershipDisplay(reads: Reads, scope: ScopeRef): Promise<MembershipDisplaySnapshot | null> {
  if (scope.kind !== "membership") return null;
  const session = await reads.session(scope);
  if (!session || session.claims.key !== reads.signer.key || canonicalize(session.claims.membership) !== canonicalize(scope)) return null;
  const handle = new ScopeHandle(reads.transport, scope.scope, session.reader());
  // The native object admits one outstanding query preparation. Read each
  // selection once, in order; the optional roster keeps its own actual head.
  const members = await handle.queryItems({ v: 1, scope, type: "member", states: ["active", "invited", "lapsed", "removed"], ids: null, limit: 100, cursor: null });
  const roster = await handle.queryItems({ v: 1, scope, type: "roster", states: ["open"], ids: null, limit: 1, cursor: null }).catch(() => null);
  if (!members.ok) return null;
  return { scope, at: members.at, members: members.value.items,
    ...(roster?.ok && roster.complete && roster.value.items.length === 1 ? { roster: { item: roster.value.items[0]!, at: roster.at } } : {}) };
}
