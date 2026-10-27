import { jsonReply as json } from "../../packages/scope/src/response.ts";
import { applicationPage } from "../../packages/scope/src/applications/route.ts";
import { health } from "../../packages/scope/src/health.ts";
/** Application dispatch. Imported framework functions are used only when fetch runs. */
import { mcpRoute, route, type Env, type McpEnv } from "../../packages/scope/src/worker.ts";
import { admittedRequestUrl } from "../../packages/scope/src/item-query-wire.ts";
import { credentialInUrl } from "../../packages/scope/src/sessions.ts";
import { DEMO_OFFER_PATH, demoCreationRoute } from "./demo-creation.ts";
import { isSite, site } from "../../packages/scope/src/site/route.ts";
import { isPage, page } from "./page/route.ts";
import { isBrand, brand } from "./brand/route.ts";
import { measuredRequest } from "../../packages/scope/src/operational.ts";
import { indexedScopes } from "../../packages/scope/src/scope-index.ts";

export default {
  fetch: async (request: Request, env: Env & Partial<Pick<McpEnv, "REGISTRIES" | "AGENTS">>): Promise<Response> => {
    return measuredRequest(request, env, async () => {
    const scopes = indexedScopes(env.SCOPES, env), lookups = { ...env, SCOPES: scopes };
    if (!admittedRequestUrl(request.url)) return json(413, { error: "too-large" });
    if (credentialInUrl(new URL(request.url))) return json(400, { error: "credential-in-url" });
    const healthy = await health(request, lookups);
    if (healthy) return healthy;
    const hosted = await mcpRoute(request, env);
    if (hosted) return hosted;
    const application = await applicationPage(request, lookups);
    if (application) return application;
    return new URL(request.url).pathname === DEMO_OFFER_PATH ? demoCreationRoute(request, lookups) : isSite(request) ? site(request, lookups, undefined, request.headers.get("cf-connecting-ip")) : isPage(request) ? page(request, env.DEMO_START_CONFIG !== undefined) : isBrand(request) ? brand(request) : route(request, scopes, env, request.headers.get("cf-connecting-ip"));
    });
  },
};
