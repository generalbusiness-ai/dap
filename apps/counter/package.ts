/** The Counter package's authored metadata; its existing package bytes remain the witness. */
import { entries, items, manifest, projection, signerOf, views } from "@generalbusiness/dap-define/package";
import { applicationBrandAssets } from "../../brand/application-assets.ts";
import { board, configuration, countingCommitments, participant, promise } from "./commitments.ts";
import { counterRoles } from "./roles.ts";

const path = "apps/counter/commitments.json";
const state = projection(countingCommitments, path, {
  board: items(board, ["generation", "lastNumber", "serial", "target", "until", "lastFulfilledAt", "pledge", "controller", "lastSpeaker"]),
  configuration: items(configuration, ["target", "controller"]),
  participant: items(participant, ["agent"]),
  promise: items(promise, ["basis", "generation", "n", "reason", "serial", "until", "admittedAt", "participant", "agent"]),
});
const activity = projection(countingCommitments, path, {
  events: entries(["activate", "cancel", "commit", "deactivate", "fail", "force-deactivate", "fulfill", "initialize", "participate", "pause", "remove-participant", "reset", "start"], { actor: signerOf }),
});
const view = views(countingCommitments, { state, activity }, counterRoles.roles);
const presentation = {
  board: view.card("state", "board", ({ row, text, when, act }) => ({
    actor: "lastSpeaker", acts: [
      act("pause", "Pause", when`${row.state} = 'open' and ${row.pledge} = null`),
      act("start", "Start", when`${row.state} = 'paused' and ${row.pledge} = null`),
    ], display: "inline", back: null, title: "state", facts: ["lastNumber", "target", "generation", "serial", "until"],
    context: text`board ${row.id} v${row.revision}`, fallback: text`board ${row.id}: ${row.state}`,
  })),
  participants: view.carousel("state", "participant", ({ row, text }) => ({ actor: "agent", display: "inline", back: null, title: "agent", facts: ["state"], context: text`participant ${row.id} v${row.revision}`, fallback: text`participant ${row.id}: ${row.state}` })),
  promise: view.record("state", "promise", ({ row, text }) => ({ actor: "agent", display: "fullscreen", back: "board", title: "n", facts: ["state", "until"], context: text`promise ${row.id} v${row.revision}`, fallback: text`promise ${row.id}: ${row.state}` })),
  activity: view.log("activity", "events", ({ row, text }) => ({ actor: "actor", display: "fullscreen", back: "board", title: "type", facts: ["time"], context: text`Recent entry ${row.id}: ${row.type}`, fallback: text`Recent entry ${row.id}: ${row.type}` })),
};
export const counterPackage = manifest({
  name: "ai.generalbusiness.counter", version: "0.2.0", definition: { path, value: countingCommitments },
  projections: { state, activity }, views: presentation,
  roles: counterRoles.roles,
  scenarios: ["apps/counter/scenarios/application.json"],
  browser: { entry: "apps/counter/browser/main.ts", html: "apps/counter/browser/application.html", script: "counter.js" },
  assets: applicationBrandAssets,
});
