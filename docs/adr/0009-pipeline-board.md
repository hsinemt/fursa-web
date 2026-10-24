# 0009. Pipeline board (step 10)

Status: accepted. Date: 2026-10-25.

## Decisions

1. **dnd-kit core, no sortable.** The board only moves a card from one column to another (no manual order inside a column: the API orders by score), so `@dnd-kit/core` is enough (draggable cards, droppable columns, pointer and keyboard sensors, a drag overlay). Added in this step, as planned in `fursa web.md`.
2. **One feed query per status**, as the web rules say: the same `useFeed(status)` as the feed (`["feed", status]`), 20 jobs per page, "Load more" per column. Nothing loads everything. Because the cache is shared, a job saved from the feed shows up on the board without another request when the column is already loaded, and the board's lists are marked stale for the next visit.
3. **A move is an optimistic cache edit.** `useMoveJob` takes the job out of the source column's pages and puts it into the target column's pages in score order (only if that column is loaded; otherwise the column fetches it later), updates the "all" feed list and the job's own entry, then sends `PUT /v1/jobs/{id}/status`. On error every list it touched is restored from a snapshot and a toast says so; on success the API's answer replaces the job. The same pure helpers (`removeFromPages`, `insertByScore`) are tested alone.
4. **Drag is one of three ways.** Pointer drag (a 6 px distance first, so a click still opens the job), keyboard drag (dnd-kit's keyboard sensor, with translated instructions and announcements) and a **Move to** menu on each card for touch and anyone who cannot drag. The menu also offers "Back to new".
5. **Responsive without a second implementation.** The four columns are rendered once. Phones (and the List view) show the tabs and one column at a time; wider screens show all of them in a snapping scroller (tablet) or a four-column grid (laptop). The List view and the phone view are the same layout.
6. **Counts are loaded counts.** The API gives no total, so a column header shows how many are loaded and "+" while there is another page.

## Not done here

- Ordering inside a column (the API orders by score).
- An "Offer" column (the API has no such status yet; the dot is ready in the design).
- Notes or dates on a card.
