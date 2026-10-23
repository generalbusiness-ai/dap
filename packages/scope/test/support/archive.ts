import { scopeArchiveChange } from "../definition-corpus-data.ts";
/** Explicit fixture policy and host identity; no production certificate. */
import type { Input} from "@generalbusiness/dap-contract";
import { variant } from "@generalbusiness/dap-derive/testing";
import type { ArchivePolicyRegistry } from "../../src/archive-inventory.ts";
import type { Sql } from "../../src/sqlite.ts";
import { definition } from "../support.ts";

export const archiveDefinition = variant(definition.declared, scopeArchiveChange());
const variants: readonly Input["type"][] = ["genesis", "act", "delivery", "timed", "diagnosis", "outcome", "preparation", "checkpoint"];
export const archivePolicies: ArchivePolicyRegistry = new Map([[archiveDefinition.digest, {
  review: "TEST STAND-IN: explicit fixture inline classes, never a production certificate", entryTypes: new Set(variants),
  support: { named: archiveDefinition.digest, definition: archiveDefinition, owners: new Map(), records: new Map(), preparations: new Map() },
}]]);
export const archiveRepository = { host: "fixture-host", namespace: "fixture-room", name: "archive-fixture", id: "fixture-repository" };
export const archiveSql = (state: DurableObjectState): Sql => ({ exec: (query, ...args) => state.storage.sql.exec(query, ...args), transaction: action => state.storage.transactionSync(action) });
