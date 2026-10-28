/** Public immutable checkout data, independent of a live reservation or credential. */
import { isRecord } from "@generalbusiness/dap-bytes";
import { isObjectId } from "./names.ts";
import { idOf, READ_BOUNDS, Reader } from "./reader.ts";

export interface OwnedCheckoutSnapshot {
  base: string;
  commit: string;
  tree: string;
  objects: readonly { id: string; type: "blob" | "tree" | "commit"; data: Uint8Array }[];
}

export const STAGE_SNAPSHOT_BOUNDS = { proofBytes: 262_144, objectBytes: 16 * 1024 * 1024, objects: 4096 } as const;

/** A bounded detached copy. Object identity is checked before any consumer sees bytes. */
export function readOwnedCheckoutSnapshot(value: unknown): OwnedCheckoutSnapshot | null {
  try {
    if (!isRecord(value) || Object.keys(value).sort().join() !== "base,commit,objects,tree") return null;
    const { base, commit, tree, objects: given } = value;
    if (!isObjectId(base) || !isObjectId(commit) || !isObjectId(tree) || !Array.isArray(given) || given.length > STAGE_SNAPSHOT_BOUNDS.objects) return null;
    let bytes = 0;
    const seen = new Set<string>(), objects: OwnedCheckoutSnapshot["objects"][number][] = [];
    for (const row of given) {
      if (!isRecord(row) || Object.keys(row).sort().join() !== "data,id,type") return null;
      const { id, type, data } = row;
      if (!isObjectId(id) || seen.has(id) || type !== "blob" && type !== "tree" && type !== "commit" || !(data instanceof Uint8Array)) return null;
      const maximum = type === "blob" ? READ_BOUNDS.blobBytes : type === "tree" ? READ_BOUNDS.treeBytes : READ_BOUNDS.commitBytes;
      bytes += data.length;
      if (data.length > maximum || bytes > STAGE_SNAPSHOT_BOUNDS.objectBytes) return null;
      const copy = new Uint8Array(data);
      if (idOf(type, copy) !== id) return null;
      seen.add(id); objects.push({ id, type, data: copy });
    }
    return { base, commit, tree, objects };
  } catch { return null; }
}

/** Confirm the exact immutable commit and its complete reachable closure. No provider read occurs here. */
export async function verifyOwnedCheckoutSnapshot(value: OwnedCheckoutSnapshot): Promise<boolean> {
  try {
    const snapshot = readOwnedCheckoutSnapshot(value);
    if (!snapshot) return false;
    const objects = new Map(snapshot.objects.map(object => [object.id, object])), reached = new Set<string>();
    const reader = new Reader({ object: async id => { const object = objects.get(id); if (!object) return null; reached.add(id); return { type: object.type, size: object.data.length, data: object.data }; }, ref: async () => null, refs: async () => [] }, READ_BOUNDS);
    const commit = await reader.linked(snapshot.commit, "commit");
    return commit.tree === snapshot.tree && commit.parents[0] === snapshot.base && (await reader.closure(snapshot.commit)).complete && reached.size === objects.size;
  } catch { return false; }
}
