# Recover unused OAuth client registration capacity

Request `c37ba98f`, under promise `e597584a`, addresses the capacity finding
`35b3a7a0` from O3 review `353c62ec`. A new dynamic registration now expires
after one hour unless a Native-authorized grant protects it. Registration
removes expired rows before it checks the existing 1,000-row limit.
Anonymous context and metadata lookups never renew a registration.

## Decisions and bounds

The global registry stores an expiry beside each immutable normalized
client record. An internal retention call requires the exact stored record
and a registration that has not expired. It preserves a prior protection
and protects the new grant for at most the existing 30-day grant lifetime.
The issuer caps the new grant at the returned deadline. The code, access
token and refresh token retain their exact client, redirect and audience
bindings. Metadata-document clients keep their existing independent cache.

The agent calls retention only after checking the signed control and fresh
Native authority. It checks authority, its own enrolled state and the
signed deadline again after the reply. The Native control holds a real
registry retention reply, widens the agent's actions beyond its controller's
role, then releases the reply. The grant refuses with 403 and stores no code.
A completed operation replay returns its retained answer and renews nothing.
A retention that succeeds before a later refusal may keep its conservative
reservation until the deadline; no cross-object rollback extends it.

Fresh tables require the expiry column. A pre-upgrade table gains the
column and one persisted deadline 30 days after migration, in one
transaction. That covers pre-upgrade grants. Reconstructing the registry
never renews that deadline. A successful new signed grant may retain its
client again; token refresh alone does not extend the grant or registration.
After registration expiry, a host registers again before another consent.

The capacity owner uses real Durable Object SQLite with an injected clock
and fetch port. It fills the actual 1,000-row limit, refuses another client
while all rows remain valid, then admits client 1,001 after one unused row
expires. A protected client survives that cleanup. Repeated anonymous
lookup fails to keep the unused row alive, and reconstruction preserves
both deadlines. Another case migrates a real three-column old table once.
The issuer owner confirms the retained deadline caps both grant end and
access lifetime.

The existing Native route scene still checks ordinary Membership 13 and
earlier Membership 8 enrollment, exact PKCE and audience, agent reuse,
refresh reuse and revocation. Its held-reply check uses the actual registry
write and Native role table. Only the reply gate, fixture clock and existing
test ports stand in for runtime timing. These runs prove no deployed host,
Claude or ChatGPT behavior. Browser consent code and custody do not change.

Source seals change only for the reviewed OAuth owners and Worker registry
and agent classes. The HTTP matchers, routes and gate classes do not change.
The new internal RPC has no public write route.

## Evidence

The frozen gate runs at `41a4a7e91a03edbce45c39e7fe8f1b556d74e308`, tree
`94f916e1a79b8a9d7c44d0a1f1dec703e9f92044`. It includes the separately
reviewed flush parser, which later lands at `59232978`. Integrating that
landing after the gate changes only the flush note, at intermediate tree
`47a46d3ba7c2e35512d69cc65a22db9096adbd21`. This record adds documentation
and manifests. Production, tests, configuration and dependencies stay
unchanged from the failed gate.

Actual `gate.exit` reads exit 1 after 1,591.993372 seconds on the shared
Mac. Prechecks, compilers and kernel pass. Node passes 133 cases, Counting
56, plain 3,601 with one skip, and Native 1,061 with two skips. Native passes
281 files and skips one. One unhandled `EnvironmentTeardownError` still
makes Native partial: closing RPC while `resolve` remains pending. Vitest
names `packages/scope/test/archive-input.test.ts`; no case fails.

The separate investigation runs only that complete two-case file at the
same clean head and tree. Actual process exit is 0 in 5.514610 seconds.
It is neither a full Native-stage follow-up nor a documented isolated-repair
exception. The full gate stays failed, and no whole suite repeats to chase
the error. The planner must rule on this DCR evidence gap before review.
The flush-specific ruling does not decide this new authorization head.

Focused runs record their actual incremental checkpoint and dirty paths;
they are not one frozen aggregate. Both controls first change one real
production rule, observe its intended assertion failure, and restore exact
source bytes. `source-adoption.json` records the subsequent source commit
and six-path flush integration. Times measure each outer command, not
summed test durations or CPU. Page workflow
[41607711026](https://github.com/generalbusiness-ai/dap/actions/runs/41607711026)
succeeds at the exact frozen source.

| Check | Command | Exit | Public record and SHA-256 |
|---|---|---|---|
| MCP source compiler | `node node_modules/typescript/bin/tsc --noEmit -p packages/mcp/tsconfig.json` | 0 | `01-mcp-source-compiler.json`: `33d686a760155d54eac57c964fe51def3972de507c9bd8febd8dfc1f6e7e69e7` |
| MCP Native owning compiler | `node node_modules/typescript/bin/tsc --noEmit -p packages/mcp/tsconfig.scope.json` | 0 | `02-mcp-native-compiler.json`: `2ecf350cbf9002a21d5fdc3df4bea5e19fc016b15b73612a760c7cdcde500f20` |
| Worker compiler | `node node_modules/typescript/bin/tsc --noEmit -p packages/scope/tsconfig.json` | 0 | `03-scope-source-compiler.json`: `ed4fb6990d0d8667046ab39b58bf9fa679b6ddbd7bb53d67f6d8009a03b88c30` |
| Registry, issuer and routed Native owners: nine cases | `node node_modules/vitest/vitest.mjs run --config vitest.native.config.ts packages/mcp/test/oauth-clients.scope.test.ts packages/mcp/test/oauth-issuer.scope.test.ts packages/mcp/test/oauth-native.scope.test.ts` | 0 | `05-registry-issuer-native-owners.json`: `e74a263603f8291092620f6a16996de281ccd06f08595078b4597c7e8080935e` |
| Permanent-row control: expected recovery failure, source restored | `node node_modules/vitest/vitest.mjs run --config vitest.native.config.ts packages/mcp/test/oauth-clients.scope.test.ts` | 1 expected | `06-permanent-capacity-control.json`: `00ff59109cc05212894cc05f0e6714ad4e5db8b884b71bfa138f42391f191937` |
| Anonymous-renewal control: expected expiry failure, source restored | `node node_modules/vitest/vitest.mjs run --config vitest.native.config.ts packages/mcp/test/oauth-clients.scope.test.ts` | 1 expected | `07-anonymous-renewal-control.json`: `7fcf2f682a2616ee5bc017c114adf2c6386a176e7bc158a6466d78a1e9cec92d` |
| Reviewed source and route inventory | `node --test scripts/security-entry-points.test.mjs` | 0 | `08-security-entry-owners.json`: `2b9362383e460d1b0de5509ade104f6284f0e30c43855646e12f855d7f9ecf0d` |
| Shared helpers | `node scripts/check-shared-helpers.mjs` | 0 | `09-shared-helpers.json`: `bad2f7ca16d1949aa133af1a182d2328540abfa14ead16c9ce546ec722ed8462` |
| Usage owners | `node --test scripts/usage-report.test.mjs` | 0 | `10-usage-owner.json`: `29b534b2986d9d76e8a7a13b2f8dc2d7e5daaab5beef53cf83409517528d03cf` |
| Frozen full gate: Native teardown error | `npm run gate` | 1 | `failure-record.json`: `5c0f60e804fc3568016945ce0b4db7cd57444015d280a424ab7fff3a6bff94c5` |
| Named teardown file alone: two cases | `node node_modules/vitest/vitest.mjs run --config vitest.native.config.ts packages/scope/test/archive-input.test.ts` | 0 | `01-archive-input-teardown-owner.json`: `c892c3b96f47f2bb0bfce624cf806b8b38f46eb68643e565f7ced6dd61e21838` |
| Exact-source Page workflow | `gh run view 41607711026 --json status,conclusion,url,headSha` | 0; success | `page-workflow.json`: `73298e59bf577fef764b2c201ec4cca370e494fe3d8ea933e3cd50298b8cd9af` |

The sealed units retain every public file and its size and digest:

| Manifest | Files | Manifest SHA-256 |
|---|---|---|
| [2026-11-03-oauth-registration-recovery-focused](evidence/2026-11-03-oauth-registration-recovery-focused.manifest.json) | 17 | `cd455978bec85f42b66d2d78cafe8c1bf758fc71e65c072ee9d9cc66d888df5d` |
| [2026-11-03-oauth-registration-recovery-gate](evidence/2026-11-03-oauth-registration-recovery-gate.manifest.json) | 8 | `cb323bc84d2c647ac8f93d6b30554013b8ddbf05f497b90adab094b7117f7ed0` |
| [2026-11-03-oauth-registration-recovery-teardown-followup](evidence/2026-11-03-oauth-registration-recovery-teardown-followup.manifest.json) | 5 | `a8f5d6a29ba4d3fa743ca54d42b89c03e7d727db89c89020e9a4570fb335391c` |
| [2026-11-03-oauth-registration-recovery-ci](evidence/2026-11-03-oauth-registration-recovery-ci.manifest.json) | 4 | `deb52e3774e5403c8d3ffeedb93f54aadb8d401eaa23a58ef31db1eacf2dbe7d` |

Complete raw output stays private, with indexed sizes and digests: 20 focused
files, 29 full-gate files, two investigation files and two CI files. Native
logs can contain test credentials. The terminal gate summary reconciles
final case identities and preserves the one-error end record.

## Open limits and owners

Request `c37ba98f` still needs a planner ruling on this gate failure,
independent exact-head review, retirement coverage and landing. A table
whose 1,000 rows all remain protected can still return 503. Anonymous callers
can consume a new one-hour window repeatedly; this is bounded reclamation,
not a rate-limit claim. Only an authorized Native grant can protect a row
for a grant lifetime.

Request `df2abe35` owns the late module-resolution teardown race after
registration recovery and installed registers `579489e0`. No harness
change belongs in this head, and no gate-pass claim follows from the
focused investigation.

O4 stays closed until this reviewed recovery lands and the planner deploys
its new dedicated Worker. Existing live Workers keep hosted MCP closed.
The planner owns deployment and records any real host refresh retry.
This head claims no O4 or G3 acceptance and continues no original G3 act.
