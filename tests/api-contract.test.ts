// @vitest-environment node
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), "utf8");
const contract = JSON.parse(read("contract/openapi.json")) as {
  info: { version: string };
  paths: Record<string, Record<string, unknown>>;
};
const hash = (file: string) => createHash("sha256").update(read(file)).digest("hex");

describe("API contract", () => {
  it("the committed copy is the version this app is pinned to", () => {
    expect(contract.info.version).toBe(read("api-contract.version").trim());
  });

  it("describes the endpoints fursa web.md says the app uses", () => {
    const expected: [string, string][] = [
      ["get", "/v1/health/live"],
      ["get", "/v1/health/ready"],
      ["get", "/v1/me"],
      ["get", "/v1/profile"],
      ["patch", "/v1/profile"],
      ["get", "/v1/feed"],
      ["get", "/v1/jobs/{job_id}"],
      ["put", "/v1/jobs/{job_id}/status"],
      ["get", "/v1/settings"],
      ["patch", "/v1/settings"],
      ["get", "/v1/notifications/preferences"],
      ["patch", "/v1/notifications/preferences"],
      ["post", "/v1/notifications/telegram/link"],
      ["delete", "/v1/notifications/telegram"],
      ["get", "/v1/account/export"],
      ["delete", "/v1/account"],
    ];
    for (const [method, route] of expected) {
      expect(contract.paths[route]?.[method], `${method.toUpperCase()} ${route}`).toBeDefined();
    }
  });

  it("the generated types cover every path of the contract", () => {
    const types = read("src/lib/api/schema.d.ts");
    for (const route of Object.keys(contract.paths)) {
      expect(types, route).toContain(`"${route}"`);
    }
  });

  it("regenerating from the committed copy gives the committed types (client in sync)", () => {
    const before = hash("src/lib/api/schema.d.ts");
    execFileSync(process.execPath, ["scripts/generate-api-client.mjs", "--local"], {
      cwd: root,
      stdio: "pipe",
    });
    expect(hash("src/lib/api/schema.d.ts")).toBe(before);
  });
});

describe("generate:api version pin", () => {
  it("refuses a contract of another version and changes nothing", () => {
    const other = { ...contract, info: { ...contract.info, version: "9.9.9" } };
    const dir = mkdtempSync(path.join(tmpdir(), "fursa-contract-"));
    const file = path.join(dir, "openapi.json");
    writeFileSync(file, JSON.stringify(other));

    const contractBefore = hash("contract/openapi.json");
    const typesBefore = hash("src/lib/api/schema.d.ts");
    const run = spawnSync(process.execPath, ["scripts/generate-api-client.mjs", "--source", file], {
      cwd: root,
      encoding: "utf8",
    });

    expect(run.status).toBe(1);
    expect(run.stderr).toContain("9.9.9");
    expect(run.stderr).toContain("pinned to 0.3.2");
    expect(hash("contract/openapi.json")).toBe(contractBefore);
    expect(hash("src/lib/api/schema.d.ts")).toBe(typesBefore);
  });

  it("says what to do when the contract file cannot be found", () => {
    const run = spawnSync(
      process.execPath,
      ["scripts/generate-api-client.mjs", "--source", path.join(tmpdir(), "nope", "openapi.json")],
      { cwd: root, encoding: "utf8" },
    );
    expect(run.status).toBe(1);
    expect(run.stderr).toContain("generate:api:local");
  });
});
