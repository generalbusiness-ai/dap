import { expect, test } from "vitest";
import { canonicalize, utf8 } from "@generalbusiness/dap-bytes";
import { GitRefusal, idOf, type GitSource } from "@generalbusiness/dap-git";
import { readRulesTree, rulesTreeRequest, type RulesTreeObjects } from "../src/rules-tree-provider.ts";

// Scripted source, actual Git object hashing/parsing. Blob and parent bodies
// deliberately do not exist: successful collection cannot depend on them.
function fixture() {
  const blob = "a".repeat(40), parent = "b".repeat(40);
  const child = new Uint8Array(Buffer.concat([Buffer.from("100644 café\0"), Buffer.from(blob, "hex")]));
  const childId = idOf("tree", child);
  const root = new Uint8Array(Buffer.concat([Buffer.from("40000 a\0"), Buffer.from(childId, "hex"), Buffer.from("40000 b\0"), Buffer.from(childId, "hex")]));
  const rootId = idOf("tree", root);
  const commit = utf8(`tree ${rootId}\nparent ${parent}\nauthor A\ncommitter A\n\n`);
  const head = idOf("commit", commit);
  const objects = new Map([[head, { type: "commit", data: commit }], [rootId, { type: "tree", data: root }], [childId, { type: "tree", data: child }]]);
  const reads: { id: string; limit: number }[] = [];
  const source: GitSource = {
    object: async (id, limit) => { reads.push({ id, limit }); const row = objects.get(id); return row ? { type: row.type, size: row.data.length, data: row.data.length <= limit ? row.data : null } : null; },
    ref: async () => { throw new Error("ref read forbidden"); },
    refs: async () => { throw new Error("ref listing forbidden"); },
  };
  return { source, objects, reads, head, rootId, childId, commit };
}
const encoded = (result: RulesTreeObjects) => ({ commitBytes: Buffer.from(result.commitBytes).toString("base64"), trees: result.trees.map(row => ({ id: row.id, bytes: Buffer.from(row.bytes).toString("base64") })) });

test("rules tree collection reads only the captured commit and each reachable tree, with exact canonical payload admission", async () => {
  const f = fixture();
  const result = await readRulesTree(f.source, { commit: f.head, maxCanonicalBytes: 262144 });
  expect(f.reads.map(row => row.id)).toEqual([f.head, f.rootId, f.childId]);
  expect(result.trees.map(row => row.id)).toEqual([f.rootId, f.childId].sort());
  const exact = utf8(canonicalize(encoded(result))).length;
  f.reads.length = 0;
  expect(encoded(await readRulesTree(f.source, { commit: f.head, maxCanonicalBytes: exact }))).toEqual(encoded(result));
  expect(f.reads.map(row => row.id)).toEqual([f.head, f.rootId, f.childId]);
  f.reads.length = 0;
  await expect(readRulesTree(f.source, { commit: f.head, maxCanonicalBytes: exact - 1 })).rejects.toThrow();
  expect(f.reads.every(row => row.limit >= 0 && row.limit <= 196608)).toBe(true);
  // Owned retained bytes do not alias the scripted source's mutable payload.
  f.commit.fill(0);
  expect(result.commitBytes[0]).toBe("t".charCodeAt(0));
});

test("rules tree collection refuses an invalid request before reads, exhaustion before the next row and unverified or missing objects", async () => {
  const f = fixture();
  expect(() => rulesTreeRequest({ commit: "a".repeat(64), maxCanonicalBytes: 262144 })).toThrow();
  expect(() => rulesTreeRequest({ commit: f.head, maxCanonicalBytes: 262145 })).toThrow();
  expect(f.reads).toEqual([]);
  const onlyCommit = utf8(canonicalize({ commitBytes: Buffer.from(f.commit).toString("base64"), trees: [] })).length;
  await expect(readRulesTree(f.source, { commit: f.head, maxCanonicalBytes: onlyCommit })).rejects.toThrow();
  expect(f.reads.map(row => row.id)).toEqual([f.head]); // row metadata refused before tree request
  f.reads.length = 0;
  f.objects.delete(f.childId);
  await expect(readRulesTree(f.source, { commit: f.head, maxCanonicalBytes: 262144 })).rejects.toThrow();
  expect(f.reads.map(row => row.id)).toEqual([f.head, f.rootId, f.childId]);
  f.objects.get(f.rootId)!.data[0] = 0;
  f.reads.length = 0;
  await expect(readRulesTree(f.source, { commit: f.head, maxCanonicalBytes: 262144 })).rejects.toThrow();
  expect(f.reads.map(row => row.id)).toEqual([f.head, f.rootId]);
  // A trusted Git refusal survives, while an arbitrary source exception is
  // sanitized by the existing Reader boundary instead of leaking host text.
  const unavailable = fixture(), cancellation = new GitRefusal("unreadable", "scripted cancellation");
  const rejected = { ...unavailable.source, object: async () => { throw cancellation; } };
  await expect(readRulesTree(rejected, { commit: unavailable.head, maxCanonicalBytes: 262144 })).rejects.toBe(cancellation);
  const secret = { ...unavailable.source, object: async () => { throw new Error("SCRIPTED HOST SECRET"); } };
  const sanitized = await readRulesTree(secret, { commit: unavailable.head, maxCanonicalBytes: 262144 }).then(() => null, error => error);
  expect(sanitized).toBeInstanceOf(GitRefusal);
  expect(sanitized).toMatchObject({ reason: "unreadable", what: "rules tree object" });
  expect(String(sanitized)).not.toContain("SCRIPTED HOST SECRET");
});
