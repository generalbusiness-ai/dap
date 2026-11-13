import { commonsAuthorLabels, loadCommons, type CommonsView } from "@generalbusiness/dap-client";
import { stringOrNull as text } from "@generalbusiness/dap-bytes";
import { APPROVAL_LIMIT, decidedLine, exactRule, laneName, otherRequestLine, questionOffers, questionRows, questions as questionProfile, reasonLines, whyLine, type Reasons } from "../../../views/src/attention.ts";
import { LIMITS, controllerIn, keyHolder, laneRefs, laneWindow, needsYouRows, type Frame, type Row } from "../../../views/src/needs-you.ts";
import { sameOptional, shownText } from "../../../views/src/words.ts";
import { isRecord as record } from "@generalbusiness/dap-bytes";
import { actBodyText, deviceKeyInvitationOf, encodeDeviceKeyInvitation, invitationIssueFields, invitationRedemptionFields, isInvitationMembership, originalsAt, type DeviceKeyInvitation } from "@generalbusiness/dap-client";
/**
 * The page's data functions: what it reads from a room and the one thing it
 * writes, a signed act. Each takes a `Session`, the scope service's base URL
 * and an Ed25519 signer, and goes over the service's HTTP routes
 * through the client's transport. The view (`view.ts`) only shows what these
 * return, and a test calls them without a browser.
 *
 * The page judges nothing. What the caller may sign is listed from the
 * definition and the caller's role in membership, as `artroom acts` lists it
 * (`heldActs` of the command line). Whether an act takes effect is the
 * scope's answer, and a refusal is shown with its reason; it writes nothing,
 * and `act` reads the head before and after to show that.
 *
 * | Function | Reads |
 * |---|---|
 * | `placeOf` | Nothing: the room's directory and membership, from an invitation link or the command line's config file. |
 * | `joinRoom` | Signs membership's `join` with an invitation link, which enrols the page's key. |
 * | `openRoom` | A read session from membership; the directory's repository item, for the rules scope and the destination; the caller's standing in membership. |
 * | `listLanes` | The directory's index rows, one for each lane, with each lane's own state. |
 * | `loadNeedsYou` | The rows of `needs_you` for the caller, over one window of the directory's lanes, and those lanes' decided questions. It signs no act and never throws. |
 * | `loadIssue` | An issue lane: its intent, assignees, state, comments, open questions and decided questions. |
 * | `loadChange` | A change lane: its proposal, versions (a one-file version's path, digest and size), reviews by extent, review requests, checks, links and merges, the rules it holds, and for each merge the destination's publication and its outside operations. |
 * | `loadRules` | The rules scope: the rules of the room, the active definitions, and which members may change the rules. |
 * | `loadSite` | One page of the room's published site, as the site route answers it. |
 * | `actsOn` | The acts of a scope's definition that the caller may sign now. |
 * | `act` | Signs one act, keeps its copy at membership, sends it with a definition's bytes beside it where a field states their place, ends the copy on the scope's answer, and reads the head before and after. |
 * | `issueDeviceKey` | Signs membership's `invite-key` for an existing member, and returns the private `device-key` invitation link. |
 *
 * **Who reads.** Every read presents a read session that membership
 * issued to the caller's key, renewed when it has ended. Where the page gets
 * none (membership refuses a key that is no active member's, a key with too
 * many requests, or every key on a deployment with no session secret; or the
 * request gets no reply), each read the client can sign goes as a signed read
 * by the caller's key, and the scope decides: it answers only where that key
 * signed an entry within the window of an intent. A read that is refused is
 * shown as its reason. A directory read refused on open also keeps why the
 * page has no session, which the page shows as the cause and the next step.
 */

import type { Answer, Beside, DeclaredDefinition, Digest, Entry, FactRef, FieldValue, Head, Item, KeyId, MemberRef, ScopeId, ScopeRef, Summary, Read, SignedIntent, Receipt, OutboxId } from "@generalbusiness/dap-contract";
import { LATE, b64url, byteOrder, canonicalize, definitionDigest, intentDigest, isEntryBodyOf, isFactRef, isMemberRef, isScopeId, isSeed, scopeIdOf, isScopeRef as fullScopeRef, takeBytes, textDigest, timeMs, timeOf, verifySignedIntent, type Expiry } from "@generalbusiness/dap-bytes";
import {
  ScopeHandle, activeDirectory, collectItemQuery, partitionIndexes, completeSummary, declaredHandle, httpTransport, openHttpHeadStream, requestSession, secretSigner, signerSessionRequest, shapeDeclaredAct, signedIntent, signedReads, type Fetch, type Session as ReadSession, type Signer, type Signing, type Transport,
} from "@generalbusiness/dap-client";
import { LINK, describe, expectedOf, heldActs, linkOf, valueOf, type ActShape, type DefinitionShape, type Standing } from "@generalbusiness/dap-cli/browser";
import { answersVersionRelation, pagePartitionOpeningDeclaration, answersVersionQuestion, DEFINITION_DOMAIN, ROLE_LISTS, fileSound, firstExtents, isExtents, platform, type Role } from "@generalbusiness/dap-platform";
import type { Extent as PolicyExtent } from "@generalbusiness/dap-platform";
import { Q11_READ_ONLY, rulesSummaryV11 } from "./rules-summary-v11.ts";
import { knownLIST1 } from "./source-support.ts";
import { currentStanding, reviewCandidates } from "./membership-projection.ts";
import { pressStop, rowsLastRead } from "./open-requests.ts";
import type { PageObservationSource } from "./page-observation.ts";
import type { NoSession } from "./shell.ts";

/** Who is reading and signing, and where. `fetch` and `now` replace the runtime's, as a test does. */
export type Session = {
  service: string;
  fetch?: Fetch;
  /** The clock that intents and reads are signed by, in milliseconds. */
  now?: () => number;
} & ({ signer: Signer; secret?: never } | { secret: Uint8Array; signer?: never });
/** Legacy seed callers are supported during import and by existing CLI tests; retained page sessions
 * use only the nonexportable signing capability. */
export const sessionSigner = (session: Session): Signer => session.signer ?? secretSigner(session.secret);
export const sessionKey = (session: Session): KeyId => sessionSigner(session).key;

/**
 * Where a room is: its directory, and its membership scope with the
 * incarnation that a session request names. A key that is not yet a
 * member reads neither, so the page is told both: by an invitation link,
 * or by the command line's config file.
 */
export interface Place { directory: ScopeId; membership: ScopeRef }

/** A room as the page has opened it: the four scopes it reads, and the caller's key and standing. */
export interface Room {
  session: Session;
  directory: ScopeId;
  directoryIndex: { scope: ScopeRef; definition: Summary["definition"] } | null;
  membership: ScopeRef;
  rules: ScopeId;
  destination: ScopeId;
  /** Exact optional sibling; older rooms have no Commons. */
  commons?: ScopeRef;
  /** The repository name already recorded by the directory; no claimed display name is inferred. */
  name?: string;
  /** Missing publication is recognized only from the exact unpublished directory. */
  publication?: "repository" | "unpublished";
  key: KeyId;
  /** The caller's role and actions in membership, or null when the key is no active member's. */
  me: (Standing & { ref?: MemberRef }) | null;
  /** The read session the caller presents, or null when membership gave none; then reads are signed reads. */
  reader: ReadSession | null;
  /** Why membership gave no session, or null when it gave one. */
  unsessioned: string | null;
  /** Definitions read so far, by digest: a lane's definition is read once. */
  definitions: Map<string, DeclaredDefinition>;
}

/** A read that failed: the page shows this text and nothing else about the thing it could not read. `noSession` says why the page held no session, where a refused open has that cause. */
export class Unreadable extends Error {
  override readonly name = "Unreadable";
  constructor(message: string, readonly noSession: NoSession | null = null) { super(message); }
}

export const nowOf = (session: Session): number => session.now?.() ?? Date.now();
const transportOf = (session: Session, reader: string | null = null): Transport => {
  const transport = httpTransport(session.service, session.fetch ? { fetch: session.fetch } : {});
  return typeof reader === "string" ? transport : signedReads(transport, sessionSigner(session), session.now ? { now: session.now } : {});
};

/** A handle on one scope that presents the caller's session, or signs each read where there is none. */
export const handleOf = (room: Pick<Room, "session" | "reader">, scope: ScopeId): ScopeHandle => {
  const reader = room.reader?.reader() ?? null;
  return new ScopeHandle(transportOf(room.session, reader), scope, reader);
};

/** Each service, membership and key under which this page load held a read session. Memory only: closing or leaving a room forgets nothing, and only a new page load does. */
const heldSessions = new Set<string>();
const heldContext = (session: Session, membership: ScopeRef, key: string): string => JSON.stringify([session.service.replace(/\/+$/, ""), membership.scope, membership.genesis, key]);
/**
 * Since this page loaded, it held a read session under this service, membership
 * and key, and it holds none now. It cannot keep a copy, and it must not send as
 * if it had. After a new page load this is false, and a page that opens with no
 * session stays on signed reads.
 */
export const sessionLost = (room: Pick<Room, "session" | "reader" | "membership" | "key">): boolean => !room.reader && heldSessions.has(heldContext(room.session, room.membership, room.key));

/** Renews the caller's session when it has ended, or will within ten seconds. A room that membership gave no session stays on signed reads. */
export async function fresh(room: Room): Promise<void> {
  if (room.reader) heldSessions.add(heldContext(room.session, room.membership, room.key));
  if (!room.reader || !room.reader.endedBy(timeOf(nowOf(room.session) + 10_000))) return;
  const asked = await readerFor(room.session, room.membership);
  room.reader = asked.session;
  room.unsessioned = asked.why;
}

/** Asks again for the session of a page that lost it. A page on signed reads asks for nothing. */
export async function renewLost(room: Room): Promise<void> {
  if (!sessionLost(room)) return;
  const asked = await readerFor(room.session, room.membership);
  room.reader = asked.session;
  room.unsessioned = asked.why;
}

export async function summaryOf(handle: ScopeHandle, atLeast?: Receipt, noSession: NoSession | null = null): Promise<{ summary: Summary; at: Head }> {
  const read = await handle.summary(atLeast);
  if (!read.ok) throw new Unreadable(`Cannot read ${handle.scope}: ${read.reason}.`, read.reason === "forbidden" ? noSession : null);
  if (!read.complete || read.next !== undefined) throw new Unreadable(`Cannot read ${handle.scope}: incomplete summary.`);
  return { summary: read.value, at: read.at };
}

/** The selected scope's actual complete summary binds observation identity.
 * These reads never update an Acted record or confirm a mutation. */
export async function pageObservationSource(room: Room, scope: ScopeId, signal: AbortSignal): Promise<PageObservationSource> {
  let expected: ReadSession["claims"] | undefined;
  const matches = (reader: ReadSession | null): boolean => !!reader && (!expected || reader.claims.deployment === expected.deployment
    && reader.claims.member === expected.member && reader.claims.key === expected.key
    && canonicalize(reader.claims.membership) === canonicalize(expected.membership));
  const ownedRoom = (expiry: Expiry, reader = room.reader): Room => {
    const send = room.session.fetch ?? globalThis.fetch;
    const session: Session = { ...room.session, fetch: (url, init) => send(url, { ...init, signal: expiry as never }) };
    return { ...room, session, reader };
  };
  const read = async (expiry: Expiry, reader?: ReadSession) => {
    const owned = ownedRoom(expiry, reader ?? room.reader);
    if (!reader) await fresh(owned);
    if (expected && !matches(owned.reader))
      throw new Unreadable("The update session names another connection.");
    const got = completeSummary(await handleOf(owned, scope).summary());
    if (expiry.aborted || !got.ok || !got.complete || got.next !== undefined || !fullScopeRef(got.value.scope) || got.value.scope.scope !== scope)
      throw new Unreadable("The complete update summary could not be read.");
    if (!reader) { room.reader = owned.reader; room.unsessioned = owned.unsessioned; }
    return got;
  };
  const first = await read(signal), session = room.reader;
  if (!session || !room.me || session.claims.member !== room.me.handle) throw new Unreadable("A current read session is required for live updates.");
  // The Page trusts its own serving HTTPS origin, including its accepted native
  // session response. This captures that service's deployment once; it is not
  // an independent deployment assertion. Renewals must match this fixed value.
  expected = session.claims;
  return {
    initial: first.value,
    poll: async expiry => (await read(expiry)).value,
    options: {
      context: { origin: room.session.service, scope: first.value.scope, definition: first.value.definition,
        membership: room.membership, member: session.claims.member, key: room.key, deployment: session.claims.deployment },
      seconds: 10,
      now: () => nowOf(room.session),
      authenticate: async expiry => {
        const owned = ownedRoom(expiry); await fresh(owned);
        if (expiry.aborted || !owned.reader) return { ok: false, reason: "unavailable" };
        if (matches(owned.reader)) { room.reader = owned.reader; room.unsessioned = owned.unsessioned; }
        return { ok: true, session: owned.reader };
      },
      snapshot: (reader, expiry) => read(expiry, reader),
      open: (reader, expiry) => openHttpHeadStream(room.session.service, first.value.scope, reader, expiry),
    },
  };
}

const rosterReads = new WeakMap<Room, Promise<{ summary: Summary; standing: Standing | null }>>();
/** Keep the last complete identity visible while reading. Callers await this read before offering acts;
 * a completed roster replaces standing atomically, and a failed read clears it. Concurrent draws share the read. */
function refreshRoster(room: Room): Promise<{ summary: Summary; standing: Standing | null }> {
  const pending = rosterReads.get(room);
  if (pending) return pending;
  const read = (async () => {
    try {
      const { summary } = await summaryOf(handleOf(room, room.membership.scope));
      if (canonicalize(summary.scope) !== canonicalize(room.membership)) throw new Unreadable("The roster names another membership incarnation.");
      const standing = currentStanding(summary.items, room.membership, room.key);
      room.me = standing;
      return { summary, standing };
    } catch (error) { room.me = null; throw error; }
  })();
  rosterReads.set(room, read);
  const clear = () => { if (rosterReads.get(room) === read) rosterReads.delete(room); };
  // Both bookkeeping branches fulfill; callers keep the original read's rejection.
  void read.then(clear, clear);
  return read;
}
/** Session renewal supplies no permission observation; the complete authenticated roster does. */
async function refreshStanding(room: Room): Promise<Standing | null> {
  return (await refreshRoster(room)).standing;
}

/** Collect only a complete enumeration. Existing caller budgets stay unchanged. */
async function pagesOf<T>(request: (cursor?: string) => Promise<Read<readonly T[]>>, what: string, budget: number, at: Head): Promise<T[]> {
  const rows: T[] = [];
  let cursor: string | undefined;
  for (let pages = 0; pages < budget; pages++) {
    const page = await request(cursor);
    if (!page.ok) throw new Unreadable(`${what}: ${page.reason}.`);
    if (page.at.seq !== at.seq || page.at.hash !== at.hash) throw new Unreadable(`${what}: head changed; enumeration incomplete.`);
    rows.push(...page.value);
    if (page.next === undefined) {
      if (!page.complete) throw new Unreadable(`${what}: incomplete enumeration.`);
      return rows;
    }
    cursor = page.next;
  }
  throw new Unreadable(`${what}: page budget exhausted; enumeration incomplete.`);
}

/** A finite selected suffix at the same head as its surrounding view.
 * Incomplete/refused coverage never becomes a complete item inventory. */
export async function itemsOf(room: Room, handle: ScopeHandle, summary: Summary, type: string, at: Head): Promise<Item[]> {
  const declared = platform(summary.definition)?.data ?? await laneDefinition(room, handle, summary);
  const selected = declared.items[type];
  if (!selected) throw new Unreadable(`The definition of ${handle.scope} declares no ${type} items.`);
  const states = Object.keys(selected.states).sort(byteOrder);
  const coverage = await collectItemQuery(handle, { v: 1, scope: summary.scope, type, states, ids: null, limit: 100, cursor: null }, { pages: 4, bytes: 1024 * 1024, milliseconds: 10_000 });
  if (!coverage.complete) throw new Unreadable(`Cannot read ${type} items of ${handle.scope}: incomplete (${coverage.reason ?? "unavailable"}); items read: ${coverage.items.length}.`);
  if (!coverage.at || coverage.at.seq !== at.seq || coverage.at.hash !== at.hash) throw new Unreadable(`Cannot read ${type} items of ${handle.scope}: head changed; enumeration incomplete.`);
  return [...coverage.items];
}

/** A detached text by its digest, or null when the scope holds none (as after a redaction) or the slot is empty. */
async function textOf(handle: ScopeHandle, digest: FieldValue | null | undefined): Promise<string | null> {
  if (typeof digest !== "string") return null;
  const read = await handle.text(digest as Digest);
  return read.ok ? read.value : null;
}

const memberOf = (party: unknown): string | null => (party && typeof party === "object" && "member" in party ? String((party as MemberRef).member) : null);
const membersOf = (party: unknown): string[] => (Array.isArray(party) ? party.map(memberOf).filter((m): m is string => m !== null) : []);
const scopeOf = (ref: FieldValue | null | undefined): ScopeId | null => (ref && typeof ref === "object" && "scope" in ref ? (ref as { scope: ScopeId }).scope : null);

// ---------------------------------------------------------------- the room

const hasScopeRefFields = (v: unknown): v is ScopeRef =>
  typeof v === "object" && v !== null && typeof (v as ScopeRef).scope === "string" && typeof (v as ScopeRef).genesis === "string";

/**
 * The room that a text names: an invitation link from `artroom invite`, or
 * the command line's config file (`config.json`), whose `repository` names
 * the directory and membership. Null when the text is neither. The link's
 * secret is not kept here: `joinRoom` reads it from the link.
 */
export function placeOf(typed: string): Place | null {
  const trimmed = typed.trim();
  try {
    const parsed = (trimmed.startsWith(LINK) ? linkOf(trimmed) : JSON.parse(trimmed)) as { repository?: { directory?: unknown; membership?: unknown }; directory?: unknown; membership?: unknown } | null;
    const repository = parsed?.repository ?? parsed;
    // Encoding only: a syntactically valid Place proves no birth or authority.
    if (!fullScopeRef(repository?.directory)
      || !fullScopeRef(repository?.membership)) return null;
    return { directory: repository.directory.scope, membership: repository.membership };
  } catch {
    return null;
  }
}

/** Encoding checks before signing, not provenance or server authority.
 * Routing stays on the configured service; normalization matches httpTransport. */
function admittedInvitation(link: NonNullable<ReturnType<typeof linkOf>>): boolean {
  const membership = isInvitationMembership(link.definition) ? platform(link.definition) : null;
  return typeof link.handle === "string" && link.invitation > 0
    && fullScopeRef(link.repository?.directory)
    && fullScopeRef(link.repository?.membership)
    && isScopeId(link.repository?.rules) && isScopeId(link.repository?.destination)
    && membership?.data.name === "platform:membership" && membership.data.acts["join"] !== undefined;
}

/** Enrollment custody follows the actual target and signing key, independently
 * of whichever room the Page currently selects. Another invitation does not
 * settle an unknown enrollment under that same identity. */
export function enrollmentAssociation(session: Session, membership: ScopeRef): string {
  if (!fullScopeRef(membership)) throw new Unreadable("Enrollment requires a complete membership reference.");
  return canonicalize([session.service.replace(/\/+$/, ""), membership, sessionKey(session)]);
}

export function joinAssociation(session: Session, typed: string): string {
  const device = deviceLinkOf(session.service, typed);
  if (device) return enrollmentAssociation(session, device.repository.membership);
  const link = linkOf(typed.trim(), session.service);
  if (!link || !admittedInvitation(link)) throw new Unreadable("The invitation does not match this configured service, complete repository references and an explicit supported membership version.");
  return enrollmentAssociation(session, link.repository.membership);
}

/**
 * Attempts to enrol the page's key in the room an invitation link names: membership's
 * `join`, with the invitation's number and secret, signed by the key. Its
 * fields are read from the exact supported membership hint the link names.
 * The hint is not proven provenance; the answer is membership's. This direct
 * request has no CLI-style saved enrollment envelope or durable recovery.
 */
/** A `device-key` link for this service, or null when the text is no such link. */
function deviceLinkOf(service: string, typed: string): DeviceKeyInvitation | null {
  const device = deviceKeyInvitationOf(typed.trim());
  if (!device) return null;
  if (device.service.replace(/\/+$/, "") !== service.replace(/\/+$/, "") || platform(device.definition)?.data.acts["enrol"] === undefined) throw new Unreadable("The device invitation does not match this configured service and an explicit supported membership version.");
  return device;
}
export interface PreparedJoin { place: Place; definition: string; handle: string; link: Digest; signed: SignedIntent }
/** Encoding only: validate the explicit invitation before a key is prepared. */
export function invitationTarget(service: string, typed: string): Omit<PreparedJoin, "signed"> {
  if (typed.length > 16 * 1024) throw new Unreadable("The invitation exceeds its bound.");
  const device = deviceLinkOf(service, typed);
  if (device) return { place: { directory: device.repository.directory.scope, membership: device.repository.membership }, definition: device.definition, handle: device.handle, link: textDigest(canonicalize(device)) };
  const link = linkOf(typed.trim(), service);
  if (!link || !admittedInvitation(link)) throw new Unreadable("The invitation does not match this configured service, complete repository references and an explicit supported membership version.");
  return { place: { directory: link.repository.directory.scope, membership: link.repository.membership }, definition: link.definition, handle: link.handle, link: textDigest(canonicalize(link)) };
}
/** Retain the exact signed request privately; legacy fields contain the invitation secret. */
export async function prepareJoin(session: Session, typed: string): Promise<PreparedJoin> {
  const target = invitationTarget(session.service, typed), device = deviceLinkOf(session.service, typed);
  if (device) {
    const fields = invitationRedemptionFields(device.definition, device.repository.membership, device.invitation.seq, sessionKey(session), device.secret);
    const signed = await signedIntent(sessionSigner(session), { to: device.repository.membership, kind: "enrol", on: 0, fields, expected: device.expected }, session.now ? { now: session.now() } : {});
    return { ...target, signed };
  }
  const link = linkOf(typed.trim(), session.service)!;
  const shape = platform(target.definition)!.data as unknown as DefinitionShape;
  const fields = invitationRedemptionFields(target.definition, target.place.membership, link.invitation, sessionKey(session), link.secret);
  const signing: Signing = session.now ? { now: session.now() } : {};
  const signed = await signedIntent(sessionSigner(session), { to: target.place.membership, kind: "join", fields, expected: expectedOf(shape.acts["join"]!, [], null, fields) }, signing);
  return { ...target, signed };
}
/** Submit the original envelope, never sign a replacement in this operation. */
export async function submitJoin(session: Session, prepared: PreparedJoin): Promise<Answer> {
  return new ScopeHandle(transportOf(session), prepared.place.membership.scope, null).submit(prepared.signed);
}
/** Read-only settlement of the original signed request. Missing is not proof of no dispatch. */
export async function settleJoin(session: Session, prepared: PreparedJoin): Promise<Receipt | null> {
  const result = await new ScopeHandle(transportOf(session), prepared.place.membership.scope, null).settle(prepared.signed);
  return result.ok ? result.value : null;
}
export async function verifyJoinReceipt(session: Session, prepared: PreparedJoin, receipt: Receipt): Promise<boolean> {
  if (receipt.definition !== prepared.definition || receipt.intent !== intentDigest(prepared.signed.intent) || canonicalize(receipt.fact.at) !== canonicalize(prepared.place.membership)) return false;
  const followed = await new ScopeHandle(transportOf(session), prepared.place.membership.scope, null).followReceipt(receipt);
  return followed.ok && followed.entry.input.type === "act" && canonicalize(followed.entry.input.signed) === canonicalize(prepared.signed);
}
export async function joinRoom(session: Session, typed: string, submitting?: () => void): Promise<{ place: Place; answer: Answer }> {
  const prepared = await prepareJoin(session, typed);
  submitting?.();
  return { place: prepared.place, answer: await submitJoin(session, prepared) };
}

/**
 * Opens the room at `place`. The page asks membership for a read session
 * signed for by the caller's key, and presents it to every read; where
 * membership refuses one, the reads are signed reads. Then it reads the
 * directory's repository item for the rules scope and the destination, and
 * the caller's standing in membership.
 */
export async function openRoom(session: Session, place: Place): Promise<Room> {
  const key = sessionKey(session);
  const asked = await readerFor(session, place.membership);
  if (asked.session) heldSessions.add(heldContext(session, place.membership, key));
  const room: Room = { session, directory: place.directory, directoryIndex: null, membership: place.membership, rules: "" as ScopeId, destination: "" as ScopeId, key, me: null, reader: asked.session, unsessioned: asked.why, definitions: new Map() };
  const { summary } = await summaryOf(handleOf(room, place.directory), undefined, asked.why === null ? null : { why: asked.why, ...(asked.retryAfterSeconds === undefined ? {} : { retryAfterSeconds: asked.retryAfterSeconds }) });
  room.directoryIndex = { scope: summary.scope, definition: summary.definition };
  const repository = summary.items.find((item) => item.type === "repository");
  const M = repository?.refs["membership"];
  const rules = scopeOf(repository?.refs["rules"]);
  const destination = scopeOf(repository?.refs["destination"]);
  if (!repository || !hasScopeRefFields(M) || !rules || !destination) throw new Unreadable(`The directory ${place.directory} names no membership, rules scope and destination yet.`);
  if (M.scope !== place.membership.scope || M.genesis !== place.membership.genesis) throw new Unreadable(`The directory ${place.directory} names another membership scope than ${place.membership.scope}.`);
  room.rules = rules;
  room.destination = destination;
  const commons = repository.refs["commons"];
  if (fullScopeRef(commons)) room.commons = commons;
  else if (commons !== undefined && commons !== null) throw new Unreadable("The directory has an invalid Commons reference.");
  const recordedRepository = repository.values["repository"];
  if (answersVersionQuestion(summary.definition, "pageUnpublishedDirectory") && summary.status === "active" && repository.state === "open" && recordedRepository == null) room.publication = "unpublished";
  else if (recordedRepository && typeof recordedRepository === "object" && !Array.isArray(recordedRepository) && ["host", "namespace", "name", "id"].every(field => field in recordedRepository && typeof (recordedRepository as Record<string, unknown>)[field] === "string")) room.publication = "repository";
  else throw new Unreadable(`The directory ${place.directory} records no valid publication metadata.`);
  if (recordedRepository && typeof recordedRepository === "object" && !Array.isArray(recordedRepository) && "name" in recordedRepository && typeof recordedRepository["name"] === "string") room.name = recordedRepository["name"];
  await refreshStanding(room);
  return room;
}

/** A read session from membership, signed for by the caller's key, or why membership gave none. A request that got no reply is `no-reply`. */
async function readerFor(session: Session, membership: ScopeRef): Promise<{ session: ReadSession | null; why: string | null; retryAfterSeconds?: number }> {
  const asked = await signerSessionRequest(membership, sessionSigner(session), timeOf(Math.floor(nowOf(session) / 1000) * 1000 + 60_000), b64url(crypto.getRandomValues(new Uint8Array(16))));
  try {
    const answer = await requestSession(session.service, membership.scope, asked, session.fetch ? { fetch: session.fetch } : {});
    return answer.ok ? { session: answer.session, why: null } : { session: null, why: answer.reason, ...(answer.retryAfterSeconds === undefined ? {} : { retryAfterSeconds: answer.retryAfterSeconds }) };
  } catch {
    return { session: null, why: "no-reply" };
  }
}

/** One advisory directory-index row. Open the lane for its current state. */
export interface LaneRow { scope: ScopeId; number: number | null; kind: "issue" | "pr" | null; title: string | null; state: string | null; draft: boolean | null }

/** One bounded directory-index page. Its notices are advisory; opening a
 * row reads that lane. Listing never fetches each lane's details. */
export async function listLanes(room: Room): Promise<{ issues: LaneRow[]; changes: LaneRow[] }> {
  await fresh(room);
  const items = await directoryLanes(room);
  const rows: LaneRow[] = [];
  for (const item of items) {
    const scope = scopeOf(item.refs["scope"]);
    if (!scope) continue;
    rows.push({ scope, number: typeof item.values["number"] === "number" ? item.values["number"] : null, kind: (text(item.values["kind"]) as LaneRow["kind"]) ?? null,
      title: text(item.values["title"]), state: text(item.values["state"]), draft: typeof item.values["draft"] === "boolean" ? item.values["draft"] : null });
  }
  rows.sort((a, b) => (a.number ?? 0) - (b.number ?? 0));
  return { issues: rows.filter(row => row.kind === "issue"), changes: rows.filter(row => row.kind === "pr") };
}

/** Every lane row of the directory's index, complete or refused. */
async function directoryLanes(room: Room): Promise<readonly Item[]> {
  const index = room.directoryIndex;
  if (!index || index.scope.scope !== room.directory) throw new Unreadable("The room has no bound directory index reference. Reopen the room.");
  if (answersVersionQuestion(index.definition, "pagePartitionRootDirectory")) {
    const coverage = await partitionIndexes({ summary: scope => handleOf(room, scope).summary(), query: (scope, query) => handleOf(room, scope).queryItems(query) }, index.scope, room.membership);
    if (!coverage.complete) throw new Unreadable(`Directory indexes incomplete (${coverage.reason ?? "unavailable"}); partitions read: ${coverage.indexes.length}.`);
    return coverage.indexes.flatMap(part => [...part.lanes]);
  }
  const declared = platform(index.definition)?.data.items["lane"];
  if (!declared) throw new Unreadable("The directory index definition is unsupported.");
  const coverage = await collectItemQuery(handleOf(room, room.directory), { v: 1, scope: index.scope, type: "lane", states: Object.keys(declared.states).sort(byteOrder), ids: null, limit: 100, cursor: null });
  if (!coverage.complete) throw new Unreadable(`Directory index incomplete (${coverage.reason ?? "unavailable"}); rows read: ${coverage.items.length}.`);
  return coverage.items;
}

// ---------------------------------------------------------------- one lane

/** A lane's definition, as the scope retains it under the digest its summary names. */
async function laneDefinition(room: Room, handle: ScopeHandle, summary: Summary): Promise<DeclaredDefinition> {
  const kept = room.definitions.get(summary.definition);
  if (kept) {
    if (definitionDigest(kept) !== summary.definition) throw new Unreadable(`The retained definition of ${handle.scope} does not match its pin.`);
    return kept;
  }
  const read = await handle.definition();
  if (!read.ok) throw new Unreadable(`Cannot read the definition of ${handle.scope}: ${read.reason}.`);
  if (!read.complete || read.next !== undefined) throw new Unreadable(`Cannot read the definition of ${handle.scope}: incomplete.`);
  if (definitionDigest(read.value) !== summary.definition) throw new Unreadable(`The retained definition of ${handle.scope} does not match its pin.`);
  room.definitions.set(summary.definition, read.value);
  return read.value;
}

export interface Comment { id: number; author: string | null; state: string; body: string | null }

const commentsOf = async (room: Room, handle: ScopeHandle, summary: Summary, at: Head): Promise<Comment[]> =>
  Promise.all((await itemsOf(room, handle, summary, "comment", at)).map(async (c) => ({ id: c.id, author: memberOf(c.parties["author"]), state: c.state, body: await textOf(handle, c.values["body"]) })));

/** One open question at one read of the lane, in the words `apps/views` gives. These rows grant nothing. */
export interface QuestionAnswer { kind: "approve" | "decide"; label: string; on: string; typed: Record<string, string> }
export interface QuestionRowView { item: number; needs: string; why: string; lines: string[]; exact: string }
export interface QuestionView {
  ask: number; question: string; body: string | null;
  /** The Brief's digest and the limit of an approval. The Page holds no Brief, so it cannot compare the two. */
  brief: string | null;
  /** The rows for this viewer, the requests that name another member, and the answers this viewer can press. */
  rows: QuestionRowView[]; others: string[]; answers: QuestionAnswer[];
}
/** A question that took its decision. `by` and `at` come from the decide entry, and are null where this read did not fetch that entry. */
export interface DecidedQuestion { ask: number; line: string; question: string; body: string | null; by: string | null; at: string | null; comment: string | null }
export interface IssueView {
  /** The actual intent item used by transitions. */
  intent?: number;
  scope: ScopeId; ref: ScopeRef; definition: string; head: Head;
  number: number | null; title: string | null; body: string | null; state: string; closeReason: string | null;
  createdAt: string | null; modifiedAt: string | null;
  requesterRef: MemberRef | null; requester: string | null; assignees: string[]; conditions: string[]; comments: Comment[];
  /** Each open question of a lane under a question definition. Empty under any other definition. */
  questions: QuestionView[];
  /** Each decided question of the lane, newest first. Empty under any other definition. */
  decided: DecidedQuestion[];
}

/** Times are native genesis/latest-entry times at this full authenticated read frontier. */
async function issueTimes(handle: ScopeHandle, summary: Summary, at: Head): Promise<{ createdAt: string | null; modifiedAt: string | null }> {
  const unavailable = { createdAt: null, modifiedAt: null };
  try {
    const first = await handle.entry(0), last = at.seq === 0 ? first : await handle.entry(at.seq);
    if (!first.ok || !last.ok || !first.complete || !last.complete || first.next !== undefined || last.next !== undefined) return unavailable;
    const genesis = first.value.entry, latest = last.value.entry;
    if (genesis.seq !== 0 || genesis.prev !== null || latest.seq !== at.seq
      || !isEntryBodyOf(genesis, { at: summary.scope, seq: 0, hash: first.value.hash }) || !isEntryBodyOf(latest, { at: summary.scope, seq: at.seq, hash: last.value.hash })
      || last.value.hash !== at.hash
      || timeMs(genesis.time) === null || timeMs(latest.time) === null) return unavailable;
    const final = await summaryOf(handle);
    if (canonicalize(final.summary.scope) !== canonicalize(summary.scope) || canonicalize(final.at) !== canonicalize(at)) return unavailable;
    return { createdAt: genesis.time, modifiedAt: latest.time };
  } catch { return unavailable; } // A denied or changed read supplies no substitute clock.
}

/** The exact fact of one entry of this lane. A name that disagrees with the record gives null, and the Page offers no answer on it. */
async function factOf(handle: ScopeHandle, ref: ScopeRef, value: unknown): Promise<FactRef | null> {
  const seq = typeof value === "number" ? value : isFactRef(value) && canonicalize(value.at) === canonicalize(ref) ? value.seq : null;
  if (seq === null) return null;
  const read = await handle.entry(seq);
  if (!read.ok || !read.complete || read.next !== undefined || read.value.entry.seq !== seq || !isEntryBodyOf(read.value.entry, { at: ref, seq, hash: read.value.hash })) return null;
  const fact: FactRef = { at: ref, seq, hash: read.value.hash };
  return isFactRef(value) && canonicalize(value) !== canonicalize(fact) ? null : fact;
}

/** Each open question and request of one read, in the words of `apps/views`. A request whose question has left the live items comes last, under its own row. */
async function questionsOf(room: Room, handle: ScopeHandle, summary: Summary): Promise<{ questions: QuestionView[]; decided: DecidedQuestion[] }> {
  if (!questionProfile(summary.definition)) return { questions: [], decided: [] };
  const items = summary.items, scope = summary.scope, viewer = room.me?.ref, actions = room.me?.actions ?? [], definition = String(summary.definition);
  const rows = viewer ? questionRows(items, scope, viewer, actions) : [];
  const shown = (row: (typeof rows)[number]): QuestionRowView => ({ item: row.item.id, needs: row.values.needs, why: whyLine(row.values), lines: reasonLines(row.values, { definition, clause: row.clause }), exact: exactRule({ definition, clause: row.clause }) });
  const asks = items.filter(item => item.type === "ask" && item.state === "asked");
  const requests = items.filter(item => item.type === "approval-request" && item.state === "open"), approvals = items.filter(item => item.type === "approval" && item.state === "submitted");
  const about = (item: Item, ask: Item): boolean => { const ref = item.refs["ask"]; return ref === ask.id || isFactRef(ref) && ref.seq === ask.id; };
  const found: QuestionView[] = [];
  for (const ask of asks) {
    const own = requests.filter(item => about(item, ask)), bodyAt = await factOf(handle, scope, ask.refs["bodyAt"]);
    const answers: QuestionAnswer[] = !viewer || !bodyAt ? [] : questionOffers(ask, own, approvals.filter(item => about(item, ask)), bodyAt.seq, viewer, actions).map(offer => offer.kind === "decide"
      ? { kind: "decide", label: offer.label, on: String(ask.id), typed: { bodyAt: canonicalize(bodyAt) } }
      : { kind: "approve", label: offer.label, on: "", typed: { request: String(offer.request!.id), bodyAt: canonicalize(bodyAt), verdict: offer.verdict! } });
    found.push({
      ask: ask.id, question: shownText(ask.values["question"]), body: await textOf(handle, ask.values["body"]), brief: typeof ask.values["brief"] === "string" ? `Brief ${ask.values["brief"]}. ${APPROVAL_LIMIT}` : null,
      rows: rows.filter(row => row.item.id === ask.id || about(row.item, ask)).map(shown), answers,
      others: own.filter(item => !sameOptional(item.parties["requested"], viewer)).map(item => otherRequestLine(item, sameOptional(item.refs["bodyAt"], ask.refs["bodyAt"]))),
    });
  }
  const left = rows.filter(row => row.item.type === "approval-request" && !asks.some(ask => about(row.item, ask)));
  if (left.length) found.push({ ask: -1, question: "", body: null, brief: null, rows: left.map(shown), others: [], answers: [] });
  const decided = await decidedAsks(handle, summary);
  return { questions: found, decided: !decided.length ? [] : await decidedQuestions(handle, summary.scope, decided, (await summaryOf(handleOf(room, room.membership.scope))).summary.items, ISSUE_DECIDED_DETAILS, true) };
}

/** How many decided questions of a lane name who decided and when: on the issue's screen, and in the room's list. The rest keep their question and their entry. */
const ISSUE_DECIDED_DETAILS = 20, LIST_DECIDED_PER_LANE = 5;
const decidedEntry = (ask: Item): number | null => { const ref = ask.refs["decisionAt"]; return typeof ref === "number" ? ref : isFactRef(ref) ? ref.seq : null; };
/** A lane's decided questions at the summary's head, newest decision first. They leave the summary when they take the decision, so this is a query. */
async function decidedAsks(handle: ScopeHandle, summary: Summary): Promise<Item[]> {
  const coverage = await collectItemQuery(handle, { v: 1, scope: summary.scope, type: "ask", states: ["decided"], ids: null, limit: 100, cursor: null }, { pages: 4, bytes: 1024 * 1024, milliseconds: 10_000 });
  if (!coverage.complete) throw new Unreadable(`Cannot read the decided questions of ${handle.scope}: incomplete (${coverage.reason ?? "unavailable"}).`);
  return [...coverage.items].sort((a, b) => (decidedEntry(b) ?? -1) - (decidedEntry(a) ?? -1));
}
/** The words of each decided question. The first `details` read their decide entry, and with `bodies` their text. A read that fails leaves those fields null, and the question keeps its words. */
async function decidedQuestions(handle: ScopeHandle, ref: ScopeRef, asks: readonly Item[], members: readonly Item[], details: number, bodies: boolean): Promise<DecidedQuestion[]> {
  return Promise.all(asks.map(async (ask, index) => {
    const seq = decidedEntry(ask), question = shownText(ask.values["question"]), comment = typeof ask.values["decisionComment"] === "string" ? shownText(ask.values["decisionComment"]) : null;
    const read = seq === null || index >= details ? null : await handle.entry(seq).catch(() => null);
    const entry = read?.ok && read.complete && read.value.entry.seq === seq && isEntryBodyOf(read.value.entry, { at: ref, seq, hash: read.value.hash }) ? read.value.entry : null;
    const input = entry?.input;
    return { ask: ask.id, line: decidedLine(question, seq), question, body: bodies && index < details ? await textOf(handle, ask.values["body"]).catch(() => null) : null,
      by: input?.type === "act" ? keyHolder(members, input.signed.intent.actor)?.member ?? "a key that is no longer active" : null, at: entry?.time ?? null, comment };
  }));
}

// ---------------------------------------------------------------- the room's list

/** One row of `needs_you` in the Page's words. `row` is that row itself. */
export interface LaneLink { scope: ScopeId; kind: "issue" | "change"; lane: string }
export interface NeedsItem extends QuestionRowView, LaneLink { row: Row }
export interface NeedsYouView {
  /** Why the whole list could not be read, or null. */
  failed: string | null;
  items: NeedsItem[]; omittedRows: number; omittedLanes: number;
  /** The lane to name to read the following lanes. Null when no lane follows this window. */
  next: ScopeRef | null;
  /** This read continued after a lane, so it can be the last window. */
  continued: boolean;
  /** The address named no lane, so this read started at the first lane. */
  lostPlace: boolean;
  unread: (LaneLink & { ref: ScopeRef; reason: string })[];
  decided: (DecidedQuestion & LaneLink)[];
  /** Lanes with more decided questions than this list holds, and how many more. */
  older: (LaneLink & { count: number })[];
  decidedUnread: number;
}

/** The lane an address names. Null when it names none. */
export function afterLane(after: string): ScopeRef | null {
  try { const value: unknown = JSON.parse(after); return fullScopeRef(value) ? value : null; } catch { return null; }
}

/**
 * What needs the caller now: the rows of `needs_you`, by the same walk and the same bounds of lanes, rows, items and time. It reads and signs no act, so it moves no head.
 * A lane that fails to read joins `unread`, and any other failure fills `failed`, so the screen around this list still opens.
 */
export async function loadNeedsYou(room: Room, after: string | null = null): Promise<NeedsYouView> {
  const place = after === null ? null : afterLane(after);
  const view: NeedsYouView = { failed: null, items: [], omittedRows: 0, omittedLanes: 0, next: null, continued: !!place, lostPlace: after !== null && !place, unread: [], decided: [], older: [], decidedUnread: 0 };
  try {
    await fresh(room);
    const send = room.session.fetch ?? globalThis.fetch, deadline = AbortSignal.timeout(LIMITS.milliseconds);
    const owned: Room = { ...room, session: { ...room.session, fetch: (url, init) => send(url, { ...init, signal: deadline as never }) } };
    const membership = (await summaryOf(handleOf(owned, room.membership.scope))).summary.items;
    const me = currentStanding(membership, room.membership, room.key);
    if (!me) return { ...view, failed: "This key is not an active member's key, so this list cannot say what needs you." };
    const listed = await directoryLanes(owned), refs = laneRefs(listed);
    if (!refs) return { ...view, failed: "The directory names one lane twice, so this list cannot read it." };
    const { selected, omitted, next } = laneWindow(refs, LIMITS.scopes - 2, place ?? undefined);
    view.omittedLanes = omitted.length; view.next = next;
    const linkOf = (ref: ScopeRef): LaneLink => { const lane = listed.find(item => item.type === "lane" && sameOptional(item.refs["scope"], ref)); return { scope: ref.scope, kind: lane?.values["kind"] === "pr" ? "change" : "issue", lane: laneName(lane) }; };
    const reads = await Promise.all(selected.map(async ref => { try { return await summaryOf(handleOf(owned, ref.scope)); } catch (error) { return error instanceof Unreadable ? error.message : "transport"; } }));
    const unread: { scope: ScopeRef; reason: string }[] = [], frames: Frame[] = [];
    let held = membership.length + listed.length;
    selected.forEach((ref, index) => {
      const read = reads[index]!;
      if (typeof read === "string") return void unread.push({ scope: ref, reason: read });
      if (!sameOptional(read.summary.scope, ref) || read.summary.status !== "active") return void unread.push({ scope: ref, reason: "summary-incomplete" });
      if (held + read.summary.items.length > LIMITS.items) return void unread.push({ scope: ref, reason: "item-limit" });
      held += read.summary.items.length;
      frames.push({ ref, head: read.at, summary: read.summary, items: [...read.summary.items] });
    });
    const found = await needsYouRows(frames, { viewer: me.ref, actions: me.actions, unread, controller: member => controllerIn(membership, room.membership, member),
      items: async (frame, type, states, ids) => {
        const coverage = await collectItemQuery(handleOf(owned, frame.ref.scope), { v: 1, scope: frame.ref, type, states: [...states].sort(byteOrder), ids: [...ids], limit: 100, cursor: null });
        if (!coverage.complete || !coverage.at || !sameOptional(coverage.at, frame.head)) throw new Unreadable(`Cannot read ${type} items of ${frame.ref.scope}: incomplete.`);
        return [...coverage.items];
      } });
    const rows = found.slice(0, LIMITS.rows);
    view.omittedRows = found.length - rows.length;
    view.items = rows.map(row => { const reasons = row as unknown as Reasons; return { ...linkOf(row.scope), row, item: row.item, needs: reasons.needs, why: whyLine(reasons), lines: reasonLines(reasons, row.rule), exact: exactRule(row.rule) }; });
    view.unread = unread.map(row => ({ ...linkOf(row.scope), ref: row.scope, reason: row.reason }));
    const decided = await Promise.all(frames.filter(frame => questionProfile(frame.summary.definition)).map(async frame => {
      try {
        const handle = handleOf(owned, frame.ref.scope), asks = await decidedAsks(handle, frame.summary), link = linkOf(frame.ref), shown = asks.slice(0, LIST_DECIDED_PER_LANE);
        return { link, older: asks.length - shown.length, shown: (await decidedQuestions(handle, frame.ref, shown, membership, LIST_DECIDED_PER_LANE, false)).map(question => ({ ...question, ...link })) };
      } catch { return null; }
    }));
    view.decidedUnread = decided.filter(lane => !lane).length;
    view.older = decided.flatMap(lane => lane?.older ? [{ ...lane.link, count: lane.older }] : []);
    view.decided = decided.flatMap(lane => lane?.shown ?? []).sort((a, b) => (timeMs(b.at) ?? 0) - (timeMs(a.at) ?? 0));
    return view;
  } catch (error) {
    return { ...view, items: [], failed: `This list could not be read. ${error instanceof Unreadable ? error.message : "The read did not finish."} The list of issues below still opens.` };
  }
}

/** An issue lane: its intent item, its comments, and the head it was read at. */
export async function loadIssue(room: Room, scope: ScopeId): Promise<IssueView> {
  await fresh(room);
  const handle = handleOf(room, scope);
  const { summary, at } = await summaryOf(handle);
  const definition = await laneDefinition(room, handle, summary);
  if (definition.name !== "issue") throw new Unreadable(`${scope} is a lane under ${definition.name}, not an issue.`);
  const intent = summary.items.find((item) => item.type === "intent") ?? (await itemsOf(room, handle, summary, "intent", at))[0];
  if (!intent) throw new Unreadable(`${scope} holds no issue.`);
  return {
    scope, ref: structuredClone(summary.scope), definition: summary.definition, head: at, intent: intent.id,
    ...await issueTimes(handle, summary, at),
    number: typeof intent.values["number"] === "number" ? intent.values["number"] : null, title: text(intent.values["title"]), body: await textOf(handle, intent.values["body"]),
    state: intent.state, closeReason: text(intent.values["closeReason"]), requesterRef: isMemberRef(intent.parties["requester"]) ? structuredClone(intent.parties["requester"]) : null, requester: memberOf(intent.parties["requester"]), assignees: membersOf(intent.parties["assignees"]),
    conditions: Array.isArray(intent.values["conditions"]) ? (intent.values["conditions"] as string[]) : [], comments: await commentsOf(room, handle, summary, at),
    ...await questionsOf(room, handle, summary),
  };
}

/**
 * One version of a change. A one-file version (`propose-file`) names its
 * `file`: the path, the digest and size of its bytes. Its legacy `page`
 * address points at the latest published branch, not this immutable version;
 * the Version screen does not offer it as a rendered-page link.
 */
export interface Manifest {
  /** Native ISSUE report facts in selection order; null means unavailable or malformed. */
  selectedReports?: FactRef[] | null;
  id: number; state: string; integrator: string | null; authors: string[]; base: string | null; integration: string | null; tree: string | null; complete: boolean | null;
  file: { path: string; digest: string | null; size: number | null; page: string;
    /** Exact retained proposal text, verified for the selected version; null when unavailable. Never read from HEAD. */
    content?: string | null } | null;
}
export interface Review { id: number; state: string; reviewer: string | null; manifest: number | null; verdict: string | null; extent: string | null }
export interface ReviewRequest { id: number; state: string; requested: string | null; requester: string | null; requestedRef: MemberRef | null; requesterRef: MemberRef | null }
export interface Job { id: number; state: string; name: string | null; manifest: number | null }
export interface Link { id: number; state: string; issue: ScopeId | null; how: string | null }
export interface Extent { name: string; approvals: number; approver: string; checks: string[]; class: string; patterns?: string[] }
/** The rules a change lane holds, as the rules scope last sent them. `revision`: the update's revision, which the relation counts. */
export interface LaneRules { approvals: number | null; revision: number | null; ownerMayReview: boolean | null; extents: Extent[]; checks: { name: string; required: boolean }[] }
/** One outside operation of the destination, for one publication: its kind, and the result of each of its attempts in order. */
export interface Operation { id: string; kind: string; attempts: ("opened" | "confirmed" | "refused" | "unknown")[] }
export interface Publication { id: number; state: string; reason: string | null; operations: Operation[] }
export interface Merge { id: number; state: string; manifest: number | null; reason: string | null; commit: string | null; publication: Publication | null }

export interface ChangeView {
  /** Actual authenticated lane identity, including its incarnation. */
  ref?: ScopeRef;
  /** Full native policy bound to this current recorded one-file version; null means unknown applicability. */
  reviewPolicy?: { manifest: number; source: FactRef; extents: PolicyExtent[] } | null;
  /** The actual proposal item used by transitions. */
  proposal?: number;
  /** Actual current item; never a retained-version fallback for a mutation. */
  currentManifest?: number | null;
  /** Choices from held rules and authenticated membership; null means unavailable. */
  reviewExtents?: { label: string; value: string }[] | null;
  reviewMembers?: { label: string; value: string }[] | null;
  /** Per held extent, current presentation candidates; null means its authority is unavailable, not destination readiness. */
  reviewMembersByExtent?: Record<string, { label: string; value: string }[] | null> | null;
  scope: ScopeId; definition: string; head: Head;
  number: number | null; title: string | null; body: string | null; state: string; author: string | null;
  manifests: Manifest[]; reviews: Review[]; requests: ReviewRequest[]; jobs: Job[]; links: Link[]; merges: Merge[]; rules: LaneRules | null; comments: Comment[];
}

/** Known rules versions change policy only in publish, recording published=self.
 * A later non-policy entry is harmless; any later publish makes this held
 * update's full patterns unavailable, even if its five-field projection agrees. */
async function reviewPolicyOf(room: Room, change: ScopeRef, proposal: Item, held: Item | undefined, manifest: number): Promise<NonNullable<ChangeView["reviewPolicy"]> | null> {
  try {
    const source = held?.refs["source"], named = proposal.refs["rulesScope"];
    if (!held || !isFactRef(source) || !fullScopeRef(named) || source.at.scope !== room.rules
      || canonicalize(source.at) !== canonicalize(named) || held.values["revision"] !== source.seq) return null;
    const handle = handleOf(room, source.at.scope);
    const { summary, at } = await summaryOf(handle);
    if (summary.status !== "active" || canonicalize(summary.scope) !== canonicalize(source.at) || at.seq < source.seq
      || !answersVersionQuestion(summary.definition, "pageReviewPolicyRules")) return null;
    const rules = summary.items.find(item => item.type === "rules" && item.state === "current");
    if (!rules) return null;
    const published = rules.refs["published"] ?? 0;
    if (typeof published !== "number" || !Number.isSafeInteger(published) || published < 0 || published > source.seq) return null;
    const read = await handle.entry(source.seq);
    if (!read.ok || !read.complete || read.next !== undefined) return null;
    const entry = read.value.entry;
    if (!isEntryBodyOf(entry, source) || read.value.hash !== source.hash) return null;
    const sends = entry.sends.filter(send => canonicalize(send.to) === canonicalize(change) && send.message.class === "request"
      && send.message.type === "relate" && record(send.message.body) && send.message.body["name"] === "rules");
    if (sends.length !== 1) return null;
    const message = sends[0]!.message;
    if (message.class !== "request" || message.type !== "relate") return null;
    const body = message.body;
    if (!record(body) || body["state"] !== "current" || !isFactRef(body["item"])
      || canonicalize(body["item"].at) !== canonicalize(source.at) || body["item"].seq !== rules.id || body["item"].hash !== rules.opened
      || !record(body["detail"])) return null;
    const detail = body["detail"];
    for (const name of ["approvals", "ownerMayReview", "checks", "extents"]) {
      const value = held.values[name] ?? (name === "checks" ? [] : null);
      if (canonicalize(detail[name] ?? (name === "checks" ? [] : null)) !== canonicalize(value)) return null;
      if (name !== "extents" && canonicalize(rules.values[name] ?? (name === "checks" ? [] : null)) !== canonicalize(value)) return null;
    }
    const approvals = rules.values["approvals"], checks = rules.values["checks"] ?? [];
    if (typeof approvals !== "number" || !Array.isArray(checks)) return null;
    const full = rules.values["extents"] ?? firstExtents({ approvals, checks: checks as unknown as { name: string; required: boolean }[] });
    if (!isExtents(full)) return null;
    const projected = full.map(({ name, approvals, approver, checks, class: of }) => ({ name, approvals, approver, checks, class: of }));
    if (canonicalize(projected) !== canonicalize(held.values["extents"])) return null;
    return { manifest, source, extents: full.map(extent => ({ ...extent, patterns: [...extent.patterns], checks: [...extent.checks] })) };
  } catch { return null; }
}

const localId = (value: FieldValue | null | undefined): number | null => (typeof value === "number" ? value : null);

/** The declared selection is the authority for its ISSUE report role. An
 * absent optional typed slot is the native empty list, not a failed read. */
function reportsOf(manifest: Item, definition: DeclaredDefinition): FactRef[] | null {
  const slot = definition.items["manifest"]?.values["selected"];
  const type = slot?.of;
  if (!type || type.type !== "list" || type.of.type !== "record") return null;
  const report = type.of.of["report"], accepted = type.of.of["accepted"];
  if (report?.type !== "fact" || report.under !== "issue" || (report.kind.length !== 1 || report.kind[0] !== "report") || accepted?.type !== "fact" || accepted.under !== "issue" || (accepted.kind.length !== 1 || accepted.kind[0] !== "accept-report")) return null;
  const selected = manifest.values["selected"];
  if (selected === undefined || selected === null) return slot.required ? null : [];
  if (!Array.isArray(selected) || selected.length > type.max) return null;
  const reports: FactRef[] = [];
  for (const row of selected) {
    if (!row || typeof row !== "object" || Array.isArray(row) || !isFactRef(row["report"]) || !isFactRef(row["accepted"])) return null;
    reports.push(row["report"]);
  }
  return reports;
}


/** Required merge facts without destination/history presentation reads.
 * Reads use the caller's existing authenticated session or signed-read path. */
export async function loadChangeSelection(room: Room, scope: ScopeId): Promise<{ scope: ScopeRef; head: Head; currentManifest: number | null; manifests: { id: number; state: string; selectedReports: FactRef[] | null }[] }> {
  await fresh(room);
  const handle = handleOf(room, scope);
  const { summary, at } = await summaryOf(handle);
  const definition = await laneDefinition(room, handle, summary);
  if (definition.name !== "change") throw new Unreadable(`${scope} is not a change lane.`);
  const manifests = await itemsOf(room, handle, summary, "manifest", at);
  return { scope: summary.scope, head: at, currentManifest: manifests.find((item) => item.state === "current")?.id ?? null,
    manifests: manifests.map((item) => ({ id: item.id, state: item.state, selectedReports: reportsOf(item, definition) })) };
}

/** Item IDs are their opening entry positions (contract 4.1). Read just that
 * authenticated entry and bind its signed bytes to the selected manifest.
 * A missing, redacted or inconsistent source offers no preview. */
async function manifestContent(handle: ScopeHandle, scope: Summary["scope"], manifest: Item): Promise<string | null> {
  try {
    const read = await handle.entry(manifest.id);
    if (!read.ok || !read.complete || read.next !== undefined) return null;
    const { entry, hash } = read.value;
    if (!isEntryBodyOf(entry, { at: scope, seq: manifest.id, hash }) || hash !== manifest.opened) return null;
    if (!entry.effects.some((effect) => effect.effect === "open" && effect.type === "manifest" && effect.item === manifest.id)) return null;
    const input = entry.input;
    if (input.type !== "act" || input.signed.intent.kind !== "propose-file" || !verifySignedIntent(input.signed) || canonicalize(input.signed.intent.to) !== canonicalize(scope)) return null;
    const author = input.authority.length === 1 ? input.authority[0] : null;
    const authors = manifest.parties["authors"];
    if (!author || author.key !== input.signed.intent.actor || canonicalize(author.subject) !== canonicalize(manifest.parties["integrator"]) || !Array.isArray(authors) || !authors.some((member) => canonicalize(member) === canonicalize(author.subject))) return null;
    const { path, digest, size, content } = input.signed.intent.fields;
    if (typeof path !== "string" || typeof digest !== "string" || typeof size !== "number" || typeof content !== "string" || path !== manifest.values["path"] || digest !== manifest.values["digest"] || size !== manifest.values["size"] || !fileSound({ path, digest, size, content })) return null;
    return content;
  } catch { return null; }
}

async function manifestListFile(handle: ScopeHandle, scope: ScopeRef, manifest: Item, definition: DeclaredDefinition, pin: string, sources: readonly Item[]): Promise<NonNullable<Manifest["file"]> | null> {
  try {
    if (!knownLIST1(definition, pin)) return null;
    const files = manifest.values["files"];
    if (!Array.isArray(files) || files.length !== 1) return null;
    const row = files[0];
    if (!row || typeof row !== "object" || Array.isArray(row) || typeof row["path"] !== "string" || typeof row["digest"] !== "string" || typeof row["entry"] !== "number" || !Number.isSafeInteger(row["entry"]) || row["entry"] >= manifest.id) return null;
    const opening = await handle.entry(manifest.id);
    if (!opening.ok || !opening.complete || opening.next !== undefined) return null;
    const frozenInput = opening.value.entry.input;
    const frozenFiles = frozenInput.type === "act" ? frozenInput.signed.intent.fields["files"] : null;
    if (!Array.isArray(frozenFiles) || frozenFiles.length !== 1) return null;
    const frozen = frozenFiles[0];
    if (!frozen || typeof frozen !== "object" || Array.isArray(frozen) || !isFactRef(frozen["entry"]) || frozen["path"] !== row["path"] || frozen["digest"] !== row["digest"]) return null;
    const fact = frozen["entry"];
    if (canonicalize(fact.at) !== canonicalize(scope) || fact.seq !== row["entry"]) return null;
    const source = await handle.entry(fact.seq);
    if (!opening.ok || !opening.complete || opening.next !== undefined || !source.ok || !source.complete || source.next !== undefined) return null;
    const m = opening.value, s = source.value;
    if (!isEntryBodyOf(m.entry, { at: scope, seq: manifest.id, hash: m.hash }) || m.hash !== manifest.opened || !isEntryBodyOf(s.entry, fact) || s.hash !== fact.hash) return null;
    const mi = m.entry.input, si = s.entry.input;
    if (mi.type !== "act" || si.type !== "act" || mi.signed.intent.kind !== "propose-manifest" || si.signed.intent.kind !== "propose-file" || !verifySignedIntent(mi.signed) || !verifySignedIntent(si.signed) || canonicalize(mi.signed.intent.to) !== canonicalize(scope) || canonicalize(si.signed.intent.to) !== canonicalize(scope)) return null;
    if (!m.entry.effects.some((effect) => effect.effect === "open" && effect.type === "manifest" && effect.item === manifest.id) || !s.entry.effects.some((effect) => effect.effect === "open" && effect.type === "source" && effect.item === fact.seq)) return null;
    const storedSource = sources.find((item) => item.id === fact.seq && item.type === "source");
    if (!storedSource || storedSource.opened !== fact.hash) return null;
    if (mi.signed.intent.fields["base"] !== manifest.values["base"]) return null;
    const author = mi.authority.length === 1 ? mi.authority[0] : null, sourceAuthor = si.authority.length === 1 ? si.authority[0] : null;
    if (!author || !sourceAuthor || author.key !== mi.signed.intent.actor || sourceAuthor.key !== si.signed.intent.actor || si.signed.intent.actor !== mi.signed.intent.actor || canonicalize(sourceAuthor.subject) !== canonicalize(author.subject) || canonicalize(author.subject) !== canonicalize(manifest.parties["integrator"]) || !Array.isArray(manifest.parties["authors"]) || !manifest.parties["authors"].some((member) => canonicalize(member) === canonicalize(author.subject))) return null;
    const { base, path, digest, size, content } = si.signed.intent.fields;
    shapeDeclaredAct(definition, "propose-file", { on: null, fields: si.signed.intent.fields });
    shapeDeclaredAct(definition, "propose-manifest", { on: null, fields: mi.signed.intent.fields });
    if (base !== manifest.values["base"] || path !== row["path"] || digest !== row["digest"] || typeof path !== "string" || typeof digest !== "string" || typeof size !== "number" || typeof content !== "string" || !fileSound({ path, digest, size, content })) return null;
    if (base !== storedSource.values["base"] || path !== storedSource.values["path"] || digest !== storedSource.values["digest"] || size !== storedSource.values["size"] || canonicalize(storedSource.parties["integrator"]) !== canonicalize(sourceAuthor.subject)) return null;
    return { path, digest, size, content, page: "" };
  } catch { return null; }
}
/**
 * A change lane, and for each of its merges the destination's publication
 * and that publication's outside operations, read from the destination's
 * history: an operation is opened `for` the publication, and each attempt
 * records its result.
 */
export async function loadChange(room: Room, scope: ScopeId): Promise<ChangeView> {
  await fresh(room);
  const handle = handleOf(room, scope);
  const { summary, at } = await summaryOf(handle);
  const definition = await laneDefinition(room, handle, summary);
  if (definition.name !== "change") throw new Unreadable(`${scope} is a lane under ${definition.name}, not a change.`);
  const all = (type: string) => itemsOf(room, handle, summary, type, at);
  const proposal = summary.items.find((item) => item.type === "proposal") ?? (await all("proposal"))[0];
  if (!proposal) throw new Unreadable(`${scope} holds no proposal.`);
  const rulesItem = summary.items.find((item) => item.type === "rules");
  const publications = await publicationsOf(room, scope);
  const manifests = await all("manifest");
  const current = manifests.find((m) => m.state === "current") ?? null;
  const selected = current ?? manifests.at(-1); // Read-only preview may show retained history.
  const extents = rulesItem?.values["extents"];
  const reviewExtents = Array.isArray(extents) && extents.every((extent) => extent && typeof extent === "object" && !Array.isArray(extent) && typeof extent["name"] === "string")
    ? extents.map((extent) => ({ label: String((extent as Record<string, FieldValue>)["name"]), value: String((extent as Record<string, FieldValue>)["name"]) })) : null;
  let reviewMembers: { label: string; value: string }[] | null = null;
  let reviewMembersByExtent: ChangeView["reviewMembersByExtent"] = null;
  if (current) {
    try {
      const { summary: membership } = await refreshRoster(room);
      const candidates = reviewCandidates(membership.items, room.membership, current.parties["authors"], rulesItem?.values["ownerMayReview"], extents);
      reviewMembers = candidates?.members ?? null;
      reviewMembersByExtent = candidates?.byExtent ?? null;
    } catch { /* Missing authority offers no invented reviewer choices. */ }
  }
  const content = selected && typeof selected.values["path"] === "string" ? await manifestContent(handle, summary.scope, selected) : null;
  const listFile = selected && selected.values["files"] !== undefined ? await manifestListFile(handle, summary.scope, selected, definition, summary.definition, await all("source")) : null;
  const reviewPolicy = current && (typeof content === "string" || listFile !== null)
    ? await reviewPolicyOf(room, summary.scope, proposal, rulesItem, current.id) : null;
  return {
    scope, ref: structuredClone(summary.scope), definition: summary.definition, head: at, proposal: proposal.id, currentManifest: current?.id ?? null, reviewExtents, reviewMembers, reviewMembersByExtent, reviewPolicy,
    number: localId(proposal.values["number"]), title: text(proposal.values["title"]), body: await textOf(handle, proposal.values["body"]), state: proposal.state, author: memberOf(proposal.parties["author"]),
    manifests: manifests.map((m) => ({
      selectedReports: reportsOf(m, definition),
      id: m.id, state: m.state, integrator: memberOf(m.parties["integrator"]), authors: membersOf(m.parties["authors"]),
      base: text(m.values["base"]), integration: text(m.values["integration"]), tree: text(m.values["tree"]), complete: typeof m.values["complete"] === "boolean" ? m.values["complete"] : null,
      file: typeof m.values["path"] === "string" ? {
        path: m.values["path"], digest: text(m.values["digest"]), size: typeof m.values["size"] === "number" ? m.values["size"] : null, page: siteAddress(room, m.values["path"]), ...(m === selected ? { content } : {}),
      } : m === selected && listFile ? { ...listFile, page: siteAddress(room, listFile.path) } : null,
    })),
    reviews: (await all("review")).map((r) => ({ id: r.id, state: r.state, reviewer: memberOf(r.parties["reviewer"]), manifest: localId(r.refs["manifest"]), verdict: text(r.values["verdict"]), extent: text(r.values["extent"]) })),
    requests: (await all("review-request")).map((r) => ({ id: r.id, state: r.state, requested: memberOf(r.parties["requested"]), requester: memberOf(r.parties["requester"]), requestedRef: isMemberRef(r.parties["requested"]) ? structuredClone(r.parties["requested"]) : null, requesterRef: isMemberRef(r.parties["requester"]) ? structuredClone(r.parties["requester"]) : null })),
    jobs: (await all("job")).map((j) => ({ id: j.id, state: j.state, name: text(j.values["name"]), manifest: localId(j.refs["manifest"]) })),
    links: (await all("link")).map((l) => ({ id: l.id, state: l.state, issue: scopeOf(l.refs["issue"]), how: text(l.values["how"]) })),
    merges: (await all("merge")).map((m) => ({
      id: m.id, state: m.state, manifest: localId(m.refs["manifest"]), reason: text(m.values["reason"]), commit: text(m.values["commit"]), publication: publications.get(m.id) ?? null,
    })),
    rules: rulesItem ? {
      approvals: localId(rulesItem.values["approvals"]), revision: localId(rulesItem.values["revision"]), ownerMayReview: typeof rulesItem.values["ownerMayReview"] === "boolean" ? rulesItem.values["ownerMayReview"] : null,
      extents: Array.isArray(rulesItem.values["extents"]) ? (rulesItem.values["extents"] as unknown as Extent[]) : [],
      checks: Array.isArray(rulesItem.values["checks"]) ? (rulesItem.values["checks"] as unknown as { name: string; required: boolean }[]) : [],
    } : null,
    comments: await commentsOf(room, handle, summary, at),
  };
}

/** The destination's publications for one lane, by the lane's merge entry, each with the operations opened for it. */
async function publicationsOf(room: Room, lane: ScopeId): Promise<Map<number, Publication>> {
  const G = handleOf(room, room.destination);
  const { summary, at } = await summaryOf(G);
  const items = (await itemsOf(room, G, summary, "publication", at)).filter((item) => (item.refs["operation"] as FactRef | undefined)?.at.scope === lane);
  if (items.length === 0) return new Map();
  const operations = operationsOf(await historyOf(G, at));
  return new Map(items.map((item) => [
    (item.refs["operation"] as FactRef).seq,
    { id: item.id, state: item.state, reason: text(item.values["reason"]), operations: operations.filter((o) => o.for === item.id).map(({ for: _for, ...o }) => o) },
  ]));
}

async function historyOf(handle: ScopeHandle, at: Head): Promise<Entry[]> {
  return (await pagesOf((cursor) => handle.history(cursor), `Cannot read the history of ${handle.scope}`, 1000, at)).map((sealed) => sealed.entry);
}

/**
 * The outside operations a history records, with the item each is for. An
 * operation is named `seq:k`, by the entry that opened it and its ordinal
 * there; an attempt in that same entry names it `{ k }`. `for: "self"` is
 * the item the same entry opens.
 */
export function operationsOf(entries: readonly Entry[]): (Operation & { for: number | null })[] {
  const matched = new Map<string, Operation & { for: number | null }>();
  for (const entry of entries) {
    const opened = entry.effects.find((effect) => effect.effect === "open");
    for (const effect of entry.effects) {
      if (effect.effect === "operation") {
        const item = effect.for === "self" ? (opened && "item" in opened ? opened.item : null) : (effect.for ?? null);
        matched.set(`${entry.seq}:${effect.k}`, { id: `${entry.seq}:${effect.k}`, kind: effect.kind, attempts: [], for: item });
      } else if (effect.effect === "attempt") {
        const id = typeof effect.operation === "string" ? effect.operation : `${entry.seq}:${effect.operation.k}`;
        const operation = matched.get(id);
        if (!operation) continue;
        if (effect.result === "opened") operation.attempts.push("opened");
        else operation.attempts[effect.attempt - 1] = effect.result;
      }
    }
  }
  return [...matched.values()];
}

// ---------------------------------------------------------------- the published site

/** The address of a path on the room's published site: the site route, on the published branch (`HEAD`). */
export function siteAddress(room: Pick<Room, "session" | "directory" | "publication">, path: string): string {
  if (room.publication === "unpublished") return "";
  return `${room.session.service.replace(/\/+$/, "")}/site/${room.directory}/HEAD/${path.split("/").map(encodeURIComponent).join("/")}`;
}

/** What the site route answered for one path: its status and its text. A refusal's text is its reason and a sentence. */
export interface SitePage { address: string; status: number; text: string }

/** The most bytes of a site page that the page reads: the site route's own bound on one file. */
const SITE_BYTES = 1024 * 1024 + 64 * 1024;

/** One page of the room's published site, as the site route answers it. No session is presented by this client; site eligibility remains the site owner's policy. */
export async function loadSite(room: Pick<Room, "session" | "directory" | "publication">, path: string): Promise<SitePage> {
  if (room.publication === "unpublished") throw new Unreadable("no-repository: this room has no publication.");
  const address = siteAddress(room, path);
  const send = room.session.fetch ?? (globalThis as { fetch?: Fetch }).fetch;
  if (!send) throw new Unreadable("This runtime has no fetch.");
  const response = await send(address, { method: "GET" });
  const bytes = response.body ? await takeBytes(response.body, SITE_BYTES, AbortSignal.timeout(30_000)) : new Uint8Array(0);
  if (bytes === null || bytes === LATE) throw new Unreadable(`The site's answer for ${path} is longer than this page reads, or did not come within 30 seconds.`);
  return { address, status: response.status, text: new TextDecoder().decode(bytes) };
}

// ---------------------------------------------------------------- the rules

/** Conservative presentation evidence; failed reads never imply an uninitialized room. */
export type RoomInitialization =
  | { state: "not-initialized"; scope: ScopeRef; head: Head; definition: Summary["definition"]; rulesItem: number; context: string }
  | { state: "configured" }
  | { state: "unknown"; reason: string };

const initializationContext = (room: Room): string => canonicalize({ service: room.session.service, directory: room.directory, membership: room.membership, key: room.key, rules: room.rules });

/** One final head/context check after the view's other reads; no classification or pagination repeats. */
export async function initializationStillCurrent(room: Room, proof: Extract<RoomInitialization, { state: "not-initialized" }>): Promise<boolean> {
  if (initializationContext(room) !== proof.context) return false;
  try {
    await fresh(room);
    const { summary, at } = await summaryOf(handleOf(room, room.rules));
    return initializationContext(room) === proof.context && summary.status === "active"
      && canonicalize(summary.scope) === canonicalize(proof.scope) && summary.definition === proof.definition && canonicalize(at) === canonicalize(proof.head);
  } catch { return false; }
}

export async function roomInitialization(room: Room): Promise<RoomInitialization> {
  const unavailable: RoomInitialization = { state: "unknown", reason: "The complete rules could not be read. Check status before editing." };
  const context = () => initializationContext(room);
  const captured = context();
  try {
    await fresh(room);
    const directory = await summaryOf(handleOf(room, room.directory));
    const repository = directory.summary.items.find(item => item.type === "repository");
    const named = repository?.refs["rules"];
    if (directory.summary.status !== "active" || directory.summary.scope.scope !== room.directory
      || !fullScopeRef(named) || named.scope !== room.rules
      || canonicalize(repository?.refs["membership"]) !== canonicalize(room.membership)) return unavailable;
    const handle = handleOf(room, room.rules), { summary, at } = await summaryOf(handle);
    if (summary.status !== "active" || canonicalize(summary.scope) !== canonicalize(named)
      || !answersVersionQuestion(summary.definition, "pageInitializationRules")) return unavailable;
    const rules = summary.items.filter(item => item.type === "rules");
    if (rules.length !== 1) return unavailable;
    const current = rules[0]!;
    if (current.id !== 0 || current.state !== "current" || !Number.isSafeInteger(current.revision) || current.revision < 1) return unavailable;
    // Complete summary evidence already proves configured. A historical read
    // cannot discard that positive result or delay ordinary navigation.
    const published = current.refs["published"];
    if (published !== undefined && published !== null || current.revision > 1 || summary.items.some(item => item.type === "definition")) return { state: "configured" };
    // Proving absence still needs complete coherent current/retained pages:
    // a retired definition also proves that this room has been configured.
    const definitions = await itemsOf(room, handle, summary, "definition", at);
    if (definitions.length > 0) return { state: "configured" };
    // Rules10 inherits the Rules3 policy item; only explicit Rules4 defaults owner review to true.
    if (canonicalize(current.refs["directory"]) !== canonicalize(directory.summary.scope)
      || current.values["membership"] !== room.membership.scope || typeof current.values["branch"] !== "string"
      || current.values["approvals"] !== 1 || current.values["ownerMayReview"] !== answersVersionQuestion(summary.definition, "pageInitialOwnerMayReviewRules") || current.values["singleControllerException"] !== false
      || ["checks", "labels", "extents"].some(name => current.values[name] !== undefined && current.values[name] !== null)) return unavailable;
    const after = await summaryOf(handle);
    const latestDirectory = await summaryOf(handleOf(room, room.directory));
    const latestRepository = latestDirectory.summary.items.find(item => item.type === "repository");
    if (context() !== captured || canonicalize(after.at) !== canonicalize(at) || canonicalize(after.summary.scope) !== canonicalize(summary.scope)
      || latestDirectory.summary.status !== "active" || canonicalize(latestDirectory.summary.scope) !== canonicalize(directory.summary.scope)
      || canonicalize(latestRepository?.refs["rules"]) !== canonicalize(named)
      || canonicalize(latestRepository?.refs["membership"]) !== canonicalize(room.membership)) return unavailable;
    return { state: "not-initialized", scope: summary.scope, head: at, definition: summary.definition, rulesItem: current.id, context: captured };
  } catch {
    return unavailable;
  }
}

export interface RulesView {
  /** Q11 and Q12: summary-bound read-only presentation, not native observation authentication. */
  configured?: boolean;
  readOnlyReason?: string;
  /** The actual rules item, used by publish transitions. */
  item?: number;
  scope: ScopeId; head: Head;
  /** The position of the last `publish` in the rules scope's history: the revision of the rules. Null before the first. */
  revision: number | null;
  approvals: number | null; ownerMayReview: boolean | null; singleControllerException: boolean | null;
  checks: { name: string; required: boolean; checker?: unknown; configuration?: string }[]; labels: string[]; extents: Extent[] | null;
  definitions: { name: string; digest: string; state: string }[];
  /** The members whose role holds `rules.publish`, the action a change of the rules needs. */
  controllers: string[];
}

const isCertifiedRules = (definition: unknown): boolean => answersVersionQuestion(definition, "pageCertifiedRulesReadOnly");

/** The rules of the room, as the rules scope holds them, and the members who may change them. */
export async function loadRules(room: Room): Promise<RulesView> {
  await fresh(room);
  const handle = handleOf(room, room.rules);
  const { summary, at } = await summaryOf(handle);
  const rules = summary.items.find((item) => item.type === "rules");
  if (!rules) throw new Unreadable(`${room.rules} holds no rules.`);
  if (isCertifiedRules(summary.definition)) {
    if (summary.status !== "active" || summary.scope.scope !== room.rules
      || summary.items.filter(item => item.type === "rules").length !== 1) throw new Unreadable("The complete certified rules could not be read.");
    const read = rulesSummaryV11(rules, room.destination);
    if (!read) throw new Unreadable("The certified rules summary is inconsistent or unavailable.");
    const published = rules.refs["published"], policy = read.policy;
    if (read.configured && (typeof published !== "number" || !Number.isSafeInteger(published) || published < 0 || published > at.seq))
      throw new Unreadable("The certified rules publication is unavailable.");
    return { scope: room.rules, item: rules.id, head: at, configured: read.configured,
      readOnlyReason: read.configured ? Q11_READ_ONLY : "Certified rules have not been configured. " + Q11_READ_ONLY,
      revision: read.configured && typeof published === "number" ? published : null,
      approvals: policy?.approvals ?? null, ownerMayReview: policy?.ownerMayReview ?? null,
      singleControllerException: policy ? policy.singleControllerException === true : null,
      checks: policy ? policy.checks.map(check => ({ ...check, checker: { ...check.checker, membership: { ...check.checker.membership } } })) : [],
      labels: policy ? [...policy.labels] : [],
      extents: policy ? policy.extents.map(extent => ({ ...extent, patterns: [...extent.patterns], checks: [...extent.checks] })) : null,
      definitions: (await itemsOf(room, handle, summary, "definition", at)).map(d => ({ name: String(d.values["name"]), digest: String(d.values["digest"]), state: d.state })),
      controllers: holdersOf((await summaryOf(handleOf(room, room.membership.scope))).summary.items, "rules.publish"),
    };
  }
  // The slot holds the position of the last `publish` in this scope's history: the revision of the rules (`revisionOf`).
  const published = rules.refs["published"];
  return {
    scope: room.rules, item: rules.id, head: at, revision: typeof published === "number" ? published : null,
    approvals: localId(rules.values["approvals"]), ownerMayReview: typeof rules.values["ownerMayReview"] === "boolean" ? rules.values["ownerMayReview"] : null,
    singleControllerException: typeof rules.values["singleControllerException"] === "boolean" ? rules.values["singleControllerException"] : null,
    checks: Array.isArray(rules.values["checks"]) ? (rules.values["checks"] as unknown as RulesView["checks"]) : [],
    labels: Array.isArray(rules.values["labels"]) ? (rules.values["labels"] as string[]) : [],
    extents: Array.isArray(rules.values["extents"]) ? (rules.values["extents"] as unknown as Extent[]) : null,
    definitions: (await itemsOf(room, handle, summary, "definition", at)).map((d) => ({ name: String(d.values["name"]), digest: String(d.values["digest"]), state: d.state })),
    controllers: holdersOf((await summaryOf(handleOf(room, room.membership.scope))).summary.items, "rules.publish"),
  };
}

/** The handles of the active members whose role's list in the roster holds `action`. */
export function holdersOf(items: readonly Item[], action: string): string[] {
  const roster = items.find((item) => item.type === "roster");
  if (!roster) return [];
  const roles = (Object.keys(ROLE_LISTS) as Role[]).filter((role) => ((roster.values[ROLE_LISTS[role]] as readonly string[] | null) ?? []).includes(action));
  return items.filter((item) => item.type === "member" && item.state === "active" && roles.includes(item.values["role"] as Role)).map((item) => String(item.values["handle"]));
}

// ---------------------------------------------------------------- acts

/** One act the caller may sign now, as the page offers it: its fields, by declared type, and one line made from its declaration. */
/**
 * One act the caller may sign now, as the page offers it: its fields, by declared type, and one line made from its declaration. A
 * field whose value is a definition's bytes, by their digest, lists as `choices` the definitions the rules scope holds active.
 */
export interface Offered {
  kind: string; step: ActShape["step"]; on: string | null; line: string;
  fields: { name: string; type: string; required: boolean; choices?: { label: string; value: string }[] }[];
}

/** The byte domain of a field's stated value place, or null when it states none: its bytes travel beside the act, named by their digest. */
const domainOf = (field: unknown): string | null => {
  const value = (field as { value?: { domain?: unknown } } | null)?.value;
  return typeof value?.domain === "string" ? value.domain : null;
};

/** The definitions the rules scope holds active, latest first: a choice for a field that takes a definition's bytes. */
async function activeDefinitions(room: Room): Promise<{ label: string; value: string; name: string }[]> {
  const { summary } = await summaryOf(handleOf(room, room.rules));
  return summary.items.filter((item) => item.type === "definition" && item.state === "active").sort((a, b) => b.id - a.id)
    .map((item) => ({ label: `${String(item.values["name"])} (${String(item.values["digest"]).slice(0, 19)})`, value: String(item.values["digest"]), name: String(item.values["name"]) }));
}

/**
 * The bytes of each value that the act's fields name at a stated place. A
 * definition's bytes are read from the rules scope, which retains them when
 * it activates the definition, and must hash to the digest; the scope
 * checks that again. The page has no other source of bytes.
 */
async function valuesOf(room: Room, act: ActShape, fields: Record<string, FieldValue>): Promise<string[]> {
  const values: string[] = [];
  for (const [name, field] of Object.entries(act.fields)) {
    const domain = domainOf(field);
    const digest = fields[name];
    if (domain === null || typeof digest !== "string") continue;
    if (domain !== DEFINITION_DOMAIN) throw new Unreadable(`The field ${name} takes a value in ${domain}, which this page cannot supply.`);
    // A value in the domain of a definition is kept as a definition, and read by that kind (as `artroom edit` reads it).
    const reader = room.reader?.reader() ?? null;
    const kept = await transportOf(room.session, reader).retained(room.rules, reader, "definition", digest as Digest);
    if (!kept.ok) throw new Unreadable(`Cannot read the definition ${digest} from the rules scope: ${kept.reason}. Nothing was signed.`);
    values.push(kept.value.bytes);
  }
  return values;
}

/** A scope's definition, as the page reads it: a platform one from the platform package, a lane's as the scope retains it. */
async function shapeOf(room: Room, handle: ScopeHandle, summary: Summary): Promise<{ shape: DefinitionShape; declared: DeclaredDefinition | null }> {
  const supplied = platform(summary.definition);
  if (supplied) return { shape: supplied.data as unknown as DefinitionShape, declared: null };
  const declared = await laneDefinition(room, handle, summary);
  return { shape: declared as unknown as DefinitionShape, declared };
}

/**
 * The acts of the scope's definition that the caller may sign now, from the
 * definition and the caller's role, as `artroom acts` lists them. The scope
 * can still refuse one on its guards or its state. `hidden`: how many need
 * an action the caller's role does not hold.
 */
export async function actsOn(room: Room, scope: ScopeId): Promise<{ acts: Offered[]; hidden: number }> {
  await fresh(room);
  const me = await refreshStanding(room);
  const handle = handleOf(room, scope);
  const summary = (await summaryOf(handle)).summary;
  if (isCertifiedRules(summary.definition)) return { acts: [], hidden: 0 };
  let { shape } = await shapeOf(room, handle, summary);
  if (scope === room.directory && answersVersionQuestion(summary.definition, "pagePartitionRootDirectory")) {
    const selected = await activeDirectory({ summary: scope => handleOf(room, scope).summary(), query: (scope, query) => handleOf(room, scope).queryItems(query) }, summary.scope, room.membership);
    if (selected.ref) {
      const part = platform(pagePartitionOpeningDeclaration())!.data;
      shape = { ...shape, acts: { ...shape.acts, ...Object.fromEntries(Object.entries(part.acts).filter(([kind]) => OPENING_ACTS.has(kind))) } } as DefinitionShape;
    } else if (!["no-active-partition", "partition-pending", "partition-sealed"].includes(selected.reason ?? "")) throw new Unreadable(`Cannot read the opening partition: ${selected.reason}.`);
  }
  const { acts, hidden } = heldActs(shape, me);
  const definitions = acts.some(([, a]) => Object.values(a.fields).some((f) => domainOf(f) === DEFINITION_DOMAIN)) ? await activeDefinitions(room) : [];
  return {
    acts: acts.map(([kind, a]) => ({
      kind, step: a.step, on: a.on, line: describe(kind, a),
      fields: Object.entries(a.fields).map(([name, f]) => ({ name, type: f.type ?? f.code ?? "code", required: f.required === true, ...(domainOf(f) === DEFINITION_DOMAIN ? { choices: definitions.filter((definition) => kind !== "open-issue" && kind !== "open-pr" || definition.name === (kind === "open-issue" ? "issue" : "change")) } : f.type === "enum" && Array.isArray((f as { of?: unknown }).of) ? { choices: ((f as { of: string[] }).of).map((value) => ({ label: value.replace(/-/g, " "), value })) } : {}) })),
    })),
    hidden,
  };
}

/** Reads a field's value from the text a person typed, by the field's declared type, as `artroom act --set` does. */
export function fieldValue(room: Room, type: string, typed: string): FieldValue {
  return valueOf({ repository: { membership: room.membership } as never }, { type }, typed);
}

/** The scope's answer and independent before/after observations. A category alone proves no absence of timed entries. */
export interface Acted {
  service: string; directory: ScopeId; membership: ScopeRef; key: KeyId; scope: ScopeId; kind: string; on: number | null;
  /** UI association only; scope and the receipt still name the actual target. */
  requestedScope?: ScopeId;
  /** The digest of the signed intent, which names the request that this answer answers. */
  digest: Digest;
  answer: Answer; before: Head; after: Head | null; observation: string | null;
}
export type IssueCreation = { state: "confirmed"; child: ScopeRef } | { state: "pending" } | { state: "unavailable" };
/** Read only the original accepted creation; missing proof is never a pending outcome. */
export async function issueCreation(room: Room, result: Acted, current: () => boolean = () => true): Promise<IssueCreation> {
  const unavailable: IssueCreation = { state: "unavailable" };
  if (!current() || result.kind !== "open-issue" || (result.requestedScope ?? result.scope) !== room.directory || result.answer.answer !== "accepted" || result.observation !== null
    || actAssociation(room, room.directory) !== JSON.stringify([result.service.replace(/\/+$/, ""), result.directory, result.membership, result.key, result.requestedScope ?? result.scope])) return unavailable;
  try {
    await fresh(room);
    if (!current()) return unavailable;
    const receipt = result.answer.receipt, handle = handleOf(room, result.scope);
    if (receipt.fact.at.scope !== result.scope) return unavailable;
    const source = await handle.entry(receipt.fact.seq);
    if (!current()) return unavailable;
    if (!source.ok || !source.complete || source.next !== undefined) return unavailable;
    const entry = source.value.entry;
    if (!isEntryBodyOf(entry, receipt.fact) || source.value.hash !== receipt.fact.hash
      || entry.input.type !== "act" || entry.input.signed.intent.kind !== "open-issue" || !verifySignedIntent(entry.input.signed)
      || canonicalize(entry.input.signed.intent.to) !== canonicalize(receipt.fact.at) || entry.input.signed.intent.actor !== room.key || intentDigest(entry.input.signed.intent) !== receipt.intent) return unavailable;
    const creates = entry.sends.filter(send => send.message.class === "request" && send.message.type === "create" && isSeed(send.to));
    if (creates.length !== 1) return unavailable;
    const seed = creates[0]!.to;
    if (!isSeed(seed) || seed.kind !== "lane" || canonicalize(seed.creator) !== canonicalize(receipt.fact.at) || seed.cause !== receipt.intent) return unavailable;
    const { summary, at } = await summaryOf(handle);
    if (!current()) return unavailable;
    if (canonicalize(summary.scope) !== canonicalize(receipt.fact.at) || summary.definition !== receipt.definition) return unavailable;
    if (result.scope !== room.directory) {
      const control = summary.items.find(item => item.id === 0 && item.type === "repository" && item.state === "open");
      if (!room.directoryIndex || !answersVersionRelation("pageOpeningPartitionPair", room.directoryIndex.definition, summary.definition)
        || !control || canonicalize(control.refs["root"]) !== canonicalize(room.directoryIndex.scope) || canonicalize(control.refs["membership"]) !== canonicalize(room.membership)) return unavailable;
    }
    const row = summary.items.find(item => item.id === receipt.fact.seq && item.type === "lane" && item.values["kind"] === "issue");
    const child = row?.refs["scope"];
    if (!row || row.state !== "listed") return unavailable;
    const pending = async (provisional: boolean): Promise<IssueCreation> => {
      const outboxId: OutboxId = `${receipt.fact.seq}.${creates[0]!.n}`;
      if (!receipt.sends.includes(outboxId)) return unavailable;
      if (!current()) return unavailable;
      const read = await handle.followOutbox(outboxId);
      if (!current()) return unavailable;
      if (!read.ok || !read.complete || read.next !== undefined || read.at.seq < receipt.fact.seq) return unavailable;
      const outboxItem = read.value;
      if (outboxItem.outboxId !== outboxId || outboxItem.class !== "request" || outboxItem.held || canonicalize(outboxItem.to) !== canonicalize(seed) || outboxItem.diagnosis !== null) return unavailable;
      const final = await summaryOf(handle);
      if (!current()) return unavailable;
      if (canonicalize(final.summary.scope) !== canonicalize(receipt.fact.at)) return unavailable;
      // A normal listed row has no child reference until create.applied.
      // An applied result can precede the earlier projection or child confirmation.
      if ((!provisional && outboxItem.result === null) || (outboxItem.result?.clause === "applied" && (provisional || outboxItem.result.seq > at.seq))) return { state: "pending" };
      return unavailable;
    };
    if (child === undefined || child === null) return await pending(false);
    if (!fullScopeRef(child) || child.scope !== scopeIdOf(seed)) return unavailable;
    if (!current()) return unavailable;
    const read = await summaryOf(handleOf(room, child.scope));
    if (!current()) return unavailable;
    if (canonicalize(read.summary.scope) !== canonicalize(child) || !read.summary.items.some(item => item.type === "intent")) return unavailable;
    if (read.summary.status === "provisional") return await pending(true);
    if (read.summary.status !== "active") return unavailable;
    return { state: "confirmed", child: structuredClone(child) };
  } catch { return unavailable; }
}

/** Immediate selection only; callers needing later native confirmation use issueCreation. */
export async function createdIssue(room: Room, result: Acted): Promise<ScopeRef | null> {
  const read = await issueCreation(room, result);
  return read.state === "confirmed" ? read.child : null;
}

/** Memory-only association; contains no signing key or current permission. */
export function actAssociation(room: Pick<Room, "session" | "directory" | "membership">, scope: ScopeId): string {
  return JSON.stringify([room.session.service.replace(/\/+$/, ""), room.directory, room.membership, sessionKey(room.session), scope]);
}

const OPENING_ACTS = new Set(["open-issue", "open-pr", "open-task", "establish-application"]);
/** Resolve only before preparing a new act. An accepted or unknown request
 * keeps its actual partition; follow-up never reselects a successor. */
export async function openingScope(room: Room): Promise<ScopeId> {
  const root = (await summaryOf(handleOf(room, room.directory))).summary;
  if (!answersVersionQuestion(root.definition, "pagePartitionRootDirectory")) return room.directory;
  const selected = await activeDirectory({ summary: scope => handleOf(room, scope).summary(), query: (scope, query) => handleOf(room, scope).queryItems(query) }, root.scope, room.membership);
  if (!selected.ref) throw new Unreadable(`Cannot open work: ${selected.reason}. This press sent nothing.`);
  return selected.ref.scope;
}

/**
 * The member's open copies at this room's membership object, or null on a
 * page with no session: such a page keeps no copy
 * (notes/2026-10-31-signed-requests-across-devices.md, section 9).
 */
export const copiesOf = (room: Pick<Room, "session" | "membership" | "reader">) =>
  room.reader ? originalsAt(room.session.service, room.membership.scope, room.reader.reader(), room.session.fetch ? { fetch: room.session.fetch } : {}) : null;

/** The room kept no copy, so the page sent nothing. */
export class CopyNotKept extends Error {
  override readonly name = "CopyNotKept";
}

/** What the page adds to "This press sent nothing" when it could not end the row of a request that it did not send. */
const ROW_STAYS = " This page could not end its copy, so the request can show as open. Press Check original request before you send it again.";
/** What a press says when it could not read the list. It cannot see an earlier request here, and each press reads again. */
const openRequestsUnread = (reason: string | null): string => `This page could not read your open requests${reason ? ` (${reason})` : ""}, so it cannot tell whether an earlier request here has an answer. This press sent nothing. Press again when your connection returns. The next press reads them first.`;
const OPEN_REQUEST_STOPS = {
  locked: "An earlier request from this device here has no answer yet. This press sent nothing. Press Check original request for it before you send this again.",
  unshown: "An earlier request from this device here has no answer, and this page had not shown it until now. This press sent nothing. Press Check original request for it before you send this again.",
} as const;

/** Why the room refused to keep a copy, in the person's words. */
function notKept(reason: string): string {
  if (reason === "full") return "You have too many open requests. This press sent nothing. Check the open requests in this room first.";
  if (reason === "room-full") return "This room has no space for more open requests. This press sent nothing. Space returns as open requests end, within seven days at most. An admin can still remove a member who has left, and that frees the member's requests.";
  return `The room did not keep a copy of this request (${reason}). This press sent nothing.`;
}

/**
 * Keep the exact body of a request before it is sent. The page first reads the
 * member's open requests, because a press can come after a failed read that left
 * no lock: a failed read stops the send, and so does an open row of this key at
 * this scope (`pressStop`). A refusal of the keep, or a lost reply, stops the
 * send. A page that held a session and failed to renew it stops too, because the
 * person relies on the copy. A page that opened on signed reads keeps no copy,
 * and it sends as it always did.
 */
export async function keepOriginal(room: Pick<Room, "session" | "directory" | "directoryIndex" | "membership" | "reader" | "unsessioned" | "key">, signed: SignedIntent, beside: Beside): Promise<void> {
  if (sessionLost(room)) throw new CopyNotKept(`This page could not renew its session with the room${room.unsessioned && room.unsessioned !== "no-reply" ? ` (${room.unsessioned})` : ""}, so it cannot keep a copy of this request. This press sent nothing. When your connection returns, open this view again and check your open requests before you send it again.`);
  const copies = copiesOf(room);
  if (!copies) return;
  let listed: Awaited<ReturnType<NonNullable<typeof copies>["list"]>>;
  try { listed = await copies.list(); }
  catch { throw new CopyNotKept(openRequestsUnread(null)); }
  if (!listed.ok) throw new CopyNotKept(openRequestsUnread(listed.reason));
  const stop = signed.intent.to && pressStop(room, listed.rows, rowsLastRead(actAssociation(room, room.membership.scope)) ?? [], signed.intent.to, nowOf(room.session));
  if (stop) throw new CopyNotKept(OPEN_REQUEST_STOPS[stop]);
  let kept: Awaited<ReturnType<NonNullable<typeof copies>["keep"]>>;
  try { kept = await copies.keep(actBodyText(signed, beside)); }
  catch {
    const ended = await endOriginal(room, intentDigest(signed.intent)); // A row the page never sent would show as a request with no answer.
    throw new CopyNotKept(`The room gave no reply when it was asked to keep a copy of this request. This press sent nothing.${ended ? "" : ROW_STAYS}`);
  }
  if (!kept.ok) throw new CopyNotKept(notKept(kept.reason));
}

/**
 * Keep a request's copy on the way to its send. `before` can stop the send
 * with no row. Anything that stops it after the keep ends the row, because a
 * row reads "You sent" and a press past the margin sends its bytes.
 */
export async function keepToSend(room: Pick<Room, "session" | "directory" | "directoryIndex" | "membership" | "reader" | "unsessioned" | "key">, signed: SignedIntent, beside: Beside, before?: () => void, after?: (digest: Digest) => void): Promise<void> {
  const digest = intentDigest(signed.intent);
  before?.();
  await keepOriginal(room, signed, beside);
  try { after?.(digest); }
  catch (error) {
    if (!await endOriginal(room, digest) && error instanceof Error) error.message += ROW_STAYS;
    throw error;
  }
}

/** End a copy. A failed `DELETE` leaves the row and the button, and answers false. A row that is already gone is ended. */
export async function endOriginal(room: Pick<Room, "session" | "membership" | "reader">, digest: Digest): Promise<boolean> {
  try {
    const ended = await copiesOf(room)?.end(digest);
    return !ended || ended.ok || ended.reason === "not-found";
  } catch { return false; } // The row stays open, and any key of the member can check it.
}

/** Whether a scope's reply is an answer that ends a copy: `unavailable` is none. */
export async function endAnswered(room: Pick<Room, "session" | "membership" | "reader" | "unsessioned">, handle: ScopeHandle, signed: SignedIntent, answer: Answer): Promise<boolean> {
  if (!room.reader || answer.answer === "unavailable") return false;
  if (answer.answer === "accepted") {
    try {
      const followed = await handle.followReceipt(answer.receipt);
      if (!followed.ok || followed.entry.input.type !== "act" || canonicalize(followed.entry.input.signed) !== canonicalize(signed)) return false;
    } catch { return false; }
  }
  await endOriginal(room, intentDigest(signed.intent));
  return true;
}

/** How long a `device-key` invitation stays open. */
const DEVICE_INVITATION_MS = 24 * 3600 * 1000;

/**
 * Signs `invite-key` with kind `device` for an existing member and returns the
 * private link. The page holds the link in memory, and only a role that holds
 * `membership.invite` can sign the act.
 */
export async function issueDeviceKey(room: Room, handle: string): Promise<{ link: string } | { refused: string }> {
  const membership = handleOf(room, room.membership.scope);
  const before = (await summaryOf(membership)).summary;
  const member = before.items.find(item => item.type === "member" && item.state === "active" && item.values["handle"] === handle);
  if (!member) return { refused: `${handle} is no active member of this room.` };
  const definition = before.definition;
  if (typeof definition !== "string" || !isInvitationMembership(definition)) return { refused: "This room's membership version has no invitation of a device." };
  const secret = b64url(crypto.getRandomValues(new Uint8Array(32)));
  const fields = { member: member.id, kind: "device", ...invitationIssueFields(definition, secret), inviteEnds: timeOf(nowOf(room.session) + DEVICE_INVITATION_MS) };
  const result = await act(room, room.membership.scope, "invite-key", { fields });
  if (result.answer.answer !== "accepted") return { refused: result.answer.answer === "refused" ? `The room refused the invitation: ${result.answer.reason}.` : "The room gave no answer. Check the request before you make another invitation." };
  const after = (await summaryOf(membership, result.answer.receipt)).summary;
  const [roster, current] = [after.items.find(item => item.type === "roster" && item.state === "open"), after.items.find(item => item.type === "member" && item.id === member.id)];
  if (!roster || !current) return { refused: "The room's roster could not be read after the invitation." };
  return { link: encodeDeviceKeyInvitation({
    v: 1, kind: "device-key", service: new URL(room.session.service).origin, repository: { directory: room.directoryIndex?.scope ?? (() => { throw new Unreadable("The directory could not be read."); })(), membership: room.membership, rules: room.rules, destination: room.destination },
    definition, handle, invitation: result.answer.receipt.fact, secret, expected: { on: roster.revision, member: current.revision },
  }) };
}

/**
 * Signs and sends one act. The expected revision of each item the act
 * names is read from the summary, and the scope checks each again. A lane's
 * act goes through the client's declared handle, which checks each field's
 * shape before it signs and carries detached texts beside the intent.
 */
export async function act(room: Room, scope: ScopeId, kind: string, asked: { on?: number | null; fields?: Record<string, FieldValue> } = {}, received?: (result: Acted) => void, submitting?: (digest: Digest) => void, stopping?: () => void): Promise<Acted> {
  await renewLost(room);
  await fresh(room);
  const requestedScope = scope;
  if (scope === room.directory && OPENING_ACTS.has(kind)) scope = await openingScope(room);
  const handle = handleOf(room, scope);
  const { summary, at: before } = await summaryOf(handle);
  if (room.commons?.scope === scope && canonicalize(summary.scope) !== canonicalize(room.commons)) throw new Unreadable("The Commons incarnation changed. Reopen this room; nothing was signed.");
  if (isCertifiedRules(summary.definition)) throw new Unreadable(Q11_READ_ONLY);
  const { shape, declared } = await shapeOf(room, handle, summary);
  const declaration = shape.acts[kind];
  if (!declaration || kind === shape.genesis) throw new Unreadable(`${kind} is not an act of ${shape.name}.`);
  const fields = asked.fields ?? {};
  const on = asked.on ?? null;
  const expected = expectedOf(declaration, summary.items, on, fields);
  const values = await valuesOf(room, declaration, fields);
  const signer = sessionSigner(room.session);
  const signing: Signing = room.session.now ? { now: room.session.now() } : {};
  let answer: Answer;
  let sent: SignedIntent;
  if (declared) {
    const typed = await declaredHandle(handle, declared);
    if (!typed.ok) throw new Unreadable(`Cannot act on ${scope}: ${typed.reason}.`);
    const { signed, beside } = await typed.handle.intent(signer, kind as never, { on, fields, expected } as never, signing);
    const sending = values.length > 0 ? { ...beside, values } : beside;
    await keepToSend(room, signed, sending, stopping, submitting);
    sent = signed;
    answer = await typed.handle.submit(signed, [], sending);
  } else {
    // The shaping helper reads only the actual act declaration. Platform
    // fields use the same typed inputs and detached-text transport as lanes.
    const ordinary = Object.fromEntries(Object.entries(declaration.fields).filter(([, field]) => field.type !== undefined && field.type !== "code"));
    if (Object.keys(fields).some((name) => !Object.hasOwn(declaration.fields, name)) || Object.entries(declaration.fields).some(([name, field]) => field.required && !Object.hasOwn(fields, name))) throw new Unreadable("The fields do not match this native action's declaration.");
    const typedFields = Object.fromEntries(Object.entries(fields).filter(([name]) => Object.hasOwn(ordinary, name)));
    const shaped = shapeDeclaredAct({ ...shape, acts: { ...shape.acts, [kind]: { ...declaration, fields: ordinary } } } as unknown as DeclaredDefinition, kind as never, { on, fields: typedFields } as never);
    const marked = Object.fromEntries(Object.entries(fields).filter(([name]) => !Object.hasOwn(ordinary, name)));
    const signedFields = { ...shaped.fields, ...marked };
    const signed = await signedIntent(signer, { to: summary.scope, kind, on: shaped.on, fields: signedFields, expected: expectedOf(declaration, summary.items, shaped.on, signedFields) }, signing);
    const sending = values.length > 0 ? { ...shaped.beside, values } : shaped.beside;
    await keepToSend(room, signed, sending, stopping, submitting);
    sent = signed;
    answer = await handle.submit(signed, [], sending);
  }
  const result: Acted = { service: room.session.service, directory: room.directory, membership: { ...room.membership }, key: signer.key, scope, ...(scope !== requestedScope ? { requestedScope } : {}), kind, on, digest: intentDigest(sent.intent), answer, before, after: null, observation: "Observation refresh pending." };
  received?.(result); // Preserve the real answer before any awaited refresh.
  await endAnswered(room, handle, sent, answer);
  try { result.after = (await summaryOf(handle, answer.answer === "accepted" ? answer.receipt : undefined)).at; result.observation = null; }
  catch (error) { result.observation = error instanceof Unreadable ? error.message : "The observation refresh failed."; }
  return result;
}

/** Notes live in their entries, not in folded comment items. */
export async function loadCommonsView(room: Room, options: { cursor?: string } = {}): Promise<CommonsView> {
  if (!room.commons) throw new Unreadable("No Commons reference is available in this room.");
  await fresh(room);
  const view = await loadCommons(handleOf(room, room.commons.scope), room.commons, options);
  try {
    const { summary } = await summaryOf(handleOf(room, room.membership.scope));
    if (canonicalize(summary.scope) === canonicalize(room.membership)) view.authorLabels = commonsAuthorLabels(view, summary);
  } catch { /* Exact immutable author references remain visible without labels. */ }
  return view;
}
