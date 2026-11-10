/** One native catalogue binding above Client; no executable rule crosses it. */
import { descriptionsOf } from "@generalbusiness/dap-client";
import { VERSIONS } from "@generalbusiness/dap-platform";

const catalogue = Object.fromEntries(Object.entries(VERSIONS).map(([pin, native]) => [pin, {
  rules: Object.fromEntries(Object.entries(native.rules).map(([code, rule]) => [code,
    rule.refusals === undefined ? {} : { refusals: rule.refusals },
  ])),
}]));

export const descriptions = descriptionsOf(catalogue);
