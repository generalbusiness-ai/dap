/** Genesis detached-text references only. The owner separately binds the
 * exact root/prefix and admits every inline class before reading bodies. */
import type { Bounds, Digest, ScopeRef } from "@generalbusiness/dap-contract";
import { isDetachedTextField, textDependency, textsNamed, type PlannedRetainedDependency, type ValidDefinition } from "@generalbusiness/dap-derive";
import type { ArchiveBudget } from "./archive-budget.ts";
import { ARCHIVE_DIGEST_FIELD_BATCH, checkArchiveFieldSource, readArchiveDigestFields } from "./archive-digest-fields.ts";
import { stopArchivePrefix as stop, type ArchivePosition } from "./archive-prefix.ts";
import type { Sql } from "./sqlite.ts";

export class ArchiveGenesisFields {
  readonly #fields: ValidDefinition["declared"]["acts"][string]["fields"];
  readonly #names: readonly string[];
  constructor(readonly sql: Pick<Sql, "exec">, definition: ValidDefinition, readonly budget: ArchiveBudget, bounds: Pick<Bounds, "definitionBytes">) {
    budget.spend({ metadata: bounds.definitionBytes, inputWork: bounds.definitionBytes * 16 });
    this.#fields = definition.declared.acts[definition.declared.genesis]!.fields;
    const names = Object.keys(this.#fields);
    this.#names = names.filter(name => isDetachedTextField(this.#fields[name]));
    budget.spend({ metadata: this.#names.length * 256, inputWork: names.length * 256 + this.#names.length * 512 });
  }
  project(at: ScopeRef, position: ArchivePosition): readonly PlannedRetainedDependency[] {
    checkArchiveFieldSource(position);
    if (position.seq !== 0) return stop("mismatch");
    // inputTexts gives founding fields precedence; otherwise a source's
    // creation message supplies an object of fields. Return only this
    // fixed route, never the signed intent or creation-message body.
    const rows = this.budget.native(this.sql, () => ({ metadata: 128, inputWork: position.bytes * 16 })).exec(`SELECT entry.seq AS seq,
      CASE WHEN json_type(entry.bytes, '$.input.founding') = 'object' THEN 'founding'
        WHEN json_type(entry.bytes, '$.input.source') = 'object'
          AND json_type(entry.bytes, '$.input.message.body') = 'object'
          AND json_type(entry.bytes, '$.input.message.body.fields') = 'object' THEN 'creation'
        ELSE NULL END AS route
      FROM entry WHERE entry.seq = ? AND entry.hash = ? AND entry.size = ? AND typeof(entry.bytes) = 'text' AND octet_length(entry.bytes) = ?
        AND json_extract(entry.bytes, '$.input.type') = 'genesis' LIMIT 1`,
      position.seq, position.hash, position.bytes, position.bytes).toArray();
    if (rows.length !== 1 || rows[0]?.["seq"] !== position.seq) return stop("mismatch");
    const route = rows[0]["route"];
    if (route === null) return [];
    if (route !== "founding" && route !== "creation") return stop("mismatch");
    const base = route === "founding" ? "$.input.founding.intent.fields" : "$.input.message.body.fields";
    const cells: (Digest | null)[] = [];
    for (let offset = 0; offset < this.#names.length; offset += ARCHIVE_DIGEST_FIELD_BATCH) {
      cells.push(...readArchiveDigestFields(this.sql, position, this.#names.slice(offset, offset + ARCHIVE_DIGEST_FIELD_BATCH).map(name => `${base}.${JSON.stringify(name)}`), this.budget));
    }
    const given = Object.fromEntries(this.#names.flatMap((name, index) => cells[index] === null ? [] : [[name, cells[index]!]]));
    const origin = { at: { at: { ...at }, seq: position.seq, hash: position.hash }, input: "genesis" as const };
    return textsNamed(this.#fields, given).map(digest => ({ dependency: textDependency(origin, digest), max: 0 }));
  }
}
