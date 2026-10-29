# Typed authoring vocabulary

Generated from the six `@pattern` and `@example` comments in `lib.ts`.
Run `node spikes/typed-surface/vocabulary.mjs --check` to check for drift.

| Pattern | Meaning | Example |
|---|---|---|
| 1. Subjects | Subjects expose only their declared slots and states. take copies same-name fields in the order given. | `effects: [...on.take(f, "label", "description")]` |
| 2. Quantifiers | none scans one item type; its callback reads that scanned item's slots. Use range for except or count bounds. | `none(hold, ["held"], h => [equals(h.slot("under"), also.commitment.id)])` |
| 3. Conditions | Conditions state when a form applies. require names the refusal when its guard fails. | `require(on.in("open"), why.notOpen)` |
| 4. Messages | tell, create, relate and index return the declared message data. Result clauses describe later answers. | `tell({ to: also.library.slot("destination"), message: "publish-file", fields: { path: f.page, content: f.content } })` |
| 5. Handlers | A handler uses the same subjects, fields and body as an act, with the verified source and sender added. | `receive({ message: "report", class: "tell", from: { kind: "lane", under: "device" }, fields, also }, ({ f, also }) => ({ effects: [...also.device.take(f, "reported")] }))` |
| 6. Definitions and modules | Modules are functions of explicit dependencies. define composes their values; compile validates and canonicalizes the whole definition. | `const work = workForms(ROOM, { zone, device, alert }, vocabulary);` |
