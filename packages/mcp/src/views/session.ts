import { canonicalize, utf8 } from "@generalbusiness/artroom-bytes";
import { validKey } from "../custody.ts";
import { capturedExpected, shapeAt } from "../shape.ts";
import type { CallResult } from "../service.ts";
import type { ViewKind } from "./resources.ts";
import type { Card, CardContext, Display, EntryRange, PageKind, Projection, ViewQuery, ViewSource } from "./types.ts";

export class ViewError extends Error {
  constructor(readonly reason: "shape" | "absent" | "superseded" | "stale" | "busy" | "unavailable", message: string) { super(message); }
}
interface Instance {
  key: string;
  query: ViewQuery;
  cut: number;
  projection: Projection;
  receipt?: string;
  busy: boolean;
  dispatches: Map<string, Promise<CallResult>>;
  pending: Map<string, Card["actions"][number]>;
}
const MAX_INSTANCES = 128;
const PAGES = new Set<PageKind>(["summary", "item", "diff", "updates"]);
const finite = (value: number) => Number.isSafeInteger(value) && value >= 0;

function receiptLine(card: Card, result: CallResult): string {
  const answer = result.structuredContent;
  const reason = [answer["reason"], answer["name"]].filter((value): value is string => typeof value === "string").join(", ");
  const uncertain = answer["answer"] === "unknown" || answer["answer"] === "unavailable" || answer["error"] === "transport" || answer["error"] === "custody";
  let outcome: string;
  if (uncertain) outcome = "outcome unknown; check the original request";
  else if (answer["answer"] === "accepted") {
    const fact = answer["fact"] as { seq?: unknown } | undefined;
    outcome = `accepted${typeof fact?.seq === "number" ? ` (entry ${fact.seq})` : ""}`;
  } else if (typeof answer["answer"] === "string") outcome = `${answer["answer"]}${reason ? ` (${reason})` : ""}`;
  else outcome = "the act could not be confirmed; refresh the card";
  return `${card.identity.kind} ${card.identity.item} ${card.identity.revision}: ${outcome}.`.replace(/\s+/g, " ").slice(0, 512);
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

function checked(projection: Projection, query: ViewQuery): Projection {
  if (utf8(canonicalize(projection)).length > 64 * 1024) throw new ViewError("unavailable", "The card projection exceeds its byte bound.");
  if (!finite(projection.count) || !finite(projection.position) || (projection.count > 0 && projection.position >= projection.count)) throw new ViewError("unavailable", "The card projection has an invalid position.");
  const card = projection.card;
  if (projection.status === "ready" && (!card || projection.count === 0)) throw new ViewError("unavailable", "The projection supplied no card for its ready result.");
  if (card) {
    if (card.actions.length > 2) throw new ViewError("unavailable", "A card may offer at most two acts.");
    if (new Set(card.actions.map((act) => act.id)).size !== card.actions.length) throw new ViewError("unavailable", "Card act IDs must be distinct.");
    shapeAt(card.identity.at);
    if (card.actor?.kind === "agent" && !card.actor.controller) throw new ViewError("unavailable", "The agent projection does not name its controller.");
    for (const entry of card.entries ?? []) if (!finite(entry.seq)) throw new ViewError("unavailable", "An entry position is malformed.");
    for (const point of card.projection) if (!finite(point.seq)) throw new ViewError("unavailable", "A projection read point is malformed.");
    for (const range of [...card.reviewIntended, ...card.unavailable]) if (!finite(range.from) || !finite(range.to) || range.from > range.to) throw new ViewError("unavailable", "An entry range is malformed.");
    for (const action of card.actions) {
      const at = shapeAt(action.args["at"]);
      if (!card.declared) capturedExpected(at, card.identity.at);
      else if (at === undefined || Object.keys(card.identity.at).some(name => Object.hasOwn(at, name) && at[name] !== card.identity.at[name])) throw new ViewError("unavailable", "A declared act disagrees with the displayed subject revision.");
    }
    // The kit knows screen contracts and generic act purposes, never lane states or names.
    card.actions = card.actions.filter((action) => {
      if (query.page === "summary" || query.page === "diff") return false;
      if (card.unresolvedOriginal) return action.purpose === "check-original";
      if (projection.status !== "ready") return false;
      if (query.page === "updates") return action.purpose === "mark-reviewed" && card.unavailable.length === 0 && (card.entries?.length ?? 0) > 0 && canonicalize(mergeRanges(card.reviewIntended)) === canonicalize(ranges(card.entries ?? []));
      if (action.purpose === "mark-reviewed") return false;
      return action.purpose !== "approve" || card.approvalAllowed !== false;
    });
    if (query.page === "updates" && card.actions.length > 1) throw new ViewError("unavailable", "An updates screen may offer only Mark reviewed.");
  }
  return projection;
}

/** Bounded mounted-view state, not authority or custody. Restarted or unknown instances cannot dispatch. */
export class ViewSessions {
  readonly #instances = new Map<string, Instance>();
  readonly #current = new Map<ViewKind, string>();
  constructor(readonly source: ViewSource, readonly access: Parameters<ViewSource["read"]>[1], readonly perform: (kind: string, args: Record<string, unknown>, admit: () => void | Promise<void>) => Promise<CallResult>, readonly settle: (args: Record<string, unknown>) => Promise<CallResult>) {}
  #instance(key: string): Instance {
    const instance = this.#instances.get(key);
    if (!instance) throw new ViewError("absent", "This view is no longer retained. Open it again; no act was sent.");
    return instance;
  }
  #active(instance: Instance): boolean { return this.#current.get(instance.query.screen) === instance.key; }
  #admit(instance: Instance, cut: number): void {
    if (!this.#active(instance)) throw new ViewError("superseded", "A newer card replaced this one. Its receipts remain readable; no new act was sent.");
    if (instance.cut !== cut) throw new ViewError("stale", "The displayed card changed. Read it again; no new act was sent.");
  }
  async open(key: string, screen: ViewKind, subject?: string, items?: Readonly<Record<string, number>>) {
    if (!validKey(key)) throw new ViewError("shape", "Choose a view key of 1 to 128 UTF-8 bytes.");
    const old = this.#instances.get(key);
    if (old) {
      if (old.query.screen !== screen || old.query.subject !== subject || canonicalize(old.query.items ?? {}) !== canonicalize(items ?? {})) throw new ViewError("shape", "This view key already names another opening.");
      return this.opening(old);
    }
    if (this.#instances.size >= MAX_INSTANCES) throw new ViewError("busy", "This connection retains its maximum of 128 views. Start a new connection.");
    const query: ViewQuery = { screen, position: 0, page: this.source.initialPage?.(screen) ?? "summary", ...(subject === undefined ? {} : { subject }), ...(items === undefined ? {} : { items: structuredClone(items) }) };
    const instance: Instance = { key, query, cut: 0, projection: { status: "unavailable", count: 0, position: 0, fallback: "Loading the card." }, busy: true, dispatches: new Map(), pending: new Map() };
    this.#instances.set(key, instance);
    this.#current.set(screen, key);
    try { instance.projection = checked(structuredClone(await this.source.read(query, this.access)), query); }
    catch { instance.projection = { status: "unavailable", count: 0, position: 0, fallback: "The card could not be read. Retry the read; no act was sent." }; }
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
      screen: query.screen, page: query.page, status: projection.status, identity: card ? this.#identity(card) : null,
      projection: card?.projection.map(({ scope, seq, hash }) => ({ scope, seq, hash })) ?? (projection.data ? [{ scope: projection.data.scope.scope, ...projection.data.at }] : []),
      entriesRead: entries, presented: entries.map((range) => ({ ...range })),
      reviewIntended: query.page === "updates" ? structuredClone(card?.reviewIntended ?? []) : [],
      unavailable: structuredClone(card?.unavailable ?? []), waitsOn: [...(card?.waitsOn ?? [])], settles: [...(card?.settles ?? [])],
      navigation: query.page === "summary" ? [...(projection.position > 0 ? ["previous"] : []), ...(projection.position + 1 < projection.count ? ["next"] : []), ...(card ? ["open"] : [])] : ["back", ...(card?.diffAvailable && query.page === "item" ? ["diff"] : [])],
      ...(card?.declared ? { note: card.declared.context } : {}),
      ...(instance.receipt ? { receipt: instance.receipt } : {}),
    };
    return structuredClone({ view: instance.key, cut: instance.cut, active: this.#active(instance), query, status: projection.status, position: projection.position, count: projection.count,
      ...(card ? { card: { ...card, actions: card.actions.map(({ id, label, purpose }) => ({ id, label, purpose })) } } : {}), fallback: projection.fallback, context,
      ...(projection.data ? { data: projection.data } : {}),
      ...(instance.receipt ? { receipt: instance.receipt } : {}) });
  }
  display(key: string) { return this.#display(this.#instance(key)); }
  async read(key: string, cut?: number, move?: { position?: number; page?: PageKind }): Promise<Display> {
    const instance = this.#instance(key);
    if (move) {
      this.#admit(instance, cut ?? -1);
      if (instance.busy) throw new ViewError("busy", "The card has an operation in progress. Retry its read.");
      const position = move.position ?? instance.projection.position;
      const page = move.page ?? instance.query.page;
      if (!finite(position) || !PAGES.has(page)) throw new ViewError("shape", "The card position or page is malformed.");
      if (page === "diff" && !instance.projection.card?.diffAvailable) throw new ViewError("shape", "This card offers no diff.");
      const query = { ...instance.query, position, page };
      instance.busy = true;
      try {
        const projection = checked(structuredClone(await this.source.read(query, this.access)), query);
        this.#admit(instance, cut ?? -1);
        if (projection.card) {
          const pending = instance.pending.get(this.#itemKey(projection.card));
          if (pending && query.page !== "summary" && query.page !== "diff") {
            projection.card.unresolvedOriginal = true;
            projection.card.actions = [pending];
          }
        }
        instance.query = query;
        instance.projection = projection;
        instance.cut++;
      } catch (error) {
        if (error instanceof ViewError) throw error;
        throw new ViewError("unavailable", "The card could not be refreshed. The previous card and receipt are retained.");
      } finally { instance.busy = false; }
    }
    return this.#display(instance);
  }
  async act(key: string, cut: number, actionId: string): Promise<{ result: CallResult; display: Display }> {
    const instance = this.#instance(key);
    const dispatchKey = `${cut}:${actionId}`;
    const action = instance.projection.card?.actions.find((candidate) => candidate.id === actionId);
    const retained = action?.purpose === "check-original" ? undefined : instance.dispatches.get(dispatchKey);
    if (retained) return { result: await retained, display: this.#display(instance) };
    this.#admit(instance, cut);
    if (instance.busy) throw new ViewError("busy", "The card has an operation in progress. Retry its read.");
    if (!action) throw new ViewError("shape", "The displayed card offers no such act.");
    const card = instance.projection.card!;
    if (action.purpose !== "check-original" && instance.dispatches.size >= 32) throw new ViewError("busy", "This card retains its maximum of 32 act outcomes. Open a new card; no new act was sent.");
    // Reserve room before dispatch; checking an already retained original needs no new slot.
    if (!instance.pending.has(this.#itemKey(card)) && instance.pending.size >= 32) throw new ViewError("busy", "This card retains its maximum of 32 unresolved requests. Check those originals before another dispatch.");
    const args = structuredClone(action.args);
    // Use only server-retained input; neither a browser revision nor an arbitrary tool name can retarget this dispatch.
    if (action.purpose === "check-original") {
      if (!validKey(args["idempotencyKey"]) || args["target"] === undefined) throw new ViewError("shape", "The original request's target and custody key are unavailable. No successor was signed.");
    } else {
      if (!card.declared) args["at"] = structuredClone(card.identity.at);
      args["idempotencyKey"] = `view-${crypto.randomUUID()}`;
    }
    instance.busy = true;
    const dispatch = action.purpose === "check-original" ? this.settle(args) : this.perform(action.kind, args, () => {
      this.#admit(instance, cut);
      return this.source.admit?.(instance.query, card, action).then(() => this.#admit(instance, cut));
    });
    if (action.purpose !== "check-original") instance.dispatches.set(dispatchKey, dispatch);
    try {
      const result = await dispatch;
      const answer = result.structuredContent;
      instance.receipt = receiptLine(card, result);
      const itemKey = this.#itemKey(card);
      if (answer["answer"] === "unknown" || answer["answer"] === "unavailable" || answer["error"] === "custody" || answer["error"] === "transport") {
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
