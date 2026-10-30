import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, realpathSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { tsImport } from "tsx/esm/api";

// Load the actual TypeScript owners through the checkout's locked loader;
// the Node gate needs no process-wide loader or replacement implementation.
const load = source => tsImport(source, import.meta.url);
const { canonicalize, intentDigest, newIncarnation, scopeIdOf, textDigest, timeOf } = await load("@generalbusiness/dap-bytes");
const { secretSigner, signedIntent } = await load("@generalbusiness/dap-client");
const { Custody, CustodyError, identityId, meaningOf } = await load(new URL("../../../packages/mcp/src/custody.ts", import.meta.url).href);
const { durableRequestStore, flushPrivateFile } = await load(new URL("../custody.ts", import.meta.url).href);

// Real Custody, fileStore and local files; deliver/settle stand in for native
// HTTP. This proves the pre-send storage boundary, not Native acceptance or
// recovery after power loss. Resolve the temporary root first: macOS may
// spell tmpdir() through /var, which the adapter correctly refuses as a link.
const NOW = Date.parse("2099-01-01T00:00:00Z");
const signer = secretSigner(new Uint8Array(32).fill(7));
const target = {
  scope: scopeIdOf({ v: 1, kind: "inbox", definition: "platform:inbox@1", creator: null, cause: textDigest("TEST custody boundary"), ordinal: 0 }),
  kind: "inbox", inc: newIncarnation(new Uint8Array(16).fill(1)),
};
const identity = key => ({ service: "https://custody.test", membership: null, signer: signer.key, target, key });
const binding = { definition: "platform:inbox", kind: "comment", declaration: null, pinned: "platform:inbox@1" };
async function envelope(key) {
  return { signed: await signedIntent(signer, { to: target, kind: "comment", fields: { body: "TEST retained original" } }, { idempotencyKey: key, now: NOW }), beside: {} };
}

test("a failed dispatch flush blocks delivery and preserves the exact original for read-only settlement", { timeout: 5000 }, async t => {
  const home = realpathSync(mkdtempSync(join(tmpdir(), "artroom-repo-in-ai-custody-")));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const who = identity("flush-failure"), original = await envelope(who.key);
  let builds = 0, deliveries = 0, flushes = 0, failureInjected = false;
  const store = durableRequestStore(home, path => {
    flushes++;
    assert.equal(path, join(home, "records", `${identityId(who)}.json`));
    // The actual engine has already kept the signed bytes and sent phase.
    assert.deepEqual(JSON.parse(readFileSync(path, "utf8")).envelope, original);
    failureInjected = true;
    throw new Error("SCRIPTED flush I/O failure");
  });
  const custody = new Custody(store, () => timeOf(NOW));
  await assert.rejects(custody.send(who, meaningOf("TEST one mutation"), async () => {
    builds++; return { binding, envelope: original };
  }, async () => {
    deliveries++;
    throw new Error("Delivery must not run after a failed flush");
  }, { notAfter: original.signed.intent.notAfter }), error => error instanceof CustodyError && error.why.held === "unreadable");
  assert.equal(flushes, 1);
  assert.equal(failureInjected, true, "The scripted flush failure must actually be reached");
  assert.equal(deliveries, 0, "The failed flush must prevent the real Custody deliver callback");
  assert.equal(builds, 1);

  const recordPath = join(home, "records", `${identityId(who)}.json`);
  const retainedBytes = readFileSync(recordPath);
  const reopened = new Custody(durableRequestStore(home), () => timeOf(NOW));
  const retained = await reopened.find(who);
  assert.equal(retained?.phase, "sent", "A failed flush must not invent a definitive outcome");
  assert.deepEqual(retained?.envelope, original);
  let reads = 0;
  const observed = await reopened.settle(who, async kept => {
    reads++; assert.deepEqual(kept, original); return null;
  });
  assert.equal(reads, 1);
  assert.equal(observed?.record.phase, "sent");
  assert.equal(observed?.receipt, null);
  assert.deepEqual(readFileSync(recordPath), retainedBytes);
  assert.equal(deliveries, 0);
  assert.equal(builds, 1);
});

test("a successful dispatch flush precedes delivery and the exact saved envelope survives a new store", { timeout: 5000 }, async t => {
  const home = realpathSync(mkdtempSync(join(tmpdir(), "artroom-repo-in-ai-custody-")));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const who = identity("flush-success"), original = await envelope(who.key), order = [];
  const custody = new Custody(durableRequestStore(home, path => {
    flushPrivateFile(path);
    assert.equal(statSync(path).mode & 0o777, 0o600);
    assert.equal(statSync(join(home, "records")).mode & 0o777, 0o700);
    order.push("flushed");
  }), () => timeOf(NOW));
  const answer = { answer: "accepted", receipt: {
    fact: { at: target, seq: 1, hash: textDigest("TEST scripted acknowledgement") },
    definition: binding.pinned, intent: intentDigest(original.signed.intent), effects: [], sends: [], epoch: 0,
  } };
  const result = await custody.send(who, meaningOf("TEST one mutation"), async () => ({ binding, envelope: original }), async kept => {
    assert.deepEqual(order, ["flushed"]);
    const saved = await durableRequestStore(home).read(identityId(who));
    assert.equal(saved?.phase, "sent");
    assert.equal(canonicalize(saved.envelope), canonicalize(kept));
    assert.deepEqual(kept, original);
    order.push("delivered"); return answer;
  }, { notAfter: original.signed.intent.notAfter });
  assert.deepEqual(order, ["flushed", "delivered"]);
  assert.ok("answer" in result);
  assert.deepEqual(result.answer, answer);
  assert.deepEqual((await durableRequestStore(home).read(identityId(who)))?.envelope, original);
});
