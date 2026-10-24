// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ENDPOINT_GROUPS, ENDPOINTS, endpoint, endpointById } from "@/lib/dev/endpoints";

type Contract = {
  paths: Record<string, Record<string, unknown>>;
  components: { schemas: Record<string, { properties?: Record<string, { enum?: string[] }> }> };
};
const contract = JSON.parse(
  readFileSync(path.join(process.cwd(), "contract", "openapi.json"), "utf8"),
) as Contract;

const HTTP = ["get", "put", "post", "patch", "delete"];

describe("dev console endpoints vs the contract", () => {
  it("has a card for every endpoint of the contract, except the unsubscribe link (served by the API)", () => {
    const missing: string[] = [];
    for (const [route, methods] of Object.entries(contract.paths)) {
      for (const method of Object.keys(methods).filter((m) => HTTP.includes(m))) {
        const id = `${method.toUpperCase()} ${route}`;
        if (route === "/v1/notifications/unsubscribe") continue;
        if (!ENDPOINTS.some((item) => item.id === id)) missing.push(id);
      }
    }
    expect(missing).toEqual([]);
  });

  it("every card points at something the contract really has", () => {
    for (const item of ENDPOINTS) {
      expect(contract.paths[item.path]?.[item.method.toLowerCase()], item.id).toBeDefined();
    }
  });

  it("ids are unique, groups are known, every group is used", () => {
    const ids = ENDPOINTS.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const item of ENDPOINTS) expect(ENDPOINT_GROUPS).toContain(item.group);
    for (const group of ENDPOINT_GROUPS)
      expect(ENDPOINTS.some((item) => item.group === group)).toBe(true);
  });

  it("path parameters match the {placeholders} of the path", () => {
    for (const item of ENDPOINTS) {
      const placeholders = [...item.path.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
      expect(
        (item.pathParams ?? []).map((p) => p.name),
        item.id,
      ).toEqual(placeholders);
    }
  });

  it("starting bodies are valid JSON and only use fields the contract has", () => {
    const fieldsOf = (schema: string) =>
      Object.keys(contract.components.schemas[schema]?.properties ?? {});
    const bodyOf = (id: string) =>
      JSON.parse(endpointById(id).body ?? "null") as Record<string, unknown>;

    expect(
      Object.keys(bodyOf("PATCH /v1/profile")).every((k) => fieldsOf("ProfileUpdate").includes(k)),
    ).toBe(true);
    expect(
      Object.keys(bodyOf("PATCH /v1/settings")).every((k) =>
        fieldsOf("SettingsUpdate").includes(k),
      ),
    ).toBe(true);
    expect(
      Object.keys(bodyOf("PATCH /v1/notifications/preferences")).every((k) =>
        fieldsOf("PreferencesUpdate").includes(k),
      ),
    ).toBe(true);

    const statuses = contract.components.schemas.UserJobStatus as unknown as { enum: string[] };
    expect(statuses.enum).toContain(bodyOf("PUT /v1/jobs/{job_id}/status").status);
    expect(contract.components.schemas.SettingsUpdate?.properties?.locale?.enum).toContain(
      bodyOf("PATCH /v1/settings").locale,
    );
  });

  it("the feed's status filter offers exactly the statuses of the contract", () => {
    const statuses = (contract.components.schemas.UserJobStatus as unknown as { enum: string[] })
      .enum;
    const feed = endpointById("GET /v1/feed");
    expect(feed.query?.find((field) => field.name === "status")?.options).toEqual(statuses);
  });

  it("deleting the account needs a typed confirmation; nothing else does", () => {
    expect(endpointById("DELETE /v1/account").confirmWord).toBe("DELETE");
    expect(ENDPOINTS.filter((item) => item.confirmWord).map((item) => item.id)).toEqual([
      "DELETE /v1/account",
    ]);
  });

  it("only the two health checks work without signing in", () => {
    expect(ENDPOINTS.filter((item) => !item.needsLogin).map((item) => item.id)).toEqual([
      "GET /v1/health/live",
      "GET /v1/health/ready",
    ]);
  });
});

describe("endpoint(): a wrong path or method does not compile", () => {
  it("accepts what the contract has and rejects what it does not (checked by tsc)", () => {
    const rest = { group: "You", summary: "x", needsLogin: true } as const;
    expect(endpoint("/v1/me", "get", rest).id).toBe("GET /v1/me");
    // @ts-expect-error the contract has no POST on /v1/me
    endpoint("/v1/me", "post", rest);
    // @ts-expect-error there is no such path
    endpoint("/v1/nope", "get", rest);
    // @ts-expect-error DELETE /v1/feed does not exist
    endpoint("/v1/feed", "delete", rest);
  });
});
