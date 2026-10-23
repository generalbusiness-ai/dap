import { reservationVariantDefinitions } from "./derive-reservation-variants.ts";
import { composeVariantDefinitions } from "./compose-variants.ts";
import { deviceFormDefinitions } from "./forms-device-variants.ts";
import { holdFormDefinitions } from "./forms-hold-variants.ts";
import { operandAdditionalDefinitions } from "./forms-operand-variants.ts";
import { guardAdditionalDefinitions } from "./forms-guards-variants.ts";
import { sendAdditionalDefinitions } from "./forms-sends-additional.ts";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { capabilityStagingData, capabilityStepFactChange } from "./capability-staging-data.ts";
import { checkingData } from "./checking-data.ts";
import { ledgerDefinitionData } from "./ledger-data.ts";
import { auditedData, refusingTicketData } from "./forms-effects-variants.ts";
import { effectFormCases } from "./forms-effects-cases.ts";
import { PROFILES } from "../../src/index.ts";
import { markRuntimeDefinitions } from "./forms-marks-variants.ts";
import { markFormCases } from "./forms-marks-cases.ts";
import { observationAdditionalDefinitions, observationRuntimeDefinitions } from "./forms-observes-variants.ts";
import { judgeVariantDefinitions } from "./judge-variants.ts";
import { formsrecordsVariantDefinitions } from "./forms-records-variants.ts";
import { formsbesideVariantDefinitions } from "./forms-beside-variants.ts";
import { formsprepareVariantDefinitions } from "./forms-prepare-variants.ts";
import { formshandlersRuntimeDefinitions } from "./forms-handlers-variants.ts";
import { formssendsRuntimeDefinitions } from "./forms-sends-variants.ts";
import { handlerFormCases } from "./forms-handlers-cases.ts";
import { rows } from "./validate-table-data.ts";
import { cards } from "./forms-effects-data.ts";
import { jobs } from "./forms-guards-data.ts";
import { board } from "./forms-handlers-data.ts";
import { asks } from "./forms-operand-data.ts";
import { pull } from "./forms-sends-data.ts";
import { M as settles } from "./forms-settles-data.ts";
import { M as binding, M51 } from "./forms-binding-data.ts";
import type { DefinitionCorpusRow } from "./row.ts";

export const derivePositiveDefinitions: readonly DefinitionCorpusRow[] = [
  { name: "derive/forms-capability/step fact", origins: ["packages/derive/test/forms-capability.test.ts#a fact type whose kind is a step of a listed version passes"],
    declaration: () => { const data = capabilityStagingData(); capabilityStepFactChange(data); return data; }, bounds: PROPOSED_BOUNDS },
  ...reservationVariantDefinitions,
  ...composeVariantDefinitions,
  ...deviceFormDefinitions,
  ...holdFormDefinitions,
  ...operandAdditionalDefinitions,
  ...guardAdditionalDefinitions,
  ...sendAdditionalDefinitions,
  ...handlerFormCases().filter(([, , code]) => code === null).map(([name, declaration]) => ({ name: `derive/handlers/${name}`,
    origins: [`packages/derive/test/forms-handlers.test.ts#validator:${name}`], declaration, bounds: PROPOSED_BOUNDS })),
  ...formssendsRuntimeDefinitions,
  ...formshandlersRuntimeDefinitions,
  ...formsprepareVariantDefinitions,
  ...formsbesideVariantDefinitions,
  ...formsrecordsVariantDefinitions,
  ...judgeVariantDefinitions,
  ...markRuntimeDefinitions, ...observationRuntimeDefinitions, ...observationAdditionalDefinitions,
  ...markFormCases.filter(([, , , , expected]) => expected === null).map(([name, base, change, platform]) => ({ name: `derive/marks/${name}`,
    origins: [`packages/derive/test/forms-marks.test.ts#rows:${name}`], declaration: () => { const data = structuredClone(base); change(data); return data; },
    bounds: PROPOSED_BOUNDS, profiles: PROFILES, options: platform ? { platform: true } : {} })),
  ...([["ask", "ticket"], ["file", "ticket"], ["ask", "desk"]] as const).map(([kind, under]) => ({ name: `derive/effects/audited(${kind},${under})`,
    origins: [`packages/derive/test/forms-effects.test.ts#audited(${kind},${under})`], declaration: () => auditedData(kind, under), bounds: PROPOSED_BOUNDS })),
  { name: "derive/effects/refusing-ticket", origins: ["packages/derive/test/forms-effects.test.ts#refusing"], declaration: refusingTicketData, bounds: PROPOSED_BOUNDS },
  ...effectFormCases().filter(([, , code]) => code === null).map(([name, declaration]) => ({ name: `derive/effects/${name}`,
    origins: [`packages/derive/test/forms-effects.test.ts#validator:${name}`], declaration, bounds: PROPOSED_BOUNDS })),
  { name: "derive/forms-capability/staging", origins: ["packages/derive/test/forms-capability.test.ts#staging"], declaration: capabilityStagingData, bounds: PROPOSED_BOUNDS },
  { name: "derive/forms-prepare/checking", origins: ["packages/derive/test/forms-prepare.test.ts#checking"], declaration: checkingData, bounds: PROPOSED_BOUNDS },
  { name: "derive/forms-ledger/hold reader", origins: ["packages/derive/test/forms-ledger.test.ts#a hold reader without local holds owes no record work"], declaration: () => ledgerDefinitionData(true), bounds: PROPOSED_BOUNDS },
  { name: "derive/forms-ledger/whole ticket", origins: ["packages/derive/test/forms-ledger.test.ts#opt-in owner-record reservations", "packages/derive/test/forms-ledger.test.ts#opt-in outcome reservations"], declaration: () => ledgerDefinitionData(), bounds: PROPOSED_BOUNDS },
  ...rows.filter(([, , , code]) => code === null).map(([name, base, change]) => ({
    name: `derive/validate/${name}`, origins: [`packages/derive/test/validate.test.ts#rows[${JSON.stringify(name)}]`],
    declaration: () => { const data = structuredClone(base); change(data); return data; }, bounds: PROPOSED_BOUNDS,
  })),
  ...([ ["effects", "cards", cards], ["guards", "jobs", jobs], ["handlers", "board", board], ["operand", "asks", asks],
    ["settles", "M", settles] ] as const).map(([file, name, data]) => ({ name: `derive/forms-${file}/${name}`,
      origins: [`packages/derive/test/forms-${file}.test.ts#${name}`], declaration: () => structuredClone(data), bounds: PROPOSED_BOUNDS })),
  { name: "derive/forms-sends/pull", origins: ["packages/derive/test/forms-sends.test.ts#pullDefinition"],
    declaration: () => structuredClone(pull), bounds: { ...PROPOSED_BOUNDS, fanOut: 3 } },
  ...([ ["M", binding], ["M51", M51] ] as const).map(([name, data]) => ({ name: `derive/forms-binding/${name}`,
    origins: [`packages/derive/test/forms-binding.test.ts#${name}`], declaration: () => structuredClone(data), bounds: PROPOSED_BOUNDS, options: { platform: true } })),
];
