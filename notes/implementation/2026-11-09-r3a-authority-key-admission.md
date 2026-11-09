# Reserve authority cache places for keys with standing

Request `31f98f33`, promise `cf19eb3a`. This source checkpoint starts at main
`f1f6a8b97d02fd961a54ee62ae7fad1a8b0fa41a`. Planner ruling `dbf97956`
accepts the cache design after the read-only proposal `849ab1d5`.

An unknown key or an unanswered observation takes no signer-key cache place.
The run reserves a place only after an observation passes the existing
current-standing judgment. The size check and insertion run synchronously
after the membership read. Once-only grants reserve places too, because a
sealed entry can retain their highest observed heads. A new key with
standing receives `limit` after 4,096 such keys enter the run.

An admitted key's irreversible denial stays in its existing cache for the
whole run. A separate FIFO keeps 4,096 revoked keys that were never admitted.
Only a new distinct revoked key can evict an entry. An eviction advances a
generation. Older standing handles and older reads still in flight cannot
grant authority after that generation changes. A later cache miss reads
Membership again. The commit keeps its own authority, head and clock checks.

`cacheCounts()` exposes only the four internal signer-key map sizes. It
exposes no key, observation or credential and adds no wire route. The memory
witnesses inspect those actual sizes instead of reconstructing the cache.

The revised capacity witness fills the run with keys that have standing,
including once-only reads, and resolves two competing final-place reads in
reverse order. The newcomer witness sends more than 4,096 scripted unknown,
unanswered or failed reads before Membership grants the newcomer standing.
The eviction witness keeps an older active answer in flight, evicts that
key's later revoked answer, then checks that the old answer cannot grant
standing. These three cases exercise the actual authority port below
signature admission. Key IDs and Membership replies are explicit stand-ins.
The existing Native authority cases keep their original assertions.

The two planned controls restore admission before the read and suppress the
FIFO generation increment. They must distinguish the newcomer receiving
`limit` and the old in-flight answer granting standing, respectively. No
control, compiler, test or gate has run at this checkpoint. BR-14 owns the
current validation slot. Its landing must be merged before R3a validation.
The authority seal records the maintained parser's actual source value.

The threat model names the FIFO size, the changed guarantee for a
never-admitted key after eviction and the limit's dependency on 4,096 keys
with standing. Membership's irreversible retirement and removal remain
trusted. Real revoked keys can cause eviction and require another read.

Planner ruling `19647eda` keeps the separate pre-existing `Further`
reusable-observation map outside R3a. Definitions choose the observation
rows, windows and per-input limits; act content can choose the subjects.
`listedBy` in `derive/src/observes.ts` evaluates the row's operand over the
act's fields. The validator accepts a typed member field or list and checks
the membership reference, not a fixed list of member IDs. The Directory's
`open-task` row reads the `worker` field. Rules `publish` reads each
`checks[*].checker`, and Rules13 reads the `checkers` field.

Membership answers an absent member with a valid `memberState: "unknown"`
observation. `bytes/src/records.ts` accepts that form. `Further.read` keeps
each answered non-once subject under `subjectName` before the act's later
guards decide. A row's `max` bounds one input; it does not bound the distinct
member names that inputs can accumulate in a run. The threat model therefore
names that map as unbounded. The planner owns its separate placement under
`4e8cf844`. No `Further` cache code changes here, and this patch makes no
claim that every observation cache is bounded.
No recorded format, definition pin, setting or deployment changes here.
