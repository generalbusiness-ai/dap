/** Fixed nine-fact native origin of an Issue4 published-failure child.
 * This is no history search and never promotes another delivery-created lane. */
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import type { Digest, Entry, FactRef, ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize, deliveryCauseDigest, evidenceBindingDigest, intentDigest, isDigest, isFactRef, isMemberRef, isRecord, isSeed, messageDigest, readEvidenceBinding, same, scopeIdOf, seedDigest, utf8, verifySignedIntent } from "@generalbusiness/dap-bytes";
import { isEntryOf, sentBy, type Fetched } from "@generalbusiness/dap-derive";
import { EVIDENCE_LANE_PINS } from "./evidence-lane-pins.generated.ts";
import { EVIDENCE_RULES_COHORT as C } from "./evidence-cohort.ts";
import { readEvidenceWireV17 } from "./evidence-wire-v17.ts";

export const EVIDENCE_INCIDENT_PINS_V17 = Object.freeze({ issue: EVIDENCE_LANE_PINS.issue, change: EVIDENCE_LANE_PINS.change,
  directory: C.directory, destination: C.destination });

const natural = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && !Object.is(value, -0);
const objectId = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{40}$/.test(value);
const selfOr = (value: unknown, fact: FactRef): boolean => same(value, fact) || isRecord(value) && Object.keys(value).join() === "self" && value["self"] === true;
function body(entry: Entry, message: string): Record<string, unknown> | null {
  const input = entry.input;
  return input.type === "delivery" && input.message.class === "request" && input.message.type === "tell" && "decision" in input && input.decision === "applied"
    && isRecord(input.message.body) && input.message.body["message"] === message && isRecord(input.message.body["fields"]) ? input.message.body["fields"] : null;
}
function record(entry: Entry, item?: number): Record<string, unknown> | null {
  const rows = entry.effects.flatMap(effect => {
    if (effect.effect !== "value" || effect.slot !== "record" || item !== undefined && effect.item !== item) return [];
    const read = readEvidenceWireV17(effect.value, 196608);
    return read.ok && isRecord(read.value) && read.value["noticeAt"] === entry.seq ? [read.value] : [];
  });
  return rows.length === 1 ? rows[0]! : null;
}
function outcome(entry: Entry, kind: "evidence-result" | "evidence-notice" | "evidence-admit", selected: true | null): boolean {
  const input = entry.input;
  if (input.type !== "outcome" || input.owner !== C.destination || input.kind !== kind || input.attempt !== 1 || input.result !== "confirmed"
    || input.evidence.basis !== "own-answer" || !isRecord(input.evidence.body) || Object.keys(input.evidence.body).join() !== "job" || !isFactRef(input.evidence.body["job"])) return false;
  const rows = entry.effects.filter(effect => effect.effect === "attempt");
  return rows.length === 1 && rows[0]!.effect === "attempt" && rows[0]!.operation === input.operation && rows[0]!.attempt === 1
    && rows[0]!.result === "confirmed" && rows[0]!.selected === selected;
}

/** An incident's cause is sticky history. A later real settlement may change
 * the job, but cannot turn its earlier timeout into a failed checker result. */
function historicalCause(held: Record<string, unknown>, cause: Record<string, unknown>, through: number): boolean {
  const admitted = held["admittedAt"], decided = cause["decidedAt"], order = cause["order"], job = held["job"];
  if (!natural(admitted) || !natural(decided) || decided <= admitted || decided > through || !isFactRef(job)
    || !same(cause["job"], job) || !isFactRef(cause["publication"]) || !isRecord(order)
    || order["publication"] !== cause["publication"].seq || order["job"] !== admitted || !natural(order["publication"]) || order["publication"] > admitted) return false;
  const currentResult = held["result"], currentDecision = held["decidedAt"];
  const settled = isFactRef(currentResult) && same(currentResult.at, job.at) && currentResult.seq > job.seq
    && natural(currentDecision) && currentDecision >= decided && currentDecision <= through;
  if (cause["kind"] === "timeout") return cause["result"] === null && (held["state"] === "timeout" && currentResult === null && currentDecision === null
    || ["passed", "failed", "error"].includes(String(held["state"])) && settled && natural(currentDecision) && currentDecision > decided);
  return ["failed", "error"].includes(String(cause["kind"])) && held["state"] === cause["kind"] && settled
    && same(cause["result"], currentResult) && currentDecision === decided;
}

/** Exact local position only. The Scope owner supplies that stored entry's
 * real hash, rather than constructing a future/self fact or guessing one. */
export function evidenceIncidentAdmissionPositionV17(entry: Entry): number | null {
  try {
    if (entry.input.type !== "outcome" || !["evidence-result", "evidence-notice"].includes(entry.input.kind)
      || !outcome(entry, entry.input.kind as "evidence-result" | "evidence-notice", null)) return null;
    const held = record(entry), cause = held && isRecord(held["incident"]) ? held["incident"]["cause"] : null;
    if (!held || !isRecord(entry.input.evidence.body) || !natural(held["admittedAt"]) || held["admittedAt"] >= entry.seq || !isFactRef(held["job"])
      || !same(entry.input.evidence.body["job"], held["job"]) || !isRecord(cause) || !historicalCause(held, cause, entry.seq)) return null;
    return held["admittedAt"];
  } catch { return null; }
}

/** Null: a named immutable body is missing. False: supplied proof is forged,
 * borrowed, duplicated, malformed, or outside this exact successor path. */
export function evidenceIncidentOriginV17(named: Digest, facts: readonly Fetched[], at?: ScopeRef): boolean | null {
  try {
    if (named !== EVIDENCE_LANE_PINS.issue || facts.length > 9) return false;
    const missing = facts.length === 9 ? false : null;
    const child = facts[0];
    if (!child) return missing;
    if (child.fact.seq !== 0 || at && !same(child.fact.at, at)) return false;
    const keys = facts.map(copy => canonicalize(copy.fact));
    if (new Set(keys).size !== keys.length || facts.some(copy => !isEntryOf(copy.entry, copy.fact) || utf8(canonicalize(copy.entry)).length > PROPOSED_BOUNDS.entryBytes)) return false;
    const find = (fact: FactRef) => facts.find(copy => same(copy.fact, fact));
    const birth = child.entry.input;
    if (birth.type !== "genesis" || birth.decision !== "applied" || birth.kind !== "file" || !isSeed(birth.seed)
      || birth.seed.definition !== named || birth.seed.kind !== "lane" || birth.seed.ordinal !== 0 || birth.inc !== child.fact.at.inc
      || child.fact.at.kind !== "lane" || scopeIdOf(birth.seed) !== child.fact.at.scope || !isFactRef(birth.source)
      || birth.n === null || !birth.message || birth.message.class !== "request" || birth.message.type !== "create") return false;
    const creator = find(birth.source);
    if (!creator) return missing;
    if (creator !== facts[1] || creator.under !== "change" || !same(birth.seed.creator, creator.fact.at)) return false;
    const fields = body(creator.entry, "published-check-failure");
    if (!fields || creator.entry.input.type !== "delivery" || !isFactRef(fields["job"]) || !isFactRef(fields["publication"]) || !isFactRef(fields["manifest"])) return false;
    const parent = facts.find(copy => copy.fact.seq === 0 && same(copy.fact.at, creator.fact.at));
    if (!parent) return missing;
    const parentBirth = parent.entry.input;
    if (parentBirth.type !== "genesis" || parentBirth.decision !== "applied" || parentBirth.kind !== "open" || !isSeed(parentBirth.seed)
      || parentBirth.seed.definition !== EVIDENCE_LANE_PINS.change || parentBirth.seed.kind !== "lane" || parentBirth.seed.ordinal !== 0
      || parentBirth.inc !== parent.fact.at.inc || scopeIdOf(parentBirth.seed) !== parent.fact.at.scope || !isFactRef(parentBirth.source)
      || parentBirth.n === null || !parentBirth.message || parentBirth.message.class !== "request" || parentBirth.message.type !== "create") return false;
    const opened = find(parentBirth.source);
    if (!opened) return missing;
    const made = opened.entry.input;
    if (opened.under !== "platform:directory" || made.type !== "act" || made.signed.intent.kind !== "open-pr" || !verifySignedIntent(made.signed)
      || made.signed.intent.fields["definition"] !== EVIDENCE_LANE_PINS.change || !same(made.signed.intent.to, opened.fact.at)
      || !same(parentBirth.seed.creator, opened.fact.at) || parentBirth.seed.cause !== intentDigest(made.signed.intent)
      || !sentBy(opened.entry, { from: opened.fact, n: parentBirth.n, to: parentBirth.seed, message: parentBirth.message })) return false;
    const directory = facts.find(copy => copy.fact.seq === 0 && same(copy.fact.at, opened.fact.at));
    if (!directory) return missing;
    const office = directory.entry.input;
    if (directory.under !== "platform:directory" || office.type !== "genesis" || office.decision !== "applied" || office.kind !== "establish"
      || !isSeed(office.seed) || office.seed.definition !== C.directory || office.seed.kind !== "directory" || directory.fact.at.kind !== "directory"
      || office.inc !== directory.fact.at.inc || scopeIdOf(office.seed) !== directory.fact.at.scope || !isRecord(parentBirth.message.body)
      || !same(parentBirth.message.body["directory"], directory.fact.at) || !isRecord(parentBirth.message.body["fields"])) return false;
    const native = find(creator.entry.input.from);
    if (!native) return missing;
    const position = evidenceIncidentAdmissionPositionV17(native.entry);
    if (native.under !== "platform:destination" || position === null || !selfOr(fields["decision"], native.fact)
      || !sentBy(native.entry, { from: native.fact, n: creator.entry.input.n, to: creator.fact.at, message: creator.entry.input.message })) return false;
    const destination = facts.find(copy => copy.fact.seq === 0 && same(copy.fact.at, native.fact.at));
    if (!destination) return missing;
    const target = destination.entry.input;
    if (destination.under !== "platform:destination" || target.type !== "genesis" || target.decision !== "applied" || target.kind !== "establish"
      || !isSeed(target.seed) || target.seed.definition !== C.destination || target.seed.kind !== "destination" || target.seed.ordinal !== 2
      || target.inc !== destination.fact.at.inc || scopeIdOf(target.seed) !== destination.fact.at.scope || !same(target.seed.creator, directory.fact.at)
      || target.seed.cause !== seedDigest(office.seed) || !same(target.source, directory.fact) || target.n === null || !target.message
      || !sentBy(directory.entry, { from: directory.fact, n: target.n, to: target.seed, message: target.message })
      || !same(parentBirth.message.body["fields"]["destination"], destination.fact.at)) return false;
    const held = record(native.entry)!, binding = readEvidenceBinding(held["binding"]);
    if (!binding || binding.stage !== "published" || binding.subject.kind !== "published" || binding.auditOf !== null || !isDigest(held["bindingDigest"])
      || evidenceBindingDigest(binding) !== held["bindingDigest"] || !same(binding.subject.publication, fields["publication"])
      || !same(binding.subject.manifest, fields["manifest"]) || !same(binding.subject.publication.at, destination.fact.at)
      || !same(binding.subject.receipt.at, destination.fact.at) || !same(binding.subject.written.at, destination.fact.at)
      || !same(held["job"], fields["job"]) || !same(fields["job"].at, creator.fact.at) || !objectId(held["commit"]) || !objectId(held["tree"]) || !objectId(held["base"])) return false;
    const cause = (held["incident"] as Record<string, unknown>)["cause"] as Record<string, unknown>;
    if (!same(cause["publication"], binding.subject.publication) || cause["commit"] !== held["commit"]
      || fields["cause"] !== canonicalize(cause) || fields["policyGeneration"] !== canonicalize(binding.policyGeneration)
      || !(cause["result"] === null ? fields["result"] === undefined : same(fields["result"], cause["result"]))
      || !Array.isArray(fields["triagers"]) || fields["triagers"].length < 1 || fields["triagers"].length > 32 || !fields["triagers"].every(isMemberRef)) return false;
    const job = find(fields["job"]), admitted = facts.find(copy => copy.fact.seq === position && same(copy.fact.at, destination.fact.at));
    if (!job || !admitted) return missing;
    const jobFields = body(job.entry, "admit-published-check");
    const admittedRows = admitted.entry.effects.filter(effect => effect.effect === "value" && effect.item === position && effect.slot === "record");
    const initialWire = admittedRows.length === 1 && admittedRows[0]!.effect === "value" ? readEvidenceWireV17(admittedRows[0]!.value, 196608) : null;
    const initial = initialWire?.ok && isRecord(initialWire.value) ? initialWire.value : null;
    if (job.under !== "change" || !jobFields || job.entry.input.type !== "delivery" || !same(job.entry.input.from.at, destination.fact.at)
      || !job.entry.effects.some(effect => effect.effect === "open" && effect.item === job.fact.seq && effect.type === "job")
      || !outcome(admitted.entry, "evidence-admit", true) || !initial || initial["state"] !== "admitted" || initial["admittedAt"] !== position
      || !same(initial["job"], job.fact) || !same(initial["binding"], binding) || initial["bindingDigest"] !== held["bindingDigest"]
      || !admitted.entry.effects.some(effect => effect.effect === "open" && effect.item === position && effect.type === "evidence-job")
      || !same(admitted.entry.input.type === "outcome" && isRecord(admitted.entry.input.evidence.body) ? admitted.entry.input.evidence.body["job"] : null, job.fact)
      || !["name", "configuration", "commit", "tree", "base"].every(slot => same(initial[slot], held[slot]) && same(jobFields[slot], held[slot]))
      || typeof jobFields["binding"] !== "string" || canonicalize(binding) !== jobFields["binding"] || jobFields["bindingDigest"] !== held["bindingDigest"]) return false;
    if (!isRecord(birth.message.body) || !same(birth.message.body["directory"], directory.fact.at)
      || !same(birth.message.body["membership"], parentBirth.message.body["membership"]) || !isRecord(birth.message.body["fields"])) return false;
    const childFields = birth.message.body["fields"];
    if (childFields["kind"] !== "published-failure" || childFields["opener"] !== undefined || childFields["origin"] !== undefined
      || !selfOr(childFields["incident"], creator.fact) || !same(childFields["failure"], native.fact) || !same(childFields["failedJob"], job.fact)
      || !(fields["result"] === undefined ? childFields["failedResult"] === undefined : same(childFields["failedResult"], fields["result"]))
      || childFields["publishedCommit"] !== held["commit"] || !same(childFields["triagers"], fields["triagers"])
      || birth.seed.cause !== deliveryCauseDigest({ v: 1, from: creator.entry.input.from, n: creator.entry.input.n, message: messageDigest(creator.entry.input.message) })
      || !sentBy(creator.entry, { from: creator.fact, n: birth.n, to: birth.seed, message: birth.message })) return false;
    const required = [child, creator, parent, opened, directory, native, destination, admitted, job];
    return facts.length === 9 && new Set(required).size === 9 && facts.every(copy => required.includes(copy));
  } catch { return false; }
}
