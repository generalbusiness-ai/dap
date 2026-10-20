import { env } from "cloudflare:workers";
import { expect, test } from "vitest";
import type { Digest, Entry, FactRef, PlatformData, Seed } from "@generalbusiness/dap-contract";
import { parseStrict, scopeIdOf, textDigest } from "@generalbusiness/artroom-bytes";
import { ownerReservations, reserved, validateDefinition, type Delivered, type ValidDefinition } from "@generalbusiness/dap-derive";
import { valid } from "../../derive/test/fixtures.ts";
import { PIN_BOUNDS, receiverPinData } from "../../derive/test/fixtures-receiver-pins.ts";
import { httpSource, verify } from "@generalbusiness/artroom-replay";
import { SqliteStore, type Delivery } from "../src/index.ts";
import { CAPABILITY_CODE } from "../src/ports.ts";
import { controls } from "../src/testing.ts";
import { route } from "../src/worker.ts";
import { wired } from "./outside.ts";
import { Lane, START, at, creation, objectOf, reader, rita, stubOf } from "./fixtures-native.ts";

test("native receiver pins fund item and request transfers at full scope ceilings, retain an over-limit body once, and replay their real child results after eviction", async () => {
  // Two actual scopes and journals, native hold code, SQLite and routes.
  // Definitions, clock, authority and internal resolver wiring are fixtures.
  // No workspace, outside owner, provider or raw record injection runs.
  const data = receiverPinData();
  const peer = data.acts["license"]!.fields["peer"]!;
  if (peer.type !== "scope") throw new Error("fixture peer type missing");
  peer.kind = "directory";
  data.receives["license"]!.from.kind = "directory";
  const childData = receiverPinData() as unknown as PlatformData;
  delete childData.capacity;
  childData.name = "platform:task"; childData.capabilities = []; childData.receives = {}; childData.outcomes = {};
  childData.acts = { file: childData.acts["file"]! };
  const childUnder = valid(validateDefinition(childData, PIN_BOUNDS, undefined, { platform: true }));
  const request = { create: { kind: "lane" as const, definition: "platform:task@1" as const, fields: {}, result: {} } };
  data.items["job"] = { many: true, max: 4, initial: "pending", states: { pending: { final: false }, done: { final: true } }, parties: {}, refs: {}, values: {} };
  data.items["ballast"] = { many: false, max: 1, initial: "kept", states: { kept: { final: true } }, parties: {}, refs: {}, values: {} };
  data.receives["license"]!.opens = "job";
  data.acts["finish"] = { ...data.acts["touch"]!, on: "job", guards: [{ state: ["pending"] }], settles: { of: "on", in: ["pending"] }, effects: [{ state: "done" }], sends: [request] };
  data.acts["ballast"] = { ...data.acts["touch"]!, step: "open", on: "ballast", sends: [request] };
  const bodySlot = { fixed: false, required: false, of: { type: "text" as const, detached: true as const, max: PIN_BOUNDS.textBytes } };
  data.items["intent"]!.values["body"] = bodySlot;
  data.acts["attach"] = { ...data.acts["touch"]!, fields: { body: { ...bodySlot.of, required: true } }, guards: [{ state: ["open"] }], effects: [{ value: { slot: "body", from: { field: "body" } } }] };
  data.acts["erase"] = { ...data.acts["touch"]!, guards: [{ state: ["open"] }], effects: [{ state: "closed" }, { redact: { slot: "body" } }] };
  const under = valid(validateDefinition(data, PIN_BOUNDS));
  const senderData = receiverPinData();
  delete senderData.capacity;
  senderData.name = "pin-sender"; senderData.capabilities = []; senderData.receives = {};
  senderData.items["intent"]!.refs["peer"] = { fixed: false, required: false, to: { type: "scope", kind: "directory" } };
  senderData.items["intent"]!.values["body"] = bodySlot;
  senderData.acts = { file: senderData.acts["file"]!, connect: {
    ...senderData.acts["touch"]!, fields: { peer: { type: "scope", kind: "directory", required: true } }, effects: [{ ref: { slot: "peer", from: { field: "peer" } } }],
  }, send: {
    // The source sends an ordinary digest and holds its matching text in
    // a detached field. The receiver judges that text as a body; it need
    // not have the same field type as the source's digest.
    ...senderData.acts["touch"]!, fields: { target: { type: "fact", kind: ["file"], under: data.name, required: true }, k: { type: "int", min: 1, max: 3, required: true }, body: { type: "digest", required: false }, kept: { type: "text", detached: true, max: PIN_BOUNDS.textBytes, required: false } },
    guards: [{ state: ["open"] }], effects: [{ value: { slot: "body", from: { field: "kept" } } }],
    sends: [{ tell: { to: { slot: "peer" }, message: "export-license", fields: { export: { field: "target" }, k: { field: "k" }, body: { field: "body" } }, result: {} } }],
  }, erase: { ...senderData.acts["touch"]!, guards: [{ state: ["open"] }], effects: [{ state: "closed" }, { redact: { slot: "body" } }] } };
  const senderUnder = valid(validateDefinition(senderData, PIN_BOUNDS));
  const peers = new Map<string, ValidDefinition>();
  const wire = (name: string, definition: ValidDefinition, receiver = false) => {
    const c = controls(name, START);
    c.bounds = { ...PIN_BOUNDS, ...(receiver ? { scopeEntries: 15, scopeItems: 3, scopeRecords: 1, scopeRequests: 2 } : {}) };
    peers.set(name, definition);
    wired.set(name, () => ({ capabilities: CAPABILITY_CODE, owners: CAPABILITY_CODE,
      definitions: { read: async () => ({ ok: false, reason: "absent" }), platform: named => named === "platform:task@1" ? { data: childData, rules: {} } : null },
      resolver: { read: async (fact: FactRef) => {
        const entry = await stubOf(fact.at.scope).entry(reader, fact.seq);
        return entry.ok && entry.value.hash === fact.hash ? { fact, entry: entry.value.entry, under: peers.get(fact.at.scope)!.declared.name } : null;
      } },
      texts: { read: async (from: FactRef, digest: Digest) => {
        const text = await (stubOf(from.at.scope) as unknown as { text(seq: number, digest: Digest): Promise<string | null> }).text(from.seq, digest);
        return text === null ? { ok: false, reason: "absent" } : { ok: true, text: parseStrict(text) as string };
      } },
    }));
    return c;
  };
  const birth = async (definition: ValidDefinition, receiver = false) => {
    const asked = creation(at(62), definition), c = wire(asked.name, definition, receiver);
    const created = await stubOf(asked.name).create(asked.signed, definition.declared);
    expect(created.answer).toBe("accepted");
    if (created.answer !== "accepted") throw new Error("native pin fixture must create");
    return new Lane(asked.name, c, created.receipt.fact.at, created.receipt, asked.signed);
  };
  const arrive = (name: string, envelope: Delivered) => (objectOf(name) as unknown as { deliver(input: Delivered): Promise<Delivery> }).deliver(envelope);
  try {
    const receiver = await birth(under, true), sender = await birth(senderUnder);
    await sender.did(rita, "connect", { on: 0, expected: { on: 1 }, fields: { peer: receiver.at } });
    // Fill ordinary room while preserving enough entries for both the
    // actual source history and the receiver's two owed decisions.
    for (let n = 0; n < 4; n++) await receiver.did(rita, "touch", { on: 0, expected: { on: 1 } });
    await receiver.did(rita, "license", { on: 0, expected: { on: 1 }, fields: { peer: sender.at } });
    const body = "\u0000".repeat(PIN_BOUNDS.textBytes), digest = textDigest(body);
    const inspect = () => receiver.inside(state => {
      const store = new SqliteStore({ exec: (query, ...bindings) => state.storage.sql.exec(query, ...bindings), transaction: work => state.storage.transactionSync(work) });
      const head = parseStrict(store.stored(store.scope()!.head.seq)!.bytes) as Entry;
      return { head: store.scope()!.head, bytes: store.logicalBytes(), keys: store.keyCounts(), owner: ownerReservations(CAPABILITY_CODE, store, under), reserved: reserved(store, under, head.input, CAPABILITY_CODE), pin: store.record("hold@1", "receiver-pin", [0]), text: store.retained("text", digest)?.bytes ?? null, snapshot: store.all() };
    });
    const unit = under.pendingWorkAmounts.receiverPins!.byKind["directory"]!;
    expect(unit).toEqual({ entries: 4, items: 1, records: 0, bytes: 6 * PIN_BOUNDS.entryBytes + 6 * PIN_BOUNDS.textBytes + 2, requests: 1 });
    const before = await inspect();
    expect(before.owner).toEqual({ entries: 8, items: 2, records: 0, bytes: 2 * unit.bytes, requests: 2 });
    expect(before.keys).toEqual({ items: 1, records: 1, requests: 0 });
    expect(before.head.seq + 1 + before.reserved.entries).toBe(15);
    expect(before.keys.items + before.reserved.items).toBe(3);
    expect(before.keys.requests + before.reserved.requests).toBe(2);
    receiver.c.bounds = { ...receiver.c.bounds, scopeBytes: before.bytes + before.reserved.bytes, scopeEntries: 100 };
    await receiver.restart();
    expect(await receiver.act(rita, "touch", { on: 0, expected: { on: 1 } })).toMatchObject({ answer: "refused", reason: "scope-full", name: "scopeBytes" });
    expect(await inspect()).toEqual(before);
    receiver.c.bounds = { ...receiver.c.bounds, scopeEntries: 15 };
    await receiver.restart();
    expect(await inspect()).toEqual(before);

    const deliver = async (k: number, payload?: string) => {
      const fields = { target: receiver.genesis.fact, k, ...(payload === undefined ? {} : { body: textDigest(payload), kept: textDigest(payload) }) };
      const sent = await sender.stub.submit(sender.intent(rita, "send", { on: 0, expected: { on: 2 }, fields }), sender.grants(), { texts: payload === undefined ? [] : [payload] });
      expect(sent.answer).toBe("accepted");
      if (sent.answer !== "accepted") throw new Error("native source must send");
      const entry = await sender.stub.entry(reader, sent.receipt.fact.seq);
      if (!entry.ok) throw new Error("source entry must be readable");
      const request = entry.value.entry.sends[0]!;
      const envelope = { to: receiver.at, from: sent.receipt.fact, n: request.n, message: request.message };
      const answer = await arrive(receiver.name, envelope);
      expect(answer.answer).toBe("recorded");
      if (answer.answer !== "recorded") throw new Error("funded native decision must be recorded");
      return { answer, envelope, entry: await receiver.stub.entry(reader, answer.fact.seq) };
    };
    const applied = await deliver(2);
    expect(applied.entry).toMatchObject({ ok: true, value: { entry: { input: { decision: "applied" } } } });
    const job = applied.answer.fact.seq;
    const after = await inspect();
    expect(after.owner).toEqual(unit);
    expect(after.keys).toEqual({ items: 2, records: 1, requests: 0 });
    expect(after.reserved).toMatchObject({ entries: 8, items: 1, records: 0, requests: 2 });
    expect(after.head.seq + 1 + after.reserved.entries).toBe(15);
    await receiver.restart();
    expect(await inspect()).toEqual(after);
    const refused = await deliver(3, body);
    expect(refused.entry).toMatchObject({ ok: true, value: { entry: { input: { decision: "refused", reason: { code: "bad-field" } }, effects: [{ effect: "record", values: { decided: 3 } }] } } });
    const completed = await inspect();
    expect(completed.owner).toEqual({ entries: 0, items: 0, records: 0, bytes: 0, requests: 0 });
    expect(completed.keys).toEqual(after.keys);
    expect(completed.reserved).toMatchObject({ entries: 4, items: 0, records: 0, requests: 1 });
    expect(completed.text).toHaveLength(6 * PIN_BOUNDS.textBytes + 2);
    expect(completed.pin).toMatchObject({ state: "standing", values: { decided: 3 } });
    await receiver.restart();
    expect(await inspect()).toEqual(completed);
    expect(await arrive(receiver.name, refused.envelope)).toEqual(refused.answer);
    expect(await inspect()).toEqual(completed);

    // New work uses exactly the room freed by the refused branch: one
    // final item, one pending request and three entries. The admitted
    // job's future request must still transfer into Used at the ceiling.
    const ballast = await receiver.did(rita, "ballast");
    const full = await inspect();
    expect(full.keys).toEqual({ items: 3, records: 1, requests: 1 });
    expect(full.reserved.requests).toBe(1);
    expect(full.head.seq + 1 + full.reserved.entries).toBe(15);
    expect(await receiver.act(rita, "touch", { on: 0, expected: { on: 1 } })).toMatchObject({ answer: "refused", reason: "scope-full", name: "scopeEntries" });
    expect(await inspect()).toEqual(full);
    await receiver.restart();
    const finished = await receiver.did(rita, "finish", { on: job, expected: { on: 1 } });
    const transferred = await inspect();
    expect(transferred.keys).toEqual({ items: 3, records: 1, requests: 2 });
    expect(transferred.reserved.requests).toBe(0);
    expect(transferred.head.seq + 1 + transferred.reserved.entries).toBe(15);
    const answerCreation = async (fact: FactRef) => {
      const sent = await receiver.stub.entry(reader, fact.seq);
      if (!sent.ok) throw new Error("actual creation request must be readable");
      const request = sent.value.entry.sends[0]!, seed = request.to as Seed, child = scopeIdOf(seed);
      wire(child, childUnder);
      const born = await arrive(child, { to: seed, from: fact, n: request.n, message: request.message });
      expect(born.answer).toBe("recorded");
      if (born.answer !== "recorded") throw new Error("actual child must decide");
      const genesis = await stubOf(child).entry(reader, 0);
      expect(genesis).toMatchObject({ ok: true, value: { entry: { input: { type: "genesis", decision: "refused" } } } });
      if (!genesis.ok) throw new Error("actual child decision must be readable");
      const result = genesis.value.entry.sends[0]!;
      expect(await arrive(receiver.name, { to: receiver.at, from: born.fact, n: result.n, message: result.message })).toMatchObject({ answer: "recorded" });
    };
    await answerCreation(finished.fact);
    expect((await inspect()).keys.requests).toBe(1);
    await receiver.restart();
    await answerCreation(ballast.fact);
    expect((await inspect()).keys).toEqual({ items: 3, records: 1, requests: 0 });
    expect(await receiver.stub.checkpoint()).toMatchObject({ answer: "written" });
    const source = httpSource("https://scope.test", { reader, fetch: async (url, init) => {
      const response = await route(new Request(url, init), env.SCOPES);
      return { status: response.status, body: response.body };
    } });
    const replayed = await verify(source, { mode: "replay", scope: receiver.name, grants: "as-recorded", capabilities: CAPABILITY_CODE, owners: CAPABILITY_CODE, bounds: receiver.c.bounds, platform: named => named === "platform:task@1" ? { data: childData, rules: {} } : null });
    expect([replayed.report.result, replayed.why], JSON.stringify(replayed.report)).toEqual(["consistent", null]);

    // Remove the actual payload from both scopes through legal slot
    // aliases. No retained size survives. A fresh replay must describe
    // that evidence gap, rather than infer that the refused body was valid.
    receiver.c.bounds = { ...receiver.c.bounds, scopeEntries: 18 };
    await receiver.restart();
    const attached = await receiver.stub.submit(receiver.intent(rita, "attach", { on: 0, expected: { on: 1 }, fields: { body: digest } }), receiver.grants(), { texts: [body] });
    expect(attached.answer).toBe("accepted");
    const erased = await receiver.did(rita, "erase", { on: 0, expected: { on: 2 } });
    await sender.did(rita, "erase", { on: 0, expected: { on: 3 } });
    expect((await inspect()).text).toBeNull();
    await receiver.restart(); await sender.restart();
    const fresh = httpSource("https://scope.test", { reader, fetch: async (url, init) => {
      const response = await route(new Request(url, init), env.SCOPES);
      return { status: response.status, body: response.body };
    } });
    expect((await fresh.retained(receiver.name, "text", digest, { bytes: 6 * PIN_BOUNDS.textBytes + 2 })).ok).toBe(false);
    expect((await fresh.retained(sender.name, "text", digest, { bytes: 6 * PIN_BOUNDS.textBytes + 2 })).ok).toBe(false);
    const redacted = await verify(fresh, { mode: "replay", scope: receiver.name, grants: "as-recorded", capabilities: CAPABILITY_CODE, owners: CAPABILITY_CODE, bounds: receiver.c.bounds, platform: named => named === "platform:task@1" ? { data: childData, rules: {} } : null });
    expect([redacted.report.result, redacted.why], JSON.stringify(redacted.report)).toEqual(["incomplete", "redacted size not retained"]);
    expect(redacted.report.incompleteBytes).toEqual([{ scope: receiver.at, from: refused.answer.fact.seq, through: erased.fact.seq - 1, reason: "redacted size not retained" }]);
  } finally { for (const name of peers.keys()) wired.delete(name); }
});
