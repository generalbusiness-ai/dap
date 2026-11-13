// What runs in any runtime: the derivation, the catalogue, custody in memory, the service and the wire. `node.ts` holds the
// transports and the custody store on files, and is Node's alone.
export * from "./words.ts";
export * from "./marks.ts";
export * from "./describe.ts";
export * from "./input-schema.ts";
export * from "./act-result.ts";
export { dataOf, type CallResult, type FindingData, type Success, type Failure, type CallOutcome, type ViewOutcomeData, type ExactReadData, type LocalReviewData } from "./results.ts";
export * from "./catalogue.ts";
export * from "./errors.ts";
// Temporary same-symbol custody aliases; NF5 removes these after importer migration.
export { UNRESOLVED_MOST, OUTCOMES_INLINE, OUTCOMES_INLINE_BYTES, RECORD_BYTES, KEY_BYTES, DECIDED_SLICE, TERMINAL, identityId, meaningOf, stepId, CustodyError, Lost, validKey, decisive, Custody, memoryStore } from "@generalbusiness/dap-client";
export type { Identity, BindingRecord, Envelope, Phase, ArchivedSettlement, Decided, Outcome, Step, CustodyRecord, CustodyStore, HeldBack, Sent } from "@generalbusiness/dap-client";
// Same-symbol reader aliases for importers of dap-mcp; the client owns the reader since NF-4.
export { Reads, ReadSessions, type ReadPort } from "@generalbusiness/dap-client";
export * from "./inventory.ts";
export * from "./shape.ts";
export * from "./paging.ts";
export * from "./service.ts";
export * from "./wire.ts";
export * from "./http.ts";
export * from "./sqlite-custody.ts";
export * from "./hosted.ts";
export * from "./hosted-tools.ts";
export * from "./oauth-resource.ts";
export * from "./oauth-parameters.ts";
export * from "./oauth-clients.ts";
export * from "./views/resources.ts";
export * from "./views/remote-origins.ts";
export * from "./views/types.ts";
export { actSigner, signerWords } from "./views/actor.ts";
export { ViewError } from "./views/session.ts";
export * from "./read-tools.ts";
export * from "./package-brief.ts";
