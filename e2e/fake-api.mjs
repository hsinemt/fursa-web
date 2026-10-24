// A tiny fake Fursa API for the end-to-end tests (see playwright.config.ts). Not used anywhere else.
// It checks the fursa_access_token cookie like the real one, answers CORS for the web origin and
// keeps jobs, statuses, profile and preferences in memory. POST /__reset puts everything back.
import { createServer } from "node:http";

const PORT = Number(process.env.PORT ?? 8100);
const ALLOWED = process.env.ALLOWED_ORIGIN ?? "http://localhost:3100";

const day = 86_400_000;
const jobs = [
  [
    "11111111-1111-4111-8111-111111111111",
    "Data engineer",
    "Example company",
    82,
    "Tunis",
    "Tunisia",
  ],
  [
    "22222222-2222-4222-8222-222222222222",
    "Backend developer",
    "Sample company",
    68,
    "Paris",
    "France",
  ],
  ["33333333-3333-4333-8333-333333333333", "Platform engineer", "Demo company", 51, "Remote", null],
].map(([job_id, title, company, score, location, country], index) => ({
  job_id,
  title,
  company,
  score,
  location,
  country,
  remote: null,
  url: `https://jobs.example.com/${index + 1}`,
  source: "example",
  posted_at: new Date(Date.now() - (index + 1) * day).toISOString(),
  is_active: true,
  updated_at: new Date(Date.now() - index * day).toISOString(),
  explanation: index === 0 ? "Your Python and SQL experience match this role." : null,
}));

const fresh = () => ({
  status: new Map(),
  profile: {
    target_roles: ["Data engineer"],
    skills: ["Python", "SQL"],
    locations: ["Tunis"],
    seniority: "senior",
    salary_min: null,
    salary_max: null,
    salary_currency: null,
    updated_at: null,
    weights: {},
  },
  prefs: {
    email_enabled: false,
    telegram_enabled: false,
    telegram_linked: false,
    frequency: "daily",
    min_score: 70,
    digest_hour_utc: 7,
    email_unsubscribed_at: null,
  },
});
let state = fresh();

const cookies = (req) =>
  Object.fromEntries(
    (req.headers.cookie ?? "")
      .split(";")
      .map((c) => c.trim().split(/=(.*)/s).slice(0, 2))
      .filter(([k]) => k),
  );

const error = (status, code, message) => ({
  status,
  body: { error: { code, message, details: null } },
});

const statusOf = (job) => state.status.get(job.job_id) ?? "new";
const summary = (job) => ({ ...job, status: statusOf(job) });
const detail = (job) => ({
  ...summary(job),
  description:
    "<p>About the company</p><p>We build data tools.</p><h3>Responsibilities</h3><ul><li>Build data pipelines</li><li>Review code</li></ul><h3>Requirements</h3><ul><li>Python and SQL</li></ul><h3>Benefits</h3><ul><li>Remote work</li></ul>",
  extracted: {
    remote_type: "hybrid",
    employment_type: "full_time",
    seniority: "senior",
    tech_stack: ["Python", "SQL", "Docker"],
    languages: ["en"],
  },
  breakdown: {
    components: {
      title: 0.9,
      skills: 0.7,
      location: 1,
      seniority: 1,
      recency: 0.8,
      similarity: 0.6,
    },
    matched_skills: ["Python", "SQL"],
  },
});

function handle(req, url, body) {
  const route = `${req.method} ${url.pathname}`;
  if (route === "POST /__reset") {
    state = fresh();
    return { status: 200, body: { ok: true } };
  }
  const origin = req.headers.origin;
  if (req.method !== "GET" && origin !== ALLOWED) {
    return error(403, "origin_not_allowed", "This origin is not allowed.");
  }
  if (!cookies(req).fursa_access_token) return error(401, "missing_token", "Sign in first.");

  if (route === "GET /v1/profile") return { status: 200, body: state.profile };
  if (route === "PATCH /v1/profile") {
    state.profile = { ...state.profile, ...body, updated_at: new Date().toISOString() };
    return { status: 200, body: state.profile };
  }
  if (route === "GET /v1/feed") {
    const wanted = url.searchParams.get("status");
    const items = jobs.filter((j) => !wanted || statusOf(j) === wanted).map(summary);
    return { status: 200, body: { items, next_cursor: null } };
  }
  const job = url.pathname.match(/^\/v1\/jobs\/([^/]+)(\/status)?$/);
  if (job) {
    const found = jobs.find((j) => j.job_id === job[1]);
    if (!found) return error(404, "job_not_found", "This job is not in your matches.");
    if (req.method === "PUT" && job[2]) {
      state.status.set(found.job_id, body.status);
      found.updated_at = new Date().toISOString();
      return { status: 200, body: detail(found) };
    }
    if (req.method === "GET") return { status: 200, body: detail(found) };
  }
  if (route === "GET /v1/settings")
    return { status: 200, body: { email: "demo@example.com", locale: "en" } };
  if (route === "PATCH /v1/settings")
    return { status: 200, body: { email: "demo@example.com", locale: body.locale } };
  if (route === "GET /v1/notifications/preferences") return { status: 200, body: state.prefs };
  if (route === "PATCH /v1/notifications/preferences") {
    state.prefs = { ...state.prefs, ...body };
    return { status: 200, body: state.prefs };
  }
  if (route === "POST /v1/notifications/telegram/link") {
    return {
      status: 200,
      body: { url: "https://t.me/FursaBot?start=demo", expires_in_seconds: 900 },
    };
  }
  return error(404, "not_found", "No such endpoint.");
}

createServer((req, res) => {
  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    const url = new URL(req.url ?? "/", "http://fake");
    const origin = req.headers.origin;
    const cors =
      origin === ALLOWED
        ? {
            "access-control-allow-origin": origin,
            "access-control-allow-credentials": "true",
            vary: "Origin",
            "access-control-expose-headers": "Retry-After",
          }
        : {};
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        ...cors,
        "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
        "access-control-allow-headers": "content-type",
      });
      return res.end();
    }
    let body = {};
    try {
      body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {};
    } catch {
      /* no body */
    }
    const out = handle(req, url, body);
    res.writeHead(out.status, {
      "content-type": "application/json",
      "cache-control": "no-store",
      ...cors,
    });
    res.end(out.body === undefined ? undefined : JSON.stringify(out.body));
  });
}).listen(PORT, () => console.log(`fake api on ${PORT}, allowed origin ${ALLOWED}`));
