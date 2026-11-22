import { expect, test } from "vitest";
import { Scope, keys } from "@generalbusiness/dap-derive/testing";
import { scopeReplica } from "../src/replica.ts";
import { viewCut } from "../src/view-cut.ts";
import { citing, citingDefinition, Feed, served } from "./replica-support.ts";

// A view cut holds its original rows and Own even after the replica advances.
test("a copied recorded cut does not follow a later journal", async () => {
  const scope = new Scope(citingDefinition), feed = new Feed();
  const replica = scopeReplica(served(scope, citing).handle, { observe: feed.observe });
  try {
    feed.current(scope); await replica.read();
    const cut = viewCut(replica, citingDefinition);
    if (!cut) return expect.fail("the current replica has a cut");
    const at = cut.head.seq, row = structuredClone(cut.state.item(0)), hash = cut.state.fixedHash(at);
    scope.did(keys.rita, "remark", { on: 0, fields: { text: "later" } });
    feed.current(scope); await replica.read();
    expect(cut.state.scope()?.head).toEqual(cut.head);
    expect(cut.state.item(0)).toEqual(row);
    expect(cut.state.fixedHash(at)).toBe(hash);
    expect(cut.state.fixedHash(at + 1)).toBeNull();
    expect(cut.own(at + 1)).toBeNull();
    expect(replica.view.head!.seq).toBeGreaterThan(at);
  } finally { replica.close(); }
});
