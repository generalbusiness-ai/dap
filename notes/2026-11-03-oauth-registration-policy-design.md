# Default-off dynamic registration

Request `94f65167222a2520449849cc79d4b3acd35416f4` implements planner ruling `c721a1e957597a6e4ae50287c018e35cda62e20e`.

An unset `OAUTH_DYNAMIC_REGISTRATION` disables new dynamic registrations. The exact value `on` enables them. Any other supplied value closes the OAuth routes, including signed grant and connection routes, through the existing policy check. The resource metadata and static bearer routes keep their separate policy. Operators remove the setting to disable registration. They do not set it to `off`.

The disabled registration route returns a fixed HTTP 400 JSON `invalid_client_metadata` before reading a body or obtaining the public-client registry. Its deployment policy rejects all self-asserted registration metadata. [RFC 7591 section 3.2.2](https://www.rfc-editor.org/rfc/rfc7591.html#section-3.2.2) defines this error for rejected client metadata; it does not define a registration-disabled error. The response includes no private detail. Authorization-server metadata omits `registration_endpoint` when registration is disabled.

The setting gates new registration only. Allowlisted HTTPS metadata documents, existing registered-client resolution, signed control, PKCE, grants, refresh, revocation, and Native authority keep their current checks. This change adds no rate limiter and enables no hosted endpoint. Before a later Worker enables registration, the planner requires a per-address rate limit. O4 uses metadata-document clients with registration disabled.

The witnesses keep both original routed Native grant scenarios with registration explicitly enabled. The same complete flow also runs with a metadata-document client in both states. A fetch stand-in supplies the allowlisted document bytes. Registry SQL, signed control, Native enrollment, PKCE, replay refusal, refresh, revocation, and connection checks remain real. A route tripwire verifies that disabled registration reads no body and obtains no namespace object. The invalid-setting witness retains all original route checks.
