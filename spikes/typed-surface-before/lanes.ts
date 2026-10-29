/**
 * A slice of the change lane in the v2 vocabulary: the items and rows that
 * use the most of the contract. apps/room/lanes/definitions/change.json is
 * the original; docs/lanes-reference.md describes the same rows in words.
 * The slice is not the whole lane: the witness compares row by row.
 */
import {
  anyOf, author, bool, by, commit, constant, detached, differs, digest, distinct, each, eachItem, eachOf, eachSlot, enumOf, equals, fact, final, has, ifPresent, index, int, invoke, isFact, item, itemOf, list, live, member,
  none, nothing, one, open, optional, part, party, permit, plusSeconds, presented, range, receive, record, ref, refuse, relate, required, scope, signer, slotsOf, tell, text, theIntent, theScope, time, transition, tree, value, via, when,
  authorsFrom, authorsIn, elements, type Of,
} from "./lib.ts";

const CHANGE = "change", ISSUE = "issue";
const n = int(0, 1_000_000_000);

// ---------------------------------------------------------------- items

export const proposal = item("proposal", {
  states: { draft: live, open: live, closed: live, merged: final },
  parties: { assignees: party.list(10), author: party.fixed },
  refs: { destination: ref.fixed(scope("destination")), rulesScope: ref.fixed(scope("rules")) },
  values: { body: value.optional(detached(65536)), labels: value.optional(list(text(64), 20)), number: value.optional(int(1, 1_000_000_000)), title: value.required(text(256)) },
});
export const commitment = item("commitment", {
  many: 16,
  states: { offered: live, accepted: live, declined: final, withdrawn: final, cancelled: final },
  parties: { offeree: party.once, performer: author(party.optional), requester: party.fixed, successor: party.optional },
  refs: { termsAt: ref.fixed(fact(CHANGE, "offer")) },
  values: { terms: value.fixed(text(4096)) },
});
export const hold = item("hold", {
  many: 16,
  states: { held: live, ended: final },
  parties: { holder: party.required },
  refs: { under: ref.fixed(itemOf("commitment")) },
  values: { ends: value.required(time), epoch: value.required(int(1, 1_000_000)), extent: value.optional(text(1024)) },
});
export const exportItem = item("export", {
  many: 16,
  states: { authorized: live, done: final, refused: final },
  parties: { authorizer: party.fixed, from: party.fixed, to: party.fixed },
  refs: { hold: ref.fixed(itemOf("hold")) },
});
const selection = list(record({ accepted: required(fact(ISSUE, "accept-report")), report: required(fact(ISSUE, "report")) }), 32);
const decisionList = list(fact(ISSUE, "resolve-concern"), 32);
export const manifest = item("manifest", {
  many: 64,
  states: { current: live, superseded: final },
  parties: { authors: party.list(64, "fixed"), integrator: party.fixed },
  refs: { goal: ref.once(fact(ISSUE, "file", "revise")), pin: ref.once(fact(ISSUE, "hold@1:check")), plan: ref.once(fact(ISSUE, "seal-plan")), staging: ref.once(scope("lane")), under: ref.once(itemOf("commitment")) },
  values: {
    base: value.fixed(commit), complete: value.fixed(bool), decisions: value.once(decisionList), digest: value.once(digest), integration: value.once(commit),
    path: value.once(text(1024)), selected: value.once(selection), size: value.once(int(0, 65536)), tree: value.once(tree),
  },
});
export const merge = item("merge", {
  many: 16,
  states: { intended: live, committed: live, unknown: live, published: final, refused: final, aborted: final },
  parties: { merger: party.fixed },
  refs: { manifest: ref.fixed(itemOf("manifest")) },
  values: { commit: value.optional(commit), reason: value.optional(text(1024)), withdrawal: value.optional(enumOf("asked")) },
});
export const link = item("link", {
  many: 32,
  states: { set: live, removed: live },
  parties: { linker: party.fixed },
  refs: { issue: ref.fixed(scope("lane")) },
  values: { how: value.fixed(enumOf("keyword", "manual")) },
});

// ---------------------------------------------------------------- combinators

/** The signer is the commitment's offeree, or anyone when none was named. */
const offereeOrOpen = (c: Of<typeof commitment>) => refuse("not-offeree", anyOf([c.unset("offeree")], [equals(signer, c.slot("offeree"))]));
/** The commitment is accepted and the signer is its performer. */
const performing = (c: Of<typeof commitment>) => [c.in("accepted"), c.signer("performer")];
/** The pin presented with a manifest carries a check whose `part` must equal `value`. */
const pinCarries = (pin: { presented: string }, name: string, value: Parameters<typeof equals>[1]) => ifPresent(refuse("pin-mismatch", equals(part(pin, { carried: `check.${name}` }), value)));
/** The plan's `required` or `optional` list: entries of a child scope (`child`) for a concern (`item`), as the issue lane's seal-plan declares them. */
const planList = (plan: { field: string }, listName: "required" | "optional") => elements(part(plan, { field: listName }), "item", "child");
/** Some entry of the plan's `list` (required or optional) has `member` equal to `value`. */
const planHas = (plan: { field: string }, listName: "required" | "optional", member: "item" | "child", value: Parameters<typeof equals>[1]) => has(planList(plan, listName), "k", (k) => ({ where: [equals(k[member], value)] }));
const inPlan = (plan: { field: string }, member: "item" | "child", value: Parameters<typeof equals>[1]) => anyOf([planHas(plan, "required", member, value)], [planHas(plan, "optional", member, value)]);
/** A decision that accepts `accepted` as delivered on the same terms. */
const acceptedAsDelivered = (decisions: { field: string }, accepted: Parameters<typeof equals>[1]) => has(decisions, "d", (d) => ({
  where: [equals(part(d.self, { field: "kind" }), constant("accepted-as-delivered")), equals(part(d.self, { field: "acceptance" }), accepted), equals(part(d.self, { field: "terms" }), part(accepted, { field: "terms" }))],
}));
const published = (outcome: { field: string }) => equals(outcome, constant("published"));

// ---------------------------------------------------------------- the rows

export const acts = {
  accept: transition(commitment, "change.promise", { fields: { terms: required(fact(CHANGE, "offer")) } }, ({ f, on }) => ({
    guards: [on.in("offered"), offereeOrOpen(on), refuse("terms-differ", equals(f.terms, on.slot("termsAt")))],
    effects: [on.to("accepted"), on.party("performer", signer)],
    attention: [on.notify("requester", "after", "accepted")],
  })),
  "take-hold": open(hold, "change.work", { fields: { commitment: required(itemOf("commitment")), extent: optional(text(1024)) }, also: { commitment: by(commitment, "commitment"), proposal: one(proposal) } }, ({ f, on, also }) => ({
    guards: [also.proposal.in("draft", "open"), ...performing(also.commitment), refuse("hold-held", none(range(hold, ["held"], { where: (h) => [equals(h.slot("under"), also.commitment.id)] })))],
    effects: [on.hold("open", f.extent), on.ref("under", also.commitment.id), on.value("extent", f.extent), on.value("ends", plusSeconds(3600))],
  })),
  "release-hold": transition(hold, "change.work", {}, ({ on }) => ({ guards: [on.in("held"), on.signer("holder")], effects: [on.hold("end")] })),
  "authorize-export": open(exportItem, "work.export", { fields: { hold: required(itemOf("hold")), to: required(member) }, also: { hold: by(hold, "hold") } }, ({ f, on, also }) => ({
    guards: [also.hold.in("ended")],
    effects: [on.party("from", also.hold.slot("holder")), on.party("to", f.to), on.party("authorizer", signer), on.ref("hold", also.hold.id)],
  })),
  "propose-manifest": open(manifest, "change.propose", {
    fields: {
      previous: optional(itemOf("manifest")), hold: optional(itemOf("hold")), lane: optional(scope("lane")), foreignHold: optional(n), instance: required(text(128)),
      goal: optional(fact(ISSUE, "file", "revise")), plan: optional(fact(ISSUE, "seal-plan")), selected: required(selection), decisions: required(decisionList),
      base: required(commit), integration: required(commit), tree: required(tree), complete: required(bool),
    },
    presents: { pin: presented(ISSUE, ["hold@1:check"], false) },
    also: { proposal: one(proposal), previous: by(manifest, "previous"), hold: by(hold, "hold"), commitment: via(commitment, "also.hold", "under") },
  }, ({ f, p, on, also }) => ({
    guards: [
      also.proposal.in("draft", "open"),
      refuse("merge-in-progress", none(range(merge, ["intended", "committed", "unknown"]))),
      refuse("not-the-current-version", none(range(manifest, ["current"], { except: ["also.previous"] }))),
      also.previous.in("current"),
      // Either a local hold, or a foreign one with its lane and pin.
      refuse("source-shape", anyOf(
        [differs(f.hold, nothing), equals(f.lane, nothing), equals(f.foreignHold, nothing), equals(p.pin, nothing)],
        [equals(f.hold, nothing), differs(f.lane, nothing), differs(f.foreignHold, nothing), differs(p.pin, nothing)],
      )),
      also.hold.signer("holder"), also.hold.in("held", "ended"), ...performing(also.commitment),
      ifPresent(isFact(p.pin)), ifPresent(refuse("pin-mismatch", equals(part(p.pin, "scope"), f.lane))),
      pinCarries(p.pin, "intent", theIntent), pinCarries(p.pin, "commit", f.integration), pinCarries(p.pin, "consumer", theScope), pinCarries(p.pin, "hold", f.foreignHold), pinCarries(p.pin, "instance", f.instance),
      permit("hold", "staged", { commit: f.integration, pin: p.pin, under: also.commitment.id }),
      refuse("selection-malformed", each(f.selected, "s", (s) => ({ guards: [isFact(s.accepted), isFact(s.report), equals(part(s.report, "scope"), part(s.accepted, "scope")), equals(part(s.report, "seq"), part(s.accepted, "on"))] }))),
      ifPresent(isFact(f.goal)), ifPresent(isFact(f.plan)),
      refuse("plan-not-of-goal", anyOf([equals(f.plan, nothing)], [equals(part(f.plan, "scope"), part(f.goal, "scope"))])),
      refuse("decision-without-plan", each(f.decisions, "d", (d) => ({ guards: [isFact(d.self), differs(f.plan, nothing)] }))),
      // A complete manifest closes its plan: every selection is planned, every decision is of the plan, every required child is selected, excluded or replaced by one that is.
      refuse("not-complete", anyOf(
        [equals(f.complete, constant(false))],
        [equals(f.plan, nothing)],
        [
          equals(part(f.plan, "scope"), part(f.goal, "scope")), equals(part(f.plan, { field: "goalAt" }), f.goal),
          each(f.selected, "s", (s) => ({ guards: [inPlan(f.plan, "child", part(s.accepted, "scope"))] })),
          distinct(f.selected, "s", (s) => part(s.accepted, "scope")),
          each(f.selected, "s", (s) => ({ where: [differs(part(s.accepted, { of: { field: "terms" }, then: "seq" }), constant(0))], guards: [acceptedAsDelivered(f.decisions, s.accepted)] })),
          each(f.selected, "s", (s) => ({ where: [differs(part(s.accepted, { of: { field: "terms" }, then: "scope" }), part(s.accepted, "scope"))], guards: [acceptedAsDelivered(f.decisions, s.accepted)] })),
          each(f.decisions, "d", (d) => ({ guards: [
            equals(part(d.self, "scope"), part(f.plan, "scope")),
            inPlan(f.plan, "item", part(d.self, { field: "concern" })),
            anyOf([differs(part(d.self, { field: "kind" }), constant("replaced"))], [inPlan(f.plan, "item", part(d.self, { field: "replacedBy" }))]),
          ] })),
          each(planList(f.plan, "required"), "q", (q) => ({ guards: [anyOf(
            [has(f.selected, "s", (s) => ({ where: [equals(part(s.accepted, "scope"), q.child)] }))],
            [has(f.decisions, "d", (d) => ({ where: [equals(part(d.self, { field: "concern" }), q.item), equals(part(d.self, { field: "kind" }), constant("excluded"))] }))],
            [has(f.decisions, "d", (d) => ({
              where: [equals(part(d.self, { field: "concern" }), q.item), equals(part(d.self, { field: "kind" }), constant("replaced"))],
              guards: [anyOf(...(["required", "optional"] as const).map((listName) => [has(planList(f.plan, listName), "k", (k) => ({
                where: [equals(k.item, part(d.self, { field: "replacedBy" }))], guards: [has(f.selected, "s", (s) => ({ where: [equals(part(s.accepted, "scope"), k.child)] }))],
              }))]))],
            }))],
          )] })),
        ],
      )),
      permit("git-read", "ancestry", {
        commit: f.integration, earlier: slotsOf(range(manifest, ["current", "superseded"]), "integration"), pin: p.pin, row: constant("manifest"),
        selected: eachOf(f.selected, "s", (s) => part(s.report, { opened: "commit" })),
      }),
    ],
    effects: [
      on.party("integrator", signer),
      // The manifest's authors: the commitment's performers, the authors of each selected report, the previous manifest's authors, and those the pin carries.
      on.attribute("authors", also.commitment, [authorsIn(f.selected, "s", (s) => part(s.report, { opened: "authors" })), also.previous.authors("authors"), authorsFrom(part(p.pin, { carried: "check.attribution" }))]),
      on.ref("goal", f.goal), on.ref("plan", f.plan), on.ref("staging", f.lane), on.ref("under", also.commitment.id), on.ref("pin", part(p.pin, "ref")),
      on.value("base", f.base), on.value("integration", f.integration), on.value("tree", f.tree), on.value("selected", f.selected), on.value("decisions", f.decisions), on.value("complete", f.complete),
      also.previous.to("superseded"),
      when(invoke("hold", "pin-hold", { commit: f.integration }), { if: [differs(f.hold, nothing)] }),
      when(invoke("hold", "pin-release", { commit: also.previous.slot("integration") }), { if: [also.previous.unset("staging")] }),
    ],
    sends: [
      tell({ to: on.slot("staging"), message: "pin-confirm", fields: { commit: f.integration }, if: [differs(f.lane, nothing)] }),
      tell({ to: also.previous.slot("staging"), message: "unpin", fields: { because: constant("superseded"), commit: also.previous.slot("integration"), manifest: also.previous.id }, if: [also.previous.set("staging")] }),
    ],
  })),
};

export const receives = {
  "export-license": receive({
    message: "export-license", class: "tell", from: { kind: "task", under: "platform:task" },
    fields: { export: required(fact(CHANGE, "authorize-export")), checkpoint: required(digest), hold: required(itemOf("hold")), instance: required(text(128)), k: required(int(1, 3)) },
    also: { export: by(exportItem, "export"), target: by(hold, "hold") },
  }, ({ f, also, sender }) => {
    const license = { checkpoint: f.checkpoint, export: also.export.id, from: sender, hold: also.target.id, instance: f.instance };
    return {
      guards: [
        refuse("export-not-authorized", also.export.in("authorized")),
        refuse("target-not-held", also.target.in("held")), refuse("target-not-held", also.target.before("ends")), refuse("target-not-held", equals(also.target.slot("holder"), also.export.slot("to"))),
        permit("hold", "license", license),
      ],
      effects: [invoke("hold", "license", { ...license, k: f.k })],
    };
  }),
  publication: receive({
    message: "publication", class: "relate", from: { kind: "destination", under: "platform:destination" }, copies: 16,
    fields: { commit: optional(commit), operation: required(fact(CHANGE, "merge")), outcome: required(enumOf("committed", "unknown", "published", "refused", "aborted")), reason: optional(text(1024)), rules: optional(n) },
    also: { manifest: via(manifest, "also.merge", "manifest"), merge: by(merge, "operation"), proposal: one(proposal) },
  }, ({ f, also, sender }) => ({
    guards: [refuse("not-the-destination", equals(sender, also.proposal.slot("destination"))), also.merge.in("intended", "committed", "unknown")],
    effects: [
      ...(["committed", "unknown", "published", "refused", "aborted"] as const).map((outcome) => when(also.merge.to(outcome), { if: [equals(f.outcome, constant(outcome))] })),
      also.merge.value("commit", f.commit), also.merge.value("reason", f.reason),
      when(also.proposal.to("merged"), { if: [published(f.outcome), also.proposal.in("draft", "open", "closed")] }),
      when(invoke("hold", "pin-release", { commit: also.manifest.slot("integration") }), { if: [published(f.outcome), also.manifest.unset("staging")] }),
    ],
    sends: [
      relate({ each: range(link, ["set"]), to: eachSlot("issue"), name: "closes", item: eachItem, state: "merged", if: [published(f.outcome)], detail: { commit: f.commit, plan: also.manifest.slot("plan") } }),
      tell({ to: also.manifest.slot("staging"), message: "unpin", fields: { because: constant("published"), commit: also.manifest.slot("integration"), manifest: also.manifest.id, merge: also.merge.id }, if: [published(f.outcome), also.manifest.set("staging")] }),
      index({ merge: f.outcome }),
    ],
    settles: also.merge.settles("intended", "committed", "unknown"),
  })),
};

export const items = [proposal, commitment, hold, exportItem, manifest, merge, link] as const;
