/** Native creation proofs bind a lane to its actual Destination repository. */
import type { Entry, FactRef, ScopeId, ScopeRef } from "@generalbusiness/dap-contract";
import { LATE, entryHash, isFactRef, isOperationId, isRecord, isScopeRef, isSeed, same, scopeIdOf, within } from "@generalbusiness/dap-bytes";
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
const factOf = (entry: Entry): FactRef => ({ at: entry.at, seq: entry.seq, hash: entryHash(entry) });

/** Each invocation makes at most six bounded immutable reads. The selected
 * repository outcome and its opening found act are distinct facts. No caller
 * repository, current summary, legacy source fallback, or host request enters. */
export async function workspaceRepository(given: OutsideGiven, sources: WorkspaceSources, register: ScopeId, host: string, namespace: string): Promise<WorkspaceRepository | null> {
  const deadline = performance.now() + MILLISECONDS;
  let calls = 0;
  const read = async <T>(work: (remaining: number) => Promise<T>): Promise<T | null> => {
    const remaining = Math.floor(deadline - performance.now());
    if (!Number.isSafeInteger(remaining) || remaining <= 0 || ++calls > 6) return null;
    try { const value = await within(remaining / 1000, () => work(remaining)); return value === LATE ? null : value; }
    catch (failure) { report(toConsole, "outside-call-failed", "workspace-lineage-read", failure); return null; }
  };
  const birth = async (name: ScopeId, kind: "directory" | "destination" | "register") => {
    const raw = await read(ms => sources.births.read(name, kind, ms, BYTES));
    const at = raw?.proof.fact.at;
    const checked = isScopeRef(at) ? readNativeBirth(raw, at, BYTES) : null;
    const entry = checked ? proofEntry(checked.proof, checked.proof.fact, BYTES) : null;
    return checked?.native && entry?.input.type === "genesis" && entry.input.decision === "applied" && at?.scope === name && at.kind === kind && platform(checked.named) ? { entry, named: checked.named, fact: checked.proof.fact } : null;
  };
  const source = async (fact: FactRef) => {
    const raw = await read(ms => sources.proofs.read(fact, BYTES, ms));
    return raw ? proofEntry(raw, fact, BYTES) : null;
  };
  try {
    const lane = given.own(0), definition = given.definition?.();
    const input = lane?.entry.input;
    if (!lane || lane.hash !== entryHash(lane.entry) || input?.type !== "genesis" || input.decision !== "applied"
      || lane.entry.at.kind !== "lane" || scopeIdOf(input.seed) !== lane.entry.at.scope || input.inc !== lane.entry.at.inc
      || !definition?.declared.capabilities?.some(capability => capability.name === "hold" && capability.version === 2) || definition.digest !== input.seed.definition
      || !isScopeRef(input.seed.creator) || input.seed.creator.kind !== "directory" || !isFactRef(input.source)
      || !same(input.source.at, input.seed.creator) || input.n === null || !input.message) return null;
    const directory = await birth(input.seed.creator.scope, "directory");
    if (!directory || !same(directory.entry.at, input.seed.creator) || !SIBLINGS_OF[directory.named]) return null;
    const creation = await source(input.source);
    if (!creation || !sentBy(creation, { from: input.source, n: input.n, to: input.seed, message: input.message })) return null;
    const dirInput = directory.entry.input;
    if (dirInput.type !== "genesis" || !isFactRef(dirInput.source) || dirInput.source.at.kind !== "register"
      || dirInput.source.at.scope !== register || dirInput.n === null || !dirInput.message) return null;
    const outcomeFact = dirInput.source;
    const created = await source(outcomeFact), installed = await birth(register, "register");
    if (!created || !installed || !same(installed.entry.at, outcomeFact.at)
      || DIRECTORY_OF[installed.named] !== directory.named || created.input.type !== "outcome"
      || created.input.owner !== installed.named || created.input.kind !== "create-repository"
      || created.input.result !== "confirmed" || created.input.evidence.basis !== "own-answer"
      || !isOperationId(created.input.operation)
      || !sentBy(created, { from: outcomeFact, n: dirInput.n, to: dirInput.seed, message: dirInput.message })) return null;
    const outcome = created.input;
    const selected = created.effects.filter(effect => effect.effect === "attempt" && effect.operation === outcome.operation && effect.attempt === outcome.attempt);
    if (selected.length !== 1 || selected[0]?.effect !== "attempt" || selected[0].result !== "confirmed" || selected[0].selected !== true) return null;
    const directoryBody = dirInput.message.body, directoryFields = isRecord(directoryBody) ? directoryBody["fields"] : null;
    const claimFact = isRecord(directoryFields) ? directoryFields["claim"] : null;
    const [opening, ordinal] = outcome.operation.split(":").map(Number);
    if (!isFactRef(claimFact) || !same(claimFact.at, outcomeFact.at) || claimFact.seq !== opening || claimFact.seq >= outcomeFact.seq) return null;
    const claim = await source(claimFact);
    if (!claim || claim.input.type !== "act" || claim.input.signed.intent.kind !== "found" || !same(claim.input.signed.intent.to, installed.entry.at)) return null;
    const opened = claim.effects.filter(effect => effect.effect === "operation" && effect.k === ordinal);
    if (opened.length !== 1 || opened[0]?.effect !== "operation" || opened[0].owner !== installed.named
      || opened[0].kind !== "create-repository" || outcome.attempt < 1 || outcome.attempt > opened[0].attempts) return null;
    const seedEffects = claim.effects.filter(effect => effect.effect === "value" && effect.item === claimFact.seq && effect.slot === "seed");
    const seed = seedEffects[0];
    if (seedEffects.length !== 1 || seed?.effect !== "value" || typeof seed.value !== "string" || directoryIdOf(seed.value as never) !== directory.entry.at.scope) return null;
    const sends = directory.entry.sends.filter(send => isSeed(send.to) && send.to.kind === "destination");
    const send = sends[0];
    if (sends.length !== 1 || !send || !isSeed(send.to)) return null;
    const destination = await birth(scopeIdOf(send.to), "destination"), expected = SIBLINGS_OF[directory.named]!.destination;
    if (!destination || destination.named !== expected || !isOf(destination.named, "platform:destination")) return null;
    const destInput = destination.entry.input;
    if (destInput.type !== "genesis" || !same(destInput.seed, send.to) || !same(destInput.source, directory.fact)
      || destInput.n !== send.n || !same(destInput.message, send.message)
      || !sentBy(directory.entry, { from: factOf(directory.entry), n: send.n, to: send.to, message: send.message })) return null;
    const body = destInput.message?.body;
    const fields = isRecord(body) ? body["fields"] : null;
    const repository = isRecord(fields) ? fields["repository"] : null;
    if (!isRecord(repository) || Object.keys(repository).sort().join() !== "host,id,name,namespace"
      || repository["host"] !== host || repository["namespace"] !== namespace || typeof repository["name"] !== "string"
      || !/^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/.test(repository["name"]) || repository["id"] !== repository["name"]
      || !isRecord(fields) || !same(fields["directory"], directory.entry.at) || !same(fields["claim"], claimFact)
      || typeof fields["branch"] !== "string") return null;
    return { destination: destination.entry.at, repository: repository as unknown as DestinationRepository, branch: fields["branch"] };
  } catch (failure) { report(toConsole, "outside-call-failed", "workspace-lineage", failure); return null; }
}
