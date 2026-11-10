/**
 * The platform's own one-line text for each mark that an act of a platform
 * definition holds (plan 031, section 4, the row "platform mark"). A mark is
 * a place of platform data where the platform's code runs a rule. The text
 * says what the rule checks, for a reader of a tool description. It is part
 * of the platform's documentation, not of any application, and judges
 * nothing: the scope runs the rule.
 *
 * The table is keyed by the platform name and version, `platform:<name>@<n>`,
 * and the mark's code. Every shipped version of a name states each of its
 * marks with the same meaning, so the rows below are written once per name
 * and expanded to each version the platform package ships. A mark with no
 * row renders as "the platform rule <code> (row <row>) holds".
 */

/** Plain catalogue metadata; no executable rule or Platform type enters Client. */
export type MarkCatalogue = Readonly<Record<string, {
  readonly rules: Readonly<Record<string, { readonly refusals?: readonly string[] }>>;
}>>;

const BY_NAME: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  "platform:register": {
    "founding-policy": "the register's creation policy allows your key to create a room",
    "handle-form": "the creator's handle is a handle: @, then letters, digits, dots, dashes or underscores",
  },
  "platform:directory": {
    "definition-active": "the definition is active in the rules scope, and its bytes and the definitions it names are at hand",
    "worker-standing": "the worker is an active member with an active key",
    "import-spent": "the repository's import has ended without success, so it may be tried again",
    "application-ready": "the application's definition is active in the rules scope and can be established with these values",
  },
  "platform:membership": {
    "founding-key": "only the initial key may sign, and only before the creator holds a seat and a first key",
    "recovery-key": "the recovery key may sign; otherwise your role must hold the action",
    "by-invitation": "the invitation's secret matches and the invitation is still open",
    "invitation": "the invitation named by its number",
    "handle-form": "the handle is a handle: @, then letters, digits, dots, dashes or underscores",
    "action-list": "a list of actions, each an action the platform knows",
    "last-admin-kept": "the room keeps at least one active admin with an active key",
  },
  "platform:rules": {
    "checkers": "each check's checker is an active member whose role is checker",
    "extents-hold": "the extents include the rules extent and a catch-all, and each check they name is configured",
    "extent-list": "a list of extents, each with a name, a class, paths, approvals, an approver and checks",
    "configuration-bytes": "the configuration's bytes are given beside the act and hash to the digest",
    "definition-bytes": "the definition's bytes are given beside the act, hash to the digest and validate",
  },
  "platform:destination": {
    "resend-due": "the earlier attempt is unanswered and its retry is due",
    "resend3-due": "the earlier attempt is unanswered and its retry is due",
  },
};

/** Bind wording and refusals to the supplied catalogue without running a rule. */
export function markDescriptionsOf(catalogue: MarkCatalogue) {
  /** The rows, by `platform:<name>@<n>` and code, for every version the platform package ships. */
  const MARK_TEXTS: Readonly<Record<string, Readonly<Record<string, string>>>> = Object.fromEntries(
    Object.keys(catalogue).map((version) => {
      const name = version.slice(0, version.lastIndexOf("@"));
      return [version, Object.hasOwn(BY_NAME, name) ? BY_NAME[name]! : {}];
    }),
  );

  /** The text of one mark, or the fallback that names its rule and row. */
  function markText(definition: string, mark: { code: string; row: string }): string {
    const row = Object.hasOwn(MARK_TEXTS, definition) ? MARK_TEXTS[definition]! : {};
    return Object.hasOwn(row, mark.code) ? row[mark.code]! : `the platform rule ${mark.code} (row ${mark.row}) holds`;
  }

  /** The refusal names that a mark's rule may give, as the platform's rule table declares them. */
  function markRefusals(definition: string, code: string): readonly string[] {
    const rules: MarkCatalogue[string]["rules"] = Object.hasOwn(catalogue, definition) ? catalogue[definition]!.rules : {};
    return Object.hasOwn(rules, code) ? rules[code]!.refusals ?? [] : [];
  }

  return { MARK_TEXTS, markText, markRefusals };
}
