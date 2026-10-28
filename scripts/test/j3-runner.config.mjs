// Explicit actual-container command only; the ordinary projects retain null.
import { defineConfig } from "vitest/config";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { testOptions } from "../../vitest.projects.mjs";
const root = fileURLToPath(new URL("../../", import.meta.url));
const settings = JSON.parse(process.env.ARTROOM_J3_NATIVE ?? "null");
if (!settings || new URL(settings.url).hostname !== "127.0.0.1" || !/^sha256:[a-f0-9]{64}$/.test(settings.image)) throw Error("Explicit J3 container bridge configuration required");
const options = testOptions("native");
export default defineConfig({ root, test: { ...options, projects: options.projects.filter(project => project.test.name === "scope").map(project => ({ ...project, extends: resolve(root, project.extends), test: { ...project.test, root: resolve(root, project.test.root), provide: { ...project.test.provide, j3Runner: settings } } })) } });
