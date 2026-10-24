# Fursa Web

Frontend for Fursa, a job-matching service. Next.js (App Router), TypeScript strict, Tailwind, shadcn/ui, next-intl (Arabic right to left, French, English).

It talks to `fursa-api` only over HTTP. Planning files: `fursa web.md` (how it is built) and `fursa design.md` (how it looks; it wins on anything visual).

## Setup (Windows, PowerShell)

1. Install Node 22 or newer (`node -v`).
2. Enable pnpm. If `corepack enable` says `EPERM` (Node is in `C:\Program Files`), run PowerShell as administrator once, or use a folder you own:
   ```powershell
   corepack enable --install-directory "$env:USERPROFILE\.corepack-bin"
   ```
   then add that folder to your PATH.
3. `pnpm install`
4. `Copy-Item .env.example .env.local` and fill in the values (none are needed for step 1).
5. `pnpm dev`, then open <http://localhost:3000>.
6. Style page (development only): <http://localhost:3000/en/dev/style>.

## Docker

```powershell
Copy-Item .env.example .env     # once; set NEXT_PUBLIC_API_URL
docker compose up -d --build    # http://localhost:3000
docker compose logs -f web
docker compose down
```

The image is a multi-stage build (standalone Next.js output, non-root user, read-only filesystem in compose). `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_SITE_URL` are fixed at build time, so rebuild after changing them. The style page is not in the image. `fursa-api` runs from its own project.

## Sign-in setup (Supabase)

Sign-in uses your Supabase project. Until it is set up, the app pages send you to the sign-in page, which says sign-in is not set up.

1. In the Supabase dashboard, **Authentication > URL Configuration**: set **Site URL** to `http://localhost:3000` and add `http://localhost:3000/**` to **Redirect URLs** (use your real domain later).
2. **Authentication > Providers > Email** must be on. While testing you may turn off "Confirm email", so a new account works at once.
3. Optional: set the minimum password length to 8 (the forms ask for 8 to 72 characters).
4. **Project Settings > API**: copy the **Project URL** and the **publishable key** (the public one, never the secret or service role key) into `.env.local`: `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`.
5. Restart `pnpm dev`.

The confirmation and reset links must be opened in the same browser that asked for them. Cookies are `HttpOnly`: you will not see them in `document.cookie`. To check them, open the browser's developer tools, **Application > Cookies**: `fursa_access_token` and the `sb-...` cookies should show HttpOnly and SameSite Lax (and Secure over https).

## Dev console

A plain page to try the API by hand, in development only (it is not in a production build). Run the API (`docker compose up -d --build app worker` in fursa-api, port 8000), run `pnpm dev`, sign in, then open **Dev** in the top bar or `http://localhost:3000/en/dev`.

- **Session:** who is signed in, a countdown to the end of the access token, and a button that refreshes it (both cookies change together).
- **Does everything work?** API health and "who am I", sent for you when the page opens.
- **A card for every endpoint** (profile, feed and jobs, settings, notifications, data export, account deletion): fill the inputs, press Send, read the JSON as returned. Deleting the account needs the word DELETE typed first.
- **Errors in full:** code, message, details. After a 429 the Send button counts down the seconds the API asked for.
- **Last calls:** method, route, status and time only. Never a token, an email, an id, a query value or a body.

To run a second dev server (for example against other settings), give it its own build folder: `NEXT_DIST_DIR=.next-other pnpm dev --port 3001`.

## Commands

| Command                   | What it does                                                                                  |
| ------------------------- | --------------------------------------------------------------------------------------------- |
| `pnpm dev`                | Dev server on port 3000                                                                       |
| `pnpm build`              | Production build (the style page is not part of it)                                           |
| `pnpm generate:api`       | Refresh `contract/openapi.json` from `../fursa-api`, check its version, regenerate the client |
| `pnpm generate:api:local` | Regenerate the client from the committed contract only (what CI runs)                         |
| `pnpm lint`               | ESLint                                                                                        |
| `pnpm typecheck`          | TypeScript                                                                                    |
| `pnpm test`               | Unit tests, including the contrast test that fails on weak color                              |
| `pnpm format`             | Prettier (`format:check` only checks)                                                         |
| `pnpm test:e2e`           | End-to-end tests in a real browser, in English and Arabic (see "End-to-end tests")            |

CI (`.github/workflows/ci.yml`) runs format check, lint, typecheck, tests, build and `pnpm audit` on every push and pull request.

## End-to-end tests

`pnpm test:e2e` starts the real app on port 3100 together with two small fakes in `e2e/` (a fake Supabase and a fake Fursa API), so nothing outside this repo is needed. Every test runs twice: in English (left to right) and in Arabic (right to left). They sign in, open a job, save it, move it on the pipeline (menu and a real mouse drag), change settings, use the account menu, and scan every screen with axe (WCAG 2 A and AA, including color contrast) in light and dark.

- First time: `pnpm exec playwright install chromium`. Or use the Chrome you already have: `E2E_CHANNEL=chrome pnpm test:e2e` (PowerShell: `$env:E2E_CHANNEL="chrome"; pnpm test:e2e`).
- One test: `pnpm exec playwright test -g "pipeline"`; one language: `--project=rtl`.
- A failed run keeps a trace in `test-results/`: `pnpm exec playwright show-trace <file>`.
- `NEXT_PUBLIC_CONTACT_EMAIL` (optional) adds a contact line at the end of the Privacy and Terms pages.

## Where things are

- `src/styles/tokens.css`: all design tokens, light and dark. The only place raw colors live.
- `src/styles/globals.css`: Tailwind and shadcn theme, mapped to the tokens.
- `src/app/[locale]/`: pages. `(app)` is the signed-in shell (top bar, bottom tab bar).
- `src/messages/`: `ar.json`, `fr.json`, `en.json`. Every text is a key; a test checks the three have the same keys.
- `src/proxy.ts`: locale routing and the Content-Security-Policy (nonce).
- `src/lib/api/`: the API client. `schema.d.ts` is generated from `contract/openapi.json` (never edit it); `client.ts` is the fetch wrapper; `errors.ts` maps API error codes to translated messages. Use it as `const me = await call(api.GET("/v1/me"))`.
- `src/lib/dev/` and `src/components/dev/`: the dev console (endpoint table checked against the contract, the runner, the cards). Development only.
- `src/lib/profile/` and `src/components/features/{profile,onboarding}/`: the profile page (`/profile`), the five-step setup (`/onboarding`, shown after sign up) and the data hooks (TanStack Query). `values.ts` is plain logic (tags, salary checks, the patch of changed fields) and has its own tests.
- `src/lib/feed/` and `src/components/features/feed/`: the job feed (`/feed`) and job detail (`/jobs/<id>`) in one shared layout. `values.ts` is plain logic (text sanitizing, facts, score parts, cache updates) with its own tests; `hooks.ts` has the TanStack Query hooks (cursor pagination, optimistic status change).
- `src/components/providers/app-providers.tsx` and `src/components/ui/toast.tsx`: the data cache and the toasts, shared by the signed-in screens.
- `src/lib/auth/`: sign-in, sessions and cookies. **The only place that knows about Supabase**, and it runs on the server only. `actions.ts` has the Server Actions, `proxy.ts` refreshes the session, `cookies.ts` has the cookie rules.
- `contract/openapi.json` and `api-contract.version`: the API contract this app is built against, and its pinned version.
- `docs/adr/`: decisions.

## Rules

One step per branch (`feat/<name>`), small commits, never commit to `main`. Never edit `fursa-api` from here. No secrets in the repo: only `.env.example` is committed.
