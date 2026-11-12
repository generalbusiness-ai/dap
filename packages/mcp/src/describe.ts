/** Shared declaration descriptions; retain the existing MCP module exports. */
export {
  type FieldLike, type ActLike, type DefinitionLike, type Who, type Setting, DESCRIPTION_CHARS, grantAction, actSentence, presentedLines, operand, type Sentence, possessive, inline, namesOf, sentenceNamed, type Described, type Bound, besideOf, onOf,
} from "@generalbusiness/dap-client";
import { descriptions } from "./description-context.ts";
export const { typeWords, fieldLines, sentence, guardSentences, describeAct } = descriptions;
export { AT_INPUT, schemaOf, actInputSchema } from "./input-schema.ts";
