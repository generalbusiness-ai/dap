// Machine-readable part of the Discussion manifest: bounds, seeds and the
// invariants, declared independently of the fold. The report cites the
// content id of discussion.md.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { contentId } from '../src/canon.ts';
import { heldAt, type FoundationState } from '../src/foundation.ts';
import { DISCUSSION, type DiscussionState } from '../fixtures/discussion.ts';

export const DISCUSSION_MANIFEST_ID = contentId(readFileSync(fileURLToPath(new URL('./discussion.md', import.meta.url)), 'utf8'));

export const discussionBounds = { maxParticipants: 4, maxPositions: 24, seeds: [1, 2, 3, 4, 5, 6, 7, 8] };

/** Invariants over the oracle's state (manifest: no post after close; every post by a holder of post). */
export function discussionInvariants(state: FoundationState, _frontier: number): string[] {
  const out: string[] = [];
  const d = state.models['discussion'] as unknown as DiscussionState | undefined;
  if (!d) return out;
  for (const post of d.posts) {
    if (d.closedAt !== undefined && post.position > d.closedAt) out.push(`post at ${post.position} after close at ${d.closedAt}`);
    if (!heldAt(state, post.author, DISCUSSION + 'post', post.position)) out.push(`post at ${post.position} by ${post.author} without the post capability`);
  }
  return out;
}
