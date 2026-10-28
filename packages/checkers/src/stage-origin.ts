/** Successor job origin: an actual G17 admission, never a synthetic legacy manifest. */
import type { Digest, Effect, FactRef, KeyId, Sealed, SignedIntent } from "@generalbusiness/dap-contract";
import { canonicalBytes, canonicalize, entryHash, evidenceBindingDigest, isDigest, isEntry, isFactRef, isRecord, parseStrict, readEvidenceBinding, timeMs, utf8, verifySignedIntent } from "@generalbusiness/dap-bytes";
import { isObjectId, readOwnedCheckoutSnapshot, STAGE_SNAPSHOT_BOUNDS, type StageSnapshot, type StageSnapshotReply } from "@generalbusiness/dap-git";
import type { Job, Notice, Origin, OriginRead } from "./job.ts";

const same = (a: unknown, b: unknown): boolean => canonicalize(a) === canonicalize(b);
const factOf = (sealed: Sealed): FactRef => ({ at: sealed.entry.at, seq: sealed.entry.seq, hash: sealed.hash });
const value = (effects: readonly Effect[], item: number, slot: string): unknown => {
  const rows = effects.filter(effect => effect.effect === "value" && effect.item === item && effect.slot === slot);
  return rows.length === 1 && rows[0]!.effect === "value" ? rows[0]!.value : undefined;
};
const sound = (sealed: Sealed): boolean => isRecord(sealed) && isEntry(sealed.entry) && entryHash(sealed.entry) === sealed.hash;
// G17's versioned opaque record wire. Generic FieldValue still excludes nested nulls.
const ADMISSION_RECORD_BYTES_V17 = 196_608;
function admissionRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "string" || value.length > ADMISSION_RECORD_BYTES_V17 || utf8(value).length > ADMISSION_RECORD_BYTES_V17) return null;
  const parsed = parseStrict(value);
  return isRecord(parsed) && canonicalize(parsed) === value ? parsed : null;
}
const sent = (source: Sealed, target: Sealed): boolean => {
  const input = target.entry.input;
  if (input.type !== "delivery" || !same(factOf(source), input.from)) return false;
  return source.entry.sends.some(send => send.n === input.n && same(send.to, target.entry.at) && same(send.message, input.message));
};
/** Cohort-selected identities supplied by the service's trusted configuration, never by a notice. */
export interface EvidenceDefinitions { issue: Digest; change: Digest }

/** Shape and causal/native origin only. Current standing is also required from the signed host read. */
export function stageOriginOf(notice: Notice, read: Pick<OriginRead, "entry" | "pinned" | "activated">, snapshot: StageSnapshot, signer: KeyId, definitions: EvidenceDefinitions | undefined): Origin {
  const no = (): Origin => ({ not: "stage-origin-mismatch" });
  try {
    if (!isRecord(snapshot) || Object.keys(snapshot).sort().join() !== "admission,base,binding,commit,destination,job,objects,sources,tree,v"
      || snapshot.v !== 1 || !read.entry || !sound(snapshot.job) || !sound(snapshot.admission) || !same(snapshot.job, read.entry)
      || !same(factOf(snapshot.job), notice.job) || !same(snapshot.job.entry.at, notice.lane) || snapshot.destination.kind !== "destination"
      || !same(snapshot.admission.entry.at, snapshot.destination) || !Array.isArray(snapshot.sources) || snapshot.sources.length > 32 || snapshot.sources.some(source => !sound(source))) return no();
    const sourceEntries: readonly Sealed[] = snapshot.sources;
    const proof = { v: snapshot.v, destination: snapshot.destination, job: snapshot.job, admission: snapshot.admission, binding: snapshot.binding,
      sources: sourceEntries, base: snapshot.base, commit: snapshot.commit, tree: snapshot.tree };
    if (canonicalBytes(proof).length > STAGE_SNAPSHOT_BOUNDS.proofBytes) return no();
    const binding = readEvidenceBinding(snapshot.binding), jobEntry = snapshot.job.entry, admitted = snapshot.admission.entry;
    const lane = binding?.stage === "work" ? "issue" : "change";
    if (!binding || !definitions || !isDigest(definitions[lane]) || read.pinned !== definitions[lane] || read.activated?.state !== "active" || read.activated.name !== lane
      || jobEntry.effects.filter(effect => effect.effect === "open").length !== 1 || !jobEntry.effects.some(effect => effect.effect === "open" && effect.item === jobEntry.seq && effect.type === "job")) return no();
    if (binding.source === "room" && (!binding.roomService || binding.roomService.key !== signer || !same(binding.roomService.checker, binding.checker))) return no();
    const input = admitted.input;
    if (input.type !== "outcome" || input.owner !== "platform:destination@17" || input.kind !== "evidence-admit" || input.attempt !== 1 || input.result !== "confirmed"
      || input.evidence.basis !== "own-answer" || !isRecord(input.evidence.body) || Object.keys(input.evidence.body).join() !== "job" || !same(input.evidence.body["job"], notice.job)
      || !admitted.effects.some(effect => effect.effect === "attempt" && effect.selected === true)) return no();
    if (admitted.effects.filter(effect => effect.effect === "open").length !== 1 || !admitted.effects.some(effect => effect.effect === "open" && effect.item === admitted.seq && effect.type === "evidence-job")) return no();
    const records = admitted.effects.filter(effect => effect.effect === "value" && effect.item === admitted.seq && effect.slot === "record");
    const effect = records.length === 1 ? records[0] : null;
    const record = effect?.effect === "value" ? admissionRecord(effect.value) : null;
    if (!record || !effect || effect.effect !== "value" || record["v"] !== 1 || record["state"] !== "admitted" || record["admittedAt"] !== admitted.seq || !same(record["binding"], binding)
      || record["bindingDigest"] !== evidenceBindingDigest(binding) || !same(record["job"], notice.job) || record["commit"] !== snapshot.commit || record["tree"] !== snapshot.tree || record["base"] !== snapshot.base
      || !Array.isArray(record["sourceFacts"]) || record["sourceFacts"].length > 32 || !record["sourceFacts"].every(isFactRef)) return no();
    const sources = new Map(sourceEntries.map(source => [canonicalize(factOf(source)), source]));
    if (sources.size !== sourceEntries.length || record["sourceFacts"].length !== sources.size || record["sourceFacts"].some(fact => !sources.has(canonicalize(fact)))) return no();
    const genesis = sourceEntries.find(source => source.entry.at.kind === "destination" && same(source.entry.at, snapshot.destination) && source.entry.input.type === "genesis");
    if (!genesis || genesis.entry.input.type !== "genesis" || genesis.entry.input.seed.definition !== "platform:destination@17") return no();
    const pendingRows = sourceEntries.filter(source => same(source.entry.at, snapshot.destination) && sent(snapshot.job, source)
      && source.entry.effects.some(effect => effect.effect === "open" && effect.item === source.entry.seq && effect.type === (binding.stage === "work" ? "evidence-request" : "evidence-slot")));
    const pending = pendingRows.length === 1 ? pendingRows[0] : null;
    if (!pending || pending.entry.input.type !== "delivery" || pending.entry.input.message.class !== "request" || !("decision" in pending.entry.input) || pending.entry.input.decision !== "applied" || !sent(snapshot.job, pending)
      || !isRecord(pending.entry.input.message.body) || !["check-fence", "work-check-fence"].includes(pending.entry.input.message.body["message"] as string)) return no();
    const jobInput = jobEntry.input;
    if (jobInput.type === "act") {
      const expected = binding.stage === "work" ? "request-work-check" : "request-check";
      if (!verifySignedIntent(jobInput.signed) || jobInput.signed.intent.kind !== expected || !same(jobInput.signed.intent.to, notice.lane)) return no();
    } else {
      if (jobInput.type !== "delivery" || jobInput.message.class !== "request" || !("decision" in jobInput) || jobInput.decision !== "applied" || !isRecord(jobInput.message.body)
        || !["admit-published-check", "admit-audit-check"].includes(jobInput.message.body["message"] as string)) return no();
      const sender = sources.get(canonicalize(jobInput.from));
      if (!sender || !same(sender.entry.at, snapshot.destination) || !sent(sender, snapshot.job)) return no();
    }
    const texts = value(jobEntry.effects, jobEntry.seq, "binding");
    if (typeof texts !== "string" || utf8(texts).length > 16_384 || !same(readEvidenceBinding(parseStrict(texts)), binding)
      || value(jobEntry.effects, jobEntry.seq, "bindingDigest") !== record["bindingDigest"]) return no();
    const name = value(jobEntry.effects, jobEntry.seq, "name"), tree = value(jobEntry.effects, jobEntry.seq, "tree"), configuration = value(jobEntry.effects, jobEntry.seq, "configuration"), deadline = value(jobEntry.effects, jobEntry.seq, "deadline");
    if (typeof name !== "string" || name !== notice.name || name !== record["name"] || snapshot.tree !== notice.tree || !isDigest(configuration) || configuration !== record["configuration"] || timeMs(deadline) === null
      || !isObjectId(snapshot.commit) || !isObjectId(snapshot.tree) || !isObjectId(snapshot.base)
      || value(jobEntry.effects, jobEntry.seq, "commit") !== snapshot.commit
      || (binding.stage === "work" ? tree !== undefined && tree !== snapshot.tree : tree !== snapshot.tree)
      || (binding.stage === "work" ? value(jobEntry.effects, jobEntry.seq, "base") !== undefined && value(jobEntry.effects, jobEntry.seq, "base") !== snapshot.base : value(jobEntry.effects, jobEntry.seq, "base") !== snapshot.base)) return no();
    const checkers = jobEntry.effects.filter(effect => effect.effect === "party" && effect.item === jobEntry.seq && effect.slot === "checker");
    const checker = checkers.length === 1 ? checkers[0] : null;
    if (!checker || checker.effect !== "party" || !same(checker.member, binding.checker)) return no();
    const required = binding.subject.kind === "work" ? [binding.subject.source] : binding.subject.kind === "landing" ? [binding.subject.publication, binding.subject.manifest]
      : [binding.subject.publication, binding.subject.receipt, binding.subject.written, binding.subject.manifest];
    if (required.some(fact => !sources.has(canonicalize(fact)))) return no();
    if (binding.subject.kind === "work") {
      const source = sources.get(canonicalize(binding.subject.source))!;
      if (!same(source.entry.at, notice.lane) || source.entry.input.type !== "act" || source.entry.input.signed.intent.kind !== "stage-work" || !verifySignedIntent(source.entry.input.signed)
        || !same(source.entry.input.signed.intent.to, source.entry.at) || value(source.entry.effects, source.entry.seq, "commit") !== snapshot.commit) return no();
    } else {
      if (!same(binding.subject.publication.at, snapshot.destination) || !same(binding.subject.manifest.at, notice.lane)) return no();
      if (binding.subject.kind === "published") {
        const written = sources.get(canonicalize(binding.subject.written))!;
        if (!same(binding.subject.receipt.at, snapshot.destination) || !same(binding.subject.written.at, snapshot.destination)
          || written.entry.input.type !== "outcome" || written.entry.input.owner !== "platform:destination@17" || !["receipt", "read"].includes(written.entry.input.kind)
          || written.entry.input.result !== "confirmed") return no();
      }
    }
    const overlay = readOwnedCheckoutSnapshot({ commit: snapshot.commit, tree: snapshot.tree, base: snapshot.base, objects: snapshot.objects });
    if (!overlay) return no();
    const laneRef = { ...snapshot.job.entry.at }, jobFact = { at: { ...laneRef }, seq: snapshot.job.entry.seq, hash: snapshot.job.hash };
    const job: Job = { lane: laneRef, fact: jobFact, name, tree: snapshot.tree, configuration, deadline: deadline as string, commit: snapshot.commit, base: snapshot.base, evidence: binding, overlay };
    return { job };
  } catch { return no(); }
}

/** A signed read remains the existing job-read wire, with the real external signer. */
export type StageSnapshotRead = (lane: Job["lane"], signed: SignedIntent) => Promise<StageSnapshotReply>;
