/** Explicit fixture transport configuration, not a product fallback.
 * Existing heavy cases use the real fixed binding with the high finite
 * limits in wrangler.test.jsonc. Default-limit startup evidence is separate. */
import { env } from "cloudflare:workers";
import { route } from "../../src/worker.ts";
import type { Binding } from "../../src/namespace.ts";
import type { CreationAdmission } from "../../src/creation-admission.ts";
import type { ServingEnvironment } from "../../src/serving-admission.ts";
import type { MetricEnvironment } from "../../src/operational.ts";

export function fixtureRoute(request: Request, binding: Binding, settings: MetricEnvironment & CreationAdmission & ServingEnvironment = {}, address: string | null = null): Promise<Response> {
  return route(request, binding, { SCOPE_INDEX: env.SCOPE_INDEX, ...settings }, address);
}
