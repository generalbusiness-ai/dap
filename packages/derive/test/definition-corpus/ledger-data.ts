/** Raw declarations used by the owner-ledger boundary controls. */
import type { Guard } from "@generalbusiness/dap-contract";
import { ticket } from "./fixture-data.ts";
export function ledgerDefinitionData(reader = false) {
  const data = structuredClone(ticket);
  data.capacity = { name: "whole-scope", version: 1 };
  if (reader) {
    data.capabilities = [{ name: "hold", version: 1 }];
    (data.acts["file"]!.guards as Guard[]).push({ capability: { name: "hold", guard: "staged", with: {} } });
  }
  return data;
}
