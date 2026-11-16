import { answersVersionQuestion, SIBLINGS_OF, platform } from "@generalbusiness/dap-platform";
/**
 * The inventory: which scopes the server lists acts for, and the caller's
 * standing on each membership they use (plan 031, section 6). It is durable
 * and configured, never a memory of a connection:
 *
 * - the repository of the configuration, when there is one: its register,
 *   directory, membership, rules scope, destination and the caller's inbox,
 *   every lane the directory lists, and every application the directory's
 *   application factory created (an `application` item in state `created`
 *   whose `scope` is set), each under the directory's membership;
 * - the configuration's standalone roots: `{ scope, membership }` entries,
 *   each a scope outside the repository and the membership scope that
 *   standing for it is read from. A root that is also one of the
 *   directory's applications is held once, as the application.
 *
 * The caller's standing on a membership is the value that membership stated
 * when it issued the caller's read session (`standingFrom`). A membership that
 * gave no session, or a session with no value, leaves the standing unknown.
 * Which actions the caller holds is the shared value check's answer
 * (`judgeExploreGrant`, once for each action of the value), not a rule of
 * this file.
 *
 * Reads: the membership, directory and rules summaries, one summary per
 * root and per further membership. A scope's pinned definition never
 * changes, and a definition's bytes never change for a digest, so each is
 * read once per process and kept by scope and by digest.
 */

import type { DeclaredDefinition, Digest, Head, Item, PlatformDefinition, Read, ScopeId, ScopeRef, Summary } from "@generalbusiness/dap-contract";
import { definitionDigest, isDigest, isPlatformDefinition, parseStrict, timeOf } from "@generalbusiness/dap-bytes";
import { judgeExploreGrant } from "@generalbusiness/dap-derive";

import { ScopeHandle, partitionIndexes, type Session } from "@generalbusiness/dap-client";
import type { Held, Inventory, Place, Standing } from "./catalogue.ts";
import type { DefinitionLike } from "@generalbusiness/dap-client";
import type { Reads } from "@generalbusiness/dap-client";

/** What the server reads of the configuration. The command line's `config.json` holds these members, and more. */
export interface McpConfig {
  /** The scope service; empty for a configuration that has joined nothing yet. */
  service: string;
  handle?: string;
  register?: ScopeRef;
  repository?: { directory: ScopeRef; membership: ScopeRef; rules: ScopeId; destination: ScopeId; inbox?: ScopeId };
  roots?: readonly Root[];
  /**
   * The pinned definitions of scopes the caller cannot read yet, by scope ID, as an invitation link records membership's
   * version: a key that is no member's reads nothing before it joins, and its list still offers `room.join`.
   */
  pins?: Readonly<Record<string, Digest | PlatformDefinition>>;
}
export interface Root { scope: ScopeId; membership: ScopeRef | null }

/** The configuration, as the command line owns it: read on each list, and a root appended after an accepted `create`. */
export interface ConfigPort {
  read(): Promise<McpConfig>;
  addRoot(root: Root): Promise<void>;
  /** Record the repository that the caller's own claim created, or the caller's inbox, as `dap create` and `join` record them. */
  setRepository?(repository: NonNullable<McpConfig["repository"]>): Promise<void>;
  /** Record a room the caller joined, as `dap join` records it: the service, the repository's scopes with the inbox, and the handle. */
  joined?(room: { service: string; repository: NonNullable<McpConfig["repository"]>; handle: string }): Promise<void>;
}

/** What the process keeps, none of it authority: pins by scope and definitions by digest, which never change. */
export class Kept {
  readonly pins = new Map<ScopeId, { ref: ScopeRef; pinned: Digest | PlatformDefinition }>();
  readonly definitions = new Map<string, DeclaredDefinition>();
}

/** The heads last read of the scopes whose change could change the list: the signal to recompute, never part of the generation. */
export type Heads = Record<string, string>;

export interface Read_ {
  inventory: Inventory;
  heads: Heads;
  /** Scopes that could not be read, and why. */
  unread: { scope: string; reason: string }[];
  /** The repository's references as read, for resolving a target. */
  room: Room | null;
}

/** The repository's scopes, with full references where a read gave them. */
export interface Room {
  register: ScopeRef | null;
  directory: ScopeRef;
  membership: ScopeRef;
  rules: ScopeRef | null;
  destination: ScopeRef | null;
  commons: ScopeRef | null;
  inbox: ScopeRef | null;
  /** The directory's lane rows: number, kind, title, state and the lane's reference. */
  lanes: { ref: ScopeRef; number: number | null; kind: string | null; title: string | null; state: string | null }[];
  /** The directory's application rows: the definition's digest, the item's state, and the created scope once it is set. */
  applications: { digest: string | null; state: string; ref: ScopeRef | null }[];
  membershipItems: readonly Item[];
  directoryHead: Head;
}

const headText = (at: Head): string => `${at.seq}:${at.hash}`;
export const readPartitionIndexes = (reads: Reads, root: ScopeRef, membership: ScopeRef) => partitionIndexes({
  summary: scope => reads.read(membership, (transport, reader) => transport.summary(scope, reader)),
  query: (scope, query) => reads.read(membership, (transport, reader) => new ScopeHandle(transport, scope, reader).queryItems(query)),
}, root, membership);
const isRef = (v: unknown): v is ScopeRef => typeof v === "object" && v !== null && typeof (v as ScopeRef).scope === "string" && typeof (v as ScopeRef).genesis === "string";

/** The `kind` of the active member whose active key is `key`, in a membership summary's items, or undefined. */
function memberKind(items: readonly Item[] | undefined, key: string): string | undefined {
  const own = items?.find((item) => item.type === "key" && item.state === "active" && item.values["id"] === key);
  const member = own && items?.find((item) => item.type === "member" && item.id === own.refs["member"] && item.state === "active");
  const kind = member?.values["kind"];
  return typeof kind === "string" ? kind : undefined;
}

/**
 * The session of `membership`, with a standing at the membership head `at` that the caller read (ruling c1fd1293). A held session
 * whose standing names another head is forgotten, and the session is asked for once more. An unmoved membership costs no request.
 */
export async function sessionAt(reads: Reads, membership: ScopeRef, at: Head): Promise<Session | null> {
  const held = await reads.session(membership);
  const head = held?.standing?.head;
  if (!head || (head.seq === at.seq && head.hash === at.hash)) return held;
  reads.forget(membership.scope);
  return reads.session(membership);
}

/**
 * The caller's standing on a membership, from the value in the caller's read session. No session, or a session with no value, is
 * unknown.
 *
 * - `actions` are the actions of the value for which `judgeExploreGrant` answers `current`, one call for each, at `now`. That value
 *   check is the one judge of eligibility: it refuses an action for a key that is not active, a member that is removed, an agent
 *   whose controller is not active (a comment excepted), and a role that does not hold the action. This function decides none of it.
 * - `role`, `handle` and `key` project the value for display. A key or a member that is not active shows no role and no handle.
 * - `kind` is the `kind` field of the caller's member item in the membership summary that the inventory already read for this
 *   membership (`items`). The field is fixed for the member. It decides no action: eligibility goes only through
 *   `judgeExploreGrant`. It is stated only for a key and a member that are active. The function reads nothing. If the summary is not
 *   held (no `items`), or holds no such member item, `kind` is absent.
 */
export function standingFrom(session: Session | null, key: string, now: number, items?: readonly Item[]): Standing {
  if (session === null) return { known: false, reason: "no-session" };
  const value = session.standing;
  if (value === null || value.key !== key) return { known: false, reason: "no-standing" };
  const asOf = timeOf(now);
  const actions = value.actions.filter((action) => judgeExploreGrant(value, { scope: value.of, membership: value.of, key: value.key, action, clock: { asOf } }).result === "current");
  const shown = value.keyState === "active" && value.memberState === "active";
  const kind = shown ? memberKind(items, key) : undefined;
  return { known: true, role: shown ? value.role : null, actions, handle: shown ? value.member : null, key, ...(kind === undefined ? {} : { kind }) };
}

/** A definition by its pinned name or digest: the platform's, or one kept, or read once from a scope that retains it. */
export async function definitionOf(reads: Reads, kept: Kept, pinned: Digest | PlatformDefinition, from: { scope: ScopeId; membership: ScopeRef | null }[]): Promise<DefinitionLike | null> {
  if (isPlatformDefinition(pinned)) return (platform(pinned)?.data as unknown as DefinitionLike | undefined) ?? null;
  const known = kept.definitions.get(pinned);
  if (known) return known as unknown as DefinitionLike;
  for (const source of from) {
    const read = await reads.read(source.membership, (t, r) => t.retained(source.scope, r, "definition", pinned));
    if (!read.ok) continue;
    try {
      const declared = parseStrict(read.value.bytes) as DeclaredDefinition;
      if (definitionDigest(declared) !== pinned) continue;
      kept.definitions.set(pinned, declared);
      return declared as unknown as DefinitionLike;
    } catch { /* not that definition */ }
  }
  return null;
}

/** A scope's reference and pinned definition: kept, or read once from its summary. */
async function pinOf(reads: Reads, kept: Kept, scope: ScopeId, membership: ScopeRef | null, summary?: Summary): Promise<{ ref: ScopeRef; pinned: Digest | PlatformDefinition } | { unread: string }> {
  const known = kept.pins.get(scope);
  if (known) return known;
  let s = summary;
  if (!s) {
    const read = await reads.read(membership, (t, r) => t.summary(scope, r));
    if (!read.ok) return { unread: read.reason };
    s = read.value;
  }
  const pin = { ref: s.scope, pinned: s.definition };
  kept.pins.set(scope, pin);
  return pin;
}

/** Read fresh room authority and the inventory. A target skips unrelated discovery and never supplies a catalogue. */
export async function readInventory(reads: Reads, kept: Kept, config: McpConfig, target?: ScopeId): Promise<Read_> {
  const scopes: Held[] = [];
  const unread: { scope: string; reason: string }[] = [];
  const heads: Heads = {};
  const standing: Record<string, Standing> = {};
  let active: { name: string; digest: string }[] = [];
  let room: Room | null = null;
  const key = reads.signer.key;

  const hold = async (place: Place, scope: ScopeId, membership: ScopeRef | null, summary?: Summary, lane?: Held["lane"]): Promise<void> => {
    if (target !== undefined && scope !== target) return;
    const pin = await pinOf(reads, kept, scope, membership, summary);
    if ("unread" in pin) { unread.push({ scope, reason: pin.unread }); return; }
    const sources = [{ scope, membership }, ...(room?.rules ? [{ scope: room.rules.scope, membership: room.membership }] : [])];
    const definition = await definitionOf(reads, kept, pin.pinned, sources);
    if (!definition) { unread.push({ scope, reason: "definition-unavailable" }); return; }
    scopes.push({ scope, ref: pin.ref, place, pinned: pin.pinned, definition, membership: membership?.scope ?? null, ...(lane ? { lane } : {}) });
  };
  const summaryOf = async (scope: ScopeId, membership: ScopeRef | null): Promise<Read<Summary>> => reads.read(membership, (t, r) => t.summary(scope, r));

  const repository = config.repository;
  if (repository) {
    const M = repository.membership;
    const pinned = config.pins?.[M.scope];
    if (pinned && !kept.pins.has(M.scope)) kept.pins.set(M.scope, { ref: M, pinned });
    const [membershipRead, directoryRead, rulesRead] = await Promise.all([summaryOf(M.scope, M), summaryOf(repository.directory.scope, M), summaryOf(repository.rules, M)]);
    if (membershipRead.ok) {
      heads[M.scope] = headText(membershipRead.at);
      standing[M.scope] = standingFrom(await sessionAt(reads, M, membershipRead.at), key, reads.now(), membershipRead.value.items);
    } else {
      standing[M.scope] = { known: false, reason: membershipRead.reason };
      unread.push({ scope: M.scope, reason: membershipRead.reason });
    }
    if (rulesRead.ok) {
      heads[repository.rules] = headText(rulesRead.at);
      active = rulesRead.value.items.filter((item) => item.type === "definition" && item.state === "active")
        .map((item) => ({ name: String(item.values["name"]), digest: String(item.values["digest"]) }))
        .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : a.digest < b.digest ? -1 : 1));
    } else unread.push({ scope: repository.rules, reason: rulesRead.reason });
    if (directoryRead.ok) {
      heads[repository.directory.scope] = headText(directoryRead.at);
      const d = directoryRead.value;
      const repo = d.items.find((item) => item.type === "repository");
      const ref = (name: string): ScopeRef | null => (isRef(repo?.refs[name]) ? repo!.refs[name] as ScopeRef : null);
      let rows = d.items;
      if (answersVersionQuestion(d.definition, "mcpInventoryPartitionDirectory")) {
        const coverage = await readPartitionIndexes(reads, repository.directory, M);
        if (!coverage.complete) unread.push({ scope: repository.directory.scope, reason: `directory-index-incomplete:${coverage.reason}` });
        rows = coverage.indexes.flatMap(index => [...index.lanes, ...index.applications]);
        for (const index of coverage.indexes) {
          heads[index.ref.scope] = headText(index.at);
          // Partition tools are addressed by scope. They never replace the
          // Root's singleton directory name or its stable room reference.
          await hold("partition", index.ref.scope, M, index.summary);
        }
      }
      const lanes = rows.filter((item) => item.type === "lane" && isRef(item.refs["scope"])).sort((a, b) => Number(a.values["number"] ?? a.id) - Number(b.values["number"] ?? b.id)).map((item) => ({
        ref: item.refs["scope"] as ScopeRef,
        number: typeof item.values["number"] === "number" ? item.values["number"] : null,
        kind: typeof item.values["kind"] === "string" ? item.values["kind"] : null,
        title: typeof item.values["title"] === "string" ? item.values["title"] : null,
        state: typeof item.values["state"] === "string" ? item.values["state"] : null,
      }));
      const applications = rows.filter((item) => item.type === "application").sort((a, b) => a.id - b.id).map((item) => ({
        digest: typeof item.values["definition"] === "string" ? item.values["definition"] : null,
        state: item.state,
        ref: isRef(item.refs["scope"]) ? item.refs["scope"] as ScopeRef : null,
      }));
      room = {
        register: ref("register") ?? config.register ?? null, directory: d.scope, membership: M,
        rules: ref("rules") ?? (rulesRead.ok ? rulesRead.value.scope : null), destination: ref("destination"), commons: ref("commons"), inbox: null, lanes, applications,
        membershipItems: membershipRead.ok ? membershipRead.value.items : [], directoryHead: directoryRead.at,
      };
      await hold("directory", d.scope.scope, M, d);
      if (membershipRead.ok) await hold("membership", M.scope, M, membershipRead.value);
      if (rulesRead.ok) await hold("rules", repository.rules, M, rulesRead.value);
      // The destination's pin follows from the directory's: the directory's version creates exactly that sibling.
      const siblings = SIBLINGS_OF[d.definition];
      if (room.destination && siblings && !kept.pins.has(room.destination.scope)) kept.pins.set(room.destination.scope, { ref: room.destination, pinned: siblings.destination });
      if (room.commons) await hold("commons", room.commons.scope, M);
      if (room.destination) await hold("destination", room.destination.scope, M);
      if (room.register) await hold("register", room.register.scope, M);
      if (repository.inbox) {
        await hold("inbox", repository.inbox, M);
        room.inbox = kept.pins.get(repository.inbox)?.ref ?? null;
      }
      for (const lane of lanes) await hold("lane", lane.ref.scope, M, undefined, { number: lane.number, kind: lane.kind, title: lane.title, state: lane.state });
      // An application is held as a lane is, under the directory's membership, once it is created and its scope is known.
      for (const application of applications) if (application.state === "created" && application.ref) await hold("application", application.ref.scope, M);
    } else {
      unread.push({ scope: repository.directory.scope, reason: directoryRead.reason });
      // Nothing of the room is readable yet: membership is held by the pin the configuration records, so its acts that a rule
      // decides, such as join, are listed.
      if (kept.pins.has(M.scope)) await hold("membership", M.scope, M);
    }
  } else if (config.register) {
    await hold("register", config.register.scope, null);
  }

  const applicationScopes = new Set(scopes.filter((s) => s.place === "application").map((s) => s.scope));
  for (const root of config.roots ?? []) {
    if (applicationScopes.has(root.scope) || target !== undefined && root.scope !== target) continue;
    const read = await summaryOf(root.scope, root.membership);
    if (!read.ok) { unread.push({ scope: root.scope, reason: read.reason }); continue; }
    heads[root.scope] = headText(read.at);
    await hold("root", root.scope, root.membership, read.value);
    if (root.membership && standing[root.membership.scope] === undefined) {
      const m = await summaryOf(root.membership.scope, root.membership);
      standing[root.membership.scope] = m.ok ? standingFrom(await sessionAt(reads, root.membership, m.at), key, reads.now(), m.value.items) : { known: false, reason: m.reason };
      if (m.ok) heads[root.membership.scope] = headText(m.at);
    }
  }

  // Each scope is held once, even when the configuration names it twice.
  const seen = new Set<string>();
  const unique = scopes.filter((s) => (seen.has(s.scope) ? false : (seen.add(s.scope), true)));
  return { inventory: { scopes: unique, standing, roots: config.roots ?? [], active }, heads, unread, room };
}

export const isDeclaredDigest = (v: unknown): v is Digest => isDigest(v);
