# Provision and run the Grow demo

Run status: preparation. No hosted Grow room, release packet, simulator
Worker or live tick has been created by this work. Finish the signed packet,
Worker entry/configuration and installed native tick witnesses before exact-head review.
Planner deploys and runs this procedure after that review. Local builder
checks and dry runs create no Cloudflare resources.

Use the reviewed, landed checkout and preserve each original request and
receipt. The final implementation note must print the exact expected release
and publisher from `dap pack`; neither has been produced for this demo yet.
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

1. From an owner-only operator `DAP_HOME`, prepare the native
   `device-application` cohort against the operator-selected hosting origin.
   Follow [deployment](../../docs/deploy.md) for the plan's exact register
   and provider configuration. The cohort is Register16, Directory15,
   Membership7, Rules9, Destination11 and Inbox1. It does not upgrade an
   earlier room.

   ```sh
   node packages/cli/bin/dap.js install --plan "$GROW_SERVICE" --cohort device-application --host artifacts --namespace "$GROW_NAMESPACE"
   ```

   Proving read: retain the plan's original signed identity and confirm the
   selected host configuration names that exact register and namespace.
   Complete the same plan after the reviewed host is configured; do not
   silently replace an attempted plan or its custody.

2. Finish that original install and claim the room as its operator.

   ```sh
   node packages/cli/bin/dap.js install --planned --cohort device-application
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
   Membership7, the key kind is agent, its member is `@grow-sensors`, that
   member's controller is the operator, and its inbox is active. Record public
   IDs, not the key or private link. This enrollment must precede application
   installation: G5a requires an existing active owner.

5. Repeat invitation and enrollment for `@grow-climate` in its own private
   config directory, with a different generated key and the same operator
   controller. Enroll both agents before installing the application. Read
   the full MemberRefs and active keys, exact controllers and Membership7
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
release/publisher row printed by `dap pack`, following
[Trusted application screens](../../docs/deploy.md#trusted-application-screens).
No trust setting or publisher secret is supplied by this checkout.

Use the recorded URI and release, an explicit kept request key and the full
sensors MemberRef as `--owner`. Select only the final signed package's
reviewed role defaults: admin, maintainer, member and agent. Genesis values
are a JSON object containing `label` and the actual full MemberRefs named
`sensors`, `climate` and `operator`. Set owner to that exact sensors member.
Site forwards all three assignments to each Room it creates.

```sh
node packages/cli/bin/dap.js install "$GROW_PACKAGE_URI" --release "$GROW_RELEASE" --request "$GROW_INSTALL_REQUEST" --owner "$GROW_SENSORS_MEMBER" --values "$GROW_GENESIS_VALUES" <reviewed --role selections>
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

Commission the four zones and their twelve devices through the application's
actual acts, then bind each zone's devices. Read every assigned ID and
revision; no scenario fixture ID is an operational input. Initial heater
commands must have native owner records and reservations. Read the full
sensors/climate assignments and demonstrate their cross-principal refusals
before scheduling the driver. The final native witness and exact commands
for these demo-only declarations remain to be added here.

Invite the operator and head grower as people into their separate AI-app
custodies; invite a tender as member when a visitor asks. Verify their
admitted person keys, full membership identity and actual domain actions.
Role updates replace whole lists: preserve the existing native actions.
No public uninvited tender seat exists. The operator's seat and sensors key
are never visitor credentials.

## Start the separate simulator

The final Worker entry module and Wrangler configuration remain pending the
actual reviewed G5a integration and signed packet. The prepared scheduled
host uses `GROW_BINDING` for public configuration and
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

After setting the agent secret and deploying, retain the actual Worker
version and trigger readback. Proving read: observe an actual native reading
summary, device reports and G5a owner preparation, with their sensors signer
and command fact. Verify the independent reported, target and outcome slots,
the reserved-answer count and the next recorded tick. Retain a missed-tick
recovery separately from a dry run. Exact unresolved-request recovery and
application-journal cursor readback are required before this step is ready.

The client allowance is 96 reads, 48 mutations, 256 KiB of request bodies,
4 MiB of retained reply chunks and a 45-second window. The host uses a
five-second per-request SDK deadline. Each tick answers at most eight open
commands, scans at most four pages/800 entries/64 command changes, and
takes at most eight climate acts. The final installed integration must
verify these limits. The sensors' observe transition records the durable
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
this runbook claims no S2b export or A0b production admission.
