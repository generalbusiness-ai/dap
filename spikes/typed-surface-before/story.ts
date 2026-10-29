/**
 * A scenario written as a story over the real judges. Each step runs on an
 * in-memory ledger as it is written: the act's `expected` revisions are read
 * from the fold, the answer is the judge's, and a projection step is the
 * state as it stands. The story is refused while it is written if what the
 * author expects is not what the judge says. The result is the scenario
 * file the CLI runs (format v1). examples/lending/scenarios/application.json
 * is the witness.
 */
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import type { DeclaredDefinition, FieldValue, SignedIntent } from "@generalbusiness/dap-contract";
import { prepareRules, validateDefinition } from "@generalbusiness/dap-derive";
import { evaluateRules, RULE_PROFILES } from "@generalbusiness/dap-derive/rule";
import { created, directory, grantOf, keys, valid, type Actor, type Ledger } from "@generalbusiness/dap-derive/testing";
import type { projection as projectionOf } from "./package.ts";

type Json = FieldValue | { $member: string } | { $reference: string };
type Projection = ReturnType<typeof projectionOf>;

/** A member of the story, by actor name. */
export const member = (actor: string) => ({ $member: actor }) as const;
/** A scope the story refers to by name. */
export const reference = (name: string) => ({ $reference: name }) as const;
export const accepted = { answer: "accepted" } as const;
export const refused = (reason: string) => ({ answer: "refused", reason }) as const;
type Expect = typeof accepted | ReturnType<typeof refused>;

export interface StorySpec<D extends DeclaredDefinition> {
  name: string; time: string; definition: D; projections: Record<string, Projection>;
  actors: Record<string, { seed: string; actions: readonly string[] }>;
  founding: { actor: string; fields: Record<string, Json> };
}
export interface Saved { readonly name: string }
export interface Teller<D extends DeclaredDefinition> {
  /** An act by `actor`; its `expected` revisions come from the fold; the judge's answer must be `expect`. */
  act(actor: string, kind: keyof D["acts"] & string, asked: { on?: number; fields?: Record<string, Json> }, expect: Expect, save?: string): Saved;
  /** The same signed intent again. */
  retry(saved: Saved, expect: Expect): void;
  /** What an item is, as the fold has it. */
  assert(item: number, is: { state: string; parties?: Record<string, { $member: string }>; values?: Record<string, FieldValue> }): void;
  /** The rows a projection's sources hold now; `fields` names the item fields to record. */
  projection(name: string, sources?: readonly string[], fields?: Record<string, readonly string[]>): void;
}

export async function tell<D extends DeclaredDefinition>(spec: StorySpec<D>, body: (s: Teller<D>) => Promise<void> | void) {
  const names = Object.keys(spec.actors), who = Object.values(keys);
  if (names.length > who.length) throw new Error(`at most ${who.length} actors`);
  const actor = (name: string): Actor => { const i = names.indexOf(name); if (i < 0) throw new Error(`no actor ${name}`); return who[i]!; };
  const resolve = (v: Json): FieldValue => typeof v === "object" && v !== null && "$member" in v && typeof v.$member === "string" ? actor(v.$member).member
    : typeof v === "object" && v !== null && "$reference" in v ? { ...directory, kind: v.$reference as "destination" } : v as FieldValue;
  const fieldsOf = (fields: Record<string, Json>) => Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, resolve(v)]));

  const checked = validateDefinition(spec.definition, PROPOSED_BOUNDS, RULE_PROFILES);
  if (!checked.ok) throw new Error(JSON.stringify(checked.problems));
  const s: Ledger = created(valid(checked), fieldsOf(spec.founding.fields));
  const grants = () => ({ grants: names.map((n) => ({ grant: grantOf(actor(n), s.at, spec.actors[n]!.actions), current: true })) });
  const steps: unknown[] = [];
  const saved = new Map<string, SignedIntent>();

  /** The items whose revisions the act expects: its own, and each `also` item the definition's rules resolve from the fold. */
  const subjects = (kind: string, on: number | undefined, fields: Record<string, FieldValue>) => {
    const out: Record<string, number> = {};
    if (on !== undefined) out["on"] = on;
    for (const [alias, rule] of Object.entries(spec.definition.acts[kind]!.also)) {
      if ("one" in rule) { const live = s.state.page(rule.item, Object.keys(spec.definition.items[rule.item]!.states), null, 1).items[0]; if (live) out[alias] = live.id; }
      else if ("by" in rule) { const id = fields[rule.by]; if (typeof id === "number") out[alias] = id; }
    }
    return out;
  };
  const submit = async (signed: SignedIntent) => {
    const prepared = await evaluateRules(prepareRules(s.state, s.definition, { act: signed, context: s.context(grants()) }));
    return s.submit(signed, { ...grants(), prepared });
  };
  const answer = (judged: Awaited<ReturnType<typeof submit>>): Expect =>
    judged.result === "write" || judged.result === "accepted-before" ? accepted : judged.result === "refused" ? refused(judged.reason) : (() => { throw new Error(`the judge said ${JSON.stringify(judged)}`); })();
  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
  const must = (what: string, got: unknown, want: unknown) => { if (!same(got, want)) throw new Error(`${what}: the story expects ${JSON.stringify(want)}, the judge says ${JSON.stringify(got)}`); };

  // The steps are written in order; each awaits the judge.
  const queue: (() => Promise<void>)[] = [];
  const teller: Teller<D> = {
    act(name, kind, asked, expect, save) {
      queue.push(async () => {
        const fields = asked.fields ?? {}, resolved = fieldsOf(fields), on = asked.on;
        const ids = subjects(kind, on, resolved);
        // The ledger judges the revisions as they stand; the file names the items, and the CLI reads their revisions when it runs.
        const signed = s.intent(actor(name), kind, { ...(on !== undefined ? { on } : {}), expected: Object.fromEntries(Object.entries(ids).map(([k, id]) => [k, s.item(id).revision])), fields: resolved });
        must(`${name} ${kind}`, answer(await submit(signed)), expect);
        if (save) saved.set(save, signed);
        steps.push({ act: { actor: name, kind, ...(on !== undefined ? { on } : {}), expected: Object.fromEntries(Object.entries(ids).map(([k, id]) => [k, { $revision: id }])), fields }, expect, ...(save ? { save } : {}) });
      });
      return { name: save ?? "" };
    },
    retry(which, expect) {
      queue.push(async () => {
        const signed = saved.get(which.name); if (!signed) throw new Error(`nothing saved as ${which.name}`);
        must(`retry ${which.name}`, answer(await submit(signed)), expect);
        steps.push({ retry: which.name, expect });
      });
    },
    assert(id, is) {
      queue.push(async () => {
        const item = s.item(id);
        must(`item ${id} state`, item.state, is.state);
        for (const [slot, m] of Object.entries(is.parties ?? {})) must(`item ${id} ${slot}`, item.parties[slot], actor(m.$member).member);
        for (const [slot, v] of Object.entries(is.values ?? {})) must(`item ${id} ${slot}`, item.values[slot], v);
        steps.push({ assert: { item: id, ...is } });
      });
    },
    projection(name, sources, fields = {}) {
      queue.push(async () => {
        const declared = spec.projections[name]; if (!declared) throw new Error(`no projection ${name}`);
        const chosen = sources ?? Object.entries(declared.sources).filter(([, src]) => src.read !== "entries").map(([n]) => n);
        const rows = Object.fromEntries(chosen.map((source) => {
          const src = declared.sources[source]; if (!src) throw new Error(`no source ${source} in ${name}`);
          if (src.read === "entries") {
            const acts = new Set(src.acts);
            const window = src.window ?? 100, limit = src.limit ?? 100;
            return [source, s.entries.slice(-window).map((e, i, all) => ({ e, seq: s.entries.length - all.length + i })).filter(({ e }) => e.entry.input.type === "act" && acts.has(e.entry.input.signed.intent.kind))
              .slice(0, limit).map(({ e, seq }) => ({ id: seq, type: (e.entry.input as { signed: SignedIntent }).signed.intent.kind, state: "sealed" }))];
          }
          const shown = fields[source];
          return [source, s.state.page(src.item!, src.states ?? [], null, src.limit ?? 100).items.map((it) => ({ id: it.id, state: it.state, ...(shown ? { fields: Object.fromEntries(shown.map((f) => [f, it.values[f] ?? it.parties[f] ?? it.refs[f]])) } : {}) }))];
        }));
        steps.push({ projection: { name, sources: rows, at: { seq: s.entries.length - 1 } } });
      });
    },
  };
  await body(teller);
  for (const step of queue) await step();
  return {
    v: 1, name: spec.name, time: spec.time,
    actors: Object.fromEntries(names.map((n) => [n, { seed: spec.actors[n]!.seed, member: `@${n}`, actions: spec.actors[n]!.actions }])),
    founding: spec.founding, steps,
  };
}
