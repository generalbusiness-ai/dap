/** Internal experiment: checked data, with no route from the production judges. */
import type { Bounds, FieldType, FieldValue, ItemType } from "@generalbusiness/dap-contract";
import { fieldAssignable } from "../field-types.ts";
import { isValue } from "../values.ts";
import { own } from "../values.ts";
import type { ValidDefinition } from "../validate/index.ts";
import { LAST_MS } from "../time.ts";

import { immutable, type Phase } from "./data.ts";
export { immutable, type Phase } from "./data.ts";
declare const invariant: unique symbol;
type Typed<T extends FieldType, P extends Phase> = { readonly [invariant]: (value: [T, P]) => [T, P] };
export interface Subject { readonly name: string; readonly type: string; readonly path: string }
export interface Field<T extends FieldType = FieldType> { readonly name: string; readonly type: T; readonly required: boolean; readonly path: string }
export interface Slot<T extends FieldType = FieldType> extends Field<T> {
  readonly subject: Subject;
  readonly kind: "party" | "ref" | "value";
  readonly fixed: boolean;
  readonly capability: string | null;
}
type Expression =
  | { readonly op: "literal"; readonly value: FieldValue }
  | { readonly op: "field"; readonly handle: Field }
  | { readonly op: "slot"; readonly handle: Slot }
  | { readonly op: "signer" | "self" }
  | { readonly op: "time"; readonly plusSeconds: number };
export type Expr<T extends FieldType = FieldType, P extends Phase = Phase> = Typed<T, P> & Expression & {
  readonly type: T; readonly phase: P; readonly path: string;
};
/** A visitor reads the already checked graph without widening its invariant construction API. */
export type ExpressionData = Expression & { readonly type: FieldType; readonly phase: Phase; readonly path: string };
export interface Metadata { readonly path: string; readonly subject: Subject; readonly of?: string; readonly ifPresent?: boolean; readonly reason?: string }
export type Guard =
  | { readonly op: "state"; readonly states: readonly string[]; readonly metadata: Metadata }
  | { readonly op: "before" | "after"; readonly read: Expr<Extract<FieldType, { type: "time" }>, "before">; readonly metadata: Metadata }
  | { readonly op: "prepared"; readonly rule: string; readonly metadata: Metadata }
  | { readonly op: "all"; readonly guards: readonly Guard[]; readonly path: string };
export type All = Extract<Guard, { op: "all" }>;
export interface Condition { readonly if?: All; readonly unless?: All }
export type Source = { readonly op: "clear" } | { readonly op: "read"; readonly expression: Expr<FieldType, "working"> };
export type Effect =
  | { readonly op: "state"; readonly subject: Subject; readonly state: string; readonly condition: Condition; readonly path: string }
  | { readonly op: "value" | "party" | "ref"; readonly slot: Slot; readonly source: Source; readonly condition: Condition; readonly path: string };
export interface Tell { readonly op: "tell"; readonly destination: Slot; readonly message: string; readonly condition: All | null; readonly fields: readonly (readonly [string, Expr<FieldType, "working">])[]; readonly clauses: Readonly<Record<string, never>>; readonly path: string }
export interface Program {
  readonly op: "body";
  readonly kind: string;
  readonly definition: string;
  readonly opening: { readonly name: string; readonly type: ItemType } | null;
  readonly guards: All;
  readonly effects: readonly Effect[];
  readonly sends: readonly Tell[];
  readonly finish: { readonly types: Readonly<Record<string, ItemType>>; readonly settles: false };
}

export interface Schema { readonly definition: ValidDefinition; readonly kind: string }
const schemas = new WeakSet<object>(), handles = new WeakMap<object, Schema>(), expressions = new WeakSet<object>(), programs = new WeakSet<object>();
export function schema(definition: ValidDefinition, kind: string): Schema {
  if (!own(definition.declared.acts, kind)) throw new TypeError("unknown act");
  const value = Object.freeze({ definition, kind }); schemas.add(value); return value;
}
export function subject(context: Schema, name: string): Subject {
  if (!schemas.has(context)) throw new TypeError("unchecked schema");
  const act = context.definition.declared.acts[context.kind]!;
  const type = name === "on" ? act.on ?? "" : own(act.also, name.slice(5))?.item;
  if (type === undefined || name !== "on" && !name.startsWith("also.")) throw new TypeError("unknown subject");
  const handle = Object.freeze({ name, type, path: `acts.${context.kind}.${name === "on" ? "on" : name}` }); handles.set(handle, context); return handle;
}
export function field(context: Schema, name: string): Field {
  if (!schemas.has(context)) throw new TypeError("unchecked schema");
  const type = own(context.definition.declared.acts[context.kind]!.fields, name);
  if (!type || "code" in type) throw new TypeError("unknown or native field type");
  const handle = Object.freeze({ name, type: immutable(type), required: type.required, path: `acts.${context.kind}.fields.${name}` }); handles.set(handle, context); return handle;
}
export function slot(of: Subject, name: string): Slot {
  checkedHandle(of);
  const context = handles.get(of)!, item = own(context.definition.declared.items, of.type);
  const party = own(item?.parties, name), ref = own(item?.refs, name), value = own(item?.values, name);
  const declared = party ?? ref ?? value;
  if (!declared || party?.list) throw new TypeError("unknown or list slot");
  const kind = party ? "party" : ref ? "ref" : "value";
  const type = party ? { type: "member" } as const : ref ? ref.to : value!.of;
  if ("code" in type) throw new TypeError("native slot type");
  const handle = Object.freeze({ subject: of, name, type: immutable(type), kind, required: declared.required, fixed: declared.fixed, capability: declared.capability ?? null, path: `items.${of.type}.${kind === "party" ? "parties" : kind === "ref" ? "refs" : "values"}.${name}` }); handles.set(handle, context); return handle;
}
function checkedHandle(handle: object): void { if (!handles.has(handle)) throw new TypeError("unresolved program handle"); }
function expression<T extends FieldType, P extends Phase>(node: Expression, type: T, phase: P, path: string): Expr<T, P> {
  if (phase !== "before" && phase !== "working") throw new TypeError("invalid expression phase");
  const value = Object.freeze({ ...node, type: immutable(type), phase, path }) as Expr<T, P>;
  expressions.add(value); return value;
}
export function literal<T extends FieldType, P extends Phase>(type: T, value: FieldValue, phase: P, path: string, bounds: Bounds): Expr<T, P> {
  if (!isValue(type, value, bounds)) throw new TypeError(`literal outside descriptor at ${path}`);
  return expression({ op: "literal", value: immutable(value) }, type, phase, path);
}
export function readField<T extends FieldType, P extends Phase>(handle: Field<T>, phase: P, path: string): Expr<T, P> {
  checkedHandle(handle); return expression({ op: "field", handle }, handle.type, phase, path);
}
export function readSlot<T extends FieldType, P extends Phase>(handle: Slot<T>, phase: P, path: string): Expr<T, P> {
  checkedHandle(handle); return expression({ op: "slot", handle }, handle.type, phase, path);
}
export function signer<P extends Phase>(phase: P, path: string): Expr<{ type: "member" }, P> { return expression({ op: "signer" }, { type: "member" }, phase, path); }
export function self<T extends Extract<FieldType, { type: "fact" }>, P extends Phase>(type: T, phase: P, path: string): Expr<T, P> { return expression({ op: "self" }, type, phase, path); }
export function time<P extends Phase>(plusSeconds: number, phase: P, path: string): Expr<{ type: "time" }, P> {
  if (!Number.isSafeInteger(plusSeconds) || plusSeconds < 0 || plusSeconds * 1000 > LAST_MS) throw new TypeError("invalid time offset");
  return expression({ op: "time", plusSeconds }, { type: "time" }, phase, path);
}
export function before(read: Expr<{ type: "time" }, "before">, metadata: Metadata, op: "before" | "after" = "before"): Guard {
  if (!expressions.has(read) || read.phase !== "before" || read.type.type !== "time" || read.op !== "slot" || read.handle.subject.name !== metadata.subject.name) throw new TypeError("a time guard needs a resolved before-state time slot");
  return Object.freeze({ op, read, metadata: Object.freeze(metadata) });
}
/** Erase source parameters only after the existing assignment relation accepts them. */
export function assign<T extends FieldType>(to: Slot<T>, from: Expr<NoInfer<T>, "working">): Source {
  checkedHandle(to);
  if (!expressions.has(from) || from.phase !== "working" || !fieldAssignable(from.type, to.type)) throw new TypeError("invalid program assignment");
  return Object.freeze({ op: "read", expression: from as unknown as Expr<FieldType, "working"> });
}
export function body(context: Schema, guards: All, effects: readonly Effect[], sends: readonly Tell[]): Program {
  if (!schemas.has(context)) throw new TypeError("unchecked schema");
  const act = context.definition.declared.acts[context.kind]!;
  const handle = (value: object) => { if (handles.get(value) !== context) throw new TypeError("handle from another context"); };
  const expression = (value: ExpressionData) => {
    if (!expressions.has(value)) throw new TypeError("unchecked expression");
    if (value.op === "field" || value.op === "slot") handle(value.handle);
    if (value.op === "self" && (value.type.type !== "fact" || !value.type.kind.includes(context.kind) || value.type.under !== context.definition.declared.name)) throw new TypeError("self needs this act's fact type");
  };
  const guard = (value: Guard): void => {
    if (value.op === "all") { value.guards.forEach(guard); return; }
    handle(value.metadata.subject);
    if (value.op === "prepared") { if (!Object.hasOwn(context.definition.declared.rules, value.rule)) throw new TypeError("unknown rule"); }
    else if (value.op === "state") {
      const type = own(context.definition.declared.items, value.metadata.subject.type);
      if (!type || value.states.some(state => !Object.hasOwn(type.states, state))) throw new TypeError("unknown state");
    } else {
      expression(value.read);
      if (value.read.phase !== "before" || value.read.type.type !== "time" || value.read.op !== "slot" || value.read.handle.subject.name !== value.metadata.subject.name) throw new TypeError("invalid time guard");
    }
  };
  guard(guards);
  for (const effect of effects) {
    if (effect.condition.if) guard(effect.condition.if);
    if (effect.condition.unless) guard(effect.condition.unless);
    if (effect.op === "state") {
      handle(effect.subject);
      if (!own(context.definition.declared.items, effect.subject.type)?.states[effect.state]) throw new TypeError("unknown effect state");
    } else {
      handle(effect.slot);
      if (effect.slot.kind !== effect.op || effect.slot.capability) throw new TypeError("invalid writable slot");
      if (effect.slot.fixed && (act.step !== "open" || effect.slot.subject.name !== "on")) throw new TypeError("a fixed slot needs its opening");
      if (effect.source.op === "read") { expression(effect.source.expression); assign(effect.slot, effect.source.expression); }
    }
  }
  for (const send of sends) {
    handle(send.destination);
    if (send.destination.type.type !== "scope" || Object.keys(send.clauses).length !== 0) throw new TypeError("invalid tell");
    if (send.condition) guard(send.condition);
    for (const [, value] of send.fields) { expression(value); if (value.phase !== "working") throw new TypeError("invalid send phase"); }
  }
  const node: Program = Object.freeze({ op: "body", kind: context.kind, definition: context.definition.digest,
    opening: act.step === "open" && act.on ? immutable({ name: act.on, type: context.definition.declared.items[act.on]! }) : null,
    guards: freezeNodes(guards), effects: freezeNodes(effects), sends: freezeNodes(sends),
    finish: immutable({ types: context.definition.declared.items, settles: false as const }) });
  programs.add(node); return node;
}
/** Freeze the graph in place: copying would discard its checked expression identities. */
function freezeNodes<T>(value: T): T {
  if (value !== null && typeof value === "object") { Object.values(value).forEach(freezeNodes); Object.freeze(value); }
  return value;
}
export function checkedProgram(program: Program): void {
  if (!programs.has(program)) throw new TypeError("unchecked program");
}
