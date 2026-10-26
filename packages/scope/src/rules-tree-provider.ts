/** Provider-side collection of the bounded rules certificate payload.
 * The helper never resolves or lists refs, or requests parents, blobs or a
 * full closure. Isolated HTTP still reads the info/refs advertisement. Native outcome
 * and publish must independently verify the resulting proof and bindings. */
import { canonicalize, utf8 } from "@generalbusiness/dap-bytes";
import { GitRefusal, READ_BOUNDS, Reader, objectId, parseCommit, parseTree, type GitSource, type ReadBounds, type TreeEntry } from "@generalbusiness/dap-git";

export interface RulesTreeRequest { commit: string; maxCanonicalBytes: number }
export interface RulesTreeObjects { commitBytes: Uint8Array; trees: readonly { id: string; bytes: Uint8Array }[] }
// These mirror the native verifier's admission bounds, not transport quotas.
const MAX_CANONICAL_BYTES = 262144;
const MAX_OBJECT_BYTES = 196608;
const MAX_VISITS = 20000;
const MAX_DEPTH = 64; // root is level1, as in the native verifier
const MAX_PATH_BYTES = 4096;
const MAX_EXPANDED_BYTES = 4194304;
const EMPTY_PAYLOAD_BYTES = utf8(canonicalize({ commitBytes: "", trees: [] })).length;
const refused = (): never => { throw new GitRefusal("too-large", "rules tree proof"); };

/** Strict isolated v0 reads request deepen1/filter tree:0 and require one
 * wanted object per pack. Missing server capabilities refuse; no closure
 * fallback. Transport wire/work allowance is separate from retained proof. */
export function rulesTreeIsolation(maxBytes: number) {
  const wire = Math.min(maxBytes, MAX_CANONICAL_BYTES);
  // SmartHttp reserves16*wire for working payload and charges both retained
  // and issued object bytes. Allow one wire for each; proof decoded bytes
  // remain independently capped below. This is not a peak-memory measurement.
  return { maxBytes: wire, isolateObjects: { ownedBytes: wire * 18 } };
}

/** Own the request before the provider's first await. Invalid requests do not
 * look up a repository, mint a token or open an HTTP source. */
export function rulesTreeRequest(request: RulesTreeRequest): RulesTreeRequest {
  const { commit, maxCanonicalBytes } = request;
  objectId(commit, "rules tree commit"); // SHA-1 only; zero is not an object
  if (!Number.isSafeInteger(maxCanonicalBytes) || maxCanonicalBytes < EMPTY_PAYLOAD_BYTES || maxCanonicalBytes > MAX_CANONICAL_BYTES) return refused();
  return { commit, maxCanonicalBytes };
}

/** The allowance covers the exact canonical JSON object
 * {commitBytes:base64,trees:[{id,bytes:base64}...]}, including its punctuation.
 * The host must reserve the rest of its certificate envelope separately and
 * check the final complete envelope. No encoded object is retained here. */
export async function readRulesTree(source: GitSource, request: RulesTreeRequest, bounds: ReadBounds = READ_BOUNDS): Promise<RulesTreeObjects> {
  const asked = rulesTreeRequest(request);
  bounds = { ...bounds };
  let remaining = asked.maxCanonicalBytes - EMPTY_PAYLOAD_BYTES;
  let decodedRemaining = MAX_OBJECT_BYTES;
  const rows = new Map<string, { bytes: Uint8Array; entries: readonly TreeEntry[] }>();
  const read = async (id: string, kind: "commit" | "tree", metadata: number): Promise<Uint8Array> => {
    if (metadata > remaining) return refused();
    // Reserve exact row punctuation/ID before requesting its object. The
    // encoded-size limit is translated to a raw Reader.object limit first.
    remaining -= metadata;
    const limit = Math.min(kind === "commit" ? bounds.commitBytes : bounds.treeBytes, decodedRemaining, Math.floor(remaining / 4) * 3);
    if (!Number.isSafeInteger(limit) || limit < 0) return refused();
    const reader = new Reader(source, { ...bounds, commitBytes: limit, treeBytes: limit });
    const bytes = await reader.object(id, kind, "rules tree object");
    const encodedBytes = Math.ceil(bytes.length / 3) * 4;
    if (encodedBytes > remaining || bytes.length > decodedRemaining) return refused();
    remaining -= encodedBytes;
    decodedRemaining -= bytes.length;
    // Hash/type/size and allowance checks precede this retained owned copy.
    return new Uint8Array(bytes);
  };
  const commitBytes = await read(asked.commit, "commit", 0);
  const root = parseCommit(commitBytes, { parents: 64 }).tree;
  let treeVisits = 0, leaves = 0, expandedBytes = 0;
  const decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
  const stack: { entries: readonly TreeEntry[]; index: number; pathBytes: number }[] = [];
  const enter = async (id: string, pathBytes: number): Promise<void> => {
    if (++treeVisits > MAX_VISITS || stack.length >= MAX_DEPTH) return refused();
    let row = rows.get(id);
    if (!row) {
      if (rows.size >= MAX_VISITS) return refused();
      const metadata = utf8(canonicalize({ id, bytes: "" })).length + (rows.size ? 1 : 0);
      const bytes = await read(id, "tree", metadata);
      row = { bytes, entries: parseTree(bytes) };
      rows.set(id, row);
    }
    stack.push({ entries: row.entries, index: 0, pathBytes });
  };
  await enter(root, 0);
  while (stack.length) {
    const frame = stack[stack.length - 1]!;
    if (frame.index === frame.entries.length) { stack.pop(); continue; }
    const entry = frame.entries[frame.index++]!;
    if (entry.kind === "gitlink") throw new GitRefusal("gitlink", "rules tree entry");
    const name = decoder.decode(entry.name);
    if (!name || name === "." || name === ".." || name.includes("/") || name.includes("\\") || name.includes("\0")) throw new GitRefusal("bad-path", "rules tree entry");
    const pathBytes = frame.pathBytes + (frame.pathBytes ? 1 : 0) + entry.name.length;
    if (pathBytes > MAX_PATH_BYTES || pathBytes > MAX_EXPANDED_BYTES - expandedBytes) return refused();
    expandedBytes += pathBytes;
    if (entry.kind === "tree") await enter(entry.id, pathBytes);
    else if (++leaves > MAX_VISITS) return refused();
  }
  return { commitBytes, trees: [...rows].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([id, row]) => ({ id, bytes: row.bytes })) };
}
