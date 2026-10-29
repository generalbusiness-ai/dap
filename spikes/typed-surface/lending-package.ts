/** The lending application's manifest, written with the package builders. examples/lending/dap.application.json is the witness. */
import { lending, lendingGrants, library, thing } from "./lending.ts";
import { roles } from "./lib.ts";
import { BRAND_ASSETS, carousel, entries, fieldOf, items, log, manifest, projection, record, signerOf } from "./package.ts";

const DEFINITION = "examples/lending/definition.json";
const define = (sources: Parameters<typeof projection>[2]) => projection(lending, DEFINITION, sources);

export const lendingPackage = manifest({
  name: "ai.generalbusiness.lending", version: "0.2.0",
  definition: { path: DEFINITION, value: lending },
  projections: {
    state: define({
      library: items(library, ["destination", "founder"]),
      thing: items(thing, ["description", "name", "page", "reason", "borrower", "donor"]),
      events: entries(["borrow", "donate", "return"], { actor: signerOf }),
      cancellations: entries(["cancel"], { actor: signerOf, reason: fieldOf("reason") }),
      publications: entries(["publish"], { actor: signerOf, thing: fieldOf("thing") }),
    }),
    activity: define({ events: entries(["borrow", "cancel", "donate", "publish", "return"], { actor: signerOf }) }),
  },
  views: {
    shelf: carousel("state", "thing", { title: "name", facts: ["state", "description"], actor: "donor" }),
    thing: record("state", "thing", { title: "name", facts: ["state", "description", "reason"], actor: "borrower", back: "shelf" }),
    activity: log("activity", "events", { title: "type", facts: ["time"], actor: "actor", back: "shelf" }),
  },
  roles: roles(lendingGrants, { admin: [lendingGrants.member, lendingGrants.staff, lendingGrants.establish], member: [lendingGrants.member], agent: [lendingGrants.member] }),
  scenarios: ["examples/lending/scenarios/application.json"],
  browser: { entry: "examples/lending/browser/main.ts", html: "examples/lending/browser/application.html", script: "lending.js" },
  assets: BRAND_ASSETS,
});
