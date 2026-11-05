# Prepare the failed-claim register on dap-demo

## What changed

Request `c448c870cf6a2f93a30c285a1a4d4a6c9f4bd8ad`, builder promise
`f9db5e9e73a857f4a34eb4de468a0ca402406d6e`, prepares the deployment half of
parent `8a8902f3e9ad526371cb0a73db4117bc0197cd60`.
The [planner procedure](2026-11-05-failed-claim-register/deploy.md) supplies
three exact variable templates and a renderer for one hosted Worker.
The builder creates no live register or room, issues no token, and deploys nothing.

The templates keep a planned register placeholder until the real plan supplies
its scope ID. The offer stage also keeps an incarnation placeholder until
installation returns the full reference. The filled values and deployments
need their own later reviewed record. No live Wrangler file changes here.

The existing Workers run source `2883992093b5b2ea54a220dea7f81da0f34cee44`,
according to planner deployment `f419b883ce11119a90a3956acd7520ea39c206fd`.
The builder independently read demo health and its current public offer on
5 November at 05:23 UTC. Health returned 200 and version
`5cc78f9e-3fce-4201-8182-454459e79b07`; the offer still names Register 17.
Source landing `12a718fe` and deployment alone meet no new-register acceptance.

## Decisions and reasons

### Keep the existing Page acceptance path

Three signed read-only censuses use each Worker's existing founding operator
identity and source `28839920`. Each completes without changing its operator
config. The counts describe registered scope rows during the recorded windows:

| Worker | Registered scopes | Directory rooms | Register roots | Repository host |
|---|---:|---:|---:|---|
| grow | 11 | 1 | 1 | Artifacts, namespace `artroom-demo` |
| lending | 8 | 1 | 1 | Artifacts, namespace `dap-lending` |
| demo | 115 | 13 | 1 | Artifacts, namespace `dap-demo` |

Grow and lending tie for the fewest rooms. Demo serves the existing public Page
offer and the Start link, so the packet selects demo to complete that acceptance
path. This choice requires continuity checks for its larger existing room set.
The census cannot prove an empty legacy fleet or complete live-scope coverage.
It misses unregistered objects and can miss registrations below its cursor.

The operator record, source configuration, census, and live offer agree on the
old root:
`sc_b5q435os6lggypatelcltqzvul4kqxzdaaxpmybvwumsmxwj2djq`, incarnation
`in_rjfrmifznpi65vm6y2kbc36xpi`. The previous setting admits this singleton.
Every staged configuration retains it. No recorded root retires.

### Separate installation from the offer's actual incarnation

The [packet](2026-11-05-failed-claim-register/packet.json) pins the source
Wrangler file and its SHA256
`87bb65bbb8bdd4e4239a947cd999726b0ffdbf5c4f4eb3ceb7a529a488d3505e`.
The [renderer](2026-11-05-failed-claim-register/render.mjs) refuses a changed
base and fills only the reviewed settings:

| Stage | Current register and host setting | Installed roots | Page setting |
|---|---|---|---|
| [Install](2026-11-05-failed-claim-register/install-vars.template.json) | Planned Register 26 | Old root plus planned root | Preserve old Register 17 setting; its mismatched host root closes the offer temporarily |
| [Offer](2026-11-05-failed-claim-register/offer-vars.template.json) | Same planned register | Same two roots | Actual installed scope and incarnation, with `platform:register@26` |
| [Rollback](2026-11-05-failed-claim-register/rollback-vars.template.json) | Original Register 17 | Same two roots | Exact original offer |

The renderer writes a new private full configuration with an absolute `main`
path into the reviewed checkout. It preserves other variables, namespace,
bindings, migrations, limits, and flags. It signs, installs, and deploys nothing.
The existing production creation-policy parser already adds the new default
cohort to the file's retained pins, so the templates keep that policy string.

The planner plans the default with no `--cohort` and with
`--register-policy open`, matching the existing public Page policy. A keys-only
register would not supply that offer. Pinning, deployment, and installation
must finish within the original fourteen-minute plan window. The second offer
deployment follows successful installation; it uses that actual incarnation
without inventing one or making another plan.

Rollback selects the original current root and host setting while retaining
both roots for child admission. It grants neither root a Native birth. The
planner still needs actual old-room and any new-room continuity checks; parser
acceptance alone cannot establish them.

### Preserve the distinction between syntax and root authorization

Production `readInstalledRegisters`, `artifactsConfiguration`,
`readPlatformCreationPolicy`, and `demoCreationConfig` accept the filled
configurations with canonical synthetic IDs. They refuse unfilled templates,
a list missing the current root, and a mismatched offer root.

Omitting a historical root is valid parser syntax when the current root remains.
The parser cannot infer the operator's retained inventory. The renderer therefore
checks the required old roots from the reviewed packet and refuses that omission.
Production `admitChildCreation` separately checks the configured root membership
after authenticating the full Native lineage. The existing whole
`packages/scope/test/creation-lineage.test.ts` owner covers retained-root child
admission and unlisted-root refusal. No parser result claims a live child birth.

### Record the real token hour separately

The procedure creates one new TEST room through the real default CLI, checks
its exact six pins, and verifies the actual default Page offer.
The [token observer](2026-11-05-failed-claim-register/token-clone.mjs) wraps the
existing clone command and hardened Git runner. It retains only this TEST
credential in new private custody for a later comparison. It changes no
production CLI behavior. Its wrong-home guard runs before signing or custody
creation; the dry check uses a synthetic invalid home.

The live scene must show an accepted Destination 19 act with fields `{}`, a
real one-hour token, successful clone and archive fetch, and a fresh clone
refused after the recorded actual expiry with that same token. The later probe
must not call `dap clone` and mint a replacement. A nonzero Git exit needs its
provider refusal output; a transport or local failure proves no expiry refusal.

If expiry falls between requests of a clone, the next request fails and a new
`dap clone` starts again. No record here claims that a download already underway
crossed a real one-hour boundary. Token bytes remain outside Git, arguments,
ordinary logs, and public evidence. The observer itself has not run against a
live room in this packet.

## Evidence

The focused manifest and full gate record are pending before review.
The current checks retain exact commands, actual exits, source hashes, synthetic
filled files, and every attempted read. The initial Python public-health probe
received HTTP 403 before saving a response; it made no offer request. The later
Node reads returned 200 for health and the offer. Both outcomes remain recorded.
Node's loader deprecation warning remains in the parser output.

| Check | Command | Actual exit | Output digest |
|---|---|---|---|
| Three read-only censuses | `dap scope-index census --out <new file>` with each existing operator home | 0 each | Pending manifest |
| Public demo health and offer | Two bounded Node `fetch` reads | 200 each | Pending manifest |
| Production parser distinctions | Retained synthetic parser probe | 0 | Pending manifest |
| Filled install, offer, and rollback | `render.mjs --stage <stage> --scope <synthetic ID> ...` | 0 each | Pending manifest |
| Token observer imports and usage | `token-clone.mjs --help` | 0 | Pending manifest |
| Wrong-home refusal before signing | `token-clone.mjs before <new custody> <new clone>` with synthetic invalid config | 1, expected refusal | Pending manifest |
| Complete gate | `npm run gate` | Not run yet | Pending |

## Open limits

- Request `c448c870cf6a2f93a30c285a1a4d4a6c9f4bd8ad` still needs its complete
  gate, independent review, and landing. The planner fills the reviewed copy;
  the later record names every actual value and deployment.
- Parent `8a8902f3e9ad526371cb0a73db4117bc0197cd60` owns the actual new register,
  existing-room continuity, default Page and CLI scenes, actual one-hour token,
  and same-token post-hour clone refusal. None has run in this packet.
- M1–M2 request `1d235b6afb9d435e2d26a334bf08b01da7c7f499` already froze its
  source and started its gate before the builder read this new request. It
  remains frozen while this packet takes priority; this packet edits no derive
  source. Gates do not run concurrently.
- O4 request `c7a090dcf0816675808ba081dc04fc8cc702e224` retains its separate
  host window. Browser control remains unavailable and its invite unread.
  The mini stays off limits.
