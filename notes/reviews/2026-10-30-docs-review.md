# Documentation review, 30 October 2026

Status: the review pass and the writing pass are complete at this head.
The review read every page under `docs/` at main `5dc9765f`: 33 pages,
about 165,000 words. The writing pass edited the pages on one branch and
sent the head for review.

The review asked three questions of each page. Does it help a reader
understand what to build with dap, and does it sit in a clear reading
journey? Is it simple, coherent and readable? Is it accurate against the
code at `5dc9765f`? Five reviewers each took a group of pages and checked
8 to 15 concrete claims per page against the source, with a script that
resolved every relative link and anchor (638 links, none broken).

## 1. What the review found

### The reading journey

The index opened with the room, "a shared coding workflow for a
repository", and listed twelve room pages before anything else. A reader
who wanted to build something reached the tutorials after the room and
reached "What is dap?" fourth. The repository README calls dap
"structured workrooms for people and agents" and the index called it "a
durable action platform". Five pages were not linked from the index at
all: application-views, celld, lanes, operations and usage-report. The
MCP page, the one page an agent-host integrator needs, was linked by a
single anchor.

### Landing reports inside reader pages

Each landing had appended its evidence to the page it touched. The second
half of the architecture page, about 1,500 words, was census pagination
limits, container runner detail, cohort version lists and carrier
bookkeeping. The kernel page opened with request IDs and gate results. The
CLI page held check logs from 10 and 11 October and paragraphs about
future tasks. The write-an-application page carried a subsection on
consuming one published release and the sentence "P1 changes no existing
signed packet". The MCP, deploy, self-host, entry-points, testing and SDK
pages carried planner process paragraphs, slice names (R5, J4, H3, W1,
BR-1) and request hashes. The two manual pages on the record and the life
of an act hedged against project history ("not the older parked Room API
or an unlanded intent-v2 wire format").

### Wrong or stale claims

| Page | Said | Fact at `5dc9765f` |
|---|---|---|
| README, what-is-dap, roadmap | Library publication "built and not yet run on a deployed room" | The runbook records a room that ran the story and all seven publications |
| run-your-app | "will be run and recorded when deployments resume" | Deployments resumed; all three Workers run main `5dc9765f` |
| roadmap | Self-hosting "designed, not built" | The local celld Worker and the Mac kit run |
| roadmap | Journal floor "being built" | F1 and F2 built, F3 not |
| roadmap | Capabilities `hold@1`, `git-read@1`, `device-command@1` | `hold@2` exists |
| roadmap | Points to a "What runs" table in Scopes | No such table |
| scopes | Nine packages, six platform definitions, eight inputs, four answers, only entries counted | Twelve packages, seven definitions, nine inputs (floor), five answers (archived), five capacity dimensions |
| scopes | The runtime and the verifier share only `derive` | Scope imports mcp and client; replay imports platform and git |
| kernel | Promise 3: `profile` and `capabilities` optional | Required members of a definition |
| kernel | K9 open | Landed 23 October |
| cli | `--host` defaults to `github.com`; five creation families | `--host` is required and takes `none`; six families |
| cli | Pin prompt names `registerScope` | The CLI prints `Set REGISTER_SCOPE to ...` |
| cli | No `new`, `check`, `dev`, `pack`, `mcp`, `scope-index` | All exist |
| cli | "There is no page" | The room page exists |
| self-host | Keep one binding and one migration; cleanup deletes one class | Four Durable Object bindings, three migrations, an R2 bucket, an Analytics dataset; four classes |
| self-host, deploy, hosts | Pin the register through `ARTIFACTS_CONFIG.registerScope` only | `REGISTER_SCOPE` is the pin; the GitHub order fails without it |
| hosts | Hosts are Artifacts and GitHub; namespace is `artroom-demo` | `--host none` exists; each deployment has its own namespace |
| mcp | Fourteen generic tools | Eighteen, two of which the hosted endpoint omits by default |
| pages | Each read mints and revokes a token; `dap claim` prints "Claimed" | Site tokens are shared and reused; `dap create` prints "Created" |
| pages | Refusal table | Lacks `no-repository`, `rate-limited`, `unavailable` |
| operations | Health body has four fields; 200 on two conditions | Five fields including `wiring`; a configured host whose wiring is off gives 503 |
| demo | Link to a deploy.md "Plan" section; `ARTROOM_HOME` | No such section; `DAP_HOME` |
| trust-boundaries | No `dap-celld-local`; no `REGISTER_SCOPE`; no `APPLICATION_TRUST` on dap-demo | All three present in the configuration files |
| testing | Six-package SDK | Eight packages |
| public-sdk-release | All packages at `0.1.0-dev.2` | Sources at `0.1.0-dev.1`; the producer stamps `0.1.0-dev.2`; `./package-validation` export missing |
| use-cases | Two acts, pointing and a claim of agreement | The landed one-act design: a `note` with references |
| use-cases | Sequenced "first slices have landed" | The `late` form and the archive binding landed; the level is not built |
| architecture, ten-terms | Eight kinds of input | Nine |
| tutorials | "the next release renames `founded`" | The published release names it `founded`; the source names it `created` |

Every page's status footer was stale, and five footer forms were in use.
The limits that tests enforce (MCP schemas and inventory, the settings
lookup, the entry-point tables, the lane reference) were all current.

### Duplication and contradictions

The four answers to an act were explained in four places. The turn was
explained in three. The composition classes, the guard forms, the read
session limits, application trust, health and wiring, the register pin
and the hosted MCP settings each appeared in two to four pages, and the
copies disagreed on the register pin, the platform definition count, the
capacity dimensions and the answer count. "View" had three meanings
(private views, package views, a view as a note) and "card" two (a
catalogue entry, an MCP view).

### Mode and structure

The write-an-application page called itself a reference and was a how-to.
The MCP page was a how-to, a generated reference, an operations runbook
and a budgets reference in one file of 18,000 words. The deploy page was
mostly the planner's rollout record for three hosted Workers. The testing
and SDK pages serve contributors to dap, not adopters, and sat under
"Operating guides". The scopes page followed the contract package only in
part and held deployment configuration (Browser Start) and planner
instructions.

## 2. Decisions

- **Rebuild the index around the journey.** Start here, Build an
  application, Understand the framework, The room application, Other
  applications, Run a service, Security references, Contribute to dap.
  One tagline, the repository README's.
- **Move no file.** Three reviewers proposed moving the room-specific
  pages (lanes reference, pages, demo, entry points) beside
  `apps/room/docs`. Those pages have 16 to 31 inbound links from outside
  `docs/`, and two of them are written or checked by scripts that name
  the path. The index groups them under the room instead.
- **Keep the MCP page as one file.** Six tests read it by path and by
  section heading. The page keeps its order, the how-to first, and loses
  its process paragraphs.
- **Leave test-enforced regions untouched.** The lane reference is
  generated. The MCP tool entries, the W1 inventory and the two recipes,
  the settings lookup and inventory, and the entry-point route tables are
  what tests check. Prose around them changed.
- **One footer form.** "## Source. Checked against main `5dc9765f` on
  30 October 2026. Sources: ..." and, where true, one sentence that the
  page's commands were not run for this revision. Tutorials keep the date
  and versions of the run that produced their output blocks.
- **Relocate, do not delete.** Status and evidence text that is recorded
  nowhere else moved to
  [one implementation note](../implementation/2026-10-30-docs-relocated-text.md),
  one section per source page, unchanged.
- **One name per thing.** Intent, receipt, takes effect, enrollment. The
  word "admission" stays only as a code identifier in code font.
- **Dependency names stay in instructions.** The Mac and local setup
  pages name celld, Caddy, SeaweedFS and Homebrew because the reader
  installs them. The house rule against product names is for presentation
  material; the owner may rule otherwise.

## 3. What changed, by page

Word counts are `wc -w` at main `5dc9765f` and at this head. The pages
under `docs/` went from 126,288 words to 118,575 across the 31 pages that
changed. The lane reference, which a script generates, and the 42-word
`lanes.md` redirect did not change.

| Page | Before | After | What changed |
|---|---|---|---|
| `README.md` (index) | 1,130 | 1,376 | Rebuilt around the journey. Every page is linked. One tagline. |
| `what-is-dap.md` | 1,208 | 1,273 | Says what to build and where to start. The library publication fact. |
| `architecture.md` | 3,758 | 2,523 | The second half (census limits, container runner, cohort versions, carrier bookkeeping) moved to the relocated-text note. Nine inputs. |
| `manual/record.md` | 778 | 767 | Hedges against project history removed. |
| `manual/life-of-an-act.md` | 956 | 908 | Same. The four answers are explained once, with links. |
| `manual/ten-terms.md` | 1,280 | 1,264 | Nine inputs. Cohort list. |
| `write-an-application.md` | 3,518 | 3,228 | A how-to. The published-release subsection and the P1 sentence moved out. "Package several definitions". |
| `build-a-counter.md` | 2,212 | 2,248 | Footer. |
| `build-a-lending-library.md` | 2,542 | 2,578 | The `founded` and `created` names stated as they are. Footer. |
| `run-your-app.md` | 1,313 | 1,333 | Dates in place of "when deployments resume". The cohort list. `REGISTER_SCOPE`. |
| `cli.md` | 7,782 | 7,986 | `--host` required, with `none`. Six families. `new`, `check`, `dev`, `pack`, `mcp` and `scope-index` added. Check logs and future-task paragraphs moved out. |
| `pages.md` | 2,309 | 1,992 | Shared site tokens. `dap create` prints `Created`. Three refusals added. |
| `operations.md` | 1,997 | 2,169 | Retitled "Observe a deployment". Health body of five fields and the `503` condition. |
| `usage-report.md` | 1,356 | 1,237 | Process text removed. |
| `demo.md` | 2,174 | 1,976 | The dead deploy link removed. `DAP_HOME`. |
| `mcp.md` | 18,288 | 18,180 | Eighteen generic tools and the hosted omissions. Process paragraphs and IDs removed. "Hosted endpoint settings". The tool entries, inventory and recipes unchanged. |
| `self-host.md` | 2,988 | 2,525 | Retitled "Run your own service". Step 3 covers the four Durable Object bindings, three migrations, R2 and Analytics Engine. `REGISTER_SCOPE`. `dap create`. Cleanup deletes four classes. |
| `deploy.md` | 4,404 | 1,822 | The operator how-to only. The rollout record moved out. Browser Start configuration moved in from `scopes.md`. |
| `hosts.md` | 1,648 | 1,915 | `--host none`. The namespace is per deployment. The `GITHUB_APP_CONFIG` field table moved in from `deploy.md`. |
| `celld.md` | 514 | 560 | IDs and commentary removed. |
| `security/settings.md` | 4,611 | 4,626 | Prose only. The lookup and inventory unchanged. |
| `security/trust-boundaries.md` | 1,414 | 1,533 | `dap-celld-local`, the `REGISTER_SCOPE` pins and `APPLICATION_TRUST` on dap-demo. |
| `scopes.md` | 10,699 | 9,624 | Follows the contract files in order. Twelve packages, seven platform definitions, 80 catalog versions, nine inputs, five answers, five capacity dimensions. The floor input described. Browser Start, the witness history, the version table and the delivery boundaries moved out. |
| `kernel.md` | 4,500 | 2,670 | Opening status, rulings, resolver detail and corpus counts moved out. Promise 3 and K9 corrected. Symbol names in place of line numbers. |
| `security/entry-points.md` | 12,098 | 12,046 | The preamble halved. Route notes after the tables. The tables unchanged. "Enrollment" only. |
| `security/definition-authors.md` | 2,034 | 1,610 | The `platform:` row names `shape`. The guard list and witnesses link out. |
| `use-cases.md` | 11,398 | 11,502 | The one-act `note` design. The Sequenced status. A frame that says what the cases are for. |
| `roadmap.md` | 4,060 | 4,216 | Self-hosting, the journal floor, `hold@2` and evidence rules rows corrected. The "What runs" reference removed. |
| `testing.md` | 7,957 | 8,110 | Eight-package SDK. The Node range for the gate. |
| `public-sdk-release.md` | 3,227 | 1,888 | Version facts. Closure checks and repair logs moved out. |
| `application-views.md` | 2,135 | 2,890 | Linked from the index. Ranges written in words. |

Outside `docs/`: five anchors in `apps/room/docs/ledger.md` now point at
`#source`, the repository README names "Run your own service", and one
link in the hosted MCP design note follows the renamed heading. The
removed text, 16,862 words, is in
[the relocated-text note](../implementation/2026-10-30-docs-relocated-text.md).

## 4. What this head leaves open

- The self-host guide has not been re-run since the Worker gained its
  R2 binding and the scope index. Its steps now describe the current
  configuration; a timed run would confirm them.
- The lane reference's provenance line ("revision 14 at `4b3bf5da`") is a
  hand-set constant in `apps/room/lanes/src/digests.ts`. Changing it is a
  code change for the lane package.
- `docs/lanes.md` stays as a 42-word redirect because the generator
  writes a link to it. Retiring it means changing the generator.
- The MCP page would read better as four pages. The split needs the six
  tests that read it changed in the same head.
- The entry-points route tables are repeated four times, once per Worker.
  Collapsing them needs the bijection test changed.
- The Browser Start page on dap-demo has no live witness yet (its request
  is open). The pages say what is configured, not that it was seen.
- The roadmap's paragraph on the dap-spike's boundary rule could name its
  lineage (the actor model's locality, Helland's entities, the aggregate
  rules of domain-driven design) and its two limits (it does not choose
  the owner; there is no joint act). That is a separate decision.

## 5. Checks run

Run from the worktree at this head on 30 October 2026, each once.

- `node scripts/check-doc-links.mjs`: 951 local links checked, 0 broken.
- A scratch resolver over every relative link and anchor under `docs/`:
  826 links. It does not parse `<a id>` anchors. The two it reported,
  `scopes.md#composition` and `kernel.md#k1`, exist as such anchors, and
  the repository checker accepts them.
- Vitest, the six MCP test files that read `docs/mcp.md` (`describe`,
  `inventory`, `recipes.scope`, `counter.scope`, `lending.scope`,
  `hosted.scope`): 39 tests passed.
- `node scripts/security-settings.test.mjs`: 3 of 3 passed.
- `node scripts/security-entry-points.test.mjs`: 10 of 10 passed.
- `apps/room/lanes/test/definitions.test.ts`: 4 of 4 passed. The lane
  reference did not change.
- `node scripts/check-kernel-boundary.mjs`: 126 production sources,
  0 refusals. The approved-libraries table in `kernel.md` is what it reads.
- A scan of every prose line under `docs/`, outside tables and code,
  for semicolons joining clauses, dashes, "admission" for an act, process
  roles and bare hashes: none remain. "Admission" appears only in code
  paths, and "checker" only as the product noun.
- One probe with Node: a platform mark in a declared definition's
  effects is refused with code `shape` at the mark's path, as the
  definition-author table says.
- The gate ran at the committed head. The review request names its
  result.

Not run for this revision: the commands on the self-host, deploy, local
Worker, run-your-app (steps 3 to 8) and demo pages. Each of those pages
says so in its footer.
