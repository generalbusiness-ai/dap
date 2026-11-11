/** Public brand files that the maintained application manifests package. */
const font = (name: string, mediaType = "font/woff2") => ({ path: `brand/fonts/${name}`, file: `brand/fonts/${name}`, mediaType });
const licence = (name: string) => font(name, "text/plain; charset=utf-8");
export const applicationBrandAssets = [
  { path: "brand/fonts.css", file: "brand/fonts.css", mediaType: "text/css; charset=utf-8" },
  { path: "brand/favicon.svg", file: "brand/dist/favicon.svg", mediaType: "image/svg+xml" },
  { path: "brand/favicon.ico", file: "brand/dist/favicon.ico", mediaType: "image/vnd.microsoft.icon" },
  { path: "brand/dap-wordmark.svg", file: "brand/dap-wordmark-green.svg", mediaType: "image/svg+xml" },
  { path: "brand/dap-wordmark-white.svg", file: "brand/dist/dap-wordmark-white.svg", mediaType: "image/svg+xml" },
  licence("LICENSE-OpenRunde.txt"), licence("LICENSE-Teletype33.txt"), licence("LICENSE-SometypeMono.txt"),
  font("OpenRunde-Regular.woff2"), font("OpenRunde-Medium.woff2"), font("OpenRunde-Semibold.woff2"), font("OpenRunde-Bold.woff2"),
  font("SometypeMono-Regular.woff2"), font("SometypeMono-Medium.woff2"), font("Teletype33-Narrow.ttf", "font/ttf"), font("Teletype33.ttf", "font/ttf"),
] as const;
