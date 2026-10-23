/** Published caller-word facts, never source proof or automatic replay trust.
 * Only an integrity-bound v2 pass can publish these descriptive lists. */
import type { FactRef, ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize, isFactRef, isRecord } from "@generalbusiness/dap-bytes";
import { JOURNAL_SELECTION_BYTES } from "./journal-selection-cost.ts";
import { JournalWork, refuseJournal } from "./journal-work.ts";
import type { JournalPassManifest } from "./journal-v2-manifest.ts";

export interface JournalLegacyAnchors {
  readonly from: 0;
  readonly through: number;
  readonly anchors: readonly FactRef[];
}
export interface JournalAnchorPublication {
  readonly anchors: readonly FactRef[];
  readonly legacyAnchors?: JournalLegacyAnchors;
}
/** Keep each list's range: aggregate caller trust cannot establish that a
 * different pass actually needed the same fact. */
export interface JournalAnchorRange {
  readonly from: number;
  readonly through: number;
  readonly anchors: readonly FactRef[];
  readonly legacy?: true;
}
/** Full fixed-width identities plus punctuation, including the optional
 * range. This is charged metadata, not an increased manifest allowance. */
export const journalPublicationUnits = (anchors: number): number => 256 + anchors * 512;
/** Meter each additional descriptive visit separately from the parser. */
export function journalAnchorCopyCount(rows: readonly { readonly kind?: string; readonly key?: { readonly kind: string } }[], work: JournalWork): number {
  work.input(rows.length * 128);
  let copies = 0;
  for (const row of rows) { work.check(); if ((row.key?.kind ?? row.kind) === "entry") copies++; }
  return copies;
}
export interface JournalAnchorCoverage {
  readonly covered: boolean;
  /** The commit is the currently validated immutable snapshot, not a claim
   * that an individual historical pass commit was independently walked. */
  readonly unpublished: readonly { readonly commit: string; readonly from: number; readonly through: number }[];
  readonly legacy: readonly { readonly pass: number; readonly commit: string; readonly from: number; readonly through: number }[];
}
function record(value: unknown, fields: readonly string[]): Record<string, unknown> {
  if (!isRecord(value) || Object.keys(value).length !== fields.length || Object.keys(value).some(key => !fields.includes(key))) return refuseJournal("tree", "anchor fields");
  return value;
}

/** Check canonical order without silently sorting or removing duplicates.
 * A scope/position is unique even if another hash/incarnation is supplied. */
export function journalAnchors(value: unknown, _copies: number, work: JournalWork, archived: readonly ScopeRef[] = []): readonly FactRef[] {
  // The compatibility argument is deliberately not a count bound. Lists
  // are inside the unchanged manifest byte cap and pay metadata per fact.
  if (!Array.isArray(value)) return refuseJournal("manifest");
  const rows = value;
  work.metadata(rows.length * 512);
  const result: FactRef[] = [];
  let prior: FactRef | undefined;
  for (const value of rows) {
    const row = record(value, ["at", "seq", "hash"]);
    record(row["at"], ["scope", "inc", "kind"]);
    if (!isFactRef(row) || row.at.kind !== "register" && row.at.kind !== "membership"
      || archived.some(at => at.scope === row.at.scope)
      || prior && (prior.at.scope > row.at.scope || prior.at.scope === row.at.scope && prior.seq >= row.seq)) return refuseJournal("tree", "anchor identity/order");
    work.input(1024);
    const fact = Object.freeze({ at: Object.freeze({ ...row.at }), seq: row.seq, hash: row.hash });
    result.push(fact); prior = fact;
  }
  return Object.freeze(result);
}

/** The unchanged byte cap and per-anchor metadata bound this list too. */
export function journalLegacyAnchors(value: unknown, first: number, work: JournalWork, archived: readonly ScopeRef[] = []): JournalLegacyAnchors {
  const row = record(value, ["from", "through", "anchors"]);
  if (first === 0 || row["from"] !== 0 || row["through"] !== first - 1) return refuseJournal("manifest", "legacy anchor range");
  return Object.freeze({ from: 0, through: first - 1, anchors: journalAnchors(row["anchors"], JOURNAL_SELECTION_BYTES, work, archived) });
}
export function journalAnchorPublication(value: unknown, copies: number, first: number, work: JournalWork, archived: readonly ScopeRef[] = []): JournalAnchorPublication {
  const legacy = isRecord(value) && Object.hasOwn(value, "legacyAnchors");
  const row = record(value, ["anchors", ...(legacy ? ["legacyAnchors"] : [])]);
  return Object.freeze({ anchors: journalAnchors(row["anchors"], copies, work, archived),
    ...(legacy ? { legacyAnchors: journalLegacyAnchors(row["legacyAnchors"], first, work, archived) } : {}) });
}

/** Coverage concerns publication in this immutable snapshot only. Missing
 * old fields remain visible; this function never reconstructs their lists. */
export function readJournalAnchorPublication(passes: readonly JournalPassManifest[], archived: readonly ScopeRef[], commit: string, work: JournalWork):
  { readonly publishedAnchors: readonly FactRef[]; readonly anchorRanges: readonly JournalAnchorRange[]; readonly anchorCoverage: JournalAnchorCoverage } {
  const published = new Map<string, FactRef>();
  const ranges: JournalAnchorRange[] = [];
  const legacy: JournalAnchorCoverage["legacy"][number][] = [];
  let legacyThrough = -1;
  const add = (facts: readonly FactRef[]) => {
    const checked = journalAnchors(facts, 0, work, archived);
    for (const fact of checked) {
      work.metadata(128); work.input(1024);
      const key = canonicalize([fact.at, fact.seq]), prior = published.get(key);
      if (prior && canonicalize(prior) !== canonicalize(fact)) return refuseJournal("manifest", "conflicting published anchor");
      if (!prior) published.set(key, fact);
    }
  };
  for (const pass of passes) {
    work.metadata(128);
    if (pass.anchors !== undefined) {
      add(pass.anchors);
      ranges.push(Object.freeze({ from: pass.entries[0], through: pass.through.seq, anchors: pass.anchors }));
    }
    if (pass.legacyAnchors) {
      const covered = pass.legacyAnchors;
      if (covered.from !== 0 || covered.through !== pass.entries[0] - 1 || pass.anchors === undefined) return refuseJournal("manifest", "legacy anchor range");
      add(covered.anchors);
      ranges.push(Object.freeze({ from: covered.from, through: covered.through, anchors: covered.anchors, legacy: true }));
      legacyThrough = Math.max(legacyThrough, covered.through);
      legacy.push(Object.freeze({ pass: pass.entries[0], commit, from: covered.from, through: covered.through }));
    }
  }
  const unpublished: JournalAnchorCoverage["unpublished"][number][] = [];
  for (const pass of passes) {
    work.input(128);
    if (pass.anchors === undefined && legacyThrough < pass.through.seq) {
      work.metadata(128); unpublished.push(Object.freeze({ commit, from: pass.entries[0], through: pass.through.seq }));
    }
  }
  // Across passes a fact can repeat. Only identical repetitions collapse;
  // the output remains in the required scope/position order.
  work.input(published.size * 1024 * (Math.ceil(Math.log2(published.size + 1)) + 1));
  const anchors = [...published.values()].sort((a, b) => a.at.scope < b.at.scope ? -1 : a.at.scope > b.at.scope ? 1 : a.seq - b.seq
    || (a.at.inc < b.at.inc ? -1 : a.at.inc > b.at.inc ? 1 : a.at.kind < b.at.kind ? -1 : a.at.kind > b.at.kind ? 1 : 0));
  return Object.freeze({ publishedAnchors: Object.freeze(anchors), anchorRanges: Object.freeze(ranges), anchorCoverage: Object.freeze({ covered: unpublished.length === 0,
    unpublished: Object.freeze(unpublished), legacy: Object.freeze(legacy) }) });
}
