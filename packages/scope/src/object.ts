import { offerFloor } from "./floor-writer.ts";
import { applicationRoom, applicationInstallation, applicationProjectionDeclaration } from "@generalbusiness/dap-platform";
/**
 * One scope as one Durable Object (scope contract, section 2.3): the object
 * named by the scope's ID in the one scope namespace, with SQLite storage.
 * This file only wires: the store over the object's storage, the ports, the
 * core, receiving, the dispatcher and the reads. Its public methods are the
 * scope's surface over RPC. It has no HTTP route; `worker.ts` has those.
 *
 * At genesis the scope checks that the digest of its seed equals this
 * object's name. An object that was not reached by a name has none, and
 * can be created as nothing.
 *
 * With a transport, the object dispatches its outbox: after each call that
 * may have committed, without making the caller wait, and from its alarm.
 * With none, as this class is by default, its sends stay in the outbox.
 *
 * The operations driver runs at the same two moments (`operations.ts`), and
 * once more at the first call of the object's life, if an attempt is recorded
 * with no time to look at it next (`#first`). By default nothing is sent outside the service: the outside port of
 * `production()` sends nothing. The owners' rules of `production()` are
 * the capability code's, for the operations of `hold@1` and `git-read@1`.
 *
 * Four things here are no history, and no judgment reads any of them: the
 * read sessions that the object checks, and for a membership scope issues
 * (`sessions.ts`); the streams that it holds open; the serving limits of a
 * join, at the front of a membership scope (`limits.ts`); and the
 * operator's record (`operator.ts`). By default the object has no session
 * configuration: it issues no session, and its readers port is the
 * refusing one of `production()`.
 */

import { demoCreationOffer, type DemoCreationConfig } from "./demo-creation.ts";
import { DurableObject } from "cloudflare:workers";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import type { SessionAnswer } from "@generalbusiness/dap-contract";
import type { Answer, Beside, Bounds, Cursor, DeclaredDefinition, Digest, OutboxId, Entry, Grant, Input, LogPage, OperationId, PlatformDefinition, Read, RetainedInput, ScopeId, Settlement, SignedIntent } from "@generalbusiness/dap-contract";
import { canonicalize, isRecord, digestBytes, isHead, isScopeId, isScopeRef, parseStrict, retainedReadArgument, scopeIdOf, utf8 } from "@generalbusiness/dap-bytes";
import { isEntryOf, timeMs, timeOf, type Item } from "@generalbusiness/dap-derive";
import { sourceName } from "@generalbusiness/dap-platform";
import type { Delivered, StateView } from "@generalbusiness/dap-derive";
import { Scope, ownOf, type Checkpointed, type Created } from "./core.ts";
import { Deliveries } from "./delivery.ts";
import { declaredBy, observedAt, routed, sentText, sourced, sourceOrigin, type Sourced } from "./namespace.ts";
import { JoinLimits, isJoin, type LimitConfig } from "./limits.ts";
import { Operations, type Outside } from "./operations.ts";
import { OperatorRecord, sendAgain, type Incident, type Resent } from "./operator.ts";
import { Dispatcher, Wakes } from "./outbox.ts";
import { ArchiveDriver, type FixtureArchiveDriverOptions, type RoomArchiveDriverOptions } from "./archive-driver.ts";
import { archiveHostItem, type ArchiveHostConfiguration, type ArchiveHostItemAsk } from "./archive-host-item.ts";
import { GenesisProofs, type ProofTimer } from "./genesis-proof.ts";
import { EXACT_PROOF_RECEIVER_BOUNDS, ProofBytes } from "./proof-bytes.ts";
import { PreparationFlights } from "./preparation-flight.ts";
import { ItemQueries } from "./item-queries.ts";
import { ApplicationProjections } from "./applications/projection.ts";
import { APPLICATION_DECLARATION_BYTES, type ApplicationDeclarationSource } from "./applications/projection-source.ts";
import { applicationJson } from "@generalbusiness/dap-bytes/application";
import { ReadPreparation } from "./read-preparation.ts";
import { nativeBirth } from "./native-birth.ts";
import { creationDeclaration } from "./creation-declaration.ts";
import { PreparationBudget } from "./preparation-budget.ts";
import { SessionReferences, type SessionReferenceSource } from "./session-reference.ts";
import { SessionPreparation, type QueryVisibility } from "./session-preparation.ts";
import { SIGNER_INDEX_BOUNDS } from "./local-signers.ts";
import { production, type Alarm, type Authority, type Clock, type Delivery, type Ports, type ReadName, type Readers, type Resolver, type Transport } from "./ports.ts";
import { SessionRequests, Streams, issueSession, type Opened, type Sessions, type StreamRefusal } from "./sessions.ts";
import { READ_BOUNDS, Reads, type ReadBounds, type Summary } from "./reads.ts";
import { Chains, checkLocalSignedRead, checkSignedReadRequest, presentsSignedRead, signerOf, type SignedReading, type SignedReadObserver } from "./signed-reads.ts";
import { LATE, within } from "./turn.ts";
import { SqliteStore, type Sql } from "./sqlite.ts";
import type { OutboxItem, OperationStatus, Sealed } from "./store.ts";
import type { Given, OutsideGiven } from "./given.ts";
export type { Given, OutsideGiven } from "./given.ts";
import { siteDestination, sitePublication, sitePublishedCommit } from "./site/publication.ts";
import { RequestIndex, requestQuery } from "./request-index.ts";
import { background, inOperation, measured, measuredSync, metric, OBSERVED_METHODS, operational, operationContext, operationPlace, type MetricEnvironment, type OperationalIdentity, type ObservedMethod } from "./operational.ts";

/**
 * What a deployment gives a scope in place of a default. `authority`: the
 * authority port, made once for the life of the object, which is one run
 * (authority note, section 3.3). It is made after the store, because a
 * scope reads its membership reference from its own genesis entry (the
 * contract's section 6.6). It is given the clock and the random source of
 * the ports as wired. With it, `ports.authority` is not used.
 *
 * `readers`: the readers port, made the same way, for a port that reads the
 * scope's own record: a read session is checked against the membership
 * reference that the scope records and against the time of its previous
 * entry (authority note, section 3.9). With it, `ports.readers` is not
 * used. `sessions`: the deployment's session configuration, asked at each
 * request for a session. Absent, or null: this object issues none.
 * `outside`: the outside port, made after the store, with live reads of
 * this scope's state, genesis and sealed entries. It is given no storage
 * writes or public RPC methods. With it, `ports.outside` is not used.
 * `limits`: the serving limits of a join, in place of the proposed ones.
 */
export interface Wiring {
  /** Internal deployment index; receives only this object's checked stored genesis. */
  registerGenesis?: (proof: import("./scope-index.ts").ScopeRegistration) => Promise<boolean>;
  ports?: Partial<Ports>; bounds?: Bounds; reads?: ReadBounds;
  authority?: (given: Given) => Authority;
  readers?: (given: Given) => Readers;
  outside?: (given: OutsideGiven) => Outside;
  sessions?: () => Sessions | null;
  sessionReferenceSource?: SessionReferenceSource;
  applicationDeclarationSource?: ApplicationDeclarationSource;
  /** Internal elapsed-time clock; production uses the shared preparation timer. */
  queryTimer?: ProofTimer;
  limits?: LimitConfig;
  /** Optional passive internal diagnostic; deployed wiring leaves it absent. */
  signedReadObserver?: SignedReadObserver;
  /** Fixture milestone only. Absent from all deployed/default wiring. A0b
   * admission, policy ownership and production configuration remain due. */
  fixtureArchive?: Omit<FixtureArchiveDriverOptions, "sql" | "current" | "clock" | "bounds">;
  /** Explicit trusted host admission; absent on the generic deployment. */
  archiveHost?: ArchiveHostConfiguration;
  archive?: (given: OutsideGiven, sql: Sql, bounds: Bounds) => Omit<RoomArchiveDriverOptions, "sql" | "current" | "clock" | "bounds"> | null;
}

export class ScopeObject<Env = unknown> extends DurableObject<Env> {
  readonly #archive: ArchiveDriver | null;
  readonly #floorOffer: (() => import("@generalbusiness/dap-contract").FloorInput | null) | null;
  readonly #archiveItem: (ask: ArchiveHostItemAsk) => import("./item-queries.ts").NativeItemQuery;
  readonly #name: ScopeId | null;
  readonly #store: SqliteStore;
  readonly #registerGenesis: Wiring["registerGenesis"];
  readonly #registrationBytes: number;
  readonly #readSql: Pick<Sql, "exec">;
  readonly #queryFlights: PreparationFlights;
  readonly #itemQueries: ItemQueries;
  readonly #applicationProjections: ApplicationProjections;
  readonly #proofBytes: ProofBytes;
  readonly #genesisProofs: GenesisProofs;
  readonly #readPreparation: ReadPreparation;
  readonly #sessionReferences: SessionReferences;
  readonly #sessionPreparation: SessionPreparation;
  readonly #scope: Scope;
  readonly #reads: Reads;
  readonly #deliveries: Deliveries;
  readonly #dispatcher: Dispatcher | null;
  readonly #operations: Operations;
  readonly #wakes: Wakes;
  readonly #clock: Clock;
  readonly #transport: Transport | null;
  readonly #seconds: number;
  readonly #fetchSeconds: number;
  readonly #resolver: Resolver;
  readonly #record: OperatorRecord;
  readonly #streams: Streams;
  readonly #limits: JoinLimits;
  readonly #sessions: () => Sessions | null;
  readonly #requests: SessionRequests;
  readonly #requestIndex: RequestIndex;
  /** The roots of this scope's cause chains, each found once (`signed-reads.ts`). */
  readonly #chains: Chains;
  readonly #signed: SignedReading;
  readonly #outside: Outside;
  readonly #readers: Readers;
  /** True until this object's first turn: its first call or its alarm (`#first`). In memory, so a restart sets it again. */
  #fresh = true;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    const name = ctx.id.name;
    const wiring = this.wiring(name);
    this.#registerGenesis = wiring.registerGenesis;
    const bounds = wiring.bounds ?? PROPOSED_BOUNDS;
    this.#registrationBytes = bounds.entryBytes;
    // Authority note, section 5.4, rule 7: the attempts of one operation are spaced by a backoff, to a cap. The first is due at its
    // entry's time. The texts state no numbers for it: the delays are the dispatcher's (I3 deltas, entry EB8).
    const spacing = (attempt: number) => (attempt < 2 ? 0 : Math.min(bounds.dispatchRetrySeconds * 2 ** Math.min(attempt - 2, 30), bounds.dispatchRetryMaxSeconds) * 1000);
    this.#readSql = { exec: (query, ...bindings) => ctx.storage.sql.exec(query, ...bindings) };
    this.#queryFlights = new PreparationFlights(wiring.queryTimer);
    const store = new SqliteStore({
      ...this.#readSql,
      transaction: (closure) => ctx.storage.transactionSync(closure),
    }, spacing);
    // This object's one alarm. Its handler below starts the alarm's turn and a dispatch pass.
    const alarm: Alarm = { set: (at) => (at === null ? ctx.storage.deleteAlarm() : ctx.storage.setAlarm(timeMs(at)!)) };
    const given: Ports = { ...production(), alarm, ...wiring.ports };
    // The one alarm serves the earliest deadline, the next attempt of an outside operation and, with a transport, the next dispatch.
    const wakes = new Wakes(store, given.alarm, given.transport !== null, wiring.fixtureArchive || wiring.archive ? () => this.#archive?.wake() ?? null : undefined);
    this.#wakes = wakes;
    // The authority of a deployed scope reads this scope's own genesis entry, for the membership scope that it records.
    const genesis = (): Extract<Input, { type: "genesis" }> | null => {
      const kept = store.stored(0);
      const input = kept ? (JSON.parse(kept.bytes) as Entry).input : null;
      return input?.type === "genesis" ? input : null;
    };
    // A directory records its membership reference in an item, so the authority is also given the folded state (authority note, section 3.3).
    const made: Given = { clock: given.clock, random: given.random, genesis, state: store, scope: () => store.scope() };
    const authority = wiring.authority?.(made);
    const readers = wiring.readers?.(made);
    // The outside port reads the current record when it sends, outside any commit. A facade gives it only state reads, not the store.
    const outsideState: StateView = {
      scope: () => store.scope(), keyCounts: () => store.keyCounts(), item: (...args) => store.item(...args), count: (...args) => store.count(...args), page: (...args) => store.page(...args),
      relation: (...args) => store.relation(...args), copies: (...args) => store.copies(...args), accepted: (...args) => store.accepted(...args),
      request: (...args) => store.request(...args), pendingRequests: () => store.pendingRequests(), decided: (...args) => store.decided(...args), creation: (...args) => store.creation(...args),
      sourceOrder: (...args) => store.sourceOrder(...args),
      operation: (...args) => store.operation(...args), texts: (...args) => store.texts(...args), prepared: (...args) => store.prepared(...args),
      preparations: (...args) => store.preparations(...args), record: (...args) => store.record(...args), records: (...args) => store.records(...args),
      recordCount: (...args) => store.recordCount(...args), observed: (...args) => store.observed(...args), incarnations: (...args) => store.incarnations(...args),
      outstanding: () => store.outstanding(), holder: (...args) => store.holder(...args), holders: () => store.holders(), itemDuties: (...args) => store.itemDuties(...args), holderSettled: (...args) => store.holderSettled(...args),
      operationsFor: (...args) => store.operationsFor(...args), account: (...args) => store.account(...args), accountsOf: (...args) => store.accountsOf(...args),
      lookup: (...args) => store.lookup(...args), all: () => store.all(),
    };
    const outsideGiven: OutsideGiven = {
      ...made, state: outsideState,
      retained: (...args) => store.retained(...args),
      own: (seq) => {
        const kept = Number.isSafeInteger(seq) && seq >= 0 ? store.stored(seq) : null;
        return kept ? { entry: JSON.parse(kept.bytes) as Entry, hash: kept.hash } : null;
      },
    };
    const outside = wiring.outside?.(outsideGiven);
    const ports: Ports = { ...given, alarm: wakes.deadline, ...(authority ? { authority } : {}), ...(readers ? { readers } : {}), ...(outside ? { outside } : {}) };
    // The operator's record: two tables of this object's storage that are no part of the store, and that no judgment is given.
    const record = new OperatorRecord({ exec: (query, ...bindings) => ctx.storage.sql.exec(query, ...bindings) }, ports.clock, () => store.scope()?.at ?? null);
    this.#name = isScopeId(name) ? name : null;
    this.#store = store;
    this.#proofBytes = new ProofBytes(this.#readSql);
    this.#genesisProofs = new GenesisProofs(this.#proofBytes, ports.proofs ?? null);
    this.#scope = new Scope(this.#name, store, ports, bounds);
    this.#archiveItem = ask => archiveHostItem(this.#readSql, outsideGiven, this.#scope.pinned(), wiring.archiveHost ?? null, ask);
    // A signed read is judged on this scope's clock, within the authority window of an intent (`signed-reads.ts`).
    // An entry that an entry of a cause chain names: one of this scope's own, one it retains, or one read from its own scope.
    this.#chains = new Chains(store, async (use) => {
      const own = use.fact.at.scope === this.#name ? store.stored(use.fact.seq) : null;
      const kept = own ?? store.retained("entry", use.content);
      const local = kept ? (JSON.parse(kept.bytes) as Entry) : null;
      if (local && isEntryOf(local, use.fact)) return local;
      const read = await within(() => ports.resolver.read(use.fact, bounds.fetchSeconds), bounds.fetchSeconds);
      return read !== LATE && read !== null && "entry" in read && isEntryOf(read.entry, use.fact) ? read.entry : null;
    });
    this.#signed = { clock: ports.clock, window: bounds.intentLifetimeSeconds, chains: this.#chains, ...(wiring.signedReadObserver ? { observe: wiring.signedReadObserver } : {}) };
    this.#readers = ports.readers;
    this.#requestIndex = new RequestIndex(this.#readSql);
    this.#reads = new Reads(store, () => this.#scope.pinned(), ports.readers, wiring.reads ?? READ_BOUNDS, record, this.#signed, () => this.#scope.owners(), { index: this.#requestIndex, now: () => Date.now() });
    this.#deliveries = new Deliveries(this.#name, this.#scope, store, ports, bounds);
    this.#dispatcher = given.transport ? new Dispatcher(this.#scope, store, { transport: given.transport, clock: ports.clock, capabilities: ports.capabilities }, wakes, bounds) : null;
    this.#operations = new Operations(this.#scope, store, ports, wakes, bounds, (operation, attempt, seq) => { record.record("outcome-conflict", [{ operation, attempt }, { entry: seq }]); });
    this.#clock = ports.clock;
    this.#outside = ports.outside;
    this.#transport = given.transport;
    this.#seconds = bounds.dispatchSeconds;
    this.#fetchSeconds = bounds.fetchSeconds;
    this.#resolver = ports.resolver;
    this.#record = record;
    this.#streams = new Streams(ports.readers, () => store.scope()?.head ?? null);
    const archiveSql: Sql = { ...this.#readSql, transaction: closure => ctx.storage.transactionSync(closure) };
    if (wiring.fixtureArchive && wiring.archive) throw new Error("archive wiring must have one owner");
    const archive = wiring.archive?.(outsideGiven, archiveSql, bounds) ?? wiring.fixtureArchive;
    this.#archive = archive ? new ArchiveDriver({
      ...archive, sql: archiveSql,
      current: () => store.scope(), clock: () => ports.clock.read(), bounds,
    }) : null;
    const floorEnabled = wiring.fixtureArchive && [...wiring.fixtureArchive.policies.registry.values()].some(policy => policy.floor !== undefined);
    this.#floorOffer = floorEnabled ? () => {
      const pinned = this.#scope.pinned(), pin = pinned?.named, policy = pin ? wiring.fixtureArchive!.policies.registry.get(pin)?.floor : null;
      return policy && pinned?.definition ? offerFloor({ sql: { ...this.#readSql, transaction: closure => ctx.storage.transactionSync(closure) }, store,
        own: ownOf(store), definition: pinned.definition, platform: pinned.platform ?? undefined, bounds, now: () => ports.clock.read(), discoveries: () => this.#chains.discoveries() }, policy) : null;
    } : null;
    // Every commit that seals an entry is followed at once, whoever asked for its turn: a pass in the background and a late answer
    // of an outside operation write their entries in no caller's request, and nothing guarantees an alarm after the last of them.
    this.#scope.turns.measureWith(() => this.#context("dispatch"));
    this.#scope.turns.onSealed(() => {
      this.#operations.committed();
      if (this.#archive) {
        this.#archive.committed();
        try { this.ctx.waitUntil(Promise.resolve(wakes.set()).catch(() => undefined)); }
        catch { /* Archive scheduling cannot refuse a sealed native entry. */ }
      }
      this.#followed();
    });
    this.#limits = new JoinLimits(wiring.limits);
    this.#sessions = wiring.sessions ?? (() => null);
    // One bounded immutable-content cache per object. These callbacks are
    // the existing pure whole-support validators, never pinned()/genesis.
    this.#readPreparation = new ReadPreparation(this.#readSql, {
      policy: () => `native-read-support-v1:${digestBytes(utf8(canonicalize(bounds)))}`,
      declared: bytes => this.#scope.validate(bytes), platform: named => this.#scope.platform(named),
    });
    this.#sessionReferences = new SessionReferences(this.#readPreparation, this.#sessions, this.#clock);
    this.#sessionPreparation = new SessionPreparation(this.#readPreparation, this.#sessions, this.#clock, wiring.sessionReferenceSource ?? null);
    this.#itemQueries = new ItemQueries({ name: this.#name, sql: this.#readSql, preparation: this.#readPreparation,
      sessionPreparation: this.#sessionPreparation, localSigners: store.localSigners, proofs: ports.proofs ?? null,
      sessions: this.#sessions, clock: this.#clock, window: bounds.intentLifetimeSeconds, flights: this.#queryFlights });
    this.#applicationProjections = new ApplicationProjections({ name: this.#name, sql: this.#readSql, sessions: this.#sessions,
      clock: this.#clock, sessionPreparation: this.#sessionPreparation, flights: this.#queryFlights, source: wiring.applicationDeclarationSource ?? null, births: ports.births ?? null });
    // The session requests that this scope has answered, each until its `notAfter`: one more table that is no part of the store.
    this.#requests = new SessionRequests({ exec: (query, ...bindings) => ctx.storage.sql.exec(query, ...bindings) });
    // Only bounded control initialization happened above. No read runs a
    // migration quantum; an activated legacy object schedules its owner.
    const pending = store.localSigners.pending(), maintenance = store.signerMaintenance();
    if (pending || maintenance !== null) {
      // Preserve a durable earlier wake across repeated activation.
      ctx.waitUntil(Promise.resolve(wakes.maintenance.set(pending ? maintenance ?? this.#maintenanceAt() : null)));
    }
    // A running room may bind after its quiet scopes' last commit. Its busy
    // child's checked target route activates Directory; its own charged full
    // discovery activates the quiet Rules sibling. Schedule the existing
    // prefix without awaiting host I/O or appending an
    // entry. Generic/fixture deployments retain their old activation behavior.
    if (archive && "production" in archive) {
      const existing = store.scope(), birth = genesis();
      if (existing?.status === "active" && birth?.decision === "applied" && archive.admit(existing.at, birth.seed)) {
        this.#archive?.committed();
        try { ctx.waitUntil(Promise.resolve(wakes.set()).catch(() => undefined)); }
        catch { /* Archive scheduling cannot refuse an existing native scope. */ }
      }
    }
  }

  /**
   * The ports, bounds and read bounds of the scope with this name. This
   * class gives every default: the production ports of `ports.ts`, with this
   * object's alarm, and the contract's proposed bounds. It is called once,
   * while the object is constructed.
   */
  protected wiring(_name: string | undefined): Wiring { return {}; }
  /** Internal metadata probe. No public route, reader, native turn or head. */
  readiness(): "ready" | "absent" | "not-ready" | "unavailable" {
    try {
      const scope = this.#store.scope();
      if (!scope) return "absent";
      if (!isScopeRef(scope.at) || scope.at.scope !== this.#name || !isHead(scope.head) || !["provisional", "active", "refused"].includes(scope.status)) return "unavailable";
      return scope.at.kind === "register" && scope.status === "active" ? "ready" : "not-ready";
    } catch { return "unavailable"; }
  }
  /** Optional operational binding; it is never a native authority port. */
  protected metricEnvironment(): MetricEnvironment { return this.env as MetricEnvironment; }

  /**
   * After a call that may have committed: a dispatch pass that the caller
   * does not wait for. The commit set the alarm for the same sends, so a
   * pass that is cut short loses nothing. A pass that fails is left to the
   * alarm. An entry that either pass writes is followed when it is
   * committed (`Turns.onSealed`), and not from here.
   */
  #sent<A>(answer: A): A {
    this.#fresh = false;
    this.#followed();
    if (this.#dispatcher) this.ctx.waitUntil(background("dispatch", () => this.#dispatcher!.run()).catch(() => 0));
    this.ctx.waitUntil(background("dispatch", () => this.#operations.run()).catch(() => 0));
    return answer;
  }

  /**
   * The first turn of this object's life, when that turn runs no pass of its own: one pass of the operations driver, which the
   * caller does not wait for, if an attempt is recorded and has no time to be looked at next (`Store.parked`). Such an attempt
   * asks for no wake-up (`operations.ts`, rule 7), so without this pass it waits for the next commit. So a deployment whose outside
   * port changed, as when the Git host's settings are added, and which is restarted, sends what it recorded and did not send, at
   * the first call that reaches the object. Later calls also retry an unsent attempt when the configured outside port
   * accepts it again. The pass sends nothing twice: an attempt marked sent is never sent again.
   */
  #first(): void {
    if (!this.#fresh) {
      if (this.#operations.reaccepted()) this.ctx.waitUntil(background("dispatch", () => this.#invoke("dispatch", () => this.#operations.run())).catch(() => 0));
      return;
    }
    this.#fresh = false;
    if (this.#store.parked(null, 1).length > 0) this.ctx.waitUntil(background("dispatch", () => this.#invoke("dispatch", () => this.#operations.run())).catch(() => 0));
  }

  /**
   * What is no history follows the commits: the operator's record reads the entries that are new, from its own mark, and each open stream
   * is sent the head. Neither can change an answer: a failure of either is dropped here. It runs after every commit that seals an entry
   * (`Turns.onSealed`), so a stream that waits is sent the head of an entry that a pass in the background or a late answer wrote, with
   * no further call and no alarm. It also runs after each call and each alarm, which costs nothing when the head has not moved: a stream
   * is sent a head once, and the record reads from its mark. A stream's own rules are unchanged (`sessions.ts`, `Streams`): the session
   * is checked before every send, a reader that went away is sent nothing, one line waits unread at most, and the line is the latest head.
   */
  #followed(): void {
    try {
      this.#record.follow(this.#store);
      this.#streams.publish();
    } catch { /* a notice or a stream line was lost, and no fact */ }
  }

  #context(place: string, identity: OperationalIdentity = { request: null, trace: null }) {
    const context = operationContext(this.metricEnvironment(), this.#name, place, identity, {
      recordEntry: seq => context.identity.request === null || this.#requestIndex.record(context.identity.request, context.identity.trace, Date.now(), seq, null),
      recordOutbox: outboxId => context.identity.request === null || this.#requestIndex.record(context.identity.request, context.identity.trace, Date.now(), null, outboxId),
    });
    return context;
  }
  #invoke<A>(place: string, work: () => Promise<A>, identity?: OperationalIdentity): Promise<A> {
    const parent = operational();
    if (parent) return parent.place === place ? work() : inOperation({ ...parent, place, turn: { entered: false, known: true }, httpPublic: false }, work);
    return measured(this.#context(place, identity), work);
  }
  #invokeSync<A>(place: string, work: () => A): A {
    const parent = operational();
    if (parent) return parent.place === place ? work() : inOperation({ ...parent, place, turn: { entered: false, known: true }, httpPublic: false }, work);
    return measuredSync(this.#context(place), work);
  }
  #publicInvoke<A>(place: "create" | "acts" | "preparations", work: () => Promise<A>): Promise<A> {
    return operational() ? work() : this.#invoke(`rpc:${place}`, work);
  }
  /** The native answer travels untouched beside one operational turn flag. */
  async observed(method: ObservedMethod, args: unknown[], identity: OperationalIdentity, httpPublic = false): Promise<{ value: unknown; turn: boolean }> {
    if (!(OBSERVED_METHODS as readonly string[]).includes(method) || !Array.isArray(args) || args.length > 5) throw Error("Unknown operational route");
    const base = operationPlace(method), isPublic = ["create", "submit", "prepare"].includes(method);
    const context = this.#context(isPublic && httpPublic !== true ? `rpc:${base}` : base, identity);
    const call = this[method] as (...args: unknown[]) => unknown;
    const value = await measured(context, async () => call.apply(this, args));
    return { value, turn: context.turn.entered };
  }

  /** No caller bytes or mutable summary establish index membership. */
  async registerKnown(): Promise<boolean> {
    // Temporary fixed-category observation. Never log native values or errors.
    let phase: "configuration" | "entry-missing" | "entry-size" | "scope" | "entry" | "entry-parse" | "entry-integrity"
      | "genesis-prev" | "genesis-type" | "genesis-decision" | "seed-address" | "incarnation" | "kind" | "index-register" = "configuration";
    const observe = (outcome: "refused" | "error"): void => {
      try { console.info("scope-index-registration", { phase, outcome }); }
      catch { /* Observation cannot change registration. */ }
    };
    const refused = (): false => { observe("refused"); return false; };
    if (!this.#registerGenesis || !this.#name) return refused();
    try {
      phase = "entry-size";
      const entryBytes = this.#store.storedBytes(0);
      if ((entryBytes ?? Infinity) > this.#registrationBytes) {
        if (entryBytes === null || entryBytes === undefined) phase = "entry-missing";
        return refused();
      }
      phase = "scope";
      const scope = this.#store.scope();
      phase = "entry";
      const stored = this.#store.stored(0);
      if (!scope || scope.status === "refused" || scope.at.scope !== this.#name) { phase = "scope"; return refused(); }
      if (!stored) return refused();
      phase = "entry-parse";
      const entry = parseStrict(stored.bytes) as Entry;
      const fact = { at: scope.at, seq: 0, hash: stored.hash };
      phase = "entry-integrity";
      if (!isEntryOf(entry, fact)) return refused();
      phase = "genesis-prev";
      if (entry.prev !== null) return refused();
      phase = "genesis-type";
      if (entry.input.type !== "genesis") return refused();
      phase = "genesis-decision";
      if (entry.input.decision !== "applied") return refused();
      phase = "seed-address";
      if (scopeIdOf(entry.input.seed) !== this.#name) return refused();
      phase = "incarnation";
      if (entry.input.inc !== scope.at.inc) return refused();
      phase = "kind";
      if (entry.input.seed.kind !== scope.at.kind) return refused();
      phase = "index-register";
      const registered = await this.#registerGenesis({ at: scope.at, genesis: stored.hash });
      if (registered !== true) observe("refused");
      return registered;
    } catch { observe("error"); return false; }
  }

  async create(creation: SignedIntent, definition: DeclaredDefinition | Digest | PlatformDefinition, definitions: readonly DeclaredDefinition[] = [], beside: Beside = {}): Promise<Created> {
    return this.#publicInvoke("create", async () => {
      const answer = await this.#scope.create(creation, definition, definitions, beside);
      await this.registerKnown(); // after the native commit; failure never changes its answer
      return this.#sent(answer);
    });
  }
  /**
   * `address`: the caller's address as the Worker's route had it, or null. Only the serving limits of a join read it (`limits.ts`):
   * at a membership scope a join is served through them, and no other act and no other scope is.
   */
  async submit(signed: SignedIntent, grants: readonly Grant[], beside: Beside = {}, address: unknown = null): Promise<Answer> {
    return this.#publicInvoke("acts", async () => {
    const scope = this.#store.scope();
    const judged = () => this.#scope.submit(signed, grants, beside);
    if (scope?.at.kind !== "membership" || !isJoin(signed)) return this.#sent(await judged());
    return this.#sent(await this.#limits.serve({ address: typeof address === "string" ? address : null, now: timeMs(this.#clock.read()) ?? 0, head: scope.head, invitationProof: () => ["platform:membership@6", "platform:membership@7", "platform:membership@8"].includes(this.#scope.pinned()?.named ?? "") }, signed, judged));
    });
  }
  /** One step of a capability, asked for with the signed intent that it prepares for (section 5.5). */
  async prepare(signed: SignedIntent, grants: readonly Grant[], capability: string, step: string): Promise<Answer> { return this.#publicInvoke("preparations", async () => this.#sent(await this.#scope.prepare(signed, grants, capability, step))); }
  settle(signed: SignedIntent): Settlement { this.#first(); return this.#scope.settle(signed); }
  checkpoint(): Promise<Checkpointed> { return this.#invoke("dispatch", () => { this.#first(); return this.#scope.checkpoint(); }); }

  /**
   * One delivery from another scope (section 7.4). The resolver of this
   * name answers first, from the scope's record alone: a refusal there
   * reached no judgment and recorded nothing.
   */
  async deliver(envelope: Delivered, identity?: OperationalIdentity): Promise<Delivery> {
    return this.#invoke("dispatch", async () => {
    const refusal = routed(this.#name, this.#store.scope(), envelope);
    if (refusal) return { answer: "routing", reason: refusal };
    const answer = await this.#deliveries.deliver(envelope);
    if (!isScopeRef(envelope.to)) await this.registerKnown();
    return this.#sent(answer);
    }, identity);
  }
  /** One entry of this scope, for a scope that received a send of it and checks its source (section 7.4). */
  async source(seq: number, origin = false): Promise<Sourced | null> {
    this.#first();
    const pinned = this.#scope.pinned();
    if (!pinned) return null;
    let proof = sourceOrigin(this.#store, pinned);
    const name = pinned.definition?.declared.name;
    // A retained historical name is not authority. Authenticate the creator
    // through its current native pin before exposing a reserved lane identity.
    const creatorInput = proof[1]?.entry.input;
    const application = origin && proof[0]?.entry.input.type === "genesis" && (creatorInput?.type === "act" && creatorInput.signed.intent.kind === "establish-application"
      || creatorInput?.type === "delivery" && creatorInput.message.class === "request" && creatorInput.message.type === "tell"
        && isRecord(creatorInput.message.body) && creatorInput.message.body["message"] === "application-create");
    if (name !== undefined && (sourceName(pinned.named, name) === null || application) && proof[1]) {
      const creator = proof[1];
      if (creator.fact.at.scope === this.#name) return null;
      try {
        const read = await within(() => this.#resolver.read(creator.fact, this.#fetchSeconds, true), this.#fetchSeconds);
        if (read === LATE || read === null || !("entry" in read) || !isEntryOf(read.entry, creator.fact)) return null;
        proof = [proof[0]!, { ...creator, under: read.under }];
        if (read.under === "issue" || application) {
          const parent = read.origin?.find(copy => copy.fact.seq === 0 && canonicalize(copy.fact.at) === canonicalize(creator.fact.at));
          if (!parent || !isEntryOf(parent.entry, parent.fact) || parent.entry.input.type !== "genesis") return null;
          proof = [...proof, { ...parent, under: read.under }];
        }
      } catch { return null; }
    }
    return sourced(this.#store, pinned, seq, origin, proof);
  }
  /** Native query preparation only. The caller supplies fresh validated request checks; no HTTP route invokes this. */
  protected genesisEligibility(request: () => { key: import("@generalbusiness/dap-contract").KeyId; since: number } | null) {
    return this.#genesisProofs.eligible(request);
  }
  /** One owned bounded query; starts no activation turn or legacy read walk. */
  queryItems(encoded: unknown, reader: unknown) { return this.#itemQueries.read(encoded, reader); }
  /** Namespace-only host capability; intentionally absent from HTTP routing. */
  archiveItem(ask: ArchiveHostItemAsk) { return this.#archiveItem(ask); }
  applicationProjection(encoded: unknown, reader: unknown) { return this.#applicationProjections.read(encoded, reader); }
  /** Admission of identifiers precedes authority and storage work. */
  async requests(reader: unknown, request?: string, trace?: string, cursor?: string) {
    const query = requestQuery(request, trace, cursor);
    if (!query) return { ok: false, reason: "not-found" } as const;
    await this.#readers.prepare?.(reader, "requests");
    return this.#reads.requests(reader, query);
  }
  /** Exact internal causal-proof bytes. Read-only: deliberately bypasses #first/sourceOrigin. */
  proofSource(fact: unknown, maxBytes: number, milliseconds?: number) {
    if (milliseconds === undefined) return this.#proofBytes.exact(fact, maxBytes);
    const began = this.#queryFlights.clock.now(), ends = began + milliseconds;
    if (!Number.isSafeInteger(milliseconds) || milliseconds <= 0 || milliseconds > EXACT_PROOF_RECEIVER_BOUNDS.milliseconds || !Number.isFinite(began) || !Number.isFinite(ends)) return null;
    const active = () => { const now = this.#queryFlights.clock.now(); return now >= began && now < ends; };
    let calls = 0;
    const bytes = new ProofBytes(this.#readSql, () => {
      if (!active() || ++calls > EXACT_PROOF_RECEIVER_BOUNDS.sqlCalls) throw new Error("proof-unavailable");
    });
    const result = bytes.exact(fact, maxBytes);
    return active() ? result : null;
  }
  /** Closed raw birth view, without activation, source identity or authority. */
  nativeBirth(at: unknown, milliseconds: number, maxBytes?: number) {
    const began = this.#queryFlights.clock.now(), ends = began + milliseconds;
    if (!Number.isSafeInteger(milliseconds) || milliseconds <= 0 || milliseconds > EXACT_PROOF_RECEIVER_BOUNDS.milliseconds || !Number.isFinite(began) || !Number.isFinite(ends)) return null;
    const active = () => { const now = this.#queryFlights.clock.now(); return now >= began && now < ends; };
    const result = nativeBirth(this.#readPreparation, at, new PreparationBudget(undefined, active), maxBytes);
    return active() ? result : null;
  }
  /** Immutable bounded custody only. No #first, turn, driver or authority. */
  creationDeclaration(at: unknown, digest: unknown, maxBytes: number, milliseconds: number): string | null {
    const began = this.#queryFlights.clock.now(), ends = began + milliseconds;
    if (!Number.isSafeInteger(milliseconds) || milliseconds <= 0 || milliseconds > EXACT_PROOF_RECEIVER_BOUNDS.milliseconds || !Number.isFinite(began) || !Number.isFinite(ends)) return null;
    const active = () => { const now = this.#queryFlights.clock.now(); return now >= began && now < ends; };
    try { return creationDeclaration(this.#store, this.#scope.pinned(), at, digest, maxBytes, active); }
    catch { return null; }
  }
  /** Authenticated small directory witness. No HTTP route or activation turn. */
  sessionReference(request: unknown): string | null { return this.#sessionReferences.read(request); }
  /** Future bounded query support only; existing public reads are unchanged. */
  protected sessionEligibility(reader: unknown, visibility: QueryVisibility): Promise<boolean> { return this.#sessionPreparation.eligible(reader, visibility); }
  /** Site reads publication selection and immutable proof; unlike ordinary reads these start no outside work. */
  demoCreationOffer(config: DemoCreationConfig) { return demoCreationOffer(this.#store, this.#scope.pinned()?.named, config); }
  siteDestination() { return siteDestination(this.#store, this.#scope.pinned()?.named); }
  siteRoom() {
    if ((this.#store.storedBytes(0) ?? 0) > 1024 * 1024 || (this.#store.scopeBytes() ?? 0) > 1024 * 1024) throw new Error("publication-history-limit");
    return sourced(this.#store, this.#scope.pinned(), 0);
  }
  sitePublication(directory: unknown, repository: unknown) { return sitePublication(this.#store, this.#scope.pinned()?.named, directory, repository); }
  sitePublishedCommit(directory: unknown, repository: unknown, commit: unknown) { return sitePublishedCommit(this.#store, this.#scope.pinned()?.named, directory, repository, commit); }
  /** The bytes of one declaration this scope retains, for a child that is about to write its genesis (sections 7.2 and 9.2). */
  /** Native, read-only routing metadata; no public scope-data bypass. */
  applicationRoom() {
    this.#first(); const pinned = this.#scope.pinned();
    return pinned?.definition ? applicationRoom(this.#store, pinned.named) : null;
  }
  applicationRoomBytes(): string | null {
    const room = this.applicationRoom();
    return room === null ? null : applicationJson(room, 1024);
  }
  applicationInstallation(directory: import("@generalbusiness/dap-contract").ScopeRef, item: number) {
    this.#first(); const pinned = this.#scope.pinned();
    return pinned?.definition ? applicationInstallation(this.#store, pinned.named, directory, item) : null;
  }
  applicationProjectionDeclaration(directory: import("@generalbusiness/dap-contract").ScopeRef, item: number, name: string) {
    this.#first(); const pinned = this.#scope.pinned();
    if (!pinned?.definition) return null;
    return applicationProjectionDeclaration(this.#store, pinned.named, directory, item, name, (domain, digest, most) => {
      const size = this.#store.retainedSize("value", digest, domain);
      if (size === null || !Number.isSafeInteger(size) || size < 0 || size > most) return undefined;
      const retained = this.#store.retained("value", digest, domain);
      if (!retained || utf8(retained.bytes).length !== size) return undefined;
      try { return parseStrict(retained.bytes); } catch { return undefined; }
    });
  }
  applicationProjectionDeclarationBytes(directory: import("@generalbusiness/dap-contract").ScopeRef, item: number, name: string): string | null {
    const declared = this.applicationProjectionDeclaration(directory, item, name);
    return declared === null ? null : applicationJson(declared, APPLICATION_DECLARATION_BYTES);
  }
  declared(digest: Digest): string | null { this.#first(); return declaredBy(this.#store, digest, this.#scope.pinned()?.named); }
  /** A detached text that a send of this scope's entry at `seq` names, for the scope that received that send (section 6.2). */
  text(seq: number, digest: Digest): string | null { this.#first(); return sentText(this.#store, seq, digest); }

  /**
   * The standing of one key or of one member, for a scope of this repository that reads it before its turn (authority note,
   * section 3.3). Only a membership scope that is active answers. Nothing is written, and no caller is named or checked.
   */
  observe(asked: unknown): unknown { this.#first(); return observedAt(this.#store, this.#scope.pinned(), asked); }

  /**
   * A read session, for a device that asks with a signed request (authority note, section 3.9). Only an active membership scope
   * answers one, from its head and its own clock. It is an answer and no entry: nothing is written.
   */
  session(asked: unknown): SessionAnswer { return this.#invokeSync("sessions", () => {
    this.#first();
    const answer = issueSession({ sessions: this.#sessions(), clock: this.#clock, requests: this.#requests }, this.#store, this.#scope.pinned(), asked);
    metric({ kind: "session", place: "sessions", end: answer.ok ? "issued" : "refused", reason: answer.ok ? "none" : answer.reason });
    return answer;
  }); }
  /** A stream of this scope's head, for a read session that may read the summary; or why none is opened (`sessions.ts`, `Streams`). */
  async stream(reader: unknown): Promise<Opened | StreamRefusal> { return this.#invoke("stream", async () => {
    this.#first(); await this.#prepared(reader, "summary"); const answer = this.#streams.open(reader);
    const streams = this.#streams.counts();
    metric({ kind: "stream", place: "stream", end: "ok", a: streams.open, b: streams.released });
    return answer;
  }); }
  /** The reader of the stream with that ID went away. Its subscription is released at once. */
  release(id: unknown): void { this.#invokeSync("stream", () => {
    this.#streams.release(id); const streams = this.#streams.counts();
    metric({ kind: "stream", place: "stream", end: "ok", a: streams.open, b: streams.released });
  }); }
  /** The streams open now and the subscriptions released in this run, and the windows and waiting joins of the serving limits. Counts only. */
  serving(): { streams: { open: number; released: number }; limits: { windows: number; waiting: number } } { return this.#invokeSync("stream", () => {
    const streams = this.#streams.counts();
    metric({ kind: "stream", place: "stream", end: "ok", a: streams.open, b: streams.released });
    return { streams, limits: this.#limits.counts() };
  }); }
  /**
   * The operator's instruction to send one waiting request again, by its outbox ID (authority note, section 12, G17; `operator.ts`).
   * It has no route: who an operator is, and how one is authenticated, is the installation design's. It is reached over the
   * namespace binding, as `dispatch` is.
   */
  resend(outboxId: unknown): Promise<Resent> { return this.#invoke("dispatch", () => { this.#first(); return sendAgain(this.#store, this.#transport, this.#clock, this.#record, outboxId, this.#seconds); }); }

  /** A dispatch pass now, or the one in flight. Resolves when it ends, with the number of dispatches and diagnoses it made. */
  dispatch(): Promise<number> { return this.#invoke("dispatch", () => { this.#first(); return this.#dispatcher ? this.#dispatcher.run() : Promise.resolve(0); }); }
  /** A pass of the operations driver now, or the one in flight. Resolves when it ends, with the number of requests it sent and outcomes it offered. */
  effect(): Promise<number> { return this.#invoke("dispatch", () => { this.#fresh = false; return this.#operations.run(); }); }
  #maintenanceAt() {
    let now = Date.now();
    try { now = Math.max(now, timeMs(this.#clock.read()) ?? now); } catch { /* scheduler retry grants no authority */ }
    return timeOf(now + SIGNER_INDEX_BOUNDS.retryMs);
  }
  /** The alarm: a turn with no waiting input, at the earliest deadline (section 5.2), then a dispatch pass, then a pass of the operations driver. */
  override async alarm(): Promise<void> {
    return this.#invoke("alarm", async () => {
    this.#fresh = false;
    try {
      // One synchronous bounded quantum gets a turn before potentially
      // asynchronous native owners. A backlog never drains in one alarm.
      try { this.#store.localSigners.maintain(); }
      catch { /* A storage retry must not prevent the other native owners. */ }
      try { await this.#wakes.maintenance.set(this.#store.localSigners.pending() ? this.#maintenanceAt() : null); }
      catch { /* The final arbitration retries without hiding native work. */ }
      await this.#scope.alarm();
      await this.dispatch();
      await this.effect();
      await this.#archive?.run();
      if (this.#floorOffer) {
        await this.#chains.update();
        await this.#scope.floor(this.#floorOffer);
      }
      this.#followed();
    } finally { await this.#wakes.set(); }
    });
  }

  /**
   * Before a read that may be limited by the cause chain: a signed read, or a session at a register (`signed-reads.ts`, `Chains`).
   * Cheap request or session checks precede every chain read. A local signer needs no chain for the summary, genesis or its own
   * entry. Other valid limited reads find the roots that are new, and Reads checks authority again on the current clock afterwards.
   */
  async #rooted(reader: unknown, read: ReadName, arg: string): Promise<void> {
    if (presentsSignedRead(reader)) {
      if (!("key" in checkSignedReadRequest(this.#signed.observe ? { ...this.#signed, phase: "rooted-request" } : this.#signed, this.#store, reader as string, read, arg))) return;
      const local = checkLocalSignedRead(this.#signed.observe ? { ...this.#signed, phase: "rooted-local" } : this.#signed, this.#store, reader as string, read, arg);
      // The register's recent local signers read its whole history (ca8ad1cf).
      if ("key" in local && this.#store.scope()?.at.kind === "register") return;
      if (read === "summary" || read === "entry") {
        if ("key" in local) {
          if (read === "summary" || arg === "0") return;
          const row = this.#store.stored(Number(arg));
          if (row && signerOf(JSON.parse(row.bytes) as Entry) === local.key) return;
        }
      }
    } else {
      if (this.#store.scope()?.at.kind !== "register" || this.#readers.allows(reader, read) !== false) return;
      const chained = this.#readers.chained?.(reader, read);
      if (typeof chained !== "object" || chained === null) return;
    }
    await this.#chains.update();
  }

  /** Session preparation is separate from signed-read validation and never runs for a Signed header. */
  async #prepared(reader: unknown, read: ReadName): Promise<void> {
    if (!presentsSignedRead(reader)) await this.#readers.prepare?.(reader, read);
  }

  async summary(reader: unknown): Promise<Read<Summary>> { return this.#invoke("summary", async () => { this.#first(); await this.#prepared(reader, "summary"); await this.#rooted(reader, "summary", "summary"); return this.#reads.summary(reader); }); }
  async items(reader: unknown, type: string, cursor?: Cursor): Promise<Read<readonly Item[]>> { return this.#invoke("items", async () => { this.#first(); await this.#prepared(reader, "items"); return this.#reads.items(reader, type, cursor); }); }
  async history(reader: unknown, cursor?: Cursor): Promise<Read<readonly Sealed[]>> { return this.#invoke("history", async () => { this.#first(); await this.#prepared(reader, "history"); await this.#rooted(reader, "history", cursor ?? "0"); return this.#reads.history(reader, cursor); }); }
  async entry(reader: unknown, seq: number): Promise<Read<Sealed>> { return this.#invoke("entries", async () => { this.#first(); await this.#prepared(reader, "entry"); await this.#rooted(reader, "entry", String(seq)); return this.#reads.entry(reader, seq); }); }
  async outbox(reader: unknown, cursor?: Cursor): Promise<Read<readonly OutboxItem[]>> { return this.#invoke("outbox", async () => { this.#first(); await this.#prepared(reader, "outbox"); return this.#reads.outbox(reader, cursor); }); }
  async outboxItem(reader: unknown, outboxId: OutboxId): Promise<Read<OutboxItem>> { return this.#invoke("outboxItem", async () => { this.#first(); await this.#prepared(reader, "outbox"); return this.#reads.outboxItem(reader, outboxId); }); }
  async operations(reader: unknown, cursor?: Cursor, open = false): Promise<Read<readonly OperationStatus[]>> { return this.#invoke("operations", async () => { this.#first(); await this.#prepared(reader, "operations"); return this.#reads.operations(reader, cursor, open); }); }
  async operation(reader: unknown, operation: OperationId): Promise<Read<OperationStatus>> { return this.#invoke("operations", async () => { this.#first(); await this.#prepared(reader, "operations"); return this.#reads.operation(reader, operation); }); }
  async log(reader: unknown, cursor?: Cursor): Promise<Read<LogPage>> { return this.#invoke("log", async () => { this.#first(); await this.#prepared(reader, "log"); await this.#rooted(reader, "log", cursor ?? "0"); return this.#reads.log(reader, cursor); }); }
  async retained(reader: unknown, kind: RetainedInput["kind"], digest: Digest, domain?: string): Promise<Read<RetainedInput>> { return this.#invoke("retained", async () => { this.#first(); await this.#prepared(reader, "retained"); await this.#rooted(reader, "retained", retainedReadArgument(kind, digest, domain)); return this.#reads.retained(reader, kind, digest, domain); }); }
  async incidents(reader: unknown, cursor?: Cursor): Promise<Read<readonly Incident[]>> { return this.#invoke("incidents", async () => { this.#first(); await this.#prepared(reader, "incidents"); return this.#reads.incidents(reader, cursor); }); }
  async waiting(reader: unknown, list: "diagnosed" | "unanswered", cursor?: Cursor): Promise<Read<readonly OutboxItem[]>> { return this.#invoke("waiting", async () => { this.#first(); await this.#prepared(reader, "waiting"); return this.#reads.waiting(reader, list, cursor); }); }

  /** Internal namespace read of one exact job's current state. */
  async jobState(fact: import("@generalbusiness/dap-contract").FactRef): Promise<{ state: string; decidedBy: import("@generalbusiness/dap-contract").FactRef | null } | null> {
    this.#first(); const scope = this.#store.scope(); const sealed = this.#store.stored(fact.seq);
    if (!scope || !sealed || fact.at.scope !== scope.at.scope || fact.at.inc !== scope.at.inc || sealed.hash !== fact.hash) return null;
    const item = this.#store.item(fact.seq);
    const deciding = item?.refs["decidedBy"];
    const entry = typeof deciding === "number" ? this.#store.stored(deciding) : null;
    return item?.type === "job" ? { state: item.state, decidedBy: entry ? { at: scope.at, seq: deciding as number, hash: entry.hash } : null } : null;
  }
  /** Authenticated by the signed job-read request and current configured checker. */
  async reservationSnapshot(asked: SignedIntent): Promise<import("@generalbusiness/dap-contract").ReservationSnapshot | { refused: "reservation-stage-missing" | "reservation-stage-mismatch" } | null> {
    this.#first();
    try { return await this.#outside.snapshot?.(asked) ?? null; } catch { return null; }
  }

  /**
   * The one-time read of a member's read token at a destination, by its handle (the planner's decision for I5). Only a session
   * may read it, and only the session of the key that signed the `read-token` act whose `mint-read` minted it; the outside port
   * judges the rest, and drops the plaintext as it answers. A second read, another key's session, a read after the end, a
   * handle that names nothing and a scope that is no destination are each `forbidden`. Nothing is written.
   */
  async credential(reader: unknown, handle: unknown): Promise<Read<{ token: string; ends: string; remote: string }>> {
    this.#first();
    await this.#prepared(reader, "credential");
    const key = this.#readers.holder?.(reader, "credential") ?? false;
    if (key === "sessions-unavailable" || key === "clock-behind") return { ok: false, reason: key };
    const scope = this.#store.scope();
    const answer = key !== false && typeof handle === "string" && scope?.at.kind === "destination" ? this.#outside.credential?.(handle, key) ?? null : null;
    return answer && scope ? { ok: true, at: scope.head, value: answer, complete: true } : { ok: false, reason: "forbidden" };
  }
}
