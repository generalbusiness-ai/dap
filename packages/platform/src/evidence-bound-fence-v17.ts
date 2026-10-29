/** Reconstruct one actually accepted, holder-bound fence. No current DTO,
 * synthetic item or later result substitutes for its sealed source. */
import type { ActType, Bounds, Entry, FactRef } from "@generalbusiness/dap-contract";
import { entryHash, isEntry, isFactRef, isOperationId, isRecord, same } from "@generalbusiness/dap-bytes";
import { isEntryOf, messageFields, sentBy, useOf, type Item, type Operation, type Own, type StateView } from "@generalbusiness/dap-derive";
import { claimEvidenceBatchJobV17, readEvidenceBatchV17, readEvidenceBatchWireV17, type EvidenceBatchRecordV17 } from "./evidence-batch-v17.ts";
import { evidenceFundedBatchV17 } from "./destination-evidence-funding-v17.ts";
import { evidenceOperationOpeningV17 } from "./evidence-opening-v17.ts";

export interface EvidenceBoundFenceV17 {
  entry: Entry; source: FactRef; holder: Item; batch: EvidenceBatchRecordV17;
  fields: Readonly<Record<string, unknown>>; job: Entry; birth: FactRef; batchFact: FactRef;
}
// Only these declared fact fields expand SelfMark. An arbitrary object's
// property named self never becomes a fact (contract section 6.4).
const jobType = { type: "fact" as const, kind: ["request-check", "admit-published-check", "admit-audit-check"], under: "change", required: true };
const factFields: ActType["fields"] = { job: jobType,
  operation: { type: "fact", kind: ["merge"], under: "change", required: true },
  manifest: { type: "fact", kind: ["propose-manifest", "propose-file"], under: "change", required: true },
  earlier: { ...jobType, required: false }, forJob: { ...jobType, required: false } };
const immutable = (batch: EvidenceBatchRecordV17) => ({ publication: batch.publication, operation: batch.operation,
  capture: batch.capture, ordinal: batch.ordinal, total: batch.total, touched: batch.touched, checks: batch.checks, policy: batch.policy });

export function readEvidenceBoundFenceV17(state: StateView, own: Own, operation: Operation, bounds: Bounds): EvidenceBoundFenceV17 | null {
  try {
    const scope = state.scope(), genesis = own(0), actual = state.operation(operation.id);
    if (!scope || scope.at.kind !== "destination" || !genesis || !isEntry(genesis.entry) || genesis.entry.seq !== 0
      || !same(genesis.entry.at, scope.at) || entryHash(genesis.entry) !== genesis.hash || scope.genesis.hash !== genesis.hash
      || genesis.entry.input.type !== "genesis" || genesis.entry.input.seed.definition !== "platform:destination@17"
      || !actual || !same(actual, operation) || !isOperationId(operation.id) || operation.owner !== "platform:destination@17"
      || operation.kind !== "evidence-admit" || operation.most !== 1 || operation.for === undefined) return null;
    const position = Number(operation.id.split(":")[0]), sealed = own(position), entry = sealed?.entry;
    if (!sealed || !entry || !isEntry(entry) || entry.seq !== position || !same(entry.at, scope.at) || entryHash(entry) !== sealed.hash
      || entry.seq <= 0 || entry.seq > scope.head.seq || !evidenceOperationOpeningV17(entry, operation)
      || entry.input.type !== "delivery" || !("decision" in entry.input) || entry.input.decision !== "applied" || entry.input.message.class !== "request"
      || entry.input.message.type !== "tell" || !isRecord(entry.input.message.body) || entry.input.message.body["message"] !== "check-fence"
      || !isRecord(entry.input.message.body["fields"]) || entry.effects.some(effect => effect.effect === "open")) return null;
    const input = entry.input, holder = state.item(operation.for);
    if (input.message.class !== "request" || input.message.type !== "tell") return null;
    const body = input.message.body;
    if (!isRecord(body)) return null;
    const batch = holder && evidenceFundedBatchV17(state, own, holder, bounds), batchBirth = holder && own(holder.id);
    if (!holder || !batch || !batchBirth || entryHash(batchBirth.entry) !== batchBirth.hash || holder.opened !== batchBirth.hash
      || !same(batchBirth.entry.at, scope.at) || batchBirth.entry.seq !== holder.id || holder.id >= entry.seq) return null;
    const fields = messageFields(body["fields"], input.from, factFields);
    if (!fields || !isFactRef(fields["job"]) || !same(fields["job"], input.from) || !same(input.from.at, batch.operation.at)
      || !same(holder.refs["lane"], input.from.at) || !same(fields["operation"], batch.operation) || typeof fields["name"] !== "string") return null;
    const writes = entry.effects.filter(effect => effect.effect === "value" && effect.slot === "batch");
    if (writes.length !== 1 || writes[0]!.effect !== "value" || writes[0]!.item !== holder.id) return null;
    const claimed = readEvidenceBatchWireV17(writes[0]!.value), jobFact = fields["job"], name = fields["name"];
    if (!claimed || !same(immutable(claimed), immutable(batch)) || !claimed.jobs.length
      || !same(claimed.jobs.at(-1), { job: jobFact, name })
      || claimed.jobs.length > batch.jobs.length || !same(claimed.jobs, batch.jobs.slice(0, claimed.jobs.length))) return null;
    const before = readEvidenceBatchV17({ ...claimed, jobs: claimed.jobs.slice(0, -1) });
    if (!before || before.jobs.some(row => same(row.job.at, jobFact.at) && row.job.seq === jobFact.seq)) return null;
    const appended = claimEvidenceBatchJobV17(before, jobFact, name);
    if (!appended.ok || !same(appended.record, claimed)) return null;
    const openings = entry.effects.filter(effect => effect.effect === "operation" && effect.owner === operation.owner && effect.kind === operation.kind);
    if (openings.length !== 1) return null;
    const uses = entry.uses.filter(use => same(use.fact, jobFact));
    if (uses.length !== 1 || !own.retained) return null;
    const job = own.retained(uses[0]!);
    if (!job || !isEntry(job) || !isEntryOf(job, jobFact) || !same(useOf(jobFact, job), uses[0])
      || !sentBy(job, { to: scope.at, from: input.from, n: input.n, message: input.message })) return null;
    return { entry, source: { at: entry.at, seq: entry.seq, hash: sealed.hash }, holder, batch, fields, job,
      birth: { at: scope.at, seq: 0, hash: genesis.hash }, batchFact: { at: scope.at, seq: holder.id, hash: batchBirth.hash } };
  } catch { return null; }
}
