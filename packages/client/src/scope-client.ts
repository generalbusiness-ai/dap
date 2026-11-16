/** Requests over a declared replica: custody owns bytes, the replica owns facts, and one schedule owns time. */
import type { Answer, Beside, DeclaredDefinition, Digest, FieldValue, Head, MemberId, MemberRef, ScopeRef } from "@generalbusiness/dap-contract";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { REFUSAL_CLASSES, actDescriptorDigest, canonicalize, intentDigest, isDigest, isLocalId, isRecord, same, textDigest, timeOf, utf8 } from "@generalbusiness/dap-bytes";
import { changeItem, isItemEffect, newItem, validateDefinition, type PredictionActor, type ValidDefinition } from "@generalbusiness/dap-derive";
import { Custody, CustodyError, Lost, envelopeOf, meaningOf, validKey, type BindingRecord, type ClientCustodyStore, type CustodyRecord, type DeliveryOccurrence, type Envelope, type Identity, type Outcome, type Sent } from "./custody.ts";
import { ShapeError, shapeDeclaredAct, shapeFieldsOf, type AskedOf, type DeclaredHandle, type Kind, type ShapeFieldType } from "./declared.ts";
import { shapeDeclaredValues } from "./declared-shape.ts";
import { effectiveFields, expectedOf } from "./expected.ts";
import { DEFAULT_LIFETIME_SECONDS, newIdempotencyKey, signedIntent, type Signer } from "./intent.ts";
import { sendableAt } from "./originals.ts";
import { scopeReplica, intentMeaning, type Replica, type ReplicaOptions, type ReplicaView, type Row, type SignedEntry, type TypeOf } from "./replica.ts";
import type { Judged } from "./replica-judged.ts";
import { requestStatus, signingDead, type RequestStatus } from "./request-status.ts";
import { RequestSchedule, wallClock, type ClientClock } from "./request-schedule.ts";
import { AuthorizationError, AuthorizationTransaction, type Authorization, type AuthorizationIdentity, type AuthorizationInput, type AuthorizationPosition, type AuthorizedAct, type MaterializedAct, type RetainAuthorization, type SigningAuthorization } from "./authorization.ts";
import type { AuthorizationPort, CustodyBuildFence } from "./authorization-store.ts";
import type { ItemName, PartialAct, Source } from "./act-types.ts";
import { actVersion } from "./act-version.ts";
import { lowerActNames } from "./act-symbols.ts";
import { exploreReplica, registerExplore, type DraftExploreResult, type ReadExploreInputs } from "./replica-explore.ts";
import { openDraftCustodyCut, type DraftCustodyObservation } from "./draft-custody.ts";
import { prepareDraftClear, prepareDraftEdit } from "./draft-edit.ts";
import { ownDraftClearInputs, ownDraftEditInputs } from "./draft-preflight.ts";
import { draftNowOf, readDraftNow, type DraftNow, type DraftViewCut } from "./draft-now.ts";
import { projectDrafts } from "./draft-project.ts";
import { adoptionBatch, checkDraftNow, composeDraftCandidate, type DraftCandidate } from "./draft-submit.ts";
import type { DraftKeyEvidence, DraftProjection, DraftRequestListEntry, DraftRequestStatus, DraftViewKinds, HistoricalKeyEvidence,
  LocalDraftActivity, ProjectStoredKey } from "./draft-project-types.ts";
import type { DraftSelectionRow } from "./draft-selection.ts";
import { ownDraftSlot, slotAddress, slotFor, type ClearField, type DraftIndex, type EditPatch, type Slot, type SlotInput } from "./draft-slot.ts";
import { descriptorFor, readStoredDrafts, refineDraft, type DraftBinding, type DraftDismissal, type DraftPort, type DraftSlot, type StoredDraft, type StoredDraftEntry } from "./draft-store.ts";

/** Seat holds no principal and uses an origin; this port states the four facts C3 needs, each once (ruling e868dd08). */
export interface ScopeMember { service: string; membership: ScopeRef; member: MemberId; principal: MemberRef | null }
export interface PresentRequest<D extends DeclaredDefinition> { kind: Kind<D>; values: AskedOf<D, Kind<D>> }
export interface ClientOptions<D extends DeclaredDefinition> extends Omit<ReplicaOptions<D>, "exploration"> {
  /** Read authentication for the one Replica-owned partial exploration context. */
  exploration?: ReadExploreInputs<D>;
  signer: Signer;
  member: ScopeMember;
  store: ClientCustodyStore & { authorizations: AuthorizationPort };
  /** The one raw whole-batch draft port. A member call writes it under the store's exclusive fence; background work never does. */
  drafts: DraftPort;
  clock?: ClientClock;
  lifetimeSeconds?: number;
}
/** The request arm of the list. Planner 6d3b979f item 3: every reader narrows the list with one switch on `is`. */
export type RequestView<D extends DeclaredDefinition> = RequestStatus & {
  is: "request";
  key: string;
  kind: Kind<D>;
  values: AskedOf<D, Kind<D>>;
  predicted: Judged | null;
};
export type ClientRow<D extends DeclaredDefinition, T extends TypeOf<D> = TypeOf<D>> = Row<D, T> & { pending?: { key: string } };
export interface ClientView<D extends DeclaredDefinition> extends Omit<ReplicaView<D>, "row" | "rows"> {
  rows<T extends TypeOf<D>>(type: T): readonly ClientRow<D, T>[];
  /** Custody requests, partial draft entries in the list, and held stored intentions. Recorded requests leave this list. */
  requests: readonly DraftRequestListEntry<D>[];
  /** Editing and submitting drafts by slot address. Waiting drafts appear in `requests`. */
  drafts: DraftIndex<D, DraftViewKinds<D>>;
  row(ref: { item: number } | { key: string }): ClientRow<D> | null;
}
interface ReadProof { began: number; head: Head }
interface Held { record: CustodyRecord; outcomes: Outcome[] }
/** One member call's stop. `committed` names the key of a draft that this call changed: a write that already took effect in the same call.
 * A submit that an exploration returns (`revision-moved`) stops with `state` and `committed: key`; the view then shows the
 * return and its `now`. A submit that stops after its adoption write names the key too. */
export type DraftStop = { readonly stop: "shape"; readonly path: string; readonly message: string }
  | { readonly stop: "state" | "taken" | "descriptor-mismatch" | "definition-mismatch" };
export type DraftCall<T> = { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly stop: DraftStop; readonly committed?: string };
/** The raw batch and finite custody observations one candidate decides from. */
interface Cut { entries: readonly StoredDraftEntry[]; seen: ReadonlyMap<string, DraftCustodyObservation> }
interface Classified { status: RequestStatus; predicted: Judged }
/** One member call's reads. `key` is the editing key, or the one allocated key of a new intention. */
interface Context { entries: readonly StoredDraftEntry[]; rows: readonly StoredDraft[]; seen: ReadonlyMap<string, DraftCustodyObservation>; key: string }
interface Assembled<D extends DeclaredDefinition> {
  held: Map<string, Held>;
  classes: Map<string, Classified>;
  projection: DraftProjection<D>;
}
/** A publication candidate ended because the client closed. It is not an error of the caller. */
class CandidateClosed extends Error {}
const completed = (record: CustodyRecord): boolean => ["accepted", "archived", "settled"].includes(record.phase);
const stopped = (error: unknown): DraftStop | null => {
  if (error instanceof ShapeError) return { stop: "shape", path: error.path, message: error.message };
  if (error instanceof AuthorizationError && (error.reason === "descriptor-mismatch" || error.reason === "definition-mismatch")) return { stop: error.reason };
  return null;
};
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
  readonly #binding: DraftBinding;
  /** The occurrence that `submit` owns between its adoption write and the end of step 7. Another member call on that key stops `taken`. */
  readonly #submitting = new Map<string, StoredDraft>();
  #held = new Map<string, Held>();
  #view: ClientView<D>;
  #folding = false;
  #foldAgain = false;
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
    // First, before any storage, schedule, Replica or observation: the Replica constructor already starts a read.
    const drafts = options.drafts as DraftPort | undefined;
    if (!drafts || typeof drafts.read !== "function" || typeof drafts.write !== "function" || typeof drafts.observe !== "function") {
      throw new TypeError("ClientOptions.drafts requires a DraftPort");
    }
    options = { ...options, drafts, member: structuredClone(options.member),
      signer: { key: options.signer.key, sign: options.signer.sign.bind(options.signer) } };
    this.#handle = handle; this.#options = options;
    this.#at = structuredClone(handle.at);
    this.#binding = { owner: options.signer.key, scope: this.#at, definition: handle.digest,
      descriptors: Object.fromEntries(Object.keys(handle.definition.acts).map(kind => [kind, actDescriptorDigest(handle.definition, kind)])) };
    this.#clock = options.clock ?? wallClock;
    this.#schedule = new RequestSchedule(this.#clock);
    this.#custody = new Custody(options.store, () => timeOf(this.#clock.now()));
    this.#actor = { key: options.signer.key, member: { membership: options.member.membership, member: options.member.member }, principal: options.member.principal };
    this.#who = { service: options.member.service, membership: options.member.membership, signer: options.signer.key, target: this.#at };
    const checked = validateDefinition(handle.definition, PROPOSED_BOUNDS);
    this.#definition = checked.ok ? checked.definition : null;
    const lifetime = options.lifetimeSeconds ?? DEFAULT_LIFETIME_SECONDS;
    if (!(lifetime > 0 && lifetime <= PROPOSED_BOUNDS.intentLifetimeSeconds)) throw new RangeError("the client signing lifetime exceeds its bound");
    this.#replica = scopeReplica(handle, { exploration: { actor: options.signer.key,
      member: { membership: options.member.membership, member: options.member.member },
      clock: () => timeOf(this.#clock.now()), active: () => this.#available(),
      ...(options.exploration ? { read: options.exploration.bind(options) } : {}) },
      observe: emit => options.observe(state => {
      const returned = state.status === "streaming" && !this.#feed;
      if (state.status === "streaming" || state.status === "current") this.#feed = true;
      else if (!["connecting", "refreshing", "retained"].includes(state.status) || state.status === "retained" && state.reason === "subscription-ended") this.#feed = false;
      emit(state);
      if (returned) this.#background(() => this.#reconnected());
    }) });
    replicas.set(this, this.#replica);
    registerExplore<D>(this, (key, act) => exploreReplica(this.#replica, key, act));
    this.#view = this.#compute(this.#assemble({ entries: [], seen: new Map() }));
    this.#stopStore = options.store.observe(() => { this.#background(() => this.#sync()); });
    this.#stopDrafts = options.drafts.observe(() => { this.#background(() => this.#sync()); });
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

  // ---------------------------------------------------------------- C4 member calls
  // Each call owns its inputs before its first await, takes the store's one exclusive fence, reads the raw draft
  // batch once and each relevant exact custody identity once, decides synchronously, and joins one whole-batch write.
  // A submit reads two times, around its exploration, which waits outside the fence.

  /** A Slot is a value: the kind, the primary ref and every supplied item ref. It reads and captures nothing. */
  slot<const K extends Kind<D>>(kind: K, input: SlotInput<D, K>): Slot<D, K> { return slotFor(this.#handle.definition, kind, input); }

  /** Patch the draft in this slot, or create it. Omitted and own-undefined fields keep their values. */
  async edit<K extends Kind<D>>(slot: Slot<D, K>, values: EditPatch<D, K>): Promise<DraftCall<string>> {
    let owned;
    try { owned = ownDraftEditInputs(this.#handle.definition, slot, values); } catch (error) { return this.#refused(error); }
    const address = slotAddress(this.#handle.definition, owned.slot), displayed = this.#displayed(owned.slot);
    return this.#member(async (): Promise<DraftCall<string>> => {
      const context = await this.#acquire(address, displayed, true);
      if ("stop" in context) return { ok: false, stop: context.stop };
      // Final synchronous decision: no await separates it from the write below.
      const decided = this.#decide(context, displayed);
      if ("stop" in decided) return { ok: false, stop: decided.stop };
      if (!this.#acceptable()) return { ok: false, stop: { stop: "state" } };
      const prepared = prepareDraftEdit({ binding: this.#binding, definition: this.#handle.definition, rows: this.#selectionRows(),
        slot: address, namedRefs: structuredClone({ on: owned.slot.on, fields: owned.slot.fields }) as unknown as StoredDraft["namedRefs"],
        current: decided.current, key: context.key, patch: owned.patch });
      if (!prepared.ok) return { ok: false, stop: { stop: prepared.stop } };
      await this.#options.drafts.write(this.#binding.owner, this.#at, this.#placed(context.entries, address, prepared.draft));
      return { ok: true, value: context.key };
    });
  }

  /** Remove named non-address fields from the editing draft. It never creates a draft and keeps the key. */
  async clear<K extends Kind<D>>(slot: Slot<D, K>, fields: readonly ClearField<D, K>[]): Promise<DraftCall<string>> {
    let owned;
    try { owned = ownDraftClearInputs(this.#handle.definition, slot, fields); } catch (error) { return this.#refused(error); }
    const address = slotAddress(this.#handle.definition, owned.slot), displayed = this.#displayed(owned.slot);
    if (displayed === null) return { ok: false, stop: { stop: "taken" } };
    return this.#member(async (): Promise<DraftCall<string>> => {
      const context = await this.#acquire(address, displayed, false);
      if ("stop" in context) return { ok: false, stop: context.stop };
      const decided = this.#decide(context, displayed);
      if ("stop" in decided) return { ok: false, stop: decided.stop };
      if (!decided.current) return { ok: false, stop: { stop: "taken" } };
      if (!this.#acceptable()) return { ok: false, stop: { stop: "state" } };
      const prepared = prepareDraftClear({ binding: this.#binding, definition: this.#handle.definition, rows: this.#selectionRows(),
        current: decided.current, names: owned.names });
      if (!prepared.ok) return { ok: false, stop: { stop: prepared.stop } };
      await this.#options.drafts.write(this.#binding.owner, this.#at, this.#placed(context.entries, address, prepared.draft));
      return { ok: true, value: context.key };
    });
  }

  /** Remove the editing draft in this slot. It cancels no request. */
  async discard<K extends Kind<D>>(slot: Slot<D, K>): Promise<DraftCall<void>> {
    let owned;
    try { owned = ownDraftSlot(this.#handle.definition, slot); } catch (error) { return this.#refused(error); }
    const address = slotAddress(this.#handle.definition, owned), displayed = this.#displayed(owned);
    if (displayed === null) return { ok: false, stop: { stop: "taken" } };
    return this.#member(async (): Promise<DraftCall<void>> => {
      const context = await this.#acquire(address, displayed, false);
      if ("stop" in context) return { ok: false, stop: context.stop };
      const decided = this.#decide(context, displayed);
      if ("stop" in decided) return { ok: false, stop: decided.stop };
      if (!decided.current) return { ok: false, stop: { stop: "taken" } };
      await this.#options.drafts.write(this.#binding.owner, this.#at, context.entries.filter(entry => entry.key !== context.key));
      return { ok: true, value: undefined };
    });
  }

  /** Put an unsent intention back. A held or other-recorded one starts a new key; a returned one keeps its key. */
  restore(key: string): Promise<DraftCall<void>> { return this.#dispose(key, "restore"); }
  /** Suppress the notice of an unsent intention. A historical-descriptor row is removed. No custody record changes. */
  dismiss(key: string): Promise<DraftCall<void>> { return this.#dispose(key, "dismiss"); }

  /** The one submit of a draft. Steps 1 to 7 are the check order of `general-now-call-shape-20261116/PROPOSAL.md` section (b).
   * `now` is the value that the returned draft showed. An editing draft takes none. There is no hidden retry: a scope
   * refusal after step 5 leaves the draft returned (form 2) with a new `now` in the view, and the member submits again. */
  async submit<K extends Kind<D>>(slot: Slot<D, K>, now?: DraftNow | null): Promise<DraftCall<string>> {
    const definition = this.#handle.definition;
    // Step 1: copy and validate `slot` and `now` before any `await`. An ill-shaped value stops with `shape`.
    let owned: Slot<D, K>, passed: DraftNow | null | undefined;
    try {
      owned = ownDraftSlot(definition, slot);
      passed = now === undefined || now === null ? now : readDraftNow(now);
    } catch (error) { return this.#refused(error); }
    const address = slotAddress(definition, owned), displayed = this.#displayed(owned);
    if (displayed === null) return { ok: false, stop: { stop: "taken" } };
    // Two fenced sections surround the exploration, which waits for the network outside any fence. The first decides and
    // composes the candidate (steps 2 to 4). The second reads the batch again and requires the same stored draft (step 5 on).
    const first = await this.#member<{ stored: StoredDraft; candidate: DraftCandidate; adopted: StoredDraft | null }>(async () => {
      // Step 2: under the one exclusive fence, read the raw batch and the key's occurrence once; apply `taken`, then `state`.
      // `taken` outranks every `now` check below.
      const context = await this.#acquire(address, displayed, false);
      if ("stop" in context) return { ok: false, stop: context.stop };
      const decided = this.#decide(context, displayed);
      if ("stop" in decided) return { ok: false, stop: decided.stop };
      const stored = decided.current;
      if (!stored) return { ok: false, stop: { stop: "taken" } };
      if (!this.#acceptable()) return { ok: false, stop: { stop: "state" } };
      // Step 3: decide whether the draft is returned from this call's own rows, then compare `now` with that fact.
      // A returned draft whose view lacks a subject stops with `state` before any `now` comparison.
      const cut = this.#viewCut();
      const shown = projectDrafts<D>({ definition, binding: this.#binding, identity: this.#who, state: this.#replica.view.state, cut,
        stored: [this.#cell(stored, context.seen.get(stored.key)!, new Map())], custodyOnly: [] }).drafts.get(owned);
      const returned = shown !== undefined && shown.state === "editing" && shown.returned !== undefined;
      const checked = checkDraftNow({ definition, stored, returned, view: draftNowOf({ definition, stored, scope: this.#at, cut }), now: passed });
      if (!checked.ok) return { ok: false, stop: checked.stop === "state" ? { stop: "state" } : { stop: "shape", path: checked.field, message: checked.what } };
      // Step 4: the candidate in memory, from the stored act with `expected` replaced from `now`. No edit default, no recapture.
      // An editing draft has no `now`: its stored act is the candidate and nothing is adopted.
      let candidate: DraftCandidate;
      let adopted: StoredDraft | null = null;
      if (checked.now === null) candidate = { kind: stored.act.kind, on: stored.act.on, fields: stored.act.fields, expected: stored.act.expected };
      else {
        const composed = composeDraftCandidate({ definition, stored, now: checked.now });
        if (!composed.ok) return { ok: false, stop: { stop: "shape", path: composed.field, message: composed.what } };
        candidate = composed.candidate; adopted = composed.adopted;
      }
      return { ok: true, value: { stored, candidate, adopted } };
    });
    if (!first.ok) return first;
    const { stored, candidate, adopted } = first.value;
    // Step 5: `actExplore` over the candidate through the Replica's one registered exploration, outside the fence. It signs
    // nothing, and its `result.act` is never taken: it can autofill an omitted key. The reader may wait for the network, so
    // other member calls run meanwhile.
    let explored: DraftExploreResult<D, K>;
    try {
      explored = await exploreReplica(this.#replica, stored.key, candidate as unknown as PartialAct<D, K>);
      this.#current();
    } catch (error) { return this.#refused(error); }
    const launch = await this.#member<{ key: string; act: AuthorizedAct; adopted: boolean }>(async () => {
      // Step 5, second section: the batch holds the same stored draft in the same slot. Any difference stops with `state`
      // and writes nothing. A replica head that moved is no difference: the scope judges the act.
      const context = await this.#acquire(address, displayed, false);
      if ("stop" in context) return { ok: false, stop: { stop: "state" } };
      const again = this.#decide(context, displayed);
      if ("stop" in again || !again.current || !same(again.current, stored)) return { ok: false, stop: { stop: "state" } };
      if (!this.#acceptable()) return { ok: false, stop: { stop: "state" } };
      // `revision-moved` writes the genuine form 1 return and ends.
      if (explored.exploration.is === "refused" && explored.exploration.reason === "revision-moved") {
        const marked: StoredDraft = { ...stored, returned: { cause: { by: "exploration", reason: "revision-moved", class: "head" },
          expected: stored.act.expected, capture: stored.capture, againstCustody: null } };
        await this.#options.drafts.write(this.#binding.owner, this.#at, context.entries.map(entry => entry.key === stored.key ? marked : entry));
        // The draft changed and nothing was submitted. `committed` names the write; the view shows the new return and `now`.
        return { ok: false, stop: { stop: "state" }, committed: stored.key };
      }
      // Step 6: one member batch adopts the passed refs (`expected`, `capture`, `namedRefs`) and retires the return marker.
      // A rejected write throws; nothing signs. An editing draft has nothing to adopt and writes nothing.
      if (adopted) await this.#options.drafts.write(this.#binding.owner, this.#at, adoptionBatch(context.entries, adopted));
      // The occurrence belongs to this call until step 7 ends. The fence cannot hold across the signing, which takes it itself.
      this.#submitting.set(stored.key, adopted ?? stored);
      return { ok: true, value: { key: stored.key, act: { kind: candidate.kind, on: candidate.on, fields: candidate.fields, expected: candidate.expected }, adopted: adopted !== null } };
    });
    if (!launch.ok) return launch;
    const { key, act } = launch.value;
    try {
      // Step 7: retain and sign the same candidate. `submitBoundAct` is one gesture, never an inferred copy. A scope refusal
      // is a returned request in the view (form 2), not a stop here, and nothing retries it.
      await this.submitBoundAct(this.#authorizationIdentity(key), act);
      return { ok: true, value: key };
    } catch (error) {
      const stop = stopped(error);
      if (!stop) throw error;
      return { ok: false, stop, ...(adopted !== null ? { committed: key } : {}) };
    } finally {
      this.#submitting.delete(key);
      this.#background(() => this.#sync());
    }
  }

  #refused(error: unknown): DraftCall<never> {
    const stop = stopped(error);
    if (!stop) throw error;
    return { ok: false, stop };
  }
  #acceptable(): boolean { return this.#replica.view.state.is === "current" || this.#replica.view.state.is === "behind"; }
  /** The occupant this view shows now, captured before any await. */
  #displayed<K extends Kind<D>>(slot: Slot<D, K>): { key: string; submitting: boolean } | null {
    const shown = this.#view.drafts.get(slot);
    return shown ? { key: shown.key, submitting: shown.state === "submitting" } : null;
  }
  #selectionRows(): readonly DraftSelectionRow[] { return this.#items() as unknown as readonly DraftSelectionRow[]; }
  /** The one cut of a render: the replica's head and every held row, final rows included. Null when the replica holds no head. */
  #viewCut(): DraftViewCut | null {
    const view = this.#replica.view;
    if (view.head === null) return null;
    const rows = Object.keys(this.#handle.definition.items).flatMap(type => [...view.rows(type)]);
    return { head: view.head, rows: rows as unknown as readonly DraftSelectionRow[] };
  }
  async #readEntries(): Promise<readonly StoredDraftEntry[]> {
    const entries = readStoredDrafts(await this.#options.drafts.read(this.#binding.owner, this.#at), this.#binding);
    this.#current();
    return entries;
  }
  /** The one member fence. A committed write starts a separate read-only publication. */
  async #member<T>(work: () => Promise<DraftCall<T>>): Promise<DraftCall<T>> {
    this.#current();
    try {
      const result = await this.#options.store.exclusive(async () => { this.#current(); return work(); });
      if (result.ok) this.#background(() => this.#sync());
      return result;
    } catch (error) { return this.#refused(error); }
  }
  /** Observe each distinct finite key once, in order. The caller may add one allocated key afterwards. */
  async #finite(keys: readonly string[]): Promise<{ cut: ReturnType<typeof openDraftCustodyCut>; seen: Map<string, DraftCustodyObservation> }> {
    const cut = openDraftCustodyCut(this.#custody, this.#who, keys, () => this.#current());
    const seen = new Map<string, DraftCustodyObservation>();
    for (const key of cut.keys) seen.set(key, await cut.acquire(key));
    return { cut, seen };
  }
  #slotRows(entries: readonly StoredDraftEntry[], address: DraftSlot): StoredDraft[] {
    return entries.filter((entry): entry is StoredDraft => entry.is === "draft" && entry.placement === "slot" && same(entry.slot, address));
  }
  /** The raw rows that hold the address can be old taken intentions. Classification decides which, if any, still edits. */
  #logicalOccupant(rows: readonly StoredDraft[], seen: ReadonlyMap<string, DraftCustodyObservation>): StoredDraft | null {
    if (rows.length === 0) return null;
    const classes = new Map<string, Classified>();
    const stored = rows.map(row => this.#cell(row, seen.get(row.key)!, classes));
    const projection = projectDrafts<D>({ definition: this.#handle.definition, binding: this.#binding, identity: this.#who,
      state: this.#replica.view.state, cut: this.#viewCut(), stored, custodyOnly: [] });
    const found = projection.routing.find(route => route.route === "slot");
    return found && found.from === "stored" && found.source.is === "current" ? found.source.stored : null;
  }
  /** Raw batch, finite custody observations, and for a new intention its one allocated key. */
  async #acquire(address: DraftSlot, displayed: { key: string; submitting: boolean } | null, allocate: boolean): Promise<Context | { stop: DraftStop }> {
    const entries = await this.#readEntries(), rows = this.#slotRows(entries, address);
    const { cut, seen } = await this.#finite(rows.map(row => row.key));
    const context: Context = { entries, rows, seen, key: displayed?.key ?? "" };
    const first = this.#decide(context, displayed);
    if ("stop" in first) return first;
    if (displayed === null && allocate) {
      context.key = newIdempotencyKey();
      // One generated key, one direct observation, no reroll. A found record is never adopted.
      if ((await cut.admitAllocatedKey(context.key)).is === "collision") return { stop: { stop: "taken" } };
    }
    return context;
  }
  /** Synchronous. A null display cannot replace a newer editor; a displayed key can patch only its own live occupant. */
  #decide(context: Context, displayed: { key: string; submitting: boolean } | null): { stop: DraftStop } | { current: StoredDraft | null } {
    this.#current();
    const occupant = this.#logicalOccupant(context.rows, context.seen);
    if (displayed === null) return occupant ? { stop: { stop: "taken" } } : { current: null };
    if (displayed.submitting || !occupant || occupant.key !== displayed.key || this.#submitting.has(occupant.key)) return { stop: { stop: "taken" } };
    return { current: occupant };
  }
  /** One replacement batch: unrelated rows stay exact and a displaced raw occupant of the address waits. */
  #placed(entries: readonly StoredDraftEntry[], address: DraftSlot, draft: StoredDraft): readonly StoredDraftEntry[] {
    const next = entries.map((entry): StoredDraftEntry => {
      if (entry.key === draft.key) return draft;
      return entry.is === "draft" && entry.placement === "slot" && same(entry.slot, address) ? { ...entry, placement: "waiting" } : entry;
    });
    return entries.some(entry => entry.key === draft.key) ? next : [...next, draft];
  }

  async #dispose(key: string, mode: "restore" | "dismiss"): Promise<DraftCall<void>> {
    if (typeof key !== "string" || !validKey(key)) return { ok: false, stop: { stop: "shape", path: "key", message: "is not a bounded request key" } };
    // The displayed form selects the route. A held key is never observed in custody.
    const shown = this.#view.requests.find(entry => entry.key === key);
    if (!shown) return { ok: false, stop: { stop: "state" } };
    const status = shown.is === "draft" ? ("status" in shown ? shown.status : "waiting") : null;
    return this.#member(async (): Promise<DraftCall<void>> => {
      const entries = await this.#readEntries(), row = entries.find(entry => entry.key === key);
      if (!row || row.is !== "draft") return { ok: false, stop: { stop: "state" } };
      const write = async (next: readonly StoredDraftEntry[]): Promise<DraftCall<void>> => {
        await this.#options.drafts.write(this.#binding.owner, this.#at, next);
        return { ok: true, value: undefined };
      };
      if (row.definition !== this.#binding.definition || row.descriptor !== descriptorFor(this.#binding, row.slot.kind)) {
        // A historical row keeps its stored bytes. Restore promotes nothing; dismiss removes exactly this row.
        // Planner 6d3b979f item 4: the definition is checked first, so a row that differs in both stops with `definition-mismatch`.
        if (mode === "dismiss") return write(entries.filter(entry => entry !== row));
        return { ok: false, stop: { stop: row.definition !== this.#binding.definition ? "definition-mismatch" : "descriptor-mismatch" } };
      }
      if (shown.is === "request") return { ok: false, stop: { stop: "state" } };
      const dismissal: DraftDismissal = { is: "dismissed", owner: row.owner, scope: row.scope, definition: row.definition,
        descriptor: row.descriptor, key: row.key, slot: row.slot };
      if (mode === "dismiss") return write(entries.map(entry => entry === row ? dismissal : entry));
      if (status === "pending") return { ok: false, stop: { stop: "taken" } };
      // Restore: the target address must be logically empty once the held key itself is excluded.
      const others = this.#slotRows(entries, row.slot).filter(other => other.key !== key);
      const waiting = status === "waiting";
      const { cut, seen } = await this.#finite([...others.map(other => other.key), ...(waiting ? [key] : [])]);
      const decide = (): boolean => {
        this.#current();
        if (this.#logicalOccupant(others, seen)) return false;
        if (!waiting) return true;
        // An ordinary returned waiter keeps its key only while its own custody still shows it unsent.
        const alone = projectDrafts<D>({ definition: this.#handle.definition, binding: this.#binding, identity: this.#who,
          state: this.#replica.view.state, cut: this.#viewCut(), stored: [this.#cell(row, seen.get(key)!, new Map())], custodyOnly: [] });
        const only = alone.requests[0];
        return alone.requests.length === 1 && only !== undefined && only.is === "draft" && "state" in only;
      };
      if (!decide()) return { ok: false, stop: { stop: "taken" } };
      let draft: StoredDraft;
      if (waiting) draft = { ...row, placement: "slot" };
      else {
        const fresh = newIdempotencyKey();
        if ((await cut.admitAllocatedKey(fresh)).is === "collision") return { ok: false, stop: { stop: "taken" } };
        // The continuation names the earlier key. The old key's occurrence marker does not belong to the new key.
        const { returned, ...rest } = row;
        draft = { ...rest, key: fresh, placement: "slot", after: key,
          ...(returned ? { returned: { ...returned, againstCustody: null } } : {}) };
      }
      if (!decide() || !this.#acceptable()) return { ok: false, stop: { stop: "taken" } };
      const placed = refineDraft(draft, this.#binding, this.#handle.definition);
      // A continuation disposes of the earlier notice in the same batch; a promoted waiter keeps its key.
      return write(this.#placed(waiting ? entries : entries.map(entry => entry === row ? dismissal : entry), row.slot, placed));
    });
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

  /** One read-only publication pass. It writes no draft and holds no member fence. */
  async #sync(): Promise<void> {
    if (this.#closed || this.#halted) return;
    if (this.#running) { this.#again = true; return this.#running; }
    this.#running = (async () => {
      try {
        do {
          this.#again = false;
          const replica = this.#replica.view;
          const cut = await this.#publicationCut();
          if (this.#closed) return;
          // A store, draft or replica change during an await invalidates this whole candidate view.
          if (this.#again || this.#replica.view !== replica) { this.#again = true; continue; }
          // Everything from here is synchronous: one projection from one cut, then one publication.
          const assembled = this.#assemble(cut), view = this.#compute(assembled);
          this.#held = assembled.held;
          this.#arm();
          this.#publish(view);
          this.#scheduleFold();
        } while (this.#again && !this.#closed);
      } catch (error) {
        if (!(error instanceof CandidateClosed)) throw error;
      } finally {
        // Release ownership with the final pending-work decision, including early returns.
        this.#running = null;
      }
    })();
    return this.#running;
  }

  /** The finite publication read: one raw batch, one byTarget discovery, and one find and outcomes read per distinct key. */
  async #publicationCut(): Promise<Cut> {
    const entries = readStoredDrafts(await this.#options.drafts.read(this.#binding.owner, this.#at), this.#binding);
    const discovered = await this.#options.store.byTarget(this.#who);
    // Stored keys cover archived records that discovery omits; a discovery miss never proves absence.
    const keys = [...new Set([...entries.map(entry => entry.key), ...discovered.map(row => row.key)])];
    const cut = openDraftCustodyCut(this.#custody, this.#who, keys, () => { if (this.#closed) throw new CandidateClosed(); });
    const seen = new Map<string, DraftCustodyObservation>();
    for (const key of cut.keys) seen.set(key, await cut.acquire(key));
    return { entries, seen };
  }

  /** Custody folding is its own reconciliation. It reads and writes custody only, and its failure changes no publication. */
  #scheduleFold(): void {
    // Schedule only for a held record that an accepted entry can still fold. Each publication calls this, and an idle wait
    // that finds fresh background work after every publication never drains.
    if (![...this.#held].some(([key, held]) => !completed(held.record) && this.#replica.accepted(this.#options.signer.key, key))) return;
    if (this.#folding) { this.#foldAgain = true; return; }
    this.#folding = true;
    this.#background(async () => {
      try {
        do {
          this.#foldAgain = false;
          for (const [key, held] of [...this.#held]) {
            if (this.#closed) return;
            const entry = this.#replica.accepted(this.#options.signer.key, key);
            if (!entry || completed(held.record)) continue;
            try { await this.#custody.folded({ ...this.#who, key }, entry); }
            catch (error) { if (!(error instanceof CustodyError && error.why.held === "locked")) throw error; }
          }
        } while (this.#foldAgain && !this.#closed);
      } finally { this.#folding = false; }
    });
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
  /** The old whole-input presentation route over a stored draft: shape it completely, or fall back to the authored facade. */
  #draftMeaning(draft: StoredDraft): Digest {
    const values = { on: draft.act.on, fields: draft.act.fields };
    try { const shaped = shapeDeclaredValues(this.#handle.definition, draft.act.kind, values); return intentMeaning({ kind: draft.act.kind, on: shaped.on, fields: shaped.fields }); }
    catch { return meaningOf({ kind: draft.act.kind, values }); }
  }
  #predict(record: CustodyRecord, index: number): Judged {
    const envelope = envelopeOf(record, index);
    return envelope ? this.#replica.judged(envelope.signed, { actor: this.#actor, reading: timeOf(this.#clock.now()), texts: envelope.beside.texts ?? [] }) : { is: "not-judged" };
  }
  #statusFor(entry: SignedEntry | null, record: CustodyRecord, outcomes: readonly Outcome[], meaning: Digest): Classified {
    const status = requestStatus({ entry, record, outcomes, presentMeaning: meaning, head: this.#replica.view.head, now: this.#clock.now(), predict: index => this.#predict(record, index) });
    return { status, predicted: entry ? { is: "recorded", fact: entry.fact } : this.#predict(record, record.signings.length - 1) };
  }
  #requestView(key: string, record: CustodyRecord, classified: Classified): RequestView<D> {
    const present = this.#present(record);
    return { is: "request", key, kind: present.kind, values: present.values, ...classified.status, predicted: classified.predicted };
  }
  /** Evidence for one stored row from one finite observation. No record is invented and no custody is read here. */
  #cell(row: StoredDraftEntry, observation: DraftCustodyObservation, classes: Map<string, Classified>): ProjectStoredKey<D> {
    const entry = this.#replica.accepted(this.#options.signer.key, row.key), identity = observation.identity;
    const verified = entry ? { verifiedEntry: entry } : {};
    // The definition is checked first (planner 6d3b979f item 4); a row of another definition never reaches current refinement.
    if (row.is === "draft" && row.definition === this.#binding.definition && row.descriptor === descriptorFor(this.#binding, row.slot.kind)) {
      const stored = refineDraft(row, this.#binding, this.#handle.definition), meaning = this.#draftMeaning(stored);
      let evidence: DraftKeyEvidence;
      if (observation.is === "absent") evidence = entry ? { identity, is: "entry", entry, presentMeaning: meaning, observed: { is: "absent" } } : { identity, is: "absent" };
      else if (observation.is === "standalone") evidence = { identity, is: "non-request", occurrence: observation.occurrence, excludedBy: "standalone", ...verified };
      else if (entry) evidence = { identity, is: "entry", entry, presentMeaning: meaning, observed: { is: "found", occurrence: observation.occurrence } };
      else {
        const classified = this.#classified(row.key, observation, row, classes);
        if (classified.status.status === "recorded" || classified.status.status === "other-recorded") throw new TypeError("a request without an entry has an entry status");
        evidence = { identity, is: "request", occurrence: observation.occurrence, status: classified.status as DraftRequestStatus, predicted: classified.predicted };
      }
      const submitting = this.#submitting.get(row.key);
      const local: LocalDraftActivity = submitting ? { is: "submitting", against: submitting } : { is: "idle" };
      return { is: "current", stored, evidence, local };
    }
    // A historical or dismissed row never reaches current refinement; its kept request shows genuine custody presentation only.
    let evidence: HistoricalKeyEvidence<D>;
    if (observation.is === "absent") evidence = { identity, is: "absent", ...verified };
    else if (observation.is === "standalone") evidence = { identity, is: "non-request", occurrence: observation.occurrence, excludedBy: "standalone", ...verified };
    else evidence = { identity, is: "ordinary", occurrence: observation.occurrence,
      view: this.#requestView(row.key, observation.record, this.#classified(row.key, observation, row, classes)) };
    return row.is === "draft" ? { is: "historical", stored: row, evidence } : { is: "dismissed", stored: row, evidence };
  }
  /** One C3 classification per ordinary key and candidate. A current stored row supplies the present meaning. */
  #classified(key: string, observation: Extract<DraftCustodyObservation, { is: "ordinary" }>, row: StoredDraftEntry | null, classes: Map<string, Classified>): Classified {
    let found = classes.get(key);
    if (!found) {
      const entry = this.#replica.accepted(this.#options.signer.key, key);
      const meaning = row?.is === "draft" && row.descriptor === descriptorFor(this.#binding, row.slot.kind) ? this.#draftMeaning(row) : observation.record.meaning;
      found = this.#statusFor(entry, observation.record, observation.outcomes, meaning);
      classes.set(key, found);
    }
    return found;
  }

  /** Pure derivation from a finished cut: classification, held records and the projection. Nothing here awaits. */
  #assemble(cut: Cut): Assembled<D> {
    const classes = new Map<string, Classified>(), held = new Map<string, Held>(), byKey = new Map(cut.entries.map(entry => [entry.key, entry]));
    for (const [key, observation] of cut.seen) {
      if (observation.is === "ordinary") {
        this.#classified(key, observation, byKey.get(key) ?? null, classes);
        held.set(key, { record: observation.record, outcomes: [...observation.outcomes] });
      }
    }
    const stored = cut.entries.map(row => this.#cell(row, cut.seen.get(row.key)!, classes));
    const custodyOnly: RequestView<D>[] = [];
    for (const [key, { record }] of held) if (!byKey.has(key)) custodyOnly.push(this.#requestView(key, record, classes.get(key)!));
    const projection = projectDrafts<D>({ definition: this.#handle.definition, binding: this.#binding, identity: this.#who,
      state: this.#replica.view.state, cut: this.#viewCut(), stored, custodyOnly });
    return { held, classes, projection };
  }

  #compute(assembled: Assembled<D>): ClientView<D> {
    const replica = this.#replica.view, byKey = new Map<string, ClientRow<D>>();
    const byType = new Map<string, ClientRow<D>[]>(), byItem = new Map<number, ClientRow<D>>();
    for (const type of Object.keys(this.#handle.definition.items)) {
      const rows = [...replica.rows(type)] as ClientRow<D>[];
      byType.set(type, rows); for (const row of rows) byItem.set(row.id, row);
    }
    for (const [key, { record }] of assembled.held) {
      const { status, predicted } = assembled.classes.get(key)!;
      const entry = this.#replica.accepted(this.#options.signer.key, key);
      // The entry closes custody before publication. In particular no mismatch view publishes not-judged (aa12ecdd).
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
    }
    const { drafts, requests } = assembled.projection;
    return { ...replica, requests, drafts,
      rows: <T extends TypeOf<D>>(type: T) => (byType.get(type) ?? []) as unknown as readonly ClientRow<D, T>[],
      row: ref => "item" in ref ? byItem.get(ref.item) ?? null : byKey.get(ref.key) ?? null };
  }
  #publish(next?: ClientView<D>): void {
    this.#view = this.#halted ? { ...this.#view, state: this.#replica.view.state } : next ?? this.#view;
    for (const listener of [...this.#listeners]) listener(this.#view);
  }

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

  #retryAfterRead(key: string, held: Held): void {
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
      definition: this.#handle.digest, descriptors: this.#binding.descriptors }, this.#replica);
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
