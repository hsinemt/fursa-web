import type { paths } from "@/lib/api/schema";

/**
 * The endpoints the dev console can call. Developer tool: English only, never built in
 * production. Each entry is checked against the generated contract types by `endpoint()`,
 * so a path or method that the API does not have is a type error.
 */

type HttpMethod = "get" | "put" | "post" | "patch" | "delete";

/** `M` only if the contract really has that method on that path (not just a placeholder). */
type Defined<P extends keyof paths, M extends HttpMethod> = [NonNullable<paths[P][M]>] extends [
  never,
]
  ? never
  : M;

export type EndpointGroup =
  "Health" | "You" | "Profile" | "Feed and jobs" | "Settings" | "Notifications" | "Your data";

export type QueryField = {
  name: string;
  hint: string;
  kind: "text" | "number" | "select";
  /** For a select: the allowed values (an empty choice is added). */
  options?: readonly string[];
};

export type Endpoint = {
  /** "GET /v1/me" */
  id: string;
  group: EndpointGroup;
  method: Uppercase<HttpMethod>;
  /** The path as in the contract, with {placeholders}. */
  path: string;
  summary: string;
  needsLogin: boolean;
  pathParams?: readonly { name: string; hint: string }[];
  query?: readonly QueryField[];
  /** A starting body (JSON text) for requests that have one. */
  body?: string;
  bodyHelp?: string;
  /** The call destroys data: the person must type this word first. */
  confirmWord?: string;
};

export function endpoint<P extends keyof paths, M extends HttpMethod>(
  path: P,
  method: M & Defined<P, M>,
  rest: Omit<Endpoint, "id" | "path" | "method">,
): Endpoint {
  const upper = method.toUpperCase() as Endpoint["method"];
  return { id: `${upper} ${path}`, path, method: upper, ...rest };
}

const JOB_ID = [{ name: "job_id", hint: "A job id from the feed" }] as const;

export const ENDPOINTS: readonly Endpoint[] = [
  endpoint("/v1/health/live", "get", {
    group: "Health",
    summary: "Is the API process up?",
    needsLogin: false,
  }),
  endpoint("/v1/health/ready", "get", {
    group: "Health",
    summary: "Are its dependencies up (database, cache)?",
    needsLogin: false,
  }),
  endpoint("/v1/me", "get", {
    group: "You",
    summary: "Who the API thinks you are (id, email, language).",
    needsLogin: true,
  }),
  endpoint("/v1/profile", "get", {
    group: "Profile",
    summary: "Read your profile.",
    needsLogin: true,
  }),
  endpoint("/v1/profile", "patch", {
    group: "Profile",
    summary: "Change your profile. Only the fields you send change.",
    needsLogin: true,
    body: JSON.stringify(
      {
        target_roles: ["Data engineer"],
        skills: ["Python", "SQL", "Docker"],
        locations: ["Tunis"],
        seniority: "senior",
        salary_min: null,
        salary_max: null,
        salary_currency: "TND",
      },
      null,
      2,
    ),
    bodyHelp: "seniority: intern, junior, mid, senior, lead or principal.",
  }),
  endpoint("/v1/feed", "get", {
    group: "Feed and jobs",
    summary: "Your matches, best score first. Use next_cursor to load more.",
    needsLogin: true,
    query: [
      {
        name: "status",
        hint: "Only jobs with this status",
        kind: "select",
        options: ["new", "saved", "applied", "interview", "rejected"],
      },
      { name: "limit", hint: "1 to 100 (default 20)", kind: "number" },
      { name: "cursor", hint: "The next_cursor of the previous page", kind: "text" },
    ],
  }),
  endpoint("/v1/jobs/{job_id}", "get", {
    group: "Feed and jobs",
    summary: "One job: description, facts, score breakdown, the AI note.",
    needsLogin: true,
    pathParams: JOB_ID,
  }),
  endpoint("/v1/jobs/{job_id}/status", "put", {
    group: "Feed and jobs",
    summary: "Track a job: new, saved, applied, interview or rejected.",
    needsLogin: true,
    pathParams: JOB_ID,
    body: JSON.stringify({ status: "saved" }, null, 2),
  }),
  endpoint("/v1/settings", "get", {
    group: "Settings",
    summary: "Read your settings (language).",
    needsLogin: true,
  }),
  endpoint("/v1/settings", "patch", {
    group: "Settings",
    summary: "Change your language.",
    needsLogin: true,
    body: JSON.stringify({ locale: "en" }, null, 2),
    bodyHelp: "locale: en, fr or ar.",
  }),
  endpoint("/v1/notifications/preferences", "get", {
    group: "Notifications",
    summary: "Read your email and Telegram alert preferences.",
    needsLogin: true,
  }),
  endpoint("/v1/notifications/preferences", "patch", {
    group: "Notifications",
    summary: "Change them. Everything is off until you switch it on.",
    needsLogin: true,
    body: JSON.stringify(
      {
        email_enabled: false,
        telegram_enabled: false,
        frequency: "daily",
        min_score: 60,
        digest_hour_utc: 8,
      },
      null,
      2,
    ),
    bodyHelp: "frequency: instant or daily. min_score: 0 to 100. digest_hour_utc: 0 to 23.",
  }),
  endpoint("/v1/notifications/telegram/link", "post", {
    group: "Notifications",
    summary: "Get a one-time t.me link (valid 15 minutes) to link Telegram.",
    needsLogin: true,
  }),
  endpoint("/v1/notifications/telegram", "delete", {
    group: "Notifications",
    summary: "Unlink Telegram.",
    needsLogin: true,
  }),
  endpoint("/v1/account/export", "get", {
    group: "Your data",
    summary: "Download everything the API holds about you.",
    needsLogin: true,
  }),
  endpoint("/v1/account", "delete", {
    group: "Your data",
    summary: "Delete your account. This cannot be undone.",
    needsLogin: true,
    confirmWord: "DELETE",
  }),
];

export const ENDPOINT_GROUPS: readonly EndpointGroup[] = [
  "Health",
  "You",
  "Profile",
  "Feed and jobs",
  "Settings",
  "Notifications",
  "Your data",
];

export function endpointById(id: string): Endpoint {
  const found = ENDPOINTS.find((item) => item.id === id);
  if (!found) throw new Error(`No endpoint ${id}`);
  return found;
}
