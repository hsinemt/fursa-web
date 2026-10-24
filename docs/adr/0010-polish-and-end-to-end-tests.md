# 0010. Polish, legal pages and end-to-end tests (step 11)

Status: accepted. Date: 2026-10-25.

## Decisions

1. **Real Privacy and Terms pages.** The text is written from what the app does today (what is kept, who handles it, cookies, the person's choices; what Fursa is, that it never applies for you, that scores are estimates) and lives in the messages in all three languages (`legal.*`, sections as arrays read with `t.raw`). A quiet note says it is a draft until it has been reviewed by a lawyer and a native speaker. A contact line appears only when `NEXT_PUBLIC_CONTACT_EMAIL` is set, so no address is invented.
2. **Titles and the error page.** Every app page has a translated `<title>` (`pageTitle`, the layout adds "· Fursa"). A page that breaks shows `error.tsx`: one calm sentence, Try again, and a way back; only the error's digest (an id) is shown, never its text.
3. **End-to-end tests with Playwright** run the real app against two fakes kept in `e2e/` (Supabase and the Fursa API), so they need nothing else. They run as two projects, English (left to right) and Arabic (right to left), through the same specs. The fake API keeps its state in memory and has a reset. They check the main journeys and use a real mouse drag for the board.
4. **Accessibility is checked in a browser, not only in jsdom.** axe (WCAG 2 A and AA) runs on the public pages and every signed-in screen, in light and dark, left to right and right to left, with reduced motion on so animations are at their final state. Color contrast needs real layout and real colors, which jsdom cannot give.
5. **What the first run found, and fixed:** the inactive steps of the welcome page's "How it works" were dimmed with 40% opacity (text below 4.5:1: the design already forbids transparency tricks on text), so the heading now turns slate instead; and a link inside a sentence on the sign-in page was told apart by color alone, so `inline-link` is now underlined.
6. **CI** has a separate `e2e` job (after `check`) that installs Chromium and runs `pnpm test:e2e`, keeping the traces of a failed run for a week.

## Not done here

- Visual regression screenshots.
- Real-API tests (they need the API running; the contract test and the typed client cover the shape).
- Legal review of the text, and the contact address (see `fursa improvements.md`).
