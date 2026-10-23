import { configureFactTimeDefinition } from "../definition-corpus-data.ts";
/** Counter-only Native fixture extension: initialize/reset retain their own
 * entry ref. The production Counter definition is unchanged. */
import type { DeclaredDefinition } from "@generalbusiness/dap-contract";
import { canonicalize, definitionDigest, parseStrict } from "@generalbusiness/dap-bytes";
import { isApplicationJournalSource, packApplication2 } from "@generalbusiness/dap-bytes/application-v2";
import { applicationCounterJournalPacket2 } from "./application-v2-fixture.ts";
import { fixedSigner } from "../fixtures-core.ts";

export async function applicationCounterFactTimePacket2() {
  const base = await applicationCounterJournalPacket2("state = 'open'", "native");
  const definition = parseStrict(base.package.semantic.definitions[0]!.bytes) as DeclaredDefinition;
  configureFactTimeDefinition(definition);
  const id = definitionDigest(definition), { creates: _creates, ...semantic } = base.package.semantic, { semantic: _semantic, ...presentation } = base.package.presentation;
  const projections = Object.fromEntries(Object.entries(semantic.projections).map(([name, projection]) => [name, { ...projection, definition: id }]));
  const source = projections["board"]!.sources["board"]!;
  if (isApplicationJournalSource(source)) throw Error("Item fixture required.");
  const clock = { ...source, fields: {
    seenTime: { from: { kind: "fact-time" as const, name: "seen" }, of: { type: "time" as const }, nullable: true },
    seenBy: { from: { kind: "fact-signer" as const, name: "seen" }, of: { type: "member" as const }, nullable: true },
  } };
  projections["clock"] = { ...projections["board"]!, sources: { board: clock } };
  projections["signer"] = { ...projections["board"]!, sources: { board: { ...source, fields: { seenBy: clock.fields.seenBy } } } };
  return packApplication2({ name: "test.fact-time", version: "native", semantic: { ...semantic, entry: id,
    definitions: [{ id, bytes: canonicalize(definition) }], projections }, presentation }, fixedSigner(67));
}
