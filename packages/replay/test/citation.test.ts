import { expect, test } from "vitest";
import { verifyCitation } from "../src/citation.ts";
import { citationGitHash } from "../src/git.ts";
import { publishedCases, publishedSequence, vectorBytes } from "./citation-vectors.ts";

for (const format of ["dap1", "git", "git256"]) {
  test(`${format} matches every independent published seven-field report and preserves explicit source and anchor boundaries`, async () => {
    const vectors = publishedCases(format), sequence = publishedSequence(format);
    expect(new Set(vectors.map(row => row.name)).size).toBe(vectors.length);
    expect(sequence.events.length).toBeGreaterThanOrEqual(4);
    for (const row of vectors) {
      let citedReads = 0;
      const predecessorReads: string[] = [];
      const result = await verifyCitation(row.citation, {
        async event() { citedReads++; return row.event === null ? null : vectorBytes(row.event); },
        async predecessor(_format, digest) {
          predecessorReads.push(digest);
          const found = row.source.find(value => value.digest === digest);
          return found ? vectorBytes(found) : null;
        },
      }, { requested: row.requested, anchors: row.anchors, depth: row.depth, hashGitCommit: bytes => citationGitHash(bytes, { program: "/usr/bin/git" }) });
      expect(result, row.name).toEqual(row.expect);
      expect(Object.keys(result).sort()).toEqual(["anchor", "citation", "reached", "reason", "requested", "result", "trusts"]);
      if (row.expect.reason === "syntax" || row.expect.reason === "format") {
        expect([citedReads, predecessorReads.length], row.name).toEqual([0, 0]);
      }
      if (row.name === "explicit-middle-anchor") expect(predecessorReads, row.name).toEqual([]);
      if (row.name === "held-middle-is-not-anchor") expect(predecessorReads.length, row.name).toBe(2);
      if (row.name === "foreign-anchor-ignored") expect(predecessorReads.length, row.name).toBe(3);
    }
  });
}

test("caller anchors cannot select a chain by conflicting input order and duplicate identical anchors trust it once", async () => {
  const row = publishedCases("dap1").find(value => value.name === "explicit-middle-anchor")!;
  const wrong = publishedCases("dap1").find(value => value.name === "wrong-middle-anchor")!.anchors[0]!;
  let reads = 0;
  const source = {
    async event() { reads++; return vectorBytes(row.event!); },
    async predecessor() { throw new Error("The explicit predecessor anchor must stop the walk"); },
  };
  for (const anchors of [[row.anchors[0]!, wrong], [wrong, row.anchors[0]!]]) {
    await expect(verifyCitation(row.citation, source, { requested: 3, anchors })).rejects.toThrow(TypeError);
    expect(reads).toBe(0);
  }
  expect(await verifyCitation(row.citation, source, { requested: 3, anchors: [row.anchors[0]!, row.anchors[0]!] })).toEqual(row.expect);
  expect(reads).toBe(1);
});

test("a byte source cannot rewrite the citation it is asked to serve", async () => {
  // An argument-mutating byte port is a stand-in at the public source boundary.
  const rows = publishedCases("dap1"), original = rows.find(row => row.name === "changed-cited-bytes")!;
  const served = rows.find(row => row.name === "well-hashed-entry-missing-prev")!;
  const report = await verifyCitation(original.citation, {
    async event(citation) {
      (citation as { event: string }).event = served.citation.split("/").at(-1)!;
      return vectorBytes(served.event!);
    },
    async predecessor() { throw new Error("Digest mismatch must stop before predecessor I/O"); },
  }, { requested: original.requested });
  expect(report).toEqual(original.expect);
});
