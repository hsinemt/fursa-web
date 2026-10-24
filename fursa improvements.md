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
- **Contract notes.** It documents a bearer scheme and has no 403 responses.

## Frontend only

- Look at the feed in dark mode, on tablet and on phone after the full-width redesign (only laptop width was checked in a browser).
