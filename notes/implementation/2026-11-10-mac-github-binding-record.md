# G3 GitHub binding procedure on the mini

This note records the G3 GitHub binding procedure for the project's Mac
mini, as the section "Bind a new room to GitHub" of
`docs/self-host-mac.md` held it until 10 November 2026.

## Bind a new room to GitHub

Use the explicit `repository-binding` cohort. Its pins are Register 25,
Directory 24, Membership 11, Rules 10, Destination 18, and Inbox 1. The
reviewed [creation policy](../../apps/room/celld/mac/repository-binding-policy.json)
admits that cohort on the mini. The default creation policy does not.

Earlier rooms, including the original H3 room, cannot bind a repository.
Their pins keep their original meaning. To move, create a new room with
this cohort, choose the content and members to bring across, and retain
the old room for its history. This procedure does not migrate a room or
rewrite its journal. Within the new cohort, a room can contain issues
before binding; binding preserves those issues and their journals.

Before the real G3 witness, the planner approves the repository and the
person's GitHub steps. The witness repository is the private,
empty `generalbusiness-ai/dap-g3-binding-witness-20261102`, with branch
`main`. Hugh created the empty repository; its branch does not exist until
first publication. The planner controls the later key transfer and deployment.
The source review covers the configuration procedure and cohort policy.
Review the filled account, installation, register, and repository bindings
before the planner applies them.

The G3 witness uses the existing **Artroom Demo** App. Its installation
selects all 26 repositories in `generalbusiness-ai`, with Administration
write, Contents write, and Metadata read. The App key on the mini can mint
tokens for every repository in that installation. dap restricts each
publication token to one recorded repository ID and Contents write, but
that software check does not narrow the App key itself. Selecting only
one repository limits what the key can mint for that installation. Use
that stronger choice when your other rooms do not need the same App.

1. Use the approved repository and App installation. G3 keeps the existing
   **Artroom Demo** installation's repository selection. For a separate
   installation, select the one repository and grant **Contents: read and
   write** plus **Metadata: read**. Record the App client ID, installation ID, account
   ID and login, and repository's numeric stable ID.
2. Choose a private input path for the App's PKCS #8 key, owned by the
   service user at mode `0600` or `0400`. The planner supplies that key
   only after source and nonsecret configuration review. This App-only
   procedure supplies no static read token. See
   [GitHub host requirements](../../docs/hosts.md#github-host-githubcom).
   Keep credentials in private files, never in chat or command arguments.
3. Plan a new register from a new persistent client home. Set the trusted
   certificate for Node as in the first-room procedure. Finish planning,
   initial deployment, and installation within 14 minutes.

   A planned register's client home creates one room. Keep that home for
   its room. To create another room, plan a new register from another new
   home, retain the earlier installed roots, deploy, and install that plan.
   A home that already claimed a room cannot create a second room.

   ```sh
   export DAP_HOME="$HOME/dap-binding-client"
   export BASE=https://mac-name.local
   export NODE_EXTRA_CA_CERTS="$HOME/dap-tls/cert.pem"
   mkdir -m 700 "$DAP_HOME"
   node packages/cli/bin/dap.js install --plan "$BASE" \
     --host none --cohort repository-binding
   node apps/room/celld/mac/prepare-project.mjs \
     --origin "$BASE" --home "$DAP_HOME" --out "$HOME/dap-binding-project"
   ```

   `prepare-project.mjs` includes the reviewed creation policy for this
   retained plan. It keeps the production Worker and bindings and creates
   private session custody. It also continues to accept the earlier
   host-none plan without changing its pins.

   To preserve child creation under earlier installed registers, add the
   reviewed `INSTALLED_REGISTER_SCOPES` string to this new prepared
   project's `vars` before GitHub staging. Include the new `REGISTER_SCOPE`
   and every earlier root that must keep creating children. The list needs
   1 to 32 distinct canonical Scope IDs and at most 4,096 UTF-8 bytes.
   Both staging and deployment validate it and preserve its exact bytes.
   Omitting it keeps the single-register behavior. The setting changes no
   Native authority or GitHub binding; see
   [Keep existing rooms able to create children](../../docs/deploy.md#keep-existing-rooms-able-to-create-children).
4. Fill a nonsecret `github-app.json` with every
   [GitHub configuration field](../../docs/hosts.md#github-host-githubcom). Set
   `registerScope` to the planned register. For the private witness, use
   `privateRepositories: true`, `publicReads: false`, `installationReads: true`, and
   `credentialIdentity: "adapter-attempt"`. Set a deliberate `maxBytes`
   allowance. Have the checker and planner review these values and the
   private key's input path.
5. After that review, the planner supplies the App key and stages a new
   private project from the original prepared project. These example
   input paths name the reviewed files:

   ```sh
   node apps/room/celld/mac/prepare-github.mjs \
     --project "$HOME/dap-binding-project" \
     --config "$HOME/dap-github/github-app.json" \
     --private-key "$HOME/dap-github/app-key.pk8.pem" \
     --out "$HOME/dap-binding-github-project"
   ```

   The helper uses the production GitHub readiness checks. It refuses a
   foreign register, unsafe input paths or file modes, invalid settings,
   and existing output. It preserves the original project, session secret,
   Worker entry, and unrelated settings. It prints only nonsecret metadata.
   Readiness validates syntax and configuration; it does not authenticate
   the App at GitHub. No network or deployment runs in this helper.
6. After source and configuration review, the planner deploys the staged
   project through the normal `deploy.py` path. The planner supplies the
   private files on the mini. Keep both projects and private deployment
   logs after any uncertain result. Once health reports sessions ready,
   install the retained plan and create the room:

   ```sh
   node packages/cli/bin/dap.js install --planned
   node packages/cli/bin/dap.js create "G3 binding witness" --handle @owner
   ```

7. Activate the room's issue and change definitions through the
   [CLI](../../docs/cli.md), then write the content to preserve before binding:

   ```sh
   node packages/cli/bin/dap.js issue open \
     --title "Content before binding" --body "Keep this issue and its history."
   node packages/cli/bin/dap.js show destination
   ```

   Record the destination's full scope reference, including its
   incarnation, and the branch chosen at creation. The register still
   records host `none`.
8. Write the exact authorization pair in a nonsecret `bindings.json`, in
   the [binding format](../../docs/hosts.md#github-host-githubcom). Use the actual
   destination reference, GitHub account, repository name and stable ID,
   and branch. Have the planner review that filled file. Stage another
   new project from the same original project, with the same inputs and
   `--bindings-file "$HOME/dap-github/bindings.json"`; use a fresh output
   directory. The planner deploys that reviewed project.
9. With the room administrator's client home, bind the reviewed repository.
   Replace the account, name, and ID below with the approved values:

   ```sh
   node packages/cli/bin/dap.js act bind-repository --on destination --target 0 \
     --set 'repository={"host":"github.com","namespace":"<account>","name":"<name>","id":"<numeric ID>"}' \
     --set 'why=Attach the reviewed repository to this room'
   node packages/cli/bin/dap.js show destination
   node packages/cli/bin/dap.js remote
   node packages/cli/bin/dap.js verify --all
   ```

   Membership 11 gives `destination.bind-repository` to administrators by
   default. An ordinary member cannot bind. The destination binds once and
   tells its recorded Directory which repository it chose. It records
   `empty` while first-head publication waits, then records `ready` with
   the accepted commit. Missing operator authorization sends no GitHub
   request. The App-only mode validates the installation, mints a token
   restricted to the recorded repository ID with Contents read, then checks
   the repository name and stable ID. A mismatch permits no Git read or
   publication-token mint. Publication tokens carry that one ID and Contents
   write. Choose an empty branch for the witness: first-head
   publication uses compare-and-swap and does not overwrite existing history.
10. Enrol the agent through the room's normal agent-key invitation. Have
    the agent propose a head from a branch, then have the owner review and
    merge it. Compare the destination's recorded commit with GitHub's
    branch head. That real mini scene and its reviewed record close G3's
    acceptance. Source tests and configuration preparation alone do not.

The binding enables repository commands. The public Site route does not
select repositories attached after creation. Archive export admission also
retains its existing exact cohort list.
