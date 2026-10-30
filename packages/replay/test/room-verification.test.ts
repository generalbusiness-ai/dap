/** Real in-memory judges/folds and replay. Fixture grants use as-recorded
 * authority; these cases claim no native host or membership admission. */
import { expect, test } from "vitest";
import type { Digest, FactRef } from "@generalbusiness/dap-contract";
import { canonicalize, newIncarnation, textDigest } from "@generalbusiness/dap-bytes";
import { hashOfBytes, roomVerification, type HistorySource, type Page, type Unread } from "../src/index.ts";
import { contentOf, entryOf, sourceOf, world, rewrite } from "./world.ts";

test("one room proof reuses checked prefixes at the exact unique-entry ceiling and publishes final immutable union evidence once", async () => {
  const w = world(), memory = sourceOf(w), pages = new Map<string, number>();
  const source: HistorySource = { retained: (...args) => memory.retained(...args), page: (...args) => {
    const key = `${args[0]}:${args[1]}`; pages.set(key, (pages.get(key) ?? 0) + 1); return memory.page(...args);
  } };
  const entries = Object.values(w).reduce((count, scope) => count + scope.entries.length, 0);
  const room = roomVerification(source, { mode: "replay", grants: "as-recorded", limits: { entries } });
  try {
    for (const scope of [w.D, w.I, w.P]) {
      const pending = await room.checkTarget({ scope: scope.scope.scope });
      expect(pending).toMatchObject({ requested: scope.scope.scope, final: false });
      expect("result" in pending).toBe(false);
    }
    const finished = await room.finish();
    expect(await room.finish()).toBe(finished);
    expect(finished.roots.map(root => [root.requested, root.result])).toEqual([w.D, w.I, w.P].map(scope => [scope.scope.scope, "consistent"]));
    expect(pages.get(`${w.D.scope.scope}:0`)).toBe(1);
    expect(pages.get(`${w.I.scope.scope}:0`)).toBe(2); // dependency open + explicit root refresh
    expect(pages.get(`${w.P.scope.scope}:0`)).toBe(2);
    expect(pages.get(`${w.D.scope.scope}:2`)).toBe(1);
    expect(finished.coverage.filter(span => span.scope.scope === w.D.scope.scope)).toEqual([{ scope: w.D.scope, from: 0, through: 6, root: w.D.scope.scope }]);
    expect(finished.coverage.some(span => span.scope.scope === w.P.scope.scope && span.root === w.I.scope.scope && span.through >= 2)).toBe(true);
    expect(Object.isFrozen(finished)).toBe(true);
    expect(Object.isFrozen(finished.roots)).toBe(true);
    expect(Object.isFrozen(finished.roots[0])).toBe(true);
    await expect(room.checkTarget({ scope: w.D.scope.scope })).rejects.toThrow("finishing");
  } finally { room.close(); }
});

test("a cached requested prefix still checks a new expected head below its already checked position", async () => {
  const w = world(), room = roomVerification(sourceOf(w), { mode: "replay", grants: "as-recorded" });
  try {
    await room.checkTarget({ scope: w.I.scope.scope });
    await room.checkTarget({ scope: w.D.scope.scope, head: { seq: 2, hash: textDigest("TEST wrong expected prefix") } });
    const finished = await room.finish();
    expect(finished.roots.map(root => root.result)).toEqual(["consistent", "mismatch"]);
    expect(finished.roots[1]!.why).toContain("forks from the expected head");
  } finally { room.close(); }
});

test("a bad user's forked reference cannot block later replay of the source's actual valid entry", async () => {
  const w = world();
  w.P.entries.length = 3; // The unrelated later acknowledgement uses I.2.
  const source = entryOf(w.P, 2), badCopy = { ...source, clamped: !source.clamped }, bytes = canonicalize(badCopy), hash = hashOfBytes(bytes), content = contentOf(bytes);
  const previous = entryOf(w.I, 2).uses.find(use => use.fact.at.scope === w.P.scope.scope && use.fact.seq === 2)!;
  const retained = w.I.retained.find(input => input.kind === "entry" && input.digest === previous.content)!;
  w.I.retained.push({ ...retained, digest: content, bytes });
  rewrite(w.I, 2, entry => {
    entry.input.from.hash = hash;
    const use = entry.uses.find((use: { fact: FactRef; content: Digest }) => use.fact.at.scope === w.P.scope.scope && use.fact.seq === 2)!;
    use.fact.hash = hash; use.content = content;
  });
  const room = roomVerification(sourceOf(w), { mode: "replay", grants: "as-recorded" });
  try {
    await room.checkTarget({ scope: w.I.scope.scope });
    await room.checkTarget({ scope: w.P.scope.scope });
    const finished = await room.finish();
    expect(finished.roots.map(root => root.result)).toEqual(["mismatch", "consistent"]);
    expect(finished.roots[0]!.why).toContain("the reference names another entry");
    expect(finished.coverage.filter(span => span.scope.scope === w.P.scope.scope).at(-1)?.through).toBe(2);
  } finally { room.close(); }
});

test("a room byte-limit refusal remains terminal across later targets", async () => {
  const w = world(); let reads = 0;
  // Bounded source-port specimen, not an HTTP byte-accounting witness.
  const room = roomVerification({ page: async () => { reads++; return { ok: false, reason: "too-large" }; },
    retained: async () => ({ ok: false, reason: "not-found" }) }, { mode: "replay", limits: { bytes: 1 } });
  try {
    await room.checkTarget({ scope: w.I.scope.scope });
    await room.checkTarget({ scope: w.D.scope.scope });
    expect(reads).toBe(1);
    expect((await room.finish()).roots.map(root => root.why)).toEqual(["the limit of 1 bytes was reached", "the limit of 1 bytes was reached"]);
  } finally { room.close(); }
});

test.each(["overlap", "incarnation", "retreat"] as const)("a cached requested source's %s contradiction invalidates earlier dependent roots", async change => {
  const w = world(), memory = sourceOf(w, 200), room = roomVerification(memory, { mode: "replay", grants: "as-recorded" });
  try {
    await room.checkTarget({ scope: w.I.scope.scope });
    if (change === "overlap") rewrite(w.D, 2, entry => { entry.effects = []; });
    if (change === "incarnation") w.D.scope.inc = newIncarnation(new Uint8Array(16).fill(51));
    if (change === "retreat") w.D.entries.length = 5;
    await room.checkTarget({ scope: w.D.scope.scope });
    const finished = await room.finish();
    expect(finished.roots.map(root => root.result)).toEqual(["mismatch", "mismatch"]);
    expect(finished.coverage.filter(span => span.scope.scope === w.I.scope.scope)).toEqual([]);
    expect(finished.coverage.filter(span => span.scope.scope === w.D.scope.scope).every(span => span.through < 2)).toBe(true);
  } finally { room.close(); }
});

test("an actual later root lowers already-followed dependency depth and resolves provisional depth stops", async () => {
  const w = world(), room = roomVerification(sourceOf(w), { mode: "replay", grants: "as-recorded", limits: { depth: 1 } });
  try {
    await room.checkTarget({ scope: w.I.scope.scope });
    await room.checkTarget({ scope: w.D.scope.scope });
    await room.checkTarget({ scope: w.P.scope.scope });
    expect((await room.finish()).roots.map(root => root.result)).toEqual(["consistent", "consistent", "consistent"]);
  } finally { room.close(); }
});

test("room options snapshot anchor arrays before proof reuse", async () => {
  const w = world(), anchors = [
    ...[4, 5].map(seq => ({ scope: w.D.scope.scope, seq, hash: w.D.entries[seq]!.hash })),
    { scope: w.P.scope.scope, seq: 2, hash: w.P.entries[2]!.hash },
  ];
  const room = roomVerification(sourceOf(w), { mode: "replay", grants: "as-recorded", anchors });
  anchors[0]!.hash = textDigest("TEST changed caller anchor"); anchors.length = 0;
  try {
    await room.checkTarget({ scope: w.I.scope.scope });
    const finished = await room.finish();
    expect(finished.roots[0]!.result).toBe("consistent");
    expect(finished.dependencies.anchored).toBe(3);
  } finally { room.close(); }
});

test("closing a room while its source is pending fences active and queued publication", async () => {
  const w = world(), memory = sourceOf(w);
  let entered!: () => void, release!: (page: { ok: true; page: Page; bytes: number } | Unread) => void;
  const reading = new Promise<void>(resolve => { entered = resolve; });
  const held = new Promise<{ ok: true; page: Page; bytes: number } | Unread>(resolve => { release = resolve; });
  let retained = 0;
  const room = roomVerification({ page: async () => { entered(); return held; }, retained: (...args) => { retained++; return memory.retained(...args); } }, { mode: "replay", grants: "as-recorded" });
  const active = room.checkTarget({ scope: w.I.scope.scope }).then(() => "published", error => String(error));
  await reading;
  const queued = room.checkTarget({ scope: w.D.scope.scope }).then(() => "published", error => String(error));
  room.close(); room.close();
  release(await memory.page(w.I.scope.scope, 0, { entries: 200, bytes: 1_000_000 }));
  expect(await active).toContain("closed");
  expect(await queued).toContain("closed");
  expect(retained).toBe(0);
  await expect(room.finish()).rejects.toThrow("closed");
});
