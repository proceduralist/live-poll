# 🗳️ Live Poll — PowerPoint Add-in

Ask your audience multiple-choice questions during a presentation. They scan a QR code,
vote on their phones (any iPhone or Android — it's just a web page), and the results
bar chart updates live on the slide.

**What it can do**

- **Live polls** — one question per slide, live bar chart + QR code during the slideshow.
- **Quizzes** — optionally mark a correct answer. When you're satisfied with the votes,
  click **Reveal answer** right on the slide: the correct bar gets a ✓ and every phone
  shows whether its vote was right.
- **Session names** — name each presentation (e.g. the talk's title). Voters see it on
  their phones and in their results history.
- **Voter accounts (optional)** — voters can sign in to track their answers; the
  **My results** page shows every session they've answered, with scores.
- **Themes** — pick preset or custom colors; slides and voters' phones match.
- **New audience reset** — one button returns every count to 0 before you re-present.

**How it works:** each presentation gets its own session code (derived from the file, so
its QR code never changes). When a poll slide appears during the slideshow, every
connected phone automatically switches to that slide's question.

| File | What it is |
|---|---|
| `manifest.xml` | Tells PowerPoint about the add-in (you sideload this once) |
| `docs/widget.html` | The box on your slide: question editor while building, live chart + QR + reveal button while presenting |
| `docs/vote.html` | What the audience sees on their phones |
| `docs/review.html` | **My results** — a voter's answer history and quiz scores |
| `docs/host.html` | Optional presenter console (open/close voting, reset votes remotely) |
| `docs/index.html` | Simple landing page linking to the three pages above |
| `docs/poll-common.js` | Helper code shared by all pages |
| `docs/supabase-config.js` | Where you paste your Supabase project URL + key (step 1) |
| `supabase-schema.sql` | The database schema — run once when creating a Supabase project |

No server to run — pages are hosted free on GitHub Pages, votes go through Supabase
(free tier). To copy this setup, you only need a Supabase account and a GitHub account.

---

## Setup (one time, ~25 minutes)

### Step 1 — Create a free Supabase database

1. Go to [supabase.com](https://supabase.com), sign in (GitHub or email), and click
   **New project**. Name it anything, e.g. `live-poll`, pick the region closest to you,
   and set a database password (you won't need it for the add-in — it's for direct
   database access; store it somewhere safe). The free plan is fine.
2. **Create the tables:** in the left menu open **SQL Editor**, paste the entire
   contents of `supabase-schema.sql` from this folder, and click **Run**. This creates
   the tables, the security rules (Row Level Security), the vote-validity checks, and
   turns on live updates. You only ever do this once per project.
3. **Auth settings:** in **Authentication → Sign In / Up**, the **Email** provider is
   already enabled — that's all the add-in needs. **Recommended:** turn **off**
   "Confirm email". Voters sometimes create accounts mid-talk to track their answers,
   and with confirmation on they'd have to leave the poll to click an email link first.
4. **Create your presenter account:** in **Authentication → Users**, click
   **Add user → Create new user** and enter the email + password you'll use to sign in
   inside the PowerPoint widget. (Voters who want to track their results can create
   their own accounts directly on the voting page — you don't make accounts for them.)
5. **Copy your keys:** in **Project Settings → API Keys**, copy the **Project URL** and
   the **publishable key** (it starts with `sb_publishable_`). Open
   `docs/supabase-config.js` in this folder and paste them over the existing values.
   These two values are safe to publish — they only identify the project; the security
   rules from step 2 are what control access.

> **Coming from the old Firebase version?** The pages, manifest, and workflow are
> unchanged — only the database moved. Presenter and voter accounts need to be created
> once in Supabase (passwords can't be copied between services).

### Step 2 — Put this folder on GitHub Pages

1. Create a free account at [github.com](https://github.com) if you don't have one.
2. Click **+ → New repository**. Name it e.g. `live-poll`. Keep it **Public**. Create it.
3. Upload this folder's contents: on the repo page, **uploading an existing file** link (or "Add file → Upload files") and drag in `manifest.xml`, `README.md`, and the whole `docs` folder. Commit.
4. In the repo: **Settings → Pages**. Under "Build and deployment", set Source to **Deploy from a branch**, branch **main**, folder **/docs**. Save.
5. Wait a minute, refresh the Pages settings page — it shows your site URL, e.g.
   `https://yourname.github.io/live-poll/`
6. Test it: open `https://YOUR-URL/vote.html` in a browser. You should see the dark "Live poll" page.

> **Whenever you change a file later, re-upload it to the repo** — PowerPoint loads
> the widget from GitHub Pages, not from your computer. An out-of-date `widget.html`
> on GitHub is the most common reason a new feature "doesn't work".

### Step 3 — Point the manifest at your site

Open `manifest.xml` and replace every
`proceduralist.github.io/live-poll`
with your real address (e.g. `yourname.github.io/live-poll`). There are 4 places.
Re-upload the fixed `manifest.xml` to GitHub too (not required for the add-in to work, just to keep it backed up).

### Step 4 — Install (sideload) the add-in into PowerPoint

**Mac:**
1. Open Terminal and run (adjust the path to wherever this folder is):
   ```bash
   mkdir -p ~/Library/Containers/com.microsoft.Powerpoint/Data/Documents/wef
   cp "/path/to/this/folder/manifest.xml" ~/Library/Containers/com.microsoft.Powerpoint/Data/Documents/wef/
   ```
2. Quit PowerPoint completely (⌘Q) and reopen it.
3. Open a presentation. On the **Insert** tab, click the **Add-ins** dropdown (or **My Add-ins ▾**) — under **Developer Add-ins** you'll see **Live Poll**. Click it to insert the poll box onto the current slide.

**Windows:** sideloading uses a shared folder instead — follow Microsoft's guide
"[Sideload Office Add-ins on Windows](https://learn.microsoft.com/office/dev/add-ins/testing/create-a-network-shared-folder-catalog-for-task-pane-and-content-add-ins)", pointing it at this `manifest.xml`.

---

## Using it

1. **Save the file first.** The session code (and QR code) comes from the file's identity — an unsaved deck gives every slide its own temporary code.
2. **Sign in** inside the widget with the presenter account from step 1.4. You only need to do this when PowerPoint forgets the session (it usually remembers).
3. **Name the session.** Click the **⚙ gear** near the widget's top-right corner to open session settings. The **Session name** field names the whole presentation (it defaults to the filename). Voters see it on their phones and it becomes the session's title on their **My results** page — pick something memorable like the talk's title. The theme picker lives here too.
4. **Build:** insert Live Poll on any slide you want a question on (one question per slide). Type the question and answer choices. To make it a quiz question, pick the **Correct answer** from the dropdown — leave it on "No correct answer" for a plain poll. Click **Save question**. Resize/position the box like any other object.
5. **Present:** start the slideshow. When a poll slide appears, the box turns into a live bar chart with a QR code. The audience scans it once — after that, their phones follow along automatically as you move between poll slides.
6. **Reveal the answer:** once you're happy with the responses, click the **Reveal answer** button on the slide itself (next to the vote total). Voting closes, the correct choice gets a ✓ on screen, and every phone shows whether its vote was right. Click again (**Reopen voting**) to undo. On plain polls the button reads **Close voting** instead.
7. **Re-presenting to a new crowd?** Back in edit mode, open the **⚙ gear** settings in any poll widget and click **🔄 New audience — reset all votes** (click twice to confirm). Every count in the presentation returns to 0, voting reopens, revealed answers are hidden again, and everyone can vote once more. Questions are untouched.
8. **Control remotely (optional):** open `https://YOUR-URL/host.html?s=SESSIONCODE` on your phone or a second screen to open/close voting or reset individual questions. The session code is shown in the widget while editing. Sign in with the presenter account to use the control buttons — the database ignores control commands from anyone else.

## For the audience

- Scan the QR code → vote. No app, no account needed.
- Voters who **sign in** on the voting page (or create an account right there) get a
  personal answer history at `https://YOUR-URL/review.html` — every session they've
  answered, titled with your session name, with their quiz score.

## Good to know

- **One vote per phone per question.** Resetting a question (or the whole session) lets everyone vote again.
- **Votes are kept between showings** — closing PowerPoint doesn't clear them. Use **New audience** before re-presenting (see above).
- **Questions are saved inside the .pptx**, so the deck works on its own — and the same deck always keeps the same QR code. (Renaming or moving the file changes the session code.)
- **A re-vote replaces the old answer** in a voter's history — each question keeps one entry per session, so a reset round overwrites what that voter had before.
- **Late votes bounce.** The database itself rejects votes cast after voting closes (or against an old round) — not just the phone screen.
- **Privacy:** votes are anonymous counts (signed-in voters' history is private to them, enforced by Row Level Security). Anyone can read poll questions and counts — fine for live polling, but don't put anything sensitive in a question. Only your presenter account can edit questions, close voting, or reset counts.

## Troubleshooting

- **"Supabase isn't configured yet"** → re-check step 1.5, then re-upload `supabase-config.js` to GitHub.
- **"Sign-in failed"** → the presenter account must exist in Supabase **Authentication → Users**. If you left "Confirm email" on in step 1.3, the account must also be confirmed — dashboard-created users are confirmed automatically.
- **Add-in doesn't appear in PowerPoint** → confirm the manifest is in the `wef` folder (step 4.1) and fully restart PowerPoint.
- **Blank box on the slide** → your GitHub Pages site may not be live yet (step 2.5), or the manifest URLs still have the old address.
- **A feature you just added doesn't show up** → the files on GitHub are stale. Re-upload the changed `docs` files and wait a minute; also try removing and re-inserting the widget (PowerPoint caches pages).
- **Phones don't update** → make sure the slideshow is running (questions only go "live" in slideshow mode) and the phone has internet. If it still doesn't move, re-run `supabase-schema.sql` — its last line is what turns on live updates.
- **"This session belongs to a different presenter account"** → the deck's session code was first used by another account. Sign in with that account, or re-save the deck under a new filename (new file = new session code).
- **Session name doesn't appear on results pages** → open the deck and sign in once in the widget; the name uploads automatically.
- **A question shows on phones before you reach its slide (or the wrong question appears)** → that poll box isn't linked to its own slide. Each box shows the slide it's linked to in its footer (`Slide: s412`) while editing — click through your poll slides and check they're all different. To link a box, click once inside it in edit mode, then save the deck (⌘S); a box that says *not linked yet* stays silent during the show and prints a reminder on its slide. This is also why PowerPoint can't tell a copied poll box apart from the original: **duplicating a poll slide copies its link too**, so click inside the copy once to re-link it.
