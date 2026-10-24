# Fursa improvements

Things we agreed to improve later. Rule: when you say "we will improve it", the item is added here; when it is done, the item is deleted from this file (the history stays in git).

## Needs a change in the API (`fursa-api`, read only from this repo)

- **Company logo.** The API sends no logo. Add a `logo_url` (or similar) to the job; the feed then passes it to `CompanyLogo` (`src`), which today shows the company initial.
- **Real "Newest first" sort.** The API has no sort parameter, so "Newest" only orders the jobs already loaded. Add `sort` (for example `best`, `newest`) to `GET /v1/feed`; then the sort select asks the API instead of sorting in the browser.
- **More filters.** Only `status` exists. Filters wanted later: place, work mode, job type, level, date posted, salary, and search by title or company.
- **Structured summary of a posting.** Summary mode cuts Responsibilities, Qualifications and Benefits from the posting's own headings, which fails on postings without clear headings. The API should write `responsibilities`, `qualifications` and `benefits` lists (and `summary`) into `extracted` for every job, in the user's language; the frontend then shows them instead of the heading search.
- **Type `extracted` and `breakdown` in the contract.** They are free-form objects today; the frontend checks each key by hand.
- **A total in the feed answer** (to show "N matches" in the list header).
- **`DOCS_ENABLED` bug.** The API `app` container exits at start when `DOCS_ENABLED` is empty (`docker-compose.yml` passes `${DOCS_ENABLED:-}`). Workaround: set it to `true` or `false` in the API `.env`.
- **Close the login on account deletion.** `DELETE /v1/account` erases the data but the identity provider (Supabase) login is closed separately. The API should close it, or say how the web app can.
- **Contract notes.** It documents a bearer scheme and has no 403 responses.

## Frontend only

- **Legal review and contact address.** The Privacy and Terms texts are drafts written from how the app works. Have a lawyer review them, then set `NEXT_PUBLIC_CONTACT_EMAIL` so the contact line appears. Native-speaker review of the French and Arabic copy of the whole app is also still to do.
- **Rename "Pipeline" to "Job tracker"** (decide: labels only, or the address `/pipeline` too).
- **Profile page design.** The first redesign (summary rail with profile strength, section cards, save bar) is good but not finished: look again at the details, the empty state, dark mode, phone and tablet, and the spacing and weight of the cards.
- Look at the feed in dark mode, on tablet and on phone after the full-width redesign (only laptop width was checked in a browser).
