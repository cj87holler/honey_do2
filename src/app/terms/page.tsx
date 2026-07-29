import type { Metadata } from "next"
import { TermsOfUse } from "@/components/legal/terms-of-use"

// Public route — see the note in ../privacy/page.tsx.
export const metadata: Metadata = {
  title: "Terms of Use — Honey Do",
  description: "The terms covering your use of Honey_Do.",
}

export default function TermsPage() {
  return <TermsOfUse />
}
