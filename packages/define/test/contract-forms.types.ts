/** Field bounds stay literal; reference values remain contract data. */
import type { FieldType } from "@generalbusiness/dap-contract";
import { optional, reference, required } from "../src/index.ts";

export const citation = reference(64) satisfies FieldType;
export const exactCitation: { readonly type: "reference"; readonly fragment: 64 } = citation;
export const optionalCitation = optional(citation);
export const requiredCitation = required(citation);

// @ts-expect-error The fragment bound is a byte count, not text.
reference("64");
