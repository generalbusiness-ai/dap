/** Field bounds stay literal; reference values remain contract data. */
import type { FieldType } from "@generalbusiness/dap-contract";
import { author, party, equals, fact, grants, isFact, item, live, optional, reasons, reference, required, sameSet, text, value } from "../src/index.ts";
import type { GrantRef, NamedAct, ReasonRef, RecordElement, Typed } from "../src/index.ts";
import type { DefinitionData } from "../../../apps/room/lanes/authoring/shared.ts";

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
// Load both real JSON assertion boundaries in this compile-only owner.
import { change as runtimeChange } from "../../../apps/room/lanes/src/change.ts";
import { issue as runtimeIssue } from "../../../apps/room/lanes/src/issue.ts";
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
export const authoredChangeGrant: GrantRef = changeSource.acts.accept.grant;
// @ts-expect-error Materialized JSON has no author-only grant brand.
export const jsonChangeCannotAuthorGrant: GrantRef = jsonChange.acts.accept.grant;
export const runtimeChangeName: "change" = runtimeChange.name;
export const runtimeIssueName: "issue" = runtimeIssue.name;
export const runtimeAskKinds: readonly "ask"[] = runtimeIssue.items.block.refs.on.to.kind;
export const runtimeGrant: string = runtimeChange.acts.accept.grant;
// @ts-expect-error The real JSON wrapper cannot supply authoring vocabulary identity.
export const runtimeCannotAuthorGrant: GrantRef = runtimeChange.acts.accept.grant;
// @ts-expect-error JSON import typing does not establish authored tuple cardinality.
export const jsonAskTuple: readonly ["ask"] = jsonIssue.items.block.refs.on.to.kind;
// @ts-expect-error The materialized array remains readonly.
jsonIssue.items.block.refs.on.to.kind.push("ask");

// Authored acts retain their exact identity. JSON does not claim authoring metadata.
export const authoredChangeAccept: NamedAct<"change", "accept"> = changeSource.acts.accept;
export const authoredIssueAccept: NamedAct<"issue", "accept"> = issueSource.acts.accept;
export const authoredAcceptFact = fact(changeSource.acts.accept);
export const authoredAcceptKind: readonly ["accept"] = authoredAcceptFact.kind;
export const authoredAcceptUnder: "change" = authoredAcceptFact.under;
// @ts-expect-error A JSON act has no authoring NamedAct marker or WeakMap identity.
fact(jsonChange.acts.accept);

type NoSymbols<T extends never> = T;
export type JsonActSymbolKeys = NoSymbols<Extract<keyof ChangeDefinition["acts"]["accept"], symbol>>;
export type JsonTypedSymbolKeys = NoSymbols<Extract<keyof DefinitionData<Typed<{ type: "text" }>>, symbol>>;
export type JsonRecordElementSymbolKeys = NoSymbols<Extract<keyof DefinitionData<RecordElement<"label">>, symbol>>;

declare const authorOnly: unique symbol;
type MarkedTree = { readonly [authorOnly]: "root"; readonly acts: readonly [{ readonly [authorOnly]: "nested"; readonly name: "accept"; readonly grant: GrantRef<"change.promise">; readonly reason: ReasonRef<"not-offeree"> }] };
declare const jsonMarkedTree: DefinitionData<MarkedTree>;
export const jsonNestedName: "accept" = jsonMarkedTree.acts[0]!.name;
export const jsonNestedGrantName: "change.promise" = jsonMarkedTree.acts[0]!.grant;
export const jsonNestedReasonName: "not-offeree" = jsonMarkedTree.acts[0]!.reason;
// @ts-expect-error The JSON view omits root object symbol keys.
jsonMarkedTree[authorOnly];
// @ts-expect-error The JSON view also omits symbol keys inside arrays.
jsonMarkedTree.acts[0]![authorOnly];

// Vocabulary constructors retain brands; materialized data retains exact names only.
const authoredGrants = grants({ promise: "change.promise" });
const authoredReasons = reasons({ offeree: "not-offeree" });
export const retainedGrantBrand: GrantRef<"change.promise"> = authoredGrants.promise;
export const retainedReasonBrand: ReasonRef<"not-offeree"> = authoredReasons.offeree;
// @ts-expect-error A plain name cannot impersonate an authored grant.
export const plainGrantCannotAuthor: GrantRef<"change.promise"> = "change.promise";
// @ts-expect-error A plain refusal name cannot impersonate an authored reason.
export const plainReasonCannotAuthor: ReasonRef<"not-offeree"> = "not-offeree";
declare const jsonGrantData: DefinitionData<typeof authoredGrants.promise>;
declare const jsonReasonData: DefinitionData<typeof authoredReasons.offeree>;
export const jsonGrantLiteral: "change.promise" = jsonGrantData;
export const jsonReasonLiteral: "not-offeree" = jsonReasonData;
// @ts-expect-error JSON grant names do not carry the author-only GRANT brand.
export const jsonGrantCannotAuthor: GrantRef<"change.promise"> = jsonGrantData;
// @ts-expect-error JSON refusal names do not carry the author-only REASON brand.
export const jsonReasonCannotAuthor: ReasonRef<"not-offeree"> = jsonReasonData;
