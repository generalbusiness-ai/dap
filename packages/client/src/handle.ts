/**
 * A handle on one scope (scope contract, sections 4.2, 9.1 and 11.5), over a
 * `Transport`. It submits and settles signed intents, makes the bounded
 * reads, and follows a receipt and a task.
 *
 * It derives no judgment. What a caller may do in a scope it learns by
 * reading: the summary, and the scope's published definition.
 *
 * **Retrying.** `submit` answers with the scope's `Answer`. When no answer
 * could be read, it rejects with `TransportError`: the act may or may not
 * have been recorded. After that, and after an `unavailable` answer, the
 * caller submits the SAME signed intent again. If the first was accepted,
 * the retry returns the same receipt. `settle` returns that receipt at any
 * later time, for the exact signed intent.
 */

import type {
  Archived, BehindRead, LogPage, ReadMinimum, ScopeRef, Answer, Beside, Cursor, DeclaredDefinition, Digest, OutboxItem, OutboxId, Entry, Created, Grant, Head, Item, PlatformDefinition, Read, ReadRefusal, Receipt, ScopeApi, ScopeId, Sealed, Settlement,
  SignedIntent, Summary, ItemQuery, ItemQueryRead, ApplicationProjectionQuery, ApplicationProjectionRead,
} from "@generalbusiness/dap-contract";
import { DOMAINS } from "@generalbusiness/dap-contract";
import { canonicalize, digestBytes, utf8, readMinimum, isReceipt, definitionDigest, entryHash, encodeItemQueryParameter, readItemQueryParameter, itemQueryReadFor, within, LATE, isDigest, parseStrict, textDigest } from "@generalbusiness/dap-bytes";
import { encodeApplicationProjectionQuery, readApplicationProjectionQuery, readApplicationProjectionReplyText } from "@generalbusiness/dap-platform/application-v2";

/** How a handle reaches a scope service: the contract's `ScopeApi`. `http.ts` and `binding.ts` each make one. */
export type Transport = ScopeApi;

/** No answer could be read: the request or its reply was lost, or the reply was not an answer. Nothing is known about what was recorded. */
export class TransportError extends Error {
  override readonly name = "TransportError";
}

/**
 * The entry a receipt names, checked against the whole fact reference: scope,
 * incarnation, kind, position and hash. `wrong-incarnation`: the entry at
 * that position is of another incarnation of the scope than the receipt
 * names. `reference-mismatch`: it is of another scope or kind, or at another
 * position. `hash-mismatch`: its bytes do not hash to the receipt's fact. In
 * each case the receipt is not of this history.
 */
export type Followed = BehindRead | { ok: true; at: Head; entry: Entry } | { ok: false; reason: "archived"; archived: Archived } | { ok: false; reason: Exclude<ReadRefusal, "archived" | "behind"> | "hash-mismatch" | "reference-mismatch" };

/** A receipt keeps its full scope incarnation and exact entry hash. */
function minimum(value?: ReadMinimum | Receipt): ReadMinimum | undefined {
  if (value === undefined) return undefined;
  const checked = readMinimum(isReceipt(value) ? { at: value.fact.at, head: { seq: value.fact.seq, hash: value.fact.hash } } : value);
  if (!checked) throw new TransportError("invalid read minimum");
  return checked;
}

/** A transport cannot silently strip a minimum and return older state. */
function reached(at: Head, required?: ReadMinimum): void {
  if (!required) return;
  const seq = typeof required.head === "number" ? required.head : required.head.seq;
  if (at.seq < seq || typeof required.head !== "number" && at.seq === seq && at.hash !== required.head.hash)
    throw new TransportError("the reply does not reach the read minimum");
}
function checkedRead<T>(reply: Read<T>, required?: ReadMinimum): Read<T> {
  if (reply.ok) reached(reply.at, required);
  return reply;
}

/**
 * What a `log` page covers. `whole`: the page holds every entry from the cursor up to its `next`, or up to the head when it has
 * none, so a fold of the whole pages from 0 equals the scope's state. `filtered`: the page can omit entries. Below the floor the
 * read is the `archived` refusal.
 */
export type LogCoverage = "whole" | "filtered";
/** A `log` read: a refusal as the scope gives it, or a checked page with its coverage. */
export type LogRead = Exclude<Read<LogPage>, { ok: true }> | (Extract<Read<LogPage>, { ok: true }> & { coverage: LogCoverage });

/** Only a session reads every row of a scope's journal. A signed read keeps the rows of its own key's chain. */
const SESSION = "Session ";
const sameRef = (a: ScopeRef, b: ScopeRef): boolean => canonicalize(a as never) === canonicalize(b as never);

export class ScopeHandle {
  readonly scope: ScopeId;
  readonly #transport: Transport;
  readonly #reader: unknown;
  /** The scope reference and definition that this scope's summary named: each `log` page must name the same. */
  #own: { scope: ScopeRef; definition: Digest | PlatformDefinition } | null = null;

  /** `reader`: what this caller presents to the read port. What it must be is the authority note's. */
  constructor(transport: Transport, scope: ScopeId, reader: unknown = null) {
    this.#transport = transport;
    this.scope = scope;
    this.#reader = reader;
  }

  /**
   * Submit a signed intent, with the grants it is presented under. `beside`:
   * what travels beside the intent and is not signed: each detached text
   * that a field names by its digest, and each fact the act is presented.
   * A retry sends the same `beside`. See "Retrying" above.
   */
  submit(signed: SignedIntent, grants: readonly Grant[] = [], beside: Beside = {}): Promise<Answer> { return this.#transport.submit(this.scope, signed, grants, beside); }

  /** The receipt of an accepted act, by its exact signed intent, or `not-found` (section 4.2). It admits nothing. */
  settle(signed: SignedIntent): Promise<Settlement> { return this.#transport.settle(this.scope, signed); }

  // The reads of section 9.1. Each is a statement about `at`; a page with `next` is read on with that cursor.

  async summary(atLeast?: ReadMinimum | Receipt): Promise<Read<Summary>> {
    const required = minimum(atLeast);
    return checkedRead(await this.#transport.summary(this.scope, this.#reader, required), required);
  }
  /** A page of the retained final items of one type. */
  async items(type: string, cursor?: Cursor, atLeast?: ReadMinimum | Receipt): Promise<Read<readonly Item[]>> {
    const required = minimum(atLeast);
    return checkedRead(await this.#transport.items(this.scope, this.#reader, type, cursor, required), required);
  }
  /** One bounded page. `complete` covers only this selection's suffix at `at`. */
  async queryItems(query: ItemQuery): Promise<ItemQueryRead> {
    const encoded = encodeItemQueryParameter(query), checked = readItemQueryParameter(encoded);
    if (!checked || checked.scope.scope !== this.scope) throw new TransportError("invalid bounded item query");
    const result = await within(10, async signal => {
      const reply = await this.#transport.queryItems(this.scope, this.#reader, encoded!);
      if (signal.aborted) return LATE;
      if (!itemQueryReadFor(reply, checked)) throw new TransportError("the reply does not match the bounded item query");
      return reply;
    });
    if (result === LATE) throw new TransportError("no whole item query within 10 seconds; coverage is incomplete");
    return result;
  }
  /** One complete declared projection at one journal head. Requires a read session. */
  async applicationProjection(query: ApplicationProjectionQuery, atLeast?: ReadMinimum | Receipt): Promise<ApplicationProjectionRead> {
    const encoded = encodeApplicationProjectionQuery(query), checked = readApplicationProjectionQuery(encoded);
    if (!checked || checked.scope.scope !== this.scope) throw new TransportError("invalid bounded application projection");
    const required = minimum(atLeast);
    const result = await within(10, async signal => {
      const text = await this.#transport.applicationProjection(this.scope, this.#reader, encoded!, required);
      if (signal.aborted) return LATE;
      const reply = readApplicationProjectionReplyText(text, checked);
      if (!reply) throw new TransportError("the reply does not match the bounded application projection");
      if (reply.ok) reached(reply.value.at, required);
      return reply;
    });
    if (result === LATE) throw new TransportError("no whole application projection within 10 seconds; coverage is incomplete");
    return result;
  }
  async history(cursor?: Cursor, atLeast?: ReadMinimum | Receipt): Promise<Read<readonly Sealed[]>> {
    const required = minimum(atLeast);
    return checkedRead(await this.#transport.history(this.scope, this.#reader, cursor, required), required);
  }
  async entry(seq: number, atLeast?: ReadMinimum | Receipt): Promise<Read<Sealed>> {
    const required = minimum(atLeast);
    return checkedRead(await this.#transport.entry(this.scope, this.#reader, seq, required), required);
  }
  /**
   * One page of the journal as the scope stores it, checked. The page must name this scope's reference and definition, as its
   * summary gives them. Each entry's bytes must hash to its hash and hold its seq and this scope. The seqs must rise, from the
   * cursor up to the head. A page that fails a check rejects with `TransportError`.
   *
   * The coverage is `whole` only when this handle read with a session and the seqs run without a gap from the cursor to the
   * page's `next`, or to the head when it has none. A signed read keeps only some rows, while the scope reports `complete` and
   * `next` of the rows before it filters them: its page is `filtered` whatever its seqs are.
   *
   * The transport sends no read minimum with `log`. The handle checks the page's head against `atLeast` after the read.
   */
  async log(cursor?: Cursor, atLeast?: ReadMinimum | Receipt): Promise<LogRead> {
    const required = minimum(atLeast);
    if (this.#own === null) {
      const summary = await this.summary();
      if (!summary.ok) return summary;
      if (summary.value.scope.scope !== this.scope) throw new TransportError("the summary is of another scope");
      this.#own = { scope: summary.value.scope, definition: summary.value.definition };
    }
    const own = this.#own;
    if (required && !sameRef(required.at, own.scope)) throw new TransportError("the read minimum names another scope");
    const reply = await this.#transport.log(this.scope, this.#reader, cursor);
    if (!reply.ok) return reply;
    reached(reply.at, required);
    const page = reply.value;
    if (!sameRef(page.scope, own.scope) || page.definition !== own.definition) throw new TransportError("the log page is of another scope or definition");
    const from = cursor === undefined ? 0 : /^(0|[1-9][0-9]{0,15})$/.test(cursor) ? Number(cursor) : null;
    let previous = from === null ? -1 : from - 1, gap = from === null;
    for (const row of page.entries) {
      if (digestBytes(utf8(`${DOMAINS.entry}\n${row.bytes}`)) !== row.hash) throw new TransportError(`log entry ${row.seq} does not hash to its hash`);
      let entry: Entry;
      try { entry = parseStrict(row.bytes) as Entry; } catch { throw new TransportError(`log entry ${row.seq} is not canonical`); }
      if (entry.seq !== row.seq || !entry.at || !sameRef(entry.at, own.scope)) throw new TransportError(`log entry ${row.seq} is not this scope's entry at that seq`);
      if (row.seq <= previous || row.seq > reply.at.seq) throw new TransportError("the log page's seqs do not rise from the cursor to the head");
      if (row.seq !== previous + 1) gap = true;
      previous = row.seq;
    }
    const end = reply.next === undefined ? reply.at.seq + 1 : /^(0|[1-9][0-9]{0,15})$/.test(reply.next) ? Number(reply.next) : null;
    const whole = typeof this.#reader === "string" && this.#reader.startsWith(SESSION) && !gap && end !== null && previous + 1 === end;
    return { ...reply, coverage: whole ? "whole" : "filtered" };
  }
  outbox(cursor?: Cursor): Promise<Read<readonly OutboxItem[]>> { return this.#transport.outbox(this.scope, this.#reader, cursor); }

  /**
   * The scope's published definition: the declaration the scope retains
   * under the digest its summary names, checked against that digest. A
   * platform definition has no declaration to read.
   */
  async definition(): Promise<Read<DeclaredDefinition>> {
    const summary = await this.summary();
    if (!summary.ok) return summary;
    const named: Digest | PlatformDefinition = summary.value.definition;
    if (!isDigest(named)) return { ok: false, reason: "unsupported-definition" };
    const kept = await this.#transport.retained(this.scope, this.#reader, "definition", named);
    if (!kept.ok) return kept;
    try {
      const declared = parseStrict(kept.value.bytes) as DeclaredDefinition;
      if (definitionDigest(declared) === named) return { ok: true, at: kept.at, value: declared, complete: true };
    } catch { /* not canonical values */ }
    return { ok: false, reason: "unavailable" };
  }

  /**
   * Follow a receipt: read the entry it names, and check it against every
   * part of the receipt's fact. The identity is checked whether or not the
   * hash matches: a fact with a true position and hash and another
   * incarnation or kind is not a fact of this history. The hash is computed
   * here; the hash the service sends beside the entry is not used.
   */
  async followReceipt(receipt: Receipt): Promise<Followed> {
    const { at, seq, hash } = receipt.fact;
    if (at.scope !== this.scope) return { ok: false, reason: "not-found" };
    // Keep the full identity/hash checks here, rather than making a permanent
    // receipt mismatch look like a temporary barrier refusal.
    let read = await this.entry(seq, { at, head: seq });
    if (!read.ok && read.reason === "unavailable") {
      // One ordinary read can diagnose a wrong kind refused by the barrier.
      // This is neither polling nor an automatic retry of an act.
      read = await this.entry(seq);
      if (read.ok && read.at.seq < seq) return { ok: false, reason: "unavailable" };
    }
    if (!read.ok) return read.reason === "behind" ? read : read.reason === "archived" ? { ok: false, reason: "archived", archived: read.archived } : { ok: false, reason: read.reason };
    const entry = read.value.entry;
    if (entry.at?.scope !== at.scope || entry.at.kind !== at.kind || entry.seq !== seq) return { ok: false, reason: "reference-mismatch" };
    if (entry.at.inc !== at.inc) return { ok: false, reason: "wrong-incarnation" };
    let matched: Digest | null = null;
    try {
      matched = entryHash(entry);
    } catch { /* not canonical values */ }
    if (matched !== hash) return { ok: false, reason: "hash-mismatch" };
    return { ok: true, at: read.at, entry };
  }

  /**
   * A detached text, by the digest that an entry or a slot holds for it
   * (section 6.2). The scope retains the text as one JSON string, and the
   * digest is computed here again. `not-found`: the scope holds no bytes
   * under that digest, as after a redaction.
   */
  async text(digest: Digest): Promise<Read<string>> {
    const kept = await this.#transport.retained(this.scope, this.#reader, "text", digest);
    if (!kept.ok) return kept;
    try {
      const text: unknown = parseStrict(kept.value.bytes);
      if (typeof text === "string" && textDigest(text) === digest) return { ok: true, at: kept.at, value: text, complete: true };
    } catch { /* not canonical values */ }
    return { ok: false, reason: "unavailable" };
  }

  /** Follow a task: the outbox status of one send, by the outbox ID a receipt lists. */
  followOutbox(outboxId: OutboxId): Promise<Read<OutboxItem>> { return this.#transport.outboxItem(this.scope, this.#reader, outboxId); }
}

/**
 * Create a scope with no creator (section 7.1), and take a handle when
 * creation is accepted. `definitions`: the declarations the scope's
 * definition names in `create` sends, which the scope retains for its
 * children. `beside`: the detached texts that the creation intent's fields
 * name. A creation is retried with the same signed intent, like an act.
 */
export async function create(
  transport: Transport, creation: SignedIntent, definition: DeclaredDefinition | Digest | PlatformDefinition, definitions: readonly DeclaredDefinition[] = [], reader: unknown = null, beside: Beside = {},
): Promise<{ answer: Created; scope: ScopeHandle | null }> {
  const answer = await transport.create(creation, definition, definitions, beside);
  return { answer, scope: answer.answer === "accepted" ? new ScopeHandle(transport, answer.receipt.fact.at.scope, reader) : null };
}
