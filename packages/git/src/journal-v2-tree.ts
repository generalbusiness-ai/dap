/** Copy only changed paths from the confirmed parent tree. An unchanged
 * edge is kept by ID; no older pass manifest, segment or payload is read. */
import type { JournalFile } from "./journal-files.ts";
import { natural } from "@generalbusiness/artroom-bytes";
import { JournalObjectReader, JournalObjects, journalFormat, type JournalFormat, type JournalObjectType, type JournalTreeRow } from "./journal-objects.ts";
import { journalObjectReservation, journalResultMetadata, journalTreeRowMetadata } from "./journal-object-cost.ts";
import { readJournalV2Path } from "./journal-v2-path.ts";
import { JournalWork, refuseJournal, type JournalCost, type JournalLayoutLimits } from "./journal-work.ts";

export interface JournalV2PlannedFile { readonly path: string; readonly bytes: number }
type PatchLayoutWork = Pick<JournalLayoutLimits, "objects" | "trees" | "names" | "outputWork" | "objectBytes">;
export type JournalV2PatchForecast = { readonly ok: true; readonly cost: Readonly<JournalCost>; readonly layoutWork: Readonly<PatchLayoutWork> }
  | { readonly ok: false; readonly reason: "limit" };

interface Change {
  readonly files: Map<string, string | null>; readonly children: Map<string, Change>;
  readonly previous: string | null; readonly prefix: string; readonly depth: number;
  rows: Map<string, JournalTreeRow> | null; baseBytes: number; active: boolean;
}
const change = (previous: string | null, prefix: string, depth: number): Change =>
  ({ files: new Map(), children: new Map(), previous, prefix, depth, rows: null, baseBytes: 0, active: false });
const maximumRows = (prefix: string) => prefix === "" || prefix === "journal/" ? 1 : prefix === "journal/v2/" ? 4 : 1000;

/** Pre-I/O maxima from the path grammar, including SHA-256 IDs. Isolated
 * reads reserve the whole maximum, so fixed root paths must not reserve
 * a thousand 255-byte names that cannot occur at those paths. */
export function journalV2TreeBytes(prefix: string): number {
  if (prefix === "" || prefix === "journal/") return 295;
  if (prefix === "journal/v2/") return 4 * 295;
  if (/^journal\/v2\/(passes|segments|retained)\/(?:[0-9]{3}\/){0,2}$/.test(prefix)) return 1000 * 43;
  if (/^journal\/v2\/(passes|segments|retained)\/(?:[0-9]{3}\/){3}$/.test(prefix)) return 1000 * 58;
  if (/^journal\/v2\/retained\/(?:[0-9]{3}\/){3}[0-9]{12}\/$/.test(prefix)) return 5 * 295;
  if (/^journal\/v2\/retained\/(?:[0-9]{3}\/){3}[0-9]{12}\/(definition|entry|rule|snapshot)\/$/.test(prefix)) return 512 * 104;
  if (/^journal\/v2\/retained\/(?:[0-9]{3}\/){3}[0-9]{12}\/value\/[^/]+\/$/.test(prefix)) return 512 * 104;
  // Encoded value domains may use a complete 255-byte component.
  return 1000 * 295;
}

/** Resolve one fixed v2 path. No directory recursion or manifest scan. */
export async function journalV2File(reader: JournalObjectReader, tree: string, path: string, work: JournalWork): Promise<string | null> {
  if (!readJournalV2Path(path)) return refuseJournal("tree", path);
  const parts = path.split("/");
  for (let i = 0; i < parts.length; i++) {
    work.budget.spend({ nodes: 1 });
    const prefix = i === 0 ? "" : parts.slice(0, i).join("/") + "/";
    const rows = reader.tree(await reader.read(tree, "tree", journalV2TreeBytes(prefix)));
    if (rows.length > 1000) return work.stop();
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
   * exposure. No commit, input validation, provider or at-send work is
   * included. This reads only already prepared tree metadata. Forecast
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
    let fits = true;
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
    this.work.check();
    return fits ? { ok: true, cost: Object.freeze(cost), layoutWork: Object.freeze(layout) } : { ok: false, reason: "limit" };
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
