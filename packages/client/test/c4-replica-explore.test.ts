/** Real native-judged birth and production Core/Reads/session/Replica. The
 * bootstrap host replies, local routing, fixed clock, and feed notices are
 * labelled fixtures; no hosted admission or browser persistence runs here. */
import { expect, test } from "vitest";
import type { Answer } from "@generalbusiness/dap-contract";
import { canonicalize, timeOf } from "@generalbusiness/dap-bytes";
import { lending } from "../../../examples/lending/definition.ts";
import { type AskedOf, type Kind } from "../src/declared.ts";
import { Custody, memoryStore } from "../src/custody.ts";
import type { BoundAct } from "../src/act-types.ts";
import { scopeClient, clientIdle } from "../src/scope-client.ts";
import { exploreClient } from "../src/replica-explore.ts";
import { Feed } from "./replica-support.ts";
import { c4Runtime, c4SelectionRuntime } from "./support/c4-runtime.ts";
import { selection } from "./support/c4-selection.ts";

function opened(answer: Answer): number {
  expect(answer.answer).toBe("accepted");
  if (answer.answer !== "accepted") return expect.fail("the real Native scope must accept the setup act");
  const effect = answer.receipt.effects.find(effect => effect.effect === "open");
  if (!effect || effect.effect !== "open") return expect.fail("the actual receipt must name its opened item");
  return effect.item;
}

// Invariant: stale observed basis is determinate before authority, while an
// unchanged basis lacks authority locally and can still record through Native.
test("a real issued-session Replica finds moved Lending basis without signing and leaves unchanged basis to Native", async () => {
  const runtime = await c4Runtime(), store = memoryStore(), feed = new Feed();
  let custodyWrites = 0, authorizationWrites = 0;
  const writeCustody = store.write.bind(store), writeAuthorization = store.authorizations.write.bind(store.authorizations);
  store.write = async (...args) => { custodyWrites++; return writeCustody(...args); };
  store.authorizations.write = async (...args) => { authorizationWrites++; return writeAuthorization(...args); };
  const client = scopeClient(runtime.handle, {
    signer: runtime.signer,
    member: { service: runtime.service, ...runtime.member, principal: null },
    store, drafts: { read: async () => [], write: async () => {}, observe: () => () => {} }, observe: feed.observe,
    clock: runtime.clock, exploration: runtime.readInputs,
  });
  const did = async <K extends Kind<typeof lending>>(key: string, kind: K, asked: AskedOf<typeof lending, K>): Promise<Answer> => {
    const packet = await runtime.handle.intent(runtime.signer, kind, asked,
      { now: runtime.now(), idempotencyKey: key, lifetimeSeconds: 60 });
    const answer = await runtime.handle.submit(packet.signed, [], packet.beside);
    expect(answer.answer).toBe("accepted");
    return answer;
  };
  try {
    // Notices only announce availability. Every row below still comes from
    // authenticated production Reads and the complete checked journal.
    feed.emit({ status: "streaming" });
    await client.read(); await clientIdle(client);
    expect(client.view.state).toEqual({ is: "current" });
    expect(runtime.session.claims).toMatchObject({ key: runtime.signer.key,
      membership: runtime.membership, member: runtime.member.member });
    expect(runtime.counts.sessionRequests).toBe(1);
    expect(runtime.counts.readAuthSignatures).toBe(1);
    expect(runtime.counts.journalReads).toBeGreaterThan(0);
    expect(runtime.store.item(0)).toMatchObject({ type: "library", state: "open",
      parties: { founder: runtime.member }, refs: { destination: runtime.destination } });

    const tool = opened(await did("c4-donate", "donate", { on: null,
      expected: { library: runtime.store.item(0)!.revision },
      fields: { name: "C4 real tool", description: "Native-judged fixture donation",
        page: "shelf/c4-real-tool.md", content: "C4 fixture content" } }));
    const held = opened(await did("c4-first-reserve", "reserve", { on: null, expected: {},
      fields: { tool, day: "2026-11-15", until: timeOf(runtime.now() + 3_600_000) } }));
    await client.read(); await clientIdle(client);
    const observed = client.view.row({ item: held });
    if (!observed) return expect.fail("the checked Replica must hold the actual reservation");
    expect(observed).toMatchObject({ type: "reservation", state: "held", parties: { holder: runtime.member } });
    const stale: BoundAct<typeof lending, "release"> = {
      kind: "release", on: held, fields: {}, expected: { on: observed.revision },
    };
    const originalStale = structuredClone(stale);

    // A real later release changes the reservation. No timestamp or entry is
    // patched to simulate movement, and the reservation stays before expiry.
    await did("c4-other-release", "release", { on: held, fields: {}, expected: { on: observed.revision } });
    await client.read(); await clientIdle(client);
    const moved = client.view.row({ item: held });
    if (!moved) return expect.fail("the final reservation must remain in the checked Replica");
    expect(moved.state).toBe("released");
    expect(moved.revision).toBeGreaterThan(observed.revision);
    const beforeMoved = { head: structuredClone(runtime.store.scope()!.head),
      state: canonicalize(runtime.store.all()), counts: { ...runtime.counts },
      custodyWrites, authorizationWrites, custody: [...store.records],
      authorizations: await store.authorizations.read(runtime.signer.key, runtime.at) };
    const refused = await exploreClient<typeof lending, "release">(client, "c4-stale-release", stale);
    expect(refused.exploration).toMatchObject({ is: "refused", reason: "revision-moved",
      context: { head: beforeMoved.head, scope: runtime.at, definition: runtime.handle.digest,
        actor: runtime.signer.key, standing: null, assumes: [], evidence: [] } });
    expect(refused.movement).toEqual({ head: beforeMoved.head,
      now: { name: held, seen: moved.revision, assumes: [] },
      subjects: { on: { is: "present", ref: { name: held, seen: moved.revision, assumes: [] } } } });
    const returnedCut = structuredClone(refused.movement);
    expect(stale).toEqual(originalStale);
    expect(runtime.store.scope()!.head).toEqual(beforeMoved.head);
    expect(canonicalize(runtime.store.all())).toBe(beforeMoved.state);
    expect(runtime.counts).toEqual(beforeMoved.counts);
    expect([custodyWrites, authorizationWrites]).toEqual([beforeMoved.custodyWrites, beforeMoved.authorizationWrites]);
    expect([...store.records]).toEqual(beforeMoved.custody);
    expect(await store.authorizations.read(runtime.signer.key, runtime.at)).toEqual(beforeMoved.authorizations);

    // Release freed the real holder's one-reservation bound. A new held row
    // supplies the independent unchanged-basis axis in the same actual scope.
    const second = opened(await did("c4-second-reserve", "reserve", { on: null, expected: {},
      fields: { tool, day: "2026-11-16", until: timeOf(runtime.now() + 3_600_000) } }));
    await client.read(); await clientIdle(client);
    // A later real entry and published Client view cannot refresh returned now.
    expect(refused.movement).toEqual(returnedCut);
    expect(refused.movement?.head).toEqual(beforeMoved.head);
    expect(client.view.head!.seq).toBeGreaterThan(beforeMoved.head.seq);
    const current = client.view.row({ item: second });
    if (!current) return expect.fail("the second real reservation must be checked");
    expect(current.state).toBe("held");
    const captured: BoundAct<typeof lending, "release"> = {
      kind: "release", on: second, fields: {}, expected: { on: current.revision },
    };
    const original = structuredClone(captured), head = structuredClone(runtime.store.scope()!.head);
    const beforeUnchanged = { counts: { ...runtime.counts }, custodyWrites, authorizationWrites,
      state: canonicalize(runtime.store.all()) };
    const unavailable = await exploreClient<typeof lending, "release">(client, "c4-current-release", captured);
    expect(unavailable.exploration).toMatchObject({ is: "unavailable", lacks: ["authority-unavailable"],
      context: { head, standing: null, assumes: [], evidence: [] } });
    expect(unavailable.movement).toBeNull();
    expect(captured).toEqual(original);
    expect(runtime.counts).toEqual(beforeUnchanged.counts);
    expect([custodyWrites, authorizationWrites]).toEqual([beforeUnchanged.custodyWrites, beforeUnchanged.authorizationWrites]);
    expect(canonicalize(runtime.store.all())).toBe(beforeUnchanged.state);
    expect(store.records.size).toBe(0);
    expect(await store.authorizations.read(runtime.signer.key, runtime.at)).toEqual([]);

    // This is an explicit ordinary instance gesture after an unavailable
    // exploration, not a C4 draft operation or an admitted local prediction.
    // Sign the persisted capture, never unavailable.act / Explore autofill.
    const key = "c4-current-release", identity = { key, owner: runtime.signer.key, scope: runtime.at };
    const sent = await client.submitBoundAct(identity, captured);
    expect("answer" in sent && sent.answer.answer).toBe("accepted");
    await clientIdle(client);
    expect(runtime.store.item(second)).toMatchObject({ state: "released" });
    expect(runtime.store.scope()!.head.seq).toBe(head.seq + 1);
    expect(runtime.counts.actSignatures).toBe(beforeUnchanged.counts.actSignatures + 1);
    expect(runtime.counts.submissions).toBe(beforeUnchanged.counts.submissions + 1);
    expect(runtime.counts.readAuthSignatures).toBe(beforeUnchanged.counts.readAuthSignatures);
    const custody = new Custody(store, () => timeOf(runtime.now()));
    const kept = await custody.find({ service: runtime.service, membership: runtime.membership,
      signer: runtime.signer.key, target: runtime.at, key });
    expect(kept?.phase).toBe("accepted");
    expect(kept?.envelope.signed.intent).toMatchObject({ kind: captured.kind,
      on: captured.on, fields: captured.fields, expected: captured.expected });
    const [authorization] = await store.authorizations.read(runtime.signer.key, runtime.at);
    expect(authorization?.versions).toHaveLength(1);
    expect(authorization?.versions[0]!.act).toEqual(original);
    expect(captured).toEqual(original);
  } finally {
    // Stop the client and drain its actual queued work before closing SQLite.
    client.close();
    try { await clientIdle(client); } finally { runtime.close(); }
  }
});

// Invariant: actual also movement returns its checked cut, including no
// primary and legitimate absence; a value-slot via returns the actual target.
test("one real selection journey keeps sparse absent basis and returns null-primary and value-via movement", async () => {
  const runtime = await c4SelectionRuntime(), store = memoryStore(), feed = new Feed();
  let custodyWrites = 0, authorizationWrites = 0;
  const writeCustody = store.write.bind(store), writeAuthorization = store.authorizations.write.bind(store.authorizations);
  store.write = async (...args) => { custodyWrites++; return writeCustody(...args); };
  store.authorizations.write = async (...args) => { authorizationWrites++; return writeAuthorization(...args); };
  const client = scopeClient(runtime.handle, {
    signer: runtime.signer,
    member: { service: runtime.service, ...runtime.member, principal: null },
    store, drafts: { read: async () => [], write: async () => {}, observe: () => () => {} }, observe: feed.observe,
    clock: runtime.clock, exploration: runtime.readInputs,
  });
  const did = async <K extends Kind<typeof selection>>(key: string, kind: K, asked: AskedOf<typeof selection, K>): Promise<Answer> => {
    const packet = await runtime.handle.intent(runtime.signer, kind, asked,
      { now: runtime.now(), idempotencyKey: key, lifetimeSeconds: 60 });
    const answer = await runtime.handle.submit(packet.signed, [], packet.beside);
    expect(answer.answer).toBe("accepted");
    return answer;
  };
  const measured = async () => ({ head: structuredClone(runtime.store.scope()!.head),
    state: canonicalize(runtime.store.all()), counts: { ...runtime.counts }, custodyWrites, authorizationWrites,
    custody: [...store.records], authorizations: await store.authorizations.read(runtime.signer.key, runtime.at) });
  try {
    feed.emit({ status: "streaming" });
    await client.read(); await clientIdle(client);
    expect(client.view.state).toEqual({ is: "current" });
    expect(runtime.session.claims).toMatchObject({ key: runtime.signer.key,
      membership: runtime.membership, member: runtime.member.member });
    expect([runtime.counts.sessionRequests, runtime.counts.readAuthSignatures]).toEqual([1, 1]);
    const anchor = client.view.rows("anchor")[0];
    if (!anchor) return expect.fail("the actual judged genesis must open its anchor");
    expect(anchor.values.target).toBeNull();
    expect(anchor.parties["founder"]).toEqual(runtime.member);
    expect(anchor.refs["destination"]).toEqual(runtime.destination);

    // A determined null slot leaves target legitimately unbound. Keep this
    // test-owned sparse capture as serialized data; it is not an implemented DraftPort.
    const sparse: BoundAct<typeof selection, "make-note"> = {
      kind: "make-note", on: null, fields: { label: "note" }, expected: { anchor: anchor.revision },
    };
    const sparseBytes = canonicalize(sparse);
    expect(Object.hasOwn(sparse.expected, "target")).toBe(false);
    expect(Object.hasOwn(sparse.expected, "on")).toBe(false);
    await did("c4-selection-rename", "rename-anchor", { on: anchor.id,
      expected: { on: anchor.revision }, fields: { label: "moved anchor" } });
    await client.read(); await clientIdle(client);
    const renamed = client.view.rows("anchor").find(row => row.id === anchor.id);
    if (!renamed) return expect.fail("the checked anchor must survive its real rename");
    expect(renamed.revision).toBeGreaterThan(anchor.revision);
    const beforeOpen = await measured();
    const openResult = await exploreClient<typeof selection, "make-note">(client, "c4-selection-note", sparse);
    expect(openResult.exploration).toMatchObject({ is: "refused", reason: "revision-moved",
      context: { head: beforeOpen.head, scope: runtime.at, definition: runtime.handle.digest, actor: runtime.signer.key,
        standing: null, assumes: [], evidence: [] } });
    expect(openResult.movement).toEqual({ head: beforeOpen.head, now: null,
      subjects: {
        anchor: { is: "present", ref: { name: anchor.id, seen: renamed.revision, assumes: [] } },
        target: { is: "absent" },
      } });
    expect(canonicalize(sparse)).toBe(sparseBytes);
    expect(await measured()).toEqual(beforeOpen);
    const absentCutBytes = canonicalize(openResult.movement);

    // Real creation and point now determine that value-slot selector. Neither
    // a later read nor a JSON copy may fill the earlier authored omission.
    const target = opened(await did("c4-selection-target", "make-target", { on: null, expected: {}, fields: { n: 0 } }));
    await did("c4-selection-point", "point", { on: anchor.id,
      expected: { on: runtime.store.item(anchor.id)!.revision }, fields: { target } });
    await client.read(); await clientIdle(client);
    const pointed = client.view.rows("anchor").find(row => row.id === anchor.id), initialTarget = client.view.rows("target").find(row => row.id === target);
    if (!pointed || !initialTarget) return expect.fail("actual point and target must reach the checked Replica");
    expect(pointed.values.target).toBe(target);
    expect(Object.hasOwn(pointed.refs, "target")).toBe(false);
    expect(canonicalize(openResult.movement)).toBe(absentCutBytes);
    const copiedSparse: BoundAct<typeof selection, "make-note"> = JSON.parse(sparseBytes);
    expect(copiedSparse).toEqual(sparse);
    expect(Object.hasOwn(copiedSparse.expected, "target")).toBe(false);
    expect(canonicalize(sparse)).toBe(sparseBytes);
    expect(client.view.head!.seq).toBeGreaterThan(beforeOpen.head.seq);

    const touch: BoundAct<typeof selection, "touch"> = { kind: "touch", on: anchor.id,
      fields: { label: "touch" }, expected: { on: pointed.revision, target: initialTarget.revision } };
    const touchBytes = canonicalize(touch);
    await did("c4-selection-revise", "revise-target", { on: target,
      expected: { on: initialTarget.revision }, fields: { n: 1 } });
    await client.read(); await clientIdle(client);
    const currentAnchor = client.view.rows("anchor").find(row => row.id === anchor.id), currentTarget = client.view.rows("target").find(row => row.id === target);
    if (!currentAnchor || !currentTarget) return expect.fail("the genuine target revision must remain checked");
    expect(currentAnchor.revision).toBe(pointed.revision);
    expect(currentTarget.revision).toBeGreaterThan(initialTarget.revision);
    const beforeVia = await measured();
    const viaResult = await exploreClient<typeof selection, "touch">(client, "c4-selection-touch", touch);
    expect(viaResult.exploration).toMatchObject({ is: "refused", reason: "revision-moved",
      context: { head: beforeVia.head, scope: runtime.at, definition: runtime.handle.digest, actor: runtime.signer.key,
        standing: null, assumes: [], evidence: [] } });
    // The omit-values metadata fault must fail this direct present-target
    // invariant, after the real shared body has found the actual movement.
    expect(viaResult.movement).toEqual({ head: beforeVia.head,
      now: { name: anchor.id, seen: currentAnchor.revision, assumes: [] },
      subjects: {
        on: { is: "present", ref: { name: anchor.id, seen: currentAnchor.revision, assumes: [] } },
        target: { is: "present", ref: { name: target, seen: currentTarget.revision, assumes: [] } },
      } });
    expect(canonicalize(touch)).toBe(touchBytes);
    expect(await measured()).toEqual(beforeVia);
    expect(store.records.size).toBe(0);
    expect([custodyWrites, authorizationWrites]).toEqual([0, 0]);
    expect(await store.authorizations.read(runtime.signer.key, runtime.at)).toEqual([]);
    // Both explorations return data only; neither sparse candidate is fed to
    // authorization, signing or Native. The setup acts above are real writes.
    expect(canonicalize(openResult.movement)).toBe(absentCutBytes);
  } finally {
    client.close();
    try { await clientIdle(client); } finally { runtime.close(); }
  }
});
