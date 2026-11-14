/** Device-command records keep counts without claiming an unsealed entry value. */
import { DEVICE_COMMAND, type Effect, type FieldValue } from "@generalbusiness/dap-contract";
import { canonicalize } from "@generalbusiness/dap-bytes";
import { byteOrder, type RecordState, type StateView } from "@generalbusiness/dap-derive";
import type { Source } from "./act-types.ts";

export interface RecordRef { readonly effect: number; readonly path: readonly (string | number)[] }
interface PendingRecord { readonly source: Source; readonly paths: readonly (readonly (string | number)[])[] }

function recordKey(capability: string, kind: string, key: readonly FieldValue[]): string {
  return canonicalize([capability, kind, key]);
}

/** The body marks exact existing positions. This never searches for an equal number. */
function replaceMarked<T extends object>(value: T, paths: readonly (readonly (string | number)[])[], replacement: unknown): T {
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

  /** Raw rows stay private. Callers receive guards on the exact marked positions. */
  reader(missing: (source: Source) => never): Pick<StateView, "record" | "records" | "recordCount"> {
    const guarded = (row: RecordState): RecordState => {
      const marked = this.#pending.get(recordKey(row.capability, row.kind, row.key));
      if (!marked) return row;
      const paths = new Set(marked.paths.map(path => canonicalize(path.map(String))));
      const wrap = <T extends object>(value: T, path: readonly string[]): T => new Proxy(value, {
        get: (target, key, receiver) => {
          const nextPath = [...path, String(key)];
          if (paths.has(canonicalize(nextPath))) return missing(marked.source);
          const next: unknown = Reflect.get(target, key, receiver);
          return typeof next === "object" && next !== null ? wrap(next, nextPath) : next;
        },
      });
      return wrap(row, []);
    };
    const selected = (capability: RecordState["capability"], kind: string): RecordState[] =>
      [...this.#rows.values()].filter(row => row.capability === capability && row.kind === kind);
    return {
      record: (capability, kind, key) => {
        const row = this.#rows.get(recordKey(capability, kind, key));
        return row ? guarded(row) : null;
      },
      records: (capability, kind, where = {}) => selected(capability, kind)
        .sort((a, b) => byteOrder(canonicalize(a.key), canonicalize(b.key))).map(guarded).filter(row => (!where.states || where.states.includes(row.state))
          && (where.member === undefined || (Object.hasOwn(row.values, where.member)
            && canonicalize(row.values[where.member]) === canonicalize(where.value)))),
      // Counting by kind and state never reads a marked key or value.
      recordCount: (capability, kind, state) => selected(capability, kind).filter(row => state === undefined || row.state === state).length,
    };
  }
}
