# SchoolDesk: Path to a Working Product

Solo checklist. Work top to bottom. Each stage has an **exit check**: do not start the next stage until it passes.
Status: planning only. Nothing here is built yet, and nothing goes to `main` until the final stage.

Legend: `[ ]` to do · `[~]` in progress · `[x]` done · **(P0)** blocker, **(P1)** needed to be "working", **(P2)** polish

---

## Stage 0: Decisions and baseline

Decide these once. Everything later depends on them.

- [ ] **D1. Score split.** CA 30 / Exam 70 (results feature) or CA 40 / Exam 60 (teacher scores)? Pick one and keep it in a single constants file.
- [ ] **D2. Session and term naming.** One format, for example session `2026/2027` and term enum `first | second | third`. Drop free-text `"First Term"`.
- [ ] **D3. Current session and term.** Stored in the database (a settings row), not in code.
- [ ] **D4. Money.** Store in kobo (integer) or keep `numeric(12,2)`? Allow kobo or whole naira only?
- [ ] **D5. Part payments.** Allowed? Minimum amount, and is it configurable?
- [ ] **D6. Who creates accounts.** Admin creates all users (recommended). No public sign-up.
- [ ] **D7. Parent-child linking.** Admin links manually, or by admission number plus a claim code?
- [ ] **D8. One canonical page per role.** Delete or merge the duplicates (see Stage 8 and 9).
- [ ] **D9. Admissions.** Does an applicant need an account, or is it a public form with a reference number?

Baseline:

- [ ] Create a working branch (for example `solo/stabilise`). Do not touch `main`.
- [ ] `npm ci` then `npm run build` then `npm run lint`. Record every error in a "Build errors" list at the bottom of this file.
- [ ] Verify `cacheComponents`, `instant` and `@tailwindcss/turbopack` in `next.config.ts` against the Next.js docs in `node_modules/next/dist/docs/`. Add `postcss.config` if Tailwind needs it.
- [ ] Create a **fresh Neon branch** for dev (keep a separate one for testing). Use the pooled URL for the app and the **direct** URL for migrations.
- [ ] Create `.env` from `.env.example`. Add every missing variable to `.env.example`: `RESEND_API_KEY`, `PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY`, `DATABASE_URL_DIRECT`, `NEXT_PUBLIC_APP_URL`, and others as needed.
- [ ] Confirm `.env` is ignored by git and no secrets are in history.

**Exit check:** project builds cleanly and connects to Neon; D1 to D9 are written down.

---

## Stage 1: Security foundation (P0)

- [ ] **Block role self-assignment.** In `lib/auth.ts`, set `role` to `input: false` in `additionalFields`.
- [ ] **Disable public sign-up** (`emailAndPassword.disableSignUp: true`, or route sign-up through an admin-only action).
- [ ] Set `BETTER_AUTH_URL` and `trustedOrigins` for local, preview and production.
- [ ] Add a database `CHECK` (or enum) so `user.role` can only be `parent | teacher | bursar | admin`.
- [ ] Add `proxy.ts` (Next 16 convention) that redirects signed-out visitors away from every private path.
- [ ] Add `requireRole()` to **every** private page, server action and API route. Known gaps:
  - [ ] `/fees/**`
  - [ ] `/parent/dashboard`
  - [ ] `/bursar`
  - [ ] `/teacher/scores`
  - [ ] `/api/teacher/scores` (GET and POST)
  - [ ] `/api/results/report-sheet`
  - [ ] `/dashboard/academics/results`
  - [ ] `/admin/classes`
  - [ ] `sendNotice` (must be admin only)
- [ ] Server actions: re-check the role inside the action itself, not only on the page.
- [ ] Replace `getCurrentParent()` and `SAMPLE_PARENT_USER_ID` with the session user everywhere.
- [ ] Ownership checks: a parent can only read their own child's invoices, payments, receipts, results, attendance and report PDFs. Add a shared helper `assertParentOwnsStudent()`.
- [ ] Add rate limiting on sign-in.
- [ ] Remove the committed demo password from code and docs. Read it from an env var, or generate one when the seed runs. Never run demo users in production.
- [ ] Session expiry and sign-out tested.
- [ ] Add an admin "reset password" flow, or a first-login password change.

**Exit check:** while signed out, every private URL redirects to `/login`. As a parent, requesting another family's invoice or student ID returns a denied page. A sign-up request with `role: "admin"` fails.

---

## Stage 2: Schema and data model

One migration pass. Generate with `drizzle-kit`; never hand-edit applied migrations.

- [ ] **Settings / academic calendar table.** Current session, current term, term start and end dates, and "days school was open".
- [ ] Replace free-text `invoices.session` and `invoices.term` with the session value plus the score-term enum (per D2).
- [ ] Add foreign keys:
  - [ ] `parent_students.parent_user_id` → `user.id`
  - [ ] `teacher_assignments.teacher_user_id`, `class_id`, `subject_id`
  - [ ] `scores.student_id`, `subject_id`, `class_id`
  - [ ] `results_published.class_id`
  - [ ] `attendance_records.marked_by` → `user.id`
  - [ ] `scores.entered_by` → `user.id`
- [ ] `scores`: add `session` (a score must belong to a session and term). Add `CHECK` constraints for CA and exam ranges per D1.
- [ ] `results_published`: add `session`, `published_by`, `published_at`.
- [ ] **`notices` table** (title, body, audience, created_by, created_at, class_id nullable) and a `notice_reads` or delivery-log table.
- [ ] **Admissions tables:** `applications` (applicant details, class applied for, status, reference number) and `application_documents` (storage key, type, size).
- [ ] **Payments table fixes:**
  - [ ] `paystack_reference` unique
  - [ ] `raw_event` (jsonb) for webhook audit
  - [ ] `CHECK (amount > 0)`
  - [ ] a payments-per-invoice balance guard (see Stage 4)
- [ ] Invoices: either drop the stored `status` column and always derive it, or keep it and update it transactionally. Pick one (recommended: derive, plus a view or helper).
- [ ] Add `events` (calendar) table if the parent dashboard "Upcoming events" is kept.
- [ ] Add a student `status` (active, graduated, withdrawn) and think about class promotion across sessions.
- [ ] Switch to a driver that supports transactions (`drizzle-orm/neon-serverless` Pool/WebSocket) for any multi-statement write.
- [ ] Remove `lib/scores/proposed-schema.ts` (superseded by `schema.ts`).
- [ ] Run `db:generate`, review the SQL, then `db:migrate` on the dev branch.

**Exit check:** migrations apply cleanly to an empty Neon branch, and `drizzle-kit` reports no drift.

---

## Stage 3: Environment and seed (P0)

Goal: one command produces a complete, internally consistent school.

- [ ] Merge `seed.ts`, `backfill-fees.ts` and `createDemoUsers.ts` into one ordered seed (`db:reset-dev`): users → classes → subjects → students → parent links → assignments → fees → scores → attendance → notices.
- [ ] Delete `backfill-fees.ts` after the migration handles old data.
- [ ] **Single source of truth for IDs and names.** One parent name, one set of children, one session. Remove all sample data files:
  - [ ] `app/lib/results/sampleData.ts`
  - [ ] `app/parent/dashboard/sample-data.ts`
  - [ ] `app/attendance-preview/demo-data.ts`
  - [ ] the `TEMP_*` maps in `lib/scores/data.ts`
- [ ] Seed content, enough to exercise every screen:
  - [ ] 4 users (one per role) plus at least 2 extra parents and 2 extra teachers
  - [ ] 3 or more classes, with 6 to 10 students each
  - [ ] 8 or more subjects, and teacher assignments for each
  - [ ] one parent with 2 children in different classes, one parent with 1 child, one student with no linked parent
  - [ ] invoices in every state: paid, part-paid, unpaid, overdue (past due date), cancelled
  - [ ] payments including a failed and a pending one
  - [ ] a full term of scores for at least one class, including edge cases (0, 100, ties for position)
  - [ ] one class published, one not
  - [ ] a month of attendance with a mix of statuses
  - [ ] 3 or more notices
  - [ ] 2 or more admissions applications
- [ ] Make the seed idempotent (safe to re-run) and add a `--wipe` option for dev only. It must refuse to run if `NODE_ENV=production`.
- [ ] Update the README: exact order of commands (`migrate` → `seed`), env variables, demo logins (dev only).

**Exit check:** wipe, migrate and seed from scratch in under a minute. Prisma-style spot check in `db:studio`: every foreign key resolves, and names and sessions match across tables.

---

## Stage 4: Fees and payments correctness (P0)

- [ ] Remove the hardcoded `status: "successful"` and `method: "test"` mapping. Read both from the row.
- [ ] Only `status = success` payments count toward amount paid, on every screen (parent, fees, bursar, dashboard).
- [ ] **Atomic payment write.** In one transaction: lock the invoice row (`SELECT ... FOR UPDATE`), recompute balance from the database, reject overpayment, insert payment, allocate receipt number. Do not trust a balance computed before the call.
- [ ] Receipt numbers from a database sequence (or a counter row updated in the same transaction). Delete the in-memory `receiptSequenceByYear` and lock.
- [ ] Derive invoice status in one place: paid, partial, unpaid, **overdue** (due date passed and balance greater than 0), cancelled. Use the Africa/Lagos date.
- [ ] Exclude cancelled invoices from every total.
- [ ] Do all money math in kobo or via `numeric` in SQL, not JS floats (per D4). Add unit tests for rounding.
- [ ] Remove the hardcoded ₦1,000 minimum, or move it to settings (per D5).
- [ ] One `formatNaira` helper used everywhere (bursar and parent dashboard each define their own now).
- [ ] Fix date parsing: parse `YYYY-MM-DD` as a local calendar date, not `new Date(value)`.
- [ ] Receipt and invoice print pages: confirm they show the correct school, session, term and payer.
- [ ] Admin or bursar can **create invoices** (per student or per class, from a fee template with line items) and **cancel** one. Currently there is no way to create an invoice in the UI.
- [ ] Bursar can record **manual payments** (cash and bank transfer) with a reference and the correct audit fields.
- [ ] Unit tests: invoice summary, partial, exact, over-payment, concurrent payment, cancelled invoice.

**Exit check:** two simultaneous payments on the same invoice cannot overpay. Totals on `/fees`, parent dashboard and bursar dashboard are identical for the same family.

---

## Stage 5: Teacher scores

- [ ] Replace `lib/scores/data.ts` with real queries against `subjects`, `teacher_assignments` and `scores`.
- [ ] Use the session user as the teacher. Delete `TEMP_TEACHER_ID`.
- [ ] Only list the classes and subjects the teacher is assigned to (per assignment row). Admin can see all.
- [ ] Single source for CA/Exam maximums and grade bands (per D1). Delete the duplicate copies in `teacher/scores/page.tsx` and `app/lib/results/scoring.ts`.
- [ ] Always recompute total and grade on the server. Never store client-sent values.
- [ ] Atomic upsert of a whole class in one transaction.
- [ ] Lock rule: reject edits when `results_published` is true for that class, session and term. Read the **real** table.
- [ ] Show saved status, last saved time, and per-row errors.
- [ ] Handle blank vs 0 (blank should mean "not entered", not zero).
- [ ] Move the page under `/dashboard/teacher/scores` and link it from the teacher dashboard.
- [ ] Optional (P2): CSV import for scores.

**Exit check:** scores survive a server restart; a teacher cannot read or write a class they are not assigned to; publishing a class locks entry.

---

## Stage 6: Results and report sheets

- [ ] Rewrite `app/lib/results/getResults.ts` to query `scores`, `subjects`, `students`, `results_published`. Only return **published** results to parents.
- [ ] Compute **class position** from real scores (same class, session and term). Define tie handling and document it.
- [ ] Define average: total divided by number of subjects **with scores**.
- [ ] Attendance on the report sheet comes from `attendance_records` plus "days school opened" from settings.
- [ ] Real teacher and principal comments: add a `report_comments` table plus an entry UI, or remove those fields from the PDF.
- [ ] Report PDF route: session check, parent-owns-child check, published check. Sanitise the download filename.
- [ ] Move or rename so there is one place for results code (`lib/results/`), and remove the duplicate `app/lib/results/`.
- [ ] Selector shows only terms that exist and are published for that child.
- [ ] Handle empty states: no scores yet, term not published, student changed class.
- [ ] Test the PDF with 1 subject, 12 subjects, long names, and special characters.

**Exit check:** publishing a class in admin makes exactly those parents' results visible. The report PDF numbers match the on-screen numbers and the raw scores.

---

## Stage 7: Attendance

(Best-built feature. Light work.)

- [ ] Restrict teachers to classes they teach or are class teacher for (add `class_teacher` on classes or assignments). Admin keeps full access.
- [ ] Parents see **absent, late and excused**, not only absent, plus a per-term summary (days present out of days open).
- [ ] Provide the "days school opened" data needed by Stage 6.
- [ ] Block marking on non-school days (weekends and holidays from the calendar table).
- [ ] Delete `app/attendance-preview` and `demo-data.ts`. Update the home page copy.
- [ ] Remove the duplicate `app/attendance/_components` path or keep it as the only shared UI folder.

**Exit check:** a teacher's mark appears on the right parent's page within one refresh, and report-sheet attendance matches.

---

## Stage 8: Parent dashboard (merge into one)

Currently three parent areas: `/dashboard`, `/parent/dashboard`, `/fees`.

- [ ] Choose one home (`/dashboard`) and fold the rich `/parent/dashboard` UI into it. Delete the other route.
- [ ] Remove: 600 ms fake loading delay, "Demo controls" panel, "sample data" banners, "Ruby House" and any other field with no data source.
- [ ] Child switcher driven by `parent_students` for the signed-in user.
- [ ] Each child card shows only real data:
  - [ ] latest published result (or "not yet published")
  - [ ] fees: billed, paid, balance, next due date, overdue flag
  - [ ] attendance summary for the current term
- [ ] Latest notices from the `notices` table; upcoming events from `events` (or remove the section).
- [ ] Link through to fees, results, attendance and receipts.
- [ ] Reuse the Stage 4 summary function so totals match everywhere.
- [ ] Keep it light for slow data: server-render, no big client bundles.
- [ ] Empty states: no children linked, no invoices, no notices.
- [ ] Match the style guide (navy, white, gold; Poppins and Inter). Load fonts **once** in the root layout, not in 4 separate layouts.

**Exit check:** a seeded parent sees only their children, with numbers identical to the fees pages.

---

## Stage 9: Bursar dashboard (merge into one)

- [ ] Keep `/dashboard/bursar` (protected) and port the useful parts of `/bursar` into it. Delete `/bursar`.
- [ ] Filter by session and term (default to current).
- [ ] Metrics (all computed from successful payments and non-cancelled invoices):
  - [ ] total billed, total collected, outstanding, collection rate %
  - [ ] overdue amount and count
  - [ ] collected today and this week
  - [ ] outstanding by class
- [ ] Debtors list: student, class, parent contact, invoice count, balance, days overdue. Sortable, searchable, filter by class.
- [ ] Payments list with receipt links, method, status; filter by date range.
- [ ] **Export CSV** with proper formatting (₦ amounts, dates) and filters applied. Do it server-side.
- [ ] **Send reminder:** real emails to the parents of selected debtors, logged in a table to avoid duplicates. Remove the fake "Reminder sent" message.
- [ ] Remove anything that is noise: keep the page to the numbers a bursar acts on daily.

**Exit check:** bursar numbers reconcile with the sum of parent-side balances for every seeded family.

---

## Stage 10: School admin

- [ ] Full CRUD, server-side, with validation and role checks:
  - [ ] classes
  - [ ] students (and admission number generation)
  - [ ] teachers (create account, set role, reset password)
  - [ ] parents (create account)
  - [ ] subjects
  - [ ] teacher assignments (teacher × class × subject)
  - [ ] parent ↔ student links
  - [ ] class teacher assignment
- [ ] Delete the fake `/admin/classes` client-state page.
- [ ] Session and term settings page (current session and term, term dates, days open).
- [ ] Results publishing page: show per class and term whether all scores are entered (progress), then publish or unpublish. Keep the lock behaviour from Stage 5.
- [ ] **Publish order fix:** do not report "failed" after the results are already published. Email in a separate, retryable step with a visible result.
- [ ] Safe deletes (restrict or soft delete; never orphan scores or payments).
- [ ] Promotion tool: move a class to the next session (P2).
- [ ] Admissions review (see Stage 12).

**Exit check:** starting from an empty database, an admin can set up a whole school through the UI with no seed.

---

## Stage 11: Notices, email and webhooks

- [ ] Verify a sending domain in Resend. `onboarding@resend.dev` only delivers to the account owner.
- [ ] One `sendEmail()` helper (timeout, error handling, logging). Use it everywhere.
- [ ] Notice flow: admin composes → saved to `notices` → emailed to the right audience (all parents, one class, one parent) → shown on the parent dashboard.
- [ ] Remove the "first parent in the database" greeting logic. Send individually, using each parent's own name.
- [ ] Keep a test mode: when `NOTICE_TEST_TO` is set, redirect all emails there, but only in non-production.
- [ ] Email log table (to, subject, status, error) and a visible failure list for the admin.
- [ ] Templates: results published, fee receipt, fee reminder, notice, admissions received.
- [ ] Send the **fee receipt email** (replace `sendReceiptEmailLater`).
- [ ] Webhook endpoint(s) (Paystack in Stage 13; Resend events optional).
- [ ] Batch and rate-limit sends to stay inside Resend limits.

**Exit check:** a notice created by admin reaches real test inboxes, appears on the parent dashboard, and failures are visible.

---

## Stage 12: Online admissions

- [ ] Replace the client-only form with a real submit: validate on the server and save to `applications`.
- [ ] Generate the application number on the server (unique, sequential or random with collision check).
- [ ] **Document uploads** to private storage (for example Vercel Blob or S3-compatible). Check type and size on the server. Never public URLs; serve through an authorised route.
- [ ] Save draft: persist, with a resume link or code (or remove the button).
- [ ] Application fee through Paystack (Stage 13); mark the application "paid" only from the verified webhook.
- [ ] Confirmation page and email with the reference number. "Download pass slip" produces a real PDF.
- [ ] Admin/admissions view: list, filter by status, open an application, view documents, change status (received, reviewed, admitted, rejected), add notes.
- [ ] Protect against spam (rate limit, honeypot or captcha).
- [ ] Privacy: store only what is needed. Applicants are minors.

**Exit check:** a test application with documents and a test fee appears in admin, and the applicant gets an email.

---

## Stage 13: Paystack (test mode)

- [ ] Initialise transaction server-side (amount from the invoice balance computed on the server, never from the browser).
- [ ] Redirect or inline checkout, then a callback page that **verifies** the transaction with Paystack before showing success.
- [ ] **Webhook route:** verify the `x-paystack-signature` HMAC with the secret key, handle `charge.success`, be idempotent (unique reference), write the payment in the same transaction as the Stage 4 balance guard.
- [ ] Handle pending, failed, abandoned, and duplicate callbacks.
- [ ] Reuse the same receipt, status and email logic as manual payments.
- [ ] Test mode only: banner in the UI, no live keys anywhere in the repo.
- [ ] Use Paystack's test cards for success, decline and insufficient funds.
- [ ] Exposed webhook URL for local testing (tunnel) and a Vercel preview URL set in the Paystack dashboard.

**Exit check:** a test payment through Paystack updates the invoice, creates one receipt, and emails the parent, even if the callback and webhook both fire.

---

## Stage 14: Public website (Astro)

- [ ] "Apply now" goes to the real admissions form in the Next app (absolute URL from an env value).
- [ ] Add a "Parent login" link to the portal in the header and footer.
- [ ] Replace placeholders: phone number, email, address, map, social links.
- [ ] Session text ("2027/2028") matches D2/D3.
- [ ] News page reads from real content (a simple markdown collection) or is clearly seeded with real items.
- [ ] SEO: titles, descriptions, Open Graph, sitemap, `robots.txt`, canonical URLs.
- [ ] Decide hosting: separate Vercel project for `website/` with root directory set. Document it.
- [ ] Performance check on a throttled mobile connection.

**Exit check:** a visitor can go from the public site to a submitted application and to the login page without a dead end.

---

## Stage 15: Cleanup, QA and release

Cleanup:

- [ ] Remove: `notepad`, stale docs, duplicate folders, unused components and `docs` that no longer match.
- [ ] Home page (`/`) becomes a proper entry (redirect to `/login` or role home), not an attendance-preview advert.
- [ ] Single consistent navigation per role (sidebar on desktop, mobile-first).
- [ ] Remove `console.log` noise and any "sample data" text from the UI.

QA (by role, on a phone-width screen first):

- [ ] **Parent:** login, two children, fees, pay (test), receipt, results, report PDF, attendance, notices.
- [ ] **Teacher:** login, assigned class only, scores, attendance.
- [ ] **Bursar:** login, debtors, payments, export, reminders.
- [ ] **Admin:** setup, publish, notices, admissions.
- [ ] **Negative tests:** wrong role on every URL, another family's IDs, tampered form values, expired session, double-click on pay.
- [ ] Accessibility: keyboard, contrast, tap size, labels.
- [ ] Add automated tests for the money, grading and ownership code (`vitest`).
- [ ] Add a smoke-test script that hits each role's key pages after seeding.

Release:

- [ ] Production Neon branch, migrations applied, **no demo seed**.
- [ ] Vercel env variables set; secrets only there.
- [ ] Create the first real admin through a one-time script.
- [ ] Error monitoring and database backups confirmed.
- [ ] Final review of this checklist, then merge to `main`.

**Exit check:** every item above is ticked or consciously deferred (move it to "Later").

---

## Later (deferred on purpose)

- [ ] Timetable, calendar sync, SMS notices, parent-teacher messaging
- [ ] Student promotion and graduation workflows
- [ ] Multi-term cumulative results and annual report
- [ ] Offline-friendly PWA

## Build errors log

_(Fill in during Stage 0.)_

| # | Command | Error | Status |
|---|---------|-------|--------|
|   |         |       |        |

## Progress

| Stage | Name | Status |
|-------|------|--------|
| 0 | Decisions and baseline | [ ] |
| 1 | Security foundation | [ ] |
| 2 | Schema and data model | [ ] |
| 3 | Environment and seed | [ ] |
| 4 | Fees and payments | [ ] |
| 5 | Teacher scores | [ ] |
| 6 | Results and report sheets | [ ] |
| 7 | Attendance | [ ] |
| 8 | Parent dashboard | [ ] |
| 9 | Bursar dashboard | [ ] |
| 10 | School admin | [ ] |
| 11 | Notices, email, webhooks | [ ] |
| 12 | Online admissions | [ ] |
| 13 | Paystack (test) | [ ] |
| 14 | Public website | [ ] |
| 15 | Cleanup, QA, release | [ ] |
