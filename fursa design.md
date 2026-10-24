# Fursa Design

The visual and interaction rules for `fursa-web`. Read this before building or changing any screen. `fursa web.md` says how the app is built (stack, auth, API contract); **this file says how it looks and feels**. If the two disagree about something visual, this file wins; about architecture, `fursa web.md` wins.

The test console at `/dev` is exempt from these rules (plain and English only).

## Principles

1. **Quiet editorial utility.** Calm, dense, readable: closer to a good newspaper's job page or a tool like Linear than to a startup landing page.
2. **Data first.** Show the real information (title, company, place, date, source, score, why). Decoration never competes with it.
3. **One accent.** One blue marks what matters: the selected row, the score, the main action. Everything else is ink, slate and line.
4. **Our identity on a familiar structure.** We borrow how well-known job apps are *organized* (a few nav items, a list beside the detail, a board for tracking, a documents table). We never copy another product's visuals, wording, colors, icons or illustrations.
5. **Light and dark from day one,** each designed on its own, not an inversion.
6. **Arabic is first-class.** Right-to-left is designed in, not mirrored at the end.
7. **Calm tone.** Job hunting is stressful and people share personal data: no shouting, no urgency tricks, no upsell pressure.

## Color

All colors are CSS variables defined once (see "How to apply this"). **Components use token names only, never raw hex values.** Contrast was measured, not guessed: text needs at least 4.5:1, and parts of the interface (borders of controls, focus ring, status dots) at least 3:1.

| Token | Use | Light | Dark |
| --- | --- | --- | --- |
| `--page` | App background | `#F7F8FA` | `#0E1621` |
| `--panel` | Surfaces: lists, detail, dialogs | `#FFFFFF` | `#141E2B` |
| `--ink` | Main text | `#1B2430` | `#E8ECF2` |
| `--slate` | Secondary text, metadata | `#5B6675` | `#9AA6B5` |
| `--line` | Dividers and hairlines only | `#E1E5EB` | `#2A3646` |
| `--control` | Borders of inputs and buttons | `#858FA0` | `#66758A` |
| `--accent` | Actions, links, selected, score | `#1F4FA0` | `#6AA2F0` |
| `--accent-hover` | Hover | `#1A4388` | `#86B5F4` |
| `--accent-press` | Pressed | `#153875` | `#9CC3F7` |
| `--on-accent` | Text on accent fills | `#FFFFFF` | `#0E1621` |
| `--tint` | Selected row, matched chip background | `#EAF0FA` | `#1B2A44` |
| `--success` / `--success-bg` | Confirmed, offer | `#1F7A4D` / `#E6F4EC` | `#52C28A` / `#12301F` |
| `--danger` / `--danger-bg` | Errors, destructive | `#B42318` / `#FDECEA` | `#F2877C` / `#3A1A17` |
| `--warning` / `--warning-bg` | Heads-up, interview | `#8A5300` / `#FDF3DC` | `#E5B04A` / `#3A2C0C` |
| `--focus` | Focus ring | `#1F4FA0` | `#6AA2F0` |

Measured contrast, light / dark: ink on page 14.7 / 15.3, slate on page 5.5 / 7.4, text on accent 7.8 / 7.0, accent as link on page 7.4 / 7.0, accent on tint 6.8 / 5.5, control border on panel 3.3 / 3.6, success on its tint 4.7 / 6.4, danger on its tint 5.8 / 6.4, warning on its tint 5.7 / 6.9.

Rules:
- **Dark mode uses a dark `--on-accent`.** White text on the dark-mode blue fails contrast (2.6): never use it.
- **`--line` is for dividers.** It is far too faint for the border of an input or button: those use `--control`.
- **Never meaning by color alone.** A status has a dot *and* a word; an error has an icon *and* text; a matched skill has a check *and* the accent color.
- **The score is never green or red.** It uses the accent only (see "Score").
- **Choosing the mode:** the user's saved choice (light, dark, or system); system by default. Store the choice in a cookie so the server renders the right mode and there is no flash of the wrong one.
- No gradients, no transparency tricks for text, no extra colors outside this table without updating this file and the contrast test.

## Typography

| Use | Font | Notes |
| --- | --- | --- |
| Interface text | **IBM Plex Sans** (400, 500) | Latin (English, French) |
| Interface text, Arabic | **IBM Plex Sans Arabic** (400, 500) | Same family feel as the Latin |
| Headings, scores, wordmark | **DM Serif Display** (400) | Latin only. It has one weight. Arabic headings use Plex Sans Arabic 500 |

- Load with `next/font` (`display: swap`), with sensible fallbacks.
- **Two weights only** for text: 400 and 500. No bold, no italics for emphasis. DM Serif Display is used at its single weight (400) and never made bold.
- **Size scale:** 12, 13, 14, 16, 20, 24, 32 px. Body 14 to 16. **Nothing under 12.** The public welcome page adds a **display scale** for its large type (headline, statement, big numerals: 44 to 168 px, fluid with the screen width), set only in DM Serif Display or, in Arabic, Plex Sans Arabic 500. The app screens never use it.
- Line height 1.5 for Latin body, 1.7 for Arabic. No letter-spacing on Arabic.
- **Tabular numbers** (`font-variant-numeric: tabular-nums`) for scores, salaries and dates so columns line up.
- Sentence case everywhere. No all-caps labels.
- **Numerals:** Western digits (0-9) in all three languages, including Arabic.
- **Wordmark (until there is a logo):** "Fursa" in DM Serif Display, "فرصة" in Plex Sans Arabic 500. No icon.

## Shape, spacing and elevation

- **4 px grid.** Spacing steps: 4, 8, 12, 16, 24, 32, 48.
- **Corners:** 6 px for controls and chips (chips 4 px), 8 px for panels and dialogs. Nothing fully round except avatars and status dots.
- **Borders:** 1 px hairlines in `--line`; controls use `--control`.
- **No side lines.** Never put a colored or thick line on the start (or end) edge of a card, row, panel, quote or tab. No left-edge or right-edge accent bars of any kind, in any language direction. Hairlines on the top and bottom of a row or section are fine. A test fails the build if a side border appears in `src/`.
- **Shadows:** none, except a soft one on menus, popovers and dialogs so they lift off the page.
- **Lists are rows, not cards:** full-width rows separated by hairlines. No card inside a card. No grid of identical boxes.
- Content widths: forms and settings up to 640 px; reading text up to about 72 characters; the split view uses the full width.

## Layout, navigation and screen sizes

Breakpoints: **phone** under 640 px, **tablet** 640 to 1023 px, **laptop** 1024 px and up. Everything must work at all three, in both modes and both directions.

**Navigation items:** Feed, Pipeline, Profile, Settings. (Documents is added when the API supports it.)
- **Laptop and tablet:** a thin top bar: wordmark, the four items (the current one has a 2 px accent underline), then language, mode and the account menu on the far side.
- **Phone:** a **bottom tab bar** with the four items (easy to reach with a thumb). Language, mode and account live under Settings.
- The bar is white (`--panel`), flat, with a hairline below (or above on phones).

**Feed (the main screen):**
- **Laptop:** a split view: the list on one side (about 360 to 420 px), the selected job's detail beside it. The list has a header ("12 matches", "Best first"), then rows.
- **Tablet and phone:** two separate screens: the list, then the detail with a back arrow. The detail's actions (Open posting, Save) stay visible.
- **A row** shows: title, then company, place and how long ago on a quieter line, and the score on the end. The selected row has `--tint` as its background (and `aria-current`); the detail beside it shows what is selected. No side bar.
- **The detail** has this order: title; company, work mode, type and salary on one line; the **facts grid** (level, work mode, posted, and more); the matched and missing skills; the **"Why it matches"** note; the score breakdown; the description (plain text); actions.

**Pipeline:**
- **Laptop:** a board with a column per status.
- **Tablet:** the board scrolls sideways with snapping.
- **Phone:** one list with tabs for the statuses.
- A list view is available too. Moving a job is a drag on laptop and a menu on touch (drag is never the only way).

**Settings:** a single column up to 640 px, grouped (Language, Notifications, Telegram, Your data), each group with a hairline and a short explanation.

## Components

**Score.** The number in DM Serif Display (tabular), followed by a word band in `--slate`:
- **Strong** from 75, **Good** 60 to 74, **Partial** 45 to 59 (matches under 45 are not stored).
- The number uses `--accent`. In the detail, a plain **breakdown** lists the parts (title, skills, location, level, freshness) each with a thin bar and its number, so people see *why*. No circular gauges, no gradients.

**Status.** A 8 px dot plus the word. Never a loud filled badge.

| Status | Dot light / dark |
| --- | --- |
| New | `--accent` |
| Saved | `--slate` |
| Applied | `--ink` |
| Interview | `#B26B00` / `#E5B04A` |
| Offer | `--success` |
| Rejected | `#B4574D` / `#E08A80` |

(The API has no "offer" status yet; the dot is ready for when it does.)

**Skill chips.** A matched skill: `--tint` background, `--accent` text, a small check. A missing one: transparent with a `--line` border and `--slate` text. Corner 4 px, text 12 px.

**Buttons.** Height 40 px (44 px on touch), corner 6 px, weight 500.
- **Primary:** `--accent` fill with `--on-accent` text. **At most one per view.**
- **Secondary:** transparent, `--control` border, ink text. The default button.
- **Ghost:** text only, for low-priority actions.
- **Destructive:** danger-colored text on a secondary button. A filled danger button appears only inside a confirmation dialog.
- No disabled-looking primary buttons: keep the action available and explain on use.

**Forms.** Labels above fields (never the placeholder as the label), short helper text below, errors in `--danger` with an icon and a sentence that says what to do. Inputs use `--panel` fill and a `--control` border. Validation errors from the API (`details`) are shown beside the right field.

**Focus.** A visible 2 px `--focus` ring with a 2 px offset on every interactive element, in both modes. Never remove it.

**Empty states.** A short line that names the space, one line of help, and the next action. Text only: no stock illustrations. Example: "No matches yet. Add your target roles so Fursa can find jobs."

**Loading.** Skeleton rows with the same height as real rows. No spinners over whole pages.

**Errors.** An inline panel in `--danger-bg` with the message in plain words; the technical code in small text underneath. For a 429: "Too many requests. Try again in N seconds" with a countdown.

**Dialogs and toasts.** Dialogs only for decisions and destructive actions; deleting an account needs the user to type a confirmation. Toasts are short, one line, no exclamation mark, and they stay long enough to read.

**The AI note.** Plain text under a small heading **"Why it matches"** with a quiet **"Written by AI"** label in `--slate`. No sparkle icons, no special colors. If it is missing, say nothing about AI: just leave it out.

**Icons.** One outline icon set at one stroke width, 16 or 20 px, always with a text label except for the standard actions (close, back, search). No emoji. No pastel icon tiles.

## Right-to-left (Arabic)

- Logical properties only (as in `fursa web.md`): `ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`, `text-start`.
- The whole layout mirrors: the split view's list moves to the right, tabs and the bottom bar run right to left.
- **Mirror** icons that point or imply direction: back, forward, chevrons, arrows, "open posting" (external link keeps its diagonal arrow). **Do not mirror:** logos, checks, the clock, the search glass, media controls, charts' time axis.
- Western digits stay as they are. Latin text inside Arabic (company names, "Docker") uses its own direction automatically (`dir="auto"` on user and job text).
- Give Arabic more line height and slightly larger size where it looks small next to Latin.
- Every screen is checked in Arabic before it is called done.

## Motion

**In the app screens:** almost none. Changes take 120 to 200 ms with an ease-out, only opacity and small movement. No bouncing, no animated backgrounds. When the user has "reduce motion" on, remove movement entirely.

**On the public welcome page** motion is part of the identity, and it follows the scroll. It is still calm: ease-out only, no bouncing, no looping, no animated backgrounds, no effect that hides content from someone who cannot see it move. The named sequences are:
- **Word rise:** headlines rise word by word out of a mask (400 to 600 ms per word, 70 ms apart). The hero plays on load; other headlines play when they scroll into view.
- **Big number:** the hero score counts up from 0 on load (about 700 ms).
- **Reading line:** a 2 px accent line at the very top of the screen grows with the scroll position.
- **Pinned story:** "How it works" pins a stage on the page while three steps scroll past. The big numeral of the current step turns accent and the stage cross-fades (300 ms) to that step's scene: profile chips appear one by one, scores count up and thin bars fill, an alert slides in.
- **Sorted for you:** a thin accent rule passes down the example list, each score counts up (about 600 ms), then the rows slide into best-first order (200 ms each, 60 ms apart). Replay is available.
- **Statement:** the accent band's statement rises word by word when it scrolls into view.
- **Reveal:** other sections fade in and rise 8 px (200 ms) when they scroll into view.

Rules for all of them: each plays once per visit (Replay where it is offered); the final state is what the server renders, so it is also what is shown when scripts are off or "reduce motion" is on, with no movement at all; nothing runs in the app screens.

## Welcome page identity

The public page is our own: it is set like the front page of a newspaper, with large type and one bold block of color, not like a product landing page. It reuses the app's tokens and components and adds only these pieces:
- **Dual-script masthead:** "Fursa · فرصة" side by side (DM Serif Display and Plex Sans Arabic 500) above a double rule (a 2 px `--ink` line, then a 1 px `--line` line). It is the page's logo until a real one exists; the app screens keep the single wordmark.
- **Twin headline:** the hero headline is followed by the same line in the other script (Arabic under English and French, English under Arabic), set large in `--slate`.
- **Big numeral:** the hero shows one job's score as a huge numeral in DM Serif Display, in `--accent`, with its word and the reason sentence under it. A score is always shown with its reason.
- **Pinned story:** see "Motion". On phone and tablet the scenes sit under their step instead of being pinned.
- **Statement band:** "Fursa never applies for you" is set very large on a full-width `--accent` band with `--on-accent` text. It is the only solid block of the accent color on the page.
- **Index:** services are listed like a book's index: name, dotted leader, short description. Choosing one shows a small labeled sample beside it.
- **Closing band:** a full-width `--tint` band with a large headline and the main action.
- **Margin headings:** on laptop, section headings sit in a left margin column (right in Arabic) with the content beside them, under a hairline. On phone and tablet the heading sits above the content.
- **FAQ:** ruled rows, no boxes.

Rules: no side lines (see "Shape"); no invented numbers, claims, logos or testimonials; only things the app does today are shown as services, and what is missing is said plainly in one line; samples are labeled "Example"; no gradients, glass, blobs or stock images.

## Voice and wording

- Sentence case. Short. Specific. Verb first on buttons ("Save", "Open posting", "Link Telegram").
- No marketing words ("unlock", "seamless", "supercharge"), no "please", no "successfully", no exclamation marks, no emoji.
- Say what happened and what to do: "Your session expired. Sign in again."
- Numbers and facts over adjectives: "3 new matches since yesterday", not "Exciting new opportunities!".
- French and Arabic are written naturally, not translated word for word, and are reviewed by a native speaker before launch.
- Keep the AI note's own voice as the API writes it; do not rewrite it.

## Accessibility

- Contrast: text 4.5:1, parts of the interface 3:1, in both modes (see the table above). **A test in this project reads the token file and fails the build if any pair drops below these minimums.**
- Everything works with the keyboard alone, in a logical order, with the focus ring visible.
- Touch targets at least 44 by 44 px on touch devices.
- Never meaning by color alone. Real headings and labels, `lang` and `dir` set per page.
- Works at 200% zoom and with long French text without breaking layout.
- Respect the reduce-motion setting.

## Never do

- Gradients, glass or blur effects, glow, neon.
- **Side lines:** a colored or thick line on the start or end edge of a card, row, panel, quote or tab.
- Purple or indigo, or any color outside the token table.
- Pastel icon tiles, sparkle icons, emoji, stock illustrations, floating blobs.
- The default shadcn look: always apply our tokens, corners and fonts.
- Shadows on cards, cards inside cards, grids of identical boxes for lists.
- Centered hero layouts inside the app, decorative badges, all-caps labels.
- Text under 12 px, bold weights, italics for emphasis.
- Meaning shown by color alone.
- Urgency tricks, countdown pressure, pop-ups that sell something.
- Copying another product's look, wording, colors, icons or illustrations.

## How to apply this

1. **All tokens live in one file** (`src/styles/tokens.css`) as CSS variables for light and dark. The Tailwind theme and the shadcn theme are mapped to these tokens and nothing else.
2. **Fonts** are set up once in the root layout with `next/font`.
3. **A style page at `/dev/style`** (not built in production) shows every token and component in light and dark, left-to-right and right-to-left, so each step can be reviewed visually.
4. **Every step's report** includes screenshots or a short description for: light and dark, left-to-right and right-to-left, and phone, tablet and laptop widths, plus the result of the contrast test.
5. Changing a color, a font or a rule means **changing this file first**, then the tokens, then the screens.

## Decisions log

These were proposed and assumed from "okay"; change any of them and the file will be updated.

| Decision | Chosen |
| --- | --- |
| Palette | The provided blue ("Sidi blue" `#1F4FA0`), whitewash, ink and slate, with the dark values above |
| Warning color | An amber (`#8A5300` for text in light mode, `#E5B04A` in dark) |
| Pipeline status dots | New blue, saved slate, applied ink, interview amber, offer green, rejected muted red |
| Score words | Strong 75 and up, Good 60 to 74, Partial 45 to 59 |
| Digits in Arabic | Western (0-9) |
| Phone navigation | Bottom tab bar |
| Fonts | IBM Plex Sans, Sans Arabic and Serif |
| Name and logo | Text wordmark ("Fursa" and "فرصة") until a logo exists |

Open for later: a real logo, an illustration style (if ever needed), the hover look of rows, and a printed or exported look for data exports.
