/**
 * Custody of signed envelopes (plan 031, section 7). Every act tool,
 * `create` and `prepare` require a caller's `idempotencyKey`. The server
 * keeps the exact signed envelope it sends under that key, before it sends
 * it, and a repeat under the same key either resends those same bytes or
 * returns the outcome it kept. The server never chooses a key.
 *
 * - **Identity**: service, the membership standing is read from with its
 *   incarnation, the signer's key, the target scope and incarnation (or the
 *   definition of a creation), and the key. A record is named by a digest of
 *   its identity.
 * - **Binding**: the binding identity and the definition digest the target
 *   was under. Never a surface name, so a change of words changes nothing
 *   here.
 * - **Requested meaning**: a digest of what was asked. The same key with
 *   another meaning is refused as `conflicting`, and nothing is sent.
 * - **Phase**: `prepared`, `sent` and `unknown` are unresolved, and are
 *   recovered by resending the same bytes. `accepted`, `refused` and
 *   `mismatch` and `archived` are terminal. An archived settlement keeps its
 *   location and optional fact separately from a native Answer; it proves no
 *   receipt before clone verification. `accepted`, `archived` and `mismatch` are never sent again,
 *   even with `resubmit: true`. A `refused` record is sent again only when
 *   the caller asks with `resubmit: true`: the server first keeps a new
 *   attempt, unresolved (`sent`), with the refusal kept as history, so a lost
 *   or `unavailable` reply to the resend leaves the record unresolved and
 *   `settle` asks the scope.
 * - **The outcome**: always the newest decisive outcome of the current
 *   attempt, chronologically: an answer that is not `unavailable`, or a
 *   receipt from settlement. Every outcome is appended, never replacing an
 *   earlier one, and each carries its attempt.
 * - **What resolves `unknown`**: a receipt from settlement, or a definitive
 *   `accepted`, `refused` or `mismatch` from the same scope and incarnation.
 *   Never `unavailable`, never `not-found` from settlement, and never the
 *   passing of `notAfter`. A verified journal read after the latest signing dies may state `absent`; that ends an
 *   unresolved record as `refused` with a client `unsent` outcome (client note section 5.5).
 * - **Preparation steps**: each under its own identity (the intent's
 *   digest, the resource and its incarnation, the capability and the step),
 *   with its own phase and answer, apart from the act's phase. A step's
 *   answer is never the act's receipt. A step keeps its first answer and its
 *   latest 63; answers between them are not kept. The act's outcomes are
 *   never dropped: that rule is for steps only.
 * - **Standalone steps** (a capability step with no act, such as
 *   `hold@1:instance`): the record's envelope is the step's own intent, and
 *   it is never submitted as an act. A decisive answer from the resource
 *   (accepted or refused) makes the step terminal: a later call returns
 *   that answer and sends nothing. When every step the record holds is
 *   decisive, the record is `settled`, which is terminal and archived like
 *   any other, and never an act's acceptance. A lost or unavailable answer
 *   leaves the step and the record unresolved, and a retry sends the exact
 *   signed step again.
 * - **Capacity**: at most 256 unresolved records, never evicted, counted and
 *   admitted under the store's exclusive section, so two processes cannot
 *   both admit the 256th. A record is at most 2 MiB: an act whose envelope
 *   would not fit is refused before it is signed, and outcomes that would
 *   push a record past the bound move to its segment, which keeps every one.
 *   Terminal records are archived by the store; outcomes past 64 inline move
 *   to the segment.
 *
 * - **Signings** (version 2): a record holds every signing of one request.
 *   The top-level `meaning` and `envelope` are those of the latest signing.
 *   `signings[]` lists each signing; an earlier signing keeps its envelope
 *   there until it is closed. A record holds at most 8 envelopes and 64
 *   signings, checked before anything is signed. `send` signs again only
 *   when the caller passes `resign: true`. `Custody.#read` reads a version 1
 *   record as version 2 with one signing.
 * - **A refusal settles nothing**: `refused` is terminal for capacity and
 *   for sending, and `settle` asks the scope while a signing is not closed.
 *
 * The store is a port: `memoryStore` here for a process that keeps nothing,
 * and the file store of `node.ts` under `ARTROOM_HOME/private/mcp-custody/`.
 */

import type { Answer, Beside, DeclaredDefinition, Digest, FactRef, Head, KeyId, PlatformDefinition, Receipt, RefusalReason, ScopeRef, Settlement, SignedIntent, Timestamp } from "@generalbusiness/dap-contract";
import { REFUSAL_CLASSES, canonicalize, digestBytes, intentDigest, timeMs, utf8 } from "@generalbusiness/dap-bytes";
import { sendableAt } from "./originals.ts";
import { StoreFormatError } from "./store-format-error.ts";

export const UNRESOLVED_MOST = 256;
export const OUTCOMES_INLINE = 64;
/** The most canonical bytes the inline outcomes hold before the oldest spill to the segment (the hosted design, section 3.6). */
export const OUTCOMES_INLINE_BYTES = 256 * 1024;
export const RECORD_BYTES = 2 * 1024 * 1024;
export const KEY_BYTES = 128;
/** The most outcomes the search for a record's decisive outcome reads from its segment at once. */
export const DECIDED_SLICE = 64;
/** The most envelopes one record holds: the latest signing's, and each earlier signing's until it is closed. */
export const ENVELOPES_MOST = 8;
/** The most signings one record holds. */
export const SIGNINGS_MOST = 64;

export interface Identity {
  service: string;
  membership: ScopeRef | null;
  signer: KeyId;
  target: ScopeRef | { create: Digest | PlatformDefinition };
  key: string;
}

export interface BindingRecord { definition: string; kind: string; declaration: Digest | null; pinned: Digest | PlatformDefinition }

/** The exact bytes that were sent, and what travelled beside them. A creation also keeps its definition and the definitions it names. */
export interface Envelope {
  signed: SignedIntent;
  beside: Beside;
  creation?: { definition: DeclaredDefinition | Digest | PlatformDefinition; definitions: readonly DeclaredDefinition[] };
}

/**
 * `settled` is the terminal phase of a record that holds only standalone capability steps (steps with no act): every step it
 * holds has a decisive answer from its resource. It is never an act's acceptance: no act is kept under such a record.
 */
export type Phase = "prepared" | "sent" | "unknown" | "accepted" | "archived" | "refused" | "mismatch" | "settled";
export const TERMINAL: ReadonlySet<Phase> = new Set(["accepted", "archived", "refused", "mismatch", "settled"]);

/** A settlement read can omit its fact. It is not a native Answer or receipt. */
export type ArchivedSettlement = Extract<Settlement, { reason: "archived" }>;
/** A caller's statement that a verified journal entry holds the key with this intent. It is not a receipt. */
export interface Folded { fact: FactRef; intent: Digest }
export type Decided = { at: string; answer: Answer; archivedSettlement?: never; folded?: never; unsent?: never }
  | { at: string; archivedSettlement: ArchivedSettlement; answer?: never; folded?: never; unsent?: never }
  | { at: string; folded: Folded; answer?: never; archivedSettlement?: never; unsent?: never }
  | { at: string; unsent: Head; answer?: never; archivedSettlement?: never; folded?: never };
type Sending = { at: string; answer: Answer } | { at: string; lost: true } | { at: string; settled: Receipt } | { at: string; archivedSettlement: ArchivedSettlement };
/**
 * One outcome of one sending, in its attempt, for the signing at index `signing`. `lost`: no answer could be read. `folded`: the
 * caller's journal holds the key; `signing` is null when the journal's intent is no signing of the record. `unsent`: a read
 * after the latest signing died does not hold the key, ending the unresolved record without a scope refusal.
 */
export type Outcome = (Sending & { attempt: number; signing: number }) | { at: string; folded: Folded; attempt: number; signing: number | null }
  | { at: string; unsent: Head; attempt: number; signing: number };
/** An outcome as a store holds it. A version 1 outcome has no `signing`, and reads as signing 0. */
export type StoredOutcome = (Sending & { attempt: number; signing?: number }) | Extract<Outcome, { folded: Folded } | { unsent: Head }>;

export interface Step {
  intent: Digest;
  resource: ScopeRef;
  capability: string;
  step: string;
  phase: "prepared" | "sent" | "unknown" | "answered";
  answers: { at: string; answer: Answer | null }[];
}

/**
 * One signed intent of a request. `envelope` is kept here only for an earlier signing that is not closed: the latest signing's
 * envelope is the record's own. `dead`: the scope refused the signing with a reason of class `never`, or `expired`. `closed`: the
 * signing cannot hold the key.
 */
export interface CustodySigning {
  intent: Digest;
  meaning: Digest;
  notAfter: Timestamp;
  envelope?: Envelope;
  dead?: "never" | "expired";
  closed?: true;
}

interface RecordFields {
  identity: Identity;
  binding: BindingRecord;
  /** The meaning and envelope of the latest signing. */
  meaning: Digest;
  envelope: Envelope;
  phase: Phase;
  /** `count` is how many outcomes there have been. The latest, at most `OUTCOMES_INLINE`, are inline; older ones are in the record's segment. */
  count: number;
  /** The attempt now current: 1, and one more for each deliberate resubmission of a refusal and each new signing. */
  attempt: number;
  /** True for a record whose envelope is a standalone capability step's own intent, which is never submitted as an act. */
  standalone?: true;
  steps: Record<string, Step>;
  created: string;
  updated: string;
}
/** A record as version 1 wrote it: one signing. */
export interface CustodyRecordV1 extends RecordFields { v: 1; outcomes: StoredOutcome[] }
export interface CustodyRecord extends RecordFields { v: 2; signings: CustodySigning[]; outcomes: Outcome[] }
/** A record as a store holds it. Only `Custody.#read` reads its version. */
export type StoredCustodyRecord = CustodyRecord | CustodyRecordV1;

/** Where records live. Every write is whole and read back before the caller sends. */
export interface CustodyStore {
  /** A configured count bound; omitted stores use the production bound. */
  readonly unresolvedMost?: number;
  /** An exclusive lock on one identity, or null when another holds it. */
  lock(id: string, notAfter: string): Promise<(() => Promise<void>) | null>;
  /** Run `work` alone among every process sharing the store: admission against the capacity. */
  exclusive<T>(work: () => Promise<T>): Promise<T>;
  read(id: string): Promise<StoredCustodyRecord | null>;
  /**
   * Write whole, then read back and compare; throws when the bytes read back differ. `dispatch`: this write precedes a
   * dispatch (a send, a resubmit, a step), so a store that accounts capacity reserves the completion need before it, and
   * refuses with its own `full` before anything is sent; a write of a result consumes what was reserved and reserves nothing.
   */
  write(id: string, record: StoredCustodyRecord, options?: { dispatch?: boolean }): Promise<void>;
  /** The records not yet terminal, oldest first: their identity digests and keys. */
  unresolved(): Promise<{ id: string; key: string; created: string }[]>;
  /**
   * A store that accounts capacity reserves an identity's completion need here, under the exclusive admission, before the
   * envelope is built and signed; it throws its own `full` when the need cannot be reserved. `bytes` is the caller's account
   * of what the envelope will carry. Its `admit` for an existing identity is safe to repeat.
   * A store without a budget leaves this out.
   */
  admit?(id: string, bytes: number): Promise<void>;
  /** Release what `admit` reserved for a new identity whose preparation did not come to a record. */
  unadmit?(id: string): Promise<void>;
  /**
   * Put outcomes in the record's segment at position `at` (the count the segment holds by the record's account), in order.
   * Anything the segment holds past `at`, from an interrupted earlier append, is cut first, so a repeat is idempotent.
   */
  segment(id: string, at: number, outcomes: readonly StoredOutcome[]): Promise<void>;
  /** At most `limit` outcomes of the segment from position `from`, in order, read as a bounded slice. */
  segmented(id: string, from: number, limit: number): Promise<StoredOutcome[]>;
  /** Each live record of one signer at one target, whatever its phase. An archived record is not listed. */
  byTarget?(who: Omit<Identity, "key">): Promise<{ id: string; key: string; phase: Phase; created: string }[]>;
  /** Call `changed` after each change to the store, by this client or another. Returns the call that stops it. */
  observe?(changed: () => void): () => void;
}

/** A store with the read by target and the change signal: the store that the client of a declared scope takes. */
export type ClientCustodyStore = CustodyStore & Required<Pick<CustodyStore, "byTarget" | "observe">>;

export const identityId = (identity: Identity): string => digestBytes(utf8(canonicalize(identity))).slice(7);
export const meaningOf = (asked: unknown): Digest => digestBytes(utf8(canonicalize(asked)));
export const stepId = (s: { intent: Digest; resource: ScopeRef; capability: string; step: string }): string =>
  digestBytes(utf8(canonicalize([s.intent, s.resource.scope, s.resource.genesis, s.capability, s.step]))).slice(7);

/** Why custody sent nothing. */
export type HeldBack =
  | { held: "conflicting"; recorded: string }
  | { held: "full"; reason: "count"; keys: string[] }
  | { held: "full"; reason: "bytes"; bytes: number }
  /** The store's own budget admits no completion capacity for another dispatch (the hosted store, section 3.6 of its design). */
  | { held: "full"; reason: "budget"; bytes: number }
  /** The record holds `ENVELOPES_MOST` envelopes or `SIGNINGS_MOST` signings: nothing is signed until a signing closes. */
  | { held: "full"; reason: "signings"; envelopes: number; signings: number }
  | { held: "locked"; stale?: string }
  | { held: "unreadable" }
  /**
   * The envelope was sent and answered (or its reply was lost), and the store could not keep the outcome: the act may have taken
   * effect; the record stays `sent`. For a preparation step, `step` names it: the step was sent and the resource answered, and
   * the same step under the same key and arguments is the recovery, not the act's settlement.
   */
  | { held: "unkept"; answer: Answer["answer"] | "lost"; step?: { resource: string; capability: string; step: string } }
  | { held: "too-large" };

export class CustodyError extends Error {
  constructor(readonly why: HeldBack) { super(`custody: ${why.held}`); }
}

/** No answer could be read for a sending, so its outcome is unknown. The record says `unknown`. */
export class Lost extends Error {}

const keyBytes = (key: unknown): boolean => typeof key === "string" && utf8(key).length >= 1 && utf8(key).length <= KEY_BYTES;
export const validKey = keyBytes;

/** What a call under custody gives back: the outcome, and whether it was sent now or kept from before. */
export type Sent = { record: CustodyRecord; answer: Answer; retained: boolean }
  | { record: CustodyRecord; archivedSettlement: ArchivedSettlement; retained: true }
  | { record: CustodyRecord; folded: Folded; retained: true }
  | { record: CustodyRecord; unsent: Head; retained: true }
  | { record: CustodyRecord; lost: true };

/** Bytes a record keeps beside its envelope: identity, binding, phase, times, and room for its first outcome. */
const RECORD_OVERHEAD = 64 * 1024;
const envelopeBytes = (value: unknown): number => utf8(canonicalize(value as never)).length;

/** The newest decisive outcome of the record's current attempt, chronologically; null while the attempt is unresolved. */
export function decisive(outcomes: readonly Outcome[], attempt: number): Decided | null {
  for (let i = outcomes.length - 1; i >= 0; i--) {
    const o = outcomes[i]!;
    if (o.attempt !== attempt) return null;
    const found = decidedBy(o);
    if (found) return found;
  }
  return null;
}

/** The decision an outcome states, or null for a lost reply and for `unavailable`. */
function decidedBy(o: Outcome): Decided | null {
  if ("settled" in o) return { at: o.at, answer: { answer: "accepted", receipt: o.settled } };
  if ("archivedSettlement" in o) return { at: o.at, archivedSettlement: o.archivedSettlement };
  if ("folded" in o) return { at: o.at, folded: o.folded };
  if ("unsent" in o) return { at: o.at, unsent: o.unsent };
  if ("answer" in o && o.answer.answer !== "unavailable") return { at: o.at, answer: o.answer };
  return null;
}

/** What a kept decision gives a caller of `send`. */
const sentOf = (record: CustodyRecord, last: Decided): Sent => last.archivedSettlement ? { record, archivedSettlement: last.archivedSettlement, retained: true }
  : last.folded ? { record, folded: last.folded, retained: true } : last.unsent ? { record, unsent: last.unsent, retained: true } : { record, answer: last.answer, retained: true };

/** The phases that end a record for good. A `refused` record is terminal for capacity and for sending, and not here. */
const FINAL: ReadonlySet<Phase> = new Set(["accepted", "archived", "settled"]);
const UNRESOLVED: ReadonlySet<Phase> = new Set(["prepared", "sent", "unknown"]);

/** Why an answer kills its signing: a refusal of class `never`, or `expired` (the note, section 3). */
const deathOf = (answer: Answer): CustodySigning["dead"] => answer.answer !== "refused" ? undefined
  : answer.reason === "expired" ? "expired" : REFUSAL_CLASSES[answer.reason as RefusalReason] === "never" ? "never" : undefined;

const signingOf = (envelope: Envelope, meaning: Digest): CustodySigning => ({ intent: intentDigest(envelope.signed.intent), meaning, notAfter: envelope.signed.intent.notAfter });

/** A version 1 record as version 2: one signing, which holds every outcome. A refusal that killed it marks it dead; a mismatch closes it. */
function upgraded(stored: StoredCustodyRecord): CustodyRecord {
  if (stored.v === 2) return stored;
  const { outcomes, ...fields } = stored;
  const signing = signingOf(stored.envelope, stored.meaning);
  const inline = outcomes.map((o): Outcome => ("signing" in o && o.signing !== undefined ? o : { ...o, signing: 0 }) as Outcome);
  for (const o of inline) { const dead = "answer" in o ? deathOf(o.answer) : undefined; if (dead) signing.dead = dead; }
  if (stored.phase === "mismatch") signing.closed = true;
  return { ...fields, v: 2, signings: [signing], outcomes: inline };
}

/** A segment outcome as version 2: a version 1 outcome belongs to signing 0. */
const withSigning = (o: StoredOutcome): Outcome => ("signing" in o && o.signing !== undefined ? o : { ...o, signing: 0 }) as Outcome;

/** How many envelopes a record holds: the latest signing's, and each earlier one's that is not closed. */
export const envelopesOf = (record: CustodyRecord): number => 1 + record.signings.slice(0, -1).filter((s) => s.envelope !== undefined).length;

/** The envelope kept for signing `index`, or null when its signing is closed and earlier than the latest. */
export const envelopeOf = (record: CustodyRecord, index: number): Envelope | null =>
  index === record.signings.length - 1 ? record.envelope : record.signings[index]?.envelope ?? null;

/** Synchronous caller observations. An observer cannot own a completed write. */
export interface CustodyMetrics {
  transition(from: Phase | null, to: Phase): void;
  stepTransition(from: Step["phase"] | null, to: Step["phase"]): void;
}

type Read = (envelope: Envelope) => Promise<Receipt | ArchivedSettlement | null>;
type Build = () => Promise<{ binding: BindingRecord; envelope: Envelope }>;

export class Custody {
  constructor(readonly store: CustodyStore, private readonly now: () => string, private readonly metrics?: CustodyMetrics) {}

  async #locked<T>(id: string, notAfter: string, work: () => Promise<T>): Promise<T> {
    const release = await this.store.lock(id, notAfter);
    if (!release) throw new CustodyError({ held: "locked" });
    try { return await work(); } finally { await release(); }
  }

  /** The record under `id`, as version 2. This is the one place that reads a record's version. */
  async #read(id: string): Promise<CustodyRecord | null> {
    let stored: StoredCustodyRecord | null;
    try { stored = await this.store.read(id); } catch (error) { if (error instanceof StoreFormatError) throw error; throw new CustodyError({ held: "unreadable" }); }
    return stored === null ? null : upgraded(stored);
  }

  /** A signing is dead when the scope refused it with a reason of class `never` or `expired`, or when this clock is past its `notAfter` by the margin. */
  dead(signing: CustodySigning): boolean {
    return signing.dead !== undefined || (timeMs(this.now()) ?? -Infinity) >= sendableAt(signing.notAfter);
  }

  /**
   * Keep what came of a dispatch. The envelope left and was answered (or its reply was lost) before this write; a store that
   * fails here settles nothing, and what is reported must say so: the record stays `sent` on disk, the act may have taken
   * effect, and settle under the same key resolves it. It is never "nothing was sent".
   */
  async #outcomeKept(id: string, record: CustodyRecord, answer: Answer["answer"] | "lost", outcome: () => Promise<void>, from: Phase): Promise<void> {
    try {
      await outcome();
      record.updated = this.now();
      await this.#write(id, record, false, from);
    } catch (error) {
      if (error instanceof StoreFormatError) throw error;
      if (error instanceof CustodyError && error.why.held === "too-large") throw error;
      throw new CustodyError({ held: "unkept", answer });
    }
  }

  /** `from` undefined: the write closes signings and moves no phase, so no transition is observed. */
  async #write(id: string, record: CustodyRecord, dispatch = false, from: Phase | null | undefined = record.phase): Promise<void> {
    if (envelopeBytes(record) > RECORD_BYTES) throw new CustodyError({ held: "too-large" });
    // A store may refuse a write by its own account (`full`: the hosted store's budget, before anything is dispatched); any
    // other failure is a storage failure, which settles nothing.
    try { await this.store.write(id, record, dispatch ? { dispatch: true } : {}); } catch (error) { throw error instanceof StoreFormatError || error instanceof CustodyError ? error : new CustodyError({ held: "unreadable" }); }
    if (from === undefined) return;
    try { this.metrics?.transition(from, record.phase); } catch { /* observations never own a write */ }
  }

  /**
   * Keep an outcome: inline up to 64 and within the record's byte bound; the oldest move to the segment, which loses none. An
   * outcome that alone would push the record past the bound goes to the segment directly.
   */
  async #outcome(id: string, record: CustodyRecord, outcome: Outcome): Promise<void> {
    record.outcomes.push(outcome);
    record.count++;
    let spill = Math.max(0, record.outcomes.length - OUTCOMES_INLINE);
    while (spill < record.outcomes.length && (envelopeBytes(record.outcomes.slice(spill)) > OUTCOMES_INLINE_BYTES || envelopeBytes({ ...record, outcomes: record.outcomes.slice(spill) }) > RECORD_BYTES)) spill++;
    if (spill > 0) {
      const inSegment = record.count - record.outcomes.length;
      await this.store.segment(id, inSegment, record.outcomes.splice(0, spill));
    }
  }

  /** The outcomes of a record from position `from` (0 is the first ever), at most `limit`: the segment's, then the inline ones. */
  async outcomes(id: string, record: CustodyRecord, from = 0, limit = record.count): Promise<Outcome[]> {
    const inSegment = record.count - record.outcomes.length;
    const out: Outcome[] = [];
    if (from < inSegment) out.push(...(await this.store.segmented(id, from, Math.min(limit, inSegment - from))).map(withSigning));
    const inline = Math.max(0, from - inSegment);
    out.push(...record.outcomes.slice(inline, inline + (limit - out.length)));
    return out;
  }

  /** The decisive outcome of a record's current attempt, reading the segment only when the inline outcomes do not reach back far enough. */
  async decided(id: string, record: CustodyRecord): Promise<Decided | null> {
    // Newest first: the inline outcomes, then the segment's slices from its end backward, one slice held at a time. The search
    // stops at the newest decisive outcome of the current attempt, or at an outcome of an older attempt, which ends it.
    const inSegment = record.count - record.outcomes.length;
    const search = (list: readonly Outcome[]): Decided | "older" | null => {
      for (let i = list.length - 1; i >= 0; i--) {
        const o = list[i]!;
        if (o.attempt !== record.attempt) return "older";
        const found = decidedBy(o);
        if (found) return found;
      }
      return null;
    };
    const inline = search(record.outcomes);
    if (inline === "older") return null;
    if (inline) return inline;
    for (let end = inSegment; end > 0; end -= DECIDED_SLICE) {
      const from = Math.max(0, end - DECIDED_SLICE);
      const matched = search((await this.store.segmented(id, from, end - from)).map(withSigning));
      if (matched === "older") return null;
      if (matched) return matched;
    }
    return null;
  }

  /** The record under an identity, or null. */
  find(identity: Identity): Promise<CustodyRecord | null> { return this.#read(identityId(identity)); }

  /**
   * Keep the envelope under its identity without sending it: the first
   * preparation. The record that holds it already is returned, when its
   * meaning is the same; another meaning is refused. `bytes` is the caller's
   * account of what the envelope will carry (fields, texts, presented facts
   * and values); it is checked against the record's bound before signing.
   */
  async keep(identity: Identity, meaning: Digest, build: Build, notAfter: string, bytes = 0, options: { standalone?: boolean } = {}): Promise<CustodyRecord> {
    const id = identityId(identity);
    return this.#locked(id, notAfter, async () => this.#kept(id, identity, meaning, build, bytes, options.standalone === true));
  }

  async #kept(id: string, identity: Identity, meaning: Digest, build: Build, bytes: number, standalone = false): Promise<CustodyRecord> {
    const matched = await this.#read(id);
    if (matched) {
      if (matched.meaning !== meaning) throw this.#conflicting(matched);
      return matched;
    }
    // Before signing: the envelope must fit a record with room for its first outcome.
    if (bytes + RECORD_OVERHEAD > RECORD_BYTES) throw new CustodyError({ held: "full", reason: "bytes", bytes });
    return this.store.exclusive(async () => {
      await this.#admitted();
      // A store with a budget admits the new identity's completion need now, before anything is signed.
      await this.store.admit?.(id, bytes + RECORD_OVERHEAD);
      try {
        const { binding, envelope } = await build();
        const at = this.now();
        const record: CustodyRecord = { v: 2, identity, binding, meaning, envelope, signings: [signingOf(envelope, meaning)], phase: "prepared", outcomes: [], count: 0, attempt: 1, steps: {}, created: at, updated: at, ...(standalone ? { standalone: true as const } : {}) };
        const size = envelopeBytes(record);
        if (size + RECORD_OVERHEAD > RECORD_BYTES) throw new CustodyError({ held: "full", reason: "bytes", bytes: size });
        await this.#write(id, record, false, null);
        return record;
      } catch (error) {
        // No record came of it: what was admitted for this identity is released.
        await this.store.unadmit?.(id).catch(() => undefined);
        throw error;
      }
    });
  }

  #conflicting(record: CustodyRecord): CustodyError {
    return new CustodyError({ held: "conflicting", recorded: `${record.envelope.signed.intent.kind} on ${record.identity.target && "scope" in record.identity.target ? record.identity.target.scope : "a creation"}` });
  }

  /** Under the store's exclusive section: refuse when the unresolved records are at the bound. */
  async #admitted(): Promise<void> {
    const open = await this.store.unresolved();
    if (open.length >= (this.store.unresolvedMost ?? UNRESOLVED_MOST)) throw new CustodyError({ held: "full", reason: "count", keys: open.slice(0, 8).map((o) => o.key) });
  }

  /** `resign` signs again for a `refused` record, and for an unresolved record whose latest signing is dead. */
  #resigns(record: CustodyRecord): boolean {
    return record.phase === "refused" || (UNRESOLVED.has(record.phase) && this.dead(record.signings.at(-1)!));
  }

  /**
   * A new signing of the record's request: both bounds and the byte bound are checked before `build` signs. The earlier latest
   * signing keeps its envelope in `signings[]` until it is closed. Each new signing starts a new attempt, kept as `sent`.
   */
  async #resigned(id: string, record: CustodyRecord, meaning: Digest, build: Build, bytes: number): Promise<CustodyRecord> {
    // A preparation step is keyed by the intent it prepared, a standalone record holds a step's own intent, and a creation is
    // named by its definition: a second signing fits none of them (ruling 0767a3f9).
    if (record.standalone || Object.keys(record.steps).length > 0 || "create" in record.identity.target) throw this.#conflicting(record);
    const envelopes = envelopesOf(record), signings = record.signings.length;
    if (envelopes >= ENVELOPES_MOST || signings >= SIGNINGS_MOST) throw new CustodyError({ held: "full", reason: "signings", envelopes, signings });
    if (envelopeBytes(record) + bytes + RECORD_OVERHEAD > RECORD_BYTES) throw new CustodyError({ held: "full", reason: "bytes", bytes });
    const sign = async (): Promise<CustodyRecord> => {
      const { binding, envelope } = await build();
      const next: CustodyRecord = structuredClone(record);
      const latest = next.signings.at(-1)!;
      if (!latest.closed) latest.envelope = next.envelope;
      next.signings.push(signingOf(envelope, meaning));
      Object.assign(next, { binding, envelope, meaning, phase: "sent", attempt: next.attempt + 1, updated: this.now() });
      const size = envelopeBytes(next);
      if (size + RECORD_OVERHEAD > RECORD_BYTES) throw new CustodyError({ held: "full", reason: "bytes", bytes: size });
      await this.#write(id, next, true, record.phase);
      return next;
    };
    return this.store.exclusive(async () => {
      // Only a refused record takes another count slot; an unresolved record already occupies one.
      if (record.phase === "refused") await this.#admitted();
      await this.store.admit?.(id, bytes + RECORD_OVERHEAD);
      // A failed rebuild leaves the earlier record and its completion reservation intact.
      return sign();
    });
  }

  /**
   * Send under custody. First preparation: keep, read back, send. A record
   * that is unresolved: resend the same bytes. An accepted or mismatch
   * record: return its outcome and send nothing, whatever is asked. A refused
   * record: return its refusal, or with `resubmit` keep a new unresolved
   * attempt first and then send the same bytes.
   *
   * `resign: true` keeps and sends a new signing when the record is `refused`,
   * or unresolved with its latest signing dead. In every other case the call
   * behaves as without it. `read` asks the scope for the earlier signings when
   * the new signing is answered `mismatch`.
   */
  async send(identity: Identity, meaning: Digest, build: Build, deliver: (envelope: Envelope) => Promise<Answer>, options: { resubmit?: boolean; resign?: boolean; read?: Read; notAfter: string; bytes?: number }): Promise<Sent> {
    const id = identityId(identity);
    return this.#locked(id, options.notAfter, async () => {
      const existing = options.resign ? await this.#read(id) : null;
      let record: CustodyRecord;
      if (existing && this.#resigns(existing)) {
        record = await this.#resigned(id, existing, meaning, build, options.bytes ?? 0);
      } else {
        record = await this.#kept(id, identity, meaning, build, options.bytes ?? 0);
        const previous = record.phase;
        if (TERMINAL.has(record.phase)) {
          const last = await this.decided(id, record);
          if (record.phase !== "refused" || !options.resubmit) {
            if (!last) throw new CustodyError({ held: "unreadable" });
            return sentOf(record, last);
          }
          // A deliberate resubmission of a refusal makes the record unresolved again: it is admitted against the capacity under the
          // shared lease, and the new attempt is kept there, before anything is sent. A store that is full keeps the refusal as it was.
          await this.store.exclusive(async () => {
            await this.#admitted();
            record.attempt++;
            record.phase = "sent";
            record.updated = this.now();
            await this.#write(id, record, true, previous);
          });
        } else {
          record.phase = "sent";
          record.updated = this.now();
          await this.#write(id, record, true, previous);
        }
      }
      const signing = record.signings.length - 1;
      let answer: Answer;
      try {
        answer = await deliver(record.envelope);
      } catch (error) {
        if (!(error instanceof Lost)) throw error;
        record.phase = "unknown";
        await this.#outcomeKept(id, record, "lost", async () => { await this.#outcome(id, record, { at: this.now(), lost: true, attempt: record.attempt, signing }); }, "sent");
        return { record, lost: true };
      }
      // `unavailable` resolves nothing; a definitive answer does. A refusal of class `never` or `expired` kills the signing, and
      // `mismatch` closes it: another intent holds the key.
      record.phase = answer.answer === "unavailable" ? "unknown" : answer.answer;
      const latest = record.signings[signing]!;
      const dead = deathOf(answer);
      if (dead) latest.dead = dead;
      if (answer.answer === "mismatch") latest.closed = true;
      await this.#outcomeKept(id, record, answer.answer, async () => { await this.#outcome(id, record, { at: this.now(), answer, attempt: record.attempt, signing }); }, "sent");
      // A mismatch to a record with earlier signings: one of them can hold the key. Ask the scope for each, in this call.
      if (answer.answer === "mismatch" && options.read && record.signings.length > 1) {
        const found = await this.#ask(id, record, options.read);
        if (found.receipt) return { record, answer: { answer: "accepted", receipt: found.receipt }, retained: false };
        if (found.archived) return { record, archivedSettlement: found.archived, retained: true };
      }
      return { record, answer, retained: false };
    });
  }

  /** The signings that `settle` asks the scope for, newest first. An unresolved record always asks with its latest signing. */
  #asked(record: CustodyRecord): number[] {
    if (FINAL.has(record.phase)) return [];
    const last = record.signings.length - 1;
    return record.signings.map((_, i) => last - i).filter((i) => !record.signings[i]!.closed || (i === last && UNRESOLVED.has(record.phase)));
  }

  /**
   * Ask the scope with each kept envelope that `#asked` names, newest first. A receipt makes the record `accepted` for that
   * signing, and an archived settlement makes it `archived`; either ends the asking. A `not-found` closes a signing that is
   * dead, or any signing of a `mismatch` record, except the latest signing of an unresolved record. A lost read changes nothing.
   */
  async #ask(id: string, record: CustodyRecord, read: Read): Promise<{ receipt: Receipt | null; archived: ArchivedSettlement | null }> {
    const last = record.signings.length - 1;
    let closed = false;
    for (const index of this.#asked(record)) {
      const envelope = envelopeOf(record, index);
      if (!envelope) continue;
      let observed: Receipt | ArchivedSettlement | null = null;
      try { observed = await read(envelope); } catch (error) { if (!(error instanceof Lost)) throw error; continue; }
      if (observed) {
        const previous = record.phase;
        record.phase = "archived" in observed ? "archived" : "accepted";
        await this.#outcome(id, record, "archived" in observed
          ? { at: this.now(), archivedSettlement: observed, attempt: record.attempt, signing: index }
          : { at: this.now(), settled: observed, attempt: record.attempt, signing: index });
        record.updated = this.now();
        await this.#write(id, record, false, previous);
        return "archived" in observed ? { receipt: null, archived: observed } : { receipt: observed, archived: null };
      }
      const signing = record.signings[index]!;
      if (signing.closed || (index === last && UNRESOLVED.has(record.phase))) continue;
      if (record.phase === "mismatch" || this.dead(signing)) { this.#close(record, index); closed = true; }
    }
    if (closed) { record.updated = this.now(); await this.#write(id, record, false, undefined); }
    return { receipt: null, archived: null };
  }

  /** Close signing `index` and remove its indexed envelope. The latest envelope remains in record.envelope. */
  #close(record: CustodyRecord, index: number): void {
    const signing = record.signings[index]!;
    signing.closed = true;
    delete signing.envelope;
  }

  /**
   * Settle: a final record's outcome, or the scope's settlement of each kept
   * envelope that `#asked` names. A receipt resolves the record as accepted; an
   * archived read retains its distinct evidence and prevents resend without
   * inferring acceptance. `not-found` and a lost reply resolve nothing; a
   * `not-found` closes a dead signing. Signs nothing, sends no act. The
   * outcome given is always the newest decisive one of the current attempt.
   */
  async settle(identity: Identity, read: Read): Promise<{ record: CustodyRecord; receipt: Receipt | null; decided: Decided | null } | null> {
    const id = identityId(identity);
    const record = await this.#read(id);
    if (!record) return null;
    if (this.#asked(record).length === 0) return { record, receipt: null, decided: await this.decided(id, record) };
    return this.#locked(id, record.envelope.signed.intent.notAfter, async () => {
      const fresh = (await this.#read(id))!;
      if (this.#asked(fresh).length === 0) return { record: fresh, receipt: null, decided: await this.decided(id, fresh) };
      const { receipt } = await this.#ask(id, fresh, read);
      return { record: fresh, receipt, decided: await this.decided(id, fresh) };
    });
  }

  /**
   * The replica settles a record (the note, section 5.4). The caller states that a verified journal entry holds the key with
   * `folded.intent`. When that intent is a signing of the record, the record is `accepted` for it; otherwise the record is
   * `mismatch`, and each of its signings is closed. A record that is `accepted`, `archived` or `settled` does not change. No
   * request goes to the service.
   */
  async folded(identity: Identity, folded: Folded): Promise<CustodyRecord | null> {
    const id = identityId(identity);
    const record = await this.#read(id);
    if (!record) return null;
    if (FINAL.has(record.phase)) return record;
    return this.#locked(id, record.envelope.signed.intent.notAfter, async () => {
      const fresh = (await this.#read(id))!;
      if (FINAL.has(fresh.phase)) return fresh;
      const previous = fresh.phase;
      let index = fresh.signings.length - 1;
      while (index >= 0 && fresh.signings[index]!.intent !== folded.intent) index--;
      if (index >= 0) fresh.phase = "accepted";
      else {
        fresh.phase = "mismatch";
        fresh.signings.forEach((_, i) => { this.#close(fresh, i); });
      }
      await this.#outcome(id, fresh, { at: this.now(), folded, attempt: fresh.attempt, signing: index >= 0 ? index : null });
      fresh.updated = this.now();
      await this.#write(id, fresh, false, previous);
      return fresh;
    });
  }

  /**
   * The caller states that a verified journal, read to `head` after signing `index` died, does not hold the key. A dead
   * signing closes, and drops its envelope unless it is the latest. A signing that is not dead by this clock does not change:
   * the scope can still seal it. For the latest signing of an unresolved record, the head is kept as an `unsent` outcome and
   * the phase becomes `refused`, ending its capacity charge without inventing a refusal from the scope.
   */
  async absent(identity: Identity, index: number, head: Head): Promise<CustodyRecord | null> {
    const id = identityId(identity);
    const record = await this.#read(id);
    if (!record) return null;
    return this.#locked(id, record.envelope.signed.intent.notAfter, async () => {
      const fresh = (await this.#read(id))!;
      const signing = fresh.signings[index];
      if (FINAL.has(fresh.phase) || !signing || signing.closed || !this.dead(signing)) return fresh;
      const previous = fresh.phase;
      this.#close(fresh, index);
      if (index === fresh.signings.length - 1 && UNRESOLVED.has(fresh.phase)) {
        await this.#outcome(id, fresh, { at: this.now(), unsent: head, attempt: fresh.attempt, signing: index });
        fresh.phase = "refused";
      }
      fresh.updated = this.now();
      await this.#write(id, fresh, false, fresh.phase === previous ? undefined : previous);
      return fresh;
    });
  }

  /**
   * One preparation step, under its own identity in the record: send the
   * request, record the resource's answer or `unknown`. The act's phase does
   * not move. A step that has an answer is asked again only when the caller
   * asks again: the resource answers the same step with its first entry.
   */
  async step(identity: Identity, resource: ScopeRef, capability: string, step: string, deliver: (signed: SignedIntent) => Promise<Answer>): Promise<{ record: CustodyRecord; step: Step; answer: Answer | null; retained: boolean }> {
    const id = identityId(identity);
    const record = await this.#read(id);
    if (!record) throw new CustodyError({ held: "unreadable" });
    return this.#locked(id, record.envelope.signed.intent.notAfter, async () => {
      const fresh = (await this.#read(id))!;
      const before = fresh.phase;
      const intent = intentDigest(fresh.envelope.signed.intent);
      const sid = stepId({ intent, resource, capability, step });
      const stepBefore = fresh.steps[sid]?.phase ?? null;
      const entry: Step = fresh.steps[sid] ?? { intent, resource, capability, step, phase: "prepared", answers: [] };
      // A standalone step with a decisive answer is terminal: its answer is returned again, and nothing is sent.
      if (fresh.standalone && entry.phase === "answered") {
        const kept = [...entry.answers].reverse().find((a) => a.answer !== null && a.answer.answer !== "unavailable")?.answer ?? null;
        return { record: fresh, step: entry, answer: kept, retained: true };
      }
      // Kept as sent before anything is sent: a restart between here and the answer finds the step sent, and a retry sends the
      // same signed intent again.
      entry.phase = "sent";
      fresh.steps[sid] = entry;
      if (fresh.standalone) fresh.phase = "sent";
      await this.#write(id, fresh, true, before);
      try { this.metrics?.stepTransition(stepBefore, entry.phase); } catch { /* observations never own a write */ }
      let answer: Answer | null = null;
      try { answer = await deliver(fresh.envelope.signed); } catch (error) { if (!(error instanceof Lost)) throw error; }
      entry.phase = answer === null || answer.answer === "unavailable" ? "unknown" : "answered";
      entry.answers.push({ at: this.now(), answer });
      // A step keeps its first answer and its latest 63 (see the header): the first is what the resource repeats for the same step.
      if (entry.answers.length > OUTCOMES_INLINE) entry.answers.splice(1, entry.answers.length - OUTCOMES_INLINE);
      // A standalone record is settled, and terminal, when every step it holds is decided; until then it stays unresolved.
      const previous = fresh.phase;
      if (fresh.standalone) fresh.phase = Object.values(fresh.steps).every((st) => st.phase === "answered") ? "settled" : "unknown";
      // The step was sent and answered before this write: a store that fails here keeps the step `sent`, and what is reported
      // says so, with the step's identity, never that nothing was sent (the same rule as a dispatch's outcome).
      try {
        fresh.updated = this.now();
        await this.#write(id, fresh, false, previous);
        try { this.metrics?.stepTransition("sent", entry.phase); } catch { /* observations never own a write */ }
      } catch (error) {
        if (error instanceof StoreFormatError) throw error;
        if (error instanceof CustodyError && error.why.held === "too-large") throw error;
        throw new CustodyError({ held: "unkept", answer: answer === null ? "lost" : answer.answer, step: { resource: resource.scope, capability, step } });
      }
      return { record: fresh, step: entry, answer, retained: false };
    });
  }
}

/** A store in memory: for a process that keeps nothing, and for a test in the Workers runtime. Each write is a whole copy, read back. */
export function memoryStore(): ClientCustodyStore & { records: Map<string, string> } {
  const records = new Map<string, string>();
  const segments = new Map<string, StoredOutcome[]>();
  const locks = new Set<string>();
  const observers = new Set<() => void>();
  let queue: Promise<unknown> = Promise.resolve();
  const parsed = (): [string, StoredCustodyRecord][] => [...records.entries()].map(([id, text]) => [id, JSON.parse(text) as StoredCustodyRecord]);
  return {
    records,
    lock: async (id) => {
      if (locks.has(id)) return null;
      locks.add(id);
      return async () => { locks.delete(id); };
    },
    exclusive: <T>(work: () => Promise<T>): Promise<T> => {
      const run = queue.then(work, work);
      queue = run.catch(() => undefined);
      return run;
    },
    read: async (id) => { const text = records.get(id); return text === undefined ? null : JSON.parse(text) as StoredCustodyRecord; },
    write: async (id, record) => {
      const text = canonicalize(record);
      records.set(id, text);
      if (records.get(id) !== text) throw new Error("read back differs");
      for (const changed of [...observers]) { try { changed(); } catch { /* an observer never owns a write */ } }
    },
    unresolved: async () => parsed().filter(([, r]) => !TERMINAL.has(r.phase)).sort(([, a], [, b]) => (a.created < b.created ? -1 : 1)).map(([id, r]) => ({ id, key: r.identity.key, created: r.created })),
    segment: async (id, at, outcomes) => { segments.set(id, [...(segments.get(id) ?? []).slice(0, at), ...structuredClone(outcomes as StoredOutcome[])]); },
    segmented: async (id, from, limit) => structuredClone((segments.get(id) ?? []).slice(from, from + limit)),
    byTarget: async (who) => {
      const wanted = canonicalize({ service: who.service, membership: who.membership, signer: who.signer, target: who.target });
      return parsed().filter(([, r]) => canonicalize({ service: r.identity.service, membership: r.identity.membership, signer: r.identity.signer, target: r.identity.target }) === wanted)
        .sort(([, a], [, b]) => (a.created < b.created ? -1 : 1)).map(([id, r]) => ({ id, key: r.identity.key, phase: r.phase, created: r.created }));
    },
    observe: (changed) => { const own = () => changed(); observers.add(own); return () => { observers.delete(own); }; },
  };
}
