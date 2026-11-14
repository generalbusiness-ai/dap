/** Guard forms (scope contract, section 6.5). */

import type { FieldType, Subject } from "@generalbusiness/dap-contract";
import { isObject } from "../values.ts";
import { capabilityGuard } from "./capability.ts";
import { bindElement, mark, marked, onSubject, ownerOf, subject, type Ctx, type Defining, type ReadOwner, type Type } from "./context.ts";
import { fieldOf, isDetached, operand, type Read } from "./operands.ts";
import { at, type Rec } from "./shape.ts";
import { recordElementBinding, recordField, recordForeignField, recordRange, recordSlot } from "../program/reads.ts";
import { enterForm, leaveForm, type GuardOp } from "../program/structure.ts";
import type { BoundPlan, FactMatch, FactSource, GuardCode, GuardPlan, ListSource, MissingRead, RangePlan, WherePlan } from "../program/guard-plan.ts";
import { beginGuardList, endGuardList, recordGuardPlan, recordRangePlan, type FormTrace, type GuardListPlace, type RangeUse } from "../program/structure.ts";
import type { ElementBinding, EntryRead, OperandRead, SlotRead } from "../program/reads.ts";

const GUARDS = ["state", "signer", "notIn", "set", "unset", "equals", "differs", "some", "none", "count", "every", "fact", "before", "after", "rule", "each", "has", "anyOf", "distinct", "sameSet", "capability"] as const satisfies readonly GuardOp[];

/** The guards of one written list, counted with those nested in them (section 6.1). */
interface Nesting { count: number }

/**
 * The clauses of a `where` or a `match`: each an `equals` or a `differs` of
 * two operands. A slot with no `of` is read from the item that `owner`
 * gives. Returns the slots of that item which the clauses read.
 */
function clauses(d: Defining, v: unknown, path: string, ctx: Ctx, owner: ReadOwner, guard: boolean): { slots: Set<string>; plan: readonly WherePlan[] } {
  const slots = new Set<string>();
  const plan: WherePlan[] = [];
  d.list(v, path, d.bounds.guards).forEach((w, i) => {
    const f = d.form(w, at(path, i), ["equals", "differs"]);
    const pair = f && d.rec(f[1], at(path, i), ["a", "b"]);
    if (!pair) return;
    // Section 6.5: each operand is validated by itself.
    const reads: (Read | null)[] = [];
    for (const side of ["a", "b"]) {
      const read = operand(d, pair[side], at(at(path, i), side), ctx, owner, guard);
      reads.push(read);
      const slot = read?.slot;
      if (typeof slot === "string") slots.add(slot);
    }
    if (reads[0] && reads[1]) plan.push(Object.freeze({ op: f![0] as "equals" | "differs", a: reads[0].node, b: reads[1].node, path: at(path, i) }));
  });
  return { slots, plan: Object.freeze(plan) };
}

/**
 * A range: the local items of one type, in the listed states, that pass
 * every clause of its `where`, but those of the `except` subjects. `more`:
 * the members that the form which holds the range takes beside it. `guard`:
 * the range is read by a guard, which may not read the item that its act
 * opens. Returns the type, and the record as it was read.
 */
export function range(d: Defining, x: unknown, p: string, ctx: Ctx, more: readonly string[] = [], guard = true, use: RangeUse = "guard"): { type: Type; read: Rec; program: RangePlan } | null {
  const { bounds, types, indexes, bad, rec, list, names } = d;
  const r = rec(x, p, ["type", "states"], ["where", "except", ...more]);
  if (!r) return null;
  const t = typeof r["type"] === "string" ? types.get(r["type"]) : undefined;
  if (!t) return bad("name", at(p, "type"), "names no item type");
  const states = names(r["states"], at(p, "states"), t.states, "state");
  recordRange(d, ctx, p, t, states);
  // In a `where`, a slot with no `of` is a slot of each item the range covers.
  const where = clauses(d, r["where"] ?? [], at(p, "where"), ctx, ownerOf(() => t, { kind: "range", path: p, type: t.name }), guard), slots = where.slots;
  if (slots.size > 0 || (Array.isArray(r["where"]) && r["where"].length > 0)) indexes.push({ path: p, type: t.name, slots: [...slots].sort() });
  // Section 6.5: the items of those subjects are left out. A subject of another type could leave nothing out.
  const except: Subject[] = [];
  if ("except" in r) list(r["except"], at(p, "except"), bounds.also + 1).forEach((s, i) => {
    const named = subject(d, s, at(at(p, "except"), i), ctx, false);
    if (named === null || named === "scope") return;
    if (named.name !== t.name) bad("name", at(at(p, "except"), i), `names no subject of type ${t.name}`);
    else if (ctx.nascent && onSubject(s)) bad("nascent-guard", at(at(p, "except"), i), "the item this entry opens is not in the range yet");
    except.push(typeof s === "string" ? s as Subject : "on");
  });
  const program = Object.freeze({ type: t.name, states: Object.freeze([...states]), where: where.plan, except: Object.freeze(except) });
  recordRangePlan(d, r, use, program);
  return { type: t, read: r, program };
}

/** One guard of an act or handler. `depth`: how deep it is nested; a guard as written is at 1. `inherited`: the subject of the guard that holds it. */
export function guard(d: Defining, v: unknown, path: string, ctx: Ctx, nesting: Nesting = { count: 0 }, depth = 1, inherited?: unknown): FormTrace | null {
  nesting.count++;
  const f = d.form(v, path, GUARDS, ["of", "ifPresent", "reason"]);
  if (!f) return null;
  const traced = enterForm(d, "guard", f[0] as GuardOp, path, v);
  try {
    const plan = guardBody(d, v, path, ctx, nesting, depth, inherited, f);
    if (plan) recordGuardPlan(traced, plan);
  }
  finally { leaveForm(d, traced); }
  return traced;
}

function guardBody(d: Defining, v: unknown, path: string, ctx: Ctx, nesting: Nesting, depth: number, inherited: unknown, f: readonly [string, unknown]): GuardPlan<FormTrace> | null {
  const { bounds, rules, bad, rec, form, list, int, bool, names, str } = d;
  const [k, x] = f;
  const o = v as Rec;
  const p = at(path, k);
  if ("of" in o && subject(d, o["of"], at(path, "of"), ctx, true) === null) return null;
  // Section 6.5: a nested guard takes the enclosing guard's subject unless it names its own.
  const of = "of" in o ? o["of"] : inherited;
  /** The subject as an item this guard reads. The item an `open` act opens has nothing to read yet. */
  const item = ownerOf((): Type | null => {
    const s = subject(d, of, path, ctx, false);
    if (s === null || s === "scope") return null;
    if (ctx.nascent && onSubject(of)) return bad("nascent-guard", path, "a guard may not read the item its act opens");
    return s;
  }, { kind: "subject", name: typeof of === "string" ? of : "on" });
  const readSlot = (type: Type, name: string, slotPath: string): SlotRead | null => {
    const slot = type.slots.get(name);
    return slot ? recordSlot(d, ctx, slotPath, type, item.identity, name, slot, "read").slot : null;
  };
  let code: GuardCode<FormTrace> | null = null;
  const absent: MissingRead[] = [];
  const missing = (read: OperandRead): void => {
    if (read.op === "field" || read.op === "presented") absent.push(Object.freeze({ kind: read.op, name: read.name }));
    const entry = (part: EntryRead) => { if (part.op === "set") missing(part.item); };
    if (read.op === "source") entry(read.entry);
    // Preserve the original skip boundary: projection wrappers do not add
    // their nested set selectors to ifPresent's missing-field checks.
    if (read.projection && read.projection.op !== "project") entry(read.projection);
  };
  let namesField = false;
  /** A field or a presented fact that the operand names: what `ifPresent` is for. */
  const named = (read: Read | null) => {
    if (read && (read.fields.length > 0 || read.form === "presented")) namesField = true;
    if (read) missing(read.node);
  };
  const pair = (e: unknown, ep: string, a: (v: unknown, path: string) => Read | null) => {
    const r = rec(e, ep, ["a", "b"]);
    if (!r) return null;
    // Section 6.5: each operand is validated by itself. A valid first operand excuses nothing about the second.
    const first = a(r["a"], at(ep, "a")); named(first);
    const second = operand(d, r["b"], at(ep, "b"), ctx, item); named(second);
    return [first, second] as const;
  };
  /** The guards nested in a list form, each with what the form binds. */
  const nested = (gs: unknown, gp: string, inner: Ctx): readonly FormTrace[] => {
    if (depth >= bounds.guardDepth) { bad("bound", gp, `guards are nested at most ${bounds.guardDepth} deep`); return []; }
    const children: FormTrace[] = [];
    const scope = beginGuardList(d, gs, "guards");
    try { list(gs, gp, bounds.guards).forEach((g, i) => { const child = guard(d, g, at(gp, i), inner, nesting, depth + 1, of); if (child) children.push(child); }); }
    finally { endGuardList(d, scope); }
    return Object.freeze(children);
  };
  /**
   * The list that a list form reads, and the name it binds each element to.
   * Returns what the forms inside it may name: the element, with its type
   * when the definition states it. A `state` guard inside the form shows
   * nothing about the subject for the effects, so `live` is its own.
   */
  const binding = (r: Rec): { ctx: Ctx; list: OperandRead; binding: ElementBinding } | null => {
    const read = operand(d, r["list"], at(p, "list"), { ...ctx, readList: true }, item);
    const as = str(r["as"], at(p, "as"));
    if (as?.includes(".")) return bad("shape", at(p, "as"), "a dot names a member of a record element, so the name has none");
    if (!read || as === null) return null;
    if (read.type !== null && read.type.type !== "list") return bad("name", at(p, "list"), "names no list");
    const element: FieldType | null = read.type?.type === "list" ? read.type.of : null;
    const inner = bindElement(ctx, as, element, at(p, "as"));
    const binding = recordElementBinding(d, inner, as, element, at(p, "as"));
    return { ctx: { ...inner, live: new Set() }, list: read.node, binding };
  };
  switch (k) {
    case "state": {
      const t = item();
      if (t) {
        const states = names(x, p, t.states, "state");
        if (states.every((s) => t.states.get(s) === false)) ctx.live.add((of as string | undefined) ?? "on");
        code = { op: "state", states: Object.freeze([...states]) };
      }
      break;
    }
    case "signer": case "notIn": {
      if (!ctx.signer) bad("name", p, "there is no signer here");
      const t = item();
      if (t) {
        const slots = names(x, p, { has: (s) => t.slots.get(s)?.kind === "party" }, "party slot");
        for (const name of slots) readSlot(t, name, p);
        code = { op: k, slots: Object.freeze([...slots]) };
      }
      break;
    }
    case "set": case "unset": {
      const t = item();
      if (t && (typeof x !== "string" || !t.slots.has(x))) bad("name", p, "names no slot");
      const slot = t && typeof x === "string" ? readSlot(t, x, p) : null;
      if (slot) code = { op: k, slot };
      break;
    }
    case "equals": case "differs": {
      const reads = pair(x, p, (a, ap) => operand(d, a, ap, ctx, item));
      if (reads?.[0] && reads[1]) code = { op: k, a: reads[0].node, b: reads[1].node };
      break;
    }
    case "some": case "none": case "count": {
      const resolved = range(d, x, p, ctx, k === "count" ? ["min", "max"] : []), r = resolved?.read;
      if (!resolved || !r) break;
      if (k !== "count") { code = { op: k, range: resolved.program }; break; }
      const plans: Record<"min" | "max", BoundPlan> = { min: Object.freeze({ op: "absent" }), max: Object.freeze({ op: "absent" }) };
      // Section 6.5: a bound is a number, or an operand that reads one from a slot or a field.
      const bound = (name: "min" | "max"): number | null | undefined => {
        if (!(name in r)) return undefined;
        if (!isObject(r[name])) {
          const value = int(r[name], at(p, name));
          if (value !== null) plans[name] = Object.freeze({ op: "literal", value });
          return value;
        }
        const read = operand(d, r[name], at(p, name), ctx, item);
        if (read?.type && read.type.type !== "int") bad("name", at(p, name), "names no integer");
        if (read) plans[name] = Object.freeze({ op: "read", read: read.node });
        return null;
      };
      const [min, max] = [bound("min"), bound("max")];
      if (min === undefined && max === undefined) bad("shape", p, "a count needs a min or a max");
      if (typeof min === "number" && typeof max === "number" && min > max) bad("shape", p, "min is above max");
      code = { op: "count", range: resolved.program, min: plans.min, max: plans.max };
      break;
    }
    case "every": {
      const r = rec(x, p, ["list", "states"]);
      if (!r) break;
      // A field of that name, when the act has one; otherwise a slot of the subject.
      let type = fieldOf({ field: r["list"] }, ctx);
      let source: ListSource | null = null;
      if (type) {
        namesField = true;
        source = { op: "field", field: recordField(d, ctx, at(p, "list"), r["list"] as string, type) };
        absent.push(Object.freeze({ kind: "field", name: r["list"] as string }));
      }
      else {
        const t = item();
        if (!t) break;
        type = (typeof r["list"] === "string" && t.slots.get(r["list"])?.type) || null;
        const slot = type ? readSlot(t, r["list"] as string, at(p, "list")) : null;
        if (slot) source = { op: "slot", slot };
      }
      const listed = type?.type === "list" && type.of.type === "item" ? d.types.get(type.of.of) : undefined;
      if (!listed) bad("name", at(p, "list"), "names no field or slot that is a list of items");
      else {
        const states = names(r["states"], at(p, "states"), listed.states, "state");
        if (source) code = { op: "every", list: Object.freeze(source), states: Object.freeze([...states]) };
      }
      break;
    }
    case "fact": {
      // Section 6.5: the entry is named by a field, by a fact presented beside the intent, or by an element that a list form binds.
      const by = form(x, p, ["field", "presented", "element"], ["where"]);
      if (!by) break;
      const r = x as Rec;
      let source: FactSource | null = null, factType: Extract<FieldType, { type: "fact" }> | null = null;
      const matches: FactMatch[] = [];
      if (by[0] === "field") {
        namesField = true;
        const type = fieldOf(r, ctx);
        if (type?.type !== "fact") bad("name", at(p, "field"), "names no field of type fact");
        if (type) source = { op: "field", field: recordField(d, ctx, at(p, "field"), by[1] as string, type) };
        if (type?.type === "fact") factType = type;
        absent.push(Object.freeze({ kind: "field", name: by[1] as string }));
      } else {
        if ("where" in r) { bad("shape", at(p, "where"), "is for a fact that a field names"); break; }
        const read = operand(d, { [by[0]]: by[1] }, at(p, by[0]), ctx, item);
        named(read);
        // The kind and the definition's name are compared with the type, so the definition must state it.
        if (read && read.type?.type !== "fact") bad("name", at(p, by[0]), `names no ${by[0] === "presented" ? "presented fact" : "element"} of type fact`);
        if (read?.type?.type === "fact") code = { op: "fact", source: Object.freeze({ op: "read", read: read.node }), type: read.type, where: Object.freeze([]) };
        break;
      }
      // `a` is a field of the named entry's intent or message, which this definition cannot resolve; `b` is read in this act.
      list(r["where"] ?? [], at(p, "where"), bounds.guards).forEach((w, i) => {
        const wo = rec(w, at(at(p, "where"), i), ["equals"]);
        if (wo) {
          let name: string | null = null;
          const reads = pair(wo["equals"], at(at(p, "where"), i), (a, ap) => {
            if (isObject(a) && Object.keys(a).length === 1 && typeof a["field"] === "string") {
              name = a["field"];
              recordForeignField(d, ctx, ap, by[1] as string, name);
              return null;
            }
            return bad("shape", ap, "must be a field of the entry's intent or message");
          });
          if (name !== null && reads?.[1]) matches.push(Object.freeze({ name, value: reads[1].node }));
        }
      });
      if (source && factType) code = { op: "fact", source: Object.freeze(source), type: factType, where: Object.freeze(matches) };
      break;
    }
    case "before": case "after": {
      const r = rec(x, p, ["slot"]);
      const t = r && item();
      const s = t && typeof r["slot"] === "string" ? t.slots.get(r["slot"]) : undefined;
      if (t && !(s?.kind === "value" && s.type.type === "time")) bad("name", p, "names no value slot of type time");
      if (t && s) code = { op: k, slot: recordSlot(d, ctx, at(p, "slot"), t, item.identity, r!["slot"] as string, s, "read").slot };
      break;
    }
    case "rule":
      if (typeof x !== "string" || !rules.has(x)) bad("rule", p, "names no rule the definition declares");
      // Section 6.2: a rule reads the fields and the subjects' records whole (section 6.5), so it would read a detached value.
      if ([...(ctx.fields?.values() ?? [])].some(isDetached) || [ctx.on, ...ctx.also.values()].some((t) => t !== null && [...t.slots.values()].some((s) => isDetached(s.type)))) {
        bad("redactable-read", p, "a rule reads every field and every subject, and one of them holds a detached text");
      }
      if (typeof x === "string") code = { op: "rule", rule: x };
      break;
    case "capability": {
      // Section 6.11: a guard that a listed capability declares. Its refusal has the name the capability gives, so a `reason` names nothing.
      const capability = capabilityGuard(d, x, p, ctx, item);
      if (capability) code = { op: "capability", capability };
      break;
    }
    case "each": case "has": {
      const r = k === "each" ? rec(x, p, ["list", "as", "guards"], ["where"]) : rec(x, p, ["list", "as", "where"], ["guards"]);
      const inner = r && binding(r);
      if (!r || !inner) break;
      // A slot with no `of` is a slot of the guard's own subject: only a range has items of its own.
      const where = clauses(d, r["where"] ?? [], at(p, "where"), inner.ctx, item, true);
      const guards = nested(r["guards"] ?? [], at(p, "guards"), inner.ctx);
      const bound = { list: inner.list, binding: inner.binding, where: where.plan, guards };
      code = k === "each" ? { op: "each", ...bound } : { op: "has", ...bound };
      break;
    }
    case "anyOf": {
      const alternatives = list(x, p, bounds.guards);
      // With no alternative the guard could never hold.
      if (Array.isArray(x) && alternatives.length === 0) bad("shape", p, "must not be empty");
      code = { op: "anyOf", alternatives: Object.freeze(alternatives.map((a, i) => nested(a, at(p, i), { ...ctx, live: new Set() }))) };
      break;
    }
    case "distinct": case "sameSet": {
      const r = k === "distinct" ? rec(x, p, ["list", "as", "key"]) : rec(x, p, ["list", "as", "key", "items"], ["match", "ordered"]);
      const inner = r && binding(r);
      if (!r || !inner) break;
      const key = operand(d, r["key"], at(p, "key"), inner.ctx, item);
      if (k === "distinct") {
        if (key) code = { op: "distinct", list: inner.list, binding: inner.binding, key: key.node };
        break;
      }
      // Section 6.5: the keys are the local IDs of the items that the range covers, and `match` holds between each element and its item.
      // The range is read once for the whole form, so its `where` names no element.
      const items = range(d, r["items"], at(p, "items"), ctx, [], true, "same-set");
      if (!items) break;
      if (key?.type?.type === "item" && key.type.of !== items.type.name) bad("name", at(p, "key"), `names no item of type ${items.type.name}`);
      const match = clauses(d, r["match"] ?? [], at(p, "match"), inner.ctx, ownerOf(() => items.type, { kind: "range", path: at(p, "items"), type: items.type.name }), true);
      if ("ordered" in r) bool(r["ordered"], at(p, "ordered"));
      if (key) code = { op: "sameSet", list: inner.list, binding: inner.binding, key: key.node, items: items.program, match: match.plan, ordered: r["ordered"] === true };
      break;
    }
  }
  // Section 6.5: `reason` names the refusal. It changes no judgment.
  if ("reason" in o) str(o["reason"], at(path, "reason"));
  if ("ifPresent" in o && (bool(o["ifPresent"], at(path, "ifPresent")) === null || !namesField)) bad("shape", at(path, "ifPresent"), "is for a guard that names a field or a presented fact");
  return code ? Object.freeze({ code: Object.freeze(code), site: Object.freeze({ path, phase: "before", subject: typeof of === "string" ? of : "on",
    ifPresent: o["ifPresent"] === true, absent: Object.freeze(absent), reason: typeof o["reason"] === "string" ? o["reason"] : null }) }) : null;
}

/**
 * The guards of one act or handler, or of one condition, in the order
 * written. `written`: the list is the written list of an act or of a
 * handler, where platform data may hold a mark as one guard (section 6.1,
 * place 4). A mark is counted as one guard, and nothing of it is checked: it
 * names no subject. Inside a list form, and in a condition, a mark is read
 * as a guard, which it is not.
 */
export function guards(d: Defining, v: unknown, path: string, ctx: Ctx, written = false, place: GuardListPlace = "guards"): void {
  const nesting: Nesting = { count: 0 };
  const scope = beginGuardList(d, v, place);
  try {
    d.list(v, path, d.bounds.guards).forEach((g, i) => {
      if (d.platform && written && marked(g)) { nesting.count++; mark(d, g, at(path, i), "guard"); } else guard(d, g, at(path, i), ctx, nesting);
    });
  } finally { endGuardList(d, scope); }
  // Section 6.1: the guards of one act or handler, counting those nested in `each`, `has` and `anyOf`.
  if (nesting.count > d.bounds.nestedGuards) d.bad("bound", path, `has ${nesting.count} guards, counting those nested; at most ${d.bounds.nestedGuards}`);
}
