import { fireEvent, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProfileScreen } from "@/components/features/profile/profile-screen";
import { AppProviders } from "@/components/providers/app-providers";
import { profileStrength, type ProfileValues } from "@/lib/profile/values";
import ar from "@/messages/ar.json";
import en from "@/messages/en.json";

vi.mock("@/lib/auth/actions", () => ({
  refreshSession: vi.fn(),
  signOutAction: vi.fn(),
  accountDeletedAction: vi.fn(),
}));
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/profile",
}));
vi.mock("next/navigation", () => ({ useParams: () => ({}) }));

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const profile = (extra = {}) => ({
  target_roles: [],
  skills: [],
  locations: [],
  seniority: null,
  salary_min: null,
  salary_max: null,
  salary_currency: null,
  updated_at: null,
  weights: {},
  ...extra,
});

let current = profile();
let patches: unknown[] = [];

beforeEach(() => {
  current = profile();
  patches = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: Request) => {
      const url = new URL(input.url);
      if (input.method === "PATCH" && url.pathname === "/v1/profile") {
        const body = await input.clone().json();
        patches.push(body);
        current = { ...current, ...body };
        return json(current);
      }
      if (url.pathname === "/v1/profile") return json(current);
      return json({ error: { code: "internal_error", message: "x", details: null } }, 500);
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

function renderIn(locale: "en" | "ar" = "en") {
  return render(
    <NextIntlClientProvider locale={locale} messages={locale === "ar" ? ar : en}>
      <AppProviders>
        <ProfileScreen email="hsine@example.com" />
      </AppProviders>
    </NextIntlClientProvider>,
  );
}

const empty: ProfileValues = {
  roles: [],
  skills: [],
  locations: [],
  seniority: "",
  salaryMin: "",
  salaryMax: "",
  currency: "",
};

describe("profileStrength", () => {
  it("is 0 for an empty profile and 100 when every part is filled", () => {
    expect(profileStrength(empty).percent).toBe(0);
    const full = profileStrength({
      roles: ["A"],
      skills: ["B"],
      locations: ["C"],
      seniority: "senior",
      salaryMin: "1000",
      salaryMax: "",
      currency: "TND",
    });
    expect(full.percent).toBe(100);
    expect(full.parts.every((p) => p.done)).toBe(true);
  });

  it("adds up the weights of the parts that are done", () => {
    expect(profileStrength({ ...empty, roles: ["A"] }).percent).toBe(30);
    expect(profileStrength({ ...empty, roles: ["A"], skills: ["B"] }).percent).toBe(55);
    expect(profileStrength({ ...empty, salaryMax: " 5000 " }).percent).toBe(15);
    expect(profileStrength({ ...empty, salaryMin: "  " }).percent).toBe(0);
  });
});

describe("profile page design", () => {
  it("shows the identity, the counts and an empty strength with a link to each missing part", async () => {
    current = profile({
      target_roles: ["Data engineer"],
      seniority: "senior",
      skills: ["SQL", "Python"],
    });
    renderIn();
    const identity = (await screen.findByRole("heading", { name: "Your profile" })).closest(
      "section",
    )!;
    expect(within(identity).getByText("hsine@example.com")).toBeInTheDocument();
    expect(within(identity).getByText("H")).toBeInTheDocument();
    expect(within(identity).getByText("Senior · Data engineer")).toBeInTheDocument();
    expect(within(identity).getByText("2")).toBeInTheDocument();

    const strength = screen.getByRole("heading", { name: "Profile strength" }).closest("section")!;
    expect(within(strength).getByText("70%")).toBeInTheDocument();
    expect(within(strength).getByRole("link", { name: /Places/ })).toHaveAttribute(
      "href",
      "#profile-locations",
    );
    expect(within(strength).getAllByText("+15%")).toHaveLength(2); // places and salary
    expect(within(strength).queryByRole("link", { name: /Target roles/ })).not.toBeInTheDocument();
  });

  it("asks for roles when there are none, and the strength grows as the person types", async () => {
    renderIn();
    expect(await screen.findByText("Add your target roles")).toBeInTheDocument();
    const strength = screen.getByRole("heading", { name: "Profile strength" }).closest("section")!;
    expect(within(strength).getByText("0%")).toBeInTheDocument();

    const input = screen.getByLabelText("Target roles");
    fireEvent.change(input, { target: { value: "Data engineer," } });
    expect(within(strength).getByText("30%")).toBeInTheDocument();
    expect(screen.getByText("Data engineer", { selector: "p" })).toBeInTheDocument();
  });

  it("has a card for each part, with the tag counter inside", async () => {
    current = profile({ skills: ["SQL", "Python", "Go"] });
    renderIn();
    await screen.findByRole("heading", { name: "Your profile" });
    for (const id of ["roles", "skills", "locations", "seniority", "salary"]) {
      expect(document.getElementById(`profile-${id}`)).not.toBeNull();
    }
    expect(
      within(document.getElementById("profile-skills")!).getAllByText("3 of 200").length,
    ).toBeGreaterThan(0);
  });

  it("says when everything is saved, then offers Save and Discard once something changed", async () => {
    renderIn();
    expect(await screen.findByText("All changes are saved.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Discard changes" })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Target roles"), { target: { value: "Designer," } });
    expect(screen.getByText("You have unsaved changes.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Discard changes" }));
    expect(screen.getByText("All changes are saved.")).toBeInTheDocument();
    expect(screen.queryByText("Designer", { selector: "span" })).not.toBeInTheDocument();
    expect(patches).toHaveLength(0);
  });

  it("saves only what changed and goes back to saved", async () => {
    renderIn();
    fireEvent.change(await screen.findByLabelText("Target roles"), {
      target: { value: "Designer," },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save profile" }));
    await screen.findByText("Profile saved.");
    expect(patches).toEqual([{ target_roles: ["Designer"] }]);
    expect(await screen.findByText("All changes are saved.")).toBeInTheDocument();
  });

  it("says there is nothing to save when nothing changed", async () => {
    renderIn();
    fireEvent.click(await screen.findByRole("button", { name: "Save profile" }));
    expect(await screen.findByText("No changes to save.")).toBeInTheDocument();
    expect(patches).toHaveLength(0);
  });

  it("works in Arabic", async () => {
    renderIn("ar");
    expect(await screen.findByRole("heading", { name: "ملفك الشخصي" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "قوة الملف" })).toBeInTheDocument();
  });
});
