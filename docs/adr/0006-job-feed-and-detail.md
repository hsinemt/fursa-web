# 0006. Job feed and job detail (step 7)

Status: accepted. Date: 2026-10-24.

## Decisions

1. **Two routes, one layout.** The list is `/feed` and a job is `/jobs/<id>`. Both sit in the route group `(app)/(feed)`, whose layout (`FeedShell`) renders the list and the page beside it. The list therefore stays mounted, with its loaded pages, while a job is open. On laptop they sit side by side; on smaller screens only one shows, chosen from the path. A job is a real address, so alerts and the pipeline can link to it later.
2. **Cursor pagination with `useInfiniteQuery`.** One query per status filter (`["feed", status]`), 20 jobs per page, "Load more" calls `fetchNextPage` while `next_cursor` is set. Nothing loads everything. A job seen on two pages (the list moved between requests) is shown once.
3. **`invalid_cursor` resets the list.** The query for that filter is reset, which refetches from the first page, and a toast says so. Session errors go through `useApiErrorHandler` (401 to login, deleted account signs out). A 429 counts down (`useCountdown`) and the retry button waits for it. All of this is in `LoadError`, used by the list and the detail.
4. **The filter is in the address** (`?status=`), so it survives reloads and the Back button, and a job link keeps it so Back to the feed returns to the same filter.
5. **Status changes are optimistic.** `useSetStatus` writes the new status into the job's cache entry and every loaded feed list before the request, restores both if the API refuses, and replaces the job with the API's answer on success. Feed lists are marked stale (not refetched at once), so a job that no longer fits the open filter leaves it the next time the list loads and does not jump away under the cursor.
6. **Scraped text is plain text.** `htmlToText` drops tags (and script, style and iframe contents), keeps line and paragraph breaks, decodes entities and removes control and bidi-override characters. React renders the paragraphs as text; there is no `dangerouslySetInnerHTML` anywhere. The posting link opens only when it is `http` or `https`, with `rel="noopener noreferrer"`.
7. **`extracted` and `breakdown` are untyped in the contract.** `readFacts` and `readBreakdown` read only the keys the API writes today (`remote_type`, `employment_type`, `seniority`, `salary`, `languages`, `tech_stack`, `visa_sponsorship`, `relocation_support`; `components`, `matched_skills`, `job_level`) and check each value. Anything unknown or missing is left out, never shown as "unknown". Skills the posting names that the profile did not match are the posting's `tech_stack` minus `matched_skills`. For the API project: type these two objects in the contract.
8. **No match count.** The API returns no total, so the header shows no count (the sort control sits there instead).
9. **Row link without an i18n import.** `JobRow` takes a `link` function instead of importing the router link, so the welcome page's static example (which has no router context) keeps using the same row.
10. **Sort is client-side.** The API has no sort parameter, so "Newest" orders the jobs already loaded by posting date (`?sort=newest`); "Best match" is the API order. Needs an API `sort` parameter to be exact across pages.
11. **Logo tile, not a logo.** The API sends no company logo. `CompanyLogo` shows the initial and takes a `src` when a logo field exists.
12. **Repaired text.** Some scraped text arrives double-encoded (UTF-8 read as Windows-1252). `repairText` turns each such run back into the right characters, and C1 control characters are dropped.
13. **Description in two modes.** Summary (default when it can be made) shows `extracted.summary` when the API has one, then Responsibilities, Qualifications and Benefits cut from the posting under its own headings (`splitSections`, English, French and Arabic heading words, 8 points at most). It never rewrites the text. Full posting is the whole plain text. A real AI summary of each posting would come from the API.
14. **Full width, two columns.** The feed uses the whole screen; the job has a main column and a 20 rem side panel (score and breakdown, skills, facts).

## Not done here

- Search and richer filters (the API has none).
- The pipeline board (step 10); it reuses `useSetStatus`.
- Notification links into a job (step 8 onward).
