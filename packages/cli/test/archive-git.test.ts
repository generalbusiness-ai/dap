/** Process-boundary control. The child is deliberately not Git: it checks
 * the supplied environment and tries to print a public TEST credential. */
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test, vi } from "vitest";
import { nodeGit } from "../src/git.ts";

test("archive Git strips ambient startup, tracing and helper config, accepts only fixed commands and withholds raw child output", async () => {
  const root = await mkdtemp(join(tmpdir(), "artroom-archive-runner-"));
  const program = join(root, "controlled-git");
  const injected = ["GIT_TRACE2_EVENT", "GIT_CONFIG_GLOBAL", "GIT_CONFIG_SYSTEM", "GIT_CONFIG_PARAMETERS", "GIT_ASKPASS", "NODE_OPTIONS", "DYLD_INSERT_LIBRARIES", "HTTPS_PROXY"];
  const previous = Object.fromEntries(injected.map(key => [key, process.env[key]]));
  const marker = "PUBLIC-TEST-ARCHIVE-TOKEN-DO-NOT-FORWARD";
  const environment = { GIT_CONFIG_COUNT: "1", GIT_CONFIG_KEY_0: "http.extraHeader", GIT_CONFIG_VALUE_0: `Authorization: Bearer ${marker}` };
  await writeFile(program, `#!${process.execPath}\nconst bad=Object.keys(process.env).some(k=>k.startsWith('GIT_TRACE')||['NODE_OPTIONS','DYLD_INSERT_LIBRARIES','HTTPS_PROXY','GIT_CONFIG_PARAMETERS'].includes(k));\nif(bad||process.env.GIT_CONFIG_GLOBAL!='/dev/null'||process.env.GIT_CONFIG_SYSTEM!='/dev/null'||process.argv.some(a=>a.includes('Authorization:')))process.exit(9);\nconst c=Object.fromEntries(Array.from({length:Number(process.env.GIT_CONFIG_COUNT)},(_,i)=>[process.env['GIT_CONFIG_KEY_'+i],process.env['GIT_CONFIG_VALUE_'+i]]));\nif(c['credential.helper']!==''||c['core.hooksPath']!='/dev/null'||c['core.fsmonitor']!=='false'||c['http.followRedirects']!=='false')process.exit(10);\nprocess.stdout.write(c['http.extraHeader']);process.stderr.write(c['http.extraHeader']);\n`, { mode: 0o755 });
  const out = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  const err = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  try {
    for (const key of injected) process.env[key] = join(root, "forbidden-ambient-value");
    const git = nodeGit(program, root);
    expect(await git.archiveRun!(["clone", "--", "https://host.invalid/room.git", "copy"], environment)).toBe(0);
    expect(await git.archiveRun!(["-C", "copy", "fetch", "--no-tags", "--", "origin", "+refs/artroom/journal/*:refs/artroom/journal/*"], environment)).toBe(0);
    // Lowercase percent escapes are canonical URL text too. This is the
    // one encoded-path control; no process may start with its credential.
    expect(await git.archiveRun!(["clone", "--", "https://host.invalid/a%2fb.git", "copy"], { ...environment, GIT_CONFIG_VALUE_0: "Authorization: Bearer a/b" })).toBe(1);
    // Resolution must not introduce the credential from a trusted cwd.
    const expanded = nodeGit(program, join(root, marker));
    expect(await expanded.archiveRun!(["clone", "--", "https://host.invalid/room.git", "copy"], environment)).toBe(1);
    expect(await git.archiveRun!(["config", "--global", "credential.helper", "bad"], environment)).toBe(1);
    expect(await git.archiveRun!(["clone", "--", "http://host.invalid/room.git", "copy"], environment)).toBe(1);
    expect([...out.mock.calls, ...err.mock.calls].some(args => args.some(value => String(value).includes(marker)))).toBe(false);
  } finally {
    out.mockRestore(); err.mockRestore();
    for (const key of injected) { const value = previous[key]; if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    await rm(root, { recursive: true, force: true });
  }
});
