# Plan 036: deploy the identifier cutover to the hosted Workers

Status: proposed. Nothing in this plan has run. The window runs after the
checker approves this note and CDF-1 is on main.

Planned against main `4cef11d2783efaa591fac197d9a2ba093004456e` on
2026-11-14. The planner runs each step. The builder deploys nothing.

## Outcome

Three hosted Workers run main with a new register of the `base` family:
`dap-lending`, `dap-grow` and `dap-demo`. The sandbox Worker runs main.
Each room that the old format wrote is retired, and its links answer 404.
Hugh chose that retirement on 2026-11-09. The last commit that reads an old
room is `64112e4576b4c3c8fb668389786deb6b703da417`
(`packages/bytes/src/retired-room.ts`).

The plan has two parts. The window puts the three Workers on main. The
heads after the window return the tracked files, the application releases
and the rooms.

## Three facts decide the shape

1. **A plan lives 840 seconds.** `dap install --plan` signs a plan for the
   intent lifetime less 60 s (`packages/cli/src/command-install.ts`). The
   Worker accepts that install only for the register that `REGISTER_SCOPE`
   names. So the plan, the deployment and the install of one Worker fall
   in one window of 14 minutes.
2. **`scripts/deploy.mjs` takes no override.** It deploys the tracked file
   only. A tracked value changes in a reviewed head, and no head lands in
   14 minutes. `docs/deploy.md` allows a direct Wrangler deployment with
   reviewed `--var` overrides. The checker's approval of this note is
   that review.
3. **No Durable Object migration.** Between `64112e45` and main, the
   `migrations` block of each tracked file is the same. `wrangler rollback`
   to the old version of a Worker works until a new room holds acts.

A register of policy `keys` adds one rule: `dap create` follows the
install in 900 seconds. After that time the operator's key no longer reads
the register summary, and the register cannot found its first room.

## Scope of the window

| Worker | Runs today | In the window | Register policy | First room |
|---|---|---|---|---|
| `dap-lending` | `9222c395` of `64112e45` | Yes, first | `keys` | `lending-library` |
| `dap-grow` | `4ad0a629` of `64112e45` | Yes, second | `keys` | `grow-demo` |
| `dap-demo` | `cb0dff4c` of `64112e45` | Yes, third | `open` | None in the window |
| `dap-application-sandbox` | `02affc3d` of `a76764a7` | Yes, last, with `deploy.mjs` | None | None |
| `artroom-scope` | `cf086a04` of `64112e45` | No | | |
| `dap-connect` | `07e2ec68` of `7135dc39` | No | | |

`artroom-scope` serves no new room, and its tracked file holds no register
setting. It keeps its version until Hugh decides whether the Worker is
deleted. A deletion removes each journal that the Worker holds.

`dap-connect` runs `7135dc39` from an untracked file. It gets its own
window after a head tracks its configuration, at the time of the O4
acceptance.

## Preconditions

The planner checks each line before the START act.

1. CDF-1 is on main. `MAIN_SHA` is the commit of `origin/main`.
2. `git diff --stat 64112e45 $MAIN_SHA -- package-lock.json` prints
   nothing. Otherwise the deploy worktree runs `npm ci --ignore-scripts`.
3. The room inventory is refreshed with the old CLI, and the retirement
   act names each room and the reader commit.
4. The builder has answered what the archive driver of the Grow Worker
   does when `GROW_ARCHIVE_CONFIG` names a retired directory, and the
   planner has ruled on that answer.
5. The deploy worktree is clean and detached at `MAIN_SHA`.
6. No gate runs, and the builder starts none before the END act.
7. The machine is on AC power with power mode 0.
8. Each operator home under the new private root is empty, and the root
   has mode 0700. `ARTROOM_HOME` and `WRANGLER_CI_OVERRIDE_NAME` are unset.
9. `wrangler whoami` names the project's account.
10. The planner has opened no Site page of an old room in the last three
    minutes. A Site read token lives 120 s
    (`packages/scope/src/artifacts-host.ts`).

## The window

Names in the commands:

```sh
WT=~/play/artroom-worktrees/planner-demo-register-20261105
RECEIPTS=~/play/artroom-evidence/deploy-receipts
CUT=~/.config/artroom/cutover-20261114
SCR="$CUT/wrangler-scratch"
DAP="node $WT/packages/cli/bin/dap.js"
```

### Step 1. Build and compare, with no upload

Run `node scripts/deploy.mjs grow lending demo sandbox --dry-run` in `$WT`
with the four previous receipts. The `head` line equals `MAIN_SHA`, and no
line asks for `--accept-migration`. A migration request ends the plan.

Then run each `wrangler deploy` command of steps 3 to 5 one time with
`--dry-run` and a specimen scope ID. The binding table that Wrangler
prints must show each overridden value whole, with its JSON quotes. This
check answers whether `--var` carries a JSON value with colons and escaped
quotes. When Wrangler prints no table on a dry run, Lending is the check:
`wrangler versions view <id> --json` shows its bindings before the install.

### Step 2. Record the health of each Worker

Read `/health` of the three room Workers with a browser `User-Agent`.
Each answers 200 with `"register":"ready"` and the version in the table
above. Another version ends the plan until its author is known.

### Steps 3 to 5. One Worker at a time

Each Worker takes the same five commands. The planner starts a Worker
only when the five commands are ready to paste.

```sh
export DAP_HOME=$CUT/<name>/operator
$DAP install --plan <origin> --host artifacts --namespace <namespace> \
  <policy flag>
REG=<plan.register of $DAP_HOME/config.json>
cd $SCR && npx -y wrangler@4.147.0 deploy --keep-vars \
  --config "$WT/apps/room/wrangler.<name>.jsonc" \
  --var "REGISTER_SCOPE:$REG" \
  --var "ARTIFACTS_CONFIG:<the tracked value with registerScope $REG>" \
  <the demo list, for dap-demo only>
$DAP install --planned
$DAP create <room> --handle <handle>
cd $WT && node scripts/deploy-smoke.mjs <name> --url <origin>
```

| | `dap-lending` | `dap-grow` | `dap-demo` |
|---|---|---|---|
| Namespace | `dap-lending` | `artroom-demo` | `dap-demo` |
| Policy flag | None | None | `--register-policy open` |
| Extra `--var` | None | None | `INSTALLED_REGISTER_SCOPES:["$REG"]` |
| `dap create` | `lending-library`, `@library-operator` | `grow-demo`, `@grow-operator` | Not in the window |

These are the only overrides: `REGISTER_SCOPE`, the `registerScope` field
of `ARTIFACTS_CONFIG`, and the demo list. Each other field of
`ARTIFACTS_CONFIG` keeps the tracked value. No command sets
`SCOPE_INDEX_MODE`, `DEMO_START_CONFIG`, a trust row or a secret.

What each command must answer:

- The plan prints `Planned: register sc_…, under platform:register@28`.
- The deployment prints `Current Version ID`. `/health` then names that
  version and answers 503 until the install.
- The install prints `Installed: register …, as planned.`
- `dap create` prints the four scopes of the room, each created and
  confirmed, with Directory 27, Membership 14, Rules 15 and
  Destination 21.
- The smoke prints `"pass":true`. The demo offer answers 404 until head A.
- A link to an old room of that Worker answers 404.

Lending goes first. It has no visitor, and it shows that the sequence
works, that an empty index admits the first install, and that `--var`
carries the values. A fault on Lending or Grow stops the plan before
`dap-demo`, which then keeps its old rooms.

On Grow, `APPLICATION_SCREEN_HOSTS`, `GROW_ARCHIVE_CONFIG` and
`APPLICATION_TRUST` keep their old values in the window.

On `dap-demo`, the Worker answers "not ready" from the deployment until
the install returns. The planner pastes the three commands as one block.
Browser Start stays off until head A.

### Step 6. The sandbox

`node scripts/deploy.mjs sandbox` with the previous receipt, then
`deploy-smoke.mjs sandbox` with the new Grow directory as `--room`.

### Step 7. Close the window

Read `/health` of each Worker again. The END act holds each version ID,
each register scope and genesis, the outputs of the plan, the install and
the creation, and the `DEPLOYMENT` value of `dap-demo` read from its
deployed version.

After the window, `deploy.mjs` must not run for `grow`, `lending` or
`demo` until head A lands. The tracked files still name the retired
registers, and a deployment of them points each Worker at a retired
register.

## When a step fails

| Fault | Action |
|---|---|
| The deployment fails before `Current Version ID` | The old version still serves. Run the command again while the plan lives |
| `install --planned` answers `plan-expired` with nothing sent | Keep the home. Plan again in a new home, and deploy again with the new register |
| `install --planned` gives no clear answer | Run it again from the same home. Never make a new plan for an install that was sent |
| The install answers not found | Roll that Worker back. The window sets no index mode |
| `dap create` gives up its wait | Run the same command again, without `--again` |
| A binding shows a wrong value | Roll that Worker back |

A rollback is `wrangler rollback <old version>` with the tracked file of
that Worker. A version holds its code and its variables, so the old
register returns with it. Read `/health` after a rollback. A rollback
after a new room holds acts strands that room, so the planner rolls back
only before `dap create` succeeds on that Worker, or after Hugh says so.

## After the window

| Head or step | Holds | Needs |
|---|---|---|
| Head A | The register values of the three tracked files, the `--only` installed list, `DEPLOYMENT` and `DEMO_START_CONFIG` for `dap-demo` | Request CUT-A `50137f0c`, then the script's output for each Worker |
| Deployment with receipts | `deploy.mjs grow lending demo` at head A | Head A on main |
| Release head | New releases of Grow and Lending from canonical sources | Request CUT-R `6063d1b4`, and Hugh's answer on the Grow publisher key |
| Head B | The trust rows, and the content bucket of `dap-lending` | The signed packets, pushed to the public repository |
| The rooms | The Grow room with its agents and Room A, the Lending room, the J5 Site room on `dap-demo` | Head B deployed |
| Head C | `APPLICATION_SCREEN_HOSTS` of Grow and `SCREEN_HOSTS` of the sandbox | The Grow install |
| Archive | `bind-archive` for each new room, and one verification from a clone | AE-1 `0c265d01` on main |

Head A gets the first gate slot after the window. The operator home of
`dap-demo` founds the J5 Site room, as `@rita`.

## Open with Hugh

1. Whether `artroom-scope` is deleted. The planner recommends the
   deletion after the window, because the Worker then holds only retired
   rooms.
2. Where the Grow publisher key is, and whether the new release keeps
   that publisher. A new publisher changes `DEMO_PUBLISHER` and each trust
   row.
3. The route for `dap1.generalbusiness.ai`. No tracked file names the
   host, so the route is one more configuration head.

None of the three holds the window.

## Evidence

The window writes each output under the private root, and the END act
copies the public lines only: version IDs, scope IDs, genesis digests and
answers. No key, plan file or session file leaves the private root. The
long runbook with the full commands and its basis for each claim is at
`~/play/artroom-evidence/2026-11-14-cutover-deployment-prep/`.
