/** A separate lending definition whose appointed member reports Git publications. */
import type { ActType } from "@generalbusiness/dap-contract";
import { anyOf, commit, define, equals, fact, isFact, item, live, member, normalize, optional, party, record, ref, required, text, transition, tree, value } from "@generalbusiness/dap-define";
import { lending, thing } from "../definition.ts";
import { publisherRoles } from "./roles.ts";

export const publisherGrants = {
  establish: publisherRoles.grant("lending.establish"),
  member: publisherRoles.grant("lending.member"),
  staff: publisherRoles.grant("lending.staff"),
  publish: publisherRoles.grant("lending.publish"),
} as const;

const kinds = ["donate", "borrow", "return", "cancel", "publish"] as const;
const through = fact("lending-publisher", ...kinds);
const repository = record({ host: required(text(253)), namespace: required(text(256)), name: required(text(256)) });

export const publisherLibrary = item("library", {
  initial: "open", states: { open: live },
  parties: { founder: party.fixed, publisher: party.optional },
  refs: { cursor: ref.optional(through) },
  values: { repository: value.optional(repository), head: value.optional(commit) },
});

// Preserve the shipped circulation judgments while removing destination delivery.
const withoutDelivery = (kind: keyof typeof lending.acts): ActType => {
  const act = lending.acts[kind]!;
  if (kind !== "establish") return { ...act, sends: [] };
  const { destination: _destination, ...fields } = act.fields;
  return { ...act, fields, effects: act.effects.filter(effect => !("ref" in effect && effect.ref.slot === "destination")), sends: [] };
};
const circulation = {
  establish: withoutDelivery("establish"), donate: withoutDelivery("donate"),
  borrow: withoutDelivery("borrow"), return: withoutDelivery("return"),
  cancel: withoutDelivery("cancel"), publish: withoutDelivery("publish"),
};

export const lendingPublisherSource = define({
  name: "lending-publisher", genesis: "establish", grants: publisherGrants,
  items: [publisherLibrary, thing], rules: lending.rules,
  acts: {
    ...circulation,
    "bind-repository": transition(publisherLibrary, publisherGrants.staff, { fields: { repository: required(repository) } }, ({ f, on }) => ({
      guards: [on.unset("repository")], effects: [on.value("repository", f.repository)],
    })),
    "appoint-publisher": transition(publisherLibrary, publisherGrants.staff, { fields: { publisher: required(member) } }, ({ f, on }) => ({
      effects: [on.party("publisher", f.publisher)],
    })),
    published: transition(publisherLibrary, publisherGrants.publish, { fields: { through: required(through), base: optional(commit), commit: required(commit), tree: required(tree) } }, ({ f, on }) => ({
      guards: [
        on.signer("publisher"),
        isFact(f.through),
        equals({ field: "through", part: "scope" }, { scope: true }),
        anyOf([on.set("head"), equals(f.base, on.slot("head"))], [on.unset("head"), equals(f.base, null)]),
      ],
      effects: [on.value("head", f.commit), on.ref("cursor", f.through)],
    })),
    "adopt-head": transition(publisherLibrary, publisherGrants.staff, { fields: { commit: required(commit) } }, ({ f, on }) => ({
      effects: [on.value("head", f.commit)],
    })),
  },
});

export const lendingPublisher = normalize(lendingPublisherSource);
