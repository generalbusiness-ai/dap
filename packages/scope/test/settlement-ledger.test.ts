/** Judged histories on made-up marker/Works definitions. SQLite transactions,
 * Durable Object eviction and journal replay are real. Authority, peer facts
 * and platform callbacks remain the derive fixtures' stand-ins. This bypasses
 * native admission and dispatch; the plain owner checks fixture admission. */
import { evictDurableObject, runInDurableObject } from "cloudflare:test";
import { expect, test } from "vitest";
import type { Entry } from "@generalbusiness/dap-contract";
import { canonicalize, entryHash } from "@generalbusiness/dap-bytes";
import { applyEntry, MemoryState } from "@generalbusiness/dap-derive";
import { SettlementFixture, settlementProjection } from "../../derive/test/support/settlement-ledger-fixture.ts";
import { storageHistories } from "../../derive/test/support/settlement-ledger-histories.ts";
import { SettlementLedger } from "../../derive/test/support/settlement-ledger-model.ts";
import { SqliteStore } from "../src/index.ts";
import { objectOf } from "./fixtures-native.ts";
import { withSequence, storedOwn } from "../src/testing.ts";

for (const [index, history] of storageHistories.entries()) test(`SQLite eviction and replay: ${history.name}`, async () => {
  const actual = new SettlementFixture(history.family, history.capacity, 500 + index);
  const model = new SettlementLedger(history.family, history.capacity);
  const object = () => objectOf(actual.scope.at.scope);
  let persisted = 0;
  const compare = () => runInDurableObject(object(), (_instance, state) => {
    const store = new SqliteStore({ exec: (query, ...bindings) => state.storage.sql.exec(query, ...bindings),
      transaction: work => state.storage.transactionSync(work) });
    for (const { entry, hash } of actual.scope.entries.slice(persisted)) store.transaction(() => {
      const bytes = canonicalize(entry);
      store.append(entry, hash, bytes, new TextEncoder().encode(bytes).length);
      applyEntry(store, actual.definition, entry, hash, actual.scope.foldOptions);
    });
    persisted = actual.scope.entries.length;
    const rows = store.storedFrom(0, 32), entries = rows.map(row => JSON.parse(row.bytes) as Entry);
    expect(entries).toEqual(actual.scope.entries.map(({ entry }) => entry));
    const last = entries.at(-1)!, origin = (seq: number) => entries[seq]!;
    expect(settlementProjection(store, actual.definition, last, origin, history.family)).toEqual(model.snapshot());
    // Replay reads the persisted journal, not the fixture's MemoryState.
    // Its expected result still comes only from the literal ledger.
    const replay = new MemoryState();
    for (const [offset, entry] of entries.entries()) {
      expect(entryHash(entry)).toBe(rows[offset]!.hash);
      applyEntry(replay, actual.definition, entry, rows[offset]!.hash, {
        ...actual.scope.foldOptions, own: withSequence((seq: number) => rows[seq] ? { entry: entries[seq]!, hash: rows[seq]!.hash } : null, storedOwn(store).sequence()),
      });
    }
    expect(settlementProjection(replay, actual.definition, last, origin, history.family)).toEqual(model.snapshot());
  });
  await compare();
  for (const [step, command] of history.commands.entries()) {
    expect(actual.run(command), `${step}: ${JSON.stringify(command)}`).toBe(model.apply(command));
    await compare();
    // Kill the actual object life once a meaningful prefix has persisted,
    // then continue the same history on a fresh life and the same SQL rows.
    if (step === Math.floor(history.commands.length / 2)) {
      await evictDurableObject(object());
      await compare();
    }
  }
  await evictDurableObject(object());
  await compare();
});
