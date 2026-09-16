// The Inspection package: the mid-stream attach of the views note's
// trace (position 11). Harness-provided, not a measured model: it has no
// cross-partition constraint. A request names the offer, the seller and
// the inspector; its audience is those three and the requester, so the
// projection shows a request only to them.

import { descriptorId, type ModelSpec, type PackageDescriptor } from '../src/descriptor.ts';
import { named, type EventBody } from '../src/types.ts';

export const INSPECTION = 'com.example.inspection.';

export interface InspectionRequest {
  position: number;
  offer_id: string;
  requester: string;
  seller: string;
  inspector: string;
}

export interface InspectionState {
  requests: InspectionRequest[];
}

export const inspectionModel: ModelSpec<InspectionState, Record<string, never>> = {
  id: 'inspection',
  config: {},
  init: () => ({ requests: [] }),
  fold(state, event: EventBody, ctx) {
    if (event.kind !== INSPECTION + 'request') return { effective: false, state, reason: 'unhandled' };
    const p = event.payload as { offer_id?: unknown; seller?: unknown; inspector?: unknown };
    if (typeof p?.offer_id !== 'string' || typeof p.seller !== 'string' || typeof p.inspector !== 'string') return { effective: false, state, reason: 'malformed' };
    if (!ctx.members.includes(p.inspector)) return { effective: false, state, reason: 'no_such_inspector' };
    return { effective: true, state: { requests: [...state.requests, { position: ctx.position, offer_id: p.offer_id, requester: event.actor, seller: p.seller, inspector: p.inspector }] } };
  },
  observe(_p, state, ctx) {
    return { requests: state.requests.filter((r) => ctx.visible(r.position)).map((r) => ({ ...r })) };
  },
  affordances(_p, _state, ctx) {
    return ctx.members.length > 0 ? [INSPECTION + 'request'] : [];
  },
};

const base: Omit<PackageDescriptor, 'id'> = {
  name: 'com.example.inspection',
  module: import.meta.url,
  models: { inspection: inspectionModel as unknown as ModelSpec },
  capabilities: [],
  kinds: {
    [INSPECTION + 'request']: {
      kind: INSPECTION + 'request',
      schema: { offer_id: 'string', seller: 'string', inspector: 'string' },
      handlers: ['inspection'],
      audienceId: 'requester+seller+inspector',
      audience: (_ctx, ev) => {
        const p = ev.payload as { seller?: string; inspector?: string };
        return named(ev.actor, p.seller ?? ev.actor, p.inspector ?? ev.actor);
      },
    },
  },
};

export const inspectionPackage: PackageDescriptor = { id: descriptorId(base), ...base };
