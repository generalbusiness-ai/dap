# Experiment manifest: Discussion

Frozen before any checker run (spike plan §4.7). The worked example of
the views note: uniform visibility, the free case. It is checked
deterministically, not by a seed campaign (§4.4).

## Package

`fixtures/discussion.ts`, pinned by module, config `{maxText: 200}` and
schemas. Kinds: `com.example.discussion.post` (members; requires `post`),
`com.example.discussion.close` (spine; requires `close`). Roles: Member
(post), Moderator (post, close).

## Promises

1. Every member sees every post made while they are a member.
2. A member who joins later sees earlier posts only by disclosure.
3. Closure is visible to every participant, present and future: it is a
   spine event.
4. No post is effective after closure.

## Privacy budget

Posts: members when recorded, subject to disclosure. Nothing else is
private. Participation is spine.

## Shared outcomes

Closure only. The list of posts a principal sees is that principal's; the
number of posts is not a shared outcome.

## Constraint inventory

None cross-partition. Budget: not applicable.

## Domain and bounds

At most 4 participants, at most 24 positions. Deterministic checks only;
seeds 1 to 8 are used for the harness checks below and are not a
falsification campaign.

## Deterministic checks (spike plan §4.4)

- **Normal replay.** For seeds 1 to 8, generated series with posts,
  a late joiner, a narrow side attach and a disclosure: zero violations.
- **Pause and resume.** A participant whose client lacks the side package
  pauses at the attach with `last` equal to the oracle through the
  position before, under the same basis; with the package supplied,
  equality resumes at the frontier.
- **Planted fault.** Replace `close`'s audience with the actor alone: a
  series with a late joiner after closure must produce a mismatch, and
  the checker must report it.
- **Shrinking.** The failing series above shrinks to a minimal script:
  one post at most, the close, one join.
- **Invalid cache.** A cached interpretation under basis 21 is discarded
  under basis 22 and rebuilt.

## Expected outcomes, independent of the fold

- After `close` at position c, every participant's observation has
  `closed: true` at every frontier n ≥ c, including a participant who
  joins after c.
- A post at position i by author a is in the observation of exactly the
  participants who were members at i, plus those it was disclosed to.
- A post after closure is ineffective with reason `closed`.
- An actor without `post` emitting a post is ineffective with
  `unauthorized`.

## Invariants (evaluated on the oracle's state)

- No effective post has a position after the position of an effective
  close.
- Every effective post's author held `post` at its position.
