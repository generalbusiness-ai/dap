import { sale } from '../declarations/sale.ts';
import { path, read, type Declaration } from '../schema.ts';

export const lateMember = structuredClone(sale);
lateMember.tables.offers!.max = 'recorded-members';
lateMember.backlogBy = '';

export const payloadAudience = structuredClone(sale);
payloadAudience.readers['sale-parties']!.recipients = [path('actor'), path('payload.author')];

export const assertedReference = structuredClone(sale);
for (const g of assertedReference.acts.find((a) => a.kind.endsWith('.counter'))!.guards) if ('table' in g) g.trustPayload = true;

export const club: Declaration = { name: 'com.example.club', model: 'club', roles: { Member: ['com.example.club.vote'] },
  readers: { 'applicant+committee': { recipients: [path('actor')] } },
  tables: { applications: { key: 'id', readers: 'applicant+committee', max: 'applicant+committee', columns: { id: { type: 'string' }, kind: { type: 'string' } } } },
  acts: [{ kind: 'com.example.club.vote', readers: 'members', max: 'members', capability: 'com.example.club.vote', schema: { application_id: 'string' }, guards: [{ table: 'applications', key: path('payload.application_id'), reason: 'unknown_application' }], writes: [] }],
  query: null, invariants: [], supportDisclosure: [], backlogBy: 'founder' };

export const diagnosed = { lateMember, payloadAudience, assertedReference, club };
