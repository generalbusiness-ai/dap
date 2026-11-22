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
import { REFUSAL_CLASSES, canonicalize, intentDigest, timeMs } from "@generalbusiness/dap-bytes";
import { MemoryState, actionOf, applyEntry, clockOf, judgeExploreGrant, membershipOf, validateDefinition, type ValidDefinition } from "@generalbusiness/dap-derive";
import type { DeclaredHandle, Kind, ValueOf } from "./declared.ts";
import { LogProtocolError } from "./handle.ts";
import { meaningOf } from "./custody.ts";
import type { Observation, ObservationState } from "./observe.ts";
import { HeldEntries } from "./replica-own.ts";
import { judgedOn, type Judged, type Judging } from "./replica-judged.ts";
import { actExplore, actExploreDue, actExploreSubjects } from "./act-explore.ts";
import { missingActInputs } from "./act-input.ts";
import type { Act, ActRef, ActView, Context, Exploration, ItemName, Lack, PartialAct, UnavailableContext } from "./act-types.ts";
import { scopeUsesSession } from "./scope-reader.ts";
import { registerChainExplore, registerExplore, type ChainExploreResult, type ChainExploreAuthority, type ExplorePrefix, type DraftExploreResult, type DraftSelection, type ExploreAuthority, type ReplicaExploration } from "./replica-explore.ts";
import { Session, sessionStanding } from "./session.ts";
import { UnavailableActSource } from "./act-symbols.ts";
import { selectDraftSubjects, type DraftSubjects } from "./draft-selection.ts";

// ---------------------------------------------------------------- the types

/** Why the replica stopped. `stopped` is final. */
export type Stopped =
  | { by: "close" }
  | { by: "log" }                              // the handle rejected a log page
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

export interface ReplicaOptions<D extends DeclaredDefinition = DeclaredDefinition> {
  observe: Observe;
  /** The one partial-context reader. It acquires no grant or foreign evidence. */
  exploration?: ReplicaExploration<D>;
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
  /** The revisions after each source entry that `authorizationSource` folded, by the entry's hash.
   * The answer for an entry never changes, so the key needs no head. A fold again from genesis clears it. */
  readonly #sources = new Map<Digest, Readonly<Record<number, number>>>();
  readonly #listeners = new Set<Listener<D>>();
  readonly #exploration: ReplicaExploration<D> | null;
  /** Actual journal-read and stop transitions only, not view ticks. */
  #explorationGeneration = 0;
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
  #reading: Promise<boolean> | null = null;
  #again = false;

  constructor(handle: DeclaredHandle<D>, options: ReplicaOptions<D>) {
    this.#handle = handle;
    const exploration = options.exploration;
    this.#exploration = exploration ? { actor: exploration.actor, member: structuredClone(exploration.member),
      clock: exploration.clock.bind(exploration), ...(exploration.read ? { read: exploration.read.bind(exploration) } : {}),
      ...(exploration.active ? { active: exploration.active.bind(exploration) } : {}) } : null;
    if (this.#exploration) {
      registerExplore<D>(this, (key, act, authority) => this.#explore(key, act, authority));
      registerChainExplore<D>(this, (prefix, key, act, authority) => this.#exploreChain(prefix, key, act, authority));
    }
    seams.set(this, { held: this.#held, state: () => this.#state });
    const checked = validateDefinition(handle.definition, PROPOSED_BOUNDS);
    this.#definition = checked.ok && checked.definition.digest === handle.digest ? checked.definition : null;
    this.#view = this.#compute({ is: "starting" }, null);
    if (!this.#definition) { this.#stop({ by: "definition" }); return; }
    const observation = options.observe((state) => this.#observed(state));
    if (this.#stopped) observation.cancel();
    else this.#observation = observation;
    void this.read().catch(() => {});
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
   * joins it, and the running read reads again at its end. True means the
   * final read reached a complete verified head; a failed read returns false.
   */
  read(to?: Head | number): Promise<boolean> {
    if (to !== undefined) this.#target = Math.max(this.#target, typeof to === "number" ? to : to.seq);
    if (this.#stopped) return Promise.resolve(false);
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

  /** Positive source evidence from this checked journal, with revisions immediately after that entry. */
  authorizationSource(actor: KeyId, key: string): { entry: SignedEntry; revisions: Readonly<Record<number, number>> } | null {
    if (this.#stopped || !this.#definition) return null;
    const entry = this.accepted(actor, key);
    if (!entry) return null;
    const kept = this.#sources.get(entry.fact.hash);
    if (kept) return { entry: structuredClone(entry), revisions: { ...kept } };
    const state = new MemoryState();
    const complete = this.#held.foldThrough(entry.fact.seq, (held, own) => {
      applyEntry(state, this.#definition!, held.entry, held.hash, { bounds: PROPOSED_BOUNDS, own });
    });
    if (!complete) return null;
    const scope = state.scope();
    if (!scope || scope.at.scope !== entry.fact.at.scope || scope.at.genesis !== entry.fact.at.genesis
      || scope.head.seq !== entry.fact.seq || scope.head.hash !== entry.fact.hash) return null;
    const revisions: Readonly<Record<number, number>> = Object.fromEntries(state.all().items.map(item => [item.id, item.revision]));
    this.#sources.set(entry.fact.hash, revisions);
    return { entry: structuredClone(entry), revisions: { ...revisions } };
  }

  /** A refusal of class `protocol` stops the replica. Returns whether it stopped. */
  protocol(reason: RefusalReason): boolean {
    if (REFUSAL_CLASSES[reason] !== "protocol") return false;
    this.#stop({ by: "protocol", reason });
    return true;
  }

  /** Stop the replica and cancel the observation. */
  close(): void { this.#stop({ by: "close" }); }

  /** The chain is private and requires the host's exact checked authority. */
  async #exploreChain<K extends Kind<D>>(prefix: readonly ExplorePrefix<D>[], key: string, act: PartialAct<D, K>, authority?: ChainExploreAuthority): Promise<ChainExploreResult<D, K>> {
    if (!authority || typeof authority.stillHeld !== "function") return { is: "unavailable", reason: "authority-unavailable" };
    const held = () => { try { return authority.stillHeld() === true; } catch { return false; } };
    if (!held()) return { is: "unavailable", reason: "authority-unavailable" };
    const captured = structuredClone(prefix);
    if (!captured.length) return { is: "unavailable", reason: "source" };
    let cut: { current: () => boolean; subjects: readonly { name: string; item: ItemName }[] } | null = null;
    const answer = await this.#explore(key, act, authority, captured, (current, subjects) => { cut = { current, subjects }; }, held);
    if (answer.exploration.is !== "admitted" || !cut) return { is: "unavailable",
      reason: answer.exploration.is === "unavailable" && answer.exploration.lacks.includes("authority-unavailable")
        ? "authority-unavailable" : "source" };
    const checked: { current: () => boolean; subjects: readonly { name: string; item: ItemName }[] } = cut;
    return { is: "admitted", exploration: answer.exploration, ...checked };
  }

  /** The operation stays inside this closure; no caller receives the state or Own. */
  async #explore<K extends Kind<D>>(key: string, input: PartialAct<D, K>, authority?: ExploreAuthority,
    prefix?: readonly ExplorePrefix<D>[], capture?: (current: () => boolean, subjects: readonly { name: string; item: ItemName }[]) => void,
    chainHeld?: () => boolean): Promise<DraftExploreResult<D, K>> {
    const binding = this.#exploration;
    if (!binding) throw new TypeError("exploration requires its constructor identity binding");
    // Own input before the reader's first await. It receives a separate copy.
    const captured = structuredClone(input);
    const missing = missingActInputs(this.#handle.definition, captured);
    if (missing.length > 0 || captured.kind === undefined) return { exploration: { is: "incomplete", act: captured, missing }, movement: null };
    const act = { kind: captured.kind, on: captured.on ?? null, fields: captured.fields ?? {},
      ...(captured.expected === undefined ? {} : { expected: captured.expected }) } as Act<D, K>;
    const state = this.#state, scope = state.scope(), generation = this.#explorationGeneration;
    let reading = authority ? authority.clock() : binding.clock();
    const unavailable = (lacks: readonly Lack[]): DraftExploreResult<D, K> => {
      const context: Context | UnavailableContext = {
        scope: structuredClone(this.#handle.at), definition: this.#handle.digest,
        head: scope ? structuredClone(scope.head) : null,
        actor: binding.actor, assumes: [], standing: null, clock: reading, evidence: [],
      };
      return { exploration: { is: "unavailable", act, context, lacks }, movement: null };
    };
    const current = (): boolean => {
      const actual = this.#state.scope(), head = this.#held.head;
      return this.#definition !== null && this.#definition.digest === this.#handle.digest
        && !this.#stopped && this.#reading === null
        && (binding.active?.() ?? true)
        && this.#status().is === "current" && this.#state === state && this.#explorationGeneration === generation
        && scope !== null && actual !== null && canonicalize(actual.head) === canonicalize(scope.head)
        && canonicalize(scope.at) === canonicalize(this.#handle.at)
        && head !== null && head.seq === scope.head.seq && head.hash === scope.head.hash;
    };
    if (!current()) return unavailable(["source"]);
    if (prefix && !chainHeld?.()) return unavailable(["authority-unavailable"]);
    if (!binding.read) return unavailable(["authority-unavailable"]);
    const read = await binding.read({ actor: binding.actor, member: structuredClone(binding.member),
      scope: structuredClone(this.#handle.at), definition: this.#handle.digest, head: structuredClone(scope!.head),
      key, act: structuredClone(captured) });
    reading = authority ? authority.clock() : binding.clock();
    if (prefix && !chainHeld?.()) return unavailable(["authority-unavailable"]);
    if (!current()) return unavailable(["source"]);
    if (read.is === "unavailable") return unavailable(read.lacks.length ? read.lacks : ["source"]);
    const session = read.session, claims = session instanceof Session ? session.claims : null;
    const genesis = this.#held.at(0)?.entry.input;
    const membership = genesis?.type === "genesis" ? membershipOf(genesis, scope!.at) : null;
    if (!claims || !membership || claims.key !== binding.actor || claims.member !== binding.member.member
      || canonicalize(claims.membership) !== canonicalize(binding.member.membership)
      || canonicalize(membership) !== canonicalize(binding.member.membership)
      || !scopeUsesSession(this.#handle.scope, session) || session.endedBy(reading)
      || timeMs(reading) === null) return unavailable(["authority-unavailable"]);
    let checkedAuthority: Context["authority"];
    let grants: Parameters<typeof import("@generalbusiness/dap-derive").judgeActBody>[3]["grants"] = null;
    if (authority) {
      const began = timeMs(authority.requestedAt), now = timeMs(reading);
      if (session !== authority.session || !session.standing || !sessionStanding(session.standing, { membership, key: binding.actor }, claims) || began === null || now === null || now < began
        || !Number.isSafeInteger(now - began)) return unavailable(["authority-unavailable"]);
      const declaration = Object.hasOwn(this.#definition!.declared.acts, act.kind) ? this.#definition!.declared.acts[act.kind] : undefined;
      if (!declaration) return unavailable(["authority-unavailable"]);
      const action = actionOf(declaration, this.#definition!);
      if (action === null) return unavailable(["authority-unavailable"]);
      const judged = judgeExploreGrant(session.standing, { scope: scope!.at, membership, key: binding.actor,
        action, clock: clockOf(state, reading) });
      if (judged.result === "authority-unavailable") return unavailable(["authority-unavailable"]);
      grants = judged.result === "current" ? [{ grant: judged.grant, current: true }] : [];
      checkedAuthority = { standing: structuredClone(session.standing), claims: structuredClone(claims),
        requestedAt: authority.requestedAt, authorityAge: now - began };
    }

    // A remote request is not a local outside operation. Inspect actual local
    // operation/record inventory as well as the pinned capability declarations.
    const snapshot = state.all();
    if (this.#definition!.declared.capabilities.length > 0 || snapshot.operations.length > 0
      || (snapshot.records?.length ?? 0) > 0) return unavailable(["source"]);
    const context = { actor: binding.actor, scope: structuredClone(this.#handle.at),
      clock: clockOf(state, reading), bounds: PROPOSED_BOUNDS, facts: [], prepared: [],
      own: this.#held.own, grants, membership, owners: null, evidence: [], ...(checkedAuthority ? { authority: checkedAuthority } : {}) };
    this.#held.take();
    let result: Exploration<D, K>;
    let chainSubjects: readonly { name: string; item: ItemName }[] | null = null;
    let earliestDue: number | null = null, judgesTime = false;
    const noteDue = (view: typeof state | ActView<D>): void => {
      const due = actExploreDue(this.#definition!, view);
      if (due) {
        const ms = timeMs(due.due);
        if (ms === null) throw new TypeError("the projected timer has no valid deadline");
        earliestDue = earliestDue === null ? ms : Math.min(earliestDue, ms);
      }
    };
    try {
      let view: typeof state | ActView<D> = state;
      let failed = false;
      for (const step of prefix ?? []) {
        noteDue(view);
        const declaration = step.act.kind === undefined ? undefined : Object.hasOwn(this.#definition!.declared.acts, step.act.kind)
          ? this.#definition!.declared.acts[step.act.kind] : undefined;
        const action = declaration ? actionOf(declaration, this.#definition!) : null;
        if (!authority || !session.standing || action === null) { failed = true; break; }
        const judged = judgeExploreGrant(session.standing, { scope: scope!.at, membership, key: binding.actor, action, clock: clockOf(state, reading) });
        if (judged.result !== "current") { failed = true; break; }
        const prior: Exploration<D, Kind<D>> = actExplore(this.#definition!, view, { key: step.source.key, act: step.act,
          context: { ...context, grants: [{ grant: judged.grant, current: true }] } });
        if (prior.is !== "admitted" || canonicalize(prior.source) !== canonicalize(step.source)) { failed = true; break; }
        judgesTime ||= prior.judgesTime;
        view = prior.after;
      }
      if (failed) result = unavailable(["source"]).exploration;
      else if (prefix) {
        noteDue(view);
        const dependent = actExploreSubjects(this.#definition!, view, { key, act: captured, context });
        result = dependent.exploration; chainSubjects = dependent.subjects;
        if (result.is === "admitted") judgesTime ||= result.judgesTime;
      } else result = actExplore(this.#definition!, state, { key, act: captured, context });
    }
    catch (error) {
      if (this.#held.take().length > 0) return unavailable(["source"]);
      throw error;
    }
    if (this.#held.take().length > 0) return unavailable(["source"]);
    if (prefix) {
      const started = authority?.requestedAt;
      const remains = () => {
        if (!current() || !chainHeld?.() || !authority || authority.session !== session || authority.requestedAt !== started || !session.standing) return false;
        const now = authority.clock(), ms = timeMs(now), read = timeMs(reading), began = timeMs(started);
        if (ms === null || read === null || began === null || ms < read || ms < began || !Number.isSafeInteger(ms - began)
          || session.endedBy(now) || clockOf(state, now).behind || !scopeUsesSession(this.#handle.scope, session)
          || !sessionStanding(session.standing, { membership, key: binding.actor }, claims)) return false;
        if (judgesTime && ms !== read) return false;
        return earliestDue === null || ms < earliestDue;
      };
      if (!remains() || !chainSubjects) return unavailable(["source"]);
      capture?.(remains, chainSubjects);
    }
    if (result.is !== "refused" || result.reason !== "revision-moved") return { exploration: result, movement: null };

    // No await separates the body judgment from these recorded selections.
    // This is owned return data, not a later Client view or a hidden ref cut.
    const declared = this.#handle.definition.acts[act.kind]!;
    let selection: DraftSubjects;
    try { selection = selectDraftSubjects({ declaration: declared, scope: scope!.at, rows: snapshot.items, values: act }); }
    catch (error) { if (error instanceof UnavailableActSource) return unavailable(["source"]); throw error; }
    const reference = (id: number): ActRef | null => {
      const row = snapshot.items.find(item => item.id === id);
      return row ? { name: row.id, seen: row.revision, assumes: [] } : null;
    };
    const subjects: Readonly<Record<string, DraftSelection>> = Object.fromEntries(selection.names.map((name): [string, DraftSelection] => {
      const ref = Object.hasOwn(selection.selected, name) ? reference(selection.selected[name]!) : null;
      return [name, ref ? { is: "present", ref } : { is: "absent" }];
    }));
    return { exploration: result, movement: structuredClone({ head: scope!.head,
      now: selection.on === null ? null : reference(selection.on), subjects }) };
  }

  // ------------------------------------------------------------ reads and the fold

  async #loop(): Promise<boolean> {
    let complete = false;
    try {
      do {
        this.#again = false;
        complete = await this.#readOnce();
      } while (this.#again && !this.#stopped);
      return complete && !this.#stopped;
    } finally {
      // Release ownership in the same continuation as the final pending-read check.
      this.#reading = null;
    }
  }

  async #readOnce(): Promise<boolean> {
    this.#explorationGeneration++;
    let cursor = this.#held.size === 0 ? undefined : String(this.#held.size);
    for (;;) {
      let reply: Awaited<ReturnType<DeclaredHandle<D>["scope"]["log"]>>;
      try { reply = await this.#handle.scope.log(cursor); }
      catch (error) {
        if (!this.#stopped) {
          if (error instanceof LogProtocolError) this.#stop({ by: "log" });
          else { this.#fault = true; this.#publish(); }
        }
        return false;
      }
      if (this.#stopped) return false;
      if (!reply.ok) {
        if (reply.reason === "archived") this.#stop({ by: "archived" });
        else if (reply.reason === "forbidden") this.#stop({ by: "forbidden" });
        else { this.#fault = true; this.#publish(); }
        return false;
      }
      if (reply.coverage !== "whole") { this.#stop({ by: "forbidden" }); return false; }
      if (reply.value.definition !== this.#handle.digest) { this.#stop({ by: "definition" }); return false; }
      this.#target = Math.max(this.#target, reply.at.seq);
      for (const row of reply.value.entries) if (!this.#fold(row)) return false;
      if (reply.next === undefined) break;
      cursor = reply.next;
    }
    this.#fault = false;
    this.#folding = false;
    this.#publish();
    return true;
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
    this.#sources.clear();
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
        if (!this.#reading && this.#target > (this.#held.head?.seq ?? -1)) void this.read().catch(() => {});
        break;
      case "current": this.#feed = true; this.#target = Math.max(this.#target, state.snapshot.at.seq); void this.read().catch(() => {}); break;
      case "retained":
        if (state.reason === "subscription-ended") this.#feed = false;
        else if (state.reason === "newer-notice") { this.#target = Math.max(this.#target, state.snapshot.at.seq); void this.read().catch(() => {}); }
        break;
      case "connecting": case "refreshing": case "cancelled": break;
      default: this.#feed = false;
    }
    this.#publish();
  }

  #stop(cause: Stopped): void {
    if (this.#stopped) return;
    this.#explorationGeneration++;
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
    for (const listener of [...this.#listeners]) {
      try { listener(this.#view); } catch { /* A subscriber cannot break this read or the next subscriber. */ }
    }
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
export function scopeReplica<const D extends DeclaredDefinition>(handle: DeclaredHandle<D>, options: ReplicaOptions<D>): Replica<D> {
  return new Replica(handle, options);
}
