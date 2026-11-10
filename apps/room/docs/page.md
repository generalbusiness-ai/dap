# Take part from the browser

The room page lets you start a room, join one and do your work in it from a
browser. You need the address of a dap service, such as
`https://dap-demo.inguz.workers.dev`, and either an invitation link or the
wish to start a new room. The page lives at `<service>/page/`.

The page signs your acts with a key that it keeps in this browser. The room
decides whether each act takes effect, and the page shows the room's answer.

## Start a new room

1. Open `<service>/page/`. In a browser with no room yet, the page shows
   **Join or create a room**.
2. Choose **Create a new room**. The page shows **Start a room**.
3. In **Room name**, type a name for your own use.
4. Choose **Start room**. The page creates the room and your key.
5. Wait for **Your room is ready**.
6. Choose **Open room**.

On **Your room is ready** you can also invite people, download the room's
public configuration and invite an agent.
[Choose a role and manage membership](roles-and-membership.md) describes
these tasks.

If the service does not offer Browser Start, the page shows the `dap`
commands that create a room instead. Your creator key stays in this browser
and you cannot download it.

## Join a room

Choose one of two paths on **Join or create a room**. If this browser
already has a room, choose your handle at the top of the page, then choose
**Change connection**.

### Join with an invitation link

1. Choose **Join with an invitation link**.
2. Paste the complete link into **Invitation link**. The page makes a key
   and joins at once.
3. Wait for the room to open.

### Join with a config and key

Use this path when the `dap` command already joined this member.

1. Choose **Join with a config and key**.
2. Paste the contents of `config.json` into **config.json**.
3. Paste the matching key from the config directory's `keys` folder into
   **Device key**.
4. Choose **Join room**. The page checks that the key belongs to a member of
   this room before it opens the room.

## Find your work

The top of the page names the room and your handle. The navigation has
**Issues**, **Changes** and **Rules**.

- **Needs you** lists the work that waits for you, above the issues.
- **Issues** has a search box and the filters **Open**, **Closed** and
  **All**. **Changes** has a search box and the filters **Open**,
  **Merged** and **All**.
- The **Changes** list marks a change **Merged** or **Closed**, or shows
  its state in the lane. The change's own page shows where it stands,
  such as **Waiting for review**, **Needs review**,
  **Awaiting confirmation** or **Merged**.
- Each screen follows the room and redraws when the room changes. When
  the stream is unavailable, the page polls instead.
- **Rules** shows the room's review requirements, how many approvals each
  one needs and who can change them.

## Do the work

| To | Read |
|---|---|
| File an issue | [File an issue](first-change.md#file-an-issue) |
| Propose a change to one text file | [Propose a change to one text file](first-change.md#propose-a-change-to-one-text-file) |
| Review a version | [Review in the browser](reviewing.md#review-in-the-browser) |
| Merge a change | [Merge in the browser](landing.md#merge-in-the-browser) |
| Invite people or add a device | [Choose a role and manage membership](roles-and-membership.md) |

On an issue or a change, the page shows the next task for you, such as
**Review change** or **Merge change**. Other acts that your role allows
are under **Advanced**.

## If an answer is unknown

The page shows **Check status** when it sent a request but did not get the
answer. Choose **Check status**. It reads the outcome of the original
request and sends nothing new. Until you check it, the page blocks further
requests on that issue or change.

Do not send the same request again. A new request does not recover the
first one.

## What the page does not do

- It does not propose a change in a room that has no change yet. Use
  `dap edit` for the first change.
- It edits one text file at a time. It does not delete, rename or upload
  binary files.
- It has no guided review task and no source preview for a version with
  several files. **Advanced** still offers the review form.
- It does not invite people from the room screens. Use `dap invite`.
- It keeps an editor draft only while the page stays open.
- It does not activate a definition in the rules. Use
  `dap act activate --value`.

To build or test the page itself, read
[The room page: build, behaviour and tests](../page/README.md).
