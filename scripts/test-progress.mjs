import { closeSync, openSync, writeSync } from "node:fs";

const duration = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
// Detailed callbacks remain opt-in. Timing is a distinct stream, so terminal
// reconciliation cannot rewrite or manufacture the original callback evidence.
export default class TestProgress {
  constructor() {
    this.fd = process.env.ARTROOM_TEST_PROGRESS ? openSync(process.env.ARTROOM_TEST_PROGRESS, 'wx', 0o600) : null;
    this.timing = process.env.ARTROOM_TEST_TIMING ? openSync(process.env.ARTROOM_TEST_TIMING, 'wx', 0o600) : null;
    this.phase = process.env.ARTROOM_TEST_PHASE;
    if (this.timing !== null && !['plain','native'].includes(this.phase)) throw new Error('Unknown Vitest observation phase');
  }
  write(event, details) { if (this.fd !== null) writeSync(this.fd, `${JSON.stringify({ event, time: new Date().toISOString(), ...details })}\n`); }
  observe(row) { if (this.timing !== null) writeSync(this.timing, JSON.stringify({version:1,runner:'vitest',phase:this.phase,...row})+'\n'); }
  case(event, test) {
    this.write(event, { id: test.id, project: test.project.name, file: test.module.moduleId, name: test.fullName,
      ...(event !== "case-ready" ? { state: test.result().state } : {}) });
  }
  timedCase(test, source) {
    this.observe({record:'case',source,id:test.id,project:test.project.name,file:test.module.moduleId,name:test.fullName,
      state:test.result().state,durationMs:duration(test.diagnostic()?.duration)});
  }
  module(module, source) {
    const state = module.state();
    this.observe({record:'module',source,project:module.project.name,file:module.moduleId,state,
      // The public API returns zeros before execution. Keep genuine executed
      // zero while not turning queued/skipped modules into observations of work.
      durationMs:['passed','failed'].includes(state) ? duration(module.diagnostic()?.duration) : null});
  }
  onTestRunStart(specifications) { this.write("run-start", { files: specifications.length }); }
  onTestCaseReady(test) { this.case("case-ready", test); }
  onTestCaseResult(test) { this.case("case-result", test); this.timedCase(test,'result'); }
  onTestModuleEnd(module) { this.module(module,'result'); }
  onTestRunEnd(modules, errors, reason) {
    try {
      for (const module of modules) {
        for (const test of module.children.allTests()) { this.case('case-final',test); this.timedCase(test,'final'); }
        this.module(module,'final');
      }
      this.write("run-end", { files: modules.length, unhandledErrors: errors.length, reason });
      this.observe({record:'end',reason,unhandledErrors:errors.length});
    } finally {
      if (this.fd !== null) closeSync(this.fd);
      if (this.timing !== null) closeSync(this.timing);
    }
  }
}
