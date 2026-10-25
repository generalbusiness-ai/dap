/** Complete, bounded SHA-1 tree proofs for the next rules policy.
 * This verifies a captured head, not the freshness of a later publish.
 * No provider, clock, storage or external ref is consulted here. */
import type { Digest, ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize, isDigest, isScopeRef, parseStrict, unb64url } from "@generalbusiness/dap-bytes";
import { valueDigest } from "@generalbusiness/dap-derive";
import { idOf, parseCommit, parseTree, type TreeEntry } from "@generalbusiness/dap-git/tree-proof";
import { matches } from "./extents.ts";

export const RULES_TREE_PROOF = { domain: "artroom-rules-tree-1", max: 262144 } as const;
/** Depth counts the root tree as level1, so at most64 tree frames exist. */
export const RULES_TREE_BOUNDS = { objectBytes: 196608, visits: 20000, depth: 64, pathBytes: 4096, expandedBytes: 4194304, matchingWork: 67108864, patterns: 256 } as const;
export interface RulesTreeBinding {
  rules: ScopeRef;
  proposal: Digest;
  destination: ScopeRef;
  repository: { host: string; namespace: string; name: string; id: string };
  ref: string;
  commit: string;
}
export interface RulesTreePattern { pattern: string; future?: boolean }
export type RulesTreeResult = { ok: true; leaves: number; treeVisits: number; expandedBytes: number; matchingWork: number }
  | { ok: false; reason: "extent-tree-unavailable" | "extent-pattern-unmatched" };
const utf8 = new TextEncoder();
const object = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const keys = (v: Record<string, unknown>, fields: readonly string[]): boolean => Object.keys(v).length === fields.length && fields.every(k => Object.hasOwn(v, k));
const sha1 = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f]{40}$/.test(v);
const fail = (): never => { throw new Error("extent-tree-unavailable"); };
function decode(v: unknown, allowance: { bytes: number }): Uint8Array {
  if (typeof v !== "string" || v.length > Math.ceil(RULES_TREE_BOUNDS.objectBytes / 3) * 4 || v.length % 4 !== 0
    || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(v)) return fail();
  const size = v.length / 4 * 3 - (v.endsWith("==") ? 2 : v.endsWith("=") ? 1 : 0);
  if (size > RULES_TREE_BOUNDS.objectBytes || size > allowance.bytes) return fail();
  allowance.bytes -= size;
  // The shared decoder rejects nonzero unused bits, not just bad characters.
  // Translating the alphabet and stripping the already-checked padding retains
  // that canonicality check (encode.ts decodeBits). No permissive atob path.
  const unpadded = v.replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  const decoded = unb64url(unpadded);
  if (!decoded || decoded.length !== size) return fail();
  return decoded;
}

/** `binding` comes from authenticated native operation/sibling facts. The caller
 * must derive it independently of the presented proof. Empty patterns are the
 * catchall; future opt-ins are decoded by the strict policy before this call. */
export function verifyRulesTree(canonical: string, digest: Digest, binding: RulesTreeBinding, patterns: readonly RulesTreePattern[] = []): RulesTreeResult {
  try {
    if (typeof canonical !== "string" || canonical.length > RULES_TREE_PROOF.max || utf8.encode(canonical).length > RULES_TREE_PROOF.max
      || patterns.length > RULES_TREE_BOUNDS.patterns || !isDigest(digest) || !sha1(binding.commit)) return fail();
    const proof: unknown = parseStrict(canonical);
    if (!object(proof) || !keys(proof, ["v", "rules", "proposal", "destination", "repository", "ref", "commit", "commitBytes", "trees"])
      || proof["v"] !== 1 || canonicalize(proof) !== canonical || valueDigest(RULES_TREE_PROOF.domain, proof) !== digest
      || !isScopeRef(proof["rules"]) || proof["rules"].kind !== "rules"
      || !isScopeRef(proof["destination"]) || proof["destination"].kind !== "destination" || !isDigest(proof["proposal"])
      || !object(proof["repository"]) || !keys(proof["repository"], ["host", "namespace", "name", "id"])
      || Object.values(proof["repository"]).some(v => typeof v !== "string")
      || typeof proof["ref"] !== "string" || !sha1(proof["commit"]) || !Array.isArray(proof["trees"])) return fail();
    for (const field of ["rules", "proposal", "destination", "repository", "ref", "commit"] as const) {
      if (canonicalize(proof[field]) !== canonicalize(binding[field])) return fail();
    }
    const allowance = { bytes: RULES_TREE_BOUNDS.objectBytes as number };
    const commit = decode(proof["commitBytes"], allowance);
    if (idOf("commit", commit) !== binding.commit) return fail();
    const root = parseCommit(commit, { parents: 64 }).tree;
    const trees = new Map<string, readonly TreeEntry[]>();
    let previous = "";
    for (const row of proof["trees"]) {
      if (!object(row) || !keys(row, ["id", "bytes"]) || !sha1(row["id"]) || row["id"] <= previous || trees.size >= RULES_TREE_BOUNDS.visits) return fail();
      previous = row["id"];
      const bytes = decode(row["bytes"], allowance);
      if (idOf("tree", bytes) !== row["id"]) return fail();
      trees.set(row["id"], parseTree(bytes));
    }
    const required = new Set<string>();
    for (const row of patterns) {
      if (!object(row) || Object.keys(row).some(k => k !== "pattern" && k !== "future") || typeof row.pattern !== "string"
        || row.pattern.length > 256 || utf8.encode(row.pattern).length > 256 || (row.future !== undefined && typeof row.future !== "boolean")) return fail();
      // A future opt-in affects only this occurrence. Any ordinary occurrence
      // of the same pattern still requires a hit; charge distinct strings once.
      if (row.future !== true && row.pattern !== "") required.add(row.pattern);
    }
    const wanted = [...required].map(pattern => ({ pattern, hit: false }));
    let leaves = 0, treeVisits = 0, expandedBytes = 0, matchingWork = 0;
    const reached = new Set<string>();
    const decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
    // One frame per depth; never queue a whole expanded tree or return paths.
    const stack: { id: string; path: string; pathBytes: number; index: number; entries: readonly TreeEntry[] }[] = [];
    const enter = (id: string, path: string, pathBytes: number): void => {
      if (++treeVisits > RULES_TREE_BOUNDS.visits || stack.length >= RULES_TREE_BOUNDS.depth) return fail();
      const entries = trees.get(id); if (!entries) return fail();
      reached.add(id); stack.push({ id, path, pathBytes, index: 0, entries });
    };
    enter(root, "", 0);
    while (stack.length) {
      const frame = stack[stack.length - 1]!;
      if (frame.index === frame.entries.length) { stack.pop(); continue; }
      const entry = frame.entries[frame.index++]!;
      if (entry.kind === "gitlink") return fail();
      const name = decoder.decode(entry.name);
      if (!name || name === "." || name === ".." || name.includes("/") || name.includes("\\") || name.includes("\0")) return fail();
      const pathBytes = frame.pathBytes + (frame.path ? 1 : 0) + entry.name.length;
      if (pathBytes > RULES_TREE_BOUNDS.pathBytes || expandedBytes > RULES_TREE_BOUNDS.expandedBytes - pathBytes) return fail();
      expandedBytes += pathBytes;
      const path = frame.path ? `${frame.path}/${name}` : name;
      if (entry.kind === "tree") { enter(entry.id, path, pathBytes); continue; }
      if (++leaves > RULES_TREE_BOUNDS.visits) return fail();
      for (const row of wanted) if (!row.hit) {
        // Matcher bound in UTF-16 code units: splitting and reach-array scans
        // cost O((P+1)*(L+1)). Across each pattern component, nameMatches
        // retries at most each name position and scans at most that component
        // per retry; summing component/name lengths is bounded by P*L.
        // ** scans each reach row once; it does not enumerate partitions.
        // 16 prepays these loop/array visits with margin, not CPU instructions
        // or wall time. Revisit this bound if extents.ts matcher loops change.
        const work = 16 * (row.pattern.length + 1) * (path.length + 1);
        if (!Number.isSafeInteger(work) || work > RULES_TREE_BOUNDS.matchingWork - matchingWork) return fail();
        matchingWork += work;
        if (matches(row.pattern, path)) row.hit = true;
      }
    }
    if (reached.size !== trees.size) return fail();
    return wanted.some(row => !row.hit) ? { ok: false, reason: "extent-pattern-unmatched" } : { ok: true, leaves, treeVisits, expandedBytes, matchingWork };
  } catch { return { ok: false, reason: "extent-tree-unavailable" }; }
}
