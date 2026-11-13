/**
 * Destination 21 of the `base` family (ruling 68356c6c, points 4b, 5b and 6).
 * It is Destination 20 of the own-agent family, with the fixed one-hour
 * read token of Destination 19, and two changes:
 *
 * - It receives `application-paths` from its Directory and keeps one row
 *   per application: the application's scope ID and its declared prefixes,
 *   or an empty list.
 * - `publish-file` judges the requested path against the sender's row. A
 *   path outside every prefix refuses `publication-path-not-declared`. A
 *   sender without a row holds until the row arrives. The path and the
 *   row stand in the record, so replay derives the same refusal.
 *
 * The host's `publicationRefusal` checks every touched path and link target
 * against the same prefixes before it pushes.
 */
import type { PlatformData } from "@generalbusiness/dap-contract";
import type { Rules, StateView } from "@generalbusiness/dap-derive";
import { APPLICATION_PATHS } from "./base-directory.ts";
import { ownAgentDestination, ownAgentDestinationRules } from "./own-agent-cohort-data.ts";
import { PUBLICATION_TEXT_BYTES, readPublicationText, withinPublicationPrefixes } from "./publication-paths.ts";

/** At most this many applications of one Directory hold a row. Directory 27 holds at most as many applications. */
export const APPLICATION_PATH_ROWS = 1000;
const row = "CF1" as const;

const readToken = ownAgentDestination.acts["read-token"]!;
const publishFile = ownAgentDestination.receives["publish-file"]!;
export const baseDestination: PlatformData = { ...ownAgentDestination,
  items: { ...ownAgentDestination.items, [APPLICATION_PATHS]: {
    many: true, max: APPLICATION_PATH_ROWS, initial: "kept", states: { kept: { final: false } }, parties: {}, refs: {},
    values: {
      application: { fixed: true, required: true, of: { type: "text", max: 64 } },
      prefixes: { fixed: true, required: true, of: { type: "text", max: PUBLICATION_TEXT_BYTES } },
    },
  } },
  acts: { ...ownAgentDestination.acts, "read-token": { ...readToken, fields: {} } },
  receives: { ...ownAgentDestination.receives,
    [APPLICATION_PATHS]: {
      message: APPLICATION_PATHS, class: "tell", from: { kind: "directory", under: "platform:directory" }, opens: APPLICATION_PATHS,
      also: { branch: { item: "branch", one: true } },
      fields: { application: { type: "text", max: 64, required: true }, prefixes: { type: "text", max: PUBLICATION_TEXT_BYTES, required: true } },
      guards: [{ equals: { a: { sender: true }, b: { slot: "directory", of: "also.branch" } }, reason: "not-the-directory" }],
      effects: [{ value: { slot: "application", from: { field: "application" } } }, { value: { slot: "prefixes", from: { field: "prefixes" } } }],
      sends: [], attention: [],
    },
    "publish-file": { ...publishFile, guards: [...publishFile.guards, { code: "publication-path-declared", row }] },
  },
};

/**
 * The prefixes that this Destination keeps for one application scope, or an
 * empty list for an application that declares none. Null: no row has
 * arrived. The host's publication policy reads the same rows.
 */
export function applicationPublicationPrefixes(state: Pick<StateView, "page">, application: string): readonly string[] | null {
  for (let after: number | null = null; ;) {
    const page = state.page(APPLICATION_PATHS, ["kept"], after, 128);
    const found = page.items.find(item => item.values["application"] === application);
    if (found) return found.values["prefixes"] === "[]" ? [] : readPublicationText(found.values["prefixes"]) ?? [];
    const last = page.items.at(-1);
    if (!page.more || !last) return null;
    after = last.id;
  }
}

export const baseDestinationRules: Rules = { ...ownAgentDestinationRules,
  "publication-path-declared": { place: "guard", refusals: ["publication-path-not-declared"], run: given => {
    if (given.input.type !== "delivery") throw Error("publish-file is a delivery");
    const prefixes = applicationPublicationPrefixes(given.state, given.input.from.at.scope);
    if (!prefixes) return { holds: null, reason: "dependency-unavailable" };
    return withinPublicationPrefixes(given.resolved.fields["path"], prefixes) ? { holds: true } : { holds: false, name: "publication-path-not-declared" };
  } },
};
