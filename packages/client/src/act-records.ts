/** Device-command records keep counts without claiming an unsealed entry value. */
import { DEVICE_COMMAND, type Effect, type FieldValue } from "@generalbusiness/dap-contract";
import { canonicalize } from "@generalbusiness/dap-bytes";
import { byteOrder, type RecordState, type StateView, type StateWriter } from "@generalbusiness/dap-derive";
import type { Source } from "./act-types.ts";
import { guardObject } from "./act-object.ts";

export interface RecordRef { readonly effect: number; readonly path: readonly (string | number)[] }
interface PendingRecord { readonly source: Source; readonly paths: readonly (readonly (string | number)[])[] }

function recordKey(capability: string, kind: string, key: readonly FieldValue[]): string {
  return canonicalize([capability, kind, key]);
}

/** The body marks exact existing positions. This never searches for an equal number. */
export function replaceMarked<T extends object>(value: T, paths: readonly (readonly (string | number)[])[], replacement: unknown): T {
  const copy = structuredClone(value);
  for (const path of paths) {
    let parent: object = copy;
    for (const key of path.slice(0, -1)) {
      if (!Object.hasOwn(parent, key)) throw new TypeError("a record reference names no own position");
      const next: unknown = Reflect.get(parent, key);
      if (typeof next !== "object" || next === null) throw new TypeError("a record reference crosses no record");
      parent = next;
    }
    const key = path.at(-1);
    if (key === undefined || !Object.hasOwn(parent, key)) throw new TypeError("a record reference names no own position");
    Reflect.set(parent, key, replacement);
  }
  return copy;
}

/** Immutable per-step maps; marked values throw only when a judgment reads them. */
export class ActRecords {
  readonly #rows: ReadonlyMap<string, RecordState>;
  readonly #pending: ReadonlyMap<string, PendingRecord>;
  constructor(rows: readonly RecordState[], pending: ReadonlyMap<string, PendingRecord> = new Map()) {
    this.#rows = new Map(rows.map(row => [recordKey(row.capability, row.kind, row.key), row]));
    this.#pending = pending;
  }

  project(effects: readonly Effect[], refs: readonly RecordRef[], source: Source, alias: number): {
    records: ActRecords; effects: readonly Effect[];
  } {
    const rows = new Map(this.#rows);
    const pending = new Map(this.#pending);
    const exposed = effects.map((effect, index): Effect => {
      if (effect.effect !== "record") return effect;
      const paths = refs.filter(ref => ref.effect === index).map(ref => ref.path);
      if (paths.length > 0 && effect.capability !== DEVICE_COMMAND) throw new TypeError("an unsupported capability marked a commit-entry position");
      const privateEffect = replaceMarked(effect, paths, alias);
      const row: RecordState = { capability: privateEffect.capability, kind: privateEffect.kind,
        key: privateEffect.key, state: privateEffect.state, values: privateEffect.values, seq: alias };
      const key = recordKey(row.capability, row.kind, row.key);
      rows.set(key, row);
      // The sequence metadata also belongs to the source's unsealed entry.
      pending.set(key, { source, paths: [...paths, ["seq"]] });
      return replaceMarked(effect, paths, { entry: { key: source.key, version: source.version } });
    });
    for (const ref of refs) if (effects[ref.effect]?.effect !== "record") throw new TypeError("a record reference names no record effect");
    return { records: new ActRecords([...rows.values()], pending), effects: exposed };
  }

  get size(): number { return this.#rows.size; }

  /** Populate only the caller-owned private projection writer. */
  writeTo(writer: Pick<StateWriter, "putRecord">): void {
    for (const row of this.#rows.values()) writer.putRecord(row);
  }

  /** Raw rows stay private. Callers receive guards on the exact marked positions. */
  reader(missing: (source: Source) => never): Pick<StateView, "record" | "records" | "recordCount"> {
    const guarded = (row: RecordState): RecordState => {
      const marked = this.#pending.get(recordKey(row.capability, row.kind, row.key));
      if (!marked) return row;
      const paths = new Set(marked.paths.map(path => canonicalize(path.map(String))));
      const wrap = <T extends object>(value: T, path: readonly string[]): T => {
        const read = (key: PropertyKey): unknown => {
          const nextPath = [...path, String(key)];
          if (paths.has(canonicalize(nextPath))) return missing(marked.source);
          const next: unknown = Reflect.get(value, key);
          return typeof next === "object" && next !== null ? wrap(next, nextPath) : next;
        };
        return guardObject(value, read);
      };
      return wrap(row, []);
    };
    const selected = (capability: RecordState["capability"], kind: string): RecordState[] =>
      [...this.#rows.values()].filter(row => row.capability === capability && row.kind === kind);
    // An unknown key is a wildcard at its actual marked positions. A
    // different unmarked structure can exclude it without guessing its value.
    const couldMatch = (value: unknown, query: unknown, path: readonly (string | number)[], paths: readonly (readonly (string | number)[])[]): boolean => {
      if (paths.some(mark => canonicalize(mark) === canonicalize(path))) return typeof query === "number";
      if (Array.isArray(value)) return Array.isArray(query) && value.length === query.length
        && value.every((member, index) => couldMatch(member, query[index], [...path, index], paths));
      if (value !== null && typeof value === "object") return query !== null && typeof query === "object" && !Array.isArray(query)
        && Object.keys(value).length === Object.keys(query).length && Object.entries(value).every(([name, member]) =>
          Object.hasOwn(query, name) && couldMatch(member, Reflect.get(query, name), [...path, name], paths));
      return canonicalize(value) === canonicalize(query);
    };
    return {
      record: (capability, kind, key) => {
        for (const row of selected(capability, kind)) {
          const pending = this.#pending.get(recordKey(row.capability, row.kind, row.key));
          const paths = pending?.paths.filter(path => path[0] === "key") ?? [];
          if (pending && paths.length && couldMatch(row.key, key, ["key"], paths)) missing(pending.source);
        }
        const row = this.#rows.get(recordKey(capability, kind, key));
        return row ? guarded(row) : null;
      },
      records: (capability, kind, where = {}) => {
        const rows = selected(capability, kind).filter(row => (!where.states || where.states.includes(row.state))
          && (where.member === undefined || (Object.hasOwn(row.values, where.member)
            && canonicalize(guarded(row).values[where.member]) === canonicalize(where.value))));
        if (rows.length > 1) for (const row of rows) {
          const pending = this.#pending.get(recordKey(row.capability, row.kind, row.key));
          if (pending?.paths.some(path => path[0] === "key")) missing(pending.source);
        }
        return rows.sort((a, b) => byteOrder(canonicalize(a.key), canonicalize(b.key))).map(guarded);
      },
      // Counting by kind and state never reads a marked key or value.
      recordCount: (capability, kind, state) => selected(capability, kind).filter(row => state === undefined || row.state === state).length,
    };
  }
}
