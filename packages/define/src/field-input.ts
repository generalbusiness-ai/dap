/** Native literal input types, with explicit story-only reference stand-ins. */
import type { FactRef, FieldType, FieldValue, MemberRef, ReferenceValue, ScopeKind, ScopeRef } from "@generalbusiness/dap-contract";

export type NativeInputValue<T, MemberExtra = never, ScopeExtra = never> = T extends { type: "text" | "digest" | "commit" | "tree" | "time" } ? string
  : T extends { type: "int" | "item" } ? number
  : T extends { type: "bool" } ? boolean
  : T extends { type: "member" } ? MemberRef | MemberExtra
  : T extends { type: "scope"; kind: infer K extends ScopeKind } ? (ScopeRef & { readonly kind: K }) | ScopeExtra
  : T extends { type: "fact" } ? FactRef
  : T extends { type: "reference" } ? ReferenceValue
  : T extends { type: "enum"; of: readonly (infer E)[] } ? E
  : T extends { type: "list"; of: infer E } ? readonly NativeInputValue<E, MemberExtra, ScopeExtra>[]
  : T extends { type: "record"; of: infer R extends Record<string, FieldType & { required: boolean }> } ? NativeInputFields<R, MemberExtra, ScopeExtra>
  : never;

export type NativeInputFields<F extends Record<string, FieldType & { required: boolean }>, MemberExtra = never, ScopeExtra = never> = {
  readonly [K in keyof F as F[K]["required"] extends true ? F[K] extends { default: FieldValue } ? never : K : never]: NativeInputValue<F[K], MemberExtra, ScopeExtra>
} & {
  readonly [K in keyof F as F[K]["required"] extends true ? F[K] extends { default: FieldValue } ? K : never : K]?: NativeInputValue<F[K], MemberExtra, ScopeExtra>
};
