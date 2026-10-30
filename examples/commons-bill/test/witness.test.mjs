import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { tsImport } from "tsx/esm/api";

// Actual MCP shaping/Custody/fileStore/flush adapter, scripted HTTP decisions.
// No Native membership, Commons judgment, hosted room or browser runs here.
const load = source => tsImport(source, import.meta.url);
const { canonicalize, textDigest } = await load("@generalbusiness/dap-bytes");
const { secretSigner } = await load("@generalbusiness/dap-client");
const { McpService, identityId } = await load("@generalbusiness/dap-mcp");
const { StandIn, SERVICE } = await load(new URL("../../../packages/mcp/test/support/standin.ts", import.meta.url).href);
const { durableCustody, flushFile } = await load(new URL("../custody.ts", import.meta.url).href);
const { inputOf, requestNote, WitnessRefusal } = await load(new URL("../witness.ts", import.meta.url).href);
const { FIXTURE_DIGEST } = await load(new URL("../documents.ts", import.meta.url).href);
const NOW = Date.parse("2099-01-01T00:00:00Z");

function fixture(t) {
  const home = realpathSync(mkdtempSync(join(tmpdir(), "artroom-bo1-custody-")));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const signer = secretSigner(new Uint8Array(32).fill(79));
  const peer = new StandIn(signer.key, "member", ["commons.write"]), commons = peer.add("commons", "platform:commons@1");
  const directory = peer.scopes.get(peer.directory.scope), row = directory.items[0];
  directory.items[0] = { ...row, refs: { ...row.refs, commons } };
  const identity = { service: SERVICE, membership: peer.membership, signer: signer.key, target: commons, key: "bo1-w1-carrier-bill" };
  const note = { actor: "agent", body: "SYNTHETIC TEST BILL\nB01 charged 120\n", media: "text/plain", about: [] };
  const script = { failFlush: false, loseReply: false }, wires = [];
  let flushes = 0, flushed = false;
  const store = durableCustody(home, path => {
    flushes++; flushed = false;
    assert.equal(JSON.parse(readFileSync(path, "utf8")).phase, "sent");
    if (script.failFlush) throw Error("SCRIPTED fsync failure");
    flushFile(path); flushed = true;
  });
  const fetch = async (url, init) => {
    if (new URL(url).pathname === `/v1/scopes/${commons.scope}/acts` && init?.method === "POST") {
      assert.equal(flushed, true, "The actual dispatch record must flush before wire"); flushed = false;
      const saved = await store.read(identityId(identity)), body = JSON.parse(init.body);
      assert.equal(saved.phase, "sent");
      assert.deepEqual(saved.envelope.signed, body.signed);
      assert.equal(body.signed.intent.fields.text, textDigest(note.body));
      assert.deepEqual(body.texts, [note.body]);
      wires.push(init.body);
      const answer = await peer.fetch(url, init);
      if (script.loseReply) { script.loseReply = false; throw Error("SCRIPTED lost accepted reply"); }
      return answer;
    }
    return peer.fetch(url, init);
  };
  const open = () => new McpService({ service: SERVICE, signer, fetch, now: () => NOW, mode: "generic",
    config: { read: async () => peer.config(), addRoot: async () => {} }, custody: store });
  return { store, identity, note, script, wires, open, flushes: () => flushes };
}

test("dispatch flush failure keeps the real original; Check sends nothing and explicit Continue flushes that same original before its first wire", { timeout: 30000 }, async t => {
  const f = fixture(t); f.script.failFlush = true;
  assert.equal((await requestNote(f.open(), f.identity, f.note, "new")).state, "unknown");
  assert.equal(f.flushes(), 1); assert.equal(f.wires.length, 0);
  const kept = await f.store.read(identityId(f.identity)), original = canonicalize(kept.envelope);
  assert.equal(kept.envelope.signed.intent.fields.text, textDigest(f.note.body));
  assert.deepEqual(kept.envelope.beside.texts, [f.note.body]);
  assert.equal((await requestNote(f.open(), f.identity, f.note, "check")).state, "unknown");
  assert.equal(f.wires.length, 0); assert.equal(f.flushes(), 1);
  f.script.failFlush = false;
  assert.equal((await requestNote(f.open(), f.identity, f.note, "continue")).state, "accepted");
  assert.equal(f.flushes(), 2); assert.equal(f.wires.length, 1);
  assert.equal(canonicalize((await f.store.read(identityId(f.identity))).envelope), original);
  await assert.rejects(requestNote(f.open(), f.identity, { ...f.note, body: "replacement" }, "continue"), /original-meaning/);
  assert.equal(f.wires.length, 1);
});

test("a lost accepted reply settles read-only across reopen without replacing or resending the signed body", { timeout: 30000 }, async t => {
  const f = fixture(t); f.script.loseReply = true;
  assert.equal((await requestNote(f.open(), f.identity, f.note, "new")).state, "unknown");
  assert.equal(f.wires.length, 1);
  const original = canonicalize((await f.store.read(identityId(f.identity))).envelope);
  assert.equal((await requestNote(f.open(), f.identity, f.note, "check")).state, "accepted");
  assert.equal((await requestNote(f.open(), f.identity, f.note, "continue")).state, "accepted");
  assert.equal(f.wires.length, 1);
  assert.equal(canonicalize((await f.store.read(identityId(f.identity))).envelope), original);
});


test("W1 accepts its Commons deployment input and rejects the Demo deployment before operator execution", () => {
  const member = secretSigner(new Uint8Array(32).fill(79));
  const agent = secretSigner(new Uint8Array(32).fill(80));
  const peer = new StandIn(member.key, "member", ["commons.write"]);
  const input = { v: 1, service: "https://dap-commons.inguz.workers.dev",
    source: { head: "a".repeat(40), tree: "b".repeat(40) },
    deployment: { name: "dap-commons", version: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" },
    room: { register: peer.add("register", "platform:register@23"), directory: peer.directory,
      membership: peer.membership, rules: peer.rules, destination: peer.destination,
      commons: peer.add("commons", "platform:commons@1") },
    member: { key: member.key, handle: "@member" }, agent: { key: agent.key, handle: "@agent" },
    fixture: FIXTURE_DIGEST,
  };
  // This closed synthetic input invokes only the pure input boundary.
  // It opens no operator home and makes no HTTP request or native claim.
  assert.deepEqual(inputOf(input), input);
  assert.throws(() => inputOf({ ...input, deployment: { ...input.deployment, name: "dap-demo" } }),
    error => error instanceof WitnessRefusal && error.reason === "input-deployment");
});
