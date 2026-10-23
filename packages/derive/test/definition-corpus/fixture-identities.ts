/** Exact public fixture identities without actor keys, validation or histories. */
import type { Digest, MemberId, MemberRef, ScopeKind, ScopeRef, Seed } from "@generalbusiness/dap-contract";
import { newIncarnation, scopeIdOf } from "@generalbusiness/artroom-bytes";
export const d = (c: string): Digest => `sha256:${c.repeat(64)}`;
export const T0 = "2026-10-04T12:00:00Z";

const ref = (kind: ScopeKind, n: number): ScopeRef => {
  const seed: Seed = { v: 1, kind, definition: d("e"), creator: null, cause: d("c"), ordinal: n };
  return { scope: scopeIdOf(seed), inc: newIncarnation(new Uint8Array(16).fill(n)), kind };
};
export const membership = ref("membership", 1);
export const directory = ref("directory", 2);
export const otherLane = ref("lane", 3);

export const member = (name: string): MemberRef => ({ membership, member: `@${name}` as MemberId });
