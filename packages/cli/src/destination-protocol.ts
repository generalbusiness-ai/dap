import { answersVersionQuestion } from "@generalbusiness/dap-platform";

/** Exact CLI support questions preserve their independently reviewed pin sets. */
export const supportsManifestListDestination = (definition: string): boolean => answersVersionQuestion(definition, "cliManifestListDestination");
export const supportsOneFileDestination = (definition: string): boolean => answersVersionQuestion(definition, "cliOneFileDestination");
