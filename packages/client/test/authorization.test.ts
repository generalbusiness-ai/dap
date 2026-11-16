/** Memory-store ordering/retention and real-source fill evidence; no browser durability claim. */
import { expect, test } from "vitest";
import type { Digest } from "@generalbusiness/dap-contract";
import { canonicalize, timeOf } from "@generalbusiness/dap-bytes";
import { AuthorizationTransaction, type RetainAuthorization } from "../src/authorization.ts";
import { Custody, memoryStore } from "../src/custody.ts";
import { memoryDrafts } from "../src/draft-store.ts";
import { scopeClient, request, clientReplica } from "../src/scope-client.ts";
import { actVersion } from "../src/scope.ts";
import { variant } from "@generalbusiness/dap-derive/testing";
import { citing } from "./replica-support.ts";
import { requestDescriptors, checkSigningAuthorizations, requestScene } from "./request-support.ts";

test("an invalid last step commits none of an authorization batch under the shared store fence", async () => {
  const s = requestScene(), store = memoryStore(); let writes = 0;
  const write = store.authorizations.write.bind(store.authorizations);
  store.authorizations.write = async (...args) => { writes++; return write(...args); };
  const transaction = () => new AuthorizationTransaction(store.authorizations,
    { owner: s.signer.key, scope: s.handle.at, definition: s.handle.digest, descriptors: requestDescriptors(s.handle.definition) });
  s.scope.did(s.actor, "remark", { on: 0, fields: { text: "real cause" } });
  const pending: RetainAuthorization = { key: "pending", act: { kind: "remark", on: 0, fields: { text: "pending" }, expected: {} },
    sources: [], subjects: [{ name: "on", item: 0 }] };
  const independent: RetainAuthorization = { key: "independent", act: { kind: "link", on: null,
    fields: { target: s.handle.at, about: 0 }, expected: {} }, sources: [], subjects: [] };
  const observed: RetainAuthorization = { key: "stale-observed", act: { kind: "cite", on: 0,
    fields: { cause: s.scope.fact(s.scope.head.seq) }, expected: { on: s.scope.item(0).revision } },
    sources: [], subjects: [{ name: "on", item: 0 }] };
  await store.exclusive(async () => {
    const tx = transaction(); await tx.retain([pending], s.now(), 60, async () => true); await tx.commit();
  });
  const before = await store.authorizations.read(s.signer.key, s.handle.at), count = writes;
  const result = await store.exclusive(async () => {
    const tx = transaction();
    await tx.retain([independent, observed], s.now(), 60, async () => true);
    await tx.commit();
  }).catch((error: unknown) => error);
  expect(result).toMatchObject({ reason: "busy" });
  expect(writes).toBe(count);
  expect(await store.authorizations.read(s.signer.key, s.handle.at)).toEqual(before);
  expect(store.records.size).toBe(0);
});

test("one authorization key holds versions of one kind, and a version of another kind stops before any digest is compared", async () => {
  const s = requestScene(), store = memoryStore(), descriptors = requestDescriptors(s.handle.definition);
  const transaction = (held: Readonly<Record<string, Digest>>) => new AuthorizationTransaction(store.authorizations,
    { owner: s.signer.key, scope: s.handle.at, definition: s.handle.digest, descriptors: held });
  const remark: RetainAuthorization = { key: "one", act: { kind: "remark", on: 0, fields: { text: "first" }, expected: {} },
    sources: [], subjects: [{ name: "on", item: 0 }] };
  const link: RetainAuthorization = { key: "one", act: { kind: "link", on: null, fields: { target: s.handle.at, about: 0 }, expected: {} },
    sources: [], subjects: [] };
  await store.exclusive(async () => {
    const tx = transaction(descriptors); await tx.retain([remark], s.now(), 60, async () => true); await tx.commit();
  });
  const before = await store.authorizations.read(s.signer.key, s.handle.at);
  // Every digest of this namespace differs from the retained row, so a digest comparison would stop with `descriptor-mismatch`.
  const other: Digest = `sha256:${"e".repeat(64)}`;
  const elsewhere = Object.fromEntries(Object.keys(descriptors).map(kind => [kind, other]));
  const result = await store.exclusive(async () => {
    const tx = transaction(elsewhere); await tx.retain([link], s.now(), 60, async () => true); await tx.commit();
  }).catch((error: unknown) => error);
  expect(result).toMatchObject({ reason: "version" });
  expect(await store.authorizations.read(s.signer.key, s.handle.at)).toEqual(before);
});

test("a failed signer or uncertain custody write keeps one permission and never calls that position again", async () => {
  for (const fault of ["signer", "before-persist", "after-persist"] as const) {
    const s = requestScene(), store = memoryStore(); let calls = 0, fail = true;
    const write = store.write.bind(store);
    store.write = async (...args) => {
      if (fault !== "signer" && fail) {
        fail = false;
        if (fault === "after-persist") await write(...args);
        throw new Error("TEST custody write stopped");
      }
      return write(...args);
    };
    const client = scopeClient(s.handle, {
      signer: { key: s.signer.key, sign: async bytes => {
        calls++; if (fault === "signer" && fail) { fail = false; throw new Error("TEST signer stopped"); }
        return s.signer.sign(bytes);
      } },
      member: { service: "https://authorization.test", membership: s.actor.member.membership,
        member: s.actor.member.member, principal: s.actor.principal },
      store, drafts: memoryDrafts(), observe: s.feed.observe, clock: s.clock, lifetimeSeconds: 60 });
    try {
      s.feed.current(s.scope); await client.read(); s.mode("unavailable");
      await request(client, "uncertain", "remark", { on: 0, fields: { text: "kept gesture" } }).catch(() => null);
      expect(calls).toBe(1); expect(s.copies).toEqual([]);
      const [row] = await store.authorizations.read(s.signer.key, s.handle.at);
      expect(row!.versions).toHaveLength(1); expect(row!.permissions).toHaveLength(1);
      const identity = { key: row!.key, owner: row!.owner, scope: row!.scope };
      const retry = await store.exclusive(async () => {
        const tx = new AuthorizationTransaction(store.authorizations,
          { owner: row!.owner, scope: row!.scope, definition: row!.definition, descriptors: { [row!.versions[0]!.act.kind]: row!.descriptor } });
        return tx.permit(identity, 0, s.now());
      }).catch((error: unknown) => error);
      expect(retry).toMatchObject({ reason: "authorization-used" }); expect(calls).toBe(1);
      const custody = new Custody(store, () => timeOf(s.now()));
      const actual = await custody.find({ service: "https://authorization.test", membership: s.actor.member.membership,
        signer: s.signer.key, target: s.handle.at, key: row!.key });
      expect(actual?.phase ?? null).toBe(fault === "after-persist" ? "prepared" : null);
      const kept = actual?.envelope;
      // Every row is a new member gesture, including a real write that persisted before throwing.
      await client.submitBoundAct(identity, { kind: "remark", on: 0, fields: { text: "kept gesture" }, expected: {} });
      const [next] = await store.authorizations.read(s.signer.key, s.handle.at);
      expect(next!.versions).toHaveLength(2); expect(next!.permissions).toHaveLength(2); expect(calls).toBe(2);
      const after = (await custody.find({ service: "https://authorization.test", membership: s.actor.member.membership,
        signer: s.signer.key, target: s.handle.at, key: row!.key }))!;
      expect(after.signings.at(-1)!.authorization?.position).toBe(1);
      if (kept) {
        expect(after.signings).toHaveLength(2);
        expect(after.signings[0]!.envelope).toEqual(kept);
        expect(after.signings[0]!.authorization?.position).toBe(0);
      }
      await checkSigningAuthorizations(s, store);
    } finally { client.close(); }
  }
});

test("one unsigned instance batch fills from its real recorded source and signs the same retained position", async () => {
  const s = requestScene(), store = memoryStore();
  const client = scopeClient(s.handle, { signer: s.signer,
    member: { service: "https://fill.test", membership: s.actor.member.membership,
      member: s.actor.member.member, principal: s.actor.principal },
    store, drafts: memoryDrafts(), observe: s.feed.observe, clock: s.clock, lifetimeSeconds: 60 });
  try {
    s.feed.current(s.scope); await client.read();
    const open = { kind: "offer", on: null, fields: { intent: 0 }, expected: { intent: s.scope.item(0).revision } };
    const source = { key: "open", version: actVersion(open) }, output = { output: source };
    const dependent = { kind: "assign", on: output, fields: { performer: s.actor.member }, expected: { on: { after: source } } };
    const signs = s.signs(), posts = s.copies.length;
    const held = await client.retainAuthorizations([{ key: "open", act: open }, { key: "dependent", act: dependent }]);
    expect(held.map(row => row.position)).toEqual([0, 0]);
    const unsigned = await store.authorizations.read(s.signer.key, s.handle.at);
    expect(unsigned.map(row => row.versions.length)).toEqual([1, 1]);
    expect(unsigned.find(row => row.key === "dependent")!.versions[0]!.after).toEqual([source]);
    expect(unsigned.every(row => row.permissions.length === 0 && row.materializations.length === 0)).toBe(true);
    expect(store.records.size).toBe(0);
    expect([s.signs(), s.copies.length]).toEqual([signs, posts]);

    const first = await client.sendAuthorization(held[0]!);
    expect("answer" in first && first.answer.answer).toBe("accepted");
    const entry = clientReplica(client).accepted(s.signer.key, "open");
    if (!entry || entry.opened === null) expect.fail("the real offer must open its recorded commitment");
    const revision = s.scope.item(entry.opened).revision;
    const beforeFill = [s.signs(), s.copies.length];
    const act = await client.fillAuthorization(held[1]!);
    expect(act.on).toBe(entry.opened); expect(act.expected).toEqual({ on: revision });
    expect(await client.fillAuthorization(held[1]!)).toEqual(act);
    const row = (await store.authorizations.read(s.signer.key, s.handle.at)).find(value => value.key === "dependent")!;
    expect(row.versions[0]!.act.on).toEqual(output);
    expect(row.versions[0]!.act.expected).toEqual({ on: { after: source } });
    expect(row.materializations).toHaveLength(1); expect(row.permissions).toEqual([]);
    expect([s.signs(), s.copies.length]).toEqual(beforeFill);
    expect(canonicalize(row.versions[0]!.act)).toContain("output");
    const second = await client.sendAuthorization(held[1]!);
    expect("answer" in second && second.answer.answer).toBe("accepted");
    expect(clientReplica(client).accepted(s.signer.key, "dependent")).not.toBeNull();
    expect(s.scope.item(entry.opened).revision).not.toBe(revision);
    // The checked source's post-entry revisions do not move with the later accepted assign.
    expect(clientReplica(client).authorizationSource(s.signer.key, "open")!.revisions[entry.opened]).toBe(revision);
    expect(await client.fillAuthorization(held[1]!)).toEqual(act);
    expect(second.record.signings).toHaveLength(1);
    expect(second.record.signings[0]!.authorization?.position).toBe(held[1]!.position);
    expect(second.record.envelope.signed.intent.expected).toEqual({ on: revision });
    const final = (await store.authorizations.read(s.signer.key, s.handle.at)).find(value => value.key === "dependent")!;
    expect(final.versions).toHaveLength(1); expect(final.permissions).toHaveLength(1);
    const count = [s.signs(), s.copies.length], head = s.scope.head;
    const reopened = await client.sendAuthorization(held[1]!);
    expect("answer" in reopened && reopened.answer.answer).toBe("accepted");
    expect([s.signs(), s.copies.length]).toEqual(count); expect(s.scope.head).toEqual(head);
    await checkSigningAuthorizations(s, store);
  } finally { client.close(); }
});

test("a pending via selector stops before either store changes, while its recorded subject uses the ordinary path", async () => {
  const definition = variant(citing, d => {
    d.acts.assign.also = { intent: { item: "intent", via: { of: "on", slot: "intent" } } };
  });
  const s = requestScene(definition), store = memoryStore();
  const client = scopeClient(s.handle, { signer: s.signer,
    member: { service: "https://via.test", membership: s.actor.member.membership,
      member: s.actor.member.member, principal: s.actor.principal },
    store, drafts: memoryDrafts(), observe: s.feed.observe, clock: s.clock });
  try {
    s.feed.current(s.scope); await client.read();
    const open = { kind: "offer", on: null, fields: { intent: 0 }, expected: { intent: s.scope.item(0).revision } };
    const source = { key: "via-open", version: actVersion(open) };
    const before = await store.authorizations.read(s.signer.key, s.handle.at), records = [...store.records], signs = s.signs(), posts = s.copies.length;
    await expect(client.retainAuthorizations([{ key: "via-open", act: open }, { key: "via-dependent", act: {
      kind: "assign", on: { output: source }, fields: { performer: s.actor.member },
      expected: { on: { after: source }, intent: s.scope.item(0).revision },
    } }])).rejects.toMatchObject({ reason: "source" });
    expect(await store.authorizations.read(s.signer.key, s.handle.at)).toEqual(before);
    expect([...store.records]).toEqual(records); expect([s.signs(), s.copies.length]).toEqual([signs, posts]);
    const [held] = await client.retainAuthorizations([{ key: "via-open", act: open }]);
    await client.sendAuthorization(held!);
    const entry = clientReplica(client).accepted(s.signer.key, "via-open");
    if (!entry || entry.opened === null) expect.fail("the real source must be checked before via selection");
    const answer = await client.submitBoundAct({ key: "via-dependent", owner: s.signer.key, scope: s.handle.at }, {
      kind: "assign", on: entry.opened, fields: { performer: s.actor.member },
      expected: { on: s.scope.item(entry.opened).revision, intent: s.scope.item(0).revision },
    });
    expect("answer" in answer && answer.answer.answer).toBe("accepted");
    await checkSigningAuthorizations(s, store);
  } finally { client.close(); }
});


test("unsigned retention owns the whole input batch before an authorization read waits", async () => {
  const s = requestScene(), store = memoryStore();
  const client = scopeClient(s.handle, { signer: s.signer,
    member: { service: "https://batch.test", membership: s.actor.member.membership,
      member: s.actor.member.member, principal: s.actor.principal },
    store, drafts: memoryDrafts(), observe: s.feed.observe, clock: s.clock });
  const read = store.authorizations.read.bind(store.authorizations);
  let entered!: () => void, release!: () => void, armed = true;
  const started = new Promise<void>(done => { entered = done; });
  const allowed = new Promise<void>(done => { release = done; });
  try {
    s.feed.current(s.scope); await client.read();
    store.authorizations.read = async (...args) => { if (armed) { armed = false; entered(); await allowed; } return read(...args); };
    const batch = [{ key: "owned-first", act: { kind: "remark", on: 0, fields: { text: "first original" }, expected: {} } },
      { key: "owned-second", act: { kind: "remark", on: 0, fields: { text: "second original" }, expected: {} } }];
    const retained = client.retainAuthorizations(batch);
    await started;
    batch[0]!.key = "mutated-key"; batch[0]!.act.fields.text = "mutated text";
    batch.push({ key: "late-added", act: { kind: "remark", on: 0, fields: { text: "late" }, expected: {} } });
    release(); const positions = await retained;
    expect(positions.map(value => value.identity.key)).toEqual(["owned-first", "owned-second"]);
    const rows = await read(s.signer.key, s.handle.at);
    expect(rows.map(value => value.key)).toEqual(["owned-first", "owned-second"]);
    expect(rows[0]!.versions[0]!.act.fields).toEqual({ text: "first original" });
    expect(rows[1]!.versions[0]!.act.fields).toEqual({ text: "second original" });
    expect(rows.every(value => value.permissions.length === 0)).toBe(true);
    expect(store.records.size).toBe(0); expect(s.copies).toEqual([]); expect(s.signs()).toBe(0);
  } finally { release(); store.authorizations.read = read; client.close(); }
});


test("64 unsigned positions retain history and the next gesture stops without a write", async () => {
  const s = requestScene(), store = memoryStore(); let writes = 0;
  const write = store.authorizations.write.bind(store.authorizations);
  store.authorizations.write = async (...args) => { writes++; return write(...args); };
  const client = scopeClient(s.handle, { signer: s.signer,
    member: { service: "https://bound.test", membership: s.actor.member.membership,
      member: s.actor.member.member, principal: s.actor.principal },
    store, drafts: memoryDrafts(), observe: s.feed.observe, clock: s.clock });
  try {
    s.feed.current(s.scope); await client.read();
    const input = { key: "bounded", act: { kind: "remark", on: 0, fields: { text: "same content" }, expected: {} } };
    for (let position = 0; position < 64; position++) {
      const [held] = await client.retainAuthorizations([input]); expect(held!.position).toBe(position);
    }
    const before = await store.authorizations.read(s.signer.key, s.handle.at), count = writes;
    expect(before[0]!.versions).toHaveLength(64); expect(before[0]!.permissions).toEqual([]);
    await expect(client.retainAuthorizations([input])).rejects.toMatchObject({ reason: "versions-full" });
    expect(writes).toBe(count); expect(await store.authorizations.read(s.signer.key, s.handle.at)).toEqual(before);
    expect(store.records.size).toBe(0); expect(s.signs()).toBe(0); expect(s.copies).toEqual([]);
    const [next] = await client.retainAuthorizations([{ ...input, key: "new-request-key" }]);
    expect(next!.position).toBe(0); expect((await store.authorizations.read(s.signer.key, s.handle.at))[0]).toEqual(before[0]);
  } finally { client.close(); }
});
