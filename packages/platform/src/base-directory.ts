/**
 * Directory 27 of the `base` family (rulings 68356c6c points 4 and 5, and
 * bccd8dd1 Q2). It is Directory 26 of the own-agent family, with three
 * changes to `application-create`:
 *
 * - The request is ordinary or device, and it may carry the declared
 *   publication prefixes. A device request carries the grant, as under
 *   Directory 26. A malformed grant refuses `invalid-device-command-grant`;
 *   a malformed prefix list refuses `invalid-application-creation`.
 * - Publication claims are exclusive. A prefix that overlaps a prefix of a
 *   creating or created application refuses `publication-prefix-in-use`.
 *   A refused or conflicting creation releases its claim; a created one
 *   keeps it.
 * - The creation context of the root is v1 for an ordinary package, v2
 *   for a device grant alone, and v3 when it carries prefixes. In the same
 *   entry the Directory tells its Destination the prefixes of the new
 *   application, or an empty list, under the application's scope ID.
 */
import type { PlatformData } from "@generalbusiness/dap-contract";
import { canonicalize, isRecord, isScopeRef, isSeed, scopeIdOf } from "@generalbusiness/dap-bytes";
import type { Item, RuleGiven, Rules } from "@generalbusiness/dap-derive";
import { directoryRules11 } from "./application-install-creation.ts";
import { BASE_COHORT as C } from "./base-cohort.ts";
import { grantOf } from "./device-application-directory.ts";
import { ownAgentDirectory, ownAgentDirectoryRules } from "./own-agent-cohort-data.ts";
import { PUBLICATION_TEXT_BYTES, prefixesOverlap, readPublicationText } from "./publication-paths.ts";

/** The message that carries an application's declared prefixes from the Directory to its Destination. */
export const APPLICATION_PATHS = "application-paths";
/** Applications that claim, or hold, prefixes. */
const CLAIMING = ["creating", "created"] as const;
const row = "CF1" as const;

const establish = ownAgentDirectory.acts["establish"]!;
const create = ownAgentDirectory.receives["application-create"]!;
const application = ownAgentDirectory.items["application"]!;
export const baseDirectory: PlatformData = { ...ownAgentDirectory,
  items: { ...ownAgentDirectory.items, application: { ...application,
    values: { ...application.values, publication: { fixed: true, required: false, of: { type: "text", max: PUBLICATION_TEXT_BYTES } } } } },
  acts: { ...ownAgentDirectory.acts, establish: { ...establish,
    sends: establish.sends.map(send => "create" in send && send.create.kind === "membership"
      ? { create: { ...send.create, definition: C.membership } } : send) } },
  receives: { ...ownAgentDirectory.receives, "application-create": { ...create,
    fields: { ...create.fields, deviceGrant: { ...create.fields["deviceGrant"]!, required: false },
      publication: { type: "text", max: PUBLICATION_TEXT_BYTES, required: false } },
    guards: [...create.guards.filter(guard => !("code" in guard && guard.code === "device-install-grant")),
      { code: "application-capabilities", row }, { code: "publication-prefix-free", row }],
    effects: [...create.effects, { code: "keep-publication", row }],
    sends: [...create.sends, { code: "send-application-paths", row, always: true, result: {} }],
  } },
};

function destinationOf(given: RuleGiven) {
  const ref = given.state.page("repository", ["open"], null, 1).items[0]?.refs["destination"];
  return isScopeRef(ref) ? ref : null;
}
/** Every application item in those states, lowest ID first. */
function* applications(given: RuleGiven, states: readonly string[]): Generator<Item> {
  for (let after: number | null = null; ;) {
    const page = given.state.page("application", states, after, 128);
    yield* page.items;
    const last = page.items.at(-1);
    if (!page.more || !last) return;
    after = last.id;
  }
}
/** The request's prefixes: an empty list when it declares none. */
const requested = (given: RuleGiven): readonly string[] => readPublicationText(given.resolved.fields["publication"]) ?? [];

/** The root's creation, with the marker of its capability set. */
function rootCreation(given: RuleGiven) {
  const rule = directoryRules11["create-installed-application"];
  if (!rule || rule.place !== "send") throw Error("native application creation rule required");
  const request = rule.run(given);
  if (!request || !isSeed(request.to) || request.message.class !== "request" || !isRecord(request.message.body)) throw Error("checked application creation required");
  const grant = given.resolved.fields["deviceGrant"] === undefined ? null : grantOf(given);
  const publication = given.resolved.fields["publication"] === undefined ? null : readPublicationText(given.resolved.fields["publication"]);
  if (given.resolved.fields["deviceGrant"] !== undefined && !grant || given.resolved.fields["publication"] !== undefined && !publication) throw Error("checked capability set required");
  const creationContext = publication
    ? { v: 3, ...(grant ? { delegate: true, deviceCommand: grant } : {}), publication }
    : grant ? { v: 2, deviceCommand: grant, delegate: true } : { v: 1 };
  return { ...request, to: request.to, message: { ...request.message, body: { ...request.message.body, creationContext } } };
}

export const baseDirectoryRules: Rules = { ...ownAgentDirectoryRules,
  "application-capabilities": { place: "guard", refusals: ["invalid-device-command-grant", "invalid-application-creation"], run: given => {
    if (given.resolved.fields["deviceGrant"] !== undefined && !grantOf(given)) return { holds: false, name: "invalid-device-command-grant" };
    if (given.resolved.fields["publication"] !== undefined && !readPublicationText(given.resolved.fields["publication"])) return { holds: false, name: "invalid-application-creation" };
    return { holds: true };
  } },
  /** Ruling 68356c6c, point 4c. The Destination must exist to receive the prefixes. */
  "publication-prefix-free": { place: "guard", refusals: ["publication-prefix-in-use"], run: given => {
    if (!destinationOf(given)) return { holds: null, reason: "dependency-unavailable" };
    const prefixes = requested(given);
    if (prefixes.length === 0) return { holds: true };
    for (const item of applications(given, CLAIMING)) {
      const held = readPublicationText(item.values["publication"]);
      if (held && prefixesOverlap(prefixes, held)) return { holds: false, name: "publication-prefix-in-use" };
    }
    return { holds: true };
  } },
  "keep-publication": { place: "effect", most: 1, run: given => {
    const raw = given.resolved.fields["publication"];
    return raw === undefined ? [] : [{ effect: "value", item: given.resolved.self, slot: "publication", value: raw }];
  } },
  "create-installed-application": { place: "send", run: rootCreation },
  "send-application-paths": { place: "send", run: given => {
    const destination = destinationOf(given);
    if (!destination) throw Error("the Directory's Destination required");
    return { to: destination, message: { class: "request", type: "tell", body: { message: APPLICATION_PATHS,
      fields: { application: scopeIdOf(rootCreation(given).to), prefixes: canonicalize(requested(given)) } } } };
  } },
};
