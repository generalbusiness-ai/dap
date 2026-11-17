// NF-8 (decision 58a0c09c): when a hosted witness step fails, keep what the page showed, so the next run names its cause.
// The page's visible text goes to failure-page.txt with every invitation token and every given secret replaced.
// The screenshot goes to failure-page.png with the invitation field masked. If the visible text held a token or a
// secret, the screenshot would show it, so the script takes none and says so.

import { writeFileSync } from "node:fs";
import { join } from "node:path";

const INVITATION = /artroom-invite:\S+/g;
const REPLACED = "<replaced>";

/** The text with each invitation token and each given secret replaced. */
export function redact(text, secrets = []) {
  let kept = text.replace(INVITATION, `artroom-invite:${REPLACED}`);
  for (const secret of secrets) if (secret) kept = kept.split(secret).join(REPLACED);
  return kept;
}

/** Saves the page's redacted text and, when safe, a screenshot into `directory`. Never throws. */
export async function saveFailedPage(page, directory, secrets = []) {
  const saved = { text: null, screenshot: null };
  try {
    const shown = await page.locator("body").innerText();
    const kept = redact(shown, secrets);
    writeFileSync(join(directory, "failure-page.txt"), kept, { flag: "wx" });
    saved.text = "failure-page.txt";
    if (kept !== shown) saved.screenshot = "withheld: the visible text held an invitation or a secret";
    else {
      await page.screenshot({ path: join(directory, "failure-page.png"), fullPage: true, mask: [page.locator("[data-invitation]")] });
      saved.screenshot = "failure-page.png";
    }
  } catch (error) {
    saved.error = error instanceof Error ? error.name : "unknown";
  }
  return saved;
}
