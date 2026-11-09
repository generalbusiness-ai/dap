/** Exact native pin vocabulary shared below Platform. These answers preserve
 * the old predicates and do not depend on ports, providers or metadata. */
const QUESTION_PINS = {
  nativeTimedOperationOpen: [
    "platform:destination@13", "platform:destination@14", "platform:destination@15", "platform:destination@19",
    "platform:destination@3",
  ],
  gitArchiveDirectMembership: [
    "platform:membership@6",
  ],
} as const satisfies Readonly<Record<string, readonly string[]>>;

export type CatalogVocabularyQuestion = keyof typeof QUESTION_PINS;
export type CatalogVocabularyPin<Q extends CatalogVocabularyQuestion> = (typeof QUESTION_PINS)[Q][number];
export const CATALOG_VOCABULARY_QUESTIONS: readonly CatalogVocabularyQuestion[] = Object.freeze(Object.keys(QUESTION_PINS) as CatalogVocabularyQuestion[]);

/** Unknown pins remain false; named-pin stand-ins need no additional fields. */
export function answersCatalogVocabularyQuestion<Q extends CatalogVocabularyQuestion>(named: unknown, question: Q): named is CatalogVocabularyPin<Q> {
  return typeof named === "string" && (QUESTION_PINS[question] as readonly string[]).includes(named);
}
