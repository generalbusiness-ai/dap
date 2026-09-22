import { descriptorId, type ModelSpec, type PackageDescriptor } from '../src/descriptor.ts';
import { MEMBERS, SPINE, named } from '../src/types.ts';
import type { EventBody } from '../src/types.ts';
import type { Json } from '../src/canon.ts';
import type { Declaration, Expr, Act } from './schema.ts';

type Row = Record<string, unknown> & { position: number; _readers: string[] | null };
type State = Record<string, Row[]>;
type EvalEnv = {
  declaration: Declaration; state: State; payload: unknown; actor: string;
  position: number; id: string; principal: string; origin: boolean;
  visible: (position: number) => boolean; recipients?: string[];
  vars: Record<string, unknown>;
};
function record(x: unknown): x is Record<string, unknown> { return x !== null && typeof x === 'object' && !Array.isArray(x); }
function field(x: unknown, key: string): unknown { return record(x) && Object.hasOwn(x, key) ? x[key] : undefined; }
function jsonValue(x: unknown): Json { return x === undefined ? null : x as Json; }
/** Every operator is closed and total over runtime JSON; there is no eval or callback escape. */
export function evaluate(expression: Expr, env: EvalEnv): unknown {
  if (!record(expression) || typeof expression.op !== 'string') return expression;
  const e = expression as Record<string, any>;
  const ev = (x: Expr) => evaluate(x, env);
  switch (e.op) {
    case 'literal': return e.value;
    case 'path': {
      const [root, ...parts] = (e.value as string).split('.');
      let value: unknown = Object.hasOwn(env.vars, root!) ? env.vars[root!] : field(env, root!);
      for (const part of parts) value = field(value, part);
      return value;
    }
    case 'get': return field(ev(e.value), e.field);
    case 'object': return Object.fromEntries(Object.entries(e.fields as Record<string, Expr>).map(([k, v]) => [k, jsonValue(ev(v))]));
    case 'array': return (e.values as Expr[]).map(ev);
    case 'if': return ev(e.test) ? ev(e.yes) : ev(e.no);
    case 'private': return ev(e.value);
    case 'fresh': { const ids = new Set((env.state[e.table] ?? []).map((r) => r[env.declaration.tables[e.table]!.key])); let i = 0; while (ids.has('__fresh_' + i)) i++; return '__fresh_' + i; }
    case 'read': {
      const table = env.declaration.tables[e.table]!;
      let rows = (env.state[e.table] ?? []).filter((r) => env.visible(r.position));
      if (Object.hasOwn(e, 'key')) {
        const key = ev(e.key);
        rows = rows.filter((r) => r[table.key] === key);
        // A private reference is useful to an act only if every current
        // recipient could judge it. A changed addressee cannot validate it.
        if (env.recipients) rows = rows.filter((r) => r._readers === null || env.recipients!.every((p) => r._readers!.includes(p)));
      }
      const rowEnv = (r: Row) => ({ ...env, vars: { ...env.vars, [e.as ?? 'row']: r } });
      if (e.where) rows = rows.filter((r) => evaluate(e.where, rowEnv(r)));
      rows = [...rows].sort((a, b) => a.position - b.position);
      const project = (r: Row) => e.select ? evaluate(e.select, rowEnv(r)) : r;
      if (e.mode === 'first') return rows.length ? project(rows[0]!) : null;
      if (e.mode === 'latest') return rows.length ? project(rows[rows.length - 1]!) : null;
      if (e.mode === 'exists') return rows.length > 0;
      if (e.mode === 'absent') return rows.length === 0;
      if (e.mode === 'count') return rows.length;
      if (e.mode === 'max') { const values = rows.map(project).filter((x): x is number => typeof x === 'number'); return values.length ? Math.max(...values) : null; }
      return rows.map(project);
    }
    case 'and': return (e.args as Expr[]).every((x) => Boolean(ev(x)));
    case 'or': return (e.args as Expr[]).some((x) => Boolean(ev(x)));
    case 'not': return !ev(e.args[0]);
    case 'coalesce': { const x = ev(e.args[0]); return x === undefined || x === null ? ev(e.args[1]) : x; }
    default: {
      const xs = (e.args as Expr[]).map(ev);
      const [a, b] = xs as any[];
      switch (e.op) {
        case 'add': return a + b;
        case 'eq': return a === b;
        case 'ne': return a !== b;
        case 'lt': return a < b;
        case 'lte': return a <= b;
        case 'gt': return a > b;
        case 'gte': return a >= b;
        case 'string': return typeof a === 'string';
        case 'id': return typeof a === 'string' && a.length > 0;
        case 'integer': return Number.isInteger(a);
        case 'record': return record(a);
        case 'has': return record(a) && typeof b === 'string' && Object.hasOwn(a, b);
        case 'concat': return xs.flatMap((x) => Array.isArray(x) ? x : []);
        default: throw new Error('unknown expression operator ' + e.op);
      }
    }
  }
}
function recipientList(readers: string, env: EvalEnv): string[] | null {
  if (readers === 'members' || readers === 'spine') return null;
  return [...new Set(env.declaration.readers[readers]!.recipients.map((e) => evaluate(e, env)).flatMap((x) => Array.isArray(x) ? x : [x]).filter((x): x is string => typeof x === 'string'))].sort();
}
function environment(d: Declaration, state: State, event: EventBody, ctx: { position: number; id?: string; origin?: boolean }, visible = (_n: number) => true): EvalEnv {
  return { declaration: d, state, payload: event.payload, actor: event.actor, position: ctx.position, id: ctx.id ?? '', principal: event.actor, origin: ctx.origin === true, visible, vars: {} };
}
export function refusal(act: Act, env: EvalEnv): string | undefined {
  for (const g of act.guards) {
    if ('test' in g) { if (!evaluate(g.test, env)) return g.reason; continue; }
    if (g.optional && !evaluate(g.optional, env)) continue;
    const row = evaluate({ op: 'read', table: g.table, mode: 'first', key: g.key }, env);
    if (!row) return g.reason;
    if (g.equals && field(row, g.equals.field) !== evaluate(g.equals.value, env)) return g.equals.reason;
  }
  return undefined;
}
/** Runtime factory is copied into each emitted module, so its code is identity-bound. */
export function makePackage(declaration: Declaration, sourceId: string, layerVersion: string, module: string, backlogKinds: string[], disclosureKinds: string[]): PackageDescriptor {
  const model: ModelSpec<State, any> = {
    id: declaration.model,
    config: { sourceId, layerVersion, declaration: declaration as unknown as Json,
      joinDisclosure: { by: declaration.backlogBy, kinds: backlogKinds, effectiveOnly: true },
      disclosurePolicy: { kinds: disclosureKinds, authorizedOnly: true },
      effects: declaration.acts.filter((a) => a.grant).map((a) => ({ kind: a.kind, grant: a.grant })) },
    roles: declaration.roles,
    ...(declaration.acts.some((a) => a.ambient) ? { ambient: true } : {}),
    init: () => Object.fromEntries(Object.keys(declaration.tables).map((t) => [t, []])),
    fold(state, event, ctx) {
      const act = declaration.acts.find((a) => a.kind === event.kind);
      if (!act) return { effective: false, state, reason: 'unhandled' };
      const env = environment(declaration, state, event, ctx);
      const readers = recipientList(act.readers, env);
      if (readers) env.recipients = readers;
      const reason = refusal(act, env);
      if (reason) return { effective: false, state, reason };
      const next = { ...state };
      for (const write of act.writes) {
        const values = Object.fromEntries(Object.entries(write.values).map(([k, v]) => [k, jsonValue(evaluate(v, env))]));
        const version: Row = { ...values, position: ctx.position, _readers: readers };
        for (const [column, c] of Object.entries(declaration.tables[write.table]!.columns)) if (c.derive) version[column] = jsonValue(evaluate(c.derive, { ...env, vars: { ...env.vars, row: version } }));
        // Never overwrite: disclosures insert the original version, and
        // all point reads sort by the producing position, not arrival order.
        next[write.table] = [...(next[write.table] ?? []), version];
      }
      return { effective: true, state: next };
    },
    observe(principal, state, ctx) {
      const env = environment(declaration, state, { actor: principal, payload: {}, kind: '' }, { position: ctx.basis }, ctx.visible);
      return jsonValue(evaluate(declaration.query, env));
    },
    affordances(principal, state, ctx) {
      const result: string[] = [];
      for (const act of declaration.acts) {
        if (act.ambient || !act.candidates || (act.capability && !ctx.holds(act.capability))) continue;
        const base = environment(declaration, state, { actor: principal, payload: {}, kind: act.kind }, { position: ctx.basis + 1 }, ctx.visible);
        const candidates = evaluate(act.candidates, base);
        if (!Array.isArray(candidates)) continue;
        if (candidates.some((payload) => { const env = { ...base, payload }; const readers = recipientList(act.readers, env); if (readers) env.recipients = readers; return !refusal(act, env); })) result.push(act.kind);
      }
      return result.sort();
    },
  };
  const kinds = Object.fromEntries(declaration.acts.filter((a) => !a.ambient).map((act) => [act.kind, {
    kind: act.kind, schema: act.schema, handlers: [declaration.model], audienceId: 'derived:' + act.readers,
    ...(act.capability ? { capability: act.capability } : {}),
    audience(ctx: any, event: EventBody) {
      if (act.readers === 'spine') return SPINE;
      if (act.readers === 'members') return MEMBERS;
      const env = environment(declaration, ctx.modelState(declaration.model) as State ?? {}, event, ctx);
      return named(...recipientList(act.readers, env)!);
    },
  }]));
  const base = { name: declaration.name, module, models: { [declaration.model]: model as ModelSpec }, kinds,
    capabilities: [...new Set(Object.values(declaration.roles).flat())] };
  return { id: descriptorId(base), ...base };
}

/** A separate budget over readable event bodies, alongside the frozen manifest budget. */
export function budgetFor(declaration: Declaration) {
  return (observation: { outcomes: Record<string, { perModel?: Record<string, { effective?: boolean }> }> }, principal: string, _frontier: number, view: readonly { position: number; event?: EventBody }[]): string[] => {
    let state: State = Object.fromEntries(Object.keys(declaration.tables).map((t) => [t, []]));
    const out: string[] = [];
    for (const item of view) {
      if (!item.event) continue;
      const act = declaration.acts.find((a) => a.kind === item.event!.kind);
      if (!act) continue;
      const env = environment(declaration, state, item.event, { position: item.position, origin: item.position === 1 });
      const max = recipientList(act.max, env);
      if (max && !max.includes(principal)) out.push(principal + ' reads ' + act.kind + ' at ' + item.position + ' outside its declared maximum readers');
      if (!observation.outcomes[String(item.position)]?.perModel?.[declaration.model]?.effective) continue;
      const initial = recipientList(act.readers, env);
      for (const w of act.writes) state[w.table] = [...state[w.table]!, { ...Object.fromEntries(Object.entries(w.values).map(([k, e]) => [k, jsonValue(evaluate(e, env))])), position: item.position, _readers: initial }];
    }
    return out;
  };
}
export function invariantsFor(declaration: Declaration) {
  return (state: { models: Record<string, unknown> }, frontier: number): string[] => {
    const env = environment(declaration, state.models[declaration.model] as State ?? {}, { kind: '', actor: '', payload: {} }, { position: frontier });
    return declaration.invariants.filter((i) => !evaluate(i.test, env)).map((i) => i.reason);
  };
}
