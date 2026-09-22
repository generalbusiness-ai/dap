import { readFileSync, writeFileSync } from 'node:fs';
import { contentId, type Json } from '../src/canon.ts';
import type { Act, Declaration, Expr } from './schema.ts';

export const LAYER_VERSION = 't1-draft-1';
export type Site = 'guard' | 'effect' | 'derived column' | 'query' | 'affordance' | 'audience' | 'invariant';
export interface Diagnostic { code: string; act: string; site: Site; expression: string; dependency: string; reader: string; reason: string; witness?: string; }
export interface Dependency { table: string; complete: boolean; expression: string; readers: string; mode: string; }
const operations = new Set(['literal', 'path', 'get', 'object', 'array', 'if', 'private', 'read', 'and', 'or', 'not', 'coalesce', 'eq', 'ne', 'lt', 'lte', 'gt', 'gte', 'string', 'id', 'integer', 'record', 'has', 'concat', 'add', 'fresh']);
const witnessFor = (table: string, code: string) => code === 'containment' && table === 'offers' ? 'corpus/sale/run1/seed-158.json' : code === 'audience from payload' ? 'corpus/sale/run6/seed-172.json' : code === 'self-asserted reference' ? 'lang/test/witnesses.test.ts#V3-F2' : table === 'applications' ? 'test/club-a5.test.ts' : undefined;
function isObject(x: unknown): x is Record<string, unknown> { return x !== null && typeof x === 'object' && !Array.isArray(x); }
/** No host functions are accepted, and every operator subtree is inspected. */
export function dependencies(expression: Expr, readers = 'members', path = '$'): Dependency[] {
  if (!isObject(expression) || expression.op === 'literal') return [];
  const nextReaders = expression.op === 'private' ? String(expression.readers) : readers;
  const own: Dependency[] = (expression.op === 'read' || expression.op === 'fresh') ? [{ table: String(expression.table), readers: nextReaders, mode: String(expression.mode ?? 'fresh'),
    complete: !Object.hasOwn(expression, 'key') || ['absent', 'count', 'max'].includes(String(expression.mode)), expression: path }] : [];
  for (const [key, value] of Object.entries(expression)) {
    if (key === 'op') continue;
    if (Array.isArray(value)) value.forEach((v, i) => own.push(...dependencies(v as Expr, nextReaders, path + '.' + key + '[' + i + ']')));
    else if (isObject(value)) {
      if (typeof value.op === 'string') own.push(...dependencies(value as Expr, nextReaders, path + '.' + key));
      else for (const [k, v] of Object.entries(value)) own.push(...dependencies(v as Expr, nextReaders, path + '.' + key + '.' + k));
    }
  }
  return own;
}
function expressions(expr: Expr): Record<string, unknown>[] {
  if (!isObject(expr) || expr.op === 'literal') return [];
  const out: Record<string, unknown>[] = typeof expr.op === 'string' ? [expr] : [];
  for (const v of Object.values(expr)) {
    if (Array.isArray(v)) out.push(...v.flatMap((x) => expressions(x as Expr)));
    else if (isObject(v)) out.push(...expressions(v as Expr));
  }
  return out;
}
/** Payload keys choose an authoritative row; they are not its recipient value. */
function recipientInputs(expression: Expr): string[] {
  if (!isObject(expression)) return [];
  if (expression.op === 'literal') return [];
  if (expression.op === 'path') return String(expression.value).startsWith('payload.') ? [String(expression.value)] : [];
  if (expression.op === 'read') return expression.select ? recipientInputs(expression.select as Expr) : [];
  if (expression.op === 'if') return [...recipientInputs(expression.yes as Expr), ...recipientInputs(expression.no as Expr)];
  return Object.values(expression).flatMap((x) => Array.isArray(x) ? x.flatMap((v) => recipientInputs(v as Expr)) : isObject(x) ? recipientInputs(x as Expr) : []);
}
export function checkDeclaration(d: Declaration): Diagnostic[] {
  const out: Diagnostic[] = [];
  const error = (code: string, act: string, site: Site, expression: string, dependency: string, readers: string, reason: string) => out.push({ code, act, site, expression, dependency, reader: readers === 'members' ? 'newcomer (Dana)' : readers, reason, ...(witnessFor(dependency, code) ? { witness: witnessFor(dependency, code) } : {}) });
  const inspect = (expr: Expr, readers: string, act: string, site: Site) => {
    for (const node of expressions(expr)) {
      if (!operations.has(String(node.op))) error('unsupported expression', act, site, String(node.op), '', readers, 'operator is not in the closed expression language');
      if (node.op === 'private' && site !== 'query' && site !== 'derived column' && site !== 'affordance') error('invalid reader scope', act, site, 'private', '', readers, 'a projection mask cannot authorize a guard or effect');
    }
    for (const dep of dependencies(expr, readers)) {
      const t = d.tables[dep.table];
      if (!t) { error('unknown relation', act, site, dep.expression, dep.table, dep.readers, 'relation not declared'); continue; }
      if (t.readers === 'spine') continue;
      if (t.readers === 'members') {
        if (dep.readers === 'spine') error('containment', act, site, dep.expression, dep.table, dep.readers, 'spine readers need facts that recorded members alone read');
        else if (site !== 'query' && site !== 'derived column' && (t.max !== 'members' || !d.backlogBy)) error('containment', act, site, dep.expression, dep.table, dep.readers, 'newcomer can see no_such_offer while the oracle accepts; relation history cannot be disclosed');
        continue;
      }
      const projection = site === 'query' || site === 'derived column';
      if (dep.readers !== t.readers) error('unjudgeable reference', act, site, dep.expression, dep.table, dep.readers, 'readers cannot judge the referenced row or its kind');
      else if (dep.complete && !((projection || site === 'affordance') && dep.mode === 'rows')) error('incomplete relation', act, site, dep.expression, dep.table, dep.readers, 'absence and aggregates require every row of the relation, not just a visible subset');
    }
  };
  for (const [name, table] of Object.entries(d.tables)) {
    for (const [column, c] of Object.entries(table.columns)) { if (c.derive) inspect(c.derive, c.readers ?? table.readers, name + '.' + column, 'derived column'); if ((c.readers ?? table.readers) !== table.readers) error('unsplit column', name, 'derived column', column, name, c.readers!, 'mixed-reader columns must be split into linked partitions before emission'); }
  }
  for (const act of d.acts) {
    for (const g of act.guards) {
      if ('test' in g) inspect(g.test, act.readers, act.kind, 'guard');
      else {
        inspect({ op: 'read', table: g.table, mode: 'first', key: g.key }, act.readers, act.kind, 'guard');
        inspect(g.key, act.readers, act.kind, 'guard');
        if (g.optional) inspect(g.optional, act.readers, act.kind, 'guard');
        if (g.equals) inspect(g.equals.value, act.readers, act.kind, 'guard');
        if (g.trustPayload) error('self-asserted reference', act.kind, 'guard', 'reference', g.table, act.readers, 'a payload claim is not the author of an effective referenced row');
      }
    }
    for (const write of act.writes) {
      const table = d.tables[write.table];
      if (!table || table.readers !== act.readers) error('effect readers', act.kind, 'effect', write.table, write.table, act.readers, 'an event cannot write a row with a different recording audience');
      for (const [column, expression] of Object.entries(write.values)) inspect(expression, table?.columns[column]?.readers ?? act.readers, act.kind, 'effect');
    }
    if (act.candidates) inspect(act.candidates, act.readers, act.kind, 'affordance');
    if (act.readers !== 'members' && act.readers !== 'spine') {
      const policy = d.readers[act.readers];
      if (!policy) { error('unknown audience', act.kind, 'audience', act.readers, '', act.readers, 'named readers have no derivation'); continue; }
      for (const expression of policy.recipients) {
        inspect(expression, act.readers, act.kind, 'audience');
        for (const input of recipientInputs(expression)) {
          const source = input.slice(8);
          if (act.schema[source] !== 'recipient') error('audience from payload', act.kind, 'audience', input, source, act.readers, 'referenced readers must come from preceding effective state, including on refused attempts');
        }
      }
    }
  }
  inspect(d.query, 'members', d.model, 'query');
  for (const inv of d.invariants) inspect(inv.test, 'spine', d.model, 'invariant');
  return out;
}
/** Derive the transitive producer closure of relations used in act decisions. */
export function derivations(d: Declaration) {
  const required = new Set<string>();
  for (const a of d.acts) for (const g of a.guards) {
    const expr = 'test' in g ? g.test : { op: 'read', table: g.table, mode: 'first', key: g.key };
    for (const dep of dependencies(expr, a.readers)) required.add(dep.table);
  }
  let changed = true;
  while (changed) {
    changed = false;
    for (const a of d.acts) if (a.writes.some((w) => required.has(w.table))) for (const w of a.writes) for (const e of Object.values(w.values)) for (const dep of dependencies(e, a.readers)) if (!required.has(dep.table)) { required.add(dep.table); changed = true; }
  }
  return {
    backlogKinds: d.acts.filter((a) => a.readers === 'members' && a.max === 'members' && a.writes.some((w) => required.has(w.table))).map((a) => a.kind),
    disclosureKinds: [...new Set([...d.acts.filter((a) => a.max === 'members' || a.max === 'spine').map((a) => a.kind), ...d.supportDisclosure])],
  };
}
export function emit(d: Declaration, target: string): { sourceId: string; lines: number } {
  const diagnostics = checkDeclaration(d);
  if (diagnostics.length) throw new Error(JSON.stringify(diagnostics, null, 2));
  const sourceId = contentId(d as unknown as Json);
  const derived = derivations(d);
  // Inline all executable helpers; imports are limited to the pinned foundation.
  const types = readFileSync(new URL('./schema.ts', import.meta.url), 'utf8').split('export const lit')[0]!.replace(/^import .*\n/gm, '');
  const runtime = readFileSync(new URL('./runtime.ts', import.meta.url), 'utf8').replace(/^import type .*'\.\/schema.ts';\n/gm, '').replaceAll("from '../src/", "from '../../src/");
  const output = `// Generated by ${LAYER_VERSION}. Source ${sourceId}. Do not edit.\n${runtime}\n${types}\nconst declaration: Declaration = ${JSON.stringify(d, null, 2)};\nexport const ${d.model}Package = makePackage(declaration, ${JSON.stringify(sourceId)}, ${JSON.stringify(LAYER_VERSION)}, import.meta.url, ${JSON.stringify(derived.backlogKinds)}, ${JSON.stringify(derived.disclosureKinds)});\nexport const ${d.model}Model = ${d.model}Package.models[${JSON.stringify(d.model)}]!;\nexport const ${d.model.toUpperCase()} = ${JSON.stringify(d.name + '.')};\nexport const derivedBudget = budgetFor(declaration);\nexport const derivedInvariants = invariantsFor(declaration);\n`;
  writeFileSync(target, output);
  return { sourceId, lines: output.split('\n').length - 1 };
}
