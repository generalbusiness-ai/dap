/** One concrete evaluator. Optional trace collection never reruns a primitive. */
import type { Digest, Effect as RecordedEffect, FieldValue, Send, UnavailableReason } from "@generalbusiness/dap-contract";
import { held } from "../effects.ts";
import { changeItem, newItem, type ItemEffect } from "../fold.ts";
import { preparedRule, slotOf, type GuardResult, type Judging, type RuleInput } from "../guards.ts";
import { overMax, type Ran } from "../handlers.ts";
import { sendValue } from "../send-value.ts";
import type { Item } from "../state.ts";
import { LAST_MS, timeMs, timeOf } from "../time.ts";
import { isMemberRef, isScopeRef, memberFits, own } from "../values.ts";
import { checkedProgram, immutable, type All, type Condition, type ExpressionData, type Guard, type Program } from "./model.ts";
import { judgesClock } from "./dependencies.ts";

export interface TraceEvent { path: string; op: string; result: unknown; reads?: Readonly<Record<string, unknown>> }
export interface Evaluation { ran: Ran; asked: readonly RuleInput[]; trace: readonly TraceEvent[]; truncated: boolean; primitives: Readonly<Record<"expressions" | "guards" | "effects" | "sends" | "prepared", number>> }
export function evaluate(program: Program, input: Judging, _cause: Digest, first = 0, traceBudget?: number): Evaluation {
  checkedProgram(program);
  if (program.definition !== input.definition.digest || program.kind !== input.kind) throw new TypeError("program belongs to another body");
  const j: Judging = { ...input, used: [], ...(input.asked === undefined ? {} : { asked: [] }), ran: { clock: input.ran?.clock === true } };
  const working = new Map(j.subjects), effects: RecordedEffect[] = [], sends: Send[] = [], trace: TraceEvent[] = [];
  const primitives = { expressions: 0, guards: 0, effects: 0, sends: 0, prepared: 0 };
  let truncated = false;
  const observe = (event: TraceEvent) => {
    if (traceBudget === undefined) return;
    if (trace.length < Math.max(0, traceBudget)) trace.push(immutable(event)); else truncated = true;
  };
  const unbound = (name: string) => name.startsWith("also.") && !j.subjects.has(name);
  const read = (value: ExpressionData): unknown => {
    primitives.expressions++;
    let result: unknown;
    switch (value.op) {
      case "literal": result = value.value; break;
      case "field": result = own(j.fields, value.handle.name) ?? null; break;
      case "slot": { const item = (value.phase === "before" ? j.subjects : working).get(value.handle.subject.name); result = item ? slotOf(item, value.handle.name) : null; break; }
      case "signer": result = j.signer?.member ?? null; break;
      case "self": result = j.self; break;
      case "time": { const ms = timeMs(j.clock.reading)! + value.plusSeconds * 1000; result = ms > LAST_MS ? { overflow: true } : timeOf(ms); break; }
    }
    observe({ path: value.path, op: value.op, result });
    return result;
  };
  const all = (value: All): { result: GuardResult; at: number } => {
    let unavailable: UnavailableReason | null = null;
    for (const [at, child] of value.guards.entries()) {
      const result = guard(child);
      if (result === "fail") return { result, at };
      if (result !== "pass" && unavailable === null) unavailable = result;
    }
    return { result: unavailable ?? "pass", at: -1 };
  };
  const guard = (value: Guard): GuardResult => {
    primitives.guards++;
    if (value.op === "all") return all(value).result;
    const meta = value.metadata, name = meta.subject.name;
    // In this slice, ifPresent applies to no field-bearing guard. Preserve it as provenance.
    if (unbound(name)) { observe({ path: meta.path, op: value.op, result: "skipped-unbound" }); return "pass"; }
    let result: GuardResult, reads: Record<string, unknown>;
    switch (value.op) {
      case "state": {
        const state = j.subjects.get(name)?.state ?? null;
        result = state !== null && value.states.includes(state) ? "pass" : "fail"; reads = { subject: name, state }; break;
      }
      case "before": case "after": {
        if (j.clock.behind) { result = "clock-behind"; reads = { clockBehind: true }; break; }
        const deadline = read(value.read), limit = timeMs(deadline), now = timeMs(j.clock.reading)!;
        result = limit !== null && (value.op === "before" ? now < limit : now > limit) ? "pass" : "fail";
        reads = { subject: name, deadline, clock: j.clock.reading }; break;
      }
      case "prepared": {
        primitives.prepared++;
        const prepared = preparedRule(j, value.rule); result = prepared.result;
        reads = { rule: value.rule, digest: prepared.digest, input: prepared.input, opaque: true }; break;
      }
    }
    observe({ path: meta.path, op: value.op, result, reads }); return result;
  };
  const readsUnbound = (value: All): boolean => value.guards.some(g => g.op === "all" ? readsUnbound(g) : unbound(g.metadata.subject.name));
  const lets = (condition: Condition): boolean | UnavailableReason => {
    if (condition.if && readsUnbound(condition.if)) return false;
    const holds = condition.if ? all(condition.if).result : "pass";
    const bars = condition.unless ? all(condition.unless).result : "fail";
    if (holds === "fail" || bars === "pass") return false;
    return holds !== "pass" ? holds : bars !== "fail" ? bars : true;
  };
  const refused = (reason: Extract<Ran, { result: "refused" }>["reason"], detail: string): Ran => ({ result: "refused", reason, detail, prepared: j.used });
  const run = (): Ran => {
    const judged = all(program.guards);
    if (judged.result === "fail") {
      const failed = program.guards.guards[judged.at]!;
      const name = failed.op === "all" ? undefined : failed.metadata.reason;
      return { ...refused("guard-failed", `guards.${judged.at}`), ...(name === undefined ? {} : { name }) };
    }
    if (judged.result !== "pass") return { result: "unavailable", reason: judged.result };
    if (program.opening) {
      const { name, type } = program.opening, open = { effect: "open", item: j.self, type: name, state: type.initial } as const;
      effects.push(open); working.set("on", newItem(open, type, null));
      primitives.effects++; observe({ path: `acts.${program.kind}.on`, op: "open", result: open });
    }
    const apply = (name: string, effect: ItemEffect) => {
      effects.push(effect); working.set(name, changeItem(working.get(name)!, effect, j.definition, j.signer));
    };
    for (const [i, effect] of program.effects.entries()) {
      primitives.effects++;
      const subject = effect.op === "state" ? effect.subject : effect.slot.subject, item = working.get(subject.name);
      if (!item) continue;
      const through = lets(effect.condition);
      if (through === false) continue;
      if (through !== true) return { result: "unavailable", reason: through };
      const source = effect.op === "state" || effect.source.op === "clear" ? null : read(effect.source.expression);
      if (effect.op !== "state" && effect.source.op === "read" && source === null) continue;
      const type = program.finish.types[item.type]!, was = j.subjects.get(subject.name);
      if (was && own(type.states, was.state)?.final) return refused("final", `effects.${i}: item ${item.id} is ${was.state}`);
      const bad = (detail: string) => refused("bad-field", `effects.${i}: ${detail}`);
      let applied: ItemEffect;
      if (effect.op === "state") applied = { effect: "state", item: item.id, state: effect.state };
      else if (effect.op === "party") {
        if (source !== null && (!isMemberRef(source) || !memberFits(source, j.bounds))) return bad("the source is not a member, or its handle is longer than a handle may be");
        applied = { effect: "party", item: item.id, slot: effect.slot.name, member: source as Extract<ItemEffect, { effect: "party" }>["member"] };
      } else {
        const expr = effect.source.op === "read" ? effect.source.expression : null;
        if (expr?.op === "time" && typeof source === "object" && source !== null && "overflow" in source) return bad("the derived time is past the last timestamp");
        // Constants need the existing dynamic normalization. Resolved reads and self already carry admitted types.
        const value = source === null ? null : expr?.op === "literal" ? held(j, effect.slot.type, source) : source as FieldValue;
        if (value === undefined) return bad("the source is not a value of the slot's type");
        applied = effect.op === "ref" ? { effect: "ref", item: item.id, slot: effect.slot.name, to: value } : { effect: "value", item: item.id, slot: effect.slot.name, value };
      }
      apply(subject.name, applied); observe({ path: effect.path, op: effect.op, result: applied });
    }
    const opened: Item | null = program.opening ? working.get("on")! : null;
    if (opened) for (const [name, rule] of [...Object.entries(program.opening!.type.parties), ...Object.entries(program.opening!.type.refs), ...Object.entries(program.opening!.type.values)]) {
      if (rule.required && slotOf(opened, name) === null) return refused("required-unset", name);
    }
    for (const [i, send] of program.sends.entries()) {
      primitives.sends++;
      if (send.destination.subject.name.startsWith("also.") && !working.has(send.destination.subject.name)) continue;
      const made = lets(send.condition ? { if: send.condition } : {});
      if (made === false) continue;
      if (made !== true) return { result: "unavailable", reason: made };
      const item = working.get(send.destination.subject.name), to = item ? slotOf(item, send.destination.name) : null;
      if (!isScopeRef(to)) return refused("send-unresolved", `sends.${i}: the slot ${send.destination.name} holds no scope`);
      const fields: [string, unknown][] = []; let unresolved: string | null = null;
      for (const [name, expression] of send.fields) {
        const value = read(expression), sent = sendValue(j, value, expression.op === "literal" ? null : expression.type);
        if (sent.unresolved !== null) unresolved = sent.unresolved;
        if (sent.value !== null) fields.push([name, sent.value]);
      }
      const sent: Send = { n: first + sends.length, to, message: { class: "request", type: "tell", body: { message: send.message, fields: Object.fromEntries(fields) } } };
      sends.push(sent); observe({ path: send.path, op: "tell", result: sent });
      if (unresolved !== null) return refused("send-unresolved", `sends.${i}: ${unresolved}`);
    }
    const full = opened ? overMax(j.view, j.definition, opened.type, opened.state) : null;
    if (full !== null) return refused("type-full", full);
    return { result: "ran", effects, sends, prepared: j.used, judgesTime: judgesClock(program) || j.ran?.clock === true, settles: false };
  };
  const ran = run();
  return { ran, asked: j.asked ?? [], trace, truncated, primitives };
}
