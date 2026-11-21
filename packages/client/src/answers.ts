/**
 * What a transport may hand back as a scope's answer. A reply from a service
 * is untrusted data until it is seen to be one of the contract's answers of
 * that operation: its discriminant is one the contract names, its reason is
 * one the contract names for that answer of that operation, and every fixed
 * record in it is one of the contract's variants with the members that
 * variant requires. A reply that is not is no answer, and the transport
 * throws `TransportError`.
 *
 * The guards of the records are the bytes package's (`records.ts`), which
 * says what they read and what stays opaque. This file has only what is
 * the client's: which answers each operation has. The checks are of shape
 * only. Whether a receipt is of this history is `followReceipt`'s question,
 * and it computes the hash itself.
 */

import { answersVersionQuestion, type LiveAnswer, type LiveRead, type LiveSummary, type LiveApplicationProjectionRead } from "@generalbusiness/dap-platform";
import type { Answer, DeliveryRefusal, Created, CreationUnavailableReason, MismatchReason, RefusalReason, Read, Settlement, ScopeApi, UnavailableReason } from "@generalbusiness/dap-contract";
import { isScopeBoundName } from "@generalbusiness/dap-contract";
import { REFUSAL_REASONS, canonicalize, isItemQueryRead, among, isOutboxItem, isFactRef, isHead, isItem, isScopeRef, isDigest, isFieldValue, isListOf, isLogPage, isRead, isReceipt, isRecord, isRetainedInput, isSealed, isSummary } from "@generalbusiness/dap-bytes";
import { isArchived } from "./journal-tail.ts";
import { readApplicationProjectionReplyText } from "@generalbusiness/dap-platform/application-v2";

// Each table has every member of its union, and the compiler says so when the contract gains or loses one.
/** Archived reads carry a covered position and the exact archive receipt. */
const readAnswer = <T>(guard: (v: unknown) => v is T) => {
  const read = isRead(guard);
  return (v: unknown): v is Read<T> => read(v) && (v.ok || v.reason !== "archived" || isArchived(v.archived) && (v.fact === undefined || v.fact.seq < v.archived.floor));
};
/** Why an act is refused (`Answer`). Source checks belong to creation. */
const ACT_REFUSED: Record<RefusalReason, true> = REFUSAL_REASONS;
/** Why a creation is refused (`Created`). */
const CREATION_REFUSED: Record<RefusalReason | DeliveryRefusal | "unsupported-definition", true> = { ...REFUSAL_REASONS, "source-unverified": true, "unsupported-definition": true };
const UNAVAILABLE: Record<UnavailableReason, true> = { "dependency-unavailable": true, "source-response-too-large": true, busy: true, "clock-behind": true, "scope-provisional": true, "guard-incomplete": true, "authority-unavailable": true, unavailable: true, "rate-limited": true };
const CREATION_UNAVAILABLE: Record<CreationUnavailableReason, true> = { ...UNAVAILABLE, misconfigured: true, "host-unavailable": true };
const MISMATCH: Record<MismatchReason, true> = { "idempotency-mismatch": true };

/** A record with exactly these members. */
const only = (v: Record<string, unknown>, ...members: string[]): boolean => Object.keys(v).length === members.length && members.every((m) => Object.hasOwn(v, m));

/** A new-register claim projection stays bound to the exact original receipt. */
function isSettlement(value: unknown): value is Settlement {
  const ordinary = readAnswer(isReceipt);
  if (ordinary(value)) return true;
  if (!isRecord(value) || !Object.hasOwn(value, "claim")) return false;
  const { claim, ...read } = value;
  if (!ordinary(read) || !read.ok || read.complete !== true || read.next !== undefined
    || !answersVersionQuestion(read.value.definition, "clientSettlementClaimProjectionRegister") || read.at.seq < read.value.fact.seq
    || !isRecord(claim) || !only(claim, "fact", "state") || !isFactRef(claim["fact"])
    || !["pending", "failed", "active"].includes(claim["state"] as string)) return false;
  return canonicalize(claim["fact"]) === canonicalize(read.value.fact);
}

/** The answer to a creation (section 7.1): it has no `mismatch`, and its refusal names no head. */
function isCreated(v: unknown): v is Created {
  if (!isRecord(v)) return false;
  switch (v["answer"]) {
    case "accepted": return only(v, "answer", "receipt") && isReceipt(v["receipt"]);
    case "refused": return (only(v, "answer", "reason") || (only(v, "answer", "reason", "name") && v["reason"] === "scope-full" && isScopeBoundName(v["name"]))) && among(CREATION_REFUSED)(v["reason"]);
    case "unavailable": return only(v, "answer", "reason") && among(CREATION_UNAVAILABLE)(v["reason"]);
    default: return false;
  }
}

/** The answer to an act (section 4.2): its refusal is one an act can meet, and names the head it was judged at. */
function isAnswer(v: unknown): v is Answer {
  if (!isRecord(v)) return false;
  switch (v["answer"]) {
    case "accepted": return only(v, "answer", "receipt") && isReceipt(v["receipt"]);
    case "archived": return only(v, "answer", "archived", "fact") && isArchived(v["archived"]) && isFactRef(v["fact"]) && v["fact"].seq < v["archived"].floor;
    // A refusal may carry the name that the failed guard declares.
    case "refused": return (only(v, "answer", "reason", "judgedAt") || (only(v, "answer", "reason", "name", "judgedAt") && typeof v["name"] === "string")) && among(ACT_REFUSED)(v["reason"]) && isHead(v["judgedAt"]);
    case "unavailable": return only(v, "answer", "reason") && among(UNAVAILABLE)(v["reason"]);
    case "mismatch": return only(v, "answer", "reason") && among(MISMATCH)(v["reason"]);
    default: return false;
  }
}

/** A live answer never carries a receipt or a recorded head. */
export function isLiveAnswer(v: unknown): v is LiveAnswer {
  if (!isRecord(v)) return false;
  const generation = typeof v["generation"] === "string" && v["generation"].length > 0;
  const tick = typeof v["tick"] === "number" && Number.isSafeInteger(v["tick"]) && v["tick"] >= 0;
  switch (v["answer"]) {
    case "applied": return only(v, "answer", "generation", "tick") && generation && tick;
    case "reset": return only(v, "answer", "generation") && generation;
    case "refused": return (only(v, "answer", "reason", "generation", "tick") || only(v, "answer", "reason", "name", "generation", "tick") && typeof v["name"] === "string") && among(ACT_REFUSED)(v["reason"]) && generation && tick;
    case "unavailable": return only(v, "answer", "reason") && among(UNAVAILABLE)(v["reason"]);
    default: return false;
  }
}

/** Check the live summary without accepting a recorded head. */
export function isLiveSummary(v: unknown): v is LiveRead<LiveSummary> {
  if (!isRecord(v)) return false;
  if (v["ok"] === false) return only(v, "ok", "reason") && ["forbidden", "sessions-unavailable", "clock-behind", "not-found", "unavailable", "rate-limited"].includes(v["reason"] as string);
  if (v["ok"] !== true || !only(v, "ok", "generation", "tick", "value", "complete") || typeof v["generation"] !== "string" || !v["generation"] || !Number.isSafeInteger(v["tick"]) || (v["tick"] as number) < 0 || typeof v["complete"] !== "boolean" || !isRecord(v["value"])) return false;
  const value = v["value"];
  return only(value, "scope", "definition", "items", "counts") && isScopeRef(value["scope"]) && isDigest(value["definition"])
    && isListOf(isItem)(value["items"]) && Array.isArray(value["counts"]) && value["counts"].every(row => Array.isArray(row) && row.length === 3 && typeof row[0] === "string" && typeof row[1] === "string" && Number.isSafeInteger(row[2]) && row[2] >= 0);
}

/** A live application reply binds its summary to one query digest. */
export function isLiveApplicationProjection(v: unknown): v is LiveApplicationProjectionRead {
  if (!isRecord(v)) return false;
  if (v["ok"] === false) return isLiveSummary(v) || only(v, "ok", "reason") && v["reason"] === "incomplete";
  if (v["ok"] !== true || !only(v, "ok", "query", "generation", "tick", "complete", "value") || !isDigest(v["query"])
    || typeof v["generation"] !== "string" || !v["generation"] || !Number.isSafeInteger(v["tick"]) || (v["tick"] as number) < 0
    || v["complete"] !== true || !isRecord(v["value"])) return false;
  const value = v["value"];
  if (!only(value, "scope", "definition", "projection", "sources") || !isScopeRef(value["scope"]) || !isDigest(value["definition"])
    || !isDigest(value["projection"]) || !isRecord(value["sources"]) || Object.keys(value["sources"]).length !== 1) return false;
  return Object.values(value["sources"]).every(rows => Array.isArray(rows) && rows.length <= 100 && rows.every(row =>
    isRecord(row) && only(row, "id", "type", "state", "revision", "fields") && Number.isSafeInteger(row["id"]) && (row["id"] as number) >= 0
    && Number.isSafeInteger(row["revision"]) && (row["revision"] as number) >= 0 && typeof row["type"] === "string" && typeof row["state"] === "string"
    && isRecord(row["fields"]) && Object.values(row["fields"]).every(field => field === null || isFieldValue(field))));
}

/** For each operation, whether a reply is an answer of that operation. */
export const ANSWERS: { [K in keyof ScopeApi]: (reply: unknown) => reply is Awaited<ReturnType<ScopeApi[K]>> } = {
  create: isCreated,
  submit: isAnswer,
  prepare: isAnswer,
  settle: isSettlement,
  summary: readAnswer(isSummary),
  items: readAnswer(isListOf(isItem)),
  queryItems: isItemQueryRead,
  applicationProjection: (reply): reply is string => readApplicationProjectionReplyText(reply) !== null,
  history: readAnswer(isListOf(isSealed)),
  entry: readAnswer(isSealed),
  outbox: readAnswer(isListOf(isOutboxItem)),
  outboxItem: readAnswer(isOutboxItem),
  log: readAnswer(isLogPage),
  retained: readAnswer(isRetainedInput),
};
