import { defineConfig } from "vitest/config";
import { testOptions } from "./vitest.projects.mjs";

export default defineConfig({ test: testOptions() });
