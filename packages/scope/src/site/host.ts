/**
 * What the site route reads before it renders: the room that a directory
 * scope ID names, and the room's repository at its Git host.
 *
 * The room is read from the directory's genesis entry: the repository
 * record `{ host, namespace, name, id }` and the published branch, which
 * the register's `create` gave it. The entry is read through the object's
 * `siteRoom` method, which checks no reader and starts no outside work.
 * Only a directory that the register pinned in the host's
 * setting created is a room here, as only that register and its
 * destinations may use the host (`host-wiring.ts`, `hostBound`).
 *
 * The repository is read over smart HTTP, as the destinations read it: on
 * Cloudflare Artifacts with a privately shared expiring read token; on GitHub with the deployment's `GITHUB_READ_TOKEN`, or
 * with none when the setting says reads are public.
 */
import { isRecord } from "@generalbusiness/dap-bytes";
import type { Entry, ScopeId } from "@generalbusiness/dap-contract";
import { canonicalize, isScopeId, isScopeRef, parseStrict, scopeIdOf } from "@generalbusiness/dap-bytes";
import { isOf, UNPUBLISHED_COHORT } from "@generalbusiness/dap-platform";
import { READ_BOUNDS, type GitSource } from "@generalbusiness/dap-git";
import { githubRepository, type GitHubAccount } from "@generalbusiness/dap-git/github";
import { requireGitHubRepositoryIdentity } from "../github-host.ts";
import { SmartHttpSource } from "@generalbusiness/dap-git/http-read";
import { ARTIFACTS_HOST, artifactsReadiness, type ArtifactsBindings } from "../artifacts-wiring.ts";
import { SCOPE_INDEX_NAME, type ScopeIndexEnvironment } from "../scope-index.ts";
import type { SiteTokenPort } from "./token-reuse.ts";
import type { DestinationRepository } from "../destination-host.ts";
import { gitHubReadiness, type GitHubBindings } from "../github-wiring.ts";
import type { Binding, Sourced } from "../namespace.ts";
import type { Publication, PublishedCommitSelection, SitePublicationPeer } from "./publication.ts";

export const GITHUB_HOST = "github.com";

/** A room as its directory's genesis records it. */
export interface Room {
  /** The register that created the directory. */
  register: ScopeId;
  repository: DestinationRepository;
  /** The published branch's name, without `refs/heads/`. */
  branch: string;
}
export interface UnpublishedRoom { register: ScopeId; repository: null; branch: string }

/** Read the room's confirmed destination and its publication, never provider refs. */
export async function publicationOf(scopes: Binding, directory: string, room: Room): Promise<Publication | null> {
  const directoryObject = scopes.get(scopes.idFromName(directory)) as SitePublicationPeer & { siteRoom(): Promise<Sourced | null> };
  const source = await directoryObject.siteRoom();
  if (!source || source.at.scope !== directory || source.at.kind !== "directory") return null;
  const destination = await directoryObject.siteDestination();
  if (!destination || destination.kind !== "destination") return null;
  const object = scopes.get(scopes.idFromName(destination.scope)) as SitePublicationPeer;
  const publication = await object.sitePublication(source.at, room.repository);
  if (!publication || canonicalize(publication.at) !== canonicalize(destination)) return null;
  return publication;
}

/** Validate the complete native identity at the internal immutable selector boundary. */
export async function publishedCommitOf(scopes: Binding, directory: string, room: Room, commit: string): Promise<PublishedCommitSelection> {
  const absent = { ok: false, reason: "not-published" } as const;
  const directoryObject = scopes.get(scopes.idFromName(directory)) as SitePublicationPeer & { siteRoom(): Promise<Sourced | null> };
  const source = await directoryObject.siteRoom();
  if (!source || source.at.scope !== directory || source.at.kind !== "directory") return absent;
  const destination = await directoryObject.siteDestination();
  if (!destination || destination.kind !== "destination") return absent;
  const object = scopes.get(scopes.idFromName(destination.scope)) as SitePublicationPeer;
  const selected = await object.sitePublishedCommit(source.at, room.repository, commit);
  if (!selected.ok) return selected;
  const proof = selected.proof;
  return canonicalize(proof.at) === canonicalize(destination) && canonicalize(proof.directory) === canonicalize(source.at)
    && canonicalize(proof.repository) === canonicalize(room.repository) && proof.commit === commit ? selected : absent;
}

/** A request-local repository source. Closing it never revokes a shared token. */
export interface Opened {
  source: GitSource;
  close(): Promise<void>;
  /** The last request the source sent and what came back, query left out, for a log line. Empty before the first. */
  last(): string;
  /** The secrets this read holds, which a log line must not show. */
  secrets: readonly string[];
}

/** The steps of a read, as a refusal's `x-site-step` header and the log name them. */
export type SiteStep = "room" | "open" | "info" | "token" | "refs" | "objects" | "render";

/** Finite token-owner refusal; never contains provider details or plaintext. */
export class SiteTokenUnavailable extends Error { constructor() { super("Site token unavailable"); this.name = "SiteTokenUnavailable"; } }

/** An error of one step of opening a repository. */
export class StepError extends Error {
  readonly step: SiteStep;
  constructor(step: SiteStep, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "StepError";
    this.step = step;
  }
}

/** A remote URL as compared with the service's report: no trailing `/`, and no `.git` at the end. */
export const sameRemote = (reported: unknown, expected: string): boolean => {
  const bare = (url: string) => url.replace(/\/+$/, "").replace(/\.git$/, "");
  return typeof reported === "string" && bare(reported) === bare(expected);
};

/** Run one step: an error of it is a `StepError` of that step, its class and message kept. */
async function step<T>(name: SiteStep, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (e) {
    if (e instanceof StepError) throw e;
    throw new StepError(name, e instanceof Error ? `${e.name}: ${e.message}` : String(e), { cause: e });
  }
}

/** The bindings the site reads: the scope namespace and the two hosts' settings. */
export interface SiteEnv extends GitHubBindings, ArtifactsBindings, ScopeIndexEnvironment {
  SCOPES: Binding;
}

const REPOSITORY_NAME = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/;
const recordOrNull = (value: unknown): Record<string, unknown> | null => isRecord(value) ? value : null;

/**
 * The room that the directory `directory` is, or null when it is none: no
 * such scope, no directory, a genesis that was refused, or a record out of
 * form. A source that cannot answer rejects.
 */
export async function roomOf(scopes: Binding, directory: string): Promise<Room | UnpublishedRoom | null> {
  if (!isScopeId(directory)) return null;
  const object = scopes.get(scopes.idFromName(directory)) as { siteRoom(): Promise<Sourced | null> };
  const sourced = await object.siteRoom();
  if (!sourced || sourced.at.kind !== "directory" || sourced.at.scope !== directory || sourced.bytes === null) return null;
  const entry = parseStrict(sourced.bytes) as unknown as Entry;
  const input = entry.input;
  if (input.type !== "genesis" || input.decision !== "applied" || !isOf(input.seed.definition, "platform:directory") || input.seed.creator?.kind !== "register") return null;
  const fields = recordOrNull(recordOrNull(input.message?.body)?.["fields"]);
  const repository = recordOrNull(fields?.["repository"]);
  const branch = fields?.["branch"];
  if (input.seed.definition === UNPUBLISHED_COHORT.directory && fields && !Object.hasOwn(fields, "repository")
    && typeof branch === "string" && input.seed.kind === "directory" && scopeIdOf(input.seed) === directory
    && isScopeRef(entry.at) && canonicalize(entry.at) === canonicalize(sourced.at) && input.inc === sourced.at.inc
    && isScopeRef(input.seed.creator) && input.seed.creator.kind === "register") return { register: input.seed.creator.scope, repository: null, branch };
  if (!repository || typeof branch !== "string") return null;
  const { host, namespace, name, id } = repository;
  if (Object.keys(repository).length !== 4 || typeof host !== "string" || typeof namespace !== "string" || typeof name !== "string" || typeof id !== "string") return null;
  return { register: input.seed.creator.scope, repository: { host, namespace, name, id }, branch };
}

/**
 * How to read a room's repository at its host, or null when this
 * deployment cannot: the host is not configured, the room was not created
 * by the host's pinned register, or the record is not at the host's
 * namespace.
 */
export function readerOf(env: SiteEnv, room: Room, fetch?: (request: Request) => Promise<Response>, publishedRef = `refs/heads/${room.branch}`): (() => Promise<Opened>) | null {
  const { repository } = room;
  const send = fetch ?? ((request: Request) => globalThis.fetch(request));
  // Each source records its last request and answer, for the log line of a failed read. No header and no query is kept.
  const transport = (remote: string, maxBytes: number, authorization?: string) => {
    let last = "";
    const traced = async (request: Request): Promise<Response> => {
      const url = new URL(request.url);
      const asked = `${request.method} ${url.origin}${url.pathname}`;
      try {
        const response = await send(request);
        last = `${asked} -> ${response.status} ${response.headers.get("content-type") ?? "no content-type"}`;
        return response;
      } catch (e) {
        last = `${asked} -> ${e instanceof Error ? e.name : "error"}`;
        throw e;
      }
    };
    return { source: new SmartHttpSource({ remote, maxBytes: Math.min(maxBytes, 16 * 1024 * 1024), bounds: { ...READ_BOUNDS, commitBytes: 1024 * 1024, treeBytes: 8 * 1024 * 1024, blobBytes: 1024 * 1024 + 1, closureObjects: 4096, refs: 4096 }, ...(authorization === undefined ? {} : { authorization }), fetch: traced }), last: () => last };
  };
  if (repository.host === ARTIFACTS_HOST) {
    const ready = artifactsReadiness(env);
    if (ready.state !== "wired") return null;
    const { config } = ready, service = config.host;
    if (config.namespace !== repository.namespace || config.registerScope !== room.register) return null;
    if (!REPOSITORY_NAME.test(repository.name) || repository.name.toLowerCase().endsWith(".git") || repository.id !== repository.name) return null;
    const remote = `https://${service}/git/${repository.namespace}/${repository.name}.git`;
    return async () => {
      // The fixed owner derives provider authority from its own current env.
      // This expected identity prevents a changed owner config being paired
      // with this request's older transport or native publication selection.
      let answer: Awaited<ReturnType<SiteTokenPort["acquireSiteRead"]>>;
      try {
        if (!env.SCOPE_INDEX) throw Error("missing Site token owner");
        const owner = env.SCOPE_INDEX.get(env.SCOPE_INDEX.idFromName(SCOPE_INDEX_NAME)) as SiteTokenPort;
        answer = await owner.acquireSiteRead({ register: room.register, repository, ref: publishedRef, configuration: canonicalize(config) });
      } catch { throw new SiteTokenUnavailable(); }
      if (!answer.ok) {
        if (answer.reason === "provider") throw new StepError(answer.step, "Artifacts Site acquisition failed");
        throw new SiteTokenUnavailable();
      }
      let local: ReturnType<typeof transport> | null = transport(remote, config.maxBytes, `Bearer ${answer.plaintext}`);
      const secrets = [answer.plaintext];
      const active = () => { if (!local) throw new Error("Site reader closed"); return local; };
      return {
        source: { ref: name => active().source.ref(name), refs: (prefix, limit) => active().source.refs(prefix, limit), object: (id, limit) => active().source.object(id, limit) },
        last: () => local?.last() ?? "", secrets,
        close: async () => { local = null; secrets.length = 0; },
      };
    };
  }
  if (repository.host === GITHUB_HOST) {
    const ready = gitHubReadiness(env);
    if (ready.state !== "wired") return null;
    const { config, read: token } = ready, login = config.account.login;
    if (login !== repository.namespace || config.registerScope !== room.register) return null;
    if (!/^[A-Za-z0-9_.-]{1,100}$/.test(repository.name) || repository.name === "." || repository.name === ".." || repository.name.toLowerCase().endsWith(".git")) return null;
    const publicReads = config["publicReads"] === true;
    if (!publicReads && (typeof token !== "string" || !/^[A-Za-z0-9_.-]{1,4096}$/.test(token))) return null;
    const remote = `https://github.com/${repository.namespace}/${repository.name}.git`;
    const authorization = publicReads ? undefined : `Basic ${btoa(`x-access-token:${token!}`)}`;
    return async () => {
      await step("info", () => requireGitHubRepositoryIdentity((name, plaintext) => githubRepository({ account: config["account"] as unknown as GitHubAccount, fetch: send }, name, plaintext), repository, publicReads ? undefined : token!));
      return { ...transport(remote, config.maxBytes, authorization), secrets: publicReads ? [] : [token!], close: async () => {} };
    };
  }
  return null;
}
