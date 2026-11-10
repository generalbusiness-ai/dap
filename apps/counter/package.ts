/** The Counter package's authored metadata; its existing package bytes remain the witness. */
import { entries, items, manifest, projection, signerOf } from "@generalbusiness/dap-define/package";
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
const base = <const A extends string>(actor: A) => ({ revision: "revision", actor, summary: null, acts: [], waiting: {}, refresh: 2000 }) as const;
const views = {
  board: { ...base("lastSpeaker"), acts: [
    { act: "pause", label: "Pause", needs: "counting.control", when: "state = 'open' and pledge = null" },
    { act: "start", label: "Start", needs: "counting.control", when: "state = 'paused' and pledge = null" },
  ], display: "inline", back: null, kind: "card", projection: "state", item: "board", title: "state", facts: ["lastNumber", "target", "generation", "serial", "until"], context: "board {id} v{revision}", fallback: "board {id}: {state}" },
  participants: { ...base("agent"), display: "inline", back: null, kind: "carousel", projection: "state", item: "participant", title: "agent", facts: ["state"], context: "participant {id} v{revision}", fallback: "participant {id}: {state}" },
  promise: { ...base("agent"), display: "fullscreen", back: "board", kind: "record", projection: "state", item: "promise", title: "n", facts: ["state", "until"], context: "promise {id} v{revision}", fallback: "promise {id}: {state}" },
  activity: { ...base("actor"), display: "fullscreen", back: "board", kind: "log", projection: "activity", item: "events", title: "type", facts: ["time"], context: "Recent entry {id}: {type}", fallback: "Recent entry {id}: {type}" },
} as const;
export const counterPackage = manifest({
  name: "ai.generalbusiness.counter", version: "0.2.0", definition: { path, value: countingCommitments },
  projections: { state, activity }, views,
  roles: counterRoles.roles,
  scenarios: ["apps/counter/scenarios/application.json"],
  browser: { entry: "apps/counter/browser/main.ts", html: "apps/counter/browser/application.html", script: "counter.js" },
  assets: applicationBrandAssets,
});
