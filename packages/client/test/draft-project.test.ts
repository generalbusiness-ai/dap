/** Pure routing only. Entry, occurrence and C3 status inputs below are DATA DOUBLES,
 * not proof of Native classification, custody acquisition, a signature, or a member fence. */
import { expect, test } from "vitest";
import type { DeclaredDefinition, Digest, ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize, definitionDigest } from "@generalbusiness/dap-bytes";
import { keys } from "@generalbusiness/dap-derive/testing";
import type { DeliveryOccurrence, Identity } from "../src/custody.ts";
import type { SignedEntry } from "../src/replica.ts";
import type { RequestView } from "../src/scope-client.ts";
import { projectDrafts } from "../src/draft-project.ts";
import type { DraftKeyEvidence, DraftProjectInput, ProjectStoredKey } from "../src/draft-project-types.ts";
import { slotFor } from "../src/draft-slot.ts";
import { readStoredDrafts, refineDraft, type DraftBinding, type DraftDismissal, type StoredDraft, type StoredDraftReturn } from "../src/draft-store.ts";
import { selection } from "./support/c4-selection.ts";
import type { DraftReturnView } from "../src/draft-project-types.ts";
/** `returned` is on the editing arm only; the tests read it without narrowing first. */
const returnedOf = (view: unknown): DraftReturnView | undefined => (view as { readonly returned?: DraftReturnView } | undefined)?.returned;

// Extend the accepted inert declaration as the Slot owner does. This is structural
// TEST data: optional peer supplies an address; editable on stays separate from primary on.
const definition = {
  ...selection, acts: { ...selection.acts,
    choose: {
      step: "transition", on: "anchor", grant: "c4-selection.member",
      also: { peer: { item: "target", by: "peer" } },
      fields: { peer: { type: "item", of: "target", required: false, default: 2 },
        on: { type: "text", max: 16, required: false } },
      guards: [], effects: [], sends: [], attention: [],
    },
  },
} as const satisfies DeclaredDefinition;
type Definition = typeof definition;
const digest = (hex: string): Digest => `sha256:${hex.repeat(64)}`;
const scope: ScopeRef = { scope: `sc_${"a".repeat(52)}`, genesis: digest("a") };
const TEST_DESCRIPTOR = digest("d"), TEST_PREVIOUS_DESCRIPTOR = digest("e");
const binding: DraftBinding = { owner: keys.rita.key, scope, definition: definitionDigest(definition), descriptors: { choose: TEST_DESCRIPTOR } };
/** The stored fields of a row under this binding: the binding without its lookup, and the digest of its own act. */
const rowBase = { owner: binding.owner, scope, definition: binding.definition, descriptor: TEST_DESCRIPTOR };
const who: Omit<Identity, "key"> = { service: "https://draft.test", membership: { scope: `sc_${"b".repeat(51)}a`, genesis: digest("b") },
  signer: binding.owner, target: scope };
const primary = (name: number, seen = 1) => ({ name, seen, assumes: [] });
/** TEST rows of one checked cut: the anchor at revision 3 and the default peer target at revision 3. */
const CUT = { head: { seq: 9, hash: digest("9") }, rows: [
  { id: 0, type: "anchor", revision: 3, refs: {}, values: {} },
  { id: 2, type: "target", revision: 3, refs: {}, values: { n: 1 } },
] };
function draft(key: string, name: number, placement: "slot" | "waiting" = "slot", suppliedPeer = false): StoredDraft {
  const on = primary(name), peer = primary(2, 3);
  return { ...rowBase, is: "draft", key, slot: { kind: "choose", on: name, items: suppliedPeer ? { peer: 2 } : {} },
    act: { kind: "choose", on: name, fields: { on: "member words", ...(suppliedPeer ? { peer: 2 } : {}) }, expected: { on: 1, peer: 3 } },
    capture: { on: { is: "ref", ref: on }, peer: { is: suppliedPeer ? "ref" : "derived", ref: peer } },
    namedRefs: { on, fields: suppliedPeer ? { peer } : {} }, placement };
}
function dismissed(row: StoredDraft): DraftDismissal {
  return { is: "dismissed", key: row.key, owner: row.owner, scope: row.scope,
    definition: row.definition, descriptor: row.descriptor, slot: row.slot };
}
/** An owned occurrence DATA DOUBLE, not a kept record or permission. */
function occurrence(key: string, attempt = 1): DeliveryOccurrence {
  return { identity: { ...who, key }, attempt, signing: 0, intent: digest("c"),
    authorization: { identity: { key, owner: binding.owner, scope }, position: 2, permission: 1 } };
}
/** An entry DATA DOUBLE, not a signed/verified ledger fixture. */
function entry(key: string, meaning = digest("4")): SignedEntry {
  return { fact: { at: scope, seq: 8, hash: digest("8") }, actor: binding.owner, key, intent: digest("c"), meaning, opened: null };
}
const absent = (key: string): DraftKeyEvidence => ({ is: "absent", identity: { ...who, key } });
const cell = (stored: StoredDraft, evidence: DraftKeyEvidence): ProjectStoredKey<Definition> => ({ is: "current", stored, evidence, local: { is: "idle" } });
function candidate(stored: readonly ProjectStoredKey<Definition>[], custodyOnly: readonly RequestView<Definition>[] = []): DraftProjectInput<Definition> {
  // Use the actual accepted whole-batch decoder and refiner, not another storage grammar.
  const admitted = readStoredDrafts(stored.map(row => row.stored), binding);
  const checked = admitted.map((row, index): ProjectStoredKey<Definition> => {
    const source = stored[index];
    if (!source) return expect.fail("every admitted row must keep its explicit evidence");
    if (row.is === "dismissed") {
      if (source.is !== "dismissed") return expect.fail("a dismissal keeps its explicit suppression evidence");
      return { is: "dismissed", stored: row, evidence: source.evidence };
    }
    if (source.is === "historical") return { is: "historical", stored: row, evidence: source.evidence };
    if (source.is !== "current") return expect.fail("current drafts alone enter current refinement");
    return { is: "current", stored: refineDraft(row, binding, definition), evidence: source.evidence, local: source.local };
  });
  return { definition, binding, identity: who, state: { is: "current" }, cut: CUT, stored: checked, custodyOnly };
}

// One causal batch: explicit expected routes, copied addresses and no omission/default collapse.
test("one owned candidate routes each intention once and keeps partial Slot values detached", () => {
  const editing = draft("editing", 0), explicit = draft("explicit", 0, "slot", true), waiting = draft("waiting", 0, "waiting");
  const hidden = dismissed(draft("hidden", 2)), matched = draft("matched", 3), other = draft("other", 4);
  const pending = draft("pending", 5), held = draft("held", 6);
  // Raw historical structure is deliberately not a form of the current declaration.
  const historical: StoredDraft = { ...draft("history", 7), descriptor: TEST_PREVIOUS_DESCRIPTOR,
    slot: { kind: "old-form", on: 7, items: {} },
    act: { kind: "old-form", on: 7, fields: { oldOnly: { unrefined: true } }, expected: { on: 1, peer: 3 } } };
  const only: RequestView<Definition> = { is: "request", key: "custody-only", kind: "rename-anchor", values: { on: 0, fields: { label: "kept" } },
    status: "pending", predicted: { is: "not-judged" } };
  const input = candidate([
    cell(editing, absent(editing.key)), cell(explicit, absent(explicit.key)), cell(waiting, absent(waiting.key)),
    { is: "dismissed", stored: hidden, evidence: { is: "absent", identity: { ...who, key: hidden.key } } },
    cell(matched, { is: "entry", identity: { ...who, key: matched.key }, entry: entry(matched.key), presentMeaning: digest("4"),
      observed: { is: "found", occurrence: occurrence(matched.key) } }),
    cell(other, { is: "entry", identity: { ...who, key: other.key }, entry: entry(other.key), presentMeaning: digest("5"), observed: { is: "absent" } }),
    cell(pending, { is: "request", identity: { ...who, key: pending.key }, occurrence: occurrence(pending.key), status: { status: "pending" }, predicted: { is: "not-judged" } }),
    cell(held, { is: "non-request", identity: { ...who, key: held.key }, occurrence: occurrence(held.key), excludedBy: "standalone", verifiedEntry: entry(held.key) }),
    { is: "historical", stored: historical, evidence: { is: "absent", identity: { ...who, key: historical.key }, verifiedEntry: entry(historical.key) } },
  ], [only]);
  const before = canonicalize(input), projected = projectDrafts(input);
  const slotKeys = [...projected.drafts].map(([, view]) => view.key), listKeys = projected.requests.map(row => row.key);
  expect(slotKeys.sort()).toEqual(["editing", "explicit"]);
  expect(listKeys.sort()).toEqual(["custody-only", "held", "history", "other", "pending", "waiting"]);
  const visible = [...slotKeys, ...listKeys];
  expect(new Set(visible).size).toBe(visible.length);
  expect(projected.routing).toHaveLength(10);
  expect(new Set(projected.routing.map(row => row.key)).size).toBe(10);
  expect(projected.routing.find(row => row.key === "hidden")?.route).toBe("dismissed");
  expect(projected.routing.find(row => row.key === "matched")?.route).toBe("recorded");

  const omitted = slotFor(definition, "choose", { on: primary(0, 99) });
  const given = slotFor(definition, "choose", { on: primary(0, 99), fields: { peer: primary(2, 99) } });
  const value = projected.drafts.get(structuredClone(omitted));
  if (!value) return expect.fail("a copied equal address must locate the original draft");
  expect(value.key).toBe("editing");
  expect(value.values.on).toBe("member words");
  expect(value.slot.on).toEqual(primary(0));
  expect(value.slot.fields).toEqual({});
  expect(projected.drafts.get(given)?.key).toBe("explicit");
  expect(projected.drafts.get(given)?.values).toEqual({ on: "member words" });
  Reflect.set(value.values, "on", "reader mutation"); Reflect.set(value.slot.on, "seen", 77);
  expect(projected.drafts.get(omitted)?.values.on).toBe("member words");
  expect(projected.drafts.get(omitted)?.slot.on.seen).toBe(1);

  const notice = projected.requests.find(row => row.key === "held");
  if (!notice || notice.is !== "held-intention" || notice.reason !== "nonrequest-held") return expect.fail("excluded work must keep the stored partial intention visible");
  expect(Object.keys(notice).sort()).toEqual(["entry", "is", "key", "kind", "reason", "values"]);
  expect(notice.entry).toEqual(entry(held.key).fact);
  expect(notice.values).toEqual({ on: "member words" });
  const historyNotice = projected.requests.find(row => row.key === "history");
  expect(historyNotice).toEqual({ is: "held-intention", reason: "another-descriptor", key: "history", descriptor: TEST_PREVIOUS_DESCRIPTOR, entry: entry(historical.key).fact });
  const bothFacts = projectDrafts({ ...input, stored: input.stored.map((source): ProjectStoredKey<Definition> => source.is === "historical"
    ? { ...source, evidence: { is: "non-request", identity: { ...who, key: historical.key }, occurrence: occurrence(historical.key),
      excludedBy: "standalone", verifiedEntry: entry(historical.key) } } : source) });
  expect(bothFacts.requests.find(row => row.key === "history")).toEqual(historyNotice);
  const noEntry = projectDrafts({ ...input, stored: input.stored.map((source): ProjectStoredKey<Definition> => source.is === "historical"
    ? { ...source, evidence: { is: "absent", identity: { ...who, key: historical.key } } } : source) });
  const withoutEntry = noEntry.requests.find(row => row.key === "history");
  expect(withoutEntry).toEqual({ is: "held-intention", reason: "another-descriptor", key: "history", descriptor: TEST_PREVIOUS_DESCRIPTOR });
  // Planner 6d3b979f item 4: a stored definition digest that differs shows `another-definition`, with the key and that digest only.
  // The definition is checked first, so a row that differs in both shows it too, and a row that differs in the definition alone does too.
  for (const descriptor of [TEST_PREVIOUS_DESCRIPTOR, TEST_DESCRIPTOR]) {
    const otherDefinition = projectDrafts({ ...input, stored: input.stored.map((source): ProjectStoredKey<Definition> => source.is === "historical"
      ? { is: "historical", stored: { ...historical, definition: digest("f"), descriptor },
        evidence: { is: "absent", identity: { ...who, key: historical.key } } } : source) });
    expect(otherDefinition.requests.find(row => row.key === "history")).toEqual({ is: "held-intention", reason: "another-definition", key: "history", definition: digest("f") });
    expect(otherDefinition.drafts.get(omitted)?.key).toBe("editing");
  }
  const keptHistory: RequestView<Definition> = { ...only, key: "history" };
  const ordinaryHistory = projectDrafts({ ...input, stored: input.stored.map((source): ProjectStoredKey<Definition> => source.is === "historical"
    ? { ...source, evidence: { is: "ordinary", identity: { ...who, key: historical.key }, occurrence: occurrence(historical.key), view: keptHistory } }
    : source) });
  expect(ordinaryHistory.requests.find(row => row.key === "history")).toEqual(keptHistory);
  expect(ordinaryHistory.drafts.get(omitted)?.key).toBe("editing");
  const privateBefore = canonicalize(projected.routing);
  Reflect.set(notice.values, "on", "public notice mutation");
  expect(canonicalize(projected.routing)).toBe(privateBefore);
  expect(canonicalize(input)).toBe(before);
  expect(() => projectDrafts({ ...input, stored: input.stored.map((source): ProjectStoredKey<Definition> => source.is === "historical"
    ? { ...source, evidence: { is: "absent", identity: { ...who, key: historical.key }, verifiedEntry: { ...entry(historical.key), key: "another-key" } } }
    : source) })).toThrow("entry belongs to another identity");
  expect(() => projectDrafts({ ...input, custodyOnly: [{ ...only, key: "editing" }] })).toThrow("custody-only key overlaps another route");
});

// C3 statuses, C0/C1 and entry below are labelled data doubles. The assertions
// prove priority and basis retention, not the acquisition of any of those facts.
test("same C0 keeps the return while a kept C1 changes only the visible cause; both views recompute now and retain B1", () => {
  const row = draft("movement", 0), c0 = occurrence(row.key), c1 = occurrence(row.key, 2);
  const now = primary(0, 3), peer = primary(2, 3);
  const movement: StoredDraftReturn = { cause: { by: "exploration", reason: "revision-moved", class: "head" },
    expected: { on: 3, peer: 3 }, capture: { on: { is: "derived", ref: now }, peer: { is: "derived", ref: peer } }, againstCustody: c0 };
  const returned = { ...row, returned: movement }, original = canonicalize(returned);
  const why = { by: "scope" as const, reason: "revision-moved" as const, class: "head" as const, name: "first refusal" };
  const request = (held: DeliveryOccurrence): DraftKeyEvidence => ({ is: "request", identity: { ...who, key: row.key },
    occurrence: held, status: { status: "refused", why }, predicted: { is: "not-judged" } });
  const sameInput = candidate([cell(returned, request(c0))]);
  const first = projectDrafts(sameInput);
  why.name = "late same signing";
  const same = projectDrafts(sameInput), empty = projectDrafts(candidate([cell(returned, absent(row.key))]));
  const address = slotFor(definition, "choose", { on: primary(0) });
  // The view recomputes the movement and now from the kept draft and the cut's rows. The stored return holds neither.
  const subjects = { on: { is: "present" as const, ref: now }, peer: { is: "present" as const, ref: peer } };
  const shown = { is: "now" as const, now: { key: row.key, kind: "choose", address: row.slot, head: CUT.head, primary: now, subjects } };
  const exploration = { by: "exploration", cause: movement.cause, movement: { head: CUT.head, now, subjects }, now: shown };
  expect(returnedOf(first.drafts.get(address))).toEqual(exploration);
  expect(returnedOf(same.drafts.get(address))).toEqual(exploration);
  expect(returnedOf(empty.drafts.get(address))).toEqual(exploration);

  // Same intent, position and clock-free input; only an actual occurrence field changes.
  expect(c1.intent).toBe(c0.intent);
  expect(c1.signing).toBe(c0.signing);
  expect(c1.authorization).toEqual(c0.authorization);
  const later = projectDrafts(candidate([cell(returned, request(c1))]));
  expect(returnedOf(later.drafts.get(address))).toEqual({ by: "request", status: "refused", why, now: shown });

  const active: ProjectStoredKey<Definition> = { is: "current", stored: returned, evidence: request(c0), local: { is: "submitting", against: returned } };
  const stoppedInput = candidate([active]);
  const stopped = projectDrafts({ ...stoppedInput, state: { is: "stopped", cause: { by: "log" } } });
  expect(stopped.drafts.get(address)).toMatchObject({ state: "editing" });
  expect(returnedOf(stopped.drafts.get(address))).toBeUndefined();
  const pendingInput = candidate([{ ...active, evidence: { is: "request", identity: { ...who, key: row.key },
    occurrence: c1, status: { status: "pending" as const }, predicted: { is: "not-judged" as const } } }]);
  const pending = projectDrafts({ ...pendingInput, state: { is: "stopped", cause: { by: "log" } } });
  expect([...pending.drafts]).toHaveLength(0);
  expect(pending.requests).toMatchObject([{ is: "draft", key: row.key, status: "pending" }]);
  const recordedInput = candidate([{ ...active, evidence: { is: "entry", identity: { ...who, key: row.key },
    entry: entry(row.key), presentMeaning: digest("4"), observed: { is: "found" as const, occurrence: c1 } } }]);
  const recorded = projectDrafts({ ...recordedInput, state: { is: "stopped", cause: { by: "log" } } });
  expect([...recorded.drafts]).toHaveLength(0);
  expect(recorded.requests).toEqual([]);
  expect(recorded.routing[0]?.route).toBe("recorded");

  for (const output of [first, same, empty, later, stopped, pending, recorded]) {
    const retained = output.routing[0];
    if (!retained || retained.from !== "stored" || retained.source.stored.is !== "draft") return expect.fail("every route must retain its private stored source");
    expect(retained.source.stored.act.expected).toEqual({ on: 1, peer: 3 });
    expect(retained.source.stored.returned?.expected).toEqual({ on: 3, peer: 3 });
    expect(retained.source.stored.returned?.capture).toEqual(movement.capture);
    expect(canonicalize(retained.source.stored)).toBe(original);
  }
  expect(canonicalize(returned)).toBe(original);
  expect(sameInput.stored[0]?.stored).toEqual(returned);
});
