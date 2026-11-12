// Feature 10: one-time setup of the four Better Auth demo accounts.
// Run with: npm run db:demo-users
//
// This is NOT db:seed — it only adds rows to the Better Auth tables
// (user, account) created by migration 0001. Safe to run more than once:
// rows that already exist are left untouched.
//
// The parent account reuses the id that the shared sample data already
// links to in parent_students, so the parent sees exactly Chidi & Ngozi.

import "dotenv/config";

import { hashPassword } from "better-auth/crypto";

import { db } from "../lib/db";
import { account, user } from "../lib/db/schema";

const DEMO_PASSWORD = "CHADemo2027!";

const demoAccounts = [
  {
    id: "sample-parent-user-001", // must match parent_students.parent_user_id
    name: "Adaeze Okafor",
    email: "parent@example.com",
    role: "parent",
    accountId: "sample-account-parent-001",
    accountDescription: "parent of Chidi & Ngozi",
  },
  {
    id: "demo-teacher-user-001",
    name: "Mrs. Bisi Adeyemi",
    email: "teacher@example.com",
    role: "teacher",
    accountId: "demo-account-teacher-001",
    accountDescription: "JSS 1A class teacher",
  },
  {
    id: "demo-bursar-user-001",
    name: "Mr. Kelechi Obi",
    email: "bursar@example.com",
    role: "bursar",
    accountId: "demo-account-bursar-001",
    accountDescription: "school bursar",
  },
  {
    id: "demo-admin-user-001",
    name: "Ms. Grace Eze",
    email: "admin@example.com",
    role: "admin",
    accountId: "demo-account-admin-001",
    accountDescription: "school admin",
  },
];

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error(
      "DATABASE_URL is not set. Create the .env file first, then re-run.",
    );
    process.exit(1);
  }

  const passwordHash = await hashPassword(DEMO_PASSWORD);

  for (const demo of demoAccounts) {
    await db
      .insert(user)
      .values({
        id: demo.id,
        name: demo.name,
        email: demo.email,
        emailVerified: true,
        role: demo.role,
      })
      .onConflictDoNothing();
    await db
      .insert(account)
      .values({
        id: demo.accountId,
        userId: demo.id,
        accountId: demo.id,
        providerId: "credential",
        password: passwordHash,
      })
      .onConflictDoNothing();
    console.log(`added: ${demo.role.padEnd(7)} ${demo.email} (${demo.accountDescription})`);
  }

  console.log(
    `Done. All four accounts use the password: ${DEMO_PASSWORD}`,
  );
  process.exit(0);
}

main();
