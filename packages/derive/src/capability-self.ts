/** Internal synchronous-call carrier. No marker property reaches a rule's Given. */
import type { Recorded } from "./capability.ts";

type Collect = (record: Recorded, path: readonly (string | number)[]) => void;
let current: Collect | undefined;

/** Closed built-in producers report their actual record object and written path. */
export function recordSelfReference(record: Recorded, path: readonly (string | number)[]): void {
  current?.(record, path);
}

/** A nested call, including runtime code, cannot inherit an outer body's collector. */
export function withCapabilityRecords<T>(collect: Collect | undefined, run: () => T): T {
  const previous = current;
  current = collect;
  try { return run(); }
  finally { current = previous; }
}
