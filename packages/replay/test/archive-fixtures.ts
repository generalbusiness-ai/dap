import { archiveObservation, archiveOutcomeValue, replayArchiveEvidenceValue, archiveStagingFactory, archiveObservationPeer } from "../../derive/test/definition-corpus/replay-mutations-data.ts";
/** Judged in-memory fixture histories for A2 cutoffs. No native storage,
 * privacy admission or real-room export. Made-up owner rules and recorded
 * fixture authority are explicit; no caller anchor supplies a dependency. */
import { PROPOSED_BOUNDS, type Digest, type PlatformData, type RetainedInput, type Seed } from "@generalbusiness/dap-contract";
import { canonicalize, intentDigest, newIncarnation, scopeIdOf, signIntent, textDigest } from "@generalbusiness/dap-bytes";
import { RETIRE_ACTION, actionOf, clockOf, contentStates, judgeDelivery, judgeGenesis, settleOutcome, valueDigest, type Judgment, type OutcomeRule } from "@generalbusiness/dap-derive";
import { arriving, created, deskDefinition, deliver, grantOf, keys, Ledger, membership, notesDefinition, sent, T0, t, variant, type Actor } from "@generalbusiness/dap-derive/testing";
import { C, cap, clean, snapshots, staging } from "../../derive/test/fixtures-hold.ts";
import { gateRules, gateWith } from "../../derive/test/fixtures-marks.ts";
import { weigherWith } from "../../derive/test/fixtures-observes.ts";
import { RULES_EXTENTS_VALUE, RULES_SCOPE, platform as nativePlatform, rulesAnswer, rulesObservedValues } from "../../platform/src/index.ts";
import { Rulebook } from "../../platform/test/support-rules.ts";
import type { MemoryScope, Options } from "../src/index.ts";
import { served } from "./world.ts";
import { Lane } from "./staging.ts";

export interface ArchiveFixture {
  readonly name: string;
  readonly scopes: readonly MemoryScope[];
  readonly options: Options;
  readonly required: RetainedInput;
}

const written = (ledger: Ledger, judgment: Judgment): void => {
  if (judgment.result !== "write") throw new Error(`Archive fixture did not write: ${JSON.stringify(judgment)}`);
  ledger.seal(judgment.draft);
};

/** The cutoff is genesis itself: its declared definition is already needed. */
export function declaredGenesisFixture(): ArchiveFixture {
  const ledger = created(notesDefinition, {}, "archive-declared-genesis");
  const scope = served(ledger, [ledger]);
  return { name: "declared-genesis", scopes: [scope],
    options: { mode: "replay", scope: ledger.at.scope, head: ledger.head, grants: "as-recorded" },
    required: scope.retained!.find(input => input.kind === "definition")! };
}

/** The value first appears beside the final outcome. No later act reads it. */
export function outcomeValueFixture(): ArchiveFixture {
  const named = "platform:task@1" as const;
  const domain = replayArchiveEvidenceValue.domain, proof = { seat: 12 };
  const required: RetainedInput = { kind: "value", domain, digest: valueDigest(domain, proof), bytes: canonicalize(proof) };
  const probe: OutcomeRule = {
    selects: false, read: false, retries: () => false,
    valueDomains: [replayArchiveEvidenceValue],
    values: evidence => {
      const digest = (evidence.body as { proof?: Digest } | null)?.proof;
      return digest ? [{ domain, max: 64, digest }] : [];
    },
  };
  const definition = gateWith(archiveOutcomeValue);
  const rules = gateRules({
    "archive-open": { place: "effect", most: 2, run: () => [
      { effect: "operation", k: 0, owner: named, kind: "probe", attempts: 1 },
      { effect: "attempt", operation: { k: 0 }, attempt: 1, result: "opened", selected: null },
    ] },
    probe: { place: "outcome", rules: probe },
  }).rules;
  const platform = { named, rules }, ledger = new Ledger(definition);
  const creation = signIntent({ v: 1, to: null, actor: keys.rita.key, kind: "found", on: null, expected: {}, fields: { opener: keys.rita.member }, idempotencyKey: "archive-outcome-value", notAfter: t(60) }, keys.rita.secret);
  const seed: Seed = { v: 1, kind: "directory", definition: named, creator: null, cause: intentDigest(creation.intent), ordinal: 0 };
  written(ledger, judgeGenesis(ledger.state, definition, { name: scopeIdOf(seed), inc: newIncarnation(new Uint8Array(16).fill(71)), seed, creation }, { clock: clockOf(ledger.state, T0), bounds: PROPOSED_BOUNDS, facts: [], prepared: [], source: null, platform }));
  const issue = ledger.act(keys.rita, "issue", { fields: { hash: textDigest("archive fixture") } }, { platform, membership });
  if (issue.result !== "write") throw new Error(`Archive fixture issue failed: ${JSON.stringify(issue)}`);
  const outcome = settleOutcome(ledger.state, definition, { type: "outcome", operation: "1:0", attempt: 1, result: "confirmed", evidence: { basis: "own-answer", body: { proof: required.digest } } }, { clock: clockOf(ledger.state, T0), bounds: PROPOSED_BOUNDS, own: ledger.own, platform, values: [required.bytes] });
  if (outcome.result === "conflict") throw new Error("Archive fixture outcome conflicted");
  written(ledger, outcome);
  return { name: "outcome-value", scopes: [{ ...served(ledger, [ledger]), retained: [required] }], required,
    options: { mode: "replay", scope: ledger.at.scope, head: ledger.head, grants: "as-recorded", platform: name => name === named ? { data: definition.declared as PlatformData, rules, membership: () => membership } : null } };
}

/** The final check outcome first names its staged-ref snapshot. Creation
 * and confirmation have complete judged parent histories. Authority and
 * host replies remain explicit stand-ins; the ancestry walk is unproved. */
export function outcomeSnapshotFixture(): ArchiveFixture {
  const factory = variant(deskDefinition.declared, archiveStagingFactory(staging.digest));
  const parent = created(factory);
  parent.did(keys.rita, "open-issue", { fields: { title: "archive staging fixture" } });
  class ClosedLane extends Lane {
    override proof(who: Actor) {
      return grantOf(who, this.at, [...Object.values(this.definition.declared.acts).flatMap(act => actionOf(act) ?? []), RETIRE_ACTION]);
    }
  }
  const ledger = new ClosedLane(parent), commit = C("a");
  ledger.prepare(keys.una, "instance", { hold: ledger.hold, task: { ...ledger.at, kind: "task" }, instance: "archive-fixture-instance" });
  const signed = ledger.intent(keys.una, "report", { expected: { commitment: ledger.item(ledger.commitment).revision }, fields: { commitment: ledger.commitment, commit } });
  const stage = ledger.asked(signed, "stage");
  const live = ledger.outcome(ledger.opened(stage.seq, "stage"), "confirmed", {}, "read");
  const record = clean(ledger.at, commit, 1);
  ledger.outcome(ledger.opened(live.seq, "check"), "confirmed", { record }, "own-answer");
  const bytes = snapshots.get(record.snapshot.digest);
  if (bytes === undefined) throw new Error("Archive fixture snapshot was not retained");
  const required: RetainedInput = { kind: "snapshot", digest: record.snapshot.digest, bytes };
  const all = [ledger, parent];
  const scope = served(ledger, all);
  return { name: "outcome-snapshot", scopes: [{ ...scope, retained: [...scope.retained!, required] }, served(parent, all)], required,
    options: { mode: "replay", scope: ledger.at.scope, head: ledger.head, grants: "as-recorded", capabilities: cap, owners: cap } };
}

/** A result delivery first retains a rules observation's value. Sender,
 * rules and creator journals are all judged, not caller anchors. The read
 * itself and fixture authority remain stated trusts. */
export function observingDeliveryFixture(): ArchiveFixture {
  const rulebook = new Rulebook();
  const peerDefinition = variant(notesDefinition.declared, archiveObservationPeer);
  const peer = created(peerDefinition, {}, "archive-observation-peer");
  const definition = weigherWith(archiveObservation(RULES_EXTENTS_VALUE));
  const named = "platform:task@1" as const, rules = {}, platform = { named, rules };
  const ledger = new Ledger(definition);
  const creation = signIntent({ v: 1, to: null, actor: keys.rita.key, kind: "found", on: null, expected: {}, fields: { opener: keys.rita.member }, idempotencyKey: "archive-observing-delivery", notAfter: t(60) }, keys.rita.secret);
  const seed: Seed = { v: 1, kind: "directory", definition: named, creator: null, cause: intentDigest(creation.intent), ordinal: 0 };
  written(ledger, judgeGenesis(ledger.state, definition, { name: scopeIdOf(seed), inc: newIncarnation(new Uint8Array(16).fill(72)), seed, creation }, { clock: clockOf(ledger.state, T0), bounds: PROPOSED_BOUNDS, facts: [], prepared: [], source: null, platform }));
  for (const [kind, fields] of [["point", { peer: peer.at }], ["go", {}]] as const) {
    const act = ledger.act(keys.rita, kind, { on: 0, expected: { on: ledger.item(0).revision }, fields }, { platform, membership });
    if (act.result !== "write") throw new Error(`Archive observing act failed: ${JSON.stringify(act)}`);
  }
  const delivered = deliver(peer, ledger, ledger.head.seq);
  if (delivered.result !== "write") throw new Error(`Archive peer failed: ${JSON.stringify(delivered)}`);
  const observation = rulesAnswer(rulebook.state, { of: rulebook.at, asked: "rules" }, RULES_SCOPE);
  const body = rulesObservedValues(rulebook.state, { of: rulebook.at, asked: "rules" })[0];
  if (!observation || observation.content.asked !== "rules" || !observation.content.extents || !body) throw new Error("Archive rules value is absent");
  const required: RetainedInput = { kind: "value", domain: body.domain, digest: observation.content.extents, bytes: body.bytes };
  const answer = sent(peer, peer.head.seq);
  written(ledger, judgeDelivery(ledger.state, definition, answer.delivered, {
    ...arriving(ledger, answer.delivered, answer.source), platform,
    observed: [{ observation: { ...observation, at: T0 }, read: { run: "archive-observing-read", n: 1 }, use: "fresh", prior: null }], values: [required.bytes],
    observing: { membership, rules: rulebook.at, content: name => { const supplied = nativePlatform(name); return supplied ? contentStates(supplied.data) : null; } },
  }));
  const all = [ledger, peer, rulebook, rulebook.registrar], target = served(ledger, all);
  return { name: "observing-delivery", scopes: [{ ...target, retained: [...target.retained!, required] }, ...all.slice(1).map(scope => served(scope, all))], required,
    options: { mode: "replay", scope: ledger.at.scope, head: ledger.head, grants: "as-recorded", platform: name => name === named ? { data: definition.declared as PlatformData, rules, membership: () => membership, rulesScope: () => rulebook.at } : nativePlatform(name) } };
}
