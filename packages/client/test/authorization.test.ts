/**
 * Ordering, retention and real-source fill evidence of step E4, on each custody store with an authorization port: the memory
 * store, and the browser store over the IndexedDB STAND-IN of `support/browser-idb.ts`. The stand-in proves no native
 * transaction atomicity or durability; the real browser path is a witness.
 */
import { describe, expect, test } from "vitest";
import type { Digest } from "@generalbusiness/dap-contract";
import { canonicalize, timeOf } from "@generalbusiness/dap-bytes";
import { AuthorizationTransaction, type RetainAuthorization } from "../src/authorization.ts";
import { Custody, identityId, memoryStore, type ClientCustodyStore } from "../src/custody.ts";
import type { AuthorizationPort } from "../src/authorization-store.ts";
import { memoryDrafts } from "../src/draft-store.ts";
import { scopeClient, request, clientReplica } from "../src/scope-client.ts";
import { actVersion } from "../src/scope.ts";
import { variant } from "@generalbusiness/dap-derive/testing";
import { citing } from "./replica-support.ts";
import { requestDescriptors, checkSigningAuthorizations, requestScene } from "./request-support.ts";
import { origin } from "./support/browser-idb.ts";

type Opened = { store: ClientCustodyStore & { authorizations: AuthorizationPort }; records(): ReadonlyMap<string, string> };
/** The custody text of each record a store holds, live or archived, read past the store's own interface. */
const browserRecords = (o: ReturnType<typeof origin>): ReadonlyMap<string, string> => {
  const rows = (name: string): [string, unknown][] => { try { return [...o.raw(name)]; } catch { return []; } };
  return new Map([...rows("records"), ...rows("archive")].map(([id, row]) => [id, (row as { text: string }).text]));
};
const stores: { name: string; open(): Opened }[] = [
  { name: "memory store", open: () => { const store = memoryStore(); return { store, records: () => store.records }; } },
  { name: "browser store (IndexedDB stand-in)", open: () => { const o = origin(); return { store: o.tab(), records: () => browserRecords(o) }; } },
];
const audit = (opened: Opened): { authorizations: AuthorizationPort; records: ReadonlyMap<string, string> } =>
  ({ authorizations: opened.store.authorizations, records: opened.records() });

describe.each(stores)("$name", ({ open }) => {
  test("an invalid last step commits none of an authorization batch under the shared store fence", async () => {
    const s = requestScene(), opened = open(), { store } = opened; let writes = 0;
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
    expect(opened.records().size).toBe(0);
  });

  test("one authorization key holds versions of one kind, and a version of another kind stops before any digest is compared", async () => {
    const s = requestScene(), opened = open(), { store } = opened, descriptors = requestDescriptors(s.handle.definition);
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
      const s = requestScene(), opened = open(), { store } = opened; let calls = 0, fail = true;
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
        await checkSigningAuthorizations(s, audit(opened));
      } finally { client.close(); }
    }
  });

  test("one unsigned instance batch fills from its real recorded source and signs the same retained position", async () => {
    const s = requestScene(), opened = open(), { store } = opened;
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
      expect(opened.records().size).toBe(0);
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
      await checkSigningAuthorizations(s, audit(opened));
    } finally { client.close(); }
  });

  test("three retained steps wait for their exact preceding signed records", async () => {
    const s = requestScene(), opened = open(), { store } = opened;
    const client = scopeClient(s.handle, { signer: s.signer,
      member: { service: "https://sequence.test", membership: s.actor.member.membership,
        member: s.actor.member.member, principal: s.actor.principal },
      store, drafts: memoryDrafts(), observe: s.feed.observe, clock: s.clock, lifetimeSeconds: 60 });
    const gate = () => {
      let entered!: () => void, release!: () => void;
      return { entered: new Promise<void>(resolve => { entered = resolve; }), hit: () => entered(),
        allowed: new Promise<void>(resolve => { release = resolve; }), release: () => release() };
    };
    const offerGate = gate(), assignGate = gate(), offerRead = gate(), assignRead = gate();
    const originalRead = store.read.bind(store);
    let watch = false;
    store.read = async id => {
      const value = await originalRead(id);
      if (watch && id === identityId({ service: "https://sequence.test", membership: s.actor.member.membership,
        signer: s.signer.key, target: s.handle.at, key: "chain-offer" })) offerRead.hit();
      if (watch && id === identityId({ service: "https://sequence.test", membership: s.actor.member.membership,
        signer: s.signer.key, target: s.handle.at, key: "chain-assign" })) assignRead.hit();
      return value;
    };
    s.inspectCopies(async signed => {
      const key = signed.intent.idempotencyKey;
      if (key === "chain-offer") { offerGate.hit(); await offerGate.allowed; }
      if (key === "chain-assign") { assignGate.hit(); await assignGate.allowed; }
    });
    try {
      s.feed.current(s.scope); await client.read();
      const offer = { kind: "offer", on: null, fields: { intent: 0 }, expected: { intent: s.scope.item(0).revision } };
      const offerSource = { key: "chain-offer", version: actVersion(offer) }, output = { output: offerSource };
      const assign = { kind: "assign", on: output, fields: { performer: s.actor.member }, expected: { on: { after: offerSource } } };
      const assignSource = { key: "chain-assign", version: actVersion(assign) };
      const report = { kind: "report", on: null, fields: { commitment: output }, expected: { commitment: { after: assignSource } } };
      const held = await client.retainAuthorizations([{ key: offerSource.key, act: offer }, { key: assignSource.key, act: assign }, { key: "chain-report", act: report }]);
      const before = s.signs(), first = client.sendAuthorization(held[0]!);
      await offerGate.entered;
      watch = true;
      const middle = client.sendAuthorization(held[1]!), last = client.sendAuthorization(held[2]!);
      await Promise.all([offerRead.entered, assignRead.entered]);
      expect(s.signs()).toBe(before + 1);
      // A real unrelated entry advances the head, so the predicted opening ID moves.
      const intervening = s.scope.did(s.actor, "link", { fields: { target: s.handle.at, about: 0 } });
      offerGate.release();
      const firstResult = await first;
      expect("answer" in firstResult && firstResult.answer.answer).toBe("accepted");
      await assignGate.entered;
      expect(s.signs()).toBe(before + 2);
      const source = clientReplica(client).accepted(s.signer.key, offerSource.key);
      if (!source || source.opened === null) return expect.fail("offer must be checked");
      expect(source.opened).toBe(intervening.seq + 1);
      assignGate.release();
      const assigned = await middle, reported = await last;
      expect("answer" in assigned && assigned.answer.answer).toBe("accepted");
      expect("answer" in reported && reported.answer.answer).toBe("accepted");
      const entries = s.copies.filter(copy => copy.intent.idempotencyKey.startsWith("chain-"));
      expect(entries.map(copy => copy.intent.kind)).toEqual(["offer", "assign", "report"]);
      expect(entries[1]!.intent.on).toBe(source.opened);
      expect(entries[2]!.intent.fields["commitment"]).toBe(source.opened);
      const assignFact = clientReplica(client).authorizationSource(s.signer.key, assignSource.key);
      expect(entries[2]!.intent.expected["commitment"]).toBe(assignFact?.revisions[source.opened]);
      await checkSigningAuthorizations(s, audit(opened));
    } finally { offerGate.release(); assignGate.release(); client.close(); }
  });

  test("a pending via selector stops before either store changes, while its recorded subject uses the ordinary path", async () => {
    const definition = variant(citing, d => {
      d.acts.assign.also = { intent: { item: "intent", via: { of: "on", slot: "intent" } } };
    });
    const s = requestScene(definition), opened = open(), { store } = opened;
    const client = scopeClient(s.handle, { signer: s.signer,
      member: { service: "https://via.test", membership: s.actor.member.membership,
        member: s.actor.member.member, principal: s.actor.principal },
      store, drafts: memoryDrafts(), observe: s.feed.observe, clock: s.clock });
    try {
      s.feed.current(s.scope); await client.read();
      const open = { kind: "offer", on: null, fields: { intent: 0 }, expected: { intent: s.scope.item(0).revision } };
      const source = { key: "via-open", version: actVersion(open) };
      const before = await store.authorizations.read(s.signer.key, s.handle.at), records = [...opened.records()], signs = s.signs(), posts = s.copies.length;
      await expect(client.retainAuthorizations([{ key: "via-open", act: open }, { key: "via-dependent", act: {
        kind: "assign", on: { output: source }, fields: { performer: s.actor.member },
        expected: { on: { after: source }, intent: s.scope.item(0).revision },
      } }])).rejects.toMatchObject({ reason: "source" });
      expect(await store.authorizations.read(s.signer.key, s.handle.at)).toEqual(before);
      expect([...opened.records()]).toEqual(records); expect([s.signs(), s.copies.length]).toEqual([signs, posts]);
      const [held] = await client.retainAuthorizations([{ key: "via-open", act: open }]);
      await client.sendAuthorization(held!);
      const entry = clientReplica(client).accepted(s.signer.key, "via-open");
      if (!entry || entry.opened === null) expect.fail("the real source must be checked before via selection");
      const answer = await client.submitBoundAct({ key: "via-dependent", owner: s.signer.key, scope: s.handle.at }, {
        kind: "assign", on: entry.opened, fields: { performer: s.actor.member },
        expected: { on: s.scope.item(entry.opened).revision, intent: s.scope.item(0).revision },
      });
      expect("answer" in answer && answer.answer.answer).toBe("accepted");
      await checkSigningAuthorizations(s, audit(opened));
    } finally { client.close(); }
  });


  test("unsigned retention owns the whole input batch before an authorization read waits", async () => {
    const s = requestScene(), opened = open(), { store } = opened;
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
      expect(opened.records().size).toBe(0); expect(s.copies).toEqual([]); expect(s.signs()).toBe(0);
    } finally { release(); store.authorizations.read = read; client.close(); }
  });


  test("64 unsigned positions retain history and the next gesture stops without a write", async () => {
    const s = requestScene(), opened = open(), { store } = opened; let writes = 0;
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
      expect(opened.records().size).toBe(0); expect(s.signs()).toBe(0); expect(s.copies).toEqual([]);
      const [next] = await client.retainAuthorizations([{ ...input, key: "new-request-key" }]);
      expect(next!.position).toBe(0); expect((await store.authorizations.read(s.signer.key, s.handle.at))[0]).toEqual(before[0]);
    } finally { client.close(); }
  });
});

// Invariant (E4-B item 2, ruling 34791662): the authorization write commits before the custody write, under one fence. A
// reload between the two leaves a permission mark with no signing, and the retry after the reload stops `authorization-used`.
test("browser store (IndexedDB stand-in): a reload between the authorization write and the custody write keeps the mark, and the retry stops authorization-used", async () => {
  const s = requestScene(), o = origin(), member = { service: "https://reload.test", membership: s.actor.member.membership,
    member: s.actor.member.member, principal: s.actor.principal };
  let calls = 0;
  const signer = { key: s.signer.key, sign: async (bytes: Uint8Array) => { calls++; return s.signer.sign(bytes); } };
  const first = o.tab();
  // The tab reloads at the custody write: its connection closes and the write never starts.
  first.write = async () => { first.close(); throw new Error("TEST reload before the custody write"); };
  const before = scopeClient(s.handle, { signer, member, store: first, drafts: memoryDrafts(), observe: s.feed.observe, clock: s.clock, lifetimeSeconds: 60 });
  s.feed.current(s.scope); await before.read();
  const [held] = await before.retainAuthorizations([{ key: "reload", act: { kind: "remark", on: 0, fields: { text: "kept across a reload" }, expected: {} } }]);
  await expect(before.sendAuthorization(held!)).rejects.toThrow();
  before.close();
  expect(calls).toBe(1); expect(s.copies).toEqual([]);
  const second = o.tab();
  const after = scopeClient(s.handle, { signer, member, store: second, drafts: memoryDrafts(), observe: s.feed.observe, clock: s.clock, lifetimeSeconds: 60 });
  try {
    s.feed.current(s.scope); await after.read();
    const [row] = await second.authorizations.read(s.signer.key, s.handle.at);
    expect(row!.permissions.map(permission => permission.position)).toEqual([0]);
    expect(browserRecords(o).size).toBe(0);
    await expect(after.sendAuthorization(held!)).rejects.toMatchObject({ reason: "authorization-used" });
    expect(calls).toBe(1); expect(s.copies).toEqual([]); expect(browserRecords(o).size).toBe(0);
  } finally { after.close(); second.close(); }
});
