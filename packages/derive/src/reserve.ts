import { countedEntries } from "./floor.ts";
/**
 * Room to settle (scope contract, sections 9.2 and 17, in the entries
 * dimension): a scope that admits a task must still be able to record how
 * that task ends. This file counts, from the folded state and the head
 * entry alone, the entries the pending work reserves, and says whether an
 * entry leaves room for them. The runtime asks inside the commit, after the
 * fold; a verifier asks the same question of the same state.
 *
 * The count follows section 17.2 of the contract, revision 11, which is
 * adopted. What is reserved:
 *
 * - a deadline: for each live item in a state a timed rule applies in, one
 *   entry for each rule of the longest chain of timed rules from that state
 *   (`ValidDefinition.deadlines`), whether or not the deadline slot holds a
 *   time yet;
 * - a request this scope sent, with no result and no `undelivered`
 *   diagnosis: one entry for its result, and before any diagnosis one more,
 *   because a `delivery-unavailable` diagnosis may be followed by a late
 *   result; and the entries of what its clause can start
 *   (`ValidDefinition.clauseEntries`). Each request reserves that for
 *   itself;
 * - an item that awaits its settlement: for each item in a state that an
 *   act or handler declares with `settles`, the entry of that form and what
 *   it can start (`ValidDefinition.pending`). A copy of a relationship in a
 *   state that its handler declares with `settles: { copy }` reserves the
 *   same (`ValidDefinition.pendingCopies`);
 * - a provisional scope: the entry that records its confirmation, and
 *   for whole-scope capacity the creator-result entry it retains;
 * - an operation that is not settled (row 5; authority note, section 5.8):
 *   2 entries for each attempt that has no outcome or may still be opened,
 *   its first outcome and its late answer, and 1 for each attempt whose
 *   latest outcome is `unknown`. The entry that opens the operation states
 *   the most attempts, so all of this is reserved at the opening, and an
 *   outcome entry is never refused for want of room (`pendingOf`, in
 *   `ledger.ts`). With each of those outcome entries, the closure that the
 *   operation's owner declares for one: the entries of the operations that
 *   an outcome opens, such as a cleanup (`OperationRules.closure`);
 * - a capability record that awaits its messages (row 6; authority note,
 *   section 5.8): what its capability declares, which the owners' code
 *   counts from the folded records (`Owners.reserves`). For `hold@1` that is
 *   `holdReserves`, in `capability/hold.ts`;
 * - the closing checkpoint: one entry, once for the scope, from the genesis
 *   on, except while the head entry is a checkpoint and no other task is
 *   pending.
 *
 * From revision 20 of the contract (section 17.2a), under platform data:
 *
 * - a holder: for what it still holds, each count times its amount, as the
 *   validator computed them from the data (`Reserving`): `one(k)` for each
 *   operation of a kind, `req` for each request and `itm` for each item.
 *   The entry that opens a holder is new work, so `fits` asks it with the
 *   whole amount. Each draw then moves an amount from the holder to the
 *   operation, the request or the item that it is for, which reserves no
 *   more than that: used plus reserved does not grow;
 * - an operation of a kind whose data states its attempts: each outcome
 *   entry that it may still write, with what the mark of its kind may
 *   start, counted from the data and not declared by a rule;
 * - the request that the `send` of an operation's kind can make (I3 delta
 *   FC2): once for each outcome entry that the operation may still write,
 *   or once for the operation where the send states `once` and no outcome
 *   has made the request yet. An operation of a held kind reserves none:
 *   its request draws on its holder;
 * - with each pending request, what the marks of one clause can start.
 *
 * All five dimensions use this traversal. Entry-only callers project its
 * entry component. An operation's owner supplies its producer closure;
 * an opted-in scope refuses a reachable producer without a finite quote.
 * The owner's code declares that closure because no adopted effect states
 * it at the opening (I3 deltas, entries EB6 and EC2).
 */

import type { Bounds, Input, ScopeBoundName } from "@generalbusiness/dap-contract";
import { isPlatformDefinition } from "@generalbusiness/dap-bytes";
import { AmountError, amountMath, holding, naturalAmount, NOTHING, subtract, sum, times, type Amount } from "./held.ts";
import { closureOf, outcomeReservation, ownerReservations, type Owners } from "./ledger.ts";
import { markerOwed } from "./markers.ts";
import type { StateView } from "./state.ts";
import type { ValidDefinition } from "./validate/index.ts";
import { own } from "./values.ts";
import { standingReserved, StandingError } from "./standing.ts";

/**
 * Section 17.2a, "What a holder reserves, in full": the entries that the
 * holders of this state reserve for what they still hold. A holder that
 * holds nothing has no record, so this reads the reservations that are
 * open, and not every item that ever held one.
 */
export function heldEntries(view: StateView, definition: ValidDefinition): number {
  return heldReserved(view, definition).entries;
}

/** The holder's existing Amount terms, without projecting away the other dimensions. */
export function heldReserved(view: StateView, definition: ValidDefinition): Amount {
  const checked = definition.declared.capacity?.name === "whole-scope";
  const { sum } = amountMath(checked);
  const r = definition.reserving;
  if (!r) return NOTHING;
  const one = Object.fromEntries(Object.entries(r.kinds).filter(([, kind]) => kind.held).map(([name, kind]) => [name, kind.whole]));
  return view.holders().reduce((amount, holder) => sum(amount, holding(holder.held, { one, req: r.req, itm: r.itm, dec: r.dec, checked })), NOTHING);
}

/**
 * The entries reserved by the pending work of this state. `head` is the input
 * of the head entry. `owners`: the rules of the owners of outside
 * operations, which declare the closure of an outcome. With none, no
 * outcome is judged, so none has a closure.
 */
export function owed(view: StateView, definition: ValidDefinition, head: Input, owners?: Owners | null): number {
  return reserved(view, definition, head, owners).entries;
}

/**
 * The one pending-work traversal. Legacy scopes retain their entry terms;
 * opted-in scopes keep the Amount components already declared by each task.
 * Complete producer terms and admission are separate from this projection.
 */
export function reserved(view: StateView, definition: ValidDefinition, head: Input, owners?: Owners | null): Amount {
  const scope = view.scope();
  if (!scope) return NOTHING;
  const whole = definition.declared.capacity?.name === "whole-scope";
  const entriesOnly = (entries: number): Amount => ({ ...NOTHING, entries });
  const natural = (n: number): boolean => Number.isSafeInteger(n) && n >= 0 && !Object.is(n, -0);
  // C1 admits no invalid operand, even where multiplication by zero or a
  // later contribution would otherwise conceal it. Old definitions keep
  // their original arithmetic and read behavior.
  const checked = (n: number): number => {
    if (whole && !natural(n)) throw new AmountError("reserved operand is invalid");
    if (definition.standing && !natural(n)) throw new StandingError("reserved entry operand is invalid");
    return n;
  };
  const checkedAmount = (amount: Amount): Amount => whole ? naturalAmount(amount) : amount;
  const scale = (n: number, amount: Amount): Amount => checkedAmount(times(checked(n), checkedAmount(amount)));
  const entry = (n: number): Amount => whole ? scale(n, definition.pendingWorkAmounts.entry) : entriesOnly(n);
  const product = (...factors: number[]): number => checked(factors.reduce((n, factor) => checked(n * checked(factor)), 1));
  let amount = entry(scope.status === "provisional" ? 1 : 0);        // the confirmation
  const add = (more: Amount): void => {
    checkedAmount(more);
    const entries = checked(amount.entries + checked(more.entries));
    amount = checkedAmount({ ...sum(amount, more), entries });
  };
  // Confirmation records its creator's result as a retained foreign
  // source, in addition to its own journal entry. Both writers are bounded
  // by the accepted entry maximum; the source adds bytes, not an entry.
  if (whole && scope.status === "provisional") add({ ...NOTHING, bytes: definition.pendingWorkAmounts.entry.bytes });
  for (const [type, states] of Object.entries(definition.deadlines)) {
    for (const [state, chain] of Object.entries(states)) {
      if (whole) { naturalAmount(definition.pendingWorkAmounts.deadlines[type]![state]!); continue; }
      const count = checked(view.count(type, state));
      add(entry(product(chain, count)));
    }
  }
  // Section 17.2, rows 3 and 4: an item, and a relationship copy, that awaits its settlement.
  for (const [type, states] of Object.entries(definition.pending)) {
    for (const [state, pending] of Object.entries(states)) {
      if (whole) { naturalAmount(definition.pendingWorkAmounts.pending[type]![state]!); continue; }
      const count = checked(view.count(type, state));
      add(entry(product(pending, count)));
    }
  }
  // Revision 22, "A marker duty": an item of a type that some form settles by a mark reserves its state task and each marker task
  // that is pending, by its own marks. A definition with no such form has none, and counts as it did.
  if (whole) {
    // Item duties retain their admitted room across ordinary changes of
    // state or marker. The fold alone releases an identified settlement.
    for (const duty of view.itemDuties()) add(duty.amount);
  } else add(entry(markerOwed(view, definition)));
  for (const [index, copy] of definition.pendingCopies.entries()) {
    const count = checked(view.copies(copy.name, copy.kind, copy.states));
    add(whole ? scale(count, definition.pendingWorkAmounts.pendingCopies[index]!.amount) : entry(product(copy.entries, count)));
  }
  const open = view.outstanding();
  // Section 17.2, "What a mark may start": a clause may hold an effect mark, and the request reserves what that mark may start.
  const clause = definition.clauseEntries + (definition.reserving?.clause.entries ?? 0);
  if (whole) {
    for (const request of view.pendingRequests()) {
      if (!request.reservation) throw new AmountError(`request ${request.seq}.${request.n} has no originating reservation`);
      const remaining = request.diagnosis === null ? request.reservation : request.diagnosis.finding === "delivery-unavailable" ? subtract(request.reservation, entry(1)) : null;
      if (remaining === null) throw new AmountError(`request ${request.seq}.${request.n} has an invalid pending diagnosis`);
      add(remaining);
    }
  } else {
    add(entry(product(checked(2 + checked(clause)), open.requests)));
    add(entry(product(checked(1 + clause), open.unavailable)));
  }
  // Section 17.2, row 5: each outcome entry that an operation may still write, and with it the closure of one outcome entry: what
  // the data of its kind states, or what its owner declares.
  for (const { owner, kind, entries: outcomes, unsent } of open.outcomes) {
    const counted = isPlatformDefinition(owner) ? own(definition.reserving?.kinds, kind) : undefined;
    add(whole ? scale(outcomes, outcomeReservation(owners, owner, kind, definition)) : entry(product(outcomes, checked(1 + checked(closureOf(owners, owner, kind, definition))))));
    // Section 17.2, "A request that an outcome sends": the request of the kind's `send`, with its 2 entries and what one clause can
    // start. Under `holds` the request is one of its account's `requests`, and the holder reserves it.
    if (counted?.request && !counted.held) {
      const count = checked(counted.once ? unsent : outcomes);
      add(whole ? scale(count, counted.request) : entry(product(count, counted.request.entries)));
    }
  }
  // Section 17.2a: what each holder still holds.
  add(whole ? heldReserved(view, definition) : entry(heldEntries(view, definition)));
  // Section 17.2, row 6: a capability record that awaits its messages, and what its capability declares for it. The owners' code
  // counts its own records (`Owners.reserves`). With no code no such record is made, so none reserves.
  add(whole ? ownerReservations(owners, view, definition) : entriesOnly(owners?.reserves?.(view, definition) ?? 0));
  if (definition.standing) {
    add(standingReserved(view, definition));
    if (!Number.isSafeInteger(amount.entries) || amount.entries < 0 || Object.is(amount.entries, -0)) throw new StandingError("aggregate reserved entries are invalid");
  }
  // The closing checkpoint is reserved unless the history already ends on a checkpoint with nothing pending.
  if (amount.entries === 0 && head.type === "checkpoint") return amount;
  add(entry(1));
  return amount;
}

/**
 * Section 17.3, the rule of admission, asked of the state as the entry just
 * folded left it. `input` is that entry's input.
 *
 * A settling entry was reserved by its task, and is not asked: a timed
 * entry, a diagnosis, an outcome, a delivery of a control or of a
 * request's result, and an act or a delivery of a request that settles what
 * its form declares, which its judge says in `settles`. Everything else is
 * new work, and is kept only if the
 * entries written and reserved are within the budget: an act, a genesis, a
 * delivery of a request or an advisory, a `conflict` result of a creation,
 * and a checkpoint.
 *
 * A checkpoint written while another task is pending leaves the closing
 * checkpoint reserved, so it needs a free entry. A checkpoint written with
 * nothing else pending is the closing checkpoint: after it nothing is
 * reserved, and it fits because its entry was. The next entry that is not a
 * checkpoint is asked with the reservation counted again.
 *
 * The opt-in cohort checks every proposed head, including settlements.
 * A settlement spends the room already reserved; it gets no ceiling exemption.
 */
export function fits(view: StateView, definition: ValidDefinition, bounds: Pick<Bounds, "scopeEntries">, input: Input, settled = false, owners?: Owners | null): boolean {
  const scope = view.scope();
  if (!scope) return true;
  if (input.type === "floor") return countedEntries(view) < bounds.scopeEntries;
  if (definition.declared.capacity?.name === "whole-scope") {
    // A settlement spends its existing room; it cannot bypass the ceiling.
    return amountMath(true).sum({ ...NOTHING, entries: countedEntries(view) }, reserved(view, definition, input, owners)).entries <= bounds.scopeEntries;
  }
  const settles = settled || input.type === "timed" || input.type === "diagnosis" || input.type === "outcome"
    || (input.type === "delivery" && (input.message.class === "control" || ("clause" in input && input.clause !== "conflict")));
  // Validate C1 state/arithmetic even when an owed settlement is exempt
  // from capacity admission. Old definitions keep their existing shortcut.
  const standing = definition.standing ? owed(view, definition, input, owners) : null;
  return settles || countedEntries(view) + (standing ?? owed(view, definition, input, owners)) <= bounds.scopeEntries;
}

/** Null bytes explicitly omit that historical check; callers must report
 * its incomplete span. All other dimensions and operands remain checked. */
export type CapacityUse = Omit<Amount, "bytes"> & { bytes: number | null };

/** Compare actual use and the one pending-work Amount. Equality still fits. */
export function capacityFull(used: CapacityUse, pending: Amount, bounds: Pick<Bounds, ScopeBoundName>): ScopeBoundName | null {
  naturalAmount(pending);
  // This is a projection of the known comparison, never a zero size for a
  // producer. The byte dimension is explicitly excluded below when unknown.
  const total = amountMath(true).sum({ ...used, bytes: used.bytes ?? 0 }, pending);
  const dimensions = { scopeEntries: "entries", scopeBytes: "bytes", scopeItems: "items", scopeRecords: "records", scopeRequests: "requests" } as const;
  // Check the whole configuration before selecting a refusal; no invalid
  // later ceiling can be concealed by an earlier exhausted one.
  for (const bound of Object.keys(dimensions) as ScopeBoundName[]) {
    const n = bounds[bound];
    if (!Number.isSafeInteger(n) || n < 0 || Object.is(n, -0)) throw new AmountError(`capacity ${bound} ceiling is invalid`);
  }
  for (const bound of Object.keys(dimensions) as ScopeBoundName[]) {
    if (bound === "scopeBytes" && used.bytes === null) continue;
    if (total[dimensions[bound]] > bounds[bound]) return bound;
  }
  return null;
}
