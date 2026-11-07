/** Conditions keep the admitted guard groups and the existing recursive subject-skip rule. */
export interface ConditionPlan<N> {
  readonly if: readonly N[] | null;
  readonly unless: readonly N[] | null;
  readonly absentSubjects: readonly string[];
}

/** This traversal includes constant payloads, as the existing skip rule does. */
export function* conditionSubjects(value: unknown): Generator<string> {
  if (Array.isArray(value)) {
    for (const entry of value) yield* conditionSubjects(entry);
  } else if (typeof value === "object" && value !== null) {
    for (const [key, entry] of Object.entries(value)) {
      if ((key === "of" || key === "item") && typeof entry === "string") {
        if (entry.startsWith("also.")) yield entry;
      } else yield* conditionSubjects(entry);
    }
  }
}
