import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getInviteByToken, getExpiredInvitePreview } from "@/lib/queries/invite"
import { getUserHive } from "@/lib/queries/hive"
import { acceptInvite } from "@/lib/actions/invite"
import { InviteSignupForm } from "@/components/invite/invite-signup-form"
import Link from "next/link"

interface InvitePageProps {
  params: Promise<{ token: string }>
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params
  const invite = await getInviteByToken(token)

  // D-11: Expired or used token — use getExpiredInvitePreview to show Queen name
  if (!invite) {
    const preview = await getExpiredInvitePreview(token)

    return (
      <main className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="rounded-lg border border-stone-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-semibold text-stone-800 mb-3">This invite has expired</h1>
          <p className="text-stone-500 mb-6">
            {preview
              ? `Ask ${preview.queenName} of ${preview.hiveName} for a new invite link.`
              : "Ask the Queen for a new invite link."}
          </p>
          <Link href="/signup" className="text-honey hover:underline text-sm">
            Or sign up on your own
          </Link>
        </div>
      </main>
    )
  }

  const session = await auth.api.getSession({ headers: await headers() })

  // Logged-in visitor
  if (session) {
    const existingHiveId = await getUserHive(session.user.id)

    // Already in this Hive — silent redirect
    if (existingHiveId === invite.hiveId) {
      redirect(`/hive/${invite.hiveId}`)
    }

    // D-07: Already in a different Hive — block
    if (existingHiveId && existingHiveId !== invite.hiveId) {
      return (
        <main className="max-w-md mx-auto px-4 py-16 text-center">
          <div className="rounded-lg border border-stone-200 bg-white p-8 shadow-sm">
            <h1 className="text-xl font-semibold text-stone-800 mb-3">You are already in a Hive</h1>
            <p className="text-stone-500 mb-6">
              You need to leave your current Hive before joining a new one.
            </p>
            <Link href={`/hive/${existingHiveId}`} className="text-honey hover:underline text-sm">
              Go to your Hive
            </Link>
          </div>
        </main>
      )
    }

    // D-05: No Hive — auto-join
    await acceptInvite(token, session.user.id)
    redirect(`/hive/${invite.hiveId}`)
  }

  // Logged-out visitor — D-04: welcome card + signup form, D-06: log in link
  return (
    <main className="max-w-md mx-auto px-4 py-16">
      <div className="rounded-lg border border-stone-200 bg-white p-8 shadow-sm mb-6">
        <p className="text-sm text-stone-500 mb-1">You have been invited to join</p>
        <h1 className="text-2xl font-bold text-bee mb-1">{invite.hiveName}</h1>
        <p className="text-sm text-stone-500">by {invite.queenName}</p>
      </div>

      <InviteSignupForm token={token} hiveId={invite.hiveId} hiveName={invite.hiveName} />

      <p className="text-center text-sm text-stone-500 mt-6">
        <Link href={`/login?redirect=/invite/${token}`} className="text-honey hover:underline">
          Already have an account? Log in to join
        </Link>
      </p>
    </main>
  )
}
