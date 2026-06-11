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
| `docs/firebase-config.js` | Where you paste your Firebase keys (step 1) |

No server to run — pages are hosted free on GitHub Pages, votes go through Firebase
(free tier). To copy this setup, you only need a Google account (Firebase) and a
GitHub account.

---

## Setup (one time, ~25 minutes)

### Step 1 — Create a free Firebase database

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and sign in with a Google account.
2. Click **Create a project** (or "Add project"). Name it anything, e.g. `live-poll`. You can turn off Google Analytics. Click through to create it.
3. In the left menu: **Build → Realtime Database → Create Database**. Pick the location closest to you, and choose **Start in test mode**.
4. Go to the **Rules** tab of the database and replace the rules with this, then click **Publish**:
   ```json
   {
     "rules": {
       "sessions": {
         ".read": true,
         ".write": true
       },
       "users": {
         "$uid": {
           ".read": "auth != null && auth.uid === $uid",
           ".write": "auth != null && auth.uid === $uid"
         }
       }
     }
   }
   ```

   The `sessions` section is deliberately open so voters can vote without accounts —
   fine for live polling, but don't store anything sensitive. The `users` section is
   required for the **My results** page: signed-in voters' answer history is stored
   under `users/{their-id}/answers`, readable only by them.
5. **Enable sign-in:** in the left menu, **Build → Authentication → Get started →
   Sign-in method**, enable **Email/Password** (just the first toggle), and save.
6. **Create your presenter account:** on the Authentication **Users** tab, click
   **Add user** and enter the email + password you'll use to sign in inside the
   PowerPoint widget. (Voters who want to track their results can create their own
   accounts directly on the voting page — you don't make accounts for them.)
7. Click the **gear icon → Project settings**. Under "Your apps", click the **`</>`** (web) icon to register a web app. Name it `live-poll`. Skip hosting. It shows you a `firebaseConfig` code block.
8. Open `docs/firebase-config.js` in this folder and replace the existing values with the ones Firebase showed you. **Make sure `databaseURL` is included** — if Firebase's snippet doesn't show it, copy it from the Realtime Database page (it looks like `https://live-poll-xxxxx-default-rtdb.firebaseio.com`). These keys are safe to publish — Firebase web keys only identify the project; the rules above are what control access.

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
2. **Sign in** inside the widget with the presenter account from step 1.6. You only need to do this when PowerPoint forgets the session (it usually remembers).
3. **Name the session.** The **Session name** field at the top names the whole presentation (it defaults to the filename). Voters see it on their phones and it becomes the session's title on their **My results** page — pick something memorable like the talk's title.
4. **Build:** insert Live Poll on any slide you want a question on (one question per slide). Type the question and answer choices. To make it a quiz question, pick the **Correct answer** from the dropdown — leave it on "No correct answer" for a plain poll. Click **Save question**. Resize/position the box like any other object. Pick a **Theme** once — it applies everywhere.
5. **Present:** start the slideshow. When a poll slide appears, the box turns into a live bar chart with a QR code. The audience scans it once — after that, their phones follow along automatically as you move between poll slides.
6. **Reveal the answer:** once you're happy with the responses, click the **Reveal answer** button on the slide itself (next to the vote total). Voting closes, the correct choice gets a ✓ on screen, and every phone shows whether its vote was right. Click again (**Reopen voting**) to undo. On plain polls the button reads **Close voting** instead.
7. **Re-presenting to a new crowd?** Back in edit mode, click **🔄 New audience — reset all votes** at the bottom of any poll widget (click twice to confirm). Every count returns to 0, voting reopens, revealed answers are hidden again, and everyone can vote once more. Questions are untouched.
8. **Control remotely (optional):** open `https://YOUR-URL/host.html?s=SESSIONCODE` on your phone or a second screen to open/close voting or reset individual questions. The session code is shown in the widget while editing.

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
- **Privacy:** votes are anonymous counts (signed-in voters' history is private to them). The database rules let anyone read/write poll data — fine for live polling, but don't store anything sensitive in it.

## Troubleshooting

- **"Firebase isn't configured yet"** → re-check step 1.8, then re-upload `firebase-config.js` to GitHub.
- **"Sign-in failed"** → the presenter account must exist in Firebase **Authentication → Users**, and Email/Password sign-in must be enabled (steps 1.5–1.6).
- **Add-in doesn't appear in PowerPoint** → confirm the manifest is in the `wef` folder (step 4.1) and fully restart PowerPoint.
- **Blank box on the slide** → your GitHub Pages site may not be live yet (step 2.5), or the manifest URLs still have the old address.
- **A feature you just added doesn't show up** → the files on GitHub are stale. Re-upload the changed `docs` files and wait a minute; also try removing and re-inserting the widget (PowerPoint caches pages).
- **Phones don't update** → make sure the slideshow is running (questions only go "live" in slideshow mode) and the phone has internet.
- **Session name doesn't appear on results pages** → open the deck and sign in once in the widget; the name uploads automatically.
- **My results page can't load history** → the database rules must include the `users` section from step 1.4; re-publish them.
