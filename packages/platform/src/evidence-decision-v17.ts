/** Read a provisional successor-lane result, not a runner's answer.
 * Admission independently proves the retained job and its commit/tree/base;
 * current signing authority is checked by the Native source guard. */
import type { Digest, Effect, FactRef, KeyId, Sealed } from "@generalbusiness/dap-contract";
import { entryHash, isDigest, isEntry, isFactRef, isRecord, same, utf8, verifySignedIntent } from "@generalbusiness/dap-bytes";

export interface EvidenceDecisionExpectedV17 {
  job: FactRef; admission: FactRef; bindingDigest: Digest;
  tree: string; configuration: Digest;
  /** Frozen Room key checked before a held receiver decision is selected. */
  resultKey?: KeyId;
}
export interface EvidenceDecisionV17 {
  result: FactRef; key: KeyId; outcome: "passed" | "failed" | "error"; reason: string | null;
}
const exact = (value: Record<string, unknown>, keys: readonly string[]) =>
  Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));

export function readEvidenceDecisionV17(sealed: Sealed, expected: EvidenceDecisionExpectedV17): EvidenceDecisionV17 | null {
  try {
    if (!isFactRef(expected.job) || !isFactRef(expected.admission) || !isDigest(expected.bindingDigest)
      || !isDigest(expected.configuration) || !/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/.test(expected.tree)
      || !isDigest(sealed.hash) || !isEntry(sealed.entry) || entryHash(sealed.entry) !== sealed.hash) return null;
    const entry = sealed.entry;
    if (!same(entry.at, expected.job.at) || entry.seq <= expected.job.seq || entry.input.type !== "act") return null;
    const signed = entry.input.signed, intent = signed.intent;
    if (!verifySignedIntent(signed) || !same(intent.to, expected.job.at) || intent.on !== null
      || !["check", "check-error"].includes(intent.kind) || expected.resultKey !== undefined && intent.actor !== expected.resultKey) return null;
    const fields = intent.fields, error = intent.kind === "check-error";
    const required = ["job", "jobFact", "tree", "configuration", "bindingDigest", error ? "reason" : "outcome"];
    if (!required.every(key => Object.hasOwn(fields, key)) || Object.keys(fields).some(key => ![...required, "details"].includes(key))
      || fields["job"] !== expected.job.seq || !same(fields["jobFact"], expected.job)
      || fields["tree"] !== expected.tree || fields["configuration"] !== expected.configuration
      || fields["bindingDigest"] !== expected.bindingDigest || Object.hasOwn(fields, "details") && !isDigest(fields["details"])) return null;
    const outcome = error ? "error" : fields["outcome"];
    const reason = error ? fields["reason"] : null;
    if (outcome !== "passed" && outcome !== "failed" && outcome !== "error") return null;
    if (error && (typeof reason !== "string" || reason.length > 4096 || utf8(reason).length > 4096)) return null;
    // Only Native admission of the result may decide the job. The signed
    // lane act records a result; it must leave every admitted job slot alone.
    if (entry.effects.some(effect => "item" in effect && effect.item === expected.job.seq)) return null;
    // These rows distinguish a recorded result from an unrelated act that
    // happens to carry the same signed fields. Each relevant slot is unique.
    const one = (predicate: (effect: Effect) => boolean) => entry.effects.filter(predicate).length === 1;
    const value = (slot: string, expectedValue: unknown) => {
      const rows = entry.effects.filter(effect => effect.effect === "value" && effect.item === entry.seq && effect.slot === slot);
      return rows.length === 1 && rows[0]!.effect === "value" && same(rows[0]!.value, expectedValue);
    };
    if (!one(effect => effect.effect === "open" && effect.item === entry.seq && effect.type === "result" && effect.state === "recorded")
      || !one(effect => effect.effect === "ref" && effect.item === entry.seq && effect.slot === "job" && effect.to === expected.job.seq)
      || !value("outcome", outcome) || !value("tree", expected.tree) || !value("bindingDigest", expected.bindingDigest)
      || error && !value("reason", reason)) return null;
    const notices = entry.sends.filter(send => send.message.class === "request" && send.message.type === "tell"
      && isRecord(send.message.body) && ["checked", "work-checked"].includes(String(send.message.body["message"])));
    if (notices.length !== 1) return null;
    const send = notices[0]!, message = send.message;
    if (!same(send.to, expected.admission.at) || message.class !== "request" || !isRecord(message.body)
      || !exact(message.body, ["message", "fields"]) || !isRecord(message.body["fields"])) return null;
    const sent = message.body["fields"];
    if (!["admission", "result", "job", "bindingDigest"].every(key => Object.hasOwn(sent, key))
      || Object.keys(sent).some(key => !["admission", "result", "job", "bindingDigest", "operation"].includes(key))
      || !same(sent["admission"], expected.admission) || !same(sent["job"], expected.job)
      || sent["bindingDigest"] !== expected.bindingDigest || !isRecord(sent["result"])
      || !exact(sent["result"], ["self"]) || sent["result"]["self"] !== true
      || Object.hasOwn(sent, "operation") && !isFactRef(sent["operation"])) return null;
    return { result: { at: entry.at, seq: entry.seq, hash: sealed.hash }, key: intent.actor, outcome, reason: typeof reason === "string" ? reason : null };
  } catch { return null; }
}
