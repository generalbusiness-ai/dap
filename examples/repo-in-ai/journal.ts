/** Bounded reading and folding of the seed lane's native capability records. */
import type { ScopeRef, Sealed } from "@generalbusiness/dap-contract";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { canonicalize, isSealed } from "@generalbusiness/dap-bytes";
import { applyEntry, isEntryOf, MemoryState, validateDefinition } from "@generalbusiness/dap-derive";
import { changeJ4 } from "../../apps/room/lanes/src/j4.ts";
import { J4_DIGESTS } from "../../apps/room/lanes/src/digests-j4.ts";
import type { Session } from "./session.ts";

export async function laneState(session: Session, ref: ScopeRef): Promise<{ memory: MemoryState; entries: readonly Sealed[] }> {
  await session.read(ref);
  const checked = validateDefinition(changeJ4, PROPOSED_BOUNDS);
  if (!checked.ok) throw new Error("The local J4 definition is invalid.");
  const entries: Sealed[] = [], memory = new MemoryState();
  let cursor: string | undefined, previous: string | null = null, head: unknown;
  for (let page = 0; page < 16; page++) {
    const result = (await session.call("record", { scope: ref.scope, ...(cursor ? { cursor } : {}) })).result;
    const body = result.structuredContent;
    if (result.isError || !Array.isArray(body["entries"]) || body["definition"] !== J4_DIGESTS.change || canonicalize(body["scope"]) !== canonicalize(ref)) throw new Error("The native lane journal is unavailable.");
    if (head === undefined) head = body["head"];
    else if (canonicalize(head) !== canonicalize(body["head"])) throw new Error("The native lane head moved during its read. Read it again before proceeding.");
    for (const value of body["entries"]) {
      if (!isSealed(value) || entries.length >= 512 || !isEntryOf(value.entry, { at: ref, seq: entries.length, hash: value.hash }) || value.entry.prev !== previous) throw new Error("The native lane journal is incomplete or misbound.");
      applyEntry(memory, checked.definition, value.entry, value.hash);
      entries.push(value); previous = value.hash;
    }
    const next = body["cursor"];
    if (next === undefined) {
      if (entries.length === 0) throw new Error("The native lane has no genesis.");
      const last = entries.at(-1)!;
      if (canonicalize(head) !== canonicalize({ seq: last.entry.seq, hash: last.hash })) throw new Error("The native lane journal does not reach its advertised head.");
      return { memory, entries };
    }
    if (typeof next !== "string" || next.length > 8192 || next === cursor) throw new Error("The native journal continuation is invalid.");
    cursor = next;
  }
  throw new Error("The native lane journal exceeds the setup read bound.");
}
