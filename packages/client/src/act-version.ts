/** The version of a bound act, shared by exploration and retained authorization. */
import type { Digest } from "@generalbusiness/dap-contract";
import { canonicalBytes, digestBytes } from "@generalbusiness/dap-bytes";
import type { ItemName, Revision } from "./act-types.ts";

/** Hash the act as written, before any symbolic name is materialized (ruling fa103f71). */
export function actVersion(act: {
  readonly kind: string;
  readonly on: ItemName | null;
  readonly fields: Readonly<Record<string, unknown>>;
  readonly expected: Readonly<Record<string, Revision>>;
}): Digest {
  return digestBytes(canonicalBytes({ kind: act.kind, on: act.on, fields: act.fields, expected: act.expected }));
}
