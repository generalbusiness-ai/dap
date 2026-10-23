/** Development-only local scope: genuine native Core + SqliteStore, with
 * explicit scripted authority. No enrollment/freshness proof, dispatcher,
 * provider call, hosted durability or screen isolation is claimed here. */
import { bindApplicationProjection, ApplicationProjectionError, readPublishedApplicationPackage2, type AnyPackedApplication, type ApplicationReadProjection } from "@generalbusiness/dap-bytes/application-v2";
import { DatabaseSync } from "node:sqlite";
import type { Answer, ApplicationProjectionData, Beside, DeclaredDefinition, Digest, FreshnessProof, Grant, KeyId, MemberRef, ScopeId, ScopeRef, SignedIntent, Timestamp } from "@generalbusiness/dap-contract";
import { HISTORY_PAGE_ENTRIES, PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { canonicalize, definitionDigest, intentDigest, parseStrict, scopeIdOf, utf8 } from "@generalbusiness/dap-bytes";
import { readApplicationPackage } from "@generalbusiness/dap-client";
import { timeMs, type StateView } from "@generalbusiness/dap-derive";
import { verify, type HistorySource, type Verification } from "@generalbusiness/dap-replay";
import { CAPABILITY_CODE, Deliveries, PreparationFlights, Reads, ReadPreparation, applicationProjectionData, declaredBy, namespace, nativeBirth, projectionScopeOwned, sourced, sentText, Scope, SqliteStore, production, type Binding, type Peer, type Ports, type Sql, type SqlValue } from "@generalbusiness/dap-scope/runtime";
import { scriptedDeviceParent, type ScriptedDeviceGrantEvidence } from "./application-local-device-fixture.ts";

/** An explicit scenario/development grant list. It is never inferred from all
 * app actions, an app role, an HTTP caller or a production membership store. */
export interface LocalActor { readonly key: KeyId; readonly member: MemberRef; readonly actions: readonly string[]; readonly principal?: MemberRef | null }
export class LocalApplicationError extends Error {}

function sqlite(): Sql & { close(): void } {
  const db = new DatabaseSync(":memory:");
  let depth = 0;
  return {
    close: () => db.close(),
    exec(query, ...bindings) {
      // The two owned native schema strings contain multiple DDL statements.
      if (/^\s*CREATE\s/i.test(query)) {
        if (bindings.length) throw new LocalApplicationError("Schema bindings are unsupported.");
        db.exec(query); return { toArray: () => [] };
      }
      const rows = db.prepare(query).all(...bindings.map(value => value instanceof ArrayBuffer ? Buffer.from(value) : value));
      return { toArray: () => rows.map(row => Object.fromEntries(Object.entries(row).map(([key, value]): [string, SqlValue] => {
        if (value === null || typeof value === "string" || typeof value === "number") return [key, value];
        if (value instanceof Uint8Array) return [key, new Uint8Array(value).buffer];
        throw new LocalApplicationError("Unsupported native SQL value.");
      }))) };
    },
    transaction(work) {
      if (depth > 0) return work();
      db.exec("BEGIN"); depth++;
      try { const result = work(); db.exec("COMMIT"); return result; }
      catch (error) { db.exec("ROLLBACK"); throw error; }
      finally { depth--; }
    },
  };
}

/** The null proof makes the stand-in explicit in recorded grant bytes. Native
 * contract freshness requires real observations; replay below deliberately
 * says as-recorded and reports authority as trusted. This is confined to this
 * local developer adapter and must never be used by the hosted service. */
const NO_LOCAL_PROOF = null as unknown as FreshnessProof;
const ISSUED: Digest = `sha256:${"0".repeat(64)}`;

export class LocalApplicationScope {
  readonly #sql = sqlite();
  readonly #store = new SqliteStore(this.#sql);
  readonly #ports: Ports;
  readonly #core: Scope;
  readonly #name: ScopeId;
  #now: Timestamp;
  #closed = false;
  #projections: Readonly<Record<string, ApplicationReadProjection>> | null = null;
  #history: HistorySource | null = null;
  #fixtureGrant: ScriptedDeviceGrantEvidence | null = null;
  readonly #ownership = new PreparationFlights();

  private constructor(name: ScopeId, actors: readonly LocalActor[], now: Timestamp) {
    this.#name = name; this.#now = now;
    const held = new Map(actors.map(actor => [actor.key, parseStrict(canonicalize(actor)) as LocalActor]));
    this.#ports = production();
    this.#ports.clock = { read: () => this.#now };
    this.#ports.authority = { read: async asked => {
      const actor = held.get(asked.signed.intent.actor);
      if (!actor || asked.action === null) return { held: () => [] };
      const grant: Grant = { issued: { at: actor.member.membership, seq: 0, hash: ISSUED }, subject: actor.member, key: actor.key,
        principal: actor.principal ?? null, actions: [...actor.actions], within: asked.scope, notAfter: null, fresh: NO_LOCAL_PROOF };
      return { held: () => [{ grant, current: true }] };
    } };
    // Production defaults keep transport absent and outside operations closed.
    this.#core = new Scope(name, this.#store, this.#ports, PROPOSED_BOUNDS);
  }

  /** The root's actual genesis is judged from this retained signed founding.
   * No handmade genesis, activation entry or folded application state is used. */
  static async found(packet: AnyPackedApplication, founding: SignedIntent, actors: readonly LocalActor[], now: Timestamp, selected?: Digest, scriptedOwner?: MemberRef): Promise<LocalApplicationScope> {
    if (timeMs(now) === null || new Set(actors.map(actor => actor.key)).size !== actors.length) throw new LocalApplicationError("Choose a valid local time and distinct explicit actor keys.");
    const owned = packet.package.v === 2 ? readPublishedApplicationPackage2(packet.bytes, packet.ids.release) : readApplicationPackage(packet.bytes, packet.ids.release);
    // Developer scenarios may select a definition already inside the verified
    // closure. This is still a scripted single root, not child transport.
    const root = selected ?? owned.package.semantic.entry;
    const entryPart = owned.package.semantic.definitions.find(part => part.id === root);
    if (!entryPart) throw new LocalApplicationError("The selected local definition is outside the verified package closure.");
    if (scriptedOwner) return LocalApplicationScope.#scriptedDeviceBirth(owned, founding, actors, now, root, scriptedOwner);
    const name = scopeIdOf({ v: 1, kind: "directory", definition: root,
      creator: null, cause: intentDigest(founding.intent), ordinal: 0 });
    const scope = new LocalApplicationScope(name, actors, now);
    if (owned.package.v === 2) scope.#projections = owned.package.semantic.projections;
    try {
      const definitions = owned.package.semantic.definitions.map(part => parseStrict(part.bytes) as import("@generalbusiness/dap-contract").DeclaredDefinition);
      const entry = parseStrict(entryPart.bytes) as import("@generalbusiness/dap-contract").DeclaredDefinition;
      const answer = await scope.#core.create(founding, entry, definitions);
      if (answer.answer !== "accepted") throw new LocalApplicationError(`Local founding ${answer.answer}: ${answer.reason}.`);
      return scope;
    } catch (error) { scope.close(); throw error; }
  }

  /** Planner decision86916ce8: explicitly scripted parent authority, actual
   * Core/SQLite child genesis and preparation; never a native install. */
  static async #scriptedDeviceBirth(packet: AnyPackedApplication, founding: SignedIntent, actors: readonly LocalActor[], now: Timestamp, selected: Digest, owner: MemberRef): Promise<LocalApplicationScope> {
    if (!actors.some(actor => canonicalize(actor.member) === canonicalize(owner))) throw new LocalApplicationError("The scripted device owner must be an explicit TEST actor.");
    const parent = scriptedDeviceParent(packet, founding, owner, selected, now), scope = new LocalApplicationScope(parent.name, actors, now);
    if (packet.package.v === 2) scope.#projections = packet.package.semantic.projections;
    const parts = new Map(packet.package.semantic.definitions.map(part => [part.id, part.bytes]));
    scope.#ports.resolver = { read: async fact => fact.at.scope === parent.at.scope && fact.at.inc === parent.at.inc ? parent.read(fact.seq) : null };
    scope.#ports.proofs = { read: async (fact, maxBytes) => {
      const proof = fact.at.scope === parent.at.scope && fact.at.inc === parent.at.inc ? parent.proof(fact.seq, maxBytes) : null;
      return proof && canonicalize(proof.fact) === canonicalize(fact) ? proof : null;
    } };
    scope.#ports.births = { read: async (at, _milliseconds, maxBytes = PROPOSED_BOUNDS.entryBytes) =>
      at.scope === parent.at.scope && at.inc === parent.at.inc ? parent.birth(maxBytes) : nativeBirth(scope.#preparation(), at, undefined, maxBytes) };
    scope.#ports.definitions = { ...scope.#ports.definitions, read: async digest => {
      const bytes = parts.get(digest);
      return bytes === undefined ? { ok: false, reason: "unavailable" } : { ok: true, bytes };
    } };
    try {
      const deliveries = new Deliveries(scope.#name, scope.#core, scope.#store, scope.#ports, PROPOSED_BOUNDS);
      const born = await deliveries.deliver(parent.creation);
      if (born.answer !== "recorded") throw new LocalApplicationError(`Scripted-parent child genesis ${born.answer}${"reason" in born ? `: ${born.reason}` : ""}.`);
      const genesis = scope.#store.stored(0);
      if (!genesis) throw new LocalApplicationError("The actual child did not retain its genesis.");
      const confirmation = parent.confirm({ entry: parseStrict(genesis.bytes) as import("@generalbusiness/dap-contract").Entry, hash: genesis.hash });
      const confirmed = await deliveries.deliver(confirmation);
      if (confirmed.answer !== "recorded" || scope.#store.scope()?.status !== "active") throw new LocalApplicationError("The actual child was not confirmed.");
      scope.#fixtureGrant = parent.evidence;
      const source = parent.history();
      scope.#history = {
        page: (id, ...args) => id === parent.at.scope ? source.page(id, ...args) : scope.source.page(id, ...args),
        retained: (id, ...args) => id === parent.at.scope ? source.retained(id, ...args) : scope.source.retained(id, ...args),
      };
      return scope;
    } catch (error) { scope.close(); throw error; }
  }

  /** Development/test graph entry. The Directory root is actually founded;
   * children must subsequently be born by Deliveries from recorded creates.
   * This grants no package installation, enrollment or production authority. */
  static async directory(definition: DeclaredDefinition, definitions: readonly DeclaredDefinition[], founding: SignedIntent, actors: readonly LocalActor[], now: Timestamp): Promise<LocalApplicationScope> {
    const name = scopeIdOf({ v: 1, kind: "directory", definition: definitionDigest(definition), creator: null, cause: intentDigest(founding.intent), ordinal: 0 });
    const scope = new LocalApplicationScope(name, actors, now);
    try {
      const answer = await scope.#core.create(founding, definition, definitions);
      if (answer.answer !== "accepted") throw new LocalApplicationError(`Local graph founding ${answer.answer}: ${answer.reason}.`);
      return scope;
    } catch (error) { scope.close(); throw error; }
  }

  /** An empty object at a name. No reference or genesis is manufactured. */
  static empty(name: ScopeId, packet: AnyPackedApplication, actors: readonly LocalActor[], now: Timestamp): LocalApplicationScope {
    const scope = new LocalApplicationScope(name, actors, now);
    if (packet.package.v === 2) scope.#projections = packet.package.semantic.projections;
    return scope;
  }

  /** The binding is a test/development transport. All source, declaration,
   * birth and delivery answers below come from actual Core/SQLite state. */
  connect(binding: Binding, history: HistorySource): Peer {
    this.#open();
    const peers = namespace(binding);
    this.#ports.resolver = peers.resolver; this.#ports.proofs = peers.proofs; this.#ports.births = peers.births;
    this.#ports.definitions = peers.definitions; this.#ports.texts = peers.texts;
    // Test graphs explicitly deliver actual recorded sends. Keep this
    // adapter's background dispatcher and outside operations closed.
    this.#history = history;
    const deliveries = new Deliveries(this.#name, this.#core, this.#store, this.#ports, PROPOSED_BOUNDS);
    return {
      deliver: envelope => deliveries.deliver(envelope),
      source: async (seq, origin) => sourced(this.#store, this.#core.pinned(), seq, origin),
      declared: async digest => declaredBy(this.#store, digest),
      text: async (seq, digest) => sentText(this.#store, seq, digest),
      nativeBirth: async (at, _milliseconds, maxBytes) => nativeBirth(this.#preparation(), at, undefined, maxBytes),
      observe: async () => null,
    };
  }

  get state(): StateView { this.#open(); return this.#store; }
  get at() { this.#open(); return this.#store.scope()!.at; }
  get definition() { this.#open(); return this.#core.pinned()?.named ?? null; }
  /** Explicit whole-fixture TEST reads. No membership/session proof is claimed. */
  developmentReads(): Reads { this.#open(); return new Reads(this.#store, () => this.#core.pinned(), { allows: () => true }); }
  /** Explicit TEST read access, using the host's same bounded synchronous
   * projection phase over actual native SQLite. No session proof is claimed. */
  developmentProjection(name: string, items: Readonly<Record<string, number>> = {}): ApplicationProjectionData {
    this.#open();
    if (!this.#projections || !Object.hasOwn(this.#projections, name)) throw new LocalApplicationError("This local package declares no such projection.");
    const preparation = new ReadPreparation(this.#sql, { policy: () => "local-application-projection-v1", declared: bytes => this.#core.validate(bytes), platform: named => this.#core.platform(named) });
    const frame = preparation.capture();
    if (!frame?.pinned.definition) throw new LocalApplicationError("The local native projection frame is unavailable.");
    try {
      const projection = bindApplicationProjection(this.#projections[name]!, frame.pinned.definition.declared);
      const result = applicationProjectionData(this.#sql, frame, projection, items, () => !this.#closed);
      if (!result.ok || !frame.current()) throw new LocalApplicationError(`The local native projection refused: ${result.ok ? "stale" : result.reason}.`);
      return result.value;
    } catch (error) {
      if (error instanceof ApplicationProjectionError) throw new LocalApplicationError(`The local native projection refused: ${error.reason}.`);
      throw error;
    }
  }

  /** Same production ownership walk used by declared projection reads. Read
   * sessions/installation lookup remain explicit caller fixture boundaries. */
  async ownedDevelopmentProjection(name: string, items: Readonly<Record<string, number>>, root: ScopeRef, rootDefinition: Digest, directory: ScopeRef): Promise<ApplicationProjectionData> {
    this.#open();
    const result = await this.#ownership.run(async run => {
      const frame = this.#preparation().capture();
      if (!frame || await projectionScopeOwned(frame, root, rootDefinition, directory, this.#ports.births ?? null, run) !== "owned" || !frame.current()) return null;
      return this.developmentProjection(name, items);
    });
    if (!result) throw new LocalApplicationError("The selected scope is not a currently owned application descendant.");
    return result;
  }
  settle(signed: SignedIntent) { this.#open(); return this.#core.settle(signed); }
  get fixtureGrant(): ScriptedDeviceGrantEvidence | null { this.#open(); return this.#fixtureGrant ? parseStrict(canonicalize(this.#fixtureGrant)) as unknown as ScriptedDeviceGrantEvidence : null; }
  async prepare(signed: SignedIntent, capability: string, step: string): Promise<Answer> { this.#open(); return this.#core.prepare(signed, [], capability, step); }
  async submit(signed: SignedIntent, beside: Beside = {}): Promise<Answer> { this.#open(); return this.#core.submit(signed, [], beside); }
  async advance(now: Timestamp): Promise<void> {
    this.#open();
    if (timeMs(now) === null || timeMs(now)! < timeMs(this.#now)!) throw new LocalApplicationError("Local time must advance monotonically.");
    this.#now = now; await this.#core.alarm();
  }
  readonly source: HistorySource = {
    page: async (id, from, allow) => {
      this.#open(); const scope = this.#store.scope();
      if (!scope || id !== scope.at.scope) return { ok: false, reason: "not-found" };
      if (!Number.isSafeInteger(from) || from < 0 || !Number.isSafeInteger(allow.entries) || allow.entries < 1 || !Number.isSafeInteger(allow.bytes) || allow.bytes < 0) return { ok: false, reason: "too-large" };
      const entries = this.#store.storedFrom(from, Math.min(allow.entries, HISTORY_PAGE_ENTRIES)), bytes = entries.reduce((total, entry) => total + utf8(entry.bytes).length, 0);
      if (bytes > allow.bytes) return { ok: false, reason: "too-large" };
      const next = from + entries.length <= scope.head.seq ? from + entries.length : null;
      return { ok: true, page: { scope: scope.at, head: scope.head, entries, next }, bytes };
    },
    retained: async (id, kind, digest, allow, domain) => {
      this.#open(); if (id !== this.#store.scope()?.at.scope) return { ok: false, reason: "not-found" };
      const input = this.#store.retained(kind, digest, domain);
      if (!input) return { ok: false, reason: "not-found" };
      const bytes = utf8(input.bytes).length;
      return bytes > allow.bytes ? { ok: false, reason: "too-large" } : { ok: true, input, bytes };
    },
  };
  replay(): Promise<Verification> {
    this.#open();
    return verify(this.#history ?? this.source, { mode: "replay", scope: this.at.scope, head: this.#store.scope()!.head, grants: "as-recorded", bounds: PROPOSED_BOUNDS, capabilities: CAPABILITY_CODE, owners: CAPABILITY_CODE,
      ...(this.#fixtureGrant ? { anchors: this.#fixtureGrant.anchors.map(fact => ({ scope: fact.at.scope, seq: fact.seq, hash: fact.hash })) } : {}) });
  }
  #preparation(): ReadPreparation { return new ReadPreparation(this.#sql, { policy: () => "local-application-projection-v1", declared: bytes => this.#core.validate(bytes), platform: named => this.#core.platform(named) }); }
  close(): void { if (!this.#closed) { this.#closed = true; this.#sql.close(); } }
  #open(): void { if (this.#closed) throw new LocalApplicationError("The local application scope is closed."); }
}
