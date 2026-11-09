# Record the retirement premise for identifiers

Child request `7740db3d` owns this note amendment under promise `89610f8f`.
Parent request `05d618e2`, resumed by `9ab66624`, owns the identifier
implementation.
Planner ruling `c0a795e7` authorizes head (a), the note amendment, as
phase-2 filler. Lane E of `63d906c0` keeps its validation slot after the
other active lanes.

## What changed

The identifiers design note now states the chosen deployment boundary.
Every old-format room retires at the cutover on the same four Workers.
Before that deployment, the planner records the affected rooms, their
last entries and archive states, and the last main commit that reads
their journals. Retained entries keep their original bytes and signatures.

The new code must recognize a retired old-format room and return a named
refusal that names its reader commit. The rollout uses one implementation,
with no translation, dual writes or frozen old-format deployment. After
the cutover, the planner and builder recreate the Grow, Lending and J5
Site demo rooms and rerun J5's acceptance scene for the new room.

The note also records the resumed request and the phase-3 build order.
Its old size figures now identify themselves as the original planning
count. The protocol's rules and the six difficult areas stay as written.

## Decisions and why

The original note assumed there was no deployed history. The four Workers
now hold journals, so that premise no longer describes the deployment.
Hugh chose retirement in ruling `c0a795e7`. This amendment records that
choice before any code depends on it.

Historical notes and retained evidence keep their old terms. The final
condition about old reference names applies to source, tests and current
docs. The implementation must preserve old journal bytes and signatures.
Replay at the recorded old-format commit remains their reader.

This head changes documentation only. The identifier protocol, cutover,
retired-room refusal and replacement demo rooms remain unbuilt. The
planner owns the deployment and the inventory that must precede it.

## Final evidence

Validation has not run for this draft. The single local slot belongs to
R3a. The identifiers request requires a gate before this head's review.

| Check | Command | Exit | Output digest |
|---|---|---|---|
| Gate before review | `npm run gate` | Not run | Pending |

## Open limits

Request `05d618e2` owns the identifier implementation and its acceptance
conditions. Heads (b) through (e) wait for phase 3. This note supplies no
protocol, routing, replay, archive or HTTP-binding evidence.

The planner must inventory the old rooms and record their reader commit
before deploying the cutover. The new J5 room needs its own acceptance
scene and evidence after recreation. This head retires no room and
changes no deployed service.
