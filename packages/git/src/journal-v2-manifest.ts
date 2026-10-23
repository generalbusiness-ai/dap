/** A v2 manifest describes one bounded pass. It never indexes old passes. */
import type { Digest, FactRef, Head, ScopeId, ScopeRef } from "@generalbusiness/dap-contract";
import { isDigest, isScopeId, isScopeRef } from "@generalbusiness/dap-bytes";
import type { ArchiveRetainedName } from "./journal-path.ts";
import { journalJSON } from "./journal-manifest.ts";
import { journalFormat, journalId, type JournalFormat } from "./journal-objects.ts";
import { JOURNAL_SELECTION_BYTES, journalForeignSources, journalKeyName, journalList, journalNatural, journalOrdered, journalRecord, journalRetainedKey, type JournalForeignSource, type JournalPassSelection } from "./journal-selection.ts";
import { JOURNAL_V2_LAST_POSITION } from "./journal-v2-path.ts";
import { JournalWork, refuseJournal } from "./journal-work.ts";
import { journalManifestRowsMetadata } from "./journal-pass-cost.ts";
import { journalAnchors, journalAnchorCopyCount, journalLegacyAnchors, type JournalLegacyAnchors } from "./journal-anchors.ts";

export type JournalPassRetained = ArchiveRetainedName & { readonly pass: number };
export interface JournalTextOmission { readonly digest: Digest; readonly bytes: number; readonly first: { readonly scope: ScopeId; readonly seq: number } }
export interface JournalPassManifest {
  readonly v: 2;
  readonly through: Head;
  readonly parent: string | null;
  readonly format: JournalFormat;
  readonly entries: readonly [number, number];
  readonly retained: readonly JournalPassRetained[];
  readonly omitted: readonly { readonly kind: "text"; readonly digest: Digest; readonly reason: "detached-text"; readonly bytes?: number; readonly first?: JournalTextOmission["first"] }[];
  readonly foreignSources?: readonly JournalForeignSource[];
  readonly anchors?: readonly FactRef[];
  readonly legacyAnchors?: JournalLegacyAnchors;
}
export interface JournalV2Head { readonly v: 2; readonly scope: ScopeRef; readonly through: number; readonly hash: Digest }
export function journalV2Head(body: Uint8Array, work: JournalWork): JournalV2Head {
  const row = journalRecord(journalJSON(body, 1024, work), ["v", "scope", "through", "hash"]);
  if (row["v"] !== 2 || !isScopeRef(row["scope"]) || !journalNatural(row["through"]) || row["through"] > JOURNAL_V2_LAST_POSITION || !isDigest(row["hash"])) return refuseJournal("manifest");
  return { v: 2, scope: { ...row["scope"] }, through: row["through"], hash: row["hash"] };
}
export function journalPassManifest(body: Uint8Array, expected: JournalFormat, work: JournalWork): JournalPassManifest {
  const value = journalJSON(body, JOURNAL_SELECTION_BYTES, work);
  const extended = value !== null && typeof value === "object" && Object.hasOwn(value, "foreignSources");
  const published = value !== null && typeof value === "object" && Object.hasOwn(value, "anchors");
  const legacy = value !== null && typeof value === "object" && Object.hasOwn(value, "legacyAnchors");
  if (legacy && !published) return refuseJournal("manifest", "legacy anchors without current publication");
  const row = journalRecord(value, ["v", "through", "parent", "format", "entries", "retained", "omitted", ...(extended ? ["foreignSources"] : []), ...(published ? ["anchors"] : []), ...(legacy ? ["legacyAnchors"] : [])]);
  const sources = extended ? journalForeignSources(row["foreignSources"], work) : [];
  const through = journalRecord(row["through"], ["seq", "hash"]), range = journalList(row["entries"], 2, work);
  if (row["v"] !== 2 || journalFormat(row["format"]) !== expected || !journalNatural(through["seq"]) || through["seq"] > JOURNAL_V2_LAST_POSITION
    || !isDigest(through["hash"]) || range.length !== 2 || !journalNatural(range[0]) || range[0] > through["seq"] || through["seq"] - range[0] >= 4096 || range[1] !== through["seq"]) return refuseJournal("manifest");
  const first = range[0], last = through["seq"], parent = row["parent"] === null ? null : journalId(expected, row["parent"]);
  const retained = journalList(row["retained"], 512, work).map(raw => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return refuseJournal("manifest");
    const record = raw as Record<string, unknown>;
    journalRecord(record, record["kind"] === "value" ? ["kind", "domain", "digest", "pass"] : ["kind", "digest", "pass"]);
    const { pass, ...key } = record;
    if (!journalNatural(pass) || pass > first) return refuseJournal("manifest");
    return { ...journalRetainedKey(key), pass };
  });
  const omitted = journalList(row["omitted"], 8192, work).map(raw => {
    const measured = raw !== null && typeof raw === "object" && (Object.hasOwn(raw, "bytes") || Object.hasOwn(raw, "first"));
    const key = journalRecord(raw, ["kind", "digest", "reason", ...(measured ? ["bytes", "first"] : [])]);
    if (key["kind"] !== "text" || !isDigest(key["digest"]) || key["reason"] !== "detached-text") return refuseJournal("manifest");
    const omission = { kind: "text" as const, digest: key["digest"], reason: "detached-text" as const };
    if (!measured) return omission;
    work.metadata(256);
    const named = journalRecord(key["first"], ["scope", "seq"]);
    if (!journalNatural(key["bytes"]) || key["bytes"] < 2 || !isScopeId(named["scope"]) || !journalNatural(named["seq"]) || named["seq"] < first || named["seq"] > last) return refuseJournal("manifest");
    return { ...omission, bytes: key["bytes"], first: { scope: named["scope"], seq: named["seq"] } };
  });
  const checkOrder = <T>(rows: readonly T[], key: (row: T) => string): void => {
    const names = rows.map(key), ordered = journalOrdered(rows, key, work).map(key);
    if (new Set(names).size !== names.length || names.some((name, i) => name !== ordered[i])) return refuseJournal("manifest");
  };
  checkOrder(retained, journalKeyName); checkOrder(omitted, journalKeyName);
  const present = new Set(retained.map(journalKeyName));
  if (omitted.some(key => present.has(journalKeyName(key))) || (sources.length > 0) !== retained.some(key => key.kind === "entry")) return refuseJournal("manifest");
  const anchors = published ? journalAnchors(row["anchors"], journalAnchorCopyCount(retained, work), work) : undefined;
  const legacyAnchors = legacy ? journalLegacyAnchors(row["legacyAnchors"], first, work) : undefined;
  work.check();
  return { v: 2, through: { seq: through["seq"], hash: through["hash"] }, parent, format: expected, entries: [first, through["seq"]], retained, omitted, ...(sources.length ? { foreignSources: sources } : {}), ...(anchors ? { anchors } : {}), ...(legacyAnchors ? { legacyAnchors } : {}) };
}
export function manifestOfPass(selection: JournalPassSelection, format: JournalFormat, parent: string | null, work: JournalWork): JournalPassManifest {
  journalFormat(format); if (parent !== null) journalId(format, parent);
  work.metadata(journalManifestRowsMetadata(selection.objects.length + selection.omitted.length + (selection.anchors?.length ?? 0) + (selection.legacyAnchors?.anchors.length ?? 0)));
  return { v: 2, through: { ...selection.through }, parent, format,
    entries: [selection.after ? selection.after.seq + 1 : 0, selection.through.seq],
    retained: selection.objects.map(row => ({ ...row.key, pass: row.pass })),
    omitted: selection.omitted.map(row => ({ kind: row.kind, digest: row.digest, reason: row.reason,
      ...(row.bytes === undefined ? {} : { bytes: row.bytes, first: { scope: selection.at.scope, seq: Math.min(...row.consumers.map(consumer => consumer.origin.at.seq)) } }) })),
    ...(selection.foreignSources?.length ? { foreignSources: selection.foreignSources.map(source => ({ at: { ...source.at }, pin: source.pin })) } : {}),
    ...(selection.anchors ? { anchors: journalAnchors(selection.anchors, journalAnchorCopyCount(selection.objects, work), work, [selection.at]) } : {}),
    ...(selection.legacyAnchors ? { legacyAnchors: journalLegacyAnchors(selection.legacyAnchors, selection.after ? selection.after.seq + 1 : 0, work, [selection.at]) } : {}) };
}
