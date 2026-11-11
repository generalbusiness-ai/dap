/** Field bounds stay literal; reference values remain contract data. */
import type { FieldType } from "@generalbusiness/dap-contract";
import { author, party, equals, isFact, item, live, optional, reference, required, sameSet, text, value } from "../src/index.ts";

export const citation = reference(64) satisfies FieldType;
export const exactCitation: { readonly type: "reference"; readonly fragment: 64 } = citation;
export const optionalCitation = optional(citation);
export const requiredCitation = required(citation);

// @ts-expect-error The fragment bound is a byte count, not text.
reference("64");

export const matchedFact = isFact({ field: "report" }, [equals({ field: "label" }, "ready")]);
// @ts-expect-error Only a field fact accepts foreign-field comparisons.
isFact({ presented: "report" }, []);
// @ts-expect-error Bound elements cannot carry field-fact comparisons.
isFact({ element: "row" }, []);

const task = item("task", { many: 3, states: { open: live }, values: { label: value.optional(text(20)) } });
export const filteredSet = sameSet({ field: "selected" }, "row", row => row.self, task, ["open"], {
  where: it => {
    // @ts-expect-error Range filters expose only the item's declared slots.
    it.slot("missing");
    return [equals(it.slot("label"), "ready")];
  },
  except: ["on"],
});

// Shared forms retain each caller's literal item identity.
import { issueSource, type IssueDefinition } from "../../../apps/room/lanes/authoring/issue.ts";
import { changeSource, type ChangeDefinition } from "../../../apps/room/lanes/authoring/change.ts";
export const issueCommentSubject: "comment" = issueSource.acts["edit-comment-own"].on;
export const issueCommitmentSubject: "commitment" = issueSource.acts.decline.on;
export const changeCommentSubject: "comment" = changeSource.acts["edit-comment-own"].on;
export const changeCommitmentSubject: "commitment" = changeSource.acts.decline.on;

// A slot modifier overwrites the false flag without collapsing the slot to never.
export const authoredParty = author(party.optional);
export const authorFlag: true = authoredParty.author;
export const authorRequiredFlag: false = authoredParty.required;
export const authorListFlag: false = authoredParty.list;
export const changePerformerAuthor: true = changeSource.items.commitment.parties.performer.author;
export const issuePerformerAuthor: true = issueSource.items.commitment.parties.performer.author;

// Constructor tuples stay exact; materialized JSON promises readonly element values.
export const authoredAskKinds: readonly ["ask"] = issueSource.items.block.refs.on.to.kind;
declare const jsonIssue: IssueDefinition;
declare const jsonChange: ChangeDefinition;
export const jsonIssueName: "issue" = jsonIssue.name;
export const jsonAskKinds: readonly "ask"[] = jsonIssue.items.block.refs.on.to.kind;
export const jsonGrant: string = jsonChange.acts.accept.grant;
// @ts-expect-error JSON import typing does not establish authored tuple cardinality.
export const jsonAskTuple: readonly ["ask"] = jsonIssue.items.block.refs.on.to.kind;
// @ts-expect-error The materialized array remains readonly.
jsonIssue.items.block.refs.on.to.kind.push("ask");
