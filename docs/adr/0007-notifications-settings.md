# 0007. Notifications settings and Telegram linking (step 8)

Status: accepted. Date: 2026-10-24.

## Decisions

1. **Two groups on the settings page, saved differently.** _Alerts_ (email on or off, daily or instant, the hour of the daily digest in UTC, the minimum score) is a form with one **Save** button that sends only the fields that changed (`buildPreferencesPatch`), like the profile. _Telegram_ is a set of immediate actions (link, switch on or off, unlink), because linking happens outside the page and the server changes the preferences on its own when it finishes.
2. **The schedule is shared.** Frequency, digest hour and minimum score apply to both channels, so they show whenever email is on in the form or Telegram is on on the server, with one sentence saying so.
3. **Linking Telegram.** `POST /v1/notifications/telegram/link` returns a `t.me` link that works once and expires in 15 minutes (`expires_in_seconds`). The page shows **Open Telegram** (new tab, `rel="noopener noreferrer"`, only if the address is `https` on `t.me` or `telegram.me`), a countdown in minutes, and polls `GET /v1/notifications/preferences` every 3 seconds (`usePreferences({ poll: true })`) until `telegram_linked` is true. Then polling stops and a toast says it is linked. If the countdown ends first, polling stops and the page offers to link again. Leaving the page stops polling because the hook unmounts.
4. **Unlinking** is `DELETE /v1/notifications/telegram`; its answer is the new preferences, written straight into the cache. No dialog: it can be undone by linking again.
5. **Errors in plain words.** `telegram_not_configured` (503) and the rest use `useDescribeError`; a 429 counts down like on the feed; a session error goes to login.
6. **The email "unsubscribed on <date>" line** is shown from `email_unsubscribed_at`, so a person who used the link in an email understands why emails are off.
7. **Shared fields.** The frequency, hour and score fields are one component (`DeliveryFields`) used by onboarding (step 6) and settings.

## Not done here

- Data export and account deletion (step 9).
- Per-channel schedules (the API has one schedule).
