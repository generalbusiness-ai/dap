import type { Bounds } from "@generalbusiness/dap-contract";
import type { Profile, ValidateOptions } from "../../src/index.ts";

/** One named positive declaration and the exact context used by its existing caller.
 * Equal bytes do not merge distinct origins, profiles or platform options. */
export interface DefinitionCorpusRow {
  readonly name: string;
  readonly origins: readonly string[];
  readonly declaration: () => unknown | Promise<unknown>;
  readonly bounds: Bounds;
  readonly profiles?: Readonly<Record<string, Profile>>;
  readonly options?: ValidateOptions;
  readonly expectedDigest?: string;
}
