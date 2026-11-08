/** Immutable program data and the two admitted execution phases. */
export type Phase = "before" | "working";
/** Copy declaration data so later caller mutation cannot change a compiled body. */
export function immutable<T>(value: T, origins?: WeakMap<object, object>): T {
  if (value !== null && typeof value === "object") {
    const copied: object = Array.isArray(value) ? value.map(item => immutable(item, origins)) : Object.fromEntries(Object.entries(value).map(([k, v]) => [k, immutable(v, origins)]));
    origins?.set(copied, value);
    return Object.freeze(copied) as T;
  }
  return value;
}
