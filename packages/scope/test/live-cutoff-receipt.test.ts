/** Native SQLite fixture: these rows stand in for an already sealed send.
 * The turn witness must separately prove that a real timed entry writes it. */
import { expect, test } from "vitest";
import { canonicalize } from "@generalbusiness/dap-bytes";
import { SqliteStore, type Sql } from "../src/sqlite.ts";
import { create } from "./fixtures-native.ts";

test("a cutoff receipt follows one pending request across eviction and leaves with its acknowledgment", async () => {
  const lane = await create();
  const setup = await lane.inside(state => {
    const sql: Sql = { exec: (query, ...args) => state.storage.sql.exec(query, ...args), transaction: work => state.storage.transactionSync(work) };
    const store = new SqliteStore(sql), at = store.scope()!.at, origin = store.stored(0)!;
    const receipt = { timedSeq: 42, timedHash: origin.hash };
    const schema = () => sql.exec("SELECT name FROM sqlite_master WHERE name='live_cutoff_receipt'").toArray();
    expect(store.liveCutoffReceipt(0, 99)).toBeNull();
    expect(schema()).toEqual([]);
    store.transaction(() => store.putLiveCutoffReceipt(0, 99, origin.hash, at, receipt));
    expect(schema()).toEqual([]);
    // The foreign key geometry is a direct storage fixture, not an admitted send.
    sql.exec("INSERT INTO outbox (seq,n,target,class,message,request,next) VALUES (?,?,?,?,?,?,?)", 0, 99, canonicalize(at), "request", "{}", "tell", 0).toArray();
    expect(() => store.transaction(() => {
      store.putLiveCutoffReceipt(0, 99, origin.hash, at, receipt);
      expect(store.liveCutoffReceipt(0, 99)).toEqual(receipt);
      throw new Error("abort receipt");
    })).toThrow("abort receipt");
    expect(store.liveCutoffReceipt(0, 99)).toBeNull();
    expect(schema()).toEqual([]);
    store.transaction(() => store.putLiveCutoffReceipt(0, 99, origin.hash, at, receipt));
    return { at, receipt };
  });
  await lane.restart();
  await lane.inside(state => {
    const sql: Sql = { exec: (query, ...args) => state.storage.sql.exec(query, ...args), transaction: work => state.storage.transactionSync(work) };
    const store = new SqliteStore(sql);
    expect(store.liveCutoffReceipt(0, 99)).toEqual(setup.receipt);
    store.acknowledge(0, 99, [], { at: setup.at, seq: 0, hash: setup.receipt.timedHash });
    expect(store.liveCutoffReceipt(0, 99)).toBeNull();
    expect(sql.exec("SELECT seq FROM live_cutoff_receipt WHERE seq=? AND n=?", 0, 99).toArray()).toEqual([]);
  });
});
