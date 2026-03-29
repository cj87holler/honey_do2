import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { getUserHive } from "@/lib/queries/hive"
import { CreateHiveForm } from "@/components/hive/create-hive-form"

export default async function CreateHivePage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    redirect("/login")
  }

  const existingHiveId = await getUserHive(session.user.id)
  if (existingHiveId) {
    redirect(`/hive/${existingHiveId}`)
  }

  return <CreateHiveForm />
}
