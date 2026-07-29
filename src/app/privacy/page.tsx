import type { Metadata } from "next"
import { PrivacyPolicy } from "@/components/legal/privacy-policy"

// Public route. Not inside (app), so no authenticated header and no session lookup —
// src/middleware.ts only guards /hive, so this is reachable logged out by default.
export const metadata: Metadata = {
  title: "Privacy Policy — Honey Do",
  description: "What Honey_Do collects, who can see it, and how to have it deleted.",
}

export default function PrivacyPage() {
  return <PrivacyPolicy />
}
