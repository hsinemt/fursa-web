#!/usr/bin/env node
/**
 * Refreshes the committed copy of the API contract, then regenerates the typed client.
 *
 *   pnpm generate:api          refresh contract/openapi.json from ../fursa-api/openapi.json,
 *                              check its version, regenerate src/lib/api/schema.d.ts
 *   pnpm generate:api:local    skip the refresh: regenerate from the committed copy only
 *                              (what CI runs, to prove the committed client is in sync)
 *
 * Options: --source <path>  read the contract from another file (or set API_CONTRACT_SOURCE)
 *
 * The version the app is built against is pinned in api-contract.version. If the contract
 * you are reading has another version, nothing is overwritten and the script fails:
 * upgrading is a deliberate commit that updates the copy and the pin together.
 * Never edit fursa-api from here: this script only reads it.
 */
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contractPath = path.join(root, "contract", "openapi.json");
const pinPath = path.join(root, "api-contract.version");
const schemaPath = path.join(root, "src", "lib", "api", "schema.d.ts");

const args = process.argv.slice(2);
const localOnly = args.includes("--local");
const sourceFlag = args.indexOf("--source");
const source = path.resolve(
  root,
  (sourceFlag >= 0 ? args[sourceFlag + 1] : undefined) ??
    process.env.API_CONTRACT_SOURCE ??
    path.join("..", "fursa-api", "openapi.json"),
);

function fail(message) {
  console.error(`generate:api: ${message}`);
  process.exit(1);
}

function versionOf(file) {
  const json = JSON.parse(readFileSync(file, "utf8"));
  const version = json?.info?.version;
  if (typeof version !== "string") fail(`${file} has no info.version`);
  return version;
}

if (!existsSync(pinPath)) fail("api-contract.version is missing");
const pinned = readFileSync(pinPath, "utf8").trim();

if (!localOnly) {
  if (!existsSync(source)) {
    fail(
      `cannot find the API contract at ${source}. Start from a checkout next to fursa-api, ` +
        "or pass --source <path>, or use `pnpm generate:api:local`.",
    );
  }
  const found = versionOf(source);
  if (found !== pinned) {
    fail(
      `the API contract is version ${found} but this app is pinned to ${pinned} ` +
        "(api-contract.version). Nothing was changed. To upgrade, update the pin in a commit " +
        "together with the new contract, regenerate, and fix any type errors. " +
        "fursa-api/CHANGELOG.md says what changed.",
    );
  }
  copyFileSync(source, contractPath);
  console.log(`contract/openapi.json refreshed from ${source} (version ${found})`);
}

const committed = versionOf(contractPath);
if (committed !== pinned) {
  fail(
    `contract/openapi.json is version ${committed} but api-contract.version says ${pinned}. ` +
      "They must be changed together.",
  );
}

const cli = path.join(root, "node_modules", "openapi-typescript", "bin", "cli.js");
execFileSync(process.execPath, [cli, contractPath, "-o", schemaPath], {
  cwd: root,
  stdio: "inherit",
});
console.log(`src/lib/api/schema.d.ts generated from contract version ${committed}`);
