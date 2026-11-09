# Select the scale project for review and main

Request `d0afa034`, under Hugh's order `afdebb86`, chooses PD-3 option (a)
from the [tech-debt review](../2026-10-25-codebase-techdebt-review.md).
Every scale witness keeps its real bound and deadline. A separate canonical
project lets the review gate select the ruled paths, while main runs that
project after every landing.

The cited six rows occupy four current whole owners. Planner question
`955bf62f` asks whether those four owners move unchanged or need a split,
and which extra harness paths must select scale. No owner or project has
moved while that ruling remains due.

The independent selection helper reads actual `HEAD`, `origin/main` and
its merge base. Main always selects scale. For a review, the helper records
all changed paths and selects the runtime families and their tests named
by PD-3. It disables rename detection so a move out of a family still names
the removed scale path. NUL separation keeps paths with spaces intact.
This helper has no caller yet; harness triggers and runner integration
remain due.

## Validation

No compiler, owner, control, workflow or gate has run for BR-5. Its three
prepared Node cases cover the main/review decision, the ruled families,
and a real Git rename out of a scale family. They use local scratch Git
only. The RoomOpening/BR-12 gate holds the one executable slot.
