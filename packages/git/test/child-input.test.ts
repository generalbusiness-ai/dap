import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { childInput } from "./support/child-input.ts";

// Real child/pipe boundary: a child that accepts no input must not leave an
// unhandled EPIPE or report success; rejection must wait for its final work.
test("fixture input failure is owned until the real child closes", async () => {
  const dir = await mkdtemp(join(tmpdir(), "artroom-child-input-"));
  const receipt = join(dir, "closed-input");
  try {
    const source = 'const fs=require("node:fs");fs.closeSync(0);setImmediate(()=>fs.writeFileSync(process.argv[1],"finished"));';
    await expect(childInput(process.execPath, ["-e", source, receipt], { encoding: "buffer" }, new Uint8Array(8 * 1024 * 1024))).rejects.toMatchObject({ code: "EPIPE" });
    expect(await readFile(receipt, "utf8")).toBe("finished");
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("fixture input preserves exact bytes and a real child failure", async () => {
  const input = new Uint8Array([0, 255, 10, 128]);
  const echo = 'process.stdin.pipe(process.stdout);';
  expect(await childInput(process.execPath, ["-e", echo], { encoding: "buffer" }, input)).toEqual(Buffer.from(input));
  const fail = 'process.stdin.resume();process.stdin.on("end",()=>{process.exitCode=7;});';
  await expect(childInput(process.execPath, ["-e", fail], { encoding: "buffer" }, input)).rejects.toMatchObject({ code: 7 });
});
