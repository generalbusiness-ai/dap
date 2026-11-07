/** Observe the real CLI clone, then try the same credential after its recorded expiry. */
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { isScopeId } from "@generalbusiness/dap-bytes";
import { command } from "../../../packages/cli/src/line.ts";
import { fileStore } from "../../../packages/cli/src/files.ts";
import { nodeGit } from "../../../packages/cli/src/git.ts";

if (process.argv[2] === "--help") {
  console.log("token-clone.mjs before|after PRIVATE_DIRECTORY CLONE_DIRECTORY\nBefore uses the explicit fresh scratch-room DAP_HOME. After reuses only the retained test credential. Both execute real Git; before also submits the real CLI clone command.");
} else {
  const [phase, privatePath, clonePath, ...extra] = process.argv.slice(2);
  assert.ok((phase === "before" || phase === "after") && privatePath && clonePath && extra.length === 0, "use --help for arguments");
  const home = process.env.DAP_HOME;
  assert.ok(home && (!process.env.ARTROOM_HOME || resolve(home) === resolve(process.env.ARTROOM_HOME)), "set only the new scratch-room DAP_HOME");
  assert.ok(!Object.entries(process.env).some(([k, v]) => v && (k.startsWith("GIT_TRACE") || k === "GIT_CURL_VERBOSE")), "disable Git trace output before handling a test credential");
  const privateDir = resolve(privatePath), destination = resolve(clonePath), git = nodeGit();
  assert.ok(destination !== privateDir && !destination.startsWith(privateDir + "/"), "keep the clone separate from token custody");
  if (phase === "before") {
    const store = fileStore(home), saved = await store.config();
    assert.ok(saved?.service === "https://dap-demo.inguz.workers.dev" && saved.plan?.definition === "platform:register@26"
      && saved.register?.scope === saved.plan.register && isScopeId(saved.repository?.destination), "use only the new Register26 scratch-room home");
    await mkdir(privateDir, { mode: 0o700 }); // refuse an existing custody directory
    assert.equal((await stat(privateDir)).mode & 0o777, 0o700);
    const calls = [];
    let captured = false;
    const ctx = { store, git: { ...git, archiveRun: async (args, env) => {
      if (!captured) {
        assert.ok(args[0] === "clone" && args[1] === "--" && args[2]?.startsWith("https://6e953d231f1c9aadffbf59537a82e13a.artifacts.cloudflare.net/git/dap-demo/"), "clone only this Worker's scratch repository");
        assert.deepEqual(Object.keys(env).sort(), ["GIT_CONFIG_COUNT", "GIT_CONFIG_KEY_0", "GIT_CONFIG_VALUE_0"]);
        assert.equal(env.GIT_CONFIG_COUNT, "1");
        assert.equal(env.GIT_CONFIG_KEY_0, "http.extraHeader");
        assert.ok(env.GIT_CONFIG_VALUE_0.startsWith("Authorization: Bearer "), "this packet selects Artifacts");
        await writeFile(resolve(privateDir, "credential.json"), JSON.stringify(env) + "\n", { flag: "wx", mode: 0o600 });
        captured = true;
      }
      const startedUtc = new Date().toISOString(), code = await git.archiveRun(args, env);
      calls.push({ args, startedUtc, endedUtc: new Date().toISOString(), exitCode: code });
      return code;
    } } };
    const startedUtc = new Date().toISOString();
    const outcome = await command(ctx, ["clone", destination, "--archive"]);
    const text = outcome.lines.join("\n"), until = /^Read token: (.+), until (.+)\.$/m.exec(text), remote = /^Remote URL: (.+)$/m.exec(text);
    const record = { phase, startedUtc, endedUtc: new Date().toISOString(), actualCliExit: outcome.code, lines: outcome.lines,
      captured, readToken: until?.[1] ?? null, ends: until?.[2] ?? null, remote: remote?.[1] ?? null, calls,
      qualification: "The real clone command and hardened Git runner execute unchanged. Only this TEST credential is deliberately retained at mode0600 for the post-hour comparison; the normal CLI retains none." };
    await writeFile(resolve(privateDir, "before.json"), JSON.stringify(record, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify(record));
    process.exitCode = outcome.code;
  } else {
    const custody = resolve(privateDir, "credential.json"), prior = JSON.parse(await readFile(resolve(privateDir, "before.json"), "utf8"));
    assert.equal((await stat(privateDir)).mode & 0o777, 0o700);
    assert.equal((await stat(custody)).mode & 0o777, 0o600);
    assert.equal(prior.actualCliExit, 0, "the earlier real clone and archive fetch must both succeed");
    assert.ok(prior.captured && prior.calls.length === 2 && prior.calls.every(call => call.exitCode === 0));
    assert.ok(typeof prior.ends === "string" && Number.isFinite(Date.parse(prior.ends)) && Date.now() >= Date.parse(prior.ends) + 2000, "the actual recorded token hour has not ended");
    assert.ok(typeof prior.remote === "string" && prior.remote.startsWith("https://6e953d231f1c9aadffbf59537a82e13a.artifacts.cloudflare.net/git/dap-demo/"));
    const env = JSON.parse(await readFile(custody, "utf8")), startedUtc = new Date().toISOString();
    const code = await git.archiveRun(["clone", "--", prior.remote, destination], env);
    const record = { phase, startedUtc, endedUtc: new Date().toISOString(), tokenEnds: prior.ends, actualGitExit: code,
      issuedNoNewToken: true, qualification: "A fresh real Git clone with the same expired test credential. A nonzero exit needs its retained provider refusal output before acceptance; a transport or local failure proves no expiry refusal." };
    await writeFile(resolve(privateDir, "after.json"), JSON.stringify(record, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify(record));
    process.exitCode = code ?? 1;
  }
}
