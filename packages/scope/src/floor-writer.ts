/** Alarm-owned floor offer. These bookkeeping facts never reach the judge.
 * No policy here enables a deployed binding; fixture/production policy owners
 * must explicitly supply the reviewed floor policy for the pinned cohort. */
import type { Bounds, FloorInput } from "@generalbusiness/dap-contract";
import { same } from "@generalbusiness/dap-bytes";
import { chooseFloor, stateKept, FLOOR_KEEP, FLOOR_KEPT } from "@generalbusiness/dap-derive";
import type { Own, PlatformRules, ValidDefinition } from "@generalbusiness/dap-derive";
import { ArchiveRows } from "./archive-row.ts";
import type { ReviewedArchivePolicy } from "./archive-inventory.ts";
import type { Sql } from "./sqlite.ts";
import type { SqliteStore } from "./sqlite.ts";

export interface FloorWriterContext {
  sql: Sql;
  store: SqliteStore;
  own: Own;
  definition: ValidDefinition;
  platform?: PlatformRules | undefined;
  bounds: Bounds;
  now(): string;
  /** Actual discovery entries, not arbitrary membership IDs or floor coverage. */
  discoveries(): readonly number[];
}
export function offerFloor(context: FloorWriterContext, policy: NonNullable<ReviewedArchivePolicy["floor"]>): FloorInput | null {
  const { store, sql } = context, scope = store.scope();
  if (!scope) return null;
  const receipt = new ArchiveRows(sql, scope.at).load()?.confirmed;
  // A historical receipt does not establish that private replay anchors
  // were published. Only the writer's complete first/backfill confirmation
  // can establish coverage before deleting still-needed native entries.
  if (!receipt || receipt.layout !== 2 || receipt.anchorsPublished !== true) return null;
  let floor = chooseFloor(store, receipt, policy, context.now(), context.bounds.intentLifetimeSeconds, context.own);
  if (floor === null) return null;
  const snapshot = store.all(), currentFloor = store.floor()?.floor ?? 0;
  let keep: number[] = [];
  while (floor >= currentFloor + policy.minimum) {
    const anchors = store.localSigners.floorAnchors(floor);
    if (anchors === null) return null;
    const unacknowledged = sql.exec("SELECT DISTINCT seq FROM outbox WHERE ack IS NULL AND seq < ? ORDER BY seq LIMIT ?", floor, FLOOR_KEEP + 1).toArray();
    keep = [...new Set([...unacknowledged.map(row => row["seq"] as number), ...anchors, ...context.discoveries()].filter(seq => seq < floor!))].sort((a, b) => a - b);
    if (keep.length > FLOOR_KEEP) { floor = keep[FLOOR_KEEP]!; continue; }
    const kept = stateKept(snapshot, context.definition, floor, keep, context.own, context.platform);
    if (kept === null) return null;
    if (kept.length <= FLOOR_KEPT) break;
    // Moving F to the first excess position removes at least one below-F
    // obligation; the independent judge still recomputes the full closure.
    floor = kept[FLOOR_KEPT]!;
  }
  if (floor < currentFloor + policy.minimum) return null;
  // No await separates this rebind from the synchronous offer/judgment.
  const current = new ArchiveRows(sql, scope.at).load()?.confirmed;
  if (!current || current.layout !== 2 || current.anchorsPublished !== true || !same(receipt, current)) return null;
  return { type: "floor", floor, receipt: { commit: receipt.commit, through: receipt.through }, keep };
}
