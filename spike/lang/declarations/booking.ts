import { arr, choose, get, guard, obj, op, path, privateValue, read, type Act, type Declaration, type Expr, type Table } from '../schema.ts';
const NS = 'com.example.booking.';
const OBSERVE = 'ai.generalbusiness.dap.observe';
const P = (key: string) => path('payload.' + key);
const R = (key: string) => path('row.' + key);
const party = 'booking-parties';
const table = (readers: string, columns: string[]): Table => ({ readers, max: readers, key: 'id', versioned: true, columns: Object.fromEntries(columns.map((c) => [c, { type: 'json', readers, max: readers }])) });
const point = (table: string, id: Expr) => read(table, 'first', { key: id });
const exists = (table: string, id: Expr) => read(table, 'exists', { key: id });
const now = read('ticks', 'max', { select: R('clock') });
const occupancyStatus = (id: Expr, end: Expr) => choose(exists('frees', id), 'freed', choose(op('and', op('ne', now, null), op('gte', now, end)), 'expired', 'active'));
const validInterval = op('and', op('integer', P('start')), op('integer', P('end')), op('lt', P('start'), P('end')));
const payloadRecord = guard(op('record', path('payload')), 'malformed');
const act = (name: string, readers: string, capability: string, schema: Record<string, string>, guards: Act['guards'], writes: Act['writes'], candidates: Expr): Act => ({ kind: NS + name, readers, max: readers, capability: NS + capability, schema, guards: [payloadRecord, ...guards], writes, candidates });
const requestFields = { id: path('id'), booker: path('actor'), admin: P('admin'), room: P('room'), start: P('start'), end: P('end'), purpose: P('purpose') };
const intervalFields = { id: P('booking_id'), room: P('room'), start: P('start'), end: P('end') };
const keyed = { id: P('booking_id') };
export const booking: Declaration = {
  name: 'com.example.booking', model: 'booking',
  roles: { Admin: [NS + 'publish'], Booker: [NS + 'request'] },
  readers: { [party]: { recipients: [path('actor'), P('admin')] } },
  tables: { ticks: table('members', ['clock']), requests: table(party, Object.keys(requestFields)), cancels: table(party, ['id']), occupancies: table('members', Object.keys(intervalFields)), frees: table('members', ['id']) },
  acts: [
    { kind: OBSERVE, readers: 'members', max: 'members', schema: {}, ambient: true,
      guards: [payloadRecord, guard(op('record', P('fact')), 'malformed'), guard(op('has', P('fact'), 'clock'), 'unhandled'), guard(op('and', op('integer', P('fact.clock')), op('gte', P('fact.clock'), 0)), 'malformed')], writes: [{ table: 'ticks', values: { clock: P('fact.clock') } }] },
    act('request', party, 'request', { room: 'string', start: 'integer', end: 'integer', purpose: 'string', admin: 'recipient' }, [guard(op('and', op('eq', P('room'), 'room-1'), validInterval, op('string', P('purpose')), op('string', P('admin')), op('not', exists('requests', path('id')))), 'malformed')], [{ table: 'requests', values: requestFields }], arr(obj({ room: 'room-1', start: 1, end: 2, purpose: '', admin: 'admin' }))),
    act('occupancy', 'members', 'publish', { booking_id: 'string', room: 'string', start: 'integer', end: 'integer' }, [guard(op('and', op('id', P('booking_id')), op('eq', P('room'), 'room-1'), validInterval), 'malformed'), guard(op('not', exists('occupancies', P('booking_id'))), 'duplicate_id'), guard(op('not', read('occupancies', 'exists', { as: 'occ', where: op('and', op('eq', path('occ.room'), P('room')), op('eq', occupancyStatus(path('occ.id'), path('occ.end')), 'active'), op('lt', path('occ.start'), P('end')), op('lt', P('start'), path('occ.end'))) })), 'overlap')], [{ table: 'occupancies', values: intervalFields }], arr(obj({ booking_id: { op: 'fresh', table: 'occupancies' }, room: 'room-1', start: op('coalesce', read('occupancies', 'max', { select: R('end') }), 0), end: op('add', op('coalesce', read('occupancies', 'max', { select: R('end') }), 0), 1) }))),
    act('cancel_request', party, 'request', { booking_id: 'string', admin: 'recipient' }, [guard(op('and', op('id', P('booking_id')), op('string', P('admin'))), 'malformed'), { table: 'requests', key: P('booking_id'), reason: 'not_booker', equals: { field: 'booker', value: path('actor'), reason: 'not_booker' } }, guard(op('not', exists('cancels', P('booking_id'))), 'already_cancelled')], [{ table: 'cancels', values: keyed }], privateValue(party, read('requests', 'rows', { select: obj({ booking_id: R('id'), admin: R('admin') }) }))),
    act('free', 'members', 'publish', { booking_id: 'string' }, [guard(op('id', P('booking_id')), 'malformed'), { table: 'occupancies', key: P('booking_id'), reason: 'no_such_occupancy' }, guard(op('not', exists('frees', P('booking_id'))), 'already_free')], [{ table: 'frees', values: keyed }], read('occupancies', 'rows', { select: obj({ booking_id: R('id') }) })),
  ],
  query: obj({ now,
    occupancies: read('occupancies', 'rows', { as: 'occ', select: obj({ id: path('occ.id'), room: path('occ.room'), start: path('occ.start'), end: path('occ.end'), position: path('occ.position'), status: occupancyStatus(path('occ.id'), path('occ.end')) }) }),
    requests: privateValue(party, read('requests', 'rows', { as: 'req', select: obj({ id: path('req.id'), room: path('req.room'), start: path('req.start'), end: path('req.end'), purpose: path('req.purpose'), booker: path('req.booker'), position: path('req.position'), status: choose(exists('cancels', path('req.id')), 'cancelled', choose(point('occupancies', path('req.id')), 'published', 'pending')) }) })) }),
  invariants: [], supportDisclosure: ['ai.generalbusiness.dap.attach'], backlogBy: 'admin',
};
