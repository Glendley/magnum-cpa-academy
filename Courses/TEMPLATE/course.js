/* ============================================================
   COURSE CONTENT — authoring file
   ------------------------------------------------------------
   HOW TO USE THIS FOR A NEW COURSE:
   1. Copy this whole "TEMPLATE" folder, rename the copy to a short
      slug for your course (e.g. "payroll-basics").
   2. Edit course.js (this file) and knowledge-check.js in that copy.
   3. Ask Claude: "push the <course name> course live" — Claude reads
      both files and publishes them to the site. You don't need to
      touch the website's builder or the Google Sheet directly.

   NOTES
   - This file is never loaded by the live website and is never run
     by Node — it's a plain, human-editable data file. Comments (the
     // lines) are fine; write yourself notes here freely.
   - videoUrl accepts a Google Drive share link ("Anyone with the
     link" must be turned on), a YouTube link, or a direct .mp4 URL.
   - durationMinutes is REQUIRED for Google Drive videos (Drive gives
     no "video finished" signal, so the site uses this to time when
     the "Next" button unlocks). Not needed for YouTube/.mp4 — leave
     it 0, the site detects the real end of those automatically.
   - contentHtml is the lesson shown right after the video. Plain
     text works; simple HTML tags (<h2>, <p>, <ul><li>, <table>, <b>,
     <a href="...">) are also supported and rendered as written.
   - Tasks don't have a separate "one-line description" field — if you
     want a short subtitle for a task, make it the first line of its
     contentHtml (e.g. an italic intro sentence).
   - Tasks unlock in order for employees, top to bottom, exactly as
     listed here.
   ============================================================ */

const course = {
  title: "",                       // shown in the employee course catalog
  description: "",                 // one or two lines shown on the catalog card
  registrationFormUrl: "",         // Google Form employees submit before starting (optional)
  passThresholdPct: 85,            // % needed on the Knowledge Check to earn the certificate

  tasks: [
    {
      title: "",                   // e.g. "Foundations & the Software"
      videoUrl: "",                // Drive / YouTube / direct .mp4 link
      durationMinutes: 0,          // required for Drive videos, ignored otherwise
      contentHtml: `

      `                            // exact lesson text/HTML for this task
    }
    // ...add one object per task, in the order employees should see them
  ]
};
