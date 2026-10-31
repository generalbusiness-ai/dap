/** Only this cohort creates a Commons and grants its initial write action. */
import type { FieldValue, PlatformData, Seed } from "@generalbusiness/dap-contract";
import { intentDigest, isFactRef, isScopeRef, isSeed, same, scopeIdOf, seedDigest } from "@generalbusiness/dap-bytes";
import type { Rules } from "@generalbusiness/dap-derive";
import { COMMONS_COHORT as C } from "./commons-cohort.ts";
import { SIBLINGS_OF } from "./directory.ts";
import { membership7, membershipRules7 } from "./application-install-grants.ts";
import { unpublishedDirectory, unpublishedDirectoryRules } from "./unpublished-directory.ts";
import { unpublishedRegister, unpublishedRegisterRules } from "./unpublished-register.ts";

export const commonsRegister = unpublishedRegister;
export const commonsRegisterRules: Rules = { ...unpublishedRegisterRules,
  "directory-genesis-result": { place: "type", run: (given, value) => {
    const input = given.input;
    if (!isFactRef(value) || input.type !== "delivery" || input.message.class !== "result" || input.message.outcome !== "applied"
      || !same(value, input.from) || value.seq !== 0 || value.at.kind !== "directory") return false;
    const of = input.message.of, original = given.own(of.from.seq);
    if (!original || original.hash !== of.from.hash || !same(of.from.at, given.resolved.at)) return false;
    const sent = original.entry.sends.find(send => send.n === of.n);
    if (!sent || !isSeed(sent.to) || scopeIdOf(sent.to) !== value.at.scope) return false;
    const origin = original.entry.input;
    const found = origin.type === "act" ? origin : origin.type === "outcome" && origin.kind === "create-repository" && origin.owner === C.register
      ? given.own(Number(origin.operation.split(":")[0]))?.entry.input : null;
    return found?.type === "act" && found.signed.intent.kind === "found" && same(sent.to, {
      v: 1, kind: "directory", definition: C.directory, creator: given.resolved.at,
      cause: intentDigest(found.signed.intent), ordinal: 0,
    });
  } },
};
export const commonsMembershipData = membership7;
export const commonsMembershipRules = membershipRules7;
const establish = unpublishedDirectory.acts["establish"]!;
const stage = unpublishedDirectory.receives["application-stage"]!;
export const commonsDirectoryData: PlatformData = { ...unpublishedDirectory,
  items: { ...unpublishedDirectory.items, repository: { ...unpublishedDirectory.items["repository"]!,
    refs: { ...unpublishedDirectory.items["repository"]!.refs,
      commons: { fixed: false, required: false, to: { type: "scope", kind: "commons" } },
    },
  } },
  receives: { ...unpublishedDirectory.receives, "application-stage": { ...stage,
    fields: { ...stage.fields, needsCommons: { type: "bool", required: true } },
    guards: [...stage.guards, { code: "has-commons", row: "BO1" }],
  } },
  acts: { ...unpublishedDirectory.acts, establish: { ...establish,
    sends: [...establish.sends.map(send => "create" in send && send.create.kind === "membership"
      ? { create: { ...send.create, definition: C.membership } } : send),
    { code: "create-commons", row: "BO1", always: true, result: { applied: [{ ref: { slot: "commons", from: { sender: true } } }] } }],
  } },
};
export const commonsDirectoryRules: Rules = { ...unpublishedDirectoryRules,
  "has-commons": { place: "guard", refusals: ["commons-missing"], run: given => {
    const commons = given.resolved.subjects.get("also.repository")?.refs["commons"];
    return given.resolved.fields["needsCommons"] === false || isScopeRef(commons) && commons.kind === "commons"
      ? { holds: true } : { holds: false, name: "commons-missing" };
  } },
  "create-commons": { place: "send", run: given => {
    if (given.input.type !== "genesis" || given.input.seed.definition !== C.directory) throw Error("Commons creation needs its exact Directory genesis");
    const root = given.input.seed, cause = seedDigest(root);
    const seed: Seed = { v: 1, kind: "commons", definition: C.commons, creator: given.resolved.at, cause, ordinal: 3 };
    const membership = scopeIdOf({ v: 1, kind: "membership", definition: SIBLINGS_OF[C.directory]!.membership, creator: given.resolved.at, cause, ordinal: 0 });
    return { to: seed, message: { class: "request", type: "create", body: { fields: { directory: given.resolved.at as unknown as FieldValue, membership } } } };
  } },
};
