import {
  anyOf, author, authorsFrom, authorsIn, bool, by,
  collect, commit, constant, count, define, detached,
  differs, digest, distinct, each, eachItem, eachOf,
  eachSlot, el, enumOf, equals, fact, final,
  grants, has, ifPresent, index, int, invoke,
  isFact, item, itemOf, list, live, member,
  none, nothing, one, open, optional, part,
  party, permit, plusSeconds, presented, range, reasons,
  receive, record, ref, relate, require, required,
  resultReason, scope, self, sender, signer, slotsOf,
  some, source, tell, text, theIntent, theScope,
  time, timed, transition, tree, update, value,
  via, when,
} from "@generalbusiness/dap-define";
import { exportItem, holdItem, sharedForms } from "./shared.ts";
import type { DefinitionData } from "./shared.ts";

const g = grants(
  {
    "change.check": "change.check",
    "change.comment": "change.comment",
    "change.dismiss": "change.dismiss",
    "change.edit-any": "change.edit-any",
    "change.edit-own": "change.edit-own",
    "change.merge": "change.merge",
    "change.open": "change.open",
    "change.promise": "change.promise",
    "change.propose": "change.propose",
    "change.request": "change.request",
    "change.review": "change.review",
    "change.triage": "change.triage",
    "change.work": "change.work",
    "work.export": "work.export",
  },
);
const r = reasons(
  {
    accepted: "accepted",
    "already-linked": "already-linked",
    "approvals-needed": "approvals-needed",
    "author-cannot-review": "author-cannot-review",
    cancelled: "cancelled",
    "changes-requested": "changes-requested",
    "check-errored": "check-errored",
    "check-failed": "check-failed",
    "check-timed-out": "check-timed-out",
    "decision-without-plan": "decision-without-plan",
    draft: "draft",
    "export-not-authorized": "export-not-authorized",
    "handed-over": "handed-over",
    "handover-offered": "handover-offered",
    "hold-held": "hold-held",
    "job-exists": "job-exists",
    mentioned: "mentioned",
    "merge-in-progress": "merge-in-progress",
    "newer-version": "newer-version",
    "not-a-check-of-the-rules": "not-a-check-of-the-rules",
    "not-complete": "not-complete",
    "not-offeree": "not-offeree",
    "not-the-checker": "not-the-checker",
    "not-the-current-version": "not-the-current-version",
    "not-the-destination": "not-the-destination",
    "not-the-rules-scope": "not-the-rules-scope",
    "not-this-job": "not-this-job",
    offered: "offered",
    "one-version": "one-version",
    "pin-mismatch": "pin-mismatch",
    "plan-not-of-goal": "plan-not-of-goal",
    "reports-not-selected": "reports-not-selected",
    "required-check-not-passed": "required-check-not-passed",
    "review-requested": "review-requested",
    reviewed: "reviewed",
    "rules-unknown": "rules-unknown",
    "selection-malformed": "selection-malformed",
    "source-shape": "source-shape",
    "target-not-held": "target-not-held",
    "terms-differ": "terms-differ",
    "verdict-exists": "verdict-exists",
    withdrawn: "withdrawn",
  },
);

const commentItem = item(
  "comment",
  {
    many: 5000,
    initial: "visible",
    states: {collapsed: live, redacted: final, visible: live},
    parties: {author: party.fixed, mentioned: party.list(16, "once")},
    refs: {replyTo: ref.optional(itemOf("comment")), thread: ref.once(itemOf("thread"))},
    values: {body: value.optional(detached(65536)), collapseReason: value.optional(text(1024))},
  },
);

const commitmentItem = item(
  "commitment",
  {
    many: 16,
    initial: "offered",
    states: {accepted: live, cancelled: final, declined: final, offered: live, withdrawn: final},
    parties: {
      offeree: party.once,
      performer: author(party.optional),
      requester: party.fixed,
      successor: party.optional,
    },
    refs: {termsAt: ref.fixed(fact("change", "offer"))},
    values: {terms: value.fixed(text(4096))},
  },
);

const jobItem = item(
  "job",
  {
    many: 64,
    initial: "requested",
    states: {
      errored: live,
      failed: live,
      passed: live,
      requested: live,
      superseded: final,
      "timed-out": live,
    },
    parties: {asker: party.fixed, informed: party.list(2, "once")},
    refs: {
      decidedBy: ref.optional(fact("change", "check", "check-error", "timed:job-deadline")),
      manifest: ref.fixed(itemOf("manifest")),
    },
    values: {
      configuration: value.fixed(digest),
      deadline: value.fixed(time),
      name: value.fixed(text(128)),
      tree: value.fixed(tree),
    },
  },
);

const linkItem = item(
  "link",
  {
    many: 32,
    initial: "set",
    states: {removed: live, set: live},
    parties: {linker: party.fixed},
    refs: {issue: ref.fixed(scope("lane"))},
    values: {how: value.fixed(enumOf("keyword", "manual"))},
  },
);

const manifestItem = item(
  "manifest",
  {
    many: 64,
    initial: "current",
    states: {current: live, superseded: final},
    parties: {authors: party.list(64, "fixed"), integrator: party.fixed},
    refs: {
      goal: ref.once(fact("issue", "file", "revise")),
      pin: ref.once(fact("issue", "hold@1:check")),
      plan: ref.once(fact("issue", "seal-plan")),
      staging: ref.once(scope("lane")),
      under: ref.once(itemOf("commitment")),
    },
    values: {
      base: value.fixed(commit),
      complete: value.fixed(bool),
      decisions: value.once(list(fact("issue", "resolve-concern"), 32)),
      digest: value.once(digest),
      integration: value.once(commit),
      path: value.once(text(1024)),
      selected: value.once(list(
        record(
          {accepted: required(fact("issue", "accept-report")), report: required(fact("issue", "report"))},
        ),
        32,
      )),
      size: value.once(int(0, 65536)),
      tree: value.once(tree),
    },
  },
);

const mergeItem = item(
  "merge",
  {
    many: 16,
    initial: "intended",
    states: {
      aborted: final,
      committed: live,
      intended: live,
      published: final,
      refused: final,
      unknown: live,
    },
    parties: {merger: party.fixed},
    refs: {manifest: ref.fixed(itemOf("manifest"))},
    values: {
      commit: value.optional(commit),
      reason: value.optional(text(1024)),
      withdrawal: value.optional(enumOf("asked")),
    },
  },
);

const proposalItem = item(
  "proposal",
  {
    initial: "draft",
    states: {closed: live, draft: live, merged: final, open: live},
    parties: {assignees: party.list(10, "optional"), author: party.fixed},
    refs: {destination: ref.fixed(scope("destination")), rulesScope: ref.fixed(scope("rules"))},
    values: {
      body: value.optional(detached(65536)),
      labels: value.optional(list(text(64), 20)),
      number: value.optional(int(1, 1000000000)),
      title: value.required(text(256)),
    },
  },
);

const resultItem = item(
  "result",
  {
    many: 512,
    initial: "recorded",
    states: {recorded: final},
    parties: {checker: party.fixed},
    refs: {job: ref.fixed(itemOf("job"))},
    values: {
      details: value.once(digest),
      outcome: value.fixed(enumOf("passed", "failed", "error")),
      reason: value.once(text(4096)),
      tree: value.fixed(tree),
    },
  },
);

const reviewItem = item(
  "review",
  {
    many: 256,
    initial: "submitted",
    states: {dismissed: final, submitted: live, superseded: final, withdrawn: final},
    parties: {reviewer: party.fixed},
    refs: {manifest: ref.fixed(itemOf("manifest"))},
    values: {
      body: value.optional(detached(65536)),
      dismissal: value.optional(text(4096)),
      extent: value.once(text(64)),
      verdict: value.fixed(enumOf("approve", "request-changes")),
    },
  },
);

const review_requestItem = item(
  "review-request",
  {
    many: 64,
    initial: "open",
    states: {met: final, open: live, withdrawn: final},
    parties: {requested: party.fixed, requester: party.fixed},
  },
);

const rulesItem = item(
  "rules",
  {
    initial: "current",
    states: {current: live},
    refs: {source: ref.optional(fact("platform:rules", "publish", "rules-wanted"))},
    values: {
      approvals: value.required(int(0, 64)),
      checks: value.optional(list(
        record(
          {
            checker: required(member),
            configuration: required(digest),
            name: required(text(128)),
            required: required(bool),
          },
        ),
        32,
      )),
      extents: value.optional(list(
        record(
          {
            approvals: required(int(0, 64)),
            approver: required(text(64)),
            checks: required(list(text(128), 32)),
            class: required(enumOf("content", "deployment", "authority")),
            name: required(text(64)),
          },
        ),
        8,
      )),
      ownerMayReview: value.required(bool),
      revision: value.required(int(0, 1000000000)),
    },
  },
);

const threadItem = item(
  "thread",
  {
    many: 1000,
    initial: "open",
    states: {open: live, resolved: live},
    parties: {opener: party.fixed},
    refs: {manifest: ref.fixed(itemOf("manifest"))},
    values: {
      line: value.once(int(1, 1000000000)),
      path: value.fixed(text(4096)),
      side: value.once(enumOf("base", "change")),
    },
  },
);

const shared = sharedForms("change", { comment: commentItem, commitment: commitmentItem });

export const changeSource = define(
  {
    name: "change",
    genesis: "open",
    grants: g,
    reasons: r,
    items: [
      commentItem,
      commitmentItem,
      exportItem,
      holdItem,
      jobItem,
      linkItem,
      manifestItem,
      mergeItem,
      proposalItem,
      resultItem,
      reviewItem,
      review_requestItem,
      rulesItem,
      threadItem,
    ],
    acts: {
    ...shared.acts,
    accept: transition(
      commitmentItem,
      g["change.promise"],
      {fields: {terms: required(fact("change", "offer"))}},
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
    ),
    "accept-handover": transition(
      commitmentItem,
      g["change.promise"],
      {fields: {terms: required(fact("change", "offer"))}},
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
    ),
    "ask-rules": transition(
      proposalItem,
      g["change.propose"],
      {},
      _ctx => ({
        sends: [tell({fields: {}, message: "rules-wanted", result: {}, to: _ctx.on.slot("rulesScope")})],
      }),
    ),
    cancel: transition(
      commitmentItem,
      g["change.request"],
      {},
      _ctx => ({
        guards: [_ctx.on.in("offered", "accepted"), _ctx.on.signer("requester")],
        effects: [_ctx.on.to("cancelled")],
        attention: [_ctx.on.notify("performer", "after", "cancelled")],
      }),
    ),
    "cancel-merge": transition(
      mergeItem,
      g["change.merge"],
      {also: {proposal: one(proposalItem)}},
      _ctx => ({
        guards: [_ctx.on.in("intended"), _ctx.on.unset("withdrawal")],
        effects: [_ctx.on.value("withdrawal", constant("asked"))],
        sends: [
          tell(
            {
              fields: {operation: _ctx.on.id},
              message: "withdraw",
              result: {
                undelivered: [
                  when(_ctx.on.value("withdrawal", null), {if: [_ctx.on.in("intended", "committed", "unknown")]}),
                ],
              },
              to: _ctx.also["proposal"].slot("destination"),
            },
          ),
        ],
      }),
    ),
    check: open(
      resultItem,
      g["change.check"],
      {
        also: {job: by(jobItem, "job"), proposal: one(proposalItem), rules: one(rulesItem)},
        fields: {
          configuration: required(digest),
          details: optional(digest),
          job: required(itemOf("job")),
          outcome: required(enumOf("passed", "failed")),
          tree: required(tree),
        },
      },
      _ctx => ({
        guards: [
          require(none(range(mergeItem, ["intended", "committed", "unknown"])), r["merge-in-progress"]),
          require(equals(_ctx.f["tree"], _ctx.also["job"].slot("tree")), r["not-this-job"]),
          require(equals(_ctx.f["configuration"], _ctx.also["job"].slot("configuration")), r["not-this-job"]),
          require(
            has(
              _ctx.also["rules"].slot("checks"),
              "k",
              _element => ({
                where: [equals(el("k", "name"), _ctx.also["job"].slot("name")), equals(el("k", "checker"), signer)],
              }),
            ),
            r["not-the-checker"],
          ),
        ],
        effects: [
          _ctx.on.party("checker", signer),
          _ctx.on.ref("job", _ctx.also["job"].id),
          _ctx.on.value("outcome", _ctx.f["outcome"]),
          _ctx.on.value("tree", _ctx.f["tree"]),
          _ctx.on.value("details", _ctx.f["details"]),
          when(
            _ctx.also["job"].to("passed"),
            {
              if: [_ctx.also["job"].in("requested", "timed-out"), equals(_ctx.f["outcome"], constant("passed"))],
            },
          ),
          when(
            _ctx.also["job"].to("failed"),
            {
              if: [_ctx.also["job"].in("requested", "timed-out"), equals(_ctx.f["outcome"], constant("failed"))],
            },
          ),
          when(
            _ctx.also["job"].ref("decidedBy", self),
            {if: [_ctx.also["job"].in("requested", "timed-out")]},
          ),
        ],
        attention: [
          _ctx.also["proposal"].notify("author", "after", "check-failed", {if: [equals(_ctx.f["outcome"], constant("failed"))]}),
        ],
        settles: _ctx.also["job"].settles("requested", "timed-out"),
      }),
    ),
    "check-error": open(
      resultItem,
      g["change.check"],
      {
        also: {job: by(jobItem, "job"), rules: one(rulesItem)},
        fields: {
          configuration: required(digest),
          details: optional(digest),
          job: required(itemOf("job")),
          reason: required(text(4096)),
          tree: required(tree),
        },
      },
      _ctx => ({
        guards: [
          require(none(range(mergeItem, ["intended", "committed", "unknown"])), r["merge-in-progress"]),
          require(equals(_ctx.f["tree"], _ctx.also["job"].slot("tree")), r["not-this-job"]),
          require(equals(_ctx.f["configuration"], _ctx.also["job"].slot("configuration")), r["not-this-job"]),
          require(
            has(
              _ctx.also["rules"].slot("checks"),
              "k",
              _element => ({
                where: [equals(el("k", "name"), _ctx.also["job"].slot("name")), equals(el("k", "checker"), signer)],
              }),
            ),
            r["not-the-checker"],
          ),
        ],
        effects: [
          _ctx.on.party("checker", signer),
          _ctx.on.ref("job", _ctx.also["job"].id),
          _ctx.on.value("outcome", constant("error")),
          _ctx.on.value("reason", _ctx.f["reason"]),
          _ctx.on.value("tree", _ctx.f["tree"]),
          when(_ctx.also["job"].to("errored"), {if: [_ctx.also["job"].in("requested", "timed-out")]}),
          when(
            _ctx.also["job"].ref("decidedBy", self),
            {if: [_ctx.also["job"].in("requested", "timed-out")]},
          ),
          _ctx.on.value("details", _ctx.f["details"]),
        ],
        attention: [_ctx.also["job"].notify("informed", "after", "check-errored")],
        settles: _ctx.also["job"].settles("requested", "timed-out"),
      }),
    ),
    "close-any": transition(
      proposalItem,
      g["change.edit-any"],
      {},
      _ctx => ({
        guards: [
          _ctx.on.in("draft", "open"),
          require(none(range(mergeItem, ["intended", "committed", "unknown"])), r["merge-in-progress"]),
        ],
        effects: [_ctx.on.to("closed")],
        sends: [index({state: constant("closed")})],
      }),
    ),
    "close-own": transition(
      proposalItem,
      g["change.edit-own"],
      {},
      _ctx => ({
        guards: [
          _ctx.on.in("draft", "open"),
          require(none(range(mergeItem, ["intended", "committed", "unknown"])), r["merge-in-progress"]),
          _ctx.on.signer("author"),
        ],
        effects: [_ctx.on.to("closed")],
        sends: [index({state: constant("closed")})],
      }),
    ),
    comment: open(
      commentItem,
      g["change.comment"],
      {
        fields: {
          body: required(detached(65536)),
          mentions: optional(list(member, 16)),
          replyTo: optional(itemOf("comment")),
          thread: optional(itemOf("thread")),
        },
      },
      _ctx => ({
        effects: [
          _ctx.on.party("author", signer),
          _ctx.on.value("body", _ctx.f["body"]),
          _ctx.on.ref("replyTo", _ctx.f["replyTo"]),
          _ctx.on.ref("thread", _ctx.f["thread"]),
          _ctx.on.party("mentioned", _ctx.f["mentions"]),
        ],
        attention: [_ctx.on.notify("mentioned", "after", "mentioned")],
      }),
    ),
    "dismiss-review": transition(
      reviewItem,
      g["change.dismiss"],
      {fields: {reason: required(text(4096))}},
      _ctx => ({
        guards: [
          _ctx.on.in("submitted"),
          require(none(range(mergeItem, ["intended", "committed", "unknown"])), r["merge-in-progress"]),
        ],
        effects: [_ctx.on.to("dismissed"), _ctx.on.value("dismissal", _ctx.f["reason"])],
      }),
    ),
    "edit-any": transition(
      proposalItem,
      g["change.edit-any"],
      {
        fields: {
          body: optional(detached(65536)),
          labels: optional(list(text(64), 20)),
          title: optional(text(256)),
        },
      },
      _ctx => ({
        guards: [_ctx.on.in("draft", "open", "closed")],
        effects: [
          _ctx.on.value("title", _ctx.f["title"]),
          _ctx.on.value("body", _ctx.f["body"]),
          _ctx.on.value("labels", _ctx.f["labels"]),
        ],
        sends: [index({labels: _ctx.f["labels"], title: _ctx.f["title"]})],
      }),
    ),
    "edit-own": transition(
      proposalItem,
      g["change.edit-own"],
      {
        fields: {
          body: optional(detached(65536)),
          labels: optional(list(text(64), 20)),
          title: optional(text(256)),
        },
      },
      _ctx => ({
        guards: [_ctx.on.in("draft", "open", "closed"), _ctx.on.signer("author")],
        effects: [
          _ctx.on.value("title", _ctx.f["title"]),
          _ctx.on.value("body", _ctx.f["body"]),
          _ctx.on.value("labels", _ctx.f["labels"]),
        ],
        sends: [index({labels: _ctx.f["labels"], title: _ctx.f["title"]})],
      }),
    ),
    "link-any": open(
      linkItem,
      g["change.edit-any"],
      {
        also: {proposal: one(proposalItem)},
        fields: {how: required(enumOf("keyword", "manual")), issue: required(scope("lane"))},
      },
      _ctx => ({
        guards: [
          require(none(range(mergeItem, ["intended", "committed", "unknown"])), r["merge-in-progress"]),
          _ctx.also["proposal"].in("draft", "open", "closed"),
          require(
            none(range(linkItem, ["set"], {where: _item => [equals(_item.slot("issue"), _ctx.f["issue"])]})),
            r["already-linked"],
          ),
        ],
        effects: [
          _ctx.on.ref("issue", _ctx.f["issue"]),
          _ctx.on.party("linker", signer),
          _ctx.on.value("how", _ctx.f["how"]),
        ],
        sends: [
          relate({detail: {}, item: self, name: "closes", result: {}, state: "set", to: _ctx.f["issue"]}),
        ],
      }),
    ),
    "link-own": open(
      linkItem,
      g["change.edit-own"],
      {
        also: {proposal: one(proposalItem)},
        fields: {how: required(enumOf("keyword", "manual")), issue: required(scope("lane"))},
      },
      _ctx => ({
        guards: [
          require(none(range(mergeItem, ["intended", "committed", "unknown"])), r["merge-in-progress"]),
          _ctx.also["proposal"].in("draft", "open", "closed"),
          require(
            none(range(linkItem, ["set"], {where: _item => [equals(_item.slot("issue"), _ctx.f["issue"])]})),
            r["already-linked"],
          ),
          _ctx.also["proposal"].signer("author"),
        ],
        effects: [
          _ctx.on.ref("issue", _ctx.f["issue"]),
          _ctx.on.party("linker", signer),
          _ctx.on.value("how", _ctx.f["how"]),
        ],
        sends: [
          relate({detail: {}, item: self, name: "closes", result: {}, state: "set", to: _ctx.f["issue"]}),
        ],
      }),
    ),
    merge: open(
      mergeItem,
      g["change.merge"],
      {
        also: {manifest: by(manifestItem, "manifest"), proposal: one(proposalItem), rules: one(rulesItem)},
        fields: {manifest: required(itemOf("manifest")), reports: required(list(fact("issue", "report"), 32))},
      },
      _ctx => ({
        guards: [
          require(_ctx.also["proposal"].in("open"), r["draft"]),
          require(_ctx.also["manifest"].in("current"), r["newer-version"]),
          require(equals(_ctx.also["manifest"].slot("complete"), constant(true)), r["not-complete"]),
          require(none(range(mergeItem, ["intended", "committed", "unknown"])), r["merge-in-progress"]),
          require(differs(_ctx.also["rules"].slot("revision"), nothing), r["rules-unknown"]),
          require(
            count(
              range(
                reviewItem,
                ["submitted"],
                {
                  where: _item => [
                    equals(_item.slot("verdict"), constant("approve")),
                    equals(_item.slot("manifest"), _ctx.also["manifest"].id),
                  ],
                },
              ),
              {min: _ctx.also["rules"].slot("approvals")},
            ),
            r["approvals-needed"],
          ),
          require(
            none(
              range(
                reviewItem,
                ["submitted"],
                {
                  where: _item => [
                    equals(_item.slot("verdict"), constant("request-changes")),
                    equals(_item.slot("manifest"), _ctx.also["manifest"].id),
                  ],
                },
              ),
            ),
            r["changes-requested"],
          ),
          require(
            each(
              _ctx.also["rules"].slot("checks"),
              "k",
              _element => ({
                where: [equals(el("k", "required"), constant(true))],
                guards: [
                  some(
                    range(
                      jobItem,
                      ["passed"],
                      {
                        where: _item => [
                          equals(_item.slot("name"), el("k", "name")),
                          equals(_item.slot("configuration"), el("k", "configuration")),
                          equals(_item.slot("manifest"), _ctx.also["manifest"].id),
                        ],
                      },
                    ),
                  ),
                ],
              }),
            ),
            r["required-check-not-passed"],
          ),
          require(
            each(
              _ctx.f["reports"],
              "r",
              _element => ({
                guards: [
                  has(
                    _ctx.also["manifest"].slot("selected"),
                    "s",
                    _element => ({where: [equals(el("s", "report"), el("r"))]}),
                  ),
                ],
              }),
            ),
            r["reports-not-selected"],
          ),
          require(
            each(
              _ctx.also["manifest"].slot("selected"),
              "s",
              _element => ({
                guards: [has(_ctx.f["reports"], "r", _element => ({where: [equals(el("r"), el("s", "report"))]}))],
              }),
            ),
            r["reports-not-selected"],
          ),
        ],
        effects: [_ctx.on.party("merger", signer), _ctx.on.ref("manifest", _ctx.also["manifest"].id)],
        sends: [
          tell(
            {
              fields: {
                jobs: collect(
                  range(
                    jobItem,
                    ["requested", "passed", "failed", "errored", "timed-out"],
                    {where: _item => [equals(_item.slot("manifest"), _ctx.also["manifest"].id)]},
                  ),
                  {"decidedBy": "decidedBy", "job": "item", "name": "name", "state": "state"},
                ),
                links: collect(range(linkItem, ["set"]), {"issue": "issue", "link": "item"}),
                manifest: _ctx.also["manifest"].id,
                operation: self,
                reports: _ctx.f["reports"],
                verdicts: collect(
                  range(
                    reviewItem,
                    ["submitted"],
                    {where: _item => [equals(_item.slot("manifest"), _ctx.also["manifest"].id)]},
                  ),
                  {"extent": "extent", "review": "item", "reviewer": "reviewer", "verdict": "verdict"},
                ),
              },
              message: "reserve",
              result: {
                refused: [
                  when(_ctx.on.to("aborted"), {if: [equals(resultReason, constant("withdrawn"))]}),
                  when(_ctx.on.to("refused"), {unless: [equals(resultReason, constant("withdrawn"))]}),
                  _ctx.on.value("reason", resultReason),
                ],
                undelivered: [_ctx.on.to("refused"), _ctx.on.value("reason", constant("undelivered"))],
              },
              to: _ctx.also["proposal"].slot("destination"),
            },
          ),
        ],
      }),
    ),
    offer: open(
      commitmentItem,
      g["change.request"],
      {
        also: {proposal: one(proposalItem)},
        fields: {offeree: optional(member), terms: required(text(4096))},
      },
      _ctx => ({
        guards: [_ctx.also["proposal"].in("draft", "open")],
        effects: [
          _ctx.on.party("requester", signer),
          _ctx.on.party("offeree", _ctx.f["offeree"]),
          _ctx.on.value("terms", _ctx.f["terms"]),
          _ctx.on.ref("termsAt", self),
        ],
        attention: [_ctx.on.notify("offeree", "after", "offered")],
      }),
    ),
    open: open(
      proposalItem,
      g["change.open"],
      {
        fields: {
          body: optional(detached(65536)),
          destination: required(scope("destination")),
          draft: required(bool),
          number: optional(int(1, 1000000000)),
          opener: required(member),
          rules: required(scope("rules")),
          title: required(text(256)),
        },
      },
      _ctx => ({
        effects: [
          when(_ctx.on.to("open"), {if: [equals(_ctx.f["draft"], constant(false))]}),
          _ctx.on.party("author", _ctx.f["opener"]),
          _ctx.on.value("title", _ctx.f["title"]),
          _ctx.on.value("body", _ctx.f["body"]),
          _ctx.on.ref("destination", _ctx.f["destination"]),
          _ctx.on.ref("rulesScope", _ctx.f["rules"]),
          _ctx.on.value("number", _ctx.f["number"]),
        ],
        sends: [
          index(
            {
              author: _ctx.f["opener"],
              draft: _ctx.f["draft"],
              kind: constant("pr"),
              number: _ctx.f["number"],
              state: constant("open"),
              title: _ctx.f["title"],
            },
          ),
        ],
      }),
    ),
    "open-thread": open(
      threadItem,
      g["change.comment"],
      {
        also: {manifest: by(manifestItem, "manifest")},
        fields: {
          line: optional(int(1, 1000000000)),
          manifest: required(itemOf("manifest")),
          path: required(text(4096)),
          side: optional(enumOf("base", "change")),
        },
      },
      _ctx => ({
        effects: [
          _ctx.on.party("opener", signer),
          _ctx.on.ref("manifest", _ctx.also["manifest"].id),
          _ctx.on.value("path", _ctx.f["path"]),
          _ctx.on.value("line", _ctx.f["line"]),
          _ctx.on.value("side", _ctx.f["side"]),
        ],
      }),
    ),
    "propose-file": open(
      manifestItem,
      g["change.propose"],
      {
        also: {proposal: one(proposalItem)},
        fields: {
          base: required(commit),
          content: required(text(65536)),
          digest: required(digest),
          path: required(text(1024)),
          size: required(int(0, 65536)),
        },
      },
      _ctx => ({
        guards: [
          _ctx.also["proposal"].in("draft", "open"),
          _ctx.also["proposal"].signer("author"),
          require(none(range(mergeItem, ["intended", "committed", "unknown"])), r["merge-in-progress"]),
          require(none(range(manifestItem, ["current", "superseded"])), r["one-version"]),
        ],
        effects: [
          _ctx.on.party("integrator", signer),
          _ctx.on.party("authors", [signer]),
          _ctx.on.value("base", _ctx.f["base"]),
          _ctx.on.value("path", _ctx.f["path"]),
          _ctx.on.value("digest", _ctx.f["digest"]),
          _ctx.on.value("size", _ctx.f["size"]),
          _ctx.on.value("complete", constant(true)),
        ],
      }),
    ),
    "propose-manifest": open(
      manifestItem,
      g["change.propose"],
      {
        also: {
          commitment: via(commitmentItem, "also.hold", "under"),
          hold: by(holdItem, "hold"),
          previous: by(manifestItem, "previous"),
          proposal: one(proposalItem),
        },
        fields: {
          base: required(commit),
          complete: required(bool),
          decisions: required(list(fact("issue", "resolve-concern"), 32)),
          foreignHold: optional(int(0, 1000000000)),
          goal: optional(fact("issue", "file", "revise")),
          hold: optional(itemOf("hold")),
          instance: required(text(128)),
          integration: required(commit),
          lane: optional(scope("lane")),
          plan: optional(fact("issue", "seal-plan")),
          previous: optional(itemOf("manifest")),
          selected: required(
            list(
              record(
                {accepted: required(fact("issue", "accept-report")), report: required(fact("issue", "report"))},
              ),
              32,
            ),
          ),
          tree: required(tree),
        },
        presents: {pin: presented("issue", ["hold@1:check"], false)},
      },
      _ctx => ({
        guards: [
          _ctx.also["proposal"].in("draft", "open"),
          require(none(range(mergeItem, ["intended", "committed", "unknown"])), r["merge-in-progress"]),
          require(
            none(range(manifestItem, ["current"], {except: ["also.previous"]})),
            r["not-the-current-version"],
          ),
          _ctx.also["previous"].in("current"),
          require(
            anyOf(
              [
                differs(_ctx.f["hold"], nothing),
                equals(_ctx.f["lane"], nothing),
                equals(_ctx.f["foreignHold"], nothing),
                equals(_ctx.p["pin"], nothing),
              ],
              [
                equals(_ctx.f["hold"], nothing),
                differs(_ctx.f["lane"], nothing),
                differs(_ctx.f["foreignHold"], nothing),
                differs(_ctx.p["pin"], nothing),
              ],
            ),
            r["source-shape"],
          ),
          _ctx.also["hold"].signer("holder"),
          _ctx.also["hold"].in("held", "ended"),
          _ctx.also["commitment"].in("accepted"),
          _ctx.also["commitment"].signer("performer"),
          ifPresent(isFact(_ctx.p["pin"])),
          ifPresent(require(equals(part(_ctx.p["pin"], "scope"), _ctx.f["lane"]), r["pin-mismatch"])),
          ifPresent(require(equals(part(_ctx.p["pin"], {carried: "check.intent"}), theIntent), r["pin-mismatch"])),
          ifPresent(
            require(
              equals(part(_ctx.p["pin"], {carried: "check.commit"}), _ctx.f["integration"]),
              r["pin-mismatch"],
            ),
          ),
          ifPresent(
            require(equals(part(_ctx.p["pin"], {carried: "check.consumer"}), theScope), r["pin-mismatch"]),
          ),
          ifPresent(
            require(
              equals(part(_ctx.p["pin"], {carried: "check.hold"}), _ctx.f["foreignHold"]),
              r["pin-mismatch"],
            ),
          ),
          ifPresent(
            require(
              equals(part(_ctx.p["pin"], {carried: "check.instance"}), _ctx.f["instance"]),
              r["pin-mismatch"],
            ),
          ),
          permit(
            "hold",
            "staged",
            {commit: _ctx.f["integration"], pin: _ctx.p["pin"], under: _ctx.also["commitment"].id},
          ),
          require(
            each(
              _ctx.f["selected"],
              "s",
              _element => ({
                guards: [
                  isFact(el("s", "accepted")),
                  isFact(el("s", "report")),
                  equals(part(el("s", "report"), "scope"), part(el("s", "accepted"), "scope")),
                  equals(part(el("s", "report"), "seq"), part(el("s", "accepted"), "on")),
                ],
              }),
            ),
            r["selection-malformed"],
          ),
          ifPresent(isFact(_ctx.f["goal"])),
          ifPresent(isFact(_ctx.f["plan"])),
          require(
            anyOf(
              [equals(_ctx.f["plan"], nothing)],
              [equals(part(_ctx.f["plan"], "scope"), part(_ctx.f["goal"], "scope"))],
            ),
            r["plan-not-of-goal"],
          ),
          require(
            each(
              _ctx.f["decisions"],
              "d",
              _element => ({guards: [isFact(el("d")), differs(_ctx.f["plan"], nothing)]}),
            ),
            r["decision-without-plan"],
          ),
          require(
            anyOf(
              [equals(_ctx.f["complete"], constant(false))],
              [equals(_ctx.f["plan"], nothing)],
              [
                equals(part(_ctx.f["plan"], "scope"), part(_ctx.f["goal"], "scope")),
                equals(part(_ctx.f["plan"], {field: "goalAt"}), _ctx.f["goal"]),
                each(
                  _ctx.f["selected"],
                  "s",
                  _element => ({
                    guards: [
                      anyOf(
                        [
                          has(
                            part(_ctx.f["plan"], {field: "required"}),
                            "k",
                            _element => ({where: [equals(el("k", "child"), part(el("s", "accepted"), "scope"))]}),
                          ),
                        ],
                        [
                          has(
                            part(_ctx.f["plan"], {field: "optional"}),
                            "k",
                            _element => ({where: [equals(el("k", "child"), part(el("s", "accepted"), "scope"))]}),
                          ),
                        ],
                      ),
                    ],
                  }),
                ),
                distinct(_ctx.f["selected"], "s", _element => part(el("s", "accepted"), "scope")),
                each(
                  _ctx.f["selected"],
                  "s",
                  _element => ({
                    where: [differs(part(el("s", "accepted"), {of: {"field": "terms"}, then: "seq"}), constant(0))],
                    guards: [
                      has(
                        _ctx.f["decisions"],
                        "d",
                        _element => ({
                          where: [
                            equals(part(el("d"), {field: "kind"}), constant("accepted-as-delivered")),
                            equals(part(el("d"), {field: "acceptance"}), el("s", "accepted")),
                            equals(part(el("d"), {field: "terms"}), part(el("s", "accepted"), {field: "terms"})),
                          ],
                        }),
                      ),
                    ],
                  }),
                ),
                each(
                  _ctx.f["selected"],
                  "s",
                  _element => ({
                    where: [
                      differs(
                        part(el("s", "accepted"), {of: {"field": "terms"}, then: "scope"}),
                        part(el("s", "accepted"), "scope"),
                      ),
                    ],
                    guards: [
                      has(
                        _ctx.f["decisions"],
                        "d",
                        _element => ({
                          where: [
                            equals(part(el("d"), {field: "kind"}), constant("accepted-as-delivered")),
                            equals(part(el("d"), {field: "acceptance"}), el("s", "accepted")),
                            equals(part(el("d"), {field: "terms"}), part(el("s", "accepted"), {field: "terms"})),
                          ],
                        }),
                      ),
                    ],
                  }),
                ),
                each(
                  _ctx.f["decisions"],
                  "d",
                  _element => ({
                    guards: [
                      equals(part(el("d"), "scope"), part(_ctx.f["plan"], "scope")),
                      anyOf(
                        [
                          has(
                            part(_ctx.f["plan"], {field: "required"}),
                            "k",
                            _element => ({where: [equals(el("k", "item"), part(el("d"), {field: "concern"}))]}),
                          ),
                        ],
                        [
                          has(
                            part(_ctx.f["plan"], {field: "optional"}),
                            "k",
                            _element => ({where: [equals(el("k", "item"), part(el("d"), {field: "concern"}))]}),
                          ),
                        ],
                      ),
                      anyOf(
                        [differs(part(el("d"), {field: "kind"}), constant("replaced"))],
                        [
                          anyOf(
                            [
                              has(
                                part(_ctx.f["plan"], {field: "required"}),
                                "k",
                                _element => ({where: [equals(el("k", "item"), part(el("d"), {field: "replacedBy"}))]}),
                              ),
                            ],
                            [
                              has(
                                part(_ctx.f["plan"], {field: "optional"}),
                                "k",
                                _element => ({where: [equals(el("k", "item"), part(el("d"), {field: "replacedBy"}))]}),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ],
                  }),
                ),
                each(
                  part(_ctx.f["plan"], {field: "required"}),
                  "q",
                  _element => ({
                    guards: [
                      anyOf(
                        [
                          has(
                            _ctx.f["selected"],
                            "s",
                            _element => ({where: [equals(part(el("s", "accepted"), "scope"), el("q", "child"))]}),
                          ),
                        ],
                        [
                          has(
                            _ctx.f["decisions"],
                            "d",
                            _element => ({
                              where: [
                                equals(part(el("d"), {field: "concern"}), el("q", "item")),
                                equals(part(el("d"), {field: "kind"}), constant("excluded")),
                              ],
                            }),
                          ),
                        ],
                        [
                          has(
                            _ctx.f["decisions"],
                            "d",
                            _element => ({
                              where: [
                                equals(part(el("d"), {field: "concern"}), el("q", "item")),
                                equals(part(el("d"), {field: "kind"}), constant("replaced")),
                              ],
                              guards: [
                                anyOf(
                                  [
                                    has(
                                      part(_ctx.f["plan"], {field: "required"}),
                                      "k",
                                      _element => ({
                                        where: [equals(el("k", "item"), part(el("d"), {field: "replacedBy"}))],
                                        guards: [
                                          has(
                                            _ctx.f["selected"],
                                            "s",
                                            _element => ({where: [equals(part(el("s", "accepted"), "scope"), el("k", "child"))]}),
                                          ),
                                        ],
                                      }),
                                    ),
                                  ],
                                  [
                                    has(
                                      part(_ctx.f["plan"], {field: "optional"}),
                                      "k",
                                      _element => ({
                                        where: [equals(el("k", "item"), part(el("d"), {field: "replacedBy"}))],
                                        guards: [
                                          has(
                                            _ctx.f["selected"],
                                            "s",
                                            _element => ({where: [equals(part(el("s", "accepted"), "scope"), el("k", "child"))]}),
                                          ),
                                        ],
                                      }),
                                    ),
                                  ],
                                ),
                              ],
                            }),
                          ),
                        ],
                      ),
                    ],
                  }),
                ),
              ],
            ),
            r["not-complete"],
          ),
          permit(
            "git-read",
            "ancestry",
            {
              commit: _ctx.f["integration"],
              earlier: slotsOf(range(manifestItem, ["current", "superseded"]), "integration"),
              pin: _ctx.p["pin"],
              row: constant("manifest"),
              selected: eachOf(_ctx.f["selected"], "s", _element => part(el("s", "report"), {opened: "commit"})),
            },
          ),
        ],
        effects: [
          _ctx.on.party("integrator", signer),
          _ctx.on.attribute("authors", _ctx.also["commitment"], [
            authorsIn(_ctx.f["selected"], "s", _element => part(el("s", "report"), {opened: "authors"})),
            _ctx.also["previous"].authors("authors"),
            authorsFrom(part(_ctx.p["pin"], {carried: "check.attribution"})),
          ]),
          _ctx.on.ref("goal", _ctx.f["goal"]),
          _ctx.on.ref("plan", _ctx.f["plan"]),
          _ctx.on.ref("staging", _ctx.f["lane"]),
          _ctx.on.ref("under", _ctx.also["commitment"].id),
          _ctx.on.ref("pin", part(_ctx.p["pin"], "ref")),
          _ctx.on.value("base", _ctx.f["base"]),
          _ctx.on.value("integration", _ctx.f["integration"]),
          _ctx.on.value("tree", _ctx.f["tree"]),
          _ctx.on.value("selected", _ctx.f["selected"]),
          _ctx.on.value("decisions", _ctx.f["decisions"]),
          _ctx.on.value("complete", _ctx.f["complete"]),
          _ctx.also["previous"].to("superseded"),
          when(
            invoke("hold", "pin-hold", {commit: _ctx.f["integration"]}),
            {if: [differs(_ctx.f["hold"], nothing)]},
          ),
          when(
            invoke("hold", "pin-release", {commit: _ctx.also["previous"].slot("integration")}),
            {if: [_ctx.also["previous"].unset("staging")]},
          ),
        ],
        sends: [
          tell(
            {
              fields: {commit: _ctx.f["integration"]},
              if: [differs(_ctx.f["lane"], nothing)],
              message: "pin-confirm",
              result: {},
              to: _ctx.on.slot("staging"),
            },
          ),
          tell(
            {
              fields: {
                because: constant("superseded"),
                commit: _ctx.also["previous"].slot("integration"),
                manifest: _ctx.also["previous"].id,
              },
              if: [_ctx.also["previous"].set("staging")],
              message: "unpin",
              result: {},
              to: _ctx.also["previous"].slot("staging"),
            },
          ),
        ],
      }),
    ),
    "ready-any": transition(
      proposalItem,
      g["change.edit-any"],
      {},
      _ctx => ({
        guards: [_ctx.on.in("draft")],
        effects: [_ctx.on.to("open")],
        sends: [index({draft: constant(false)})],
      }),
    ),
    "ready-own": transition(
      proposalItem,
      g["change.edit-own"],
      {},
      _ctx => ({
        guards: [_ctx.on.in("draft"), _ctx.on.signer("author")],
        effects: [_ctx.on.to("open")],
        sends: [index({draft: constant(false)})],
      }),
    ),
    "reopen-any": transition(
      proposalItem,
      g["change.edit-any"],
      {},
      _ctx => ({
        guards: [_ctx.on.in("closed")],
        effects: [_ctx.on.to("open")],
        sends: [index({draft: constant(false), state: constant("open")})],
      }),
    ),
    "reopen-own": transition(
      proposalItem,
      g["change.edit-own"],
      {},
      _ctx => ({
        guards: [_ctx.on.in("closed"), _ctx.on.signer("author")],
        effects: [_ctx.on.to("open")],
        sends: [index({draft: constant(false), state: constant("open")})],
      }),
    ),
    "reopen-thread-any": transition(
      threadItem,
      g["change.edit-any"],
      {also: {proposal: one(proposalItem)}},
      _ctx => ({guards: [_ctx.on.in("resolved")], effects: [_ctx.on.to("open")]}),
    ),
    "reopen-thread-own": transition(
      threadItem,
      g["change.edit-own"],
      {also: {proposal: one(proposalItem)}},
      _ctx => ({
        guards: [_ctx.on.in("resolved"), _ctx.also["proposal"].signer("author")],
        effects: [_ctx.on.to("open")],
      }),
    ),
    "request-check": open(
      jobItem,
      g["change.propose"],
      {
        also: {
          earlier: by(jobItem, "earlier"),
          manifest: by(manifestItem, "manifest"),
          proposal: one(proposalItem),
          rules: one(rulesItem),
        },
        fields: {
          configuration: required(digest),
          earlier: optional(itemOf("job")),
          manifest: required(itemOf("manifest")),
          name: required(text(128)),
        },
      },
      _ctx => ({
        guards: [
          _ctx.also["manifest"].in("current"),
          require(none(range(mergeItem, ["intended", "committed", "unknown"])), r["merge-in-progress"]),
          _ctx.also["earlier"].equals(_ctx.also["earlier"].slot("manifest"), _ctx.also["manifest"].id),
          _ctx.also["earlier"].equals(_ctx.also["earlier"].slot("name"), _ctx.f["name"]),
          _ctx.also["earlier"].in("requested", "passed", "failed", "errored", "timed-out"),
          require(
            none(
              range(
                jobItem,
                ["requested", "passed", "failed", "errored", "timed-out"],
                {
                  where: _item => [
                    equals(_item.slot("manifest"), _ctx.also["manifest"].id),
                    equals(_item.slot("name"), _ctx.f["name"]),
                  ],
                  except: ["also.earlier"],
                },
              ),
            ),
            r["job-exists"],
          ),
          require(
            has(
              _ctx.also["rules"].slot("checks"),
              "k",
              _element => ({
                where: [
                  equals(el("k", "name"), _ctx.f["name"]),
                  equals(el("k", "configuration"), _ctx.f["configuration"]),
                ],
              }),
            ),
            r["not-a-check-of-the-rules"],
          ),
        ],
        effects: [
          _ctx.on.party("asker", signer),
          _ctx.on.ref("manifest", _ctx.also["manifest"].id),
          _ctx.on.value("name", _ctx.f["name"]),
          _ctx.on.value("tree", _ctx.also["manifest"].slot("tree")),
          _ctx.on.value("configuration", _ctx.f["configuration"]),
          _ctx.on.value("deadline", plusSeconds(1800)),
          _ctx.on.party("informed", [_ctx.also["proposal"].slot("author"), _ctx.also["manifest"].slot("integrator")]),
          _ctx.also["earlier"].to("superseded"),
        ],
      }),
    ),
    "request-review-any": open(
      review_requestItem,
      g["change.edit-any"],
      {also: {proposal: one(proposalItem)}, fields: {requested: required(member)}},
      _ctx => ({
        guards: [_ctx.also["proposal"].in("draft", "open")],
        effects: [_ctx.on.party("requested", _ctx.f["requested"]), _ctx.on.party("requester", signer)],
        attention: [_ctx.on.notify("requested", "after", "review-requested")],
      }),
    ),
    "request-review-own": open(
      review_requestItem,
      g["change.edit-own"],
      {also: {proposal: one(proposalItem)}, fields: {requested: required(member)}},
      _ctx => ({
        guards: [_ctx.also["proposal"].in("draft", "open"), _ctx.also["proposal"].signer("author")],
        effects: [_ctx.on.party("requested", _ctx.f["requested"]), _ctx.on.party("requester", signer)],
        attention: [_ctx.on.notify("requested", "after", "review-requested")],
      }),
    ),
    "resolve-thread-any": transition(
      threadItem,
      g["change.edit-any"],
      {also: {proposal: one(proposalItem)}},
      _ctx => ({guards: [_ctx.on.in("open")], effects: [_ctx.on.to("resolved")]}),
    ),
    "resolve-thread-own": transition(
      threadItem,
      g["change.edit-own"],
      {also: {proposal: one(proposalItem)}},
      _ctx => ({
        guards: [_ctx.on.in("open"), _ctx.also["proposal"].signer("author")],
        effects: [_ctx.on.to("resolved")],
      }),
    ),
    "review-verdict": open(
      reviewItem,
      g["change.review"],
      {
        also: {
          earlier: by(reviewItem, "earlier"),
          manifest: by(manifestItem, "manifest"),
          proposal: one(proposalItem),
          request: by(review_requestItem, "request"),
        },
        fields: {
          body: optional(detached(65536)),
          earlier: optional(itemOf("review")),
          extent: optional(text(64)),
          manifest: required(itemOf("manifest")),
          request: optional(itemOf("review-request")),
          verdict: required(enumOf("approve", "request-changes")),
        },
      },
      _ctx => ({
        guards: [
          _ctx.also["manifest"].in("current"),
          require(none(range(mergeItem, ["intended", "committed", "unknown"])), r["merge-in-progress"]),
          require(_ctx.also["manifest"].notSigner("authors"), r["author-cannot-review"]),
          _ctx.also["earlier"].signer("reviewer"),
          _ctx.also["earlier"].equals(_ctx.also["earlier"].slot("manifest"), _ctx.also["manifest"].id),
          _ctx.also["earlier"].in("submitted"),
          _ctx.also["request"].signer("requested"),
          _ctx.also["request"].in("open"),
          require(
            none(
              range(
                reviewItem,
                ["submitted"],
                {
                  where: _item => [
                    equals(_item.slot("manifest"), _ctx.also["manifest"].id),
                    equals(_item.slot("reviewer"), signer),
                  ],
                  except: ["also.earlier"],
                },
              ),
            ),
            r["verdict-exists"],
          ),
        ],
        effects: [
          _ctx.on.party("reviewer", signer),
          _ctx.on.ref("manifest", _ctx.also["manifest"].id),
          _ctx.on.value("verdict", _ctx.f["verdict"]),
          _ctx.on.value("extent", _ctx.f["extent"]),
          _ctx.on.value("body", _ctx.f["body"]),
          _ctx.also["earlier"].to("superseded"),
          _ctx.also["request"].to("met"),
        ],
        attention: [_ctx.also["proposal"].notify("author", "after", "reviewed")],
      }),
    ),
    "take-hold": open(
      holdItem,
      g["change.work"],
      {
        also: {commitment: by(commitmentItem, "commitment"), proposal: one(proposalItem)},
        fields: {commitment: required(itemOf("commitment")), extent: optional(text(1024))},
      },
      _ctx => ({
        guards: [
          _ctx.also["proposal"].in("draft", "open"),
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
    ),
    "to-draft-any": transition(
      proposalItem,
      g["change.edit-any"],
      {},
      _ctx => ({
        guards: [
          _ctx.on.in("open"),
          require(none(range(mergeItem, ["intended", "committed", "unknown"])), r["merge-in-progress"]),
        ],
        effects: [_ctx.on.to("draft")],
        sends: [index({draft: constant(true)})],
      }),
    ),
    "to-draft-own": transition(
      proposalItem,
      g["change.edit-own"],
      {},
      _ctx => ({
        guards: [
          _ctx.on.in("open"),
          require(none(range(mergeItem, ["intended", "committed", "unknown"])), r["merge-in-progress"]),
          _ctx.on.signer("author"),
        ],
        effects: [_ctx.on.to("draft")],
        sends: [index({draft: constant(true)})],
      }),
    ),
    "unlink-any": transition(
      linkItem,
      g["change.edit-any"],
      {also: {proposal: one(proposalItem)}},
      _ctx => ({
        guards: [
          _ctx.on.in("set"),
          require(none(range(mergeItem, ["intended", "committed", "unknown"])), r["merge-in-progress"]),
          _ctx.also["proposal"].in("draft", "open", "closed"),
        ],
        effects: [_ctx.on.to("removed")],
        sends: [
          relate(
            {
              detail: {},
              item: _ctx.on.id,
              name: "closes",
              result: {},
              state: "removed",
              to: _ctx.on.slot("issue"),
            },
          ),
        ],
      }),
    ),
    "unlink-own": transition(
      linkItem,
      g["change.edit-own"],
      {also: {proposal: one(proposalItem)}},
      _ctx => ({
        guards: [
          _ctx.on.in("set"),
          require(none(range(mergeItem, ["intended", "committed", "unknown"])), r["merge-in-progress"]),
          _ctx.also["proposal"].in("draft", "open", "closed"),
          _ctx.also["proposal"].signer("author"),
        ],
        effects: [_ctx.on.to("removed")],
        sends: [
          relate(
            {
              detail: {},
              item: _ctx.on.id,
              name: "closes",
              result: {},
              state: "removed",
              to: _ctx.on.slot("issue"),
            },
          ),
        ],
      }),
    ),
    "withdraw-review": transition(
      reviewItem,
      g["change.review"],
      {},
      _ctx => ({
        guards: [
          _ctx.on.in("submitted"),
          _ctx.on.signer("reviewer"),
          require(none(range(mergeItem, ["intended", "committed", "unknown"])), r["merge-in-progress"]),
        ],
        effects: [_ctx.on.to("withdrawn")],
      }),
    ),
    "withdraw-review-request-any": transition(
      review_requestItem,
      g["change.edit-any"],
      {also: {proposal: one(proposalItem)}},
      _ctx => ({guards: [_ctx.on.in("open")], effects: [_ctx.on.to("withdrawn")]}),
    ),
    "withdraw-review-request-own": transition(
      review_requestItem,
      g["change.edit-own"],
      {also: {proposal: one(proposalItem)}},
      _ctx => ({guards: [_ctx.on.in("open"), _ctx.on.signer("requester")], effects: [_ctx.on.to("withdrawn")]}),
    ),
    },
    receives: {
    ...shared.receives,
    publication: receive(
      {
        message: "publication",
        class: "relate",
        from: {kind: "destination", under: "platform:destination"},
        fields: {
          commit: optional(commit),
          operation: required(fact("change", "merge")),
          outcome: required(enumOf("committed", "unknown", "published", "refused", "aborted")),
          reason: optional(text(1024)),
          rules: optional(int(0, 1000000000)),
        },
        also: {
          manifest: via(manifestItem, "also.merge", "manifest"),
          merge: by(mergeItem, "operation"),
          proposal: one(proposalItem),
        },
        copies: 16,
      },
      _ctx => ({
        guards: [
          require(equals(sender, _ctx.also["proposal"].slot("destination")), r["not-the-destination"]),
          _ctx.also["merge"].in("intended", "committed", "unknown"),
        ],
        effects: [
          when(_ctx.also["merge"].to("committed"), {if: [equals(_ctx.f["outcome"], constant("committed"))]}),
          when(_ctx.also["merge"].to("unknown"), {if: [equals(_ctx.f["outcome"], constant("unknown"))]}),
          when(_ctx.also["merge"].to("published"), {if: [equals(_ctx.f["outcome"], constant("published"))]}),
          when(_ctx.also["merge"].to("refused"), {if: [equals(_ctx.f["outcome"], constant("refused"))]}),
          when(_ctx.also["merge"].to("aborted"), {if: [equals(_ctx.f["outcome"], constant("aborted"))]}),
          _ctx.also["merge"].value("commit", _ctx.f["commit"]),
          _ctx.also["merge"].value("reason", _ctx.f["reason"]),
          when(
            _ctx.also["proposal"].to("merged"),
            {
              if: [
                equals(_ctx.f["outcome"], constant("published")),
                _ctx.also["proposal"].in("draft", "open", "closed"),
              ],
            },
          ),
          when(
            invoke("hold", "pin-release", {commit: _ctx.also["manifest"].slot("integration")}),
            {
              if: [equals(_ctx.f["outcome"], constant("published")), _ctx.also["manifest"].unset("staging")],
            },
          ),
        ],
        sends: [
          relate(
            {
              detail: {commit: _ctx.f["commit"], plan: _ctx.also["manifest"].slot("plan")},
              each: range(linkItem, ["set"]),
              if: [equals(_ctx.f["outcome"], constant("published"))],
              item: eachItem,
              name: "closes",
              result: {},
              state: "merged",
              to: eachSlot("issue"),
            },
          ),
          tell(
            {
              fields: {
                because: constant("published"),
                commit: _ctx.also["manifest"].slot("integration"),
                manifest: _ctx.also["manifest"].id,
                merge: _ctx.also["merge"].id,
              },
              if: [equals(_ctx.f["outcome"], constant("published")), _ctx.also["manifest"].set("staging")],
              message: "unpin",
              result: {},
              to: _ctx.also["manifest"].slot("staging"),
            },
          ),
          index({merge: _ctx.f["outcome"]}),
        ],
        settles: _ctx.also["merge"].settles("intended", "committed", "unknown"),
      }),
    ),
    rules: receive(
      {
        message: "rules",
        class: "relate",
        from: {kind: "rules", under: "platform:rules"},
        fields: {
          approvals: required(int(0, 64)),
          checks: optional(
            list(
              record(
                {
                  checker: required(member),
                  configuration: required(digest),
                  name: required(text(128)),
                  required: required(bool),
                },
              ),
              32,
            ),
          ),
          extents: optional(
            list(
              record(
                {
                  approvals: required(int(0, 64)),
                  approver: required(text(64)),
                  checks: required(list(text(128), 32)),
                  class: required(enumOf("content", "deployment", "authority")),
                  name: required(text(64)),
                },
              ),
              8,
            ),
          ),
          labels: optional(list(text(64), 32)),
          ownerMayReview: required(bool),
          singleControllerException: optional(bool),
        },
        opens: rulesItem,
        also: {proposal: one(proposalItem)},
        copies: 1,
      },
      _ctx => ({
        guards: [require(equals(sender, _ctx.also["proposal"].slot("rulesScope")), r["not-the-rules-scope"])],
        effects: [
          _ctx.on.value("approvals", _ctx.f["approvals"]),
          _ctx.on.value("checks", _ctx.f["checks"]),
          _ctx.on.value("ownerMayReview", _ctx.f["ownerMayReview"]),
          _ctx.on.value("extents", _ctx.f["extents"]),
          _ctx.on.value("revision", update("revision")),
          _ctx.on.ref("source", source("ref")),
        ],
      }),
    ),
    },
    timed: {
    ...shared.timed,
    "job-deadline": timed(
      jobItem,
      {
        states: ["requested"],
        deadline: "deadline",
        effects: _on => [_on.to("timed-out"), _on.ref("decidedBy", self)],
        attention: _on => [_on.notify("informed", "after", "check-timed-out")],
      },
    ),
    },
    capabilities: [{"name": "hold", "version": 1}, {"name": "git-read", "version": 1}],
  },
);
export type ChangeDefinition = DefinitionData<typeof changeSource>;
