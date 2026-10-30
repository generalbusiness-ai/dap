# The dap command

`dap` is the command-line client for a dap scope service. Each command
signs intents with your key and reads the service's routes. The command
decides nothing. The scope decides whether an act takes effect, and the
command prints the scope's answer.

A refusal exits 1 with its reason. An unavailable answer does not say
whether the act took effect, and timed entries may already exist. Read
the journal before you send another act. To recover, resend the original
signed intent. A repeated generic command signs a new intent.

Exit codes: 0 done. 1 refused, unavailable, not found or not
consistent. 2 a command line that the command cannot run.

A scope is named by its ID (`sc_...`) or by one of the names that
`create` and `join` learn: `register`, `directory`, `membership`,
`rules`, `destination` and `inbox`. An entry is named `<scope>:<seq>`.
An issue is named by its number, `3` or `#3`, as `dap issues` lists it,
or by its lane's scope ID.

The source is `packages/cli`. In this repository the command runs as
`packages/cli/bin/dap.js` under Node 22.0.0 or later. The launcher loads
the CLI's own installed TypeScript loader from beside the package, so it
works from any directory and fetches nothing when it runs. No registry
publishes the package.

The hosted service for new rooms is <https://dap-demo.inguz.workers.dev>.
Its CLI routes are under `/v1/scopes` and its hosted MCP endpoint is
`/mcp`. <https://artroom-scope.inguz.workers.dev> serves existing rooms
only and creates no new room.

## What it needs

- **A base URL.** This is the scope Worker's address. You give it once to
  `install`, or an invitation link carries it to `join`. The command keeps
  it in the config.
- **A key.** The command makes an Ed25519 key and keeps its 32-byte
  secret in `keys/<name>.key` in the config directory. It never replaces
  or prints a key. It prints only the key's ID (`key_...`).
- **A config directory.** Set `$DAP_HOME` to choose it. The command still
  accepts `$ARTROOM_HOME` as an alias. If you set both, they must resolve
  to the same directory, or the command refuses before it reads the
  config. The command resolves relative paths against the current
  directory and does not expand `~`. An empty value counts as unset.
  Without either variable, the command uses `$XDG_CONFIG_HOME/artroom` or
  `~/.config/artroom` when that directory holds keys, private pending
  records or `config.json`. Otherwise it uses `$XDG_CONFIG_HOME/dap`, or
  `~/.config/dap` without XDG. An empty new directory never hides an
  occupied old one. The command moves nothing and makes no new key for an
  old directory. The directory has mode 0700 and each file 0600.
- **A read session.** Room reads use a session that membership issues.
  The command keeps the session in a private cache in the config
  directory, bound to the service, the membership incarnation and your
  current key. It reuses the session until 30 seconds before its end. The
  token never appears in public config, JSON output or logs. If a reused
  session is refused as `forbidden`, the command checks the membership
  summary once. If that check also refuses the session, the command
  discards it, asks once for a new one and retries once. A limit on new
  sessions exits with `rate-limited` and the server's `Retry-After`
  window, or an unknown window when the server gives none.

Without a session, a key reads by signed reads. A signed read covers the
entries that the key signed, the entries that come from one of those
within 15 minutes of it (the intent window), and the retained inputs
those entries carry. A member's session reads the scopes that record the
membership. At the register, a session reads the whole journal and its
retained inputs through the room's creation chain. A session grants no
register summary and no other room's private journal. Journal and log
pages can be filtered, and a sparse page is not complete replay evidence.

## Platform commands

### `dap install`

```
dap install <base-url> --host none|artifacts|github.com [--namespace <name>] [--register-policy keys|open] [--cohort unpublished|application|archive-device-application|archive-device-publication|archive-certified-rules|hardened-certified-rules]
dap install --plan <base-url> --host none|artifacts|github.com [--namespace <name>] [--register-policy keys|open] [--cohort unpublished|application|archive-device-application|archive-device-publication|archive-certified-rules|hardened-certified-rules]
dap install --planned [--register-policy keys|open] [--cohort <saved-cohort>]
dap install <git+https-uri> --release <release-id> --request <kept-key> [--role <default-role> ...] [--values <genesis-JSON>] [--owner <full-member-JSON>]
```

`dap install <base-url>` creates a register with an `install` intent. A
new operator key signs the intent, and that key is the register's one
creator key.

- `--host` is required. `none` creates rooms with no publication and no
  journal archive. `artifacts` publishes to Cloudflare Artifacts, and
  `github.com` publishes to GitHub. [Configure a Git host](hosts.md) says
  what each host needs. Another value is refused as `host-unknown`.
- `--namespace` names the Git host namespace. The default is `artroom`.
  With `--host none` the namespace is empty. The demo deployment uses
  `--host artifacts --namespace artroom-demo`.
- `--register-policy keys`, the default, lets only the install's founder
  keys create rooms. `open` lets a key outside that list create a room.
  `open` selects the `archive-device-application` family, or `unpublished`
  with `--host none`. With any other `--cohort`, `open` is refused.
- `--cohort` selects a [creation family](#creation-families).

```
Installed: register sc_hinqqbm4..., under platform:register@18.
The operator key key_baqzbaDy... is kept in the config directory, readable only by you. It is the one creator key.
```

An install receipt does not turn on GitHub effects. The deployment must
configure its GitHub authority and pin the register's scope ID first.
Other registers do not receive that host authority. Full authorization
to install a register is not built.

#### Plan the install first

`dap install --plan <base-url>` signs the same `install` intent and
creates nothing. A register's ID is a function of the intent and the
register's version, so the command prints the ID that the install will
create. It also prints the seed's time: the intent's `notAfter`, 14
minutes ahead, until which the register can be created. The command
keeps the signed intent, the version and the ID in the config. With
`--host none` it also says that entries stay in the service and that the
operator must back up the service.

```
Planned: register sc_4kq2v7..., under platform:register@18, on host artifacts, namespace artroom-demo. The seed's time is 2026-10-08T09:14:00Z.
Set REGISTER_SCOPE to sc_4kq2v7... in the Worker's settings, then run dap install --planned before 2026-10-08T09:14:00Z.
```

`dap install --planned` creates the planned register from the kept
intent. It takes no base URL, host or namespace, because the plan holds
them. Before it sends anything, it checks the plan:

- `plan-mismatch`: the plan's ID is not the one that its intent and
  version make, the version is not in the installed catalog, or
  `--cohort` or `--register-policy` conflicts with the plan.
- `plan-expired`: the plan's time is over and the install was never
  attempted. Nothing is sent.
- `retired-cohort`: the plan is for the retired register@6 family.

```
Installed: register sc_4kq2v7..., under platform:register@18, as planned.
Service-acknowledged identity recovery. The original plan and receipt are retained for later history verification.
```

A plan with an explicit cohort keeps its original intent, version,
register and deadline, including when you plan again. To replace an
expired plan of that kind, keep the original config directory unchanged
and set `DAP_HOME` to a separate empty directory. Run `dap install --plan`
there, set `REGISTER_SCOPE` to the new ID, and run every later command
with that same `DAP_HOME`. This makes a new operator key and separate
custody. Do not copy or delete the original config or keys. Only a
legacy plan that was definitely never sent can be planned again in the
same directory.

Reconcile an attempted or acknowledged plan from its original directory
with `dap install --planned`. Expiry does not prove that the install
never took effect, and it does not permit a replacement. The receipt
must match the planned register, definition and intent. A matching
receipt is the service's acknowledgement. It is not a journal
verification. [The order](deploy.md#the-order) in the deploy guide says
when to plan first.

#### Creation families

Each family pins one version of each platform definition. Every name has
the `platform:` prefix.

| `--cohort` | register | directory | membership | rules | destination | inbox |
|---|---|---|---|---|---|---|
| `archive-device-publication` (the default) | 18 | 17 | 8 | 10 | 13 | 1 |
| `unpublished` (selected by `--host none`) | 21 | 20 | 8 | 10 | 16 | 1 |
| `application` | 5 | 5 | 4 | 3 | 2 | 1 |
| `archive-device-application` (selected by `--register-policy open`) | 17 | 16 | 8 | 10 | 12 | 1 |
| `archive-certified-rules` | 19 | 18 | 8 | 11 | 14 | 1 |
| `hardened-certified-rules` | 20 | 19 | 8 | 12 | 15 | 1 |

Without `--cohort`, a host other than `none` selects
`archive-device-publication`. `--host none` requires the `unpublished`
family. The service's creation policy still decides whether it accepts a
new register. An unknown or repeated `--cohort`, or a conflict with a
retained plan's cohort, service, host or namespace, is refused before
anything is signed. Adding an explicit choice does not change the
default or the pins of existing rooms.

The device families install `device-command@1` packages with an explicit
existing owner, and accept an archive binding when the room is created
or later. No current family installs ordinary application packages such
as Counter or Lending. The `application` family supports explicit
definition activation instead, as the next sections describe.

#### Historical families

`dap install --planned` still reads saved plans for these families. A
new plan cannot select them.

| Family | Register |
|---|---|
| `file-publication` | register@3 |
| `application-publication` | register@9 |
| `invitation-key` | register@10 |
| `trusted-application` | register@12 |
| `declared-application` | register@13 |
| `archive-application` | register@14 |
| `archive-declared-application` | register@15 |
| `device-application` | register@16 |

`install --planned` without `--cohort` uses the saved definition and
signature. An explicit historical `--cohort` must match the saved plan,
and the command never upgrades the plan to a newer version. A matching
selection adds a local custody marker only. The signature, register ID
and deadline stay the same. The ordinary planning path can still replace
an older unmarked register@3 plan that was definitely never sent. The
retired register@6 family stays readable but cannot be installed.

An existing `application-publication` room uses register@9,
directory@8, membership@4, rules@3, destination@4 and inbox@1. Its
application's acts can tell the destination `publish-file`. Directory@8
supplies its own destination when the application's genesis declares
`destination` with type `scope` and kind `destination`. A caller cannot
put that reserved field in `values`.
[Publish a file from an act](write-an-application.md#publish-a-file-from-an-act)
describes the write authority and the publication outcomes.

#### An explicitly selected application room

For an application such as Jam, use a separate owner-only `DAP_HOME`
and a service that supports all six pins of the `application` family:

```sh
dap install --plan <base-url> --cohort application --host <configured-host> --namespace <configured-namespace>
# Set REGISTER_SCOPE to the printed planned ID.
dap install --planned --cohort application
dap create <label> --handle @operator
```

Keep the operator key and the pending intents in that directory. Share
full scope references and genesis pins, never keys or session headers.
After an uncertain install, run `--planned` again. After an unfinished
`create`, run the same `create` again without `--again`. Before you use
the room, check that the directory, membership, rules scope and
destination were created and confirmed. These commands create the room
only. They do not validate, activate or create the application.

To create the application:

1. Validate the application's declaration with `validateDefinition`
   under the deployed bounds. Keep its canonical bytes and its
   `definitionDigest`.
2. Activate that digest, and every declaration it depends on, in the
   room's rules scope.
3. Sign `establish-application` on directory@5 with the digest, the
   bounded canonical genesis `values` and `execution=recorded-do`. Send
   the declaration bytes beside the act. The directory supplies the
   opener and membership.
4. Keep the exact signed intent before you send it. After an unknown
   answer, reconcile its recorded fact and confirmed child seed. Do not
   create a second application to replace an uncertain first one.
5. Grant the declaration's domain actions to the intended role or agent
   in membership. Enrollment and a read session grant no domain act.
   Allow for the deployed grant reuse window after a permission change.

Give each verifier a reader for the target and for every other journal
that it needs. A room session cannot read another root or membership.
Keep the deployed bounds, platform catalog, capability versions and
parameters with the public configuration. A missing journal or an
unsupported pin is a verification failure.

#### Install an application package

`dap install <git+https-uri> --release <release-id> --request <kept-key>`
records one application install in the room.

- An ordinary version 1 package needs an existing historical
  `trusted-application` room. An ordinary version 2 package needs an
  existing historical `declared-application` room.
- A device-command package needs a room of a current device family, or an
  existing historical `device-application` room. It also needs `--owner`
  with the full JSON member reference: the membership scope, incarnation
  and member handle. The install checks that the member is active in the
  room's membership. The signed package declares the kinds and one owner
  requirement. It supplies no member identity or authority.
- A package whose signed host requirements include `archive` needs an
  archive-capable room: historical `archive-application` for version 1,
  historical `archive-declared-application` for version 2, or a current
  device family for a version 2 package with `device-command@1`. The
  room's directory must have the binding `archive: "journal"`. An admin
  sets it with `bind-archive`, when the room is created or later. Without
  the binding the install ends with `archive-unavailable` before it grants
  roles or creates the application. Send a new install request after you
  bind. The binding is configuration, not an archive export receipt.

The caller needs the native `application.install` action. The package
must be a regular Git blob at an exact commit, and the host operator must
list its release and publisher. The host fetches and verifies the URI
itself. The URI has this form:

```
git+https://<lowercase-host>/<repository>.git/@<full-commit>/<encoded-tree-path>
```

Use the release that `dap pack` prints, and commit the package before you
install it. The public HTTPS reader supports SHA-1 Git repositories only.

- `--role` selects that role's default grants from the signed package.
  Give it once for each role: `admin`, `maintainer`, `member`, `agent` or
  `checker`. Without it, the install grants no defaults. Existing grants
  stay.
- `--values` is a JSON object of application genesis fields. The default
  is `{}`.
- `--request` is a key that you choose and keep with the exact command.
  The CLI and MCP share custody in `private/mcp-custody/` in the config
  directory. After a lost reply, repeat the same key and arguments: the
  command resends the kept intent. A different meaning under the same key
  is refused. The command does not renew an expired request. After a
  definite refusal, send a new request to try again.

The answer records the install request. It does not mean that every step
has completed. The output names the install item for `dap application`.
The MCP tools `install_application` and `application_installation` do
the same work.

### `dap application`

```
dap application <install-item>
```

Reads the recorded state and phase of one application install: pending,
active or refused. An active result includes the exact screen URL. A
later refusal can leave earlier activations and grants in force. The
install records no rollback, and ordinary authorized acts can change
those effects.

### `dap apps`

```
dap apps [--cursor <cursor>]
```

Reads one page of at most 25 created applications in the room's
directory. Each row shows the application's name, definition digest and
full scope reference. Names come from content-checked retained
declarations. When a name is unavailable, the row still shows the
recorded references. Control characters and line separators are escaped,
and the command counts shortened names. The command reads no
application scope or journal.

The result states the directory head and the coverage of the selected
suffix. When more rows remain, it prints the next-page command. Run that
command yourself: `apps` does not read later pages. A stale cursor is
refused, so start again with `dap apps`. An application that is still
being created is not in the list. Read its directory entry before you
create another one.

### `dap check`

```
dap check [<directory>] [--config <relative-file>]
```

Validates a local application source and runs its listed scenarios. The
directory defaults to `.`, and the config file defaults to
`dap.application.json`. The command uses public TEST keys only. It reads
no config directory, uses no operator key and writes no package.

It prints the package's semantic and presentation IDs and the number of
native definitions validated. For each scenario it prints the steps that
passed and the journal head that native replay reached. For a version 2
package it also prints the projected bounds of successful creation paths
and of live items. It ends with the package's declared capability
requirements.

- `Package validation refused.`, followed by a table of findings with the
  columns Definition, Row, Check, Severity, Reason and Message. Exit 1.
- No scenario is listed in the config. Exit 1.
- A source or scenario file is missing, inaccessible or a symbolic link.
  Exit 1.

[Write an application](write-an-application.md) describes the package
and what the validation checks.

### `dap dev`

```
dap dev [<directory>] [--config <relative-file>] [--port <loopback-port>] [--scenario <listed-file>]
```

Starts a development host on `127.0.0.1` for a local application. The
port defaults to 5173. The host runs one listed scenario, by default the
first, and keeps its state in memory. The scenario's public TEST actors
hold the authority, and every read is open.

```
Development host: http://127.0.0.1:5173/__dap/
Application preview: http://127.0.0.1:5173/
Authority: explicit public TEST actors and open fixture reads. State is in memory.
Clock: starts at the scenario's final time and advances with requests.
```

The preview serves the application's presentation with live reload. The
panel at `/__dap/` reads the scope's state and runs replay. The host
serves the scope's read routes and accepts acts under `/v1/scopes`. It
rebuilds when a file in the directory changes, except under
`node_modules` and `.git`. A failed rebuild keeps the previous preview and
pauses native writes. A changed definition or scenario starts a fresh
scope. A request from another origin is refused with 403.

Stop the host with Ctrl-C. A command line that the host cannot read exits
2. A host that cannot start exits 1.

### `dap new`

```
dap new <directory>
```

Creates a starter application in a new directory. The directory's name
has 1 to 32 lowercase letters, digits or hyphens and starts with a
letter. The starter holds `dap.application.json`, a notes declaration in
`definition.json`, a scenario in `scenarios/basic.json`, a browser
starter in `browser/` and a `README.md`. Its logical name is
`test.example.<directory>`. Choose your own name before you publish.

```
Application: /home/you/notes
Next: run dap check in that directory.
Scenario authority uses public TEST actors. The browser starter joins no room.
```

The command needs no config directory or key. An existing directory is
refused with exit 1.

### `dap pack`

```
dap pack [<directory>] [--config <relative-file>] [--out <file>] [--publisher <existing-key-name>]
```

Signs the application in the directory as a package. The publisher key is
`operator` from the config directory, or the key that `--publisher`
names. The command never makes a key. It writes `application.dap.json` in
the application directory, or the file that `--out` names, and never
replaces an existing file.

```
Package: /home/you/notes/application.dap.json
Semantic: <id>
Presentation: <id>
Release: <id>
Publisher: <key>
```

Pass the printed release to `dap install <git+https-uri> --release`.
Validation refusals print the same findings table as `dap check`.

### `dap create`

```
dap create <name> [--handle @you] [--branch main] [--again]
```

Creates a room on the configured register. `dap claim` is an older name
for the same command.

The command signs the register's recorded `found` act. It waits until the
directory, membership, rules scope and destination are created and
confirmed. Then it takes the creator's seat, member item and first key in
membership, which makes the creator the first admin. `<name>` labels the
output only: the `found` act has no name field.

```
Created demo: directory sc_hs5f27fz..., membership sc_p6xp2lmd..., rules sc_sfbjwioy..., destination sc_e5xgdizd...; each created and confirmed.
Definitions: platform:directory@17, platform:membership@8, platform:rules@10, platform:destination@13.
You are @rita, an admin, on key key_baqzbaDy...; your inbox is sc_u5joavqp....
```

Before each step, the command saves the exact signed intent: `found`,
then `seat`, then `first-key`. As each step completes, it saves the
recorded fact references. These records hold no private key. A refusal,
an unavailable reply or a lost answer leaves the request pending.

```
Gave up waiting for the directory after 120 reads. What was asked may still take effect; run dap create demo again to go on waiting for this claim, or with --again to sign a new one, which creates a second repository.
```

Run `dap create <name>` again to continue. The command resends or reads
the saved steps with the same signatures and deadlines, then waits for
the confirmed scopes. It checks each child's identity against the
directory's seed and full reference. `--handle` is ignored on resume,
because the saved intent holds the handle. Older state that kept only a
digest resumes only when its records prove the exact signed steps.

The creator reads the new scopes by signed reads until the seat and first
key are recorded, and signed reads last for the 15-minute intent window.
A creation that takes longer gives up, and a resumed create cannot read
the directory either. A saved create does not extend that window.

`--again` replaces the pending create with a new signed `found`. Each
`found` that takes effect creates a repository, so an earlier unknown
create may still produce a second one. An expired intent stays saved
until you replace it with `--again`.

An operator with a kept planned install can create another room on an
`open` register after the signed-read window. For register pins 5, 17,
18, 19, 20 and 21, the command checks the original signed install, the
service's acknowledgement and the register reference before it signs a
new `found`. The register decides the act. Legacy config without that
kept proof reads the register summary instead.

### `dap invite`

```
dap invite <@member> --role <role> [--hours 24] [--keep]
dap invite --check | --continue
```

Signs membership's `invite-member` and prints a link that holds the
invitation's number and its private credential. The invitation lasts 24
hours unless `--hours` says otherwise. Older membership versions use a
one-time secret. Membership@6 and later use a 32-byte invitation signing
seed: `join` records only its signature over the membership reference,
the invitation ID and the joining key. Give the link to that member only.

```
Invited @una as member: invitation sc_p6xp2lmd...:5, until 2099-01-02T00:00:00Z.
Link for @una only (it holds the invitation's secret): artroom-invite:eyJ2Ijox...
```

With `--keep`, the command makes the secret, signs `invite-member` and
saves both in an owner-only private file before it sends anything. The
link names the membership's exact definition, such as
`platform:membership@4` in a room of the `application` family. If the
answer is lost, run `dap invite --check` to read the outcome without
sending, or `dap invite --continue` to resend the original request. While
one kept invitation is unresolved, a new one is refused. A verified or
refused invitation is released, and its link is printed once.

```
Invited @una: the invitation is recorded and verified.
Link for @una only (it holds the invitation's secret): artroom-invite:eyJ2Ijox...
```

`--acts` is refused with exit 2: `invite-member` has no list of acts for
one member. A role's actions apply to every member of that role.

### `dap join`

```
dap join <link> [--check for an agent-key invitation]
```

With an `artroom-invite:` link, signs membership's person `join` with a
new key that the command makes and keeps. Before it sends, it saves the
signed request in an owner-only `private/<name>.data` file. The
invitation secret is not in public config. Under membership@6 and later
it is not in the signed request or the journal either. Older scopes keep their
legacy protocol and can keep the secret in signed history.

```
Joined as @una on key key_H1bY2Hml....
Your inbox: sc_zbtu7vax....
```

After a lost reply or an interrupted wait, run `dap join` again with the
same link. The command reuses the same key, request and deadline. A
request that took effect is confirmed by a read, even after its deadline.
A missing private request or a different link stops the retry. The
command never signs a replacement on its own.

With an `artroom-agent-key:` link, enrolls an agent key with membership's
`enrol`. A room controller first creates an agent member with
`add-member`, then invites its key with `invite-key`. The link carries
that invitation and full references, and no signing key. A person
invitation with the role `agent` is still a person, and it cannot stand
in for an agent-key invitation.

Use a separate empty owner-only `DAP_HOME` for the agent. The command
makes the agent's key and saves the enrollment intent before it sends.
After an unknown answer, run the same command with `--check` to settle
and follow the original without sending. Run it without `--check` only to
continue on purpose, with the original signature, idempotency key and
deadline. The command saves a usable connection only after it verifies
the recorded enrollment, the agent and key kinds, the controller, the
directory's sibling scopes and the active inbox. A missing private
request, a changed link, a person and agent mismatch or a definite
refusal keeps the original. Treat both kinds of link as private.

### `dap acts`

```
dap acts [<scope>]
```

Lists the acts of the scope's definition that your role holds now, with
each act's fields. Membership supplies the role and its actions. An act
that a rule decides, such as `join`, is always listed. The scope can still
refuse an act on its guards or its state. A definition has no description
text, so each line is built from the act's step, item and grant.

```
Acts on sc_hs5f27fz... (platform:directory@17) for @una (member):
  open-issue: opens a lane; needs issue.open. Fields: definition:digest title:text body?:text conditions:list.
  open-pr: opens a lane; needs change.open. Fields: definition:digest title:text body?:text draft:bool.
  open-task: opens a task; needs task.control. Fields: worker:member controller:member lane:scope.
Not shown: 3 that need an action your role does not hold.
```

### `dap act`

```
dap act <kind> --on <scope> [--target <item>] [--set name=value ...] [--value <file> ...]
```

Signs and sends one act.

- `--set name=value` gives one field. The command reads each value by its
  field's type. A list or a record is JSON, and `@handle` is a member of
  this room. Give `--set` once for each field.
- `--target` takes a nonnegative item number. A member handle is refused
  before signing.
- `--value <file>` sends the file's text beside the intent. Give it once
  for each file. The scope reads a value only where its definition says,
  by its digest: the bytes of a definition for the rules scope's
  `activate`, and for the directory's `open-issue` and `open-pr`.

The command fills in the current revision of each item that the act
names, from the scope's summary. The scope checks the revisions again.

```
Took effect: entry sc_p6xp2lmd...:8, hash sha256:2cd70f9ada97.
Refused: guard-failed (not-activated), judged at entry sc_hs5f27fz...:4. The request was refused.
```

For example, an admin activates the demo profile's change definition
with this command. Its digest is in `apps/room/lanes/src/digests.ts`.

```sh
dap act activate --on rules --set digest=<digest> --set name=change --value apps/room/lanes/definitions/change-demo.json
```

### `dap log`

```
dap log <scope> [--limit n]
```

Reads a scope's journal over the read routes.

```
sc_p6xp2lmd...:8  2099-01-01T00:00:00Z  act add-member by key_baqzbaDy...; 6 effects, 1 sends
sc_p6xp2lmd...:9  2099-01-01T00:00:00Z  delivery result from inbox:0; 0 effects, 1 sends
10 entries in all.
```

### `dap show`

```
dap show <scope>:<seq>
```

Reads one entry over the read routes.

### `dap items`

```
dap items <scope> --query <canonical-item-query-JSON>
```

Reads one bounded selection of items. The canonical JSON has exactly the
fields `cursor`, `ids`, `limit`, `scope`, `states`, `type` and `v`.
`scope` is the full scope reference. `cursor` starts as `null`, and
`ids: null` selects every matching ID. States and explicit IDs must be
sorted and unique. The SDK's `encodeItemQuery` writes this form. The
command checks the query's scope against the selected scope before it
sends the query.

The command makes one query. It prints the head, each item, whether the
selected suffix is complete, and any next cursor. To continue, put that
cursor in the next query. A refusal exits 1 and says that coverage is
incomplete. The reply is limited to 256 KiB and the wait to 10 seconds.
A shorter returned prefix is not a complete inventory, and a later
`row-too-large` refusal cannot make it complete.

### `dap verify`

```
dap verify <scope>
dap verify --all
```

`dap verify <scope>` runs the replay verifier over the read routes, with
the platform rules and the code of the two lane capabilities, `hold@1`
and `git-read@1`, so it replays a lane too. It reads with your session. A
read refused as `forbidden` is sent again as a signed read by your key.
Other refusals get no second read. The command prints the verifier's
report: the result, what it covered and what it takes on trust. A journal
whose first page cannot be read has no report. The command then prints
`... cannot be read: <reason>` and exits 1.

```
Result: consistent, for the mode, target, coverage and trusts stated below.
Mode: replay. Within the coverage stated below, the history was folded from its genesis, ...
```

`dap verify --all` replays every scope of the room. It starts at the
register and the directory and follows the creations in their journals to
membership, the rules scope, the destination, each lane and each inbox.
It prints one line for each scope: its kind, its ID, the entry that the
replay reached and the result. The last line is `All consistent: <n>
scopes.`, or the first finding, and then the command exits 1. A journal
that cannot be read is a finding.

```
register sc_3kisrweg..., entry 3: consistent.
directory sc_6frfaa2y..., entry 21: consistent.
membership sc_kc5qv4qq..., entry 10: consistent.
rules sc_qmnrfkiu..., entry 8: consistent.
destination sc_6bqqdirs..., entry 27: consistent.
lane sc_4bbosp5k..., entry 5: consistent.
lane sc_yx6ty22i..., entry 3: consistent.
lane sc_7hogxnge..., entry 12: consistent.
lane sc_zdmnlqyr..., entry 12: consistent.
inbox sc_vyo43gf3..., entry 1: consistent.
inbox sc_obxlkkam..., entry 1: consistent.
inbox sc_3a6xxtoj..., entry 1: consistent.
All consistent: 12 scopes.
```

Discovery, replay dependencies, session requests and cleanup share one
budget: five minutes, 256 MiB, 100,000 HTTP attempts and 100,000 history
entries read. Repeated reads count again. `--all` uses this request
budget in place of the default limit of 64 dependencies. The per-read
bounds, the 1,000-page discovery bound and the depth bound still apply.
Progress lines go to standard error. A budget or cancellation stop exits
1 and names the phase, scope and cursor where it stopped. A session
limit is reported as `rate-limited` with its retry window. It is not a
replay finding and does not cause a signed read.

A later room can read the shared register through its membership
session and still lack a journal that it needs to prove an earlier room's
creation. Verification then exits 1 with `not proven: needs <journal>
entries <range>, not readable by this session`. The register's retained
copy does not prove that the source journal recorded the entry. The
command does not widen access to another room's journal. The same gap
can prevent proof of a later room's own creation.

### `dap scope-index`

```
dap scope-index inventory --out FILE | census --out FILE | sweep --manifest FILE | verify --manifest FILE | versions --manifest FILE | applications --manifest FILE --out FILE
```

Operator commands for a deployment's scope index. They run under Node
only. A manifest file is at most 16 MiB, and the command never replaces
an existing output file.

**`census --out FILE`** lists the registered scopes on the configured
Worker. Sign with the key that signed the pinned register's founding
`install`. A member key or a read session cannot run a census. The
Worker checks its own deployment pin and the register's birth before it
serves rows. The command signs each page's cursor and uses no session,
registration, fallback or retry. One run allows at most 30 seconds,
16 MiB of response bytes and 4,096 rows, with at most 100 rows a page.
Pagination ends only when a response names no next cursor. These limits
bound one observation, not an atomic snapshot.

On completion, `FILE` holds the v1 manifest `{v, service, root, scopes}`,
with each row `{at, genesis}`. It must contain the configured directory's
full reference. An empty or partial census writes no manifest. A local
save error can leave the complete file in place, so after an
`output-unavailable` reason, inspect the path before you choose a new
one. Every run prints one JSON line with `v`, `outcome`, `rows`, `pages`,
`startedAt`, `endedAt` and `written`. A failed page also names its input
`cursor` and a fixed `reason`. The outcomes are `complete`, `empty`,
`absent`, `unsupported`, `forbidden`, `root-unregistered`, `over-bound`
and `page-failed`. Only `complete` exits 0. `absent` means that no index
is configured. `unsupported` means register mode, which serves no census.
Neither means an empty registered set. A census can miss scopes
registered during the run whose IDs come before the cursor, and it does
not list unregistered legacy objects. Later operator key succession is
not supported.

**`inventory --out FILE`** follows the configured room's recorded
creations with your session and saves a manifest. It prints
`Captured <n> listed scopes in FILE.` Reads in register mode can write
registrations.

**`verify --manifest FILE`** reads each listed scope's genesis entry and
compares it with the saved genesis hash. It prints a JSON report with
`listed`, `verified`, `unavailable`, `mismatch` and one row for each
scope, and exits 0 only when every listed scope verifies. **`sweep
--manifest FILE`** runs the same check. Reads in register mode can
register scopes.

**`versions --manifest FILE`** checks each saved genesis and reports its
definition pin, or `unavailable`, `mismatch` or `unsupported`. It exits 0
when the report is ready. It changes no setting.

**`applications --manifest FILE --out FILE`** reads the summary of each
rules scope in the manifest and writes a JSON report of installed
applications to the `--out` file. It requests at most one membership
session, for that run only, and retries no read. Scopes of other kinds
are marked not applicable. The printed line has `status` (`complete` or
`incomplete`), `applications`, `errors` and `notApplicable`. Any error
exits 1. A session limit stops the run before any read and reports
`rate-limited` with `retryAfterSeconds`, or `null` for an unknown window.

### `dap status`

```
dap status [<scope>] [--request <16-hex-id>]
```

Reports bounded operational observations through a room session.
[Status reads](operations.md#status-reads) describes the columns, bounds
and permissions. The command exits 0 when it produces a report, including
one with unknown or partial columns, and 1 when it cannot get a room
session.

### `dap mcp`

```
dap mcp [--generic | --generic=add] [--tools <definition>,...] [--http 127.0.0.1:<port>] [--scope <scope> --membership <scope>]
```

Serves the room to an agent host as an MCP server, over standard input
and output or over loopback HTTP. The server signs with the config
directory's key. A config directory with no room is served too: the
server makes a device key, and its `join` tool records the room.

- `--generic` lists the generic tools and the pair `actions` and `act` in
  place of the act tools. `--generic=add` lists both.
- `--tools` lists the act tools of the named definitions only.
- `--http` serves loopback HTTP in place of standard input and output.
- `--scope` records a standalone scope in the config before the server
  starts. `--membership` names the scope that its standing is read from:
  `membership` for the room's own, or a scope ID.

[Connect an agent host](mcp.md#connect-an-agent-host) describes the
server, its options and its tools.

## Room commands

These commands work on a room's repository, its changes and its issues.

### `dap remote`

```
dap remote
```

Prints the repository's host, namespace, name and remote URL, from the
destination's branch item. On GitHub the URL is
`https://github.com/<namespace>/<name>.git`. On Cloudflare Artifacts it
is `https://<host>/git/<namespace>/<name>.git`, where `<host>` is the
deployment's setting, which no scope records. Until a clone has learned
it, the command marks that part.

```
Host: artifacts
Namespace: artroom-demo
Name: 5kywbv2y...-1
Remote URL: https://<service host>/git/artroom-demo/5kywbv2y...-1.git (the service host is the deployment's setting; dap clone prints it whole)
```

A room created with `--host none` prints `Mode: unpublished` and
`no-repository: this room has no publication.`

### `dap clone`

```
dap clone [<directory>] [--hours 1] [--archive]
```

Clones the repository with a read token of your own:

1. If there is no `git` program, the command signs nothing and prints
   the clone command with the token's place marked.
2. It signs the destination's `read-token` act with `--hours`, from 1 to
   24. The default is 1. Every role holds this grant, so any active member
   can sign it. The destination opens a `mint-read` operation, and the
   host mints a read token for that lifetime. On GitHub the lifetime is
   GitHub's own, one hour.
3. It waits for the outcome, which names the token by a handle that is
   not secret, and its end. Then it reads the token once, with your read
   session, from the destination's credential route. No other session can
   read it, and nobody can read it twice.
4. It runs `git clone -- <remote> [<directory>]`. The token reaches `git`
   as an `Authorization` header in the `http.extraHeader` configuration,
   which the command sets in git's environment (`GIT_CONFIG_COUNT`,
   `GIT_CONFIG_KEY_0` and `GIT_CONFIG_VALUE_0`). The token is in no
   argument, no printed line and no file that the command writes, and
   `git` does not keep it in the clone's config. The header is
   `Bearer <token>` on Cloudflare Artifacts. On GitHub it is `Basic` with
   the user `x-access-token`.

The command prints the remote URL and keeps it in the config for
`remote`.

```
Read token: sc_rh5ctnhi...:2, until 2099-01-01T02:00:00Z.
Remote URL: https://service.invalid/git/artroom-demo/5kywbv2y...-1.git
Cloned into here.
```

Without `git`:

```
git is not installed here, so nothing was signed. With git installed, run dap clone again; it runs:
git -c http.extraHeader="Authorization: Bearer <read token>" clone -- https://<service host>/git/artroom-demo/5kywbv2y...-1.git here
```

`--archive` needs an explicit directory. After the clone, the command
fetches `refs/artroom/journal/*` into it with the same token, which stays
in memory. It then prints `Fetched refs/artroom/journal/* with the same
read token.` Verify the expected journal set offline before you accept
the archive. If the fetch fails, the working clone stays and the token is
not kept.

The token is for one clone. A later `git fetch` or `git pull` needs a new
token, and no command gives one to them. Run `dap clone` again. A token
that nobody reads ends at its end. A room created with `--host none` is
refused as `no-repository`.

An active member's session reads the destination before the member's
first act, also after the creator's signed-read window. The destination
checks the member's full confirmed membership reference from its recorded
birth directory before it accepts the session.

### `dap edit`

```
dap edit <path> --file <local file> [--title <text>] [--closes <issue>]
```

Writes one file of the repository through the room. You never write the
repository yourself: the room decides the change and its destination
writes it.

1. The command reads the local file. A file that is not UTF-8 text, or
   that has more than 65,536 bytes, is not carried: nothing is signed, and
   the command exits 2.
2. It reads the change definition that the rules scope holds active, and
   its bytes. With none active, it signs nothing.
3. It signs the directory's `open-pr` under that definition, with its
   bytes beside the act, and waits for the new change lane. The title is
   `--title`, or `Edit <path>`.
4. It signs the lane's `ask-rules` and waits for the rules scope's answer.
5. It signs `propose-file` on the destination's head: the path, the
   digest and size of the bytes, and the bytes. This is the change's only
   version.
6. With `--closes <issue>`, it signs the lane's `link-own` to that issue,
   as `dap merge --closes` does.
7. It merges the change as `dap merge` does.

```
Proposed README.md (37 bytes) as change sc_q3xk...., version 6.
Published: commit 5d0c1e6b..., by the merge sc_q3xk...:7.
Page: https://scopes.test/site/sc_hs5f27fz.../HEAD/README.md
```

The rules decide who must approve. A change in an extent that asks no
approval is published on the merger's own act. A change in the rules
extent, such as `AGENTS.md`, waits for the rules scope's controller:

```
Proposed AGENTS.md (31 bytes) as change sc_ab12..., version 6.
Not published: the merge sc_ab12...:7 is refused, rules-not-met:rules. The change sc_ab12... stays open at version 6. When it may be merged, run: dap merge sc_ab12...
```

The controller approves the change for that extent with `dap act
review-verdict --on <change> --set manifest=<version> --set
verdict=approve --set extent=rules`. Then a member who holds
`change.merge` runs `dap merge`.

A second `edit` of the same path replaces the file. The destination
refuses a path that no published tree can hold as `path-invalid`, and
pushes nothing. Such a path has an empty, `.`, `..` or `.git` segment, a
control character, or more than 1,024 bytes. A path where the published
tree has a folder, a symbolic link, a submodule or a file on the way is
refused as `integration-invalid`. An `edit` carries text only, so it
cannot write an image or another binary file.

### `dap propose`

```
dap propose <branch> [--title <text>]
```

Submits the committed files that differ between the room's published
head and a local branch tip. The command reads committed objects, so it
leaves uncommitted files and the index alone. The room's head must be an
ancestor of the tip. The room creates and publishes its own commit, and
you do not push the branch. After a publication, `git pull` reads the
room's commit.

The command needs a change definition with a manifest list and a
destination at version 3. Existing rooms keep their genesis pins, so an
older room is refused with `version-mismatch`. Activation alone cannot
upgrade its destination. A creator gives the rules scope the bytes of
`change3.json` or `change-demo3.json` by their exact digest.

The change records one signed `propose-file` entry for each path, then
one `propose-manifest` that fixes all paths, entry references and byte
digests on the published base. The destination builds the shared tree at
reservation and records it before any required check. A check reads that
reservation tree, and publication waits for every required check's
authentic pass. The destination stages the integration on the host under
`refs/artroom/reservations/<reservation id>` before it reports the
reservation to the lane. The checker fetches that ref and checks its
integration ID, tree and first parent. A missing or different stage
gives `reservation-stage-missing` or `reservation-stage-mismatch` and
starts no run.

While a check is owed, the command prints the change and the reserved
tree. A published result prints the room's commit. A policy refusal
prints its name and the merge command to run after approval.

The command carries UTF-8 text, including a byte order mark and NUL
bytes. It names refusals for a deleted or renamed file, content that is
not UTF-8, an unsupported mode change, more than 64 changed paths, a path
that cannot be written, and a file over 65,536 bytes. Each source entry
uses the per-entry transport bound, and the command carries no Git pack.
Reservation snapshots use SHA-1, and the private checkout refuses SHA-256
as `unsupported-object-format`.

A `request-check` first records a queued job. Before the destination
acknowledges the new job, it fences that check's job generation, which
cancels any earlier pass, and the new job replaces the old one. You can
ask for a retry while checks are pending. After publication has started,
the fence is refused as `publication-started`, and the old job and any
unresolved send stay recorded. A late result counts only for the
generation that the destination acknowledged. A cancellation before a
push, or the recorded check deadline, frees the branch for another
publication. Cleanup of a staged ref is a separate task.

Publication moves the branch by its recorded compare-and-swap. The
reservation ref must be deleted, and its tokens revoked, before the
destination's publication is final. An unknown staging or deletion stays
recorded, and the destination never infers it from a read. A staging
mismatch that may leave a ref keeps a live `cleanup-aborted` task, and
the branch slot can be reclaimed separately. A delete names the recorded
old integration ID, so it cannot remove another writer's replacement ref.
Expiry keeps `cleanup-aborted`.

### `dap merge`

```
dap merge <change> [--closes <issue>]
```

Signs `merge` of the change's current version, with the reports that it
selects, and waits until the merge is published, refused or stopped. It
needs `change.merge`, which admins and maintainers hold, so a member
cannot merge their own change. A publication prints the commit, and for
a one-file version the page's address. A refusal by the lane prints the
refusal, and a refusal by the destination prints its reason. Either way
the change stays open, and you can run `dap merge` again.

With `--closes <issue>`, the command first signs the change lane's
`link-own` to the issue, with `how` set to `keyword`. The link is a fact
of the change lane. When the merge is published, the lane tells the
issue, and the issue closes with the reason `completed` by its own entry.
Only the change's author can sign `link-own`, and the demo profile has no
`link-any`. A member who opens a change can link it but cannot merge it.
The member's change waits, linked, until an admin or a maintainer merges
it.

```
Proposed guide/start.md (53 bytes) as change sc_q3xk..., version 6.
Linked: when it is published, the change sc_q3xk... closes issue #1 (sc_4bbo...).
Refused: unauthorized, judged at entry sc_q3xk...:7. The request was refused.
The change sc_q3xk... waits, at version 6. When it may be merged, run: dap merge sc_q3xk...
```

Then the admin runs `dap merge sc_q3xk...`:

```
Published: commit 5d0c1e6b..., by the merge sc_q3xk...:8.
Page: https://scopes.test/site/sc_hs5f27fz.../HEAD/guide/start.md
```

### `dap issue`

```
dap issue open --title <text> [--body <text>]
dap issue comment <issue> <text>
dap issue assign <issue> <@member>
dap issue close <issue>
```

**`open`** signs the directory's `open-issue` under the issue definition
that the rules scope holds active, with its bytes beside the act, and
waits for the issue's lane. The body is a detached text, and the act
holds its digest. The title is the issue's one condition, because the
lane refuses an issue with no condition, and the command has no flag for
other conditions. The directory numbers issues and changes in one
sequence. An admin activates the demo profile's issue definition as for
the change definition, with `--set name=issue --value
apps/room/lanes/definitions/issue-demo.json`.

```
Opened issue #1: The handbook has no start page. Its lane is sc_4bbosp5k....
```

**`comment`** is the issue lane's `comment`. Any member can comment.

**`assign`** is the lane's `assign`. It sets the assignee and needs
`issue.triage`, which admins and maintainers hold. No rule of the demo
profile needs an assignee.

**`close`** signs `close-own` when you opened the issue, and `close-any`
otherwise, which needs `issue.triage`. The reason is `completed`. The demo
profile has no rule that lets an assignee close an issue, so a member who
did not open it is refused:

```
Commented: entry sc_4bbosp5k...:1, hash sha256:3b1f0c2d9e8a.
Refused: unauthorized, judged at entry sc_yx6ty22i...:1. The request was refused.
```

### `dap issues`

```
dap issues
```

Lists every issue, oldest first: its number, its state and close reason,
its title, its assignees and its lane. The command reads each issue in
its own lane. The directory's row for an issue is an index that the
lane's own acts update. A merge that closes the issue does not update
that row, so the row can still say `open`.

```
#1  closed (completed)  The handbook has no start page; assigned to @una; lane sc_4bbosp5k...
#2  closed (completed)  A typo on the front page; lane sc_yx6ty22i...
2 issues, 0 open.
```

The room's browser client is [the page](../apps/room/docs/page.md).

## Source

Checked against main `5dc9765f` on 30 October 2026. Sources: [line.ts](../packages/cli/src/line.ts), [commands.ts](../packages/cli/src/commands.ts), [application-command.ts](../packages/cli/src/application-command.ts), [application-dev.ts](../packages/cli/src/application-dev.ts), [mcp.ts](../packages/cli/src/mcp.ts), [scope-index-command.ts](../packages/cli/src/scope-index-command.ts). The samples come from the tests in `packages/cli/test` and `apps/room/lanes/test`, with long IDs cut short, except the `dap new`, `dap dev` and `dap pack` samples, which follow the source.
