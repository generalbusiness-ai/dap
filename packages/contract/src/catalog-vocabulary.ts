/** Exact native pin vocabulary shared below Platform. These answers preserve
 * the old predicates and do not depend on ports, providers or metadata. */
const QUESTION_PINS = {
  nativeTimedOperationOpen: [
    "platform:destination@13", "platform:destination@14", "platform:destination@15", "platform:destination@19",
    "platform:destination@21", "platform:destination@3",
  ],
  gitArchiveDirectMembership: [
    "platform:membership@6",
  ],
  replayReadsLegacyPublication: [
    "platform:destination@4", "platform:destination@5", "platform:destination@6", "platform:destination@7",
  ],
  replayJudgesLegacyPublication: [
    "platform:destination@4", "platform:destination@5", "platform:destination@6", "platform:destination@7",
  ],
  replayPartitionChangeOrigin: [
    "platform:destination@6",
  ],
  archiveMembershipForeignCopy: [
    "platform:membership@12", "platform:membership@14", "platform:membership@8",
  ],
  archiveRegisterForeignCopy: [
    "platform:register@17", "platform:register@18", "platform:register@19", "platform:register@20",
    "platform:register@26", "platform:register@28",
  ],
  applicationScreenMembership: [
    "platform:membership@10", "platform:membership@11", "platform:membership@12", "platform:membership@13",
    "platform:membership@14", "platform:membership@7", "platform:membership@8", "platform:membership@9",
  ],
  clientCreationOfferRegister: [
    "platform:register@17", "platform:register@26", "platform:register@28",
  ],
  clientAgentKeyInvitationMembership: [
    "platform:membership@10", "platform:membership@11", "platform:membership@12", "platform:membership@13",
    "platform:membership@14", "platform:membership@2", "platform:membership@4", "platform:membership@5",
    "platform:membership@6", "platform:membership@7", "platform:membership@8", "platform:membership@9",
  ],
  clientCheckerKeyInvitationMembership: [
    "platform:membership@12", "platform:membership@14", "platform:membership@8",
  ],
  clientPersonInvitationMembership: [
    "platform:membership@1", "platform:membership@10", "platform:membership@11", "platform:membership@12",
    "platform:membership@13", "platform:membership@14", "platform:membership@2", "platform:membership@4",
    "platform:membership@5", "platform:membership@6", "platform:membership@7", "platform:membership@8",
    "platform:membership@9",
  ],
  clientInvitationSignatureCredential: [
    "platform:membership@10", "platform:membership@11", "platform:membership@12", "platform:membership@13",
    "platform:membership@14", "platform:membership@6", "platform:membership@7", "platform:membership@8",
    "platform:membership@9",
  ],
  clientCommonsReadDefinition: [
    "platform:commons@1",
  ],
  clientPartitionRootDirectory: [
    "platform:directory@10",
  ],
  clientPartitionChildDirectory: [
    "platform:directory-partition@1",
  ],
} as const satisfies Readonly<Record<string, readonly string[]>>;

export type CatalogVocabularyQuestion = keyof typeof QUESTION_PINS;
export type CatalogVocabularyPin<Q extends CatalogVocabularyQuestion> = (typeof QUESTION_PINS)[Q][number];
export const CATALOG_VOCABULARY_QUESTIONS: readonly CatalogVocabularyQuestion[] = Object.freeze(Object.keys(QUESTION_PINS) as CatalogVocabularyQuestion[]);

/** Unknown pins remain false; named-pin stand-ins need no additional fields. */
export function answersCatalogVocabularyQuestion<Q extends CatalogVocabularyQuestion>(named: unknown, question: Q): named is CatalogVocabularyPin<Q> {
  return typeof named === "string" && (QUESTION_PINS[question] as readonly string[]).includes(named);
}
