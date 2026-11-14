/** Conservative requirements of the actual admitted program, never an execution trace. */
import type { FieldType, PlatformReceive } from "@generalbusiness/dap-contract";
import type { ValidDefinition } from "../validate/index.ts";
import type { Dependency } from "./reports.ts";
import { immutable, type Phase } from "./data.ts";
import { declarationOf } from "./declaration.ts";
import type { RangePlan } from "./guard-plan.ts";
import { nativeBoundaries } from "./native.ts";
import type { EntryRead, OperandRead, PartRead, ReadType, SlotRead, SubjectRead } from "./reads.ts";
import { sendReadType, sendSlotType, type SendSourcePlan } from "./send-plan.ts";
import { settlementSubject } from "./settlement.ts";
import { attentionPlan, checkedBody, conditionPlan, effectPlan, guardPlan, sendClauseStructure, sendPlan, type BodyStructure, type ResolutionGroup, type StructureNode } from "./structure.ts";

export type ProgramDependency = Dependency
  | { readonly kind: "input"; readonly part: "sender" | "source" | "update" | "result" | "presented" | "directory" | "cause" | "operation" | "runtime-clock-use" | "reads" }
  | { readonly kind: "element"; readonly name: string; readonly members: readonly string[] }
  | { readonly kind: "scan"; readonly type: string; readonly states: readonly string[] }
  | { readonly kind: "fixed-count"; readonly type: string; readonly slot: string; readonly states: readonly string[] }
  /** Whole observation context: subjects, observations, freshness clock, retained values and use history. */
  | { readonly kind: "observations"; readonly owner: string }
  | { readonly kind: "metadata"; readonly part: string };
export interface ProgramRequirements {
  readonly body: BodyStructure;
  readonly reads: readonly ProgramDependency[];
  /** A future clause reads the state at its own later execution, never the sending state. */
  readonly future: readonly { readonly clause: string; readonly requirements: ProgramRequirements }[];
}

/** Every descriptor and future edge comes from this exact admitted body. */
export function requirements(definition: ValidDefinition, body: BodyStructure): ProgramRequirements {
  checkedBody(definition, body);
  const declared = declarationOf(definition), result = new Map<string, ProgramDependency>();
  const add = (read: ProgramDependency): void => { result.set(JSON.stringify(read), immutable(read)); };
  const subjectName = (value: SubjectRead): string => value.identity.kind === "subject" ? value.identity.name : value.identity.kind === "range" ? `range:${value.type}` : "fan-out";
  const subject = (name: string, phase: Phase, part: string): void => {
    add({ kind: "subject", name, phase, part: "presence" }); add({ kind: "subject", name, phase, part });
  };
  const slot = (value: SlotRead, phase: Phase): void => subject(subjectName(value.subject), phase, `slot:${value.kind}:${value.name}`);
  const opaque = (reason: string): void => { add({ kind: "opaque", reason }); };
  const nominal = (type: FieldType): void => {
    switch (type.type) {
      case "item": case "fact":
        add({ kind: "history", reason: `reference encoding or normalization: ${type.type}` }); add({ kind: "scope" }); add({ kind: "self" }); break;
      case "list": nominal(type.of); break;
      case "record": Object.values(type.of).forEach(nominal); break;
      case "text": case "int": case "bool": case "time": case "enum": case "member": case "scope": case "reference": case "digest": case "commit": case "tree": break;
      default: exhaustive(type);
    }
  };
  const type = (value: ReadType): void => {
    switch (value.kind) {
      case "declared": nominal(value.type); break;
      case "native": opaque(`Native type ${value.mark.code}: unknown requirements`); break;
      case "unknown": add({ kind: "history", reason: "untyped value may contain a nominal reference" }); break;
      default: exhaustive(value);
    }
  };
  const entry = (value: EntryRead): void => {
    add({ kind: "history", reason: `entry projection: ${value.op}` }); add({ kind: "scope" });
    if (value.op === "set") { operand(value.item); add({ kind: "metadata", part: `historical slot:${value.slot}` }); }
    if (value.op === "field") add({ kind: "metadata", part: "historical local field reconstruction" });
  };
  const projection = (value: PartRead): void => value.op === "project" ? entry(value.of) : entry(value);
  const operand = (value: OperandRead, wire = false): void => {
    switch (value.op) {
      case "const": case "none": break;
      case "field": add({ kind: "field", name: value.name, presence: true }); break;
      case "presented": add({ kind: "input", part: "presented" }); add({ kind: "metadata", part: `presented:${value.name}` }); break;
      case "slot": slot(value.slot, value.phase); break;
      case "item": subject(subjectName(value.subject), value.phase, "id"); break;
      case "signer": add({ kind: "signer" }); break;
      case "scope": add({ kind: "scope" }); break;
      case "intent": add({ kind: "self" }); add({ kind: "input", part: "cause" }); break;
      case "sender": add({ kind: "input", part: "sender" }); break;
      case "source": add({ kind: "input", part: "source" }); entry(value.entry); break;
      case "update": add({ kind: "input", part: "update" }); break;
      case "result": add({ kind: "input", part: "result" }); break;
      case "element": add({ kind: "element", name: value.binding.name, members: value.binding.members }); break;
      case "read": add({ kind: "input", part: "reads" }); break;
      default: exhaustive(value);
    }
    if (value.projection) projection(value.projection);
    if (wire) { const held = sendReadType(value); if (held) nominal(held); }
  };
  const range = (value: RangePlan): void => {
    add({ kind: "scan", type: value.type, states: value.states }); add({ kind: "bounds" });
    for (const state of value.states) add({ kind: "live-count", type: value.type, state });
    for (const name of value.except) subject(name, "before", "id");
    for (const pair of value.where) { operand(pair.a); operand(pair.b); }
  };
  const group = (value: ResolutionGroup, phase: Phase): void => {
    value.operands.forEach(read => operand(read));
    value.subjects.forEach(read => { if (read.subject === "scope") add({ kind: "scope" }); else subject(subjectName(read.subject), phase, "presence"); });
    value.slots.forEach(read => {
      if (read.access === "read") slot(read.slot, phase);
      else { subject(subjectName(read.slot.subject), "working", "presence"); type(read.slot.type); add({ kind: "bounds" }); }
    });
    value.fields.forEach(read => add({ kind: "field", name: read.name, presence: true }));
    value.foreignFields.forEach(read => {
      add({ kind: "field", name: read.factField, presence: true }); add({ kind: "history", reason: `foreign field:${read.name}` });
    });
    value.ranges.forEach(read => { add({ kind: "scan", type: read.subject.type, states: read.states }); add({ kind: "bounds" }); });
  };
  const prepared = (rule: string): void => {
    add({ kind: "prepared-input", rule, parts: ["kind", "fields", "signer", "subjects", "facts"] });
    add({ kind: "prepared-results", rule });
    opaque(`prepared rule ${rule}: complete prescribed input, not observed expression reads`);
  };
  const source = (value: SendSourcePlan): void => {
    switch (value.op) {
      case "self": add({ kind: "self" }); add({ kind: "scope" }); break;
      case "read": operand(value.read, true); break;
      case "collect":
        range(value.range);
        for (const [, member] of value.fields) {
          if (member.op === "item") { add({ kind: "self" }); add({ kind: "scope" }); add({ kind: "history", reason: "collected item reference encoding" }); }
          else if (member.op === "state") subject(`range:${value.range.type}`, "working", "state");
          else { slot(member.slot, "working"); const held = sendSlotType(member.slot); if (held) nominal(held); }
        }
        break;
      default: exhaustive(value);
    }
  };
  const future: { clause: string; requirements: ProgramRequirements }[] = [];
  const visit = (node: StructureNode): void => {
    group(node.reads, node.category === "guard" ? "before" : "working");
    if (node.op === "native") {
      opaque(`Native ${node.category} ${node.native.mark.code}: unknown requirements`);
      add({ kind: "input", part: "runtime-clock-use" });
      if (node.category === "effect") { add({ kind: "signer" }); add({ kind: "bounds" }); add({ kind: "history", reason: "trusted returned effect joins" }); }
      if (node.category === "send") { add({ kind: "ordinal" }); add({ kind: "scope" }); add({ kind: "history", reason: "trusted returned send joins" }); }
    } else if (node.category === "guard") {
      const plan = guardPlan(definition, body, node);
      if (!plan) throw new TypeError("guard has no admitted executable instruction");
      const { code, site } = plan;
      subject(site.subject, "before", "presence");
      if (site.ifPresent) for (const absent of site.absent) {
        if (absent.kind === "field") add({ kind: "field", name: absent.name, presence: true });
        else add({ kind: "input", part: "presented" });
      }
      switch (code.op) {
        case "state": subject(site.subject, "before", "state"); break;
        case "signer": case "notIn": add({ kind: "signer" }); code.slots.forEach(name => subject(site.subject, "before", `slot:party:${name}`)); break;
        case "set": case "unset": slot(code.slot, "before"); break;
        case "equals": case "differs": operand(code.a); operand(code.b); add({ kind: "history", reason: "normalized equality" }); break;
        case "some": case "none": case "count":
          range(code.range);
          for (const pair of code.range.where) for (const read of [pair.a, pair.b]) if (read.op === "slot" && read.slot.fixed) add({ kind: "fixed-count", type: code.range.type, slot: read.slot.name, states: code.range.states });
          if (code.op === "count") for (const bound of [code.min, code.max]) if (bound.op === "read") operand(bound.read);
          break;
        case "every":
          if (code.list.op === "field") add({ kind: "field", name: code.list.field.name, presence: true }); else slot(code.list.slot, "before");
          add({ kind: "history", reason: "listed item states" }); break;
        case "fact":
          if (code.source.op === "field") add({ kind: "field", name: code.source.field.name, presence: true }); else operand(code.source.read);
          code.where.forEach(pair => operand(pair.value)); nominal(code.type); break;
        case "before": case "after": slot(code.slot, "before"); add({ kind: "clock" }); break;
        case "rule": prepared(code.rule); break;
        case "capability":
          opaque(`capability ${code.capability.version} guard ${code.capability.guard}: unknown interior requirements`);
          for (const [, argument] of code.capability.arguments) {
            if (argument.op === "read") operand(argument.read);
            else if (argument.op === "each") { operand(argument.list); operand(argument.value); }
            else { range(argument.range); slot(argument.slot, "before"); }
          }
          break;
        case "anyOf": break; // All alternatives are actual child nodes below.
        case "each": case "has": operand(code.list); for (const pair of code.where) { operand(pair.a); operand(pair.b); } break;
        case "distinct": operand(code.list); operand(code.key); break;
        case "sameSet": operand(code.list); operand(code.key); range(code.items); for (const pair of code.match) { operand(pair.a); operand(pair.b); } break;
        default: exhaustive(code);
      }
    } else if (node.category === "effect") {
      const plan = effectPlan(definition, body, node);
      if (!plan) throw new TypeError("effect has no admitted executable instruction");
      const target = plan.site.target ? subjectName(plan.site.target) : "on";
      subject(target, "working", "presence"); subject(target, "before", "finality");
      add({ kind: "signer" }); add({ kind: "bounds" });
      const code = plan.code;
      switch (code.op) {
        case "state": break;
        case "party":
          if (code.source.op === "members") code.source.reads.forEach(read => operand(read));
          else if (code.source.op === "read") operand(code.source.read);
          type(code.slot.type); slot(code.slot, "working"); break;
        case "ref": case "value":
          type(code.slot.type);
          if (code.source.op === "read") operand(code.source.read);
          else if (code.source.op === "self") add({ kind: "self" });
          else if (code.source.op === "commit-clock") add({ kind: "clock" });
          break;
        case "attribute":
          slot(code.slot, "working"); subject(subjectName(code.of), "working", "attribution");
          for (const withValue of code.with) {
            if (withValue.op === "items") { range(withValue.range); slot(withValue.slot, "working"); }
            else if (withValue.op === "subject") slot(withValue.slot, "working");
            else if (withValue.op === "list") operand(withValue.read);
            else { operand(withValue.list); operand(withValue.read); }
          }
          break;
        case "hold": if (code.extent) operand(code.extent); subject(target, "working", "hold epoch and holder"); add({ kind: "clock" }); break;
        case "redact": slot(code.slot, "working"); add({ kind: "history", reason: "redaction markers" }); break;
        case "capability":
          opaque(`capability ${code.capability.version} effect ${code.capability.action}: unknown interior requirements`);
          for (const [, argument] of code.capability.arguments) { operand(argument.read); if (argument.from) subject(subjectName(argument.from), "working", "presence"); }
          break;
        default: exhaustive(code);
      }
      if (Object.keys(declared.items).some(name => definition.holdTypes.includes(name))) add({ kind: "history", reason: "holds ending under newly final subjects" });
    } else if (node.category === "attention") {
      const plan = attentionPlan(definition, body, node); slot(plan.slot, "working"); subject(subjectName(plan.slot.subject), "working", "state");
    } else {
      const plan = sendPlan(definition, body, node);
      if (!plan) throw new TypeError("send has no admitted executable instruction");
      add({ kind: "ordinal" }); add({ kind: "bounds" }); add({ kind: "scope" });
      plan.absentSubjects.forEach(name => subject(name, "before", "presence"));
      const code = plan.code;
      code.fields.forEach(([, value]) => source(value));
      switch (code.op) {
        case "tell": source(code.to); break;
        case "relate": source(code.to); source(code.item); if (code.each) range(code.each); add({ kind: "history", reason: "relationship revision and carried state" }); break;
        case "create": add({ kind: "input", part: "cause" }); add({ kind: "history", reason: "genesis creation context and membership" }); break;
        case "index": add({ kind: "input", part: "directory" }); add({ kind: "history", reason: "genesis directory" }); break;
        default: exhaustive(code);
      }
    }
    if (node.category !== "guard" && node.op !== "native") {
      const conditions = conditionPlan(definition, body, node);
      conditions.absentSubjects.forEach(name => subject(name, "before", "presence"));
    }
    node.children.forEach(visit);
    if (node.category === "send") for (const edge of node.future) {
      const root = sendClauseStructure(definition, body, node, edge.clause);
      if (!root) throw new TypeError("future clause has no admitted root");
      future.push(Object.freeze({ clause: edge.clause, requirements: requirements(definition, root) }));
    }
  };
  add({ kind: "definition" }); add({ kind: "bounds" }); add({ kind: "self" }); add({ kind: "input", part: "runtime-clock-use" });
  group(body.reads, "before");
  body.nodes.forEach(visit);
  if (definition.holdTypes.length > 0) {
    add({ kind: "history", reason: "holds ending under newly final subjects" });
    for (const name of definition.holdTypes) {
      const item = declared.items[name]!;
      add({ kind: "scan", type: name, states: [item.initial] });
      subject(`range:${name}`, "before", "whole item for implicit hold endings");
    }
    opaque("capability workspace: unknown interior requirements");
    add({ kind: "metadata", part: "capability workspace availability and maxima" });
  }
  const row = body.row;
  if (row.kind === "act" || row.kind === "receive") {
    for (const selector of Object.values(row.declaration.also)) {
      if ("by" in selector) {
        add({ kind: "field", name: selector.by, presence: true });
        add({ kind: "history", reason: "also selector: local item or opening fact" });
      } else if ("via" in selector) subject(selector.via.of, "before", `slot:ref:${selector.via.slot}`);
      else if ("one" in selector) add({ kind: "history", reason: `singleton selector:${selector.item}` });
    }
  }
  const opens = row.kind === "act" && row.declaration.step === "open" ? row.declaration.on
    : row.kind === "receive" && (body.frame.kind === "handler" || body.frame.kind === "replacement") ? row.declaration.opens : null;
  if (opens) {
    const item = declared.items[opens]!; add({ kind: "self" }); add({ kind: "bounds" });
    for (const [name, rule] of [...Object.entries(item.parties), ...Object.entries(item.refs), ...Object.entries(item.values)]) if (rule.required) subject("on", "working", `required:${name}`);
    for (const [state, value] of Object.entries(item.states)) if (!value.final) add({ kind: "live-count", type: opens, state });
  }
  if (body.nodes.some(node => node.category === "effect" && node.op === "native")) {
    // Opaque returned effects can open any permitted item. Their checked join still applies known finalization.
    add({ kind: "self" }); add({ kind: "bounds" });
    for (const [name, item] of Object.entries(declared.items)) {
      for (const [state, value] of Object.entries(item.states)) if (!value.final) add({ kind: "live-count", type: name, state });
      add({ kind: "metadata", part: `returned opening required slots:${name}` });
    }
  }
  if (body.settlement) {
    const settled = body.settlement;
    if (settled.op === "copy") add({ kind: "history", reason: "copied relationship settlement" });
    else {
      const name = settlementSubject(settled);
      subject(name, "before", "state"); subject(name, "working", "state");
      if (settled.op === "mark") { slot(settled.slot, "before"); slot(settled.slot, "working"); }
    }
  }
  if (body.frame.kind === "timed") { add({ kind: "clock" }); add({ kind: "input", part: "operation" }); }
  if (body.frame.kind === "clause" || body.frame.kind === "outcome-clause") add({ kind: "history", reason: "result-clause original input, signer, fields, uses and current subjects" });
  if (row.kind === "receive") {
    const bound = (row.declaration as PlatformReceive).bound;
    if (bound) {
      add({ kind: "metadata", part: "bound handler" }); subject(bound.of, "before", "state");
      for (const pair of bound.where) for (const value of "equals" in pair ? [pair.equals.a, pair.equals.b] : [pair.differs.a, pair.differs.b]) {
        if (!value) continue;
        if ("field" in value) add({ kind: "field", name: value.field, presence: true });
        else if ("sender" in value) add({ kind: "input", part: "sender" });
        else if ("slot" in value) subject(bound.of, "before", `slot:${value.slot}`);
      }
    }
  }
  for (const boundary of nativeBoundaries(definition)) if (boundary.owner === row.id && boundary.body === null) opaque(`Native header ${boundary.kind} ${boundary.mark.code}: unknown requirements`);
  add({ kind: "observations", owner: row.name });
  return Object.freeze({ body, reads: Object.freeze([...result.values()]), future: Object.freeze(future) });
}
function exhaustive(value: never): never { throw new TypeError(`unknown admitted requirement: ${String(value)}`); }
