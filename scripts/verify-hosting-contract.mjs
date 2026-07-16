#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const expectedHashes = {
  "favicon.ico": "d205c55379061309196852af4e8e0a6e6f01c5b5f7f59e340c5f2e3b2a424714",
  "favicon.svg": "f88ffd5a52d3bb7b44315122afe81bf6dd6db2b7dd6568260f6884d186ab270e",
  "apple-touch-icon.png": "17ebf9002c712f9ed1d57796b9a270769a8638881fc4183a149ce799849c0f87",
  "ssb-favicon-v3-64.png": "8ecda0e5f90760e022b82959fada72196b62e4813573722419337e6c6b902325",
  "ssb-favicon-v3-128.png": "c8febe0274a5c13c79f2cc19a1361a2ad2e7739b8b02de91509b8f111c84a7a1",
  "ssb-favicon-v3.svg": "f88ffd5a52d3bb7b44315122afe81bf6dd6db2b7dd6568260f6884d186ab270e",
  "ssb-favicon-v3.ico": "d205c55379061309196852af4e8e0a6e6f01c5b5f7f59e340c5f2e3b2a424714",
  "ssb-touch-v3-180.png": "17ebf9002c712f9ed1d57796b9a270769a8638881fc4183a149ce799849c0f87",
  "ssb-share-v3.png": "17ebf9002c712f9ed1d57796b9a270769a8638881fc4183a149ce799849c0f87",
};

const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};
const sha256 = (path) =>
  createHash("sha256").update(readFileSync(path)).digest("hex");
const count = (text, value) => text.split(value).length - 1;

function verifyAssets(root, prefix = "") {
  for (const [name, expected] of Object.entries(expectedHashes)) {
    const path = join(root, prefix, name);
    check(existsSync(path), `Missing protected asset: ${path}`);
    if (existsSync(path)) {
      check(sha256(path) === expected, `Unexpected protected asset hash: ${path}`);
    }
  }
}

verifyAssets(repoRoot);

const indexPath = join(repoRoot, "index.html");
check(existsSync(indexPath), "Missing index.html");
const index = existsSync(indexPath) ? readFileSync(indexPath, "utf8") : "";
const githubBase = "https://superl0ng.github.io/parlay-tracker/";
const requiredUrls = [
  "favicon.ico",
  "ssb-favicon-v3-64.png",
  "ssb-favicon-v3-128.png",
  "ssb-touch-v3-180.png",
  "manifest-v2.json",
  "ssb-share-v3.png",
];

for (const name of requiredUrls) {
  const url = `${githubBase}${name}`;
  check(count(index, url) >= 2, `Expected initial and injected metadata for ${url}`);
}

check(
  index.includes('-webkit-appearance:none!important;appearance:none!important'),
  "Missing custom button appearance reset",
);
check(
  !index.includes('https://superl0ng.github.io/favicon'),
  "Found obsolete hostname-root icon reference",
);

for (const match of index.matchAll(/src=["']\.\/([^?"']+)/g)) {
  check(existsSync(join(repoRoot, match[1])), `Missing injected script: ${match[1]}`);
}

const sitesFlag = process.argv.indexOf("--sites-checkout");
if (sitesFlag !== -1) {
  const supplied = process.argv[sitesFlag + 1];
  check(Boolean(supplied), "--sites-checkout requires a path");
  if (supplied) {
    const sitesRoot = resolve(supplied);
    const routePath = join(sitesRoot, "app", "[[...path]]", "route.ts");
    check(existsSync(routePath), `Missing Sites proxy route: ${routePath}`);
    const route = existsSync(routePath) ? readFileSync(routePath, "utf8") : "";
    verifyAssets(sitesRoot, "public");
    check(
      route.includes('const GITHUB_ORIGIN = "https://superl0ng.github.io"'),
      "Sites proxy origin changed unexpectedly",
    );
    check(
      route.includes("/parlay-tracker"),
      "Sites proxy no longer maps to /parlay-tracker",
    );
    check(
      route.includes('headers.set("cache-control", "no-store")'),
      "Sites HTML no-store policy is missing",
    );
    check(
      route.includes("decorated.replace(") && route.includes("const headAssets"),
      "Sites no longer replaces post-document.write() metadata",
    );
    const sitesMetadataAssets = [
      "ssb-favicon-v3-64.png",
      "ssb-favicon-v3-128.png",
      "ssb-favicon-v3.svg",
      "ssb-favicon-v3.ico",
      "ssb-touch-v3-180.png",
      "ssb-share-v3.png",
      "manifest-v2.json",
    ];
    for (const name of sitesMetadataAssets) {
      check(route.includes(`/${name}`), `Sites metadata is missing /${name}`);
    }
  }
}

if (failures.length) {
  console.error("Hosting contract verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Hosting contract verified.");
