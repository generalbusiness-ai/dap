# Provision and run the Grow demo

Run status, 20 October 2026, 07:20 ET: planner provisioning record
`740b21d9` reports the `dap-grow` scope Worker and `dap-grow-simulator`
provisioned from published Main `8aad37bb`. The Register17 room has
confirmed Directory16, Membership8, Rules10 and Destination12 siblings.
Install item 2 is active; its Site and Room A are created. The operator
and two controlled agents are enrolled. The simulator runs every UTC
minute; the record includes its 07:18 tick and native device answers.
The homepage deployment, visitor invitation journey, a person's authorize
act and missed-tick recovery remain open under the operational milestone.

The scope service is `https://dap-grow.inguz.workers.dev`, with deployment
identity `dap-grow-v1`. Its public settings are committed in
[`apps/room/wrangler.grow.jsonc`](../../apps/room/wrangler.grow.jsonc).
It has its own Durable Objects and register
`sc_yatkl7kuktl2gauvjrt7b2zy7nr6nu55vkzorot2bm5n2umgpbnq`, and shares
the `artroom-demo` Artifacts namespace and application-content bucket.
`SESSION_SECRET` is set separately from stdin. For a reviewed maintenance
deployment, run the pinned tool from a scratch directory:

```sh
ARTROOM_REPO=/absolute/path/to/artroom
cd "$(mktemp -d)"
npx -y wrangler@4.147.0 deploy --keep-vars --config "$ARTROOM_REPO/apps/room/wrangler.grow.jsonc"
```

Planner owns deployment and the remaining hosted acceptance procedure.

Use the reviewed, landed checkout and preserve each original request and
receipt. The committed packet is `examples/grow/demo/application.dap.json`.
Its exact public `dap pack` output is:

```text
Release: sha256:71e10ca9499e926a4de1d8294ed83a772051dff677d8b1687bbd8e28e61802fa
Publisher: key_gg4rXwy4v-kVqveN37_W_FW_-Wvsn3fgsal5z6gxfS0
```

Verify those values before supplying a trust row. The publisher key is
separate from operator and simulator custody and is absent from the head.
The current source repository is
`https://github.com/generalbusiness-ai/artroom.git`. The maintained
`examples/grow/check` package remains a local test fixture.

## Record the deployment inputs

Keep these public references with the deployment receipt:

| Input | What to record |
|---|---|
| Source | Approved candidate, actual Main landing and published immutable commit |
| Package | Packet path, semantic/presentation/release IDs and publisher from `dap pack` |
| Host | Actual scope-service origin, deployment identity, Artifacts namespace and application-content binding |
| Room | Full register, Directory, Membership, Rules and Destination references |
| Installation | Immutable Git URI, original request key, Rules install item and active application scope |
| Members | Operator, head grower and each agent's full MemberRef, controller and public key ID |
| Simulation | Signed whole-minute cadence, period and fault-zone assignment |
| Cron | Separate simulator Worker name, deployment version and configured UTC trigger |

Keep operator custody separate from sensors and climate custody. Each agent
joins with its own fresh owner-only config directory. Its controller is the
actual operator person. Invitation links, private keys, session tokens and
secret-bearing enrollment envelopes stay in private custody. Public evidence
uses the verified references and selected nonsecret receipt fields.

## Provision the room and enroll the owner

1. From an owner-only operator `DAP_HOME`, prepare the combined native
   Device/archive cohort against the operator-selected hosting origin.
   Follow [deployment](../../docs/deploy.md) for the plan's exact register
   and provider configuration. The cohort is Register17, Directory16,
   Membership8, Rules10, Destination12 and Inbox1. Its selector is
   `archive-device-application`, implemented by landed S2a `fb390d88`. Verify
   the plan's exact pins before any provisioning. This follows adopted
   planner decision `7e93abad`; it does not upgrade an earlier room.

   ```sh
   node packages/cli/bin/dap.js install --plan "$GROW_SERVICE" --cohort archive-device-application --host artifacts --namespace "$GROW_NAMESPACE"
   ```

   Proving read: retain the plan's original signed identity and confirm the
   selected host configuration names that exact register and namespace.
   Complete the same plan after the reviewed host is configured; do not
   silently replace an attempted plan or its custody.

2. Finish that original install and claim the room as its operator.

   ```sh
   node packages/cli/bin/dap.js install --planned --cohort archive-device-application
   node packages/cli/bin/dap.js create grow-demo --handle @grow-operator
   ```

   Proving read: inspect the native creation and actual sibling summaries.
   Record each full reference and exact pin, active status, the operator's
   active person member/key and the Directory's repository identity. A
   configured-service acknowledgment alone is not this native readback.

3. Issue a tagged agent-key invitation for `@grow-sensors`, with the operator
   as controller, through the existing retained `issueInvitation` API or the
   creator's **Create agent invitation** flow. The CLI has no
   `invite --kind agent-key` flag. An API caller keeps the operation identity,
   uses `kind: "agent-key"`, and passes the full actual controller MemberRef.
   It retains the exact native `add-member` and `invite-key` requests before
   sending them. **Check** reads the original; **Continue** resumes it.

   Proving read: verify both native receipts, active agent member, exact
   controller, pending agent key and independently created inbox. Pass the
   private link only to that agent's custody. A created link does not prove
   enrollment.

4. In the separate sensors config directory, use the tagged link to enroll
   an independently generated agent key.

   ```sh
   node packages/cli/bin/dap.js join '<private agent-key link>'
   ```

   After an uncertain answer use the same original link with `--check`;
   preserve the kept request. Proving read: the admitted enrollment is under
   Membership8, the key kind is agent, its member is `@grow-sensors`, that
   member's controller is the operator, and its inbox is active. Record public
   IDs, not the key or private link. This enrollment must precede application
   installation: G5a requires an existing active owner.

5. Repeat invitation and enrollment for `@grow-climate` in its own private
   config directory, with a different generated key and the same operator
   controller. Enroll both agents before installing the application. Read
   the full MemberRefs and active keys, exact controllers and Membership8
   pin. The demo binds sensors, climate and operator as three distinct fixed
   parties; both agents use the native agent role. Its coarse actions are
   `grow.sense` and `grow.climate`, while demo guards restrict each writer
   to its assigned full MemberRef. The operator also keeps climate control.
   No agent receives `grow.heat` or irrigation permissions. These are the
   adopted choices in planner report `74c94c4d`.

## Install the signed demo package

The final packet must be committed before its immutable URI is used:

```text
git+https://github.com/generalbusiness-ai/artroom.git/@<full-published-commit>/examples/grow/demo/application.dap.json
```

The operator sets the host's nonsecret `APPLICATION_TRUST` to the single exact
release and publisher printed by `dap pack`, with `host: "github.com"`
matching the immutable URI above, following
[Trusted application screens](../../docs/deploy.md#trusted-application-screens).
Grow's checked-in trust row includes that explicit host; externally managed
trust lists need the same schema migration. No publisher secret is supplied
by this checkout.

Use the recorded URI and release, an explicit kept request key and the full
sensors MemberRef as `--owner`. Select only the final signed package's
reviewed role defaults: admin, maintainer, member and agent. Genesis values
are a JSON object containing `label` and the actual full MemberRefs named
`sensors`, `climate` and `operator`. Set owner to that exact sensors member.
Site forwards all three assignments to each Room it creates.

```sh
node packages/cli/bin/dap.js install "$GROW_PACKAGE_URI" --release "$GROW_RELEASE" --request "$GROW_INSTALL_REQUEST" --owner "$GROW_SENSORS_MEMBER" --values "$GROW_GENESIS_VALUES" --role admin --role maintainer --role member --role agent
node packages/cli/bin/dap.js application "$GROW_INSTALL_ITEM"
```

The initial accepted request is not completion. Proving read: wait for the
actual Rules job to become active and read its exact release, publisher,
Directory and application scope. Inspect the native Site birth and its owner
context, create the Room through that Site, then inspect its accepted birth
and exact one-hop owner delegation. Read the resulting Site room row and
Room reference. A pending or refused job supplies no active-room claim.
Repeat an uncertain original with the same request key and arguments; a
new key is not recovery.

### Commission through the operator's retained MCP custody

Connect the operator's AI app to the existing owner-only `DAP_HOME` that
claimed `@grow-operator`. Configure it to launch the generic MCP server
from the reviewed checkout, using that same configuration. Set
`GROW_OPERATOR_HOME` to the existing operator configuration directory:

```sh
DAP_HOME="${GROW_OPERATOR_HOME:?Set GROW_OPERATOR_HOME}" node packages/cli/bin/dap.js mcp --generic
```

The server signs with its retained key, so this connection acts as the same
operator member recorded at claim and assigned to Site/Room. Verify that
member's full reference and current key record through the authenticated
membership reads. Keep this configuration separate from both agents and
the head grower's custody. See [Connect an agent host](../../docs/mcp.md#connect-an-agent-host).

Use the existing `actions`, `act`, `items`, `step`, `wait` and `settle` tools
in the operator's configured MCP custody. Call `actions` for the actual
Site/Room target and keep the returned definition digest. The generic `act`
tool takes `target`, `kind`, `digest`, `fields`, an optional item `on`, and
the explicit `idempotencyKey` you choose once and keep. It derives expected
revisions from the declared subjects and retains the exact signed envelope
before submission. After an uncertain reply use `settle` with that target
and key; a fresh key is not a retry. Do not automate setup by repeating
unretained ad hoc CLI acts.

If the Room does not yet exist, use the actual Site target and its digest
with `kind: "create-room"`, `fields: {"label":"Room A"}` and one retained
key for that deployment. `wait` on its accepted creation entry, then read
`items` with `type: "room"` at the Site. Keep the resulting active row's
full Room scope; a pending row is not a commissioned Room.

At that Room, use the following actual acts. Every new opening's local ID
is its accepted receipt's fact position. Follow each with `step` and the
matching `items` read; use the assigned IDs in subsequent fields.

| Act | Fields and subject | Proving read |
|---|---|---|
| `commission-zone`, four times | `label`: Zone 1 to Zone 4; `setpoint`: 2400; `band`: 200 | Four distinct zone items with those values; keep their actual IDs in creation order |
| `commission-device`, three per zone | `zone`: that actual zone ID; `kind`: vent, fan or heater; `label`: kind plus zone number; `minLevel`: 0; `maxLevel`: 100; `target`: closed for vent, off for fan, on for heater; `level`: 0, 0 or 100 respectively | Twelve distinct devices, one of each kind per zone, exact zone refs, targetAt of their commissioning entry, no invented report or outcome |
| `bind-zone-devices`, once per zone | `on`: actual zone ID; fields `vent`, `fan`, `heater`: its actual device IDs | Each zone names those exact three devices |
| `commission-bench`, for each A1 to J10 | `label`: row letter plus column; `row`: A to J; `column`: 1 to 10; `zone`: the assigned zone ID | One hundred distinct benches and 25 per zone; no duplicate row/column pair |
| `set-heater`, once per zone | `on`: its actual heater ID; `target`: on; `level`: 100 | Four actual command openings and reserved owner answers, distinct from the commissioning target facts |

Assign benches by quadrant: rows A–E/columns 1–5 are Zone 1, rows
A–E/columns 6–10 Zone 2, rows F–J/columns 1–5 Zone 3, and the remaining
quadrant Zone 4. The model derives 25 transient temperature cells per zone;
commissioning writes no fabricated probe observations. Use a unique retained
request key per setup act and the same key for settlement. The table is a
provisioning procedure, not evidence that these acts have run.

Read the full sensors/climate/operator Room assignments. Through each
agent's separate custody, retain the named refusal when climate tries a
sensor report and sensors tries climate control. Read the unchanged head
after each refusal. Neither agent can authorize or set a heater. Do not
schedule the driver until this native readback and the final installed
integration witness are complete. No scenario fixture ID is an operational
input.

Keep the operator connection above. Invite the head grower as a person into
a separate AI-app custody; invite a tender as member when a visitor asks.
Verify their
admitted person keys, full membership identity and actual domain actions.
Role updates replace whole lists: preserve the existing native actions.
No public uninvited tender seat exists. The operator's seat and sensors key
are never visitor credentials.

## Start the separate simulator

The separate `simulator-worker.ts` entry loads the committed packet as a
Text module and verifies its exact release, publisher, definitions and
signed cadence. Its configuration is `examples/grow/wrangler.jsonc`, with
UTC cron `* * * * *`. Local dry-run bundling and native entry checks create
no deployment. The scheduled host uses `GROW_BINDING` for public configuration and
`GROW_SENSORS_SECRET`/`GROW_CLIMATE_SECRET` for the two separate 32-byte agent
secrets encoded as unpadded base64url. `GROW_BINDING` is a JSON object with
`service` (HTTPS origin), `room` (full Room ScopeRef), and `members`
containing the full `sensors`, `climate` and `operator` MemberRefs.
It opens public sessions for both keys and compares the public retained
birth's owner grant to the exact signed graph before running a tick.

The Worker is separate from the scope host and holds no operator key. Its only
room interface is the public member API. Use pinned Wrangler 4.147.0 from a
scratch directory with an explicit config path; do not install tooling into
the checkout or run a local command against a remote Artifacts binding.

Read the cadence and period through the exact signed release consumer. Cron
uses UTC, with a one-minute minimum. The prepared schedule is one minute,
with a sixty-minute repeating fault story. Match the deployed trigger to the
signed cadence. See Cloudflare's [Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/)
and [scheduled handler](https://developers.cloudflare.com/workers/runtime-apis/handlers/scheduled/)
documentation. No trigger or deployed handler is proved by these documents.

After exact-head approval and Main publication, planner deploys from a
scratch directory with the reviewed absolute checkout path in
`GROW_CHECKOUT` and the verified public binding JSON in `GROW_BINDING`:

```sh
npx --yes --package wrangler@4.147.0 -- wrangler deploy --keep-vars --config "${GROW_CHECKOUT:?Set the reviewed checkout}/examples/grow/wrangler.jsonc" --var "GROW_BINDING:${GROW_BINDING:?Set the verified public Room binding}"
npx --yes --package wrangler@4.147.0 -- wrangler secret put GROW_SENSORS_SECRET --config "$GROW_CHECKOUT/examples/grow/wrangler.jsonc"
npx --yes --package wrangler@4.147.0 -- wrangler secret put GROW_CLIMATE_SECRET --config "$GROW_CHECKOUT/examples/grow/wrangler.jsonc"
```

Supply each distinct agent secret through Wrangler's private prompt or
standard input, never a command argument or public log. Until both keys
are set, scheduled callbacks stop before a room request. See Cloudflare's
[secrets procedure](https://developers.cloudflare.com/workers/configuration/secrets/).
Retain the actual Worker version and trigger readback. Proving read: observe an actual native reading
summary, device reports and G5a owner preparation, with their sensors signer
and command fact. Verify the independent reported, target and outcome slots,
the reserved-answer count and the next recorded tick. Retain a missed-tick
recovery separately from a dry run. Exact unresolved-request recovery and
application-journal cursor readback are required before this step is ready.

The client allowance is 96 reads, 48 mutations, 256 KiB of request bodies,
4 MiB of retained reply chunks and a 45-second window. The host uses a
five-second per-request SDK deadline. Each tick answers at most eight open
commands, scans at most four pages/800 entries/1 MiB of canonical prefix/64 command
changes, and takes at most eight climate acts. The installed native
long-gap witness checks these allowances and cursor progress; the operator
still checks their deployed readback. The sensors' observe transition records the durable
scanned head in commandsAnsweredThrough, fenced by the Room revision;
it never advances past an unanswered command. Only the native named
device-command-closed refusal counts as an already covered answer.
Every other refusal or uncertain reply stops the invocation. A later tick
reads the journal again; it does not invent skipped observations or resend
the earlier unknown request automatically.
Earlier accepted entries remain accepted; a later refused tick step does not
roll back a batch. Cancellation does not prove a remote act was unrecorded.

The signed story repeats every sixty minutes: vent fault from minute10 to35,
fan trip from20 to40. Climate control increases the working fan and
cross-draft. A person cutting heat can bring the zone back into band earlier.
After the vent responds, an actual recorded heat-cut authorization earns a
restoration proposal through minute40 of that incident's cycle. Only a
person can authorize restoration. If unanswered, the incident closes with
the heater left off. With no intervening heater command it closes at
recovery and says so. The clock clears fictional faults; no repair or
person's act is invented.

## Verify the visitor and operator path

From the deployed homepage, open **Grow**, then **Open Grow in Room**. The
current landing-page link points to the existing Room invitation screen;
it does not identify this provisioned Grow room by itself. Proving read:
with the actual tender invitation, verify that the joined browser's saved
connection names this demo's exact Directory and Membership, then reopen
through the homepage in that profile. Record that actual navigation. A local
intercepted-link check is not hosted acceptance. A live grid on `/grow/`
belongs to G6.

Connect the person's AI app to the actual hosted MCP endpoint with that
person's own membership custody, following
[The hosted endpoint](../../docs/mcp.md#the-hosted-endpoint). During the
fault, the person takes the operator's `authorize` act. Proving read: the
native entry has the operator's signer and exact alert revision, the target
changes, the sensors owner records the outcome separately, and a later
sensors report shows the simulated state. A scripted model or fixture does
not prove this person-in-AI acceptance.

Record subsequent autonomous ticks between visits and the next fault cycle's
incident evidence. Record the actual observer and times. Archive disclosure
and the day/clone exit test wait for the separate demo-room archive slice;
this runbook records no hosted archive acceptance by itself.

## Enable the reviewed room archive

The planner performs these steps under promise `2fcf3c3a`, after exact-head
review and Main publication. Keep the signed simulator running at its
one-minute cadence throughout.

1. Read the established repository item from Directory
   `sc_ryghgistvpshbaznxlbleop5zqruy2kmogy4jeigr7j3yqlewceq` with the
   operator's ordinary authenticated read. Check its recorded repository
   name, `ryghgistvpshbaznxlbleop5zqruy2kmogy4jeigr7j3yqlewceq-1`, and
   namespace, `artroom-demo`. Take the repository ID from that item.
   Do not copy or infer the ID from the name or this runbook.
2. Check the reviewed `ARTIFACTS_CONFIG` register, service hostname and
   namespace against the actual binding. Check `GROW_ARCHIVE_CONFIG` names
   this directory, repository name and exact signed demo release. It contains
   no token or repository ID. The existing `DeployedScope` class name,
   migrations and namespace stay intact; Grow uses `worker.grow.ts`.
3. Deploy the reviewed scope Worker from a scratch directory:

   ```sh
   npx --yes --package wrangler@4.147.0 -- wrangler deploy --keep-vars --config "${GROW_CHECKOUT:?Set the reviewed checkout}/apps/room/wrangler.grow.jsonc"
   ```

   Record the actual Worker version and settings. Set no archive Worker
   secret. Decision `9674108a` replaces the earlier secret requirement:
   the Artifacts binding mints one write token for each pass, with a requested
   lifetime of 900 seconds and the service's actual expiry. The adapter
   revokes that token when the pass ends, or relies on service expiry when
   the service offers no revocation. Archive tokens never enter a journal,
   archive, command argument, source file, or public log.
4. In the operator's established Grow context, inspect the directory's
   current acts and submit the binding:

   ```sh
   dap act bind-archive --on sc_ryghgistvpshbaznxlbleop5zqruy2kmogy4jeigr7j3yqlewceq --target 0 --set archive=journal
   ```

   Retain the accepted entry and read back `archive: "journal"` from the
   exact repository item. A binding is not an archive receipt. Keep an
   uncertain answer distinct from an accepted one; use ordinary custody
   recovery before submitting another request.
5. Read back confirmed archive progress for Room A, its application root,
   Directory16, Rules10 and Destination12. Check each journal begins at
   position 0, including scopes created before binding. The refs are
   `refs/artroom/journal/<scope ID>` in the room's own repository. Record
   the five full scope references, commits and confirmed cutoffs.
6. As a member, use `dap clone` with its short-lived read token. Include the
   five archive refs in the local clone. Run A2's repository reader and
   offline replay against that clone, with the explicitly recorded caller
   anchors and omitted-text qualifications. Retain all five reports and
   check the archive objects contain no secret. Register17 and Membership8
   journals stay excluded: their referenced facts and observed values remain
   on the caller's word. Omitted text metadata proves neither its omitted
   bytes nor their bounds.
7. After those hosted readbacks succeed, publish the `/grow/` disclosure:
   the journal is archived in the room's repository, and members can clone
   it for offline replay. There is no public clone URL. Record further
   simulator ticks at their signed cadence.

Archiving copies entries; it does not reduce Room A's held entry count.
F2 supplies the retained floor and its witnesses. F3 separately enables
the floor for Room A, with margin 10,000 and minimum 1,000, and proves the
count falls after a confirmed pass. No production floor is enabled by this
archive configuration. Copies, a clone, or offline replay alone do not
complete the journal-bound obligation.

## Archive stops and restarts

Each archived scope keeps one archive row in its own object. A pass that
runs out of its budget can leave that row in one of two states. A deferral
keeps the row live and tries again later. A stop is durable: the row stays
stopped until a deployment directive clears it. This section tells the
planner how to read a row and how to tell the two states apart. It then
tells how to build, supply, confirm and remove a restart directive. The
code that reads the directive is `packages/scope/src/archive-restart.ts`;
the row checks are in `packages/scope/src/archive-row.ts`. These steps
need the Cloudflare principal that deploys `dap-grow`; no member, route
or MCP tool can restart an archive.

### Read the row diagnostic

Each object logs one `archive-row-diagnostic-v1` line to the Worker tail
when it activates, before any recovery. The line never holds a raw row,
a token or a Mark payload. Its fields:

| Field | Meaning |
| --- | --- |
| `scope` | The scope ID of the object. |
| `state` | `present` when the object holds an archive row; `absent` when it never archived; `unknown` when the read failed. |
| `phase` | The row's phase: `target` (no confirmed pass yet), `confirmed`, `pending` or `stopped`. |
| `reason` | For a stopped row, the stop reason: one of the 25 reasons the archive records (for example `limit`, `timeout`, `unavailable`, `mismatch`, `parent`, `foreign-source-unavailable`, `rebuild-mismatch`), or `unknown`. Only a row stopped with `limit` can be restarted. |
| `confirmed` | The last confirmed position: the repository `commit` and the journal head `through` (`hash`, `seq`). |
| `pendingMark` | A pass in progress, or `absent`. |
| `storedWake` | The durable wake: `pending`, `stopped` and the `next` time. |
| `platformAlarm` | The object's platform alarm time in milliseconds, or `absent`. |
| `rowDigest` | SHA-256 of the canonical row, given only for a row stopped with reason `limit` and no pending Mark. |
| `restartGeneration` | How many directives this row has consumed. A new row starts at 0. |

To read every row of the room, capture the tail and then activate each
object:

1. From a scratch directory, start a bounded tail in JSON form:

   ```sh
   cd "$(mktemp -d)"
   npx -y wrangler@4.147.0 tail dap-grow --format json > tail.json
   ```

   Stop the tail after the read; a tail that runs on leaves a Wrangler
   process behind. Run it under a wrapper that ends the whole process
   group after a fixed time, for example this one, as
   `perl tailfor.pl 1500 npx -y wrangler@4.147.0 tail dap-grow --format json`:

   ```perl
   # Usage: perl tailfor.pl SECONDS command...
   my $secs = shift; my $pid = fork();
   if ($pid == 0) { setpgrp(0, 0); exec @ARGV; exit 127; }
   sleep $secs; kill 'TERM', -$pid; sleep 3;
   kill 'KILL', -$pid; waitpid($pid, 0);
   ```
2. In the operator's established Grow context, make one read of each
   scope. A scope index sweep does this for the whole room:

   ```sh
   dap scope-index inventory --out grow-inventory.json
   dap scope-index sweep --manifest grow-inventory.json
   ```

   The inventory file also records each scope's full reference (`at`:
   `inc`, `kind` and `scope`). A directive needs that reference.
3. Select the diagnostic lines from the tail. Each tail event is one JSON
   object. A diagnostic is a log entry whose first message part is
   `archive-row-diagnostic-v1`. Its second part is the record above.
   One object logs the line once per activation. A quiet object that
   stays warm logs nothing until it activates again.

A stopped row reads like this (Directory, 25 October, trimmed to the
fields that matter):

```json
{"scope":"sc_ryghgistvpshbaznxlbleop5zqruy2kmogy4jeigr7j3yqlewceq",
 "state":"present","phase":"stopped","reason":"limit",
 "confirmed":{"commit":"648de05437006b0fb72877f88dd22593f84c2a44",
   "through":{"hash":"sha256:277efc46fa05f040519c47851a0c099b3da082f9f0f830a416e374f99019a557","seq":1}},
 "pendingMark":"absent","storedWake":{"next":null,"pending":false,"stopped":true},
 "platformAlarm":"absent",
 "rowDigest":"sha256:1e856885bb8db1be5a9a383fa781c51493da85623cfa64e617b21d3555e1e2f5",
 "restartGeneration":0}
```

### Tell a deferral from a stop

A pass that cannot fit its first entry in the budget defers. The pass
line ends with state `retry`, reason `limit` and a `capacityRefusal`.
The row line shows `storedWake` with `pending` true, `stopped` false and
a `next` time. The row stays live. Inside the wake the object counts the
deferrals, from 1 to 32; the count does not appear in the row line. The
next attempt waits 1 second doubled for each deferral, and at most 300
seconds. A confirmed pass resets the count. No directive is needed; the
row tries again by itself.

After a capacity deferral, the next pass of a published row archives
exactly the next entry instead of a batch. Its pass line carries
`fixedFinish`: the cost `used` so far, the `remaining` cost of the
finish, and the `metadataMargin` of 65,536 bytes that the quote adds.
When that complete quote does not fit, the pass line shows
`capacityRefusal` with site `finish-affordability`, kind `finish-quote`
and reserved metadata 65,536, and the row defers again. A later head
that reduces the pass cost takes effect at the next attempt.

Each pass also logs one `archive-pass-diagnostic-v1` line. It gives the
`step` the pass reached (`row-load`, `due-check`, `plan`, `sources`,
`mark`, `send`, `confirm` and others). It gives the `state` and
`reason` the pass ended with, the `cost` it admitted, and `fixedFinish`
(null for an ordinary pass). When a budget check refused work,
`capacityRefusal` names the `site` and `kind` of the check.
It gives six axes (`entries`, `attempts`, `nodes`, `calls`, `metadata`,
`inputWork`) for `requested`, `reserved`, `used`, `limit` and
`shortfall`. The shortfall says what a fix must cut. Report it with the
pass, not a guess from totals.

A pass can still stop a row with reason `limit`. That happens when the
finish quote is null, or when a debit outside the planner's lookahead
refuses: the pass line then shows `capacityRefusal` with site
`plan-debit`. A row stopped before the deferral landed stays stopped too.
A stopped row shows `phase` `stopped`, `storedWake.stopped` `true` and
`next` `null`. It does not retry. Only a directive restarts it, and only
when its reason is `limit`.

### Build a directive

A directive restarts exactly one row, and only the row it names. Build
it from the diagnostic, the inventory and the deployment settings; never
from another scope or from a guess.

1. Check the diagnostic: `state` `present`, `phase` `stopped`, `reason`
   `limit`, `pendingMark` `absent`, `storedWake` with `stopped` `true` and
   `next` `null`. Note `rowDigest`, `restartGeneration` and `confirmed`.
2. Compose the row as the object stores it, with these fields and no
   others:
   - `v`: 1.
   - `at`: the scope's full reference from the inventory file.
   - `repository`: `host`, `id`, `name` and `namespace`. The row copies
     them from the Destination's repository item; they are not the host name in
     `ARTIFACTS_CONFIG`. On `dap-grow` every row of the room names the
     same repository. Its host is `artifacts` and its namespace is
     `artroom-demo`. Its `id` and `name` both equal `repositoryName` in
     `GROW_ARCHIVE_CONFIG`.
   - `format`: `sha1`.
   - `confirmed`: `anchorsPublished` true, `commit` and `through` from the
     diagnostic, and `layout` 2.
   - `pending`: null. `attempts`: 0. `next`: null.
   - `stopped`: `{"reason":"limit","where":null}`.
3. Serialize the row in canonical JSON (RFC 8785: keys sorted, no
   spaces) and take its SHA-256. It must equal the diagnostic's
   `rowDigest`. If it does not, the stored row differs from the one you
   composed. The two fields the diagnostic does not show are
   `anchorsPublished` (present or absent) and `stopped.where` (null or a
   step name); try those variants only. If no variant matches, stop:
   a directive built from a wrong row is refused and the stop stays.
4. Compose the directive with exactly these fields: `v` 1, `at`,
   `repository`, `format` and `confirmed` as in the row, and `rowDigest`.
   Add the diagnostic's `restartGeneration` as `generation` and an
   absolute `expires` time. Write the time as `YYYY-MM-DDTHH:MM:SSZ` with no
   fraction; a `.000` fraction is refused. Choose a short window that
   covers the deploy and the objects' turnover, for example six hours.
5. Take the SHA-256 of the canonical directive without `command`, and
   add it as `command`. Serialize the whole directive in canonical JSON.
   It must be at most 8 KiB.
6. Run the real parser on the value before any deploy. From the reviewed
   checkout, write a short script that calls `readArchiveRestart(raw, now)`
   from `packages/scope/src/archive-restart.ts`. It returns null for a
   value the Worker would refuse, and the parsed directive otherwise.

The directive that restarted Room A on 24 October, as deployed:

```json
{"at":{"inc":"in_utplzcz25syvvy7dqkb4jniwmi","kind":"lane","scope":"sc_2dn76oxegateryveqeoxx2wqov6rv4z6yepreht3y5h3u5lw7gqq"},
 "command":"sha256:1a96ec607b427808eef652b0bad61331dc102f824917dbfcec837bd94634e804",
 "confirmed":{"anchorsPublished":true,"commit":"11cae5e5f9c80327f1a3df9c5e49c2a025d02956","layout":2,
   "through":{"hash":"sha256:d3ac27816ad942cbe344eb9e5b2f6d4334a2709b548b53d9ebc31b2f59396f67","seq":146}},
 "expires":"2026-10-25T06:30:00Z","format":"sha1","generation":0,
 "repository":{"host":"artifacts","id":"ryghgistvpshbaznxlbleop5zqruy2kmogy4jeigr7j3yqlewceq-1",
   "name":"ryghgistvpshbaznxlbleop5zqruy2kmogy4jeigr7j3yqlewceq-1","namespace":"artroom-demo"},
 "rowDigest":"sha256:8a148e2bf603e0dacd212449f2b6c9e4ce1062fcc24a7c3825d05fb11e84e7da","v":1}
```

The line breaks above are for reading; the deployed value is one line.
Both digests reproduce from the row and directive composed as in steps 2
to 5.

### Supply the directive

The directive is a plain setting of `dap-grow`, `ARCHIVE_RESTART_DIRECTIVE`,
read by `apps/room/worker.grow.ts`. Supply it on the ordinary deploy
command, from a scratch directory, as a `--var` value:

```sh
DIRECTIVE="$(cat directive.json)"
npx -y wrangler@4.147.0 deploy --keep-vars --config "$ARTROOM_REPO/apps/room/wrangler.grow.jsonc" --var "ARCHIVE_RESTART_DIRECTIVE:$DIRECTIVE"
```

Deploy the same reviewed source that is live, so that the only change is
the setting. Record the Worker version. The Worker holds one directive at
a time, so restart one row for each deploy. A request body, header or
route cannot supply the directive, and the other room Workers ignore the
setting.

### Confirm the restart

Objects still run the previous version for some minutes after a
deploy. Wait five minutes, then activate the target object with one read.
The object reads the directive after its diagnostic and before it
recovers its alarm. When the directive is applied, the row's stop is
cleared, the wake is set one second ahead, and the restart generation
increases by one. Confirm it from the next diagnostic line of that
scope: `restartGeneration` is one more than before, `storedWake.stopped`
is `false` and `next` is a time. Later lines show a larger
`confirmed.through.seq`. When the next entry does not fit, the pass log
shows a deferral or a capacity refusal instead.

The Worker logs nothing for a refused directive; the diagnostic is the
only sign. If the line still shows the old generation and `phase`
`stopped` after activation, the directive was refused. The causes are:

- The expiry has passed.
- `generation` is not the row's current generation.
- The row differs from the directive in `rowDigest`, `repository`,
  `format` or `confirmed`.
- `at` is not this object's scope.
- The row has a pending Mark, a `next` time or attempts.
- The scope is not active, or the Worker has no archive policy.
- A driver or alarm was active at that moment.

For the last cause, one more activation is enough. For the others, build
a new directive and deploy again. A new expiry changes the `command`
digest, so the new directive is distinct from the old one.

A directive that was applied stays harmless while it is set. On each
later activation the object sees the same `command` at generation plus
one and does nothing. After its expiry it is refused, and that also
changes nothing.

### Remove the directive

Remove the setting at the next `dap-grow` deploy. `--keep-vars` keeps a
setting that the file omits, so this one deploy runs without it:

```sh
npx -y wrangler@4.147.0 deploy --config "$ARTROOM_REPO/apps/room/wrangler.grow.jsonc"
```

Secrets are held separately and survive. A deploy without `--keep-vars`
drops every plain setting that the file does not set. So, before you run
it, read the live version's settings and list every plain setting that
is not in `wrangler.grow.jsonc`:

```sh
npx -y wrangler@4.147.0 deployments status --name dap-grow --json
npx -y wrangler@4.147.0 versions view "$LIVE_VERSION" --name dap-grow --json
```

Carry each such setting on the removal command as a reviewed `--var`,
or stop. On 25 October the live plain settings of `dap-grow` were
exactly the file's eleven. After the deploy, read the new version's
settings and check that `ARCHIVE_RESTART_DIRECTIVE` is absent:

```sh
npx -y wrangler@4.147.0 versions view "$VERSION" --name dap-grow --json
```

Record the deploy and the version in the workroom, under the request
that asked for the restart. Record the row's generation before and
after, and the first pass outcome.
