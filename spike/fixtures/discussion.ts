// The Discussion package: the worked example (spike plan §4.4, §4.7).
//
// Uniform visibility: every member sees every post made while they are a
// member. One shared outcome, closure, is an explicit spine event, so a
// late joiner learns it without disclosure. Posts after closure are
// ineffective. The projection shows the posts the principal can read;
// the post count is not a shared outcome.

import { descriptorId, type ModelSpec, type PackageDescriptor } from '../src/descriptor.ts';
import { MEMBERS, SPINE, type EventBody } from '../src/types.ts';

export const DISCUSSION = 'com.example.discussion.';

export interface Post {
  position: number;
  author: string;
  text: string;
}

export interface DiscussionState {
  posts: Post[];
  closed: boolean;
  /** the position of the effective close, once closed */
  closedAt?: number;
}

export const discussionModel: ModelSpec<DiscussionState, { maxText: number }> = {
  id: 'discussion',
  config: { maxText: 200 },
  init: () => ({ posts: [], closed: false }),
  roles: {
    Member: [DISCUSSION + 'post'],
    Moderator: [DISCUSSION + 'post', DISCUSSION + 'close'],
  },
  fold(state, event: EventBody, ctx, config) {
    switch (event.kind) {
      case DISCUSSION + 'post': {
        if (state.closed) return { effective: false, state, reason: 'closed' };
        const p = event.payload as { text?: unknown };
        if (typeof p?.text !== 'string' || p.text.length === 0 || p.text.length > config.maxText) return { effective: false, state, reason: 'malformed' };
        return { effective: true, state: { ...state, posts: [...state.posts, { position: ctx.position, author: event.actor, text: p.text }] } };
      }
      case DISCUSSION + 'close':
        if (state.closed) return { effective: false, state, reason: 'already_closed' };
        return { effective: true, state: { ...state, closed: true, closedAt: ctx.position } };
      default:
        return { effective: false, state, reason: 'unhandled' };
    }
  },
  observe(_p, state, ctx) {
    return {
      closed: state.closed,
      closedAt: state.closedAt ?? null,
      posts: state.posts.filter((post) => ctx.visible(post.position)).map((post) => ({ position: post.position, author: post.author, text: post.text })),
    };
  },
  affordances(_p, state, ctx) {
    if (state.closed) return [];
    const out: string[] = [];
    if (ctx.holds(DISCUSSION + 'post')) out.push(DISCUSSION + 'post');
    if (ctx.holds(DISCUSSION + 'close')) out.push(DISCUSSION + 'close');
    return out;
  },
};

const membersAudience = () => MEMBERS;
const spineAudience = () => SPINE;

const base: Omit<PackageDescriptor, 'id'> = {
  name: 'com.example.discussion',
  module: import.meta.url,
  models: { discussion: discussionModel as unknown as ModelSpec },
  capabilities: [DISCUSSION + 'post', DISCUSSION + 'close'],
  kinds: {
    [DISCUSSION + 'post']: { kind: DISCUSSION + 'post', schema: { text: 'string' }, handlers: ['discussion'], audienceId: 'members', audience: membersAudience, capability: DISCUSSION + 'post' },
    [DISCUSSION + 'close']: { kind: DISCUSSION + 'close', schema: {}, handlers: ['discussion'], audienceId: 'spine', audience: spineAudience, capability: DISCUSSION + 'close' },
  },
};

export const discussionPackage: PackageDescriptor = { id: descriptorId(base), ...base };
