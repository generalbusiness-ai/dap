/** Structural data recorded by the existing validator, with future clauses in separate roots. */
import type { Digest, EffectForm, Guard, Mark, MarkMost, Notify, SendForm, SendMark } from "@generalbusiness/dap-contract";
import type { Defining } from "../validate/context.ts";
import type { ValidDefinition } from "../validate/index.ts";
import type { ElementBinding, FieldResolution, ForeignFieldResolution, FrameRead, OperandRead, RangeResolution, ReadValidation, ResolvedReads, SlotResolution, SubjectResolution } from "./reads.ts";
import { immutable } from "./model.ts";
import { mapGuardChildren, type GuardPlan, type RangePlan } from "./guard-plan.ts";
import { conditionSubjects, type ConditionPlan } from "./condition-plan.ts";
import { ownEffectPlan, type AttentionPlan, type EffectPlan, type EffectValueSource } from "./effect-plan.ts";
import { ownSettlementPlan, type SettlementPlan } from "./settlement.ts";

type Keys<T> = T extends unknown ? keyof T : never;
export type GuardOp = Exclude<Keys<Guard>, "of" | "reason" | "ifPresent">;
export type EffectOp = Exclude<Keys<EffectForm>, "of" | "if" | "unless">;
export type SendOp = Keys<SendForm>;
export interface ResolutionGroup {
  readonly operands: readonly OperandRead[];
  readonly subjects: readonly SubjectResolution[];
  readonly slots: readonly SlotResolution[];
  readonly fields: readonly FieldResolution[];
  readonly foreignFields: readonly ForeignFieldResolution[];
  readonly ranges: readonly RangeResolution[];
  readonly bindings: readonly ElementBinding[];
}
type MutableResolutions = { -readonly [K in keyof ResolutionGroup]: ResolutionGroup[K][number][] };
const resolutions = (): MutableResolutions => ({ operands: [], subjects: [], slots: [], fields: [], foreignFields: [], ranges: [], bindings: [] });
const ownResolutions = (reads: MutableResolutions): ResolutionGroup => Object.freeze({
  operands: Object.freeze([...reads.operands]), subjects: Object.freeze([...reads.subjects]), slots: Object.freeze([...reads.slots]),
  fields: Object.freeze([...reads.fields]), foreignFields: Object.freeze([...reads.foreignFields]), ranges: Object.freeze([...reads.ranges]), bindings: Object.freeze([...reads.bindings]),
});
interface NodeBase { readonly path: string; readonly reads: ResolutionGroup; readonly children: readonly StructureNode[] }
type WrittenNode<C extends string, K extends PropertyKey, D> = NodeBase & { readonly category: C; readonly op: K; readonly data: Readonly<D> };
type NativeData = Mark & { most?: MarkMost; result?: SendMark["result"]; always?: true };
export interface FutureClause { readonly clause: string; readonly root: RootIdentity }
type NativeNode<C extends "guard" | "effect" | "send"> = WrittenNode<C, "native", NativeData>
  & (C extends "send" ? { readonly future: readonly FutureClause[] } : object);
export type ValueSource = EffectValueSource;
export type GuardNode = { [K in GuardOp]: WrittenNode<"guard", K, Extract<Guard, Record<K, unknown>>> }[GuardOp] | NativeNode<"guard">;
export type EffectNode = { [K in EffectOp]: WrittenNode<"effect", K, Extract<EffectForm, Record<K, unknown>>>
  & (K extends "value" ? { readonly source: ValueSource } : object) }[EffectOp] | NativeNode<"effect">;
export type SendNode = { [K in SendOp]: WrittenNode<"send", K, Extract<SendForm, Record<K, unknown>>> & { readonly future: readonly FutureClause[] } }[SendOp] | NativeNode<"send">;
export type AttentionNode = WrittenNode<"attention", "notify", Notify>;
export type StructureNode = GuardNode | EffectNode | SendNode | AttentionNode;
type Category = StructureNode["category"];
type Opcode = StructureNode["op"];

/** Identity is local to one admitted graph, not a digest or a diagnostic path. */
export type RootIdentity = Readonly<object>;
export interface BodyStructure {
  readonly id: RootIdentity;
  readonly origin: RootIdentity | null;
  readonly frame: FrameRead;
  readonly reads: ResolutionGroup;
  readonly nodes: readonly StructureNode[];
  readonly settlement: SettlementPlan | null;
}
export interface DefinitionStructure {
  readonly validation: ReadValidation;
  readonly digest: Digest;
  readonly profile: Readonly<ValidDefinition["declared"]["profile"]>;
  readonly rules: Readonly<ValidDefinition["declared"]["rules"]>;
  readonly capabilities: Readonly<ValidDefinition["declared"]["capabilities"]>;
  readonly roots: readonly BodyStructure[];
  readonly marks: ResolvedReads["marks"];
  readonly underived: ResolvedReads["underived"];
}
export type RootBinding = { readonly kind: "body"; readonly source: object }
  | { readonly kind: "clause"; readonly owner: object; readonly clause: string };
interface PendingNode {
  readonly category: Category; readonly op: Opcode; readonly path: string; readonly data: unknown;
  readonly reads: MutableResolutions; readonly children: PendingNode[]; readonly future: FutureClause[];
  guard?: GuardPlan<FormTrace>;
  effect?: EffectPlan;
  attention?: AttentionPlan;
  conditions?: Partial<Record<"if" | "unless", PendingGuardList>>;
}
export interface BodyTrace {
  readonly id: RootIdentity; readonly binding: RootBinding; readonly origin: BodyTrace | null;
  readonly nodes: PendingNode[]; readonly reads: MutableResolutions; readonly stack: PendingNode[]; frame?: FrameRead;
  readonly guardLists: PendingGuardList[];
  readonly ranges: PendingRange[];
  settlement?: SettlementPlan;
}
export type GuardListPlace = "guards" | "if" | "unless";
/** The caller supplies the semantic use, independent of diagnostic paths. */
export type RangeUse = "guard" | "same-set" | "fanout" | `capability:${string}` | `attribute:${number}` | `collect:${string}`;
interface PendingGuardList { readonly source: object; readonly owner: PendingNode | null; readonly place: GuardListPlace; readonly nodes: readonly PendingNode[] }
interface PendingRange { readonly source: object; readonly owner: PendingNode | null; readonly use: RangeUse; readonly plan: RangePlan }
interface GuardListBinding { readonly body: BodyStructure; readonly owner: StructureNode | null; readonly place: GuardListPlace; readonly nodes: readonly GuardNode[] }
interface RangeBinding { readonly body: BodyStructure; readonly owner: StructureNode | null; readonly use: RangeUse; readonly plan: RangePlan }
interface Trace { readonly roots: BodyTrace[]; active: BodyTrace | null }
const pending = new WeakMap<Defining, Trace>();
interface Compiled {
  readonly structure: DefinitionStructure;
  readonly bodies: WeakMap<object, readonly BodyStructure[]>;
  readonly replacements: readonly { readonly source: object; readonly body: BodyStructure }[];
  readonly clauses: WeakMap<object, ReadonlyMap<string, readonly BodyStructure[]>>;
  readonly forms: WeakMap<object, readonly { readonly body: BodyStructure; readonly node: StructureNode }[]>;
  readonly origins: WeakMap<object, object>;
  readonly guardLists: WeakMap<object, readonly GuardListBinding[]>;
  readonly ranges: WeakMap<object, readonly RangeBinding[]>;
}
const compiled = new WeakMap<ValidDefinition, Compiled>(), checkedRoots = new WeakSet<BodyStructure>();
const rootOwners = new WeakMap<BodyStructure, ValidDefinition>();
const nodeRoots = new WeakMap<StructureNode, BodyStructure>(), guardPlans = new WeakMap<GuardNode, GuardPlan<GuardNode>>();
const guardSources = new WeakMap<GuardNode, object>();
const conditionPlans = new WeakMap<StructureNode, ConditionPlan<GuardNode>>();
const effectPlans = new WeakMap<EffectNode, EffectPlan>(), attentionPlans = new WeakMap<AttentionNode, AttentionPlan>();
const effectSources = new WeakMap<EffectNode, EffectForm>();
function traceOf(d: Defining): Trace {
  let trace = pending.get(d);
  if (!trace) { trace = { roots: [], active: null }; pending.set(d, trace); }
  return trace;
}

/** These scopes follow existing validation calls. They make no admission decision. */
export function beginBody(d: Defining, binding: RootBinding): BodyTrace {
  const trace = traceOf(d), body: BodyTrace = { id: Object.freeze({}), binding, origin: trace.active, nodes: [], reads: resolutions(), stack: [], guardLists: [], ranges: [] };
  if (binding.kind === "clause" && body.origin) {
    const send = body.origin.stack.at(-1) ?? body.origin.nodes.at(-1);
    if (send?.category === "send" && send.data === binding.owner) send.future.push({ clause: binding.clause, root: body.id });
  }
  trace.roots.push(body); trace.active = body; return body;
}
export function endBody(d: Defining, body: BodyTrace): void {
  const trace = traceOf(d);
  if (trace.active !== body || body.stack.length) throw new TypeError("unclosed structural body scope");
  trace.active = body.origin;
}
export function noteFrame(d: Defining, frame: FrameRead): void {
  const body = pending.get(d)?.active;
  if (body) body.frame = frame;
}
export interface FormTrace { readonly body: BodyTrace; readonly node: PendingNode }
export interface GuardListTrace { readonly body: BodyTrace; readonly source: object; readonly owner: PendingNode | null; readonly place: GuardListPlace; readonly nodes: readonly PendingNode[]; readonly start: number }
export function beginGuardList(d: Defining, source: unknown, place: GuardListPlace): GuardListTrace | null {
  const body = pending.get(d)?.active;
  if (!body || !Array.isArray(source)) return null;
  const owner = body.stack.at(-1) ?? null, nodes = owner?.children ?? body.nodes;
  return { body, source, owner, place, nodes, start: nodes.length };
}
export function endGuardList(d: Defining, list: GuardListTrace | null): void {
  if (!list) return;
  if (pending.get(d)?.active !== list.body || (list.body.stack.at(-1) ?? null) !== list.owner) throw new TypeError("unclosed guard list scope");
  const nodes = list.nodes.slice(list.start);
  if (nodes.some(node => node.category !== "guard")) throw new TypeError("guard list captured a non-guard form");
  const captured: PendingGuardList = { source: list.source, owner: list.owner, place: list.place, nodes };
  list.body.guardLists.push(captured);
  if (list.owner && list.place !== "guards") {
    list.owner.conditions ??= {};
    if (list.owner.conditions[list.place]) throw new TypeError("condition has two groups in the same semantic place");
    list.owner.conditions[list.place] = captured;
  }
}
export function recordRangePlan(d: Defining, source: object, use: RangeUse, plan: RangePlan): void {
  const body = pending.get(d)?.active;
  if (body) body.ranges.push({ source, owner: body.stack.at(-1) ?? null, use, plan });
}
export function enterForm(d: Defining, category: Category, op: Opcode, path: string, data: unknown): FormTrace | null {
  const body = pending.get(d)?.active;
  if (!body) return null;
  const node: PendingNode = { category, op, path, data, reads: resolutions(), children: [], future: [] };
  (body.stack.at(-1)?.children ?? body.nodes).push(node); body.stack.push(node); return { body, node };
}
export function leaveForm(d: Defining, form: FormTrace | null): void {
  if (!form) return;
  if (pending.get(d)?.active !== form.body || form.body.stack.pop() !== form.node) throw new TypeError("unclosed structural form scope");
}
export function recordGuardPlan(form: FormTrace | null, plan: GuardPlan<FormTrace>): void {
  if (!form) return;
  if (form.node.category !== "guard" || form.node.op !== plan.code.op) throw new TypeError("guard instruction has no matching guard scope");
  form.node.guard = plan;
}
export function recordResolution<K extends keyof ResolutionGroup>(d: Defining, kind: K, value: ResolutionGroup[K][number]): void {
  const body = pending.get(d)?.active;
  if (!body) return;
  // The kind selects the corresponding collection; callers supply its exact record type.
  const target = (body.stack.at(-1)?.reads ?? body.reads)[kind] as ResolutionGroup[K][number][];
  target.push(value);
}
export function recordEffectPlan(d: Defining, plan: EffectPlan): void {
  const node = pending.get(d)?.active?.stack.at(-1);
  if (!node) return;
  if (node.category !== "effect" || node.op !== plan.code.op) throw new TypeError("effect instruction has no matching admitted form scope");
  node.effect = plan;
}
export function recordAttentionPlan(d: Defining, plan: AttentionPlan): void {
  const node = pending.get(d)?.active?.stack.at(-1);
  if (!node) return;
  if (node.category !== "attention") throw new TypeError("attention instruction has no matching admitted form scope");
  node.attention = plan;
}
export function recordSettlementPlan(d: Defining, plan: SettlementPlan): void {
  const body = pending.get(d)?.active;
  if (!body) return;
  if (body.stack.length || body.settlement) throw new TypeError("settlement has no unique admitted body scope");
  body.settlement = plan;
}
export function recordNativeForm(d: Defining, kind: string, path: string, data: unknown): void {
  if (kind !== "guard" && kind !== "effect" && kind !== "send") return;
  const scope = enterForm(d, kind, "native", path, data); leaveForm(d, scope);
}

/** Called only after the actual final admission and canonical-byte checks. */
export function finishStructure(d: Defining, definition: ValidDefinition, reads: ResolvedReads): void {
  const trace = pending.get(d);
  if (!trace) return;
  if (trace.active !== null) throw new TypeError("unclosed definition structure");
  const bindings: { source: object; node: StructureNode }[] = [];
  const ownedNodes = new WeakMap<PendingNode, StructureNode>();
  const origins = new WeakMap<object, object>();
  const nodeOf = (node: PendingNode): StructureNode => {
    const existing = ownedNodes.get(node);
    if (existing) return existing;
    const data = immutable(node.data, origins), children = Object.freeze(node.children.map(nodeOf));
    if (node.category === "effect" && node.op !== "native" && !node.effect) throw new TypeError("effect form has no captured instruction");
    if (node.category === "attention" && !node.attention) throw new TypeError("attention form has no captured instruction");
    const effect = node.effect ? ownEffectPlan(node.effect, origins) : null;
    const valueSource = effect?.code.op === "value" ? effect.code.source : null;
    // Each discriminant came from the existing validator's admitted form branch.
    const owned = Object.freeze({ category: node.category, op: node.op, path: node.path, data, children,
      reads: ownResolutions(node.reads), ...(node.category === "send" ? { future: Object.freeze(node.future.map(link => Object.freeze({ ...link }))) } : {}),
      ...(valueSource ? { source: valueSource } : {}) }) as StructureNode;
    if (typeof node.data !== "object" || node.data === null) throw new TypeError("structural form has no source object");
    bindings.push({ source: node.data, node: owned });
    ownedNodes.set(node, owned);
    if (owned.category === "effect" && effect) effectPlans.set(owned, effect);
    if (owned.category === "attention" && node.attention) attentionPlans.set(owned, Object.freeze({ ...node.attention }));
    const conditionGuards = (place: "if" | "unless"): readonly GuardNode[] | null => {
      const group = node.conditions?.[place];
      return group ? Object.freeze(group.nodes.map(pending => {
        const child = nodeOf(pending);
        if (child.category !== "guard") throw new TypeError("condition has a non-guard instruction");
        return child;
      })) : null;
    };
    if (owned.category === "effect" || owned.category === "attention") conditionPlans.set(owned, Object.freeze({
      if: conditionGuards("if"), unless: conditionGuards("unless"),
      // Only final admission permits traversing a whole condition. A refused
      // argument can hold a cyclic ignored value without canonical bytes.
      absentSubjects: Object.freeze(node.conditions?.if ? [...conditionSubjects(node.conditions.if.source)] : []),
    }));
    if (owned.category === "guard" && node.guard) guardPlans.set(owned, mapGuardChildren(node.guard, trace => {
      const child = nodeOf(trace.node);
      if (child.category !== "guard") throw new TypeError("guard instruction has a non-guard child");
      return child;
    }, origins));
    return owned;
  };
  const bodies = new WeakMap<object, BodyStructure[]>(), clauses = new WeakMap<object, Map<string, BodyStructure[]>>();
  const forms = new WeakMap<object, readonly { readonly body: BodyStructure; readonly node: StructureNode }[]>();
  const guardLists = new WeakMap<object, readonly GuardListBinding[]>(), ranges = new WeakMap<object, readonly RangeBinding[]>();
  const replacements: { source: object; body: BodyStructure }[] = [];
  const roots = trace.roots.map((root): BodyStructure => {
    if (!root.frame) throw new TypeError("structural body has no validator frame");
    bindings.length = 0;
    const body = Object.freeze({ id: root.id, origin: root.origin?.id ?? null, frame: root.frame, nodes: Object.freeze(root.nodes.map(nodeOf)), reads: ownResolutions(root.reads),
      settlement: root.settlement ? ownSettlementPlan(root.settlement) : null });
    checkedRoots.add(body);
    rootOwners.set(body, definition);
    for (const { source, node } of bindings) {
      nodeRoots.set(node, body);
      if (node.category === "guard") guardSources.set(node, source);
      if (node.category === "effect") effectSources.set(node, source as EffectForm);
      forms.set(source, Object.freeze([...(forms.get(source) ?? []), Object.freeze({ body, node })]));
    }
    for (const list of root.guardLists) {
      const nodes = list.nodes.map(node => {
        const owned = nodeOf(node);
        if (owned.category !== "guard") throw new TypeError("guard list has a non-guard instruction");
        return owned;
      });
      const entry = Object.freeze({ body, owner: list.owner ? nodeOf(list.owner) : null, place: list.place, nodes: Object.freeze(nodes) });
      guardLists.set(list.source, Object.freeze([...(guardLists.get(list.source) ?? []), entry]));
    }
    for (const range of root.ranges) {
      const entry = Object.freeze({ body, owner: range.owner ? nodeOf(range.owner) : null, use: range.use, plan: range.plan });
      ranges.set(range.source, Object.freeze([...(ranges.get(range.source) ?? []), entry]));
    }
    if (root.binding.kind === "body") {
      const existing = bodies.get(root.binding.source) ?? []; existing.push(body); bodies.set(root.binding.source, existing);
      if (root.frame.kind === "replacement") replacements.push({ source: root.binding.source, body });
    } else {
      const existing = clauses.get(root.binding.owner) ?? new Map<string, BodyStructure[]>();
      const named = existing.get(root.binding.clause) ?? []; named.push(body); existing.set(root.binding.clause, named); clauses.set(root.binding.owner, existing);
    }
    return body;
  });
  const structure: DefinitionStructure = Object.freeze({ validation: reads.validation, digest: definition.digest,
    profile: immutable(definition.declared.profile), rules: immutable(definition.declared.rules), capabilities: immutable(definition.declared.capabilities),
    roots: Object.freeze(roots), marks: reads.marks, underived: reads.underived });
  compiled.set(definition, { structure, bodies, clauses, forms, origins, guardLists, ranges, replacements: Object.freeze(replacements) });
  pending.delete(d);
}
export const structureOf = (definition: ValidDefinition): DefinitionStructure | null => compiled.get(definition)?.structure ?? null;

/** A replacement keeps its parent's headers and declared nonempty form arrays. */
function replacementMatches(source: object, body: object): boolean {
  const a = source as Record<string, unknown>, b = body as Record<string, unknown>;
  for (const key of ["fields", "also", "from", "class", "message", "opens", "settles"]) if (a[key] !== b[key]) return false;
  for (const key of ["guards", "effects", "sends", "attention"]) {
    if (a[key] === b[key]) continue;
    if (!(Array.isArray(a[key]) && (a[key] as unknown[]).length === 0 && Array.isArray(b[key]) && (b[key] as unknown[]).length === 0)) return false;
  }
  return true;
}
export function bodyStructure(definition: ValidDefinition, source: object, kind?: string): BodyStructure | null {
  const found = compiled.get(definition);
  const candidates = found?.bodies.get(source);
  if (candidates?.length === 1) return candidates[0]!;
  const direct = candidates?.filter(body => kind === undefined || body.frame.context.kind === kind);
  if (direct?.length === 1) return direct[0]!;
  const replacements = found?.replacements.filter(entry => replacementMatches(entry.source, source) && (kind === undefined || entry.body.frame.context.kind === kind));
  return replacements?.length === 1 ? replacements[0]!.body : null;
}
export function clauseStructure(definition: ValidDefinition, owner: object, clause: string, origin: BodyStructure | null, kind: string): BodyStructure | null {
  const found = compiled.get(definition)?.clauses.get(owner)?.get(clause)?.filter(body =>
    body.origin === (origin?.id ?? null) && body.frame.context.kind === kind);
  return found?.length === 1 ? found[0]! : null;
}

/** Resolve occurrences by their source object and admitted body, including lexical aliases. */
export function formStructures(definition: ValidDefinition, body: BodyStructure, source: object): readonly StructureNode[] {
  checkedBody(definition, body);
  return Object.freeze((compiled.get(definition)?.forms.get(source) ?? []).filter(binding => binding.body === body).map(binding => binding.node));
}
export function checkedBody(definition: ValidDefinition, body: BodyStructure): void {
  if (rootOwners.get(body) !== definition) throw new TypeError("body structure belongs to another validation");
}
function checkedOwner(definition: ValidDefinition, body: BodyStructure, owner: StructureNode | null): Compiled {
  checkedBody(definition, body);
  if (owner !== null && nodeRoots.get(owner) !== body) throw new TypeError("form belongs to another admitted body");
  return compiled.get(definition)!;
}
/** A condition's semantic place distinguishes aliased if/unless lists on one form. */
export function guardList(definition: ValidDefinition, body: BodyStructure, owner: StructureNode | null, source: object, place: GuardListPlace): readonly GuardNode[] | null {
  const found = checkedOwner(definition, body, owner), original = found.origins.get(source) ?? source;
  const matches = found.guardLists.get(original)?.filter(list => list.body === body && list.owner === owner && list.place === place);
  return matches?.length === 1 ? matches[0]!.nodes : null;
}
export function rangePlan(definition: ValidDefinition, body: BodyStructure, owner: StructureNode | null, source: object, use: RangeUse): RangePlan | null {
  const found = checkedOwner(definition, body, owner), original = found.origins.get(source) ?? source;
  const matches = found.ranges.get(original)?.filter(range => range.body === body && range.owner === owner && range.use === use);
  return matches?.length === 1 ? matches[0]!.plan : null;
}
/** An existing raw-list caller must name one actual admitted group. */
export function guardListContext(definition: ValidDefinition, source: object, kind: string): { readonly body: BodyStructure; readonly nodes: readonly GuardNode[] } | null {
  const found = compiled.get(definition), original = found?.origins.get(source) ?? source;
  const matches = found?.guardLists.get(original)?.filter(list => list.body.frame.context.kind === kind || list.body.frame.context.kind === null);
  return matches?.length === 1 ? { body: matches[0]!.body, nodes: matches[0]!.nodes } : null;
}
/** Compatibility with a single raw guard requires its unique actual occurrence. */
export function guardContext(definition: ValidDefinition, source: Guard, kind: string, inherited: string): { readonly body: BodyStructure; readonly node: GuardNode } | null {
  const matches = compiled.get(definition)?.forms.get(source)?.filter((binding): binding is { body: BodyStructure; node: GuardNode } =>
    binding.node.category === "guard" && (binding.body.frame.context.kind === kind || binding.body.frame.context.kind === null)
    && (binding.node.op === "native" || guardPlans.get(binding.node)?.site.subject === (source.of ?? inherited)));
  return matches?.length === 1 ? matches[0]! : null;
}
/** Each declared guard reads its actual admitted executable instruction. Native stays opaque. */
export function guardPlan(definition: ValidDefinition, body: BodyStructure, node: GuardNode): GuardPlan<GuardNode> | null {
  if (rootOwners.get(body) !== definition || nodeRoots.get(node) !== body) throw new TypeError("guard instruction belongs to another admitted body");
  return guardPlans.get(node) ?? null;
}
/** Native and capability refusal maps keep the original declared object's identity. */
export function guardSource(definition: ValidDefinition, body: BodyStructure, node: GuardNode): Guard {
  if (rootOwners.get(body) !== definition || nodeRoots.get(node) !== body) throw new TypeError("guard source belongs to another admitted body");
  const source = guardSources.get(node);
  if (!source) throw new TypeError("guard instruction has no source identity");
  return source as Guard;
}

/** Select conditions by the admitted occurrence, never by a declaration path. */
export function conditionPlan(definition: ValidDefinition, body: BodyStructure, node: EffectNode | AttentionNode): ConditionPlan<GuardNode> {
  checkedOwner(definition, body, node);
  const plan = conditionPlans.get(node);
  if (!plan) throw new TypeError("form has no admitted condition instruction");
  return plan;
}
export function effectPlan(definition: ValidDefinition, body: BodyStructure, node: EffectNode): EffectPlan | null {
  checkedOwner(definition, body, node);
  return effectPlans.get(node) ?? null;
}
/** Native rules retain their original declared mark and fault identity through M7. */
export function effectSource(definition: ValidDefinition, body: BodyStructure, node: EffectNode): EffectForm {
  checkedOwner(definition, body, node);
  const source = effectSources.get(node);
  if (!source) throw new TypeError("effect instruction has no source identity");
  return source;
}
export function attentionPlan(definition: ValidDefinition, body: BodyStructure, node: AttentionNode): AttentionPlan {
  checkedOwner(definition, body, node);
  const plan = attentionPlans.get(node);
  if (!plan) throw new TypeError("attention has no admitted executable instruction");
  return plan;
}

/** Timed judges pass their exact effect and attention arrays rather than a body object. */
export function timedStructure(definition: ValidDefinition, kind: string, effects: readonly unknown[], attention: readonly unknown[]): BodyStructure | null {
  const source = Object.hasOwn(definition.declared.timed, kind) ? definition.declared.timed[kind] : undefined;
  if (!source || source.effects !== effects || source.attention !== attention) return null;
  const body = bodyStructure(definition, source, `timed:${kind}`);
  return body?.frame.kind === "timed" ? body : null;
}

export interface FormContext { readonly body: BodyStructure; readonly owner: StructureNode }
/** Select the actual written occurrence, even when two forms share one object. */
export function formContext(definition: ValidDefinition, body: BodyStructure | null, category: Category, ordinal: number, source: object): FormContext {
  if (!body) throw new TypeError("form has no admitted body context");
  checkedBody(definition, body);
  const owner = body.nodes.filter(node => node.category === category)[ordinal];
  if (!owner || !formStructures(definition, body, source).includes(owner)) throw new TypeError("form does not match its admitted occurrence");
  return { body, owner };
}

export interface ClockRead { readonly path: string; readonly kind: "before" | "after" | "value-time" }
/** All declared child forms contribute; future result roots have no child edge here. */
export function declaredClockReads(body: BodyStructure): readonly ClockRead[] {
  if (!checkedRoots.has(body)) throw new TypeError("body structure was not admitted by this validator");
  const reads: ClockRead[] = [];
  const visit = (node: StructureNode): void => {
    switch (node.category) {
      case "guard":
        switch (node.op) {
          case "before": case "after": reads.push(Object.freeze({ path: node.path, kind: node.op })); break;
          case "state": case "signer": case "notIn": case "set": case "unset": case "equals": case "differs": case "some": case "none": case "count": case "every": case "fact": case "rule": case "each": case "has": case "anyOf": case "distinct": case "sameSet": case "capability": case "native": break;
          default: exhaustive(node);
        }
        break;
      case "effect":
        switch (node.op) {
          case "value": if (node.source.op === "commit-clock") reads.push(Object.freeze({ path: node.source.path, kind: "value-time" })); break;
          case "state": case "party": case "ref": case "attribute": case "hold": case "redact": case "capability": case "native": break;
          default: exhaustive(node);
        }
        break;
      case "send":
        switch (node.op) { case "create": case "tell": case "relate": case "index": case "native": break; default: exhaustive(node); }
        break;
      case "attention": break;
      default: exhaustive(node);
    }
    node.children.forEach(visit);
  };
  body.nodes.forEach(visit); return Object.freeze(reads);
}
export const bodyJudgesClock = (body: BodyStructure): boolean => declaredClockReads(body).length > 0;
function exhaustive(value: never): never { throw new TypeError(`unknown structure node: ${String(value)}`); }
