/** The Lending package's authored metadata; definition-derived fields come from the builders. */
import { entries, fieldOf, items, manifest, projection, signerOf } from "@generalbusiness/dap-define/package";
import { applicationBrandAssets } from "../../brand/application-assets.ts";
import { lending, library, thing } from "./definition.ts";
import { lendingRoles } from "./roles.ts";

const path = "examples/lending/definition.json";
const state = projection(lending, path, {
  library: items(library, ["destination", "founder"]),
  thing: items(thing, ["description", "name", "page", "reason", "borrower", "donor"]),
  events: entries(["borrow", "donate", "return"], { actor: signerOf }),
  cancellations: entries(["cancel"], { actor: signerOf, reason: fieldOf("reason") }),
  publications: entries(["publish"], { actor: signerOf, thing: fieldOf("thing") }),
});
const activity = projection(lending, path, { events: entries(["borrow", "cancel", "donate", "publish", "return"], { actor: signerOf }) });
const base = <const A extends string>(actor: A) => ({ revision: "revision", actor, summary: null, acts: [], waiting: {}, refresh: 2000 }) as const;
const views = {
  shelf: { ...base("donor"), display: "inline", back: null, kind: "carousel", projection: "state", item: "thing", title: "name", facts: ["state", "description"], context: "thing {id} v{revision}", fallback: "thing {id}: {state}" },
  thing: { ...base("borrower"), display: "fullscreen", back: "shelf", kind: "record", projection: "state", item: "thing", title: "name", facts: ["state", "description", "reason"], context: "thing {id} v{revision}", fallback: "thing {id}: {state}" },
  activity: { ...base("actor"), display: "fullscreen", back: "shelf", kind: "log", projection: "activity", item: "events", title: "type", facts: ["time"], context: "Recent entry {id}: {type}", fallback: "Recent entry {id}: {type}" },
} as const;

export const lendingPackage = manifest({
  name: "ai.generalbusiness.lending", version: "0.2.0", definition: { path, value: lending },
  projections: { state, activity }, views,
  roles: lendingRoles.roles,
  scenarios: ["examples/lending/scenarios/application.json"],
  browser: { entry: "examples/lending/browser/main.ts", html: "examples/lending/browser/application.html", script: "lending.js" },
  assets: applicationBrandAssets,
});
