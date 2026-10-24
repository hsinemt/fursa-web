# 0004. Dev console (step 5)

Status: accepted. Date: 2026-10-24.

## Decisions

1. **Development only, by file name.** The console is `page.dev.tsx` (the same mechanism as the style page): `next.config.ts` enables that page extension only outside production, so in a production build the route does not exist, and neither do the console's components or its Server Action. The production route list was checked. Inside the app group, the proxy asks for a signed-in session.
2. **One table, checked against the contract.** `src/lib/dev/endpoints.ts` lists the endpoints. `endpoint(path, method, ...)` is typed against the generated contract types, so a path or method the API does not have is a compile error (a test proves the three kinds of mistake are rejected). Another test fails if the contract gains an endpoint the console does not cover (the unsubscribe link, served by the API itself, is the one exception).
3. **Same client as the app.** Calls go through `api.request(...)`: cookies sent, errors parsed to one `ApiError`, one refresh on `token_expired`. The runner never throws: it returns the status, the time, the body as returned, or the error.
4. **The log keeps almost nothing.** Method, route template, status, duration and the error code. Never a token, an email, an id, a query value or a body (tests check each). The answer shown under a card is the person's own response on their own screen, as returned.
5. **The token's expiry comes from the server.** The access token is HttpOnly, so the browser cannot read it. A Server Action (`getSessionInfo`) returns whether a session exists, its expiry time and the email, never the token. The countdown runs in the browser from that time.
6. **Dangerous calls ask for a typed word.** Only account deletion (`DELETE`).
7. **English only, plain.** The console uses the project's components and tokens but is not translated (see `fursa web.md`).
8. **Second dev server.** `NEXT_DIST_DIR` sets another build folder, so two dev servers can run side by side (used to test the console against fake services without touching the main one).
