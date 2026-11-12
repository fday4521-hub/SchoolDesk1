// Feature 10: helpers every page can use to learn who is signed in,
// and to gate pages by role server-side.
//
// requireRole() never leaks page content: the check runs before anything
// renders, so a wrong-role visitor only gets the "no permission" message.

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import type { Role } from "@/lib/db/schema";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

/** Returns the signed-in user, or null when nobody is signed in. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  const u = session?.user;
  if (!u) return null;
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: (u.role as Role) ?? "parent",
  };
}

/**
 * Gate for role-protected pages. Every allowed role passes.
 * - signed out                     → redirect to /login
 * - role not in the allowed list   → { status: "forbidden" } (page shows the message)
 * - role allowed                   → { status: "ok", user }
 *
 * Example: requireRole("bursar", "admin") — admin may open every page.
 */
export type RoleGateResult =
  | { status: "ok"; user: CurrentUser }
  | { status: "forbidden"; user: CurrentUser | null };

export async function requireRole(
  ...allowed: Role[]
): Promise<RoleGateResult> {
  const current = await getCurrentUser();
  if (!current) {
    redirect("/login");
  }
  return allowed.includes(current.role)
    ? { status: "ok", user: current }
    : { status: "forbidden", user: current };
}
