import { expect, test } from "vitest";
import { canonicalize } from "@generalbusiness/dap-bytes";
import { valueDigest } from "@generalbusiness/dap-derive";
import { d, otherLane } from "@generalbusiness/dap-derive/testing";
import { idOf } from "@generalbusiness/dap-git/tree-proof";
import { RULES_TREE_PROOF, verifyRulesTree, type RulesTreeBinding, type RulesTreePattern } from "../src/rules-policy-tree.ts";

// Synthetic object bytes, checked by the actual Git parsers/hash and verifier.
// No native certification or provider authority is supplied by this fixture.
const utf8 = new TextEncoder();
const blob = "a".repeat(40);
const tree = (entries: readonly [string, string, string][]): Uint8Array => {
  const chunks = entries.map(([mode, name, id]) => Buffer.concat([Buffer.from(`${mode} ${name}\0`), Buffer.from(id, "hex")]));
  return new Uint8Array(Buffer.concat(chunks));
};
const commitOf = (root: string): Uint8Array => utf8.encode(`tree ${root}\nauthor A <a@b> 0 +0000\ncommitter A <a@b> 0 +0000\n\nproof\n`);
function fixture(root: Uint8Array, children: readonly Uint8Array[] = []) {
  const commit = commitOf(idOf("tree", root));
  const binding: RulesTreeBinding = { rules: { ...otherLane, kind: "rules" }, proposal: d("a"), destination: { ...otherLane, kind: "destination" }, repository: { host: "fixture", namespace: "n", name: "r", id: "1" }, ref: "refs/heads/main", commit: idOf("commit", commit) };
  const proof = { v: 1, ...binding, commitBytes: Buffer.from(commit).toString("base64"), trees: [root, ...children].map(bytes => ({ id: idOf("tree", bytes), bytes: Buffer.from(bytes).toString("base64") })).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0) };
  const check = (value: unknown = proof, patterns: readonly RulesTreePattern[] = [], expected = binding) => verifyRulesTree(canonicalize(value), valueDigest(RULES_TREE_PROOF.domain, value), expected, patterns);
  return { binding, proof, check };
}
const unavailable = { ok: false, reason: "extent-tree-unavailable" };

test("a complete captured tree covers physical leaf paths at every shared prefix and explicit future patterns", () => {
  const child = tree([["100644", "file.ts", blob]]);
  const f = fixture(tree([["40000", "a", idOf("tree", child)], ["40000", "b", idOf("tree", child)], ["120000", "link", blob]]), [child]);
  expect(f.check(undefined, [{ pattern: "a/file.ts" }, { pattern: "b/file.ts" }, { pattern: "link" }])).toMatchObject({ ok: true, leaves: 3, treeVisits: 3 });
  expect(f.check(undefined, [{ pattern: "missing" }])).toEqual({ ok: false, reason: "extent-pattern-unmatched" });
  expect(f.check(undefined, [{ pattern: "missing", future: true }, { pattern: "" }])).toMatchObject({ ok: true });
  expect(f.check(undefined, [{ pattern: "missing", future: true }, { pattern: "missing" }])).toEqual({ ok: false, reason: "extent-pattern-unmatched" });
  const once = f.check(undefined, [{ pattern: "a/file.ts" }]);
  expect(f.check(undefined, [{ pattern: "a/file.ts" }, { pattern: "a/file.ts" }, { pattern: "a/file.ts", future: true }])).toEqual(once);
  // The early leaf hits before traversal reaches the missing later child.
  // A hit cannot terminate complete structural verification.
  const late = fixture(tree([["100644", "a", blob], ["40000", "z", idOf("tree", child)]]), [child]);
  expect(late.check({ ...late.proof, trees: late.proof.trees.filter(row => row.id !== idOf("tree", child)) }, [{ pattern: "a" }])).toEqual(unavailable);
});

test("complete proof admission refuses altered identity, hash, object format, omitted or surplus rows and noncanonical envelopes", () => {
  const f = fixture(tree([["100644", "README.md", blob]]));
  expect(f.check()).toMatchObject({ ok: true });
  expect(f.check(undefined, [], { ...f.binding, proposal: d("b") })).toEqual(unavailable);
  expect(f.check(undefined, [], { ...f.binding, commit: "a".repeat(64) })).toEqual(unavailable);
  expect(f.check({ ...f.proof, rules: { ...f.binding.rules, kind: "destination" } })).toEqual(unavailable);
  const row = f.proof.trees[0]!;
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  // README tree has two padding characters; flip only an unused trailing bit.
  const at = row.bytes.length - 3;
  const noncanonical = row.bytes.slice(0, at) + alphabet[alphabet.indexOf(row.bytes[at]!) + 1]! + row.bytes.slice(at + 1);
  expect(f.check({ ...f.proof, trees: [{ ...row, bytes: noncanonical }] })).toEqual(unavailable);
  expect(f.check({ ...f.proof, trees: [] })).toEqual(unavailable);
  expect(f.check({ ...f.proof, trees: [...f.proof.trees, ...f.proof.trees] })).toEqual(unavailable);
  expect(f.check({ ...f.proof, commitBytes: Buffer.from("wrong").toString("base64") })).toEqual(unavailable);
  const extra = tree([["100644", "extra", blob]]);
  expect(f.check({ ...f.proof, trees: [...f.proof.trees, { id: idOf("tree", extra), bytes: Buffer.from(extra).toString("base64") }].sort((a, b) => a.id < b.id ? -1 : 1) })).toEqual(unavailable);
  expect(verifyRulesTree(` ${canonicalize(f.proof)}`, valueDigest(RULES_TREE_PROOF.domain, f.proof), f.binding)).toEqual(unavailable);
  expect(verifyRulesTree(canonicalize(f.proof), d("b"), f.binding)).toEqual(unavailable);
  expect(f.check({ ...f.proof, extra: true })).toEqual(unavailable);
});

test("unsupported names and gitlinks refuse, and path, depth, encoded-byte and matching-work caps stop expansion", () => {
  expect(fixture(tree([["100644", "café-文.ts", blob]])).check(undefined, [{ pattern: "café-文.ts" }])).toMatchObject({ ok: true, leaves: 1 });
  expect(fixture(tree([["160000", "module", blob]])).check()).toEqual(unavailable);
  const invalidName = new Uint8Array(Buffer.concat([Buffer.from("100644 "), Buffer.from([255, 0]), Buffer.from(blob, "hex")]));
  expect(fixture(invalidName).check()).toEqual(unavailable);
  let root = tree([["100644", "leaf", blob]]);
  const rows: Uint8Array[] = [];
  for (let n = 0; n < 65; n++) { rows.push(root); root = tree([["40000", `d${n}`, idOf("tree", root)]]); }
  expect(fixture(root, rows).check()).toEqual(unavailable);
  const long = fixture(tree([["100644", "x".repeat(4097), blob]]));
  expect(long.check()).toEqual(unavailable);
  const f = fixture(tree([["100644", "x".repeat(200), blob]]));
  // Each unmatching256-code-unit pattern costs16*257*201;256 exceed the cap.
  expect(f.check(undefined, Array.from({ length: 256 }, (_, n) => ({ pattern: `${"y".repeat(253)}${n.toString().padStart(3, "0")}` })))).toEqual(unavailable);
  expect(f.check(undefined, [{ pattern: "y".repeat(256) }])).toEqual({ ok: false, reason: "extent-pattern-unmatched" });
  expect(f.check({ ...f.proof, commitBytes: "A".repeat(262148) })).toEqual(unavailable);
});
