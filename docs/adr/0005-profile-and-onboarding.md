# 0005. Profile, onboarding and the language setting (step 6)

Status: accepted. Date: 2026-10-24.

## Decisions

1. **Server state in TanStack Query.** `AppProviders` (query cache and toasts) wraps the signed-in shell and the onboarding layout. Queries keep data 30 seconds; a failed call is retried once, and only for the network or a 5xx (a 4xx is the person's to fix, so it is not retried).
2. **Only what changed is sent.** The profile form keeps a baseline (the last saved values); `buildPatch` compares and sends just the changed fields, as `PATCH /v1/profile` is a partial update. Nothing changed means no call and the sentence "No changes to save."
3. **Salary is checked twice.** The form finds the common problems first (whole number, 0 or more, minimum not above maximum, a 3-letter currency, a currency when there is an amount). A problem the API still finds (`invalid_salary_range` or a 422 with the field in `loc`) is put on the same field. Other errors show in a sentence with the code.
4. **Tag input, not a comma string.** Roles, skills and places are lists (limits 50, 200, 50, from the contract). Enter or a comma adds, Backspace on an empty field removes the last, a paste with commas or new lines becomes several items (handled in `onPaste`, because a single-line field flattens new lines), duplicates are ignored in any letter case.
5. **Onboarding saves per step.** Five steps, one question each. Next saves that step; Skip for now discards what was typed on it and moves on; the last step saves the alert preferences and goes to the feed. A new account lands here (`START_FOR_NEW_ACCOUNT`), straight after sign up or after the email link. It is prefilled if data exists. Changing language in the middle returns to step 1 (the page is reloaded in the other language), with the saved data prefilled.
6. **Language is also an account setting.** `LanguageSwitcher syncAccount` calls `PATCH /v1/settings` before changing the page, so emails and the next sign-in use it. If that call fails the page still changes and a toast says the choice was not saved to the account. Public pages and the sign-in pages do not sync (there is no account yet).
7. **Empty feed.** While the profile has no target roles, the feed says so and offers one action (add them). The feed itself is step 7.

## Not done here

- CV upload (the API has no endpoint for it).
- Telegram linking (step 8).
- `weights` of the profile (the API accepts them; the interface does not expose them in v1).
