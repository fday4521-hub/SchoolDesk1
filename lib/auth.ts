// Feature 10: the single Better Auth instance for the whole app.
// Database: our shared Postgres (Neon) with the four Better Auth tables
// from migration 0001 (user, session, account, verification).
// Roles live on the extra `role` column of `user` (parent/teacher/bursar/admin).

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

import { db } from "@/lib/db";
import { account, session, user, verification } from "@/lib/db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "parent",
      },
    },
  },
  // Lets Better Auth set/clear cookies inside Next.js server actions.
  plugins: [nextCookies()],
});

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};
