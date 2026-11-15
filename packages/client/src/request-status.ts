/** The seven ordered request status rules, client note section 6. No store or transport call enters this function. */
import type { Digest, Head, RefusalReason } from "@generalbusiness/dap-contract";
import { REFUSAL_CLASSES, type RefusalClass } from "@generalbusiness/dap-bytes";
import type { CustodyRecord, CustodySigning, Outcome } from "./custody.ts";
import { decisive } from "./custody.ts";
import { sendableAt } from "./originals.ts";
import type { Judged } from "./replica-judged.ts";
import type { SignedEntry } from "./replica.ts";

export type Why = { by: "scope"; reason: RefusalReason; name?: string; class: RefusalClass }
  | { by: "client"; reason: "unsent" };
export type RequestStatus = { status: "recorded" | "other-recorded" | "pending" }
  | { status: "withdrawn" | "refused"; why: Why };

/** A dead signing cannot be copied again. The scope's expired and never answers override a slow client clock. */
export const signingDead = (signing: CustodySigning, now: number): boolean => signing.dead !== undefined || now >= sendableAt(signing.notAfter);
const unanswered = (outcome: Outcome): boolean => "lost" in outcome || "answer" in outcome && outcome.answer.answer === "unavailable";

export interface RequestStatusAt {
  entry: SignedEntry | null;
  record: CustodyRecord;
  /** Every outcome, including the segment. The caller reads them before computing this pure view. */
  outcomes: readonly Outcome[];
  presentMeaning: Digest;
  head: Head | null;
  now: number;
  /** The status of each signing's exact bytes at this head. Closed signings need no prediction. */
  predict(index: number): Judged;
}

/** First matching rule wins. In particular, a replica entry wins over every custody answer and local clock. */
export function requestStatus(at: RequestStatusAt): RequestStatus {
  const { entry, record, presentMeaning, head, now } = at;
  if (entry) return { status: entry.meaning === presentMeaning ? "recorded" : "other-recorded" }; // 1, 2
  if (record.phase === "accepted" || record.phase === "mismatch") return { status: "pending" }; // 3
  const decision = decisive(at.outcomes, record.attempt);
  const answer = decision?.answer;
  const refusal = answer?.answer === "refused" ? answer : null;
  if (refusal && REFUSAL_CLASSES[refusal.reason] === "protocol") return { status: "refused", why: { by: "scope", reason: refusal.reason, class: "protocol", ...(refusal.name === undefined ? {} : { name: refusal.name }) } }; // 4
  if (refusal && (head === null || head.seq < refusal.judgedAt.seq)) return { status: "pending" }; // 5
  const latest = record.signings.at(-1)!;
  if (!refusal && !decision?.unsent && !signingDead(latest, now)) return { status: "pending" }; // 7
  const why: Why = refusal ? { by: "scope", reason: refusal.reason, class: REFUSAL_CLASSES[refusal.reason],
    ...(refusal.name === undefined ? {} : { name: refusal.name }) } : { by: "client", reason: "unsent" };
  // 6: a copy with no answer can still write. A refusal of a different copy does not settle it.
  const inflight = record.signings.some((signing, index) => {
    if (signing.closed || signingDead(signing, now)) return false;
    const copy = at.outcomes.some(outcome => outcome.signing === index && unanswered(outcome))
      || record.phase === "sent" && index === record.signings.length - 1;
    if (!copy) return false;
    const prediction = at.predict(index);
    return prediction.is !== "refused-here" && prediction.is !== "never";
  });
  return { status: inflight ? "withdrawn" : "refused", why };
}
