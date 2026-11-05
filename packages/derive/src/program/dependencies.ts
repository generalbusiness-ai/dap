/** Conservative structural reads, including branches that one evaluation skips. No reuse policy. */
import type { FieldType } from "@generalbusiness/dap-contract";
import { checkedProgram, type Condition, type ExpressionData, type Guard, type Program, type Slot } from "./model.ts";

export type Dependency =
  | { kind: "field"; name: string; presence: true }
  | { kind: "subject"; name: string; phase: "before" | "working"; part: string }
  | { kind: "clock" | "signer" | "scope" | "self" | "ordinal" | "bounds" | "definition" }
  | { kind: "history"; reason: string }
  | { kind: "live-count"; type: string; state: string }
  | { kind: "prepared-input"; rule: string; parts: readonly ["kind", "fields", "signer", "subjects", "facts"] }
  | { kind: "prepared-results"; rule: string }
  | { kind: "opaque"; reason: string };

export function dependencies(program: Program): readonly Dependency[] {
  checkedProgram(program);
  const result = new Map<string, Dependency>();
  const add = (read: Dependency) => { result.set(JSON.stringify(read), Object.freeze(read)); };
  const subject = (name: string, phase: "before" | "working", part: string) => {
    add({ kind: "subject", name, phase, part: "presence" }); add({ kind: "subject", name, phase, part });
  };
  const nominal = (type: FieldType): void => {
    switch (type.type) {
      case "item": case "fact": add({ kind: "history", reason: `reference encoding or normalization: ${type.type}` }); add({ kind: "scope" }); add({ kind: "self" }); break;
      case "list": nominal(type.of); break;
      case "record": Object.values(type.of).forEach(nominal); break;
      case "text": case "int": case "bool": case "time": case "enum": case "member": case "scope": case "reference": case "digest": case "commit": case "tree": break;
      default: exhaustive(type);
    }
  };
  const slot = (value: Slot, phase: "before" | "working") => subject(value.subject.name, phase, `slot:${value.kind}:${value.name}`);
  const expression = (value: ExpressionData, wire = false): void => {
    switch (value.op) {
      case "literal": break;
      case "field": add({ kind: "field", name: value.handle.name, presence: true }); break;
      case "slot": slot(value.handle, value.phase); break;
      case "signer": add({ kind: "signer" }); break;
      case "self": add({ kind: "self" }); break;
      case "time": add({ kind: "clock" }); break;
      default: exhaustive(value);
    }
    if (wire && value.op !== "literal") nominal(value.type);
  };
  const guard = (value: Guard): void => {
    switch (value.op) {
      case "all": value.guards.forEach(guard); break;
      case "state": subject(value.metadata.subject.name, "before", "state"); break;
      case "before": case "after": expression(value.read); add({ kind: "clock" }); break;
      case "prepared":
        subject(value.metadata.subject.name, "before", "presence");
        add({ kind: "prepared-input", rule: value.rule, parts: Object.freeze(["kind", "fields", "signer", "subjects", "facts"] as const) });
        add({ kind: "prepared-results", rule: value.rule });
        add({ kind: "opaque", reason: `prepared rule ${value.rule}: complete prescribed input, not observed expression reads` }); break;
      default: exhaustive(value);
    }
  };
  const condition = (value: Condition) => { if (value.if) guard(value.if); if (value.unless) guard(value.unless); };
  add({ kind: "definition" });
  guard(program.guards);
  for (const effect of program.effects) {
    condition(effect.condition);
    const of = effect.op === "state" ? effect.subject : effect.slot.subject;
    subject(of.name, "working", "presence"); subject(of.name, "before", "finality");
    // changeItem also records the signer's attribution, even on a state or value effect.
    add({ kind: "signer" });
    switch (effect.op) {
      case "state": break;
      case "value": case "party": case "ref":
        if (effect.source.op === "read") {
          expression(effect.source.expression);
          if (effect.source.expression.op === "literal") { add({ kind: "bounds" }); nominal(effect.slot.type); }
        }
        if (effect.op === "party") add({ kind: "bounds" });
        break;
      default: exhaustive(effect);
    }
  }
  if (program.opening) {
    const { name, type } = program.opening;
    add({ kind: "self" });
    for (const [key, rule] of [...Object.entries(type.parties), ...Object.entries(type.refs), ...Object.entries(type.values)]) if (rule.required) subject("on", "working", `required:${key}`);
    // overMax computes these counts even when the new item finishes in a final state.
    for (const [state, value] of Object.entries(type.states)) if (!value.final) add({ kind: "live-count", type: name, state });
  }
  for (const send of program.sends) {
    if (send.condition) guard(send.condition);
    slot(send.destination, "working"); add({ kind: "ordinal" });
    for (const [, value] of send.fields) expression(value, true);
  }
  return Object.freeze([...result.values()]);
}

/** Static clock use includes unexecuted conditions. Native incoming clock use remains a runtime input. */
export function judgesClock(program: Program): boolean { return dependencies(program).some(read => read.kind === "clock"); }
function exhaustive(value: never): never { throw new TypeError(`unknown program node: ${String(value)}`); }
