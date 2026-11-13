/** Parses one archived retained file against its key. No source pin,
 * consumer binding or permission is checked here. */
import { DOMAINS } from "@generalbusiness/dap-contract";
import { canonicalize, domainRetainedJSON, entryHash, isEntry, parseStrict, rawRetainedJSON } from "@generalbusiness/dap-bytes";
import type { ArchiveRetainedName } from "./journal-path.ts";

/** The parsed value of canonical bytes that the key names, else undefined.
 * An `entry` or `rule` key is the digest of the bytes. A `birth` key is the
 * genesis entry hash of a sequence, and its bytes are that sequence's
 * canonical first entry (ruling ae48dd39). Other kinds hash in a domain. */
export function journalRetainedJSON(key: ArchiveRetainedName, bytes: string, max: number): unknown | undefined {
  if (key.kind === "birth") {
    try {
      const entry: unknown = parseStrict(bytes);
      if (!isEntry(entry) || canonicalize(entry) !== bytes || entry.seq !== 0 || entry.prev !== null
        || entry.input.type !== "genesis" || entryHash(entry) !== key.digest) return undefined;
      return entry;
    } catch { return undefined; }
  }
  const value = key.kind === "entry" || key.kind === "rule" ? rawRetainedJSON(key.digest, bytes)
    : domainRetainedJSON(key.kind === "value" ? key.domain : key.kind === "definition" ? DOMAINS.definition : DOMAINS.snapshot, key.digest, bytes, { canonical: true, max });
  return value === undefined || canonicalize(value) !== bytes ? undefined : value;
}
