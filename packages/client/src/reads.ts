/**
 * How MCP and the command line read: with a read session it asks membership for, kept in
 * memory, and by signed reads of its key where no session is given or a
 * session is refused (plan 031, section 7, "Where it runs"). A session is
 * asked of each membership the inventory uses, once, and again before a read
 * when it has ended. Nothing here is authority, and no token is written
 * anywhere: `Session` keeps it out of its JSON and text.
 */

import type { Answer, Digest, Head, ReadRefusal, RefusalReason, ReadMinimum, ItemQueryRead, Read, ScopeId, ScopeRef, ApplicationProjectionQuery, ApplicationProjectionRead } from "@generalbusiness/dap-contract";
import { admitSequenceGenesis, canonicalize, intentDigest, isDefinitionName, isDigest, isEntry, isEntryOf, isHead, isRecord, isScopeRef, parseStrict, timeMs, timeOf, utf8, type CheckedSequence } from "@generalbusiness/dap-bytes";
import { LogProtocolError, TransportError, ScopeHandle, type Transport } from "./handle.ts";
import type { AbsenceSnapshot, Custody, CustodyRecord, Folded, Identity } from "./custody.ts";
import { httpTransport, type Fetch } from "./http.ts";
import { requestSession, signerSessionRequest, type Session } from "./session.ts";
import { signedReads } from "./signed-read.ts";
import type { Signer } from "./signer.ts";

export interface ReadPort {
  service: string;
  fetch?: Fetch;
  signer: Signer;
  now: () => number;
  sessions?: ReadSessions;
}

/** Local proof diagnostics, not Native answers or public result tags. */
export type AbsenceFailure =
  | { kind: "unsupported" | "identity" | "no-session" }
  | { kind: "read"; reason: ReadRefusal }
  | { kind: "filtered" | "incomplete" | "nonprogressing" | "chain" | "floor" | "protocol" | "transport" | "head-before-expiry" };

export type AbsenceRecovery =
  | { state: "not-needed"; record: CustodyRecord | null }
  | { state: "unproved"; record: CustodyRecord; why: AbsenceFailure }
  | { state: "present"; record: CustodyRecord; found: Folded }
  | { state: "changed"; record: CustodyRecord | null }
  | { state: "absent"; record: CustodyRecord; head: Head };

/**
 * The refusal reasons of a submit that the scope's grant check gives. The check is `judgeGrant` (`packages/derive/src/grant.ts:357`).
 * It fails for seven conditions (`Unheld`, `grant.ts:257`: key, revoked, key-state, action, within, not-after, controller). The scope
 * collects them as an empty list of grants (`packages/scope/src/authority.ts:336`) and answers each one the same way: `refused` with
 * `unauthorized` (`packages/scope/src/core.ts:683`). The judge of an act answers a missing grant or a rule that does not pass the key
 * with the same reason (`packages/derive/src/judge.ts:459,469`). No other reason of `RefusalReason` is the grant check's, and none
 * of the seven names travels in the answer. A refusal in this set means that the standing in the signer's session is out of date.
 * `authority-unavailable` is not in it: the answer is `unavailable`, nothing was judged, and nothing ends.
 */
export const AUTHORITY_REFUSALS: readonly RefusalReason[] = ["unauthorized"];

/** Whether the scope's answer to a submit is a refusal of the signer's authority (`AUTHORITY_REFUSALS`). The session then ends, so the next read asks again. */
export function authorityRefusal(answer: Answer): boolean { return answer.answer === "refused" && AUTHORITY_REFUSALS.includes(answer.reason); }

/** How long a membership that refused a session is not asked again, in milliseconds. */
const REFUSED_FOR_MS = 60_000;

interface SessionEntry {
  identity: string;
  scope: ScopeId;
  session: Session | null;
}

/** Completed read credentials only. Each reader keeps its own transport and pending requests. */
export class ReadSessions {
  readonly #entries = new Map<string, SessionEntry>();

  entry(service: string, key: string, membership: ScopeRef): SessionEntry {
    const identity = JSON.stringify([service, key, membership.scope, membership.genesis]);
    let entry = this.#entries.get(identity);
    if (!entry) {
      entry = { identity, scope: membership.scope, session: null };
      if (this.#entries.size >= 64) this.#entries.delete(this.#entries.keys().next().value!);
      this.#entries.set(identity, entry);
    }
    return entry;
  }

  current(entry: SessionEntry): boolean { return this.#entries.get(entry.identity) === entry; }

  /** Invalidate both a completed credential and any reply still in flight for this scope. */
  forget(scope: ScopeId): void {
    for (const [identity, entry] of this.#entries) if (entry.scope === scope) this.#entries.delete(identity);
  }
}

export class Reads {
  readonly #port: ReadPort;
  readonly #sessions: ReadSessions;
  readonly #pending = new Map<SessionEntry, Promise<Session | null>>();
  readonly #refused = new WeakMap<SessionEntry, number>();
  /** Each membership incarnation under which this process held a session. Memory only: only a restart forgets it. */
  readonly #held = new Set<string>();
  readonly #heldScopes = new Set<ScopeId>();
  readonly #plain: Transport;
  readonly #signed: Transport;

  constructor(port: ReadPort) {
    this.#port = port;
    this.#sessions = port.sessions ?? new ReadSessions();
    this.#plain = httpTransport(port.service, port.fetch ? { fetch: port.fetch } : {});
    this.#signed = signedReads(this.#plain, port.signer, { now: port.now });
  }

  get transport(): Transport { return this.#plain; }
  get service(): string { return this.#port.service; }
  get fetch(): Fetch | undefined { return this.#port.fetch; }
  get signer(): Signer { return this.#port.signer; }
  now(): number { return this.#port.now(); }

  /** The session of a membership, asked for when none is held or the held one has ended. Null: membership gave none. */
  async session(membership: ScopeRef | null): Promise<Session | null> {
    if (membership === null) return null;
    const held = this.#sessions.entry(this.#port.service, this.#port.signer.key, membership);
    const now = this.#port.now();
    const claims = held.session?.claims;
    if (held.session && claims?.key === this.#port.signer.key
      && claims.membership.scope === membership.scope && claims.membership.genesis === membership.genesis
      && !held.session.endedBy(timeOf(now + 10_000))) {
      this.#heldScopes.add(membership.scope);
      this.#held.add(`${membership.scope} ${membership.genesis}`);
      return held.session;
    }
    const refusedAt = this.#refused.get(held);
    if (refusedAt !== undefined && now - refusedAt < REFUSED_FOR_MS) return null;
    const pending = this.#pending.get(held);
    if (pending) return pending;
    const ask = this.#ask(membership, held, now);
    this.#pending.set(held, ask);
    try { return await ask; } finally { if (this.#pending.get(held) === ask) this.#pending.delete(held); }
  }

  async #ask(membership: ScopeRef, held: SessionEntry, now: number): Promise<Session | null> {
    try {
      const notAfter = timeOf(Math.floor(now / 1000) * 1000 + 60_000);
      const asked = await signerSessionRequest(membership, this.#port.signer, notAfter, crypto.randomUUID());
      const answer = await requestSession(this.#port.service, membership.scope, asked, { standing: true, ...(this.#port.fetch ? { fetch: this.#port.fetch } : {}) });
      if (!this.#sessions.current(held)) return null;
      if (answer.ok) { held.session = answer.session; this.#refused.delete(held); }
      else this.#refused.set(held, now);
      if (answer.ok) this.#heldScopes.add(membership.scope);
      if (answer.ok) this.#held.add(`${membership.scope} ${membership.genesis}`);
      return answer.ok ? answer.session : null;
    } catch (error) {
      if (!(error instanceof TransportError)) throw error;
      if (this.#sessions.current(held)) this.#refused.set(held, now);
      return null;
    }
  }

  /** Since this process started, it held a session of this membership. */
  held(membership: ScopeRef): boolean { return this.#held.has(`${membership.scope} ${membership.genesis}`); }

  /** This reader held a session for some incarnation of this scope. No token or authority follows from that history. */
  hasHeld(scope: ScopeId): boolean { return this.#heldScopes.has(scope); }

  /** Forget a session, so the next read asks again: after a read that the session was refused for, as after a role change. */
  forget(membership: ScopeId): void { this.#sessions.forget(membership); }

  /** A declared projection requires a session. One refused read is returned
   * as it stands; there is no signed fallback or implicit retry. */
  async projection(membership: ScopeRef, query: ApplicationProjectionQuery, minimum?: ReadMinimum): Promise<ApplicationProjectionRead> {
    const session = await this.session(membership);
    if (!session) return { ok: false, reason: "forbidden" };
    const result = await new ScopeHandle(this.#plain, query.scope.scope, session.reader()).applicationProjection(query, minimum);
    if (!result.ok && (result.reason === "forbidden" || result.reason === "sessions-unavailable")) this.forget(membership.scope);
    return result;
  }

  /** Prove one latest dead ordinary signing absent. Session authentication may sign; no ACT is signed or submitted here. */
  async recoverAbsent(custody: Custody, identity: Identity): Promise<AbsenceRecovery> {
    const who = structuredClone(identity), record = await custody.find(who);
    if (!record || !["prepared", "sent", "unknown"].includes(record.phase)) return { state: "not-needed", record };
    const unproved = (why: AbsenceFailure): AbsenceRecovery => ({ state: "unproved", record, why });
    const binding = record.binding;
    if (!isRecord(binding) || typeof binding["definition"] !== "string" || typeof binding["kind"] !== "string"
      || !isDefinitionName(binding["pinned"]) || (binding["declaration"] !== null && !isDigest(binding["declaration"])))
      return unproved({ kind: "identity" });
    if (record.standalone || record.envelope.creation || !isScopeRef(who.target)) return unproved({ kind: "unsupported" });
    const index = record.signings.length - 1, signing = record.signings[index], intent = record.envelope.signed.intent;
    if (!signing || canonicalize(record.identity) !== canonicalize(who) || who.service !== this.service || who.signer !== this.signer.key
      || intent.actor !== who.signer || intent.idempotencyKey !== who.key || canonicalize(intent.to) !== canonicalize(who.target)
      || signing.intent !== intentDigest(intent) || signing.meaning !== record.meaning || signing.notAfter !== intent.notAfter)
      return unproved({ kind: "identity" });
    if (signing.closed || !custody.dead(signing)) return { state: "not-needed", record };
    const expected: AbsenceSnapshot = { index, attempt: record.attempt, intent: signing.intent, meaning: record.meaning,
      notAfter: signing.notAfter, pinned: record.binding.pinned };
    const expires = timeMs(expected.notAfter);
    if (expires === null) return unproved({ kind: "protocol" });
    const target = who.target;
    let fixed: Head | null = null, found: Folded | null = null, sequence: CheckedSequence | null = null;
    let cursor: string | undefined, next = 0, previous: Digest | null = null, previousTime = -Infinity, headTime = -Infinity;
    try {
      const session = await this.session(who.membership);
      if (!session) return unproved({ kind: "no-session" });
      const handle = new ScopeHandle(this.#plain, target.scope, session.reader());
      for (;;) {
        const page = await handle.log(cursor, fixed === null ? undefined : { at: target, head: fixed });
        if (!page.ok) {
          if (who.membership && (page.reason === "forbidden" || page.reason === "sessions-unavailable")) this.forget(who.membership.scope);
          return unproved({ kind: "read", reason: page.reason });
        }
        if (!isHead(page.at) || canonicalize(page.value.scope) !== canonicalize(target) || page.value.definition !== expected.pinned)
          return unproved({ kind: "identity" });
        if (fixed === null) fixed = { ...page.at };
        if (!page.complete && page.next === undefined) return unproved({ kind: "incomplete" });
        if (page.complete && page.next !== undefined) return unproved({ kind: "protocol" });
        if (page.coverage !== "whole") return unproved({ kind: "filtered" });
        let reached = false;
        for (const row of page.value.entries) {
          const entry: unknown = parseStrict(row.bytes);
          if (!isEntry(entry) || canonicalize(entry) !== row.bytes) return unproved({ kind: "protocol" });
          if (entry.seq !== next || entry.prev !== previous) return unproved({ kind: "chain" });
          if (next === 0) {
            sequence = admitSequenceGenesis(row.bytes, target, utf8(row.bytes).length);
            if (!sequence || entry.input.type !== "genesis" || entry.input.seed.definition !== expected.pinned)
              return unproved({ kind: "chain" });
          }
          const fact = { at: target, seq: row.seq, hash: row.hash };
          if (!sequence || !isEntryOf(entry, fact, sequence)) return unproved({ kind: "chain" });
          if (entry.input.type === "floor") return unproved({ kind: "floor" });
          const time = timeMs(entry.time);
          if (time === null || time < previousTime) return unproved({ kind: "chain" });
          if (entry.input.type === "act" && entry.input.signed.intent.actor === who.signer
            && entry.input.signed.intent.idempotencyKey === who.key) found = { fact, intent: intentDigest(entry.input.signed.intent) };
          previous = row.hash;
          previousTime = time;
          next++;
          if (entry.seq === fixed.seq) {
            if (row.hash !== fixed.hash) return unproved({ kind: "chain" });
            reached = true;
            headTime = time;
            break;
          }
        }
        if (reached) break;
        if (page.complete || page.next === undefined) return unproved({ kind: "incomplete" });
        if (!/^(0|[1-9][0-9]{0,15})$/.test(page.next) || !Number.isSafeInteger(Number(page.next))
          || Number(page.next) !== next || Number(page.next) <= Number(cursor ?? "0")) return unproved({ kind: "nonprogressing" });
        cursor = page.next;
      }
    } catch (error) {
      return unproved({ kind: error instanceof LogProtocolError ? "protocol" : error instanceof TransportError ? "transport" : "protocol" });
    }
    if (found) return { state: "present", record, found };
    if (headTime < expires) return unproved({ kind: "head-before-expiry" });
    // Store and lock failures remain custody failures, outside the read-diagnostic catch.
    const ended = await custody.absentIf(who, expected, fixed!);
    if (!ended.applied || ended.record === null) return { state: "changed", record: ended.record };
    return { state: "absent", record: ended.record, head: fixed! };
  }

  /**
   * One read of one scope: with the session of `membership` first, and by a
   * signed read where there is no session or the session was refused.
   */
  async read<T>(membership: ScopeRef | null, run: (transport: Transport, reader: string | null) => Promise<Read<T>>): Promise<Read<T>>;
  async read(membership: ScopeRef | null, run: (transport: Transport, reader: string | null) => Promise<ItemQueryRead>): Promise<ItemQueryRead>;
  async read<R extends { ok: true } | { ok: false; reason: string }>(membership: ScopeRef | null, run: (transport: Transport, reader: string | null) => Promise<R>): Promise<R>;
  async read<R extends { ok: true } | { ok: false; reason: string }>(membership: ScopeRef | null, run: (transport: Transport, reader: string | null) => Promise<R>): Promise<R> {
    const session = await this.session(membership);
    if (session) {
      const got = await run(this.#plain, session.reader());
      if (got.ok || (got.reason !== "forbidden" && got.reason !== "sessions-unavailable")) return got;
    }
    return run(this.#signed, null);
  }

  /** The reader to present for one membership, or null for signed reads. For a route that is not a contract read, such as the credential route. */
  async reader(membership: ScopeRef | null): Promise<string | null> {
    return (await this.session(membership))?.reader() ?? null;
  }
}
