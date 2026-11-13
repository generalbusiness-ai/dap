/**
 * Reads (scope contract, section 9.1). Every list is a page with a stated
 * maximum and a cursor. A read of state is a statement about `at`.
 */

import type { Digest, FactRef, MemberRef, PlatformDefinition, ScopeRef, Seed, Timestamp } from "./scope.ts";
import type { Range } from "./definition.ts";
import type { Attempt, OutboxId, Entry, Message, Receipt } from "./entry.ts";
import type { FieldValue } from "./intent.ts";
import type { Head, ReadRefusal } from "./result.ts";

/** An opaque, resumable position in a paged read. */
export type Cursor = string;

import type { Archived } from "./floor.ts";

/** A minimum journal position in one scope at one exact genesis. A full head also requires its recorded hash. */
export interface ReadMinimum { readonly at: ScopeRef; readonly head: number | Head }

/** The authorized scope remained below the minimum when its bounded wait ended. */
export interface BehindRead { ok: false; reason: "behind"; current: FactRef }

export type Read<T> =
  | BehindRead
  | { ok: false; reason: "archived"; archived: Archived; fact?: FactRef; next?: Cursor }
  | { ok: true; at: { seq: number; hash: Digest }; value: T; complete: boolean; next?: Cursor }
  | { ok: false; reason: Exclude<ReadRefusal, "archived" | "behind">; detail?: FactRef | ScopeRef };

/** Settlement of one signed intent: one receipt or `not-found` (section 4.2). */
export type Settlement = Read<Receipt> & {
  /** Register26 alone projects the state of this exact accepted found. No item values or read permission. */
  readonly claim?: { readonly fact: FactRef; readonly state: "pending" | "failed" | "active" };
};

/** The page bounds of section 9.1. */
export const RETAINED_ITEMS_PAGE = 100;
export const HISTORY_PAGE_ENTRIES = 200;
export const HISTORY_PAGE_BYTES = 1024 * 1024;
export const ENTRY_READ_BYTES = 256 * 1024;
export const COMMENTS_PAGE = 100;
export const INDEX_PAGE_ROWS = 100;
export const OUTBOX_PAGE_ITEMS = 100;
/** One retained input. The contract's table has no row for it; this is the history page's byte bound, and temporary. */
export const RETAINED_INPUT_BYTES = 1024 * 1024;

// ---------------------------------------------------------------- what the reads return

/** A scope is provisional until its creator confirms it; a refused genesis is terminal (section 7.2). */
export type Status = "provisional" | "active" | "refused";

/** A party slot holds one member, or a list of members. An empty slot is `null`; an empty list is unset. */
export type Party = MemberRef | readonly MemberRef[] | null;

/** One item, as entries fold into it (section 6.3). */
export interface Item {
  readonly id: number;                     // the `seq` of its opening entry (section 4.1)
  readonly type: string;
  readonly state: string;
  readonly revision: number;               // section 6.3
  /** The hash of its opening entry, so a send can name it by fact. Null only while that entry is being judged. */
  readonly opened: Digest | null;
  readonly parties: Readonly<Record<string, Party>>;
  readonly refs: Readonly<Record<string, FieldValue | null>>;
  readonly values: Readonly<Record<string, FieldValue | null>>;
  /**
   * The history attribution needs (section 6.7): every member ever in one of
   * its `author` slots, every holder of a hold whose `under` names it, and
   * the principal of each who signed under one: when put in the slot, or
   * later, when changing this item or a hold under it.
   */
  readonly attributed: readonly MemberRef[];
}

/**
 * A scope's summary: its live items, and the exact number of items in each
 * type and state, retained final items included. Final items are counted
 * and not listed; they are read by pages.
 */
export interface Summary {
  scope: ScopeRef; status: Status; definition: Digest | PlatformDefinition; time: Timestamp;
  items: readonly Item[];                                                    // live, by ID
  /** Destination@3 write-free expiry at this read's head. `time` is the
   * current clock, distinct from the last sealed entry's Summary.time.
   * Behind or unavailable clock reports no expired IDs. */
  reservationExpiry?: { clock: "available"; time: Timestamp; expired: readonly number[] } | { clock: "unavailable" };
  counts: readonly (readonly [type: string, state: string, n: number])[];    // every type and state of the definition, by type, then state
}

/** A sealed entry and its hash. The hash is not part of the entry's bytes (section 4.1). */
export interface Sealed { entry: Entry; hash: Digest }

/**
 * One dispatch of a send, as the sender's log holds it (section 7.4). It is
 * written with the answer `none` before the dispatch starts, and the answer
 * is written over it when one arrives. `acknowledged` is the one answer an
 * entry's `Attempt` does not have: the receiver answered with the fact of
 * the entry that recorded the message.
 */
export interface Dispatched { at: Timestamp; answer: Attempt["answer"] | "acknowledged" }

/** One send of one entry, as the outbox holds it (section 7.4). The message itself is in the entry. */
export interface OutboxItem {
  outboxId: OutboxId;
  to: ScopeRef | Seed;
  class: Message["class"];
  /** Sealed and not to be dispatched: a send of a provisional scope's genesis, until the confirmation (section 7.2). */
  held: boolean;
  /** The dispatcher's log: one record for each dispatch, in order. */
  attempts: readonly Dispatched[];
  /** The fact transport acknowledged the send with: the entry of the receiver that recorded it. Bookkeeping, not an entry. */
  acknowledged: FactRef | null;
  /** For a request: the entry that recorded its first result, and the clause that ran. */
  result: { seq: number; clause: "applied" | "refused" | "superseded" | "conflict" } | null;
  /** For a request: the entry that recorded its diagnosis. */
  diagnosis: { seq: number; finding: "undelivered" | "delivery-unavailable" } | null;
}

/**
 * A page of the history as it is stored, for a verifier (sections 9.2 and
 * 9.4): each entry as its canonical JSON text, whose UTF-8 bytes are the
 * entry's canonical bytes, with the hash the service holds for it. A reader
 * hashes the bytes itself before it reads the content, so a changed byte is
 * found at its own entry. `scope` and `definition` are what the service
 * says the scope is; a verifier checks them against the genesis.
 */
export interface LogPage { scope: ScopeRef; definition: Digest | PlatformDefinition; entries: readonly { seq: number; hash: Digest; bytes: string }[] }

/**
 * A retained input (section 9.2): bytes an entry names by digest and does
 * not carry. `definition`: a declaration, under the definition's digest.
 * `entry`: a foreign entry of some `uses`, under its content digest, with
 * `under`, the name of the definition its scope pins, as the fetcher
 * recorded it. `rule`: the input of one rule evaluation, under its digest.
 * `text`: a detached text, as one JSON string, under its digest in the
 * domain `artroom-text-1`, until a `redact` effect removes it (section 6.6).
 * `snapshot`: the list of staged refs that an ancestry record names, as the
 * host returned it and in byte order of `ref`, under its digest in the
 * domain `artroom-snapshot-1` (sections 9.2 and 16.4). It is stored before
 * the entry that names the digest. The contract states the bytes and the
 * domain, and no name for the kind: `snapshot` is its own word for it (I3
 * deltas, entry EL7; confirmed in the contract's revision 19).
 * `value`: a value beside an intent (sections 6.2 and 9.2, revision 19), as
 * its canonical JSON, under its byte domain and its digest there. The
 * record states the domain in `domain`, because the kind alone does not
 * give it, and no other kind states the member. A value in
 * `artroom-definition-1` is a definition, and is kept under the kind
 * `definition`. A value is never removed.
 * `birth`: the first entry of a foreign sequence that an entry of this
 * scope uses at a later entry (rulings 4f697a7a and ae48dd39). Its `digest`
 * is the sequence's genesis digest: an entry hash, not a content digest. The
 * scope keeps the bytes as an `entry` row under their content digest, and an
 * association from the sequence to that row. A reader admits the bytes with
 * the use's full sequence reference, its scope and its genesis.
 * `page`: the canonical bytes of one page that a sequenced input read from
 * a member as of a cut, under the digest that its `GroupReadUse` names
 * (sequenced note, section 5.5). It is written when the entry is committed.
 * `bytes` is canonical JSON text.
 */
export interface RetainedInput { kind: "definition" | "entry" | "rule" | "text" | "snapshot" | "value" | "birth" | "page"; digest: Digest; bytes: string; under?: string; domain?: string }

// ---------------------------------------------------------------- the `at` read (sequenced note, section 5.5)

/** The most items of one page that the `at` read answers (sequenced note, section 5.9). */
export const AT_PAGE_ITEMS = 64;

/**
 * One item of a member as of a cut: its ID, state, revision and value
 * slots, in the member's own types. A record holds no detached text: the
 * page leaves each detached text slot out.
 */
export interface GroupRecord { readonly id: number; readonly state: string; readonly revision: number; readonly values: Readonly<Record<string, FieldValue | null>> }

/** What a member of a group answers when another member asks for the items of a range as of a cut position. */
export interface AtQuery { readonly cut: number; readonly items: Range }

/**
 * The answer of the `at` read. `entry`: the member's cut entry at `cut`,
 * its last commit entry at or below it or its genesis. `uncommitted`: the
 * member holds a prepare entry at or below the cut whose position is
 * resolved and whose commit entry it has not written. `cut-gone`: the
 * member keeps no cut copy for that cut. A reader that is not a joined
 * member of the same order scope is refused `forbidden`.
 *
 * TODO(H1, reason codes): `uncommitted` and `cut-gone` are answers of this
 * read only. Whether they join `ReadRefusal`, and the codes that the turn
 * of a sequenced act needs in `RefusalReason` and `UnavailableReason`
 * (`order-unavailable`, `not-a-member`, `order-forming`, `member-pending`,
 * `member-uncommitted`, `cut-gone`, `position-bound`, `not-open`,
 * `allocation-expired`, `holed`, `source-not-effective`), wait for the
 * planner's ruling on their RC-1 classes.
 */
export type AtRead =
  | { ok: true; cut: number; entry: FactRef; items: readonly GroupRecord[] }
  | { ok: false; reason: "uncommitted" | "cut-gone" }
  | { ok: false; reason: Exclude<ReadRefusal, "archived" | "behind"> };
