# QualiTracker Quiz — GitHub + Google Sheets setup

Four pages (`index.html`, `quiz.html`, `leaderboard.html`, `admin.html`) backed by a Google Sheet.
No server to run — the Sheet + a small Apps Script is the backend.

## 1. Create the Google Sheet

1. Create a new Google Sheet.
2. Rename the first tab to exactly `Participants`. In row 1, paste these headers across A1:M1:
   `ID | Name | Region | District | Facility | PIN | Completed | Score | CorrectCount | TotalQuestions | RegisteredAt | CompletedAt | PhotoURL`
3. Add a second tab named exactly `Questions`. In row 1, paste these headers across A1:G1:
   `ID | Prompt | OptionA | OptionB | OptionC | OptionD | CorrectIndex`
4. Copy the Sheet's ID from its URL — the long string between `/d/` and `/edit`.

## 2. Add the backend script

1. In the Sheet, go to **Extensions > Apps Script**.
2. Delete the placeholder code and paste in the full contents of `apps-script-code.gs` from this folder.
3. At the top, set:
   - `SHEET_ID` — the ID you copied in step 1.4
   - `ADMIN_PASSWORD` — pick something and remember it (must match `config.js` later)
   - `DRIVE_FOLDER_ID` — optional. If you want participant photos on the leaderboard, create a folder in Google Drive, open it, copy the ID from its URL, and paste it here. Leave the placeholder text if you don't want photos — registration still works fine without it.
4. Click **Deploy > New deployment**.
5. Click the gear icon next to "Select type" and choose **Web app**.
6. Set "Execute as" to **Me**, and "Who has access" to **Anyone**. (This is required — without it, the website can't reach the script.)
7. Click **Deploy**. The first time, Google will show an authorization warning because it's your own unpublished script — click **Advanced**, then **Go to [project name] (unsafe)**, then allow access. This is normal for personal scripts.
8. Copy the **Web app URL** it gives you — it ends in `/exec`.

## 3. Point the website at your script

1. Open `config.js` in this folder.
2. Set `WEB_APP_URL` to the URL from step 2.8.
3. Set `ADMIN_PASSWORD` to match exactly what you set in the script.
4. Replace the sample `REGION_DATA` with your real regions, districts, and facilities.

## 4. Put it on GitHub Pages

1. Create a new GitHub repository.
2. Upload all five files from this folder — `index.html`, `quiz.html`, `leaderboard.html`, `admin.html`, `config.js`, `styles.css` — to the repo root. (`apps-script-code.gs` and this `README.md` don't need to go live; keep them for reference.)
3. Go to the repo's **Settings > Pages**.
4. Under "Build and deployment", set Source to **Deploy from a branch**, branch **main**, folder **/ (root)**. Save.
5. GitHub gives you a URL like `https://yourusername.github.io/your-repo-name/`. That's your site — `index.html` loads automatically as the home page.

## 5. Your four links

- Registration: `https://yourusername.github.io/your-repo-name/`
- Quiz login: `https://yourusername.github.io/your-repo-name/quiz.html`
- Leaderboard: `https://yourusername.github.io/your-repo-name/leaderboard.html`
- Admin: `https://yourusername.github.io/your-repo-name/admin.html`

Add questions via the admin page (single or bulk-paste) before the event, and QR-code the registration link.

## Notes

- Changes to `index.html`/`quiz.html`/etc. take a minute or two to go live after you push to GitHub.
- The Apps Script free tier easily handles a conference-sized crowd; if you ever hit Google's daily quota (very unlikely at this scale), it resets the next day.
- The admin password is now checked on the server for every write and for viewing the participant list — not just in the browser — which is a real security improvement over a purely client-side check.
