/** Field bounds stay literal; reference values remain contract data. */
import type { FieldType } from "@generalbusiness/dap-contract";
import { equals, isFact, item, live, optional, reference, required, sameSet, text, value } from "../src/index.ts";

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
import { issueSource } from "../../../apps/room/lanes/authoring/issue.ts";
import { changeSource } from "../../../apps/room/lanes/authoring/change.ts";
export const issueCommentSubject: "comment" = issueSource.acts["edit-comment-own"].on;
export const issueCommitmentSubject: "commitment" = issueSource.acts.decline.on;
export const changeCommentSubject: "comment" = changeSource.acts["edit-comment-own"].on;
export const changeCommitmentSubject: "commitment" = changeSource.acts.decline.on;
