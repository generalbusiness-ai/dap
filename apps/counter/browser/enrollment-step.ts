/** NF-9: an enrollment that stops says which step stopped it and the error's class, never the error's message. */
export type EnrollmentStep = "browser key" | "join record" | "enrollment request" | "custody save";

/** A bounded error class name. Any other value gives "other" or "non-error". */
export function errorClass(error: unknown): string {
  if (!(error instanceof Error)) return "non-error";
  return /^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(error.name) ? error.name : "other";
}

/** An error that stopped one enrollment step. It keeps the original message for code, and the page never shows it. */
export class EnrollmentStepError extends Error {
  readonly step: EnrollmentStep;
  readonly error: string;
  constructor(step: EnrollmentStep, cause: unknown) {
    super(cause instanceof Error ? cause.message : "A step stopped with a non-error value.");
    this.name = "EnrollmentStepError";
    this.step = step;
    this.error = errorClass(cause);
  }
}

/** Runs one step. A throw names this step, unless an inner step already named itself. */
export async function atStep<T>(step: EnrollmentStep, work: () => Promise<T>): Promise<T> {
  try { return await work(); }
  catch (error) { throw error instanceof EnrollmentStepError ? error : new EnrollmentStepError(step, error); }
}

/** The page's words for an enrollment that stopped. */
export function unconfirmedWords(error: unknown): string {
  const at = error instanceof EnrollmentStepError ? `at the ${error.step} step (${error.error})` : `at an unnamed step (${errorClass(error)})`;
  return `The enrollment remains unconfirmed ${at}. Check its original request before continuing.`;
}
