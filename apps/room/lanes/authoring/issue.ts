import { anyOf, author, authorsOf, bool, by, commit, constant, count, create, define, detached, digest, el, enumOf, equals, fact, final, grants, index, int, invoke, isFact, item, itemOf, list, live, member, none, one, open, optional, part, party, permit, plusSeconds, range, reasons, receive, record, ref, relate, require, required, sameSet, scope, self, sender, settlesCopy, signer, source, tell, text, theScope, transition, tree, update, value, via, when } from "@generalbusiness/dap-define";
import { exportItem, holdItem, sharedForms } from "./shared.ts";
import type { DefinitionData } from "./shared.ts";

const g = grants(
  {
    "issue.close-own": "issue.close-own",
    "issue.comment": "issue.comment",
    "issue.edit-any": "issue.edit-any",
    "issue.edit-own": "issue.edit-own",
    "issue.judge": "issue.judge",
    "issue.open": "issue.open",
    "issue.plan": "issue.plan",
    "issue.promise": "issue.promise",
    "issue.request": "issue.request",
    "issue.revise": "issue.revise",
    "issue.triage": "issue.triage",
    "issue.work": "issue.work",
    "work.export": "work.export",
  },
);
const r = reasons(
  {
    "concern-creating": "concern-creating",
    "decision-not-supported": "decision-not-supported",
    "export-not-authorized": "export-not-authorized",
    "hold-held": "hold-held",
    "not-a-manifest": "not-a-manifest",
    "not-current-plan": "not-current-plan",
    "not-offeree": "not-offeree",
    "not-the-accepted-report": "not-the-accepted-report",
    "not-the-child": "not-the-child",
    "not-the-owner": "not-the-owner",
    "not-the-parent": "not-the-parent",
    "not-this-ask": "not-this-ask",
    "not-this-commit": "not-this-commit",
    "not-this-commitment": "not-this-commitment",
    "plan-full": "plan-full",
    "plan-list-differs": "plan-list-differs",
    "planned-for-an-earlier-goal": "planned-for-an-earlier-goal",
    "still-needed": "still-needed",
    "target-not-held": "target-not-held",
    "terms-differ": "terms-differ",
  },
);

const askItem = item(
  "ask",
  {
    many: 64,
    initial: "asked",
    states: {answered: live, asked: live, settled: final, withdrawn: final},
    parties: {addressee: party.fixed, asker: party.fixed},
    values: {answer: value.optional(text(4096)), question: value.fixed(text(4096))},
  },
);

const blockItem = item(
  "block",
  {
    many: 32,
    initial: "blocked",
    states: {blocked: live, released: final},
    refs: {
      commitment: ref.fixed(itemOf("commitment")),
      on: ref.fixed(fact("issue", "ask")),
      releasedBy: ref.optional(fact("issue", "answer")),
    },
    values: {reason: value.optional(text(4096))},
  },
);

const commentItem = item(
  "comment",
  {
    many: 5000,
    initial: "visible",
    states: {collapsed: live, redacted: final, visible: live},
    parties: {author: party.fixed, mentioned: party.list(16, "once")},
    refs: {replyTo: ref.optional(itemOf("comment"))},
    values: {body: value.optional(detached(65536)), collapseReason: value.optional(text(1024))},
  },
);

const commitmentItem = item(
  "commitment",
  {
    many: 64,
    initial: "offered",
    states: {
      accepted: live,
      cancelled: final,
      declined: final,
      fulfilled: final,
      offered: live,
      proposed: live,
      withdrawn: final,
    },
    parties: {
      offeree: party.once,
      performer: author(party.optional),
      requester: party.fixed,
      successor: party.optional,
    },
    refs: {
      conditionsAt: ref.fixed(fact("issue", "file", "revise")),
      termsAt: ref.fixed(fact("issue", "file", "revise", "propose-terms")),
    },
    values: {conditions: value.fixed(list(text(4096), 16))},
  },
);

const concernItem = item(
  "concern",
  {
    many: 100,
    initial: "creating",
    states: {
      conflict: final,
      created: live,
      creating: live,
      delivered: live,
      dropped: final,
      refused: final,
    },
    refs: {
      child: ref.optional(scope("lane")),
      plan: ref.fixed(itemOf("plan")),
      result: ref.optional(fact("issue", "offer", "propose-terms")),
    },
    values: {
      interface: value.once(text(4096)),
      purpose: value.fixed(text(4096)),
      role: value.fixed(enumOf("required", "optional")),
    },
  },
);

const decisionItem = item(
  "decision",
  {
    many: 32,
    initial: "recorded",
    states: {recorded: final},
    parties: {decider: party.fixed},
    refs: {
      acceptance: ref.once(fact("issue", "accept-report")),
      concern: ref.fixed(itemOf("concern")),
      replacedBy: ref.once(itemOf("concern")),
      terms: ref.once(fact("issue", "file", "revise", "propose-terms")),
    },
    values: {
      kind: value.fixed(enumOf("replaced", "excluded", "accepted-as-delivered")),
      reason: value.fixed(text(4096)),
    },
  },
);

const inputItem = item(
  "input",
  {
    many: 32,
    initial: "selected",
    states: {replaced: final, selected: live},
    parties: {authors: party.list(64, "once"), selector: party.fixed},
    refs: {
      accepted: ref.fixed(fact("issue", "accept-report")),
      for: ref.fixed(itemOf("commitment")),
      report: ref.fixed(fact("issue", "report")),
    },
  },
);

const intentItem = item(
  "intent",
  {
    initial: "open",
    states: {closed: live, open: live},
    parties: {assignees: party.list(10, "optional"), requester: party.fixed},
    refs: {
      closedBy: ref.optional(fact("issue", "close-own", "close-any", "closes")),
      conditionsAt: ref.required(fact("issue", "file", "revise")),
      currentPlan: ref.optional(itemOf("plan")),
      judgedAt: ref.optional(fact("issue", "file", "revise")),
      parent: ref.once(scope("lane")),
    },
    values: {
      body: value.optional(detached(65536)),
      closeReason: value.optional(enumOf("completed", "not-planned")),
      conditions: value.required(list(text(4096), 16)),
      judgeEvidence: value.optional(list(digest, 32)),
      judgeNote: value.optional(text(4096)),
      labels: value.optional(list(text(64), 20)),
      number: value.optional(int(1, 1000000000)),
      parentItem: value.once(int(0, 1000000000)),
      satisfied: value.optional(bool),
      title: value.required(text(256)),
    },
  },
);

const planItem = item(
  "plan",
  {
    many: 16,
    initial: "open",
    states: {open: live, sealed: live, superseded: final},
    parties: {planner: party.fixed},
    refs: {conditionsAt: ref.fixed(fact("issue", "file", "revise"))},
  },
);

const reportItem = item(
  "report",
  {
    many: 64,
    initial: "reported",
    states: {accepted: final, refused: final, reported: live},
    parties: {authors: party.list(64, "once"), reporter: party.fixed},
    refs: {
      acceptedAt: ref.optional(fact("issue", "accept-report")),
      conditionsAt: ref.fixed(fact("issue", "file", "revise")),
      termsAt: ref.fixed(fact("issue", "file", "revise", "propose-terms")),
      under: ref.fixed(itemOf("commitment")),
    },
    values: {
      claims: value.once(list(text(1024), 32)),
      commit: value.fixed(commit),
      evidence: value.once(list(digest, 32)),
      reason: value.optional(text(4096)),
      summary: value.optional(detached(65536)),
      tree: value.fixed(tree),
    },
  },
);

const shared = sharedForms("issue", { comment: commentItem, commitment: commitmentItem });

export const issueSource = define(
  {
    name: "issue",
    genesis: "file",
    grants: g,
    reasons: r,
    items: [
      askItem,
      blockItem,
      commentItem,
      commitmentItem,
      concernItem,
      decisionItem,
      exportItem,
      holdItem,
      inputItem,
      intentItem,
      planItem,
      reportItem,
    ],
    acts: { ...shared.acts, accept: transition(
      commitmentItem,
      g["issue.promise"],
      {fields: {terms: required(fact("issue", "file", "revise", "propose-terms"))}},
      _ctx => ({
        guards: [
          _ctx.on.in("offered"),
          require(
            anyOf([_ctx.on.unset("offeree")], [equals(signer, _ctx.on.slot("offeree"))]),
            r["not-offeree"],
          ),
          require(equals(_ctx.f["terms"], _ctx.on.slot("termsAt")), r["terms-differ"]),
        ],
        effects: [_ctx.on.to("accepted"), _ctx.on.party("performer", signer)],
        attention: [_ctx.on.notify("requester", "after", "accepted")],
      }),
    ), "accept-handover": transition(
      commitmentItem,
      g["issue.promise"],
      {fields: {terms: required(fact("issue", "file", "revise", "propose-terms"))}},
      _ctx => ({
        guards: [
          _ctx.on.in("accepted"),
          _ctx.on.signer("successor"),
          require(equals(_ctx.f["terms"], _ctx.on.slot("termsAt")), r["terms-differ"]),
          require(
            none(range(holdItem, ["held"], {where: _item => [equals(_item.slot("under"), _ctx.on.id)]})),
            r["hold-held"],
          ),
        ],
        effects: [_ctx.on.party("performer", signer), _ctx.on.party("successor", null)],
        attention: [
          _ctx.on.notify("performer", "before", "handed-over"),
          _ctx.on.notify("requester", "after", "handed-over"),
        ],
      }),
    ), "accept-report": transition(
      reportItem,
      g["issue.request"],
      {
        also: {commitment: by(commitmentItem, "commitment")},
        fields: {
          commitment: required(itemOf("commitment")),
          terms: required(fact("issue", "file", "revise", "propose-terms")),
        },
      },
      _ctx => ({
        guards: [
          _ctx.on.in("reported"),
          require(equals(_ctx.on.slot("under"), _ctx.also["commitment"].id), r["not-this-commitment"]),
          _ctx.also["commitment"].signer("requester"),
          _ctx.on.notSigner("authors"),
          require(equals(_ctx.on.slot("termsAt"), _ctx.also["commitment"].slot("termsAt")), r["terms-differ"]),
          require(equals(_ctx.f["terms"], _ctx.on.slot("termsAt")), r["terms-differ"]),
        ],
        effects: [_ctx.on.to("accepted"), _ctx.on.ref("acceptedAt", self)],
      }),
    ), "add-concern": open(
      concernItem,
      g["issue.plan"],
      {
        also: {plan: by(planItem, "plan")},
        fields: {
          body: optional(detached(65536)),
          conditions: required(list(text(4096), 16)),
          interface: optional(text(4096)),
          plan: required(itemOf("plan")),
          purpose: required(text(4096)),
          role: required(enumOf("required", "optional")),
          title: required(text(256)),
        },
      },
      _ctx => ({
        guards: [
          _ctx.also["plan"].in("open"),
          _ctx.also["plan"].signer("planner"),
          require(
            count(
              range(
                concernItem,
                ["creating", "created", "refused", "conflict", "delivered", "dropped"],
                {where: _item => [equals(_item.slot("plan"), _ctx.also["plan"].id)]},
              ),
              {max: 31},
            ),
            r["plan-full"],
          ),
        ],
        effects: [
          _ctx.on.ref("plan", _ctx.also["plan"].id),
          _ctx.on.value("purpose", _ctx.f["purpose"]),
          _ctx.on.value("role", _ctx.f["role"]),
          _ctx.on.value("interface", _ctx.f["interface"]),
        ],
        sends: [
          create(
            {
              definition: "self",
              fields: {
                body: _ctx.f["body"],
                conditions: _ctx.f["conditions"],
                opener: signer,
                origin: self,
                title: _ctx.f["title"],
              },
              kind: "lane",
              result: {
                applied: [_ctx.on.to("created"), _ctx.on.ref("child", sender)],
                conflict: [_ctx.on.to("conflict")],
                refused: [_ctx.on.to("refused")],
              },
            },
          ),
        ],
      }),
    ), agree: transition(
      commitmentItem,
      g["issue.request"],
      {fields: {terms: required(fact("issue", "file", "revise", "propose-terms"))}},
      _ctx => ({
        guards: [
          _ctx.on.in("proposed"),
          _ctx.on.signer("requester"),
          require(equals(_ctx.f["terms"], _ctx.on.slot("termsAt")), r["terms-differ"]),
        ],
        effects: [_ctx.on.to("accepted")],
      }),
    ), answer: transition(
      askItem,
      g["issue.comment"],
      {fields: {answer: required(text(4096))}},
      _ctx => ({
        guards: [_ctx.on.in("asked"), _ctx.on.signer("addressee")],
        effects: [_ctx.on.to("answered"), _ctx.on.value("answer", _ctx.f["answer"])],
        attention: [_ctx.on.notify("asker", "after", "answered")],
      }),
    ), ask: open(
      askItem,
      g["issue.comment"],
      {fields: {addressee: required(member), question: required(text(4096))}},
      _ctx => ({
        effects: [
          _ctx.on.party("asker", signer),
          _ctx.on.party("addressee", _ctx.f["addressee"]),
          _ctx.on.value("question", _ctx.f["question"]),
        ],
        attention: [_ctx.on.notify("addressee", "after", "asked")],
      }),
    ), assign: transition(
      intentItem,
      g["issue.triage"],
      {fields: {assignees: required(list(member, 10))}},
      _ctx => ({
        effects: [_ctx.on.party("assignees", _ctx.f["assignees"])],
        sends: [index({assignees: _ctx.f["assignees"]})],
        attention: [_ctx.on.notify("assignees", "after", "assignees-changed")],
      }),
    ), block: open(
      blockItem,
      g["issue.work"],
      {
        also: {commitment: by(commitmentItem, "commitment")},
        fields: {
          commitment: required(itemOf("commitment")),
          on: required(fact("issue", "ask")),
          reason: optional(text(4096)),
        },
      },
      _ctx => ({
        guards: [
          _ctx.also["commitment"].in("accepted"),
          _ctx.also["commitment"].signer("performer"),
          isFact(_ctx.f["on"]),
        ],
        effects: [
          _ctx.on.ref("commitment", _ctx.also["commitment"].id),
          _ctx.on.ref("on", _ctx.f["on"]),
          _ctx.on.value("reason", _ctx.f["reason"]),
        ],
      }),
    ), cancel: transition(
      commitmentItem,
      g["issue.request"],
      {},
      _ctx => ({
        guards: [_ctx.on.in("offered", "proposed", "accepted"), _ctx.on.signer("requester")],
        effects: [_ctx.on.to("cancelled")],
        attention: [_ctx.on.notify("performer", "after", "cancelled")],
      }),
    ), "close-any": transition(
      intentItem,
      g["issue.triage"],
      {fields: {reason: optional(enumOf("completed", "not-planned"))}},
      _ctx => ({
        guards: [_ctx.on.in("open")],
        effects: [
          _ctx.on.to("closed"),
          _ctx.on.value("closeReason", _ctx.f["reason"]),
          _ctx.on.ref("closedBy", self),
        ],
        sends: [index({state: constant("closed")})],
      }),
    ), "close-own": transition(
      intentItem,
      g["issue.close-own"],
      {fields: {reason: optional(enumOf("completed", "not-planned"))}},
      _ctx => ({
        guards: [_ctx.on.in("open"), _ctx.on.signer("requester")],
        effects: [
          _ctx.on.to("closed"),
          _ctx.on.value("closeReason", _ctx.f["reason"]),
          _ctx.on.ref("closedBy", self),
        ],
        sends: [index({state: constant("closed")})],
      }),
    ), comment: open(
      commentItem,
      g["issue.comment"],
      {
        fields: {
          body: required(detached(65536)),
          mentions: optional(list(member, 16)),
          replyTo: optional(itemOf("comment")),
        },
      },
      _ctx => ({
        effects: [
          _ctx.on.party("author", signer),
          _ctx.on.value("body", _ctx.f["body"]),
          _ctx.on.ref("replyTo", _ctx.f["replyTo"]),
          _ctx.on.party("mentioned", _ctx.f["mentions"]),
        ],
        attention: [_ctx.on.notify("mentioned", "after", "mentioned")],
      }),
    ), "drop-concern": transition(
      concernItem,
      g["issue.plan"],
      {},
      _ctx => ({
        guards: [_ctx.on.in("created", "delivered")],
        effects: [_ctx.on.to("dropped")],
        sends: [tell({fields: {}, message: "parent-dropped", result: {}, to: _ctx.on.slot("child")})],
      }),
    ), "edit-any": transition(
      intentItem,
      g["issue.edit-any"],
      {fields: {body: optional(detached(65536)), title: optional(text(256))}},
      _ctx => ({
        effects: [_ctx.on.value("title", _ctx.f["title"]), _ctx.on.value("body", _ctx.f["body"])],
        sends: [index({title: _ctx.f["title"]})],
      }),
    ), "edit-own": transition(
      intentItem,
      g["issue.edit-own"],
      {fields: {body: optional(detached(65536)), title: optional(text(256))}},
      _ctx => ({
        guards: [_ctx.on.signer("requester")],
        effects: [_ctx.on.value("title", _ctx.f["title"]), _ctx.on.value("body", _ctx.f["body"])],
        sends: [index({title: _ctx.f["title"]})],
      }),
    ), file: open(
      intentItem,
      g["issue.open"],
      {
        fields: {
          body: optional(detached(65536)),
          conditions: required(list(text(4096), 16)),
          number: optional(int(1, 1000000000)),
          opener: required(member),
          origin: optional(fact("issue", "add-concern")),
          title: required(text(256)),
        },
      },
      _ctx => ({
        effects: [
          _ctx.on.party("requester", _ctx.f["opener"]),
          _ctx.on.value("title", _ctx.f["title"]),
          _ctx.on.value("body", _ctx.f["body"]),
          _ctx.on.value("conditions", _ctx.f["conditions"]),
          _ctx.on.value("number", _ctx.f["number"]),
          _ctx.on.ref("parent", part(_ctx.f["origin"], "scope")),
          _ctx.on.value("parentItem", part(_ctx.f["origin"], "seq")),
          _ctx.on.ref("conditionsAt", self),
        ],
        sends: [
          index(
            {
              author: _ctx.f["opener"],
              kind: constant("issue"),
              number: _ctx.f["number"],
              state: constant("open"),
              title: _ctx.f["title"],
            },
          ),
        ],
      }),
    ), fulfil: transition(
      commitmentItem,
      g["issue.request"],
      {
        also: {goal: one(intentItem), report: by(reportItem, "report")},
        fields: {report: required(itemOf("report"))},
      },
      _ctx => ({
        guards: [
          _ctx.on.in("accepted"),
          _ctx.on.signer("requester"),
          _ctx.also["report"].in("accepted"),
          require(equals(_ctx.also["report"].slot("under"), _ctx.on.id), r["not-this-commitment"]),
          require(equals(_ctx.also["report"].slot("termsAt"), _ctx.on.slot("termsAt")), r["terms-differ"]),
        ],
        effects: [_ctx.on.to("fulfilled")],
        sends: [
          relate(
            {
              detail: {
                acceptance: _ctx.also["report"].slot("acceptedAt"),
                commitment: _ctx.on.id,
                conditions: _ctx.on.slot("conditionsAt"),
                parentItem: _ctx.also["goal"].slot("parentItem"),
                report: _ctx.also["report"].id,
                terms: _ctx.on.slot("termsAt"),
              },
              if: [_ctx.also["goal"].set("parent")],
              item: _ctx.also["goal"].id,
              name: "result",
              result: {},
              state: "delivered",
              to: _ctx.also["goal"].slot("parent"),
            },
          ),
        ],
      }),
    ), judge: transition(
      intentItem,
      g["issue.judge"],
      {
        fields: {evidence: optional(list(digest, 32)), note: optional(text(4096)), satisfied: required(bool)},
      },
      _ctx => ({
        guards: [_ctx.on.signer("requester")],
        effects: [
          _ctx.on.value("satisfied", _ctx.f["satisfied"]),
          _ctx.on.ref("judgedAt", _ctx.on.slot("conditionsAt")),
          _ctx.on.value("judgeEvidence", _ctx.f["evidence"]),
          _ctx.on.value("judgeNote", _ctx.f["note"]),
        ],
      }),
    ), label: transition(
      intentItem,
      g["issue.triage"],
      {fields: {labels: required(list(text(64), 20))}},
      _ctx => ({
        effects: [_ctx.on.value("labels", _ctx.f["labels"])],
        sends: [index({labels: _ctx.f["labels"]})],
      }),
    ), offer: open(
      commitmentItem,
      g["issue.request"],
      {also: {goal: one(intentItem)}, fields: {offeree: optional(member)}},
      _ctx => ({
        guards: [_ctx.also["goal"].in("open")],
        effects: [
          _ctx.on.party("requester", signer),
          _ctx.on.party("offeree", _ctx.f["offeree"]),
          _ctx.on.value("conditions", _ctx.also["goal"].slot("conditions")),
          _ctx.on.ref("conditionsAt", _ctx.also["goal"].slot("conditionsAt")),
          _ctx.on.ref("termsAt", _ctx.also["goal"].slot("conditionsAt")),
        ],
        attention: [_ctx.on.notify("offeree", "after", "offered")],
      }),
    ), "open-plan": open(
      planItem,
      g["issue.plan"],
      {also: {goal: one(intentItem)}},
      _ctx => ({
        guards: [_ctx.also["goal"].in("open")],
        effects: [
          _ctx.on.party("planner", signer),
          _ctx.on.ref("conditionsAt", _ctx.also["goal"].slot("conditionsAt")),
        ],
      }),
    ), "propose-terms": open(
      commitmentItem,
      g["issue.promise"],
      {also: {goal: one(intentItem)}, fields: {conditions: required(list(text(4096), 16))}},
      _ctx => ({
        guards: [_ctx.also["goal"].in("open")],
        effects: [
          _ctx.on.to("proposed"),
          _ctx.on.party("performer", signer),
          _ctx.on.party("requester", _ctx.also["goal"].slot("requester")),
          _ctx.on.value("conditions", _ctx.f["conditions"]),
          _ctx.on.ref("conditionsAt", _ctx.also["goal"].slot("conditionsAt")),
          when(
            _ctx.on.ref("termsAt", _ctx.also["goal"].slot("conditionsAt")),
            {if: [equals(_ctx.f["conditions"], _ctx.also["goal"].slot("conditions"))]},
          ),
          when(
            _ctx.on.ref("termsAt", self),
            {unless: [equals(_ctx.f["conditions"], _ctx.also["goal"].slot("conditions"))]},
          ),
        ],
      }),
    ), "refuse-report": transition(
      reportItem,
      g["issue.request"],
      {
        also: {commitment: by(commitmentItem, "commitment")},
        fields: {commitment: required(itemOf("commitment")), reason: required(text(4096))},
      },
      _ctx => ({
        guards: [
          _ctx.on.in("reported"),
          require(equals(_ctx.on.slot("under"), _ctx.also["commitment"].id), r["not-this-commitment"]),
          _ctx.also["commitment"].signer("requester"),
        ],
        effects: [
          _ctx.on.to("refused"),
          _ctx.on.value("reason", _ctx.f["reason"]),
          invoke("hold", "pin-release", {commit: _ctx.on.slot("commit")}),
        ],
        attention: [_ctx.on.notify("reporter", "after", "report-refused")],
      }),
    ), "release-block": transition(
      blockItem,
      g["issue.work"],
      {
        also: {commitment: by(commitmentItem, "commitment")},
        fields: {answer: required(fact("issue", "answer")), commitment: required(itemOf("commitment"))},
      },
      _ctx => ({
        guards: [
          _ctx.on.in("blocked"),
          require(equals(_ctx.on.slot("commitment"), _ctx.also["commitment"].id), r["not-this-commitment"]),
          _ctx.also["commitment"].signer("performer"),
          isFact(_ctx.f["answer"]),
          require(equals(part(_ctx.f["answer"], "scope"), part(_ctx.on.slot("on"), "scope")), r["not-this-ask"]),
          require(equals(part(_ctx.f["answer"], "on"), part(_ctx.on.slot("on"), "seq")), r["not-this-ask"]),
        ],
        effects: [_ctx.on.to("released"), _ctx.on.ref("releasedBy", _ctx.f["answer"])],
      }),
    ), "reopen-any": transition(
      intentItem,
      g["issue.triage"],
      {},
      _ctx => ({
        guards: [_ctx.on.in("closed")],
        effects: [_ctx.on.to("open"), _ctx.on.value("closeReason", null), _ctx.on.ref("closedBy", null)],
        sends: [index({state: constant("open")})],
      }),
    ), "reopen-own": transition(
      intentItem,
      g["issue.close-own"],
      {},
      _ctx => ({
        guards: [_ctx.on.in("closed"), _ctx.on.signer("requester")],
        effects: [_ctx.on.to("open"), _ctx.on.value("closeReason", null), _ctx.on.ref("closedBy", null)],
        sends: [index({state: constant("open")})],
      }),
    ), "replace-input": transition(
      inputItem,
      g["issue.work"],
      {
        also: {commitment: by(commitmentItem, "commitment")},
        fields: {commitment: required(itemOf("commitment"))},
      },
      _ctx => ({
        guards: [
          _ctx.on.in("selected"),
          require(equals(_ctx.on.slot("for"), _ctx.also["commitment"].id), r["not-this-commitment"]),
          _ctx.also["commitment"].signer("performer"),
        ],
        effects: [_ctx.on.to("replaced")],
      }),
    ), report: open(
      reportItem,
      g["issue.work"],
      {
        also: {commitment: by(commitmentItem, "commitment")},
        fields: {
          claims: optional(list(text(1024), 32)),
          commit: required(commit),
          commitment: required(itemOf("commitment")),
          evidence: optional(list(digest, 32)),
          summary: optional(detached(65536)),
          terms: required(fact("issue", "file", "revise", "propose-terms")),
          tree: required(tree),
        },
      },
      _ctx => ({
        guards: [
          _ctx.also["commitment"].in("accepted"),
          _ctx.also["commitment"].signer("performer"),
          require(equals(_ctx.f["terms"], _ctx.also["commitment"].slot("termsAt")), r["terms-differ"]),
          permit("hold", "staged", {commit: _ctx.f["commit"], under: _ctx.also["commitment"].id}),
          permit("git-read", "ancestry", {commit: _ctx.f["commit"], row: constant("report")}),
        ],
        effects: [
          _ctx.on.party("reporter", signer),
          _ctx.on.ref("under", _ctx.also["commitment"].id),
          _ctx.on.ref("conditionsAt", _ctx.also["commitment"].slot("conditionsAt")),
          _ctx.on.ref("termsAt", _ctx.f["terms"]),
          _ctx.on.value("commit", _ctx.f["commit"]),
          _ctx.on.value("tree", _ctx.f["tree"]),
          _ctx.on.value("claims", _ctx.f["claims"]),
          _ctx.on.value("evidence", _ctx.f["evidence"]),
          _ctx.on.value("summary", _ctx.f["summary"]),
          _ctx.on.attribute("authors", _ctx.also["commitment"], [
            authorsOf(
              range(
                inputItem,
                ["selected", "replaced"],
                {where: _item => [equals(_item.slot("for"), _ctx.also["commitment"].id)]},
              ),
              "authors",
            ),
          ]),
          invoke("hold", "pin-hold", {commit: _ctx.f["commit"]}),
        ],
        attention: [_ctx.also["commitment"].notify("requester", "after", "reported")],
      }),
    ), "resolve-concern": open(
      decisionItem,
      g["issue.plan"],
      {
        also: {
          concern: by(concernItem, "concern"),
          goal: one(intentItem),
          plan: via(planItem, "also.concern", "plan"),
          replacement: by(concernItem, "replacedBy"),
        },
        fields: {
          acceptance: optional(fact("issue", "accept-report")),
          concern: required(itemOf("concern")),
          kind: required(enumOf("replaced", "excluded", "accepted-as-delivered")),
          reason: required(text(4096)),
          replacedBy: optional(itemOf("concern")),
          terms: optional(fact("issue", "file", "revise", "propose-terms")),
        },
      },
      _ctx => ({
        guards: [
          _ctx.also["plan"].in("sealed"),
          require(equals(_ctx.also["goal"].slot("currentPlan"), _ctx.also["plan"].id), r["not-current-plan"]),
          require(
            anyOf(
              [equals(_ctx.f["kind"], constant("excluded"))],
              [
                equals(_ctx.f["kind"], constant("replaced")),
                equals(_ctx.also["replacement"].slot("plan"), _ctx.also["plan"].id),
              ],
              [
                equals(_ctx.f["kind"], constant("accepted-as-delivered")),
                isFact(_ctx.f["acceptance"]),
                equals(part(_ctx.f["acceptance"], "scope"), _ctx.also["concern"].slot("child")),
                equals(part(_ctx.f["acceptance"], {field: "terms"}), _ctx.f["terms"]),
              ],
            ),
            r["decision-not-supported"],
          ),
        ],
        effects: [
          _ctx.on.party("decider", signer),
          _ctx.on.ref("concern", _ctx.also["concern"].id),
          _ctx.on.value("kind", _ctx.f["kind"]),
          _ctx.on.value("reason", _ctx.f["reason"]),
          _ctx.on.ref("replacedBy", _ctx.also["replacement"].id),
          _ctx.on.ref("acceptance", _ctx.f["acceptance"]),
          _ctx.on.ref("terms", _ctx.f["terms"]),
        ],
      }),
    ), revise: transition(
      intentItem,
      g["issue.revise"],
      {fields: {conditions: required(list(text(4096), 16))}},
      _ctx => ({
        guards: [_ctx.on.in("open"), _ctx.on.signer("requester")],
        effects: [_ctx.on.value("conditions", _ctx.f["conditions"]), _ctx.on.ref("conditionsAt", self)],
      }),
    ), "seal-plan": transition(
      planItem,
      g["issue.plan"],
      {
        also: {current: via(planItem, "also.goal", "currentPlan"), goal: one(intentItem)},
        fields: {
          goalAt: required(fact("issue", "file", "revise")),
          optional: required(list(record({child: optional(scope("lane")), item: required(itemOf("concern"))}), 32)),
          required: required(list(record({child: optional(scope("lane")), item: required(itemOf("concern"))}), 32)),
        },
      },
      _ctx => ({
        guards: [
          _ctx.on.in("open"),
          _ctx.on.signer("planner"),
          require(
            equals(_ctx.on.slot("conditionsAt"), _ctx.also["goal"].slot("conditionsAt")),
            r["planned-for-an-earlier-goal"],
          ),
          require(equals(_ctx.f["goalAt"], _ctx.on.slot("conditionsAt")), r["planned-for-an-earlier-goal"]),
          require(
            none(range(concernItem, ["creating"], {where: _item => [equals(_item.slot("plan"), _ctx.on.id)]})),
            r["concern-creating"],
          ),
          require(
            sameSet(
              _ctx.f["required"],
              "r",
              _element => el("r", "item"),
              concernItem,
              ["creating", "created", "refused", "conflict", "delivered", "dropped"],
              {
                where: _item => [equals(_item.slot("plan"), _ctx.on.id), equals(_item.slot("role"), constant("required"))],
                match: (_item, _element) => [equals(el("r", "child"), _item.slot("child"))],
                ordered: true,
              },
            ),
            r["plan-list-differs"],
          ),
          require(
            sameSet(
              _ctx.f["optional"],
              "r",
              _element => el("r", "item"),
              concernItem,
              ["creating", "created", "refused", "conflict", "delivered", "dropped"],
              {
                where: _item => [equals(_item.slot("plan"), _ctx.on.id), equals(_item.slot("role"), constant("optional"))],
                match: (_item, _element) => [equals(el("r", "child"), _item.slot("child"))],
                ordered: true,
              },
            ),
            r["plan-list-differs"],
          ),
          _ctx.also["current"].in("sealed"),
        ],
        effects: [
          _ctx.on.to("sealed"),
          _ctx.also["goal"].ref("currentPlan", _ctx.on.id),
          _ctx.also["current"].to("superseded"),
        ],
      }),
    ), "settle-ask": transition(
      askItem,
      g["issue.comment"],
      {},
      _ctx => ({guards: [_ctx.on.in("answered"), _ctx.on.signer("asker")], effects: [_ctx.on.to("settled")]}),
    ), "take-hold": open(
      holdItem,
      g["issue.work"],
      {
        also: {commitment: by(commitmentItem, "commitment")},
        fields: {commitment: required(itemOf("commitment")), extent: optional(text(1024))},
      },
      _ctx => ({
        guards: [
          _ctx.also["commitment"].in("accepted"),
          _ctx.also["commitment"].signer("performer"),
          require(
            none(
              range(
                holdItem,
                ["held"],
                {where: _item => [equals(_item.slot("under"), _ctx.also["commitment"].id)]},
              ),
            ),
            r["hold-held"],
          ),
        ],
        effects: [
          _ctx.on.hold("open", _ctx.f["extent"]),
          _ctx.on.ref("under", _ctx.also["commitment"].id),
          _ctx.on.value("extent", _ctx.f["extent"]),
          _ctx.on.value("ends", plusSeconds(3600)),
        ],
      }),
    ), "use-input": open(
      inputItem,
      g["issue.work"],
      {
        also: {commitment: by(commitmentItem, "commitment")},
        fields: {
          accepted: required(fact("issue", "accept-report")),
          commitment: required(itemOf("commitment")),
          report: required(fact("issue", "report")),
        },
      },
      _ctx => ({
        guards: [
          _ctx.also["commitment"].in("accepted"),
          _ctx.also["commitment"].signer("performer"),
          isFact(_ctx.f["accepted"]),
          isFact(_ctx.f["report"]),
          require(
            equals(part(_ctx.f["report"], "scope"), part(_ctx.f["accepted"], "scope")),
            r["not-the-accepted-report"],
          ),
          require(
            equals(part(_ctx.f["report"], "seq"), part(_ctx.f["accepted"], "on")),
            r["not-the-accepted-report"],
          ),
        ],
        effects: [
          _ctx.on.party("selector", signer),
          _ctx.on.ref("for", _ctx.also["commitment"].id),
          _ctx.on.ref("report", _ctx.f["report"]),
          _ctx.on.ref("accepted", _ctx.f["accepted"]),
          _ctx.on.party("authors", part(_ctx.f["report"], {opened: "authors"})),
        ],
      }),
    ), "withdraw-ask": transition(
      askItem,
      g["issue.comment"],
      {},
      _ctx => ({
        guards: [_ctx.on.in("asked", "answered"), _ctx.on.signer("asker")],
        effects: [_ctx.on.to("withdrawn")],
      }),
    ), "withdraw-plan": transition(
      planItem,
      g["issue.plan"],
      {also: {goal: one(intentItem)}},
      _ctx => ({
        guards: [
          _ctx.on.in("sealed"),
          require(equals(_ctx.also["goal"].slot("currentPlan"), _ctx.on.id), r["not-current-plan"]),
        ],
        effects: [_ctx.on.to("superseded"), _ctx.also["goal"].ref("currentPlan", null)],
      }),
    ) },
    receives: { ...shared.receives, closes: receive(
      {
        message: "closes",
        class: "relate",
        from: {kind: "lane", under: "change"},
        fields: {commit: optional(commit), plan: optional(fact("issue", "seal-plan"))},
        also: {goal: one(intentItem)},
        copies: 32,
      },
      _ctx => ({
        effects: [
          when(
            _ctx.also["goal"].to("closed"),
            {
              if: [
                equals(update("state"), constant("merged")),
                _ctx.also["goal"].in("open"),
                anyOf(
                  [_ctx.also["goal"].unset("currentPlan")],
                  [
                    equals(part(_ctx.f["plan"], "scope"), theScope),
                    equals(part(_ctx.f["plan"], "on"), _ctx.also["goal"].slot("currentPlan")),
                  ],
                ),
              ],
            },
          ),
          when(
            _ctx.also["goal"].value("closeReason", constant("completed")),
            {
              if: [
                equals(update("state"), constant("merged")),
                _ctx.also["goal"].in("open"),
                anyOf(
                  [_ctx.also["goal"].unset("currentPlan")],
                  [
                    equals(part(_ctx.f["plan"], "scope"), theScope),
                    equals(part(_ctx.f["plan"], "on"), _ctx.also["goal"].slot("currentPlan")),
                  ],
                ),
              ],
            },
          ),
          when(
            _ctx.also["goal"].ref("closedBy", self),
            {
              if: [
                equals(update("state"), constant("merged")),
                _ctx.also["goal"].in("open"),
                anyOf(
                  [_ctx.also["goal"].unset("currentPlan")],
                  [
                    equals(part(_ctx.f["plan"], "scope"), theScope),
                    equals(part(_ctx.f["plan"], "on"), _ctx.also["goal"].slot("currentPlan")),
                  ],
                ),
              ],
            },
          ),
        ],
        settles: settlesCopy("set"),
      }),
    ), "parent-dropped": receive(
      {
        message: "parent-dropped",
        class: "tell",
        from: {kind: "lane", under: "issue"},
        also: {goal: one(intentItem)},
      },
      _ctx => ({guards: [require(equals(sender, _ctx.also["goal"].slot("parent")), r["not-the-parent"])]}),
    ), "pin-confirm": receive(
      {
        message: "pin-confirm",
        class: "tell",
        from: {kind: "lane", under: "change"},
        fields: {commit: required(commit)},
      },
      _ctx => ({
        guards: [
          require(equals(source("kind"), constant("propose-manifest")), r["not-a-manifest"]),
          require(equals(source({field: "integration"}), _ctx.f["commit"]), r["not-this-commit"]),
          permit("hold", "pin", {commit: _ctx.f["commit"], consumer: sender, intent: source("intent")}),
        ],
        effects: [
          invoke("hold", "pin-hold", {consumer: sender, intent: source("intent"), manifest: source("ref")}),
        ],
      }),
    ), result: receive(
      {
        message: "result",
        class: "relate",
        from: {kind: "lane", under: "issue"},
        fields: {
          acceptance: required(fact("issue", "accept-report")),
          commitment: required(fact("issue", "offer", "propose-terms")),
          conditions: required(fact("issue", "file", "revise")),
          parentItem: required(itemOf("concern")),
          report: required(fact("issue", "report")),
          terms: required(fact("issue", "file", "revise", "propose-terms")),
        },
        also: {concern: by(concernItem, "parentItem"), goal: one(intentItem)},
        copies: 100,
      },
      _ctx => ({
        guards: [
          require(equals(sender, _ctx.also["concern"].slot("child")), r["not-the-child"]),
          _ctx.also["concern"].in("created", "delivered"),
        ],
        effects: [
          _ctx.also["concern"].to("delivered"),
          _ctx.also["concern"].ref("result", _ctx.f["commitment"]),
        ],
        attention: [_ctx.also["goal"].notify("requester", "after", "concern-delivered")],
        settles: _ctx.also["concern"].settles("created"),
      }),
    ), unpin: receive(
      {
        message: "unpin",
        class: "tell",
        from: {kind: "lane", under: "change"},
        fields: {
          because: required(enumOf("superseded", "published")),
          commit: required(commit),
          manifest: required(fact("change", "propose-manifest")),
          merge: optional(fact("change", "merge")),
        },
      },
      _ctx => ({
        guards: [
          isFact(_ctx.f["manifest"]),
          require(equals(part(_ctx.f["manifest"], "scope"), sender), r["not-the-owner"]),
          require(
            equals(part(_ctx.f["manifest"], {field: "integration"}), _ctx.f["commit"]),
            r["not-this-commit"],
          ),
          permit(
            "hold",
            "pin",
            {commit: _ctx.f["commit"], consumer: sender, intent: part(_ctx.f["manifest"], "intent")},
          ),
          require(
            anyOf(
              [
                equals(_ctx.f["because"], constant("superseded")),
                equals(source({set: {item: part(_ctx.f["manifest"], "seq"), slot: "state"}}), constant("superseded")),
              ],
              [
                equals(_ctx.f["because"], constant("published")),
                isFact(_ctx.f["merge"]),
                equals(part(_ctx.f["merge"], "scope"), sender),
                equals(part(_ctx.f["merge"], {field: "manifest"}), part(_ctx.f["manifest"], "seq")),
                equals(source({set: {item: part(_ctx.f["merge"], "seq"), slot: "state"}}), constant("published")),
              ],
            ),
            r["still-needed"],
          ),
        ],
        effects: [
          invoke(
            "hold",
            "pin-release",
            {
              by: source("ref"),
              consumer: sender,
              intent: part(_ctx.f["manifest"], "intent"),
              manifest: _ctx.f["manifest"],
            },
          ),
        ],
      }),
    ) },
    timed: { ...shared.timed },
    rules: {},
    capabilities: [{"name": "hold", "version": 1}, {"name": "git-read", "version": 1}],
  },
);
export type IssueDefinition = DefinitionData<typeof issueSource>;
