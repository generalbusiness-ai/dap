/** Native in-memory graph. All creation, delivery and folding uses the real
 * judges. Only the repository creation answer and member authority are
 * explicit fixtures; no runtime storage, Git provider or replay verifier runs. */
import type { PlatformDefinition, Seed } from "@generalbusiness/dap-contract";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { intentDigest, isSeed, newIncarnation, scopeIdOf } from "@generalbusiness/dap-bytes";
import { clockOf, judgeDelivery, judgeGenesis, judgeOutcome, validateDefinition, type Judgment } from "@generalbusiness/dap-derive";
import { RULE_PROFILES } from "@generalbusiness/dap-derive/rule";
import { Ledger, T0, arriving, creation, keys, sent } from "@generalbusiness/dap-derive/testing";
import { platform, repositoryName, TRUSTED_APPLICATION_COHORT as C } from "../src/index.ts";
import { installing } from "./support-creation.ts";
export class InstallNode extends Ledger {
  readonly authority;
  texts: (digest: string) => number | undefined = () => undefined;
  constructor(readonly named: PlatformDefinition) {
    const supplied = platform(named)!;
    const checked = validateDefinition(supplied.data, PROPOSED_BOUNDS, RULE_PROFILES, { platform: true });
    if (!checked.ok) throw Error(JSON.stringify(checked.problems));
    super(checked.definition, checked.definition.declared.name);
    this.authority = { named, rules: supplied.rules };
  }
  take(judgment: Judgment) {
    if (judgment.result !== "write") throw Error(JSON.stringify(judgment));
    this.seal(judgment.draft);
  }
  override act(...[who, kind, over = {}, context = {}]: Parameters<Ledger["act"]>) {
    return super.act(who, kind, over, { platform: this.authority, ...context });
  }
  outcome(operation: `${number}:${number}`, body: unknown) {
    const judged = judgeOutcome(this.state, this.definition, { type: "outcome", operation, attempt: 1, result: "confirmed", evidence: { basis: "read", body } },
      { clock: clockOf(this.state, T0), bounds: this.bounds, platform: this.authority, own: this.own });
    this.take(judged); return this.head.seq;
  }
}
export function installGraph(cohort: Readonly<{ register: PlatformDefinition }> = C, archive?: "journal") {
  const nodes: InstallNode[] = [], R = new InstallNode(cohort.register); nodes.push(R);
  const allFacts = () => nodes.flatMap(node => node.entries.map(({ entry }, seq) => ({ fact: node.fact(seq), entry, under: node.under })));
  const send = (to: InstallNode, from: InstallNode, seq: number, n = 0, write = true) => {
    const { delivered, source } = sent(from, seq, n);
    const judged = judgeDelivery(to.state, to.definition, delivered, { ...arriving(to, delivered, source, allFacts()), platform: to.authority, texts: from.texts });
    if (write) to.take(judged);
    return judged;
  };
  const child = (from: InstallNode, seq: number, n: number) => {
    const request = from.entries[seq]!.entry.sends.find(send => send.n === n)!;
    if (!isSeed(request.to)) throw Error("Native child seed required");
    const node = new InstallNode(request.to.definition as PlatformDefinition); nodes.push(node);
    const { asked, source } = creation(from, seq, n, 20 + nodes.length);
    node.take(judgeGenesis(node.state, node.definition, asked, { clock: clockOf(node.state, T0), bounds: node.bounds, facts: allFacts(), prepared: [], source, platform: node.authority }));
    send(from, node, 0, 0);
    const confirm = from.last.sends.find(send => send.message.class === "control")!;
    send(node, from, from.head.seq, confirm.n);
    return node;
  };
  const signed = installing(keys.rita, "keys", [keys.rita.key]), seed: Seed = { v: 1, kind: "register", definition: cohort.register, creator: null, cause: intentDigest(signed.intent), ordinal: 0 };
  R.take(judgeGenesis(R.state, R.definition, { name: scopeIdOf(seed), inc: newIncarnation(new Uint8Array(16).fill(7)), seed, creation: signed },
    { clock: clockOf(R.state, T0), bounds: R.bounds, facts: [], prepared: [], source: null, platform: R.authority }));
  const found = R.act(keys.rita, "found", { expected: { register: R.item(0).revision }, fields: { branch: "main", "founderHandle": "@rita", recoveryKey: keys.sam.key, ...(archive === undefined ? {} : { archive }) } }, { grants: [] });
  if (found.result !== "write") throw Error(JSON.stringify(found));
  const claim = R.head.seq;
  const made = judgeOutcome(R.state, R.definition, { type: "outcome", operation: `${claim}:0`, attempt: 1, result: "confirmed", evidence: { basis: "own-answer", body: { name: repositoryName(R.item(claim).values["seed"] as never, 1), id: "TEST application room" } } },
    { clock: clockOf(R.state, T0), bounds: R.bounds, platform: R.authority, own: R.own });
  R.take(made);
  const D = child(R, R.head.seq, 0), M = child(D, 0, 1), A = child(D, 0, 2), G = child(D, 0, 3);
  return { R, D, M, A, G, send };
}
