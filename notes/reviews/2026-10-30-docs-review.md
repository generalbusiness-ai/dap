# Documentation review, 30 October 2026

Status: the review pass and the writing pass are complete at this head,
which answers the first review (section 6). The review read every page
under `docs/` at main `5dc9765f`: 33 pages, about 165,000 words. The writing
pass edited the pages on one branch. The head merges main `c8c7b631`.

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
| mcp | Fourteen generic tools | Eighteen at `5dc9765f`, of which the hosted endpoint omits eight by default. Nineteen at `c8c7b631`, with `commons` |
| pages | Each read mints and revokes a token; `dap claim` prints "Claimed" | Site tokens are shared and reused; `dap create` prints "Created" |
| pages | Refusal table | Lacks `no-repository`, `rate-limited`, `unavailable` |
| operations | Health body has four fields; 200 on two conditions | Five fields including `wiring`; a configured host whose wiring is off gives 503 |
| demo | Link to a deploy.md "Plan" section; `ARTROOM_HOME` | No such section; `DAP_HOME` |
| trust-boundaries | No `dap-celld-local`; no `REGISTER_SCOPE`; no `APPLICATION_TRUST` on dap-demo | All three present in the configuration files |
| testing | Six-package SDK | Eight packages |
| public-sdk-release | All packages at `0.1.0-dev.2` | Sources at `0.1.0-dev.1`; the producer stamps `0.1.0-dev.2`; the npm release has no `./package-validation` export |
| use-cases | Two acts, pointing and a claim of agreement | The landed one-act design: a `note` with references |
| use-cases | Sequenced "first slices have landed" | The `late` form and the archive binding landed; the level is not built |
| architecture, ten-terms | Eight kinds of input | Nine |
| tutorials | "the next release renames `founded`" | The published release names it `founded`; the source names it `created` |
| run-your-app (found in review) | Step 3 runs `--cohort application` on a Worker from the self-host guide | The default policy refuses those pins; the Worker needs `PLATFORM_CREATION_PINS` |
| life-of-an-act, what-is-dap, architecture, index (found in review) | No act gets `archived`; four answers | A repeated intent below the floor gets `archived`; five answers |
| write-an-application (found in review) | `validatePackage` from `dap-derive` | `dap-platform/package-validation`, not yet in the npm release |
| what-is-dap (found in review) | No hosted sign-up | `dap-demo` configures Browser Start |
| roadmap (found in review) | A room installs a trusted package | Device cohorts install `device-command@1` packages; no current cohort installs ordinary packages in a new room |
| public-sdk-release (found in review) | "Published exports" | The column is the plan; npm at `0.1.0-dev.2` serves less |

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
- **One footer form.** "## Source. Checked against main `<commit>` on
  30 October 2026. Sources: ..." and, where true, one sentence that the
  page's commands were not run for this revision. Tutorials keep the date
  and versions of the run that produced their output blocks. The commit is
  `c8c7b631` on the pages that main changed after the first pass and the
  pages that state its facts (index, cli, deploy, kernel, mcp, roadmap,
  scopes, settings, trust boundaries, entry points, use cases). It is
  `5dc9765f` on the others. The generated lane reference and the `lanes.md`
  redirect have no footer.
- **Relocate, do not delete.** Status and evidence text that is recorded
  nowhere else moved to
  [one implementation note](../implementation/2026-10-30-docs-relocated-text.md),
  one section per source page, unchanged.
- **One name per thing.** Intent, receipt, takes effect, enrollment. The
  word "admission" stays only as a code identifier in code font.
- **Product names stay.** The owner ruled on 30 October 2026 that public
  material has no limit on vendor or product names. The Mac and local setup
  pages name their dependencies, and the use cases keep "Codex CLI sessions".
- **Rules stay with the reader.** A rule that a person relies on stays on a
  reader page, even when it names a process step. The relocated-text note
  is history. Its size is expected to raise the 40,960-byte warning in the
  gate's `notes` step, because it stays one file.

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
- `self-host.md` and `celld.md` say Node 26, and the root `package.json`
  allows 22 or later. Nobody has run these guides on 22, so the pages keep
  the version named at the first run.
- `deploy.md` keeps reference tables inside a how-to.
- Other heads in flight edit `kernel.md`, `scopes.md`, `mcp.md` and
  `deploy.md`. Whichever lands second merges by hand.
- The roadmap's paragraph on the dap-spike's boundary rule could name its
  lineage (the actor model's locality, Helland's entities, the aggregate
  rules of domain-driven design) and its two limits (it does not choose
  the owner; there is no joint act). That is a separate decision.

## 5. Checks run

Each check ran once from the worktree at checkpoint commit
`d10d153078cd2a7c42c0a2bc0304ecfc0b19141f` (tree `8ca875e2`) on 30 October
2026. The final head adds the evidence manifest and this table and changes
no page. Raw output is in the read-only folder
`/Users/hughpyle/play/artroom-evidence/2026-10-30-docs-review/`, with a
`SHA256SUMS` file and the gate's own 29 log files under `gate-logs/`. The
head commits
[the manifest](../implementation/evidence/2026-10-30-docs-review.manifest.json),
which lists each file's bytes and digest.

What the logs show. The gate passed. The link checker resolved 951 local
links with none broken. The section-citation check found none broken. The
six MCP test files passed 39 tests. The settings test passed 3 of 3, the
entry-point test 10 of 10, and the lane reference test 4 of 4; the lane
reference did not change. The kernel boundary check read 126 production
sources with 0 refusals. The residue scan of every prose line under
`docs/`, outside tables and code, found no semicolon joining clauses, no
dash, no "admission" for an act and no bare hash; its log lists the lines
where "admission" is a code path and "checker" is the product noun. The
scratch resolver checked 826 links and anchors; the two `<a id>` anchors
it does not parse, `scopes.md#composition` and `kernel.md#k1`, exist. The
probe refused a platform mark in a declared definition's effects with code
`shape` at `acts.establish.effects.2`, as the definition-author table says.

| Check | Command | Exit | Output SHA-256 |
|---|---|---|---|
| gate | `npm run gate` | 0 | `f6d5dc6a3bec2fad59555a53a299f93f8f123ce8d57be8cdba06dfe7d4cafc42` |
| documentation links | `node scripts/check-doc-links.mjs` | 0 | `777cc4b59d48da8ef84a768d94fce263aaf35f285fb6edd8942f28a5b719ad7d` |
| section citations | `node scripts/check-section-citations.mjs` | 0 | `8735a91c6eb2aca3b9d4dd0edc0d05520d64453d8dd8692283986563253cff27` |
| commit messages | `node scripts/check-commit-messages.mjs origin/main HEAD` | 0 | `b4c2ce0b98997179c70461f42789c754b31ad0cd6cb06b877ea698065669be73` |
| MCP page tests | `npx vitest run` on the six `packages/mcp/test` files that read `docs/mcp.md` | 0 | `47d8ad77b9c61b830b28fcd3db609e328f26d9ef0386b9165f0653a130de8b06` |
| settings lookup and inventory | `node scripts/security-settings.test.mjs` | 0 | `8a52e2221b6735022cd3b3325ed62a68e221edc3c9586b559597e780fd38d82e` |
| entry-point tables | `node scripts/security-entry-points.test.mjs` | 0 | `e0363672671b55023ce9b9fd7cfdaad6b026bb062581db7e0e0af7167bfc17e0` |
| lane reference | `npx vitest run apps/room/lanes/test/definitions.test.ts` | 0 | `74934135e4605dbe56507a76a63f6ce458dd3cef65302106324a5cc8238015f6` |
| kernel boundary | `node scripts/check-kernel-boundary.mjs` | 0 | `f7ae5d7815f1e7c2c379c5ea1db70b7da25590e4b3570216f4cc07a8fc871298` |
| prose residue scan | `python3 -I residue.py .` (script in the folder) | 0 | `9c1febee2ff92fe9903746e7a597b51c50a7bec33a3a26810540c3b220257333` |
| link and anchor resolver | `python3 -I linkcheck.py .` (script in the folder) | 0 | `7c6c603156f94058b1bee1245e0ef6dc8361aa335c4df1a78e304503d93b5cf7` |
| platform mark probe | `node markprobe.mjs` (script in the folder) | 0 | `233aef7670a3c2f50e3084986b9d1b6478e002cafaa44e610a9d63f9aa55412f` |

Not run for this revision: the commands on the self-host, deploy, local
Worker, run-your-app (steps 3 to 8) and demo pages. Each of those pages
says so in its footer.

## 6. Answer to the first review

The first review of head `4436d508` requested changes. This head answers
each item.

| Item | Answer |
|---|---|
| 1 `run-your-app` stops at step 3 | Step 3 sets `PLATFORM_CREATION_PINS` and deploys again |
| 2 The answers | Five answers on every page. `archived` is a row in the life of an act |
| 3 `validatePackage` import | Names `dap-platform/package-validation` and says that npm lacks it |
| 4 Two contradictions | `what-is-dap` names Browser Start. `roadmap` names device cohorts |
| 5 SDK export column | "Planned exports", with what npm serves, read with `npm view` |
| 6 Record's own rows | Corrected in section 1 |
| 7 Kernel filing gate | The head duty and the closed list of findings are restored |
| 8 Evidence rule's scope | The filing-date sentence is restored |
| 9 Deploy from reviewed source | Stated at the top of `deploy.md`, with the `--var` review |
| 10 Rollout rules | New section, "Roll out new creation versions", linked from settings |
| 11 Duties that became options | The bearer renewal and cleanup claim duties, the two `scopes` sentences and the SDK sentence are restored |
| 12 Citations | `lanes.md` follows the new headings. `deploy.md` holds the 8 November date. Kernel section 7 holds revision 21 |
| 13 Index footer | Added. Section 2 names the two exempt pages |
| 14 Form | `claim` is `create`, `cohort` is the one name, and the slice names left the roadmap. "Codex CLI sessions" stays under the owner's ruling |

The merge of main adds the Commons facts: the `commons` kind, cohort, tool
and Worker, 85 catalog versions and eight platform definitions. Kernel
section 7.3 holds the Commons rules without the request IDs, and the
relocated-text note keeps the text as landed. The open points of the review
are in section 4, or are done: section 7 links the relocated note, the run
history in `self-host.md` and `demo.md` moved to the footers, the "not run"
wording is one sentence, `what-is-dap.md` lost its imperative section, the
first admin replaces "owner" in `self-host.md`, and `hosts.md` says that
site reads reuse a token.

