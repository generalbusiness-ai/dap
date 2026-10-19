/**
 * A reservation that an item holds, in the data of a platform definition
 * (scope contract, revision 23, sections 17.2 and 17.2a). This file reads
 * `holds` on an item type, `adds` on an act, and on a mark what its rule may
 * start, `most`, with `attempts` and `once` on a kind of `outcomes`. It
 * makes the checks of section 17.2a, "What the validator checks", and
 * computes the amounts by the functions of `held.ts`.
 *
 * | Check | What is refused | The problem |
 * |---|---|---|
 * | 1 | `adds` on an act whose `on` states no `holds`; a kind that `outcomes` does not have; a count that is no whole number from 1 to the ceiling | `holds` |
 * | 2 | A type that states `holds` as the `most.opens` of a mark of `outcomes` or of a clause, or opened by a handler of an advisory | `holds` |
 * | 4 | A kind that no item holds whose closure is not finite | `reserve-unbounded` |
 * | 5, edge 1 | A kind that no item holds whose mark lists a held kind | `reserve-unbounded` |
 * | 5, edge 2 | A kind that no item holds whose `send` has a clause with an effect mark that lists a held kind | `reserve-unbounded` |
 * | 5, edge 3 | The same, for each kind that no item holds below it: every such kind is checked by edges 1 and 2 | `reserve-unbounded` |
 *
 * A definition with a problem `holds` does not validate. Creation of a scope
 * with no creator or of a child under it is refused: `unsupported-definition`.
 * The ceiling of a count is R4's to set. Until it does, the bound on the elements of a list
 * stands in for it (section 17.2a, check 1).
 *
 * A held kind is in no closure, so held kinds may list each other in a
 * circle. Check 3 is the amounts: no total is written in the data.
 *
 * A kind that states `attempts` is counted by its data. A kind that states
 * none is counted as its rule declares, as before, and may be neither held
 * nor listed by a mark.
 */
// I3 merge: the register and the directory state no `attempts` and no `most` on their kinds (the contract's rows I3-22 and I3-23,
// which wait for the authority note's rows). Their kinds are counted by the closure that their rules declare, as on main.

import { RETAINED_INPUT_BYTES } from "@generalbusiness/dap-contract";
import { fieldRetention, fieldRetainedBytes } from "../field-retention.ts";
import type { FieldType, Held } from "@generalbusiness/dap-contract";
import { AmountError, NOTHING, amountMath, closure, holding, itemOf, one, requestOf, retainedBytes, starts, type Amount, type ClauseStarts, type Counting, type KindStated, type Starts, STARTS_NOTHING } from "../held.ts";
import { markerReservations } from "../markers.ts";
import { isObject, own } from "../values.ts";
import type { Capacity, CapacityReader, PlatformWork } from "./capacity.ts";
import { marked, type Defining } from "./context.ts";
import { at, type Rec } from "./shape.ts";

/** One kind of `outcomes`, with what one operation of it reserves. */
export interface KindReserved {
  /** The most attempts that the data states. Null: it states none, and the kind is counted as its rule declares. */
  attempts: number | null;
  /** The `holds` or the `adds` of some form lists the kind. */
  held: boolean;
  /** What one outcome entry may start, as the mark's `most` states it. */
  most: Starts;
  /** One outcome entry of the kind, with what it may start beside the request of its `send`. For a held kind it is `one(k)` for one outcome entry. */
  outcome: Amount;
  /** The closure C(k) of one operation, or `one(k)` for a held kind. */
  whole: Amount;
  /** What the request of its `send` reserves. Null: its mark holds no send. */
  request: Amount | null;
  /** The `send` states `once`: one operation makes the request at most once. */
  once: boolean;
  /** The held kinds that an outcome of the kind can reach, in one step or in several, by its mark and by a clause of its send: the rule of release reads it. */
  reach: readonly string[];
}

/** What a definition reserves by its `holds`, its `adds` and the marks of its kinds (section 17.2a, check 3). */
export interface Reserving {
  kinds: Readonly<Record<string, KindReserved>>;
  /** By item type: its `holds`, and the whole amount that the taking entry is admitted with. */
  holders: Readonly<Record<string, { holds: Held; amount: Amount }>>;
  /** By act: the type that it is on, its `adds`, and the amount of the addition. */
  adds: Readonly<Record<string, { on: string; adds: Held; amount: Amount }>>;
  /**
   * `req` and `itm`. Both are the largest over every form of the
   * definition, which is never less than over the forms of one account
   * (section 17.2, "More, and never less"). Legacy folded requests use
   * this common amount; opt-in requests retain their originating send's
   * joint written/marked amount below.
   */
  req: Amount;
  itm: Amount;
  /** By message: one bound deciding entry and what its handler's effects can start. Its requests draw on the holder. */
  dec: Readonly<Record<string, Amount>>;
  /** The largest marked clause closure. Opt-in requests use `requests`
   * instead of adding this maximum to an independent written maximum. */
  clause: Amount;
  /** Opt-in: the joint written/marked closure of each originating send. */
  requests?: Readonly<Record<string, Amount>>;
  /** The held kinds that a clause of a request can reach: a final holder keeps their counts while a request of its account is pending. */
  reach: readonly string[];
}

const CLAUSES = ["applied", "refused", "superseded", "undelivered", "conflict"] as const;

type CapacityData = Pick<Capacity, "pendingWorkAmounts" | "markers">;
export interface ReservationPlan extends PlatformWork { finish(capacity: CapacityData): Reserving | undefined }

/** Legacy entry point: its complete written capacities are already known. */
export function reserving(d: Defining, top: Rec, capacity: CapacityData, outcomeValues: Readonly<Record<string, readonly import("../ledger.ts").EvidenceValueDomain[]>> = {}): Reserving | undefined {
  const { sum } = amountMath(d.wholeCapacity);
  const marked = capacity.markers ? markerReservations(capacity.markers, undefined, undefined, d.wholeCapacity) : null;
  return prepareReserving(d, top, {
    inState: (type, state) => sum(
      own(own(capacity.pendingWorkAmounts.deadlines, type), state) ?? NOTHING,
      own(capacity.markers, type) ? marked!.awaits(type, state, []) : (own(own(capacity.pendingWorkAmounts.pending, type), state) ?? NOTHING),
    ),
    clause: path => {
      const amount = own(capacity.pendingWorkAmounts.clauses, path);
      if (!amount) throw new AmountError(`the request clause ${path} has no written Amount`);
      return amount;
    },
    written: capacity.pendingWorkAmounts.clause,
  }, outcomeValues)?.finish(capacity);
}

/** Read marks first. Whole-scope platform work then shares the pending
 * state graph; finish materializes the checked, finite closures. */
export function prepareReserving(d: Defining, top: Rec, reader: CapacityReader, outcomeValues: Readonly<Record<string, readonly import("../ledger.ts").EvidenceValueDomain[]>> = {}): ReservationPlan | undefined {
  if (!d.platform) return undefined;
  const { sum, largest, times } = amountMath(d.wholeCapacity);
  const { bad, rec, int, list, bounds } = d;
  const kindsWritten = isObject(top["outcomes"]) ? top["outcomes"] : {};
  const typesWritten = isObject(top["items"]) ? top["items"] : {};
  const actsWritten = isObject(top["acts"]) ? top["acts"] : {};
  const handlersWritten = isObject(top["receives"]) ? top["receives"] : {};

  /** A count: a whole number from 1 to the ceiling. */
  const count = (v: unknown, path: string): number | null => {
    const n = typeof v === "number" && Number.isSafeInteger(v) && v >= 1 && v <= bounds.listElements ? v : null;
    return n ?? bad("holds", path, `is a whole number from 1 to ${bounds.listElements}`);
  };
  /** Check 1: a `holds` or an `adds`. */
  const heldOf = (v: unknown, path: string): Held | null => {
    const o = isObject(v) ? v : bad("holds", path, "is a record of counts");
    if (!o) return null;
    let ok = true;
    const held: Held = {};
    for (const [name, value] of Object.entries(o)) {
      if (name === "operations") {
        const byKind: [string, number][] = [];
        for (const [kind, n] of Object.entries(isObject(value) ? value : (bad("holds", at(path, name), "is a record of counts, by kind") ?? {}))) {
          if (own(kindsWritten, kind) === undefined) ok = bad("holds", at(at(path, name), kind), "names no kind of outcomes") ?? false;
          const counted = count(n, at(at(path, name), kind));
          if (counted === null) ok = false;
          else byKind.push([kind, counted]);
        }
        if (!isObject(value)) ok = false;
        held.operations = Object.fromEntries(byKind);
      } else if (name === "decisions") {
        // The binding validator reads the counts and checks the bound handler of each message on an item type. Preserve them
        // with the holder for its ledger; an addition is read here too.
        const byMessage: [string, number][] = [];
        for (const [message, n] of Object.entries(isObject(value) ? value : (bad("holds", at(path, name), "is a record of counts, by message") ?? {}))) {
          const counted = count(n, at(at(path, name), message));
          if (counted === null) ok = false;
          else byMessage.push([message, counted]);
        }
        if (!isObject(value)) ok = false;
        held.decisions = Object.fromEntries(byMessage);
      } else if (name === "requests" || name === "items") {
        const counted = count(value, at(path, name));
        if (counted === null) ok = false;
        else held[name] = counted;
      } else ok = bad("holds", at(path, name), "is no count that an item holds: operations, requests, items or decisions") ?? false;
    }
    return ok ? held : null;
  };

  // `holds`, by item type, and `adds`, by act.
  const holds = new Map<string, Held>();
  for (const [type, tv] of Object.entries(typesWritten)) {
    if (!isObject(tv) || !("holds" in tv)) continue;
    const held = heldOf(tv["holds"], at(at("items", type), "holds"));
    if (held) holds.set(type, held);
  }
  const adds = new Map<string, { on: string; adds: Held }>();
  for (const [name, av] of Object.entries(actsWritten)) {
    if (!isObject(av) || !("adds" in av)) continue;
    const path = at(at("acts", name), "adds");
    const added = heldOf(av["adds"], path);
    const on = typeof av["on"] === "string" && isObject(own(typesWritten, av["on"])) && "holds" in (own(typesWritten, av["on"]) as Rec) ? av["on"] : null;
    if (on === null) bad("holds", path, "an act adds to an item whose type states holds");
    // The act is on a holder that exists before its entry. An `open` act opens its item, which then takes the type's `holds`.
    else if (av["step"] !== "transition") bad("holds", path, "an act that adds is a transition on its holder");
    else if (added) {
      for (const message of Object.keys(added.decisions ?? {})) {
        if (!d.bindings.some((binding) => binding.message === message && binding.type === on)) bad("name", at(at(path, "decisions"), message), `is the message of no tell handler that states bound, whose of names ${on}`);
      }
      adds.set(name, { on, adds: added });
    }
  }
  const holderTypes = new Set(Object.entries(typesWritten).filter(([, tv]) => isObject(tv) && "holds" in tv).map(([type]) => type));
  const held = new Set([...holds.values(), ...[...adds.values()].map((a) => a.adds)].flatMap((h) => Object.keys(h.operations ?? {})));

  /** What a mark states that its rule may start. A mark with no `most` starts nothing by the data. */
  const mostOf = (m: unknown, path: string): Starts => {
    if (!isObject(m) || !("most" in m)) return STARTS_NOTHING;
    const p = at(path, "most");
    const o = rec(m["most"], p, ["effects"], ["operations", "opens"]);
    if (!o) return STARTS_NOTHING;
    const effects = int(o["effects"], at(p, "effects")) ?? 0;
    if (effects > bounds.derivedEffects) bad("bound", at(p, "effects"), `at most ${bounds.derivedEffects}`);
    const operations: string[] = [];
    list("operations" in o ? o["operations"] : [], at(p, "operations"), bounds.listElements).forEach((kind, i) => {
      if (typeof kind !== "string" || own(kindsWritten, kind) === undefined) bad("name", at(at(p, "operations"), i), "names no kind of outcomes");
      else if (operations.includes(kind)) bad("shape", at(at(p, "operations"), i), "a mark lists a kind once: one outcome entry opens one operation of each kind");
      else operations.push(kind);
    });
    let opens: string | null = null;
    if ("opens" in o) {
      if (typeof o["opens"] === "string" && d.types.has(o["opens"])) opens = o["opens"];
      else bad("name", at(p, "opens"), "names no item type");
    }
    return { effects, operations, opens };
  };
  /** The clauses of one send, each with its effect marks. `opening`: the mark of a clause opens no holder (check 2). */
  const everyClause: ClauseStarts[] = [];
  const clausesOf = (send: unknown, path: string): { path: string; starts: ClauseStarts }[] => {
    const result = isObject(send) && isObject(send["result"]) ? send["result"] : {};
    const observes = isObject(send) && isObject(send["observes"]) ? send["observes"] : {};
    const matched: { path: string; starts: ClauseStarts }[] = [];
    for (const clause of CLAUSES) {
      const effects = own(result, clause);
      const rows = own(observes, clause);
      // A missing effect list is the empty clause at runtime. Its
      // observation rows still declare values the deciding entry retains.
      if (!Array.isArray(effects) && rows === undefined) continue;
      const p = at(at(path, "result"), clause);
      const marks = (Array.isArray(effects) ? effects : []).flatMap((e, i) => (marked(e) ? [mostOf(e, at(p, i))] : []));
      for (const mark of marks) if (mark.opens !== null && holderTypes.has(mark.opens)) bad("holds", p, `a type that states holds is opened only by new work, and a clause's mark may open ${mark.opens}`);
      // Conflict is new work. Keep its marks for item/reach accounting,
      // while requestOf excludes it from an owed request's reservation.
      matched.push({ path: p, starts: d.wholeCapacity ? {
        marks, retains: 0,
        get written() { return path.startsWith("outcomes.") || clause === "conflict" ? NOTHING : reader.clause(p); },
        reserved: clause !== "conflict",
      } : { marks, retains: retainedBytes(rows) } });
    }
    everyClause.push(...matched.map((clause) => clause.starts));
    return matched;
  };

  // The kinds of `outcomes`.
  const stated = new Map<string, KindStated>();
  const sends = new Map<string, { once: boolean; clauses: { path: string; starts: ClauseStarts }[] }>();
  const mosts = new Map<string, Starts>();
  for (const [kind, m] of Object.entries(kindsWritten)) {
    if (!isObject(m)) continue;
    const path = at("outcomes", kind);
    const most = mostOf(m, path);
    mosts.set(kind, most);
    // Check 2: an outcome entry is never asked whether it fits, so it opens no holder.
    if (most.opens !== null && holderTypes.has(most.opens)) bad("holds", at(at(path, "most"), "opens"), "a type that states holds is opened only by new work, and no outcome's mark opens one");
    const send = isObject(m["send"]) ? m["send"] : null;
    if (send && "once" in send && send["once"] !== true) bad("shape", at(at(path, "send"), "once"), "is true, or is left out");
    const clauses = send ? clausesOf(send, at(path, "send")) : [];
    if (send) sends.set(kind, { once: send["once"] === true, clauses });
    const attempts = "attempts" in m ? int(m["attempts"], at(path, "attempts"), 1) : null;
    if (attempts !== null) stated.set(kind, { attempts, most, send: send ? { once: send["once"] === true, clauses: clauses.map((clause) => clause.starts) } : null, retains: retainedBytes(m["observes"]) + evidenceBytes(d, own(outcomeValues, kind), path) });
    else if ("most" in m) bad("shape", at(path, "most"), "a kind that states what its outcomes may start states its attempts");
    else if (held.has(kind)) bad("holds", path, "a kind that an item holds states its attempts");
  }

  // The marks of the written lists of acts and handlers, and the clauses of their sends.
  const opened = new Set<string>();
  const requestClauses = new Map<string, readonly ClauseStarts[]>();
  const formMarks = new Map<string, readonly Starts[]>();
  const forms = (written: Rec, family: string) => {
    for (const [name, fv] of Object.entries(written)) {
      if (!isObject(fv)) continue;
      const path = at(family, name);
      const marks: Starts[] = [];
      (Array.isArray(fv["effects"]) ? fv["effects"] : []).forEach((e, i) => {
        const most = marked(e) ? mostOf(e, at(at(path, "effects"), i)) : STARTS_NOTHING;
        // Check 2: a handler of an advisory is no request, so its entry opens no holder.
        if (most.opens !== null && holderTypes.has(most.opens) && fv["class"] === "advisory") bad("holds", at(at(path, "effects"), i), "a type that states holds is opened only by new work, and no handler of an advisory opens one");
        if (most.opens !== null) opened.add(most.opens);
        if ("settles" in fv) {
          // Section 6.4 / 17.2: a settling form's rule changes no state.
          // Its mark counts operations and its opening, not arbitrary
          // state-change edges. The runtime rejects those state effects.
          if (d.wholeCapacity && most.opens !== null && holderTypes.has(most.opens)) bad("holds", at(at(path, "effects"), i), "a settling form's mark cannot open a type that states holds; only new work opens a holder");
          if (!d.wholeCapacity && (most.opens !== null || most.operations.some(kind => !held.has(kind)))) bad("reserve-unbounded", at(at(path, "effects"), i), "a form that declares settles holds a mark that may open an item, or an operation of a kind that no item holds, and no reservation of this source counts what such a mark starts");
        }
        if (marked(e)) marks.push(d.wholeCapacity && "settles" in fv ? { ...most, effects: 0 } : most);
      });
      formMarks.set(path, marks);
      const opening = family === "acts" && fv["step"] === "open" ? fv["on"] : fv["opens"];
      if (d.wholeCapacity && "settles" in fv && typeof opening === "string" && holderTypes.has(opening)) bad("holds", at(path, family === "acts" ? "on" : "opens"), "a settling form cannot open a type that states holds; only new work opens a holder");
      if (fv["class"] === "advisory" && typeof fv["opens"] === "string" && holderTypes.has(fv["opens"])) bad("holds", at(path, "opens"), "a type that states holds is opened only by new work, and no handler of an advisory opens one");
      (Array.isArray(fv["sends"]) ? fv["sends"] : []).forEach((s, i) => {
        if (!isObject(s)) return;
        const send = marked(s) ? s : Object.values(s).find((form) => isObject(form) && "result" in form);
        const origin = at(at(path, "sends"), i);
        const clauses = clausesOf(send, marked(s) ? origin : at(origin, Object.keys(s)[0] ?? ""));
        if (send && d.wholeCapacity) requestClauses.set(origin, clauses.map(clause => clause.starts));
        for (const clause of clauses) for (const mark of clause.starts.marks) if (mark.opens !== null) opened.add(mark.opens);
      });
    }
  };
  forms(actsWritten, "acts");
  const handlerBodies = Object.fromEntries(Object.entries(handlersWritten).flatMap(([name, form]) => {
    if (!isObject(form)) return [[name, form]];
    const late = isObject(form["late"]) ? form["late"] : null;
    const branch = late && isObject(late["then"]) ? late["then"] : null;
    return branch ? [[name, form], [`${name}.late.then`, { ...form, effects: branch["effects"] ?? [], sends: branch["sends"] ?? [], attention: branch["attention"] ?? [] }]] : [[name, form]];
  }));
  forms(handlerBodies, "receives");
  for (const most of mosts.values()) if (most.opens !== null) opened.add(most.opens);
  for (const send of sends.values()) for (const clause of send.clauses) for (const mark of clause.starts.marks) if (mark.opens !== null) opened.add(mark.opens);

  // A kind that a mark lists is counted by the data, so it states its attempts.
  for (const [kind, most] of mosts) for (const listed of most.operations) if (!stated.has(listed)) bad("shape", at(at(at("outcomes", kind), "most"), "operations"), `the kind ${listed} is listed, and states no attempts`);

  if (!d.wholeCapacity && kindsWritten && Object.keys(kindsWritten).length === 0 && holderTypes.size === 0 && adds.size === 0) return undefined;

  const everyState = () => [...d.types.values()].flatMap((type) => [...type.states.keys()].map((state) => reader.inState(type.name, state)));
  const c: Counting = {
    checked: d.wholeCapacity,
    kinds: Object.fromEntries(stated), held,
    initial: (type) => { const of = d.types.get(type); return of ? reader.inState(type, of.initial) : NOTHING; },
    change: d.wholeCapacity ? NOTHING : largest(...everyState()),
    // No graph edge exists when the mark changes zero states. Every
    // state's Amount is still checked at finish, including unused states.
    ...(d.wholeCapacity ? { changing: (effects: number) => times(effects, effects === 0 ? NOTHING : largest(...everyState())) } : {}),
    entry: bounds.entryBytes,
    written: d.wholeCapacity ? NOTHING : reader.written,
  };

  const request = (path: string): Amount | undefined => {
    const clauses = requestClauses.get(path);
    if (!clauses) return undefined;
    const amount = requestOf(c, clauses, { item: true });
    if (!amount) throw new AmountError(`the request ${path} has no finite clause Amount`);
    return amount;
  };

  const effects = (path: string): Amount => {
    const marks = formMarks.get(path);
    if (!marks) throw new AmountError(`the form ${path} has no marked-effect closure`);
    return sum(...marks.map(mark => {
      const amount = starts(c, mark, { item: true });
      if (!amount) throw new AmountError(`the form ${path} has no finite marked-effect Amount`);
      return amount;
    }));
  };

  return { request, effects, finish(capacity) {
    if (d.wholeCapacity) largest(...everyState());

    // Checks 4 and 5, for each kind that no item holds, and so for each such kind below another (edge 3).
    for (const [kind, of] of stated) {
      if (held.has(kind)) continue;
      const path = at("outcomes", kind);
      const listed = of.most.operations.find((k) => held.has(k));
      if (listed !== undefined) { bad("reserve-unbounded", at(path, "most"), `no item holds this kind, and its mark lists the held kind ${listed}: an outcome entry of it has no account, so no holder is named for what it opens`); continue; }
      const inClause = sends.get(kind)?.clauses.find((clause) => clause.starts.marks.some((mark) => mark.operations.some((k) => held.has(k))));
      if (inClause) { bad("reserve-unbounded", inClause.path, "no item holds this kind, and a clause of its send holds a mark that lists a held kind: the request has no account, so nothing keeps the holder's count until the clause runs"); continue; }
      if (!closure(c, kind)) bad("reserve-unbounded", path, "the kinds that no item holds open each other in a circle, so no reservation by kind covers one operation of this kind");
    }
    if (d.problems.length > 0) return undefined;

    /** The held kinds that one step from a kind reaches: by its mark, and by a clause of its send. */
    const step = (kind: string): string[] => [...(mosts.get(kind)?.operations ?? []), ...(sends.get(kind)?.clauses ?? []).flatMap((clause) => clause.starts.marks.flatMap((mark) => mark.operations))].filter((k) => held.has(k));
    const reachFrom = (first: readonly string[]): string[] => {
      const matched = new Set<string>();
      const todo = [...first];
      for (let k = todo.pop(); k !== undefined; k = todo.pop()) if (!matched.has(k)) { matched.add(k); todo.push(...step(k)); }
      return [...matched].sort();
    };

    const req = requestOf(c, everyClause, { item: true });
    const marksOfClause = (clause: ClauseStarts): Amount | null => clause.marks.reduce<Amount | null>((n, mark) => { const more = starts(c, mark, { item: true }); return n && more ? sum(n, more) : null; }, { ...NOTHING, bytes: clause.retains });
    const byClause = everyClause.map(marksOfClause);
    if (!req || byClause.includes(null)) { bad("reserve-unbounded", "", "a clause of a result holds a mark that lists a kind whose closure is not finite"); return undefined; }

    // Every nonempty own name is permitted, including __proto__. Neither
    // table has an inherited setter that can turn a kind into a prototype.
    const kinds: Record<string, KindReserved> = Object.create(null);
    const ones: Record<string, Amount> = Object.create(null);
    for (const kind of Object.keys(kindsWritten)) {
      const of = stated.get(kind);
      const isHeld = held.has(kind);
      const whole = of ? (isHeld ? one(c, kind) : closure(c, kind)) : NOTHING;
      const send = sends.get(kind);
      const request = send ? requestOf(c, send.clauses.map((clause) => clause.starts), { item: true }) : null;
      if (!whole || (send && !request)) { bad("reserve-unbounded", at("outcomes", kind), "a kind that its mark or a clause of its send lists has no finite closure"); continue; }
      // One outcome entry with what it starts, beside the request: for a held kind, `one(k)` over n(k); for another, C(k) without its requests, over n(k).
      const started = of ? starts(c, of.most, { item: !isHeld }) : null;
      const outcome = of && started ? sum({ ...NOTHING, entries: 1, bytes: c.entry + of.retains }, started) : NOTHING;
      kinds[kind] = { attempts: of?.attempts ?? null, held: isHeld, most: mosts.get(kind) ?? STARTS_NOTHING, outcome, whole, request, once: send?.once === true, reach: reachFrom(step(kind)) };
      if (isHeld) ones[kind] = whole;
    }
    if (d.problems.length > 0) return undefined;

    const requests = d.wholeCapacity ? Object.fromEntries([...requestClauses.keys()].map(path => [path, request(path)!])) : undefined;

    const itm = itemOf(c, [...opened].filter((type) => !holderTypes.has(type)));
    // dec(m): a bound handler opens no item directly and its sends draw on
    // q. Its written effects can start deadlines/settlements, and an effect
    // mark can open a kind that no item holds, whose whole closure is here.
    const decisions = new Map<string, Amount[]>();
    for (const binding of d.bindings) {
      const path = binding.path.slice(0, -".bound".length);
      const handler = Object.entries(handlersWritten).find(([name]) => at("receives", name) === path)?.[1];
      if (!isObject(handler)) continue;
      const written = own(capacity.pendingWorkAmounts.decisions, path) ?? NOTHING;
      // Platform RuleEffect cannot write capability records or copies.
      // Written native producers and their closures are in `written`;
      // a state/slot update creates no counted record key of its own.
      const producer = d.pendingWork.find(form => form.path === path)!.retained;
      const retained = d.wholeCapacity ? sum({ ...NOTHING, bytes: fieldRetainedBytes(producer, bounds) }, { ...NOTHING, bytes: d.rules.size * d.ruleInputBytes }).bytes : bounds.entryBytes;
      let amount: Amount | null = sum({ ...NOTHING, entries: 1, records: d.wholeCapacity ? 0 : bounds.derivedEffects, bytes: bounds.entryBytes }, { ...NOTHING, bytes: retained }, written);
      for (const mark of formMarks.get(path) ?? []) {
        const more = starts(c, mark, { item: false });
        amount = amount && more ? sum(amount, more) : null;
      }
      if (!amount) { bad("reserve-unbounded", binding.path, "a bound handler's mark lists a kind with no finite closure"); continue; }
      if (!d.wholeCapacity) {
        const retains = fieldRetention(Object.values(isObject(handler["fields"]) ? handler["fields"] : {}) as FieldType[], bounds);
        amount = sum(amount, { ...NOTHING, bytes: Math.min(retains.facts, Math.max(0, bounds.usesPerEntry - 1)) * bounds.entryBytes + retains.texts });
      }
      decisions.set(binding.message, [...(decisions.get(binding.message) ?? []), amount]);
    }
    if (d.problems.length > 0) return undefined;
    const dec = Object.fromEntries([...decisions].map(([message, amounts]) => [message, largest(...amounts)]));
    const amounts = { one: ones, req, itm, dec, checked: d.wholeCapacity };
    return {
      kinds,
      holders: Object.fromEntries([...holds].map(([type, of]) => [type, { holds: of, amount: holding(of, amounts) }])),
      adds: Object.fromEntries([...adds].map(([name, of]) => [name, { on: of.on, adds: of.adds, amount: holding(of.adds, amounts) }])),
      req, itm, dec,
      ...(requests ? { requests } : {}),
      clause: largest(...(byClause as Amount[])),
      reach: reachFrom(everyClause.flatMap((clause) => clause.marks.flatMap((mark) => mark.operations)).filter((k) => held.has(k))),
    };
  } };
}

/** Every outcome reserves one value at its domain's declared maximum, whether an answer names one or not. */
function evidenceBytes(d: Defining, domains: readonly import("../ledger.ts").EvidenceValueDomain[] | undefined, path: string): number {
  if (domains === undefined) return 0;
  const seen = new Set<string>();
  let bytes = 0;
  for (const domain of domains) {
    if (typeof domain.domain !== "string" || domain.domain.length === 0 || seen.has(domain.domain) || !Number.isSafeInteger(domain.max) || domain.max < 1 || domain.max > RETAINED_INPUT_BYTES) {
      d.bad("shape", path, "the owner declares distinct evidence value domains, each with a positive bound at most one retained input");
      continue;
    }
    seen.add(domain.domain);
    bytes += domain.max;
  }
  return bytes;
}
