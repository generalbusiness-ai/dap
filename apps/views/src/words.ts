/**
 * Two helpers with no room reads behind them, so the Page can bundle the words of `attention.ts` for a browser.
 */
import { same } from "@generalbusiness/dap-bytes";

/** Compare optional values; canonical comparison applies once both are defined. */
export const sameOptional = (a: unknown, b: unknown): boolean => a === undefined || b === undefined ? a === b : same(a, b);

const asByte = (c: string): string => `\\x${c.charCodeAt(0).toString(16).padStart(2, "0")}`;
const asUnit = (c: string): string => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`;
/**
 * Author-controlled text as one line of data, by the rule of `shownPath` in `packages/git/src/diff.ts`: a backslash and each C0 control or DEL
 * appear as \\xNN, and each C1 control, bidi control or line separator appears as \\uNNNN. A finding's text cannot start a line of the card or reorder one.
 */
export function shownText(value: unknown): string {
  // eslint-disable-next-line no-control-regex
  return String(value).replace(/[\u0000-\u001f\\\u007f]/g, asByte).replace(/[\u0080-\u009f\u061c\u200e\u200f\u2028-\u202e\u2066-\u2069]/g, asUnit);
}
