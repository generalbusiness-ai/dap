/** Operator observations, not registration proof or a global scope inventory. */
import type { Digest, ScopeRef, Seed, Sealed, Read } from "@generalbusiness/dap-contract";
import { canonicalize, factRefOf, isDigest, isRecord, isScopeRef, isSeed, isSealed, parseStrict, scopeIdOf, utf8 } from "@generalbusiness/dap-bytes";

export const INDEX_INVENTORY_BOUNDS = Object.freeze({ scopes: 4096, pages: 4096, pagesPerScope: 1000, bytes: 16 * 1024 * 1024 });
export interface IndexScope { readonly at: ScopeRef; readonly genesis: Digest }
export interface IndexManifest { readonly v: 1; readonly service: string; readonly root: ScopeRef; readonly scopes: readonly IndexScope[] }
export interface IndexReads {
  entry(scope: ScopeRef["scope"], seq: number): Promise<Read<Sealed>>;
  history(scope: ScopeRef["scope"], cursor?: string): Promise<Read<readonly Sealed[]>>;
}
const fail = (why: string): never => { throw new Error(`Scope inventory incomplete: ${why}`); };
const exact = (v: Record<string, unknown>, keys: string[]) => Object.keys(v).length === keys.length && keys.every(k => Object.hasOwn(v, k));
export function indexService(value: string): string {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash || value.length > 2048) throw Error("Invalid configured service");
  return url.href.replace(/\/+$/, "");
}
export function readIndexManifest(bytes: Uint8Array, service: string, root: ScopeRef): IndexManifest {
  if (bytes.length > INDEX_INVENTORY_BOUNDS.bytes) throw Error("Scope manifest exceeds 16 MiB");
  const value: unknown = parseStrict(new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(bytes));
  if (!isRecord(value) || !exact(value, ["v", "service", "root", "scopes"]) || value["v"] !== 1
    || value["service"] !== indexService(service) || !isScopeRef(value["root"]) || canonicalize(value["root"]) !== canonicalize(root)
    || root.kind !== "directory" || !Array.isArray(value["scopes"]) || value["scopes"].length === 0 || value["scopes"].length > INDEX_INVENTORY_BOUNDS.scopes) throw Error("Scope manifest does not match this configured room");
  const scopes: IndexScope[] = []; let previous = "";
  for (const raw of value["scopes"]) {
    if (!isRecord(raw) || !exact(raw, ["at", "genesis"]) || !isScopeRef(raw["at"]) || !isDigest(raw["genesis"]) || raw["at"].scope <= previous) throw Error("Invalid or duplicate scope manifest row");
    previous = raw["at"].scope; scopes.push({ at: { ...raw["at"] }, genesis: raw["genesis"] });
  }
  if (!scopes.some(row => canonicalize(row.at) === canonicalize(root))) throw Error("Scope manifest omits its configured root");
  return { v: 1, service: indexService(service), root: { ...root }, scopes };
}
function checked(sealed: Sealed, scope: ScopeRef["scope"], seq: number, at?: ScopeRef): Sealed {
  if (!isSealed(sealed) || sealed.entry.at.scope !== scope || sealed.entry.seq !== seq || factRefOf(sealed.entry).hash !== sealed.hash
    || at && canonicalize(sealed.entry.at) !== canonicalize(at)) return fail(`wrong entry identity/hash for ${scope}:${seq}`);
  return sealed;
}
function genesis(sealed: Sealed, scope: ScopeRef["scope"], at?: ScopeRef, seed?: Seed): IndexScope {
  checked(sealed, scope, 0, at);
  const entry = sealed.entry, input = entry.input;
  if (entry.prev !== null || input.type !== "genesis" || input.decision !== "applied" || input.inc !== entry.at.inc
    || input.seed.kind !== entry.at.kind || scopeIdOf(input.seed) !== scope || seed && canonicalize(input.seed) !== canonicalize(seed)) return fail(`no matching applied genesis for ${scope}`);
  return { at: { ...entry.at }, genesis: sealed.hash };
}
/** Seed.ordinal counts creations, not all sends. A child genesis's result
 * can occupy send.n=0 before its first create at n=1/ordinal=0. */
function creationEdge(source: Sealed, child: Sealed, n: number): IndexScope {
  const sends = source.entry.sends;
  if (!sends.every((send, index) => send.n === index)) return fail("unordered actual creation sends");
  const send = sends[n], input = child.entry.input;
  if (!send || !isSeed(send.to) || send.message.class !== "request" || send.message.type !== "create"
    || input.type !== "genesis" || input.message?.class !== "request" || input.message.type !== "create"
    || canonicalize(input.message) !== canonicalize(send.message) || input.n !== n
    || canonicalize(input.source) !== canonicalize(factRefOf(source.entry))
    || canonicalize(send.to.creator) !== canonicalize(source.entry.at)) return fail("child does not match its actual creation envelope");
  const ordinal = sends.slice(0, n).filter(prior => prior.message.class === "request" && prior.message.type === "create").length;
  if (send.to.ordinal !== ordinal) return fail("creation seed ordinal is not its creation rank");
  return genesis(child, scopeIdOf(send.to), undefined, send.to);
}
/** No mutation is requested. The authenticated deployment's recorded applied
 * contents are observed; this is not independent replay of native judgment. */
export async function captureIndexManifest(service: string, root: ScopeRef, reads: IndexReads): Promise<IndexManifest> {
  if (!isScopeRef(root) || root.kind !== "directory") return fail("configured Directory full reference required");
  const canonicalService = indexService(service);
  const readGenesis = async (scope: ScopeRef["scope"]) => {
    const got = await reads.entry(scope, 0);
    if (!got.ok) return fail(`${scope}: ${got.reason}`);
    return got.value;
  };
  const first = await readGenesis(root.scope), rootRow = genesis(first, root.scope, root);
  const rootInput = first.entry.input;
  if (rootInput.type !== "genesis" || rootInput.seed.creator?.kind !== "register") return fail("Directory does not name its Register creator");
  const register = rootInput.seed.creator;
  const rows = new Map<string, IndexScope>([[root.scope, rootRow]]);
  const registerBirth = await readGenesis(register.scope);
  rows.set(register.scope, genesis(registerBirth, register.scope, register));
  if (!rootInput.source || canonicalize(rootInput.source.at) !== canonicalize(register) || rootInput.n === null) return fail("Directory lacks its exact Register creation fact");
  const made = await reads.entry(register.scope, rootInput.source.seq);
  if (!made.ok) return fail(`Register creation fact unavailable: ${made.reason}`);
  checked(made.value, register.scope, rootInput.source.seq, register);
  if (made.value.hash !== rootInput.source.hash || canonicalize(creationEdge(made.value, first, rootInput.n)) !== canonicalize(rootRow)) return fail("Directory seed does not match its actual Register send");
  const seeds = new Map<string, Seed>([[root.scope, rootInput.seed]]);
  const births = new Map<string, Sealed>([[root.scope, first], [register.scope, registerBirth]]);
  // Register's other room creations are intentionally never traversed.
  const queue: IndexScope[] = [rootRow]; let pages = 0;
  const add = (row: IndexScope) => {
    const prior = rows.get(row.at.scope);
    if (prior && canonicalize(prior) !== canonicalize(row)) return fail(`conflicting identity for ${row.at.scope}`);
    if (!prior) {
      if (rows.size >= INDEX_INVENTORY_BOUNDS.scopes) return fail("4096-scope bound reached");
      rows.set(row.at.scope, row); queue.push(row);
    }
  };
  for (let i = 0; i < queue.length; i++) {
    const owner = queue[i]!; let next = 0, previous: Digest | null = null, cursor: string | undefined;
    const cursors = new Set<string>();
    for (let n = 0;; n++) {
      if (n >= INDEX_INVENTORY_BOUNDS.pagesPerScope || pages >= INDEX_INVENTORY_BOUNDS.pages) return fail("history page bound reached");
      pages++;
      const page = await reads.history(owner.at.scope, cursor);
      if (!page.ok) return fail(`${owner.at.scope}: ${page.reason}`);
      for (const raw of page.value) {
        const sealed = checked(raw, owner.at.scope, next, owner.at), entry = sealed.entry;
        if (entry.prev !== previous || next === 0 && sealed.hash !== owner.genesis) return fail(`broken discovery chain for ${owner.at.scope}:${next}`);
        previous = sealed.hash; next++;
        for (const send of entry.sends) {
          if (!isSeed(send.to)) continue;
          const seed = send.to;
          if (canonicalize(seed.creator) !== canonicalize(owner.at)) return fail("creation seed names another creator");
          const id = scopeIdOf(seed);
          if (rows.has(id)) {
            if (canonicalize(seeds.get(id) ?? null) !== canonicalize(seed)) return fail("conflicting repeated creation seed");
            creationEdge(sealed, births.get(id)!, send.n);
            continue;
          }
          if (rows.size >= INDEX_INVENTORY_BOUNDS.scopes) return fail("4096-scope bound reached");
          const birth = await readGenesis(id), row = creationEdge(sealed, birth, send.n);
          seeds.set(id, seed); births.set(id, birth); add(row);
        }
      }
      if (page.next === undefined) {
        if (!page.complete || page.at.seq !== next - 1 || page.at.hash !== previous) return fail("history did not reach its recorded head");
        break;
      }
      if (!page.value.length || page.next.length > 1024 || cursors.has(page.next)) return fail("nonadvancing or oversized history cursor");
      cursors.add(page.next); cursor = page.next;
    }
    if (next === 0) return fail(`empty history for ${owner.at.scope}`);
  }
  const manifest: IndexManifest = { v: 1, service: canonicalService, root: { ...root }, scopes: [...rows.values()].sort((a, b) => a.at.scope < b.at.scope ? -1 : a.at.scope > b.at.scope ? 1 : 0) };
  if (utf8(canonicalize(manifest)).length > INDEX_INVENTORY_BOUNDS.bytes) return fail("manifest byte bound reached");
  return manifest;
}
export interface IndexVerification {
  readonly listed: number; readonly verified: number; readonly unavailable: number; readonly mismatch: number;
  readonly rows: readonly { readonly at: ScopeRef; readonly result: "verified" | "unavailable" | "mismatch"; readonly reason?: string }[];
}
/** Exactly the listed reads; register mode may write as a consequence. No
 * mode is inferred and no registration or global completeness is asserted. */
export async function verifyIndexManifest(manifest: IndexManifest, reads: IndexReads): Promise<IndexVerification> {
  const rows: { at: ScopeRef; result: "verified" | "unavailable" | "mismatch"; reason?: string }[] = [];
  let verified = 0, unavailable = 0, mismatch = 0;
  for (const row of manifest.scopes) {
    try {
      const got = await reads.entry(row.at.scope, 0);
      if (!got.ok) { unavailable++; rows.push({ at: row.at, result: "unavailable", reason: got.reason }); continue; }
      let actual: IndexScope;
      try { actual = genesis(got.value, row.at.scope, row.at); }
      catch { mismatch++; rows.push({ at: row.at, result: "mismatch", reason: "genesis-identity" }); continue; }
      if (actual.genesis !== row.genesis) { mismatch++; rows.push({ at: row.at, result: "mismatch", reason: "genesis-hash" }); continue; }
      verified++; rows.push({ at: row.at, result: "verified" });
    } catch { unavailable++; rows.push({ at: row.at, result: "unavailable", reason: "read-failed" }); }
  }
  return { listed: manifest.scopes.length, verified, unavailable, mismatch, rows };
}
