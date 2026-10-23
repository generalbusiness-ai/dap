/** Actual installed-bin launch, native scenario/replay and trusted browser
 * compilation. Public TEST actors are not room membership or enrollment. */
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, readdir, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";
import { secretSigner } from "@generalbusiness/dap-client";
import { newCommand } from "../src/application-command.ts";
import { prepareApplicationDirectory } from "../src/application-files.ts";

test("the actual new bin creates a usable local check project without opening custody", async () => {
  const root = await realpath(await mkdtemp(join(tmpdir(), "dap-new-")));
  const bin = fileURLToPath(new URL("../bin/dap.js", import.meta.url));
  const run = (...args: string[]) => spawnSync(process.execPath, [bin, ...args], { cwd: root, encoding: "utf8", env: { ...process.env, DAP_HOME: "", ARTROOM_HOME: "" } });
  try {
    const made = run("new", "notes");
    expect([made.status, made.stderr]).toEqual([0, ""]);
    expect(made.stdout).toContain("public TEST actors");
    expect((await readdir(root)).sort()).toEqual(["notes"]);
    const directory = join(root, "notes"), before = await readdir(directory);
    const checked = run("check", "notes");
    expect([checked.status, checked.stderr]).toEqual([0, ""]);
    expect(checked.stdout).toMatch(/Scenario notes-custody: 5 steps passed; native replay consistent/);
    expect(checked.stdout).toContain("explicit scripted TEST grants");
    expect(await readdir(directory)).toEqual(before);
    const packet = (await prepareApplicationDirectory(directory, secretSigner(new Uint8Array(32).fill(50)))).packet;
    expect(packet.package.semantic.roles).toEqual({ member: ["notes.write"] });
    expect(packet.package.presentation.assets.map(asset => asset.path).sort()).toEqual(["application.css", "application.js", "index.html"]);
    expect(packet.package.semantic.capabilities).toEqual([]);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("new refuses existing directories and symlinks without changing their files", async () => {
  const root = await realpath(await mkdtemp(join(tmpdir(), "dap-new-preserve-")));
  try {
    expect(await newCommand(["new"], root)).toMatchObject({ code: 2 });
    expect(await newCommand(["new", "--out"], root)).toMatchObject({ code: 2 });
    expect(await newCommand(["new", "existing"], root)).toMatchObject({ code: 0 });
    await writeFile(join(root, "existing/marker"), "keep");
    expect(await newCommand(["new", "existing"], root)).toMatchObject({ code: 1, lines: [expect.stringContaining("already exists")] });
    expect(await readFile(join(root, "existing/marker"), "utf8")).toBe("keep");
    await symlink("existing", join(root, "alias"));
    expect(await newCommand(["new", "alias"], root)).toMatchObject({ code: 1 });
    expect(await readFile(join(root, "alias/marker"), "utf8")).toBe("keep");
    expect(await newCommand(["new", "INVALID"], root)).toMatchObject({ code: 1 });
    expect(await readdir(root)).not.toContain("INVALID");
  } finally { await rm(root, { recursive: true, force: true }); }
});
