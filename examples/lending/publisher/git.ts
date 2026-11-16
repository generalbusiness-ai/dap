/** Local bare Git only. The owner's own Git carries this branch to a remote. */
import { lstat, mkdir, realpath } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import { Git, GitProgram, Reader, branchRef, repositorySource, snapshotFiles, type ObjectId, type SnapshotFile } from "@generalbusiness/dap-git";
import { nodeExec } from "@generalbusiness/dap-git/node";
import type { BuiltPublication } from "./fold.ts";

export interface PublicationGit {
  head(): Promise<ObjectId | null>;
  files(base: ObjectId | null): Promise<readonly SnapshotFile[]>;
  commit(id: ObjectId): Promise<Uint8Array>;
  compare(base: ObjectId | null, publication: BuiltPublication): Promise<void>;
}

/** Every Git command uses the library's closed environment and disabled hooks. */
export class LocalGit implements PublicationGit {
  readonly #program = new GitProgram({ exec: nodeExec, transport: "local" });
  readonly #git: Git;
  readonly #ref: string;

  private constructor(readonly repository: string, work: string, branch: string) {
    this.#git = new Git(this.#program, { workdir: work });
    this.#ref = branchRef(branch.startsWith("refs/heads/") ? branch : `refs/heads/${branch}`, "publisher branch");
  }

  static async open(repository: string, work: string, branch = "main"): Promise<LocalGit> {
    if (![repository, work].every(path => isAbsolute(path) && resolve(path) === path && !/[\x00-\x1f\x7f]/.test(path))) throw new Error("Supply absolute local repository and work paths.");
    const info = await lstat(repository);
    if (!info.isDirectory() || info.isSymbolicLink() || await realpath(repository) !== repository) throw new Error("The repository must be a canonical local directory.");
    await mkdir(work, { recursive: true, mode: 0o700 });
    const owned = await lstat(work);
    if (!owned.isDirectory() || owned.isSymbolicLink() || await realpath(work) !== work || repository === work) throw new Error("Use a separate canonical work directory.");
    const local = new LocalGit(repository, work, branch);
    if ((await local.#program.ok("bare", ["-C", repository, "rev-parse", "--is-bare-repository"])).trim() !== "true") throw new Error("The Git host must be a local bare repository.");
    return local;
  }

  async #reader(): Promise<Reader> {
    return new Reader(repositorySource(this.#program, await this.#git.repository(this.repository)));
  }

  async head(): Promise<ObjectId | null> {
    const read = await this.#git.readRef(this.repository, this.#ref);
    if (read.value !== null) {
      await this.#git.fetch(this.repository, [this.#ref]);
      await (await this.#reader()).linked(read.value);
    }
    return read.value;
  }

  async files(base: ObjectId | null): Promise<readonly SnapshotFile[]> {
    if (base === null) return [];
    const reader = await this.#reader(), commit = await reader.linked(base);
    return snapshotFiles(reader, commit.tree, () => true);
  }

  async commit(id: ObjectId): Promise<Uint8Array> {
    return (await this.#reader()).object(id, "commit");
  }

  async compare(base: ObjectId | null, publication: BuiltPublication): Promise<void> {
    const directory = await this.#git.repository(this.repository);
    for (const object of publication.objects) {
      const written = (await this.#program.ok("hash-object", ["-C", directory, "hash-object", "-w", "-t", object.type, "--stdin"], object.data)).trim();
      if (written !== object.id) throw new Error("The stored publication object differs.");
    }
    // The caller reads the branch after every answer, including a lost/refused push.
    await this.#git.send({ remote: this.repository, ref: this.#ref, old: base, new: publication.commit,
      expect: { tree: publication.tree, firstParent: base }, have: base === null ? [] : [base] });
  }
}
