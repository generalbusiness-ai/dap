# Archive upload-pack response status

This proposal records the exact HTTP status of a refused Git response. It does not repair the deployed archive failure or change which responses are accepted. Source review, owning checks, one ordinary gate and the planner's next deployed tail remain required.

Planner observation 542908c73853732070c83a687021f4947aa09564 reports 40 passes on deployed Main5253 refusing after the upload-pack POST: HTTP 4xx, text/plain, no redirect and an exact response URL. That evidence does not distinguish 400, 401, 403, 404, 411 or 415. The new integer lets the next tail make that distinction without retaining a body, raw header, status text or URL. A status alone will still not establish the full hosted cause.

The existing private HttpResponseRefusalDetail object gains status. Its single existing status getter read is retained; only integers in 0..599 enter the frozen diagnostic. Zero accommodates native opaque/error responses. Invalid stand-in numeric metadata yields no detail and keeps the original refusal. The ordinary strict admission expression, request bytes, headers, credentials, redirect policy, cancellation and fixed GitRefusal remain unchanged. Metadata getter exceptions still cannot replace that refusal. The existing Scope observer already forwards the typed object, so no production forwarding change or extra response read is needed.

The current direct v2 fetch has no identified mismatch with the reviewed Git grammar: arbitrary-object want, advertised shallow/filter arguments and implicit SHA1 are supported by the specification. [Git protocol v2](https://git-scm.com/docs/gitprotocol-v2)

Cloudflare documents v2 fetch and repository read-token fetch permission, but not every shallow/filter combination. Those general claims do not prove this deployed exchange works. [Artifacts Git protocol](https://developers.cloudflare.com/artifacts/api/git-protocol/)

Workers sets Content-Length automatically for fixed TypedArray bodies. The current Uint8Array request provides no Source basis for a manual length-header repair. [Workers Request](https://developers.cloudflare.com/workers/runtime-apis/request/#set-the-content-length-header)

The existing Git diagnostic case adds the six text/plain 4xx specimens, preserving all earlier media, redirect, URL, cancellation, privacy and metadata-exception assertions. Nonfinite, fractional and out-of-range stand-in statuses cannot enter the diagnostic. The existing Artifacts Scope case now requires the exact 503 value in its forwarded snapshot. No case registration, deadline, request or native policy changes.

The cause remains unresolved. The earlier read-only Source diagnosis is 6755bf8bb3415e14c535e4b8b8a3d111e7bf452e under request 47e150155104ba77f05cb98c1dc00e63d5e3daf2 and promise 10a7322f1bf7e011f9636502117deee0896230dd. It found no auth drop, body rewrite or supported protocol fallback. This diagnostic is the smallest supported next step before another planner-owned tail; no hosted calls occurred during preparation.
