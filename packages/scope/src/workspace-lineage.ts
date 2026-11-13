/** Native creation proofs bind a lane to its actual Destination repository. */
import type { FactRef, ScopeId, ScopeKind, ScopeRef } from "@generalbusiness/dap-contract";
import { LATE, isEntryOf, isFactRef, isOperationId, isRecord, isScopeRef, isSeed, resolveGenesisSelf, same, scopeIdOf, within, type CheckedSequence } from "@generalbusiness/dap-bytes";
import { sentBy } from "@generalbusiness/dap-derive";
import { DIRECTORY_OF, SIBLINGS_OF, directoryIdOf, isOf, platform } from "@generalbusiness/dap-platform";
import type { OutsideGiven } from "./given.ts";
import { readNativeBirth, type NativeBirthNameSource } from "./native-birth.ts";
import { proofEntry, PROOF_BYTE_BOUNDS, type ProofSource } from "./proof-bytes.ts";
import type { DestinationRepository } from "./destination-host.ts";
import { report, toConsole } from "./diag.ts";

export interface WorkspaceSources { births: NativeBirthNameSource; proofs: ProofSource }
export interface WorkspaceRepository { destination: ScopeRef; repository: DestinationRepository; branch: string }
const BYTES = PROOF_BYTE_BOUNDS.body;
const MILLISECONDS = 5000;

/** Each invocation makes at most six bounded immutable reads. The selected
 * repository outcome and its opening found act are distinct facts. No caller
 * repository, current summary, legacy source fallback, or host request enters. */
export async function workspaceRepository(given: OutsideGiven, sources: WorkspaceSources, registers: ScopeId | readonly ScopeId[], host: string, namespace: string): Promise<WorkspaceRepository | null> {
  const roots = typeof registers === "string" ? [registers] : registers;
  const deadline = performance.now() + MILLISECONDS;
  let calls = 0;
  const read = async <T>(work: (remaining: number) => Promise<T>): Promise<T | null> => {
    const remaining = Math.floor(deadline - performance.now());
    if (!Number.isSafeInteger(remaining) || remaining <= 0 || ++calls > 6) return null;
    try { const value = await within(remaining / 1000, () => work(remaining)); return value === LATE ? null : value; }
    catch (failure) { report(toConsole, "outside-call-failed", "workspace-lineage-read", failure); return null; }
  };
  const birth = async (name: ScopeId, kind: Extract<ScopeKind, "directory" | "destination" | "register">) => {
    const raw = await read(ms => sources.births.read(name, kind, ms, BYTES));
    const at = raw?.proof.fact.at;
    // This group bounds its reads by one deadline and six calls. It keeps no byte ledger to debit.
    const checked = isScopeRef(at) && at.scope === name ? readNativeBirth(raw, at, BYTES, () => {}) : null;
    // The kind is the one that the admitted genesis bytes state.
    return checked?.birth.native && checked.sequence.kind === kind && checked.entry.input.decision === "applied" && platform(checked.birth.named)
      ? { entry: checked.entry, named: checked.birth.named, fact: checked.birth.proof.fact, sequence: checked.sequence } : null;
  };
  const source = async (fact: FactRef, sequence: CheckedSequence) => {
    const raw = await read(ms => sources.proofs.read(fact, BYTES, ms));
    return raw ? proofEntry(raw, fact, BYTES, sequence) : null;
  };
  try {
    const lane = given.own(0), definition = given.definition?.(), local = given.localSequence();
    const input = lane?.entry.input;
    // The lane's own genesis under its own checked sequence; the creator's kind is the genesis's recorded source kind.
    if (!lane || !local || local.kind !== "lane" || !isEntryOf(lane.entry, { at: local.at, seq: 0, hash: lane.hash }, local)
      || input?.type !== "genesis" || input.decision !== "applied" || scopeIdOf(input.seed) !== local.at.scope
      || !definition?.declared.capabilities?.some(capability => capability.name === "hold" && capability.version === 2) || definition.digest !== input.seed.definition
      || !isScopeRef(input.seed.creator) || input.sourceKind !== "directory" || !isFactRef(input.source)
      || !same(input.source.at, input.seed.creator) || input.n === null || !input.message) return null;
    const directory = await birth(input.seed.creator.scope, "directory");
    if (!directory || !same(directory.fact.at, input.seed.creator) || !SIBLINGS_OF[directory.named]) return null;
    const creation = await source(input.source, directory.sequence);
    if (!creation || !sentBy(creation, { from: input.source, n: input.n, to: input.seed, message: input.message }, directory.sequence)) return null;
    const dirInput = directory.entry.input;
    if (dirInput.type !== "genesis" || !isFactRef(dirInput.source) || dirInput.sourceKind !== "register"
      || !roots.includes(dirInput.source.at.scope) || dirInput.n === null || !dirInput.message) return null;
    const outcomeFact = dirInput.source, register = outcomeFact.at.scope;
    // The Register birth comes first: its checked sequence admits the outcome. The count of reads is unchanged.
    const installed = await birth(register, "register");
    if (!installed || !same(installed.fact.at, outcomeFact.at)) return null;
    const created = await source(outcomeFact, installed.sequence);
    if (!created
      || DIRECTORY_OF[installed.named] !== directory.named || created.input.type !== "outcome"
      || created.input.owner !== installed.named || created.input.kind !== "create-repository"
      || created.input.result !== "confirmed" || created.input.evidence.basis !== "own-answer"
      || !isOperationId(created.input.operation)
      || !sentBy(created, { from: outcomeFact, n: dirInput.n, to: dirInput.seed, message: dirInput.message }, installed.sequence)) return null;
    const outcome = created.input;
    const selected = created.effects.filter(effect => effect.effect === "attempt" && effect.operation === outcome.operation && effect.attempt === outcome.attempt);
    if (selected.length !== 1 || selected[0]?.effect !== "attempt" || selected[0].result !== "confirmed" || selected[0].selected !== true) return null;
    const directoryBody = dirInput.message.body, directoryFields = isRecord(directoryBody) ? directoryBody["fields"] : null;
    const claimFact = isRecord(directoryFields) ? directoryFields["claim"] : null;
    const [opening, ordinal] = outcome.operation.split(":").map(Number);
    if (!isFactRef(claimFact) || !same(claimFact.at, outcomeFact.at) || claimFact.seq !== opening || claimFact.seq >= outcomeFact.seq) return null;
    const claim = await source(claimFact, installed.sequence);
    if (!claim || claim.input.type !== "act" || claim.input.signed.intent.kind !== "found" || !same(claim.input.signed.intent.to, installed.fact.at)) return null;
    const opened = claim.effects.filter(effect => effect.effect === "operation" && effect.k === ordinal);
    if (opened.length !== 1 || opened[0]?.effect !== "operation" || opened[0].owner !== installed.named
      || opened[0].kind !== "create-repository" || outcome.attempt < 1 || outcome.attempt > opened[0].attempts) return null;
    const seedEffects = claim.effects.filter(effect => effect.effect === "value" && effect.item === claimFact.seq && effect.slot === "seed");
    const seed = seedEffects[0];
    if (seedEffects.length !== 1 || seed?.effect !== "value" || typeof seed.value !== "string" || directoryIdOf(seed.value as never) !== directory.fact.at.scope) return null;
    const sends = directory.entry.sends.filter(send => isSeed(send.to) && send.to.kind === "destination");
    const send = sends[0];
    if (sends.length !== 1 || !send || !isSeed(send.to)) return null;
    const destination = await birth(scopeIdOf(send.to), "destination"), expected = SIBLINGS_OF[directory.named]!.destination;
    if (!destination || destination.named !== expected || !isOf(destination.named, "platform:destination")) return null;
    const destInput = destination.entry.input;
    if (destInput.type !== "genesis" || !same(destInput.seed, send.to) || !same(destInput.source, directory.fact)
      || destInput.n !== send.n || !same(destInput.message, send.message)
      || !sentBy(directory.entry, { from: directory.fact, n: send.n, to: send.to, message: send.message }, directory.sequence)) return null;
    const body = destInput.message?.body;
    const fields = isRecord(body) ? body["fields"] : null;
    const repository = isRecord(fields) ? fields["repository"] : null;
    if (!isRecord(repository) || Object.keys(repository).sort().join() !== "host,id,name,namespace"
      || repository["host"] !== host || repository["namespace"] !== namespace || typeof repository["name"] !== "string"
      || !/^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/.test(repository["name"]) || repository["id"] !== repository["name"]
      || !isRecord(fields) || !same(resolveGenesisSelf(fields["directory"], directory.fact), directory.fact.at) || !same(fields["claim"], claimFact)
      || typeof fields["branch"] !== "string") return null;
    return { destination: destination.fact.at, repository: repository as unknown as DestinationRepository, branch: fields["branch"] };
  } catch (failure) { report(toConsole, "outside-call-failed", "workspace-lineage", failure); return null; }
}
