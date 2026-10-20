/** Copy only changed paths from the confirmed parent tree. An unchanged
 * edge is kept by ID; no older pass manifest, segment or payload is read. */
import type { JournalFile } from "./journal-files.ts";
import { JournalObjectReader, JournalObjects, type JournalTreeRow } from "./journal-objects.ts";
import { readJournalV2Path } from "./journal-v2-path.ts";
import { JournalWork, refuseJournal } from "./journal-work.ts";

interface Change { readonly files: Map<string, string>; readonly children: Map<string, Change> }
const change = (): Change => ({ files: new Map(), children: new Map() });

/** Resolve one fixed v2 path. No directory recursion or manifest scan. */
export async function journalV2File(reader: JournalObjectReader, tree: string, path: string, work: JournalWork): Promise<string | null> {
  if (!readJournalV2Path(path)) return refuseJournal("tree", path);
  const parts = path.split("/");
  for (let i = 0; i < parts.length; i++) {
    work.budget.spend({ nodes: 1 });
    const rows = reader.tree(await reader.read(tree, "tree", 1000 * 295));
    if (rows.length > 1000) return work.stop();
    const row = rows.find(row => row.name === parts[i]);
    if (!row) return null;
    if (i === parts.length - 1) return row.mode === "100644" ? row.id : refuseJournal("tree", path);
    if (row.mode !== "40000") return refuseJournal("tree", path);
    tree = row.id;
  }
  return null;
}

/** The caller has bound `parentTree` to its confirmed receipt. This routine
 * checks every tree it reads by hash and bounds names before copying them.
 * It does not claim a complete parent closure or an at-send host lease. */
export async function patchJournalV2Tree(reader: JournalObjectReader | null, parentTree: string | null,
  files: readonly JournalFile[], maker: JournalObjects, work: JournalWork): Promise<string> {
  if ((reader === null) !== (parentTree === null)) return refuseJournal("parent");
  work.metadata(files.length * 128);
  const root = change();
  for (const file of files) {
    work.check(); work.spend({ files: 1 });
    if (!readJournalV2Path(file.path)) return refuseJournal("tree", file.path);
    const parts = file.path.split("/"), leaf = parts.pop()!;
    let node = root;
    for (const part of parts) {
      let child = node.children.get(part);
      if (!child) { work.metadata(128 + part.length); child = change(); node.children.set(part, child); }
      node = child;
    }
    if (node.files.has(leaf)) return refuseJournal("tree", file.path);
    node.files.set(leaf, maker.make("blob", file.data).id);
  }
  async function patch(previous: string | null, additions: Change, prefix: string, depth: number): Promise<string> {
    work.depth(depth); work.budget.spend({ nodes: 1 });
    // At most 1,000 rows; a legal component may use all 255 bytes, plus
    // mode/separators and a SHA-256 ID. The name cap is checked below too.
    const before = previous === null ? [] : reader!.tree(await reader!.read(previous, "tree", 1000 * 295));
    const maximum = prefix === "" || prefix === "journal/" ? 1 : prefix === "journal/v2/" ? 4 : 1000;
    if (before.length > maximum) return work.stop();
    const rows = new Map<string, JournalTreeRow>(before.map(row => [row.name, row]));
    for (const [name, child] of additions.children) {
      const old = rows.get(name);
      if (old && old.mode !== "40000") return refuseJournal("tree", prefix + name);
      rows.set(name, { name, mode: "40000", id: await patch(old?.id ?? null, child, prefix + name + "/", depth + 1) });
    }
    for (const [name, id] of additions.files) {
      // Pass files and retained files are immutable. Only head.json changes.
      if (rows.has(name) && prefix + name !== "journal/v2/head.json") return refuseJournal("parent", prefix + name);
      if (rows.has(name) && rows.get(name)!.mode !== "100644") return refuseJournal("tree", prefix + name);
      rows.set(name, { name, mode: "100644", id });
    }
    if (rows.size > maximum) return work.stop();
    return maker.tree([...rows.values()]).id;
  }
  return patch(parentTree, root, "", 0);
}
