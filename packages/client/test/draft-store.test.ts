/** Stored draft structure and memory ownership only; no judgment, browser, or signing claim. */
import { expect, test } from "vitest";
import type { DeclaredDefinition, Digest, ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize, definitionDigest } from "@generalbusiness/dap-bytes";
import { keys } from "@generalbusiness/dap-derive/testing";
import { ShapeError } from "../src/declared.ts";
import type { DeliveryOccurrence } from "../src/custody.ts";
import { readDeliveryOccurrence } from "../src/custody-occurrence.ts";
import { memoryDrafts, readDraftRef, readStoredDrafts, readStoredDraftText, refineDraft, type DraftBinding, type DraftCapture, type DraftDismissal, type StoredDraftReturn } from "../src/draft-store.ts";
import { citing } from "./replica-support.ts";

const digest = (hex: string): Digest => `sha256:${hex.repeat(64)}`;
const scope: ScopeRef = { scope: `sc_${"a".repeat(52)}`, genesis: digest("a") };
function fixture() {
  const assign = citing.acts["assign"];
  if (!assign) expect.fail("the maintained lane must declare assign");
  const definition: DeclaredDefinition = { ...citing, acts: { ...citing.acts,
    assign: { ...assign, also: { intent: { item: "intent", via: { of: "on", slot: "intent" } } } },
  } };
  const binding: DraftBinding = { owner: keys.rita.key, scope, definition: definitionDigest(definition), descriptor: digest("d") };
  const on = { name: 2, seen: 1, assumes: [] };
  const capture: Record<string, DraftCapture> = { on: { is: "ref", ref: on }, intent: { is: "absent" } };
  const fields: Record<string, unknown> = {};
  const row = { ...binding, scope: { ...scope }, is: "draft" as const, key: "editing", slot: { kind: "assign", on: 2, items: {} },
    act: { kind: "assign", on: 2, fields, expected: { on: 1 } }, capture,
    namedRefs: { on, fields: {} }, placement: "slot" as const };
  return { definition, binding, row };
}
function dismissal(row: ReturnType<typeof fixture>["row"]): DraftDismissal {
  return { is: "dismissed", key: row.key, owner: row.owner, scope: row.scope,
    definition: row.definition, descriptor: row.descriptor, slot: row.slot };
}

/** Synthetic historical marker data, not a kept request, permission or Native answer. */
function occurrence(row: ReturnType<typeof fixture>["row"], authorized = true) {
  return { identity: { service: "https://draft.test", membership: { scope: `sc_${"b".repeat(51)}a` as const, genesis: digest("b") },
    signer: row.owner, target: { ...row.scope }, key: row.key }, attempt: 1, signing: 0, intent: digest("c"),
    ...(authorized ? { authorization: { identity: { key: row.key, owner: row.owner, scope: { ...row.scope } }, position: 0, permission: 0 } } : {}) };
}
function markerReturn(againstCustody: DeliveryOccurrence | null): StoredDraftReturn {
  const now = { name: 2, seen: 3, assumes: [] };
  return { cause: { by: "exploration", reason: "revision-moved", class: "head" },
    expected: { on: 3 }, capture: { on: { is: "derived", ref: now }, intent: { is: "absent" } }, againstCustody };
}

test("a corrupt last entry exposes no batch and repairs neither the input nor its valid prefix", () => {
  const { binding, row } = fixture();
  const input = [row, { ...dismissal(row), key: "last", extra: "corruption" }], before = canonicalize(input);
  expect(() => readStoredDrafts(input, binding)).toThrow(ShapeError);
  expect(canonicalize(input)).toBe(before);
  const duplicateNames = canonicalize([row]).replace('"is":"draft"', '"is":"dismissed","is":"draft"');
  expect(() => readStoredDraftText(duplicateNames, binding)).toThrow(ShapeError);
  expect(readStoredDraftText(canonicalize([row]), binding)).toEqual([row]);
  const held = occurrence({ ...row, key: "last" });
  const later = { ...row, key: "last", placement: "waiting" as const, returned: markerReturn(held) };
  const markerInput = [row, { ...later, returned: { ...later.returned, againstCustody: { ...held,
    authorization: { identity: { key: "last", owner: row.owner, scope: { ...row.scope } }, position: 0, permission: -1 } } } }];
  const markerBefore = canonicalize(markerInput);
  expect(() => readStoredDrafts(markerInput, binding)).toThrow(ShapeError);
  expect(canonicalize(markerInput)).toBe(markerBefore);
});

test("memory writes own input before returning a promise and reads expose detached copies", async () => {
  const { binding, row } = fixture(), port = memoryDrafts();
  const before = canonicalize([row]), writing = port.write(binding.owner, binding.scope, [row]);
  row.key = "caller changed the key"; row.act.fields["caller"] = "later";
  await writing;
  const first = await port.read(binding.owner, binding.scope);
  expect(canonicalize(first)).toBe(before);
  const saved = first[0]; if (!saved || saved.is !== "draft") expect.fail("the written draft must exist");
  Reflect.set(saved.act.fields, "reader", "mutation"); Reflect.set(saved, "key", "reader changed the key");
  expect(canonicalize(await port.read(binding.owner, binding.scope))).toBe(before);
  const nested = fixture().row, held = occurrence(nested);
  const tagged = { ...nested, returned: markerReturn(held) }, nestedBefore = canonicalize([tagged]);
  let changes = 0; port.observe(() => { changes++; });
  const nestedWrite = port.write(binding.owner, binding.scope, [tagged]);
  held.identity.target.genesis = digest("e"); held.identity.membership.genesis = digest("f");
  if (!held.authorization) expect.fail("the synthetic marker must include its authorization reference");
  held.authorization.identity.scope.genesis = digest("1");
  await nestedWrite;
  const [owned] = await port.read(binding.owner, binding.scope);
  if (!owned || owned.is !== "draft" || !owned.returned?.againstCustody) expect.fail("the nested marker must round trip");
  expect(canonicalize([owned])).toBe(nestedBefore);
  const returnedMarker = owned.returned.againstCustody;
  Reflect.set(returnedMarker.identity.target, "genesis", digest("2"));
  if (!returnedMarker.identity.membership || !returnedMarker.authorization) expect.fail("the stored marker must keep its nested references");
  Reflect.set(returnedMarker.identity.membership, "genesis", digest("3"));
  Reflect.set(returnedMarker.authorization.identity.scope, "genesis", digest("4"));
  expect(canonicalize(await port.read(binding.owner, binding.scope))).toBe(nestedBefore);
  expect(changes).toBe(1);
});

test("legitimate absent and undetermined captures stay sparse, while missing capture data stops shape", () => {
  const { binding, row, definition } = fixture();
  const omitted = refineDraft(row, binding, definition);
  expect(omitted.act.expected).toEqual({ on: 1 });
  expect(omitted.capture["intent"]).toEqual({ is: "absent" });
  const laterInput = { ...row, capture: { ...row.capture, intent: { is: "undetermined" as const } } };
  expect(refineDraft(laterInput, binding, definition).capture["intent"]).toEqual({ is: "undetermined" });
  expect(() => refineDraft({ ...row, capture: { on: { is: "ref", ref: row.namedRefs.on } } }, binding, definition)).toThrow(ShapeError);
  expect(() => readStoredDrafts([{ ...row, act: { ...row.act, expected: {} } }], binding)).toThrow(ShapeError);
  // A changed supplied seen must not be replaced by an internally consistent but different expected value.
  const invented = { ...row, act: { ...row.act, expected: { on: 7 } }, capture: { ...row.capture, on: { is: "ref" as const, ref: { ...row.namedRefs.on, seen: 7 } } } };
  expect(() => refineDraft(invented, binding, definition)).toThrow(ShapeError);
});

test("present fields use the shared shaper while omitted required fields remain editable", () => {
  const { binding, row, definition } = fixture();
  expect(refineDraft(row, binding, definition).act.fields).toEqual({});
  const performer = { ...row, act: { ...row.act, fields: { performer: { membership: scope, member: "not-a-member" } } } };
  expect(() => refineDraft(performer, binding, definition)).toThrow(ShapeError);
  expect(() => refineDraft({ ...row, act: { ...row.act, fields: { unknown: true } } }, binding, definition)).toThrow(ShapeError);
  const assign = definition.acts["assign"];
  if (!assign) expect.fail("the maintained fixture must declare assign");
  const withItem = (required: boolean): DeclaredDefinition => ({ ...definition, acts: { ...definition.acts,
    assign: { ...assign, fields: { ...assign.fields, target: { type: "item", of: "intent", required, ...(required ? {} : { default: 0 }) } },
      also: { ...assign.also, target: { item: "intent", by: "target" } } },
  } });
  const optional = withItem(false), optionalBinding = { ...binding, definition: definitionDigest(optional) };
  const target = { name: 0, seen: 4, assumes: [] };
  const omitted = { ...row, definition: optionalBinding.definition,
    act: { ...row.act, expected: { on: 1, target: 4 } }, capture: { ...row.capture, target: { is: "derived" as const, ref: target } } };
  expect(refineDraft(omitted, optionalBinding, optional).act.fields).toEqual({});
  expect(refineDraft(omitted, optionalBinding, optional).slot.items).toEqual({});
  const notSupplied = { ...omitted, capture: { ...omitted.capture, target: { is: "ref" as const, ref: target } } };
  expect(() => refineDraft(notSupplied, optionalBinding, optional)).toThrow(ShapeError);
  const explicit = { ...omitted, slot: { ...omitted.slot, items: { target: 0 } },
    act: { ...omitted.act, fields: { target: 0 } }, capture: { ...omitted.capture, target: { is: "ref" as const, ref: target } },
    namedRefs: { ...omitted.namedRefs, fields: { target } } };
  expect(refineDraft(explicit, optionalBinding, optional).act.fields).toEqual({ target: 0 });
  expect(canonicalize(explicit.slot)).not.toBe(canonicalize(omitted.slot));
  expect(() => refineDraft({ ...omitted, act: { ...omitted.act, fields: { target: 0 } } }, optionalBinding, optional)).toThrow(ShapeError);
  expect(() => refineDraft({ ...omitted, act: { ...omitted.act, fields: { target: null } } }, optionalBinding, optional)).toThrow(ShapeError);
  const required = withItem(true), requiredBinding = { ...binding, definition: definitionDigest(required) };
  expect(() => refineDraft({ ...omitted, definition: requiredBinding.definition }, requiredBinding, required)).toThrow(ShapeError);
});

test("copied Source refs validate without a numeric stand-in or changed authored fields", () => {
  const { binding } = fixture(), source = { key: "retained-open", version: digest("b") };
  const reference = { name: { output: source }, seen: { after: source }, assumes: [source] };
  const row = { ...binding, is: "draft" as const, key: "symbolic", slot: { kind: "offer", on: null, items: { intent: reference.name } },
    act: { kind: "offer", on: null, fields: { intent: reference.name }, expected: { intent: reference.seen } },
    capture: { intent: { is: "ref" as const, ref: reference } }, namedRefs: { on: null, fields: { intent: reference } }, placement: "slot" as const };
  const sameBinding = { ...binding, definition: definitionDigest(citing) };
  const copied = structuredClone({ ...row, definition: sameBinding.definition });
  const result = refineDraft(copied, sameBinding, citing);
  expect(result.act).toEqual(copied.act);
  expect(result.namedRefs.fields["intent"]).toEqual(reference);
  const read = readDraftRef(reference);
  Reflect.set(reference, "seen", 9);
  expect(read.seen).toEqual({ after: source });
  expect(() => readDraftRef({ ...read, extra: true })).toThrow(ShapeError);
});

test("historical descriptor rows survive reads and cannot be promoted into new content", async () => {
  const { binding, row, definition } = fixture(), port = memoryDrafts();
  await port.write(binding.owner, binding.scope, [row]);
  const bytes = canonicalize(await port.read(binding.owner, binding.scope));
  expect(() => refineDraft(row, { ...binding, descriptor: digest("e") }, definition)).toThrow("descriptor-mismatch");
  expect(canonicalize(await port.read(binding.owner, binding.scope))).toBe(bytes);
});

test("a failed whole replacement preserves exact prior bytes and sends no change signal", async () => {
  const { binding, row } = fixture(), port = memoryDrafts(); let signals = 0;
  port.observe(() => { signals++; });
  await port.write(binding.owner, binding.scope, [row]);
  const before = canonicalize(await port.read(binding.owner, binding.scope));
  const bad = { ...row, act: { ...row.act, expected: {} } };
  await expect(port.write(binding.owner, binding.scope, [dismissal({ ...row, key: "prefix" }), bad])).rejects.toBeInstanceOf(ShapeError);
  expect(canonicalize(await port.read(binding.owner, binding.scope))).toBe(before);
  expect(signals).toBe(1);
});

test("dismissal is durable presentation data and observer failures cannot undo its commit", async () => {
  const { binding, row } = fixture(), port = memoryDrafts(); let notices = 0;
  port.observe(() => { throw new Error("TEST observer stopped"); });
  const stop = port.observe(() => { notices++; });
  const hidden = dismissal(row);
  await port.write(binding.owner, binding.scope, [hidden]);
  expect(await port.read(binding.owner, binding.scope)).toEqual([hidden]);
  expect(notices).toBe(1); stop();
  await port.write(binding.owner, binding.scope, [hidden]);
  expect(notices).toBe(1);
  expect(await port.read(binding.owner, binding.scope)).toEqual([hidden]);
});

test("return data keeps its cause and separate prospective basis through a memory round trip", async () => {
  const { binding, row, definition } = fixture(), port = memoryDrafts();
  const now = { name: 2, seen: 3, assumes: [] };
  const returned: StoredDraftReturn = { cause: { by: "exploration", reason: "revision-moved", class: "head" },
    expected: { on: 3 }, capture: { on: { is: "derived", ref: now }, intent: { is: "absent" } }, againstCustody: null };
  await port.write(binding.owner, binding.scope, [{ ...row, returned }]);
  const [stored] = await port.read(binding.owner, binding.scope);
  if (!stored || stored.is !== "draft") expect.fail("the returned draft must remain stored");
  const restored = refineDraft(stored, binding, definition);
  expect(restored.act.expected).toEqual({ on: 1 });
  expect(restored.returned).toEqual(returned);
  const damaged = { ...stored, returned: { ...returned, expected: {} } };
  expect(() => readStoredDrafts([damaged], binding)).toThrow(ShapeError);
  // The stored return carries no movement field: a stored movement is not admitted.
  expect(() => readStoredDrafts([{ ...stored, returned: { ...returned,
    movement: { head: { seq: 9, hash: digest("9") }, now, subjects: {} } } }], binding)).toThrow(ShapeError);
  const missingPrimary = { ...stored, returned: { ...returned, capture: { ...returned.capture, on: { is: "absent" as const } }, expected: {} } };
  expect(() => refineDraft(missingPrimary, binding, definition)).toThrow(ShapeError);
  const other = { ...now, name: 99 };
  const misaddressed = { ...stored, returned: { ...returned,
    capture: { ...returned.capture, on: { is: "derived" as const, ref: other } } } };
  expect(() => refineDraft(misaddressed, binding, definition)).toThrow(ShapeError);
  // A comment keeps its supplied primary without an expected.on key. Ordinary request causes are view data only.
  const commentOn = { name: 0, seen: 1, assumes: [] };
  const comment = { ...row, slot: { kind: "remark", on: 0, items: {} },
    act: { kind: "remark", on: 0, fields: {}, expected: {} }, capture: {},
    namedRefs: { on: commentOn, fields: {} } };
  const plainComment = refineDraft(comment, binding, definition);
  expect(plainComment.act.expected).toEqual({});
  expect(plainComment.namedRefs.on).toEqual(commentOn);
  const requestCause = { by: "request", status: "refused", why: { by: "scope", reason: "unauthorized", class: "head" } };
  const invented = { ...comment, returned: { ...returned, cause: requestCause } };
  expect(() => readStoredDrafts([invented], binding)).toThrow(ShapeError);
  // An exploration tag cannot admit a request's extra members or unrelated return metadata.
  expect(() => readStoredDrafts([{ ...stored, returned: { ...returned,
    cause: { ...returned.cause, why: requestCause.why } } }], binding)).toThrow(ShapeError);
  expect(() => readStoredDrafts([{ ...stored, returned: { ...returned, status: "refused" } }], binding)).toThrow(ShapeError);
  expect(restored.returned?.againstCustody).toBeNull();
  for (const authorized of [false, true]) {
    const held = occurrence(row, authorized), tagged = { ...stored, returned: { ...returned, againstCustody: held } };
    await port.write(binding.owner, binding.scope, [tagged]);
    const [roundTrip] = await port.read(binding.owner, binding.scope);
    if (!roundTrip || roundTrip.is !== "draft") expect.fail("the historical marker must remain a draft");
    const refined = refineDraft(roundTrip, binding, definition);
    expect(refined.act.expected).toEqual({ on: 1 });
    expect(refined.returned).toEqual(tagged.returned);
    expect(refined.returned?.capture).toEqual(returned.capture);
    expect(Object.hasOwn(refined.returned!.againstCustody!, "authorization")).toBe(authorized);
  }
  const held = occurrence(row), authorization = held.authorization;
  if (!authorization) expect.fail("the synthetic authorized marker must include its reference");
  const looseMembership = { ...held, identity: { ...held.identity, service: "", membership: null } };
  expect(readStoredDrafts([{ ...stored, returned: { ...returned, againstCustody: looseMembership } }], binding)[0])
    .toMatchObject({ returned: { againstCustody: looseMembership } });
  const missing = { ...returned }; Reflect.deleteProperty(missing, "againstCustody");
  expect(() => readStoredDrafts([{ ...stored, returned: missing }], binding)).toThrow(ShapeError);
  const invalid = [
    { ...held, extra: true },
    { ...held, identity: { ...held.identity, extra: true } },
    { ...held, identity: { ...held.identity, signer: keys.una.key } },
    { ...held, identity: { ...held.identity, key: "another-key" } },
    { ...held, identity: { ...held.identity, target: { ...scope, genesis: digest("f") } } },
    { ...held, authorization: { ...authorization, extra: true } },
    { ...held, authorization: { ...authorization, identity: { ...authorization.identity, owner: keys.una.key } } },
    { ...held, authorization: { ...authorization, identity: { ...authorization.identity, key: "another-key" } } },
    { ...held, authorization: { ...authorization, identity: { ...authorization.identity, scope: { ...scope, genesis: digest("f") } } } },
    { ...held, attempt: 0 }, { ...held, signing: -0 },
    { ...held, authorization: { ...authorization, position: -1 } },
    { ...held, authorization: { ...authorization, permission: Number.MAX_SAFE_INTEGER + 1 } },
    { ...held, intent: "not-a-digest" }, { ...held, authorization: null }, { ...held, authorization: undefined },
  ];
  for (const againstCustody of invalid) {
    expect(() => readStoredDrafts([{ ...stored, returned: { ...returned, againstCustody } }], binding)).toThrow(ShapeError);
  }
  const creation = { ...held, identity: { ...held.identity, target: { create: binding.definition } } };
  expect(readDeliveryOccurrence(creation).identity.target).toEqual({ create: binding.definition });
  expect(() => readStoredDrafts([{ ...stored, returned: { ...returned, againstCustody: creation } }], binding)).toThrow(ShapeError);
});
