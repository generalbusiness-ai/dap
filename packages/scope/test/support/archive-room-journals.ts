/** Archive the genuine native scopes behind a factory lane, so replay can
 * prove their facts instead of taking them on an anchor. Host, policies and
 * pins are TEST stand-ins; each pass is one actual published archive pass. */
import { env, runInDurableObject } from "cloudflare:test";
import { PROPOSED_BOUNDS, type FactRef, type ScopeId, type ScopeRef, type Timestamp } from "@generalbusiness/dap-contract";
import { canonicalize, isFactRef, isRecord, isScopeRef } from "@generalbusiness/dap-bytes";
import { journalRef, type JournalFormat, type JournalObject } from "@generalbusiness/dap-git/journal";
import { ArchiveBudget } from "../../src/archive-budget.ts";
import { planPublishedArchivePass } from "../../src/archive-build.ts";
import type { ArchivePolicyRegistry } from "../../src/archive-inventory.ts";
import { archiveOwnReplayContext } from "../../src/archive-publication.ts";
import { FixtureArchiveSourcePins, type FixtureArchiveSourceBirth } from "../../src/archive-source-pins.ts";
import { archiveSourceReferences } from "../../src/archive-source-window.ts";
import { namespace } from "../../src/namespace.ts";
import { readNativeBirth } from "../../src/native-birth.ts";
import { archiveSql } from "./archive.ts";

export interface NativeArchivedJournal { readonly ref: string; readonly commit: string; readonly objects: readonly JournalObject[] }

/** One published pass over the whole current history of a native scope.
 * Every foreign source of that history gets its actual birth as a pin. */
export async function archiveNativeScope(object: DurableObjectStub, at: ScopeRef, policies: ArchivePolicyRegistry, format: JournalFormat, markedAt: Timestamp,
  declarations: ReadonlyMap<string, string> = new Map()): Promise<NativeArchivedJournal> {
  return runInDurableObject(object, async (_instance, state) => {
    const sql = archiveSql(state), budget = new ArchiveBudget();
    const head = state.storage.sql.exec<{ seq: number; hash: string }>("SELECT seq, hash FROM entry ORDER BY seq DESC LIMIT 1").one();
    const sources = new Map<string, ScopeRef>();
    for (let seq = 0; seq <= head.seq; seq++) {
      for (const source of sql.transaction(() => archiveSourceReferences(sql, seq, PROPOSED_BOUNDS, budget)).sources) sources.set(canonicalize(source), source);
    }
    const births: FixtureArchiveSourceBirth[] = [];
    for (const source of sources.values()) {
      const birth = readNativeBirth(await namespace(env.PLATFORM).births.read(source, 10_000, 256 * 1024), source, 256 * 1024, () => {})?.birth;
      if (!birth) throw Error(`Actual native source birth required for ${source.scope}`);
      // A digest pin needs its retained declaration; a platform pin needs none.
      const declaration = declarations.get(birth.named);
      births.push({ at: source, birth: { bytes: birth.proof.bytes, hash: birth.proof.fact.hash }, ...(declaration ? { declaration } : {}) });
    }
    const pins = new FixtureArchiveSourcePins(births, PROPOSED_BOUNDS, new ArchiveBudget(), policies);
    const replayContext = archiveOwnReplayContext(sql, at, PROPOSED_BOUNDS.entryBytes, new ArchiveBudget());
    const planned = await planPublishedArchivePass(sql, { at, through: { seq: head.seq, hash: head.hash as FactRef["hash"] }, after: null, bounds: PROPOSED_BOUNDS,
      policies, format, parent: null, markedAt, fixtureSources: pins, ...(replayContext ? { replayContext } : {}) }, budget);
    if (!planned.ok) throw Error(`native scope archive refused: ${canonicalize(planned)}`);
    return { ref: journalRef(at.scope), commit: planned.archive.commit, objects: planned.archive.objects };
  });
}

/** Caller anchors read from actual sealed entries, never from archive
 * output: every fact, or observed head, that names one of `scopes`. */
export function nativeAnchorFacts(entries: readonly unknown[], scopes: ReadonlySet<ScopeId>): readonly FactRef[] {
  const found = new Map<string, FactRef>();
  const pending = [...entries];
  while (pending.length) {
    const value = pending.pop();
    if (!value || typeof value !== "object") continue;
    if (isFactRef(value) && scopes.has(value.at.scope)) found.set(canonicalize(value), { at: value.at, seq: value.seq, hash: value.hash });
    if (isRecord(value) && isScopeRef(value["of"]) && isRecord(value["head"]) && scopes.has(value["of"].scope)) {
      const fact = { at: value["of"], seq: value["head"]["seq"], hash: value["head"]["hash"] };
      if (isFactRef(fact)) found.set(canonicalize(fact), fact);
    }
    pending.push(...Object.values(value));
  }
  return [...found.values()];
}
