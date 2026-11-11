/** The Lending package's authored metadata; definition-derived fields come from the builders. */
import { entries, fieldOf, items, manifest, projection, signerOf, views } from "@generalbusiness/dap-define/package";
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
const view = views(lending, { state, activity }, lendingRoles.roles);
const presentation = {
  shelf: view.carousel("state", "thing", ({ row, text }) => ({ actor: "donor", display: "inline", back: null, title: "name", facts: ["state", "description"], context: text`thing ${row.id} v${row.revision}`, fallback: text`thing ${row.id}: ${row.state}` })),
  thing: view.record("state", "thing", ({ row, text }) => ({ actor: "borrower", display: "fullscreen", back: "shelf", title: "name", facts: ["state", "description", "reason"], context: text`thing ${row.id} v${row.revision}`, fallback: text`thing ${row.id}: ${row.state}` })),
  activity: view.log("activity", "events", ({ row, text }) => ({ actor: "actor", display: "fullscreen", back: "shelf", title: "type", facts: ["time"], context: text`Recent entry ${row.id}: ${row.type}`, fallback: text`Recent entry ${row.id}: ${row.type}` })),
};

export const lendingPackage = manifest({
  name: "ai.generalbusiness.lending", version: "0.2.0", definition: { path, value: lending },
  projections: { state, activity }, views: presentation,
  roles: lendingRoles.roles,
  scenarios: ["examples/lending/scenarios/application.json"],
  browser: { entry: "examples/lending/browser/main.ts", html: "examples/lending/browser/application.html", script: "lending.js" },
  assets: applicationBrandAssets,
});
