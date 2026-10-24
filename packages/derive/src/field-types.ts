/** Native field inclusion, shared by local copies and package ports. */
import type { FieldType } from "@generalbusiness/dap-contract";
const codeOf = (value: FieldType): string | null => Object.hasOwn(value, "code") ? String((value as unknown as Record<string, unknown>)["code"]) : null;
export function fieldAssignable(from: FieldType, to: FieldType): boolean {
  // Section 6.1: a value of a type that is a mark is assignable to that type only: the type that the same rule checks.
  const [a, b] = [codeOf(from), codeOf(to)];
  if (a !== null || b !== null) return a === b;
  switch (from.type) {
    // A detached text is held as its digest, and a plain one as its bytes: neither is a value of the other.
    case "text": return to.type === "text" && from.max <= to.max && (from.detached === true) === (to.detached === true);
    case "int": return to.type === "int" && from.min >= to.min && from.max <= to.max;
    case "enum": return to.type === "enum" && from.of.every((v) => to.of.includes(v));
    case "item": return to.type === "item" && from.of === to.of;
    case "scope": return to.type === "scope" && from.kind === to.kind;
    case "fact": return to.type === "fact" && from.kind.every((k) => to.kind.includes(k)) && from.under === to.under;
    case "list": return to.type === "list" && from.max <= to.max && fieldAssignable(from.of, to.of);
    case "record": {
      if (to.type !== "record") return false;
      const members = to.of;
      return Object.entries(from.of).every(([m, of]) => Object.hasOwn(members, m) && fieldAssignable(of, members[m]!))
        && Object.entries(members).every(([m, of]) => !of.required || Object.hasOwn(from.of, m) && from.of[m]?.required === true);
    }
    default: return from.type === to.type;
  }
}
