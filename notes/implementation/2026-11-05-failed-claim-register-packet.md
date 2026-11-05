# Prepare the failed-claim register on dap-demo

Status: changes requested by checker report
`bf2e724f0f39cdfb799abf924a1a3eb189b335eb`. Do not deploy this packet.
Planner ruling `3b239919dd4e5683d1fcfdd9b51d5c23c4b1a9d7` chooses a separate
multi-root host-binding source child. This packet waits for that reviewed source
and another packet review; ruling request `5ff294e1` is answered.

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

### Resolve the host-authority finding before any cutover

The checker found a blocking source fact at main `28839920`.
`artifactsOutside` and `githubOutside` bind host authority to the single host
setting's `registerScope`. `hostBound` requires a Destination's retained claim
to name that exact root. The installed-register list reaches child admission,
the index, and health; it does not reach this host-binding check.

The retained install and offer templates would therefore disable Git hosting
for the thirteen existing demo rooms. The rollback would deny it to new-root
rooms. Their status reads and child births could still pass. This finding
comes from source inspection; no live cutover or failure run occurred.
The passing gate and parser checks establish their recorded boundaries and
do not establish multi-root host authority.

The builder restores the deployment warning and adds an actual old-room clone
after the switch, before the scratch room. The templates and helper code stay
unchanged until the chosen multi-root host-binding source lands.
The remaining sections preserve the rejected proposal and its evidence.

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
credential in new private custody for a later comparison. The procedure records
and checks the credential file digest across the real hour. It changes no
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

The [focused manifest](evidence/2026-11-05-failed-claim-register-focused.manifest.json) seals 18 public files and indexes four private original units. Its SHA256 is `5b3ee8cb600f846de6834bc0d02e91fbd9b84ed683ca8c27a9c6be88b26d650a`. The complete gate also passes at its frozen head; independent review remains pending.
The current checks retain exact commands, actual exits, source hashes, synthetic
filled files, and every attempted read. The initial Python public-health probe
received HTTP 403 before saving a response; it made no offer request. The later
Node reads returned 200 for health and the offer. Both outcomes remain recorded.
Node's loader deprecation warning remains in the parser output.

| Check | Command | Actual exit | Output digest |
|---|---|---|---|
| Three read-only censuses | `dap scope-index census --out <new file>` with each existing operator home | 0 each | `census-summary.json` (`4efbd7b4d3fa61e820c09b550b21702138e35bfa5aa7f9e648abbca22b429f28`) |
| Public demo health and offer | Two bounded Node `fetch` reads | 200 each | `demo-health.json` (`7e98dbfa81274f702bfb07306ebde7838238fde34571511cbe03e2679bf54332`); `demo-current-offer.json` (`ae730c29d3f913d428b8c55a04779130061cee4e24c2b885b05475ffa78a54bb`) |
| Production parser distinctions | Retained synthetic parser probe | 0 | `checks-production-parsers.log` (`5a51ad33c6a23daa697dd881b9a0bc6cfb29ad38209161dbddd9239ee88efbfc`) |
| Filled install, offer, and rollback | `render.mjs --stage <stage> --scope <synthetic ID> ...` | 0 each | `checks-render-install.log` (`31db2369e5e356d02f501b5cadac8c5010f898215035f4657e4d037e236a48ed`); `checks-render-offer.log` (`4daaa2bc0809323b9738862a710eb48d8af21b644ec2585859f6d6ebca6b9d60`); `checks-render-rollback.log` (`211e1776275e624617bc1abf4ead20205087cf6f5d474a1cd65a6cec31e41263`) |
| Token observer imports and usage | `token-clone.mjs --help` | 0 | `checks-token-observer-help.log` (`21c5b78b6aba9c943af306f4819f39e5b32a82d0dcc9ff56ac91cfe53701a55e`) |
| Wrong-home refusal before signing | `token-clone.mjs before <new custody> <new clone>` with synthetic invalid config | 1, expected refusal | `checks-token-observer-wrong-home.log` (`e7a47210729b7da8903157a4fae429babe7be6f9a7a73722f7835fe6d95c1e52`) |
| Complete gate | `npm run gate` | 0 | `result.json` (`5bad356f1d22b687a656feb4858bc10e5accef515348bb5c0a16fcd237edee0f`) in the gate manifest |

The [gate manifest](evidence/2026-11-05-failed-claim-register-packet-gate.manifest.json)
has SHA256 `0e327cb81c035daf4f1798d8839596a3d5a817adef633af61a48cc9c343d3764`. Its 13 public files index 2,281 private originals.
The actual `gate.exit` reads `exit 0` at
`62faea1350d4c1d11518127741e747e9c24fb947`, tree
`721f9ca92405fc73ef6c40f57a930e41a502f922`. Kernel, 135 Node cases, 56
Counting cases, 3,925 plain passes with one skip, and 1,103 Native passes with
two skips all have complete terminal evidence. Both Vitest ends report zero
unhandled errors; the summary reports no contradictions. Its 99 extra Node
events describe 33 entry-file wrappers, outside the case count. The only absent
final module duration belongs to the skipped Page record owner.

The gate records UTC 05:41:20.776461–06:08:57.410433 on 5 November.
Python monotonic time measures 1,656.629607 seconds; the retained outer `time`
reports 1,656.54 seconds. These are distinct measurements. The checkout and
dependency identity stay unchanged, and its owned process group closes.
The M1–M2 gate had already closed at 05:40:49.715631, so the gates do not overlap.
An idle-sleep assertion applies only while the actual gate runs. The passing
archive owner takes 265,038 ms and establishes no cause for request `64552d40`.
Earlier cohort failures remain failed.

At reviewed head `f9941195`, the post-gate changes were only the procedure,
this note, and the new gate manifest. The procedure adds the private credential
digest check. The later response to `bf2e724f` also restores the host-authority
warning in `docs/deploy.md` and adds the old-room Git check. All helper code,
templates, production code, tests, dependencies, and live Wrangler bytes retain
the exact gate inputs. These documentation follow-ups need no second gate.
Planner ruling `ef31035a8d14c68d2d402f928ca946bfee63bb04` accepts demo as the
right Worker and requires an actual old-room child birth before the new scratch
room. The procedure keeps that order.

## Open limits

- Request `c448c870cf6a2f93a30c285a1a4d4a6c9f4bd8ad` still needs independent review
  and landing. The planner fills the reviewed copy;
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
