/** A private projection writer copies state, never a journal or a sealed entry. */
import { fixedRowsOf, indexItems, MemoryState, type ItemDuty, type StateView, type ValidDefinition } from "@generalbusiness/dap-derive";

export interface ActStateCopy { readonly writer: MemoryState; readonly view: StateView }

/** Snapshots omit derived indexes and local hash availability. Rebuild the
 * indexes with the existing helpers; keep hash reads on the recorded view. */
export function copyActState(base: StateView, definition: ValidDefinition): ActStateCopy {
  const snapshot = base.all();
  const writer = new MemoryState();
  if (snapshot.scope) writer.setScope(snapshot.scope);
  if (snapshot.floor) writer.putFloor(snapshot.floor);
  for (const item of snapshot.items) writer.putItem(item);
  for (const [type, state, count] of snapshot.counts) writer.addCount(type, state, count);
  for (const relation of snapshot.relations) writer.putRelation(relation);
  for (const [actor, key, accepted] of snapshot.accepted) writer.putAccepted(actor, key, accepted);
  for (const request of snapshot.requests) writer.putRequest(request);
  for (const decided of snapshot.decided) writer.putDecided({ at: decided.from, seq: decided.seq, hash: decided.hash }, decided.n, decided.by);
  for (const order of snapshot.sourceOrder ?? []) writer.putSourceOrder(order);
  for (const [seed, creation] of snapshot.creations) writer.putCreation(seed, creation);
  for (const operation of snapshot.operations) writer.putOperation(operation);
  for (const [item, slot, texts] of snapshot.texts) writer.putTexts(item, slot, texts);
  for (const prepared of snapshot.prepared ?? []) writer.putPrepared(prepared);
  for (const record of snapshot.records ?? []) writer.putRecord(record);
  for (const observed of snapshot.observed ?? []) writer.putObserved(observed);
  for (const holder of snapshot.holders ?? []) writer.putHolder(holder.item, holder.held);
  for (const account of snapshot.accounts ?? []) writer.putAccount(account);
  const duties = new Map<number, ItemDuty[]>();
  for (const duty of snapshot.itemDuties ?? []) {
    const held = duties.get(duty.item) ?? [];
    held.push(duty);
    duties.set(duty.item, held);
  }
  for (const [item, held] of duties) writer.putItemDuties(item, held);
  for (const item of snapshot.settledHolders ?? []) writer.settleHolder(item);

  const scope = snapshot.scope;
  if (scope) {
    indexItems(writer, definition, snapshot.items, scope.at);
    for (const item of snapshot.items) for (const fixed of fixedRowsOf(definition, item, scope.at, seq => base.fixedHash(seq))) {
      writer.putFixed(fixed.row, fixed.dependencies);
    }
    if (base.fixedReady(definition.digest, scope.at, scope.head)) writer.finishFixed(definition.digest, scope.at, scope.head);
  }
  const heldEntryCount = base.heldEntryCount?.bind(base);
  const overrides: Partial<StateView> = {
    fixedHash: seq => base.fixedHash(seq),
    ...(heldEntryCount ? { heldEntryCount } : {}),
  };
  const view = new Proxy<StateView>(writer, {
    get: (target, key) => {
      const owner = Object.hasOwn(overrides, key) ? overrides : target;
      const value: unknown = Reflect.get(owner, key, owner);
      return typeof value === "function" ? value.bind(owner) : value;
    },
  });
  return { writer, view };
}
