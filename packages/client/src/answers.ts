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

import type { Answer, DeliveryRefusal, Created, MismatchReason, RefusalReason, Read, ScopeApi, UnavailableReason } from "@generalbusiness/dap-contract";
import { isScopeBoundName } from "@generalbusiness/dap-contract";
import { REFUSAL_REASONS, isItemQueryRead, among, isOutboxItem, isFactRef, isHead, isItem, isListOf, isLogPage, isRead, isReceipt, isRecord, isRetainedInput, isSealed, isSummary } from "@generalbusiness/dap-bytes";
import { isArchived } from "./journal-tail.ts";
import { readApplicationProjectionReplyText } from "@generalbusiness/dap-bytes/application-v2";

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
const UNAVAILABLE: Record<UnavailableReason, true> = { "dependency-unavailable": true, busy: true, "clock-behind": true, "scope-provisional": true, "guard-incomplete": true, "authority-unavailable": true, unavailable: true, "rate-limited": true };
const MISMATCH: Record<MismatchReason, true> = { "idempotency-mismatch": true };

/** A record with exactly these members. */
const only = (v: Record<string, unknown>, ...members: string[]): boolean => Object.keys(v).length === members.length && members.every((m) => Object.hasOwn(v, m));

/** The answer to a creation (section 7.1): it has no `mismatch`, and its refusal names no head. */
function isCreated(v: unknown): v is Created {
  if (!isRecord(v)) return false;
  switch (v["answer"]) {
    case "accepted": return only(v, "answer", "receipt") && isReceipt(v["receipt"]);
    case "refused": return (only(v, "answer", "reason") || (only(v, "answer", "reason", "name") && v["reason"] === "scope-full" && isScopeBoundName(v["name"]))) && among(CREATION_REFUSED)(v["reason"]);
    case "unavailable": return only(v, "answer", "reason") && among(UNAVAILABLE)(v["reason"]);
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

/** For each operation, whether a reply is an answer of that operation. */
export const ANSWERS: { [K in keyof ScopeApi]: (reply: unknown) => reply is Awaited<ReturnType<ScopeApi[K]>> } = {
  create: isCreated,
  submit: isAnswer,
  prepare: isAnswer,
  settle: readAnswer(isReceipt),
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
