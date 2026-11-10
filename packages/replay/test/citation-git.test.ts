import { expect, test } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { citationGitHash, citationGitSource } from "../src/git.ts";
import { verifyCitation } from "../src/citation.ts";
import { publishedCases, publishedSequence, vectorBytes } from "./citation-vectors.ts";

test("raw stored Git first parents ignore replacements and grafts and a shallow end never becomes an anchor", async () => {
  // Real Git objects and raw bytes; the vector producer supplied every digest
  // and expected report. Retain these fixed TEST clones in the gate's TMPDIR.
  for (const [format, objectFormat] of [["git", "sha1"], ["git256", "sha256"]] as const) {
    const sequence = publishedSequence(format), vectors = publishedCases(format);
    const directory = mkdtempSync(join(tmpdir(), "artroom-citation-git-"));
    const run = (at: string, args: readonly string[], input?: Uint8Array): string => execFileSync("/usr/bin/git", ["--no-pager", "-c", "protocol.allow=never", ...args], {
      cwd: at, input, encoding: "utf8", env: { PATH: "/usr/bin:/bin", HOME: "/nonexistent", LC_ALL: "C", GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null", GIT_NO_REPLACE_OBJECTS: "1", GIT_NO_LAZY_FETCH: "1", GIT_TERMINAL_PROMPT: "0" }, timeout: 10_000, maxBuffer: 8 * 1024 * 1024,
    });
    const init = (at: string): void => { run(at, ["init", "--quiet", "--bare", `--object-format=${objectFormat}`]); };
    const put = (at: string, index: number): void => {
      const event = sequence.events[index]!;
      expect(run(at, ["hash-object", "-w", "--literally", "-t", "commit", "--stdin"], vectorBytes(event)).trim()).toBe(event.digest);
    };
    init(directory);
    for (let index = 0; index < sequence.events.length; index++) put(directory, index);
    const first = sequence.events[0]!, last = sequence.events[3]!, middle = sequence.events[2]!;
    run(directory, ["update-ref", `refs/replace/${last.digest}`, first.digest]);
    writeFileSync(join(directory, "info", "grafts"), `${last.digest} ${first.digest}\n`);
    const good = vectors.find(row => row.name === "valid-event-3")!;
    expect(await verifyCitation(good.citation, citationGitSource(directory, { program: "/usr/bin/git" }), { requested: 2, hashGitCommit: bytes => citationGitHash(bytes, { program: "/usr/bin/git" }) })).toEqual(good.expect);

    const shallow = mkdtempSync(join(tmpdir(), "artroom-citation-shallow-"));
    init(shallow); put(shallow, 3); put(shallow, 2);
    writeFileSync(join(shallow, "shallow"), middle.digest + "\n");
    const missing = vectors.find(row => row.name === "held-middle-is-not-anchor")!;
    expect(await verifyCitation(missing.citation, citationGitSource(shallow, { program: "/usr/bin/git" }), { requested: 2, hashGitCommit: bytes => citationGitHash(bytes, { program: "/usr/bin/git" }) })).toEqual(missing.expect);
    const anchored = vectors.find(row => row.name === "explicit-middle-anchor")!;
    expect(await verifyCitation(anchored.citation, citationGitSource(shallow, { program: "/usr/bin/git" }), { requested: 2, anchors: anchored.anchors, hashGitCommit: bytes => citationGitHash(bytes, { program: "/usr/bin/git" }) })).toEqual(anchored.expect);
  }
});
