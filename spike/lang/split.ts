import { obj, path, type Act, type Column, type Expr, type Table } from './schema.ts';

/** Mixed reader columns become separate linked records and event kinds.
 * Names are declared because kind names are the manifest's public API.
 * The shared key goes to each part; every private part gets an existence
 * reference to the public part. The caller supplies data, never handlers.
 */
export function splitRecord(input: {
  key: string;
  columns: Record<string, Column & { value: Expr }>;
  parts: Record<string, { table: string; kind: string; max: string }>;
  capability: string;
  guards: Act['guards'];
  candidates: Expr;
}): { tables: Record<string, Table>; acts: Act[] } {
  const entries = Object.entries(input.parts);
  const publicPart = input.parts['members'];
  if (!publicPart) throw new Error('split record requires its public linkage');
  const keyColumn = input.columns[input.key];
  if (!keyColumn) throw new Error('split record requires its key column');
  const tables: Record<string, Table> = {};
  const acts: Act[] = [];
  for (const [readers, part] of entries) {
    const columns = Object.fromEntries(Object.entries(input.columns).filter(([name, c]) => name === input.key || c.readers === readers));
    if (Object.keys(columns).length === 1 && readers !== 'members') continue;
    tables[part.table] = { key: input.key, readers, max: part.max, versioned: true,
      columns: Object.fromEntries(Object.entries(columns).map(([name, c]) => [name, { type: c.type, readers, max: part.max, ...(c.derive ? { derive: c.derive } : {}) }])) };
    const schema = Object.fromEntries(Object.entries(columns).filter(([, c]) => (c.value as { op?: string }).op === 'path' && String((c.value as { value?: string }).value).startsWith('payload.')).map(([, c]) => [String((c.value as { value?: string }).value).slice(8), c.type]));
    acts.push({ kind: part.kind, readers, max: part.max, capability: input.capability, schema,
      guards: [...input.guards, ...(readers === 'members' ? [] : [{ table: publicPart.table, key: keyColumn.value, reason: 'no_such_record' }])],
      writes: [{ table: part.table, values: Object.fromEntries(Object.entries(columns).map(([name, c]) => [name, c.value])) }], candidates: input.candidates });
  }
  return { tables, acts };
}
