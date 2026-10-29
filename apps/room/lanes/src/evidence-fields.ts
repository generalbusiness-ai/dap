/** Declared wire for evidence successors. Semantic binding validation belongs
 * to native admission; nullable records remain exact canonical JSON text. */
import type { ActType, DeclaredDefinition, EffectForm, FieldType, Guard } from "@generalbusiness/dap-contract";

export const BINDING_TEXT = { type: "text", max: 16384 } as const;
export const GENERATION_TEXT = { type: "text", max: 512 } as const;
export const STAGE = { type: "enum", of: ["work", "landing", "published"] } as const;
export const TRIAGERS = { type: "list", max: 32, of: { type: "member" } } as const;
export const cloneEvidence = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
export const nativeFact = { type: "fact", kind: ["check-fence", "work-check-fence", "reserve",
  ...["evidence-admit", "evidence-result", "evidence-progress", "judge", "check-judge", "receipt", "read", "evidence-notice", "evidence-audit", "published-checks"].map(kind => `platform:destination@17:${kind}`),
], under: "platform:destination" } as const;
export const jobFact = (name: "issue" | "change"): FieldType => ({ type: "fact", kind: name === "issue" ? ["request-work-check"] : ["request-check", "admit-published-check", "admit-audit-check"], under: name });
export const resultFact = (name: "issue" | "change"): FieldType => ({ type: "fact", kind: ["check", "check-error"], under: name });

/** Add the bounded metadata to an existing Change job or a new Issue job. */
export function evidenceJobs(next: DeclaredDefinition): void {
  const name = next.name as "issue" | "change";
  const job = next.items["job"] ?? { many: true, max: 64, initial: "queued", states: {
    queued: { final: false }, requested: { final: false }, passed: { final: false }, failed: { final: false }, errored: { final: false },
    "timed-out": { final: false }, superseded: { final: true }, "fence-refused": { final: true },
  }, parties: {}, refs: {}, values: {} };
  job.states["reused"] = { final: true };
  job.refs["countedJob"] = { fixed: false, required: false, to: jobFact(name) };
  job.refs["countedResult"] = { fixed: false, required: false, to: resultFact(name) };
  job.parties["asker"] = { fixed: true, required: false, list: false, author: false };
  job.parties["checker"] = { fixed: true, required: true, list: false, author: false };
  job.refs["destination"] = { fixed: true, required: true, to: { type: "scope", kind: "destination" } };
  job.refs["admission"] = { fixed: false, required: false, to: nativeFact };
  job.refs["nativeDecision"] = { fixed: false, required: false, to: nativeFact };
  job.refs["decidedBy"] = { fixed: false, required: false, to: { type: "fact", kind: ["check", "check-error", "timed:job-deadline"], under: name } };
  Object.assign(job.values, {
    name: { fixed: true, required: true, of: { type: "text", max: 128 } }, tree: { fixed: true, required: true, of: { type: "tree" } },
    configuration: { fixed: true, required: true, of: { type: "digest" } }, deadline: { fixed: true, required: true, of: { type: "time" } },
    binding: { fixed: true, required: true, of: BINDING_TEXT }, bindingDigest: { fixed: true, required: true, of: { type: "digest" } },
    stage: { fixed: true, required: true, of: STAGE }, commit: { fixed: true, required: true, of: { type: "commit" } }, base: { fixed: true, required: true, of: { type: "commit" } },
    reason: { fixed: false, required: false, of: { type: "text", max: 128 } }, frozenGeneration: { fixed: false, required: false, of: GENERATION_TEXT }, observedGeneration: { fixed: false, required: false, of: GENERATION_TEXT },
  });
  next.items["job"] = job;
  next.items["result"] = { many: true, max: 512, initial: "recorded", states: { recorded: { final: true } },
    parties: { checker: { fixed: true, required: true, list: false, author: false } }, refs: { job: { fixed: true, required: true, to: { type: "item", of: "job" } } },
    values: { outcome: { fixed: true, required: true, of: { type: "enum", of: ["passed", "failed", "error"] } }, reason: { fixed: true, required: false, of: { type: "text", max: 4096 } },
      tree: { fixed: true, required: true, of: { type: "tree" } }, details: { fixed: true, required: false, of: { type: "digest" } }, bindingDigest: { fixed: true, required: true, of: { type: "digest" } } } };
  for (const failed of [false, true]) {
    const kind = failed ? "check-error" : "check";
    const effects: EffectForm[] = [
      { party: { slot: "checker", from: { signer: true } } }, { ref: { slot: "job", from: { item: "also.job" } } },
      { value: { slot: "outcome", from: failed ? { const: "error" } : { field: "outcome" } } },
      { value: { slot: "tree", from: { field: "tree" } } }, { value: { slot: "details", from: { field: "details" } } },
      { value: { slot: "bindingDigest", from: { field: "bindingDigest" } } },
    ];
    // A signed result is provisional until Destination accepts its current
    // source key. A second key of the same member cannot settle this job.
    if (failed) effects.push({ value: { slot: "reason", from: { field: "reason" } } });
    next.acts[kind] = { step: "open", on: "result", grant: "change.check",
      also: { job: { item: "job", by: "job" }, ...(name === "change" ? { manifest: { item: "manifest" as const, via: { slot: "manifest", of: "also.job" as const } } } : {}) }, fields: {
        job: { type: "item", of: "job", required: true }, jobFact: { ...jobFact(name), required: true },
        tree: { type: "tree", required: true }, configuration: { type: "digest", required: true }, bindingDigest: { type: "digest", required: true },
        ...(failed ? { reason: { type: "text" as const, max: 4096, required: true } } : { outcome: { type: "enum" as const, of: ["passed", "failed"], required: true } }),
        details: { type: "digest", required: false },
      }, guards: [
        { state: ["requested", "timed-out", "passed", "failed", "errored"], of: "also.job", reason: "job-not-active" },
        { signer: ["checker"], of: "also.job", reason: "not-the-checker" },
        { equals: { a: { field: "jobFact" }, b: { item: "also.job" } }, reason: "not-this-job" },
        ...["tree", "configuration", "bindingDigest"].map(field => ({ equals: { a: { field }, b: { slot: field, of: "also.job" as const } }, reason: "not-this-job" } as Guard)),
      ], effects, sends: [{ tell: { to: { slot: "destination", of: "also.job" }, message: name === "issue" ? "work-checked" : "checked", fields: { ...(name === "change" ? { operation: { slot: "operation", of: "also.manifest" as const } } : {}), admission: { slot: "admission", of: "also.job" }, result: "self", job: { item: "also.job" }, bindingDigest: { slot: "bindingDigest", of: "also.job" } }, result: {} } }], attention: [] };
  }
  next.receives["check-decision"] = { message: "check-decision", class: "tell", from: { kind: "destination", under: "platform:destination" }, opens: null,
    settles: { of: "also.job", in: ["requested", "timed-out"] },
    also: { job: { item: "job", by: "job" } }, fields: { status: { type: "enum", of: ["admitted", "reused", "refused", "decided"], required: true }, countedJob: { ...jobFact(name), required: false }, job: { ...jobFact(name), required: true }, result: { ...resultFact(name), required: false },
      decision: { ...nativeFact, required: true }, reason: { type: "text", max: 128, required: true }, frozenGeneration: { ...GENERATION_TEXT, required: true }, observedGeneration: { ...GENERATION_TEXT, required: true }, commit: { type: "commit", required: false }, tree: { type: "tree", required: false }, base: { type: "commit", required: false } },
    guards: [{ equals: { a: { sender: true }, b: { slot: "destination", of: "also.job" } }, reason: "not-the-destination" },
      { equals: { a: { field: "decision" }, b: { source: "ref" } }, reason: "not-this-decision" },
      { anyOf: [
        [{ equals: { a: { field: "status" }, b: { const: "admitted" } } }, { equals: { a: { field: "reason" }, b: { const: "admitted" } } }],
        [{ equals: { a: { field: "status" }, b: { const: "reused" } } }, { equals: { a: { field: "reason" }, b: { const: "reused" } } }],
        [{ equals: { a: { field: "status" }, b: { const: "refused" } } }, { differs: { a: { field: "reason" }, b: { const: "admitted" } } }, { differs: { a: { field: "reason" }, b: { const: "reused" } } }],
        [{ equals: { a: { field: "status" }, b: { const: "decided" } } }, { differs: { a: { field: "reason" }, b: { const: "admitted" } } }, { differs: { a: { field: "reason" }, b: { const: "reused" } } }],
      ], reason: "not-this-decision" },
      { anyOf: [
        [{ equals: { a: { field: "status" }, b: { const: "reused" } } }, { fact: { field: "result" } }, { fact: { field: "countedJob" } },
          { equals: { a: { field: "result", part: "scope" }, b: { field: "countedJob", part: "scope" } } },
          { equals: { a: { field: "result", part: { field: "job" } }, b: { field: "countedJob", part: "seq" } } }],
        [{ differs: { a: { field: "status" }, b: { const: "reused" } } }, { equals: { a: { field: "result", part: { field: "job" } }, b: { item: "also.job" } }, ifPresent: true }],
      ], reason: "not-this-job" },
      { anyOf: [
        [{ differs: { a: { field: "reason" }, b: { const: "counted" } } }],
        [{ equals: { a: { field: "status" }, b: { const: "decided" } } },
          { equals: { a: { source: "kind" }, b: { const: "platform:destination@17:evidence-result" } } },
          { fact: { field: "result" } },
          { equals: { a: { field: "result", part: { field: "jobFact" } }, b: { field: "job" } } },
          { equals: { a: { field: "result", part: { opened: "bindingDigest" } }, b: { slot: "bindingDigest", of: "also.job" } } },
          { equals: { a: { field: "result", part: { opened: "tree" } }, b: { slot: "tree", of: "also.job" } } }],
      ], reason: "not-this-counted-result" },
      ...(name === "issue" ? [{ anyOf: [
        [{ differs: { a: { field: "status" }, b: { const: "admitted" } } }, { differs: { a: { field: "status" }, b: { const: "reused" } } }],
        [{ equals: { a: { field: "commit" }, b: { slot: "commit", of: "also.job" } } }, { differs: { a: { field: "tree" }, b: { none: true } } }, { differs: { a: { field: "base" }, b: { none: true } } }],
      ], reason: "not-this-work" } as Guard] : ["commit", "tree", "base"].map(field => ({ equals: { a: { field }, b: { slot: field, of: "also.job" } }, ifPresent: true, reason: "not-this-job" } as Guard))),
    ],
    effects: [
      { ref: { slot: "decidedBy", from: { field: "result" } }, of: "also.job", if: [
        { state: ["requested", "timed-out"], of: "also.job" }, { equals: { a: { field: "status" }, b: { const: "decided" } } },
        { equals: { a: { field: "reason" }, b: { const: "counted" } } },
      ] },
      ...(["passed", "failed", "error"] as const).map(outcome => ({ state: outcome === "error" ? "errored" : outcome, of: "also.job", if: [
        { state: ["requested", "timed-out"], of: "also.job" }, { equals: { a: { field: "status" }, b: { const: "decided" } } },
        { equals: { a: { field: "reason" }, b: { const: "counted" } } },
        { equals: { a: { field: "result", part: { opened: "outcome" } }, b: { const: outcome } } },
      ] } as EffectForm)),
      ...(name === "issue" ? ["tree", "base"].map(slot => ({ value: { slot, from: { field: slot } }, of: "also.job", if: [{ state: ["queued"], of: "also.job" }, { anyOf: [[{ equals: { a: { field: "status" }, b: { const: "admitted" } } }], [{ equals: { a: { field: "status" }, b: { const: "reused" } } }]] }] } as EffectForm)) : []),
      { state: "requested", of: "also.job", if: [{ state: ["queued"], of: "also.job" }, { equals: { a: { field: "status" }, b: { const: "admitted" } } }] },
      { state: "fence-refused", of: "also.job", if: [{ state: ["queued"], of: "also.job" }, { equals: { a: { field: "status" }, b: { const: "refused" } } }] },
      { state: "reused", of: "also.job", if: [{ state: ["queued"], of: "also.job" }, { equals: { a: { field: "status" }, b: { const: "reused" } } }] },
      { ref: { slot: "countedJob", from: { field: "countedJob" } }, of: "also.job", if: [{ equals: { a: { field: "status" }, b: { const: "reused" } } }] },
      { ref: { slot: "countedResult", from: { field: "result" } }, of: "also.job", if: [{ equals: { a: { field: "status" }, b: { const: "reused" } } }] },
      { ref: { slot: "admission", from: { source: "ref" } }, of: "also.job", if: [{ state: ["queued"], of: "also.job" }, { anyOf: [[{ equals: { a: { field: "status" }, b: { const: "admitted" } } }], [{ equals: { a: { field: "status" }, b: { const: "reused" } } }]] }] },
      { ref: { slot: "nativeDecision", from: { source: "ref" } }, of: "also.job" },
      ...["reason", "frozenGeneration", "observedGeneration"].map(slot => ({ value: { slot, from: { field: slot } }, of: "also.job" as const } as EffectForm))], sends: [], attention: [] };
  if (!next.timed["job-deadline"]) next.timed["job-deadline"] = { on: "job", states: ["requested"], deadline: "deadline", effects: [{ state: "timed-out" }, { ref: { slot: "decidedBy", from: "self" } }], attention: [] };
}

export const bindingFields: ActType["fields"] = {
  binding: { ...BINDING_TEXT, required: true }, bindingDigest: { type: "digest", required: true }, checker: { type: "member", required: true },
};
