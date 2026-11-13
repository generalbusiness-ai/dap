/** Replay inputs for a native archive lane whose creator is its room's
 * Directory. Only Register and Membership facts may be anchors (decisions
 * 5a642337 and 066e49b3), so Replay proves the Directory's facts by replay.
 * The Directory takes deliveries from the Rules and Destination geneses, so
 * the source also serves those journals. Anchors are caller words from
 * actual sealed entries and an independent Membership read, never archive
 * output. No private authority journal is exported. */
import type { FactRef } from "@generalbusiness/dap-contract";
import { canonicalize } from "@generalbusiness/dap-bytes";
import { journalRef, type JournalFormat, type JournalObject } from "@generalbusiness/dap-git/journal";
import { readJournalRepositoryArchive } from "@generalbusiness/dap-git/journal-reader";
import { archiveSource } from "@generalbusiness/dap-replay";
import type { Lane } from "../support.ts";
import { archiveAuthorityAnchors, archiveAuthorityRoom } from "./archive-native-authority.ts";
import { archiveNativeScope, nativeAnchorFacts } from "./archive-room-journals.ts";

export interface ArchiveAuthorityReplay { readonly source: ReturnType<typeof archiveSource>; readonly anchors: readonly FactRef[] }

/** `host` is the lane's archived repository: its journal pointer and objects. */
export async function archiveAuthorityReplay(lane: Lane, format: JournalFormat, host: { readonly pointer: string | null; readonly data: ReadonlyMap<string, JournalObject> }): Promise<ArchiveAuthorityReplay | null> {
  const native = archiveAuthorityRoom(lane);
  if (!native) return null;
  const { R, D } = native.room, [membership, ...replayed] = native.room.children;
  if (!membership) return null;
  const scopes = [D, ...replayed], journals = [];
  for (const scope of scopes) {
    const at = await native.room.life.wait(() => scope.at());
    journals.push(await native.room.life.wait(() => archiveNativeScope(scope.object, at, native.policies, format, lane.c.clock.now, native.declarations)));
  }
  const refs = new Map([[journalRef(lane.at.scope), host.pointer], ...journals.map(journal => [journal.ref, journal.commit] as const)]);
  const objects = new Map([...host.data, ...journals.flatMap(journal => journal.objects).map(object => [object.id, object] as const)]);
  const source = archiveSource({ open: (scope, work) => readJournalRepositoryArchive({
    format: async () => format, resolve: async ref => refs.get(ref) ?? null,
    object: async (id, most) => { const object = objects.get(id); return object ? { type: object.type, size: object.data.length, data: object.data.length <= most ? object.data : null } : null; },
  }, scope, work) });
  const authority = new Set([(await native.room.life.wait(() => R.at())).scope, (await native.room.life.wait(() => membership.at())).scope]);
  const entries = [];
  for (const scope of scopes) entries.push(...(await native.room.life.wait(() => scope.sealed())).map(sealed => sealed.entry));
  const anchors = [...new Map([...archiveAuthorityAnchors(lane).filter(fact => authority.has(fact.at.scope)), ...nativeAnchorFacts(entries, authority)]
    .map(fact => [canonicalize(fact), fact] as const)).values()];
  return { source, anchors };
}
