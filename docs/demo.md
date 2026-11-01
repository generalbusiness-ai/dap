# Rehearse the demo

The demo runner plays the middle of the
[demo script](../notes/reports/2026-10-07-demo-script-draft.md) against
a deployment. It acts as three people, each with a fresh config
directory on one machine, and writes down what each command printed. The
captures script then takes pictures of the room's page. Run both the
evening before a recording, and again on the morning of it.

## What the runner does

`scripts/demo-run.ts` runs 27 shots in order by default. Each ordinary
shot is one command line, run through the CLI with that person's config
directory, or one read of `git log` or a page. The concurrency shot
records each of its commands and exits. The people are the creator
`@hugh`, a member `@una` and a maintainer `@paul`.

| Shots | What happens | Script shot |
|---|---|---|
| 1 to 3 | The creator plans the install, the operator pins the register, and the creator installs as planned and creates a room | 3 |
| 4 to 6 | The creator publishes the rules (no approval for the source extent, the controller for the rules extent) and activates the demo profile's issue and change definitions | the checklist of section 6 |
| 7 to 10 | The creator invites the member and the maintainer, and each joins | 4, 5 |
| 11, 12 | The member clones with a read token from the room and reads `git log --oneline` | 6 |
| 13 to 15 | The member opens issue #1, the maintainer comments, and the creator assigns it to the maintainer | 8 |
| 16 | The maintainer edits `guide/start.md` with `--closes 1`: published, and the issue closes | 8 |
| 17 to 19 | The maintainer proposes `AGENTS.md`, which is refused `rules-not-met:rules`, and the creator approves. Before the merge, the maintainer proposes a second file on the same published base, then publishes `AGENTS.md`. The runner records each command and exit. | 10, 11, concurrency |
| 20 | The maintainer merges the second file and is refused `out-of-date`. The maintainer proposes it again as a new change on the new head and publishes it. The refused lane stays in the record. | concurrency |
| 21 | The maintainer edits `../outside.md` and is refused `path-invalid` | 10 |
| 22, 23 | `dap issues` shows #1 closed, and `dap verify --all` reports fourteen scopes consistent | 8, 12 |
| 24 to 27 | The site's front page, the two published pages, and the room's page at `/page/` | 7, 9, 11 |

Each shot states the exit code and the lines that it expects. An
expected line is a template: `<name>` is any text without a space,
`<...>` is any text, and `{name}` is a value that an earlier line
printed, such as the change's scope ID. A later shot types those values,
so the runner needs no help from the operator after the register
setting.

The runner continues after an ordinary output mismatch while it can. If
a newly captured scope identity is missing or disagrees with its saved
config, it stops the later commands and hooks. It marks a shot "not run"
when an earlier shot did not print a value that the shot needs.

## How to rehearse a deployment

The runner uses Node 22 or later with the `tsx` loader that the CLI
workspace declares. The runner installs no package.

```sh
node --import tsx --no-warnings scripts/demo-run.ts \
	https://<service> --host artifacts --namespace artroom-demo \
	--scratch /tmp/rehearsal-1 --out /tmp/rehearsal-1/out
```

1. Give a new or empty scratch directory. The runner makes `founder`,
   `member` and `maintainer` in it, one config directory each, and `work`,
   which holds the local files and the member's clone.
2. After shot 1, the runner prints the planned register ID and waits. Set
   `REGISTER_SCOPE` to that ID in the Worker's settings. Set the host
   setting's `registerScope` to the same ID: `ARTIFACTS_CONFIG` for
   `--host artifacts`, or `GITHUB_APP_CONFIG` for `--host github.com`.
   Keep the other setting fields and secrets, including `DEPLOYMENT`.
   [The order](deploy.md#the-order) in the deploy guide describes this
   step. Then press Enter. The plan can be created for 14 minutes. The
   runner records your Enter as a confirmation and does not inspect the
   deployment's settings.
3. The runner prints each shot as it ends, with "matches" or what
   differs.
4. It writes `transcript.md` and `room.json` in the output directory. It
   exits 0 when every shot matches, and 1 otherwise.

For GitHub, run the same shots:

```sh
node --import tsx --no-warnings scripts/demo-run.ts \
	https://<service> --host github.com --namespace generalbusiness-ai \
	--scratch /tmp/rehearsal-github-1 --out /tmp/rehearsal-github-1/out
```

Arrange the pin step with the deployment operator before you start. The
App installation must cover the new repository, and the creation
credential must be current. The GitHub run asks for all 27 shots,
including the member's one-hour read token, the clone, the publications
and the site reads. A missing setting, an expired credential or an
unexpected provider answer is a mismatch to investigate. The run creates
a repository and keeps it. The runner deletes no repository and revokes
no credential afterwards.

`--setting-set` skips the pause only. Shot 1 still makes a fresh signed
plan and prints its register ID. The flag neither uses an earlier plan
nor checks that the register is pinned. Use the pause for the GitHub
run.

`--name <room>` names the room. The default is `rehearsal-` followed by
the month, day, hour and minute. The runner prints no secret. It cuts an
invitation link to its first eight letters on screen and in the
transcript, `dap clone` never prints the read token, and keys appear by
their key IDs only. The keys stay in the config directories, readable
only by their owners.

## What the concurrency shots show

Two changes are proposed on the same published base. The first
publishes. The second is refused `out-of-date`, and its lane stays in
the journal. The room settles the race by reservation and judgment at
the destination. Both changes target the destination's one repository,
and only the first is published on that base. A fork for each hold is
not built ([Configure a Git host](hosts.md)).

The result's `staleRefusal` field and the transcript give the runner's
elapsed time, in milliseconds, from the stale merge command to its
`out-of-date` refusal. The runner measures it with `performance.now()`
and labels the date, service and Git host. The time includes CLI work
and round trips, so it is not server latency.

## Propose a committed two-file branch

Add `--manifest` to add five shots after shot 16. The creator activates
the current demo definition with a manifest list. In the member's clone,
the runner pulls the room's head, creates the branch `two-pages`, writes
two UTF-8 Markdown files and commits them with Git. It records these Git
commands and their output. The maintainer runs `dap propose two-pages`
in the same clone and proposes both committed files as one change, which
is published. dap writes its own integration commit. The local commit
only prepares the source.

The next preparation checks out `main` and pulls again, which brings the
room's integration commit. Then it creates `two-controlled` with
`AGENTS.md` and a second text file. The maintainer's proposal must be
refused `rules-not-met:rules`, with neither file published. The later
shots use the manifest-list definition, and the later explicit merge
prints its publication line without the page line.

The run with `--manifest` has 32 shots and verifies 16 scopes. The
default run keeps 27 shots and 14 scopes. The runner uses Git in the
member's `site` clone.

## Record the demo

Add `--pace` to either command above. Before each runnable shot, the
runner prints its number, title, script shot, person and the command
that it will run, then waits for Enter. Narrate the shot, and press
Enter when the recorder is ready. Invitation links stay cut on screen.
The register-setting pause after shot 1 still applies. Finish pinning
and installing before the plan's printed expiry. `--manifest --pace`
also waits before the preparation steps.

The transcript keeps its format, and the pause before a shot is outside
that shot's duration. At the end, the terminal prints the total elapsed
seconds, which include operator waits, setup and capture observations.
It prints the sum of the recorded shot seconds separately. The sum is not
the elapsed time of the whole run.

## What the transcript shows

For each shot, the transcript shows its number and title, the script shot
that it shows, who ran it, when it started, the seconds it took, the
command as typed, every line it printed, the exit code, and whether the
lines match. Below the shots, one table lists shot, expected, observed
and match. A recording uses the observed lines. Do not record a shot
whose row says "no" until you understand it.

## Take the pictures

`scripts/demo-captures.ts` opens the page at `<base-url>/page/` in a
headless browser, signed in with a key from a config directory. It saves
six pictures, each at most 300 kB: `room.png`, `issue.png`,
`change-refused.png` (the `../outside.md` change),
`change-published.png` (the `guide/start.md` change), `rules.png`, and
`site-page.png` (the page as the site renders it). It also writes
`captures.md`, which lists them.

```sh
PLAYWRIGHT_CORE=<scratch directory> node --import tsx --no-warnings \
	scripts/demo-captures.ts https://<service> --home /tmp/rehearsal-1/founder \
	--room /tmp/rehearsal-1/out/room.json --out /tmp/rehearsal-1/out
```

The captures need the `capture-observations.json` that a successful run
of the current runner writes in the person's config directory. Before
the script loads the key, it checks that the service and room match the
full references and creation facts in that file. It refuses old room
files, a changed config or a config directory without those
observations. The pictures show the screens. The native receipts remain
the record of publication and closure.

The browser automation package `playwright-core` is not a dependency of
this repository. Install it in a scratch directory outside the checkout,
and name that directory in `PLAYWRIGHT_CORE`. The browser is the one in
`CHROMIUM`, or the one under `PLAYWRIGHT_BROWSERS_PATH` (default
`/opt/pw-browsers`). Without either, the script says that it skipped and
makes no picture.

With `--recorded` in place of the base URL, `--home` and `--room`, the
script runs the rehearsal on the test Worker (`DEMO_RECORD=1`, see
below). It answers the browser with the Worker's recorded answers, as
`apps/room/page/test/screens.mjs` does for the page's own screenshots.

## The order on the recording day

1. The evening before, deploy. Then run the runner on a fresh scratch
   directory, and the captures on its room. Copy the observed lines into
   the script where they differ, and keep the transcript with the take.
2. In the morning, check the setting values and the deployed version
   (section 6 of the script). Then run the runner once more. Every row of
   its table must say "yes" before the camera starts.
3. For each take, use fresh config directories (`DAP_HOME`) on both
   screens and a new room. The takes type the commands of the transcript
   in the same order. The runner's room is not used on camera.
4. After the take, run `dap verify --all` on the take's room. The
   captures need a config directory with the runner's observations, so
   they cannot run on a take's config directory.

## In the tests

`apps/room/lanes/test/demo.scope.test.ts` runs the same rehearsal on the
test Worker, on real scopes. It asserts that every row of the table says
"yes" and that the transcript holds no secret. It covers both host paths
through their production wiring. Its stand-ins are the Git host (`OwnGit`
or GitHub's `Hub`), `git` and the scheduler. The test wires the stand-in
host to the planned register in place of the operator's setting. The
recorder in the file serves `demo-captures.ts --recorded`. It runs only
with `DEMO_RECORD=1` and is skipped by name otherwise.

## Source

Checked against main `5dc9765f` on 30 October 2026. Sources: [demo-run.ts](../scripts/demo-run.ts), [rehearse.ts](../scripts/demo/rehearse.ts), [demo-captures.ts](../scripts/demo-captures.ts), [demo.scope.test.ts](../apps/room/lanes/test/demo.scope.test.ts). The commands on this page were not run for this revision.
The story was rehearsed against a deployment on 12 October 2026, and the
runner has changed since then. The commands on this page were not run for
this revision.
