/**
 * The existing artroom-definition-1 check set (scope contract, section 6).
 * The public entry has already checked the bounded header and canonical
 * size. Keep these checks and their shared pure helpers compatible with
 * this format; a stricter interpretation needs its own authorized version.
 */

import { hasWorkspace } from "../capability/workspace.ts";
import type { Bounds, DeclaredDefinition } from "@generalbusiness/dap-contract";
import { definitionDigest } from "@generalbusiness/dap-bytes";
import { isObject, own } from "../values.ts";
import { capabilities } from "./capability.ts";
import { capacityOf } from "./capacity.ts";
import { mark, marked, type Defining } from "./context.ts";
import { acts, receives } from "./handlers.ts";
import { heldUnderBytes, holdForms, holdTypes } from "./hold.ts";
import { prepareReserving, reserving, type ReservationPlan } from "./holds.ts";
import { itemTypes } from "./items.ts";
import { observes } from "./observes.ts";
import { at, type Rec, type Shapes } from "./shape.ts";
import { decisions } from "./binding.ts";
import { nativeCapacity } from "./native-capacity.ts";
import { setOnce } from "./markers.ts";
import { timedEntryBytes, timedGraph, timedKinds, timedRules } from "./timed.ts";
import { standingOf } from "./standing.ts";
import { AmountError } from "../held.ts";
import type { Profile, ValidateOptions, Validation } from "./index.ts";

/** The sole currently supported definition-format binding; not a new format. */
export const FORMAT_1 = "artroom-definition-1";

/** Continue with the exact already-read header, options and problem list. */
export function validateFormat1(input: unknown, bounds: Bounds, profiles: Readonly<Record<string, Profile>>, options: ValidateOptions, top: Rec, read: Shapes, platform: boolean): Validation {
  const { problems, bad, rec, entries, str } = read;
  // The format-1 checks begin here, after the existing bounded preamble.
  // Durability A0a: omission preserves the original declaration bytes. A level
  // requiring an executor we do not have must never fall back to recording.
  if (Object.hasOwn(top, "level")) {
    const level = rec(top["level"], "level", ["name", "version"]);
    if (level && (level["name"] !== "recorded" || level["version"] !== 1)) {
      bad("unsupported-definition", "level", "this runtime implements only recorded durability version 1");
    }
  }
  // The definition pins its rule for the scope's entire life. Never add a
  // default field to older definitions or reinterpret an unknown version.
  if (Object.hasOwn(top, "capacity")) {
    const capacity = rec(top["capacity"], "capacity", ["name", "version"]);
    if (capacity && (capacity["name"] !== "whole-scope" || capacity["version"] !== 1)) {
      bad("unsupported-definition", "capacity", "this runtime implements only whole-scope capacity version 1");
    }
  }
  // Section 6.1: a definition states its own name, which `under` is compared with. A name that begins `platform:` is the name of a
  // platform definition, which the platform supplies in code, so no declared definition takes one. The platform package alone passes
  // the option `platform`, for the data of a definition that it supplies.
  const named = str(top["name"], "name");
  if (!platform && named?.startsWith("platform:")) bad("shape", "name", "a declared definition's name does not begin with platform:");

  const d: Defining = {
    native: nativeCapacity(),
    wholeCapacity: isObject(top["capacity"]) && top["capacity"]["name"] === "whole-scope",
    ruleInputBytes: 0,
    ...read, bounds, name: typeof top["name"] === "string" ? top["name"] : null, typeNames: new Set(isObject(top["items"]) ? Object.keys(top["items"]) : []), types: new Map(), rules: new Set(), holds: false, holdTypes: new Set(),
    capabilities: new Map(), underived: [],
    indexes: [], clauseSets: [], clauseRetains: new Map(), clausePaths: new Map(), clause: null, pendingWork: [], platform, marks: [], places: new Map(), valueSets: [], bindings: [], observing: false,
  };

  const profile = rec(top["profile"], "profile", ["name", "version"]);
  const evaluator = (profile && own(profiles, `${String(profile["name"])}@${String(profile["version"])}`)) || null;
  if (profile && !evaluator) bad("profile", "profile", "is not a profile this runtime implements");
  // Section 6.5: a rule is a named expression in the profile's language.
  for (const [name, source] of entries(top["rules"], "rules", bounds.rules)) {
    const text = str(source, at("rules", name));
    const refusal = text === null ? null : (evaluator?.admit?.(text) ?? null);
    if (refusal !== null) bad("rule", at("rules", name), refusal);
    d.rules.add(name);
  }
  if (d.wholeCapacity && d.rules.size > 0) {
    const limit = evaluator?.inputBytes;
    if (limit === undefined || !Number.isSafeInteger(limit) || limit <= 0) bad("reserve-unbounded", "profile", "retained rule-input producer has no finite canonical-byte ceiling");
    else d.ruleInputBytes = limit;
  }

  // Section 6.1: each capability the definition uses, by name and version. They are read first: a field type may name one.
  capabilities(d, top["capabilities"]);

  // Fields and items (sections 6.2 and 6.3).
  itemTypes(d, top["items"]);
  // Every later check resolves names against the item types, so a problem above would only repeat itself below.
  if (problems.length > 0) return { ok: false, problems };

  // Acts, handlers and timed rules (sections 6.4 and 5.2).
  const written = isObject(top["acts"]) ? top["acts"] : {};
  const timed = isObject(top["timed"]) ? top["timed"] : {};
  // The hold types are needed before any effect is read: a `hold: open` effect on the primary item of an `open` act.
  holdTypes(d, written);
  acts(d, top["acts"], timed, top);
  receives(d, top["receives"], top);
  timedKinds(d, top["acts"], top["receives"]);
  const timedTypes = new Set<string>(d.holdTypes);
  /** Each timed rule that was read whole: its type, the states it applies in, and the state it leaves its item in. */
  const moves = timedRules(d, top["timed"], timedTypes, top["outcomes"]);

  // Section 17.2, a chain of timed rules. A timed entry is never refused, so the room for every rule of a chain is reserved with
  // the first deadline. When the rules of one type lead to one another in a cycle no chain is finite, and the drain of such an
  // item need never end.
  const graph = timedGraph(moves);
  for (const rule of moves) {
    if (graph.cyclic.has(rule.name)) bad("reserve-unbounded", at("timed", rule.name), "the timed rules of its type lead back to this rule, so no reservation covers what its deadline can start");
  }

  holdForms(d, top);
  // Native workspace staging can open hold@1/check, whose retained ancestry
  // snapshot has no producer byte ceiling. The read limit is not a writer
  // maximum. Item-form holds alone cannot create the required instance.
  if (d.wholeCapacity && d.holdTypes.size > 0 && hasWorkspace({ declared: input as DeclaredDefinition, underived: d.underived })) {
    bad("reserve-unbounded", "capacity", "hold@1/check ancestry-snapshot producer has no finite canonical-byte ceiling");
  }
  // Section 6.4, "`settles` by a mark": no written effect sets a mark but to `true`. Section 17.2a: each key of `decisions` is the
  // message of a handler that states `bound`, whose `of` names that item type.
  setOnce(d);
  decisions(d);

  // Section 6.1, place 7: the mark of the rule for the outcome entries of each kind of operation that this definition owns.
  // "A request of an outcome's rule, and its clauses" (revision 17; row I3-23): the mark may hold one `send`. It is a send mark,
  // because an outcome has no subject and no field for a written send to read, and each effect of its clauses is an effect mark.
  if (platform) {
    for (const [kind, m] of entries(top["outcomes"], "outcomes", null)) {
      // Revision 21, section 17.2: the mark may state `attempts` and `most`, and its send `once`. `holds.ts` reads the three.
      const o = mark(d, m, at("outcomes", kind), "outcome", [], ["send", "attempts", "most", "origin", "observes"]);
      // Revision 20, section 6.1, "The origin of an outcome": one of the two words. With `opening`, nothing more is checked.
      if (o && "origin" in o) {
        d.observing = true;
        if (o["origin"] !== "opening" && o["origin"] !== "rule") bad("shape", at(at("outcomes", kind), "origin"), "is opening or rule");
      }
      // Section 16.1, "The subjects that an entry observes": the rows of each outcome entry of an operation of this kind.
      if (o && "observes" in o) observes(d, o["observes"], at(at("outcomes", kind), "observes"), { where: "outcome" });
      if (!o || !("send" in o)) continue;
      const p = at(at("outcomes", kind), "send");
      const send = marked(o["send"]) ? mark(d, o["send"], p, "send", ["result"], ["once"]) : bad("shape", p, "an outcome's mark holds at most one send, and it is a mark: an outcome's row writes no send");
      const clauses = send ? rec(send["result"], at(p, "result"), [], ["applied", "refused", "superseded", "undelivered", "conflict"]) : null;
      for (const [clause, effects] of Object.entries(clauses ?? {})) {
        d.list(effects, at(at(p, "result"), clause), bounds.effects).forEach((e, i) => {
          const q = at(at(at(p, "result"), clause), i);
          if (marked(e)) mark(d, e, q, "effect", [], ["most"]);
          else bad("shape", q, "a clause of an outcome's send holds effect marks only: an outcome has no subject and no field");
        });
      }
    }
  }

  // Section 6.4: a genesis opens no timed item.
  const genesis = typeof top["genesis"] === "string" ? own(written, top["genesis"]) : undefined;
  if (!isObject(genesis) || genesis["step"] !== "open") bad("genesis", "genesis", "names no open act");
  else if (timedTypes.has(genesis["on"] as string) || (Array.isArray(genesis["effects"]) && genesis["effects"].some((e) => isObject(e) && "hold" in e))) {
    bad("genesis-timed", "genesis", "the genesis act opens a timed item type or has a hold effect");
  }

  if (problems.length > 0) return { ok: false, problems };
  const declared = input as DeclaredDefinition;
  // Section 5.2: a due transition is always written, so its entry must fit whatever its item holds by then.
  for (const [name, rule] of Object.entries(declared.timed)) {
    const most = timedEntryBytes(name, rule, d.types.get(rule.on)!, bounds) + heldUnderBytes(declared, d.holdTypes, rule);
    if (most > bounds.entryBytes) bad("bound", at("timed", name), `its entry could take ${most} bytes; at most ${bounds.entryBytes}`);
  }
  if (problems.length > 0) return { ok: false, problems };
  // Section 17.2: each reservation is derived from the definition. A closure that is not finite is refused.
  let capacity: ReturnType<typeof capacityOf>;
  let reserved: ReturnType<typeof reserving>;
  try {
    let plan: ReservationPlan | undefined;
    const joint = d.wholeCapacity && d.platform;
    capacity = capacityOf(d, graph, moves, joint ? reader => (plan = prepareReserving(d, top, reader, options.outcomeValues ?? {})) : undefined);
    if (problems.length > 0) return { ok: false, problems };
    // The public dispatcher rejects null before this continuation. Keep the existing property read.
    reserved = joint ? plan?.finish(capacity) : reserving(d, top, capacity, options.outcomeValues as Exclude<ValidateOptions["outcomeValues"], null>);
  } catch (error) {
    if (!(error instanceof AmountError)) throw error;
    return { ok: false, problems: [...problems, { code: "reserve-unbounded", path: "capacity", message: error.message }] };
  }
  if (problems.length > 0) return { ok: false, problems };
  // Section 17.2a: a reservation that an item holds, and what each kind of `outcomes` reserves. In platform data only.
  const standing = Object.hasOwn(top, "standing") ? standingOf(d, top["standing"], top["items"], capacity.pendingWorkAmounts.entry) : null;
  const { decisionEntries: _decisionEntries, ...persistedCapacity } = capacity;
  if (problems.length > 0) return { ok: false, problems };
  try {
    const keyed = [...d.types.values()].flatMap((type): [string, readonly string[]][] => (type.indexes ? [[type.name, type.indexes]] : []));
    return { ok: true, definition: { declared, digest: definitionDigest(declared), timedTypes: [...timedTypes].sort(), holdTypes: [...d.holdTypes].sort(), indexes: d.indexes, ...persistedCapacity, underived: d.underived, marks: d.marks, observing: d.observing, ...(d.ruleInputBytes > 0 ? { ruleInputBytes: d.ruleInputBytes } : {}), ...(reserved ? { reserving: reserved } : {}), ...(standing ? { standing } : {}), ...(keyed.length > 0 ? { keyed: Object.fromEntries(keyed) } : {}) } };
  } catch {
    return { ok: false, problems: [{ code: "shape", path: "", message: "has no canonical bytes" }] };
  }
}
