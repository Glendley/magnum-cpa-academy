/* ============================================================
   COURSE CONTENT — The Art of Tax Preparation
   ------------------------------------------------------------
   STATUS: content complete. Still needed before publishing:
   - knowledge-check.js: 10–15 questions (drafted by Claude from
     the source PDF, kept local-only — see that file's header).

   Source: "The Art of Tax Preparation-Preparer.pdf" (uploaded by
   Glenn), a single 37-page visual companion to the training video
   with per-topic timestamps — covers all 6 tasks below plus the
   Wrap Up, which is appended to the end of Task 6's contentHtml
   per Glenn's decision (no separate task for it). Illustration
   diagrams from the PDF are not reproduced — only the substantive
   text (topic description + "In practice" points) is carried over,
   per the platform's video/image-hosting constraints.
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
      durationMinutes: 4.25,
      contentHtml: `
        <p><em>From accounting fundamentals to a clean software workflow</em></p>

        <h3>0:24 — 1. A strong accounting background</h3>
        <p>Great tax work is built on solid accounting. The firm leans toward hiring CPAs and people who are simply strong with numbers — comfortable with bookkeeping, classification, and knowing how items get categorized. That fluency is the foundation the rest of the craft sits on.</p>
        <p><strong>In practice:</strong></p>
        <ul>
          <li>Be confident with debits, credits, and how transactions are classified.</li>
          <li>Know whether an item is an expense, asset, or liability before you touch the tax side.</li>
          <li>Accounting is the floor, not the ceiling — it gets you ready to learn tax.</li>
        </ul>

        <h3>0:56 — 2. Tax law is its own discipline</h3>
        <p>Standard accounting already deals with rules about how things should be characterized. Tax preparation adds a second rulebook on top: tax law. Being a preparer means carrying both — accounting principles and the tax code — and knowing where they diverge.</p>
        <p><strong>In practice:</strong></p>
        <ul>
          <li>Treat tax law as a required layer beyond bookkeeping.</li>
          <li>Complete your basic tax-law course to qualify for California and federal returns.</li>
          <li>When accounting and tax treatment differ, tax law wins on the return.</li>
        </ul>

        <h3>1:20 — 3. The client's goal: pay the legal minimum</h3>
        <p>A CPA prepares a return so the client pays the smallest amount of tax they are legally responsible for — and, equally, captures the maximum credits they are entitled to. Every entry should serve that outcome, not just land in the right software field.</p>
        <p><strong>In practice:</strong></p>
        <ul>
          <li>Aim for the lowest legal tax and the largest legitimate refund.</li>
          <li>Maximizing entitled credits is the same job as minimizing tax.</li>
          <li>Stay strictly within what the law allows — "legally responsible" is the boundary.</li>
        </ul>

        <h3>1:52 — 4. Don't just input — verify the output</h3>
        <p>Entering a W-2 in the right field is only half the job. The real check is the output: open the 1040 and the schedules and confirm the number flowed through correctly. Input screens and final forms don't always map one-to-one, so the software can be tricky.</p>
        <p><strong>In practice:</strong></p>
        <ul>
          <li>After each entry, look at how it lands on the 1040 and schedules.</li>
          <li>Expect that "where you type it" may differ from "where it shows up".</li>
          <li>Confirm the form reflects the tax law you intended — every time.</li>
        </ul>

        <h3>3:12 — 5. Keep a verification spreadsheet</h3>
        <p>A simple tracking sheet builds both accuracy and skill. Log the form you entered, the outcome you expected, the actual outcome, and any notes. When the actual matches, your confidence grows; when it differs, you've just learned something the software encoded for you.</p>
        <table>
          <thead><tr><th>Form</th><th>Expected</th><th>Actual</th><th>Notes</th></tr></thead>
          <tbody>
            <tr><td>W-2</td><td>+$2,400</td><td>+$2,400</td><td></td></tr>
            <tr><td>1099-R</td><td></td><td>+$700</td><td></td></tr>
            <tr><td>Sch C</td><td>-$0</td><td>mileage</td><td>check</td></tr>
          </tbody>
        </table>
        <p><strong>In practice:</strong></p>
        <ul>
          <li>Columns: form entered, expected outcome, actual outcome, notes.</li>
          <li>Matches confirm your understanding; mismatches are learning moments.</li>
          <li>A difference often means the software baked in a tax rule you didn't know.</li>
        </ul>

        <h3>3:40 — 6. Use your research tools in order</h3>
        <p>When a result still isn't clear, read the schedule first — does it explain the adjustment? If you need more, the firm's tools form a ladder: a quick assistant for fast questions, a stronger model for technical depth, and a specialized tax tool when you need the most thorough, trustworthy explanation.</p>
        <p><strong>In practice:</strong></p>
        <ul>
          <li>First: read the schedule — it often explains the adjustment itself.</li>
          <li>Quick questions, then technical depth, then the specialist tax tool.</li>
          <li>Still stuck? Ask another preparer or Max.</li>
        </ul>
      `
    },
    {
      title: "Reading the Return & the Client",
      videoUrl: "https://drive.google.com/file/d/1DtsrjXn640pwu99yuBeZyChRvBC-LxSE/view?usp=sharing",
      durationMinutes: 2.22,
      contentHtml: `
        <p><em>Know what the client expects before you present</em></p>

        <h3>4:15 — 7. Compare the refund to last year</h3>
        <p>Clients are generally happy when money comes back. The fastest read on whether they'll be satisfied is last year's result: are they getting the same refund, more, less, or now owing? Same-or-more usually keeps everyone comfortable.</p>
        <p><strong>In practice:</strong></p>
        <ul>
          <li>Pull last year's outcome before presenting this year's.</li>
          <li>Same refund or larger = client usually content.</li>
          <li>Some savvy clients prefer to break even — more on that in tax planning.</li>
        </ul>

        <h3>4:51 — 8. Run a temperature check on a big bill</h3>
        <p>When a return shows a large liability — say $10k+ federal or state — don't spring it. Ask first: "It looks like you may owe this year — were you expecting that?" If they say "I always get a refund," proceed with care and flag that something likely changed.</p>
        <p><strong>In practice:</strong></p>
        <ul>
          <li>Ask whether they expect to owe before revealing the number.</li>
          <li>An "I always get a refund" answer is your cue to slow down.</li>
          <li>Frame it as "let's make sure everything's entered right."</li>
        </ul>

        <h3>5:37 — 9. Ease into a worse-than-expected result</h3>
        <p>Larger-than-expected refunds bring few questions. Owing more than expected invites heavy scrutiny. The move is to make it collaborative — let the client know you'll thoroughly recheck everything together to confirm it was entered correctly.</p>
        <p><strong>In practice:</strong></p>
        <ul>
          <li>Position surprises as a shared double-check, not a verdict.</li>
          <li>Reassure the client you'll verify every entry with them.</li>
          <li>Two safeguards: remember what they expected, and ease into bad news.</li>
        </ul>
      `
    },
    {
      title: "Finding Every Advantage",
      videoUrl: "https://drive.google.com/file/d/1_5b1RZmandbmInA6gUjhg2gLJBiQbRAG/view?usp=sharing",
      durationMinutes: 3.22,
      contentHtml: `
        <p><em>The subtle moves that lower the bill</em></p>

        <h3>6:28 — 10. Not every uploaded document belongs here</h3>
        <p>Clients often upload everything — including items for family members. Part of the craft is deciding what belongs on this return, what belongs on a child's or relative's return, and what is simply irrelevant.</p>
        <p><strong>In practice:</strong></p>
        <ul>
          <li>Sort uploads: this return, a family member's return, or not relevant.</li>
          <li>Education forms in particular may belong on someone else's return.</li>
          <li>Don't force an item onto the return just because it was uploaded.</li>
        </ul>

        <h3>6:51 — 11. Always look for a way to reduce the tax</h3>
        <p>Whenever there's a tax liability or an unfamiliar taxable event, your first instinct should be: can this be reduced? A distribution from a special education account, for example — research what qualifies as an offsetting expense before accepting the tax as-is.</p>
        <p><strong>In practice:</strong></p>
        <ul>
          <li>Treat every taxable event as "is there an offset?"</li>
          <li>Education distributions can be offset by qualified expenses.</li>
          <li>Research the specific item rather than assuming it's fully taxable.</li>
        </ul>

        <h3>7:25 — 12. Spot the backdoor Roth</h3>
        <p>With high earners, an early IRA distribution around $7,500–$8,000 is often not what it looks like. Typically they contributed to a traditional IRA, got no deduction because income was too high, then converted to a Roth. With enough basis, that conversion is tax-free.</p>
        <p><strong>In practice:</strong></p>
        <ul>
          <li>Early ~$7–8k IRA item + high income = likely a backdoor Roth.</li>
          <li>Ask the client what's going on before treating it as a penalty event.</li>
          <li>No deduction on the way in usually means a tax-free conversion out.</li>
        </ul>

        <h3>8:31 — 13. Home office unlocks the mileage</h3>
        <p>On a Schedule C, you'll allocate home-office, phone, and internet percentages. Often the office expense itself isn't the prize — the simplified $5/sq ft is fine. Establishing the home office is what lets a realtor or commuter count mileage from the first stop onward.</p>
        <p><strong>In practice:</strong></p>
        <ul>
          <li>The $5/sq-ft simplified office method is usually enough.</li>
          <li>The real value is commuting mileage (and sometimes meals en route).</li>
          <li>A home office makes the day's mileage start from the first destination.</li>
        </ul>
      `
    },
    {
      title: "Growing Into the Craft",
      videoUrl: "https://drive.google.com/file/d/1XAIB2DqLafQhktw2Mw5WYTJtziFHvzy5/view?usp=sharing",
      durationMinutes: 2.02,
      contentHtml: `
        <p><em>Building competence and knowing when to ask</em></p>

        <h3>9:41 — 14. Give it about two years</h3>
        <p>There's real subtlety to this work. Expect roughly two years to become a competent, independent preparer who can handle simple returns without extra research. If it feels hard early on, that's normal — keep going.</p>
        <p><strong>In practice:</strong></p>
        <ul>
          <li>~2 years to confidently run simple returns solo.</li>
          <li>Subtleties accumulate; competence is a slope, not a switch.</li>
          <li>Lean on the team while you build it up.</li>
        </ul>

        <h3>10:32 — 15. Lower vs. higher income returns</h3>
        <p>Lower-income clients typically file to capture credits and refunds; getting every credit right can be its own challenge. Higher-income clients come to you to minimize liability through deductions. A strong preparer is genuinely good at both ends.</p>
        <p><strong>In practice:</strong></p>
        <ul>
          <li>Lower income → credits and refunds; precision on credits matters.</li>
          <li>Higher income → deductions and liability minimization.</li>
          <li>Excellence means handling both, not specializing in one.</li>
        </ul>

        <h3>11:13 — 16. It's always okay to ask for help</h3>
        <p>If you don't fully understand a return, you can reschedule the review, loop in another preparer, or ask Max. There's no penalty for saying you want to scrub it thoroughly first. Plenty of people here are glad to help.</p>
        <p><strong>In practice:</strong></p>
        <ul>
          <li>Reschedule a review rather than present something you don't understand.</li>
          <li>Pull in another preparer or Max to scrub a tricky return.</li>
          <li>Asking for help is expected, not a mark against you.</li>
        </ul>
      `
    },
    {
      title: "Running the Client Relationship",
      videoUrl: "https://drive.google.com/file/d/1EImm-ar-TMNu6KDalJRv6Kijcci-BT09/view?usp=sharing",
      durationMinutes: 6.5,
      contentHtml: `
        <p><em>Meetings, mistakes, and year-over-year checks</em></p>

        <h3>11:42 — 17. Set expectations at the start</h3>
        <p>Open every review by telling the client what to expect: whether you'll likely finish today or need more information first. When people know the plan up front, they relax instead of growing anxious that the hour is slipping away.</p>
        <p><strong>In practice:</strong></p>
        <ul>
          <li>State at the top whether the return will likely finish today.</li>
          <li>Telling them you may need more info prevents mid-meeting anxiety.</li>
          <li>An informed client is a calm client.</li>
        </ul>

        <h3>13:25 — 18. Separate firm fault from client fault</h3>
        <p>When problems surface, identify responsibility. If we should have processed information we had, that's on us — we fix it for free. If the client supplied documents only after filing, a rework or refile applies — often modest now (around $125), versus the old practice of charging like a new return.</p>
        <p><strong>In practice:</strong></p>
        <ul>
          <li>Decide: did the firm mishandle info it had, or did the client supply it late?</li>
          <li>Our miss on a provided document → fixed free.</li>
          <li>Late client info that forces a refile = a rework charge (often ~$125).</li>
        </ul>

        <h3>14:34 — 19. If it's our mistake, own it</h3>
        <p>When the firm overlooked a form the client did provide, apologize and take ownership. Clients far prefer a preparer who admits the miss over one who argues about whether the document arrived on time. If it was the client's slip, handle it compassionately but clearly.</p>
        <p><strong>In practice:</strong></p>
        <ul>
          <li>Firm error on a provided document → apologize, fix it free.</li>
          <li>A simple, honest apology beats defensiveness.</li>
          <li>Ownership protects the relationship more than being "right".</li>
        </ul>

        <h3>15:38 — 20. Compare against last year to catch gaps</h3>
        <p>Comparing to the prior year surfaces missing items. If last year had a hospital W-2 and this year doesn't, ask why — maybe they stopped working in December, or changed jobs and owe you a new W-2. A year-over-year check is your best defense and best service.</p>
        <p><strong>In practice:</strong></p>
        <ul>
          <li>Diff this year against last to spot vanished or new income.</li>
          <li>Ask directly: "last year you had X — anything like it this year?"</li>
          <li>Let the client confirm; it's a normal part of the process.</li>
        </ul>

        <h3>17:07 — 21. You have a full review hour</h3>
        <p>Many firms give 15–30 minutes for a return review. Magnum gives roughly an hour — two to four times more — specifically so you can sit with the client, gather what's missing, and get it right. Use the time.</p>
        <p><strong>In practice:</strong></p>
        <ul>
          <li>Magnum's review window is ~60 minutes by design.</li>
          <li>That's 2–4× a typical firm's slot — for quality, not speed.</li>
          <li>Use the room to collect missing documents and clarify.</li>
        </ul>

        <h3>17:28 — 22. Never leave the client hanging</h3>
        <p>Whenever something isn't finished in one appointment, put the next one on the schedule before you part — complimentary, with a clear date. Tell the client exactly when you'll get back to them.</p>
        <p><strong>In practice:</strong></p>
        <ul>
          <li>Book the follow-up before the meeting ends.</li>
          <li>Follow-ups for unfinished work are complimentary.</li>
          <li>Always tell the client when they'll hear from you next.</li>
        </ul>
      `
    },
    {
      title: "Closing the Loop & the Standard",
      videoUrl: "https://drive.google.com/file/d/1osh3oIkpzg2SVidTyaJ3H-jR9fowgJ1g/view?usp=sharing",
      durationMinutes: 4.78,
      contentHtml: `
        <p><em>Confirm, schedule, plan — and the win-win-win</em></p>

        <h3>18:12 — 23. Confirm the filing in writing</h3>
        <p>After signatures, tell the client when you'll file and that a confirmation email will follow within a couple of days once the IRS or FTB accepts it. Confirming acceptance — and notifying the client — is part of the job, not an optional nicety.</p>
        <p><strong>In practice:</strong></p>
        <ul>
          <li>Email a confirmation within ~2 days of filing.</li>
          <li>Confirm acceptance by the IRS / FTB, then tell the client.</li>
          <li>Skipping this quietly erodes trust and loses clients.</li>
        </ul>

        <h3>19:36 — 24. Always keep one appointment on the books</h3>
        <p>The firm's standing practice: a client should always have at least one appointment scheduled — reviewing documents, processing the return, or something else. There's always a next step on the calendar.</p>
        <p><strong>In practice:</strong></p>
        <ul>
          <li>Every active client has at least one future appointment.</li>
          <li>The next touch can be review, processing, or planning.</li>
          <li>No client should ever fall off the schedule.</li>
        </ul>

        <h3>19:50 — 25. Schedule mid-year tax planning</h3>
        <p>After the return is processed, clients usually want planning. Set a tax-planning appointment roughly between June and November to preview the current year. Save that preview in the tax software or client folder — you'll compare against it later.</p>
        <p><strong>In practice:</strong></p>
        <ul>
          <li>Book planning roughly June–November after filing.</li>
          <li>Give the client a preview of the current tax year.</li>
          <li>Store the planning document; it becomes your benchmark.</li>
        </ul>

        <h3>20:31 — 26. Compare planning to the actual return</h3>
        <p>Before presenting, hold the planning estimate against the real return. If planning said $180k income but the return shows $90k, ask — maybe a second W-2 is still missing. Catching it now beats filing and amending, which clients dislike even though it "works."</p>
        <p><strong>In practice:</strong></p>
        <ul>
          <li>Check the actual return against your earlier estimate.</li>
          <li>Big gaps = a question for the client before you present.</li>
          <li>Catching it up front avoids an amendment the client won't love.</li>
        </ul>

        <h3>22:02 — 27. Aim for the win, win, win</h3>
        <p>Every engagement should work three ways at once. The client feels it's a good deal with excellent service. The owner earns enough to cover the cost of delivering it. And the staff — you — feel good and remain easy to keep paying, with room for raises and performance bonuses.</p>
        <p><strong>In practice:</strong></p>
        <ul>
          <li>Win 1 — Client: great service, genuinely a good deal.</li>
          <li>Win 2 — Owner: the economics work and stay sustainable.</li>
          <li>Win 3 — Staff: you're valued, paid, and set up for raises and bonuses.</li>
        </ul>

        <hr>

        <h3>Wrap Up — Excellent work is the goal</h3>
        <p>"The art of tax preparation is noticing the subtleties: reducing liabilities, increasing refunds, securing the maximum credits a client is legally entitled to, and managing expectations the whole way through. Give yourself about two years to feel fluent — and lean on your team while you get there.</p>
        <p>Follow the practical ideas in this guide, keep the win-win-win in mind, and you'll build a career clients trust and the firm can grow with."</p>
      `
    }
  ]
};
