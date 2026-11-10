import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import * as relation from "../src/version-relations.ts";
import { NEWEST } from "../src/index.ts";

interface Row {
  input?: unknown;
  answer?: unknown;
  sourcePin?: string;
  consumerPins?: string[];
  register?: string;
  directory?: string;
  pin?: string;
  scopeKinds?: "any" | string[];
  defaultPins?: string[];
  scopeKind?: string;
  genesisPin?: string;
  role?: string;
}
const frozen = JSON.parse(readFileSync(new URL("./fixtures/version-questions-86179b0c.json", import.meta.url), "utf8")) as {
  rows: { pin: string }[];
  relations: { name: string; answerRows: Row[] }[];
};
const kinds = ["register", "directory", "membership", "rules", "destination", "inbox", "commons", "lane", "unknown"];
const pinsOf = (row: Row) => Object.fromEntries(Object.entries(row).filter(([key]) => key !== "name"));

test.each(frozen.relations)("the independent old relation holds: $name", record => {
  for (const row of record.answerRows) {
    const input = String(row.input);
    switch (record.name) {
      case "cliInvitationDirectoriesForMembership":
        expect(relation.cliInvitationDirectoriesForMembership(input)).toEqual(row.answer); break;
      case "viewsEvidenceDirectoryForMembership":
        expect(relation.viewsEvidenceDirectoryForMembership(input)).toEqual(row.answer); break;
      case "pageOpeningPartitionPair":
      case "pageRetainedOpeningPartitionPair":
      case "clientPartitionDirectoryPair":
      case "counterImportedCountingCohort":
        expect(relation.answersVersionRelation(record.name, ...row.input as unknown[])).toBe(row.answer); break;
      case "pagePartitionOpeningDeclaration":
        expect({ declarationPin: relation.pagePartitionOpeningDeclaration() }).toEqual(row.answer); break;
      case "cliInstallRegisterForCohort":
        expect(relation.CLI_INSTALL_REGISTERS[input as keyof typeof relation.CLI_INSTALL_REGISTERS]).toBe(row.answer); break;
      case "cliDefaultInstallRegister":
        expect(NEWEST["platform:register"]).toBe(row.answer); break;
      case "cliScopeIndexCreationCohorts":
        expect(relation.cliScopeIndexCreationCohorts().map(value => value.pins))
          .toEqual((row.answer as { pins: unknown }[]).map(value => value.pins)); break;
      case "claimDirectoryDefinitionForRegister":
        expect(relation.claimDirectoryDefinitionForRegister(input)).toBe(row.answer); break;
      case "claimSiblingDefinitionsForDirectory":
        expect(relation.claimSiblingDefinitionsForDirectory(input)).toEqual(row.answer); break;
      case "archiveMembershipCopy":
        for (const pin of frozen.rows) expect(relation.allowsArchiveMembershipCopy(row.sourcePin!, pin.pin)).toBe(row.consumerPins!.includes(pin.pin));
        expect(relation.allowsArchiveMembershipCopy(row.sourcePin!, undefined)).toBe(false); break;
      case "archiveTargetCohort":
        expect(relation.archiveTargetCohort(row.directory!)).toEqual(pinsOf(row)); break;
      case "creationLineageCohort":
        expect(relation.creationLineageCohort(row.register!)).toEqual(pinsOf(row)); break;
      case "applicationAdmissionCohort":
        expect(relation.applicationAdmissionCohort(row.directory!)).toEqual(pinsOf(row)); break;
      case "partitionRole":
        expect(relation.partitionRole(row.pin!)).toBe(row.role); break;
      case "scopeArchiveAnchorForeignSource":
        for (const kind of kinds) expect(relation.scopeArchiveAnchorForeignSource(row.pin!, kind)).toBe(row.scopeKinds === "any" || row.scopeKinds!.includes(kind)); break;
      case "deploymentCreationDefaults":
        expect([...relation.deploymentCreationDefaults()].sort()).toEqual(row.defaultPins); break;
      case "authoritySessionBirthDirectories":
        expect(relation.authoritySessionBirthDirectories(row.scopeKind!, row.genesisPin!)).toEqual(row.answer); break;
      case "mcpApplicationRoomCohort":
        expect(relation.mcpApplicationRoomCohort(input)).toEqual(row.answer); break;
      default: throw new Error(`unowned frozen relation: ${record.name}`);
    }
  }
});

test("unknown pins acquire no relation answer", () => {
  for (const pin of ["platform:destination@999", "platform:unknown@1", "unknown"]) {
    expect(relation.cliInvitationDirectoriesForMembership(pin)).toEqual([]);
    expect(relation.viewsEvidenceDirectoryForMembership(pin)).toEqual([]);
    expect(relation.allowsArchiveMembershipCopy(pin, "platform:rules@10")).toBe(false);
    expect(relation.allowsArchiveMembershipCopy("platform:membership@8", pin)).toBe(false);
    expect(relation.archiveTargetCohort(pin)).toBeNull();
    expect(relation.creationLineageCohort(pin)).toBeNull();
    expect(relation.applicationAdmissionCohort(pin)).toBeNull();
    expect(relation.mcpApplicationRoomCohort(pin)).toBeNull();
    expect(relation.partitionRole(pin)).toBeNull();
    for (const kind of kinds) {
      expect(relation.scopeArchiveAnchorForeignSource(pin, kind)).toBe(false);
      expect(relation.authoritySessionBirthDirectories(kind, pin)).toEqual([]);
    }
  }
});

test("pair relations preserve every old negative pin pair", () => {
  for (const question of ["pageOpeningPartitionPair", "pageRetainedOpeningPartitionPair", "clientPartitionDirectoryPair"] as const) {
    const old = frozen.relations.find(record => record.name === question)!;
    for (const root of frozen.rows) for (const child of frozen.rows) {
      const expected = old.answerRows.some(row => (row.input as string[])[0] === root.pin && (row.input as string[])[1] === child.pin);
      expect(relation.answersVersionRelation(question, root.pin, child.pin)).toBe(expected);
    }
  }
});

test("the ordered source descriptors retain their report names", () => {
  expect(relation.cliScopeIndexCreationCohorts().map(row => row.name)).toEqual([
    "failed-claim", "archive-device-publication", "archive-device-application", "application",
    "archive-certified-rules", "hardened-certified-rules", "commons", "separate-recovery", "repository-binding", "own-agent",
  ]);
});
