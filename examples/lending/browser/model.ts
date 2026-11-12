/**
 * What the member interface shows and what it may ask for. Plain functions over
 * a declared projection, or historical complete record; nothing here signs or sends.
 */
import type { ApplicationProjectionData, Entry, FactRef, FieldValue, Item, KeyId, MemberRef, Summary } from "@generalbusiness/dap-contract";
import { applicationItemSnapshot, expectedOf, shapeDeclaredAct, type AskedOf, type Kind, type Members } from "@generalbusiness/dap-client";
import { canonicalize, isMemberRef } from "@generalbusiness/dap-bytes";
import { ROLE_LISTS, isActions, type Role } from "@generalbusiness/dap-platform/membership-actions";
import { shelfPage, shelfPath, thingsOf, type RecordPointer, type Thing } from "../shelf.ts";
import { lendingStateProjection } from "./projection.ts";
import { lending, library as declaredLibrary, thing as declaredThing } from "../definition.ts";
import { annotatedRefusal, proposalWords } from "./annotations.ts";

type Definition = typeof lending;
export type LendingAct = Kind<Definition>;
type Fields<K extends LendingAct> = Members<Definition["acts"][K]["fields"]>;
export type ProposalInput = Partial<Pick<Fields<"donate">, "name" | "description"> & Pick<Fields<"cancel">, "reason"> & Pick<Fields<"publish">, "thing">>;
const actKinds = Object.keys(lending.acts).filter((kind): kind is LendingAct => kind !== lending.genesis && Object.hasOwn(lending.acts, kind));
/** A thing with its retained revision; publish reads a gone thing without changing it. */
export interface ShownThing extends Omit<Thing, "seq"> { /** Present only for the historical complete-record adapter. */ seq?: number }
export interface LendingView {
  /** Every thing, live and gone, in the order it was donated. */
  things: ShownThing[];
  library: { id: number; revision: number } | null;
  /** The entry the view reflects. Each page written from this view names it. */
  record: RecordPointer;
  /** True when the record read is older than the summary: the list of gone things may be behind. */
  behind: boolean;
}

/** Labels from the retained donation journal, including things no longer in the live summary. */
export function journalRows(entries: readonly Entry[]): { seq: number; kind: string; signer: string; what: string }[] {
  const names = new Map(thingsOf(entries).map((thing) => [thing.id, thing.name]));
  return entries.flatMap((entry, seq) => {
    if (entry.input.type !== "act") return [];
    const { intent } = entry.input.signed;
    const id = intent.kind === "publish" ? intent.fields["thing"] : intent.on;
    const name = typeof id === "number" ? names.get(id) : undefined;
    const label = name === undefined ? `Unknown thing ${id ?? "(no ID)"}` : `${name || "Unnamed"} (thing ${id})`;
    const what = intent.kind === "donate" ? words(intent.fields["name"])
      : intent.kind === "cancel" ? `${label}: ${words(intent.fields["reason"])}` : label;
    return [{ seq, kind: intent.kind, signer: entry.input.authority[0]?.subject.member ?? "", what }];
  });
}

export const NAME_BYTES = lending.acts.donate.fields.name.max;
export const DESCRIPTION_BYTES = lending.acts.donate.fields.description.max;
export const REASON_BYTES = lending.acts.cancel.fields.reason.max;
const bytes = (text: string): number => new TextEncoder().encode(text).length;
const handle = (party: unknown): string | null =>
  typeof party === "object" && party !== null && typeof (party as { member?: unknown }).member === "string" ? (party as { member: string }).member : null;
const words = (value: FieldValue | null | undefined): string => typeof value === "string" ? value : "";

/**
 * The view of one coherent read: a summary, the head `at` that the read answered at,
 * and the record. Live things come from the summary, which has their revisions. Gone things have left the summary and come from the record.
 */
export function lendingView(summary: Summary, at: { seq: number; hash: string }, entries: readonly Entry[]): LendingView {
  const recorded = thingsOf(entries);
  const live = new Map<number, Item>(summary.items.filter((item) => item.type === "thing").map((item) => [item.id, item]));
  const things: ShownThing[] = [];
  for (const [id, item] of live) {
    const state = item.state === "lent" ? "lent" : "available";
    const known = recorded.find((thing) => thing.id === id);
    things.push({ id, page: words(item.values["page"]), state, name: words(item.values["name"]), description: words(item.values["description"]),
      donor: handle(item.parties["donor"]) ?? "", borrower: handle(item.parties["borrower"]), reason: null,
      seq: known?.seq ?? item.revision, revision: item.revision });
  }
  for (const thing of recorded) if (!live.has(thing.id) && thing.state === "gone") things.push({ ...thing });
  things.sort((a, b) => a.id - b.id);
  const library = summary.items.find((item) => item.type === "library");
  return { things, library: library ? { id: library.id, revision: library.revision } : null, behind: entries.length <= at.seq,
    record: { scope: summary.scope.scope, genesis: summary.scope.genesis, seq: at.seq, hash: at.hash } };
}

/** Actual retained native item fields, including gone things. The bounded
 * journal is separate evidence and never supplies invented item revisions. */
export function lendingProjectionView(data: ApplicationProjectionData): LendingView {
  const snapshot = applicationItemSnapshot(lendingStateProjection, data), library = snapshot.items.find(item => item.type === "library");
  const things: ShownThing[] = snapshot.items.filter(item => item.type === "thing").map(item => ({
    id: item.id, revision: item.revision, state: item.state as ShownThing["state"], page: words(item.values["page"]), name: words(item.values["name"]),
    description: words(item.values["description"]), donor: handle(item.parties["donor"]) ?? "", borrower: handle(item.parties["borrower"]),
    reason: item.values["reason"] === null ? null : words(item.values["reason"]),
  }));
  return { things, library: library ? { id: library.id, revision: library.revision } : null, behind: false,
    record: { scope: data.scope.scope, genesis: data.scope.genesis, seq: data.at.seq, hash: data.at.hash } };
}
export interface LendingActivityRow { entry: Readonly<FactRef>; seq: number; kind: string; signer: string; what: string; time: string }
/** Recent selected acts, at this projection's exact head. This makes no
 * whole-prefix or full-entry read claim. */
export function lendingProjectionActivity(data: ApplicationProjectionData, view: LendingView): LendingActivityRow[] {
  const names = new Map(view.things.map(thing => [thing.id, thing.name]));
  return ["events", "cancellations", "publications"].flatMap(source => (data.sources[source] ?? []).map(row => {
    if (!row.entry || !row.time) throw Error("Lending activity needs sealed native entry facts.");
    const id = row.type === "donate" ? row.id : row.type === "publish" ? row.fields["thing"] : row.on;
    const name = typeof id === "number" ? names.get(id) : undefined;
    const label = name === undefined ? `Unknown thing ${id ?? "(no ID)"}` : `${name || "Unnamed"} (thing ${id})`;
    return { entry: row.entry, seq: row.id, kind: row.type, signer: isMemberRef(row.fields["actor"]) ? row.fields["actor"].member : "", time: row.time,
      what: row.type === "donate" ? name ?? "Unnamed" : row.type === "cancel" ? `${label}: ${words(row.fields["reason"])}` : label };
  })).sort((a, b) => a.seq - b.seq);
}

/** The acts a thing's state allows. Whether the signer may cancel is membership's to say; the scope answers. */
export function actsFor(thing: ShownThing): LendingAct[] {
  return actKinds.filter(kind => {
    const act = lending.acts[kind];
    const readsThing = act.step !== "open" && act.on === declaredThing.name
      || Object.values(act.also).some(binding => binding.item === declaredThing.name);
    return readsThing && act.guards.every(guard => !("state" in guard) || guard.of !== undefined && guard.of !== "on" || guard.state.includes(thing.state));
  });
}

/** This key's active member in an authenticated membership summary.
 * The invitation's proposed handle supplies no identity evidence. */
export function memberForKey(summary: Summary, key: KeyId): MemberRef | null {
  if (summary.scope.kind !== "membership") return null;
  const keys = summary.items.filter(item => item.type === "key" && item.state === "active" && item.values["id"] === key);
  if (keys.length !== 1) return null;
  const seats = summary.items.filter(item => item.type === "member" && item.state === "active" && item.id === keys[0]!.refs["member"]);
  if (seats.length !== 1) return null;
  const seat = seats[0]!, who = seat.parties["member"];
  if (!isMemberRef(who) || canonicalize(who.membership) !== canonicalize(summary.scope) || seat.values["handle"] !== who.member) return null;
  return { membership: { ...who.membership }, member: who.member };
}

/** Presentation from the complete authenticated roster, following Page's key-to-member projection. This issues no grant. */
export function membershipActions(summary: Summary, who: MemberRef, key: KeyId): readonly string[] | null {
  if (canonicalize(summary.scope) !== canonicalize(who.membership)) return null;
  const roster = summary.items.find(item => item.type === "roster" && item.state === "open");
  const ownKey = summary.items.find(item => item.type === "key" && item.state === "active" && item.values["id"] === key);
  const seat = summary.items.find(item => item.type === "member" && item.state === "active" && item.id === ownKey?.refs["member"]);
  if (!roster || !seat || !isMemberRef(seat.parties["member"]) || canonicalize(seat.parties["member"]) !== canonicalize(who)
    || seat.values["handle"] !== who.member) return null;
  const role = seat.values["role"];
  if (typeof role !== "string" || !Object.hasOwn(ROLE_LISTS, role)) return null;
  const actions = roster.values[ROLE_LISTS[role as Role]];
  if (!isActions(actions)) return null;
  // An agent's controller must remain an active member with an active key, as in Page.
  const controller = seat.parties["controller"];
  if (seat.values["kind"] === "agent") {
    if (!isMemberRef(controller) || canonicalize(controller.membership) !== canonicalize(who.membership)) return null;
    const owner = summary.items.find(item => item.type === "member" && item.state === "active" && item.values["handle"] === controller.member);
    if (!owner || !summary.items.some(item => item.type === "key" && item.state === "active" && item.refs["member"] === owner.id)) return [];
  } else if (!["person", "checker"].includes(String(seat.values["kind"])) || controller != null) return null;
  return [...actions];
}

/** Unknown or stale standing offers no cancellation. Native authority still decides every submitted act. */
export function offeredActs(thing: ShownThing, actions: readonly string[] | null): LendingAct[] {
  return actsFor(thing).filter(kind => kind !== "cancel" || actions?.includes(lending.acts.cancel.grant) === true);
}

/** Validate the selected fields once against the authored act, then derive its bound revisions. */
function proposed<K extends LendingAct,F extends Fields<NoInfer<K>>>(view:LendingView,kind:K,asked:AskedOf<Definition,NoInfer<K>> & {fields:F}) {
  const fields:F=asked.fields;
  const shaped = shapeDeclaredAct(lending, kind, asked);
  const items = [
    ...(view.library ? [{ ...view.library, type: declaredLibrary.name, refs: {} }] : []),
    ...view.things.map(thing => ({ id: thing.id, revision: thing.revision, type: declaredThing.name, refs: {} })),
  ];
  return { ok: true, proposal: { kind, on: shaped.on, expected: expectedOf(lending.acts[kind], items, shaped.on, shaped.fields), fields } } as const;
}
const no = (reason: string) => ({ ok: false, reason }) as const;

/** The exact act to sign, or why there is nothing to sign. A refusal here sends nothing. */
export function propose(view: LendingView, kind: LendingAct, input: ProposalInput = {}, author = "", random: () => Uint8Array = () => crypto.getRandomValues(new Uint8Array(8))) {
  const unavailable = (reason: Parameters<typeof proposalWords>[1]) => no(proposalWords(kind, reason));
  if (!view.library) return unavailable("library-unavailable");
  if (kind === "donate") {
    const name = (input.name ?? "").trim(), description = (input.description ?? "").trim();
    if (!name) return unavailable("name-required");
    if (!description) return unavailable("description-required");
    if (bytes(name) > NAME_BYTES) return unavailable("name-too-long");
    if (bytes(description) > DESCRIPTION_BYTES) return unavailable("description-too-long");
    const page = shelfPath(random());
    const content = shelfPage({ id: 0, page, revision: 1, state: "available", name, description, donor: author, borrower: null, reason: null }, view.record);
    return proposed(view, kind, { fields: { name, description, page, content } });
  }
  const thing = view.things.find((candidate) => candidate.id === input.thing);
  if (!thing) return unavailable("thing-unavailable");
  if (kind === "publish") return proposed(view, kind, { on: view.library.id, fields: { thing: thing.id, content: shelfPage(thing, view.record) } });
  if (thing.state === "gone") return unavailable("gone");
  if (!actsFor(thing).includes(kind)) return unavailable(kind === "borrow" ? "lent" : "not-lent");
  if (kind === "cancel") {
    const reason = (input.reason ?? "").trim();
    if (!reason) return unavailable("reason-required");
    if (bytes(reason) > REASON_BYTES) return unavailable("reason-too-long");
    const after = { ...thing, state: "gone" as const, borrower: null, reason };
    return proposed(view, kind, { on: thing.id, fields: { reason, content: shelfPage(after, view.record) } });
  }
  const after = { ...thing, state: kind === "borrow" ? "lent" as const : "available" as const, borrower: kind === "borrow" ? author : null };
  return proposed(view, kind, { on: thing.id, fields: { content: shelfPage(after, view.record) } });
}
export type Proposed = ReturnType<typeof propose>;
export type Proposal = Extract<Proposed, { ok: true }>["proposal"];

/** A refusal in plain words, with the reason the scope gave. */
export const refusalWords = annotatedRefusal;
