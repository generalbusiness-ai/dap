import { expect, test } from "vitest";
import * as proof from "../src/tree-proof.ts";

test("the pure proof subpath exposes only existing Git hashes, parsers and finite refusal", () => {
  expect(Object.keys(proof).sort()).toEqual(["GitRefusal", "idOf", "isObjectId", "parseCommit", "parseTree"]);
  const tree = new Uint8Array();
  expect(proof.idOf("tree", tree)).toBe("4b825dc642cb6eb9a060e54bf8d69288fbee4904");
  expect(proof.parseTree(tree)).toEqual([]);
  const commit = new TextEncoder().encode(`tree ${proof.idOf("tree", tree)}\nauthor A\ncommitter A\n\n`);
  expect(proof.parseCommit(commit, { parents: 64 })).toEqual({ tree: proof.idOf("tree", tree), parents: [] });
  expect(() => proof.parseTree(new Uint8Array([0]))).toThrow(proof.GitRefusal);
});
