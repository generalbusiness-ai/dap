import { consentOAuth, originalOAuthConnection, preparedOAuthInvitation } from "./oauth-custody.ts";
import { currentOAuth, loadOAuthAuthorization, oauthCallback, oauthConnectedClients, revokeOAuthConnection, selectedOAuthRoom, type OAuthAuthorization, type OAuthConnectedAgent, type OAuthSelection } from "./oauth-context.ts";

const root = document.getElementById("consent")!;
let authorization: OAuthAuthorization | null = null, selection: OAuthSelection | null = null, connections: OAuthConnectedAgent[] = [];
let busy = false, connectionsReady = false, message = "Checking this authorization…", handleDraft = "", invitationDraft = "";
let invitationMode = false, checkedInvitation = "", invitedConnections: OAuthConnectedAgent[] = [];
const text = <K extends keyof HTMLElementTagNameMap>(tag: K, value = "", className = ""): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag); node.textContent = value; if (className) node.className = className; return node;
};
const host = (id: string) => { try { return new URL(id).hostname || "Registered client"; } catch { return "Registered client"; } };
const date = (milliseconds: number) => new Date(milliseconds).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
function button(label: string, run: () => void, primary = false): HTMLButtonElement {
  const node = text("button", label, primary ? "primary" : ""); node.type = "button"; node.disabled = busy; node.addEventListener("click", run); return node;
}
function detail(label: string, value: string): HTMLElement { const row = text("div", "", "detail"); row.append(text("dt", label), text("dd", value)); return row; }
function error(value: unknown): string { return value instanceof Error ? value.message : "This connection could not be checked. Try again."; }
function useInvitation(): boolean { return invitationMode || !!selection && !selection.room.me!.actions.includes("membership.own-agent"); }
function visibleConnections(): OAuthConnectedAgent[] {
  if (useInvitation() && checkedInvitation === invitationDraft && checkedInvitation !== "") return invitedConnections;
  return invitationMode ? [] : connections;
}
async function checkInvitation(): Promise<void> {
  if (!selection || busy) return;
  busy = true; checkedInvitation = ""; message = "Checking the invitation's connections…"; render();
  try {
    const invitation = preparedOAuthInvitation(selection, invitationDraft);
    invitedConnections = await oauthConnectedClients(selection, invitation.controller);
    checkedInvitation = invitationDraft; message = "Check the agent and controller before allowing access.";
  } catch (value) { message = error(value); }
  finally { busy = false; render(); }
}
async function allow(mode: "new" | "check" | "continue"): Promise<void> {
  if (!authorization || !selection || busy) return;
  busy = true; message = mode === "check" ? "Checking the original invitation…" : "Connecting…"; render();
  try {
    const result = await consentOAuth(selection, authorization, localStorage, { mode, handle: handleDraft, ...(useInvitation() && checkedInvitation !== "" && checkedInvitation === invitationDraft ? { preparedLink: invitationDraft } : {}) });
    if (result.redirect) { currentOAuth(selection); location.assign(result.redirect); return; }
    message = result.reason ?? (result.state === "unknown" ? "Connection status is unknown. Continue the original request." : "The original connection is saved.");
    if (result.state === "done" || result.state === "refused") { connectionsReady = false; connections = await oauthConnectedClients(selection); connectionsReady = true; checkedInvitation = ""; }
  } catch (value) { message = error(value); }
  finally { busy = false; render(); }
}
async function revoke(agent: string, grant: string): Promise<void> {
  if (!selection || busy) return;
  busy = true; message = "Revoking this connection…"; render();
  try { await revokeOAuthConnection(selection, agent, grant); connectionsReady = false; connections = await oauthConnectedClients(selection); connectionsReady = true; if (checkedInvitation) invitedConnections = await oauthConnectedClients(selection, preparedOAuthInvitation(selection, checkedInvitation).controller); message = "Connection revoked."; }
  catch (value) { message = error(value); }
  finally { busy = false; render(); }
}
async function refreshConnections(): Promise<void> {
  if (!selection || busy) return;
  busy = true; connectionsReady = false; message = "Checking connections…"; render();
  try { connections = await oauthConnectedClients(selection); if (checkedInvitation) invitedConnections = await oauthConnectedClients(selection, preparedOAuthInvitation(selection, checkedInvitation).controller); connectionsReady = true; message = "Connections checked."; }
  catch (value) { message = error(value); }
  finally { busy = false; render(); }
}
function render(): void {
  root.replaceChildren();
  const brand = text("a", "dap", "brand"); brand.href = "/page/"; root.append(brand, text("h1", "Connect to your room"));
  const status = text("p", message, "status"); status.setAttribute("role", "status"); status.setAttribute("aria-live", "polite");
  if (!authorization) { root.append(status); return; }
  const client = authorization.client, intro = text("section");
  intro.append(text("h2", client.client_name), text("p", host(client.client_id), "client-host"));
  const details = text("dl"); details.append(detail("Client ID", client.client_id), detail("Callback host", new URL(authorization.binding.redirect_uri).host)); intro.append(details); root.append(intro);
  if (selection) {
    const room = text("section"), facts = text("dl");
    facts.append(detail("Room", selection.room.name ?? "Selected dap room"), detail("Repository", selection.room.publication === "unpublished" ? "Unpublished" : selection.room.name ?? selection.room.directory), detail("Room ID", selection.room.directory), detail("You", selection.controller.member));
    room.append(facts); root.append(room);
    const selected = selection, visible = visibleConnections(), active = visible.find(connection => connection.client_id === client.client_id && connection.state === "enrolled");
    let original: ReturnType<typeof originalOAuthConnection> = null;
    try { original = originalOAuthConnection(selected, localStorage, authorization); } catch (value) { message = error(value); }
    const unresolved = original !== null && !["done", "refused"].includes(original.state);
    const form = text("section");
    if (unresolved) {
      form.append(text("h2", "Continue your original connection"), text("p", `Agent ${original!.handle}, controlled by ${original!.controller.member}.`));
      if (original!.matches) {
        if (original!.canCheck) form.append(button("Check invitation", () => { void allow("check"); }));
        form.append(button("Continue original request", () => { void allow("continue"); }, true));
      } else { const resume = text("a", "Resume previous authorization", "button-link"); resume.href = original!.resume; form.append(resume); }
    } else {
      const permission = text("p", "", "permission");
      let previewHandle = "", previewController = selected.controller.member;
      const preview = text("p", "", "invitation-preview");
      const permissionText = () => {
        const agent = active?.handle ?? (useInvitation() ? previewHandle : handleDraft);
        permission.textContent = `This lets ${client.client_name} act as ${agent || "your agent"}, controlled by ${previewController}, in this room until you revoke it or ${date(Date.now() + 30 * 86_400_000)}.`;
      };
      const allowButton = button("Allow", () => { void allow("new"); }, true);
      const updateInvitation = () => {
        previewHandle = ""; previewController = selected.controller.member;
        try { const invitation = preparedOAuthInvitation(selected, invitationDraft); previewHandle = invitation.handle; previewController = invitation.controller.member; preview.textContent = `Agent ${previewHandle}, controlled by ${previewController}.`; }
        catch (value) { preview.textContent = invitationDraft.trim() ? error(value) : "Paste the invitation to check its agent and controller."; }
        permissionText();
        allowButton.disabled = busy || !connectionsReady || !selected.current() || !previewHandle || checkedInvitation !== invitationDraft;
      };
      if (active && (!invitationMode || checkedInvitation === invitationDraft && checkedInvitation !== "")) {
        handleDraft = active.handle; form.append(text("p", `Uses your existing agent ${active.handle}.`));
        if (checkedInvitation) previewController = preparedOAuthInvitation(selected, checkedInvitation).controller.member;
      }
      else if (!useInvitation()) {
        const label = text("label", "Agent handle"); label.htmlFor = "agent-handle";
        const input = text("input"); input.id = "agent-handle"; input.type = "text"; input.maxLength = 128; input.value = handleDraft; input.disabled = busy; input.addEventListener("input", () => { handleDraft = input.value; permissionText(); }); form.append(label, input);
      } else {
        form.append(text("p", selected.room.me!.actions.includes("membership.manage") ? "Use an agent invitation prepared for this room. As an admin, you can connect an agent for another controller." : `Ask an admin for an agent invitation controlled by ${selected.controller.member} in this room.`));
        const label = text("label", "Agent invitation"); label.htmlFor = "agent-invitation";
        const input = text("textarea"); input.id = "agent-invitation"; input.rows = 3; input.value = invitationDraft; input.disabled = busy; input.spellcheck = false; input.addEventListener("input", () => { invitationDraft = input.value; checkedInvitation = ""; updateInvitation(); }); form.append(label, input, preview, button("Check invitation", () => { void checkInvitation(); }));
        updateInvitation();
      }
      permissionText(); form.append(permission);
      allowButton.disabled = busy || !connectionsReady || !selected.current() || useInvitation() && !active && (!previewHandle || checkedInvitation !== invitationDraft); form.append(allowButton);
      if (selected.room.me!.actions.includes("membership.own-agent")) form.append(button(useInvitation() ? "Create my own agent instead" : "Use an agent invitation instead", () => { invitationMode = !invitationMode; checkedInvitation = ""; render(); }));
    }
    root.append(form);
    const connected = text("section"); connected.append(text("h2", "Connected clients"));
    const live = visible.flatMap(connection => connection.grants.map(grant => ({ connection, grant })));
    if (!connectionsReady) connected.append(text("p", "Connections could not be checked.", "muted"));
    else if (live.length === 0) connected.append(text("p", "No active connections.", "muted"));
    else {
      const list = text("ul", "", "connections");
      for (const { connection, grant } of live) {
        const row = text("li"), description = text("div"); description.append(text("strong", grant.client_name), text("p", `${host(grant.client_id)} · ${connection.handle}`, "muted"), text("p", `Until ${date(grant.ends)}`, "muted"));
        row.append(description, button("Revoke", () => { void revoke(connection.agent, grant.id); })); list.append(row);
      }
      connected.append(list);
    }
    connected.append(button("Check connections", () => { void refreshConnections(); }));
    root.append(connected);
  } else {
    const open = text("a", "Open your room in dap", "button-link"); open.href = "/page/"; root.append(open);
  }
  status.textContent = message; root.append(status);
  root.append(button("Cancel", () => { if (authorization) location.assign(oauthCallback(authorization, { error: "access_denied" })); }));
}
async function start(): Promise<void> {
  render();
  try {
    authorization = await loadOAuthAuthorization(location.origin, new URL(location.href).searchParams);
    selection = await selectedOAuthRoom(location.origin, localStorage);
    connections = await oauthConnectedClients(selection);
    connectionsReady = true;
    const suffix = host(authorization.client.client_id).replace(/^www\./, "").split(".")[0]!.replace(/[^a-z0-9-]/gi, "-").toLowerCase().slice(0, 24) || "client";
    handleDraft = `${selection.controller.member}-${suffix}`.slice(0, 100);
    message = "Check the client, room and agent before allowing access.";
  } catch (value) { message = error(value); }
  render();
}
void start();
