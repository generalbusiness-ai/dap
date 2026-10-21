import { closeSync, openSync, writeSync } from "node:fs";

// Optional gate observation: identify unfinished cases without changing their
// execution, assertions or deadlines. Refuse an existing evidence file.
export default class TestProgress {
  constructor() { this.fd = openSync(process.env.ARTROOM_TEST_PROGRESS, "wx", 0o600); }
  write(event, details) { writeSync(this.fd, `${JSON.stringify({ event, time: new Date().toISOString(), ...details })}\n`); }
  case(event, test) {
    this.write(event, { id: test.id, project: test.project.name, file: test.module.moduleId, name: test.fullName,
      ...(event === "case-result" ? { state: test.result().state } : {}) });
  }
  onTestRunStart(specifications) { this.write("run-start", { files: specifications.length }); }
  onTestCaseReady(test) { this.case("case-ready", test); }
  onTestCaseResult(test) { this.case("case-result", test); }
  onTestRunEnd(modules, errors, reason) {
    this.write("run-end", { files: modules.length, unhandledErrors: errors.length, reason });
    closeSync(this.fd);
  }
}
