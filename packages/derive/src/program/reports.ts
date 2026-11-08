/** Shared report shapes for admitted-program observations and static requirements. */
export type Dependency =
  | { kind: "field"; name: string; presence: true }
  | { kind: "subject"; name: string; phase: "before" | "working"; part: string }
  | { kind: "clock" | "signer" | "scope" | "self" | "ordinal" | "bounds" | "definition" }
  | { kind: "history"; reason: string }
  | { kind: "live-count"; type: string; state: string }
  | { kind: "prepared-input"; rule: string; parts: readonly ["kind", "fields", "signer", "subjects", "facts"] }
  | { kind: "prepared-results"; rule: string }
  | { kind: "opaque"; reason: string };

export interface Explanation { text: string; sourcePath: string | null; values: Readonly<Record<string, unknown>>; opaque: boolean; incomplete: boolean }
