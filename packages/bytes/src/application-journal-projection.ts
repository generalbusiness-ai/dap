/** Declared fields from a complete recent journal window. The native owner
 * owes history authority and bounded storage reads; this checks their bytes. */
import type { DeclaredDefinition, Digest, FieldValue, Head, ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize, entryHash, isDigest, isEntry, isHead, isRecord, parseStrict, utf8 } from "./index.ts";
import { applicationJson } from "./application-json.ts";
import { APPLICATION_PROJECTION_LIMITS as B, ApplicationProjectionError, type ApplicationJournalProjectionSource, type ApplicationProjectionRow } from "./application-projection-types.ts";
export interface ApplicationJournalRead {
  readonly scope: ScopeRef;
  readonly at: Head;
  readonly entries: readonly { seq: number; hash: Digest; bytes: string }[];
}
const fail = (reason: ApplicationProjectionError["reason"] = "invalid"): never => { throw new ApplicationProjectionError(reason); };
/** Internal phase of the parent projector, which owns/schema-binds the
 * declaration first. A seq is never a signable item revision; explicit
 * fact/time marks keep these rows distinct from item data. */
export function projectApplicationJournalRead(source: ApplicationJournalProjectionSource, definition: DeclaredDefinition, scope: ScopeRef, reply: unknown): { at: Head; rows: ApplicationProjectionRow[] } {
  const owned: unknown = parseStrict(applicationJson(reply, 2 * B.resultBytes + B.metadataBytes));
  if (!isRecord(owned) || Object.keys(owned).sort().join() !== "at,entries,scope" || canonicalize(owned["scope"]) !== canonicalize(scope)
    || !isHead(owned["at"]) || !Array.isArray(owned["entries"])) return fail();
  const at = owned["at"], from = Math.max(0, at.seq - source.window + 1), entries = owned["entries"];
  if (entries.length !== at.seq - from + 1) return fail("incomplete");
  let bytes = 0, previous: Digest | null = null;
  const selected: ApplicationProjectionRow[] = [];
  for (let i = 0; i < entries.length; i++) {
    const row: unknown = entries[i];
    if (!isRecord(row) || Object.keys(row).sort().join() !== "bytes,hash,seq" || row["seq"] !== from + i || !isDigest(row["hash"])
      || typeof row["bytes"] !== "string" || row["bytes"].length > B.resultBytes) return fail();
    bytes += utf8(row["bytes"]).length; if (bytes > B.resultBytes) return fail("limit");
    const entry: unknown = parseStrict(row["bytes"]);
    if (!isEntry(entry) || entry.seq !== row["seq"] || canonicalize(entry.at) !== canonicalize(scope) || canonicalize(entry) !== row["bytes"]
      || entryHash(entry) !== row["hash"] || (i > 0 ? entry.prev !== previous : from === 0 && entry.prev !== null)) return fail();
    previous = row["hash"];
    if (entry.input.type !== "act" || !source.acts.includes(entry.input.signed.intent.kind)) continue;
    const { intent } = entry.input.signed, act = definition.acts[intent.kind];
    if (!act || canonicalize(intent.to) !== canonicalize(scope)) return fail("binding");
    const fields: Record<string, FieldValue | null> = {};
    for (const [alias, field] of Object.entries(source.fields)) {
      if (field.from.kind === "signer") {
        const grants = entry.input.authority.filter(grant => grant.key === intent.actor);
        if (grants.length > 1) return fail();
        fields[alias] = grants[0]?.subject ?? null;
      } else {
        const name = field.from.name, slot = Object.hasOwn(act.fields, name) ? act.fields[name] : undefined;
        if (!slot) return fail("binding");
        const value = Object.hasOwn(intent.fields, name) ? intent.fields[name] : slot.default;
        if (value === undefined || value === null) { if (!field.nullable) return fail(); fields[alias] = null; }
        else fields[alias] = value;
      }
    }
    selected.push({ id: entry.seq, type: intent.kind, state: "sealed", revision: entry.seq, fields,
      entry: { at: scope, seq: entry.seq, hash: row["hash"] }, time: entry.time });
  }
  if (previous !== at.hash) return fail("stale");
  let rows = selected;
  if (source.read === "latest-entry") {
    if (!selected.length) return fail("incomplete");
    rows = [selected.at(-1)!];
  } else if (source.latestBy !== null) {
    const latest = new Map<string, ApplicationProjectionRow>();
    for (const row of selected) {
      const key = row.fields[source.latestBy];
      if (key === null || key === undefined) return fail("incomplete");
      latest.set(canonicalize(key), row);
    }
    rows = [...latest.values()].sort((a, b) => a.id - b.id);
  }
  if (rows.length > source.limit) return fail("incomplete");
  return { at, rows };
}
