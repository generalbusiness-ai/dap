/** Explicit S1 identity steps over the maintained CLI request engines. */
import { lstatSync, readdirSync } from "node:fs";
import { isAbsolute, join, parse, resolve } from "node:path";
import { canonicalize, isDigest, isRecord, isScopeRef, parseStrict, same, textDigest, utf8 } from "@generalbusiness/dap-bytes";
import { agentKeyInvitationOf, checkerKeyInvitationOf } from "@generalbusiness/dap-client";
import type { KeyId, MemberRef, ScopeRef } from "@generalbusiness/dap-contract";
import { isHandle } from "@generalbusiness/dap-platform";
import { claim, checkClaim, enrolAgentKey, enrolCheckerKey, issueCheckerInvitation, issueInvitation } from "@generalbusiness/dap-cli";
import type { Config, Context, Outcome, PendingClaim, PendingInvitationIssue, Store } from "@generalbusiness/dap-cli";
import { nodeGit } from "../../packages/cli/src/git.ts";
import { newStoredSigner, storedSigner } from "../../packages/cli/src/store-signer.ts";
import { durableCliStore } from "./custody.ts";

export type IdentityMode = "new" | "check" | "continue";
export type EnrollmentKind = "agent" | "checker";
export interface OwnerInput { service: string; register: ScopeRef; handle: string }
interface OwnerBinding extends OwnerInput { v: 1; key: "operator" }
interface IdentityPlan {
  v: 1; operation: string; kind: EnrollmentKind; handle: string; receiverHome: string;
  service: string; repository: NonNullable<Config["repository"]>; actor: KeyId;
  controller: MemberRef | null; hours: 1;
}
interface Handoff { v: 1; plan: string; link: string; pointer: PendingInvitationIssue }
interface PrivatePointer { request: string; digest: ReturnType<typeof textDigest> }
const LIMIT = 16, MAX_PRIVATE_BYTES = 64 * 1024;
const OWNER_INPUT = "s1-owner-input", OWNER_KEY = "s1-owner-key";
const ROOM = "s1-room", COMPLETE = "s1-room-complete";
const PLAN = "s1-identity", HANDOFF = "s1-handoff", STARTED = "s1-receiver-started";

export class IdentityRefusal extends Error {
  constructor(readonly reason: string) { super(`Repo-in-ai identity stopped: ${reason}`); }
}
const refuse = (reason: string): never => { throw new IdentityRefusal(reason); };
const modeOf = (mode: IdentityMode) => {
  if (!["new", "check", "continue"].includes(mode)) refuse("invalid-mode");
};
const closed = (value: unknown, names: readonly string[]): value is Record<string, unknown> =>
  isRecord(value) && Object.keys(value).length === names.length && names.every(name => Object.hasOwn(value, name));
const identifier = (name: string) => {
  if (!/^[a-z][a-z0-9-]{0,31}$/.test(name)) refuse("invalid-private-name");
};

function privateHome(home: string, fresh: boolean): void {
  if (!isAbsolute(home) || resolve(home) !== home || home === parse(home).root) refuse("invalid-home");
  let current = parse(home).root, info;
  for (const part of home.slice(current.length).split("/").filter(Boolean)) {
    current = join(current, part);
    try { info = lstatSync(current); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT" || !fresh) refuse("home-unavailable");
      return;
    }
    if (!info.isDirectory() || info.isSymbolicLink()) refuse("linked-or-nondirectory-home");
  }
  if (!info || info.uid !== process.getuid!() || (info.mode & 0o077) !== 0) refuse("home-not-owner-only");
  if (fresh && readdirSync(home).length !== 0) refuse("occupied-new-home");
}
function storeAt(home: string): Store {
  return durableCliStore(home);
}
async function readPrivate(store: Store, name: string): Promise<unknown | null> {
  identifier(name);
  const bytes = await store.private(name);
  if (bytes === null) return null;
  if (bytes.length > MAX_PRIVATE_BYTES) return refuse("private-record-bound");
  return decodePrivate(bytes);
}
function decodePrivate(bytes: Uint8Array): unknown {
  try { return parseStrict(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
  catch { return refuse("private-record-invalid"); }
}
async function keep(store: Store, name: string, value: unknown): Promise<void> {
  identifier(name);
  const raw = canonicalize(value), bytes = utf8(raw);
  if (bytes.length > MAX_PRIVATE_BYTES) refuse("private-record-bound");
  const previous = await store.private(name);
  if (previous === null) await store.keepPrivate(name, bytes);
  else if (new TextDecoder("utf-8", { fatal: true }).decode(previous) !== raw) refuse("private-record-changed");
  const held = await store.private(name);
  if (held === null || new TextDecoder("utf-8", { fatal: true }).decode(held) !== raw) refuse("private-readback");
}
const pointerName = (prefix: string, n: number) => `${prefix}-${String(n).padStart(2, "0")}`;
async function journal(store: Store, prefix: string): Promise<PrivatePointer[]> {
  const rows: PrivatePointer[] = []; let gap = false;
  for (let n = 0; n < LIMIT; n++) {
    const value = await readPrivate(store, pointerName(prefix, n));
    if (value === null) { gap = true; continue; }
    if (gap || !closed(value, ["request", "digest"]) || typeof value["request"] !== "string" || !isDigest(value["digest"])) return refuse("private-journal-invalid");
    identifier(value["request"]); rows.push(value as unknown as PrivatePointer);
  }
  return rows;
}
async function appendPointer(store: Store, prefix: string, pointer: PrivatePointer): Promise<void> {
  const rows = await journal(store, prefix);
  if (rows.length && same(rows.at(-1), pointer)) return;
  if (rows.length >= LIMIT) refuse("private-journal-bound");
  await keep(store, pointerName(prefix, rows.length), pointer);
}
async function pointed(store: Store, pointer: PrivatePointer): Promise<Record<string, unknown>> {
  identifier(pointer.request);
  const bytes = await store.private(pointer.request);
  if (bytes === null || bytes.length > MAX_PRIVATE_BYTES) return refuse("private-original-missing");
  const raw = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  if (textDigest(raw) !== pointer.digest) refuse("private-original-digest");
  const value = decodePrivate(bytes);
  if (!isRecord(value)) return refuse("private-original-invalid");
  return value;
}

/** Reads at most sixteen exact originals and returns the engine's root-first
 * order. It authenticates local custody, not native admission or authority. */
export async function retainedInvitationRequests(store: Store, pointer: Pick<PendingInvitationIssue, "operation" | "request" | "digest">): Promise<string[]> {
  const names: string[] = []; let current: PrivatePointer | null = pointer;
  while (current !== null) {
    if (!/^i-[0-9a-f]{30}$/.test(current.request) || names.includes(current.request) || names.length >= LIMIT) refuse("invitation-chain-bound");
    const row = await pointed(store, current);
    if (row["operation"] !== pointer.operation) refuse("invitation-operation-changed");
    names.unshift(current.request);
    const previous = row["previous"];
    if (previous === undefined) current = null;
    else {
      if (!closed(previous, ["request", "digest"]) || typeof previous["request"] !== "string" || !isDigest(previous["digest"])) refuse("invitation-chain-invalid");
      current = previous as unknown as PrivatePointer;
    }
  }
  return names;
}

/** Create only the explicitly new owner. Recovery uses its existing signer. */
export async function initializeOwner(home: string, input: OwnerInput, mode: IdentityMode): Promise<Context> {
  modeOf(mode); privateHome(home, mode === "new");
  let service: URL;
  try { service = new URL(input.service); } catch { return refuse("owner-input-invalid"); }
  if (service.protocol !== "https:" || service.origin !== input.service || !isScopeRef(input.register) || input.register.kind !== "register" || !isHandle(input.handle)) refuse("owner-input-invalid");
  const store = storeAt(home), expected: OwnerBinding = { v: 1, key: "operator", service: input.service, register: input.register, handle: input.handle };
  if (mode === "new") await keep(store, OWNER_INPUT, expected);
  else if (!same(await readPrivate(store, OWNER_INPUT), expected)) refuse("owner-input-changed");
  let signer = await storedSigner(store, "operator");
  if (mode === "new") {
    if (signer) refuse("owner-key-already-exists");
    signer = await newStoredSigner(store, "operator");
  }
  if (!signer) return refuse("original-owner-key-missing");
  const identity = { v: 1, input: textDigest(canonicalize(expected)), key: signer.key };
  const originalKey = await readPrivate(store, OWNER_KEY);
  if (mode === "check") {
    if (!same(originalKey, identity)) refuse("owner-bootstrap-incomplete");
  } else await keep(store, OWNER_KEY, identity);
  let config = await store.config();
  if (config === null) {
    if (mode === "check") return refuse("owner-config-not-published");
    config = { v: 1, service: input.service, register: input.register, key: "operator", handle: input.handle };
    await store.save(config);
  }
  if (config.service !== input.service || config.key !== "operator" || config.handle !== input.handle || !same(config.register, input.register)) refuse("owner-config-changed");
  return { store, git: nodeGit() };
}

/** Snapshot every claim-bearing Config before the CLI can save or dispatch.
 * A completed claim is archived before the engine clears its Config pointer. */
function claimStore(base: Store, identity: unknown, initial: Config): Store {
  let view = initial;
  return { ...base, config: async () => structuredClone(view), save: async next => {
    if (next.claim) {
      const value = { v: 1, identity, claim: next.claim };
      const digest = textDigest(canonicalize(value)), request = `s1-c-${digest.slice(7, 31)}`;
      await appendPointer(base, "s1-claim", { request, digest });
      await keep(base, request, value);
    } else if (view.claim) {
      if (!next.repository) refuse("claim-cleared-without-room");
      await keep(base, COMPLETE, { v: 1, identity, claim: view.claim, repository: next.repository });
    }
    await base.save(next); view = structuredClone(next);
  } };
}
export async function createRoom(ctx: Context, name: string, mode: IdentityMode): Promise<Outcome> {
  modeOf(mode);
  const config = await ctx.store.config(), signer = config && await storedSigner(ctx.store, config.key);
  if (!config?.register || !config.handle || !signer || !/^[a-z][a-z0-9-]{0,47}$/.test(name)) return refuse("room-input-invalid");
  const identity = { name, service: config.service, register: config.register, handle: config.handle, actor: signer.key };
  if (mode === "new") {
    if (config.claim || config.repository || await readPrivate(ctx.store, ROOM) !== null) refuse("room-already-started");
    await keep(ctx.store, ROOM, identity);
  } else if (!same(await readPrivate(ctx.store, ROOM), identity)) refuse("room-input-changed");
  let current = config;
  if (mode !== "new") {
    const complete = await readPrivate(ctx.store, COMPLETE);
    if (config.repository) {
      if (!isRecord(complete) || !same(complete["identity"], identity) || !same(complete["repository"], config.repository) || !isRecord(complete["claim"])) return refuse("completed-claim-missing");
      const { repository: _room, ...before } = config;
      current = { ...before, claim: complete["claim"] as unknown as PendingClaim };
    } else {
      const rows = await journal(ctx.store, "s1-claim"), latest = rows.at(-1);
      if (!latest) return refuse("original-claim-missing");
      const held = await pointed(ctx.store, latest);
      if (!same(held["identity"], identity) || !isRecord(held["claim"])) refuse("claim-binding-changed");
      current = { ...config, claim: held["claim"] as unknown as PendingClaim };
    }
  }
  const store = claimStore(ctx.store, identity, current), commands = { ...ctx, store };
  // Completed creation is always rechecked, never replayed as a new found.
  return mode === "check" || config.repository ? checkClaim(commands, name) : claim(commands, name, { handle: config.handle });
}

async function ownerPlan(ctx: Context, receiverHome: string, kind: EnrollmentKind, handle: string): Promise<Omit<IdentityPlan, "operation">> {
  const c = await ctx.store.config(), key = c && await storedSigner(ctx.store, c.key);
  if (!c?.repository || c.claim || c.join || !c.handle || !isHandle(c.handle) || !isHandle(handle) || !key || !["agent", "checker"].includes(kind)) return refuse("enrollment-owner-invalid");
  const controller: MemberRef = { membership: c.repository.membership, member: c.handle };
  return { v: 1, kind, handle, receiverHome, service: c.service, repository: c.repository, actor: key.key, controller: kind === "agent" ? controller : null, hours: 1 };
}
function decodedHandoff(plan: IdentityPlan, handoff: Handoff): string {
  if (!closed(handoff, ["v", "plan", "link", "pointer"]) || handoff.v !== 1 || handoff.plan !== textDigest(canonicalize(plan)) || typeof handoff.link !== "string") refuse("handoff-plan-changed");
  const pointer = handoff.pointer;
  if (!closed(pointer, ["operation", "request", "digest", "membership", "actor"]) || pointer.operation !== plan.operation || pointer.actor !== plan.actor || !same(pointer.membership, plan.repository.membership) || typeof pointer.request !== "string" || !isDigest(pointer.digest)) refuse("handoff-pointer-changed");
  const link = plan.kind === "agent" ? agentKeyInvitationOf(handoff.link) : checkerKeyInvitationOf(handoff.link);
  if (!link || link.service !== plan.service || link.handle !== plan.handle || !same(link.repository.membership, plan.repository.membership) || !same(link.repository.directory, plan.repository.directory)
    || link.repository.rules !== plan.repository.rules || link.repository.destination !== plan.repository.destination
    || (link.kind === "agent-key" && !same(link.controller, plan.controller))) refuse("handoff-link-changed");
  return textDigest(canonicalize(link));
}

/** Complete one retained invitation and its receiver, without returning its
 * private handoff. A check delegates only read-only native settlement. */
export async function enrollIdentity(ownerCtx: Context, receiverHome: string, kind: EnrollmentKind, handle: string, mode: IdentityMode): Promise<Outcome> {
  modeOf(mode); privateHome(receiverHome, mode === "new");
  const receiver = storeAt(receiverHome), core = await ownerPlan(ownerCtx, receiverHome, kind, handle);
  let plan: IdentityPlan;
  if (mode === "new") {
    if ((await ownerCtx.store.config())?.invitationIssue) return refuse("another-invitation-pending");
    plan = { ...core, operation: crypto.randomUUID() };
    await keep(receiver, PLAN, plan);
  } else {
    const retained = await readPrivate(receiver, PLAN);
    if (!isRecord(retained) || typeof retained["operation"] !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(retained["operation"])) return refuse("identity-plan-missing");
    const { operation, ...original } = retained;
    if (!same(original, core)) refuse("identity-plan-changed");
    plan = retained as unknown as IdentityPlan;
  }
  let handoff = await readPrivate(receiver, HANDOFF) as Handoff | null;
  if (handoff === null) {
    const snapshots = await journal(receiver, "s1-issue"), latest = snapshots.at(-1);
    let requests: string[] = [];
    if (latest) requests = await retainedInvitationRequests(ownerCtx.store, { ...latest, operation: plan.operation });
    else if (mode !== "new") return refuse("original-invitation-missing");
    const issueStore: Store = { ...ownerCtx.store, keepPrivate: async (request, bytes) => {
      if (!/^i-[0-9a-f]{30}$/.test(request) || bytes.length > MAX_PRIVATE_BYTES) refuse("invitation-private-bound");
      const raw = new TextDecoder("utf-8", { fatal: true }).decode(bytes), row = decodePrivate(bytes);
      if (!isRecord(row) || row["operation"] !== plan.operation) refuse("invitation-operation-changed");
      // Record the exact intended original before its file or Config write.
      await appendPointer(receiver, "s1-issue", { request, digest: textDigest(raw) });
      await ownerCtx.store.keepPrivate(request, bytes);
    } };
    const issuing = await ownerCtx.store.config();
    // The engine accepts an orphan root only by its exact reserved name.
    // A missing pointer for a longer chain does not authorize restoration.
    const reserved = !issuing?.invitationIssue && requests.length === 1 ? requests[0] : undefined;
    const options = { operation: plan.operation, mode, privateRequests: requests, ...(reserved ? { reservedRequest: reserved } : {}) };
    const result = kind === "agent"
      ? await issueInvitation({ ...ownerCtx, store: issueStore }, { kind: "agent-key", handle, hours: 1, controller: plan.controller! }, options)
      : await issueCheckerInvitation({ ...ownerCtx, store: issueStore }, { handle, hours: 1 }, options);
    if (result.state !== "verified" || !result.link) return { code: 1, lines: [`The original ${kind} invitation is ${result.state}. Check it or Continue explicitly; no replacement follows.`] };
    const pointer = (await ownerCtx.store.config())?.invitationIssue;
    if (!pointer || pointer.operation !== plan.operation || pointer.actor !== plan.actor || !same(pointer.membership, plan.repository.membership)) return refuse("invitation-pointer-changed");
    const row = await pointed(ownerCtx.store, pointer);
    if (row["link"] !== result.link) refuse("invitation-output-changed");
    handoff = { v: 1, plan: textDigest(canonicalize(plan)), pointer, link: result.link };
    await keep(receiver, HANDOFF, handoff);
  }
  const digest = decodedHandoff(plan, handoff);
  await retainedInvitationRequests(ownerCtx.store, handoff.pointer);
  const original = await pointed(ownerCtx.store, handoff.pointer);
  if (original["operation"] !== plan.operation || original["link"] !== handoff.link) refuse("handoff-original-changed");
  const owner = await ownerCtx.store.config();
  if (owner?.invitationIssue?.operation === plan.operation) {
    if (!same(owner.invitationIssue, handoff.pointer)) refuse("handoff-pointer-changed");
    const { invitationIssue: _pointer, ...next } = owner;
    await ownerCtx.store.save(next);
  }
  const started = await readPrivate(receiver, STARTED), pending = await receiver.config();
  if (mode !== "check") {
    const binding = { v: 1, plan: handoff.plan, link: digest };
    const key = await storedSigner(receiver, `k-${digest.slice(7, 37)}`);
    const envelope = await receiver.private(`a-${digest.slice(7, 37)}`);
    if (started === null) {
      if (pending || key || envelope) refuse("unowned-receiver-original");
      await keep(receiver, STARTED, binding);
    } else if (!same(started, binding) || !key || envelope === null) refuse("original-receiver-missing");
  }
  const ctx = { ...ownerCtx, store: receiver };
  return kind === "agent" ? enrolAgentKey(ctx, handoff.link, { mode: mode === "check" ? "check" : "continue" })
    : enrolCheckerKey(ctx, handoff.link, { mode: mode === "check" ? "check" : "continue" });
}
