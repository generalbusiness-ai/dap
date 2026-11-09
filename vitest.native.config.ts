import { defineConfig } from "vitest/config";
import { testOptions } from "./vitest.projects.mjs";

export default defineConfig({ test: testOptions("native", process.env["ARTROOM_SCALE_MODE"] ?? "run") });
