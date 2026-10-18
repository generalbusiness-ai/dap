/** Finite JSON admission before package serialization. No native entry rule. */
import { canonicalize, utf8, wellFormed } from "./index.ts";
import { ApplicationPackageError } from "./application-types.ts";

export function applicationJson(value: unknown, most: number): string {
  let bytes = 0, nodes = 0;
  const active = new Set<object>();
  const spend = (n: number): void => { if (n > most - bytes) throw new ApplicationPackageError("limit"); bytes += n; };
  const text = (s: string): void => {
    if (s.length > most - bytes) throw new ApplicationPackageError("limit");
    if (!wellFormed(s)) throw new ApplicationPackageError("invalid");
    spend(2);
    // Measure escapes before JSON.stringify or UTF-8 can allocate the
    // expanded string. Canonical serialization happens only after admission.
    for (const character of s) {
      const code = character.codePointAt(0)!;
      spend(code === 34 || code === 92 || code === 8 || code === 9 || code === 10 || code === 12 || code === 13 ? 2 : code < 32 ? 6 : code < 128 ? 1 : code < 2048 ? 2 : code < 65536 ? 3 : 4);
    }
  };
  const visit = (v: unknown, depth: number): void => {
    if (++nodes > 100_000 || depth >= 64) throw new ApplicationPackageError("limit");
    if (v === null) return spend(4);
    if (typeof v === "string") return text(v);
    if (typeof v === "boolean") return spend(v ? 4 : 5);
    if (typeof v === "number" && Number.isSafeInteger(v) && !Object.is(v, -0)) return spend(String(v).length);
    if (typeof v !== "object" || active.has(v)) throw new ApplicationPackageError("invalid");
    const prototype = Object.getPrototypeOf(v);
    if (!Array.isArray(v) && prototype !== Object.prototype && prototype !== null || Object.getOwnPropertySymbols(v).length) throw new ApplicationPackageError("invalid");
    active.add(v); spend(2);
    if (Array.isArray(v) && v.length > 100_000 - nodes) throw new ApplicationPackageError("limit");
    const keys = Object.keys(v);
    if (keys.length > 100_000 - nodes) throw new ApplicationPackageError("limit");
    if (Array.isArray(v) && (keys.length !== v.length || keys.some((key, i) => key !== String(i)))) throw new ApplicationPackageError("invalid");
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]!, descriptor = Object.getOwnPropertyDescriptor(v, key);
      if (!descriptor || !("value" in descriptor)) throw new ApplicationPackageError("invalid");
      if (i) spend(1);
      if (!Array.isArray(v)) { text(key); spend(1); }
      visit(descriptor.value, depth + 1);
    }
    active.delete(v);
  };
  visit(value, 0);
  const result = canonicalize(value);
  if (utf8(result).length !== bytes) throw new ApplicationPackageError("invalid");
  return result;
}
