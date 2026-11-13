/**
 * Witness (LOG-1): a caller outside the runtime folds a scope's journal from `ScopeHandle.log` and gets the scope's own state.
 * Real: the scope on Durable Object storage, its journal, its `log` and `summary` reads, the handle's checks and derive's fold.
 * STAND-IN: the test readers port, which lets every reader read whole, as a member session or a register session reads. The reader
 * is a `Session` text, so the handle counts the read as a session's. Which rows a real session or a signed read keeps is the
 * readers' rule (`src/reads.ts`), not this test's.
 */
import { expect, test } from "vitest";
import type { Entry } from "@generalbusiness/dap-contract";
import { MemoryState, applyEntry, stateDigest } from "@generalbusiness/dap-derive";
import { ScopeHandle, bindingTransport, type ServiceBinding } from "@generalbusiness/dap-client";
import { SqliteStore } from "../src/index.ts";
import { create, definition } from "./fixtures-native.ts";
import { archiveSql } from "./support/archive.ts";

test("the whole log pages of a real scope fold to the scope's state digest", async () => {
  // Three entries a page, so the journal of ten entries takes four pages.
  const lane = await create({}, { historyEntries: 3 });
  for (let n = 0; n < 9; n++) expect((await lane.submit(lane.remark(`TEST remark ${n}`))).answer).toBe("accepted");
  const stub = lane.stub as unknown as { summary(reader: unknown): Promise<unknown>; log(reader: unknown, cursor?: string): Promise<unknown> };
  const transport = bindingTransport({ summary: (_scope: string, reader: unknown) => stub.summary(reader), log: (_scope: string, reader: unknown, cursor?: string) => stub.log(reader, cursor) } as unknown as ServiceBinding);
  const handle = new ScopeHandle(transport, lane.name, "Session TEST-whole-reader");

  const memory = new MemoryState(), coverage: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await handle.log(cursor);
    if (!page.ok) return expect.fail(`log refused: ${page.reason}`);
    coverage.push(page.coverage);
    for (const row of page.value.entries) applyEntry(memory, definition, JSON.parse(row.bytes) as Entry, row.hash);
    cursor = page.next;
  } while (cursor !== undefined);

  const scope = await lane.inside(state => stateDigest(new SqliteStore(archiveSql(state)).all()));
  expect([coverage, memory.scope()?.head.seq, stateDigest(memory.all())]).toEqual([["whole", "whole", "whole", "whole"], 9, scope]);
});
