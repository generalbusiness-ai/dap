/**
 * What a task reserves, as far as the definition decides it (scope contract,
 * section 17.2): the chain of timed rules from each state, what
 * an item or a copy that awaits its settlement reserves, and the most that
 * a result clause can start.
 *
 * A reservation is of a task's whole closure: the task, and every task that
 * a settling entry of the closure can create. A settling entry is written
 * whatever is free, so the room for what it starts exists before it.
 */

import type { ScopeKind } from "@generalbusiness/dap-contract";
import { AmountError, NOTHING, amountMath, requestEntries, retainedBytes, type Amount } from "../held.ts";
import type { Markers } from "../markers.ts";
import type { ClauseSet, Defining, PendingWork } from "./context.ts";
import { markerCapacity } from "./markers.ts";
import type { TimedGraph, TimedMove } from "./timed.ts";
import { fieldRetainedBytes } from "../field-retention.ts";

/** A relationship whose copies await a settlement in those states (section 17.2, row 4), and the entries each reserves. */
export interface PendingCopy { name: string; kind: ScopeKind; states: readonly string[]; entries: number }

/**
 * The known declared task terms, in Amount form: entries, declared future requests, and their entries' stand-in bytes, including
 * each result's foreign source entry, a declared primary opening and a possible first relationship copy. Other item/record
 * terms and retained inputs remain owed under cc570904. The numeric
 * fields of Capacity are entry projections of these amounts, not a second calculation or five-dimensional admission.
 */
export interface PendingWorkAmounts {
  /** The static entry-size stand-in, before producer-specific retained terms. */
  entry: Amount;
  deadlines: Readonly<Record<string, Readonly<Record<string, Amount>>>>;
  pending: Readonly<Record<string, Readonly<Record<string, Amount>>>>;
  pendingCopies: readonly (Omit<PendingCopy, "entries"> & { amount: Amount })[];
  clause: Amount;
  decisions: Readonly<Record<string, Amount>>;
  /** Opt-in: one future request of each exact send form, including its
   * pending-request unit. The fold transfers that unit to Used. */
  requests?: Readonly<Record<string, Amount>>;
  /** Opt-in platform data: written work of each exact reserved clause. */
  clauses?: Readonly<Record<string, Amount>>;
  /** Native hold pins reserve deciding entries, including refused inputs,
   * with the same recursive graph as other pending work. */
  receiverPins?: { fallback: Amount; byKind: Readonly<Record<string, Amount>> };
}

export interface Capacity {
  pendingWorkAmounts: PendingWorkAmounts;
  deadlines: Record<string, Record<string, number>>;
  pending: Record<string, Record<string, number>>;
  pendingCopies: PendingCopy[];
  clauseEntries: number;
  /** What the written effects of each bound handler can start, by its path. Sends draw on the holder's requests. */
  decisionEntries: Record<string, number>;
  /** Section 17.2, "A marker duty": the types that some form settles by a mark. Their items are counted one by one (`markers.ts`), so `pending` has no row for them. Absent: none. */
  markers?: Markers;
}

/** Lazy edges into the same pending-work graph, before its closures are
 * frozen. Platform marks can open items whose settling forms send
 * further requests. Those requests must return through this graph. */
export interface CapacityReader {
  inState(type: string, state: string): Amount;
  clause(path: string): Amount;
  written: Amount;
}
export interface PlatformWork {
  request(path: string): Amount | undefined;
  effects(path: string): Amount;
}

/**
 * The chains are finite here: the validator refuses a cycle of timed rules
 * first. Each rule's chain was computed once, with the cycle check. A cycle
 * of settling forms is refused here, as `reserve-unbounded`.
 */
export function capacityOf(d: Pick<Defining, "bad" | "bounds" | "pendingWork" | "clauseSets" | "clauseRetains" | "clausePaths" | "platform" | "types" | "wholeCapacity" | "ruleInputBytes" | "rules" | "native">, graph: TimedGraph, moves: readonly TimedMove[], prepare?: (reader: CapacityReader) => PlatformWork | undefined): Capacity {
  const { sum, times, largest } = amountMath(d.wholeCapacity);
  const entry: Amount = { ...NOTHING, entries: 1, bytes: d.bounds.entryBytes };
  // One settling form's own entry and declared openings. Changes to existing subjects and to the copy being settled create
  // no new item/key. Initial-state pending work remains in starts, so the opening unit is included once, beside that pending work.
  // Guard inputs are identical for one act/handler context and are retained
  // at most once per distinct declared rule. Count every rule conservatively;
  // a checkpoint, timed entry or result clause evaluates no rule guard.
  const ruleInputs = d.wholeCapacity ? times(d.rules.size, { ...NOTHING, bytes: d.ruleInputBytes }) : NOTHING;
  const entryFor = (form: PendingWork, pinBound = false): Amount => {
    // A pin binds before handler field validation. Even an over-sized
    // detached body gets a deciding refusal, so use its actual writer
    // ceiling here, rather than the bound on valid handler inputs.
    const retained = pinBound ? { ...form.retained, fields: form.retained.fields.map(field => field.type === "text" && field.detached ? { ...field, max: d.bounds.textBytes } : field) } : form.retained;
    return sum(entry, ruleInputs, { ...NOTHING, bytes: d.wholeCapacity ? fieldRetainedBytes(retained, d.bounds) : 0, items: form.opens === null ? 0 : 1, records: form.mayCreateCopy ? 1 : 0 });
  };
  const deadline = (entries: number): Amount => times(entries, entry);
  /** A deadline's known amount in that state, with each timed entry at the entry-size stand-in. */
  const held = (type: string, state: string): Amount => deadline(graph.fromState.get(type)?.get(state) ?? 0);
  // Built from entries, so each type and each state is an own name of its record, whatever it is called (`own`, in values.ts).
  const deadlineAmounts = Object.fromEntries([...graph.fromState].map(([type, states]) => [type, Object.fromEntries([...states].map(([state, entries]) => [state, deadline(entries)]))]));
  const entriesOfStates = (amounts: PendingWorkAmounts["pending"]): Record<string, Record<string, number>> => Object.fromEntries(Object.entries(amounts).map(([type, states]) => [type, Object.fromEntries(Object.entries(states).map(([state, amount]) => [state, amount.entries]))]));
  const deadlines = entriesOfStates(deadlineAmounts);

  const key = (type: string, state: string) => JSON.stringify([type, state]);
  /** The forms that settle an item of that type in that state, by type and state. */
  const settlers = new Map<string, PendingWork[]>();
  const unbounded = new Set<PendingWork>();
  // Revision 22, "A marker duty": an item of a type that some form settles by a mark reserves by its state and by the marks that
  // are `true`. Every form that settles an item of such a type, by a mark or by state, is counted there, and not below.
  // The platform plan counts only outputs allowed on this form. A
  // settling rule can open work but is forbidden to change states.
  const marksOfForm = (form: PendingWork): Amount => platform?.effects(form.path) ?? NOTHING;
  const markers = markerCapacity(d, { checked: d.wholeCapacity, graph, moves, entry: form => sum(entryFor(form), marksOfForm(form)), deadline, starts: (set) => starts(set), requests: (form) => requestsOf(form) }, unbounded);
  for (const form of d.pendingWork) {
    if (form.settles && "subject" in form.settles && !markers.marked(form.settles.type)) for (const state of new Set(form.settles.states)) settlers.set(key(form.settles.type, state), [...(settlers.get(key(form.settles.type, state)) ?? []), form]);
  }
  const done = new Map<string, Amount>();
  const open = new Set<string>();
  const forms: PendingWork[] = [];

  /**
   * Row 3: what an item of that type in that state reserves for its
   * settlement. Where several forms settle one state, the largest. A timed
   * rule may take the item to a state that awaits a settlement, and a timed
   * entry is never refused: so the item reserves that from the state the
   * rule applies in.
   */
  const awaits = (type: string, state: string): Amount => {
    // Rule 11 of "A marker duty": an item that the data does not name is counted with no mark completed.
    if (markers.marked(type)) return markers.awaits(type, state);
    const k = key(type, state);
    const known = done.get(k);
    if (known !== undefined) return known;
    // The closure is not finite: settling forms create one another's pending states in a cycle.
    if (open.has(k)) {
      // A cycle may return through a timed state that no form settles (GC8). The forms whose closures are being counted still
      // reach that cycle, so refuse them rather than letting an empty list of settlers turn a nonfinite closure into zero.
      for (const form of settlers.get(k) ?? forms) unbounded.add(form);
      return NOTHING;
    }
    open.add(k);
    let most = largest(...(settlers.get(k) ?? []).map(form => amountOf(form)));
    for (const rule of moves) if (rule.type === type && rule.states.includes(state)) most = largest(most, awaits(type, rule.to));
    open.delete(k);
    done.set(k, most);
    return most;
  };
  /**
   * What one list of effects can start: for each subject one item's worth,
   * by the state the list can set or by a deadline slot it sets. An item in
   * a state holds the chain of its deadline and what awaits its settlement.
   * `but`: the states of one subject that are not counted.
   */
  const starts = (set: ClauseSet, but?: { subject: string; states: readonly string[] }, pinBound = false): Amount => {
    const bySubject = new Map<string, Amount>();
    for (const e of set) {
      if (e.state !== undefined && but?.subject === e.subject && but.states.includes(e.state)) continue;
      const most = e.state !== undefined ? sum(held(e.type, e.state), awaits(e.type, e.state)) : deadline(graph.fromSlot.get(e.type)?.get(e.slot!) ?? 0);
      bySubject.set(e.subject, largest(bySubject.get(e.subject) ?? NOTHING, most));
    }
    const native = (d.native.tasks.get(set) ?? []).map(task => task.existing && pinBound ? NOTHING : sum({ ...NOTHING, records: 1 }, task.source === null || task.remaining === 0 ? NOTHING : times(task.remaining, receiverPin(task.source))));
    return sum(...bySubject.values(), ...native, { ...NOTHING, bytes: d.wholeCapacity ? retainedBytes(d.clauseRetains.get(set)) : 0 });
  };
  /**
   * What a settling form reserves: its own entry; what its effects can
   * start; and for each request it can send, at the bounds, the two entries
   * of row 1 and the most that one clause of that send can start. An entry
   * that leaves its subject in a listed state settles nothing and is new
   * work, so such a state is not counted here.
   */
  // Each request here is future work of a settling form: its pending-request unit is Reserved, not Used. Its result may newly
  // retain its foreign source entry. The largest clause closure is propagated in every dimension already known here.
  const requestAmount = (form: PendingWork, request: PendingWork["requests"][number]): Amount => {
    if (platform) {
      const path = `${form.path}.sends.${request.send}`, amount = platform.request(path);
      if (!amount) throw new AmountError(`the future request ${path} has no joint clause Amount`);
      return amount;
    }
    return sum(requestEntries(d.bounds.entryBytes), largest(...request.clauses.map(c => starts(c))));
  };
  const requestsOf = (form: PendingWork): Amount => sum(...form.requests.map(request => times(request.most, requestAmount(form, request))));
  const amountOf = (form: PendingWork, pinBound = false): Amount => {
    const settled = form.settles && "subject" in form.settles ? form.settles : undefined;
    forms.push(form);
    const amount = sum(entryFor(form, pinBound), starts(form.sets, settled, pinBound), requestsOf(form), marksOfForm(form));
    forms.pop();
    return amount;
  };

  const pinFallback = sum(entry, { ...NOTHING, bytes: d.bounds.entryBytes });
  const pinKinds = [...new Set(d.native.decisions.map(decision => decision.kind))];
  const pinQuotes = new Map<string, Amount>(), pinOpen = new Set<string>();
  const receiverPin = (kind: string): Amount => {
    const known = pinQuotes.get(kind);
    if (known) return known;
    if (pinOpen.has(kind)) throw new AmountError("hold@1/receiver-pin producer has a recursive reservation closure");
    pinOpen.add(kind);
    const amount = kind === "*" ? largest(pinFallback, ...pinKinds.map(receiverPin)) : largest(pinFallback, ...d.native.decisions.filter(decision => decision.kind === kind).map(decision => amountOf(d.pendingWork.find(form => form.path === decision.path)!, true)));
    pinOpen.delete(kind);
    pinQuotes.set(kind, amount);
    return amount;
  };

  const byPath = new Map(d.clauseSets.map(set => [d.clausePaths.get(set), set]));
  const platform = prepare?.({
    inState: (type, state) => sum(held(type, state), awaits(type, state)),
    clause: path => {
      const set = byPath.get(path);
      if (!set) throw new AmountError(`the request clause ${path} has no written Amount`);
      return starts(set);
    },
    written: NOTHING,
  });

  // Collected by type and state in maps, so no write reaches a prototype: a name is an own name of the record built from them.
  const waiting = new Map<string, Map<string, Amount>>();
  const wait = (type: string, state: string) => waiting.set(type, (waiting.get(type) ?? new Map<string, Amount>()).set(state, awaits(type, state)));
  markers.check();
  for (const form of d.pendingWork) {
    if (!form.settles || !("subject" in form.settles) || markers.marked(form.settles.type)) continue;
    const { type, states } = form.settles;
    for (const state of states) wait(type, state);
  }
  // A state that a timed rule can take to one that awaits a settlement reserves it too.
  for (const rule of moves) for (const state of rule.states) if (!markers.marked(rule.type) && awaits(rule.type, state).entries > 0) wait(rule.type, state);
  const pendingAmounts = Object.fromEntries([...waiting].map(([type, states]) => [type, Object.fromEntries(states)]));
  const pending = entriesOfStates(pendingAmounts);
  // Row 4: a copy in a listed state reserves what the handler that settles it reserves.
  const copyAmounts = d.pendingWork.flatMap((form): PendingWorkAmounts["pendingCopies"][number][] => (form.settles && "copy" in form.settles ? [{ name: form.settles.name, kind: form.settles.kind as ScopeKind, states: form.settles.copy, amount: amountOf(form) }] : []));
  const pendingCopies = copyAmounts.map(({ amount, ...copy }) => ({ ...copy, entries: amount.entries }));
  // Keep the common written maximum for legacy requests. Opt-in platform
  // requests use their originating send's joint written/marked closure.
  const clause = largest(...d.clauseSets.map((c) => starts(c)));
  const clauses = d.wholeCapacity && d.platform ? Object.fromEntries(d.clauseSets.map(set => {
    const path = d.clausePaths.get(set);
    if (path === undefined) throw new AmountError("a reserved clause has no native source path");
    return [path, starts(set)];
  })) : undefined;
  const requests = d.wholeCapacity ? Object.fromEntries(d.pendingWork.flatMap(form => form.requests.map(request => [`${form.path}.sends.${request.send}`, requestAmount(form, request)]))) : undefined;
  const receiverPins = d.wholeCapacity && d.native.receiverPins ? { fallback: pinFallback, byKind: Object.fromEntries(pinKinds.map(kind => [kind, receiverPin(kind)])) } : undefined;
  for (const form of unbounded) d.bad("reserve-unbounded", form.path, "the forms that settle lead back to the state this one settles, so no reservation covers what its settlement can start");
  const marked = unbounded.size === 0 ? markers.data() : null;
  const decisions = Object.fromEntries(d.pendingWork.filter((form) => form.path.startsWith("receives.")).map((form) => [form.path, starts(form.sets)]));
  const decisionEntries = Object.fromEntries(Object.entries(decisions).map(([path, amount]) => [path, amount.entries]));
  return { pendingWorkAmounts: { entry, deadlines: deadlineAmounts, pending: pendingAmounts, pendingCopies: copyAmounts, clause, decisions, ...(requests ? { requests } : {}), ...(clauses ? { clauses } : {}), ...(receiverPins ? { receiverPins } : {}) }, deadlines, pending, pendingCopies, clauseEntries: clause.entries, decisionEntries, ...(marked ? { markers: marked } : {}) };
}
