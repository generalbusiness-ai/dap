/** Read projections of the actual pinned lane records. These rows grant nothing. */
import { canonicalize, digestBytes, isDigest, isFactRef, isMemberRef, isScopeRef, utf8 } from "@generalbusiness/dap-bytes";
import type { Digest, FactRef, Item, ReadMinimum, ScopeRef, Sealed } from "@generalbusiness/dap-contract";
import { FINDING_DIGESTS, J4_DIGESTS, QUESTION_DIGESTS, QUESTION_BRIEF_DIGESTS, issueQuestions, issueQuestionsBrief } from "@generalbusiness/dap-lanes";
import type { ActSigner, ApplicationReadCatalogue, CallResult, Success, LocalReviewCapture } from "@generalbusiness/dap-mcp";
import { Collection, LIMITS, Unread, sameOptional, minimumFor, type Frame, type ReadOptions } from "./reads.ts";
import { ReviewStore, ReviewStoreError } from "./review-store.ts";
import { readChange } from "./change.ts";
import { laneName, questions } from "./attention.ts";
import { changes, issueLane, matchItem, needsYouRows, row, type Row } from "./needs-you.ts";

export type { Row };
export interface Context {
  scope: ScopeRef; head: Frame["head"]; definition: Digest; ask: Item; bodyAt: FactRef; body: string;
  requests: Item[]; approvals: Item[]; approvalTexts: { approval: number; text: string | null }[]; comments: { item: Item; text: string | null }[];
  versions: { fact: FactRef; text: string }[]; conditions: unknown; brief: Digest | null; briefMatches: boolean;
  signer: ActSigner | null;
  viewer: LocalReviewCapture["viewer"]; actions: readonly string[]; items: Item[];
}
export type PublicContext = Omit<Context, "items" | "versions" | "signer"> & {
  versions: ({ fact: FactRef; current: true } | { fact: FactRef; text: string })[];
};
export interface AdapterOptions extends ReadOptions { reviewStore: ReviewStore; brief: { bytes: Uint8Array; digest: Digest } }
export function result<T extends Record<string, unknown>>(value: T, isError?: false): Success<T>;
export function result<T extends Record<string, unknown>>(value: T, isError: true): CallResult & { structuredContent: T; isError: true };
export function result<T extends Record<string, unknown>>(value: T, isError = false): CallResult { return { structuredContent: value, content: [{ type: "text", text: JSON.stringify(value) }], isError }; }
const RESULT_BYTES = 256 * 1024;
const resultBytes = (answer: CallResult): number => utf8(canonicalize(answer)).length;
export { questions };
export { changes };

/** How many of a lane's newest entries a catch-up row lists. The row counts the others. */
export const SINCE_ENTRIES = 6;
const actorWords = (actor: ReturnType<Collection["actorOfKey"]>): string => !actor ? "a key that is no longer active" : `${actor.name} (${actor.controller ? `${actor.kind} of ${actor.controller}` : actor.kind})`;
/** One entry in the words of its input. Kinds and rules are a definition's names, and a handle is checked at the membership. */
function whatHappened(collection: Collection, sealed: Sealed): string {
  const input = sealed.entry.input;
  if (input.type === "act" || input.type === "preparation") return `${input.signed.intent.kind} by ${actorWords(collection.actorOfKey(input.signed.intent.actor))}`;
  if (input.type === "delivery") return `a delivery from ${input.from.at.kind}`;
  if (input.type === "timed") return `the timed rule ${input.rule}`;
  if (input.type === "outcome") return `the ${input.result} outcome of ${input.kind}`;
  return input.type === "genesis" ? "the scope opened" : input.type;
}
/** The name a person knows this scope by. */
function scopeName(collection: Collection, frame: Frame): string {
  if (sameOptional(frame.ref, collection.membership)) return "The membership";
  if (sameOptional(frame.ref, collection.directory)) return "The directory";
  return laneName(collection.frames.get(collection.directory.scope)!.items.find(item => item.type === "lane" && sameOptional(item.refs["scope"], frame.ref)));
}
/** The entries after a mark, newest last, read in one page. A person reads these; the mark still covers the head, as S4 ruled. */
async function changedSince(collection: Collection, frame: Frame, since: Frame["head"] | null): Promise<{ changed: { seq: number; what: string }[]; earlier: number; name: string }> {
  const from = since ? since.seq + 1 : 0, first = Math.max(from, frame.head.seq - SINCE_ENTRIES + 1);
  const page = await collection.read(frame.ref, handle => handle.history(String(first)));
  const changed = page.value.filter(sealed => sealed.entry.seq >= first && sealed.entry.seq <= frame.head.seq).map(sealed => { collection.keepEntry(frame, sealed); return { seq: sealed.entry.seq, what: whatHappened(collection, sealed) }; });
  return { changed, earlier: frame.head.seq - from + 1 - changed.length, name: scopeName(collection, frame) };
}

export class RepoInAi {
  readonly brief: { bytes: Uint8Array; digest: Digest };
  constructor(readonly options: AdapterOptions) {
    this.brief = { bytes: options.brief.bytes.slice(), digest: options.brief.digest };
    if (this.brief.bytes.length > 65536 || digestBytes(this.brief.bytes) !== this.brief.digest) throw new Unread("brief-invalid");
    const decoded = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(this.brief.bytes);
    if (!sameOptional([...utf8(decoded)], [...this.brief.bytes])) throw new Unread("brief-invalid");
  }
  async collect<T>(run: (collection: Collection) => Promise<T>, target?: ScopeRef, only = false, after?: ScopeRef): Promise<{ value: T; collection: Collection }> {
    const collection = new Collection(this.options);
    try { await collection.begin(target, only, after); return { value: await run(collection), collection }; }
    finally { collection.close(); }
  }
  async #rows(run: (collection: Collection, frames: Frame[]) => Promise<Row[]>, after?: unknown, walks = true, cardPosition?: number) {
    const position = (collection: Collection) => walks ? { next: collection.next } : {};
    if (after !== undefined && !isScopeRef(after)) return result({ error: "after-selector", complete: false }, true);
    try {
      const { value, collection } = await this.collect(async collection => {
        const frames = await collection.lanes(), rows = await run(collection, frames);
        let signer: { scope: ScopeRef; item: number; value: ActSigner | null } | null = null;
        if (cardPosition !== undefined && rows.length) {
          const selected = rows[Math.min(cardPosition, LIMITS.rows - 1, rows.length - 1)]!, frame = frames.find(frame => sameOptional(frame.ref, selected.scope));
          const item = frame?.items.find(item => item.id === selected.item);
          signer = { scope: selected.scope, item: selected.item, value: null };
          try { signer.value = frame && item ? await collection.openingSigner(frame, item) : null; }
          catch { /* Attribution cannot hide the row or change its exact record. */ }
        }
        return { rows, signer };
      }, undefined, false, after);
      const rows = value.rows.slice(0, LIMITS.rows); let omittedRows = value.rows.length - rows.length;
      const reply = () => ({ rows, ...(cardPosition === undefined ? {} : { cardSigner: value.signer }), heads: collection.points(), unread: collection.unread, omittedScopes: collection.omitted, ...position(collection),
        discoveryComplete: collection.discoveryComplete, omittedRows, counters: collection.counters, viewer: collection.viewer, directory: collection.directory, complete: collection.unread.length === 0 && collection.omitted.length === 0 && omittedRows === 0 });
      let answer = result(reply());
      while (resultBytes(answer) > RESULT_BYTES && rows.length) { rows.pop(); omittedRows++; answer = result(reply()); }
      if (resultBytes(answer) > RESULT_BYTES) return result({ error: "rows-output-limit", omittedRows, omittedScopes: collection.omitted.length, ...position(collection), unreadScopes: new Set(collection.unread.map(row => row.scope.scope)).size, complete: false }, true);
      return answer;
    } catch (error) { return result({ error: "read-unavailable", reason: error instanceof Unread || error instanceof ReviewStoreError ? error.reason : "read-failed", complete: false }, true); }
  }
  needsYou(args: Readonly<Record<string, unknown>> = {}, cardPosition?: number) {
    return this.#rows((collection, frames) => needsYouRows(frames, collection), args["after"], true, cardPosition);
  }
  work(cardPosition?: number) {
    return this.#rows(async (collection, frames) => {
      const rows: Row[] = [];
      for (const frame of frames) {
        if (!issueLane(frame.summary.definition)) {
          if (!changes(frame.summary.definition)) collection.unread.push({ scope: frame.ref, reason: "unsupported-profile" });
          continue;
        }
        for (const commitment of frame.items.filter(item => item.type === "commitment")) {
          const performer = commitment.parties["performer"] ?? commitment.parties["offeree"];
          if (!isMemberRef(performer)) continue;
          if (!collection.isAgent(performer)) continue;
          const controller = collection.controller(performer); if (!controller) { collection.unread.push({ scope: frame.ref, reason: "agent-controller-unavailable" }); continue; }
          const blocks = frame.items.filter(item => item.type === "block" && item.state === "blocked" && matchItem(item.refs["commitment"], commitment.id, frame.ref));
          const intent = frame.items.find(item => item.type === "intent");
          const linked = frames.filter(other => changes(other.summary.definition)).flatMap(other => other.items.filter(item => item.type === "manifest" && item.state === "current" && !!item.refs["goal"] && typeof item.refs["goal"] === "object" && "at" in item.refs["goal"] && sameOptional(item.refs["goal"]["at"], frame.ref)).map(item => ({ scope: other.ref, head: other.head, manifest: item.id, relationship: "issue-linked; commitment/report proof not established" })));
          rows.push(row(frame, commitment, "items.commitment;items.block;items.intent", { lane: scopeName(collection, frame), state: commitment.state, agent: performer, controller,
            terms: commitment.values, conditionsAt: commitment.refs["conditionsAt"], termsAt: commitment.refs["termsAt"], currentConditions: intent?.values["conditions"] ?? null, currentConditionsAt: intent?.refs["conditionsAt"] ?? null, blocks, changes: linked }));
        }
      }
      return rows;
    }, undefined, false, cardPosition);
  }
  async question(scope: ScopeRef, id: number, minimum?: ReadMinimum): Promise<{ context: Context; collection: Collection }> {
    const floor = minimumFor(scope, minimum);
    const { value, collection } = await this.collect(async collection => {
      const frame = await collection.frame(scope, floor), pin = frame.summary.definition;
      if (!questions(pin)) throw new Unread("question-profile-unsupported");
      const ask = frame.items.find(item => item.type === "ask" && item.id === id) ?? (await collection.items(frame, "ask", ["asked", "decided", "withdrawn"], [id]))[0];
      if (!ask || ask.type !== "ask") throw new Unread("question-absent");
      const bodyAt = await collection.fact(frame, ask.refs["bodyAt"]), body = ask.values["body"];
      if (!isDigest(body)) throw new Unread("question-body-unavailable");
      const requests = (await collection.items(frame, "approval-request", ["open", "met", "withdrawn"])).filter(item => matchItem(item.refs["ask"], id, frame.ref));
      const approvals = (await collection.items(frame, "approval", ["submitted"])).filter(item => matchItem(item.refs["ask"], id, frame.ref));
      const approvalTexts: Context["approvalTexts"] = [];
      for (const approval of approvals) { const digest = approval.values["comment"]; approvalTexts.push({ approval: approval.id, text: isDigest(digest) ? await collection.text(frame, digest) : null }); }
      const comments = [] as Context["comments"];
      const versions: Context["versions"] = [];
      const facts = new Map<number, FactRef>();
      // Verify the whole lane from genesis to this head. The bodyAt read and
      // history share one allowance of 512 distinct entries, including genesis.
      let cursor: string | undefined, previous: SealedEntry | null = null;
      type SealedEntry = Awaited<ReturnType<Collection["entry"]>>;
      do {
        const got = await collection.read(scope, handle => handle.history(cursor));
        for (const sealed of got.value) {
          const entry = sealed.entry;
          if ((!previous && (entry.seq !== 0 || entry.prev !== null)) || !sameOptional(entry.at, scope) || entryHashFor(sealed) !== sealed.hash || (previous && (entry.seq !== previous.entry.seq + 1 || entry.prev !== previous.hash))) throw new Unread("history-mismatch");
          previous = sealed;
          collection.keepEntry(frame, sealed);
          const fact = { at: scope, seq: entry.seq, hash: sealed.hash };
          facts.set(entry.seq, fact);
          const input = entry.input;
          if (input.type === "act" && (input.signed.intent.kind === "ask" && entry.seq === id || input.signed.intent.kind === "revise-ask" && input.signed.intent.on === id)) {
            const digest = input.signed.intent.fields["body"];
            if (isDigest(digest)) versions.push({ fact, text: await collection.text(frame, digest) });
          }
        }
        if (!got.complete && !got.next) throw new Unread("history-incomplete");
        if (!got.next && (!previous || previous.entry.seq !== frame.head.seq || previous.hash !== frame.head.hash)) throw new Unread("history-incomplete");
        cursor = got.next;
      } while (cursor);
      for (const item of frame.items.filter(item => item.type === "comment")) {
        const about = item.refs["about"];
        if (isFactRef(about) && !sameOptional(about, facts.get(about.seq))) continue;
        if (!versions.some(version => matchItem(about, version.fact.seq, frame.ref)) && !approvals.some(approval => matchItem(about, approval.id, frame.ref)) && !(ask.refs["decisionAt"] !== null && sameOptional(about, ask.refs["decisionAt"]))) continue;
        const digest = item.values["body"]; comments.push({ item, text: isDigest(digest) ? await collection.text(frame, digest) : null });
      }
      const brief = pin === QUESTION_BRIEF_DIGESTS.issue && isDigest(ask.values["brief"]) ? ask.values["brief"] : null;
      return { scope, head: frame.head, definition: pin as Digest, ask, bodyAt, body: await collection.text(frame, body), requests, approvals, approvalTexts, comments, versions,
        conditions: frame.items.find(item => item.type === "intent")?.values["conditions"] ?? null, brief, briefMatches: brief === this.brief.digest,
        signer: await collection.signer(frame, bodyAt), viewer: collection.viewer, actions: collection.actions, items: [...frame.items, ...requests, ...approvals, ask] };
    }, scope);
    return { context: value, collection };
  }
  async context(args: Readonly<Record<string, unknown>>): Promise<CallResult> {
    const q = args["question"] as { scope?: unknown; ask?: unknown } | undefined;
    if (!q || !isScopeRef(q.scope) || !Number.isSafeInteger(q.ask) || Number(q.ask) < 0) return result({ error: "question-selector" }, true);
    try {
      const { context, collection } = await this.question(q.scope, Number(q.ask));
      const { items: _items, signer: _signer, versions, ...fields } = context;
      const publicContext: PublicContext = { ...fields, versions: versions.map(version => sameOptional(version.fact, context.bodyAt) && version.text === context.body ? { fact: version.fact, current: true as const } : version) };
      const answer = result({ context: publicContext, heads: collection.points(), counters: collection.counters, briefResource: { uri: "dap://package/brief", digest: this.brief.digest }, complete: true });
      return resultBytes(answer) > RESULT_BYTES ? result({ error: "context-output-limit", complete: false }, true) : answer;
    }
    catch (error) { return result({ error: "context-unavailable", reason: error instanceof Unread ? error.reason : "read-failed", complete: false }, true); }
  }
  async change(args: Readonly<Record<string, unknown>>): Promise<CallResult> {
    if (!isScopeRef(args["scope"])) return result({ error: "change-selector" }, true);
    try {
      const { context, collection } = await readChange(this, args["scope"]);
      const { who, signer: _signer, definition: _definition, items: _items, mergeKeys: _keys, key: _key, ...fields } = context;
      const named = (item: Item, party: string) => ({ ...item, [`${party}Is`]: who(item.parties[party]) });
      const answer = result({ change: { ...fields, reviews: fields.reviews.map(review => named(review, "reviewer")), results: fields.results.map(found => named(found, "checker")), merges: fields.merges.map(merge => named(merge, "merger")), ...(fields.findings ? { findings: fields.findings.map(({ item, required, holdsMerge, answerAt }) => ({ ...named(item, "reporter"), required, holdsMerge, answerAt })) } : {}) }, heads: collection.points(), counters: collection.counters, complete: true });
      return resultBytes(answer) > RESULT_BYTES ? result({ error: "change-output-limit", complete: false }, true) : answer;
    }
    catch (error) { return result({ error: "change-unavailable", reason: error instanceof Unread ? error.reason : "read-failed", complete: false }, true); }
  }
  since(args: Readonly<Record<string, unknown>> = {}) {
    return this.#rows(async (collection, frames) => {
      const marks = this.options.reviewStore.read({ service: this.options.service, directory: collection.directory, viewer: collection.viewer, key: this.options.signer.key });
      const rows: Row[] = [];
      for (const frame of [...frames, collection.frames.get(collection.membership.scope)!, collection.frames.get(collection.directory.scope)!]) {
        const mark = marks.find(mark => sameOptional(mark.scope, frame.ref));
        if (mark && frame.head.seq < mark.head.seq || mark && frame.head.seq === mark.head.seq && frame.head.hash !== mark.head.hash) { collection.unread.push({ scope: frame.ref, reason: "review-head-conflict" }); continue; }
        if (mark && sameOptional(mark.head, frame.head)) continue;
        let listed: Awaited<ReturnType<typeof changedSince>>;
        try { listed = await changedSince(collection, frame, mark?.head ?? null); }
        catch (error) { if (!(error instanceof Unread)) throw error; collection.unread.push({ scope: frame.ref, reason: error.reason }); continue; }
        rows.push(row(frame, { id: frame.head.seq, type: "head" } as Item, "apps/views/src/repo-in-ai.ts#since (local comparison, not a native permission clause)", { since: mark?.head ?? null, interpretation: "Repeated until an explicit mark", ...listed }));
      }
      return rows;
    }, args["after"]);
  }
  catalogue(): ApplicationReadCatalogue {
    const tool = (name: string, description: string, run: (args: Readonly<Record<string, unknown>>) => Promise<CallResult>, properties: Record<string, unknown> = {}, required: string[] = []) => ({ tool: { name, description, inputSchema: { type: "object", properties, required, additionalProperties: false }, annotations: { readOnlyHint: true } }, run });
    return { revision: digestBytes(utf8(canonicalize({ adapter: "repo-in-ai@1", pins: [QUESTION_DIGESTS.issue, QUESTION_BRIEF_DIGESTS.issue, J4_DIGESTS.issue, J4_DIGESTS.change, FINDING_DIGESTS.change], brief: this.brief.digest }))), tools: [
      tool("needs_you", "Current attention. Each row says what needs you, why it is yours and what settles it, and names its pinned clause, the acts that settle it (settledBy) and its head. At most 50 rows, eight scopes including support; omissions explicit. To read the next lanes, pass the answer's next as after. Attention grants no permission.", args => this.needsYou(args), { after: { type: "object" } }),
      tool("work", "Agent commitments, actual controllers, terms, blocks and issue-linked changes, beside current conditions. Bounded reads; no Task or permission inference.", () => this.work()),
      tool("context", "One Question's text versions, requests, approvals, comments, conditions and immutable Brief binding. Legacy questions remain unbound.", args => this.context(args), { question: { type: "object", properties: { scope: { type: "object" }, ask: { type: "integer", minimum: 0 } }, required: ["scope", "ask"], additionalProperties: false } }, ["question"]),
      tool("change", "One change's exact version: base and integration, this version's reviews with each reviewer's kind, checks, rules, merges, open findings on the finding profile, and the linked issues' conditions and decided questions. Bounded reads; it grants no permission.", args => this.change(args), { scope: { type: "object" } }, ["scope"]),
      tool("since", "Pure read of what changed since the explicit local review mark of this device: each head, its newest entries and how many earlier entries it left out. Repeated reads do not consume changes. To read the next lanes, pass the answer's next as after.", args => this.since(args), { after: { type: "object" } }),
    ] };
  }
}
// Keep entry hashing on the maintained canonical entry codec.
import { entryHash } from "@generalbusiness/dap-bytes";
const entryHashFor = (sealed: { entry: Parameters<typeof entryHash>[0] }) => entryHash(sealed.entry);
export const questionDefinition = (digest: Digest) => digest === QUESTION_BRIEF_DIGESTS.issue ? issueQuestionsBrief : digest === QUESTION_DIGESTS.issue ? issueQuestions : null;
