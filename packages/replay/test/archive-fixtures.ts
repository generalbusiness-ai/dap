/** Judged in-memory fixture histories for A2 cutoffs. No native storage,
 * privacy admission or real-room export. Made-up owner rules and recorded
 * fixture authority are explicit; no caller anchor supplies a dependency. */
import { PROPOSED_BOUNDS, type Digest, type PlatformData, type RetainedInput, type Seed } from "@generalbusiness/dap-contract";
import { canonicalize, intentDigest, newIncarnation, scopeIdOf, signIntent, textDigest } from "@generalbusiness/artroom-bytes";
import { clockOf, judgeGenesis, settleOutcome, valueDigest, type Judgment, type OutcomeRule } from "@generalbusiness/dap-derive";
import { created, keys, Ledger, membership, notesDefinition, T0, t } from "@generalbusiness/dap-derive/testing";
import { gateRules, gateWith } from "../../derive/test/fixtures-marks.ts";
import type { MemoryScope, Options } from "../src/index.ts";
import { served } from "./world.ts";

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
  const domain = "archive-fixture-evidence-1", proof = { seat: 12 };
  const required: RetainedInput = { kind: "value", domain, digest: valueDigest(domain, proof), bytes: canonicalize(proof) };
  const probe: OutcomeRule = {
    selects: false, read: false, retries: () => false,
    valueDomains: [{ domain, max: 64 }],
    values: evidence => {
      const digest = (evidence.body as { proof?: Digest } | null)?.proof;
      return digest ? [{ domain, max: 64, digest }] : [];
    },
  };
  const definition = gateWith(data => {
    data.name = "platform:task";
    data.acts.issue.effects.push({ code: "archive-open", row: "P16", most: { effects: 0, operations: ["probe"] } });
    data.outcomes.probe.attempts = 1;
  });
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
