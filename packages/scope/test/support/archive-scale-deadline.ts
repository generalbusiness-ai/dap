/** The main GitHub runner gets a harness allowance, never a different witness. */
declare const __ARTROOM_SCALE_DEADLINE_FACTOR__: number | undefined;

export function scaleDeadlineFactor(raw: string | undefined): number {
  if (raw === undefined) return 1;
  if (!/^[1-9][0-9]*$/.test(raw) || !Number.isSafeInteger(Number(raw))) throw new Error("ARTROOM_SCALE_DEADLINE_FACTOR must be a positive integer");
  return Number(raw);
}

export function scaleDeadline(milliseconds: number, factor = typeof __ARTROOM_SCALE_DEADLINE_FACTOR__ === "undefined" ? 1 : __ARTROOM_SCALE_DEADLINE_FACTOR__): number {
  const deadline = milliseconds * factor;
  if (!Number.isSafeInteger(deadline) || deadline < 1 || deadline > 2_147_483_647) throw new Error("Scale deadline exceeds the timer range");
  return deadline;
}
