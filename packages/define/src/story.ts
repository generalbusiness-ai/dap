/** Scenario v1 authoring over the maintained judges and fold, with scripted TEST grants. */
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import type { DeclaredDefinition, Digest, Entry, FieldType, FieldValue, Grant, Intent, KeyId, MemberId, MemberRef, ObservationUse, ScopeKind, ScopeRef, Seed, SignedIntent, Timestamp } from "@generalbusiness/dap-contract";
import { canonicalize, entryHash, intentDigest, keyIdOfSecret, newGenesisNonce, newIncarnation, scopeIdOf, signIntent } from "@generalbusiness/dap-bytes";
import { alsoItems, applyEntry, clockOf, entryOf, judgeAct, judgeGenesis, judgeTimed, MemoryState, nextDue, prepareRules, readFields, timeMs, timeOf, validateDefinition } from "@generalbusiness/dap-derive";
import type { ActJudgment, Draft, JudgeContext, ValidDefinition } from "@generalbusiness/dap-derive";
import { evaluateRules, RULE_PROFILES } from "@generalbusiness/dap-derive/rule";
import type { Projection } from "./package.ts";
import type { NativeInputFields } from "./field-input.ts";

export const member = <const A extends string>(actor: A) => ({ $member: actor }) as const;
export const reference = <const K extends "membership" | "destination">(kind: K) => ({ $reference: kind }) as const;
type StoryMember = ReturnType<typeof member>;
type StoryReference = ReturnType<typeof reference>;
type Json = null | string | number | boolean | StoryMember | StoryReference | readonly Json[] | { readonly [key: string]: Json };
type Fields<F extends Record<string, FieldType & { required: boolean }>> = NativeInputFields<F, StoryMember, StoryReference>;
type Kind<D extends DeclaredDefinition> = keyof D["acts"] & string;
type Asked<D extends DeclaredDefinition, K extends Kind<D>> = {
  readonly on?: number;
  readonly fields: Fields<D["acts"][K]["fields"]>;
};
export const accepted = { answer: "accepted" } as const;
export const refused = <const R extends string>(reason: R, name?: string) => ({ answer: "refused", reason, ...(name === undefined ? {} : { name }) }) as const;
type Expect = typeof accepted | ReturnType<typeof refused>;
// The authoring package also runs outside Node. This is the native clone, not a fixture clone.
declare function structuredClone<T>(value: T): T;
const ownData = <T>(value: T): T => { canonicalize(value); return structuredClone(value); };
/** Every entry owns its full ordered effects and sends, including empty lists. */
export interface EntryAssertion {
  readonly input: { readonly type: Entry["input"]["type"]; readonly kind?: string; readonly item?: number; readonly rule?: string; readonly due?: string };
  readonly effects: readonly unknown[];
  readonly sends: readonly unknown[];
}
export interface OutcomeAssertion { readonly entries: readonly EntryAssertion[] }
export const writesNothing: OutcomeAssertion = { entries: [] };
export interface Saved { readonly name: string }
export interface ProjectionAssertion {
  readonly sources?: readonly string[];
  readonly fields?: Readonly<Record<string, readonly string[]>>;
  /** Keep the author's placement of at beside sources in the scenario file. */
  readonly at?: "head";
}
export interface StorySpec<D extends DeclaredDefinition> {
  readonly name: string;
  readonly time: string;
  readonly definition: D;
  readonly projections: Readonly<Record<string, Projection>>;
  readonly actors: Readonly<Record<string, { readonly seed: string; readonly actions: readonly string[]; readonly principal?: string }>>;
  readonly founding: { readonly actor: string; readonly fields: Fields<D["acts"][D["genesis"]]["fields"]> };
  readonly foundingAsserts: OutcomeAssertion;
}
export interface Teller<D extends DeclaredDefinition> {
  act<const K extends Kind<D>>(actor: string, kind: K, asked: Asked<D, K>, expect: Expect, asserts: OutcomeAssertion, save?: string): Saved;
  retry(saved: Saved, expect: Expect, asserts: OutcomeAssertion): void;
  advance(time: string, asserts: OutcomeAssertion): void;
  assert(item: number, is: { state?: string; revision?: number; parties?: Readonly<Record<string, StoryMember | readonly StoryMember[] | null>>; values?: Readonly<Record<string, FieldValue>>; refs?: Readonly<Record<string, Json>> }): void;
  projection(name: string, spec?: ProjectionAssertion): void;
}
interface Actor { readonly secret: Uint8Array; readonly key: KeyId; readonly member: MemberRef; readonly actions: readonly string[]; readonly principal: string | null }

function scopeReference(kind: ScopeKind): ScopeRef {
  const seed: Seed = { v: 1, kind, definition: `sha256:${"0".repeat(64)}`, creator: null, cause: `sha256:${"1".repeat(64)}`, ordinal: 0 };
  return { scope: scopeIdOf(seed), inc: newIncarnation(new Uint8Array(16).fill(2)), kind };
}
const assertSame = (label: string, actual: unknown, expected: unknown): void => {
  if (canonicalize(actual) !== canonicalize(expected)) throw new Error(`${label}: the story's assertion does not match the judged result`);
};
function inputSummary(entry: Entry): EntryAssertion["input"] {
  const input = entry.input;
  if (input.type === "act") return { type: input.type, kind: input.signed.intent.kind };
  if (input.type === "genesis") return { type: input.type, kind: input.kind };
  if (input.type === "timed") return { type: input.type, item: input.item, rule: input.rule, due: input.due };
  return { type: input.type };
}

/** The only state transitions here are judge drafts sealed by entryOf and applied by applyEntry. */
export async function tell<const D extends DeclaredDefinition>(spec: StorySpec<D>, body: (story: Teller<D>) => void | Promise<void>) {
  // Own all author data before the first await; the callback alone stays executable.
  const held = ownData(spec);
  if (!/^[a-z][a-z0-9-]{0,31}$/.test(held.name)) throw new Error("a story needs a short scenario name");
  if (Object.keys(held.founding).some(key => key !== "actor" && key !== "fields")) throw new Error("a story founding accepts only actor and fields");
  const checked = validateDefinition(held.definition, PROPOSED_BOUNDS, RULE_PROFILES);
  if (!checked.ok) throw new Error(`the story definition was refused: ${JSON.stringify(checked.problems)}`);
  const definition: ValidDefinition = checked.definition;
  const state = new MemoryState(), entries: { entry: Entry; hash: Digest }[] = [];
  const actors = new Map<string, Actor>(), secrets: Uint8Array[] = [], usedKeys = new Set<KeyId>();
  const reading = timeMs(held.time);
  if (reading === null) throw new Error("a story needs an explicit timestamp");
  let now: Timestamp = timeOf(reading), ordinal = 0;
  const actor = (name: string): Actor => {
    const who = actors.get(name);
    if (!who) throw new Error(`the story names no actor ${name}`);
    return who;
  };
  const resolve = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(resolve);
    if (typeof value !== "object" || value === null) return value;
    const object = value as Record<string, unknown>;
    if (Object.keys(object).length === 1 && typeof object["$member"] === "string") return actor(object["$member"]).member;
    if (Object.keys(object).length === 1 && typeof object["$reference"] === "string") {
      const kind = object["$reference"];
      if (kind !== "membership" && kind !== "destination") throw new Error("scenario v1 supports membership and destination stand-ins only");
      return scopeReference(kind);
    }
    return Object.fromEntries(Object.entries(object).map(([key, child]) => [key, resolve(child)]));
  };
  const own = (seq: number) => entries[seq] ?? null;
  const seal = (draft: Draft): Entry => {
    const entry = entryOf(state, draft, clockOf(state, now)), hash = entryHash(entry);
    applyEntry(state, definition, entry, hash, { bounds: PROPOSED_BOUNDS, own });
    entries.push({ entry, hash });
    return entry;
  };
  const outcome = (from: number, expected: OutcomeAssertion, label: string) => {
    const actual = entries.slice(from).map(({ entry }) => ({ input: inputSummary(entry), effects: entry.effects, sends: entry.sends }));
    assertSame(label, actual, resolve(expected.entries));
  };
  const grants = () => [...actors.values()].map(who => ({ current: true, grant: {
    issued: { at: scopeReference("membership"), seq: 3, hash: `sha256:${"3".repeat(64)}` }, subject: who.member, key: who.key,
    principal: who.principal === null ? null : actor(who.principal).member, actions: who.actions, within: state.scope()!.at,
    notAfter: null, fresh: null as unknown as ObservationUse,
  } satisfies Grant }));
  const context = (): JudgeContext => ({ clock: clockOf(state, now), grants: grants(), facts: [], prepared: [], bounds: PROPOSED_BOUNDS, own });
  const drainDue = () => {
    let firings = 0;
    for (let due = nextDue(state, definition, now); due; due = nextDue(state, definition, now)) {
      if (++firings > 256) throw new Error("a story step exceeds 256 timed entries");
      const judgment = judgeTimed(state, definition, due, context());
      if (judgment.result !== "write") throw new Error(`a due story firing was not written: ${judgment.result}`);
      seal(judgment.draft);
    }
  };
  const signed = (who: Actor, kind: string, on: number | null, expected: Record<string, number>, fields: Record<string, FieldValue>, to: ScopeRef | null = state.scope()!.at) => signIntent({
    v: 1, to, actor: who.key, kind, on, expected, fields, idempotencyKey: `story-${ordinal++}`, notAfter: timeOf(timeMs(now)! + 60_000),
  } satisfies Intent, who.secret);
  const submit = async (intent: SignedIntent): Promise<ActJudgment> => {
    const prepared = await evaluateRules(prepareRules(state, definition, { act: intent, context: context() }));
    const judgment = judgeAct(state, definition, intent, { ...context(), prepared });
    if (judgment.result === "write") { seal(judgment.draft); drainDue(); }
    return judgment;
  };
  const answer = (judgment: ActJudgment): Expect => {
    if (judgment.result === "write" || judgment.result === "accepted-before") return accepted;
    if (judgment.result === "refused") return refused(judgment.reason, judgment.name);
    throw new Error(`the story's act was not judged: ${judgment.result}`);
  };
  const steps: unknown[] = [], saved = new Map<string, SignedIntent>(), queue: (() => Promise<void>)[] = [];
  let accepting = true, checkedBehavior = false;
  const enqueue = (step: () => Promise<void>) => {
    if (!accepting) throw new Error("the story's authoring callback has closed");
    queue.push(step);
  };
  try {
    if (!Object.keys(held.actors).length || Object.keys(held.actors).length > 16) throw new Error("a story needs 1–16 TEST actors");
    for (const [name, given] of Object.entries(held.actors)) {
      if (!/^[a-z][a-z0-9-]{0,31}$/.test(name) || !/^[0-9a-f]{64}$/.test(given.seed)) throw new Error("each actor needs a short name and explicit public TEST seed");
      if (given.actions.length > 64 || new Set(given.actions).size !== given.actions.length || given.actions.some(action => !/^[A-Za-z][A-Za-z0-9_.-]{0,127}$/.test(action))) throw new Error("TEST actor actions must fit scenario v1");
      const secret = Uint8Array.from(given.seed.match(/../g)!, byte => Number.parseInt(byte, 16)), key = keyIdOfSecret(secret);
      secrets.push(secret);
      if (usedKeys.has(key)) throw new Error("TEST actor keys must be distinct");
      usedKeys.add(key);
      actors.set(name, { secret, key, member: { membership: scopeReference("membership"), member: `@${name}` as MemberId }, actions: given.actions, principal: given.principal ?? null });
    }
    for (const who of actors.values()) if (who.principal !== null) actor(who.principal);
    const founding = signed(actor(held.founding.actor), "found", null, {}, resolve(held.founding.fields) as Record<string, FieldValue>, null);
    const seed: Seed = { v: 1, kind: "directory", definition: definition.digest, creator: null, cause: intentDigest(founding.intent), ordinal: 0 };
    const creation = { name: scopeIdOf(seed), nonce: newGenesisNonce(new Uint8Array(16).fill(1)), seed, creation: founding };
    const genesisContext = { clock: clockOf(state, now), bounds: PROPOSED_BOUNDS, facts: [], prepared: [], source: null };
    const prepared = await evaluateRules(prepareRules(state, definition, { genesis: creation, context: genesisContext }));
    const genesis = judgeGenesis(state, definition, creation, { ...genesisContext, prepared });
    if (genesis.result !== "write") throw new Error(`the story's founding was not written: ${genesis.result}`);
    if (genesis.draft.input.type !== "genesis" || genesis.draft.input.decision !== "applied") throw new Error("the story's founding was refused");
    seal(genesis.draft);
    drainDue();
    outcome(0, held.foundingAsserts, "founding outcomes");
    const teller: Teller<D> = {
      act(name, kind, asked, expect, asserts, save) {
        const request = ownData({ name, kind, asked, expect, asserts, ...(save === undefined ? {} : { save }) }) as { name: string; kind: string; asked: { on?: number; fields: Record<string, Json> }; expect: Expect; asserts: OutcomeAssertion; save?: string };
        if (request.save !== undefined && !/^[a-z][a-z0-9-]{0,31}$/.test(request.save)) throw new Error("a saved story act needs a short scenario name");
        enqueue(async () => {
          const act = Object.hasOwn(definition.declared.acts, request.kind) ? definition.declared.acts[request.kind] : undefined;
          if (!act) throw new Error(`the story names no act ${request.kind}`);
          const fields = resolve(request.asked.fields) as Record<string, FieldValue>, ids: Record<string, number> = {};
          const on = request.asked.on;
          if (on !== undefined) ids["on"] = on;
          const read = readFields(act.fields, fields, PROPOSED_BOUNDS);
          const bound = alsoItems(state, definition, act.also, read.ok ? read.fields : fields, on === undefined ? null : state.item(on));
          if (!bound.ok) throw new Error(`the story cannot resolve its also subjects: ${bound.detail}`);
          for (const [alias, item] of bound.items) if (!bound.marked.has(alias)) ids[alias] = item.id;
          const revisions = Object.fromEntries(Object.entries(ids).map(([alias, id]) => {
            const item = state.item(id);
            if (!item) throw new Error(`the story expects absent item ${id}`);
            return [alias, item.revision];
          }));
          const intent = signed(actor(request.name), request.kind, on ?? null, revisions, fields), before = entries.length;
          const judged = answer(await submit(intent));
          // An unnamed refusal expectation does not silently accept a different named refusal.
          assertSame(`${request.name} ${request.kind}`, judged, request.expect);
          outcome(before, request.asserts, `${request.name} ${request.kind} outcomes`);
          if (request.save !== undefined) {
            if (saved.has(request.save)) throw new Error("a saved story act needs a unique name");
            saved.set(request.save, intent);
          }
          steps.push({ act: { actor: request.name, kind: request.kind, ...(on === undefined ? {} : { on }), expected: Object.fromEntries(Object.entries(ids).map(([alias, id]) => [alias, { $revision: id }])), fields: request.asked.fields }, expect: request.expect, ...(request.save === undefined ? {} : { save: request.save }) });
          checkedBehavior = true;
        });
        return { name: save ?? "" };
      },
      retry(which, expect, asserts) {
        const request = ownData({ which, expect, asserts });
        enqueue(async () => {
          const intent = saved.get(request.which.name);
          if (!intent) throw new Error(`no saved story act ${request.which.name}`);
          const before = entries.length;
          assertSame(`retry ${request.which.name}`, answer(await submit(intent)), request.expect);
          outcome(before, request.asserts, `retry ${request.which.name} outcomes`);
          steps.push({ retry: request.which.name, expect: request.expect });
          checkedBehavior = true;
        });
      },
      advance(time, asserts) {
        const request = ownData({ time, asserts });
        enqueue(async () => {
          const next = timeMs(request.time);
          if (next === null || next < timeMs(now)!) throw new Error("the story clock must advance monotonically");
          now = timeOf(next);
          const before = entries.length;
          drainDue();
          outcome(before, request.asserts, "timed outcomes");
          steps.push({ advance: request.time });
        });
      },
      assert(id, is) {
        const wanted = ownData(is);
        if (Object.keys(wanted).some(key => !["state", "revision", "parties", "values", "refs"].includes(key))) throw new Error("a story item assertion accepts only state, revision and slot maps");
        enqueue(async () => {
          const item = state.item(id);
          if (!item) throw new Error(`asserted story item ${id} is absent`);
          const hasState = ["state", "revision"].some(key => Object.hasOwn(wanted, key));
          const hasSlot = (["parties", "values", "refs"] as const).some(key => Object.keys(wanted[key] ?? {}).length > 0);
          if (!hasState && !hasSlot) throw new Error("a story assertion must test a state, revision or slot");
          for (const key of ["state", "revision"] as const) if (Object.hasOwn(wanted, key)) assertSame(`item ${id} ${key}`, item[key], wanted[key]);
          for (const key of ["parties", "values", "refs"] as const) for (const [slot, value] of Object.entries(wanted[key] ?? {})) assertSame(`item ${id} ${key}.${slot}`, item[key][slot], resolve(value));
          steps.push({ assert: { item: id, ...wanted } });
          checkedBehavior = true;
        });
      },
      projection(name, spec = {}) {
        const request = ownData({ name, spec });
        const order = Object.keys(request.spec);
        const headFirst = order.includes("at") && (!order.includes("sources") || order.indexOf("at") < order.indexOf("sources"));
        enqueue(async () => {
          const projected = Object.hasOwn(held.projections, request.name) ? held.projections[request.name] : undefined;
          if (!projected) throw new Error(`the story names no projection ${request.name}`);
          const selected = request.spec.sources ?? Object.keys(projected.sources).filter(key => projected.sources[key]!.read !== "entries");
          if (!selected.length || new Set(selected).size !== selected.length) throw new Error("a story projection needs distinct complete sources");
          const sources = Object.fromEntries(selected.map(sourceName => {
            const source = Object.hasOwn(projected.sources, sourceName) ? projected.sources[sourceName] : undefined;
            if (!source) throw new Error(`the story projection names no source ${sourceName}`);
            if (source.read === "entries") {
              const rows = entries.slice(-(source.window ?? 100)).filter(({ entry }) => entry.input.type === "act" && source.acts!.includes(entry.input.signed.intent.kind));
              if (rows.length > source.limit) throw new Error("the story projection exceeds its complete row limit");
              return [sourceName, rows.map(({ entry }) => {
                if (entry.input.type !== "act") throw new Error("the story journal projection selected a non-act entry");
                const input = entry.input, fields = request.spec.fields?.[sourceName];
                return { id: entry.seq, type: input.signed.intent.kind, state: "sealed", ...(fields === undefined ? {} : { fields: Object.fromEntries(fields.map(alias => {
                  const field = Object.hasOwn(source.fields, alias) ? source.fields[alias] : undefined;
                  if (!field || field.from.kind !== "field" && field.from.kind !== "signer") throw new Error(`the story projection names no journal field ${alias}`);
                  if (field.from.kind === "signer") {
                    const matches = input.authority.filter(grant => grant.key === input.signed.intent.actor);
                    if (matches.length > 1) throw new Error("the story journal entry has ambiguous signer authority");
                    return [alias, matches[0]?.subject ?? null];
                  }
                  const act = held.definition.acts[input.signed.intent.kind];
                  const declared = act && Object.hasOwn(act.fields, field.from.name) ? act.fields[field.from.name] : undefined;
                  if (!declared) throw new Error(`the story journal act names no field ${field.from.name}`);
                  return [alias, input.signed.intent.fields[field.from.name] ?? declared.default ?? null];
                })) }) };
              })];
            }
            if (!source.item || !source.states) throw new Error("the story projection has no item declaration");
            const page = state.page(source.item, source.states, null, source.limit);
            if (page.more) throw new Error("the story projection is incomplete");
            const fields = request.spec.fields?.[sourceName];
            return [sourceName, page.items.map(item => ({ id: item.id, state: item.state, ...(fields === undefined ? {} : { fields: Object.fromEntries(fields.map(alias => {
              const field = Object.hasOwn(source.fields, alias) ? source.fields[alias] : undefined;
              if (!field || field.from.kind === "field" || field.from.kind === "signer") throw new Error(`the story projection names no item field ${alias}`);
              const group = field.from.kind === "party" ? item.parties : field.from.kind === "value" ? item.values : item.refs;
              return [alias, group[field.from.name] ?? null];
            })) }) }))];
          }));
          const at = { seq: entries.length - 1 };
          steps.push({ projection: headFirst ? { name: request.name, at, sources } : { name: request.name, sources, at } });
          checkedBehavior = true;
        });
      },
    };
    await body(teller);
    accepting = false;
    if (!queue.length || queue.length > 256) throw new Error("a story needs 1–256 steps");
    for (const step of queue) await step();
    if (!checkedBehavior) throw new Error("a story needs an expected act or retry answer, a nonempty item assertion or a projection assertion");
    return {
      v: 1, name: held.name, time: held.time,
      actors: Object.fromEntries(Object.entries(held.actors).map(([name, who]) => [name, { seed: who.seed, member: `@${name}`, actions: who.actions, ...(who.principal === undefined ? {} : { principal: who.principal }) }])),
      founding: held.founding, steps,
    } as const;
  } finally { accepting = false; for (const secret of secrets) secret.fill(0); }
}
