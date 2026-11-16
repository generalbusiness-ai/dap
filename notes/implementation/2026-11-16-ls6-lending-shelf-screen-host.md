# LS6: Lending shelf screen host

Lending 0.4.0 in `lending-shelf` gets `https://lending-shelf.inguz.space`.
Lending 0.3.0 in `lending-library` keeps `https://lending.inguz.space`.
Both use dap-lending through the existing `LENDING` sandbox service.
One origin names one installation, so neither row selects the Worker's
newest presentation implicitly.

Request `564972befd3947630b6a86618349ab3f93d86c3d` and promise
`52f2a9b2307f903d2115469681bfdbfa0e451633` govern this rider. The planner
records the new room's active install item 2 and published shelf. Its Directory
is `sc_a7fawlxbqabykqatabrx2ldhx4ufji2s4wlm6l4mh5krmqvrzrta`, Library is
`sc_p7dbdhnqmaxzmdlbnwffoy3uantquxn3544tb2bcatshqwexl4mq`, and presentation is
`sha256:188f7b84e6b1ba29c2090265f4d7884a29884beff6ea58774a34ce8fbeef9f81`.
These are planner-supplied installation facts, not a lookup by this checkpoint.

The change appends the exact six-field descriptor to the Lending Worker's
`APPLICATION_SCREEN_HOSTS` and the same descriptor with `service:"LENDING"`
to sandbox rollout `SCREEN_HOSTS`. Existing Lending, Grow and Counter rows
remain. The conservative sandbox default keeps its empty mapping. The settings
inventory names both new rows. Two existing deploy-smoke cases pin the new
origin, both Lending descriptors and bidirectional service correspondence.
No test registration, Worker code, trust row, packet, signed identifier,
authored version, deadline, binding, DNS or route changes.

| Boundary | Evidence |
| --- | --- |
| Source application and checkpoint | Normal local commit `fa093bb7495a18a0e7cbe5af5389908861e71ea7`, tree `ed5b912169ed2e868e099dc8f7cc8b553c916ab7`; exit 0, 0.205211084 s, clean source. Actual `/private/tmp/artroom-ls6-source-application-20261116/result.json` SHA `9265b913dc4e7cea9e9b7032eb2fd30aa52006143f9a04f2311fc6484963ee1e`. Source review `26a01f588225a129689d6e7f5d4c1bea63a916c0`. |
| Maintained whole Node and Gate3 | UNRUN; rider joins AE1's next Worker head, with no gate of its own |
| Deployment and hosted acceptance | UNRUN; planner deploys and reads the screen and declared projection state afterward |

Local config equality cannot establish that either hosted screen answers.
All earlier AE1 failures and accepted results retain their own evidence.
