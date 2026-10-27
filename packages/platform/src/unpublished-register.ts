/** Register21 adds an explicit host choice without changing old genesis rules. */
import type { FieldValue, PlatformData } from "@generalbusiness/dap-contract";
import { intentDigest, isFactRef, isRecord, isSeed, same, scopeIdOf } from "@generalbusiness/dap-bytes";
import type { RuleGiven, Rules } from "@generalbusiness/dap-derive";
import { archiveRegister } from "./archive-binding.ts";
import { directorySeed, registerRules } from "./register.ts";
import { UNPUBLISHED_COHORT } from "./archive-binding-wire.ts";

const install = archiveRegister.acts["install"]!, found = archiveRegister.acts["found"]!;
const registerOf = (given: RuleGiven) => given.resolved.subjects.get("also.register") ?? given.state.page("register", ["open"], null, 1).items[0];
const unpublished = (given: RuleGiven) => registerOf(given)?.values["host"] === "none";

export const unpublishedRegister: PlatformData = {
  ...archiveRegister,
  items: { ...archiveRegister.items, claim: { ...archiveRegister.items["claim"]!, refs: {
    ...archiveRegister.items["claim"]!.refs,
    genesis: { ...archiveRegister.items["claim"]!.refs["genesis"]!, to: { type: "code", code: "directory-genesis-result", row: "G1" } },
  } } },
  acts: { ...archiveRegister.acts,
    install: { ...install, guards: [...install.guards, { code: "host-choice", row: "G1" }],
      effects: install.effects.map(effect => "value" in effect && effect.value.slot === "namespace"
        ? { code: "host-namespace", row: "G1" } : effect) },
    found: { ...found, guards: [...found.guards, { code: "found-repository-choice", row: "G1" }],
      sends: [...found.sends, { code: "create-unpublished-directory", row: "G1",
        result: { applied: [{ code: "claim-active", row: "P16" }], refused: [], conflict: [] } }] },
  },
};

export const unpublishedRegisterRules: Rules = {
  ...registerRules,
  // A direct act's result clause has no source FactUse in its field list.
  // The generic result judge has already verified this exact deciding entry;
  // bind its fact to the original native create instead of inventing a read.
  "directory-genesis-result": { place: "type", run: (given, value) => {
    const input = given.input;
    if (!isFactRef(value) || input.type !== "delivery" || input.message.class !== "result" || input.message.outcome !== "applied"
      || !same(value, input.from) || value.seq !== 0 || value.at.kind !== "directory") return false;
    const of = input.message.of, original = given.own(of.from.seq);
    if (!original || original.hash !== of.from.hash || !same(of.from.at, given.resolved.at)) return false;
    const sent = original.entry.sends.find(send => send.n === of.n);
    if (!sent || !isSeed(sent.to) || scopeIdOf(sent.to) !== value.at.scope) return false;
    const origin = original.entry.input;
    const found = origin.type === "act" ? origin : origin.type === "outcome" && origin.kind === "create-repository" && origin.owner === UNPUBLISHED_COHORT.register
      ? given.own(Number(origin.operation.split(":")[0]))?.entry.input : null;
    return found?.type === "act" && found.signed.intent.kind === "found" && same(sent.to, {
      v: 1, kind: "directory", definition: UNPUBLISHED_COHORT.directory, creator: given.resolved.at,
      cause: intentDigest(found.signed.intent), ordinal: 0,
    });
  } },
  "host-choice": { place: "guard", refusals: ["host-unknown"], run: given =>
    ["none", "artifacts", "github.com"].includes(String(given.resolved.fields["host"]))
      ? { holds: true } : { holds: false, name: "host-unknown" } },
  "host-namespace": { place: "effect", most: 1, run: given => [{ effect: "value", item: given.resolved.self,
    slot: "namespace", value: given.resolved.fields["host"] === "none" ? "" : given.resolved.fields["namespace"]! }] },
  "found-repository-choice": { place: "guard", refusals: ["no-repository"], run: given =>
    unpublished(given) && (given.resolved.fields["archive"] !== undefined || given.resolved.fields["import"] !== undefined)
      ? { holds: false, name: "no-repository" } : { holds: true } },
  "open-create-repository": { place: "effect", most: 2, run: given => {
    if (unpublished(given)) return [];
    const rule = registerRules["open-create-repository"];
    if (!rule || rule.place !== "effect") throw Error("Native repository opening rule required");
    return rule.run(given);
  } },
  "create-unpublished-directory": { place: "send", run: given => {
    if (!unpublished(given)) return null;
    const { fields } = given.resolved;
    return { to: directorySeed(given), message: { class: "request", type: "create", body: { fields: {
      claim: { self: true }, branch: fields["branch"], founderHandle: fields["founderHandle"], recoveryKey: fields["recoveryKey"],
    } } } };
  } },
  "claim-active": { place: "effect", most: 3, run: given => {
    const input = given.input;
    if (input.type !== "delivery" || input.message.class !== "result") throw Error("Native creation result required");
    const sent = given.own(input.message.of.from.seq)?.entry.input;
    if (sent?.type !== "act") {
      const rule = registerRules["claim-active"];
      if (!rule || rule.place !== "effect") throw Error("Native hosted claim result rule required");
      return rule.run(given);
    }
    const claim = given.state.item(input.message.of.from.seq);
    if (sent.signed.intent.kind !== "found" || claim?.type !== "claim" || !isRecord(claim.values)) throw Error("Native found claim required");
    return [{ effect: "state", item: claim.id, state: "active" },
      { effect: "ref", item: claim.id, slot: "directory", to: input.from.at as unknown as FieldValue },
      { effect: "ref", item: claim.id, slot: "genesis", to: input.from as unknown as FieldValue }];
  } },
};
