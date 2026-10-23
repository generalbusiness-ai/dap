/** Act field references only. The owner separately admits the root and
 * whole prefix; this neither reads bodies nor grants export permission. */
import type { Bounds, Digest, FieldValue, ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize } from "@generalbusiness/dap-bytes";
import { actValueDependencies, boundedRetainedDependencies, isDetachedTextField, textDependency, textsNamed, valuePlaces, type PlannedRetainedDependency, type ValidDefinition } from "@generalbusiness/dap-derive";
import type { ArchiveBudget } from "./archive-budget.ts";
import { ARCHIVE_DIGEST_FIELD_BATCH, checkArchiveFieldSource, readArchiveDigestFields } from "./archive-digest-fields.ts";
import { stopArchivePrefix as stop, type ArchivePosition } from "./archive-prefix.ts";
import type { Sql } from "./sqlite.ts";
import { reserveArchiveNames } from "./archive-schema-cost.ts";

type Act = ValidDefinition["declared"]["acts"][string];
interface Schema { readonly act: Act; readonly names: readonly string[]; readonly paths: readonly string[]; readonly fields: number }

/** Reusable schema state holds no SQL port. Each call uses the owning
 * synchronous native frame's supplied port and the same original budget. */
export class ArchiveActFields {
  readonly #schemas = new Map<string, Schema>();
  readonly #kinds: string;
  readonly #kindCount: number;
  constructor(readonly definition: ValidDefinition,
    readonly budget: ArchiveBudget, readonly bounds: Pick<Bounds, "definitionBytes">) {
    // The owning admission supplies validated finite definition metadata.
    // Reserve before enumerating it or allocating the reusable schema.
    budget.spend({ metadata: bounds.definitionBytes, inputWork: bounds.definitionBytes * 16 });
    const kinds = Object.keys(definition.declared.acts);
    reserveArchiveNames(kinds, budget);
    this.#kindCount = kinds.length; this.#kinds = canonicalize(kinds);
    for (const kind of kinds) {
      const act = definition.declared.acts[kind]!, fields = Object.keys(act.fields);
      reserveArchiveNames(fields, budget, 32);
      const names = [...new Set([...fields.filter(name => isDetachedTextField(act.fields[name])), ...valuePlaces(act.fields).map(place => place.field)])];
      this.#schemas.set(kind, { act, fields: fields.length, names,
        paths: names.map(name => `$.input.signed.intent.fields.${JSON.stringify(name)}`) });
    }
  }
  /** A recognized kind is returned from the trusted name table, never as
   * an unbounded inline field. Each request still reads its exact source. */
  project(sql: Pick<Sql, "exec">, at: ScopeRef, position: ArchivePosition): { readonly kind: string | null; readonly dependencies: readonly PlannedRetainedDependency[] } {
    checkArchiveFieldSource(position);
    const rows = this.budget.native(sql, () => ({ metadata: 256,
      inputWork: position.bytes * (16 + this.#kindCount * 2) + this.#kinds.length * 24,
    })).exec(`SELECT entry.seq AS seq, known.value AS kind FROM entry
      LEFT JOIN json_each(?) AS known ON known.type = 'text'
        AND json_type(entry.bytes, '$.input.signed.intent.kind') = 'text'
        AND known.value = json_extract(entry.bytes, '$.input.signed.intent.kind')
      WHERE entry.seq = ? AND entry.hash = ? AND entry.size = ? AND typeof(entry.bytes) = 'text' AND octet_length(entry.bytes) = ?
        AND json_extract(entry.bytes, '$.input.type') = 'act' LIMIT 2`,
      this.#kinds, position.seq, position.hash, position.bytes, position.bytes).toArray();
    if (rows.length !== 1 || rows[0]?.["seq"] !== position.seq) return stop("mismatch");
    const kind = rows[0]["kind"];
    if (kind === null) return { kind: null, dependencies: [] };
    if (typeof kind !== "string") return stop("mismatch");
    const schema = this.#schemas.get(kind);
    if (!schema) return stop("mismatch");
    this.budget.spend({ metadata: schema.names.length * 256, inputWork: schema.fields * 256 + schema.names.length * 512 });
    reserveArchiveNames(schema.names, this.budget);
    const cells: (Digest | null)[] = [];
    for (let offset = 0; offset < schema.paths.length; offset += ARCHIVE_DIGEST_FIELD_BATCH) {
      cells.push(...readArchiveDigestFields(sql, position, schema.paths.slice(offset, offset + ARCHIVE_DIGEST_FIELD_BATCH), this.budget));
    }
    const given: Record<string, FieldValue> = Object.fromEntries(schema.names.flatMap((name, index) => cells[index] === null ? [] : [[name, cells[index]!]]));
    const origin = { at: { at: { ...at }, seq: position.seq, hash: position.hash }, input: "act" as const };
    const dependencies: PlannedRetainedDependency[] = textsNamed(schema.act.fields, given).map(digest => ({ dependency: textDependency(origin, digest), max: 0 }));
    for (const { dependency, place } of actValueDependencies(this.definition, origin, kind, given)) dependencies.push({ dependency, max: place.max });
    return { kind, dependencies: boundedRetainedDependencies(dependencies, this.bounds) };
  }
}
