import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { getHiveWithMembers } from "@/lib/queries/hive"
import { HiveDashboard } from "@/components/hive/hive-dashboard"

interface HiveDashboardPageProps {
  params: Promise<{ id: string }>
}

export default async function HiveDashboardPage({ params }: HiveDashboardPageProps) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    redirect("/login")
  }

  const { id } = await params
  const result = await getHiveWithMembers(id)

  if (!result) {
    redirect("/hive/create")
  }

  const { hive, members } = result

  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <HiveDashboard
        hive={hive}
        members={members}
        currentUserId={session.user.id}
      />
    </main>
  )
}
