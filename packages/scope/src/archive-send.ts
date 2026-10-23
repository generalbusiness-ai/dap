/** A v2 append's exact parent edges replace a full old-tree fetch. The
 * credential/ref binding remains owned by archive-host, and generic
 * destination sends retain their complete-closure rule. */
import { GitRefusal, READ_BOUNDS, idOf, objectId } from "@generalbusiness/dap-git";
import { verifyJournalAppend } from "@generalbusiness/dap-git/journal";
import { SmartHttpGit, type RawGitObject, type SmartHttpOptions } from "@generalbusiness/dap-git/http";
import type { ArchiveSend } from "./archive-driver.ts";
import { archiveSendCopyReservation, archiveSendPackWork } from "./archive-transfer-cost.ts";

const bad = (): never => { throw new GitRefusal("unreadable", "archive append edges"); };
export async function sendArchiveAppend(request: ArchiveSend, transport: SmartHttpOptions, readBack: () => Promise<string | null>): Promise<unknown> {
  const work = request.incremental?.budget;
  if (!work || request.old === null) return bad();
  const bounds = transport.bounds ?? READ_BOUNDS, at = { ...request.at };
  const old = objectId(request.old, "old"), commit = objectId(request.commit, "archive commit"), ref = request.ref, allowed = request.allowed;
  const ids = new Set<string>(), pending: RawGitObject[] = [];
  let bytes = 0;
  for (const object of request.objects) {
    if (!(object.data instanceof Uint8Array) || !["blob", "tree", "commit"].includes(object.type)
      || ids.size >= bounds.closureObjects || ids.has(object.id) || object.data.length > transport.maxBytes - bytes) return bad();
    ids.add(object.id); bytes += object.data.length; pending.push({ id: object.id, type: object.type, data: object.data });
  }
  work.spend(archiveSendCopyReservation(pending.length, bytes));
  // Own all command fields and bytes before the first asynchronous read.
  const objects = pending.map(object => ({ ...object, data: new Uint8Array(object.data) }));
  for (const object of objects) if (idOf(object.type, object.data) !== object.id) return bad();
  const supplied = new Map(objects.map(object => [object.id, object]));
  const checked = await verifyJournalAppend({ format: "sha1", at, old, commit, budget: work, source: {
    object: async (id, maximum) => {
      const object = supplied.get(id);
      return object ? { type: object.type, size: object.data.length, data: object.data.length <= maximum ? object.data : null } : null;
    },
  } });
  if (!checked.ok) {
    if (["limit", "timeout", "unavailable"].includes(checked.reason)) work.stop(checked.reason as "limit" | "timeout" | "unavailable");
    return bad();
  }
  work.spend({ inputWork: archiveSendPackWork(bytes) });
  const result = await new SmartHttpGit(transport).send({ ref, old, new: commit, objects, beforeSend: allowed });
  if (!result.ran || result.reported === "stale") return { send: "not-sent" };
  if (result.exit === 1 && result.reported === "remote-rejected" && !result.timedOut) return { send: "refused" };
  if (result.exit === 0 && (result.reported === "created" || result.reported === "updated") && !result.timedOut && await readBack() === commit) return { send: "accepted" };
  return null;
}
