# SchoolDesk

A school portal for Crown Heights Academy, a private secondary school in Nigeria. It shares results, collects fees and sends notices to parents.

## Users
- Parents
- Teachers
- Bursar
- Admin

## Tech stack
- Claude Code for building
- Next.js for the web app
- Astro for the public school website
- Neon for the database
- Better Auth for login and roles
- Resend for emails
- Paystack (TEST mode only) for payments
- Vercel for hosting

## Features (one owner each)
1. Public school website (Astro)
2. Online admissions: application form, document upload, application fee (test)
3. Parent dashboard
4. Results and report sheets
5. Fees and receipts
6. Teacher scores
7. Attendance
8. Bursar dashboard
9. School admin
10. Notices, roles and security

## Style guide (agreed by Group 5)
- School name: Crown Heights Academy
- Colors: navy blue (primary), white (background), gold (accent)
- Heading font: Poppins
- Body font: Inter
- Layout: follow the Parent Dashboard wireframes. Mobile first, with a sidebar on desktop (Dashboard, Academics, Fees, Notices, Calendar).
- Buttons: dark navy filled button for the main action, outlined button for the secondary action, large tap size
- Tone of text: simple, friendly, clear for parents

## Design rules
- Mobile first. Most parents will use cheap phones on slow data.
- Large tap targets, high contrast, fast loading.
- Use plain English. Show clear error messages.
- Amounts are in Nigerian Naira (₦).

## Team rules
- One branch per feature, named feature/<name> (for example feature/admissions).
- Never push straight to main.
- Make small commits and small pull requests, each with a preview link.
- The QA lead or a teammate checks every pull request before the Project lead merges.
- Shared parts (header, layout, database tables) change only after the team agrees.
- Never put secrets or API keys in the repo. They live only in Vercel environment variables.
- Use test accounts and Paystack test mode only. No real money, no real student data.

## Security rules
- Parents may see only their own children's data.
- Every page and API route must check the user's role before showing data.
- Uploaded documents must be private and accessible only to the right people.

## Workflow for every change
Pull, Branch, Commit, Push, Pull request, Merge.

## Daily check-in (10 minutes)
What I finished, what I'm doing next, what is blocking me.

