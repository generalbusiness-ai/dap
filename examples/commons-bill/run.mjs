#!/usr/bin/env node
/** Run only after a separately reviewed operator handoff. No default homes. */
import { closeSync, constants, fstatSync, fsyncSync, lstatSync, openSync, readSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { inputOf, runWitness, WitnessRefusal } from "./witness.ts";
import { noLinks } from "./custody.ts";

let output = null, result = { state: "stopped", reason: "invalid-arguments" }, code = 1;
try {
  const args = {};
  for (let i = 2; i < process.argv.length; i += 2) {
    const key = process.argv[i], value = process.argv[i + 1];
    if (!["--input", "--member-home", "--agent-home", "--step", "--mode", "--out"].includes(key) || !value || Object.hasOwn(args, key)) throw Error("arguments");
    args[key] = value;
  }
  if (Object.keys(args).length !== 6 || !["new", "check", "continue"].includes(args["--mode"])) throw Error("arguments");
  const paths = ["--input", "--member-home", "--agent-home", "--out"];
  for (const name of paths) if (!isAbsolute(args[name]) || resolve(args[name]) !== args[name]) throw Error("path");
  const inside = (child, parent) => { const rel = relative(parent, child); return rel === "" || !rel.startsWith("../") && rel !== ".." && !isAbsolute(rel); };
  output = args["--out"];
  if ([args["--member-home"], args["--agent-home"]].some(home => inside(output, home) || inside(args["--input"], home))
    || inside(args["--member-home"], args["--agent-home"]) || inside(args["--agent-home"], args["--member-home"])) throw Error("separation");
  noLinks(args["--input"]); noLinks(dirname(output));
  const parent = lstatSync(dirname(output));
  if (!parent.isDirectory() || parent.uid !== process.getuid() || (parent.mode & 0o777) !== 0o700) throw Error("public-output-parent");
  const fd = openSync(args["--input"], constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  let body;
  try {
    const before = fstatSync(fd);
    if (!before.isFile() || before.nlink !== 1 || before.size > 65536) throw Error("input");
    const bytes = new Uint8Array(65537); let total = 0, count;
    while (total < bytes.length && (count = readSync(fd, bytes, total, bytes.length - total, null)) > 0) total += count;
    const after = fstatSync(fd);
    if (total !== before.size || after.size !== before.size || after.mtimeMs !== before.mtimeMs || after.ctimeMs !== before.ctimeMs) throw Error("input");
    body = new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(0, total));
  } finally { closeSync(fd); }
  // Reserve the single public result before any possible wire operation.
  const resultFd = openSync(output, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
  try {
    result = await runWitness(inputOf(JSON.parse(body)), { member: args["--member-home"], agent: args["--agent-home"] }, args["--step"], args["--mode"]);
    code = ["accepted", "preflight-verified", "23-notes-verified"].includes(result.state) ? 0 : 1;
  } catch (error) { result = { state: "stopped", reason: error instanceof WitnessRefusal ? error.reason : "unavailable" }; }
  finally {
    writeFileSync(resultFd, JSON.stringify({ ...result, exitCode: code }, null, 2) + "\n");
    fsyncSync(resultFd); closeSync(resultFd);
    const dir = openSync(dirname(output), "r"); try { fsyncSync(dir); } finally { closeSync(dir); }
  }
} catch (error) { code = 1; result = { state: "stopped", reason: error instanceof WitnessRefusal ? error.reason : "unavailable" }; }
console.log(JSON.stringify({ state: result.state, exitCode: code }));
process.exitCode = code;
