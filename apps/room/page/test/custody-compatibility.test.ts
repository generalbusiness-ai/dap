import { expect, test } from "vitest";
import type { CreatorBinding } from "../src/connection-custody.ts";
import { originalConnection } from "../src/connection-custody.ts";
import { originalJoin } from "../src/join-custody.ts";
import { originalStart } from "../src/start-custody.ts";
import legacy from "./fixtures/custody-before-k3.json";

// Invariant: the shared custody reader opens the exact keys and bytes written
// by all three old adapters and returns their old public views without a write.
// Captured at dba3e762 using actual Page writers with the existing SCRIPTED
// CLI/service, locks and storage. All retained keys are fictional test keys.
test("old connection, join and Start custody survives the shared reader without rewriting private bytes", () => {
  for (const record of legacy.records) {
    let writes = 0;
    const values = new Map([[record.key, record.raw]]);
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: () => { writes++; } };
    const actual = record.kind === "connection"
      ? originalConnection(record.origin, storage, record.expected as CreatorBinding)
      : record.kind === "join" ? originalJoin(record.origin, storage) : originalStart(record.origin, storage);
    expect(actual, record.kind).toEqual(record.publicState);
    expect(writes, record.kind).toBe(0);
    // Compare rather than print the retained seed or signed request on failure.
    expect(values.get(record.key) === record.raw, record.kind).toBe(true);
  }
});
