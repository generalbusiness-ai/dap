/** Bounded MCP tool descriptions over the neutral Client renderers. */
import { actSentence, presentedLines, inline, namesOf, type ActLike, type Bound, type DefinitionLike, type Sentence, type Setting, type Who } from "@generalbusiness/dap-client";
import { descriptions } from "./description-context.ts";

/** The bound on a tool description, in characters (section 9). */
export const DESCRIPTION_CHARS = 1000;

export interface Described {
  /** The tool description: at most `DESCRIPTION_CHARS` characters. */
  description: string;
  /** The complete text, for `inspect` with `describe`. Never cut. */
  complete: string;
  /** The guards as sentences, for a refusal's sentence. */
  guards: Sentence[];
  /** Positions of the guards the description left out, and their names, when any were left out. */
  omitted: { from: number; to: number; of: number; names: string[] } | null;
}

/** One sentence and what it nests, indented, one line each. */
function indented(s: Sentence, depth: number): string[] {
  const pad = "  ".repeat(depth);
  const own = [`${pad}- ${s.text}${s.tail ?? ""}`];
  if (s.nested) for (const n of s.nested) own.push(...indented(n, depth + 1));
  if (s.group) s.group.forEach((alt, i) => { own.push(`${pad}  alternative ${i + 1}:`); for (const n of alt) own.push(...indented(n, depth + 2)); });
  return own;
}


const { fieldLines, guardSentences } = descriptions;

export function describeAct(definition: DefinitionLike, kind: string, act: ActLike, who: Who, setting: Setting, binding: Bound, pointer: string): Described {
  const head = actSentence(kind, act, who);
  const fields = fieldLines(act, setting);
  const presented = presentedLines(act);
  const list = guardSentences(definition, act, setting);
  const complete = [
    `${head}.`,
    "Fields:", ...(fields.length > 0 ? fields.map((f) => `  - ${f}`) : ["  none"]),
    ...(presented.length > 0 ? ["Presented:", ...presented.map((p) => `  - ${p}`)] : []),
    "Guards:", ...(list.length > 0 ? list.flatMap((s) => indented(s, 1)) : ["  none"]),
    `Binding: definition ${binding.definition}, kind ${binding.kind}, declaration ${binding.declaration}; serves ${binding.digests.join(", ")}.`,
  ].join("\n");

  const fieldPart = `Fields: ${fields.length > 0 ? fields.map((f) => `${f}.`).join(" ") : "none."}`;
  const presentPart = presented.length > 0 ? ` Presented: ${presented.map((p) => `${p}.`).join(" ")}` : "";
  const sentences = list.map(inline);
  const whole = `${head}. ${fieldPart}${presentPart} ${sentences.length > 0 ? `Guards: ${sentences.join("; ")}.` : "No guards."}`;
  if (whole.length <= DESCRIPTION_CHARS) return { description: whole, complete, guards: list, omitted: null };

  // Too long: keep the sentence and the fields, then as many whole guards as fit, then one pointer to the complete text.
  const pointerOf = (from: number): string => {
    const names = [...new Set(namesOf(list.slice(from - 1)))];
    const range = `Guards ${from} to ${list.length} of ${list.length} are left out`;
    const withNames = `${range} (named: ${names.join(", ")}); see ${pointer}.`;
    return names.length > 0 && withNames.length <= 400 ? withNames : `${range}; see ${pointer}.`;
  };
  const textOf = (base: string, kept: number): string => `${base}${kept > 0 ? ` Guards: ${sentences.slice(0, kept).join("; ")}.` : ""} ${pointerOf(kept + 1)}`;
  let base = `${head}. ${fieldPart}${presentPart}`;
  if (textOf(base, 0).length > DESCRIPTION_CHARS) base = `${head}. Fields: in the input schema.${presented.length > 0 ? " Presented facts: in the input schema." : ""}`;
  let kept = 0;
  while (kept + 1 < sentences.length && textOf(base, kept + 1).length <= DESCRIPTION_CHARS) kept++;
  const description = textOf(base, kept);
  return { description, complete, guards: list, omitted: { from: kept + 1, to: list.length, of: list.length, names: [...new Set(namesOf(list.slice(kept)))] } };
}
