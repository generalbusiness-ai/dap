/** Pure Git object parsing for retained native proofs. No repository access. */
export { idOf, parseCommit, parseTree } from "./reader.ts";
export type { Commit, TreeEntry, ObjectType } from "./reader.ts";
export { GitRefusal, isObjectId } from "./pure-names.ts";
