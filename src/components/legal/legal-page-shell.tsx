import Link from "next/link"
import { LEGAL_LAST_UPDATED } from "@/lib/legal"

/**
 * Shared chrome for /privacy and /terms.
 *
 * Deliberately quieter than the landing page: same amber/stone palette so it still reads as
 * Honey_Do, but the bee puns stop here. These pages exist to be understood, not enjoyed.
 */
export function LegalPageShell({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-white/80">
      <header className="flex items-center justify-between px-6 py-4 max-w-3xl mx-auto">
        <Link href="/" className="text-2xl font-bold text-queen">
          🐝 Honey Do
        </Link>
        <Link href="/" className="text-sm font-medium text-amber-700 hover:underline">
          Back to home
        </Link>
      </header>

      <main className="px-6 py-10 max-w-3xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-bold text-queen">{title}</h1>
        <p className="text-sm text-stone-500 mt-2">Last updated: {LEGAL_LAST_UPDATED}</p>

        <div className="mt-8 space-y-8 text-stone-700 leading-relaxed">{children}</div>
      </main>

      <footer className="text-center py-8 text-xs text-stone-400">
        <Link href="/privacy" className="hover:underline">
          Privacy Policy
        </Link>
        <span className="mx-2">·</span>
        <Link href="/terms" className="hover:underline">
          Terms of Use
        </Link>
      </footer>
    </div>
  )
}

/** Section heading used throughout both legal documents. */
export function LegalSection({
  heading,
  children,
}: {
  heading: string
  children: React.ReactNode
}) {
  return (
    <section>
      <h2 className="text-xl font-bold text-queen mb-3">{heading}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  )
}
