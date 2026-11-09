# Agentic development practice and the journey

Status: current. Draft 1, 26 October 2026, recut 8 November 2026. A
research note. It commissions nothing. Section 6 records Hugh's decisions
of 26 October 2026, and section 7 proposes the order that plan 032 draft 3
(section 2f) took up on 30 October 2026. Source facts cite
`path:line` at main `a97c7425`. External facts cite pages read on 26
October 2026.

## 1. Why this note

Hugh asked on 26 October 2026 whether the processes planned for the
journey ([plan 032](plans/032-2026-10-17-journey-as-acceptance-target.md),
section 2b) are flexible enough for development practice that is changing
quickly. This note reads three sources he named and other current writing,
states what they have in common, compares each practice with what dap
records today and plans, and draws the consequence for the journey.

The post by Addy Osmani could not be read directly; the site answers a
fetch with a payment wall. The post links an article by the Claude Code
team, "How the Claude Code team does code review", which is mirrored at
claude.dev. That mirror is the source used here.

## 2. What the three sources describe

### 2.1 Linear: the next system

Linear's page says issue tracking "was built for a handoff model of
software development" and that "the process became the work". Its next
system is "designed around context and agents". Context (customer
feedback, ideas, direction, decisions and code) flows through rules,
automations, skills and permissions to agents. The page gives three
adoption figures: coding agents are installed in more than three quarters
of its enterprise workspaces, work completed by agents grew five times in
three months, and agents authored about a quarter of new issues.

Its coding sessions start from an issue and "the context already on it".
The agent proposes an approach before it writes code. "The session belongs
to the organisation rather than to the person who started it": anyone can
follow, add context, redirect the approach, request changes or take over.
"Existing GitHub permissions and review requirements still determine what
ships." Automations can start a session when an issue enters triage. "How
much of this runs on its own is your call."

### 2.2 Capy

A thread is the unit of agent work. A Captain is a long-lived agent that
"runs a crew of threads for you and tells you only what needs you". Its
plan, digest and crew rules are files that every crew thread reads on
every turn. Decomposition is instruction, not a built-in: the examples
split a spec into pull requests that "merge independently, with one crew
thread each". A merge gate is a rule the owner writes, such as "Nothing
merges without my word".

A thread wakes on events: a message, CI results on a pull request it
owns, review comments, a merge or conflict, a finished subagent, a timer
of up to seven days, or a watch on a repository, channel or webhook. A
per-category setting says whether to react, keep the event as context, or
ignore it. A person steers a running thread with three send modes: steer
(read after the current step), queue (read after the turn) and interrupt
(read at once, losing the step's reasoning).

The review agent posts findings with a category, a severity, a confidence
(confirmed or investigate), a file and line, and a failure scenario. It
reads the repository's `AGENTS.md` and enforces its conventions as
findings. A re-review covers only code changed since the last reviewed
head; open findings carry forward; a verified fix is marked resolved;
"Re-reviews don't flag the same issue twice". Automations are stored
prompts with up to twenty triggers: a schedule, GitHub events, Slack
bursts, an incoming webhook with an idempotency key, or an on-demand run.
A pinned model "never silently substitutes".

### 2.3 The Claude Code team on code review

The goal is "the minimum amount of human review time that doesn't raise
reverts or incidents". Between June and September 2026 merged pull
requests more than doubled while the share needing a revert fell by more
than 40 percent. "We didn't remove review. But we did move most of the
reading to machines, optimized for human time and attention, and invested
heavily in making it fast and easy to undo mistakes." The target: most
changes merge "with at most one human in the loop, who can be the author".

The life of a change. Before the pull request, the agent runs tests and a
build, and a second agent reviews the diff in a fresh context; the team
asks it to "show the output instead of saying it's done". On every pull
request: required CI; a review in which "agents hunt for bugs in parallel,
verifiers vote on each finding, survivors ranked by severity"; a separate
security review; and a risk-based approval in which "a classifier sets
the tier: no person, one, or two". Low-risk changes land with no person
once checks are green. "The change sets the tier, not the author." "Only
authors on the repo's trusted list get the lighter paths." "An agent's
approval never counts as a person's." "On an agent-written PR, the person
directing the agent counts as one of the required reviewers." "An approval
covers one specific commit." A merge queue reruns checks on the latest
main. After merge: flags, staged release, one-step rollback.

Findings gate landing: "A PR can't merge while any finding from the bug
review or the security review is still open." "Every finding has to be
answered." Review convergence was the hard operational problem: one change
"went through more than fifty rounds of review and fixes overnight", and
most of the flagged code had been there since the first pass. The fixes:
"After three rounds, the reviewer asks the author to step back and
reconsider the approach"; diff-only re-review; flag the class of bug; never
repeat a finding. Past incidents are the evaluation set, run daily. Where
people stay: deciding whether to build, the riskiest code, architecture
that sets a pattern, reading the evidence, and owning the outcome. The
team names one gap: "circuit breakers that tighten approval when those
numbers move".

| Measure | Before | After |
|---|---|---|
| Changes passing review in one round | 65% | 78% |
| Changes needing five or more rounds | 8.9% | 1.5% |
| Mean review rounds to pass | 2.08 | 1.32 |

### 2.4 Other reading

- A merge-queue analysis (July 2026) argues that agent volume turns
  retry loops into a denial of service of the queue, and recommends
  classifying every required check by when it runs (fast checks before
  the queue, stable integration checks in it, slow suites after merge),
  affected-target analysis, quarantine of flaky tests, and a merge-attempt
  budget of about two before escalation to a person with the evidence.
- GitHub made stacked pull requests native in July 2026, with the stated
  purpose of splitting agent output into bounded review units.
- The arXiv paper "Cheap Code, Costly Judgment" (July 2026) proposes that
  governance controls in agentic development are discovered from failures
  seen during the work, and that engineering judgment turns them into
  durable mechanisms. "Software Engineering in the Agent Era" (September
  2026) names the engineering object a trustworthy change, moving from
  intent through delegated execution, verification, integration and
  acceptance, and holds that agent execution carries no acceptance
  authority of its own.
- Practitioner writing on parallel agents (October 2025 onward) agrees
  that review capacity, not agent throughput, sets the ceiling, and
  proposes trust tiers by risk, limits on active streams set by review
  capacity, and written delegation briefs with stop criteria.

## 3. What the sources have in common

1. **The record of intent is the system of work.** Each product keeps the
   context, the plan and the decisions in one place that agents read and
   people steer. The two papers call for the same thing in general terms.
2. **Review moved to machines, with people at the risky edges.** A tier
   set by the change decides whether a person is needed at all.
3. **Findings are objects that gate landing.** Each has a location, a
   severity and a confidence, and carries across versions until resolved.
4. **Reaction is the product.** Agents wake on CI results, review
   comments, merges, timers and incoming events, and automations start
   work when an issue enters a state.
5. **Steering is cheap and shared.** Anyone may redirect a running
   session; an approach is proposed before code is written.
6. **Agent identity and approval are kept apart from people.** An
   approval binds to one commit; an agent's approval never counts as a
   person's; the person directing an agent is one reviewer.
7. **Integration is the next bottleneck.** Serial queues with repeated
   checks break first under agent volume.

## 4. Where dap stands

### 4.1 Practices dap already records

- A review verdict and a check result each name one manifest and one
  tree (`apps/room/lanes/src/change.ts:103-155`). The merge guards count
  only verdicts on the current manifest (`change.ts:1295-1304`). This is
  the field's "an approval covers one specific commit".
- A member has a kind; an agent has a controller; `change.review` and
  `change.merge` sit with person roles and `change.check` with the
  checker role (`packages/platform/src/membership.ts:106-108`). The
  destination counts an approval only from a member who is not an author
  and, unless the rules say `ownerMayReview`, not the controller of an
  author (`packages/platform/src/reservation.ts:274-278`). This is the
  recorded form of "an agent's approval never counts as a person's" and
  "the person directing the agent counts as one of the required
  reviewers".
- Extents are path-based risk tiers as data: patterns, a count of
  approvals, an approver action, required checks, and a class of content,
  deployment or authority (`packages/platform/src/extents.ts:35-41`). The
  first definition puts agent instruction files and CI workflow
  definitions in the authority extent (`extents.ts:53,64`). That matches
  section 2.3, where the change sets the review tier and people stay on
  the riskiest code.
- The [landing policy note](2026-10-16-declared-landing-policy.md) states
  an attempt limit of three with escalation, and the
  [evidence rules note](2026-10-16-evidence-rules-design.md) gives each
  check a source, a reuse rule and a stage. These are the same shapes as
  the round cap and "classify every check by when it runs". Both are
  designs; neither is built.
- Each issue and each change is its own scope, so a new lane definition
  applies to all new work at once. The shape of the process changes at
  the granularity of the next issue.
- Custody of a signed request across devices (J1), settlement after a
  lost reply, and a refusal that names its reason have no counterpart in
  the three products.

### 4.2 Practices dap does not record yet

The question for each row: can a room adopt the practice by publishing
data, or does it need a platform version?

| Practice | dap today | In dap's plans | By data? |
|---|---|---|---|
| Risk tier set by path; people sign off | Extents | | Yes, today |
| Tier 0: a low-risk change lands with no person | Only a signed `merge` by a holder of `change.merge` lands (`reservation.ts:233`) | Landing policy, section 4.1 and order step 3: a destination version, "large (own design)", unfiled | No |
| Open findings block the merge | A review is a verdict and a body (`change.ts:103-115`); a result has an outcome, a reason, a tree and a digest (`change.ts:144-155`) | The landing policy's assessment is one confidence number | Yes, as a lane revision with a `finding` item and a merge guard; not planned |
| Round cap, then escalate | | Landing policy, section 3, as data and a local landing member | Yes, planned, unfiled |
| Re-review only the interdiff | No diff view | Plan 032, J2 | Yes, J2 |
| Agent wakes on CI fail, review comment, merge, timer | `wait` polls for at most 60 seconds (`packages/mcp/src/service.ts:92`); the inbox sends nothing (`packages/platform/src/inbox.ts:3-5`) | Designed three times: [wake and schedule](2026-10-01-wake-and-schedule.md), [condition subscriptions](2026-10-09-condition-subscriptions-and-webhooks.md) marked not prioritized, and the hosted teams' dispatch; J5 names "resuming agent work" as its next step | No |
| Automation: an issue enters a state, an agent starts | Timed rules exist inside definitions | None reaches an agent | No |
| An agent reviewer whose verdict is recorded apart from a person's | Agents comment only | The [roles note](2026-10-21-roles-flow-and-instances.md), lines 275-278, defers it to a later membership version | No |
| A trusted-author list gets lighter paths | Five roles; `set-actions` replaces one role's whole list (`membership.ts:473`) | No design | No |
| Stacked changes; parallel integration | One destination head; a moved base is refused | The evidence rules note says batching on an unpublished reservation "changes the reservation model" (line 324) | No |
| Rule and skill files versioned in the repository | `AGENTS.md`, `CLAUDE.md` and workflows in the authority extent (`extents.ts:53`) | | Yes; add `REVIEW.md`, `.agents/**` and `.claude/**` to a room's rules |

Two things cut across the table. The kernel is not the rigid part:
nothing the sources have learned contradicts the record model, and several
lessons are things the record already enforces. The rigid parts are the
platform scopes: membership, rules and destination, each pinned by room
cohort ([kernel boundary](../docs/kernel.md), K1). Any practice that
changes who may land, or who counts as a reviewer, waits on one of those
versions.

## 5. What this means for the journey

The MVP plan fixes "People decide. Only people approve, decide, review and
merge" as settled choice 4
([MVP plan](2026-10-16-repo-in-ai-mvp-plan.md), line 27), and plans H2 to
make it impossible for an admin to grant an agent `change.merge` (line
107). The exit test (plan 032, section 2d) then measures a loop in which
a person reads every diff and signs every merge. That is the loop the
field is leaving. The measurement would show the person as the bottleneck
on every change, and the simplification question that follows is framed
as which acts can go.

The journey has no agent reviewer in it. The most common new practice has
no home in the record except a comment. Step 4 of the journey, "steer the
work", relies on the agent polling for decisions, with no trigger path
built.

## 6. Decisions

Hugh took these decisions on 26 October 2026.

1. **The rules say who lands.** MVP settled choice 4 becomes "the rules
   say who lands, and the exit test's rules require a person". H2 is not
   built as a prohibition. The landing policy's two routes replace it: an
   eligible-approval floor on the human route, and a checked landing
   route for a landing member.
2. **A `finding` item joins the change lane.** It has a file, a range, a
   class, a severity, a confidence, a failure scenario, a source with its
   tool or model version, and the tree it describes. Its states are open,
   resolved and irrelevant. A merge guard refuses while a required source
   has an open finding. The landing policy's assessment becomes a view
   over findings.
3. **The agent wake is part of J5.** One authorized event feed with no
   webhook, read over J5's Durable Streams side, is the agent's wake. It
   lands before the exit test. Webhooks stay later.
4. **The membership version that makes roles data is filed now** as a
   design request, with a trusted-author list and a reviewer-agent whose
   verdict is recorded apart from approval, under the roles note's rule:
   never count an agent whose controller controls an author.
5. **The exit test measures what the field measures:** human approvals
   for each change, time a change waits on a person, and reverts. Its
   rules include one tier-0 extent with zero approvals and a person's
   merge. A revert is recorded as a link kind so it can be counted.

What stays as it is: approval per exact version, with carried approvals
still deferred until measured; an agent's approval never counts as a
person's; controller tracing; checks bound to the tree; refusal with a
reason; policy as reviewed data.

## 7. Order

A tier-0 extent with zero approvals and a person's merge is expressible as
rules data today (`packages/platform/src/rules-scope.ts:110`), so the exit
test does not wait for the destination version. Measuring how many merges
were tier-0 is the evidence that the landing route needs. The proposed
order for plan 032's next draft:

| Before the exit test | After measuring |
|---|---|
| The `finding` item, as a lane revision (data, medium) | The destination version with the two routes, combined with the evidence-rules version so that there is one cohort change, not two |
| J5 with the agent wake over the event feed | The membership version with roles as data |
| Exit-test rules with a tier-0 extent and the three measures | Extents as parallel reservations, if the numbers ask for it |

The builder is serial and is on the demo-room archive slice and G4
([plan 033](plans/033-2026-10-18-grow-room-demo.md), rows 9 and 10). The
`finding` item takes J3's position in the order rather than interrupting
G4. Nothing in this note adds a scope kind, a platform name, a capability,
a tool family or a model of the record; the two platform versions are
versions of existing definitions, so the kernel filing rule
([kernel boundary](../docs/kernel.md), section 7.1) does not hold them.

## 8. Sources

Read on 26 October 2026.

- Linear, "The next system": https://linear.app/next
- Linear, coding sessions: https://linear.app/docs/coding-sessions and
  https://linear.app/now/coding-sessions-for-linear-agent
- Capy documentation: https://docs.capy.ai/welcome, /captains,
  /async-work, /review, /pull-requests, /automations, /skills
- Addy Osmani's post: https://x.com/addyosmani/status/2114604912520921136
- The Claude Code team, "How the Claude Code team does code review":
  https://claude.dev/blog/solving-code-review-at-anthropic/
- "Cheap Code, Costly Judgment": https://arxiv.org/abs/2607.01087
- "Software Engineering in the Agent Era": https://arxiv.org/abs/2609.04630
- "The Merge Queue Is the New Bottleneck":
  https://tianpan.co/blog/2026-07-02-the-merge-queue-is-the-new-bottleneck
- GitHub, stacked pull requests in public preview:
  https://github.blog/changelog/2026-07-30-stacked-pull-requests-are-now-in-public-preview/
- The Pragmatic Engineer, "programming by kicking off parallel AI agents":
  https://blog.pragmaticengineer.com/new-trend-programming-by-kicking-off-parallel-ai-agents/
- "Code Got Cheap. Your Attention Didn't.":
  https://dev.to/max_quimby/code-got-cheap-your-attention-didnt-4fm3
