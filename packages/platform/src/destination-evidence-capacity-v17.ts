/** Native funding identities are known before the published job exists.
 * A null job/owner is reserved capacity, never a fabricated future fact. */
import type { Digest, FactRef, FieldValue } from "@generalbusiness/dap-contract";
import { canonicalize, isFactRef, isRecord, isScopeRef, parseStrict, same, textDigest, utf8 } from "@generalbusiness/dap-bytes";
import type { ScopedRulesPosition } from "@generalbusiness/dap-contract";
import { evidenceBindingDigest, type EvidenceBinding } from "./evidence.ts";
import type { Item, RuleEffect, RuleGiven, StateView } from "@generalbusiness/dap-derive";
import { readEvidenceBatchV17, readEvidenceBatchWireV17, type EvidenceBatchRecordV17 } from "./evidence-batch-v17.ts";
import { bindEvidenceHoldPendingV17, clearEvidenceHoldPendingV17, EVIDENCE_HOLD_PENDING_V17, newEvidenceHoldV17, readEvidenceHoldKeyV17, readEvidenceHoldPendingV17,
  removeEvidenceHoldPendingV17, reserveEvidenceHoldPendingV17, withdrawEvidenceHoldPendingV17, type EvidenceHoldKeyV17, type EvidenceHoldPendingV17 } from "./evidence-holds-v17.ts";
import { readEvidenceCountsV17, reserveEvidenceCountsV17 } from "./evidence-index-v17.ts";
import { checkHoldsV13, checkSourceV13, checkStageV13, type RulesCheckV13, type RulesPolicyV13 } from "./rules-policy-v13.ts";
import { evidenceLedgerOfV17 } from "./evidence-ledger-v17.ts";
import { evidenceCarryingBudgetV17 } from "./destination-budget-v17.ts";
import { evidenceFutureEntriesV17 } from "./evidence-forecast-v17.ts";
import type { EvidenceJobRecordV17 } from "./destination-evidence-v17.ts";
import { evidenceWireV17, readEvidenceWireV17 } from "./evidence-wire-v17.ts";

export interface EvidenceCapacityAnchorV17 {
  v: 1; owner: number; generation: ScopedRulesPosition;
  holds: readonly { key: EvidenceHoldKeyV17; owner: number | null; pending: readonly EvidenceHoldPendingV17[] }[] | null;
  incidents: readonly { name: string; job: FactRef | null }[];
}
const exact = (value: unknown, keys: readonly string[]): value is Record<string, unknown> => isRecord(value)
  && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const natural = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && !Object.is(value, -0);
export const evidenceCapacityPolicyKeyV17 = (generation: ScopedRulesPosition): Digest => textDigest(canonicalize({ domain: "artroom-evidence-capacity-policy-1", generation }));
export function readEvidenceCapacityAnchorV17(value: unknown): EvidenceCapacityAnchorV17 | null {
  try {
  if (!exact(value, ["v", "owner", "generation", "holds", "incidents"]) || value["v"] !== 1 || !natural(value["owner"])
    || !exact(value["generation"], ["rules", "seq"]) || !isScopeRef(value["generation"]["rules"]) || value["generation"]["rules"].kind !== "rules" || !natural(value["generation"]["seq"])
    || !Array.isArray(value["incidents"]) || value["incidents"].length > 8 || value["incidents"].some(row => !exact(row, ["name", "job"])
      || typeof row["name"] !== "string" || utf8(row["name"]).length > 128 || !(row["job"] === null || isFactRef(row["job"]) && row["job"].at.kind === "lane"))
    || new Set(value["incidents"].map(row => row["name"])).size !== value["incidents"].length) return null;
  if (value["holds"] !== null && (!Array.isArray(value["holds"]) || value["holds"].length > 256 || value["holds"].some(row => !exact(row, ["key", "owner", "pending"])
    || !readEvidenceHoldKeyV17(row["key"]) || !same((row["key"] as EvidenceHoldKeyV17).generation, value["generation"]) || !(row["owner"] === null || natural(row["owner"])) || !readEvidenceHoldPendingV17(row["pending"]))
    || new Set(value["holds"].map(row => canonicalize(row["key"]))).size !== value["holds"].length)) return null;
  const text = canonicalize(value);
  return utf8(text).length <= 196608 ? parseStrict(text) as EvidenceCapacityAnchorV17 : null;
  } catch { return null; }
}
export function readEvidenceCapacityWireV17(value: unknown): EvidenceCapacityAnchorV17 | null {
  const read = readEvidenceWireV17(value, 196608);
  return read.ok ? readEvidenceCapacityAnchorV17(read.value) : null;
}
export function evidenceCapacityWireV17(value: EvidenceCapacityAnchorV17): string {
  if (!readEvidenceCapacityAnchorV17(value)) throw Error("The evidence capacity record is malformed");
  return evidenceWireV17(value, 196608);
}
export const evidenceCapacityValidV17 = (value: unknown): boolean => readEvidenceCapacityWireV17(value) !== null;
function maximumCapacity(value: EvidenceCapacityAnchorV17, publicationAt: FactRef["at"], jobAt: FactRef["at"], policy: RulesPolicyV13): EvidenceCapacityAnchorV17 {
  const max = Number.MAX_SAFE_INTEGER, hash = `sha256:${"f".repeat(64)}` as const;
  const keys = [...(value.holds ?? []).map(row => row.key)];
  if (value.holds !== null) for (const check of policy.checks.filter(check => checkStageV13(check) === "published" && checkHoldsV13(check))) {
    for (const extent of policy.extents.filter(extent => check.required || extent.checks.includes(check.name))) {
      const key: EvidenceHoldKeyV17 = { generation: value.generation, extent: extent.name, name: check.name,
        configuration: check.configuration, source: checkSourceV13(check), stage: "published" };
      if (!keys.some(old => same(old, key))) keys.push(key);
    }
  }
  return { ...value, owner: max, holds: value.holds === null ? null : keys.map(key => ({ key, owner: max,
    pending: Array.from({ length: EVIDENCE_HOLD_PENDING_V17 }, (_, n) => ({ publication: { at: publicationAt, seq: max - n, hash },
      name: key.name, job: { at: jobAt, seq: max - n, hash }, admittedAt: max - n })) })),
    incidents: value.incidents.map((row, n) => ({ ...row, job: { at: jobAt, seq: max - n, hash } })) };
}
export function evidencePendingCapacityForecastV17(given: RuleGiven, owner: number, jobAt: FactRef["at"]): readonly RuleEffect[] {
  const item = given.state.item(owner), capacity = readEvidenceCapacityWireV17(item?.values["capacity"]), batch = readEvidenceBatchWireV17(item?.values["batch"]);
  if (!capacity || !capacity.holds || !batch) throw Error("The future pending capacity record is unavailable");
  return [{ effect: "value", item: owner, slot: "capacity", value: evidenceCapacityWireV17(maximumCapacity(capacity, given.resolved.at, jobAt, batch.policy.policy)) }];
}
function policyAnchor(state: StateView, generation: ScopedRulesPosition): { item: Item; capacity: EvidenceCapacityAnchorV17 } | null {
  const ids = state.lookup("evidence-batch", "policyKey", canonicalize(evidenceCapacityPolicyKeyV17(generation)), 2);
  if (!ids || ids.length > 1) throw Error("Evidence generation capacity index is unavailable");
  if (!ids.length) return null;
  const item = state.item(ids[0]!), capacity = item && readEvidenceCapacityWireV17(item.values["capacity"]);
  if (!item || !capacity || capacity.owner !== item.id || capacity.holds === null || !same(capacity.generation, generation)) throw Error("Evidence generation capacity anchor is malformed");
  return { item, capacity };
}
export function evidenceHoldExtentNamesV17(check: Pick<RulesCheckV13, "name" | "required">,
  extents: RulesPolicyV13["extents"], touched: readonly string[]): readonly string[] {
  return extents.filter(extent => extent.checks.includes(check.name) || check.required && touched.includes(extent.name)).map(extent => extent.name);
}
function expectedHolds(batch: EvidenceBatchRecordV17): EvidenceHoldKeyV17[] {
  return batch.checks.filter(check => checkStageV13(check) === "published" && checkHoldsV13(check)).flatMap(check => batch.policy.policy.extents
    .filter(extent => evidenceHoldExtentNamesV17(check, batch.policy.policy.extents, batch.touched).includes(extent.name)).map(extent => ({ generation: { rules: batch.policy.rules, seq: batch.policy.revision },
      extent: extent.name, name: check.name, configuration: check.configuration, source: checkSourceV13(check), stage: "published" as const })));
}
/** Complete job and carrying-entry forecasts for every commissioned
 * published descriptor. These synthetic facts never leave this function. */
function publishedForecast(given: RuleGiven, batch: EvidenceBatchRecordV17, capacity: EvidenceCapacityAnchorV17,
  anchor: EvidenceCapacityAnchorV17): boolean {
  try {
  const MAX = Number.MAX_SAFE_INTEGER, HASH = `sha256:${"f".repeat(64)}` as const, object = "f".repeat(40), time = "9999-12-31T23:59:59.999Z";
  const nativeFact: FactRef = { at: batch.publication.at, seq: MAX, hash: HASH }, job: FactRef = { at: batch.operation.at, seq: MAX, hash: HASH };
  const publication = given.state.item(batch.publication.seq), manifest = publication?.refs["manifest"];
  if (!isFactRef(manifest)) return false;
  const maximumAnchor = maximumCapacity(anchor, batch.publication.at, batch.operation.at, batch.policy.policy);
  // Growing this generation's shared anchor must still fit older admitted
  // descriptors too. The complete frozen policy bounds this loop at32.
  for (const check of batch.policy.policy.checks.filter(check => checkStageV13(check) === "published")) {
    const keys = (maximumAnchor.holds ?? []).filter(row => row.key.name === check.name && row.key.configuration === check.configuration && row.key.source === checkSourceV13(check)).map(row => row.key);
    const owners = new Set((anchor.holds ?? []).filter(row => row.key.name === check.name && row.key.configuration === check.configuration && row.key.source === checkSourceV13(check))
      .flatMap(row => row.owner === null ? [] : [row.owner]));
    if (owners.size > 1) return false;
    const owner = keys.length ? [...owners][0] ?? MAX - 1 : MAX;
    const binding: EvidenceBinding = { v: 1, source: checkSourceV13(check), stage: "published", checker: check.checker,
      policyGeneration: capacity.generation, roomService: batch.policy.policy.roomService, serviceGeneration: batch.policy.serviceGeneration, auditOf: null,
      subject: { kind: "published", publication: batch.publication, receipt: nativeFact, written: nativeFact, manifest } };
    const record: EvidenceJobRecordV17 = { v: 1, job, name: check.name, configuration: check.configuration, binding,
      bindingDigest: evidenceBindingDigest(binding), state: "admitted", admittedAt: MAX, commit: object, tree: object, base: object,
      sourceFacts: [batch.publication, nativeFact, nativeFact, manifest, nativeFact, nativeFact, nativeFact], commitProof: null, policy: batch.policy,
      reuseOwner: null, reuse: null, holdOwner: keys.length ? owner : null, holds: [],
      policyOwner: capacity.owner, incident: { job, cause: null, state: "reserved", creation: null, child: null, reason: null }, result: null, signer: null,
      decidedAt: null, reason: null, observedGeneration: batch.policy.serviceGeneration, funded: { reuse: false, holds: keys.length > 0 && owner === MAX, policy: false, incident: true },
      countedJob: null, reuseRequested: false, deadline: time, forJob: null, noticeAt: null, holder: MAX - 3, requestAt: MAX - 2, covered: keys };
    const related: { item: number; record: EvidenceJobRecordV17 }[] = [];
    if (keys.length) {
      const stored = given.state.item(owner)?.values["record"], decoded = stored === undefined ? null : readEvidenceWireV17(stored, 196608);
      const old = decoded?.ok ? decoded.value : undefined;
      // An outstanding reservation can acquire another job owner before
      // this job arrives. Quote that distinct owner even while its pointer
      // is still null, rather than assuming this job will own the anchor.
      const priorKeys = (maximumAnchor.holds ?? []).filter(row => row.key.name === check.name && row.key.configuration === check.configuration && row.key.source === checkSourceV13(check)).map(row => row.key);
      if (stored !== undefined && !decoded?.ok || old !== undefined && (!isRecord(old) || !Array.isArray(old["holds"]))) return false;
      const held = old === undefined ? { ...record, job: { ...job, seq: MAX - 4 }, holds: priorKeys.map(key => newEvidenceHoldV17(key)!) } : old as unknown as EvidenceJobRecordV17;
      const next = { ...held, holds: [...held.holds, ...keys.filter(key => !held.holds.some(row => same(row.key, key))).map(key => newEvidenceHoldV17(key)!)] };
      related.push({ item: owner, record: next });
    }
    const settlement: RuleEffect[] = keys.length ? [{ effect: "value", item: capacity.owner, slot: "capacity",
      value: evidenceCapacityWireV17(maximumCapacity(anchor, batch.publication.at, batch.operation.at, batch.policy.policy)) }] : [];
    if (!evidenceFutureEntriesV17(given, { item: MAX, record }, related, () => null, settlement).admitted) return false;
    const value = (item: number, slot: string, field: FieldValue | null): RuleEffect => ({ effect: "value", item, slot, value: field });
    const admission: RuleEffect[] = [{ effect: "state", item: MAX - 2, state: "waiting" }, value(MAX - 2, "record", evidenceWireV17({ ...record, state: "pending" }, 196608)),
      { effect: "open", item: MAX, type: "evidence-job", state: keys.length && owner === MAX ? "hold-anchor" : "job" },
      { effect: "ref", item: MAX, slot: "lane", to: job.at },
      ...["jobKey", "reuseKey", "holdKey", "policyKey"].map(slot => value(MAX, slot, HASH)), value(MAX, "deadline", time), value(MAX, "record", evidenceWireV17(record, 196608)),
      ...related.map(row => value(row.item, "record", evidenceWireV17(row.record, 196608))), value(MAX - 3, "capacity", evidenceWireV17({ ...capacity, incidents: capacity.incidents.map(row => ({ ...row, job })) }, 196608)),
      ...(capacity.owner === given.resolved.self ? [] : [value(capacity.owner, "capacity", evidenceWireV17({ ...anchor, holds: anchor.holds?.map(row => ({ ...row, owner: MAX - 1 })) ?? null }, 196608))]),
      value(Number.MAX_SAFE_INTEGER, "service", evidenceWireV17({ mark: binding.roomService, generation: binding.serviceGeneration }, 16384)),
    ];
    const future = { ...given, input: { type: "outcome", owner: "platform:destination@17", kind: "evidence-admit", operation: `${MAX}:0`, attempt: 1,
      result: "confirmed", evidence: { basis: "own-answer", body: { job } } } } as unknown as RuleGiven;
    const decision = { to: job.at, message: { class: "request", type: "tell", body: { message: "check-decision", fields: { job, decision: { self: true },
      reason: "admitted", status: "admitted", frozenGeneration: canonicalize(binding.serviceGeneration), observedGeneration: canonicalize(binding.serviceGeneration), commit: object, tree: object, base: object } } } } as const;
    if (!evidenceCarryingBudgetV17(future, admission, [], [decision], []).admitted) return false;
  }
  return true;
  } catch { return false; }
}
/** Called only for the actual NEW WORK self-delivery that opens this batch.
 * The funding rule independently authenticates its captured publication. */
export function evidenceFundCapacityV17(given: RuleGiven, batch: EvidenceBatchRecordV17): { effects: RuleEffect[]; capacity: FieldValue; policyKey: Digest } | null {
  try {
  if (!readEvidenceBatchV17(batch)) return null;
  const ledger = evidenceLedgerOfV17(given.state); if (!ledger) return null;
  const counts = readEvidenceCountsV17(ledger.values["counts"]); if (!counts) return null;
  const generation = { rules: batch.policy.rules, seq: batch.policy.revision }, existing = policyAnchor(given.state, generation);
  const held = [...existing?.capacity.holds ?? []], requested = expectedHolds(batch);
  if (batch.checks.some(check => checkStageV13(check) === "published" && checkHoldsV13(check) && !requested.some(key => key.name === check.name))) return null;
  let added = 0;
  for (const key of requested) {
    let index = held.findIndex(row => same(row.key, key));
    if (index < 0) { held.push({ key, owner: null, pending: [] }); index = held.length - 1; added++; }
    let pending = held[index]!.pending;
    // Only an explicit withdrawn publication in an irreversible Native
    // terminal state releases an unbound identity. Time never evicts it.
    for (const slot of pending) {
      const publication = given.state.item(slot.publication.seq), sealed = given.own?.(slot.publication.seq);
      if (slot.job !== null || !publication || publication.type !== "publication" || !sealed || sealed.hash !== slot.publication.hash
        || !same(sealed.entry.at, slot.publication.at) || !same(slot.publication.at, given.resolved.at)
        || publication.values["withdrawDecided"] !== true || !["not-reserved", "cleanup-deleted", "cleaned"].includes(publication.state)) continue;
      const removed = withdrawEvidenceHoldPendingV17(pending, slot.publication);
      if (!removed.ok) return null; pending = removed.pending;
    }
    const reserved = reserveEvidenceHoldPendingV17(pending, batch.publication, key.name);
    if (!reserved.ok) return null;
    held[index] = { ...held[index]!, pending: reserved.pending };
  }
  const incidents = batch.checks.filter(check => checkStageV13(check) === "published").map(check => ({ name: check.name, job: null }));
  const ownsPolicy = !existing && requested.length > 0;
  const next = reserveEvidenceCountsV17(counts, { keys: 0, holds: added, policyGenerations: ownsPolicy ? 1 : 0, incidents: incidents.length });
  if (!next.ok) return null;
  const capacity: EvidenceCapacityAnchorV17 = { v: 1, owner: existing?.item.id ?? given.resolved.self, generation,
    holds: existing ? null : held, incidents };
  const anchor = existing ? { ...existing.capacity, holds: held } : capacity;
  if (!readEvidenceCapacityAnchorV17(capacity) || !readEvidenceCapacityAnchorV17(anchor)) return null;
  const effects: RuleEffect[] = same(counts, next.counts) ? [] : [{ effect: "value", item: ledger.id, slot: "counts", value: next.counts as unknown as FieldValue }];
  if (existing && !same(existing.capacity, anchor)) effects.push({ effect: "value", item: existing.item.id, slot: "capacity", value: evidenceCapacityWireV17(anchor) });
  // Only decimal positions and the exact descriptor's future job identity
  // can grow. No invented future fact is stored by this forecast.
  const futureCapacity = (value: EvidenceCapacityAnchorV17): EvidenceCapacityAnchorV17 => maximumCapacity(value, batch.publication.at, batch.operation.at, batch.policy.policy);
  const futureAnchor = futureCapacity(anchor), futureLocal = futureCapacity(capacity);
  const longest = [...batch.checks].sort((a, b) => utf8(canonicalize(b.name)).length - utf8(canonicalize(a.name)).length)[0];
  if (!longest) return null;
  const futureBatch = { ...batch, planAt: Number.MAX_SAFE_INTEGER, jobs: Array.from({ length: 8 }, () => ({ name: longest.name,
    job: { at: batch.operation.at, seq: Number.MAX_SAFE_INTEGER, hash: `sha256:${"f".repeat(64)}` } })) };
  const futureEffects: RuleEffect[] = [
    { effect: "value", item: given.resolved.self, slot: "batch", value: evidenceWireV17(futureBatch, 196608) },
    { effect: "value", item: given.resolved.self, slot: "capacity", value: evidenceCapacityWireV17(futureLocal) },
    ...(existing ? [{ effect: "value" as const, item: existing.item.id, slot: "capacity", value: evidenceCapacityWireV17(futureAnchor) }] : []),
  ];
  if (!readEvidenceCapacityAnchorV17(futureAnchor) || !readEvidenceCapacityAnchorV17(futureLocal)
    || utf8(canonicalize(futureBatch)).length > 196608 || !evidenceCarryingBudgetV17(given, futureEffects, [], [], []).admitted
    || !publishedForecast(given, batch, capacity, anchor)) return null;
  return { effects, capacity: evidenceCapacityWireV17(capacity),
    policyKey: ownsPolicy ? evidenceCapacityPolicyKeyV17(generation) : textDigest(canonicalize({ domain: "artroom-evidence-capacity-unused-1", publication: batch.publication, ordinal: batch.ordinal })) };
  } catch { return null; }
}
/** Binds one pre-funded identity to the actual admitted job. Counts do not
 * change here: every published descriptor was charged before the write. */
export function evidenceSpendPublishedCapacityV17(given: RuleGiven, holder: number, binding: EvidenceBinding, name: string, configuration: Digest,
  job: FactRef, admitted = true): { policyOwner: number; holdOwner: number; keys: readonly EvidenceHoldKeyV17[]; effects: RuleEffect[] } | null {
  if (binding.stage !== "published") return null;
  const item = given.state.item(holder), batch = item && readEvidenceBatchWireV17(item.values["batch"]), capacity = item && readEvidenceCapacityWireV17(item.values["capacity"]);
  if (!item || !batch || !capacity || !same(binding.policyGeneration, capacity.generation) || !batch.jobs.some(row => row.name === name && same(row.job, job))
    || !batch.checks.some(check => check.name === name && check.configuration === configuration && checkStageV13(check) === "published")) return null;
  const incident = capacity.incidents.find(row => row.name === name);
  if (!incident || incident.job !== null && !same(incident.job, job)) return null;
  const anchorItem = given.state.item(capacity.owner), anchor = anchorItem && readEvidenceCapacityWireV17(anchorItem.values["capacity"]);
  if (!anchorItem || !anchor?.holds || anchor.owner !== anchorItem.id || !same(anchor.generation, binding.policyGeneration)) return null;
  const required = expectedHolds(batch).filter(key => key.name === name && key.configuration === configuration && key.source === binding.source);
  const selected = required.map(key => anchor.holds!.find(row => same(row.key, key)));
  if (selected.some(row => !row)) return null;
  const owners = new Set(anchor.holds.filter(row => row.key.name === name && row.key.configuration === configuration && row.key.source === binding.source)
    .flatMap(row => row.owner === null ? [] : [row.owner]));
  if (owners.size > 1) return null;
  const holdOwner = [...owners][0] ?? given.resolved.self;
  const holds: NonNullable<EvidenceCapacityAnchorV17["holds"]>[number][] = [];
  for (const row of anchor.holds) {
    if (!required.some(key => same(row.key, key))) { holds.push(row); continue; }
    const owner = row.owner === null ? null : given.state.item(row.owner), wire = owner?.values["record"];
    const read = wire === undefined ? null : readEvidenceWireV17(wire, 196608), decoded = read?.ok ? read.value : null;
    const old = isRecord(decoded) && Array.isArray(decoded["holds"]) ? decoded["holds"].find(value => isRecord(value) && same(value["key"], row.key)) : null;
    const release = isRecord(old) && isRecord(old["release"]) && isRecord(old["release"]["through"]) ? old["release"]["through"]["publication"] : null;
    if (release !== null && !natural(release)) return null;
    const bound = admitted ? bindEvidenceHoldPendingV17(row.pending, batch.publication, name, job, given.resolved.self, release)
      : withdrawEvidenceHoldPendingV17(row.pending, batch.publication);
    if (!bound.ok) return null;
    holds.push({ ...row, owner: holdOwner, pending: bound.pending });
  }
  const nextAnchor = { ...anchor, holds };
  const nextCapacity = { ...(capacity.owner === holder ? nextAnchor : capacity), incidents: capacity.incidents.map(row => row.name === name ? { ...row, job } : row) };
  if (!readEvidenceCapacityAnchorV17(nextCapacity) || !readEvidenceCapacityAnchorV17(nextAnchor)) return null;
  const effects: RuleEffect[] = [{ effect: "value", item: holder, slot: "capacity", value: evidenceCapacityWireV17(nextCapacity) }];
  if (capacity.owner !== holder && !same(anchor, nextAnchor))
    effects.push({ effect: "value", item: capacity.owner, slot: "capacity", value: evidenceCapacityWireV17(nextAnchor) });
  return { policyOwner: capacity.owner, holdOwner, keys: required, effects };
}

/** A proved terminal result or explicit release changes only the indexed
 * pointers it names. Notification and elapsed time do not call this. */
export function evidenceSettlePendingCapacityV17(given: RuleGiven, owner: number, keys: readonly EvidenceHoldKeyV17[], job: FactRef,
  throughPublication: number | null = null): readonly RuleEffect[] {
  const item = given.state.item(owner), anchor = item && readEvidenceCapacityWireV17(item.values["capacity"]);
  if (!anchor?.holds || anchor.owner !== owner) throw Error("The pending hold capacity anchor is unavailable");
  const holds = anchor.holds.map(row => {
    if (!keys.some(key => same(key, row.key))) return row;
    const changed = throughPublication === null ? removeEvidenceHoldPendingV17(row.pending, job) : clearEvidenceHoldPendingV17(row.pending, throughPublication);
    if (!changed.ok) throw Error("A proved hold settlement lost its pending identity");
    return { ...row, pending: changed.pending };
  });
  return same(holds, anchor.holds) ? [] : [{ effect: "value", item: owner, slot: "capacity", value: evidenceCapacityWireV17({ ...anchor, holds }) }];
}
