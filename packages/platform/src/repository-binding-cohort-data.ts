/** Native binding records a single repository; host configuration separately authorizes its use. */
import type { PlatformData } from "@generalbusiness/dap-contract";
import { intentDigest, isFactRef, isRecord, isSeed, same, scopeIdOf } from "@generalbusiness/dap-bytes";
import type { Rules } from "@generalbusiness/dap-derive";
import { membership7, membershipRules7 } from "./application-install-grants.ts";
import { DESTINATION_ATTEMPTS, DESTINATION_KINDS } from "./destination.ts";
import { REPOSITORY } from "./register.ts";
import { REPOSITORY_BINDING_COHORT as B, repositoryBindingBranch } from "./repository-binding-cohort.ts";
import { unpublishedRegister, unpublishedRegisterRules } from "./unpublished-register.ts";
import { unpublishedDirectory, unpublishedDirectoryRules } from "./unpublished-directory.ts";
import { unpublishedDestination, unpublishedDestinationRules } from "./unpublished-destination.ts";
import { pinnedBy } from "./versions.ts";

export const repositoryBindingRegister = unpublishedRegister;
export const repositoryBindingRegisterRules: Rules = { ...unpublishedRegisterRules,
  // Keep Register21's evaluator fixed. This result belongs to the new pair.
  "directory-genesis-result": { place: "type", run: (given, value) => {
    const input = given.input;
    if (!isFactRef(value) || input.type !== "delivery" || input.message.class !== "result" || input.message.outcome !== "applied"
      || !same(value, input.from) || value.seq !== 0 || input.sourceKind !== "directory") return false;
    const of = input.message.of, original = given.own(of.from.seq);
    if (!original || original.hash !== of.from.hash || !same(of.from.at, given.resolved.at)) return false;
    const sent = original.entry.sends.find(send => send.n === of.n);
    if (!sent || !isSeed(sent.to) || scopeIdOf(sent.to) !== value.at.scope) return false;
    const origin = original.entry.input;
    const found = origin.type === "act" ? origin : origin.type === "outcome" && origin.kind === "create-repository" && origin.owner === B.register
      ? given.own(Number(origin.operation.split(":")[0]))?.entry.input : null;
    return found?.type === "act" && found.signed.intent.kind === "found" && same(sent.to, {
      v: 1, kind: "directory", definition: B.directory, creator: given.resolved.at,
      cause: intentDigest(found.signed.intent), ordinal: 0,
    });
  } },
};

const establish = unpublishedDirectory.acts["establish"]!;
export const repositoryBindingDirectory: PlatformData = { ...unpublishedDirectory,
  items: { ...unpublishedDirectory.items, repository: { ...unpublishedDirectory.items["repository"]!,
    values: { ...unpublishedDirectory.items["repository"]!.values,
      repository: { ...unpublishedDirectory.items["repository"]!.values["repository"]!, fixed: false } } } },
  acts: { ...unpublishedDirectory.acts, establish: { ...establish,
    sends: establish.sends.map(send => "create" in send && send.create.kind === "membership"
      ? { create: { ...send.create, definition: B.membership } } : send) } },
  receives: { ...unpublishedDirectory.receives,
    "repository-bound": {
      message: "repository-bound", class: "tell", from: { kind: "destination", under: "platform:destination" }, opens: null,
      also: { repository: { item: "repository", one: true } },
      fields: { repository: { ...REPOSITORY, required: true } },
      guards: [
        { equals: { a: { sender: true }, b: { slot: "destination", of: "also.repository" } }, reason: "not-the-destination" },
        { code: "repository-not-bound", row: "G3" },
      ],
      effects: [{ of: "also.repository", value: { slot: "repository", from: { field: "repository" } } }],
      sends: [], attention: [],
    },
  },
};
export const repositoryBindingDirectoryRules: Rules = { ...unpublishedDirectoryRules,
  "repository-not-bound": { place: "guard", refusals: ["repository-already-bound"], run: given =>
    given.resolved.subjects.get("also.repository")?.values["repository"] == null
      ? { holds: true } : { holds: false, name: "repository-already-bound" } },
};

export const repositoryBindingMembership = membership7;
export const repositoryBindingMembershipRules = membershipRules7;

export const repositoryBindingDestination: PlatformData = { ...unpublishedDestination,
  items: { ...unpublishedDestination.items, branch: { ...unpublishedDestination.items["branch"]!,
    values: { ...unpublishedDestination.items["branch"]!.values,
      repository: { ...unpublishedDestination.items["branch"]!.values["repository"]!, fixed: false } } } },
  acts: { ...unpublishedDestination.acts,
    "bind-repository": {
      step: "transition", on: "branch", grant: "destination.bind-repository", also: {},
      fields: { repository: { ...REPOSITORY, required: true }, why: { type: "text", max: 1024, required: true } },
      guards: [{ state: ["unpublished"] }, { code: "binding-github-repository", row: "G3" }],
      effects: [
        { value: { slot: "repository", from: { field: "repository" } } },
        { state: "empty" }, { code: "binding-first-head", row: "G3" },
      ],
      sends: [{ tell: { to: { slot: "directory" }, message: "repository-bound",
        fields: { repository: { field: "repository" } }, result: {} } }],
      attention: [],
    },
  },
};
export const repositoryBindingDestinationRules: Rules = { ...unpublishedDestinationRules,
  "binding-github-repository": { place: "guard", refusals: ["invalid-repository-binding"], run: given => {
    const repository = given.resolved.fields["repository"], branch = given.resolved.subjects.get("on");
    try {
      if (!isRecord(repository) || repository["host"] !== "github.com"
        || typeof repository["namespace"] !== "string" || !/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(repository["namespace"])
        || typeof repository["name"] !== "string" || !/^[A-Za-z0-9_.-]{1,100}$/.test(repository["name"])
        || [".", ".."].includes(repository["name"]) || repository["name"].toLowerCase().endsWith(".git")
        || typeof repository["id"] !== "string" || !/^[1-9][0-9]*$/.test(repository["id"])
        || !Number.isSafeInteger(Number(repository["id"])) || String(Number(repository["id"])) !== repository["id"]
        || !repositoryBindingBranch(branch?.values["name"])) throw Error();
      return { holds: true };
    } catch { return { holds: false, name: "invalid-repository-binding" }; }
  } },
  "binding-first-head": { place: "effect", most: 4, run: given => {
    const branch = given.resolved.subjects.get("on");
    if (!branch) throw Error("Native binding branch required");
    return [
      { effect: "operation", k: 0, owner: pinnedBy(given), kind: DESTINATION_KINDS.firstHead, attempts: DESTINATION_ATTEMPTS.firstHead, for: branch.id },
      { effect: "attempt", operation: { k: 0 }, attempt: 1, result: "opened", selected: null },
      { effect: "operation", k: 1, owner: pinnedBy(given), kind: DESTINATION_KINDS.mint, attempts: DESTINATION_ATTEMPTS.mint, for: branch.id },
      { effect: "attempt", operation: { k: 1 }, attempt: 1, result: "opened", selected: null },
    ];
  } },
};
