/** Exact decimal presentation of a previously checked native integer. */
export function formatInteger(value: number, scale: number, unit: string): string {
  const digits = Math.abs(value).toString().padStart(scale + 1, "0"), cut = digits.length - scale;
  const fraction = scale ? digits.slice(cut).replace(/0+$/, "") : "";
  return `${value < 0 ? "-" : ""}${digits.slice(0, cut)}${fraction ? `.${fraction}` : ""}${unit ? ` ${unit}` : ""}`;
}
