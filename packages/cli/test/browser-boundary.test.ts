import { expect, test } from "vitest";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import * as browser from "@generalbusiness/dap-cli/browser";
import * as cli from "../src/index.ts";
import { invitationOf } from "@generalbusiness/dap-client";

// Invariant: the page's complete CLI API bundles through the actual package
// subpath for a browser, with no command dispatcher, Node adapters or shims.
test("the browser package boundary retains all eleven page exports without the CLI command graph", async () => {
  const names = ["LINK", "describe", "expectedOf", "heldActs", "linkOf", "valueOf", "claim", "checkClaim", "issueInvitation", "issueOwnAgentInvitation", "isInvitationIssueInput"] as const;
  expect(browser.linkOf).toBe(invitationOf);
  expect(Object.keys(browser).sort()).toEqual([...names].sort());
  for (const name of names) expect(browser[name], `Existing CLI export ${name} keeps its identity`).toBe(cli[name]);

  const root = fileURLToPath(new URL("../", import.meta.url));
  const bundled = await build({
    absWorkingDir: root,
    stdin: { contents: `export { ${names.join(", ")} } from "@generalbusiness/dap-cli/browser";`, resolveDir: root, sourcefile: "page-cli-boundary.ts", loader: "ts" },
    bundle: true, platform: "browser", format: "esm", target: "es2022", write: false, metafile: true, logLevel: "silent",
  });
  const inputs = Object.keys(bundled.metafile.inputs).map(path => resolve(root, path));
  expect(inputs).toContain(resolve(root, "src/browser.ts"));
  expect(inputs).toContain(resolve(root, "../client/src/describe.ts"));
  expect(inputs).toContain(resolve(root, "../client/src/invitation.ts"));
  expect(inputs.some(path => path.includes("/packages/mcp/"))).toBe(false);
  for (const name of ["commands.ts", "line.ts", "main.ts", "files.ts", "source.ts", "scope-index-command.ts", "scope-index-applications-command.ts"]) {
    expect(inputs, `Runtime input closure must exclude ${name}`).not.toContain(resolve(root, "src", name));
  }
  // esbuild labels its embedded helper as a synthetic <runtime> input edge.
  // Every other external input and every actual output import is forbidden.
  expect(Object.values(bundled.metafile.inputs).flatMap(input => input.imports).filter(item => item.external && item.path !== "<runtime>")).toEqual([]);
  expect(Object.values(bundled.metafile.outputs).flatMap(output => output.imports)).toEqual([]);
  expect(Object.values(bundled.metafile.outputs).flatMap(output => output.exports).sort()).toEqual([...names].sort());
});
