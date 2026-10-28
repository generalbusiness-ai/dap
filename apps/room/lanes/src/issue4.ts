/** Evidence successor. Old Issue bytes remain in issue.ts. Work staging is
 * a separate admitted source, never a report or a caller assertion of a tree. */
import type { DeclaredDefinition, EffectForm, Guard } from "@generalbusiness/dap-contract";
import { issue } from "./issue.ts";
import { bindingFields, cloneEvidence, evidenceJobs, jobFact, nativeFact, TRIAGERS } from "./evidence-fields.ts";

export const issueEvidence4: DeclaredDefinition = cloneEvidence(issue);
const goal = issueEvidence4.items["intent"]!;
goal.parties["requester"]!.required = false;
goal.parties["triagers"] = { fixed: true, required: false, list: true, max: 32, author: false };
goal.refs["failure"] = { fixed: true, required: false, to: nativeFact };
goal.refs["failedJob"] = { fixed: true, required: false, to: jobFact("change") };
goal.refs["failedResult"] = { fixed: true, required: false, to: { type: "fact", kind: ["check", "check-error"], under: "change" } };
goal.values["kind"] = { fixed: true, required: true, of: { type: "enum", of: ["ordinary", "published-failure"] } };
goal.values["publishedCommit"] = { fixed: true, required: false, of: { type: "commit" } };
const file = issueEvidence4.acts["file"]!;
file.fields["opener"]!.required = false;
Object.assign(file.fields, {
  kind: { type: "enum", of: ["ordinary", "published-failure"], required: false, default: "ordinary" },
  incident: { type: "fact", kind: ["published-check-failure"], under: "change", required: false },
  failure: { ...nativeFact, required: false }, failedJob: { ...jobFact("change"), required: false },
  failedResult: { type: "fact", kind: ["check", "check-error"], under: "change", required: false },
  publishedCommit: { type: "commit", required: false }, triagers: { ...TRIAGERS, required: false },
});
file.guards = [{ anyOf: [
  [{ equals: { a: { field: "kind" }, b: { const: "ordinary" } } }, { differs: { a: { field: "opener" }, b: { none: true } } }, { equals: { a: { field: "incident" }, b: { none: true } } },
    ...["failure", "failedJob", "failedResult", "publishedCommit", "triagers"].map(field => ({ equals: { a: { field }, b: { none: true } } } as Guard))],
  [{ equals: { a: { field: "kind" }, b: { const: "published-failure" } } }, { equals: { a: { field: "opener" }, b: { none: true } } }, { equals: { a: { field: "origin" }, b: { none: true } } },
    { fact: { field: "incident" } }, { equals: { a: { field: "failure" }, b: { field: "incident", part: { opened: "decision" } } } }, { differs: { a: { field: "publishedCommit" }, b: { none: true } } },
    { equals: { a: { field: "publishedCommit" }, b: { field: "incident", part: { opened: "commit" } } } },
    ...[["failedJob", "job"], ["failedResult", "result"], ["triagers", "triagers"]].map(([a, b]) => ({ equals: { a: { field: a! }, b: { field: "incident", part: { field: b! } } } } as Guard)),
    { has: { list: { field: "triagers" }, as: "recipient", where: [] } },
  ],
], reason: "not-this-incident" }];
file.effects = [
  ...file.effects.map(effect => ("party" in effect && effect.party.slot === "requester" || "ref" in effect && effect.ref.slot === "parent" || "value" in effect && effect.value.slot === "parentItem") ? { ...effect, if: [{ equals: { a: { field: "kind" }, b: { const: "ordinary" } } }] } as EffectForm : effect),
  { value: { slot: "kind", from: { field: "kind" } } }, { value: { slot: "publishedCommit", from: { field: "publishedCommit" } } },
  { party: { slot: "triagers", from: { field: "triagers" } } },
  { ref: { slot: "failure", from: { field: "failure" } } }, { ref: { slot: "failedJob", from: { field: "failedJob" } } }, { ref: { slot: "failedResult", from: { field: "failedResult" } } },
  { ref: { slot: "parent", from: { field: "incident", part: "scope" } }, if: [{ equals: { a: { field: "kind" }, b: { const: "published-failure" } } }] },
  { value: { slot: "parentItem", from: { field: "incident", part: "seq" } }, if: [{ equals: { a: { field: "kind" }, b: { const: "published-failure" } } }] },
];
file.attention = [{ notify: { slot: "triagers", of: "on", when: "after", reason: "published-check-failed", if: [{ equals: { a: { field: "kind" }, b: { const: "published-failure" } } }] } }];

issueEvidence4.items["work-source"] = { many: true, max: 64, initial: "staged", states: { staged: { final: false }, released: { final: true } },
  parties: { performer: { fixed: true, required: true, list: false, author: false } },
  refs: { commitment: { fixed: true, required: true, to: { type: "item", of: "commitment" } }, termsAt: { fixed: true, required: true, to: { type: "fact", kind: ["file", "revise", "propose-terms"], under: "issue" } }, destination: { fixed: true, required: true, to: { type: "scope", kind: "destination" } } },
  values: { commit: { fixed: true, required: true, of: { type: "commit" } } } };
issueEvidence4.acts["stage-work"] = { step: "open", on: "work-source", grant: "issue.work", also: { commitment: { item: "commitment", by: "commitment" } },
  fields: { commitment: { type: "item", of: "commitment", required: true }, terms: { type: "fact", kind: ["file", "revise", "propose-terms"], under: "issue", required: true }, commit: { type: "commit", required: true }, destination: { type: "scope", kind: "destination", required: true } },
  guards: cloneEvidence(issue.acts["report"].guards),
  effects: [{ party: { slot: "performer", from: { signer: true } } }, { ref: { slot: "commitment", from: { item: "also.commitment" } } },
    { ref: { slot: "termsAt", from: { field: "terms" } } }, { ref: { slot: "destination", from: { field: "destination" } } },
    { value: { slot: "commit", from: { field: "commit" } } }, { capability: { name: "hold", do: "pin-hold", with: { commit: { field: "commit" } } } }], sends: [], attention: [] };
evidenceJobs(issueEvidence4);
for (const slot of ["tree", "base"]) { issueEvidence4.items["job"]!.values[slot]!.fixed = false; issueEvidence4.items["job"]!.values[slot]!.required = false; }
issueEvidence4.items["job"]!.refs["workSource"] = { fixed: true, required: true, to: { type: "item", of: "work-source" } };
issueEvidence4.acts["request-work-check"] = { step: "open", on: "job", grant: "issue.work", also: { source: { item: "work-source", by: "source" } },
  fields: { ...bindingFields, reuse: { type: "bool", required: false, default: false }, source: { type: "fact", kind: ["stage-work"], under: "issue", required: true }, name: { type: "text", max: 128, required: true }, configuration: { type: "digest", required: true }, commitProof: { type: "text", max: 49152, required: true } },
  guards: [{ state: ["staged"], of: "also.source", reason: "work-released" }, { signer: ["performer"], of: "also.source" }],
  effects: [{ party: { slot: "asker", from: { signer: true } } }, { party: { slot: "checker", from: { field: "checker" } } },
    { ref: { slot: "workSource", from: { item: "also.source" } } }, { ref: { slot: "destination", from: { slot: "destination", of: "also.source" } } },
    ...["name", "configuration", "binding", "bindingDigest"].map(slot => ({ value: { slot, from: { field: slot } } } as EffectForm)),
    { value: { slot: "commit", from: { slot: "commit", of: "also.source" } } }, { value: { slot: "stage", from: { const: "work" } } }, { value: { slot: "deadline", from: { time: { plusSeconds: 1800 } } } }],
  sends: [{ tell: { to: { slot: "destination", of: "also.source" }, message: "work-check-fence", fields: {
    job: "self", source: { item: "also.source" }, reuse: { field: "reuse" }, name: { field: "name" }, configuration: { field: "configuration" }, commitProof: { field: "commitProof" }, binding: { field: "binding" }, bindingDigest: { field: "bindingDigest" },
  }, result: { applied: [], refused: [{ state: "fence-refused" }], undelivered: [{ value: { slot: "reason", from: { const: "delivery-unknown" } }, if: [{ state: ["queued"] }] }] } } }], attention: [] };
issueEvidence4.items["work-source"]!.values["releaseReason"] = { fixed: false, required: false, of: { type: "text", max: 4096 } };
issueEvidence4.acts["release-work"] = { step: "transition", on: "work-source", grant: "issue.work", also: {},
  fields: { abandon: { type: "bool", required: false, default: false }, reason: { type: "text", max: 4096, required: false } },
  guards: [{ state: ["staged"] }, { signer: ["performer"] },
    { anyOf: [[{ equals: { a: { field: "abandon" }, b: { const: false } } }],
      [{ equals: { a: { field: "abandon" }, b: { const: true } } }, { differs: { a: { field: "reason" }, b: { none: true } } }, { differs: { a: { field: "reason" }, b: { const: "" } } }]], reason: "release-reason-required" },
    { anyOf: [[{ equals: { a: { field: "abandon" }, b: { const: true } } }],
      [...[null, "admitted", "delivery-unknown"].map(reason => ({ none: { type: "job", states: ["queued", "requested", "passed", "failed", "errored", "timed-out"],
        where: [{ equals: { a: { slot: "workSource" }, b: { item: "on" } } }, { equals: { a: { slot: "reason" }, b: reason === null ? { none: true } : { const: reason } } }] } } as Guard))],
    ], reason: "work-check-pending" },
  ],
  // This ends only the source pin. Jobs and any actual external work retain
  // their recorded unresolved status; no cancellation or physical drain.
  effects: [{ state: "released" }, { value: { slot: "releaseReason", from: { field: "reason" } } }, { capability: { name: "hold", do: "pin-release", with: { commit: { slot: "commit" } } } }], sends: [], attention: [] };
