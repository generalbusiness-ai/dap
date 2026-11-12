/**
 * How the server reads: with a read session it asks membership for, kept in
 * memory, and by signed reads of its key where no session is given or a
 * session is refused (plan 031, section 7, "Where it runs"). A session is
 * asked of each membership the inventory uses, once, and again before a read
 * when it has ended. Nothing here is authority, and no token is written
 * anywhere: `Session` keeps it out of its JSON and text.
 */

import type { ReadMinimum, ItemQueryRead, Read, ScopeId, ScopeRef, ApplicationProjectionQuery, ApplicationProjectionRead } from "@generalbusiness/dap-contract";
import { timeOf } from "@generalbusiness/dap-bytes";
import { TransportError, ScopeHandle, httpTransport, requestSession, signedReads, signerSessionRequest, type Fetch, type Session, type Signer, type Transport } from "@generalbusiness/dap-client";

export interface ReadPort {
  service: string;
  fetch?: Fetch;
  signer: Signer;
  now: () => number;
  sessions?: ReadSessions;
}

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
      const answer = await requestSession(this.#port.service, membership.scope, asked, this.#port.fetch ? { fetch: this.#port.fetch } : {});
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
