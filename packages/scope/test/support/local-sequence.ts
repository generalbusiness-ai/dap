/** Test setup only. One real stored birth supplies the fixture's local association.
 * This setup read is separate from every measured production-path read. */
import { admitSequenceGenesis, isEntry, parseStrict, scopeIdOf, type CheckedSequence } from "@generalbusiness/dap-bytes";
import type { Store } from "../../src/store.ts";

export function storedSequenceOf(store: Pick<Store, "stored">, entryBytes: number): CheckedSequence {
  const birth = store.stored(0);
  if (!birth) throw new Error("the fixture store has no genesis");
  const entry: unknown = parseStrict(birth.bytes);
  if (!isEntry(entry) || entry.input.type !== "genesis") throw new Error("the fixture store has no genesis entry");
  const sequence = admitSequenceGenesis(birth.bytes, { scope: scopeIdOf(entry.input.seed), genesis: birth.hash }, entryBytes);
  if (!sequence) throw new Error("the fixture store genesis cannot be admitted");
  return sequence;
}
