/** Real Git clone of exact native export objects. Local repositories and
 * transport are TEST fixtures; this supplies no provider or hosted proof. */
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { confirm, git, put } from "../../../git/test/support/repo.ts";
import type { LocalArchiveClone } from "./local-clone.ts";

const roots: string[] = [];
const id = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{40}$/.test(value);
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);

export function cloneNativeArchive(value: unknown): LocalArchiveClone {
  if (!record(value) || !Array.isArray(value["objects"]) || !Array.isArray(value["refs"]) || value["refs"].length === 0) throw Error("archive clone input");
  const objects = value["objects"].map(raw => {
    if (!record(raw) || !id(raw["id"]) || !["blob", "tree", "commit"].includes(String(raw["type"])) || typeof raw["data"] !== "string" || !/^[A-Za-z0-9_-]*$/.test(raw["data"])) throw Error("archive object");
    const data = Buffer.from(raw["data"], "base64url");
    if (data.toString("base64url") !== raw["data"]) throw Error("archive object encoding");
    return { id: raw["id"], type: raw["type"] as "blob" | "tree" | "commit", data };
  });
  const refs = value["refs"].map(raw => {
    if (!record(raw) || typeof raw["ref"] !== "string" || !/^refs\/artroom\/journal\/sc_[a-z2-7]{52}$/.test(raw["ref"]) || !id(raw["id"])) throw Error("archive ref");
    return { ref: raw["ref"], id: raw["id"] };
  });
  if (new Set(objects.map(row => row.id)).size !== objects.length || new Set(refs.map(row => row.ref)).size !== refs.length) throw Error("duplicate archive object/ref");
  const root = mkdtempSync(join(tmpdir(), "artroom-native-archive-clone-")); roots.push(root);
  const source = join(root, "source.git"), clone = join(root, "clone.git");
  git(root, ["init", "-q", "--bare", source]);
  for (const object of objects) if (put(source, object.type, object.data) !== object.id) throw Error("native object hash differs from independent Node hash");
  if (confirm(source).length) throw Error("Git cannot read an exported object with its original type and size");
  for (const row of refs) git(source, ["update-ref", row.ref, row.id]);
  git(source, ["update-ref", "--no-deref", "HEAD", refs[0]!.id]);
  git(source, ["fsck", "--full", "--strict"]);
  // --no-local uses upload-pack instead of copying or hard-linking loose
  // files. --mirror includes the archive's custom refs, not only branches.
  git(root, ["clone", "--mirror", "--no-local", "--", source, clone]);
  git(clone, ["fsck", "--full", "--strict"]);
  const clonedRefs = git(clone, ["for-each-ref", "--format=%(refname) %(objectname)"]).split("\n").map(line => {
    const [ref, object] = line.split(" "); if (!ref || !id(object)) throw Error("cloned ref"); return { ref, id: object };
  });
  const reachable = git(clone, ["rev-list", "--objects", "--all"]).split("\n").map(line => line.split(" ")[0]!);
  if (reachable.some(object => !id(object))) throw Error("cloned closure");
  // Read binary tree bytes from the clone, never from the input object map.
  const batch = execFileSync("git", ["-C", clone, "cat-file", "--batch"], {
    env: { PATH: process.env["PATH"] ?? "/usr/bin:/bin", GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null" },
    input: reachable.map(object => `${object}\n`).join(""), maxBuffer: 4 * 1024 * 1024, stdio: ["pipe", "pipe", "pipe"],
  });
  let offset = 0;
  const clonedObjects = reachable.map<LocalArchiveClone["objects"][number]>(expected => {
    const end = batch.indexOf(10, offset); if (end < 0) throw Error("cloned object header");
    const [object, type, size] = Buffer.from(batch.subarray(offset, end)).toString("ascii").split(" "), length = Number(size);
    if (object !== expected || (type !== "blob" && type !== "tree" && type !== "commit") || !Number.isSafeInteger(length) || length < 0 || end + length + 1 >= batch.length || batch[end + length + 1] !== 10) throw Error("cloned object body");
    const data = Buffer.from(batch.subarray(end + 1, end + 1 + length)).toString("base64url"); offset = end + length + 2;
    return { id: object, type, data };
  });
  if (offset !== batch.length) throw Error("cloned object suffix");
  return { refs: clonedRefs, objects: clonedObjects, sourceObjects: objects.length, fsckPassed: true, gitVersion: git(clone, ["--version"]) };
}

export function cleanupNativeArchiveClones(): void {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
}
