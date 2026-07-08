/* ============================================================
   COURSE CONTENT — The Art of Tax Preparation
   ------------------------------------------------------------
   STATUS: scaffolded, NOT YET COMPLETE.
   Still needed before this can be pushed live:
   - durationMinutes for every task (Google Drive videos need this)
   - contentHtml for every task — exact text from the source PDF
     pages Glenn specified (see TODO comments below)
   - Wrap Up ("Excellent work is the goal") gets appended to the
     end of Task 6's contentHtml, per Glenn's decision — no
     separate task for it.

   Source PDFs (uploaded by Glenn, read via the pdf skill):
   - Task 1 (pages 4–10):     PDF "A" — Drive id 1Tgs44NHG494y_hiGCI90GsoZdz2TTY2W
   - Tasks 2–6 (pages 11–36): PDF "B" — Drive id 1r0yRLzF6KlCtfKPLEYwiJKm0PIGuoBOG
   ============================================================ */

const course = {
  title: "The Art of Tax Preparation",
  description: "A practical guide to preparing returns with confidence — from software fundamentals to running the client relationship.",
  registrationFormUrl: "https://forms.gle/SbCrpfdgJGprK9JL6",
  passThresholdPct: 85,

  tasks: [
    {
      title: "Foundations & the Software",
      videoUrl: "https://drive.google.com/file/d/1b-HAWNdjng3tsu4ZQ9f98-NimPBE-JsJ/view?usp=sharing",
      durationMinutes: 0,   // TODO: Glenn to provide
      contentHtml: `
        <p><em>From accounting fundamentals to a clean software workflow</em></p>
        <!-- TODO: exact content of PDF "A" pages 4–10 -->
      `
    },
    {
      title: "Reading the Return & the Client",
      videoUrl: "https://drive.google.com/file/d/1DtsrjXn640pwu99yuBeZyChRvBC-LxSE/view?usp=sharing",
      durationMinutes: 0,   // TODO: Glenn to provide
      contentHtml: `
        <p><em>Know what the client expects before you present</em></p>
        <!-- TODO: exact content of PDF "B" pages 11–14 -->
      `
    },
    {
      title: "Finding Every Advantage",
      videoUrl: "https://drive.google.com/file/d/1_5b1RZmandbmInA6gUjhg2gLJBiQbRAG/view?usp=sharing",
      durationMinutes: 0,   // TODO: Glenn to provide
      contentHtml: `
        <p><em>The subtle moves that lower the bill</em></p>
        <!-- TODO: exact content of PDF "B" pages 15–19 -->
      `
    },
    {
      title: "Growing Into the Craft",
      videoUrl: "https://drive.google.com/file/d/1XAIB2DqLafQhktw2Mw5WYTJtziFHvzy5/view?usp=sharing",
      durationMinutes: 0,   // TODO: Glenn to provide
      contentHtml: `
        <p><em>Building competence and knowing when to ask</em></p>
        <!-- TODO: exact content of PDF "B" pages 20–23 -->
      `
    },
    {
      title: "Running the Client Relationship",
      videoUrl: "https://drive.google.com/file/d/1EImm-ar-TMNu6KDalJRv6Kijcci-BT09/view?usp=sharing",
      durationMinutes: 0,   // TODO: Glenn to provide
      contentHtml: `
        <p><em>Meetings, mistakes, and year-over-year checks</em></p>
        <!-- TODO: exact content of PDF "B" pages 24–30 -->
      `
    },
    {
      title: "Closing the Loop & the Standard",
      videoUrl: "https://drive.google.com/file/d/1osh3oIkpzg2SVidTyaJ3H-jR9fowgJ1g/view?usp=sharing",
      durationMinutes: 0,   // TODO: Glenn to provide
      contentHtml: `
        <p><em>Confirm, schedule, plan — and the win-win-win</em></p>
        <!-- TODO: exact content of PDF "B" pages 31–36, followed by the
             Wrap Up section:

             Wrap Up — Excellent work is the goal

             "The art of tax preparation is noticing the subtleties: reducing
             liabilities, increasing refunds, securing the maximum credits a
             client is legally entitled to, and managing expectations the
             whole way through. Give yourself about two years to feel
             fluent — and lean on your team while you get there.

             Follow the practical ideas in this guide, keep the win-win-win
             in mind, and you'll build a career clients trust and the firm
             can grow with."
        -->
      `
    }
  ]
};
