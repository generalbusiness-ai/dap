# Join a room and publish one text change

You join a room, file an issue and propose a change to one text file. You
need an invitation link from a room admin. In the browser you need nothing
else. For the `dap` command you need Node 22.18 or later and Git.

## Get the dap command

Skip this section if you use only the browser. No package registry
publishes `dap`, so you run it from a clone of the source.

1. Follow [Get the dap command](../../../docs/get-dap.md). It clones the
   source and makes `dap` run the checkout's launcher.
2. Choose an empty config directory for this room. The command keeps your
   key and the room's settings there.

   ```sh
   export DAP_HOME="$HOME/.config/dap-myroom"
   ```

[The dap command](../../../docs/cli.md#what-it-needs) describes the config
directory and the key.

## Join with your invitation

Your invitation link starts with `artroom-invite:` and holds a private
secret. Give it to nobody else, and keep it out of screenshots and logs.

### In the browser

1. Open the room page at the address that the admin gives you, such as
   `https://dap-demo.inguz.workers.dev/page/`. In a browser with no room
   yet, the page shows **Join or create a room**.
2. Choose **Join with an invitation link**.
3. Paste the complete link into **Invitation link**. The page shows
   "Working on joining the room". It makes a key in this browser and joins
   with it. You press no button.
4. Wait for the room to open. The page shows **Needs you** and the
   **Issues** list.

The key stays in this browser. If you clear the browser's saved data, this
browser loses its access to the room. If the page shows **Check status**,
choose it. It reads the result of your original join and sends nothing new.

### With the dap command

1. Run `join` with the complete link in quotes.

   ```sh
   dap join '<invitation link>'
   ```

   You see your handle, your key's ID and your inbox:

   ```
   Joined as @una on key key_H1bY2Hml....
   Your inbox: sc_zbtu7vax....
   ```

2. List the room's issues.

   ```sh
   dap issues
   ```

If the reply is lost, run the same `join` command again with the same link.
The command reuses the same key and the same signed request. A different
link does not replace a join that is still unresolved.

## File an issue

An issue states a goal. Its title is also its condition: the result that
closes it. Any member can file one.

### In the browser

1. Open **Issues**.
2. Choose **Create issue**. A dialog shows **Title** and **Description**.
3. In **Title**, write the result that closes the issue.
4. Optionally, add details in **Description**.
5. Choose **Create issue**. The page shows the room's answer.

If the page says "This room is not initialized yet", the room's creator
must finish setting up the room before you can file an issue.

### With the dap command

```sh
dap issue open --title 'The handbook has no start page' \
  --body 'New readers cannot find where to begin.'
```

You see the issue's number and its lane:

```
Opened issue #1: The handbook has no start page. Its lane is sc_4bbosp5k....
```

To comment on the issue, run `dap issue comment 1 '<text>'`.

## Propose a change to one text file

A change holds versions. Each version has a number. Reviewers and mergers
name a version by that number, so keep it.

### In the browser

The browser editor starts from the text of a change that the room already
holds. You can keep the file's path or type a new one.

1. Open **Changes**.
2. Choose **Propose change**.
3. If the room has more than one change, choose a source change from the
   list. Then choose **Use source**. The editor opens with that change's
   file text.
4. Edit **Proposal title**, **Target file path** and **Text**. A new path
   writes a new file. The old file stays.
5. Choose **Prepare proposal**. The page reads the room's published base and
   shows the base, the target and the size in UTF-8 bytes.
6. Choose **Confirm new proposal**. The page records a new change.
7. Choose **Open new proposal**. The change page shows **Version** and its
   number.

You can also start the editor from a change page with **Propose an edit**.
The page does not merge your change. It keeps your draft only while the
page stays open.

If the room has no change yet, **Propose change** is not available. Make
the room's first change with `dap edit`.

### With the dap command

1. Write the new content in a local UTF-8 text file of at most 65,536
   bytes.
2. Run `edit` with the path in the room's repository and your local file.

   ```sh
   dap edit README.md --file ./readme.md --title 'Explain the room'
   ```

   The command opens a change, proposes the file and asks the room to merge
   it. You see the change and the version number:

   ```
   Proposed README.md (37 bytes) as change sc_q3xk..., version 6.
   ```

3. Read the lines that follow. A member cannot merge, so a member sees the
   merge refused and the change waiting:

   ```
   Refused: unauthorized, judged at entry sc_q3xk...:7. The request was refused.
   The change sc_q3xk... waits, at version 6. When it may be merged, run: dap merge sc_q3xk...
   ```

   If the rules ask no approval for the path, an admin or a maintainer sees
   the change published at once:

   ```
   Published: commit 5d0c1e6b..., by the merge sc_q3xk...:7.
   Page: https://dap-demo.inguz.workers.dev/site/sc_hs5f27fz.../HEAD/README.md
   ```

To link the change to an issue, add `--closes 1`. When the change is
published, the issue closes.

To propose the committed files of a local branch, run
[`dap propose <branch>`](../../../docs/cli.md#dap-propose). The room must
run the change definition for several files. Otherwise the command refuses
with `version-mismatch`.

## After you propose

A version that waits for approval needs a review. A reviewer follows
[Review an exact change version](reviewing.md). An admin or a maintainer
then follows [Follow a change through publication](landing.md).
[Choose a role and manage membership](roles-and-membership.md) lists what
each role can do.
