/** Opaque successor values travel as canonical JSON text. The semantic
 * JSON may contain null; the surrounding FieldValue remains a string. */
import { canonicalize, parseStrict, utf8 } from "@generalbusiness/dap-bytes";

export type EvidenceWireReadV17 = { ok: true; value: unknown } | { ok: false };
const bounded = (text: string, most: number): boolean => Number.isSafeInteger(most) && most >= 0
  && text.length <= most && utf8(text).length <= most;

export function readEvidenceWireV17(value: unknown, most: number): EvidenceWireReadV17 {
  try {
    if (typeof value !== "string" || !bounded(value, most)) return { ok: false };
    const parsed = parseStrict(value);
    return canonicalize(parsed) === value ? { ok: true, value: parsed } : { ok: false };
  } catch { return { ok: false }; }
}

export function evidenceWireV17(value: unknown, most: number): string {
  const text = canonicalize(value);
  if (!bounded(text, most)) throw Error("The evidence value exceeds its text bound");
  return text;
}
