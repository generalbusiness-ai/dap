/** Shared decisions about already materialized JSON values. */
import { canonicalize } from "./canonical.ts";

/** A nonnegative safe integer, excluding the distinct negative-zero input. */
export const natural = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && !Object.is(value, -0);

/** A present string value, with every other value represented as null. */
export const stringOrNull = (value: unknown): string | null => typeof value === "string" ? value : null;

/** Equal canonical JSON. Invalid values retain canonicalize's refusal. */
export const same = (left: unknown, right: unknown): boolean => canonicalize(left) === canonicalize(right);

/** Freeze an already owned, acyclic JSON value and its children in place. */
export function freeze<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}
