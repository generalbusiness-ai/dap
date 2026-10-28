/** Evidence successor of the manifest lane. The factory makes its incident
 * child digest explicit; pin generation computes Issue first. */
import type { DeclaredDefinition, Digest, EffectForm, Guard, ReceiveType } from "@generalbusiness/dap-contract";
import { change3 } from "./change3.ts";
import { GENERATION_TEXT, TRIAGERS, bindingFields, cloneEvidence, evidenceJobs, jobFact, nativeFact, resultFact } from "./evidence-fields.ts";

const manifestFact = { type: "fact", kind: ["propose-manifest", "propose-file"], under: "change" } as const;
const publicationFact = { type: "fact", kind: ["reserve"], under: "platform:destination" } as const;
const checks = { type: "list", max: 32, of: { type: "record", of: {
  name: { type: "text", max: 128, required: true }, configuration: { type: "digest", required: true }, required: { type: "bool", required: true }, checker: { type: "member", required: true },
  source: { type: "enum", of: ["member", "room"], required: false }, stage: { type: "enum", of: ["work", "landing", "published"], required: false }, reuse: { type: "bool", required: false }, holds: { type: "bool", required: false },
  audit: { type: "record", of: { check: { type: "text", max: 128, required: true }, every: { type: "int", min: 1, max: 1, required: true } }, required: false },
} } } as const;

export function changeEvidence4(issueDigest: Digest): DeclaredDefinition {
  const next = cloneEvidence(change3);
  evidenceJobs(next);
  const job = next.items["job"]!;
  job.refs["incident"] = { fixed: false, required: false, to: { type: "item", of: "incident" } };
  job.refs["opening"] = { fixed: true, required: false, to: nativeFact };
  job.refs["forJob"] = { fixed: true, required: false, to: jobFact("change") };
  job.refs["auditOf"] = { fixed: true, required: false, to: jobFact("change") };
  const rules = next.items["rules"]!;
  rules.values["checks"]!.of = checks;
  rules.values["evidencePolicy"] = { fixed: false, required: false, of: { type: "text", max: 2048 } };
  next.receives["rules"]!.fields["checks"] = { ...checks, required: false };
  next.receives["rules"]!.fields["evidencePolicy"] = { type: "text", max: 2048, required: true };
  next.receives["rules"]!.effects = [...next.receives["rules"]!.effects, { value: { slot: "evidencePolicy", from: { field: "evidencePolicy" } } }];
  const request = next.acts["request-check"]!;
  Object.assign(request.fields, bindingFields, { reuse: { type: "bool", required: false, default: false } });
  // Caller-selected metadata remains a proposal until native admission. The
  // frozen binding text determines source and exact authority at Destination.
  request.effects = [...request.effects,
    { party: { slot: "checker", from: { field: "checker" } } }, { ref: { slot: "destination", from: { slot: "destination", of: "also.proposal" } } },
    { value: { slot: "binding", from: { field: "binding" } } }, { value: { slot: "bindingDigest", from: { field: "bindingDigest" } } },
    { value: { slot: "stage", from: { const: "landing" } } }, { value: { slot: "commit", from: { slot: "integration", of: "also.manifest" } } }, { value: { slot: "base", from: { slot: "base", of: "also.manifest" } } },
  ];
  // The prior request has eight effects; the seven additions remain within
  // the adopted sixteen-effect bound. Initial ACK only acknowledges queuing.
  request.sends = [{ tell: { to: { slot: "destination", of: "also.proposal" }, message: "check-fence", fields: {
    operation: { slot: "operation", of: "also.manifest" }, manifest: { item: "also.manifest" }, job: "self", name: { field: "name" }, reuse: { field: "reuse" }, earlier: { field: "earlier" }, binding: { field: "binding" }, bindingDigest: { field: "bindingDigest" },
  }, result: { applied: [], refused: [{ state: "fence-refused" }], undelivered: [{ value: { slot: "reason", from: { const: "delivery-unknown" } }, if: [{ state: ["queued"] }] }] } } }];
  // Do not supersede an earlier job merely because a proposed replacement
  // queued. The actual admitted notification below owns that transition.
  next.receives["check-decision"]!.also["earlier"] = { item: "job", via: { slot: "earlier", of: "also.job" } };
  next.receives["check-decision"]!.effects = [...next.receives["check-decision"]!.effects, { state: "superseded", of: "also.earlier", if: [{ equals: { a: { field: "status" }, b: { const: "admitted" } } }, { state: ["requested", "passed", "failed", "errored", "timed-out"], of: "also.earlier" }] }];

  // The native owner emits each automatic job once. Core deduplicates the
  // retained (source fact, send ordinal); no retained-final-job scan is needed.
  const automatic = (audit: boolean): ReceiveType => ({
    message: audit ? "admit-audit-check" : "admit-published-check", class: "tell", from: { kind: "destination", under: "platform:destination" }, opens: "job",
    also: { proposal: { item: "proposal", one: true }, manifest: { item: "manifest", by: "manifest" }, ...(audit ? { memberJob: { item: "job" as const, by: "forJob" } } : {}) },
    fields: { ...bindingFields, operation: { type: "fact", kind: ["merge"], under: "change", required: true }, manifest: { ...manifestFact, required: true }, name: { type: "text", max: 128, required: true }, configuration: { type: "digest", required: true },
      tree: { type: "tree", required: true }, commit: { type: "commit", required: true }, base: { type: "commit", required: true }, ...(audit ? { auditOf: { ...jobFact("change"), required: true }, forJob: { ...jobFact("change"), required: true } } : {}) },
    guards: [
      { equals: { a: { sender: true }, b: { slot: "destination", of: "also.proposal" } }, reason: "not-the-destination" },
      { equals: { a: { field: "manifest", part: "scope" }, b: { scope: true } }, reason: "not-this-proposal" },
      { equals: { a: { field: "operation" }, b: { slot: "operation", of: "also.manifest" } }, reason: "not-this-operation" },
      ...(audit ? [{ equals: { a: { slot: "stage", of: "also.memberJob" }, b: { const: "landing" } }, reason: "not-this-audit" },
        { equals: { a: { slot: "manifest", of: "also.memberJob" }, b: { item: "also.manifest" } }, reason: "not-this-audit" },
        { equals: { a: { field: "auditOf", part: { opened: "tree" } }, b: { field: "tree" } }, reason: "not-this-audit" },
        { equals: { a: { field: "auditOf", part: { opened: "configuration" } }, b: { field: "configuration" } }, reason: "not-this-audit" },
        { equals: { a: { field: "auditOf", part: { opened: "stage" } }, b: { const: "landing" } }, reason: "not-this-audit" },
      ] as Guard[] : []),
    ], effects: [
      { party: { slot: "checker", from: { field: "checker" } } }, { ref: { slot: "manifest", from: { item: "also.manifest" } } },
      { ref: { slot: "destination", from: { sender: true } } }, { ref: { slot: "opening", from: { source: "ref" } } },
      ...["name", "configuration", "tree", "commit", "base", "binding", "bindingDigest"].map(slot => ({ value: { slot, from: { field: slot } } } as EffectForm)),
      { value: { slot: "stage", from: { const: audit ? "landing" : "published" } } }, { value: { slot: "deadline", from: { time: { plusSeconds: 1800 } } } },
      ...(audit ? [{ ref: { slot: "auditOf", from: { field: "auditOf" } } }, { ref: { slot: "forJob", from: { item: "also.memberJob" } } }] as EffectForm[] : []),
    ], sends: [{ tell: { to: { slot: "destination", of: "also.proposal" }, message: "check-fence", fields: {
      operation: { slot: "operation", of: "also.manifest" }, manifest: { item: "also.manifest" }, job: "self", name: { field: "name" }, ...(audit ? { forJob: { item: "also.memberJob" as const } } : {}), binding: { field: "binding" }, bindingDigest: { field: "bindingDigest" },
    }, result: { applied: [], refused: [{ state: "fence-refused" }], undelivered: [{ value: { slot: "reason", from: { const: "delivery-unknown" } }, if: [{ state: ["queued"] }] }] } } }], attention: [],
  });
  next.receives["admit-published-check"] = automatic(false);
  next.receives["admit-audit-check"] = automatic(true);
  next.items["incident"] = { many: true, max: 8192, initial: "creating", states: { creating: { final: false }, created: { final: false }, refused: { final: false }, conflict: { final: false }, unknown: { final: false } },
    parties: { triagers: { fixed: true, required: true, list: true, max: 32, author: false } },
    refs: { job: { fixed: true, required: true, to: { type: "item", of: "job" } }, decision: { fixed: true, required: true, to: nativeFact },
      publication: { fixed: true, required: true, to: publicationFact }, manifest: { fixed: true, required: true, to: manifestFact }, result: { fixed: true, required: false, to: resultFact("change") }, child: { fixed: false, required: false, to: { type: "scope", kind: "lane" } } },
    values: { cause: { fixed: true, required: true, of: { type: "text", max: 4096 } }, policyGeneration: { fixed: true, required: true, of: GENERATION_TEXT }, commit: { fixed: true, required: true, of: { type: "commit" } } } };
  next.receives["published-check-failure"] = { message: "published-check-failure", class: "tell", from: { kind: "destination", under: "platform:destination" }, opens: "incident",
    also: { job: { item: "job", by: "job" }, proposal: { item: "proposal", one: true } },
    fields: { job: { ...jobFact("change"), required: true }, publication: { ...publicationFact, required: true }, manifest: { ...manifestFact, required: true }, result: { ...resultFact("change"), required: false }, decision: { ...nativeFact, required: true }, cause: { type: "text", max: 4096, required: true }, triagers: { ...TRIAGERS, required: true }, policyGeneration: { ...GENERATION_TEXT, required: true } },
    guards: [
      { equals: { a: { sender: true }, b: { slot: "destination", of: "also.proposal" } }, reason: "not-the-destination" },
      { equals: { a: { field: "decision" }, b: { source: "ref" } }, reason: "not-this-decision" },
      { equals: { a: { slot: "stage", of: "also.job" }, b: { const: "published" } }, reason: "not-published" },
      { equals: { a: { field: "manifest", part: "seq" }, b: { slot: "manifest", of: "also.job" } }, reason: "not-this-job" },
      { equals: { a: { field: "manifest", part: "scope" }, b: { scope: true } }, reason: "not-this-job" },
      { unset: "incident", of: "also.job", reason: "incident-exists" },
      { has: { list: { field: "triagers" }, as: "recipient", where: [] }, reason: "triagers-unavailable" },
    ], effects: [
      { ref: { slot: "incident", from: "self" }, of: "also.job" }, { ref: { slot: "job", from: { item: "also.job" } } }, { ref: { slot: "decision", from: { source: "ref" } } },
      ...["publication", "manifest", "result"].map(slot => ({ ref: { slot, from: { field: slot } } } as EffectForm)),
      { party: { slot: "triagers", from: { field: "triagers" } } }, { value: { slot: "cause", from: { field: "cause" } } },
      { value: { slot: "policyGeneration", from: { field: "policyGeneration" } } }, { value: { slot: "commit", from: { slot: "commit", of: "also.job" } } },
    ], sends: [{ create: { kind: "lane", definition: issueDigest, fields: {
      kind: { const: "published-failure" }, title: { const: "Published check failed" }, conditions: { const: ["Record and resolve the failed published check."] },
      incident: "self", failure: { source: "ref" }, failedJob: { item: "also.job" }, failedResult: { field: "result" }, publishedCommit: { slot: "commit", of: "also.job" }, triagers: { field: "triagers" },
    }, result: { applied: [{ state: "created" }, { ref: { slot: "child", from: { sender: true } } }], refused: [{ state: "refused" }], conflict: [{ state: "conflict" }], undelivered: [{ state: "unknown" }] } } }], attention: [] };
  return next;
}
