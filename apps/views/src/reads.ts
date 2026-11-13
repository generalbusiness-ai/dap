/** One authenticated, bounded collection. No room inventory or background read. */
import { canonicalize, isEntryBodyOf, isFactRef, isMemberRef, isScopeRef, readMinimum, textDigest, utf8 } from "@generalbusiness/dap-bytes";
import type { Digest, FactRef, Head, Item, MemberRef, ReadMinimum, ScopeRef, Sealed } from "@generalbusiness/dap-contract";
import { ScopeHandle, type Fetch, type Signer } from "@generalbusiness/dap-client";
import { actSigner, type ActSigner, ReadSessions, Reads, type McpConfig } from "@generalbusiness/dap-mcp";
import { viewsEvidenceDirectoryForMembership, answersVersionQuestion, ROLE_LISTS, type Role } from "@generalbusiness/dap-platform";
import { LIMITS, controllerIn, keyHolder, laneRefs, laneWindow, type Frame } from "./needs-you.ts";
import { sameOptional } from "./words.ts";

export { LIMITS };
export type { Frame };
export class Unread extends Error { constructor(readonly reason: string) { super(reason); } }
export { sameOptional };
/** A receipt floor belongs to one exact target; it supplies no authority. */
export function minimumFor(ref: ScopeRef, value?: ReadMinimum): ReadMinimum | undefined {
  if (value === undefined) return undefined;
  const floor = readMinimum(value);
  if (!floor || !sameOptional(floor.at, ref)) throw new Unread("read-minimum-scope");
  return floor;
}
function requireMinimum(head: Head, floor?: ReadMinimum): void {
  if (!floor) return;
  const seq = typeof floor.head === "number" ? floor.head : floor.head.seq;
  if (head.seq < seq || typeof floor.head !== "number" && head.seq === seq && head.hash !== floor.head.hash) throw new Unread("read-minimum-behind");
}
export interface Point { scope: ScopeRef; head: Head }
export interface ReadOptions { service: string; signer: Signer; config: () => Promise<McpConfig>; fetch?: Fetch; now?: () => number; readSessions?: ReadSessions }
export interface Counters { scopes: number; requests: number; bytes: number; pages: number; items: number; history: number; textBytes: number }

export class Collection {
  readonly counters: Counters = { scopes: 0, requests: 0, bytes: 0, pages: 0, items: 0, history: 0, textBytes: 0 };
  readonly unread: { scope: ScopeRef; reason: string }[] = [];
  readonly frames = new Map<string, Frame>();
  readonly admitted = new Map<string, ScopeRef>();
  readonly reads: Reads;
  readonly started = Date.now();
  readonly #records = new Map<string, string>();
  readonly #entries = new Map<string, Sealed>();
  readonly #texts = new Map<string, string>();
  #closed = false;
  #failure: Unread | null = null;
  config!: McpConfig;
  membership!: ScopeRef;
  directory!: ScopeRef;
  viewer!: MemberRef;
  actions: readonly string[] = [];
  selected: ScopeRef[] = [];
  /** The lanes the directory lists: the scopes a linked read may name. */
  listed: ScopeRef[] = [];
  omitted: ScopeRef[] = [];
  /** The lane to name as `after` for the next window. Null when no lane follows this window. */
  next: ScopeRef | null = null;
  discoveryComplete = false;

  constructor(readonly options: ReadOptions) {
    this.reads = new Reads({ ...(options.readSessions ? { sessions: options.readSessions } : {}), service: options.service, signer: options.signer, now: options.now ?? Date.now, fetch: this.#fetch });
  }
  close(): void { this.#closed = true; }
  fail(reason: string): never { this.#failure ??= new Unread(reason); throw this.#failure; }
  guard(): void { if (this.#failure) throw this.#failure; if (this.#closed || Date.now() - this.started >= LIMITS.milliseconds) this.fail("deadline"); }
  admit(ref: ScopeRef): void {
    this.guard();
    if (!isScopeRef(ref)) throw new Unread("scope-shape");
    const old = this.admitted.get(ref.scope);
    if (old) { if (!sameOptional(old, ref)) throw new Unread("genesis-conflict"); return; }
    if (this.admitted.size >= LIMITS.scopes) throw new Unread("scope-limit");
    this.admitted.set(ref.scope, structuredClone(ref)); this.counters.scopes++;
  }
  readonly #fetch: Fetch = async (url, init) => {
    this.guard();
    const base = new URL(this.options.service.replace(/\/+$/, "") + "/"), asked = new URL(url);
    const prefix = base.pathname.replace(/\/$/, "") + "/v1/scopes/";
    if (asked.origin !== base.origin || !asked.pathname.startsWith(prefix)) throw new Unread("route");
    const [id, ...tail] = asked.pathname.slice(prefix.length).split("/");
    if (!id || !this.admitted.has(decodeURIComponent(id))) throw new Unread("unselected-scope");
    const route = tail.join("/"), method = init?.method ?? "GET";
    if (method !== "GET" && !(method === "POST" && route === "sessions")) throw new Unread("write-route");
    if (method === "GET" && !/^(?:|items(?:\/[^/]+)?|query-items|history|log|entries\/\d+|retained\/(?:text|definition)\/[^/]+)$/.test(route)) throw new Unread("route");
    if (this.counters.requests >= LIMITS.requests) this.fail("request-limit");
    this.counters.requests++;
    const controller = new AbortController();
    let expired = false, timer: ReturnType<typeof setTimeout> | undefined;
    const expire = new Promise<never>((_, reject) => { timer = setTimeout(() => { expired = true; controller.abort(); reject(new Unread("deadline")); }, Math.min(LIMITS.requestMilliseconds, LIMITS.milliseconds - (Date.now() - this.started))); });
    const read = async () => {
      const response = this.options.fetch ? await this.options.fetch(url, init) : await fetch(url, { ...init, signal: controller.signal, redirect: "error" });
      if (expired || this.#closed) { await response.body?.getReader().cancel(); throw new Unread("deadline"); }
      const reader = response.body?.getReader(), chunks: Uint8Array[] = []; let length = 0;
      try {
        if (reader) for (;;) {
          const next = await reader.read();
          if (expired || this.#closed) throw new Unread("deadline");
          if (next.done) break;
          if (!next.value) throw new Unread("reply-shape");
          length += next.value.byteLength; this.counters.bytes += next.value.byteLength;
          if (length > LIMITS.replyBytes || this.counters.bytes > LIMITS.bytes) this.fail("byte-limit");
          if (chunks.length >= 4096) this.fail("chunk-limit");
          if (next.value.length === 0) { await new Promise(resolve => setTimeout(resolve, 0)); continue; }
          chunks.push(next.value);
        }
      } catch (error) { await reader?.cancel().catch(() => {}); throw error; }

      this.guard();
      const bytes = new Uint8Array(length); let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      return { status: response.status, ...(response.headers ? { headers: response.headers } : {}), body: new ReadableStream<Uint8Array>({ start(stream) { stream.enqueue(bytes); stream.close(); } }) };
    };
    try { return await Promise.race([read(), expire]); } finally { clearTimeout(timer); }
  };
  async read<T>(ref: ScopeRef, run: (handle: ScopeHandle) => Promise<{ ok: true; at: Head; value: T; complete: boolean; next?: string } | { ok: false; reason: string }>): Promise<{ ok: true; at: Head; value: T; complete: boolean; next?: string }> {
    this.guard(); this.admit(ref);
    if (this.counters.pages >= LIMITS.pages) throw new Unread("page-limit"); this.counters.pages++;
    let result: Awaited<ReturnType<typeof run>>;
    try { result = await this.reads.read(this.membership, (transport, reader) => run(new ScopeHandle(transport, ref.scope, reader))); }
    catch (error) { this.guard(); if (error instanceof Unread) throw error; throw new Unread("transport"); }
    this.guard();
    if (!result.ok) throw new Unread(result.reason);
    const frame = this.frames.get(ref.scope);
    if (frame && !sameOptional(frame.head, result.at)) throw new Unread("head-changed");
    return result;
  }
  #keepItems(ref: ScopeRef, at: Head, items: readonly Item[]): void {
    const fresh = items.filter(item => !this.#records.has(canonicalize([ref, at, item.id, item.revision])));
    if (this.counters.items + fresh.length > LIMITS.items) throw new Unread("item-limit");
    for (const item of items) {
      const key = canonicalize([ref, at, item.id, item.revision]), bytes = canonicalize(item), old = this.#records.get(key);
      if (old !== undefined && old !== bytes) throw new Unread("item-conflict");
      this.#records.set(key, bytes);
    }
    this.counters.items += fresh.length;
  }
  async frame(ref: ScopeRef, minimum?: ReadMinimum): Promise<Frame> {
    const floor = minimumFor(ref, minimum);
    const held = this.frames.get(ref.scope); if (held) { if (!sameOptional(ref, held.ref)) throw new Unread("genesis-conflict"); requireMinimum(held.head, floor); return held; }
    const got = await this.read(ref, handle => handle.summary(floor));
    if (!sameOptional(got.value.scope, ref) || !got.complete || got.value.status !== "active") throw new Unread("summary-incomplete");
    this.#keepItems(ref, got.at, got.value.items);
    const frame = { ref, head: got.at, summary: got.value, items: [...got.value.items] };
    this.frames.set(ref.scope, frame); return frame;
  }
  /**
   * With `only`, keep the allowance for what the target links to, and select no other lane.
   * With `after`, select the window of lanes that follows that lane in the stable order. That lane need not still be listed.
   */
  async begin(target?: ScopeRef, only = false, after?: ScopeRef): Promise<this> {
    this.config = await this.options.config(); this.guard();
    if (this.config.service.replace(/\/+$/, "") !== this.options.service.replace(/\/+$/, "") || !this.config.repository) throw new Unread("room-unconfigured");
    this.membership = this.config.repository.membership; this.directory = this.config.repository.directory;
    this.admit(this.membership); this.admit(this.directory);
    const M = await this.frame(this.membership), D = await this.frame(this.directory);
    if (!answersVersionQuestion(M.summary.definition, "viewsEvidenceMembership")) throw new Unread("membership-unsupported");
    if (!viewsEvidenceDirectoryForMembership(M.summary.definition).some(directory => directory === D.summary.definition)) throw new Unread("directory-unsupported");
    const keys = M.items.filter(item => item.type === "key" && item.state === "active" && item.values["id"] === this.options.signer.key);
    const members = M.items.filter(item => item.type === "member" && item.state === "active" && keys.some(key => key.refs["member"] === item.id));
    const person = members[0], roster = M.items.find(item => item.type === "roster");
    if (keys.length !== 1 || members.length !== 1 || !person || !isMemberRef(person.parties["member"]) || !sameOptional(person.parties["member"].membership, this.membership) || !roster) throw new Unread("viewer-unbound");
    const repository = D.items.find(item => item.type === "repository");
    if (!sameOptional(roster.refs["directory"], this.directory) || !sameOptional(repository?.refs["membership"], this.membership)) throw new Unread("room-binding");
    this.viewer = person.parties["member"];
    const role = person.values["role"];
    if (typeof role !== "string" || !Object.hasOwn(ROLE_LISTS, role)) throw new Unread("viewer-role");
    const actions = roster.values[ROLE_LISTS[role as Role]];
    if (!Array.isArray(actions) || actions.some(action => typeof action !== "string")) throw new Unread("viewer-role");
    this.actions = actions as string[];
    const refs = laneRefs(D.items);
    if (!refs) throw new Unread("genesis-conflict");
    this.discoveryComplete = true;
    if (target && !refs.some(ref => sameOptional(ref, target))) throw new Unread("outside-room");
    if (target) refs.sort((a, b) => Number(sameOptional(b, target)) - Number(sameOptional(a, target)));
    this.listed = refs;
    if (only) { this.selected = target ? [target] : []; if (target) this.admit(target); return this; }
    ({ selected: this.selected, omitted: this.omitted, next: this.next } = laneWindow(refs, LIMITS.scopes - this.admitted.size, after));
    for (const ref of this.selected) this.admit(ref);
    return this;
  }
  async lanes(): Promise<Frame[]> {
    const frames: Frame[] = [];
    for (const ref of this.selected) try { frames.push(await this.frame(ref)); } catch (error) { if (!(error instanceof Unread)) throw error; this.unread.push({ scope: ref, reason: error.reason }); }
    return frames;
  }
  async items(frame: Frame, type: string, states: readonly string[], ids: readonly number[] | null = null): Promise<Item[]> {
    const found: Item[] = []; let cursor: string | null = null;
    do {
      this.guard();
      const got = await this.read(frame.ref, handle => handle.queryItems({ v: 1, scope: frame.ref, type, states: [...states].sort(), ids, limit: Math.min(100, LIMITS.items - this.counters.items) || 1, cursor }));
      this.#keepItems(frame.ref, got.at, got.value.items); found.push(...got.value.items);
      if (!got.complete && !got.next) throw new Unread("items-incomplete");
      if (got.next === cursor) throw new Unread("cursor-cycle"); cursor = got.next ?? null;
    } while (cursor !== null);
    return found;
  }
  keepEntry(frame: Frame, sealed: Sealed): Sealed {
    const seq = sealed.entry.seq, key = canonicalize([frame.ref, seq]), old = this.#entries.get(key);
    if (!Number.isSafeInteger(seq) || seq < 0 || seq > frame.head.seq || !isEntryBodyOf(sealed.entry, { at: frame.ref, seq, hash: sealed.hash }) || (seq === frame.head.seq && sealed.hash !== frame.head.hash)) throw new Unread("entry-mismatch");
    if (old) { if (!sameOptional(old, sealed)) throw new Unread("entry-mismatch"); return old; }
    if (this.counters.history >= LIMITS.history) throw new Unread("history-limit");
    this.counters.history++; this.#entries.set(key, sealed); return sealed;
  }
  async entry(frame: Frame, seq: number): Promise<Sealed> {
    const key = canonicalize([frame.ref, seq]), old = this.#entries.get(key); if (old) return old;
    if (!Number.isSafeInteger(seq) || seq < 0 || seq > frame.head.seq || this.counters.history >= LIMITS.history) throw new Unread("history-limit");
    const got = await this.read(frame.ref, handle => handle.entry(seq));
    if (!got.complete || got.value.entry.seq !== seq) throw new Unread("entry-mismatch");
    return this.keepEntry(frame, got.value);
  }
  async fact(frame: Frame, value: unknown): Promise<FactRef> {
    const seq = typeof value === "number" ? value : isFactRef(value) && sameOptional(value.at, frame.ref) ? value.seq : NaN;
    const sealed = await this.entry(frame, seq), fact = { at: frame.ref, seq, hash: sealed.hash };
    if (isFactRef(value) && !sameOptional(value, fact)) throw new Unread("fact-mismatch"); return fact;
  }
  async text(frame: Frame, digest: Digest): Promise<string> {
    const key = canonicalize([frame.ref, digest]); if (this.#texts.has(key)) return this.#texts.get(key)!;
    const got = await this.read(frame.ref, handle => handle.text(digest));
    const size = utf8(got.value).length;
    if (!got.complete || textDigest(got.value) !== digest || size > LIMITS.textBytes || this.counters.textBytes + size > LIMITS.textsBytes) throw new Unread("text-unavailable");
    this.counters.textBytes += size; this.#texts.set(key, got.value); return got.value;
  }
  /** Attribution uses a pinned entry, not its item's current parties or the lane's latest writer. */
  async signer(frame: Frame, fact: FactRef): Promise<ActSigner | null> {
    const sealed = await this.entry(frame, fact.seq);
    if (!sameOptional(fact.at, frame.ref) || sealed.hash !== fact.hash) throw new Unread("signer-entry-mismatch");
    const input = sealed.entry.input;
    return input.type === "act" || input.type === "preparation" ? actSigner(this.frames.get(this.membership.scope)!.items, this.membership, input.signed.intent.actor) : null;
  }
  async openingSigner(frame: Frame, item: Item): Promise<ActSigner | null> {
    if (!item.opened) return null;
    return this.signer(frame, { at: frame.ref, seq: item.id, hash: item.opened });
  }
  inRoom(ref: ScopeRef): boolean { return this.listed.some(listed => sameOptional(listed, ref)); }
  /** A member as the membership lists them now. A member that is not active reads as unknown. */
  actor(member: MemberRef): { kind: string; name: string; controller?: string } {
    const M = this.frames.get(this.membership.scope)!;
    const row = M.items.find(item => item.type === "member" && item.state === "active" && sameOptional(item.parties["member"], member));
    if (!row) return { kind: "unknown", name: member.member };
    const kind = typeof row.values["kind"] === "string" ? row.values["kind"] : "unknown", controller = row.parties["controller"];
    return { kind, name: member.member, ...(isMemberRef(controller) ? { controller: controller.member } : {}) };
  }
  /** Who holds a key, as the membership lists it now. A key that is no longer active reads as unknown. */
  actorOfKey(key: string): { kind: string; name: string; controller?: string } | null {
    const member = keyHolder(this.frames.get(this.membership.scope)!.items, key);
    return member ? this.actor(member) : null;
  }
  isAgent(member: MemberRef): boolean { return this.frames.get(this.membership.scope)!.items.some(item => item.type === "member" && item.state === "active" && item.values["kind"] === "agent" && sameOptional(item.parties["member"], member)); }
  controller(member: MemberRef): MemberRef | null { return controllerIn(this.frames.get(this.membership.scope)!.items, this.membership, member); }
  points(): Point[] { return [...this.frames.values()].map(frame => ({ scope: frame.ref, head: frame.head })); }
}
