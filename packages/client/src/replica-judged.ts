/**
 * `Judged`: the status of signed bytes at the replica's head
 * (`notes/2026-11-13-scope-client.md`, section 9). It calls `judgeAct` of
 * `packages/derive` on the replica's state, with the stand-in grant of
 * `predictionGrant`, and reads the class of a refusal from
 * `REFUSAL_CLASSES`.
 *
 * The record of the replica's `Own` decides, and the return value does not
 * (`notes/2026-11-13-state-seed.md`, section 3). After the call, the
 * function takes the record. A record that holds an `UnheldEntry` makes the prediction
 * `not-judged`, whatever the judge returned or threw. A throw with an empty
 * record is the judge's own failure, and the function throws it on
 * (ruling 7c8774a2, e).
 */

import type { Effect, FactRef, RefusalReason, SignedIntent, Timestamp } from "@generalbusiness/dap-contract";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { REFUSAL_CLASSES, textDigest, utf8, type RefusalClass } from "@generalbusiness/dap-bytes";
import { clockOf, judgeAct, predictionGrant, type ActJudgment, type PlatformRules, type PredictionActor, type StateView, type Texts, type ValidDefinition } from "@generalbusiness/dap-derive";
import type { HeldEntries } from "./replica-own.ts";

export type Judged =
  | { is: "recorded"; fact: FactRef }
  | { is: "write"; effects: readonly Effect[] }
  | { is: "refused-here"; reason: RefusalReason; name?: string; class: Exclude<RefusalClass, "never"> }
  | { is: "never"; reason: RefusalReason; name?: string }
  | { is: "not-judged" };

/** What a prediction reads beside the signed bytes. */
export interface Judging {
  /** The signer, for the stand-in grant. */
  actor: PredictionActor;
  /** The client's clock. The judge checks the intent's `notAfter` against it. */
  reading: Timestamp;
  /** The detached texts that travel beside the intent, as the texts. */
  texts?: readonly string[];
}

/** The replica's parts that a prediction reads. */
export interface Judgeable { state: StateView; definition: ValidDefinition; held: HeldEntries }

/** The texts beside the intent, by digest, with their sizes in UTF-8 bytes. */
function textsOf(texts: readonly string[]): Texts {
  const sizes = new Map(texts.map((text) => [textDigest(text), utf8(text).length]));
  return (digest) => sizes.get(digest);
}

/**
 * The status of the signed bytes at the replica's head. `platform`: the
 * rules of a platform definition, for a test of the catch sites only. A
 * declared definition has none.
 */
export function judgedOn(at: Judgeable, signed: SignedIntent, judging: Judging, platform?: PlatformRules): Judged {
  const scope = at.state.scope();
  if (!scope) return { is: "not-judged" };
  at.held.take();
  let judgment: ActJudgment;
  try {
    judgment = judgeAct(at.state, at.definition, signed, {
      clock: clockOf(at.state, judging.reading), bounds: PROPOSED_BOUNDS, facts: [], prepared: [],
      own: at.held.own, texts: textsOf(judging.texts ?? []), grants: [predictionGrant(at.definition, judging.actor, scope.at)],
      ...(platform ? { platform } : {}),
    });
  } catch (error) {
    if (at.held.take().length > 0) return { is: "not-judged" };
    throw error;
  }
  if (at.held.take().length > 0) return { is: "not-judged" };
  switch (judgment.result) {
    // Only a genesis draft encodes its own sequence. An act's draft holds plain effects.
    case "write": return { is: "write", effects: judgment.draft.effects as readonly Effect[] };
    case "accepted-before": {
      const held = at.held.at(judgment.seq);
      return held ? { is: "recorded", fact: { at: scope.at, seq: judgment.seq, hash: held.hash } } : { is: "not-judged" };
    }
    case "refused": {
      const named = judgment.name === undefined ? {} : { name: judgment.name };
      const kind = REFUSAL_CLASSES[judgment.reason];
      return kind === "never" ? { is: "never", reason: judgment.reason, ...named } : { is: "refused-here", reason: judgment.reason, ...named, class: kind };
    }
    // `unavailable`: the judge lacks a read. `due`: the scope drains a timed entry first. `mismatch`: another intent holds the key,
    // and the replica's entry for the key says which.
    default: return { is: "not-judged" };
  }
}
