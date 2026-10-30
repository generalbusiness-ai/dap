/** Private workspace handoff and one exact seed update. No native authority. */
import { canonicalize, b64url, isRecord, parseStrict, same, textDigest, timeMs, unb64url, utf8 } from "@generalbusiness/dap-bytes";
import { readCredential, type ReadCredential } from "@generalbusiness/dap-client";
import type { ScopeRef } from "@generalbusiness/dap-contract";
import { Reader, idOf, isObjectId, parseCommit } from "@generalbusiness/dap-git";
import { SmartHttpGit } from "@generalbusiness/dap-git/http";
import { SmartHttpSource } from "@generalbusiness/dap-git/http-read";
import { requiredReadsOf } from "../../packages/cli/src/command-support.ts";
import { storedSigner } from "../../packages/cli/src/store-signer.ts";
import { SEED_GIT_LIMITS, type SeedCandidate } from "./git.ts";
import type { Session, SessionMode } from "./session.ts";

export interface WorkspaceCredential extends ReadCredential { target: ScopeRef; tokenId: string }
export interface SeedPushResult { state: "confirmed" | "unknown" | "not-sent"; commit: string; privateRecord: string }
export interface WorkspaceOptions { fetch?: (request: Request) => Promise<Response> }
export class WorkspaceRefusal extends Error {
  constructor(readonly reason: string) { super(`Repo-in-ai workspace refused: ${reason}`); }
}
const refuse = (reason: string): never => { throw new WorkspaceRefusal(reason); };
const equal = (a: unknown, b: unknown): boolean => canonicalize(a) === canonicalize(b);
const clock = (session: Session): number => session.ctx.now?.() ?? Date.now();
const nameOf = (prefix: string, identity: string): string => `${prefix}-${textDigest(identity).slice(7, 35)}`;
const decode = (bytes: Uint8Array): unknown => {
  try { return parseStrict(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
  catch { return refuse("private-record-invalid"); }
};
const closed = (value: unknown, names: readonly string[]): value is Record<string, unknown> => isRecord(value) && Object.keys(value).length === names.length && names.every(name => Object.hasOwn(value, name));
async function retain(session: Session, prefix: string, identity: string, value: unknown, exclusive = false): Promise<string> {
  const name = nameOf(prefix, identity), raw = canonicalize(value), prior = await session.ctx.store.private(name);
  if (prior) {
    if (exclusive) return refuse("original-exists");
    if (new TextDecoder().decode(prior) !== raw) return refuse("private-name-collision");
  } else await session.ctx.store.keepPrivate(name, utf8(raw));
  const kept = await session.ctx.store.private(name);
  if (!kept || new TextDecoder().decode(kept) !== raw) return refuse("private-readback");
  return name;
}
function remote(value: string): void {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.href !== value || /[\x00-\x20\x7f-\x9f]/.test(value) || url.pathname === "/") refuse("invalid-remote");
  } catch { return refuse("invalid-remote"); }
}
function credential(value: unknown, target: ScopeRef, tokenId: string, expectedRemote: string): value is WorkspaceCredential {
  return closed(value, ["target", "tokenId", "remote", "ends", "token"]) && same(value["target"], target) && value["tokenId"] === tokenId && value["remote"] === expectedRemote && typeof value["ends"] === "string" && timeMs(value["ends"]) !== null && typeof value["token"] === "string" && /^[!-~]{1,4096}$/.test(value["token"]);
}

/** Only `new` can GET. Its exclusive, flushed marker precedes that GET.
 * A missing saved result after the marker means uncertain consumption forever;
 * neither Check nor Continue retries the GET or asks for another token. */
export async function retrieveWorkspaceCredential(session: Session, target: ScopeRef, tokenId: string, expectedRemote: string, mode: SessionMode): Promise<WorkspaceCredential> {
  remote(expectedRemote);
  if (!["new", "check", "continue"].includes(mode) || !/^[!-~]{1,200}$/.test(tokenId)) return refuse("invalid-handoff");
  const binding = { target, tokenId, expectedRemote }, identity = canonicalize(binding);
  const markerName = nameOf("s1c", identity), resultName = nameOf("s1w", identity);
  const markerBytes = await session.ctx.store.private(markerName), resultBytes = await session.ctx.store.private(resultName);
  const config = await session.ctx.store.config();
  if (!config?.repository) return refuse("missing-room");
  const signer = await storedSigner(session.ctx.store, config.key);
  if (!signer) return refuse("missing-signer");
  const marker = { v: 1, binding, service: config.service, membership: config.repository.membership, signer: signer.key, consumed: "possible" };
  if (markerBytes) {
    if (mode === "new") return refuse("credential-consume-marker-exists");
    if (!equal(decode(markerBytes), marker) || !resultBytes) return refuse("credential-consumption-unknown");
    const saved = decode(resultBytes);
    if (!closed(saved, ["v", "binding", "reply"]) || saved["v"] !== 1 || !equal(saved["binding"], binding) || !isRecord(saved["reply"]) || saved["reply"]["ok"] !== true || !isRecord(saved["reply"]["value"])) return refuse("credential-not-retained");
    const held = { ...saved["reply"]["value"], target, tokenId };
    if (!credential(held, target, tokenId, expectedRemote)) return refuse("invalid-retained-credential");
    await session.read(target);
    return held;
  }
  if (mode !== "new" || resultBytes) return refuse("missing-credential-original");
  await session.read(target);
  const reads = requiredReadsOf(session.ctx, config.service, config.repository.membership, signer);
  const reader = (await reads.session()).reader();
  if (!equal(await session.ctx.store.config(), config)) return refuse("identity-changed");
  await retain(session, "s1c", identity, marker, true);
  // readCredential owns response/time bounds and has no retry path.
  const reply = await readCredential(config.service, target.scope, reader, tokenId, { ...(session.ctx.fetch ? { fetch: session.ctx.fetch } : {}), seconds: 8, bytes: 8192 });
  await retain(session, "s1w", identity, { v: 1, binding, reply }, true);
  if (!reply.ok) return refuse("credential-refused");
  const held = { ...reply.value, target, tokenId };
  if (!credential(held, target, tokenId, expectedRemote)) return refuse("credential-remote-or-shape");
  if (!equal(await session.ctx.store.config(), config)) return refuse("identity-changed-after-consume");
  if (timeMs(held.ends)! <= clock(session) + 60_000) return refuse("credential-expiry-margin");
  return held;
}

const REF = "refs/heads/main";
const bounds = { commitBytes: 65536, treeBytes: 131072, blobBytes: 65536, parents: 2, closureObjects: 256, refs: 256 };
function candidateOf(candidate: SeedCandidate) {
  if (!isObjectId(candidate.base) || !isObjectId(candidate.tree) || !isObjectId(candidate.commit) || candidate.base === candidate.commit || candidate.objects.length > SEED_GIT_LIMITS.objects) return refuse("invalid-candidate");
  let bytes = 0;
  const seen = new Set<string>();
  const objects = candidate.objects.map(object => {
    bytes += object.body.length;
    if (!["blob", "tree", "commit"].includes(object.kind) || object.body.length > SEED_GIT_LIMITS.streamBytes || bytes > SEED_GIT_LIMITS.bytes || seen.has(object.id) || idOf(object.kind, object.body) !== object.id) return refuse("invalid-candidate-object");
    seen.add(object.id);
    return { id: object.id, type: object.kind, data: new Uint8Array(object.body) };
  });
  const commit = objects.find(object => object.id === candidate.commit);
  if (!commit || commit.type !== "commit") return refuse("missing-candidate-commit");
  const parsed = parseCommit(commit.data, bounds);
  if (parsed.tree !== candidate.tree || parsed.parents.length !== 1 || parsed.parents[0] !== candidate.base) return refuse("candidate-tree-or-parent");
  return { base: candidate.base, tree: candidate.tree, commit: candidate.commit, objects };
}

/** No automatic push retry. `check` only reads; explicit Continue can send
 * the same retained update if the current ref still equals its original base.
 * A confirmed result means the authenticated fork ref and commit were read;
 * it is neither a native publication nor a gateway-forwarding classification. */
export async function pushSeed(session: Session, supplied: WorkspaceCredential, candidate: SeedCandidate, phaseKey: string, mode: SessionMode, options: WorkspaceOptions = {}): Promise<SeedPushResult> {
  if (!["new", "check", "continue"].includes(mode) || !/^[a-z][a-z0-9-]{0,63}$/.test(phaseKey)) return refuse("invalid-push-mode-or-key");
  const held = await retrieveWorkspaceCredential(session, supplied.target, supplied.tokenId, supplied.remote, "check");
  if (!equal(held, supplied)) return refuse("different-private-credential");
  if (timeMs(held.ends)! <= clock(session) + 60_000) return refuse("credential-expiry-margin");
  const checked = candidateOf(candidate);
  const original = { v: 1, phaseKey, target: held.target, tokenId: held.tokenId, remote: held.remote, ends: held.ends, ref: REF, base: checked.base, tree: checked.tree, commit: checked.commit, objects: checked.objects.map(object => ({ id: object.id, type: object.type, body: b64url(object.data) })) };
  const name = nameOf("s1p", phaseKey), kept = await session.ctx.store.private(name);
  if (mode === "new") {
    if (kept) return refuse("push-original-exists");
    await retain(session, "s1p", phaseKey, original, true);
  } else if (!kept || !equal(decode(kept), original)) return refuse("push-original-missing-or-different");
  // Decode the retained payload, not caller-owned buffers, for every send.
  const bytes = await session.ctx.store.private(name);
  if (!bytes || !equal(decode(bytes), original)) return refuse("push-original-readback");
  const stored = decode(bytes) as typeof original;
  const objects = stored.objects.map(object => {
    const data = unb64url(object.body);
    if (!data || b64url(data) !== object.body || idOf(object.type, data) !== object.id) return refuse("push-object-readback");
    return { id: object.id, type: object.type, data };
  });
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), SEED_GIT_LIMITS.operationMilliseconds);
  let requests = 0;
  const fetcher = options.fetch ?? ((request: Request) => fetch(request));
  const transport = { remote: held.remote, authorization: `Bearer ${held.token}`, maxBytes: SEED_GIT_LIMITS.bytes, bounds, timeoutMs: SEED_GIT_LIMITS.commandMilliseconds, fetch: (request: Request) => {
    if (++requests > 16 || controller.signal.aborted) return Promise.reject(new WorkspaceRefusal("transport-bound"));
    return fetcher(new Request(request, { signal: AbortSignal.any([request.signal, controller.signal]) }));
  } };
  const reader = new Reader(new SmartHttpSource(transport), bounds), sender = new SmartHttpGit(transport);
  let attempted = false;
  const finish = async (state: SeedPushResult["state"], details: unknown): Promise<SeedPushResult> => {
    const value = { v: 1, phaseKey, original: textDigest(canonicalize(original)), state, details };
    const raw = canonicalize(value), privateRecord = await retain(session, "s1r", raw, value);
    return { state, commit: stored.commit, privateRecord };
  };
  const verify = async (): Promise<void> => {
    const actual = await reader.commit(stored.commit);
    if (actual.tree !== stored.tree || actual.parents.length !== 1 || actual.parents[0] !== stored.base) return refuse("remote-candidate-mismatch");
  };
  try {
    const before = await reader.ref(REF);
    if (before === stored.commit) { await verify(); return await finish("confirmed", { observed: before, sentThisCall: false }); }
    if (before !== stored.base) return await finish("unknown", { observed: before, sentThisCall: false, reason: "contradictory-ref" });
    if (mode === "check") return await finish("unknown", { observed: before, sentThisCall: false, reason: "original-base-still-current" });
    const invocation = crypto.randomUUID();
    await retain(session, "s1a", invocation, { v: 1, phaseKey, original: textDigest(canonicalize(original)), invocation, possibleSend: true, started: clock(session) }, true);
    attempted = true;
    const answer = await sender.send({ ref: REF, old: stored.base, new: stored.commit, objects, beforeSend: () => !controller.signal.aborted && timeMs(held.ends)! > clock(session) });
    // Keep the complete bounded transport result before any read or projection.
    await retain(session, "s1r", canonicalize({ invocation, answer }), { v: 1, phaseKey, invocation, answer });
    const after = await reader.ref(REF);
    if (after === stored.commit) { await verify(); return await finish("confirmed", { invocation, answer, observed: after }); }
    return await finish("unknown", { invocation, answer, observed: after });
  } catch (error) {
    return await finish(attempted ? "unknown" : mode === "new" ? "not-sent" : "unknown", { sentThisCall: attempted, errorType: error instanceof WorkspaceRefusal ? "WorkspaceRefusal" : "transport-or-read" });
  } finally { clearTimeout(timer); }
}
