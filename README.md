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

## Commands

| Command          | What it does                                                     |
| ---------------- | ---------------------------------------------------------------- |
| `pnpm dev`       | Dev server on port 3000                                          |
| `pnpm build`     | Production build (the style page is not part of it)              |
| `pnpm lint`      | ESLint                                                           |
| `pnpm typecheck` | TypeScript                                                       |
| `pnpm test`      | Unit tests, including the contrast test that fails on weak color |
| `pnpm format`    | Prettier (`format:check` only checks)                            |

CI (`.github/workflows/ci.yml`) runs format check, lint, typecheck, tests, build and `pnpm audit` on every push and pull request.

## Where things are

- `src/styles/tokens.css`: all design tokens, light and dark. The only place raw colors live.
- `src/styles/globals.css`: Tailwind and shadcn theme, mapped to the tokens.
- `src/app/[locale]/`: pages. `(app)` is the signed-in shell (top bar, bottom tab bar).
- `src/messages/`: `ar.json`, `fr.json`, `en.json`. Every text is a key; a test checks the three have the same keys.
- `src/proxy.ts`: locale routing and the Content-Security-Policy (nonce).
- `docs/adr/`: decisions.

## Rules

One step per branch (`feat/<name>`), small commits, never commit to `main`. Never edit `fursa-api` from here. No secrets in the repo: only `.env.example` is committed.
