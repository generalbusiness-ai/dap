/** Browser replay of displays collected from the native room witness. It sends no room act and proves no provider behavior. */
import { isRecord } from "@generalbusiness/dap-bytes";
import { recordFrom } from "../../../../scripts/demo/recorder-output.ts";
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ActorChip, CallResult, Display } from "../../src/index.ts";
import { fixture } from "./views-host.ts";

interface Scene { kind: string; actor: ActorChip; receipt: string; opened: CallResult; before: Display; pressed: CallResult; refreshed: Display }
export function nativeActorCards(out: string): { qualification: string; scenes: Scene[] } {
  // The one native owner collects all three identities. The browser never manufactures a member row or a signer label.
  const output = execFileSync(process.execPath, ["node_modules/vitest/vitest.mjs", "run", "--project", "scope-stories", "packages/mcp/test/change-view.scope.test.ts", "-t", "signed entries and receipts name", "--silent=false", "--reporter=verbose"], { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
  writeFileSync(join(out, "native-actor-record.log"), output);
  const record = recordFrom(output, "ACTOR-RECORD") as { qualification: string; scenes: Scene[] };
  if (record.scenes.map(scene => scene.kind).join(",") !== "person,agent,checker") throw Error("Native actor record lacks an identity.");
  writeFileSync(join(out, "native-actor-record.json"), JSON.stringify(record, null, 2));
  return record;
}

export function recordedActorFixture(scene: Scene) {
  const base = fixture("empty"), ordinary = base.service.call.bind(base.service);
  let pressed = false;
  const display = (value: Display, view: unknown): Display => ({ ...structuredClone(value), context: { ...structuredClone(value.context), view: String(view) } });
  base.service.call = async (name, args) => {
    if (!isRecord(args)) return ordinary(name, args);
    if (name === "view_decision") return structuredClone(scene.opened);
    if (name === "view_read") return { content: [], structuredContent: { display: display(pressed ? scene.refreshed : scene.before, args["view"]) }, isError: false };
    if (name === "view_act") {
      if (pressed || args["action"] !== "approve" || args["cut"] !== scene.before.cut) throw Error("The replay admits only its recorded press.");
      pressed = true;
      const result = structuredClone(scene.pressed);
      result.structuredContent["display"] = display(result.structuredContent["display"] as Display, args["view"]);
      return result;
    }
    return ordinary(name, args);
  };
  return { ...base, subject: "native-actor-replay" };
}
