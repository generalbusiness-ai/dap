import { arr, choose, get, guard, obj, op, path, privateValue, read, type Act, type Declaration, type Expr, type Table } from '../schema.ts';
const NS = 'com.example.sale.';
const P = (key: string) => path('payload.' + key);
const R = (key: string) => path('row.' + key);
const first = (table: string) => read(table, 'first');
const listing = first('listing');
const seller = get(listing, 'seller');
const accepted = first('accepts');
const acceptedId = get(accepted, 'id');
const closed = first('closes');
const exists = (table: string, key?: Expr, where?: Expr) => read(table, 'exists', { ...(key ? { key } : {}), ...(where ? { where } : {}) });
const replacement = (id: Expr) => exists('offers', undefined, op('eq', R('replaces'), id));
const withdrawn = (id: Expr) => exists('withdrawals', id);
const status = (id: Expr) => choose(op('eq', acceptedId, id), 'accepted', choose(withdrawn(id), 'withdrawn', choose(replacement(id), 'replaced', choose(accepted, 'declined', 'open'))));
const table = (readers: string, columns: string[], key = 'id'): Table => ({ readers, max: readers, key, versioned: true, columns: Object.fromEntries(columns.map((c) => [c, { type: 'json', readers, max: readers }])) });
const notOpen = guard(op('and', listing, op('not', closed)), 'not_open');
const payloadRecord = guard(op('record', path('payload')), 'malformed');
const idGuard = guard(op('id', P('offer_id')), 'malformed');
const available = (id: Expr) => [guard(op('not', withdrawn(id)), 'withdrawn'), guard(op('not', replacement(id)), 'replaced')];
const ref = (id: Expr, equals?: { field: string; value: Expr; reason: string }) => ({ table: 'offers', key: id, reason: 'no_such_offer', ...(equals ? { equals } : {}) });
const own = { field: 'author', value: path('actor'), reason: 'not_author' };
const base = (name: string, readers: string, capability: string, schema: Record<string, string>, guards: Act['guards'], writes: Act['writes'], candidates?: Expr): Act => ({ kind: NS + name, readers, max: readers, capability: NS + capability, schema, guards: [notOpen, payloadRecord, ...(name === 'close' ? [] : [idGuard]), ...guards], writes, ...(candidates ? { candidates } : {}) });
const sameId = { id: P('offer_id') };
const rowsAsPayload = (fields: Record<string, Expr>) => read('offers', 'rows', { select: obj(fields) });
const parties = 'sale-parties';
const latestAmount = (table: string, id: Expr) => privateValue(parties, get(read(table, 'latest', { key: id }), 'amount'));
export const sale: Declaration = {
  name: 'com.example.sale', model: 'sale',
  roles: { Seller: [NS + 'accept_offer', NS + 'counter', NS + 'close'], Buyer: [NS + 'make_offer', NS + 'withdraw_own_offer'], Inspector: [] },
  readers: { [parties]: { recipients: [path('actor'), seller, get(read('offers', 'first', { key: P('offer_id') }), 'author')] } },
  tables: { listing: table('spine', ['seller', 'referent', 'ask']), offers: table('members', ['id', 'author', 'replaces']), terms: table(parties, ['id', 'amount', 'author']), counters: table(parties, ['id', 'amount']), withdrawals: table('members', ['id', 'actor']), accepts: table('members', ['id']), closes: table('spine', ['outcome']) },
  acts: [
    { kind: NS + 'listing', readers: 'spine', max: 'spine', schema: { referent: 'string', ask: 'integer' }, guards: [guard(path('origin'), 'listing_must_be_origin'), guard(op('not', listing), 'already_open')], writes: [{ table: 'listing', values: { seller: path('actor'), referent: P('referent'), ask: P('ask') } }] },
    base('offer', 'members', 'make_offer', { offer_id: 'string', replaces: 'string?' }, [
      guard(op('or', op('eq', op('coalesce', P('replaces'), null), null), op('and', op('id', P('replaces')), op('ne', P('replaces'), P('offer_id')))), 'malformed'),
      guard(op('not', exists('offers', P('offer_id'))), 'duplicate_offer'),
      ...available(P('replaces')),
      { ...ref(P('replaces'), own), optional: op('ne', op('coalesce', P('replaces'), null), null) },
    ], [{ table: 'offers', values: { ...sameId, author: path('actor'), replaces: op('coalesce', P('replaces'), null) } }], arr(obj({ offer_id: { op: 'fresh', table: 'offers' } }))),
    base('offer_terms', parties, 'make_offer', { offer_id: 'string', amount: 'integer', seller: 'string' }, [guard(op('and', op('integer', P('amount')), op('string', P('seller')), op('eq', P('seller'), seller)), 'malformed'), ...available(P('offer_id')), ref(P('offer_id'), own), guard(op('ne', acceptedId, P('offer_id')), 'already_decided')], [{ table: 'terms', values: { ...sameId, amount: P('amount'), author: path('actor') } }], rowsAsPayload({ offer_id: R('id'), amount: 1, seller })),
    base('counter', parties, 'counter', { offer_id: 'string', amount: 'integer', author: 'reference:offers.author' }, [guard(op('and', op('integer', P('amount')), op('string', P('author'))), 'malformed'), ...available(P('offer_id')), ref(P('offer_id'), { field: 'author', value: P('author'), reason: 'not_author' }), guard(op('ne', acceptedId, P('offer_id')), 'already_decided')], [{ table: 'counters', values: { ...sameId, amount: P('amount') } }], rowsAsPayload({ offer_id: R('id'), author: R('author'), amount: 1 })),
    base('withdraw', 'members', 'withdraw_own_offer', { offer_id: 'string' }, [...available(P('offer_id')), ref(P('offer_id'), own)], [{ table: 'withdrawals', values: { ...sameId, actor: path('actor') } }], rowsAsPayload({ offer_id: R('id') })),
    base('accept', 'members', 'accept_offer', { offer_id: 'string' }, [...available(P('offer_id')), guard(op('not', accepted), 'already_decided'), ref(P('offer_id'))], [{ table: 'accepts', values: sameId }], rowsAsPayload({ offer_id: R('id') })),
    base('close', 'spine', 'close', { outcome: 'string' }, [guard(op('string', P('outcome')), 'malformed')], [{ table: 'closes', values: { outcome: P('outcome') } }], arr(obj({ outcome: 'closed' }))),
  ],
  query: obj({ status: choose(op('not', listing), 'unopened', choose(closed, 'closed', choose(accepted, 'decided', 'open'))), referent: get(listing, 'referent'), ask: get(listing, 'ask'), seller,
    offers: read('offers', 'rows', { as: 'offer', select: obj({ id: path('offer.id'), author: path('offer.author'), position: path('offer.position'), replaces: path('offer.replaces'), status: status(path('offer.id')), amount: latestAmount('terms', path('offer.id')), counter: latestAmount('counters', path('offer.id')) }) }),
    accepted: acceptedId, acceptedAmount: latestAmount('terms', acceptedId) }),
  invariants: [], supportDisclosure: ['ai.generalbusiness.dap.invite', 'ai.generalbusiness.dap.attach'], backlogBy: 'seller',
};
