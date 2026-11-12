import type { KeyId, ScopeRef } from "@generalbusiness/dap-contract";

/** A tool's answer, as `tools/call` sends it: structured content with an object root, and its text. */
export interface CallResult { content: { type: "text"; text: string }[]; structuredContent: Record<string, unknown>; isError: boolean }
/** Internal precision on the same constructor-produced wire object. */
export type TypedCallResult<T extends Record<string, unknown>> = CallResult & { structuredContent: T };
/** Only a typed constructor or method establishes T. This accessor validates nothing. */
export const dataOf = <T extends Record<string, unknown>>(result: TypedCallResult<T>): T => result.structuredContent;
export type FindingData = { error: string; message: string; next: string };
export type Success<T extends Record<string, unknown>> = TypedCallResult<T> & { isError: false };
export type Failure = TypedCallResult<FindingData> & { isError: true };
export type CallOutcome<T extends Record<string, unknown>> = Success<T> | Failure;

/** Only the fields a view displays; this is not a Native Answer or receipt. */
export type ViewOutcomeData = { answer?: string; reason?: string; name?: string; error?: string; message?: string; next?: string; checkAfter?: string; fact?: { seq?: number }; localStatus?: string };
export type ExactReadData = ViewOutcomeData & { text?: string; truncated?: boolean; leftOut?: string | null; files?: number; paths?: { path: string; shown: string; commit: string }[]; commits?: { label: string; id: string }[] };
export type LocalReviewData = { localStatus: "marked" | "already" | "refused" | "unavailable" | "stale" };

/** Actual custody identity at a hosted delivery boundary; never client input. */
export interface DispatchBinding {
  readonly service: string;
  readonly signer: string;
  readonly membership: ScopeRef | null;
}
/** Immutable construction facts of the actual service port, not its current target or a request credential. */
export interface DispatchSource {
  readonly op: string;
  readonly key: KeyId;
  readonly service: string;
  readonly membership: ScopeRef;
}
/** Private per-invocation context. Each delivery prepares fresh facts and finishes once. */
export interface DispatchContext {
  readonly prepare: (binding: DispatchBinding, source: DispatchSource | null) => Promise<() => Failure | null>;
}
