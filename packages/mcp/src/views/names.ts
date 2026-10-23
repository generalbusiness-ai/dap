/** Stable tool names for declared views. Simple names stay readable. Other
 * names include their exact spelling's digest, including punctuation. */
import { digestBytes, utf8 } from "@generalbusiness/dap-bytes";

export function viewInputToolName(screen: string, action: string): string {
  const label = action.replace(/[^A-Za-z0-9]/g, "_").slice(0, 16);
  return `view_input_${label}_${digestBytes(utf8(`dap-declared-view-input-1\n${JSON.stringify([screen, action])}`)).slice(7, 39)}`;
}

export function viewToolName(screen: string, declared = false): string {
  if (!declared) return `view_${screen.replaceAll("-", "_").replaceAll(".", "_")}`;
  if (/^[A-Za-z][A-Za-z0-9]{0,62}$/.test(screen) && screen !== "read" && screen !== "act") return `view_${screen}`;
  const label = screen.replace(/[^A-Za-z0-9]/g, "_").slice(0, 40);
  return `view_${label}_${digestBytes(utf8(`dap-declared-view-tool-1\n${screen}`)).slice(7, 39)}`;
}
