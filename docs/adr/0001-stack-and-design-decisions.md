# 0001. Skeleton decisions (step 1)

Status: accepted. Date: 2026-10-24.

## Decisions

1. **Next.js 16 uses `src/proxy.ts`, not `middleware.ts`.** Next 16 renamed the file. It does the same job (locale prefix now; session refresh and route protection from the auth step).
2. **The Content-Security-Policy is set in the proxy, not in `next.config.ts`.** A strict policy needs a nonce per request so scripts can run without `'unsafe-inline'`. `next.config.ts` holds the static headers (nosniff, frame denial, referrer, permissions, HSTS in production). A side effect: pages are rendered per request, not prerendered. The welcome page still makes no API call.
3. **The appearance choice is a cookie read on the server** (`fursa-theme`: light, dark, system). The server renders the right mode, so there is no flash. This also makes every page dynamic, which was already true because of the nonce.
4. **`/dev/style` is not built in production.** It is `page.dev.tsx`, and `next.config.ts` only enables the `dev.tsx` page extension outside production. In a production build the route does not exist.
5. **TypeScript 6, not 7.** `typescript-eslint` does not support TypeScript 7 yet. Revisit when it does.
6. **Tailwind and shadcn are mapped to the tokens only.** The default Tailwind palette, radii, shadows and type scale are cleared, so a value outside `fursa design.md` cannot be used by mistake. shadcn's own `accent` color (a hover surface) is not used: here `accent` is the blue. When adding a shadcn component, check its classes (`bg-accent`, `rounded-md`, `shadow-*`) against the design file.
7. **Default locale is `en`** for visitors with no language signal. Browsers that send a language header get ar, fr or en when it matches.
8. **Source guardrails as tests** (`tests/guardrails.test.ts`): no physical-direction classes, raw hex, bold, italics, all-caps, gradients, `dangerouslySetInnerHTML` or web storage in `src/`.
