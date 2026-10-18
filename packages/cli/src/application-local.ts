/** Development-only local scope: genuine native Core + SqliteStore, with
 * explicit scripted authority. No enrollment/freshness proof, dispatcher,
 * provider call, hosted durability or screen isolation is claimed here. */
import { DatabaseSync } from "node:sqlite";
import type { Answer, Beside, Digest, FreshnessProof, Grant, KeyId, MemberRef, ScopeId, SignedIntent, Timestamp } from "@generalbusiness/dap-contract";
import { HISTORY_PAGE_ENTRIES, PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { canonicalize, intentDigest, parseStrict, scopeIdOf, utf8 } from "@generalbusiness/artroom-bytes";
import { readApplicationPackage, type PackedApplication } from "@generalbusiness/artroom-client";
import { timeMs, type StateView } from "@generalbusiness/dap-derive";
import { verify, type HistorySource, type Verification } from "@generalbusiness/artroom-replay";
import { CAPABILITY_CODE, Reads, Scope, SqliteStore, production, type Ports, type Sql, type SqlValue } from "@generalbusiness/artroom-scope/runtime";

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
  #now: Timestamp;
  #closed = false;

  private constructor(name: ScopeId, actors: readonly LocalActor[], now: Timestamp) {
    this.#now = now;
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
  static async found(packet: PackedApplication, founding: SignedIntent, actors: readonly LocalActor[], now: Timestamp, selected?: Digest): Promise<LocalApplicationScope> {
    if (timeMs(now) === null || new Set(actors.map(actor => actor.key)).size !== actors.length) throw new LocalApplicationError("Choose a valid local time and distinct explicit actor keys.");
    const owned = readApplicationPackage(packet.bytes, packet.ids.release);
    // Developer scenarios may select a definition already inside the verified
    // closure. This is still a scripted single root, not child transport.
    const root = selected ?? owned.package.semantic.entry;
    const entryPart = owned.package.semantic.definitions.find(part => part.id === root);
    if (!entryPart) throw new LocalApplicationError("The selected local definition is outside the verified package closure.");
    const name = scopeIdOf({ v: 1, kind: "directory", definition: root,
      creator: null, cause: intentDigest(founding.intent), ordinal: 0 });
    const scope = new LocalApplicationScope(name, actors, now);
    try {
      const definitions = owned.package.semantic.definitions.map(part => parseStrict(part.bytes) as import("@generalbusiness/dap-contract").DeclaredDefinition);
      const entry = parseStrict(entryPart.bytes) as import("@generalbusiness/dap-contract").DeclaredDefinition;
      const answer = await scope.#core.create(founding, entry, definitions);
      if (answer.answer !== "accepted") throw new LocalApplicationError(`Local founding ${answer.answer}: ${answer.reason}.`);
      return scope;
    } catch (error) { scope.close(); throw error; }
  }

  get state(): StateView { this.#open(); return this.#store; }
  get at() { this.#open(); return this.#store.scope()!.at; }
  /** Explicit whole-fixture TEST reads. No membership/session proof is claimed. */
  developmentReads(): Reads { this.#open(); return new Reads(this.#store, () => this.#core.pinned(), { allows: () => true }); }
  settle(signed: SignedIntent) { this.#open(); return this.#core.settle(signed); }
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
    return verify(this.source, { mode: "replay", scope: this.at.scope, head: this.#store.scope()!.head, grants: "as-recorded", bounds: PROPOSED_BOUNDS, capabilities: CAPABILITY_CODE, owners: CAPABILITY_CODE });
  }
  close(): void { if (!this.#closed) { this.#closed = true; this.#sql.close(); } }
  #open(): void { if (this.#closed) throw new LocalApplicationError("The local application scope is closed."); }
}
