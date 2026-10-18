/** Made-up birth fields, without a registry or outside provider. */
import type { ValidDefinition } from "../src/index.ts";
import { notesDefinition, variant } from "./fixtures.ts";

export function genesisBodyDefinition(whole = true, base: ValidDefinition = notesDefinition) {
  return variant(base.declared, data => {
    if (whole) data.capacity = { name: "whole-scope", version: 1 };
    else delete data.capacity;
    const body = { type: "text", detached: true, max: 64, required: false };
    data.acts[data.genesis].fields = {
      a: { ...body }, b: { ...body }, count: { type: "int", min: 0, max: 1, required: false },
      proof: { type: "fact", under: "notes", kind: ["start"], required: false },
    };
  });
}
