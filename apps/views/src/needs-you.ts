/**
 * The walk behind `needs_you`: which lanes one read takes, and the rows each lane gives one viewer. These rows grant nothing.
 * `apps/views` and the room's Page both call this file, so both lists give the same rows under the same bounds. Keep its imports free of room reads and of Node, as in `attention.ts`.
 */
import { canonicalize, isFactRef, isMemberRef, isScopeRef } from "@generalbusiness/dap-bytes";
import type { Head, Item, MemberRef, ScopeRef, Summary } from "@generalbusiness/dap-contract";
import { J4_DIGESTS } from "../../room/lanes/src/digests-j4.ts";
import { changeKicker, changeRequests, findingReasons, mergeHolds, mergeReasons, questionRows, questions, reviewReasons, unknownMergeReasons } from "./attention.ts";
import { FINDING_CLAUSE, findingActs, findingProfile, malformedRange, openFindings, requiredSource, shownText, sourceRow } from "./findings.ts";
import { sameOptional } from "./words.ts";

export const LIMITS = Object.freeze({ scopes: 8, rows: 50, items: 512, history: 512, pages: 16, requests: 64, replyBytes: 4 * 1024 * 1024, bytes: 16 * 1024 * 1024, textBytes: 65536, textsBytes: 262144, milliseconds: 20000, requestMilliseconds: 5000 });

export interface Frame { ref: ScopeRef; head: Head; summary: Summary; items: Item[] }
export interface Row { scope: ScopeRef; head: Frame["head"]; item: number; type: string; rule: { definition: string; clause: string }; [key: string]: unknown }
export const row = (frame: Frame, item: Item, clause: string, values: Record<string, unknown>): Row => ({ scope: frame.ref, head: frame.head, item: item.id, type: item.type, rule: { definition: frame.summary.definition, clause }, ...values });
export const matchItem = (value: unknown, id: number, scope: ScopeRef): boolean => value === id || isFactRef(value) && sameOptional(value.at, scope) && value.seq === id;

/** A lane under an issue definition that these views read. */
export const issueLane = (pin: unknown): boolean => questions(pin) || pin === J4_DIGESTS.issue;
/** The recorded workspace declaration remains readable after fresh spelling changes. */
const RECORDED_J4_CHANGE = "sha256:e6c55417a6d686f34ee05eaa477f0dd6918c997268deb43ae735a2f1d0d3bfb7";
/** The exact pins of a change lane that these views read. There is no generic profile loader. */
export const changes = (pin: unknown): boolean => pin === RECORDED_J4_CHANGE || pin === J4_DIGESTS.change || findingProfile(pin);

/** Each lane the directory lists, once, in the stable order of a walk. Null when one lane names two incarnations. */
export function laneRefs(items: readonly Item[]): ScopeRef[] | null {
  const candidates = new Map<string, ScopeRef>();
  for (const item of items) if (item.type === "lane" && isScopeRef(item.refs["scope"])) {
    const ref = item.refs["scope"], old = candidates.get(ref.scope);
    if (old && !sameOptional(old, ref)) return null;
    candidates.set(ref.scope, ref);
  }
  return [...candidates.values()].sort((a, b) => canonicalize(a).localeCompare(canonicalize(b)));
}
/** The window of `room` lanes that follows `after` in that order, the lanes it leaves out, and the lane to name for the next window. `after` need not still be listed. */
export function laneWindow(refs: readonly ScopeRef[], room: number, after?: ScopeRef): { selected: ScopeRef[]; omitted: ScopeRef[]; next: ScopeRef | null } {
  const start = after ? canonicalize(after) : null, following = start === null ? [...refs] : refs.filter(ref => canonicalize(ref).localeCompare(start) > 0);
  const selected = following.slice(0, room);
  return { selected, omitted: refs.filter(ref => !selected.includes(ref)), next: following.length > selected.length ? selected.at(-1) ?? null : null };
}

/** An active agent's one active controller, from membership's items. */
export function controllerIn(items: readonly Item[], membership: ScopeRef, member: MemberRef): MemberRef | null {
  const agents = items.filter(item => item.type === "member" && item.state === "active" && item.values["kind"] === "agent" && item.values["role"] === "agent" && sameOptional(item.parties["member"], member));
  const controller = agents.length === 1 ? agents[0]!.parties["controller"] : null;
  if (!isMemberRef(controller) || !sameOptional(controller.membership, membership)) return null;
  const people = items.filter(item => item.type === "member" && item.state === "active" && item.values["kind"] === "person" && sameOptional(item.parties["member"], controller));
  return people.length === 1 ? controller : null;
}
/** The member that holds this active key, from membership's items. */
export function keyHolder(items: readonly Item[], key: string): MemberRef | null {
  const held = items.find(item => item.type === "key" && item.state === "active" && item.values["id"] === key);
  const member = held && items.find(item => item.type === "member" && item.id === held.refs["member"])?.parties["member"];
  return isMemberRef(member) ? member : null;
}

/** What the walk reads beyond each lane's summary. `Collection` answers it for `needs_you`, and the Page answers it from a browser. */
export interface RowReads {
  viewer: MemberRef; actions: readonly string[]; unread: { scope: ScopeRef; reason: string }[];
  controller(member: MemberRef): MemberRef | null;
  items(frame: Frame, type: string, states: readonly string[], ids: readonly number[]): Promise<Item[]>;
}

/** Which version of a change this is. `counts` holds every state of a type, so a superseded version counts without a read. */
const versionOf = (frame: Frame): number | null => frame.summary.counts.filter(([type]) => type === "manifest").reduce((sum, [, , count]) => sum + count, 0) || null;

/** One row for each open finding from a required source on a live change, for a viewer with an act that bears on it. The text is data, escaped as the Change card escapes it. */
async function findingRows(reads: RowReads, frame: Frame, holding: readonly Item[], rules: Item | undefined, kicker: string): Promise<Row[]> {
  const proposal = frame.items.find(item => item.type === "proposal" && (item.state === "open" || item.state === "draft"));
  if (!proposal || !holding.length) return [];
  const version = (finding: Item) => (item: Item) => item.type === "manifest" && matchItem(finding.refs["version"], item.id, frame.ref);
  // A finding carries across versions, and an earlier version has left the live summary. Its authors decide who can answer.
  const earlier = holding.filter(finding => !frame.items.some(version(finding))).map(finding => finding.refs["version"]).filter((id): id is number => typeof id === "number");
  const known = [...frame.items, ...earlier.length ? await reads.items(frame, "manifest", ["superseded"], [...new Set(earlier)].sort((a, b) => a - b)) : []];
  return holding.flatMap(finding => {
    const acts = findingActs(finding, proposal, known.find(version(finding)), reads.viewer, reads.actions);
    return acts.length ? [row(frame, finding, FINDING_CLAUSE, { category: "open-finding", kicker, ...findingReasons(finding, acts), holdsMerge: true, acts, permission: "not-determined",
      file: shownText(finding.values["file"]), start: finding.values["start"], end: finding.values["end"], ...(malformedRange(finding) ? { malformedRange: true } : {}),
      class: shownText(finding.values["class"]), severity: shownText(finding.values["severity"]), source: shownText(finding.values["source"]), sourceVersion: shownText(finding.values["sourceVersion"]),
      version: finding.refs["version"], rulesRevision: rules?.values["revision"] ?? null, sourceRow: sourceRow(rules, finding.values["source"]) })] : [];
  });
}

/** Every row of these lanes for this viewer, in lane order. A lane under another definition goes to `unread`. */
export async function needsYouRows(frames: readonly Frame[], reads: RowReads): Promise<Row[]> {
  const rows: Row[] = [];
  for (const frame of frames) {
    if (questions(frame.summary.definition)) for (const one of questionRows(frame.items, frame.ref, reads.viewer, reads.actions)) rows.push(row(frame, one.item, one.clause, { ...one.values }));
    if (changes(frame.summary.definition)) {
      const proposal = frame.items.find(item => item.type === "proposal");
      const manifest = frame.items.find(item => item.type === "manifest" && item.state === "current");
      const version = versionOf(frame), kicker = changeKicker(proposal, version);
      for (const item of frame.items) if (item.type === "review-request" && item.state === "open" && sameOptional(item.parties["requested"], reads.viewer))
        rows.push(row(frame, item, "acts.request-review-own;items.review-request", { category: "requested-review", kicker, ...reviewReasons(item, proposal), currentManifest: manifest?.id ?? null, requestVersionBound: false, permission: "not-determined" }));
      for (const item of frame.items) if (item.type === "merge" && item.state === "unknown" && (sameOptional(item.parties["merger"], reads.viewer) || isMemberRef(item.parties["merger"]) && sameOptional(reads.controller(item.parties["merger"]), reads.viewer)))
        rows.push(row(frame, item, "acts.merge;items.merge", { category: "unknown-merge", kicker, ...unknownMergeReasons(item, reads.viewer), manifest: item.refs["manifest"], retryAllowed: false }));
      const rules = frame.items.find(item => item.type === "rules");
      const holding = findingProfile(frame.summary.definition) ? openFindings(frame.items).filter(item => requiredSource(rules, item.values["source"])) : null;
      if (manifest && frame.items.some(item => item.type === "proposal" && item.state === "open") && reads.actions.includes("change.merge")) {
        const holds = mergeHolds(frame.items, manifest, rules, holding?.map(item => item.id) ?? [], version, frame.ref), requests = changeRequests(frame.items, manifest, frame.ref);
        rows.push(row(frame, manifest, requests.current.length ? "acts.merge#changes-requested;items.review" : "acts.merge", { category: "merge-attention", kicker, ...mergeReasons(proposal, version, holds, requests, reads.viewer), roleIncludes: "change.merge", permission: "not-determined", rules: rules?.values ?? null, ...(holding ? { heldBy: holding.map(item => item.id) } : {}),
          holds: holds.map(hold => hold.reason), changesRequested: requests.current.map(item => item.id) }));
      }
      if (holding) rows.push(...await findingRows(reads, frame, holding, rules, kicker));
    }
    if (!issueLane(frame.summary.definition) && !changes(frame.summary.definition)) reads.unread.push({ scope: frame.ref, reason: "unsupported-profile" });
  }
  return rows;
}
