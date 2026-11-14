/** Requests over a declared replica: custody owns bytes, the replica owns facts, and one schedule owns time. */
import type { Answer, DeclaredDefinition, Digest, FieldValue, Head, Intent, MemberId, MemberRef, ScopeRef } from "@generalbusiness/dap-contract";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { REFUSAL_CLASSES, canonicalize, textDigest, timeOf, utf8 } from "@generalbusiness/dap-bytes";
import { changeItem, isItemEffect, newItem, validateDefinition, type PredictionActor, type ValidDefinition } from "@generalbusiness/dap-derive";
import { Custody, CustodyError, Lost, envelopeOf, identityId, meaningOf, type ClientCustodyStore, type CustodyRecord, type Envelope, type Identity, type Outcome, type Sent } from "./custody.ts";
import { shapeDeclaredAct, type AskedOf, type DeclaredHandle, type Kind, type ShapeFieldType } from "./declared.ts";
import { effectiveFields, expectedOf } from "./expected.ts";
import { DEFAULT_LIFETIME_SECONDS, signedIntent, type Signer } from "./intent.ts";
import { sendableAt } from "./originals.ts";
import { scopeReplica, intentMeaning, type Replica, type ReplicaOptions, type ReplicaView, type Row, type TypeOf } from "./replica.ts";
import type { Judged } from "./replica-judged.ts";
import { requestStatus, signingDead, type RequestStatus } from "./request-status.ts";
import { RequestSchedule, wallClock, type ClientClock } from "./request-schedule.ts";

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
  store: ClientCustodyStore;
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
/** Await actual queued memory-port work in owning tests; no clock advances and no package export. */
export const clientIdle = (client: object): Promise<void> => flushers.get(client)!();
/** Test-only correspondence seam; scope.ts does not export it. */
export const clientReplica = <D extends DeclaredDefinition>(client: ScopeClient<D>): Replica<D> => replicas.get(client) as Replica<D>;

export class ScopeClient<D extends DeclaredDefinition> {
  readonly #handle: DeclaredHandle<D>;
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
    this.#handle = handle; this.#options = options;
    this.#clock = options.clock ?? wallClock;
    this.#schedule = new RequestSchedule(this.#clock);
    this.#custody = new Custody(options.store, () => timeOf(this.#clock.now()));
    this.#actor = { key: options.signer.key, member: { membership: options.member.membership, member: options.member.member }, principal: options.member.principal };
    this.#who = { service: options.member.service, membership: options.member.membership, signer: options.signer.key, target: handle.at };
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
    })().finally(() => { this.#running = null; });
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
    this.#ending = (async () => {
      while (this.#absenceProof && !this.#closed) {
        const current = this.#absenceProof;
        this.#absenceProof = null;
        await this.#markAbsent(current);
      }
    })().finally(() => { this.#ending = null; });
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

  async #deliver(envelope: Envelope): Promise<Answer> {
    try { return await this.#schedule.bounded(() => { this.#current(); return this.#handle.submit(envelope.signed, [], envelope.beside); }); }
    catch { throw new Lost(); }
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
      const sent = await this.#custody.send(record.identity, record.meaning, neverBuild, envelope => this.#deliver(envelope), { notAfter: timeOf(this.#clock.now() + 30_000) });
      this.#busy.delete(key);
      await this.#after(sent);
    } catch (error) {
      if (!(error instanceof CustodyError) || error.why.held !== "locked") throw error;
      this.#retry.add(key); this.#retryAt.set(key, this.#clock.now() + 1000);
    } finally { this.#busy.delete(key); await this.#sync(); }
  }

  #available(): boolean { return !this.#closed && !this.#stopping && this.#replica.view.state.is !== "stopped"; }
  #current(): void { if (!this.#available()) throw new Error("the scope client no longer owns this request"); }

  async #request<K extends Kind<D>>(key: string, kind: K, values: AskedOf<D, K>): Promise<Sent> {
    await this.read();
    if (this.#closed || !["current", "behind"].includes(this.#replica.view.state.is)) throw new Error("the scope client cannot submit in this state");
    if (this.#busy.has(key)) throw new CustodyError({ held: "locked" });
    const shaped = shapeDeclaredAct(this.#handle.definition, kind, values), act = this.#handle.definition.acts[kind]!;
    const items = Object.keys(this.#handle.definition.items).flatMap(type => [...this.#replica.view.rows(type)]);
    const expected = expectedOf(act, items, shaped.on, effectiveFields(act, shaped.fields, this.#handle.at));
    const asked = { to: this.#handle.at, kind, on: shaped.on, fields: shaped.fields, expected };
    const meaning = intentMeaning(asked), identity = { ...this.#who, key };
    const existing = await this.#custody.find(identity);
    this.#current();
    const equivalent = (intent: Intent) => canonicalize({ ...intent, notAfter: null }) === canonicalize({ v: 1, ...asked, actor: this.#options.signer.key, idempotencyKey: key, notAfter: null });
    // Ruling 78016c59: reuse only the latest live signing. An earlier match becomes a new signing.
    const latest = existing?.signings.at(-1);
    const reuse = existing && latest && !signingDead(latest, this.#clock.now()) && equivalent(existing.envelope.signed.intent);
    const build = async () => {
      this.#current();
      const signed = await signedIntent(this.#options.signer, asked, { idempotencyKey: key, now: this.#clock.now(), lifetimeSeconds: this.#options.lifetimeSeconds ?? DEFAULT_LIFETIME_SECONDS });
      this.#current();
      return { binding: { definition: this.#handle.definition.name, kind, declaration: this.#handle.digest, pinned: this.#handle.digest }, envelope: { signed, beside: shaped.beside } };
    };
    this.#busy.add(key); this.#retry.delete(key);
    try {
      const sent = await this.#custody.send(identity, meaning, build, envelope => this.#deliver(envelope), {
        notAfter: timeOf(this.#clock.now() + 30_000), bytes: utf8(canonicalize(shaped)).length,
        ...(reuse ? { resubmit: true } : { resign: true }),
      });
      this.#busy.delete(key);
      await this.#after(sent);
      return sent;
    } finally { this.#busy.delete(key); await this.#sync(); }
  }
}

export function scopeClient<const D extends DeclaredDefinition>(handle: DeclaredHandle<D>, options: ClientOptions<D>): ScopeClient<D> { return new ScopeClient(handle, options); }
/** Internal C3 request seam. C4 calls it from submit; the package entry does not export it. */
export function request<D extends DeclaredDefinition, K extends Kind<D>>(client: ScopeClient<D>, key: string, kind: K, values: AskedOf<D, K>): Promise<Sent> {
  return (requests.get(client) as RequestCall<D>)(key, kind, values);
}
