/**
 * Ports for Cloudflare Artifacts, reached through the Worker's
 * `ARTIFACTS` binding, with no outside credential. The binding is described
 * here by structural types, so this package needs no Workers types.
 *
 * Every mutation is sent once. A refusal that the service states changed
 * nothing is the answer; any other failure leaves the outcome unknown. The
 * repository's ID is its name: the binding names a repository by its name
 * and gives no other identifier. No plaintext is recorded in an outside
 * answer.
 */
import type { RetainedInput, Timestamp } from "@generalbusiness/dap-contract";
import { timeMs, timeOf } from "@generalbusiness/dap-bytes";
import type { DestinationObject, RecordedJudgeEvidence } from "@generalbusiness/dap-platform";
import { GitRefusal, READ_BOUNDS, Reader, type GitSource, type ReadBounds } from "@generalbusiness/dap-git";
import { SmartHttpSource } from "@generalbusiness/dap-git/http-read";
import { SmartHttpGit } from "@generalbusiness/dap-git/http";
import type { DestinationBinding, DestinationInspection, DestinationProvider, DestinationRepository } from "./destination-host.ts";
import { deleteRefOnce, inspectGit, sendOnce, type DestinationRefDeletion } from "./github-host.ts";
import type { RegisterProvider } from "./register-host.ts";
import { archiveProvider, fixtureArchiveProvider, type FixtureArchivePorts } from "./archive-host.ts";
import { readRulesTree, rulesTreeRequest, rulesTreeIsolation, type RulesTreeRequest, type RulesTreeObjects } from "./rules-tree-provider.ts";

/** A repository handle of the binding: the parts this port uses. */
export interface ArtifactsRepository {
  /** The binding creates one writable fork in this same namespace. */
  fork?(name: string, options: { defaultBranchOnly: true; readOnly: false }): Promise<unknown>;
  /** `ttl` in seconds. Answers `{ id, plaintext, scope, expiresAt }`. */
  createToken(scope: "read" | "write", ttl: number): Promise<unknown>;
  /** A token's plaintext or its ID. True when revoked. */
  revokeToken(tokenOrId: string): Promise<unknown>;
  /** Answers `{ name, remote, ... }`. */
  info(): Promise<unknown>;
}
/** The binding: one namespace of the service. */
export interface ArtifactsNamespace {
  get(name: string): Promise<ArtifactsRepository>;
  /** A new, empty repository. Answers `{ name, remote, token }`; `token` is one write token in plaintext, which the caller must revoke. Throws `ALREADY_EXISTS` when the name is taken. */
  create(name: string): Promise<unknown>;
  /** True if deleted, false if there was none. */
  delete(name: string): Promise<unknown>;
}

/** Private custody of a creation's write token whose revocation did not confirm. Nonsecret handle in, plaintext held privately. */
export interface CreationCustody {
  hold(handle: string, name: string, plaintext: string): void;
  take(handle: string): { name: string; plaintext: string } | null;
  revoked(handle: string): void;
}

export interface ArtifactsProviderOptions {
  binding: ArtifactsNamespace;
  /** The register's recorded host for this service, and its namespace. */
  host: string;
  namespace: string;
  /** The hostname of the service's remote URLs. */
  service: string;
  /** Caller-chosen transport allowance, not a platform quota. */
  maxBytes: number;
  bounds?: ReadBounds;
  fetch?: (request: Request) => Promise<Response>;
  timeoutMs?: number;
  /** Caller's nonsecret, durable credential mapping, allocated BEFORE mint. Not the service's token ID. */
  credentialHandle(repository: DestinationRepository, binding: DestinationBinding): Promise<string>;
  /** Where a creation token is durably held. Without custody, an unconfirmed immediate revocation leaves creation unknown. */
  creation?: CreationCustody;
  /** The repository this object records, for a revocation, which names only the token. */
  repositoryOf?(): DestinationRepository | null;
}

/** Write tokens live long enough for one judged write; read tokens for one read. In seconds. */
export const WRITE_TTL = 900;
export const READ_TTL = 120;

const bad = (): never => { throw new GitRefusal("unreadable", "Artifacts provider"); };
/** Error codes that state the request was refused and changed nothing. Every other failure leaves the outcome unknown. */
const REFUSED_UNCHANGED = new Set(["ALREADY_EXISTS", "INVALID_INPUT", "INVALID_REPO_NAME", "INVALID_TTL", "NOT_FOUND"]);
const codeOf = (e: unknown): string | null => {
  try {
    const code = (e as { code?: unknown } | null)?.code;
    const numeric = (e as { numericCode?: unknown } | null)?.numericCode;
    return typeof code === "string" && REFUSED_UNCHANGED.has(code) && typeof numeric === "number" ? code : null;
  } catch { return null; }
};
const repositoryName = (name: unknown): name is string => typeof name === "string" && /^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/.test(name) && !name.toLowerCase().endsWith(".git");
const plaintextOf = (value: unknown): string => typeof value === "string" && /^[!-~]{1,4096}$/.test(value) ? value : bad();
const handle = (value: string): string => typeof value === "string" && value.length > 0 && value.length <= 256 && !/[\u0000-\u001f\u007f]/.test(value) ? value : bad();
/** The binding's reported ISO expiry, normalized to the contract's one
 * instant text. No expiry is inferred from the requested TTL. */
const endsOf = (value: unknown): string => {
  const ms = typeof value === "string" ? timeMs(value.replace(/\.000Z$/, "Z")) : null;
  return ms !== null && ms > 0 ? timeOf(ms) : bad();
};
function own(reply: unknown, key: string): unknown {
  if (typeof reply !== "object" || reply === null) return undefined;
  try { return Object.hasOwn(reply, key) ? (reply as Record<string, unknown>)[key] : undefined; } catch { return undefined; }
}

/** Local service configuration only; no provider request. */
export const artifactsService = (value: unknown): value is string => typeof value === "string" && value.length <= 253 && /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/.test(value);

export class ArtifactsProvider implements RegisterProvider, DestinationProvider {
  readonly #options: ArtifactsProviderOptions;
  readonly #bounds: ReadBounds;
  constructor(options: ArtifactsProviderOptions) {
    if (!repositoryName(options.namespace) || !artifactsService(options.service) || !Number.isSafeInteger(options.maxBytes) || options.maxBytes < 32) bad();
    this.#options = { ...options };
    this.#bounds = { ...(options.bounds ?? READ_BOUNDS) };
  }

  /** Trusted workspace adapter read with its already judged scoped token.
   * No token mint occurs here. Each closure has one aggregate byte allowance. */
  async workspaceObjects(repository: DestinationRepository, commit: string, plaintext: string): Promise<readonly DestinationObject[]> {
    return this.#workspaceClosure(this.workspaceSource(repository, plaintext), commit);
  }

  workspaceSource(repository: DestinationRepository, plaintext: string): SmartHttpSource {
    return new SmartHttpSource({ ...this.#transport(this.#remote(repository)), authorization: `Bearer ${plaintextOf(plaintext)}` });
  }
  async workspaceMint(repository: DestinationRepository, scope: "read" | "write", seconds: number, allowed: () => boolean = () => true): Promise<unknown> {
    const remote = this.#remote(repository);
    if (!Number.isSafeInteger(seconds) || seconds < 1 || seconds > WRITE_TTL) return bad();
    const handleOf = await this.#options.binding.get(repository.name);
    if (own(await handleOf.info(), "remote") !== remote) return bad();
    if (!allowed()) return { minted: false };
    let token: unknown;
    try { token = await handleOf.createToken(scope, seconds); }
    catch (error) { if (codeOf(error) !== null) return { minted: false }; throw error; }
    if (own(token, "scope") !== scope) return bad();
    return { minted: true, id: handle(own(token, "id") as string), ends: endsOf(own(token, "expiresAt")), plaintext: plaintextOf(own(token, "plaintext")) };
  }
  async workspaceRevoke(repository: DestinationRepository, id: string): Promise<unknown> {
    this.#remote(repository); handle(id);
    const revoked = await this.#revoke(repository.name, id);
    return revoked === null ? null : { revoked };
  }
  /** A creation answer is confirmed only after exact seed initialization and
   * actual revocation of the binding's initial write credential. */
  async workspaceFork(repository: DestinationRepository, name: string, commit: string, branch: string, allowed: () => boolean): Promise<unknown> {
    this.#remote(repository);
    if (!repositoryName(name) || !allowed()) return null;
    const parent = await this.#options.binding.get(repository.name);
    if (own(await parent.info(), "remote") !== this.#remote(repository) || !allowed() || typeof parent.fork !== "function") return null;
    let created: unknown;
    try { created = await parent.fork(name, { defaultBranchOnly: true, readOnly: false }); }
    catch (error) { return codeOf(error) === null ? null : { created: false }; }
    const fork = { ...repository, name, id: name };
    if (own(created, "name") !== name) return null;
    const plaintext = plaintextOf(own(created, "token"));
    const credential = `workspace:${name}`;
    let initialized = false;
    try {
      this.#options.creation?.hold(credential, name, plaintext);
      if (own(created, "remote") !== this.#remote(fork)) return null;
      const ref = `refs/heads/${branch}`;
      const current = await new Reader(this.workspaceSource(fork, plaintext), this.#bounds).ref(ref);
      if (current === commit) initialized = true;
      else if (allowed()) {
        // The source commit may be a held report outside the default branch.
        const objects = await this.#read(repository, source => this.#workspaceClosure(source, commit));
        const answer = await new SmartHttpGit({ ...this.#transport(this.#remote(fork)), authorization: `Bearer ${plaintext}` }).send({
          ref, old: current, new: commit, objects: objects.map(object => ({ id: object.id, type: object.kind, data: object.body })), beforeSend: allowed,
        });
        initialized = answer.ran && answer.exit === 0 && !answer.timedOut
          && answer.reported !== null && ["created", "updated"].includes(answer.reported)
          && await new Reader(this.workspaceSource(fork, plaintext), this.#bounds).ref(ref) === commit;
      }
    } finally {
      const revoked = await this.#revoke(name, plaintext);
      if (revoked === true) this.#options.creation?.revoked(credential);
      else initialized = false;
    }
    return initialized ? { id: name, name } : null;
  }
  async #workspaceClosure(source: SmartHttpSource, commit: string): Promise<readonly DestinationObject[]> {
    const objects = new Map<string, DestinationObject>(); let bytes = 0;
    const recording: GitSource = { ref: name => source.ref(name), refs: (prefix, limit) => source.refs(prefix, limit), object: async (id, limit) => {
      const remaining = this.#options.maxBytes - bytes;
      if (remaining <= 0 || objects.size >= 4096) return bad();
      const found = await source.object(id, Math.min(limit, remaining));
      if (found.data === null || found.size > remaining || !["blob", "tree", "commit"].includes(found.type)) return bad();
      if (!objects.has(id)) { bytes += found.data.length; objects.set(id, { id, kind: found.type as DestinationObject["kind"], body: new Uint8Array(found.data) }); }
      return found;
    } };
    if (!(await new Reader(recording, { ...this.#bounds, closureObjects: 4096 }).closure(commit)).complete) return bad();
    return [...objects.values()];
  }

  /** Host-only archive authority, outside the destination operation ledger.
   * The service binding mints actual expiring credentials for one repository.
   * The shared adapter binds every write credential to one scope/ref/pass. */
  archive(clock: () => Timestamp) {
    const repositories = new WeakMap<object, DestinationRepository>();
    const active = (allowed: () => boolean): void => { if (!allowed()) bad(); };
    return archiveProvider({ clock, tokens: {
      read: async (repository, allowed) => {
        this.#remote(repository); active(allowed);
        const remote = await this.#options.binding.get(repository.name); active(allowed);
        const token = await remote.createToken("read", READ_TTL); active(allowed);
        const now = timeMs(clock()), ends = timeMs(endsOf(own(token, "expiresAt")));
        if (own(token, "scope") !== "read" || now === null || ends === null || ends <= now) return bad();
        return plaintextOf(own(token, "plaintext"));
      },
      mint: async (repository, _at, allowed) => {
        this.#remote(repository); active(allowed);
        const remote = await this.#options.binding.get(repository.name); active(allowed);
        const token = await remote.createToken("write", WRITE_TTL); active(allowed);
        if (own(token, "scope") !== "write") return bad();
        const credential = { id: crypto.randomUUID(), ends: endsOf(own(token, "expiresAt")), plaintext: plaintextOf(own(token, "plaintext")) };
        repositories.set(credential, { ...repository });
        return credential;
      },
      revoke: async credential => {
        const repository = repositories.get(credential); repositories.delete(credential);
        if (!repository) return;
        const remote = await this.#options.binding.get(repository.name);
        // A service without revoke still enforces its reported expiry.
        if (typeof remote.revokeToken === "function") await remote.revokeToken(credential.plaintext);
      },
    } }, {
      isolatedObjectProtocol: "v2",
      transport: (repository, plaintext) => ({ ...this.#transport(this.#remote(repository)), ...(plaintext === undefined ? {} : { authorization: `Bearer ${plaintextOf(plaintext)}` }) }),
      identity: async (repository, _plaintext, allowed) => {
        active(allowed);
        const remote = await this.#options.binding.get(repository.name); active(allowed);
        const info = await remote.info(); active(allowed);
        if (own(info, "remote") !== this.#remote(repository)) return bad();
      },
    });
  }

  /** No binding token creation: archive credentials are fixture stand-ins. */
  fixtureArchive(ports: FixtureArchivePorts) {
    return fixtureArchiveProvider(ports, {
      isolatedObjectProtocol: "v2",
      transport: (repository, plaintext) => ({ ...this.#transport(this.#remote(repository)), ...(plaintext === undefined ? {} : { authorization: `Bearer ${plaintextOf(plaintext)}` }) }),
      identity: async (repository, _plaintext, allowed) => {
        if (!allowed()) return bad();
        const handle = await this.#options.binding.get(repository.name);
        if (!allowed()) return bad();
        const info = await handle.info();
        if (!allowed() || own(info, "remote") !== this.#remote(repository)) return bad();
      },
    });
  }

  /** One create. Its write token is revoked at once; if that is not confirmed, the answer names the token's handle, which the register owes. */
  async createRepository(name: string): Promise<unknown> {
    if (!repositoryName(name)) return null;
    let created: unknown;
    try { created = await this.#options.binding.create(name); }
    catch (e) {
      const code = codeOf(e);
      return code === null ? null : { created: false, name, nameExists: code === "ALREADY_EXISTS" };
    }
    if (own(created, "name") !== name) return null;
    let plaintext: string;
    try { plaintext = plaintextOf(own(created, "token")); } catch { return null; }
    const credential = `creation:${name}`;
    let held = false;
    try {
      this.#options.creation?.hold(credential, name, plaintext);
      const stored = this.#options.creation?.take(credential);
      held = stored?.name === name && stored.plaintext === plaintext;
    } catch { /* Immediate revocation can still confirm; otherwise no answer. */ }
    let revoked = false;
    try { revoked = await (await this.#options.binding.get(name)).revokeToken(plaintext) === true; } catch { revoked = false; }
    if (revoked) {
      try { this.#options.creation?.revoked(credential); } catch { /* the plaintext is revoked; a held copy is no authority */ }
    }
    if (own(created, "remote") !== this.#remote({ host: this.#options.host, namespace: this.#options.namespace, name, id: name })) return null;
    if (revoked) return { created: true, name, id: name };
    // A local cleanup handle is an answer only while its exact plaintext is
    // durably held. Failed custody and failed revocation remain unknown.
    return held ? { created: true, name, id: name, credential } : null;
  }
  async deleteRepository(id: string, name: string): Promise<unknown> {
    if (id !== name || !repositoryName(name)) return null;
    try {
      const deleted = await this.#options.binding.delete(name);
      return typeof deleted === "boolean" ? { deleted, id } : null;
    } catch (e) { return codeOf(e) === null ? null : { deleted: false, id }; }
  }
  async revokeCredential(id: string): Promise<unknown> {
    try {
      const held = this.#options.creation?.take(handle(id));
      if (!held) return null;
      const revoked = await this.#revoke(held.name, held.plaintext);
      if (revoked === null) return null;
      if (revoked) try { this.#options.creation!.revoked(id); } catch { /* revoked: a held copy is no authority */ }
      return { revoked, credential: id };
    } catch { return null; }
  }

  async mint(repository: DestinationRepository, binding: DestinationBinding): Promise<unknown> {
    repository = { ...repository };
    this.#remote(repository);
    const id = handle(await this.#options.credentialHandle({ ...repository }, { ...binding, scope: { ...binding.scope } }));
    const handleOf = await this.#options.binding.get(repository.name);
    let token: unknown;
    try { token = await handleOf.createToken("write", WRITE_TTL); }
    catch (e) { if (codeOf(e) !== null) return { minted: false }; throw e; }
    if (own(token, "scope") !== "write") return bad();
    // DestinationHost puts the plaintext in private custody before answering.
    // Lost replies or failed custody remain pending; this port never remints.
    return { id, ends: endsOf(own(token, "expiresAt")), plaintext: plaintextOf(own(token, "plaintext")) };
  }
  /** A member's read token, for the lifetime asked. The service states its expiry; the plaintext goes to custody, never to an answer's body. */
  async mintRead(repository: DestinationRepository, request: { handle: string; seconds: number }): Promise<unknown> {
    repository = { ...repository };
    this.#remote(repository);
    const id = handle(request.handle);
    if (!Number.isSafeInteger(request.seconds) || request.seconds < 1) return bad();
    const handleOf = await this.#options.binding.get(repository.name);
    let token: unknown;
    try { token = await handleOf.createToken("read", request.seconds); }
    catch (e) { if (codeOf(e) !== null) return { minted: false }; throw e; }
    if (own(token, "scope") !== undefined && own(token, "scope") !== "read") return bad();
    return { id, ends: endsOf(own(token, "expiresAt")), plaintext: plaintextOf(own(token, "plaintext")) };
  }
  remote(repository: DestinationRepository): string { return this.#remote({ ...repository }); }
  async revoke(id: string, plaintext: string): Promise<unknown> {
    handle(id);
    const repository = this.#options.repositoryOf?.() ?? null;
    if (!repository) return bad();
    this.#remote(repository);
    const revoked = await this.#revoke(repository.name, plaintext);
    return revoked === null ? bad() : { revoked, id };
  }
  async format(repository: DestinationRepository): Promise<"sha1"> {
    // The complete advertisement is checked; the source rejects SHA-256.
    await this.#read(repository, (source) => source.refs("refs/heads/", this.#bounds.refs));
    return "sha1";
  }
  ref(repository: DestinationRepository, ref: string): Promise<string | null> {
    return this.#read(repository, (source) => new Reader(source, this.#bounds).ref(ref));
  }
  objects(repository: DestinationRepository, commit: string): Promise<readonly DestinationObject[]> {
    return this.#read(repository, async (source) => {
      const collected = new Map<string, DestinationObject>();
      const recording: GitSource = {
        object: async (id, limit) => {
          const object = await source.object(id, limit);
          if (object.data !== null && (object.type === "blob" || object.type === "tree" || object.type === "commit")) collected.set(id, { id, kind: object.type, body: new Uint8Array(object.data) });
          return object;
        },
        ref: (ref) => source.ref(ref), refs: (prefix, limit) => source.refs(prefix, limit),
      };
      if (!(await new Reader(recording, this.#bounds).closure(commit)).complete) return bad();
      return [...collected.values()];
    });
  }
  rulesTree(repository: DestinationRepository, request: RulesTreeRequest): Promise<RulesTreeObjects> {
    const asked = rulesTreeRequest(request);
    return this.#read({ ...repository }, source => readRulesTree(source, asked, this.#bounds), true);
  }
  async send(request: Parameters<DestinationProvider["send"]>[0]): Promise<unknown> {
    request = { ...request, repository: { ...request.repository }, binding: { ...request.binding, scope: { ...request.binding.scope } } };
    const remote = this.#remote(request.repository);
    return sendOnce(request, { ...this.#transport(remote), authorization: `Bearer ${plaintextOf(request.token)}` }, () => this.ref(request.repository, request.ref));
  }
  async deleteRef(request: DestinationRefDeletion): Promise<unknown> {
    request = { ...request, repository: { ...request.repository }, binding: { ...request.binding, scope: { ...request.binding.scope } } };
    const remote = this.#remote(request.repository);
    return deleteRefOnce(request, { ...this.#transport(remote), authorization: `Bearer ${plaintextOf(request.token)}` }, () => this.ref(request.repository, request.ref));
  }
  async inspect(context: DestinationInspection): Promise<{ evidence: RecordedJudgeEvidence; retain?: readonly RetainedInput[] }> {
    context = { ...context, repository: { ...context.repository }, reports: [...context.reports] };
    return this.#read(context.repository, (source) => inspectGit(new Reader(source, this.#bounds), context, this.#bounds));
  }

  /** The remote URL of a recorded repository at this host and namespace. */
  #remote(repository: DestinationRepository): string {
    if (repository.host !== this.#options.host || repository.namespace !== this.#options.namespace || !repositoryName(repository.name) || repository.id !== repository.name) return bad();
    return `https://${this.#options.service}/git/${this.#options.namespace}/${repository.name}.git`;
  }
  #transport(remote: string) {
    return { remote, maxBytes: this.#options.maxBytes, bounds: this.#bounds, ...(this.#options.fetch === undefined ? {} : { fetch: this.#options.fetch }), ...(this.#options.timeoutMs === undefined ? {} : { timeoutMs: this.#options.timeoutMs }) };
  }
  /** One revocation: true, false, or null when the outcome is unknown. */
  async #revoke(name: string, plaintext: string): Promise<boolean | null> {
    try {
      const revoked = await (await this.#options.binding.get(name)).revokeToken(plaintext);
      return typeof revoked === "boolean" ? revoked : null;
    } catch (e) { return codeOf(e) === null ? null : false; }
  }
  /**
   * One read over smart HTTP, with a read token minted for it and revoked
   * after. The service's own report of the remote must be the expected one.
   * The reply must state read scope and an actual expiry. A failed
   * revocation is not proof that the requested TTL was honored.
   */
  async #read<T>(repository: DestinationRepository, read: (source: SmartHttpSource) => Promise<T>, rulesTree = false): Promise<T> {
    repository = { ...repository };
    const remote = this.#remote(repository);
    const handleOf = await this.#options.binding.get(repository.name);
    if (own(await handleOf.info(), "remote") !== remote) return bad();
    const token = await handleOf.createToken("read", READ_TTL);
    const plaintext = plaintextOf(own(token, "plaintext"));
    try {
      if (own(token, "scope") !== "read") return bad();
      endsOf(own(token, "expiresAt"));
      return await read(new SmartHttpSource({ ...this.#transport(remote), ...(rulesTree ? rulesTreeIsolation(this.#options.maxBytes) : {}), authorization: `Bearer ${plaintext}` }));
    } finally {
      try { await handleOf.revokeToken(plaintext); } catch { /* no confirmed revocation; the reported expiry remains the service's assertion */ }
    }
  }
}
