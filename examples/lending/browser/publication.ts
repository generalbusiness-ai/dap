/** Read-only page evidence. A match concerns rendered text at one observed published commit, never the push's outcome. */
import { expectedPage, type PageText, type ScopePointer, type Thing } from "../shelf.ts";
import { takeBytes } from "@generalbusiness/dap-bytes";
import type { ApplicationGatewayFetch } from "@generalbusiness/dap-client";
export type PublishedPage = { status:"matches"|"differs"; commit:string; url:string } | {status:"unreadable"; reason:string};
export async function readPage(origin: string, directory: string, thing: Omit<Thing,"seq">, scope: ScopePointer, signal?: AbortSignal, gateway?: ApplicationGatewayFetch): Promise<PublishedPage> {
 const base = `${origin}/site/${encodeURIComponent(directory)}/`;
 const exchange = signal ?? new AbortController().signal;
 try {
  const init={method:"GET",cache:"no-store" as const,redirect:"error" as const,signal:exchange as never};
  const response=await (gateway ?? fetch)(`${base}HEAD/${thing.page.split("/").map(encodeURIComponent).join("/")}`,init);
  if(response.status<200 || response.status>=300) return {status:"unreadable",reason:`The published page could not be read (${response.status}).`};
  if(!response.headers.get("content-type")?.startsWith("text/html")) return {status:"unreadable",reason:"The site did not answer with a page."};
  const bytes=response.body ? await takeBytes(response.body,128*1024,exchange) : null;
  if(!(bytes instanceof Uint8Array)) return {status:"unreadable",reason:"The published page is too large to compare."};
  const text=new TextDecoder().decode(bytes);
  // Template content stays inert: the site's styles and embedded resources never apply here.
  const template=document.createElement("template"); template.innerHTML=text;
  const doc=template.content, main=doc.querySelector("main"), commit=doc.querySelector("footer > code")?.textContent ?? "";
  if(!main || !/^[0-9a-f]{40}$/.test(commit)) return {status:"unreadable",reason:"The site did not identify the rendered commit."};
  const expected=expectedPage(thing,scope), children=[...main.children];
  const tags=children.map(c=>c.tagName).join(","), allowed=expected.description ? "H1,P,UL" : "H1,UL";
  const seen:PageText={title:main.querySelector("h1")?.textContent??"",description:main.querySelector("p")?.textContent??"",lines:[...main.querySelectorAll("ul > li")].map(li=>li.textContent??"")};
  const matches=tags===allowed && seen.title===expected.title && seen.description===expected.description && seen.lines.length===3 && seen.lines.every((line,i)=>line===expected.lines[i]);
  return {status:matches ? "matches" : "differs",commit,url:`${base}${commit}/${thing.page.split("/").map(encodeURIComponent).join("/")}`};
 }catch{return {status:"unreadable",reason:"The published page could not be read. Its status is unknown."};}
}
