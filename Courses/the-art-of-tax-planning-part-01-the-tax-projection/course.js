/* ============================================================
   COURSE CONTENT — The Art of Tax Planning, Part 01
   ------------------------------------------------------------
   STATUS: content complete. Still needed before publishing:
   - review knowledge-check.js (14 questions drafted by Claude from
     the source PDF, kept local-only — see that file's header).

   Source: the Part 01 companion PDF (Drive file
   1K6UOpaXaQq7r1O7-1-R4_xKMTC254WO9), a 9-page visual guide to the
   6:59 source video. Page 3 of the PDF is its topic-by-topic map —
   the 19 numbered points below come straight from it, so numbering
   runs continuously across the course rather than restarting per task
   (same convention as The Art of Tax Preparation). Page 3 itself
   carries no teaching content, which is why Glenn's page list skips
   it.

   The PDF's timestamps are deliberately NOT carried into the headings,
   per Glenn: they run against the original single 6:59 video, but each
   task here plays its own file starting at 0:00, so a "2:06" label
   would point at nothing the employee can see. Keep new parts of this
   series consistent — numbers, no timestamps.

   Page → task mapping (as supplied by Glenn, and matching the PDF's
   own six sections and video ranges):
     Task 1 = pages 1-2   (0:00-0:53)   Task 4 = page 6    (2:44-3:30)
     Task 2 = page 4      (0:53-2:06)   Task 5 = pages 7-8 (3:30-4:41)
     Task 3 = page 5      (2:06-2:44)   Task 6 = page 9    (4:41-6:59)

   durationMinutes values were supplied by Glenn from the six Drive
   files (55s, 1:15, 41s, 47s, 1:14, 2:21) and are written as decimals
   that round back to those exact seconds.

   The PDF's illustration diagrams (the Jan–Jun 30–Dec timeline, the
   refund/break-even/owe dial, the withholding formula) are not
   reproduced — only their substantive text, per the platform's
   video/image-hosting constraints. The withholding formula is carried
   over as a sentence, and the three estimates as a table.
   ============================================================ */

const course = {
  title: "The Art of Tax Planning — Part 01: The Tax Projection",
  description: "Level One fundamentals — building a forward look at the client's year from last year's return and the latest pay stubs, so there are no nasty surprises at the end of the tax year.",
  registrationFormUrl: "https://forms.gle/BELk9JJ52NJQGHQj8",
  passThresholdPct: 85,

  tasks: [
    {
      title: "Why We Project",
      videoUrl: "https://drive.google.com/file/d/13zIppmPRsxiThY0lTo0D6uuEDSXz1sm0/view?usp=sharing",
      durationMinutes: 0.92,
      contentHtml: `
        <p><em>A forward look, built on facts</em></p>

        <h3>1. Welcome to the tax projection</h3>
        <p>A tax projection is a forward look at the year ahead, built from the best information available today. It isn't a guess and it isn't a return — it's a picture of where the year is heading while there's still time to change the outcome. The goal is guidance and peace of mind, so the client is never in for a nasty tax surprise at the end of the year.</p>
        <p><strong>In practice:</strong></p>
        <ul>
          <li>A projection looks forward; a return looks back.</li>
          <li>Build it from the best information available today, not perfect information.</li>
          <li>The deliverable is peace of mind — no surprise in April.</li>
        </ul>

        <h3>2. Sometimes the projection comes first</h3>
        <p>Your first interaction with a client is not always a tax return. Often it is a tax projection — they come to you mid-year, before there's anything to file, wanting to know what the year is shaping up to look like. Treat that conversation as real work with its own method, not as a preamble to the return.</p>
        <p><strong>In practice:</strong></p>
        <ul>
          <li>Expect some clients to arrive needing a projection, not a filing.</li>
          <li>A projection is a standalone engagement, not a warm-up.</li>
          <li>Nothing needs to be filed for the work to be valuable.</li>
        </ul>

        <h3>3. Something changed this year</h3>
        <p>Clients rarely arrive because everything stayed the same. Something changed, or something difficult is happening that wasn't there last year — a new job, or a one-time event like the sale of a home. The projection is how we replace that uncertainty with a plan.</p>
        <p><strong>In practice:</strong></p>
        <ul>
          <li>Assume there's a reason they're in front of you — find out what changed.</li>
          <li>New jobs and one-time events (like a home sale) are common triggers.</li>
          <li>Your job is to turn the unknown into a plan, not just a number.</li>
        </ul>

        <hr>

        <p><strong>What this course covers</strong></p>
        <ul>
          <li>Rebuilding the baseline from last year's tax return</li>
          <li>Projecting income forward from the most recent pay stubs</li>
          <li>The three estimates behind every simple projection</li>
          <li>The three outcomes every client asks about first</li>
          <li>Fine-tuning withholding with the W-4 and DE 4</li>
        </ul>
      `
    },
    {
      title: "Step One: Last Year's Return",
      videoUrl: "https://drive.google.com/file/d/1brD5xJSARSDy1GalNRdMoWqNNz1bp2pa/view?usp=sharing",
      durationMinutes: 1.25,
      contentHtml: `
        <p><em>Start with last year's return</em></p>

        <h3>4. Recreate the most recent return</h3>
        <p>Nearly every projection begins by recreating the client's most recent tax return. If we prepared it, we make a copy inside our tax software. If it was prepared elsewhere, we rebuild it. And because next year's software is never released yet, all of it happens in the current year's version.</p>
        <p><strong>In practice:</strong></p>
        <ul>
          <li>Ours to begin with? Copy the return inside the software.</li>
          <li>Prepared elsewhere? Rebuild it from the client's copy.</li>
          <li>Work in the current year's software — next year's doesn't exist yet.</li>
        </ul>

        <h3>5. Assume last year happens again</h3>
        <p>The starting point is a single working assumption: what happened last year may happen again this year. It could be right, it could be wrong, but it gives us far more information than assuming nothing at all. That baseline is what everything else gets measured against.</p>
        <p><strong>In practice:</strong></p>
        <ul>
          <li>Default assumption: this year mirrors last year.</li>
          <li>Being partly wrong still beats starting from nothing.</li>
          <li>The baseline is a measuring stick, not a prediction.</li>
        </ul>

        <h3>6. Different this year, or the same?</h3>
        <p>Assume the same employers and similar earnings, then let the client correct you — if something has changed, they'll usually volunteer it right away. If they held two or three jobs last year, ask about every one of them. The baseline exists so that nothing gets overlooked. Then ask the question that unlocks the projection: <em>do you expect this year to look different, or more of the same?</em></p>
        <p><strong>In practice:</strong></p>
        <ul>
          <li>Carry last year's employers and earnings forward, then invite corrections.</li>
          <li>Multiple jobs last year? Ask about each one individually.</li>
          <li>Ask outright whether this year looks different or the same.</li>
        </ul>
      `
    },
    {
      title: "Step Two: The Pay Stubs",
      videoUrl: "https://drive.google.com/file/d/1N2NhPZXDsfsqZiMKKfUDo2JECTTr-4hX/view?usp=sharing",
      durationMinutes: 0.68,
      contentHtml: `
        <p><em>Read the pay stubs</em></p>

        <h3>7. Pull the most recent pay stubs</h3>
        <p>The second anchor is the client's most recent pay stubs. Where last year's return tells you what usually happens, the stubs tell you what has actually happened so far this year — and they become the launch point for projecting the remainder of it.</p>
        <p><strong>In practice:</strong></p>
        <ul>
          <li>Always ask for the most recent stubs, not just the latest W-2.</li>
          <li>The return gives the pattern; the stubs give this year's reality.</li>
          <li>Project the rest of the year forward from where the stubs leave off.</li>
        </ul>

        <h3>8. June 30 marks half the year</h3>
        <p>A pay stub dated June 30 sits about six months into the year, so a first pass assumes roughly half the year's income is already earned. Then refine it. If the client worked more or less than usual in the first half, the follow-up is simple: how much more?</p>
        <p><strong>In practice:</strong></p>
        <ul>
          <li>Use the stub date to work out how much of the year is behind you.</li>
          <li>A June 30 stub means doubling is a reasonable first pass.</li>
          <li>Then ask whether the first half was typical — and adjust.</li>
        </ul>

        <h3>9. Bonuses: ask for a range</h3>
        <p>Clients often know a bonus is coming without knowing the amount. Don't let that stall the projection — ask for a range instead. Do they expect $10,000? $30,000? A range is enough to model the outcome honestly.</p>
        <p><strong>In practice:</strong></p>
        <ul>
          <li>"I don't know yet" is not a dead end — ask for a range.</li>
          <li>Offer figures to react to ($10,000? $30,000?) rather than an open question.</li>
          <li>Model the range openly instead of leaving the bonus out.</li>
        </ul>
      `
    },
    {
      title: "The Simple Return",
      videoUrl: "https://drive.google.com/file/d/11QeDqMEoCA7mt-J_Mhvxr23f8ZZ6ePVN/view?usp=sharing",
      durationMinutes: 0.78,
      contentHtml: `
        <p><em>Three estimates, five checks</em></p>

        <h3>10. The easy return profile</h3>
        <p>The classic first projection is a simple one: same filing status, same kinds of jobs, same types of income, with earnings simply moving up or down. Recognizing that profile tells you the projection is a matter of arithmetic rather than research.</p>
        <p><strong>In practice:</strong></p>
        <ul>
          <li>Simple means: status, job types and income types all unchanged.</li>
          <li>Only the amounts move — up or down.</li>
          <li>Learn this shape first; the complicated ones build on it.</li>
        </ul>

        <h3>11. The three estimates to make</h3>
        <p>From there, the projection rests on three estimates. Get these three right and the rest of the return follows.</p>
        <table>
          <thead><tr><th>Estimate</th><th>What it means</th></tr></thead>
          <tbody>
            <tr><td>Taxable income</td><td>What the year is shaping up to produce, based on everything known so far.</td></tr>
            <tr><td>Withholding</td><td>Estimated from the best information available, then verified against the stubs.</td></tr>
            <tr><td>Non-taxable income</td><td>Pre-tax items such as 401(k) contributions that reduce what gets taxed.</td></tr>
          </tbody>
        </table>
        <p><strong>In practice:</strong></p>
        <ul>
          <li>Estimate taxable income from everything you know today.</li>
          <li>Estimate withholding, then check it against the actual stubs.</li>
          <li>Don't forget pre-tax items like 401(k) — they lower what gets taxed.</li>
        </ul>

        <h3>12. Verify the five fundamentals</h3>
        <p>Every projection is only as good as its foundations. Confirm each of these with the client before presenting any numbers — filing status, income, withholdings, deductions, and the states they file in. A projection built on an assumed filing status or a missed second state isn't worth presenting.</p>
        <p><strong>In practice:</strong></p>
        <ul>
          <li>Confirm filing status, income, withholdings, deductions, states filed in.</li>
          <li>Verify with the client — don't infer the fundamentals from the file.</li>
          <li>Do it before you present numbers, not after.</li>
        </ul>
      `
    },
    {
      title: "Outcomes & the Withholding Fix",
      videoUrl: "https://drive.google.com/file/d/1O5yUmFdscWA68BLFSThiyui_ZeOKv1AG/view?usp=sharing",
      durationMinutes: 1.23,
      contentHtml: `
        <p><em>Refund, owe, or break even — and the levers that move it</em></p>

        <h3>13. Refund, owe, or break even</h3>
        <p>Once the fundamentals are verified, every client wants the same first answer: where is this year heading? There are only three outcomes — a refund, a break-even, or owing. Two questions almost always follow:</p>
        <ul>
          <li>"If a bonus lands, how much should I withhold from it for federal and state taxes?"</li>
          <li>"If I am on track to owe, how much extra can I withhold per pay stub to bring the year closer to break even?"</li>
        </ul>
        <p>Both are answered with the same projection, adjusted for the scenario at hand.</p>
        <p><strong>In practice:</strong></p>
        <ul>
          <li>Lead with the headline: refund, break even, or owe.</li>
          <li>Expect the bonus-withholding and extra-withholding questions next.</li>
          <li>One projection answers both — just re-run it for the scenario.</li>
        </ul>

        <h3>14. The W-4 and DE 4 method</h3>
        <p>Withholding is corrected on the federal W-4 and, for California, the DE 4. If the client is on track to owe, keep the form exactly as it is — take the projected shortfall, divide it by the number of paychecks left in the year, and add that amount as extra withholding on every remaining check.</p>
        <p><strong>In practice:</strong></p>
        <ul>
          <li>Federal fix = W-4; California fix = DE 4.</li>
          <li>Projected shortfall ÷ paychecks remaining = extra withholding per check.</li>
          <li>Leave the rest of the form alone — add the extra amount, don't re-engineer it.</li>
        </ul>

        <h3>15. When to stop withholding</h3>
        <p>When withholding to date already guarantees a refund, the client can simply stop withholding for the rest of the year. And if break-even is only a few months away, estimate when it arrives and advise exactly when to stop — in case they'd rather not wait on a refund.</p>
        <p><strong>In practice:</strong></p>
        <ul>
          <li>Refund already locked in? Withholding can stop for the rest of the year.</li>
          <li>Break-even coming soon? Work out the date and name it.</li>
          <li>Some clients would rather hold their cash than wait for a refund.</li>
        </ul>
      `
    },
    {
      title: "Recap & What's Ahead",
      videoUrl: "https://drive.google.com/file/d/1ZKIwKtzTwEUgs1zP2Fc2twJV_2ClbBTf/view?usp=sharing",
      durationMinutes: 2.35,
      contentHtml: `
        <p><em>The baseline comes first</em></p>

        <h3>16. Guidance and peace of mind</h3>
        <p>This is the Level One course. Before any advanced strategy, the first move in the art of tax planning is a temperature check on last year's return, confirmed against what the client expects this year. That's what produces guidance and peace of mind rather than a number the client can't act on.</p>
        <p><strong>In practice:</strong></p>
        <ul>
          <li>Strategy comes later — the baseline comes first.</li>
          <li>A temperature check means last year's return plus this year's expectations.</li>
          <li>Judge your work by whether the client feels informed, not impressed.</li>
        </ul>

        <h3>17. Next up: cash is king</h3>
        <p>The next part of the series turns to cash. Keeping cash available for retirement and health savings contributions is what makes better deductions possible — the planning only works if the money is there to move when the opportunity appears.</p>
        <p><strong>In practice:</strong></p>
        <ul>
          <li>Available cash is what converts a plan into a deduction.</li>
          <li>Retirement and health savings contributions are the first levers.</li>
          <li>Advise clients to keep cash on hand for them.</li>
        </ul>

        <h3>18. Today's takeaway checklist</h3>
        <p>Four things to carry into your next projection:</p>
        <ul>
          <li>Pull the baseline from last year's return and rebuild it in current software.</li>
          <li>Confirm what is, and is not, the same for income and withholdings.</li>
          <li>Ask whether today's income and withholding will stay consistent all year.</li>
          <li>Ask about any other taxable transactions the client should tell you about.</li>
        </ul>
        <p><strong>In practice:</strong></p>
        <ul>
          <li>Rebuild the baseline before you estimate anything.</li>
          <li>Separate what's unchanged from what's changed, explicitly.</li>
          <li>Ask the open question about other taxable transactions — don't wait to be told.</li>
        </ul>

        <h3>19. What the next videos bring</h3>
        <p>Beyond cash: how business owners can purchase and expense equipment, and how landlords unlock expedited depreciation. Along the way, reimbursements, travel, and the strategies that improve an outcome you can already see — which is the whole point of projecting it first.</p>
        <p><strong>In practice:</strong></p>
        <ul>
          <li>Equipment purchases and expensing for business owners.</li>
          <li>Expedited depreciation for landlords, plus reimbursements and travel.</li>
          <li>Every strategy assumes you can already see the outcome — so project first.</li>
        </ul>

        <hr>

        <h3>Wrap Up — From preparer to advisor</h3>
        <p>The projection is where tax preparation becomes tax planning: the same facts, read forward instead of backward, so the client has time to act on them.</p>
        <p>"Thank you for your sincere effort, and your dedication to becoming an excellent tax advisor as well as a tax preparer."</p>
      `
    }
  ]
};
