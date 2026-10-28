/** Closed, owned successor check bindings. Facts are proved by their native readers. */
import type { Digest, FactRef, KeyId, MemberRef, ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalBytes } from "./canonical.ts";
import { digestBytes } from "./hash.ts";
import { isKeyId } from "./ids.ts";
import { isFactRef, isMemberRef, isScopeRef } from "./records.ts";

/** Who supplies a check result, and when its job runs. Omitted legacy fields keep member/landing meaning. */
export type CheckSource = "member" | "room";
export type CheckStage = "work" | "landing" | "published";
export interface ServiceMark { checker: MemberRef; key: KeyId }
/** A native position under one exact Rules incarnation. This is not a fact hash. */
export interface ScopedRulesPosition { rules: ScopeRef; seq: number }
export type CheckSubject =
  | { kind: "landing"; publication: FactRef; manifest: FactRef }
  | { kind: "work"; source: FactRef }
  | { kind: "published"; publication: FactRef; receipt: FactRef; written: FactRef; manifest: FactRef };
/** Closed successor job binding. The native reader proves the facts and source standing. */
export interface EvidenceBinding {
  v: 1;
  source: CheckSource;
  stage: CheckStage;
  checker: MemberRef;
  policyGeneration: ScopedRulesPosition;
  roomService: ServiceMark | null;
  serviceGeneration: ScopedRulesPosition;
  auditOf: FactRef | null;
  subject: CheckSubject;
}

export const EVIDENCE_BINDING_DOMAIN = "artroom-check-binding-1";

/** Read only enumerable own data properties; never retain caller objects or invoke accessors. */
function record(value: unknown, names: readonly string[]): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value) as object | null)) return null;
  const keys = Reflect.ownKeys(value);
  if (keys.length !== names.length || keys.some(key => typeof key !== "string" || !names.includes(key))) return null;
  const copy: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
  for (const name of names) {
    const member = Object.getOwnPropertyDescriptor(value, name);
    if (!member || !member.enumerable || !Object.hasOwn(member, "value")) return null;
    copy[name] = member.value;
  }
  return copy;
}
function scope(value: unknown): ScopeRef | null {
  const given = record(value, ["scope", "inc", "kind"]);
  return isScopeRef(given) ? { scope: given["scope"], inc: given["inc"], kind: given["kind"] } : null;
}
function fact(value: unknown): FactRef | null {
  const given = record(value, ["at", "seq", "hash"]), at = given && scope(given["at"]);
  const copy = given && at ? { at, seq: given["seq"], hash: given["hash"] } : null;
  return isFactRef(copy) && !Object.is(copy.seq, -0) ? copy : null;
}
function member(value: unknown): MemberRef | null {
  const given = record(value, ["membership", "member"]), membership = given && scope(given["membership"]);
  const copy = given && membership ? { membership, member: given["member"] } : null;
  return isMemberRef(copy) && copy.membership.kind === "membership" ? copy : null;
}
function generation(value: unknown): ScopedRulesPosition | null {
  const given = record(value, ["rules", "seq"]), rules = given && scope(given["rules"]);
  return given && rules?.kind === "rules" && typeof given["seq"] === "number" && Number.isSafeInteger(given["seq"]) && !Object.is(given["seq"], -0) && given["seq"] >= 0
    ? { rules, seq: given["seq"] } : null;
}
function mark(value: unknown): ServiceMark | null {
  const given = record(value, ["checker", "key"]), checker = given && member(given["checker"]);
  return given && checker && isKeyId(given["key"]) ? { checker, key: given["key"] } : null;
}
function subject(value: unknown, stage: EvidenceBinding["stage"]): CheckSubject | null {
  if (stage === "work") {
    const given = record(value, ["kind", "source"]), source = given && fact(given["source"]);
    return given?.["kind"] === stage && source ? { kind: stage, source } : null;
  }
  const names = stage === "landing" ? ["kind", "publication", "manifest"] : ["kind", "publication", "receipt", "written", "manifest"];
  const given = record(value, names), publication = given && fact(given["publication"]), manifest = given && fact(given["manifest"]);
  if (!given || given["kind"] !== stage || !publication || !manifest) return null;
  if (stage === "landing") return { kind: stage, publication, manifest };
  const receipt = fact(given["receipt"]), written = fact(given["written"]);
  return receipt && written ? { kind: stage, publication, receipt, written, manifest } : null;
}

/** Closed wire shape only. Native admission separately proves source, current standing and fact authority. */
export function readEvidenceBinding(value: unknown): EvidenceBinding | null {
  try {
    const given = record(value, ["v", "source", "stage", "checker", "policyGeneration", "roomService", "serviceGeneration", "auditOf", "subject"]);
    if (!given || given["v"] !== 1 || given["source"] !== "member" && given["source"] !== "room" || given["stage"] !== "work" && given["stage"] !== "landing" && given["stage"] !== "published") return null;
    const checker = member(given["checker"]), policyGeneration = generation(given["policyGeneration"]), serviceGeneration = generation(given["serviceGeneration"]);
    const roomService = given["roomService"] === null ? null : mark(given["roomService"]), auditOf = given["auditOf"] === null ? null : fact(given["auditOf"]);
    const stage = given["stage"] as EvidenceBinding["stage"], bound = subject(given["subject"], stage);
    if (!checker || !policyGeneration || !serviceGeneration || !bound || given["roomService"] !== null && !roomService || given["auditOf"] !== null && !auditOf) return null;
    return { v: 1, source: given["source"] as EvidenceBinding["source"], stage, checker, policyGeneration, roomService, serviceGeneration, auditOf, subject: bound };
  } catch { return null; }
}

/** Hash the exact owned binding in its dedicated domain, never an unchecked caller projection. */
export function evidenceBindingDigest(binding: EvidenceBinding): Digest {
  const owned = readEvidenceBinding(binding);
  if (!owned) throw new Error("Invalid check evidence binding.");
  return digestBytes(canonicalBytes({ domain: EVIDENCE_BINDING_DOMAIN, binding: owned }));
}
