// Only the explicit evidence driver supplies this context. The ordinary gate has no VM dependency.
import { defineConfig } from "vitest/config";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { testOptions } from "../../vitest.projects.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const settings = JSON.parse(process.env.ARTROOM_EVIDENCE_NATIVE ?? "null");
if (!settings || Object.keys(settings).sort().join() !== "environment,image,nonce,url" || !/^sha256:[a-f0-9]{64}$/.test(settings.image)
  || !/^[a-f0-9]{64}$/.test(settings.nonce)) throw Error("Explicit evidence container configuration required");
const address = new URL(settings.url);
if (address.protocol !== "http:" || address.hostname !== "127.0.0.1" || address.pathname !== "/" || address.search || address.hash || address.username || address.password) throw Error("TEST loopback runner address required");
const options = testOptions("native");
export default defineConfig({ root, test: { ...options, projects: options.projects.filter(project => project.test.name === "scope").map(project => ({
  ...project, extends: resolve(root, project.extends), test: { ...project.test, root: resolve(root, project.test.root), provide: { ...project.test.provide, evidenceRunner: settings } },
})) } });
