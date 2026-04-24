import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Hexagon, ClipboardList, Trophy } from "lucide-react"

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white/80">
      {/* Header: logo + sign-in link (per D-03, D-06) */}
      <header className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto">
        <span className="text-2xl font-bold text-queen">🐝 Honey Do</span>
        <Link href="/login" className="text-sm font-medium text-amber-700 hover:underline">
          Sign in
        </Link>
      </header>

      {/* Section 1: Hero (per D-04, D-07, D-08, LAND-01) */}
      {/* Section 2: How It Works (per D-01, D-02, LAND-02) */}
      {/* Section 3: Final CTA (per D-08, D-09, LAND-03) */}
    </div>
  )
}
