// The machine-readable part of the Discussion manifest: bounds, seeds and
// the invariants, declared independently of the fold. The manifest's
// identity binds the prose (discussion.md) and this module together, so
// neither can change under a cited id; a run cites DISCUSSION_MANIFEST_ID.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { contentId } from '../src/canon.ts';
import { moduleHash } from '../src/descriptor.ts';
import { heldAt, type FoundationState } from '../src/foundation.ts';
import { DISCUSSION, discussionPackage, type DiscussionState } from '../fixtures/discussion.ts';

export const discussionBounds = { maxParticipants: 4, maxPositions: 24, seeds: [1, 2, 3, 4, 5, 6, 7, 8] };

const proseUrl = new URL('./discussion.md', import.meta.url);
export const DISCUSSION_PROSE = readFileSync(fileURLToPath(proseUrl), 'utf8');

/** The experiment identity: the prose, this module, and the package under test. */
export const DISCUSSION_MANIFEST_ID = contentId({
  prose: contentId(DISCUSSION_PROSE),
  executable: moduleHash(import.meta.url),
  package: discussionPackage.id,
});

/** The bounds the prose states, parsed so a test can hold the two parts to the same numbers. */
export function proseBounds(): { maxParticipants: number; maxPositions: number; seeds: number[] } {
  const m = /At most (\d+) participants, at most (\d+) positions/.exec(DISCUSSION_PROSE);
  const s = /seeds (\d+) to (\d+)/.exec(DISCUSSION_PROSE);
  if (!m || !s) throw new Error('discussion.md does not state its bounds');
  const from = Number(s[1]);
  const to = Number(s[2]);
  return { maxParticipants: Number(m[1]), maxPositions: Number(m[2]), seeds: Array.from({ length: to - from + 1 }, (_, i) => from + i) };
}

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
