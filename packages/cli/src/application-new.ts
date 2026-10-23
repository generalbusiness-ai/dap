/** A local source template. Public TEST scenarios are data, not installed
 * membership or publisher credentials. Existing directories are preserved. */
import { mkdir, realpath, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import type { ActType, DeclaredDefinition } from "@generalbusiness/dap-contract";
import { canonicalize } from "@generalbusiness/dap-bytes";

const act = (body: Pick<ActType, "step" | "on" | "grant" | "fields" | "effects"> & Partial<ActType>): ActType =>
  ({ also: {}, guards: [], sends: [], attention: [], ...body });
export function newApplicationDefinition(name: string): DeclaredDefinition {
  const grant = `${name}.write`, fixed = { fixed: true, required: true } as const;
  return { format: "artroom-definition-1", name, profile: { name: "restricted", version: 1 }, capabilities: [], genesis: "establish",
    items: {
      board: { many: false, max: 1, initial: "open", states: { open: { final: false } }, parties: {}, refs: {}, values: { title: { ...fixed, of: { type: "text", max: 80 } } } },
      note: { many: true, max: 32, initial: "open", states: { open: { final: false }, done: { final: true } },
        parties: { writer: { ...fixed, list: false, author: true } }, refs: {}, values: { text: { ...fixed, of: { type: "text", max: 280 } } } },
    },
    acts: {
      establish: act({ step: "open", on: "board", grant, fields: { title: { type: "text", max: 80, required: true } }, effects: [{ value: { slot: "title", from: { field: "title" } } }] }),
      add: act({ step: "open", on: "note", grant, fields: { text: { type: "text", max: 280, required: true } }, effects: [{ party: { slot: "writer", from: { signer: true } } }, { value: { slot: "text", from: { field: "text" } } }] }),
      finish: act({ step: "transition", on: "note", grant, fields: {}, guards: [{ state: ["open"] }, { signer: ["writer"], reason: "not-your-note" }], effects: [{ state: "done" }] }),
    }, receives: {}, timed: {}, rules: {},
  };
}

export async function newApplicationDirectory(directory: string): Promise<string> {
  const destination = resolve(directory), name = basename(destination);
  if (!/^[a-z][a-z0-9-]{0,31}$/.test(name)) throw new Error("Use a directory name with 1–32 lowercase letters, digits or hyphens, starting with a letter.");
  const root = join(await realpath(dirname(destination)), name), grant = `${name}.write`;
  const config = { v: 1, name: `test.example.${name}`, version: "0.1.0", entry: "definition.json", definitions: ["definition.json"],
    host: { execution: "recorded-do", profiles: ["restricted@1"] }, capabilities: [], projections: {}, roles: { member: [grant] }, predecessor: null,
    presentation: { entry: "index.html", assets: [], descriptions: {}, browser: { entry: "browser/main.ts", html: "browser/index.html", script: "application.js" } }, scenarios: ["scenarios/basic.json"] };
  const actor = (seed: string, member: string, actions: string[]) => ({ seed: seed.repeat(32), member, actions });
  const scenario = { v: 1, name: "notes-custody", time: "2026-01-01T12:00:00Z",
    actors: { alice: actor("01", "@alice", [grant]), bob: actor("02", "@bob", [grant]), visitor: actor("03", "@visitor", []) },
    founding: { actor: "alice", fields: { title: name } }, steps: [
      { act: { actor: "alice", kind: "add", fields: { text: "A first note." } }, expect: { answer: "accepted" } },
      { act: { actor: "bob", kind: "finish", on: 1, fields: {}, expected: { on: { $revision: 1 } } }, expect: { answer: "refused", reason: "guard-failed" } },
      { act: { actor: "visitor", kind: "add", fields: { text: "No grant." } }, expect: { answer: "refused", reason: "unauthorized" } },
      { act: { actor: "alice", kind: "finish", on: 1, fields: {}, expected: { on: { $revision: 1 } } }, expect: { answer: "accepted" } },
      { assert: { item: 1, state: "done", parties: { writer: { $member: "alice" } }, values: { text: "A first note." } } },
    ] };
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${name}</title></head><body><main><h1>${name}</h1><p>A browser starter for your application. The native notes scenario runs with dap check.</p><button id="device">Set up this browser</button><p id="status" role="status">Set up this browser to create or reuse a local device key.</p></main><script type="module" src="./main.ts"></script></body></html>\n`;
  const browser = `import { browserPrivateSlots, generateBrowserDeviceKey } from "@generalbusiness/dap-client";
import "./main.css";
const slots = browserPrivateSlots({ database: "dap-${name}-private-1", store: "slots", lock: "dap-${name}-private-1" });
const button = document.querySelector<HTMLButtonElement>("#device")!, status = document.querySelector<HTMLElement>("#status")!;
button.onclick = async () => {
  button.disabled = true;
  try {
    await slots.run(async () => { if (!await slots.load("device")) await slots.save("device", await generateBrowserDeviceKey()); });
    status.textContent = "This browser holds its local device key. Joining and authority still require the host.";
  } catch { status.textContent = "This browser could not save a private key."; }
  finally { button.disabled = false; }
};
`;
  const readme = `# ${name}\n\nThis starter has a bounded notes declaration, a browser key starter and a\nlocal scenario with public TEST actors. The scenario checks author-only\ncompletion and refusal without a grant, then replays native history.\n\nRun \`dap check .\` in this directory. Edit \`definition.json\`, the files in\n\`browser/\` and \`scenarios/basic.json\` for your application. Run \`dap dev .\` for a loopback preview, native fixture inspection and live\nreload. Its explicit TEST actors and in-memory state are local fixtures.\nThe browser starter creates no membership and submits no native act.\n\nThe example logical name is \`test.example.${name}\`. Choose your own name\nand descriptions before publishing. \`dap pack .\` uses an existing named\npublisher key. Pack does not create one. TEST actor seeds are public. Give installed members their own keys.\n`;
  await mkdir(root, { mode: 0o700 });
  await mkdir(join(root, "browser"), { mode: 0o700 });
  await mkdir(join(root, "scenarios"), { mode: 0o700 });
  const files = { "definition.json": canonicalize(newApplicationDefinition(name)), "dap.application.json": JSON.stringify(config, null, 2) + "\n",
    "scenarios/basic.json": JSON.stringify(scenario, null, 2) + "\n", "browser/index.html": html, "browser/main.ts": browser,
    "browser/main.css": "body{font:1rem system-ui;margin:3rem auto;max-width:44rem;padding:0 1rem;line-height:1.6}button{font:inherit;padding:.6rem 1rem}#status{overflow-wrap:anywhere}\n", "README.md": readme };
  for (const [path, text] of Object.entries(files)) await writeFile(join(root, path), text, { flag: "wx", mode: 0o600 });
  return root;
}
