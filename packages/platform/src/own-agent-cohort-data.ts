/** The own-agent family uses later binding and preserves every older family. */
import type { PlatformData } from "@generalbusiness/dap-contract";
import { intentDigest, isFactRef, isSeed, same, scopeIdOf } from "@generalbusiness/dap-bytes";
import type { Rules } from "@generalbusiness/dap-derive";
import { OWN_AGENT_COHORT as C } from "./own-agent-cohort.ts";
import { repositoryBindingRegister, repositoryBindingRegisterRules, repositoryBindingDirectory, repositoryBindingDirectoryRules, repositoryBindingDestination, repositoryBindingDestinationRules } from "./repository-binding-cohort-data.ts";

export const ownAgentRegister = repositoryBindingRegister;
export const ownAgentRegisterRules: Rules = { ...repositoryBindingRegisterRules,
  "directory-genesis-result": { place: "type", run: (given, value) => {
    const input = given.input;
    if (!isFactRef(value) || input.type !== "delivery" || input.message.class !== "result" || input.message.outcome !== "applied"
      || !same(value, input.from) || value.seq !== 0 || input.sourceKind !== "directory") return false;
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
const establish = repositoryBindingDirectory.acts["establish"]!;
export const ownAgentDirectory: PlatformData = { ...repositoryBindingDirectory,
  acts: { ...repositoryBindingDirectory.acts, establish: { ...establish,
    sends: establish.sends.map(send => "create" in send && send.create.kind === "membership"
      ? { create: { ...send.create, definition: C.membership } } : send) } },
};
export const ownAgentDirectoryRules = repositoryBindingDirectoryRules;
export const ownAgentDestination = repositoryBindingDestination;
export const ownAgentDestinationRules = repositoryBindingDestinationRules;
