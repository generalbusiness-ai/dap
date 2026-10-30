/** A room's signed notes. Citations carry no authority and bind no fact. */
import type { PlatformData, ScopeId, ScopeRef } from "@generalbusiness/dap-contract";
import { isScopeId, isScopeRef } from "@generalbusiness/dap-bytes";
import type { RecordedRef, StateView } from "@generalbusiness/dap-derive";
import { referenceOf } from "./rules-scope.ts";

export const commons: PlatformData = {
  format: "artroom-definition-1", name: "platform:commons",
  profile: { name: "restricted", version: 1 }, capabilities: [], genesis: "establish",
  items: { commons: {
    many: false, max: 1, initial: "open", states: { open: { final: false } }, parties: {},
    refs: { directory: { fixed: true, required: true, to: { type: "scope", kind: "directory" } } },
    values: { membership: { fixed: true, required: true, of: { type: "text", max: 64 } } },
  } },
  acts: {
    establish: {
      step: "open", on: "commons", grant: "commons.establish", also: {},
      fields: { directory: { type: "scope", kind: "directory", required: true }, membership: { type: "text", max: 64, required: true } },
      guards: [], effects: [
        { ref: { slot: "directory", from: { field: "directory" } } },
        { value: { slot: "membership", from: { field: "membership" } } },
      ], sends: [], attention: [],
    },
    note: {
      step: "comment", on: null, grant: "commons.write", also: {},
      fields: {
        text: { type: "text", max: 64 * 1024, detached: true, required: true },
        media: { type: "text", max: 255, required: true },
        about: { type: "list", max: 64, of: { type: "reference", fragment: 512 }, required: true },
      }, guards: [], effects: [], sends: [], attention: [],
    },
  }, receives: {}, timed: {}, rules: {}, outcomes: {},
};
const control = (state: Pick<StateView, "page">) => state.page("commons", ["open"], null, 1).items[0];
export const commonsDirectory = (state: Pick<StateView, "page">): ScopeRef | null => {
  const ref = control(state)?.refs["directory"];
  return isScopeRef(ref) && ref.kind === "directory" ? ref : null;
};
/** As in Rules, the first retained Membership observation fixes incarnation. */
export const commonsMembership = (state: Pick<StateView, "page" | "incarnations">): RecordedRef | null => {
  const id = control(state)?.values["membership"];
  return referenceOf(state, isScopeId(id) ? id as ScopeId : null, "membership");
};
