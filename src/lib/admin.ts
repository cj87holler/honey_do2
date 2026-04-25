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

// Bee-themed curated word lists for temp passwords (D-05).
// Ambiguous LETTER characters excluded: O, I, B, l (visually confusable).
// Note: lowercase "l" is excluded because it is visually confusable with "1" and "I".
// This required replacing a few words from the original research draft (e.g. "golden",
// "royal", "bold", "calm", "pollen", "flow", "cell", "bloom", "clover") with
// l-free bee-themed alternatives. Entropy unchanged: 20 × 20 × 9000 = 3.6M combinations.
const BEE_ADJECTIVES = [
  "busy", "merry", "grand", "sweet", "spry",
  "happy", "brave", "fuzzy", "swift", "sunny",
  "quick", "tiny", "amber", "bright", "tender",
  "warm", "cozy", "keen", "pure", "ripe",
]

const BEE_NOUNS = [
  "bee", "hive", "queen", "drone", "nest",
  "honey", "comb", "swarm", "nectar", "wax",
  "wing", "sting", "buzz", "dance", "crown",
  "guard", "scout", "garden", "stamen", "meadow",
]

/**
 * Generate a bee-themed temp password: {adjective}-{noun}-{4digit}.
 * Shortest: "calm-bee-1000" (13 chars). Always meets Better Auth's 8-char minimum.
 * Entropy: 20 * 20 * 9000 = 3.6M combinations (~21.8 bits) — acceptable for
 * single-use temp passwords that the user rotates on first sign-in.
 * Pure, synchronous, never logs.
 */
export function generateTempPassword(): string {
  const adj = BEE_ADJECTIVES[Math.floor(Math.random() * BEE_ADJECTIVES.length)]
  const noun = BEE_NOUNS[Math.floor(Math.random() * BEE_NOUNS.length)]
  const suffix = String(Math.floor(Math.random() * 9000) + 1000)
  return `${adj}-${noun}-${suffix}`
}
