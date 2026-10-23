/** A receipt-bound rightmost path witness, never an export certificate or a
 * complete history proof. Closed subtrees stay opaque by their exact IDs. */
import type { Digest, Head, ScopeRef } from "@generalbusiness/dap-contract";
import { isDigest, isHead, isScopeRef } from "@generalbusiness/dap-bytes";
import { JournalObjectReader, journalFormat, journalId, type JournalFormat, type JournalObject, type JournalObjectSource, type JournalObjectType, type JournalTreeRow } from "./journal-objects.ts";
import { journalV2Head } from "./journal-v2-manifest.ts";
import { journalAppendReadCost } from "./journal-append-cost.ts";
import { journalTreeRowMetadata } from "./journal-object-cost.ts";
import { JOURNAL_V2_LAST_POSITION, journalV2Directory } from "./journal-v2-path.ts";
import { journalRecord } from "./journal-selection.ts";
import { sameJournalScope } from "./journal-selection.ts";
import { JournalWork, refuseJournal, type JournalBudget, type JournalCost } from "./journal-work.ts";

export const JOURNAL_PARENT_FRONTIER_OBJECTS = 11;
/** Three fixed trees, five 4,100-byte numeric trees, one 5,100-byte tree,
 * and the original 1,024-byte commit and head limits. SHA-256 is included. */
export const JOURNAL_PARENT_FRONTIER_BYTES = 28_828;
export const JOURNAL_PARENT_FRONTIER_ROWS = 604;
/** Conservative bound on this module's logical debits, not an allowance or
 * validation credit. Caller source-port, SQL, encoding and transport work are
 * additional. The two-call reader price also covers boundedObject's smaller
 * single-call debit, using the same per-path maxima. */
export function forecastJournalParentFrontier(validation = false): Readonly<JournalCost> {
  const objects = JOURNAL_PARENT_FRONTIER_OBJECTS, bytes = JOURNAL_PARENT_FRONTIER_BYTES;
  const trees = bytes - 2 * 1024;
  // A malformed SHA-1 tree can parse more rows before its grammar refusal
  // than the 604 accepted rows. A parsed directory row needs at least
  // 5 mode + 1 space + 1 name + 1 NUL + 20 ID bytes. Include one final
  // row debit before malformed framing/name refusal aborts the whole capture.
  const rows = Math.floor(trees / 28) + 1, reads = journalAppendReadCost(bytes, objects);
  const metadata = 1024 + objects * 128 + bytes + journalTreeRowMetadata(rows) + 1024 * 3;
  // Validation checks two bindings and snapshots the finite descriptors
  // before capture. Its original debits are all metadata(), hence both fees.
  const extra = validation ? 2 * 1024 + 1024 + objects * 128 : 0;
  // A pending Mark may additionally require the exact existing commit parent.
  const parentParse = validation ? 1024 * 3 : 0;
  return Object.freeze({ entries: 0, attempts: reads.attempts, nodes: objects - 2, calls: reads.calls,
    metadata: metadata + reads.metadata + extra,
    inputWork: metadata + reads.inputWork + trees * 3 + 1024 * 3 + 1024 * 8 + extra + parentParse });
}
export interface JournalParentBinding {
  readonly format: JournalFormat;
  /** Digest of the exact canonical repository identity, not read authority. */
  readonly repository: Digest;
  readonly at: ScopeRef;
  readonly through: Head;
  readonly commit: string;
}
export interface JournalParentFrontier extends JournalParentBinding {
  readonly v: 1;
  readonly first: number;
  /** Fixed order: commit, nine root-to-rightmost trees, then head blob.
   * Returned bodies are owned; a later use must validate its stored witness. */
  readonly objects: readonly JournalObject[];
}
const bindingFields = ["format", "repository", "at", "through", "commit"] as const;
function binding(value: JournalParentBinding, work: JournalWork): JournalParentBinding {
  work.metadata(1024);
  const row = journalRecord(value, bindingFields);
  journalRecord(row["at"], ["scope", "inc", "kind"]);
  journalRecord(row["through"], ["seq", "hash"]);
  if (!isDigest(row["repository"]) || !isScopeRef(row["at"]) || !isHead(row["through"])
    || row["through"].seq > JOURNAL_V2_LAST_POSITION) return refuseJournal("parent");
  const format = journalFormat(row["format"]);
  return Object.freeze({ format, repository: row["repository"], at: Object.freeze({ ...row["at"] }),
    through: Object.freeze({ ...row["through"] }), commit: journalId(format, row["commit"]) });
}
function edge(rows: readonly JournalTreeRow[], names: readonly string[]): void {
  if (rows.length !== names.length || rows.some((row, index) => row.name !== names[index]
    || row.mode !== (row.name === "head.json" ? "100644" : "40000"))) return refuseJournal("parent");
}

/** Extract only the fixed witness. Every body is hash checked by the existing
 * reader, with the same caller budget/deadline. No descendant walk occurs. */
export async function captureJournalParentFrontier(expected: JournalParentBinding, source: JournalObjectSource,
  budget: JournalBudget): Promise<JournalParentFrontier> {
  const work = new JournalWork(budget), owned = binding(expected, work);
  work.metadata(JOURNAL_PARENT_FRONTIER_OBJECTS * 128);
  const reader = new JournalObjectReader(owned.format, source, work), objects: JournalObject[] = [], ids = new Set<string>();
  let bytes = 0, rowCount = 0;
  const read = async (id: string, type: JournalObjectType, maximum: number) => {
    if (objects.length === JOURNAL_PARENT_FRONTIER_OBJECTS) return work.stop();
    if (ids.has(id)) return refuseJournal("parent");
    ids.add(id);
    // Reserve captured payload ownership before the reader can allocate it.
    work.metadata(maximum);
    const data = await reader.read(id, type, maximum);
    bytes += data.length;
    if (bytes > JOURNAL_PARENT_FRONTIER_BYTES) return work.stop();
    objects.push(Object.freeze({ id, type, data }));
    return data;
  };
  const commit = reader.commit(await read(owned.commit, "commit", 1024));
  const tree = async (id: string, prefix: string) => {
    work.budget.spend({ nodes: 1 });
    const geometry = journalV2Directory(prefix);
    if (!geometry) return refuseJournal("tree");
    const rows = reader.tree(await read(id, "tree", geometry.bytes));
    rowCount += rows.length;
    if (rows.length === 0 || rows.length > geometry.maximum || rowCount > JOURNAL_PARENT_FRONTIER_ROWS) return refuseJournal("tree");
    return rows;
  };
  const root = await tree(commit.tree, ""); edge(root, ["journal"]);
  const journal = await tree(root[0]!.id, "journal/"); edge(journal, ["v2"]);
  const v2 = await tree(journal[0]!.id, "journal/v2/"); edge(v2, ["head.json", "passes"]);
  let id = v2[1]!.id, prefix = "journal/v2/passes/", digits = "", first = -1;
  for (let depth = 0; depth < 6; depth++) {
    const rows = await tree(id, prefix);
    for (const row of rows) {
      if (row.mode !== "40000" || !(depth < 5 ? /^[0-9]{2}$/ : /^[0-9]{12}$/).test(row.name)
        || depth === 5 && !row.name.startsWith(digits)) return refuseJournal("tree");
    }
    const greatest = rows.at(-1)!;
    if (depth === 5) first = Number(greatest.name);
    else { digits += greatest.name; prefix += greatest.name + "/"; id = greatest.id; }
  }
  if (first < 0 || first > owned.through.seq) return refuseJournal("parent");
  const head = journalV2Head(await read(v2[0]!.id, "blob", 1024), work);
  if (!sameJournalScope(head.scope, owned.at) || head.through !== owned.through.seq || head.hash !== owned.through.hash) return refuseJournal("parent");
  if (objects.length !== JOURNAL_PARENT_FRONTIER_OBJECTS) return refuseJournal("parent");
  work.check();
  return Object.freeze({ v: 1, ...owned, first, objects: Object.freeze(objects) });
}

const nativeLength = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(Uint8Array.prototype), "byteLength")!.get!;
/** Validate a decoded native witness. Scope bounds its encoded envelope before
 * decoding, then rebinds its row/Mark inside the later native transaction.
 * A supplied expectedParent also binds the actual commit edge to the Mark.
 * This function neither reads SQL nor trusts a prior validation flag. */
export async function validateJournalParentFrontier(value: unknown, expected: JournalParentBinding,
  budget: JournalBudget, expectedParent?: string | null): Promise<JournalParentFrontier> {
  const work = new JournalWork(budget), required = binding(expected, work);
  const parent = expectedParent === undefined || expectedParent === null ? expectedParent : journalId(required.format, expectedParent);
  work.metadata(1024 + JOURNAL_PARENT_FRONTIER_OBJECTS * 128);
  const row = journalRecord(value, ["v", ...bindingFields, "first", "objects"]);
  const actual = binding({ format: row["format"] as JournalFormat, repository: row["repository"] as Digest,
    at: row["at"] as ScopeRef, through: row["through"] as Head, commit: row["commit"] as string }, work);
  const first = row["first"], supplied = row["objects"];
  if (row["v"] !== 1 || actual.format !== required.format || actual.repository !== required.repository
    || actual.commit !== required.commit || !sameJournalScope(actual.at, required.at)
    || actual.through.seq !== required.through.seq || actual.through.hash !== required.through.hash
    || !Number.isSafeInteger(first) || typeof first !== "number" || Object.is(first, -0) || first < 0 || first > required.through.seq
    || !Array.isArray(supplied) || supplied.length !== JOURNAL_PARENT_FRONTIER_OBJECTS) return refuseJournal("parent");
  const ordered: JournalObject[] = [], held = new Map<string, { type: JournalObjectType; data: Uint8Array; size: number }>();
  let bytes = 0;
  // Snapshot the finite descriptors before the first await. The reader owns
  // and hashes every body before it can enter the returned witness.
  for (const raw of supplied) {
    const object = journalRecord(raw, ["id", "type", "data"]), id = journalId(required.format, object["id"]);
    const type = object["type"], data = object["data"];
    if (type !== "commit" && type !== "tree" && type !== "blob" || !(data instanceof Uint8Array) || !ArrayBuffer.isView(data)) return refuseJournal("object-mismatch");
    const size = nativeLength.call(data) as number;
    if (size > JOURNAL_PARENT_FRONTIER_BYTES - bytes || held.has(id)) return refuseJournal("parent");
    bytes += size; held.set(id, { type, data, size }); ordered.push({ id, type, data });
  }
  const source: JournalObjectSource = { object: async (id, maximum) => {
    const object = held.get(id);
    return object ? { type: object.type, size: object.size, data: object.size <= maximum ? object.data : null } : null;
  } };
  const captured = await captureJournalParentFrontier(required, source, budget);
  if (captured.first !== first || captured.objects.some((object, index) => object.id !== ordered[index]!.id || object.type !== ordered[index]!.type)) return refuseJournal("parent");
  if (parent !== undefined && new JournalObjectReader(required.format, source, work).commit(captured.objects[0]!.data).parent !== parent) return refuseJournal("parent");
  work.check();
  return captured;
}
