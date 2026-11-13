/** M0 uses real native rooms, application installation, delivery and read
 * sessions. Git/package peers, the clock and the scheduler are TEST stand-ins.
 * Setup inspection has no role in the final receiving-room HTTP reads. */
import { expect, test } from "vitest";
import { env } from "cloudflare:test";
import type { Intent, OperationId, ScopeRef, Seed } from "@generalbusiness/dap-contract";
import { canonicalize, entryHash, intentDigest, isSeed, scopeIdOf, seedDigest, signIntent } from "@generalbusiness/dap-bytes";
import { TRUSTED_APPLICATION_COHORT as C, repositoryName } from "@generalbusiness/dap-platform";
import { requestSession, secretSigner, sessionRequest } from "@generalbusiness/dap-client";
import { McpService, memoryStore, type ServerPort } from "@generalbusiness/dap-mcp";
import nativeWorker from "../../../apps/room/worker.ts";
import { outsideOf as hostOutside } from "../src/worker.ts";
import { applicationWorkerBindings, applicationResolverFixture, applicationHttpPeer, sessionRoom, dispatchFixture, effectFixture, driveFixture } from "./fixtures-native.ts";
import { outsideOf } from "./outside.ts";
import { rita, vic, sam, routed } from "./repository.ts";
import { soon } from "./net.ts";
import { crossRoomApplication } from "./support/cross-room-application.ts";

test("a declared cross-room send admits only the genesis-named sender and exposes its retained entry without opening the sending room", async () => {
  const { packet, id } = await crossRoomApplication();
  const sendingRoom = await sessionRoom(C.register), { life } = sendingRoom;
  const f = await applicationResolverFixture("sha1", undefined, {}, undefined, packet), peer = applicationHttpPeer(f);
  const bindings = applicationWorkerBindings(env.PLATFORM, env.APPLICATION_CONTENT, JSON.stringify(f.trust), env.SCOPE_INDEX);
  life.applicationTrust(() => bindings.APPLICATION_TRUST);
  try {
    // A separate native register and founder give this room a different membership.
    const intent: Intent = { v: 1, to: null, actor: vic.key, kind: "install", on: null, expected: {},
      fields: { host: "git.example", namespace: "cross-room-receiver", policy: "keys", founders: [vic.key] },
      idempotencyKey: crypto.randomUUID(), notAfter: soon(60) };
    const R = life.platform(scopeIdOf({ v: 1, kind: "register", definition: C.register, creator: null, cause: intentDigest(intent), ordinal: 0 }));
    const outside = outsideOf(R.name); life.wire(R.name, () => ({ outside }));
    expect(await life.wait(() => R.stub.create(signIntent(intent, vic.secret), C.register))).toMatchObject({ answer: "accepted" });
    const found = await life.wait(() => R.intent(vic, "found", { expected: { register: 1 },
      fields: { branch: "main", founderHandle: "@vic", recoveryKey: sam.key } }));
    const seed: Seed = { v: 1, kind: "directory", definition: C.directory, creator: await life.wait(() => R.at()), cause: intentDigest(found.intent), ordinal: 0 };
    const D = life.platform(scopeIdOf(seed));
    outside.answer("1:0" as OperationId, 1, { result: "confirmed", evidence: { basis: "own-answer", body: { name: repositoryName(seedDigest(seed), 1), id: "TEST-cross-room-receiver" } } });
    expect(await life.wait(() => R.stub.submit(found, []))).toMatchObject({ answer: "accepted" });
    await effectFixture([R], life.wait); await dispatchFixture([R, D], life.wait);
    const birth = (await life.wait(() => D.entries()))[0]!;
    const children = [1, 2, 3].map(n => life.platform(scopeIdOf(birth.sends.find(send => send.n === n)!.to as Seed)));
    await dispatchFixture([R, D, ...children], life.wait);
    const receivingRoom = { R, D, children };
    const prepare = async (room: typeof receivingRoom, who: typeof rita) => {
      const [M, A, G] = room.children;
      if (!M || !A || !G) throw Error("The declared cohort needs three siblings.");
      const seat = await life.wait(() => M.did(who, "seat", { expected: { roster: 1 } }));
      await life.wait(async () => M.did(who, "first-key", { fields: { member: seat }, expected: await M.expected({ roster: 0, member: seat }) }));
      for (const node of [room.D, A]) {
        life.outside(node.name, (given, sql) => hostOutside(given, sql, bindings, peer.fetch));
        await life.wait(() => node.restart());
      }
      const membership = await life.wait(() => M.at()), directory = await life.wait(() => room.D.at());
      const port: ServerPort = { service: "https://scopes.test", signer: secretSigner(who.secret), custody: memoryStore(), now: life.now,
        config: { read: async () => ({ service: "https://scopes.test", repository: { directory, membership, rules: A.name, destination: G.name } }),
          addRoot: async () => { throw Error("Use native installation."); } },
        applicationFetch: peer.fetch, applicationTrust: bindings.APPLICATION_TRUST, fetch: (url, init) => life.wait(() => routed(url, init)) };
      return { ...room, M, A, G, membership, directory, mcp: new McpService(port), who, seat };
    };
    const sending = await prepare(sendingRoom, rita), receiving = await prepare(receivingRoom, vic);
    expect(sending.membership).not.toEqual(receiving.membership);
    for (const room of [sending, receiving]) {
      expect((await life.wait(() => room.M.entries())).filter(entry => entry.input.type === "act" && entry.input.signed.intent.kind === "first-key"))
        .toMatchObject([{ input: { signed: { intent: { actor: room.who.key } } } }]);
    }
    const all = () => life.platforms();
    const install = async (room: typeof sending, key: string, admittedSender?: ScopeRef) => {
      const installed = await life.wait(() => room.mcp.call("install_application", { uri: f.uri, release: packet.ids.release,
        roles: ["admin"], values: admittedSender ? { admittedSender } : {}, idempotencyKey: key }));
      expect(installed.structuredContent).toMatchObject({ answer: "accepted", phase: "accepted" });
      const job = Number(installed.structuredContent["item"]);
      await driveFixture(all(), life.wait);
      const creation = (await life.wait(() => room.D.entries())).flatMap(entry => entry.sends).filter(send => isSeed(send.to) && send.to.definition === id).at(-1);
      if (!creation || !isSeed(creation.to)) throw Error("Native installation must create the declared scope.");
      const node = life.platform(scopeIdOf(creation.to)); await driveFixture(all(), life.wait);
      const at = await life.wait(() => node.at());
      expect(await life.wait(() => room.A.item(job))).toMatchObject({ state: "active", refs: { scope: at } });
      expect((await life.wait(() => node.entries()))[0]!.input).toMatchObject({ type: "genesis", decision: "applied",
        seed: { definition: id }, message: { body: { membership: room.membership, ...(admittedSender ? { fields: { admittedSender } } : {}) } } });
      return node;
    };
    const sender = await install(sending, "TEST-cross-room-sender");
    const senderAt = await life.wait(() => sender.at());
    const receiver = await install(receiving, "TEST-cross-room-receiver", senderAt);
    const receiverAt = await life.wait(() => receiver.at());
    const other = await install(sending, "TEST-cross-room-other");
    const privateSeq = await life.wait(async () => sender.did(rita, "bump", { on: 0, expected: await sender.expected({ on: 0 }) }));
    const send = async (node: typeof sender) => {
      const seq = await life.wait(async () => node.did(rita, "send", { on: 0, expected: await node.expected({ on: 0 }), fields: { peer: receiverAt, count: 7 } }));
      await driveFixture(all(), life.wait);
      return (await life.wait(() => node.entries())).find(entry => entry.seq === seq)!;
    };
    const exported = await send(sender);
    const admitted = (await life.wait(() => receiver.entries())).find(entry => entry.input.type === "delivery" && entry.input.from.at.scope === sender.name && entry.input.from.seq === exported.seq)!;
    expect(admitted.input).toMatchObject({ type: "delivery", decision: "applied", from: { at: senderAt, seq: exported.seq, hash: entryHash(exported) } });
    expect(await life.wait(() => receiver.item(0))).toMatchObject({ values: { count: 7 }, refs: { admittedSender: senderAt } });
    const { time: beforeTime, ...before } = (await life.wait(() => receiver.summary())).value;
    expect(beforeTime).toBeDefined();
    const beforeEntries = await life.wait(() => receiver.entries());
    const rejectedExport = await send(other);
    expect(rejectedExport.sends[0]!.message).toEqual(exported.sends[0]!.message);
    const afterEntries = await life.wait(() => receiver.entries());
    expect(afterEntries).toHaveLength(beforeEntries.length + 1);
    const refused = afterEntries.at(-1)!;
    const reason = { code: "guard-failed", name: "not-the-sender" };
    expect(refused.input).toMatchObject({ type: "delivery", decision: "refused", reason, from: { at: await other.at(), seq: rejectedExport.seq } });
    expect(refused.effects).toEqual([]);
    expect(refused.sends).toHaveLength(1);
    expect(refused.sends[0]).toMatchObject({ to: await other.at(), message: { class: "result", outcome: "refused", reason } });
    expect((await life.wait(() => other.entries())).at(-1)!.input).toMatchObject({ type: "delivery",
      message: { class: "result", outcome: "refused", reason, of: { from: { at: await other.at(), seq: rejectedExport.seq } } } });
    const { time: afterTime, ...after } = (await life.wait(() => receiver.summary())).value;
    expect(afterTime).toBeDefined();
    expect(after).toEqual(before);

    const issued = await life.owner.required(() => requestSession("https://scopes.test", receiving.M.name,
      sessionRequest(receiving.membership, vic.secret, soon(60), "TEST-cross-room-read"), { fetch: routed }));
    if (!issued.ok) throw Error("Receiving membership must issue its actual read session.");
    const read = (scope: string, suffix: string) => life.owner.required(async () => {
      const response = await nativeWorker.fetch(new Request(`https://scopes.test/v1/scopes/${scope}${suffix}`, { headers: { authorization: issued.session.reader() } }), bindings);
      return { status: response.status, body: await response.json() as { value?: unknown } };
    });
    for (const entry of [admitted, refused]) {
      expect((await read(receiver.name, `/entries/${entry.seq}`)).status).toBe(200);
      const input = entry.input;
      if (input.type !== "delivery") throw Error("Expected the retained delivery.");
      const use = entry.uses.find(use => use.fact.at.scope === input.from.at.scope && use.fact.seq === input.from.seq);
      if (!use) throw Error("The deciding entry must retain the verified source entry.");
      const retained = await read(receiver.name, `/retained/entry/${encodeURIComponent(use.content)}`);
      expect(retained.status).toBe(200);
      expect(retained.body.value).toMatchObject({ kind: "entry", bytes: canonicalize(input.from.at.scope === sender.name ? exported : rejectedExport) });
    }
    // A reference carried by that entry grants no general access to its room.
    for (const scope of [sender.name, other.name, sending.M.name, sending.D.name, sending.A.name, sending.G.name]) {
      for (const path of ["", "/history", "/entries/0"]) expect((await read(scope, path)).status).toBe(403);
    }
    expect((await read(sender.name, `/entries/${privateSeq}`)).status).toBe(403);
    expect((await read(sender.name, `/entries/${exported.seq}`)).status).toBe(403);
    expect((await read(sending.M.name, "/items/member")).status).toBe(403);
    expect((await read(receiver.name, "")).status).toBe(200);
  } finally { life.release(); }
});
