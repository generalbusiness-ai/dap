/** Signed stage read. Native admission owns authority; this port only supplies immutable execution bytes. */
import type { FactRef, KeyId, ScopeRef, SignedIntent, Timestamp } from "@generalbusiness/dap-contract";
import { canonicalBytes, canonicalize, entryHash, isFactRef, isRecord, isScopeRef, timeMs, verifySignedIntent } from "@generalbusiness/dap-bytes";
import { isEntryOf } from "@generalbusiness/dap-derive";
import { destinationBranch, destinationEvidenceAdmissionCurrent, destinationEvidenceJob, readRulesPolicyReplyV17, type StageSnapshotReply } from "@generalbusiness/dap-platform";
import { readOwnedCheckoutSnapshot, STAGE_SNAPSHOT_BOUNDS, verifyOwnedCheckoutSnapshot } from "@generalbusiness/dap-git";
import type { DestinationHostOptions, DestinationRepository } from "./destination-host.ts";
import type { OutsideGiven } from "./given.ts";
import type { Sealed } from "./store.ts";

const same = (a: unknown, b: unknown): boolean => canonicalize(a) === canonicalize(b);
const boundFact = (sealed: Sealed): FactRef => ({ at: sealed.entry.at, seq: sealed.entry.seq, hash: sealed.hash });

function eligible(value: unknown, key: KeyId, admitted: NonNullable<ReturnType<typeof destinationEvidenceJob>>, at: number | null): boolean {
  if (!isRecord(value) || value["key"] !== key || value["keyState"] !== "active" || value["memberState"] !== "active" || value["role"] !== "checker" || value["controllerActive"] === false
    || value["member"] !== admitted.binding.checker.member || !isScopeRef(value["of"]) || !same(value["of"], admitted.binding.checker.membership)
    || !isRecord(value["within"]) || !same(value["within"]["membership"], admitted.binding.checker.membership)
    || !Array.isArray(value["actions"]) || !value["actions"].includes("change.check") || at === null) return false;
  if (value["notAfter"] !== null) { const until = timeMs(value["notAfter"]); if (until === null || until <= at) return false; }
  return admitted.binding.source !== "room" || admitted.binding.roomService?.key === key && same(admitted.binding.roomService.checker, admitted.binding.checker);
}

/** The current authenticated projection is an independent read, not a Native state update. */
function currentRoomRules(value: unknown, admitted: NonNullable<ReturnType<typeof destinationEvidenceJob>>, name: unknown, configuration: unknown, destination: ScopeRef, time: Timestamp): boolean {
  const binding = admitted.binding;
  if (binding.source !== "room") return true;
  const read = readRulesPolicyReplyV17(value, binding.policyGeneration.rules, destination, time);
  if (!read.ok || read.view.revision < binding.policyGeneration.seq || !same(read.view.serviceGeneration, binding.serviceGeneration)
    || !same(read.view.policy.roomService, binding.roomService)) return false;
  const checks = read.view.policy.checks.filter(check => check.name === name);
  const check = checks.length === 1 ? checks[0] : null;
  return !!check && check.configuration === configuration && same(check.checker, binding.checker)
    && (check.source ?? "member") === binding.source && (check.stage ?? "landing") === binding.stage;
}

export async function readStageSnapshot(given: OutsideGiven, options: DestinationHostOptions, asked: SignedIntent): Promise<StageSnapshotReply> {
  try {
    const reader = options.snapshotReader, scope = given.scope(), intent = asked?.intent;
    if (!reader?.source || scope?.at.kind !== "destination" || given.genesis()?.seed.definition !== "platform:destination@17" || !verifySignedIntent(asked)
      || intent.kind !== "git-read@1:job-read" || intent.on !== null || Object.keys(intent.expected).length !== 0 || Object.keys(intent.fields).join() !== "job" || !isFactRef(intent.fields["job"])
      || !same(intent.to, intent.fields["job"].at)) return null;
    const jobFact = intent.fields["job"], now = timeMs(given.clock.read()), retained = timeMs(scope.time), until = timeMs(intent.notAfter);
    if (now === null || retained === null || now < retained || until === null || until <= now || until - now > 900_000) return null;
    const job = await reader.job(jobFact), admitted = destinationEvidenceJob(given.state, given.own, jobFact);
    if (!job || !["issue", "change"].includes(job.under) || !["requested", "timed-out"].includes(job.state) || !isEntryOf(job.entry, jobFact) || !admitted
      || !destinationEvidenceAdmissionCurrent(given.state, given.own, admitted, intent.actor)) return { refused: "wrong-source" };
    const admittedIdentity = canonicalize(admitted);
    const admission = given.own(admitted.admission.seq);
    if (!admission || !same(boundFact(admission), admitted.admission) || !same(admitted.admission.at, scope.at) || admitted.sourceFacts.length > 32) return null;
    const deadline = job.entry.effects.find(effect => effect.effect === "value" && effect.item === jobFact.seq && effect.slot === "deadline");
    const ends = deadline?.effect === "value" ? timeMs(deadline.value) : null;
    if (ends === null) return null;
    const jobValue = (slot: string) => {
      const effect = job.entry.effects.find(effect => effect.effect === "value" && effect.item === jobFact.seq && effect.slot === slot);
      return effect?.effect === "value" ? effect.value : null;
    };
    const name = jobValue("name"), configuration = jobValue("configuration");
    const membership = admitted.binding.checker.membership.scope;
    const roomRulesCurrent = async (): Promise<boolean> => {
      if (admitted.binding.source !== "room") return true;
      try { return !!reader.rules && currentRoomRules(await reader.rules(admitted.binding.policyGeneration.rules), admitted, name, configuration, scope.at, given.clock.read()); }
      catch { return false; }
    };
    const sources: Sealed[] = [], ids = new Set<string>();
    for (const fact of admitted.sourceFacts) {
      if (!isFactRef(fact) || ids.has(canonicalize(fact))) return null;
      const sealed = same(fact.at, scope.at) ? given.own(fact.seq) : await reader.source(fact);
      if (!sealed || !isEntryOf(sealed.entry, fact) || sealed.hash !== fact.hash) return null;
      ids.add(canonicalize(fact)); sources.push(sealed);
      // Reserve the complete proof before fetching or copying object bodies.
      if (canonicalBytes({ v: 1, destination: scope.at, job: { entry: job.entry, hash: jobFact.hash }, admission, binding: admitted.binding, sources,
        base: admitted.base, commit: admitted.commit, tree: admitted.tree }).length > STAGE_SNAPSHOT_BOUNDS.proofBytes) return null;
    }
    const branch = destinationBranch(given.state), repository = branch?.values["repository"];
    if (!isRecord(repository) || Object.keys(repository).sort().join() !== "host,id,name,namespace" || repository["host"] !== options.host || repository["namespace"] !== options.namespace) return null;
    const workSource = admitted.binding.subject.kind === "work" ? admitted.binding.subject.source : null;
    let began = timeMs(given.clock.read());
    if (!await roomRulesCurrent()) return { refused: "wrong-source" };
    const key = await reader.key(membership, intent.actor);
    if (workSource && (!reader.sourceState || await reader.sourceState(workSource) !== "staged")) return { refused: "stage-origin-mismatch" };
    const observed = timeMs(given.clock.read()), beforeProvider = destinationEvidenceJob(given.state, given.own, jobFact);
    if (began === null || observed === null || observed < began || observed - began > 10_000 || observed >= until
      || !eligible(key, intent.actor, admitted, observed) || !beforeProvider || canonicalize(beforeProvider) !== admittedIdentity
      || !destinationEvidenceAdmissionCurrent(given.state, given.own, beforeProvider, intent.actor)) return { refused: "wrong-source" };
    // Published jobs read this recorded immutable commit even after reservation cleanup.
    // Work and landing jobs use the same exact-commit port, never a regenerated ref.
    const objects = await options.provider.objects(repository as unknown as DestinationRepository, admitted.commit);
    if (!Array.isArray(objects) || objects.length > STAGE_SNAPSHOT_BOUNDS.objects) return null;
    let decoded = 0;
    for (const object of objects) {
      if (!(object.body instanceof Uint8Array)) return null;
      decoded += object.body.length;
      if (decoded > STAGE_SNAPSHOT_BOUNDS.objectBytes) return null;
    }
    const overlay = readOwnedCheckoutSnapshot({ commit: admitted.commit, tree: admitted.tree, base: admitted.base,
      objects: objects.map(object => ({ id: object.id, type: object.kind, data: object.body })) });
    if (!overlay || !await verifyOwnedCheckoutSnapshot(overlay)) return null;
    // Re-read source identity and eligibility after every provider/object await.
    for (const source of sources) {
      const fact = boundFact(source), current = same(fact.at, scope.at) ? given.own(fact.seq) : await reader.source(fact);
      if (!current || !isEntryOf(current.entry, fact) || current.hash !== source.hash || !same(current.entry, source.entry)) return null;
    }
    const currentJob = await reader.job(jobFact);
    began = timeMs(given.clock.read());
    if (!await roomRulesCurrent()) return { refused: "wrong-source" };
    const currentKey = await reader.key(membership, intent.actor);
    if (workSource && (!reader.sourceState || await reader.sourceState(workSource) !== "staged")) return { refused: "stage-origin-mismatch" };
    const completed = timeMs(given.clock.read()), floor = timeMs(given.scope()?.time);
    const currentAdmission = destinationEvidenceJob(given.state, given.own, jobFact);
    if (!currentJob || !["requested", "timed-out"].includes(currentJob.state) || !isEntryOf(currentJob.entry, jobFact) || !same(currentJob.entry, job.entry) || currentJob.under !== job.under
      || !currentAdmission || canonicalize(currentAdmission) !== admittedIdentity || !destinationEvidenceAdmissionCurrent(given.state, given.own, currentAdmission, intent.actor)
      || !eligible(currentKey, intent.actor, admitted, completed) || began === null || completed === null || floor === null || completed < floor || completed < began || completed - began > 10_000 || completed >= until) return { refused: "wrong-source" };
    return { v: 1, destination: scope.at, job: { entry: job.entry, hash: entryHash(job.entry) }, admission, binding: admitted.binding, sources, ...overlay };
  } catch { return null; }
}
