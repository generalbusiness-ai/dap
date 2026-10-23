/** Exact parent-source dispatch shared by the driver and its boundary witness.
 * Native state supplies bytes only; the journal reader retains hash/edge checks. */
import { same } from "@generalbusiness/dap-bytes";
import { journalId, type JournalFormat, type JournalObject, type JournalObjectSource, type JournalParentFrontier } from "@generalbusiness/dap-git/journal";
import type { ArchiveProvider } from "./archive-driver.ts";
import type { ArchiveRow } from "./archive-row.ts";
import type { ArchiveBudget } from "./archive-budget.ts";
import { ARCHIVE_TRANSFER_OBJECTS, archiveObjectListMetadata, archiveObjectCopyWork } from "./archive-transfer-cost.ts";

export function copyArchiveObjects(objects: readonly JournalObject[], format: JournalFormat, budget: ArchiveBudget, maximum: number): Map<string, JournalObject> {
  if (!Array.isArray(objects) || objects.length > ARCHIVE_TRANSFER_OBJECTS) budget.stop("limit");
  budget.spend({ metadata: archiveObjectListMetadata(objects.length) });
  let size = 0;
  const owned = new Map<string, JournalObject>();
  for (const object of objects) {
    budget.check(); journalId(format, object.id);
    if (!(object.data instanceof Uint8Array) || !["commit", "tree", "blob"].includes(object.type) || owned.has(object.id)) budget.stop("unavailable");
    if (object.data.length > maximum - size) budget.stop("limit");
    size += object.data.length; budget.spend({ inputWork: archiveObjectCopyWork(object.data.length) });
    owned.set(object.id, { id: object.id, type: object.type, data: new Uint8Array(object.data) });
  }
  return owned;
}

export async function archiveParent(row: ArchiveRow, provider: ArchiveProvider, maximum: number, budget: ArchiveBudget,
allowed: () => boolean, native: { readonly frontier: JournalParentFrontier; readonly source: JournalObjectSource } | null) {
  const id = row.pending?.parent ?? row.confirmed?.commit ?? null;
  // The store validates the bounded witness and its repository binding before
  // dispatch. Keep the exact receipt checks here too; corrupt state never
  // selects the remote path. Every subsequent read still hashes its object.
  if (native !== null) {
    const frontier = native.frontier;
    if (row.confirmed?.layout !== 2 || id !== row.confirmed.commit || frontier.commit !== id
      || frontier.format !== row.format || !same(frontier.at, row.at) || !same(frontier.through, row.confirmed.through)) return budget.stop("unavailable");
    const held = new Map<string, JournalObject>(), used = new Set<string>(); let bytes = 0;
    const object: JournalObjectSource["object"] = async (key, most) => {
      budget.check(); let value = held.get(key);
      if (!value) {
        const got = await budget.wait(() => native.source.object(key, most));
        if (got === null) return null;
        if (most === 0) return got;
        if (got.type !== "commit" && got.type !== "tree" && got.type !== "blob") return budget.stop("unavailable");
        if (!(got.data instanceof Uint8Array) || got.size !== got.data.length || got.size > most || got.size > maximum - bytes) return budget.stop("unavailable");
        value = copyArchiveObjects([{ id: key, type: got.type, data: got.data }], row.format, budget, maximum).get(key)!;
        bytes += value.data.length; held.set(key, value);
      }
      used.add(key);
      return { type: value.type, size: value.data.length, data: value.data.length <= most ? value.data : null };
    };
    return { parent: { id, source: { object, boundedObject: (key: string, _type: JournalObject["type"], most: number) => object(key, most) } }, held, used };
  }
  if (row.pending?.layout === 2 || !row.pending) {
    const held = new Map<string, JournalObject>(), used = new Set<string>(); let bytes = 0;
    if (id === null) return { parent: null, held, used };
    const read = provider.readObject;
    if (!read) return budget.stop("unavailable");
    const source: JournalObjectSource = {
      object: async (key, maximum) => {
        const object = held.get(key);
        return object ? { type: object.type, size: object.data.length, data: object.data.length <= maximum ? object.data : null } : null;
      },
      boundedObject: async (key, type, most) => {
        budget.check(); let object = held.get(key);
        if (!object) {
          const got = await budget.wait(() => read.call(provider, { ...row.repository }, { id: key, type, maximum: most }, allowed, budget));
          if (got === null) return null;
          if (!(got.data instanceof Uint8Array) || got.type !== type || got.size !== got.data.length || got.size > most || got.size > maximum - bytes) return budget.stop("unavailable");
          object = copyArchiveObjects([{ id: key, type, data: got.data }], row.format, budget, maximum).get(key)!;
          bytes += object.data.length; held.set(key, object);
        }
        used.add(key);
        return { type: object.type, size: object.data.length, data: object.data.length <= most ? object.data : null };
      },
    };
    return { parent: { id, source }, held, used };
  }
  const held = id === null ? new Map<string, JournalObject>() : copyArchiveObjects(await budget.wait(() => provider.objects({ ...row.repository }, id, { bytes: maximum, objects: 8192 }, allowed)), row.format, budget, maximum);
  const used = new Set<string>();
  const parent = id === null ? null : { id, source: { object: async (key: string, most: number) => {
    const object = held.get(key);
    if (!object) return null;
    if (object.data.length > most) return { type: object.type, size: object.data.length, data: null };
    used.add(key); return { type: object.type, size: object.data.length, data: object.data };
  } } };
  return { parent, held, used };
}
