/** Real pinned Register/Directory/Destination judgments in memory. The host's
 * proof transport, lane creation and provider remain explicit test stand-ins. */
import { PROPOSED_BOUNDS, type Digest, type Entry, type OperationId, type PlatformDefinition, type Seed, type Timestamp } from "@generalbusiness/dap-contract";
import { intentDigest, newIncarnation, scopeIdOf, signIntent, timeMs, timeOf } from "@generalbusiness/dap-bytes";
import { clockOf, judgeGenesis, judgeOutcome, PROFILES, validateDefinition, type Judgment, type PlatformRules } from "@generalbusiness/dap-derive";
import { Ledger, keys } from "@generalbusiness/dap-derive/testing";
import { platform, repositoryName } from "@generalbusiness/dap-platform";

export function workspaceAncestors(time: Timestamp, namespace: string, nonce = "workspace ancestors") {
  const native = (named: PlatformDefinition) => {
    const supplied = platform(named);
    if (!supplied) throw Error("Pinned workspace ancestor required");
    const checked = validateDefinition(JSON.parse(JSON.stringify(supplied.data)), PROPOSED_BOUNDS, PROFILES, { platform: true });
    if (!checked.ok) throw Error("Valid workspace ancestor required");
    const ledger = new Ledger(checked.definition, supplied.data.name);
    ledger.now = time;
    return { ledger, rules: { named, rules: supplied.rules } satisfies PlatformRules };
  };
  const write = (ledger: Ledger, judgment: Judgment): Entry => {
    if (judgment.result !== "write") throw Error("Workspace ancestor judgment must write");
    return ledger.seal(judgment.draft);
  };
  const { ledger: R, rules: registerRules } = native("platform:register@17");
  const install = signIntent({ v: 1, to: null, actor: keys.paul.key, kind: "install", on: null, expected: {},
    fields: { host: "artifacts", namespace, policy: "keys", founders: [keys.rita.key] }, idempotencyKey: nonce,
    notAfter: timeOf(timeMs(time)! + 600_000) }, keys.paul.secret);
  const root: Seed = { v: 1, kind: "register", definition: "platform:register@17", creator: null, cause: intentDigest(install.intent), ordinal: 0 };
  write(R, judgeGenesis(R.state, R.definition, { name: scopeIdOf(root), inc: newIncarnation(new Uint8Array(16).fill(1)), seed: root, creation: install },
    { clock: clockOf(R.state, time), bounds: R.bounds, facts: [], prepared: [], source: null, platform: registerRules }));
  const found = R.intent(keys.rita, "found", { expected: { register: R.item(0).revision },
    fields: { founderHandle: "@rita", branch: "main", recoveryKey: keys.sam.key }, idempotencyKey: nonce });
  if (R.submit(found, { platform: registerRules, grants: [] }).result !== "write") throw Error("Workspace founding must write");
  const claim = R.last, claimFact = R.fact(claim.seq);
  const operation = claim.effects.find(effect => effect.effect === "operation" && effect.owner === registerRules.named && effect.kind === "create-repository");
  if (operation?.effect !== "operation") throw Error("Workspace repository operation required");
  const id = `${claim.seq}:${operation.k}` as OperationId;
  const seed = R.item(claim.seq).values["seed"];
  if (typeof seed !== "string") throw Error("Workspace directory seed required");
  const name = (attempt: number) => repositoryName(seed as Digest, attempt);
  const outcome = (attempt: number, result: "confirmed" | "unknown") => write(R, judgeOutcome(R.state, R.definition,
    { type: "outcome", operation: id, attempt, result, evidence: result === "unknown" ? { basis: "none", body: { name: name(attempt) } }
      : { basis: "own-answer", body: { name: name(attempt), id: name(attempt) } } },
    { clock: clockOf(R.state, time), bounds: R.bounds, own: R.own, platform: registerRules }));
  outcome(1, "unknown");
  const selected = outcome(2, "confirmed"), selectedFact = R.fact(selected.seq);
  const directorySend = selected.sends.find(send => "kind" in send.to && send.to.kind === "directory");
  if (!directorySend || !("definition" in directorySend.to) || directorySend.message.class !== "request") throw Error("Actual Directory create required");
  const { ledger: D, rules: directoryRules } = native("platform:directory@16");
  const facts = [{ fact: claimFact, entry: claim, under: R.under }];
  D.remember(facts);
  write(D, judgeGenesis(D.state, D.definition, { name: scopeIdOf(directorySend.to), inc: newIncarnation(new Uint8Array(16).fill(2)),
    to: directorySend.to, from: selectedFact, n: directorySend.n, message: directorySend.message },
    { clock: clockOf(D.state, time), bounds: D.bounds, facts, prepared: [], own: D.own, source: { entry: selected, under: R.under }, platform: directoryRules }));
  const directory = D.last;
  const destinationSend = directory.sends.find(send => "kind" in send.to && send.to.kind === "destination");
  if (!destinationSend || !("definition" in destinationSend.to) || destinationSend.message.class !== "request") throw Error("Actual Destination create required");
  const { ledger: T, rules: destinationRules } = native("platform:destination@12");
  T.remember(facts);
  write(T, judgeGenesis(T.state, T.definition, { name: scopeIdOf(destinationSend.to), inc: newIncarnation(new Uint8Array(16).fill(3)),
    to: destinationSend.to, from: D.fact(0), n: destinationSend.n, message: destinationSend.message },
    { clock: clockOf(T.state, time), bounds: T.bounds, facts, prepared: [], own: T.own, source: { entry: directory, under: D.under }, platform: destinationRules }));
  const unselected = outcome(1, "confirmed");
  const repository = { host: "artifacts", namespace, name: name(2), id: name(2) };
  return { register: R.at, directory: D.at, destination: T.at, repository, claim, claimFact, selected, unselected,
    entries: [...R.entries.map(row => row.entry), ...D.entries.map(row => row.entry), ...T.entries.map(row => row.entry)] };
}
