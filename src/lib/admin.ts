import { auth } from "@/lib/auth"
import { headers } from "next/headers"

/**
 * Parse ADMIN_EMAILS env var once per module load.
 * next.js server code — process.env is available at runtime.
 * ADMIN_EMAILS is a deployment-time constant; caching here is safe.
 */
function parseAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? ""
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

// Cached at module scope — parsed once, reused across requests in same process.
const ADMIN_EMAILS = parseAdminEmails()

/**
 * Case-insensitive, whitespace-trimmed membership check against ADMIN_EMAILS (D-03).
 * When ADMIN_EMAILS is unset/empty, ADMIN_EMAILS resolves to [] and this is always false (D-02).
 */
export function isAdminEmail(email: string): boolean {
  return ADMIN_EMAILS.includes(email.trim().toLowerCase())
}

/**
 * Belt-and-braces admin guard for server actions (D-10).
 * Throws "Unauthorized" when there is no session, "Forbidden" when the session user is not an admin.
 * Returns the Better Auth session when the caller is an admin.
 *
 * Callers in server actions should let the error propagate to the client — do not `redirect()`
 * from inside server actions; the admin layout is responsible for redirect behavior (D-08/D-09).
 */
export async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error("Unauthorized")
  if (!isAdminEmail(session.user.email)) throw new Error("Forbidden")
  return session
}
