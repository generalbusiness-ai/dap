/** Owned data from the validator's resolutions; no name checker or executable fallback. */
import type { Bounds, FieldType, FieldValue } from "@generalbusiness/dap-contract";
import type { Ctx, Defining, MarkPlace, OwnerIdentity, Slot, Type } from "../validate/context.ts";
import type { Underived } from "../validate/capability.ts";
import type { ValidDefinition } from "../validate/index.ts";
import { immutable, type Phase } from "./model.ts";

export type ReadType = { readonly kind: "declared"; readonly type: FieldType } | { readonly kind: "unknown" };
const unknown: ReadType = Object.freeze({ kind: "unknown" });
export const readType = (type: FieldType | null): ReadType => type === null ? unknown : Object.freeze({ kind: "declared", type: immutable(type) });

/** Each validator invocation has its own identity, even when declaration digests agree. */
export interface ReadValidation { readonly bounds: Bounds; readonly definition: string | null; readonly platform: boolean }
const validations = new WeakMap<Defining, ReadValidation>();
interface ReadCollection { operands: OperandRead[]; subjects: SubjectResolution[]; slots: SlotResolution[]; fields: FieldResolution[]; foreignFields: ForeignFieldResolution[]; ranges: RangeResolution[] }
const captured = new WeakMap<Defining, ReadCollection>();
const admitted = new WeakMap<ValidDefinition, ResolvedReads>();

function collection(d: Defining): ReadCollection {
  let reads = captured.get(d);
  if (!reads) { reads = { operands: [], subjects: [], slots: [], fields: [], foreignFields: [], ranges: [] }; captured.set(d, reads); }
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
  readonly marks: readonly MarkPlace[];
  readonly underived: readonly Underived[];
}

/** Called only where the existing operand validator returns its successful resolution. */
export function recordRead(d: Defining, node: OperandRead): void {
  collection(d).operands.push(node);
}

/** Attach only after every admission check has succeeded, using the actual returned object. */
export function bindReads(d: Defining, definition: ValidDefinition): ValidDefinition {
  const reads = collection(d);
  admitted.set(definition, Object.freeze({ validation: validation(d), operands: Object.freeze([...reads.operands]),
    subjects: Object.freeze([...reads.subjects]), slots: Object.freeze([...reads.slots]), fields: Object.freeze([...reads.fields]),
    foreignFields: Object.freeze([...reads.foreignFields]), ranges: Object.freeze([...reads.ranges]), marks: immutable(d.marks), underived: immutable(d.underived) }));
  return definition;
}

/** No digest cache or reconstruction from caller-supplied declarations. */
export const resolvedReads = (definition: ValidDefinition): ResolvedReads | null => admitted.get(definition) ?? null;
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
  readonly clause: boolean;
  readonly handler: Readonly<{ update: boolean; under: string | null }> | null;
  readonly senderKind: string | null;
}
function contextOf(d: Defining, ctx: Ctx): ReadContext {
  return Object.freeze({ validation: validation(d), kind: ctx.kind, clause: ctx.clause,
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

export function recordSubject(d: Defining, ctx: Ctx, path: string, type: Type | "scope", name: string): void {
  collection(d).subjects.push(Object.freeze({ path, context: contextOf(d, ctx), subject: type === "scope" ? "scope" : subjectRead(type, { kind: "subject", name }) }));
}
export function recordSlot(d: Defining, ctx: Ctx, path: string, type: Type, identity: SubjectRead["identity"], name: string, slot: Slot, access: SlotResolution["access"]): void {
  collection(d).slots.push(Object.freeze({ path, context: contextOf(d, ctx), slot: slotRead(subjectRead(type, identity), name, slot), access }));
}
export function recordField(d: Defining, ctx: Ctx, path: string, name: string, type: FieldType): void {
  collection(d).fields.push(Object.freeze({ path, context: contextOf(d, ctx), name, type: readType(type) }));
}
export function recordForeignField(d: Defining, ctx: Ctx, path: string, factField: string, name: string): void {
  collection(d).foreignFields.push(Object.freeze({ path, context: contextOf(d, ctx), factField, name, type: unknown }));
}
export function recordRange(d: Defining, ctx: Ctx, path: string, type: Type, states: readonly string[]): void {
  collection(d).ranges.push(Object.freeze({ path, context: contextOf(d, ctx), subject: subjectRead(type, { kind: "range", path, type: type.name }), states: Object.freeze([...states]) }));
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
export interface ElementRead { readonly name: string; readonly declaration: string | null; readonly type: ReadType; readonly members: readonly string[] }
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
  | { readonly op: "const"; readonly value: FieldValue };
export type OperandKind = OperandData["op"];
export type OperandRead = ReadSite & OperandData & { readonly baseType: ReadType; readonly projection: PartRead | null };
