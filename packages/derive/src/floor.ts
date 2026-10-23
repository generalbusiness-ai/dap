/** The retained-journal floor. Judges read journal/state only; host archive
 * receipts and transport acknowledgement timing remain writer obligations. */
import type { Archived, FieldType, Bounds, Digest, FloorInput, FloorRefusal, JournalFloor, SizeProof } from "@generalbusiness/dap-contract";
import { entryHash, isDigest, natural } from "@generalbusiness/dap-bytes";
import type { Own } from "./fields.ts";
import { checkedTextBounds } from "./handlers.ts";
import type { Judgment } from "./judge.ts";
import { pendingOf } from "./ledger.ts";
import { detachedTextDependencies } from "./retained-plan.ts";
import type { StateView, StateSnapshot } from "./state.ts";
import { timeMs, type Clock } from "./time.ts";
import { isFactRef, isObject, own, same } from "./values.ts";
import type { ValidDefinition } from "./validate/index.ts";

export const FLOOR_STEP = 4096;
export const FLOOR_KEEP = 1024;
export const FLOOR_KEPT = 4096;
export const FLOOR_WINDOW = 100;

export function countedEntries(view: Pick<StateView, "scope" | "floor" | "heldEntryCount">): number {
  if (view.heldEntryCount) return view.heldEntryCount();
  const floor = view.floor?.();
  return (view.scope()?.head.seq ?? -1) + 1 - (floor?.floor ?? 0) + (floor?.kept.length ?? 0);
}
export function archivedPosition(view: Pick<StateView, "floor">, seq: number): Archived | null {
  const floor = view.floor?.();
  return floor && natural(seq) && seq < floor.floor && !floor.kept.includes(seq)
    ? { floor: floor.floor, commit: floor.receipt.commit, through: floor.receipt.through } : null;
}
/** Kept entries followed by the dense live tail, each once. A floor has at
 * most 4096 kept entries; consumers can seek over archived gaps directly. */
export function heldPositions(view: Pick<StateView, "floor" | "scope">, before = (view.scope()?.head.seq ?? -1) + 1): Iterable<number> {
  const floor = view.floor?.();
  return (function* () {
    for (const seq of floor?.kept ?? []) if (seq < before) yield seq;
    for (let seq = floor?.floor ?? 0; seq < before; seq++) yield seq;
  })();
}

/** The state-derived half of the kept set. No acknowledgement or runtime
 * index is visible here. All foreign positions remain foreign positions. */
export function stateKept(snapshot: StateSnapshot, definition: ValidDefinition, floor: number, keep: readonly number[], history?: Own, platform?: import("./marks.ts").PlatformRules): number[] | null {
  const previous = snapshot.floor, previousKept = new Set(previous?.kept ?? []);
  const archived = (seq: number): Archived | null => previous && natural(seq) && seq < previous.floor && !previousKept.has(seq)
    ? { floor: previous.floor, commit: previous.receipt.commit, through: previous.receipt.through } : null;
  let missing = false;
  // A complete clone is not the runtime's held journal. Mask both direct
  // reads and walks before any platform or causal reader can inspect it.
  const heldHistory: Own | undefined = history && Object.assign((seq: number) => {
    if (archived(seq)) return null;
    const found = natural(seq) && seq <= (snapshot.scope?.head.seq ?? -1) ? history(seq) : null;
    if (!found) missing = true;
    return found;
  }, {
    archived, positions: (before: number) => heldPositions({ floor: () => previous ?? null, scope: () => snapshot.scope }, Math.min(before, (snapshot.scope?.head.seq ?? -1) + 1)),
    ...(history.retained ? { retained: history.retained } : {}),
    ...(history.sizeProofs ? { sizeProofs: history.sizeProofs } : {}),
  });
  const held = new Set<number>(), queue: number[] = [], queued = new Set<number>();
  const add = (seq: number, identity = false) => {
    if (!natural(seq)) return;
    // A folded item identity can outlive its opening. It remains a valid
    // value, but cannot restore an already-archived payload. Other roots
    // actually require their payload and therefore fail closed.
    if (heldHistory && archived(seq)) { if (!identity) missing = true; return; }
    if (heldHistory && !heldHistory(seq)) return;
    if (seq < floor) held.add(seq);
    if (!queued.has(seq)) { queued.add(seq); queue.push(seq); }
  };
  const local = (value: unknown): void => {
    if (isFactRef(value) && value.at.scope === snapshot.scope?.at.scope && value.at.inc === snapshot.scope.at.inc) add(value.seq);
  };
  const typed = (type: FieldType, value: unknown): void => {
    if ((type.type === "item" || type.type === "fact") && typeof value === "number") add(value, type.type === "item");
    else if (type.type === "fact") local(value);
    else if (type.type === "list" && Array.isArray(value)) for (const part of value) typed(type.of, part);
    else if (type.type === "record" && isObject(value)) for (const [name, child] of Object.entries(type.of)) typed(child, value[name]);
  };
  const operations = new Map(snapshot.operations.map(operation => [operation.id, operation]));
  const operation = (id: string) => {
    add(Number(id.split(":")[0]));
    const found = operations.get(id as import("@generalbusiness/dap-contract").OperationId);
    if (found) for (const attempt of found.attempts) { add(attempt.opened); for (const outcome of attempt.outcomes) add(outcome.seq); }
  };
  add(0); for (const seq of keep) add(seq);
  for (const current of snapshot.operations) { const pending = pendingOf(current); if (pending.opened + pending.unknown + pending.unopened > 0) operation(current.id); }
  for (const request of snapshot.requests) if (request.diagnosis?.finding !== "undelivered"
    && (request.result === null || request.type === "create" && request.result.clause === "applied")) add(request.seq);
  for (const item of snapshot.items) {
    const type = own(definition.declared.items, item.type);
    if (!type || own(type.states, item.state)?.final) continue;
    add(item.id);
    for (const [slot, value] of Object.entries(item.refs)) { const field = own(type.refs, slot)?.to; if (field) typed(field, value); }
    for (const [slot, value] of Object.entries(item.values)) { const field = own(type.values, slot)?.of; if (field) typed(field, value); }
  }
  // hold.retire reads the live root record's recording time. Other record
  // sequence fields and all ten folded kinds are identities/counters unless
  // a platform's explicit reader hook follows them below.
  for (const record of snapshot.records ?? []) if (record.capability === "hold@1" && record.kind === "root" && record.state === "live") add(record.seq);
  for (const prepared of snapshot.prepared ?? []) add(prepared.seq);
  if (heldHistory && platform?.floorReferences) for (const seq of platform.floorReferences(snapshot, definition, heldHistory)) add(seq);
  // Entries in the dense live tail can also have current causal readers.
  // The recorded keep list cannot name them (it lists positions below F).
  if (heldHistory?.positions) for (const seq of heldHistory.positions((snapshot.scope?.head.seq ?? -1) + 1)) if (seq >= floor) add(seq);
  const foreign = new Set<string>();
  const visit = (entry: import("@generalbusiness/dap-contract").Entry) => {
    const here = entry.at.scope === snapshot.scope?.at.scope && entry.at.inc === snapshot.scope.at.inc;
    const input = entry.input;
    // These are grammar positions, never arbitrary numeric payloads or prev.
    if (here && input.type === "outcome") operation(input.operation);
    if (here && input.type === "diagnosis") add(input.of.seq);
    if (input.type === "genesis" && input.source) local(input.source);
    if (input.type === "delivery") { local(input.from); if (input.message.class === "result") local(input.message.of.from); }
    if (here && input.type === "act") {
      const act = own(definition.declared.acts, input.signed.intent.kind);
      if (act) for (const [name, field] of Object.entries(act.fields)) typed(field, input.signed.intent.fields[name]);
    }
    for (const use of entry.uses) {
      local(use.fact);
      if (use.fact.at.scope === snapshot.scope?.at.scope && use.fact.at.inc === snapshot.scope.at.inc) continue;
      if (foreign.has(use.content)) continue;
      foreign.add(use.content);
      const copy = heldHistory?.retained?.(use);
      if (copy && same(copy.at, use.fact.at) && copy.seq === use.fact.seq && entryHash(copy) === use.fact.hash) visit(copy);
    }
  };
  for (let i = 0; i < queue.length && held.size <= FLOOR_KEPT; i++) { const entry = heldHistory?.(queue[i]!)?.entry; if (entry) visit(entry); }
  return missing ? null : [...held].sort((a, b) => a - b);
}

/** Size evidence retains its proving position. Later proofs never bind an
 * earlier deciding entry, even when replay still has the complete clone. */
export function nextFloorState(view: StateView, definition: ValidDefinition, input: FloorInput, ownEntry: Own, platform?: import("./marks.ts").PlatformRules): JournalFloor {
  const kept = stateKept(view.all(), definition, input.floor, input.keep, ownEntry, platform);
  if (kept === null) throw new Error("a floor requires every held payload root");
  const keptSet = new Set(kept);
  const candidates: SizeProof[] = [...(view.floor?.()?.sizeProofs ?? [])];
  const needed = new Set<Digest>();
  for (const seq of heldPositions(view)) {
    const sealed = ownEntry(seq);
    if (!sealed) continue;
    const { entry, hash } = sealed;
    if (seq < input.floor && !keptSet.has(seq)) {
      for (const [digest, bound] of checkedTextBounds(definition, entry.input)) candidates.push({ digest, seq, bound });
    } else {
      for (const text of detachedTextDependencies(definition, { at: { at: entry.at, seq, hash }, input: entry.input.type }, entry.input)) needed.add(text.key.digest);
    }
  }
  candidates.sort((a, b) => a.digest < b.digest ? -1 : a.digest > b.digest ? 1 : a.seq - b.seq || a.bound - b.bound);
  const sizeProofs: SizeProof[] = [];
  const least = new Map<Digest, number>();
  for (const proof of candidates) {
    if (!needed.has(proof.digest) || proof.bound >= (least.get(proof.digest) ?? Infinity)) continue;
    least.set(proof.digest, proof.bound); sizeProofs.push(proof);
  }
  return { floor: input.floor, receipt: input.receipt, kept, sizeProofs };
}

export function judgeFloor(view: StateView, definition: ValidDefinition, input: FloorInput, context: { clock: Clock; bounds: Bounds; own: Own; platform?: import("./marks.ts").PlatformRules | undefined }): Judgment {
  const refuse = (reason: FloorRefusal, detail: string): Judgment => ({ result: "refused", reason, detail });
  const scope = view.scope(), current = view.floor?.()?.floor ?? 0;
  if (!scope || !natural(input.floor) || input.floor <= current) return refuse("floor-back", "the floor must advance");
  if (!input.receipt || !isDigest(input.receipt.through?.hash) || !natural(input.receipt.through.seq)
    || typeof input.receipt.commit !== "string" || !/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/.test(input.receipt.commit)) return refuse("floor-receipt", "invalid archive receipt");
  if (input.floor > input.receipt.through.seq + 1) return refuse("floor-ahead", "the receipt does not cover the floor");
  if (input.floor - current > FLOOR_STEP) return refuse("floor-step", "the floor advances by at most 4096");
  const through = context.own(input.receipt.through.seq);
  if (input.receipt.through.seq < current || !through || !same(through.entry.at, scope.at) || through.hash !== input.receipt.through.hash) return refuse("floor-receipt", "the receipt differs from this scope's held entry");
  const preceding = context.own(input.floor - 1), now = timeMs(context.clock.asOf), previous = preceding && timeMs(preceding.entry.time);
  if (scope.head.seq + 2 - input.floor < FLOOR_WINDOW || now === null || previous === null || !preceding || now - previous < context.bounds.intentLifetimeSeconds * 1000) return refuse("floor-recent", "retain 100 entries and the intent-lifetime window");
  if (!Array.isArray(input.keep) || input.keep.length > FLOOR_KEEP || input.keep.some((seq, i) => !natural(seq) || seq >= input.floor || i > 0 && seq <= input.keep[i - 1]! || context.own(seq) === null)) return refuse("floor-keep", "keep must list at most 1024 held positions below the floor, ascending");
  const kept = stateKept(view.all(), definition, input.floor, input.keep, context.own, context.platform);
  if (kept === null) return { result: "unavailable", reason: "unavailable" };
  if (kept.length > FLOOR_KEPT) return refuse("floor-kept", "the new kept set exceeds 4096 entries");
  if (context.clock.behind) return { result: "unavailable", reason: "clock-behind" };
  return { result: "write", draft: { input, uses: [], prepared: [], effects: [], sends: [], judgesTime: true } };
}

/** Host policy chooses a candidate; the independent judge still checks all
 * journal rules. This reads at most one 4096-position advancing window. */
export function chooseFloor(view: StateView, receipt: FloorInput["receipt"], policy: { margin: number; minimum: number }, at: string, lifetimeSeconds: number, ownEntry: Own): number | null {
  const head = view.scope()?.head.seq;
  if (head === undefined || !natural(policy.margin) || !natural(policy.minimum) || policy.minimum === 0) return null;
  const current = view.floor?.()?.floor ?? 0;
  let floor = Math.min(receipt.through.seq + 1, head + 1 - policy.margin, current + FLOOR_STEP);
  const now = timeMs(at);
  if (now === null) return null;
  while (floor >= current + policy.minimum) {
    const preceding = ownEntry(floor - 1), time = preceding && timeMs(preceding.entry.time);
    if (time !== null && preceding && now - time >= lifetimeSeconds * 1000) return floor;
    floor--;
  }
  return null;
}
