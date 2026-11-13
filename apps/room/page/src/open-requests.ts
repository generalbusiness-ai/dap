/**
 * What this page knows of the member's open copies, and what a press does with
 * it (notes/2026-10-31-signed-requests-across-devices.md, section 5). The module
 * holds no request: the send path in `data.ts` and the button in
 * `original-check.ts` both read it.
 */
import type { ScopeId, ScopeRef } from "@generalbusiness/dap-contract";
import { sendableAt, type OriginalRow } from "@generalbusiness/dap-client";
import type { Room } from "./data.ts";

/**
 * Whether `to` names the room's directory or one of its partitions. A
 * reference names no kind, so the page compares it with the references it
 * holds: the full directory reference and the full partition references that
 * its last directory read returned. Where the page holds only the directory's
 * scope ID, it compares the scope ID.
 */
export function atDirectory(room: Pick<Room, "directory" | "directoryIndex">, to: ScopeRef): boolean {
  const index = room.directoryIndex, held = index?.scope;
  const same = (ref: ScopeRef) => to.scope === ref.scope && to.genesis === ref.genesis;
  if (!index || !held || held.scope !== room.directory) return to.scope === room.directory;
  return same(held) || (index.partitions ?? []).some(same);
}

/** The last rows this page read for a view, for each room and key, so the next draw shows them. Memory only. */
const lastRead = new Map<string, readonly OriginalRow[]>();
export const rowsLastRead = (memory: string): readonly OriginalRow[] | undefined => lastRead.get(memory);
export const rememberRows = (memory: string, rows: readonly OriginalRow[]): void => { lastRead.set(memory, rows); };

/**
 * The scopes where this page offers only the button: an open copy that this
 * page's key signed, until the margin passes. Other keys keep their acts.
 */
export function lockedScopes(room: Pick<Room, "key" | "directory" | "directoryIndex">, rows: readonly OriginalRow[], now: number): ReadonlySet<ScopeId> {
  const locked = new Set<ScopeId>();
  for (const row of rows) {
    if (row.actor !== room.key || now >= sendableAt(row.notAfter)) continue;
    locked.add(row.to.scope);
    if (atDirectory(room, row.to)) locked.add(room.directory); // An opening act can go to the directory's current partition.
  }
  return locked;
}

/**
 * Why a press to `to` stops, given the rows that it read just now. A row of this
 * key at this scope stops it until the margin passes, because the earlier send
 * can still arrive. Past the margin, a row stops it only if no draw has shown
 * the row, because then the person cannot know of the earlier send. Any opening
 * act counts as the same scope, because it can go to another partition.
 */
export function pressStop(room: Pick<Room, "key" | "directory" | "directoryIndex">, rows: readonly OriginalRow[], shown: readonly OriginalRow[], to: ScopeRef, now: number): "locked" | "unshown" | null {
  const mine = rows.filter(row => row.actor === room.key && (row.to.scope === to.scope || atDirectory(room, row.to) && atDirectory(room, to)));
  if (mine.some(row => now < sendableAt(row.notAfter))) return "locked";
  return mine.some(row => !shown.some(seen => seen.digest === row.digest)) ? "unshown" : null;
}
