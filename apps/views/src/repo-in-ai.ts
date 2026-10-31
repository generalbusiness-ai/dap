/** Read projections of the actual pinned lane records. These rows grant nothing. */
import { canonicalize, digestBytes, isDigest, isFactRef, isMemberRef, isScopeRef, utf8 } from "@generalbusiness/dap-bytes";
import type { Digest, FactRef, Item, ReadMinimum, ScopeRef } from "@generalbusiness/dap-contract";
import { J4_DIGESTS, QUESTION_DIGESTS, QUESTION_BRIEF_DIGESTS, issueQuestions, issueQuestionsBrief } from "@generalbusiness/dap-lanes";
import type { ApplicationReadCatalogue, CallResult, LocalReviewCapture } from "@generalbusiness/dap-mcp";
import { Collection, LIMITS, Unread, sameOptional, minimumFor, type Frame, type ReadOptions } from "./reads.ts";
import { ReviewStore, ReviewStoreError } from "./review-store.ts";

export interface Row { scope: ScopeRef; head: Frame["head"]; item: number; type: string; rule: { definition: string; clause: string }; [key: string]: unknown }
export interface Context {
  scope: ScopeRef; head: Frame["head"]; definition: Digest; ask: Item; bodyAt: FactRef; body: string;
  requests: Item[]; approvals: Item[]; approvalTexts: { approval: number; text: string | null }[]; comments: { item: Item; text: string | null }[];
  versions: { fact: FactRef; text: string }[]; conditions: unknown; brief: Digest | null; briefMatches: boolean;
  viewer: LocalReviewCapture["viewer"]; actions: readonly string[]; items: Item[];
}
export type PublicContext = Omit<Context, "items" | "versions"> & {
  versions: ({ fact: FactRef; current: true } | { fact: FactRef; text: string })[];
};
export interface AdapterOptions extends ReadOptions { reviewStore: ReviewStore; brief: { bytes: Uint8Array; digest: Digest } }
export const result = (value: Record<string, unknown>, isError = false): CallResult => ({ structuredContent: value, content: [{ type: "text", text: JSON.stringify(value) }], isError });
const RESULT_BYTES = 256 * 1024;
const resultBytes = (answer: CallResult): number => utf8(canonicalize(answer)).length;
export const questions = (pin: unknown): boolean => pin === QUESTION_DIGESTS.issue || pin === QUESTION_BRIEF_DIGESTS.issue;
const issue = (pin: unknown): boolean => questions(pin) || pin === J4_DIGESTS.issue;
const matchItem = (value: unknown, id: number, scope: ScopeRef): boolean => value === id || isFactRef(value) && sameOptional(value.at, scope) && value.seq === id;
const row = (frame: Frame, item: Item, clause: string, values: Record<string, unknown>): Row => ({ scope: frame.ref, head: frame.head, item: item.id, type: item.type, rule: { definition: frame.summary.definition, clause }, ...values });

export class RepoInAi {
  readonly brief: { bytes: Uint8Array; digest: Digest };
  constructor(readonly options: AdapterOptions) {
    this.brief = { bytes: options.brief.bytes.slice(), digest: options.brief.digest };
    if (this.brief.bytes.length > 65536 || digestBytes(this.brief.bytes) !== this.brief.digest) throw new Unread("brief-invalid");
    const decoded = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(this.brief.bytes);
    if (!sameOptional([...utf8(decoded)], [...this.brief.bytes])) throw new Unread("brief-invalid");
  }
  async collect<T>(run: (collection: Collection) => Promise<T>, target?: ScopeRef): Promise<{ value: T; collection: Collection }> {
    const collection = new Collection(this.options);
    try { await collection.begin(target); return { value: await run(collection), collection }; }
    finally { collection.close(); }
  }
  async #rows(run: (collection: Collection, frames: Frame[]) => Promise<Row[]>): Promise<CallResult> {
    try {
      const { value, collection } = await this.collect(async collection => run(collection, await collection.lanes()));
      const rows = value.slice(0, LIMITS.rows); let omittedRows = value.length - rows.length;
      const reply = () => ({ rows, heads: collection.points(), unread: collection.unread, omittedScopes: collection.omitted,
        discoveryComplete: collection.discoveryComplete, omittedRows, counters: collection.counters, viewer: collection.viewer, directory: collection.directory, complete: collection.unread.length === 0 && collection.omitted.length === 0 && omittedRows === 0 });
      let answer = result(reply());
      while (resultBytes(answer) > RESULT_BYTES && rows.length) { rows.pop(); omittedRows++; answer = result(reply()); }
      if (resultBytes(answer) > RESULT_BYTES) return result({ error: "rows-output-limit", omittedRows, omittedScopes: collection.omitted.length, unreadScopes: new Set(collection.unread.map(row => row.scope.scope)).size, complete: false }, true);
      return answer;
    } catch (error) { return result({ error: "read-unavailable", reason: error instanceof Unread || error instanceof ReviewStoreError ? error.reason : "read-failed", complete: false }, true); }
  }
  needsYou(): Promise<CallResult> {
    return this.#rows(async (collection, frames) => {
      const rows: Row[] = [];
      for (const frame of frames) {
        if (questions(frame.summary.definition)) for (const item of frame.items) {
          if (item.type !== "approval-request" || item.state !== "open" || !sameOptional(item.parties["requested"], collection.viewer)) continue;
          const ask = frame.items.find(ask => ask.type === "ask" && matchItem(item.refs["ask"], ask.id, frame.ref));
          rows.push(row(frame, item, "acts.request-approval;items.approval-request", { category: "requested-review", bodyAt: item.refs["bodyAt"], currentBody: !!ask && sameOptional(item.refs["bodyAt"], ask.refs["bodyAt"]), permission: "not-determined" }));
        }
        else if (frame.summary.definition === J4_DIGESTS.change) {
          const manifest = frame.items.find(item => item.type === "manifest" && item.state === "current");
          for (const item of frame.items) if (item.type === "review-request" && item.state === "open" && sameOptional(item.parties["requested"], collection.viewer))
            rows.push(row(frame, item, "acts.request-review-own;items.review-request", { category: "requested-review", currentManifest: manifest?.id ?? null, requestVersionBound: false, permission: "not-determined" }));
          for (const item of frame.items) if (item.type === "merge" && item.state === "unknown" && (sameOptional(item.parties["merger"], collection.viewer) || isMemberRef(item.parties["merger"]) && sameOptional(collection.controller(item.parties["merger"]), collection.viewer)))
            rows.push(row(frame, item, "acts.merge;items.merge", { category: "unknown-merge", manifest: item.refs["manifest"], retryAllowed: false }));
          if (manifest && frame.items.some(item => item.type === "proposal" && item.state === "open") && collection.actions.includes("change.merge")) rows.push(row(frame, manifest, "acts.merge", { category: "merge-attention", roleIncludes: "change.merge", permission: "not-determined", rules: frame.items.find(item => item.type === "rules")?.values ?? null }));
        } else if (!issue(frame.summary.definition)) collection.unread.push({ scope: frame.ref, reason: "unsupported-profile" });
      }
      return rows;
    });
  }
  work(): Promise<CallResult> {
    return this.#rows(async (collection, frames) => {
      const rows: Row[] = [];
      for (const frame of frames) {
        if (!issue(frame.summary.definition)) {
          if (frame.summary.definition !== J4_DIGESTS.change) collection.unread.push({ scope: frame.ref, reason: "unsupported-profile" });
          continue;
        }
        for (const commitment of frame.items.filter(item => item.type === "commitment")) {
          const performer = commitment.parties["performer"] ?? commitment.parties["offeree"];
          if (!isMemberRef(performer)) continue;
          if (!collection.isAgent(performer)) continue;
          const controller = collection.controller(performer); if (!controller) { collection.unread.push({ scope: frame.ref, reason: "agent-controller-unavailable" }); continue; }
          const blocks = frame.items.filter(item => item.type === "block" && item.state === "blocked" && matchItem(item.refs["commitment"], commitment.id, frame.ref));
          const intent = frame.items.find(item => item.type === "intent");
          const changes = frames.filter(other => other.summary.definition === J4_DIGESTS.change).flatMap(other => other.items.filter(item => item.type === "manifest" && item.state === "current" && !!item.refs["goal"] && typeof item.refs["goal"] === "object" && "at" in item.refs["goal"] && sameOptional(item.refs["goal"]["at"], frame.ref)).map(item => ({ scope: other.ref, head: other.head, manifest: item.id, relationship: "issue-linked; commitment/report proof not established" })));
          rows.push(row(frame, commitment, "items.commitment;items.block;items.intent", { state: commitment.state, agent: performer, controller,
            terms: commitment.values, conditionsAt: commitment.refs["conditionsAt"], termsAt: commitment.refs["termsAt"], currentConditions: intent?.values["conditions"] ?? null, currentConditionsAt: intent?.refs["conditionsAt"] ?? null, blocks, changes }));
        }
      }
      return rows;
    });
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
      // history share one allowance of 50 distinct entries, including genesis.
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
        viewer: collection.viewer, actions: collection.actions, items: [...frame.items, ...requests, ...approvals, ask] };
    }, scope);
    return { context: value, collection };
  }
  async context(args: Readonly<Record<string, unknown>>): Promise<CallResult> {
    const q = args["question"] as { scope?: unknown; ask?: unknown } | undefined;
    if (!q || !isScopeRef(q.scope) || !Number.isSafeInteger(q.ask) || Number(q.ask) < 0) return result({ error: "question-selector" }, true);
    try {
      const { context, collection } = await this.question(q.scope, Number(q.ask));
      const { items: _items, versions, ...fields } = context;
      const publicContext: PublicContext = { ...fields, versions: versions.map(version => sameOptional(version.fact, context.bodyAt) && version.text === context.body ? { fact: version.fact, current: true as const } : version) };
      const answer = result({ context: publicContext, heads: collection.points(), counters: collection.counters, briefResource: { uri: "dap://package/brief", digest: this.brief.digest }, complete: true });
      return resultBytes(answer) > RESULT_BYTES ? result({ error: "context-output-limit", complete: false }, true) : answer;
    }
    catch (error) { return result({ error: "context-unavailable", reason: error instanceof Unread ? error.reason : "read-failed", complete: false }, true); }
  }
  since(): Promise<CallResult> {
    return this.#rows(async (collection, frames) => {
      const marks = this.options.reviewStore.read({ service: this.options.service, directory: collection.directory, viewer: collection.viewer, key: this.options.signer.key });
      const rows: Row[] = [];
      for (const frame of [...frames, collection.frames.get(collection.membership.scope)!, collection.frames.get(collection.directory.scope)!]) {
        const mark = marks.find(mark => sameOptional(mark.scope, frame.ref));
        if (mark && frame.head.seq < mark.head.seq || mark && frame.head.seq === mark.head.seq && frame.head.hash !== mark.head.hash) { collection.unread.push({ scope: frame.ref, reason: "review-head-conflict" }); continue; }
        if (!mark || !sameOptional(mark.head, frame.head)) rows.push(row(frame, { id: frame.head.seq, type: "head" } as Item, "apps/views/src/repo-in-ai.ts#since (local comparison, not a native permission clause)", { since: mark?.head ?? null, interpretation: "Repeated until an explicit mark" }));
      }
      return rows;
    });
  }
  catalogue(): ApplicationReadCatalogue {
    const tool = (name: string, description: string, run: (args: Readonly<Record<string, unknown>>) => Promise<CallResult>, properties: Record<string, unknown> = {}, required: string[] = []) => ({ tool: { name, description, inputSchema: { type: "object", properties, required, additionalProperties: false }, annotations: { readOnlyHint: true } }, run });
    return { revision: digestBytes(utf8(canonicalize({ adapter: "repo-in-ai@1", pins: [QUESTION_DIGESTS.issue, QUESTION_BRIEF_DIGESTS.issue, J4_DIGESTS.issue, J4_DIGESTS.change], brief: this.brief.digest }))), tools: [
      tool("needs_you", "Current attention, with pinned clauses and heads. At most 50 rows, eight scopes including support; omissions explicit. Attention grants no permission.", () => this.needsYou()),
      tool("work", "Agent commitments, actual controllers, terms, blocks and issue-linked changes, beside current conditions. Bounded reads; no Task or permission inference.", () => this.work()),
      tool("context", "One Question's text versions, requests, approvals, comments, conditions and immutable Brief binding. Legacy questions remain unbound.", args => this.context(args), { question: { type: "object", properties: { scope: { type: "object" }, ask: { type: "integer", minimum: 0 } }, required: ["scope", "ask"], additionalProperties: false } }, ["question"]),
      tool("since", "Pure read of heads since the explicit local review mark. Repeated reads do not consume changes.", () => this.since()),
    ] };
  }
}
// Keep entry hashing on the maintained canonical entry codec.
import { entryHash } from "@generalbusiness/dap-bytes";
const entryHashFor = (sealed: { entry: Parameters<typeof entryHash>[0] }) => entryHash(sealed.entry);
export const questionDefinition = (digest: Digest) => digest === QUESTION_BRIEF_DIGESTS.issue ? issueQuestionsBrief : digest === QUESTION_DIGESTS.issue ? issueQuestions : null;
