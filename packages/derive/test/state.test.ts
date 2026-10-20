import { expect, test } from "vitest";
import { MemoryState, type Item, type OwnRequest } from "../src/index.ts";
import { otherLane } from "./fixtures-entry.ts";

test("logical counts keep final item and record keys, replace each key once, and keep a request pending through delivery-unavailable until its recorded settlement", () => {
  // Direct in-memory writer boundary; not native storage, a signed entry or transport evidence.
  const state = new MemoryState();
  const item: Item = { id: 1, type: "note", state: "draft", revision: 1, opened: null, parties: {}, refs: {}, values: {}, attributed: [] };
  state.putItem(item);
  state.putItem({ ...item, state: "kept", revision: 2 });
  const record = { capability: "hold@1" as const, kind: "lease", key: ["repo"], state: "live", values: {}, seq: 1 };
  state.putRecord(record);
  state.putRecord({ ...record, state: "ended", seq: 2 });
  const relation = { owner: otherLane, name: "peer", item: 1, state: "live", revision: 1 };
  state.putRelation(relation);
  state.putRelation({ ...relation, state: "ended", revision: 2 });
  const request: OwnRequest = { seq: 1, n: 0, hash: "sha256:request", type: "tell", to: otherLane, result: null, diagnosis: null };
  state.putRequest(request);
  state.putRequest(request);
  expect(state.keyCounts()).toEqual({ items: 1, records: 2, requests: 1 });
  state.putRequest({ ...request, diagnosis: { seq: 2, finding: "delivery-unavailable" } });
  expect(state.keyCounts().requests).toBe(1);
  state.putRequest({ ...request, diagnosis: { seq: 3, finding: "undelivered" } });
  expect(state.keyCounts()).toEqual({ items: 1, records: 2, requests: 0 });
  state.putRequest({ ...request, result: { seq: 4, clause: "applied" } });
  expect(state.keyCounts().requests).toBe(0);
  expect(state.all().requests).toHaveLength(1);
  const rebuilt = new MemoryState(), snapshot = state.all();
  for (const row of snapshot.items) rebuilt.putItem(row);
  for (const row of snapshot.relations) rebuilt.putRelation(row);
  for (const row of snapshot.records ?? []) rebuilt.putRecord(row);
  for (const row of snapshot.requests) rebuilt.putRequest(row);
  expect(rebuilt.keyCounts()).toEqual(state.keyCounts());
});

test("a page is read from the index by type, state and ID: it reads no item it does not return, and its cursor holds while items change state", () => {
  const state = new MemoryState();
  let read = 0;
  /** A note whose state counts each time it is read. */
  const note = (id: number, held: string): Item =>
    Object.defineProperty({ id, type: "note", state: held, revision: 1, opened: null, parties: {}, refs: {}, values: {}, attributed: [] }, "state", { enumerable: true, get: () => { read++; return held; } });
  const ids = (states: string[], after: number | null, limit: number) => { const page = state.page("note", states, after, limit); return [page.items.map((i) => i.id), page.more]; };

  // Forty notes. All but 7 and 30 are then kept, highest ID first, so the final state's index is not filled in ID order.
  for (let id = 1; id <= 40; id++) state.putItem(note(id, "draft"));
  for (let id = 40; id >= 1; id--) if (id !== 7 && id !== 30) state.putItem(note(id, "kept"));

  // The two live notes are found without reading any of the 38 retained final ones.
  read = 0;
  expect(ids(["draft"], null, 10)).toEqual([[7, 30], false]);
  expect(read).toBeLessThanOrEqual(2);

  // Pages over both states are in ID order. The cursor is the last ID read; note 7 is kept between two pages and is not lost.
  expect(ids(["kept", "draft"], null, 3)).toEqual([[1, 2, 3], true]);
  state.putItem(note(7, "kept"));
  expect(ids(["kept", "draft"], 3, 4)).toEqual([[4, 5, 6, 7], true]);
  expect(ids(["draft"], null, 10)).toEqual([[30], false]);
  // A page that ends exactly at the last item says that nothing follows.
  expect(ids(["kept", "draft"], 37, 3)).toEqual([[38, 39, 40], false]);
});
