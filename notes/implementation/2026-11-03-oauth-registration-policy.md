# Close dynamic registration by default

Request `94f65167222a2520449849cc79d4b3acd35416f4` and promise `6639468e983a5de5edeed0329cefd79a29826e42` own this change. The [design](../2026-11-03-oauth-registration-policy-design.md) records the planner’s policy and the fixed registration error.

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

The required frozen gate remains open. This source enables no Worker setting and deploys nothing. O4 uses metadata-document clients with registration disabled. The planner requires a per-address rate limit before any hosted Worker enables dynamic registration.
