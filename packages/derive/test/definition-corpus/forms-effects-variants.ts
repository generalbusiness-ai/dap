/** Raw declarations used by handler/result-clause histories. */
import type { DeclaredDefinition, EffectForm, Guard, Notify } from "@generalbusiness/dap-contract";
import { desk, ticket } from "./fixture-data.ts";
import { cards, owner } from "./forms-effects-data.ts";
/* eslint-disable @typescript-eslint/no-explicit-any */
export function auditedData(kind: string, under: string): DeclaredDefinition {
  const d = structuredClone(desk) as any;
  d.items.repo.refs.asked = { fixed: false, required: false, to: { type: "fact", kind: [kind], under } };
  d.receives.audit = { message: "audit", class: "tell", from: { kind: "lane" }, fields: { repo: { type: "item", of: "repo", required: true } }, opens: null, also: { repo: { item: "repo", by: "repo" } }, guards: [], effects: [{ of: "also.repo", ref: { slot: "asked", from: { source: "ref" } } }], sends: [], attention: [] };
  return d;
}

export function refusingTicketData(): DeclaredDefinition {
  const d = structuredClone(ticket) as any;
  d.acts.link.fields.why = { type: "int", min: 0, max: 9, required: true };
  d.acts.link.sends[0].relate.detail.why = { field: "why" };
  const set = { some: { type: "link", states: ["set"], where: [{ equals: { a: { slot: "me" }, b: { item: "on" } } }] } };
  d.acts.link.sends[0].relate.result = { refused: [{ state: "removed", if: [{ equals: { a: { result: "reason" }, b: { const: "one" } } }, set] }] };
  d.receives.closes.fields.why = { type: "int", min: 0, max: 9, required: true };
  d.receives.closes.guards = [{ differs: { a: { field: "why" }, b: { const: 1 } }, reason: "one" }, { differs: { a: { field: "why" }, b: { const: 2 } }, reason: "two" }];
  return d;
}

/** Admission permits this constant; the existing condition skip also reads its nested subject name. */
export function unboundConditionData(): DeclaredDefinition {
  const d = structuredClone(cards);
  const condition: Guard[] = [{ equals: { a: { const: { nested: { of: "also.parent" } } }, b: { const: { nested: { of: "also.parent" } } } } }];
  return { ...d, acts: { ...d.acts, probe: {
    ...d.acts["edit"]!,
    fields: { parent: { type: "item", of: "card", required: false } },
    also: { parent: { item: "card", by: "parent" } },
    effects: [{ value: { slot: "text", from: { const: "applied" } }, if: condition }],
    attention: [{ notify: { of: "on", slot: "owner", when: "after", reason: "told", if: condition } }],
  } } };
}

/** The old raw effect probes now have actual admitted bodies and an unknown entry-field source. */
export function effectProbeData(kind: string, forms: readonly EffectForm[], attention: readonly Notify[], opens: string | null): DeclaredDefinition {
  const d = structuredClone(cards), base = d.acts[kind]!;
  const unknown = (form: EffectForm): EffectForm => {
    const source = { field: "test-proof", part: { field: "sent" } } as const;
    if ("party" in form && form.party.from && !Array.isArray(form.party.from) && "field" in form.party.from && form.party.from.field === "sent") return { ...form, party: { ...form.party, from: source } };
    if ("ref" in form && form.ref.from && form.ref.from !== "self" && "field" in form.ref.from && form.ref.from.field === "sent") return { ...form, ref: { ...form.ref, from: source } };
    if ("value" in form && form.value.from && "field" in form.value.from && form.value.from.field === "sent") return { ...form, value: { ...form.value, from: source } };
    return form;
  };
  return { ...d, acts: { ...d.acts, probe: { ...base,
    step: opens ? "open" : "transition", on: opens ?? base.on,
    fields: { ...base.fields, "test-proof": { type: "fact", kind: ["test-input"], under: "test-effects-source", required: true } },
    effects: [...(opens ? [owner] : []), ...forms.map(unknown)], sends: [], attention: [...attention],
  } } };
}

/** One body exposes owned value, clock, member and notice instructions. */
export function effectOwnershipData(): DeclaredDefinition {
  const d = structuredClone(cards);
  d.items["card"]!.values["due"] = { fixed: false, required: false, of: { type: "time" } };
  d.acts["edit"] = { ...d.acts["edit"]!, fields: {}, guards: [], effects: [
    { value: { slot: "text", from: { const: "captured" } } },
    { value: { slot: "due", from: { time: { plusSeconds: 2 } } } },
    { party: { slot: "helper", from: { signer: true } } },
  ], attention: [{ notify: { of: "on", slot: "owner", when: "after", reason: "captured" } }] };
  return d;
}

/** Two written occurrences share one source object but receive separate lexical binders. */
export function aliasedAttributionData(): DeclaredDefinition {
  const d = structuredClone(cards), effect = d.acts["sum"]!.effects.find(form => "attribute" in form);
  if (!effect || !("attribute" in effect)) throw new Error("expected the attribution fixture");
  const sources = effect.attribute.with ?? [], each = sources.find(source => "each" in source);
  if (!each) throw new Error("expected the each attribution source");
  effect.attribute.with = [...sources, each];
  return d;
}
