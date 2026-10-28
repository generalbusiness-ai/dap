/** The demo's HTTP route; the native read-only projection stays with ScopeObject. */
import { canonicalize } from "@generalbusiness/dap-bytes";
import type { Binding } from "../../packages/scope/src/namespace.ts";
import { readPublicOrigin, type PublicOriginBindings } from "../../packages/scope/src/public-origin.ts";
import { demoCreationConfig, registerRef, type DemoCreationBindings, type DemoCreationConfig, type DemoCreationOffer } from "../../packages/scope/src/demo-creation.ts";
export { demoCreationConfig, type DemoCreationOffer } from "../../packages/scope/src/demo-creation.ts";
export const DEMO_OFFER_PATH = "/v1/demo/creation-offer";
export async function demoCreationRoute(request: Request, env: DemoCreationBindings & PublicOriginBindings & { SCOPES: Binding }): Promise<Response> {
  const url = new URL(request.url);
  const reply = (status: number, value: unknown) => new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
  if (url.pathname !== DEMO_OFFER_PATH || url.hash) return reply(404, { error: "not-found" });
  let selected: DemoCreationConfig["register"] | undefined;
  if (url.search) {
    if ([...url.searchParams.keys()].sort().join(",") !== "inc,register") return reply(404, { error: "not-found" });
    const value = { scope: url.searchParams.get("register"), inc: url.searchParams.get("inc"), kind: "register" };
    if (!registerRef(value)) return reply(404, { error: "not-found" });
    selected = value;
  }
  const origin = readPublicOrigin(env, request.url);
  if (origin === null) return reply(404, { error: "not-found" });
  const settings = demoCreationConfig(env.DEMO_START_CONFIG, env.DEPLOYMENT, env);
  if (!settings || origin !== settings.current.origin
    || selected && canonicalize(selected) !== canonicalize(settings.current.register)) return reply(404, { error: "not-found" });
  const config = settings.current;
  if (request.method !== "GET") return reply(405, { error: "method-not-allowed" });
  const stub = env.SCOPES.get(env.SCOPES.idFromName(config.register.scope)) as unknown as { demoCreationOffer(config: DemoCreationConfig): DemoCreationOffer | null | Promise<DemoCreationOffer | null> };
  const offer = await stub.demoCreationOffer(config);
  return offer ? reply(200, offer) : reply(404, { error: "not-found" });
}
