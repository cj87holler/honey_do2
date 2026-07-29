import { redirect } from "next/navigation"
import { headers } from "next/headers"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import {
  Hexagon,
  Trophy,
  Crown,
  Users,
  Link as LinkIcon,
} from "lucide-react"

export default async function HelpPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")

  return (
    <div className="min-h-screen bg-white/80">
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Page Title */}
        <section className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-queen">
            🐝 The Honey Do Guide
          </h1>
          <p className="text-stone-600 mt-3 text-lg">
            Everything you need to know about buzzing through your chores.
          </p>
        </section>

        {/* Roles in the Hive */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-queen mb-4">Roles in the Hive</h2>
          <p className="text-stone-600 mb-6">
            Every Honey Do hive has members with different roles. Your role
            determines what you can do in the hive.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
            <div className="rounded-xl bg-amber-50 p-5">
              <Crown className="w-8 h-8 text-honey mx-auto" />
              <p className="font-bold mt-3 text-queen">Queen</p>
              <p className="text-stone-600 text-sm mt-2">
                The hive creator. Can invite members, manage the hive, and
                assign tasks to anyone — but doesn&apos;t earn honeys.
              </p>
            </div>
            <div className="rounded-xl bg-amber-50 p-5">
              <Users className="w-8 h-8 text-honey mx-auto" />
              <p className="font-bold mt-3 text-queen">Bee</p>
              <p className="text-stone-600 text-sm mt-2">
                A hive member. Can create tasks, complete tasks, and earn
                honeys to climb the leaderboard.
              </p>
            </div>
            <div className="rounded-xl bg-amber-50 p-5">
              <Hexagon className="w-8 h-8 text-honey mx-auto" />
              <p className="font-bold mt-3 text-queen">QueenBee</p>
              <p className="text-stone-600 text-sm mt-2">
                Best of both worlds — has Queen powers AND earns honeys like a
                Bee. The ultimate hive member.
              </p>
            </div>
          </div>
        </section>

        {/* Honeys */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-queen mb-4">Honeys (Points)</h2>
          <p className="text-stone-600 mb-3">
            Honeys are the points you earn for completing tasks. Every task
            has a honey value set by whoever creates it — 5, 10, 20, or any
            custom number.
          </p>
          <p className="text-stone-600 mb-3">
            When you complete a task assigned to you, those honeys go straight
            into your total. The more tasks you finish, the more honeys you
            stack.
          </p>
          <p className="text-stone-600">
            Honeys are tracked per-hive. Your score in one hive is completely
            separate from any other hive you belong to.
          </p>
        </section>

        {/* The Honeycomb */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-queen mb-4">The Honeycomb (Task List)</h2>
          <p className="text-stone-600 mb-3">
            The Honeycomb is your hive&apos;s shared task board — think of it as
            the hive&apos;s to-do list that everyone can see.
          </p>
          <p className="text-stone-600 mb-3">
            Every task shows who created it, who it&apos;s assigned to, and the
            honey reward up for grabs.
          </p>
          <p className="text-stone-600">
            Task text is limited to 160 characters — keep it short and sweet,
            like a good honey drop.
          </p>
        </section>

        {/* Creating & Assigning Tasks */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-queen mb-4">Creating &amp; Assigning Tasks</h2>
          <p className="text-stone-600 mb-3">
            Tap <strong>&ldquo;New Task&rdquo;</strong> in the Honeycomb to create a task.
            Pick a hive member to assign it to and set the honey value — how
            many points the task is worth.
          </p>
          <p className="text-stone-600 mb-3">
            The assignee will see it in their Honeycomb and can mark it done
            once they&apos;ve tackled it. That&apos;s when the honeys land in their
            total.
          </p>
          <p className="text-stone-600">
            Anyone in the hive can create tasks, but only Queens and QueenBees
            can assign tasks to other members.
          </p>
        </section>

        {/* The Leaderboard */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-queen mb-4">The Leaderboard</h2>
          <div className="flex items-start gap-4">
            <Trophy className="w-8 h-8 text-honey mt-1 shrink-0" />
            <div>
              <p className="text-stone-600 mb-3">
                The leaderboard ranks all hive members by their total honeys
                earned. The more tasks you complete, the higher you climb.
              </p>
              <p className="text-stone-600">
                Friendly competition keeps everyone motivated — nobody wants to
                be at the bottom of the hive. The leaderboard updates as tasks
                get completed, so the rankings are always fresh.
              </p>
            </div>
          </div>
        </section>

        {/* Inviting Hivemates */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-queen mb-4">Inviting Hivemates</h2>
          <div className="flex items-start gap-4">
            <LinkIcon className="w-8 h-8 text-honey mt-1 shrink-0" />
            <div>
              <p className="text-stone-600 mb-3">
                Queens and QueenBees can generate an invite link from the hive
                page. Share it with your housemate — they click it, create an
                account (or sign in if they already have one), and they join
                your hive automatically.
              </p>
              <p className="text-stone-600">
                Each invite link is unique to your hive. Multiple members can
                join using the same link, so you can grow your hive one buzz at
                a time.
              </p>
            </div>
          </div>
        </section>

        {/* Back to Hive */}
        <div className="text-center mt-16">
          <Link href="/hive">
            <Button variant="primary">Back to the Hive</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
