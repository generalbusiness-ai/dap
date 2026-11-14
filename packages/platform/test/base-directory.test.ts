// Directory 27 of the `base` family (rulings 68356c6c point 4c and bccd8dd1 Q2): exclusive publication claims within one Directory.
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { canonicalize, scopeIdOf } from "@generalbusiness/dap-bytes";
import { validateDefinition, type GuardRule, type Item, type RuleGiven } from "@generalbusiness/dap-derive";
import { RULE_PROFILES } from "@generalbusiness/dap-derive/rule";
import { BASE_COHORT as C, SIBLINGS_OF, platform } from "../src/index.ts";

const directory = platform(C.directory)!;
const guard = (code: string) => { const rule = directory.rules[code]; if (rule?.place !== "guard") throw Error(code); return rule.run as GuardRule; };
const destination = { scope: scopeIdOf({ v: 1, kind: "destination", definition: C.destination, creator: null, cause: `sha256:${"c".repeat(64)}`, ordinal: 0 }), genesis: `sha256:${"d".repeat(64)}` };

/** A Directory state that holds these applications, and a request with these fields. */
function given(fields: Record<string, unknown>, held: readonly { state: string; publication?: readonly string[] }[], bound = true): RuleGiven {
  const items: Item[] = held.map((row, id) => ({ id: id + 1, type: "application", state: row.state, values: row.publication ? { publication: canonicalize(row.publication) } : {}, refs: {}, parties: {} }) as unknown as Item);
  const repository = { id: 0, type: "repository", state: "open", values: {}, refs: bound ? { destination } : {}, parties: {} } as unknown as Item;
  const page = (type: string, states: readonly string[], after: number | null, limit: number) => {
    const all = type === "repository" ? [repository] : items.filter(item => item.type === type && states.includes(item.state) && (after === null || item.id > after));
    return { items: all.slice(0, limit), more: all.length > limit };
  };
  return { resolved: { fields, subjects: new Map() }, state: { page } } as unknown as RuleGiven;
}

test("Directory 27 validates whole and creates the base family's siblings", () => {
  for (const pin of [C.membership, C.rules, C.directory]) {
    const checked = validateDefinition(platform(pin)!.data, PROPOSED_BOUNDS, RULE_PROFILES, { platform: true });
    expect(checked.ok ? [] : checked.problems, pin).toEqual([]);
  }
  expect(SIBLINGS_OF[C.directory]).toEqual({ membership: C.membership, rules: C.rules, destination: C.destination });
  const create = directory.data.receives["application-create"]!;
  expect([create.fields["deviceGrant"]?.required, create.fields["publication"]?.required]).toEqual([false, false]);
  expect(create.guards.map(row => "code" in row ? row.code : null)).toEqual([null, "installed-application-ready", "application-capabilities", "publication-prefix-free"]);
});

test("a prefix that overlaps a creating or created application's prefix refuses publication-prefix-in-use; a failed creation releases its claim", () => {
  const free = guard("publication-prefix-free");
  const asks = (prefixes: readonly string[]) => ({ publication: canonicalize(prefixes) });
  expect(free(given(asks(["shelf/"]), [{ state: "created", publication: ["docs/"] }]))).toEqual({ holds: true });
  expect(free(given(asks(["shelf/"]), [{ state: "created", publication: ["shelf/"] }]))).toEqual({ holds: false, name: "publication-prefix-in-use" });
  expect(free(given(asks(["shelf/old/"]), [{ state: "creating", publication: ["shelf/"] }]))).toEqual({ holds: false, name: "publication-prefix-in-use" });
  expect(free(given(asks(["shelf/"]), [{ state: "creating", publication: ["a/", "shelf/new/"] }]))).toEqual({ holds: false, name: "publication-prefix-in-use" });
  expect(free(given(asks(["shelf/"]), [{ state: "refused", publication: ["shelf/"] }, { state: "conflict", publication: ["shelf/"] }]))).toEqual({ holds: true });
  expect(free(given(asks(["shelf-old/"]), [{ state: "created", publication: ["shelf/"] }]))).toEqual({ holds: true });
  // A request without prefixes claims nothing; the Destination must exist to receive the empty list.
  expect(free(given({}, [{ state: "created", publication: ["shelf/"] }]))).toEqual({ holds: true });
  expect(free(given({}, [], false))).toEqual({ holds: null, reason: "dependency-unavailable" });
  // Claims page past the first 128 applications.
  const many = Array.from({ length: 200 }, (_, n) => ({ state: "created", publication: [`p${n}/`] }));
  expect(free(given(asks(["p199/x/"]), many))).toEqual({ holds: false, name: "publication-prefix-in-use" });
});

test("a malformed prefix list refuses invalid-application-creation and a malformed grant refuses invalid-device-command-grant", () => {
  const capabilities = guard("application-capabilities");
  expect(capabilities(given({}, []))).toEqual({ holds: true });
  expect(capabilities(given({ publication: canonicalize(["shelf/"]) }, []))).toEqual({ holds: true });
  for (const publication of ["[]", '["shelf"]', '[ "shelf/"]', canonicalize(["b/", "a/"]), canonicalize([".git/"]), "not json"])
    expect(capabilities(given({ publication }, [])), publication).toEqual({ holds: false, name: "invalid-application-creation" });
  expect(capabilities(given({ deviceGrant: "{}" }, []))).toEqual({ holds: false, name: "invalid-device-command-grant" });
});
