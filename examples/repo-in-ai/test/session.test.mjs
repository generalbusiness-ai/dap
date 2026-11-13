import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { tsImport } from "tsx/esm/api";

// Locked loader, actual wrapper/McpService/Custody/file stores. The existing
// StandIn scripts HTTP summaries, standing and decisions; it judges nothing.
// These are local custody/transport witnesses, not Worker or Native authority.
const load = source => tsImport(source, import.meta.url);
const { canonicalize, entryHash, factRefOf, intentDigest, isLogPage, newGenesisNonce, textDigest, timeOf, verifySignedIntent } = await load("@generalbusiness/dap-bytes");
const { secretSigner } = await load("@generalbusiness/dap-client");
const { firstExtents, ARCHIVE_DEVICE_APPLICATION_COHORT: setupCohort } = await load("@generalbusiness/dap-platform");
const { identityId } = await load("@generalbusiness/dap-mcp");
const { StandIn, SERVICE } = await load(new URL("../../../packages/mcp/test/support/standin.ts", import.meta.url).href);
const { changeJ4 } = await load(new URL("../../../apps/room/lanes/src/j4.ts", import.meta.url).href);
const { durableCliStore, durableRequestStore } = await load(new URL("../custody.ts", import.meta.url).href);
const { openSession, SessionRefusal } = await load(new URL("../session.ts", import.meta.url).href);
const { roomRefs } = await load(new URL("../workflow.ts", import.meta.url).href);
const { laneState } = await load(new URL("../journal.ts", import.meta.url).href);
const { publicationPhase } = await load(new URL("../publication.ts", import.meta.url).href);
const { retain } = await load(new URL("../plan.ts", import.meta.url).href);
const { hashOfBytes } = await load("@generalbusiness/dap-replay");
const NOW = Date.parse("2099-01-01T00:00:00Z");

function json(body) {
  const bytes = new TextEncoder().encode(JSON.stringify(body));
  return { status: 200, body: new ReadableStream({ start(controller) { controller.enqueue(bytes); controller.close(); } }) };
}

async function fixture(t) {
  const home = realpathSync(mkdtempSync(join(tmpdir(), "artroom-s1-session-")));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const secret = new Uint8Array(32).fill(17), signer = secretSigner(secret);
  const peer = new StandIn(signer.key, "admin", ["membership.manage", "rules.activate", "rules.publish", "change.propose"]);
  const store = durableCliStore(home);
  await store.keep("session-test", secret);
  await store.save({ v: 2, key: "session-test", ...peer.config() });
  const custody = durableRequestStore(join(home, "private", "mcp-custody"));
  const calls = [], mutations = [];
  const script = { loseNextAct: false, acceptPreparation: false };
  const identity = (target, key) => ({ service: SERVICE, membership: peer.membership, signer: signer.key, target, key });
  const fetch = async (url, init) => {
    const path = new URL(url).pathname, method = init?.method ?? "GET";
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : null;
    calls.push({ method, path, body });
    if (method === "POST" && /\/(?:acts|preparations)$/.test(path)) {
      mutations.push({ path, raw: init.body, body });
      const kept = await custody.read(identityId(identity(body.signed.intent.to, body.signed.intent.idempotencyKey)));
      assert.ok(kept, "Actual disk custody must exist before a mutation reaches the scripted fetch");
      assert.deepEqual(kept.envelope.signed, body.signed);
      assert.ok(verifySignedIntent(body.signed));
      const originals = readdirSync(join(home, "private")).filter(name => name.startsWith("s1o-") && name.endsWith(".data"));
      assert.equal(originals.length, 1, "The wrapper's own original must precede its first send");
      assert.equal(statSync(join(home, "private", originals[0])).mode & 0o777, 0o600);
      if (path.endsWith("/acts")) {
        assert.equal(kept.phase, "sent");
        if (script.loseNextAct) { script.loseNextAct = false; throw new Error("SCRIPTED lost act reply; outcome unknown"); }
      } else {
        assert.ok(Object.values(kept.steps).some(step => step.phase === "sent"));
        if (script.acceptPreparation) {
          const scope = peer.scopes.get(body.signed.intent.to.scope);
          // A scripted capability acknowledgement over the actual signed
          // intent. No hold/stage rule or Native preparation runs here.
          const entry = peer.append(scope, { type: "preparation", signed: body.signed, authority: [], capability: body.capability, step: body.step });
          return json({ answer: "accepted", receipt: { fact: factRefOf(entry.entry, scope.ref), definition: scope.definition,
            intent: intentDigest(body.signed.intent), effects: [], sends: [], epoch: 0 } });
        }
      }
    }
    return peer.fetch(url, init);
  };
  return {
    home, peer, script, calls, mutations, custody, identity,
    open: (now = () => NOW) => openSession(home, { fetch, now }),
    async record(target, key) { return custody.read(identityId(identity(target, key))); },
    original() {
      const names = readdirSync(join(home, "private")).filter(name => name.startsWith("s1o-") && name.endsWith(".data"));
      assert.equal(names.length, 1);
      return readFileSync(join(home, "private", names[0]));
    },
  };
}

test("the actual session retains a lost act, Check sends no mutation, and explicit Continue reuses its exact envelope across file-store reopen", { timeout: 30_000 }, async t => {
  const f = await fixture(t), key = "s1-lost-act";
  const args = { target: f.peer.rules.scope, kind: "publish", digest: "platform:rules@2", on: 0,
    fields: { approvals: 0, ownerMayReview: false, checks: [], labels: [], extents: firstExtents({ approvals: 0, checks: [] }) }, idempotencyKey: key };
  const binding = { target: f.peer.rules };
  f.script.loseNextAct = true;
  const first = await (await f.open()).request("new", "act", args, binding);
  assert.equal(first.result.isError, true);
  assert.equal(first.result.structuredContent.error, "transport");
  assert.match(first.result.structuredContent.message, /the outcome is unknown\./);
  assert.match(first.result.structuredContent.message, /The envelope is under custody\./);
  assert.equal(f.script.loseNextAct, false, "The intended lost-reply injection must actually run after custody assertions");
  assert.equal(f.mutations.length, 1);
  const original = f.original(), retained = await f.record(f.peer.rules, key);
  assert.equal(retained.phase, "unknown");
  assert.deepEqual(retained.envelope.signed, f.mutations[0].body.signed);

  const reopened = await f.open();
  const beforeIntent = f.calls.length;
  const keptIntent = await reopened.intent(key);
  assert.equal(keptIntent, intentDigest(retained.envelope.signed.intent));
  assert.equal(f.calls.length, beforeIntent, "Reading the retained intent digest must stay local");
  await assert.rejects(reopened.request("new", "act", args, binding), error => error instanceof SessionRefusal && error.reason === "key-exists");
  await assert.rejects(reopened.request("check", "act", { ...args, fields: { ...args.fields, approvals: 1 } }, binding), error => error instanceof SessionRefusal && error.reason === "original-missing-or-different");
  const before = f.calls.length, checked = await reopened.request("check", "act", args, binding);
  assert.equal(checked.result.structuredContent.answer, "unknown");
  assert.equal(f.mutations.length, 1);
  // Settlement is a read-only POST /settle, not an act/preparation POST.
  const posts = f.calls.slice(before).filter(call => call.method === "POST");
  assert.ok(posts.some(call => call.path.endsWith("/settle")));
  assert.ok(posts.every(call => call.path.endsWith("/settle") || call.path.endsWith("/sessions")));
  assert.deepEqual(posts.find(call => call.path.endsWith("/settle")).body.signed, retained.envelope.signed);
  assert.deepEqual(f.original(), original);
  assert.equal(canonicalize((await f.record(f.peer.rules, key)).envelope), canonicalize(retained.envelope));

  const continued = await reopened.request("continue", "act", args, binding);
  assert.equal(continued.result.structuredContent.answer, "accepted");
  assert.equal(f.mutations.length, 2);
  assert.equal(f.mutations[1].raw, f.mutations[0].raw);
  assert.deepEqual(f.original(), original);
  const accepted = await reopened.accepted(key);
  assert.deepEqual(accepted.signed, retained.envelope.signed);
  assert.equal(accepted.receipt.intent, intentDigest(retained.envelope.signed.intent));
  assert.equal(await reopened.intent(key), keptIntent);
  await reopened.request("continue", "act", args, binding);
  assert.equal(f.mutations.length, 2, "A terminal original must not become a replacement act");

  const wrong = { ...f.peer.rules, genesis: textDigest("SCRIPTED another rules genesis") };
  await assert.rejects(reopened.request("check", "act", args, { target: wrong }), error => error instanceof SessionRefusal && error.reason === "incomplete-or-wrong-scope");
  assert.equal(f.mutations.length, 2);
  assert.deepEqual(f.original(), original);
});

test("manifest preparation keeps the actual signed act on disk and explicit submission sends that same envelope without a second preparation", { timeout: 30_000 }, async t => {
  const f = await fixture(t), lane = f.peer.lane(changeJ4), key = "s1-manifest-stage";
  f.script.acceptPreparation = true;
  const args = { target: lane.scope, resource: lane.scope, kind: "propose-manifest", digest: f.peer.scopes.get(lane.scope).definition,
    capability: "hold@2", step: "stage", idempotencyKey: key,
    fields: { base: "a".repeat(40), integration: "b".repeat(40), tree: "c".repeat(40), instance: "TEST-session-stage", selected: [], decisions: [], complete: true } };
  const binding = { target: lane, resource: lane };
  const prepared = await (await f.open()).request("new", "prepare", args, binding);
  assert.equal(prepared.result.structuredContent.step.phase, "answered");
  assert.equal(prepared.result.structuredContent.step.answer.answer, "accepted");
  assert.equal(f.mutations.length, 1);
  assert.ok(f.mutations[0].path.endsWith("/preparations"));
  const original = f.original(), record = await f.record(lane, key);
  assert.equal(record.phase, "prepared");
  assert.deepEqual(record.envelope.signed, f.mutations[0].body.signed);
  const reopened = await f.open();
  const beforeIntent = f.calls.length, keptIntent = await reopened.intent(key);
  assert.equal(keptIntent, intentDigest(record.envelope.signed.intent));
  assert.equal(f.calls.length, beforeIntent);
  await reopened.submitPrepared("check", key);
  await reopened.request("continue", "prepare", args, binding);
  assert.equal(f.mutations.length, 1, "Check and an already-answered preparation must not send another mutation");
  const submitted = await reopened.submitPrepared("continue", key);
  assert.equal(submitted.result.structuredContent.answer, "accepted");
  assert.equal(f.mutations.length, 2);
  assert.ok(f.mutations[1].path.endsWith("/acts"));
  assert.equal(canonicalize(f.mutations[1].body.signed), canonicalize(f.mutations[0].body.signed));
  assert.deepEqual((await reopened.accepted(key)).signed, record.envelope.signed);
  assert.equal(await reopened.intent(key), keptIntent);
  assert.deepEqual(f.original(), original);
});

// Scripted room summaries are not Native authority. Session serialization,
// signed read-session requests, response decoding and private proof writes
// below are the actual maintained implementations.
test("room discovery reads every pinned sibling through one actual session and retains its exact private read proofs", { timeout: 30_000 }, async t => {
  const f = await fixture(t), store = durableCliStore(f.home);
  f.peer.membership = f.peer.add("membership", setupCohort.membership);
  f.peer.rules = f.peer.add("rules", setupCohort.rules);
  f.peer.destination = f.peer.add("destination", setupCohort.destination);
  const refs = { membership: f.peer.membership, rules: f.peer.rules, destination: f.peer.destination };
  f.peer.directory = f.peer.add("directory", setupCohort.directory, [{
    id: 0, type: "repository", state: "open", revision: 0, opened: null,
    parties: {}, attributed: [], values: {}, refs,
  }]);
  await store.save({ v: 2, key: "session-test", ...f.peer.config() });
  const expected = { directory: f.peer.directory, ...refs }, opened = await f.open();
  const pendingReads = [];
  // Observe the actual promises only to drain a failed discovery before
  // fixture cleanup. This neither queues calls nor replaces the busy guard.
  const tracked = { ...opened, read(target) {
    const pending = opened.read(target); pendingReads.push(pending); return pending;
  } };
  const observed = await roomRefs(tracked).catch(() => null);
  await Promise.allSettled(pendingReads);
  assert.deepEqual(observed, expected, "All four pinned scopes must be readable through the actual Session");
  assert.deepEqual(JSON.parse(new TextDecoder().decode(await store.private("s1-room-refs"))), expected);
  const names = readdirSync(join(f.home, "private")).filter(name => name.startsWith("s1r-") && name.endsWith(".data"));
  assert.equal(names.length, 4, "Each actual Session.read must retain its private proof");
  const proofs = await Promise.all(names.map(async name => {
    assert.equal(statSync(join(f.home, "private", name)).mode & 0o777, 0o600);
    const proof = JSON.parse(new TextDecoder().decode(await store.private(name.slice(0, -5))));
    assert.equal(proof.v, 1); assert.equal(proof.read.ok, true); assert.equal(proof.read.complete, true);
    assert.deepEqual(proof.read.value.scope, proof.target);
    return canonicalize(proof.target);
  }));
  assert.deepEqual(proofs.sort(), Object.values(expected).map(canonicalize).sort());
  const kept = names.map(name => readFileSync(join(f.home, "private", name)));
  assert.deepEqual(await roomRefs(await f.open()), expected, "Reopening must read back the same immutable proofs");
  assert.deepEqual(names.map(name => readFileSync(join(f.home, "private", name))), kept);
  assert.equal(f.mutations.length, 0);
  assert.ok(f.calls.filter(call => call.method === "POST").every(call => call.path.endsWith("/sessions")));
  assert.equal(readdirSync(join(f.home, "private")).filter(name => name.startsWith("s1o-")).length, 0);
});


// The existing StandIn emits the actual LogPage wire representation. Entries
// and authority remain scripted; real Session, transport decoding, MCP record,
// private file retention and the local fold run below. No Native/provider act.
async function journalFixture(t, rewrite) {
  const f = await fixture(t), lane = f.peer.lane(changeJ4), scope = f.peer.scopes.get(lane.scope);
  f.peer.append(scope, { type: "timed", item: 0, rule: "SCRIPTED-empty-journal-step", due: scope.entries[0].entry.time });
  if (rewrite) {
    const fetch = f.peer.fetch;
    f.peer.fetch = async (url, init) => {
      const response = await fetch(url, init);
      if ((init?.method ?? "GET") !== "GET" || !new URL(url).pathname.endsWith("/log")) return response;
      const wire = await new Response(response.body).json();
      return json(rewrite(wire));
    };
  }
  return { ...f, lane, scope };
}
function recordPage(result) {
  assert.equal(result.isError, false, "The actual MCP record call must return a decoded log page");
  const body = result.structuredContent;
  assert.equal(isLogPage({ scope: body.scope, definition: body.definition, entries: body.entries }), true,
    "The scripted reply must pass the maintained LogPage codec before journal checks");
  return body;
}

test("laneState decodes actual Session/MCP record Stored bytes and folds the exact complete chain", { timeout: 30_000 }, async t => {
  const f = await journalFixture(t), opened = await f.open();
  const body = recordPage((await opened.call("record", { scope: f.lane.scope })).result);
  assert.equal(body.entries.length, 2);
  assert.deepEqual(Object.keys(body.entries[0]).sort(), ["bytes", "hash", "seq"]);
  assert.equal(body.entries[0].bytes, canonicalize(f.scope.entries[0].entry));
  assert.equal(body.entries[0].hash, entryHash(f.scope.entries[0].entry));
  let folded;
  await assert.doesNotReject(async () => { folded = await laneState(opened, f.lane); },
    "The maintained Stored wire entries must decode and fold instead of being mistaken for Sealed objects");
  assert.deepEqual(folded.entries, f.scope.entries);
  assert.deepEqual(folded.memory.scope().at, f.lane);
  assert.deepEqual(folded.memory.scope().head, f.peer.head(f.scope));
  assert.equal(f.mutations.length, 0);
  assert.ok(f.calls.filter(call => call.method === "POST").every(call => call.path.endsWith("/sessions")));
});

test("a stage-ready that stays pending reads the actual journal, posts no act or preparation, and its pauses stay inside one read session", { timeout: 30_000 }, async t => {
  const f = await journalFixture(t), store = durableCliStore(f.home);
  await retain(store, "s1-seed-lane", f.lane);
  await retain(store, "s1-done-hold", { phase: "hold", status: "accepted", fact: { seq: 0 } });
  await retain(store, "s1-done-manifest-stage", { phase: "manifest-stage", status: "accepted", intent: textDigest("SCRIPTED staged intent") });
  // The stand-in's session ends when the reader asks: 60 seconds on. The clock moves only by the pauses,
  // so a second session request means the pauses alone outlast one session. Read time is not modelled.
  f.peer.sessionEnds = timeOf(NOW + 60_000);
  let now = NOW, pauses = 0;
  const opened = await f.open(() => now);
  opened.ctx.pause = async () => { pauses++; now += 2000; };
  await assert.rejects(publicationPhase(opened, opened, opened, {}, "stage-ready", "new"), { message: "The actual stage/check outcome is not ready. Read this phase again." });
  assert.equal(f.mutations.length, 0, "The wait posts no act or preparation");
  assert.deepEqual(f.calls.filter(call => call.method === "POST").map(call => call.path.split("/").at(-1)), ["sessions"], "The only signed request is the first read's one read session");
  assert.equal(pauses, 15);
});

test("laneState refuses malformed, noncanonical, hash-substituted, misbound and incomplete Stored logs after the real codec", { timeout: 30_000 }, async t => {
  const variants = [
    ["malformed bytes with their actual hash", wire => {
      wire.value.entries[0].bytes = "{"; wire.value.entries[0].hash = hashOfBytes("{"); return wire;
    }, "incomplete or misbound"],
    ["noncanonical bytes with their actual hash", wire => {
      const bytes = JSON.stringify(JSON.parse(wire.value.entries[0].bytes), null, 2);
      wire.value.entries[0].bytes = bytes; wire.value.entries[0].hash = hashOfBytes(bytes); return wire;
    }, "incomplete or misbound"],
    ["substituted hash", wire => {
      wire.value.entries[0].hash = textDigest("SCRIPTED substituted entry hash"); return wire;
    }, "incomplete or misbound"],
    ["another genesis with matching canonical bytes and hash", wire => {
      const entry = JSON.parse(wire.value.entries[0].bytes);
      entry.input.nonce = newGenesisNonce(new Uint8Array(16).fill(99));
      wire.value.entries[0].bytes = canonicalize(entry); wire.value.entries[0].hash = entryHash(entry); return wire;
    }, "incomplete or misbound"],
    ["internally intact prefix below advertised head", wire => {
      wire.value.entries.pop(); return wire;
    }, "does not reach its advertised head"],
  ];
  for (const [label, rewrite, message] of variants) {
    const f = await journalFixture(t, rewrite), opened = await f.open();
    recordPage((await opened.call("record", { scope: f.lane.scope })).result);
    await assert.rejects(laneState(opened, f.lane), error => error instanceof Error && error.message.includes(message), label);
    assert.equal(f.mutations.length, 0, label);
    assert.ok(f.calls.filter(call => call.method === "POST").every(call => call.path.endsWith("/sessions")), label);
  }
});
