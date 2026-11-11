/** Generated runtime data. Author it in authoring/site.ts. */
import type { SiteDefinition } from "./authoring/site.ts";
import definition from "./definitions/site.json" with { type: "json" };

export { SITE } from "./names.ts";
export const site: SiteDefinition = definition as SiteDefinition;
