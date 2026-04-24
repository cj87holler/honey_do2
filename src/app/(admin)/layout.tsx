import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { isAdminEmail } from "@/lib/admin"
import { Header } from "@/components/layout/header"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // D-08: admin gate lives at the layout level.
  // D-09: non-admins (including unauthenticated) are silently redirected to /hive.
  //   Chaining through /hive — not /login — avoids leaking that /admin exists.
  //   If no session, /hive/page.tsx itself redirects to /login.
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/hive")
  if (!isAdminEmail(session.user.email)) redirect("/hive")

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-12">{children}</main>
    </div>
  )
}
