/**
 * A slice of the change lane in the v2 vocabulary: the items and rows that
 * use the most of the contract. apps/room/lanes/definitions/change.json is
 * the original; docs/lanes-reference.md describes the same rows in words.
 * The slice is not the whole lane: the witness compares row by row.
 */
import {
  anyOf, author, bool, by, commit, constant, detached, differs, digest, distinct, each, eachItem, eachOf, eachSlot, enumOf, equals, fact, final, grants, has, ifPresent, index, int, invoke, isFact, item, itemOf, list, live, member,
  none, one, open, optional, part, party, permit, plusSeconds, presented, range, reasons, receive, record, ref, require, relate, required, scope, siblings, signer, slotsOf, tell, text, theIntent, theScope, time, transition, tree, value, via, when,
  authorsFrom, authorsIn, elements, type Of,
} from "./lib.ts";

const CHANGE = "change", ISSUE = "issue";
const n = int(0, 1_000_000_000);
export const laneGrants = grants({ promise: "change.promise", work: "change.work", export: "work.export", propose: "change.propose" });
export const laneReasons = reasons({
  notOfferee: "not-offeree", termsDiffer: "terms-differ", holdHeld: "hold-held", pinMismatch: "pin-mismatch",
  mergeInProgress: "merge-in-progress", notCurrentVersion: "not-the-current-version", sourceShape: "source-shape",
  selectionMalformed: "selection-malformed", planNotOfGoal: "plan-not-of-goal", decisionWithoutPlan: "decision-without-plan",
  notComplete: "not-complete", exportNotAuthorized: "export-not-authorized", targetNotHeld: "target-not-held", notDestination: "not-the-destination",
});

// ---------------------------------------------------------------- items

export const proposal = item("proposal", {
  initial: "draft", states: { draft: live, open: live, closed: live, merged: final },
  parties: { assignees: party.list(10), author: party.fixed },
  refs: { destination: ref.fixed(scope("destination")), rulesScope: ref.fixed(scope("rules")) },
  values: { body: value.optional(detached(65536)), labels: value.optional(list(text(64), 20)), number: value.optional(int(1, 1_000_000_000)), title: value.required(text(256)) },
});
export const commitment = item("commitment", {
  many: 16,
  initial: "offered", states: { offered: live, accepted: live, declined: final, withdrawn: final, cancelled: final },
  parties: { offeree: party.once, performer: author(party.optional), requester: party.fixed, successor: party.optional },
  refs: { termsAt: ref.fixed(fact(CHANGE, "offer")) },
  values: { terms: value.fixed(text(4096)) },
});
export const hold = item("hold", {
  many: 16,
  initial: "held", states: { held: live, ended: final },
  parties: { holder: party.required },
  refs: { under: ref.fixed(itemOf(commitment)) },
  values: { ends: value.required(time), epoch: value.required(int(1, 1_000_000)), extent: value.optional(text(1024)) },
});
export const exportItem = item("export", {
  many: 16,
  initial: "authorized", states: { authorized: live, done: final, refused: final },
  parties: { authorizer: party.fixed, from: party.fixed, to: party.fixed },
  refs: { hold: ref.fixed(itemOf(hold)) },
});
const selection = list(record({ accepted: required(fact(ISSUE, "accept-report")), report: required(fact(ISSUE, "report")) }), 32);
const decisionList = list(fact(ISSUE, "resolve-concern"), 32);
export const manifest = item("manifest", {
  many: 64,
  initial: "current", states: { current: live, superseded: final },
  parties: { authors: party.list(64, "fixed"), integrator: party.fixed },
  refs: { goal: ref.once(fact(ISSUE, "file", "revise")), pin: ref.once(fact(ISSUE, "hold@1:check")), plan: ref.once(fact(ISSUE, "seal-plan")), staging: ref.once(scope("lane")), under: ref.once(itemOf(commitment)) },
  values: {
    base: value.fixed(commit), complete: value.fixed(bool), decisions: value.once(decisionList), digest: value.once(digest), integration: value.once(commit),
    path: value.once(text(1024)), selected: value.once(selection), size: value.once(int(0, 65536)), tree: value.once(tree),
  },
});
export const merge = item("merge", {
  many: 16,
  initial: "intended", states: { intended: live, committed: live, unknown: live, published: final, refused: final, aborted: final },
  parties: { merger: party.fixed },
  refs: { manifest: ref.fixed(itemOf(manifest)) },
  values: { commit: value.optional(commit), reason: value.optional(text(1024)), withdrawal: value.optional(enumOf("asked")) },
});
export const link = item("link", {
  many: 32,
  initial: "set", states: { set: live, removed: live },
  parties: { linker: party.fixed },
  refs: { issue: ref.fixed(scope("lane")) },
  values: { how: value.fixed(enumOf("keyword", "manual")) },
});

// ---------------------------------------------------------------- combinators

/** The signer is the commitment's offeree, or anyone when none was named. */
const offereeOrOpen = (c: Of<typeof commitment>) => require(anyOf([c.unset("offeree")], [equals(signer, c.slot("offeree"))]), laneReasons.notOfferee);
/** The commitment is accepted and the signer is its performer. */
const performing = (c: Of<typeof commitment>) => [c.in("accepted"), c.signer("performer")];
/** The pin presented with a manifest carries a check whose `part` must equal `value`. */
const pinCarries = (pin: { presented: string }, name: string, value: Parameters<typeof equals>[1]) => ifPresent(require(equals(part(pin, { carried: `check.${name}` }), value), laneReasons.pinMismatch));
/** The plan's `required` or `optional` list: entries of a child scope (`child`) for a concern (`item`), as the issue lane's seal-plan declares them. */
const planList = (plan: { field: string }, listName: "required" | "optional") => elements(part(plan, { field: listName }), "item", "child");
/** Some entry of the plan's `list` (required or optional) has `member` equal to `value`. */
const planHas = (plan: { field: string }, listName: "required" | "optional", member: "item" | "child", value: Parameters<typeof equals>[1]) => has(planList(plan, listName), "k", (k) => ({ where: [equals(k[member], value)] }));
const inPlan = (plan: { field: string }, member: "item" | "child", value: Parameters<typeof equals>[1]) => anyOf([planHas(plan, "required", member, value)], [planHas(plan, "optional", member, value)]);
/** A decision that accepts `accepted` as delivered on the same terms. */
const acceptedAsDelivered = (decisions: { field: string }, accepted: Parameters<typeof part>[0]) => has(decisions, "d", (d) => ({
  where: [equals(part(d.self, { field: "kind" }), "accepted-as-delivered"), equals(part(d.self, { field: "acceptance" }), accepted), equals(part(d.self, { field: "terms" }), part(accepted, { field: "terms" }))],
}));
const published = (outcome: { field: string }) => equals(outcome, "published");

// ---------------------------------------------------------------- the rows

export const acts = {
  accept: transition(commitment, laneGrants.promise, { fields: { terms: required(fact(CHANGE, "offer")) } }, ({ f, on }) => ({
    guards: [on.in("offered"), offereeOrOpen(on), require(equals(f.terms, on.slot("termsAt")), laneReasons.termsDiffer)],
    effects: [on.to("accepted"), on.party("performer", signer)],
    attention: [on.notify("requester", "after", "accepted")],
  })),
  // by(commitment) also declares the required commitment input field.
  "take-hold": open(hold, laneGrants.work, { fields: { extent: optional(text(1024)) }, also: { commitment: by(commitment), proposal: one(proposal) } }, ({ f, on, also }) => ({
    guards: [also.proposal.in("draft", "open"), ...performing(also.commitment), require(none(hold, ["held"], h => [equals(h.slot("under"), also.commitment.id)]), laneReasons.holdHeld)],
    // The hold record makes the signer its holder at epoch 1. The following
    // effects set its commitment, extent, and deadline.
    effects: [on.hold("open", f.extent), on.ref("under", also.commitment.id), ...on.take(f, "extent"), on.value("ends", plusSeconds(3600))],
  })),
  "release-hold": transition(hold, laneGrants.work, {}, ({ on }) => ({ guards: [on.in("held"), on.signer("holder")], effects: [on.hold("end")] })),
  "authorize-export": open(exportItem, laneGrants.export, { fields: { to: required(member) }, also: { hold: by(hold) } }, ({ f, on, also }) => ({
    guards: [also.hold.in("ended")],
    effects: [on.party("from", also.hold.slot("holder")), on.party("to", f.to), on.party("authorizer", signer), on.ref("hold", also.hold.id)],
  })),
  // Omitted previous/hold inputs leave their selected subjects unbound.
  // Direct checks on those subjects and writes targeting them do not run.
  // A present invalid item ID still refuses; it is not an absent input.
  "propose-manifest": open(manifest, laneGrants.propose, {
    fields: {
      previous: optional(itemOf(manifest)), hold: optional(itemOf(hold)), lane: optional(scope("lane")), foreignHold: optional(n), instance: required(text(128)),
      goal: optional(fact(ISSUE, "file", "revise")), plan: optional(fact(ISSUE, "seal-plan")), selected: required(selection), decisions: required(decisionList),
      base: required(commit), integration: required(commit), tree: required(tree), complete: required(bool),
    },
    presents: { pin: presented(ISSUE, ["hold@1:check"], false) },
    also: siblings({ proposal: one(proposal), previous: by(manifest, "previous"), hold: by(hold) }, $ => ({ commitment: via(commitment, $.hold, "under") })),
  }, ({ f, p, on, also }) => ({
    guards: [
      also.proposal.in("draft", "open"),
      require(none(merge, ["intended", "committed", "unknown"]), laneReasons.mergeInProgress),
      require(none(range(manifest, ["current"], { except: ["also.previous"] })), laneReasons.notCurrentVersion),
      also.previous.in("current"),
      // Either a local hold, or a foreign one with its lane and pin.
      require(anyOf(
        [differs(f.hold, null), equals(f.lane, null), equals(f.foreignHold, null), equals(p.pin, null)],
        [equals(f.hold, null), differs(f.lane, null), differs(f.foreignHold, null), differs(p.pin, null)],
      ), laneReasons.sourceShape),
      also.hold.signer("holder"), also.hold.in("held", "ended"), ...performing(also.commitment),
      // ifPresent skips absent top-level fields or presented facts, not
      // malformed parts of a fact that is present.
      ifPresent(isFact(p.pin)), ifPresent(require(equals(part(p.pin, "scope"), f.lane), laneReasons.pinMismatch)),
      pinCarries(p.pin, "intent", theIntent), pinCarries(p.pin, "commit", f.integration), pinCarries(p.pin, "consumer", theScope), pinCarries(p.pin, "hold", f.foreignHold), pinCarries(p.pin, "instance", f.instance),
      permit("hold", "staged", { commit: f.integration, pin: p.pin, under: also.commitment.id }),
      require(each(f.selected, "s", (s) => ({ guards: [isFact(s.accepted), isFact(s.report), equals(part(s.report, "scope"), part(s.accepted, "scope")), equals(part(s.report, "seq"), part(s.accepted, "on"))] })), laneReasons.selectionMalformed),
      ifPresent(isFact(f.goal)), ifPresent(isFact(f.plan)),
      require(anyOf([equals(f.plan, null)], [equals(part(f.plan, "scope"), part(f.goal, "scope"))]), laneReasons.planNotOfGoal),
      require(each(f.decisions, "d", (d) => ({ guards: [isFact(d.self), differs(f.plan, null)] })), laneReasons.decisionWithoutPlan),
      // A complete manifest closes its plan: every selection is planned, every decision is of the plan, every required child is selected, excluded or replaced by one that is.
      require(anyOf(
        [equals(f.complete, false)],
        [equals(f.plan, null)],
        [
          equals(part(f.plan, "scope"), part(f.goal, "scope")), equals(part(f.plan, { field: "goalAt" }), f.goal),
          each(f.selected, "s", (s) => ({ guards: [inPlan(f.plan, "child", part(s.accepted, "scope"))] })),
          distinct(f.selected, "s", (s) => part(s.accepted, "scope")),
          each(f.selected, "s", (s) => ({ where: [differs(part(s.accepted, { of: { field: "terms" }, then: "seq" }), 0)], guards: [acceptedAsDelivered(f.decisions, s.accepted)] })),
          each(f.selected, "s", (s) => ({ where: [differs(part(s.accepted, { of: { field: "terms" }, then: "scope" }), part(s.accepted, "scope"))], guards: [acceptedAsDelivered(f.decisions, s.accepted)] })),
          each(f.decisions, "d", (d) => ({ guards: [
            equals(part(d.self, "scope"), part(f.plan, "scope")),
            inPlan(f.plan, "item", part(d.self, { field: "concern" })),
            anyOf([differs(part(d.self, { field: "kind" }), "replaced")], [inPlan(f.plan, "item", part(d.self, { field: "replacedBy" }))]),
          ] })),
          each(planList(f.plan, "required"), "q", (q) => ({ guards: [anyOf(
            [has(f.selected, "s", (s) => ({ where: [equals(part(s.accepted, "scope"), q.child)] }))],
            [has(f.decisions, "d", (d) => ({ where: [equals(part(d.self, { field: "concern" }), q.item), equals(part(d.self, { field: "kind" }), "excluded")] }))],
            [has(f.decisions, "d", (d) => ({
              where: [equals(part(d.self, { field: "concern" }), q.item), equals(part(d.self, { field: "kind" }), "replaced")],
              guards: [anyOf(...(["required", "optional"] as const).map((listName) => [has(planList(f.plan, listName), "k", (k) => ({
                where: [equals(k.item, part(d.self, { field: "replacedBy" }))], guards: [has(f.selected, "s", (s) => ({ where: [equals(part(s.accepted, "scope"), k.child)] }))],
              }))]))],
            }))],
          )] })),
        ],
      ), laneReasons.notComplete),
      permit("git-read", "ancestry", {
        commit: f.integration, earlier: slotsOf(range(manifest, ["current", "superseded"]), "integration"), pin: p.pin, row: constant("manifest"),
        selected: eachOf(f.selected, "s", (s) => part(s.report, { opened: "commit" })),
      }),
    ],
    effects: [
      on.party("integrator", signer),
      // The manifest's authors: the commitment's performers, the authors of each selected report, the previous manifest's authors, and those the pin carries.
      on.attribute("authors", also.commitment, [authorsIn(f.selected, "s", (s) => part(s.report, { opened: "authors" })), also.previous.authors("authors"), authorsFrom(part(p.pin, { carried: "check.attribution" }))]),
      ...on.take(f, "goal", "plan"), on.ref("staging", f.lane), on.ref("under", also.commitment.id), on.ref("pin", part(p.pin, "ref")),
      ...on.take(f, "base", "integration", "tree", "selected", "decisions", "complete"),
      also.previous.to("superseded"),
      when(invoke("hold", "pin-hold", { commit: f.integration }), { if: [differs(f.hold, null)] }),
      when(invoke("hold", "pin-release", { commit: also.previous.slot("integration") }), { if: [also.previous.unset("staging")] }),
    ],
    sends: [
      tell({ to: on.slot("staging"), message: "pin-confirm", fields: { commit: f.integration }, if: [differs(f.lane, null)] }),
      tell({ to: also.previous.slot("staging"), message: "unpin", fields: { because: constant("superseded"), commit: also.previous.slot("integration"), manifest: also.previous.id }, if: [also.previous.set("staging")] }),
    ],
  })),
};

export const receives = {
  "export-license": receive({
    message: "export-license", class: "tell", from: { kind: "task", under: "platform:task" },
    fields: { export: required(fact(CHANGE, "authorize-export")), checkpoint: required(digest), instance: required(text(128)), k: required(int(1, 3)) },
    also: { export: by(exportItem), target: by(hold) },
  }, ({ f, also, sender }) => {
    const license = { checkpoint: f.checkpoint, export: also.export.id, from: sender, hold: also.target.id, instance: f.instance };
    return {
      guards: [
        require(also.export.in("authorized"), laneReasons.exportNotAuthorized),
        require(also.target.in("held"), laneReasons.targetNotHeld), require(also.target.before("ends"), laneReasons.targetNotHeld), require(equals(also.target.slot("holder"), also.export.slot("to")), laneReasons.targetNotHeld),
        permit("hold", "license", license),
      ],
      effects: [invoke("hold", "license", { ...license, k: f.k })],
    };
  }),
  publication: receive({
    message: "publication", class: "relate", from: { kind: "destination", under: "platform:destination" }, copies: 16,
    fields: { commit: optional(commit), operation: required(fact(CHANGE, "merge")), outcome: required(enumOf("committed", "unknown", "published", "refused", "aborted")), reason: optional(text(1024)), rules: optional(n) },
    also: siblings({ merge: by(merge, "operation"), proposal: one(proposal) }, $ => ({ manifest: via(manifest, $.merge, "manifest") })),
  }, ({ f, also, sender }) => ({
    guards: [require(equals(sender, also.proposal.slot("destination")), laneReasons.notDestination), also.merge.in("intended", "committed", "unknown")],
    effects: [
      ...(["committed", "unknown", "published", "refused", "aborted"] as const).map((outcome) => when(also.merge.to(outcome), { if: [equals(f.outcome, outcome)] })),
      ...also.merge.take(f, "commit", "reason"),
      when(also.proposal.to("merged"), { if: [published(f.outcome), also.proposal.in("draft", "open", "closed")] }),
      when(invoke("hold", "pin-release", { commit: also.manifest.slot("integration") }), { if: [published(f.outcome), also.manifest.unset("staging")] }),
    ],
    sends: [
      relate({ each: range(link, ["set"]), to: eachSlot("issue"), name: "closes", item: eachItem, state: "merged", if: [published(f.outcome)], detail: { commit: f.commit, plan: also.manifest.slot("plan") } }),
      tell({ to: also.manifest.slot("staging"), message: "unpin", fields: { because: constant("published"), commit: also.manifest.slot("integration"), manifest: also.manifest.id, merge: also.merge.id }, if: [published(f.outcome), also.manifest.set("staging")] }),
      index({ merge: f.outcome }),
    ],
    // Result effects write states; this only declares settlement eligibility.
    settles: also.merge.settles("intended", "committed", "unknown"),
  })),
};

export const items = [proposal, commitment, hold, exportItem, manifest, merge, link] as const;
