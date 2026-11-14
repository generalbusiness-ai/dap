// Destination 21 of the `base` family (ruling 68356c6c, points 4b and 5b): the Native judge of a published path.
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { canonicalize } from "@generalbusiness/dap-bytes";
import { validateDefinition, type GuardRule, type Item, type RuleGiven } from "@generalbusiness/dap-derive";
import { RULE_PROFILES } from "@generalbusiness/dap-derive/rule";
import { APPLICATION_PATHS, BASE_COHORT as C, applicationPublicationPrefixes, platform } from "../src/index.ts";

const destination = platform(C.destination)!;
const declared = (() => { const rule = destination.rules["publication-path-declared"]; if (rule?.place !== "guard") throw Error("guard"); return rule.run as GuardRule; })();

/** A Destination state with these rows, and a `publish-file` of this path from that application scope. */
function given(rows: readonly { application: string; prefixes: string }[], from: string, path: string): RuleGiven {
  const items = rows.map((row, id) => ({ id: id + 1, type: APPLICATION_PATHS, state: "kept", values: row, refs: {}, parties: {} }) as unknown as Item);
  const page = (type: string, states: readonly string[], after: number | null, limit: number) => {
    const all = items.filter(item => item.type === type && states.includes(item.state) && (after === null || item.id > after));
    return { items: all.slice(0, limit), more: all.length > limit };
  };
  return { input: { type: "delivery", from: { at: { scope: from } } }, resolved: { fields: { path } }, state: { page } } as unknown as RuleGiven;
}

test("Destination 21 validates whole, keeps one row per application and fixes the read token's lifetime", () => {
  const checked = validateDefinition(destination.data, PROPOSED_BOUNDS, RULE_PROFILES, { platform: true });
  expect(checked.ok ? [] : checked.problems).toEqual([]);
  expect(destination.data.acts["read-token"]!.fields).toEqual({});
  expect(destination.data.receives[APPLICATION_PATHS]!.from).toEqual({ kind: "directory", under: "platform:directory" });
  expect(destination.data.receives["publish-file"]!.guards.at(-1)).toEqual({ code: "publication-path-declared", row: "CF1" });
  expect(destination.applicationPublicationOrigin).toBeTypeOf("function");
});

test("a path outside the sender's declared prefixes refuses publication-path-not-declared; a sender without a row holds", () => {
  const rows = [{ application: "app-a", prefixes: canonicalize(["docs/", "shelf/"]) }, { application: "app-b", prefixes: "[]" }];
  expect(declared(given(rows, "app-a", "shelf/book.md"))).toEqual({ holds: true });
  expect(declared(given(rows, "app-a", "docs/site/index.md"))).toEqual({ holds: true });
  for (const path of ["README.md", "shelf-other/book.md", "shelf/../AGENTS.md", "shelf//book.md", "shelf/"])
    expect(declared(given(rows, "app-a", path)), path).toEqual({ holds: false, name: "publication-path-not-declared" });
  // An application without a declaration holds no publish-file authority.
  expect(declared(given(rows, "app-b", "shelf/book.md"))).toEqual({ holds: false, name: "publication-path-not-declared" });
  expect(declared(given(rows, "app-c", "shelf/book.md"))).toEqual({ holds: null, reason: "dependency-unavailable" });
  // Rows page past the first 128.
  const many = Array.from({ length: 200 }, (_, n) => ({ application: `app-${n}`, prefixes: canonicalize([`p${n}/`]) }));
  expect(applicationPublicationPrefixes(given(many, "x", "x").state, "app-199")).toEqual(["p199/"]);
});
