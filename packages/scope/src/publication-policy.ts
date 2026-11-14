/** Host publication limits; no Native rule or recorded outcome shape changes. */
import { canonicalize, isDigest, isHead, isRecord, isScopeRef, parseStrict, utf8 } from "@generalbusiness/dap-bytes";
import { observedOf, valueDigest, type RecordedRef } from "@generalbusiness/dap-derive";
import { classify, EXTENTS_MOST, isExtents, RULES_PATTERNS, withinPublicationPrefixes, type Extent, type JudgeChanges } from "@generalbusiness/dap-platform";

/** GitHub reads workflows and ownership here; the room protects its agent instructions as rules. */
export const PUBLICATION_RESERVED = [".github", ".github/**", "CODEOWNERS", "docs/CODEOWNERS", ...RULES_PATTERNS] as const;
export type PublicationRefusal = { code: "reserved-publication-path"; path: string; reserved: string }
  | { code: "publication-path-not-declared"; path: string; outside: string };

/** Current authenticated Rules answer and the exact canonical extent value it names. */
export function publicationExtents(raw: unknown, expected: RecordedRef): readonly Extent[] | null {
  try {
    if (!isRecord(raw) || Object.keys(raw).length !== 2 || !Array.isArray(raw["values"]) || raw["values"].length > 8) return null;
    const answer = raw["answer"];
    // The subject states a rules answer. The answer fixes the recorded reference, or binds a pending one.
    if (!isRecord(answer) || answer["subject"] !== "rules" || !isScopeRef(answer["of"]) || !observedOf(answer["of"], expected)
      || !isHead(answer["head"]) || !Number.isSafeInteger(answer["revision"]) || Number(answer["revision"]) < 0
      || !isRecord(answer["content"]) || answer["content"]["asked"] !== "rules" || !isDigest(answer["content"]["extents"])) return null;
    const digest = answer["content"]["extents"];
    const values = raw["values"].filter(value => isRecord(value)
      && ["artroom-rules-extents-1", "artroom-rules-extents-2", "artroom-rules-extents-3"].includes(String(value["domain"]))
      && typeof value["bytes"] === "string" && value["bytes"].length <= 262144 && utf8(value["bytes"]).length <= 262144
      && valueDigest(String(value["domain"]), parseStrict(value["bytes"])) === digest);
    if (values.length !== 1) return null;
    const held = values[0] as { bytes: string };
    const extents: unknown = parseStrict(held.bytes);
    if (canonicalize(extents) !== held.bytes || !Array.isArray(extents) || extents.length < 1 || extents.length > EXTENTS_MOST) return null;
    // Later extent revisions add review fields. Keep their existing byte identity
    // above; classification needs only the original six bounded fields.
    const base = extents.map(extent => isRecord(extent)
      ? Object.fromEntries(["name", "patterns", "approvals", "approver", "checks", "class"].map(key => [key, extent[key]])) : extent);
    return isExtents(base) ? base : null;
  } catch { return null; }
}

/**
 * Reuse the ordinary change classifier, including aliases to protected files.
 * With declared prefixes (ruling 68356c6c, point 5b), every touched path and
 * every link target must also stand inside them; an unresolved link stands
 * outside.
 */
export function publicationRefusal(path: string, changes: JudgeChanges, extents: readonly Extent[], prefixes?: readonly string[]): PublicationRefusal | null {
  const paths = [...new Set([path, ...changes.paths])];
  const fixed: Extent[] = PUBLICATION_RESERVED.map((pattern, index) => ({ name: `host-reserved-${index}`, patterns: [pattern], approvals: 1, approver: "rules.publish", checks: [], class: "authority" }));
  const protectedPaths = classify(fixed, paths, changes.links, changes.unreadable);
  const touched = protectedPaths.touched[0];
  if (touched) return { code: "reserved-publication-path", path, reserved: PUBLICATION_RESERVED[Number(touched.extent.slice("host-reserved-".length))]! };
  if (prefixes) {
    const outside = [...paths, ...changes.links.flatMap(link => [link.path, ...(link.resolves ?? [""])])]
      .find(touchedPath => !withinPublicationPrefixes(touchedPath, prefixes));
    if (outside !== undefined) return { code: "publication-path-not-declared", path, outside };
  }
  const current = classify(extents, paths, changes.links, changes.unreadable);
  const control = current.touched.find(row => extents.some(extent => extent.name === row.extent && (extent.name === "rules" || extent.class === "authority")));
  if (control) return { code: "reserved-publication-path", path, reserved: `rules extent ${control.extent}` };
  return current.refused.length > 0 || current.unreadable !== 0
    ? { code: "reserved-publication-path", path, reserved: "unresolved control-path alias" } : null;
}
