# G3 mini configuration review

This record prepares G3's first nonsecret mini configuration. It copies no
App key, starts no register plan, deploys no project, and closes no real
repository witness. Parent `3c6ec378` keeps that acceptance.

The configuration child is `9a3a705d`. Planner ruling `28287222` supplies
the service user, new private paths, and the procedure that fills the register
ID after review. Ruling `4943c76a` resolves request `29c50395`: it corrects
the prefix, accepts the two H3 effects below, and requires a named rollback.

## Filled App configuration

[github-app.json](2026-11-02-g3-mini-configuration/github-app.json) contains
all production fields. `PLANNED_G3_REGISTER_SCOPE` is its only placeholder.
The production parser rejects that placeholder. After the planner creates
the retained plan, its exact register ID replaces that one value.

The App is Artroom Demo, App ID 5223496, client ID
`Iv23licaFliWCqmW3O3w`, installation 168852986. Its organization is
`generalbusiness-ai`, account ID 285042784, type Organization. These are the
inputs in `3cfac8c2`. A fresh GitHub API read confirms the private witness
repository `generalbusiness-ai/dap-g3-binding-witness-20261102`, ID 1442980126.
This first configuration includes no Destination binding row.

The object allowance is 8 MiB (`8388608`). Private repositories, no public
reads, installation reads, and `adapter-attempt` match the approved App-only
policy. No second static read token forms part of this configuration.
The later reviewed binding row must name the actual Destination incarnation,
this exact repository ID and name, and branch `main`.

The installation covers all 26 organization repositories, as Hugh chose.
The App key can mint tokens for that whole installation. The provider narrows
each installation token to the configured repository ID and the requested
permission. This configuration does not narrow the App installation itself.

## Mini paths and current observations

All new G3 state belongs below `/Users/inguz/dap-host-g3-20261102`, mode 0700.
The planner owns private-key placement after checker approval.

| Purpose | Path |
|---|---|
| Public source export at runtime base `afdd8ee5` | `.../source` |
| Persistent G3 client home | `.../client` |
| Original prepared project | `.../project` |
| Reviewed filled App configuration | `.../github/github-app.json` |
| Private App key, mode 0600, owned by inguz | `.../github/app-key.pk8.pem` |
| First staged GitHub project | `.../github-project` |
| Later staged binding project | `.../binding-project` |
| Existing per-command trust anchor | `/Users/inguz/dap-host-h3-20261029/tls/cert.pem` |

The new `source` directory keeps H3's original source and dependencies intact.
The Node runtime already exists at
`/Users/inguz/dap-validate/bin/node-v26.12.1-darwin-arm64/bin/node`.
The H3 source and this runtime base have the same lockfile SHA-256,
`c835dfee04d7dc8bb946ab08e38d79d54aa2bade3c03d917319a835431014fc6`.
An owned copy of the existing dependency directory can serve the new export
once its workspace package links resolve inside that export. No probe installs
a package in a checkout.

Read-only SSH as inguz found `/Library/dap-host` absent. The actual H3 prefix
is `/Library/dap-host-h3-20261029`, a root-owned directory at mode 0755.
Its installation record names node `h3-mac-20261029`, the fixed fleet bucket,
and the existing loopback listeners. The new G3 root does not yet exist.
Ruling `4943c76a` selects this existing prefix and node. It replaces the
generic `/Library/dap-host` path in `28287222`. No new installation step
runs, and the procedure keeps the existing node and store.

The standard Python TLS check could not use this endpoint certificate as an
anchor. The observed peer certificate matches the supplied certificate's
SHA-256 exactly. The documented Node `NODE_EXTRA_CA_CERTS` path succeeds with
normal TLS and hostname verification: `/health` returns 200, sessions `ok`,
and register `ready`. This Python refusal is no host-readiness failure.

The original H3 client then reads its active Membership8 and Directory20.
Their heads are respectively 21 and 7. The baseline script blocks local
configuration, key, and private-custody writes, and permits only GET requests
and read-session issuance. Its two CLI status commands return 0. One read
session was requested. No content mutation was attempted. The public record
contains status, definition, head, and hashes of CLI lines, with no scope IDs,
keys, sessions, signatures, or room content.

## Effect on the existing H3 room

A deployment to the existing fleet replaces its one active application bundle.
It does not add a second application beside H3. The current source and H3's
maintained template at `7ea9d54e` have identical Worker name
`dap-celld-local`, four Durable Object bindings, and three migrations.
The entry remains the production room Worker.

celld derives each named object from the Worker name, class name, and object
name. Keeping those names addresses the existing objects. Renaming the Worker
would address new empty objects. This is the documented runtime identity rule,
not a new preservation witness. [celld v0.6.3 object identity](https://raw.githubusercontent.com/denoland/celld/v0.6.3/docs/services/durable-objects.md)

The proposed G3 project changes two deployment-wide defaults:

- `REGISTER_SCOPE` selects G3's Register25 for health and new connections.
  H3 loses the default-register position. Its saved client home still names
  its original room and register.
- `prepare-project.mjs` generates a fresh `SESSION_SECRET`. Existing H3 read
  sessions stop verifying. The existing member key can request a new session;
  replacing this secret does not end signed-read authority.

The new bundle retains the old native pins. The creation policy retains the
unpublished family, so H3's existing host-none family stays recognizable.
No H3 home, scope pin, journal, node directory, bucket, or certificate changes
in this procedure. These source facts support continued H3 reads, but the
post-deployment witness is still required. The planner accepts those two
effects in `4943c76a` and requires a stop if either H3 read fails.

[h3-read-baseline.mjs](2026-11-02-g3-mini-configuration/h3-read-baseline.mjs)
records the successful before state. Running the same script after each G3
deployment must again read the same configured H3 room with active Membership8
and Directory20. Health alone does not establish that result. A failed read
keeps the G3 deployment acceptance open and retains all projects and evidence.

## Retained H3 rollback

The original prepared project exists at
`/Users/inguz/dap-host-h3-20261029/project`, owned by inguz, mode 0700.
Read-only validation through the original H3 `deploy.py` accepts that project
and its actual installation record. Its retained esbuild is executable,
and the installed celld answers version 0.6.3, matching pin `v0.6.3`.
The validator never calls deploy or a bucket mutation.

The rollback uses the original H3 helper under its original source, not the
new G3 helper. `prepared_project` binds the entry to its helper's source
path, so the new helper must not validate an old project by relabeling it.
The procedure names the complete original command and requires H3 health and
room reads afterward. No rollback ran during this preparation. Replacing
G3's bundle with H3's original bundle ends G3's active serving configuration;
its private projects and data remain retained, and G3 acceptance stays open.

## Procedure and validation status

[Deploy the reviewed G3 configuration](2026-11-02-g3-mini-configuration/deploy-g3.md)
separates preparation before the plan from the fourteen-minute sequence.
`prepare-github.mjs` compares the filled register with the prepared project's
register. That exact comparison covers the sole value the checker cannot know
before the plan exists.

The pure production parser refuses the placeholder and accepts a synthetic
register substitution with every other field unchanged. The whole maintained
celld template equals H3's template at `7ea9d54e`: name, bindings, migrations,
and settings. The actual H3 baseline above passes through the original Node
runtime. These focused results precede the configuration head's gate.

The gate at frozen draft `2f0e8295` reports `exit 1`; its source and clean
state remain unchanged, and its owned process group closes. Kernel, 132 Node
cases, and 56 Counting cases pass. The plain phase records 3,564 passes,
15 failures, and one skip. All 15 failures are timeouts at their existing 5, 15, or 30
second limits. Native never starts. The capture takes 540.796 seconds.

A diagnostic selects exactly those 15 cases across 10 files, with one active
file task and the same case limits. It records 11 passes, four timeouts, and 46
unselected cases. It is no gate pass. Neither tests nor deadlines change.
The four remaining timeouts belong to archive-git-v2-reader,
application-examples, application-new, and push. That diagnostic also records
one unhandled localhost `listen EPERM` error and Git `confstr` warnings.

A second diagnostic runs only those four cases outside the sandbox. All four
pass at their original deadlines, with five unselected cases. Tracked file
bytes remain unchanged. The original gate has no recorded `EPERM`, so this
follow-up does not establish the cause of its original timeouts. The separate
full Native phase at `465ca274` passes: 1,039 cases and two skips across
273 passing files and one skipped file. Its actual `native.exit` reads
`exit 0`, with no unhandled error. Both source snapshots match, and the
owned process group closes. The run takes 1,264.352 seconds. The gate
itself remains failed.

Runtime modules, tests, package files, and configuration match the prior
passing gate at `a612368f`. This record adds four prepared files over `afdd8ee5`:
the note, procedure, App configuration template, and baseline script. The
evidence manifest is the fifth path. The configuration parser, actual H3 before reads, rollback input validation,
script syntax, and document links pass. The full failed gate and focused
failures remain in the evidence for exact review. The separate Native phase
passes. No passing full gate at this head is claimed. No validation here
proves an App login,
mini deployment, GitHub push, rollback execution, or parent acceptance.

## Sealed evidence

[The evidence manifest](evidence/2026-11-02-g3-mini-configuration.manifest.json)
indexes 59 files in the read-only unit
`/Users/hughpyle/play/artroom-evidence/2026-11-02-g3-mini-configuration`.
The private index names 36 withheld raw test files with their sizes and
hashes. Raw test output can contain fixture requests or credentials, so it
stays in the indexed private directory. Retention lasts at least 30 days
after landing.

The gate checkpoint is commit `2f0e82952a232f11e9969bb26ca70ae24f56aab8`,
tree `99f8fc502d89eb2cefd6f7d5675686059fa022fe`. The Native follow-up
checkpoint is commit `465ca2740bfd35b9fe1c5e549345e65d21ca76c0`, tree
`92c5126fbaeca5b2cda9eeb048324ca9171572e9`. Their differences change
only the note and procedure. The final documentation follow-up adds this
evidence account and manifest. It changes no test or runtime input. The
review request names the final tree separately.

The following paths belong to that unit. Their hashes also appear in the
manifest.

| File | What it records | SHA-256 |
|---|---|---|
| `01-mini-metadata.stdout.json` | Existing paths and installation metadata | `2123df1f5a6fe2f48ea6f614a203d669ddc09e3a19eaa26e2eb12fdf62d5d3f8` |
| `02-h3-node-health.stdout.json` | Verified Node TLS and actual health | `d892980edef20e70164eb7c3130de99ad72d51ed7c3a552c88624927773fc8c7` |
| `03-h3-read-baseline.stdout.json` | Actual original H3 room reads | `0c3d8f46d7d7e5fd713e1346ccd52c08e35e1c2b95714f36a632701320e2235d` |
| `04-configuration-parser.log` | Placeholder refusal and one-field parser substitution | `b6f2b676844fc5c5839f370f7df664961fc8741695e766c12f4e53acc89aed36` |
| `05-h3-template-comparison.json` | Whole maintained template equality | `faeb01cc8ec05d044930fe8626c9848e317b99dfaac8e058d1c59c882a28082c` |
| `09-rollback-readiness.stdout.json` | Original rollback inputs and runtime warning | `9d190e7ff2f3339eeb874b6446d9c271bbf12b6b3e0b0fc2f139e51bdf85c487` |
| `gate/gate.exit` | Failed full gate | `0c6868c2c44f053619cef1cc383e1d530743b574ca192ace9168a9ccf46a86e3` |
| `gate/receipt.json` | Gate source guards and process-group closure | `c772324d5a3a67f5374590265219342f246db2e9cf15a9c8da66995ce917822d` |
| `diagnostic-summaries.json` | Both distinct focused outcomes | `5acbc91c10ddbfddc37c28c8e24eff937521e430670e3ce6b7e71dd9fb031ef3` |
| `11-four-unsandboxed.exit` | Four cases pass outside the sandbox | `28d3b9e880a77975493dc7e359144c0295a4f694cfe0af4f928c22307bc5c320` |
| `native-followup/native.exit` | Separate full Native outcome | `28d3b9e880a77975493dc7e359144c0295a4f694cfe0af4f928c22307bc5c320` |
| `native-followup/receipt.json` | Native source guard and process-group closure | `cc8295c8819c2f9b6cc624b6c4fa715353597bbfde4fb547d17ddc342c16b9f1` |
| `native-followup/summary.json` | Native terminal counts | `c78decf582d9650a361f951a861965a06617bbea8e355c040d8b524e30552671` |
| `private-raw-index.json` | Private raw locations, sizes and hashes | `1a153b66287220a02e9c8a3af56e1351c9f895a5e2aa432ba7e3a7f17b535a36` |
