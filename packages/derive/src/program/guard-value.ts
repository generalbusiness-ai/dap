/** Execute the closed admitted guard vocabulary over shared judgment and paging leaves. */
import { declarationOf } from "./declaration.ts";
import type { MemberRef } from "@generalbusiness/dap-contract";
import { canonicalize } from "@generalbusiness/dap-bytes";
import { capabilityGuard } from "../capability.ts";
import { members, preparedRule, type GuardResult, type Judging } from "../guards.ts";
import { all, any, coveredItems, excepted, scanItems } from "../lists.ts";
import { guardByRule } from "../marks.ts";
import { copyEntry, copyUnder, matchesCopy, entryValue, equal, kindOf, normalValue, slotOf } from "../operand.ts";
import type { Item } from "../state.ts";
import { timeMs } from "../time.ts";
import { isFactRef, isLocalId, own, same } from "../values.ts";
import type { BoundPlan, GuardCode, RangePlan, WherePlan } from "./guard-plan.ts";
import { readValue, whereMatches, type ElementValues } from "./read-value.ts";
import type { OperandRead } from "./reads.ts";
import { checkedBody, guardPlan, guardSource, type BodyStructure, type GuardNode } from "./structure.ts";
import { captureProgramReads, observeInstruction } from "./observe.ts";

const noElements: ElementValues = new Map();
const ok = (holds: boolean): GuardResult => holds ? "pass" : "fail";
interface Reading { readonly j: Judging; readonly elements: ElementValues }
const matches = ({ j, elements }: Reading, where: readonly WherePlan[], item: Item | null): boolean =>
  whereMatches(j, where, item, elements);

function range(reading: Reading, op: "some" | "none" | "count", r: RangePlan, min?: number, max?: number): GuardResult {
  const { j, elements } = reading;
  const decide = (n: number, complete: boolean): GuardResult | null => {
    if (op === "some") return n >= 1 ? "pass" : complete ? "fail" : null;
    if (op === "none") return n >= 1 ? "fail" : complete ? "pass" : null;
    if (max !== undefined && n > max) return "fail";
    if (complete) return ok(min === undefined || n >= min);
    return max === undefined && min !== undefined && n >= min ? "pass" : null;
  };
  if (r.where.length === 0) {
    const left = excepted(j, r).filter(item => item.type === r.type && r.states.includes(item.state)).length;
    return decide([...new Set(r.states)].reduce((n, state) => n + j.view.count(r.type, state), 0) - left, true)!;
  }
  const [where] = r.where;
  if (r.where.length === 1 && where?.op === "equals") {
    for (const [slot, value] of [[where.a, where.b], [where.b, where.a]] as const) {
      if (slot.op !== "slot" || slot.projection !== null || slot.slot.subject.identity.kind !== "range" || !slot.slot.fixed
        || (value.op !== "field" && value.op !== "const") || value.projection !== null) continue;
      const mode = j.own ? "normalized" : "raw", wanted = readValue(j, value, null, elements);
      const key = canonicalize(normalValue(wanted, j.scope.at, seq => j.own?.(seq)?.hash ?? null));
      const left = excepted(j, r).filter(item => item.type === r.type && r.states.includes(item.state) && equal(j, slotOf(item, slot.slot.name), wanted)).length;
      return decide(j.view.fixedCount(r.type, slot.slot.name, key, r.states, mode) - left, true)!;
    }
  }
  let matched = 0, decided: GuardResult | null = null;
  const end = scanItems(j, r, item => matches(reading, r.where, item), () => (decided = decide(++matched, false)) !== null);
  return end === "stopped" ? decided! : end === "all" ? decide(matched, true)! : "guard-incomplete";
}
/** Top-level and nested lists retain the shared three-outcome ordering. */
export function judgeGuardNodes(j: Judging, body: BodyStructure, nodes: readonly GuardNode[], elements: ElementValues = noElements): { result: GuardResult; at: number } {
  checkedBody(j.definition, body);
  nodes.forEach(node => checkGuard(j, body, node));
  return judgeList(j, body, nodes, elements);
}
function checkGuard(j: Judging, body: BodyStructure, node: GuardNode): void {
  if (node.op === "native") guardSource(j.definition, body, node);
  else if (!guardPlan(j.definition, body, node)) throw new TypeError("guard has no admitted executable instruction");
  for (const child of node.children) {
    if (child.category !== "guard") throw new TypeError("guard instruction has a non-guard child");
    checkGuard(j, body, child);
  }
}
function judgeList(j: Judging, body: BodyStructure, nodes: readonly GuardNode[], elements: ElementValues): { result: GuardResult; at: number } {
  let at = -1;
  const result = all(nodes.map((node, index) => () => {
    const result = executeGuard(j, body, node, elements);
    if (result === "fail") at = index;
    return result;
  }));
  return { result, at };
}

export function judgeGuardNode(j: Judging, body: BodyStructure, node: GuardNode, elements: ElementValues = noElements): GuardResult {
  checkedBody(j.definition, body);
  checkGuard(j, body, node);
  return executeGuard(j, body, node, elements);
}
function executeGuard(j: Judging, body: BodyStructure, node: GuardNode, elements: ElementValues): GuardResult {
  return observeInstruction(j.definition, "guards", body, node, node.path, node.op, () => executeGuardValue(j, body, node, elements));
}
function executeGuardValue(j: Judging, body: BodyStructure, node: GuardNode, elements: ElementValues): GuardResult {
  if (node.op === "native") return guardByRule(j, guardSource(j.definition, body, node), node.data);
  const plan = guardPlan(j.definition, body, node);
  if (!plan) throw new TypeError("guard has no admitted executable instruction");
  const { site, code } = plan;
  if (site.ifPresent && site.absent.some(read => own(read.kind === "field" ? j.fields : j.presented, read.name) === undefined)) return "pass";
  if (site.subject.startsWith("also.") && !j.subjects.has(site.subject)) return "pass";
  const item = j.subjects.get(site.subject) ?? null, reading = { j, elements };
  const inSlots = (slots: readonly string[], member: MemberRef | null | undefined) =>
    !!member && !!item && slots.some(slot => members(own(item.parties, slot)).some(held => same(held, member)));
  const read = (value: OperandRead) => readValue(j, value, item, elements);
  const bound = (value: BoundPlan): number | null | undefined => {
    if (value.op === "absent") return undefined;
    if (value.op === "literal") return value.value;
    const answer = read(value.read);
    return typeof answer === "number" && Number.isSafeInteger(answer) && answer >= 0 ? answer : null;
  };
  switch (code.op) {
    case "state": {
      const state = item?.state ?? null;
      captureProgramReads(j.definition, { subject: site.subject, state });
      return ok(state !== null && code.states.includes(state));
    }
    case "signer": return ok(inSlots(code.slots, j.signer?.member));
    case "notIn": return ok(!inSlots(code.slots, j.signer?.member) && !inSlots(code.slots, j.signer?.principal));
    case "set": return ok(!!item && slotOf(item, code.slot.name) !== null);
    case "unset": return ok(!!item && slotOf(item, code.slot.name) === null);
    case "equals": return ok(equal(j, read(code.a), read(code.b)));
    case "differs": return ok(!equal(j, read(code.a), read(code.b)));
    case "some": case "none": return range(reading, code.op, code.range);
    case "count": { const [min, max] = [bound(code.min), bound(code.max)]; return min === null || max === null ? "fail" : range(reading, "count", code.range, min, max); }
    case "every": {
      const list = code.list.op === "field" ? own(j.fields, code.list.field.name) : item ? slotOf(item, code.list.slot.name) : null;
      if (list === undefined) return "fail";
      return ok((Array.isArray(list) ? list : []).every(id => code.states.includes(j.view.item(id as number)?.state ?? "")));
    }
    case "fact": {
      const ref = code.source.op === "field" ? own(j.fields, code.source.field.name) : read(code.source.read);
      if (ref === undefined || ref === null) return "fail";
      const local = isLocalId(ref), kept = local ? j.own?.(ref) : undefined;
      const fetched = isFactRef(ref) ? j.facts.get(ref.hash) : undefined;
      if (local ? !kept : !fetched || !isFactRef(ref) || !matchesCopy(fetched, ref)) return local ? "unavailable" : "dependency-unavailable";
      const entry = kept?.entry ?? (fetched ? copyEntry(fetched) : null);
      if (!entry) return local ? "unavailable" : "dependency-unavailable";
      const kind = kindOf(entry), under = fetched ? copyUnder(fetched) : declarationOf(j.definition).name;
      if (kind === null || !code.type.kind.includes(kind) || under !== code.type.under) return "fail";
      if (code.source.op !== "field") return "pass";
      return ok(code.where.every(pair => equal(j, isLocalId(ref) || isFactRef(ref) ? entryValue(j, ref, isLocalId(ref) ? j.scope.at : ref.at, { op: "field", name: pair.name }) : null, read(pair.value))));
    }
    case "before": case "after": {
      if (j.clock.behind) { captureProgramReads(j.definition, { clockBehind: true }); return "clock-behind"; }
      const value = item ? own(item.values, code.slot.name) : null;
      const deadline = timeMs(value), clock = j.clock.reading, now = timeMs(clock)!;
      captureProgramReads(j.definition, { subject: site.subject, deadline: value ?? null, clock });
      return ok(deadline !== null && (code.op === "before" ? now < deadline : now > deadline));
    }
    case "rule": return preparedRule(j, code.rule).result;
    case "capability":
      captureProgramReads(j.definition, { opaque: true, capability: code.capability.version, guard: code.capability.guard });
      return capabilityGuard(j, code.capability, item, guardSource(j.definition, body, node), elements);
    case "anyOf": return any(code.alternatives.map(group => () => judgeList(j, body, group, elements).result));
    case "each": case "has": case "distinct": case "sameSet": return listGuard(reading, body, code, item);
    default: return exhaustive(code);
  }
}

function listGuard(reading: Reading, body: BodyStructure, code: Extract<GuardCode<GuardNode>, { list: unknown; binding: unknown }>, item: Item | null): GuardResult {
  const { j, elements } = reading, value = readValue(j, code.list, item, elements);
  if (value !== null && !Array.isArray(value)) return "fail";
  const bound: Reading[] = ((value ?? []) as readonly unknown[]).map(element => ({
    j,
    elements: new Map(elements).set(code.binding.identity, element),
  }));
  if (code.op === "each" || code.op === "has") {
    const selected = bound.filter(inner => matches(inner, code.where, item));
    return code.op === "each" ? all(selected.flatMap(inner => code.guards.map(guard => () => executeGuard(inner.j, body, guard, inner.elements))))
      : any(selected.map(inner => () => judgeList(inner.j, body, code.guards, inner.elements).result));
  }
  const items = code.op === "sameSet" ? coveredItems(j, code.items, elements) : [];
  if (items === null) return "guard-incomplete";
  const keys = bound.map(inner => readValue(inner.j, code.key, item, inner.elements));
  if (keys.some((key, index) => key === null || keys.slice(0, index).some(earlier => equal(j, earlier, key)))) return "fail";
  if (code.op === "distinct") return "pass";
  const selected = keys.map(key => items.find(item => equal(j, key, item.id)));
  if (keys.length !== items.length || !selected.every(item => item !== undefined)) return "fail";
  if (!bound.every((inner, index) => matches(inner, code.match, selected[index]!))) return "fail";
  return code.ordered && selected.some((item, index) => index > 0 && selected[index - 1]!.id >= item!.id) ? "fail" : "pass";
}
function exhaustive(value: never): never { throw new TypeError(`unknown guard instruction: ${String(value)}`); }
