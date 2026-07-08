/* ============================================================
   KNOWLEDGE CHECK — authoring file
   ------------------------------------------------------------
   Contains the correct answers. This repo is PUBLIC (GitHub Pages
   requires a paid plan to publish from a private repo), so real
   knowledge-check.js files are git-ignored — they stay only on
   your PC. Claude reads this file locally and uploads the answers
   straight into the Google Sheet backend; it never reaches GitHub.
   Employees are never shown this file — the live site only ever
   receives graded results, never the answer key itself.
   (This TEMPLATE copy has no real answers, so it's fine for it
   alone to stay tracked in git as a reference.)

   RULES (enforced when Claude publishes this course)
   - Must have between 10 and 15 questions.
   - Each question needs at least 2 choices.
   - correctIndex is 0-based: 0 = first choice, 1 = second, etc.

   To add a question, copy one of the { ... } blocks below and
   edit it. To remove one, delete its whole block.
   ============================================================ */

const knowledgeCheck = [
  {
    text: "",                                   // the question text
    choices: ["", "", "", ""],                  // 2–6 answer choices
    correctIndex: 0                             // index of the correct choice above
  }
  // ...10–15 question objects total
];
