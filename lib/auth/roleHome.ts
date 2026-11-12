// Feature 10: where each role's "own page" lives, plus a helper the client
// (login form, quick-log-in buttons) and the server (denial message, admin
// links) can both use. Importable from either side — no server-only imports.

export const ROLE_HOMES = {
  parent: "/dashboard",
  teacher: "/dashboard/teacher",
  bursar: "/dashboard/bursar",
  admin: "/dashboard/admin",
} as const;

export type DemoRole = keyof typeof ROLE_HOMES;

export function roleHomePath(role: string | undefined | null): string {
  return (role && ROLE_HOMES[role as DemoRole]) || "/dashboard";
}
