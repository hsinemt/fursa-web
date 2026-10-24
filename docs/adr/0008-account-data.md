# 0008. Data export and account deletion (step 9)

Status: accepted. Date: 2026-10-24.

## Decisions

1. **Export is a file, never shown on screen.** `GET /v1/account/export` returns everything Fursa holds (account, profile, matches, AI runs, notifications). The page turns the answer into a JSON file in the browser (`Blob` and a temporary link with `download`) named `fursa-data-<date>.json`, then forgets it. Nothing is stored in the cache or logged. A line says the file holds personal data. The request is a mutation, not a query, so it is never cached or repeated by itself.
2. **Deletion needs a typed confirmation.** A destructive button opens a dialog (dialogs are for destructive decisions only). It says what is erased, that it cannot be undone and that the sign-in provider's login is closed separately (the API says so). The person types `DELETE` (the same Latin word in all three languages, so it works on any keyboard; case and surrounding spaces are ignored). Only then is the filled danger button usable.
3. **After deletion the session ends on the server.** The API answers 204; the page then calls a Server Action that clears both cookies and goes to the login page with `?notice=account_deleted`, which shows "Your account was deleted." The same action is used when any call answers `403 account_deleted` (for example from another tab), so the message appears there too. The ordinary sign out keeps its own `signed_out` notice.
4. **Errors stay in the dialog** as the error panel with the code, with a 429 wait and a session error going to login like everywhere else. The dialog stays open on failure so nothing is lost.

## Not done here

- Closing the Supabase login (the API does it separately; noted in `fursa improvements.md`).
- A cool-off period or an undo (the API deletes at once).
