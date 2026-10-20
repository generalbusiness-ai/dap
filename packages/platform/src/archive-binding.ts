/** Archive binding is an explicit cohort; shipped definition bodies stay fixed. */
import type { PlatformData } from "@generalbusiness/dap-contract";
import { register, ARCHIVE } from "./register.ts";
import { directory11 } from "./application-install-creation.ts";
import { applicationInstallRulesScope } from "./application-install.ts";
import { applicationInstallRulesScope2 } from "./application-install-v2.ts";
import { deviceApplicationDirectory } from "./device-application-directory.ts";
import { deviceApplicationRulesScope, deviceApplicationRules } from "./device-application-rules.ts";
import { ARCHIVE_APPLICATION_COHORT, ARCHIVE_DECLARED_APPLICATION_COHORT, ARCHIVE_DEVICE_APPLICATION_COHORT } from "./archive-binding-wire.ts";

export const archiveRegister: PlatformData = { ...register, acts: { ...register.acts,
  found: { ...register.acts["found"]!, fields: { ...register.acts["found"]!.fields, archive: { ...ARCHIVE, required: false } } },
} };

function directory(base: PlatformData, cohort: typeof ARCHIVE_APPLICATION_COHORT | typeof ARCHIVE_DECLARED_APPLICATION_COHORT | typeof ARCHIVE_DEVICE_APPLICATION_COHORT): PlatformData {
  const establish = base.acts["establish"]!, stage = base.receives["application-stage"]!;
  return { ...base,
    items: { ...base.items, repository: { ...base.items["repository"]!,
      values: { ...base.items["repository"]!.values, archive: { fixed: false, required: false, of: ARCHIVE } },
    } },
    acts: { ...base.acts,
      establish: { ...establish, fields: { ...establish.fields, archive: { ...ARCHIVE, required: false } },
        effects: [...establish.effects, { value: { slot: "archive", from: { field: "archive" } } }],
        sends: establish.sends.map(send => "create" in send && send.create.kind === "membership"
          ? { create: { ...send.create, definition: cohort.membership } } : send),
      },
      "bind-archive": { step: "transition", on: "repository", grant: "directory.archive", also: {},
        fields: { archive: { ...ARCHIVE, required: true } }, guards: [{ state: ["open"] }],
        effects: [{ value: { slot: "archive", from: { field: "archive" } } }], sends: [], attention: [],
      },
    },
    receives: { ...base.receives, "application-stage": { ...stage,
      fields: { ...stage.fields, needsArchive: { type: "bool", required: true } },
      guards: [...stage.guards, { reason: "archive-unavailable", anyOf: [
        [{ equals: { a: { field: "needsArchive" }, b: { const: false } } }],
        [{ of: "also.repository", equals: { a: { slot: "archive" }, b: { const: "journal" } } }],
      ] }],
    } },
  };
}
export const archiveDirectory = directory(directory11, ARCHIVE_APPLICATION_COHORT);
export const archiveDeclaredDirectory = directory(directory11, ARCHIVE_DECLARED_APPLICATION_COHORT);

export const archiveDeviceDirectory = directory(deviceApplicationDirectory, ARCHIVE_DEVICE_APPLICATION_COHORT);

function rules(base: PlatformData): PlatformData {
  const installation = base.items["installation"]!, { needsDestination: _old, ...values } = installation.values;
  return { ...base, items: { ...base.items, installation: { ...installation, values: { ...values,
    requirements: { fixed: true, required: true, of: { type: "record", of: {
      destination: { type: "bool", required: true }, archive: { type: "bool", required: true },
    } } },
  } } } };
}
export const archiveRulesScope = rules(applicationInstallRulesScope);
export const archiveDeclaredRulesScope = rules(applicationInstallRulesScope2);

export const archiveDeviceRulesScope = rules(deviceApplicationRulesScope);
/** The same device proof/owner relay; exact Rules10 selects the typed requirements record. */
export const archiveDeviceRules = deviceApplicationRules;
