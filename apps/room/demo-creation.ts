/** The demo's HTTP route; the native read-only projection stays with ScopeObject. */
import { canonicalize } from "@generalbusiness/dap-bytes";
import type { Binding } from "../../packages/scope/src/namespace.ts";
import { demoCreationConfig, legacyGitHubDemoConfig, registerRef, type DemoCreationBindings, type DemoCreationConfig, type DemoCreationOffer } from "../../packages/scope/src/demo-creation.ts";
export { demoCreationConfig, type DemoCreationOffer } from "../../packages/scope/src/demo-creation.ts";
export const DEMO_OFFER_PATH = "/v1/demo/creation-offer";
export async function demoCreationRoute(request: Request, env: DemoCreationBindings & { SCOPES: Binding }): Promise<Response> {
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
  let config: DemoCreationConfig;
  if (url.origin === "https://dap-demo.inguz.workers.dev") {
    const settings = demoCreationConfig(env.DEMO_START_CONFIG, env.DEPLOYMENT, env);
    if (!settings || url.origin !== settings.current.origin
      || selected && canonicalize(selected) !== canonicalize(settings.current.register)) return reply(404, { error: "not-found" });
    config = settings.current;
  } else {
    // Deliberately preserve Part1's retained preflight, not fresh old creation.
    // Origin selects this legacy reader; failed v3 parsing never falls back.
    if (!selected) return reply(404, { error: "not-found" });
    const settings = legacyGitHubDemoConfig(env.DEMO_START_CONFIG, env.DEPLOYMENT);
    if (!settings || url.origin !== settings.current.origin) return reply(404, { error: "not-found" });
    const match = canonicalize(selected) === canonicalize(settings.current.register) ? settings.current
      : settings.legacy && canonicalize(selected) === canonicalize(settings.legacy.register) ? settings.legacy : null;
    if (!match) return reply(404, { error: "not-found" });
    config = match;
  }
  if (request.method !== "GET") return reply(405, { error: "method-not-allowed" });
  const stub = env.SCOPES.get(env.SCOPES.idFromName(config.register.scope)) as unknown as { demoCreationOffer(config: DemoCreationConfig): DemoCreationOffer | null | Promise<DemoCreationOffer | null> };
  const offer = await stub.demoCreationOffer(config);
  return offer ? reply(200, offer) : reply(404, { error: "not-found" });
}
