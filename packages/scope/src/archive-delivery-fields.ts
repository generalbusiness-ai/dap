/** Delivery detached-text references, using the native bound/text selectors.
 * The owning frame supplies the actual verified source fact and its pin.
 * This returns metadata only and supplies no privacy/export admission. */
import type { Advisory, Bounds, Digest, FactRef, Request, ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize, isFactRef } from "@generalbusiness/dap-bytes";
import { bound, isDetachedTextField, textDependency, textsNamed, type PlannedRetainedDependency, type ValidDefinition } from "@generalbusiness/dap-derive";
import type { ArchiveBudget } from "./archive-budget.ts";
import { ARCHIVE_DIGEST_FIELD_BATCH, checkArchiveFieldSource, readArchiveDigestFields } from "./archive-digest-fields.ts";
import { stopArchivePrefix as stop, type ArchivePosition } from "./archive-prefix.ts";
import type { Sql } from "./sqlite.ts";
import { reserveArchiveNames } from "./archive-schema-cost.ts";

type Handler = ValidDefinition["declared"]["receives"][string];
/** Reusable schema state holds no SQL port. Each call uses the owning
 * synchronous native frame's supplied port and the same original budget. */
export class ArchiveDeliveryFields {
  readonly needsUnder: boolean;
  readonly #names: string;
  readonly #count: number;
  readonly #schemas = new Map<Handler, readonly string[]>();
  constructor(readonly definition: ValidDefinition, readonly budget: ArchiveBudget, bounds: Pick<Bounds, "definitionBytes">) {
    budget.spend({ metadata: bounds.definitionBytes, inputWork: bounds.definitionBytes * 16 });
    const handlers = Object.values(definition.declared.receives);
    this.needsUnder = handlers.some(handler => handler.from.under !== undefined);
    const messages = handlers.map(handler => handler.message);
    reserveArchiveNames(messages, budget);
    const names = [...new Set(messages)];
    this.#names = canonicalize(names); this.#count = handlers.length;
    for (const handler of handlers) {
      const fields = Object.keys(handler.fields);
      reserveArchiveNames(fields, budget);
      this.#schemas.set(handler, fields.filter(name => isDetachedTextField(handler.fields[name])));
    }
  }
  project(sql: Pick<Sql, "exec">, at: ScopeRef, position: ArchivePosition, from: FactRef, under?: string): readonly PlannedRetainedDependency[] {
    checkArchiveFieldSource(position);
    this.budget.spend({ inputWork: this.#count * 512 + 512 });
    if (!isFactRef(from)) return stop("mismatch");
    // Only fixed class/type tokens, a name from the trusted declaration,
    // and structural flags cross SQL. An opaque relationship item's fields
    // never do. These flags preserve updateOf's exact self/fact shape.
    const rows = this.budget.native(sql, () => ({ metadata: 512,
      inputWork: position.bytes * (128 + this.#count * 16) + this.#names.length * 24,
    })).exec(`SELECT entry.seq AS seq,
      CASE WHEN json_extract(entry.bytes, '$.input.message.class') = 'request' THEN 'request'
        WHEN json_extract(entry.bytes, '$.input.message.class') = 'advisory' THEN 'advisory' ELSE NULL END AS class,
      CASE WHEN json_extract(entry.bytes, '$.input.message.type') = 'tell' THEN 'tell'
        WHEN json_extract(entry.bytes, '$.input.message.type') = 'relate' THEN 'relate'
        WHEN json_extract(entry.bytes, '$.input.message.type') = 'index' THEN 'index'
        WHEN json_extract(entry.bytes, '$.input.message.type') = 'notify' THEN 'notify' ELSE NULL END AS type,
      known.value AS name,
      json_type(entry.bytes, '$.input.message.body.fields') = 'object' AS fields,
      json_type(entry.bytes, '$.input.message.body.detail') = 'object' AS detail,
      json_type(entry.bytes, '$.input.message.body.state') = 'text' AS state,
      CASE WHEN json_type(entry.bytes, '$.input.message.body.item') = 'object' AND (
        ((SELECT count(*) FROM json_each(entry.bytes, '$.input.message.body.item')) = 1
          AND json_type(entry.bytes, '$.input.message.body.item.self') = 'true') OR
        ((SELECT count(*) FROM json_each(entry.bytes, '$.input.message.body.item')) = 3
          AND json_type(entry.bytes, '$.input.message.body.item.at') = 'object'
          AND (SELECT count(*) FROM json_each(entry.bytes, '$.input.message.body.item.at')) = 3
          AND json_extract(entry.bytes, '$.input.message.body.item.at.scope') = json_extract(entry.bytes, '$.input.from.at.scope')
          AND json_extract(entry.bytes, '$.input.message.body.item.at.inc') = json_extract(entry.bytes, '$.input.from.at.inc')
          AND json_extract(entry.bytes, '$.input.message.body.item.at.kind') = json_extract(entry.bytes, '$.input.from.at.kind')
          AND json_type(entry.bytes, '$.input.message.body.item.seq') = 'integer'
          AND json_extract(entry.bytes, '$.input.message.body.item.seq') BETWEEN 0 AND 9007199254740991
          AND json_type(entry.bytes, '$.input.message.body.item.hash') = 'text'
          AND octet_length(json_extract(entry.bytes, '$.input.message.body.item.hash')) = 71
          AND substr(json_extract(entry.bytes, '$.input.message.body.item.hash'), 1, 7) = 'sha256:'
          AND substr(json_extract(entry.bytes, '$.input.message.body.item.hash'), 8) NOT GLOB '*[^0-9a-f]*')
      ) THEN 1 ELSE 0 END AS item
      FROM entry LEFT JOIN json_each(?) AS known ON known.type = 'text' AND known.value =
        CASE WHEN json_extract(entry.bytes, '$.input.message.class') = 'advisory'
            AND json_type(entry.bytes, '$.input.message.type') = 'text' THEN json_extract(entry.bytes, '$.input.message.type')
          WHEN json_extract(entry.bytes, '$.input.message.type') = 'tell'
            AND json_type(entry.bytes, '$.input.message.body.message') = 'text' THEN json_extract(entry.bytes, '$.input.message.body.message')
          WHEN json_extract(entry.bytes, '$.input.message.type') = 'relate'
            AND json_type(entry.bytes, '$.input.message.body.name') = 'text' THEN json_extract(entry.bytes, '$.input.message.body.name') ELSE NULL END
      WHERE entry.seq = ? AND entry.hash = ? AND entry.size = ? AND typeof(entry.bytes) = 'text' AND octet_length(entry.bytes) = ?
        AND json_extract(entry.bytes, '$.input.type') = 'delivery'
        AND json_extract(entry.bytes, '$.input.from.at.scope') = ? AND json_extract(entry.bytes, '$.input.from.at.inc') = ?
        AND json_extract(entry.bytes, '$.input.from.at.kind') = ? AND json_extract(entry.bytes, '$.input.from.seq') = ?
        AND json_extract(entry.bytes, '$.input.from.hash') = ? LIMIT 2`,
      this.#names, position.seq, position.hash, position.bytes, position.bytes, from.at.scope, from.at.inc, from.at.kind, from.seq, from.hash).toArray();
    if (rows.length !== 1 || rows[0]?.["seq"] !== position.seq) return stop("mismatch");
    const row = rows[0], name = row["name"], cls = row["class"], type = row["type"];
    if (name === null || cls === null || type === null) return [];
    if (typeof name !== "string") return stop("mismatch");
    // This is a selector-only shape, not an invented message or journal.
    // bound reads state only for its type and item only for shape/owner;
    // the flags above preserve those predicates without returning contents.
    let shape: Request | Advisory;
    if (cls === "request" && type === "tell") shape = { class: "request", type, body: { message: name, fields: row["fields"] === 1 ? {} : null } };
    else if (cls === "request" && type === "relate") shape = { class: "request", type, body: { name, state: row["state"] === 1 ? "" : null, item: row["item"] === 1 ? from : null, detail: row["detail"] === 1 ? {} : null } };
    else if (cls === "advisory" && (type === "index" || type === "notify")) shape = { class: "advisory", type, body: { fields: row["fields"] === 1 ? {} : null } };
    else return [];
    const matched = bound(this.definition, shape, from, under);
    if (!matched?.handler || !matched.fields) return [];
    if (matched.handler.from.under !== undefined && under === undefined) return stop("unsupported-foreign-copy");
    const names = this.#schemas.get(matched.handler); if (!names) return stop("mismatch");
    this.budget.spend({ metadata: names.length * 256, inputWork: names.length * 512 });
    reserveArchiveNames(names, this.budget, 40);
    const base = type === "relate" ? "$.input.message.body.detail" : "$.input.message.body.fields", cells: (Digest | null)[] = [];
    for (let offset = 0; offset < names.length; offset += ARCHIVE_DIGEST_FIELD_BATCH) {
      cells.push(...readArchiveDigestFields(sql, position, names.slice(offset, offset + ARCHIVE_DIGEST_FIELD_BATCH).map(field => `${base}.${JSON.stringify(field)}`), this.budget));
    }
    const given = Object.fromEntries(names.flatMap((field, index) => cells[index] === null ? [] : [[field, cells[index]!]]));
    const origin = { at: { at: { ...at }, seq: position.seq, hash: position.hash }, input: "delivery" as const };
    return textsNamed(matched.handler.fields, given).map(digest => ({ dependency: textDependency(origin, digest), max: 0 }));
  }
}
