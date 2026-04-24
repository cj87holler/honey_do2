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
      <section className="text-center py-20 sm:py-28 px-6 max-w-3xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-bold text-queen">
          Get Your Hive Buzzing
        </h1>
        <p className="text-lg sm:text-xl text-stone-600 mt-4">
          Assign tasks. Earn honeys. Make chores actually fun.
        </p>
        <div className="mt-8">
          <Link href="/signup">
            <Button variant="primary" size="md">Join the Hive — it&apos;s free</Button>
          </Link>
        </div>
      </section>

      {/* Section 2: How It Works (per D-01, D-02, LAND-02) */}
      <section className="py-16 px-6 max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-queen text-center mb-12">
          How It Works
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          <div>
            <Hexagon className="w-10 h-10 text-honey mx-auto" />
            <p className="font-bold mt-3">Create a Hive</p>
            <p className="text-stone-600 text-sm mt-2">
              Invite your household — roommates, partner, family.
            </p>
          </div>
          <div>
            <ClipboardList className="w-10 h-10 text-honey mx-auto" />
            <p className="font-bold mt-3">Assign Tasks</p>
            <p className="text-stone-600 text-sm mt-2">
              Drop chores in the Honeycomb. Someone&apos;s gotta do it.
            </p>
          </div>
          <div>
            <Trophy className="w-10 h-10 text-honey mx-auto" />
            <p className="font-bold mt-3">Earn Honeys</p>
            <p className="text-stone-600 text-sm mt-2">
              Complete tasks, stack honeys, top the leaderboard.
            </p>
          </div>
        </div>
      </section>

      {/* Section 3: Final CTA (per D-08, D-09, LAND-03) */}
      <section className="text-center py-16 px-6 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-queen">
          Ready to Start Buzzing?
        </h2>
        <div className="mt-6">
          <Link href="/signup">
            <Button variant="primary" size="md">Create Your Hive</Button>
          </Link>
        </div>
        <p className="mt-4 text-sm text-stone-500">
          Already buzzin&apos;?{" "}
          <Link href="/login" className="text-honey font-medium hover:underline">
            Sign in here
          </Link>
        </p>
      </section>

      {/* Footer (minimal) */}
      <footer className="text-center py-8 text-xs text-stone-400">
        Honey Do — making chores buzz-worthy since 2026
      </footer>
    </div>
  )
}
