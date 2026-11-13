import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { answersCatalogVocabularyQuestion, CATALOG_VOCABULARY_QUESTIONS } from "@generalbusiness/dap-contract/catalog-vocabulary";
import { answersVersionQuestion, VERSION_QUESTIONS, type VersionQuestion } from "../src/version-questions.ts";
import { VERSIONS } from "../src/native-catalog.ts";
import { isStandingDestination, usesFilePublicationProtocol, usesStagedPublicationProtocol } from "../src/versions.ts";

/** Copied unchanged from the pre-edit source inventory, before the new table. */
const frozen = JSON.parse(readFileSync(new URL("./fixtures/version-questions-86179b0c.json", import.meta.url), "utf8")) as {
  catalogPins: string[];
  questions: { name: string }[];
  rows: { pin: string; catalogued: boolean; answers: Record<string, boolean> }[];
};
const standing = JSON.parse(readFileSync(new URL("./fixtures/version-standing-86179b0c.json", import.meta.url), "utf8")) as {
  question: string;
  rows: { pin: string; answer: boolean }[];
};

test("the question owner covers every frozen predicate and catalog pin", () => {
  expect([...VERSION_QUESTIONS].sort()).toEqual([...frozen.questions.map(question => question.name), standing.question].sort());
  expect(Object.keys(VERSIONS).sort()).toEqual([...frozen.catalogPins].sort());
  expect(frozen.rows).toHaveLength(105);
  expect(frozen.questions).toHaveLength(104);
});

test.each(frozen.rows)("the independent old-list answers hold for $pin", row => {
  for (const question of frozen.questions.map(value => value.name as VersionQuestion)) {
    expect(answersVersionQuestion(row.pin, question), `${question}: ${row.pin}`).toBe(row.answers[question]);
  }
  expect(usesStagedPublicationProtocol(row.pin)).toBe(row.answers["nativeStagedPublication"]);
  expect(usesFilePublicationProtocol(row.pin)).toBe(row.answers["nativeFilePublication"]);
});

test.each(standing.rows)("the separately frozen standing answer holds for $pin", row => {
  expect(answersVersionQuestion(row.pin, "nativeStandingDestination")).toBe(row.answer);
  expect(isStandingDestination(row.pin)).toBe(row.answer);
});

test.each(frozen.rows)("the lower-layer vocabulary keeps the old answers for $pin", row => {
  for (const question of CATALOG_VOCABULARY_QUESTIONS) {
    expect(answersCatalogVocabularyQuestion(row.pin, question)).toBe(row.answers[question]);
  }
});

test.each([
  { label: "undefined", named: undefined }, { label: "null", named: null },
  { label: "false", named: false }, { label: "zero", named: 0 },
  { label: "record", named: {} }, { label: "array", named: [] },
])("non-pin inputs answer false: $label", ({ named }) => {
  for (const question of VERSION_QUESTIONS) expect(answersVersionQuestion(named, question)).toBe(false);
});

test("the frozen answers retain intentional disagreements", () => {
  const answers = (named: string, question: VersionQuestion) => answersVersionQuestion(named, question);
  expect(answers("platform:destination@7", "nativeStagedPublication")).toBe(true);
  expect(answers("platform:destination@7", "cliManifestListDestination")).toBe(false);
  expect(answers("platform:rules@13", "applicationOutsideWorkerRules")).toBe(true);
  expect(answers("platform:rules@13", "scopeApplicationOutsideRules")).toBe(false);
  expect(answers("platform:destination@18", "scopeDeliveryUnpublishedBranch")).toBe(true);
  expect(answers("platform:destination@18", "mcpVerifyEmptyDestination")).toBe(false);
});

/** CF-1 (ruling bccd8dd1): each family pin answers exactly the questions that
 * the implementation note lists. The frozen fixture above stays unchanged. */
const CUTOVER_FAMILY_ANSWERS: Readonly<Record<string, readonly VersionQuestion[]>> = {
  "platform:destination@21": [
    "authoritySessionBirthUnpublishedBranch", "checkerReservationOriginDestination", "cliFixedReadTokenLifetimeDestination",
    "cliManifestListDestination", "cliOneFileDestination", "cliScopeIndexDefaultCoveragePin", "cliScopeIndexSupportedLineagePin",
    "cliStatusUnpublishedDestination", "cliUnpublishedDestination", "mcpReadTokenFixedHourDestination",
    "mcpVerifyEmptyDestination", "nativeFilePublication", "nativeStagedPublication", "nativeTimedOperationOpen",
    "pageRetainedManifestListDestination", "pageRetainedOneFileDestination", "scopeArchiveHostDestination",
    "scopeCredentialUnpublishedBranch", "scopeDeliveryNativeApplicationOrigin", "scopeDeliveryUnpublishedBranch",
    "scopeOperationNativeApplicationOrigin", "scopeReadTokenFixedHourDestination", "scopeSessionPreparationOwnScope",
    "scopeSessionPreparationUnpublishedPage",
  ],
  "platform:directory@27": [
    "cliScopeIndexDefaultCoveragePin", "cliScopeIndexSupportedLineagePin", "pageUnpublishedDirectory",
    "scopeApplicationAnnouncementDirectory", "scopeArchiveHostDirectory", "scopeCreationDeclarationDirectory",
    "scopeSiteRepositoryOptionalDirectory",
  ],
  "platform:membership@14": [
    "applicationProjectionMembership", "applicationScreenMembership", "archiveMembershipForeignCopy",
    "cliOwnAgentInvitationMembership", "cliScopeIndexDefaultCoveragePin", "cliScopeIndexSupportedLineagePin",
    "clientAgentKeyInvitationMembership", "clientCheckerKeyInvitationMembership", "clientInvitationSignatureCredential",
    "clientPersonInvitationMembership", "scopeInvitationProofMembership", "scopeOwnStandingMembership", "scopeSessionMembership",
    "viewsEvidenceMembership",
  ],
  "platform:register@28": [
    "archiveRegisterForeignCopy", "cliFailedClaimRegister", "cliImplicitSelectedPlanRegister", "cliNewInstallRegister",
    "cliNoHostInstallRegister", "cliOpenPolicyExplicitRegister", "cliRetainedInstallRegister",
    "cliRetainedUnpublishedSelectionRegister", "cliScopeIndexDefaultCoveragePin", "cliScopeIndexSupportedLineagePin",
    "clientCreationOfferRegister", "clientSettlementClaimProjectionRegister", "pageRetainedCreationRegister",
    "scopeDemoCreationRegister", "scopeHostNoneCreationRegister", "scopeSettlementClaimRegister",
  ],
  "platform:rules@15": [
    "applicationOutsideWorkerRules", "cliApplicationInstallationRules", "cliScopeIndexDefaultCoveragePin",
    "cliScopeIndexSupportedLineagePin", "mcpDeviceInstallOptionsRules", "mcpOwnerFieldRules", "mcpSemanticInstallRoomRules",
    "pageInitializationRules", "pageReviewPolicyRules", "scopeApplicationOutsideRules",
  ],
};

test.each(Object.entries(CUTOVER_FAMILY_ANSWERS))("the cutover family pin %s answers exactly its chosen questions", (pin, chosen) => {
  expect(frozen.catalogPins).not.toContain(pin);
  expect(VERSION_QUESTIONS.filter(question => answersVersionQuestion(pin, question))).toEqual(VERSION_QUESTIONS.filter(question => chosen.includes(question)));
});
