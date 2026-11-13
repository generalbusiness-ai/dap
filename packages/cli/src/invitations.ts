import { invitationIssueFields, invitationRedemptionFields } from "@generalbusiness/dap-client";
import { cliInvitationDirectoriesForMembership, answersVersionQuestion, isHandle, platform } from "@generalbusiness/dap-platform";
/** Retained invitation creation and explicitly tagged agent, checker and device enrollment.
 * Store.private holds secrets/envelopes; public config holds only exact pointers.
 * Callers serialize one Store and fence their captured Page context. */
import type { Answer, Entry, FactRef, FieldValue, MemberRef, Receipt, SignedIntent, Summary, ScopeId, ScopeRef } from "@generalbusiness/dap-contract";
import { b64url, canonicalize, entryHash, intentDigest, isMemberRef, isScopeRef, isScopeId, isRecord, isHead, isKeyId, REFUSAL_REASONS, unb64url, timeMs, isReceipt, isSignedIntentShape, keyIdOfSecret, parseStrict, scopeIdOf, textDigest, timeOf, utf8, verifySignedIntent, isEntryBodyOf } from "@generalbusiness/dap-bytes";
import { agentKeyInvitationOf, encodeAgentKeyInvitation, checkerKeyInvitationOf, deviceKeyInvitationOf, encodeCheckerKeyInvitation, isCheckerKeyMembership, httpTransport, isAgentKeyMembership, ScopeHandle, secretSigner, signedIntent, type AgentKeyMembership, type DeviceKeyInvitation, type Signer } from "@generalbusiness/dap-client";

import { expectedOf, LINK, linkOf, type DefinitionShape, type Link } from "./browser-helpers.ts";
import type { Context, Outcome } from "./commands.ts";
import { requiredReadsOf, Stop, usage } from "./command-support.ts";
import type { Config, PendingInvitationIssue, Repository } from "./store.ts";

export interface InvitationIssueInput { kind: "person" | "agent-key"; handle: string; hours: number; role?: "member" | "maintainer" | "admin"; controller?: MemberRef }
export interface InvitationIssueOptions { privateRequests: readonly string[]; reservedRequest?: string; mode: "new" | "check" | "continue"; operation: string; current?: () => boolean }
export interface InvitationIssueResult { operation: string; kind: "person" | "agent-key"; handle: string; state: "prepared" | "unknown" | "refused" | "verified"; reason?: string; /** Private handoff, never put into a public status log. */ link?: string }
/** Separate API: browser person/agent inputs and results do not widen. */
export interface CheckerInvitationIssueInput { handle: string; hours: number; role?: never; controller?: never }
export interface CheckerInvitationIssueResult extends Omit<InvitationIssueResult, "kind"> { kind: "checker-key" }
/** Own-agent issuance keeps a distinct private tag and never changes the
 * administrative issuer's input or retained originals. */
export interface OwnAgentInvitationIssueInput { handle: string; hours: number; controller: MemberRef }
export interface OwnAgentInvitationIssueResult extends Omit<InvitationIssueResult, "kind"> { kind: "own-agent-key" }
type IssuedInput = InvitationIssueInput | (CheckerInvitationIssueInput & { kind: "checker-key" }) | (OwnAgentInvitationIssueInput & { kind: "own-agent-key" });
type IssuedResult = Omit<InvitationIssueResult, "kind"> & { kind: IssuedInput["kind"] };
const checkerIssueInput = (value: unknown): value is CheckerInvitationIssueInput => closed(value, ["handle", "hours"]) && isHandle(value["handle"]) && utf8(value["handle"]).length <= 256 && typeof value["hours"] === "number" && Number.isFinite(value["hours"]) && value["hours"] > 0;
const ownAgentIssueInput = (value: unknown): value is OwnAgentInvitationIssueInput => closed(value, ["handle", "hours", "controller"]) && isHandle(value["handle"]) && utf8(value["handle"]).length <= 256 && typeof value["hours"] === "number" && Number.isFinite(value["hours"]) && value["hours"] > 0 && value["hours"] < 24 && isMemberRef(value["controller"]);
const issuedInput = (value: unknown): value is IssuedInput => isInvitationIssueInput(value)
  || closed(value, ["kind", "handle", "hours"]) && value["kind"] === "checker-key" && checkerIssueInput({ handle: value["handle"], hours: value["hours"] })
  || closed(value, ["kind", "handle", "hours", "controller"]) && value["kind"] === "own-agent-key" && ownAgentIssueInput({ handle: value["handle"], hours: value["hours"], controller: value["controller"] });
const agentIssue = (input: IssuedInput): boolean => input.kind === "agent-key" || input.kind === "own-agent-key";
const openingKind = (input: IssuedInput) => input.kind === "own-agent-key" ? "add-own-agent" : "add-member";
const invitationKind = (input: IssuedInput) => input.kind === "person" ? "invite-member" : input.kind === "own-agent-key" ? "invite-own-agent-key" : "invite-key";
const memberFields = (input: IssuedInput): Record<string, FieldValue> => input.kind === "checker-key" ? { handle: input.handle, kind: "checker" } : { handle: input.handle, kind: "agent", controller: input.controller! };

interface Stage { signed: SignedIntent; attempted: boolean; receipt?: Receipt; refused?: Extract<Answer, { answer: "refused" }> }
interface Issue { previous?: { request: string; digest: import("@generalbusiness/dap-contract").Digest }; v: 1; operation: string; input: IssuedInput; service: string; repository: Repository; actor: string; secret: string; ends: string; /** The membership's pinned definition, read at issuance; a retained row without it is a membership@2 row. */ definition?: AgentKeyMembership; member?: Stage; invitation?: Stage; link?: string }
const sameOptional = (a: unknown, b: unknown) => a === undefined || b === undefined ? a === b : canonicalize(a) === canonicalize(b);
const blocked = () => new Error("The original invitation custody or context is unavailable. Nothing was replaced.");
const privateName = (prefix: "i" | "a" | "k") => prefix + "-" + crypto.randomUUID().replace(/-/g, "").slice(0, 30);
const uuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v);
const now = (ctx: Context) => ctx.now?.() ?? Date.now();
function check(options: InvitationIssueOptions): void { if (options.current?.() === false) throw blocked(); }
const wait = async <T>(options: InvitationIssueOptions, work: () => Promise<T>): Promise<T> => { check(options); const result = await work(); check(options); return result; };
type InvitationReads = { reader: string; transport: ReturnType<typeof requiredReadsOf>["transport"] };
async function readerFor(ctx: Context, service: string, membership: ScopeRef, key: Uint8Array | Signer, current?: () => boolean): Promise<InvitationReads> {
  const signer = key instanceof Uint8Array ? secretSigner(key) : key;
  const reads = requiredReadsOf(ctx, service, membership, signer, current);
  const session = await reads.session();
  if (!session || session.claims.key !== signer.key || !sameOptional(session.claims.membership, membership)) throw blocked();
  return { reader: session.reader(), transport: reads.transport }; // Flow-local reads; never act authority or public custody.
}
function handle(reads: InvitationReads, scope: import("@generalbusiness/dap-contract").ScopeId): ScopeHandle {
  return new ScopeHandle(reads.transport, scope, reads.reader);
}
/**
 * The membership's summary, which must name the exact definition expected: the pin a retained issuance or an invitation
 * carries. The same acts (`add-member`, `invite-key`, `enrol`) exist under each supported pin; the pin is what the receipts
 * are checked against, never a name alone.
 */
async function summary(M: ScopeHandle, at: ScopeRef, definition: AgentKeyMembership): Promise<Summary> {
  const read = await M.summary();
  if (!read.ok || !read.complete || read.next !== undefined || !sameOptional(read.value.scope, at) || read.value.definition !== definition) throw blocked();
  return read.value;
}
/** The membership's summary and its pinned definition, which must be one this command enrols agents under. */
async function pinnedSummary(M: ScopeHandle, at: ScopeRef): Promise<{ summary: Summary; definition: AgentKeyMembership }> {
  const read = await M.summary();
  if (!read.ok || !read.complete || read.next !== undefined || !sameOptional(read.value.scope, at) || !isAgentKeyMembership(read.value.definition) || platform(read.value.definition)?.data.name !== "platform:membership") throw blocked();
  return { summary: read.value, definition: read.value.definition };
}
const pinOf = (issue: Pick<Issue, "definition">): AgentKeyMembership => issue.definition ?? "platform:membership@2";
const closed = (value: unknown, required: string[], optional: string[] = []): value is Record<string, unknown> => isRecord(value) && required.every(k => Object.hasOwn(value, k)) && Object.keys(value).every(k => required.includes(k) || optional.includes(k));
async function boundDirectory(reads: InvitationReads, repository: Repository, membership: Summary, definition: AgentKeyMembership): Promise<Repository | null> {
  const roster = membership.items.find(item => item.type === "roster" && item.state === "open");
  if (!roster || !sameOptional(roster.refs["directory"], repository.directory)) return null;
  const read = await handle(reads, repository.directory.scope).summary();
  if (!read.ok || !read.complete || read.next !== undefined || read.value.status !== "active" || !cliInvitationDirectoriesForMembership(definition).some(directory => directory === read.value.definition) || !sameOptional(read.value.scope, repository.directory)) return null;
  const item = read.value.items.find(item => item.type === "repository"), rules = item?.refs["rules"], destination = item?.refs["destination"];
  if (!item || !sameOptional(item.refs["membership"], repository.membership) || !isScopeRef(rules) || rules.scope !== repository.rules || !isScopeRef(destination) || destination.scope !== repository.destination) return null;
  return { directory: read.value.scope, membership: membership.scope, rules: rules.scope, destination: destination.scope };
}
export function isInvitationIssueInput(value: unknown): value is InvitationIssueInput {
  if (!closed(value, ["kind", "handle", "hours"], ["role", "controller"])) return false;
  const input = value as unknown as InvitationIssueInput;
  if (!closed(input, ["kind", "handle", "hours"], ["role", "controller"]) || !isHandle(input.handle) || utf8(input.handle).length > 256 || !Number.isFinite(input.hours) || input.hours <= 0) return false;
  return input.kind === "person" ? ["member", "maintainer", "admin"].includes(input.role ?? "") && input.controller === undefined : input.kind === "agent-key" && input.role === undefined && isMemberRef(input.controller);
}
function repositoryValid(r: unknown): r is Repository {
  if (!closed(r, ["directory", "membership", "rules", "destination"], ["inbox"])) return false;
  return isScopeRef(r["directory"]) && isScopeRef(r["membership"]) && isScopeId(r["rules"]) && isScopeId(r["destination"]) && (r["inbox"] === undefined || isScopeId(r["inbox"]));
}
function stageValid(stage: Stage, issue: Issue, kind: string): boolean {
  if (!closed(stage, ["signed", "attempted"], ["receipt", "refused"]) || !isSignedIntentShape(stage.signed) || !verifySignedIntent(stage.signed) || stage.signed.intent.kind !== kind || stage.signed.intent.actor !== issue.actor || !sameOptional(stage.signed.intent.to, issue.repository.membership) || typeof stage.attempted !== "boolean") return false;
  if (stage.receipt && (!stage.attempted || !isReceipt(stage.receipt) || stage.receipt.definition !== pinOf(issue) || stage.receipt.intent !== intentDigest(stage.signed.intent) || !sameOptional(stage.receipt.fact.at, issue.repository.membership))) return false;
  if (stage.refused && (!stage.attempted || stage.receipt || !closed(stage.refused, ["answer", "reason", "judgedAt"], ["name"]) || stage.refused.answer !== "refused" || !Object.hasOwn(REFUSAL_REASONS, stage.refused.reason) || !isHead(stage.refused.judgedAt) || stage.refused.name !== undefined && typeof stage.refused.name !== "string")) return false;
  return true;
}
function issueValid(value: unknown): value is Issue {
  try {
    if (!closed(value, ["v", "operation", "input", "service", "repository", "actor", "secret", "ends"], ["member", "invitation", "link", "previous", "definition"])) return false;
    const row = value as unknown as Issue;
    if (row.definition !== undefined && !isAgentKeyMembership(row.definition)) return false;
    if (row.input?.kind === "checker-key" && !isCheckerKeyMembership(row.definition)) return false;
    if (row.input?.kind === "own-agent-key" && !answersVersionQuestion(row.definition, "cliOwnAgentInvitationMembership")) return false;

    if (row.v !== 1 || !uuid(row.operation) || !issuedInput(row.input) || typeof row.secret !== "string" || typeof row.ends !== "string" || timeMs(row.ends) === null || !isKeyId(row.actor) || !repositoryValid(row.repository) || typeof row.service !== "string") return false;
    if (row.previous && (!closed(row.previous, ["request", "digest"]) || typeof row.previous.request !== "string" || !/^i-[0-9a-f]{30}$/.test(row.previous.request) || !/^sha256:[0-9a-f]{64}$/.test(row.previous.digest))) return false;
    const secret = unb64url(row.secret);
    if (!secret || secret.length !== 32 || b64url(secret) !== row.secret) return false;
    const Url = (globalThis as { URL?: new (url: string) => { origin: string; protocol: string; username: string; password: string; search: string; hash: string } }).URL;
    if (!Url) return false;
    const origin = new Url(row.service);
    if (origin.origin !== row.service || !["https:", "http:"].includes(origin.protocol) || origin.username || origin.password || origin.search || origin.hash || row.input.controller && !sameOptional(row.input.controller.membership, row.repository.membership)) return false;
    if (row.member && (row.input.kind === "person" || !stageValid(row.member, row, openingKind(row.input)) || !sameOptional(row.member.signed.intent.fields, memberFields(row.input)))) return false;
    const invited = row.invitation;
    if (invited) {
      if (row.input.kind !== "person" && !row.member?.receipt) return false;
      const fields = row.input.kind === "person" ? { handle: row.input.handle, role: row.input.role, ...invitationIssueFields(pinOf(row), row.secret), inviteEnds: row.ends } : { member: row.member!.receipt!.fact.seq, kind: row.input.kind === "checker-key" ? "checker" : "agent", ...invitationIssueFields(pinOf(row), row.secret), inviteEnds: row.ends };
      if (!stageValid(invited, row, invitationKind(row.input)) || !sameOptional(invited.signed.intent.fields, fields)) return false;
    }
    if (row.link !== undefined) {
      if (typeof row.link !== "string" || !row.invitation?.receipt) return false;
      const { inbox: _inbox, ...repository } = row.repository;
      if (row.input.kind === "person") {
        const parsed = linkOf(row.link);
        if (!parsed || !sameOptional(parsed, { v: 1, service: row.service, repository, invitation: row.invitation.receipt.fact.seq, secret: row.secret, handle: row.input.handle, definition: pinOf(row) })) return false;
      } else {
        const parsed = row.input.kind === "checker-key" ? checkerKeyInvitationOf(row.link) : agentKeyInvitationOf(row.link);
        if (!parsed || parsed.kind !== (row.input.kind === "own-agent-key" ? "agent-key" : row.input.kind) || !row.member?.receipt || parsed.definition !== pinOf(row) || parsed.service !== row.service || !sameOptional(parsed.repository, repository) || parsed.handle !== row.input.handle || (agentIssue(row.input) && (parsed.kind !== "agent-key" || !sameOptional(parsed.controller, row.input.controller))) || !sameOptional(parsed.member, row.member.receipt.fact) || !sameOptional(parsed.invitation, row.invitation.receipt.fact) || parsed.secret !== row.secret) return false;
      }
    }
    return row.input.kind !== "person" || row.member === undefined;
  } catch { return false; }
}
function successor(before: Issue, after: Issue): boolean {
  const core = (row: Issue) => ({ v: row.v, operation: row.operation, input: row.input, service: row.service, repository: row.repository, actor: row.actor, secret: row.secret, ends: row.ends, definition: pinOf(row) });
  if (!sameOptional(core(before), core(after)) || before.link !== undefined && before.link !== after.link) return false;
  for (const name of ["member", "invitation"] as const) {
    const prior = before[name], next = after[name];
    if (!prior) { if (next && (next.attempted || next.receipt || next.refused)) return false; continue; }
    if (!next || !sameOptional(prior.signed, next.signed) || prior.attempted && !next.attempted || prior.receipt && !sameOptional(prior.receipt, next.receipt) || prior.refused && !sameOptional(prior.refused, next.refused)) return false;
  }
  return true;
}
async function snapshotChain(ctx: Context, config: Config, input: IssuedInput, actor: import("@generalbusiness/dap-contract").KeyId, options: InvitationIssueOptions): Promise<{ row: Issue; pointer: PendingInvitationIssue } | null> {
  if (!Array.isArray(options.privateRequests) || new Set(options.privateRequests).size !== options.privateRequests.length) throw blocked();
  const rows = new Map<string, { row: Issue; digest: import("@generalbusiness/dap-contract").Digest }>();
  for (const request of options.privateRequests) {
    if (!/^i-[0-9a-f]{30}$/.test(request)) throw blocked();
    const bytes = await wait(options, () => ctx.store.private(request));
    if (!bytes || bytes.length > 64 * 1024) throw blocked();
    const raw = new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(bytes), value = parseStrict(raw);
    if (!issueValid(value) || value.operation !== options.operation || value.actor !== actor || value.service !== config.service || !sameOptional(value.repository, config.repository) || !sameOptional(value.input, input)) throw blocked();
    rows.set(request, { row: value, digest: textDigest(raw) });
  }
  if (rows.size === 0) { if (config.invitationIssue) throw blocked(); return null; }
  const roots = [...rows].filter(([, entry]) => !entry.row.previous);
  if (roots.length !== 1 || roots[0]![1].row.member || roots[0]![1].row.invitation || roots[0]![1].row.link) throw blocked();
  const next = new Map<string, string>();
  for (const [request, entry] of rows) if (entry.row.previous) {
    const prior = rows.get(entry.row.previous.request);
    if (!prior || prior.digest !== entry.row.previous.digest || next.has(entry.row.previous.request) || !successor(prior.row, entry.row)) throw blocked();
    next.set(entry.row.previous.request, request);
  }
  let request = roots[0]![0]; const visited = new Set<string>();
  for (;;) { if (visited.has(request)) throw blocked(); visited.add(request); const following = next.get(request); if (!following) break; request = following; }
  if (visited.size !== rows.size) throw blocked();
  if (config.invitationIssue) {
    const current = rows.get(config.invitationIssue.request);
    if (!current || current.digest !== config.invitationIssue.digest || config.invitationIssue.operation !== options.operation || config.invitationIssue.actor !== actor || !sameOptional(config.invitationIssue.membership, config.repository!.membership)) throw blocked();
  } else if (options.mode !== "continue" || options.reservedRequest !== request || rows.size !== 1) throw blocked();
  const leaf = rows.get(request)!;
  return { row: leaf.row, pointer: { operation: options.operation, request, digest: leaf.digest, membership: leaf.row.repository.membership, actor: actor } };
}
async function followFact(M: ScopeHandle, fact: FactRef): Promise<Entry | null> {
  const read = await M.entry(fact.seq);
  return read.ok && read.complete && read.next === undefined && isEntryBodyOf(read.value.entry, fact) && read.value.hash === fact.hash && entryHash(read.value.entry) === fact.hash ? read.value.entry : null;
}
async function follow(M: ScopeHandle, signed: SignedIntent, receipt: Receipt, definition: AgentKeyMembership): Promise<Entry | null> {
  if (!isReceipt(receipt) || receipt.definition !== definition || receipt.intent !== intentDigest(signed.intent) || !sameOptional(receipt.fact.at, signed.intent.to)) return null;
  const read = await M.followReceipt(receipt);
  return read.ok && read.entry.input.type === "act" && sameOptional(read.entry.input.signed, signed) ? read.entry : null;
}
/**
 * Issuance's wait for a new member's inbox: one read, then at most 20 pauses of one second, until 20 seconds have passed. A person
 * waits on this in the page, so it stays short; the third S1 room's stop cleared within 11.4 seconds. `Context.tries` can only lower it.
 */
const INBOX_WAIT_MS = 20_000, INBOX_WAIT_READS = 21;
/**
 * One read of the inbox. M2 records an inbox create send, not member.refs.inbox (EM9). `pending`: this inbox is not active yet, and
 * can still turn active. It is provisional until its creator's confirmation arrives, and before its creation arrives a read answers
 * `not-found` from the deployed scope index, or `forbidden` from a scope with no index.
 */
async function inboxOfOpening(reads: InvitationReads, opening: Entry, membership: ScopeRef, owner: MemberRef): Promise<ScopeRef | { pending: ScopeId } | null> {
  const births = opening.sends.filter(send => "creator" in send.to && send.to.kind === "inbox");
  const birth = births.length === 1 ? births[0] : undefined;
  if (!birth || !("creator" in birth.to) || !answersVersionQuestion(birth.to.definition, "cliInvitationInboxDefinition") || !sameOptional(birth.to.creator, membership)) return null;
  const scope = scopeIdOf(birth.to), I = handle(reads, scope);
  const summaryRead = await I.summary();
  if (!summaryRead.ok && (summaryRead.reason === "not-found" || summaryRead.reason === "forbidden")) return { pending: scope };
  if (!summaryRead.ok || !summaryRead.complete || summaryRead.next !== undefined || !answersVersionQuestion(summaryRead.value.definition, "cliInvitationInboxDefinition") || summaryRead.value.scope.scope !== scope) return null;
  if (summaryRead.value.status === "provisional") return { pending: scope };
  if (summaryRead.value.status !== "active") return null;
  const birthRead = await I.entry(0);
  if (!birthRead.ok || !birthRead.complete || birthRead.next !== undefined) return null;
  const entry = birthRead.value.entry;
  if (entry.seq !== 0 || entry.input.type !== "genesis" || entry.input.decision !== "applied" || entry.input.kind !== "establish" || birthRead.value.hash !== summaryRead.value.scope.genesis || scopeIdOf(entry.input.seed) !== summaryRead.value.scope.scope || !sameOptional(entry.input.seed, birth.to) || !sameOptional(entry.input.source, { at: membership, seq: opening.seq, hash: entryHash(opening) }) || entry.input.n !== birth.n || entryHash(entry) !== birthRead.value.hash) return null;
  const inbox = summaryRead.value.items.find(item => item.type === "inbox" && item.state === "open");
  return inbox && sameOptional(inbox.parties["owner"], owner) && sameOptional(inbox.refs["membership"], membership) ? summaryRead.value.scope : null;
}
/** Reads until the inbox is active, within the bound. Check reads once and never pauses. The wait signs and submits no act and adds no snapshot to the retained chain. */
async function activeInbox(ctx: Context, options: InvitationIssueOptions, reads: InvitationReads, opening: Entry, membership: ScopeRef, owner: MemberRef): Promise<ScopeRef | null> {
  const started = now(ctx), limit = Math.min(ctx.tries ?? INBOX_WAIT_READS, INBOX_WAIT_READS);
  for (let read = 1; ; read++) {
    const inbox = await wait(options, () => inboxOfOpening(reads, opening, membership, owner));
    if (!inbox || !("pending" in inbox)) return inbox;
    if (options.mode === "check" || read >= limit || now(ctx) - started >= INBOX_WAIT_MS) return null;
    await (ctx.pause ?? (() => new Promise<void>(resolve => { setTimeout(resolve, 1000); })))([membership.scope, inbox.pending]);
  }
}
/** No output exposes a signing key. The optional link is a private invitation. */
export async function issueInvitation(ctx: Context, input: InvitationIssueInput, options: InvitationIssueOptions): Promise<InvitationIssueResult> {
  check(options);
  if (!isInvitationIssueInput(input)) throw blocked();
  const result = await issueRetainedInvitation(ctx, input, options);
  if (result.kind === "checker-key" || result.kind === "own-agent-key") throw blocked();
  return { ...result, kind: result.kind };
}
/** Checker issuance has its own closed input and tag. It cannot call person
 * invitation issuance or reinterpret an agent's controller-bound original. */
export async function issueCheckerInvitation(ctx: Context, input: CheckerInvitationIssueInput, options: InvitationIssueOptions): Promise<CheckerInvitationIssueResult> {
  check(options);
  if (!checkerIssueInput(input)) throw blocked();
  const result = await issueRetainedInvitation(ctx, { kind: "checker-key", handle: input.handle, hours: input.hours }, options);
  if (result.kind !== "checker-key") throw blocked();
  return { ...result, kind: "checker-key" };
}
/** M13's ordinary-member path uses the same exact-original custody engine. */
export async function issueOwnAgentInvitation(ctx: Context, input: OwnAgentInvitationIssueInput, options: InvitationIssueOptions): Promise<OwnAgentInvitationIssueResult> {
  check(options);
  if (!ownAgentIssueInput(input)) throw blocked();
  const result = await issueRetainedInvitation(ctx, { ...input, kind: "own-agent-key" }, options);
  if (result.kind !== "own-agent-key") throw blocked();
  return { ...result, kind: "own-agent-key" };
}
async function issueRetainedInvitation(ctx: Context, input: IssuedInput, options: InvitationIssueOptions): Promise<IssuedResult> {
  check(options);
  if (!uuid(options.operation) || !issuedInput(input)) throw blocked();
  let config = await wait(options, () => ctx.store.config());
  if (!config?.repository || config.claim || config.join || config.plan && !config.register) throw blocked();
  // Retain the old owned-copy/wipe lifetime for seed stores. Capability
  // stores never call secret(), including when their signer is missing.
  const seed = ctx.store.signer ? null : (await wait(options, () => ctx.store.secret(config!.key)))?.slice() ?? null;
  const key = ctx.store.signer ? await wait(options, () => ctx.store.signer!(config!.key)) : seed ? secretSigner(seed) : null;
  if (!key) { seed?.fill(0); throw blocked(); }
  try {
    const actor = key.key;
    let reads: InvitationReads | undefined, currentHandle: ScopeHandle | undefined;
    const membershipHandle = async (): Promise<ScopeHandle> => {
      if (!currentHandle) { reads = await wait(options, () => readerFor(ctx, config!.service, config!.repository!.membership, key, options.current)); currentHandle = handle(reads, config!.repository!.membership.scope); }
      return currentHandle;
    };
    let row: Issue;
    let pointer = config.invitationIssue;
    const chain = await snapshotChain(ctx, config, input, actor, options);
    if (chain) {
      if (options.mode === "new") throw blocked();
      row = chain.row;
      if (!sameOptional(pointer, chain.pointer)) {
        if (options.mode === "check") return { operation: row.operation, kind: row.input.kind, handle: row.input.handle, state: "unknown", reason: "A retained private successor awaits explicit Continue. Check restored no pointer and sent nothing." };
        const before = config;
        if (!sameOptional(await wait(options, () => ctx.store.config()), before)) throw blocked();
        pointer = chain.pointer; config = { ...before, invitationIssue: pointer };
        await wait(options, () => ctx.store.save(config!));
        if (!sameOptional(await wait(options, () => ctx.store.config()), config)) throw blocked();
      }
    } else {
      if (options.mode !== "new") throw blocked();
      // The membership's exact pin is read once and kept with the retained issuance: every later read and receipt is held to it.
      const pinned = await wait(options, async () => pinnedSummary(await membershipHandle(), config!.repository!.membership));
      if (input.kind === "checker-key" && !isCheckerKeyMembership(pinned.definition)) throw blocked();
      if (input.kind === "own-agent-key" && !answersVersionQuestion(pinned.definition, "cliOwnAgentInvitationMembership")) throw blocked();

      row = { v: 1, operation: options.operation, input: structuredClone(input), service: config.service, repository: structuredClone(config.repository), actor, secret: b64url(crypto.getRandomValues(new Uint8Array(32))), ends: timeOf(Math.floor(now(ctx) / 1000) * 1000 + input.hours * 3600_000), definition: pinned.definition };
    }
    const status = (state: InvitationIssueResult["state"], reason?: string): IssuedResult => ({ operation: row.operation, kind: row.input.kind, handle: row.input.handle, state, ...(reason ? { reason } : {}) });
    const persist = async (): Promise<void> => {
      if (!issueValid(row)) throw blocked();
      const before = await wait(options, () => ctx.store.config());
      if (!sameOptional(before, config)) throw blocked();
      if (pointer) row.previous = { request: pointer.request, digest: pointer.digest };
      const raw = canonicalize(row), request = privateName("i");
      await wait(options, () => ctx.store.keepPrivate(request, utf8(raw)));
      const bytes = await wait(options, () => ctx.store.private(request));
      if (!bytes || new TextDecoder().decode(bytes) !== raw) throw blocked();
      pointer = { operation: row.operation, request, digest: textDigest(raw), membership: row.repository.membership, actor };
      config = { ...config!, invitationIssue: pointer };
      await wait(options, () => ctx.store.save(config!));
      if (!sameOptional(await wait(options, () => ctx.store.config()), config)) throw blocked();
    };
    if (!pointer) await persist();
    const pin = pinOf(row);
    const shape = platform(pin)!.data as unknown as DefinitionShape;
    const prepare = async (kind: string, fields: Record<string, import("@generalbusiness/dap-contract").FieldValue>): Promise<Stage> => {
      const s = await wait(options, async () => summary(await membershipHandle(), row.repository.membership, pin));
      const member = s.items.find(i => i.type === "member" && i.state === "active" && i.values["handle"] === config!.handle);
      const activeKey = member && s.items.find(i => i.type === "key" && i.state === "active" && i.refs["member"] === member.id && i.values["id"] === actor);
      const roster = s.items.find(i => i.type === "roster" && i.state === "open");
      const role = member?.values["role"], actions = typeof role === "string" ? roster?.values[role + "Actions"] : null;
      if (!activeKey || !member || member.values["kind"] !== "person" || !Array.isArray(actions)) throw blocked();
      if (row.input.kind === "own-agent-key") {
        if (!answersVersionQuestion(pin, "cliOwnAgentInvitationMembership") || !actions.includes("membership.own-agent") || !sameOptional(row.input.controller, member.parties["member"])) throw blocked();
      } else if (!actions.includes("membership.invite") || row.input.kind !== "person" && (!actions.includes("membership.manage") || row.input.kind === "agent-key" && !sameOptional(row.input.controller, member.parties["member"]))) throw blocked();
      const signed = await wait(options, () => signedIntent(key, { to: row.repository.membership, kind, fields, expected: expectedOf(shape.acts[kind]!, s.items, null, fields) }, { now: now(ctx) }));
      return { signed, attempted: false };
    };
    const advance = async (stage: Stage): Promise<"verified" | "unknown" | "refused"> => {
      if (stage.refused) return "refused";
      if (options.mode === "check" || stage.receipt) {
        let settled: Awaited<ReturnType<ScopeHandle["settle"]>>;
        try { settled = await wait(options, async () => (await membershipHandle()).settle(stage.signed)); } catch (error) { if (error instanceof Stop) throw error; check(options); return "unknown"; }
        if (!settled.ok || stage.receipt && !sameOptional(settled.value, stage.receipt) || !await wait(options, async () => follow(await membershipHandle(), stage.signed, settled.value, pin))) return "unknown";
        if (!stage.attempted || !stage.receipt) { stage.attempted = true; stage.receipt = settled.value; await persist(); }
        return "verified";
      }
      // An already attempted stage is sent again unchanged and keeps no new snapshot, so a chain holds at most one snapshot for each
      // change of state: root, prepared, attempted and settled for each stage (seven for an agent key, four for a person).
      if (!stage.attempted) { stage.attempted = true; await persist(); }
      let answer: Answer;
      try { answer = await wait(options, async () => (await membershipHandle()).submit(stage.signed)); } catch (error) { if (error instanceof Stop) throw error; check(options); return "unknown"; }
      if (answer.answer === "refused") { stage.refused = answer; await persist(); return "refused"; }
      if (answer.answer !== "accepted") return "unknown";
      if (!await wait(options, async () => follow(await membershipHandle(), stage.signed, answer.receipt, pin))) return "unknown";
      stage.receipt = answer.receipt; await persist(); return "verified";
    };
    if (row.input.kind !== "person") {
      if (!row.member) {
        if (options.mode === "check") return status("prepared", `Continue explicitly to prepare the original ${row.input.kind === "checker-key" ? "checker" : "agent"} opening.`);
        row.member = await prepare(openingKind(row.input), memberFields(row.input)); await persist();
      }
      const result = await advance(row.member);
      if (result !== "verified") return status(result, result === "refused" ? `Native refusal: ${row.member.refused!.reason}${row.member.refused!.name ? " (" + row.member.refused!.name + ")" : ""}. The original ${row.input.kind === "checker-key" ? "checker" : "agent"} opening is retained.` : `The original ${row.input.kind === "checker-key" ? "checker" : "agent"} opening is retained.`);
    }
    if (!row.invitation) {
      if (options.mode === "check") return status("prepared", "Continue explicitly to prepare the original invitation.");
      const fields = row.input.kind === "person" ? { handle: row.input.handle, role: row.input.role!, ...invitationIssueFields(pinOf(row), row.secret), inviteEnds: row.ends } : { member: row.member!.receipt!.fact.seq, kind: row.input.kind === "checker-key" ? "checker" : "agent", ...invitationIssueFields(pinOf(row), row.secret), inviteEnds: row.ends };
      row.invitation = await prepare(invitationKind(row.input), fields); await persist();
    }
    const result = await advance(row.invitation);
    if (result !== "verified") return status(result, result === "refused" ? `Native refusal: ${row.invitation.refused!.reason}${row.invitation.refused!.name ? " (" + row.invitation.refused!.name + ")" : ""}. The original invitation is retained.` : "The original invitation is retained.");
    const receipt = row.invitation.receipt!, s = await wait(options, async () => summary(await membershipHandle(), row.repository.membership, pin));
    const invited = s.items.find(i => i.id === receipt.fact.seq && i.type === (row.input.kind === "person" ? "member" : "key"));
    if (!invited || invited.state !== "invited" || Object.entries(invitationIssueFields(pin, row.secret)).some(([name, value]) => invited.values[name] !== value) || invited.values["inviteEnds"] !== row.ends) return status("unknown", "The current native invitation could not be verified.");
    const observedRepository = await wait(options, () => boundDirectory(reads!, row.repository, s, pin));
    if (!observedRepository) return status("unknown", "The native directory and repository siblings could not be verified.");
    const repository = observedRepository;
    let link: string;
    if (row.input.kind === "person") {
      if (invited.values["kind"] !== "person" || invited.values["handle"] !== row.input.handle || invited.values["role"] !== row.input.role) return status("unknown");
      const person: Link = { v: 1, service: row.service, repository, invitation: receipt.fact.seq, secret: row.secret, handle: row.input.handle, definition: pin };
      link = LINK + b64url(utf8(JSON.stringify(person)));
    } else {
      const member = s.items.find(i => i.type === "member" && i.id === row.member!.receipt!.fact.seq), roster = s.items.find(i => i.type === "roster" && i.state === "open");
      const nativeKind = row.input.kind === "checker-key" ? "checker" : "agent";
      const controller = agentIssue(row.input) ? s.items.find(item => item.type === "member" && item.state === "active" && item.values["kind"] === "person" && sameOptional(item.parties["member"], row.input.controller)) : null;
      const identity = agentIssue(row.input)
        ? controller && s.items.some(item => item.type === "key" && item.state === "active" && item.refs["member"] === controller.id) && sameOptional(member?.parties["controller"], row.input.controller)
        : member && member.parties["controller"] === null;
      if (!identity || !member || member.state !== "active" || member.values["kind"] !== nativeKind || member.values["role"] !== nativeKind || member.values["handle"] !== row.input.handle || invited.values["kind"] !== nativeKind || invited.refs["member"] !== member.id || !isMemberRef(member.parties["member"]) || !roster) return status("unknown");
      const owner = member.parties["member"];
      const opening = await wait(options, async () => follow(await membershipHandle(), row.member!.signed, row.member!.receipt!, pin));
      if (!opening || !await activeInbox(ctx, options, reads!, opening, row.repository.membership, owner)) return status("unknown", `The native ${nativeKind} inbox creation could not be verified.`);
      const handoff = { v: 1 as const, service: row.service, repository, definition: pin, handle: row.input.handle, member: row.member!.receipt!.fact, invitation: receipt.fact, secret: row.secret, expected: { on: roster.revision, member: member.revision } };
      if (row.input.kind === "checker-key") {
        if (!isCheckerKeyMembership(pin)) throw blocked();
        link = encodeCheckerKeyInvitation({ ...handoff, kind: "checker-key", definition: pin });
      } else link = encodeAgentKeyInvitation({ ...handoff, kind: "agent-key", controller: row.input.controller! });
    }
    if (!row.link) { row.link = link; await persist(); }
    return { ...status("verified"), link: row.link };
  } finally { seed?.fill(0); }
}

/** Separate receiver; a tagged key invitation never runs native person join. */
export function enrolAgentKey(ctx: Context, text: string, options: { mode?: "continue" | "check" } = {}): Promise<Outcome> {
  return enrolKey(ctx, text, options, "agent");
}
export function enrolCheckerKey(ctx: Context, text: string, options: { mode?: "continue" | "check" } = {}): Promise<Outcome> {
  return enrolKey(ctx, text, options, "checker");
}
/** A new key of an existing member. Its link names no member fact, so the receiver reads the member from the invitation's entry. */
export function enrolDeviceKey(ctx: Context, text: string, options: { mode?: "continue" | "check" } = {}): Promise<Outcome> {
  return enrolKey(ctx, text, options, "device");
}
/**
 * The inbox of an existing member. No entry sets a member's reference to its inbox (EM9): `seat` and `add-member` create it at the
 * member's entry, and a person's `join` creates it at that key's entry. The inbox's own birth and owner are then checked.
 */
async function inboxOfMember(reads: InvitationReads, M: ScopeHandle, s: Summary, member: Summary["items"][number], membership: ScopeRef, owner: MemberRef): Promise<ScopeRef | null> {
  for (const seq of [member.id, ...s.items.filter(item => item.type === "key" && item.refs["member"] === member.id).map(item => item.id)]) {
    const read = await M.entry(seq);
    if (!read.ok || !read.complete || read.next !== undefined || entryHash(read.value.entry) !== read.value.hash) return null;
    if (!read.value.entry.sends.some(send => "creator" in send.to && send.to.kind === "inbox")) continue;
    const inbox = await inboxOfOpening(reads, read.value.entry, membership, owner);
    return inbox && !("pending" in inbox) ? inbox : null;
  }
  return null;
}
/** The recorded facts of a device key after its `enrol`: the invitation's entry, the member and handle it names, this key, the directory's siblings and the member's inbox. */
async function deviceBindings(reads: InvitationReads, M: ScopeHandle, link: DeviceKeyInvitation, pin: AgentKeyMembership, s: Summary, own: string): Promise<Repository | null> {
  const invitation = await followFact(M, link.invitation);
  if (!invitation || invitation.input.type !== "act") return null;
  const invited = invitation.input.signed.intent;
  if (invited.kind !== "invite-key" || !sameOptional(invited.fields, { member: invited.fields["member"], kind: "device", ...invitationIssueFields(pin, link.secret), inviteEnds: invited.fields["inviteEnds"] })) return null;
  const member = s.items.find(item => item.type === "member" && item.id === invited.fields["member"]), key = s.items.find(item => item.type === "key" && item.id === link.invitation.seq);
  const owner = member?.parties["member"];
  if (!member || member.state !== "active" || member.values["handle"] !== link.handle || !isMemberRef(owner) || !key || key.state !== "active" || key.values["kind"] !== "device" || key.values["id"] !== own || key.refs["member"] !== member.id) return null;
  const observed = await boundDirectory(reads, link.repository, s, pin);
  const inbox = observed && await inboxOfMember(reads, M, s, member, link.repository.membership, owner);
  return observed && inbox ? { ...observed, inbox: inbox.scope } : null;
}
async function enrolKey(ctx: Context, text: string, options: { mode?: "continue" | "check" }, nativeKind: "agent" | "checker" | "device"): Promise<Outcome> {
  const checker = nativeKind === "checker", device = nativeKind === "device", retainedKind = device ? "device-enrol" : checker ? "checker-enrol" : "enrol", title = device ? "Device" : checker ? "Checker" : "Agent";
  // A definite refusal keeps its original, so the next link needs a config directory of its own.
  const afterRefusal = device ? " Make a new device link, and run dap join with it in an empty config directory." : "";
  // This receiver retains a raw-key/envelope pair in filesystem custody.
  // Capability stores require a separate supported receiver; never bypass
  // their signing namespace by reading or creating a seed here.
  if (ctx.store.signer) return { code: 1, lines: [`${title}-key enrollment in this command requires filesystem key custody. No signing key was read or created and nothing was submitted.`] };
  const bad = (): Outcome => ({ code: 1, lines: [`The original ${nativeKind} enrollment is unavailable or unverified. Nothing was replaced.${device ? " If an answer was lost, run the same command with --check." : ""}`] });
  try {
    const link = device ? deviceKeyInvitationOf(text) : checker ? checkerKeyInvitationOf(text) : agentKeyInvitationOf(text);
    // A device link's codec admits every invitation membership. This receiver verifies only the pins with a known directory pair.
    if (!link || !isAgentKeyMembership(link.definition)) return bad();
    const pin: AgentKeyMembership = link.definition;
    let config = await ctx.store.config();
    let heldConfig = config;
    const save = async (next: Config): Promise<void> => {
      if (!sameOptional(await ctx.store.config(), heldConfig)) throw blocked();
      await ctx.store.save(next);
      if (!sameOptional(await ctx.store.config(), next)) throw blocked();
      heldConfig = next;
    };
    const digest = textDigest(canonicalize(link)), pending = config?.join;
    if (device && config && !pending) return usage(config.repository ? `This config directory has a repository already: directory ${config.repository.directory.scope}.` : "This config directory is set up already; use another config directory to join.");
    if (pending && (pending.kind !== retainedKind || pending.link !== digest || config!.service !== link.service || !sameOptional(pending.repository, link.repository) || pending.handle !== link.handle) || config && !pending) {
      if (!device || !pending) return bad();
      // A person who brings a new link to a used directory needs to know why it stops, and where the link goes next.
      const holds = pending.refused ? `a failed attempt: an earlier link was refused with ${pending.refused.reason}` : "an attempt with another link. To finish that attempt, run that link with --check";
      return { code: 1, lines: [`This config directory holds ${holds}. This run sent nothing. A new link needs an empty config directory.`] };
    }
    if (pending?.refused) return { code: 1, lines: [`The original ${nativeKind} enrollment was refused: ${pending.refused.reason}. Nothing was replaced.${afterRefusal}`] };
    if (options.mode === "check" && !pending) return bad();
    let own: Uint8Array | null = null;
    const tag = digest.slice("sha256:".length, "sha256:".length + 30), keyName = "k-" + tag, requestName = "a-" + tag;
    let originalBytes: Uint8Array | null = null, freshKey = false;
    if (pending) own = await ctx.store.secret(config!.key);
    else {
      own = await ctx.store.secret(keyName);
      originalBytes = await ctx.store.private(requestName);
      // A surviving key without its original envelope is not proof of no
      // dispatch. Never manufacture a replacement signature from absence.
      if (own && !originalBytes || originalBytes && !own) return bad();
      if (!own) {
        own = crypto.getRandomValues(new Uint8Array(32)); freshKey = true;
        await ctx.store.keep(keyName, own);
        const readback = await ctx.store.secret(keyName);
        if (!readback || !sameOptional([...readback], [...own])) { own.fill(0); return bad(); }
      }
      config = { v: 2, service: link.service, key: keyName };
    }
    if (!own || own.length !== 32) return bad();
    const key = own.slice();
    // Fresh raw key is no longer needed after its owned snapshot/store readback.
    if (freshKey) own.fill(0);
    try {
      let signed: SignedIntent;
      const readEnvelope = (bytes: Uint8Array, legacy: boolean): SignedIntent | null => {
        if (bytes.length > 32 * 1024) return null;
        const value = parseStrict(new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(bytes));
        if (closed(value, ["v", "link", "signed"]) && value["v"] === 1 && value["link"] === digest && isSignedIntentShape(value["signed"])) return value["signed"];
        return legacy && isSignedIntentShape(value) ? value : null;
      };
      if (pending) {
        const bytes = await ctx.store.private(pending.request);
        const kept = bytes && readEnvelope(bytes, true);
        if (!kept) return bad(); signed = kept;
      } else {
        if (originalBytes) {
          const kept = readEnvelope(originalBytes, false);
          if (!kept) return bad(); signed = kept;
        } else {
          signed = await signedIntent(secretSigner(key), { to: link.repository.membership, kind: "enrol", on: 0, fields: invitationRedemptionFields(link.definition, link.repository.membership, link.invitation.seq, keyIdOfSecret(key), link.secret), expected: link.expected }, { now: now(ctx) });
          const raw = canonicalize({ v: 1, link: digest, signed });
          await ctx.store.keepPrivate(requestName, utf8(raw));
          const readback = await ctx.store.private(requestName);
          if (!readback || new TextDecoder().decode(readback) !== raw) return bad();
        }
        config = { ...config!, join: { kind: retainedKind, request: requestName, intent: intentDigest(signed.intent), link: digest, repository: link.repository, handle: link.handle } };
        // Validate the original before restoring its public pointer.
        if (!verifySignedIntent(signed) || signed.intent.actor !== keyIdOfSecret(key) || signed.intent.kind !== "enrol" || signed.intent.on !== 0 || !sameOptional(signed.intent.to, link.repository.membership) || !sameOptional(signed.intent.fields, invitationRedemptionFields(link.definition, link.repository.membership, link.invitation.seq, keyIdOfSecret(key), link.secret)) || !sameOptional(signed.intent.expected, link.expected)) return bad();
        await save(config);
      }
      if (!verifySignedIntent(signed) || signed.intent.actor !== keyIdOfSecret(key) || signed.intent.kind !== "enrol" || signed.intent.on !== 0 || !sameOptional(signed.intent.to, link.repository.membership) || !sameOptional(signed.intent.fields, invitationRedemptionFields(link.definition, link.repository.membership, link.invitation.seq, keyIdOfSecret(key), link.secret)) || !sameOptional(signed.intent.expected, link.expected) || intentDigest(signed.intent) !== config!.join!.intent) return bad();
      let M = new ScopeHandle(httpTransport(link.service, ctx.fetch ? { fetch: ctx.fetch } : {}), link.repository.membership.scope);
      if (!sameOptional(await ctx.store.config(), heldConfig)) return bad();
      let receipt: Receipt;
      if (options.mode === "check" || config!.join!.accepted) {
        const settled = await M.settle(signed);
        if (!settled.ok || config!.join!.accepted && !sameOptional(settled.value.fact, config!.join!.accepted)) return bad();
        receipt = settled.value;
      } else {
        const answer = await M.submit(signed);
        if (answer.answer === "refused") {
          config = { ...config!, join: { ...config!.join!, refused: answer } };
          await save(config);
          if (!sameOptional(await ctx.store.config(), config)) return bad();
          return { code: 1, lines: [`${title} enrollment refused: ${answer.reason}. The exact original remains retained.${afterRefusal}`] };
        }
        if (answer.answer !== "accepted") return { code: 1, lines: [`The original ${nativeKind} enrollment remains unknown. Check it or Continue explicitly.`] };
        receipt = answer.receipt;
      }
      const reads = await readerFor(ctx, link.service, link.repository.membership, key);
      M = handle(reads, link.repository.membership.scope);
      // The exact pin: the receipt names the membership's definition; an invitation issued under another is not verified, and
      // the original enrolment stays retained.
      if (isReceipt(receipt) && receipt.definition !== link.definition) return { code: 1, lines: [`The invitation names ${link.definition}, and the membership's receipt names ${receipt.definition}. The exact original enrolment is retained unverified; nothing was replaced.`] };
      if (!await follow(M, signed, receipt, link.definition)) return bad();
      config = { ...config!, join: { ...config!.join!, accepted: receipt.fact } }; await save(config);
      if (!sameOptional(await ctx.store.config(), config)) return bad();
      if (link.kind === "device-key") {
        const bound = await deviceBindings(reads, M, link, pin, await summary(M, link.repository.membership, pin), keyIdOfSecret(key));
        if (!bound) return bad();
        // The usable connection replaces the pending enrollment, as a person's join does. The private original stays in its file.
        const { join: _enrolled, ...enrolled } = config!;
        config = { ...enrolled, repository: bound, handle: link.handle };
        await save(config);
        if (!sameOptional(await ctx.store.config(), config)) return bad();
        return { code: 0, lines: [`Joined as ${link.handle} on key ${keyIdOfSecret(key)}, a new device key of this member.`, `Your inbox: ${bound.inbox}.`] };
      }
      const memberEntry = await followFact(M, link.member);
      const invitationEntry = await followFact(M, link.invitation);
      const s = await summary(M, link.repository.membership, link.definition);
      if (!memberEntry || !invitationEntry || memberEntry.input.type !== "act" || invitationEntry.input.type !== "act") return bad();
      const opened = memberEntry.input.signed.intent, invited = invitationEntry.input.signed.intent;
      const openingFields = link.kind === "agent-key" ? { handle: link.handle, kind: "agent", controller: link.controller } : { handle: link.handle, kind: "checker" };
      const ownAgent = link.kind === "agent-key" && answersVersionQuestion(link.definition, "cliOwnAgentInvitationMembership");
      const openingKind = opened.kind === "add-member" || ownAgent && opened.kind === "add-own-agent";
      const invitationKind = invited.kind === "invite-key" || ownAgent && invited.kind === "invite-own-agent-key";
      if (!openingKind || !sameOptional(opened.fields, openingFields) || !invitationKind || !sameOptional(invited.fields, { member: link.member.seq, kind: nativeKind, ...invitationIssueFields(link.definition, link.secret), inviteEnds: invited.fields["inviteEnds"] })) return bad();
      const member = s.items.find(i => i.type === "member" && i.id === link.member.seq), activeKey = s.items.find(i => i.type === "key" && i.id === link.invitation.seq);
      const controller = link.kind === "agent-key" ? s.items.find(item => item.type === "member" && item.state === "active" && item.values["kind"] === "person" && sameOptional(item.parties["member"], link.controller)) : null;
      const identity = link.kind === "agent-key"
        ? controller && s.items.some(item => item.type === "key" && item.state === "active" && item.refs["member"] === controller.id) && sameOptional(member?.parties["controller"], link.controller)
        : member && member.parties["controller"] === null;
      if (!identity || !member || member.state !== "active" || member.values["handle"] !== link.handle || member.values["kind"] !== nativeKind || member.values["role"] !== nativeKind || !activeKey || activeKey.state !== "active" || activeKey.values["kind"] !== nativeKind || activeKey.values["id"] !== keyIdOfSecret(key) || activeKey.refs["member"] !== member.id || !isMemberRef(member.parties["member"])) return bad();
      const observed = await boundDirectory(reads, link.repository, s, link.definition);
      if (!observed) return bad();
      const inbox = await inboxOfOpening(reads, memberEntry, link.repository.membership, member.parties["member"]);
      // Issuance read this inbox as active before it wrote the link, and an inbox never returns to provisional, so a receiver does not wait.
      if (!inbox || "pending" in inbox) return bad();
      config = { ...config!, repository: { ...observed, inbox: inbox.scope }, handle: link.handle };
      await save(config);
      if (!sameOptional(await ctx.store.config(), config)) return bad();
      return { code: 0, lines: [checker ? `Enrolled independent checker ${link.handle}. Native checker bindings verified.` : `Enrolled independent agent ${link.handle}. Native agent and controller bindings verified.`] };
    } finally { key.fill(0); }
  } catch (error) { return error instanceof Stop ? error.outcome : bad(); }
}

/** The retained person issuance a configuration points at: its private snapshots, root first, its input and its operation. */
async function retainedIssue(ctx: Context, pointer: PendingInvitationIssue): Promise<{ names: string[]; input: IssuedInput; operation: string } | null> {
  const names: string[] = [];
  let request: string | undefined = pointer.request, input: IssuedInput | null = null;
  while (request !== undefined) {
    // Sixteen is more than the seven snapshots the engine writes for the longest issuance, so a lawful chain is always readable.
    if (names.includes(request) || names.length >= 16) return null;
    const bytes = await ctx.store.private(request);
    if (!bytes) return null;
    const value = parseStrict(new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(bytes));
    if (!issueValid(value) || value.operation !== pointer.operation) return null;
    input ??= value.input;
    names.unshift(request);
    request = value.previous?.request;
  }
  return input ? { names, input, operation: pointer.operation } : null;
}

/**
 * `dap invite <@member> --role <role> --keep`: a person invitation through the retained issuance of `issueInvitation`, which
 * keeps the secret and the exact signed request before anything is sent and reads the membership's own pin, so the link is
 * tagged with the membership's definition. One retained invitation at a time: `dap invite --check` reads its outcome and
 * sends nothing; `dap invite --continue` resumes the exact original. A finished one (verified or refused) is released, and its
 * link is printed once, as `dap invite` prints it. An unknown one blocks a new one, so a lost answer is never replaced.
 */
export async function invitePerson(ctx: Context, member: string | undefined, options: { role?: string; hours?: number; mode: "new" | "check" | "continue" }): Promise<Outcome> {
  const say = (code: Outcome["code"], ...lines: string[]): Outcome => ({ code, lines });
  const finish = async (result: InvitationIssueResult): Promise<Outcome> => {
    if (result.state === "verified" || result.state === "refused") {
      const { invitationIssue: _finished, ...released } = (await ctx.store.config())!;
      await ctx.store.save(released);
    }
    if (result.state === "verified") return say(0, `Invited ${result.handle}: the invitation is recorded and verified.`, `Link for ${result.handle} only (it holds the invitation's secret): ${result.link}`);
    if (result.state === "refused") return say(1, `The invitation of ${result.handle} was refused. ${result.reason ?? ""}`.trim());
    return say(1, `The invitation of ${result.handle} is ${result.state}. ${result.state === "unknown" ? "The act may still take effect. " : ""}${result.reason ?? ""} Run dap invite --check, or dap invite --continue to resume the exact original.`.replace(/\s+/g, " ").trim());
  };
  try {
    const config = await ctx.store.config();
    if (!config?.repository) return say(2, "No repository is known here. Run: dap create <name>.");
    const retained = config.invitationIssue ? await retainedIssue(ctx, config.invitationIssue) : null;
    if (config.invitationIssue && !retained) return say(1, "The retained invitation's private record is unavailable. This command signed and sent nothing, and it cannot say whether an earlier send of that invitation went. Restore the record; do not issue the invitation again.");
    if (retained?.input.kind === "checker-key") return say(1, "A checker invitation is retained. Resume it through issueCheckerInvitation. This command signed and sent nothing, and an earlier send of that invitation can have gone.");
    if (retained?.input.kind === "own-agent-key") return say(1, "An own-agent invitation is retained. Resume its original connection. This command signed and sent nothing.");
    if (options.mode !== "new") {
      if (!retained) return say(2, "No invitation is retained here.");
      return await finish(await issueInvitation(ctx, retained.input, { privateRequests: retained.names, mode: options.mode, operation: retained.operation }));
    }
    if (retained) return say(1, `An invitation of ${retained.input.handle} is retained. Run dap invite --check, or dap invite --continue. Nothing new was signed.`);
    if (!member) return say(2, "Name a member's handle.");
    const input: InvitationIssueInput = { kind: "person", handle: member, hours: options.hours ?? 24, ...(options.role ? { role: options.role as "member" } : {}) };
    if (!isInvitationIssueInput(input)) return say(2, "Name a handle and a role with --role: one of member, maintainer, admin.");
    return await finish(await issueInvitation(ctx, input, { privateRequests: [], mode: "new", operation: crypto.randomUUID() }));
  } catch (e) {
    const held = (await ctx.store.config().catch(() => null))?.invitationIssue !== undefined;
    return say(1, `${e instanceof Error ? e.message : "The invitation could not be completed."}${held ? " The original invitation is retained: run dap invite --check, or dap invite --continue." : " Nothing was replaced."}`);
  }
}
