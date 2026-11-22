/** Member-authored text in one terminal line, with the same escapes as Git's displayed paths. */
export function shownText(value: string): string {
  return value.replace(/[\u0000-\u001f\\\u007f]/g, char => `\\x${char.charCodeAt(0).toString(16).padStart(2, "0")}`)
    .replace(/[\u0080-\u009f\u061c\u200e\u200f\u2028-\u202e\u2066-\u2069]/g, char => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`);
}
/** JSON already escapes C0 and backslashes. Preserve those bytes while making its other controls safe to display. */
export function shownJson(value: string): string {
  return value.replace(/[\u007f-\u009f\u061c\u200e\u200f\u2028-\u202e\u2066-\u2069]/g, char => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`);
}
