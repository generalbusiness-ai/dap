/** Private S1 operator session over the maintained MCP custody engine. */
import { join } from "node:path";
import { canonicalize, intentDigest, isReceipt, isRecord, isScopeRef, parseStrict, same, textDigest, utf8, verifySignedIntent } from "@generalbusiness/dap-bytes";
import type { Digest, PlatformDefinition, Receipt, ScopeId, ScopeRef, SignedIntent, Summary } from "@generalbusiness/dap-contract";
import type { Fetch } from "@generalbusiness/dap-client";
import { McpService, identityId, validKey, type CallResult, type ConfigPort, type CustodyRecord, type Identity, type McpConfig, type Root } from "@generalbusiness/dap-mcp";
import type { Context } from "@generalbusiness/dap-cli";
import { storedSigner } from "../../packages/cli/src/store-signer.ts";
import { nodeGit } from "../../packages/cli/src/git.ts";
import { durableCliStore, durableRequestStore } from "./custody.ts";

export type SessionMode = "new" | "check" | "continue";
export type SessionArgs = Record<string, unknown>;
export interface RequestBinding { target: ScopeRef; resource?: ScopeRef }
export interface PrivateResult { result: CallResult; privateRecord: string }
export interface Session {
  ctx: Context;
  intent(key: string): Promise<Digest>;
  read(target: ScopeRef): Promise<Summary>;
  resolve(scope: ScopeId, expectedDefinition: Digest | PlatformDefinition): Promise<Summary>;
  call(name: string, args: SessionArgs): Promise<PrivateResult>;
  request(mode: SessionMode, name: "act" | "prepare", args: SessionArgs, binding: RequestBinding): Promise<PrivateResult>;
  submitPrepared(mode: "check" | "continue", key: string): Promise<PrivateResult>;
  accepted(key: string): Promise<{ signed: SignedIntent; receipt: Receipt }>;
}
interface Original {
  v: 1; name: "act" | "prepare"; args: SessionArgs;
  identity: Identity; resource: ScopeRef | null;
}
export class SessionRefusal extends Error {
  constructor(readonly reason: string) { super(`Repo-in-ai session refused: ${reason}`); }
}
const refuse = (reason: string): never => { throw new SessionRefusal(reason); };
const readTools = new Set(["room", "inspect", "items", "steps", "step", "record", "sends", "text", "wait", "actions", "application_installation"]);
const actArgs = ["target", "kind", "digest", "on", "at", "fields", "texts", "presented", "values", "idempotencyKey"];
const prepareArgs = [...actArgs, "resource", "capability", "step"];
const equal = (a: unknown, b: unknown): boolean => canonicalize(a) === canonicalize(b);
const privateName = (prefix: "s1o" | "s1r" | "s1b", value: string): string => `${prefix}-${textDigest(value).slice(7, 35)}`;
const decoded = (bytes: Uint8Array): unknown => parseStrict(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
const closed = (value: unknown, names: readonly string[]): value is Record<string, unknown> => isRecord(value) && Object.keys(value).length === names.length && names.every(name => Object.hasOwn(value, name));

/** Requires an existing CLI identity. It neither creates nor copies a key.
 * All returned results are private; callers choose their public whitelist. */
export async function openSession(home: string, options: { fetch?: Fetch; now?: () => number } = {}): Promise<Session> {
  const store = durableCliStore(home), initial = await store.config();
  if (!initial) return refuse("missing-config");
  const signer = await storedSigner(store, initial.key);
  if (!signer) return refuse("missing-signer");
  const ctx: Context = { store, git: nodeGit(), ...options };
  const port: ConfigPort = {
    read: async (): Promise<McpConfig> => {
      const c = await store.config();
      if (!c || c.key !== initial.key || c.service !== initial.service) return refuse("identity-changed");
      return { service: c.service, ...(c.handle ? { handle: c.handle } : {}), ...(c.register ? { register: c.register } : {}), ...(c.repository ? { repository: c.repository } : {}), ...(c.roots ? { roots: c.roots } : {}) };
    },
    setRepository: async repository => {
      const c = await store.config();
      if (!c) return refuse("missing-config");
      await store.save({ ...c, repository });
    },
    joined: async room => {
      const c = await store.config();
      await store.save({ ...(c ?? { v: 2 as const, key: initial.key }), service: room.service, repository: room.repository, handle: room.handle });
    },
    addRoot: async (root: Root) => {
      const c = await store.config();
      if (!c) return refuse("missing-config");
      await store.save({ ...c, roots: [...(c.roots ?? []).filter(r => r.scope !== root.scope), root] });
    },
  };
  const rawCustody = durableRequestStore(join(home, "private", "mcp-custody"));
  let active: Original | null = null, busy = false;
  // The engine resolves scope IDs itself. Fence its actual record before any
  // dispatch, including a target/resource incarnation change after our read.
  // A write carries a record as the store holds it, of either version.
  const validateRecord = (record: Parameters<typeof rawCustody.write>[1], original: Original): void => {
    if (!equal(record.identity, original.identity) || !same(record.envelope.signed.intent.to, original.identity.target)) refuse("custody-binding");
    for (const step of Object.values(record.steps)) {
      if (!original.resource || !same(step.resource, original.resource)) refuse("resource-binding");
    }
  };
  const custody = { ...rawCustody, write: async (...args: Parameters<typeof rawCustody.write>) => {
    if (!active) return refuse("unbound-custody-write");
    validateRecord(args[1], active);
    await rawCustody.write(...args);
  } };
  const service = new McpService({ service: initial.service, signer, config: port, custody, mode: "generic", ...options });
  const reads = service.reads;
  const serial = async <T>(work: () => Promise<T>): Promise<T> => {
    if (busy) return refuse("concurrent-call");
    busy = true;
    try { await port.read(); return await work(); }
    finally { active = null; busy = false; }
  };
  const retain = async (value: unknown, prefix: "s1o" | "s1r" | "s1b", identity: string): Promise<string> => {
    const raw = canonicalize(value), name = privateName(prefix, identity);
    const previous = await store.private(name);
    if (previous) {
      if (new TextDecoder().decode(previous) !== raw) return refuse("private-name-collision");
    } else await store.keepPrivate(name, utf8(raw));
    const kept = await store.private(name);
    if (!kept || new TextDecoder().decode(kept) !== raw) return refuse("private-readback");
    return name;
  };
  const keepResult = async (name: string, args: SessionArgs, result: CallResult): Promise<PrivateResult> => {
    const value = { v: 1, name, args, result }, raw = canonicalize(value);
    return { result, privateRecord: await retain(value, "s1r", raw) };
  };
  const membershipOf = async (target: ScopeRef): Promise<ScopeRef | null> => {
    const config = await port.read();
    if (config.register?.scope === target.scope) {
      if (!same(config.register, target)) return refuse("wrong-genesis");
    }
    const root = config.roots?.find(root => root.scope === target.scope);
    // Match the generic engine: a root with no membership uses the room's
    // standing when the configuration already names a room.
    return root?.membership ?? config.repository?.membership ?? null;
  };
  const read = async (target: ScopeRef): Promise<Summary> => {
    if (!isScopeRef(target)) return refuse("invalid-reference");
    const got = await reads.read(await membershipOf(target), (transport, reader) => transport.summary(target.scope, reader));
    if (!got.ok || !got.complete || got.next !== undefined || !same(got.value.scope, target)) return refuse("incomplete-or-wrong-scope");
    await retain({ v: 1, target, read: got }, "s1r", canonicalize({ target, read: got }));
    return got.value;
  };
  const originalFor = async (key: string): Promise<Original | null> => {
    const bytes = await store.private(privateName("s1o", key));
    if (!bytes) return null;
    let value: unknown;
    try { value = decoded(bytes); } catch { return refuse("invalid-original"); }
    if (!closed(value, ["v", "name", "args", "identity", "resource"]) || value["v"] !== 1 || !["act", "prepare"].includes(String(value["name"])) || !isRecord(value["args"]) || !closed(value["identity"], ["service", "membership", "signer", "target", "key"])) return refuse("invalid-original");
    const original = value as unknown as Original;
    if (Object.keys(original.args).some(key => !(original.name === "act" ? actArgs : prepareArgs).includes(key))) return refuse("invalid-original-arguments");
    if (original.identity.key !== key || original.args["idempotencyKey"] !== key || original.identity.service !== initial.service || original.identity.signer !== signer.key || !isScopeRef(original.identity.target) || original.identity.membership !== null && !isScopeRef(original.identity.membership) || original.resource !== null && !isScopeRef(original.resource)) return refuse("invalid-original-binding");
    const standalone = original.name === "prepare" && original.args["kind"] === undefined;
    const target = original.identity.target as ScopeRef;
    if (standalone ? original.args["resource"] !== target.scope || original.args["target"] !== undefined : original.args["target"] !== target.scope || typeof original.args["kind"] !== "string") return refuse("invalid-original-target");
    if (original.name === "prepare" ? !original.resource || original.args["resource"] !== original.resource.scope || typeof original.args["capability"] !== "string" || typeof original.args["step"] !== "string" || standalone && !same(original.resource, target) : original.resource !== null) return refuse("invalid-original-resource");
    return original;
  };
  const engineRecord = async (original: Original): Promise<CustodyRecord | null> => {
    const record = await service.custody.find(original.identity);
    if (record) validateRecord(record, original);
    return record;
  };
  const invoke = async (original: Original, name: string, args: SessionArgs): Promise<PrivateResult> => {
    active = original;
    const before = await engineRecord(original);
    const result = await service.call(name, args);
    const retained = await keepResult(name, args, result);
    const after = await engineRecord(original);
    if (before && (!after || !equal(before.envelope, after.envelope))) return refuse("original-envelope-changed");
    return retained;
  };
  const settle = (original: Original): Promise<PrivateResult> => invoke(original, "settle", { target: (original.identity.target as ScopeRef).scope, idempotencyKey: original.identity.key });
  const terminal = (record: CustodyRecord): boolean => ["accepted", "archived", "refused", "mismatch", "settled"].includes(record.phase);

  return {
    ctx,
    intent: (key: string) => serial(async () => {
      const original = await originalFor(key);
      if (!original) return refuse("missing-original");
      const record = await engineRecord(original);
      if (!record || !verifySignedIntent(record.envelope.signed) || record.envelope.signed.intent.actor !== original.identity.signer) return refuse("missing-engine-envelope");
      return intentDigest(record.envelope.signed.intent);
    }),
    accepted: (key: string) => serial(async () => {
      if (!validKey(key)) return refuse("invalid-key");
      const original = await originalFor(key);
      if (!original) return refuse("missing-original");
      const record = await engineRecord(original);
      if (!record || record.phase !== "accepted" || record.standalone) return refuse("not-accepted");
      const decided = await service.custody.decided(identityId(original.identity), record);
      const signed = record.envelope.signed, answer = decided?.answer;
      if (!verifySignedIntent(signed) || signed.intent.actor !== original.identity.signer || !answer || answer.answer !== "accepted" || !isReceipt(answer.receipt) || answer.receipt.intent !== intentDigest(signed.intent) || !same(answer.receipt.fact.at, original.identity.target) || answer.receipt.definition !== record.binding.pinned) return refuse("unverified-acceptance");
      const value = { signed, receipt: answer.receipt };
      await retain({ v: 1, key, accepted: value }, "s1r", canonicalize({ key, accepted: value }));
      return value;
    }),
    read: (target: ScopeRef) => serial(() => read(target)),
    resolve: (scope: ScopeId, expectedDefinition: Digest | PlatformDefinition) => serial(async () => {
      const config = await port.read();
      const membership = config.roots?.find(root => root.scope === scope)?.membership ?? config.repository?.membership ?? null;
      const got = await reads.read(membership, (transport, reader) => transport.summary(scope, reader));
      if (!got.ok || !got.complete || got.next !== undefined || got.value.status !== "active" || got.value.scope.scope !== scope || got.value.definition !== expectedDefinition) return refuse("unresolved-scope-or-pin");
      // Retain first discovery. A later incarnation cannot replace that ref.
      await retain({ v: 1, scope, definition: expectedDefinition, ref: got.value.scope }, "s1b", scope);
      await retain({ v: 1, scope, read: got }, "s1r", canonicalize({ scope, read: got }));
      return got.value;
    }),
    call: (name: string, args: SessionArgs): Promise<PrivateResult> => serial(async () => {
      if (!readTools.has(name)) return refuse("read-tool-required");
      return keepResult(name, args, await service.call(name, args));
    }),
    request: (mode: SessionMode, name: "act" | "prepare", args: SessionArgs, binding: RequestBinding): Promise<PrivateResult> => serial(async () => {
      const key = args["idempotencyKey"];
      if (typeof key !== "string" || !validKey(key) || !["new", "check", "continue"].includes(mode) || !["act", "prepare"].includes(name)) return refuse("invalid-request-mode-or-key");
      if (!isScopeRef(binding.target) || binding.resource !== undefined && !isScopeRef(binding.resource) || args["resubmit"] !== undefined || Object.keys(args).some(key => !(name === "act" ? actArgs : prepareArgs).includes(key))) return refuse("invalid-request-binding");
      const standalone = name === "prepare" && args["kind"] === undefined;
      if (standalone ? args["resource"] !== binding.target.scope || args["target"] !== undefined : args["target"] !== binding.target.scope || typeof args["kind"] !== "string") return refuse("exact-target-required");
      if (name === "prepare" && (!binding.resource || args["resource"] !== binding.resource.scope || typeof args["capability"] !== "string" || typeof args["step"] !== "string" || standalone && !same(binding.resource, binding.target))) return refuse("exact-resource-required");
      if (name === "act" && binding.resource !== undefined) return refuse("unexpected-resource");
      await read(binding.target);
      if (binding.resource && !same(binding.resource, binding.target)) await read(binding.resource);
      const identity: Identity = { service: initial.service, membership: await membershipOf(binding.target), signer: signer.key, target: binding.target, key };
      const proposed: Original = { v: 1, name, args: decoded(utf8(canonicalize(args))) as SessionArgs, identity, resource: binding.resource ?? null };
      const original = await originalFor(key);
      if (mode === "new") {
        if (original || await service.custody.find(identity)) return refuse("key-exists");
        await retain(proposed, "s1o", key);
        return invoke(proposed, name, proposed.args);
      }
      if (!original || !equal(original, proposed)) return refuse("original-missing-or-different");
      if (!await engineRecord(original)) return refuse("missing-engine-envelope");
      const observed = await settle(original);
      if (mode === "check") return observed;
      const record = await engineRecord(original);
      if (!record || terminal(record)) return observed;
      if (original.name === "prepare" && Object.values(record.steps).some(step => step.capability === original.args["capability"] && step.step === original.args["step"] && step.phase === "answered")) return observed;
      // Only explicit Continue may retry an unknown preparation. The engine
      // reuses its retained signed step/act; this wrapper never signs.
      return invoke(original, original.name, original.args);
    }),
    submitPrepared: (mode: "check" | "continue", key: string): Promise<PrivateResult> => serial(async () => {
      if (!validKey(key) || !["check", "continue"].includes(mode)) return refuse("invalid-submit-mode-or-key");
      const original = await originalFor(key);
      if (!original || original.name !== "prepare" || typeof original.args["kind"] !== "string") return refuse("missing-prepared-act");
      await read(original.identity.target as ScopeRef);
      const before = await engineRecord(original);
      if (!before || before.standalone) return refuse("missing-prepared-envelope");
      const observed = await settle(original);
      if (mode === "check") return observed;
      const record = await engineRecord(original);
      if (!record || terminal(record)) return observed;
      if (Object.keys(record.steps).length === 0 || Object.values(record.steps).some(step => step.phase !== "answered" || step.answers.at(-1)?.answer?.answer !== "accepted")) return refuse("preparation-not-accepted");
      const { resource: _resource, capability: _capability, step: _step, ...args } = original.args;
      return invoke(original, "act", args);
    }),
  };
}
