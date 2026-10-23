/** Git-layer cost footprint only. Parent numeric siblings are deliberately
 * sparse test trees, old pass payloads are TEST stand-ins, and no complete
 * archive history, native consumer, admission or receipt is claimed. */
import { expect, test } from "vitest";
import type { Entry } from "@generalbusiness/dap-contract";
import { canonicalize, digestBytes, entryHash, textDigest, utf8 } from "@generalbusiness/dap-bytes";
import { ARCHIVE_BOUNDS, ArchiveBudget } from "../../scope/src/archive-budget.ts";
import { JournalObjects, type JournalObject } from "../src/journal-objects.ts";
import { JournalWork } from "../src/journal-work.ts";
import { buildJournalPass } from "../src/journal-v2-layout.ts";
import { prepareJournalPass } from "../src/journal-v2-preparation.ts";
import { verifyJournalAppend } from "../src/journal-v2-append.ts";
import { journalV2RetainedPath, journalV2SegmentPath } from "../src/journal-v2-path.ts";
import { syntheticJournal } from "./support/journal.ts";

test("a full numeric path at the highest position fits one original writer and append budget", async context => {
  const last = 999_999_999_999, fixture = syntheticJournal(2), oldHash = textDigest("TEST old head, not native history");
  const setup = new ArchiveBudget(), maker = new JournalObjects("sha1", new JournalWork(setup));
  const empty = maker.tree([]), standIn = maker.make("blob", utf8("TEST old pass payload; no archive history"));
  const oldPass = maker.tree([{ mode: "100644", name: "pass.json", id: standIn.id }]);
  let numeric = maker.tree(Array.from({ length: 99 }, (_, n) => ({ mode: "40000" as const,
    name: String(last - 99 + n), id: oldPass.id })));
  // Every ancestor on the changed path has100 actual Git names. Off-path
  // children are empty test trees, never purported complete old archives.
  for (let level = 0; level < 5; level++) numeric = maker.tree(Array.from({ length: 100 }, (_, n) => ({
    mode: "40000" as const, name: String(n).padStart(2, "0"), id: n === 99 ? numeric.id : empty.id })));
  const oldHead = { seq: last - 1, hash: oldHash };
  const head = maker.make("blob", utf8(canonicalize({ v: 2, scope: fixture.at, through: oldHead.seq, hash: oldHash })));
  const version = maker.tree([{ mode: "100644", name: "head.json", id: head.id }, { mode: "40000", name: "passes", id: numeric.id }]);
  const journal = maker.tree([{ mode: "40000", name: "v2", id: version.id }]);
  const root = maker.tree([{ mode: "40000", name: "journal", id: journal.id }]);
  const old = maker.commit(root.id, null, 1_700_000_000), held = new Map<string, JournalObject>(maker.objects().map(row => [row.id, row]));
  const source = { object: async (id: string, maximum: number) => {
    const row = held.get(id); return row ? { type: row.type, size: row.data.length, data: row.data.length <= maximum ? row.data : null } : null;
  } };
  const entry = JSON.parse(fixture.bodies[1]!) as Entry;
  entry.seq = last; entry.prev = oldHash; entry.input = { type: "checkpoint", through: last - 1, state: textDigest("TEST state") };
  const bytes = canonicalize(entry), hash = entryHash(entry), retained = canonicalize({ TEST: "new retained rule" });
  const key = { kind: "rule" as const, digest: digestBytes(utf8(retained)) };
  const budget = new ArchiveBudget(); budget.spend({ entries: 1, attempts: 1 });
  const prepared = await prepareJournalPass({ format: "sha1", at: fixture.at, after: oldHead, parent: { id: old.id, source }, budget });
  expect(prepared.ok, JSON.stringify(prepared)).toBe(true); if (!prepared.ok) return;
  await prepared.preparation.prepare([journalV2SegmentPath(last), journalV2RetainedPath(last, key)]);
  const selection = canonicalize({ format: "artroom-local-inventory-2", at: fixture.at, after: oldHead, through: { seq: last, hash },
    entries: [{ seq: last, hash, bytes: utf8(bytes).length }], objects: [{ key, bytes: utf8(retained).length, pass: last,
      consumers: [{ mode: "required", origin: { at: { at: fixture.at, seq: last, hash }, input: "checkpoint" },
        consumer: "rule-input", purpose: "replay-required", key }] }], omittedTexts: [], ancestryUnwalked: [],
    replay: "unchecked", retention: "observed-local", cost: { entries: 1, attempts: 1, nodes: 0, calls: 0, metadata: 0, inputWork: 0 } });
  const built = await buildJournalPass({ format: "sha1", selection, parent: { id: old.id, source }, budget, preparation: prepared.preparation,
    input: { entry: async (seq, limit) => seq === last && limit === utf8(bytes).length ? bytes : null,
      retained: async (asked, limit) => asked.digest === key.digest && limit === utf8(retained).length ? retained : null } });
  expect(built.ok, JSON.stringify(built)).toBe(true); if (!built.ok) return;
  for (const row of built.archive.objects) held.set(row.id, row);
  expect(await verifyJournalAppend({ format: "sha1", at: fixture.at, old: old.id, commit: built.archive.commit, source, budget })).toEqual({ ok: true });
  const cost = budget.admitted(); expect(cost.nodes).toBe(31);
  for (const [key, ceiling] of Object.entries(ARCHIVE_BOUNDS)) expect(cost[key as keyof typeof cost]).toBeLessThanOrEqual(ceiling);
  (context.task.meta as Record<string, unknown>)["highestSharedPassBudget"] = { cost, writerLayout: built.archive.layoutWork,
    maximumNumericRows: 100, pass: last, setup: setup.admitted(),
    qualification: "One original default30s candidate ledger pays real parent preparation, canonical Git build and actual append validator. Setup has separate unchanged default bounds. Test-authored sparse parent, TEST old blobs and selected rule consumer are not native history/admission/receipt/export/replay/remote confirmation. No cap/debit/deadline raised or validation credit." };
}, 30_000);
