import { canonicalize, isHead, isKeyId, isMemberRef, isRecord, isScopeRef, utf8 } from "@generalbusiness/dap-bytes";
import type { Receipt, ScopeRef } from "@generalbusiness/dap-contract";
import { validKey } from "../custody.ts";
import { decodeViewParameters } from "@generalbusiness/dap-platform/application-v2";
import { shapeAt } from "../shape.ts";
import type { CallResult, DispatchContext } from "../results.ts";
import type { ViewKind } from "./resources.ts";
import type { ActSigner, Card, CardAction, CardContext, Display, EntryRange, ExactRead, LocalReviewAction, NamedCommit, NativeCardAction, PageKind, Projection, ShownRead, ViewQuery, ViewSource } from "./types.ts";

import { signerWords } from "./actor.ts";

export class ViewError extends Error {
  constructor(readonly reason: "shape" | "absent" | "superseded" | "stale" | "busy" | "unavailable", message: string) { super(message); }
}
type InputOpening = Awaited<ReturnType<ViewSessions["open"]>> & { receipt?: string };
interface Instance {
  key: string;
  query: ViewQuery;
  cut: number;
  projection: Projection;
  receipt?: string;
  /** The model's context for the receipt `of`, when a person's line leaves out the exact entry. */
  exactReceipt?: { of: string; text: string };
  readReceipt?: Receipt;
  busy: boolean;
  dispatches: Map<string, Promise<CallResult>>;
  pending: Map<string, Card["actions"][number]>;
  inputs: Map<string, { meaning: string; outcome: Promise<InputOpening> }>;
  /** The displayed reads, newest last, and the one its diff page shows. Only complete answers replay without another read. */
  reads: HeldRead[];
  current?: HeldRead;
}
interface HeldRead { of: string; read: ExactRead; text: string; shown: ShownRead; files: ExactRead[] }
/** The action IDs of the exact reads. A card's two acts stay free for its native acts. */
export const VIEW_DIFF = "view-diff";
const VIEW_INTERDIFF = "view-interdiff-";
const VIEW_FILE = "view-file-";
/** The latest file this view read. A complete answer replays without another signature. */
const VIEW_LAST_FILE = "view-file";
const isExactAction = (id: string): boolean => id === VIEW_DIFF || id === VIEW_LAST_FILE || id.startsWith(VIEW_INTERDIFF) || id.startsWith(VIEW_FILE);
/** Displayed answers one view retains. Complete answers need no second credential. */
const HELD_READS = 4;
/** The files of one read that offer a File action. */
const FILE_ACTIONS = 16;
const FILE_LABEL = 128;
const READ_WORD: Record<ExactRead["kind"], string> = { diff: "Diff", interdiff: "Interdiff", file: "File" };

/** A read's words, commits and file actions, from the service's answer, so that the page names what the read returned. */
function shownOf(read: ExactRead, answer: Record<string, unknown>): { shown: ShownRead; files: ExactRead[] } {
  const leftOut = typeof answer["leftOut"] === "string" ? answer["leftOut"] : null, truncated = answer["truncated"] === true;
  const paths = Array.isArray(answer["paths"]) ? answer["paths"] as { path: string; shown: string; commit: string }[] : [];
  const reached = typeof answer["files"] === "number" ? answer["files"] : paths.length;
  const listed = paths.slice(0, FILE_ACTIONS);
  const shown: ShownRead = { kind: read.kind, title: "", commits: Array.isArray(answer["commits"]) ? answer["commits"] as NamedCommit[] : [], truncated, leftOut, files: [], moreFiles: Math.max(0, reached - listed.length) };
  if (read.kind === "diff") shown.title = `Diff of ${read.label ?? "this version"}`;
  else if (read.kind === "interdiff") shown.title = `Interdiff from ${read.from.label} to ${read.to.label}`;
  else { shown.title = `File at ${read.commitLabel}`; shown.moreFiles = 0; }
  const label = read.kind === "diff" ? read.label ?? "this version" : read.kind === "interdiff" ? read.to.label : "";
  const files: ExactRead[] = read.kind === "file" ? [] : listed.map(path => ({ kind: "file", target: read.target, commit: path.commit, commitLabel: path.commit === (read.kind === "diff" ? read.integration : read.to.integration) ? label : (read.kind === "diff" ? "the base" : read.from.label), path: path.path, shown: path.shown }));
  shown.files = listed.map((path, n) => ({ action: `${VIEW_FILE}${n}`, label: `File: ${path.shown.length > FILE_LABEL ? `${path.shown.slice(0, FILE_LABEL)}...` : path.shown}` }));
  return { shown, files };
}
export interface ViewPorts {
  /** Identity of the actual envelope, retained by the service, never supplied by the browser or the source card. */
  signerOf?: (result: CallResult) => ActSigner | null;
  /** Sign one read-token act and make one bounded read. `admit` runs before the signature. */
  readExact?: (read: ExactRead, admit: () => void | Promise<void>, dispatchContext?: DispatchContext) => Promise<CallResult>;
  /** Private result identity from an actual stopped custody delivery; never a JSON error classification. */
  dispatchStopped?: (result: CallResult) => boolean;
  /** The key of an act sent at this scope with no outcome kept. */
  unresolved?: (target: string) => Promise<{ idempotencyKey: string } | null>;
}
const MAX_INSTANCES = 128;
const PAGES = new Set<PageKind>(["summary", "item", "diff", "updates"]);
const finite = (value: number) => Number.isSafeInteger(value) && value >= 0;

/** What a person reads after a press, and what the model's context reads. An accepted act with its own words names no entry to a person; the context does. */
function receiptLine(card: Card, action: CardAction, result: CallResult, dispatchStopped = false): { shown: string; exact?: string } {
  const answer = result.structuredContent;
  const reason = [answer["reason"], answer["name"]].filter((value): value is string => typeof value === "string").join(", ");
  const uncertain = dispatchStopped || answer["answer"] === "unknown" || answer["answer"] === "unavailable" || answer["error"] === "transport" || answer["error"] === "custody";
  let outcome: string;
  const later = typeof answer["checkAfter"] === "string" ? ` after ${answer["checkAfter"]}` : "";
  if (uncertain) outcome = `outcome unknown; check the original request${later}`;
  else if (answer["answer"] === "not-found") outcome = "this server keeps no record of it, which does not show that it was not sent";
  else if (answer["answer"] === "accepted") {
    const fact = answer["fact"] as { seq?: unknown } | undefined;
    outcome = `accepted${typeof fact?.seq === "number" ? ` (entry ${fact.seq})` : ""}`;
  } else if (typeof answer["answer"] === "string") outcome = `${answer["answer"]}${reason ? ` (${reason})` : ""}`;
  else outcome = "the act could not be confirmed; refresh the card";
  const fact = answer["fact"] as { seq?: unknown } | undefined;
  if (answer["answer"] === "accepted" && !action.local && action.done) return { shown: action.done, ...(typeof fact?.seq === "number" ? { exact: `${action.done} Entry ${fact.seq}.` } : {}) };
  return { shown: `${card.kicker ?? `${card.identity.kind} ${card.identity.item} ${card.identity.revision}`}: ${outcome}.`.replace(/\s+/g, " ").slice(0, 512) };
}

function mergeRanges(ranges: EntryRange[]): EntryRange[] {
  const sorted = ranges.map((range) => ({ ...range })).sort((a, b) => a.scope.localeCompare(b.scope) || a.from - b.from);
  const out: EntryRange[] = [];
  for (const range of sorted) {
    const previous = out.at(-1);
    if (previous?.scope === range.scope && range.from <= previous.to + 1) previous.to = Math.max(previous.to, range.to);
    else out.push(range);
  }
  return out;
}
function ranges(entries: NonNullable<Card["entries"]>): EntryRange[] { return mergeRanges(entries.map(({ scope, seq }) => ({ scope, from: seq, to: seq }))); }

function checkedLocal(action: LocalReviewAction, card: Card): void {
  const capture = action.capture;
  if (action.purpose !== "mark-reviewed" || "kind" in action || "args" in action || "parameters" in action || "parameterInput" in action
    || !capture || !Array.isArray(capture.heads) || capture.heads.length < 1 || capture.heads.length > 8 || capture.heads.length !== card.projection.length
    || !isScopeRef(capture.directory) || capture.directory.kind !== "directory" || !isMemberRef(capture.viewer) || !isKeyId(capture.key)
    || typeof capture.service !== "string" || utf8(capture.service).length > 2048 || !Array.isArray(capture.ranges)) throw new ViewError("unavailable", "The local review capture is malformed.");
  let service: URL;
  try { service = new URL(capture.service); } catch { throw new ViewError("unavailable", "The local review service is malformed."); }
  if (!["https:", "http:"].includes(service.protocol) || service.username || service.password || service.hash || service.search) throw new ViewError("unavailable", "The local review service is malformed.");
  const scopes = new Set<string>();
  for (const point of capture.heads) {
    if (!isScopeRef(point.scope) || !isHead(point.head) || scopes.has(point.scope.scope)
      || !card.projection.some(read => read.scope === point.scope.scope && read.seq === point.head.seq && read.hash === point.head.hash)) throw new ViewError("unavailable", "The local review capture differs from the displayed heads.");
    scopes.add(point.scope.scope);
  }
  for (const range of capture.ranges) if (!finite(range.from) || !finite(range.to) || range.from > range.to
    || !capture.heads.some(point => point.scope.scope === range.scope && range.to <= point.head.seq)) throw new ViewError("unavailable", "The local review range has no captured head.");
  if (canonicalize(mergeRanges([...capture.ranges])) !== canonicalize(mergeRanges(card.reviewIntended))) throw new ViewError("unavailable", "The local review capture differs from the displayed ranges.");
}

function checked(projection: Projection, query: ViewQuery): Projection {
  if (utf8(canonicalize(projection)).length > 64 * 1024) throw new ViewError("unavailable", "The card projection exceeds its byte bound.");
  if (!finite(projection.count) || !finite(projection.position) || (projection.count > 0 && projection.position >= projection.count)) throw new ViewError("unavailable", "The card projection has an invalid position.");
  const card = projection.card;
  if (projection.status === "ready" && (!card || projection.count === 0)) throw new ViewError("unavailable", "The projection supplied no card for its ready result.");
  if (card) {
    if (card.actions.length > 2) throw new ViewError("unavailable", "A card may offer at most two acts.");
    if (new Set(card.actions.map((act) => act.id)).size !== card.actions.length) throw new ViewError("unavailable", "Card act IDs must be distinct.");
    shapeAt(card.identity.at);
    if (card.wholeText && typeof card.body !== "string") throw new ViewError("unavailable", "A card that offers its acts with its text must hold that text.");
    if (card.actor?.kind === "agent" && !card.actor.controller) throw new ViewError("unavailable", "The agent projection does not name its controller.");
    for (const entry of card.entries ?? []) if (!finite(entry.seq)) throw new ViewError("unavailable", "An entry position is malformed.");
    for (const point of card.projection) if (!finite(point.seq)) throw new ViewError("unavailable", "A projection read point is malformed.");
    for (const range of [...card.reviewIntended, ...card.unavailable]) if (!finite(range.from) || !finite(range.to) || range.from > range.to) throw new ViewError("unavailable", "An entry range is malformed.");
    for (const action of card.actions) {
      if (action.local) { checkedLocal(action, card); continue; }
      const at = shapeAt(action.args["at"]);
      if (!card.declared) {
        // An act signs revisions of the subjects it binds, each one a revision this card displayed.
        if (at !== undefined && Object.keys(at).some(name => !Object.hasOwn(card.identity.at, name) || at[name] !== card.identity.at[name])) throw new ViewError("unavailable", "An act disagrees with the displayed revisions.");
      } else if (at === undefined || Object.keys(card.identity.at).some(name => Object.hasOwn(at, name) && at[name] !== card.identity.at[name])) throw new ViewError("unavailable", "A declared act disagrees with the displayed subject revision.");
    }
    // The kit knows screen contracts and generic act purposes, never lane states or names.
    card.actions = card.actions.filter((action) => {
      if (query.page === "diff") return false;
      if (card.unresolvedOriginal) return action.purpose === "check-original";
      // The first card offers an act only where a person has read what it answers: its whole text, or a declared carousel's row.
      if (query.page === "summary" && !card.wholeText && !(card.declared?.kind === "carousel" && (action.parameters || card.declared.routed))) return false;
      if (projection.status !== "ready") return false;
      if (query.page === "updates") return action.purpose === "mark-reviewed" && card.unavailable.length === 0 && (card.entries?.length ?? 0) > 0 && canonicalize(mergeRanges(card.reviewIntended)) === canonicalize(ranges(card.entries ?? []));
      if (action.purpose === "mark-reviewed") return false;
      return action.purpose !== "approve" || card.approvalAllowed !== false;
    });
    if (query.page === "updates" && card.actions.length > 1) throw new ViewError("unavailable", "An updates screen may offer only Mark reviewed.");
  }
  return projection;
}

/**
 * Bounded mounted-view state of one process, not authority or custody. A process that holds no view cannot dispatch.
 * A host can run two processes on one home, and a restart empties this state, so an opening call is how any process gets a view.
 * Custody is one record on disk under the home, and each read of a card asks it again.
 */
export class ViewSessions {
  readonly #instances = new Map<string, Instance>();
  readonly #current = new Map<ViewKind, string>();
  constructor(readonly source: ViewSource, readonly access: (dispatchContext?: DispatchContext) => Parameters<ViewSource["read"]>[1], readonly perform: (kind: string, args: Record<string, unknown>, admit: () => void | Promise<void>, dispatchContext?: DispatchContext) => Promise<CallResult>, readonly settle: (args: Record<string, unknown>, dispatchContext?: DispatchContext) => Promise<CallResult>, readonly receiptOf: (result: CallResult) => Receipt | null = () => null, readonly ports: ViewPorts = {}) {}
  async #openOriginal(card: Card, query: ViewQuery): Promise<{ idempotencyKey: string } | null> {
    if (card.declared || !this.source.checksOriginals?.(query) || !this.ports.unresolved) return null;
    return this.ports.unresolved(card.identity.subject.scope);
  }
  /** A retained card read before the unknown outcome. It signs nothing while custody holds that outcome open. */
  async #refuseWhileOpen(card: Card, query: ViewQuery): Promise<void> {
    if (await this.#openOriginal(card, query)) throw new ViewError("stale", "An earlier act at this scope has no known outcome. Read the card again and check the original request; no new act was sent.");
  }
  /** A record of custody outlives this process, and a retained card does not. So each read of the card asks custody again. */
  async #checkOriginal(projection: Projection, query: ViewQuery): Promise<void> {
    const card = projection.card;
    if (!card) return;
    const open = await this.#openOriginal(card, query);
    if (!open) return;
    card.unresolvedOriginal = true;
    card.actions = [{ id: "check-original", label: "Check original request", purpose: "check-original", kind: "", args: { target: card.identity.subject.scope, idempotencyKey: open.idempotencyKey } }];
  }
  #instance(key: string): Instance {
    const instance = this.#instances.get(key);
    if (!instance) throw new ViewError("absent", "This server process holds no view with this key, so no act was sent. Call the view's opening tool with the same key and arguments to open it here.");
    return instance;
  }
  #active(instance: Instance): boolean { return this.#current.get(instance.query.screen) === instance.key; }
  #admit(instance: Instance, cut: number): void {
    if (!this.#active(instance)) throw new ViewError("superseded", "A newer card replaced this one. Its receipts remain readable; no new act was sent.");
    if (instance.cut !== cut) throw new ViewError("stale", "The displayed card changed. Read it again; no new act was sent.");
  }
  async open(key: string, screen: ViewKind, subject?: string, items?: Readonly<Record<string, number>>, scope?: ScopeRef, dispatchContext?: DispatchContext) {
    if (!validKey(key)) throw new ViewError("shape", "Choose a view key of 1 to 128 UTF-8 bytes.");
    if (scope !== undefined && (!(this.source.declared || this.source.listsAfterScope) || !isScopeRef(scope))) throw new ViewError("shape", "A selected scope needs a view that takes one and a full native scope reference.");
    const old = this.#instances.get(key);
    if (old) {
      if (old.query.screen !== screen || old.query.subject !== subject || canonicalize(old.query.items ?? {}) !== canonicalize(items ?? {}) || canonicalize(old.query.scope ?? null) !== canonicalize(scope ?? null)) throw new ViewError("shape", "This view key already names another opening.");
      return this.opening(old);
    }
    if (this.#instances.size >= MAX_INSTANCES) throw new ViewError("busy", "This connection retains its maximum of 128 views. Start a new connection.");
    const query: ViewQuery = { screen, position: 0, page: this.source.initialPage?.(screen, subject) ?? "summary", ...(subject === undefined ? {} : { subject }), ...(items === undefined ? {} : { items: structuredClone(items) }), ...(scope === undefined ? {} : { scope: structuredClone(scope) }) };
    const instance: Instance = { key, query, cut: 0, projection: { status: "unavailable", count: 0, position: 0, fallback: "Loading the card." }, busy: true, dispatches: new Map(), pending: new Map(), inputs: new Map(), reads: [] };
    this.#instances.set(key, instance);
    this.#current.set(screen, key);
    try {
      const projection = checked(structuredClone(await this.source.read(query, this.access(dispatchContext))), query);
      await this.#checkOriginal(projection, query);
      instance.projection = projection;
    }
    catch { instance.projection = { status: "unavailable", count: 0, position: 0, fallback: "The card could not be read. Retry the read; this read sent no act." }; }
    finally { instance.busy = false; }
    return this.opening(instance);
  }
  private opening(instance: Instance) {
    const { card, status, count } = instance.projection;
    const identity = card ? this.#identity(card) : null;
    const text = this.source.declared ? `${instance.projection.fallback}${identity ? ` ${identity.kind} ${identity.item}, revision ${identity.revision}.` : ""}`
      : `${instance.query.screen}: ${status}${identity ? `; ${identity.kind} ${identity.item}, revision ${identity.revision}` : ""}. ${count} item${count === 1 ? "" : "s"}. Use the card's arrows and title, or inspect the subject with the normal read tools.`;
    return { view: instance.key, screen: instance.query.screen, status, identity, count, text };
  }
  #identity(card: Card) {
    const { item, kind, revision, subject, at } = card.identity;
    return { item, kind, revision, subject: { scope: subject.scope, ...(subject.item === undefined ? {} : { item: subject.item }) }, at: { ...at } };
  }
  #itemKey(card: Card) { return canonicalize({ subject: card.identity.subject, item: card.identity.item }); }
  #display(instance: Instance): Display {
    const { projection, query } = instance;
    const card = projection.card;
    const entries = query.page === "summary" ? [] : ranges(card?.entries ?? []);
    const context: CardContext = {
      view: instance.key,
      screen: query.screen, page: query.page, status: projection.status, identity: card ? this.#identity(card) : null,
      projection: card?.projection.map(({ scope, seq, hash }) => ({ scope, seq, hash })) ?? projection.points ?? (projection.data ? [{ scope: projection.data.scope.scope, ...projection.data.at }] : []),
      entriesRead: entries, presented: entries.map((range) => ({ ...range })),
      reviewIntended: query.page === "updates" ? structuredClone(card?.reviewIntended ?? []) : [],
      unavailable: structuredClone(card?.unavailable ?? []), waitsOn: [...(card?.waitsOn ?? [])], settles: [...(card?.settles ?? [])],
      navigation: query.page === "summary" ? [...(projection.status !== "ready" && projection.back ? ["back"] : []), ...(projection.position > 0 ? ["previous"] : []), ...(projection.position + 1 < projection.count ? ["next"] : []), ...(card && projection.status === "ready" ? ["open"] : [])] : ["back", ...(card?.diffAvailable && query.page === "item" ? ["diff"] : [])],
      ...(query.page === "diff" && card?.shownRead ? { exact: { kind: card.shownRead.kind, commits: structuredClone(card.shownRead.commits), truncated: card.shownRead.truncated } } : {}),
      ...(card?.declared ? { note: card.declared.context } : {}),
      ...(instance.receipt ? { receipt: instance.exactReceipt?.of === instance.receipt ? instance.exactReceipt.text : instance.receipt } : {}),
      ...(card?.rule ? { rule: { ...card.rule } } : {}),
    };
    const displayedCard: Display["card"] = card ? (({ diffRead, interdiffReads: _interdiffReads, ...shown }) => ({ ...shown, ...(diffRead ? { diffSigned: true as const, ...this.#readers(instance, card) } : {}), actions: card.actions.map(({ id, label, purpose, parameters }) => ({ id, label, purpose, ...(parameters ? { input: "chat" as const } : {}) })) }))(card) : undefined;
    if (displayedCard?.declared?.routed) {
      const { data: _data, ...declared } = displayedCard.declared;
      displayedCard.declared = declared;
    }
    return structuredClone({ view: instance.key, cut: instance.cut, active: this.#active(instance), query, status: projection.status, position: projection.position, count: projection.count,
      ...(displayedCard ? { card: displayedCard } : {}), fallback: projection.fallback, context,
      ...(projection.scope ? { scope: projection.scope } : {}),
      ...(projection.back ? { back: projection.back } : {}),
      ...(projection.refresh ? { refresh: projection.refresh } : {}),
      ...(projection.data ? { data: projection.data } : {}),
      ...(projection.surface ? { surface: projection.surface } : {}),
      ...(projection.members ? { members: projection.members } : {}),
      ...(instance.receipt ? { receipt: instance.receipt } : {}) });
  }
  display(key: string) { return this.#display(this.#instance(key)); }
  async read(key: string, cut?: number, move?: { position?: number; page?: PageKind; refresh?: boolean }, dispatchContext?: DispatchContext): Promise<Display> {
    const instance = this.#instance(key);
    if (move) {
      this.#admit(instance, cut ?? -1);
      if (instance.busy) throw new ViewError("busy", "The card has an operation in progress. Retry its read.");
      if (instance.projection.card?.unresolvedOriginal && (move.position === undefined || move.position === instance.projection.position)) {
        if (move.page !== undefined && move.page !== instance.query.page) throw new ViewError("busy", "Check the original request before changing this item's page.");
        // A lost reply may follow a committed act that changed carousel
        // order. Keep its captured card and original check on auto-refresh.
        return this.#display(instance);
      }
      const position = move.position ?? instance.projection.position;
      const page = move.page ?? instance.query.page;
      if (!finite(position) || !PAGES.has(page)) throw new ViewError("shape", "The card position or page is malformed.");
      if (page === "diff" && !instance.projection.card?.diffAvailable) throw new ViewError("shape", "This card offers no diff.");
      if (page === "diff" && instance.projection.card?.diffRead && !instance.current) throw new ViewError("shape", "View diff signs a read request. Use the card's View diff action.");
      const query = { ...instance.query, position, page };
      instance.busy = true;
      try {
        const reading: ViewQuery = { ...query, ...(this.source.declared && move.refresh === true && move.position === undefined && move.page === undefined ? { refresh: true as const } : {}) };
        const fact = instance.readReceipt?.fact;
        const projection = checked(structuredClone(await this.source.read(reading, this.access(dispatchContext), fact ? { at: fact.at, head: { seq: fact.seq, hash: fact.hash } } : undefined)), query);
        if (query.page !== "diff") await this.#checkOriginal(projection, query);
        this.#admit(instance, cut ?? -1);
        if (projection.card?.diffRead && query.page === "diff") {
          const held = instance.current;
          if (!held || held.of !== canonicalize([projection.card.identity, held.read])) throw new ViewError("stale", "The displayed version changed. Read the card again, then use View diff.");
          projection.card.body = held.text;
          projection.card.shownRead = held.shown;
        }
        if (projection.card) {
          const pending = instance.pending.get(this.#itemKey(projection.card));
          if (pending && query.page !== "diff" && (query.page !== "summary" || projection.card.wholeText || projection.card.declared?.kind === "carousel")) {
            projection.card.unresolvedOriginal = true;
            projection.card.actions = [pending];
          }
        }
        instance.query = { ...query, position: projection.position };
        instance.projection = projection;
        instance.cut++;
      } catch (error) {
        if (error instanceof ViewError) throw error;
        throw new ViewError("unavailable", "The card could not be refreshed. The previous card and receipt are retained.");
      } finally { instance.busy = false; }
    }
    return this.#display(instance);
  }
  async act(key: string, cut: number, actionId: string, dispatchContext?: DispatchContext): Promise<{ result: CallResult; display: Display }> {
    const instance = this.#instance(key);
    if (actionId === VIEW_DIFF || (isExactAction(actionId) && instance.projection.card?.diffRead)) return this.#readExact(instance, cut, actionId, dispatchContext);
    const dispatchKey = `${cut}:${actionId}`;
    const action = instance.projection.card?.actions.find((candidate) => candidate.id === actionId);
    if (action?.parameters) throw new ViewError("shape", "Type the declared measurements in chat; this card cannot supply their values.");
    return this.#dispatch(instance, cut, action, dispatchKey, dispatchContext);
  }
  /** Only the context line, selected identity and receipt cross back to the model. */
  #inputOpening(instance: Instance): InputOpening {
    return { ...this.opening(instance), ...(instance.receipt ? { receipt: instance.receipt } : {}) };
  }
  async input(key: string, screen: string, actionId: string, item: string, revision: string, request: string, values: unknown, dispatchContext?: DispatchContext) {
    const instance = this.#instance(key);
    if (!validKey(request)) throw new ViewError("shape", "Keep a request key of 1 to 128 UTF-8 bytes for retries.");
    if (!validKey(item) || !validKey(revision)) throw new ViewError("shape", "Use the bounded item and revision from the card context.");
    const declaration = this.source.inputActs?.find(action => action.screen === screen && action.id === actionId);
    if (!declaration || instance.query.screen !== screen) throw new ViewError("shape", "This view declares no such input act.");
    let fields;
    try { fields = decodeViewParameters(declaration.parameters, values); }
    catch { throw new ViewError("shape", "The supplied values do not fit the declared fields, precision or limits; no request was signed."); }
    const meaning = canonicalize({ screen, actionId, item, revision, fields });
    const old = instance.inputs.get(request);
    if (old) {
      if (old.meaning !== meaning) throw new ViewError("shape", "This request key already names different values. No successor was signed.");
      return old.outcome;
    }
    if (instance.inputs.size >= 32) throw new ViewError("busy", "This view retains 32 input requests. Open a new view.");
    const outcome = (async () => {
      const card = instance.projection.card;
      if (!card || card.identity.item !== item || card.identity.revision !== revision) throw new ViewError("stale", "The selected item or revision changed. Read the card again; no request was signed.");
      const offered = card.actions.find((action): action is NativeCardAction => !action.local && action.id === actionId && action.parameters !== undefined);
      if (!offered) throw new ViewError("stale", "This card no longer offers that input act; no request was signed.");
      const action = { ...offered, parameterInput: structuredClone(values), args: { ...offered.args,
        fields: { ...(offered.args["fields"] as Record<string, unknown> | undefined), ...fields } } };
      const cut = instance.cut;
      const { result } = await this.#dispatch(instance, cut, action, `input:${request}`, dispatchContext);
      if (result.structuredContent["answer"] === "accepted") {
        try { await this.read(key, cut, { position: 0 }, dispatchContext); }
        catch { /* The accepted receipt survives a failed refresh. */ }
      }
      return this.#inputOpening(instance);
    })();
    instance.inputs.set(request, { meaning, outcome });
    return outcome;
  }
  async #markReviewed(instance: Instance, cut: number, card: Card, action: LocalReviewAction, dispatchKey: string): Promise<{ result: CallResult; display: Display }> {
    if (!this.source.markReviewed) throw new ViewError("unavailable", "This view has no local review store.");
    if (instance.query.page !== "updates" || card.unavailable.length || !(card.entries?.length)
      || canonicalize(mergeRanges(card.reviewIntended)) !== canonicalize(ranges(card.entries))) throw new ViewError("shape", "Only the exact displayed available updates can be marked locally.");
    if (instance.dispatches.size >= 32) throw new ViewError("busy", "This view retains 32 local or native outcomes. Open a new view.");
    checkedLocal(action, card);
    const mark = this.source.markReviewed;
    instance.busy = true;
    const dispatch = (async (): Promise<CallResult> => {
      let admitted = false;
      let result: CallResult;
      try { result = structuredClone(await mark.call(this.source, structuredClone(action.capture), { view: instance.key, cut, admit: () => {
        this.#admit(instance, cut);
        admitted = true;
      } })); }
      catch (error) { if (error instanceof ViewError) throw error; throw new ViewError("unavailable", "The local review mark could not be confirmed. No native act was sent."); }
      if (!isRecord(result) || !isRecord(result.structuredContent) || typeof result.isError !== "boolean" || !Array.isArray(result.content)
        || result.content.some(entry => !isRecord(entry) || entry["type"] !== "text" || typeof entry["text"] !== "string")) throw new ViewError("unavailable", "The local review callback returned a malformed local result.");
      const status = result.structuredContent["localStatus"];
      if (typeof status !== "string" || !["marked", "already", "refused", "unavailable", "stale"].includes(status)
        || "answer" in result.structuredContent || "fact" in result.structuredContent || "receipt" in result.structuredContent
        || utf8(canonicalize(result)).length > 64 * 1024 || ((status === "marked" || status === "already") && !admitted)) throw new ViewError("unavailable", "The local review callback returned no bounded local result.");
      instance.receipt = `Local review: ${status}. This is not a native journal receipt.`;
      return result;
    })();
    instance.dispatches.set(dispatchKey, dispatch);
    try { return { result: await dispatch, display: this.#display(instance) }; }
    finally { instance.busy = false; }
  }

  /** The card's exact reads. A lone View diff needs a reader control when its current answer can run again. */
  #readers(instance: Instance, card: Card): { readers?: { action: string; label: string; current: boolean }[] } {
    const current = instance.query.page === "diff" ? instance.current?.read : undefined;
    const same = (read: ExactRead) => current !== undefined && canonicalize(current) === canonicalize(read);
    const readers = [{ action: VIEW_DIFF, label: "View diff", current: current?.kind === "diff" }];
    (card.interdiffReads ?? []).forEach((read, n) => { readers.push({ action: `${VIEW_INTERDIFF}${n}`, label: `Interdiff from ${read.from.label}`, current: same({ kind: "interdiff", ...read }) }); });
    const file = [...instance.reads].reverse().find(held => held.read.kind === "file" && held.of === canonicalize([card.identity, held.read]));
    if (file?.read.kind === "file") readers.push({ action: VIEW_LAST_FILE, label: `File: ${file.read.shown.length > FILE_LABEL ? `${file.read.shown.slice(0, FILE_LABEL)}...` : file.read.shown}`, current: same(file.read) });
    return readers.length > 1 || instance.query.page === "diff" && instance.current?.shown.truncated ? { readers } : {};
  }
  /** The server-held read that an action names, from this card and the read the page shows. A browser supplies only the action's ID. */
  #exactRead(instance: Instance, card: Card, action: string): ExactRead | null {
    const diff = card.diffRead;
    if (!diff) return null;
    if (action === VIEW_DIFF) return { kind: "diff", ...diff };
    const ordinal = (prefix: string) => /^\d{1,4}$/.test(action.slice(prefix.length)) ? Number(action.slice(prefix.length)) : -1;
    if (action.startsWith(VIEW_INTERDIFF)) { const read = card.interdiffReads?.[ordinal(VIEW_INTERDIFF)]; return read ? { kind: "interdiff", ...read } : null; }
    const current = (held: HeldRead | undefined) => held && held.of === canonicalize([card.identity, held.read]) ? held : undefined;
    if (action === VIEW_LAST_FILE) return current([...instance.reads].reverse().find(held => held.read.kind === "file"))?.read ?? null;
    return current(instance.current)?.files[ordinal(VIEW_FILE)] ?? null;
  }
  #showRead(instance: Instance, card: Card, held: HeldRead): boolean {
    const query: ViewQuery = { ...instance.query, page: "diff" };
    let shown: Projection;
    try { shown = checked({ ...instance.projection, card: { ...structuredClone(card), body: held.text, shownRead: held.shown } }, query); }
    catch (error) { if (!(error instanceof ViewError)) throw error; return false; }
    instance.current = held;
    instance.projection = shown;
    instance.query = query;
    instance.cut++;
    return true;
  }
  /** A complete retained answer signs nothing. A truncated answer can run again; a failure keeps the page and says why. */
  async #readExact(instance: Instance, cut: number, action: string, dispatchContext?: DispatchContext): Promise<{ result: CallResult; display: Display }> {
    this.#admit(instance, cut);
    if (instance.busy) throw new ViewError("busy", "The card has an operation in progress. Retry its read.");
    const card = instance.projection.card, read = card ? this.#exactRead(instance, card, action) : null;
    if (!card || !read || !card.diffAvailable || !this.ports.readExact) throw new ViewError("shape", "This card offers no such read.");
    if (card.unresolvedOriginal) throw new ViewError("busy", "Check the original request before you read the diff.");
    const word = READ_WORD[read.kind], of = canonicalize([card.identity, read]);
    const held = instance.reads.find(item => item.of === of && !item.shown.truncated);
    if (held) {
      const message = `${word} not shown: the card cannot hold the retained answer. No new request was signed.`;
      if (!this.#showRead(instance, card, held)) {
        instance.receipt = message;
        return { result: { structuredContent: { error: "unavailable", message }, content: [{ type: "text", text: message }], isError: true }, display: this.#display(instance) };
      }
      if (instance.receipt === message) delete instance.receipt;
      return { result: { structuredContent: { held: true, commits: held.shown.commits, truncated: held.shown.truncated }, content: [{ type: "text", text: `${word} shown again. No new request was signed.` }], isError: false }, display: this.#display(instance) };
    }
    instance.busy = true;
    try {
      const result = await this.ports.readExact(structuredClone(read), async () => {
        this.#admit(instance, cut);
        await this.#refuseWhileOpen(card, instance.query);
        this.#admit(instance, cut);
      }, dispatchContext);
      // The read has returned, so a request may be signed. These words say so, where #admit says that nothing was sent.
      if (!this.#active(instance)) throw new ViewError("superseded", result.isError || typeof result.structuredContent["text"] !== "string"
        ? "A newer card replaced this one during the read. The read may have been signed, and this card does not show its answer."
        : "A newer card replaced this one during the read. The read was signed, and this card does not show its answer.");
      this.#admit(instance, cut);
      const text = result.structuredContent["text"];
      if (result.isError || typeof text !== "string") {
        const message = result.structuredContent["message"], answer = result.structuredContent["answer"];
        instance.receipt = (`${word} not shown: ${typeof message === "string" ? message : typeof answer === "string" ? `the read request was ${answer}.` : "the read did not finish."}`).slice(0, 512);
        return { result, display: this.#display(instance) };
      }
      const { shown, files } = shownOf(read, result.structuredContent);
      const answer: HeldRead = { of, read, text, shown, files };
      if (!this.#showRead(instance, card, answer)) {
        instance.receipt = `${word} not shown: the card cannot hold this answer. The one-time credential is spent.`;
        return { result, display: this.#display(instance) };
      }
      instance.reads = [...instance.reads.filter(item => item.of !== of), answer].slice(-HELD_READS);
      // The display holds the text. The result states what the read returned, and it does not repeat the text.
      const { text: _text, ...facts } = result.structuredContent;
      return { result: { structuredContent: facts, content: [{ type: "text", text: `${word} shown on the page.` }], isError: false }, display: this.#display(instance) };
    } finally { instance.busy = false; }
  }

  async #dispatch(instance: Instance, cut: number, action: CardAction | undefined, dispatchKey: string, dispatchContext?: DispatchContext): Promise<{ result: CallResult; display: Display }> {
    const retained = action?.purpose === "check-original" ? undefined : instance.dispatches.get(dispatchKey);
    if (retained) return { result: await retained, display: this.#display(instance) };
    this.#admit(instance, cut);
    if (instance.busy) throw new ViewError("busy", "The card has an operation in progress. Retry its read.");
    if (!action) throw new ViewError("shape", "The displayed card offers no such act.");
    const card = instance.projection.card!;
    if (action.local) return this.#markReviewed(instance, cut, card, action, dispatchKey);
    if (action.purpose !== "check-original" && instance.dispatches.size >= 32) throw new ViewError("busy", "This card retains its maximum of 32 act outcomes. Open a new card; no new act was sent.");
    // Reserve room before dispatch; checking an already retained original needs no new slot.
    if (!instance.pending.has(this.#itemKey(card)) && instance.pending.size >= 32) throw new ViewError("busy", "This card retains its maximum of 32 unresolved requests. Check those originals before another dispatch.");
    const args = structuredClone(action.args);
    // Use only server-retained input; neither a browser revision nor an arbitrary tool name can retarget this dispatch.
    if (action.purpose === "check-original") {
      if (!validKey(args["idempotencyKey"]) || args["target"] === undefined) throw new ViewError("shape", "The original request's target and custody key are unavailable. No successor was signed.");
    } else {
      // The action's own captured revisions sign; a card that names none signs what it displayed.
      if (!card.declared && args["at"] === undefined) args["at"] = structuredClone(card.identity.at);
      args["idempotencyKey"] = `view-${crypto.randomUUID()}`;
    }
    instance.busy = true;
    const dispatch = action.purpose === "check-original" ? this.settle(args, dispatchContext) : this.perform(action.kind, args, async () => {
      this.#admit(instance, cut);
      await this.#refuseWhileOpen(card, instance.query);
      await this.source.admit?.(instance.query, card, action);
      this.#admit(instance, cut);
    }, dispatchContext);
    if (action.purpose !== "check-original") instance.dispatches.set(dispatchKey, dispatch);
    try {
      const result = await dispatch;
      const answer = result.structuredContent;
      const dispatchStopped = this.ports.dispatchStopped?.(result) === true;
      const line = receiptLine(card, action, result, dispatchStopped);
      if (this.ports.signerOf) {
        const signer = this.ports.signerOf(result);
        const attribution = signer ? ` Signed by ${signerWords(signer)}.` : " No signer confirmed.";
        line.shown += attribution;
        if (line.exact) line.exact += attribution;
      }
      instance.receipt = line.shown;
      if (line.exact) instance.exactReceipt = { of: line.shown, text: line.exact };
      const receipt = this.receiptOf(result);
      if (answer["answer"] === "accepted" && receipt) instance.readReceipt = structuredClone(receipt);
      const itemKey = this.#itemKey(card);
      if (dispatchStopped || answer["answer"] === "unknown" || answer["answer"] === "unavailable" || answer["error"] === "custody" || answer["error"] === "transport") {
        const original = { id: `check-${cut}`, label: "Check original request", purpose: "check-original" as const, kind: "", args: { target: args["target"] ?? args["scope"], idempotencyKey: args["idempotencyKey"] } };
        instance.pending.set(itemKey, original);
        card.unresolvedOriginal = true;
        card.actions = [original];
        instance.cut++;
      } else if (answer["answer"] !== "unavailable" && action.purpose === "check-original") {
        instance.pending.delete(itemKey);
        card.unresolvedOriginal = false;
        card.actions = [];
        instance.cut++;
      }
      return { result, display: this.#display(instance) };
    } finally { instance.busy = false; }
  }
}
