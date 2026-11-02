# Bind a new unpublished room to one reviewed GitHub repository

## What changed

Source child `d5cc652b614eb7be082a3fa1c2ea5bad17145157`, promise
`235eb36d810d351401452e9cc87477092c417095`, owns this implementation.
Parent `3c6ec378acee56d988104be178471106b65f0e07` owns the later real mini
scene and its reviewed record. This head does not claim that scene or close
the parent. Rulings `e249d290` and `2149c786` establish that split.

Product, tests and configuration freeze at
`ac8386c7a2e6e2fa7741e04c89f559ae82a5ad20`, tree
`fcbae5f7eaaf204cb2728f8153ced45f7af84b19`, above main
`04f4af480be161c94f3df745747ab7fd68755314`. The review record adds only
this note and its manifest after that source checkpoint. Documentation
checkpoint `8395ec7065c775383d8e7e055448f1478b28e061`, tree `e788252e3dbaf9c81fa7c72873d69c271238956f`, records the first note and
manifest check. The final record adds that check row and its sealed unit.

The new opt-in `repository-binding` cohort has Register 25, Directory 24,
Membership 11, Rules 10, Destination 18 and Inbox 1. A room starts without a
repository, accepts ordinary content, and lets an admin bind its unpublished
destination once. Binding records the repository, tells the Directory, and
starts the existing first-head publication protocol. A second binding fails.
Earlier room cohorts cannot gain this action. The default cohort stays fixed.

The private celld helper stages GitHub configuration from private files into
a new project directory. A checked-in nonsecret policy file admits only this
creation family. The planner applies the source and configuration after
checker approval. No deployment, real credential read, repository creation,
App installation change or witness-repository write forms part of the source checks.

## The decisions and why

The [cohort](../../packages/platform/src/repository-binding-cohort.ts)
allocates distinct native versions rather than changing historical evaluators.
Its [definitions](../../packages/platform/src/repository-binding-cohort-data.ts)
reuse existing unpublished birth and publication behavior. Register 25 checks
its exact Directory 24 genesis. Directory 24 accepts repository metadata only
from its recorded full destination reference. Membership 11 grants
`destination.bind-repository` to admins by default. An ordinary enrolled member
lacks that grant. Destination 18 permits binding only while unpublished and
without a recorded repository, head or token. Its first-head attempt belongs
to the actual branch item. The repository slot is mutable in this new version
because binding fills it after birth; the action's guards enforce bind-once.
All historical pins, declaration texts and evaluator paths remain unchanged.

The native judgment validates the GitHub repository record and branch before
it records binding. A shared pure branch validator keeps the Native package
within its existing dependency boundary. It uses the same ASCII branch
profile and 255-byte full-ref bound as the Git adapter, including the
`refs/heads/` prefix. The configuration parser uses the same validator.
The exact family also joins the existing invitation, session, application
lineage, CLI planning and unpublished-status paths. The Page bundle rebuild includes the new catalog and invitation support.
No new HTTP route or RPC export appears. The security inventory retains its existing negative controls.

A native binding alone grants no new outside authority.
[`GITHUB_REPOSITORY_BINDINGS`](../../packages/scope/src/github-repository-bindings.ts)
is a nonsecret, closed JSON list of full destination references, repository
records and branches. It accepts at most 64 rows and 65,536 UTF-8 bytes.
Duplicate destination references and duplicate repository-ID/branch pairs
fail validation. Missing configuration grants no later-bound destination
outside authority. A malformed list closes the whole configured GitHub wiring.
The repository namespace must equal the configured App account. Health reports
configuration readiness, not authorization for any destination pair.

The [outside factory](../../packages/scope/src/github-wiring.ts) first keeps
its existing configured-register, verified native-birth, host and namespace
checks. A destination that gains a repository after birth additionally needs
an exact match for its full current incarnation, repository and branch.
That condition gates effect admission, snapshots, credentials and recovery
through the existing shared authority closure. The Worker includes the new
map in its wiring-cache fingerprint. A map change creates a new outside port.
Repositories attested at birth keep their historical authority path.

With an independent read credential, the
[GitHub provider](../../packages/scope/src/github-host.ts) checks the
repository name's stable ID and the App installation before either token
POST. That path retains its existing request sequence.

Ruling `3cfac8c2` changes the real witness setup to Hugh's existing
**Artroom Demo** App, with no second static read token on the mini. The
installation selects all 26 organization repositories and holds
Administration write, Contents write and Metadata read. Its App key can
mint tokens across that installation. Software checks on individual
requests do not narrow the key itself. The self-host guide says so and
names a one-repository installation as the stronger operator choice.

The explicit `installationReads: true` proposal supplies private reads
without a second static token. It requires `privateRepositories: true`,
`publicReads: false`, and no supplied `GITHUB_READ_TOKEN`. It closes the
outside port for historical or birth-bound destinations in this mode.
The existing independent-read configuration remains the default.

After the exact operator-pair check, the provider validates the App
installation, mints a Contents-read token for the one recorded repository
ID, and validates the returned token's exact repository scope and
permissions. It uses that token to verify the repository name and stable
ID before Git. A member read-token operation can reuse that verified token.
Publication gets a separate one-ID Contents-write token only after those
checks. A wrong repository ID, suspended installation or widened token
response prevents Git access and publication. The provider requests no
Administration permission. These controls follow
[GitHub's installation-token restrictions](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/authenticating-as-a-github-app-installation).

Planner report `e54eb71854e5558f890ee2cd21fa86bc1118bb45` accepts the
read-only subset and verification order as built at `ac8386c7`. Its point 4
also says tokens live only in memory. Provider-only lookup/Git-read tokens
have that lifetime; publication and member credentials retain the existing
private SQLite custody through `DestinationHost` and `CredentialStore`.
That custody holds plaintext outside public history and recovers the same
mint attempt across restarts. The source changes no custody protocol.
The planner must clarify the blanket sentence before this record can claim
that the complete ruling matches the code. No real App key or token enters
these tests.

The [configuration helper](../../apps/room/celld/mac/prepare-github.mjs)
requires an owned private project and the maintained Worker entry and
settings. It matches the App configuration's register to `REGISTER_SCOPE`.
App configuration and binding lists are nonsecret inputs. The private key
and any legacy static read-token file must belong to the caller and have
modes 0600 or 0400. The helper accepts a PKCS8 key file, an optional legacy
read-token file and an optional binding-list file.
It validates the complete configuration with the production parser before it
stages anything. It preserves the original project and session secret, refuses
an existing output path, and creates the new directory and files with modes
0700 and 0600. It makes no network call. A write failure can leave only a new
private partial output directory; it never overwrites the original project.
The deployment validator independently checks the staged shape and bounds.

The [self-host guide](../../docs/self-host.md#bind-a-new-room-to-github)
names the two staged deployments and every human GitHub step. Earlier H3
rooms cannot bind. Moving their content into a new room requires a deliberate
new room and content transfer; this head supplies no migration. The policy
file in this head contains only admitted native pins, not a fabricated App or
repository configuration.

The new Native workflow owner runs real SQLite-backed scopes, private read
sessions, invitation enrollment, authority judgments and inter-scope delivery.
It writes issue content before binding, refuses the enrolled ordinary member,
accepts the admin, retains the earlier Directory prefix and issue journal,
updates Directory metadata, and records exactly one mint and one first-head
request before refusing a second binding. Its Git port supplies scripted
answers. It proves native state and dispatch, not a real GitHub write or the
later proposal/review/merge scene.

The first frozen gate at `6f86a0c2` failed six Node cases in three files.
The new Native file crossed the protected pure-Git parser boundary; the
security inventory lacked the new setting and reviewed source seals.
Counting, plain and Native stages never ran. The repair changes production
code, so the document-only exception does not apply. The next gate at `4e98260079` passes Node and counting checks but fails
five plain cases: the catalog lacks four new independent digest literals,
the CLI refusal fixture names the old cohort list, the Page join fixture
expects a secret rather than Membership 11's proof, and the Page module
needs a rebuild. All 88 historical goldens stay exact. The repair adds the
four observed literals, updates those two fixture expectations, and rebuilds
the generated Page module. It changes production bundle bytes, so neither
limited follow-up exception applies. The third gate at `b3da6de3f4` passes Node, counting and plain checks,
then fails one Native case. The shared session fixture selects
`git.example` for the new Register 25, whose native host-choice rule refuses
that host. Adding this pin beside the fixture's existing unpublished and
Commons GitHub choices lets the unchanged whole owner pass all 23 cohort
cases. The shared helper has importers, so the isolated test-file exception
does not apply. The later App-only production change also requires a fresh
full gate. All three earlier runs remain failures.

## The final evidence

The [evidence manifest](evidence/2026-11-02-repository-binding.manifest.json)
records 195 files in 9 readonly units. Its SHA-256 is
`4eff8f21871ba804d34e0c1c5fb6af3eda1f17aef62bd8b46db40379bd895980`. Keep every unit and indexed private raw output for at least
30 days after landing. Each table digest hashes a safe output record;
those records identify the actual raw output by byte counts and hashes.
Gate timings use `/usr/bin/time -p`; focused durations use the driver's
monotonic wall clock. Numeric extracts take counts from runner summaries.

Earlier focused commands ran on successive uncommitted drafts above
`04f4af48` or `6f86a0c2`; they do not claim the final frozen source. The
App-only gate owns final composition. The App-only unit's `source-freeze.json` records
every changed file hash and a clean source tree. `focused-attempt-summary.json`
keeps every draft exit and allowlisted numeric counts. The private output
index identifies retained raw stdout and stderr by bytes and SHA-256 without
exposing credentials or request bodies. No raw private output enters this
repository or the public evidence directory.

| Check | Command | Exit | Safe output record and SHA-256 | Checkpoint |
| --- | --- | --- | --- | --- |
| Historical declarations and goldens remain exact | Read-only literal comparison at b3, then `git diff --name-only b3da6de3 ac8386c7 -- packages/platform packages/contract/src/invitation.ts packages/client/src/application-route.ts apps/room/page/assets.ts` | 0 | `2026-11-02-repository-binding-app-only/historical-continuity.json`; `36c6ae13c8e775d0fcb6ef4b66a736bb7904c0d69a940e71de19d1b451af3022` | b3 through ac |
| Generated declaration check | `node packages/platform/scripts/pin-native-declarations.mjs --check` | 0 | `2026-11-02-repository-binding-configuration/binding-final-declaration-check.json`; `ec033c7d3209325ee7bef174e90c573ac1ff1cb41f0f9cc1577bbf804208943c` | draft before4e |
| Private helper and reviewed G3 policy | `node --test --test-timeout=60000 --test-reporter=tap apps/room/celld/mac/test/prepare-github.test.mjs` | 0 | `2026-11-02-repository-binding-configuration/binding-g3-node-owner.json`; `982ce82a64ae2b30665b0c97a2e71d4370bd12bf32697742e15f96c49b92de3e` | qualified draft |
| Deployment structure | `/usr/bin/python3 -B -m unittest -v test_deploy` | 0 | `2026-11-02-repository-binding-configuration/binding-python-final-owner.json`; `95b9e75f48fd50c8290c8ca8d0c51880eeb4ab3876c480b39b63181d0b6c9a5a` | qualified draft |
| CLI cohort custody | `node node_modules/vitest/vitest.mjs run --project cli packages/cli/test/install-cohort.test.ts --reporter=verbose` | 0 | `2026-11-02-repository-binding-configuration/binding-cli-cohort-owner.json`; `e0270c65bc214bd21539eccc5469994ffff034381e3986abdbd0ed19bc8c0d86` | qualified draft |
| Opt-in creation policy | `node node_modules/vitest/vitest.mjs run --project scope packages/scope/test/creation-versions.test.ts --reporter=verbose` | 0 | `2026-11-02-repository-binding-configuration/binding-opt-in-policy-owner.json`; `188901ac73be0aba139a38c4acb6f744167bd38edc9693e6ef3023dab0155ec6` | qualified draft |
| Native binding and branch parser | `node node_modules/vitest/vitest.mjs run --project platform --project scope packages/platform/test/unpublished.test.ts packages/scope/test/github-wiring.test.ts packages/scope/test/repository-binding.test.ts --reporter=verbose` | 0 | `2026-11-02-repository-binding-configuration/binding-branch-repair-owners.json`; `238847b08d4f6055d327173bb9abd4972dbfc2c8a8068e39e8c18d67bacc069a` | qualified draft |
| Repaired package and security boundaries | `node --test scripts/active-source.test.mjs scripts/security-entry-points.test.mjs scripts/security-settings.test.mjs` | 0 | `2026-11-02-repository-binding-configuration/binding-security-repair-owners.json`; `ef9611ea65fda06b4425104e771f99cec762188e99170c11755134b3edac5517` | qualified draft |
| Foreign-register control with canonical ID | `node scripts/control.mjs` with the exact arguments in this result record | 0 | `2026-11-02-repository-binding-configuration/foreign-register-g3-control.json`; `6f8645111caf66b028947502de2202fef50579035f3542c4feb91558f9116921` | qualified draft |
| Private input mode control | `node scripts/control.mjs` with the exact arguments in this result record | 0 | `2026-11-02-repository-binding-configuration/private-file-g3-control.json`; `925b2a927a8d1c83e7d7cd9208290b00b2206155823e9d2ec20e3ff844eb3b1c` | qualified draft |
| Independent-read pre-mint order control | `node scripts/control.mjs` with the exact arguments in this result record | 0 | `2026-11-02-repository-binding-configuration/pre-mint-identity-control-request-order.json`; `269022bd2170974a2465e6ad86a64f9e0a25273f02abcdd132bd4e977aea3a55` | qualified draft |
| Enrolled ordinary-member binding control | `node scripts/control.mjs` with the exact arguments in this result record | 0 | `2026-11-02-repository-binding-configuration/ordinary-member-real-session-control.json`; `e9303d75bad0c16428201935524cfaadd6ad5334c35cc95289a46d71e1adca70` | qualified draft |
| Retained earlier draft outcomes | Original command records and numeric extracts; no rerun | varies | `2026-11-02-repository-binding-configuration/focused-attempt-summary-final.json`; `0bc2f4ce6e2e719c9cc1ec71337477624976b0757a85555714ab07a1fc6369ec` | successive drafts |
| Failed full gate 1 | `npm run gate` | 1 | `2026-11-02-repository-binding-gate/result.json`; `5cbee2520357f6e4e6c4298d00e0c5a97219c6a14e495bfaefa3190df0e2e90b` | 6f86a0c2be |
| Failed full gate 2 | `npm run gate` | 1 | `2026-11-02-repository-binding-gate-corrected/result.json`; `c10987684127250ce3d00cf32df92fc5b55e566891b8ec727f56bd1064a9f180` | 4e98260079 |
| Failed full gate 3 | `npm run gate` | 1 | `2026-11-02-repository-binding-gate-final/result.json`; `6ddfe637655c03325c75107d3c24b6d4cfaac6154e43829731ea443a0a941191` | b3da6de3f4 |
| Earlier Page browser run | `gh run view 41451113690 --json databaseId,headSha,status,conclusion,url,jobs` | 0; success | `2026-11-02-repository-binding-page-ci/run.json`; `b6fe94b42c2f53e5ce32e371c174f093ed5cd45d9b8e5499dbf95234295ae5c0` | b3da6de3f4 |
| Shared session fixture, all 23 cohort cases | `node node_modules/vitest/vitest.mjs run --project scope packages/scope/test/session-reference-native.test.ts --reporter=verbose` | 0 | `2026-11-02-repository-binding-app-only/session-reference-cohort-repair.json`; `ea13d8bd04daae57275cecab204cb1e41d4b61f9c07af129b44893a043028237` | draft before ac |
| Git and Scope compiler contexts | `npm run typecheck --workspace @generalbusiness/dap-git --workspace @generalbusiness/dap-scope` | 0 | `2026-11-02-repository-binding-app-only/fixture-repair-compilers.json`; `c011abc6b499a0acd09033e3349b2dbbfeb92e53a0efab0e3baf7226724f209a` | draft before ac |
| App-only provider and wiring owners | `node node_modules/vitest/vitest.mjs run --project scope packages/scope/test/github-host.test.ts packages/scope/test/github-wiring.test.ts --reporter=verbose` | 0 | `2026-11-02-repository-binding-app-only/app-only-provider-wiring-owners.json`; `26faa57c6521e18586052a38d55b0c0d46587f665bf6dcba27dae51350761145` | draft before ac |
| App-only private preparation | `node --test apps/room/celld/mac/test/prepare-github.test.mjs` | 0 | `2026-11-02-repository-binding-app-only/app-only-preparation-owner.json`; `dd568530006ebfb98566e082dfe06f4f8d241328b0dd3ac0fe1aa19edca1920e` | draft before ac |
| App-only deployment validator | `/usr/bin/python3 -B -m unittest discover -s apps/room/celld/mac -p test_deploy.py` | 0 | `2026-11-02-repository-binding-app-only/app-only-deployment-owner.json`; `5844152fc4bbb111a1e848148011e5193b70085b3a908698831764a27ea689cc` | draft before ac |
| Expanded compiler contexts | `npm run typecheck --workspace @generalbusiness/dap-scope` | 0 | `2026-11-02-repository-binding-app-only/app-only-expanded-compiler.json`; `065589f62230f3446c6a7516ac3726a04763bd0fee9c80f035ce95bd2163f41b` | draft before ac |
| Reviewed security inventories | `node --test scripts/security-entry-points.test.mjs scripts/security-settings.test.mjs` | 0 | `2026-11-02-repository-binding-app-only/app-only-security-owners.json`; `2c4bc948e49f68134420a155ea040ad98ad308a87210b02bcea21ce1e31ef66d` | draft before ac |
| Page module equals its build | `node node_modules/vitest/vitest.mjs run --project page apps/room/page/test/assets.test.ts --reporter=verbose` | 0 | `2026-11-02-repository-binding-app-only/app-only-page-build-owner.json`; `eb0739f5df364d082b87a2d133e5ba7694a5ac08fd71e0faf0cdbb97a95d6c8a` | draft before ac |
| Missing repository-ID scope control | `node scripts/control.mjs` with the exact arguments in this result record | 0 | `2026-11-02-repository-binding-app-only/empty-token-scope-order-control.json`; `6bac2e9455cf2767662a01e5eb66df5087216a21a9754e1ce3db9acc8ab73e26` | draft; target hashes equal ac |
| App-only operator-pair control | `node scripts/control.mjs` with the exact arguments in this result record | 0 | `2026-11-02-repository-binding-app-only/app-only-operator-pair-control.json`; `7e8796f57653b72a159449d4cb7bc09b8e7868246ce39aa091ef65e40f54548f` | draft; target hashes equal ac |
| App-only stable-ID control | `node scripts/control.mjs` with the exact arguments in this result record | 0 | `2026-11-02-repository-binding-app-only/app-only-stable-id-control.json`; `952004a80cd74df678cee9421870dce182d9bbfbc2177494e36495fefbdc3f7c` | draft; target hashes equal ac |
| First empty-scope attempt remains inconclusive | `node scripts/control.mjs` with the original promise-matcher owner | 2 | `2026-11-02-repository-binding-app-only/empty-token-scope-control.json`; `59f67205364a2b6d81e968113b2193d0fa1da05e7b8fcbdda7149291ccb31807` | before assertion-order repair |
| Frozen complete gate | `npm run gate` | 0 | `2026-11-02-repository-binding-app-only-gate/result.json`; `eb90171cd9eac7ab17e8eb0675bc87231288e152d5c402a3b3638402c87a85a6` | ac8386c7a2 |
| Exact-source Page browser run | `gh run view 41456309428 --json databaseId,headSha,status,conclusion,url,jobs` | 0; success | `2026-11-02-repository-binding-app-only-page-ci/run.json`; `64802d46e9549f04f31a5ebc63aca3e0c5b5b090fedec838383ff007afb091f3` | ac8386c7a2 |
| Documentation and manifest checks | Commands and actual exits in the safe check record | 0 | `2026-11-02-repository-binding-documentation/checks.json`; `f51441e593c450126329af7dbe821c90f99bb38f67e456ba449fabc7b430ef9e` | 8395ec7065 |

The first foreign-register control survived because its proposed foreign scope
ID was not canonical: the parser refused it before the intended register
check. The corrected control uses a valid foreign ID and distinguishes the
removed guard. The first pre-mint and empty-token-scope controls remain
inconclusive because the runner classified their promise-matcher failures
as errors. The final owners observe request order or zero HTTP calls before
they check captured refusal values. The corrected controls then distinguish
the unsafe requests. Both earlier outcomes stay in the record. Earlier
compiler and native-owner draft failures likewise remain failures; the final
gate at `ac8386c7` supplies composition evidence.

Focused controls remove one real guard at a time, run the whole owning file,
and restore the source. They cover a foreign register, permissive private-file
mode, missing operator-pair authority, skipped stable-ID/installation checks,
and an ordinary-member binding grant. New controls cover missing repository-ID
scope, the operator pair in the App-only mode, and its stable-ID lookup.
The empty-scope owner asserts zero HTTP calls before it checks the same
captured refusal reason. The final member control uses real private sessions. A count of passing fixtures alone does not supply those
negative witnesses. No mutation sweep ran.

## The open limits

- Parent `3c6ec378` still requires the planner-approved mini scene: create a
  scratch room without a host, write content, bind the real GitHub repository,
  enroll the agent, submit its proposal, review and merge as owner, and observe
  the resulting commit at GitHub. A reviewed, sealed record must land afterward.
- Ruling `9878af36` accepts the private empty witness repository
  `generalbusiness-ai/dap-g3-binding-witness-20261102`, branch `main`.
  Hugh created that repository and chose the existing Artroom Demo App.
  Ruling `3cfac8c2` replaces the earlier one-repository installation and
  static read-token steps. The planner transfers only the App key to the
  reviewed private input path at mode 0600 after source and configuration
  approval. The planner independently checks the GitHub head through Hugh's
  laptop gh session. Credentials never enter chat, acts or evidence.
- Policy request `3bbf8599` owns the App-only read-token subset and verification
  order. Report `e54eb718` accepts the read-only subset and verification order.
  Its memory-only sentence needs a scope correction for the existing private
  SQLite publication/member custody. The builder requested that clarification
  before ratifying the whole report. This head claims neither a new
  memory-only custody protocol nor acceptance of that unresolved sentence.
- The App and repository identifiers are known under `3cfac8c2`, but the
  real full destination reference and register plan do not yet exist in
  this source head. Parent `3c6ec378` owns the filled App configuration and
  private input path for checker review before the first key transfer and
  deployment. After the scratch room has content, a separate small head adds
  its full destination/repository/branch authorization for checker review
  before the second deployment. The planner owns both deployments.
- Late-bound public Site selection and archive export do not gain support in
  this head. The Site route still chooses repositories from birth evidence;
  the new host-none birth remains unpublished there. Parent `3c6ec378` owns
  any additional publication surface needed by its real scene. This head
  claims the binding action and existing repository command protocol only.
- Next default-cohort request `8a8902f3` follows this opt-in family. It must
  allocate distinct later versions and cannot treat source-child approval as
  the parent's real-world acceptance.
