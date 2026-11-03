# Close dynamic registration by default

Request `d7c3da24e8647317d568f2ebd3a27267553ecc7f` and promise `3ff36d7b82ee05d621f3e0f68fd7a0c2211312aa` own this change. The planner replaced stale request `94f65167222a2520449849cc79d4b3acd35416f4` with the same scope and conditions in `1b33f47f5c35c5c1274c61d915a717f212e344d3`. The [design](../2026-11-03-oauth-registration-policy-design.md) records the planner’s policy and the fixed registration error.

An unset `OAUTH_DYNAMIC_REGISTRATION` now disables new public-client registration. `POST /oauth/register` returns HTTP 400 with `invalid_client_metadata` before reading the body or obtaining a registry object. Authorization-server metadata omits `registration_endpoint`. The exact setting `on` restores registration and advertises the endpoint. Any other supplied value closes the OAuth routes through the existing policy check. Operators remove the setting to disable registration.

The Worker obtains the client registry only when a registration or client-resolution method runs. Metadata and disabled registration therefore cannot initialize its schema or insert a row. Metadata-document clients and existing registered-client resolution retain their normal checks. The setting grants no Native authority and changes no token lifetime, redirect policy, metadata-origin policy, signed-control check, or PKCE rule.

## Witnesses

The two original Native grant scenarios still run with registration explicitly enabled, including the own-agent retention race and every original assertion. Two more scenarios supply an allowlisted HTTPS metadata document through a fetch stand-in and run the complete flow with registration disabled and enabled. Registry SQL, signed control, Native enrollment, code exchange, wrong-verifier refusal, replay refusal, refresh rotation, revocation, and connection checks remain real. Both metadata scenarios preserve the exact registration-row list and cache only their document. These runs prove no deployed host or real metadata provider.

The default-off route witness trips on a body read or namespace lookup. It checks the fixed error and cache headers, omitted endpoint, and enabled endpoint. The existing invalid-policy witness covers the new setting on every original OAuth and grant route before namespace lookup. Two one-rule controls remove the disabled-registration guard and the invalid-setting guard. Each runs all six routed cases and fails the intended assertion without a timeout or unhandled error. Both restore exact source bytes.

The security inventory describes all reachable operations under enabled settings. Its default stand-in now opts into registration, and its existing bijection case checks that default-off removes only the registration operation. The displayed settings lookup and canonical JSON row document the same parser and failure behavior.

## Evidence

The [focused manifest](evidence/2026-11-03-oauth-registration-policy-focused.manifest.json) has SHA-256 `55ef3f160d6efe65ec66ff9da98a2ef9d4af5ba26022333f6a10c34fcb34353d`. It records 18 public files and hashes 22 private raw outputs in a read-only unit. These incremental checks do not form a frozen gate.

| Record | Result |
| --- | --- |
| `01-mcp-source-compiler.json`, `02-scope-source-compiler.json`, `05-mcp-native-compiler-corrected.json` | Owning source and Native compiler contexts pass |
| `06-native-oauth-owners.json` | Two complete Native owners pass 10 cases |
| `08-disabled-registration-guard-control.json`, `09-invalid-setting-guard-control.json` | Intended assertion failures, six routed cases each, exact source restoration |
| `07-security-entry-and-settings.json`, `10-entry-inventory-explicit-enabled-policy.json` | Three settings cases pass; initial entry inventory fails four cases, then the explicit-enabled correction passes all 11 entry cases |
| `11-shared-helper-inventory.json` | Shared-helper inventory passes |

The first Native compiler run failed because Cloudflare’s `RequestInit` type omits the stand-in’s credentials field. An explicit intersection type fixes that assertion, and the owning compiler passes. The initial inventory failures exposed its implicit enabled-registration assumption. Both failed records remain in the manifest. Only the reviewed policy, wire owner, and `mcpRoute` seals change.

## Failed frozen gate and bounded follow-up

The single frozen gate at `5183640a65eeef98d496289ab0e1bf0c552c5079`, tree `4d0448229ae466f2fd27b6e0cf3e063592952dc0`, exits 1 after 1,519.606917 seconds. I read the actual `gate.exit`. Every precheck and compiler context passes, as do the kernel, Node, Counting, and plain phases. Native records 1,063 passed cases, two failed cases, and two skips, across 279 passed files, two failed files, and one skipped file. Its terminal reports zero unhandled errors. Native remains partial, and the gate remains failed.

The two failures are:

- `apps/room/page/test/oauth-context.scope.test.ts` expected its dynamic registration to return 201, but default-off correctly returned 400. The fixture had not opted into registration.
- `packages/scope/test/archive-one-entry-scale.test.ts` expected its original default-budget archive receipt to be confirmed. It returned `retry / unavailable` after the stored archive reached entry 14,601. No archive source, assertion, bound, or deadline changes in this head. The result does not establish the failure’s cause.

After the gate’s terminal record and seal, the only code repair adds `OAUTH_DYNAMIC_REGISTRATION: "on"` to the consent test’s local Worker environment. Every original case, assertion, and deadline stays. Its owning Page Native compiler and complete consent owner pass. The complete archive-scale owner also passes once alone on bytes identical to the frozen gate, in 208.662011 seconds. These checks change no production source, other test, configuration, or dependency manifest. The repaired test has no importers in the tracked source search.

The [failed-gate manifest](evidence/2026-11-03-oauth-registration-policy-gate.manifest.json) has SHA-256 `ec856c0ffd75ae2c043b009b49c8c359121537f60befb11143a290f92035d15c`. The [follow-up manifest](evidence/2026-11-03-oauth-registration-policy-followup.manifest.json) has SHA-256 `dc890fcf4b79beaf96cf31df3bfd21bbea7ae0e84f98532a03bc36fb47f28bf5`. They retain the actual failure, complete private stage archive, exact repair patch, compiler result, both complete owner results, and unchanged archive-owner digest. The three sealed units contain 36 public files and hash 59 private originals, plus one checksum file per unit.

The gate failed two files, so this record does not automatically meet the documented single-file repair exception. A passing follow-up does not turn the gate into a pass. The planner must rule on assessment of this concrete record, and the checker can require more. No full suite repeats to chase either failure. If the same `EnvironmentTeardownError` returns in a later gate, the checker’s separate teardown ruling requires reopening `df2abe35`; this gate reports none.

This source enables no Worker setting and deploys nothing. O4 uses metadata-document clients with registration disabled. The planner requires a per-address rate limit before any hosted Worker enables dynamic registration. The [Page workflow run 41637833087](https://github.com/generalbusiness-ai/dap/actions/runs/41637833087) succeeds at source and fixture head `450025c5a8b7838c1cd251d4999505b40a98bcc4`. All four required browser commands pass: screenshots, recorded demo captures, create room, and local label. The [Page CI manifest](evidence/2026-11-03-oauth-registration-policy-page-ci.manifest.json) has SHA-256 `e9ac11aeb72e7e034da93d481e93c33cc67ee92ec2ffa693e477a25b006c77a7`. Only this citation and its manifest follow that source head. The four sealed units now contain 39 public files and hash 59 private originals, plus one checksum file per unit. CI success leaves the local gate failed. The planner’s evidence ruling and independent review still follow.
