/** Owned data from the validator's resolutions; no name checker or executable fallback. */
import type { Bounds, FieldType, FieldValue, TypeMark } from "@generalbusiness/dap-contract";
import type { Ctx, Defining, ElementIdentity, MarkPlace, OwnerIdentity, Slot, Type } from "../validate/context.ts";
import type { Underived } from "../validate/capability.ts";
import type { ValidDefinition } from "../validate/index.ts";
import { immutable, type Phase } from "./data.ts";
import { finishStructure, noteFrame, recordResolution } from "./structure.ts";
import { currentRow, type RowIdentity } from "./rows.ts";

export type ReadType = { readonly kind: "declared"; readonly type: FieldType }
  | { readonly kind: "native"; readonly mark: TypeMark } | { readonly kind: "unknown" };
const unknown: ReadType = Object.freeze({ kind: "unknown" });
export function readType(type: FieldType | null): ReadType {
  if (type === null) return unknown;
  // The existing validator keeps admitted type marks in its FieldType table.
  // Preserve that resolution without presenting an opaque mark as a concrete type.
  if (Object.hasOwn(type, "code")) return Object.freeze({ kind: "native", mark: immutable(type as unknown as TypeMark) });
  return Object.freeze({ kind: "declared", type: immutable(type) });
}

/** Each validator invocation has its own identity, even when declaration digests agree. */
export interface ReadValidation { readonly bounds: Bounds; readonly definition: string | null; readonly platform: boolean }
const validations = new WeakMap<Defining, ReadValidation>();
interface ReadCollection { operands: OperandRead[]; subjects: SubjectResolution[]; slots: SlotResolution[]; fields: FieldResolution[]; foreignFields: ForeignFieldResolution[]; ranges: RangeResolution[]; bindings: ElementBinding[]; frames: FrameRead[] }
const captured = new WeakMap<Defining, ReadCollection>();
const admitted = new WeakMap<ValidDefinition, ResolvedReads>();
const operandOwners = new WeakMap<OperandRead, ValidDefinition>();

function collection(d: Defining): ReadCollection {
  let reads = captured.get(d);
  if (!reads) { reads = { operands: [], subjects: [], slots: [], fields: [], foreignFields: [], ranges: [], bindings: [], frames: [] }; captured.set(d, reads); }
  return reads;
}

/** A validation result owns its reads; equal declaration digests do not share this evidence. */
export interface ResolvedReads {
  readonly validation: ReadValidation;
  readonly operands: readonly OperandRead[];
  readonly subjects: readonly SubjectResolution[];
  readonly slots: readonly SlotResolution[];
  readonly fields: readonly FieldResolution[];
  readonly ranges: readonly RangeResolution[];
  readonly foreignFields: readonly ForeignFieldResolution[];
  readonly bindings: readonly ElementBinding[];
  readonly marks: readonly MarkPlace[];
  readonly underived: readonly Underived[];
  readonly frames: readonly FrameRead[];
}

/** Called only where the existing operand validator returns its successful resolution. */
export function recordRead(d: Defining, node: OperandRead): void {
  collection(d).operands.push(node);
  recordResolution(d, "operands", node);
}

/** Attach only after every admission check has succeeded, using the actual returned object. */
export function bindReads(d: Defining, definition: ValidDefinition, format: ValidDefinition["declared"]["format"]): ValidDefinition {
  const reads = collection(d);
  const evidence: ResolvedReads = Object.freeze({ validation: validation(d), operands: Object.freeze([...reads.operands]),
    subjects: Object.freeze([...reads.subjects]), slots: Object.freeze([...reads.slots]), fields: Object.freeze([...reads.fields]),
    foreignFields: Object.freeze([...reads.foreignFields]), ranges: Object.freeze([...reads.ranges]), bindings: Object.freeze([...reads.bindings]), frames: Object.freeze([...reads.frames]), marks: immutable(d.marks), underived: immutable(d.underived) });
  finishStructure(d, definition, evidence, format);
  for (const operand of evidence.operands) operandOwners.set(operand, definition);
  admitted.set(definition, evidence);
  return definition;
}

/** No digest cache or reconstruction from caller-supplied declarations. */
export const resolvedReads = (definition: ValidDefinition): ResolvedReads | null => admitted.get(definition) ?? null;
/** Executable visitors accept the validator's actual descriptor, never a structural copy. */
export function checkedOperand(definition: ValidDefinition, operand: OperandRead): void {
  if (operandOwners.get(operand) !== definition) throw new TypeError("operand was not admitted by this validation");
}
function validation(d: Defining): ReadValidation {
  let found = validations.get(d);
  if (!found) {
    found = Object.freeze({ bounds: immutable(d.bounds), definition: d.name ?? null, platform: d.platform === true });
    validations.set(d, found);
  }
  return found;
}
export interface ReadContext {
  readonly validation: ReadValidation;
  readonly kind: string | null;
  readonly row: RowIdentity | null;
  readonly clause: boolean;
  readonly handler: Readonly<{ update: boolean; under: string | null }> | null;
  readonly senderKind: string | null;
}
function contextOf(d: Defining, ctx: Ctx): ReadContext {
  return Object.freeze({ validation: validation(d), kind: ctx.kind, row: currentRow(d), clause: ctx.clause,
    handler: ctx.handler ? Object.freeze({ ...ctx.handler }) : null, senderKind: ctx.senderKind ?? null });
}
export interface ReadSite { readonly path: string; readonly phase: Phase; readonly context: ReadContext; readonly type: ReadType }
export function readSite(d: Defining, ctx: Ctx, path: string, guard: boolean, type: FieldType | null): ReadSite {
  return Object.freeze({ path, phase: guard ? "before" : "working", type: readType(type), context: contextOf(d, ctx) });
}
/** Resolution sites have no phase until their owning form states how it uses the handle. */
interface ResolutionSite { readonly path: string; readonly context: ReadContext }
export interface SubjectResolution extends ResolutionSite { readonly subject: SubjectRead | "scope" }
export interface SlotResolution extends ResolutionSite { readonly slot: SlotRead; readonly access: "read" | "write" | "redact" }
export interface FieldResolution extends ResolutionSite { readonly name: string; readonly type: ReadType }
export interface ForeignFieldResolution extends ResolutionSite { readonly factField: string; readonly name: string; readonly type: ReadType }
export interface RangeResolution extends ResolutionSite { readonly subject: SubjectRead; readonly states: readonly string[] }
export type FrameKind = "act" | "handler" | "replacement" | "timed" | "clause" | "outcome-clause";
/** The existing validator frame, before a structural graph groups its forms. */
export interface FrameRead extends ResolutionSite {
  readonly kind: FrameKind;
  readonly on: SubjectRead | null;
  readonly also: readonly SubjectRead[];
  readonly fields: readonly (readonly [string, ReadType])[] | null;
  readonly presented: readonly (readonly [string, ReadType])[];
  readonly signer: boolean;
  readonly timed: boolean;
  readonly nascent: boolean;
  readonly unsettled: readonly string[];
}

export function recordFrame(d: Defining, ctx: Ctx, path: string, kind: FrameKind): void {
  const fields = (entries: ReadonlyMap<string, FieldType>): readonly (readonly [string, ReadType])[] =>
    Object.freeze([...entries].map(([name, type]) => Object.freeze([name, readType(type)] as const)));
  const frame: FrameRead = Object.freeze({ path, context: contextOf(d, ctx), kind,
    on: ctx.on ? subjectRead(ctx.on, { kind: "subject", name: "on" }) : null,
    also: Object.freeze([...ctx.also].map(([name, type]) => subjectRead(type, { kind: "subject", name: `also.${name}` }))),
    fields: ctx.fields === null ? null : fields(ctx.fields), presented: fields(ctx.presented), signer: ctx.signer, timed: ctx.timed,
    nascent: ctx.nascent, unsettled: Object.freeze([...(ctx.unsettled ?? [])]) });
  collection(d).frames.push(frame); noteFrame(d, frame);
}

export function recordSubject(d: Defining, ctx: Ctx, path: string, type: Type | "scope", name: string): void {
  const read = Object.freeze({ path, context: contextOf(d, ctx), subject: type === "scope" ? "scope" as const : subjectRead(type, { kind: "subject", name }) });
  collection(d).subjects.push(read); recordResolution(d, "subjects", read);
}
export function recordSlot(d: Defining, ctx: Ctx, path: string, type: Type, identity: SubjectRead["identity"], name: string, slot: Slot, access: SlotResolution["access"]): SlotResolution {
  const read = Object.freeze({ path, context: contextOf(d, ctx), slot: slotRead(subjectRead(type, identity), name, slot), access });
  collection(d).slots.push(read); recordResolution(d, "slots", read);
  return read;
}
export function recordField(d: Defining, ctx: Ctx, path: string, name: string, type: FieldType): FieldResolution {
  const read = Object.freeze({ path, context: contextOf(d, ctx), name, type: readType(type) });
  collection(d).fields.push(read); recordResolution(d, "fields", read);
  return read;
}
export function recordForeignField(d: Defining, ctx: Ctx, path: string, factField: string, name: string): void {
  const read = Object.freeze({ path, context: contextOf(d, ctx), factField, name, type: unknown });
  collection(d).foreignFields.push(read); recordResolution(d, "foreignFields", read);
}
export function recordRange(d: Defining, ctx: Ctx, path: string, type: Type, states: readonly string[]): void {
  const read = Object.freeze({ path, context: contextOf(d, ctx), subject: subjectRead(type, { kind: "range", path, type: type.name }), states: Object.freeze([...states]) });
  collection(d).ranges.push(read); recordResolution(d, "ranges", read);
}
export interface ElementBinding {
  readonly name: string;
  readonly identity: ElementIdentity;
  readonly declaration: string;
  readonly type: ReadType;
}
/** Keep the binder identity created by the existing lexical validation step. */
export function recordElementBinding(d: Defining, ctx: Ctx, name: string, type: FieldType | null, path: string): ElementBinding {
  const identity = ctx.elementIdentities.get(name);
  if (!identity) throw new TypeError("element binder has no lexical identity");
  const binding = Object.freeze({ name, identity, declaration: path, type: readType(type) });
  collection(d).bindings.push(binding); recordResolution(d, "bindings", binding);
  return binding;
}
export interface SubjectRead { readonly identity: OwnerIdentity | { readonly kind: "fan-out"; readonly path: string | null }; readonly type: string; readonly declaration: string }
export const subjectRead = (type: Type, identity: SubjectRead["identity"]): SubjectRead =>
  Object.freeze({ identity: Object.freeze({ ...identity }), type: type.name, declaration: `items.${type.name}` });
export interface SlotRead {
  readonly subject: SubjectRead; readonly name: string; readonly declaration: string;
  readonly kind: Slot["kind"]; readonly type: ReadType; readonly required: boolean;
  readonly fixed: boolean; readonly capability: string | null; readonly hasDefault: boolean;
}
export function slotRead(subject: SubjectRead, name: string, slot: Slot): SlotRead {
  const family = slot.kind === "party" ? "parties" : slot.kind === "ref" ? "refs" : "values";
  return Object.freeze({ subject, name, declaration: `${subject.declaration}.${family}.${name}`, kind: slot.kind,
    type: readType(slot.type), required: slot.required, fixed: slot.fixed, capability: slot.capability ?? null, hasDefault: slot.hasDefault });
}
export interface ElementRead { readonly name: string; readonly identity: ElementIdentity | null; readonly declaration: string | null; readonly type: ReadType; readonly members: readonly string[] }
export type EntryWord = "ref" | "scope" | "seq" | "kind" | "intent" | "on" | "time";
export type EntryData = (
  | { readonly op: EntryWord }
  | { readonly op: "field" | "opened" | "carried"; readonly name: string }
  | { readonly op: "set"; readonly item: OperandRead; readonly slot: string }
);
export type EntryRead = ReadSite & EntryData;
export type PartRead = EntryRead | (ReadSite & { readonly op: "project"; readonly of: EntryRead; readonly then: "scope" | "seq" });
export type OperandData =
  | { readonly op: "field"; readonly name: string; readonly required: boolean | null }
  | { readonly op: "presented"; readonly name: string }
  | { readonly op: "slot"; readonly slot: SlotRead }
  | { readonly op: "element"; readonly binding: ElementRead }
  | { readonly op: "item"; readonly subject: SubjectRead }
  | { readonly op: "signer" | "sender" | "scope" | "intent" | "none" }
  | { readonly op: "source"; readonly entry: EntryRead }
  | { readonly op: "update"; readonly part: "state" | "item" | "revision" }
  | { readonly op: "result"; readonly part: "reason" }
  | { readonly op: "const"; readonly value: FieldValue }
  | { readonly op: "read"; readonly name: string };   // the sequenced note, section 5.2: a `reads` entry of a sequenced act
export type OperandKind = OperandData["op"];
export type OperandRead = ReadSite & OperandData & { readonly baseType: ReadType; readonly projection: PartRead | null };
