/** Structural data recorded by the existing validator, with future clauses in separate roots. */
import type { Digest, EffectForm, Guard, Mark, MarkMost, Notify, SendForm, SendMark } from "@generalbusiness/dap-contract";
import type { Defining } from "../validate/context.ts";
import type { ValidDefinition } from "../validate/index.ts";
import type { FieldResolution, ForeignFieldResolution, FrameRead, OperandRead, RangeResolution, ReadValidation, ResolvedReads, SlotResolution, SubjectResolution } from "./reads.ts";
import { immutable } from "./model.ts";

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
}
type MutableResolutions = { -readonly [K in keyof ResolutionGroup]: ResolutionGroup[K][number][] };
const resolutions = (): MutableResolutions => ({ operands: [], subjects: [], slots: [], fields: [], foreignFields: [], ranges: [] });
const ownResolutions = (reads: MutableResolutions): ResolutionGroup => Object.freeze({
  operands: Object.freeze([...reads.operands]), subjects: Object.freeze([...reads.subjects]), slots: Object.freeze([...reads.slots]),
  fields: Object.freeze([...reads.fields]), foreignFields: Object.freeze([...reads.foreignFields]), ranges: Object.freeze([...reads.ranges]),
});
interface NodeBase { readonly path: string; readonly reads: ResolutionGroup; readonly children: readonly StructureNode[] }
type WrittenNode<C extends string, K extends PropertyKey, D> = NodeBase & { readonly category: C; readonly op: K; readonly data: Readonly<D> };
type NativeData = Mark & { most?: MarkMost; result?: SendMark["result"]; always?: true };
export interface FutureClause { readonly clause: string; readonly root: RootIdentity }
type NativeNode<C extends "guard" | "effect" | "send"> = WrittenNode<C, "native", NativeData>
  & (C extends "send" ? { readonly future: readonly FutureClause[] } : object);
export type ValueSource = { readonly op: "clear" }
  | { readonly op: "read"; readonly read: OperandRead }
  | { readonly op: "commit-clock"; readonly path: string; readonly plusSeconds: number };
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
  readonly reads: MutableResolutions; readonly children: PendingNode[]; readonly future: FutureClause[]; source?: ValueSource;
}
export interface BodyTrace {
  readonly id: RootIdentity; readonly binding: RootBinding; readonly origin: BodyTrace | null;
  readonly nodes: PendingNode[]; readonly reads: MutableResolutions; readonly stack: PendingNode[]; frame?: FrameRead;
}
interface Trace { readonly roots: BodyTrace[]; active: BodyTrace | null }
const pending = new WeakMap<Defining, Trace>();
interface Compiled {
  readonly structure: DefinitionStructure;
  readonly bodies: WeakMap<object, readonly BodyStructure[]>;
  readonly replacements: readonly { readonly source: object; readonly body: BodyStructure }[];
  readonly clauses: WeakMap<object, ReadonlyMap<string, readonly BodyStructure[]>>;
  readonly forms: WeakMap<object, readonly { readonly body: BodyStructure; readonly node: StructureNode }[]>;
}
const compiled = new WeakMap<ValidDefinition, Compiled>(), checkedRoots = new WeakSet<BodyStructure>();
const rootOwners = new WeakMap<BodyStructure, ValidDefinition>();
function traceOf(d: Defining): Trace {
  let trace = pending.get(d);
  if (!trace) { trace = { roots: [], active: null }; pending.set(d, trace); }
  return trace;
}

/** These scopes follow existing validation calls. They make no admission decision. */
export function beginBody(d: Defining, binding: RootBinding): BodyTrace {
  const trace = traceOf(d), body: BodyTrace = { id: Object.freeze({}), binding, origin: trace.active, nodes: [], reads: resolutions(), stack: [] };
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
export function recordResolution<K extends keyof ResolutionGroup>(d: Defining, kind: K, value: ResolutionGroup[K][number]): void {
  const body = pending.get(d)?.active;
  if (!body) return;
  // The kind selects the corresponding collection; callers supply its exact record type.
  const target = (body.stack.at(-1)?.reads ?? body.reads)[kind] as ResolutionGroup[K][number][];
  target.push(value);
}
export function recordValueSource(d: Defining, source: ValueSource): void {
  const node = pending.get(d)?.active?.stack.at(-1);
  if (node?.category === "effect" && node.op === "value") node.source = Object.freeze(source);
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
  const nodeOf = (node: PendingNode): StructureNode => {
    const data = immutable(node.data), children = Object.freeze(node.children.map(nodeOf));
    if (node.category === "effect" && node.op === "value" && !node.source) throw new TypeError("value form has no captured source");
    // Each discriminant came from the existing validator's admitted form branch.
    const owned = Object.freeze({ category: node.category, op: node.op, path: node.path, data, children,
      reads: ownResolutions(node.reads), ...(node.category === "send" ? { future: Object.freeze(node.future.map(link => Object.freeze({ ...link }))) } : {}),
      ...(node.source ? { source: node.source } : {}) }) as StructureNode;
    if (typeof node.data !== "object" || node.data === null) throw new TypeError("structural form has no source object");
    bindings.push({ source: node.data, node: owned });
    return owned;
  };
  const bodies = new WeakMap<object, BodyStructure[]>(), clauses = new WeakMap<object, Map<string, BodyStructure[]>>();
  const forms = new WeakMap<object, readonly { readonly body: BodyStructure; readonly node: StructureNode }[]>();
  const replacements: { source: object; body: BodyStructure }[] = [];
  const roots = trace.roots.map((root): BodyStructure => {
    if (!root.frame) throw new TypeError("structural body has no validator frame");
    bindings.length = 0;
    const body = Object.freeze({ id: root.id, origin: root.origin?.id ?? null, frame: root.frame, nodes: Object.freeze(root.nodes.map(nodeOf)), reads: ownResolutions(root.reads) });
    checkedRoots.add(body);
    rootOwners.set(body, definition);
    for (const { source, node } of bindings) forms.set(source, Object.freeze([...(forms.get(source) ?? []), Object.freeze({ body, node })]));
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
  compiled.set(definition, { structure, bodies, clauses, forms, replacements: Object.freeze(replacements) });
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
  if (rootOwners.get(body) !== definition) throw new TypeError("body structure belongs to another validation");
  return Object.freeze((compiled.get(definition)?.forms.get(source) ?? []).filter(binding => binding.body === body).map(binding => binding.node));
}

/** Timed judges pass their exact effect and attention arrays rather than a body object. */
export function timedStructure(definition: ValidDefinition, kind: string, effects: readonly unknown[], attention: readonly unknown[]): BodyStructure | null {
  const source = Object.hasOwn(definition.declared.timed, kind) ? definition.declared.timed[kind] : undefined;
  if (!source || source.effects !== effects || source.attention !== attention) return null;
  const body = bodyStructure(definition, source, `timed:${kind}`);
  return body?.frame.kind === "timed" ? body : null;
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
