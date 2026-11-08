# Live record: dap-demo on Register 26

Status: record of the live switch and scenes that the
[demo register packet](2026-11-05-failed-claim-register/deploy.md) asks for.
Parent request `8a8902f3` stays open until this record lands. The planner
then decides its acceptance in a separate act.

The planner switched dap-demo to the failed-claim cohort's Register 26 on
6 November and kept Register 17 installed. Old rooms kept their children,
clones and Sites. On 7 November a new scratch room on Register 26 ran through
the real CLI. Its one-hour read token cloned the room, and after the hour the
same credential was refused with HTTP 403 "Invalid or expired token".

Times are EST unless marked UTC. The evidence manifest is
[2026-11-07-demo-register-26-live-record.manifest.json](evidence/2026-11-07-demo-register-26-live-record.manifest.json).
Credential bytes, member homes, the rendered configurations and the clone stay
in the private rollout directory. The unit `2026-11-06-demo-register-cutover` also holds
the 7 November token files, and its `timeline.txt` gives times without dates:
lines from 08:15 on are 7 November, and the 09:17:12 qualification line follows
the 09:18:10 line.

## Source and settings

The planner deployed from a checkout at `93c1600b`. It contains the host
authority landing `a4e62771` and the packet landing `26fc8e0b`. The packet's
`render.mjs` rendered both stages from `apps/room/wrangler.demo.jsonc`
(SHA-256 `87bb65bb…`, equal to `packet.json`).

| Stage | Rendered config SHA-256 | Deployment ID |
|---|---|---|
| Install | `7c33b0cdb438bc0eb15d3cb474c52b13d44b1c164868bfcc0c5f83b480498175` | `5ce6ac72-c63f-421c-8866-d57eee8d8de3` |
| Offer | `14fb81a152cf646867ddcd9a3ddfab83e816f8c5fe054f4e1f6ce83983e0bca6` | `ab0f3784-5a7d-45e2-b4d4-00f33a595eaf` |

The offer configuration differs from the checked-in file at `93c1600b` in four
settings and in `main`, which names the checkout's absolute
`apps/room/worker.ts`:

| Setting | Value |
|---|---|
| `REGISTER_SCOPE` | `sc_zm56yco5zyx7n3kx7e5jcxz55q5wp7y2lcuy2ialj7r7mzzcarjq` |
| `INSTALLED_REGISTER_SCOPES` | `["sc_b5q435os6lggypatelcltqzvul4kqxzdaaxpmybvwumsmxwj2djq","sc_zm56yco5zyx7n3kx7e5jcxz55q5wp7y2lcuy2ialj7r7mzzcarjq"]` |
| `ARTIFACTS_CONFIG` | the checked-in value with `registerScope` set to the new register |
| `DEMO_START_CONFIG` | `{"v":3,"origin":"https://dap-demo.inguz.workers.dev","deployment":"dap-demo","register":{"kind":"register","scope":"sc_zm56yco5zyx7n3kx7e5jcxz55q5wp7y2lcuy2ialj7r7mzzcarjq","inc":"in_q4heevf4laa43j5ehocmjn54wq"},"definition":"platform:register@26"}` |

The install configuration differs only in `DEMO_START_CONFIG`, which kept the
Register 17 offer and so closed the Page offer until the second stage.

The same source went to dap-grow as `d10ef108-74fc-4e0c-bf87-fc8c741d1d3d` and
to dap-lending as `721cb866-e30a-4029-94bc-5addae1ddbaf`, from their
checked-in configurations with no change.

At 06:35 on 6 November the planner deployed main `e50d9eeb` to dap-demo from
the same offer configuration, as `83d7baf2-12c4-4a0c-9937-238d87be8955`
(`55b77e8b`). Register 26 stayed current.

## The switch, 6 November

| Time | Step | Result |
|---|---|---|
| 00:01 | Operator census | 115 scopes (`00-census.stdout`); 13 rooms and one register, Register 17, as in `packet.json` (`9f4eb5f1`) |
| 00:02–00:04 | dap-grow and dap-lending deploys | exit 0 |
| 00:05:28 | `dap install --plan … --register-policy open`, no `--cohort` | `sc_zm56yco5…` under `platform:register@26`, host `artifacts`, namespace `dap-demo` |
| 00:06:33 | Install-stage deploy | `5ce6ac72`, exit 0 |
| 00:06:36 | `dap install --planned` | Installed as planned, incarnation `in_q4heevf4laa43j5ehocmjn54wq` |
| 00:08:20 | Offer-stage deploy | `ab0f3784`, exit 0 |
| 00:08:31 | Checks | `/health` 200 three times, sessions `ok`, register `ready`, Artifacts `wired`; `/v1/demo/creation-offer` names the new reference, `platform:register@26`, `artifacts`, `dap-demo`, `open`; `POST /mcp` 404 |

The Page offer was closed from 00:06:33 to 00:08:20, 1 minute 47 seconds.
The default plan named Register 26, so `dap install` and the Page offer both
use the new cohort by default.

## Old rooms after the switch

The J5 TEST room (Directory `sc_bh3sl22s…`) served as the old-root room.

- Site, 05:13:10 UTC, deployment `ab0f3784` (`72e9b1f5`). A curl GET of
  the room's `README.md` Site URL answered HTTP 200, 2,111 bytes,
  SHA-256 `f536e554…`, equal to baseline `04b416dc`.
- Child birth and clone, 11:02:34 UTC, deployment `ab0f3784` (`d9a635d2`).
  The builder ran these with the existing @vic3 home after Hugh approved the
  run. A new TEST issue lane `sc_aaxv6rbt…` opened, exit 0. A real `dap clone`
  exited 0 at head `9f9f637c`, equal to the baseline.
- The same run's scripted Site fetch got HTTP 403 with body "error code: 1010".
  Ruling `ec5b86e0` classed it as Cloudflare's edge refusing the client's
  signature and ordered no rollback.
- Follow-up, 12:04 UTC, deployment `83d7baf2` (`0687e0f4`). The lane's genesis
  names the J5 Directory, whose genesis names Register 17. The member's reads
  show the baseline pins: Directory 16, Membership 8, Rules 10,
  Destination 12 and Inbox 1. A curl GET of the Site file again matched the
  baseline.

The checks span two deployments, `ab0f3784` and `83d7baf2`. Both use the same
offer configuration.

## Scratch room, 7 November

At 08:15 the planner ran `dap create failed-claim-hosted-20261105 --handle
@failedclaimwitness` from a new home. It exited 0:

| Scope | ID | Definition |
|---|---|---|
| Directory | `sc_degepxtn6oxtmemzd45wxpkdrem7bpnon6xexlzevnfipy4rafhq` | `platform:directory@25` |
| Membership | `sc_s335xq2u444cuxurbhqfvnrdncncupkzi33r5ktpylvtpst6mzsa` | `platform:membership@12` |
| Rules | `sc_imylvpdl57orqyuhdxaxjzpukg34snpt64n26urqoseeones3q3a` | `platform:rules@10` |
| Destination | `sc_mdqalhagfdulhrxenkc35bd4acyreeqeo4ixmjlstzhbq6euwooq` | `platform:destination@19` |
| Inbox | `sc_xodj55cck2uajnmhgb6zr32py6ktuynelkmrgqyskh5gixcf2xvq` | not read; `platform:inbox@1` is the only Inbox definition in the creation pins |

The Inbox genesis is at 13:15:14 UTC and makes @failedclaimwitness its party.

## Token scenes

The packet's observer `token-clone.mjs` (SHA-256 `eb06b675…`) requires the
clone remote to start with `https://dap-demo.inguz.workers.dev/git/`. The
CLI clones from the Artifacts host
`https://6e953d231f1c9aadffbf59537a82e13a.artifacts.cloudflare.net/git/dap-demo/`.

1. Attempt 1, 08:15:33. The CLI's read-token act `sc_mdqalhag…:8` was
   accepted with fields `{}`. The observer then stopped at its host assertion
   before Git ran, exit 1. Its credential was never used or kept.
2. Attempt 2, 08:16:33, with a copy that differs only in those two
   assertions (`token-clone-artifacts.mjs`, SHA-256 `dba7ef31…`). The
   read-token act `sc_mdqalhag…:10` was accepted at 13:16:35.566 UTC with
   fields `{}` and one grant. Its outcome `:11` is at 13:16:36.137 UTC. The
   token ends at 14:16:36.137 UTC, one hour after the outcome. The real clone
   and the journal fetch both exited 0. The observer kept the credential at
   mode 0600 and recorded its digest.
3. Replay was not reached. The clone holds only `refs/heads/main` at `1c94252`.
   The room has no journal archive binding, so it publishes no
   `refs/artroom/journal/*`. The replay command answered "offline archive
   command could not complete within its bounds", exit 2.
4. After the hour, 09:17:10. The digest check passed. The observer's after
   phase ran a real Git clone with the same credential at 14:17:11.639 UTC.
   It exited 128 and requested no new token.
5. The runner `archiveRun` in `packages/cli/src/git.ts` discards Git's output,
   so exit 128 alone does not separate a refusal from a transport failure. At
   14:18:09 UTC a paired probe (`16-expired-refusal-probe.mjs`, SHA-256
   `4c87f21e…`) ran `git ls-remote` against the same remote:

   | Request | Exit | Git's error |
   |---|---|---|
   | Same expired credential | 128 | HTTP 403, `remote: Invalid or expired token` |
   | No header | 128 | an authentication challenge (Git asked for a username) |

   The same Git 2.54.0 cloned with this credential at 08:16, so the 403 is
   not an edge block of the client. The probe proves that the provider
   refused the expired token.

The packet does not cover a download already under way when a token expires.
No clone in this record crossed the one-hour boundary.

## Deviations and failed attempts

- Token attempt 1 failed at the observer's wrong host assertion. Attempt 2
  used a corrected copy.
- The after phase could not show the provider's refusal, so the paired probe
  supplied it.
- The live replay did not run, because the scratch room has no journal
  archive binding.
- The builder's scripted Site fetch got the edge's 403, and curl checks
  replaced it.
- The builder's tool first refused the old-room run with an existing
  member's home (`5cbb2dad`), until Hugh approved the exact run.

## Limits after the record

- Config sync `4d262a0d` landed on main `9d96cf25` on 7 November at 10:53.
  It brings `apps/room/wrangler.demo.jsonc` into line with the offer
  configuration and corrects the host assertions in the packet's
  `token-clone.mjs`. From `9d96cf25` on, the planner deploys dap-demo from the
  checked-in file.
- dap-grow keeps its register. Its archive bridge still checks one root.
