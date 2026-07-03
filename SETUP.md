# Magnum CPA Academy — Setup Guide

A complete e-learning platform for Magnum CPA:

- **Admin portal** — build & publish courses (video tasks + knowledge check), post updates, track who finished, ping stragglers, manage employees, links and settings.
- **Employee portal** — Updates feed (home), Courses, Certificates, Links, Organizational Chart, behind a hover-to-expand side navigation.
- **Hosting**: GitHub Pages (free). **Database**: a Google Sheet, powered by Google Apps Script (free). **Emails**: open your mail app pre-filled (mailto), plus automatic Google-Form completion notifications.

---

## Try it right now (demo mode)

Before any setup, open `index.html` in a browser (or run a local server). While
`js/config.js` has an empty `API_URL`, the site runs in **demo mode**: everything
works, but data is saved only in that browser.

> Demo login: **glenn@magnumcpa.com** / **ChangeMe123!**

Demo mode is for previewing only — for the real thing, follow Parts A–C (about 15 minutes).

---

## Part A — Create the Google backend (one time, ~10 min)

1. Go to [sheets.new](https://sheets.new) and create a blank spreadsheet.
   Name it **Magnum CPA Academy DB**.
2. In the sheet: **Extensions → Apps Script**. Delete any code in the editor.
3. Open `apps-script/Code.gs` from this folder, copy **everything**, and paste it
   into the Apps Script editor. Click 💾 Save.
4. In the toolbar dropdown (next to “Debug”), select the function **`setup`**
   and click **Run**. Google will ask for permissions — click through
   *Review permissions → your account → Advanced → Go to … (unsafe) → Allow*.
   (It is your own script; “unsafe” is Google's standard wording for personal scripts.)
   When it finishes, the spreadsheet has all its tabs and a default admin account.
5. Click **Deploy → New deployment**. Click the ⚙ gear → **Web app**, then set:
   - Description: `Academy API`
   - **Execute as: Me**
   - **Who has access: Anyone**
   Click **Deploy** and **copy the Web app URL** (ends in `/exec`).
6. Open `js/config.js` in this folder and paste the URL:
   ```js
   API_URL: 'https://script.google.com/macros/s/…/exec',
   ```

> ⚠️ **Editing the backend later?** After changing Code.gs, go to
> **Deploy → Manage deployments → ✏️ pencil → Version: New version → Deploy**.
> Do **not** create a *new* deployment — that changes the URL and breaks the site
> until you update `config.js`.

## Part B — Put the site on GitHub Pages (~5 min)

1. Create a repository at [github.com/new](https://github.com/new)
   (e.g. `magnum-cpa-academy`). **Private repos need GitHub Pro for Pages** —
   a public repo is fine because all data lives in your Google Sheet, not the repo.
2. In this folder run:
   ```
   git init
   git add .
   git commit -m "Magnum CPA Academy"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/magnum-cpa-academy.git
   git push -u origin main
   ```
   (The `.gitignore` already keeps the 1.3 GB video folder and unused images out.)
3. On GitHub: **Settings → Pages → Source: Deploy from a branch → main / (root) → Save.**
4. After ~1 minute your site is live at
   `https://YOUR-USERNAME.github.io/magnum-cpa-academy/`.

## Part C — First login

1. Open the live site and sign in: **glenn@magnumcpa.com / ChangeMe123!**
2. You'll be asked to set your own password immediately.
3. Go to **Settings** and set:
   - **Team email (To)** — who receives "new course/update" notifications.
   - **CC list** — optional, comma-separated.
4. Go to **Employees → + Add employee** for each team member
   (name, email, temporary password — they change it on first login).

## Part D — Completion notifications via Google Form (optional, ~5 min)

Get an email automatically whenever someone passes a knowledge check:

1. Create a Google Form named e.g. **Course Completion** with five
   **Short answer** questions: `Employee Name`, `Email`, `Course`, `Score`, `Date`.
2. In the form's **Settings** tab: make sure *Require sign-in / Limit to 1 response*
   is **off** and *Collect email addresses* is **off**.
3. In **Responses**, click **⋮ → Get email notifications for new responses**.
4. Click **⋮ (top right) → Get pre-filled link**. Fill the fields with exactly:
   - Employee Name: `{{name}}`
   - Email: `{{email}}`
   - Course: `{{course}}`
   - Score: `{{score}}`
   - Date: `{{date}}`
   Click **Get link → Copy link**.
5. Paste that link in **Admin → Settings → Pre-filled completion form link** and save.

Now every first-time pass submits a form response (with real values in place of the
tokens) and Google emails you. The **Tracking** tab shows everything regardless.

## Part E — Creating your first course

**Videos:** course videos do *not* live on GitHub (file size limits). Upload each
video to **Google Drive** and set sharing to **“Anyone with the link – Viewer”**
(or upload to YouTube as **Unlisted**). Paste the link into the course builder.
For Drive videos also enter the video length — it controls when the “Next”
button unlocks (YouTube and .mp4 videos unlock automatically when they end).

1. **Courses → + New course**: title (manual), description, and the
   **registration Google Form URL** (create any registration form you like —
   employees must submit it before starting).
2. **Add tasks** — each task = one short video + the subtask presentation text
   shown after the video. Tasks unlock in order.
3. **Add 10–15 knowledge-check questions**, ticking the radio button next to each
   correct answer. Publishing is blocked until the question count is 10–15.
   Correct answers never leave the server — employees can't see them in the browser.
4. **Save & publish** → you'll be offered a pre-filled email to notify the team.
5. Watch progress under **Tracking**; use **Ping** to nudge anyone not done.
   **Close** a course anytime — it disappears from the employee catalog
   (progress and certificates are kept, and you can reopen it later).

Employees then: register → enter their certificate name → complete tasks →
pass the knowledge check (≥85%) → print/download their certificate, which also
appears under **Certificates** permanently.

---

## Smoke-test checklist (after setup)

1. Admin: log in → forced password change → set Settings → add a test employee.
2. Admin: create a course (2 tasks — one YouTube, one Drive video; 10 questions)
   → publish → "Notify team" opens your mail app correctly.
3. Employee (different browser / incognito): log in → change password →
   Updates/Links/Org Chart tabs load → open the course → register (form opens)
   → enter certificate name → task 2 is locked until task 1 completes →
   video gate unlocks "Next" → complete both tasks → Knowledge Check unlocks.
4. Fail the quiz on purpose (score < 85%): score shows, wrong questions are
   marked, answers are NOT visible anywhere (check DevTools → Network).
   Retake and pass → certificate appears → print preview looks right.
5. Admin: Tracking shows "Completed + score"; your Course Completion form
   (Part D) received a response; **Ping** emails only the unfinished employees.
6. Close the course → it disappears from the employee's Courses tab.

## Good to know

- **Security scope**: this is an internal training tool. Logins, sessions and
  role checks are enforced server-side and passwords are salted-hashed, but it is
  not bank-grade security — don't store sensitive client data in courses.
- **The Sheet is your database.** You can *look* at it anytime, but avoid editing
  rows by hand (especially IDs). Back it up with File → Make a copy.
- **Loading speed**: Google Apps Script adds ~1–3 s per request — the site shows
  loading indicators; this is normal for the free tier.
- **Demo mode** (`API_URL: ''`) never touches the Google Sheet.
