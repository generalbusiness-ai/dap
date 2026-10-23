/** Copy only changed paths from the confirmed parent tree. An unchanged
 * edge is kept by ID; no older pass manifest, segment or payload is read. */
import type { JournalFile } from "./journal-files.ts";
import { natural } from "@generalbusiness/dap-bytes";
import { JournalObjectReader, JournalObjects, journalFormat, type JournalFormat, type JournalObjectType, type JournalTreeRow } from "./journal-objects.ts";
import { journalObjectReservation, journalResultMetadata, journalTreeRowMetadata } from "./journal-object-cost.ts";
import { journalV2Directory, readJournalV2Path } from "./journal-v2-path.ts";
import { JournalWork, refuseJournal, type JournalCost, type JournalLayoutLimits } from "./journal-work.ts";
import { JOURNAL_LAYOUT_LIMITS } from "./journal-work.ts";
import { journalAppendReadCost, type JournalAppendForecast, type JournalAppendLayoutWork } from "./journal-append-cost.ts";

export interface JournalV2PlannedFile { readonly path: string; readonly bytes: number }
type PatchLayoutWork = Pick<JournalLayoutLimits, "objects" | "trees" | "names" | "outputWork" | "objectBytes">;
export type JournalV2PatchForecast = { readonly ok: true; readonly cost: Readonly<JournalCost>; readonly layoutWork: Readonly<PatchLayoutWork>;
  readonly appendEdges: JournalAppendForecast | null }
  | { readonly ok: false; readonly reason: "limit" };

interface Change {
  readonly files: Map<string, string | null>; readonly children: Map<string, Change>;
  readonly previous: string | null; readonly prefix: string; readonly depth: number;
  rows: Map<string, JournalTreeRow> | null; baseBytes: number; active: boolean;
}
const change = (previous: string | null, prefix: string, depth: number): Change =>
  ({ files: new Map(), children: new Map(), previous, prefix, depth, rows: null, baseBytes: 0, active: false });
const maximumRows = (prefix: string) => journalV2Directory(prefix)?.maximum ?? refuseJournal("tree", prefix);

/** Pre-I/O maxima from the path grammar, including SHA-256 IDs. Isolated
 * reads reserve the whole maximum, so fixed root paths must not reserve
 * a thousand 255-byte names that cannot occur at those paths. */
export function journalV2TreeBytes(prefix: string): number {
  return journalV2Directory(prefix)?.bytes ?? refuseJournal("tree", prefix);
}

/** Resolve one fixed v2 path. No directory recursion or manifest scan. */
export async function journalV2File(reader: JournalObjectReader, tree: string, path: string, work: JournalWork): Promise<string | null> {
  if (!readJournalV2Path(path)) return refuseJournal("tree", path);
  const parts = path.split("/");
  for (let i = 0; i < parts.length; i++) {
    work.budget.spend({ nodes: 1 });
    const prefix = i === 0 ? "" : parts.slice(0, i).join("/") + "/";
    const rows = reader.tree(await reader.read(tree, "tree", journalV2TreeBytes(prefix)));
    if (rows.length > maximumRows(prefix)) return work.stop();
    const row = rows.find(row => row.name === parts[i]);
    if (!row) return null;
    if (i === parts.length - 1) return row.mode === "100644" ? row.id : refuseJournal("tree", path);
    if (row.mode !== "40000") return refuseJournal("tree", path);
    tree = row.id;
  }
  return null;
}

/** One actual patch, split before its payload stage. Preparation visits
 * each changed node with the original reader/debits; it is not a second
 * scout or a cached-validation credit. The caller binds the immutable
 * parent to its receipt and uses one original JournalWork throughout.
 * Candidate paths may be prepared then omitted; their work stays spent.
 * This supplies no payload admission or complete-parent closure proof. */
export class JournalV2TreePatch {
  readonly #root: Change;
  #preparing = false;
  #finished = false;
  #staged: { readonly path: string; readonly id: string }[] | null = null;
  #maker: JournalObjects | null = null;
  constructor(readonly reader: JournalObjectReader | null, parentTree: string | null, readonly work: JournalWork) {
    if ((reader === null) !== (parentTree === null)) refuseJournal("parent");
    if (reader !== null && reader.work !== work) refuseJournal("parent");
    this.#root = change(parentTree, "", 0);
  }
  async #load(node: Change): Promise<void> {
    this.work.check();
    if (node.rows !== null) return;
    this.work.depth(node.depth); this.work.budget.spend({ nodes: 1 });
    const body = node.previous === null ? null : await this.reader!.read(node.previous, "tree", journalV2TreeBytes(node.prefix));
    const before = body === null ? [] : this.reader!.tree(body);
    if (before.length > maximumRows(node.prefix)) return this.work.stop();
    node.rows = new Map(before.map(row => [row.name, row]));
    node.baseBytes = body?.length ?? 0;
  }
  /** New unique path deltas only. No file data is supplied or read here.
   * Await each call before starting another; no work may be detached. */
  async prepare(paths: readonly string[]): Promise<void> {
    this.work.check();
    if (this.#finished || this.#preparing) return refuseJournal("unavailable");
    this.#preparing = true;
    try {
      this.work.metadata(paths.length * 128);
      this.work.metadata(paths.length * 32);
      const owned = [...paths];
      await this.#load(this.#root);
      for (const path of owned) {
        this.work.check(); this.work.spend({ files: 1 });
        if (!readJournalV2Path(path)) return refuseJournal("tree", path);
        const parts = path.split("/"), leaf = parts.pop()!;
        let node = this.#root;
        for (const part of parts) {
          let child = node.children.get(part);
          if (!child) {
            const old = node.rows!.get(part);
            if (old && old.mode !== "40000") return refuseJournal("tree", node.prefix + part);
            this.work.metadata(128 + part.length);
            child = change(old?.id ?? null, node.prefix + part + "/", node.depth + 1);
            node.children.set(part, child);
          }
          await this.#load(child); node = child;
        }
        if (node.files.has(leaf)) return refuseJournal("tree", path);
        // Immutable files cannot be replaced. Only head.json changes.
        const prior = node.rows!.get(leaf);
        if (prior && path !== "journal/v2/head.json") return refuseJournal("parent", path);
        if (prior && prior.mode !== "100644") return refuseJournal("tree", path);
        node.files.set(leaf, null);
      }
    } finally { this.#preparing = false; }
  }
  /** Future finish with a fresh maker of this format, plus one objects()
   * exposure. Separate appendEdges prices changed edges and both head tree
   * walks when a parent and selected head exist. It excludes commit/head
   * blob reads/parses (forecastJournalAppendFixed), source/body validation
   * and provider work. This reads only prepared tree metadata. Forecast
   * scratch work is charged now; estimated work is still owed in full.
   * Unselected prepared paths receive no future emission charge or refund. */
  forecast(format: JournalFormat, files: readonly JournalV2PlannedFile[]): JournalV2PatchForecast {
    this.work.check(); journalFormat(format);
    if (this.#finished || this.#preparing || this.#staged !== null || this.#root.rows === null) return refuseJournal("unavailable");
    if (this.reader !== null && this.reader.format !== format) return refuseJournal("parent");
    this.work.metadata(256 + files.length * 64);
    const nodes = new Map<Change, { rows: number; bytes: number }>(), selected = new Set<string>();
    const width = format === "sha1" ? 20 : 32;
    const cost: JournalCost = { entries: 0, attempts: 0, nodes: 0, calls: 0, metadata: 0, inputWork: 0 };
    const layout: PatchLayoutWork = { objects: 0, trees: 0, names: 0, outputWork: 0, objectBytes: 0 };
    let fits = true, appendBlobBytes = 0, appendBlobMaximum = 0;
    const metadata = (bytes: number) => { cost.metadata += bytes; cost.inputWork += bytes; };
    const make = (type: JournalObjectType, bytes: number) => {
      if (bytes > this.work.limits.objectBytes) fits = false;
      const charge = journalObjectReservation(type, bytes);
      metadata(charge.metadata); cost.inputWork += charge.inputWork;
      layout.objects++; layout.outputWork += charge.outputWork;
      layout.objectBytes = Math.max(layout.objectBytes, bytes);
    };
    const activate = (node: Change) => {
      const prior = nodes.get(node); if (prior) return prior;
      if (node.rows === null) return refuseJournal("tree", node.prefix);
      this.work.metadata(128);
      const value = { rows: node.rows.size, bytes: node.baseBytes }; nodes.set(node, value); return value;
    };
    for (const file of files) {
      this.work.check();
      const path = file.path, bytes = file.bytes;
      if (typeof path !== "string" || path.length > 1024 || !readJournalV2Path(path)) return refuseJournal("tree");
      if (!natural(bytes)) return refuseJournal("input", path);
      appendBlobBytes += bytes; appendBlobMaximum = Math.max(appendBlobMaximum, bytes);
      this.work.metadata(128 + path.length * 4); this.work.input(path.length, 4);
      if (selected.has(path)) return refuseJournal("tree", path);
      selected.add(path);
      const parts = path.split("/"), leaf = parts.pop()!;
      let node = this.#root, state = activate(node);
      for (const part of parts) {
        const child = node.children.get(part);
        if (!child) return refuseJournal("tree", path);
        if (!nodes.has(child) && !node.rows!.has(part)) {
          state.rows++; state.bytes += 7 + part.length + width; // 40000 SP name NUL raw-id
        }
        node = child; state = activate(node);
      }
      if (node.files.get(leaf) !== null) return refuseJournal("tree", path);
      if (!node.rows!.has(leaf)) {
        state.rows++; state.bytes += 8 + leaf.length + width; // 100644 SP name NUL raw-id
      }
      metadata(128); // Future staging list.
      metadata(128 + path.length * 4); cost.inputWork += path.length * 4;
      make("blob", bytes);
    }
    // An empty finish still emits the prepared root, as the actual patch does.
    activate(this.#root);
    for (const [node, state] of nodes) {
      if (state.rows > maximumRows(node.prefix)) fits = false;
      metadata(journalTreeRowMetadata(state.rows)); make("tree", state.bytes);
      cost.inputWork += state.bytes;
      layout.trees++; layout.names += state.rows;
    }
    metadata(journalResultMetadata(layout.objects)); // No content-deduplication credit.
    for (const key of ["objects", "trees", "names", "outputWork"] as const) {
      if (layout[key] > this.work.limits[key] - this.work.used[key]) fits = false;
    }
    let appendEdges: JournalAppendForecast | null = null;
    if (fits && this.reader !== null && selected.has("journal/v2/head.json")) {
      // This extra forecasting state is paid now, on the same ledger.
      this.work.metadata(256);
      const cost: JournalCost = { entries: 0, attempts: 0, nodes: 0, calls: 0, metadata: 0, inputWork: 0 };
      const used: JournalAppendLayoutWork = { objects: 0, trees: 0, names: 0, depth: 0, objectBytes: 0 };
      const metadata = (bytes: number) => { cost.metadata += bytes; cost.inputWork += bytes; };
      const read = (bytes: number, rows?: number) => {
        const price = journalAppendReadCost(bytes);
        cost.attempts += price.attempts; cost.calls += price.calls;
        cost.metadata += price.metadata; cost.inputWork += price.inputWork;
        used.objects++; used.objectBytes = Math.max(used.objectBytes, bytes);
        if (rows !== undefined) {
          metadata(journalTreeRowMetadata(rows)); cost.inputWork += bytes * 3;
          used.trees++; used.names += rows;
        }
      };
      // The validator creates both comparison maps, even for a new tree.
      // Only an unchanged edge at this exact path can skip recursion. All
      // selected active paths are conservatively treated as changed.
      for (const [node, state] of nodes) {
        this.work.check(); cost.nodes++; used.depth = Math.max(used.depth, node.depth);
        const oldRows = node.previous === null ? 0 : node.rows!.size;
        if (node.previous !== null) read(node.baseBytes, oldRows);
        read(state.bytes, state.rows); metadata((oldRows + state.rows) * 128);
      }
      // Use the primitive sizes captured in the original validated loop,
      // never revisit caller getters or the borrowed file list.
      const blobs = journalAppendReadCost(appendBlobBytes, selected.size);
      cost.attempts += blobs.attempts; cost.calls += blobs.calls;
      cost.metadata += blobs.metadata; cost.inputWork += blobs.inputWork;
      used.objects += selected.size; used.objectBytes = Math.max(used.objectBytes, appendBlobMaximum);
      let node = this.#root;
      for (const part of ["journal", "v2", null]) {
        const state = nodes.get(node);
        if (!state || node.previous === null || node.rows === null) return refuseJournal("parent");
        cost.nodes += 2;
        read(node.baseBytes, node.rows.size); read(state.bytes, state.rows);
        if (part !== null) node = node.children.get(part)!;
      }
      // Append validation owns a fresh JournalWork but the SAME native
      // budget. Its layout ceilings are the defaults, not a writer's
      // possibly lowered remaining layout counts. Fixed reads add4objects.
      const bounded = used.objects + 4 <= JOURNAL_LAYOUT_LIMITS.objects && used.trees <= JOURNAL_LAYOUT_LIMITS.trees
        && used.names <= JOURNAL_LAYOUT_LIMITS.names && used.depth <= JOURNAL_LAYOUT_LIMITS.depth
        && used.objectBytes <= JOURNAL_LAYOUT_LIMITS.objectBytes;
      appendEdges = bounded ? { ok: true, cost: Object.freeze(cost), layoutWork: Object.freeze(used) } : { ok: false, reason: "limit" };
    }
    this.work.check();
    return fits ? { ok: true, cost: Object.freeze(cost), layoutWork: Object.freeze(layout), appendEdges } : { ok: false, reason: "limit" };
  }
  /** Finish a subset of complete prepared paths once. Blob construction and
   * every new tree still use the original maker and its full debits. */
  finish(files: readonly JournalFile[], maker: JournalObjects): string {
    this.work.check();
    if (this.#finished || this.#preparing || this.#root.rows === null) return refuseJournal("unavailable");
    this.#finished = true;
    this.#stage(files, maker);
    return this.#emit();
  }
  #stage(files: readonly JournalFile[], maker: JournalObjects): void {
    if (this.#staged !== null || this.#preparing) return refuseJournal("unavailable");
    if (maker.work !== this.work || this.reader !== null && maker.format !== this.reader.format) return refuseJournal("parent");
    this.work.metadata(files.length * 128);
    this.#staged = []; this.#maker = maker;
    for (const file of files) {
      this.work.check();
      const path = file.path;
      if (!readJournalV2Path(path)) return refuseJournal("tree", path);
      this.#staged.push({ path, id: maker.make("blob", file.data).id });
    }
  }
  #emit(): string {
    const maker = this.#maker, files = this.#staged;
    if (maker === null || files === null) return refuseJournal("unavailable");
    for (const file of files) {
      this.work.check();
      if (typeof file.path !== "string" || file.path.length > 1024) return refuseJournal("tree");
      // Final path binding is additional work after preparation. Reserve
      // its split path and ancestor references before allocating them.
      this.work.metadata(128 + file.path.length * 4); this.work.input(file.path.length, 4);
      const parts = file.path.split("/"), leaf = parts.pop()!;
      let node = this.#root;
      const ancestors = [node];
      for (const part of parts) {
        const child = node.children.get(part);
        if (!child) return refuseJournal("tree", file.path);
        node = child; ancestors.push(node);
      }
      // null means prepared but not supplied; a string is a duplicate file.
      if (node.files.get(leaf) !== null || node.rows === null) return refuseJournal("tree", file.path);
      node.files.set(leaf, file.id);
      for (const ancestor of ancestors) ancestor.active = true;
    }
    const emit = (node: Change): string => {
      this.work.check();
      const rows = node.rows;
      if (rows === null) return refuseJournal("tree", node.prefix);
      for (const [name, child] of node.children) {
        if (child.active) rows.set(name, { name, mode: "40000", id: emit(child) });
      }
      for (const [name, id] of node.files) if (id !== null) rows.set(name, { name, mode: "100644", id });
      if (rows.size > maximumRows(node.prefix)) return this.work.stop();
      return maker.tree([...rows.values()]).id;
    };
    return emit(this.#root);
  }
  /** Compatibility entrypoint: own the original file paths and blob bytes
   * before the first await, exactly as the one-call encoder did. */
  static async patch(reader: JournalObjectReader | null, parentTree: string | null,
    files: readonly JournalFile[], maker: JournalObjects, work: JournalWork): Promise<string> {
    const patch = new JournalV2TreePatch(reader, parentTree, work);
    patch.#stage(files, maker);
    work.metadata(files.length * 32);
    await patch.prepare(patch.#staged!.map(file => file.path));
    patch.#finished = true;
    return patch.#emit();
  }
}

export async function patchJournalV2Tree(reader: JournalObjectReader | null, parentTree: string | null,
  files: readonly JournalFile[], maker: JournalObjects, work: JournalWork): Promise<string> {
  return JournalV2TreePatch.patch(reader, parentTree, files, maker, work);
}
