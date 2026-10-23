/** Raw genesis-body declaration before validation or retained-body setup. */
import type { DeclaredDefinition } from "@generalbusiness/dap-contract";
import { notes } from "./fixture-data.ts";

export function genesisBodyData(whole = true, base: DeclaredDefinition = notes) {
  const data = structuredClone(base);
  {
    if (whole) data.capacity = { name: "whole-scope", version: 1 };
    else delete data.capacity;
    const body = { type: "text", detached: true, max: 64, required: false } as const;
    data.acts[data.genesis]!.fields = {
      a: { ...body }, b: { ...body }, count: { type: "int", min: 0, max: 1, required: false },
      proof: { type: "fact", under: "notes", kind: ["start"], required: false },
    };
  }
  return data;
}
