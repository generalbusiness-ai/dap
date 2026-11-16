/** Requests over a declared replica: custody owns bytes, the replica owns facts, and one schedule owns time. */
import type { Answer, Beside, DeclaredDefinition, Digest, FieldValue, Head, MemberId, MemberRef, ScopeRef } from "@generalbusiness/dap-contract";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { REFUSAL_CLASSES, canonicalize, intentDigest, isDigest, isLocalId, isRecord, textDigest, timeOf, utf8 } from "@generalbusiness/dap-bytes";
import { changeItem, isItemEffect, newItem, validateDefinition, type PredictionActor, type ValidDefinition } from "@generalbusiness/dap-derive";
import { Custody, CustodyError, Lost, envelopeOf, identityId, meaningOf, validKey, type BindingRecord, type ClientCustodyStore, type CustodyRecord, type DeliveryOccurrence, type Envelope, type Identity, type Outcome, type Sent } from "./custody.ts";
import { ShapeError, shapeDeclaredAct, shapeFieldsOf, type AskedOf, type DeclaredHandle, type Kind, type ShapeFieldType } from "./declared.ts";
import { effectiveFields, expectedOf } from "./expected.ts";
import { DEFAULT_LIFETIME_SECONDS, signedIntent, type Signer } from "./intent.ts";
import { sendableAt } from "./originals.ts";
import { scopeReplica, intentMeaning, type Replica, type ReplicaOptions, type ReplicaView, type Row, type TypeOf } from "./replica.ts";
import type { Judged } from "./replica-judged.ts";
import { requestStatus, signingDead, type RequestStatus } from "./request-status.ts";
import { RequestSchedule, wallClock, type ClientClock } from "./request-schedule.ts";
import { AuthorizationError, AuthorizationTransaction, type Authorization, type AuthorizationIdentity, type AuthorizationInput, type AuthorizationPosition, type AuthorizedAct, type MaterializedAct, type RetainAuthorization, type SigningAuthorization } from "./authorization.ts";
import type { AuthorizationPort, CustodyBuildFence } from "./authorization-store.ts";
import type { ItemName, Source } from "./act-types.ts";
import { actVersion } from "./act-version.ts";
import { lowerActNames } from "./act-symbols.ts";

/** Seat holds no principal and uses an origin; this port states the four facts C3 needs, each once (ruling e868dd08). */
export interface ScopeMember { service: string; membership: ScopeRef; member: MemberId; principal: MemberRef | null }
export interface PresentRequest<D extends DeclaredDefinition> { kind: Kind<D>; values: AskedOf<D, Kind<D>> }
/** C4 owns slots and writes. C3 reads a request's present values and changes by another client. */
export interface DraftRead<D extends DeclaredDefinition> {
  read(key: string): Promise<PresentRequest<D> | null>;
  observe?(changed: () => void): () => void;
}
export interface ClientOptions<D extends DeclaredDefinition> extends ReplicaOptions {
  signer: Signer;
  member: ScopeMember;
  store: ClientCustodyStore & { authorizations: AuthorizationPort };
  /** Fixed by the descriptor owner; E4 invents no descriptor or fallback digest. */
  descriptor: Digest;
  drafts: DraftRead<D>;
  clock?: ClientClock;
  lifetimeSeconds?: number;
}
export type RequestView<D extends DeclaredDefinition> = RequestStatus & {
  key: string;
  kind: Kind<D>;
  values: AskedOf<D, Kind<D>>;
  predicted: Judged | null;
};
export type ClientRow<D extends DeclaredDefinition, T extends TypeOf<D> = TypeOf<D>> = Row<D, T> & { pending?: { key: string } };
export interface ClientView<D extends DeclaredDefinition> extends Omit<ReplicaView<D>, "row" | "rows"> {
  rows<T extends TypeOf<D>>(type: T): readonly ClientRow<D, T>[];
  requests: readonly RequestView<D>[];
  row(ref: { item: number } | { key: string }): ClientRow<D> | null;
}
interface ReadProof { began: number; head: Head }
interface Held<D extends DeclaredDefinition> { record: CustodyRecord; outcomes: Outcome[]; present: PresentRequest<D>; meaning: Digest }
const unresolved = (record: CustodyRecord): boolean => ["prepared", "sent", "unknown"].includes(record.phase);
const retryDelay = (copies: number): number => copies <= 5 ? 1000 * 2 ** Math.max(0, copies - 1) : 30_000;
const unanswered = (outcome: Outcome): boolean => "lost" in outcome || "answer" in outcome && outcome.answer.answer === "unavailable";
const neverBuild = async (): Promise<never> => { throw new Error("a retry cannot sign"); };
type RequestCall<D extends DeclaredDefinition> = <K extends Kind<D>>(key: string, kind: K, values: AskedOf<D, K>) => Promise<Sent>;
const requests = new WeakMap<object, unknown>();
const replicas = new WeakMap<object, unknown>();
const flushers = new WeakMap<object, () => Promise<void>>();
const deliveries = new WeakMap<object, DeliveryOccurrence>();
/** Last actual launch only; a bounded test correspondence seam, absent from scope.ts. */
export const clientDelivery = (client: object): DeliveryOccurrence | null => structuredClone(deliveries.get(client) ?? null);
/** Await actual queued memory-port work in owning tests; no clock advances and no package export. */
export const clientIdle = (client: object): Promise<void> => flushers.get(client)!();
/** Test-only correspondence seam; scope.ts does not export it. */
export const clientReplica = <D extends DeclaredDefinition>(client: ScopeClient<D>): Replica<D> => replicas.get(client) as Replica<D>;

export class ScopeClient<D extends DeclaredDefinition> {
  readonly #handle: DeclaredHandle<D>;
  readonly #at: ScopeRef;
  readonly #options: ClientOptions<D>;
  readonly #clock: ClientClock;
  readonly #schedule: RequestSchedule;
  readonly #custody: Custody;
  readonly #actor: PredictionActor;
  readonly #who: Omit<Identity, "key">;
  readonly #definition: ValidDefinition | null;
  readonly #replica: Replica<D>;
  readonly #work = new Set<Promise<unknown>>();
  readonly #listeners = new Set<(view: ClientView<D>) => void>();
  readonly #busy = new Set<string>();
  readonly #retry = new Set<string>();
  readonly #retryAt = new Map<string, number>();
  readonly #retryTokens = new Map<string, object>();
  readonly #deathTokens = new Map<string, object>();
  #held = new Map<string, Held<D>>();
  #view: ClientView<D>;
  #closed = false;
  #stopping = false;
  #halted = false;
  #feed = false;
  #running: Promise<void> | null = null;
  #ending: Promise<void> | null = null;
  #absenceProof: ReadProof | null = null;
  #again = false;
  #stopStore: () => void;
  #stopDrafts: () => void;
  #stopReplica: () => void;

  constructor(handle: DeclaredHandle<D>, options: ClientOptions<D>) {
    options = { ...options, member: structuredClone(options.member),
      signer: { key: options.signer.key, sign: options.signer.sign.bind(options.signer) } };
    this.#handle = handle; this.#options = options;
    this.#at = structuredClone(handle.at);
    this.#clock = options.clock ?? wallClock;
    this.#schedule = new RequestSchedule(this.#clock);
    this.#custody = new Custody(options.store, () => timeOf(this.#clock.now()));
    this.#actor = { key: options.signer.key, member: { membership: options.member.membership, member: options.member.member }, principal: options.member.principal };
    this.#who = { service: options.member.service, membership: options.member.membership, signer: options.signer.key, target: this.#at };
    const checked = validateDefinition(handle.definition, PROPOSED_BOUNDS);
    this.#definition = checked.ok ? checked.definition : null;
    const lifetime = options.lifetimeSeconds ?? DEFAULT_LIFETIME_SECONDS;
    if (!(lifetime > 0 && lifetime <= PROPOSED_BOUNDS.intentLifetimeSeconds)) throw new RangeError("the client signing lifetime exceeds its bound");
    this.#replica = scopeReplica(handle, { observe: emit => options.observe(state => {
      const returned = state.status === "streaming" && !this.#feed;
      if (state.status === "streaming" || state.status === "current") this.#feed = true;
      else if (!["connecting", "refreshing", "retained"].includes(state.status) || state.status === "retained" && state.reason === "subscription-ended") this.#feed = false;
      emit(state);
      if (returned) this.#background(() => this.#reconnected());
    }) });
    replicas.set(this, this.#replica);
    this.#view = this.#compute();
    this.#stopStore = options.store.observe(() => { this.#background(() => this.#sync()); });
    this.#stopDrafts = options.drafts.observe?.(() => { this.#background(() => this.#sync()); }) ?? (() => {});
    this.#stopReplica = this.#replica.subscribe(() => { this.#background(() => this.#sync()); });
    flushers.set(this, () => this.#idle());
    const call: RequestCall<D> = (key, kind, values) => this.#request(key, kind, values);
    requests.set(this, call);
    this.#background(() => this.read());
  }

  get view(): ClientView<D> { return this.#view; }
  subscribe(listener: (view: ClientView<D>) => void): () => void { this.#listeners.add(listener); return () => { this.#listeners.delete(listener); }; }

  /** Every member call reads, including a stable feed whose preceding journal read failed (ruling aa12ecdd). */
  async read(to?: Head): Promise<void> {
    if (this.#closed || this.#stopping) return;
    const began = this.#clock.now();
    const complete = await this.#replica.read(to);
    const head = complete ? this.#replica.view.head : null;
    if (this.#closed) return;
    await this.#sync();
    if (head) {
      await this.#absent({ began, head });
      for (const [key, held] of this.#held) if (unresolved(held.record) && !this.#busy.has(key) && !this.#retry.has(key)) this.#retryAfterRead(key, held);
    }
    await this.#sync();
  }

  close(): void {
    if (this.#closed) return;
    this.#closed = true;
    this.#schedule.close();
    this.#stopStore(); this.#stopDrafts(); this.#stopReplica();
    this.#replica.close();
    // Close cannot publish a replica head whose custody reconciliation is still awaiting a store or draft.
    this.#view = { ...this.#view, state: this.#replica.view.state };
    for (const listener of [...this.#listeners]) listener(this.#view);
  }

  #background(run: () => Promise<unknown>): void {
    // A background store failure cannot publish a partial view. A later member call reads the store again and can throw it.
    const work = Promise.resolve().then(run);
    this.#work.add(work);
    void work.catch(() => {}).finally(() => { this.#work.delete(work); });
  }

  async #idle(): Promise<void> {
    for (;;) {
      await this.#sync();
      if (this.#work.size === 0) return;
      await Promise.allSettled([...this.#work]);
    }
  }

  async #sync(): Promise<void> {
    if (this.#closed || this.#halted) return;
    if (this.#running) { this.#again = true; return this.#running; }
    this.#running = (async () => {
      try {
        do {
          this.#again = false;
          const replica = this.#replica.view;
          const held = new Map<string, Held<D>>();
          for (const row of await this.#options.store.byTarget(this.#who)) {
            const identity = { ...this.#who, key: row.key };
            let record = await this.#custody.find(identity);
            if (!record || record.standalone) continue;
            const entry = this.#replica.accepted(this.#options.signer.key, row.key);
            if (entry && record.phase !== "accepted" && record.phase !== "archived" && record.phase !== "settled") {
              try { record = await this.#custody.folded(identity, entry) ?? record; }
              catch (error) { if (error instanceof CustodyError && error.why.held === "locked") return; throw error; }
            }
            const outcomes = await this.#custody.outcomes(identityId(identity), record);
            const draft = await this.#options.drafts.read(row.key);
            const present = draft ?? this.#present(record);
            held.set(row.key, { record, outcomes, present, meaning: draft ? this.#presentMeaning(present) : record.meaning });
          }
          if (this.#closed) return;
          // A store, draft or replica change during an await invalidates this whole candidate view.
          if (this.#again || this.#replica.view !== replica) { this.#again = true; continue; }
          this.#held = held;
          this.#arm();
          this.#publish();
        } while (this.#again && !this.#closed);
      } finally {
        // Release ownership with the final pending-work decision, including early returns.
        this.#running = null;
      }
    })();
    return this.#running;
  }

  #present(record: CustodyRecord): PresentRequest<D> {
    const intent = record.envelope.signed.intent;
    const texts = new Map((record.envelope.beside.texts ?? []).map(text => [textDigest(text), text]));
    const restore = (type: ShapeFieldType, value: FieldValue): FieldValue => {
      if (type.type === "text" && type.detached && typeof value === "string") return texts.get(value as Digest) ?? value;
      if (type.type === "list" && Array.isArray(value)) return value.map(part => restore(type.of, part));
      if (type.type === "record" && value !== null && typeof value === "object" && !Array.isArray(value)) {
        return Object.fromEntries(Object.entries(value).map(([name, part]) => [name, restore(type.of[name]!, part as FieldValue)]));
      }
      return value;
    };
    const act = this.#handle.definition.acts[intent.kind]!;
    const fields = Object.fromEntries(Object.entries(intent.fields).map(([name, value]) => [name, restore(act.fields[name]!, value)]));
    const values = { on: intent.on, fields, ...(record.envelope.beside.presented ? { presented: record.envelope.beside.presented } : {}) } as unknown as AskedOf<D, Kind<D>>;
    return { kind: intent.kind as Kind<D>, values };
  }
  #presentMeaning(present: PresentRequest<D>): Digest {
    try { const shaped = shapeDeclaredAct(this.#handle.definition, present.kind, present.values); return intentMeaning({ kind: present.kind, on: shaped.on, fields: shaped.fields }); }
    catch { return meaningOf(present); }
  }
  #predict(record: CustodyRecord, index: number): Judged {
    const envelope = envelopeOf(record, index);
    return envelope ? this.#replica.judged(envelope.signed, { actor: this.#actor, reading: timeOf(this.#clock.now()), texts: envelope.beside.texts ?? [] }) : { is: "not-judged" };
  }
  #compute(): ClientView<D> {
    const replica = this.#replica.view, byKey = new Map<string, ClientRow<D>>(), view: RequestView<D>[] = [];
    const byType = new Map<string, ClientRow<D>[]>(), byItem = new Map<number, ClientRow<D>>();
    for (const type of Object.keys(this.#handle.definition.items)) {
      const rows = [...replica.rows(type)] as ClientRow<D>[];
      byType.set(type, rows); for (const row of rows) byItem.set(row.id, row);
    }
    for (const [key, held] of this.#held) {
      const { record, outcomes, present } = held;
      const entry = this.#replica.accepted(this.#options.signer.key, key);
      const status = requestStatus({ entry, record, outcomes, presentMeaning: held.meaning, head: replica.head, now: this.#clock.now(), predict: index => this.#predict(record, index) });
      // The entry closes custody before publication. In particular no mismatch view publishes not-judged (aa12ecdd).
      const predicted = entry ? { is: "recorded" as const, fact: entry.fact } : this.#predict(record, record.signings.length - 1);
      const target = entry?.opened ?? record.envelope.signed.intent.on;
      if (entry && target !== null) {
        const row = replica.row({ item: target }); if (row) byKey.set(key, row);
      } else if (status.status === "pending" && predicted.is === "write" && this.#definition) {
        const opened = predicted.effects.find(effect => effect.effect === "open");
        let item = opened?.effect === "open" ? newItem(opened, this.#handle.definition.items[opened.type]!, null)
          : target !== null ? replica.row({ item: target }) : null;
        if (item) {
          const id = item.id;
          for (const change of predicted.effects) if (isItemEffect(change) && change.item === id) {
            item = changeItem(item, change, this.#definition, { member: this.#actor.member, principal: this.#actor.principal });
          }
          const row = { ...item, pending: { key } } as ClientRow<D>;
          byKey.set(key, row);
          const rows = byType.get(row.type) ?? [];
          const at = opened ? -1 : rows.findIndex(existing => existing.id === row.id);
          if (at < 0) rows.push(row); else rows[at] = row;
          byType.set(row.type, rows);
          if (!opened) byItem.set(row.id, row);
        }
      }
      if (status.status !== "recorded") view.push({ key, kind: present.kind, values: present.values, ...status, predicted });
    }
    return { ...replica, requests: view,
      rows: <T extends TypeOf<D>>(type: T) => (byType.get(type) ?? []) as unknown as readonly ClientRow<D, T>[],
      row: ref => "item" in ref ? byItem.get(ref.item) ?? null : byKey.get(ref.key) ?? null };
  }
  #publish(): void { this.#view = this.#halted ? { ...this.#view, state: this.#replica.view.state } : this.#compute(); for (const listener of [...this.#listeners]) listener(this.#view); }

  #token(map: Map<string, object>, key: string): object { let token = map.get(key); if (!token) { token = {}; map.set(key, token); } return token; }
  #arm(): void {
    if (this.#closed || this.#replica.view.state.is === "stopped") { this.#schedule.close(); return; }
    for (const map of [this.#deathTokens, this.#retryTokens]) for (const [key, token] of map) if (!this.#held.has(key)) { this.#schedule.cancel(token); map.delete(key); this.#retry.delete(key); this.#retryAt.delete(key); }
    for (const [key, held] of this.#held) {
      const { record, outcomes } = held;
      const deaths = record.signings.flatMap((signing, index) => !signing.closed && !signingDead(signing, this.#clock.now())
        && (index === record.signings.length - 1 && unresolved(record) || outcomes.some(outcome => outcome.signing === index && unanswered(outcome))) ? [sendableAt(signing.notAfter)] : []);
      const death = this.#token(this.#deathTokens, key);
      if (deaths.length) this.#schedule.at(death, Math.min(...deaths), () => { this.#background(() => this.read()); });
      else this.#schedule.cancel(death);
      const retry = this.#token(this.#retryTokens, key), current = record.envelope.signed.intent;
      if (this.#retry.has(key) && !this.#busy.has(key) && unresolved(record) && this.#clock.now() < Date.parse(current.notAfter)) {
        this.#schedule.at(retry, this.#retryAt.get(key) ?? this.#clock.now() + 1000, () => { this.#retry.delete(key); this.#background(() => this.#copy(key)); });
      } else this.#schedule.cancel(retry);
    }
  }

  #retryAfterRead(key: string, held: Held<D>): void {
    const copies = held.outcomes.filter(outcome => outcome.attempt === held.record.attempt && unanswered(outcome));
    this.#retry.add(key);
    this.#retryAt.set(key, this.#clock.now() + retryDelay(copies.length));
  }

  #absent(proof: ReadProof): Promise<void> {
    if (!this.#absenceProof || proof.began >= this.#absenceProof.began) this.#absenceProof = proof;
    if (this.#ending) return this.#ending;
    if (this.#closed) return Promise.resolve();
    this.#ending = (async () => {
      try {
        while (this.#absenceProof && !this.#closed) {
          const current = this.#absenceProof;
          this.#absenceProof = null;
          await this.#markAbsent(current);
        }
      } finally {
        // Release ownership with the final pending-proof decision, including errors and close.
        this.#ending = null;
      }
    })();
    return this.#ending;
  }

  async #markAbsent(proof: ReadProof): Promise<void> {
    if (this.#closed) return;
    for (const [key, { record }] of this.#held) {
      if (this.#busy.has(key) || this.#replica.accepted(this.#options.signer.key, key)) continue;
      for (const [index, signing] of record.signings.entries()) {
        if (signing.closed || !signingDead(signing, proof.began)) continue;
        // A successful read also closes older dead envelopes before a new member submit checks the envelope bound.
        if (index < record.signings.length - 1 || unresolved(record)) {
          await this.#custody.absent({ ...this.#who, key }, index, proof.head);
        }
      }
    }
  }

  async #reconnected(): Promise<void> {
    if (this.#closed) return;
    await this.read();
    for (const [key, held] of this.#held) if (unresolved(held.record)) this.#background(() => this.#copy(key));
  }

  #authorization(port: AuthorizationPort): AuthorizationTransaction {
    return new AuthorizationTransaction(port, { owner: this.#options.signer.key, scope: this.#at,
      definition: this.#handle.digest, descriptor: this.#options.descriptor }, this.#replica);
  }
  #authorizationIdentity(key: string): AuthorizationIdentity {
    return { key, owner: this.#options.signer.key, scope: this.#at };
  }

  #owner(identity: AuthorizationIdentity): void {
    if (identity.owner !== this.#options.signer.key || canonicalize(identity.scope) !== canonicalize(this.#at)) throw new AuthorizationError("owner");
    if (!validKey(identity.key)) throw new ShapeError("key", "is not a bounded request key");
  }
  #state(): void {
    this.#current();
    if (!["current", "behind"].includes(this.#replica.view.state.is)) throw new Error("the scope client cannot submit in this state");
  }
  #items() { return Object.keys(this.#handle.definition.items).flatMap(type => [...this.#replica.view.rows(type)]); }
  async #pending(previous: Authorization): Promise<boolean> {
    if (Date.parse(previous.versions.at(-1)!.deadline) <= this.#clock.now()) return false;
    const record = await this.#custody.find({ ...this.#who, key: previous.key });
    return !record || unresolved(record);
  }

  /** Derive reference/order data here. No public input contains an after graph or a selected subject list. */
  async #retentionStep(input: AuthorizationInput, batch: readonly AuthorizationInput[], transaction: AuthorizationTransaction): Promise<RetainAuthorization> {
    const act = input.act, declared = this.#handle.definition.acts[act.kind];
    if (!declared || act.kind === this.#handle.definition.genesis) throw new ShapeError("kind", "is not an ordinary act kind");
    if (!validKey(input.key)) throw new ShapeError("key", "is not a bounded request key");
    const sources = new Map<string, Source>(), tokens = new Map<string, object>(), names = new Map<object, ItemName>();
    const source = (value: unknown): Source => {
      if (!isRecord(value) || Object.keys(value).length !== 2 || !Object.hasOwn(value, "key") || !Object.hasOwn(value, "version")
        || !validKey(value["key"]) || !isDigest(value["version"])) throw new ShapeError("source", "is not a bounded step source");
      const found = { key: value["key"] as string, version: value["version"] as Digest };
      sources.set(canonicalize(found), found); return found;
    };
    const token = (found: Source): object => {
      const key = canonicalize(found); let held = tokens.get(key);
      if (!held) { held = Object.freeze({}); tokens.set(key, held); names.set(held, { output: found }); }
      return held;
    };
    const output = (name: ItemName): number | object => {
      if (typeof name === "number") { if (!isLocalId(name)) throw new ShapeError("item", "is not a local item name"); return name; }
      if (!isRecord(name) || Object.keys(name).length !== 1 || !Object.hasOwn(name, "output")) throw new ShapeError("item", "is not an output source");
      return token(source(name.output));
    };
    const capture = lowerActNames(act, declared.fields, { item: output });
    const needs = declared.step !== "open" && declared.on !== null;
    if (needs ? capture.on === null : capture.on !== null) throw new ShapeError("on", needs ? "is required" : "names no existing item");
    for (const revision of Object.values(act.expected)) {
      if (typeof revision === "number") { if (!Number.isSafeInteger(revision) || revision < 0 || Object.is(revision, -0)) throw new ShapeError("expected", "is not a revision"); }
      else {
        if (!isRecord(revision) || Object.keys(revision).length !== 1 || !Object.hasOwn(revision, "after")) throw new ShapeError("expected", "is not an after source");
        source(revision.after);
      }
    }
    // Only these validated owned tokens pass non-signing shape validation. No placeholder ID reaches a signing.
    const shaped = shapeFieldsOf(declared.fields, capture.fields, { symbolicItems: new Set(tokens.values()) });
    const resolve = new Map<object, number>();
    for (const [name, held] of tokens) {
      const found = await transaction.item(names.get(held)!);
      if (typeof found === "number") resolve.set(held, found);
      // The token remains private; subjects retain the public Source if it is not recorded yet.
      if (!sources.has(name)) throw new AuthorizationError("source");
    }
    const items: { id: number | object; revision: number | object; type: string; refs: Readonly<Record<string, FieldValue | null>> }[] =
      this.#items().map(item => ({ ...item, revision: item.id }));
    const resolvedFields = Object.fromEntries(Object.entries(shaped.fields).map(([name, value]) => [name, typeof value === "object" && value !== null && resolve.has(value) ? resolve.get(value)! : value]));
    const on = capture.on !== null && typeof capture.on === "object" && resolve.has(capture.on) ? resolve.get(capture.on)! : capture.on;
    const opening = async (found: Source, type: string): Promise<void> => {
      const proposed = batch.find(step => step.key === found.key && actVersion(step.act) === found.version)?.act;
      const prior = proposed ? null : await transaction.find(this.#authorizationIdentity(found.key));
      const origin = proposed ?? (prior?.versions.at(-1)?.id === found.version ? prior.versions.at(-1)!.act : null);
      const declaration = origin ? this.#handle.definition.acts[origin.kind] : null;
      if (!declaration || declaration.step !== "open" || declaration.on !== type) throw new AuthorizationError("source");
      const held = token(found);
      if (!items.some(item => item.id === held)) items.push({ id: held, revision: held, type, refs: {} });
    };
    if (on !== null && typeof on === "object" && declared.on !== null) {
      await opening((names.get(on)! as { output: Source }).output, declared.on);
    }
    for (const [name, value] of Object.entries(declared.also)) {
      const rule = value as { item?: string; by?: string; one?: true; via?: { of: string; slot: string }; code?: string };
      if (rule.code !== undefined) continue;
      if (rule.by && rule.item) {
        const selected = resolvedFields[rule.by];
        if (selected !== null && typeof selected === "object" && names.has(selected)) await opening((names.get(selected)! as { output: Source }).output, rule.item);
      } else if (rule.one && rule.item && !items.some(item => item.type === rule.item)) {
        const revision = act.expected[name];
        if (revision && typeof revision !== "number") await opening(source(revision.after), rule.item);
      }
    }
    // A pending source has no recorded reference slots. Do not project a via path.
    const pendingSubject = (name: string, seen = new Set<string>()): boolean => {
      name = name.replace(/^also\./, "");
      if (name === "on") return on !== null && typeof on === "object";
      if (seen.has(name)) return false;
      seen.add(name);
      const rule = declared.also[name] as { item?: string; by?: string; one?: true; via?: { of: string; slot: string }; code?: string } | undefined;
      if (!rule || rule.code !== undefined) return false;
      if (rule.by !== undefined) return typeof resolvedFields[rule.by] === "object" && resolvedFields[rule.by] !== null && names.has(resolvedFields[rule.by] as object);
      if (rule.one) return typeof items.find(item => item.type === rule.item)?.id === "object";
      return !!rule.via && pendingSubject(rule.via.of, seen);
    };
    for (const value of Object.values(declared.also)) {
      const rule = value as { via?: { of: string; slot: string } };
      if (rule.via && pendingSubject(rule.via.of)) throw new AuthorizationError("source");
    }
    const selected = expectedOf(declared, items, on, effectiveFields(declared, resolvedFields, this.#at));
    const publicName = (item: number | object): ItemName => typeof item === "number" ? item : names.get(item) ?? (() => { throw new AuthorizationError("source"); })();
    const subjects = Object.entries(selected).map(([name, item]) => ({ name, item: publicName(item) }));
    if (on !== null && declared.on !== null && !subjects.some(subject => subject.name === "on")) subjects.push({ name: "on", item: publicName(on) });
    return { key: input.key, act, sources: [...sources.values()], subjects };
  }

  /** One unsigned gesture batch; only the complete owner/scope replacement can commit. */
  async retainAuthorizations(inputs: readonly AuthorizationInput[]): Promise<readonly AuthorizationPosition[]> {
    const captured = structuredClone(inputs), gesture = this.#clock.now();
    await this.read(); this.#state();
    return this.#options.store.exclusive(async () => {
      this.#state(); const transaction = this.#authorization(this.#options.store.authorizations);
      const steps: RetainAuthorization[] = [];
      for (const input of captured) steps.push(await this.#retentionStep(input, captured, transaction));
      const held = await transaction.retain(steps, gesture, this.#options.lifetimeSeconds ?? DEFAULT_LIFETIME_SECONDS, row => this.#pending(row));
      this.#state(); await transaction.commit(); return structuredClone(held);
    });
  }

  /** Fill once using only this instance's checked source entries and post-entry revisions. */
  async fillAuthorization(reference: AuthorizationPosition): Promise<MaterializedAct> {
    const captured = structuredClone(reference); this.#owner(captured.identity);
    await this.read(); this.#state();
    return this.#options.store.exclusive(async () => {
      this.#state(); const transaction = this.#authorization(this.#options.store.authorizations);
      const materialized = await transaction.fill(captured.identity, captured.position, this.#handle.definition, this.#items());
      this.#state(); await transaction.commit(); return structuredClone(materialized);
    });
  }

  /** C4 supplies its captured act. This operation is always a new gesture, never an inferred copy. */
  async submitBoundAct(identity: AuthorizationIdentity, act: AuthorizedAct): Promise<Sent> {
    const captured = structuredClone({ identity, act }), gesture = this.#clock.now();
    this.#owner(captured.identity);
    return this.#submitCaptured(captured.identity, captured.act, gesture);
  }

  async authorization(identity: AuthorizationIdentity): Promise<Authorization | null> {
    const captured = structuredClone(identity);
    return this.#options.store.exclusive(() => this.#authorization(this.#options.store.authorizations).find(captured));
  }
  async cancelAuthorization(identity: AuthorizationIdentity): Promise<void> {
    const captured = structuredClone(identity);
    await this.#options.store.exclusive(async () => {
      const transaction = this.#authorization(this.#options.store.authorizations);
      await transaction.cancel(captured, this.#clock.now()); await transaction.commit();
    });
    await this.#sync();
  }

  async #deliver(envelope: Envelope, occurrence: DeliveryOccurrence): Promise<Answer> {
    const captured = structuredClone(envelope), selected = structuredClone(occurrence);
    try {
      return await this.#schedule.bounded(async current => {
        const launched = await this.#options.store.exclusive(async () => {
          this.#current(); if (!current()) throw new Lost();
          const key = captured.signed.intent.idempotencyKey;
          const record = await this.#custody.find(selected.identity);
          this.#current(); if (!current()) throw new Lost();
          const signing = record?.signings[selected.signing], kept = record ? envelopeOf(record, selected.signing) : null;
          if (!record || !signing || !kept || !unresolved(record) || record.attempt !== selected.attempt
            || selected.signing !== record.signings.length - 1 || signing.intent !== selected.intent
            || intentDigest(captured.signed.intent) !== selected.intent || canonicalize(kept) !== canonicalize(captured)
            || canonicalize(signing.authorization ?? null) !== canonicalize(selected.authorization ?? null)
            || canonicalize(record.identity) !== canonicalize(selected.identity)
            || canonicalize(selected.identity) !== canonicalize({ ...this.#who, key })
            || signing.dead !== undefined || signing.closed || this.#clock.now() >= Date.parse(signing.notAfter)
            || this.#replica.accepted(this.#options.signer.key, key)) throw new Lost();
          if (signing.authorization && !await this.#authorization(this.#options.store.authorizations).canCopy(signing.authorization, captured.signed, this.#clock.now())) throw new Lost();
          this.#current(); if (!current()) throw new Lost();
          // The authorization read can wait too; lifetime eligibility applies to legacy and referenced occurrences alike.
          if (this.#clock.now() >= Date.parse(signing.notAfter) || this.#replica.accepted(this.#options.signer.key, key)) throw new Lost();
          deliveries.set(this, structuredClone(selected));
          // Launch under the fence; await the network after releasing it.
          return { answer: this.#handle.submit(captured.signed, [], captured.beside) };
        });
        return launched.answer;
      });
    } catch { throw new Lost(); }
  }
  async #after(sent: Sent): Promise<void> {
    if (this.#closed || this.#stopping) return;
    const answer = "answer" in sent ? sent.answer : null;
    const protocol = answer?.answer === "refused" && REFUSAL_CLASSES[answer.reason] === "protocol";
    if (protocol) { this.#stopping = true; this.#schedule.close(); }
    const to = answer?.answer === "accepted" ? answer.receipt.fact : answer?.answer === "refused" ? answer.judgedAt : undefined;
    const began = this.#clock.now();
    const complete = await this.#replica.read(to);
    const head = complete ? this.#replica.view.head : null;
    await this.#sync();
    if (this.#closed) return;
    if (protocol && answer?.answer === "refused") {
      this.#halted = true;
      this.#stopStore(); this.#stopDrafts(); this.#stopReplica();
      this.#replica.protocol(answer.reason);
      this.#publish();
      return;
    }
    if (head) {
      await this.#absent({ began, head });
      const key = sent.record.identity.key, held = this.#held.get(key);
      if (held && unresolved(held.record)) this.#retryAfterRead(key, held);
    }
    await this.#sync();
  }
  async #copy(key: string): Promise<void> {
    if (!this.#available() || this.#busy.has(key)) return;
    const record = await this.#custody.find({ ...this.#who, key });
    if (!this.#available() || this.#busy.has(key)) return;
    if (!record || !unresolved(record) || this.#clock.now() >= Date.parse(record.envelope.signed.intent.notAfter) || this.#replica.accepted(this.#options.signer.key, key)) return;
    this.#busy.add(key); this.#retry.delete(key);
    try {
      const sent = await this.#custody.send(record.identity, record.meaning, neverBuild, (envelope, selected) => this.#deliver(envelope, selected), { notAfter: timeOf(this.#clock.now() + 30_000) });
      this.#busy.delete(key);
      await this.#after(sent);
    } catch (error) {
      if (!(error instanceof CustodyError) || error.why.held !== "locked") throw error;
      this.#retry.add(key); this.#retryAt.set(key, this.#clock.now() + 1000);
    } finally { this.#busy.delete(key); await this.#sync(); }
  }

  #available(): boolean { return !this.#closed && !this.#stopping && this.#replica.view.state.is !== "stopped"; }
  #current(): void { if (!this.#available()) throw new Error("the scope client no longer owns this request"); }

  async #signRetained(transaction: AuthorizationTransaction, reference: AuthorizationPosition, beside: Beside = {}) {
    const materialized = await transaction.fill(reference.identity, reference.position, this.#handle.definition, this.#items(), beside);
    const permit = await transaction.permit(reference.identity, reference.position, this.#clock.now());
    this.#state();
    if (this.#clock.now() >= Date.parse(permit.deadline)) throw new AuthorizationError("deadline");
    await transaction.commit();
    this.#state();
    const now = this.#clock.now();
    if (now >= Date.parse(permit.deadline)) throw new AuthorizationError("deadline");
    const signed = await signedIntent(this.#options.signer, { to: this.#at, kind: materialized.kind,
      on: materialized.on, fields: { ...materialized.fields }, expected: { ...materialized.expected } },
      { idempotencyKey: reference.identity.key, now, lifetimeSeconds: (Date.parse(permit.deadline) - now) / 1000 });
    this.#state();
    if (this.#clock.now() >= Date.parse(permit.deadline)) throw new AuthorizationError("deadline");
    return { binding: { definition: this.#handle.definition.name, kind: materialized.kind, declaration: this.#handle.digest, pinned: this.#handle.digest },
      envelope: { signed, beside: materialized.beside }, authorization: permit.authorization };
  }

  async #stageGesture(transaction: AuthorizationTransaction, input: AuthorizationInput, gesture: number, beside: Beside) {
    const step = await this.#retentionStep(input, [input], transaction);
    const [reference] = await transaction.retain([step], gesture, this.#options.lifetimeSeconds ?? DEFAULT_LIFETIME_SECONDS, row => this.#pending(row));
    try {
      const materialized = await transaction.fill(reference!.identity, reference!.position, this.#handle.definition, this.#items(), beside);
      return { reference: reference!, materialized };
    } catch (error) {
      if (!(error instanceof AuthorizationError) || error.reason !== "source") throw error;
      return { reference: reference!, materialized: null };
    }
  }

  async #submitCaptured(identity: AuthorizationIdentity, act: AuthorizedAct, gesture: number, beside: Beside = {}): Promise<Sent> {
    const captured = structuredClone({ identity, act, beside });
    this.#owner(captured.identity);
    await this.read(); this.#state();
    const key = captured.identity.key;
    if (this.#busy.has(key)) throw new CustodyError({ held: "locked" });
    this.#busy.add(key); this.#retry.delete(key);
    try {
      // Preview derives ordinary custody meaning but retains nothing when ready.
      // The real builder repeats this under admission and the signing fence.
      const preview = await this.#options.store.exclusive(async () => {
        this.#state(); const transaction = this.#authorization(this.#options.store.authorizations);
        const candidate = await this.#stageGesture(transaction, { key, act: captured.act }, gesture, captured.beside);
        if (!candidate.materialized) {
          this.#state();
          const row = await transaction.find(candidate.reference.identity);
          if (this.#clock.now() >= Date.parse(row!.versions[candidate.reference.position]!.deadline)) throw new AuthorizationError("deadline");
          await transaction.commit();
        }
        return candidate;
      });
      if (!preview.materialized) throw new AuthorizationError("source");
      const meaning = intentMeaning(preview.materialized), identity = { ...this.#who, key };
      const build = async (fence: CustodyBuildFence) => fence.authorizations(async port => {
        this.#state(); const transaction = this.#authorization(port);
        const candidate = await this.#stageGesture(transaction, { key, act: captured.act }, gesture, captured.beside);
        if (!candidate.materialized) {
          this.#state(); await transaction.commit(); throw new AuthorizationError("source");
        }
        if (canonicalize(candidate.materialized) !== canonicalize(preview.materialized)) throw new AuthorizationError("source");
        return this.#signRetained(transaction, candidate.reference, captured.beside);
      });
      const sent = await this.#custody.send(identity, meaning, build, (envelope, selected) => this.#deliver(envelope, selected), {
        notAfter: timeOf(this.#clock.now() + 30_000), bytes: utf8(canonicalize(preview.materialized)).length,
        authorization: { kind: "gesture" },
      });
      this.#busy.delete(key); await this.#after(sent); return sent;
    } finally { this.#busy.delete(key); await this.#sync(); }
  }

  /** Resume this exact occurrence: first sign once, or reuse genuine kept bytes. It never appends a gesture. */
  async sendAuthorization(reference: AuthorizationPosition): Promise<Sent> {
    const captured = structuredClone(reference); this.#owner(captured.identity);
    await this.read(); this.#state();
    const key = captured.identity.key, identity = { ...this.#who, key };
    if (this.#busy.has(key)) throw new CustodyError({ held: "locked" });
    this.#busy.add(key); this.#retry.delete(key);
    try {
      const existing = await this.#custody.find(identity), latest = existing?.signings.at(-1);
      const same = latest?.authorization && canonicalize({ identity: latest.authorization.identity, position: latest.authorization.position }) === canonicalize(captured);
      const terminal = existing && !unresolved(existing) && existing.phase !== "refused";
      let meaning: Digest;
      let build: (fence: CustodyBuildFence) => Promise<{ binding: BindingRecord; envelope: Envelope; authorization?: SigningAuthorization }> = neverBuild;
      if (existing && (same || terminal)) {
        if (!terminal && latest && (latest.dead || latest.closed || this.#clock.now() >= Date.parse(latest.notAfter))) {
          if (unresolved(existing)) throw new AuthorizationError("deadline");
        }
        meaning = existing.meaning;
      } else {
        const materialized = await this.#options.store.exclusive(async () => {
          this.#state(); const transaction = this.#authorization(this.#options.store.authorizations);
          const row = await transaction.find(captured.identity);
          if (!row || row.versions.length - 1 !== captured.position) throw new AuthorizationError("version");
          if (row.permissions.some(permission => permission.position === captured.position)) throw new AuthorizationError("authorization-used");
          return transaction.fill(captured.identity, captured.position, this.#handle.definition, this.#items());
        });
        meaning = intentMeaning(materialized);
        build = fence => fence.authorizations(async port => {
          this.#state(); const transaction = this.#authorization(port);
          const candidate = await transaction.fill(captured.identity, captured.position, this.#handle.definition, this.#items());
          if (canonicalize(candidate) !== canonicalize(materialized)) throw new AuthorizationError("source");
          return this.#signRetained(transaction, captured);
        });
      }
      const live = latest && !latest.dead && !latest.closed && this.#clock.now() < Date.parse(latest.notAfter);
      const sent = await this.#custody.send(identity, meaning, build, (envelope, selected) => this.#deliver(envelope, selected), {
        notAfter: timeOf(this.#clock.now() + 30_000), resubmit: !!live,
        authorization: { kind: "position", reference: captured },
      });
      this.#busy.delete(key); await this.#after(sent); return sent;
    } finally { this.#busy.delete(key); await this.#sync(); }
  }

  /** C3's internal selector preserves its consecutive-live-content copy rule. Public submitBoundAct is always a gesture. */
  async #request<K extends Kind<D>>(key: string, kind: K, values: AskedOf<D, K>): Promise<Sent> {
    const captured = structuredClone(values), gesture = this.#clock.now();
    await this.read(); this.#state();
    const shaped = shapeDeclaredAct(this.#handle.definition, kind, captured), declared = this.#handle.definition.acts[kind]!;
    const expected = expectedOf(declared, this.#items(), shaped.on, effectiveFields(declared, shaped.fields, this.#at));
    const asked = { to: this.#at, kind, on: shaped.on, fields: shaped.fields, expected };
    const existing = await this.#custody.find({ ...this.#who, key }), latest = existing?.signings.at(-1);
    this.#state();
    const equivalent = existing && canonicalize({ ...existing.envelope.signed.intent, notAfter: null })
      === canonicalize({ v: 1, ...asked, actor: this.#options.signer.key, idempotencyKey: key, notAfter: null });
    if (existing && latest && !signingDead(latest, this.#clock.now()) && equivalent) {
      if (latest.authorization) return this.sendAuthorization({ identity: latest.authorization.identity, position: latest.authorization.position });
      // Explicit legacy live-byte recovery invents no authorization.
      if (this.#busy.has(key)) throw new CustodyError({ held: "locked" });
      this.#busy.add(key);
      try {
        const sent = await this.#custody.send(existing.identity, existing.meaning, neverBuild, (envelope, selected) => this.#deliver(envelope, selected),
          { resubmit: true, notAfter: timeOf(this.#clock.now() + 30_000) });
        this.#busy.delete(key); await this.#after(sent); return sent;
      } finally { this.#busy.delete(key); await this.#sync(); }
    }
    const act: AuthorizedAct = { kind, on: shaped.on, fields: (captured as { fields?: Readonly<Record<string, unknown>> }).fields ?? {}, expected };
    return this.#submitCaptured(this.#authorizationIdentity(key), act, gesture, shaped.beside);
  }
}

export function scopeClient<const D extends DeclaredDefinition>(handle: DeclaredHandle<D>, options: ClientOptions<D>): ScopeClient<D> { return new ScopeClient(handle, options); }
/** Internal C3 regression selector. C4 uses the explicit instance operations; scope.ts does not export this seam. */
export function request<D extends DeclaredDefinition, K extends Kind<D>>(client: ScopeClient<D>, key: string, kind: K, values: AskedOf<D, K>): Promise<Sent> {
  return (requests.get(client) as RequestCall<D>)(key, kind, values);
}
