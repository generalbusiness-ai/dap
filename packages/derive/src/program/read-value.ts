/** Execute admitted operand descriptors over the shared value and entry-history leaves. */
import type { FactRef } from "@generalbusiness/dap-contract";
import type { Judging } from "../guards.ts";
import { copyFact, entryValue, equal, readSlotValue, type EntrySelection } from "../operand.ts";
import type { Item } from "../state.ts";
import type { ElementIdentity } from "../validate/context.ts";
import { isFactRef, isLocalId, isObject, own } from "../values.ts";
import { checkedOperand, type EntryRead, type OperandRead, type PartRead, type SubjectRead } from "./reads.ts";

import type { WherePlan } from "./guard-plan.ts";
import { observeInstruction } from "./observe.ts";

export type ElementValues = ReadonlyMap<ElementIdentity, unknown>;
const noElements: ElementValues = new Map();

/** The caller supplies the before or working view required by its admitted form. */
export function readValue(j: Judging, read: OperandRead, item: Item | null, elements: ElementValues = noElements): unknown {
  checkedOperand(j.definition, read);
  return observeInstruction(j.definition, "expressions", null, null, read.path, read.op, () => executeRead(j, read, item, elements));
}
function executeRead(j: Judging, read: OperandRead, item: Item | null, elements: ElementValues): unknown {
  const subject = (value: SubjectRead): Item | null => value.identity.kind === "range" ? item
    : value.identity.kind === "fan-out" ? j.each ?? null : j.subjects.get(value.identity.name) ?? null;
  const entry = (ref: FactRef | number, part: EntryRead): unknown => {
    const selected: EntrySelection = part.op === "set" ? { op: "set", slot: part.slot, item: () => readValue(j, part.item, item, elements) }
      : part.op === "field" || part.op === "opened" || part.op === "carried" ? { op: part.op, name: part.name } : { op: part.op };
    return entryValue(j, ref, typeof ref === "number" ? j.scope.at : ref.at, selected);
  };
  const part = (value: unknown, projection: PartRead): unknown => {
    if (j.references?.isReference(value)) {
      if (projection.op === "ref") return value;
      if (projection.op === "scope") return j.scope.at;
      value = j.references.expose(value);
    }
    if (!isFactRef(value) && !isLocalId(value)) return null;
    if (projection.op !== "project") return entry(value, projection);
    const inner = entry(value, projection.of);
    return isFactRef(inner) ? projection.then === "scope" ? inner.at : inner.seq : null;
  };
  let value: unknown;
  switch (read.op) {
    case "const": value = read.value; break;
    case "none": value = null; break;
    case "signer": value = j.signer?.member ?? null; break;
    case "scope": value = j.scope.at; break;
    case "intent": value = j.intent ?? j.unavailableIntent?.() ?? null; break;
    case "sender": value = j.sender ?? null; break;
    case "update": value = j.update?.[read.part] ?? null; break;
    case "result": value = j.result?.name ?? null; break;
    case "item": { const from = subject(read.subject); value = from ? j.references ? j.references.item(from) : from.id : null; break; }
    case "source": value = j.source ? part(copyFact(j.source), read.entry) : null; break;
    case "field": value = j.references ? j.references.field(j.fieldTypes, j.fields, read.name) : own(j.fields, read.name) ?? null; break;
    case "presented": value = own(j.presented, read.name) ?? null; break;
    case "slot": { const from = subject(read.slot.subject); value = from ? readSlotValue(j, from, read.slot.name) : null; break; }
    case "element": {
      const binding = read.binding;
      if (binding.identity === null || !elements.has(binding.identity)) throw new TypeError("element has no value in its admitted lexical scope");
      value = elements.get(binding.identity);
      for (const member of binding.members) value = isObject(value) ? own(value, member) : undefined;
      value ??= null;
      break;
    }
    // The sequenced note, section 5.2. No judge derives a sequenced definition yet (`derivable`), so no page is given here.
    case "read": throw new TypeError("a group read has no page in this judgment");
    default: exhaustive(read);
  }
  return read.projection ? part(value, read.projection) : value;
}

function exhaustive(value: never): never { throw new TypeError(`unknown operand descriptor: ${String(value)}`); }

/** The admitted predicate vocabulary is shared by guards and whole-range consumers. */
export function whereMatches(j: Judging, where: readonly WherePlan[], item: Item | null, elements: ElementValues = noElements): boolean {
  return where.every(pair => equal(j, readValue(j, pair.a, item, elements), readValue(j, pair.b, item, elements)) === (pair.op === "equals"));
}
