import { defineConfig } from "vite";
const repository=new URL("../../../",import.meta.url).pathname;
const source=(path:string)=>`${repository}packages/${path}`;
export default defineConfig({root:new URL(".",import.meta.url).pathname,resolve:{alias:[
  {find:/^@generalbusiness\/dap-client$/,replacement:source("client/src/index.ts")},
  {find:/^@generalbusiness\/dap-bytes$/,replacement:source("bytes/src/index.ts")},
  {find:/^@generalbusiness\/dap-derive\/scripted$/,replacement:source("derive/src/scripted.ts")},
  {find:"@generalbusiness/dap-contract/catalog-vocabulary",replacement:source("contract/src/catalog-vocabulary.ts")},
  {find:/^@generalbusiness\/dap-contract$/,replacement:source("contract/src/index.ts")},
]},server:{host:"127.0.0.1",fs:{allow:[repository]}},build:{outDir:new URL("../browser-build/",import.meta.url).pathname,emptyOutDir:true}});
