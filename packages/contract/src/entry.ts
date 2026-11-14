/**
 * What a scope records: one entry for each input, with what the fold derives
 * from it, and the views built after an entry is sealed (scope contract,
 * section 4.1). The `Entry` type has no field for its own hash.
 */

import type { Digest, FactRef, GenesisNonce, GenesisSelfRef, MemberRef, OperationId, PlatformDefinition, ScopeId, ScopeKind, ScopeRef, Seed, Grant, SequenceRef, Timestamp } from "./scope.ts";
import type { FieldValue, GenesisFieldValue, SignedIntent } from "./intent.ts";
import type { RefusalReason } from "./result.ts";
import type { CapabilityName } from "./capability.ts";
import type { Evidence } from "./evidence.ts";
import type { ObservationUse } from "./observation.ts";

interface EntryBody {
  v: 1;
  seq: number;                 // 0 for genesis, then +1
  prev: Digest | null;
  time: Timestamp;             // section 5.3
  clamped: boolean;            // section 5.3
  epoch: 0;
  input: Input;                // exactly one
  uses: readonly FactUse[];    // foreign entries read while judging
  prepared: readonly Prepared[];   // each rule evaluated: name, input digest, result
  effects: readonly GenesisEffect[];  // typed encoded self is resolved only after sealing
  sends: readonly Send[];      // derived; each has an ordinal n
}

/** Genesis has no self-hashing sequence header. */
export interface GenesisEntry extends EntryBody { seq: 0; prev: null; input: GenesisInput }
/**
 * Every later entry binds its sequence by the already sealed genesis. A prepare entry and its commit entry state `position`,
 * the order scope's entry that allocated the input's position, and a prepare entry states `reads`, one witness for each `reads`
 * entry of its act (sequenced note, sections 5.2 and 5.5). No other entry states either.
 */
export interface SequenceEntry extends EntryBody { genesis: Digest; input: Exclude<Input, GenesisInput>; effects: readonly Effect[];
                                                   position?: { at: FactRef }; reads?: readonly GroupReadUse[] }

/**
 * The witness of one read of a member as of a cut (sequenced note, section 5.5). `name`: the `reads` key. `member`: the member's
 * sequence. `cut`: the cut position X. `entry`: the member's cut entry, a commit entry or its genesis, or null when the member
 * left below the cut. `page`: the digest of the canonical page bytes, which the reader retains under the kind `page`.
 */
export interface GroupReadUse { name: string; member: SequenceRef; cut: number; entry: FactRef | null; page: Digest }

/** The input that a prepare or commit entry wraps: the original act, or the original delivery of a request. */
export type SequencedInput = Extract<Input, { type: "act" }> | Extract<Input, { type: "delivery"; message: Request }>;
export type Entry = GenesisEntry | SequenceEntry;

interface GenesisInputBody {
  type: "genesis"; seed: Seed; nonce: GenesisNonce; kind: string;
  founding: SignedIntent | null;
  n: number | null; message: Request | null;
  decision: "applied" | "refused";
}
/** The receiving scope records the source's checked genesis kind before hashing its input. */
export type GenesisInput = GenesisInputBody & (
  | { source: null; sourceKind: null }
  | { source: FactRef; sourceKind: ScopeKind }
);

/**
 * Why a refused delivery was refused (section 4.2): a code and, where one
 * exists, a name. The name is the reason declared by the guard or late form.
 * The deciding entry records it, and its result carries the same value to
 * the sender.
 */
export interface Reason { code: RefusalReason; name?: string }

/**
 * An input may retain observations (section 4.1, "An input may retain
 * observations"; section 16.1). Three inputs may hold the member `observed`:
 * an `act`, an `outcome`, and a `delivery` whose message is a `Result`. No
 * other input may. It is a list of `ObservationUse` records, in ascending
 * order of `read.n`. It holds each read at most once, and no read that the
 * entry's grant holds. The member is left out when the entry retains no
 * such observation: it is never an empty list. The scope that writes the
 * entry sets it, from reads that it made itself before the turn, and only
 * the code of a platform definition reads one.
 */

import type { FloorInput } from "./floor.ts";

export type Input =
  | FloorInput
  | GenesisInput
  | { type: "act"; signed: SignedIntent; authority: readonly Grant[];   // the one grant judged
      presented: Record<string, FactRef>;       // the facts presented beside the intent, by the names the act declares (section 6.4)
      observed?: readonly ObservationUse[] }    // further observations that the judgment read (sections 4.1 and 16.1)
  | { type: "delivery"; from: FactRef; sourceKind: ScopeKind; n: number; message: Request;
      decision: "applied" | "refused" | "superseded"; reason?: Reason;
      late?: { reason: string } }              // an applied replacement branch, not a refused guard
  | { type: "delivery"; from: FactRef; sourceKind: ScopeKind; n: number; message: Result;
      clause: "applied" | "refused" | "superseded" | "conflict";
      observed?: readonly ObservationUse[] }    // as for an act
  | { type: "delivery"; from: FactRef; sourceKind: ScopeKind; n: number; message: Control }
  | { type: "delivery"; from: FactRef; sourceKind: ScopeKind; n: number; message: Advisory }
  | { type: "diagnosis"; of: { seq: number; n: number };
      finding: "undelivered" | "delivery-unavailable";
      attempts: readonly Attempt[] }            // section 7.4
  | { type: "timed"; item: number; rule: string; due: Timestamp }
  | PreparationInput
  | { type: "outcome"; operation: OperationId; attempt: number;
      owner: CapabilityName | PlatformDefinition; kind: string;           // of the operation, as the entry that opened it states them (section 4.1, revision 16)
      result: "confirmed" | "refused" | "unknown"; evidence: Evidence;    // section 4.3
      observed?: readonly ObservationUse[] }    // as for an act
  | { type: "checkpoint"; through: number; state: Digest }
  // A member of a group (sequenced note, section 5.2). `prepare`: the judgment, which is not an effective fact. `commit`: the one
  // effective fact, with the prepare's effects and sends. `abandon`: the prepare is void after its allocation expired.
  | { type: "prepare"; input: SequencedInput; position: { at: FactRef }; reads: readonly GroupReadUse[] }
  | { type: "commit"; input: SequencedInput; prepare: FactRef; resolution: FactRef }
  | { type: "abandon"; prepare: FactRef; expiry: FactRef }
  // An order scope (sequenced note, section 5.3). Each is one platform request of a member. `input`: the digest of the input.
  | { type: "allocation"; member: SequenceRef; input: Digest }                                       // opens an `allocation`; its seq is the position
  | { type: "resolution"; member: SequenceRef; position: number; input: Digest; prepare: FactRef }  // `open` to `resolved`, bound to the prepare entry
  | { type: "hole"; member: SequenceRef; position: number; input: Digest; reason: string };         // `open` to `holed`

/**
 * A preparation entry (section 4.1; 5.5): the signed intent that asks for a
 * capability's step, the one grant judged, the capability and the step. It is
 * a member of `Input`. Derive's `judgePreparation` writes it, and the fold
 * keeps its index. The production ports hold the code of the steps of
 * `hold@1` and `git-read@1`. With only the production defaults no grant is
 * read, so each request for a step is refused there. A replay derives one
 * again when its caller gives it the code of the step, and the replay
 * command gives none (I3 deltas, entries E5, E13 and EU1).
 */
export interface PreparationInput {
  type: "preparation";
  signed: SignedIntent;
  authority: readonly Grant[];   // the one grant judged
  capability: CapabilityName;
  step: string;
}

/** The four classes of message (section 7.4). Only a request has a result. */
export type Message = Request | Result | Control | Advisory;
export interface Request  { class: "request";  type: "create" | "tell" | "relate"; body: unknown }
export interface Result   { class: "result";   of: { from: FactRef; n: number };
                            outcome: "applied" | "refused" | "superseded"; reason?: Reason }
export interface Control  { class: "control";  type: "confirm"; genesis: FactRef }
export interface Advisory { class: "advisory"; type: "index" | "notify"; body: unknown }

/** One dispatch of a send and how it was answered. "none": no answer, or no recorded completion. */
export interface Attempt  { at: Timestamp; answer: "none" | "wrong-genesis" | "not-found" | "retry" }

export interface FactUse { fact: FactRef; content: Digest; kind: ScopeKind }

/** One rule expression evaluated in preparation (section 5.2, step 5). */
export interface Prepared { rule: string; input: Digest; result: boolean }

/**
 * In a message, `self` is not expanded by the sender: the receiver reads it as
 * the envelope's `from` (section 6.4). This is its form on the wire.
 */
export interface SelfMark { self: true }

/** A creation is addressed by a seed and names no genesis (section 7.2). */
export interface Send { n: number; to: ScopeRef | Seed; message: Message }

/**
 * One derived change. The contract does not spell this union out; it is the
 * smallest set the effect forms of section 6.6 and the platform's own entries
 * can produce, with the two records of an outside operation, which are as
 * the contract states them (sections 4.1 and 4.3). `item` is always a local ID: the `seq` of the entry that
 * opened the item.
 *
 * `operation`: the entry opens an operation, at its ordinal `k` there, with
 * its owner, its kind and the most attempts the owner allows. `attempt`: one
 * change of one numbered attempt. `opened` opens it, and the other three are
 * the result of the outcome entry that holds the record. An operation that
 * its own entry opens is named `{ k }`, so no entry holds its own position.
 * `selected` is true or false on a `confirmed` result of an operation whose
 * kind selects one result, and null on every other record.
 *
 * `for`, on an `operation` (revision 20, section 17.2a): the local ID of the
 * item whose reservation the operation draws on, or `"self"` for the item
 * that the same entry opens. An operation of a kind that an item holds
 * states it, and no other operation does. So an entry under a definition
 * that states no `holds` has the bytes it had.
 */
export type Effect =
  | { effect: "open"; item: number; type: string; state: string }
  | { effect: "state"; item: number; state: string }
  | { effect: "party"; item: number; slot: string; member: MemberRef | null }
  | { effect: "ref"; item: number; slot: string; to: FieldValue | null }
  | { effect: "value"; item: number; slot: string; value: FieldValue | null }
  | { effect: "list"; item: number; slot: string; change: "add" | "remove"; member: MemberRef }
  | { effect: "hold"; item: number; change: "open" | "renew" | "end"; epoch: number }   // section 6.8
  | { effect: "redact"; item: number; slot: string; texts: readonly Digest[] }          // the entry is the tombstone of those texts; section 6.6
  | { effect: "relation"; owner: ScopeRef; item: number; name: string; state: string; revision: number }   // the owner's item; section 7.3
  | { effect: "record"; capability: CapabilityName; kind: string; key: readonly FieldValue[];
      state: string; values: Record<string, unknown> }                                  // one change of a capability's record; section 6.11
  | { effect: "activate" }                                                              // section 7.2
  | { effect: "operation"; k: number; owner: CapabilityName | PlatformDefinition; kind: string; attempts: number;
      for?: number | "self" }                                                             // section 4.3; `for`: the holder that the operation is for, of a held kind only (section 17.2a)
  | { effect: "attempt"; operation: OperationId | { k: number }; attempt: number;
      result: "opened" | "confirmed" | "refused" | "unknown"; selected: boolean | null }   // section 4.3
  | { effect: "index"; from: FactRef; fields: Record<string, FieldValue> }              // a projection row in the directory
  | { effect: "attention"; item: number; members: readonly MemberRef[]; reason: string };

/** Only a genesis draft may encode its own sequence in declared effect positions. */
export type GenesisEffect = Exclude<Effect, { effect: "ref" | "value" | "relation" | "party" | "list" }>
  | { effect: "ref"; item: number; slot: string; to: GenesisFieldValue | null }
  | { effect: "value"; item: number; slot: string; value: GenesisFieldValue | null }
  | { effect: "relation"; owner: ScopeRef | GenesisSelfRef; item: number; name: string; state: string; revision: number }
  | { effect: "party"; item: number; slot: string; member: { membership: ScopeRef | GenesisSelfRef; member: MemberRef["member"] } | null }
  | { effect: "list"; item: number; slot: string; change: "add" | "remove"; member: { membership: ScopeRef | GenesisSelfRef; member: MemberRef["member"] } };

// Views of an entry, built after sealing. None is part of the entry's bytes (section 3, point 5).

/** One send of one entry: `seq.n`. */
export type OutboxId = `${number}.${number}`;
export interface Envelope { to: ScopeId; from: FactRef; n: number; message: Message }
export interface Receipt { fact: FactRef; definition: Digest | PlatformDefinition;
                           intent: Digest | null; effects: readonly Effect[];
                           sends: readonly OutboxId[]; epoch: 0 }
