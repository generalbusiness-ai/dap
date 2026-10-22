/** Operator acceptance controls. The read port is an explicit metadata
 * stand-in; real Git/format/Native closure belongs to the command witness. */
import { expect, test } from "vitest";
import { archiveSource, main, type ArchiveData } from "../src/index.ts";
import { world } from "./world.ts";

const secretCheck = { result: "no-recognized-secret" as const, objects: 1, bytes: 1, qualification: "TEST finite recognition only" };
test("the expected archive journal count refuses a partial clone before reading or replaying a journal", async () => {
  const w = world(), out: string[] = [];
  const code = await main(["--git", "TEST-clone", "--all", "--expect-journals", "5"], {
    out: line => out.push(line), err: line => out.push(line),
    audit: async () => ({ journals: [{ scope: w.I.scope.scope, commit: "a".repeat(40) }], secretCheck }),
    archive: () => { throw Error("No journal read after incomplete clone"); },
  });
  expect(code).toBe(2); expect(out).toEqual(["expected 5 journal refs; found 1"]);
});

test("legacy unpublished anchors refuse operator acceptance and public-journal anchors cannot enter caller trust", async () => {
  const w = world(), commit = "b".repeat(40), entry = w.I.entries[0]!;
  const base: ArchiveData = { scope: w.I.scope, head: { seq: entry.seq, hash: entry.hash }, format: "sha1", commit, name: null, entries: w.I.entries, retained: [] };
  for (const publicAnchor of [false, true]) {
    let settled = 0, nativeLoads = 0;
    const data: ArchiveData = publicAnchor ? { ...base, publishedAnchors: [{ at: w.I.scope, seq: entry.seq, hash: entry.hash }], anchorCoverage: { covered: true, unpublished: [], legacy: [] } } : base;
    const out: string[] = [];
    const code = await main(["--git", "TEST-clone", "--all", "--expect-journals", "1", "--trust-published-anchors", "--json"], {
      out: line => out.push(line), err: line => out.push(line),
      audit: async () => ({ journals: [{ scope: w.I.scope.scope, commit }], secretCheck }),
      archive: () => archiveSource({ open: async () => ({ ok: true, archive: data }), settle: async () => { settled++; } }),
      native: { platform: () => { nativeLoads++; return null; } },
    });
    expect(code).toBe(2); expect(nativeLoads).toBe(0); expect(settled).toBe(1);
    expect(JSON.parse(out[0]!)).toMatchObject({ ok: false, result: publicAnchor ? "mismatch" : "anchors-unpublished" });
  }
});

test("publication union refuses two lists with contradictory hashes, deduplicates identical facts and retains distinct incarnations", async () => {
  const w = world(), first = w.I.entries[0]!, next = w.I.entries[1]!;
  const original = { at: w.I.scope, seq: first.seq, hash: first.hash };
  const different = { ...original, hash: next.hash };
  const later = { ...original, seq: next.seq, hash: next.hash };
  const distinct = { ...different, at: { ...original.at, inc: w.D.scope.inc } };
  expect(distinct.at.inc).not.toBe(original.at.inc);
  for (const second of [different, original, distinct, later]) {
    const source = archiveSource({ open: async scope => {
      const history = scope === w.D.scope.scope ? w.D : w.P;
      const entry = history.entries[0]!;
      return { ok: true, archive: { scope: history.scope, head: { seq: entry.seq, hash: entry.hash }, format: "sha1", commit: "c".repeat(40), name: null, entries: history.entries, retained: [], publishedAnchors: [scope === w.D.scope.scope ? original : second], anchorCoverage: { covered: true, unpublished: [], legacy: [] } } };
    } });
    const result = await source.publications([w.P.scope.scope, w.D.scope.scope]);
    if (second === different) expect(result).toMatchObject({ ok: false, result: "mismatch" });
    else {
      expect(result.ok).toBe(true); if (!result.ok) continue;
      expect(result.anchors).toHaveLength(second === original ? 1 : 2);
      if (second === later) expect(result.anchors.map(fact => fact.seq)).toEqual([first.seq, next.seq]);
    }
  }
});
