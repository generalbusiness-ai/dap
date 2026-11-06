/** Owned data from the validator's resolutions; no name checker or executable fallback. */
import type { Bounds, FieldType, FieldValue } from "@generalbusiness/dap-contract";
import type { Ctx, Defining, OwnerIdentity, Slot, Type } from "../validate/context.ts";
import type { ValidDefinition } from "../validate/index.ts";
import { immutable, type Phase } from "./model.ts";

export type ReadType = { readonly kind: "declared"; readonly type: FieldType } | { readonly kind: "unknown" };
const unknown: ReadType = Object.freeze({ kind: "unknown" });
export const readType = (type: FieldType | null): ReadType => type === null ? unknown : Object.freeze({ kind: "declared", type: immutable(type) });

/** Each validator invocation has its own identity, even when declaration digests agree. */
export interface ReadValidation { readonly bounds: Bounds; readonly definition: string | null; readonly platform: boolean }
const validations = new WeakMap<Defining, ReadValidation>();
const captured = new WeakMap<Defining, OperandRead[]>();
const admitted = new WeakMap<ValidDefinition, ResolvedReads>();

/** A validation result owns its reads; equal declaration digests do not share this evidence. */
export interface ResolvedReads {
  readonly validation: ReadValidation;
  readonly operands: readonly OperandRead[];
}

/** Called only where the existing operand validator returns its successful resolution. */
export function recordRead(d: Defining, node: OperandRead): void {
  const reads = captured.get(d);
  if (reads) reads.push(node);
  else captured.set(d, [node]);
}

/** Attach only after every admission check has succeeded, using the actual returned object. */
export function bindReads(d: Defining, definition: ValidDefinition): ValidDefinition {
  admitted.set(definition, Object.freeze({ validation: validation(d), operands: Object.freeze([...(captured.get(d) ?? [])]) }));
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
export interface ReadSite { readonly path: string; readonly phase: Phase; readonly context: ReadContext; readonly type: ReadType }
export function readSite(d: Defining, ctx: Ctx, path: string, guard: boolean, type: FieldType | null): ReadSite {
  return Object.freeze({ path, phase: guard ? "before" : "working", type: readType(type), context: Object.freeze({
    validation: validation(d), kind: ctx.kind, clause: ctx.clause,
    handler: ctx.handler ? Object.freeze({ ...ctx.handler }) : null, senderKind: ctx.senderKind ?? null,
  }) });
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
