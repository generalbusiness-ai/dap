/** Recognize one authored deadline for one retained request. This is a
 * scheduler hint, not authority to diagnose or to skip a recorded outcome. */
import type { Entry, FactRef, FieldValue, ScopeRef, Timestamp } from "@generalbusiness/dap-contract";
import { canonicalize, definitionDigest, entryHash, isScopeRef, timeMs } from "@generalbusiness/dap-bytes";
import type { ValidDefinition } from "@generalbusiness/dap-derive";

export interface AuthoredCutoff {
  readonly of: FactRef;
  readonly item: number;
  readonly rule: string;
  readonly due: Timestamp;
  readonly target: ScopeRef;
  readonly n: number;
}

/** The caller supplies the accepted entry and its exact local fact. The
 * recognizer admits only a single, unconditional, direct-field tell. */
export function authoredCutoff(definition: ValidDefinition, origin: Entry, of: FactRef, n: number): AuthoredCutoff | null {
  try {
    if (definitionDigest(definition.declared) !== definition.digest || origin.input.type !== "act" || !("genesis" in origin)
      || origin.seq !== of.seq || origin.genesis !== of.at.genesis || entryHash(origin) !== of.hash
      || canonicalize(origin.input.signed.intent.to) !== canonicalize(of.at) || n !== 0) return null;
    const intent = origin.input.signed.intent, act = definition.declared.acts[intent.kind];
    if (!act || act.step !== "open" || !act.on || act.sends.length !== 1 || origin.sends.length !== 1) return null;
    const declaredSend = act.sends[0]!, send = origin.sends[0]!;
    if (!("tell" in declaredSend) || declaredSend.tell.if !== undefined || declaredSend.tell.to.of !== undefined
      || send.n !== n || !isScopeRef(send.to) || send.message.class !== "request" || send.message.type !== "tell") return null;
    const itemType = definition.declared.items[act.on], slot = declaredSend.tell.to.slot;
    const targetSlot = itemType?.refs[slot];
    if (!itemType || !targetSlot?.fixed || !targetSlot.required || targetSlot.to.type !== "scope") return null;
    const refs = act.effects.filter(effect => "ref" in effect && effect.ref.slot === slot);
    if (refs.length !== 1) return null;
    const ref = refs[0]!;
    if (!("ref" in ref) || ref.if !== undefined || ref.unless !== undefined || ref.of !== undefined
      || !ref.ref.from || typeof ref.ref.from !== "object" || !("field" in ref.ref.from) || Object.keys(ref.ref.from).length !== 1) return null;
    const target = intent.fields[ref.ref.from.field];
    if (!isScopeRef(target) || canonicalize(target) !== canonicalize(send.to)) return null;
    const opens = origin.effects.filter(effect => effect.effect === "open");
    if (opens.length !== 1 || opens[0]!.type !== act.on || opens[0]!.state !== itemType.initial || opens[0]!.item !== origin.seq) return null;
    const item = opens[0]!.item;
    // The entry can move its just-opened item before committing. The timer
    // must apply to that final state, not merely to its declared initial one.
    let state = itemType.initial;
    for (const effect of origin.effects) if (effect.effect === "state" && effect.item === item) state = effect.state;
    const rules = Object.entries(definition.declared.timed).filter(([, rule]) => rule.on === act.on && rule.states.includes(state));
    if (rules.length !== 1) return null;
    const [name, rule] = rules[0]!, deadline = itemType.values[rule.deadline];
    if (!deadline?.fixed || !deadline.required || deadline.of.type !== "time") return null;
    const times = act.effects.filter(effect => "value" in effect && effect.value.slot === rule.deadline);
    if (times.length !== 1) return null;
    const time = times[0]!;
    if (!("value" in time) || time.if !== undefined || time.unless !== undefined || time.of !== undefined) return null;
    const from = time.value.from;
    if (!from || typeof from !== "object" || !("field" in from) || Object.keys(from).length !== 1) return null;
    const due = intent.fields[from.field];
    if (typeof due !== "string" || timeMs(due) === null) return null;
    const targetEffects = origin.effects.filter(effect => effect.effect === "ref" && effect.item === item && effect.slot === slot);
    const dueEffects = origin.effects.filter(effect => effect.effect === "value" && effect.item === item && effect.slot === rule.deadline);
    if (targetEffects.length !== 1 || targetEffects[0]!.effect !== "ref" || canonicalize(targetEffects[0]!.to) !== canonicalize(target)
      || dueEffects.length !== 1 || dueEffects[0]!.effect !== "value" || dueEffects[0]!.value !== due) return null;
    const fields: Record<string, FieldValue> = {};
    for (const [key, source] of Object.entries(declaredSend.tell.fields)) {
      if (source === "self" || !("field" in source) || Object.keys(source).length !== 1 || !Object.hasOwn(intent.fields, source.field)) return null;
      fields[key] = intent.fields[source.field]!;
    }
    if (canonicalize(send.message.body) !== canonicalize({ message: declaredSend.tell.message, fields })) return null;
    return { of, item, rule: name, due: due as Timestamp, target, n };
  } catch { return null; }
}
