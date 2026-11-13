import { expect, test } from "vitest";
import type { CreatorBinding } from "../src/connection-custody.ts";
import { originalConnection } from "../src/connection-custody.ts";
import { originalJoin } from "../src/join-custody.ts";
import { originalStart } from "../src/start-custody.ts";
import legacy from "./fixtures/custody-before-k3.json";
import { textDigest } from "@generalbusiness/dap-bytes";
import type { KeyId, ScopeId } from "@generalbusiness/dap-contract";

// The fixture binding names its membership by the old ref shape; the current
// binding names the same scope with a made-up genesis digest.
const current = (old: { key: string; operation: string; membership: { scope: string } }): CreatorBinding =>
  ({ key: old.key as KeyId, operation: old.operation, membership: { scope: old.membership.scope as ScopeId, genesis: textDigest("TEST genesis custody") } });

// Invariant: connection, join and Start custody take new storage names. The
// shared reader returns nothing for a row under an old name, writes nothing
// and leaves its bytes in place.
// Captured at dba3e762 using actual Page writers with the existing SCRIPTED
// CLI/service, locks and storage. All retained keys are fictional test keys.
test("old connection, join and Start rows stay in the browser, unread", () => {
  for (const record of legacy.records) {
    let writes = 0;
    const values = new Map([[record.key, record.raw]]);
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: () => { writes++; } };
    const actual = record.kind === "connection"
      ? originalConnection(record.origin, storage, current(record.expected!))
      : record.kind === "join" ? originalJoin(record.origin, storage) : originalStart(record.origin, storage);
    expect(actual, record.kind).toBeNull();
    expect(writes, record.kind).toBe(0);
    // Compare rather than print the retained seed or signed request on failure.
    expect(values.get(record.key) === record.raw, record.kind).toBe(true);
  }
});
