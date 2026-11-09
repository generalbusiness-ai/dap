/** A FIFO of reusable observations with separate record and retained-payload ceilings. */
import { canonicalize, utf8 } from "@generalbusiness/dap-bytes";

/** The retained parts of a further read. `last.observation` shares `observation`. */
interface ObservationPayload {
  observation: unknown;
  n: number;
  last: { entry: unknown; time: unknown } | null;
  values: readonly unknown[];
}

/** Actual canonical UTF-8 payload bytes, including every stored value copy and the subject name. */
export function observationPayloadBytes(name: string, run: string, record: ObservationPayload): number {
  return utf8(canonicalize({
    name,
    observation: record.observation,
    read: { run, n: record.n },
    last: record.last === null ? null : { entry: record.last.entry, time: record.last.time },
    values: record.values,
  })).length;
}

/** Dropping a record here never changes a reference that an input already holds. */
export class ObservationCache<T> {
  readonly #records = new Map<string, { value: T; bytes: number }>();
  readonly #maximumRecords: number;
  readonly #maximumBytes: number;
  readonly #payloadBytes: (name: string, value: T) => number;
  #bytes = 0;

  constructor(maximumRecords: number, maximumBytes: number, payloadBytes: (name: string, value: T) => number) {
    if (!Number.isSafeInteger(maximumRecords) || maximumRecords < 0 || !Number.isSafeInteger(maximumBytes) || maximumBytes < 0) throw new RangeError("Observation cache ceilings must be nonnegative safe integers");
    this.#maximumRecords = maximumRecords;
    this.#maximumBytes = maximumBytes;
    this.#payloadBytes = payloadBytes;
  }

  get(name: string): T | undefined { return this.#records.get(name)?.value; }
  *entries(): IterableIterator<[string, T]> { for (const [name, record] of this.#records) yield [name, record.value]; }
  counts(): { records: number; bytes: number } { return { records: this.#records.size, bytes: this.#bytes }; }

  set(name: string, value: T): void {
    let bytes: number;
    try { bytes = this.#payloadBytes(name, value); }
    catch { this.#drop(name); return; }
    if (!Number.isSafeInteger(bytes) || bytes < 0 || bytes > this.#maximumBytes) { this.#drop(name); return; }
    const prior = this.#records.get(name);
    if (prior) this.#bytes -= prior.bytes;
    // Map.set on an existing name keeps that name's original FIFO place.
    this.#records.set(name, { value, bytes });
    this.#bytes += bytes;
    while (this.#records.size > this.#maximumRecords || this.#bytes > this.#maximumBytes) this.#drop(this.#records.keys().next().value!);
  }

  /** A sealed input may update its record after another answer replaced the same name. */
  refresh(name: string, value: T): void { if (this.get(name) === value) this.set(name, value); }

  #drop(name: string): void {
    const record = this.#records.get(name);
    if (!record) return;
    this.#bytes -= record.bytes;
    this.#records.delete(name);
  }
}
