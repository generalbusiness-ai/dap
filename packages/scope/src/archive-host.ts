/** Fixture-only archive credentials over the actual smart-HTTP send path.
 * No ledger operation, production mint or credential custody is involved. */
import { same } from "@generalbusiness/dap-bytes";
import type { ScopeRef, Timestamp } from "@generalbusiness/dap-contract";
import { isScopeRef, timeMs } from "@generalbusiness/dap-bytes";
import { GitRefusal, READ_BOUNDS, Reader, type GitSource } from "@generalbusiness/dap-git";
import { journalId, journalRef, type JournalObject } from "@generalbusiness/dap-git/journal";
import { SmartHttpSource } from "@generalbusiness/dap-git/http-read";
import type { SmartHttpOptions } from "@generalbusiness/dap-git/http";
import type { ArchiveCredential, ArchiveProvider, FixtureArchiveProvider } from "./archive-driver.ts";
import type { DestinationRepository } from "./destination-host.ts";
import { sendOnce } from "./github-host.ts";
import { sendArchiveAppend } from "./archive-send.ts";
import { beginArchiveParentRead, type ArchiveParentReadObservation } from "./archive-parent-read-diagnostic.ts";

/** Explicit stand-ins. Production credentials cannot be selected by config. */
export interface ArchiveTokens {
  read(repository: DestinationRepository, allowed: () => boolean): Promise<string | undefined>;
  mint(repository: DestinationRepository, at: ScopeRef, allowed: () => boolean): Promise<ArchiveCredential | null>;
  revoke(credential: ArchiveCredential): Promise<void>;
}
export interface FixtureArchiveTokens extends ArchiveTokens { readonly fixture: "archive-tokens" }
export interface FixtureArchivePorts {
  readonly fixture: "archive-ports";
  readonly tokens: FixtureArchiveTokens;
  readonly clock: () => Timestamp;
}
interface ArchiveTransport {
  /** Trusted host choice for isolated objects only; refs and closures keep v0. */
  readonly isolatedObjectProtocol?: "v2";
  transport(repository: DestinationRepository, plaintext?: string): SmartHttpOptions;
  identity(repository: DestinationRepository, plaintext: string | undefined, allowed: () => boolean): Promise<void>;
}
const bad = (): never => { throw new GitRefusal("unreadable", "archive fixture adapter"); };
const check = (allowed: () => boolean): void => { if (!allowed()) bad(); };

/** Private construction seam used only by the two concrete provider classes.
 * Fixture tags and injected token methods do not certify real-room admission. */
export function fixtureArchiveProvider(ports: FixtureArchivePorts, host: ArchiveTransport): FixtureArchiveProvider {
  if (ports.fixture !== "archive-ports" || ports.tokens.fixture !== "archive-tokens") return bad();
  return { fixture: "archive-provider", ...archiveProvider(ports, host) };
}

/** Trusted host construction only. The token authority remains in the host
 * adapter; no request, ledger binding or fixture tag grants it. */
export function archiveProvider(ports: { readonly tokens: ArchiveTokens; readonly clock: () => Timestamp }, host: ArchiveTransport): ArchiveProvider {
  const { tokens, clock } = ports;
  const isolatedObjectProtocol = host.isolatedObjectProtocol;
  const held = new WeakMap<ArchiveCredential, { repository: DestinationRepository; at: ScopeRef; ref: string; original: ArchiveCredential }>();
  const source = async (repository: DestinationRepository, allowed: () => boolean, most?: { bytes: number; objects: number }, isolated = false, observation?: ArchiveParentReadObservation, reserveObjects?: (count: number) => void): Promise<SmartHttpSource> => {
    check(allowed); repository = { ...repository }; host.transport(repository); // Validate before the first port call.
    observation?.phase("token");
    const plaintext = await tokens.read({ ...repository }, allowed); check(allowed);
    observation?.phase("identity");
    await host.identity(repository, plaintext, allowed); check(allowed);
    const transport = host.transport(repository, plaintext);
    const maxBytes = Math.min(transport.maxBytes, most?.bytes ?? transport.maxBytes);
    const originalFetch = transport.fetch ?? ((request: Request) => fetch(request));
    return new SmartHttpSource({ ...transport, maxBytes,
      ...(observation ? { fetch: async function(this: unknown, request: Request) {
        const get = request.method === "GET";
        observation.phase(get ? "advertisement-request" : "object-request");
        const response = await originalFetch.call(this, request);
        observation.phase(get ? "advertisement-response" : "object-response");
        return response;
      } } : {}),
      ...(most === undefined ? {} : { bounds: { ...(transport.bounds ?? READ_BOUNDS), closureObjects: Math.min(transport.bounds?.closureObjects ?? READ_BOUNDS.closureObjects, most.objects) } }),
      ...(isolated ? { isolateObjects: { ownedBytes: maxBytes * 17,
        ...(isolatedObjectProtocol === undefined ? {} : { protocol: isolatedObjectProtocol }),
        ...(reserveObjects === undefined ? {} : { reserveObjects }) } } : {}) });
  };
  const ref = async (repository: DestinationRepository, name: string, allowed: () => boolean): Promise<string | null> => {
    const input = await source(repository, allowed);
    const value = await new Reader(input).ref(name); check(allowed); return value;
  };
  return {
    async format(repository, allowed) {
      const input = await source(repository, allowed);
      await input.refs("refs/heads/", 8192); check(allowed); return "sha1";
    },
    ref,
    async readObject(repository, object, allowed, budget) {
      check(allowed);
      const id = journalId("sha1", object.id), maximum = object.maximum, type = object.type;
      if (!Number.isSafeInteger(maximum) || maximum < 1 || maximum > 8 * 1024 * 1024 || type !== "commit" && type !== "tree" && type !== "blob") return bad();
      // A wanted-object exchange has a small, separately bounded allowance
      // for advertisement, framing and v2 blob:none companion trees. Larger
      // replies refuse; no closure fallback tops up the original budget.
      const wire = maximum + 8 * 1024;
      const v2 = isolatedObjectProtocol === "v2";
      // A valid entry needs at least one header byte and eight zlib bytes,
      // besides the pack's header/trailer. The transport can reduce this
      // count further; this is not a new platform quota or a cache grant.
      const objects = v2 ? Math.min(READ_BOUNDS.closureObjects, Math.floor((wire - 32) / 9)) : 1;
      // One exact-object HTTP negotiation/decode, with bounded advertisement
      // and wire work, spends the native pass's original allowance before I/O.
      budget.spend({ calls: 2, metadata: 1024, inputWork: wire * 32 + (v2 ? 1024 : 0) });
      const observation = beginArchiveParentRead(budget, type, maximum);
      try {
        // Header count is checked before this synchronous reservation, and
        // no per-entry records, maps, reference arrays or inflation precede it. Price
        // their records, SHA-1 keys and dependency/ready/result memberships
        // conservatively at 1024 units per actual entry, in both ledgers.
        // This is logical work accounting, not measured engine heap. Wire
        // and base metadata were already charged; failed admission refunds
        // nothing and exposes no object. V0 retains its original cost/mode.
        const reserveObjects = v2 ? (count: number) => { budget.spend({ metadata: count * 1024, inputWork: count * 1024 }); } : undefined;
        const input = await source(repository, allowed, { bytes: wire, objects }, true, observation, reserveObjects);
        observation.phase("object");
        const value = await input.object(id, maximum); check(allowed);
        if (value.type !== type) return bad();
        observation.phase("complete");
        return value;
      } catch (error) { observation.refused(error); throw error; }
    },
    async objects(repository, commit, most, allowed) {
      const maximum = { ...most };
      if (!Number.isSafeInteger(maximum.bytes) || maximum.bytes < 32 || maximum.bytes > 8 * 1024 * 1024 || !Number.isSafeInteger(maximum.objects) || maximum.objects < 1 || maximum.objects > 8192) return bad();
      const input = await source(repository, allowed, maximum);
      const collected = new Map<string, JournalObject>(); let bytes = 0;
      const recording: GitSource = {
        object: async (id, limit) => {
          check(allowed);
          if (!collected.has(id) && collected.size >= maximum.objects) return bad();
          const prior = collected.get(id);
          if (prior) return { type: prior.type, size: prior.data.length, data: prior.data.length <= limit ? prior.data : null };
          const object = await input.object(id, Math.min(limit, maximum.bytes - bytes)); check(allowed);
          if (object.data === null || object.size !== object.data.length || object.size > maximum.bytes - bytes || !["blob", "tree", "commit"].includes(object.type)) return bad();
          bytes += object.size;
          collected.set(id, { id, type: object.type as JournalObject["type"], data: new Uint8Array(object.data) });
          return object;
        },
        ref: name => input.ref(name), refs: (prefix, limit) => input.refs(prefix, limit),
      };
      if (!(await new Reader(recording, { ...READ_BOUNDS, closureObjects: maximum.objects }).closure(commit)).complete) return bad();
      check(allowed); return [...collected.values()];
    },
    async mintArchive(repository, at, allowed) {
      check(allowed); repository = { ...repository }; at = { ...at };
      if (!isScopeRef(at)) return bad();
      const ref = journalRef(at.scope); host.transport(repository);
      const original = await tokens.mint({ ...repository }, { ...at }, allowed);
      check(allowed);
      if (!original) return null;
      const credential = Object.freeze({ id: original.id, ends: original.ends, plaintext: original.plaintext });
      const ends = timeMs(credential.ends), now = timeMs(clock());
      if (typeof credential.id !== "string" || credential.id.length === 0 || credential.id.length > 256 || typeof credential.plaintext !== "string" || credential.plaintext.length === 0 || credential.plaintext.length > 4096 || ends === null || now === null || ends <= now) return bad();
      held.set(credential, { repository, at, ref, original }); return credential;
    },
    async sendArchive(request) {
      // Capture primitives and native identity before any await. A caller's
      // later mutation cannot widen the ref, repository or credential binding.
      const { credential, ref: name, old, commit, allowed } = request;
      const repository = { ...request.repository }, at = { ...request.at };
      const valid = (): boolean => {
        const binding = held.get(credential), now = timeMs(clock()), ends = timeMs(credential.ends);
        return !!binding && isScopeRef(at) && name === journalRef(at.scope) && binding.ref === name && same(binding.at, at) && same(binding.repository, repository) && now !== null && ends !== null && now < ends && allowed();
      };
      check(valid);
      if (!Array.isArray(request.objects) || request.objects.length > 8192) return bad();
      const transport = host.transport(repository, credential.plaintext);
      if (request.incremental) return sendArchiveAppend({ ...request, repository, at, ref: name, old, commit, allowed: valid }, transport, () => ref(repository, name, valid));
      // sendOnce owns all supplied object bytes before its first await and
      // checks this binding again through SmartHttpGit.beforeSend after discovery.
      return sendOnce({ ref: name, old, commit, objects: request.objects.map(object => ({ id: object.id, kind: object.type, body: object.data })), requireParentless: old === null, allowed: valid }, transport, () => ref(repository, name, valid));
    },
    async revokeArchive(credential) {
      const binding = held.get(credential); held.delete(credential);
      if (binding) await tokens.revoke(binding.original);
    },
  };
}
