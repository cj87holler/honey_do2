import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { getUserHive } from "@/lib/queries/hive"

export default async function HivePage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")

  const hive = await getUserHive(session.user.id)
  if (!hive) redirect("/hive/create")

  redirect(`/hive/${hive.id}`)
}
