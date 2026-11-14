/**
 * The replica of a declared scope (`notes/2026-11-13-scope-client.md`, sections 6, 9
 * and 11; request 208a0378). It folds the scope's journal from the genesis entry,
 * read with `ScopeHandle.log`, and reads again each time the observation
 * names a later head.
 *
 * - One definition enters, with the `DeclaredHandle` that checked its
 *   digest.
 * - The replica keeps each entry that it folds, and gives the fold and the
 *   judge one `Own` over those entries (ruling b1b1d492).
 * - The state is `starting`, `current`, `behind`, `folding` or `stopped`.
 *   One `close()` cancels the observation. The replica holds no timer.
 * - A view holds the state, the head and an index of typed rows. The
 *   replica builds the index one time for each view.
 * - `judged` predicts signed bytes at the replica's head. `signed` and
 *   `accepted` give what an entry of one signer holds, for C3.
 *
 * It holds no custody record and sends nothing.
 */

import type { DeclaredDefinition, Digest, Entry, FactRef, FieldValue, Head, Intent, Item, KeyId, RefusalReason, SignedIntent } from "@generalbusiness/dap-contract";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { REFUSAL_CLASSES, intentDigest } from "@generalbusiness/dap-bytes";
import { MemoryState, applyEntry, validateDefinition, type ValidDefinition } from "@generalbusiness/dap-derive";
import type { DeclaredHandle, ValueOf } from "./declared.ts";
import { meaningOf } from "./custody.ts";
import type { Observation, ObservationState } from "./observe.ts";
import { HeldEntries } from "./replica-own.ts";
import { judgedOn, type Judged, type Judging } from "./replica-judged.ts";

// ---------------------------------------------------------------- the types

/** Why the replica stopped. `stopped` is final. */
export type Stopped =
  | { by: "close" }
  | { by: "protocol"; reason: RefusalReason }  // a refusal of class `protocol`
  | { by: "definition" }                       // the digest or the genesis check failed
  | { by: "forbidden" }                        // the member reads less than the whole journal
  | { by: "archived" }                         // the scope has an archive floor
  | { by: "fold" };                            // a second fold from the genesis entry failed

export type ReplicaState =
  | { is: "starting" | "current" | "behind" | "folding" }
  | { is: "stopped"; cause: Stopped };

/** The item types of a definition. */
export type TypeOf<D extends DeclaredDefinition> = keyof D["items"] & string;
type SlotValues<V> = { readonly [S in keyof V]: (V[S] extends { of: infer F } ? ValueOf<F> : FieldValue) | null };
/** An item of type `T`, with each value typed from its slot's declaration. */
export type Row<D extends DeclaredDefinition, T extends TypeOf<D> = TypeOf<D>> =
  { [U in T]: Omit<Item, "type" | "values"> & { readonly type: U; readonly values: SlotValues<D["items"][U]["values"]> } }[T];

/** One published value of the replica. It does not change. */
export interface ReplicaView<D extends DeclaredDefinition> {
  state: ReplicaState;
  head: Head | null;
  /** The items of that type, retained final ones included, lowest ID first. */
  rows<T extends TypeOf<D>>(type: T): readonly Row<D, T>[];
  row(ref: { item: number }): Row<D> | null;
}

/** What an entry of one signer holds, for the status rules of C3. */
export interface SignedEntry {
  fact: FactRef;
  actor: KeyId;
  key: string;
  /** The digest of the sealed intent. */
  intent: Digest;
  /** The digest of the intent's kind, item and fields. It excludes `expected` and `notAfter`. */
  meaning: Digest;
  /** The item that the entry opened, or null. */
  opened: number | null;
}

/** The observation of the scope's head, as `observeScope` gives it, with the replica's own `emit`. */
export type Observe = (emit: (state: ObservationState<unknown>) => void) => Observation;

export interface ReplicaOptions {
  observe: Observe;
}

/** The meaning of an intent: a digest of its kind, the item that it is on and its fields, which hold the digest of each detached text. */
export function intentMeaning(intent: Pick<Intent, "kind" | "on" | "fields">): Digest {
  return meaningOf({ kind: intent.kind, on: intent.on, fields: intent.fields });
}

// ---------------------------------------------------------------- the replica

type Listener<D extends DeclaredDefinition> = (view: ReplicaView<D>) => void;

/** TEST SEAM: the entry store and the state of a replica. `scope.ts` does not export it (ruling 7c8774a2, f). */
export interface Seam { held: HeldEntries; state(): MemoryState }
const seams = new WeakMap<object, Seam>();
export const seamOf = (replica: Replica<DeclaredDefinition>): Seam => seams.get(replica)!;

export class Replica<D extends DeclaredDefinition> {
  readonly #handle: DeclaredHandle<D>;
  readonly #definition: ValidDefinition | null;
  readonly #held = new HeldEntries(PROPOSED_BOUNDS.entryBytes);
  #state = new MemoryState();
  readonly #listeners = new Set<Listener<D>>();
  #observation: Observation | null = null;
  #view: ReplicaView<D>;

  #stopped: Stopped | null = null;
  /** A fold failed one time, and the replica folds again from the genesis entry. */
  #folding = false;
  /** The observation streams the scope's head. */
  #feed = false;
  /** The last read of the log failed. */
  #fault = false;
  /** The latest head that the feed or a caller named. */
  #target = -1;
  #reading: Promise<void> | null = null;
  #again = false;

  constructor(handle: DeclaredHandle<D>, options: ReplicaOptions) {
    this.#handle = handle;
    seams.set(this, { held: this.#held, state: () => this.#state });
    const checked = validateDefinition(handle.definition, PROPOSED_BOUNDS);
    this.#definition = checked.ok && checked.definition.digest === handle.digest ? checked.definition : null;
    this.#view = this.#compute({ is: "starting" }, null);
    if (!this.#definition) { this.#stop({ by: "definition" }); return; }
    const observation = options.observe((state) => this.#observed(state));
    if (this.#stopped) observation.cancel();
    else this.#observation = observation;
    void this.read();
  }

  get view(): ReplicaView<D> { return this.#view; }

  /** Call `listener` with each new view. Returns the call that ends it. */
  subscribe(listener: Listener<D>): () => void {
    this.#listeners.add(listener);
    return () => { this.#listeners.delete(listener); };
  }

  /**
   * Read the journal to its head. `to`: a head that an answer names. Until
   * the replica holds it, the state is `behind`. A read while one runs
   * joins it, and the running read reads again at its end.
   */
  read(to?: Head | number): Promise<void> {
    if (to !== undefined) this.#target = Math.max(this.#target, typeof to === "number" ? to : to.seq);
    if (this.#stopped) return Promise.resolve();
    if (this.#reading) { this.#again = true; return this.#reading; }
    this.#reading = this.#loop();
    return this.#reading;
  }

  /** The status of these signed bytes at the replica's head. Before the genesis entry, and when stopped: `not-judged`. */
  judged(signed: SignedIntent, judging: Judging): Judged {
    if (this.#stopped || !this.#definition) return { is: "not-judged" };
    return judgedOn({ state: this.#state, definition: this.#definition, held: this.#held }, signed, judging);
  }

  /** What the entry at `seq` holds when one signer signed it, or null. */
  signed(seq: number): SignedEntry | null {
    const held = this.#held.at(seq), at = this.#state.scope()?.at;
    if (!held || !at || held.entry.input.type !== "act") return null;
    const intent = held.entry.input.signed.intent;
    const opened = held.entry.effects.find((effect) => effect.effect === "open");
    return {
      fact: { at, seq, hash: held.hash }, actor: intent.actor, key: intent.idempotencyKey,
      intent: intentDigest(intent), meaning: intentMeaning(intent), opened: opened?.effect === "open" ? opened.item : null,
    };
  }

  /** The entry that holds this key of this actor, or null. */
  accepted(actor: KeyId, key: string): SignedEntry | null {
    const accepted = this.#state.accepted(actor, key);
    return accepted ? this.signed(accepted.seq) : null;
  }

  /** A refusal of class `protocol` stops the replica. Returns whether it stopped. */
  protocol(reason: RefusalReason): boolean {
    if (REFUSAL_CLASSES[reason] !== "protocol") return false;
    this.#stop({ by: "protocol", reason });
    return true;
  }

  /** Stop the replica and cancel the observation. */
  close(): void { this.#stop({ by: "close" }); }

  // ------------------------------------------------------------ reads and the fold

  async #loop(): Promise<void> {
    try {
      do {
        this.#again = false;
        await this.#readOnce();
      } while (this.#again && !this.#stopped);
    } finally {
      // Release ownership in the same continuation as the final pending-read check.
      this.#reading = null;
    }
  }

  async #readOnce(): Promise<void> {
    let cursor = this.#held.size === 0 ? undefined : String(this.#held.size);
    for (;;) {
      let reply: Awaited<ReturnType<DeclaredHandle<D>["scope"]["log"]>>;
      try { reply = await this.#handle.scope.log(cursor); }
      catch { if (!this.#stopped) { this.#fault = true; this.#publish(); } return; }
      if (this.#stopped) return;
      if (!reply.ok) {
        if (reply.reason === "archived") this.#stop({ by: "archived" });
        else if (reply.reason === "forbidden") this.#stop({ by: "forbidden" });
        else { this.#fault = true; this.#publish(); }
        return;
      }
      if (reply.coverage !== "whole") { this.#stop({ by: "forbidden" }); return; }
      if (reply.value.definition !== this.#handle.digest) { this.#stop({ by: "definition" }); return; }
      this.#target = Math.max(this.#target, reply.at.seq);
      for (const row of reply.value.entries) if (!this.#fold(row)) return;
      if (reply.next === undefined) break;
      cursor = reply.next;
    }
    this.#fault = false;
    this.#folding = false;
    this.#publish();
  }

  /** Fold one row. False: the replica stopped, or it folds again from the genesis entry. */
  #fold(row: { seq: number; hash: Digest; bytes: string }): boolean {
    const entry = JSON.parse(row.bytes) as Entry, input = entry.input;
    if (input.type === "floor") { this.#stop({ by: "archived" }); return false; }
    if (input.type === "genesis" && input.seed.definition !== this.#handle.digest) { this.#stop({ by: "definition" }); return false; }
    let failed = entry.seq !== this.#held.size;
    this.#held.take();
    if (!failed) {
      try { applyEntry(this.#state, this.#definition!, entry, row.hash, { bounds: PROPOSED_BOUNDS, own: this.#held.own }); }
      catch { failed = true; }
    }
    if (this.#held.take().length > 0) failed = true;
    if (!failed) { this.#held.put({ entry, hash: row.hash }, row.bytes); return true; }
    if (this.#folding) { this.#stop({ by: "fold" }); return false; }
    // One fold failure: fold again from the genesis entry, on a new state.
    this.#folding = true;
    this.#state = new MemoryState();
    this.#held.clear();
    this.#again = true;
    this.#publish();
    return false;
  }

  #observed(state: ObservationState<unknown>): void {
    if (this.#stopped) return;
    switch (state.status) {
      case "forbidden": this.#stop({ by: "forbidden" }); return;
      case "streaming":
        this.#feed = true;
        if (!this.#reading && this.#target > (this.#held.head?.seq ?? -1)) void this.read();
        break;
      case "current": this.#feed = true; this.#target = Math.max(this.#target, state.snapshot.at.seq); void this.read(); break;
      case "retained":
        if (state.reason === "subscription-ended") this.#feed = false;
        else if (state.reason === "newer-notice") { this.#target = Math.max(this.#target, state.snapshot.at.seq); void this.read(); }
        break;
      case "connecting": case "refreshing": case "cancelled": break;
      default: this.#feed = false;
    }
    this.#publish();
  }

  #stop(cause: Stopped): void {
    if (this.#stopped) return;
    this.#stopped = cause;
    this.#feed = false;
    const observation = this.#observation;
    this.#observation = null;
    observation?.cancel();
    this.#publish();
  }

  // ------------------------------------------------------------ the view

  #status(): ReplicaState {
    if (this.#stopped) return { is: "stopped", cause: this.#stopped };
    if (this.#folding) return { is: "folding" };
    const head = this.#held.head;
    if (!head) return { is: "starting" };
    return this.#feed && !this.#fault && head.seq >= this.#target ? { is: "current" } : { is: "behind" };
  }

  #publish(): void {
    const state = this.#status(), head = this.#held.head;
    if (state.is === this.#view.state.is && head?.hash === this.#view.head?.hash) return;
    this.#view = this.#compute(state, head);
    for (const listener of [...this.#listeners]) listener(this.#view);
  }

  /** A view, with its index of rows: one list for each type, and one map by item. */
  #compute(state: ReplicaState, head: Head | null): ReplicaView<D> {
    const byType = new Map<string, Item[]>(), byId = new Map<number, Item>();
    const types = this.#definition?.declared.items ?? {};
    if (head) {
      for (const [type, declared] of Object.entries(types)) {
        const items = this.#state.page(type, Object.keys(declared.states), null, Number.MAX_SAFE_INTEGER).items;
        byType.set(type, [...items]);
        for (const item of items) byId.set(item.id, item);
      }
    }
    return {
      state, head,
      rows: <T extends TypeOf<D>>(type: T) => (byType.get(type) ?? []) as unknown as readonly Row<D, T>[],
      row: (ref: { item: number }) => (byId.get(ref.item) ?? null) as Row<D> | null,
    };
  }
}

/** The replica of the scope that `handle` checked. It starts its first read at once. */
export function scopeReplica<const D extends DeclaredDefinition>(handle: DeclaredHandle<D>, options: ReplicaOptions): Replica<D> {
  return new Replica(handle, options);
}
