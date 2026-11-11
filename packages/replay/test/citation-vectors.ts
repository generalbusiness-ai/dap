/** Decode committed independent vectors only. Never produce an expected report here. */
import { readFileSync } from "node:fs";
import type { CitationReport } from "../src/citation.ts";

export interface EncodedVector { readonly encoding: "utf-8" | "base64"; readonly bytes: string }
export interface CitationVector {
  readonly name: string;
  readonly citation: string;
  readonly requested: 0 | 1 | 2 | 3;
  readonly event: EncodedVector | null;
  readonly source: readonly (EncodedVector & { readonly digest: string })[];
  readonly anchors: readonly string[];
  readonly depth: number | null;
  readonly expect: CitationReport;
}
export interface SequenceVector {
  readonly id: string;
  readonly events: readonly (EncodedVector & { readonly position: number; readonly digest: string })[];
}
export function publishedCases(format: string): readonly CitationVector[] {
  return JSON.parse(readFileSync(new URL(`../../../vectors/${format}/cases.json`, import.meta.url), "utf8")) as CitationVector[];
}
export function publishedSequence(format: string): SequenceVector {
  return JSON.parse(readFileSync(new URL(`../../../vectors/${format}/sequence.json`, import.meta.url), "utf8")) as SequenceVector;
}
export function vectorBytes(value: EncodedVector): Uint8Array {
  return new Uint8Array(Buffer.from(value.bytes, value.encoding === "utf-8" ? "utf8" : "base64"));
}
