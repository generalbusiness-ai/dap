/** Bounded origin-private records. A kind owns its format and public view;
 * this adapter owns validation before replacement and exact storage readback. */
import { canonicalize, isRecord, utf8 } from "@generalbusiness/dap-bytes";

export interface CustodyStorage { getItem(key: string): string | null; setItem(key: string, value: string): void }
interface Current { current?: () => boolean }
interface CustodyKind<Row, Public> {
  kind: "connection" | "join" | "start";
  prefix: string;
  most: number;
  sameOrigin?: true;
  unavailable: () => Error;
  full?: () => Error;
  bindingOf: (row: Row) => string;
  decode: (raw: string, binding: string) => Row;
  publicOf: (row: Row, storage: CustodyStorage) => Public;
  /** Connection journals return an owned clone; key records re-read storage. */
  readBack?: "clone";
}

export const closedCustodyRecord = (value: unknown, required: string[], optional: string[] = []): value is Record<string, unknown> =>
  isRecord(value) && required.every(key => Object.hasOwn(value, key)) && Object.keys(value).every(key => required.includes(key) || optional.includes(key));

export function custodyKind<Row, Public>(kind: CustodyKind<Row, Public>) {
  const keyOf = (binding: string) => `${kind.prefix}:${binding}`;
  const current = (options: Current): void => { if (options.current?.() === false) throw kind.unavailable(); };
  const originOf = (origin: string): void => {
    const url = new URL(origin);
    const browser = globalThis as { location?: { origin: string } };
    if (url.origin !== origin || !["https:", "http:"].includes(url.protocol) || browser.location && browser.location.origin !== origin) throw kind.unavailable();
  };
  const read = (binding: string, storage: CustodyStorage): Row | null => {
    if (kind.sameOrigin) originOf(binding);
    const raw = storage.getItem(keyOf(binding));
    if (raw === null) return null;
    try {
      if (utf8(raw).length > kind.most) throw kind.unavailable();
      return kind.decode(raw, binding);
    } catch { throw kind.unavailable(); }
  };
  const write = (row: Row, storage: CustodyStorage, options: Current): Row => {
    current(options);
    const binding = kind.bindingOf(row), raw = canonicalize(row);
    if (utf8(raw).length > kind.most) throw (kind.full ?? kind.unavailable)();
    // Validate the whole candidate before replacing an original.
    read(binding, { getItem: () => raw, setItem: () => { throw kind.unavailable(); } });
    storage.setItem(keyOf(binding), raw);
    if (storage.getItem(keyOf(binding)) !== raw) throw kind.unavailable();
    current(options);
    return kind.readBack === "clone" ? structuredClone(row) : read(binding, storage)!;
  };
  const original = (binding: string, storage: CustodyStorage): Public | null => {
    const row = read(binding, storage);
    return row ? kind.publicOf(row, storage) : null;
  };
  return { keyOf, current, originOf, read, write, original };
}
