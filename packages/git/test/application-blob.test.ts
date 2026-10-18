/** Real local SHA-1 and SHA-256 object stores; no remote transport or provider.
 * Invariant: the immutable walk reads one regular tree path, verifies every
 * object hash and checks the byte limit before requesting a blob payload. */
import { execFileSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { ApplicationGitError, readApplicationGitBlob, type ApplicationGitAddress, type ApplicationGitSource } from "../src/application-blob.ts";

async function fixture(objectFormat: "sha1" | "sha256") {
  const root = await mkdtemp(join(tmpdir(), "dap-application-git-"));
  const env = { ...process.env, GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null", GIT_AUTHOR_NAME: "TEST publisher", GIT_AUTHOR_EMAIL: "test@example.invalid", GIT_COMMITTER_NAME: "TEST publisher", GIT_COMMITTER_EMAIL: "test@example.invalid", GIT_AUTHOR_DATE: "2026-10-18T12:00:00Z", GIT_COMMITTER_DATE: "2026-10-18T12:00:00Z" };
  const git = (args: string[], input?: string) => execFileSync("git", ["-C", root, ...args], { env, ...(input === undefined ? {} : { input }), stdio: ["pipe", "pipe", "pipe"] });
  git(["init", "--bare", "--object-format=" + objectFormat]);
  const payload = "immutable application package fixture\n", blob = git(["hash-object", "-w", "--stdin"], payload).toString().trim();
  const link = git(["hash-object", "-w", "--stdin"], "application.dap.json").toString().trim();
  const nested = git(["mktree", "--missing"], `120000 blob ${link}\talias.json\n100644 blob ${blob}\tapplication.dap.json\n160000 commit ${"0".repeat(objectFormat === "sha1" ? 40 : 64)}\tsubmodule\n`).toString().trim();
  const tree = git(["mktree"], `040000 tree ${nested}\tpackages\n`).toString().trim();
  const commit = git(["commit-tree", tree], "TEST immutable package\n").toString().trim();
  const reads: { id: string; most: number; payload: boolean }[] = [];
  const source: ApplicationGitSource = { object: async (id, most) => {
    let type: string, size: number;
    try { type = git(["cat-file", "-t", id]).toString().trim(); size = Number(git(["cat-file", "-s", id]).toString()); }
    catch { return null; }
    reads.push({ id, most, payload: size <= most });
    return { type, size, data: size > most ? null : new Uint8Array(git(["cat-file", type, id])) };
  } };
  const address: ApplicationGitAddress = { remote: "https://git.example/packages.git", commit, objectFormat, segments: ["packages", "application.dap.json"] };
  return { root, git, address, source, reads, blob, tree, commit, payload, close: () => rm(root, { recursive: true, force: true }) };
}

test("an exact regular application blob reads from both actual Git object formats without following refs or ancestry", async () => {
  for (const format of ["sha1", "sha256"] as const) {
    const f = await fixture(format);
    try {
      expect(new TextDecoder().decode(await readApplicationGitBlob(f.address, f.source))).toBe(f.payload);
      expect(f.reads).toHaveLength(4); expect(f.reads[0]!.id).toBe(f.commit); expect(f.reads[3]!.id).toBe(f.blob);
      f.reads.length = 0;
      await expect(readApplicationGitBlob(f.address, f.source, 8)).rejects.toMatchObject({ reason: "too-large" });
      expect(f.reads.at(-1)).toEqual({ id: f.blob, most: 8, payload: false });
      for (const segments of [["packages", "alias.json"], ["packages", "submodule"], ["packages", "alias.json", "more"]]) {
        f.reads.length = 0;
        await expect(readApplicationGitBlob({ ...f.address, segments }, f.source)).rejects.toMatchObject({ reason: "not-regular" });
        expect(f.reads).toHaveLength(3);
      }
      f.reads.length = 0;
      await expect(readApplicationGitBlob({ ...f.address, commit: "f".repeat(f.commit.length) }, f.source)).rejects.toMatchObject({ reason: "absent" });
      expect(f.reads).toEqual([]);
    } finally { await f.close(); }
  }
});

test("type, size and hash failures never become package bytes or a fallback read", async () => {
  const f = await fixture("sha256");
  try {
    for (const [change, reason] of [
      [(value: any) => ({ ...value, type: "tag" }), "wrong-type"],
      [(value: any) => ({ ...value, size: value.size + 1 }), "unreadable"],
      [(value: any) => ({ ...value, data: new Uint8Array(value.data.length) }), "hash-mismatch"],
    ] as const) {
      let calls = 0;
      const corrupt: ApplicationGitSource = { object: async (id, most) => { calls++; return change(await f.source.object(id, most)); } };
      await expect(readApplicationGitBlob(f.address, corrupt)).rejects.toMatchObject({ reason }); expect(calls).toBe(1);
    }
    for (const segments of [["..", "x"], ["packages/alias.json"], [""], ["packages", "."]]) {
      let calls = 0;
      const unopened: ApplicationGitSource = { object: async () => { calls++; return null; } };
      await expect(readApplicationGitBlob({ ...f.address, segments }, unopened)).rejects.toBeInstanceOf(ApplicationGitError); expect(calls).toBe(0);
    }
    await expect(readApplicationGitBlob(f.address, { object: async () => { throw Error("TEST unavailable"); } })).rejects.toMatchObject({ reason: "unreadable" });
  } finally { await f.close(); }
});
