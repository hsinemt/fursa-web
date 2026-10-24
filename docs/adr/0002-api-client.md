# 0002. API client (step 3)

Status: accepted. Date: 2026-10-24.

## Decisions

1. **Types are generated, never written by hand.** `openapi-typescript` turns `contract/openapi.json` into `src/lib/api/schema.d.ts`. `openapi-fetch` gives a typed client over those types, so a wrong path, query or body is a type error. Calls go through `call(api.GET("/v1/..."))`, which returns the data or throws an `ApiError`.
2. **The contract is a committed copy, pinned.** `contract/openapi.json` is copied from `../fursa-api/openapi.json`; `api-contract.version` says which version the app is built against. `pnpm generate:api` refuses a contract of another version and changes nothing, so an upgrade is always a deliberate commit that updates the copy and the pin together. The release-asset download (needs a token, and a version tag on the API) is not built yet.
3. **CI proves the client is in sync.** It runs `pnpm generate:api:local` and fails if anything under `contract/` or `src/lib/api/` changes.
4. **Cookies on every call.** The client sends `credentials: "include"`: the session is in HttpOnly cookies and the API reads `fursa_access_token`. The contract describes a bearer scheme (it is what the API's own tooling uses); the cookie works because the API accepts it, as `fursa web.md` says.
5. **One error type.** Every failure is an `ApiError` (status, code, message, details, and for a 429 the seconds to wait, read from `Retry-After` first and `details.retry_after_seconds` second). A request that never got an answer is `network_error`. Each known code maps to a translated message (`errors.*` in the three message files) and to a UI action. An unknown code keeps the API's own message and shows the code.
6. **No automatic retry on 429.** The UI shows a countdown and lets the user retry (see `fursa design.md`). The only automatic retry is one refresh-and-resend on `token_expired`, through an `onTokenExpired` callback the auth step will provide. It cannot loop.
7. **No data-fetching library yet.** TanStack Query comes with the first screen that needs it (the feed step).
