/** The general `now`, over the pure pieces only: the view computation, the closed reader, the presence and identity checks,
 * the candidate composer and the adoption batch. Rows, evidence and occurrences are DATA DOUBLES. No journal, signature,
 * custody fence or `ScopeClient.submit` runs in the cases above the "real submit" divider; the cases below it run the real call.
 * The oracle for what the scope expects lives in support/c4-now-model.ts and reads rows by hand. */
import { afterEach, expect, test } from "vitest";
import { canonicalize, timeOf } from "@generalbusiness/dap-bytes";
import type { Answer, DeclaredDefinition } from "@generalbusiness/dap-contract";
import { Custody, memoryStore, type DeliveryOccurrence, type Identity } from "../src/custody.ts";
import { lending } from "../../../examples/lending/definition.ts";
import type { AskedOf, Kind } from "../src/declared.ts";
import type { Slot } from "../src/draft-slot.ts";
import { prepareDraftEdit } from "../src/draft-edit.ts";
import { scopeClient, clientIdle, type ScopeClient } from "../src/scope-client.ts";
import { Feed } from "./replica-support.ts";
import { requestDescriptors, checkSigningAuthorizations, requestScene } from "./request-support.ts";
import { c4Runtime } from "./support/c4-runtime.ts";
import { ShapeError } from "../src/declared.ts";
import { draftNowOf, nowExpected, nowMovement, readDraftNow, type DraftNow } from "../src/draft-now.ts";
import { projectDrafts } from "../src/draft-project.ts";
import type { DraftKeyEvidence, DraftProjectInput } from "../src/draft-project-types.ts";
import { slotFor } from "../src/draft-slot.ts";
import { adoptionBatch, checkDraftNow, composeDraftCandidate } from "../src/draft-submit.ts";
import { memoryDrafts, readStoredDrafts, refineDraft, type StoredDraft } from "../src/draft-store.ts";
import { binding, boundAct, bump, definition, digest, draftAt, judge, repoint, scope, truth, world, type World } from "./support/c4-now-model.ts";
import type { DraftReturnView } from "../src/draft-project-types.ts";
/** `returned` is on the editing arm only; the tests read it without narrowing first. */
const returnedView = (view: unknown): DraftReturnView | undefined => (view as { readonly returned?: DraftReturnView } | undefined)?.returned;

const HEAD = { seq: 40, hash: digest("4") };
const who: Omit<Identity, "key"> = { service: "https://draft.test", membership: { scope: `sc_${"b".repeat(51)}a`, genesis: digest("b") },
  signer: binding.owner, target: scope };
const occurrence = (key: string): DeliveryOccurrence => ({ identity: { ...who, key }, attempt: 1, signing: 0, intent: digest("c"),
  authorization: { identity: { key, owner: binding.owner, scope }, position: 2, permission: 1 } });
const refused = (key: string): DraftKeyEvidence => ({ is: "request", identity: { ...who, key }, occurrence: occurrence(key),
  status: { status: "refused", why: { by: "scope", reason: "revision-moved", class: "head", name: "moved" } }, predicted: { is: "not-judged" } });
const absent = (key: string): DraftKeyEvidence => ({ is: "absent", identity: { ...who, key } });
const cutOf = (w: World | null) => w === null ? null : { head: HEAD, rows: w.rows };

function projected(stored: StoredDraft, evidence: DraftKeyEvidence, w: World | null) {
  const input: DraftProjectInput<typeof definition> = { definition, binding, identity: who, state: { is: "current" }, cut: cutOf(w),
    stored: [{ is: "current", stored, evidence, local: { is: "idle" } }], custodyOnly: [] };
  const view = projectDrafts(input).drafts.get(slotFor(definition, stored.act.kind as "touch", { on: { name: 0, seen: 1, assumes: [] } }));
  if (!view) return expect.fail("the draft must appear in its slot");
  return view;
}
function shownNow(stored: StoredDraft, w: World): DraftNow {
  const shown = draftNowOf({ definition, stored, scope, cut: cutOf(w) });
  if (shown.is !== "now") return expect.fail(`the view must render: ${shown.is}`);
  return shown.now;
}
const noteDraft = (w: World, key: string): StoredDraft => {
  const refs = Object.fromEntries(w.rows.map(row => [row.id, { name: row.id, seen: row.revision, assumes: [] }]));
  return refineDraft({ ...boundAct("make-note"), is: "draft", key, slot: { kind: "make-note", on: null, items: {} },
    act: { kind: "make-note", on: null, fields: { label: "note" }, expected: { anchor: 1, target: 1 } },
    capture: { anchor: { is: "derived", ref: refs[0]! }, target: { is: "derived", ref: refs[2]! } },
    namedRefs: { on: null, fields: {} }, placement: "slot" }, binding, definition);
};

test("form 2 view holds now for primary, also and via", () => {
  const w = world(2), stored = draftAt(w, "touch", 0, "touched");
  // Same stored shape, two causes: the exploration marker (form 1) and a kept refused request (form 2).
  const form2 = returnedView(projected(stored, refused(stored.key), w));
  const now: DraftNow = { key: "touched", kind: "touch", address: { kind: "touch", on: 0, items: {} }, head: HEAD,
    primary: { name: 0, seen: 1, assumes: [] },
    subjects: { on: { is: "present", ref: { name: 0, seen: 1, assumes: [] } }, target: { is: "present", ref: { name: 2, seen: 1, assumes: [] } } } };
  expect(form2).toEqual({ by: "request", status: "refused", why: { by: "scope", reason: "revision-moved", class: "head", name: "moved" },
    now: { is: "now", now } });
  const marked: StoredDraft = { ...stored, returned: { cause: { by: "exploration", reason: "revision-moved", class: "head" },
    expected: stored.act.expected, capture: stored.capture, againstCustody: null } };
  expect(returnedView(projected(marked, absent(stored.key), w))).toEqual({ by: "exploration", cause: marked.returned!.cause,
    movement: { head: HEAD, now: now.primary, subjects: now.subjects }, now: { is: "now", now } });
  expect(nowExpected(now)).toEqual(truth(w, "touch", 0));
  expect(nowMovement(now)).toEqual({ head: HEAD, now: now.primary, subjects: now.subjects });
  // Recompute at the view: a later render of the same stored draft reads the later rows, and the store is unchanged.
  const before = canonicalize(marked);
  bump(w, 2);
  const later = returnedView(projected(marked, absent(stored.key), w));
  expect(later?.by === "exploration" && later.now.is === "now" ? nowExpected(later.now.now) : null).toEqual({ on: 1, target: 2 });
  expect(canonicalize(marked)).toBe(before);
});

test("open act holds now with a null primary", () => {
  const w = world(2), stored = noteDraft(w, "noted");
  const now = shownNow(stored, w);
  expect(now.primary).toBeNull();
  expect(now.address).toEqual({ kind: "make-note", on: null, items: {} });
  expect(Object.keys(now.subjects).sort()).toEqual(["anchor", "target"]);
  expect(nowExpected(now)).toEqual({ anchor: 1, target: 1 });
  expect(composeDraftCandidate({ definition, stored, now })).toMatchObject({ ok: true, candidate: { on: null, expected: { anchor: 1, target: 1 } } });
});

test("a subject with no item at the cut is absent and adds no expected key", () => {
  const w = world(null), stored = draftAt(w, "touch", 0, "pointless");
  const now = shownNow(stored, w);
  expect(now.subjects["target"]).toEqual({ is: "absent" });
  expect(nowExpected(now)).toEqual({ on: 1 });
  const composed = composeDraftCandidate({ definition, stored, now });
  if (!composed.ok) return expect.fail("an absent derived subject composes");
  expect(composed.adopted.capture["target"]).toEqual({ is: "absent" });
  expect(composed.candidate.expected).toEqual({ on: 1 });
});

test("a view without now says which subject it lacks, and the submit check stops with state (pure pieces)", () => {
  const w = world(2), stored = draftAt(w, "touch", 0, "lacking");
  const without = { ...w, rows: w.rows.filter(row => row.id !== 0) };
  expect(draftNowOf({ definition, stored, scope, cut: cutOf(without) })).toEqual({ is: "lacks", subject: "on" });
  const wrongType = { ...w, rows: w.rows.map(row => row.id === 0 ? { ...row, type: "note" } : row) };
  expect(draftNowOf({ definition, stored, scope, cut: cutOf(wrongType) })).toEqual({ is: "lacks", subject: "on" });
  expect(draftNowOf({ definition, stored, scope, cut: null })).toEqual({ is: "no-cut" });
  const view = projected({ ...stored, returned: { cause: { by: "exploration", reason: "revision-moved", class: "head" },
    expected: stored.act.expected, capture: stored.capture, againstCustody: null } }, absent(stored.key), without);
  expect(returnedView(view)).toMatchObject({ by: "exploration", movement: null, now: { is: "lacks", subject: "on" } });
  // Edit and dismiss need no now: the draft renders with its values while now is missing.
  expect(view.values).toEqual({ label: "words" });
  // The submit stops with state, naming the subject, before it checks the passed now. An editing draft is unaffected.
  const lacking = { definition, stored, now: undefined };
  expect(checkDraftNow({ ...lacking, returned: true, view: { is: "lacks", subject: "on" } })).toEqual({ ok: false, stop: "state", subject: "on" });
  expect(checkDraftNow({ ...lacking, returned: true, view: { is: "no-cut" } })).toEqual({ ok: false, stop: "state", subject: null });
  expect(checkDraftNow({ ...lacking, returned: false, view: { is: "lacks", subject: "on" } })).toEqual({ ok: true, now: null });
});

// Ruling 09041476 item 5d: `absent` means an empty selection in the rows the cut holds. A via slot that names a row the cut lacks is `lacks`.
test("a via subject that names a row the cut does not hold lacks, and an empty selection is absent", () => {
  const w = world(2), stored = draftAt(w, "touch", 0, "via-lacks");
  const withoutTarget = { ...w, rows: w.rows.filter(row => row.id !== 2) };
  expect(draftNowOf({ definition, stored, scope, cut: cutOf(withoutTarget) })).toEqual({ is: "lacks", subject: "target" });
  const none = world(null), empty = draftAt(none, "touch", 0, "via-absent");
  expect(shownNow(empty, none).subjects["target"]).toEqual({ is: "absent" });
});

test("the view computation reads its input and leaves it unchanged", () => {
  const w = world(2), stored = draftAt(w, "touch", 0, "pure");
  const input = { definition, stored, scope, cut: cutOf(w) }, before = canonicalize(input);
  const first = draftNowOf(input);
  expect(canonicalize(input)).toBe(before);
  if (first.is !== "now") return expect.fail("must render");
  Reflect.set(first.now.head, "seq", 1); Reflect.set(first.now.subjects, "on", { is: "absent" });
  expect(canonicalize(input)).toBe(before);
  expect(draftNowOf(input)).toMatchObject({ is: "now", now: { head: HEAD } });
});

test("submit with an ill-shaped now stops with shape (pure pieces)", () => {
  const w = world(2), stored = draftAt(w, "touch", 0, "ill"), now = shownNow(stored, w);
  expect(readDraftNow(JSON.parse(JSON.stringify(now)))).toEqual(now);
  expect(readDraftNow(now)).toEqual(now);
  const bad = (change: (copy: Record<string, unknown>) => void): void => {
    const copy = JSON.parse(JSON.stringify(now)) as Record<string, unknown>; change(copy);
    expect(() => readDraftNow(copy)).toThrow(ShapeError);
  };
  bad(copy => { copy["extra"] = 1; });
  bad(copy => { delete copy["primary"]; });
  bad(copy => { copy["primary"] = null; });
  bad(copy => { copy["head"] = { seq: -1 }; });
  bad(copy => { copy["key"] = ""; });
  bad(copy => { copy["address"] = { kind: "point", on: 0, items: {} }; });
  bad(copy => { copy["subjects"] = { on: { is: "present", ref: { name: 0, seen: 1 } } }; });
  bad(copy => { copy["subjects"] = { on: { is: "absent" } }; });
  bad(copy => { copy["subjects"] = { on: { is: "present", ref: { name: 5, seen: 1, assumes: [] } } }; });
  expect(() => readDraftNow(undefined)).toThrow(ShapeError);
  expect(() => readDraftNow(Object.create(null))).toThrow(ShapeError);
  // Key set differs from the act's subjects: the reader accepts the value, the identity check refuses it.
  const fewer: DraftNow = { ...now, subjects: { on: now.subjects["on"]! } };
  expect(checkDraftNow({ definition, stored, view: { is: "now", now }, returned: true, now: fewer })).toMatchObject({ ok: false, stop: "shape", field: "now.subjects" });
  const more: DraftNow = { ...now, subjects: { ...now.subjects, extra: { is: "absent" } } };
  expect(checkDraftNow({ definition, stored, view: { is: "now", now }, returned: true, now: more })).toMatchObject({ ok: false, stop: "shape", field: "now.subjects" });
});

test("submit with no now stops with shape, and an editing draft takes none (pure pieces)", () => {
  const w = world(2), stored = draftAt(w, "touch", 0, "gate"), now = shownNow(stored, w);
  expect(checkDraftNow({ definition, stored, view: { is: "now", now }, returned: true, now: undefined })).toMatchObject({ ok: false, stop: "shape", field: "now" });
  expect(checkDraftNow({ definition, stored, view: { is: "now", now }, returned: true, now: null })).toMatchObject({ ok: false, stop: "shape", field: "now" });
  expect(checkDraftNow({ definition, stored, view: { is: "now", now }, returned: false, now })).toMatchObject({ ok: false, stop: "shape", field: "now" });
  expect(checkDraftNow({ definition, stored, view: { is: "now", now }, returned: false, now: undefined })).toEqual({ ok: true, now: null });
  expect(checkDraftNow({ definition, stored, view: { is: "now", now }, returned: true, now })).toEqual({ ok: true, now });
});

test("submit with the now of another draft stops with shape (pure pieces)", () => {
  const w = world(2), stored = draftAt(w, "touch", 0, "mine"), now = shownNow(stored, w);
  const other = draftAt(w, "revise-target", 2, "mine"), otherNow = shownNow(other, w);
  const cases: [string, DraftNow][] = [
    ["now.key", { ...now, key: "yours" }],
    ["now.kind", { ...now, kind: "revise-target" }],
    ["now.address", { ...now, address: { kind: "touch", on: 1, items: {} } }],
    ["now.primary", { ...now, primary: { name: 3, seen: 1, assumes: [] }, address: now.address }],
    ["now.kind", otherNow],
  ];
  for (const [field, given] of cases) {
    expect(checkDraftNow({ definition, stored, view: { is: "now", now }, returned: true, now: given }), field).toMatchObject({ ok: false, stop: "shape", field });
    expect(composeDraftCandidate({ definition, stored, now: given }), field).toMatchObject({ ok: false, stop: "shape" });
  }
});

test("submit with the shown now signs once after a 39 to 40 race (pure pieces; the real call follows below)", () => {
  const w = world(2); w.rows = w.rows.map(row => row.id === 0 ? { ...row, revision: 39 } : row);
  let stored = draftAt(w, "touch", 0, "race"), signed = 0, submits = 0;
  const first = shownNow(stored, w);
  expect(first.primary?.seen).toBe(39);
  bump(w, 0); // the row moves between the view and the submit: 39 to 40
  const attempt = (now: DraftNow): "accepted" | "revision-moved" => {
    const composed = composeDraftCandidate({ definition, stored, now });
    if (!composed.ok) return expect.fail("the shown now composes");
    submits++;
    // The candidate never takes an autofilled key: exactly the keys the shown now named.
    expect(composed.candidate.expected).toEqual(nowExpected(now));
    stored = composed.adopted;
    const answer = judge(composed.candidate.expected, truth(w, "touch", 0));
    if (answer === "accepted") signed++;
    return answer;
  };
  expect(attempt(first)).toBe("revision-moved"); // the one race costs one submit
  const second = shownNow(stored, w);
  expect(second.primary?.seen).toBe(40);
  expect(attempt(second)).toBe("accepted");
  expect([submits, signed]).toEqual([2, 1]);
});

test("submit with the shown now after a moved also subject signs once (pure pieces; the selection journey)", () => {
  const w = world(2); let stored = draftAt(w, "touch", 0, "via");
  const first = shownNow(stored, w);
  expect(first.subjects["target"]).toEqual({ is: "present", ref: { name: 2, seen: 1, assumes: [] } });
  repoint(w, 3); // the anchor now points at target 3: the via subject moves
  const composed = composeDraftCandidate({ definition, stored, now: first });
  if (!composed.ok) return expect.fail("composes");
  expect(judge(composed.candidate.expected, truth(w, "touch", 0))).toBe("revision-moved");
  stored = composed.adopted;
  const second = shownNow(stored, w);
  expect(second.subjects["target"]).toEqual({ is: "present", ref: { name: 3, seen: 1, assumes: [] } });
  const again = composeDraftCandidate({ definition, stored, now: second });
  if (!again.ok) return expect.fail("composes again");
  expect(judge(again.candidate.expected, truth(w, "touch", 0))).toBe("accepted");
  expect(again.adopted.capture["target"]).toEqual({ is: "derived", ref: { name: 3, seen: 1, assumes: [] } });
});

test("the adopted basis is one batch write and survives reload", async () => {
  const w = world(2), port = memoryDrafts();
  const stored = draftAt(w, "touch", 0, "adopt"), other = draftAt(w, "revise-target", 2, "other");
  const marked: StoredDraft = { ...stored, returned: { cause: { by: "exploration", reason: "revision-moved", class: "head" },
    expected: { on: 1, target: 1 }, capture: stored.capture, againstCustody: null } };
  bump(w, 0); bump(w, 2);
  const now = shownNow(marked, w), composed = composeDraftCandidate({ definition, stored: marked, now });
  if (!composed.ok) return expect.fail("composes");
  expect(composed.adopted.returned).toBeUndefined();
  expect(composed.adopted.act.expected).toEqual({ on: 2, target: 2 });
  expect(composed.adopted.act.fields).toEqual(marked.act.fields);
  expect(composed.adopted.namedRefs.on).toEqual(now.primary);
  expect(composed.adopted.capture["on"]).toEqual({ is: "ref", ref: now.primary });
  await port.write(binding.owner, binding.scope, [marked, other]);
  let writes = 0; const stop = port.observe(() => { writes++; });
  const batch = adoptionBatch(await port.read(binding.owner, binding.scope), composed.adopted);
  expect(batch.map(entry => entry.key)).toEqual(["adopt", "other"]);
  expect(batch[1]).toEqual(other);
  await port.write(binding.owner, binding.scope, batch);
  expect(writes).toBe(1); stop();
  const reloaded = await port.read(binding.owner, binding.scope);
  expect(reloaded).toEqual(batch);
  expect(readStoredDrafts(reloaded, binding)).toEqual(batch);
  expect(refineDraft(composed.adopted, binding, definition)).toEqual(composed.adopted);
  expect(() => adoptionBatch(reloaded, { ...composed.adopted, key: "missing" })).toThrow(TypeError);
});

test("an explicitly supplied subject keeps its ref capture and updates its named ref", () => {
  const w = world(2), stored = draftAt(w, "revise-target", 2, "explicit");
  bump(w, 2);
  const now = shownNow(stored, w), composed = composeDraftCandidate({ definition, stored, now });
  if (!composed.ok) return expect.fail("composes");
  expect(composed.adopted.namedRefs.on).toEqual({ name: 2, seen: 2, assumes: [] });
  expect(composed.adopted.capture).toEqual({ on: { is: "ref", ref: { name: 2, seen: 2, assumes: [] } } });
  expect(composed.adopted.slot).toEqual(stored.slot);
});

// ---------------------------------------------------------------- the real submit (proposal steps 1 to 7)
// The judge and fold, custody, the raw draft port and the call under test are real. The transport and clocks are scripted.
const audits: { scene: ReturnType<typeof requestScene>; store: ReturnType<typeof memoryStore> }[] = [];
afterEach(async () => { for (const audit of audits.splice(0)) await checkSigningAuthorizations(audit.scene, audit.store); });

function realOwner(over: { store?: ReturnType<typeof memoryStore>; drafts?: ReturnType<typeof memoryDrafts>; feed?: Feed } = {}) {
  const s = requestScene(), store = over.store ?? memoryStore(), drafts = over.drafts ?? memoryDrafts();
  audits.push({ scene: s, store });
  const member = { service: "https://requests.test", membership: s.actor.member.membership, member: s.actor.member.member, principal: s.actor.principal };
  const client = scopeClient(s.handle, { signer: s.signer, member, store, drafts,
    observe: (over.feed ?? s.feed).observe, clock: s.clock, lifetimeSeconds: 60 });
  const who = { service: member.service, membership: member.membership, signer: s.signer.key, target: s.handle.at };
  return { s, store, drafts, client, who };
}
/** The returned view of the draft in this slot, or undefined. */
function returnedOf<D extends DeclaredDefinition, K extends Kind<D>>(client: ScopeClient<D>, slot: Slot<D, K>) {
  const shown = client.view.drafts.get(slot);
  return shown?.state === "editing" ? shown.returned : undefined;
}

// Proposal table: `now` undefined for a returned draft gives shape and no write. A returned draft is a kept refused request here.
test("submit with no now stops with shape and writes nothing", async () => {
  const { s, store, drafts, client } = realOwner();
  s.scope.did(s.actor, "remark", { on: 0, fields: { text: "first cause" } });
  s.scope.did(s.actor, "remark", { on: 0, fields: { text: "second cause" } });
  s.feed.current(s.scope); await client.read();
  const basis = s.scope.item(0).revision, slot = client.slot("cite", { on: { name: 0, seen: basis, assumes: [] } });
  const edited = await client.edit(slot, { cause: s.scope.fact(2) });
  if (!edited.ok) return expect.fail("the edit creates the draft");
  await clientIdle(client);
  s.scope.did(s.actor, "cite", { on: 0, expected: { on: basis }, fields: { cause: s.scope.fact(3) } });
  expect(await client.submit(slot)).toEqual({ ok: true, value: edited.value }); // the scope refuses revision-moved: form 2
  await clientIdle(client);
  expect(returnedOf(client, slot)).toMatchObject({ by: "request", now: { is: "now" } });
  const signs = s.signs(), copies = s.copies.length, batch = canonicalize(await drafts.read(s.signer.key, s.handle.at)), records = [...store.records];
  let writes = 0; const write = drafts.write.bind(drafts);
  drafts.write = async (owner, at, entries) => { writes++; return write(owner, at, entries); };
  for (const missing of [undefined, null]) {
    expect(await client.submit(slot, missing)).toMatchObject({ ok: false, stop: { stop: "shape", path: "now" } });
  }
  expect([s.signs(), s.copies.length, writes, canonicalize(await drafts.read(s.signer.key, s.handle.at)), [...store.records]])
    .toEqual([signs, copies, 0, batch, records]);
  client.close();
});

// The ordinary 39 to 40 scope race (plan v4): the client explored at 39, another act committed 40, the scope refuses.
test("submit with the shown now signs once after a 39 to 40 race, in one batch write, and the adopted basis survives reload", async () => {
  const { s, store, drafts, client, who } = realOwner();
  s.scope.did(s.actor, "remark", { on: 0, fields: { text: "first cause" } });
  s.scope.did(s.actor, "remark", { on: 0, fields: { text: "second cause" } });
  s.feed.current(s.scope); await client.read();
  const basis = s.scope.item(0).revision, slot = client.slot("cite", { on: { name: 0, seen: basis, assumes: [] } });
  const edited = await client.edit(slot, { cause: s.scope.fact(2) });
  if (!edited.ok) return expect.fail("the edit creates the draft");
  await clientIdle(client);
  const key = edited.value;
  // Another tab moves item 0 and the feed gives this client no notice: it still shows `basis`.
  s.scope.did(s.actor, "cite", { on: 0, expected: { on: basis }, fields: { cause: s.scope.fact(3) } });
  const moved = s.scope.item(0).revision;
  expect(moved).not.toBe(basis);
  const signed = s.signs();
  expect(await client.submit(slot)).toEqual({ ok: true, value: key });
  await clientIdle(client);
  expect(s.signs()).toBe(signed + 1);
  expect(s.copies.at(-1)!.intent.expected).toEqual({ on: basis });
  const returned = returnedOf(client, slot);
  if (returned?.by !== "request" || returned.now.is !== "now") return expect.fail("the scope's refusal returns the draft with a new now");
  expect(returned).toMatchObject({ status: "refused", why: { reason: "revision-moved" } });
  const shown = returned.now.now;
  expect(shown.primary).toEqual({ name: 0, seen: moved, assumes: [] });
  // One submit with the shown now: one batch write, one signature, one accepted entry.
  let writes = 0; const write = drafts.write.bind(drafts);
  drafts.write = async (owner, at, entries) => { writes++; return write(owner, at, entries); };
  expect(await client.submit(slot, shown)).toEqual({ ok: true, value: key });
  await clientIdle(client);
  expect(writes).toBe(1);
  expect(s.signs()).toBe(signed + 2);
  expect(s.copies.at(-1)!.intent).toMatchObject({ idempotencyKey: key, expected: { on: moved } });
  expect((await new Custody(store, () => timeOf(s.now())).find({ ...who, key }))!.phase).toBe("accepted");
  // The adopted basis is in the stored row, read back through the whole-batch loader: it survives a reload.
  const [row] = readStoredDrafts(await drafts.read(s.signer.key, s.handle.at), { owner: s.signer.key, scope: s.handle.at });
  if (row?.is !== "draft") return expect.fail("the adopted draft stays stored");
  expect(row.returned).toBeUndefined();
  expect(row.act.expected).toEqual({ on: moved });
  expect(row.namedRefs.on).toEqual(shown.primary);
  client.close();
});

// Priority: `taken` is decided at step 2, before any check of `now` at step 3.
test("taken outranks the now check", async () => {
  const feed = new Feed(), first = realOwner(), { s, store, drafts } = first;
  const second = scopeClient(s.handle, { signer: s.signer,
    member: { service: first.who.service, membership: first.who.membership, member: s.actor.member.member, principal: s.actor.principal },
    store, drafts, observe: feed.observe, clock: s.clock, lifetimeSeconds: 60 });
  s.feed.current(s.scope); feed.current(s.scope); await first.client.read(); await second.read();
  const slotOf = (client: typeof first.client) => client.slot("remark", { on: { name: 0, seen: s.scope.item(0).revision, assumes: [] } });
  const made = await first.client.edit(slotOf(first.client), { text: "from the first tab" });
  if (!made.ok) return expect.fail("the first tab creates the draft");
  await clientIdle(first.client);
  // A well-formed now of no draft here. Without `taken` it would stop at step 3 with `shape`.
  const alien = { key: "alien", kind: "remark", address: { kind: "remark", on: 0, items: {} }, head: s.scope.head,
    primary: { name: 0, seen: s.scope.item(0).revision, assumes: [] }, subjects: {} };
  // Control: with the draft still the first tab's own editing draft, the same value stops with `shape`.
  expect(await first.client.submit(slotOf(first.client), alien)).toMatchObject({ ok: false, stop: { stop: "shape", path: "now" } });
  // The second tab discards that draft and starts another before the first tab's submit reaches the fence.
  let release!: () => void, entered!: () => void;
  const started = new Promise<void>(resolve => { entered = resolve; }), held = new Promise<void>(resolve => { release = resolve; });
  const exclusive = store.exclusive.bind(store);
  let armed = true;
  store.exclusive = async work => { if (armed) { armed = false; entered(); await held; } return exclusive(work); };
  let stale: ReturnType<typeof first.client.submit> | undefined;
  try {
    stale = first.client.submit(slotOf(first.client), alien);
    await started;
    await second.read(); await clientIdle(second);
    const gone = await second.discard(slotOf(second));
    if (!gone.ok) return expect.fail("the second tab discards the draft");
    const newer = await second.edit(slotOf(second), { text: "from the second tab" });
    if (!newer.ok) return expect.fail("the second tab starts another draft");
    const before = canonicalize(await drafts.read(s.signer.key, s.handle.at)), signs = s.signs();
    release();
    expect(await stale).toEqual({ ok: false, stop: { stop: "taken" } });
    expect([canonicalize(await drafts.read(s.signer.key, s.handle.at)), s.signs()]).toEqual([before, signs]);
  } finally { release(); store.exclusive = exclusive; await stale?.catch(() => null); first.client.close(); second.close(); }
});

// A returned draft whose view lacks its primary row stops with `state`: no `now` can be shown, so none can be passed.
test("a view without now stops with state", async () => {
  const { s, store, drafts, client } = realOwner();
  s.feed.current(s.scope); await client.read();
  const bound = { owner: s.signer.key, scope: s.handle.at, definition: s.handle.digest, descriptors: requestDescriptors(s.handle.definition) };
  // A raw return marker over an item that the replica does not hold: a stored row is not a claim that its rows exist.
  const gone = { id: 99, type: "intent", revision: 1, refs: {}, values: {} };
  const ref = { name: 99, seen: 1, assumes: [] };
  const prepared = prepareDraftEdit({ binding: bound, definition: s.handle.definition, rows: [gone] as never,
    slot: { kind: "remark", on: 99, items: {} }, namedRefs: { on: ref, fields: {} }, current: null, key: "missing", patch: { text: "words" } });
  if (!prepared.ok) return expect.fail("the fixture draft must prepare");
  const returned = { cause: { by: "exploration" as const, reason: "revision-moved" as const, class: "head" as const },
    expected: prepared.draft.act.expected, capture: prepared.draft.capture, againstCustody: null };
  await store.exclusive(() => drafts.write(s.signer.key, s.handle.at, [refineDraft({ ...prepared.draft, returned }, bound, s.handle.definition)]));
  const slot = client.slot("remark", { on: ref });
  await client.read(); await clientIdle(client);
  expect(returnedOf(client, slot)).toMatchObject({ by: "exploration", movement: null, now: { is: "lacks", subject: "on" } });
  const before = canonicalize(await drafts.read(s.signer.key, s.handle.at)), signs = s.signs(), records = [...store.records];
  let writes = 0; const write = drafts.write.bind(drafts);
  drafts.write = async (owner, at, entries) => { writes++; return write(owner, at, entries); };
  // `state` outranks the absence of `now`: with or without a now of the right shape, the same stop.
  const aNow = { key: "missing", kind: "remark", address: { kind: "remark", on: 99, items: {} }, head: s.scope.head, primary: ref, subjects: {} };
  for (const passed of [undefined, aNow]) expect(await client.submit(slot, passed)).toEqual({ ok: false, stop: { stop: "state" } });
  expect([writes, s.signs(), s.copies.length, canonicalize(await drafts.read(s.signer.key, s.handle.at)), [...store.records]]).toEqual([0, signs, 0, before, records]);
  client.close();
});

// Real Explore: the Lending runtime issues a read session, so `actExplore` runs and refuses `revision-moved` before any signature.
test("a subject that moved after the view returns form 1 with no signature", async () => {
  const runtime = await c4Runtime(), store = memoryStore(), drafts = memoryDrafts(), feed = new Feed();
  const client = scopeClient(runtime.handle, { signer: runtime.signer,
    member: { service: runtime.service, ...runtime.member, principal: null }, store, drafts, observe: feed.observe,
    clock: runtime.clock, exploration: runtime.readInputs });
  const did = async <K extends Kind<typeof lending>>(key: string, kind: K, asked: AskedOf<typeof lending, K>): Promise<Answer> => {
    const packet = await runtime.handle.intent(runtime.signer, kind, asked, { now: runtime.now(), idempotencyKey: key, lifetimeSeconds: 60 });
    const answer = await runtime.handle.submit(packet.signed, [], packet.beside);
    expect(answer.answer).toBe("accepted");
    return answer;
  };
  const opened = (answer: Answer): number => {
    const effect = answer.answer === "accepted" ? answer.receipt.effects.find(found => found.effect === "open") : undefined;
    if (!effect || effect.effect !== "open") return expect.fail("the receipt names its opened item");
    return effect.item;
  };
  try {
    feed.emit({ status: "streaming" }); await client.read(); await clientIdle(client);
    const tool = opened(await did("n-donate", "donate", { on: null, expected: { library: runtime.store.item(0)!.revision },
      fields: { name: "Now tool", description: "A tool", page: "shelf/now-tool.md", content: "content" } }));
    const held = opened(await did("n-reserve", "reserve", { on: null, expected: {},
      fields: { tool, day: "2026-11-15", until: timeOf(runtime.now() + 3_600_000) } }));
    await client.read(); await clientIdle(client);
    const seen = client.view.row({ item: held })!.revision;
    const slot = client.slot("release", { on: { name: held, seen, assumes: [] } });
    const edited = await client.edit(slot, {});
    if (!edited.ok) return expect.fail("the edit creates the draft");
    // The subject moves after the member's basis and before the submit.
    await did("n-other-release", "release", { on: held, fields: {}, expected: { on: seen } });
    await client.read(); await clientIdle(client);
    const signatures = runtime.counts.actSignatures, posts = runtime.counts.submissions, records = [...store.records];
    expect(await client.submit(slot)).toEqual({ ok: false, stop: { stop: "state" }, committed: edited.value });
    await clientIdle(client);
    // No signature, no post, no custody record: the one write is the genuine form 1 return.
    expect([runtime.counts.actSignatures, runtime.counts.submissions, [...store.records]]).toEqual([signatures, posts, records]);
    const [row] = await drafts.read(runtime.signer.key, runtime.at);
    if (row?.is !== "draft") return expect.fail("the draft stays stored");
    expect(row.returned).toMatchObject({ cause: { by: "exploration", reason: "revision-moved", class: "head" }, againstCustody: null });
    expect(row.act.expected).toEqual({ on: seen });
    const returned = client.view.drafts.get(slot);
    const moved = client.view.row({ item: held })!.revision;
    expect(returned).toMatchObject({ state: "editing", returned: { by: "exploration", now: { is: "now", now: { primary: { name: held, seen: moved, assumes: [] } } } } });
  } finally { client.close(); runtime.close(); }
});

// ---------------------------------------------------------------- order of checks and the signing after the fence
// Ruling 09041476 item 4: the form of the inputs, then `taken`, then `state`, then a missing or foreign `now`.
test("an ill-shaped now stops with shape even when the slot is taken", async () => {
  const { s, store, drafts, client } = realOwner();
  s.feed.current(s.scope); await client.read(); await clientIdle(client);
  // No draft holds this slot, so a well-formed call would stop with `taken`. Control first.
  const slot = client.slot("remark", { on: { name: 0, seen: s.scope.item(0).revision, assumes: [] } });
  const wellFormed = { key: "alien", kind: "remark", address: { kind: "remark", on: 0, items: {} }, head: s.scope.head,
    primary: { name: 0, seen: s.scope.item(0).revision, assumes: [] }, subjects: {} };
  expect(await client.submit(slot, wellFormed)).toEqual({ ok: false, stop: { stop: "taken" } });
  const signs = s.signs(), batch = canonicalize(await drafts.read(s.signer.key, s.handle.at)), records = [...store.records];
  const ill = { ...wellFormed, extra: 1 } as unknown as DraftNow;
  expect(await client.submit(slot, ill)).toMatchObject({ ok: false, stop: { stop: "shape", path: "now" } });
  expect([s.signs(), canonicalize(await drafts.read(s.signer.key, s.handle.at)), [...store.records]]).toEqual([signs, batch, records]);
  client.close();
});

/** A draft that the scope refused (form 2) with a moved basis, and the `now` that its view shows. */
async function returnedRace() {
  const owner = realOwner(), { s, client } = owner;
  s.scope.did(s.actor, "remark", { on: 0, fields: { text: "first cause" } });
  s.scope.did(s.actor, "remark", { on: 0, fields: { text: "second cause" } });
  s.feed.current(s.scope); await client.read();
  const basis = s.scope.item(0).revision, slot = client.slot("cite", { on: { name: 0, seen: basis, assumes: [] } });
  const edited = await client.edit(slot, { cause: s.scope.fact(2) });
  if (!edited.ok) return expect.fail("the edit creates the draft");
  await clientIdle(client);
  s.scope.did(s.actor, "cite", { on: 0, expected: { on: basis }, fields: { cause: s.scope.fact(3) } });
  expect(await client.submit(slot)).toEqual({ ok: true, value: edited.value }); // the scope refuses revision-moved
  await clientIdle(client);
  const returned = returnedOf(client, slot);
  if (returned?.by !== "request" || returned.now.is !== "now") return expect.fail("the refusal returns the draft with a now");
  return { ...owner, slot, basis, key: edited.value, shown: returned.now.now, moved: s.scope.item(0).revision, signed: s.signs() };
}

// Ruling 09041476 item 2: step 7 signs after the fence. A stop between step 6 and step 7 leaves the adopted draft.
test("a stop between the adoption write and the signing leaves the draft, and the next submit signs once", async () => {
  const { s, store, drafts, client, who, slot, key, shown, moved, signed } = await returnedRace();
  const write = drafts.write.bind(drafts);
  let stopAfter = true;
  drafts.write = async (owner, at, entries) => {
    await write(owner, at, entries);
    if (stopAfter) { stopAfter = false; throw new Error("stopped after the adoption write"); }
  };
  await expect(client.submit(slot, shown)).rejects.toThrow("stopped after the adoption write");
  await clientIdle(client);
  // The batch holds the adopted basis, and nothing signed.
  const [row] = readStoredDrafts(await drafts.read(s.signer.key, s.handle.at), { owner: s.signer.key, scope: s.handle.at });
  if (row?.is !== "draft") return expect.fail("the adopted draft stays stored");
  expect([row.key, row.returned, row.act.expected, s.signs()]).toEqual([key, undefined, { on: moved }, signed]);
  const again = returnedOf(client, slot);
  if (again?.by !== "request" || again.now.is !== "now") return expect.fail("the view still shows a now");
  expect(await client.submit(slot, again.now.now)).toEqual({ ok: true, value: key });
  await clientIdle(client);
  expect(s.signs()).toBe(signed + 1);
  const record = await new Custody(store, () => timeOf(s.now())).find({ ...who, key });
  expect(record!.phase).toBe("accepted");
  expect(record!.signings.length).toBe(2); // the refused signing, then this one
  const [kept] = readStoredDrafts(await drafts.read(s.signer.key, s.handle.at), { owner: s.signer.key, scope: s.handle.at });
  expect(kept?.is === "draft" ? kept.act.expected : null).toEqual({ on: moved });
  client.close();
});

test("a second client that submits the same key between the adoption write and the signing makes one signing", async () => {
  const { s, store, drafts, client, who, slot, basis, key, shown, moved, signed } = await returnedRace();
  const feed = new Feed();
  const second = scopeClient(s.handle, { signer: s.signer,
    member: { service: who.service, membership: who.membership, member: s.actor.member.member, principal: s.actor.principal },
    store, drafts, observe: feed.observe, clock: s.clock, lifetimeSeconds: 60 });
  feed.current(s.scope); await second.read(); await clientIdle(second);
  const slotB = second.slot("cite", { on: { name: 0, seen: basis, assumes: [] } });
  // Hold the first client at the first fence it takes after its adoption write: that is the start of step 7.
  let adopted = false, release!: () => void, entered!: () => void;
  const started = new Promise<void>(resolve => { entered = resolve; }), held = new Promise<void>(resolve => { release = resolve; });
  const write = drafts.write.bind(drafts), exclusive = store.exclusive.bind(store);
  let armed = true;
  drafts.write = async (owner, at, entries) => { await write(owner, at, entries); if (armed) adopted = true; };
  store.exclusive = async work => { if (adopted && armed) { armed = false; entered(); await held; } return exclusive(work); };
  let first: ReturnType<typeof client.submit> | undefined;
  try {
    first = client.submit(slot, shown);
    await started;
    const shownB = returnedOf(second, slotB);
    if (shownB?.by !== "request" || shownB.now.is !== "now") return expect.fail("the second client shows the same now");
    const other = await second.submit(slotB, shownB.now.now);
    expect(other).toEqual({ ok: true, value: key });
    await clientIdle(second);
  } finally { release(); await Promise.allSettled([first]); store.exclusive = exclusive; }
  await clientIdle(client); await clientIdle(second);
  // Custody admitted one signing for the key after the refusal, whichever client held it.
  expect(s.signs()).toBe(signed + 1);
  const record = await new Custody(store, () => timeOf(s.now())).find({ ...who, key });
  expect(record!.signings.length).toBe(2);
  expect(record!.phase).toBe("accepted");
  expect(s.copies.at(-1)!.intent).toMatchObject({ idempotencyKey: key, expected: { on: moved } });
  client.close(); second.close();
});

// ---------------------------------------------------------------- the exploration waits outside the fence
// Ruling 29b355c5 point 3: a reader that waits for the network holds no fence. The submit reads the batch again afterwards.
/** The Lending runtime with three donated tools, a client whose first armed exploration waits, and one borrow slot per tool. */
async function gatedLending() {
  const runtime = await c4Runtime(), store = memoryStore(), drafts = memoryDrafts(), feed = new Feed();
  let armed = false, release!: () => void, entered!: () => void;
  const started = new Promise<void>(resolve => { entered = resolve; }), held = new Promise<void>(resolve => { release = resolve; });
  const client = scopeClient(runtime.handle, { signer: runtime.signer,
    member: { service: runtime.service, ...runtime.member, principal: null }, store, drafts, observe: feed.observe,
    clock: runtime.clock, exploration: async () => { if (armed) { armed = false; entered(); await held; } return runtime.readInputs(); } });
  const did = async <K extends Kind<typeof lending>>(key: string, kind: K, asked: AskedOf<typeof lending, K>): Promise<number> => {
    const packet = await runtime.handle.intent(runtime.signer, kind, asked, { now: runtime.now(), idempotencyKey: key, lifetimeSeconds: 60 });
    const answer = await runtime.handle.submit(packet.signed, [], packet.beside);
    expect(answer.answer).toBe("accepted");
    const effect = answer.answer === "accepted" ? answer.receipt.effects.find(found => found.effect === "open") : undefined;
    if (!effect || effect.effect !== "open") return expect.fail("the receipt names its opened item");
    return effect.item;
  };
  feed.emit({ status: "streaming" }); await client.read(); await clientIdle(client);
  const tools: number[] = [];
  for (const name of ["one", "two", "three"]) {
    tools.push(await did(`g-donate-${name}`, "donate", { on: null, expected: { library: runtime.store.item(0)!.revision },
      fields: { name: `Tool ${name}`, description: "A tool", page: `shelf/g-${name}.md`, content: "content" } }));
  }
  await client.read(); await clientIdle(client);
  // `library` is an `also` subject, so the address names only the tool.
  const slots = tools.map(tool => client.slot("borrow", { on: { name: tool, seen: client.view.row({ item: tool })!.revision, assumes: [] } }));
  const edits = [] as string[];
  for (const [index, slot] of slots.entries()) {
    const made = await client.edit(slot, { content: `borrow ${index}` });
    if (!made.ok) return expect.fail("the edit creates the draft");
    edits.push(made.value);
  }
  await clientIdle(client);
  return { runtime, store, drafts, client, slots, keys: edits, started, release, arm: () => { armed = true; },
    state: async () => canonicalize(await drafts.read(runtime.signer.key, runtime.at)),
    close: () => { client.close(); runtime.close(); } };
}

test("a submit waits for its exploration outside the fence: edit, discard and a submit of another slot complete", async () => {
  const g = await gatedLending();
  try {
    const signatures = g.runtime.counts.actSignatures;
    g.arm();
    const waiting = g.client.submit(g.slots[0]!);
    await g.started;
    expect(await g.client.edit(g.slots[1]!, { content: "edited while waiting" })).toEqual({ ok: true, value: g.keys[1] });
    // `discard` removes an editing draft; `dismiss` applies to an unsent intention, and none waits here.
    expect(await g.client.discard(g.slots[2]!)).toEqual({ ok: true, value: undefined });
    expect(await g.client.submit(g.slots[1]!)).toEqual({ ok: true, value: g.keys[1] });
    g.release();
    expect(await waiting).toEqual({ ok: true, value: g.keys[0] });
    await clientIdle(g.client);
    expect(g.runtime.counts.actSignatures).toBe(signatures + 2);
  } finally { g.release(); g.close(); }
});

test("a draft that changes while the submit waits stops with state, signs nothing and writes nothing", async () => {
  const g = await gatedLending();
  try {
    const signatures = g.runtime.counts.actSignatures, records = [...g.store.records];
    g.arm();
    const waiting = g.client.submit(g.slots[0]!);
    await g.started;
    expect(await g.client.edit(g.slots[0]!, { content: "changed while waiting" })).toEqual({ ok: true, value: g.keys[0] });
    await clientIdle(g.client);
    const stored = await g.state();
    let writes = 0; const write = g.drafts.write.bind(g.drafts);
    g.drafts.write = async (owner, at, entries) => { writes++; return write(owner, at, entries); };
    g.release();
    expect(await waiting).toEqual({ ok: false, stop: { stop: "state" } });
    await clientIdle(g.client);
    expect([writes, g.runtime.counts.actSignatures, [...g.store.records], await g.state()]).toEqual([0, signatures, records, stored]);
  } finally { g.release(); g.close(); }
});

test("a submit whose draft did not change during the exploration signs once", async () => {
  const g = await gatedLending();
  try {
    const signatures = g.runtime.counts.actSignatures, records = g.store.records.size;
    g.arm();
    const waiting = g.client.submit(g.slots[0]!);
    await g.started;
    g.release();
    expect(await waiting).toEqual({ ok: true, value: g.keys[0] });
    await clientIdle(g.client);
    expect([g.runtime.counts.actSignatures, g.store.records.size]).toEqual([signatures + 1, records + 1]);
  } finally { g.release(); g.close(); }
});

// Ruling 29b355c5 point 2: a return by an exploration. The adoption removes the stored cause; a stop before the signing
// leaves an editing draft with no return, and the next submit takes no now, explores and signs once.
test("a stop between the adoption write and the signing of a return by an exploration leaves an editing draft, and the next submit signs once", async () => {
  const runtime = await c4Runtime(), store = memoryStore(), drafts = memoryDrafts(), feed = new Feed();
  const client = scopeClient(runtime.handle, { signer: runtime.signer,
    member: { service: runtime.service, ...runtime.member, principal: null }, store, drafts, observe: feed.observe,
    clock: runtime.clock, exploration: runtime.readInputs });
  const did = async <K extends Kind<typeof lending>>(key: string, kind: K, asked: AskedOf<typeof lending, K>): Promise<Answer> => {
    const packet = await runtime.handle.intent(runtime.signer, kind, asked, { now: runtime.now(), idempotencyKey: key, lifetimeSeconds: 60 });
    const answer = await runtime.handle.submit(packet.signed, [], packet.beside);
    expect(answer.answer).toBe("accepted");
    return answer;
  };
  const opened = (answer: Answer): number => {
    const effect = answer.answer === "accepted" ? answer.receipt.effects.find(found => found.effect === "open") : undefined;
    if (!effect || effect.effect !== "open") return expect.fail("the receipt names its opened item");
    return effect.item;
  };
  try {
    feed.emit({ status: "streaming" }); await client.read(); await clientIdle(client);
    const tool = opened(await did("s-donate", "donate", { on: null, expected: { library: runtime.store.item(0)!.revision },
      fields: { name: "Step tool", description: "A tool", page: "shelf/step-tool.md", content: "content" } }));
    const held = opened(await did("s-reserve", "reserve", { on: null, expected: {},
      fields: { tool, day: "2026-11-15", until: timeOf(runtime.now() + 3_600_000) } }));
    await client.read(); await clientIdle(client);
    const seen = client.view.row({ item: held })!.revision;
    const slot = client.slot("release", { on: { name: held, seen, assumes: [] } });
    const edited = await client.edit(slot, {});
    if (!edited.ok) return expect.fail("the edit creates the draft");
    await did("s-other-release", "release", { on: held, fields: {}, expected: { on: seen } });
    await client.read(); await clientIdle(client);
    // The first submit explores, finds the basis moved and returns the draft (form 1).
    expect(await client.submit(slot)).toEqual({ ok: false, stop: { stop: "state" }, committed: edited.value });
    await clientIdle(client);
    const returned = returnedOf(client, slot);
    if (returned?.by !== "exploration" || returned.now.is !== "now") return expect.fail("the return by an exploration shows a now");
    const signatures = runtime.counts.actSignatures, moved = client.view.row({ item: held })!.revision;
    const write = drafts.write.bind(drafts);
    let stopAfter = true;
    drafts.write = async (owner, at, entries) => {
      await write(owner, at, entries);
      if (stopAfter) { stopAfter = false; throw new Error("stopped after the adoption write"); }
    };
    await expect(client.submit(slot, returned.now.now)).rejects.toThrow("stopped after the adoption write");
    await clientIdle(client);
    // The adoption removed the stored cause and took the moved basis; nothing signed.
    const [row] = readStoredDrafts(await drafts.read(runtime.signer.key, runtime.at), { owner: runtime.signer.key, scope: runtime.at });
    if (row?.is !== "draft") return expect.fail("the adopted draft stays stored");
    expect([row.key, row.returned, row.act.expected, runtime.counts.actSignatures]).toEqual([edited.value, undefined, { on: moved }, signatures]);
    expect(client.view.drafts.get(slot)).toMatchObject({ state: "editing" });
    expect(returnedOf(client, slot)).toBeUndefined();
    // The editing draft takes no now: the next submit explores and signs once.
    expect(await client.submit(slot)).toEqual({ ok: true, value: edited.value });
    await clientIdle(client);
    expect(runtime.counts.actSignatures).toBe(signatures + 1);
  } finally { client.close(); runtime.close(); }
});
