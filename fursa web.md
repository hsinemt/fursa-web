# Fursa Web

Frontend for **Fursa**, a job-matching service for Tunisia and international markets (possibly commercial later). Next.js app: auth, onboarding, job feed, job detail, application pipeline, settings.

Sibling repo: `fursa-api` (FastAPI backend and workers). This repo talks to the backend **only through the HTTP API**, described by the OpenAPI contract (see "Contract with fursa-api"). It never talks to the database directly.

Languages: **Arabic (RTL), French, English** from day one. These are the three languages the API supports (`ar`, `fr`, `en`).

**First goal: a test console.** Before the polished product, build a clear, plain interface that makes the API visible and easy to test by hand (see "Dev console"). Polish, pricing and the public site come later.

## Prerequisites

- Node (current LTS or newer) and **pnpm**. pnpm is not installed by default: run `corepack enable` once.
- `fursa-api` running locally on **port 8000** (`docker compose up -d --build app worker` in that repo). This app runs on **port 3000**: the API only accepts browser calls from the origins in its `ALLOWED_ORIGINS`, which is `http://localhost:3000` locally.
- A Supabase project (the same one the API verifies tokens for). In its dashboard, Authentication: set the **Site URL** and **redirect URLs** (`http://localhost:3000` while testing, the real domain later). While testing you may turn off "Confirm email" so a new account works at once.

Environment variables (`.env.local`, never committed; keep `.env.example` current):

```
NEXT_PUBLIC_API_URL=http://localhost:8000
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_PUBLISHABLE_KEY=<the public "publishable" (formerly "anon") key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

The Supabase **service role key never appears here**. The URL and publishable key are public by design, but the auth code reads them server-side only.

## Stack

- Next.js (App Router) + TypeScript (strict)
- Tailwind CSS (logical properties for RTL) + shadcn/ui (Radix)
- TanStack Query (server state)
- React Hook Form + Zod (forms and validation)
- API client generated from the backend OpenAPI schema (openapi-typescript or Orval)
- Supabase Auth through `@supabase/ssr`, used **server-side only** (see "Auth and cookies")
- next-intl (i18n, `dir` switching)
- Vitest + Testing Library, Playwright (end-to-end)
- ESLint + Prettier (or Biome), pnpm
- Hosting: Vercel or Cloudflare Pages. Frontend on `fursa.app`, API on `api.fursa.app` (same site, required for cookies)

Add each of these **only in the step that needs it**; do not install the whole list on day one:

- dnd-kit: the pipeline board
- Sentry: when there is something to monitor (scrub PII: `sendDefaultPii: false`, no tokens, emails or CV text)
- Recharts: stats. The API has no stats endpoint yet
- Server-Sent Events or Vercel AI SDK: the future AI assistant
- TanStack Table: probably never needed, the feed is a list of cards

## Project structure

```
fursa-web/
├── src/
│   ├── app/
│   │   └── [locale]/
│   │       ├── (public)/          # welcome page, privacy, terms
│   │       ├── (auth)/            # login, signup, forgot password, reset password
│   │       └── (app)/             # feed, jobs/[id], pipeline, onboarding, settings
│   │           └── dev/           # DEV CONSOLE: only when not in production (see below)
│   ├── components/
│   │   ├── ui/                    # shadcn components
│   │   └── features/              # job-card, filters, pipeline-board...
│   ├── lib/
│   │   ├── api/                   # generated client + thin fetch wrapper
│   │   ├── auth/                  # the ONLY place that knows about Supabase
│   │   └── utils/
│   ├── messages/                  # ar.json, fr.json, en.json
│   ├── hooks/
│   └── middleware.ts              # locale, session refresh, route protection
├── contract/openapi.json          # committed copy of the API contract (see below)
├── api-contract.version           # the API version this app is built against
├── tests/                         # unit and e2e
├── scripts/                       # generate-api-client
├── .env.example
└── next.config.ts                 # security headers, CSP
```

## Auth and cookies

**Who does what.** The login, signup, forgot-password and reset-password **forms live in this app**, in all three languages. Supabase has no login page of its own: it is the service behind the forms (checks passwords, creates users, issues tokens, sends the confirmation and reset emails). Links in those emails open pages **on this site** (the Site URL set in the Supabase dashboard). `fursa-api` has no login endpoints: it only **verifies** the token Supabase issued.

- Auth provider is Supabase Auth, wrapped in `src/lib/auth/` so it can be replaced by changing one place.
- Session tokens must be in **HttpOnly cookies** (Secure when served over https, SameSite=Lax), never in localStorage or sessionStorage.
- **The API reads one cookie, `fursa_access_token`, holding the raw access token (the JWT).** It does *not* understand the `sb-...-auth-token` cookies `@supabase/ssr` creates. So the server code must set **two** things:
  1. the Supabase session cookies, HttpOnly, used only by our middleware to refresh the session;
  2. `fursa_access_token` = the current access token, HttpOnly, SameSite=Lax, Secure on https, lifetime equal to the token's.
  Login, token refresh and logout all happen in **server code** (Route Handlers, Server Actions, middleware). Refresh updates both cookies together; logout clears both. Do not use the browser Supabase client for sessions. The access token lives about an hour.
- The default `@supabase/ssr` browser client stores cookies JavaScript can read. Set `httpOnly: true` in the cookie options the server code passes. After implementing, **verify the flags in the browser devtools** (HttpOnly, SameSite=Lax present, Secure on https).
- Browser calls to the API must send cookies: `credentials: "include"` in the fetch wrapper.
- **Local development:** cookies belong to a host, not a port, so the cookie set by `localhost:3000` is also sent to `localhost:8000`. Do not set `Secure` on plain `http://localhost` if the browser refuses it.
- **Production:** cookie domain shared across `fursa.app` and `api.fursa.app` so the API receives the session.
- **Signup must pass the language:** `signUp({ options: { data: { locale } } })` with the current UI locale (`en`, `fr` or `ar`). The API reads `user_metadata.locale` the first time a user signs in and uses it for AI notes and messages. Changing language later: `PATCH /v1/settings` with `{"locale": ...}`, kept in step with the UI language switch.
- Short-lived access token, rotating refresh token handled in middleware.
- CSRF: all state-changing requests go through our API wrapper, which sends credentials. The API refuses a state-changing request that has the cookie but no allowed `Origin` header (browsers add it themselves), so the site's origin must be in the API's `ALLOWED_ORIGINS`. Never trigger state changes with GET.
- A deleted account: the API answers `403 account_deleted` to every call. The UI signs the user out and clears both cookies.
- The Supabase service role key never appears in this repo or its env. Only the public URL and publishable key are used here.

## Contract with fursa-api

- The contract is the API's `openapi.json` (currently version **0.3.2**). A copy is **committed** here as `contract/openapi.json`, and the typed client in `src/lib/api/` is generated from that copy.
- `pnpm generate:api` refreshes the copy from `../fursa-api/openapi.json` by default (or from the API's GitHub release asset, which needs a token because the repo is private and exists only once the API pushes a version tag), then regenerates the client. It fails if the file's `info.version` is not the one in `api-contract.version`.
- The API version we depend on is pinned in `api-contract.version`. Upgrading is an explicit commit that updates the copy and the pin, regenerates the client, and fixes any type errors. `fursa-api/CHANGELOG.md` says what changed.
- CI regenerates the client from the committed schema and fails if the committed client differs.
- Never hand-write API types. Never call endpoints outside the generated client.
- Never edit `fursa-api` from this repo. If the API needs a change, write down what and why and take it to the API project.

### Errors

All API errors share one shape: `{"error": {"code", "message", "details"}}`. Map each `code` to a translated message. Codes the API returns today:

| Code | Status | What the UI does |
| --- | --- | --- |
| `missing_token`, `invalid_token` | 401 | Go to login |
| `token_expired` | 401 | Refresh the session once, then go to login |
| `account_deleted` | 403 | Sign out, clear cookies, say the account is gone |
| `email_required` | 403 | Tell the user the account has no email |
| `origin_not_allowed` | 403 | Developer error: show it plainly in the dev console |
| `validation_error` | 422 | Show field errors from `details` (`loc`, `msg`) |
| `invalid_salary_range` | 422 | Salary min above max |
| `invalid_cursor` | 400 | Reload the feed from the start |
| `job_not_found` | 404 | "This job is not in your matches" |
| `telegram_not_linked` | 422 | Ask the user to link Telegram first |
| `telegram_not_configured` | 503 | Telegram is not set up on this server |
| `rate_limited` | 429 | Wait `Retry-After` seconds (also `details.retry_after_seconds`), then allow retry |
| `auth_unavailable`, `auth_not_configured` | 503 | Login is temporarily unavailable: retry later, do not sign the user out |

Any other code: show the `message` and keep the `code` visible in the dev console.

## What the API offers today

All under `/v1`; everything except health needs a login.

| Endpoint | Use |
| --- | --- |
| `GET /health/live`, `GET /health/ready` | Is the API up, are its dependencies |
| `GET /me` | Who am I (id, email, language) |
| `GET`, `PATCH /profile` | Roles, skills, locations, seniority (`intern`, `junior`, `mid`, `senior`, `lead`, `principal`), salary |
| `GET /feed` | Matches, best score first. Only `status`, `limit` and `cursor` (take `next_cursor`) |
| `GET /jobs/{id}` | Full posting, extracted facts, score breakdown, AI note (may be empty) |
| `PUT /jobs/{id}/status` | `new`, `saved`, `applied`, `interview`, `rejected` |
| `GET`, `PATCH /settings` | Language |
| `GET`, `PATCH /notifications/preferences` | Email and Telegram on or off, daily or instant, minimum score, digest hour (UTC) |
| `POST /notifications/telegram/link`, `DELETE /notifications/telegram` | Link or unlink Telegram |
| `GET /account/export`, `DELETE /account` | Download all data, delete the account |

Not available yet: CV upload, feed search or filters beyond `status`, statistics, closing the Supabase login on account deletion. Every endpoint can answer 429.

## Dev console

A plain page at `/dev` (also reachable in other languages), **not built in production** (guard with `NODE_ENV` or a flag). Its job is to make the API easy to try:

- API health (`/v1/health/ready`) and `GET /v1/me`
- When the access token expires (countdown) and a button to refresh it
- A forms-and-buttons panel for every endpoint above, with the JSON response shown as returned
- A log of the last calls: method, path, status, time. **Never** tokens, emails or response bodies with personal data
- Clear display of errors (code, message, details) and of 429 waits

It is a testing tool: plain styling, English only, no translations required.

## i18n and RTL

- Locales: `ar`, `fr`, `en`. Set `<html lang dir>` per locale (`dir="rtl"` for Arabic).
- Use Tailwind **logical properties** everywhere (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`, `text-start`). Never `ml-`, `mr-`, `left-`, `right-` for layout.
- Mirror directional icons (arrows, chevrons) in RTL.
- Arabic-friendly font (Noto Sans Arabic, IBM Plex Sans Arabic or Cairo), loaded with `next/font`.
- No hardcoded strings in components: every text is a translation key. Format dates, numbers and currency with the locale.
- Test every screen in RTL from the start. Keep long-text layouts flexible (French is longer than English).
- The AI "why it matches you" note arrives already written in the user's saved language; do not translate it.

## Security rules

- Job descriptions and any scraped text are **untrusted**: render as plain text or sanitized Markdown, never raw HTML (`dangerouslySetInnerHTML` is forbidden unless sanitized and reviewed).
- Strict Content-Security-Policy and security headers in `next.config.ts` (no inline scripts without nonces). `connect-src` must include the API origin (`http://localhost:8000` in development, `https://api.fursa.app` in production).
- No secrets in the repo or in `NEXT_PUBLIC_*` variables. Keep `.env.example` updated.
- Validate every form with Zod, and never trust client-side validation alone (the API re-validates).
- Do not log tokens, emails or CV content to the console or to Sentry (scrub PII).
- External links to job postings use `rel="noopener noreferrer"`.
- Account deletion and data export are real features (GDPR), not afterthoughts. Deletion needs a typed confirmation and cannot be undone.
- Dependabot and `pnpm audit` in CI.

## Performance rules

- Server Components by default, Client Components only for interactivity.
- Cursor-based pagination with TanStack Query (infinite scroll or "load more") for the job feed. Never load all jobs.
- Optimistic updates for status changes (save, applied, rejected), rolled back on error.
- The API sends `Cache-Control: no-store`: do not rely on browser caching for API data, use TanStack Query's cache.
- Images through `next/image`, fonts through `next/font`, route-level code splitting.
- Track Core Web Vitals, and keep the feed usable on slow mobile connections (the audience includes mobile-first users).

## Accessibility and UX

- shadcn/Radix components for accessible dialogs, menus and forms. Keyboard navigation and visible focus everywhere.
- Contrast and font sizes checked in light and dark themes.
- Responsive and mobile-first.
- Clear empty, loading and error states on every screen. An empty feed is normal at first (the AI note may also be missing): say why.

## v1 screens

1. **Welcome page** (public, at `/[locale]`): the first thing a visitor sees. It introduces Fursa in about ten seconds and leads to sign up or sign in.
   - **Content, in this order:**
     - A headline and one plain sentence saying what Fursa does (collects jobs from several sources, scores each one against you, tells you about the good ones).
     - Two buttons: **Create account** (the one primary button) and **Sign in** (secondary).
     - A short **example slip** beside the headline: one job with its score and the sentence saying why it matches.
     - **How it works** in three numbered rows (a ledger, no icon tiles): (1) tell Fursa what you look for (roles, skills, places, level); (2) Fursa collects jobs and scores each one against you; (3) you get a short list that says *why* each job fits, and alerts on Telegram or email if you want them.
     - An **example** of the feed, built from the same components as the app, with sample data, clearly labeled "Example". It plays the "Sorted for you" sequence once (see `fursa design.md`).
     - **What Fursa does** as an index of the services that work today (feed, why it matches, alerts, pipeline), each with a small labeled sample, and one line saying what is not available yet.
     - **What Fursa does not do:** it never applies for you (pull quote).
     - **Your data:** you can export it or delete your account at any time.
     - A short **FAQ** with answers that only state what the app does today. No pricing answer until pricing is decided.
     - A closing line with Create account, a language switcher (Arabic, French, English) and a footer with the privacy and terms links.
   - **Rules:**
     - Follow `fursa design.md`, including "Welcome page identity". The page must be our own design: no layout, element or animation copied from another product.
     - No invented numbers, testimonials or company logos, and no stock illustrations.
     - Works in all three languages and right-to-left.
     - It is a static page with no API call, so it loads fast.
     - A signed-in visitor is sent straight to the feed.
     - The copy is written in all three languages and reviewed by a native speaker before launch.
     - Basic SEO: title, description, language alternates.
   - Until the auth step exists, **Create account** and **Sign in** point to simple placeholder pages.
2. **Auth**: signup, login, forgot password, reset password, email verification notice
3. **Onboarding**: target roles, skills, locations, seniority, alert preferences. (CV upload comes later: the API has no endpoint for it yet.)
4. **Job feed**: score, a short "why it matches you" explanation when there is one, status filter, "load more". (Search and richer filters need an API change first.)
5. **Job detail**: sanitized description, score breakdown, save and apply actions, link to the original posting
6. **Pipeline board**: saved, applied, interview, rejected (drag and drop). One feed query per status; moving a card is `PUT /jobs/{id}/status`
7. **Settings**:
   - language
   - Telegram linking: call `POST /notifications/telegram/link`, open the returned `t.me` link (valid 15 minutes), then **poll** `GET /notifications/preferences` until `telegram_linked` is true (the API links the chat within about a minute)
   - email and Telegram preferences (daily or instant, minimum score, digest hour in UTC)
   - data export and account deletion. The one-click unsubscribe page that email links open is served by the API itself, not by this app
8. Public: privacy policy and terms

Later: CV upload and tailoring, cover letters, search and richer feed filters, statistics, AI career assistant chat, billing and plans.

## Conventions

- TypeScript strict, no `any`. ESLint and Prettier clean before every commit.
- Feature-based components, small and typed. Business rules stay in the API, not in the UI.
- Tests: Vitest for utilities and critical components, Playwright for core flows (login, onboarding, feed, status change) in both LTR and RTL.
- Small, focused commits. CI on every push: lint, typecheck, tests, build, `pnpm audit`.
- Short ADR in `docs/adr/` for each major decision.
- One step at a time, one git branch per step named `feat/<step-name>` (for example `feat/auth`, `feat/job-feed`; a fix is `fix/<name>`), never commit straight to `main`. After each step report what the app does now, how to test it, and what the user must add, then stop and wait for the user's go-ahead.

## Commands

```
corepack enable          # once: makes pnpm available
pnpm install
pnpm dev                 # local dev server on port 3000
pnpm generate:api        # refresh contract/openapi.json, check its version, regenerate the client
pnpm lint && pnpm typecheck
pnpm test                # unit tests
pnpm test:e2e            # Playwright
pnpm build
```

## Build order (v1)

Each step is built on **its own branch**, named `feat/<step-name>` as in the table, cut from an up-to-date `main`. One step at a time; the user merges after review and CI.

| # | Branch | What it delivers |
| --- | --- | --- |
| 1 | `feat/skeleton` | Minimal skeleton: Next.js, TypeScript, Tailwind, shadcn, next-intl with ar/fr/en and RTL, the design tokens and fonts from `fursa design.md`, the `/dev/style` page, the contrast test, CI, security headers |
| 2 | `feat/welcome` | The **welcome page** that introduces Fursa (see "v1 screens"), in all three languages |
| 3 | `feat/api-client` | Generated API client and the API wrapper (credentials, error mapping, 429 handling) |
| 4 | `feat/auth` | Sign up, sign in, forgot and reset password, with server-side cookie handling (both cookies), middleware, protected routes, cookie flags verified |
| 5 | `feat/dev-console` | The **dev console** (`/dev`): from here on every API feature can be tried and seen |
| 6 | `feat/profile` | Profile and onboarding (without CV), and settings (language) |
| 7 | `feat/job-feed` | Job feed and job detail with pagination, status filter, sanitized rendering and status changes |
| 8 | `feat/notifications` | Notifications settings: Telegram linking, email preferences |
| 9 | `feat/account-data` | Data export and account deletion |
| 10 | `feat/pipeline` | Pipeline board with optimistic updates |
| 11 | `feat/polish` | Privacy and terms pages, polish, accessibility pass, e2e tests in LTR and RTL |

Later features follow the same rule: `feat/<what-it-does>`, and a bug fix is `fix/<what-it-fixes>`.

## Definition of done for v1

- A visitor sees the welcome page introducing Fursa, in Arabic, French and English, and can reach sign up from it.
- A user can sign up, onboard, see matched jobs, save and track applications, and manage alerts, in Arabic, French and English.
- The dev console shows the API's health, the session, and every call, and is absent from production builds.
- Session cookies verified as HttpOnly, SameSite=Lax (and Secure on https), and the API accepts the session through `fursa_access_token`.
- No unsanitized HTML rendering of scraped content.
- Generated API client is in sync with the pinned contract version in CI.
- CI is green: lint, types, tests, build, audit.
