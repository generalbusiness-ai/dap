import type { KeyId, ScopeRef } from "@generalbusiness/dap-contract";

/** A tool's answer, as `tools/call` sends it: structured content with an object root, and its text. */
export interface CallResult { content: { type: "text"; text: string }[]; structuredContent: Record<string, unknown>; isError: boolean }

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
  readonly prepare: (binding: DispatchBinding, source: DispatchSource | null) => Promise<() => CallResult | null>;
}
