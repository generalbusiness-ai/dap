import { expect, test } from "vitest";
import { parseCitation, parseSequenceIdentifier } from "../src/index.ts";

test("sequence identifiers and citations consume their complete text without normalization", () => {
  for (const [format, genesis] of [["dap1", "a".repeat(64)], ["git", "b".repeat(40)], ["git256", "c".repeat(64)], ["future1", "a.b-c_d"]]) {
    const sequence = `did:seq:${format}:${genesis}`, citation = `${sequence}/0/${genesis}`;
    expect(parseSequenceIdentifier(sequence)).toEqual({ format, genesis });
    expect(parseCitation(citation)).toEqual({ format, genesis, position: 0, event: genesis });
    for (const suffix of ["\n", "\r\n", " ", "?query", "#part"]) {
      expect(parseSequenceIdentifier(sequence + suffix)).toBeNull();
      expect(parseCitation(citation + suffix)).toBeNull();
    }
    expect(parseSequenceIdentifier(" " + sequence)).toBeNull();
    expect(parseCitation(" " + citation)).toBeNull();
  }
});

test("citation positions keep safe canonical decimals and format-specific digest spelling", () => {
  const root = `did:seq:dap1:${"a".repeat(64)}`;
  expect(parseCitation(`${root}/9007199254740991/${"b".repeat(64)}`)?.position).toBe(9007199254740991);
  for (const position of ["00", "01", "-1", "+1", "1.0", "9007199254740992", "1\n"]) expect(parseCitation(`${root}/${position}/${"b".repeat(64)}`)).toBeNull();
  for (const event of ["A".repeat(64), "b".repeat(63), "b".repeat(65), "b".repeat(63) + "_", "%62".repeat(64)]) expect(parseCitation(`${root}/1/${event}`)).toBeNull();
  expect(parseCitation(`${root}/1#${"b".repeat(64)}`)).toBeNull();
});
