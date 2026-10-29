---
name: dap-application
description: Create or revise dap application definitions, declared views, package connections, and local scenarios. Use for application authoring and validation, not host deployment or unrelated interface work.
---

# Author a dap application

Write the application as a complete checked package. Keep its rules in the
definition, its display in declared views, and its behavioral examples in
scenarios. Preserve the user's chosen domain and existing source layout.

## Start from the complete package

For a new application, copy the whole [starter directory](assets/starter/).
Its files work together:

- [definition.json](assets/starter/definition.json) declares items, acts,
  a handler, a timed rule, and a rule expression.
- [signal.json](assets/starter/signal.json) declares the handler's pinned
  sender without a circular definition digest.
- [dap.application.json](assets/starter/dap.application.json) binds the
  definition, projection, `presentation.views.notes`, and scenario.
- [scenarios/basic.json](assets/starter/scenarios/basic.json) checks behavior.
- [index.html](assets/starter/index.html) supplies the package entry.

The scenario exercises acts, the timer, projections, and replay. The check
validates the handler's declaration and port, but does not deliver its
queued message. Use a native scope witness for that delivery property.

Keep the view inside `presentation.views` in the manifest. The source loader
does not include a separate view file. Copying one fragment omits checked
connections between the files.

For an existing application, extend its maintained package. Keep published
canonical bytes and pins intact. A changed definition has a new digest and
does not migrate existing scopes.

Read [the bundled authoring rules](references/authoring.md) before adding an
act, handler, or timed rule. That reference includes guard and scenario
syntax, refusal names, and the boundaries that checks cannot prove.

## Write, check, and fix

1. State the requested invariant in one sentence. Choose the item state,
   slot, grant, guard, handler, or timed rule that owns it.
2. Change the definition and any affected projection, view, role defaults,
   and scenario together. Keep module dependencies explicit.
3. Run the application's typecheck or generation command if its source
   needs one. Then run `dap check <source-root>` with its actual config.
4. Read each finding's definition, row, check, severity, reason, and message.
   Fix every refusal. Resolve each warning or record the design reason for
   retaining it. Run the affected check again.
5. Check an accepted path and the refused path that distinguishes the
   invariant. Assert the resulting item or projection. A declaration that
   validates can still express the wrong rule.

The CLI is not published as a global command. Here `dap` means
`node <checkout>/packages/cli/bin/dap.js`, using the actual checkout path.
From the repository root, check the bundled package with:

```sh
node packages/cli/bin/dap.js check skills/dap-application/assets/starter
```

After copying the complete starter into a new source root, run the
checkout's CLI with `check .` from that root. With a repository-root
package config, follow the maintained Lending form:

```sh
node packages/cli/bin/dap.js check . --config examples/lending/dap.application.json
```

The explicit config path and the paths inside it are relative to the
selected source root. Do not assume that moving a config changes that root.

## Pin and deliver the checked result

Use the application's maintained generator for canonical definition files
and pins. Check that source, canonical data, and digest agree. Never invent
a digest or copy one from another version.

Pack only after the package check passes. Packing needs an existing
publisher key and a new output path. Installation needs a compatible room,
an immutable committed packet, the expected release, and the operator's
matching trust configuration. Follow [delivery and limits](references/authoring.md#pack-and-install)
before selecting an install path. Keep an uncertain original request for
readback instead of replacing it.

For the complete maintained reference, use
[Write an application](https://github.com/generalbusiness-ai/artroom/blob/main/docs/write-an-application.md),
[Declared application views](https://github.com/generalbusiness-ai/artroom/blob/main/docs/application-views.md),
and [Scopes](https://github.com/generalbusiness-ai/artroom/blob/main/docs/scopes.md).
The bundled rules cover the narrow authoring loop without requiring those
pages for each edit.
